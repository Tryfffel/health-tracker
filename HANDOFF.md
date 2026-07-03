# HANDOFF — health-tracker (Hälsodagbok)

Senast uppdaterad: 2026-07-03. Läs detta innan du ändrar något.

## Grundfakta

- **Repo:** github.com/Tryfffel/health-tracker (publikt) · **Live:** tryfffel.github.io/health-tracker/
- **Teknik:** allt i EN fil, `index.html` (~4000 rader). React 18 + Tailwind via CDN, ren JS (`h = React.createElement`, ingen JSX/bygg). Egna SVG-diagram (`SvgLineChart`, `SvgBarChart`, `SvgScatter`, `SvgDonut`).
- **Deploy:** ladda upp filer via GitHubs webb ("Add file → Upload files", `/upload/main`). Sandboxade AI-sessioner är inte git-inloggade; CM6-webbeditorn är opålitlig för stora filer. GitHub Pages deployar automatiskt (~1 min).
- **Datalagring:** användardata (vikt/träning/humör/Wegovy/experiment) i localStorage per enhet. Oura-data i `oura-data.json` i repot.

## Oura-pipelinen

- `.github/workflows/oura-sync.yml` körs **5 ggr varje morgon** (03:45–08:00 UTC, gratis-GitHub skippar ofta enstaka körningar) + manuellt via Actions → Run workflow. Committar bara vid dataändring.
- Token i repo-secret `DASHBOARD` (workflow läser `OURA_TOKEN || DASHBOARD`).
- Hämtar ~200 dagar × ~35 fält: sömn (score, stadier, effektivitet, latens, puls, HRV, andning), dagsform, aktivitet (steg, kalorier, hög/medel/låg/stillasittande, MET, inaktivitetslarm), stress, SpO2, temp, **läggtider** (bedtime_start/end), resiliens, VO2max, kärlålder.
- Appen läser `oura-data.json?t=<timestamp>` (cache-bust) + auto-sync om >2h.

## Funktioner (byggda 2026-07-03)

**Översikt:** Dagens form (träningsrekommendation), Tvillingdagar (nearest neighbor), backup-påminnelse, veckoscore, veckojämförelse (1/4/12 v), Humör & samband (korrelationer, bästa dagar-profil, veckodag, scatter), Receptet på bästa dagar, Experiment-motorn (28d före/efter, Cohen's d), plateau-detektion, prognos.

**Viktminskning (Wegovy):** titreringsplan med olika längd på första steget (`first_step_weeks`, hans plan: 6v på 0,25 → 4v-intervall), respons per dossteg, prognosgraf, Monte Carlo-simulering (seedad mulberry32), milstolpar 5/10/15/20% + STEP 1-jämförelse, biverkningar per dos, takt vecka-för-vecka + signal/brus-analys, injektionscykeln (mönster per dag efter dos). Injektionsdag är inställbar (inte hårdkodad tisdag). Första dosen sätter protokollets startdatum.

**Oura-vyn:** hälsoflaggor med varaktighet + kroppslarm (≥2 mått avviker), baslinjetabell 7d vs 30d, sömnbanken (sömnskuld, behov inställbart), läggtid & kronotyp (optimal läggtid via 30-min-buckets), dagsljus & säsong (astronomiskt från latitud-inställning), aktivitetsbalans, lag-korrelationsmatris (idag → imorgon), trender & rekord + "ovanlig natt"-percentiler, sömnregularitet + social jetlag, alla grafer.

**Historik:** året i pixlar (humör/sömn, klickbara), månad-för-månad-tabell, mätningstabell med dag-drilldown (klick på rad → modal med allt för dagen).

**Backup:** manuell JSON, krypterad .enc (AES-256-GCM, PBKDF2 150k), **automatisk veckovis krypterad push till repot** (`backup.enc`) om GitHub-token (fine-grained, Contents:write) + lösenord fyllts i under Inställningar. Påminnelse-banner efter 7 dagar.

**Inställningar:** målvikt, tempo, längd, årsmål, injektionsdag, stegmål ×2, sömnbehov, latitud, GitHub-token, krypteringslösenord.

**Humörskala:** 😞😕😐🙂😄 (Tungt/Sådär/Ok/Bra/Toppen) — definierad EN gång som `MOOD_EMOJIS`/`MOOD_LABELS`.

**Service worker:** `sw.js`, cache `halsa-v2`, network-first för navigering + oura-data.json.

## Backlog (prioriterad)

1. **Refaktor** — filen är ~4000 rader. Dela upp: analysmotorer (rena funktioner) → `analytics.js`, diagram → `charts.js`, vyer kvar i index.html. Ingen byggkedja — bara script-taggar. Gör detta i EGEN session utan featureblandning.
2. **SMHI-väderdata** — temperatur/nederbörd/soltimmar via metobs-API i oura-sync.yml (kräver val av mätstation, fråga användaren om ort), korsas mot humör/sömn som dagsljuset.
3. Redigera träningspass & doser i efterhand; push-notiser (SW finns); midjemått; biverknings-tidslinje.
4. Läkarrapport-PDF (avböjd tidigare, kan bli aktuell inför uppföljning).

## Kända egenheter

- GitHub-schemalagda körningar är opålitliga → därav 5 cron-tider. Manuell körning: Actions → Oura sync → Run workflow.
- VO2max är null tills ringen fått pulspass.
- Integritet: användaren har medvetet accepterat att namn/mail syns i commit-historik och att repot är publikt (privat kräver GitHub Pro för Pages).
- Screenshot-verktyg i AI-sessioner renderar sidan konstigt — verifiera med `document.body.innerText`-checkar istället.

## Användarens preferenser

Datanörd — vill ha statistiskt hederliga analyser (effektstorlekar, konfidens, brus vs signal), inga förenklade "wellness"-floskler. Bygg → testa lokalt (python3 -m http.server + seedad testdata) → node --check på scriptet → deploya → verifiera live. Svenska i all UI-text.
