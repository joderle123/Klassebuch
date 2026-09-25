# Klassenbuch – Testversion für den CDSE Hub

Grundlage ist der Galileo-Stand `aa1f48c` (Branch `claude/focused-galileo-e2s63b`). Dieser Branch bleibt
unverändert. Hier wird der Stand weiterentwickelt und nach `apps/klassenbuch.html` gebaut.

## Unterschiede zum Galileo-Stand

- **Keine echten Daten im Code.**
  - Keine eingebauten Dossiers, keine feste Klassenliste.
  - Keine Namen von Mitarbeitenden, Behandelnden oder Kindern.
  - Die Klasse kommt aus den eigenen Daten im Browser bzw. aus der Team-Datei.
- **Ohne Ballast (1,2 MB statt 19,7 MB):**
  - Die alte Toolbox und die Kopie der Materialdaten sind entfernt. Materialvorschläge kommen aus dem
    Verzeichnis der Hub-Toolbox (`toolbox-index.js`); geöffnet wird die Toolbox des Hubs.
  - SAVOIR, das geführte Screening und die „Pathologien“ sind entfernt.
  - Der Screening-Reiter zeigt frühere Angaben nur noch zum Nachlesen, ohne Verdachtsachsen. Das
    Screening selbst ist im Hub (Schüler → Dossier → Screening).
  - Der KI-Export ist aus dem Menü genommen.
- **Menü „Im CDSE Hub“:** Toolbox, Screening und Lernen öffnen sich in denselben Tabs wie aus dem Hub.
- **Keine Anfragen ins Internet:** Die Google-Schriften sind entfernt.

## Bauen und prüfen

```bash
node klassenbuch/quellen/build-merged.cjs      # → apps/klassenbuch.html
npx http-server . -p 8099 -s                   # im Hauptordner, in einem zweiten Fenster
node klassenbuch/tests/rundgang.cjs            # Rundgang, nur erfundene Personen
```

Neben `apps/klassenbuch.html` müssen liegen:

- `toolbox-index.js`: Materialvorschläge
- `kb-screening-texte.js`: Texte der früheren Screenings
- `toolbox.html` und `lernen.html`

Im Hub-Ordner ist das so.

## Regeln

- Nie echte Daten in diesen Ordner, in Tests oder in Bildschirmfotos. Das Repository ist öffentlich.
- Speicherschlüssel und Datenformate (`klassebuch_*`, `anwesenheit_v1`, `cdse_dossier_db`, Team-Datei
  `klassebuch-shared-v1`) nicht ändern. Bestehende Daten müssen weiter geladen werden.
