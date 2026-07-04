# Apple Health-bron — Watch-pass in i Hälsodagboken automatiskt

Flödet: iPhone-genvägen skickar dagens pass som textrader till GitHub (ETT anrop) → workflowen `apple-import.yml` normaliserar, mappar träningstyper, dedupar och committar `apple-workouts.json` → appen importerar automatiskt vid nästa öppning (märkta "⌚ Apple Watch").

All krånglig logik (sha, base64, merge, typmappning engelska→svenska, sekunder→minuter) sköts av workflowen. Genvägen är avsiktligt dum.

## Bygg genvägen (iPhone, ~5 min)

Skapa ny genväg med dessa åtgärder i ordning:

1. **Hitta träningspass** (Find Health Samples → typ: Träningspass) där *Startdatum* är *idag*.
2. **Upprepa med varje** (objekt = passen):
   - **Formatera datum**: Upprepningsobjektets *startdatum*, anpassat format `yyyy-MM-dd`
   - **Text**: `[Formaterat datum]|[Upprepningsobjektets Träningstyp]|[Upprepningsobjektets Längd i minuter]`
   - **Lägg till i variabel**: `Rader`
3. **Kombinera text**: variabeln `Rader`, separator *Ny rad*.
4. **Hämta innehåll från URL**:
   - URL: `https://api.github.com/repos/Tryfffel/health-tracker/dispatches`
   - Metod: **POST**
   - Rubriker: `Authorization` = `Bearer DIN_TOKEN` · `Accept` = `application/vnd.github+json`
   - Begärans innehåll (JSON):
     ```json
     { "event_type": "apple-workouts", "client_payload": { "text": "KOMBINERAD_TEXT_HÄR" } }
     ```
     (sätt in variabeln från steg 3 som värdet för `text`)

Token: samma fine-grained PAT som molnbackupen (bara detta repo, **Contents: Read and write**).

## Automatisera

Genvägar → Automation → **Tid på dagen** → 21:30, varje dag → kör genvägen → stäng av "Fråga innan körning". Klart — passen flyter in själva varje kväll.

## Testa

Kör genvägen manuellt en dag du tränat → kolla repo-fliken **Actions** att "Apple Health import" blir grön → öppna appen: toast "⌚ N pass importerade från Apple Watch".

## Format & regler (referens)

- Radformat: `2026-07-04|Running|45` (datum|typ|minuter). Även `client_payload.workouts` som JSON-array accepteras.
- Längd > 300 tolkas som sekunder och konverteras till minuter.
- Typmappning (Running→Löpning, Traditional Strength Training→Styrketräning, HIIT→Crossfit osv.) sker i workflowen; okända typer behålls som de är.
- Dubblettskydd via stabilt id (`ah-datum-typ-minuter`) — det är säkert att skicka samma dag flera gånger.
- Max 500 pass behålls i filen (äldst rensas).
