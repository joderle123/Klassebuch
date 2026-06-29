# Bibliothek per KI ausbauen — Runbook

Stand: 12 generierte Materialien, Ziel ~100. Generierung ist **offline/einmalig**:
einmal erzeugen, integrieren, committen — danach läuft die App ohne KI.

## Warum dieser Weg (Lehre aus dem Fehllauf)

Ein früherer Lauf verlor ~601k Tokens, weil der Workflow bei einem `null`-Ergebnis
(Session-Limit mitten im Lauf) abstürzte und **auch fertige Batches verwarf**.
Der neue Weg kann das nicht:

- **Platte = Quelle der Wahrheit.** Jeder Agent schreibt seinen Batch *sofort*
  nach `tmp/gen-batches/batch-NN.json`, bevor er zurückkehrt. Ein Absturz/Limit
  lässt jeden fertigen Batch auf der Platte zurück.
- **Keine teure KI-Einzelprüfung.** `scripts/integrate.mjs` validiert
  Themen / ELDiB-ids / Altersstufe / Typ / Worksheet und entfernt Dubletten
  rein mechanisch — billiger und deterministisch.
- **Schlank & beschränkt.** Standard: 6 Batches × 4 = 24 Entwürfe pro Lauf.
  Mehrfach mit `--append` aufrufen, um schrittweise auf ~100 zu wachsen.

## Ablauf (nach Reset des Session-Limits, 16:20 UTC)

```bash
mkdir -p tmp/gen-batches          # Zielordner für die Batches
```

Dann in Claude den Workflow starten:

```
Workflow  scriptPath=scripts/gen-materials.workflow.mjs
          args={ "batches": 6, "perBatch": 4, "outDir": "tmp/gen-batches" }
```

Danach integrieren — das holt **alle** Batch-Dateien, auch aus einem Teil-/Absturzlauf:

```bash
node scripts/integrate.mjs tmp/gen-batches --append   # validiert, dedupliziert, schreibt generated.ts
npm run build                                         # tsc -b prüft generated.ts mit
rm -rf tmp/gen-batches                                # Zwischendateien aufräumen
```

Dann `git diff` der Materialien sichten und `src/data/materials/generated.{ts,json}` committen.

## Wiederaufnahme nach Absturz

Selbst wenn der Workflow erneut abbricht: die bereits geschriebenen
`tmp/gen-batches/batch-*.json` bleiben erhalten. Einfach erneut

```bash
node scripts/integrate.mjs tmp/gen-batches --append
```

ausführen — fertige Batches sind damit gesichert; fehlende per erneutem
Workflow-Lauf nachproduzieren.
