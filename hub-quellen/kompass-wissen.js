/* =====================================================================
   CDSE Hub — Wissensbasis für den Kompass
   ---------------------------------------------------------------------
   Bausteine je Profil (dokumentierte Diagnose, Verdacht oder aus
   Beobachtungen), je Entwicklungsstufe (ETEP), für häufige Kombinationen
   und für das Umfeld. Der Kompass wählt daraus aus, was zum Profil eines
   Kindes passt, und zeigt bei jedem Punkt, warum.

   Quellen: nur Schlüssel aus lern-app/quellen.js (geprüfte Fachliteratur,
   Leitlinien). Ohne Quelle steht ein Punkt als „Praxis“ da.

   Felder einer Empfehlung:
     t      Text (du-Form, für pädagogische Fachkräfte)
     q      Quellen (Schlüssel)
     b, st  nur für bestimmte ETEP-Stufen: Bereich (V, K, SOZ) und [von, bis]
     alter  nur für ein Alter [von, bis] in Jahren

   Felder eines Profils:
     name   Name als Diagnose (bei Diagnose und Verdacht)
     thema  neutraler Name (bei Arbeitshypothese und Beobachtung)
     umfasst  andere Profile, die in diesem aufgehen (z. B. Emotionsregulation
            in den Borderline-Zügen) – dann erscheint nur dieses

   Erkennen eines Profils:
     re     regulärer Ausdruck (ohne Groß-/Kleinschreibung) für Diagnosen und
            Verdacht – ICD-10, ICD-11 und Namen auf Deutsch, Französisch, Englisch
     nicht  Fehltreffer (ohne Groß-/Kleinschreibung): Stellen, die „re“ trifft,
            die aber nicht das Profil meinen – z. B. „ASS 100 mg“ (Aspirin),
            „Schädel-Hirn-Trauma“, „IQ im Borderline-Bereich“
     nichtKlein  Fehltreffer, bei denen die Schreibweise zählt: das Verb „sucht“
            (nicht die Sucht), französisch „ses“ (nicht die Abkürzung SES)
     beob   aus Beobachtungen (keine Diagnose): Liste von Alternativen, jede
            eine Liste von Bedingungen, die alle erfüllt sein müssen:
            'sc:<bereich>' (Screening deutlich) · 'sc:<bereich>:gelb' (auch
            „einiges“) · 'warn:<id>' · 'alter:<n>+' · 'vorfaelle:<n>+'

   Stand: Entwurf – vor dem Einsatz fachlich prüfen lassen.
   ===================================================================== */
window.CDSE_KOMPASS_WISSEN={
stand:'2026-09-25',
status:'Entwurf – bitte vor dem Einsatz vom Fachteam (z. B. Diagnostique) prüfen lassen',

/* ---------------------------------------------------------------------
   Profile
   --------------------------------------------------------------------- */
profile:[
 {id:'adhs', name:'ADHS', thema:'Aufmerksamkeit und Unruhe',
  re:'\\bF90|\\bF98\\.80|\\b6A05|\\badhs\\b|\\bads\\b|\\badhd\\b|\\btdah\\b|hyperkinet|aufmerksamkeitsdefizit|aufmerksamkeitsst[öo]rung|hyperaktivit[äa]tsst[öo]rung',
  beob:[['sc:aufmerksamkeit'],['sc:unruhe','sc:aufmerksamkeit:gelb']],
  kurz:'Anhaltende Schwierigkeiten mit Aufmerksamkeit, Unruhe und Impulssteuerung in mehreren Lebensbereichen – eine Störung der Selbststeuerung mit starker biologischer Grundlage, kein Erziehungsfehler.',
  verstehen:[
   {t:'Selbststeuerung (Arbeitsgedächtnis, Impulshemmung, Zeitgefühl) ist verzögert entwickelt. Deshalb braucht das Kind Steuerung von außen, bis es sie selbst übernehmen kann.',q:['barkley2015']},
   {t:'Später oder seltener Lohn wirkt kaum, sofortige und häufige Rückmeldung wirkt. Das erklärt, warum dasselbe Kind am Computer stundenlang dranbleibt und bei Hausaufgaben nach Minuten aufgibt.',q:['barkley2015','faraone2021']},
   {t:'Die Leitlinien empfehlen ein Vorgehen auf mehreren Ebenen: Aufklärung, Elterntraining, Maßnahmen in Schule und Betreuung, bei Bedarf Medikamente.',q:['niceNG87','awmfAdhs2018']}],
  umgang:[
   {t:'Anweisungen kurz, einzeln und mit Blickkontakt geben; längere Aufträge zusätzlich schriftlich oder als Bild.',q:['doepfner2019']},
   {t:'Viel häufiger loben als korrigieren – sofort und konkret („Du hast gleich angefangen“).',q:['doepfner2019','barkley2015']},
   {t:'Fehlverhalten kurz und neutral ansprechen, ohne Moralpredigt; ruhig und berechenbar bleiben.',q:['doepfner2019']},
   {t:'Die Steuerung liegt noch fast ganz bei dir: Nähe, feste Abläufe und ein einziges Ziel mit Sofortverstärker (Stempel, Punkt).',q:['doepfner2019','wood1996'],b:'V',st:[1,2]},
   {t:'Selbstbeobachtung aufbauen: Das Kind schätzt sich mit einer einfachen Karte selbst ein und vergleicht mit deiner Einschätzung.',q:['doepfner2019'],b:'V',st:[3,5]}],
  konkret:[
   {t:'Aufgaben in kleine Etappen teilen und Zwischenkontrollen einbauen („Zeig mir die ersten drei“).',q:['niceNG87','doepfner2019']},
   {t:'Arbeitsplatz mit wenig Ablenkung, nahe bei dir, Material vorbereitet; Zeit sichtbar machen (Sanduhr, Zeitbalken).',q:['doepfner2019','barkley2015']},
   {t:'Punkteplan mit ein bis drei klar beschriebenen Zielen und schneller Einlösung.',q:['doepfner2019']},
   {t:'Tägliche Rückmeldekarte zwischen Schule und Eltern (Check-in/Check-out).',q:['crone2010']},
   {t:'Bewegung erlauben und einplanen: Materialdienst, kurze Bewegungspausen.',q:['doepfner2019']}],
  lassen:[
   {t:'Pause oder Sport als Strafe streichen – gerade diese Kinder brauchen Bewegung.',q:['doepfner2019']},
   {t:'Strafen für Symptome (Vergessen, Zappeln) statt Hilfen zum Organisieren.',q:['barkley2015']},
   {t:'Lange Ermahnungen, Ironie, Bloßstellen vor der Klasse.',q:['doepfner2019']}],
  zusammenarbeit:[
   {t:'Mit den Eltern gleiche Ziele und Verstärker absprechen; ein Elterntraining kann helfen.',q:['niceNG87']},
   {t:'Bei Medikation: Beobachtungen aus der Schule (Wirkung, Tageszeit, Nebenwirkungen) sachlich an Eltern und Ärztin weitergeben – keine Empfehlungen zur Dosis.',q:['awmfAdhs2018']}],
  blaetter:['bin-ich-bei-der-sache','stopp-denken-handeln','selbstcheck','punkteplan','check-in-check-out','konzentrations-tricks','schritt-fuer-schritt'],
  lernen:['adhs','verstaerkung']},

 {id:'sozialverhalten', name:'Oppositionelles und aggressives Verhalten', thema:'Regeln und Konflikte',
  re:'\\bF9[12]|\\bF90\\.1|\\b6C9[01]|st[öo]rung(?:en)? des sozialverhaltens|sozialverhaltensst[öo]rung|oppositionell|trotzverhalten|trouble (oppositionnel|des conduites)|conduct disorder|oppositional|\\bodd\\b',
  nichtKlein:'\\bodd\\b',
  beob:[['sc:verhalten'],['vorfaelle:3+','sc:verhalten:gelb']],
  kurz:'Anhaltend oppositionelles, trotziges oder aggressives Verhalten, das über das Altersübliche hinausgeht. Entscheidend für den Umgang: Entsteht die Aggression aus Wut und Bedrohung (reaktiv) oder wird sie gezielt eingesetzt (proaktiv)?',
  verstehen:[
   {t:'Zwangsprozesse: Erwachsene und Kind schaukeln sich gegenseitig hoch; wer am Ende nachgibt, verstärkt ungewollt das Verhalten beider.',q:['kazdin2008','petermann2012']},
   {t:'Reaktive Aggression entsteht aus Kränkung, Bedrohungserleben und Wut, proaktive wird eingesetzt, um etwas zu bekommen. Beide brauchen unterschiedliche Antworten.',q:['petermann2012','frick2014']},
   {t:'Kaltherzig-unemotionale Züge (wenig Schuldgefühl und Mitgefühl) sind ein eigener Risikofaktor; diese Kinder sprechen besser auf Belohnung an als auf Strafe.',q:['frick2014']},
   {t:'Die Leitlinie empfiehlt vor allem Elterntraining und Programme zur sozialen Kompetenz in der Schule.',q:['niceCG158']}],
  umgang:[
   {t:'Präsenz statt Machtkampf: ruhig bleiben, nicht sofort reagieren („Ich komme darauf zurück“), die Beziehung halten.',q:['omer2004']},
   {t:'Wenige klare Regeln mit vorher bekannten Konsequenzen – konsequent und ohne Drama.',q:['petermann2012','webbStratton2003']},
   {t:'Erwünschtes Verhalten gezielt beachten und das Verhältnis von Lob zu Kritik bewusst ändern.',q:['webbStratton2003','kazdin2008']},
   {t:'Bei Wutausbrüchen zuerst Sicherheit und Beruhigung, erst danach das Gespräch; Auslöser wie Kränkung oder Überforderung früh erkennen.',q:['petermann2012'],b:'V',st:[1,3]},
   {t:'Wiedergutmachung statt reiner Strafe: „Was kannst du tun, damit es wieder gut wird?“',q:['omer2004'],b:'SOZ',st:[3,5]}],
  konkret:[
   {t:'Training sozialer Fertigkeiten in der Gruppe über mehrere Wochen: Gefühle erkennen, Probleme lösen, Konflikte klären.',q:['petermann2012','durlak2011']},
   {t:'Punkteplan oder Check-in/Check-out mit täglicher Rückmeldung.',q:['crone2010']},
   {t:'Nachgespräch nach Konflikten mit festen Fragen: Was ist passiert? Was hast du gedacht und gefühlt? Was machst du beim nächsten Mal?',q:['petermann2012']},
   {t:'Bei gezielt eingesetzter Aggression: klare Konsequenzen und Belohnung für faires Verhalten; nicht allein auf Appelle an das Mitgefühl setzen.',q:['frick2014']}],
  lassen:[
   {t:'Öffentliche Machtkämpfe und Diskussionen vor der Klasse.',q:['omer2004']},
   {t:'Anschreien und Drohungen, die dann nicht umgesetzt werden.',q:['kazdin2008']},
   {t:'Nur auf Fehlverhalten reagieren – das Kind lernt, dass Stören Aufmerksamkeit bringt.',q:['webbStratton2003']}],
  zusammenarbeit:[
   {t:'Elterntraining anregen; es gehört zu den am besten belegten Hilfen.',q:['niceCG158']},
   {t:'Gleiche Regeln in Schule, Betreuung und Familie; Unterstützerkreis im Sinne der Neuen Autorität aufbauen.',q:['omer2004']}],
  blaetter:['meine-stopp-hand','ampel-im-kopf','stopp-denken-handeln','konflikte-loesen','das-war-nicht-okay','verantwortung-uebernehmen','punkteplan'],
  lernen:['oppositionell-aggressiv','neue-autoritaet','deeskalation']},

 {id:'trauma', name:'Trauma und Traumafolgen', thema:'Belastende Erfahrungen',
  beob:[['warn:gewalt']],
  re:'\\bF43\\.[01]|\\b6B4[01]|\\bptbs\\b|\\bptsd\\b|\\btspt\\b|trauma|posttraumat|belastungsst[öo]rung|stress post',
  nicht:'sch[äa]del-?hirn-?trauma|hirn-?trauma|poly-?trauma|knall-?trauma|(?:kopf|bauch|thorax|augen|zahn|geburts|schleuder|bagatell|sport|extremit[äa]ten|wirbels[äa]ulen)-?trauma|traumatolog|trauma(?:to)?-?(?:therap|p[äa]dagog|sensib|fokus|ambulanz|zentrum|beratung|informiert|spezifisch|gruppe)',
  kurz:'Folgen belastender Erlebnisse wie Gewalt, Vernachlässigung, Verlust oder Flucht. Das Verhalten ist oft eine früher sinnvolle Überlebensreaktion, die in der Schule nicht mehr passt.',
  verstehen:[
   {t:'Auslöser (Trigger), die an das Erlebte erinnern, lösen Kampf, Flucht oder Erstarren aus – oft ohne dass das Kind den Zusammenhang merkt.',q:['perry2006','vanDerKolk2014']},
   {t:'Toleranzfenster: Außerhalb davon, in Übererregung oder Erstarrung, sind Lernen und Nachdenken kaum möglich.',q:['siegel1999']},
   {t:'Belastende Kindheitserfahrungen erhöhen das Risiko für spätere Probleme; stabile Beziehungen und Sicherheit wirken schützend.',q:['felitti1998','rutter2012']}],
  umgang:[
   {t:'Sicherheit zuerst: vorhersehbare Abläufe, Veränderungen ankündigen, ruhige Stimme.',q:['perry2006']},
   {t:'Verhalten als Folge von Erfahrungen verstehen, nicht als Absicht – und trotzdem Grenzen halten.',q:['perry2006']},
   {t:'Mitregulieren: Du bleibst ruhig und hilfst beim Beruhigen, bevor du Selbststeuerung erwartest.',q:['perry2006','siegel1999']},
   {t:'Wahlmöglichkeiten geben: Kontrolle über kleine Dinge stärkt das Gefühl, etwas bewirken zu können.',q:['vanDerKolk2014','bandura1977']}],
  konkret:[
   {t:'Auslöser gemeinsam herausfinden (Geräusche, Berührung, jemand hinter dem Rücken) und im Team bekanntmachen.',q:['vanDerKolk2014']},
   {t:'Einen sicheren Platz im Raum und einfache Übungen zum Ankommen im Hier und Jetzt vereinbaren (Atmen, Dinge im Raum benennen, etwas Kaltes anfassen).',q:['vanDerKolk2014']},
   {t:'Übergänge ankündigen und begleiten; Vertretungen vorbereiten.',q:['perry2006']},
   {t:'Das Erlebte nicht in der Schule aufarbeiten: Erzählt das Kind davon, ruhig zuhören – die Aufarbeitung gehört in die Therapie.',q:['niceNG116']}],
  lassen:[
   {t:'Isolation, Festhalten oder Einsperren als Strafe.',q:['perry2006']},
   {t:'Plötzliche Berührung, Anschreien, unberechenbare Reaktionen.',q:['perry2006']},
   {t:'Nach Einzelheiten des Erlebten fragen.',q:['niceNG116']}],
  krise:[
   {t:'Bei Übererregung: Abstand, wenige Worte, ruhige Stimme, einen Ausweg lassen. Bei Erstarrung: mit Namen ansprechen und Orientierung geben (Ort, Zeit, wer da ist).',q:['siegel1999','perry2006']}],
  zusammenarbeit:[
   {t:'Traumafokussierte Therapie, etwa traumafokussierte kognitive Verhaltenstherapie, wird in den Leitlinien empfohlen – Kontakt zu den Behandelnden nur mit Einverständnis der Eltern.',q:['niceNG116']},
   {t:'Bei Hinweisen auf eine aktuelle Gefährdung gilt sofort der interne Kinderschutz-Ablauf.',q:['whoMaltreatment2006']}],
  blaetter:['ruhig-werden-drei-uebungen','meine-ruhe-insel','stress-werkzeugkoffer','ballon-atmen','wer-ist-fuer-mich-da'],
  lernen:['trauma','traumapaedagogik','stress-gehirn']},

 {id:'bindung', name:'Bindungsstörung', umfasst:['bindungsunsicher'],
  re:'\\bF94\\.[12]|\\b6B4[45]|bindungsst[öo]rung|trouble de l.attachement|attachment disorder',
  kurz:'Schwere Beziehungsauffälligkeiten nach frühen Versorgungsbrüchen oder Vernachlässigung: Rückzug und Misstrauen gegenüber Erwachsenen (gehemmt) oder wahllose Nähe auch zu Fremden (enthemmt).',
  verstehen:[
   {t:'Frühe Erfahrungen prägen innere Arbeitsmodelle: was ein Kind von Erwachsenen erwartet, etwa Zurückweisung oder Unberechenbarkeit.',q:['bowlby1969','grossmann2012']},
   {t:'Bindungsstörungen entstehen durch schwere Vernachlässigung und sind etwas anderes als unsichere Bindungsmuster, die häufig und keine Störung sind.',q:['zeanah2015']},
   {t:'Der wichtigste Wirkfaktor sind verlässliche, feinfühlige Bezugspersonen.',q:['niceNG26','grossmann2012']}],
  umgang:[
   {t:'Eine feste Bezugsperson im Team und Beständigkeit auch nach Konflikten („Ich bin morgen wieder da“).',q:['niceNG26']},
   {t:'Feinfühlig reagieren: die Bedürfnisse hinter dem Verhalten sehen – Nähe suchen, Nähe testen, Nähe abwehren.',q:['grossmann2012']},
   {t:'Beziehungstests aushalten: Abwertung und Provokation nicht persönlich nehmen, Grenzen trotzdem halten.',q:['zeanah2015']},
   {t:'Bei distanzlosem Verhalten freundliche, klare Regeln für Nähe und Distanz, ohne zu beschämen.',q:['zeanah2015']}],
  konkret:[
   {t:'Rituale für Begrüßung, Abschied und Übergänge.',q:['grossmann2012']},
   {t:'Wechsel von Personen und Räumen früh ankündigen und Vertretungen vorbereiten.',q:['niceNG26']},
   {t:'Kleine, sichere Beziehungserfahrungen gezielt schaffen: eine gemeinsame Aufgabe, eine feste Zeit in der Woche.',q:['grossmann2012']}],
  lassen:[
   {t:'Liebesentzug oder Beziehungsabbruch als Konsequenz.',q:['niceNG26']},
   {t:'Häufige Wechsel der Bezugspersonen.',q:['zeanah2015']}],
  zusammenarbeit:[
   {t:'Enge Absprache mit Pflegeeltern oder Heim; die Leitlinie empfiehlt, die Bezugspersonen in ihrer Feinfühligkeit zu unterstützen, etwa mit videogestützter Beratung.',q:['niceNG26']}],
  blaetter:['wer-ist-fuer-mich-da','meine-helfer-hand','mein-unterstuetzungsnetz','trost-koffer'],
  lernen:['bindungsstoerungen','bindung','bindungsmuster']},

 {id:'bindungsunsicher', name:'Unsichere Bindung', thema:'Beziehung und Vertrauen',
  kurz:'Das Kind wirkt in Beziehungen vorsichtig, misstrauisch oder klammernd – oft nach Brüchen, Wechseln oder wenig verlässlichen Erfahrungen. Unsichere Bindung ist häufig und keine Störung; sie zeigt, was das Kind von Erwachsenen erwartet.',
  verstehen:[
   {t:'Aus frühen Erfahrungen entstehen Erwartungen an Erwachsene, etwa „Ich muss allein klarkommen“ (vermeidend) oder „Ich muss um Zuwendung kämpfen“ (ambivalent).',q:['bowlby1969','ainsworth1978']},
   {t:'Bindungsmuster sind veränderbar: Neue, verlässliche Beziehungen – auch zu Fachkräften – können korrigierende Erfahrungen sein.',q:['sroufe2005','grossmann2012']}],
  umgang:[
   {t:'Verlässlich und vorhersehbar sein: Zusagen halten, Abwesenheiten ankündigen, nach Konflikten die Beziehung aktiv wiederherstellen.',q:['grossmann2012']},
   {t:'Bei vermeidendem Verhalten Nähe anbieten, ohne sie aufzudrängen – eher über gemeinsames Tun als über Gespräche.',q:['grossmann2012']},
   {t:'Bei klammerndem Verhalten Sicherheit durch klare Abläufe geben und Selbstständigkeit in kleinen Schritten ermutigen.',q:['grossmann2012']}],
  konkret:[
   {t:'Eine feste Bezugsperson und ein kurzes tägliches Ritual (Begrüßung, kurzer Check-in am Morgen).',q:['grossmann2012','crone2010']},
   {t:'Übergänge und Vertretungen vorbereiten: Wer kommt? Wann bist du wieder da?',q:['niceNG26']}],
  lassen:[
   {t:'Zuwendung als Belohnung einsetzen oder bei Fehlverhalten entziehen.',q:['grossmann2012']}],
  zusammenarbeit:[
   {t:'Mit Eltern oder Betreuenden besprechen, was dem Kind Sicherheit gibt, und Übergänge zwischen Familie und Schule gemeinsam gestalten.',q:['grossmann2012']}],
  blaetter:['wer-ist-fuer-mich-da','meine-helfer-hand','trost-koffer'],
  lernen:['bindung','bindungsmuster']},

 {id:'regulation', name:'Schwierigkeiten der Emotionsregulation', thema:'Gefühle regulieren',
  beob:[['sc:regulation']],
  kurz:'Wut, Angst oder Enttäuschung werden schnell sehr stark und klingen nur langsam ab; eigene Wege, sie zu steuern, fehlen noch. Keine Diagnose, sondern ein Entwicklungsbereich, der bei vielen Schwierigkeiten mitläuft.',
  verstehen:[
   {t:'Emotionsregulation entwickelt sich von außen nach innen: Zuerst beruhigen Erwachsene das Kind (Mitregulation), erst allmählich übernimmt es das selbst.',q:['siegel1999','schneiderLindenberger2018']},
   {t:'Regulation kann an verschiedenen Stellen ansetzen: Situation wählen oder verändern, Aufmerksamkeit lenken, anders bewerten, die Reaktion steuern. Je früher im Ablauf, desto leichter.',q:['gross1998']},
   {t:'Toleranzfenster: Nur in einem mittleren Erregungsbereich ist Nachdenken möglich; bei starker Wut oder Panik und beim Abschalten nicht.',q:['siegel1999']}],
  umgang:[
   {t:'Selbst ruhig bleiben ist das wichtigste Werkzeug: leiser und langsamer sprechen, wenige Worte, Abstand lassen.',q:['siegel1999','perry2006']},
   {t:'Erst beruhigen, dann die Beziehung sichern, dann nachdenken – in der Aufregung nicht erklären oder diskutieren.',q:['perry2006']},
   {t:'Gefühle in Worte fassen helfen („Du bist gerade richtig wütend“) und das Gefühl vom Verhalten trennen: Das Gefühl ist in Ordnung, Schlagen nicht.',q:['petermann2012','bergsson1998']},
   {t:'Du regulierst stellvertretend: Nähe, ruhiger Rhythmus, weniger Reize – noch keine Selbststeuerung erwarten.',q:['wood1996','bergsson1998'],b:'V',st:[1,2]},
   {t:'Strategien gemeinsam in ruhigen Momenten üben und in der Situation mit einem vereinbarten Zeichen daran erinnern.',q:['petermann2012','wood1996'],b:'V',st:[3,5]}],
  konkret:[
   {t:'Ein Gefühlsthermometer oder eine Ampel einführen: Woran merkst du Grün, Gelb, Rot? Was hilft dir bei Gelb?',q:['petermann2012','kendallHedtke2006']},
   {t:'Auslöser beobachten und vorbeugen: Wann, wo und bei wem wird es schwierig (Übergänge, Kritik, Warten, Lärm)? Dort früher Unterstützung anbieten.',q:['gross1998','crone2010']},
   {t:'Eine Beruhigungskarte mit zwei oder drei Schritten, die das Kind selbst ausgewählt hat (z. B. atmen, an den ruhigen Platz gehen, etwas in die Hand nehmen).',q:['Praxis']},
   {t:'Nachgespräch erst in Ruhe: Was ist passiert, was hast du gefühlt, was hilft beim nächsten Mal? Kurz halten und mit einem Plan beenden.',q:['petermann2012']}],
  lassen:[
   {t:'In der Hochphase diskutieren, erklären oder drohen.',q:['perry2006']},
   {t:'Gefühle verbieten oder abwerten („Hör auf zu heulen“) statt das Verhalten zu begrenzen.',q:['linehan1993']}],
  krise:[
   {t:'Sicherheit geht vor: andere Kinder schützen, Abstand halten, wenige ruhige Worte, einen Ausweg lassen. Gesprochen wird erst, wenn das Kind wieder ruhig ist.',q:['perry2006','siegel1999']}],
  zusammenarbeit:[
   {t:'Mit den Eltern dieselben Worte und Hilfen vereinbaren (z. B. dieselbe Ampel), damit das Kind sie überall üben kann.',q:['webbStratton2003']}],
  blaetter:['wut-thermometer','ampel-im-kopf','meine-ruhe-insel','gefuehle-detektiv','ich-brauche-eine-pause'],
  lernen:['emotionsregulation','stress-gehirn','deeskalation']},

 {id:'instabil', name:'Emotionale Instabilität / Borderline-Züge', thema:'Starke Gefühlsschwankungen', umfasst:['regulation'],
  re:'\\bF60\\.3|\\b6D11\\.5|borderline|emotional instabil|emotionale instabilit|personnalit[ée] (limite|borderline)|emotionally unstable',
  nicht:'borderline[- ]?(?:bereich|niveau|intelligenz|intellekt|iq|range|level|zone)|(?:\\biq|intelligenz\\w*|intellektuell\\w*|intellectual\\w*|kognitiv\\w*|leistung\\w*)[^.;\\n]{0,30}borderline',
  beob:[['sc:regulation','sc:stimmung','alter:12+'],['sc:regulation','warn:selbstverletzung','alter:12+']],
  kurz:'Sehr starke, schnell wechselnde Gefühle, Impulsivität, instabile Beziehungen und oft Selbstverletzung. Im Jugendalter ernst zu nehmen und früh zu behandeln – als Entwicklungsrisiko, nicht als Etikett.',
  verstehen:[
   {t:'Biosoziales Modell: Eine hohe emotionale Empfindlichkeit trifft auf ein Umfeld, das Gefühle oft als falsch oder übertrieben zurückweist. Daraus entsteht die Schwierigkeit, Gefühle zu regulieren.',q:['linehan1993']},
   {t:'Unter Stress bricht das Mentalisieren weg: Eigene Gefühle und die Absichten anderer werden schwer verstehbar, Zurückweisung wird schnell vermutet.',q:['fonagy2002','sharpFonagy2015']},
   {t:'Die Diagnose ist ab dem Jugendalter möglich; frühe, spezifische Hilfe verbessert den Verlauf.',q:['kaess2014','awmfBps2022']}],
  umgang:[
   {t:'Validieren vor Verändern: das Gefühl als nachvollziehbar anerkennen („Ich sehe, wie sehr dich das trifft“), bevor du über das Verhalten sprichst.',q:['linehan1993','rathusMiller2015']},
   {t:'Ruhig, vorhersehbar und verlässlich bleiben, auch bei Abwertung oder Idealisierung; die Beziehung nicht vom Verhalten abhängig machen.',q:['sharpFonagy2015']},
   {t:'Mentalisierend nachfragen statt deuten („Was ging in dir vor, als …?“) und eigenes Nichtwissen zugeben.',q:['fonagy2002']},
   {t:'Wenige klare Regeln, die alle im Team gleich handhaben – das schützt vor Spaltung.',q:['awmfBps2022']}],
  konkret:[
   {t:'Mit der Jugendlichen eine Skills-Liste für hohe Anspannung erstellen, zum Beispiel kaltes Wasser, intensive Bewegung, langsames Atmen, starke Sinnesreize – griffbereit als Karte.',q:['rathusMiller2015'],b:'V',st:[3,5]},
   {t:'Anspannung auf einer Skala von 0 bis 100 einschätzen lassen: bei hoher Anspannung zuerst Skills zur Stresstoleranz, bei niedriger Gespräch und Gefühlsregulation.',q:['rathusMiller2015','linehan1993']},
   {t:'Einfache Beruhigungshilfen mit Bildkarten; ein Erwachsener begleitet die Anwendung.',q:['rathusMiller2015','wood1996'],b:'V',st:[1,2]},
   {t:'Nachgespräch als Verhaltensanalyse: Auslöser, Gedanken, Gefühle, Handlung, Folgen – und an welcher Stelle es beim nächsten Mal anders gehen kann.',q:['linehan1993']},
   {t:'Feste Ansprechperson und regelmäßige kurze Kontakte auch ohne Krise, damit Zuwendung nicht nur in der Krise kommt.',q:['linehan1993']},
   {t:'Einen Rückzugsort mit klarer Absprache: Signal, Dauer, wer nachschaut.',q:['Praxis']}],
  lassen:[
   {t:'Gefühle bagatellisieren oder als Manipulation abtun.',q:['linehan1993']},
   {t:'Beziehungsabbruch oder Isolation als Strafe.',q:['sharpFonagy2015']},
   {t:'Einzelne Kolleginnen oder Kollegen zu Retterinnen und Rettern werden lassen, ohne Absprache im Team.',q:['awmfBps2022']},
   {t:'In der Hochspannung diskutieren oder Grundsatzgespräche führen.',q:['rathusMiller2015']}],
  krise:[
   {t:'Bei Selbstverletzung ruhig und sachlich reagieren, Wunden versorgen lassen, die Leitung informieren und Suizidgedanken direkt erfragen.',q:['niceNG225']},
   {t:'Einen Krisenplan mit Frühwarnzeichen, Skills, Ansprechpersonen und Notfallnummern mit Fachleuten erarbeiten.',q:['stanleyBrown2012']}],
  zusammenarbeit:[
   {t:'Therapie wie DBT-A oder mentalisierungsbasierte Therapie machen dafür ausgebildete Therapeutinnen und Therapeuten. Absprechen, welche Skills die Schule unterstützt.',q:['millerRathusLinehan2007','rossouwFonagy2012']},
   {t:'Bei häufiger Selbstverletzung und starker Gefühlsinstabilität empfiehlt die NICE-Leitlinie, DBT-A in Betracht zu ziehen.',q:['niceNG225']},
   {t:'Eltern einbeziehen: In DBT-A sind Familien Teil der Behandlung, auch Eltern lernen Validierung.',q:['millerRathusLinehan2007']}],
  blaetter:['sicherheitsplan','wut-thermometer','ruhig-werden-drei-uebungen','stress-werkzeugkoffer','nachgespraech-krise'],
  lernen:['emotionsregulation','mentalisieren','selbstverletzung-suizid']},

 {id:'selbstverletzung', name:'Selbstverletzung und Suizidalität',
  re:'selbstverletz|\\bsvv\\b|\\bnssv\\b|automutilation|self.harm|suizid|suicid|\\bX(6[0-9]|7[0-9]|8[0-4])',
  beob:[['warn:selbstverletzung'],['warn:suizid']],
  kurz:'Absichtliche Selbstverletzung, meist als Versuch, unerträgliche Anspannung oder Gefühle zu regulieren. Sie ist kein Suizidversuch, erhöht aber das Risiko für Suizidalität und braucht immer eine fachliche Einschätzung.',
  verstehen:[
   {t:'Selbstverletzung hat Funktionen: Anspannung senken, Gefühle spürbar machen oder beenden, sich bestrafen, anderen Not zeigen.',q:['nock2010']},
   {t:'Sie ist ein wichtiger Risikofaktor für Suizid; Suizidgedanken werden deshalb immer direkt erfragt.',q:['hawton2012','niceNG225']}],
  umgang:[
   {t:'Ruhig, sachlich und respektvoll reagieren – weder schockiert noch gleichgültig.',q:['niceNG225']},
   {t:'Interesse an der Person zeigen, nicht an Einzelheiten der Verletzung; nicht nach Methoden fragen.',q:['niceNG225']}],
  konkret:[
   {t:'Wunden versorgen lassen, die Leitung informieren und die Eltern nach dem internen Ablauf einbeziehen.',q:['niceNG225']},
   {t:'Mit Fachleuten einen Sicherheitsplan erarbeiten: Warnzeichen, eigene Strategien, Ansprechpersonen, Notfallnummern.',q:['stanleyBrown2012']},
   {t:'Alternative Strategien für hohe Anspannung gemeinsam erarbeiten – als Ergänzung zur Therapie.',q:['rathusMiller2015']},
   {t:'Ansteckung in Gruppen beachten: nicht öffentlich besprechen, Bilder in sozialen Medien ansprechen.',q:['hawton2012']}],
  lassen:[
   {t:'Versprechen erzwingen („Nie wieder!“) oder mit Konsequenzen drohen – das fördert Heimlichkeit.',q:['nock2010']},
   {t:'Vor anderen darüber sprechen.',q:['hawton2012']}],
  krise:[
   {t:'Suizidgedanken direkt erfragen. Bei einem Plan oder akuter Gefahr nicht allein lassen, sofort die Leitung informieren, im Notfall 112. Beratung: Kanner-Jugendtelefon 116 111, SOS Détresse 45 45 45.',q:['niceNG225','stanleyBrown2012']}],
  zusammenarbeit:[
   {t:'Bei wiederholter Selbstverletzung und starker Gefühlsinstabilität empfiehlt die Leitlinie, DBT-A in Betracht zu ziehen; auch mentalisierungsbasierte Therapie wurde erfolgreich untersucht.',q:['niceNG225','rossouwFonagy2012']}],
  blaetter:['sicherheitsplan','stress-werkzeugkoffer','wer-ist-fuer-mich-da','ruhig-werden-drei-uebungen'],
  lernen:['selbstverletzung-suizid','emotionsregulation']},

 {id:'autismus', name:'Autismus-Spektrum',
  re:'\\bF84|\\b6A02|autis|\\bass\\b|asperger|\\btsa\\b|spectre de l.autisme',
  nicht:'\\bass\\s*-?\\s*(?:\\d|ratio|protect|plus|hexal|stada|heumann)|(?:aspirin|acetylsalicyl\\w*)\\W{0,3}ass\\b',
  kurz:'Unterschiede in sozialer Kommunikation und Interaktion, wiederholende Verhaltensweisen, starke Interessen und eine besondere Reizverarbeitung – sehr unterschiedlich ausgeprägt.',
  verstehen:[
   {t:'Autismus ist ein Spektrum: Sprache, Intelligenz und Unterstützungsbedarf unterscheiden sich stark.',q:['lord2018','dsm5tr']},
   {t:'Viele Schwierigkeiten entstehen aus Überlastung durch Reize, soziale Anforderungen und Unvorhersehbares. Ein Zusammenbruch (Meltdown) oder Abschalten (Shutdown) ist keine Absicht.',q:['lord2018']},
   {t:'Strukturierte Lehre nach TEACCH: Raum, Zeit und Aufgaben werden sichtbar geordnet.',q:['mesibov2004']}],
  umgang:[
   {t:'Klare, wörtliche Sprache; Ironie und Andeutungen vermeiden; Zeit zum Antworten lassen.',q:['niceCG170']},
   {t:'Veränderungen früh ankündigen und sichtbar machen.',q:['mesibov2004']},
   {t:'Interessen als Brücke zum Lernen und zu Kontakten nutzen.',q:['niceCG170']},
   {t:'Reizbelastung ernst nehmen: Rückzugsmöglichkeit, Kopfhörer, ruhiger Platz.',q:['lord2018']}],
  konkret:[
   {t:'Visueller Tages- und Arbeitsplan: Was? Wie viel? Wann ist es fertig? Was kommt danach?',q:['mesibov2004']},
   {t:'Soziale Situationen mit kurzen Sozialgeschichten vorbereiten.',q:['gray2015']},
   {t:'Pausen und Übergänge strukturieren: fester Platz, Aufgabe oder Begleitperson.',q:['mesibov2004']},
   {t:'Frühwarnzeichen für Überlastung kennen und eine Pause anbieten, bevor es zum Zusammenbruch kommt.',q:['lord2018']}],
  lassen:[
   {t:'Blickkontakt erzwingen.',q:['niceCG170']},
   {t:'Überraschungen und kurzfristige Änderungen ohne Vorbereitung.',q:['mesibov2004']},
   {t:'Einen Zusammenbruch als Trotz behandeln und bestrafen.',q:['lord2018']}],
  zusammenarbeit:[
   {t:'Eltern sind Expertinnen und Experten für ihr Kind: gemeinsame Strategien für Übergänge und Krisen abstimmen.',q:['niceCG170']}],
  blaetter:['tagesplan-bildkarten','mein-tag-in-bildern','zuerst-dann','regeln-in-bildern','ruhe-ecke-karten','signalkarten'],
  lernen:['autismus']},

 {id:'angst', name:'Angststörung', thema:'Ängste und Sorgen',
  re:'\\bF4[01]|\\bF93\\.[0-2]|\\b6B0[0-5]|angstst[öo]rung|trennungsangst|soziale (angst|phobie)|generalisierte angst|panikst[öo]rung|panikattacke|panic disorder|panic attack|trouble panique|attaques? de panique|trouble anxieux|anxi[ée]t[ée]|anxiety',
  beob:[['sc:angst']],
  kurz:'Ängste, die stärker, häufiger oder länger sind als altersüblich und den Alltag einschränken – etwa Trennungsangst, soziale Angst oder anhaltende Sorgen.',
  verstehen:[
   {t:'Teufelskreis der Vermeidung: Vermeiden bringt kurzfristig Erleichterung, hält die Angst aber aufrecht.',q:['kendallHedtke2006']},
   {t:'Kognitive Verhaltenstherapie mit schrittweiser Konfrontation ist die am besten belegte Behandlung.',q:['kendallHedtke2006','niceCG159']},
   {t:'Erwachsene verstärken Angst ungewollt, wenn sie zu schnell entlasten oder alles abnehmen.',q:['kendallHedtke2006']}],
  umgang:[
   {t:'Die Angst ernst nehmen und benennen – und Zutrauen zeigen („Das ist schwer, und ich glaube, du schaffst einen kleinen Schritt“).',q:['kendallHedtke2006']},
   {t:'Nicht beim Vermeiden helfen, sondern kleine Schritte begleiten.',q:['kendallHedtke2006']},
   {t:'Körperliche Angstzeichen erklären: Herzklopfen und Bauchweh sind unangenehm, aber ungefährlich.',q:['beesdo2009']}],
  konkret:[
   {t:'Eine Mut-Leiter planen: kleine Stufen von leicht bis schwer, eine nach der anderen üben und Erfolge festhalten.',q:['kendallHedtke2006']},
   {t:'Bei Trennungsangst: kurzer, ruhiger Abschied mit Ritual und Übergabe an eine feste Person.',q:['beesdo2009']},
   {t:'Bei sozialer Angst: vorbereitete Rollen in kleinen Gruppen statt Auftritt vor der Klasse, nicht bloßstellen.',q:['niceCG159']}],
  lassen:[
   {t:'Die Angst ausreden („Da ist doch nichts“).',q:['kendallHedtke2006']},
   {t:'Dauerhafte Befreiung von allem, was Angst macht.',q:['kendallHedtke2006']}],
  zusammenarbeit:[
   {t:'Bei deutlicher Einschränkung eine psychotherapeutische Abklärung anregen.',q:['niceCG159']}],
  blaetter:['angst-verstehen','mut-leiter','ich-kann-mutig-sein','was-hilft-bei-angst','pruefungsangst'],
  lernen:['angst']},

 {id:'schulvermeidung', name:'Schulvermeidung',
  re:'schulvermeid|schulangst|schulverweiger|schulabsent|refus scolaire|d[ée]crochage|school refusal',
  kurz:'Das Kind bleibt der Schule häufig fern oder kommt nur unter großem Druck. Dahinter stehen unterschiedliche Gründe, die unterschiedliche Hilfen brauchen.',
  verstehen:[
   {t:'Vier Funktionen: unangenehme Gefühle vermeiden, soziale oder Bewertungssituationen vermeiden, Zuwendung von Bezugspersonen bekommen, Angenehmeres außerhalb der Schule tun.',q:['kearney2008']}],
  umgang:[
   {t:'Zuerst die Funktion klären und daran ansetzen – nicht allen dieselbe Antwort geben.',q:['kearney2008']}],
  konkret:[
   {t:'Sehr schnelle Rückkehr in kleinen Schritten mit festem Plan; jede weitere Woche zu Hause erschwert die Rückkehr.',q:['kearney2008']},
   {t:'Feste Ansprechperson am Morgen und ein klarer Ablauf für die ersten Minuten.',q:['kearney2008']}],
  lassen:[
   {t:'Abwarten, bis das Kind von selbst wiederkommt.',q:['kearney2008']}],
  zusammenarbeit:[
   {t:'Enge Absprache mit den Eltern über einen gemeinsamen Plan; bei Angst oder Depression Fachleute einbeziehen.',q:['kearney2008']}],
  blaetter:['meine-morgenroutine','zuerst-dann','mut-leiter'],
  lernen:['schulvermeidung','angst']},

 {id:'depression', name:'Depression', thema:'Stimmung und Rückzug',
  re:'\\bF3[23]|\\bF34\\.1|\\bF92\\.0|\\b6A7[0-3]|depress|d[ée]pressi|dysthym',
  nicht:'anti-?d[ée]press\\w*',
  beob:[['sc:stimmung']],
  kurz:'Über Wochen gedrückte oder gereizte Stimmung, Freudlosigkeit und weitere Beschwerden, die den Alltag deutlich beeinträchtigen. Bei jungen Menschen oft übersehen.',
  verstehen:[
   {t:'Bei Kindern und Jugendlichen steht oft Gereiztheit statt Traurigkeit im Vordergrund; Freudlosigkeit ist ein Kernmerkmal.',q:['dsm5tr','thapar2012']},
   {t:'Die Depression ist der wichtigste Risikofaktor für Suizidalität im Jugendalter.',q:['hawton2012']}],
  umgang:[
   {t:'Die Veränderung ansprechen, zuhören, nicht bagatellisieren – und Suizidgedanken direkt erfragen.',q:['niceNG134','niceNG225']},
   {t:'Verlässliche kurze Kontakte, auch ohne Anlass.',q:['niceNG134']}],
  konkret:[
   {t:'Anforderungen vorübergehend anpassen und kleine, erreichbare Erfolge ermöglichen.',q:['niceNG134']},
   {t:'Aktivität, Bewegung und angenehme Erlebnisse unterstützen – Aktivierung ist auch ein Baustein der Therapie.',q:['niceNG134']}],
  lassen:[
   {t:'„Reiß dich zusammen“ oder Vergleiche („Anderen geht es schlechter“).',q:['niceNG134']},
   {t:'Die Stimmung vor der Klasse ansprechen.',q:['Praxis']}],
  zusammenarbeit:[
   {t:'Eine fachliche Abklärung anregen; Psychotherapie steht im Vordergrund, Medikamente nur fachärztlich und eng begleitet.',q:['niceNG134']}],
  blaetter:['wenn-ich-traurig-bin','wenn-es-laenger-schwer-ist','drei-gute-dinge','das-macht-mich-froh','wer-ist-fuer-mich-da'],
  lernen:['depression','selbstverletzung-suizid']},

 /* weitere Profile: erkannt und mit Lernmodul und Material verbunden – ausführliche Bausteine folgen */
 {id:'lernstoerung', name:'Lese-, Rechtschreib- oder Rechenstörung', thema:'Lernen und Arbeitsorganisation', beob:[['sc:lernen']], re:'\\bF81|\\b6A03|legasthen|\\blrs\\b|dyslex|dyskalk|dyscalc|dysorthograph|rechtschreibst[öo]rung|rechenst[öo]rung|lesest[öo]rung', lernen:['lernstoerungen'], blaetter:['wie-lerne-ich-am-besten','schritt-fuer-schritt','fehler-sind-helfer','noch-nicht','aus-rueckschlaegen-lernen']},
 {id:'sprache', name:'Sprachentwicklungsstörung', thema:'Sprache und Verständigung', beob:[['sc:sprache']], re:'\\bF80|\\b6A01|sprachentwicklungsst|\\bses\\b|trouble du langage|dysphasie|\\bdld\\b', nichtKlein:'\\b[Ss]es\\b', lernen:['sprache-mutismus'], blaetter:['gefuehle-gesichter','regeln-in-bildern']},
 {id:'mutismus', name:'Selektiver Mutismus', re:'\\bF94\\.0|\\b6B06|mutismus|mutisme', lernen:['sprache-mutismus','angst'], blaetter:['ich-kann-mutig-sein','mut-leiter']},
 {id:'ticszwang', name:'Tics oder Zwang', re:'\\bF95|\\bF42|\\b8A05|\\b6B20|\\btics?\\b|\\btic-|\\bticst[öo]rung|tourette|zwangsst|\\btoc\\b|\\bocd\\b', lernen:['zwang-tics'], blaetter:['stress-werkzeugkoffer']},
 {id:'essstoerung', name:'Essstörung', thema:'Auffälliges Essverhalten', beob:[['warn:essen']], re:'\\bF50|\\b6B8[0-5]|anorex|bulim|essst[öo]rung|magersucht|ess-?brech-?sucht|\\barfid\\b|trouble alimentaire', lernen:['essstoerungen'], blaetter:['koerperbild','was-tut-mir-gut']},
 {id:'intelligenz', name:'Störung der Intelligenzentwicklung', re:'\\bF7[0-9]|\\b6A00|intelligenzminder|st[öo]rung(?:en)? der intelligenzentwicklung|geistige behinderung|d[ée]ficience intellectuelle|intellectual disab', lernen:['intelligenz'], blaetter:['schritt-fuer-schritt','mein-tag-in-bildern']},
 {id:'sucht', name:'Sucht und problematische Mediennutzung', thema:'Hinweise auf Suchtmittel', beob:[['warn:sucht']], re:'\\bF1[0-9]\\.|\\b6C5[01]|\\bsucht|(?:medien|spiel|internet|online|handy|computer|computerspiel|gaming|alkohol|drogen|nikotin|tabletten)-?sucht|abh[äa]ngigkeitssyndrom|abh[äa]ngigkeitserkrank|(?:alkohol|drogen|cannabis|nikotin|medikamenten|medien|internet|computerspiel|spiel|opiat|opioid|substanz|kokain|heroin)-?abh[äa]ngig|cannabis|addiction|gaming disorder', nichtKlein:'(?:^|[^A-Za-zÄÖÜäöüß-])sucht(?:e|en|est|et)?(?![A-Za-zÄÖÜäöüß])', lernen:['sucht-medien'], blaetter:['medien-tagebuch','mein-handy-und-ich','bildschirmzeit']},
 {id:'psychose', name:'Psychose oder bipolare Störung', thema:'Ungewöhnliche Wahrnehmungen', beob:[['warn:wahrnehmung']], re:'\\bF2[0-9]|\\bF31|\\b6A2|\\b6A6|psychosen?\\b|psychotisch|psychotique|psychosis|psychotic|schizophren|bipolar|\\bmanisch|hypoman', lernen:['psychose-bipolar'], blaetter:[]}
],

/* ---------------------------------------------------------------------
   Entwicklungsstufen (ETEP): Umgang nach der sozial-emotionalen Stufe
   (Verhalten und Sozialisation aus der ELDiB) – nicht nach dem Alter
   --------------------------------------------------------------------- */
stufen:{
 1:{rolle:'Bedürfnisse erfüllen und Freude wecken',umgang:[
   {t:'Körpernahe, sinnliche Angebote und viel Nähe; die Sprache kurz und begleitend („Du rollst den Ball“).',q:['wood1996','bergsson1998']},
   {t:'Eine feste Bezugsperson und immer gleiche Abläufe geben Sicherheit.',q:['wood1996']},
   {t:'Erfolg entsteht durch Freude am gemeinsamen Tun, noch nicht durch Regeln.',q:['bergsson1998']}]},
 2:{rolle:'Motivieren',umgang:[
   {t:'Du steuerst von außen: kurze, klare Anweisungen, Bilder, vormachen statt erklären.',q:['wood1996','bergsson1998']},
   {t:'Erfolg sofort sichtbar machen und konkret loben; einfache Belohnungen wirken.',q:['wood1996']},
   {t:'Wenige, immer gleiche Regeln und feste Routinen als Halt.',q:['bergsson1998']}]},
 3:{rolle:'Ermutigen',umgang:[
   {t:'Regeln gemeinsam begründen und in der Gruppe üben; das Kind beginnt, sich mit Hilfen selbst zu steuern (Signale, Karten).',q:['wood1996','bergsson1998']},
   {t:'Gefühle benennen helfen und einfache Schritte zum Lösen von Problemen üben.',q:['bergsson1998']},
   {t:'Ermutigen statt vormachen: „Du weißt, wie es geht – probier es.“',q:['wood1996']}]},
 4:{rolle:'Beraten und die Gruppe leiten',umgang:[
   {t:'Über Gefühle, Sichtweisen und Gründe sprechen; Konflikte gemeinsam nachbesprechen.',q:['wood1996','bergsson1998']},
   {t:'Verantwortung in der Gruppe übertragen: Dienste, Rollen, Klassenrat.',q:['bergsson1998']},
   {t:'Die Gruppe als Lernfeld nutzen – Rückmeldungen von Gleichaltrigen wirken stark.',q:['wood1996']}]},
 5:{rolle:'Begleiten wie ein Mentor',umgang:[
   {t:'Selbstständigkeit und Mitbestimmung: Ziele gemeinsam setzen, planen und auswerten.',q:['wood1996']},
   {t:'Die Übertragung auf neue Situationen vorbereiten, etwa Praktikum oder neue Schule.',q:['wood1996','bergsson1998']},
   {t:'Über Werte, Zukunft und Beziehungen sprechen; du bleibst verlässlich im Hintergrund.',q:['wood1996']}]}
},

/* ---------------------------------------------------------------------
   Häufige Kombinationen
   --------------------------------------------------------------------- */
kombinationen:[
 {wenn:['adhs','sozialverhalten'],t:'Häufige Kombination: Struktur, sofortige Verstärkung und Elterntraining stehen an erster Stelle. Machtkämpfe vermeiden, weil die Impulsivität Eskalationen beschleunigt.',q:['niceNG87','niceCG158','doepfner2019']},
 {wenn:['trauma','sozialverhalten'],t:'Aggression kann eine Stressreaktion sein: Sicherheit und gemeinsames Beruhigen vor der Konsequenz; Konsequenzen ohne Beschämung und ohne Isolation.',q:['perry2006','niceNG116']},
 {wenn:['trauma','bindung'],t:'Beziehung ist hier zugleich Hilfe und Auslöser: Nähe dosieren, Verlässlichkeit zeigen, Rückzüge aushalten.',q:['zeanah2015','perry2006']},
 {wenn:['instabil','trauma'],t:'Stabilisierung geht vor: Skills für Anspannung und Wegtreten (Dissoziation), keine Konfrontation mit dem Erlebten in der Schule.',q:['niceNG116','rathusMiller2015']},
 {wenn:['instabil','adhs'],t:'Impulsivität beschleunigt Krisen: äußere Struktur, kurze Wege zu den Skills (Karte griffbereit) und früh unterbrechen, wenn die Spannung steigt.',q:['rathusMiller2015','barkley2015']},
 {wenn:['instabil','selbstverletzung'],t:'Sicherheit zuerst: Suizidgedanken regelmäßig und direkt erfragen, Krisenplan mit Fachleuten, Skills für Hochspannung.',q:['niceNG225','stanleyBrown2012']},
 {wenn:['autismus','angst'],t:'Angst ist bei Autismus häufig: Vorhersehbarkeit ist die wichtigste Vorbeugung; Konfrontation nur in sehr kleinen, angekündigten Schritten.',q:['lord2018','kendallHedtke2006']},
 {wenn:['autismus','adhs'],t:'Beides zusammen ist häufig: Abläufe sichtbar strukturieren und zugleich Bewegung und kurze Etappen einplanen.',q:['lord2018','niceNG87']},
 {wenn:['depression','selbstverletzung'],t:'Erhöhtes Suizidrisiko: Suizidgedanken direkt und wiederholt erfragen, Sicherheitsplan, enge Abstimmung mit den Behandelnden.',q:['niceNG225','niceNG134']},
 {wenn:['angst','schulvermeidung'],t:'Schnelle, schrittweise Rückkehr ist entscheidend; jede Woche Fehlzeit macht den Weg zurück schwerer.',q:['kearney2008']},
 {wenn:['sozialverhalten','depression'],t:'Gereiztheit und Aggression können eine Depression verdecken: auch nach Stimmung, Schlaf und Freude fragen.',q:['thapar2012','dsm5tr']},
 {wenn:['lernstoerung','sozialverhalten'],t:'Schulisches Scheitern verstärkt Verhaltensprobleme: die Lernstörung gezielt fördern und einen Nachteilsausgleich über die Leitung prüfen.',q:['schulteKoerne2010']},
 {wenn:['regulation','sozialverhalten'],t:'Entsteht die Aggression vor allem aus Wut und Überforderung, gehen Beruhigung und Vorbeugung vor der Konsequenz: Auslöser erkennen, früh unterbrechen, erst in Ruhe nachbesprechen.',q:['petermann2012']},
 {wenn:['regulation','adhs'],t:'Impulsivität und starke Gefühle verstärken sich gegenseitig: Beruhigungshilfen griffbereit, Übergänge vorbereiten, gelungenes Selbstberuhigen sofort anerkennen.',q:['barkley2015','doepfner2019']},
 {wenn:['regulation','trauma'],t:'Heftige Gefühlsausbrüche können Stressreaktionen auf Auslöser sein: zuerst Sicherheit und gemeinsames Beruhigen, dann die Auslöser gemeinsam herausfinden.',q:['perry2006','siegel1999']},
 {wenn:['bindungsunsicher','sozialverhalten'],t:'Provokation kann ein Beziehungstest sein: Grenzen halten und zugleich zeigen, dass die Beziehung bleibt („Das geht nicht – und ich bin morgen trotzdem für dich da“).',q:['grossmann2012','omer2004']},
 {wenn:['lernstoerung','adhs'],t:'Lernstörung und ADHS treten oft gemeinsam auf: Förderung des Lesens, Schreibens oder Rechnens und Hilfen zur Aufmerksamkeit brauchen beide ihren Platz.',q:['schulteKoerne2010','niceNG87']}
],

/* ---------------------------------------------------------------------
   Umfeld: Alter und Lebenslage
   --------------------------------------------------------------------- */
umfeld:[
 {id:'klein',name:'Jüngeres Kind',t:'Jüngere Kinder brauchen es konkret, spielerisch und mit Bildern; die Eltern eng einbeziehen.',q:['schneiderLindenberger2018']},
 {id:'jugend',name:'Jugendalter',t:'Im Jugendalter Mitbestimmung und Selbstständigkeit respektieren, Gleichaltrige mitdenken und die Grenzen der Vertraulichkeit von Anfang an erklären.',q:['casey2008','millerRollnick2013']},
 {id:'fremd',name:'Lebt nicht bei den Eltern',t:'Bezugsbetreuerinnen und -betreuer als Partner einbeziehen, das Sorgerecht klären (wer entscheidet, wer wird informiert) und Übergänge sowie Besuchskontakte im Blick behalten.',q:['niceNG26','bronfenbrenner1979']},
 {id:'neu',name:'Seit Kurzem in Luxemburg',t:'Sicherheit und Orientierung geben, Sprachschwierigkeiten nicht mit fehlender Leistung verwechseln, mögliche belastende Erfahrungen trauma-sensibel mitdenken und für Elterngespräche eine Dolmetscherin oder einen Dolmetscher einplanen.',q:['niceNG116','bishop2017']},
 {id:'mehrsprachig',name:'Mehrsprachig',t:'Die Erstsprache wertschätzen. Sprachschwierigkeiten in allen Sprachen des Kindes betrachten, bevor an eine Sprachstörung gedacht wird.',q:['bishop2017']},
 {id:'netz',name:'Weitere Dienste beteiligt',t:'Im Helfernetz absprechen, wer was macht, gemeinsame Ziele festhalten und Informationen nur mit Einverständnis weitergeben.',q:['bronfenbrenner1979']},
 {id:'belastung',name:'Aktuelle Belastungen',t:'Belastungen wie Trennung, Umzug, Krankheit oder Verlust können das Verhalten erklären: nachfragen, was sich verändert hat, Anforderungen vorübergehend anpassen und eine feste Ansprechperson anbieten.',q:['lazarusFolkman1984','rutter2012']},
 {id:'entwicklung',name:'Sozial-emotionale Entwicklung verzögert',t:'Anforderungen und Umgang an der Entwicklungsstufe ausrichten, nicht am Alter: Ein Kind auf Stufe II braucht Führung von außen, auch wenn es schon älter ist.',q:['wood1996','bergsson1998']},
 {id:'ueberforderung',name:'Schulische Überforderung',t:'Überforderung zeigt sich oft als Verweigern, Stören oder Rückzug: Aufgaben an den Lernstand anpassen, Erfolge sichern und klären, ob ein besonderer Förderbedarf dahintersteht.',q:['bandura1977','nolting2002']},
 {id:'unterforderung',name:'Schulische Unterforderung',t:'Unterforderung kann Langeweile, Stören oder Rückzug erklären: anspruchsvollere Aufgaben, Verantwortung und Wahlmöglichkeiten anbieten.',q:['nolting2002']},
 {id:'vorfaelle',name:'Gehäufte Vorfälle',t:'Vorfälle mit Uhrzeit, Situation, Auslöser und Maßnahme festhalten und nach Mustern suchen; Nachgespräche führen und einen Krisenplan vereinbaren.',q:['crone2010','petermann2012']}
],

/* ---------------------------------------------------------------------
   Aus dem DS (ELDiB-Generator)
   --------------------------------------------------------------------- */
ds:{
 /* Auswahlfeld „Diagnosen“ → Profil */
 diagnosen:{adhs:'adhs',ass:'autismus',lernstoerung:'lernstoerung',sprachstoerung:'sprache',bindung:'bindung',angst:'angst',opposition:'sozialverhalten'},
 /* Oberbegriffe: Das Team wählt, welches Bild gemeint ist */
 oberbegriff:{emotional:{name:'emotionale Störung',auswahl:['angst','depression','regulation','instabil','trauma']}},
 /* Deutung: Arbeitshypothesen (ab 5 von 7) */
 hypothesen:{i_hyp_aufmerksamkeit:'adhs',i_hyp_regulation:'regulation',i_hyp_bindung:'bindungsunsicher',i_hyp_trauma:'trauma',i_hyp_sozial:'angst'},
 /* Deutung: Hypothesen, die die Lebenslage beschreiben */
 umfeld:{i_hyp_belastung:'belastung',i_hyp_entwicklung:'entwicklung',i_hyp_ueberforderung:'ueberforderung',i_hyp_unterforderung:'unterforderung'},
 /* Anlass der Anfrage → beobachtet */
 anlass:{aufmerksamkeit:'adhs',aggression:'sozialverhalten',aengste:'angst',rueckzug:'depression',emotional:'regulation',schulverweigerung:'schulvermeidung'}
},

/* Kurztexte der Warnsignale des Screenings */
warnKurz:{suizid:'Äußerungen über Tod oder Suizid',selbstverletzung:'Hinweise auf Selbstverletzung',gewalt:'Hinweise auf Gewalt oder Vernachlässigung',gefahr:'Gefährdung von sich oder anderen',
 sucht:'Hinweise auf Suchtmittel',essen:'auffälliges Essverhalten',wechsel:'plötzliche starke Veränderung',wahrnehmung:'ungewöhnliche Wahrnehmungen'}
};
