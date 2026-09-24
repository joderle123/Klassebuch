/* =====================================================================
   CDSE Hub — App-Verzeichnis
   ---------------------------------------------------------------------
   Das ist die EINZIGE Datei, die du ändern musst, um eine App
   hinzuzufügen. Die Apps selbst bleiben unverändert.

   In 3 Schritten:
     1. App-Datei in den Ordner apps/ legen
     2. Unten den VORLAGE-Block kopieren, Werte anpassen
     3. hub.html mit Strg+F5 neu laden

   Die ausführliche Anleitung steht im Hub unter „＋ App hinzufügen".

   Felder:
     id            kurzer Name ohne Leerzeichen, z. B. 'screening'
     name          Anzeigename
     beschreibung  ein Satz: wofür ist die App gut?
     icon          ein Emoji (Windows-Taste + Punkt)
     farbe         Akzentfarbe der Kachel als #rrggbb
     bereich       Gruppe im Menü — gleicher Bereich = steht zusammen
     datei         Pfad zur App-Datei, relativ zu hub.html
     link          STATT datei: Adresse einer Webseite (öffnet neuen Tab)
     dateizugriff  true, wenn die App Edges Datei-/Ordnerauswahl braucht
                   (Team-Datei auf O:\, Sicherungen, Team-Ablage). Edge
                   verbietet das in eingebetteten Seiten — der Hub öffnet
                   solche Apps deshalb in einem eigenen Tab.
     quelle        woher die neueste Version kommt (GitHub-Repository,
                   Branch, Pfad). Wird von update-apps.cjs benutzt, um die
                   App auf den neuesten Stand zu holen.
     hinweis       (optional) kurzer Hinweis auf der Kachel
     stichworte    (optional) zusätzliche Suchbegriffe

   Eine App ohne datei und ohne link erscheint als „geplant".

   HÄUFIGSTER FEHLER: das Komma nach der schließenden } vergessen.
   Keine Sorge — der Hub zeigt dir dann eine Warnung, statt leer zu
   bleiben. Die genaue Zeile siehst du in Edge mit F12 → Reiter
   „Konsole" (z. B. hub-apps.js:63 — Fehler in dieser Zeile oder davor).
   ===================================================================== */

/* Name und Untertitel des Hubs (oben links in der Seitenleiste) */
window.CDSE_HUB = {
  titel: 'CDSE Hub',
  untertitel: 'Gemeinsame Anlaufstelle'
};

window.CDSE_APPS = [

  {
    id: 'klassenbuch',
    name: 'Klassenbuch',
    beschreibung: 'Schüler, Réunionen, Anwesenheit, Dossiers, Noten und Stundenplan — nach Schuljahr und Trimester.',
    icon: '📘',
    farbe: '#4f5bd5',
    bereich: 'Klasse & Schüler',
    datei: 'apps/klassenbuch.html',
    dateizugriff: true,
    quelle: { repo: 'Klassebuch', branch: 'claude/focused-galileo-e2s63b', pfad: 'index.html' },
    stichworte: 'anwesenheit absenzen dossier réunion protokoll noten stundenplan schuljahr trimester team'
  },

  {
    id: 'screening',
    name: 'Screening',
    beschreibung: 'CDSE-Testing Tool: SDQ, WISC-V, DISYPS-III, AFS, d2-R und Conners auswerten — Bericht auf Deutsch, Französisch oder Englisch.',
    icon: '🧪',
    farbe: '#c0562d',
    bereich: 'Diagnostik & Förderung',
    datei: 'apps/screening.html',
    quelle: { repo: 'PEI-and-Compl-ment-', branch: 'claude/fix-conners-scoring-ya2JP', pfad: 'diagnostic-tool/index.html' },
    stichworte: 'testing test auswertung sdq wisc disyps afs d2 conners fragebogen'
  },

  {
    id: 'eldib',
    name: 'ELDiB-Generator',
    beschreibung: 'ELDiB-Einschätzung erfassen und daraus PEI, Complément und DS als Word erzeugen — auf Deutsch, Französisch oder Englisch.',
    icon: '🎯',
    farbe: '#0f9d8a',
    bereich: 'Diagnostik & Förderung',
    datei: 'apps/eldib-generator.html',
    quelle: { repo: 'Eldib-Pleni-re', branch: 'claude/eldib-tool-analysis-LzdyL', pfad: 'app/New-PEI-Dok-claude-update-pei-document-JPvE4/index.html' },
    stichworte: 'eldib pei complément complement ds förderplan förderziele bericht word dtorf'
  },

  {
    id: 'toolbox',
    name: 'Toolbox',
    beschreibung: 'ISA-App: Material-Bibliothek mit Arbeitsblättern, Offline-Suche und Team-Ablage für PDF- und Word-Dateien.',
    icon: '🧰',
    farbe: '#b8892d',
    bereich: 'Materialien',
    datei: 'apps/toolbox.html',
    dateizugriff: true,
    quelle: { repo: 'ISA-APP', branch: 'claude/elegant-darwin-2317k6', pfad: 'offline/ISA-App.html' },
    stichworte: 'isa material bibliothek arbeitsblatt arbeitsblätter finder suche ablage'
  },

  /* ---------- Vorübergehend ausgeblendet: zum Einblenden die Kommentarzeichen
                am Anfang und am Ende dieses Blocks entfernen ----------
  {
    id: 'savoir',
    name: 'SAVOIR',
    beschreibung: 'Klinisches Wissen — Nachschlagewerk zu Diagnosen, Methoden und Hintergründen.',
    icon: '📚',
    farbe: '#7a52b3',
    bereich: 'Wissen & Materialien',
    datei: 'SAVOIR.html'
  },
  {
    id: 'paedpath',
    name: 'PaedPath',
    beschreibung: 'Entwicklungsdiagnostik: Motorik, Wahrnehmung, Testverfahren und Berichte.',
    icon: '🩺',
    farbe: '#2f6fb0',
    bereich: 'Diagnostik & Förderung',
    datei: null,
    hinweis: 'React-App — muss einmal als Einzeldatei gebaut werden (Anleitung: Weg B).'
  },
  ------------------------------------------------------------------------------------- */

  /* ---------- VORLAGE: kopieren, Kommentarzeichen entfernen, anpassen ----------
  {
    id: 'meine-app',
    name: 'Meine App',
    beschreibung: 'Wofür die App gut ist — ein Satz.',
    icon: '🧩',
    farbe: '#c0562d',
    bereich: 'Team & Organisation',
    datei: 'apps/meine-app.html'
  },
  ------------------------------------------------------------------------------ */

  /* ---------- VORLAGE für eine Webseite (öffnet in neuem Tab) ----------
  {
    id: 'schulportal',
    name: 'Schulportal',
    beschreibung: 'Online-Dienst des Ministeriums.',
    icon: '🌐',
    farbe: '#2f6fb0',
    bereich: 'Team & Organisation',
    link: 'https://www.beispiel.lu'
  },
  ---------------------------------------------------------------------- */

];
