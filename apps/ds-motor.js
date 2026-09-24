/* DS-Text-Motor des ELDiB-Generators (erzeugt von app/build.cjs, nicht von Hand ändern).
   Wird vom CDSE Hub geladen: apps/ds-motor.js */
// ==== 42-ds-bank-struktur.js ====
// =====================================================================
// DS-Baukasten: Aufbau (sprachunabhängig)
// ---------------------------------------------------------------------
// Jede Aussage wird von 1 (trifft gar nicht zu) bis 7 (trifft voll zu)
// bewertet; ohne Bewertung erscheint sie nicht im Bericht.
//   pol  +1 = eine hohe Bewertung ist eine Stärke (z. B. "hält Regeln ein")
//        -1 = eine hohe Bewertung ist eine Schwierigkeit (z. B. "Wutausbrüche")
//   fest     Reihenfolge im Text folgt der Liste (Deutung), nicht Stärke/Schwäche
//   'vorne'  (3. Wert) Satz steht immer am Anfang seines Themas
// Die Texte stehen in 43-ds-texte-de.js, 44-ds-texte-fr.js, 45-ds-texte-en.js.
// Auswahlfelder ("chips") liefern Aufzählungen, z. B. Stärken oder Wünsche.
// =====================================================================
const DS_AUFBAU = {
  schule: {
    themen: [
      { id: 'lernen', aussagen: [['s_motiv', 1], ['s_konz', 1], ['s_selbst', 1], ['s_sorgfalt', 1], ['s_leistung', 1], ['s_unruhe', -1]] },
      { id: 'verhalten', aussagen: [['s_regeln', 1], ['s_impuls', -1], ['s_frust', 1], ['s_wut', -1], ['s_aggr', -1], ['s_verweig', -1], ['s_rueckzug', -1], ['s_angst', -1], ['s_ausgeglichen', 1]] },
      { id: 'beziehung', aussagen: [['s_peers', 1], ['s_konflikt', -1], ['s_erwachsene', 1], ['s_hilfe', 1], ['s_selbstwert', 1]] }
    ],
    chips: ['s_staerken', 's_hilft', 's_erwartung']
  },
  kind: {
    themen: [
      { id: 'schule', aussagen: [['k_offen', 1, 'vorne'], ['k_wohl', 1], ['k_klasse', 1], ['k_lehrer', 1], ['k_leistung', 1], ['k_ungerecht', -1]] },
      { id: 'selbst', aussagen: [['k_selbstwert', 1], ['k_druck', -1], ['k_angst', -1], ['k_einsicht', 1], ['k_veraenderung', 1]] },
      { id: 'umfeld', aussagen: [['k_freunde', 1], ['k_familie', 1]] }
    ],
    chips: ['k_interessen', 'k_wuensche']
  },
  eltern: {
    themen: [
      { id: 'alltag', aussagen: [['e_alltag', 1], ['e_regeln', 1], ['e_wut', -1], ['e_geschwister', -1], ['e_rueckzug', -1], ['e_angst', -1], ['e_koerper', -1], ['e_medien', -1], ['e_hausaufgaben', -1]] },
      { id: 'familie', aussagen: [['e_beziehung', 1], ['e_struktur', 1], ['e_konsequenz', 1], ['e_belastung', -1]] },
      { id: 'zusammenarbeit', aussagen: [['e_sicht_schule', 1], ['e_kooperation', 1]] }
    ],
    chips: ['e_staerken', 'e_erwartung']
  },
  beobachtung: {
    themen: [
      { id: 'arbeit', aussagen: [['b_start', 1], ['b_konz', 1], ['b_anweisung', 1], ['b_hilfe', 1], ['b_unruhe', -1], ['b_ablenk', -1]] },
      { id: 'verhalten', aussagen: [['b_regeln', 1], ['b_frust', 1], ['b_uebergang', 1], ['b_lob', 1], ['b_stoer', -1]] },
      { id: 'kontakt', aussagen: [['b_peers', 1], ['b_erwachsene', 1], ['b_isol', -1], ['b_provo', -1]] }
    ],
    chips: []
  },
  deutung: {
    fest: true,
    themen: [
      { id: 'quellen', aussagen: [['i_uebereinstimmung', 1], ['i_beobachtung', 1], ['i_eldib', 1]] },
      { id: 'muster', aussagen: [['i_unstrukturiert', 0], ['i_anforderung', 0], ['i_beziehung', 0], ['i_einzel', 0], ['i_schule', 0], ['i_zuhause', 0]] },
      { id: 'aengste', aussagen: [['i_angst_verlassen', 0], ['i_angst_unzul', 0], ['i_angst_schuld', 0], ['i_angst_konflikt', 0], ['i_angst_identitaet', 0]] },
      { id: 'abwehr', aussagen: [['i_abw_rueckzug', 0], ['i_abw_vermeidung', 0], ['i_abw_aggression', 0], ['i_abw_regression', 0], ['i_abw_clown', 0], ['i_abw_kontrolle', 0], ['i_abw_projektion', 0], ['i_abw_verleugnung', 0]] },
      { id: 'hypothesen', aussagen: [['i_hyp_entwicklung', 0], ['i_hyp_regulation', 0], ['i_hyp_belastung', 0], ['i_hyp_bindung', 0], ['i_hyp_sozial', 0], ['i_hyp_aufmerksamkeit', 0], ['i_hyp_ueberforderung', 0], ['i_hyp_unterforderung', 0], ['i_hyp_trauma', 0]] }
    ],
    chips: []
  },
  beduerfnisse: {
    fest: true,
    themen: [
      { id: 'beduerfnisse', aussagen: [['n_struktur', 0], ['n_beziehung', 0], ['n_erfolg', 0], ['n_regulation', 0], ['n_grenzen', 0], ['n_sozial', 0], ['n_organisation', 0], ['n_differenzierung', 0], ['n_therapie', 0], ['n_familie', 0]] }
    ],
    chips: ['ressourcen']
  }
};

// Auswahlfelder: Schlüssel je Gruppe (Texte je Sprache in DS_TEXTE[lang].chips)
const DS_CHIPS = {
  s_staerken:  ['hilfsbereit', 'kreativ', 'humorvoll', 'sportlich', 'sprachlich', 'mathematisch', 'technisch', 'musikalisch', 'fantasievoll', 'wissbegierig', 'freundlich', 'zuverlaessig'],
  s_hilft:     ['ansagen', 'wiederholung', 'visualisierung', 'bewegung', 'rueckzugsort', 'einzelansprache', 'lob', 'vorwarnung', 'kleingruppe', 'naehe', 'struktur'],
  s_erwartung: ['strategien', 'verhalten', 'konzentration', 'integration', 'stabilitaet', 'leistung', 'therapie', 'eltern', 'foerderort', 'abklaerung'],
  k_interessen:['sport', 'gaming', 'musik', 'lesen', 'kreatives', 'freunde', 'tiere', 'natur', 'technik', 'kochen'],
  k_wuensche:  ['noten', 'freunde', 'streit', 'ruhe', 'druck', 'verstanden', 'hilfe', 'klasse', 'schule', 'inruhe'],
  e_staerken:  ['hilfsbereit', 'liebevoll', 'selbststaendig', 'kreativ', 'humorvoll', 'sportlich', 'verantwortung', 'offen'],
  e_erwartung: ['verhalten', 'entspannung', 'strategien', 'leistung', 'abklaerung', 'therapie', 'beratung', 'foerderort', 'verstehen', 'bestaetigung'],
  ressourcen:  ['kognitiv', 'kreativ', 'sportlich', 'musisch', 'humor', 'empathie', 'neugier', 'begeisterung', 'hilfsbereit', 'verantwortung', 'einzelbeziehung', 'lernbereit', 'vertrauensperson', 'familie', 'hobbys', 'reflexion'],
  // Fakten-Abschnitte
  anlass:      ['verhalten_schule', 'verhalten_zuhause', 'emotional', 'sozial', 'leistung', 'aufmerksamkeit', 'aggression', 'rueckzug', 'aengste', 'schulverweigerung'],
  anliegen:    ['isa', 'conseil', 'cst', 'clapa', 'annexe', 'lernwerkstatt', 'beschulung', 'diagnostik'],
  empfohlen:   ['lehrperson', 'eseb', 'schulleitung', 'arzt', 'psychologe', 'eltern'],
  diagnosen:   ['adhs', 'ass', 'lernstoerung', 'sprachstoerung', 'emotional', 'bindung', 'angst', 'opposition', 'andere'],
  ereignisse:  ['trennung', 'umzug', 'verlust', 'krankheit', 'konflikte', 'trauma', 'migration'],
  betreuung:   ['maison_relais', 'grosseltern', 'tagesmutter', 'keine'],
  sprachen:    ['lb', 'de', 'fr', 'pt', 'en', 'it', 'es', 'andere'],
  verfahren:   ['eldib', 'sdq', 'wisc', 'andere'],
  empf_familie:['step', 'erziehungsberatung', 'familientherapie', 'tagesstruktur', 'austausch', 'medien', 'freizeit'],
  empf_schule: ['sitzplatz', 'differenzierung', 'verstaerker', 'regeln', 'auszeit', 'uebergaenge', 'visualisierung', 'bewegung', 'iebs', 'bezugsperson'],
  empf_region: ['eseb', 'isa', 'conseil', 'lernwerkstatt', 'psychotherapie', 'ergotherapie', 'logopaedie', 'psychiatrie'],
  cni:         ['diag_kompetenzzentrum', 'beratung_eltern', 'beratung_fachleute', 'lernwerkstatt', 'isa', 'beschulung', 'clapa', 'cst', 'annexe', 'ausland', 'rehabilitation', 'abschluss', 'schliessung']
};

// Bewertung (1-7) -> Formulierungsstufe 0..4
function dsStufe(r) { return r <= 2 ? 0 : (r === 3 ? 1 : (r === 4 ? 2 : (r === 5 ? 3 : 4))); }

// ==== 43-ds-texte-de.js ====
// =====================================================================
// DS-Baukasten: deutsche Texte
// ---------------------------------------------------------------------
// q   = Aussage zum Anklicken (Fragebogen)
// t   = Formulierungen für den Bericht je Stufe:
//       [0] 1–2 trifft (gar) nicht zu  [1] 3 eher nicht  [2] 4 teils/teils
//       [3] 5 eher zu  [4] 6–7 trifft (voll) zu      null = kein Satz
// np  = Kurzform für Aufzählungen ("Hinweise auf …", Akkusativ)
// Platzhalter:
//   {N} Name bzw. er/sie (Subjekt)  {Nd} Dativ  {Na} Akkusativ  {Name} immer der Name
//   {er} {ihm} {ihn} immer Pronomen; {sein} {seine} {seinen} {seinem} {seiner} {seines}
//   [[männlich|weiblich]]   {{Einzahl|Mehrzahl}} (bei Quellen/Listen)
//   {KONTRAST} wird zu "jedoch ", wenn davor Stärken beschrieben wurden
//   {Q}/{Qd}/{Qg} Eltern-Quelle (die Mutter/der Mutter …), {QS}/{QSd} Schul-Quelle
// Stil: sachlich, beschreibend, ressourcenorientiert; Gegenwart, Beobachtung im Präteritum.
// =====================================================================
const DS_TEXTE = {};
DS_TEXTE.de = {
  skala: { 1: 'trifft gar nicht zu', 2: '', 3: '', 4: 'teils/teils', 5: '', 6: '', 7: 'trifft voll zu', leer: 'keine Angabe' },

  a: {
    // ---------------- 3.2 Sichtweise der Schule ----------------
    s_motiv: { q: 'Beteiligt sich motiviert am Unterricht.', t: [
      '{N} beteiligt sich {KONTRAST}kaum am Unterricht und muss immer wieder zur Mitarbeit ermutigt werden.',
      'Am Unterricht beteiligt {N} sich {KONTRAST}eher zurückhaltend; die Motivation schwankt deutlich.',
      'Die Beteiligung am Unterricht ist {KONTRAST}wechselhaft und hängt stark von Thema und Tagesform ab.',
      'Am Unterricht beteiligt {N} sich überwiegend motiviert.',
      '{N} beteiligt sich motiviert und interessiert am Unterricht.'] },
    s_konz: { q: 'Kann sich im Unterricht altersgemäß konzentrieren.', t: [
      'Konzentriertes Arbeiten gelingt {Nd} {KONTRAST}kaum; {er} lässt sich schon von kleinen Reizen ablenken.',
      '{N} kann sich {KONTRAST}nur kurz konzentrieren und ist leicht ablenkbar.',
      'Die Konzentration gelingt {Nd} {KONTRAST}nur zeitweise; vor allem in längeren Arbeitsphasen lässt sie nach.',
      '{N} kann sich im Unterricht meist altersgemäß konzentrieren.',
      '{N} kann sich im Unterricht gut und ausdauernd konzentrieren.'] },
    s_selbst: { q: 'Beginnt und beendet Aufgaben selbstständig.', t: [
      'Aufgaben beginnt {N} {KONTRAST}kaum ohne Unterstützung, und begonnene Arbeiten bleiben häufig unvollendet.',
      '{N} braucht {KONTRAST}häufig Hilfe, um Aufgaben zu beginnen und zu Ende zu führen.',
      'Aufgaben beginnt und beendet {N} nur teilweise selbstständig und braucht dabei immer wieder Anstöße.',
      'Aufgaben beginnt und beendet {N} meist selbstständig.',
      '{N} beginnt Aufgaben selbstständig und führt sie zuverlässig zu Ende.'] },
    s_sorgfalt: { q: 'Arbeitet sorgfältig und organisiert.', t: [
      '{N} arbeitet {KONTRAST}oft flüchtig und unorganisiert; Material und Hausaufgaben fehlen häufig.',
      'Sorgfalt und Arbeitsorganisation gelingen {Nd} {KONTRAST}eher selten.',
      'Sorgfalt und Arbeitsorganisation sind {KONTRAST}wechselhaft.',
      '{N} arbeitet überwiegend sorgfältig und hält {sein} Material meist in Ordnung.',
      '{N} arbeitet sorgfältig und gut organisiert.'] },
    s_leistung: { q: 'Erreicht die Lernziele der Klassenstufe.', t: [
      'Die schulischen Leistungen liegen {KONTRAST}deutlich unter den Anforderungen der Klassenstufe.',
      'Die schulischen Leistungen liegen {KONTRAST}teilweise unter den Anforderungen der Klassenstufe.',
      'Die Lernziele der Klassenstufe erreicht {N} in einzelnen Fächern, in anderen {KONTRAST}noch nicht.',
      'Die Lernziele der Klassenstufe erreicht {N} weitgehend.',
      'Die Lernziele der Klassenstufe erreicht {N} gut.'] },
    s_unruhe: { q: 'Ist motorisch unruhig.', np: 'motorische Unruhe', t: [
      null,
      'Motorische Unruhe zeigt sich nur vereinzelt.',
      'Zeitweise ist {N} motorisch unruhig, etwa in längeren Sitzphasen.',
      '{N} ist {KONTRAST}häufig motorisch unruhig und kann nur schwer ruhig sitzen bleiben.',
      '{N} ist {KONTRAST}ausgeprägt motorisch unruhig; längeres ruhiges Sitzen ist {Nd} kaum möglich.'] },
    s_regeln: { q: 'Hält sich an Klassenregeln und Absprachen.', t: [
      'An Klassenregeln und Absprachen hält {N} sich {KONTRAST}kaum.',
      'An Regeln und Absprachen hält {N} sich {KONTRAST}nur mit viel Unterstützung.',
      'Die Klassenregeln kennt {N}, hält sich aber nur teilweise daran.',
      'An Klassenregeln und Absprachen hält {N} sich meistens.',
      '{N} hält sich zuverlässig an Klassenregeln und Absprachen.'] },
    s_impuls: { q: 'Handelt impulsiv, ohne nachzudenken.', np: 'impulsives Handeln', t: [
      null,
      'Impulsives Verhalten kommt nur vereinzelt vor.',
      'In aufregenden Situationen handelt {N} zeitweise impulsiv.',
      '{N} handelt {KONTRAST}häufig impulsiv, ohne die Folgen zu bedenken.',
      '{N} handelt {KONTRAST}sehr häufig impulsiv; es fällt {Nd} schwer, erst nachzudenken und dann zu handeln.'] },
    s_frust: { q: 'Kann mit Frustration und Misserfolg umgehen.', t: [
      'Mit Frustration und Misserfolg kann {N} {KONTRAST}kaum umgehen; schon kleine Rückschläge führen zu heftigen Reaktionen.',
      'Mit Frustration und Misserfolg umzugehen, fällt {Nd} {KONTRAST}schwer.',
      'Mit Frustration geht {N} {KONTRAST}wechselhaft um: Manchmal gelingt es {ihm}, Rückschläge auszuhalten, manchmal nicht.',
      'Mit Frustration und Misserfolg geht {N} meist angemessen um.',
      '{N} kann Frustration und Misserfolg gut aushalten.'] },
    s_wut: { q: 'Reagiert mit Wutausbrüchen.', np: 'Wutausbrüche', t: [
      null,
      'Wutausbrüche treten nur selten auf.',
      'Gelegentlich kommt es zu Wutausbrüchen.',
      '{N} reagiert {KONTRAST}immer wieder mit Wutausbrüchen, vor allem bei Kritik oder Grenzsetzungen.',
      '{N} zeigt {KONTRAST}häufig heftige Wutausbrüche, die den Unterricht deutlich beeinträchtigen.'] },
    s_aggr: { q: 'Zeigt verbale oder körperliche Aggression.', np: 'aggressives Verhalten', t: [
      null,
      'Aggressives Verhalten zeigt {N} nur vereinzelt.',
      'In Konfliktsituationen reagiert {N} zeitweise verbal oder körperlich aggressiv.',
      '{N} reagiert {KONTRAST}häufig verbal oder körperlich aggressiv gegenüber anderen.',
      '{N} zeigt {KONTRAST}ausgeprägtes verbal und körperlich aggressives Verhalten gegenüber anderen.'] },
    s_verweig: { q: 'Verweigert Aufgaben oder Anweisungen.', np: 'Verweigerungsverhalten', t: [
      null,
      'Aufgaben verweigert {N} nur selten.',
      'Zeitweise verweigert {N} Aufgaben oder Anweisungen, besonders bei hohen Anforderungen.',
      '{N} verweigert {KONTRAST}häufig Aufgaben oder Anweisungen.',
      '{N} verweigert {KONTRAST}sehr häufig Aufgaben und Anweisungen; eine Mitarbeit ist oft nur mit enger Begleitung möglich.'] },
    s_rueckzug: { q: 'Zieht sich zurück, wirkt still oder in sich gekehrt.', np: 'Rückzugstendenzen', t: [
      null,
      'Rückzug zeigt sich nur vereinzelt.',
      'Zeitweise zieht {N} sich zurück und wirkt in sich gekehrt.',
      '{N} zieht sich {KONTRAST}häufig zurück und wirkt still und in sich gekehrt.',
      '{N} zieht sich {KONTRAST}stark zurück und nimmt von sich aus kaum Kontakt auf.'] },
    s_angst: { q: 'Wirkt ängstlich oder angespannt (z. B. Versagensängste).', np: 'ausgeprägte Ängste', t: [
      null,
      'Ängstlichkeit zeigt sich nur selten.',
      'In Leistungssituationen wirkt {N} zeitweise angespannt oder ängstlich.',
      '{N} wirkt {KONTRAST}häufig ängstlich und angespannt, besonders bei Leistungsanforderungen.',
      '{N} wirkt {KONTRAST}sehr ängstlich und angespannt; Versagensängste prägen den Schulalltag deutlich.'] },
    s_ausgeglichen: { q: 'Wirkt emotional ausgeglichen.', t: [
      '{N} wirkt {KONTRAST}emotional sehr unausgeglichen; {seine} Stimmung schwankt stark.',
      '{N} wirkt {KONTRAST}emotional oft unausgeglichen.',
      'Emotional wirkt {N} {KONTRAST}wechselhaft: An manchen Tagen ausgeglichen, an anderen gereizt.',
      '{N} wirkt emotional überwiegend ausgeglichen.',
      '{N} wirkt emotional ausgeglichen und stabil.'] },
    s_peers: { q: 'Hat gute Kontakte zu Mitschülerinnen und Mitschülern.', t: [
      'Zu den Mitschülerinnen und Mitschülern hat {N} {KONTRAST}kaum Kontakt und wirkt in der Klasse isoliert.',
      'Kontakte zu Mitschülerinnen und Mitschülern gelingen {Nd} {KONTRAST}nur eingeschränkt.',
      'Zu einzelnen Mitschülerinnen und Mitschülern hat {N} Kontakt, ist in der Klassengemeinschaft aber nur teilweise integriert.',
      '{N} hat überwiegend gute Kontakte zu Mitschülerinnen und Mitschülern.',
      '{N} ist in der Klasse gut integriert und hat tragfähige Kontakte zu Mitschülerinnen und Mitschülern.'] },
    s_konflikt: { q: 'Gerät häufig in Konflikte mit Mitschülern.', np: 'häufige Konflikte mit Mitschülern', t: [
      null,
      'Konflikte mit Mitschülern sind selten.',
      'Gelegentlich gerät {N} in Konflikte mit Mitschülern.',
      '{N} gerät {KONTRAST}häufig in Konflikte mit Mitschülern.',
      '{N} gerät {KONTRAST}sehr häufig in Konflikte mit Mitschülern, die {er} kaum ohne Hilfe lösen kann.'] },
    s_erwachsene: { q: 'Hat eine vertrauensvolle Beziehung zu den Lehrpersonen.', t: [
      'Die Beziehung zu den Lehrpersonen ist {KONTRAST}deutlich belastet.',
      'Die Beziehung zu den Lehrpersonen ist {KONTRAST}angespannt.',
      'Die Beziehung zu den Lehrpersonen ist {KONTRAST}wechselhaft.',
      'Zu den Lehrpersonen hat {N} überwiegend eine gute Beziehung.',
      'Zu den Lehrpersonen hat {N} eine vertrauensvolle Beziehung.'] },
    s_hilfe: { q: 'Nimmt Hilfe und Unterstützung an.', t: [
      'Hilfe und Unterstützung lehnt {N} {KONTRAST}meist ab.',
      'Hilfe nimmt {N} {KONTRAST}nur zögerlich an.',
      'Hilfe nimmt {N} {KONTRAST}nur teilweise an, abhängig von Situation und Person.',
      'Hilfe und Unterstützung nimmt {N} meist gut an.',
      'Hilfe und Unterstützung nimmt {N} bereitwillig an.'] },
    s_selbstwert: { q: 'Wirkt selbstbewusst und traut sich etwas zu.', t: [
      '{N} traut sich {KONTRAST}sehr wenig zu und wirkt im Selbstwert deutlich verunsichert.',
      '{N} traut sich {KONTRAST}wenig zu und wirkt eher unsicher.',
      '{sein} Selbstvertrauen wirkt {KONTRAST}wechselhaft.',
      '{N} wirkt überwiegend selbstbewusst.',
      '{N} wirkt selbstbewusst und traut sich etwas zu.'] },

    // ---------------- 3.3 Sichtweise des Kindes ----------------
    k_offen: { q: 'Spricht im Gespräch offen über sich und die Situation.', t: [
      'Im Gespräch{datum: am {datum}} zeigte {N} sich {KONTRAST}sehr verschlossen und sprach kaum über sich und die Situation.',
      'Im Gespräch{datum: am {datum}} zeigte {N} sich {KONTRAST}eher zurückhaltend.',
      'Im Gespräch{datum: am {datum}} öffnete {N} sich nach anfänglicher Zurückhaltung teilweise.',
      'Im Gespräch{datum: am {datum}} zeigte {N} sich überwiegend offen.',
      'Im Gespräch{datum: am {datum}} zeigte {N} sich offen und sprach bereitwillig über sich und die Situation.'] },
    k_wohl: { q: 'Fühlt sich in der Schule wohl.', t: [
      '{N} berichtet, sich in der Schule {KONTRAST}nicht wohlzufühlen und ungern hinzugehen.',
      '{N} berichtet, sich in der Schule {KONTRAST}oft nicht wohlzufühlen.',
      'Das eigene Wohlbefinden in der Schule beschreibt {N} {KONTRAST}als wechselhaft.',
      '{N} gibt an, sich in der Schule meistens wohlzufühlen.',
      '{N} gibt an, gerne zur Schule zu gehen und sich dort wohlzufühlen.'] },
    k_klasse: { q: 'Fühlt sich in der Klasse angenommen.', t: [
      'In der Klasse fühlt {N} sich nach eigenen Angaben {KONTRAST}nicht angenommen.',
      'In der Klasse fühlt {N} sich {KONTRAST}eher als [[Außenseiter|Außenseiterin]].',
      'In der Klasse fühlt {N} sich {KONTRAST}nur teilweise zugehörig.',
      'In der Klasse fühlt {N} sich überwiegend angenommen.',
      'In der Klasse fühlt {N} sich angenommen und zugehörig.'] },
    k_lehrer: { q: 'Kommt mit den Lehrpersonen gut zurecht.', t: [
      'Mit den Lehrpersonen kommt {N} nach eigener Aussage {KONTRAST}nicht zurecht.',
      'Mit den Lehrpersonen kommt {N} nach eigener Aussage {KONTRAST}nur schwer zurecht.',
      'Mit einzelnen Lehrpersonen kommt {N} gut zurecht, mit anderen {KONTRAST}weniger.',
      'Mit den Lehrpersonen kommt {N} nach eigener Aussage meist gut zurecht.',
      'Mit den Lehrpersonen kommt {N} nach eigener Aussage gut zurecht.'] },
    k_leistung: { q: 'Schätzt die eigenen schulischen Fähigkeiten positiv ein.', t: [
      'Die eigenen schulischen Fähigkeiten schätzt {N} {KONTRAST}sehr negativ ein.',
      'Die eigenen schulischen Fähigkeiten schätzt {N} {KONTRAST}eher gering ein.',
      'Die eigenen schulischen Fähigkeiten schätzt {N} {KONTRAST}unterschiedlich ein: In manchen Fächern traut {er} sich viel zu, in anderen wenig.',
      'Die eigenen schulischen Fähigkeiten schätzt {N} überwiegend positiv ein.',
      'Die eigenen schulischen Fähigkeiten schätzt {N} positiv ein.'] },
    k_ungerecht: { q: 'Fühlt sich ungerecht behandelt.', np: 'ein Gefühl, ungerecht behandelt zu werden', t: [
      null,
      'Ungerecht behandelt fühlt {N} sich nur selten.',
      'Manchmal fühlt {N} sich ungerecht behandelt.',
      '{N} fühlt sich {KONTRAST}häufig ungerecht behandelt, vor allem bei Konflikten und Konsequenzen.',
      '{N} fühlt sich {KONTRAST}sehr häufig ungerecht behandelt und erlebt die eigenen Schwierigkeiten vor allem als Reaktion auf andere.'] },
    k_selbstwert: { q: 'Spricht positiv über sich selbst.', t: [
      'Über sich selbst spricht {N} {KONTRAST}sehr abwertend.',
      'Über sich selbst spricht {N} {KONTRAST}eher abwertend.',
      'Über sich selbst äußert {N} sich {KONTRAST}teils positiv, teils abwertend.',
      'Über sich selbst spricht {N} überwiegend positiv.',
      'Über sich selbst spricht {N} positiv und kann eigene Stärken benennen.'] },
    k_druck: { q: 'Erlebt Leidensdruck (belastet, traurig, überfordert).', np: 'einen erhöhten Leidensdruck', t: [
      null,
      'Einen Leidensdruck beschreibt {N} kaum.',
      '{N} beschreibt einen gewissen Leidensdruck.',
      '{N} beschreibt {KONTRAST}einen deutlichen Leidensdruck und fühlt sich häufig belastet.',
      '{N} beschreibt {KONTRAST}einen hohen Leidensdruck; {er} fühlt sich stark belastet und traurig.'] },
    k_angst: { q: 'Berichtet von Ängsten oder Sorgen.', np: 'Ängste und Sorgen', t: [
      null,
      'Ängste oder Sorgen erwähnt {N} kaum.',
      '{N} berichtet von einzelnen Ängsten und Sorgen.',
      '{N} berichtet {KONTRAST}von deutlichen Ängsten und Sorgen.',
      '{N} berichtet {KONTRAST}von ausgeprägten Ängsten und Sorgen, die {ihn} stark beschäftigen.'] },
    k_einsicht: { q: 'Erkennt eigene Schwierigkeiten (Problembewusstsein).', t: [
      'Ein Bewusstsein für die eigenen Schwierigkeiten zeigt {N} {KONTRAST}nicht.',
      'Die eigenen Schwierigkeiten erkennt {N} {KONTRAST}nur ansatzweise.',
      'Die eigenen Schwierigkeiten sieht {N} {KONTRAST}nur teilweise.',
      'Die eigenen Schwierigkeiten kann {N} überwiegend benennen.',
      'Die eigenen Schwierigkeiten kann {N} klar benennen und reflektieren.'] },
    k_veraenderung: { q: 'Möchte etwas verändern und ist offen für Hilfe.', t: [
      'Einen Wunsch nach Veränderung äußert {N} {KONTRAST}nicht; Hilfe lehnt {er} ab.',
      'Einen Wunsch nach Veränderung äußert {N} {KONTRAST}kaum.',
      'Hilfe gegenüber zeigt {N} sich {KONTRAST}nur teilweise offen.',
      '{N} wünscht sich Veränderungen und ist für Hilfe überwiegend offen.',
      '{N} wünscht sich ausdrücklich Veränderungen und ist für Hilfe offen.'] },
    k_freunde: { q: 'Hat Freundinnen oder Freunde.', t: [
      'Freundschaften hat {N} nach eigenen Angaben {KONTRAST}keine.',
      'Freundschaften hat {N} nach eigenen Angaben {KONTRAST}kaum.',
      '{N} nennt {KONTRAST}einzelne Freundinnen oder Freunde.',
      '{N} hat nach eigenen Angaben einige Freundinnen und Freunde.',
      '{N} berichtet von mehreren guten Freundschaften.'] },
    k_familie: { q: 'Beschreibt die Beziehung zur Familie positiv.', t: [
      'Die Beziehung zur Familie beschreibt {N} {KONTRAST}als sehr belastet.',
      'Die Beziehung zur Familie beschreibt {N} {KONTRAST}als schwierig.',
      'Die Beziehung zur Familie beschreibt {N} {KONTRAST}als wechselhaft.',
      'Die Beziehung zur Familie beschreibt {N} überwiegend positiv.',
      'Die Beziehung zur Familie beschreibt {N} als positiv und unterstützend.'] },

    // ---------------- 3.4 Sichtweise der Eltern ----------------
    e_alltag: { q: 'Kommt zu Hause im Alltag gut zurecht.', t: [
      'Im häuslichen Alltag kommt es {KONTRAST}ständig zu Schwierigkeiten.',
      'Der häusliche Alltag ist {KONTRAST}häufig von Schwierigkeiten geprägt.',
      'Im häuslichen Alltag gibt es {KONTRAST}sowohl ruhige Phasen als auch schwierige Situationen.',
      'Zu Hause kommt {N} im Alltag überwiegend gut zurecht.',
      'Zu Hause kommt {N} im Alltag gut zurecht.'] },
    e_regeln: { q: 'Hält sich zu Hause an Regeln und Absprachen.', t: [
      'An Regeln und Absprachen hält {N} sich zu Hause {KONTRAST}kaum.',
      'An Regeln und Absprachen hält {N} sich zu Hause {KONTRAST}nur selten.',
      'An Regeln und Absprachen hält {N} sich zu Hause {KONTRAST}nur teilweise.',
      'An Regeln und Absprachen hält {N} sich zu Hause meistens.',
      'An Regeln und Absprachen hält {N} sich zu Hause zuverlässig.'] },
    e_wut: { q: 'Zeigt zu Hause Wutausbrüche.', np: 'Wutausbrüche', t: [
      null,
      'Wutausbrüche kommen zu Hause nur selten vor.',
      'Gelegentlich kommt es zu Hause zu Wutausbrüchen.',
      'Zu Hause kommt es {KONTRAST}häufig zu Wutausbrüchen, besonders bei Grenzsetzungen.',
      'Zu Hause kommt es {KONTRAST}sehr häufig zu heftigen Wutausbrüchen, die den Familienalltag stark belasten.'] },
    e_geschwister: { q: 'Hat häufig Konflikte mit Geschwistern.', np: 'Geschwisterkonflikte', t: [
      null,
      'Konflikte mit den Geschwistern sind selten.',
      'Mit den Geschwistern kommt es gelegentlich zu Konflikten.',
      'Mit den Geschwistern kommt es {KONTRAST}häufig zu Konflikten.',
      'Mit den Geschwistern kommt es {KONTRAST}sehr häufig zu heftigen Konflikten.'] },
    e_rueckzug: { q: 'Zieht sich zu Hause zurück.', np: 'Rückzug', t: [
      null,
      'Rückzug zeigt {N} zu Hause nur selten.',
      'Zeitweise zieht {N} sich zu Hause zurück.',
      'Zu Hause zieht {N} sich {KONTRAST}häufig in {sein} Zimmer zurück.',
      'Zu Hause zieht {N} sich {KONTRAST}sehr stark zurück und ist für die Familie kaum erreichbar.'] },
    e_angst: { q: 'Zeigt zu Hause Ängste oder Sorgen.', np: 'Ängste', t: [
      null,
      'Ängste zeigen sich zu Hause kaum.',
      'Zu Hause zeigt {N} gelegentlich Ängste oder Sorgen.',
      'Zu Hause zeigt {N} {KONTRAST}häufig Ängste und Sorgen.',
      'Zu Hause zeigt {N} {KONTRAST}ausgeprägte Ängste, die den Alltag deutlich einschränken.'] },
    e_koerper: { q: 'Hat Schlafprobleme oder körperliche Beschwerden (z. B. Bauchschmerzen).', np: 'psychosomatische Beschwerden', t: [
      null,
      'Schlafprobleme oder körperliche Beschwerden treten nur selten auf.',
      'Gelegentlich treten Schlafprobleme oder körperliche Beschwerden auf.',
      '{N} hat {KONTRAST}häufig Schlafprobleme oder klagt über körperliche Beschwerden wie Bauch- oder Kopfschmerzen.',
      '{N} hat {KONTRAST}ausgeprägte Schlafprobleme und klagt sehr häufig über körperliche Beschwerden.'] },
    e_medien: { q: 'Verbringt sehr viel Zeit mit Bildschirmmedien.', np: 'einen problematischen Medienkonsum', t: [
      null,
      'Die Mediennutzung ist nach Angaben {Qg} überschaubar.',
      '{N} verbringt zeitweise viel Zeit mit Bildschirmmedien.',
      '{N} verbringt {KONTRAST}viel Zeit mit Bildschirmmedien; Begrenzungen führen häufig zu Konflikten.',
      '{N} verbringt {KONTRAST}sehr viel Zeit mit Bildschirmmedien; die Nutzung ist kaum zu begrenzen.'] },
    e_hausaufgaben: { q: 'Hausaufgaben führen zu Konflikten.', np: 'Konflikte um die Hausaufgaben', t: [
      null,
      'Hausaufgaben führen nur selten zu Konflikten.',
      'Die Hausaufgaben führen gelegentlich zu Konflikten.',
      'Die Hausaufgaben führen {KONTRAST}häufig zu Konflikten.',
      'Die Hausaufgaben führen {KONTRAST}fast täglich zu heftigen Konflikten.'] },
    e_beziehung: { q: 'Die Beziehung zum Kind wird als gut beschrieben.', t: [
      'Die Beziehung zu {Nd} {{beschreibt|beschreiben}} {Q} {KONTRAST}als sehr belastet.',
      'Die Beziehung zu {Nd} {{beschreibt|beschreiben}} {Q} {KONTRAST}als angespannt.',
      'Die Beziehung zu {Nd} {{beschreibt|beschreiben}} {Q} {KONTRAST}als ambivalent.',
      'Die Beziehung zu {Nd} {{beschreibt|beschreiben}} {Q} als überwiegend gut.',
      'Die Beziehung zu {Nd} {{beschreibt|beschreiben}} {Q} als liebevoll und tragfähig.'] },
    e_struktur: { q: 'Der Familienalltag ist klar strukturiert.', t: [
      'Im Familienalltag fehlt es {KONTRAST}weitgehend an festen Strukturen und Routinen.',
      'Der Familienalltag ist {KONTRAST}wenig strukturiert.',
      'Der Familienalltag ist {KONTRAST}nur teilweise strukturiert.',
      'Der Familienalltag ist überwiegend klar strukturiert.',
      'Der Familienalltag ist klar strukturiert und von verlässlichen Routinen geprägt.'] },
    e_konsequenz: { q: 'Die Erziehung ist klar und konsequent.', t: [
      'Eine klare und konsequente Erziehung gelingt {Qd} {KONTRAST}kaum; {Q} {{wirkt|wirken}} in der Situation überfordert.',
      'Eine konsequente Umsetzung von Regeln fällt {Qd} {KONTRAST}schwer.',
      'Regeln werden {KONTRAST}nur teilweise konsequent umgesetzt.',
      'Die Erziehung ist überwiegend klar und konsequent.',
      '{Q} {{handelt|handeln}} in der Erziehung klar und konsequent.'] },
    e_belastung: { q: 'Die Eltern fühlen sich durch die Situation stark belastet.', np: 'eine besondere Belastung der Familie', t: [
      null,
      'Eine besondere Belastung durch die Situation {{beschreibt|beschreiben}} {Q} kaum.',
      '{Q} {{fühlt|fühlen}} sich durch die Situation teilweise belastet.',
      '{Q} {{fühlt|fühlen}} sich durch die Situation {KONTRAST}deutlich belastet.',
      '{Q} {{fühlt|fühlen}} sich durch die Situation {KONTRAST}stark belastet und erschöpft.'] },
    e_sicht_schule: { q: 'Die Eltern teilen die Einschätzung der Schule.', t: [
      'Die Einschätzung der Schule {{teilt|teilen}} {Q} {KONTRAST}nicht.',
      'Die Einschätzung der Schule {{teilt|teilen}} {Q} {KONTRAST}kaum.',
      'Die Einschätzung der Schule {{teilt|teilen}} {Q} {KONTRAST}nur teilweise.',
      'Die Einschätzung der Schule {{teilt|teilen}} {Q} weitgehend.',
      'Die Einschätzung der Schule {{teilt|teilen}} {Q}.'] },
    e_kooperation: { q: 'Die Eltern sind zur Zusammenarbeit bereit.', t: [
      'Eine Zusammenarbeit {{lehnt|lehnen}} {Q} {KONTRAST}derzeit ab.',
      'Einer Zusammenarbeit {{steht|stehen}} {Q} {KONTRAST}zurückhaltend gegenüber.',
      'Zur Zusammenarbeit {{ist|sind}} {Q} grundsätzlich bereit, {{äußert|äußern}} aber noch Vorbehalte.',
      'Zur Zusammenarbeit {{ist|sind}} {Q} bereit.',
      'Zur Zusammenarbeit {{ist|sind}} {Q} sehr bereit und {{bringt|bringen}} sich aktiv ein.'] },

    // ---------------- 4.1 Verhaltensbeobachtung (Präteritum) ----------------
    b_start: { q: 'Begann Aufgaben selbstständig.', t: [
      'Aufgaben begann {N} {KONTRAST}nur nach mehrfacher Aufforderung.',
      'Mit Aufgaben begann {N} {KONTRAST}meist erst nach Aufforderung.',
      'Mit Aufgaben begann {N} {KONTRAST}teils selbstständig, teils erst nach Aufforderung.',
      'Mit Aufgaben begann {N} überwiegend selbstständig.',
      'Mit Aufgaben begann {N} zügig und selbstständig.'] },
    b_konz: { q: 'Arbeitete konzentriert und ausdauernd.', t: [
      'Konzentriertes Arbeiten war {Nd} {KONTRAST}kaum möglich; schon nach kurzer Zeit brach {er} Aufgaben ab.',
      'Konzentriert arbeitete {N} {KONTRAST}nur kurze Zeit.',
      'Die Konzentration schwankte {KONTRAST}deutlich: Phasen konzentrierten Arbeitens wechselten mit Phasen der Ablenkung.',
      '{N} arbeitete überwiegend konzentriert.',
      '{N} arbeitete konzentriert und ausdauernd.'] },
    b_anweisung: { q: 'Befolgte Anweisungen der Lehrperson.', t: [
      'Anweisungen der Lehrperson befolgte {N} {KONTRAST}kaum.',
      'Anweisungen befolgte {N} {KONTRAST}oft erst nach Wiederholung.',
      'Anweisungen befolgte {N} {KONTRAST}nur teilweise.',
      'Anweisungen der Lehrperson befolgte {N} meist.',
      'Anweisungen der Lehrperson befolgte {N} zuverlässig.'] },
    b_hilfe: { q: 'Holte sich bei Bedarf Hilfe.', t: [
      'Bei Schwierigkeiten holte {N} sich {KONTRAST}keine Hilfe.',
      'Bei Schwierigkeiten holte {N} sich {KONTRAST}selten Hilfe.',
      'Hilfe holte {N} sich {KONTRAST}nur gelegentlich.',
      'Bei Schwierigkeiten holte {N} sich meist angemessen Hilfe.',
      'Bei Schwierigkeiten holte {N} sich angemessen Hilfe.'] },
    b_unruhe: { q: 'War motorisch unruhig.', np: 'motorische Unruhe', t: [
      null,
      'Motorische Unruhe zeigte sich nur vereinzelt.',
      'Zeitweise war {N} motorisch unruhig.',
      '{N} war {KONTRAST}häufig motorisch unruhig und stand wiederholt vom Platz auf.',
      '{N} war {KONTRAST}ausgeprägt motorisch unruhig; ruhiges Sitzen gelang kaum.'] },
    b_ablenk: { q: 'Ließ sich leicht ablenken.', np: 'erhöhte Ablenkbarkeit', t: [
      null,
      'Ablenken ließ {N} sich nur selten.',
      'Zeitweise ließ {N} sich ablenken.',
      '{N} ließ sich {KONTRAST}häufig durch Geräusche oder Mitschüler ablenken.',
      '{N} ließ sich {KONTRAST}schon durch kleinste Reize ablenken.'] },
    b_regeln: { q: 'Hielt Klassenregeln ein.', t: [
      'Klassenregeln hielt {N} {KONTRAST}kaum ein.',
      'Klassenregeln hielt {N} {KONTRAST}selten ein.',
      'Klassenregeln hielt {N} {KONTRAST}nur teilweise ein.',
      'Klassenregeln hielt {N} meist ein.',
      'Klassenregeln hielt {N} zuverlässig ein.'] },
    b_frust: { q: 'Ging angemessen mit Schwierigkeiten oder Frustration um.', t: [
      'Auf Schwierigkeiten reagierte {N} {KONTRAST}heftig, etwa mit Abbruch der Aufgabe oder Wutäußerungen.',
      'Mit Schwierigkeiten ging {N} {KONTRAST}selten angemessen um.',
      'Mit Schwierigkeiten ging {N} {KONTRAST}wechselhaft um.',
      'Mit Schwierigkeiten ging {N} überwiegend angemessen um.',
      'Mit Schwierigkeiten und Frustration ging {N} angemessen um.'] },
    b_uebergang: { q: 'Bewältigte Übergänge und Wechsel ohne Schwierigkeiten.', t: [
      'Übergänge und Wechsel bereiteten {Nd} {KONTRAST}große Schwierigkeiten.',
      'Übergänge und Wechsel bereiteten {Nd} {KONTRAST}Schwierigkeiten.',
      'Übergänge und Wechsel gelangen {Nd} {KONTRAST}nur teilweise.',
      'Übergänge und Wechsel gelangen {Nd} meist ohne Schwierigkeiten.',
      'Übergänge und Wechsel bewältigte {N} ohne Schwierigkeiten.'] },
    b_lob: { q: 'Reagierte positiv auf Lob und Zuwendung.', t: [
      'Auf Lob und Zuwendung reagierte {N} {KONTRAST}kaum.',
      'Auf Lob reagierte {N} {KONTRAST}eher zurückhaltend.',
      'Auf Lob reagierte {N} {KONTRAST}unterschiedlich.',
      'Auf Lob und Zuwendung reagierte {N} überwiegend positiv.',
      'Auf Lob und Zuwendung reagierte {N} sichtlich positiv.'] },
    b_stoer: { q: 'Störte den Unterricht.', np: 'Unterrichtsstörungen', t: [
      null,
      'Den Unterricht störte {N} nur vereinzelt.',
      'Zeitweise störte {N} den Unterricht.',
      '{N} störte {KONTRAST}den Unterricht wiederholt, etwa durch Zwischenrufe oder Nebengespräche.',
      '{N} störte {KONTRAST}den Unterricht häufig und deutlich.'] },
    b_peers: { q: 'Suchte und hielt positiven Kontakt zu Mitschülern.', t: [
      'Kontakt zu Mitschülern nahm {N} {KONTRAST}nicht auf.',
      'Kontakt zu Mitschülern nahm {N} {KONTRAST}kaum auf.',
      'Kontakt zu Mitschülern nahm {N} {KONTRAST}nur gelegentlich auf.',
      'Zu Mitschülern hatte {N} überwiegend positiven Kontakt.',
      'Zu Mitschülern suchte und hielt {N} positiven Kontakt.'] },
    b_erwachsene: { q: 'Nahm angemessen Kontakt zu Erwachsenen auf.', t: [
      'Kontakt zu Erwachsenen vermied {N} {KONTRAST}weitgehend.',
      'Kontakt zu Erwachsenen nahm {N} {KONTRAST}nur zögerlich auf.',
      'Den Kontakt zu Erwachsenen gestaltete {N} {KONTRAST}teils angemessen, teils distanzlos oder vermeidend.',
      'Kontakt zu Erwachsenen nahm {N} überwiegend angemessen auf.',
      'Kontakt zu Erwachsenen nahm {N} angemessen und offen auf.'] },
    b_isol: { q: 'Zog sich zurück oder blieb für sich.', np: 'Rückzug', t: [
      null,
      'Rückzug zeigte sich nur vereinzelt.',
      'Zeitweise blieb {N} für sich.',
      '{N} zog sich {KONTRAST}häufig zurück und blieb für sich.',
      '{N} blieb {KONTRAST}fast durchgehend für sich und mied den Kontakt zu anderen.'] },
    b_provo: { q: 'Provozierte andere oder reagierte aggressiv.', np: 'provozierendes Verhalten', t: [
      null,
      'Provozierendes Verhalten zeigte sich nur vereinzelt.',
      'Zeitweise provozierte {N} Mitschüler.',
      '{N} provozierte {KONTRAST}wiederholt Mitschüler oder reagierte aggressiv.',
      '{N} provozierte {KONTRAST}häufig und reagierte mehrfach verbal oder körperlich aggressiv.'] },

    // ---------------- 4.3 Interpretation ----------------
    i_uebereinstimmung: { q: 'Die Sichtweisen von Schule, Eltern und Kind stimmen überein.', t: [
      'Die Sichtweisen von Schule, Eltern und {Name} selbst weichen deutlich voneinander ab.',
      'Die Sichtweisen von Schule, Eltern und {Name} selbst stimmen nur in Teilen überein.',
      'Die Sichtweisen von Schule, Eltern und {Name} selbst stimmen teilweise überein.',
      'Die Sichtweisen von Schule, Eltern und {Name} selbst stimmen weitgehend überein.',
      'Die Sichtweisen von Schule, Eltern und {Name} selbst stimmen in den wesentlichen Punkten überein.'] },
    i_beobachtung: { q: 'Die eigene Beobachtung bestätigt die Berichte.', t: [
      'Die eigene Beobachtung bestätigt die Berichte nicht.',
      'Die eigene Beobachtung bestätigt die Berichte nur in einzelnen Punkten.',
      'Die eigene Beobachtung bestätigt die Berichte teilweise.',
      'Die eigene Beobachtung bestätigt die Berichte weitgehend.',
      'Die eigene Beobachtung bestätigt die Berichte.'] },
    i_eldib: { q: 'Das ELDiB-Profil passt zum klinischen Eindruck.', t: [
      'Das ELDiB-Profil weicht vom klinischen Eindruck deutlich ab.',
      'Das ELDiB-Profil deckt sich nur in Teilen mit dem klinischen Eindruck.',
      'Das ELDiB-Profil deckt sich teilweise mit dem klinischen Eindruck.',
      'Das ELDiB-Profil deckt sich weitgehend mit dem klinischen Eindruck.',
      'Das ELDiB-Profil deckt sich mit dem klinischen Eindruck.'] },
    i_unstrukturiert: { q: 'Schwierigkeiten zeigen sich vor allem in wenig strukturierten Situationen (Pause, Übergänge, freie Arbeit).', m: 'in wenig strukturierten Situationen (etwa Pausen und Übergänge)', t: [
      null, null,
      'Teilweise treten die Schwierigkeiten in wenig strukturierten Situationen auf.',
      'Häufig treten die Schwierigkeiten in wenig strukturierten Situationen auf, etwa in Pausen oder bei Übergängen.',
      'Die Schwierigkeiten treten vor allem in wenig strukturierten Situationen wie Pausen, Übergängen oder freien Arbeitsphasen auf.'] },
    i_anforderung: { q: 'Schwierigkeiten zeigen sich vor allem bei Leistungsanforderungen.', m: 'bei Leistungsanforderungen', t: [
      null, null,
      'Teilweise stehen die Schwierigkeiten im Zusammenhang mit Leistungsanforderungen.',
      'Häufig treten die Schwierigkeiten bei Leistungsanforderungen auf.',
      'Die Schwierigkeiten treten vor allem bei Leistungsanforderungen auf.'] },
    i_beziehung: { q: 'Schwierigkeiten zeigen sich vor allem in Beziehungssituationen (Nähe, Konkurrenz, Grenzen).', m: 'in Beziehungssituationen (etwa bei Nähe, Konkurrenz oder Grenzsetzung)', t: [
      null, null,
      'Teilweise stehen die Schwierigkeiten im Zusammenhang mit Beziehungssituationen.',
      'Häufig treten die Schwierigkeiten in Beziehungssituationen auf, etwa bei Konkurrenz oder Grenzsetzung.',
      'Die Schwierigkeiten treten vor allem in Beziehungssituationen auf, etwa bei Nähe, Konkurrenz oder Grenzsetzung.'] },
    i_einzel: { q: 'In der Einzelsituation mit einem Erwachsenen gelingt deutlich mehr.', t: [
      null, null,
      'In der Einzelsituation gelingt {Nd} teilweise mehr als in der Gruppe.',
      'In der Einzelsituation mit einem Erwachsenen gelingt {Nd} mehr als in der Gruppe.',
      'In der Einzelsituation mit einem Erwachsenen gelingt {Nd} deutlich mehr als in der Gruppe.'] },
    i_schule: { q: 'Die Schwierigkeiten zeigen sich vor allem in der Schule.', t: [
      null, null,
      'In der Schule zeigen sich die Schwierigkeiten etwas stärker als zu Hause.',
      'Die Schwierigkeiten zeigen sich stärker in der Schule als zu Hause.',
      'Die Schwierigkeiten zeigen sich vor allem im schulischen Kontext.'] },
    i_zuhause: { q: 'Die Schwierigkeiten zeigen sich vor allem zu Hause.', t: [
      null, null,
      'Zu Hause zeigen sich die Schwierigkeiten etwas stärker als in der Schule.',
      'Die Schwierigkeiten zeigen sich stärker zu Hause als in der Schule.',
      'Die Schwierigkeiten zeigen sich vor allem im häuslichen Umfeld.'] },
    // Entwicklungsängste (Entwicklungstherapie nach Wood / ETEP)
    i_angst_verlassen: { q: 'Angst vor dem Verlassenwerden (Stufe I)', np: 'eine Angst vor dem Verlassenwerden (Stufe I)',
      e: '{N} scheint stark auf die Verfügbarkeit vertrauter Erwachsener angewiesen zu sein und reagiert auf Trennungen oder Wechsel mit Verunsicherung.' },
    i_angst_unzul: { q: 'Angst vor Unzulänglichkeit/Versagen (Stufe II)', np: 'eine Angst vor Unzulänglichkeit (Stufe II)',
      e: '{N} scheint Anforderungen schnell als Überforderung zu erleben und fürchtet, den Erwartungen nicht zu genügen.' },
    i_angst_schuld: { q: 'Schuldangst (Stufe III)', np: 'eine Schuldangst (Stufe III)',
      e: '{N} scheint Fehler und Regelverstöße stark mit Schuld und Scham zu verbinden und rechnet schnell mit Ablehnung.' },
    i_angst_konflikt: { q: 'Konfliktangst (Stufe IV)', np: 'eine Konfliktangst (Stufe IV)',
      e: 'In Auseinandersetzungen mit Gleichaltrigen und Erwachsenen scheint {N} schnell unter Druck zu geraten und Konflikten entweder auszuweichen oder sie zu verschärfen.' },
    i_angst_identitaet: { q: 'Identitätsangst (Stufe V)', np: 'eine Identitätsangst (Stufe V)',
      e: '{N} scheint stark mit Fragen nach der eigenen Rolle, Zugehörigkeit und Selbstbestimmung beschäftigt zu sein.' },
    // Abwehrmechanismen
    i_abw_rueckzug: { q: 'Rückzug', np: 'Rückzug' },
    i_abw_vermeidung: { q: 'Vermeidung, Verweigerung', np: 'Vermeidung' },
    i_abw_aggression: { q: 'Aggression, Angriff', np: 'aggressive Gegenwehr' },
    i_abw_regression: { q: 'Regression (kleinkindliches Verhalten)', np: 'regressives Verhalten' },
    i_abw_clown: { q: 'Clownerie, Ablenkung', np: 'Clownerie' },
    i_abw_kontrolle: { q: 'Überkontrolle, Perfektionismus', np: 'Überkontrolle' },
    i_abw_projektion: { q: 'Projektion, Schuldzuweisung an andere', np: 'Schuldzuweisung an andere' },
    i_abw_verleugnung: { q: 'Verleugnung, Bagatellisierung', np: 'Bagatellisierung' },
    // Erklärungsansätze: n = Nominativ, g = Genitiv
    i_hyp_entwicklung: { q: 'Verzögerung der sozio-emotionalen Entwicklung', n: 'eine Verzögerung der sozio-emotionalen Entwicklung', g: 'einer Verzögerung der sozio-emotionalen Entwicklung' },
    i_hyp_regulation: { q: 'Schwierigkeiten der Emotionsregulation', n: 'eine eingeschränkte Fähigkeit zur Emotionsregulation', g: 'einer eingeschränkten Fähigkeit zur Emotionsregulation' },
    i_hyp_belastung: { q: 'Reaktion auf aktuelle familiäre oder schulische Belastungen', pl: true, n: 'aktuelle familiäre oder schulische Belastungen', g: 'aktueller familiärer oder schulischer Belastungen' },
    i_hyp_bindung: { q: 'Bindungsunsicherheit', n: 'eine Bindungsunsicherheit', g: 'einer Bindungsunsicherheit' },
    i_hyp_sozial: { q: 'Soziale Unsicherheit', n: 'soziale Unsicherheit', g: 'sozialer Unsicherheit' },
    i_hyp_aufmerksamkeit: { q: 'Aufmerksamkeitsproblematik', n: 'eine Aufmerksamkeitsproblematik', g: 'einer Aufmerksamkeitsproblematik' },
    i_hyp_ueberforderung: { q: 'Schulische Überforderung', n: 'eine schulische Überforderung', g: 'einer schulischen Überforderung' },
    i_hyp_unterforderung: { q: 'Schulische Unterforderung', n: 'eine schulische Unterforderung', g: 'einer schulischen Unterforderung' },
    i_hyp_trauma: { q: 'Mögliche Folgen belastender Erfahrungen (weiter abklären)' },

    // ---------------- 5.1 Bedürfnisse: a = Akkusativ, d = Dativ ----------------
    n_struktur: { q: 'Klare Strukturen und vorhersehbare Abläufe', a: 'klare Strukturen und vorhersehbare Abläufe', d: 'klaren Strukturen und vorhersehbaren Abläufen' },
    n_beziehung: { q: 'Eine verlässliche, stabile Bezugsperson', a: 'eine verlässliche, stabile Bezugsperson', d: 'einer verlässlichen, stabilen Bezugsperson' },
    n_erfolg: { q: 'Erfolgserlebnisse und positive Rückmeldungen', a: 'Erfolgserlebnisse und positive Rückmeldungen', d: 'Erfolgserlebnissen und positiven Rückmeldungen' },
    n_regulation: { q: 'Unterstützung bei der Regulation der Gefühle', a: 'Unterstützung bei der Regulation {seiner} Gefühle', d: 'Unterstützung bei der Regulation {seiner} Gefühle' },
    n_grenzen: { q: 'Klare Grenzen und konsequente Rückmeldungen', a: 'klare Grenzen und konsequente Rückmeldungen', d: 'klaren Grenzen und konsequenten Rückmeldungen' },
    n_sozial: { q: 'Förderung sozialer Kompetenzen', a: 'eine gezielte Förderung {seiner} sozialen Kompetenzen', d: 'einer gezielten Förderung {seiner} sozialen Kompetenzen' },
    n_organisation: { q: 'Hilfen bei Aufmerksamkeit und Arbeitsorganisation', a: 'Hilfen zur Strukturierung von Aufmerksamkeit und Arbeitsorganisation', d: 'Hilfen zur Strukturierung von Aufmerksamkeit und Arbeitsorganisation' },
    n_differenzierung: { q: 'Angepasste Anforderungen (Differenzierung)', a: 'an {seine} Möglichkeiten angepasste Anforderungen', d: 'an {seine} Möglichkeiten angepassten Anforderungen' },
    n_therapie: { q: 'Therapeutische Begleitung', a: 'eine therapeutische Begleitung', d: 'einer therapeutischen Begleitung' },
    n_familie: { q: 'Unterstützung der Familie', a: 'eine Stärkung {seiner} Familie', d: 'einer Stärkung {seiner} Familie' }
  },

  // Auswahlfelder: [Beschriftung, Form im Text]
  chips: {
    s_staerken: { hilfsbereit: ['hilfsbereit', 'Hilfsbereitschaft'], kreativ: ['kreativ', 'Kreativität'], humorvoll: ['humorvoll', 'Humor'], sportlich: ['sportlich', 'sportliche Fähigkeiten'], sprachlich: ['sprachlich stark', 'sprachliche Fähigkeiten'], mathematisch: ['mathematisch stark', 'mathematisches Verständnis'], technisch: ['technisch interessiert', 'technisches Interesse'], musikalisch: ['musikalisch', 'Musikalität'], fantasievoll: ['fantasievoll', 'Fantasie'], wissbegierig: ['wissbegierig', 'Wissbegierde'], freundlich: ['freundlich', 'Freundlichkeit'], zuverlaessig: ['zuverlässig', 'Zuverlässigkeit'] },
    s_hilft: { ansagen: ['klare, kurze Ansagen', 'klare, kurze Ansagen'], wiederholung: ['Wiederholungen', 'Wiederholungen'], visualisierung: ['Visualisierungen', 'Visualisierungen'], bewegung: ['Bewegungspausen', 'Bewegungspausen'], rueckzugsort: ['Rückzugsmöglichkeit', 'eine Rückzugsmöglichkeit'], einzelansprache: ['Einzelansprache', 'persönliche Einzelansprache'], lob: ['Lob, Verstärkung', 'Lob und positive Verstärkung'], vorwarnung: ['Vorwarnung bei Wechseln', 'die Vorankündigung von Wechseln'], kleingruppe: ['Kleingruppe', 'die Arbeit in der Kleingruppe'], naehe: ['Nähe zur Lehrperson', 'die Nähe zur Lehrperson'], struktur: ['feste Abläufe', 'feste Abläufe und Strukturen'] },
    s_erwartung: { strategien: ['Strategien für den Unterricht', 'konkrete Strategien für den Unterricht'], verhalten: ['besseres Verhalten', 'eine Verbesserung des Verhaltens'], konzentration: ['bessere Konzentration', 'eine bessere Konzentration'], integration: ['soziale Integration', 'eine bessere soziale Integration'], stabilitaet: ['emotionale Stabilität', 'mehr emotionale Stabilität'], leistung: ['bessere Leistungen', 'bessere schulische Leistungen'], therapie: ['therapeutische Hilfe', 'externe therapeutische Unterstützung'], eltern: ['Zusammenarbeit mit Eltern', 'eine engere Zusammenarbeit mit den Eltern'], foerderort: ['anderer Förderort', 'die Prüfung eines anderen Förderorts'], abklaerung: ['Abklärung', 'eine diagnostische Abklärung'] },
    k_interessen: { sport: ['Sport', 'Sport'], gaming: ['Videospiele', 'Videospiele'], musik: ['Musik', 'Musik'], lesen: ['Lesen', 'Lesen'], kreatives: ['Malen, Basteln', 'Malen und Basteln'], freunde: ['Freunde treffen', 'Zeit mit Freunden'], tiere: ['Tiere', 'Tiere'], natur: ['Natur', 'Aktivitäten in der Natur'], technik: ['Technik', 'Technik'], kochen: ['Kochen, Backen', 'Kochen und Backen'] },
    k_wuensche: { noten: ['bessere Noten', 'bessere Noten'], freunde: ['mehr Freunde', 'mehr Freunde'], streit: ['weniger Streit', 'weniger Streit'], ruhe: ['Ruhe zu Hause', 'mehr Ruhe zu Hause'], druck: ['weniger Druck', 'weniger Druck'], verstanden: ['verstanden werden', 'mehr Verständnis'], hilfe: ['Hilfe bekommen', 'Unterstützung'], klasse: ['andere Klasse', 'einen Wechsel der Klasse'], schule: ['andere Schule', 'einen Schulwechsel'], inruhe: ['in Ruhe gelassen werden', 'mehr Rückzugsmöglichkeiten'] },
    e_staerken: { hilfsbereit: ['hilfsbereit', 'Hilfsbereitschaft'], liebevoll: ['liebevoll', 'Zuneigung zur Familie'], selbststaendig: ['selbstständig', 'Selbstständigkeit'], kreativ: ['kreativ', 'Kreativität'], humorvoll: ['humorvoll', 'Humor'], sportlich: ['sportlich', 'sportliche Aktivität'], verantwortung: ['verantwortungsbewusst', 'Verantwortungsbewusstsein'], offen: ['offen', 'Offenheit'] },
    e_erwartung: { verhalten: ['besseres Verhalten', 'eine Verbesserung des Verhaltens'], entspannung: ['Entspannung zu Hause', 'eine Entspannung der Situation zu Hause'], strategien: ['Erziehungsstrategien', 'konkrete Erziehungsstrategien'], leistung: ['bessere Leistungen', 'bessere schulische Leistungen'], abklaerung: ['Abklärung', 'eine diagnostische Abklärung'], therapie: ['Therapie für das Kind', 'therapeutische Unterstützung für {Na}'], beratung: ['Beratung für sich', 'Beratung für sich selbst'], foerderort: ['anderer Förderort', 'einen anderen Förderort'], verstehen: ['das Kind verstehen', 'ein besseres Verständnis für {Na}'], bestaetigung: ['Orientierung, Rückhalt', 'Orientierung und Rückhalt'] },
    ressourcen: { kognitiv: ['kognitive Fähigkeiten', 'gute kognitive Fähigkeiten'], kreativ: ['Kreativität', 'Kreativität'], sportlich: ['Sport', 'sportliche Fähigkeiten'], musisch: ['künstlerisch, musisch', 'eine künstlerisch-musische Begabung'], humor: ['Humor', 'Humor'], empathie: ['Einfühlungsvermögen', 'Einfühlungsvermögen'], neugier: ['Neugier', 'Neugier und Wissensdurst'], begeisterung: ['Begeisterungsfähigkeit', 'Begeisterungsfähigkeit'], hilfsbereit: ['Hilfsbereitschaft', 'Hilfsbereitschaft'], verantwortung: ['übernimmt Verantwortung', 'Verantwortungsbereitschaft'], einzelbeziehung: ['Einzelbeziehungen', 'Beziehungsfähigkeit im Einzelkontakt'], lernbereit: ['Lernbereitschaft', 'Lernbereitschaft'], vertrauensperson: ['Vertrauensperson', 'eine Vertrauensperson in der Schule'], familie: ['unterstützende Familie', 'eine unterstützende Familie'], hobbys: ['Hobbys', 'stabile Hobbys und Interessen'], reflexion: ['reflektiert', 'Reflexionsfähigkeit'] },
    // Fakten
    anlass: { verhalten_schule: ['Verhalten in der Schule', 'Verhaltensauffälligkeiten in der Schule'], verhalten_zuhause: ['Verhalten zu Hause', 'Verhaltensauffälligkeiten zu Hause'], emotional: ['emotionale Schwierigkeiten', 'emotionalen Schwierigkeiten'], sozial: ['soziale Schwierigkeiten', 'Schwierigkeiten im sozialen Miteinander'], leistung: ['Schulleistung', 'schulischen Leistungsproblemen'], aufmerksamkeit: ['Aufmerksamkeit', 'Aufmerksamkeits- und Konzentrationsproblemen'], aggression: ['Aggression', 'aggressivem Verhalten'], rueckzug: ['Rückzug', 'Rückzugsverhalten'], aengste: ['Ängste', 'ausgeprägten Ängsten'], schulverweigerung: ['Schulverweigerung', 'Schulverweigerung bzw. Schulabsentismus'] },
    anliegen: { isa: ['ISA', 'eine Spezialisierte ambulante Intervention (ISA)'], conseil: ['Conseil & Guidance', 'eine Beratung und Begleitung (Conseil & Guidance)'], cst: ['CST', 'eine Aufnahme im Centre socio-thérapeutique (CST)'], clapa: ['Classe de Participation', 'eine Aufnahme in eine Classe de Participation'], annexe: ['Annexe Junglinster', 'eine Aufnahme in der Annexe Junglinster'], lernwerkstatt: ['Lernwerkstatt', 'eine Teilnahme an der Spezialisierten Lernwerkstatt'], beschulung: ['spezialisierte Beschulung', 'eine spezialisierte Beschulung im CDSE'], diagnostik: ['Diagnostik', 'eine vertiefte diagnostische Abklärung'] },
    empfohlen: { lehrperson: ['Lehrperson', 'der Lehrperson'], eseb: ['ESEB', 'des ESEB'], schulleitung: ['Schulleitung', 'der Schulleitung'], arzt: ['Ärztin/Arzt', 'der behandelnden Ärztin bzw. des behandelnden Arztes'], psychologe: ['Psychologin/Psychologe', 'der Psychologin bzw. des Psychologen'], eltern: ['Wunsch der Eltern', ''] },
    diagnosen: { adhs: ['ADHS/ADS', 'eine ADHS'], ass: ['Autismus-Spektrum', 'eine Autismus-Spektrum-Störung'], lernstoerung: ['Lernstörung', 'eine Lernstörung'], sprachstoerung: ['Sprachentwicklungsstörung', 'eine Sprachentwicklungsstörung'], emotional: ['emotionale Störung', 'eine emotionale Störung'], bindung: ['Bindungsstörung', 'eine Bindungsstörung'], angst: ['Angststörung', 'eine Angststörung'], opposition: ['oppositionelles Verhalten', 'eine Störung mit oppositionellem Trotzverhalten'], andere: ['andere', ''] },
    ereignisse: { trennung: ['Trennung der Eltern', 'die Trennung der Eltern'], umzug: ['Umzug', 'ein Umzug'], verlust: ['Verlust einer Bezugsperson', 'der Verlust einer nahestehenden Person'], krankheit: ['Krankheit in der Familie', 'eine Erkrankung in der Familie'], konflikte: ['häusliche Konflikte', 'häusliche Konflikte'], trauma: ['belastendes Erlebnis', 'ein belastendes Erlebnis'], migration: ['Migration', 'eine Migrationserfahrung'] },
    betreuung: { maison_relais: ['Maison Relais', ''], grosseltern: ['Großeltern', ''], tagesmutter: ['Tagesmutter', ''], keine: ['keine', ''] },
    sprachen: { lb: ['Luxemburgisch', 'Luxemburgisch'], de: ['Deutsch', 'Deutsch'], fr: ['Französisch', 'Französisch'], pt: ['Portugiesisch', 'Portugiesisch'], en: ['Englisch', 'Englisch'], it: ['Italienisch', 'Italienisch'], es: ['Spanisch', 'Spanisch'], andere: ['andere', ''] },
    verfahren: { eldib: ['ELDiB', 'dem ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen)'], beobachtung: ['Beobachtung', ''], gespraeche: ['Gespräche', ''], sdq: ['SDQ', 'dem Strengths and Difficulties Questionnaire (SDQ)'], wisc: ['WISC-V', 'dem WISC-V'], andere: ['andere', ''] },
    empf_familie: { step: ['STEP-Elterntraining (CDSE)', 'Teilnahme am Elterntraining STEP im CDSE'], erziehungsberatung: ['Erziehungsberatung', 'Erziehungsberatung zur Stärkung der elterlichen Handlungssicherheit'], familientherapie: ['Familientherapie', 'Familientherapeutische Begleitung'], tagesstruktur: ['Tagesstruktur zu Hause', 'Klare Tagesstruktur und verlässliche Routinen zu Hause'], austausch: ['Austausch mit der Schule', 'Regelmäßiger Austausch zwischen Eltern und Schule'], medien: ['Medienregeln', 'Klare, gemeinsam vereinbarte Regeln zur Mediennutzung'], freizeit: ['Freizeitaktivität', 'Regelmäßige Freizeitaktivität, z. B. in einem Verein'] },
    empf_schule: { sitzplatz: ['Sitzplatz', 'Ruhiger Sitzplatz in der Nähe der Lehrperson'], differenzierung: ['Differenzierung', 'Differenzierte, klar gegliederte Aufgabenstellungen'], verstaerker: ['Verstärkerplan', 'Häufige positive Rückmeldungen, ggf. mit einem Verstärkerplan'], regeln: ['Regeln & Konsequenzen', 'Wenige, klare Regeln mit vorhersehbaren Konsequenzen'], auszeit: ['Auszeit/Rückzug', 'Vereinbarte Auszeit- bzw. Rückzugsmöglichkeit'], uebergaenge: ['Übergänge ankündigen', 'Vorankündigung von Übergängen und Wechseln'], visualisierung: ['Visualisierung', 'Visualisierung von Tagesablauf und Arbeitsschritten'], bewegung: ['Bewegungspausen', 'Regelmäßige Bewegungspausen'], iebs: ['I-EBS', 'Unterstützung durch die I-EBS'], bezugsperson: ['Bezugsperson', 'Eine feste Bezugsperson in der Schule'] },
    empf_region: { eseb: ['ESEB-Begleitung', 'Weiterführende Begleitung durch das ESEB'], isa: ['ISA', 'Spezialisierte ambulante Intervention (ISA) des CDSE'], conseil: ['Conseil & Guidance', 'Beratung und Begleitung (Conseil & Guidance) durch das CDSE'], lernwerkstatt: ['Lernwerkstatt', 'Teilnahme an der Spezialisierten Lernwerkstatt'], psychotherapie: ['Psychotherapie', 'Kinder- und jugendpsychotherapeutische Begleitung'], ergotherapie: ['Ergotherapie', 'Ergotherapie'], logopaedie: ['Logopädie', 'Logopädie'], psychiatrie: ['kinderpsychiatrische Abklärung', 'Kinder- und jugendpsychiatrische Abklärung'] },
    cni: { diag_kompetenzzentrum: ['Diagnostik mit Kompetenzzentrum', 'Spezialisierte Diagnostik in Zusammenarbeit mit einem Kompetenzzentrum'], beratung_eltern: ['Beratung Eltern und Kind', 'Beratung und Begleitung der Eltern und [[des betroffenen Schülers|der betroffenen Schülerin]]'], beratung_fachleute: ['Beratung Fachleute', 'Beratung und Begleitung der Fachleute'], lernwerkstatt: ['Lernwerkstatt', 'Spezialisierte Lernwerkstatt'], isa: ['ISA', 'Spezialisierte ambulante Intervention (ISA)'], beschulung: ['Beschulung im CDSE', 'Spezialisierte Beschulung im CDSE'], clapa: ['Classe de Participation', 'Spezialisierte Beschulung im CDSE – Classe de Participation'], cst: ['CST', 'Spezialisierte Beschulung im CDSE – Centre socio-thérapeutique (CST)'], annexe: ['Annexe Junglinster', 'Spezialisierte Beschulung im CDSE – Annexe Junglinster'], ausland: ['Beschulung im Ausland', 'Spezialisierte Beschulung im Ausland'], rehabilitation: ['Rehabilitation', 'Rehabilitation'], abschluss: ['Abschluss der Aktivitäten', 'Abschluss der Aktivitäten des CDSE'], schliessung: ['Schließung der Akte', 'Schließung der Akte im CDSE'] }
  },

  // Rahmensätze
  s: {
    liste_und: 'und', liste_oder: 'oder', liste_sowie: 'sowie',
    schule_intro: 'Grundlage ist ein Gespräch mit {QSd}{datum: am {datum}}.',
    schule_staerken: '{{Als Stärke wird|Als Stärken werden}} {liste} genannt.',
    schule_hilft: 'Als hilfreich haben sich {liste} erwiesen.',
    schule_erwartung: 'Von der Unterstützung durch das CDSE erhofft sich die Schule {liste}.',
    schule_ohne: 'Hinweise auf {liste} ergeben sich aus Sicht der Schule nicht.',
    kind_intro: 'Das Gespräch mit {Name} fand{datum: am {datum}} statt.',
    kind_interessen: 'Zu {seinen} Interessen zählen {liste}.',
    kind_wuensche: 'Für die Zukunft wünscht {N} sich {liste}.',
    kind_vertrauen: 'Als Vertrauensperson in der Schule nennt {N} {text}.',
    kind_ohne: 'Hinweise auf {liste} ergeben sich aus dem Gespräch nicht.',
    eltern_intro: 'Grundlage ist ein Gespräch mit {Qd}{datum: am {datum}}.',
    eltern_staerken: '{{Als Stärke wird|Als Stärken werden}} {liste} genannt.',
    eltern_erwartung: 'Von der Unterstützung {{erhofft|erhoffen}} sich {Q} {liste}.',
    eltern_ohne: 'Hinweise auf {liste} ergeben sich aus dem Elterngespräch nicht.',
    beob_ohne: 'Hinweise auf {liste} zeigten sich während der Beobachtung nicht.',
    beob_eine: 'Grundlage ist eine Beobachtung {beob}.',
    beob_mehrere: 'Grundlage sind Beobachtungen {beob}.',
    beob_eintrag: '{datum: am {datum}}{ort: {ort}}{dauer: ({dauer} Minuten)}',
    // Interpretation
    muster_stark: 'Die Schwierigkeiten treten vor allem {liste} auf.',
    muster_mittel: 'Häufig treten die Schwierigkeiten {liste} auf.',
    muster_mittel_nach: 'Häufig zeigen sie sich auch {liste}.',
    aengste_stark: 'Im entwicklungstherapeutischen Verständnis ergeben sich deutliche Hinweise auf {liste}.',
    aengste_mittel: 'Im entwicklungstherapeutischen Verständnis ergeben sich Hinweise auf {liste}.',
    aengste_beide: 'Im entwicklungstherapeutischen Verständnis ergeben sich deutliche Hinweise auf {stark}, teilweise auch auf {mittel}.',
    abwehr_stark: 'Als Abwehr {{zeigt|zeigen}} sich vor allem {liste}.',
    abwehr_mittel: 'Als Abwehr {{zeigt|zeigen}} sich teilweise {liste}.',
    abwehr_beide: 'Als Abwehr {{zeigt|zeigen}} sich vor allem {stark}, daneben auch {mittel}.',
    abwehr_bezug_stark: '{{Diese Angst|Diese Ängste}} scheint {N} vor allem durch {stark} abzuwehren.',
    abwehr_bezug_beide: '{{Diese Angst|Diese Ängste}} scheint {N} vor allem durch {stark} abzuwehren, teilweise auch durch {mittel}.',
    abwehr_bezug_mittel: '{{Diese Angst|Diese Ängste}} scheint {N} teilweise durch {mittel} abzuwehren.',
    hyp_stark: 'Die beschriebenen Schwierigkeiten lassen sich am ehesten als Ausdruck {liste} verstehen.',
    hyp_mittel: 'Daneben {{könnte|könnten}} {liste} eine Rolle spielen.',
    hyp_nur_mittel: 'Als mögliche Erklärungen kommen {liste} in Betracht.',
    hyp_trauma: 'Ob belastende Erfahrungen eine Rolle spielen, sollte fachlich weiter abgeklärt werden.',
    // Bedürfnisse, Ressourcen
    beduerfnis_stark: '{N} braucht vor allem {liste}.',
    beduerfnis_mittel: 'Zudem profitiert {N} von {liste}.',
    beduerfnis_nur_mittel: '{N} profitiert von {liste}.',
    ressourcen: 'Als Ressourcen sind {liste} hervorzuheben.'
  },

  // Beschriftungen der Oberfläche
  ui: {
    titel: 'Diagnostic Spécialisé', untertitel: 'Schritt für Schritt zum fertigen Bericht',
    schritte: { stamm: 'Kind & Bericht', auftrag: 'Auftrag', vorgeschichte: 'Vorgeschichte', familie: 'Familie', aktuell: 'Aktuelle Situation', schule: 'Sicht der Schule', kind: 'Sicht des Kindes', eltern: 'Sicht der Eltern', beobachtung: 'Beobachtung', eldib: 'ELDiB-Ergebnisse', deutung: 'Interpretation', beduerfnisse: 'Bedürfnisse & Ressourcen', empfehlungen: 'Empfehlungen', vorschau: 'Vorschau & Export' },
    themen: {
      'schule.lernen': 'Lern- und Arbeitsverhalten', 'schule.verhalten': 'Verhalten und Emotionen', 'schule.beziehung': 'Beziehungen',
      'kind.schule': 'Schule', 'kind.selbst': 'Selbstbild und Befinden', 'kind.umfeld': 'Freunde und Familie',
      'eltern.alltag': 'Alltag zu Hause', 'eltern.familie': 'Familie und Erziehung', 'eltern.zusammenarbeit': 'Zusammenarbeit',
      'beobachtung.arbeit': 'Arbeitsverhalten', 'beobachtung.verhalten': 'Verhalten', 'beobachtung.kontakt': 'Kontakt',
      'deutung.quellen': 'Abgleich der Informationen', 'deutung.muster': 'Wann zeigen sich die Schwierigkeiten?', 'deutung.aengste': 'Entwicklungsängste (Hinweise)', 'deutung.abwehr': 'Abwehrmechanismen (wie deutlich?)', 'deutung.hypothesen': 'Erklärungsansätze (wie wahrscheinlich?)',
      'beduerfnisse.beduerfnisse': 'Was braucht das Kind? (wie wichtig?)'
    },
    chipTitel: { s_staerken: 'Stärken aus Sicht der Schule', s_hilft: 'Was hilft im Unterricht?', s_erwartung: 'Was erhofft sich die Schule?', k_interessen: 'Interessen und Hobbys', k_wuensche: 'Was wünscht sich das Kind?', e_staerken: 'Stärken aus Sicht der Eltern', e_erwartung: 'Was erhoffen sich die Eltern?', ressourcen: 'Ressourcen des Kindes' }
  }
};

// ==== 43b-ds-fakten-de.js ====
// =====================================================================
// DS-Baukasten: deutsche Faktenabschnitte (Auftrag, Vorgeschichte, Familie,
// aktuelle Situation, Verfahren, ELDiB, Schluss, Ziele, Empfehlungen, CNI)
// h = Hilfsfunktionen aus DsText (fuelle, satz, liste, chips, …)
// =====================================================================
DS_TEXTE.de.s.das_kind = 'das Kind';
DS_TEXTE.de.s.vorschau_ohne = 'Wird im Bericht in der Aufzählung „keine Hinweise auf …“ erwähnt: {liste}.';
DS_TEXTE.de.quellen = {
  schule: {
    lehrperson: { n: 'die Lehrperson', d: 'der Lehrperson', label: 'Lehrperson' },
    lehrerin: { n: 'die Klassenlehrerin', d: 'der Klassenlehrerin', label: 'Klassenlehrerin' },
    lehrer: { n: 'der Klassenlehrer', d: 'dem Klassenlehrer', label: 'Klassenlehrer' },
    team: { n: 'das pädagogische Team', d: 'dem pädagogischen Team', label: 'Pädagogisches Team' },
    eseb: { n: 'die ESEB-Fachkraft', d: 'der ESEB-Fachkraft', label: 'ESEB-Fachkraft' }
  },
  eltern: {
    eltern: { n: 'die Eltern', d: 'den Eltern', g: 'der Eltern', zahl: 2, label: 'beide Eltern' },
    mutter: { n: 'die Mutter', d: 'der Mutter', g: 'der Mutter', zahl: 1, label: 'Mutter' },
    vater: { n: 'der Vater', d: 'dem Vater', g: 'des Vaters', zahl: 1, label: 'Vater' },
    pflegeeltern: { n: 'die Pflegeeltern', d: 'den Pflegeeltern', g: 'der Pflegeeltern', zahl: 2, label: 'Pflegeeltern' },
    grosseltern: { n: 'die Großeltern', d: 'den Großeltern', g: 'der Großeltern', zahl: 2, label: 'Großeltern' }
  }
};
DS_TEXTE.de.optionen = {
  auftraggeber: { cni: ['CNI', 'der Nationalen Kommission für Inklusion (CNI)'], eseb: ['ESEB', 'dem ESEB'], schule: ['Schule', 'der Schule'], eltern: ['Eltern', 'den Eltern'] },
  verlauf: { unauffaellig: 'unauffällig', komplikationen: 'mit Komplikationen', unbekannt: 'unbekannt' },
  entwicklung: { altersgerecht: 'altersgerecht', verzoegert: 'verzögert', unbekannt: 'unbekannt' },
  familienstand: { zusammen: 'leben zusammen', getrennt: 'leben getrennt', alleinerziehend: 'alleinerziehend', patchwork: 'Patchworkfamilie', verstorben: 'ein Elternteil verstorben' },
  lebt_bei: { beide: ['bei beiden Eltern', 'lebt bei beiden Eltern'], mutter: ['bei der Mutter', 'lebt bei der Mutter'], vater: ['beim Vater', 'lebt beim Vater'], wechsel: ['im Wechselmodell', 'lebt im Wechselmodell abwechselnd bei beiden Eltern'], grosseltern: ['bei den Großeltern', 'lebt bei den Großeltern'], pflege: ['in einer Pflegefamilie', 'lebt in einer Pflegefamilie'], heim: ['in einer Wohngruppe', 'lebt in einer Wohngruppe'] },
  kontakt: { regelmaessig: 'Zu beiden Eltern besteht regelmäßiger Kontakt.', eingeschraenkt_vater: 'Der Kontakt zum Vater ist eingeschränkt.', eingeschraenkt_mutter: 'Der Kontakt zur Mutter ist eingeschränkt.', kein_vater: 'Zum Vater besteht kein Kontakt.', kein_mutter: 'Zur Mutter besteht kein Kontakt.' },
  position: { aeltestes: 'das älteste Kind', mittleres: 'ein mittleres Kind', juengstes: 'das jüngste Kind' },
  arbeitszeit: { vollzeit: 'in Vollzeit', teilzeit: 'in Teilzeit', nicht: '' },
  setting: { klasse: 'im Klassenverband', kleingruppe: 'in der Kleingruppe', einzel: 'in einer Einzelsituation', pause: 'in der Pause', maison: 'in der Maison Relais', sport: 'im Sportunterricht' },
  abgestimmt: { ja: 'Ja, vollständig abgestimmt', vorbehalte: 'Ja, mit Vorbehalten', nein: 'Nein' },
  stufeAlter: { 1: '0–2 Jahre', 2: '2–5 Jahre', 3: '6–9 Jahre', 4: '10–12 Jahre', 5: '13–16 Jahre' }
};

DS_TEXTE.de.fakten = (function () {
  const O = DS_TEXTE.de.optionen;
  const roem = function (n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n); };
  // ELDiB-Beschreibung als Satzteil: "Reagiert auf …" -> "reagiert auf …"
  function praedikat(d) {
    d = String(d || '').trim().replace(/\.$/, '');
    const w = d.split(/\s+/)[0] || '';
    return /^[A-ZÄÖÜ][a-zäöüß]+t,?$/.test(w) ? d.charAt(0).toLowerCase() + d.slice(1) : '';
  }
  return {
    auftrag: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const wer = (O.auftraggeber[f.auftraggeber || 'cni'] || O.auftraggeber.cni)[1];
      const wer2 = f.auftraggeber === 'andere' && h.frei(ds, 'auftraggeber_andere') ? h.frei(ds, 'auftraggeber_andere') : wer;
      s.push(h.satz(h.fuelle('Das Zentrum für sozio-emotionale Entwicklung (CDSE) wurde{datum: am {datum}} von {wer} beauftragt, eine vertiefende Diagnostik bei {wem} durchzuführen, um {seinen} aktuellen sozio-emotionalen Entwicklungsstand und Förderbedarf festzustellen.', c, { datum: h.datum(f.auftrag_datum, 'de'), wer: wer2, wem: c.vollname || (c.g === 'w' ? 'der Schülerin' : 'dem Schüler') }), c));
      const anl = h.chips(ds, 'anlass').map(function (k) { return h.chipText(c, 'anlass', k); });
      if (h.frei(ds, 'anlass_andere')) { anl.push(h.frei(ds, 'anlass_andere')); }
      if (anl.length) { s.push(h.satz(h.fuelle('Die Beauftragung erfolgte aufgrund von {liste}.', c, { liste: h.liste(anl, c) }), c)); }
      const anl2 = h.chips(ds, 'anliegen').map(function (k) { return h.chipText(c, 'anliegen', k); });
      if (anl2.length) { s.push(h.satz(h.fuelle('Ziel ist es, {liste} einzuleiten.', c, { liste: h.liste(anl2, c) }), c)); }
      const emp = h.chips(ds, 'empfohlen').filter(function (k) { return k !== 'eltern'; }).map(function (k) { return h.chipText(c, 'empfohlen', k); });
      const wunsch = h.chips(ds, 'empfohlen').indexOf('eltern') >= 0;
      if (emp.length && wunsch) { s.push(h.satz(h.fuelle('Die Anfrage erfolgte auf Empfehlung {liste} sowie auf Wunsch der Eltern.', c, { liste: h.liste(emp, c) }), c)); }
      else if (emp.length) { s.push(h.satz(h.fuelle('Die Anfrage erfolgte auf Empfehlung {liste}.', c, { liste: h.liste(emp, c) }), c)); }
      else if (wunsch) { s.push(h.satz('Die Anfrage erfolgte auf Wunsch der Eltern.', c)); }
      const b = [h.block(s.join(' '))];
      return b.concat(h.freiBloecke(ds, 'anlass_details'));
    },

    vorgeschichte: function (c, ds, st, h) {
      const f = ds.f || {}, s = [], b = [];
      c.neuerAbsatz();
      // Schwangerschaft und Geburt
      const sg = f.schwangerschaft, gb = f.geburt;
      if (sg === 'unauffaellig' && gb === 'unauffaellig') { s.push('Schwangerschaft und Geburt verliefen nach Angaben der Eltern unauffällig.'); }
      else {
        if (sg === 'unauffaellig') { s.push('Die Schwangerschaft verlief unauffällig.'); }
        if (sg === 'komplikationen') { s.push(h.satz(h.fuelle('Die Schwangerschaft verlief mit Komplikationen{d: ({d})}.', c, { d: h.frei(ds, 'schwangerschaft_details') }), c)); }
        if (gb === 'unauffaellig') { s.push('Die Geburt verlief unauffällig.'); }
        if (gb === 'komplikationen') { s.push(h.satz(h.fuelle('Bei der Geburt kam es zu Komplikationen{d: ({d})}.', c, { d: h.frei(ds, 'geburt_details') }), c)); }
      }
      // Motorik und Sprache
      const mo = f.motorik, sp = f.sprache;
      const worte = f.erste_worte ? ' (erste Wörter mit etwa ' + f.erste_worte + ' Monaten)' : '';
      if (mo === 'altersgerecht' && sp === 'altersgerecht') { s.push('Motorik und Sprache entwickelten sich altersgerecht' + worte + '.'); }
      else if (mo === 'altersgerecht' && sp === 'verzoegert' && !h.frei(ds, 'sprache_details')) { s.push('Die motorische Entwicklung verlief altersgerecht, die Sprachentwicklung verzögert' + worte + '.'); }
      else if (mo === 'verzoegert' && sp === 'altersgerecht' && !h.frei(ds, 'motorik_details')) { s.push('Die Sprachentwicklung verlief altersgerecht' + worte + ', die motorische Entwicklung verzögert.'); }
      else {
        if (mo === 'altersgerecht') { s.push('Die motorische Entwicklung verlief altersgerecht.'); }
        if (mo === 'verzoegert') { s.push(h.satz(h.fuelle('Die motorische Entwicklung verlief verzögert{d: ({d})}.', c, { d: h.frei(ds, 'motorik_details') }), c)); }
        if (sp === 'altersgerecht') { s.push('Die Sprachentwicklung verlief altersgerecht' + worte + '.'); }
        if (sp === 'verzoegert') { s.push(h.satz(h.fuelle('Die Sprachentwicklung verlief verzögert' + worte + '{d:; {d}}.', c, { d: h.frei(ds, 'sprache_details') }), c)); }
      }
      // Diagnosen
      const dg = h.chips(ds, 'diagnosen').map(function (k) {
        const name = k === 'andere' ? h.frei(ds, 'diagnose_andere') : h.chipText(c, 'diagnosen', k);
        const det = ds.f && ds.f.diagnosen_details && ds.f.diagnosen_details[k];
        return name ? name + (det ? ' (' + det + ')' : '') : '';
      }).filter(Boolean);
      if (dg.length) { s.push(h.satz(h.fuelle('Diagnostiziert {{wurde|wurden}} bisher {liste}.', c, { liste: h.liste(dg, c), zahl: dg.length }), c)); }
      else if (f.keine_diagnosen) { s.push('Bisher liegen keine Diagnosen vor.'); }
      if (s.length) { b.push(h.block(s.join(' '))); }
      const rows = ((ds.tabellen && ds.tabellen.vorgeschichte) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) {
        b.push(h.block('Bisherige schulische und außerschulische Unterstützungsmaßnahmen:'));
        b.push({ typ: 'tabelle', id: 'vorgeschichte', kopf: ['Zeitraum', 'Klasse', 'Maßnahme', 'Akteur'], zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }) });
      }
      return b.concat(h.freiBloecke(ds, 'vorgeschichte'));
    },

    sozialbericht: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const lb = O.lebt_bei[f.lebt_bei];
      const stand = { getrennt: 'Die Eltern von {Name} leben getrennt', zusammen: 'Die Eltern von {Name} leben zusammen', alleinerziehend: f.lebt_bei === 'vater' ? 'Der Vater von {Name} ist alleinerziehend' : 'Die Mutter von {Name} ist alleinerziehend', patchwork: '{Name} wächst in einer Patchworkfamilie auf', verstorben: 'Ein Elternteil von {Name} ist verstorben' }[f.familienstand];
      if (stand && lb && !(f.familienstand === 'zusammen' && f.lebt_bei === 'beide')) { s.push(h.satz(h.fuelle(stand + '; {er} ' + lb[1] + '.', c), c)); }
      else if (stand && f.familienstand === 'zusammen' && f.lebt_bei === 'beide') { s.push(h.satz(h.fuelle('{Name} lebt mit beiden Eltern zusammen.', c), c)); }
      else if (stand) { s.push(h.satz(h.fuelle(stand + '.', c), c)); }
      else if (lb) { s.push(h.satz(h.fuelle('{N} ' + lb[1] + '.', c), c)); }
      if (O.kontakt[f.kontakt]) { s.push(O.kontakt[f.kontakt]); }
      if (h.frei(ds, 'kontakt_details')) { s.push(h.satz(h.frei(ds, 'kontakt_details'), c)); }
      const n = parseInt(f.geschwister_anzahl, 10);
      if (n === 0) { s.push(h.satz(h.fuelle('{N} ist Einzelkind.', c), c)); }
      else if (n > 0) {
        const pos = O.position[f.geschwister_position];
        s.push(h.satz(h.fuelle('{N} hat ' + (n === 1 ? 'ein Geschwisterkind' : n + ' Geschwister') + (pos ? ' und ist ' + pos : '') + '.', c), c));
      }
      const sp = h.chips(ds, 'sprachen').map(function (k) { return k === 'andere' ? h.frei(ds, 'sprache_andere') : h.chipText(c, 'sprachen', k); }).filter(Boolean);
      if (sp.length) { s.push(h.satz(h.fuelle('In der Familie wird {liste} gesprochen.', c, { liste: h.liste(sp, c) }), c)); }
      const beruf = function (wer, b, z) {
        if (z === 'nicht') { return wer + ' ist derzeit nicht berufstätig'; }
        if (!b && !z) { return ''; }
        return wer + ' arbeitet' + (O.arbeitszeit[z] ? ' ' + O.arbeitszeit[z] : '') + (b ? ' als ' + b : '');
      };
      const bm = beruf('die Mutter', h.frei(ds, 'beruf_mutter'), f.zeit_mutter), bv = beruf('der Vater', h.frei(ds, 'beruf_vater'), f.zeit_vater);
      if (bm && bv) { s.push(h.satz(bm + '; ' + bv + '.', c)); } else if (bm || bv) { s.push(h.satz((bm || bv) + '.', c)); }
      const ev = h.chips(ds, 'ereignisse').map(function (k) {
        const det = ds.f && ds.f.ereignis_details && ds.f.ereignis_details[k];
        return h.chipText(c, 'ereignisse', k) + (det ? ' (' + det + ')' : '');
      });
      if (ev.length) { s.push(h.satz(h.fuelle('{{Als belastendes Ereignis wird|Als belastende Ereignisse werden}} {liste} genannt.', c, { liste: h.liste(ev, c), zahl: ev.length }), c)); }
      const bt = h.chips(ds, 'betreuung');
      if (bt.indexOf('maison_relais') >= 0) { s.push(h.satz(h.fuelle('Nach der Schule besucht {N} die Maison Relais.', c), c)); }
      if (bt.indexOf('grosseltern') >= 0) { s.push(h.satz(h.fuelle('Außerhalb der Schule betreuen die Großeltern {Na} regelmäßig.', c), c)); }
      if (bt.indexOf('tagesmutter') >= 0) { s.push(h.satz(h.fuelle('Außerhalb der Schule wird {N} von einer Tagesmutter betreut.', c), c)); }
      if (h.frei(ds, 'freizeit')) { s.push(h.satz(h.frei(ds, 'freizeit'), c)); }
      return (s.length ? [h.block(s.join(' '))] : []).concat(h.freiBloecke(ds, 'familie'));
    },

    aktuell: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      const klasse = f.klasse || (st && st.klasse) || '', schule = f.schule_name || (st && st.foerderort) || '';
      const s = [];
      if (klasse || schule) {
        const am = /^(Lycée|Lyzeum|Athénée|Institut|Centre|Zentrum)/i.test(schule) ? 'am' : 'an der';
        const tpl = klasse ? 'Derzeit besucht {N} die Klasse {klasse}{schule: {am} {schule}}{lp: bei {lp}}.' : 'Derzeit wird {N} {am} {schule}{lp: bei {lp}} beschult.';
        s.push(h.satz(h.fuelle(tpl, c, { klasse: klasse, schule: schule, am: am, lp: h.frei(ds, 'lehrperson') }), c));
      }
      if (h.frei(ds, 'eseb_referenz')) { s.push(h.satz(h.fuelle('{seine} Referenzperson im ESEB ist {x}.', c, { x: h.frei(ds, 'eseb_referenz') }), c)); }
      const b = s.length ? [h.block(s.join(' '))] : [];
      const rows = ((ds.tabellen && ds.tabellen.aktuell) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) { b.push({ typ: 'tabelle', id: 'aktuell', kopf: ['Zeitraum', 'Klasse', 'Maßnahme', 'Akteur'], zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }), abschnitt: 'massnahmen' }); }
      return b;
    },

    verfahren: function (c, ds, st, h) {
      c.neuerAbsatz();
      const v = h.chips(ds, 'verfahren').filter(function (k) { return k !== 'andere' && h.chipText(c, 'verfahren', k); }).map(function (k) { return h.chipText(c, 'verfahren', k); });
      if (h.frei(ds, 'verfahren_andere')) { v.push(h.frei(ds, 'verfahren_andere')); }
      if (!v.length) { v.push(h.chipText(c, 'verfahren', 'eldib')); }
      const s = [h.satz(h.fuelle('Die vorliegende Einschätzung beruht auf {liste}, auf Beobachtungen im Unterricht sowie auf Gesprächen mit den Lehrpersonen, den Eltern und {Name}.', c, { liste: h.liste(v, c) }), c)];
      if (h.frei(ds, 'verfahren_ort')) { s.push(h.satz(h.fuelle('Beobachtungen und Gespräche fanden in {ort} statt.', c, { ort: h.frei(ds, 'verfahren_ort') }), c)); }
      return [h.block(s.join(' '))];
    },

    beobachtungIntro: function (c, ds, st, h) {
      const l = ((ds.f && ds.f.beobachtungen) || []).filter(function (b) { return b && (b.datum || b.setting || b.dauer); });
      if (!l.length) { return []; }
      c.neuerAbsatz();
      const T = DS_TEXTE.de.s;
      const teile = l.map(function (b) {
        return h.fuelle(T.beob_eintrag, c, { datum: h.datum(b.datum, 'de'), ort: O.setting[b.setting] || b.setting_andere || '', dauer: b.dauer ? String(b.dauer) : '' }).trim();
      });
      return [h.block(h.satz(h.fuelle(l.length > 1 ? T.beob_mehrere : T.beob_eine, c, { beob: h.liste(teile, c) }), c))];
    },

    eldib: function (c, ds, st, h, profil) {
      const b = [];
      c.neuerAbsatz();
      b.push(h.block('Der ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen) ist ein standardisiertes Einschätzungsinstrument, das dazu dient, die soziale und emotionale Entwicklung von Kindern und Jugendlichen im Alter zwischen Geburt und sechzehn Jahren zu erfassen. Er stellt ein Profil spezifischer Fähigkeiten zur Verfügung, die als Indikatoren der sozialen und emotionalen Förderung dienen.'));
      const bereiche = (profil && profil.bereiche) || [];
      const mitStufe = bereiche.filter(function (x) { return x.stufe > 0; });
      bereiche.forEach(function (x, i) {
        c.neuerAbsatz();
        const s = [];
        const v = { bereich: x.name, code: x.code, stufe: roem(x.stufe), richtziel: x.richtziel, alter: O.stufeAlter[x.stufe] || '' };
        if (!x.stufe) { s.push(h.satz(h.fuelle('Im Bereich {bereich} ({code}) wurden noch keine Items als erreicht eingeschätzt.', c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[0]) { s.push(h.satz(h.fuelle('Am weitesten entwickelt ist bei {Name} der Bereich {bereich} ({code}): Hier befindet {er} sich auf Entwicklungsstufe {stufe} („{richtziel}“, {alter}).', c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[mitStufe.length - 1]) { s.push(h.satz(h.fuelle('Am wenigsten entwickelt ist der Bereich {bereich} ({code}): Hier befindet {N} sich auf Entwicklungsstufe {stufe} („{richtziel}“, {alter}).', c, v), c)); }
        else { s.push(h.satz(h.fuelle('Im Bereich {bereich} ({code}) befindet {N} sich auf Entwicklungsstufe {stufe} („{richtziel}“, {alter}).', c, v), c)); }
        // die zwei zuletzt erreichten Fähigkeiten, mit unterschiedlichem Verb
        const pr = [], verben = {};
        (x.erreicht || []).slice().reverse().forEach(function (it) { const p = praedikat(it.description), v = p.split(' ')[0]; if (p && pr.length < 2 && !verben[v]) { verben[v] = 1; pr.unshift(p); } });
        if (pr.length) { s.push(h.satz(h.fuelle('{N} verfügt hier bereits über gute Fähigkeiten: {^N} {p}.', c, { p: h.liste(pr, c, false, true) }), c)); }
        const extra = ds.frei && ds.frei['eldib_' + x.id];
        if (extra && String(extra).trim()) { s.push(String(extra).trim()); }
        b.push(h.block(s.join(' ')));
        if ((x.ziele || []).length) {
          b.push(h.block(h.satz(h.fuelle('Ausgehend vom Richtziel ergeben sich folgende Lernziele für {Na}:', c), c)));
          b.push({ typ: 'liste', punkte: x.ziele.map(function (z) { return z.code + ' – ' + String(z.description || '').replace(/\.$/, ''); }) });
        } else if (x.stufe) {
          b.push(h.block('In diesem Bereich wurden keine Lernziele festgelegt.'));
        }
      });
      if (profil && profil.lebensalter != null && mitStufe.length) {
        c.neuerAbsatz();
        const erw = profil.erwarteteStufe, unter = mitStufe.filter(function (x) { return x.stufe < erw; });
        const v = { roem: roem(erw), alter: O.stufeAlter[erw] || '', jahre: profil.lebensalter };
        let t;
        if (unter.length === bereiche.length) { t = 'Gemessen am Lebensalter von {jahre} Jahren wäre Entwicklungsstufe {roem} ({alter}) zu erwarten; alle vier Bereiche liegen darunter.'; }
        else if (unter.length === 1) { t = 'Gemessen am Lebensalter von {jahre} Jahren wäre Entwicklungsstufe {roem} ({alter}) zu erwarten; darunter liegt der Bereich {liste}.'; v.liste = unter[0].name; }
        else if (unter.length) { t = 'Gemessen am Lebensalter von {jahre} Jahren wäre Entwicklungsstufe {roem} ({alter}) zu erwarten; darunter liegen die Bereiche {liste}.'; v.liste = h.liste(unter.map(function (x) { return x.name; }), c); }
        else { t = 'Alle eingeschätzten Bereiche entsprechen mindestens der altersentsprechenden Entwicklungsstufe {roem} ({alter}).'; }
        b.push(h.block(h.satz(h.fuelle(t, c, v), c)));
      }
      return b;
    },

    schluss: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      const mitKind = c.alter != null && c.alter >= 12;
      const wer = mitKind ? '{Name} sowie den Eltern' : 'den Eltern';
      let t;
      if (f.abgestimmt === 'vorbehalte') {
        t = 'Auf Grundlage der vorliegenden Testergebnisse, Beobachtungen und anamnestischen Informationen wurden spezifische Förderbedarfe identifiziert. In Gesprächen mit ' + wer + ' konnten Empfehlungen zur weiteren Unterstützung der individuellen Entwicklung erarbeitet werden. Dabei wurden einzelne vorgeschlagene Maßnahmen ' + (mitKind ? 'von den Eltern bzw. von {Name}' : 'von den Eltern') + ' kritisch hinterfragt bzw. nicht vollständig befürwortet.';
      } else if (f.abgestimmt === 'nein') {
        t = 'Auf Grundlage der vorliegenden Testergebnisse, Beobachtungen und anamnestischen Informationen wurden spezifische Förderbedarfe identifiziert und Empfehlungen formuliert. Eine Abstimmung dieser Empfehlungen mit ' + wer + ' war bislang nicht möglich.';
      } else {
        t = 'Auf Basis der erhobenen Testergebnisse, Beobachtungen und anamnestischen Informationen wurden in enger Abstimmung mit ' + wer + ' gezielte Förderbedarfe identifiziert. Daraus abgeleitet wurden gemeinsam Empfehlungen formuliert, die die individuelle Entwicklung wirksam unterstützen sollen.';
      }
      return [h.block(h.satz(h.fuelle(t, c), c))].concat(h.freiBloecke(ds, 'vorbehalte'));
    },

    ziele: function (c, ds, st, h, profil) {
      const f = ds.f || {}, b = [];
      c.neuerAbsatz();
      const ziele = [];
      ((profil && profil.bereiche) || []).forEach(function (x) { (x.ziele || []).forEach(function (z) { ziele.push({ z: z, x: x }); }); });
      const bis = f.ziele_bis ? 'bis zum ' + h.datum(f.ziele_bis, 'de') : 'bis zum Ende des nächsten ' + ((st && st.periodenTyp) === 'semester' ? 'Semesters' : 'Trimesters');
      if (ziele.length) {
        b.push(h.block(h.satz(h.fuelle('Die folgenden Förderziele leiten sich aus den ELDiB-Lernzielen ab. Sie beschreiben den jeweils nächsten Entwicklungsschritt; ihre Umsetzung wird {bis} im Alltag beobachtet und in der nächsten ELDiB-Einschätzung überprüft.', c, { bis: bis }), c)));
        b.push({ typ: 'liste', punkte: ziele.map(function (e) {
          c.neuerAbsatz();
          const p = praedikat(e.z.description);
          const text = p ? h.satz(h.fuelle('{Name} ' + p, c), c) : String(e.z.description || '').replace(/\.$/, '');
          return text + ' (' + e.z.code + ')';
        }) });
      }
      const zus = h.frei(ds, 'ziele_zusatz');
      if (zus) { b.push({ typ: 'liste', punkte: zus.split(/\n+/).map(function (l) { return l.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean) }); }
      return b;
    },

    empfehlungen: function (c, ds, st, h) {
      const b = [];
      c.neuerAbsatz();
      [['empf_familie', 'Familiärer Kontext', 'empfehlung_familie'], ['empf_schule', 'Schulischer Kontext (lokal)', 'empfehlung_schule'], ['empf_region', 'Regionaler Kontext (ESEB / CDSE)', 'empfehlung_region']].forEach(function (g) {
        const p = h.chips(ds, g[0]).map(function (k) { return h.fuelle(h.chipText(c, g[0], k), c); });
        const extra = h.frei(ds, g[2]);
        if (extra) { extra.split(/\n+/).forEach(function (l) { l = l.replace(/^[-•*]\s*/, '').trim(); if (l) { p.push(l); } }); }
        if (p.length) { b.push({ typ: 'zwischen', text: g[1] }); b.push({ typ: 'liste', punkte: p }); }
      });
      return b;
    },

    cni: function (c, ds, st, h) {
      c.neuerAbsatz();
      const m = h.chips(ds, 'cni').map(function (k) { return h.fuelle(h.chipText(c, 'cni', k), c); });
      const b = [];
      if (m.length) {
        b.push(h.block(m.length > 1 ? 'Das CDSE empfiehlt der Nationalen Kommission für Inklusion (CNI) folgende Maßnahmen:' : 'Das CDSE empfiehlt der Nationalen Kommission für Inklusion (CNI) folgende Maßnahme:'));
        b.push({ typ: 'liste', punkte: m });
      }
      return b.concat(h.freiBloecke(ds, 'cni_begruendung'));
    }
  };
})();

// ==== 44-ds-texte-fr.js ====
// =====================================================================
// DS-Baukasten: französische Texte (Diagnostic spécialisé, Vorlage der CNI vom 12.11.2025)
// ---------------------------------------------------------------------
// Gleiche Schlüssel und Felder wie 43-ds-texte-de.js.
// q   = Aussage zum Anklicken (Oberfläche, typografischer Apostroph ’)
// t   = Formulierungen für den Bericht je Stufe:
//       [0] 1–2 trifft (gar) nicht zu  [1] 3 eher nicht  [2] 4 teils/teils
//       [3] 5 eher zu  [4] 6–7 trifft (voll) zu      null = kein Satz
//       Jeder Satz muss auch nach "Toutefois, / En revanche, / Cependant, " passen
//       (der Motor setzt das vor die erste Schwierigkeit nach Stärken).
// np  = Kurzform mit "de/d'" für "aucun signe {liste}" (bereits elidiert)
// m   = Situation für muster_* ("dans …", "face à …")
// e   = erklärender Satz zu den zwei deutlichsten Entwicklungsängsten
// n/g = Erklärungsansätze: n ohne Präposition ("Par ailleurs, {liste} pourrait …"),
//       g mit "de/d'" ("comme l'expression {liste}")
// a/d = Bedürfnisse, beide mit "de/d'" ("a surtout besoin {liste}", "bénéficierait {liste}")
// Platzhalter (Französisch):
//   {N}  Name bzw. il/elle – NUR als Subjekt
//   {Nt} Name bzw. betontes Pronomen lui/elle – nur nach Präposition (pour, avec, chez, par)
//   {Name} immer der Name; {il} {lui} {le} {T} feste Pronomen ({le} = le/la)
//   {Nd}/{Na} werden im Französischen NICHT verwendet (Wortstellung der Pronomen).
//   [[masculin|féminin]] Angleichung an das Kind; {{singulier|pluriel}} Zahl der Quelle/Liste
//   {Q}/{Qd}/{Qg} Eltern-Quelle (la mère / la mère / de la mère), {QS}/{QSd} Schul-Quelle
//   {KONTRAST} gibt es im Französischen nicht.
// Der Motor elidiert (de/que/ne/se/le/la … vor Vokal) und setzt die Leerzeichen vor : ; ! ?
// und in « ». Es gibt KEINE Zusammenziehung (de le -> du, à le -> au): Präpositionen stehen
// deshalb in den Listenformen. Wörter mit h aspiré (honte, hauteur, hasard …) nie nach
// de/le/la verwenden. Apostroph im Berichtstext: gerade ('), wie ihn der Motor erzeugt.
// Stil: sachlich, beschreibend, ressourcenorientiert; Präsens für Berichte von Schule,
// Eltern und Kind, Passé composé/Imparfait für die Verhaltensbeobachtung.
// =====================================================================
DS_TEXTE.fr = {
  skala: { 1: 'ne correspond pas du tout', 2: '', 3: '', 4: 'en partie', 5: '', 6: '', 7: 'correspond tout à fait', leer: 'non renseigné' },

  a: {
    // ---------------- 3.2 Point de vue de l'école ----------------
    s_motiv: { q: 'Participe aux cours avec motivation.', t: [
      "{N} ne participe guère aux cours et doit régulièrement être [[encouragé|encouragée]] à s'investir.",
      "En classe, {N} participe de manière plutôt réservée ; sa motivation varie nettement.",
      "{N} participe aux cours de manière inégale, selon le sujet abordé et sa forme du jour.",
      "Dans l'ensemble, {N} participe aux cours avec motivation.",
      "{N} participe aux cours avec motivation et intérêt."] },
    s_konz: { q: 'Parvient à se concentrer en classe de manière adaptée à son âge.', t: [
      "{N} ne parvient pratiquement pas à se concentrer : le moindre stimulus suffit à {le} distraire.",
      "{N} ne parvient à se concentrer que brièvement et se laisse facilement distraire.",
      "{N} ne parvient à se concentrer que par moments ; son attention faiblit nettement lors des phases de travail prolongées.",
      "{N} parvient le plus souvent à se concentrer de manière adaptée à son âge.",
      "En classe, {N} se concentre de manière efficace et durable."] },
    s_selbst: { q: 'Commence et termine ses tâches de manière autonome.', t: [
      "{N} ne commence pratiquement aucune tâche sans aide, et les travaux entamés restent souvent inachevés.",
      "{N} a souvent besoin d'aide pour commencer ses tâches et les mener à terme.",
      "Pour commencer et terminer ses tâches, {N} a encore régulièrement besoin d'être [[relancé|relancée]].",
      "La plupart du temps, {N} commence et termine ses tâches de manière autonome.",
      "{N} commence ses tâches de manière autonome et les mène jusqu'au bout."] },
    s_sorgfalt: { q: 'Travaille avec soin et de manière organisée.', t: [
      "{N} travaille souvent de manière précipitée et désorganisée ; son matériel et ses devoirs manquent fréquemment.",
      "{N} parvient rarement à travailler avec soin et de manière organisée.",
      "Le soin et l'organisation dans le travail varient d'un jour à l'autre.",
      "{N} travaille généralement avec soin et tient son matériel en ordre.",
      "{N} travaille avec soin et de manière bien organisée."] },
    s_leistung: { q: 'Atteint les objectifs d’apprentissage de son niveau.', t: [
      "Sur le plan scolaire, {N} se situe nettement en dessous des attentes de son niveau.",
      "{N} n'atteint que partiellement les attentes scolaires de son niveau.",
      "{N} n'atteint les objectifs d'apprentissage de son niveau que dans certaines matières.",
      "{N} atteint globalement les objectifs d'apprentissage de son niveau.",
      "Sur le plan scolaire, {N} atteint sans difficulté les objectifs d'apprentissage de son niveau."] },
    s_unruhe: { q: 'Présente une agitation motrice.', np: "d'agitation motrice", t: [
      null,
      "Une agitation motrice n'apparaît que ponctuellement.",
      "{N} présente par moments une agitation motrice, notamment lors des longues périodes en position assise.",
      "{N} est souvent [[agité|agitée]] sur le plan moteur et a du mal à rester [[assis|assise]] tranquillement.",
      "{N} présente une agitation motrice marquée ; rester [[assis|assise]] calmement pendant un certain temps lui est à peine possible."] },
    s_regeln: { q: 'Respecte les règles de classe et les accords.', t: [
      "{N} ne respecte pratiquement pas les règles de classe ni les accords convenus.",
      "{N} ne respecte les règles et les accords qu'avec beaucoup de soutien.",
      "{N} ne respecte les règles de classe que partiellement, bien que {il} les connaisse.",
      "Le plus souvent, {N} respecte les règles de classe et les accords.",
      "{N} respecte scrupuleusement les règles de classe et les accords."] },
    s_impuls: { q: 'Agit de manière impulsive, sans réfléchir.', np: "d'impulsivité", t: [
      null,
      "Des réactions impulsives restent exceptionnelles.",
      "Dans les moments d'excitation, {N} agit parfois de manière impulsive.",
      "{N} agit souvent de manière impulsive, sans mesurer les conséquences de ses actes.",
      "{N} agit très souvent de manière impulsive ; réfléchir avant d'agir reste très difficile pour {T}."] },
    s_frust: { q: 'Sait gérer la frustration et l’échec.', t: [
      "{N} ne parvient guère à gérer la frustration et l'échec : le moindre revers entraîne de vives réactions.",
      "Gérer la frustration et l'échec reste difficile pour {Nt}.",
      "Face à la frustration, {N} réagit de façon variable : {il} parvient parfois à surmonter un revers, parfois non.",
      "Face à la frustration et à l'échec, {N} réagit généralement de manière adaptée.",
      "{N} supporte bien la frustration et l'échec."] },
    s_wut: { q: 'Réagit par des crises de colère.', np: 'de crises de colère', t: [
      null,
      "Les crises de colère sont rares.",
      "Des crises de colère surviennent occasionnellement.",
      "{N} réagit régulièrement par des crises de colère, notamment face aux critiques ou aux limites posées.",
      "{N} présente des crises de colère violentes et répétées qui perturbent nettement le déroulement des cours."] },
    s_aggr: { q: 'Fait preuve d’agressivité verbale ou physique.', np: "d'agressivité", t: [
      null,
      "{N} ne se montre [[agressif|agressive]] que de façon isolée.",
      "En cas de conflit, {N} réagit à l'occasion de manière agressive, verbalement ou physiquement.",
      "{N} a fréquemment des réactions agressives envers les autres, verbales ou physiques.",
      "{N} manifeste une agressivité verbale et physique marquée envers les autres."] },
    s_verweig: { q: 'Refuse des tâches ou des consignes.', np: 'de refus face aux tâches', t: [
      null,
      "{N} ne refuse que rarement les tâches demandées.",
      "Il arrive que {N} refuse des tâches ou des consignes, en particulier lorsque les exigences sont élevées.",
      "{N} refuse à maintes reprises des tâches ou des consignes.",
      "{N} refuse très souvent les tâches et les consignes ; sa participation n'est généralement possible qu'avec un accompagnement étroit."] },
    s_rueckzug: { q: 'Se replie sur soi (silence, retrait).', np: 'de repli sur soi', t: [
      null,
      "Un repli sur soi ne s'observe qu'occasionnellement.",
      "{N} se replie de temps à autre sur [[lui|elle]]-même ; {il} paraît alors [[renfermé|renfermée]].",
      "{N} a tendance à se replier sur [[lui|elle]]-même ; {il} reste alors [[silencieux|silencieuse]] et [[renfermé|renfermée]].",
      "{N} se montre très [[replié|repliée]] sur [[lui|elle]]-même, sans guère prendre contact avec les autres de sa propre initiative."] },
    s_angst: { q: 'Montre de l’anxiété ou de la tension (p. ex. peur de l’échec).', np: "d'anxiété marquée", t: [
      null,
      "Des signes d'anxiété restent peu fréquents.",
      "Lors des évaluations, {N} paraît parfois [[tendu|tendue]] ou [[anxieux|anxieuse]].",
      "{N} paraît souvent [[anxieux|anxieuse]] et [[tendu|tendue]], en particulier face aux exigences scolaires.",
      "{N} se montre très [[anxieux|anxieuse]] et [[tendu|tendue]] ; la peur de l'échec marque nettement son quotidien scolaire."] },
    s_ausgeglichen: { q: 'Fait preuve d’un bon équilibre émotionnel.', t: [
      "Sur le plan émotionnel, {N} est très instable ; son humeur varie fortement.",
      "{N} paraît souvent instable sur le plan émotionnel.",
      "Sur le plan émotionnel, {N} paraît tantôt [[équilibré|équilibrée]], tantôt irritable selon les jours.",
      "{N} paraît globalement [[équilibré|équilibrée]] sur le plan émotionnel.",
      "{N} paraît [[équilibré|équilibrée]] et stable sur le plan émotionnel."] },
    s_peers: { q: 'Entretient de bons contacts avec ses camarades.', t: [
      "{N} n'a pratiquement pas de contacts avec ses camarades et paraît [[isolé|isolée]] au sein de la classe.",
      "{N} ne parvient que difficilement à nouer des contacts avec ses camarades.",
      "{N} n'est que partiellement [[intégré|intégrée]] dans le groupe classe, même si {il} entretient des contacts avec quelques camarades.",
      "{N} a de bons contacts avec la plupart de ses camarades.",
      "{N} est bien [[intégré|intégrée]] dans la classe et entretient des relations solides avec ses camarades."] },
    s_konflikt: { q: 'Entre souvent en conflit avec ses camarades.', np: 'de conflits fréquents avec les pairs', t: [
      null,
      "{N} n'entre que rarement en conflit avec ses camarades.",
      "{N} entre occasionnellement en conflit avec ses camarades.",
      "{N} entre souvent en conflit avec ses camarades.",
      "{N} entre très souvent en conflit avec ses camarades et ne parvient guère à résoudre ces conflits sans aide."] },
    s_erwachsene: { q: 'Entretient une relation de confiance avec le personnel enseignant.', t: [
      "La relation avec le personnel enseignant est fortement dégradée.",
      "La relation avec le personnel enseignant est tendue.",
      "La relation avec le personnel enseignant est fluctuante.",
      "{N} entretient dans l'ensemble une bonne relation avec le personnel enseignant.",
      "{N} entretient une relation de confiance avec le personnel enseignant."] },
    s_hilfe: { q: 'Accepte l’aide et le soutien.', t: [
      "{N} refuse le plus souvent l'aide et le soutien proposés.",
      "{N} n'accepte l'aide qu'avec hésitation.",
      "{N} n'accepte l'aide que partiellement, selon la situation et la personne.",
      "En général, {N} accepte volontiers l'aide et le soutien proposés.",
      "{N} accepte l'aide et le soutien de bon gré."] },
    s_selbstwert: { q: 'A confiance en soi et ose relever des défis.', t: [
      "{N} a très peu confiance en [[lui|elle]] ; son estime de soi semble nettement fragilisée.",
      "{N} a peu confiance en [[lui|elle]] et se montre plutôt [[hésitant|hésitante]].",
      "{N} fait preuve d'une confiance en soi fluctuante.",
      "{N} fait preuve d'une assez bonne confiance en soi.",
      "{N} paraît [[sûr|sûre]] de [[lui|elle]] et n'hésite pas à relever des défis."] },

    // ---------------- 3.3 Point de vue de l'élève ----------------
    k_offen: { q: 'Parle ouvertement de soi et de sa situation lors de l’entretien.', t: [
      "Lors de l'entretien{datum: du {datum}}, {N} s'est [[montré|montrée]] très [[fermé|fermée]] et n'a guère parlé de [[lui|elle]]-même ni de sa situation.",
      "Lors de l'entretien{datum: du {datum}}, {N} s'est [[montré|montrée]] plutôt [[réservé|réservée]].",
      "Lors de l'entretien{datum: du {datum}}, {N} s'est progressivement [[ouvert|ouverte]] après une certaine réserve.",
      "Lors de l'entretien{datum: du {datum}}, {N} s'est [[montré|montrée]] globalement [[ouvert|ouverte]].",
      "Lors de l'entretien{datum: du {datum}}, {N} s'est [[montré|montrée]] [[ouvert|ouverte]] et a parlé volontiers de sa situation et de [[lui|elle]]-même."] },
    k_wohl: { q: 'Se sent bien à l’école.', t: [
      "{N} dit ne pas se sentir bien à l'école et s'y rendre à contrecœur.",
      "{N} dit souvent ne pas se sentir bien à l'école.",
      "À l'école, {N} dit se sentir tantôt bien, tantôt mal.",
      "{N} indique se sentir bien à l'école la plupart du temps.",
      "{N} indique aller volontiers à l'école et s'y sentir bien."] },
    k_klasse: { q: 'Se sent à sa place dans la classe.', t: [
      "Dans sa classe, {N} ne se sent pas [[accepté|acceptée]].",
      "Dans sa classe, {N} se sent plutôt à l'écart.",
      "Dans sa classe, {N} ne se sent que partiellement à sa place.",
      "Dans sa classe, {N} se sent globalement [[accepté|acceptée]].",
      "Dans sa classe, {N} se sent [[accepté|acceptée]] et à sa place."] },
    k_lehrer: { q: 'S’entend bien avec le personnel enseignant.', t: [
      "{N} déclare ne pas s'entendre avec le personnel enseignant.",
      "{N} déclare avoir du mal à s'entendre avec le personnel enseignant.",
      "{N} s'entend bien avec certains membres du personnel enseignant, moins avec d'autres.",
      "Selon ses dires, {N} s'entend généralement bien avec le personnel enseignant.",
      "Selon ses dires, {N} s'entend bien avec le personnel enseignant."] },
    k_leistung: { q: 'Évalue positivement ses capacités scolaires.', t: [
      "{N} porte un regard très négatif sur ses capacités scolaires.",
      "{N} doute de ses capacités scolaires.",
      "{N} évalue ses capacités scolaires de manière contrastée : dans certaines matières, {il} a confiance en [[lui|elle]], dans d'autres beaucoup moins.",
      "{N} a une image plutôt positive de ses capacités scolaires.",
      "{N} porte un regard positif sur ses capacités scolaires."] },
    k_ungerecht: { q: 'Éprouve un sentiment d’injustice.', np: "d'un sentiment d'injustice", t: [
      null,
      "{N} n'éprouve que rarement un sentiment d'injustice.",
      "Il arrive que {N} se sente [[traité|traitée]] injustement.",
      "{N} a souvent le sentiment d'être [[traité|traitée]] injustement, notamment lors de conflits et de sanctions.",
      "{N} a très souvent le sentiment d'être [[traité|traitée]] injustement et perçoit ses propres difficultés avant tout comme une réaction au comportement des autres."] },
    k_selbstwert: { q: 'Parle de soi de manière positive.', t: [
      "{N} parle de [[lui|elle]]-même de manière très dévalorisante.",
      "En parlant de [[lui|elle]]-même, {N} se dévalorise plutôt.",
      "{N} parle de [[lui|elle]]-même tantôt de manière positive, tantôt de manière dévalorisante.",
      "{N} parle de [[lui|elle]]-même plutôt positivement.",
      "{N} parle de [[lui|elle]]-même de manière positive et sait nommer ses points forts."] },
    k_druck: { q: 'Exprime une souffrance (tristesse, surcharge, sentiment de ne plus y arriver).', np: "d'une souffrance importante", t: [
      null,
      "{N} ne décrit guère de souffrance.",
      "{N} décrit une certaine souffrance.",
      "{N} décrit une souffrance marquée et se sent souvent [[accablé|accablée]].",
      "{N} décrit une souffrance importante ; {il} se sent très [[accablé|accablée]] et triste."] },
    k_angst: { q: 'Fait part de peurs ou d’inquiétudes.', np: "de peurs ou d'inquiétudes", t: [
      null,
      "{N} ne mentionne guère de peurs ni d'inquiétudes.",
      "{N} fait part de quelques peurs et inquiétudes.",
      "{N} fait état de peurs et d'inquiétudes récurrentes.",
      "{N} fait part de peurs et d'inquiétudes intenses qui {le} préoccupent beaucoup."] },
    k_einsicht: { q: 'Reconnaît ses propres difficultés (conscience du problème).', t: [
      "{N} ne montre aucune conscience de ses propres difficultés.",
      "{N} ne reconnaît ses propres difficultés que de manière très limitée.",
      "{N} ne perçoit ses difficultés qu'en partie.",
      "{N} parvient dans une large mesure à nommer ses propres difficultés.",
      "{N} sait nommer clairement ses propres difficultés et y réfléchir."] },
    k_veraenderung: { q: 'Souhaite un changement et accepte de l’aide.', t: [
      "{N} n'exprime aucun souhait de changement et refuse toute aide.",
      "{N} ne formule guère le souhait que les choses changent.",
      "{N} ne se montre que partiellement [[ouvert|ouverte]] à l'aide proposée.",
      "{N} souhaite que les choses changent et se montre globalement [[ouvert|ouverte]] à l'aide.",
      "{N} exprime clairement le souhait que les choses changent et se montre [[ouvert|ouverte]] à l'aide."] },
    k_freunde: { q: 'A des amis.', t: [
      "{N} dit ne pas avoir d'amis.",
      "{N} dit n'avoir guère d'amis.",
      "{N} mentionne quelques amis.",
      "D'après ses dires, {N} a plusieurs amis.",
      "{N} fait état de plusieurs amitiés solides."] },
    k_familie: { q: 'Décrit positivement la relation avec sa famille.', t: [
      "{N} décrit la relation avec sa famille comme très tendue.",
      "{N} décrit la relation avec sa famille comme difficile.",
      "{N} décrit la relation avec sa famille comme fluctuante, entre moments sereins et tensions.",
      "{N} décrit la relation avec sa famille comme plutôt positive.",
      "{N} décrit la relation avec sa famille comme positive et soutenante."] },

    // ---------------- 3.4 Point de vue des parents ----------------
    e_alltag: { q: 'Se débrouille bien au quotidien à la maison.', t: [
      "Le quotidien à la maison est marqué par des difficultés permanentes.",
      "Le quotidien familial est fréquemment marqué par des difficultés.",
      "Au quotidien, la vie familiale alterne entre des périodes calmes et des situations difficiles.",
      "À la maison, {N} se débrouille plutôt bien au quotidien.",
      "À la maison, {N} se débrouille bien au quotidien."] },
    e_regeln: { q: 'Respecte les règles et les accords à la maison.', t: [
      "{N} ne respecte pratiquement pas les règles et les accords familiaux.",
      "{N} ne respecte que rarement les règles et les accords familiaux.",
      "{N} ne respecte que partiellement les règles et les accords familiaux.",
      "La plupart du temps, {N} respecte les règles et les accords familiaux.",
      "{N} respecte de manière fiable les règles et les accords familiaux."] },
    e_wut: { q: 'Fait des crises de colère à la maison.', np: 'de crises de colère', t: [
      null,
      "Les crises de colère restent rares.",
      "Il arrive que des crises de colère éclatent.",
      "Des crises de colère surviennent fréquemment, en particulier lorsque des limites sont posées.",
      "De violentes crises de colère surviennent très fréquemment et pèsent lourdement sur le quotidien familial."] },
    e_geschwister: { q: 'Entre souvent en conflit avec ses frères et sœurs.', np: 'de conflits dans la fratrie', t: [
      null,
      "Les conflits dans la fratrie sont peu fréquents.",
      "Des disputes éclatent de temps en temps dans la fratrie.",
      "Les disputes dans la fratrie sont nombreuses.",
      "De violents conflits éclatent très fréquemment dans la fratrie."] },
    e_rueckzug: { q: 'Se replie sur soi à la maison.', np: 'de repli sur soi', t: [
      null,
      "{N} ne se replie que rarement sur [[lui|elle]]-même.",
      "{N} se replie par moments sur [[lui|elle]]-même.",
      "{N} se retire souvent dans sa chambre.",
      "{N} se replie fortement sur [[lui|elle]]-même, au point d'être peu accessible pour sa famille."] },
    e_angst: { q: 'Montre des peurs ou des inquiétudes à la maison.', np: "d'anxiété", t: [
      null,
      "{N} ne manifeste guère de peurs.",
      "{N} exprime à l'occasion des peurs ou des inquiétudes.",
      "{N} exprime régulièrement des peurs et des inquiétudes.",
      "{N} manifeste des peurs importantes qui limitent nettement son quotidien."] },
    e_koerper: { q: 'A des troubles du sommeil ou des plaintes physiques (p. ex. maux de ventre).', np: 'de plaintes psychosomatiques', t: [
      null,
      "Les troubles du sommeil ou les plaintes physiques restent l'exception.",
      "Des troubles du sommeil ou des plaintes physiques apparaissent par périodes.",
      "{N} a des troubles du sommeil à répétition ou se plaint de maux physiques, tels que des maux de ventre ou de tête.",
      "{N} présente des troubles du sommeil marqués et se plaint très souvent de maux physiques."] },
    e_medien: { q: 'Passe beaucoup de temps devant les écrans.', np: "d'une utilisation problématique des écrans", t: [
      null,
      "Selon {Q}, le temps passé devant les écrans reste raisonnable.",
      "{N} passe parfois beaucoup de temps devant les écrans.",
      "{N} passe beaucoup de temps devant les écrans ; toute limite posée déclenche facilement des conflits.",
      "{N} passe énormément de temps devant les écrans ; leur utilisation est difficile à limiter."] },
    e_hausaufgaben: { q: 'Les devoirs sont source de conflits.', np: 'de conflits autour des devoirs', t: [
      null,
      "Les devoirs ne donnent que rarement lieu à des conflits.",
      "Les devoirs sont parfois source de conflits.",
      "Les devoirs provoquent des tensions plusieurs fois par semaine.",
      "Les devoirs donnent lieu à de vifs conflits presque tous les jours."] },
    e_beziehung: { q: 'La relation avec l’enfant est décrite comme bonne.', t: [
      "{Q} {{décrit|décrivent}} la relation avec {Nt} comme très éprouvante.",
      "{Q} {{décrit|décrivent}} la relation avec {Nt} comme tendue.",
      "{Q} {{décrit|décrivent}} la relation avec {Nt} comme ambivalente.",
      "Selon {Q}, la relation avec {Nt} est globalement bonne.",
      "{Q} {{décrit|décrivent}} la relation avec {Nt} comme affectueuse et solide."] },
    e_struktur: { q: 'Le quotidien familial est clairement structuré.', t: [
      "Le quotidien familial manque largement de structures et de routines stables.",
      "Le quotidien familial est peu structuré.",
      "Le quotidien familial n'est que partiellement structuré.",
      "Le quotidien familial est dans l'ensemble bien structuré.",
      "Le quotidien familial est clairement structuré et rythmé par des routines fiables."] },
    e_konsequenz: { q: 'L’éducation est claire et cohérente.', t: [
      "Poser un cadre éducatif clair et cohérent s'avère très difficile ; {Q} {{semble|semblent}} rapidement à court de moyens.",
      "L'application cohérente des règles s'avère difficile.",
      "Les règles ne sont appliquées de manière cohérente que partiellement.",
      "L'éducation est le plus souvent claire et cohérente.",
      "Le cadre éducatif posé par {Qd} est clair et cohérent."] },
    e_belastung: { q: 'Les parents se sentent très éprouvés par la situation.', np: "d'une charge particulière pour la famille", t: [
      null,
      "{Q} ne {{fait|font}} guère état d'une charge particulière liée à la situation.",
      "{Q} {{vit|vivent}} la situation comme éprouvante par moments.",
      "La situation pèse lourdement sur {Qd}.",
      "La situation pèse très lourdement sur {Qd}, qui {{se dit|se disent}} à bout de forces."] },
    e_sicht_schule: { q: 'Les parents partagent l’évaluation de l’école.', t: [
      "L'évaluation de l'école n'est pas partagée par {Qd}.",
      "L'évaluation de l'école ne rejoint guère celle {Qg}.",
      "L'évaluation de l'école ne rejoint que partiellement celle {Qg}.",
      "L'évaluation de l'école rejoint largement celle {Qg}.",
      "L'évaluation de l'école rejoint pleinement celle {Qg}."] },
    e_kooperation: { q: 'Les parents sont disposés à collaborer.', t: [
      "{Q} {{refuse|refusent}} actuellement toute collaboration.",
      "{Q} {{fait|font}} preuve de réserve à l'égard d'une collaboration.",
      "{Q} {{accepte|acceptent}} en principe de collaborer, tout en exprimant encore des réserves.",
      "{Q} {{se montre favorable|se montrent favorables}} à une collaboration.",
      "{Q} {{se montre très favorable|se montrent très favorables}} à une collaboration et s'y {{investit|investissent}} activement."] },

    // ---------------- 4.1 Observations comportementales (passé composé / imparfait) ----------------
    b_start: { q: 'A commencé les tâches de manière autonome.', t: [
      "{N} n'a commencé les tâches qu'après plusieurs sollicitations.",
      "{N} a le plus souvent attendu d'y être [[invité|invitée]] pour commencer les tâches.",
      "{N} a commencé les tâches tantôt de manière autonome, tantôt seulement après y avoir été [[invité|invitée]].",
      "La plupart du temps, {N} a commencé les tâches de manière autonome.",
      "{N} s'est [[mis|mise]] au travail rapidement et sans aide."] },
    b_konz: { q: 'A travaillé de manière concentrée et persévérante.', t: [
      "Un travail concentré n'a guère été possible : {N} interrompait les tâches au bout de quelques instants.",
      "{N} n'est [[resté|restée]] [[concentré|concentrée]] que peu de temps.",
      "L'attention a nettement fluctué : des phases de travail concentré alternaient avec des phases de distraction.",
      "{N} a travaillé de manière plutôt concentrée.",
      "{N} a travaillé de manière concentrée et persévérante."] },
    b_anweisung: { q: 'A suivi les consignes données.', t: [
      "{N} n'a guère suivi les consignes données.",
      "{N} n'a souvent suivi les consignes qu'après répétition.",
      "{N} a suivi les consignes de manière irrégulière.",
      "{N} a suivi les consignes dans la plupart des cas.",
      "{N} a suivi les consignes avec constance."] },
    b_hilfe: { q: 'A demandé de l’aide en cas de besoin.', t: [
      "Face aux difficultés, {N} n'a pas demandé d'aide.",
      "Face aux difficultés, {N} a rarement demandé de l'aide.",
      "{N} n'a demandé de l'aide qu'occasionnellement.",
      "Face aux difficultés, {N} a généralement sollicité de l'aide de manière appropriée.",
      "Face aux difficultés, {N} a sollicité de l'aide de manière appropriée."] },
    b_unruhe: { q: 'A présenté une agitation motrice.', np: "d'agitation motrice", t: [
      null,
      "Une agitation motrice n'est apparue que ponctuellement.",
      "{N} était par moments [[agité|agitée]] sur le plan moteur.",
      "{N} était souvent [[agité|agitée]] et a quitté sa place à plusieurs reprises.",
      "{N} présentait une agitation motrice marquée ; rester [[assis|assise]] calmement ne lui était guère possible."] },
    b_ablenk: { q: 'S’est laissé facilement distraire.', np: "d'une distractibilité accrue", t: [
      null,
      "{N} n'a été [[distrait|distraite]] que rarement.",
      "À certains moments, {N} s'est [[montré|montrée]] [[distrait|distraite]].",
      "{N} a souvent été [[distrait|distraite]] par des bruits ou par ses camarades.",
      "Le moindre stimulus suffisait à détourner son attention."] },
    b_regeln: { q: 'A respecté les règles de classe.', t: [
      "{N} n'a guère respecté les règles de classe.",
      "{N} n'a que rarement respecté les règles de classe.",
      "{N} n'a respecté les règles de classe que partiellement.",
      "{N} a respecté les règles de classe dans l'ensemble.",
      "{N} a respecté les règles de classe de manière fiable."] },
    b_frust: { q: 'A géré les difficultés ou la frustration de manière adaptée.', t: [
      "[[Confronté|Confrontée]] à des difficultés, {N} a réagi vivement, par exemple en abandonnant la tâche ou en manifestant de la colère.",
      "{N} a eu du mal à gérer les difficultés de manière adaptée.",
      "{N} a géré les difficultés de façon inégale.",
      "{N} a le plus souvent géré les difficultés de manière adaptée.",
      "{N} a géré les difficultés et la frustration de manière adaptée."] },
    b_uebergang: { q: 'A géré les transitions et les changements sans difficulté.', t: [
      "Les transitions et les changements ont été très difficiles pour {Nt}.",
      "Les transitions et les changements ont été difficiles pour {Nt}.",
      "{N} a géré les transitions et les changements avec plus ou moins de facilité.",
      "{N} a géré les transitions et les changements sans grande difficulté.",
      "{N} a géré les transitions et les changements sans difficulté."] },
    b_lob: { q: 'A réagi positivement aux éloges et à l’attention.', t: [
      "Les éloges et l'attention n'ont guère suscité de réaction chez {Nt}.",
      "{N} a réagi aux éloges avec une certaine réserve.",
      "Les éloges ont suscité des réactions variables chez {Nt}.",
      "{N} a réagi aux éloges et à l'attention de manière globalement positive.",
      "{N} a réagi de manière visiblement positive aux éloges et à l'attention."] },
    b_stoer: { q: 'A perturbé le cours.', np: 'de perturbations du cours', t: [
      null,
      "{N} n'a perturbé le cours qu'à de rares occasions.",
      "À quelques reprises, {N} a perturbé le cours.",
      "{N} a perturbé le cours à plusieurs reprises, par exemple par des interventions intempestives ou des bavardages.",
      "{N} a perturbé le cours fréquemment et de manière marquée."] },
    b_peers: { q: 'A recherché et entretenu des contacts positifs avec ses camarades.', t: [
      "{N} n'a pas cherché à entrer en relation avec ses camarades.",
      "{N} n'a guère cherché le contact avec ses camarades.",
      "{N} n'a pris contact avec ses camarades qu'occasionnellement.",
      "Avec ses camarades, {N} a eu des échanges majoritairement positifs.",
      "{N} a recherché et entretenu des contacts positifs avec ses camarades."] },
    b_erwachsene: { q: 'A pris contact avec les adultes de manière adaptée.', t: [
      "{N} a largement évité le contact avec les adultes.",
      "{N} ne s'est [[approché|approchée]] des adultes qu'avec hésitation.",
      "{N} a adopté envers les adultes une attitude tantôt adaptée, tantôt trop familière ou au contraire évitante.",
      "{N} est [[entré|entrée]] en contact avec les adultes de manière plutôt adaptée.",
      "{N} a pris contact avec les adultes de manière adaptée et ouverte."] },
    b_isol: { q: 'A eu tendance à s’isoler ou à rester à l’écart.', np: 'de repli sur soi', t: [
      null,
      "{N} ne s'est [[isolé|isolée]] que rarement.",
      "{N} est [[resté|restée]] à l'écart de temps à autre.",
      "{N} s'est souvent [[retiré|retirée]] et est [[resté|restée]] à l'écart.",
      "{N} est [[resté|restée]] presque constamment à l'écart et a évité les échanges avec les autres."] },
    b_provo: { q: 'A provoqué les autres ou réagi de manière agressive.', np: 'de comportements provocateurs', t: [
      null,
      "Des comportements provocateurs sont restés exceptionnels.",
      "{N} a ponctuellement provoqué ses camarades.",
      "{N} a provoqué ses camarades à plusieurs reprises ou a réagi de manière agressive.",
      "{N} a fréquemment provoqué les autres et a réagi à plusieurs reprises de manière verbalement ou physiquement agressive."] },

    // ---------------- 4.3 Interprétations ----------------
    i_uebereinstimmung: { q: 'Les points de vue de l’école, des parents et de l’élève concordent.', t: [
      "Les points de vue de l'école, des parents et de {Name} [[lui|elle]]-même divergent nettement.",
      "Les points de vue de l'école, des parents et de {Name} [[lui|elle]]-même ne concordent que sur certains points.",
      "Les points de vue de l'école, des parents et de {Name} [[lui|elle]]-même concordent en partie.",
      "Les points de vue de l'école, des parents et de {Name} [[lui|elle]]-même concordent largement.",
      "Les points de vue de l'école, des parents et de {Name} [[lui|elle]]-même concordent sur les points essentiels."] },
    i_beobachtung: { q: 'Les observations réalisées confirment les informations recueillies.', t: [
      "Les observations réalisées ne confirment pas les informations recueillies.",
      "Les observations réalisées ne confirment les informations recueillies que sur quelques points.",
      "Les observations réalisées confirment en partie les informations recueillies.",
      "Les observations réalisées confirment largement les informations recueillies.",
      "Les observations réalisées confirment les informations recueillies."] },
    i_eldib: { q: 'Le profil ELDiB correspond à l’impression clinique.', t: [
      "Le profil ELDiB s'écarte sensiblement de l'impression clinique.",
      "Le profil ELDiB ne rejoint l'impression clinique que sur certains points.",
      "Le profil ELDiB correspond en partie à l'impression clinique.",
      "Le profil ELDiB correspond largement à l'impression clinique.",
      "Le profil ELDiB correspond à l'impression clinique."] },
    i_unstrukturiert: { q: 'Les difficultés apparaissent surtout dans les situations peu structurées (récréation, transitions, travail libre).', m: 'dans les situations peu structurées (notamment les récréations et les transitions)', t: [
      null, null,
      "Une partie des difficultés survient dans des situations peu structurées.",
      "Les difficultés apparaissent souvent dans des situations peu structurées, par exemple pendant les récréations ou lors des transitions.",
      "Les difficultés apparaissent surtout dans des situations peu structurées, telles que les récréations, les transitions ou les phases de travail libre."] },
    i_anforderung: { q: 'Les difficultés apparaissent surtout face aux exigences de performance.', m: 'face aux exigences de performance', t: [
      null, null,
      "Les exigences de performance contribuent en partie aux difficultés.",
      "Les difficultés apparaissent souvent face aux exigences de performance.",
      "Les difficultés apparaissent surtout face aux exigences de performance."] },
    i_beziehung: { q: 'Les difficultés apparaissent surtout dans les situations relationnelles (proximité, rivalité, limites).', m: 'dans les situations relationnelles (notamment en cas de proximité, de rivalité ou de limites posées)', t: [
      null, null,
      "Certaines difficultés apparaissent dans des situations relationnelles.",
      "Les difficultés apparaissent souvent dans des situations relationnelles, par exemple en cas de rivalité ou lorsque des limites sont posées.",
      "Les difficultés apparaissent surtout dans des situations relationnelles, notamment en cas de proximité, de rivalité ou lorsque des limites sont posées."] },
    i_einzel: { q: 'En situation individuelle avec un adulte, l’élève réussit nettement mieux.', t: [
      null, null,
      "En situation individuelle, {N} réussit parfois mieux qu'en groupe.",
      "En situation individuelle avec un adulte, {N} réussit mieux qu'en groupe.",
      "En situation individuelle avec un adulte, {N} réussit nettement mieux qu'en groupe."] },
    i_schule: { q: 'Les difficultés apparaissent surtout à l’école.', t: [
      null, null,
      "À l'école, les difficultés se manifestent un peu plus qu'à la maison.",
      "Les difficultés se manifestent davantage à l'école qu'à la maison.",
      "C'est avant tout dans le contexte scolaire que les difficultés se manifestent."] },
    i_zuhause: { q: 'Les difficultés apparaissent surtout à la maison.', t: [
      null, null,
      "À la maison, les difficultés se manifestent un peu plus qu'à l'école.",
      "À la maison, les difficultés sont plus marquées qu'à l'école.",
      "C'est avant tout dans le contexte familial que les difficultés se manifestent."] },
    // Peurs liées au développement (thérapie développementale selon Wood / ETEP)
    i_angst_verlassen: { q: 'Peur de l’abandon (niveau I)', np: "d'une peur de l'abandon (niveau I)",
      e: "{N} paraît fortement [[dépendant|dépendante]] de la disponibilité d'adultes familiers et réagit aux séparations ou aux changements par une insécurité marquée." },
    i_angst_unzul: { q: 'Peur de l’insuffisance, de l’échec (niveau II)', np: "d'une peur de l'échec (niveau II)",
      e: "{N} tend à percevoir rapidement les exigences comme une surcharge et craint de ne pas répondre aux attentes." },
    i_angst_schuld: { q: 'Peur liée à la culpabilité (niveau III)', np: "d'une peur liée à la culpabilité (niveau III)",
      e: "{N} associe vraisemblablement les erreurs et les transgressions à un fort sentiment de culpabilité et s'attend rapidement à être [[rejeté|rejetée]]." },
    i_angst_konflikt: { q: 'Peur du conflit (niveau IV)', np: "d'une peur du conflit (niveau IV)",
      e: "Dans les confrontations avec ses pairs comme avec les adultes, {N} paraît se sentir rapidement sous pression et tend soit à éviter les conflits, soit à les envenimer." },
    i_angst_identitaet: { q: 'Peur liée à l’identité (niveau V)', np: "d'une peur liée à l'identité (niveau V)",
      e: "Les questions liées à son rôle, à son appartenance et à son autonomie paraissent très présentes chez {Nt}." },
    // Mécanismes de défense: np mit Artikel ("on observe surtout …", "par …")
    i_abw_rueckzug: { q: 'Repli sur soi', np: 'le repli sur soi' },
    i_abw_vermeidung: { q: 'Évitement, refus', np: "l'évitement" },
    i_abw_aggression: { q: 'Agressivité, attaque', np: 'une contre-attaque agressive' },
    i_abw_regression: { q: 'Régression (comportements de petit enfant)', np: 'des comportements régressifs' },
    i_abw_clown: { q: 'Pitreries, diversion', np: 'les pitreries' },
    i_abw_kontrolle: { q: 'Contrôle excessif, perfectionnisme', np: 'une maîtrise de soi excessive' },
    i_abw_projektion: { q: 'Projection, attribution de la faute aux autres', np: "l'attribution de la faute aux autres" },
    i_abw_verleugnung: { q: 'Déni, minimisation', np: 'la minimisation' },
    // Pistes d'explication: n = ohne Präposition, g = mit "de/d'" (nach "l'expression")
    i_hyp_entwicklung: { q: 'Retard du développement socio-émotionnel', n: 'un retard du développement socio-émotionnel', g: "d'un retard du développement socio-émotionnel" },
    i_hyp_regulation: { q: 'Difficultés de régulation émotionnelle', n: 'une capacité limitée de régulation émotionnelle', g: "d'une capacité limitée de régulation émotionnelle" },
    i_hyp_belastung: { q: 'Réaction à des difficultés familiales ou scolaires actuelles', pl: true, n: 'des facteurs de stress familiaux ou scolaires actuels', g: 'de facteurs de stress familiaux ou scolaires actuels' },
    i_hyp_bindung: { q: 'Insécurité de l’attachement', n: 'un attachement insécure', g: "d'un attachement insécure" },
    i_hyp_sozial: { q: 'Insécurité sociale', n: 'une insécurité dans les relations sociales', g: "d'une insécurité dans les relations sociales" },
    i_hyp_aufmerksamkeit: { q: 'Problématique attentionnelle', n: 'une problématique attentionnelle', g: "d'une problématique attentionnelle" },
    i_hyp_ueberforderung: { q: 'Surcharge scolaire (exigences trop élevées)', n: 'une surcharge liée aux exigences scolaires', g: "d'une surcharge liée aux exigences scolaires" },
    i_hyp_unterforderung: { q: 'Manque de stimulation scolaire (exigences trop faibles)', n: 'un manque de stimulation scolaire', g: "d'un manque de stimulation scolaire" },
    i_hyp_trauma: { q: 'Conséquences possibles d’expériences éprouvantes (à approfondir)' },

    // ---------------- 5.1 Besoins: a und d beide mit "de/d'" ----------------
    n_struktur: { q: 'Des structures claires et un déroulement prévisible', a: 'de structures claires et de routines prévisibles', d: 'de structures claires et de routines prévisibles' },
    n_beziehung: { q: 'Une personne de référence fiable et stable', a: "d'une personne de référence fiable et stable", d: "d'une personne de référence fiable et stable" },
    n_erfolg: { q: 'Des expériences de réussite et des retours positifs', a: "d'expériences de réussite et de retours positifs", d: "d'expériences de réussite et de retours positifs" },
    n_regulation: { q: 'Un soutien dans la régulation des émotions', a: "d'un soutien dans la régulation de ses émotions", d: "d'un soutien dans la régulation de ses émotions" },
    n_grenzen: { q: 'Des limites claires et des retours cohérents', a: 'de limites claires et de retours cohérents', d: 'de limites claires et de retours cohérents' },
    n_sozial: { q: 'Le développement des compétences sociales', a: "d'un renforcement ciblé de ses compétences sociales", d: "d'un renforcement ciblé de ses compétences sociales" },
    n_organisation: { q: 'Des aides pour l’attention et l’organisation du travail', a: "d'aides pour structurer son attention et l'organisation de son travail", d: "d'aides pour structurer son attention et l'organisation de son travail" },
    n_differenzierung: { q: 'Des exigences adaptées (différenciation)', a: "d'exigences adaptées à ses possibilités", d: "d'exigences adaptées à ses possibilités" },
    n_therapie: { q: 'Un accompagnement thérapeutique', a: "d'un accompagnement thérapeutique", d: "d'un accompagnement thérapeutique" },
    n_familie: { q: 'Un soutien de la famille', a: "d'un soutien apporté à sa famille", d: "d'un soutien apporté à sa famille" }
  },

  // Auswahlfelder: [Beschriftung (Oberfläche), Form im Bericht]
  chips: {
    s_staerken: { hilfsbereit: ['serviabilité', 'sa serviabilité'], kreativ: ['créativité', 'sa créativité'], humorvoll: ['humour', "son sens de l'humour"], sportlich: ['aptitudes sportives', 'ses aptitudes sportives'], sprachlich: ['aisance langagière', 'ses compétences langagières'], mathematisch: ['mathématiques', 'ses compétences en mathématiques'], technisch: ['intérêt technique', 'son intérêt pour la technique'], musikalisch: ['sens musical', 'son sens musical'], fantasievoll: ['imagination', 'son imagination'], wissbegierig: ['curiosité', 'sa curiosité intellectuelle'], freundlich: ['gentillesse', 'sa gentillesse'], zuverlaessig: ['fiabilité', 'sa fiabilité'] },
    s_hilft: { ansagen: ['consignes courtes et claires', 'des consignes courtes et claires'], wiederholung: ['répétitions', 'des répétitions'], visualisierung: ['supports visuels', 'des supports visuels'], bewegung: ['pauses actives', 'des pauses de mouvement'], rueckzugsort: ['espace de retrait', 'un espace de retrait'], einzelansprache: ['consignes individuelles', 'des consignes données individuellement'], lob: ['éloges, renforcement', 'des éloges et un renforcement positif'], vorwarnung: ['annonce des changements', "l'annonce anticipée des changements"], kleingruppe: ['petit groupe', 'le travail en petit groupe'], naehe: ['proximité de l’adulte', "la proximité de l'adulte"], struktur: ['routines fixes', 'des routines et une structure stables'] },
    s_erwartung: { strategien: ['stratégies pour la classe', 'des stratégies concrètes pour la classe'], verhalten: ['meilleur comportement', 'une amélioration du comportement'], konzentration: ['meilleure concentration', 'une meilleure concentration'], integration: ['intégration sociale', 'une meilleure intégration sociale'], stabilitaet: ['stabilité émotionnelle', 'davantage de stabilité émotionnelle'], leistung: ['meilleurs résultats', 'de meilleurs résultats scolaires'], therapie: ['aide thérapeutique', 'un soutien thérapeutique externe'], eltern: ['collaboration avec les parents', 'une collaboration plus étroite avec les parents'], foerderort: ['autre lieu de scolarisation', "l'examen d'un autre lieu de scolarisation"], abklaerung: ['bilan diagnostique', 'un bilan diagnostique'] },
    k_interessen: { sport: ['sport', 'faire du sport'], gaming: ['jeux vidéo', 'jouer aux jeux vidéo'], musik: ['musique', 'écouter ou faire de la musique'], lesen: ['lecture', 'lire'], kreatives: ['dessin, bricolage', 'dessiner et bricoler'], freunde: ['voir des amis', 'passer du temps avec ses amis'], tiere: ['animaux', "s'occuper d'animaux"], natur: ['nature', 'passer du temps dans la nature'], technik: ['technique', 'explorer des sujets techniques'], kochen: ['cuisine, pâtisserie', 'cuisiner et faire des gâteaux'] },
    k_wuensche: { noten: ['meilleures notes', 'de meilleures notes'], freunde: ['plus d’amis', "davantage d'amis"], streit: ['moins de disputes', 'moins de disputes'], ruhe: ['calme à la maison', 'plus de calme à la maison'], druck: ['moins de pression', 'moins de pression'], verstanden: ['être compris', 'davantage de compréhension'], hilfe: ['recevoir de l’aide', "de l'aide"], klasse: ['autre classe', 'un changement de classe'], schule: ['autre école', "un changement d'école"], inruhe: ['être laissé tranquille', 'plus de moments de tranquillité'] },
    e_staerken: { hilfsbereit: ['serviabilité', 'sa serviabilité'], liebevoll: ['affection', 'son affection pour sa famille'], selbststaendig: ['autonomie', 'son autonomie'], kreativ: ['créativité', 'sa créativité'], humorvoll: ['humour', "son sens de l'humour"], sportlich: ['sport', 'son goût pour le sport'], verantwortung: ['sens des responsabilités', 'son sens des responsabilités'], offen: ['ouverture', 'son ouverture'] },
    e_erwartung: { verhalten: ['meilleur comportement', 'une amélioration du comportement'], entspannung: ['apaisement à la maison', 'un apaisement de la situation à la maison'], strategien: ['stratégies éducatives', 'des stratégies éducatives concrètes'], leistung: ['meilleurs résultats', 'de meilleurs résultats scolaires'], abklaerung: ['bilan diagnostique', 'un bilan diagnostique'], therapie: ['thérapie pour l’enfant', 'un soutien thérapeutique pour {Nt}'], beratung: ['conseils pour les parents', 'un soutien et des conseils pour la famille'], foerderort: ['autre lieu de scolarisation', "l'examen d'un autre lieu de scolarisation"], verstehen: ['comprendre l’enfant', 'une meilleure compréhension de ce qui se joue chez {Nt}'], bestaetigung: ['repères, soutien', 'des repères et du soutien'] },
    ressourcen: { kognitiv: ['capacités cognitives', 'son bon potentiel cognitif'], kreativ: ['créativité', 'sa créativité'], sportlich: ['sport', 'ses aptitudes sportives'], musisch: ['arts, musique', 'sa sensibilité artistique et musicale'], humor: ['humour', "son sens de l'humour"], empathie: ['empathie', 'son empathie'], neugier: ['curiosité', "sa curiosité et son envie d'apprendre"], begeisterung: ['enthousiasme', 'son enthousiasme'], hilfsbereit: ['serviabilité', 'sa serviabilité'], verantwortung: ['prend des responsabilités', 'son sens des responsabilités'], einzelbeziehung: ['relation individuelle', 'son aisance dans la relation individuelle'], lernbereit: ['volonté d’apprendre', "sa volonté d'apprendre"], vertrauensperson: ['personne de confiance', "une personne de confiance à l'école"], familie: ['famille soutenante', 'une famille soutenante'], hobbys: ['loisirs', "des loisirs et centres d'intérêt stables"], reflexion: ['capacité de réflexion', 'sa capacité de réflexion'] },
    // Faits
    anlass: { verhalten_schule: ['comportement à l’école', "des troubles du comportement à l'école"], verhalten_zuhause: ['comportement à la maison', 'des troubles du comportement à la maison'], emotional: ['difficultés émotionnelles', 'des difficultés émotionnelles'], sozial: ['difficultés sociales', 'des difficultés dans les relations sociales'], leistung: ['résultats scolaires', "des difficultés d'apprentissage"], aufmerksamkeit: ['attention', "des difficultés d'attention et de concentration"], aggression: ['agressivité', 'un comportement agressif'], rueckzug: ['repli sur soi', 'un repli sur soi'], aengste: ['peurs, angoisses', 'des peurs importantes'], schulverweigerung: ['refus scolaire', 'un refus scolaire ou un absentéisme'] },
    anliegen: { isa: ['ISA', "la mise en place d'une Intervention spécialisée ambulatoire (ISA)"], conseil: ['Conseil & Guidance', 'un accompagnement de type Conseil & Guidance'], cst: ['CST', 'une admission au Centre socio-thérapeutique (CST)'], clapa: ['Classe de Participation', 'une admission en Classe de Participation'], annexe: ['Annexe Junglinster', "une admission à l'Annexe Junglinster"], lernwerkstatt: ['Atelier d’apprentissage spécifique', "une participation à l'Atelier d'apprentissage spécifique"], beschulung: ['scolarisation spécialisée', 'une scolarisation spécialisée au CDSE'], diagnostik: ['diagnostic', "la réalisation d'un bilan diagnostique approfondi"] },
    empfohlen: { lehrperson: ['enseignant·e', "de l'enseignant·e"], eseb: ['ESEB', "de l'ESEB"], schulleitung: ['direction de l’école', "de la direction de l'école"], arzt: ['médecin', 'du médecin traitant'], psychologe: ['psychologue', 'du ou de la psychologue'], eltern: ['souhait des parents', ''] },
    diagnosen: { adhs: ['TDAH/TDA', 'TDAH'], ass: ['trouble du spectre de l’autisme', "trouble du spectre de l'autisme"], lernstoerung: ['trouble des apprentissages', 'trouble spécifique des apprentissages'], sprachstoerung: ['trouble du langage', 'trouble du développement du langage'], emotional: ['trouble émotionnel', 'trouble émotionnel'], bindung: ['trouble de l’attachement', "trouble de l'attachement"], angst: ['trouble anxieux', 'trouble anxieux'], opposition: ['trouble oppositionnel', 'trouble oppositionnel avec provocation'], andere: ['autre', ''] },
    ereignisse: { trennung: ['séparation des parents', 'la séparation des parents'], umzug: ['déménagement', 'un déménagement'], verlust: ['perte d’un proche', "la perte d'un proche"], krankheit: ['maladie dans la famille', 'une maladie dans la famille'], konflikte: ['conflits familiaux', 'des conflits familiaux'], trauma: ['expérience éprouvante', 'une expérience éprouvante'], migration: ['migration', 'un parcours migratoire'] },
    betreuung: { maison_relais: ['maison relais', ''], grosseltern: ['grands-parents', ''], tagesmutter: ['assistant·e parental·e', ''], keine: ['aucun', ''] },
    sprachen: { lb: ['luxembourgeois', 'luxembourgeois'], de: ['allemand', 'allemand'], fr: ['français', 'français'], pt: ['portugais', 'portugais'], en: ['anglais', 'anglais'], it: ['italien', 'italien'], es: ['espagnol', 'espagnol'], andere: ['autre', ''] },
    verfahren: { eldib: ['ELDiB', "l'ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen)"], beobachtung: ['observation', ''], gespraeche: ['entretiens', ''], sdq: ['SDQ', 'le questionnaire SDQ (Strengths and Difficulties Questionnaire)'], wisc: ['WISC-V', 'le WISC-V'], andere: ['autre', ''] },
    empf_familie: { step: ['programme STEP (CDSE)', 'Participation au programme de soutien à la parentalité STEP au CDSE'], erziehungsberatung: ['guidance parentale', "Guidance parentale visant à renforcer l'assurance éducative des parents"], familientherapie: ['thérapie familiale', 'Accompagnement en thérapie familiale'], tagesstruktur: ['structure du quotidien', 'Structure quotidienne claire et routines fiables à la maison'], austausch: ['échanges avec l’école', "Échanges réguliers entre les parents et l'école"], medien: ['règles pour les écrans', "Règles claires, convenues ensemble, concernant l'utilisation des écrans"], freizeit: ['activité de loisirs', 'Activité de loisirs régulière, par exemple dans un club ou une association'] },
    empf_schule: { sitzplatz: ['place en classe', "Place calme, à proximité de l'enseignant·e"], differenzierung: ['différenciation', 'Consignes différenciées et clairement structurées'], verstaerker: ['système de renforcement', 'Retours positifs fréquents, le cas échéant avec un système de renforcement'], regeln: ['règles et conséquences', 'Quelques règles claires assorties de conséquences prévisibles'], auszeit: ['temps calme / retrait', 'Possibilité convenue de temps calme ou de retrait'], uebergaenge: ['annoncer les transitions', 'Annonce anticipée des transitions et des changements'], visualisierung: ['visualisation', 'Visualisation du déroulement de la journée et des étapes de travail'], bewegung: ['pauses actives', 'Pauses de mouvement régulières'], iebs: ['I-EBS', "Soutien par l'I-EBS"], bezugsperson: ['personne de référence', "Personne de référence stable au sein de l'école"] },
    empf_region: { eseb: ['suivi ESEB', "Poursuite de l'accompagnement par l'ESEB"], isa: ['ISA', 'Intervention spécialisée ambulatoire (ISA) du CDSE'], conseil: ['Conseil & Guidance', 'Conseil & Guidance par le CDSE'], lernwerkstatt: ['Atelier d’apprentissage', "Participation à l'Atelier d'apprentissage spécifique"], psychotherapie: ['psychothérapie', 'Accompagnement psychothérapeutique pour enfants et adolescents'], ergotherapie: ['ergothérapie', 'Ergothérapie'], logopaedie: ['logopédie', 'Logopédie'], psychiatrie: ['bilan pédopsychiatrique', 'Bilan pédopsychiatrique'] },
    cni: { diag_kompetenzzentrum: ['diagnostic avec Centre de compétence', 'Diagnostic spécialisé en collaboration avec un Centre de compétence'], beratung_eltern: ['conseil parents et élève', "Conseil et guidance des parents et de l'élève"], beratung_fachleute: ['conseil professionnel·le·s', 'Conseil et guidance des professionnel·le·s'], lernwerkstatt: ['Atelier d’apprentissage', "Atelier d'apprentissage spécifique"], isa: ['ISA', 'Intervention spécialisée ambulatoire (ISA)'], beschulung: ['scolarisation au CDSE', 'Scolarisation spécialisée au CDSE'], clapa: ['Classe de Participation', 'Scolarisation spécialisée au CDSE – Classe de Participation'], cst: ['CST', 'Scolarisation spécialisée au CDSE – Centre socio-thérapeutique (CST)'], annexe: ['Annexe Junglinster', 'Scolarisation spécialisée au CDSE – Annexe Junglinster'], ausland: ['scolarisation à l’étranger', "Scolarisation spécialisée à l'étranger"], rehabilitation: ['rééducation', 'Rééducation'], abschluss: ['fin de la prise en charge', 'Fin de la prise en charge'], schliessung: ['clôture du dossier', 'Clôture du dossier au CDSE'] }
  },

  // Rahmensätze
  s: {
    liste_und: 'et', liste_oder: 'ou', liste_sowie: 'ainsi que',
    schule_intro: "Les informations suivantes reposent sur un entretien mené{datum: le {datum}} avec {QSd}.",
    schule_staerken: "Du point de vue de l'école, {N} se distingue notamment par {liste}.",
    schule_hilft: "Les aides suivantes se sont révélées utiles : {liste}.",
    schule_erwartung: "L'école attend de l'intervention du CDSE {liste}.",
    schule_ohne: "L'école ne signale par ailleurs aucun signe {liste}.",
    kind_intro: "Un entretien a été mené avec {Name}{datum: le {datum}}.",
    kind_interessen: "Pendant son temps libre, {N} aime {liste}.",
    kind_wuensche: "Pour l'avenir, {N} souhaite {liste}.",
    kind_vertrauen: "Comme personne de confiance à l'école, {N} cite {text}.",
    kind_ohne: "L'entretien n'a mis en évidence aucun signe {liste}.",
    eltern_intro: "Les informations suivantes proviennent d'un entretien mené{datum: le {datum}} avec {Qd}.",
    // Zahl richtet sich hier nach der Liste (nicht nach der Quelle)
    eltern_staerken: "Pour {Qd}, {{le point fort|les points forts}} de {Name} {{est|sont}} {liste}.",
    eltern_erwartung: "{Q} {{espère|espèrent}} que l'accompagnement apportera {liste}.",
    eltern_ohne: "Par ailleurs, aucun signe {liste} n'est rapporté.",
    beob_ohne: "Aucun signe {liste} n'a été relevé pendant la période d'observation.",
    beob_eine: "L'observation a été réalisée {beob}.",
    beob_mehrere: "Les observations ont été réalisées {beob}.",
    beob_eintrag: '{datum: le {datum}}{ort: {ort}}{dauer: ({dauer} minutes)}',
    // Interprétations
    muster_stark: "Les difficultés apparaissent surtout {liste}.",
    muster_mittel: "Les difficultés apparaissent souvent {liste}.",
    muster_mittel_nach: "Elles se manifestent souvent aussi {liste}.",
    aengste_stark: "Dans une perspective de thérapie développementale, les éléments recueillis font apparaître des indices nets {liste}.",
    aengste_mittel: "Dans une perspective de thérapie développementale, les éléments recueillis font apparaître des indices {liste}.",
    aengste_beide: "Dans une perspective de thérapie développementale, les éléments recueillis font apparaître des indices nets {stark}, ainsi que, dans une moindre mesure, {mittel}.",
    abwehr_stark: "Sur le plan des mécanismes de défense, on observe surtout {liste}.",
    abwehr_mittel: "Sur le plan des mécanismes de défense, on observe dans une certaine mesure {liste}.",
    abwehr_beide: "Sur le plan des mécanismes de défense, on observe surtout {stark}, ainsi que, dans une certaine mesure, {mittel}.",
    abwehr_bezug_stark: "{N} semble se défendre contre {{cette peur|ces peurs}} principalement par {stark}.",
    abwehr_bezug_beide: "{N} semble se défendre contre {{cette peur|ces peurs}} principalement par {stark}, ainsi que, dans une certaine mesure, par {mittel}.",
    abwehr_bezug_mittel: "{N} semble se défendre en partie contre {{cette peur|ces peurs}} par {mittel}.",
    hyp_stark: "Les difficultés décrites peuvent être comprises avant tout comme l'expression {liste}.",
    hyp_mittel: "Par ailleurs, {liste} {{pourrait|pourraient}} jouer un rôle.",
    hyp_nur_mittel: "Parmi les explications possibles, on peut envisager {liste}.",
    hyp_trauma: "L'éventuelle influence d'expériences éprouvantes devrait faire l'objet d'une évaluation spécialisée complémentaire.",
    // Besoins, ressources
    beduerfnis_stark: "{N} a surtout besoin {liste}.",
    beduerfnis_mittel: "{N} bénéficierait en outre {liste}.",
    beduerfnis_nur_mittel: "{N} bénéficierait {liste}.",
    ressourcen: "L'accompagnement pourra s'appuyer sur les ressources de {Name} : {liste}."
  },

  // Beschriftungen der Oberfläche
  ui: {
    titel: 'Diagnostic spécialisé', untertitel: 'Pas à pas jusqu’au rapport final',
    schritte: { stamm: 'Élève & rapport', auftrag: 'Demande', vorgeschichte: 'Antécédents', familie: 'Bilan social', aktuell: 'Situation actuelle', schule: 'Point de vue de l’école', kind: 'Point de vue de l’élève', eltern: 'Point de vue des parents', beobachtung: 'Observations', eldib: 'Résultats ELDiB', deutung: 'Interprétations', beduerfnisse: 'Besoins & ressources', empfehlungen: 'Recommandations', vorschau: 'Aperçu & export' },
    themen: {
      'schule.lernen': 'Apprentissages et méthode de travail', 'schule.verhalten': 'Comportement et émotions', 'schule.beziehung': 'Relations',
      'kind.schule': 'École', 'kind.selbst': 'Image de soi et bien-être', 'kind.umfeld': 'Amis et famille',
      'eltern.alltag': 'Quotidien à la maison', 'eltern.familie': 'Famille et éducation', 'eltern.zusammenarbeit': 'Collaboration',
      'beobachtung.arbeit': 'Comportement au travail', 'beobachtung.verhalten': 'Comportement', 'beobachtung.kontakt': 'Contacts',
      'deutung.quellen': 'Mise en perspective des informations', 'deutung.muster': 'Dans quelles situations les difficultés apparaissent-elles ?', 'deutung.aengste': 'Peurs liées au développement (indices)', 'deutung.abwehr': 'Mécanismes de défense (dans quelle mesure ?)', 'deutung.hypothesen': 'Pistes d’explication (quelle probabilité ?)',
      'beduerfnisse.beduerfnisse': 'Besoins de l’élève (quelle importance ?)'
    },
    chipTitel: { s_staerken: 'Points forts selon l’école', s_hilft: 'Qu’est-ce qui aide en classe ?', s_erwartung: 'Qu’attend l’école ?', k_interessen: 'Centres d’intérêt et loisirs', k_wuensche: 'Que souhaite l’élève ?', e_staerken: 'Points forts selon les parents', e_erwartung: 'Qu’attendent les parents ?', ressourcen: 'Ressources de l’élève' }
  }
};

// ==== 44b-ds-fakten-fr.js ====
// =====================================================================
// DS-Baukasten: französische Faktenabschnitte (Demande, Antécédents, Bilan social,
// Situation actuelle, Procédure diagnostique, ELDiB, Conclusion, Objectifs,
// Recommandations, CNI) – Formulierungen nach der Vorlage der CNI (12.11.2025)
// h = Hilfsfunktionen aus DsText (fuelle, satz, liste, chips, …)
// Datumsangaben immer mit h.datum(…, 'fr'); Apostroph im Berichtstext: gerade (').
// =====================================================================
DS_TEXTE.fr.s.das_kind = "l'élève";
// Vorschau ohne Motor-Nachbearbeitung: Leerzeichen in « » selbst setzen, np ist bereits elidiert
DS_TEXTE.fr.s.vorschau_ohne = 'Figurera dans le rapport sous la forme « aucun signe {liste} ».';
// n = Subjekt, d = nach Präposition (avec, pour, par, sur), g = mit "de" zusammengezogen (du père)
DS_TEXTE.fr.quellen = {
  schule: {
    lehrperson: { n: "l'enseignant·e", d: "l'enseignant·e", label: 'Enseignant·e' },
    lehrerin: { n: 'la titulaire de classe', d: 'la titulaire de classe', label: 'Titulaire de classe (enseignante)' },
    lehrer: { n: 'le titulaire de classe', d: 'le titulaire de classe', label: 'Titulaire de classe (enseignant)' },
    team: { n: "l'équipe pédagogique", d: "l'équipe pédagogique", label: 'Équipe pédagogique' },
    eseb: { n: "un membre de l'ESEB", d: "un membre de l'ESEB", label: 'Professionnel·le de l’ESEB' }
  },
  eltern: {
    eltern: { n: 'les parents', d: 'les parents', g: 'des parents', zahl: 2, label: 'Les deux parents' },
    mutter: { n: 'la mère', d: 'la mère', g: 'de la mère', zahl: 1, label: 'Mère' },
    vater: { n: 'le père', d: 'le père', g: 'du père', zahl: 1, label: 'Père' },
    pflegeeltern: { n: "les parents d'accueil", d: "les parents d'accueil", g: "des parents d'accueil", zahl: 2, label: 'Parents d’accueil' },
    grosseltern: { n: 'les grands-parents', d: 'les grands-parents', g: 'des grands-parents', zahl: 2, label: 'Grands-parents' }
  }
};
// Werte erscheinen auch als Beschriftung in der Oberfläche (Auswahllisten)
DS_TEXTE.fr.optionen = {
  auftraggeber: { cni: ['CNI', "la Commission nationale d'inclusion (CNI)"], eseb: ['ESEB', "l'équipe de soutien des élèves à besoins éducatifs particuliers ou spécifiques (ESEB)"], schule: ['École', "l'école"], eltern: ['Parents', 'les parents'] },
  verlauf: { unauffaellig: 'sans particularité', komplikationen: 'avec complications', unbekannt: 'inconnu' },
  entwicklung: { altersgerecht: "conforme à l'âge", verzoegert: 'retardé', unbekannt: 'inconnu' },
  familienstand: { zusammen: 'vivent ensemble', getrennt: 'séparés', alleinerziehend: 'famille monoparentale', patchwork: 'famille recomposée', verstorben: 'un parent décédé' },
  lebt_bei: { beide: ['chez les deux parents', 'vit chez ses deux parents'], mutter: ['chez la mère', 'vit chez sa mère'], vater: ['chez le père', 'vit chez son père'], wechsel: ['en garde alternée', 'vit en garde alternée chez ses deux parents'], grosseltern: ['chez les grands-parents', 'vit chez ses grands-parents'], pflege: ["en famille d'accueil", "vit dans une famille d'accueil"], heim: ['en foyer', "vit dans un foyer d'accueil"] },
  kontakt: { regelmaessig: 'Les contacts avec les deux parents sont réguliers.', eingeschraenkt_vater: 'Les contacts avec le père sont limités.', eingeschraenkt_mutter: 'Les contacts avec la mère sont limités.', kein_vater: "Aucun contact n'est entretenu avec le père.", kein_mutter: "Aucun contact n'est entretenu avec la mère." },
  position: { aeltestes: "l'aîné(e)", mittleres: 'un enfant du milieu', juengstes: 'le ou la plus jeune' },
  arbeitszeit: { vollzeit: 'à temps plein', teilzeit: 'à temps partiel', nicht: '' },
  setting: { klasse: 'en classe', kleingruppe: 'en petit groupe', einzel: 'en situation individuelle', pause: 'pendant la récréation', maison: 'à la maison relais', sport: "pendant le cours d'éducation physique" },
  abgestimmt: { ja: 'Oui, entièrement concertées', vorbehalte: 'Oui, avec des réserves', nein: 'Non' },
  stufeAlter: { 1: '0–2 ans', 2: '2–5 ans', 3: '6–9 ans', 4: '10–12 ans', 5: '13–16 ans' }
};

DS_TEXTE.fr.fakten = (function () {
  const O = DS_TEXTE.fr.optionen;
  const roem = function (n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n); };
  // Satz aufräumen wie DsText.satz(), aber mit korrekter Elision: franz() prüft die Wortgrenze
  // mit \b, und \b kennt in JS keine Akzente – aus "lui-même et", "Hélène a", "contrôle excessif"
  // würde sonst "lui-mêm'et", "Hélèn'a", "contrôl'excessif". Sobald franz() im Motor korrigiert ist,
  // kann S() wieder durch S() ersetzt werden.
  const BUCHST = 'A-Za-zÀ-ÖØ-öø-ÿŒœ';
  const ELISION = new RegExp('(^|[^' + BUCHST + "'’])(de|que|ne|se|le|la|je|me|te|lorsque|puisque|jusque) (?=[aeiouyhàâéèêëîïôûùœAEIOUYHÀÂÉÈÊËÎÏÔÛ])", 'g');
  const SI_IL = new RegExp('(^|[^' + BUCHST + '])si (?=ils?(?![' + BUCHST + ']))', 'g');
  function S(s) {
    // Satz aufräumen: dieselbe Regel wie im Motor (Elision, Leerzeichen, Apostroph ’)
    return DsText.satz(s, { lang: 'fr' });
  }
  const zahlwort = function (n) { return ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'][n] || String(n); };
  // Stellung in der Geschwisterreihe (nach "dont il/elle est …")
  const POSITION = { aeltestes: "[[l'aîné|l'aînée]]", mittleres: "[[l'un des enfants du milieu|l'une des enfants du milieu]]", juengstes: '[[le plus jeune|la plus jeune]]' };

  // Schule mit passender Präposition: "à l'École …", "au Lycée …"
  function beiSchule(name) {
    const n = String(name || '').trim();
    if (!n) { return ''; }
    if (/^(Lycée|Lycee|Lyzeum|Centre|Collège|College|Campus|Conservatoire|Lënster)/i.test(n)) { return 'au ' + n; }
    if (/^(Maison|Classe|Section)/i.test(n)) { return 'à la ' + n; }
    if (/^[AEIOUYÀÂÉÈÊËÎÏÔÛ]/i.test(n)) { return "à l'" + n; }
    if (/(Lycée|Lycee|Lyzeum)/i.test(n)) { return 'au ' + n; }
    return "à l'école " + n;
  }

  // ELDiB-Beschreibungen ("Montre …", "Réagit …", "S'engage …") -> Satzteil nach dem Subjekt.
  // Mädchen: männliche Formen der Itemtexte angleichen (qu'il, lui-même, conscient …).
  function angleichen(s, c) {
    s = String(s || '');
    // bekannte Unebenheit im Itemtext (V-16)
    s = s.replace(/^Montre d'être conscient/, 'Se montre conscient');
    if (c.g !== 'w') { return s; }
    // (\b funktioniert in JS nicht neben à/é – deshalb (^|\s) bzw. Leerzeichen)
    return s.replace(/\bqu'il\b/g, "qu'elle").replace(/\blui-même\b/g, 'elle-même').replace(/\bautour de lui\b/g, "autour d'elle")
      .replace(/\bvers lui\b/g, 'vers elle').replace(/(^|\s)à lui\b/g, '$1à elle').replace(/\bconscient\b/g, 'consciente')
      .replace(/\bseul\b/g, 'seule').replace(/\bleader ou participant\b/g, 'leader ou participante')
      .replace(/(^|[\s'’])étudiant et citoyen\b/g, '$1étudiante et citoyenne');
  }
  // gerade Anführungszeichen im Itemtext ('Je', 'Donne-moi...') -> « … »
  function zitate(s) { return String(s || '').replace(/(^|\s)'([^']+)'(?=[\s.,;:!?]|$)/g, '$1« $2 »').replace(/\.\.\./g, '…'); }
  // Satzanfänge, die kein Verb sind ("Au moins 50 mots", "L'enfant …")
  const KEIN_VERB = /^(?:(?:Le|La|Les|Un|Une|Des|Du|De|Au|Aux|À|En|Dans|Par|Pour|Avec|Sans|Ce|Cette|Son|Sa|Ses)(?=\s)|L')/;
  // erster Satz als Prädikat: "Reconnaît les sentiments des autres." -> "reconnaît les sentiments des autres"
  function praedikat(d, c) {
    const teile = zitate(angleichen(String(d || '').trim(), c)).split(/\.\s+(?=[A-ZÀ-ÖØ-Ý])/);
    const erster = (teile[0] || '').replace(/\.$/, '').trim();
    if (!erster || KEIN_VERB.test(erster) || !/^[A-ZÀ-ÖØ-Ý]/.test(erster)) { return ''; }
    return erster.charAt(0).toLowerCase() + erster.slice(1);
  }
  // ganzer Itemtext als Prädikat (für die Ziele): weitere Sätze werden angehängt
  function praedikatVoll(d, c) {
    const teile = zitate(angleichen(String(d || '').trim(), c)).replace(/\.$/, '').split(/\.\s+(?=[A-ZÀ-ÖØ-Ý])/);
    const p = praedikat(teile[0], c);
    if (!p) { return ''; }
    const il = c.g === 'w' ? 'elle' : 'il';
    return teile.slice(1).reduce(function (acc, t) {
      t = t.replace(/\.$/, '').trim();
      if (!t) { return acc; }
      if (/^L'enfant\s/.test(t)) { return acc + ' ; ' + il + ' ' + t.replace(/^L'enfant\s/, ''); }
      if (KEIN_VERB.test(t)) { return acc + ', ' + t.charAt(0).toLowerCase() + t.slice(1); }
      return acc + ' ; ' + il + ' ' + t.charAt(0).toLowerCase() + t.slice(1);
    }, p);
  }
  // Itemtext für die Lernziel-Liste (ohne Subjekt, mit Großbuchstaben am Anfang)
  function itemText(d, c) { return zitate(angleichen(String(d || '').trim(), c)).replace(/\.$/, ''); }

  return {
    auftrag: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const wer = (O.auftraggeber[f.auftraggeber || 'cni'] || O.auftraggeber.cni)[1];
      const wer2 = f.auftraggeber === 'andere' && h.frei(ds, 'auftraggeber_andere') ? h.frei(ds, 'auftraggeber_andere') : wer;
      const wen = c.vollname ? "l'élève " + c.vollname : "l'élève";
      s.push(S(h.fuelle("Le Centre pour le développement socio-émotionnel (CDSE) a été mandaté{datum: en date du {datum}} par {wer} pour réaliser un diagnostic spécialisé de {wen}, afin de déterminer son état actuel de développement socio-émotionnel ainsi que ses besoins éducatifs particuliers.", c, { datum: h.datum(f.auftrag_datum, 'fr'), wer: wer2, wen: wen }), c));
      const anl = h.chips(ds, 'anlass').map(function (k) { return h.chipText(c, 'anlass', k); });
      if (h.frei(ds, 'anlass_andere')) { anl.push(h.frei(ds, 'anlass_andere')); }
      const anl2 = h.chips(ds, 'anliegen').map(function (k) { return h.chipText(c, 'anliegen', k); });
      if (anl.length) { s.push(S(h.fuelle('La demande fait suite à {liste}.', c, { liste: h.liste(anl, c) }), c)); }
      if (anl2.length) { s.push(S(h.fuelle((anl.length ? 'Elle' : 'La demande') + ' a pour objectif {liste}.', c, { liste: h.liste(anl2, c) }), c)); }
      const emp = h.chips(ds, 'empfohlen').filter(function (k) { return k !== 'eltern'; }).map(function (k) { return h.chipText(c, 'empfohlen', k); });
      const wunsch = h.chips(ds, 'empfohlen').indexOf('eltern') >= 0;
      if (emp.length && wunsch) { s.push(S(h.fuelle('Cette demande a été formulée sur recommandation {liste}, en accord avec le souhait des parents.', c, { liste: h.liste(emp, c) }), c)); }
      else if (emp.length) { s.push(S(h.fuelle('Cette demande a été formulée sur recommandation {liste}.', c, { liste: h.liste(emp, c) }), c)); }
      else if (wunsch) { s.push(S('Cette demande émane des parents.', c)); }
      const b = [h.block(s.join(' '))];
      return b.concat(h.freiBloecke(ds, 'anlass_details'));
    },

    vorgeschichte: function (c, ds, st, h) {
      const f = ds.f || {}, s = [], b = [];
      c.neuerAbsatz();
      // Grossesse et accouchement
      const sg = f.schwangerschaft, gb = f.geburt;
      if (sg === 'unauffaellig' && gb === 'unauffaellig') { s.push(S("Selon les parents, la grossesse et l'accouchement se sont déroulés sans particularité.", c)); }
      else {
        if (sg === 'unauffaellig') { s.push(S("La grossesse s'est déroulée sans particularité.", c)); }
        if (sg === 'komplikationen') { s.push(S(h.fuelle('La grossesse a été marquée par des complications{d: ({d})}.', c, { d: h.frei(ds, 'schwangerschaft_details') }), c)); }
        if (gb === 'unauffaellig') { s.push(S("L'accouchement s'est déroulé sans particularité.", c)); }
        if (gb === 'komplikationen') { s.push(S(h.fuelle("L'accouchement a donné lieu à des complications{d: ({d})}.", c, { d: h.frei(ds, 'geburt_details') }), c)); }
      }
      // Développement moteur et langagier
      const mo = f.motorik, sp = f.sprache;
      const worte = f.erste_worte ? ' (premiers mots vers ' + f.erste_worte + ' mois)' : '';
      if (mo === 'altersgerecht' && sp === 'altersgerecht') { s.push(S("Le développement moteur et le développement du langage ont été conformes à l'âge" + worte + '.', c)); }
      else if (mo === 'altersgerecht' && sp === 'verzoegert' && !h.frei(ds, 'sprache_details')) { s.push(S("Le développement moteur a été conforme à l'âge, tandis que le développement du langage a été retardé" + worte + '.', c)); }
      else if (mo === 'verzoegert' && sp === 'altersgerecht' && !h.frei(ds, 'motorik_details')) { s.push(S("Le développement du langage a été conforme à l'âge" + worte + ', tandis que le développement moteur a été retardé.', c)); }
      else {
        if (mo === 'altersgerecht') { s.push(S("Le développement moteur a été conforme à l'âge.", c)); }
        if (mo === 'verzoegert') { s.push(S(h.fuelle('Le développement moteur a été retardé{d: ({d})}.', c, { d: h.frei(ds, 'motorik_details') }), c)); }
        if (sp === 'altersgerecht') { s.push(S("Le développement du langage a été conforme à l'âge" + worte + '.', c)); }
        if (sp === 'verzoegert') { s.push(S(h.fuelle('Le développement du langage a été retardé' + worte + '{d:; {d}}.', c, { d: h.frei(ds, 'sprache_details') }), c)); }
      }
      // Diagnostics
      const dg = h.chips(ds, 'diagnosen').map(function (k) {
        const name = k === 'andere' ? h.frei(ds, 'diagnose_andere') : h.chipText(c, 'diagnosen', k);
        const det = ds.f && ds.f.diagnosen_details && ds.f.diagnosen_details[k];
        return name ? name + (det ? ' (' + det + ')' : '') : '';
      }).filter(Boolean);
      if (dg.length) { s.push(S(h.fuelle('{{Le diagnostic suivant a été posé|Les diagnostics suivants ont été posés}} à ce jour : {liste}.', c, { liste: h.liste(dg, c), zahl: dg.length }), c)); }
      else if (f.keine_diagnosen) { s.push(S("Aucun diagnostic n'a été posé à ce jour.", c)); }
      if (s.length) { b.push(h.block(s.join(' '))); }
      const rows = ((ds.tabellen && ds.tabellen.vorgeschichte) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) {
        b.push(h.block('Mesures de soutien scolaires et extrascolaires antérieures :'));
        b.push({ typ: 'tabelle', id: 'vorgeschichte', kopf: ['Période', 'Classe', 'Intervention', 'Acteur·ice'], zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }) });
      }
      return b.concat(h.freiBloecke(ds, 'vorgeschichte'));
    },

    sozialbericht: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const lb = O.lebt_bei[f.lebt_bei];
      const stand = { getrennt: 'Les parents de {Name} sont séparés', zusammen: 'Les parents de {Name} vivent ensemble', alleinerziehend: '{Name} grandit dans une famille monoparentale', patchwork: '{Name} grandit dans une famille recomposée', verstorben: "L'un des parents de {Name} est décédé" }[f.familienstand];
      if (stand && lb && !(f.familienstand === 'zusammen' && f.lebt_bei === 'beide')) { s.push(S(h.fuelle(stand + ' ; {il} ' + lb[1] + '.', c), c)); }
      else if (stand && f.familienstand === 'zusammen' && f.lebt_bei === 'beide') { s.push(S(h.fuelle('{Name} vit avec ses deux parents.', c), c)); }
      else if (stand) { s.push(S(h.fuelle(stand + '.', c), c)); }
      else if (lb) { s.push(S(h.fuelle('{N} ' + lb[1] + '.', c), c)); }
      if (O.kontakt[f.kontakt]) { s.push(S(O.kontakt[f.kontakt], c)); }
      if (h.frei(ds, 'kontakt_details')) { s.push(S(h.frei(ds, 'kontakt_details'), c)); }
      const n = parseInt(f.geschwister_anzahl, 10);
      if (n === 0) { s.push(S(h.fuelle('{N} est enfant unique.', c), c)); }
      else if (n > 0) {
        const pos = POSITION[f.geschwister_position];
        s.push(S(h.fuelle("{N} fait partie d'une fratrie de " + zahlwort(n + 1) + ' enfants' + (pos ? ', dont {il} est ' + pos : '') + '.', c), c));
      }
      const sp = h.chips(ds, 'sprachen').map(function (k) { return k === 'andere' ? h.frei(ds, 'sprache_andere') : h.chipText(c, 'sprachen', k); }).filter(Boolean);
      if (sp.length) { s.push(S(h.fuelle('À la maison, la famille parle {liste}.', c, { liste: h.liste(sp, c) }), c)); }
      const beruf = function (wer, b, z) {
        if (z === 'nicht') { return wer + " n'exerce actuellement pas d'activité professionnelle"; }
        if (!b && !z) { return ''; }
        return wer + ' travaille' + (O.arbeitszeit[z] ? ' ' + O.arbeitszeit[z] : '') + (b ? ' en tant que ' + b : '');
      };
      const bm = beruf('la mère', h.frei(ds, 'beruf_mutter'), f.zeit_mutter), bv = beruf('le père', h.frei(ds, 'beruf_vater'), f.zeit_vater);
      if (bm && bv) { s.push(S(bm + ' ; ' + bv + '.', c)); } else if (bm || bv) { s.push(S((bm || bv) + '.', c)); }
      const ev = h.chips(ds, 'ereignisse').map(function (k) {
        const det = ds.f && ds.f.ereignis_details && ds.f.ereignis_details[k];
        return h.chipText(c, 'ereignisse', k) + (det ? ' (' + det + ')' : '');
      });
      if (ev.length) { s.push(S(h.fuelle("{{L'événement marquant suivant est mentionné|Les événements marquants suivants sont mentionnés}} : {liste}.", c, { liste: h.liste(ev, c), zahl: ev.length }), c)); }
      const bt = h.chips(ds, 'betreuung');
      if (bt.indexOf('maison_relais') >= 0) { s.push(S(h.fuelle("Après l'école, {N} fréquente la maison relais.", c), c)); }
      if (bt.indexOf('grosseltern') >= 0) { s.push(S(h.fuelle("En dehors de l'école, {N} est régulièrement [[gardé|gardée]] par ses grands-parents.", c), c)); }
      if (bt.indexOf('tagesmutter') >= 0) { s.push(S(h.fuelle(bt.indexOf('grosseltern') >= 0 ? '{N} est par ailleurs [[accueilli|accueillie]] chez une assistante parentale.' : "En dehors de l'école, {N} est [[accueilli|accueillie]] chez une assistante parentale.", c), c)); }
      if (h.frei(ds, 'freizeit')) { s.push(S(h.frei(ds, 'freizeit'), c)); }
      return (s.length ? [h.block(s.join(' '))] : []).concat(h.freiBloecke(ds, 'familie'));
    },

    aktuell: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      const klasse = f.klasse || (st && st.klasse) || '', schule = f.schule_name || (st && st.foerderort) || '';
      const s = [];
      if (klasse || schule) {
        s.push(S(h.fuelle('{N} est actuellement [[scolarisé|scolarisée]]{klasse: dans la classe {klasse}}{schule: {schule}}{lp:, sous la responsabilité de {lp}}.', c,
          { klasse: klasse, schule: beiSchule(schule), lp: h.frei(ds, 'lehrperson') }), c));
      }
      if (h.frei(ds, 'eseb_referenz')) {
        s.push(S(h.fuelle(s.length ? "Sa personne de référence au sein de l'ESEB est {x}." : "La personne de référence de {Name} au sein de l'ESEB est {x}.", c, { x: h.frei(ds, 'eseb_referenz') }), c));
      }
      const b = s.length ? [h.block(s.join(' '))] : [];
      const rows = ((ds.tabellen && ds.tabellen.aktuell) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) { b.push({ typ: 'tabelle', id: 'aktuell', kopf: ['Période', 'Classe', 'Intervention', 'Acteur·ice'], zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }), abschnitt: 'massnahmen' }); }
      return b;
    },

    verfahren: function (c, ds, st, h) {
      c.neuerAbsatz();
      const v = h.chips(ds, 'verfahren').filter(function (k) { return k !== 'andere' && h.chipText(c, 'verfahren', k); }).map(function (k) { return h.chipText(c, 'verfahren', k); });
      if (h.frei(ds, 'verfahren_andere')) { v.push(h.frei(ds, 'verfahren_andere')); }
      if (!v.length) { v.push(h.chipText(c, 'verfahren', 'eldib')); }
      const eltern = /^(pflegeeltern|grosseltern)$/.test((ds.f || {}).eltern_quelle || '') && c.q ? c.q.d : 'les parents';
      const s = [S(h.fuelle("Cette évaluation repose sur {liste}, sur des observations en classe ainsi que sur des entretiens avec l'équipe enseignante, " + eltern + ' et {Name}.', c, { liste: h.liste(v, c) }), c)];
      if (h.frei(ds, 'verfahren_ort')) { s.push(S(h.fuelle('Lieu des observations et des entretiens : {ort}.', c, { ort: h.frei(ds, 'verfahren_ort') }), c)); }
      return [h.block(s.join(' '))];
    },

    beobachtungIntro: function (c, ds, st, h) {
      const l = ((ds.f && ds.f.beobachtungen) || []).filter(function (b) { return b && (b.datum || b.setting || b.dauer); });
      if (!l.length) { return []; }
      c.neuerAbsatz();
      const T = DS_TEXTE.fr.s;
      const teile = l.map(function (b) {
        return h.fuelle(T.beob_eintrag, c, { datum: h.datum(b.datum, 'fr'), ort: O.setting[b.setting] || b.setting_andere || '', dauer: b.dauer ? String(b.dauer) : '' }).trim();
      });
      return [h.block(S(h.fuelle(l.length > 1 ? T.beob_mehrere : T.beob_eine, c, { beob: h.liste(teile, c) }), c))];
    },

    eldib: function (c, ds, st, h, profil) {
      const b = [];
      c.neuerAbsatz();
      b.push(h.block("L'ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen) est un instrument d'évaluation standardisé conçu pour mesurer le développement social et émotionnel des enfants et des adolescents à partir de la naissance jusqu'à l'âge de seize ans. Il fournit un profil de compétences spécifiques servant d'indicateurs du niveau des compétences sociales et émotionnelles."));
      const bereiche = (profil && profil.bereiche) || [];
      const mitStufe = bereiche.filter(function (x) { return x.stufe > 0; });
      const niveau = '{stufe} (« {richtziel} », {alter})';
      bereiche.forEach(function (x) {
        c.neuerAbsatz();
        const s = [];
        const v = { bereich: x.name, code: x.code, stufe: roem(x.stufe), richtziel: x.richtziel, alter: O.stufeAlter[x.stufe] || '' };
        if (!x.stufe) { s.push(S(h.fuelle("Dans le domaine {bereich} ({code}), aucun item n'a encore été évalué comme acquis.", c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[0]) { s.push(S(h.fuelle('Les compétences les plus développées chez {Name} sont celles du domaine {bereich} ({code}), où {il} se situe au niveau de développement ' + niveau + '.', c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[mitStufe.length - 1]) { s.push(S(h.fuelle('Les compétences les moins développées chez {Name} sont celles du domaine {bereich} ({code}), où {il} se situe au niveau de développement ' + niveau + '.', c, v), c)); }
        else { s.push(S(h.fuelle('Dans le domaine {bereich} ({code}), {N} se situe au niveau de développement ' + niveau + '.', c, v), c)); }
        // die zwei zuletzt erreichten Fähigkeiten, mit unterschiedlichem Verb
        const pr = [], verben = {};
        (x.erreicht || []).slice().reverse().forEach(function (it) { const p = praedikat(it.description, c), w = p.split(' ')[0]; if (p && pr.length < 2 && !verben[w]) { verben[w] = 1; pr.unshift(p); } });
        // zwei Beispiele; enthält ein Itemtext schon "et", werden sie mit "; de plus," verbunden
        const pText = pr.length > 1 && pr.some(function (x) { return / et /.test(x); }) ? pr[0] + ' ; de plus, {il} ' + pr[1] : h.liste(pr, c, false, true);
        if (pr.length) { s.push(S(h.fuelle(h.fuelle('{N} dispose déjà de bons acquis dans ce domaine : {il} ', c) + pText + '.', c), c)); }
        const extra = ds.frei && ds.frei['eldib_' + x.id];
        if (extra && String(extra).trim()) { s.push(String(extra).trim()); }
        b.push(h.block(s.join(' ')));
        if ((x.ziele || []).length) {
          b.push(h.block(S(h.fuelle("En partant de l'objectif général, les objectifs d'apprentissage suivants ont été définis pour {Nt} :", c), c)));
          b.push({ typ: 'liste', punkte: x.ziele.map(function (z) { return S(z.code + ' – ' + itemText(z.description, c), c); }) });
        } else if (x.stufe) {
          b.push(h.block("Aucun objectif d'apprentissage n'a été défini dans ce domaine."));
        }
      });
      if (profil && profil.lebensalter != null && mitStufe.length) {
        c.neuerAbsatz();
        const erw = profil.erwarteteStufe, unter = mitStufe.filter(function (x) { return x.stufe < erw; });
        const v = { roem: roem(erw), alter: O.stufeAlter[erw] || '', jahre: profil.lebensalter };
        const erwartet = "Au regard de l'âge de {Name} ({jahre} ans), le niveau de développement {roem} ({alter}) serait attendu ; ";
        let t;
        if (unter.length === bereiche.length) { t = erwartet + 'les quatre domaines se situent en dessous de ce niveau.'; }
        else if (unter.length === 1) { t = erwartet + 'seul le domaine {liste} se situe en dessous de ce niveau.'; v.liste = unter[0].name; }
        else if (unter.length) { t = erwartet + 'les domaines {liste} se situent en dessous de ce niveau.'; v.liste = h.liste(unter.map(function (x) { return x.name; }), c); }
        else { t = "Tous les domaines évalués atteignent au moins le niveau de développement attendu à l'âge de {Name} ({roem}, {alter})."; }
        b.push(h.block(S(h.fuelle(t, c, v), c)));
      }
      return b;
    },

    schluss: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      // ab etwa 12 Jahren wird das Kind in die Abstimmung einbezogen (Vorlage der CNI)
      const mitKind = c.alter != null && c.alter >= 12;
      // Pflegeeltern/Großeltern statt "les parents" (Vorlage: parents/tuteur·ice·s)
      const eltern = /^(pflegeeltern|grosseltern)$/.test(f.eltern_quelle || '') && c.q ? c.q.d : 'les parents';
      let t;
      if (f.abgestimmt === 'vorbehalte') {
        t = "Sur la base des résultats des tests disponibles, des observations et des données anamnestiques, des besoins spécifiques de soutien ont été identifiés. Lors des entretiens avec " + (mitKind ? '{Name} et ' + eltern : eltern) + ', des recommandations visant à soutenir davantage le développement individuel ont pu être élaborées. Certaines mesures proposées ont toutefois été remises en question ou n\'ont pas été entièrement approuvées par ' + (mitKind ? eltern + ' ou par {Name}' : eltern) + '.';
      } else if (f.abgestimmt === 'nein') {
        t = "Sur la base des résultats des tests disponibles, des observations et des données anamnestiques, des besoins spécifiques de soutien ont été identifiés et des recommandations ont été formulées. Une concertation sur ces recommandations avec " + (mitKind ? '{Name} et ' + eltern : eltern) + " n'a pas encore pu avoir lieu.";
      } else {
        t = "Sur la base des résultats des tests, des observations et des informations anamnestiques recueillies, des besoins spécifiques de soutien ont pu être identifiés en étroite concertation avec " + (mitKind ? "{Name} ainsi qu'avec " + eltern : eltern) + '. Par la suite, des recommandations ont été formulées conjointement, dans le but de soutenir efficacement le développement individuel.';
      }
      return [h.block(S(h.fuelle(t, c), c))].concat(h.freiBloecke(ds, 'vorbehalte'));
    },

    ziele: function (c, ds, st, h, profil) {
      const f = ds.f || {}, b = [];
      c.neuerAbsatz();
      const ziele = [];
      ((profil && profil.bereiche) || []).forEach(function (x) { (x.ziele || []).forEach(function (z) { ziele.push({ z: z, x: x }); }); });
      const bis = f.ziele_bis ? "jusqu'au " + h.datum(f.ziele_bis, 'fr') : "jusqu'à la fin du prochain " + ((st && st.periodenTyp) === 'semester' ? 'semestre' : 'trimestre');
      if (ziele.length) {
        b.push(h.block(S(h.fuelle("Les objectifs de soutien suivants découlent des objectifs d'apprentissage de l'ELDiB. Ils décrivent à chaque fois la prochaine étape de développement ; leur mise en œuvre sera observée au quotidien {bis} et vérifiée lors de la prochaine évaluation ELDiB.", c, { bis: bis }), c)));
        b.push({ typ: 'liste', punkte: ziele.map(function (e) {
          c.neuerAbsatz();
          const p = praedikatVoll(e.z.description, c);
          const text = p ? S(h.fuelle('{Name} ' + p, c), c) : S(itemText(e.z.description, c), c);
          return text + ' (' + e.z.code + ')';
        }) });
      }
      const zus = h.frei(ds, 'ziele_zusatz');
      if (zus) { b.push({ typ: 'liste', punkte: zus.split(/\n+/).map(function (l) { return l.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean) }); }
      return b;
    },

    empfehlungen: function (c, ds, st, h) {
      const b = [];
      c.neuerAbsatz();
      [['empf_familie', 'Contexte familial', 'empfehlung_familie'], ['empf_schule', 'Contexte scolaire (local)', 'empfehlung_schule'], ['empf_region', 'Contexte régional (ESEB / CDSE)', 'empfehlung_region']].forEach(function (g) {
        const p = h.chips(ds, g[0]).map(function (k) { return h.fuelle(h.chipText(c, g[0], k), c); });
        const extra = h.frei(ds, g[2]);
        if (extra) { extra.split(/\n+/).forEach(function (l) { l = l.replace(/^[-•*]\s*/, '').trim(); if (l) { p.push(l); } }); }
        if (p.length) { b.push({ typ: 'zwischen', text: g[1] }); b.push({ typ: 'liste', punkte: p }); }
      });
      return b;
    },

    cni: function (c, ds, st, h) {
      c.neuerAbsatz();
      const m = h.chips(ds, 'cni').map(function (k) { return h.fuelle(h.chipText(c, 'cni', k), c); });
      const b = [];
      if (m.length) {
        b.push(h.block(m.length > 1 ? "Le CDSE recommande à la Commission nationale d'inclusion (CNI) les mesures suivantes :" : "Le CDSE recommande à la Commission nationale d'inclusion (CNI) la mesure suivante :"));
        b.push({ typ: 'liste', punkte: m });
      }
      return b.concat(h.freiBloecke(ds, 'cni_begruendung'));
    }
  };
})();

// ==== 45-ds-texte-en.js ====
// =====================================================================
// DS-Baukasten: englische Texte (amerikanisches Englisch, Begriffe wie in
// den englischen ELDiB-/DTORF-R-Daten: behavior, socialization, student …)
// ---------------------------------------------------------------------
// Gleiche Schlüssel und gleiche Struktur wie 43-ds-texte-de.js.
// q   = Aussage zum Anklicken (Fragebogen)
// t   = Formulierungen für den Bericht je Stufe:
//       [0] 1–2 trifft (gar) nicht zu  [1] 3 eher nicht  [2] 4 teils/teils
//       [3] 5 eher zu  [4] 6–7 trifft (voll) zu      null = kein Satz
// np  = Kurzform für "… no indications of {liste}" und für Ängste/Abwehr
// m   = Situationsangabe für muster_* ("The difficulties occur mainly …")
// e   = Erklärungssatz zu den zwei deutlichsten Entwicklungsängsten
// n/g = Erklärungsansätze: n für hyp_mittel/hyp_nur_mittel, g für hyp_stark
//       ("… understood as reflecting {liste}") – im Englischen dieselbe Form
// a/d = Bedürfnisse: a für beduerfnis_stark, d für beduerfnis_(nur_)mittel
// Platzhalter (siehe 46-ds-text.js):
//   {N} Name bzw. he/she (Subjekt)   {Na}/{Nd} Name bzw. him/her (Objekt)
//   {Nt} Name bzw. him/her nach Präposition ("for {Nt}")   {Name} immer der Name
//   {his} immer his/her   {himself} himself/herself   [[he|she]] festes Pronomen
//   {{Einzahl|Mehrzahl}} nach Zahl der Eltern-Quelle bzw. vars.zahl
//   {Q}/{Qd} Eltern-Quelle (the mother / the parents), {Qg} the mother’s …,
//   {QS}/{QSd} Schul-Quelle (the class teacher …)
// Kein {KONTRAST}: Der Motor stellt "However, / At the same time, / By contrast, "
// vor den ersten Schwierigkeitssatz nach Stärken und schreibt den Satzanfang
// klein. Sätze, die davon betroffen sein können (pol +1: t[0]–t[2], pol −1:
// t[2]–t[4]), beginnen deshalb mit dem Subjekt – nie mit "At times", "Only",
// "By …". Nie "{N}’s" schreiben (könnte "he’s" werden); {Name}’s ist sicher.
// Stil: sachlich, beschreibend, ressourcenorientiert; Präsens für die Berichte
// von Schule, Eltern und Kind, Beobachtung im Simple Past.
// Typografie: “…” und ’ wie im gedruckten Bericht, Spannen mit –.
// =====================================================================
DS_TEXTE.en = {
  skala: { 1: 'does not apply at all', 2: '', 3: '', 4: 'partly applies', 5: '', 6: '', 7: 'fully applies', leer: 'not rated' },

  a: {
    // ---------------- 3.2 Sichtweise der Schule (The school’s perspective) ----------------
    s_motiv: { q: 'Participates in class with motivation.', t: [
      '{N} rarely participates in class and repeatedly needs encouragement to join in.',
      '{N} is rather hesitant to participate in class, and {his} motivation fluctuates considerably.',
      'Participation in class varies and depends heavily on the topic and on how {N} is feeling on the day.',
      '{N} mostly participates in class with motivation.',
      '{N} participates in class with motivation and interest.'] },
    s_konz: { q: 'Is able to concentrate in class at an age-appropriate level.', t: [
      'Sustained concentration is hardly possible for {Nt}; [[he|she]] is distracted by even minor stimuli.',
      '{N} can concentrate only briefly and is easily distracted.',
      '{N} can concentrate only intermittently; {his} attention tends to wane, particularly during longer work periods.',
      'In class, {N} is usually able to concentrate at an age-appropriate level.',
      'In class, {N} is able to concentrate well and for sustained periods.'] },
    s_selbst: { q: 'Starts and completes tasks independently.', t: [
      '{N} rarely starts tasks without support, and work [[he|she]] has begun often remains unfinished.',
      '{N} often needs help to start and complete tasks.',
      '{N} starts and completes tasks independently only some of the time and repeatedly needs prompting.',
      'Most of the time, {N} starts and completes tasks independently.',
      '{N} starts tasks independently and completes them reliably.'] },
    s_sorgfalt: { q: 'Works carefully and in an organized way.', t: [
      '{N} often works hastily and in a disorganized way; materials and homework are frequently missing.',
      '{N} rarely manages to work carefully and keep {his} work organized.',
      '{N} is inconsistent in how carefully [[he|she]] works and organizes {his} materials.',
      '{N} mostly works carefully and generally keeps {his} materials in order.',
      '{N} works carefully and is well organized.'] },
    s_leistung: { q: 'Meets the learning objectives of the grade level.', t: [
      '{N} is performing well below the requirements of {his} grade level.',
      '{N} is performing below the requirements of {his} grade level in some areas.',
      '{N} meets the learning objectives of {his} grade level in some subjects but not yet in others.',
      'Academically, {N} largely meets the learning objectives of {his} grade level.',
      'Academically, {N} meets the learning objectives of {his} grade level with good results.'] },
    s_unruhe: { q: 'Is physically restless.', np: 'motor restlessness', t: [
      null,
      'Motor restlessness is seen only occasionally.',
      '{N} is physically restless at times, for example during longer periods of sitting.',
      '{N} is frequently restless and finds it hard to stay seated.',
      '{N} shows pronounced motor restlessness and finds it very hard to stay seated for any length of time.'] },
    s_regeln: { q: 'Follows class rules and agreements.', t: [
      '{N} rarely follows class rules and agreements.',
      '{N} follows rules and agreements only with a great deal of support.',
      '{N} knows the class rules but follows them only some of the time.',
      'For the most part, {N} follows class rules and agreements.',
      '{N} reliably follows class rules and agreements.'] },
    s_impuls: { q: 'Acts impulsively, without thinking.', np: 'impulsivity', t: [
      null,
      'Impulsive behavior is seldom an issue.',
      '{N} sometimes acts impulsively when excited.',
      '{N} frequently acts impulsively, without considering the consequences.',
      '{N} very often acts on impulse; it is hard for [[him|her]] to stop and think before acting.'] },
    s_frust: { q: 'Copes with frustration and failure.', t: [
      '{N} is barely able to cope with frustration and failure; even minor setbacks trigger strong reactions.',
      'Coping with frustration and failure is difficult for {Nt}.',
      '{N} copes with frustration inconsistently: sometimes [[he|she]] manages to tolerate setbacks, sometimes not.',
      '{N} usually copes appropriately with frustration and failure.',
      '{N} tolerates frustration and failure well.'] },
    s_wut: { q: 'Reacts with angry outbursts.', np: 'angry outbursts', t: [
      null,
      'Angry outbursts are rare.',
      'Angry outbursts happen from time to time.',
      '{N} repeatedly reacts with angry outbursts, especially to criticism or limit-setting.',
      '{N} often has severe angry outbursts that significantly disrupt lessons.'] },
    s_aggr: { q: 'Shows verbal or physical aggression.', np: 'aggressive behavior', t: [
      null,
      'Aggressive behavior occurs only in isolated instances.',
      '{N} sometimes reacts with verbal or physical aggression in conflict situations.',
      '{N} frequently reacts with verbal or physical aggression toward others.',
      '{N} shows marked verbal and physical aggression toward others.'] },
    s_verweig: { q: 'Refuses tasks or instructions.', np: 'task refusal', t: [
      null,
      '{N} rarely refuses tasks.',
      '{N} sometimes refuses tasks or instructions, particularly when demands are high.',
      '{N} frequently refuses tasks or instructions.',
      '{N} very frequently refuses tasks and instructions; cooperation is often possible only with close individual support.'] },
    s_rueckzug: { q: 'Withdraws; seems quiet or introverted.', np: 'withdrawal', t: [
      null,
      'Signs of withdrawal are only occasional.',
      '{N} withdraws at times and seems introverted.',
      '{N} frequently withdraws and seems quiet and introverted.',
      '{N} is very withdrawn and rarely initiates contact with others.'] },
    s_angst: { q: 'Seems anxious or tense (e.g., fear of failure).', np: 'marked anxiety', t: [
      null,
      'Anxiety is rarely apparent.',
      '{N} sometimes appears tense or anxious in test situations.',
      '{N} regularly appears anxious and tense, especially when faced with academic demands.',
      '{N} appears very anxious and tense; fear of failure has a considerable impact on {his} everyday school life.'] },
    s_ausgeglichen: { q: 'Seems emotionally balanced.', t: [
      '{N} seems emotionally very unsettled, with marked mood swings.',
      '{N} often seems emotionally unsettled.',
      '{N} is emotionally changeable, seeming balanced on some days and irritable on others.',
      '{N} mostly seems emotionally balanced.',
      '{N} seems emotionally balanced and stable.'] },
    s_peers: { q: 'Has good relationships with classmates.', t: [
      '{N} has hardly any contact with classmates and seems isolated in the class.',
      '{N} has only limited success in establishing contact with classmates.',
      '{N} has contact with individual classmates but is only partly integrated into the class community.',
      '{N} mostly has good relationships with classmates.',
      '{N} is well integrated into the class and has stable relationships with classmates.'] },
    s_konflikt: { q: 'Frequently gets into conflicts with classmates.', np: 'frequent conflicts with classmates', t: [
      null,
      'Conflicts with classmates are rare.',
      '{N} occasionally gets into conflicts with classmates.',
      '{N} frequently gets into conflicts with classmates.',
      '{N} very frequently gets into conflicts with classmates, which [[he|she]] can hardly resolve without help.'] },
    s_erwachsene: { q: 'Has a trusting relationship with the teachers.', t: [
      '{N} has a severely strained relationship with the teachers.',
      '{N} has a tense relationship with the teachers.',
      '{N} has a changeable relationship with the teachers.',
      '{N} mostly has a good relationship with {his} teachers.',
      '{N} has a trusting relationship with {his} teachers.'] },
    s_hilfe: { q: 'Accepts help and support.', t: [
      '{N} usually rejects help and support.',
      '{N} accepts help only hesitantly.',
      '{N} accepts help only in part, depending on the situation and the person offering it.',
      '{N} is usually receptive to help and support.',
      '{N} readily accepts help and support.'] },
    s_selbstwert: { q: 'Seems self-confident and is willing to try things.', t: [
      '{N} has very little confidence in {his} own abilities and seems deeply insecure.',
      '{N} has little confidence in {his} own abilities and tends to seem insecure.',
      '{N} shows fluctuating self-confidence.',
      '{N} mostly seems self-confident.',
      '{N} seems self-confident and is willing to take on challenges.'] },

    // ---------------- 3.3 Sichtweise des Kindes (The student’s perspective) ----------------
    k_offen: { q: 'Talks openly about themselves and the situation during the interview.', t: [
      'In the interview{datum: on {datum}}, {N} was very reserved and said little about {himself} or {his} situation.',
      'In the interview{datum: on {datum}}, {N} was somewhat reserved.',
      'In the interview{datum: on {datum}}, {N} opened up to some extent after initial reticence.',
      'In the interview{datum: on {datum}}, {N} was mostly open.',
      'In the interview{datum: on {datum}}, {N} was open and talked readily about {himself} and {his} situation.'] },
    k_wohl: { q: 'Feels comfortable at school.', t: [
      '{N} states that [[he|she]] does not feel at ease at school and is reluctant to go.',
      '{N} reports that [[he|she]] often does not feel at ease at school.',
      '{N} describes {his} well-being at school as variable.',
      '{N} says that [[he|she]] mostly feels at ease at school.',
      '{N} says that [[he|she]] enjoys going to school and feels at ease there.'] },
    k_klasse: { q: 'Feels accepted in the class.', t: [
      '{N} does not feel accepted in the class.',
      '{N} tends to feel like an outsider in the class.',
      '{N} feels that [[he|she]] belongs in the class only to some extent.',
      '{N} mostly feels accepted in the class.',
      '{N} feels accepted in the class and has a sense of belonging.'] },
    k_lehrer: { q: 'Gets along well with the teachers.', t: [
      '{N} says that [[he|she]] does not get along with the teachers.',
      '{N} finds it hard to get along with the teachers.',
      '{N} gets along well with some teachers but less well with others.',
      '{N} reports that [[he|she]] mostly gets along well with the teachers.',
      '{N} reports getting along well with the teachers.'] },
    k_leistung: { q: 'Rates own academic abilities positively.', t: [
      '{N} rates {his} own academic abilities very negatively.',
      '{N} has a rather low opinion of {his} own academic abilities.',
      '{N} rates {his} academic abilities unevenly: in some subjects [[he|she]] feels confident, in others much less so.',
      'On the whole, {N} rates {his} academic abilities positively.',
      '{N} rates {his} academic abilities positively.'] },
    k_ungerecht: { q: 'Feels treated unfairly.', np: 'feeling treated unfairly', t: [
      null,
      '{N} rarely feels treated unfairly.',
      '{N} sometimes feels treated unfairly.',
      '{N} often feels treated unfairly, especially in conflicts and when consequences are imposed.',
      '{N} very often feels treated unfairly and sees {his} difficulties mainly as a reaction to the behavior of others.'] },
    k_selbstwert: { q: 'Speaks positively about themselves.', t: [
      '{N} speaks about {himself} in very disparaging terms.',
      '{N} tends to speak about {himself} disparagingly.',
      '{N} speaks about {himself} in partly positive, partly disparaging terms.',
      '{N} mostly speaks positively about {himself}.',
      '{N} speaks positively about {himself} and is able to name {his} own strengths.'] },
    k_druck: { q: 'Experiences psychological distress (burdened, sad, overwhelmed).', np: 'significant psychological distress', t: [
      null,
      '{N} describes little psychological distress.',
      '{N} describes a certain degree of psychological distress.',
      '{N} describes marked psychological distress and often feels weighed down.',
      '{N} describes a high level of psychological distress; [[he|she]] feels overwhelmed and sad.'] },
    k_angst: { q: 'Reports fears or worries.', np: 'fears or worries', t: [
      null,
      '{N} hardly mentions any fears or worries.',
      '{N} reports some fears and worries.',
      '{N} reports marked fears and worries.',
      '{N} reports pronounced fears and worries that weigh heavily on [[him|her]].'] },
    k_einsicht: { q: 'Recognizes own difficulties (problem awareness).', t: [
      '{N} shows no awareness of {his} own difficulties.',
      '{N} recognizes {his} own difficulties only to a limited extent.',
      '{N} sees {his} own difficulties only in part.',
      '{N} is largely able to name {his} own difficulties.',
      '{N} is able to name {his} own difficulties clearly and reflect on them.'] },
    k_veraenderung: { q: 'Wants things to change and is open to help.', t: [
      '{N} expresses no wish for change and rejects help.',
      '{N} hardly expresses any wish for change.',
      '{N} is only partly open to help.',
      '{N} would like things to change and is mostly open to help.',
      '{N} clearly wishes for change and is open to help.'] },
    k_freunde: { q: 'Has friends.', t: [
      '{N} says that [[he|she]] has no friends.',
      '{N} reports having hardly any friends.',
      '{N} names one or two friends.',
      '{N} mentions having a few friends.',
      '{N} reports several good friendships.'] },
    k_familie: { q: 'Describes the relationship with the family positively.', t: [
      '{N} describes {his} family relationships as very strained.',
      '{N} describes {his} family relationships as difficult.',
      '{N} describes {his} family relationships as changeable.',
      '{N} describes {his} family relationships as mostly positive.',
      '{N} describes {his} family relationships as positive and supportive.'] },

    // ---------------- 3.4 Sichtweise der Eltern (The parents’ perspective) ----------------
    e_alltag: { q: 'Copes well with everyday life at home.', t: [
      'Everyday family life is marked by constant difficulties.',
      'Everyday family life is often marked by difficulties.',
      'Everyday family life involves both calm periods and difficult situations.',
      '{N} mostly copes well with everyday family life.',
      '{N} copes well with everyday family life.'] },
    e_regeln: { q: 'Follows rules and agreements at home.', t: [
      '{N} hardly ever follows rules and agreements at home.',
      '{N} rarely follows rules and agreements at home.',
      '{N} follows family rules and agreements only some of the time.',
      '{N} mostly follows family rules and agreements.',
      '{N} reliably follows family rules and agreements.'] },
    e_wut: { q: 'Has angry outbursts at home.', np: 'angry outbursts', t: [
      null,
      'Angry outbursts rarely occur at home.',
      'There are occasional angry outbursts at home.',
      'Angry outbursts are frequent at home, especially when limits are set.',
      'Intense angry outbursts occur very frequently at home and place a heavy strain on family life.'] },
    e_geschwister: { q: 'Frequently has conflicts with siblings.', np: 'conflicts with siblings', t: [
      null,
      'Conflicts with siblings are rare.',
      'There are occasional conflicts with siblings.',
      '{N} frequently gets into conflicts with {his} siblings.',
      '{N} very frequently gets into intense conflicts with {his} siblings.'] },
    e_rueckzug: { q: 'Withdraws at home.', np: 'withdrawal', t: [
      null,
      '{N} rarely withdraws at home.',
      '{N} sometimes withdraws at home.',
      '{N} frequently withdraws to {his} room.',
      '{N} is severely withdrawn and hardly accessible to the family.'] },
    e_angst: { q: 'Shows fears or worries at home.', np: 'anxiety', t: [
      null,
      'Anxiety is hardly noticeable at home.',
      '{N} shows fears or worries at home from time to time.',
      '{N} often shows fears and worries at home.',
      '{N} shows marked anxiety at home, which considerably restricts {his} daily activities.'] },
    e_koerper: { q: 'Has sleep problems or physical complaints (e.g., stomachaches).', np: 'psychosomatic complaints', t: [
      null,
      'Sleep problems or physical complaints are rare.',
      'Sleep problems or physical complaints occur occasionally.',
      '{N} often has trouble sleeping or complains of physical symptoms such as stomachaches or headaches.',
      '{N} has severe sleep problems and very frequently complains of physical symptoms.'] },
    e_medien: { q: 'Spends a great deal of time on screens.', np: 'problematic screen use', t: [
      null,
      'Screen time is reported to be within reasonable limits.',
      '{N} sometimes spends a lot of time on screens.',
      '{N} spends a lot of time on screens; attempts to limit it frequently lead to conflict.',
      '{N} spends a great deal of time on screens, and it is hardly possible to limit this.'] },
    e_hausaufgaben: { q: 'Homework leads to conflicts.', np: 'conflicts over homework', t: [
      null,
      'Homework rarely leads to conflict.',
      'Homework occasionally leads to conflict.',
      'Homework frequently leads to conflict.',
      'Homework leads to intense conflict almost every day.'] },
    e_beziehung: { q: 'The relationship with the child is described as good.', t: [
      '{Q} {{describes|describe}} the relationship with {Name} as very strained.',
      '{Q} {{describes|describe}} the relationship with {Name} as tense.',
      '{Q} {{describes|describe}} the relationship with {Name} as ambivalent.',
      '{Q} {{describes|describe}} the relationship with {Name} as mostly good.',
      '{Q} {{describes|describe}} the relationship with {Name} as loving and stable.'] },
    e_struktur: { q: 'Family life is clearly structured.', t: [
      'Family life largely lacks fixed structures and routines.',
      'Family life has little structure.',
      'Family life is only partly structured.',
      'Family life is mostly clearly structured.',
      'Family life is clearly structured and follows reliable routines.'] },
    e_konsequenz: { q: 'Parenting is clear and consistent.', t: [
      'Clear and consistent parenting is hardly possible at present; the family seems overwhelmed.',
      'Consistent enforcement of rules is difficult to achieve at home.',
      'Rules are enforced consistently only some of the time.',
      'For the most part, parenting is clear and consistent.',
      'Parenting is clear and consistent.'] },
    e_belastung: { q: 'The parents feel heavily burdened by the situation.', np: 'a particular strain on the family', t: [
      null,
      '{Q} {{reports|report}} hardly any particular strain resulting from the situation.',
      '{Q} {{feels|feel}} somewhat burdened by the situation.',
      '{Q} {{feels|feel}} considerably burdened by the current situation.',
      '{Q} {{feels|feel}} heavily burdened and exhausted.'] },
    e_sicht_schule: { q: 'The parents share the school’s assessment.', t: [
      '{Q} {{does|do}} not share the school’s assessment.',
      'The school’s assessment is hardly shared.',
      'The school’s assessment is shared only in part.',
      'The school’s assessment is largely shared.',
      'The school’s assessment is fully shared.'] },
    e_kooperation: { q: 'The parents are willing to cooperate.', t: [
      '{Q} currently {{refuses|refuse}} to cooperate.',
      '{Q} {{is|are}} hesitant about cooperating.',
      '{Q} {{is|are}} willing in principle to cooperate but still {{has|have}} reservations.',
      'There is a clear willingness to cooperate.',
      'There is a strong willingness to cooperate, combined with active involvement.'] },

    // ---------------- 4.1 Verhaltensbeobachtung (Simple Past) ----------------
    b_start: { q: 'Started tasks independently.', t: [
      '{N} started tasks only after repeated prompting.',
      '{N} usually started tasks only after being prompted.',
      '{N} started tasks sometimes independently and sometimes only after being prompted.',
      '{N} mostly started tasks independently.',
      '{N} started tasks promptly and independently.'] },
    b_konz: { q: 'Worked with concentration and persistence.', t: [
      'Concentrated work was hardly possible for {Nt}; [[he|she]] abandoned tasks after a short time.',
      '{N} was able to concentrate only for short periods.',
      'Concentration fluctuated markedly: phases of focused work alternated with phases of distraction.',
      '{N} mostly worked with concentration.',
      '{N} worked with concentration and persistence.'] },
    b_anweisung: { q: 'Followed the teacher’s instructions.', t: [
      '{N} hardly followed the teacher’s instructions.',
      '{N} often followed instructions only after they had been repeated.',
      '{N} followed instructions only some of the time.',
      'For the most part, {N} followed the teacher’s instructions.',
      '{N} reliably followed the teacher’s instructions.'] },
    b_hilfe: { q: 'Asked for help when needed.', t: [
      '{N} did not ask for help when facing difficulties.',
      '{N} rarely asked for help when facing difficulties.',
      '{N} asked for help only occasionally.',
      'When facing difficulties, {N} mostly asked for help appropriately.',
      'When facing difficulties, {N} asked for help appropriately.'] },
    b_unruhe: { q: 'Was physically restless.', np: 'motor restlessness', t: [
      null,
      'Motor restlessness was apparent only occasionally.',
      '{N} was physically restless at times.',
      '{N} was frequently restless and repeatedly got up from {his} seat.',
      '{N} showed pronounced motor restlessness and could barely stay seated.'] },
    b_ablenk: { q: 'Was easily distracted.', np: 'increased distractibility', t: [
      null,
      '{N} was rarely distracted.',
      '{N} was occasionally distracted.',
      '{N} was frequently distracted by noises or classmates.',
      '{N} was distracted by even the slightest stimuli.'] },
    b_regeln: { q: 'Followed class rules.', t: [
      '{N} hardly adhered to the class rules.',
      '{N} rarely adhered to the class rules.',
      '{N} adhered to the class rules only some of the time.',
      '{N} mostly adhered to the class rules.',
      '{N} adhered reliably to the class rules.'] },
    b_frust: { q: 'Dealt appropriately with difficulties or frustration.', t: [
      'Setbacks provoked intense reactions from {Nt}, such as abandoning the task or angry outbursts.',
      '{N} rarely dealt appropriately with difficulties.',
      '{N} dealt with difficulties inconsistently.',
      '{N} mostly dealt appropriately with difficulties.',
      '{N} dealt appropriately with difficulties and frustration.'] },
    b_uebergang: { q: 'Managed transitions and changes without difficulty.', t: [
      'Transitions and changes caused {Na} great difficulty.',
      'Transitions and changes caused {Na} difficulty.',
      '{N} managed transitions and changes only in part.',
      'Transitions and changes mostly posed no difficulty for {Nt}.',
      'Transitions and changes posed no difficulty for {Nt}.'] },
    b_lob: { q: 'Responded positively to praise and attention.', t: [
      '{N} hardly responded to praise and attention.',
      '{N} responded to praise with some reserve.',
      '{N} responded to praise in varying ways.',
      'Praise and attention generally elicited positive responses from {Nt}.',
      '{N} responded to praise and attention with visible pleasure.'] },
    b_stoer: { q: 'Disrupted the lesson.', np: 'classroom disruption', t: [
      null,
      '{N} disrupted the lesson only occasionally.',
      '{N} disrupted the lesson at times.',
      '{N} repeatedly disrupted the lesson, for example by calling out or chatting.',
      '{N} disrupted the lesson frequently and significantly.'] },
    b_peers: { q: 'Sought and maintained positive contact with classmates.', t: [
      '{N} made no contact with classmates.',
      '{N} hardly initiated contact with classmates.',
      '{N} initiated contact with classmates only occasionally.',
      'Contact with classmates was mostly positive.',
      '{N} sought and maintained positive contact with classmates.'] },
    b_erwachsene: { q: 'Made appropriate contact with adults.', t: [
      '{N} largely avoided contact with adults.',
      '{N} approached adults only hesitantly.',
      '{N} interacted with adults partly appropriately and partly in an overly familiar or avoidant way.',
      '{N} mostly made appropriate contact with adults.',
      '{N} interacted with adults appropriately and openly.'] },
    b_isol: { q: 'Withdrew or kept to themselves.', np: 'withdrawal', t: [
      null,
      'Withdrawal occurred only occasionally.',
      '{N} kept to {himself} at times.',
      '{N} frequently withdrew and kept to {himself}.',
      '{N} kept to {himself} almost all the time and avoided others.'] },
    b_provo: { q: 'Provoked others or reacted aggressively.', np: 'provocative behavior', t: [
      null,
      'Provocative behavior occurred only occasionally.',
      '{N} occasionally provoked classmates.',
      '{N} repeatedly provoked classmates or reacted aggressively.',
      '{N} frequently provoked others and on several occasions reacted with verbal or physical aggression.'] },

    // ---------------- 4.3 Interpretation ----------------
    i_uebereinstimmung: { q: 'The perspectives of the school, the parents and the child agree.', t: [
      'The perspectives of the school, {Q} and {Name} {himself} differ considerably.',
      'The perspectives of the school, {Q} and {Name} {himself} agree only in a few respects.',
      'The perspectives of the school, {Q} and {Name} {himself} agree in part.',
      'The perspectives of the school, {Q} and {Name} {himself} largely agree.',
      'The perspectives of the school, {Q} and {Name} {himself} agree on the essential points.'] },
    i_beobachtung: { q: 'Our own observation confirms the reports.', t: [
      'The observations made during the assessment do not confirm the accounts given.',
      'The observations made during the assessment confirm the accounts given only on individual points.',
      'The observations made during the assessment partly confirm the accounts given.',
      'The observations made during the assessment largely confirm the accounts given.',
      'The observations made during the assessment confirm the accounts given.'] },
    i_eldib: { q: 'The ELDiB profile matches the clinical impression.', t: [
      'The ELDiB profile differs markedly from the clinical impression.',
      'The ELDiB profile matches the clinical impression only to a limited extent.',
      'The ELDiB profile partly matches the clinical impression.',
      'The ELDiB profile largely matches the clinical impression.',
      'The ELDiB profile matches the clinical impression.'] },
    i_unstrukturiert: { q: 'Difficulties arise mainly in unstructured situations (recess, transitions, free work).', m: 'in unstructured situations (such as recess and transitions)', t: [
      null, null,
      'To some extent, the difficulties occur in unstructured situations.',
      'The difficulties frequently occur in unstructured situations, such as recess or transitions.',
      'The difficulties occur mainly in unstructured situations such as recess, transitions or free work periods.'] },
    i_anforderung: { q: 'Difficulties arise mainly when academic demands are made.', m: 'in response to academic demands', t: [
      null, null,
      'To some extent, the difficulties are linked to academic demands.',
      'The difficulties frequently occur in response to academic demands.',
      'The difficulties occur mainly in response to academic demands.'] },
    i_beziehung: { q: 'Difficulties arise mainly in interpersonal situations (closeness, competition, limits).', m: 'in interpersonal situations (for example, involving closeness, competition or limit-setting)', t: [
      null, null,
      'To some extent, the difficulties are linked to interpersonal situations.',
      'The difficulties frequently occur in interpersonal situations, for example involving competition or limit-setting.',
      'The difficulties occur mainly in interpersonal situations, for example involving closeness, competition or limit-setting.'] },
    i_einzel: { q: 'Considerably more is possible in a one-to-one setting with an adult.', t: [
      null, null,
      'In a one-to-one setting, {Name} is sometimes more successful than in a group.',
      'In a one-to-one setting with an adult, {Name} is more successful than in a group.',
      'In a one-to-one setting with an adult, {Name} is considerably more successful than in a group.'] },
    i_schule: { q: 'The difficulties appear mainly at school.', t: [
      null, null,
      'At school, the difficulties are somewhat more pronounced than at home.',
      'The difficulties are more pronounced at school than at home.',
      'It is mainly in the school context that the difficulties appear.'] },
    i_zuhause: { q: 'The difficulties appear mainly at home.', t: [
      null, null,
      'At home, the difficulties are somewhat more pronounced than at school.',
      'The difficulties are more pronounced at home than at school.',
      'It is mainly in the home environment that the difficulties appear.'] },
    // Entwicklungsängste (Developmental Therapy nach Wood / ETEP)
    i_angst_verlassen: { q: 'Fear of abandonment (Stage I)', np: 'abandonment anxiety (Stage I)',
      e: '{N} seems to rely heavily on the availability of familiar adults and reacts to separations or changes with insecurity.' },
    i_angst_unzul: { q: 'Fear of inadequacy/failure (Stage II)', np: 'anxiety about inadequacy (Stage II)',
      e: '{N} tends to experience demands as overwhelming and fears not living up to expectations.' },
    i_angst_schuld: { q: 'Guilt (Stage III)', np: 'guilt anxiety (Stage III)',
      e: '{N} probably associates mistakes and rule violations closely with guilt and shame and quickly anticipates rejection.' },
    i_angst_konflikt: { q: 'Conflict anxiety (Stage IV)', np: 'conflict anxiety (Stage IV)',
      e: 'In disputes with peers and adults, {N} quickly comes under pressure and is inclined either to avoid conflicts or to escalate them.' },
    i_angst_identitaet: { q: 'Identity anxiety (Stage V)', np: 'identity anxiety (Stage V)',
      e: '{N} appears to be strongly preoccupied with questions of {his} own role, belonging and self-determination.' },
    // Abwehrmechanismen
    i_abw_rueckzug: { q: 'Withdrawal', np: 'withdrawal' },
    i_abw_vermeidung: { q: 'Avoidance, refusal', np: 'avoidance' },
    i_abw_aggression: { q: 'Aggression, attack', np: 'aggression' },
    i_abw_regression: { q: 'Regression (behaving like a much younger child)', np: 'regressive behavior' },
    i_abw_clown: { q: 'Clowning, diversion', np: 'clowning' },
    i_abw_kontrolle: { q: 'Overcontrol, perfectionism', np: 'overcontrol' },
    i_abw_projektion: { q: 'Projection, blaming others', np: 'blaming others' },
    i_abw_verleugnung: { q: 'Denial, minimization', np: 'minimization' },
    // Erklärungsansätze: n = hyp_mittel/hyp_nur_mittel, g = hyp_stark ("reflecting …")
    i_hyp_entwicklung: { q: 'Delay in socio-emotional development', n: 'a delay in socio-emotional development', g: 'a delay in socio-emotional development' },
    i_hyp_regulation: { q: 'Difficulties with emotion regulation', n: 'a limited ability to regulate emotions', g: 'a limited ability to regulate emotions' },
    i_hyp_belastung: { q: 'Reaction to current stressors in the family or at school', pl: true, n: 'current stressors in the family or at school', g: 'current stressors in the family or at school' },
    i_hyp_bindung: { q: 'Attachment insecurity', n: 'attachment insecurity', g: 'attachment insecurity' },
    i_hyp_sozial: { q: 'Social insecurity', n: 'social insecurity', g: 'social insecurity' },
    i_hyp_aufmerksamkeit: { q: 'Attention difficulties', n: 'attentional difficulties', g: 'attentional difficulties' },
    i_hyp_ueberforderung: { q: 'Academic overload (demands too high)', n: 'academic demands that exceed {his} current capacities', g: 'academic demands that exceed {his} current capacities' },
    i_hyp_unterforderung: { q: 'Insufficient academic challenge (demands too low)', n: 'insufficient academic challenge', g: 'insufficient academic challenge' },
    i_hyp_trauma: { q: 'Possible effects of adverse experiences (clarify further)' },

    // ---------------- 5.1 Bedürfnisse: a = beduerfnis_stark, d = beduerfnis_(nur_)mittel ----------------
    n_struktur: { q: 'Clear structures and predictable routines', a: 'clear structures and predictable routines', d: 'clear structures and predictable routines' },
    n_beziehung: { q: 'A reliable, stable key adult', a: 'a reliable, stable key adult', d: 'a reliable, stable key adult' },
    n_erfolg: { q: 'Experiences of success and positive feedback', a: 'experiences of success and positive feedback', d: 'experiences of success and positive feedback' },
    n_regulation: { q: 'Support in regulating emotions', a: 'help in regulating {his} emotions', d: 'help in regulating {his} emotions' },
    n_grenzen: { q: 'Clear limits and consistent feedback', a: 'clear, consistently applied limits', d: 'clear, consistently applied limits' },
    n_sozial: { q: 'Development of social skills', a: 'targeted work on {his} social skills', d: 'targeted work on {his} social skills' },
    n_organisation: { q: 'Help with attention and work organization', a: 'guidance in focusing {his} attention and organizing {his} work', d: 'guidance in focusing {his} attention and organizing {his} work' },
    n_differenzierung: { q: 'Adapted demands (differentiation)', a: 'demands adapted to {his} abilities', d: 'demands adapted to {his} abilities' },
    n_therapie: { q: 'Therapeutic support', a: 'therapeutic support', d: 'therapeutic support' },
    n_familie: { q: 'Support for the family', a: 'support for {his} family', d: 'support for {his} family' }
  },

  // Auswahlfelder: [Beschriftung, Form im Text]
  chips: {
    // "{N} is described as {liste}." -> Adjektive
    s_staerken: { hilfsbereit: ['helpful', 'helpful'], kreativ: ['creative', 'creative'], humorvoll: ['good sense of humor', 'good-humored'], sportlich: ['athletic', 'athletic'], sprachlich: ['strong in languages', 'strong in languages'], mathematisch: ['strong in math', 'strong in math'], technisch: ['interested in technology', 'interested in technology'], musikalisch: ['musical', 'musical'], fantasievoll: ['imaginative', 'imaginative'], wissbegierig: ['eager to learn', 'eager to learn'], freundlich: ['friendly', 'friendly'], zuverlaessig: ['reliable', 'reliable'] },
    // "Strategies that have proven helpful include {liste}."
    s_hilft: { ansagen: ['clear, short instructions', 'clear, short instructions'], wiederholung: ['repetition', 'repetition'], visualisierung: ['visual aids', 'visual aids'], bewegung: ['movement breaks', 'movement breaks'], rueckzugsort: ['quiet space', 'access to a quiet space'], einzelansprache: ['addressing individually', 'addressing {Na} individually'], lob: ['praise, reinforcement', 'praise and positive reinforcement'], vorwarnung: ['advance notice of changes', 'advance notice of transitions'], kleingruppe: ['small group', 'working in a small group'], naehe: ['proximity to the teacher', 'sitting close to the teacher'], struktur: ['fixed routines', 'fixed routines and structures'] },
    // "The school hopes that the CDSE’s involvement will lead to {liste}."
    s_erwartung: { strategien: ['classroom strategies', 'concrete strategies for the classroom'], verhalten: ['better behavior', 'an improvement in behavior'], konzentration: ['better concentration', 'better concentration'], integration: ['social integration', 'better social integration'], stabilitaet: ['emotional stability', 'greater emotional stability'], leistung: ['better performance', 'better academic performance'], therapie: ['therapeutic help', 'external therapeutic support'], eltern: ['cooperation with parents', 'closer cooperation with the parents'], foerderort: ['different setting', 'a review of whether a different educational setting would be more suitable'], abklaerung: ['assessment', 'a diagnostic assessment'] },
    // "Among {his} interests, {N} mentions {liste}."
    k_interessen: { sport: ['sports', 'sports'], gaming: ['video games', 'video games'], musik: ['music', 'music'], lesen: ['reading', 'reading'], kreatives: ['drawing, crafts', 'drawing and crafts'], freunde: ['meeting friends', 'spending time with friends'], tiere: ['animals', 'animals'], natur: ['nature', 'outdoor activities'], technik: ['technology', 'technology'], kochen: ['cooking, baking', 'cooking and baking'] },
    // "For the future, {N} wishes for {liste}."
    k_wuensche: { noten: ['better grades', 'better grades'], freunde: ['more friends', 'more friends'], streit: ['less arguing', 'less arguing'], ruhe: ['calm at home', 'a calmer atmosphere at home'], druck: ['less pressure', 'less pressure'], verstanden: ['to be understood', 'more understanding'], hilfe: ['to get help', 'support'], klasse: ['a different class', 'a change of class'], schule: ['a different school', 'a change of school'], inruhe: ['to be left alone', 'more time to {himself}'] },
    // "At home, {N} is described as {liste}." -> Adjektive
    e_staerken: { hilfsbereit: ['helpful', 'helpful'], liebevoll: ['affectionate', 'affectionate'], selbststaendig: ['independent', 'independent'], kreativ: ['creative', 'creative'], humorvoll: ['good sense of humor', 'good-humored'], sportlich: ['athletic', 'athletic'], verantwortung: ['responsible', 'responsible'], offen: ['open', 'open'] },
    // "{Q} hopes that the support will bring {liste}."
    e_erwartung: { verhalten: ['better behavior', 'an improvement in behavior'], entspannung: ['calmer situation at home', 'a calmer atmosphere at home'], strategien: ['parenting strategies', 'concrete parenting strategies'], leistung: ['better performance', 'better academic performance'], abklaerung: ['assessment', 'a diagnostic assessment'], therapie: ['therapy for the child', 'therapeutic support for {Name}'], beratung: ['counseling for the parents', 'parent counseling'], foerderort: ['different setting', 'a different school placement'], verstehen: ['understanding the child', 'a better understanding of {Name}'], bestaetigung: ['guidance, reassurance', 'guidance and reassurance'] },
    // "Resources to build on include {liste}."
    ressourcen: { kognitiv: ['cognitive abilities', 'good cognitive abilities'], kreativ: ['creativity', 'creativity'], sportlich: ['sports', 'athletic ability'], musisch: ['artistic, musical', 'artistic and musical talent'], humor: ['humor', 'a sense of humor'], empathie: ['empathy', 'empathy'], neugier: ['curiosity', 'curiosity and a thirst for knowledge'], begeisterung: ['enthusiasm', 'enthusiasm'], hilfsbereit: ['helpfulness', 'helpfulness'], verantwortung: ['takes responsibility', 'a willingness to take on responsibility'], einzelbeziehung: ['one-to-one relationships', 'the ability to form relationships in one-to-one settings'], lernbereit: ['willingness to learn', 'a willingness to learn'], vertrauensperson: ['trusted adult', 'a trusted adult at school'], familie: ['supportive family', 'a supportive family'], hobbys: ['hobbies', 'stable hobbies and interests'], reflexion: ['reflective', 'the capacity for self-reflection'] },
    // Fakten
    // "The referral was prompted by {liste}."
    anlass: { verhalten_schule: ['behavior at school', 'behavioral difficulties at school'], verhalten_zuhause: ['behavior at home', 'behavioral difficulties at home'], emotional: ['emotional difficulties', 'emotional difficulties'], sozial: ['social difficulties', 'difficulties in social interaction'], leistung: ['academic performance', 'academic difficulties'], aufmerksamkeit: ['attention', 'attention and concentration difficulties'], aggression: ['aggression', 'aggressive behavior'], rueckzug: ['withdrawal', 'withdrawn behavior'], aengste: ['anxiety', 'marked anxiety'], schulverweigerung: ['school refusal', 'school refusal or absenteeism'] },
    // "The aim is to initiate {liste}."
    anliegen: { isa: ['ISA', 'a specialized ambulatory intervention (Intervention spécialisée ambulatoire, ISA)'], conseil: ['Conseil & Guidance', 'counseling and guidance (Conseil & Guidance)'], cst: ['CST', 'the admission process for the Centre socio-thérapeutique (CST)'], clapa: ['Classe de Participation', 'the admission process for a Classe de Participation'], annexe: ['Annexe Junglinster', 'the admission process for the Annexe Junglinster'], lernwerkstatt: ['Learning workshop', 'participation in the specialized learning workshop (Atelier d’apprentissage spécifique)'], beschulung: ['Specialized schooling', 'specialized schooling at the CDSE'], diagnostik: ['Diagnostic assessment', 'an in-depth diagnostic assessment'] },
    // "The request was made on the recommendation of {liste}."
    empfohlen: { lehrperson: ['Teacher', 'the teacher'], eseb: ['ESEB', 'the ESEB'], schulleitung: ['School management', 'the school management'], arzt: ['Physician', 'the treating physician'], psychologe: ['Psychologist', 'the psychologist'], eltern: ['Parents’ request', ''] },
    // "To date, {N} has been diagnosed with {liste}."
    diagnosen: { adhs: ['ADHD/ADD', 'ADHD'], ass: ['Autism spectrum', 'autism spectrum disorder'], lernstoerung: ['Learning disorder', 'a specific learning disorder'], sprachstoerung: ['Language disorder', 'a developmental language disorder'], emotional: ['Emotional disorder', 'an emotional disorder'], bindung: ['Attachment disorder', 'an attachment disorder'], angst: ['Anxiety disorder', 'an anxiety disorder'], opposition: ['Oppositional behavior', 'oppositional defiant disorder'], andere: ['Other', ''] },
    // "{liste} is/are reported as (a) stressful life event(s)."
    ereignisse: { trennung: ['Parents’ separation', 'the parents’ separation'], umzug: ['Move', 'a move'], verlust: ['Loss of an attachment figure', 'the loss of an important attachment figure'], krankheit: ['Illness in the family', 'an illness in the family'], konflikte: ['Conflict at home', 'domestic conflict'], trauma: ['Distressing experience', 'a distressing experience'], migration: ['Migration', 'the experience of migration'] },
    betreuung: { maison_relais: ['Maison Relais', ''], grosseltern: ['Grandparents', ''], tagesmutter: ['Childminder', ''], keine: ['None', ''] },
    sprachen: { lb: ['Luxembourgish', 'Luxembourgish'], de: ['German', 'German'], fr: ['French', 'French'], pt: ['Portuguese', 'Portuguese'], en: ['English', 'English'], it: ['Italian', 'Italian'], es: ['Spanish', 'Spanish'], andere: ['Other', ''] },
    // "This assessment is based on {liste}, on classroom observations …"
    verfahren: { eldib: ['ELDiB', 'the ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen, the German adaptation of the DTORF-R)'], beobachtung: ['Observation', ''], gespraeche: ['Interviews', ''], sdq: ['SDQ', 'the Strengths and Difficulties Questionnaire (SDQ)'], wisc: ['WISC-V', 'the Wechsler Intelligence Scale for Children, Fifth Edition (WISC-V)'], andere: ['Other', ''] },
    // Empfehlungen: Aufzählungspunkte
    empf_familie: { step: ['STEP parenting program (CDSE)', 'Participation in the STEP parenting program at the CDSE'], erziehungsberatung: ['Parenting counseling', 'Parenting counseling to strengthen the parents’ confidence in their parenting'], familientherapie: ['Family therapy', 'Family therapy'], tagesstruktur: ['Daily structure at home', 'A clear daily structure and reliable routines at home'], austausch: ['Contact with the school', 'Regular communication between the parents and the school'], medien: ['Rules for screen use', 'Clear, jointly agreed rules on screen time and media use'], freizeit: ['Leisure activity', 'A regular leisure activity, e.g., in a sports club or association'] },
    empf_schule: { sitzplatz: ['Seating', 'A quiet seat close to the teacher'], differenzierung: ['Differentiation', 'Differentiated, clearly structured tasks'], verstaerker: ['Reinforcement plan', 'Frequent positive feedback, if appropriate with a reinforcement plan'], regeln: ['Rules & consequences', 'A small number of clear rules with predictable consequences'], auszeit: ['Time-out/retreat', 'An agreed time-out or retreat option'], uebergaenge: ['Announcing transitions', 'Advance notice of transitions and changes'], visualisierung: ['Visual support', 'Visual support for the daily schedule and work steps'], bewegung: ['Movement breaks', 'Regular movement breaks'], iebs: ['I-EBS', 'Support from the I-EBS (specialized teacher for students with special educational needs)'], bezugsperson: ['Key adult', 'A consistent key adult at school'] },
    empf_region: { eseb: ['ESEB support', 'Continued support from the ESEB'], isa: ['ISA', 'Specialized ambulatory intervention (ISA) by the CDSE'], conseil: ['Conseil & Guidance', 'Counseling and guidance (Conseil & Guidance) by the CDSE'], lernwerkstatt: ['Learning workshop', 'Participation in the specialized learning workshop'], psychotherapie: ['Psychotherapy', 'Child and adolescent psychotherapy'], ergotherapie: ['Occupational therapy', 'Occupational therapy'], logopaedie: ['Speech therapy', 'Speech and language therapy'], psychiatrie: ['Child psychiatric assessment', 'Child and adolescent psychiatric assessment'] },
    // CNI (5.4): genau die Bezeichnungen des Deckblatts (DS_DECKBLATT.en.cni in 47-ds-assistent.js),
    // wie es die CNI-Vorlage verlangt; Unterpunkte der Beschulung wie im Deutschen mit Präfix
    cni: { diag_kompetenzzentrum: ['Diagnostics with a competence center', 'Specialized diagnostic assessment in cooperation with a competence center'], beratung_eltern: ['Counseling for parents and student', 'Counseling and guidance for the parents and the student'], beratung_fachleute: ['Counseling for professionals', 'Counseling and guidance for professionals'], lernwerkstatt: ['Learning workshop', 'Specialized learning workshop (Atelier d’apprentissage spécifique)'], isa: ['ISA', 'Specialized ambulatory intervention (ISA)'], beschulung: ['Schooling at the CDSE', 'Specialized schooling at the CDSE'], clapa: ['Classe de Participation', 'Specialized schooling at the CDSE – Classe de Participation'], cst: ['CST', 'Specialized schooling at the CDSE – Centre socio-thérapeutique (CST)'], annexe: ['Annexe Junglinster', 'Specialized schooling at the CDSE – Annexe Junglinster'], ausland: ['Schooling abroad', 'Specialized schooling abroad'], rehabilitation: ['Rehabilitation', 'Rehabilitation'], abschluss: ['End of CDSE support', 'End of CDSE support'], schliessung: ['Closure of the file', 'Closure of the CDSE file'] }
  },

  // Rahmensätze
  s: {
    liste_und: 'and', liste_oder: 'or', liste_sowie: 'as well as',
    schule_intro: 'The following account is based on an interview with {QSd}{datum: on {datum}}.',
    schule_staerken: '{N} is described as {liste}.',
    schule_hilft: 'Strategies that have proven helpful include {liste}.',
    schule_erwartung: 'The school hopes that the CDSE’s involvement will lead to {liste}.',
    schule_ohne: 'From the school’s perspective, there are no indications of {liste}.',
    kind_intro: '{Name} was interviewed{datum: on {datum}}.',
    kind_interessen: 'Among {his} interests, {N} mentions {liste}.',
    kind_wuensche: 'For the future, {N} wishes for {liste}.',
    kind_vertrauen: '{N} names {text} as a trusted adult at school.',
    kind_ohne: 'The interview gave no indications of {liste}.',
    eltern_intro: '{datum: On {datum}, }an interview was held with {Qd}.',
    eltern_staerken: 'At home, {N} is described as {liste}.',
    eltern_erwartung: '{Q} {{hopes|hope}} that the support will bring {liste}.',
    eltern_ohne: 'The parent interview gave no indications of {liste}.',
    beob_ohne: 'No signs of {liste} were observed.',
    beob_eine: 'An observation was carried out {beob}.',
    beob_mehrere: 'Observations were carried out {beob}.',
    beob_eintrag: '{datum: on {datum}}{ort: {ort}}{dauer: ({dauer} minutes)}',
    // Interpretation
    muster_stark: 'The difficulties occur mainly {liste}.',
    muster_mittel: 'Difficulties frequently arise {liste}.',
    muster_mittel_nach: 'They also frequently occur {liste}.',
    aengste_stark: 'From a Developmental Therapy perspective, there are clear indications of {liste}.',
    aengste_mittel: 'From a Developmental Therapy perspective, there are indications of {liste}.',
    aengste_beide: 'From a Developmental Therapy perspective, there are clear indications of {stark}, and to some extent also of {mittel}.',
    abwehr_stark: 'The predominant defense {{mechanism is|mechanisms are}} {liste}.',
    abwehr_mittel: 'At times, {liste} {{serves|serve}} as {{a defense mechanism|defense mechanisms}}.',
    abwehr_beide: 'The predominant defense {{mechanism is|mechanisms are}} {stark}, and to a lesser extent also {mittel}.',
    abwehr_bezug_stark: 'To defend against {{this anxiety|these anxieties}}, {N} mainly resorts to {stark}.',
    abwehr_bezug_beide: 'To defend against {{this anxiety|these anxieties}}, {N} mainly resorts to {stark}, and to a lesser extent to {mittel}.',
    abwehr_bezug_mittel: 'To defend against {{this anxiety|these anxieties}}, {N} at times resorts to {mittel}.',
    hyp_stark: 'The difficulties described can most plausibly be understood as reflecting {liste}.',
    hyp_mittel: 'In addition, {liste} may play a role.',
    hyp_nur_mittel: '{{A possible explanation is|Possible explanations are}} {liste}.',
    hyp_trauma: 'Whether adverse experiences are a contributing factor should be clarified through further specialist assessment.',
    // Bedürfnisse, Ressourcen
    beduerfnis_stark: 'Above all, {N} needs {liste}.',
    beduerfnis_mittel: '{N} would also benefit from {liste}.',
    beduerfnis_nur_mittel: '{N} would benefit from {liste}.',
    ressourcen: 'Resources to build on include {liste}.'
  },

  // Beschriftungen der Oberfläche
  ui: {
    titel: 'Specialized Diagnostic (DS)', untertitel: 'Step by step to the finished report',
    schritte: { stamm: 'Student & report', auftrag: 'Referral', vorgeschichte: 'Background', familie: 'Family', aktuell: 'Current situation', schule: 'School’s perspective', kind: 'Student’s perspective', eltern: 'Parents’ perspective', beobachtung: 'Observation', eldib: 'ELDiB results', deutung: 'Interpretation', beduerfnisse: 'Needs & resources', empfehlungen: 'Recommendations', vorschau: 'Preview & export' },
    themen: {
      'schule.lernen': 'Learning and work habits', 'schule.verhalten': 'Behavior and emotions', 'schule.beziehung': 'Relationships',
      'kind.schule': 'School', 'kind.selbst': 'Self-image and well-being', 'kind.umfeld': 'Friends and family',
      'eltern.alltag': 'Everyday life at home', 'eltern.familie': 'Family and parenting', 'eltern.zusammenarbeit': 'Cooperation',
      'beobachtung.arbeit': 'Work behavior', 'beobachtung.verhalten': 'Behavior', 'beobachtung.kontakt': 'Social contact',
      'deutung.quellen': 'Comparing the information', 'deutung.muster': 'When do the difficulties occur?', 'deutung.aengste': 'Developmental anxieties (indications)', 'deutung.abwehr': 'Defense mechanisms (how pronounced?)', 'deutung.hypothesen': 'Possible explanations (how likely?)',
      'beduerfnisse.beduerfnisse': 'What does the student need? (how important?)'
    },
    chipTitel: { s_staerken: 'Strengths from the school’s perspective', s_hilft: 'What helps in class?', s_erwartung: 'What does the school hope for?', k_interessen: 'Interests and hobbies', k_wuensche: 'What does the student wish for?', e_staerken: 'Strengths from the parents’ perspective', e_erwartung: 'What do the parents hope for?', ressourcen: 'The student’s resources' }
  }
};

// ==== 45b-ds-fakten-en.js ====
// =====================================================================
// DS-Baukasten: englische Faktenabschnitte (Auftrag, Vorgeschichte, Familie,
// aktuelle Situation, Verfahren, ELDiB, Schluss, Ziele, Empfehlungen, CNI)
// Gleiche Funktionen, Signaturen und Blocktypen wie 43b-ds-fakten-de.js.
// h = Hilfsfunktionen aus DsText (fuelle, satz, liste, chips, …);
// Datum immer mit h.datum(iso, 'en').
// ELDiB-Codes erscheinen wie in der englischen App (getDisplayCode):
// V -> BEH, K -> COM, SOZ -> SOC, KOG -> COG (z. B. "COM-17").
// =====================================================================
DS_TEXTE.en.s.das_kind = 'the student';
DS_TEXTE.en.s.vorschau_ohne = 'Mentioned in the report in the list “no indications of …”: {liste}.';
DS_TEXTE.en.quellen = {
  // n = Subjekt/Objekt ("the class teacher"), d = nach "with" (hier gleich)
  schule: {
    lehrperson: { n: 'the teacher', d: 'the teacher', label: 'Teacher' },
    lehrerin: { n: 'the class teacher', d: 'the class teacher', label: 'Class teacher (female)' },
    lehrer: { n: 'the class teacher', d: 'the class teacher', label: 'Class teacher (male)' },
    team: { n: 'the teaching team', d: 'the teaching team', label: 'Teaching team' },
    eseb: { n: 'the ESEB specialist', d: 'the ESEB specialist', label: 'ESEB specialist' }
  },
  // g = Genitiv für {Qg} ("the mother’s"; derzeit in keinem Rahmensatz benutzt); zahl steuert {{is|are}}
  eltern: {
    eltern: { n: 'the parents', d: 'the parents', g: 'the parents’', zahl: 2, label: 'Both parents' },
    mutter: { n: 'the mother', d: 'the mother', g: 'the mother’s', zahl: 1, label: 'Mother' },
    vater: { n: 'the father', d: 'the father', g: 'the father’s', zahl: 1, label: 'Father' },
    pflegeeltern: { n: 'the foster parents', d: 'the foster parents', g: 'the foster parents’', zahl: 2, label: 'Foster parents' },
    grosseltern: { n: 'the grandparents', d: 'the grandparents', g: 'the grandparents’', zahl: 2, label: 'Grandparents' }
  }
};
DS_TEXTE.en.optionen = {
  auftraggeber: { cni: ['CNI', 'the Commission nationale d’inclusion (National Inclusion Commission, CNI)'], eseb: ['ESEB', 'the ESEB'], schule: ['School', 'the school'], eltern: ['Parents', 'the parents'] },
  verlauf: { unauffaellig: 'uneventful', komplikationen: 'with complications', unbekannt: 'unknown' },
  entwicklung: { altersgerecht: 'age-appropriate', verzoegert: 'delayed', unbekannt: 'unknown' },
  familienstand: { zusammen: 'living together', getrennt: 'separated', alleinerziehend: 'single parent', patchwork: 'blended family', verstorben: 'one parent deceased' },
  lebt_bei: { beide: ['with both parents', 'lives with both parents'], mutter: ['with the mother', 'lives with {his} mother'], vater: ['with the father', 'lives with {his} father'], wechsel: ['alternating residence', 'lives alternately with each parent'], grosseltern: ['with the grandparents', 'lives with {his} grandparents'], pflege: ['in a foster family', 'lives with a foster family'], heim: ['in a residential group', 'lives in a residential care group'] },
  kontakt: { regelmaessig: 'There is regular contact with both parents.', eingeschraenkt_vater: 'Contact with the father is limited.', eingeschraenkt_mutter: 'Contact with the mother is limited.', kein_vater: 'There is no contact with the father.', kein_mutter: 'There is no contact with the mother.' },
  position: { aeltestes: 'the oldest child', mittleres: 'a middle child', juengstes: 'the youngest child' },
  arbeitszeit: { vollzeit: 'full-time', teilzeit: 'part-time', nicht: '' },
  setting: { klasse: 'during whole-class instruction', kleingruppe: 'in a small group', einzel: 'in a one-to-one setting', pause: 'during recess', maison: 'at the Maison Relais', sport: 'during physical education' },
  abgestimmt: { ja: 'Yes, fully agreed', vorbehalte: 'Yes, with reservations', nein: 'No' },
  stufeAlter: { 1: '0–2 years', 2: '2–5 years', 3: '6–9 years', 4: '10–12 years', 5: '13–16 years' }
};

DS_TEXTE.en.fakten = (function () {
  const O = DS_TEXTE.en.optionen;
  const roem = function (n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n); };
  // kleine Zahlen im Text ausgeschrieben ("two siblings")
  const ZAHLWORT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  // Anzeige-Codes der englischen App; unbekannte Codes bleiben unverändert
  const CODES = { V: 'BEH', K: 'COM', SOZ: 'SOC', KOG: 'COG' };
  function code(k) {
    const t = String(k || '').split('-');
    if (CODES[t[0]]) { t[0] = CODES[t[0]]; }
    return t.join('-');
  }
  // Verb in der 3. Person Singular ("Shows", "Uses", "Is") – nicht "Class", "Access"
  function verb3(w) { return /^(Is|Has|Does)$/i.test(w) || /^[A-Za-z][a-z]*[a-rt-z]s$/.test(w || ''); }
  // ELDiB-Beschreibung (englische Daten, DTORF-R-Stil) als Satzteil nach dem Namen:
  // "Describes own experiences." -> "describes {his} own experiences"
  // "Responds on their own …" -> "responds on {his} own …"; auch "Actively participates …".
  // Nominalformen ("Motor skills of a 3-year-old.") -> '' (werden nicht umgeformt).
  function praedikat(d) {
    d = String(d || '').trim().replace(/\.$/, '');
    const w = d.split(/\s+/);
    const adverb = /^[A-Z][a-z]+ly$/.test(w[0]) && w.length > 1;
    if (!(adverb ? verb3(w[1]) : verb3(w[0]))) { return ''; }
    let p = persoenlich(d.charAt(0).toLowerCase() + d.slice(1));
    // "own" ohne Possessiv davor ("for own behavior") -> "for {his} own behavior"
    p = p.replace(/(\S+)(\s+)own\b/g, function (m, vor, ws) {
      return /^(\{his\}|his|her|its|my|your|our|one[’']s)$/i.test(vor) ? m : vor + ws + '{his} own';
    });
    return p;
  }
  // neutrales "their/themselves" der Itemtexte auf das Kind beziehen
  function persoenlich(d) {
    return String(d || '').replace(/\btheir own\b/g, '{his} own').replace(/\bthemselves\b/g, '{himself}').replace(/\btheir\b/g, '{his}').replace(/\bof self(?![\w-])/g, 'of {himself}');
  }
  // Grundform für Zielsätze: "participates in …" -> "participate in …" ("{Name} will …")
  function basis(v) {
    const u = { is: 'be', has: 'have', does: 'do', goes: 'go' };
    if (u[v]) { return u[v]; }
    if (/[^aeiou]ies$/.test(v)) { return v.slice(0, -3) + 'y'; }
    if (/(ss|sh|ch|x|zz|o)es$/.test(v)) { return v.slice(0, -2); }
    return v.replace(/s$/, '');
  }
  function grundform(d) {
    const p = praedikat(d);
    if (!p) { return ''; }
    const w = p.split(' ');
    const i = (/ly$/.test(w[0]) && w.length > 1) ? 1 : 0;
    w[i] = basis(w[i]);
    // zwei Verben: "adds and subtracts" -> "add and subtract"
    if (w[i + 1] === 'and' && verb3(w[i + 2])) { w[i + 2] = basis(w[i + 2]); }
    return w.join(' ');
  }
  // Ziele ohne Verb ("Motor skills of a 5-year-old.", "Eye-hand coordination at age 6.") als "{Name} will develop …"
  function zielNomen(d, c, h) {
    d = persoenlich(d).trim().replace(/\.$/, '');
    let m = /^((?:Fine )?[Mm]otor skills) of an? (\d+)-year-old$/.exec(d);
    if (m) { return h.satz(h.fuelle('{Name} will develop the ' + m[1].toLowerCase() + ' of a ' + m[2] + '-year-old', c), c); }
    m = /^Eye-hand coordination at age (\d+)$/.exec(d);
    if (m) { return h.satz(h.fuelle('{Name} will develop eye-hand coordination at the level expected at age ' + m[1], c), c); }
    return h.fuelle(d, c);
  }
  // Artikel vor frei eingegebenem Beruf: "as a nurse", "as an engineer"
  function mitArtikel(b) {
    if (/^(a|an|the)\s/i.test(b) || /^(self-employed|freelance|retired|unemployed)/i.test(b)) { return b; }
    return (/^[aeio]/i.test(b) ? 'an ' : 'a ') + b;
  }
  // Stufe mit Richtziel und Alter: (“Acquiring skills …”, 6–9 years)
  function klammer(x) {
    const teile = [x.richtziel ? '“' + x.richtziel + '”' : '', O.stufeAlter[x.stufe] || ''].filter(Boolean);
    return teile.length ? ' (' + teile.join(', ') + ')' : '';
  }
  const KOPF = ['Period', 'Class', 'Measure', 'Provider'];

  return {
    auftrag: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const wer = (O.auftraggeber[f.auftraggeber || 'cni'] || O.auftraggeber.cni)[1];
      const wer2 = f.auftraggeber === 'andere' && h.frei(ds, 'auftraggeber_andere') ? h.frei(ds, 'auftraggeber_andere') : wer;
      // ohne Namen bleibt {Vollname} leer -> dann "the student"
      s.push(h.satz(h.fuelle('The Centre pour le développement socio-émotionnel (Centre for Socio-Emotional Development, CDSE) was commissioned by {wer}{datum: on {datum}} to carry out a specialized diagnostic assessment of ' + (c.vollname ? '{Vollname}' : '{Name}') + ' in order to determine {his} current level of socio-emotional development and {his} special educational needs.', c, { datum: h.datum(f.auftrag_datum, 'en'), wer: wer2 }), c));
      // beide Verhaltens-Chips zusammenfassen: "behavioral difficulties at school and at home"
      const ak = h.chips(ds, 'anlass'), beide = ak.indexOf('verhalten_schule') >= 0 && ak.indexOf('verhalten_zuhause') >= 0;
      const anl = ak.filter(function (k) { return !(beide && k === 'verhalten_zuhause'); }).map(function (k) { return beide && k === 'verhalten_schule' ? 'behavioral difficulties at school and at home' : h.chipText(c, 'anlass', k); });
      if (h.frei(ds, 'anlass_andere')) { anl.push(h.frei(ds, 'anlass_andere')); }
      if (anl.length) { s.push(h.satz(h.fuelle('The referral was prompted by {liste}.', c, { liste: h.liste(anl, c) }), c)); }
      const anl2 = h.chips(ds, 'anliegen').map(function (k) { return h.chipText(c, 'anliegen', k); });
      if (anl2.length) { s.push(h.satz(h.fuelle('The aim is to initiate {liste}.', c, { liste: h.liste(anl2, c) }), c)); }
      const emp = h.chips(ds, 'empfohlen').filter(function (k) { return k !== 'eltern'; }).map(function (k) { return h.chipText(c, 'empfohlen', k); });
      const wunsch = h.chips(ds, 'empfohlen').indexOf('eltern') >= 0;
      // "auf Wunsch der Eltern": mit der Eltern-Quelle ({Qd}), damit z. B. eine alleinerziehende Mutter nicht zu "the parents" wird
      if (emp.length && wunsch) { s.push(h.satz(h.fuelle('The request was made at the wish of {Qd} and on the recommendation of {liste}.', c, { liste: h.liste(emp, c) }), c)); }
      else if (emp.length) { s.push(h.satz(h.fuelle('The request was made on the recommendation of {liste}.', c, { liste: h.liste(emp, c) }), c)); }
      else if (wunsch) { s.push(h.satz(h.fuelle('The request was made at the wish of {Qd}.', c), c)); }
      const b = [h.block(s.join(' '))];
      return b.concat(h.freiBloecke(ds, 'anlass_details'));
    },

    vorgeschichte: function (c, ds, st, h) {
      const f = ds.f || {}, s = [], b = [];
      c.neuerAbsatz();
      // Schwangerschaft und Geburt
      const sg = f.schwangerschaft, gb = f.geburt;
      if (sg === 'unauffaellig' && gb === 'unauffaellig') { s.push(h.satz(h.fuelle('According to {Q}, the pregnancy and birth were uneventful.', c), c)); }
      else {
        if (sg === 'unauffaellig') { s.push('The pregnancy was uneventful.'); }
        if (sg === 'komplikationen') { s.push(h.satz(h.fuelle('There were complications during pregnancy{d: ({d})}.', c, { d: h.frei(ds, 'schwangerschaft_details') }), c)); }
        if (gb === 'unauffaellig') { s.push('The birth was uneventful.'); }
        if (gb === 'komplikationen') { s.push(h.satz(h.fuelle('There were complications at birth{d: ({d})}.', c, { d: h.frei(ds, 'geburt_details') }), c)); }
      }
      // Motorik und Sprache
      const mo = f.motorik, sp = f.sprache;
      const worte = f.erste_worte ? ' (first words at around ' + f.erste_worte + ' months)' : '';
      if (mo === 'altersgerecht' && sp === 'altersgerecht') { s.push('Motor and language development were age-appropriate' + worte + '.'); }
      else if (mo === 'altersgerecht' && sp === 'verzoegert' && !h.frei(ds, 'sprache_details')) { s.push('Motor development was age-appropriate, while language development was delayed' + worte + '.'); }
      else if (mo === 'verzoegert' && sp === 'altersgerecht' && !h.frei(ds, 'motorik_details')) { s.push('Language development was age-appropriate' + worte + ', while motor development was delayed.'); }
      else {
        if (mo === 'altersgerecht') { s.push('Motor development was age-appropriate.'); }
        if (mo === 'verzoegert') { s.push(h.satz(h.fuelle('Motor development was delayed{d: ({d})}.', c, { d: h.frei(ds, 'motorik_details') }), c)); }
        if (sp === 'altersgerecht') { s.push('Language development was age-appropriate' + worte + '.'); }
        if (sp === 'verzoegert') { s.push(h.satz(h.fuelle('Language development was delayed' + worte + '{d:; {d}}.', c, { d: h.frei(ds, 'sprache_details') }), c)); }
      }
      // Diagnosen
      const dg = h.chips(ds, 'diagnosen').map(function (k) {
        const name = k === 'andere' ? h.frei(ds, 'diagnose_andere') : h.chipText(c, 'diagnosen', k);
        const det = ds.f && ds.f.diagnosen_details && ds.f.diagnosen_details[k];
        return name ? name + (det ? ' (' + det + ')' : '') : '';
      }).filter(Boolean);
      if (dg.length) { s.push(h.satz(h.fuelle('To date, {N} has been diagnosed with {liste}.', c, { liste: h.liste(dg, c), zahl: dg.length }), c)); }
      else if (f.keine_diagnosen) { s.push('No diagnoses have been made to date.'); }
      if (s.length) { b.push(h.block(s.join(' '))); }
      const rows = ((ds.tabellen && ds.tabellen.vorgeschichte) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) {
        b.push(h.block('Previous school-based and out-of-school support measures:'));
        b.push({ typ: 'tabelle', id: 'vorgeschichte', kopf: KOPF.slice(), zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }) });
      }
      return b.concat(h.freiBloecke(ds, 'vorgeschichte'));
    },

    sozialbericht: function (c, ds, st, h) {
      const f = ds.f || {}, s = [];
      c.neuerAbsatz();
      const lb = O.lebt_bei[f.lebt_bei], fs = f.familienstand, wo = f.lebt_bei;
      const stand = { getrennt: '{Name}’s parents are separated', zusammen: '{Name}’s parents live together', alleinerziehend: wo === 'vater' ? '{Name}’s father is a single parent' : '{Name}’s mother is a single parent', patchwork: '{Name} is growing up in a blended family', verstorben: 'One of {Name}’s parents has died' }[fs];
      if (fs === 'alleinerziehend' && (wo === 'mutter' || wo === 'vater')) { s.push(h.satz(h.fuelle('{Name} lives with {his} ' + (wo === 'vater' ? 'father' : 'mother') + ', who is a single parent.', c), c)); }
      else if (stand && lb && !(fs === 'zusammen' && wo === 'beide')) { s.push(h.satz(h.fuelle(stand + '; [[he|she]] ' + lb[1] + '.', c), c)); }
      else if (stand && fs === 'zusammen' && wo === 'beide') { s.push(h.satz(h.fuelle('{Name} lives with both parents.', c), c)); }
      else if (stand) { s.push(h.satz(h.fuelle(stand + '.', c), c)); }
      else if (lb) { s.push(h.satz(h.fuelle('{N} ' + lb[1] + '.', c), c)); }
      if (O.kontakt[f.kontakt]) { s.push(O.kontakt[f.kontakt]); }
      if (h.frei(ds, 'kontakt_details')) { s.push(h.satz(h.frei(ds, 'kontakt_details'), c)); }
      const n = parseInt(f.geschwister_anzahl, 10);
      if (n === 0) { s.push(h.satz(h.fuelle('{N} is an only child.', c), c)); }
      else if (n > 0) {
        const pk = f.geschwister_position, pos = O.position[pk];
        let t;
        if (n === 1 && pk === 'aeltestes') { t = '{N} has a younger sibling.'; }
        else if (n === 1 && pk === 'juengstes') { t = '{N} has an older sibling.'; }
        else { t = '{N} has ' + (n === 1 ? 'one sibling' : (ZAHLWORT[n] || String(n)) + ' siblings') + (pos && n > 1 ? ' and is ' + pos : '') + '.'; }
        s.push(h.satz(h.fuelle(t, c), c));
      }
      const sp = h.chips(ds, 'sprachen').map(function (k) { return k === 'andere' ? h.frei(ds, 'sprache_andere') : h.chipText(c, 'sprachen', k); }).filter(Boolean);
      if (sp.length) { s.push(h.satz(h.fuelle('The family speaks {liste} at home.', c, { liste: h.liste(sp, c) }), c)); }
      // Beruf der Eltern; Freitext wird nicht durch fuelle geschickt
      const sein = h.fuelle('{his}', c);
      const beruf = function (wer, b, z) {
        if (z === 'nicht') { return wer + ' is not currently employed'; }
        if (!b && !z) { return ''; }
        return wer + ' works' + (O.arbeitszeit[z] ? ' ' + O.arbeitszeit[z] : '') + (b ? ' as ' + mitArtikel(b) : '');
      };
      const bm = beruf(sein + ' mother', h.frei(ds, 'beruf_mutter'), f.zeit_mutter), bv = beruf(sein + ' father', h.frei(ds, 'beruf_vater'), f.zeit_vater);
      if (bm && bv) { s.push(h.satz(bm + '; ' + bv + '.', c)); } else if (bm || bv) { s.push(h.satz((bm || bv) + '.', c)); }
      const ev = h.chips(ds, 'ereignisse').map(function (k) {
        const det = ds.f && ds.f.ereignis_details && ds.f.ereignis_details[k];
        return h.chipText(c, 'ereignisse', k) + (det ? ' (' + det + ')' : '');
      });
      if (ev.length) { s.push(h.satz(h.fuelle('{liste} {{is|are}} reported as {{a stressful life event|stressful life events}}.', c, { liste: h.liste(ev, c), zahl: ev.length }), c)); }
      const bt = h.chips(ds, 'betreuung');
      if (bt.indexOf('maison_relais') >= 0) { s.push(h.satz(h.fuelle('After school, {N} attends the Maison Relais.', c), c)); }
      const gr = bt.indexOf('grosseltern') >= 0, tm = bt.indexOf('tagesmutter') >= 0;
      if (gr && tm) { s.push(h.satz(h.fuelle('Outside school hours, {N} is looked after by {his} grandparents and by a childminder.', c), c)); }
      else if (gr) { s.push(h.satz(h.fuelle('Outside school hours, {N} is regularly looked after by {his} grandparents.', c), c)); }
      else if (tm) { s.push(h.satz(h.fuelle('Outside school hours, {N} is looked after by a childminder.', c), c)); }
      if (h.frei(ds, 'freizeit')) { s.push(h.satz(h.frei(ds, 'freizeit'), c)); }
      return (s.length ? [h.block(s.join(' '))] : []).concat(h.freiBloecke(ds, 'familie'));
    },

    aktuell: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      const klasse = f.klasse || (st && st.klasse) || '', schule = f.schule_name || (st && st.foerderort) || '';
      const s = [];
      if (klasse || schule) {
        const lp = h.frei(ds, 'lehrperson');
        let t = '{N} currently attends ' + (klasse ? 'class {klasse}' + (schule ? ' at {schule}' : '') : '{schule}');
        if (lp) { t += ', where {his} class teacher is {lp}'; }
        s.push(h.satz(h.fuelle(t + '.', c, { klasse: klasse, schule: schule, lp: lp }), c));
      }
      if (h.frei(ds, 'eseb_referenz')) { s.push(h.satz(h.fuelle('{his} reference person at the ESEB is {x}.', c, { x: h.frei(ds, 'eseb_referenz') }), c)); }
      const b = s.length ? [h.block(s.join(' '))] : [];
      const rows = ((ds.tabellen && ds.tabellen.aktuell) || []).filter(function (r) { return r && (r.zeitraum || r.massnahme || r.akteur); });
      if (rows.length) { b.push({ typ: 'tabelle', id: 'aktuell', kopf: KOPF.slice(), zeilen: rows.map(function (r) { return [r.zeitraum || '', r.klasse || '', r.massnahme || '', r.akteur || '']; }), abschnitt: 'massnahmen' }); }
      return b;
    },

    verfahren: function (c, ds, st, h) {
      c.neuerAbsatz();
      const v = h.chips(ds, 'verfahren').filter(function (k) { return k !== 'andere' && h.chipText(c, 'verfahren', k); }).map(function (k) { return h.chipText(c, 'verfahren', k); });
      if (h.frei(ds, 'verfahren_andere')) { v.push(h.frei(ds, 'verfahren_andere')); }
      if (!v.length) { v.push(h.chipText(c, 'verfahren', 'eldib')); }
      const s = [h.satz(h.fuelle('This assessment is based on {liste}, on classroom observations and on interviews with {QSd}, {Qd} and {Name} {himself}.', c, { liste: h.liste(v, c) }), c)];
      if (h.frei(ds, 'verfahren_ort')) { s.push(h.satz(h.fuelle('Observations and interviews took place in {ort}.', c, { ort: h.frei(ds, 'verfahren_ort') }), c)); }
      return [h.block(s.join(' '))];
    },

    beobachtungIntro: function (c, ds, st, h) {
      const l = ((ds.f && ds.f.beobachtungen) || []).filter(function (b) { return b && (b.datum || b.setting || b.dauer); });
      if (!l.length) { return []; }
      c.neuerAbsatz();
      const T = DS_TEXTE.en.s;
      const teile = l.map(function (b) {
        return h.fuelle(T.beob_eintrag, c, { datum: h.datum(b.datum, 'en'), ort: O.setting[b.setting] || b.setting_andere || '', dauer: b.dauer ? String(b.dauer) : '' }).trim();
      });
      return [h.block(h.satz(h.fuelle(l.length > 1 ? T.beob_mehrere : T.beob_eine, c, { beob: h.liste(teile, c) }), c))];
    },

    eldib: function (c, ds, st, h, profil) {
      const b = [];
      c.neuerAbsatz();
      b.push(h.block('The ELDiB (Entwicklungstherapeutischer/Entwicklungspädagogischer Lernziel-Diagnose-Bogen), the German adaptation of the Developmental Teaching Objectives Rating Form – Revised (DTORF-R), is a standardized rating instrument designed to assess the social and emotional development of children and adolescents from birth to the age of sixteen. It provides a profile of specific skills that serve as indicators of the level of social and emotional competence.'));
      const bereiche = (profil && profil.bereiche) || [];
      const mitStufe = bereiche.filter(function (x) { return x.stufe > 0; });
      bereiche.forEach(function (x) {
        c.neuerAbsatz();
        const s = [];
        const v = { bereich: x.name, code: code(x.code), stufe: roem(x.stufe), klammer: klammer(x) };
        if (!x.stufe) { s.push(h.satz(h.fuelle('In the {bereich} domain ({code}), no items have yet been rated as mastered.', c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[0]) { s.push(h.satz(h.fuelle('{Name} is most advanced in the {bereich} domain ({code}), where [[he|she]] is functioning at developmental Stage {stufe}{klammer}.', c, v), c)); }
        else if (mitStufe.length > 1 && x === mitStufe[mitStufe.length - 1]) { s.push(h.satz(h.fuelle('The least developed domain is {bereich} ({code}), where {N} is functioning at developmental Stage {stufe}{klammer}.', c, v), c)); }
        else { s.push(h.satz(h.fuelle('In the {bereich} domain ({code}), {N} is functioning at developmental Stage {stufe}{klammer}.', c, v), c)); }
        // die zwei zuletzt erreichten Fähigkeiten, mit unterschiedlichem Verb
        const pr = [], verben = {};
        (x.erreicht || []).slice().reverse().forEach(function (it) {
          const p = praedikat(it.description), w = p.split(' ')[0];
          if (p && pr.length < 2 && !verben[w]) { verben[w] = 1; pr.unshift(h.fuelle(p, c)); }
        });
        // enthält ein Beispiel schon "and" ("multiplies and divides"), zwei Satzteile: ", and she …"
        const pv = pr.length === 2 && pr.some(function (x) { return / and /.test(x); }) ? pr[0] + ', and ' + h.fuelle('[[he|she]] ', c) + pr[1] : h.liste(pr, c, false, true);
        if (pr.length) { s.push(h.satz(h.fuelle('{N} has already acquired solid skills in this domain; for example, [[he|she]] {p}.', c, { p: pv }), c)); }
        const extra = ds.frei && ds.frei['eldib_' + x.id];
        if (extra && String(extra).trim()) { s.push(String(extra).trim()); }
        b.push(h.block(s.join(' ')));
        if ((x.ziele || []).length) {
          b.push(h.block(h.satz(h.fuelle('Based on the stage objective, the following learning goals have been set for {Nt}:', c), c)));
          b.push({ typ: 'liste', punkte: x.ziele.map(function (z) { return code(z.code) + ' – ' + h.fuelle(persoenlich(z.description).replace(/\.$/, ''), c); }) });
        } else if (x.stufe) {
          b.push(h.block('No learning goals have been set in this domain.'));
        }
      });
      if (profil && profil.lebensalter != null && mitStufe.length) {
        c.neuerAbsatz();
        const erw = profil.erwarteteStufe, unter = mitStufe.filter(function (x) { return x.stufe < erw; });
        const v = { roem: roem(erw), alter: O.stufeAlter[erw] || '', jahre: profil.lebensalter };
        const erwartet = 'Given a chronological age of {jahre} years, developmental Stage {roem}{alter: ({alter})} would be expected; ';
        let t;
        if (unter.length === bereiche.length) { t = erwartet + 'all ' + (ZAHLWORT[bereiche.length] || bereiche.length) + ' domains fall below this level.'; }
        else if (unter.length === 1) { t = erwartet + 'the {liste} domain falls below this level.'; v.liste = unter[0].name; }
        else if (unter.length) { t = erwartet + 'the {liste} domains fall below this level.'; v.liste = h.liste(unter.map(function (x) { return x.name; }), c); }
        else { t = 'In all domains assessed, {N} is functioning at least at the age-appropriate developmental Stage {roem}{alter: ({alter})}.'; }
        b.push(h.block(h.satz(h.fuelle(t, c, v), c)));
      }
      return b;
    },

    schluss: function (c, ds, st, h) {
      const f = ds.f || {};
      c.neuerAbsatz();
      // ab etwa 12 Jahren wird das Kind in die Abstimmung einbezogen (Vorlage CNI)
      const mitKind = c.alter != null && c.alter >= 12;
      // das Kind zuletzt nennen, damit sich "her/his" eindeutig auf das Kind bezieht (nicht auf "the mother")
      const wer = mitKind ? '{Qd} and with {Name} {himself}' : '{Qd}';
      const ihre = mitKind ? '{his}' : '{Name}’s';
      let t;
      if (f.abgestimmt === 'vorbehalte') {
        t = 'Based on the available test results, observations and case history information, specific support needs were identified. In discussions with ' + wer + ', recommendations were developed to further support ' + ihre + ' individual development. Some of the proposed measures were, however, questioned or not fully endorsed by ' + (mitKind ? '{Qd} and/or by {Name}' : '{Qd}') + '.';
      } else if (f.abgestimmt === 'nein') {
        t = 'Based on the available test results, observations and case history information, specific support needs were identified and recommendations formulated. It has not yet been possible to agree on these recommendations with ' + wer + '.';
      } else {
        t = 'Based on the test results, observations and case history information gathered, specific support needs were identified in close consultation with ' + wer + '. On this basis, recommendations were jointly formulated to support ' + ihre + ' individual development effectively.';
      }
      return [h.block(h.satz(h.fuelle(t, c), c))].concat(h.freiBloecke(ds, 'vorbehalte'));
    },

    ziele: function (c, ds, st, h, profil) {
      const f = ds.f || {}, b = [];
      c.neuerAbsatz();
      const ziele = [];
      ((profil && profil.bereiche) || []).forEach(function (x) { (x.ziele || []).forEach(function (z) { ziele.push({ z: z, x: x }); }); });
      const bis = f.ziele_bis ? 'until ' + h.datum(f.ziele_bis, 'en') : 'until the end of the next ' + ((st && st.periodenTyp) === 'semester' ? 'semester' : 'trimester');
      if (ziele.length) {
        b.push(h.block(h.satz(h.fuelle('The following support goals are derived from the ELDiB learning goals. Each goal describes the next developmental step; progress will be monitored in everyday situations {bis} and reviewed at the next ELDiB assessment.', c, { bis: bis }), c)));
        b.push({ typ: 'liste', punkte: ziele.map(function (e) {
          c.neuerAbsatz();
          // "Participates in group discussions." -> "Tom will participate in group discussions"
          const g = grundform(e.z.description);
          const text = g ? h.satz(h.fuelle('{Name} will ' + g, c), c) : zielNomen(e.z.description, c, h);
          return text + ' (' + code(e.z.code) + ')';
        }) });
      }
      const zus = h.frei(ds, 'ziele_zusatz');
      if (zus) { b.push({ typ: 'liste', punkte: zus.split(/\n+/).map(function (l) { return l.replace(/^[-•*]\s*/, '').trim(); }).filter(Boolean) }); }
      return b;
    },

    empfehlungen: function (c, ds, st, h) {
      const b = [];
      c.neuerAbsatz();
      [['empf_familie', 'Family context', 'empfehlung_familie'], ['empf_schule', 'School context (local)', 'empfehlung_schule'], ['empf_region', 'Regional context (ESEB / CDSE)', 'empfehlung_region']].forEach(function (g) {
        const p = h.chips(ds, g[0]).map(function (k) { return h.fuelle(h.chipText(c, g[0], k), c); });
        const extra = h.frei(ds, g[2]);
        if (extra) { extra.split(/\n+/).forEach(function (l) { l = l.replace(/^[-•*]\s*/, '').trim(); if (l) { p.push(l); } }); }
        if (p.length) { b.push({ typ: 'zwischen', text: g[1] }); b.push({ typ: 'liste', punkte: p }); }
      });
      return b;
    },

    cni: function (c, ds, st, h) {
      c.neuerAbsatz();
      const m = h.chips(ds, 'cni').map(function (k) { return h.fuelle(h.chipText(c, 'cni', k), c); });
      const b = [];
      if (m.length) {
        // Bezeichnungen der Maßnahmen = Deckblatt (siehe chips.cni)
        b.push(h.block(m.length > 1 ? 'The CDSE recommends the following measures to the Commission nationale d’inclusion (CNI):' : 'The CDSE recommends the following measure to the Commission nationale d’inclusion (CNI):'));
        b.push({ typ: 'liste', punkte: m });
      }
      return b.concat(h.freiBloecke(ds, 'cni_begruendung'));
    }
  };
})();

// ==== 46-ds-text.js ====
// =====================================================================
// DS-Textbaukasten: macht aus Bewertungen, Auswahl und Fakten den Bericht
// ---------------------------------------------------------------------
// Ergebnis je Abschnitt: Liste von Blöcken
//   { typ: 'absatz', text }   { typ: 'liste', punkte: [...] }
//   { typ: 'zwischen', text } (fette Zwischenzeile)
// Sprachunabhängig; die Sätze stehen in DS_TEXTE.de / .fr / .en.
// =====================================================================
const DsText = (function () {
'use strict';

const PRON = {
  de: { m: { N: 'er', D: 'ihm', A: 'ihn', T: 'ihm', sein: 'sein', seine: 'seine', seinen: 'seinen', seinem: 'seinem', seiner: 'seiner', seines: 'seines' },
        w: { N: 'sie', D: 'ihr', A: 'sie', T: 'ihr', sein: 'ihr', seine: 'ihre', seinen: 'ihren', seinem: 'ihrem', seiner: 'ihrer', seines: 'ihres' } },
  // fr: T = betontes Pronomen nach Präposition ("pour lui / pour elle")
  fr: { m: { N: 'il', D: 'lui', A: 'le', T: 'lui' }, w: { N: 'elle', D: 'lui', A: 'la', T: 'elle' } },
  en: { m: { N: 'he', D: 'him', A: 'him', T: 'him', his: 'his', himself: 'himself' }, w: { N: 'she', D: 'her', A: 'her', T: 'her', his: 'her', himself: 'herself' } }
};
const KONTRAST_VORSATZ = { fr: ['Toutefois, ', 'En revanche, ', 'Cependant, '], en: ['However, ', 'At the same time, ', 'By contrast, '] };

function texte(lang) { return DS_TEXTE[lang] || DS_TEXTE.de; }
function gross(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function klein(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

// ---------- Kontext: wer ist gemeint, welche Sprache ----------
function kontext(lang, ds, stamm) {
  const f = (ds && ds.f) || {};
  const voll = String((stamm && stamm.schueler_name) || '').trim();
  let vorname = voll, nachname = '';
  if (voll.indexOf(',') >= 0) { nachname = voll.split(',')[0].trim(); vorname = voll.split(',').slice(1).join(',').trim(); }
  const g = ds && ds.geschlecht === 'w' ? 'w' : 'm';
  const T = texte(lang);
  const c = {
    lang: lang, T: T, g: g,
    name: vorname || T.s.das_kind || 'das Kind',
    vollname: (vorname && nachname) ? vorname + ' ' + nachname : (vorname || voll),
    seit: 0, kontrast: false, kontrastNr: 0,
    q: (T.quellen && T.quellen.eltern[f.eltern_quelle || 'eltern']) || null,
    qs: (T.quellen && T.quellen.schule[f.schule_quelle || 'lehrperson']) || null,
    alter: alterJahre(stamm && stamm.geburtsdatum)
  };
  c.neuerAbsatz = function () { c.seit = 0; };
  return c;
}
function alterJahre(geb) {
  if (!geb) { return null; }
  const d = new Date(geb), h = new Date();
  if (isNaN(d)) { return null; }
  let j = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) { j--; }
  return j;
}

// Name oder Pronomen? Erste Nennung im Absatz = Name, dann Pronomen,
// jede dritte Nennung wieder der Name - lesbar, ohne Wiederholungen.
function person(c, fall) {
  const p = PRON[c.lang][c.g];
  if (c.seit === 0 || c.seit >= 3) { c.seit = 1; return c.name; }
  c.seit++;
  return p[fall] || c.name;
}

// ---------- Platzhalter füllen ----------
// {Name} {N} {Nd} {Na} {Nt} {er} … {T} {Q} {QS} {KONTRAST} {liste} … {feld: bedingter Text}
// {Nt} = Name bzw. betontes Pronomen nach Präposition (fr: pour lui/elle), {T} immer das Pronomen
// [[männlich|weiblich]]  {{einzahl|mehrzahl}} (Zahl aus vars.zahl bzw. Quelle)
function fuelle(tpl, c, vars) {
  vars = vars || {};
  if (tpl == null) { return ''; }
  let s = String(tpl);
  s = s.replace(/\[\[([^|\]]*)\|([^\]]*)\]\]/g, function (m, a, b) { return c.g === 'w' ? b : a; });
  const zahl = vars.zahl != null ? vars.zahl : ((c.q && c.q.zahl) || 1);
  s = s.replace(/\{\{([^|}]*)\|([^}]*)\}\}/g, function (m, a, b) { return zahl > 1 ? b : a; });
  return ersetze(s, c, vars);
}
function ersetze(s, c, vars) {
  let out = '', i = 0;
  while (i < s.length) {
    const ch = s.charAt(i);
    if (ch !== '{') { out += ch; i++; continue; }
    let tiefe = 1, j = i + 1;
    while (j < s.length && tiefe > 0) { if (s.charAt(j) === '{') { tiefe++; } else if (s.charAt(j) === '}') { tiefe--; } j++; }
    const innen = s.slice(i + 1, j - 1);
    out += platzhalter(innen, c, vars);
    i = j;
  }
  return out;
}
function platzhalter(innen, c, vars) {
  const bed = /^(\w+):([\s\S]*)$/.exec(innen);
  if (bed) { const v = vars[bed[1]]; return (v != null && v !== '' && !(Array.isArray(v) && !v.length)) ? ersetze(bed[2], c, vars) : ''; }
  let hoch = false, k = innen;
  if (k.charAt(0) === '^') { hoch = true; k = k.slice(1); }
  let w = wert(k, c, vars);
  if (w == null) { w = '{' + innen + '}'; }
  return hoch ? gross(w) : w;
}
function wert(k, c, vars) {
  if (Object.prototype.hasOwnProperty.call(vars, k)) { return vars[k] == null ? '' : String(vars[k]); }
  const p = PRON[c.lang][c.g];
  switch (k) {
    case 'N': return person(c, 'N');
    case 'Nd': return person(c, 'D');
    case 'Na': return person(c, 'A');
    case 'Nt': return person(c, 'T');
    case 'Name': c.seit = 1; return c.name;
    case 'Vollname': c.seit = 1; return c.vollname;
    case 'er': case 'il': case 'he': return p.N;
    case 'ihm': case 'lui': return p.D;
    case 'ihn': case 'him': case 'le': return p.A;
    case 'T': return p.T;
    case 'his': return p.his;
    case 'himself': return p.himself;
    case 'KONTRAST': return (c.kontrast && c.lang === 'de') ? 'jedoch ' : '';
    case 'Q': if (c.q && (c.q.zahl || 1) === 1) { c.seit = 0; } return c.q ? c.q.n : '';
    case 'Qd': return c.q ? c.q.d : '';
    case 'Qg': return c.q ? c.q.g : '';
    case 'QS': return c.qs ? c.qs.n : '';
    case 'QSd': return c.qs ? c.qs.d : '';
  }
  if (p && Object.prototype.hasOwnProperty.call(p, k)) { return p[k]; }
  return null;
}

// Satzbau aufräumen: Leerzeichen, Großschreibung am Satzanfang, Französisch
function satz(s, c) {
  s = String(s || '').replace(/\s+/g, ' ').replace(/\s+([.,;:!?)])/g, '$1').replace(/\(\s+/g, '(').trim();
  if (c.lang === 'fr') { s = franz(s); }
  return gross(s);
}
function franz(s) {
  // Elision vor Vokal/stummem h. Keine \b-Grenzen: die kennen keine Akzente
  // ("Hélène a" würde sonst zu "Hélèn'a"). Y (Yanis) wird nicht elidiert.
  const BUCHST = 'A-Za-zÀ-ÖØ-öø-ÿŒœ\'’';
  s = s.replace(new RegExp('(^|[^' + BUCHST + '])(de|que|ne|se|le|la|je|me|te|lorsque|puisque|jusque) (?=[aeiouyhàâéèêëîïôûùœAEIOUHÀÂÉÈÊÎÔÛ])', 'g'), function (m, v, w) {
    return v + (/^(le|la)$/.test(w) ? "l'" : w.slice(0, -1) + "'");
  });
  s = s.replace(new RegExp('(^|[^' + BUCHST + '])si (?=ils?(?![' + BUCHST + ']))', 'g'), "$1s'");
  // Leerzeichen vor : ; ! ? und in « », typografischer Apostroph
  s = s.replace(/ ?([:;!?])(?=\s|$)/g, ' $1').replace(/« ?/g, '« ').replace(/ ?»/g, ' »');
  return s.replace(/'/g, '’');
}

// Aufzählung "a, b und c"
function liste(teile, c, oder, einfach) {
  const T = c.T.s;
  teile = teile.filter(function (x) { return x; });
  if (teile.length <= 1) { return teile[0] || ''; }
  let und = oder ? T.liste_oder : T.liste_und;
  // enthalten die Teile selbst schon "und", klingt "sowie" besser: "a, b und c sowie d"
  if (!oder && !einfach && T.liste_sowie && teile.some(function (x) { return (' ' + x + ' ').indexOf(' ' + T.liste_und + ' ') >= 0; })) { und = T.liste_sowie; }
  return teile.slice(0, -1).join(', ') + ' ' + und + ' ' + teile[teile.length - 1];
}
// Zahl für {{einzahl|mehrzahl}}: mehrere Teile oder ein Teil in der Mehrzahl
function zahlVon(eintraege) { return (eintraege.length > 1 || eintraege.some(function (x) { return x && x.pl; })) ? 2 : 1; }

// ---------- Bewertete Aussagen ----------
function bewertung(ds, id) { const r = ds.bewertungen && ds.bewertungen[id]; return (r >= 1 && r <= 7) ? r : null; }
function chips(ds, gruppe) { return (ds.chips && ds.chips[gruppe]) || []; }
function chipText(c, gruppe, key) { const g = c.T.chips[gruppe] || {}; return g[key] ? g[key][1] : ''; }

// Ein Satz zu einer bewerteten Aussage
function aussageSatz(c, id, r, kontrast) {
  const a = c.T.a[id];
  if (!a || !a.t) { return ''; }
  const tpl = a.t[dsStufe(r)];
  if (!tpl) { return ''; }
  c.kontrast = !!kontrast;
  let s = satz(fuelle(tpl, c, c.vars || {}), c);
  c.kontrast = false;
  if (kontrast && c.lang !== 'de') {
    const v = KONTRAST_VORSATZ[c.lang];
    const vors = v[(c.kontrastNr++) % v.length];   /* reihum, damit sich nichts wiederholt */
    s = vors + (s.indexOf(c.name) === 0 ? s : klein(s));
  }
  return s;
}

// Sichtweisen und Beobachtung: je Thema ein Absatz, Stärken zuerst, dann
// Gemischtes, dann Schwierigkeiten (die deutlichsten zuerst).
function themenAbsaetze(bereich, c, ds, weiter) {
  const aufbau = DS_AUFBAU[bereich], absaetze = [], ohne = [];
  aufbau.themen.forEach(function (th) {
    const eintraege = [];
    th.aussagen.forEach(function (a, i) {
      const r = bewertung(ds, a[0]);
      if (r == null) { return; }
      const e = { id: a[0], pol: a[1], r: r, i: i, v: a[1] < 0 ? 8 - r : r, vorne: a[2] === 'vorne' };
      if (e.pol < 0 && r <= 2) { const np = c.T.a[e.id] && c.T.a[e.id].np; if (np) { ohne.push(fuelle(np, c)); } return; }
      eintraege.push(e);
    });
    if (!eintraege.length) { return; }
    eintraege.sort(function (x, y) { return (y.vorne - x.vorne) || (y.v - x.v) || (x.i - y.i); });
    if (weiter && !absaetze.length) { weiter = false; } else { c.neuerAbsatz(); }
    const saetze = [];
    let staerke = false, kontrastDa = false;
    eintraege.forEach(function (e) {
      if (e.vorne) { const s0 = aussageSatz(c, e.id, e.r, false); if (s0) { saetze.push(s0); } return; }
      const k = staerke && !kontrastDa && e.v <= 4;
      const s = aussageSatz(c, e.id, e.r, k);
      if (!s) { return; }
      if (k) { kontrastDa = true; }
      if (e.v >= 5) { staerke = true; }
      saetze.push(s);
    });
    if (saetze.length) { absaetze.push(saetze); }
  });
  // sehr kurze Absätze mit dem vorigen zusammenlegen
  const zusammen = [];
  absaetze.forEach(function (a) {
    if (zusammen.length && (a.length < 2 || zusammen[zusammen.length - 1].length < 2)) { zusammen[zusammen.length - 1] = zusammen[zusammen.length - 1].concat(a); }
    else { zusammen.push(a); }
  });
  return { absaetze: zusammen, ohne: ohne };
}

function block(text) { return { typ: 'absatz', text: text }; }
function frei(ds, feld) { const t = ds.frei && ds.frei[feld]; return t && String(t).trim() ? String(t).trim() : ''; }
function freiBloecke(ds, feld) {
  return frei(ds, feld) ? frei(ds, feld).split(/\n\s*\n/).map(function (t) { return block(t.replace(/\s*\n\s*/g, ' ').trim()); }) : [];
}

// Sichtweise der Schule / des Kindes / der Eltern
function sichtweise(bereich, c, ds, opt) {
  const T = c.T.s, f = ds.f || {};
  const bloecke = [];
  c.neuerAbsatz();
  const vorne = [];
  c.vars = { datum: datumText(f[opt.datum], c.lang) };
  // Einleitungssatz; beim Kind nur mit Datum (sonst sagt er nichts aus)
  if (opt.intro && !(opt.introWennNicht && bewertung(ds, opt.introWennNicht) != null) && !(opt.introNurMitDatum && !c.vars.datum)) { vorne.push(satz(fuelle(T[opt.intro], c, c.vars), c)); }
  (opt.chipsVorne || []).forEach(function (g) {
    const l = chips(ds, g[0]).map(function (k) { return fuelle(chipText(c, g[0], k), c); });
    if (l.length) { const v = { liste: liste(l, c) }; if (g[2] === 'liste') { v.zahl = l.length > 1 ? 2 : 1; } vorne.push(satz(fuelle(T[g[1]], c, v), c)); }
  });
  const tz = themenAbsaetze(bereich, c, ds, vorne.length > 0);
  c.vars = null;
  const absaetze = tz.absaetze.map(function (a) { return a.slice(); });
  if (vorne.length) { if (absaetze.length) { absaetze[0] = vorne.concat(absaetze[0]); } else { absaetze.push(vorne); } }
  if (tz.ohne.length && opt.ohne) {
    const s = satz(fuelle(T[opt.ohne], c, { liste: liste(tz.ohne, c, true) }), c);
    if (absaetze.length) { absaetze[absaetze.length - 1].push(s); } else { absaetze.push([s]); }
  }
  absaetze.forEach(function (a) { bloecke.push(block(a.join(' '))); });
  const hinten = [];
  c.neuerAbsatz();
  (opt.chipsHinten || []).forEach(function (g) {
    const l = chips(ds, g[0]).map(function (k) { return fuelle(chipText(c, g[0], k), c); });
    if (l.length) { const v = { liste: liste(l, c) }; if (g[2] === 'liste') { v.zahl = l.length > 1 ? 2 : 1; } hinten.push(satz(fuelle(T[g[1]], c, v), c)); }
  });
  if (opt.extra) { opt.extra(hinten); }
  if (hinten.length) { bloecke.push(block(hinten.join(' '))); }
  return bloecke.concat(freiBloecke(ds, bereich));
}

// ---------- 4.3 Interpretation ----------
function gruppiert(c, ds, themaId, feld) {
  const th = DS_AUFBAU.deutung.themen.filter(function (t) { return t.id === themaId; })[0];
  const stark = [], mittel = [];
  th.aussagen.forEach(function (a) {
    const r = bewertung(ds, a[0]); if (r == null || r < 4) { return; }
    const t = c.T.a[a[0]]; if (!t || !t[feld]) { return; }
    (r >= 5 ? stark : mittel).push({ id: a[0], r: r, pl: !!t.pl, text: fuelle(t[feld], c) });
  });
  const sort = function (x, y) { return y.r - x.r; };
  stark.sort(sort); mittel.sort(sort);
  return { stark: stark, mittel: mittel };
}
function deutung(c, ds) {
  const T = c.T.s, bloecke = [];
  // Abgleich der Quellen und Muster
  c.neuerAbsatz();
  const p1 = [];
  ['quellen', 'muster'].forEach(function (thId) {
    const th = DS_AUFBAU.deutung.themen.filter(function (t) { return t.id === thId; })[0];
    // Situationen mit Kurzform (m) werden zusammengefasst: "vor allem bei … und in …"
    const stark = [], mittel = [];
    th.aussagen.forEach(function (a) {
      const r = bewertung(ds, a[0]); if (r == null) { return; }
      const t = c.T.a[a[0]];
      if (t && t.m && r >= 5) { (r >= 6 ? stark : mittel).push(fuelle(t.m, c)); return; }
      const s = aussageSatz(c, a[0], r, false); if (s) { p1.push(s); }
    });
    if (stark.length) { p1.push(satz(fuelle(T.muster_stark, c, { liste: liste(stark, c) }), c)); }
    if (mittel.length) { p1.push(satz(fuelle(stark.length ? T.muster_mittel_nach : T.muster_mittel, c, { liste: liste(mittel, c) }), c)); }
  });
  if (p1.length) { bloecke.push(block(p1.join(' '))); }
  // Entwicklungsängste und Abwehr
  c.neuerAbsatz();
  const p2 = [], ang = gruppiert(c, ds, 'aengste', 'np'), abw = gruppiert(c, ds, 'abwehr', 'np');
  const txt = function (l) { return l.map(function (x) { return x.text; }); };
  if (ang.stark.length && ang.mittel.length) { p2.push(satz(fuelle(T.aengste_beide, c, { stark: liste(txt(ang.stark), c), mittel: liste(txt(ang.mittel), c) }), c)); }
  else if (ang.stark.length) { p2.push(satz(fuelle(T.aengste_stark, c, { liste: liste(txt(ang.stark), c) }), c)); }
  else if (ang.mittel.length) { p2.push(satz(fuelle(T.aengste_mittel, c, { liste: liste(txt(ang.mittel), c) }), c)); }
  ang.stark.slice(0, 2).forEach(function (x) { const e = c.T.a[x.id].e; if (e) { p2.push(satz(fuelle(e, c), c)); } });
  const angAlle = ang.stark.concat(ang.mittel);
  const vA = { stark: liste(txt(abw.stark), c), mittel: liste(txt(abw.mittel), c) };
  if (angAlle.length) {
    vA.zahl = angAlle.length > 1 ? 2 : 1;
    if (abw.stark.length && abw.mittel.length) { p2.push(satz(fuelle(T.abwehr_bezug_beide, c, vA), c)); }
    else if (abw.stark.length) { p2.push(satz(fuelle(T.abwehr_bezug_stark, c, vA), c)); }
    else if (abw.mittel.length) { p2.push(satz(fuelle(T.abwehr_bezug_mittel, c, vA), c)); }
  } else {
    if (abw.stark.length && abw.mittel.length) { vA.zahl = zahlVon(abw.stark); p2.push(satz(fuelle(T.abwehr_beide, c, vA), c)); }
    else if (abw.stark.length) { p2.push(satz(fuelle(T.abwehr_stark, c, { liste: vA.stark, zahl: zahlVon(abw.stark) }), c)); }
    else if (abw.mittel.length) { p2.push(satz(fuelle(T.abwehr_mittel, c, { liste: vA.mittel, zahl: zahlVon(abw.mittel) }), c)); }
  }
  if (frei(ds, 'abwehr')) { p2.push(frei(ds, 'abwehr')); }
  if (p2.length) { bloecke.push(block(p2.join(' '))); }
  // Erklärungsansätze
  c.neuerAbsatz();
  const p3 = [];
  const hyp = { stark: [], mittel: [] };
  DS_AUFBAU.deutung.themen.filter(function (t) { return t.id === 'hypothesen'; })[0].aussagen.forEach(function (a) {
    const r = bewertung(ds, a[0]); if (r == null || r < 4 || a[0] === 'i_hyp_trauma') { return; }
    (r >= 6 ? hyp.stark : hyp.mittel).push({ r: r, a: c.T.a[a[0]], pl: !!(c.T.a[a[0]] || {}).pl });
  });
  hyp.stark.sort(function (x, y) { return y.r - x.r; }); hyp.mittel.sort(function (x, y) { return y.r - x.r; });
  if (hyp.stark.length) {
    p3.push(satz(fuelle(T.hyp_stark, c, { liste: liste(hyp.stark.map(function (x) { return fuelle(x.a.g, c); }), c) }), c));
    if (hyp.mittel.length) { p3.push(satz(fuelle(T.hyp_mittel, c, { liste: liste(hyp.mittel.map(function (x) { return fuelle(x.a.n, c); }), c), zahl: zahlVon(hyp.mittel) }), c)); }
  } else if (hyp.mittel.length) {
    p3.push(satz(fuelle(T.hyp_nur_mittel, c, { liste: liste(hyp.mittel.map(function (x) { return fuelle(x.a.n, c); }), c), zahl: zahlVon(hyp.mittel) }), c));
  }
  if ((bewertung(ds, 'i_hyp_trauma') || 0) >= 4) { p3.push(satz(fuelle(T.hyp_trauma, c), c)); }
  if (p3.length) { bloecke.push(block(p3.join(' '))); }
  return bloecke.concat(freiBloecke(ds, 'deutung'));
}

// ---------- 5.1 Bedürfnisse und Ressourcen ----------
function beduerfnisse(c, ds) {
  const T = c.T.s, stark = [], mittel = [];
  DS_AUFBAU.beduerfnisse.themen[0].aussagen.forEach(function (a) {
    const r = bewertung(ds, a[0]); if (r == null || r < 4) { return; }
    (r >= 6 ? stark : mittel).push({ r: r, a: c.T.a[a[0]] });
  });
  const sort = function (x, y) { return y.r - x.r; };
  stark.sort(sort); mittel.sort(sort);
  c.neuerAbsatz();
  const s = [];
  if (stark.length) { s.push(satz(fuelle(T.beduerfnis_stark, c, { liste: liste(stark.map(function (x) { return fuelle(x.a.a, c); }), c) }), c)); }
  if (mittel.length) { s.push(satz(fuelle(stark.length ? T.beduerfnis_mittel : T.beduerfnis_nur_mittel, c, { liste: liste(mittel.map(function (x) { return fuelle(x.a.d, c); }), c) }), c)); }
  const res = chips(ds, 'ressourcen').map(function (k) { return fuelle(chipText(c, 'ressourcen', k), c); });
  const bloecke = [];
  if (s.length) { bloecke.push(block(s.join(' '))); }
  c.neuerAbsatz();
  if (res.length) { bloecke.push(block(satz(fuelle(T.ressourcen, c, { liste: liste(res, c) }), c))); }
  return bloecke.concat(freiBloecke(ds, 'beduerfnisse'));
}

// ---------- Datum ----------
const MONATE_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function datumText(iso, lang) {
  if (!iso) { return ''; }
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) { return String(iso); }
  if (lang === 'en') { return d.getDate() + ' ' + MONATE_EN[d.getMonth()] + ' ' + d.getFullYear(); }
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + (lang === 'en' ? '/' : '.') + p(d.getMonth() + 1) + (lang === 'en' ? '/' : '.') + d.getFullYear();
}

// ---------- Der ganze Bericht ----------
// profil: ELDiB-Auswertung (siehe dsEldibProfil); liefert { id: [Blöcke] }
function bericht(lang, ds, stamm, profil) {
  ds = ds || {};
  const c = kontext(lang, ds, stamm), F = c.T.fakten, T = c.T.s, f = ds.f || {};
  const h = { fuelle: fuelle, satz: satz, liste: liste, chips: chips, chipText: chipText, frei: frei, freiBloecke: freiBloecke, block: block, datum: datumText, gross: gross, klein: klein };
  const ab = {};
  ab.auftrag = F.auftrag(c, ds, stamm, h);
  ab.vorgeschichte = F.vorgeschichte(c, ds, stamm, h);
  ab.sozialbericht = F.sozialbericht(c, ds, stamm, h);
  ab.aktuell = F.aktuell(c, ds, stamm, h);
  ab.schule = sichtweise('schule', c, ds, { intro: 'schule_intro', datum: 'schule_datum', ohne: 'schule_ohne',
    chipsVorne: [['s_staerken', 'schule_staerken', 'liste']], chipsHinten: [['s_hilft', 'schule_hilft'], ['s_erwartung', 'schule_erwartung']] });
  ab.kind = sichtweise('kind', c, ds, { intro: 'kind_intro', introWennNicht: 'k_offen', introNurMitDatum: true, datum: 'kind_datum', ohne: 'kind_ohne',
    chipsHinten: [['k_interessen', 'kind_interessen'], ['k_wuensche', 'kind_wuensche']],
    extra: function (hinten) { if (frei(ds, 'vertrauensperson')) { hinten.push(satz(fuelle(T.kind_vertrauen, c, { text: frei(ds, 'vertrauensperson') }), c)); } } });
  ab.eltern = sichtweise('eltern', c, ds, { intro: 'eltern_intro', datum: 'eltern_datum', ohne: 'eltern_ohne',
    chipsVorne: [['e_staerken', 'eltern_staerken', 'liste']], chipsHinten: [['e_erwartung', 'eltern_erwartung']] });
  ab.verfahren = F.verfahren(c, ds, stamm, h);
  ab.beobachtung = F.beobachtungIntro(c, ds, stamm, h).concat(sichtweise('beobachtung', c, ds, { ohne: 'beob_ohne' }));
  if (ab.beobachtung.length > 1 && ab.beobachtung[0].typ === 'absatz' && ab.beobachtung[1].typ === 'absatz') {
    ab.beobachtung = [block(ab.beobachtung[0].text + ' ' + ab.beobachtung[1].text)].concat(ab.beobachtung.slice(2));
  }
  ab.eldib = F.eldib(c, ds, stamm, h, profil);
  ab.deutung = deutung(c, ds);
  ab.schluss = F.schluss(c, ds, stamm, h);
  ab.beduerfnisse = beduerfnisse(c, ds);
  ab.ziele = F.ziele(c, ds, stamm, h, profil);
  ab.empfehlungen = F.empfehlungen(c, ds, stamm, h);
  ab.cni = F.cni(c, ds, stamm, h);
  return ab;
}

// Ein einzelner Satz für die Vorschau beim Anklicken
function vorschauSatz(lang, ds, stamm, id, r) {
  const c = kontext(lang, ds, stamm);
  const a = c.T.a[id];
  if (!a) { return ''; }
  if (a.t) {
    const tpl = a.t[dsStufe(r)];
    if (!tpl) { return a.np ? fuelle(c.T.s.vorschau_ohne || '(„{liste}“ wird als nicht zutreffend erwähnt)', c, { liste: fuelle(a.np, c) }) : ''; }
    return satz(fuelle(tpl, c), c);
  }
  return '';
}

return { bericht: bericht, vorschauSatz: vorschauSatz, kontext: kontext, fuelle: fuelle, satz: satz, liste: liste, datum: datumText };
})();

// ==== ELDiB-Itembank (deutsch, aus 10/20/60) ====
var ELDIB_BANK = {"stufen":{"1":{"min":0,"max":2,"name":"Stufe I","beschreibung":"0-2 Jahre"},"2":{"min":2,"max":5,"name":"Stufe II","beschreibung":"2-5 Jahre"},"3":{"min":6,"max":9,"name":"Stufe III","beschreibung":"6-9 Jahre"},"4":{"min":10,"max":12,"name":"Stufe IV","beschreibung":"10-12 Jahre"},"5":{"min":12,"max":16,"name":"Stufe V","beschreibung":"12-16 Jahre"}},"bereiche":{"verhalten":{"name":"Verhalten","code":"V","stufen":{"1":{"name":"Stufe I: Mit Freude auf die Umwelt reagieren","ziel":"Den eigenen körperlichen Fähigkeiten vertrauen","items":[{"nr":1,"code":"V-1","keyword":"Wahrnehmung","description":"Lässt Wahrnehmung eines sensorischen Reizes erkennen.","zielformulierungen":["Ich schaue die/den Lehrer:in an, wenn sie/er mich berührt."]},{"nr":2,"code":"V-2","keyword":"Orientierung","description":"Reagiert auf sensorischen Reiz mit Zuwendung zur Reizquelle.","zielformulierungen":["Ich schaue mir Bilder an, die die/der Lehrer:in mir zeigt."]},{"nr":3,"code":"V-3","keyword":"Aufmerksamkeit","description":"Reagiert auf einen Reiz mit kurzzeitig anhaltender Aufmerksamkeit.","zielformulierungen":["Ich schaue auf das, was mir vorgezeigt wird.","Ich höre zu, wenn die/der Lehrer:in etwas sagt."]},{"nr":4,"code":"V-4","keyword":"motorische Reaktion","description":"Reagiert von sich aus auf einfache Umgebungsreize mit einer motorischen Handlung.","zielformulierungen":["Wenn die/der Lehrer:in mir die Hand reicht, nehme ich sie."]},{"nr":5,"code":"V-5","keyword":"komplexe Reaktion","description":"Reagiert auf komplexe Umgebungsreize und verbale Impulse mit motorischer Handlung.","zielformulierungen":["Ich baue einen Turm, wenn ich Bauklötze angeboten bekomme.","Ich werfe den Ball zurück, wenn die/der Lehrer:in ihn mir zuwirft."]},{"nr":6,"code":"V-6","keyword":"Selbsthilfe","description":"Beteiligt sich aktiv am Erlernen von Selbsthilfe-Fähigkeiten.","zielformulierungen":["Morgens hänge ich meine Jacke an den Haken.","Wenn es klingelt, ziehe ich meine Jacke an."]},{"nr":7,"code":"V-7","keyword":"Spielmaterial","description":"Reagiert eigenständig auf verschiedene Spielmaterialien.","zielformulierungen":["Ich räume die Bücher in das Regal, wenn die/der Lehrer:in das sagt.","Ich lege das Schulmaterial auf den richtigen Platz."]},{"nr":8,"code":"V-8","keyword":"Routineabläufe","description":"Zeigt Wiedererkennen von Routineabläufen.","zielformulierungen":["Wenn die/der Lehrer:in sagt, dass wir in die Pause gehen, räume ich mein Pult."]}]},"2":{"name":"Stufe II: Erfolgreich auf die Umwelt reagieren","ziel":"Erfolgreich an Routineabläufen und Aktivitäten teilnehmen","items":[{"nr":9,"code":"V-9","keyword":"Spielerfahrung","description":"Geht mit Spielmaterialien sachgerecht um.","zielformulierungen":["In der Pause benutze ich den Fußball auf dem Fußballfeld.","Nach der Spielzeit räume ich mein Spiel wieder ins Regal."]},{"nr":10,"code":"V-10","keyword":"warten","description":"Wartet ohne körperliche Steuerungshilfe durch den Erwachsenen.","zielformulierungen":["Ich warte, bis die/der Lehrer:in mich mit meinem Namen ruft.","Ich melde mich und warte, bis ich drankomme."]},{"nr":11,"code":"V-11","keyword":"sitzen","description":"Beteiligt sich verbal und physisch an Aktivitäten im Sitzen.","zielformulierungen":["Ich bleibe während der Matheaufgabe sitzen.","In Arbeitsphasen bleibe ich auf meinem Platz sitzen."]},{"nr":12,"code":"V-12","keyword":"Bewegung","description":"Beteiligt sich verbal und physisch an Bewegungsaktivitäten.","zielformulierungen":["Ich beteilige mich während des Sportunterrichts.","Ich mache bei der Bewegungspause mit."]},{"nr":13,"code":"V-13","keyword":"Aktivitäten","description":"Nimmt von sich aus verbal und physisch an Aktivitäten teil.","zielformulierungen":["Ich setze mich in den Morgenkreis, wenn der Tag beginnt.","Ich melde mich im Unterricht."]},{"nr":14,"code":"V-14","keyword":"Lob/Erfolg","description":"Akzeptiert Lob oder Erfolg ohne unangemessenes Verhalten.","zielformulierungen":["Ich nehme Lob von anderen an und behalte die Kontrolle.","Wenn ich gelobt werde, freue ich mich und verhalte mich vernünftig."]}]},"3":{"name":"Stufe III: Erwerben von Fähigkeiten zur erfolgreichen Teilnahme in Gruppen","ziel":"Erworbene Fähigkeiten anwenden, um innerhalb einer Gruppe das eigene Verhalten erfolgreich zu steuern","items":[{"nr":15,"code":"V-15","keyword":"beenden","description":"Beendet kurze, individuelle Aufgaben selbstständig.","zielformulierungen":["Wenn ich eine Aufgabe verstanden habe, löse ich sie alleine.","Eine angefangene Aufgabe bearbeite ich zu Ende."]},{"nr":16,"code":"V-16","keyword":"Erwartungen","description":"Lässt Bewusstsein für erwartete Verhaltensweisen erkennen.","zielformulierungen":["Ich sage, was unsere Klassenregeln und Ziele sind.","Ich kenne die Regeln, die dafür sorgen, dass alle sich wohl fühlen."]},{"nr":17,"code":"V-17","keyword":"Begründungen","description":"Nennt Gründe für Verhaltenserwartungen.","zielformulierungen":["Ich sage, warum ich mich freundlich und friedlich verhalten soll.","Ich erkläre, warum es unsere Klassenziele gibt."]},{"nr":18,"code":"V-18","keyword":"Alternativen","description":"Beschreibt alternative Verhaltensmöglichkeiten.","zielformulierungen":["Ich sage, wie ich mich anders und angemessen verhalten könnte.","Ich überlege, wie ich mich friedlicher verhalten kann."]},{"nr":19,"code":"V-19","keyword":"Gruppenwahl","description":"Reagiert angemessen auf Gruppenwahl.","zielformulierungen":["Ich akzeptiere die Entscheidung der Gruppe.","Wenn ich zum Anführer gewählt werde, übernehme ich die Verantwortung."]},{"nr":20,"code":"V-20","keyword":"zurückhalten","description":"Hält sich von inakzeptablem Verhalten zurück.","zielformulierungen":["Wenn andere Kinder sich streiten, bleibe ich ruhig.","Auch wenn andere sich falsch verhalten, bleibe ich bei meinem guten Verhalten."]},{"nr":21,"code":"V-21","keyword":"Kontrolle","description":"Behält während Gruppenaktivitäten Selbstkontrolle.","zielformulierungen":["Ich behalte die Kontrolle über mein Verhalten während Gruppenaktivitäten.","Bei Übergängen zwischen Aktivitäten bleibe ich ruhig."]}]},"4":{"name":"Stufe IV: Sich einbringen in Gruppenprozesse","ziel":"Persönliche Fähigkeiten einsetzen, um zum Gruppenerfolg beizutragen","items":[{"nr":22,"code":"V-22","keyword":"Fortschritt","description":"Zeigt Bewusstsein für eigenen Verhaltensfortschritt.","zielformulierungen":["Ich erkenne, wenn ich mich verbessert habe.","Ich kann beschreiben, was ich früher noch nicht konnte."]},{"nr":23,"code":"V-23","keyword":"Flexibilität","description":"Lässt Flexibilität erkennen bei Änderungen.","zielformulierungen":["Ich bleibe ruhig, wenn sich der Plan ändert.","Ich passe mich an, wenn etwas anders läuft als geplant."]},{"nr":24,"code":"V-24","keyword":"neue Erfahrungen","description":"Beteiligt sich kontrolliert an neuen Erfahrungen.","zielformulierungen":["Ich probiere neue Aktivitäten aus und bleibe dabei ruhig.","Bei neuen Erfahrungen verhalte ich mich kontrolliert."]},{"nr":25,"code":"V-25","keyword":"anwenden","description":"Wendet alternative Verhaltensweisen an.","zielformulierungen":["Ich wende die besprochenen alternativen Verhaltensweisen an.","In schwierigen Situationen nutze ich die gelernten Strategien."]},{"nr":26,"code":"V-26","keyword":"Provokation","description":"Reagiert auf Provokationen kontrolliert.","zielformulierungen":["Wenn mich jemand provoziert, bleibe ich ruhig.","Ich lasse mich nicht provozieren."]},{"nr":27,"code":"V-27","keyword":"Verantwortung","description":"Akzeptiert Verantwortung für eigenes Verhalten.","zielformulierungen":["Ich übernehme Verantwortung für mein Verhalten.","Ich akzeptiere die Konsequenzen meines Verhaltens."]},{"nr":28,"code":"V-28","keyword":"Lösungsvorschlag","description":"Reagiert mit konstruktiven Lösungsvorschlägen.","zielformulierungen":["Bei Problemen mache ich konstruktive Vorschläge.","Ich helfe mit, Konflikte zu lösen."]}]},"5":{"name":"Stufe V: Anwenden von individuellen und gruppenbezogenen Fähigkeiten in neuen Situationen","ziel":"Realen Lebenserfahrungen mit konstruktivem Verhalten begegnen","items":[{"nr":29,"code":"V-29","keyword":"Gewohnheiten","description":"Entwickelt neue persönliche Gewohnheiten.","zielformulierungen":["Ich entwickle Gewohnheiten, die mir im Berufsleben helfen werden."]},{"nr":30,"code":"V-30","keyword":"positive Rolle","description":"Sucht eine positive Rolle in der Gruppe.","zielformulierungen":["Ich suche mir eine positive Rolle in der Gruppe.","Ich trage positiv zur Gruppe bei."]},{"nr":31,"code":"V-31","keyword":"Recht/Ordnung","description":"Zeigt Verständnis für Rechts- und Ordnungsprinzipien.","zielformulierungen":["Ich verstehe und akzeptiere Regeln und Gesetze.","Ich halte mich an Regeln in der Schule und Öffentlichkeit."]},{"nr":32,"code":"V-32","keyword":"Selbstverantwortung","description":"Befürwortet Verfahren zur Selbstverantwortung.","zielformulierungen":["Ich unterstütze Regeln, die das Zusammenleben verbessern.","Ich übernehme Selbstverantwortung."]},{"nr":33,"code":"V-33","keyword":"Einsicht","description":"Löst Probleme durch Einsicht und Analyse.","zielformulierungen":["Ich löse meine Probleme, indem ich über sie nachdenke.","Ich analysiere Situationen und finde eigene Lösungen."]}]}}},"kommunikation":{"name":"Kommunikation","code":"K","stufen":{"1":{"name":"Stufe I: Mit Freude auf die Umwelt reagieren","ziel":"Gebraucht Wörter, um Bedürfnisse zu befriedigen","items":[{"nr":1,"code":"K-1","keyword":"Laute","description":"Produziert Laute.","zielformulierungen":["Ich produziere verschiedene Laute."]},{"nr":2,"code":"K-2","keyword":"Sprecher","description":"Richtet Aufmerksamkeit auf Sprechende.","zielformulierungen":["Ich schaue die Person an, die spricht."]},{"nr":3,"code":"K-3","keyword":"verbaler Impuls","description":"Reagiert auf verbalen Impuls.","zielformulierungen":["Wenn jemand etwas sagt, reagiere ich darauf."]},{"nr":4,"code":"K-4","keyword":"Wort-Annäherung","description":"Reagiert verbal auf Fragen.","zielformulierungen":["Wenn ich etwas gefragt werde, antworte ich."]},{"nr":5,"code":"K-5","keyword":"Wörter spontan","description":"Verwendet von sich aus Wörter.","zielformulierungen":["Wenn die/der Lehrer:in mir etwas zeigt, antworte ich."]},{"nr":6,"code":"K-6","keyword":"Wörter Erwachsener","description":"Produziert Wörter für Erwachsene.","zielformulierungen":["Ich spreche mit der/dem Lehrer:in, wenn ich etwas möchte."]},{"nr":7,"code":"K-7","keyword":"Wörter Peer","description":"Produziert Wörter für Gleichaltrige.","zielformulierungen":["Ich spreche mit dem anderen Kind, wenn ich etwas möchte."]},{"nr":8,"code":"K-8","keyword":"Wortreihung","description":"Produziert sinnvolle Wortsequenz.","zielformulierungen":["Wenn ich etwas sagen will, mache ich einen ganzen Satz."]}]},"2":{"name":"Stufe II: Erfolgreich auf die Umwelt reagieren","ziel":"Gebraucht Wörter, um andere in konstruktiver Weise zu beeinflussen","items":[{"nr":9,"code":"K-9","keyword":"beantworten","description":"Beantwortet Fragen sinnvoll.","zielformulierungen":["Ich antworte so, dass jeder meine Antwort verstehen kann."]},{"nr":10,"code":"K-10","keyword":"Vokabular","description":"Zeigt rezeptives Vokabular.","zielformulierungen":["Ich höre zu, damit ich neue Wörter lerne."]},{"nr":11,"code":"K-11","keyword":"Wortsequenzen","description":"Verwendet angemessene Wortsequenzen.","zielformulierungen":["Ich spreche freundlich, wenn ich etwas haben möchte."]},{"nr":12,"code":"K-12","keyword":"Austausch - Erwachsene","description":"Tauscht Informationen mit Erwachsenen.","zielformulierungen":["Wenn ich Hilfe benötige, spreche ich die/den Lehrer:in an."]},{"nr":13,"code":"K-13","keyword":"Merkmale","description":"Beschreibt Merkmale von sich und anderen.","zielformulierungen":["Ich sage, was ich gut kann und was andere gut können."]},{"nr":14,"code":"K-14","keyword":"Austausch - Kind","description":"Tauscht Informationen mit Kindern.","zielformulierungen":["Ich erzähle den Kindern aus meiner Klasse etwas."]}]},"3":{"name":"Stufe III: Erwerben von Fähigkeiten zur erfolgreichen Teilnahme in Gruppen","ziel":"Gebraucht Wörter, um sich auf konstruktive Weise innerhalb einer Gruppe zu äußern","items":[{"nr":15,"code":"K-15","keyword":"Persönliches","description":"Beschreibt eigene Erfahrungen.","zielformulierungen":["Ich erzähle von Dingen, die ich erlebt habe."]},{"nr":16,"code":"K-16","keyword":"Gefühlsreaktionen","description":"Zeigt angemessene Gefühlsreaktionen.","zielformulierungen":["Wenn ich wütend bin, sage ich was mich stört, ohne zu verletzen."]},{"nr":17,"code":"K-17","keyword":"Gespräche","description":"Beteiligt sich an Gruppengesprächen.","zielformulierungen":["Ich beteilige mich vernünftig an Klassengesprächen."]},{"nr":18,"code":"K-18","keyword":"Stolz - ich","description":"Zeigt Stolz auf eigene Arbeit.","zielformulierungen":["Ich bin stolz auf die Arbeit, die ich geleistet habe."]},{"nr":19,"code":"K-19","keyword":"Eigenschaften - ich","description":"Beschreibt eigene Eigenschaften.","zielformulierungen":["Ich beschreibe meine Stärken und Schwächen."]},{"nr":20,"code":"K-20","keyword":"Eigenschaften - du","description":"Beschreibt Eigenschaften anderer.","zielformulierungen":["Ich beschreibe andere, ohne sie zu verletzen."]},{"nr":21,"code":"K-21","keyword":"Gefühle - du","description":"Erkennt Gefühle anderer.","zielformulierungen":["Ich erkenne und beschreibe die Gefühle anderer."]},{"nr":22,"code":"K-22","keyword":"Stolz - wir","description":"Zeigt Stolz auf Gruppenleistungen.","zielformulierungen":["Ich zeige Stolz auf unsere Gruppenleistung."]}]},"4":{"name":"Stufe IV: Sich einbringen in Gruppenprozesse","ziel":"Verwendet Wörter, um Verständnis von Gefühlen und Verhaltensweisen von sich und anderen zu zeigen","items":[{"nr":23,"code":"K-23","keyword":"Kreativität","description":"Drückt Gefühle kreativ aus.","zielformulierungen":["Ich drücke meine Gefühle durch Kunst, Musik oder Tanz aus."]},{"nr":24,"code":"K-24","keyword":"Fortschritt","description":"Zeigt Bewusstsein für Fortschritt.","zielformulierungen":["Ich erkenne meinen eigenen Fortschritt."]},{"nr":25,"code":"K-25","keyword":"Beeinflussung","description":"Erklärt Verhaltensbeeinflussung.","zielformulierungen":["Ich erkläre, wie mein Verhalten andere beeinflusst."]},{"nr":26,"code":"K-26","keyword":"Gefühle - ich","description":"Drückt eigene Gefühle aus.","zielformulierungen":["Ich drücke meine Gefühle mit passenden Worten aus."]},{"nr":27,"code":"K-27","keyword":"Beziehung","description":"Knüpft positive Beziehungen.","zielformulierungen":["Ich spreche freundlich, um Beziehungen aufzubauen."]},{"nr":28,"code":"K-28","keyword":"unterstützen","description":"Lobt und unterstützt andere.","zielformulierungen":["Ich lobe andere, wenn sie etwas gut gemacht haben."]},{"nr":29,"code":"K-29","keyword":"Relationen","description":"Beschreibt Ursache-Wirkung.","zielformulierungen":["Ich beschreibe den Zusammenhang zwischen Gefühlen und Verhalten."]}]},"5":{"name":"Stufe V: Anwenden von individuellen und gruppenbezogenen Fähigkeiten in neuen Situationen","ziel":"Verwendet Wörter, um Beziehungen auszubauen und zu pflegen","items":[{"nr":30,"code":"K-30","keyword":"komplexe Aussagen","description":"Formuliert komplexe Aussagen.","zielformulierungen":["Ich drücke mich in komplexen Sätzen aus."]},{"nr":31,"code":"K-31","keyword":"Ausgleich","description":"Wählt versöhnliche Sprache.","zielformulierungen":["Bei Provokationen versuche ich zu schlichten."]},{"nr":32,"code":"K-32","keyword":"Anerkennung","description":"Anerkennt Beiträge anderer.","zielformulierungen":["Ich anerkenne die Beiträge anderer."]},{"nr":33,"code":"K-33","keyword":"Motive","description":"Beschreibt verschiedene Motive.","zielformulierungen":["Ich verstehe, dass Menschen verschiedene Motive haben."]},{"nr":34,"code":"K-34","keyword":"Ideale","description":"Beschreibt eigene Wertvorstellungen.","zielformulierungen":["Ich beschreibe, was mir wichtig ist im Leben."]},{"nr":35,"code":"K-35","keyword":"Erhalt/Pflege","description":"Pflegt positive Beziehungen.","zielformulierungen":["Ich pflege meine Beziehungen durch gute Kommunikation."]}]}}},"sozialisation":{"name":"Sozialisation","code":"SOZ","stufen":{"1":{"name":"Stufe I: Mit Freude auf die Umwelt reagieren","ziel":"Einem Erwachsenen genügend vertrauen, um auf ihn zu reagieren","items":[{"nr":1,"code":"SOZ-1","keyword":"Gegenwart","description":"Ist sich der Gegenwart anderer bewusst.","zielformulierungen":["Wenn die/der Lehrer:in mich berührt, drehe ich mich um."]},{"nr":2,"code":"SOZ-2","keyword":"Gerichtetheit","description":"Richtet Aufmerksamkeit auf andere.","zielformulierungen":["Wenn die/der Lehrer:in mir sagt, dass ich zuschauen soll, tue ich das."]},{"nr":3,"code":"SOZ-3","keyword":"Eigenname","description":"Reagiert auf eigenen Namen.","zielformulierungen":["Wenn die/der Lehrer:in mich mit Namen ruft, schaue ich hin."]},{"nr":4,"code":"SOZ-4","keyword":"Spiel - allein","description":"Spielt für sich allein.","zielformulierungen":["Ich spiele alleine, wenn es nötig ist."]},{"nr":5,"code":"SOZ-5","keyword":"nonverbale Interaktion","description":"Interagiert nonverbal.","zielformulierungen":["Wenn ich etwas möchte, zeige ich auf den Gegenstand."]},{"nr":6,"code":"SOZ-6","keyword":"kommen","description":"Kommt, wenn gerufen.","zielformulierungen":["Wenn die/der Lehrer:in mich ruft, gehe ich zu ihr/ihm."]},{"nr":7,"code":"SOZ-7","keyword":"Aufforderungen","description":"Versteht Aufforderungen.","zielformulierungen":["Wenn die/der Lehrer:in mich um etwas bittet, erledige ich es."]},{"nr":8,"code":"SOZ-8","keyword":"Wörter - Erwachsener","description":"Produziert Wörter für Erwachsene.","zielformulierungen":["Ich spreche mit der/dem Lehrer:in, wenn ich etwas möchte."]},{"nr":9,"code":"SOZ-9","keyword":"Selbst-Bewusstheit","description":"Zeigt Selbstbewusstheit.","zielformulierungen":["Ich erzähle von mir und gebrauche: ich, mein, mir."]},{"nr":10,"code":"SOZ-10","keyword":"Spiel - parallel","description":"Nimmt an parallelem Spiel teil.","zielformulierungen":["Ich spiele alleine neben anderen."]},{"nr":11,"code":"SOZ-11","keyword":"Wörter - Peer","description":"Produziert Wörter für Gleichaltrige.","zielformulierungen":["Ich spreche mit dem anderen Kind, wenn ich etwas möchte."]},{"nr":12,"code":"SOZ-12","keyword":"Kontaktsuche","description":"Sucht Kontakt mit Erwachsenen.","zielformulierungen":["Wenn der Unterricht beginnt, begrüße ich die/den Lehrer:in."]}]},"2":{"name":"Stufe II: Erfolgreich auf die Umwelt reagieren","ziel":"Sich erfolgreich an Aktivitäten beteiligen","items":[{"nr":13,"code":"SOZ-13","keyword":"Fantasie","description":"Beschäftigt sich mit Fantasiespielen.","zielformulierungen":["Ich denke mir selber etwas zum Spielen aus."]},{"nr":14,"code":"SOZ-14","keyword":"warten","description":"Wartet ohne Hilfe.","zielformulierungen":["Ich warte bis ich an der Reihe bin."]},{"nr":15,"code":"SOZ-15","keyword":"Kontakt","description":"Nimmt sozialen Kontakt auf.","zielformulierungen":["Ich gehe freundlich auf meine Mitschüler:innen zu."]},{"nr":16,"code":"SOZ-16","keyword":"teilen","description":"Teilt mit anderen.","zielformulierungen":["Ich teile mit anderen Kindern."]},{"nr":17,"code":"SOZ-17","keyword":"Spiel interaktiv","description":"Beteiligt sich an interaktivem Spiel.","zielformulierungen":["Ich spiele friedlich mit anderen Kindern zusammen."]},{"nr":18,"code":"SOZ-18","keyword":"Kooperation","description":"Kooperiert mit anderen Kindern.","zielformulierungen":["Bei Partnerarbeiten arbeite ich mit einem anderen Kind zusammen."]}]},"3":{"name":"Stufe III: Erwerben von Fähigkeiten zur erfolgreichen Teilnahme in Gruppen","ziel":"Gruppenaktivitäten als befriedigend erleben","items":[{"nr":19,"code":"SOZ-19","keyword":"abwechseln","description":"Teilt und wechselt sich ab.","zielformulierungen":["Ich teile und wechsele mich mit anderen Kindern ab."]},{"nr":20,"code":"SOZ-20","keyword":"nachahmen","description":"Ahmt gutes Verhalten nach.","zielformulierungen":["Wenn andere sich gut verhalten, mache ich es auch."]},{"nr":21,"code":"SOZ-21","keyword":"werten","description":"Bewertet soziale Situationen.","zielformulierungen":["Ich sage, ob ich etwas richtig oder falsch finde."]},{"nr":22,"code":"SOZ-22","keyword":"leiten","description":"Leitet Gruppenaktivitäten.","zielformulierungen":["Ich zeige oder erkläre anderen, wie etwas gemacht wird."]},{"nr":23,"code":"SOZ-23","keyword":"Vorschlag - andere","description":"Akzeptiert Vorschläge anderer.","zielformulierungen":["Ich akzeptiere Vorschläge meiner Mitschüler:innen."]},{"nr":24,"code":"SOZ-24","keyword":"Erfahrungen","description":"Beschreibt Erfahrungen.","zielformulierungen":["Ich erzähle in der richtigen Reihenfolge, was passiert ist."]},{"nr":25,"code":"SOZ-25","keyword":"Vorliebe","description":"Zeigt Vorliebe für bestimmte Kinder.","zielformulierungen":["Ich nehme Kontakt zu einem Kind auf, das ich besonders mag."]},{"nr":26,"code":"SOZ-26","keyword":"Unterstützung","description":"Sucht Hilfe bei anderen Kindern.","zielformulierungen":["Ich frage andere Kinder um Hilfe."]},{"nr":27,"code":"SOZ-27","keyword":"Gruppenregeln","description":"Hilft bei der Einhaltung von Regeln.","zielformulierungen":["Ich erinnere andere freundlich an die Gruppenregeln."]}]},"4":{"name":"Stufe IV: Sich einbringen in Gruppenprozesse","ziel":"Nimmt von sich aus und erfolgreich als Gruppenmitglied an Aktivitäten teil","items":[{"nr":28,"code":"SOZ-28","keyword":"identifizieren","description":"Identifiziert sich mit Vorbildern.","zielformulierungen":["Ich orientiere mich an positiven Vorbildern."]},{"nr":29,"code":"SOZ-29","keyword":"Gruppenerfahrung","description":"Beschreibt Gruppenerfahrungen.","zielformulierungen":["Ich erzähle von Gruppenerlebnissen."]},{"nr":30,"code":"SOZ-30","keyword":"Gruppenaktivität","description":"Schlägt Gruppenaktivitäten vor.","zielformulierungen":["Ich schlage der Gruppe Aktivitäten vor."]},{"nr":31,"code":"SOZ-31","keyword":"Verschiedenheit","description":"Erkennt Verschiedenheit.","zielformulierungen":["Ich erkenne Unterschiede zwischen meinem Verhalten und dem anderer."]},{"nr":32,"code":"SOZ-32","keyword":"Respekt","description":"Respektiert Meinungen anderer.","zielformulierungen":["Ich höre anderen zu und respektiere ihre Meinung."]},{"nr":33,"code":"SOZ-33","keyword":"Interesse","description":"Interessiert sich für Meinung anderer.","zielformulierungen":["Mich interessiert die Meinung anderer über mich."]},{"nr":34,"code":"SOZ-34","keyword":"Lösungsvorschlag","description":"Macht konstruktive Vorschläge.","zielformulierungen":["Bei Problemen mache ich konstruktive Vorschläge."]},{"nr":35,"code":"SOZ-35","keyword":"Wertvorstellung","description":"Erkennt verschiedene Werte.","zielformulierungen":["Ich unterscheide zwischen richtig und falsch."]},{"nr":36,"code":"SOZ-36","keyword":"Schlussfolgerungen","description":"Zieht Schlussfolgerungen.","zielformulierungen":["Ich lerne aus sozialen Situationen."]}]},"5":{"name":"Stufe V: Anwenden von individuellen und gruppenbezogenen Fähigkeiten in neuen Situationen","ziel":"Beginnt und pflegt selbständig dauerhafte und tragfähige Beziehungen mit anderen","items":[{"nr":37,"code":"SOZ-37","keyword":"Empathie","description":"Versteht Gefühle anderer.","zielformulierungen":["Ich verstehe, wie sich andere fühlen."]},{"nr":38,"code":"SOZ-38","keyword":"verschiedene Rollen","description":"Interagiert in verschiedenen Rollen.","zielformulierungen":["Ich kann verschiedene Rollen in einer Gruppe übernehmen."]},{"nr":39,"code":"SOZ-39","keyword":"Prinzipien","description":"Entscheidet nach eigenen Werten.","zielformulierungen":["Ich entscheide nach meinen eigenen Werten."]},{"nr":40,"code":"SOZ-40","keyword":"Selbstverständnis","description":"Zeigt realistisches Selbstverständnis.","zielformulierungen":["Ich kenne meine Stärken und Schwächen realistisch."]},{"nr":41,"code":"SOZ-41","keyword":"Interpersonalität","description":"Baut dauerhafte Beziehungen auf.","zielformulierungen":["Ich baue langfristige Freundschaften auf."]}]}}},"kognition":{"name":"Kognition","code":"KOG","stufen":{"1":{"name":"Stufe I: Mit Freude auf die Umwelt reagieren","ziel":"Auf die Umgebung reagieren mit gezielten Körperbewegungen und elementaren mentalen Verarbeitungsprozessen","items":[{"nr":1,"code":"KOG-1","keyword":"Orientierung","description":"Reagiert auf sensorischen Reiz.","zielformulierungen":["Ich wende mich Reizen zu, die mich interessieren."]},{"nr":2,"code":"KOG-2","keyword":"Aufmerksamkeit","description":"Zeigt kurze Aufmerksamkeit.","zielformulierungen":["Ich bleibe kurz aufmerksam bei einer Sache."]},{"nr":3,"code":"KOG-3","keyword":"Kurzzeitgedächtnis","description":"Erkennt Personen/Objekte wieder.","zielformulierungen":["Ich erkenne bekannte Personen und Dinge wieder."]},{"nr":4,"code":"KOG-4","keyword":"komplexe Reaktionen","description":"Reagiert auf komplexe Reize.","zielformulierungen":["Ich reagiere auf Anweisungen mit Handlungen."]},{"nr":5,"code":"KOG-5","keyword":"einfache Imitation","description":"Imitiert einfache Handlungen.","zielformulierungen":["Ich mache einfache Handlungen nach."]},{"nr":6,"code":"KOG-6","keyword":"Motorik 18 Monate","description":"Zeigt grundlegende Motorik.","zielformulierungen":["Ich zeige grundlegende motorische Fähigkeiten."]},{"nr":7,"code":"KOG-7","keyword":"Bezeichnung","description":"Versteht Objektbezeichnungen.","zielformulierungen":["Ich verstehe die Namen von bekannten Dingen."]},{"nr":8,"code":"KOG-8","keyword":"Wort-Annäherung","description":"Reagiert verbal auf Fragen.","zielformulierungen":["Ich antworte auf Fragen mit Worten."]},{"nr":9,"code":"KOG-9","keyword":"Wörter spontan","description":"Verwendet Wörter spontan.","zielformulierungen":["Ich benutze Wörter von mir aus."]},{"nr":10,"code":"KOG-10","keyword":"Form","description":"Erkennt Formen.","zielformulierungen":["Ich erkenne Formen und ordne sie zu."]},{"nr":11,"code":"KOG-11","keyword":"Körperteile","description":"Identifiziert Körperteile.","zielformulierungen":["Ich zeige und benenne meine Körperteile."]},{"nr":12,"code":"KOG-12","keyword":"Details","description":"Erkennt Details in Bildern.","zielformulierungen":["Ich erkenne Details in Bildern."]},{"nr":13,"code":"KOG-13","keyword":"sortieren","description":"Sortiert Objekte.","zielformulierungen":["Ich sortiere Dinge nach Merkmalen."]},{"nr":14,"code":"KOG-14","keyword":"Bilder benennen","description":"Benennt Bilder.","zielformulierungen":["Ich benenne Bilder mit den richtigen Wörtern."]}]},"2":{"name":"Stufe II: Erfolgreich auf die Umwelt reagieren","ziel":"Beteiligung an Aktivitäten, die Fähigkeiten der Selbsthilfe, motorischen Koordination, Sprache sowie mentale Prozesse erfordern","items":[{"nr":15,"code":"KOG-15","keyword":"Gebrauchswert","description":"Erkennt Gebrauchswert.","zielformulierungen":["Ich weiß, wofür man Dinge benutzt."]},{"nr":16,"code":"KOG-16","keyword":"Körper - 3","description":"Motorik eines 3-Jährigen.","zielformulierungen":["Ich bewege mich altersgemäß."]},{"nr":17,"code":"KOG-17","keyword":"Serie - identisch","description":"Ordnet identische Bilder zu.","zielformulierungen":["Ich finde gleiche Bilder."]},{"nr":18,"code":"KOG-18","keyword":"Feinmotorik - 3","description":"Feinmotorik eines 3-Jährigen.","zielformulierungen":["Ich kann feine Bewegungen machen."]},{"nr":19,"code":"KOG-19","keyword":"Serie - anders","description":"Erkennt Unterschiede.","zielformulierungen":["Ich finde das, was anders ist."]},{"nr":20,"code":"KOG-20","keyword":"Gegenteile","description":"Versteht Gegenteile.","zielformulierungen":["Ich kenne Gegenteile wie groß/klein."]},{"nr":21,"code":"KOG-21","keyword":"kategorisieren","description":"Kategorisiert Bilder.","zielformulierungen":["Ich ordne Dinge in Gruppen."]},{"nr":22,"code":"KOG-22","keyword":"zählen - 4","description":"Zählt bis 4.","zielformulierungen":["Ich zähle bis 4."]},{"nr":23,"code":"KOG-23","keyword":"Farben","description":"Identifiziert Farben/Formen.","zielformulierungen":["Ich kenne Farben und Formen."]},{"nr":24,"code":"KOG-24","keyword":"Alternation","description":"Wechselt zwischen Aufgaben.","zielformulierungen":["Ich kann zwischen Aufgaben wechseln."]},{"nr":25,"code":"KOG-25","keyword":"zählen - 10","description":"Zählt bis 10.","zielformulierungen":["Ich zähle bis 10."]},{"nr":26,"code":"KOG-26","keyword":"Auge-Hand-5","description":"Auge-Hand-Koordination 5 Jahre.","zielformulierungen":["Meine Augen und Hände arbeiten gut zusammen."]},{"nr":27,"code":"KOG-27","keyword":"unterscheiden","description":"Unterscheidet Ziffern/Buchstaben.","zielformulierungen":["Ich unterscheide Zahlen von Buchstaben."]},{"nr":28,"code":"KOG-28","keyword":"Körper - 5","description":"Motorik eines 5-Jährigen.","zielformulierungen":["Ich bewege mich wie ein 5-Jähriger."]},{"nr":29,"code":"KOG-29","keyword":"Objekte - 5","description":"Erkennt Mengen bis 5.","zielformulierungen":["Ich erkenne kleine Mengen auf einen Blick."]},{"nr":30,"code":"KOG-30","keyword":"Gedächtnis","description":"Gibt Auswendiggelerntes wieder.","zielformulierungen":["Ich kann Lieder und Reime auswendig."]},{"nr":31,"code":"KOG-31","keyword":"Bilderserie","description":"Ordnet Bilder in Reihenfolge.","zielformulierungen":["Ich bringe Bilder in die richtige Reihenfolge."]}]},"3":{"name":"Stufe III: Erwerben von Fähigkeiten zur erfolgreichen Teilnahme in Gruppen","ziel":"Beteiligt sich erfolgreich in einer Lerngruppe und setzt dabei grundlegende Lernkompetenzen ein","items":[{"nr":32,"code":"KOG-32","keyword":"Auge-Hand-6","description":"Auge-Hand-Koordination 6 Jahre.","zielformulierungen":["Ich kann präzise mit meinen Händen arbeiten."]},{"nr":33,"code":"KOG-33","keyword":"Körper - 6","description":"Motorik eines 6-Jährigen.","zielformulierungen":["Ich kann mich gut bewegen."]},{"nr":34,"code":"KOG-34","keyword":"lesen - 50","description":"Liest 50 Grundwörter.","zielformulierungen":["Ich lese einfache Wörter."]},{"nr":35,"code":"KOG-35","keyword":"Zahlen - 10","description":"Erkennt/schreibt Zahlen bis 10.","zielformulierungen":["Ich schreibe die Zahlen von 1 bis 10."]},{"nr":36,"code":"KOG-36","keyword":"schreiben - 50","description":"Schreibt 50 Grundwörter.","zielformulierungen":["Ich schreibe einfache Wörter."]},{"nr":37,"code":"KOG-37","keyword":"Verständnis","description":"Versteht Geschichten.","zielformulierungen":["Ich verstehe Geschichten, die ich höre."]},{"nr":38,"code":"KOG-38","keyword":"erklären","description":"Erklärt Verhalten anderer.","zielformulierungen":["Ich erkläre, warum jemand etwas tut."]},{"nr":39,"code":"KOG-39","keyword":"Sinnentnahme","description":"Versteht gelesene Sätze.","zielformulierungen":["Ich verstehe, was ich lese."]},{"nr":40,"code":"KOG-40","keyword":"Plus/Minus - 9","description":"Rechnet bis 9.","zielformulierungen":["Ich rechne Plus und Minus bis 9."]},{"nr":41,"code":"KOG-41","keyword":"Unlogik","description":"Erkennt Unstimmigkeiten.","zielformulierungen":["Ich erkenne, wenn etwas nicht stimmt."]},{"nr":42,"code":"KOG-42","keyword":"Antwortsätze","description":"Schreibt Antwortsätze.","zielformulierungen":["Ich schreibe Antworten in ganzen Sätzen."]},{"nr":43,"code":"KOG-43","keyword":"Sport - Spiele","description":"Zeigt motorische Kompetenz.","zielformulierungen":["Ich kann Sport- und Bewegungsspiele mitmachen."]},{"nr":44,"code":"KOG-44","keyword":"Sätze frei","description":"Formuliert eigene Sätze.","zielformulierungen":["Ich schreibe eigene Sätze."]},{"nr":45,"code":"KOG-45","keyword":"numerische Konzepte","description":"Rechnet mit Zeit und Geld.","zielformulierungen":["Ich rechne mit Zeit und Geld."]},{"nr":46,"code":"KOG-46","keyword":"Quantitativa","description":"Versteht Maßeinheiten.","zielformulierungen":["Ich verstehe Maßeinheiten."]},{"nr":47,"code":"KOG-47","keyword":"Sachverhalte","description":"Liest und erzählt Geschichten.","zielformulierungen":["Ich lese Geschichten und erzähle sie nach."]},{"nr":48,"code":"KOG-48","keyword":"Operationen","description":"Rechnet mit größeren Zahlen.","zielformulierungen":["Ich rechne mit größeren Zahlen."]}]},"4":{"name":"Stufe IV: Sich einbringen in Gruppenprozesse","ziel":"Gebraucht kognitive und schulische Fähigkeiten, um sich erfolgreich an sozialen Gruppenerfahrungen zu beteiligen","items":[{"nr":49,"code":"KOG-49","keyword":"Kommunikation","description":"Schreibt zum Mitteilen.","zielformulierungen":["Ich schreibe, um mich mitzuteilen."]},{"nr":50,"code":"KOG-50","keyword":"Mult./Divis. 100","description":"Rechnet Mal/Geteilt bis 100.","zielformulierungen":["Ich rechne Mal und Geteilt bis 100."]},{"nr":51,"code":"KOG-51","keyword":"Informationsgewinn","description":"Liest zum Lernen.","zielformulierungen":["Ich lese gerne, um Neues zu lernen."]},{"nr":52,"code":"KOG-52","keyword":"Geldmenge - 10€","description":"Rechnet mit Geld bis 10€.","zielformulierungen":["Ich rechne mit Geld bis 10 Euro."]},{"nr":53,"code":"KOG-53","keyword":"Fiktion","description":"Versteht fiktive Charaktere.","zielformulierungen":["Ich verstehe Figuren aus Geschichten."]},{"nr":54,"code":"KOG-54","keyword":"Grammatik","description":"Verwendet Grammatik korrekt.","zielformulierungen":["Ich schreibe grammatisch richtig."]},{"nr":55,"code":"KOG-55","keyword":"Wertvorstellungen","description":"Erkennt verschiedene Werte.","zielformulierungen":["Ich erkenne verschiedene Werte."]},{"nr":56,"code":"KOG-56","keyword":"Konzepte","description":"Löst logische Probleme.","zielformulierungen":["Ich löse Probleme mit Maßeinheiten."]}]},"5":{"name":"Stufe V: Anwenden von individuellen und gruppenbezogenen Fähigkeiten in neuen Situationen","ziel":"Setzt erfolgreich kognitive Fähigkeiten zur Bereicherung persönlicher Erfahrungen ein","items":[{"nr":57,"code":"KOG-57","keyword":"Zeitgeschichte","description":"Interessiert sich für aktuelle Themen.","zielformulierungen":["Ich interessiere mich für aktuelle Themen."]},{"nr":58,"code":"KOG-58","keyword":"Meinungen","description":"Unterscheidet Fakten/Meinungen.","zielformulierungen":["Ich unterscheide Fakten von Meinungen."]},{"nr":59,"code":"KOG-59","keyword":"Inkonsistenz","description":"Erkennt widersprüchliches Verhalten.","zielformulierungen":["Ich erkenne widersprüchliches Verhalten."]},{"nr":60,"code":"KOG-60","keyword":"Textaufgaben","description":"Löst schwierige Textaufgaben.","zielformulierungen":["Ich löse schwierige Textaufgaben."]},{"nr":61,"code":"KOG-61","keyword":"Einsicht","description":"Löst Probleme durch Analyse.","zielformulierungen":["Ich löse Probleme durch Nachdenken."]},{"nr":62,"code":"KOG-62","keyword":"Bürger/in","description":"Nutzt Wissen im Alltag.","zielformulierungen":["Ich nutze mein Wissen im Alltag."]}]}}}},"interventionen":{"V-1":["Blickkontakt beim Ansprechen herstellen","Sanfte Berührung zur Kontaktaufnahme","Visuelle Reize in Augenhöhe präsentieren"],"V-2":["Reize langsam und deutlich präsentieren","Aufmerksamkeit durch Geräusche lenken","Zeigen und Benennen kombinieren"],"V-3":["Kurze, klare Anweisungen geben","Interessante Materialien nutzen","Aufmerksamkeitsspanne schrittweise erhöhen"],"V-4":["Hand-über-Hand Führung anbieten","Einfache Handlungsaufforderungen geben","Erfolg unmittelbar loben"],"V-5":["Komplexere Spielangebote machen","Verbale Impulse mit Gesten unterstützen","Modellieren der erwarteten Handlung"],"V-6":["Routinen für Selbsthilfe etablieren","Visuelle Ablaufpläne nutzen","Teilschritte einzeln üben"],"V-7":["Materialien strukturiert anbieten","Ordnungssysteme einführen","Aufräumrituale etablieren"],"V-8":["Tagesstruktur visualisieren","Übergänge ankündigen","Rituale wiederholen und festigen"],"V-9":["Regeln für Materialnutzung erklären","Sachgerechten Umgang modellieren","Konsequent auf Regeleinhaltung achten"],"V-10":["Wartezeiten kurz halten und steigern","Wartespiele einführen","Erfolg beim Warten sofort loben"],"V-11":["Bewegungspausen einplanen","Sitzposition optimieren","Fidget-Tools erlauben"],"V-12":["Bewegungsangebote attraktiv gestalten","Mitmachen ohne Zwang ermöglichen","Schrittweise Beteiligung erhöhen"],"V-13":["Zur Teilnahme einladen","Einfache Beteiligungsmöglichkeiten schaffen","Initiative positiv verstärken"],"V-14":["Lob dosiert und authentisch geben","Auf Überreaktion vorbereiten","Erfolge angemessen feiern"],"V-15":["Aufgaben in Teilschritte gliedern","Zeitrahmen visualisieren","Fertigstellung konkret würdigen"],"V-16":["Regeln gemeinsam erarbeiten","Regeln visualisieren und aushängen","Regelmäßig an Regeln erinnern"],"V-17":["Regelverständnis durch Beispiele fördern","Konsequenzen erklären","Sinn von Regeln besprechen"],"V-18":["Handlungsalternativen gemeinsam sammeln","Rollenspiele nutzen","Wahlmöglichkeiten anbieten"],"V-19":["Gruppenentscheidungen üben","Akzeptanz von Mehrheitsentscheidungen thematisieren","Führungsrollen rotieren"],"V-20":["Selbstkontrolltechniken üben","Ablenkungsstrategien anbieten","Nicht-Reaktion positiv verstärken"],"V-21":["Übergänge strukturieren","Entspannungstechniken einführen","Selbstregulation unterstützen"],"V-22":["Fortschritte dokumentieren und zeigen","Vergleich mit früherem Verhalten","Reflexionsgespräche führen"],"V-23":["Änderungen im Ablauf frühzeitig ankündigen","Veränderungen visuell darstellen (Tagesplan, Symbole)","Flexibles Reagieren gezielt loben"],"V-24":["Neue Situationen vorbesprechen und vorbereiten","Neue Aktivitäten in kleinen Schritten einführen","Begleitung durch eine vertraute Bezugsperson anbieten"],"V-25":["Alternative Verhaltensweisen im Rollenspiel üben","An vereinbarte Strategien erinnern (Signal, Karte)","Gelungene Anwendung sofort rückmelden"],"V-26":["Strategien für Provokationen einüben (Stopp sagen, weggehen)","Provokationssituationen im Nachhinein besprechen","Ruhige Reaktionen positiv verstärken"],"V-27":["Eigenes Handeln und seine Folgen gemeinsam reflektieren","Wiedergutmachung vereinbaren","Übernahme von Verantwortung anerkennen"],"V-28":["Schritte der Konfliktlösung vermitteln","Lösungsvorschläge in Gruppengesprächen einfordern","Umsetzung eigener Vorschläge ermöglichen"],"V-29":["Arbeitsgewohnheiten (Pünktlichkeit, Ordnung) gezielt einüben","Bezug zur Berufswelt herstellen (Praktikum, Betriebsbesuch)","Fortschritte in einem Wochenplan festhalten"],"V-30":["Verantwortungsvolle Aufgaben in der Gruppe übertragen","Stärken des Kindes/Jugendlichen sichtbar machen","Positive Beiträge zur Gruppe anerkennen"],"V-31":["Regeln, Gesetze und ihren Sinn besprechen","Aktuelle Fälle aus dem Alltag diskutieren","An der Erstellung von Klassenregeln beteiligen"],"V-32":["Klassenrat oder Schülervertretung ermöglichen","Gemeinsame Regeln demokratisch vereinbaren","Mitverantwortung für Gruppenentscheidungen übertragen"],"V-33":["Selbstständige Problemlösung fördern","Beratende Rolle einnehmen","Transfer auf neue Situationen üben"],"K-1":["Laute des Kindes aufgreifen und nachahmen","Lautspiele und Lieder anbieten","Auf Lautäußerungen sofort reagieren"],"K-2":["Beim Sprechen Blickkontakt suchen","Kind vor dem Sprechen mit Namen ansprechen","Sprache mit Mimik und Gestik begleiten"],"K-3":["Kurze, klare Aufforderungen geben","Aufforderungen mit Gesten unterstützen","Richtige Reaktionen sofort bestätigen"],"K-4":["Einfache Fragen stellen und Zeit zum Antworten lassen","Wortannäherungen aufgreifen und korrekt wiederholen","Antwortversuche loben"],"K-5":["Anlässe schaffen, etwas zu benennen oder zu verlangen","Gegenstände und Handlungen im Alltag benennen","Spontane Wörter aufgreifen und erweitern"],"K-6":["Wünsche nach einem Wort(-versuch) erfüllen","Wortschatz für Alltagsbedürfnisse aufbauen","Sprachliche Äußerungen sofort beantworten"],"K-7":["Spielsituationen mit anderen Kindern gestalten","Ermutigen, sich direkt an andere Kinder zu wenden","Passende Wörter für die Kontaktaufnahme anbieten"],"K-8":["Äußerungen des Kindes um ein Wort erweitern","Einfache Satzmuster vormachen","Lieder und Reime mit Wiederholungen nutzen"],"K-9":["Offene und geschlossene Fragen stellen","Ausreichend Zeit zum Antworten lassen","Verständliche Antworten bestätigen und erweitern"],"K-10":["Wortschatz mit Bildern und Gegenständen erweitern","Neue Wörter in verschiedenen Situationen wiederholen","Vorlesen und Bilderbücher gemeinsam betrachten"],"K-11":["Höfliche Bitten und Fragen vormachen","Satzanfänge anbieten (\"Ich möchte …\")","Angemessene Äußerungen positiv verstärken"],"K-12":["Regelmäßige Gesprächszeiten mit Erwachsenen einplanen","Ermutigen, um Hilfe zu bitten","Interesse an Erzählungen zeigen"],"K-13":["Personen und Dinge gemeinsam beschreiben","Wortschatz für Eigenschaften aufbauen","Beschreibungsspiele nutzen (\"Ich sehe was, was du nicht siehst\")"],"K-14":["Partnergespräche mit klarer Aufgabe anbieten","Erzählrunden in Kleingruppen einführen","Gelungenen Austausch anerkennen"],"K-15":["Erzählkreise einplanen","Mit Fragen zum Erzählen anregen","Erlebnisse mit Bildern oder Fotos unterstützen"],"K-16":["Gefühle benennen und Gefühlswortschatz erweitern","Angemessenen Ausdruck von Gefühlen vormachen","Gefühlskarten oder Gefühlsbarometer nutzen"],"K-17":["Gesprächsregeln einführen und visualisieren","Redekarte oder Sprechstein nutzen","Konstruktive Beiträge hervorheben"],"K-18":["Gelungene Arbeiten gemeinsam anschauen und würdigen","Beschreiben lassen, was gelungen ist","Arbeiten ausstellen oder präsentieren lassen"],"K-19":["Stärken und Schwächen gemeinsam sammeln","Selbstbeschreibungen anfertigen (Steckbrief, Ich-Buch)","Realistische Rückmeldungen geben"],"K-20":["Wertschätzend über andere sprechen üben","Positive Eigenschaften anderer sammeln","Verletzende Beschreibungen besprechen und umformulieren"],"K-21":["Gefühle anhand von Mimik und Bildern erkennen","Situationen besprechen: Wie fühlt sich die andere Person?","Einfühlsame Äußerungen anerkennen"],"K-22":["Gruppenerfolge gemeinsam feiern","Gruppenergebnisse präsentieren","Beitrag jedes Einzelnen benennen"],"K-23":["Kreative Ausdrucksmöglichkeiten anbieten (Malen, Musik, Tanz, Theater)","Über Gefühle zu Bildern oder Musik sprechen","Kreative Arbeiten wertschätzen"],"K-24":["Fortschritte dokumentieren und zeigen","Vergleich mit früherem Verhalten","Reflexionsgespräche führen"],"K-25":["Ursache und Wirkung von Verhalten besprechen","Rollenspiele mit Perspektivwechsel","Rückmeldungen anderer einholen"],"K-26":["Ich-Botschaften einüben","Gefühle im Gruppengespräch benennen lassen","Angemessenen Gefühlsausdruck anerkennen"],"K-27":["Freundliche Kontaktaufnahme im Rollenspiel üben","Gesprächsanlässe mit Gleichaltrigen schaffen","Positive Kontaktversuche bestärken"],"K-28":["Loben und Ermutigen vormachen","Feedbackrunden mit positiven Rückmeldungen einführen","Hilfsbereitschaft anerkennen"],"K-29":["Zusammenhänge zwischen Gefühlen und Verhalten besprechen","Situationen aus Geschichten und Alltag analysieren","Wenn-dann-Sätze formulieren lassen"],"K-30":["Diskussionen zu anspruchsvollen Themen anbieten","Redewendungen und bildhafte Sprache besprechen","Begründen und Argumentieren üben"],"K-31":["Deeskalierende Formulierungen einüben","Streitschlichtung im Rollenspiel üben","Versöhnliche Reaktionen anerkennen"],"K-32":["Beiträge anderer aufgreifen lassen (\"Ich finde die Idee von … gut, weil …\")","Teamarbeit mit gemeinsamem Ergebnis gestalten","Wertschätzende Rückmeldungen vormachen"],"K-33":["Motive von Personen in Geschichten und Nachrichten besprechen","Verschiedene Sichtweisen sammeln","Perspektivwechsel üben"],"K-34":["Gespräche über Werte und Überzeugungen führen","Eigene Standpunkte begründen lassen","Diskussionen zu Wertefragen moderieren"],"K-35":["Kommunikation in Beziehungen reflektieren","Umgang mit Konflikten in Freundschaften besprechen","Kontakte zu Freund:innen und in Gruppen unterstützen"],"SOZ-1":["Präsenz des Erwachsenen zeigen","Nähe anbieten","Sicherheit vermitteln"],"SOZ-2":["Aufmerksamkeit auf andere lenken (\"Schau, was … macht\")","Gemeinsames Beobachten anregen","Kurze Interaktionsspiele anbieten"],"SOZ-3":["Kind häufig mit Namen ansprechen","Namenslieder und -spiele nutzen","Reaktion auf den Namen sofort bestätigen"],"SOZ-4":["Einfaches, strukturiertes Spielmaterial anbieten","Zeiten für das Spielen allein ermöglichen","Konzentriertes Spielen anerkennen"],"SOZ-5":["Zeigen und Gesten als Kommunikation aufgreifen","Bildkarten oder Gebärden anbieten","Auf nonverbale Signale verlässlich reagieren"],"SOZ-6":["Kind mit Namen und Geste zu sich rufen","Kommen mit einer angenehmen Erfahrung verbinden","Kommen sofort loben"],"SOZ-7":["Einfache, direkte Aufforderungen geben","Aufforderungen mit Gesten oder Bildern unterstützen","Befolgen sofort anerkennen"],"SOZ-8":["Wünsche nach einem Wort(-versuch) erfüllen","Wortschatz für Alltagsbedürfnisse aufbauen","Sprachliche Äußerungen sofort beantworten"],"SOZ-9":["Spiegelspiele und Fotos des Kindes nutzen","\"Ich\", \"mein\", \"mir\" vormachen","Über das Kind und seine Vorlieben sprechen"],"SOZ-10":["Gleiches Spielmaterial nebeneinander anbieten","Spielplätze nah beieinander einrichten","Parallelspiel begleiten und benennen"],"SOZ-11":["Spielsituationen mit anderen Kindern gestalten","Ermutigen, sich direkt an andere Kinder zu wenden","Passende Wörter für die Kontaktaufnahme anbieten"],"SOZ-12":["Verlässliche Bezugsperson anbieten","Begrüßungs- und Abschiedsrituale pflegen","Kontaktsuche freundlich beantworten"],"SOZ-13":["Rollenspielmaterial bereitstellen (Verkleidung, Kaufladen)","Fantasiespiele anregen und mitspielen","Ideen des Kindes aufgreifen"],"SOZ-14":["Wartezeiten kurz halten und steigern","Wartespiele einführen","Erfolg beim Warten sofort loben"],"SOZ-15":["Kontaktaufnahme im Rollenspiel üben","Partnerspiele anbieten","Angemessene Kontaktversuche bestärken"],"SOZ-16":["Aktivitäten mit gemeinsamem Material planen","Teilen vormachen und benennen","Gelungenes Teilen loben"],"SOZ-17":["Einfache Regelspiele zu zweit anbieten","Spiel begleiten und bei Bedarf vermitteln","Gemeinsames Spielen positiv rückmelden"],"SOZ-18":["Partnerarbeit mit klar verteilten Aufgaben","Kooperationsspiele einsetzen","Zusammenarbeit anerkennen"],"SOZ-19":["Reihenfolgen und Wartesymbole nutzen","Spiele mit Abwechseln einsetzen","Teilen und Abwechseln ohne Erinnerung anerkennen"],"SOZ-20":["Positives Verhalten anderer Kinder hervorheben","Vorbilder in der Gruppe nutzen","Gelungene Nachahmung loben"],"SOZ-21":["Soziale Situationen gemeinsam bewerten (richtig/falsch, fair/unfair)","Geschichten mit Wertfragen nutzen","Nach Begründungen fragen"],"SOZ-22":["Eine Aktivität anleiten oder vorzeigen lassen","Expertenrolle für eine Fähigkeit geben","Leitungsaufgaben vorbereiten und begleiten"],"SOZ-23":["Vorschläge anderer Kinder aufgreifen und ausprobieren","Mitmachen bei fremden Ideen üben","Flexibles Mitmachen anerkennen"],"SOZ-24":["Erlebnisse mit Bildern in eine Reihenfolge bringen","Zeitwörter nutzen (zuerst, dann, danach)","Erzählen mit Nachfragen unterstützen"],"SOZ-25":["Kontakt zu bevorzugten Kindern ermöglichen","Gemeinsame Aktivitäten mit Freund:innen einplanen","Freundschaftsverhalten besprechen"],"SOZ-26":["Ermutigen, andere Kinder um Hilfe zu fragen","Helfersysteme in der Klasse einführen","Gegenseitiges Loben anregen"],"SOZ-27":["Gruppenregeln gemeinsam erarbeiten und visualisieren","Freundliches Erinnern an Regeln üben","Aufgaben wie \"Regelwächter:in\" vergeben"],"SOZ-28":["Über Vorbilder und ihre Eigenschaften sprechen","Biografien und Geschichten nutzen","Eigene Ziele mit Vorbildern verbinden"],"SOZ-29":["Gruppenerlebnisse gemeinsam reflektieren","Erlebnisse in der richtigen Reihenfolge erzählen lassen","Ein Gruppentagebuch führen"],"SOZ-30":["Gelegenheiten für Vorschläge schaffen (Klassenrat)","Über Aktivitäten abstimmen lassen","Umsetzung von Vorschlägen ermöglichen"],"SOZ-31":["Unterschiede im Verhalten wertfrei besprechen","Eigenes Verhalten mit dem anderer vergleichen lassen","Rückmeldungen in der Gruppe einholen"],"SOZ-32":["Regeln für respektvolles Zuhören einführen","Meinungsrunden durchführen","Respektvolle Reaktionen anerkennen"],"SOZ-33":["Rückmeldungen von Mitschüler:innen strukturiert einholen","Über Rückmeldungen sprechen","Umgang mit Kritik üben"],"SOZ-34":["Problemlösegespräche in der Gruppe führen","Lösungsvorschläge sammeln und bewerten","Konstruktive Vorschläge anerkennen"],"SOZ-35":["Wertekonflikte in Geschichten und Alltag besprechen","Gegensätzliche Werte benennen und vergleichen","Eigene Position begründen lassen"],"SOZ-36":["Soziale Situationen gemeinsam analysieren","Fragen: \"Was lernen wir daraus?\"","Übertragung auf eigene Situationen anregen"],"SOZ-37":["Gefühle und Sichtweisen anderer besprechen","Perspektivwechsel im Rollenspiel üben","Einfühlsames Verhalten anerkennen"],"SOZ-38":["Verschiedene Rollen in der Gruppe übernehmen lassen","Rollenwechsel in Projekten planen","Erfahrungen in den Rollen reflektieren"],"SOZ-39":["Entscheidungssituationen besprechen","Eigene Werte klären und benennen","Entscheidungen begründen lassen"],"SOZ-40":["Stärken und Schwächen realistisch einschätzen lassen","Persönliche Ziele formulieren","Selbst- und Fremdeinschätzung vergleichen"],"SOZ-41":["Pflege von Beziehungen besprechen (Verlässlichkeit, Vertrauen)","Umgang mit Konflikten in Freundschaften klären","Kontakte in Gruppen und Vereinen unterstützen"],"KOG-1":["Reize langsam und deutlich präsentieren","Aufmerksamkeit durch Geräusche lenken","Zeigen und Benennen kombinieren"],"KOG-2":["Kurze, klare Anweisungen geben","Interessante Materialien nutzen","Aufmerksamkeitsspanne schrittweise erhöhen"],"KOG-3":["Vertraute Personen und Gegenstände benennen","Versteck- und Wiederfinde-Spiele nutzen","Wiedererkennen freudig bestätigen"],"KOG-4":["Komplexere Spielangebote machen","Verbale Impulse mit Gesten unterstützen","Modellieren der erwarteten Handlung"],"KOG-5":["Einfache Handlungen langsam vormachen","Nachahmungsspiele anbieten (Klatschen, Winken)","Gelungene Nachahmung loben"],"KOG-6":["Greif-, Steck- und Stapelmaterial anbieten","Bewegungsanlässe schaffen (Krabbeln, Klettern, Laufen)","Motorische Fortschritte beobachten und festhalten"],"KOG-7":["Gegenstände im Alltag benennen","Spiele mit \"Gib mir …\" und \"Zeig mir …\"","Richtige Auswahl bestätigen"],"KOG-8":["Einfache Fragen stellen und Zeit zum Antworten lassen","Wortannäherungen aufgreifen und korrekt wiederholen","Antwortversuche loben"],"KOG-9":["Anlässe schaffen, etwas zu benennen oder zu verlangen","Gegenstände und Handlungen im Alltag benennen","Spontane Wörter aufgreifen und erweitern"],"KOG-10":["Formensortierer und Steckpuzzles anbieten","Formen ertasten und benennen","Schwierigkeit schrittweise steigern"],"KOG-11":["Lieder und Spiele zu Körperteilen nutzen","Körperteile am Kind und an der Puppe zeigen","Zeigen und Benennen abwechseln"],"KOG-12":["Bilderbücher gemeinsam betrachten","Nach Details fragen (\"Wo ist …?\")","Suchbilder anbieten"],"KOG-13":["Sortierspiele mit zwei Kategorien","Unterschiede gemeinsam benennen","Materialien schrittweise ähnlicher wählen"],"KOG-14":["Bildkarten zum Benennen nutzen","Bilderbücher mit Alltagsdingen betrachten","Benennungen bestätigen und erweitern"],"KOG-15":["Alltagsgegenstände im Rollenspiel nutzen","Fragen: \"Wozu braucht man …?\"","Gebrauch von Gegenständen vormachen"],"KOG-16":["Grobmotorische Übungen anbieten (Hüpfen, Balancieren)","Bewegungsparcours aufbauen","Fortschritte in der Bewegung würdigen"],"KOG-17":["Memory und Zuordnungsspiele mit gleichen Bildern","Gleiche Bilder suchen lassen","Aufgaben schrittweise erweitern"],"KOG-18":["Fädeln, Kneten und Malen anbieten","Stifthaltung anbahnen","Feinmotorische Spiele regelmäßig einsetzen"],"KOG-19":["Spiele \"Was passt nicht?\" anbieten","Unterschiede benennen lassen","Schwierigkeit schrittweise steigern"],"KOG-20":["Gegenteile mit Gegenständen und Bewegungen erleben (groß/klein)","Bilderpaare zu Gegenteilen zuordnen","Gegenteile im Alltag benennen"],"KOG-21":["Bilder nach Oberbegriffen sortieren (Tiere, Fahrzeuge)","Gemeinsamkeiten benennen","Eigene Sortierregeln finden lassen"],"KOG-22":["Zählen mit Zeigen üben (eins-zu-eins)","Zählanlässe im Alltag nutzen","Mengen bis 4 legen lassen"],"KOG-23":["Farben und Formen im Alltag benennen","Sortier- und Zuordnungsspiele","Zeigen und Benennen abwechselnd üben"],"KOG-24":["Abwechselnd \"gleich\" und \"anders\" suchen lassen","Klare Signale für den Wechsel geben","Richtiges Wechseln loben"],"KOG-25":["Zählreime und -lieder nutzen","Zählen mit Zeigen bis 10 üben","Mengen im Alltag abzählen lassen"],"KOG-26":["Ausschneiden, Nachspuren und Malen üben","Ball- und Wurfspiele anbieten","Übungen schrittweise erschweren"],"KOG-27":["Ziffern, Zeichen und Buchstaben sortieren lassen","Buchstaben- und Zahlenmaterial ertasten","Unterschiede benennen"],"KOG-28":["Bewegungsspiele mit Hüpfen, Balancieren und Fangen","Bewegungsparcours aufbauen","Koordination regelmäßig üben"],"KOG-29":["Würfelbilder und Punktkarten nutzen","Kleine Mengen kurz zeigen und benennen lassen","Mengen strukturiert darstellen"],"KOG-30":["Lieder, Reime und Verse wiederholen","Auswendiglernen spielerisch üben","Gelerntes vortragen lassen"],"KOG-31":["Bildergeschichten in die richtige Reihenfolge bringen","Zeitwörter nutzen (zuerst, dann, zuletzt)","Geschichten dazu erzählen lassen"],"KOG-32":["Schreib- und Schneideübungen anbieten","Konstruktionsspiele einsetzen","Genauigkeit rückmelden"],"KOG-33":["Sport- und Bewegungsspiele anbieten","Gleichgewicht und Koordination üben","Fortschritte sichtbar machen"],"KOG-34":["Grundwortschatz mit Wortkarten üben","Wörter in kurzen Texten wiederfinden","Leseerfolge festhalten"],"KOG-35":["Ziffern mit Mengen verbinden","Ziffern schreiben üben","Zahlenspiele einsetzen"],"KOG-36":["Grundwortschatz regelmäßig schreiben üben","Kurze Diktate einsetzen","Wörter nach Rechtschreibmustern ordnen"],"KOG-37":["Geschichten vorlesen und Fragen dazu stellen","Handlung mit Bildern nacherzählen lassen","Reihenfolge der Ereignisse besprechen"],"KOG-38":["Verhalten von Figuren in Geschichten besprechen","Warum-Fragen stellen","Ursache und Wirkung gemeinsam benennen"],"KOG-39":["Kurze Sätze lesen und dazu malen oder handeln","Fragen zum Gelesenen stellen","Lesestrategien vermitteln"],"KOG-40":["Mit Anschauungsmaterial rechnen","Zerlegungen der Zahlen bis 9 üben","Rechenspiele einsetzen"],"KOG-41":["Unsinnsbilder und -geschichten besprechen","Fragen: \"Was stimmt hier nicht?\"","Begründungen einfordern"],"KOG-42":["Fragen zu Geschichten schriftlich beantworten lassen","Satzanfänge vorgeben","Antworten gemeinsam überprüfen"],"KOG-43":["Regelspiele im Sport anbieten","Grundfertigkeiten üben (Werfen, Fangen, Laufen)","Teilnahme und Fortschritte würdigen"],"KOG-44":["Schreibanlässe schaffen (Bilder, Erlebnisse)","Satzmuster anbieten","Eigene Texte würdigen"],"KOG-45":["Mit Uhr und Spielgeld rechnen","Alltagssituationen nachspielen (Einkaufen)","Sachaufgaben mit Zeit und Geld lösen"],"KOG-46":["Im Alltag messen und wiegen","Maßeinheiten anschaulich einführen","Größen schätzen und vergleichen"],"KOG-47":["Texte lesen und nacherzählen lassen","Fragen zu Hauptfigur und Handlung stellen","Ein Lesetagebuch führen"],"KOG-48":["Stellenwerte mit Material darstellen","Schriftliche Rechenverfahren üben","Einmaleins festigen"],"KOG-49":["Briefe, Nachrichten oder Berichte schreiben lassen","Zum Schreiben über Gefühle und Erlebnisse anregen","Texte gemeinsam überarbeiten"],"KOG-50":["Einmaleins mit Material und Spielen üben","Umkehraufgaben nutzen","Kurz und täglich üben (Automatisierung)"],"KOG-51":["Lesestoff nach Interessen anbieten","Sachtexte zu eigenen Fragen suchen lassen","Die Bibliothek besuchen"],"KOG-52":["Mit Spielgeld rechnen","Einkaufssituationen nachspielen","Wechselgeld berechnen lassen"],"KOG-53":["Figuren aus Büchern und Filmen besprechen","Motive von Figuren herausarbeiten","Eigene Meinung zu Figuren begründen"],"KOG-54":["Grammatikregeln an eigenen Texten anwenden","Texte überarbeiten (Schreibkonferenz)","Regelkarten nutzen"],"KOG-55":["Wertekonflikte in Geschichten und Alltag besprechen","Gegensätzliche Werte benennen und vergleichen","Eigene Position begründen lassen"],"KOG-56":["Logikaufgaben und Knobeleien anbieten","Lösungswege besprechen","Maßeinheiten in Sachaufgaben anwenden"],"KOG-57":["Aktuelle Themen und Nachrichten besprechen","Meinungen anderer erfragen lassen","Diskussionsrunden durchführen"],"KOG-58":["Fakten und Meinungen in Texten markieren","Quellen prüfen","Eigene Einschätzung begründen"],"KOG-59":["Widersprüchliches Verhalten in Geschichten und Alltag besprechen","Erklärungen suchen lassen","Perspektiven vergleichen"],"KOG-60":["Lösungsstrategien für Textaufgaben vermitteln","Aufgaben mit Brüchen und Dezimalzahlen aus dem Alltag","Lösungswege erklären lassen"],"KOG-61":["Selbstständige Problemlösung fördern","Beratende Rolle einnehmen","Transfer auf neue Situationen üben"],"KOG-62":["Gelerntes auf Alltagssituationen übertragen (Budget, Formulare)","Projekte mit Bezug zur Gemeinde durchführen","Selbstständiges Anwenden fördern"]},"fallback":{"verhalten":["Verhaltensregeln visualisieren","Positive Verstärkung einsetzen","Strukturierte Lernumgebung schaffen","Klare Erwartungen kommunizieren"],"kommunikation":["Sprachvorbild sein","Aktives Zuhören modellieren","Kommunikationsanlässe schaffen","Wortschatz im Kontext erweitern"],"sozialisation":["Soziale Situationen besprechen","Rollenspiele durchführen","Kooperative Aktivitäten anbieten","Empathie fördern"],"kognition":["Lernstrategien vermitteln","Scaffolding anbieten","Handlungsorientiert arbeiten","Differenzierte Materialien bereitstellen"]},"beispiele":{"V-1":["Reagiert auf Berührung der Wange","Dreht sich bei Geräuschen","Folgt bewegenden Objekten mit den Augen"],"V-2":["Wendet Blick/Körper zu Seifenblasen","Dreht Kopf zur Musik","Lächelt wenn Hand ins Wasser getaucht wird"],"V-3":["Beobachtet Seifenblasen weiter und greift danach","Schaut Erwachsenen beim Gitarrespielen zu","Spritzt weiter im Wasser"],"V-4":["Sieht Bauklotz, hebt ihn hoch und wirft ihn","Kommt zur Musikquelle gelaufen","Streckt Hand aus um Gesicht zu berühren"],"V-5":["Spritzt im Wasser nach Aufforderung","Schiebt Boot durchs Wasser nach Vormachen","Fährt Spielzeugauto auf verbalen Hinweis"],"V-6":["Zeigt Toilettenbedarf an","Versucht Wasserhahn aufzudrehen","Zieht Hose hoch, versucht Reißverschluss"],"V-7":["Hebt Puppe hoch, streichelt Haare","Zieht Auto über Boden, untersucht Räder","Legt Spielzeug in Kiste auf Aufforderung"],"V-8":["Geht zur Spielecke wenn 'Jetzt spielen wir' gesagt wird","Holt Mantel wenn Spaziergang angekündigt wird"],"V-9":["Fährt Spielzeugauto zur Tankstelle, tut als ob tanken","Füttert und zieht Puppe an"],"V-10":["Wartet bis an der Reihe beim Turnen","Wartet auf Plätzchen bis anderes Kind seins bekommen hat"],"V-11":["Kehrt in Erzählkreis zurück nach interessantem Hinweis","Führt Arbeit fort nach Ermutigung sitzen zu bleiben"],"V-12":["Hört auf zu streiten, holt alternatives Spielzeug","Folgt Klatsch-Rhythmus in der Gruppe"],"V-13":["Nimmt Arbeitsblatt ohne Aufforderung","Beschäftigt sich mit Spielzeug, antwortet auf Fragen dazu"],"V-14":["Akzeptiert Schulterklopfen ohne Zurückzucken","Lächelt zurück wenn für Geschichte gelobt"],"V-15":["Räumt Platz nach Frühstück ohne Aufforderung","Arbeitet im vertrauten Übungsheft ohne Hilfe"],"V-16":["Sagt: 'Im Schwimmbad lassen sie uns nicht rein wenn wir prügeln'","Kennt Schulbus-Regeln und Pausenregeln"],"V-17":["Erklärt: 'Nach Dunkelwerden kann einem was passieren'","Begründet: 'Sonst können wir am Tisch nicht arbeiten'"],"V-18":["Sagt: 'Ich könnte aufzeigen anstatt zu rufen'","Erkennt alternative Verhaltensweisen"],"V-19":["Erfüllt Kapitänsrolle verantwortungsbewusst","Macht auch als Teilnehmer mit"],"V-20":["Stimmt nicht ein wenn andere Schimpfwörter rufen","Bleibt auf Platz während andere herumlaufen"],"V-21":["Behält Selbstkontrolle während Gruppenaktivitäten","Kontrolliert sich bei Übergängen"],"V-22":["Sagt: 'Als du dran warst, hab ich keinen Ton gesagt'","Erinnert sich an eigene Verbesserungen"],"V-23":["Akzeptiert geänderten Ablauf ohne Ärger","Wartet ruhig wenn Reihenfolge geändert wird"],"V-24":["Nimmt an Ausflug teil trotz Angst","Probiert neue Aktivität aus"],"V-25":["Sagt Provokateur er solle aufhören, entzieht sich","Schlägt Alternative vor wenn Plan ausfällt"],"V-26":["Behält Selbstkontrolle trotz Schimpfwörtern","Reagiert besonnen auf Provokationen"],"V-27":["Setzt sich freiwillig um Versuchung zu vermeiden","Ersetzt beschädigtes Buch eines Mitschülers"],"V-28":["Schlägt Abwechseln beim Abwaschen vor","Bietet konstruktive Alternative an"],"V-29":["Überlegt ob er früh aufstehen könnte für Job","Übernimmt Verantwortung für Materialien"],"V-30":["Sieht sich als Helfer bei Problemlösungen","Sichert sich Leiterrolle auf positive Art"],"V-31":["Kommentiert: 'Radkappen klauen bringt nur Probleme'","Hilft Regelkatalog zu formulieren"],"V-32":["Stellt sich zur Wahl der Schülervertretung","Akzeptiert Mehrheitsbeschluss"],"V-33":["Analysiert Situation bei Gruppenausschluss","Diskutiert Problem, plant neue Wege"],"K-1":["Sagt 'eee', 'nnn' oder 'mmm'","Sagt 'baba', 'da da' Silbenreihen"],"K-2":["Dreht Körper/Blick zu grüßendem Erwachsenen","Schaut Mutter an wenn sie spricht"],"K-3":["Zeigt Verständnis von 'Ball' durch Anschauen","Winkt bei 'Wiedersehen'"],"K-4":["Antwortet annähernd mit Namen eines Kindes","Antwortet mit Wortannäherung auf Objekt"],"K-5":["Sagt 'Mi..Mi' bei Milch","Sagt 'Auch' wenn es mitmachen will"],"K-6":["Sagt 'Milch' wenn Milch hingestellt wird","Sagt 'Bauen' mit Bauklötzen"],"K-7":["Sagt 'Auto' zu Kind das Lieblingsauto hat","Sagt 'Geh weg' zum anderen Kind"],"K-8":["Sagt 'Gib mir das Auto'","Singt Zeilen aus einfachem Lied"],"K-9":["Antwortet 'Das ist mein Laster' auf Anfrage","Beantwortet Fragen mit sinnvollen Wörtern"],"K-10":["Rezeptives Vokabular max. 2 Jahre unter Altersnorm","Wird durch Sprachentwicklungstests eingeschätzt"],"K-11":["Sagt 'Ich will deine rote Farbe'","Fragt 'Was ist da drin?'"],"K-12":["Erzählt 'Ich hab meiner Mama beim Backen geholfen'","Tauscht Informationen mit Erwachsenen"],"K-13":["Sagt 'Ich kann gut klettern, bis ganz oben'","Beschreibt Vater: 'Mein Papi ist groß'"],"K-14":["Erzählt Schwester 'Ich habe das Buch gelesen'","Sagt zu Mitschüler 'Das ist nicht richtig'"],"K-15":["Erzählt vom Umzug ins neue Haus","Erklärt Bild: 'Das ist unser altes Haus'"],"K-16":["Erzählt 'Das Gewitter war so laut'","Sagt 'Ich hab Angst vor Hunden'"],"K-17":["Schlägt Design für Wandgemälde vor","Beteiligt sich an Gruppengespräch"],"K-18":["Sagt 'Hey, ich hab es fertig gekriegt'","Zeigt Stolz auf eigene Arbeit"],"K-19":["Sagt 'Man soll wegbleiben wenn ich Wut habe'","Beschreibt eigene Stärken und Schwächen"],"K-20":["Beschreibt Freundin: 'Schnellste Läuferin'","Beschreibt Eigenschaften anderer Kinder"],"K-21":["'Stefan ist froh weil er Urkunde bekommen hat'","'Er ist sauer weil er nicht dran ist'"],"K-22":["Sagt 'Die sind nicht so weit wie wir'","Sagt 'Wir sind die größten Künstler'"],"K-23":["Malt Angelerlebnis mit Vater","Formt wütendes Monster aus Ton"],"K-24":["Sagt 'Ich bin in fast allen Fächern besser als letztes Jahr'","Erkennt eigenen Fortschritt"],"K-25":["'Susie hat mir eine gescheuert weil ich Blöde Kuh gesagt hab'","Erklärt Ursache-Wirkung"],"K-26":["'Ich war stinkig als du Farbe über unser Gemälde gekippt hast'","Drückt eigene Gefühle aus"],"K-27":["Fragt Mechaniker 'Wie lange hat es gedauert das zu lernen?'","Knüpft Beziehungen durch Fragen"],"K-28":["Erklärt Mitschüler eine Matheaufgabe","Steht für anderen Mitschüler ein"],"K-29":["'Wir haben auf Lilli gehackt weil sie Ball fallen ließ'","Beschreibt Zusammenhang von Gefühlen/Verhalten"],"K-30":["'Softball hier erinnert an Hunde die um Knochen balgen'","Verwendet bildhafte Sprache"],"K-31":["'Setzen wir uns hin, jeder erzählt was er denkt'","'Hört auf mit dem Blödsinn'"],"K-32":["'Peters Idee ist gut'","'Deine Idee hat was für sich'"],"K-33":["Vergleicht Eltern: Vater rast, Mutter hält sich an Regeln","Unterscheidet verschiedene Motive"],"K-34":["'Väter sollten bei Familien bleiben auch bei Problemen'","Beschreibt eigene Wertvorstellungen"],"K-35":["'Unser Spiel ist gut weil wir zusammenspielen'","Pflegt positive Beziehungen durch Sprache"],"SOZ-1":["Dreht Kopf zu wenn Rücken berührt wird","Zeigt Interesse an Kuckuck-Spiel"],"SOZ-2":["Beobachtet was Erwachsener und Kind tun","Beobachtet Vater beim Reden"],"SOZ-3":["Schaut hoch wenn Name gerufen wird","Reagiert auf den eigenen Namen"],"SOZ-4":["Stapelt Bauklötze allein","Klettert Rutsche hoch und rutscht runter"],"SOZ-5":["Führt Hand des Erwachsenen zum Keks","Zeigt auf gewünschten Gegenstand"],"SOZ-6":["Geht zur Mutter und erlaubt Arm um sich","Rutscht zur Erzieherin hinüber"],"SOZ-7":["Setzt sich auf Aufforderung","Hängt Mantel auf wenn gesagt"],"SOZ-8":["Sagt 'Milch' wenn Vater Milch hinstellt","Sagt 'Bauen' mit Bauklötzen"],"SOZ-9":["Erkennt sich im Spiegel","Verwendet 'ich, mein, mir'"],"SOZ-10":["Spielt mit Lastwagen neben Kind mit Auto","Baut Turm während anderes Kind auch baut"],"SOZ-11":["Sagt 'Auto' zu Kind mit Lieblingsauto","Sagt 'Geh weg'"],"SOZ-12":["Betritt Raum und umarmt Erzieherin","Bringt Buch um Bild zu zeigen"],"SOZ-13":["Spielt 'Einkaufen gehen' mit Spielgeld","Tut als ob Bus fahren"],"SOZ-14":["Wartet auf Position nach Ermutigung","Bleibt stehen wenn gesagt 'Warte bitte'"],"SOZ-15":["Geht zu freiem Stuhl neben bestimmtem Kind","Schließt sich Murmelspiel an"],"SOZ-16":["Reicht Material/Spielzeug weiter","Teilt Buntstifte mit anderem Kind"],"SOZ-17":["Spielt 'Nachlaufen' mit anderem Kind","Bereitet gemeinsam Puppenkaffeeklatsch vor"],"SOZ-18":["Spielt Dialog in Theaterstück mit Partner","Malt gemeinsam Teil eines Wandgemäldes"],"SOZ-19":["Teilt Erdnussflips beim Fernsehen mit Bruder","Wechselt sich ab beim Völkerball"],"SOZ-20":["Hängt Mantel auf wie älterer Bruder","Bleibt bei Gruppe statt loszurennen"],"SOZ-21":["Sagt 'Das ist nicht fair'","Sagt 'Wände beschmieren ist schlecht'"],"SOZ-22":["Demonstriert anderen wie Lagerfeuer entzünden","Organisiert Frage-Antwort-Spiel"],"SOZ-23":["Nimmt an Aktivität teil obwohl anderes gewünscht","Akzeptiert Vorschlag der Schwester"],"SOZ-24":["Zeichnet Bilderreihe über Erlebnis","Beschreibt Konfliktverlauf im Gespräch"],"SOZ-25":["Sagt 'Ich will mit Peter in der Mannschaft sein'","Wählt regelmäßig bestimmtes Kind"],"SOZ-26":["Zeigt Bild und fragt 'Wie findest du das?'","Bittet Mitschüler um Hilfe"],"SOZ-27":["Sagt im Kino 'Seid leise sonst setzen sie uns raus'","Erklärt Neuem die Klassenregeln"],"SOZ-28":["Sammelt Infos über Olympiasieger","Imitiert Stil der beliebten Lehrerin"],"SOZ-29":["Erzählt Details über Gruppenerlebnis","Beschreibt Konfliktverlauf der Gruppe"],"SOZ-30":["Schlägt vor 'Sollen wir fragen ob Fußball?'","Initiiert geeignete Gruppenaktivität"],"SOZ-31":["Sagt 'Peter soll gehen, er hat keine Angst'","Erkennt Unterschiede zu anderen"],"SOZ-32":["Hört aufmerksam zu bei Erklärung","Akzeptiert Trainers Rat"],"SOZ-33":["Sagt 'Ich glaube Luise mag mich nicht mehr'","Fragt nach Meinung über sich"],"SOZ-34":["Schlägt Abstimmung vor für Ausflugsziel","Bietet konstruktive Lösung an"],"SOZ-35":["'Nachbarin hält Prügel für normal'","Erkennt gegensätzliche Werte"],"SOZ-36":["Sagt 'Eltern hatten wohl Sorgen'","Zieht Schlussfolgerungen aus Situationen"],"SOZ-37":["'Daniels Eltern erlauben ihm nichts, ist nicht fair'","Zeigt Verständnis für andere"],"SOZ-38":["Geben-Nehmen Austausch mit Freund","Nimmt verschiedene Rollen ein"],"SOZ-39":["'Ich mag nicht mit Billy sein, der ist Unruhestifter'","Trifft Entscheidungen nach Werten"],"SOZ-40":["Erkennt 'Ich bin zu klein für erstklassigen Basketball'","Zeigt realistisches Selbstbild"],"SOZ-41":["Entwickelt offene Freundschaft","Engagiert sich in Gruppe"],"KOG-1":["Wendet sich Seifenblasen zu","Dreht Kopf zur Gitarrenmusik"],"KOG-2":["Beobachtet Seifenblasen weiter","Beobachtet Erwachsenen weiter"],"KOG-3":["Lächelt bei vertrautem Erwachsenen","Macht Gesten wenn es essen will"],"KOG-4":["Spritzt nach Aufforderung und Vormachen","Fährt Auto nach verbalem Hinweis"],"KOG-5":["Winkt zum Abschied nach Vorbild","Imitiert Klötzestapeln"],"KOG-6":["Baut Turm aus 3-5 Klötzen","Rennt, klettert, geht allein"],"KOG-7":["Zeigt auf genanntes Spielzeug","Wählt richtig zwischen Papier und Stiften"],"KOG-8":["Antwortet annähernd mit Namen","Gibt Wortannäherung auf Objekt"],"KOG-9":["Sagt 'Mi..Mi' bei Milch","Sagt 'Gehn' wenn es gehen will"],"KOG-10":["Steckt Formen in passendes Brett","Legt Puzzleteile richtig"],"KOG-11":["Antwortet richtig auf 'Was ist das?' bei Haaren","Zeigt Ohr/Fuß auf Frage"],"KOG-12":["Zeigt richtige Person im Bild","Sagt 'Hund' und zeigt ihn unter Objekten"],"KOG-13":["Sortiert Lastwagen und Autos in zwei Kisten","Ordnet Objekte in Kategorien"],"KOG-14":["Zeigt Hund im Buch, sagt 'Hund'","Benennt Abbildungen mit Wörtern"],"KOG-15":["Erklärt/zeigt wozu Schaufel dient","Demonstriert Verwendung von Gegenständen"],"KOG-16":["Fährt Gokart","Balanciert kurz auf einem Fuß"],"KOG-17":["Zieht Linie zwischen zwei gleichen Bällen","Findet Memory-Paare"],"KOG-18":["Baut Brücke aus Bauklötzen","Fädelt Perlen auf"],"KOG-19":["Findet anderen Lastwagen unter drei Wagen","Erkennt was anders ist"],"KOG-20":["Versteht: hoch/runter, unter/über","Zeigt Ersten und Letzten in Reihe"],"KOG-21":["Sortiert Bilder: Menschen hierhin, Tiere dahin","Ordnet nach Kategorien zu"],"KOG-22":["Nennt 1-4 in richtiger Reihenfolge","Zeigt beim Zählen auf jeweiliges Objekt"],"KOG-23":["Zeigt richtig auf Kreis, Viereck, Dreieck","Benennt vier Farben"],"KOG-24":["Wechselt zwischen 'Was ist anders?' und 'Was ist gleich?'","Reagiert auf wechselnde Aufgaben"],"KOG-25":["Wählt 10 Bauklötze für Straße","Zählt 10 Becher ab"],"KOG-26":["Zeichnet Menschen mit Körper","Schreibt Namen ab","Schneidet an Linien"],"KOG-27":["Findet Buchstaben unter Zeichen","Unterscheidet Ziffern von Buchstaben"],"KOG-28":["Hüpft abwechselnd mit beiden Füßen","Fährt Fahrrad mit Stützrädern"],"KOG-29":["Erkennt Anzahl Dominopunkte ohne Zählen","Erfasst Mengen bis 5 spontan"],"KOG-30":["Singt Lied von ca. 30 Wörtern","Zählt bis 20"],"KOG-31":["Ordnet drei Bilder zu Geschichte richtig","Beantwortet 'Was passiert zuerst?'"],"KOG-32":["Zeichnet Menschen mit Armen, Beinen, Kleidung","Bindet Schnürsenkel"],"KOG-33":["Wirft und fängt Ball gesteuert","Unterscheidet rechts und links"],"KOG-34":["Liest 50 Wörter des Grundwortschatzes","Liest einfache Wörter flüssig"],"KOG-35":["Schreibt 1-10 auswendig","Schreibt Zahl zu gezeigter Menge"],"KOG-36":["Schreibt 50 Wörter lesbar nach Diktat","Schreibt Grundwortschatz"],"KOG-37":["Erinnert sich an Details einer Geschichte","Beantwortet Fragen zur Geschichte"],"KOG-38":["Erklärt: 'Junge weint weil andere ihn ärgern'","Erklärt Verhalten anderer"],"KOG-39":["Liest einfache Sätze und beantwortet Fragen","Versteht Inhalt beim Lesen"],"KOG-40":["Beherrscht Addition und Subtraktion bis 9","Rechnet einfache Aufgaben"],"KOG-41":["Erkennt was im Bild fehlt","Findet Unstimmigkeiten"],"KOG-42":["Schreibt Eigenschaften einer Figur auf","Beantwortet Fragen schriftlich"],"KOG-43":["Schwimmt, trifft Ball beim Schlagball","Nimmt an Staffellauf teil"],"KOG-44":["Schreibt drei Sätze als Geschichtsende","Formuliert eigene Sätze"],"KOG-45":["Addiert/subtrahiert bis 100","Benennt Uhrzeiten","Zählt in 5er/10er"],"KOG-46":["Versteht Viertel/Halbe Stunden","Versteht Zentimeter/Meter"],"KOG-47":["Erzählt von Zeitungsbericht","Fasst Gelesenes zusammen"],"KOG-48":["Ordnet Zahlen in Stellenwerttabelle","Rechnet mit Übertrag"],"KOG-49":["Schreibt Artikel für Schülerzeitung","Schreibt Briefe"],"KOG-50":["Beherrscht Einmaleins","Versteht 2+2+2+2 = 4x2"],"KOG-51":["Liest Zeitschriften zum Hobby","Liest aus eigenem Interesse"],"KOG-52":["Wechselt Cent-Münzen in größere","Rechnet mit Geld"],"KOG-53":["Beschreibt Fernsehfigur nach Aussehen und Verhalten","Erklärt Motive von Figuren"],"KOG-54":["Verwendet korrekte Grammatik und Rechtschreibung","Schreibt Aufsätze"],"KOG-55":["Unterscheidet legal/illegal","Erkennt verschiedene Wertvorstellungen"],"KOG-56":["Wendet Mathematik in Sachaufgaben an","Plant mit Preisvergleich"],"KOG-57":["Führt Meinungsumfrage durch","Nimmt an Debatten teil"],"KOG-58":["Unterscheidet Fakten von Meinungen","Hinterfragt Berichte kritisch"],"KOG-59":["Erkennt widersprüchliche Aussagen","Bemerkt inkonsistentes Verhalten"],"KOG-60":["Berechnet Mehrwertsteuer","Passt Rezeptmengen an"],"KOG-61":["Analysiert Probleme und wählt Lösung","Verarbeitet schwierige Situationen"],"KOG-62":["Berechnet Monatsbudget","Diskutiert gesellschaftliche Themen"]},"zusatz":{"demarches_mentales":[{"id":"DM-1","title":"Problemanalyse","stufen":{"stufe1":"lernt noch, ein Problem in kleinere Teile zu zerlegen","stufe2":"kann mit Unterstützung ein Problem in kleinere Teile zerlegen","stufe3":"kann ein Problem in kleinere Teile zerlegen und analysieren"},"intervention":["Problemzerlegung üben","Mindmaps erstellen","Schritt-für-Schritt-Anleitungen nutzen"]},{"id":"DM-2","title":"Lösungsstrategien","stufen":{"stufe1":"lernt noch, verschiedene Lösungswege für ein Problem zu finden","stufe2":"kann mit Unterstützung verschiedene Lösungswege entwickeln","stufe3":"kann verschiedene Lösungswege für ein Problem finden"},"intervention":["Brainstorming-Techniken","Vor- und Nachteile abwägen","Kreative Lösungsansätze fördern"]},{"id":"DM-3","title":"Entscheidungsfindung","stufen":{"stufe1":"lernt noch, begründete Entscheidungen zu treffen","stufe2":"kann mit Unterstützung begründete Entscheidungen treffen","stufe3":"kann begründete Entscheidungen treffen"},"intervention":["Entscheidungsmatrix nutzen","Pro-Contra-Listen erstellen","Konsequenzen durchdenken"]},{"id":"DM-4","title":"Planung","stufen":{"stufe1":"lernt noch, Aufgaben zu planen und zu strukturieren","stufe2":"kann mit Unterstützung Aufgaben planen und strukturieren","stufe3":"kann Aufgaben planen und strukturieren"},"intervention":["Tages-/Wochenpläne erstellen","Prioritäten setzen","Zeitmanagement üben"]},{"id":"DM-5","title":"Selbstreflexion","stufen":{"stufe1":"lernt noch, das eigene Lernverhalten zu reflektieren","stufe2":"kann mit Anleitung das eigene Lernverhalten reflektieren","stufe3":"kann das eigene Lernverhalten reflektieren"},"intervention":["Reflexionsfragen im Unterricht stellen","Lerntagebuch führen","Selbsteinschätzung nach Aufgaben"]},{"id":"DM-6","title":"Hypothesenbildung","stufen":{"stufe1":"lernt noch, Vermutungen aufzustellen und zu überprüfen","stufe2":"kann mit Unterstützung Vermutungen aufstellen und überprüfen","stufe3":"kann Vermutungen aufstellen und überprüfen"},"intervention":["Wissenschaftliches Denken üben","Experimente durchführen","Wenn-Dann-Überlegungen"]},{"id":"DM-7","title":"Schlussfolgern","stufen":{"stufe1":"lernt noch, aus Informationen logische Schlüsse zu ziehen","stufe2":"kann mit Unterstützung logische Schlüsse ziehen","stufe3":"kann aus Informationen logische Schlüsse ziehen"},"intervention":["Logikrätsel lösen","Argumentationsketten bilden","Deduktives Denken üben"]},{"id":"DM-8","title":"Abstraktion","stufen":{"stufe1":"lernt noch, allgemeine Regeln aus Beispielen abzuleiten","stufe2":"kann mit Unterstützung allgemeine Regeln ableiten","stufe3":"kann allgemeine Regeln aus Beispielen ableiten"},"intervention":["Muster erkennen","Kategorien bilden","Vom Konkreten zum Abstrakten"]},{"id":"DM-9","title":"Perspektivwechsel","stufen":{"stufe1":"lernt noch, Situationen aus verschiedenen Blickwinkeln zu betrachten","stufe2":"kann mit Anleitung verschiedene Perspektiven einnehmen","stufe3":"kann Situationen aus verschiedenen Blickwinkeln betrachten"},"intervention":["Rollenspiele","Andere Meinungen einholen","Standortwechsel üben"]},{"id":"DM-10","title":"Kritisches Denken","stufen":{"stufe1":"lernt noch, Informationen kritisch zu hinterfragen","stufe2":"kann mit Unterstützung Informationen kritisch hinterfragen","stufe3":"kann zeitweise Informationen kritisch hinterfragen"},"intervention":["Quellen prüfen","Fakten von Meinungen unterscheiden","Argumente analysieren"]},{"id":"DM-11","title":"Kreatives Denken","stufen":{"stufe1":"lernt noch, neue und originelle Ideen zu entwickeln","stufe2":"kann mit Anregung neue Ideen entwickeln","stufe3":"kann neue und originelle Ideen entwickeln"},"intervention":["Brainstorming ohne Bewertung","Ungewöhnliche Verbindungen suchen","Kreativitätstechniken anwenden"]},{"id":"DM-12","title":"Transferleistung","stufen":{"stufe1":"lernt noch, Gelerntes auf neue Situationen zu übertragen","stufe2":"kann mit Hinweisen Gelerntes auf neue Situationen übertragen","stufe3":"kann Gelerntes auf neue Situationen übertragen"},"intervention":["Anwendungsbeispiele suchen","Parallelen ziehen","Generalisierung üben"]},{"id":"DM-13","title":"Informationsverarbeitung","stufen":{"stufe1":"lernt noch, wichtige von unwichtigen Informationen zu unterscheiden","stufe2":"kann mit Unterstützung Kerninformationen identifizieren","stufe3":"kann wichtige von unwichtigen Informationen unterscheiden"},"intervention":["Kerninformationen markieren","Zusammenfassungen erstellen","Filterstrategien anwenden"]},{"id":"DM-14","title":"Gedächtnisstrategien","stufen":{"stufe1":"lernt noch, Gedächtnisstrategien anzuwenden","stufe2":"kann mit Anleitung Gedächtnisstrategien anwenden","stufe3":"kann verschiedene Gedächtnisstrategien gezielt anwenden"},"intervention":["Eselsbrücken bauen","Visualisierungen nutzen","Wiederholungstechniken anwenden"]},{"id":"DM-15","title":"Antizipation","stufen":{"stufe1":"lernt noch, Konsequenzen von Handlungen vorherzusehen","stufe2":"kann mit Unterstützung Konsequenzen antizipieren","stufe3":"kann mögliche Konsequenzen von Handlungen vorhersehen"},"intervention":["Szenarien durchspielen","Wenn-Dann-Ketten bilden","Vorausschauend denken üben"]}],"manieres_apprendre":[{"id":"MA-1","title":"Lernmotivation","stufen":{"stufe1":"hat noch Schwierigkeiten, sich selbst zum Lernen zu motivieren","stufe2":"kann sich mit Unterstützung zum Lernen motivieren","stufe3":"kann sich zum Lernen motivieren"},"intervention":["Intrinsische Motivation stärken","Lernziele setzen","Erfolge feiern"]},{"id":"MA-2","title":"Lernorganisation","stufen":{"stufe1":"lernt noch, Lernplatz und Materialien zu organisieren","stufe2":"kann mit Unterstützung Lernplatz und Materialien organisieren","stufe3":"kann Lernplatz und Materialien organisieren"},"intervention":["Ordnungssysteme einführen","Arbeitsplatz gestalten","Materialchecklisten nutzen"]},{"id":"MA-3","title":"Zeitmanagement","stufen":{"stufe1":"lernt noch, die Lernzeit effektiv einzuteilen","stufe2":"kann mit Unterstützung die Lernzeit einteilen","stufe3":"kann die Lernzeit effektiv einteilen"},"intervention":["Pomodoro-Technik","Lernpläne erstellen","Pausen einplanen"]},{"id":"MA-4","title":"Konzentration","stufen":{"stufe1":"hat noch Schwierigkeiten, sich über längere Zeit zu konzentrieren","stufe2":"kann sich mit Unterstützung über längere Zeit konzentrieren","stufe3":"kann sich über längere Zeit konzentrieren"},"intervention":["Ablenkungen minimieren","Konzentrationsphasen steigern","Fokussierungsübungen"]},{"id":"MA-5","title":"Selbstständiges Lernen","stufen":{"stufe1":"lernt noch, selbstständig zu lernen und zu arbeiten","stufe2":"kann mit Anleitung selbstständiger lernen und arbeiten","stufe3":"kann selbstständig lernen und arbeiten"},"intervention":["Eigenverantwortung stärken","Hilfe gezielt suchen","Lernprozess selbst steuern"]},{"id":"MA-6","title":"Lernstrategien","stufen":{"stufe1":"lernt noch, verschiedene Lernstrategien anzuwenden","stufe2":"kann mit Unterstützung verschiedene Lernstrategien anwenden","stufe3":"kann verschiedene Lernstrategien anwenden"},"intervention":["Lerntyp ermitteln","Verschiedene Methoden ausprobieren","Passende Strategien wählen"]},{"id":"MA-7","title":"Fehlertoleranz","stufen":{"stufe1":"hat noch Schwierigkeiten, aus Fehlern zu lernen ohne aufzugeben","stufe2":"kann mit Ermutigung aus Fehlern lernen","stufe3":"kann aus Fehlern lernen, ohne aufzugeben"},"intervention":["Fehler als Lernchance sehen","Fehleranalyse durchführen","Growth Mindset fördern"]},{"id":"MA-8","title":"Ausdauer","stufen":{"stufe1":"hat noch Schwierigkeiten, bei Schwierigkeiten durchzuhalten","stufe2":"kann mit Unterstützung bei Schwierigkeiten durchhalten","stufe3":"kann auch bei Schwierigkeiten durchhalten"},"intervention":["Kleine Etappenziele setzen","Durchhaltevermögen stärken","Erfolge dokumentieren"]},{"id":"MA-9","title":"Neugier","stufen":{"stufe1":"zeigt noch wenig Interesse und Neugier an neuen Themen","stufe2":"zeigt mit Anregung Interesse an neuen Themen","stufe3":"zeigt Interesse und Neugier an neuen Themen"},"intervention":["Entdeckendes Lernen fördern","Fragen ermutigen","Interessen aufgreifen"]},{"id":"MA-10","title":"Lernreflexion","stufen":{"stufe1":"lernt noch, den eigenen Lernprozess zu reflektieren","stufe2":"kann mit Anleitung den Lernprozess reflektieren","stufe3":"kann den eigenen Lernprozess reflektieren und verbessern"},"intervention":["Lerntagebuch führen","Was hat funktioniert? Was nicht?","Verbesserungsstrategien entwickeln"]},{"id":"MA-11","title":"Notizen machen","stufen":{"stufe1":"lernt noch, wichtige Informationen zu notieren","stufe2":"kann mit Anleitung wichtige Informationen notieren","stufe3":"kann wichtige Informationen notieren"},"intervention":["Verschiedene Notiztechniken","Stichpunkte vs. Fließtext","Strukturierte Mitschriften"]},{"id":"MA-12","title":"Quellenarbeit","stufen":{"stufe1":"lernt noch, verschiedene Quellen zu nutzen und zu bewerten","stufe2":"kann mit Unterstützung Quellen nutzen und bewerten","stufe3":"kann verschiedene Quellen nutzen und bewerten"},"intervention":["Recherchieren üben","Quellenkritik","Informationen zusammenführen"]},{"id":"MA-13","title":"Visualisierung","stufen":{"stufe1":"lernt noch, Lerninhalte visuell darzustellen","stufe2":"kann mit Anleitung Lerninhalte visuell darstellen","stufe3":"kann Lerninhalte visuell darstellen"},"intervention":["Mind-Maps erstellen","Sketchnotes","Diagramme zeichnen"]},{"id":"MA-14","title":"Wiederholung","stufen":{"stufe1":"wiederholt Lerninhalte noch nicht regelmäßig","stufe2":"wiederholt mit Erinnerung Lerninhalte regelmäßig","stufe3":"wiederholt Lerninhalte regelmäßig"},"intervention":["Spaced Repetition","Karteikarten nutzen","Regelmäßige Übungszeiten"]},{"id":"MA-15","title":"Prüfungsvorbereitung","stufen":{"stufe1":"lernt noch, sich gezielt auf Prüfungen vorzubereiten","stufe2":"kann sich mit Unterstützung auf Prüfungen vorbereiten","stufe3":"kann sich gezielt auf Prüfungen vorbereiten"},"intervention":["Prüfungssimulation","Zeitplanung für Vorbereitung","Prüfungsangst bewältigen"]},{"id":"MA-16","title":"Kooperatives Lernen","stufen":{"stufe1":"hat noch Schwierigkeiten, mit anderen gemeinsam zu lernen","stufe2":"kann mit Anleitung mit anderen gemeinsam lernen","stufe3":"kann mit anderen gemeinsam lernen"},"intervention":["Lerngruppen bilden","Peer-Teaching","Wissen teilen"]},{"id":"MA-17","title":"Mediennutzung","stufen":{"stufe1":"lernt noch, digitale Medien sinnvoll zum Lernen zu nutzen","stufe2":"kann mit Anleitung digitale Medien zum Lernen nutzen","stufe3":"kann digitale Medien sinnvoll zum Lernen nutzen"},"intervention":["Lern-Apps kennenlernen","Online-Ressourcen nutzen","Bildschirmzeit regulieren"]},{"id":"MA-18","title":"Umgang mit Frustration","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Lernfrustration umzugehen","stufe2":"kann mit Unterstützung mit Lernfrustration umgehen","stufe3":"kann mit Lernfrustration umgehen"},"intervention":["Pause machen","Hilfe suchen","Aufgaben aufteilen"]},{"id":"MA-19","title":"Klassenregeln einhalten","stufen":{"stufe1":"hat noch Schwierigkeiten, Klassenregeln einzuhalten","stufe2":"kann mit Erinnerung Klassenregeln einhalten","stufe3":"hält die Klassenregeln ein, auch in offenen Unterrichtssituationen"},"intervention":["Regeln visualisieren","Positive Verstärkung","Selbstkontrolle üben"]},{"id":"MA-20","title":"Arbeitsaufträge annehmen","stufen":{"stufe1":"hat noch Schwierigkeiten, Arbeitsaufträge anzunehmen","stufe2":"nimmt mit Ermutigung Arbeitsaufträge an","stufe3":"kann Arbeitsaufträge annehmen, auch wenn sie nicht den Vorstellungen entsprechen"},"intervention":["Flexibilität fördern","Sinn erklären","Kompromisse finden"]},{"id":"MA-21","title":"Motivation bei ungeliebten Aufgaben","stufen":{"stufe1":"zeigt noch wenig Motivation bei ungeliebten Aufgaben","stufe2":"zeigt mit Unterstützung Motivation bei ungeliebten Aufgaben","stufe3":"zeigt Motivation auch bei weniger geschätzten Aufgaben"},"intervention":["Sinn vermitteln","Kleine Belohnungen","Durchhaltevermögen stärken"]},{"id":"MA-22","title":"Ablenkung reduzieren","stufen":{"stufe1":"hat noch Schwierigkeiten, Ablenkungen im Unterricht zu vermeiden","stufe2":"kann mit Erinnerung Ablenkungen reduzieren","stufe3":"schafft weniger Ablenkung durch Gespräche im Unterricht"},"intervention":["Fokussierung üben","Sitzordnung anpassen","Selbstdisziplin stärken"]},{"id":"MA-23","title":"Anweisungen umsetzen","stufen":{"stufe1":"hat noch Schwierigkeiten, Anweisungen direkt umzusetzen","stufe2":"setzt mit Erinnerung Anweisungen um","stufe3":"setzt Anweisungen und Arbeitsaufträge direkt um"},"intervention":["Klare Anweisungen","Verständnis prüfen","Prompte Reaktion üben"]},{"id":"MA-24","title":"Autonomes Arbeiten","stufen":{"stufe1":"hat noch Schwierigkeiten, Aufträge selbstständig auszuführen","stufe2":"kann mit anfänglicher Anleitung Aufträge ausführen","stufe3":"kann selbstständig Arbeitsaufträge ausführen, nachdem sie erklärt wurden"},"intervention":["Schrittweise Hilfe reduzieren","Selbstständigkeit fördern","Erfolgserlebnisse schaffen"]},{"id":"MA-25","title":"Arbeitstempo steigern","stufen":{"stufe1":"hat noch Schwierigkeiten, das Arbeitstempo anzupassen","stufe2":"kann mit Unterstützung das Arbeitstempo anpassen","stufe3":"kann das Arbeitstempo an die Anforderungen anpassen"},"intervention":["Zeitmanagement üben","Fokussierung trainieren","Effizienz steigern"]},{"id":"MA-26","title":"Transfer ins Langzeitgedächtnis","stufen":{"stufe1":"hat noch Schwierigkeiten, Inhalte im Langzeitgedächtnis zu speichern","stufe2":"kann mit Lernstrategien Inhalte besser behalten","stufe3":"kann schulische Inhalte im Langzeitgedächtnis speichern"},"intervention":["Wiederholung einplanen","Lernstrategien anwenden","Vernetzung herstellen"]},{"id":"MA-27","title":"Schulische Perspektive entwickeln","stufen":{"stufe1":"hat noch Schwierigkeiten, die Ziele der Schulausbildung zu akzeptieren","stufe2":"versteht mit Erklärung die Ziele der Schulausbildung","stufe3":"versteht und akzeptiert die Ziele der Schulausbildung und hat eine realistische schulische Perspektive entwickelt"},"intervention":["Zukunftsperspektiven aufzeigen","Sinn vermitteln","Berufsorientierung"]},{"id":"MA-28","title":"Proaktiv Bedürfnisse kommunizieren","stufen":{"stufe1":"hat noch Schwierigkeiten, Bedürfnisse proaktiv zu äußern","stufe2":"fragt mit Ermutigung nach dem, was benötigt wird","stufe3":"fragt proaktiv nach dem, was benötigt oder gewünscht wird"},"intervention":["Selbstadvokation üben","Initiative ergreifen","Bedürfnisse formulieren"]},{"id":"MA-29","title":"Ohne Aufforderung handeln","stufen":{"stufe1":"benötigt noch Aufforderungen für alltägliche Aufgaben","stufe2":"erledigt mit wenigen Erinnerungen alltägliche Aufgaben","stufe3":"erledigt alltägliche Aufgaben ohne externe Aufforderung"},"intervention":["Routinen etablieren","Eigenverantwortung stärken","Selbstständigkeit fördern"]},{"id":"MA-30","title":"Flüchtigkeitsfehler reduzieren","stufen":{"stufe1":"macht noch häufig Flüchtigkeitsfehler","stufe2":"kann mit Erinnerung konzentrierter arbeiten","stufe3":"arbeitet konzentriert und reduziert Flüchtigkeitsfehler"},"intervention":["Kontrolllesen üben","Fokussierungstechniken","Sorgfalt trainieren"]},{"id":"MA-31","title":"Transferkompetenzen entwickeln","stufen":{"stufe1":"hat noch Schwierigkeiten, Kompetenzen in neuen Situationen anzuwenden","stufe2":"kann mit Hinweisen Kompetenzen in neuen Situationen abrufen","stufe3":"kann Kompetenzen auch in neuen Situationen abrufen"},"intervention":["Generalisierung üben","Verschiedene Kontexte","Anwendung trainieren"]},{"id":"MA-32","title":"Gute schulische Leistungen","stufen":{"stufe1":"arbeitet noch an der Verbesserung der schulischen Leistungen","stufe2":"erreicht mit Unterstützung bessere schulische Leistungen","stufe3":"erreicht gute schulische Leistungen und Prüfungsergebnisse"},"intervention":["Lernstrategien anwenden","Vorbereitung","Kontinuierliches Üben"]},{"id":"MA-33","title":"Regelmäßiger Schulbesuch","stufen":{"stufe1":"hat noch Schwierigkeiten mit regelmäßigem Schulbesuch","stufe2":"besucht mit Unterstützung regelmäßiger die Schule","stufe3":"besucht regelmäßig die Schule ohne Fehltage"},"intervention":["Anwesenheit stärken","Motivation fördern","Auch bei leichtem Unwohlsein"]},{"id":"MA-34","title":"Aufgaben ohne Zögern umsetzen","stufen":{"stufe1":"zögert noch häufig bei der Umsetzung von Arbeitsaufträgen","stufe2":"setzt mit Ermutigung Arbeitsaufträge schneller um","stufe3":"setzt Arbeitsaufträge umgehend und ohne Zögern um"},"intervention":["Prompte Reaktion","Keine Vermeidung","Direkte Umsetzung"]},{"id":"MA-35","title":"Engagement in Projekten","stufen":{"stufe1":"zeigt noch wenig Engagement in Projekten","stufe2":"zeigt mit Anregung Engagement in Projekten","stufe3":"zeigt Engagement in Projekten und besonderen Unterrichtsformen"},"intervention":["Interessen einbringen","Aktive Teilnahme","Motivation zeigen"]},{"id":"MA-36","title":"Strukturierte Arbeitsorganisation","stufen":{"stufe1":"benötigt noch viel Struktur bei der Arbeitsorganisation","stufe2":"profitiert von Struktur und arbeitet damit besser","stufe3":"kann von strukturierter Arbeitsorganisation profitieren und diese umsetzen"},"intervention":["Struktur anbieten","Übersichtlichkeit","Klare Abläufe"]},{"id":"MA-37","title":"Alternative Meinungen zulassen","stufen":{"stufe1":"hat noch Schwierigkeiten, alternative Meinungen zuzulassen","stufe2":"kann mit Unterstützung alternative Meinungen akzeptieren","stufe3":"kann alternative Meinungen zulassen und akzeptieren"},"intervention":["Toleranz üben","Perspektivwechsel","Offenheit entwickeln"]}],"attitudes_relationnelles":[{"id":"AR-1","title":"Vertrauen aufbauen","stufen":{"stufe1":"hat noch Schwierigkeiten, Vertrauen zu anderen aufzubauen","stufe2":"kann mit Unterstützung Vertrauen zu anderen aufbauen","stufe3":"kann Vertrauen zu anderen Menschen aufbauen"},"intervention":["Verlässlichkeit zeigen","Offenheit ermöglichen","Zeit geben"]},{"id":"AR-2","title":"Grenzen setzen","stufen":{"stufe1":"hat noch Schwierigkeiten, eigene Grenzen zu erkennen und zu kommunizieren","stufe2":"kann mit Unterstützung eigene Grenzen kommunizieren","stufe3":"kann eigene Grenzen erkennen und kommunizieren"},"intervention":["Nein sagen üben","Grenzen benennen","Selbstfürsorge praktizieren"]},{"id":"AR-3","title":"Grenzen respektieren","stufen":{"stufe1":"hat noch Schwierigkeiten, die Grenzen anderer zu respektieren","stufe2":"kann mit Erinnerung die Grenzen anderer respektieren","stufe3":"kann verstärkt die Grenzen anderer Mitschüler:innen respektieren"},"intervention":["Auf Signale achten","Nachfragen bei Unsicherheit","Respekt vorleben"]},{"id":"AR-4","title":"Aktives Zuhören","stufen":{"stufe1":"hat noch Schwierigkeiten, anderen aufmerksam zuzuhören","stufe2":"kann mit Anleitung anderen aufmerksam zuhören","stufe3":"kann anderen aufmerksam zuhören"},"intervention":["Blickkontakt halten","Nachfragen stellen","Zusammenfassen üben"]},{"id":"AR-5","title":"Empathie zeigen","stufen":{"stufe1":"hat noch Schwierigkeiten, sich in andere hineinzuversetzen","stufe2":"kann mit Unterstützung sich in andere hineinversetzen","stufe3":"kann sich in andere hineinversetzen"},"intervention":["Gefühle anderer benennen","Perspektivübernahme üben","Mitgefühl ausdrücken"]},{"id":"AR-6","title":"Konflikte lösen","stufen":{"stufe1":"hat noch Schwierigkeiten, Konflikte friedlich zu lösen","stufe2":"kann mit Moderation Konflikte friedlich lösen","stufe3":"kann Konflikte friedlich lösen"},"intervention":["Ich-Botschaften verwenden","Kompromisse finden","Win-Win-Lösungen suchen"]},{"id":"AR-7","title":"Kritikfähigkeit","stufen":{"stufe1":"hat noch Schwierigkeiten, konstruktive Kritik anzunehmen","stufe2":"kann mit Unterstützung konstruktive Kritik annehmen","stufe3":"kann besser mit konstruktiver Kritik umgehen"},"intervention":["Feedback-Regeln anwenden","Kritik nicht persönlich nehmen","Sachlich bleiben"]},{"id":"AR-8","title":"Hilfe annehmen","stufen":{"stufe1":"hat noch Schwierigkeiten, Hilfe von anderen anzunehmen","stufe2":"kann mit Ermutigung Hilfe von anderen annehmen","stufe3":"kann Hilfe von anderen annehmen"},"intervention":["Hilfe als Stärke sehen","Vertrauen in andere","Dankbarkeit zeigen"]},{"id":"AR-9","title":"Hilfe anbieten","stufen":{"stufe1":"bietet noch selten Hilfe an","stufe2":"kann mit Anregung anderen Hilfe anbieten","stufe3":"kann anderen Hilfe anbieten"},"intervention":["Aufmerksam für Bedürfnisse sein","Unterstützung anbieten","Ohne Erwartung helfen"]},{"id":"AR-10","title":"Freundschaften pflegen","stufen":{"stufe1":"hat noch Schwierigkeiten, Freundschaften aufzubauen und zu pflegen","stufe2":"kann mit Unterstützung Freundschaften pflegen","stufe3":"kann Freundschaften aufbauen und pflegen"},"intervention":["Regelmäßiger Kontakt","Interesse zeigen","Gemeinsame Aktivitäten"]},{"id":"AR-11","title":"Teamfähigkeit","stufen":{"stufe1":"hat noch Schwierigkeiten, effektiv im Team zu arbeiten","stufe2":"kann mit Anleitung effektiv im Team arbeiten","stufe3":"kann effektiv im Team arbeiten"},"intervention":["Rollen akzeptieren","Beiträge wertschätzen","Kompromissbereitschaft"]},{"id":"AR-12","title":"Respektvoller Umgang","stufen":{"stufe1":"begegnet anderen noch nicht immer mit Respekt","stufe2":"begegnet mit Erinnerung anderen mit Respekt","stufe3":"begegnet anderen mit Respekt"},"intervention":["Höflichkeitsformen","Wertschätzung zeigen","Würde achten"]},{"id":"AR-13","title":"Toleranz","stufen":{"stufe1":"hat noch Schwierigkeiten, Unterschiede zwischen Menschen zu akzeptieren","stufe2":"kann mit Gesprächen Unterschiede besser akzeptieren","stufe3":"akzeptiert Unterschiede zwischen Menschen"},"intervention":["Vielfalt als Bereicherung","Vorurteile reflektieren","Offenheit fördern"]},{"id":"AR-14","title":"Verantwortung übernehmen","stufen":{"stufe1":"hat noch Schwierigkeiten, Verantwortung für das eigene Handeln zu übernehmen","stufe2":"kann mit Unterstützung Verantwortung übernehmen","stufe3":"übernimmt Verantwortung für das eigene Handeln"},"intervention":["Konsequenzen tragen","Fehler eingestehen","Wiedergutmachung anbieten"]},{"id":"AR-15","title":"Verbindlichkeit","stufen":{"stufe1":"hat noch Schwierigkeiten, Versprechen und Abmachungen einzuhalten","stufe2":"kann mit Erinnerung Versprechen einhalten","stufe3":"hält Versprechen und Abmachungen ein"},"intervention":["Termine einhalten","Zuverlässigkeit üben","Erwartungen klären"]},{"id":"AR-16","title":"Nähe und Distanz","stufen":{"stufe1":"hat noch Schwierigkeiten, ein angemessenes Maß an Nähe und Distanz zu wahren","stufe2":"kann mit Hinweisen angemessene Distanz wahren","stufe3":"hält eine angemessene körperliche Distanz zu anderen Personen ein"},"intervention":["Körperliche Distanz beachten","Intimsphäre respektieren","Situationsangemessen handeln"]},{"id":"AR-17","title":"Kooperationsbereitschaft","stufen":{"stufe1":"zeigt noch wenig Bereitschaft, mit anderen zusammenzuarbeiten","stufe2":"zeigt mit Ermutigung Kooperationsbereitschaft","stufe3":"ist bereit, mit anderen zusammenzuarbeiten"},"intervention":["Gemeinsame Ziele verfolgen","Beiträge leisten","Zusammenarbeit wertschätzen"]},{"id":"AR-18","title":"Durchsetzungsvermögen","stufen":{"stufe1":"hat noch Schwierigkeiten, die eigene Meinung angemessen zu vertreten","stufe2":"kann mit Unterstützung die eigene Meinung vertreten","stufe3":"kann die eigene Meinung angemessen vertreten"},"intervention":["Selbstbewusst auftreten","Argumente formulieren","Standhaft bleiben ohne aggressiv zu sein"]},{"id":"AR-19","title":"Wertschätzung zeigen","stufen":{"stufe1":"zeigt noch selten Wertschätzung gegenüber Lehrpersonen und Mitschüler:innen","stufe2":"zeigt mit Anregung Wertschätzung","stufe3":"zeigt Wertschätzung und Dankbarkeit gegenüber Lehrpersonen und Mitschüler:innen"},"intervention":["Sich bedanken üben","Hilfe anerkennen","Positive Rückmeldungen geben"]},{"id":"AR-20","title":"Authentisches Auftreten","stufen":{"stufe1":"hat noch Schwierigkeiten, authentisch aufzutreten","stufe2":"kann mit Ermutigung authentischer auftreten","stufe3":"kann in der Schule authentisch auftreten und die eigene Meinung ehrlich äußern"},"intervention":["Eigene Meinung vertreten üben","Ehrlich kommunizieren","Selbstbewusst auftreten"]},{"id":"AR-21","title":"Eigener Konfliktanteil","stufen":{"stufe1":"hat noch Schwierigkeiten, den eigenen Anteil in Konflikten zu erkennen","stufe2":"kann mit Reflexionsgesprächen den eigenen Anteil erkennen","stufe3":"kann den eigenen Anteil in Konfliktsituationen erkennen und akzeptieren"},"intervention":["Reflexionsgespräche führen","Perspektivwechsel üben","Verantwortung übernehmen"]},{"id":"AR-22","title":"Erfolge anderer anerkennen","stufen":{"stufe1":"hat noch Schwierigkeiten, Erfolge anderer anzuerkennen","stufe2":"kann mit Unterstützung Erfolge anderer anerkennen","stufe3":"kann die Erfolge anderer anerkennen und sich für sie freuen"},"intervention":["Gratulieren üben","Neid reflektieren","Teamgeist fördern"]},{"id":"AR-23","title":"Alternative Verhaltensweisen","stufen":{"stufe1":"hat noch Schwierigkeiten, Verhaltensalternativen anzuwenden","stufe2":"kann mit Erinnerung Verhaltensalternativen anwenden","stufe3":"kann in schwierigen Situationen Verhaltensalternativen anwenden"},"intervention":["Verhaltensalternativen für Klassensituationen erarbeiten","Rollenspiele durchführen","Positive Verstärkung im Schulalltag"]},{"id":"AR-24","title":"Konflikte vorbeugen","stufen":{"stufe1":"hat noch Schwierigkeiten, Konfliktsituationen vorzubeugen","stufe2":"kann mit Unterstützung präventiv auf Konflikte reagieren","stufe3":"kann präventiv auf mögliche Konfliktsituationen reagieren"},"intervention":["Frühwarnsignale erkennen","Deeskalationsstrategien","Kommunikation vor Konflikten"]},{"id":"AR-25","title":"Nonverbale Kommunikation","stufen":{"stufe1":"setzt Körpersprache noch nicht bewusst ein","stufe2":"kann mit Anleitung Körpersprache bewusster einsetzen","stufe3":"kann Körpersprache bewusst einsetzen"},"intervention":["Körperhaltung üben","Mimik und Gestik reflektieren","Selbstbewusstes Auftreten"]},{"id":"AR-26","title":"Provokationen meiden","stufen":{"stufe1":"hat noch Schwierigkeiten, Provokationen zu meiden","stufe2":"kann mit Unterstützung Provokationen besser meiden","stufe3":"kann Provokationen aktiv und passiv meiden"},"intervention":["Trigger erkennen","Abstand nehmen","Nicht reagieren üben"]},{"id":"AR-27","title":"Sich entschuldigen","stufen":{"stufe1":"hat noch Schwierigkeiten, sich angemessen zu entschuldigen","stufe2":"kann mit Anleitung sich entschuldigen","stufe3":"kann sich angemessen entschuldigen, wenn ein Fehler gemacht wurde"},"intervention":["Entschuldigung formulieren","Wiedergutmachung anbieten","Einsicht zeigen"]},{"id":"AR-28","title":"Aussprechen lassen","stufen":{"stufe1":"hat noch Schwierigkeiten, andere ausreden zu lassen","stufe2":"kann mit Erinnerung andere ausreden lassen","stufe3":"kann andere ausreden lassen und warten, bis man an der Reihe ist"},"intervention":["Aktives Zuhören üben","Geduld trainieren","Gesprächsregeln beachten"]},{"id":"AR-29","title":"Angemessener Umgangston","stufen":{"stufe1":"pflegt noch nicht immer einen respektvollen Umgangston","stufe2":"pflegt mit Erinnerung einen respektvollen Umgangston","stufe3":"pflegt einen respektvollen Umgangston mit allen Personen"},"intervention":["Höflichkeitsformen üben","Wortwahl reflektieren","Vorbildfunktion nutzen"]},{"id":"AR-30","title":"Körperliche Distanz wahren","stufen":{"stufe1":"hat noch Schwierigkeiten, körperliche Distanz einzuhalten","stufe2":"kann mit Hinweisen körperliche Distanz einhalten","stufe3":"hält selbstständig eine angemessene körperliche Distanz zu anderen Personen ein"},"intervention":["Grenzen wahrnehmen","Signale beachten","Nachfragen bei Unsicherheit"]},{"id":"AR-31","title":"Soziale Kontakte aufgebaut","stufen":{"stufe1":"baut noch stabile soziale Kontakte auf","stufe2":"hat mit Unterstützung soziale Kontakte aufgebaut","stufe3":"hat stabile soziale Kontakte aufgebaut und pflegt diese"},"intervention":["Freizeitaktivitäten mit Freunden","Regelmäßiger Kontakt","Außerschulische Beziehungen"]},{"id":"AR-32","title":"Aktive Kontaktaufnahme","stufen":{"stufe1":"hat noch Schwierigkeiten, aktiv auf andere zuzugehen","stufe2":"kann mit Ermutigung auf andere Jugendliche zugehen","stufe3":"kann aktiv auf andere Jugendliche zugehen und Kontakt aufnehmen"},"intervention":["Initiative ergreifen üben","Gesprächseinstiege lernen","Offenheit zeigen"]},{"id":"AR-33","title":"Harmonischer Umgang","stufen":{"stufe1":"hat noch nicht immer einen harmonischen Umgang mit Mitschüler:innen","stufe2":"hat mit Unterstützung einen besseren Umgang mit Mitschüler:innen","stufe3":"hat einen harmonischen Umgang mit Mitschüler:innen"},"intervention":["Positive Interaktionen verstärken","Gemeinschaftsgefühl fördern","Rücksichtnahme üben"]},{"id":"AR-34","title":"Gruppenrolle gefunden","stufen":{"stufe1":"sucht noch nach einer positiven Rolle in der Gruppe","stufe2":"hat mit Unterstützung eine Rolle in der Gruppe gefunden","stufe3":"hat eine positive Rolle innerhalb der Gruppe gefunden"},"intervention":["Stärken einbringen","Verantwortung übernehmen","Beitrag zur Gemeinschaft"]},{"id":"AR-35","title":"Vertrauen aufgebaut","stufen":{"stufe1":"baut noch Vertrauen zu Bezugspersonen auf","stufe2":"hat mit Zeit Vertrauen zu einigen Bezugspersonen aufgebaut","stufe3":"hat Vertrauen zu Bezugspersonen aufbauen können"},"intervention":["Zeit geben","Verlässlichkeit zeigen","Offene Kommunikation"]}],"attitudes_affectives":[{"id":"AA-1","title":"Gefühle erkennen","stufen":{"stufe1":"hat noch Schwierigkeiten, eigene Gefühle zu erkennen und zu benennen","stufe2":"kann mit Unterstützung eigene Gefühle erkennen und benennen","stufe3":"kann eigene Gefühle erkennen und benennen"},"intervention":["Gefühlstagebuch führen","Körperempfindungen beachten","Gefühlsvokabular erweitern"]},{"id":"AA-2","title":"Gefühle ausdrücken","stufen":{"stufe1":"hat noch Schwierigkeiten, Gefühle angemessen auszudrücken","stufe2":"kann mit Anleitung Gefühle angemessen ausdrücken","stufe3":"kann zu bestimmten Momenten Gefühle angemessen ausdrücken"},"intervention":["Ich-Botschaften nutzen","Kreative Ausdrucksformen","Gefühle verbalisieren üben"]},{"id":"AA-3","title":"Emotionsregulation","stufen":{"stufe1":"hat noch Schwierigkeiten, Gefühle zu regulieren","stufe2":"kann mit Unterstützung Gefühle regulieren","stufe3":"kann Gefühle regulieren"},"intervention":["Beruhigungstechniken","Atemübungen","Notfallstrategien entwickeln"]},{"id":"AA-4","title":"Frustrationstoleranz","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Frustration umzugehen","stufe2":"kann mit Unterstützung mit Frustration umgehen","stufe3":"kann mit Frustration umgehen"},"intervention":["Frustrationsauslöser erkennen","Alternative Reaktionen üben","Gedanken umstrukturieren"]},{"id":"AA-5","title":"Impulskontrolle","stufen":{"stufe1":"hat noch Schwierigkeiten, impulsive Reaktionen zu kontrollieren","stufe2":"kann mit Erinnerung impulsive Reaktionen kontrollieren","stufe3":"kann verstärkt impulsive Reaktionen kontrollieren"},"intervention":["Stopp-Technik anwenden","Nachdenken vor Handeln","Konsequenzen bedenken"]},{"id":"AA-6","title":"Stressbewältigung","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Stress umzugehen","stufe2":"kann mit Unterstützung mit Stress umgehen","stufe3":"kann mit Stress umgehen"},"intervention":["Stressoren identifizieren","Entspannungstechniken","Ausgleich schaffen"]},{"id":"AA-7","title":"Angstbewältigung","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Ängsten umzugehen","stufe2":"kann mit Unterstützung mit Ängsten umgehen","stufe3":"kann mit Ängsten umgehen"},"intervention":["Ängste benennen","Schrittweise Konfrontation","Sicherheitsstrategien entwickeln"]},{"id":"AA-8","title":"Wutmanagement","stufen":{"stufe1":"hat noch Schwierigkeiten, Wut zu kontrollieren","stufe2":"kann mit Unterstützung Wut kontrollieren","stufe3":"kann Wut kontrollieren"},"intervention":["Wuttrigger erkennen","Auszeit nehmen","Energie ableiten"]},{"id":"AA-9","title":"Trauer verarbeiten","stufen":{"stufe1":"hat noch Schwierigkeiten, Trauer zuzulassen und zu verarbeiten","stufe2":"kann mit Begleitung Trauer zulassen und verarbeiten","stufe3":"kann Trauer zulassen und verarbeiten"},"intervention":["Trauer ausdrücken erlauben","Rituale entwickeln","Unterstützung suchen"]},{"id":"AA-10","title":"Selbstwertgefühl","stufen":{"stufe1":"hat noch Schwierigkeiten, ein positives Selbstbild zu entwickeln","stufe2":"entwickelt mit Unterstützung ein positiveres Selbstbild","stufe3":"hat ein positives Bild von sich selbst"},"intervention":["Stärken identifizieren","Selbstmitgefühl üben","Negative Gedanken hinterfragen"]},{"id":"AA-11","title":"Selbstvertrauen","stufen":{"stufe1":"hat noch wenig Vertrauen in die eigenen Fähigkeiten","stufe2":"vertraut mit Ermutigung mehr in die eigenen Fähigkeiten","stufe3":"vertraut in die eigenen Fähigkeiten"},"intervention":["Erfolgserlebnisse schaffen","Komfortzone erweitern","Positive Selbstgespräche"]},{"id":"AA-12","title":"Resilienz","stufen":{"stufe1":"hat noch Schwierigkeiten, Rückschläge zu verkraften","stufe2":"kann mit Unterstützung Rückschläge verkraften","stufe3":"kann Rückschläge verkraften und weitermachen"},"intervention":["Bewältigungsstrategien entwickeln","Soziales Netzwerk nutzen","Optimismus fördern"]},{"id":"AA-13","title":"Optimismus","stufen":{"stufe1":"hat noch Schwierigkeiten, in schwierigen Situationen positiv zu denken","stufe2":"kann mit Unterstützung positivere Gedanken entwickeln","stufe3":"kann auch in schwierigen Situationen positiv denken"},"intervention":["Positive Aspekte finden","Hoffnung bewahren","Lösungsorientiert denken"]},{"id":"AA-14","title":"Geduld","stufen":{"stufe1":"hat noch Schwierigkeiten, geduldig zu sein und zu warten","stufe2":"kann mit Unterstützung geduldiger sein","stufe3":"kann geduldig sein und warten"},"intervention":["Warten üben","Belohnungsaufschub trainieren","Ablenkungsstrategien"]},{"id":"AA-15","title":"Gelassenheit","stufen":{"stufe1":"hat noch Schwierigkeiten, in stressigen Situationen ruhig zu bleiben","stufe2":"kann mit Anleitung in stressigen Situationen ruhiger bleiben","stufe3":"kann in stressigen Situationen ruhig bleiben"},"intervention":["Achtsamkeitsübungen","Perspektive bewahren","Was kann ich kontrollieren?"]},{"id":"AA-16","title":"Freude erleben","stufen":{"stufe1":"hat noch Schwierigkeiten, Freude zu empfinden und zu genießen","stufe2":"kann mit Anregung Freude erleben","stufe3":"kann Freude empfinden und genießen"},"intervention":["Positive Aktivitäten planen","Im Moment sein","Dankbarkeit praktizieren"]},{"id":"AA-17","title":"Emotionale Stabilität","stufen":{"stufe1":"hat noch keine ausgeglichene emotionale Grundstimmung","stufe2":"zeigt mit Unterstützung eine stabilere Grundstimmung","stufe3":"hat eine ausgeglichene emotionale Grundstimmung"},"intervention":["Routinen etablieren","Selbstfürsorge praktizieren","Balance finden"]},{"id":"AA-18","title":"Scham bewältigen","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Schamgefühlen umzugehen","stufe2":"kann mit Unterstützung mit Schamgefühlen umgehen","stufe3":"kann mit Schamgefühlen umgehen"},"intervention":["Scham normalisieren","Selbstmitgefühl üben","Vertraute Person einbeziehen"]},{"id":"AA-19","title":"Eifersucht regulieren","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Eifersuchtsgefühlen umzugehen","stufe2":"kann mit Unterstützung mit Eifersuchtsgefühlen umgehen","stufe3":"kann mit Eifersuchtsgefühlen umgehen"},"intervention":["Auslöser verstehen","Selbstwert stärken","Kommunikation fördern"]},{"id":"AA-20","title":"Hoffnung bewahren","stufen":{"stufe1":"hat noch Schwierigkeiten, in schwierigen Zeiten Hoffnung zu haben","stufe2":"kann mit Unterstützung Hoffnung bewahren","stufe3":"kann auch in schwierigen Zeiten Hoffnung haben"},"intervention":["Zukunftsvisionen entwickeln","Kleine Fortschritte wahrnehmen","Unterstützung suchen"]},{"id":"AA-21","title":"Proaktive Haltung","stufen":{"stufe1":"sieht sich noch als Opfer der Umstände","stufe2":"entwickelt mit Unterstützung eine proaktivere Haltung","stufe3":"nimmt eine proaktive Haltung ein und sieht sich nicht als Opfer der Umstände"},"intervention":["Selbstwirksamkeit stärken","Handlungsoptionen erkennen","Verantwortung übernehmen"]},{"id":"AA-22","title":"Mit Lob umgehen","stufen":{"stufe1":"hat noch Schwierigkeiten, Lob und Anerkennung anzunehmen","stufe2":"kann mit Unterstützung Lob besser annehmen","stufe3":"kann Lob und Anerkennung annehmen und verarbeiten"},"intervention":["Komplimente annehmen üben","Selbstwert stärken","Positive Rückmeldungen akzeptieren"]},{"id":"AA-23","title":"Therapeutische Offenheit","stufen":{"stufe1":"hat noch Schwierigkeiten, sich auf pädagogische Unterstützung einzulassen","stufe2":"kann sich mit Vertrauensaufbau auf Unterstützung einlassen","stufe3":"kann sich auf therapeutische oder pädagogische Unterstützung einlassen"},"intervention":["Vertrauen aufbauen","Offenheit ermöglichen","Nutzen erkennen"]},{"id":"AA-24","title":"Eigene Fortschritte erkennen","stufen":{"stufe1":"hat noch Schwierigkeiten, eigene Fortschritte zu erkennen","stufe2":"kann mit Hinweisen eigene Fortschritte erkennen","stufe3":"erkennt eigene Fortschritte und Entwicklungen"},"intervention":["Reflexionsgespräche","Entwicklungsdokumentation","Erfolge würdigen"]},{"id":"AA-25","title":"Gefühle differenziert benennen","stufen":{"stufe1":"benennt Gefühle noch undifferenziert (nur gut/schlecht)","stufe2":"kann mit Hilfe Gefühle differenzierter benennen","stufe3":"kann die Gefühlslage differenziert verbalisieren"},"intervention":["Gefühlsvokabular erweitern","Nuancen erkennen","Nicht nur gut/schlecht"]},{"id":"AA-26","title":"Ursachen erkennen","stufen":{"stufe1":"hat noch Schwierigkeiten, Ursachen negativer Emotionen zu erkennen","stufe2":"kann mit Unterstützung Ursachen erkennen","stufe3":"kann die Ursache negativer Emotionen erkennen und verbalisieren"},"intervention":["Trigger identifizieren","Zusammenhänge verstehen","Kausalitäten erkennen"]},{"id":"AA-27","title":"Schnellere Regulation","stufen":{"stufe1":"braucht nach einer Krise noch lange zur Regulation","stufe2":"kann sich mit Unterstützung schneller nach einer Krise regulieren","stufe3":"kann sich nach einer Krise schneller wieder regulieren"},"intervention":["Regulationsstrategien üben","Rückkehr in Alltag","Selbstberuhigung"]},{"id":"AA-28","title":"Mit Niederlagen umgehen","stufen":{"stufe1":"hat noch Schwierigkeiten, in Gruppensituationen mit Niederlagen umzugehen","stufe2":"kann mit Unterstützung mit Niederlagen umgehen","stufe3":"kann in Gruppensituationen gut mit Niederlagen umgehen"},"intervention":["Frustrationstoleranz","Fairness entwickeln","Verlieren können"]},{"id":"AA-29","title":"Ängste differenziert kommunizieren","stufen":{"stufe1":"hat noch Schwierigkeiten, Ängste differenziert zu kommunizieren","stufe2":"kann mit Unterstützung Ängste besser kommunizieren","stufe3":"kann Ängste differenziert kommunizieren und verstehen"},"intervention":["Ängste benennen","Zusammenhänge erkennen","Auslöser identifizieren"]},{"id":"AA-30","title":"Selbst- und Fremdwahrnehmung","stufen":{"stufe1":"versteht noch nicht, wie das eigene Verhalten andere beeinflusst","stufe2":"versteht mit Erklärung die Auswirkungen des eigenen Verhaltens","stufe3":"versteht, dass das eigene Verhalten Auswirkungen auf sich und das Umfeld hat"},"intervention":["Konsequenzen reflektieren","Perspektivwechsel","Feedback annehmen"]},{"id":"AA-31","title":"Flexibilität bei Veränderungen","stufen":{"stufe1":"hat noch Schwierigkeiten, flexibel mit Veränderungen umzugehen","stufe2":"kann mit Unterstützung flexibler mit Veränderungen umgehen","stufe3":"kann flexibel mit Veränderungen umgehen"},"intervention":["Anpassungsfähigkeit üben","Unvorhergesehenes akzeptieren","Rigidität reduzieren"]},{"id":"AA-32","title":"Emotionalen Zustand verbalisieren","stufen":{"stufe1":"hat noch Schwierigkeiten, den emotionalen Zustand zu verbalisieren","stufe2":"kann mit Anregung den emotionalen Zustand verbalisieren","stufe3":"kann den emotionalen Zustand offen kommunizieren"},"intervention":["Gefühle teilen","Vertrauen aufbauen","Offenheit üben"]},{"id":"AA-33","title":"Mit Distanz reflektieren","stufen":{"stufe1":"hat noch Schwierigkeiten, mit Distanz zu Situationen zu reflektieren","stufe2":"kann mit Unterstützung mit Distanz reflektieren","stufe3":"kann mit Distanz zu einer Situation reflektieren"},"intervention":["Abstand nehmen","Nachbetrachtung","Objektivität entwickeln"]},{"id":"AA-34","title":"Selbstbewussteres Auftreten","stufen":{"stufe1":"tritt noch unsicher und zurückhaltend auf","stufe2":"tritt mit Ermutigung selbstbewusster auf","stufe3":"tritt selbstbewusst und offen auf"},"intervention":["Körperhaltung verbessern","Selbstsicherheit stärken","Erfolge wahrnehmen"]},{"id":"AA-35","title":"Stolz auf Fortschritte","stufen":{"stufe1":"hat noch Schwierigkeiten, stolz auf Fortschritte zu sein","stufe2":"kann mit Ermutigung Stolz auf Fortschritte empfinden","stufe3":"ist stolz auf Fortschritte und kann diese benennen"},"intervention":["Erfolge würdigen","Selbstanerkennung","Positive Selbstgespräche"]},{"id":"AA-36","title":"Ausgleich durch Bewegung","stufen":{"stufe1":"nutzt Bewegung noch nicht als Ausgleich","stufe2":"findet mit Anregung Ausgleich durch Bewegung","stufe3":"findet Ausgleich durch Bewegung und Sport"},"intervention":["Sportliche Aktivitäten","Energie ableiten","Körperliche Betätigung nutzen"]}],"competences_essentielles":[{"id":"CE-1","title":"Körperhygiene","stufen":{"stufe1":"braucht noch Erinnerung für die Körperhygiene","stufe2":"achtet mit wenigen Erinnerungen auf Körperhygiene","stufe3":"achtet auf Körperhygiene"},"intervention":["Routinen etablieren","Checklisten nutzen","Selbstständigkeit fördern"]},{"id":"CE-2","title":"Gesunde Ernährung","stufen":{"stufe1":"ernährt sich noch nicht ausgewogen und gesund","stufe2":"achtet mit Anleitung auf eine gesündere Ernährung","stufe3":"ernährt sich ausgewogen und gesund"},"intervention":["Ernährungswissen vermitteln","Gemeinsam kochen","Mahlzeiten planen"]},{"id":"CE-3","title":"Kochen und Zubereiten","stufen":{"stufe1":"lernt noch, einfache Mahlzeiten zuzubereiten","stufe2":"kann mit Anleitung einfache Mahlzeiten zubereiten","stufe3":"kann einfache Mahlzeiten zubereiten"},"intervention":["Rezepte ausprobieren","Küchengeräte bedienen","Lebensmittelsicherheit"]},{"id":"CE-4","title":"Einkaufen","stufen":{"stufe1":"lernt noch, selbstständig einzukaufen","stufe2":"kann mit Begleitung einkaufen","stufe3":"kann einkaufen gehen"},"intervention":["Einkaufslisten erstellen","Preise vergleichen","Bezahlvorgänge üben"]},{"id":"CE-5","title":"Haushaltsführung","stufen":{"stufe1":"braucht noch Erinnerung für die Sauberkeit des Wohnbereichs","stufe2":"kann mit Erinnerung den Wohnbereich sauber halten","stufe3":"kann den Wohnbereich sauber halten"},"intervention":["Putzplan erstellen","Ordnung halten","Aufgaben aufteilen"]},{"id":"CE-6","title":"Wäschepflege","stufen":{"stufe1":"lernt noch, Wäsche zu waschen und zu pflegen","stufe2":"kann mit Anleitung Wäsche waschen und pflegen","stufe3":"kann Wäsche waschen und pflegen"},"intervention":["Waschmaschine bedienen","Pflegesymbole verstehen","Kleidung sortieren"]},{"id":"CE-7","title":"Geldmanagement","stufen":{"stufe1":"hat noch Schwierigkeiten, Geld einzuteilen und zu verwalten","stufe2":"kann mit Unterstützung Geld einteilen","stufe3":"kann Geld einteilen und verwalten"},"intervention":["Budget erstellen","Ausgaben dokumentieren","Sparen üben"]},{"id":"CE-8","title":"Behördengänge","stufen":{"stufe1":"lernt noch, Behördengänge zu erledigen","stufe2":"kann mit Begleitung Behördengänge erledigen","stufe3":"kann Behördengänge erledigen"},"intervention":["Formulare ausfüllen","Termine vereinbaren","Dokumente organisieren"]},{"id":"CE-9","title":"Mobilität","stufen":{"stufe1":"lernt noch, öffentliche Verkehrsmittel zu nutzen","stufe2":"kann mit Anleitung öffentliche Verkehrsmittel nutzen","stufe3":"kann öffentliche Verkehrsmittel nutzen"},"intervention":["Fahrpläne lesen","Routen planen","Tickets kaufen"]},{"id":"CE-10","title":"Gesundheitsvorsorge","stufen":{"stufe1":"braucht noch Erinnerung für die Gesundheitsvorsorge","stufe2":"kümmert sich mit Erinnerung um die Gesundheit","stufe3":"kümmert sich um die eigene Gesundheit"},"intervention":["Arzttermine wahrnehmen","Medikamente einnehmen","Warnsignale erkennen"]},{"id":"CE-11","title":"Sicherheit im Alltag","stufen":{"stufe1":"hat noch Schwierigkeiten, Gefahren zu erkennen und zu vermeiden","stufe2":"kann mit Hinweisen Gefahren erkennen und vermeiden","stufe3":"kann Gefahren im Alltag erkennen und vermeiden"},"intervention":["Gefahrenquellen kennen","Notrufnummern kennen","Sicherheitsregeln beachten"]},{"id":"CE-12","title":"Mediennutzung","stufen":{"stufe1":"nutzt digitale Medien noch nicht verantwortungsvoll","stufe2":"nutzt mit Anleitung digitale Medien verantwortungsvoller","stufe3":"nutzt digitale Medien verantwortungsvoll"},"intervention":["Bildschirmzeit begrenzen","Datenschutz beachten","Kritischer Umgang mit Inhalten"]},{"id":"CE-13","title":"Tagesstruktur","stufen":{"stufe1":"hat noch Schwierigkeiten, den Tag sinnvoll zu strukturieren","stufe2":"kann mit Unterstützung den Tag strukturieren","stufe3":"kann den Tag sinnvoll strukturieren"},"intervention":["Tagesplan erstellen","Routinen einhalten","Prioritäten setzen"]},{"id":"CE-14","title":"Schlafhygiene","stufen":{"stufe1":"sorgt noch nicht für ausreichend und guten Schlaf","stufe2":"sorgt mit Erinnerung für besseren Schlaf","stufe3":"sorgt für ausreichend und guten Schlaf"},"intervention":["Schlafrhythmus etablieren","Schlafumgebung gestalten","Einschlafrituale"]},{"id":"CE-15","title":"Pünktlichkeit","stufen":{"stufe1":"hat noch Schwierigkeiten mit Pünktlichkeit","stufe2":"ist mit Erinnerung pünktlicher","stufe3":"ist pünktlich zu Terminen und Verabredungen"},"intervention":["Zeitpuffer einplanen","Erinnerungen nutzen","Vorbereitung am Vorabend"]},{"id":"CE-16","title":"Telefonieren","stufen":{"stufe1":"hat noch Schwierigkeiten, Telefongespräche zu führen","stufe2":"kann mit Vorbereitung Telefongespräche führen","stufe3":"kann Telefongespräche führen"},"intervention":["Gesprächsführung üben","Wichtige Infos notieren","Höflichkeitsformen"]},{"id":"CE-17","title":"E-Mails schreiben","stufen":{"stufe1":"lernt noch, formelle E-Mails zu verfassen","stufe2":"kann mit Anleitung formelle E-Mails verfassen","stufe3":"kann formelle E-Mails verfassen"},"intervention":["Aufbau einer E-Mail","Höfliche Formulierungen","Anhänge versenden"]},{"id":"CE-18","title":"Erste Hilfe","stufen":{"stufe1":"kennt noch keine Erste-Hilfe-Maßnahmen","stufe2":"kennt mit Übung grundlegende Erste-Hilfe-Maßnahmen","stufe3":"kann in Notfällen Erste Hilfe leisten"},"intervention":["Erste-Hilfe-Kurs","Notruf absetzen","Grundlegende Maßnahmen"]},{"id":"CE-20","title":"Berufsorientierung","stufen":{"stufe1":"kennt die eigenen beruflichen Interessen noch nicht","stufe2":"erkundet mit Unterstützung berufliche Interessen","stufe3":"kennt die eigenen beruflichen Interessen und Möglichkeiten"},"intervention":["Stärken erkunden","Berufe kennenlernen","Praktika absolvieren"]},{"id":"CE-21","title":"Bewerbung schreiben","stufen":{"stufe1":"lernt noch, eine Bewerbung zu verfassen","stufe2":"kann mit Anleitung eine Bewerbung verfassen","stufe3":"kann eine Bewerbung verfassen"},"intervention":["Lebenslauf erstellen","Anschreiben formulieren","Bewerbungsunterlagen zusammenstellen"]},{"id":"CE-22","title":"Vorstellungsgespräch","stufen":{"stufe1":"hat noch Schwierigkeiten, sich in einem Vorstellungsgespräch zu präsentieren","stufe2":"kann mit Übung sich in einem Vorstellungsgespräch präsentieren","stufe3":"kann sich in einem Vorstellungsgespräch präsentieren"},"intervention":["Selbstpräsentation üben","Fragen vorbereiten","Dresscode beachten"]},{"id":"CE-23","title":"Arbeitsorganisation","stufen":{"stufe1":"hat noch Schwierigkeiten, die Arbeit selbstständig zu organisieren","stufe2":"kann mit Anleitung die Arbeit organisieren","stufe3":"kann die Arbeit organisieren"},"intervention":["Aufgaben strukturieren","Prioritäten setzen","Fristen einhalten"]},{"id":"CE-25","title":"Umweltbewusstsein","stufen":{"stufe1":"handelt noch nicht umweltbewusst im Alltag","stufe2":"handelt mit Anleitung umweltbewusster","stufe3":"handelt umweltbewusst im Alltag"},"intervention":["Mülltrennung","Ressourcen sparen","Nachhaltigkeit verstehen"]},{"id":"CE-26","title":"Medienkonsum regulieren","stufen":{"stufe1":"hat noch Schwierigkeiten, den Medienkonsum zu regulieren","stufe2":"kann mit Unterstützung den Medienkonsum regulieren","stufe3":"kann den Medienkonsum regulieren"},"intervention":["Zeitlimits setzen","Alternativen finden","Selbstkontrolle üben"]},{"id":"CE-27","title":"Gepflegtes Erscheinungsbild","stufen":{"stufe1":"achtet noch nicht auf ein gepflegtes Erscheinungsbild","stufe2":"achtet mit Erinnerung auf ein gepflegteres Erscheinungsbild","stufe3":"achtet auf ein gepflegtes Erscheinungsbild"},"intervention":["Routinen etablieren","Selbstfürsorge","Körperbewusstsein"]},{"id":"CE-28","title":"Online-Sicherheit","stufen":{"stufe1":"hat noch Schwierigkeiten, sich sicher im Internet zu bewegen","stufe2":"kann mit Anleitung sicherer im Internet surfen","stufe3":"kann sich sicher im Internet bewegen"},"intervention":["Datenschutz beachten","Kritischer Umgang","Gefahren erkennen"]},{"id":"CE-29","title":"Realistische Erwartungen","stufen":{"stufe1":"hat noch unrealistische Erwartungen an Schule und Arbeitswelt","stufe2":"entwickelt mit Gesprächen realistischere Erwartungen","stufe3":"hat realistische Erwartungen an Schule und Arbeitswelt"},"intervention":["Berufsorientierung","Anforderungen verstehen","Ziele anpassen"]},{"id":"CE-30","title":"Krisenplan anwenden","stufen":{"stufe1":"hat noch keinen Krisenplan oder kann ihn nicht anwenden","stufe2":"kann mit Unterstützung den Krisenplan anwenden","stufe3":"kann in Krisensituationen den Krisenplan anwenden"},"intervention":["Plan erarbeiten","Strategien üben","Selbsthilfe aktivieren"]},{"id":"CE-31","title":"Gute kognitive Fähigkeiten","stufen":{"stufe1":"nutzt die eigenen kognitiven Fähigkeiten noch nicht voll","stufe2":"nutzt mit Förderung die kognitiven Fähigkeiten besser","stufe3":"hat gute kognitive Fähigkeiten und nutzt diese"},"intervention":["Stärken einsetzen","Potenzial nutzen","Förderung anbieten"]},{"id":"CE-32","title":"Wissbegierig und motiviert","stufen":{"stufe1":"zeigt noch wenig Wissbegier und Lernmotivation","stufe2":"zeigt mit Anregung mehr Wissbegier","stufe3":"zeigt Wissbegier und ist motiviert zu lernen"},"intervention":["Interessen aufgreifen","Neugier fördern","Motivation erhalten"]},{"id":"CE-33","title":"Vielfältige Interessen","stufen":{"stufe1":"hat noch wenige Interessen und Hobbys","stufe2":"entwickelt mit Anregung neue Interessen","stufe3":"hat verschiedene Interessen und Hobbys"},"intervention":["Interessen fördern","Neue Aktivitäten erkunden","Ressourcen nutzen"]}],"culture_loisirs":[{"id":"CL-1","title":"Freizeitgestaltung","stufen":{"stufe1":"hat noch Schwierigkeiten, die Freizeit sinnvoll zu gestalten","stufe2":"kann mit Anregung die Freizeit sinnvoller gestalten","stufe3":"kann die Freizeit sinnvoll gestalten"},"intervention":["Hobbys erkunden","Interessen fördern","Aktivitäten planen"]},{"id":"CL-2","title":"Sport und Bewegung","stufen":{"stufe1":"bewegt sich noch nicht regelmäßig","stufe2":"bewegt sich mit Anregung regelmäßiger","stufe3":"bewegt sich regelmäßig und treibt Sport"},"intervention":["Sportart finden","Bewegung in Alltag integrieren","Motivation aufrechterhalten"]},{"id":"CL-3","title":"Kreative Aktivitäten","stufen":{"stufe1":"gestaltet noch selten kreativ und künstlerisch","stufe2":"gestaltet mit Anregung kreativer","stufe3":"gestaltet kreativ und künstlerisch"},"intervention":["Verschiedene Techniken ausprobieren","Kreativität fördern","Ausdrucksmöglichkeiten finden"]},{"id":"CL-4","title":"Musik","stufen":{"stufe1":"beschäftigt sich noch nicht aktiv mit Musik","stufe2":"beschäftigt sich mit Anregung mehr mit Musik","stufe3":"beschäftigt sich aktiv mit Musik"},"intervention":["Instrument lernen","Musik hören und verstehen","Konzerte besuchen"]},{"id":"CL-5","title":"Lesen","stufen":{"stufe1":"liest noch nicht regelmäßig","stufe2":"liest mit Anregung regelmäßiger","stufe3":"liest regelmäßig Bücher oder andere Texte"},"intervention":["Leseinteresse wecken","Passende Lektüre finden","Lesezeit einplanen"]},{"id":"CL-6","title":"Kulturelle Teilhabe","stufen":{"stufe1":"nimmt noch nicht am kulturellen Leben teil","stufe2":"nimmt mit Anregung mehr am kulturellen Leben teil","stufe3":"nimmt am kulturellen Leben teil"},"intervention":["Kulturveranstaltungen besuchen","Museen erkunden","Theater erleben"]},{"id":"CL-7","title":"Naturerlebnis","stufen":{"stufe1":"verbringt noch wenig Zeit in der Natur","stufe2":"verbringt mit Anregung mehr Zeit in der Natur","stufe3":"verbringt regelmäßig Zeit in der Natur"},"intervention":["Spaziergänge machen","Natur beobachten","Outdoor-Aktivitäten"]},{"id":"CL-8","title":"Gesellschaftsspiele","stufen":{"stufe1":"hat noch Schwierigkeiten, Gesellschaftsspiele zu spielen und Regeln zu befolgen","stufe2":"kann mit Anleitung Gesellschaftsspiele spielen","stufe3":"kann Gesellschaftsspiele spielen und Regeln befolgen"},"intervention":["Spielregeln verstehen","Fair spielen","Gewinnen und Verlieren lernen"]},{"id":"CL-9","title":"Handwerkliche Tätigkeiten","stufen":{"stufe1":"hat noch Schwierigkeiten mit handwerklichen Arbeiten","stufe2":"kann mit Anleitung handwerklich arbeiten","stufe3":"kann handwerklich arbeiten"},"intervention":["Werkzeuge kennenlernen","Projekte durchführen","Sicherheit beachten"]},{"id":"CL-10","title":"Kochen als Hobby","stufen":{"stufe1":"kocht noch nicht gerne als Hobby","stufe2":"kocht mit Anregung gerne","stufe3":"kocht gerne und probiert neue Rezepte"},"intervention":["Rezepte sammeln","Gemeinsam kochen","Verschiedene Küchen entdecken"]},{"id":"CL-11","title":"Fotografie","stufen":{"stufe1":"beschäftigt sich noch nicht mit Fotografie","stufe2":"beschäftigt sich mit Anleitung mit Fotografie","stufe3":"fotografiert und gestaltet Bilder"},"intervention":["Kamerafunktionen lernen","Bildgestaltung üben","Bilder bearbeiten"]},{"id":"CL-12","title":"Gartenarbeit","stufen":{"stufe1":"hat noch keine Erfahrung mit Gartenarbeit","stufe2":"kann mit Anleitung im Garten arbeiten","stufe3":"kann Pflanzen pflegen und im Garten arbeiten"},"intervention":["Pflanzen kennenlernen","Gartenpflege erlernen","Verantwortung übernehmen"]},{"id":"CL-13","title":"Tanzen","stufen":{"stufe1":"drückt sich noch nicht durch Tanz aus","stufe2":"tanzt mit Anregung mehr","stufe3":"drückt sich durch Tanz und Bewegung aus"},"intervention":["Tanzstile ausprobieren","Rhythmusgefühl entwickeln","Tanzveranstaltungen besuchen"]},{"id":"CL-14","title":"Film und Kino","stufen":{"stufe1":"schaut Filme noch ohne bewusste Reflexion","stufe2":"kann mit Anleitung über Filme diskutieren","stufe3":"schaut bewusst Filme und kann darüber diskutieren"},"intervention":["Filmgenres kennenlernen","Filme analysieren","Kinobesuche planen"]},{"id":"CL-15","title":"Ehrenamtliches Engagement","stufen":{"stufe1":"engagiert sich noch nicht ehrenamtlich","stufe2":"engagiert sich mit Anregung ehrenamtlich","stufe3":"engagiert sich ehrenamtlich für andere"},"intervention":["Engagement-Möglichkeiten finden","Regelmäßige Mitarbeit","Sinn und Erfüllung erleben"]},{"id":"CL-16","title":"Vereinsmitgliedschaft","stufen":{"stufe1":"ist noch nicht Mitglied in einem Verein","stufe2":"erkundet mit Unterstützung passende Vereine","stufe3":"ist Mitglied in einem Verein oder einer Gruppe"},"intervention":["Passenden Verein finden","Regelmäßig teilnehmen","Gemeinschaft erleben"]},{"id":"CL-18","title":"Entspannung","stufen":{"stufe1":"kennt und nutzt noch keine Entspannungstechniken","stufe2":"erlernt mit Anleitung Entspannungstechniken","stufe3":"kennt und nutzt Entspannungstechniken"},"intervention":["Entspannungsmethoden erlernen","Regelmäßig anwenden","Stressabbau"]},{"id":"CL-19","title":"Soziale Medien","stufen":{"stufe1":"nutzt soziale Medien noch nicht verantwortungsvoll","stufe2":"nutzt mit Anleitung soziale Medien verantwortungsvoller","stufe3":"nutzt soziale Medien verantwortungsvoll"},"intervention":["Datenschutz beachten","Zeit begrenzen","Positiver Umgang"]}]},"zieleFremd":{"V-1":{"fr":["Je montre que je perçois un stimulus sensoriel."],"en":["I look at the teacher when they touch me."]},"V-2":{"fr":["Je me tourne vers la source d'un stimulus sensoriel."],"en":["I look at the pictures the teacher shows me."]},"V-3":{"fr":["Je regarde ce qu'on me montre.","J'écoute quand l'enseignant(e) parle."],"en":["I look at what is being shown to me.","I listen when the teacher says something."]},"V-4":{"fr":["Je réagis spontanément par une action motrice à un stimulus simple."],"en":["When the teacher reaches out their hand, I take it."]},"V-5":{"fr":["Je construis une tour quand on me donne des cubes.","Je renvoie le ballon quand l'enseignant(e) me le lance."],"en":["I build a tower when I am given building blocks.","I throw the ball back when the teacher throws it to me."]},"V-6":{"fr":["Le matin, j'accroche ma veste au portemanteau.","Quand la sonnerie retentit, je mets ma veste."],"en":["In the morning I hang my jacket on the hook.","When the bell rings, I put on my jacket."]},"V-7":{"fr":["Je range les livres dans l'étagère quand l'enseignant(e) me le demande.","Je remets le matériel scolaire à sa place."],"en":["I put the books on the shelf when the teacher says so.","I put school materials in the right place."]},"V-8":{"fr":["Je reconnais les routines et je change d'activité sans aide physique."],"en":["When the teacher says we are going to recess, I clear my desk."]},"V-9":{"fr":["Pendant la récréation, je joue au ballon sur le terrain de football.","Après le temps de jeu, je range mon jeu dans l'étagère."],"en":["At recess I use the soccer ball on the soccer field.","After playtime I put my game back on the shelf."]},"V-10":{"fr":["J'attends que l'enseignant(e) m'appelle par mon nom.","Je lève la main et j'attends mon tour."],"en":["I wait until the teacher calls me by name.","I raise my hand and wait until it is my turn."]},"V-11":{"fr":["Je reste assis(e) pendant l'exercice de mathématiques.","Pendant les moments de travail, je reste assis(e) à ma place."],"en":["I stay seated during the math task.","During work phases I stay in my seat."]},"V-12":{"fr":["Je participe au cours d'éducation physique.","Je participe à la pause active."],"en":["I participate during physical education.","I join in during the movement break."]},"V-13":{"fr":["Je m'assois dans le cercle du matin quand la journée commence.","Je lève la main en classe."],"en":["I sit down in the morning circle when the day begins.","I raise my hand in class."]},"V-14":{"fr":["J'accepte les félicitations des autres et je garde le contrôle.","Quand on me félicite, je suis content(e) et je reste raisonnable."],"en":["I accept praise from others and keep control.","When I am praised, I am happy and behave reasonably."]},"V-15":{"fr":["Quand j'ai compris une tâche, je la fais seul(e).","Je termine une tâche que j'ai commencée."],"en":["When I understand a task, I solve it on my own.","I finish a task I have started."]},"V-16":{"fr":["Je dis quelles sont nos règles et nos objectifs de classe.","Je connais les règles qui permettent à tout le monde de se sentir bien."],"en":["I can say what our class rules and goals are.","I know the rules that make sure everyone feels comfortable."]},"V-17":{"fr":["Je dis pourquoi je dois me comporter de manière aimable et pacifique.","J'explique pourquoi nous avons des objectifs de classe."],"en":["I say why I should behave in a friendly and peaceful way.","I explain why our class goals exist."]},"V-18":{"fr":["Je dis comment je pourrais me comporter autrement et de manière appropriée.","Je réfléchis à la manière de me comporter plus calmement."],"en":["I say how I could behave differently and appropriately.","I think about how I can behave more peacefully."]},"V-19":{"fr":["J'accepte la décision du groupe.","Quand je suis choisi(e) comme chef, j'assume cette responsabilité."],"en":["I accept the group's decision.","When I am chosen as leader, I take responsibility."]},"V-20":{"fr":["Quand d'autres enfants se disputent, je reste calme.","Même quand les autres se comportent mal, je garde un bon comportement."],"en":["When other children argue, I stay calm.","Even when others behave inappropriately, I keep my good behavior."]},"V-21":{"fr":["Je garde le contrôle de mon comportement pendant les activités de groupe.","Lors des transitions entre les activités, je reste calme."],"en":["I keep control of my behavior during group activities.","I stay calm during transitions between activities."]},"V-22":{"fr":["Je remarque quand j'ai fait des progrès.","Je peux décrire ce que je ne savais pas encore faire avant."],"en":["I recognize when I have improved.","I can describe what I could not do before."]},"V-23":{"fr":["Je reste calme quand le programme change.","Je m'adapte quand les choses ne se passent pas comme prévu."],"en":["I stay calm when the plan changes.","I adapt when things go differently than planned."]},"V-24":{"fr":["J'essaie de nouvelles activités et je reste calme.","Lors de nouvelles expériences, je garde le contrôle de moi-même."],"en":["I try new activities and stay calm while doing so.","During new experiences I behave with self-control."]},"V-25":{"fr":["J'applique les comportements alternatifs dont nous avons parlé.","Dans les situations difficiles, j'utilise les stratégies que j'ai apprises."],"en":["I apply the alternative behaviors we have discussed.","In difficult situations I use the strategies I have learned."]},"V-26":{"fr":["Quand quelqu'un me provoque, je reste calme.","Je ne me laisse pas provoquer."],"en":["When someone provokes me, I stay calm.","I do not let myself be provoked."]},"V-27":{"fr":["J'assume la responsabilité de mon comportement.","J'accepte les conséquences de mon comportement."],"en":["I take responsibility for my behavior.","I accept the consequences of my behavior."]},"V-28":{"fr":["Quand il y a un problème, je fais des propositions constructives.","J'aide à résoudre les conflits."],"en":["When there are problems, I make constructive suggestions.","I help to resolve conflicts."]},"V-29":{"fr":["Je développe de nouvelles habitudes en lien avec le monde du travail."],"en":["I develop habits that will help me in my working life."]},"V-30":{"fr":["Je cherche un rôle positif dans le groupe.","J'apporte une contribution positive au groupe."],"en":["I look for a positive role in the group.","I contribute positively to the group."]},"V-31":{"fr":["Je comprends et j'accepte les règles et les lois.","Je respecte les règles à l'école et dans les lieux publics."],"en":["I understand and accept rules and laws.","I follow the rules at school and in public."]},"V-32":{"fr":["Je soutiens les règles qui améliorent la vie en commun.","Je prends mes responsabilités."],"en":["I support rules that improve community life.","I take personal responsibility."]},"V-33":{"fr":["Je résous mes problèmes en réfléchissant.","J'analyse les situations et je trouve mes propres solutions."],"en":["I solve my problems by thinking about them.","I analyze situations and find my own solutions."]},"K-1":{"fr":["Je produis des sons pour m'exprimer."],"en":["I produce different sounds."]},"K-2":{"fr":["Je me tourne vers la personne qui parle."],"en":["I look at the person who is speaking."]},"K-3":{"fr":["Je réponds à un stimulus verbal par un mouvement ou une action."],"en":["When someone says something, I respond to it."]},"K-4":{"fr":["Je réponds par une approximation de mots aux questions de l'adulte."],"en":["When I am asked something, I answer."]},"K-5":{"fr":["J'utilise spontanément des mots pour décrire ou demander quelque chose."],"en":["When the teacher shows me something, I respond."]},"K-6":{"fr":["Je produis des mots reconnaissables pour obtenir une réponse d'un adulte."],"en":["I speak to the teacher when I want something."]},"K-7":{"fr":["Je produis des mots reconnaissables pour obtenir une réponse d'un autre enfant."],"en":["I speak to the other child when I want something."]},"K-8":{"fr":["Je produis une séquence significative de mots de manière autonome."],"en":["When I want to say something, I make a whole sentence."]},"K-9":{"fr":["Je réponds aux questions par des mots significatifs et pertinents."],"en":["I answer in a way that everyone can understand."]},"K-10":{"fr":["Je montre un vocabulaire réceptif correspondant à mon âge."],"en":["I listen so that I learn new words."]},"K-11":{"fr":["J'utilise spontanément des séquences de mots appropriées."],"en":["I speak politely when I want something."]},"K-12":{"fr":["J'initie spontanément un échange d'informations avec un adulte."],"en":["When I need help, I speak to the teacher."]},"K-13":{"fr":["Je décris des caractéristiques simples de moi-même et des autres."],"en":["I say what I am good at and what others are good at."]},"K-14":{"fr":["J'initie spontanément un échange d'informations avec un autre enfant."],"en":["I tell the children in my class about something."]},"K-15":{"fr":["J'utilise spontanément des mots pour décrire mes expériences personnelles."],"en":["I talk about things I have experienced."]},"K-16":{"fr":["J'utilise le langage pour montrer mes réactions émotionnelles de manière appropriée."],"en":["When I am angry, I say what bothers me without hurting anyone."]},"K-17":{"fr":["Je participe aux discussions de groupe de manière constructive."],"en":["I take part sensibly in class discussions."]},"K-18":{"fr":["J'exprime ma fierté concernant mon propre travail."],"en":["I am proud of the work I have done."]},"K-19":{"fr":["Je décris mes attributs caractéristiques, mes forces et mes faiblesses."],"en":["I describe my strengths and weaknesses."]},"K-20":{"fr":["Je décris les attributs et caractéristiques des autres."],"en":["I describe others without hurting them."]},"K-21":{"fr":["Je reconnais les sentiments des autres."],"en":["I recognize and describe the feelings of others."]},"K-22":{"fr":["J'exprime ma fierté concernant les réalisations du groupe."],"en":["I show pride in our group achievement."]},"K-23":{"fr":["Je transmets mes sentiments par le biais de médias créatifs."],"en":["I express my feelings through art, music or dance."]},"K-24":{"fr":["Je montre une prise de conscience de mes propres progrès."],"en":["I recognize my own progress."]},"K-25":{"fr":["J'explique comment mon comportement influence celui des autres."],"en":["I explain how my behavior influences others."]},"K-26":{"fr":["J'exprime mes propres sentiments de façon appropriée au sein du groupe."],"en":["I express my feelings with appropriate words."]},"K-27":{"fr":["J'utilise le langage pour établir des relations positives."],"en":["I speak in a friendly way to build relationships."]},"K-28":{"fr":["J'utilise le langage pour féliciter et soutenir les autres."],"en":["I praise others when they have done something well."]},"K-29":{"fr":["Je décris des relations de cause à effet concernant les comportements."],"en":["I describe the connection between feelings and behavior."]},"K-30":{"fr":["Je fais des déclarations verbales complexes avec un contenu figuratif ou abstrait."],"en":["I express myself in complex sentences."]},"K-31":{"fr":["J'utilise un langage conciliant dans des situations provocantes."],"en":["When someone provokes me, I try to calm things down."]},"K-32":{"fr":["Je motive les autres en reconnaissant leurs contributions."],"en":["I acknowledge the contributions of others."]},"K-33":{"fr":["Je décris différents motifs et valeurs dans un contexte social."],"en":["I understand that people have different motives."]},"K-34":{"fr":["J'exprime spontanément mes valeurs et idéaux."],"en":["I describe what is important to me in life."]},"K-35":{"fr":["J'utilise mes compétences en communication pour entretenir des relations positives."],"en":["I sustain my relationships through good communication."]},"SOZ-1":{"fr":["Je réagis au contact verbal ou physique d'un adulte ou d'un autre enfant."],"en":["When the teacher touches me, I turn around."]},"SOZ-2":{"fr":["Je porte mon attention sur le comportement des autres."],"en":["When the teacher tells me to watch, I do so."]},"SOZ-3":{"fr":["Je réagis quand un adulte mentionne mon nom."],"en":["When the teacher calls me by name, I look over."]},"SOZ-4":{"fr":["Je m'occupe seul avec un jeu organisé."],"en":["I play alone when necessary."]},"SOZ-5":{"fr":["J'interagis non verbalement avec les adultes pour exprimer mes besoins."],"en":["When I want something, I point at the object."]},"SOZ-6":{"fr":["Je vais vers l'adulte quand il me le demande."],"en":["When the teacher calls me, I go to them."]},"SOZ-7":{"fr":["Je comprends et suis les demandes verbales qui me sont adressées."],"en":["When the teacher asks me to do something, I do it."]},"SOZ-8":{"fr":["Je produis des mots reconnaissables pour obtenir une réponse d'un adulte."],"en":["I speak to the teacher when I want something."]},"SOZ-9":{"fr":["Je montre un début de conscience de moi-même."],"en":["I talk about myself and use: I, my, me."]},"SOZ-10":{"fr":["Je participe spontanément à des jeux parallèles."],"en":["I play alone next to others."]},"SOZ-11":{"fr":["Je produis des mots reconnaissables pour obtenir une réponse d'un autre enfant."],"en":["I speak to the other child when I want something."]},"SOZ-12":{"fr":["Je cherche le contact avec un adulte connu."],"en":["When class begins, I greet the teacher."]},"SOZ-13":{"fr":["J'utilise spontanément la fantaisie pour jouer."],"en":["I make up things to play on my own."]},"SOZ-14":{"fr":["J'attends sans intervention physique d'un adulte."],"en":["I wait until it is my turn."]},"SOZ-15":{"fr":["J'établis un contact social approprié avec un autre enfant."],"en":["I approach my classmates in a friendly way."]},"SOZ-16":{"fr":["Je participe à une activité en partageant."],"en":["I share with other children."]},"SOZ-17":{"fr":["Je participe avec succès à un jeu interactif avec un autre enfant."],"en":["I play peacefully together with other children."]},"SOZ-18":{"fr":["Je coopère de façon autonome avec d'autres enfants."],"en":["In partner work I work together with another child."]},"SOZ-19":{"fr":["Je partage spontanément le matériel et j'alterne sans aide."],"en":["I share and take turns with other children."]},"SOZ-20":{"fr":["J'imite spontanément le comportement approprié d'un autre enfant."],"en":["When others behave well, I do the same."]},"SOZ-21":{"fr":["Je décris des situations sociales avec des évaluations simples."],"en":["I say whether I think something is right or wrong."]},"SOZ-22":{"fr":["Je dirige ou montre quelque chose dans une activité de groupe."],"en":["I show or explain to others how something is done."]},"SOZ-23":{"fr":["Je participe de manière appropriée à une activité proposée par un autre."],"en":["I accept suggestions from my classmates."]},"SOZ-24":{"fr":["Je décris mes propres expériences dans l'ordre chronologique."],"en":["I tell in the correct order what happened."]},"SOZ-25":{"fr":["Je montre le début d'une amitié par préférence pour un enfant."],"en":["I make contact with a child I especially like."]},"SOZ-26":{"fr":["Je sollicite le soutien ou les éloges d'un autre enfant."],"en":["I ask other children for help."]},"SOZ-27":{"fr":["J'aide les autres à suivre les règles du groupe."],"en":["I kindly remind others of the group rules."]},"SOZ-28":{"fr":["Je m'identifie à des adultes dirigeants ou des personnalités publiques."],"en":["I model myself on positive role models."]},"SOZ-29":{"fr":["Je décris des expériences sociales dans l'ordre chronologique."],"en":["I talk about group experiences."]},"SOZ-30":{"fr":["Je propose spontanément une activité de groupe appropriée."],"en":["I suggest activities to the group."]},"SOZ-31":{"fr":["J'exprime que je suis conscient que mes actions diffèrent de celles des autres."],"en":["I recognize differences between my behavior and that of others."]},"SOZ-32":{"fr":["J'écoute et respecte les idées et avis des autres."],"en":["I listen to others and respect their opinion."]},"SOZ-33":{"fr":["Je montre ouvertement mon intérêt pour l'avis des autres sur moi."],"en":["I am interested in what others think about me."]},"SOZ-34":{"fr":["Je propose des solutions constructives aux problèmes de groupe."],"en":["When there are problems, I make constructive suggestions."]},"SOZ-35":{"fr":["Je reconnais et différencie des valeurs opposées dans des situations sociales."],"en":["I distinguish between right and wrong."]},"SOZ-36":{"fr":["Je tire des conclusions de situations sociales."],"en":["I learn from social situations."]},"SOZ-37":{"fr":["Je montre que je comprends et respecte les sentiments des autres."],"en":["I understand how others feel."]},"SOZ-38":{"fr":["J'interagis avec succès dans différents rôles sociaux."],"en":["I can take on different roles in a group."]},"SOZ-39":{"fr":["Je prends des décisions fondées sur mes propres valeurs et principes."],"en":["I decide according to my own values."]},"SOZ-40":{"fr":["Je décris mes objectifs et l'écart entre ce qui est et ce qui est désiré."],"en":["I have a realistic view of my strengths and weaknesses."]},"SOZ-41":{"fr":["Je maintiens et entretiens des relations de groupe et individuelles."],"en":["I build lasting friendships."]},"KOG-1":{"fr":["Je me tourne vers la source d'un stimulus sensoriel."],"en":["I turn toward things that interest me."]},"KOG-2":{"fr":["Je maintiens mon attention dirigée vers un stimulus pendant un court instant."],"en":["I pay attention to one thing for a short time."]},"KOG-3":{"fr":["Je reconnais spontanément des personnes et des objets familiers."],"en":["I recognize familiar people and things."]},"KOG-4":{"fr":["Je réagis par une action motrice à des stimuli complexes ou verbaux."],"en":["I respond to instructions with actions."]},"KOG-5":{"fr":["J'imite spontanément les actions simples de l'adulte."],"en":["I imitate simple actions."]},"KOG-6":{"fr":["Je montre des habiletés motrices correspondant au niveau de 18 mois."],"en":["I demonstrate basic motor skills."]},"KOG-7":{"fr":["Je comprends le nom des objets familiers et réagis correctement."],"en":["I understand the names of familiar things."]},"KOG-8":{"fr":["Je réponds par une approximation de mots aux questions de l'adulte."],"en":["I answer questions with words."]},"KOG-9":{"fr":["J'utilise spontanément des mots pour décrire ou demander quelque chose."],"en":["I use words on my own."]},"KOG-10":{"fr":["Je place chaque forme dans l'emplacement qui lui correspond."],"en":["I put each shape into the right space."]},"KOG-11":{"fr":["J'identifie mes propres parties du corps."],"en":["I point to and name my body parts."]},"KOG-12":{"fr":["Je détecte des détails simples dans les images."],"en":["I recognize details in pictures."]},"KOG-13":{"fr":["Je trie des objets selon leurs caractéristiques."],"en":["I sort things by characteristics."]},"KOG-14":{"fr":["Je nomme des choses familières sur des illustrations simples."],"en":["I name pictures with the right words."]},"KOG-15":{"fr":["Je reconnais la valeur utilitaire d'objets familiers."],"en":["I know what things are used for."]},"KOG-16":{"fr":["J'effectue des activités de coordination corporelle au niveau d'un enfant de trois ans."],"en":["I move in an age-appropriate way."]},"KOG-17":{"fr":["Je détecte deux images identiques parmi trois."],"en":["I find pictures that are the same."]},"KOG-18":{"fr":["J'exécute des activités de motricité fine au niveau d'un enfant de trois ans."],"en":["I can make fine movements."]},"KOG-19":{"fr":["Je détecte l'objet différent parmi trois."],"en":["I find the one that is different."]},"KOG-20":{"fr":["Je comprends au moins trois opposés simples."],"en":["I know opposites like big/small."]},"KOG-21":{"fr":["Je catégorise des images selon leurs caractéristiques communes."],"en":["I sort things into groups."]},"KOG-22":{"fr":["Je compte jusqu'à 4 dans le bon ordre en pointant les objets."],"en":["I count to 4."]},"KOG-23":{"fr":["J'identifie quatre couleurs et trois formes."],"en":["I know colors and shapes."]},"KOG-24":{"fr":["J'identifie les images identiques et différentes en alternance."],"en":["I can switch between finding what is the same and what is different."]},"KOG-25":{"fr":["Je compte jusqu'à 10."],"en":["I count to 10."]},"KOG-26":{"fr":["J'effectue des activités de coordination œil-main au niveau d'un enfant de cinq ans."],"en":["My eyes and hands work well together."]},"KOG-27":{"fr":["Je distingue les chiffres, les dessins et les lettres majuscules."],"en":["I tell numbers from letters."]},"KOG-28":{"fr":["J'effectue des activités de coordination corporelle au niveau d'un enfant de cinq ans."],"en":["I move like a 5-year-old."]},"KOG-29":{"fr":["Je détecte des groupes d'objets jusqu'à 5 sans compter."],"en":["I recognize small quantities at a glance."]},"KOG-30":{"fr":["Je répète ce que j'ai appris par cœur."],"en":["I know songs and rhymes by heart."]},"KOG-31":{"fr":["J'arrange des images d'une histoire dans l'ordre correct."],"en":["I put pictures in the correct order."]},"KOG-32":{"fr":["J'exécute des habiletés de coordination œil-main au niveau d'un enfant de six ans."],"en":["I can work precisely with my hands."]},"KOG-33":{"fr":["J'effectue des activités de coordination corporelle au niveau d'un enfant de six ans."],"en":["I can move well."]},"KOG-34":{"fr":["Je lis un vocabulaire de base de 50 mots."],"en":["I read simple words."]},"KOG-35":{"fr":["Je reconnais et écris des nombres jusqu'à 10."],"en":["I write the numbers from 1 to 10."]},"KOG-36":{"fr":["J'écris un vocabulaire de base d'au moins 50 mots."],"en":["I write simple words."]},"KOG-37":{"fr":["J'écoute une histoire et comprends les faits et la séquence des événements."],"en":["I understand stories I hear."]},"KOG-38":{"fr":["J'explique le comportement des autres en reconnaissant les causes et les effets."],"en":["I explain why someone does something."]},"KOG-39":{"fr":["Je lis des phrases de base en comprenant le sens."],"en":["I understand what I read."]},"KOG-40":{"fr":["Je maîtrise l'addition et la soustraction jusqu'à 9."],"en":["I add and subtract up to 9."]},"KOG-41":{"fr":["J'identifie des éléments illogiques dans des situations simples."],"en":["I recognize when something is not right."]},"KOG-42":{"fr":["Je rédige des phrases simples pour répondre à des questions sur une histoire."],"en":["I write answers in complete sentences."]},"KOG-43":{"fr":["Je maîtrise au moins deux habiletés physiques ou jeux sportifs."],"en":["I can take part in sports and movement games."]},"KOG-44":{"fr":["Je formule et écris librement des phrases simples."],"en":["I write my own sentences."]},"KOG-45":{"fr":["J'applique des concepts numériques relatifs à l'addition, la soustraction, le temps et l'argent."],"en":["I calculate with time and money."]},"KOG-46":{"fr":["Je lis et explique les termes quantitatifs relatifs au temps, à la longueur et au volume."],"en":["I understand units of measurement."]},"KOG-47":{"fr":["Je lis un texte et parle du personnage principal et de l'intrigue."],"en":["I read stories and retell them."]},"KOG-48":{"fr":["J'effectue des opérations de multiplication et de division."],"en":["I calculate with larger numbers."]},"KOG-49":{"fr":["J'écris pour informer, décrire des événements ou communiquer mes sentiments."],"en":["I write to communicate."]},"KOG-50":{"fr":["Je maîtrise la multiplication et la division jusqu'à 100."],"en":["I multiply and divide up to 100."]},"KOG-51":{"fr":["Je lis pour le plaisir et pour obtenir des informations."],"en":["I enjoy reading to learn new things."]},"KOG-52":{"fr":["Je calcule la valeur monétaire jusqu'à 10€."],"en":["I calculate with money up to 10 euros."]},"KOG-53":{"fr":["Je décris des personnages fictifs et explique leurs motifs."],"en":["I understand characters from stories."]},"KOG-54":{"fr":["J'utilise des règles grammaticales pour écrire correctement."],"en":["I write with correct grammar."]},"KOG-55":{"fr":["Je reconnais et différencie des valeurs opposées dans des situations sociales."],"en":["I recognize different values."]},"KOG-56":{"fr":["J'utilise des concepts quantitatifs pour résoudre des problèmes logiques."],"en":["I solve problems with units of measurement."]},"KOG-57":{"fr":["Je sollicite l'opinion des autres sur les problèmes d'actualité."],"en":["I take an interest in current topics."]},"KOG-58":{"fr":["Je distingue les faits des opinions dans les textes."],"en":["I distinguish facts from opinions."]},"KOG-59":{"fr":["Je détecte des comportements illogiques et incohérents dans les situations sociales."],"en":["I recognize contradictory behavior."]},"KOG-60":{"fr":["Je résous des problèmes mathématiques avec des fractions et nombres décimaux."],"en":["I solve difficult word problems."]},"KOG-61":{"fr":["Je résous des problèmes personnels par perspicacité et analyse."],"en":["I solve problems by thinking them through."]},"KOG-62":{"fr":["J'applique mes compétences académiques dans des activités de la vie quotidienne."],"en":["I use my knowledge in everyday life."]}},"hinweise":{},"richtziel":["","Auf die Umwelt mit Freude reagieren","Auf die Umwelt mit Erfolg reagieren","Fähigkeiten zur erfolgreichen Gruppenteilnahme erwerben","Sich in Gruppenprozesse einbringen","Individuelle/gruppenbezogene Fähigkeiten in neuen Situationen anwenden"],"dsStufenAlter":{"1":[0,2],"2":[2,5],"3":[6,9],"4":[10,12],"5":[13,16]}};
