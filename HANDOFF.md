# HANDOFF — health-tracker (Hälsodagbok)

Senast uppdaterad: 2026-07-04. Läs detta innan du ändrar något.

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

## Wegovy-funktioner

Titreringsplan med olika längd på första steget (`first_step_weeks`, hans plan: 6v på 0,25 → 4v-intervall), respons per dossteg, prognosgraf, Monte Carlo-simulering (seedad mulberry32, 2000 sims), milstolpar 5/10/15/20% + STEP 1-jämförelse, biverkningar per dos, takt + signal/brus, injektionscykeln. Injektionsdag inställbar. Första dosen sätter protokollets startdatum. Motorerna ligger i analytics.js och är memoiserade på topplevel.

## Service worker (`sw.js`, cache `halsa-v4`)

- Network-first för navigering och oura-data.json.
- Lokala `.js`-filer: network-first med **`cache: 'no-cache'`** — VIKTIGT: GitHub Pages serverar med `max-age=600`, och utan no-cache fastnar gamla charts/analytics i browserns HTTP-cache i 10 min medan nya index.html redan gått ut → krasch vid mismatch. Rör inte detta utan att förstå det.
- Bumpa cachenamnet vid SW-ändringar.

## Deploy-checklista (följ varje gång)

1. Bygg → testa lokalt (jsdom-sele, se nedan) → `node --check` på alla ändrade .js.
2. Ladda upp via GitHub "Upload files", committa till main.
3. Vänta ~1 min. **Pages-deployen felar ibland** (deploy-jobbet, inte build) — kolla Actions → pages-build-deployment; vid rött: Re-run failed jobs. Hände 2026-07-04, omkörning löste det.
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
2. Lyfta Oura-vyns interna motorer (bodyAlarm, coach, lagMatrix, sleepReg, bedtimeAnalysis, daylight m.fl.) till analytics.js + memoisering — de beräknas fortfarande inline i renderOura (körs bara när vyn visas och inga textfält finns där, så lågt tryck; kollapsade grupper renderar inte sitt innehåll).
3. Redigera träningspass & doser i efterhand; push-notiser (SW finns); midjemått; biverknings-tidslinje.
4. Läkarrapport-PDF (avböjd tidigare, kan bli aktuell inför uppföljning).

## Kända egenheter

- GitHub-schemalagda körningar är opålitliga → därav 5 cron-tider. Manuell körning: Actions → Oura sync → Run workflow.
- Pages deploy-jobbet felar ibland slumpmässigt → Re-run failed jobs.
- VO2max är null tills ringen fått pulspass.
- Integritet: användaren har medvetet accepterat att namn/mail syns i commit-historik och att repot är publikt (privat kräver GitHub Pro för Pages).
- Screenshot-verktyg i AI-sessioner renderar sidan konstigt — verifiera med `document.body.innerText`-checkar istället.
- I renderWegovy skuggar lokala `var todayStr = toDateStr(today)` den yttre funktionen `todayStr()` — var uppmärksam vid ändringar där.

## Användarens preferenser

Datanörd — vill ha statistiskt hederliga analyser (effektstorlekar, konfidens, brus vs signal), inga förenklade "wellness"-floskler. Bygg → testa lokalt → node --check → deploya → verifiera live. En sak i taget, deploya aldrig halvfärdigt. Svenska i all UI-text.
