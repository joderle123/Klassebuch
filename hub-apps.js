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
     symbol        eingebautes Liniensymbol: buch, test, ziel, werkzeug,
                   wissen, web oder app
     icon          statt symbol: ein Emoji (Windows-Taste + Punkt)
     farbe         Erkennungsfarbe der App als #rrggbb — ruhige, gedeckte
                   Töne passen am besten (z. B. #3F5AA6, #B4533A, #1F6B6F)
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
     teams         (optional) welche Teams die App sehen, z. B.
                   ['diagnostique']. Fehlt das Feld, sehen sie alle.
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
  untertitel: 'Gemeinsame Anlaufstelle',
  sperreNachMinuten: 60        /* ohne Aktivität: Hub sperrt, Passwort nötig */
};

/* Teams im CDSE. Beim Erstellen eines Kontos wählt man sein Team.
   Bei jeder App legt das Feld "teams" fest, wer sie sieht.
   Hinweis: Ohne Server ist das eine ANZEIGE-Regel. Eine echte Sperre
   (z. B. für das Screening) setzt die IT über die Ordnerrechte auf O:\.
     stelle: false   Team begleitet keine Schüler (erscheint nicht als
                     „Stelle“ eines Dossiers, z. B. Direction)
     alleApps: true  sieht alle Apps, auch solche mit "teams" */
window.CDSE_TEAMS = [
  { id: 'annexe',       name: 'Annexe Junglinster',         farbe: '#3F5AA6' },
  { id: 'isa',          name: 'ISA',                        farbe: '#1F6B6F' },
  { id: 'diagnostique', name: 'Diagnostique',               farbe: '#B4533A' },
  { id: 'cp',           name: 'Classes de participation',   farbe: '#A8741A' },
  { id: 'cst',          name: 'CST',                        farbe: '#6E4A7E' },
  { id: 'reeducation',  name: 'Rééducation & Ateliers',     farbe: '#8A5A2B' },
  { id: 'social',       name: 'Service social',             farbe: '#4F7A3A' },
  { id: 'direction',    name: 'Direction & Administration', farbe: '#4A5468', stelle: false, alleApps: true }
];

window.CDSE_APPS = [

  {
    id: 'klassenbuch',
    name: 'Klassenbuch',
    beschreibung: 'Für die Arbeit im Team: Schüler, Réunionen, Anwesenheit, Dossiers, Noten und Stundenplan.',
    symbol: 'buch',
    farbe: '#3F5AA6',
    bereich: 'Klasse & Schüler',
    datei: 'apps/klassenbuch.html',
    dateizugriff: true,
    teams: ['annexe', 'cp', 'cst'],
    /* Testversion: gebaut aus klassenbuch/quellen (node klassenbuch/quellen/build-merged.cjs). Die Quelle
       zeigt auf die eigene, gepushte Datei – so bleibt der Stand auf der Kachel richtig, und der
       Galileo-Stand (claude/focused-galileo-e2s63b) überschreibt die Testversion nicht. */
    quelle: { repo: 'Klassebuch', branch: 'claude/wizardly-bohr-99r7kg', pfad: 'apps/klassenbuch.html' },
    stichworte: 'anwesenheit absenzen dossier réunion protokoll noten stundenplan schuljahr trimester team'
  },

  {
    id: 'journal',
    name: 'Journal',
    beschreibung: 'Das Klassenbuch für die Einzelarbeit: Mein Tag, Terminplan, eigene Schüler und Notizen.',
    symbol: 'buch',
    farbe: '#3F5AA6',
    bereich: 'Klasse & Schüler',
    datei: 'apps/journal.html',
    dateizugriff: true,
    teams: ['isa', 'diagnostique'],
    quelle: { repo: 'Klassebuch', branch: 'claude/focused-galileo-e2s63b', pfad: 'isa.html' },
    stichworte: 'isa journal mein tag terminplan agenda notizen schüler dossier'
  },

  {
    id: 'screening',
    name: 'Befundbericht',
    beschreibung: 'Ergebnisse aus 13 Tests und Fragebögen eingeben (u. a. WISC-V, KABC-II, SDQ, CBCL, Conners 3, DISYPS-III) — fertiger Befundbericht auf Deutsch, Französisch oder Englisch, als Word-Datei oder PDF.',
    symbol: 'test',
    farbe: '#B4533A',
    bereich: 'Diagnostik & Förderung',
    datei: 'apps/screening.html',
    teams: ['diagnostique'],
    quelle: { repo: 'PEI-and-Compl-ment-', branch: 'claude/wizardly-bohr-99r7kg', pfad: 'diagnostic-tool/index.html' },
    stichworte: 'screening testing test auswertung befund bericht diagnostik sdq cbcl trf ysr conners disyps afs dikj feel-kj wisc kabc cft son-r d2 vineland fragebogen word'
  },

  {
    id: 'eldib',
    name: 'ELDiB-Generator',
    beschreibung: 'ELDiB-Einschätzung erfassen, den DS Schritt für Schritt mit Aussagen 1–7 durchklicken und PEI, Complément und DS als fertiges Word-Dokument erzeugen — auf Deutsch, Französisch oder Englisch.',
    symbol: 'ziel',
    farbe: '#1F6B6F',
    bereich: 'Diagnostik & Förderung',
    datei: 'apps/eldib-generator.html',
    quelle: { repo: 'Eldib-Pleni-re', branch: 'claude/wizardly-bohr-99r7kg', pfad: 'app/eldib-generator.html',
              zusatz: [{ pfad: 'app/ds-motor.js', datei: 'apps/ds-motor.js' }] },
    stichworte: 'eldib pei complément complement ds diagnostic spécialisé förderplan förderziele bericht word dtorf anamnese'
  },

  {
    id: 'toolbox',
    name: 'Toolbox',
    beschreibung: '125 professionelle Arbeitsblätter (Spielschule bis Sekundarschule, mit Seite für die Lehrperson), über 600 Materialien, Team-Material zum Hochladen und gemeinsame Bewertungen – nach Cycle und ELDiB-Ziel filtern, als PDF drucken.',
    symbol: 'werkzeug',
    farbe: '#A8741A',
    bereich: 'Materialien',
    datei: 'apps/toolbox.html',
    dateizugriff: true,
    quelle: { repo: 'ISA-APP', branch: 'claude/wizardly-bohr-99r7kg', pfad: 'offline/ISA-App.html',
              zusatz: [{ pfad: 'offline/toolbox-index.js', datei: 'apps/toolbox-index.js' }] },
    stichworte: 'isa material bibliothek arbeitsblatt arbeitsblätter finder suche ablage eldib ziel pdf'
  },

  {
    id: 'lernen',
    name: 'Lernen',
    beschreibung: 'Fachwissen für den Alltag: Lernmodule zu Entwicklung, Störungsbildern, Persönlichkeit und wirksamem Handeln – mit Fallbeispielen, Quiz und Lernkartei. Der Lernstand ist privat.',
    symbol: 'wissen',
    farbe: '#2E3A9C',
    bereich: 'Wissen & Lernen',
    datei: 'apps/lernen.html',
    stichworte: 'lernen fortbildung weiterbildung wissen grundlagen modul quiz lernkartei glossar adhs autismus trauma angst depression bindung deeskalation eltern kinderschutz'
  },

  /* ---------- Vorübergehend ausgeblendet: zum Einblenden die Kommentarzeichen
                am Anfang und am Ende dieses Blocks entfernen ----------
  {
    id: 'savoir',
    name: 'SAVOIR',
    beschreibung: 'Klinisches Wissen — Nachschlagewerk zu Diagnosen, Methoden und Hintergründen.',
    symbol: 'wissen',
    farbe: '#6E4A7E',
    bereich: 'Wissen & Materialien',
    datei: 'SAVOIR.html'
  },
  {
    id: 'paedpath',
    name: 'PaedPath',
    beschreibung: 'Entwicklungsdiagnostik: Motorik, Wahrnehmung, Testverfahren und Berichte.',
    symbol: 'test',
    farbe: '#3D5A8A',
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
    symbol: 'app',
    farbe: '#8A5A2B',
    bereich: 'Team & Organisation',
    datei: 'apps/meine-app.html'
  },
  ------------------------------------------------------------------------------ */

  /* ---------- VORLAGE für eine Webseite (öffnet in neuem Tab) ----------
  {
    id: 'schulportal',
    name: 'Schulportal',
    beschreibung: 'Online-Dienst des Ministeriums.',
    symbol: 'web',
    farbe: '#3D5A8A',
    bereich: 'Team & Organisation',
    link: 'https://www.beispiel.lu'
  },
  ---------------------------------------------------------------------- */

];
