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
- **Anwesenheit auf jedem Bildschirm:**
  - Auf dem Laptop (ab 1280 px) passt die ganze Woche ohne Scrollen, alle Tage gleich breit.
  - Auf Tablet und Handy scrollt nur die Tabelle in ihrer Karte. Früher verrutschte die ganze Seite.
- **„Heute“ (neue Startseite, fürs Morning Meeting):**
  - wer heute fehlt,
  - offene Entschuldigungen (älter als 3 Tage),
  - Fehlzeiten im Trimester ab 10 % der Schulstunden,
  - Prüfungen und Hausaufgaben für heute,
  - offene Wochenziele der letzten Réunion.

  Ein Klick auf ein Kind öffnet es im Klassenbuch.

## Journal

Das Journal für ISA und Diagnostique wird aus denselben Quelltexten gebaut
(`build-isa.cjs` → `apps/journal.html`, 1,1 MB statt 17 MB). Es hat dieselben Änderungen und eigene
Speicherschlüssel (`isa_…`). Eine Team-Datei des Klassenbuchs lehnt es ab, und umgekehrt.

## Zusammenführung mit dem Hub

- **Person und Team** kommen aus dem Hub (`cdse-nutzer`). Es gibt keine zweite Personenwahl.
- **Schülerdaten:** Die Hub-Seite „Schüler“ zeigt einen Hinweis, wenn Klassenbuch oder Journal Daten
  haben, die noch nicht im Hub-Dossier stehen. Der Assistent ordnet jedes Kind einem Dossier zu oder
  legt ein neues an. Er übernimmt verlustfrei, ohne Dubletten, und trägt Änderungen später nach:
  - Einträge (mit Kategorie, Schlagwörtern und Verfasser)
  - Réunion-Beiträge und Wochenziele
  - DS/PEI-Berichte
  - Helfernetz
  - frühere Screenings
- **„Dossier im Hub“:** Danach zeigt das Klassenbuch beim Kind den Knopf „Dossier im Hub“.
- **Was im Klassenbuch bleibt:** Klassenführung, also Anwesenheit, Réunion, Stundenplan, Noten und Berichte.

## Bauen und prüfen

```bash
node klassenbuch/quellen/build-merged.cjs      # → apps/klassenbuch.html
node klassenbuch/quellen/build-isa.cjs         # → apps/journal.html
npx http-server . -p 8099 -s                   # im Hauptordner, in einem zweiten Fenster
node klassenbuch/tests/rundgang.cjs            # Klassenbuch: Rundgang
node klassenbuch/tests/fehler.cjs              # Klassenbuch: behobene Fehler (zwei Geräte, Team-Datei)
node klassenbuch/tests/heute.cjs               # Klassenbuch: Heute-Tafel
node klassenbuch/tests/layout.cjs              # Klassenbuch: Anwesenheit auf Laptop, Tablet, Handy
node klassenbuch/tests/journal.cjs             # Journal: Rundgang
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
