/* =====================================================================
   CDSE Hub — Screening: der Beobachtungsbogen (Inhalt)
   ---------------------------------------------------------------------
   Eine strukturierte Beobachtung durch Fachkräfte – KEIN Test, keine
   Normwerte, keine Diagnose. Der Bogen hilft, gezielt hinzuschauen:
   Wo braucht das Kind Unterstützung, wo liegen seine Stärken, was ist
   der nächste sinnvolle Schritt?
   Grundlagen (siehe QUELLEN): Die Bereiche folgen den in Forschung und
   Praxis etablierten Dimensionen kindlicher Schwierigkeiten (Aufmerksam-
   keit/Aktivität, internalisierend, externalisierend, soziale Beziehungen,
   Lernen, Sprache, Motorik), ergänzt um Stärken, die Beeinträchtigung im
   Alltag und Warnsignale. Alle Aussagen sind eigene Formulierungen –
   nichts ist aus geschützten Fragebögen übernommen.
   Stufen: C1 = Précoce und Cycle 1 (3–5 Jahre), GS = Cycle 2–4
   (6–11 Jahre), ES = Sekundarschule (ab 12 Jahren). Ein Item gilt für
   alle Stufen, außer es hat „nur“; Texte je Stufe überschreiben „text“.
   ===================================================================== */
window.CDSE_SCREENING_BOGEN = {
  version: 1,
  titel: 'Beobachtungsbogen sozial-emotionale Entwicklung',
  zeitraum: 'in den letzten vier Wochen',
  skala: [
    { w: 0, t: 'nie' },
    { w: 1, t: 'manchmal' },
    { w: 2, t: 'oft' },
    { w: 3, t: 'sehr oft' }
  ],
  stufen: [
    { id: 'C1', name: 'Précoce und Cycle 1', alter: '3–5 Jahre' },
    { id: 'GS', name: 'Cycle 2–4', alter: '6–11 Jahre' },
    { id: 'ES', name: 'Sekundarschule', alter: 'ab 12 Jahren' }
  ],
  rollen: [
    ['lehrkraft', 'Lehrkraft'], ['educ', 'Éducateur/Éducatrice'], ['isa', 'ISA'], ['diagnostique', 'Diagnostique'],
    ['therapie', 'Therapie/Rééducation'], ['eltern', 'Eltern (im Gespräch erfragt)'], ['andere', 'andere Fachkraft']
  ],

  bereiche: [
    {
      id: 'aufmerksamkeit', name: 'Aufmerksamkeit & Ausdauer', farbe: '#2E3A9C',
      hinweis: 'Ob das Kind bei einer Sache bleiben, Wichtiges beachten und Aufgaben zu Ende bringen kann.',
      items: [
        { id: 'a1', text: 'Verliert bei Aufgaben schnell den Faden und braucht Hilfe, um wieder einzusteigen.', C1: 'Bleibt nur kurz bei einem Spiel oder einer Aufgabe und wechselt dann zur nächsten.' },
        { id: 'a2', text: 'Lässt sich von Geräuschen, Bewegungen oder Gegenständen in der Nähe ablenken.' },
        { id: 'a3', text: 'Wirkt, als höre es nicht zu, wenn man es direkt anspricht.' },
        { id: 'a4', text: 'Macht Flüchtigkeitsfehler oder übersieht Einzelheiten, obwohl es die Aufgabe eigentlich kann.', C1: 'Übersieht beim Spielen und Basteln Einzelheiten, die es eigentlich kennt.' },
        { id: 'a5', text: 'Beginnt Aufgaben, bringt sie aber ohne Unterstützung nicht zu Ende.', C1: 'Beginnt Spiele oder Bastelarbeiten, beendet sie aber selten.' },
        { id: 'a6', text: 'Vergisst Absprachen, Material oder mehrteilige Anweisungen.', C1: 'Vergisst mehrteilige Anweisungen (z. B. „Hol die Schere und setz dich an den Tisch“).' }
      ],
      schritte: [
        'Aufgaben in kleine, sichtbare Schritte teilen (Checkliste, Zeitanzeige, ein Arbeitsblatt nach dem anderen).',
        'Vor Anweisungen Blickkontakt herstellen, kurz formulieren und wiederholen lassen.',
        'Reizarmen Arbeitsplatz anbieten und kurze Bewegungspausen fest einplanen.'
      ],
      abklaeren: ['Seh- und Hörvermögen prüfen lassen (Dépistage).', 'Bei deutlicher Ausprägung in mehreren Situationen über längere Zeit: Diagnostique einbeziehen.'],
      eldib: ['V-3', 'V-13', 'V-15', 'KOG-2', 'KOG-3'],
      toolbox: ['konzentrations-tricks', 'bin-ich-bei-der-sache', 'fokus', 'schritt-fuer-schritt', 'arbeitsplatz-check'],
      lernen: ['adhs', 'lernen-verhalten']
    },
    {
      id: 'unruhe', name: 'Unruhe & Impulsivität', farbe: '#8A6414',
      hinweis: 'Ob das Kind still sitzen, warten und erst denken, dann handeln kann.',
      items: [
        { id: 'u1', text: 'Zappelt, rutscht auf dem Stuhl hin und her oder spielt ständig mit Gegenständen.' },
        { id: 'u2', text: 'Steht auf oder verlässt den Platz, wenn Sitzen erwartet wird.', C1: 'Steht im Stuhlkreis oder beim Essen auf, wenn Sitzen erwartet wird.', ES: 'Verlässt Platz oder Raum, wenn Sitzen erwartet wird, oder wirkt innerlich getrieben.' },
        { id: 'u3', text: 'Platzt mit Antworten oder Bemerkungen heraus, bevor eine Frage fertig gestellt ist.' },
        { id: 'u4', text: 'Kann schwer warten, bis es an der Reihe ist.' },
        { id: 'u5', text: 'Unterbricht andere oder mischt sich in Gespräche und Spiele ein.' },
        { id: 'u6', text: 'Handelt, ohne an die Folgen zu denken (rennt los, greift zu, klettert).', ES: 'Handelt, ohne an die Folgen zu denken, auch wenn es riskant wird.' }
      ],
      schritte: [
        'Bewegung erlauben, statt sie zu bekämpfen: Botengänge, Stehplatz, Knetball, feste Bewegungspausen.',
        'Warten sichtbar machen (Reihenfolge an der Tafel, Sanduhr) und gelungenes Warten sofort anerkennen.',
        'Ein vereinbartes Stopp-Signal einüben, bevor es brenzlig wird – nicht erst im Konflikt.'
      ],
      abklaeren: ['Bei Unruhe in mehreren Situationen seit über sechs Monaten: Diagnostique einbeziehen.', 'Schlaf und Tagesstruktur mit den Eltern besprechen.'],
      eldib: ['V-10', 'V-11', 'V-20', 'V-21', 'SOZ-19'],
      toolbox: ['meine-stopp-hand', 'ampel-im-kopf', 'stopp-denken-handeln', 'ich-brauche-eine-pause', 'signalkarten'],
      lernen: ['adhs', 'verstaerkung']
    },
    {
      id: 'angst', name: 'Ängste & Sorgen', farbe: '#1F6B6F',
      hinweis: 'Ob Angst und Sorgen das Kind stärker einschränken, als es in seinem Alter üblich ist.',
      items: [
        { id: 'g1', text: 'Wirkt angespannt, nervös oder schreckhaft.' },
        { id: 'g2', text: 'Macht sich viele Sorgen, auch um Dinge, die unwahrscheinlich sind.', C1: 'Fragt immer wieder nach, ob etwas Schlimmes passiert (z. B. ob die Eltern wirklich kommen).' },
        { id: 'g3', text: 'Vermeidet Situationen, vor denen es Angst hat (z. B. vor der Klasse sprechen, Neues ausprobieren).' },
        { id: 'g4', text: 'Klagt vor Prüfungen, Ausflügen oder Veränderungen über Bauch- oder Kopfweh.', C1: 'Klagt vor Veränderungen oder Neuem über Bauchweh oder möchte nach Hause.' },
        { id: 'g5', text: 'Braucht deutlich mehr Rückversicherung und Zuspruch als Gleichaltrige.' },
        { id: 'g6', text: 'Hat Angst, Fehler zu machen, und traut sich deshalb wenig zu.', C1: 'Trennt sich schwer von Bezugspersonen oder ist ohne sie sehr beunruhigt.' }
      ],
      schritte: [
        'Angst ernst nehmen, ohne auszuweichen: kleine, machbare Schritte statt Vermeidung (Mut-Leiter).',
        'Vorhersehbarkeit schaffen: Veränderungen früh ankündigen, eine feste Ansprechperson benennen.',
        'Kurze Beruhigungstechniken üben, wenn das Kind ruhig ist – nicht erst in der Angst.'
      ],
      abklaeren: ['Wenn das Kind der Schule fernbleibt oder vieles vermeidet: zeitnah mit Eltern, Leitung und Diagnostique sprechen.'],
      eldib: ['V-24', 'V-23', 'K-26', 'SOZ-9'],
      toolbox: ['ich-kann-mutig-sein', 'was-hilft-bei-angst', 'mut-leiter', 'angst-verstehen', 'pruefungsangst'],
      lernen: ['angst', 'schulvermeidung']
    },
    {
      id: 'stimmung', name: 'Stimmung & Rückzug', farbe: '#6E4A7E',
      hinweis: 'Ob das Kind über längere Zeit bedrückt, lustlos oder zurückgezogen wirkt.',
      items: [
        { id: 's1', text: 'Wirkt traurig, niedergeschlagen oder bedrückt.' },
        { id: 's2', text: 'Hat an Dingen, die ihm früher Freude gemacht haben, weniger Interesse.', C1: 'Spielt weniger oder mit weniger Freude als früher.' },
        { id: 's3', text: 'Zieht sich von anderen zurück oder bleibt lieber allein.' },
        { id: 's4', text: 'Wirkt müde, antriebslos oder erschöpft.' },
        { id: 's5', text: 'Spricht abwertend über sich selbst (z. B. „Ich kann nichts“, „Ich bin dumm“).' },
        { id: 's6', text: 'Ist gereizt oder den Tränen nahe, ohne erkennbaren Anlass.' }
      ],
      schritte: [
        'Beziehung anbieten: täglich kurz und verlässlich nachfragen, ohne zu drängen.',
        'Kleine Erfolgserlebnisse ermöglichen und benennen; Aufgaben so zuschneiden, dass sie gelingen können.',
        'Veränderungen im Verhalten datiert festhalten und mit den Eltern besprechen.'
      ],
      abklaeren: ['Bei anhaltender Niedergeschlagenheit über mehr als zwei Wochen: Eltern, Leitung und Diagnostique einbeziehen, ärztliche Abklärung anregen.', 'Bei jeder Äußerung über Tod oder Selbstverletzung: Warnsignale beachten und sofort handeln.'],
      eldib: ['K-26', 'K-18', 'K-19', 'SOZ-12'],
      toolbox: ['wenn-ich-traurig-bin', 'trost-koffer', 'wenn-es-laenger-schwer-ist', 'drei-gute-dinge', 'das-macht-mich-froh'],
      lernen: ['depression', 'selbstverletzung-suizid']
    },
    {
      id: 'regulation', name: 'Gefühle regulieren', farbe: '#A33B5B',
      hinweis: 'Wie das Kind mit starken Gefühlen wie Wut, Frust oder Enttäuschung umgeht.',
      items: [
        { id: 'r1', text: 'Gerät bei kleinen Frustrationen stark aus der Fassung.' },
        { id: 'r2', text: 'Hat Wutausbrüche, die länger dauern oder heftiger sind als bei Gleichaltrigen.' },
        { id: 'r3', text: 'Braucht lange, um sich nach Aufregung wieder zu beruhigen.' },
        { id: 'r4', text: 'Reagiert auf Kritik oder Grenzen mit sehr starken Gefühlen (Weinen, Schreien, Weglaufen).' },
        { id: 'r5', text: 'Kann Hilfe zur Beruhigung schwer annehmen.' },
        { id: 'r6', text: 'Die Stimmung schlägt schnell und schwer vorhersehbar um.' }
      ],
      schritte: [
        'Frühe Anzeichen gemeinsam kennenlernen (Körper, Gedanken) und einen Beruhigungsort vereinbaren.',
        'In der Situation: wenig reden, ruhig bleiben, Sicherheit geben – besprechen erst, wenn das Kind wieder ruhig ist.',
        'Beruhigungsstrategien regelmäßig üben und gelungene Selbstregulation anerkennen.'
      ],
      abklaeren: ['Bei häufigen, heftigen Ausbrüchen: Deeskalationsplan im Team erstellen; Diagnostique einbeziehen.'],
      eldib: ['V-21', 'V-18', 'V-23', 'K-16', 'K-26'],
      toolbox: ['wutvulkan', 'wut-thermometer', 'ballon-atmen', 'ruhig-werden-drei-uebungen', 'stress-werkzeugkoffer'],
      lernen: ['emotionsregulation', 'deeskalation', 'stress-gehirn']
    },
    {
      id: 'verhalten', name: 'Regeln & Konflikte', farbe: '#B4533A',
      hinweis: 'Ob das Kind Regeln und Grenzen annehmen und Konflikte ohne Gewalt austragen kann.',
      items: [
        { id: 'v1', text: 'Widersetzt sich Aufforderungen von Erwachsenen.' },
        { id: 'v2', text: 'Streitet mit Erwachsenen oder diskutiert Anweisungen immer wieder.' },
        { id: 'v3', text: 'Ärgert oder provoziert andere absichtlich.' },
        { id: 'v4', text: 'Wird körperlich aggressiv (schlägt, tritt, beißt, wirft Gegenstände nach anderen).' },
        { id: 'v5', text: 'Beschädigt Material oder Dinge anderer.' },
        { id: 'v6', text: 'Schiebt die Verantwortung für eigenes Verhalten auf andere.' },
        { id: 'v7', text: 'Übertritt wichtige Regeln (z. B. schwänzt, lügt, um Vorteile zu haben, nimmt Dinge anderer weg).', nur: ['GS', 'ES'] }
      ],
      schritte: [
        'Wenige, klare Regeln positiv formulieren, sichtbar machen und konsequent, aber ruhig einfordern.',
        'Erwünschtes Verhalten fünfmal häufiger bemerken als unerwünschtes; Machtkämpfe vermeiden.',
        'Nach Konflikten Wiedergutmachung statt nur Strafe; Muster (wann, wo, mit wem) beobachten.'
      ],
      abklaeren: ['Bei Gewalt gegen andere oder häufigen schweren Regelverstößen: Leitung und Diagnostique einbeziehen, Eltern früh beteiligen.'],
      eldib: ['V-16', 'V-17', 'V-26', 'V-27', 'SOZ-27'],
      toolbox: ['regeln-in-bildern', 'klassenvereinbarung', 'was-ist-passiert', 'verantwortung-uebernehmen', 'punkteplan'],
      lernen: ['oppositionell-aggressiv', 'neue-autoritaet', 'verstaerkung']
    },
    {
      id: 'sozial', name: 'Miteinander & Kontakt', farbe: '#1F6B6F',
      hinweis: 'Wie das Kind Kontakt aufnimmt, mitspielt, Freundschaften hält und andere versteht.',
      items: [
        { id: 'm1', text: 'Hat Schwierigkeiten, Kontakt zu Gleichaltrigen aufzunehmen oder zu halten.' },
        { id: 'm2', text: 'Wird von anderen Kindern gemieden, ausgelacht oder ausgeschlossen.', ES: 'Wird von Mitschülerinnen und Mitschülern gemieden, ausgelacht oder ausgeschlossen – auch online.' },
        { id: 'm3', text: 'Spielt oder arbeitet in Gruppen schwer mit (abwechseln, teilen, Absprachen einhalten).' },
        { id: 'm4', text: 'Versteht Andeutungen, Witze oder die Gefühle anderer schwer.' },
        { id: 'm5', text: 'Kommt mit Erwachsenen deutlich besser zurecht als mit Gleichaltrigen.' },
        { id: 'm6', text: 'Hält sehr stark an Abläufen fest oder hat ungewöhnlich eingeengte, intensive Interessen.' }
      ],
      schritte: [
        'Kontakt strukturiert ermöglichen: feste Partnerin/fester Partner, Spiele mit klaren Regeln und Rollen.',
        'Soziale Situationen vorher besprechen und nachher gemeinsam auswerten.',
        'Bei Ausgrenzung oder Mobbing sofort eingreifen und die Klasse einbeziehen.'
      ],
      abklaeren: ['Bei deutlichen Schwierigkeiten im Verstehen sozialer Situationen zusammen mit starren Mustern: Diagnostique einbeziehen.'],
      eldib: ['SOZ-15', 'SOZ-17', 'SOZ-18', 'SOZ-37', 'K-21'],
      toolbox: ['was-machen-freunde', 'ich-bin-dran-du-bist-dran', 'gut-zusammenarbeiten', 'in-den-schuhen-des-anderen', 'konflikt-bruecke'],
      lernen: ['autismus', 'bindung', 'mentalisieren']
    },
    {
      id: 'lernen', name: 'Lernen & Arbeitsorganisation', farbe: '#3F6E3A',
      hinweis: 'Wie das Kind Aufgaben angeht, dranbleibt und sich organisiert.',
      items: [
        { id: 'l1', text: 'Braucht für den Einstieg in Aufgaben viel Anschub.' },
        { id: 'l2', text: 'Arbeitet deutlich langsamer oder unorganisierter als Gleichaltrige.' },
        { id: 'l3', text: 'Gibt schnell auf, wenn etwas nicht sofort klappt.' },
        { id: 'l4', text: 'Hat Mühe, Material und Arbeitsplatz in Ordnung zu halten.', C1: 'Findet sich bei Aufräumen und festen Abläufen im Gruppenraum schlecht zurecht.' },
        { id: 'l5', text: 'Hat trotz Anstrengung deutliche Schwierigkeiten beim Lesen, Schreiben oder Rechnen.', nur: ['GS', 'ES'] },
        { id: 'l6', text: 'Kann Gelerntes schlecht behalten oder abrufen.', C1: 'Lernt neue Lieder, Reime oder Spielregeln deutlich langsamer als andere.' },
        { id: 'l7', text: 'Plant und organisiert Hausaufgaben, Termine und Projekte kaum selbstständig.', nur: ['ES'] }
      ],
      schritte: [
        'Arbeitsschritte und Zeit sichtbar machen; mit dem Kind einen realistischen Plan vereinbaren.',
        'Anstrengung und Strategien loben, nicht nur Ergebnisse; Fehler als Lernschritt behandeln.',
        'Lern- und Arbeitsmaterial ordnen (Farben, feste Plätze) und die Ordnung gemeinsam üben.'
      ],
      abklaeren: ['Bei deutlichen Schwierigkeiten im Lesen, Schreiben oder Rechnen trotz Förderung: Diagnostique einbeziehen.', 'Seh- und Hörvermögen prüfen lassen.'],
      eldib: ['V-15', 'V-22', 'V-25', 'V-32', 'KOG-3'],
      toolbox: ['aufschieben-ueberlisten', 'schritt-fuer-schritt', 'hausaufgabenplan', 'fehler-sind-helfer', 'die-woche-im-griff'],
      lernen: ['lernstoerungen', 'intelligenz', 'lernen-verhalten']
    },
    {
      id: 'sprache', name: 'Sprache & Verständigung', farbe: '#2E6C9C',
      hinweis: 'Mehrsprachige Kinder: Schwierigkeiten zählen nur, wenn sie auch in der stärksten Sprache auftreten – im Zweifel die Eltern fragen.',
      items: [
        { id: 'k1', text: 'Wird von Fremden schwer verstanden (Aussprache).', nur: ['C1', 'GS'] },
        { id: 'k2', text: 'Findet Wörter schwer oder spricht in auffällig kurzen, einfachen Sätzen – auch in der stärksten Sprache.' },
        { id: 'k3', text: 'Versteht Anweisungen erst nach Wiederholung oder mit Zeigen.' },
        { id: 'k4', text: 'Spricht in bestimmten Situationen nicht, obwohl es sprechen kann (z. B. nur in der Schule nicht).' },
        { id: 'k5', text: 'Erzählt so ungeordnet, dass man schwer folgen kann.' }
      ],
      schritte: [
        'Mit Bildern, Gesten und Vormachen unterstützen; Anweisungen kurz und in klarer Reihenfolge geben.',
        'Sprechanlässe ohne Druck schaffen; bei Schweigen nicht zum Sprechen drängen, andere Wege der Beteiligung anbieten.'
      ],
      abklaeren: ['Sprachentwicklung abklären lassen: Dépistage bzw. Centre pour le développement des compétences langagières, auditives et communicatives.', 'Hörvermögen prüfen lassen.', 'Bei Schweigen in bestimmten Situationen über mehr als einen Monat: Diagnostique einbeziehen.'],
      eldib: ['K-9', 'K-10', 'K-11', 'K-17', 'K-30'],
      toolbox: ['ich-sage-was-ich-fuehle', 'ich-botschaften', 'tagesplan-bildkarten'],
      lernen: ['sprache-mutismus']
    },
    {
      id: 'koerper', name: 'Körper, Motorik & Wahrnehmung', farbe: '#586277',
      hinweis: 'Bewegung, Feinmotorik, Sehen, Hören, Reizempfinden und Müdigkeit.',
      items: [
        { id: 'w1', text: 'Wirkt ungeschickt beim Laufen, Klettern oder bei Ballspielen.' },
        { id: 'w2', text: 'Hat Mühe mit Stift, Schere oder Besteck.', ES: 'Schreibt sehr langsam oder schwer lesbar.' },
        { id: 'w3', text: 'Reagiert sehr stark auf Geräusche, Berührungen, Licht oder Gerüche (hält sich z. B. die Ohren zu).' },
        { id: 'w4', text: 'Kneift beim Lesen die Augen zusammen, hält Blätter sehr nah oder klagt über verschwommenes Sehen.' },
        { id: 'w5', text: 'Fragt häufig nach, als ob es schlecht hört, oder reagiert nicht, wenn man es von hinten anspricht.' },
        { id: 'w6', text: 'Wirkt übermüdet oder schläft im Unterricht ein.' }
      ],
      schritte: [
        'Sitzplatz anpassen (nah an der Tafel, ruhige Ecke) und Hilfsmittel anbieten (Griffverdickung, Gehörschutz).',
        'Mit den Eltern über Schlaf, Bildschirmzeit und Arztbesuche sprechen.'
      ],
      abklaeren: ['Sehen und Hören prüfen lassen (Dépistage, Kinderarzt).', 'Motorik abklären lassen: Dépistage bzw. Centre pour le développement moteur.'],
      eldib: ['V-1', 'V-4', 'V-12', 'KOG-18', 'KOG-26'],
      toolbox: ['energie-batterie', 'gut-schlafen', 'ruhe-ecke'],
      lernen: ['entwicklung-0-18']
    }
  ],

  staerken: {
    id: 'staerken', name: 'Stärken & Ressourcen',
    hinweis: 'Worauf sich aufbauen lässt. Stärken schützen – sie gehören in jede Einschätzung.',
    items: [
      { id: 'st1', text: 'Zeigt Interesse und Freude an bestimmten Themen oder Tätigkeiten.' },
      { id: 'st2', text: 'Hilft anderen oder tröstet sie.' },
      { id: 'st3', text: 'Nimmt Hilfe von Erwachsenen an.' },
      { id: 'st4', text: 'Hat mindestens eine gute Beziehung zu einem anderen Kind.', ES: 'Hat mindestens eine gute Beziehung zu Gleichaltrigen.' },
      { id: 'st5', text: 'Hält sich an Regeln, wenn sie klar vereinbart sind.' },
      { id: 'st6', text: 'Probiert Neues aus, auch wenn es schwierig ist.' },
      { id: 'st7', text: 'Kann sich über eigene Erfolge freuen.' },
      { id: 'st8', text: 'Bringt Humor, Kreativität oder besondere Fähigkeiten in die Gruppe ein.' }
    ]
  },

  /* Beeinträchtigung im Alltag: macht aus Beobachtungen eine Einschätzung des Handlungsbedarfs.
     Pflicht sind Dauer, Orte und die vier Fragen zur Beeinträchtigung; wer es nicht weiß, wählt
     „keine Angabe“ ('ka') – das zählt nie als „gar nicht“. */
  auswirkung: [
    { id: 'dauer', frage: 'Seit wann bestehen die Schwierigkeiten?', optionen: [['keine', 'keine nennenswerten Schwierigkeiten'], ['kurz', 'seit weniger als einem Monat'], ['mittel', 'seit ein bis sechs Monaten'], ['lang', 'seit mehr als sechs Monaten']] },
    { id: 'leiden', frage: 'Wie sehr leidet das Kind selbst darunter?', optionen: [['0', 'gar nicht'], ['1', 'etwas'], ['2', 'deutlich'], ['3', 'sehr'], ['ka', 'keine Angabe']] },
    { id: 'lernen', frage: 'Wie sehr beeinträchtigen die Schwierigkeiten das Lernen?', optionen: [['0', 'gar nicht'], ['1', 'etwas'], ['2', 'deutlich'], ['3', 'sehr'], ['ka', 'keine Angabe']] },
    { id: 'beziehungen', frage: 'Wie sehr beeinträchtigen sie Freundschaften und Beziehungen?', optionen: [['0', 'gar nicht'], ['1', 'etwas'], ['2', 'deutlich'], ['3', 'sehr'], ['ka', 'keine Angabe']] },
    { id: 'gruppe', frage: 'Wie sehr beeinträchtigen sie das Zusammenleben in der Klasse oder Gruppe?', optionen: [['0', 'gar nicht'], ['1', 'etwas'], ['2', 'deutlich'], ['3', 'sehr'], ['ka', 'keine Angabe']] },
    { id: 'orte', frage: 'Wo zeigen sich die Schwierigkeiten?', optionen: [['eine', 'nur in einer Situation oder bei einer Person'], ['mehrere', 'in mehreren Situationen'], ['ueberall', 'fast überall (auch zu Hause, soweit bekannt)']] },
    { id: 'ereignis', frage: 'Gab es in letzter Zeit belastende Ereignisse (Umzug, Trennung, Krankheit, Verlust, Flucht)?', optionen: [['nein', 'nein, nicht bekannt'], ['ja', 'ja']] }
  ],

  /* Vorschläge aus dem DS (ELDiB-Generator): Ist der DS ausgefüllt, sind diese Aussagen
     im neuen Bogen schon beantwortet. Nur DS-Aussagen, die inhaltlich dasselbe meinen.
     Umrechnung der DS-Skala (1 = trifft gar nicht zu … 7 = trifft voll zu) in die
     Häufigkeit: 1–2 nie, 3–4 manchmal, 5–6 oft, 7 sehr oft. Positiv formulierte
     DS-Aussagen werden für Schwierigkeiten umgedreht, für Stärken nicht.
     Wer als Elternteil einschätzt, bekommt die Sicht der Eltern; alle anderen die Sicht
     der Schule, die Beobachtung und das Gespräch mit dem Kind. */
  ausDs: {
    schule: {
      s_konz: ['a1'], s_selbst: ['a5', 'l1'], s_sorgfalt: ['a4', 'l4'],
      s_unruhe: ['u1'], s_impuls: ['u6'],
      s_angst: ['g1'], s_selbstwert: ['g6', 'st6'],
      s_rueckzug: ['s3'],
      s_frust: ['r1', 'l3'], s_wut: ['r2'], s_ausgeglichen: ['r6'],
      s_regeln: ['v1', 'st5'], s_verweig: ['v1'],
      s_peers: ['m1', 'st4'], s_hilfe: ['st3']
    },
    beobachtung: {
      b_konz: ['a1'], b_ablenk: ['a2'], b_start: ['l1'], b_unruhe: ['u1'], b_frust: ['r1'],
      b_regeln: ['v1', 'st5'], b_provo: ['v3'], b_peers: ['m1'], b_isol: ['s3'], b_hilfe: ['st3']
    },
    kind: { k_selbstwert: ['s5'], k_freunde: ['st4'] },
    eltern: { e_wut: ['r2'], e_rueckzug: ['s3'], e_angst: ['g1'], e_regeln: ['v1', 'st5'] },
    /* In diesen Stufen meint die Aussage etwas anderes als die DS-Aussage – dort nicht vorausfüllen
       (g6 in C1: „Trennt sich schwer von Bezugspersonen …“ statt „traut sich wenig zu“) */
    nichtIn: { C1: ['g6'] },
    /* „Wie sehr leidet das Kind selbst darunter?“ aus dem Gespräch mit dem Kind */
    leiden: 'k_druck',
    /* nur für den Kompass (Bereich betroffen, aber keine gleichlautende Aussage im Bogen) */
    bereiche: { verhalten: ['s_aggr', 's_konflikt', 'b_stoer'], sozial: ['s_konflikt'], stimmung: ['k_druck'], lernen: ['s_leistung'] }
  },

  /* Warnsignale: nicht gezählt – jedes „ja“ bedeutet, heute zu handeln */
  warnsignale: [
    { id: 'suizid', text: 'Spricht über den Tod, das Sterben oder darüber, nicht mehr leben zu wollen.',
      tun: 'Heute handeln: ruhig und direkt nachfragen, zuhören, das Kind bei akuter Gefahr nicht allein lassen. Leitung sofort informieren und dem internen Ablauf folgen. Akute Gefahr: 112. Beratung: Kanner-Jugendtelefon 116 111, SOS Détresse 45 45 45.' },
    { id: 'selbstverletzung', text: 'Es gibt Hinweise auf Selbstverletzung (z. B. Schnitte, Verbrennungen, verdeckende Kleidung trotz Hitze).',
      tun: 'Heute handeln: ruhig ansprechen, ohne Vorwürfe; Wunden versorgen lassen. Leitung informieren und dem internen Ablauf folgen; Eltern einbeziehen, außer es besteht Verdacht auf Gewalt in der Familie.' },
    { id: 'gewalt', text: 'Es gibt Hinweise auf Gewalt, Vernachlässigung oder sexuelle Übergriffe (Verletzungen, Äußerungen, fehlende Grundversorgung, stark sexualisiertes Verhalten).',
      tun: 'Nicht selbst ermitteln und das Kind nicht ausfragen. Äußerungen wörtlich und mit Datum festhalten. Sofort Leitung und internen Kinderschutz-Ablauf einschalten. Akute Gefahr: Police 113 oder 112.' },
    { id: 'gefahr', text: 'Bringt sich oder andere in ernste Gefahr (Weglaufen, Drohungen, gefährliche Gegenstände).',
      tun: 'Sicherheit geht vor: Leitung sofort informieren, Krisenablauf befolgen, Situation schriftlich festhalten.' },
    { id: 'sucht', text: 'Es gibt Hinweise auf Alkohol-, Drogen- oder Medikamentenmissbrauch.', nur: ['ES'],
      tun: 'Zeitnah mit Leitung besprechen, das Gespräch mit dem Jugendlichen suchen und Eltern einbeziehen; fachliche Beratung anregen.' },
    { id: 'essen', text: 'Das Essverhalten ist auffällig oder das Gewicht verändert sich deutlich.',
      tun: 'Zeitnah mit Leitung und Eltern besprechen und eine ärztliche Abklärung anregen.' },
    { id: 'wechsel', text: 'Verhalten oder Leistung haben sich plötzlich und stark verändert, ohne erkennbaren Grund.',
      tun: 'Zeitnah das Gespräch mit dem Kind und den Eltern suchen; Leitung informieren. Plötzliche Veränderungen können auf Belastungen hinweisen, die Schutz brauchen.' },
    { id: 'wahrnehmung', text: 'Äußert ungewöhnliche Wahrnehmungen oder Gedanken (hört z. B. Stimmen, fühlt sich verfolgt).', nur: ['GS', 'ES'],
      tun: 'Ruhig bleiben, nicht diskutieren. Zeitnah Leitung und Eltern informieren und eine kinder- und jugendpsychiatrische Abklärung anregen.' }
  ],

  quellen: [
    'Achenbach, T. M. & Rescorla, L. A. (2001). Manual for the ASEBA School-Age Forms & Profiles. Burlington, VT: University of Vermont, Research Center for Children, Youth, & Families.',
    'American Psychiatric Association (2022). Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition, Text Revision (DSM-5-TR). Washington, DC: APA.',
    'De Los Reyes, A., Augenstein, T. M., Wang, M., Thomas, S. A., Drabick, D. A. G., Burgers, D. E. & Rabinowitz, J. (2015). The validity of the multi-informant approach to assessing child and adolescent mental health. Psychological Bulletin, 141(4), 858–900.',
    'Glover, T. A. & Albers, C. A. (2007). Considerations for evaluating universal screening assessments. Journal of School Psychology, 45(2), 117–135.',
    'Goodman, R. (1997). The Strengths and Difficulties Questionnaire: A research note. Journal of Child Psychology and Psychiatry, 38(5), 581–586.',
    'Goodman, R. (1999). The extended version of the Strengths and Difficulties Questionnaire as a guide to child psychiatric caseness and consequent burden. Journal of Child Psychology and Psychiatry, 40(5), 791–799.',
    'World Health Organization (2019). International Classification of Diseases, 11th Revision (ICD-11). Genf: WHO.'
  ]
};
