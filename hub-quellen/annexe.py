# -*- coding: utf-8 -*-
"""Annexe Junglinster: den Hub auf das Team der Annexe zuschneiden (wiederholbar).

baue-hub.py ruft anpassen(s) auf, nachdem es den Hub zusammengesetzt hat.
Die übrigen Dateien in hub-quellen/ sind dieselben wie im gemeinsamen Stand
(Branch „Unified“). Verbesserungen von dort übernimmt man so: die Dateien ersetzen
(ohne datenbank.js/.css), dann „python3 hub-quellen/baue-hub.py“. Passt eine
Ersetzung hier nicht mehr, weil sich der Wortlaut dort geändert hat, bricht der
Bau mit einer Meldung ab – dann diese Ersetzung an den neuen Wortlaut anpassen.

Was angepasst wird:
  1. Nur ein Team: keine Team-Wahl beim Konto, keine „Stelle“, kein „Weitergeben“
     an eine andere Stelle, Teamliste ohne Team-Spalte
  2. Ohne Datenbank: das Modul fehlt; Adresse, Titel und Texte dazu sind entfernt
     (der Befundbericht ist dabei – für alle, nicht nur für ein Diagnostik-Team);
     Kompass und Begleitplan lesen die Angaben der Fiche über CDSE_FICHE_DATEN
  3. Ohne Journal: Übernahme und frühere Screenings nur aus dem Klassenbuch
  4. Texte: Annexe statt ganzes CDSE, nirgends „ISA“, Anleitung für die Annexe
     (Formulartexte der offiziellen Fiche de renseignement bleiben, wie sie sind)
"""

TITEL = 'Annexe Junglinster'

# Ohne Datenbank: Kompass und Begleitplan lesen Cycle, Ankunft, Erstsprache, Helfernetz und Kernangaben
# direkt aus der Fiche (d.fiche, d.person) – nach denselben Regeln wie die Datenbank im gemeinsamen Stand.
# Nur die beiden Funktionen, die Kompass und Begleitplan dort aufrufen (datensatz, kernFehlt).
FICHE_DATEN_JS = r"""<script>
/* =====================================================================
   Annexe Junglinster — Angaben der Fiche für Kompass und Begleitplan
   ---------------------------------------------------------------------
   Die Datenbank fehlt in der Annexe. Kompass und Begleitplan lesen
   Cycle, Ankunft, Erstsprache, Helfernetz, Sorgerecht und die
   Kernangaben deshalb hier aus der Fiche de renseignement.
   ===================================================================== */
window.CDSE_FICHE_DATEN=(function(){
'use strict';
function txt(v){return v==null?'':String(v).trim();}
function norm(s){return txt(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');}
function pad2(n){return (n<10?'0':'')+n;}
function iso(v){
  var s=txt(v), m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m){return m[1]+'-'+m[2]+'-'+m[3];}
  m=/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(s);
  if(m&&+m[2]>=1&&+m[2]<=12&&+m[1]>=1&&+m[1]<=31){return m[3]+'-'+pad2(+m[2])+'-'+pad2(+m[1]);}
  return '';
}
function istLeer(v){return v==null||v===''||(Array.isArray(v)&&!v.length);}
function liste(v){return Array.isArray(v)?v:[];}
/* Erstsprache vereinheitlichen: [Code, Wörter, Kürzel (nur als ganze Angabe)] */
var SPRACHEN=[
  ['LU',['luxemburgisch','luxembourgeois','luxembourgeoise','letzebuergesch','luxemburgish','luxembourgish','lux'],['lu','lb','ltz']],
  ['FR',['franzosisch','francais','francaise','french'],['fr']],
  ['DE',['deutsch','allemand','allemande','german'],['de']],
  ['PT',['portugiesisch','portugais','portugaise','portuguese','portugues'],['pt']],
  ['EN',['englisch','anglais','anglaise','english'],['en']],
  ['IT',['italienisch','italien','italienne','italian','italiano'],['it']],
  ['ES',['spanisch','espagnol','espagnole','spanish','espanol'],['es']],
  ['CV',['kapverdisch','capverdien','capverdienne','cap-verdien','cap-verdienne','kriolu','crioulo','caboverdiano'],['cv','kea']],
  ['SQ',['albanisch','albanais','albanaise','albanian','shqip'],['sq']],
  ['BKS',['bosnisch','kroatisch','serbisch','serbokroatisch','montenegrinisch','bosniaque','croate','serbe','serbo-croate','bosnian','croatian','serbian'],['bks','bs','hr','sr']],
  ['AR',['arabisch','arabe','arabic'],['ar']],
  ['UK',['ukrainisch','ukrainien','ukrainienne','ukrainian'],['uk']],
  ['RU',['russisch','russe','russian'],['ru']]
];
function spracheGruppe(v){
  var s=norm(v);if(!s){return '';}
  var ganz=s.replace(/[^a-z]/g,''), i, j;
  for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][2].indexOf(ganz)>=0){return SPRACHEN[j][0];}}
  var w=s.split(/[^a-z-]+/).filter(Boolean);
  for(i=0;i<w.length;i++){for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][1].indexOf(w[i])>=0){return SPRACHEN[j][0];}}}
  for(i=0;i<w.length;i++){for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][1].some(function(x){return x.length>4&&w[i].indexOf(x)===0;})){return SPRACHEN[j][0];}}}
  return 'andere';
}
/* Cycle aus der Klasse: C1–C4, ES (Enseignement secondaire), sonst „andere“ */
function cycleVon(k){
  var s=txt(k);if(!s){return '';}
  var u=norm(s).toUpperCase().replace(/\s+/g,'');
  if(/^PRECOCE/.test(u)){return 'C1';}
  var m=/^C(?:YCLE)?([1-4])/.exec(u)||/^([1-4])(?:[.\/-]?[1-3])?$/.exec(u);
  if(m){return 'C'+m[1];}
  if(/^S[1-7]$/.test(u)||/^[1-7](E|EME|IEME|ERE|RE|G|P|C|I|IEC|T|AD|BI|GCC|PRO|ES|ESC|ESG)?$/.test(u)||/(DAP|CCP|CIP|LYCEE|SECONDAIRE|ESG|ESC)/.test(u)){return 'ES';}
  return 'andere';
}
function rolleNorm(f){
  var s=norm(f);if(!s){return 'Rolle nicht angegeben';}
  if(/grand|gross|\boma\b|\bopa\b|bomi|bopi/.test(s)){return 'Großeltern';}
  if(/accueil|pflege|foster/.test(s)){return 'Pflegefamilie';}
  if(/\b(mere|mutter|maman|mamm|mama|mother)\b/.test(s)){return 'Mutter';}
  if(/\b(pere|vater|papa|papp|father)\b/.test(s)){return 'Vater';}
  if(/tuteur|tutrice|vormund|tutelle|guardian/.test(s)){return 'Vormund';}
  if(/foyer|heim/.test(s)){return 'Foyer';}
  return txt(f);
}
var MASSNAHMEN=['diagnostic','cgPro','cgEltern','isa','atelier','reeducation','annexe','cdp','cst'];
/* datensatz(d): die Angaben, die Kompass und Begleitplan brauchen (Namen wie in der Datenbank) */
function datensatz(d){
  d=d||{};
  var p=d.person||{}, f=d.fiche||{}, c=f.cdse||{}, klasse=txt((f.schule||{}).klasse)||txt(p.klasse), dienste=[], sorge=[], ms=[];
  function dienst(t){t=txt(t);if(t&&dienste.map(norm).indexOf(norm(t))<0){dienste.push(t);}}
  liste(f.intervenants).forEach(function(i){if(i&&typeof i==='object'){dienst(i.institution);}});
  var mr=(f.ef||{}).maisonRelais;if(mr&&typeof mr==='object'&&[mr.name,mr.adresse,mr.tel,mr.mail].some(txt)){dienst('Maison Relais');}
  liste(f.vertreter).forEach(function(v){if(v&&v.autoritaet===true){var r=rolleNorm(v.funktion);if(sorge.indexOf(r)<0){sorge.push(r);}}});
  MASSNAHMEN.forEach(function(k){if(c[k]&&c[k].aktiv===true){ms.push(k);}});
  liste(c.sonstige).forEach(function(s){if(s&&typeof s==='object'&&(s.aktiv===true||(s.aktiv!==false&&(iso(s.von)||iso(s.bis))))){ms.push(txt(s.label)||'sonstige');}});
  var scas=liste(f.intervenants).some(function(i){var t=norm(i&&i.institution);return /\bscas\b/.test(t)||/service central d.?assistance sociale/.test(t);});
  return {name:[txt(p.nachname),txt(p.vorname)].filter(Boolean).length===2?txt(p.nachname)+', '+txt(p.vorname):'',geburtsdatum:iso(p.geburtsdatum),matricule:txt(p.matricule),
    schule:txt((f.schule||{}).name)||txt(p.schule),klasse:klasse,cycle:cycleVon(klasse),ankunft:iso(f.ankunft),erstsprache:txt(f.ersteSprache),sprache:spracheGruppe(f.ersteSprache),
    dienste:dienste,scas:scas?'ja':'',sorgerecht:sorge,vertreter:liste(f.vertreter).filter(function(v){return v&&txt(v.name);}).map(function(v){return txt(v.name);}),massnahmen:ms};
}
/* Kernangaben der Fiche, die noch fehlen: [{key, label, teil}] (für den Begleitplan) */
var KERN=[['name','Name','person'],['geburtsdatum','Geburtsdatum','person'],['matricule','Matricule','person'],['vertreter','Erziehungsberechtigte','vertreter'],
  ['schule','Schule','schule'],['klasse','Klasse','schule'],['massnahmen','Maßnahme des CDSE','cdse']];
function kernFehlt(r){r=r||{};return KERN.filter(function(k){return istLeer(r[k[0]]);}).map(function(k){return {key:k[0],label:k[1],teil:k[2]};});}
return {datensatz:datensatz,kernFehlt:kernFehlt};
})();
</script>
"""


def anpassen(s):
    fehler = []

    def ersetze(alt, neu, name, anzahl=1):
        nonlocal s
        n = s.count(alt)
        if n != anzahl:
            fehler.append('%s: %d statt %d Mal gefunden' % (name, n, anzahl))
            return
        s = s.replace(alt, neu)

    def zwischen(anfang, ende, neu, name):
        """Ersetzt den Abschnitt von anfang bis einschließlich ende."""
        nonlocal s
        if s.count(anfang) != 1:
            fehler.append('%s: Anfang %d Mal gefunden' % (name, s.count(anfang)))
            return
        a = s.index(anfang)
        b = s.find(ende, a)
        if b < 0:
            fehler.append('%s: Ende nicht gefunden' % name)
            return
        s = s[:a] + neu + s[b + len(ende):]

    # ------------------------------------------------------------------
    # 1. Nur ein Team
    # ------------------------------------------------------------------
    # Konto-Modul (konto3.js)
    ersetze("var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id&&t.name;});",
            "var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id&&t.name;});\n"
            "/* Annexe Junglinster: nur ein Team – es ist immer gewählt, eine Team-Wahl gibt es nicht */\n"
            "var EIN_TEAM=TEAMS.length===1?TEAMS[0].id:'';",
            'Konto: EIN_TEAM')
    ersetze("return {name:name,team:TEAMS.some(function(t){return t.id===x.team;})?x.team:'',",
            "return {name:name,team:EIN_TEAM||(TEAMS.some(function(t){return t.id===x.team;})?x.team:''),",
            'Teamliste: Team der Person')
    ersetze("function teamAusText(t){\n  var n=tlNorm(t);if(!n){return '';}",
            "function teamAusText(t){\n  if(EIN_TEAM){return EIN_TEAM;}\n  var n=tlNorm(t);if(!n){return '';}",
            'Teamliste: Team aus Text')
    ersetze("function teamlisteParsen(text){\n  var personen=[], probleme=[], gesehen={};",
            "function teamlisteParsen(text){\n  var personen=[], probleme=[], gesehen={}, kopf=null;",
            'Teamliste einfügen: Kopfzeile merken')
    ersetze("    if(i===0&&/^name$/i.test(teile[0])&&teile.length>1){return;}",
            "    if(i===0&&/^name$/i.test(teile[0])&&teile.length>1){kopf=teile.map(tlNorm);return;}\n"
            "    /* Annexe: nur ein Team – die Spalten sind „Name; Funktion; Rolle; Responsable“. Eine Tabelle mit\n"
            "       Kopfzeile (z. B. „Als Tabelle“ gespeichert, auch mit Spalte „Team“) wird nach den Spaltennamen gelesen. */\n"
            "    if(EIN_TEAM){\n"
            "      var sp=kopf||['name','funktion','rolle','responsable'], wert=function(n){var j=sp.indexOf(n);return j>=0?(teile[j]||''):'';};\n"
            "      teile=[wert('name')||teile[0]||'','',wert('funktion'),wert('rolle'),wert('responsable')];\n"
            "    }",
            'Teamliste einfügen: Spalten')
    ersetze("""function gewaehltesTeam(){var r=document.querySelector('input[name="g-team"]:checked');return r?r.value:'';}""",
            """function gewaehltesTeam(){var r=document.querySelector('input[name="g-team"]:checked');return r?r.value:EIN_TEAM;}""",
            'Konto: gewähltes Team')
    ersetze("""(TEAMS.length?'<div class="feld"><span class="label">In welchem Team arbeitest du?</span>'+teamWahl(werte.team)+'</div>':'')+""",
            """(TEAMS.length>1?'<div class="feld"><span class="label">In welchem Team arbeitest du?</span>'+teamWahl(werte.team)+'</div>':'')+""",
            'Konto erstellen: keine Team-Wahl')
    ersetze("""'<h2>Profil ändern</h2><p class="sub">Team, Funktion und Responsable. Das Team bestimmt, welche Apps du siehst; deine Responsable sieht deinen Einsatzplan.</p>'""",
            """'<h2>Profil ändern</h2><p class="sub">Funktion und Responsable. Deine Responsable sieht deinen Einsatzplan.</p>'""",
            'Profil ändern: Untertitel')
    ersetze("""'<form id="g-form" novalidate>'+(TEAMS.length?'<div class="feld"><span class="label">Team</span>'+teamWahl(werte.team)+'</div>':'')+""",
            """'<form id="g-form" novalidate>'+(TEAMS.length>1?'<div class="feld"><span class="label">Team</span>'+teamWahl(werte.team)+'</div>':'')+""",
            'Profil ändern: keine Team-Wahl')
    ersetze("""l.map(function(k){return '<option value="'+esc(k.id)+'"'+(wert===k.id?' selected':'')+'>'+esc(k.name)+' · '+esc(team(k.team).name)+'</option>';}).join('')+""",
            """l.map(function(k){return '<option value="'+esc(k.id)+'"'+(wert===k.id?' selected':'')+'>'+esc(k.name)+(EIN_TEAM?'':' · '+esc(team(k.team).name))+'</option>';}).join('')+""",
            'Responsable-Auswahl: ohne Team')
    ersetze("var APP_SPUREN=[['klassenbuch',/^(klassebuch_|anwesenheit|anw_|cdse_dossier)/,'cdse_dossier_db'],['journal',/^isa_(?!team_user$|uploader_ok$)/,'isa_dossier_db'],\n"
            "                ['screening',/^cdse-autosave/,null],['eldib',/^eldib-/,null],",
            "var APP_SPUREN=[['klassenbuch',/^(klassebuch_|anwesenheit|anw_|cdse_dossier)/,'cdse_dossier_db'],\n"
            "                ['screening',/^cdse-autosave/,null],['eldib',/^eldib-/,null],",
            'Daten auf dem PC: nur Apps der Annexe')

    # Gemeinsamer Bereich (team.js): neues Dossier gehört zur Annexe
    ersetze("x.stelle!==false;})?me.team:'diagnostique');",
            "x.stelle!==false;})?me.team:'annexe');",
            'Neues Dossier: Stelle')

    # Arbeitsbereich (arbeit.js)
    ersetze("var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id;});",
            "var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id;});\n"
            "/* Annexe Junglinster: nur ein Team – keine Stellen zur Auswahl, kein Weitergeben an eine andere Stelle */\n"
            "var EIN_TEAM=TEAMS.length<2;",
            'Arbeit: EIN_TEAM')
    ersetze("function eigeneStelle(me){return STELLEN.some(function(t){return t.id===me.team;})?me.team:'diagnostique';}",
            "function eigeneStelle(me){return STELLEN.some(function(t){return t.id===me.team;})?me.team:((STELLEN[0]||{}).id||'annexe');}",
            'Arbeit: eigene Stelle')
    ersetze("function kontoOptionen(filterFn){return freieKonten().filter(filterFn||function(){return true;}).sort(function(a,b){return a.name.localeCompare(b.name,'de');}).map(function(k){return [k.id,k.name+' · '+k.teamName];});}",
            "function kontoOptionen(filterFn){return freieKonten().filter(filterFn||function(){return true;}).sort(function(a,b){return a.name.localeCompare(b.name,'de');}).map(function(k){return [k.id,EIN_TEAM?k.name:k.name+' · '+k.teamName];});}",
            'Arbeit: Personen-Auswahl ohne Team')
    # Schülerliste: keine Stellen-Filter, keine Spalte „Stelle“
    ersetze("""    '<span class="ar-trenner"></span>'+
    '<button class="catchip'+(!filter.stelle?' on':'')+'" type="button" data-filter-stelle="">Alle Stellen</button>'+
    STELLEN.map(""",
            """    (EIN_TEAM?'':'<span class="ar-trenner"></span>'+
    '<button class="catchip'+(!filter.stelle?' on':'')+'" type="button" data-filter-stelle="">Alle Stellen</button>'+
    STELLEN.map(""", 'Schülerliste: Stellen-Filter (Anfang)')
    ersetze("""}).join('')+
    '<span class="ar-trenner"></span><button class="catchip'+(filter.meine?' on':'')""",
            """}).join(''))+
    '<span class="ar-trenner"></span><button class="catchip'+(filter.meine?' on':'')""", 'Schülerliste: Stellen-Filter (Ende)')
    ersetze("""h+='<div class="ar-tabelle" role="table" aria-label="Schüler"><div class="ar-zeile kopf" role="row"><span role="columnheader">Name</span><span role="columnheader">Klasse · Schule</span><span role="columnheader">Stelle</span><span role="columnheader">Fallverantwortlich</span>""",
            """h+='<div class="ar-tabelle'+(EIN_TEAM?' ein-team':'')+'" role="table" aria-label="Schüler"><div class="ar-zeile kopf" role="row"><span role="columnheader">Name</span><span role="columnheader">Klasse · Schule</span>'+(EIN_TEAM?'':'<span role="columnheader">Stelle</span>')+'<span role="columnheader">Fallverantwortlich</span>""",
            'Schülerliste: Spalte Stelle (Kopf)')
    ersetze("""          '<span role="cell">'+stelleChip(d.stelle)+'</span>'+""",
            """          (EIN_TEAM?'':'<span role="cell">'+stelleChip(d.stelle)+'</span>')+""",
            'Schülerliste: Spalte Stelle (Zeile)')
    # Neuer Schüler: Stelle ist immer die Annexe
    ersetze("""    auswahl('stelle','Zuständige Stelle',eigeneStelle(me),stellenOptionen())+'</div>'+
    '<p class="ar-klein">Du wirst fallverantwortlich und kannst später anderen ein Schreibrecht geben oder den Schüler an eine andere Stelle weitergeben.</p>';""",
            """    (EIN_TEAM?'<input type="hidden" name="stelle" value="'+esc(eigeneStelle(me))+'">':auswahl('stelle','Zuständige Stelle',eigeneStelle(me),stellenOptionen()))+'</div>'+
    '<p class="ar-klein">Du wirst fallverantwortlich und kannst später anderen ein Schreibrecht geben'+(EIN_TEAM?'':' oder den Schüler an eine andere Stelle weitergeben')+'.</p>';""",
            'Neuer Schüler: Stelle')
    # Dossier: kein „Weitergeben“, kein Stellen-Abzeichen
    ersetze("""  if(r.weitergeben){aktionen+='<button class="btn" type="button" data-ar="weitergeben">'""",
            """  if(r.weitergeben&&!EIN_TEAM){aktionen+='<button class="btn" type="button" data-ar="weitergeben">'""",
            'Dossier: Weitergeben')
    ersetze("""'<div class="ar-chips">'+stelleChip(d.stelle)+'<span class="ar-status '""",
            """'<div class="ar-chips">'+(EIN_TEAM?'':stelleChip(d.stelle))+'<span class="ar-status '""",
            'Dossier: Stellen-Abzeichen')
    ersetze("""h+=karte('<h3>Zuständigkeit</h3><dl class="ar-dl"><dt>Stelle</dt><dd>'+esc(team(d.stelle).name)+(d.stelleSeit?' <small>seit '+esc(datum(d.stelleSeit))+'</small>':'')+'</dd>'+""",
            """h+=karte('<h3>Zuständigkeit</h3><dl class="ar-dl">'+(EIN_TEAM?'':'<dt>Stelle</dt><dd>'+esc(team(d.stelle).name)+(d.stelleSeit?' <small>seit '+esc(datum(d.stelleSeit))+'</small>':'')+'</dd>')+""",
            'Dossier: Zuständigkeit')
    ersetze("""' — Stelle: '+esc(team(d.stelle).name)+', fallverantwortlich: '""",
            """' — '+(EIN_TEAM?'':'Stelle: '+esc(team(d.stelle).name)+', ')+'fallverantwortlich: '""",
            'Übergabeblatt: Stelle')
    # Fiche hochladen: Stelle ist immer die Annexe
    ersetze("function stelleAusFiche(f){\n  var c=(f&&f.cdse)||{}, me=K.ich();",
            "function stelleAusFiche(f){\n  var c=(f&&f.cdse)||{}, me=K.ich();\n  if(EIN_TEAM){return eigeneStelle(me||{});}",
            'Fiche: Stelle')
    ersetze("(treffer&&ziel?'':auswahl('stelle','Zuständige Stelle (bei neuem Dossier)',stelleAusFiche(f),stellenOptionen()))",
            "(treffer&&ziel||EIN_TEAM?'':auswahl('stelle','Zuständige Stelle (bei neuem Dossier)',stelleAusFiche(f),stellenOptionen()))",
            'Fiche: Stellen-Auswahl')
    # Verwaltung: Mitglieder und Teamliste ohne Team
    ersetze("""h+=karte('<h2>Mitglieder</h2><div class="ar-tabelle ar-mitglieder"><div class="ar-zeile kopf"><span>Name</span><span>Team · Funktion</span>""",
            """h+=karte('<h2>Mitglieder</h2><div class="ar-tabelle ar-mitglieder"><div class="ar-zeile kopf"><span>Name</span><span>'+(EIN_TEAM?'Funktion':'Team · Funktion')+'</span>""",
            'Mitglieder: Kopf')
    ersetze("""'</b></span><span>'+esc([k.teamName,k.funktion].filter(Boolean).join(' · '))+'</span><span>'+esc(k.responsable?kname(k.responsable):'—')""",
            """'</b></span><span>'+esc((EIN_TEAM?[k.funktion||'—']:[k.teamName,k.funktion]).filter(Boolean).join(' · '))+'</span><span>'+esc(k.responsable?kname(k.responsable):'—')""",
            'Mitglieder: Zeile')
    ersetze("""'<p class="ar-klein">Alle Mitarbeitenden mit Team, Funktion und Rolle. '""",
            """'<p class="ar-klein">Alle Mitarbeitenden '+(EIN_TEAM?'der Annexe mit Funktion':'mit Team, Funktion')+' und Rolle. '""",
            'Teamliste: Erklärung')
    ersetze("""'Wer selbst ein Konto erstellt, wählt seinen Namen aus dieser Liste – Team und Funktion sind dann schon eingetragen. '""",
            """'Wer selbst ein Konto erstellt, wählt seinen Namen aus dieser Liste – '+(EIN_TEAM?'die Funktion ist':'Team und Funktion sind')+' dann schon eingetragen. '""",
            'Teamliste: Erklärung 2')
    ersetze("""    '<div class="catbar" role="group" aria-label="Team"><button class="catchip'+(!tlFilter?' on':'')""",
            """    (EIN_TEAM?'':'<div class="catbar" role="group" aria-label="Team"><button class="catchip'+(!tlFilter?' on':'')""",
            'Teamliste: Team-Filter (Anfang)')
    ersetze(""">ohne Team</button>':'')+'</div>'+
    '<div class="ar-tabelle ar-tl-tab"><div class="ar-zeile kopf"><span>Name</span><span>Team · Funktion</span>""",
            """>ohne Team</button>':'')+'</div>')+
    '<div class="ar-tabelle ar-tl-tab"><div class="ar-zeile kopf"><span>Name</span><span>'+(EIN_TEAM?'Funktion':'Team · Funktion')+'</span>""",
            'Teamliste: Team-Filter (Ende) und Kopf')
    ersetze("""'<span>'+esc([x.p.team?T_NAME(x.p.team):'ohne Team',x.p.funktion].filter(Boolean).join(' · '))+'</span>""",
            """'<span>'+esc((EIN_TEAM?[x.p.funktion||'—']:[x.p.team?T_NAME(x.p.team):'ohne Team',x.p.funktion]).filter(Boolean).join(' · '))+'</span>""",
            'Teamliste: Zeile')
    ersetze("""feld('name','Vor- und Nachname',p.name,'text',' required autofocus')+auswahl('team','Team',p.team,teamOptionen(),'– ohne Team –')+""",
            """feld('name','Vor- und Nachname',p.name,'text',' required autofocus')+(EIN_TEAM?'<input type="hidden" name="team" value="'+esc((TEAMS[0]||{}).id||'')+'">':auswahl('team','Team',p.team,teamOptionen(),'– ohne Team –'))+""",
            'Teamliste: Person ohne Team-Auswahl')
    ersetze("""'<p class="ar-klein">Eine Person pro Zeile: <b>Name; Team; Funktion; Rolle</b> – so, wie es aus Excel kommt (Spalten mit Tabulator) oder mit Semikolon getrennt. Team zum Beispiel „ISA“, „Diagnostique“, „Annexe“, „CLAPA“ oder „CST“; Rolle „Responsable“ oder leer. Personen, die schon in der Liste stehen, werden aktualisiert.</p>'""",
            """'<p class="ar-klein">Eine Person pro Zeile: <b>Name; Funktion; Rolle; Responsable</b> – so, wie es aus Excel kommt (Spalten mit Tabulator) oder mit Semikolon getrennt. Rolle „Responsable“ oder leer. Eine Tabelle mit Kopfzeile (zum Beispiel aus „Als Tabelle“) wird nach den Spaltennamen gelesen. Personen, die schon in der Liste stehen, werden aktualisiert.</p>'""",
            'Teamliste einfügen: Anleitung')
    ersetze("""'<p class="ar-klein">Beispiel: <code>Lea Beispiel; ISA; Éducatrice graduée; Responsable</code></p>'""",
            """'<p class="ar-klein">Beispiel: <code>Lea Beispiel; Éducatrice graduée; Responsable</code></p>'""",
            'Teamliste einfügen: Beispiel')
    ersetze("""'<div class="ar-tl-vorschau"><table><thead><tr><th>Name</th><th>Team</th><th>Funktion</th><th>Rolle</th></tr></thead><tbody>'+erg.personen.map(function(p){
        return '<tr><td>'+esc(p.name)+'</td><td'+(p.team?'':' class="fehlt"')+'>'+esc(p.team?T_NAME(p.team):'– fehlt –')+'</td><td>'+esc(p.funktion)+'</td><td>'+esc(ROL[p.rolle])+'</td></tr>';""",
            """'<div class="ar-tl-vorschau"><table><thead><tr><th>Name</th><th>Funktion</th><th>Rolle</th><th>Responsable</th></tr></thead><tbody>'+erg.personen.map(function(p){
        return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.funktion)+'</td><td>'+esc(ROL[p.rolle])+'</td><td>'+esc(p.responsable)+'</td></tr>';""",
            'Teamliste einfügen: Vorschau')
    ersetze("""var zeilen=[['Name','Team','Funktion','Rolle','Responsable','Konto']].concat(K.teamliste().map(function(p){var k=tlKonto(p,m), v=k?null:tlVorbereitet(p,vb);return [p.name,p.team?T_NAME(p.team):'',p.funktion,""",
            """var zeilen=[['Name','Funktion','Rolle','Responsable','Konto']].concat(K.teamliste().map(function(p){var k=tlKonto(p,m), v=k?null:tlVorbereitet(p,vb);return [p.name,p.funktion,""",
            'Teamliste als Tabelle: ohne Team')
    ersetze("a.download='CDSE-Teamliste.csv';", "a.download='Annexe-Teamliste.csv';", 'Teamliste als Tabelle: Dateiname')

    # Gestaltung: Schülerliste mit vier Spalten
    ersetze('/* ==== Ende Arbeit ==== */',
            '/* Annexe: Schülerliste ohne Spalte „Stelle“ */\n'
            '.ar-tabelle.ein-team .ar-zeile{grid-template-columns:minmax(220px,2fr) minmax(160px,1.6fr) minmax(140px,1.2fr) 96px;}\n'
            '@media (max-width:860px){.ar-tabelle.ein-team .ar-zeile{grid-template-columns:minmax(0,1fr) auto;}'
            '.ar-tabelle.ein-team .ar-zeile>span:nth-child(3){display:none;}.ar-tabelle.ein-team .ar-zeile>span:nth-child(4){display:block;}}\n'
            '/* ==== Ende Arbeit ==== */',
            'Gestaltung: Schülerliste')

    # Anmeldung: Auswahlfeld „Responsable“ wie die anderen Felder (sonst klein und ungestaltet)
    ersetze('.feld input:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus);}',
            '.feld input:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus);}\n'
            ".feld select{font:inherit;font-size:15px;height:44px;padding:0 38px 0 13px;border:1px solid var(--line-2);border-radius:10px;color:var(--ink);"
            "-webkit-appearance:none;appearance:none;cursor:pointer;transition:border-color .15s,box-shadow .15s;"
            "background:var(--surface) url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23586277' "
            "stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") no-repeat right 13px center/16px;}\n"
            '.feld select:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus);}',
            'Anmeldung: Auswahlfeld')

    # ------------------------------------------------------------------
    # 2. Ohne Datenbank
    # ------------------------------------------------------------------
    ersetze("|verwaltung|datenbank)(?:", "|verwaltung)(?:", 'Adresse #/datenbank')
    ersetze(",verwaltung:'Verwaltung',datenbank:'Datenbank'}[ar[1]]", ",verwaltung:'Verwaltung'}[ar[1]]", 'Seitentitel Datenbank')
    ersetze("'+(istResp()?', die Datenbank-Angaben':'')+'", "", 'Kompass: Datenbank-Angaben')
    ersetze("Fallverantwortliche leiten den Fall: Sie dürfen weitergeben und Rechte vergeben.",
            "Fallverantwortliche leiten den Fall: Sie dürfen Rechte vergeben und den Status ändern.", 'Fallverantwortliche ohne Weitergeben')
    ersetze("(DS'+(istResp()?', Datenbank':'')+', vom Team eingetragen)", "(DS, vom Team eingetragen)", 'Kompass: Datenbank')
    # Kompass und Begleitplan: Angaben der Fiche ohne Datenbank (Cycle, Ankunft, Erstsprache, Helfernetz, Kernangaben)
    ersetze("<script>\n/* =====================================================================\n   CDSE Hub — Kompass: Umgang",
            FICHE_DATEN_JS + "<script>\n/* =====================================================================\n   CDSE Hub — Kompass: Umgang",
            'Kompass: Angaben der Fiche (Modul)')
    ersetze("var D=window.CDSE_DATENBANK;if(!D||!D.datensatz){return {};}",
            "var D=window.CDSE_DATENBANK||window.CDSE_FICHE_DATEN;if(!D||!D.datensatz){return {};}",
            'Kompass: Angaben der Fiche')
    ersetze("S=window.CDSE_SCREENING, D=window.CDSE_DATENBANK, KO=window.CDSE_KOMPASS;",
            "S=window.CDSE_SCREENING, D=window.CDSE_DATENBANK||window.CDSE_FICHE_DATEN, KO=window.CDSE_KOMPASS;",
            'Begleitplan: Angaben der Fiche')

    # ------------------------------------------------------------------
    # 3. Ohne Journal
    # ------------------------------------------------------------------
    # Übernahme aus dem Klassenbuch (kb-uebernahme.js)
    ersetze("  klassenbuch:{name:'Klassenbuch',db:'cdse_dossier_db',roster:'klassebuch_roster_v1',bubble:'klassebuch_bubble_v1',praefix:''},\n"
            "  journal:{name:'Journal',db:'isa_dossier_db',roster:'isa_roster_v1',bubble:'isa_bubble_v1',praefix:'isa:'}\n",
            "  klassenbuch:{name:'Klassenbuch',db:'cdse_dossier_db',roster:'klassebuch_roster_v1',bubble:'klassebuch_bubble_v1',praefix:''}\n",
            'Übernahme: nur Klassenbuch')
    ersetze("    var app=(j._app==='journal'||j._app==='klassenbuch')?j._app:((c.pei||c.agenda||c.goals||c.tasks)?'journal':'klassenbuch');\n",
            "    var app=(j._app==='journal'||j._app==='klassenbuch')?j._app:((c.pei||c.agenda||c.goals||c.tasks)?'journal':'klassenbuch');\n"
            "    if(app!=='klassenbuch'){throw new Error('„'+name+'“ gehört nicht zum Klassenbuch der Annexe.');}\n",
            'Übernahme: fremde Team-Datei')
    zwischen("  if(j&&j.format==='isa-journal-backup'){\n    var st=function(k,leer)",
             "roster:st('isa_roster_v1',[]),bubble:st('isa_bubble_v1',{})};\n  }\n",
             "  if(j&&j.format==='isa-journal-backup'){throw new Error('„'+name+'“ gehört nicht zum Klassenbuch der Annexe.');}\n",
             'Übernahme: fremde Sicherung')
    ersetze("'“ ist weder eine Team-Datei noch eine Sicherung von Klassenbuch oder Journal.'",
            "'“ ist weder eine Team-Datei noch eine Sicherung des Klassenbuchs.'", 'Fremde Datei: Text', anzahl=2)
    ersetze("<b>Schülerdaten aus Klassenbuch oder Journal</b>", "<b>Schülerdaten aus dem Klassenbuch</b>", 'Übernahme: Karte')
    ersetze("' Einträge, Wochenziele oder ein Helfernetz im Klassenbuch bzw. Journal, die noch nicht im Hub-Dossier stehen.",
            "' Einträge, Wochenziele oder ein Helfernetz im Klassenbuch, die noch nicht im Hub-Dossier stehen.", 'Übernahme: Karte 2')
    ersetze(">Daten aus Klassenbuch oder Journal übernehmen (", ">Daten aus dem Klassenbuch übernehmen (", 'Übernahme: Link')
    ersetze("' mit Daten aus Klassenbuch oder Journal'+(fertigN", "' mit Daten aus dem Klassenbuch'+(fertigN", 'Übernahme: gefunden')
    ersetze("'<p>In diesem Browser liegen keine Schülerdaten aus Klassenbuch oder Journal. ",
            "'<p>In diesem Browser liegen keine Schülerdaten aus dem Klassenbuch. ", 'Übernahme: leer')
    ersetze("geänderte Einträge werden nachgetragen. In Klassenbuch und Journal bleibt alles unverändert.</p>'",
            "geänderte Einträge werden nachgetragen. Im Klassenbuch bleibt alles unverändert.</p>'", 'Übernahme: unverändert')
    ersetze("H.dialog('Aus Klassenbuch und Journal übernehmen',", "H.dialog('Aus dem Klassenbuch übernehmen',", 'Übernahme: Titel')
    ersetze("var stelle=stellen.some(function(t){return t.id===(me&&me.team);})?me.team:'diagnostique';",
            "var stelle=stellen.some(function(t){return t.id===(me&&me.team);})?me.team:((stellen[0]||{}).id||'annexe');",
            'Übernahme: Stelle neuer Dossiers')
    # Frühere Screenings (screening.js)
    ersetze("  klassenbuch:{name:'Klassenbuch',screening:'klassebuch_screening_v1',roster:'klassebuch_roster_v1',praefix:''},\n"
            "  journal:{name:'Journal',screening:'isa_screening_v1',roster:'isa_roster_v1',praefix:'isa:'}\n",
            "  klassenbuch:{name:'Klassenbuch',screening:'klassebuch_screening_v1',roster:'klassebuch_roster_v1',praefix:''}\n",
            'Frühere Screenings: nur Klassenbuch')
    ersetze("    var c=j.colls, ro=sammlung(c.roster);\n",
            "    var c=j.colls, ro=sammlung(c.roster);\n"
            "    if(kbAppVon(j,c)!=='klassenbuch'){throw new Error('„'+name+'“ gehört nicht zum Klassenbuch der Annexe.');}\n",
            'Frühere Screenings: fremde Team-Datei')
    zwischen("  if(j&&j.format==='isa-journal-backup'&&j.stores&&typeof j.stores==='object'){",
             "roster:st('isa_roster_v1',[])};\n  }\n",
             "  if(j&&j.format==='isa-journal-backup'){throw new Error('„'+name+'“ gehört nicht zum Klassenbuch der Annexe.');}\n",
             'Frühere Screenings: fremde Sicherung')
    ersetze("' aus Klassenbuch oder Journal'+(fertigN?', davon '+fertigN+' schon übernommen':'')",
            "' aus dem Klassenbuch'+(fertigN?', davon '+fertigN+' schon übernommen':'')", 'Frühere Screenings: gefunden')
    ersetze("'<p>In diesem Browser liegen keine früheren Screenings aus Klassenbuch oder Journal. ",
            "'<p>In diesem Browser liegen keine früheren Screenings aus dem Klassenbuch. ", 'Frühere Screenings: leer')
    ersetze("(Verdachtsachsen) wird nicht angezeigt. In Klassenbuch und Journal bleibt alles unverändert.</p>'",
            "(Verdachtsachsen) wird nicht angezeigt. Im Klassenbuch bleibt alles unverändert.</p>'", 'Frühere Screenings: unverändert')
    ersetze("<b>Frühere Screenings aus Klassenbuch oder Journal</b>", "<b>Frühere Screenings aus dem Klassenbuch</b>", 'Frühere Screenings: Karte')
    ersetze(">Frühere Screenings aus Klassenbuch oder Journal übernehmen'", ">Frühere Screenings aus dem Klassenbuch übernehmen'", 'Frühere Screenings: Link')
    # Beobachtungsbogen: wer beobachtet (Rollen der Annexe)
    ersetze("['lehrkraft', 'Lehrkraft'], ['educ', 'Éducateur/Éducatrice'], ['isa', 'ISA'], ['diagnostique', 'Diagnostique'],",
            "['lehrkraft', 'Lehrkraft'], ['educ', 'Éducateur/Éducatrice'],", 'Screening: Rollen')
    ersetze("if(me.team==='isa'){return 'isa';}if(me.team==='diagnostique'){return 'diagnostique';}", "", 'Screening: Rolle aus dem Team')

    # ------------------------------------------------------------------
    # 4. Texte für die Annexe
    # ------------------------------------------------------------------
    ersetze('<title>CDSE Hub</title>', '<title>' + TITEL + '</title>', 'Seitentitel')
    ersetze('<b id="top-title">CDSE Hub</b>', '<b id="top-title">' + TITEL + '</b>', 'Kopfzeile')
    ersetze('<b id="brand-title">CDSE Hub</b><small id="brand-sub">Gemeinsame Anlaufstelle</small>',
            '<b id="brand-title">' + TITEL + '</b><small id="brand-sub">Hub des Teams</small>', 'Seitenleiste')
    ersetze('Der CDSE Hub braucht JavaScript.', 'Der Hub der Annexe braucht JavaScript.', 'Ohne JavaScript')
    ersetze("var HUB_TITLE=S.titel||'CDSE Hub';", "var HUB_TITLE=S.titel||'" + TITEL + "';", 'Titel (Ersatz)')
    ersetze("esc(S.titel||'CDSE Hub')", "esc(S.titel||'" + TITEL + "')", 'Anmeldung: Titel (Ersatz)')
    ersetze("' für den Alltag im CDSE — an einem Ort.'", "' für den Alltag in der Annexe — an einem Ort.'", 'Übersicht: Untertitel')
    ersetze(r"im Hub-Ordner (z. B. O:\\CDSE-Hub).", r"im Hub-Ordner (z. B. O:\\Annexe-Hub).", 'Anmeldung: Ordner-Beispiel')
    ersetze("""'<h1 style="font-size:22px;margin:0 0 6px">CDSE Hub — Wiederherstellungs-Code</h1>'""",
            """'<h1 style="font-size:22px;margin:0 0 6px">'+esc(S.titel||'""" + TITEL + """')+' — Wiederherstellungs-Code</h1>'""",
            'Wiederherstellungs-Code: Überschrift')
    ersetze("Hier liegen später alle Schülerdossiers des CDSE – verschlüsselt im Hub-Ordner.",
            "Hier liegen später alle Schülerdossiers der Annexe – verschlüsselt im Hub-Ordner.", 'Schülerbereich: einrichten')
    ersetze("'Alle Schülerinnen und Schüler des CDSE – aktiv und ehemalig. Jede und jeder im CDSE kann die Dossiers lesen; bearbeiten dürfen die Zuständigen.'",
            "'Alle Schülerinnen und Schüler der Annexe – aktiv und ehemalig. Alle im Team können die Dossiers lesen; bearbeiten dürfen die Zuständigen.'",
            'Schülerliste: Untertitel')
    ersetze("'<h2>Noch keine Dossiers</h2><p>Meist beginnt ein Dossier beim Diagnostique: <b>„Neuer Schüler“</b> anlegen, dann das Profil aus dem DS des ELDiB-Generators übernehmen.</p>'",
            "'<h2>Noch keine Dossiers</h2><p>Mit <b>„Neuer Schüler“</b> ein Dossier anlegen, dann das Profil aus dem DS des ELDiB-Generators übernehmen. Stehen die Kinder schon im Klassenbuch, erscheint oben ein Hinweis zum Übernehmen.</p>'",
            'Schülerliste: leer')
    ersetze("'<p class=\"fuss\">Vertraulich – nur für die Arbeit im CDSE. Erstellt am '",
            "'<p class=\"fuss\">Vertraulich – nur für die Arbeit im Team der Annexe. Erstellt am '", 'Übergabeblatt: Fuß')
    ersetze("<title>Startcodes – CDSE Hub</title>", "<title>Startcodes – Hub der Annexe</title>", 'Startcodes: Titel')
    ersetze('<div class="k">CDSE Hub · dein Zugang · persönlich</div>',
            '<div class="k">Hub der Annexe Junglinster · dein Zugang · persönlich</div>', 'Startcodes: Zettel')
    ersetze(" · CDSE · strukturierte Beobachtung, kein Test und keine Diagnose</p>'",
            " · Annexe Junglinster · strukturierte Beobachtung, kein Test und keine Diagnose</p>'", 'Beobachtungsbogen (Druck): Kopf')
    ersetze("'<p class=\"fuss\">Auswertung im CDSE Hub (Schüler → Dossier → Screening).",
            "'<p class=\"fuss\">Auswertung im Hub der Annexe (Schüler → Dossier → Screening).", 'Beobachtungsbogen (Druck): Fuß')
    ersetze("nachmittags Rückmeldung mit Lob.</span><span>CDSE</span></div>",
            "nachmittags Rückmeldung mit Lob.</span><span>" + TITEL + "</span></div>", 'Tageskarte (Druck): Fuß')

    # Anleitung im Hub
    ersetze('<div>Die Toolbox (ISA-App) wird bereits genau so gebaut — sie ist ein gutes Vorbild.</div>',
            '<div>Die Toolbox wird bereits genau so gebaut — sie ist ein gutes Vorbild.</div>', 'Anleitung: Weg B')
    ersetze("<td><code>'screening'</code></td>", "<td><code>'wochenplan'</code></td>", 'Anleitung: Beispiel id')
    ersetze("<td><code>'Screening'</code></td>", "<td><code>'Wochenplan'</code></td>", 'Anleitung: Beispiel Name')
    ersetze("<td><code>'CDSE-Testing Tool …'</code></td>", "<td><code>'Wochenplan der Klasse …'</code></td>", 'Anleitung: Beispiel Beschreibung')
    ersetze("<td><code>'Diagnostik &amp; Förderung'</code></td>", "<td><code>'Klasse &amp; Schüler'</code></td>", 'Anleitung: Beispiel Bereich')
    ersetze("<td><code>'apps/screening.html'</code></td>", "<td><code>'apps/wochenplan.html'</code></td>", 'Anleitung: Beispiel Datei')
    ersetze("<td><code>{ repo: 'ISA-APP', … }</code></td>", "<td><code>{ repo: 'Klassebuch', … }</code></td>", 'Anleitung: Beispiel Quelle')
    ersetze("\n            <tr><td><code>teams</code></td><td>Optional. Welche Teams die App sehen. Fehlt das Feld, sehen sie alle Teams.</td><td><code>['diagnostique']</code></td></tr>",
            "", 'Anleitung: Feld teams')
    ersetze("<td><code>'sdq conners'</code></td>", "<td><code>'plan woche'</code></td>", 'Anleitung: Beispiel Stichworte')
    zwischen('<h2 id="konten">Konten &amp; Teams</h2>',
             'Nur diese Gruppe darf <code>apps/screening.html</code> lesen.</div></div>',
             '<h2 id="konten">Konten</h2>\n'
             '        <p>Jede Person erstellt beim ersten Mal ein eigenes Konto mit Name, Funktion und Passwort. Danach reicht das Passwort. '
             'Das Konto liegt als Datei im Hub-Ordner, im Unterordner <code>konten/</code>. Das Passwort selbst wird nirgends gespeichert — '
             'nur ein damit verschlüsselter Schlüssel.</p>\n'
             '        <p>Dieser Hub gehört nur dem Team der Annexe Junglinster: Alle sehen alle Apps, eine Team-Wahl gibt es nicht. '
             'Funktion und Responsable ändert man im Hub unten links über das Menü <b>⋮</b> → <b>Profil ändern</b>.</p>\n'
             '        <div class="callout"><svg class="ic"><use href="#i-warn"/></svg><div><b>Ehrlich gesagt:</b> Wer den Hub-Ordner öffnen kann, '
             'kann die App-Dateien auch direkt öffnen. Die Daten jeder Person bleiben trotzdem geschützt: Sie liegen verschlüsselt in '
             '<code>daten/</code> und lassen sich nur mit dem eigenen Passwort oder Wiederherstellungs-Code öffnen. '
             'Wer den Hub-Ordner überhaupt sehen darf, legt die IT über die Ordnerrechte fest.</div></div>',
             'Anleitung: Konten')
    ersetze('<p>Das Klassenbuch teilt ein Team über eine gemeinsame <b>Team-Datei</b>. Der Hub legt dafür pro Team einen Ordner an: '
            '<code>teams/&lt;Team&gt;/</code>. Eine Person erstellt dort im Klassenbuch die Datei <code>klassebuch-team.json</code>, '
            'alle anderen öffnen dieselbe Datei.',
            '<p>Das Klassenbuch teilt das Team über eine gemeinsame <b>Team-Datei</b>. Der Hub legt dafür den Ordner '
            '<code>teams/Annexe Junglinster/</code> an. Eine Person erstellt dort im Klassenbuch die Datei <code>klassebuch-team.json</code>, '
            'alle anderen öffnen dieselbe Datei. Liegt eure Team-Datei schon an einem anderen Ort auf O:\\, öffnet einfach weiter diese.',
            'Anleitung: Team-Datei')
    ersetze(r'(z. B. <code>O:\CDSE-Hub</code>)', r'(z. B. <code>O:\Annexe-Hub</code>)', 'Anleitung: Hub-Ordner')
    zwischen(r'<pre class="code"><span class="c">Ein eigener Ordner, z. B. O:\CDSE-Hub\</span>', '</pre>',
             '<pre class="code"><span class="c">Ein eigener Ordner, z. B. O:\\Annexe-Hub\\</span>\n\n'
             '  hub.html              <span class="c">← diese Seite: öffnen und als Favorit speichern</span>\n'
             '  hub-apps.js           <span class="c">← das App-Verzeichnis</span>\n'
             '  konten/               <span class="c">← ein Konto pro Person (legt der Hub selbst an)</span>\n'
             '  daten/                <span class="c">← die verschlüsselten Daten jeder Person, mit Ständen der letzten 14 Tage</span>\n'
             '  teams/                <span class="c">← der Ordner des Teams für die gemeinsame Klassenbuch-Datei</span>\n'
             '  apps/\n'
             '    klassenbuch.html\n'
             '    screening.html        <span class="c">← Befundbericht</span>\n'
             '    eldib-generator.html\n'
             '    toolbox.html          <span class="c">← mit dem Skills-Kurs</span>\n'
             '    lernen.html\n'
             '    pathologien.html\n'
             '    versionen.js          <span class="c">← Stand jeder App (wird automatisch erzeugt)</span>\n'
             '    ds-motor.js           <span class="c">← Text-Motor des ELDiB-Generators (Schülerprofil)</span>\n'
             '    toolbox-index.js      <span class="c">← Materialverzeichnis der Toolbox (Materialvorschläge)</span>\n'
             '    kb-screening-texte.js <span class="c">← Texte für die Übernahme alter Klassenbuch-Screenings</span></pre>',
             'Anleitung: Ordner')

    if fehler:
        raise SystemExit('Annexe-Anpassung passt nicht mehr zum Hub:\n  ' + '\n  '.join(fehler))

    # Kontrolle: nirgends mehr sichtbar „ISA“ oder Journal.
    # Kommentare zählen nicht; erlaubt sind die Maßnahmen der offiziellen Fiche de renseignement.
    import re
    ohne_kommentare = re.sub(r'/\*[\s\S]*?\*/', '', s)
    rest = []
    for m in re.finditer(r"ISA-App|\(ISA\)|'ISA'|„ISA“|Klassenbuch oder Journal|Klassenbuch und Journal|Diagnostique-Team|CDSE Hub", ohne_kommentare):
        rest.append(ohne_kommentare[max(0, m.start() - 50):m.end() + 30].replace('\n', ' '))
    rest = [r for r in rest if 'Intervention spécialisée ambulatoire (ISA)' not in r and "isa:'ISA'" not in r]
    if rest:
        raise SystemExit('Annexe-Anpassung: noch sichtbar:\n  ' + '\n  '.join(rest))
    return s
