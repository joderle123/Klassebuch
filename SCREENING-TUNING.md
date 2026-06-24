# Savoir-Screening — klinische Stellschrauben (`SAVOIR_TUNING`)

Alle klinisch relevanten Zahlen des Screenings stehen **an einer Stelle**:
im Objekt `const SAVOIR_TUNING = { … }` in **`SAVOIR.html`** (Abschnitt
„Scoring-Engine v2", direkt vor `scoreVerdachtsachsen`).

Diese Datei erklärt jede Stellschraube — gedacht zum **Gegenlesen mit einer
Fachperson**. Wer Werte ändert, ändert das Verhalten des gesamten Tools
(geführter Trichter, Experten-Ansicht, Schüler-Hub, KI-Export), weil alle
Teile dieselbe Config lesen.

> ⚠️ **Wichtig, ehrlich:** Das ist eine **Hypothesen-/Triage-Hilfe, kein
> validiertes Diagnoseinstrument.** Die Zahlen sind fachlich begründete
> Schätzungen (Prävalenz-Größenordnungen, Konvergenz-Prinzip), **keine
> normkalibrierten Cutoffs** aus einer Validierungsstudie. Das Ergebnis ersetzt
> keine fachliche Abklärung.

## Ändern & wirksam machen

1. Wert in `SAVOIR.html` → `SAVOIR_TUNING` anpassen (nur die Zahl/den Eintrag).
2. Neu bauen: `node build-merged.cjs` (erzeugt `index.html`).
3. App öffnen und gegenprüfen.

Nichts anderes muss angefasst werden — Engine **und** Sicherheits-Wrapper
(Krisen-Banner, Konfidenz, „seltene Achse", „schwache Datenbasis") lesen
ausschließlich aus diesem Objekt.

---

## (1) `axisPrior` — Basisraten je Achse

Bayes-artiger Faktor: seltene Bilder brauchen mehr/spezifischere Evidenz, um
aufzusteigen. `achsenScore × axisPrior[Achse]`.

| Achse | Bild | Prior |
|------|------|------|
| A01 | Autismus-Spektrum | 0.80 |
| A02 | ADHS | 1.00 |
| A03 | Depression | 1.00 |
| A04 | Bipolar | **0.55** |
| A05 | Angststörungen | 1.00 |
| A06 | Zwang | 0.80 |
| A07 | PTBS / Trauma | 0.85 |
| A08 | Essstörungen | 0.75 |
| A09 | Sucht | 0.90 |
| A10 | Verhaltensstörungen (ODD/CD) | 0.90 |
| A11 | Lernstörungen | 0.95 |
| A12 | Borderline-Struktur | **0.65** |
| A13 | Psychose-Erstmanifestation | **0.55** |

- **Höher** (→ 1.0) = empfindlicher, flaggt leichter. **Niedriger** = zurückhaltender.
- Sinnvoller Bereich ~0.40–1.00.
- Achsen mit Prior **≤ 0.60** gelten automatisch als „selten" → lösen den
  Basisraten-Vorsicht-Hinweis aus (aktuell A04, A13; A12 grenzwertig 0.65).

## (2) `specificityExponent` — Spezifitäts-Dämpfung

Ein Symptom, das auf viele Achsen zeigt, ist pro Achse weniger beweiskräftig.
Beitrag = `Gewicht × 1 / (Achsenzahl ^ specificityExponent)`.

| Wert | Wirkung |
|------|---------|
| `0` | aus — jedes Symptom voll auf jede Achse (= altes v1-Verhalten) |
| `0.5` | **Standard** — 1/√n, moderate Dämpfung |
| `1.0` | stark — 1/n |

Höher = unspezifische „Streu-Symptome" zählen weniger → weniger Mit-Flaggen.

## (3) `axisThresholds` — wann wird ein Verdacht „mild/mittel/deutlich"?

Auf dem **prior-adjustierten** Score. `count` = Anzahl **distinkter**
beitragender Symptome (Konvergenz: ein Zeichen ist kein Syndrom).
`relTop` = Mindestanteil am stärksten Achsen-Score.

| Stufe | score | count | relTop |
|-------|------:|------:|------:|
| deutlich | 35 | 3 | 0.65 |
| mittel | 20 | 2 | 0.40 |
| mild | 12 | 2 | 0.00 |

Faustzahlen **vor** Spezifität/Prior: 1 Symptom Gewicht 3 ≈ 15 Punkte,
Gewicht 2 ≈ 10, Gewicht 1 ≈ 5. → `count` hochsetzen = strenger gegen
Einzelhinweise; `score`/`relTop` hochsetzen = strenger insgesamt.

## (4) `riskThresholds` — Risikofilter R01–R03

`{ deutlich: 30, mittel: 15, mild: 8 }`. Gilt für R01 Suizidalität, R02
Selbstverletzung, R03 Somatoform. (Akut-Items, s. (5), überschreiben das.)

## (5) `acuteItems` — Sicherheit vor Score

Bestimmte K16-Items lösen **unabhängig vom Score** sofort Alarm aus.

| Item | Bedeutung | `sev` | `forcesRisk` |
|------|-----------|-------|--------------|
| 16.2 | Konkreter Suizidplan / Vorbereitung | `kritisch` (rot) | R01 → deutlich |
| 16.1 | Suizidgedanken berichtet | `akut` (orange) | – (nur Banner) |
| 16.3 | Aktive Selbstverletzung | `akut` | R02 → deutlich |

- `sev`: Stufe/Farbe im Krisen-Banner. `forcesRisk`: erzwingt diese Risiko-Stufe
  auf „deutlich" (`null` = nur Banner, kein Score-Eingriff).
- Weitere Items lassen sich hier ergänzen (Eintrag mit `sev`/`forcesRisk`/`label`).

## (6) `contextCap` — Submuster: Symptome dominieren

`true` (Standard): Demografie/Setting (z. B. Geschlecht, Schulsituation) kann die
beobachtete Symptom-Evidenz nur **spiegeln**, nie **ersetzen** — ohne
Symptom-Treffer kann ein rein demografisches Submuster nicht führen.
`false` = altes Verhalten (Kontext addiert voll).

## (7) Mindest-Evidenz-Hinweise

| Schlüssel | Standard | Bedeutung |
|-----------|---------:|-----------|
| `weakGlobalBelow` | 3 | < so vielen globalen Beobachtungen → „schwache Datenbasis" |
| `weakAxisEvidenceMax` | 2 | ≤ so wenige zur Top-Achse passende Items → schwach |

Nur Hinweis-Texte, kein Score-Eingriff.

## (8) `gateQuestions` — Kriterien-Check

Die drei Fragen nach der Vertiefung (Dauer / Beeinträchtigung / Ausschluss).
Frei editierbar (`key`, `titel`, `optionen[{val,text}]`). Die `val`-Werte werden
in (9) referenziert.

## (9) `confidenceRules` — klinische Konfidenz

Bildet das DSM/ICD-Prinzip ab: *Symptome + Dauer + bedeutsame Beeinträchtigung
+ Ausschluss*. **Ändert nicht, welche Achse/welches Submuster führt — nur, wie
belastbar der Verdacht ist.** Erste passende Regel gewinnt.

`when`-Bedingungen über die Gate-Antworten: `feld: wert` (Gleichheit) oder
`feldIn: [werte]` (enthält). `tone`: `ok` / `warn` / `muted`.

| Reihenfolge | Bedingung | Ergebnis |
|---|---|---|
| 1 | `alt = ja` | Differential zuerst klären (warn) |
| 2 | `beeintr = kaum` | Beobachten — kein bedeutsamer Leidensdruck (muted) |
| 3 | `dauer = kurz` | Mögliche akute Belastungsreaktion (warn) |
| 4 | `dauer ∈ {mittel,lang}` **und** `beeintr ∈ {merklich,stark}` | Verdacht erhärtet (ok) |
| 5 | (Rest) | Hinweis — weiter beobachten (muted) |

---

## Designprinzipien (warum es so rechnet)

- **Konvergenz statt Einzelzeichen:** jede Stufe verlangt ≥ 2 zusammenpassende
  Beobachtungen — ein einzelnes Symptom flaggt nie.
- **Spezifität:** unspezifische Symptome (viele Achsen) zählen pro Achse weniger.
- **Basisraten:** seltene/schwere Bilder brauchen mehr Evidenz (Anti-Überdiagnose).
- **Risiko-Akuität:** ein konkreter Plan zählt nicht wie vage Gedanken; akute
  Items eskalieren sofort, unabhängig vom Score.
- **Symptome > Demografie** beim Submuster (Kontext-Cap).
- **Kriterien-Check** trennt „welche Achse" (symptomgetrieben) von „wie belastbar"
  (Dauer/Beeinträchtigung/Ausschluss).

## Grenzen (bitte mit Fachperson lesen)

- Keine empirische Normstichprobe → keine geprüfte Sensitivität/Spezifität.
- Ein Beobachter, ein Zeitpunkt; kein Mehr-Informanten-Abgleich.
- Submuster sind klinisch plausible Konstrukte, **keine** validierten DSM/ICD-Subtypen.
- Ergebnis = „Richtung, die einen Fachblick verdient", **keine** Diagnose.
