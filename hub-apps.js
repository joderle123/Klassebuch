/* =====================================================================
   Hub der Annexe Junglinster — App-Verzeichnis
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
     teams         (entfällt hier: es gibt nur das Team der Annexe)
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
  titel: 'Annexe Junglinster',
  untertitel: 'Hub des Teams',
  sperreNachMinuten: 60        /* ohne Aktivität: Hub sperrt, Passwort nötig */
};

/* Diese Fassung des Hubs gehört nur dem Team der Annexe Junglinster.
   Es gibt deshalb genau ein Team; beim Erstellen eines Kontos ist es
   schon gewählt. (Das Feld "teams" bei den Apps entfällt: alle sehen alles.) */
window.CDSE_TEAMS = [
  { id: 'annexe', name: 'Annexe Junglinster', farbe: '#3F5AA6' }
];

window.CDSE_APPS = [

  {
    id: 'klassenbuch',
    name: 'Klassenbuch',
    beschreibung: 'Heute, Anwesenheit, Réunionen, Schüler und Dossiers, Noten, Stundenplan und Schuljahr der Annexe.',
    symbol: 'buch',
    farbe: '#3F5AA6',
    bereich: 'Klasse & Schüler',
    datei: 'apps/klassenbuch.html',
    dateizugriff: true,
    /* Gebaut aus klassenbuch/quellen (node klassenbuch/quellen/build-merged.cjs) – mit allen Daten
       und Einstellungen der Annexe. */
    quelle: { repo: 'Klassebuch', branch: 'claude/focused-galileo-e2s63b', pfad: 'apps/klassenbuch.html' },
    stichworte: 'anwesenheit absenzen dossier réunion protokoll noten stundenplan schuljahr trimester team'
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
    beschreibung: '287 professionelle Arbeitsblätter (Spielschule bis Sekundarschule, mit Seite für die Lehrperson), über 600 Materialien, Team-Material zum Hochladen und gemeinsame Bewertungen – nach Cycle und ELDiB-Ziel filtern, als PDF drucken.',
    symbol: 'werkzeug',
    farbe: '#A8741A',
    bereich: 'Materialien',
    datei: 'apps/toolbox.html',
    dateizugriff: true,
    quelle: { repo: 'ISA-APP', branch: 'claude/wizardly-bohr-99r7kg', pfad: 'offline/ISA-App.html',
              zusatz: [{ pfad: 'offline/toolbox-index.js', datei: 'apps/toolbox-index.js' }] },
    stichworte: 'material bibliothek arbeitsblatt arbeitsblätter finder suche ablage eldib ziel pdf'
  },

  {
    id: 'skills-kurs',
    name: 'Skills-Kurs',
    beschreibung: 'Skills-Unterricht für Kleingruppen von 12 bis 16 Jahren: drei Kursjahre mit 100 Einheiten und 17 Jokern, jede mit Ablauf in Minuten, Anleitung mit Beispielsätzen, Material zum Abhaken und insgesamt 158 Schülerblättern. Die nächste Einheit der Gruppe steht immer oben.',
    symbol: 'ziel',
    farbe: '#6E4A7E',
    bereich: 'Materialien',
    datei: 'apps/toolbox.html#kurs',
    dateizugriff: true,
    stichworte: 'skills kurs unterricht einheit gruppe gefühle anspannung dbt jugendliche training stunde lektion gefühlsrad'
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

  {
    id: 'pathologien',
    name: 'Pathologien',
    beschreibung: 'Klinisches Nachschlagewerk: 13 Krankheitsbilder mit Submustern – was man sieht, Risiko, Therapieansatz, Phasen und Strategien für die Schule.',
    symbol: 'wissen',
    farbe: '#6E4A7E',
    bereich: 'Wissen & Lernen',
    datei: 'apps/pathologien.html',
    stichworte: 'savoir pathologie krankheitsbild störungsbild submuster adhs autismus depression angst trauma sucht borderline'
  },

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
