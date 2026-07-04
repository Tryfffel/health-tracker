# Apple Health-bron — Watch-pass in i Hälsodagboken automatiskt

Appen läser `apple-workouts.json` från repot och importerar nya pass automatiskt (dubbletter hoppas över via id). En iOS-genväg fyller på filen varje kväll.

## Format som appen förväntar sig

```json
[
  { "id": "ah-2026-07-04-styrka-45", "date": "2026-07-04", "type": "Styrketräning", "duration": 45, "intensity": 3, "comment": "⌚ Apple Watch" }
]
```

- `type` mappas mot appens typer: Styrketräning, Löpning, Promenad, Cykling, Simning, Yoga, Innebandy, Crossfit, Annat m.fl.
- `duration` i minuter. `intensity` 1–5 (utelämnas → 3).
- `id` måste vara unikt och stabilt (t.ex. `ah-` + datum + typ + minuter) — det är dubblettskyddet.

## Bygg genvägen (Genvägar-appen på iPhone, ~10 min)

1. Ny genväg → **"Hitta hälsourval"** (Find Health Samples): typ **Träningspass**, senaste 1 dagen.
2. **Upprepa med varje** (Repeat with Each) → bygg text/ordlista per pass: datum (formaterat ÅÅÅÅ-MM-DD), träningstyp, längd i minuter.
3. Bygg JSON-listan (Kombinera text / Ordlista → JSON).
4. **Hämta innehåll från URL** (GET) `https://api.github.com/repos/Tryfffel/health-tracker/contents/apple-workouts.json` med header `Authorization: Bearer DIN_TOKEN` → plocka `sha` och befintligt innehåll (Base64-avkoda), slå ihop med dagens pass.
5. **Hämta innehåll från URL** (PUT) samma URL, JSON-body: `{"message":"Watch-pass","content":"<Base64 av nya listan>","sha":"<sha>"}` med samma Authorization-header.
6. Automation: Personlig automation → Tid på dagen → 21:30 varje dag → kör genvägen → stäng av "Fråga innan körning".

Token: samma fine-grained PAT som molnbackupen (Contents: Read and write, bara detta repo).

Tips: gör steg 1–3 först och testa med "Snabbtitt" innan du kopplar på GitHub-stegen.

## Typmappning Apple → appen (förslag i steg 2)

| Apple-typ | Appens typ |
|---|---|
| Traditional Strength Training / Functional Strength | Styrketräning |
| Running | Löpning |
| Walking | Promenad |
| Cycling | Cykling |
| Swimming | Simning |
| Yoga | Yoga |
| HIIT | Crossfit |
| Övrigt | Annat |
