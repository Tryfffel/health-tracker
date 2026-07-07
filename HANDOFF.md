# HANDOFF — health-tracker (Hälsodagbok)

Senast uppdaterad: 2026-07-07. Läs detta innan du ändrar något.

## Status just nu (2026-07-06)

Allt nedan är byggt, testat, deployat och live-verifierat under 2026-07-04→06: modulrefaktorn (charts.js + analytics.js), vyerna Idag/Insikter, sammanslaget form+batteri-kort, veckokortet, memoisering av samtliga ~47 motorer, kollapsbara Oura-grupper, utbyggd Idag-vy, batteri↔dagsform-kortet, riktiga Synka-knappen och självläkande auto-sync. Användarens GitHub-token (health-tracker-deploy) fick **Actions: Read and write** 2026-07-06 — självläkningen och Synka-knappen är alltså skarpa, FÖRUTSATT att tokenen är inklistrad i appens Inställningar på telefonen (verifiera: token visade "Never used" på GitHub 2026-07-06, så det kan behöva göras). Nästa öppna fråga är batteribaslinjen (backlog p. 4).

## Spikmatta (tillagt 2026-07-07)

Användaren började med spikmatta 2026-07-06 och ville logga + följa effekten. Byggt, testat och live-verifierat:

- **Loggning:** daglig tagg `🪡 Spikmatta` i "Dagens taggar → Övrigt" (bredvid Sjuk/Bastu/Kallbad) på Lägg till vikt. Sparas som `dayLogs[datum].spikmatta = true`. Syns även i dag-drilldownen (Historik).
- **Insikter-kort `🪡 Spikmatta & HRV`** (överst i renderInsights): visar för senaste natten Ja/Nej + HRV, och en HRV-graf över 90 dagar med rå HRV (tunn) + 7-dagars glidande snitt (fet) och en vertikal markör på första spikmatta-dagen (`SvgLineChart` markers).
- **Lag-korrelationsmatrisen** (`getOuraLagMatrix`, Oura-vyn): spikmatta läggs till som driver mot nästa dags Sömn/HRV/Humör/ViktΔ när ≥8 dagar är taggade (binär 0/1 över hela ouraData → varians finns eftersom dagar före 6 juli = 0).
- OBS: spikmatta testades även i getOuraWeightCorr men **togs bort** — fel hem (mäter mot vikt). Använd lag-matrisen/HRV-kortet.

## Oura-sync: härdning (2026-07-07)

Grundproblemet återkom: GitHubs cron hoppade över ALLA morgonkörningar 2026-07-07 (verifierat: 0 runs, senaste var 6/7 11:52 UTC). Roten till att självläkningen inte räddar det: **ingen GitHub-token låg i appens Inställningar** (verifierat live: `appSettings.ghToken` tom). Åtgärdat i kod:

- `autoDispatchIfStale` (index.html): misslyckas inte längre tyst utan token → visar en påminnelse (max 1/dygn). Efter dispatch pollas nu upp till ~3 min tills färsk data landat (i st.f. ett enda 90s-försök).
- Service worker (`sw.js` `halsa-v5`) + registreringen i index.html auto-uppdaterar nu: `reg.update()` på load + var 30:e min, och `controllerchange` → engångs `location.reload()` (guardad mot första besöket). Alltså inget behov av hård omladdning för att få ny version.
- **Kvar för användaren:** klistra in en fine-grained token (health-tracker, Contents + Actions: Read/write) i Inställningar → GitHub-token. Utan den fastnar Oura på gårdagens data när cron sviker; kör då manuellt Actions → Oura sync → Run workflow.

## Deploy denna session

Gjordes via Claude in Chrome mot användarens inloggade GitHub: `/upload/main` → dra in index.html/analytics.js/sw.js → Commit directly to main. Oura-workflowen kördes också manuellt via Actions → Run workflow (gav 7 juli-datan).

## Grundfakta

- **Repo:** github.com/Tryfffel/health-tracker (publikt) · **Live:** tryfffel.github.io/health-tracker/
- **Teknik:** React 18 + Tailwind via CDN, ren JS (`h = React.createElement`, ingen JSX/bygg). Tre filer, laddade via script-taggar i denna ordning:
  - `charts.js` — egna SVG-diagramkomponenter (`SvgLineChart`, `SvgBarChart`, `SvgScatter`, `SvgDonut`), exponeras globalt via IIFE.
  - `analytics.js` — ALLA analysmotorer som rena funktioner under `window.Analytics` (~35 st). Explicita databeroenden som argument, inga React/DOM-beroenden, deterministiska (Monte Carlo seedas med mulberry32). Inkluderar även Wegovy-motorerna (`getWegovyDoseResponse`, `getWegovyTakt`, `getWegovyMonteCarlo`, `getWegovyCycle`).
  - `index.html` (~3700 rader) — komponenten, vyerna och all UI.
- **Memoisering:** alla tunga motorer beräknas på komponent-topplevel med `useMemo` och rätt beroendelistor (sök på "Memoiserade analysmotorer"). De räknas ALLTSÅ INTE om per tangenttryck. Verifierat headless: 0 omräkningar över 6 re-renders. Nya motorer: lägg i analytics.js + useMemo på topplevel — ALDRIG beräkning direkt i renderfunktionerna (renderOura/renderWegovy körs villkorligt → hooks är förbjudna där).
- **Deploy:** ladda upp filer via GitHubs webb ("Add file → Upload files", `/upload/main`). Sandboxade AI-sessioner är inte git-inloggade; CM6-webbeditorn är opålitlig för stora filer. GitHub Pages deployar automatiskt (~1 min).
- **Datalagring:** användardata (vikt/träning/humör/Wegovy/experiment) i localStorage per enhet. Oura-data i `oura-data.json` i repot.

## Vyer

- **Idag** (`overview`): påminnelser (dos/vikt/backup), platåvarning, sammanslaget kort "Kroppsbatteriet + Dagens form" (batteriet som siffra + 14-dagarsstaplar med drilldown, formens träningsrekommendation som text + nyckeltalsrutor Dagsform/Sömn/HRV/Vilopuls med baslinjepilar, ram färgad efter formnivå), "🌙 I natt"-kort (sömntid m. 7d-snitt, effektivitet, djup/REM, insomning), hero med aktuell vikt/målprogress, snabbstatusrad (loggstreak · steg igår + 7d-snitt · veckans pass) och snabbknappar (Logga vikt / Logga pass).
- **Insikter** (`insights`): tvillingdagar, **veckokortet** (ETT kort: veckoscore + betyg + dag-prickar + 5 delpoäng-barer + jämförelsetabell med kolumnerna "För N v sedan / Förra veckan / Denna vecka / Skillnad", N väljs 1/4/12), statkort, prognos till målet, träningskorrelation, smarta insikter, humör & samband, receptet på bästa dagar, experimentmotorn, grafer (vikt/BMI/humör). Månadssummeringen är BORTTAGEN (finns som tabell i Historik).
- **Oura:** hero "Senaste natt" alltid synlig, resten i **kollapsbara grupper** via `ouraGroup()`-hjälparen: 🧭 Status (veckocoach, hälsoflaggor & kroppslarm, baslinjer 7d vs 30d, trender & rekord) / 🌙 Sömn (regularitet & social jetlag, sömnbanken, läggtid & kronotyp, dagsljus & säsong) / 👟 Aktivitet (aktivitetsbalans) / 🔗 Samband (lag-korrelationsmatris, Oura ↔ vikt, kroppsbatteri ↔ dagsform-scatter med Pearson r via `getBatteryVsForm`) / 📈 Grafer (överlagring, sömnstadier, aktivitet, sömnkvalitet, andning, stress, temperatur). Öppna-state i `ouraOpen` (topplevel), Status öppen som default.
- **Övriga:** Lägg till vikt (+ dagens taggar), Träning, Historik (året i pixlar, månad-för-månad-tabell, mätningstabell med dag-drilldown), Viktminskning/Wegovy, Provsvar (Neko Health), Inställningar.

## Oura-pipelinen

- `.github/workflows/oura-sync.yml` körs **5 ggr varje morgon** (03:45–08:00 UTC, gratis-GitHub skippar ofta enstaka körningar) + manuellt via Actions → Run workflow. Committar bara vid dataändring.
- Token i repo-secret `DASHBOARD` (workflow läser `OURA_TOKEN || DASHBOARD`).
- Hämtar ~200 dagar × ~35 fält: sömn (score, stadier, effektivitet, latens, puls, HRV, andning), dagsform, aktivitet, stress, SpO2, temp, läggtider, resiliens, VO2max, kärlålder.
- Appen läser `oura-data.json?t=<timestamp>` (cache-bust) + auto-sync om >2h.
- **↻ Synka-knappen** triggar hela workflowen via GitHub API (`workflow_dispatch`) om GitHub-token finns i Inställningar, och pollar sedan tills ny data committats (~1 min). Kräver **Actions: write** på tokenen; utan den (403) faller knappen tillbaka till att hämta senast committade och visar en förklarande toast. Utan token: bara hämtning.
- **Självläkande auto-sync** (`autoDispatchIfStale`, 2026-07-06): när appen öppnas och nattens data saknas (senaste datum < idag) och token finns, triggas workflowen tyst automatiskt (throttlad till 1 gång/2h via localStorage-nyckeln `oura-auto-dispatch`), följt av tyst omhämtning efter 90 s. Detta neutraliserar GitHubs opålitliga cron-schema — morgonrutinen "öppna appen" räcker för färskt data. Utan token händer inget (som förr).
- **Oura-vyns alla motorer** (`getOuraHealth`, `getOuraCoach`, `getOuraWeightCorr`, `getOuraLagMatrix`, `getOuraSleepRegularity`, `getOuraUnusualNight`, `getOuraBedtime`, `getOuraActivityBalance`, `getOuraLongTerm`, `getOuraSleepBank`, `getOuraDaylight`) ligger i analytics.js och är memoiserade på topplevel med `Analytics.fn ? ... : null`-guards (skydd mot CDN-race med gammal analytics.js). renderOura innehåller bara vy-formatering (chartData, overlay, aliaser).

## Wegovy-funktioner

Titreringsplan med olika längd på första steget (`first_step_weeks`, hans plan: 6v på 0,25 → 4v-intervall), respons per dossteg, prognosgraf, Monte Carlo-simulering (seedad mulberry32, 2000 sims), milstolpar 5/10/15/20% + STEP 1-jämförelse, biverkningar per dos, takt + signal/brus, injektionscykeln. Injektionsdag inställbar. Första dosen sätter protokollets startdatum. Motorerna ligger i analytics.js och är memoiserade på topplevel.

## Service worker (`sw.js`, cache `halsa-v4`)

- Network-first för navigering och oura-data.json.
- Lokala `.js`-filer: network-first med **`cache: 'no-cache'`** — VIKTIGT: GitHub Pages serverar med `max-age=600`, och utan no-cache fastnar gamla charts/analytics i browserns HTTP-cache i 10 min medan nya index.html redan gått ut → krasch vid mismatch. Rör inte detta utan att förstå det.
- Bumpa cachenamnet vid SW-ändringar.

## Deploy-checklista (följ varje gång)

1. Bygg → testa lokalt (jsdom-sele, se nedan) → `node --check` på alla ändrade .js.
2. Ladda upp via GitHub "Upload files", committa till main.
3. Vänta ~1 min. **Pages-deployen felar ibland** (deploy-jobbet, inte build) — kolla Actions → pages-build-deployment; vid rött: Re-run failed jobs. **OBS: GitHub Pages har en timkvot (~10 deployer/timme per repo).** Vid intensiva sessioner med många deployer ger deploy-jobbet "Deployment failed, try again later" upprepade gånger tills kvoten släpper (2026-07-05: 4 raka fel, löste sig efter ~20 min väntan + omkörning). Sajten kör senaste lyckade versionen under tiden — inget går sönder. Batcha hellre flera ändringar per deploy sent i en session.
4. Verifiera live med `document.body.innerText`-checkar + konsolfel (screenshot-verktyg i AI-sessioner renderar sidan konstigt).
5. **CDN-race:** om index.html börjar ANVÄNDA nya funktioner i analytics.js kan filerna propagera olika snabbt → kort kraschfönster. Bakåtkompatibla tillägg (bara nya funktioner i analytics.js) är ofarliga. Vid beroende ändringar: deploya helst analytics.js först, index.html efter — eller acceptera minuters glapp (sw-fixen no-cache läker det vid nästa laddning).

## Lokal testning (dokumenterat arbetssätt)

Headless jsdom-sele (byggd 2026-07-04, återskapas lätt): npm-installera `jsdom react@18 react-dom@18`, ladda React UMD + charts.js + analytics.js + inline-scriptet i en JSDOM-instans, seeda localStorage med ~90 dagars testdata (entries/workouts/doser/protokoll/experiment), stubba `fetch` för oura-data.json → lokala filen, rendera, klicka nav-knappar via dispatchEvent, assert:a på `document.body.textContent`. Fångar även hooks-fel och referensfel. Komplettera med anropsräknare på `window.Analytics.*` för att verifiera memoisering.

## Backup

Manuell JSON, krypterad .enc (AES-256-GCM, PBKDF2 150k), automatisk veckovis krypterad push till repot (`backup.enc`) om GitHub-token (fine-grained, Contents:write) + lösenord fyllts i under Inställningar. Påminnelse-banner efter 7 dagar.

## Inställningar

Målvikt, tempo, längd, årsmål, injektionsdag, stegmål ×2, sömnbehov, latitud, GitHub-token, krypteringslösenord.

**Humörskala:** 😞😕😐🙂😄 (Tungt/Sådär/Ok/Bra/Toppen) — definierad EN gång som `MOOD_EMOJIS`/`MOOD_LABELS`.

## Backlog (prioriterad)

1. **SMHI-väderdata** — temperatur/nederbörd/soltimmar via metobs-API i oura-sync.yml (kräver val av mätstation, fråga användaren om ort), korsas mot humör/sömn som dagsljuset.
2. Redigera träningspass & doser i efterhand; push-notiser (SW finns); midjemått; biverknings-tidslinje.
3. Läkarrapport-PDF (avböjd tidigare, kan bli aktuell inför uppföljning).
4. Ev. rullande/långsammare baslinje i kroppsbatteriet — vid varaktiga HRV-skiften (som sommaren 2026) blir batteriet strukturellt lågt med fast 30-dagarsbaslinje. Designbeslut, diskutera med användaren först.

## Kända egenheter

- GitHub-schemalagda körningar är opålitliga → därav 5 cron-tider. Manuell körning: Actions → Oura sync → Run workflow.
- Pages deploy-jobbet felar ibland slumpmässigt → Re-run failed jobs.
- VO2max är null tills ringen fått pulspass.
- Integritet: användaren har medvetet accepterat att namn/mail syns i commit-historik och att repot är publikt (privat kräver GitHub Pro för Pages).
- Screenshot-verktyg i AI-sessioner renderar sidan konstigt — verifiera med `document.body.innerText`-checkar istället.
- I renderWegovy skuggar lokala `var todayStr = toDateStr(today)` den yttre funktionen `todayStr()` — var uppmärksam vid ändringar där.

## Användarens preferenser

Datanörd — vill ha statistiskt hederliga analyser (effektstorlekar, konfidens, brus vs signal), inga förenklade "wellness"-floskler. Bygg → testa lokalt → node --check → deploya → verifiera live. En sak i taget, deploya aldrig halvfärdigt. Svenska i all UI-text.
