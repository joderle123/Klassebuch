# Quelltexte des CDSE Hub

`hub.html` im Hauptordner wird aus diesen Dateien gebaut – nicht von Hand ändern.

| Datei | Inhalt |
|---|---|
| `hub.vor-arbeit.html` | Grundgerüst des Hubs (Seitenleiste, Kacheln, Anleitung, Hub-Skript) |
| `konto3.js` | Konten, Anmeldung, verschlüsselter Tresor |
| `team.js` | Gemeinsamer Bereich: verschlüsselte Schülerdossiers, Rechte, Einsatzpläne |
| `arbeit.js`, `arbeit.css` | Oberfläche: Schülerliste, Dossier (Überblick, Fiche, Entwicklung & Ziele …), Einsatzplan, Team, Verwaltung |
| `fiche.js` + `fiche/vorlage.docx` | Fiche de renseignement lesen (Upload) und ausfüllen (Download); die leere Vorlage wird beim Bauen eingebettet |
| `datenbank.js`, `datenbank.css` | Datenbank-Bereich (nur Responsables und Verwaltung) – optional |

Bauen: `python3 hub-quellen/baue-hub.py` → schreibt `hub.html` (anderes Ziel: Umgebungsvariable `CDSE_HUB_ZIEL`).

Tests (Playwright, Chromium) liegen in `tests/`; sie erwarten einen Webserver auf Port 8099, der den Hauptordner ausliefert
(`npx http-server . -p 8099 -s`), und legen nur erfundene Personen an.
