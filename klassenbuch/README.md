# Klassenbuch der Annexe Junglinster

Das Klassenbuch wird aus `klassenbuch/quellen/` gebaut:

```bash
node klassenbuch/quellen/build-merged.cjs      # → apps/klassenbuch.html
```

## Was drin ist

Grundlage ist das bisherige Klassenbuch der Annexe mit allen Daten und Einstellungen: die eingebaute Klasse, die
Dossier-Einträge und Réunionen, Schuljahre, Trimester, Stundenpläne und Fächer. Ebenfalls weiter drin:

- Papierkorb, Bremse je Schüler und „Aus der Team-Datei wiederherstellen“
- gleichzeitiges Schreiben mit feldgenauem Zusammenführen, Entwürfe
- luxemburgische Rechtschreibprüfung
- Retard in Minuten, Klassenbuch-Notizen
- Réunion als Word/PDF, Wochen-Sicherung
- KI-Anonymisierung

## Aus dem gemeinsamen Stand (Unified) übernommen

- **„Heute“ ist die Startseite** (fürs Morning Meeting). Sie zeigt:
  - wer heute fehlt
  - offene Entschuldigungen
  - Fehlzeiten im Trimester ab 10 %
  - Prüfungen und Hausaufgaben für heute
  - offene Wochenziele der letzten Réunion
- **Die Anwesenheit passt auf jeden Bildschirm.** Ab 1280 px steht die ganze Woche ohne Scrollen da. Auf Tablet und
  Handy scrollt nur die Tabelle.
- **Menü „Im Hub“:** Toolbox, Screening, Lernen und Pathologien öffnen sich in denselben Tabs wie aus dem Hub.
  - Materialvorschläge kommen aus dem Verzeichnis der Toolbox (`toolbox-index.js`); geöffnet wird die Toolbox des Hubs.
  - Die alte Material-Bibliothek ist nicht mehr eingebaut. Alle ihre Materialien sind in der Toolbox.
  - SAVOIR ist jetzt die eigene App „Pathologien“.
  - Die Datei ist dadurch 2,1 MB statt 18 MB groß.
- **Screening im Hub.** Das Screening macht man jetzt im Hub (Schüler → Dossier → Screening). Der Reiter im Klassenbuch
  zeigt frühere Angaben nur noch zum Nachlesen, ohne Verdachtsachsen.
- **Person aus dem Hub.** Wer im Hub angemeldet ist, schreibt unter seinem Namen; eine zweite Personenwahl gibt es
  nicht.
  - Bei Kindern, die der Hub zugeordnet hat, steht der Knopf **„Dossier im Hub“**.
- **Behobene Fehler beim Abgleich über die Team-Datei:**
  - Änderungen an bestehenden Datensätzen kommen auf den anderen Geräten an, ohne Hin- und Herpendeln.
  - Unbekannte Sammlungen bleiben erhalten.
  - Fremde Team-Dateien werden abgelehnt.
- **Wochenziele** werden überall als Text gezeigt. Früher kaputt gespeicherte Ziele sind als „Zieltext verloren“
  gekennzeichnet.
- **Beim Start verschwindet nichts mehr.** Einträge und Wochenziele von Kindern, die nicht in der Klassenliste stehen,
  bleiben erhalten. In den Papierkorb kommt nur, was jemand bewusst löscht (Klassenliste → 🗑, mit Rückfrage).
- **Persönliche Aufgaben** stehen nur beim betreffenden Kind. Ehemalige Kinder sind als „ehemalig“ gekennzeichnet.

## Was neben der Datei liegen muss

Im Hub-Ordner liegt das alles schon so.

- `toolbox-index.js`: Materialvorschläge
- `kb-screening-texte.js`: Texte der früheren Screenings
- `toolbox.html`, `lernen.html`, `pathologien.html`
- `../hub.html` und `../hub-apps.js`

## Prüfen

Die Tests brauchen einen Webserver im Hauptordner (`npx http-server . -p 8099 -s`).

```bash
node klassenbuch/tests/rundgang.cjs
node klassenbuch/tests/fehler.cjs
node klassenbuch/tests/heute.cjs
node klassenbuch/tests/layout.cjs
```

Bilder aus den Testläufen landen in `klassenbuch/tests/aus/`. Dieser Ordner wird nicht mit abgelegt, weil die Bilder
Namen aus der eingebauten Klasse zeigen können.

## Regeln

- **Speicherschlüssel und Datenformate nicht ändern**, damit bestehende Daten weiter geladen werden. Das betrifft
  `klassebuch_*`, `anwesenheit_v1`, `cdse_dossier_db` und die Team-Datei `klassebuch-shared-v1`.
- **Nichts geht ins Netz:** keine Web-Schriften, keine Cloud, keine Telemetrie.
