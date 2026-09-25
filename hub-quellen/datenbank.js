/* =====================================================================
   CDSE Hub — Datenbank: Kennzahlen, Tabelle, Abfragen, Import, Protokoll
   ---------------------------------------------------------------------
   Nur für Responsables und die Verwaltung (#/datenbank). Keine zweite
   Datenhaltung: Jede Zahl wird beim Öffnen aus den verschlüsselten
   Schülerdossiers berechnet (person, fiche, db, profil, eintraege) – was
   über die Fiche de renseignement ins Dossier kommt, steht sofort hier.
   Eigene Angaben der Datenbank (Diagnosen, IQ, Schulform …) liegen im
   Dossier unter d.db und werden nur über CDSE_TEAM.ops.datenbank
   gespeichert – mit Rechteprüfung und Eintrag im Protokoll des Dossiers.
     #/datenbank            Übersicht: Kennzahlen und Diagramme
     #/datenbank/tabelle    alle Variablen, Spaltenwahl, Suche, Export
     #/datenbank/abfragen   Baukasten (und/oder, „eines von“, Kreuztabelle), Vorlagen, gespeicherte Abfragen, Freitext
     #/datenbank/import     Übernahme aus einer Excel-Tabelle (.xlsx/.csv, Spalten zuordnen) oder aus CDSE Stats (JSON/CSV)
     #/datenbank/protokoll  eigene Exporte/Importe, zuletzt geänderte Dossiers
   FELDER ist die eine Quelle für alle Variablen (wie FIELD_DEFS in CDSE
   Stats): Tabelle, Seitenblatt, Export, Abfragen und Diagramme lesen dort.
   Gerechnet wird nur mit eingetragenen Werten – nichts wird geschätzt,
   keine Diagnose wird abgeleitet. Alles bleibt im Browser (keine CDN).
   ===================================================================== */
window.CDSE_DATENBANK=(function(){
'use strict';
/* Bausteine des Hubs – erst in seite()/datensatz() holen (Ladereihenfolge) */
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
var LS_SPALTEN='cdse-db-spalten-v1', LS_ABFRAGEN='cdse-db-abfragen-v1', LS_PROTOKOLL='cdse-db-protokoll-v1';
var OHNE='(ohne Angabe)';

/* ---------- kleine Hilfen ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function txt(v){return v==null?'':String(v).trim();}
function norm(s){return txt(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');}
function pad2(n){return (n<10?'0':'')+n;}
function heute(){var d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function iso(v){
  var s=txt(v), m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if(m){return m[1]+'-'+m[2]+'-'+m[3];}
  m=/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(s);
  if(m&&+m[2]>=1&&+m[2]<=12&&+m[1]>=1&&+m[1]<=31){return m[3]+'-'+pad2(+m[2])+'-'+pad2(+m[1]);}
  return '';
}
function liste(v){var o=[];(Array.isArray(v)?v:(txt(v)?[v]:[])).forEach(function(x){var t=txt(x&&typeof x==='object'?(x.label||x.name||''):x);if(t&&o.indexOf(t)<0){o.push(t);}});return o;}
function eindeutig(l){var o=[];(l||[]).forEach(function(x){var t=txt(x);if(t&&o.indexOf(t)<0){o.push(t);}});return o;}
function zahl(v){if(v==null||v===''){return null;}var n=typeof v==='number'?v:Number(String(v).replace(',','.').trim());return isFinite(n)?n:null;}
function istZahl(v){return typeof v==='number'&&isFinite(v);}
function istLeer(v){return v==null||v===''||(Array.isArray(v)&&!v.length);}
function leerTief(v){if(v==null||v===''||v===false){return true;}if(Array.isArray(v)){return v.every(leerTief);}if(typeof v==='object'){return Object.keys(v).every(function(k){return leerTief(v[k]);});}return false;}
function kopie(o){return JSON.parse(JSON.stringify(o));}
function mittel(l){return l.length?l.reduce(function(a,b){return a+b;},0)/l.length:null;}
/* ganze Monate zwischen zwei Tagen (ISO) */
function monate(von,bis){
  var a=iso(von), b=iso(bis);if(!a||!b||b<a){return null;}
  var n=(+b.slice(0,4)-(+a.slice(0,4)))*12+(+b.slice(5,7)-(+a.slice(5,7)))-(+b.slice(8,10)<+a.slice(8,10)?1:0);
  return Math.max(0,n);
}
function datumDe(i){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(i||'');return m?m[3]+'.'+m[2]+'.'+m[1]:txt(i);}
function zahlDe(n,stellen){if(!istZahl(n)){return '–';}return n.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:stellen==null?1:stellen});}
function lsLesen(k,ersatz){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?ersatz:v;}catch(e){return ersatz;}}
function lsSchreiben(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}}
function ichId(){var me=K&&K.ich();return me?me.id:'?';}
function fehlerText(e){return (e&&e.message)||String(e);}

/* ---------- Schuljahr (15. August bis 14. August – wie die Fiche de renseignement) ---------- */
function sjJahr(i){i=iso(i);if(!i){return null;}var y=+i.slice(0,4),m=+i.slice(5,7),t=+i.slice(8,10);return (m>8||(m===8&&t>=15))?y:y-1;}
function sjName(y){return y+'/'+pad2((y+1)%100);}
function sjVon(i){var y=sjJahr(i);return y==null?'':sjName(y);}
function sjGrenzen(n){var y=parseInt(n,10);return {von:y+'-08-15',bis:(y+1)+'-08-14'};}
function sjAktuell(){return sjVon(heute());}
function sjAusZahl(s){var y=parseInt(s,10);if(!isFinite(y)){return sjAktuell();}if(y<100){y+=2000;}return sjName(y);}

/* ---------- Stellen, Sprachen, Cycle, Directions ---------- */
function teams(){return ((H&&H.TEAMS)||window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id&&t.stelle!==false;});}   /* Stellen */
function stelleName(id){if(!id){return '';}var t=teams().filter(function(x){return x.id===id;})[0];return t?t.name:(H?H.team(id).name:id);}
function stelleFarbe(name){var t=teams().filter(function(x){return x.name===name;})[0];return t?t.farbe:'';}
function kontoName(id){try{return T&&T.name?T.name(id):id;}catch(e){return id;}}
/* Erstsprache vereinheitlichen: [Code, Name, Wörter, Kürzel (nur als ganze Angabe)] */
var SPRACHEN=[
  ['LU','Luxemburgisch',['luxemburgisch','luxembourgeois','luxembourgeoise','letzebuergesch','luxemburgish','luxembourgish','lux'],['lu','lb','ltz']],
  ['FR','Französisch',['franzosisch','francais','francaise','french'],['fr']],
  ['DE','Deutsch',['deutsch','allemand','allemande','german'],['de']],
  ['PT','Portugiesisch',['portugiesisch','portugais','portugaise','portuguese','portugues'],['pt']],
  ['EN','Englisch',['englisch','anglais','anglaise','english'],['en']],
  ['IT','Italienisch',['italienisch','italien','italienne','italian','italiano'],['it']],
  ['ES','Spanisch',['spanisch','espagnol','espagnole','spanish','espanol'],['es']],
  ['CV','Kapverdisch',['kapverdisch','capverdien','capverdienne','cap-verdien','cap-verdienne','kriolu','crioulo','caboverdiano'],['cv','kea']],
  ['SQ','Albanisch',['albanisch','albanais','albanaise','albanian','shqip'],['sq']],
  ['BKS','Bosnisch/Kroatisch/Serbisch',['bosnisch','kroatisch','serbisch','serbokroatisch','montenegrinisch','bosniaque','croate','serbe','serbo-croate','bosnian','croatian','serbian'],['bks','bs','hr','sr']],
  ['AR','Arabisch',['arabisch','arabe','arabic'],['ar']],
  ['UK','Ukrainisch',['ukrainisch','ukrainien','ukrainienne','ukrainian'],['uk']],
  ['RU','Russisch',['russisch','russe','russian'],['ru']]
];
var SPRACH_CODES=SPRACHEN.map(function(s){return s[0];}).concat(['andere']);
function spracheName(c){var s=SPRACHEN.filter(function(x){return x[0]===c;})[0];return s?s[1]:(c==='andere'?'andere Sprache':c);}
function spracheGruppe(v){
  var s=norm(v);if(!s){return '';}
  var ganz=s.replace(/[^a-z]/g,''), i, j;
  for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][3].indexOf(ganz)>=0){return SPRACHEN[j][0];}}
  var w=s.split(/[^a-z-]+/).filter(Boolean);
  for(i=0;i<w.length;i++){for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][2].indexOf(w[i])>=0){return SPRACHEN[j][0];}}}
  /* zusammengesetzte Wörter: „portugiesischsprachig“ */
  for(i=0;i<w.length;i++){for(j=0;j<SPRACHEN.length;j++){if(SPRACHEN[j][2].some(function(x){return x.length>4&&w[i].indexOf(x)===0;})){return SPRACHEN[j][0];}}}
  return 'andere';
}
/* Cycle aus der Klasse (wie im Dossier): C1–C4, ES (Enseignement secondaire), sonst „andere“ */
function cycleVon(k){
  var s=txt(k);if(!s){return '';}
  var u=norm(s).toUpperCase().replace(/\s+/g,'');
  if(/^PRECOCE/.test(u)){return 'C1';}
  var m=/^C(?:YCLE)?([1-4])/.exec(u)||/^([1-4])(?:[.\/-]?[1-3])?$/.exec(u);
  if(m){return 'C'+m[1];}
  if(/^S[1-7]$/.test(u)||/^[1-7](E|EME|IEME|ERE|RE|G|P|C|I|IEC|T|AD|BI|GCC|PRO|ES|ESC|ESG)?$/.test(u)||/(DAP|CCP|CIP|LYCEE|SECONDAIRE|ESG|ESC)/.test(u)){return 'ES';}
  return 'andere';
}
/* Die 15 Directions régionales der Fiche */
var DR=['01, Luxembourg','02 Mamer','03 Pétange','04 Differdange','05 Sanem','06 Esch/Alzette','07 Dudelange','08 Bettembourg','09 Remich','10 Grevenmacher','11 Echternach','12 Mersch','13 Rédange/Attert','14 Diekirch','15 Wiltz'];
var DR_ORTE=[['luxembourg','luxemburg','letzebuerg'],['mamer'],['petange','petingen'],['differdange','differdingen','deifferdeng'],['sanem','suessem','sassenheim'],['esch','alzette','esch-sur-alzette','esch-alzette'],['dudelange','dudelingen','diddeleng'],['bettembourg','bettemburg','beetebuerg'],['remich','reimech'],['grevenmacher','maacher'],['echternach','iechternach'],['mersch','miersch'],['redange','redingen','reiden','attert'],['diekirch','dikrech'],['wiltz','wolz']];
function drAus(v){
  var s=txt(v);if(!s){return '';}
  if(DR.indexOf(s)>=0){return s;}
  var n=norm(s).replace(/^(dr|dir|direction( regionale)?|direktion)\s*/,'');
  var m=/^(\d{1,2})\b/.exec(n);if(m&&+m[1]>=1&&+m[1]<=15){return DR[+m[1]-1];}
  var w=n.split(/[^a-z-]+/).filter(Boolean);
  for(var i=0;i<DR_ORTE.length;i++){if(w.some(function(x){return DR_ORTE[i].indexOf(x)>=0;})){return DR[i];}}
  return s;   /* unbekannte Angabe bleibt, wie sie ist */
}

/* ---------- Maßnahmen des CDSE (fiche.cdse) ---------- */
var MASSNAHMEN=[
  {key:'diagnostic',kurz:'DS',lang:'Diagnostic spécialisé'},
  {key:'cgPro',kurz:'C&G Fachkräfte',lang:'Conseil et guidance des professionnel·le·s'},
  {key:'cgEltern',kurz:'C&G Eltern',lang:'Conseil et guidance parents'},
  {key:'isa',kurz:'ISA',lang:'Intervention spécialisée ambulatoire (ISA)'},
  {key:'atelier',kurz:'Atelier',lang:'Atelier d’apprentissage spécifique'},
  {key:'reeducation',kurz:'Rééducation',lang:'Rééducation'},
  {key:'annexe',kurz:'Annexe',lang:'Scolarisation spécialisée – Annexe Junglinster',beschulung:'Annexe Junglinster'},
  {key:'cdp',kurz:'CdP',lang:'Scolarisation spécialisée – Classe de participation',beschulung:'Classe de participation'},
  {key:'cst',kurz:'CST',lang:'Scolarisation spécialisée – CST',beschulung:'CST'}
];
var ARTEN=MASSNAHMEN.map(function(m){return m.kurz;});
var STAND={laufend:'laufend',beendet:'beendet',geplant:'geplant'};
/* Dauer-Variablen je Maßnahme (Übersicht „Durchschnittliche Dauer je Maßnahme“) */
var DAUER=[['dsDauer','DS'],['isaDauer','ISA'],['cgDauer','C&G'],['atelierDauer','Atelier'],['reeducationDauer','Rééducation'],['annexeDauer','Annexe'],['cstDauer','CST'],['cdpDauer','CdP'],['andereDauer','andere Maßnahme']];
/* Alles, was mehrere Variablen brauchen, einmal je Dossier ausrechnen.
   Eine Maßnahme zählt, wenn sie in der Fiche angekreuzt ist (aktiv).
   laufend = begonnen (oder ohne Beginn) und das Ende ist nicht überschritten;
   bei inaktiven Dossiers läuft keine Maßnahme mehr. */
function kontext(d){
  d=d||{};
  var p=d.person||{}, f=d.fiche||{}, db=d.db||{}, h=heute(), inaktiv=d.status==='inaktiv', seit=iso(d.statusSeit);
  var grenze=inaktiv?(seit&&seit<h?seit:h):h, c=f.cdse||{}, ms=[];
  function auf(def,m,locker){
    if(!m||typeof m!=='object'){return;}
    var von=iso(m.von), bis=iso(m.bis);
    if(!(m.aktiv===true||(locker&&m.aktiv!==false&&!!(von||bis)))){return;}
    var stand=(bis&&bis<h)?'beendet':(inaktiv?'beendet':((von&&von>h)?'geplant':'laufend'));
    var ende=(bis&&bis<grenze)?bis:grenze;
    ms.push({key:def.key,kurz:def.kurz,lang:def.lang||def.kurz,beschulung:def.beschulung||'',von:von,bis:bis,wer:txt(m.name),standort:txt(m.standort),stand:stand,
      dauer:(von&&stand!=='geplant')?monate(von,ende):null});
  }
  MASSNAHMEN.forEach(function(def){auf(def,c[def.key],false);});
  (Array.isArray(c.sonstige)?c.sonstige:[]).forEach(function(s){if(!s||typeof s!=='object'){return;}var l=txt(s.label)||'Sonstige Maßnahme';auf({key:'sonstige',kurz:l,lang:l},s,true);});
  var am=db.autreMesure;
  if(am&&typeof am==='object'&&(txt(am.name)||iso(am.von))){var l2=txt(am.name)||'Andere Maßnahme';auf({key:'autre',kurz:l2,lang:'Andere Maßnahme: '+l2},{aktiv:true,von:am.von,bis:am.bis},false);}
  var kand=[iso(f.datum),iso(d.erstellt),iso(db.herkunft&&db.herkunft.angelegt)].concat(ms.map(function(m){return m.von;})).filter(Boolean).sort();
  return {d:d,p:p,f:f,db:db,ms:ms,heute:h,inaktiv:inaktiv,seit:seit,grenze:grenze,beginn:kand[0]||''};
}
function eineMassnahme(x,key){
  var l=x.ms.filter(function(m){return m.key===key;});
  l.sort(function(a,b){return ((b.stand==='laufend')-(a.stand==='laufend'))||(b.von||'').localeCompare(a.von||'');});
  return l[0]||null;
}
function beschulungVon(x){
  var l=x.ms.filter(function(m){return m.beschulung;});
  l.sort(function(a,b){return ((b.stand==='laufend')-(a.stand==='laufend'))||(b.von||'').localeCompare(a.von||'');});
  return l[0]||null;
}
function istCg(m){return m.key==='cgPro'||m.key==='cgEltern';}
function klasseVon(x){return txt((x.f.schule||{}).klasse)||txt(x.p.klasse);}
function jaNein(v){if(v===true){return 'ja';}if(v===false){return 'nein';}var s=norm(v);if(/^(ja|oui|yes|j|y|1|true|x)$/.test(s)){return 'ja';}if(/^(nein|non|no|n|0|false)$/.test(s)){return 'nein';}return '';}
/* Migrationskontext: in der Fiche Freitext (z. B. „oui“, „Portugal“) oder ein Ankunftsdatum */
function migrationVon(f){
  if(f.migration===true){return 'ja';}if(f.migration===false){return 'nein';}
  var s=norm(f.migration);
  if(s){return (/^(nein|non|no|n|0|keine?n?)$/.test(s)||/\b(kein|keine|keinen|non|pas de|aucun|sans)\b/.test(s))?'nein':'ja';}
  return iso(f.ankunft)?'ja':'';
}
function alterVon(geb){var g=iso(geb);if(!g){return null;}var a=(H&&H.alter)?H.alter(g):null;if(a==null){var h=new Date();a=h.getFullYear()-(+g.slice(0,4));if(h.getMonth()+1<+g.slice(5,7)||(h.getMonth()+1===+g.slice(5,7)&&h.getDate()<+g.slice(8,10))){a--;}}return istZahl(a)&&a>=0?a:null;}
function diensteVon(x){
  var o=[];function add(t){t=txt(t);if(t&&o.map(norm).indexOf(norm(t))<0){o.push(t);}}
  (Array.isArray(x.f.intervenants)?x.f.intervenants:[]).forEach(function(i){if(i&&typeof i==='object'){add(i.institution);}});
  var mr=(x.f.ef||{}).maisonRelais;if(mr&&typeof mr==='object'&&[mr.name,mr.adresse,mr.tel,mr.mail].some(txt)){add('Maison Relais');}
  ccListe(x.db.autreCc).forEach(add);
  return o;
}
/* Andere Kompetenzzentren (Centres de compétences en psycho-pédagogie spécialisée): gespeichert
   in db.autreCc als Kürzel, mit „; “ getrennt. Ältere Freitexte („Centre de Logopédie“, „CL und CDI“)
   werden beim Lesen erkannt; was kein Kompetenzzentrum ist, bleibt als Text stehen. */
var CC=[['CDA','Centre pour le développement des apprentissages Grande-Duchesse Maria Teresa',['apprentissage']],
  ['CDI','Centre pour le développement intellectuel',['intellectuel','intellektuell']],
  ['CDM','Centre pour le développement moteur',['moteur','motorisch','motorik']],
  ['CDV','Centre pour le développement des compétences relatives à la vue',['vue','visuel','sehen']],
  ['CEJHP','Centre pour enfants et jeunes à haut potentiel',['haut potentiel','hochbegab']],
  ['CL','Centre de logopédie',['logopedie','logopadie']],
  ['CTSA','Centre pour enfants et jeunes présentant un trouble du spectre de l’autisme',['autisme','autismus','autist']]];
var CC_CODES=CC.map(function(c){return c[0];});
function ccCodes(t){
  var n=' '+norm(t).replace(/[^a-z0-9]+/g,' ').trim()+' ';
  return CC.filter(function(c){return n.indexOf(' '+c[0].toLowerCase()+' ')>=0||c[2].some(function(k){return n.indexOf(' '+k)>=0;});}).map(function(c){return c[0];});
}
function ccListe(v){
  var o=[];
  (Array.isArray(v)?v:[v]).forEach(function(x){
    String(x==null?'':x).split(/\s*[;,\/+|\n]\s*/).forEach(function(t){
      t=txt(t);if(!t){return;}
      var cs=ccCodes(t);(cs.length?cs:[t]).forEach(function(c){if(o.indexOf(c)<0){o.push(c);}});
    });
  });
  return o;
}
/* ELDiB-Stufen je Bereich: aus der Einschätzung im Dossier (ELDiB-Generator), sonst aus den
   Datenbank-Angaben (ältere Fälle, Import). Erwartet = Stufe für das Alter am Tag der Einschätzung. */
var ELDIB_B=[['verhalten','Verhalten','V'],['kommunikation','Kommunikation','K'],['sozialisation','Sozialisation','SOZ'],['kognition','Kognition','KOG']];
function stufeFuerAlter(j){return j==null?null:(j<=2?1:(j<=5?2:(j<=9?3:(j<=12?4:5))));}
function stufeZahl(v){var n=zahl(v);return (n!=null&&n>=0&&n<=5)?Math.round(n):null;}
function eldibStufen(d,x){
  if(x.el!==undefined){return x.el;}
  var k=eldib(d), m=x.db.eldibStufen, r=null;
  if(k&&k.stufen&&ELDIB_B.some(function(b){return istZahl(k.stufen[b[0]]);})){
    r={herkunft:'Einschätzung im Dossier',datum:iso(k.datum),erwartet:istZahl(k.erwartet)?k.erwartet:null,stufen:{}};
    ELDIB_B.forEach(function(b){r.stufen[b[0]]=istZahl(k.stufen[b[0]])?k.stufen[b[0]]:null;});
  }else if(m&&typeof m==='object'&&ELDIB_B.some(function(b){return stufeZahl(m[b[0]])!=null;})){
    var dt=iso(m.datum), geb=iso(x.p.geburtsdatum), mo=geb?monate(geb,dt||heute()):null;
    r={herkunft:'Datenbank-Angabe',datum:dt,erwartet:stufeFuerAlter(mo==null?null:Math.floor(mo/12)),stufen:{}};
    ELDIB_B.forEach(function(b){r.stufen[b[0]]=stufeZahl(m[b[0]]);});
  }
  if(r){
    var w=ELDIB_B.map(function(b){return r.stufen[b[0]];}).filter(istZahl);r.min=w.length?Math.min.apply(null,w):null;
    r.unter=r.erwartet==null?[]:ELDIB_B.filter(function(b){var s=r.stufen[b[0]];return istZahl(s)&&s<r.erwartet;}).map(function(b){return b[1];});
  }
  x.el=r;return r;
}
/* Variablen je Maßnahme: die laufende bzw. jüngste Maßnahme dieser Art */
function mWert(key,prop){return function(d,x){var m=eineMassnahme(x,key);return m?m[prop]:(prop==='dauer'?null:'');};}
function cgArtVon(x){var p=x.ms.some(function(m){return m.key==='cgPro';}), e=x.ms.some(function(m){return m.key==='cgEltern';});return p&&e?'Fachkräfte und Eltern':(p?'Fachkräfte':(e?'Eltern':''));}
function cgEndeVon(x){var l=x.ms.filter(istCg);if(!l.length||l.some(function(m){return !m.bis;})){return '';}return l.map(function(m){return m.bis;}).sort().pop();}
function cgDauerVon(x){var w=x.ms.filter(istCg).map(function(m){return m.dauer;}).filter(istZahl);return w.length?Math.max.apply(null,w):null;}
/* Gibt es im Dossier eine Maßnahme zu dieser Variablen? (Seitenblatt zeigt nur diese) */
function hatMassnahme(ms,mk){
  if(mk==='cg'){return ms.some(istCg);}
  if(mk==='beschulung'){return ms.some(function(m){return !!m.beschulung;});}
  return ms.some(function(m){return m.key===mk;});
}
function hilfenVon(x){var o=[];[(x.f.ef||{}).weitere,(x.f.es||{}).weitere].forEach(function(l){(Array.isArray(l)?l:[]).forEach(function(w){var r=txt(w&&w.rolle).replace(/[:\s]+$/,'');if(r&&o.indexOf(r)<0){o.push(r);}});});return o;}
function scasAuto(x){return (Array.isArray(x.f.intervenants)?x.f.intervenants:[]).some(function(i){var t=norm(i&&i.institution);return /\bscas\b/.test(t)||/service central d.?assistance sociale/.test(t);});}
function scasVon(x){var s=jaNein(x.db.scas);return s||(scasAuto(x)?'ja':'');}
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
function sorgerechtAusFiche(x){var o=[];(Array.isArray(x.f.vertreter)?x.f.vertreter:[]).forEach(function(v){if(v&&v.autoritaet===true){var r=rolleNorm(v.funktion);if(o.indexOf(r)<0){o.push(r);}}});return o;}
function sorgerechtVon(x){var t=liste(x.db.tutelle);return t.length?t:sorgerechtAusFiche(x);}
function eldib(d){try{return (H&&H.eldibKurz)?H.eldibKurz(d):null;}catch(e){return null;}}
/* Wohnort ohne Straße und ohne Postleitzahl: „L-7610 Larochette“ → „Larochette“ */
function ortschaft(v){var s=txt(v).replace(/^\s*(?:L\s*-\s*)?\d{4}\b[\s,]*/i,'').trim();return s||txt(v);}
function laufbahnVon(f){return (Array.isArray(f.progression)?f.progression:[]).map(txt).filter(Boolean).join(' → ');}
/* Dépistage: Kompetenzzentren, bei denen in der Fiche etwas steht („non“ zählt nicht) */
var DEPISTAGE=[['cl','CL'],['cdm','CDM'],['cdv','CDV'],['autres','andere']];
function depistageVon(f){var dp=f.depistage||{};return DEPISTAGE.filter(function(z){var v=dp[z[0]];return txt(v)!==''&&jaNein(v)!=='nein';}).map(function(z){return z[1];});}
function clotureVon(f){var c=(f.cdse||{}).cloture;return (c&&typeof c==='object')?(iso(c.von)||iso(c.bis)):'';}
/* Screening (Beobachtungsbogen): gespeicherte Kurzfassung des letzten Bogens */
var SC_ART={sofort:'Heute handeln',planen:'Unterstützung planen',foerdern:'Gezielt fördern',beobachten:'Im Blick behalten',unauffaellig:'Unauffällig'};
function scListe(d){return (Array.isArray(d.screenings)?d.screenings:[]).filter(function(s){return s&&iso(s.datum);}).slice().sort(function(a,b){return iso(b.datum).localeCompare(iso(a.datum))||String(b.z||'').localeCompare(String(a.z||''));});}
function scKurz(s){if(s.kurz&&s.kurz.bereiche){return s.kurz;}try{return window.CDSE_SCREENING?window.CDSE_SCREENING.kurz(s):null;}catch(e){return null;}}
function scBereichName(id){var b=window.CDSE_SCREENING_BOGEN;var x=b&&b.bereiche.filter(function(y){return y.id===id;})[0];return x?x.name:id;}

/* =====================================================================
   FELDER: alle Variablen – {key, label, gruppe, typ, optionen?, info?, wert(d)}
   typ: text | zahl | datum | auswahl | liste | ja-nein
   ===================================================================== */
var GRUPPEN=['Identität','Person','Schule','Begleitung im CDSE','Maßnahmen','Familie und Umfeld','Klinisches Profil','ELDiB','Entwicklung und Dossier'];
function F(key,label,gruppe,typ,fn,extra){
  var f={key:key,label:label,gruppe:gruppe,typ:typ,wert:function(d,x){if(!H){bausteine();}d=d||{};return fn(d,x||kontext(d));}};
  Object.keys(extra||{}).forEach(function(k){if(k==='optionen'&&typeof extra.optionen==='function'){Object.defineProperty(f,'optionen',{get:extra.optionen,enumerable:true});}else{f[k]=extra[k];}});
  return f;
}
var FELDER=[
  F('nachname','Nachname','Identität','text',function(d,x){return txt(x.p.nachname);}),
  F('vorname','Vorname','Identität','text',function(d,x){return txt(x.p.vorname);}),
  F('matricule','Matricule','Identität','text',function(d,x){return txt(x.p.matricule);}),
  F('mfiles','Dossier M-Files','Identität','text',function(d,x){return txt(x.f.mfiles);}),
  F('iam','Identité IAM','Identität','text',function(d,x){return txt(x.f.iam);}),
  F('geschlecht','Geschlecht','Person','auswahl',function(d,x){var g=norm(x.p.geschlecht);return g==='w'?'Mädchen':(g==='m'?'Junge':'');},{optionen:['Junge','Mädchen']}),
  F('geburtsdatum','Geburtsdatum','Person','datum',function(d,x){return iso(x.p.geburtsdatum);}),
  F('alter','Alter (Jahre)','Person','zahl',function(d,x){return alterVon(x.p.geburtsdatum);},{info:'aus dem Geburtsdatum berechnet'}),
  F('geburtsort','Geburtsort','Person','text',function(d,x){return txt(x.f.geburtsort);}),
  F('nationalitaet','Nationalität','Person','text',function(d,x){return txt(x.f.nationalitaet);}),
  F('erstsprache','Erstsprache (Angabe)','Person','text',function(d,x){return txt(x.f.ersteSprache);}),
  F('sprache','Erstsprache (Gruppe)','Person','auswahl',function(d,x){return spracheGruppe(x.f.ersteSprache);},{optionen:SPRACH_CODES,info:'vereinheitlicht: LU, FR, DE, PT …'}),
  F('migration','Migrationskontext','Person','ja-nein',function(d,x){return migrationVon(x.f);},{optionen:['ja','nein'],info:'„ja“, wenn die Fiche einen Migrationskontext oder ein Ankunftsdatum nennt'}),
  F('ankunft','Ankunft in Luxemburg','Person','datum',function(d,x){return iso(x.f.ankunft);}),
  F('wohnort','Wohnort (Ortschaft)','Person','text',function(d,x){return ortschaft(x.f.ort);},{info:'Code, localité der Fiche – ohne Straße und Postleitzahl'}),
  F('schule','Schule','Schule','text',function(d,x){return txt((x.f.schule||{}).name)||txt(x.p.schule);}),
  F('klasse','Klasse','Schule','text',function(d,x){return klasseVon(x);}),
  F('cycle','Cycle','Schule','auswahl',function(d,x){return cycleVon(klasseVon(x));},{optionen:['C1','C2','C3','C4','ES','andere'],info:'aus der Klasse abgeleitet (ES = Enseignement secondaire)'}),
  F('direction','Direction régionale','Schule','auswahl',function(d,x){return drAus((x.f.ef||{}).dr);},{optionen:DR}),
  F('schulform','Schulform','Schule','auswahl',function(d,x){var s=norm(x.db.schulform);return (s==='public'||s==='offentlich')?'öffentlich':((s==='prive'||s==='privat')?'privat':'');},{optionen:['öffentlich','privat']}),
  F('vorherigeSchule','Vorherige Schule','Schule','text',function(d,x){return txt(x.db.vorherigeSchule);}),
  F('schulwechsel','Schulwechsel am','Schule','datum',function(d,x){return iso(x.db.schulwechsel);}),
  F('laufbahn','Schullaufbahn','Schule','text',function(d,x){return laufbahnVon(x.f);},{info:'Progression scolaire der Fiche, ein Schuljahr nach dem anderen'}),
  F('stelle','Stelle','Begleitung im CDSE','auswahl',function(d){return stelleName(d.stelle);},{optionen:function(){return teams().map(function(t){return t.name;});}}),
  F('status','Status','Begleitung im CDSE','auswahl',function(d){return d.status==='inaktiv'?'inaktiv':'aktiv';},{optionen:['aktiv','inaktiv']}),
  F('verantwortlich','Fallverantwortlich','Begleitung im CDSE','liste',function(d){return (d.verantwortlich||[]).map(kontoName).filter(Boolean);}),
  F('beginn','Beginn der Begleitung','Begleitung im CDSE','datum',function(d,x){return x.beginn;},{info:'früheste Angabe: Datum der Fiche, Beginn einer Maßnahme oder Anlage des Dossiers'}),
  F('dauerBegleitung','Dauer der Begleitung (Monate)','Begleitung im CDSE','zahl',function(d,x){return x.beginn?monate(x.beginn,x.grenze):null;}),
  F('erstellt','Dossier angelegt','Begleitung im CDSE','datum',function(d){return iso(d.erstellt);}),
  F('geaendert','Zuletzt geändert','Begleitung im CDSE','datum',function(d){return iso(d.geaendert);}),
  F('ficheDatum','Datum der Fiche','Begleitung im CDSE','datum',function(d,x){return iso(x.f.datum);}),
  F('ficheSchuljahr','Schuljahr der Fiche','Begleitung im CDSE','text',function(d,x){return txt(x.f.schuljahr);}),
  F('cloture','Clôture du dossier','Begleitung im CDSE','datum',function(d,x){return clotureVon(x.f);},{info:'Datum der Clôture in der Fiche'}),
  F('massnahmen','Laufende Maßnahmen','Maßnahmen','liste',function(d,x){return eindeutig(x.ms.filter(function(m){return m.stand==='laufend';}).map(function(m){return m.kurz;}));},{optionen:ARTEN,info:'in der Fiche angekreuzt, begonnen und nicht beendet'}),
  F('massnahmenAlle','Alle Maßnahmen (auch beendete)','Maßnahmen','liste',function(d,x){return eindeutig(x.ms.map(function(m){return m.kurz;}));},{optionen:ARTEN}),
  F('massnahmenAnzahl','Anzahl Maßnahmen (auch beendete)','Maßnahmen','zahl',function(d,x){return x.ms.length;},{info:'in der Fiche angekreuzte Maßnahmen und die „andere Maßnahme“ der Datenbank'}),
  F('dsDatum','DS: Datum','Maßnahmen','datum',function(d,x){var m=eineMassnahme(x,'diagnostic');return m?(m.von||m.bis):'';},{mk:'diagnostic'}),
  F('dsEnde','DS: Ende','Maßnahmen','datum',mWert('diagnostic','bis'),{mk:'diagnostic'}),
  F('dsDauer','DS: Dauer (Monate)','Maßnahmen','zahl',mWert('diagnostic','dauer'),{mk:'diagnostic'}),
  F('dsWer','DS: Intervenant·e','Maßnahmen','text',function(d,x){var m=eineMassnahme(x,'diagnostic');return m?m.wer:'';},{mk:'diagnostic'}),
  F('isaBeginn','ISA: Beginn','Maßnahmen','datum',function(d,x){var m=eineMassnahme(x,'isa');return m?m.von:'';},{mk:'isa'}),
  F('isaEnde','ISA: Ende','Maßnahmen','datum',function(d,x){var m=eineMassnahme(x,'isa');return m?m.bis:'';},{mk:'isa'}),
  F('isaWer','ISA: Intervenant·e','Maßnahmen','text',function(d,x){var m=eineMassnahme(x,'isa');return m?m.wer:'';},{mk:'isa'}),
  F('isaDauer','ISA: Dauer (Monate)','Maßnahmen','zahl',function(d,x){var m=eineMassnahme(x,'isa');return m?m.dauer:null;},{mk:'isa',info:'Intervention spécialisée ambulatoire: vom Beginn bis zum Ende, sonst bis heute'}),
  F('cgArt','C&G: für wen','Maßnahmen','auswahl',function(d,x){return cgArtVon(x);},{optionen:['Fachkräfte','Eltern','Fachkräfte und Eltern'],mk:'cg'}),
  F('cgBeginn','C&G: Beginn','Maßnahmen','datum',function(d,x){return x.ms.filter(istCg).map(function(m){return m.von;}).filter(Boolean).sort()[0]||'';},{mk:'cg'}),
  F('cgEnde','C&G: Ende','Maßnahmen','datum',function(d,x){return cgEndeVon(x);},{mk:'cg',info:'leer, solange ein C&G läuft'}),
  F('cgDauer','C&G: Dauer (Monate)','Maßnahmen','zahl',function(d,x){return cgDauerVon(x);},{mk:'cg'}),
  F('cgWer','C&G: Intervenant·e','Maßnahmen','text',function(d,x){return eindeutig(x.ms.filter(istCg).map(function(m){return m.wer;})).join(', ');},{mk:'cg'}),
  F('atelierArt','Atelier: welches','Maßnahmen','text',mWert('atelier','standort'),{mk:'atelier',info:'„Quel atelier“ in der Fiche'}),
  F('atelierBeginn','Atelier: Beginn','Maßnahmen','datum',mWert('atelier','von'),{mk:'atelier'}),
  F('atelierEnde','Atelier: Ende','Maßnahmen','datum',mWert('atelier','bis'),{mk:'atelier'}),
  F('atelierDauer','Atelier: Dauer (Monate)','Maßnahmen','zahl',mWert('atelier','dauer'),{mk:'atelier'}),
  F('atelierWer','Atelier: Intervenant·e','Maßnahmen','text',mWert('atelier','wer'),{mk:'atelier'}),
  F('reeducationArt','Rééducation: welche','Maßnahmen','text',mWert('reeducation','standort'),{mk:'reeducation',info:'„Type de rééducation“ in der Fiche'}),
  F('reeducationBeginn','Rééducation: Beginn','Maßnahmen','datum',mWert('reeducation','von'),{mk:'reeducation'}),
  F('reeducationEnde','Rééducation: Ende','Maßnahmen','datum',mWert('reeducation','bis'),{mk:'reeducation'}),
  F('reeducationDauer','Rééducation: Dauer (Monate)','Maßnahmen','zahl',mWert('reeducation','dauer'),{mk:'reeducation'}),
  F('reeducationWer','Rééducation: Intervenant·e','Maßnahmen','text',mWert('reeducation','wer'),{mk:'reeducation'}),
  F('beschulung','Spezialisierte Beschulung','Maßnahmen','auswahl',function(d,x){var m=beschulungVon(x);return m?m.beschulung:'';},{optionen:['Annexe Junglinster','Classe de participation','CST'],mk:'beschulung',info:'Annexe, Classe de participation oder CST – die laufende bzw. jüngste'}),
  F('beschulungOrt','Standort (CdP / CST)','Maßnahmen','text',function(d,x){var m=beschulungVon(x);return m?m.standort:'';},{mk:'beschulung'}),
  F('beschulungBeginn','Spez. Beschulung: Beginn','Maßnahmen','datum',function(d,x){var m=beschulungVon(x);return m?m.von:'';},{mk:'beschulung'}),
  F('beschulungDauer','Spez. Beschulung: Dauer (Monate)','Maßnahmen','zahl',function(d,x){var m=beschulungVon(x);return m?m.dauer:null;},{mk:'beschulung'}),
  F('annexeBeginn','Annexe: Beginn','Maßnahmen','datum',mWert('annexe','von'),{mk:'annexe'}),
  F('annexeEnde','Annexe: Ende','Maßnahmen','datum',mWert('annexe','bis'),{mk:'annexe'}),
  F('annexeDauer','Annexe: Dauer (Monate)','Maßnahmen','zahl',mWert('annexe','dauer'),{mk:'annexe'}),
  F('cstGruppe','CST: Gruppe','Maßnahmen','auswahl',mWert('cst','standort'),{mk:'cst'}),
  F('cstBeginn','CST: Beginn','Maßnahmen','datum',mWert('cst','von'),{mk:'cst'}),
  F('cstEnde','CST: Ende','Maßnahmen','datum',mWert('cst','bis'),{mk:'cst'}),
  F('cstDauer','CST: Dauer (Monate)','Maßnahmen','zahl',mWert('cst','dauer'),{mk:'cst'}),
  F('cdpRegion','CdP: Region (Direction)','Maßnahmen','auswahl',mWert('cdp','standort'),{optionen:DR,mk:'cdp'}),
  F('cdpBeginn','CdP: Beginn','Maßnahmen','datum',mWert('cdp','von'),{mk:'cdp'}),
  F('cdpEnde','CdP: Ende','Maßnahmen','datum',mWert('cdp','bis'),{mk:'cdp'}),
  F('cdpDauer','CdP: Dauer (Monate)','Maßnahmen','zahl',mWert('cdp','dauer'),{mk:'cdp'}),
  F('cni','CNI-Entscheidung','Maßnahmen','datum',function(d,x){return iso(x.db.cni);}),
  F('andereMassnahme','Andere Maßnahme','Maßnahmen','text',function(d,x){return txt((x.db.autreMesure||{}).name);}),
  F('andereDauer','Andere Maßnahme: Dauer (Monate)','Maßnahmen','zahl',mWert('autre','dauer'),{mk:'autre'}),
  F('dienste','Weitere Dienste','Familie und Umfeld','liste',function(d,x){return diensteVon(x);},{info:'Autres intervenant·e·s der Fiche, Maison Relais, andere Kompetenzzentren'}),
  F('schulHilfen','Unterstützung in der Schule','Familie und Umfeld','liste',function(d,x){return hilfenVon(x);},{info:'I-EBS, A-EBS, ESEB, SePas, SSE aus der Fiche'}),
  F('autreCc','Andere Kompetenzzentren','Familie und Umfeld','liste',function(d,x){return ccListe(x.db.autreCc);},{optionen:CC_CODES,info:'CDA, CDI, CDM, CDV, CEJHP, CL, CTSA – mehrere möglich'}),
  F('scas','SCAS','Familie und Umfeld','ja-nein',function(d,x){return scasVon(x);},{optionen:['ja','nein'],info:'„ja“ auch automatisch, wenn der SCAS bei den Intervenants der Fiche steht – außer es ist ausdrücklich eingetragen'}),
  F('sorgerecht','Sorgerecht (autorité parentale)','Familie und Umfeld','liste',function(d,x){return sorgerechtVon(x);},{info:'Datenbank-Angabe, sonst die Représentant·e·s mit autorité parentale aus der Fiche'}),
  F('eltern','Elternsituation','Familie und Umfeld','auswahl',function(d,x){var e=norm(x.db.eltern);return ['zusammen','getrennt','anderes'].indexOf(e)>=0?e:'';},{optionen:['zusammen','getrennt','anderes']}),
  F('massnahmenFamilie','Maßnahmen Familie','Familie und Umfeld','liste',function(d,x){return liste(x.db.massnahmenFamilie);}),
  F('scolEtranger','Schulbesuch im Ausland','Familie und Umfeld','ja-nein',function(d,x){return jaNein(x.db.scolEtranger);},{optionen:['ja','nein']}),
  F('diagnosen','Diagnosen','Klinisches Profil','liste',function(d,x){return liste(x.db.diagnosen);},{info:'nur, was in den Datenbank-Angaben eingetragen ist'}),
  F('verdacht','Verdacht / Profil','Klinisches Profil','liste',function(d,x){return liste(x.db.verdacht);}),
  F('iq','IQ','Klinisches Profil','zahl',function(d,x){return zahl(x.db.iq);}),
  F('depistage','Dépistage','Klinisches Profil','liste',function(d,x){return depistageVon(x.f);},{optionen:['CL','CDM','CDV','andere'],info:'Kompetenzzentren mit einem Eintrag unter „Dépistage“ in der Fiche'}),
  F('eldibDatum','ELDiB: Datum der Einschätzung','ELDiB','datum',function(d,x){var e=eldibStufen(d,x);return e?e.datum:'';},{quelle:'eldib'}),
  F('eldibHerkunft','ELDiB: Stufen aus','ELDiB','auswahl',function(d,x){var e=eldibStufen(d,x);return e?e.herkunft:'';},{quelle:'eldib',optionen:['Einschätzung im Dossier','Datenbank-Angabe'],info:'die ELDiB-Einschätzung im Dossier gilt; die Datenbank-Angabe nur, wenn es keine gibt (ältere Fälle)'}),
  F('eldibVerhalten','ELDiB: Stufe Verhalten (V)','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.stufen.verhalten:null;},{quelle:'eldib',info:'höchste Stufe mit erreichten Items (1–5, 0 = noch keine)'}),
  F('eldibKommunikation','ELDiB: Stufe Kommunikation (K)','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.stufen.kommunikation:null;},{quelle:'eldib'}),
  F('eldibSozialisation','ELDiB: Stufe Sozialisation (SOZ)','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.stufen.sozialisation:null;},{quelle:'eldib'}),
  F('eldibKognition','ELDiB: Stufe Kognition (KOG)','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.stufen.kognition:null;},{quelle:'eldib'}),
  F('eldibMin','ELDiB: niedrigste Stufe','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.min:null;},{quelle:'eldib',info:'die niedrigste der vier Bereichsstufen'}),
  F('eldibErwartet','ELDiB: erwartete Stufe (Alter)','ELDiB','zahl',function(d,x){var e=eldibStufen(d,x);return e?e.erwartet:null;},{quelle:'eldib',info:'für das Alter am Tag der Einschätzung: bis 2 Jahre Stufe 1, 3–5 Stufe 2, 6–9 Stufe 3, 10–12 Stufe 4, ab 13 Stufe 5'}),
  F('eldibUnter','ELDiB: Bereiche unter der erwarteten Stufe','ELDiB','liste',function(d,x){var e=eldibStufen(d,x);return e?e.unter:[];},{quelle:'eldib',optionen:['Verhalten','Kommunikation','Sozialisation','Kognition']}),
  F('eldibZiele','ELDiB: Förderziele','ELDiB','zahl',function(d){var k=eldib(d);return k?k.ziele:null;}),
  F('eldibUeber','ELDiB: überfällige Items','ELDiB','zahl',function(d){var k=eldib(d);return k?k.ueber:null;}),
  F('eintraege','Anzahl Einträge','Entwicklung und Dossier','zahl',function(d){return (d.eintraege||[]).length;}),
  F('screeningDatum','Letztes Screening','Entwicklung und Dossier','datum',function(d){var l=scListe(d);return l.length?iso(l[0].datum):'';}),
  F('screeningStand','Screening: Einschätzung','Entwicklung und Dossier','auswahl',function(d){var l=scListe(d), k=l.length?scKurz(l[0]):null;return k?(SC_ART[k.gesamt]||''):'';},{optionen:['Heute handeln','Unterstützung planen','Gezielt fördern','Im Blick behalten','Unauffällig'],info:'Gesamteinschätzung des letzten Screenings (keine Diagnose)'}),
  F('screeningDeutlich','Screening: deutliche Bereiche','Entwicklung und Dossier','liste',function(d){var l=scListe(d), k=l.length?scKurz(l[0]):null;if(!k){return [];}return Object.keys(k.bereiche||{}).filter(function(id){return k.bereiche[id]&&k.bereiche[id].stufe==='rot';}).map(scBereichName);}),
  F('screeningWarn','Screening: Warnsignal (3 Monate)','Entwicklung und Dossier','ja-nein',function(d){var l=scListe(d);if(!l.length){return '';}var g=new Date(Date.now()-90*864e5).toISOString().slice(0,10);return l.some(function(s){var k=scKurz(s);return iso(s.datum)>=g&&k&&(k.warn||[]).length;})?'ja':'nein';},{optionen:['ja','nein']}),
  F('letzterEintrag','Letzter Eintrag','Entwicklung und Dossier','datum',function(d){return (d.eintraege||[]).map(function(e){return iso(e&&e.datum);}).filter(Boolean).sort().pop()||'';}),
  F('vorfaelle','Vorfälle (3 Monate)','Entwicklung und Dossier','zahl',function(d){return vorfaelle(d).length;},{info:'Einträge der Art „Vorfall / Krise“ in den letzten 90 Tagen'}),
  F('timeout','Time-out-Minuten (3 Monate)','Entwicklung und Dossier','zahl',function(d){return vorfaelle(d).reduce(function(s,e){return s+toMinuten(e.vorfall);},0);},{info:'Summe der Time-outs aus den Vorfallprotokollen der letzten 90 Tage'})
];
/* Vorfall-/Krisenprotokolle der letzten 90 Tage (Dossier → Einträge, Art „vorfall“) */
function vorfaelle(d){var g=new Date(Date.now()-90*864e5).toISOString().slice(0,10);return (d.eintraege||[]).filter(function(e){return e&&e.art==='vorfall'&&iso(e.datum)>=g;});}
function toMinuten(v){v=v||{};var a=/^(\d\d):(\d\d)$/.exec(v.timeoutVon||''), b=/^(\d\d):(\d\d)$/.exec(v.timeoutBis||'');if(!a||!b){return 0;}var m=(+b[1]*60+ +b[2])-(+a[1]*60+ +a[2]);return m>0?m:0;}
/* Woher kommt der Wert? fiche = Fiche de renseignement (Reiter „Fiche“ im Dossier),
   db = nur Datenbank-Angaben, beide = Datenbank-Angabe mit Fiche als Ersatz, dossier = Dossier selbst */
var AUS_FICHE=['nachname','vorname','matricule','mfiles','iam','geschlecht','geburtsdatum','alter','geburtsort','nationalitaet','erstsprache','sprache','migration','ankunft','wohnort',
  'schule','klasse','cycle','direction','laufbahn','ficheDatum','ficheSchuljahr','cloture','massnahmen','massnahmenAlle','massnahmenAnzahl','schulHilfen','depistage','beginn','dauerBegleitung'];
var AUS_BEIDEN=['dienste','scas','sorgerecht'];
var NUR_DB=['schulform','vorherigeSchule','schulwechsel','cni','andereMassnahme','andereDauer','autreCc','eltern','massnahmenFamilie','scolEtranger','diagnosen','verdacht','iq'];
/* Variablen je Maßnahme (mk) kommen aus der Fiche – außer der „anderen Maßnahme“ der Datenbank; ELDiB: Dossier, sonst Datenbank */
FELDER.forEach(function(f){f.quelle=f.quelle||((AUS_FICHE.indexOf(f.key)>=0||(f.mk&&f.mk!=='autre'))?'fiche':(AUS_BEIDEN.indexOf(f.key)>=0?'beide':(NUR_DB.indexOf(f.key)>=0?'db':'dossier')));});
var QUELLE_TEXT={fiche:'Fiche',beide:'Fiche + Datenbank',db:'Datenbank',dossier:'Dossier',eldib:'ELDiB im Dossier, sonst Datenbank'};
var FELD_MAP=null;
function feldVon(k){if(!FELD_MAP){FELD_MAP={};FELDER.forEach(function(f){FELD_MAP[f.key]=f;});}return FELD_MAP[k]||null;}
function optionenVon(f){var o=f&&f.optionen;return Array.isArray(o)?o:[];}
function gruppierbar(f){return ['nachname','vorname','matricule','mfiles','iam','geburtsdatum','laufbahn'].indexOf(f.key)<0;}
function leerWert(f,v){if(f.typ==='liste'){return Array.isArray(v)?eindeutig(v):[];}if(f.typ==='zahl'){return istZahl(v)?v:null;}return v==null?'':String(v);}

/* datensatz(d): flaches Objekt aller Variablen eines Dossiers (zwischengespeichert je Stand und Tag) */
var dsCache={};
function datensatz(d){
  bausteine();
  if(!d||typeof d!=='object'){return {};}
  var k=(d.rev|0)+'|'+(d.geaendert||'')+'|'+heute();
  if(d.id&&dsCache[d.id]&&dsCache[d.id].k===k){return dsCache[d.id].r;}
  var x=kontext(d), r={id:d.id||''};
  FELDER.forEach(function(f){var v;try{v=f.wert(d,x);}catch(e){v=null;}r[f.key]=leerWert(f,v);});
  if(d.id){dsCache[d.id]={k:k,r:r};}
  return r;
}
function anzeige(f,v){
  if(f.typ==='liste'){return (v||[]).join(', ');}
  if(f.typ==='datum'){return v?datumDe(v):'';}
  if(f.typ==='zahl'){return istZahl(v)?zahlDe(v,1):'';}
  if(f.key==='sprache'&&v){return v==='andere'?'andere':v+' – '+spracheName(v);}
  return txt(v);
}

/* =====================================================================
   Filter und Abfragen (wie query-engine.js von CDSE Stats)
   ===================================================================== */
var OPS={
  text:[['ist','ist'],['istNicht','ist nicht'],['einesVon','ist eines von'],['keinesVon','ist keines von'],['enthaelt','enthält'],['leer','ohne Angabe'],['gefuellt','mit Angabe']],
  auswahl:[['ist','ist'],['istNicht','ist nicht'],['einesVon','ist eines von'],['keinesVon','ist keines von'],['leer','ohne Angabe'],['gefuellt','mit Angabe']],
  'ja-nein':[['ist','ist'],['istNicht','ist nicht'],['leer','ohne Angabe'],['gefuellt','mit Angabe']],
  zahl:[['gleich','gleich'],['ungleich','ungleich'],['groesser','größer als'],['mindestens','mindestens'],['kleiner','kleiner als'],['hoechstens','höchstens'],['zwischen','zwischen'],['leer','ohne Angabe'],['gefuellt','mit Angabe']],
  datum:[['am','am'],['nach','nach dem'],['ab','ab dem'],['vor','vor dem'],['bis','bis zum'],['zwischen','zwischen'],['imSchuljahr','im Schuljahr'],['leer','ohne Angabe'],['gefuellt','mit Angabe']],
  liste:[['enthaelt','enthält'],['enthaeltEines','enthält eines von'],['enthaeltAlle','enthält alle von'],['enthaeltNicht','enthält nicht'],['enthaeltKeines','enthält keines von'],['enthaeltText','enthält den Text'],['leer','ohne Angabe'],['gefuellt','mit Angabe']]
};
var KENNZAHLEN=[['anzahl','Anzahl der Dossiers'],['mittel','Mittelwert'],['median','Median'],['min','Minimum'],['max','Maximum'],['summe','Summe']];
/* Bedingungen mit mehreren Werten (fl.werte): „ist eines von“, „enthält alle von“ … */
var MEHRFACH=['einesVon','keinesVon','enthaeltEines','enthaeltAlle','enthaeltKeines'];
function mehrfach(op){return MEHRFACH.indexOf(op)>=0;}
function werteVon(fl){return eindeutig(Array.isArray(fl.werte)?fl.werte:(txt(fl.wert)?String(fl.wert).split('|'):[]));}
function brauchtWert(op){return op!=='leer'&&op!=='gefuellt';}
function opsFuer(f){return f?(OPS[f.typ]||[]):[];}
function vollstaendig(fl){
  var f=fl&&feldVon(fl.feld);if(!f){return false;}
  if(!opsFuer(f).some(function(o){return o[0]===fl.op;})){return false;}
  if(mehrfach(fl.op)){return werteVon(fl).length>0;}
  if(brauchtWert(fl.op)&&txt(fl.wert)===''){return false;}
  if(fl.op==='zwischen'&&txt(fl.wert2)===''){return false;}
  return true;
}
function passt(r,fl){
  var f=feldVon(fl.feld);if(!f){return true;}
  var v=r[fl.feld], op=fl.op;
  if(op==='leer'){return istLeer(v);}
  if(op==='gefuellt'){return !istLeer(v);}
  if(mehrfach(op)){
    var ws=werteVon(fl).map(norm);
    if(f.typ==='liste'){
      var lv=(v||[]).map(norm), drin=function(w){return lv.indexOf(w)>=0;};
      if(op==='enthaeltEines'){return ws.some(drin);}
      if(op==='enthaeltAlle'){return ws.every(drin);}
      if(op==='enthaeltKeines'){return !ws.some(drin);}
      return true;
    }
    var sv=norm(v);
    if(op==='einesVon'){return ws.indexOf(sv)>=0;}
    if(op==='keinesVon'){return ws.indexOf(sv)<0;}
    return true;
  }
  if(f.typ==='zahl'){
    if(!istZahl(v)){return false;}
    var a=zahl(fl.wert), b=zahl(fl.wert2);if(a==null){return true;}
    switch(op){case 'gleich':return v===a;case 'ungleich':return v!==a;case 'groesser':return v>a;case 'mindestens':return v>=a;case 'kleiner':return v<a;case 'hoechstens':return v<=a;
      case 'zwischen':return b==null?v>=a:(v>=Math.min(a,b)&&v<=Math.max(a,b));}
    return true;
  }
  if(f.typ==='datum'){
    if(op==='imSchuljahr'){return !!v&&sjVon(v)===txt(fl.wert);}
    if(!v){return false;}
    var a2=iso(fl.wert), b2=iso(fl.wert2);if(!a2){return true;}
    switch(op){case 'am':return v===a2;case 'nach':return v>a2;case 'ab':return v>=a2;case 'vor':return v<a2;case 'bis':return v<=a2;case 'zwischen':return b2?(v>=(a2<b2?a2:b2)&&v<=(a2<b2?b2:a2)):v>=a2;}
    return true;
  }
  if(f.typ==='liste'){
    var l=(v||[]).map(norm);
    if(op==='enthaelt'){return l.indexOf(norm(fl.wert))>=0;}
    if(op==='enthaeltNicht'){return l.indexOf(norm(fl.wert))<0;}
    if(op==='enthaeltText'){var nadeln=String(fl.wert||'').split('|').map(norm).filter(Boolean);return !nadeln.length||l.some(function(x){return nadeln.some(function(n){return x.indexOf(n)>=0;});});}
    return true;
  }
  var s=norm(v);
  if(op==='ist'){return s===norm(fl.wert);}
  if(op==='istNicht'){return s!==norm(fl.wert);}
  if(op==='enthaelt'){return s.indexOf(norm(fl.wert))>=0;}
  return true;
}
function gruppenSchluessel(f,v){
  if(f.typ==='liste'){return v&&v.length?v.slice():[OHNE];}
  if(f.typ==='datum'){return v?[sjVon(v)]:[OHNE];}
  if(f.typ==='zahl'){return istZahl(v)?[String(v)]:[OHNE];}
  return txt(v)?[txt(v)]:[OHNE];
}
function rechnen(kz,rows){
  var nf=kz.fn!=='anzahl'?feldVon(kz.feld):null;
  if(!nf){return {wert:rows.length,n:rows.length,mitWert:rows.length};}
  var w=rows.map(function(r){return r[nf.key];}).filter(istZahl), erg=null;
  if(w.length){
    if(kz.fn==='mittel'){erg=mittel(w);}
    else if(kz.fn==='median'){var s=w.slice().sort(function(a,b){return a-b;}), m=Math.floor(s.length/2);erg=s.length%2?s[m]:(s[m-1]+s[m])/2;}
    else if(kz.fn==='min'){erg=Math.min.apply(null,w);}
    else if(kz.fn==='max'){erg=Math.max.apply(null,w);}
    else if(kz.fn==='summe'){erg=w.reduce(function(a,b){return a+b;},0);}
  }
  return {wert:erg,n:rows.length,mitWert:w.length};
}
/* Gruppen einer Variablen (Mehrfachnennung bei Listen); sortiert wie die Auswahl, sonst nach Größe */
function gruppenBilden(rows,g,kz){
  var eimer={}, keys=[], mehr=false;
  rows.forEach(function(r){var ks=gruppenSchluessel(g,r[g.key]);if(ks.length>1){mehr=true;}ks.forEach(function(k){if(!eimer[k]){eimer[k]=[];keys.push(k);}eimer[k].push(r);});});
  var opt=g.key==='sprache'?[]:optionenVon(g);
  var l=keys.map(function(k){var e=rechnen(kz,eimer[k]);e.key=k;return e;}).sort(function(x,y){
    if(x.key===OHNE){return 1;}if(y.key===OHNE){return -1;}
    if(g.typ==='zahl'){return Number(x.key)-Number(y.key);}
    if(g.typ==='datum'){return x.key<y.key?-1:1;}
    var ix=opt.indexOf(x.key), iy=opt.indexOf(y.key);
    if(ix>=0||iy>=0){return (ix<0?999:ix)-(iy<0?999:iy);}
    return (y.n-x.n)||x.key.localeCompare(y.key,'de');
  });
  return {gruppen:l,mehrfach:mehr};
}
/* Abfrage: {kennzahl:{fn,feld}, filter:[{feld,op,wert,wert2,werte}], verknuepfung:'und'|'oder', gruppe:key, gruppe2:key}
   verknuepfung „oder“: mindestens ein Filter trifft zu. gruppe2: Kreuztabelle gruppe × gruppe2. */
function ausfuehren(rows,a){
  var fl=(a.filter||[]).filter(vollstaendig), kz=a.kennzahl||{fn:'anzahl'}, oder=a.verknuepfung==='oder';
  var treffer=rows.filter(function(r){if(!fl.length){return true;}var t=function(x){return passt(r,x);};return oder?fl.some(t):fl.every(t);});
  var g=feldVon(a.gruppe), g2=g?feldVon(a.gruppe2):null;if(g2&&g2.key===g.key){g2=null;}
  var res={n:treffer.length,basis:rows.length,treffer:treffer,gruppe:g?g.key:'',gruppe2:g2?g2.key:'',gruppen:[],gesamt:rechnen(kz,treffer),mehrfach:false,kreuz:null};
  if(!g){return res;}
  var gb=gruppenBilden(treffer,g,kz);res.gruppen=gb.gruppen;res.mehrfach=gb.mehrfach;
  if(g2){
    var sp=gruppenBilden(treffer,g2,kz), fach={};if(sp.mehrfach){res.mehrfach=true;}
    treffer.forEach(function(r){var k2=gruppenSchluessel(g2,r[g2.key]);gruppenSchluessel(g,r[g.key]).forEach(function(k1){k2.forEach(function(k){var z=k1+'\u0000'+k;(fach[z]=fach[z]||[]).push(r);});});});
    res.kreuz={spalten:sp.gruppen,zeilen:res.gruppen.map(function(z){
      var zellen={};sp.gruppen.forEach(function(s){zellen[s.key]=rechnen(kz,fach[z.key+'\u0000'+s.key]||[]);});
      return {key:z.key,n:z.n,wert:z.wert,mitWert:z.mitWert,zellen:zellen};
    })};
  }
  return res;
}
function wertText(f,w,op){
  if(f.typ==='datum'&&op!=='imSchuljahr'){return datumDe(iso(w)||txt(w));}
  if(op==='enthaeltText'){return String(w).split('|').join(' / ');}
  if(f.key==='sprache'&&w&&w!=='andere'){return w+' ('+spracheName(w)+')';}
  return txt(w);
}
function filterText(fl){
  var f=feldVon(fl.feld);if(!f){return '';}
  var o=opsFuer(f).filter(function(x){return x[0]===fl.op;})[0], ol=o?o[1]:fl.op;
  if(!brauchtWert(fl.op)){return f.label+' '+ol;}
  if(mehrfach(fl.op)){return f.label+' '+ol+' '+werteVon(fl).map(function(w){return '„'+wertText(f,w,'ist')+'“';}).join(', ');}
  if(fl.op==='zwischen'){return f.label+' zwischen '+wertText(f,fl.wert,fl.op)+' und '+wertText(f,fl.wert2,fl.op);}
  var w=wertText(f,fl.wert,fl.op);
  return f.label+' '+ol+' '+((f.typ==='zahl'||f.typ==='datum'||fl.op==='imSchuljahr')?w:'„'+w+'“');
}
function oderListe(l){return l.length<2?l.join(''):l.slice(0,-1).join(', ')+' oder '+l[l.length-1];}
/* Die Abfrage als Satz: „Durchschnittsalter der Mädchen mit ISA in der DR 06 Esch/Alzette, gruppiert nach Stelle.“ */
function satz(a){
  var kz=a.kennzahl||{fn:'anzahl'}, nf=kz.fn!=='anzahl'?feldVon(kz.feld):null, fl=(a.filter||[]).filter(vollstaendig);
  var wer='Schüler', mit=[], ohne=[], orte=[], rest=[], oder=a.verknuepfung==='oder'&&fl.length>1;
  if(oder){rest=fl.map(filterText);fl=[];}
  fl.forEach(function(x){
    var ws=mehrfach(x.op)?werteVon(x):[];
    if(x.feld==='geschlecht'&&x.op==='ist'&&(x.wert==='Mädchen'||x.wert==='Junge')&&wer==='Schüler'){wer=x.wert==='Mädchen'?'Mädchen':'Jungen';return;}
    if(x.feld==='geschlecht'&&x.op==='einesVon'&&ws.length===1&&(ws[0]==='Mädchen'||ws[0]==='Junge')&&wer==='Schüler'){wer=ws[0]==='Mädchen'?'Mädchen':'Jungen';return;}
    if(x.feld==='massnahmen'&&(x.op==='enthaelt'||x.op==='enthaeltText')){mit.push(String(x.wert).split('|')[0]);return;}
    if(x.feld==='massnahmen'&&x.op==='enthaeltEines'){mit.push(oderListe(ws));return;}
    if(x.feld==='massnahmen'&&x.op==='enthaeltAlle'){mit.push(ws.join(' und '));return;}
    if(x.feld==='massnahmen'&&x.op==='enthaeltNicht'){ohne.push(x.wert);return;}
    if(x.feld==='massnahmen'&&x.op==='enthaeltKeines'){ohne.push(ws.join(' und '));return;}
    if(x.feld==='direction'&&x.op==='ist'){orte.push('in der DR '+x.wert);return;}
    if(x.feld==='direction'&&x.op==='einesVon'){orte.push((ws.length>1?'in den DR ':'in der DR ')+oderListe(ws));return;}
    if(x.feld==='stelle'&&x.op==='ist'){orte.push('in der Stelle '+x.wert);return;}
    if(x.feld==='stelle'&&x.op==='einesVon'){orte.push((ws.length>1?'in den Stellen ':'in der Stelle ')+oderListe(ws));return;}
    if(x.feld==='cycle'&&x.op==='ist'&&/^C[1-4]$/.test(x.wert)){orte.push('im Cycle '+x.wert.slice(1));return;}
    if(x.feld==='cycle'&&x.op==='einesVon'&&ws.length&&ws.every(function(c){return /^C[1-4]$/.test(c);})){orte.push('im Cycle '+oderListe(ws.map(function(c){return c.slice(1);})));return;}
    if(x.feld==='cycle'&&x.op==='ist'&&x.wert==='ES'){orte.push('im Enseignement secondaire');return;}
    if(x.feld==='alter'){
      var ap={zwischen:'zwischen '+x.wert+' und '+x.wert2+' Jahren',gleich:'mit '+x.wert+' Jahren',kleiner:'unter '+x.wert+' Jahren',groesser:'über '+x.wert+' Jahren',mindestens:'ab '+x.wert+' Jahren',hoechstens:'bis '+x.wert+' Jahre'}[x.op];
      if(ap){orte.push(ap);return;}
    }
    if(x.feld==='beginn'&&x.op==='imSchuljahr'){orte.push('neu im Schuljahr '+x.wert);return;}
    if(x.feld==='status'&&x.op==='ist'){orte.push(x.wert==='inaktiv'?'mit inaktivem Dossier':'mit aktivem Dossier');return;}
    rest.push(filterText(x));
  });
  var s;
  if(!nf){s='Anzahl der '+wer;}
  else if(nf.key==='alter'&&kz.fn==='mittel'){s='Durchschnittsalter der '+wer;}
  else{s={mittel:'Durchschnitt',median:'Median',min:'Minimum',max:'Maximum',summe:'Summe'}[kz.fn]+' von „'+nf.label+'“ der '+wer;}
  if(mit.length){s+=' mit '+mit.join(' und ');}
  if(ohne.length){s+=' ohne '+ohne.join(' und ');}
  if(orte.length){s+=' '+orte.join(' ');}
  if(oder){s+=', bei denen mindestens eine Bedingung zutrifft: '+rest.join(' oder ');}
  else if(rest.length){s+=' ('+rest.join('; ')+')';}
  var g=feldVon(a.gruppe), g2=g?feldVon(a.gruppe2):null;
  if(g){s+=', gruppiert nach '+g.label+(g.typ==='datum'?' (Schuljahr)':'')+(g2&&g2.key!==g.key?' und '+g2.label+(g2.typ==='datum'?' (Schuljahr)':''):'');}
  return s+'.';
}
function neueAbfrage(){return {kennzahl:{fn:'anzahl',feld:''},filter:[],verknuepfung:'und',gruppe:'stelle',gruppe2:''};}
/* Gespeicherte Abfragen älterer Stände bleiben gültig: fehlende Angaben ergänzen,
   „ist“ bei Listen-Variablen als „enthält“ lesen, „Anderes Kompetenzzentrum“ war früher Freitext */
function abfrageNorm(a){
  a=kopie(a||{});a.kennzahl=a.kennzahl||{fn:'anzahl',feld:''};a.kennzahl.feld=a.kennzahl.feld||'';
  a.filter=(Array.isArray(a.filter)?a.filter:[]).filter(function(fl){return fl&&typeof fl==='object';}).map(function(fl){
    var f=feldVon(fl.feld);
    if(f&&f.typ==='liste'){if(fl.op==='ist'){fl.op='enthaelt';}else if(fl.op==='istNicht'){fl.op='enthaeltNicht';}}
    if(f&&f.key==='autreCc'&&fl.op==='enthaelt'&&CC_CODES.indexOf(txt(fl.wert))<0){var cs=ccCodes(fl.wert);if(cs.length===1){fl.wert=cs[0];}else{fl.op='enthaeltText';}}
    if(mehrfach(fl.op)){fl.werte=werteVon(fl);delete fl.wert;}
    return fl;
  });
  a.verknuepfung=a.verknuepfung==='oder'?'oder':'und';a.gruppe=a.gruppe||'';a.gruppe2=a.gruppe&&a.gruppe2&&a.gruppe2!==a.gruppe?a.gruppe2:'';
  return a;
}

/* Vorlagen: typische Fragen der Leitung und des Ministeriums – nach Bereichen geordnet */
var VORLAGEN_BEREICHE=['Überblick','Maßnahmen und Dauer','Profil, ELDiB und Umfeld','Mehrere Variablen verknüpfen'];
function mitM(m){return {feld:'massnahmenAlle',op:'enthaelt',wert:m};}
var VORLAGEN=[
  {id:'stelle',b:0,titel:'Schüler je Stelle',text:'Wie viele Schüler betreut jede Stelle?',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'stelle'}},
  {id:'massnahmen',b:0,titel:'Laufende Maßnahmen nach Art',text:'Welche Maßnahmen laufen gerade – und wie oft?',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'massnahmen'}},
  {id:'dr',b:0,titel:'Schüler je Direction régionale',text:'Aus welchen Regionen kommen die Schüler (Enseignement fondamental)?',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'direction'}},
  {id:'cycle',b:0,titel:'Verteilung nach Cycle',text:'C1 bis C4 und Enseignement secondaire',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'cycle'}},
  {id:'geschlecht',b:0,titel:'Jungen und Mädchen',text:'Verteilung nach Geschlecht',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'geschlecht'}},
  {id:'alterStelle',b:0,titel:'Durchschnittsalter je Stelle',text:'Wie alt sind die Schüler im Schnitt?',a:{kennzahl:{fn:'mittel',feld:'alter'},filter:[],gruppe:'stelle'}},
  {id:'neu',b:0,titel:'Neue Fälle je Schuljahr',text:'Beginn der Begleitung, gezählt je Schuljahr (ab 15. August)',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'beginn'}},
  {id:'isaDauer',b:1,titel:'Dauer der ISA je Stelle',text:'Durchschnittliche Dauer der Intervention spécialisée ambulatoire in Monaten',a:{kennzahl:{fn:'mittel',feld:'isaDauer'},filter:[mitM('ISA')],gruppe:'stelle'}},
  {id:'isaProfil',b:1,titel:'Dauer der ISA je Profil',text:'Mittlere Dauer der ISA, gruppiert nach „Verdacht / Profil“',a:{kennzahl:{fn:'mittel',feld:'isaDauer'},filter:[mitM('ISA')],gruppe:'verdacht'}},
  {id:'isaSchule',b:1,titel:'Dauer der ISA je Schule',text:'Mittlere Dauer der ISA, gruppiert nach Schule',a:{kennzahl:{fn:'mittel',feld:'isaDauer'},filter:[mitM('ISA')],gruppe:'schule'}},
  {id:'atelierArt',b:1,titel:'Ateliers nach Art',text:'Welche Ateliers – und wie oft (auch beendete)?',a:{kennzahl:{fn:'anzahl'},filter:[mitM('Atelier')],gruppe:'atelierArt'}},
  {id:'atelierDauer',b:1,titel:'Dauer je Atelier',text:'Mittlere Dauer in Monaten, je Atelier',a:{kennzahl:{fn:'mittel',feld:'atelierDauer'},filter:[mitM('Atelier')],gruppe:'atelierArt'}},
  {id:'reeducationArt',b:1,titel:'Rééducations nach Art',text:'Welche Rééducations – und wie oft?',a:{kennzahl:{fn:'anzahl'},filter:[mitM('Rééducation')],gruppe:'reeducationArt'}},
  {id:'cgArt',b:1,titel:'C&G für Fachkräfte oder Eltern',text:'Conseil et guidance: für wen?',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'cgArt',op:'gefuellt'}],gruppe:'cgArt'}},
  {id:'beschulung',b:1,titel:'Spezialisierte Beschulung',text:'Annexe, Classes de participation und CST (laufend)',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'massnahmen',op:'gefuellt'},{feld:'beschulung',op:'gefuellt'}],gruppe:'beschulung'}},
  {id:'beschulungDauer',b:1,titel:'Dauer der spezialisierten Beschulung',text:'Mittlere Dauer in Monaten: Annexe, CdP, CST',a:{kennzahl:{fn:'mittel',feld:'beschulungDauer'},filter:[{feld:'beschulung',op:'gefuellt'}],gruppe:'beschulung'}},
  {id:'cstGruppe',b:1,titel:'CST nach Gruppe',text:'Moveo, Passo … (auch beendete)',a:{kennzahl:{fn:'anzahl'},filter:[mitM('CST')],gruppe:'cstGruppe'}},
  {id:'cdpRegion',b:1,titel:'Classes de participation nach Region',text:'In welcher Direction liegt die Klasse?',a:{kennzahl:{fn:'anzahl'},filter:[mitM('CdP')],gruppe:'cdpRegion'}},
  {id:'begleitungDauer',b:1,titel:'Dauer der Begleitung je Stelle',text:'Vom Beginn der Begleitung bis heute bzw. bis zum Abschluss',a:{kennzahl:{fn:'mittel',feld:'dauerBegleitung'},filter:[],gruppe:'stelle'}},
  {id:'cni',b:1,titel:'CNI-Entscheidungen je Schuljahr',text:'Entscheidungen der Commission nationale d’inclusion',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'cni',op:'gefuellt'}],gruppe:'cni'}},
  {id:'cc',b:2,titel:'Andere Kompetenzzentren',text:'Welche Kompetenzzentren sind außerdem beteiligt?',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'autreCc',op:'gefuellt'}],gruppe:'autreCc'}},
  {id:'scas',b:2,titel:'SCAS beteiligt, je Direction',text:'Bei wie vielen Schülern ist der SCAS beteiligt?',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'scas',op:'ist',wert:'ja'}],gruppe:'direction'}},
  {id:'sprache',b:2,titel:'Erstsprachen',text:'Welche Erstsprachen sprechen die Schüler?',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'sprache'}},
  {id:'eltern',b:2,titel:'Elternsituation',text:'Zusammen, getrennt oder anders',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'eltern'}},
  {id:'iqCycle',b:2,titel:'IQ je Cycle',text:'Mittlerer IQ – nur Dossiers mit IQ-Angabe',a:{kennzahl:{fn:'mittel',feld:'iq'},filter:[],gruppe:'cycle'}},
  {id:'eldibUnter',b:2,titel:'ELDiB: Bereiche unter der erwarteten Stufe',text:'In welchen Bereichen liegen die Schüler unter der Stufe für ihr Alter?',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'eldibUnter',op:'gefuellt'}],gruppe:'eldibUnter'}},
  {id:'eldibVerhalten',b:2,titel:'ELDiB-Stufe Verhalten je Maßnahme',text:'Mittlere Stufe im Bereich Verhalten, je laufender Maßnahme',a:{kennzahl:{fn:'mittel',feld:'eldibVerhalten'},filter:[{feld:'eldibVerhalten',op:'gefuellt'}],gruppe:'massnahmen'}},
  {id:'eldib',b:2,titel:'Überfällige ELDiB-Items je Stelle',text:'Summe der für das Alter längst erwarteten, noch nicht erreichten Items',a:{kennzahl:{fn:'summe',feld:'eldibUeber'},filter:[],gruppe:'stelle'}},
  {id:'massnahmenDr',b:3,titel:'Laufende Maßnahmen je Direction',text:'Kreuztabelle: Direction régionale × Maßnahme',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'direction',gruppe2:'massnahmen'}},
  {id:'geschlechtCycle',b:3,titel:'Jungen und Mädchen je Cycle',text:'Kreuztabelle: Cycle × Geschlecht',a:{kennzahl:{fn:'anzahl'},filter:[],gruppe:'cycle',gruppe2:'geschlecht'}},
  {id:'isaSchuleProfil',b:3,titel:'Dauer der ISA je Schule und Profil',text:'Kreuztabelle: mittlere Dauer der ISA, Schule × Profil',a:{kennzahl:{fn:'mittel',feld:'isaDauer'},filter:[mitM('ISA')],gruppe:'schule',gruppe2:'verdacht'}},
  {id:'isaOderAtelier',b:3,titel:'Mädchen mit ISA oder Atelier, je Cycle',text:'„eines von“: Geschlecht, Maßnahmen und Cycle zusammen',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'geschlecht',op:'ist',wert:'Mädchen'},{feld:'massnahmen',op:'enthaeltEines',werte:['ISA','Atelier']}],gruppe:'cycle'}},
  {id:'oder',b:3,titel:'Mit ISA oder mit SCAS',text:'„oder“: mindestens eine Bedingung trifft zu – je Stelle',a:{kennzahl:{fn:'anzahl'},filter:[{feld:'massnahmen',op:'enthaelt',wert:'ISA'},{feld:'scas',op:'ist',wert:'ja'}],verknuepfung:'oder',gruppe:'stelle'}}
];

/* =====================================================================
   Freitext-Frage (Port von query-parser.js, auf Deutsch): Wortmuster,
   keine KI – nichts verlässt den Browser. Zeigt, wie die Frage
   verstanden wurde und welche Wörter nicht berücksichtigt sind.
   ===================================================================== */
var BEISPIELE=['Durchschnittsalter der Mädchen mit ISA in DR Esch','Wie viele Schüler im CST?','Anzahl nach Stelle','Wie viele Jungen zwischen 10 und 12 Jahren nach Cycle?','Neue Fälle in diesem Schuljahr nach Direction','Mittlere Dauer der ISA nach Stelle',
  'Wie viele Mädchen mit ISA oder Atelier nach Cycle?','Anzahl nach Direction und Maßnahme','Mittlere Dauer der Ateliers nach Atelier'];
var STOPP=('wie viele viel wieviele wieviel der die das den dem des ein eine einer eines einem einen und oder mit ohne im in bei beim von vom zu zum zur an am auf aus fur gibt es sind ist war waren sein haben hat hatten werden wird wurden betreut betreuten betreute begleitet begleiteten schuler schulerin schulerinnen schulers kinder kind kindern jugendliche jugendlichen dossiers dossier falle fall fallen alle aller allen insgesamt zurzeit derzeit aktuell momentan gerade bitte zeige zeig mir uns wir welche welcher welches was wo wer nach je pro jahre jahren jahr alt cdse dieses diesem dieser da dort hier noch schon auch nur etwa ca sich sie er ihr unsere unser unseren denen deren dessen als eigentlich denn gerne mal').split(' ');
var ARTIKEL=['der','die','das','den','dem','des','einer','eines','einem','einen'];
var EINLEITER=['mit','ohne','im','in','bei','beim','fur','und','zwischen','von','ab','unter','uber','aus','an','am','nur','die','der','das','den','dem','des'];
var GSYN={stelle:'stelle',stellen:'stelle',team:'stelle',teams:'stelle',massnahme:'massnahmen',massnahmen:'massnahmen','art der massnahme':'massnahmen',dr:'direction',dir:'direction',direction:'direction',directions:'direction','direction regionale':'direction','directions regionales':'direction',direktion:'direction',regionaldirektion:'direction',region:'direction',regionen:'direction',
  cycle:'cycle',cycles:'cycle',zyklus:'cycle',zyklen:'cycle',geschlecht:'geschlecht',alter:'alter',altersjahr:'alter',sprache:'sprache',sprachen:'sprache',erstsprache:'sprache',muttersprache:'sprache',schule:'schule',schulen:'schule',klasse:'klasse',klassen:'klasse',schulform:'schulform',status:'status',
  nationalitat:'nationalitaet',nationalitaten:'nationalitaet',eltern:'eltern',elternsituation:'eltern',familiensituation:'eltern',diagnose:'diagnosen',diagnosen:'diagnosen',verdacht:'verdacht',schuljahr:'beginn',schuljahren:'beginn',aufnahme:'beginn',aufnahmejahr:'beginn',beginn:'beginn',
  fallverantwortlich:'verantwortlich',fallverantwortlichen:'verantwortlich',fallverantwortlicher:'verantwortlich',verantwortlichen:'verantwortlich',sorgerecht:'sorgerecht',scas:'scas',dienste:'dienste',diensten:'dienste',dienst:'dienste',beschulung:'beschulung','spezialisierter beschulung':'beschulung','spezialisierte beschulung':'beschulung',einrichtung:'beschulung',
  migration:'migration',migrationskontext:'migration',ausland:'scolEtranger',geburtsort:'geburtsort',cni:'cni',
  atelier:'atelierArt',ateliers:'atelierArt','art des ateliers':'atelierArt',reeducation:'reeducationArt',reeducations:'reeducationArt','cst-gruppe':'cstGruppe','cst gruppe':'cstGruppe','gruppe im cst':'cstGruppe',
  profil:'verdacht',profilen:'verdacht',profile:'verdacht',kompetenzzentrum:'autreCc',kompetenzzentren:'autreCc','anderem kompetenzzentrum':'autreCc','anderen kompetenzzentren':'autreCc',cc:'autreCc',
  'eldib-bereich':'eldibUnter','eldib-bereichen':'eldibUnter','c&g-art':'cgArt'};
function gruppeAus(ph){
  if(GSYN[ph]){return GSYN[ph];}
  if(ph.length<4){return '';}
  var f=FELDER.filter(function(x){return gruppierbar(x)&&(norm(x.label)===ph||norm(x.label).indexOf(ph)===0);})[0];
  return f?f.key:'';
}
function stelleWort(w){return /^annexe/.test(w)?'annexe':(w==='isa'?'isa':(/^diagnos/.test(w)?'diagnostique':(w==='cst'?'cst':'cp')));}
function drParser(w){
  var n=norm(w);if(!n){return '';}
  var m=/^(\d{1,2})$/.exec(n);if(m){var i=+m[1];return i>=1&&i<=15?DR[i-1]:'';}
  for(var k=0;k<DR_ORTE.length;k++){if(DR_ORTE[k].indexOf(n)>=0||DR_ORTE[k].some(function(o){return o.length>3&&n.indexOf(o)===0;})){return DR[k];}}
  return '';
}
function frageVerstehen(eingabe){
  var roh=String(eingabe||'').replace(/[?!;:„“”"'()\[\]«»]/g,' ').replace(/,/g,' ').replace(/\.(?=\s|$)/g,' ');
  var orig=roh.split(/\s+/).filter(function(w){return norm(w);}), toks=orig.map(norm);
  var text=' '+toks.join(' ')+' ', weg=[], starts=[], pos=1, i;
  for(i=0;i<text.length;i++){weg.push(false);}
  toks.forEach(function(t){starts.push(pos);pos+=t.length+1;});
  function frei(a,b){for(var k=a;k<b;k++){if(weg[k]){return false;}}return true;}
  function nimm(a,b){for(var k=a;k<b;k++){weg[k]=true;}}
  function finde(re){var g=new RegExp(re.source,'g'),m;while((m=g.exec(text))){if(!m[0]){g.lastIndex++;continue;}if(frei(m.index,m.index+m[0].length)){nimm(m.index,m.index+m[0].length);return m;}}return null;}
  var kz={fn:'anzahl',feld:''}, kzErkannt=false, filter=[], gruppe='', gruppe2='', hinweise=[];
  function fil(feld,op,wert,wert2){var o={feld:feld,op:op};if(wert!=null){o.wert=String(wert);}if(wert2!=null){o.wert2=String(wert2);}filter.push(o);}
  function filMehr(feld,op,werte){filter.push({feld:feld,op:op,werte:eindeutig(werte)});}
  /* „… oder X oder Y“ direkt nach einem Treffer: weitere Werte derselben Variablen einsammeln */
  function weitere(pos,re,lesen){
    var l=[], wm;
    while((wm=re.exec(text.slice(pos)))){var w=lesen(wm[1]);if(!w||!frei(pos,pos+wm[0].length)){break;}nimm(pos,pos+wm[0].length);l.push(w);pos+=wm[0].length;}
    return l;
  }
  function gruppeLesen(start){
    var woerter=text.slice(start).trim().split(' '), vor=0, kette=[], k2, n;
    while(vor<woerter.length&&ARTIKEL.indexOf(woerter[vor])>=0){vor++;}
    for(k2=vor;k2<woerter.length&&kette.length<4;k2++){if(EINLEITER.indexOf(woerter[k2])>=0){break;}kette.push(woerter[k2]);}
    for(n=kette.length;n>=1;n--){var fk=gruppeAus(kette.slice(0,n).join(' '));if(fk){return {key:fk,ende:start+woerter.slice(0,vor).concat(kette.slice(0,n)).join(' ').length,kette:kette};}}
    return {key:'',ende:start,kette:kette};
  }
  /* 1) Kennzahl */
  if(finde(/\bdurchschnittsalter\w*/)){kz={fn:'mittel',feld:'alter'};kzErkannt=true;}
  else if(finde(/\baltest\w*/)){kz={fn:'max',feld:'alter'};kzErkannt=true;}
  else if(finde(/\bjungst\w*/)){kz={fn:'min',feld:'alter'};kzErkannt=true;}
  else{
    var AGG=[['anzahl',/\b(wie ?viele?|wieviele?|anzahl|gesamtzahl|zahl der|zahle\w*|count)\b/],['mittel',/\b(durchschnitt\w*|mittelwert\w*|mittler\w*|im mittel|schnitt|moyenne|average|mean)\b/],
      ['median',/\bmedian\w*/],['max',/\b(maximum|maximal\w*|hochst\w*|max)\b/],['min',/\b(minimum|minimal\w*|niedrigst\w*|geringst\w*|min)\b/],['summe',/\b(summe|gesamtsumme)\b/]];
    var best=null;
    AGG.forEach(function(a){var g=new RegExp(a[1].source,'g'),m;while((m=g.exec(text))){if(frei(m.index,m.index+m[0].length)){if(!best||m.index<best.a){best={fn:a[0],a:m.index,b:m.index+m[0].length};}break;}}});
    if(best){nimm(best.a,best.b);kz={fn:best.fn,feld:''};kzErkannt=true;}
  }
  /* 2) Gruppieren nach … (das letzte „nach / je / pro“); „nach A und B“ oder „nach A und nach B“ → Kreuztabelle */
  var GB=/\b(gruppiert nach|aufgeteilt nach|aufgeschlusselt nach|getrennt nach|unterteilt nach|sortiert nach|verteilt nach|nach|je|pro)\s+/g, gm, gbs=[];
  while((gm=GB.exec(text))){if(frei(gm.index,gm.index+gm[1].length)){gbs.push({a:gm.index,kw:gm[1],start:gm.index+gm[0].length});}}
  var gbT=gbs.length?gbs[gbs.length-1]:null;
  if(gbT){
    var g1=gruppeLesen(gbT.start);
    if(g1.key){
      gruppe=g1.key;nimm(gbT.a,g1.ende);
      var um=/^ (und|sowie) (?:(?:nach|je|pro) )?/.exec(text.slice(g1.ende));
      if(um){var gz=gruppeLesen(g1.ende+um[0].length);if(gz.key&&gz.key!==gruppe){gruppe2=gz.key;nimm(g1.ende,gz.ende);}}
      if(!gruppe2&&gbs.length>1){
        var vg=gbs[gbs.length-2], g0=gruppeLesen(vg.start);
        if(g0.key&&g0.key!==gruppe&&/^ (und|sowie) $/.test(text.slice(g0.ende,gbT.a))){gruppe2=gruppe;gruppe=g0.key;nimm(vg.a,gbT.a);}
      }
    }
    else if(g1.kette.length){hinweise.push('Wonach gruppiert werden soll („'+gbT.kw+' '+g1.kette.join(' ')+'“), wurde nicht erkannt.');}
  }
  /* 3) Zahlenfeld – besondere Wendungen zuerst (vor den Filtern) */
  if(kz.fn!=='anzahl'&&!kz.feld){
    var NUM1=[['isaDauer',/\b(dauer der isa|dauer einer isa|isa-dauer|isadauer|dauer isa)\b/],['beschulungDauer',/\b(dauer der (spezialisierten )?beschulung|beschulungsdauer)\b/],
      ['atelierDauer',/\b(dauer (der |des |eines |im )?ateliers?|atelierdauer)\b/],['reeducationDauer',/\b(dauer (der |einer )?reeducation\w*)\b/],['annexeDauer',/\b(dauer (in der |der )?annexe)\b/],
      ['cstDauer',/\b(dauer (im |des )?cst)\b/],['cdpDauer',/\b(dauer (in der |der )?(cdp|classe de participation))\b/],['cgDauer',/\b(dauer (des |der )?(c ?& ?g|conseil et guidance))\b/],['dsDauer',/\b(dauer (des |der )?(ds|diagnostic\w*))\b/],
      ['eldibVerhalten',/\b(stufe (im bereich )?verhalten)\b/],['eldibKommunikation',/\b(stufe (im bereich )?kommunikation)\b/],['eldibSozialisation',/\b(stufe (im bereich )?sozialisation)\b/],['eldibKognition',/\b(stufe (im bereich )?kognition)\b/],
      ['massnahmenAnzahl',/\b(anzahl (der )?massnahmen)\b/],
      ['dauerBegleitung',/\b(dauer der begleitung|begleitungsdauer|betreuungsdauer|dauer der betreuung)\b/],['iq',/\b(iq|intelligenzquotient\w*)\b/],['eldibZiele',/\b(forderziel\w*)\b/],['eldibUeber',/\b(uberfallig\w*)\b/],['eintraege',/\b(eintrage|eintragungen)\b/],['timeout',/\b(time-?outs?|auszeit\w*)\b/],['vorfaelle',/\b(vorfall|vorfalle|vorfallen|krisen)\b/]];
    for(i=0;i<NUM1.length;i++){if(finde(NUM1[i][1])){kz.feld=NUM1[i][0];break;}}
  }
  /* 4) Filter */
  if(finde(/\b(schulerinnen und schuler|schuler und schulerinnen|madchen und jungen|jungen und madchen)\b/)){/* alle */}
  else{
    var w1=finde(/\b(madchen|schulerinnen|weiblich\w*|meedercher|filles?)\b/), w2=finde(/\b(jungen|junge|buben|knaben|mannlich\w*|jongen|garcons?)\b/);
    if(w1&&!w2){fil('geschlecht','ist','Mädchen');}else if(w2&&!w1){fil('geschlecht','ist','Junge');}
  }
  var IQOP={unter:'kleiner','kleiner als':'kleiner','<':'kleiner',uber:'groesser','grosser als':'groesser','>':'groesser',ab:'mindestens',mindestens:'mindestens','>=':'mindestens',bis:'hoechstens',hochstens:'hoechstens','<=':'hoechstens'};
  var iqz=finde(/\biq\s*(?:zwischen|von)\s*(\d{2,3})\s*(?:und|bis|-)\s*(\d{2,3})\b/);
  if(iqz){fil('iq','zwischen',iqz[1],iqz[2]);}
  else{var iqm=finde(/\biq\s*(?:von\s*)?(unter|uber|ab|bis|kleiner als|grosser als|mindestens|hochstens|<=|>=|<|>)\s*(\d{2,3})\b/);if(iqm){fil('iq',IQOP[iqm[1]],iqm[2]);}}
  var am;
  if((am=finde(/\b(?:zwischen|von)\s+(\d{1,2})\s+(?:und|bis)\s+(\d{1,2})(?:\s*(?:jahren|jahre|jahrigen?|j))?\b/))){fil('alter','zwischen',am[1],am[2]);}
  else if((am=finde(/\b(\d{1,2})\s*(?:-|bis)\s*(\d{1,2})\s*(?:jahren|jahre|jahrige\w*)\b/))){fil('alter','zwischen',am[1],am[2]);}
  else if((am=finde(/\b(?:unter|junger als)\s+(\d{1,2})(?:\s*(?:jahren|jahre))?\b/))){fil('alter','kleiner',am[1]);}
  else if((am=finde(/\b(?:uber|alter als)\s+(\d{1,2})(?:\s*(?:jahren|jahre))?\b/))){fil('alter','groesser',am[1]);}
  else if((am=finde(/\bab\s+(\d{1,2})\s*(?:jahren|jahre)\b/))){fil('alter','mindestens',am[1]);}
  else if((am=finde(/\bbis\s+(\d{1,2})\s*(?:jahren|jahre)\b/))){fil('alter','hoechstens',am[1]);}
  else if((am=finde(/\b(\d{1,2})\s*-?\s*jahrig\w*/)||finde(/\b(\d{1,2})\s+jahre alt\b/)||finde(/\bmit\s+(\d{1,2})\s+jahren\b/))){fil('alter','gleich',am[1]);}
  var sm=finde(/\b(?:im|in der|in|bei der|beim|bei|an der|stelle|team)\s+(annexe(?: junglinster)?|isa|diagnostique|diagnostic|diagnostik|cst|cp|cdp|classes? de participation)\b/);
  if(sm){fil('stelle','ist',stelleName(stelleWort(sm[1])));}
  var MW=[['DS','(ds|diagnostic specialise|diagnostic|diagnostik)'],['C&G','(c ?& ?g|cg|conseil et guidance|guidance)'],['ISA','(isa)'],['Atelier','(atelier\\w*)'],['Rééducation','(reeducation\\w*|reedukation)'],['Annexe','(annexe)'],['CdP','(cdp|classes? de participation)'],['CST','(cst)']];
  /* „mit ISA oder Atelier“ → enthält eines von; „mit ISA und Atelier“ → beide; „ohne ISA oder Atelier“ → keines von */
  var MWNC='(?:'+MW.map(function(m){return m[1].replace(/^\(/,'(?:');}).join('|')+')';
  var ml=finde(new RegExp('\\b(mit|ohne)\\s+(?:(?:einer|einem|der|dem|laufender|laufendem|laufenden|laufende)\\s+)?('+MWNC+'(?:\\s+(?:oder|und|bzw|sowie)\\s+(?:(?:einer|einem|der|dem)\\s+)?'+MWNC+')+)\\b'));
  if(ml){
    var mk=eindeutig((ml[2].match(new RegExp('\\b'+MWNC+'\\b','g'))||[]).map(function(w){for(var j=0;j<MW.length;j++){if(new RegExp('^'+MW[j][1]+'$').test(w)){return MW[j][0];}}return '';}));
    var mkCg=[];mk.forEach(function(k){if(k==='C&G'){mkCg.push('C&G Fachkräfte','C&G Eltern');}else{mkCg.push(k);}});
    if(ml[1]==='ohne'){filMehr('massnahmen','enthaeltKeines',mkCg);}
    else if(/\b(oder|bzw)\b/.test(ml[2])){filMehr('massnahmen','enthaeltEines',mkCg);}
    else{mk.forEach(function(k){if(k==='C&G'){fil('massnahmen','enthaeltText','C&G');}else{fil('massnahmen','enthaelt',k);}});}
  }
  MW.forEach(function(mw){
    var m=finde(new RegExp('\\b(mit|ohne)\\s+(?:(?:einer|einem|der|dem|laufender|laufendem|laufenden|laufende)\\s+)?'+mw[1]+'\\b'));
    if(!m){return;}
    if(mw[0]==='C&G'){if(m[1]==='ohne'){fil('massnahmen','enthaeltNicht','C&G Fachkräfte');fil('massnahmen','enthaeltNicht','C&G Eltern');}else{fil('massnahmen','enthaeltText','C&G');}}
    else{fil('massnahmen',m[1]==='ohne'?'enthaeltNicht':'enthaelt',mw[0]);}
  });
  [['DS',/\b(ds)\b/],['C&G',/\b(c ?& ?g)\b/],['ISA',/\b(isa)\b/],['Atelier',/\b(atelier)\b/],['Rééducation',/\b(reeducation)\b/],['CdP',/\b(cdp)\b/]].forEach(function(mw){
    if(finde(mw[1])){if(mw[0]==='C&G'){fil('massnahmen','enthaeltText','C&G');}else{fil('massnahmen','enthaelt',mw[0]);}}
  });
  var sb=finde(/\b(annexe|cst|diagnostique)\b/);if(sb){fil('stelle','ist',stelleName(stelleWort(sb[1])));}
  /* Direction: „in DR Esch“, „aus Mamer“ – auch „DR 05 oder 06“, „in Esch oder Sanem“ (→ ist eines von) */
  var DR_WEITER=/^\s+(?:oder|bzw|und)\s+(?:(?:in der |in |aus |der )?(?:dr|dir|direction|region)\s+|in\s+|aus\s+)?(\d{1,2}|[a-z][a-z\/\-]*)\b/;
  function drFilter(erst,pos){var l=[erst].concat(weitere(pos,DR_WEITER,drParser));l=eindeutig(l);if(l.length>1){filMehr('direction','einesVon',l);}else{fil('direction','ist',erst);}}
  var dm=finde(/\b(?:dr|dir|direction(?: regionale)?|direktion|regionaldirektion|region)\s+(\d{1,2}|[a-z][a-z\/\-]*)\b/);
  if(dm){var dv=drParser(dm[1]);if(dv){drFilter(dv,dm.index+dm[0].length);}else{hinweise.push('Die Direction „'+dm[1]+'“ wurde nicht erkannt.');}}
  else{var dm2=finde(/\b(?:in|aus|bei)\s+(luxemburg|luxembourg|mamer|petange|petingen|differdange|differdingen|sanem|esch(?:[\/\-](?:sur-)?alzette)?|dudelange|dudelingen|bettembourg|bettemburg|remich|grevenmacher|echternach|mersch|redange|redingen|diekirch|wiltz)\b/);if(dm2){var dv2=drParser(dm2[1]);if(dv2){drFilter(dv2,dm2.index+dm2[0].length);}}}
  /* Cycle: „Cycle 3“, „C4“ – auch „Cycle 3 oder 4“ */
  var cy=finde(/\b(?:im |in )?(?:cycle|zyklus)\s*([1-4])\b/)||finde(/\bc([1-4])(?:\.[1-3])?\b/);
  if(cy){
    var cyl=['C'+cy[1]].concat(weitere(cy.index+cy[0].length,/^\s+(?:oder|bzw|und)\s+(?:(?:im |in )?(?:cycle|zyklus)\s*|c)?([1-4])(?:\.[1-3])?\b/,function(z){return 'C'+z;}));
    cyl=eindeutig(cyl);if(cyl.length>1){filMehr('cycle','einesVon',cyl);}else{fil('cycle','ist',cyl[0]);}
  }
  else if(finde(/\b(sekundar\w*|secondaire|enseignement secondaire|lycee|lyzeum|gymnasium)\b/)){fil('cycle','ist','ES');}
  if(finde(/\b(inaktive?[nrs]?|ehemalige?[nrs]?|abgeschlossene?[nrs]?)\b/)){fil('status','ist','inaktiv');}
  else if(finde(/\b(aktive[nrs]?)\b/)){fil('status','ist','aktiv');}
  if(finde(/\bohne\s+(?:den\s+)?scas\b/)){fil('scas','istNicht','ja');}
  else if(finde(/\b(?:mit\s+(?:dem\s+)?)?scas\b/)){fil('scas','ist','ja');}
  if(finde(/\b(privatschule\w*|private?[nrs]?\s+schule\w*|privat\w*)\b/)){fil('schulform','ist','privat');}
  else if(finde(/\b(offentliche?[nrs]?\s+schule\w*|offentlich\w*)\b/)){fil('schulform','ist','öffentlich');}
  if(finde(/\b(schulbesuch im ausland|im ausland)\b/)){fil('scolEtranger','ist','ja');}
  if(finde(/\bohne\s+migration\w*/)){fil('migration','ist','nein');}
  else if(finde(/\b(?:mit\s+)?migration\w*/)){fil('migration','ist','ja');}
  var DIAG=[['ADHS|ADHD|TDAH|F90','(adhs|adhd|ads|tdah|hyperaktiv\\w*)'],['Autis|ASS|Asperger|F84|TSA','(autismus|autist\\w*|ass|asperger\\w*|tsa)'],['Legasthen|Dyslex|F81.0','(legasthenie|dyslexie|dyslexia|lrs)'],
    ['Dyskalkulie|Dyscalc|F81.2','(dyskalkulie|dyscalculie|dyscalculia)'],['Angst|Anxi|F41|F93','(angst\\w*|anxiete|anxiety)'],['Depress|F32|F33','(depression\\w*|depressiv\\w*)'],['Trauma|PTBS|PTSD|F43.1','(trauma\\w*|ptbs|ptsd)']];
  DIAG.forEach(function(dg){
    if(finde(new RegExp('\\bverdacht auf\\s+'+dg[1]+'\\b'))){fil('verdacht','enthaeltText',dg[0]);return;}
    if(finde(new RegExp('\\b(?:mit\\s+(?:einer\\s+|einem\\s+)?)?'+dg[1]+'\\b'))){fil('diagnosen','enthaeltText',dg[0]);}
  });
  var sp=finde(/\b(?:erstsprache|muttersprache|familiensprache|sprache)\s+([a-z\-]+)\b/);
  if(sp){var sc=spracheGruppe(sp[1]);if(sc&&sc!=='andere'){fil('sprache','ist',sc);}else{hinweise.push('Die Sprache „'+sp[1]+'“ wurde nicht erkannt.');}}
  else{var sp2=finde(/\b([a-z]+?)sprachig\w*/);if(sp2){var sc2=spracheGruppe(sp2[1]);if(sc2&&sc2!=='andere'){fil('sprache','ist',sc2);}}}
  var sjm=finde(/\b(?:in diesem|im laufenden|dieses|diesem|im aktuellen|im)\s+schuljahr(?:\s+(\d{2,4})\s*[\/\-]\s*(\d{2,4}))?\b/);
  var neu=finde(/\b(neu|neue[nrs]?|neuaufnahme\w*|aufgenommen\w*|begonnen\w*)\b/);
  if(neu){fil('beginn','imSchuljahr',sjm&&sjm[1]?sjAusZahl(sjm[1]):sjAktuell());}
  else if(sjm){hinweise.push('„Im Schuljahr …“: Dafür oben den Filter „Schuljahr“ wählen – die Frage rechnet mit der aktuellen Auswahl.');}
  /* 5) Zahlenfeld – allgemeine Wörter, falls noch keins erkannt */
  if(kz.fn!=='anzahl'&&!kz.feld){
    var NUM2=[['dauerBegleitung',/\b(dauer)\b/],['alter',/\b(alter|alters|jahre alt)\b/],['eldibZiele',/\b(ziele)\b/],['eldibUeber',/\b(items?)\b/],['eintraege',/\b(eintrag)\b/]];
    for(i=0;i<NUM2.length;i++){if(finde(NUM2[i][1])){kz.feld=NUM2[i][0];break;}}
    if(!kz.feld){kz.feld='alter';hinweise.push('Welches Zahlenfeld gemeint ist, wurde nicht erkannt – gerechnet wird mit dem Alter.');}
  }
  var unklar=[];
  toks.forEach(function(t,k){var a=starts[k], genommen=false;for(var j=a;j<a+t.length;j++){if(weg[j]){genommen=true;break;}}if(!genommen&&STOPP.indexOf(t)<0){unklar.push(orig[k]);}});
  var abfrage={kennzahl:kz,filter:filter,verknuepfung:'und',gruppe:gruppe,gruppe2:gruppe2};
  return {abfrage:abfrage,satz:satz(abfrage),unklar:unklar,hinweise:hinweise,verstanden:kzErkannt||filter.length>0||!!gruppe};
}

/* =====================================================================
   Oberfläche: Zustand, Laden, Rahmen
   ===================================================================== */
var zust={el:null,seite:'',daten:[],kaputt:0};
var gf={status:'alle',stelle:'',sj:''};
/* tab.filter: alle müssen zutreffen; tab.oder: mindestens einer (aus einer Abfrage mit „oder“) */
var tab={q:'',sortFeld:'nachname',sortAuf:true,schnell:{geschlecht:'',cycle:'',direction:'',massnahme:''},filter:[],oder:[],mehr:0};
var abf={a:neueAbfrage(),frage:'',verstanden:null};
var imp=null, protFilter='alle', dg={}, resizeAn=false, resizeTimer=null, fokusKey=null;
var STANDARD_SPALTEN=['alter','geschlecht','klasse','schule','direction','stelle','massnahmen'];

function $q(sel){return zust.el?zust.el.querySelector(sel):null;}
function inhalt(h){var b=$q('#db-inhalt');if(b){b.innerHTML=h;}}
function fokusMerken(){var a=document.activeElement;fokusKey=(a&&zust.el&&zust.el.contains(a)&&a.getAttribute)?a.getAttribute('data-fokus'):null;}
function fokusZurueck(){if(!fokusKey||!zust.el){return;}var e=zust.el.querySelector('[data-fokus="'+fokusKey.replace(/"/g,'')+'"]');fokusKey=null;if(e){try{e.focus({preventScroll:true});}catch(x){e.focus();}}}
function neuZeichnen(){fokusMerken();zeichnen();fokusZurueck();}

var offenId=null;   /* Seitenblatt, das nach dem Laden aufgehen soll (Sprung aus dem Reiter „Fiche“) */
function seite(el,param,neu){
  if(!el){return;}
  var oeffnen=offenId;offenId=null;
  if(!bausteine()){el.innerHTML='<p>Die Datenbank braucht den Arbeitsbereich des Hubs.</p>';return;}
  blaetterSchliessen();
  zust.el=el;
  zust.seite=['','tabelle','abfragen','import','protokoll'].indexOf(param||'')>=0?(param||''):'';
  if(!T.istResponsable()){el.innerHTML=H.karte('<h2>Kein Zugang</h2><p>Die Datenbank ist nur für Responsables und die Verwaltung.</p>','ar-leer');return;}
  if(!el.__db){el.__db=true;ereignisse(el);}
  if(!resizeAn){resizeAn=true;window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(diagrammeZeichnen,150);});}
  el.innerHTML=rahmen()+'<div id="db-inhalt">'+H.laedt('Lade die Dossiers …')+'</div>';
  laden(!!neu).then(function(){if(zust.el===el){zeichnen();if(oeffnen&&eintragVon(oeffnen)){blattOeffnen(oeffnen);}}},function(e){
    if(zust.el===el){inhalt(H.karte('<h2>Die Dossiers ließen sich nicht laden</h2>'+H.hinweis(esc(fehlerText(e)))+'<button class="btn" type="button" data-db="neu-laden">'+svg('reload')+'Nochmal versuchen</button>','ar-leer'));}
  });
}
function laden(neu){
  return T.alleDossiers(neu).then(function(l){
    zust.daten=(l||[]).map(function(d){return {d:d,r:datensatz(d)};});
    zust.kaputt=(l&&l.kaputt)|0;
    return zust.daten;
  });
}
function ersetzeDossier(d){
  if(!d||!d.id){return;}
  var neu={d:d,r:datensatz(d)}, da=false;
  zust.daten=zust.daten.map(function(x){if(x.d.id===d.id){da=true;return neu;}return x;});
  if(!da){zust.daten.push(neu);}
}
function rahmen(){
  var s=zust.seite, tabs=[['','Übersicht','daten'],['tabelle','Tabelle','datei'],['abfragen','Abfragen','search'],['import','Import','hoch'],['protokoll','Protokoll','history']];
  return H.kopf('Arbeit','Datenbank','Zahlen, Tabelle und Abfragen – direkt aus den Schülerdossiers.<br>Vertraulich: nur für Responsables und die Verwaltung.',
      '<button class="btn" type="button" data-db="neu-laden" data-fokus="neu-laden">'+svg('reload')+'Neu laden</button>')+
    '<nav class="db-tabs" aria-label="Bereiche der Datenbank">'+tabs.map(function(t){return '<a href="#/datenbank'+(t[0]?'/'+t[0]:'')+'"'+(s===t[0]?' aria-current="page"':'')+'>'+svg(t[2])+esc(t[1])+'</a>';}).join('')+'</nav>';
}
function zeichnen(){
  var s=zust.seite;
  if(!T.istResponsable()){inhalt(H.karte('<h2>Kein Zugang</h2><p>Die Datenbank ist nur für Responsables und die Verwaltung.</p>','ar-leer'));return;}
  if(s==='import'){importSeite();return;}
  if(s==='protokoll'){protokollSeite();return;}
  if(!zust.daten.length){inhalt(leerKarte());return;}
  if(s==='tabelle'){tabelleSeite();}else if(s==='abfragen'){abfragenSeite();}else{uebersicht();}
}
function leerKarte(){
  return H.karte('<h2>Noch keine Dossiers</h2><p>Die Datenbank rechnet mit den Schülerdossiers des Hubs. Sobald unter <b>Schüler</b> Dossiers angelegt sind – am besten mit der Fiche de renseignement –, erscheinen hier Kennzahlen, Diagramme und Abfragen.</p>'+
    '<p>Gibt es die Fälle schon in einer Excel-Tabelle oder in CDSE Stats, lassen sie sich übernehmen.</p><div class="ar-knopfreihe"><a class="btn primary" href="#/schueler">'+svg('schueler')+'Zu den Schülern</a><a class="btn" href="#/datenbank/import">'+svg('hoch')+'Aus CDSE Stats übernehmen</a></div>','ar-leer db-leer');
}

/* ---------- Filter oben (gelten für Übersicht, Tabelle und Abfragen) ---------- */
function imSchuljahr(x,sj){
  var g=sjGrenzen(sj), b=x.r.beginn||x.r.erstellt;
  if(!b||b>g.bis){return false;}
  if(x.r.status!=='inaktiv'){return true;}
  var seit=iso(x.d.statusSeit);return !seit||seit>=g.von;
}
function schuljahre(){
  var akt=sjJahr(heute()), min=akt;
  zust.daten.forEach(function(x){var y=sjJahr(x.r.beginn);if(y!=null&&y<min){min=y;}});
  if(akt-min>15){min=akt-15;}
  var l=[];for(var y=akt;y>=min;y--){l.push(sjName(y));}
  return l;
}
function gefiltert(){
  return zust.daten.filter(function(x){
    if(gf.status!=='alle'&&x.r.status!==gf.status){return false;}
    if(gf.stelle&&x.d.stelle!==gf.stelle){return false;}
    if(gf.sj&&!imSchuljahr(x,gf.sj)){return false;}
    return true;
  });
}
function filterAktiv(){return gf.status!=='alle'||!!gf.stelle||!!gf.sj;}
function filterBeschreibung(){
  return [gf.status==='alle'?'aktive und inaktive':(gf.status==='aktiv'?'nur aktive':'nur inaktive'),gf.stelle?'Stelle '+stelleName(gf.stelle):'alle Stellen',gf.sj?'im Schuljahr '+gf.sj+' begleitet':'alle Schuljahre'].join(' · ');
}
function chip(art,wert,text,n,an){return '<button class="catchip'+(an?' on':'')+'" type="button" aria-pressed="'+an+'" data-db-f="'+art+'" data-wert="'+esc(wert)+'" data-fokus="f-'+art+'-'+esc(wert)+'">'+esc(text)+(n!=null?'<span class="n">'+n+'</span>':'')+'</button>';}
function filterLeiste(){
  var zS={alle:0,aktiv:0,inaktiv:0}, zSt={};
  zust.daten.forEach(function(x){
    var inSj=!gf.sj||imSchuljahr(x,gf.sj);
    if(inSj&&(!gf.stelle||x.d.stelle===gf.stelle)){zS.alle++;zS[x.r.status]++;}
    if(inSj&&(gf.status==='alle'||x.r.status===gf.status)){zSt[x.d.stelle]=(zSt[x.d.stelle]||0)+1;}
  });
  var akt=sjAktuell();
  return '<div class="db-filter" role="group" aria-label="Filter für alle Zahlen">'+
    '<div class="catbar" role="group" aria-label="Status">'+[['alle','Alle'],['aktiv','Aktiv'],['inaktiv','Inaktiv']].map(function(s){return chip('status',s[0],s[1],zS[s[0]],gf.status===s[0]);}).join('')+'</div>'+
    '<label class="db-sj"><span>Schuljahr</span><select data-db-sj data-fokus="sj" title="Dossiers, die im Schuljahr begleitet wurden (Schuljahr ab 15. August)"><option value="">Alle Schuljahre</option>'+
      schuljahre().map(function(s){return '<option value="'+s+'"'+(gf.sj===s?' selected':'')+'>'+s+(s===akt?' (laufend)':'')+'</option>';}).join('')+'</select></label>'+
    '<div class="catbar" role="group" aria-label="Stelle">'+chip('stelle','','Alle Stellen',null,!gf.stelle)+teams().map(function(t){return chip('stelle',t.id,t.name,zSt[t.id]||0,gf.stelle===t.id);}).join('')+'</div>'+
    (filterAktiv()?'<button class="ar-link" type="button" data-db="filter-weg" data-fokus="filter-weg">'+svg('x')+'Filter zurücksetzen</button>':'')+
  '</div>';
}

/* =====================================================================
   Übersicht: Kennzahlen und Diagramme
   ===================================================================== */
function zaehlen(rows,key){
  var o={};
  rows.forEach(function(r){var v=r[key];if(Array.isArray(v)){if(!v.length){o[OHNE]=(o[OHNE]||0)+1;}v.forEach(function(k){o[k]=(o[k]||0)+1;});}else{var k=istZahl(v)?String(v):(txt(v)||OHNE);o[k]=(o[k]||0)+1;}});
  return o;
}
function wieOft(rows,key,wert){return rows.filter(function(r){return r[key]===wert;}).length;}
function topText(o,n){return Object.keys(o).sort(function(a,b){return o[b]-o[a]||a.localeCompare(b,'de');}).slice(0,n).map(function(k){return k+' '+o[k];}).join(' · ');}
function kpi(key,wert,label,klein){return '<div class="db-kpi" data-kpi="'+key+'"><b>'+esc(wert)+'</b><span>'+esc(label)+'</span>'+(klein?'<small>'+esc(klein)+'</small>':'')+'</div>';}
function drillFuer(key,wert){
  var f=feldVon(key);if(!f){return null;}
  if(wert===OHNE){return {feld:key,op:'leer'};}
  if(f.typ==='liste'){return {feld:key,op:'enthaelt',wert:wert};}
  if(f.typ==='datum'){return {feld:key,op:'imSchuljahr',wert:wert};}
  if(f.typ==='zahl'){return {feld:key,op:'gleich',wert:wert};}
  return {feld:key,op:'ist',wert:wert};
}
function ein(feld,wert,n,opt){opt=opt||{};return {label:opt.label||(wert===OHNE?'ohne Angabe':wert),titel:opt.titel||'',wert:n,text:opt.text,farbe:opt.farbe||'',leer:wert===OHNE||!!opt.leer,drill:n?drillFuer(feld,wert):null};}
function dgKarte(key,titel,unter){return '<section class="ar-karte db-dgkarte" aria-labelledby="db-dg-'+key+'"><div class="ar-kartenkopf"><h2 id="db-dg-'+key+'">'+esc(titel)+'</h2>'+(unter?'<span class="ar-leise">'+esc(unter)+'</span>':'')+'</div><div class="db-dg" data-dg="'+key+'"></div></section>';}
function hatFiche(d){var f=d.fiche;return !!f&&typeof f==='object'&&Object.keys(f).some(function(k){return k!=='quelle'&&!leerTief(f[k]);});}
function uebersicht(){
  var l=gefiltert(), rows=l.map(function(x){return x.r;}), h=filterLeiste();
  if(zust.kaputt){h+=H.hinweis(zust.kaputt+' Dossier-Datei(en) ließen sich nicht öffnen und fehlen in den Zahlen. Bitte die Verwaltung informieren.');}
  if(!l.length){inhalt(h+H.karte('<h2>Keine Dossiers für diese Auswahl</h2><p>Für diese Kombination aus Status, Stelle und Schuljahr gibt es keine Dossiers.</p><button class="btn" type="button" data-db="filter-weg">'+svg('reload')+'Filter zurücksetzen</button>','ar-leer'));return;}
  var ohneFiche=l.filter(function(x){return !hatFiche(x.d);}).length;
  if(ohneFiche){h+=H.hinweis('Bei <b>'+ohneFiche+' von '+l.length+'</b> Dossiers ist noch keine Fiche de renseignement eingetragen – Direction régionale, Erstsprache und Maßnahmen stehen dort unter „ohne Angabe“. Die Fiche wird im Dossier hochgeladen oder ausgefüllt (Reiter „Fiche“).','info');}
  var sj=gf.sj||sjAktuell(), g=sjGrenzen(sj);
  var neuN=rows.filter(function(r){return r.beginn&&r.beginn>=g.von&&r.beginn<=g.bis;}).length;
  var alter=rows.map(function(r){return r.alter;}).filter(istZahl);
  var jungen=wieOft(rows,'geschlecht','Junge'), maedchen=wieOft(rows,'geschlecht','Mädchen'), ohneG=rows.length-jungen-maedchen;
  var lauf=zaehlen(rows,'massnahmen');delete lauf[OHNE];
  var lsum=Object.keys(lauf).reduce(function(s,k){return s+lauf[k];},0), aktiv=wieOft(rows,'status','aktiv');
  h+='<div class="db-kpis">'+
    kpi('dossiers',String(l.length),l.length===1?'Dossier':'Dossiers',aktiv+' aktiv · '+(l.length-aktiv)+' inaktiv')+
    kpi('neu',String(neuN),'neu im Schuljahr '+sj,'Beginn der Begleitung ab '+datumDe(g.von))+
    kpi('alter',alter.length?zahlDe(mittel(alter),1):'–','Durchschnittsalter',alter.length?(alter.length===rows.length?'Jahre':'Jahre · '+alter.length+' von '+rows.length+' mit Geburtsdatum'):'kein Geburtsdatum eingetragen')+
    kpi('geschlecht',jungen+' / '+maedchen,'Jungen / Mädchen',ohneG?ohneG+' ohne Angabe':'')+
    kpi('massnahmen',String(lsum),'laufende Maßnahmen',topText(lauf,3)||'keine laufende Maßnahme eingetragen')+
  '</div>';
  dg={};
  var zSt=zaehlen(rows,'stelle');
  dg.stelle={art:'balken',titel:'Nach Stelle',eintraege:teams().map(function(t){return ein('stelle',t.name,zSt[t.name]||0,{farbe:t.farbe});})
    .concat(Object.keys(zSt).filter(function(k){return !teams().some(function(t){return t.name===k;});}).map(function(k){return ein('stelle',k,zSt[k]);}))};
  var zM=zaehlen(rows,'massnahmen'), mk=ARTEN.filter(function(a){return zM[a];}).concat(Object.keys(zM).filter(function(k){return ARTEN.indexOf(k)<0&&k!==OHNE;}).sort());
  dg.massnahmen={art:'balken',titel:'Laufende Maßnahmen nach Art',eintraege:mk.map(function(k){return ein('massnahmen',k,zM[k]);}).concat(zM[OHNE]?[ein('massnahmen',OHNE,zM[OHNE],{label:'keine laufende'})]:[])};
  var zD=zaehlen(rows,'direction'), dk=DR.filter(function(x){return zD[x];}).concat(Object.keys(zD).filter(function(k){return DR.indexOf(k)<0&&k!==OHNE;}).sort());
  dg.direction={art:'balken',titel:'Nach Direction régionale',eintraege:dk.map(function(k){return ein('direction',k,zD[k]);}).concat(zD[OHNE]?[ein('direction',OHNE,zD[OHNE])]:[])};
  var zC=zaehlen(rows,'cycle');
  dg.cycle={art:'saeulen',titel:'Nach Cycle',eintraege:['C1','C2','C3','C4','ES'].map(function(k){return ein('cycle',k,zC[k]||0);}).concat(zC.andere?[ein('cycle','andere',zC.andere)]:[]).concat(zC[OHNE]?[ein('cycle',OHNE,zC[OHNE],{label:'o. A.',titel:'ohne Angabe'})]:[])};
  var altersN={}, amin=null, amax=null;
  alter.forEach(function(a){altersN[a]=(altersN[a]||0)+1;if(amin==null||a<amin){amin=a;}if(amax==null||a>amax){amax=a;}});
  var ae=[];if(amin!=null){for(var a=amin;a<=amax;a++){ae.push(ein('alter',String(a),altersN[a]||0,{titel:a+' Jahre'}));}}
  dg.alter={art:'saeulen',titel:'Nach Alter',eintraege:ae};
  dg.geschlecht={art:'balken',titel:'Nach Geschlecht',eintraege:[ein('geschlecht','Junge',jungen,{label:'Jungen'}),ein('geschlecht','Mädchen',maedchen)].concat(ohneG?[ein('geschlecht',OHNE,ohneG)]:[])};
  var zS=zaehlen(rows,'sprache'), sk=Object.keys(zS).filter(function(k){return k!==OHNE;}).sort(function(x,y){return zS[y]-zS[x]||spracheName(x).localeCompare(spracheName(y),'de');});
  dg.sprache={art:'balken',titel:'Nach Erstsprache',eintraege:sk.map(function(k){return ein('sprache',k,zS[k],{label:k==='andere'?'andere Sprache':spracheName(k),titel:k});}).concat(zS[OHNE]?[ein('sprache',OHNE,zS[OHNE])]:[])};
  var zSch=zaehlen(rows,'schule'), schk=Object.keys(zSch).filter(function(k){return k!==OHNE;}).sort(function(x,y){return zSch[y]-zSch[x]||x.localeCompare(y,'de');});
  dg.schule={art:'balken',titel:'Schulen',eintraege:schk.slice(0,10).map(function(k){return ein('schule',k,zSch[k]);})};
  /* Dauer je Maßnahme (Monate): Mittelwert über die Dossiers mit dieser Maßnahme (laufend bis heute) */
  var dauerE=DAUER.map(function(z){var w=rows.map(function(r){return r[z[0]];}).filter(istZahl);
    return w.length?{label:z[1],titel:'Mittlere Dauer',wert:mittel(w),text:zahlDe(mittel(w),1)+' Mon. · '+w.length,drill:{feld:z[0],op:'gefuellt'}}:null;}).filter(Boolean);
  dg.dauer={art:'balken',titel:'Durchschnittliche Dauer je Maßnahme',eintraege:dauerE};
  /* ELDiB: mittlere Stufe je Bereich – nur, wenn Stufen eingetragen sind */
  var elE=ELDIB_B.map(function(b,i){var k='eldib'+b[1].charAt(0).toUpperCase()+b[1].slice(1), w=rows.map(function(r){return r[k];}).filter(istZahl);
    return w.length?{label:b[1],titel:'Mittlere Stufe',wert:mittel(w),text:zahlDe(mittel(w),1)+' · '+w.length,farbe:['#B4533A','#2E3A9C','#1F6B6F','#8A6414'][i],drill:{feld:k,op:'gefuellt'}}:null;}).filter(Boolean);
  var elErw=rows.map(function(r){return r.eldibErwartet;}).filter(istZahl);
  if(elE.length&&elErw.length){elE.push({label:'erwartet',titel:'Mittlere erwartete Stufe (Alter)',wert:mittel(elErw),text:zahlDe(mittel(elErw),1),leer:true,drill:{feld:'eldibErwartet',op:'gefuellt'}});}
  dg.eldib={art:'balken',titel:'ELDiB: mittlere Stufe je Bereich',eintraege:elE};
  h+='<div class="db-raster">'+
    dgKarte('stelle','Nach Stelle',l.length+(l.length===1?' Dossier':' Dossiers'))+
    dgKarte('massnahmen','Laufende Maßnahmen nach Art','Mehrfachnennung möglich')+
    dgKarte('direction','Nach Direction régionale','Enseignement fondamental')+
    dgKarte('cycle','Nach Cycle','aus der Klasse abgeleitet')+
    dgKarte('alter','Nach Alter',alter.length<rows.length?(rows.length-alter.length)+' ohne Geburtsdatum':'in Jahren')+
    dgKarte('geschlecht','Nach Geschlecht','')+
    dgKarte('sprache','Nach Erstsprache','')+
    dgKarte('schule','Schulen (die zehn häufigsten)',schk.length>10?(schk.length-10)+' weitere Schulen':(zSch[OHNE]?zSch[OHNE]+' ohne Angabe':''))+
    (dauerE.length?dgKarte('dauer','Durchschnittliche Dauer je Maßnahme','in Monaten · Zahl der Dossiers'):'')+
    (elE.length?dgKarte('eldib','ELDiB: mittlere Stufe je Bereich','Stufe 1–5 · Zahl der Dossiers'):'')+
  '</div><p class="ar-klein db-fuss">Ein Klick auf einen Balken zeigt diese Dossiers in der Tabelle. Gezählt wird nur, was in den Dossiers steht – „ohne Angabe“ heißt: nicht eingetragen.</p>';
  inhalt(h);diagrammeZeichnen();
}

/* ---------- Diagramme: eigenes SVG in der Breite des Kastens (bleibt scharf und lesbar) ---------- */
function diagrammeZeichnen(){
  if(!zust.el){return;}
  Array.prototype.forEach.call(zust.el.querySelectorAll('.db-dg[data-dg]'),function(box){
    var d=dg[box.getAttribute('data-dg')];if(!d){return;}
    var w=Math.max(240,Math.floor(box.clientWidth||box.getBoundingClientRect().width||480));
    if(box.__w===w&&box.firstChild){return;}
    box.__w=w;box.innerHTML=d.art==='saeulen'?saeulen(d,w):balken(d,w);
  });
}
function kuerzen(t,n){t=String(t);return t.length>n?t.slice(0,Math.max(1,n-1))+'…':t;}
function balkenEintrag(x,inner){
  var titel=(x.titel?x.titel+' · ':'')+x.label+': '+(x.text!=null?x.text:zahlDe(x.wert));
  var attr=' data-label="'+esc(x.label)+'" data-wert="'+esc(x.wert)+'"';
  return x.drill?'<a href="#/datenbank/tabelle" class="db-dgz" data-db-drill="'+esc(JSON.stringify(x.drill))+'" aria-label="'+esc(titel+' – in der Tabelle zeigen')+'"'+attr+'><title>'+esc(titel)+'</title>'+inner+'</a>':'<g class="db-dgz"'+attr+'><title>'+esc(titel)+'</title>'+inner+'</g>';
}
function balken(d,W){
  var e=d.eintraege;if(!e.length){return '<p class="ar-leise">Keine Angaben.</p>';}
  var zh=30, Hh=e.length*zh+4, lang=0, max=0;
  e.forEach(function(x){if(x.wert>max){max=x.wert;}if(String(x.label).length>lang){lang=String(x.label).length;}});if(!max){max=1;}
  var lw=Math.round(Math.max(60,Math.min(lang*6.6+10,W*0.45,230))), vw=46, bx=lw+10, bw=Math.max(40,W-bx-vw);
  var zeichen=Math.max(6,Math.floor((lw-6)/6.6));
  var s='<svg class="db-svg" width="'+W+'" height="'+Hh+'" viewBox="0 0 '+W+' '+Hh+'" role="group" aria-label="'+esc(d.titel)+'">';
  e.forEach(function(x,i){
    var y=2+i*zh, bl=x.wert?Math.max(3,Math.round(bw*x.wert/max)):0, ty=y+zh/2+4.5;
    s+=balkenEintrag(x,'<rect class="db-hit" x="0" y="'+y+'" width="'+W+'" height="'+zh+'" rx="7"/>'+
      '<text class="db-lab" x="'+lw+'" y="'+ty+'" text-anchor="end">'+esc(kuerzen(x.label,zeichen))+'</text>'+
      '<rect class="db-bahn" x="'+bx+'" y="'+(y+8)+'" width="'+bw+'" height="'+(zh-16)+'" rx="4"/>'+
      (bl?'<rect class="db-bar'+(x.leer?' leer':'')+'" x="'+bx+'" y="'+(y+8)+'" width="'+bl+'" height="'+(zh-16)+'" rx="4"'+(x.farbe&&!x.leer?' style="fill:'+esc(x.farbe)+'"':'')+'/>':'')+
      '<text class="db-wert" x="'+(bx+bl+6)+'" y="'+ty+'">'+esc(x.text!=null?x.text:zahlDe(x.wert))+'</text>');
  });
  return s+'</svg>';
}
function saeulen(d,W){
  var e=d.eintraege;if(!e.length){return '<p class="ar-leise">Keine Angaben.</p>';}
  var Hh=184, unten=26, oben=22, n=e.length, sw=(W-8)/n, bw=Math.max(6,Math.min(40,sw*0.58)), max=0, zeichen=Math.max(2,Math.floor(sw/7));
  e.forEach(function(x){if(x.wert>max){max=x.wert;}});if(!max){max=1;}
  var s='<svg class="db-svg" width="'+W+'" height="'+Hh+'" viewBox="0 0 '+W+' '+Hh+'" role="group" aria-label="'+esc(d.titel)+'">'+
    '<line class="db-achse" x1="4" x2="'+(W-4)+'" y1="'+(Hh-unten+0.5)+'" y2="'+(Hh-unten+0.5)+'"/>';
  e.forEach(function(x,i){
    var cx=4+sw*i+sw/2, hh=x.wert?Math.max(2,Math.round((Hh-unten-oben)*x.wert/max)):0, y=Hh-unten-hh;
    s+=balkenEintrag(x,'<rect class="db-hit" x="'+(cx-sw/2+1).toFixed(1)+'" y="2" width="'+Math.max(2,sw-2).toFixed(1)+'" height="'+(Hh-4)+'" rx="6"/>'+
      (hh?'<rect class="db-bar'+(x.leer?' leer':'')+'" x="'+(cx-bw/2).toFixed(1)+'" y="'+y+'" width="'+bw.toFixed(1)+'" height="'+hh+'" rx="3"/>':'')+
      (x.wert?'<text class="db-wert" x="'+cx.toFixed(1)+'" y="'+(y-6)+'" text-anchor="middle">'+esc(x.text!=null?x.text:zahlDe(x.wert))+'</text>':'')+
      '<text class="db-lab" x="'+cx.toFixed(1)+'" y="'+(Hh-8)+'" text-anchor="middle">'+esc(kuerzen(x.label,zeichen))+'</text>');
  });
  return s+'</svg>';
}

/* =====================================================================
   Tabelle: alle Variablen, Spaltenwahl, Suche, Sortieren, Schnellfilter
   ===================================================================== */
function spalten(){var o=lsLesen(LS_SPALTEN,{})||{};var l=Array.isArray(o[ichId()])?o[ichId()].filter(function(k){return !!feldVon(k)&&k!=='nachname'&&k!=='vorname';}):null;return l&&l.length?l:STANDARD_SPALTEN.slice();}
function spaltenSpeichern(l){var o=lsLesen(LS_SPALTEN,{});if(!o||typeof o!=='object'||Array.isArray(o)){o={};}if(l){o[ichId()]=l;}else{delete o[ichId()];}lsSchreiben(LS_SPALTEN,o);}
function vorhandene(key,reihe){
  var da={};zust.daten.forEach(function(x){var v=x.r[key];(Array.isArray(v)?v:[v]).forEach(function(k){if(txt(k)){da[k]=1;}});});
  var l=(reihe||[]).filter(function(k){return da[k];});
  return l.concat(Object.keys(da).filter(function(k){return l.indexOf(k)<0;}).sort(function(a,b){return a.localeCompare(b,'de');}));
}
function sortWert(f,r){
  if(f.key==='nachname'){return norm(r.nachname)+' '+norm(r.vorname);}
  var v=r[f.key];
  if(f.typ==='zahl'){return istZahl(v)?v:'';}
  if(f.typ==='liste'){return norm((v||[]).join(', '));}
  return f.typ==='datum'?(v||''):norm(v);
}
function tabZeilen(basis){
  var q=norm(tab.q), s=tab.schnell, fl=tab.filter.filter(vollstaendig), od=tab.oder.filter(vollstaendig);
  var l=basis.filter(function(x){
    var r=x.r;
    if(q&&norm([r.nachname,r.vorname,r.matricule,r.mfiles,r.schule,r.klasse].join(' ')).indexOf(q)<0){return false;}
    if(s.geschlecht&&r.geschlecht!==s.geschlecht){return false;}
    if(s.cycle&&r.cycle!==s.cycle){return false;}
    if(s.direction&&r.direction!==s.direction){return false;}
    if(s.massnahme&&r.massnahmen.indexOf(s.massnahme)<0){return false;}
    return fl.every(function(f){return passt(r,f);})&&(!od.length||od.some(function(f){return passt(r,f);}));
  });
  var f=feldVon(tab.sortFeld)||feldVon('nachname'), auf=tab.sortAuf?1:-1;
  return l.sort(function(a,b){
    var va=sortWert(f,a.r), vb=sortWert(f,b.r);
    if(va===''&&vb!==''){return 1;}if(vb===''&&va!==''){return -1;}
    var c=(typeof va==='number'&&typeof vb==='number')?va-vb:String(va).localeCompare(String(vb),'de');
    return (c*auf)||norm(a.r.nachname+' '+a.r.vorname).localeCompare(norm(b.r.nachname+' '+b.r.vorname),'de');
  });
}
function schnellSelect(k,label,opts){
  var v=tab.schnell[k];if(v&&opts.indexOf(v)<0){opts=opts.concat([v]);}
  return '<label class="db-schnell"><span>'+esc(label)+'</span><select data-db-schnell="'+k+'" data-fokus="schnell-'+k+'"><option value="">alle</option>'+
    opts.map(function(o){return '<option value="'+esc(o)+'"'+(v===o?' selected':'')+'>'+esc(k==='cycle'&&o==='ES'?'ES (secondaire)':o)+'</option>';}).join('')+'</select></label>';
}
function tabelleSeite(){
  var h=filterLeiste();
  h+='<div class="db-werkzeug">'+
    '<label class="search db-suche"><svg class="ic" aria-hidden="true"><use href="#i-search"/></svg><input id="db-q" type="search" value="'+esc(tab.q)+'" placeholder="Name, Matricule, Schule …" aria-label="Dossiers durchsuchen" autocomplete="off" data-fokus="q"></label>'+
    schnellSelect('geschlecht','Geschlecht',['Junge','Mädchen'])+schnellSelect('cycle','Cycle',['C1','C2','C3','C4','ES','andere'])+
    schnellSelect('direction','Direction régionale',vorhandene('direction',DR))+schnellSelect('massnahme','Laufende Maßnahme',vorhandene('massnahmen',ARTEN))+
    '<span class="db-werkzeug-knoepfe"><button class="btn" type="button" data-db="spalten" data-fokus="spalten">'+svg('edit')+'Spalten</button>'+
    '<button class="btn" type="button" data-db="export" data-fokus="export">'+svg('runter')+'Exportieren</button></span></div>'+
    '<div id="db-tabteil">'+tabTeilHtml()+'</div>';
  inhalt(h);
}
function tabTeilNeu(){fokusMerken();var t=$q('#db-tabteil');if(t){t.innerHTML=tabTeilHtml();}fokusZurueck();}
function kopfZelle(f){
  var an=tab.sortFeld===f.key;
  return '<th scope="col" aria-sort="'+(an?(tab.sortAuf?'ascending':'descending'):'none')+'"><button type="button" class="db-sortknopf" data-db-sort="'+f.key+'" data-fokus="sort-'+f.key+'">'+esc(f.label)+
    '<span class="db-pfeil" aria-hidden="true">'+(an?(tab.sortAuf?'▲':'▼'):'')+'</span></button></th>';
}
function zelle(f,x){
  if(f.key==='stelle'){return '<td data-label="'+esc(f.label)+'">'+H.stelleChip(x.d.stelle)+'</td>';}
  var v=anzeige(f,x.r[f.key]);
  return '<td data-label="'+esc(f.label)+'"'+(v?'':' class="leer"')+'>'+(v?esc(v):'—')+'</td>';
}
function tabTeilHtml(){
  var basis=gefiltert(), zeilen=tabZeilen(basis), sp=spalten().map(feldVon).filter(Boolean), h='';
  if(tab.filter.length||tab.oder.length){h+='<div class="db-aktivfilter" role="group" aria-label="Filter aus Diagramm oder Abfrage">'+tab.filter.map(function(fl,i){var t=filterText(fl);return '<span class="db-fchip">'+esc(t)+'<button type="button" data-db="tf-weg" data-i="'+i+'" aria-label="Filter „'+esc(t)+'“ entfernen">'+svg('x')+'</button></span>';}).join('')+
    (tab.oder.length?(function(){var t='mindestens eine: '+tab.oder.map(filterText).join(' oder ');return '<span class="db-fchip db-fchip-oder">'+esc(t)+'<button type="button" data-db="tf-oder-weg" aria-label="Oder-Filter entfernen">'+svg('x')+'</button></span>';})():'')+
    '<button class="ar-link" type="button" data-db="tf-alle-weg">Alle entfernen</button></div>';}
  h+='<p class="db-anzahl" aria-live="polite"><b>'+zeilen.length+'</b> von '+basis.length+' Dossiers'+(filterAktiv()?' <span class="ar-leise">('+esc(filterBeschreibung())+')</span>':'')+'</p>';
  if(!zeilen.length){return h+H.karte('<p>Keine Dossiers für diese Auswahl.</p><button class="btn" type="button" data-db="tab-leeren">'+svg('reload')+'Suche und Schnellfilter zurücksetzen</button>','ar-leer');}
  var grenze=200+tab.mehr, sicht=zeilen.slice(0,grenze);
  h+='<div class="db-tabrahmen"><table class="db-tab"><caption class="db-sr">Dossiers mit den gewählten Variablen. Eine Zeile öffnet alle Werte.</caption><thead><tr>'+kopfZelle({key:'nachname',label:'Name'})+sp.map(kopfZelle).join('')+'</tr></thead><tbody>'+
    sicht.map(function(x){
      return '<tr class="db-zeile'+(x.r.status==='inaktiv'?' inaktiv':'')+'" data-id="'+esc(x.d.id)+'"><td class="db-namezelle" data-label="Name"><button type="button" class="db-name" data-db-blatt="'+esc(x.d.id)+'" data-fokus="z-'+esc(x.d.id)+'"><b>'+esc(H.schuelerName(x.d.person))+'</b>'+(x.r.status==='inaktiv'?'<small>inaktiv</small>':'')+'</button></td>'+
        sp.map(function(f){return zelle(f,x);}).join('')+'</tr>';
    }).join('')+'</tbody></table></div>';
  if(zeilen.length>grenze){h+='<p class="db-mehr"><button class="btn" type="button" data-db="mehr" data-fokus="mehr">Weitere '+Math.min(200,zeilen.length-grenze)+' anzeigen</button> <span class="ar-leise">'+(zeilen.length-grenze)+' noch nicht angezeigt</span></p>';}
  return h;
}
function spaltenDialog(){
  var akt=spalten();
  var inh='<p class="ar-klein">Welche Variablen zeigt die Tabelle? Der Name steht immer vorne. Deine Auswahl wird für dich gemerkt.</p><div class="db-spaltenwahl">'+GRUPPEN.map(function(g){
    var fs=FELDER.filter(function(f){return f.gruppe===g&&f.key!=='nachname'&&f.key!=='vorname';});
    return fs.length?'<fieldset><legend>'+esc(g)+'</legend>'+fs.map(function(f){return '<label class="ar-haken"><input type="checkbox" name="s_'+f.key+'"'+(akt.indexOf(f.key)>=0?' checked':'')+'> '+esc(f.label)+(f.info?' <small>'+esc(f.info)+'</small>':'')+'</label>';}).join('')+'</fieldset>':'';
  }).join('')+'</div>';
  H.dialog('Spalten wählen',inh,[{text:'Standard',wert:'standard'},{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){if(w.aktion==='ok'&&!Object.keys(w.werte).some(function(k){return /^s_/.test(k)&&w.werte[k];})){return 'Bitte mindestens eine Spalte wählen.';}return '';}
  }).then(function(r){
    if(r.aktion==='standard'){spaltenSpeichern(null);}
    else if(r.aktion==='ok'){spaltenSpeichern(akt.filter(function(k){return r.werte['s_'+k];}).concat(FELDER.filter(function(f){return r.werte['s_'+f.key]&&akt.indexOf(f.key)<0;}).map(function(f){return f.key;})));}
    else{return;}
    if(zust.seite==='tabelle'){tabTeilNeu();var b=$q('[data-db="spalten"]');if(b){b.focus();}}
    H.toast(r.aktion==='standard'?'Standardspalten':'Spalten gemerkt');
  });
}

/* ---------- Seitenblatt: alle Werte eines Dossiers ---------- */
function blaetterSchliessen(){Array.prototype.forEach.call(document.querySelectorAll('dialog.db-blatt'),function(d){try{d.close();}catch(e){}d.remove();});}
function eintragVon(id){return zust.daten.filter(function(x){return x.d.id===id;})[0]||null;}
function blattOeffnen(id,ausloeser){
  var x=eintragVon(id);if(!x){return;}
  blaetterSchliessen();
  var dlg=document.createElement('dialog');dlg.className='db-blatt';dlg.setAttribute('aria-labelledby','db-blatt-titel');
  dlg.innerHTML=blattHtml(x);document.body.appendChild(dlg);
  dlg.addEventListener('click',function(ev){
    if(ev.target===dlg){dlg.close();return;}
    var b=ev.target.closest('[data-db-b]');if(!b){return;}
    var a=b.getAttribute('data-db-b');
    if(a==='zu'){dlg.close();}
    else if(a==='dossier'||a==='fiche'||a==='eldib'){dlg.close();H.dossierOeffnen(id,a==='fiche'?'fiche':(a==='eldib'?'entwicklung':'ueberblick'));}
    else if(a==='db'){
      var akt=eintragVon(id);if(!akt){return;}
      dbDialog(akt.d).then(function(neu){
        if(!neu){return;}
        ersetzeDossier(neu);
        if(zust.seite==='tabelle'&&$q('#db-tabteil')){tabTeilNeu();}
        if(dlg.open){dlg.innerHTML=blattHtml(eintragVon(id));var k=dlg.querySelector('[data-db-b="db"]');if(k){k.focus();}}
      });
    }
  });
  dlg.addEventListener('close',function(){dlg.remove();var z=ausloeser&&document.contains(ausloeser)?ausloeser:(zust.el&&zust.el.querySelector('[data-fokus="z-'+id+'"]'));if(z){z.focus();}});
  dlg.showModal();
}
function blattHtml(x){
  var d=x.d, r=x.r, p=d.person||{}, db=d.db||{}, ms=kontext(d).ms;
  var h='<div class="db-blatt-inhalt"><div class="db-blatt-kopf"><div><p class="overline">Datenbank</p><h2 id="db-blatt-titel">'+esc(H.schuelerName(p))+'</h2>'+
    '<p class="ar-leise">'+esc([r.alter!=null?r.alter+' Jahre':'',r.geburtsdatum?'geb. '+datumDe(r.geburtsdatum):'',r.klasse,r.schule].filter(Boolean).join(' · '))+'</p>'+
    '<div class="ar-chips">'+H.stelleChip(d.stelle)+'<span class="ar-status '+(d.status==='inaktiv'?'aus':'an')+'">'+(d.status==='inaktiv'?'inaktiv'+(d.statusSeit?' seit '+esc(datumDe(iso(d.statusSeit))):''):'aktiv')+'</span></div></div>'+
    '<button class="db-x" type="button" data-db-b="zu" aria-label="Schließen">'+svg('x')+'</button></div>'+
    '<div class="ar-knopfreihe"><button class="btn primary" type="button" data-db-b="dossier">'+svg('schueler')+'Dossier öffnen</button><button class="btn" type="button" data-db-b="db">'+svg('edit')+'Datenbank-Angaben bearbeiten</button></div>';
  h+='<section class="db-blatt-teil"><div class="db-blatt-teilkopf"><h3>Maßnahmen im Detail</h3><button class="ar-link" type="button" data-db-b="fiche">'+svg('datei')+'In der Fiche ändern</button></div>'+(ms.length?'<ul class="db-mliste">'+ms.map(function(m){
    return '<li class="'+m.stand+'"><b>'+esc(m.lang)+(m.standort?' · '+esc(m.standort):'')+'</b><span class="db-stand">'+esc(STAND[m.stand])+'</span><small>'+esc([m.von?'Beginn '+datumDe(m.von):'ohne Beginn',m.bis?'Ende '+datumDe(m.bis):'',m.dauer!=null?m.dauer+(m.dauer===1?' Monat':' Monate'):'',m.wer?'Intervenant·e: '+m.wer:''].filter(Boolean).join(' · '))+'</small></li>';
  }).join('')+'</ul>':'<p class="ar-leise">Keine Maßnahme in der Fiche angekreuzt.</p>')+'</section>';
  GRUPPEN.forEach(function(g){
    /* Variablen einer Maßnahme nur zeigen, wenn es die Maßnahme im Dossier gibt */
    var fs=FELDER.filter(function(f){return f.gruppe===g&&(!f.mk||hatMassnahme(ms,f.mk));});
    var ausFiche=fs.some(function(f){return f.quelle==='fiche'||f.quelle==='beide';}), ausDb=fs.some(function(f){return f.quelle==='db'||f.quelle==='beide'||f.quelle==='eldib';}), ausEldib=fs.some(function(f){return f.quelle==='eldib';});
    h+='<section class="db-blatt-teil"><div class="db-blatt-teilkopf"><h3>'+esc(g)+'</h3><span class="db-blatt-wo">'+
      (ausFiche?'<button class="ar-link" type="button" data-db-b="fiche" title="Diese Werte kommen aus der Fiche de renseignement">'+svg('datei')+'Fiche</button>':'')+
      (ausEldib?'<button class="ar-link" type="button" data-db-b="eldib" title="Die Stufen kommen aus der ELDiB-Einschätzung im Dossier (Reiter „Entwicklung & Ziele“)">'+svg('daten')+'ELDiB im Dossier</button>':'')+
      (ausDb?'<button class="ar-link" type="button" data-db-b="db" title="Angaben, die nur in der Datenbank stehen">'+svg('edit')+'Datenbank-Angaben</button>':'')+'</span></div><dl class="ar-dl db-dl">'+fs.map(function(f){
      var v=anzeige(f,r[f.key]);return '<dt>'+esc(f.label)+'</dt><dd'+(v?'':' class="leer"')+'>'+(v?esc(v):'—')+'</dd>';
    }).join('')+'</dl></section>';
  });
  if(txt(db.notiz)){h+='<section class="db-blatt-teil"><h3>Notiz (Datenbank)</h3><p>'+esc(db.notiz).replace(/\n/g,'<br>')+'</p></section>';}
  if(db.herkunft&&db.herkunft.quelle){h+='<p class="ar-klein">Übernommen aus '+esc(db.herkunft.quelle)+(db.herkunft.importiert?' am '+esc(datumDe(db.herkunft.importiert)):'')+(db.herkunft.angelegt?' · dort angelegt am '+esc(datumDe(db.herkunft.angelegt)):'')+'.</p>';}
  var vl=(d.verlauf||[]).slice(-5).reverse();
  if(vl.length){h+='<section class="db-blatt-teil"><h3>Letzte Änderungen</h3><ol class="ar-protokoll">'+vl.map(function(v){return '<li><span class="ar-leise">'+esc(H.datumZeit(v.z))+'</span><b>'+esc(H.kname(v.v))+'</b><span>'+esc(v.t)+'</span></li>';}).join('')+'</ol></section>';}
  return h+'</div>';
}

/* =====================================================================
   Verbindung zur Fiche: Karte im Reiter „Fiche“ des Dossiers.
   Dieselben Werte wie in Tabelle und Export (datensatz) – nichts doppelt.
   ===================================================================== */
/* Kernangaben für die Statistik und wo man sie in der Fiche ergänzt */
var KERN=[['geschlecht','person'],['geburtsdatum','person'],['matricule','person'],['nationalitaet','person'],['erstsprache','person'],['ficheDatum','person'],
  ['schule','schule'],['klasse','schule'],['direction','schule'],['massnahmenAlle','cdse']];
function kernFehlt(r){
  return KERN.filter(function(k){
    if(k[0]==='direction'&&r.cycle==='ES'){return false;}   /* Directions régionales gibt es nur im Fondamental */
    return istLeer(r[k[0]]);
  });
}
function ficheKarte(d,recht){
  if(!bausteine()||!d||!T.istResponsable()){return '';}
  recht=recht||{};
  var r=datensatz(d), db=d.db||{}, fehlt=kernFehlt(r);
  var ausFiche=FELDER.filter(function(f){return f.quelle==='fiche'&&!istLeer(r[f.key]);}).length;
  var eigene=FELDER.filter(function(f){return f.quelle==='db'&&!istLeer(r[f.key]);}).map(function(f){var v=r[f.key];return f.label+(f.typ==='liste'&&v.length>1?' ('+v.length+')':'');});
  if(txt(db.notiz)){eigene.push('Notiz');}
  return '<section class="ar-karte db-fv" aria-labelledby="db-fv-titel"><div class="ar-kartenkopf"><h2 id="db-fv-titel">In der Datenbank</h2><span class="ar-leise">nur Responsables und Verwaltung</span></div>'+
    '<p class="db-fv-satz">Was in dieser Fiche steht, steht automatisch in der Datenbank – ohne zweites Eintragen. Jede Änderung hier gilt sofort für Tabelle, Abfragen und Export.</p>'+
    '<div class="db-fv-raster">'+
      '<div class="db-fv-teil"><h3>Aus der Fiche</h3><p class="db-fv-zahl"><b>'+ausFiche+'</b> Angaben in der Datenbank</p>'+
        (fehlt.length?'<p class="db-fv-fehlt">'+svg('warn')+'Für die Statistik fehlt noch:</p><ul class="db-fv-liste">'+fehlt.map(function(k){var f=feldVon(k[0]);
            return '<li>'+(recht.bearbeiten?'<button class="ar-link" type="button" data-ar="fiche-teil" data-teil="'+k[1]+'">'+svg('edit')+esc(f.label)+'</button>':esc(f.label))+'</li>';}).join('')+'</ul>'
          :'<p class="db-fv-ok">'+svg('check')+'Alle Kernangaben für die Statistik sind da.</p>')+'</div>'+
      '<div class="db-fv-teil"><h3>Nur in der Datenbank</h3>'+(eigene.length?'<p class="db-fv-zahl"><b>'+eigene.length+'</b> eigene '+(eigene.length===1?'Angabe':'Angaben')+'</p><p class="ar-klein">'+esc(eigene.join(' · '))+'</p>'
          :'<p class="ar-klein">Noch keine. Schulform, CNI-Entscheidung, Diagnosen, IQ und die Familiensituation stehen nicht in der Fiche und werden nur hier gepflegt.</p>')+'</div>'+
    '</div>'+
    '<div class="ar-knopfreihe"><button class="btn" type="button" data-ar="db-angaben">'+svg('edit')+'Datenbank-Angaben bearbeiten</button>'+
      '<button class="btn" type="button" data-ar="db-zeigen">'+svg('daten')+'In der Datenbank ansehen</button></div></section>';
}
/* Datenbank-Angaben direkt aus dem Dossier bearbeiten → neues Dossier (oder null) */
function bearbeiten(d){
  if(!bausteine()||!d||!T.istResponsable()){return Promise.resolve(null);}
  return dbDialog(d).then(function(neu){if(neu&&zust.daten.some(function(x){return x.d.id===neu.id;})){ersetzeDossier(neu);}return neu;});
}
/* In die Tabelle der Datenbank springen und das Seitenblatt dieses Dossiers öffnen */
function zeigen(id){offenId=id||null;location.hash='#/datenbank/tabelle';}

/* ---------- Datenbank-Angaben bearbeiten (d.db; nur Responsables und Verwaltung) ---------- */
var DB_NAMEN={schulform:'Schulform',vorherigeSchule:'vorherige Schule',schulwechsel:'Schulwechsel',scolEtranger:'Schulbesuch im Ausland',cni:'CNI-Entscheidung',autreCc:'andere Kompetenzzentren',autreMesure:'andere Maßnahme',
  eltern:'Elternsituation',scas:'SCAS',tutelle:'Sorgerecht',massnahmenFamilie:'Maßnahmen Familie',diagnosen:'Diagnosen',verdacht:'Verdacht/Profil',iq:'IQ',eldibStufen:'ELDiB-Stufen',notiz:'Notiz'};
function zeilen(t){return eindeutig(String(t||'').split(/\n|;/));}
function dbWert(k,v){
  if(k==='iq'){return zahl(v);}
  if(k==='autreCc'){return ccListe(v).join('; ');}
  if(k==='eldibStufen'){v=v&&typeof v==='object'?v:{};var o={datum:iso(v.datum)}, da=false;ELDIB_B.forEach(function(b){var s=stufeZahl(v[b[0]]);o[b[0]]=s;if(s!=null){da=true;}});return da?o:null;}
  if(k==='autreMesure'){v=v&&typeof v==='object'?v:{};var o={name:txt(v.name),von:iso(v.von),bis:iso(v.bis)};return (o.name||o.von||o.bis)?o:null;}
  if(['tutelle','massnahmenFamilie','diagnosen','verdacht'].indexOf(k)>=0){return liste(v);}
  if(['schulwechsel','cni'].indexOf(k)>=0){return iso(v);}
  return txt(v);
}
function vokabular(){
  var o={diagnosen:{},verdacht:{},massnahmenFamilie:{},tutelle:{}};
  zust.daten.forEach(function(x){var db=x.d.db||{};Object.keys(o).forEach(function(k){liste(db[k]).forEach(function(v){o[k][v]=(o[k][v]||0)+1;});});});
  var STD={massnahmenFamilie:['Assistance familiale (ONE)','Aide éducative en milieu ouvert (AEMO)','Placement (Foyer)','Famille d’accueil','Suivi SCAS','Thérapie familiale'],tutelle:['Mutter','Vater','Vormund','Pflegefamilie','Foyer','ONE']};
  var r={};Object.keys(o).forEach(function(k){var l=Object.keys(o[k]).sort(function(a,b){return o[k][b]-o[k][a]||a.localeCompare(b,'de');});(STD[k]||[]).forEach(function(v){if(l.indexOf(v)<0){l.push(v);}});r[k]=l.slice(0,12);});
  return r;
}
function listenFeld(name,label,wert,hilfe,vorschlaege){
  var l=liste(wert);
  return '<label class="ar-feld voll"><span>'+esc(label)+'</span><textarea name="'+name+'" rows="'+Math.max(2,Math.min(6,l.length+1))+'">'+esc(l.join('\n'))+'</textarea></label>'+
    (hilfe?'<p class="ar-klein db-hilfe">'+esc(hilfe)+'</p>':'')+
    (vorschlaege&&vorschlaege.length?'<div class="db-vorschlaege" role="group" aria-label="Vorschläge für '+esc(label)+'"><span>Übernehmen:</span>'+vorschlaege.map(function(v){return '<button type="button" class="db-chip" data-feld="'+name+'" data-db-vorschlag="'+esc(v)+'">'+svg('plus')+esc(v)+'</button>';}).join('')+'</div>':'');
}
/* Andere Kompetenzzentren zum Ankreuzen, dazu ein Textfeld für alles andere */
function ccFeld(wert){
  var akt=ccListe(wert), rest=akt.filter(function(c){return CC_CODES.indexOf(c)<0;});
  return '<fieldset class="db-wahl db-ccwahl"><legend>Andere Kompetenzzentren</legend><div class="db-ccliste">'+CC.map(function(c){
      return '<label class="ar-haken"><input type="checkbox" name="cc_'+c[0]+'"'+(akt.indexOf(c[0])>=0?' checked':'')+'><span><b>'+esc(c[0])+'</b><small>'+esc(c[1])+'</small></span></label>';}).join('')+'</div>'+
    H.feld('cc_weitere','Weitere (mit „;“ getrennt)',rest.join('; '))+'</fieldset>';
}
/* ELDiB-Stufen von Hand: nur für ältere Fälle ohne Einschätzung im Dossier */
function eldibFeld(d,wert){
  var es=wert&&typeof wert==='object'?wert:{}, ek=eldib(d), da=!!(ek&&ek.stufen&&ELDIB_B.some(function(b){return istZahl(ek.stufen[b[0]]);}));
  var stufen=[['0','0 – noch keine'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']];
  return '<h3>ELDiB-Stufen</h3>'+(da?H.hinweis('Im Dossier gibt es eine ELDiB-Einschätzung'+(ek.datum?' vom '+esc(datumDe(iso(ek.datum))):'')+' ('+esc(ELDIB_B.map(function(b){return b[2]+' '+(istZahl(ek.stufen[b[0]])?ek.stufen[b[0]]:'–');}).join(' · '))+'). Sie gilt – die Angaben hier werden nur benutzt, wenn es keine Einschätzung im Dossier gibt.','info')
      :'<p class="ar-klein">Nur für ältere Fälle ohne ELDiB-Einschätzung im Dossier: je Bereich die höchste Stufe mit erreichten Items.</p>')+
    '<div class="db-eldibwahl">'+H.feld('el_datum','Datum der Einschätzung',iso(es.datum),'date')+ELDIB_B.map(function(b){var s=stufeZahl(es[b[0]]);return H.auswahl('el_'+b[0],b[1]+' ('+b[2]+')',s==null?'':String(s),stufen,'–');}).join('')+'</div>';
}
function dbDialog(d){
  var db=d.db||{}, x=kontext(d), vk=vokabular(), am=db.autreMesure||{}, fs=sorgerechtAusFiche(x);
  var inh='<p class="ar-klein">Angaben nur für die Datenbank (Statistik). Sie stehen verschlüsselt im Dossier; jede Änderung kommt ins Protokoll des Dossiers. Bearbeiten dürfen Responsables und die Verwaltung. Was in der Fiche steht (Schule, Maßnahmen, Erstsprache …), wird im Dossier im Reiter „Fiche“ geändert.</p>'+
    '<h3>Schule</h3><div class="ar-raster2">'+H.auswahl('schulform','Schulform',db.schulform||'',[['public','öffentlich'],['prive','privat']],'– keine Angabe –')+H.feld('vorherigeSchule','Vorherige Schule',db.vorherigeSchule)+
      H.feld('schulwechsel','Schulwechsel am',iso(db.schulwechsel),'date')+H.auswahl('scolEtranger','Schulbesuch im Ausland',jaNein(db.scolEtranger),[['ja','ja'],['nein','nein']],'– keine Angabe –')+'</div>'+
    '<h3>Maßnahmen und Dienste</h3><div class="ar-raster2">'+H.feld('cni','CNI-Entscheidung (Datum)',iso(db.cni),'date')+'</div>'+ccFeld(db.autreCc)+
    '<div class="ar-raster3">'+H.feld('am_name','Andere Maßnahme (welche)',am.name)+H.feld('am_von','von',iso(am.von),'date')+H.feld('am_bis','bis',iso(am.bis),'date')+'</div>'+
    '<h3>Familie</h3><div class="ar-raster2">'+H.auswahl('eltern','Elternsituation',db.eltern||'',[['zusammen','Eltern zusammen'],['getrennt','Eltern getrennt'],['anderes','andere Situation']],'– keine Angabe –')+
      H.auswahl('scas','SCAS beteiligt',jaNein(db.scas),[['ja','ja'],['nein','nein']],'– automatisch: '+(scasAuto(x)?'ja (steht bei den Intervenants)':'keine Angabe')+' –')+'</div>'+
    listenFeld('tutelle','Sorgerecht (eine Angabe pro Zeile)',db.tutelle,'Leer lassen: Dann gilt die Fiche (Représentant·e·s mit autorité parentale'+(fs.length?': '+fs.join(', '):'')+').',vk.tutelle)+
    listenFeld('massnahmenFamilie','Maßnahmen Familie (eine pro Zeile)',db.massnahmenFamilie,'',vk.massnahmenFamilie)+
    '<h3>Klinisches Profil</h3>'+
    listenFeld('diagnosen','Diagnosen (eine pro Zeile)',db.diagnosen,'Nur gesicherte Diagnosen aus Berichten eintragen – nichts ableiten.',vk.diagnosen)+
    listenFeld('verdacht','Verdacht / Profil (eine Angabe pro Zeile)',db.verdacht,'',vk.verdacht)+
    '<div class="ar-raster2">'+H.feld('iq','IQ (Gesamt-IQ, 40–160)',db.iq==null?'':db.iq,'number',' min="40" max="160" step="1" inputmode="numeric"')+'</div>'+
    eldibFeld(d,db.eldibStufen)+
    H.textfeld('notiz','Notiz (nur Datenbank)',db.notiz,2);
  return H.dialog('Datenbank-Angaben – '+H.schuelerName(d.person),inh,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){dlg.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-db-vorschlag]');if(!b){return;}
      var ta=dlg.querySelector('textarea[name="'+b.getAttribute('data-feld')+'"]');if(!ta){return;}
      var l=zeilen(ta.value), v=b.getAttribute('data-db-vorschlag');if(l.map(norm).indexOf(norm(v))<0){l.push(v);}ta.value=l.join('\n');ta.focus();
    });},
    pruefen:function(w){
      var v=w.werte;if(!w.aktion){return '';}
      if(txt(v.iq)!==''){var n=zahl(v.iq);if(n==null||n<40||n>160){return 'Der IQ muss zwischen 40 und 160 liegen (oder leer bleiben).';}}
      if(v.am_von&&v.am_bis&&v.am_bis<v.am_von){return 'Bei der anderen Maßnahme liegt „bis“ vor „von“.';}
      if(v.el_datum&&!ELDIB_B.some(function(b){return v['el_'+b[0]]!=='';})){return 'Bei den ELDiB-Stufen fehlt noch mindestens eine Stufe (oder das Datum löschen).';}
      return '';
    },
    ausfuehren:function(w){
      var v=w.werte, ccNeu=eindeutig(CC_CODES.filter(function(c){return v['cc_'+c];}).concat(ccListe(v.cc_weitere)));
      /* gleiche Kompetenzzentren wie vorher: den gespeicherten Text lassen, wie er ist */
      var ccAlt=ccListe(db.autreCc), ccGleich=ccAlt.slice().sort().join('|')===ccNeu.slice().sort().join('|');
      var neu={schulform:v.schulform,vorherigeSchule:txt(v.vorherigeSchule),schulwechsel:iso(v.schulwechsel),scolEtranger:v.scolEtranger,cni:iso(v.cni),
        autreCc:ccGleich?(Array.isArray(db.autreCc)?db.autreCc.join('; '):txt(db.autreCc)):ccNeu.join('; '),
        autreMesure:dbWert('autreMesure',{name:v.am_name,von:v.am_von,bis:v.am_bis}),eltern:v.eltern,scas:v.scas,tutelle:zeilen(v.tutelle),massnahmenFamilie:zeilen(v.massnahmenFamilie),
        diagnosen:zeilen(v.diagnosen),verdacht:zeilen(v.verdacht),iq:txt(v.iq)===''?null:Math.round(zahl(v.iq)),
        eldibStufen:dbWert('eldibStufen',{datum:v.el_datum,verhalten:v.el_verhalten,kommunikation:v.el_kommunikation,sozialisation:v.el_sozialisation,kognition:v.el_kognition}),notiz:txt(v.notiz)};
      var ae=Object.keys(neu).filter(function(k){return JSON.stringify(dbWert(k,db[k]))!==JSON.stringify(dbWert(k,neu[k]));}).map(function(k){return DB_NAMEN[k]||k;});
      if(!ae.length){return {unveraendert:true};}
      return T.ops.datenbank(d.id,neu,'Datenbank-Angaben geändert: '+ae.join(', '));
    }
  }).then(function(r){
    if(!r.ergebnis){return null;}
    if(r.ergebnis.unveraendert){H.toast('Keine Änderung');return null;}
    H.toast('Datenbank-Angaben gespeichert');return r.ergebnis;
  });
}

/* ---------- Export: CSV (Semikolon, UTF-8 mit BOM) oder JSON ---------- */
function auswahlText(){
  var t=[filterBeschreibung()];
  if(tab.q){t.push('Suche „'+tab.q+'“');}
  Object.keys(tab.schnell).forEach(function(k){if(tab.schnell[k]){t.push(k+': '+tab.schnell[k]);}});
  tab.filter.filter(vollstaendig).forEach(function(f){t.push(filterText(f));});
  if(tab.oder.length){t.push('mindestens eine: '+tab.oder.filter(vollstaendig).map(filterText).join(' oder '));}
  return t.join(' · ');
}
function csvZelle(s){
  s=String(s==null?'':s);
  if(/^[=+\-@\t\r]/.test(s)&&!/^-?\d+([.,]\d+)?$/.test(s)){s="'"+s;}   /* keine Formeln in Excel */
  if(/[";\r\n]/.test(s)||/^\s|\s$/.test(s)){s='"'+s.replace(/"/g,'""')+'"';}
  return s;
}
function csvWert(f,v){if(v==null){return '';}if(Array.isArray(v)){return v.join('; ');}if(f.typ==='zahl'){return String(v).replace('.',',');}return String(v);}
function herunterladen(name,blob){
  var url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(url);a.remove();},4000);return 'download';
}
/* Speichern-Dialog des Browsers (Edge/Chrome), startet im Team- bzw. Hub-Ordner auf O:\ */
function startOrdner(){
  return new Promise(function(res){
    try{
      var r=indexedDB.open('cdse-hub',1);
      r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
      r.onerror=function(){res(null);};
      r.onsuccess=function(){
        var db=r.result;
        try{var st=db.transaction('kv','readonly').objectStore('kv'), a=st.get('team-ordner'), b=st.get('hub-ordner');
          a.transaction.oncomplete=function(){db.close();var h=(a.result&&a.result.kind==='directory')?a.result:((b.result&&b.result.kind==='directory')?b.result:null);res(h);};
          a.transaction.onerror=function(){db.close();res(null);};
        }catch(e){db.close();res(null);}
      };
    }catch(e){res(null);}
  });
}
function speichern(name,blob,format,ordner){
  if(typeof window.showSaveFilePicker!=='function'){return Promise.resolve(herunterladen(name,blob));}
  var opt={suggestedName:name,types:[format==='json'?{description:'JSON-Datei',accept:{'application/json':['.json']}}:{description:'CSV-Datei (Excel)',accept:{'text/csv':['.csv']}}]};
  var mitOrdner=ordner?Object.assign({startIn:ordner},opt):opt;
  var p;try{p=Promise.resolve(window.showSaveFilePicker(mitOrdner));}catch(e){p=Promise.reject(e);}
  return p.catch(function(e){if(e&&e.name==='AbortError'){throw e;}if(ordner){return window.showSaveFilePicker(opt);}throw e;})
    .then(function(h){return h.createWritable().then(function(w){return w.write(blob).then(function(){return w.close();});}).then(function(){return 'ordner';});},
      function(e){if(e&&e.name==='AbortError'){return null;}return herunterladen(name,blob);});
}
function exportDialog(){
  var zeilenL=tabZeilen(gefiltert()), sp=spalten(), ordner=null;
  if(!zeilenL.length){H.toast('Keine Dossiers zum Exportieren');return;}
  startOrdner().then(function(h){ordner=h;});
  var inh=H.hinweis('<b>Besonders schützenswerte Daten Minderjähriger.</b> Die Datei enthält Namen, Geburtsdaten und – je nach Spalten – Diagnosen, IQ und die Familiensituation. Speichere sie <b>nur auf O:\\</b> (z. B. im Ordner deines Teams), nicht auf dem Desktop oder einem USB-Stick, und <b>verschicke sie nicht per Mail</b>. Lösche sie, sobald du sie nicht mehr brauchst.')+
    '<fieldset class="db-wahl"><legend>Format</legend><label class="ar-haken"><input type="radio" name="format" value="csv" checked> CSV für Excel (Semikolon, UTF-8)</label><label class="ar-haken"><input type="radio" name="format" value="json"> JSON (alle Werte, für Auswertungen)</label></fieldset>'+
    '<fieldset class="db-wahl"><legend>Umfang</legend><label class="ar-haken"><input type="radio" name="umfang" value="alle" checked> Alle '+FELDER.length+' Variablen</label><label class="ar-haken"><input type="radio" name="umfang" value="sichtbar"> Nur die sichtbaren Spalten ('+(sp.length+1)+')</label></fieldset>'+
    '<p class="ar-klein"><b>'+zeilenL.length+(zeilenL.length===1?' Dossier':' Dossiers')+'</b> – so, wie die Tabelle gerade gefiltert und sortiert ist ('+esc(auswahlText())+').</p>'+
    '<label class="ar-haken"><input type="checkbox" name="gelesen"> Ich speichere die Datei nur auf O:\\ und verschicke sie nicht per Mail.</label>';
  H.dialog('Exportieren',inh,[{text:'Abbrechen',wert:''},{text:'Datei speichern',wert:'ok',primaer:true}],{
    pruefen:function(w){return (w.aktion&&!w.werte.gelesen)?'Bitte den Hinweis zum Datenschutz bestätigen.':'';},
    ausfuehren:function(w){return exportieren(zeilenL,w.werte.format==='json'?'json':'csv',w.werte.umfang==='sichtbar'?sp:null,ordner);}
  }).then(function(r){if(r.ergebnis&&r.ergebnis.meldung){H.toast(r.ergebnis.meldung);if(zust.seite==='protokoll'){protokollSeite();}}});
}
function exportInhalt(zeilenL,format,nurSp){
  var fs=nurSp?[feldVon('nachname'),feldVon('vorname')].concat(nurSp.map(feldVon)).filter(Boolean):FELDER;
  if(format==='json'){
    var me=K.ich()||{};
    return JSON.stringify({format:'cdse-hub-datenbank',version:1,exportiert:new Date().toISOString(),von:me.name||'',
      hinweis:'Vertraulich – besonders schützenswerte Daten Minderjähriger. Nur auf O:\\ speichern, nicht per Mail verschicken.',
      auswahl:auswahlText(),anzahl:zeilenL.length,felder:fs.map(function(f){return {key:f.key,label:f.label,gruppe:f.gruppe,typ:f.typ};}),
      datensaetze:zeilenL.map(function(x){var o={id:x.d.id};fs.forEach(function(f){o[f.key]=x.r[f.key];});
        if(!nurSp){o.massnahmenDetail=kontext(x.d).ms.map(function(m){return {art:m.lang,stand:m.stand,beginn:m.von,ende:m.bis,dauerMonate:m.dauer,intervenant:m.wer,standort:m.standort};});}
        return o;})},null,1);
  }
  var kopf=['Dossier-ID'].concat(fs.map(function(f){return f.label;}));
  var z=zeilenL.map(function(x){return [x.d.id].concat(fs.map(function(f){return csvWert(f,x.r[f.key]);}));});
  return '\uFEFF'+[kopf].concat(z).map(function(row){return row.map(csvZelle).join(';');}).join('\r\n')+'\r\n';
}
function exportieren(zeilenL,format,nurSp,ordner){
  var name='cdse-datenbank-'+heute()+(format==='json'?'.json':'.csv');
  var blob=new Blob([exportInhalt(zeilenL,format,nurSp)],{type:format==='json'?'application/json':'text/csv;charset=utf-8'});
  return speichern(name,blob,format,ordner).then(function(ort){
    if(!ort){return {meldung:'Nicht gespeichert'};}
    protokollieren({art:'export',format:format.toUpperCase(),anzahl:zeilenL.length,text:(nurSp?(nurSp.length+1)+' Spalten':'alle Variablen')+' · '+auswahlText()});
    return {meldung:ort==='download'?'Heruntergeladen: '+name+' – bitte auf O:\\ verschieben':'Gespeichert: '+name};
  });
}

/* ---------- Protokoll: je Person (localStorage, vom Tresor mitgesichert) ---------- */
function protokollieren(e){
  var me=K.ich()||{}, l=lsLesen(LS_PROTOKOLL,[]);if(!Array.isArray(l)){l=[];}
  l.push({z:new Date().toISOString(),konto:me.id||'',name:me.name||'',art:e.art,format:e.format||'',anzahl:e.anzahl|0,text:e.text||''});
  if(l.length>500){l=l.slice(-500);}
  lsSchreiben(LS_PROTOKOLL,l);
  /* Gibt es im gemeinsamen Bereich ein Protokoll für alle (T.protokollieren), dort ebenfalls festhalten */
  if(T&&typeof T.protokollieren==='function'){try{Promise.resolve(T.protokollieren('Datenbank – '+(e.art==='export'?'Export ':'Import ')+(e.format||'')+': '+(e.anzahl|0)+' Datensätze')).catch(function(){});}catch(x){}}
}
function protokollSeite(){
  var me=K.ich()||{}, eig=(lsLesen(LS_PROTOKOLL,[])||[]).filter(function(e){return e&&e.konto===me.id;}).reverse();
  var h=H.karte('<div class="ar-kartenkopf"><h2>Deine Exporte und Importe</h2><span class="ar-leise">'+eig.length+'</span></div>'+
    '<p class="ar-klein">Wer, wann, wie viele Datensätze. Dieses Protokoll gehört zu deinem Konto und liegt verschlüsselt in deinem Daten-Tresor. Jede Änderung an einem Dossier (auch durch einen Import) steht zusätzlich im Protokoll des Dossiers.</p>'+
    (eig.length?'<ol class="ar-protokoll db-prot" data-db-liste="eigene">'+eig.slice(0,100).map(function(e){
      return '<li><span class="ar-leise">'+esc(H.datumZeit(e.z))+'</span><b>'+esc((e.art==='export'?'Export':'Import')+(e.format?' '+e.format:'')+' · '+e.anzahl+(e.anzahl===1?' Datensatz':' Datensätze'))+'</b><span>'+esc(e.text)+'</span></li>';
    }).join('')+'</ol>':'<p class="ar-leise">Noch keine Exporte oder Importe.</p>'));
  var ev=[];
  zust.daten.forEach(function(x){(x.d.verlauf||[]).forEach(function(v){if(v&&v.z){ev.push({v:v,x:x});}});});
  var arten=[['alle','Alle Änderungen'],['datenbank','Datenbank-Angaben'],['import','Importe'],['fiche','Fiche']];
  ev=ev.filter(function(e){
    if(protFilter==='datenbank'){return e.v.a==='datenbank';}
    if(protFilter==='import'){return /CDSE Stats|Excel-Tabelle|CSV-Tabelle/.test(e.v.t||'');}
    if(protFilter==='fiche'){return e.v.a==='fiche'||/Fiche/.test(e.v.t||'');}
    return true;
  }).sort(function(a,b){return String(b.v.z).localeCompare(String(a.v.z));});
  h+=H.karte('<div class="ar-kartenkopf"><h2>Zuletzt geänderte Dossiers</h2><div class="catbar" role="group" aria-label="Art der Änderung">'+arten.map(function(a){return '<button class="catchip'+(protFilter===a[0]?' on':'')+'" type="button" aria-pressed="'+(protFilter===a[0])+'" data-db-prot="'+a[0]+'" data-fokus="prot-'+a[0]+'">'+esc(a[1])+'</button>';}).join('')+'</div></div>'+
    (ev.length?'<ol class="ar-protokoll db-prot" data-db-liste="dossiers">'+ev.slice(0,40).map(function(e){
      return '<li><span class="ar-leise">'+esc(H.datumZeit(e.v.z))+'</span><b>'+esc(H.kname(e.v.v))+'</b><span><a href="#/schueler/'+esc(e.x.d.id)+'">'+esc(H.schuelerName(e.x.d.person))+'</a> – '+esc(e.v.t)+'</span></li>';
    }).join('')+'</ol>'+(ev.length>40?'<p class="ar-leise">… und '+(ev.length-40)+' ältere Einträge (im Protokoll der Dossiers).</p>':''):'<p class="ar-leise">Keine Einträge.</p>'));
  inhalt(h);
}

/* =====================================================================
   Abfragen: Freitext, Baukasten, Vorlagen, gespeicherte Abfragen
   ===================================================================== */
function gespeicherte(){var o=lsLesen(LS_ABFRAGEN,{});return (o&&Array.isArray(o[ichId()]))?o[ichId()]:[];}
function gespeicherteSchreiben(l){var o=lsLesen(LS_ABFRAGEN,{});if(!o||typeof o!=='object'||Array.isArray(o)){o={};}o[ichId()]=l;lsSchreiben(LS_ABFRAGEN,o);}
function abfragenSeite(){
  var h=filterLeiste();
  h+='<p class="ar-klein db-grundmenge">Grundmenge: <b>'+gefiltert().length+' Dossiers</b> ('+esc(filterBeschreibung())+'). Die Filter oben gelten für jede Abfrage.</p>';
  h+='<section class="ar-karte db-frage"><h2>Frage in eigenen Worten</h2><form class="db-frageform" data-db-form="frage"><label class="search db-fragefeld"><svg class="ic" aria-hidden="true"><use href="#i-search"/></svg><input id="db-frage" type="text" name="frage" value="'+esc(abf.frage)+'" placeholder="z. B. Durchschnittsalter der Mädchen mit ISA in DR Esch" aria-label="Frage in eigenen Worten" autocomplete="off" data-fokus="frage"></label><button class="btn primary" type="submit">Fragen</button></form>'+
    '<div class="db-beispiele" role="group" aria-label="Beispiele">'+BEISPIELE.map(function(b,i){return '<button type="button" class="db-chip" data-db-beispiel="'+esc(b)+'" data-fokus="bsp-'+i+'">'+esc(b)+'</button>';}).join('')+'</div>'+
    '<div id="db-verstanden" aria-live="polite">'+verstandenHtml()+'</div>'+
    '<p class="ar-klein">Die Frage wird nur hier im Browser nach Wortmustern ausgewertet – keine KI, nichts verlässt den Computer.</p></section>';
  h+='<div class="db-abfragen"><div class="db-links"><div class="db-bau" id="db-bau">'+bauHtml()+'</div><div class="db-erg" id="db-ergebnis">'+ergebnisHtml()+'</div></div><aside class="db-vorlagen" id="db-vorlagen">'+vorlagenHtml()+'</aside></div>';
  inhalt(h);diagrammeZeichnen();
}
function verstandenHtml(){
  var r=abf.verstanden;if(!r){return '';}
  if(!r.verstanden){return '<div class="db-verstanden nein"><p><b>Nicht verstanden.</b> Versuche es mit Wörtern wie „wie viele“, „Durchschnittsalter“, „nach Stelle“, „mit ISA“, „Mädchen“, „in DR Esch“ – oder nimm ein Beispiel.</p>'+(r.unklar.length?'<p class="ar-klein">Nicht berücksichtigt: '+esc(r.unklar.join(', '))+'</p>':'')+'</div>';}
  return '<div class="db-verstanden"><p><b>So verstanden:</b> <span class="db-verstanden-satz">'+esc(r.satz)+'</span></p>'+
    (r.unklar.length?'<p class="ar-klein">Nicht berücksichtigt: '+esc(r.unklar.map(function(w){return '„'+w+'“';}).join(', '))+'</p>':'')+
    r.hinweise.map(function(t){return '<p class="ar-klein">'+esc(t)+'</p>';}).join('')+'</div>';
}
function feldOptionen(liste,sel,filterFn){
  return GRUPPEN.map(function(g){
    var fs=liste.filter(function(f){return f.gruppe===g&&(!filterFn||filterFn(f));});
    return fs.length?'<optgroup label="'+esc(g)+'">'+fs.map(function(f){return '<option value="'+f.key+'"'+(f.key===sel?' selected':'')+'>'+esc(f.label)+'</option>';}).join('')+'</optgroup>':'';
  }).join('');
}
function wertOptionen(f){
  var da={};zust.daten.forEach(function(x){var v=x.r[f.key];(Array.isArray(v)?v:[v]).forEach(function(k){if(txt(k)){da[k]=(da[k]||0)+1;}});});
  var basis=f.typ==='ja-nein'?['ja','nein']:optionenVon(f), l=basis.slice();
  Object.keys(da).sort(function(a,b){return da[b]-da[a]||a.localeCompare(b,'de');}).forEach(function(k){if(l.indexOf(k)<0){l.push(k);}});
  return l.map(function(v){return [v,f.key==='sprache'&&v!=='andere'?v+' – '+spracheName(v):v];});
}
function feldHtml(lab,ctrl){return '<label class="ar-feld"><span>'+esc(lab)+'</span>'+ctrl+'</label>';}
function wertEingabe(f,fl,i,k){
  var v=fl[k]==null?'':String(fl[k]), lab=k==='wert2'?'und':'Wert', attr=' data-db-fz="'+k+'" data-i="'+i+'" data-fokus="fz-'+i+'-'+k+'"';
  if(mehrfach(fl.op)){
    var mo=wertOptionen(f), ws=werteVon(fl);
    ws.forEach(function(w){if(!mo.some(function(o){return o[0]===w;})){mo.push([w,w]);}});
    if(!mo.length){return '<p class="ar-leise db-mehrfach-leer">Noch keine Werte in den Dossiers.</p>';}
    return '<fieldset class="db-mehrfach"><legend>Werte <small>– mehrere ankreuzen</small></legend><div class="db-mehrfach-liste">'+mo.map(function(o,j){
      return '<label class="ar-haken"><input type="checkbox" data-db-fw data-i="'+i+'" value="'+esc(o[0])+'"'+(ws.indexOf(o[0])>=0?' checked':'')+' data-fokus="fw-'+i+'-'+j+'"> '+esc(o[1])+'</label>';}).join('')+'</div></fieldset>';
  }
  if(fl.op==='imSchuljahr'){var sjs=schuljahre();if(v&&sjs.indexOf(v)<0){sjs.unshift(v);}return feldHtml(lab,'<select'+attr+'><option value="">– wählen –</option>'+sjs.map(function(s){return '<option'+(s===v?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select>');}
  if(f.typ==='zahl'){return feldHtml(lab,'<input type="number" step="any" inputmode="decimal" value="'+esc(v)+'"'+attr+'>');}
  if(f.typ==='datum'){return feldHtml(lab,'<input type="date" value="'+esc(iso(v))+'"'+attr+'>');}
  var opts=wertOptionen(f);
  if((f.typ==='auswahl'||f.typ==='ja-nein'||(f.typ==='liste'&&fl.op!=='enthaeltText'))&&opts.length){
    if(v&&!opts.some(function(o){return o[0]===v;})){opts.push([v,v]);}
    return feldHtml(lab,'<select'+attr+'><option value="">– wählen –</option>'+opts.map(function(o){return '<option value="'+esc(o[0])+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>');
  }
  return feldHtml(lab,'<input type="text" value="'+esc(v)+'" list="db-dl-'+i+'" autocomplete="off"'+attr+'><datalist id="db-dl-'+i+'">'+opts.slice(0,40).map(function(o){return '<option value="'+esc(o[0])+'">';}).join('')+'</datalist>');
}
function filterZeileHtml(fl,i){
  var f=feldVon(fl.feld)||FELDER[0], ops=opsFuer(f);
  return '<div class="db-fzeile'+(mehrfach(fl.op)?' mehr':(fl.op==='zwischen'?' zwei':(brauchtWert(fl.op)?'':' ohnewert')))+'" data-i="'+i+'">'+
    '<div class="db-f-feld">'+feldHtml('Feld','<select data-db-fz="feld" data-i="'+i+'" data-fokus="fz-'+i+'-feld">'+feldOptionen(FELDER,f.key)+'</select>')+'</div>'+
    '<div class="db-f-op">'+feldHtml('Bedingung','<select data-db-fz="op" data-i="'+i+'" data-fokus="fz-'+i+'-op">'+ops.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===fl.op?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>')+'</div>'+
    (brauchtWert(fl.op)?'<div class="db-f-wert">'+wertEingabe(f,fl,i,'wert')+'</div>':'')+(fl.op==='zwischen'?'<div class="db-f-wert2">'+wertEingabe(f,fl,i,'wert2')+'</div>':'')+
    '<button class="db-x db-f-x" type="button" data-db="fz-weg" data-i="'+i+'" aria-label="Filter „'+esc(f.label)+'“ entfernen">'+svg('x')+'</button></div>';
}
function bauHtml(){
  var a=abf.a, kz=a.kennzahl, oder=a.verknuepfung==='oder';
  return '<section class="ar-karte"><div class="ar-kartenkopf"><h2>Baukasten</h2><button class="ar-link" type="button" data-db="abfrage-neu" data-fokus="abfrage-neu">'+svg('reload')+'Neu beginnen</button></div>'+
    '<div class="db-bauzeile">'+feldHtml('Kennzahl','<select data-db-bau="fn" data-fokus="bau-fn">'+KENNZAHLEN.map(function(k){return '<option value="'+k[0]+'"'+(k[0]===kz.fn?' selected':'')+'>'+esc(k[1])+'</option>';}).join('')+'</select>')+
      (kz.fn!=='anzahl'?feldHtml('von','<select data-db-bau="feld" data-fokus="bau-feld">'+feldOptionen(FELDER,kz.feld,function(f){return f.typ==='zahl';})+'</select>'):'')+'</div>'+
    '<fieldset class="db-filterbox"><legend>Filter <small>– '+(oder?'mindestens einer muss zutreffen':'alle müssen zutreffen')+'</small></legend>'+
      (a.filter.length>1?'<div class="db-verkn">'+feldHtml('Verknüpfung','<select data-db-bau="verknuepfung" data-fokus="bau-verkn"><option value="und"'+(oder?'':' selected')+'>und – alle Filter müssen zutreffen</option><option value="oder"'+(oder?' selected':'')+'>oder – mindestens ein Filter trifft zu</option></select>')+'</div>':'')+
      (a.filter.length?a.filter.map(function(fl,i){return (i?'<p class="db-verbinder" aria-hidden="true"><span>'+(oder?'oder':'und')+'</span></p>':'')+filterZeileHtml(fl,i);}).join(''):'<p class="ar-leise">Kein Filter – gezählt wird die ganze Grundmenge.</p>')+
      '<button class="btn" type="button" data-db="fz-plus" data-fokus="fz-plus">'+svg('plus')+'Filter hinzufügen</button></fieldset>'+
    '<div class="db-bauzeile">'+feldHtml('Gruppieren nach','<select data-db-bau="gruppe" data-fokus="bau-gruppe"><option value="">– nicht gruppieren –</option>'+feldOptionen(FELDER,a.gruppe,gruppierbar)+'</select>')+
      (a.gruppe?feldHtml('und danach nach (Kreuztabelle)','<select data-db-bau="gruppe2" data-fokus="bau-gruppe2"><option value="">– keine zweite Gruppe –</option>'+feldOptionen(FELDER,a.gruppe2,function(f){return gruppierbar(f)&&f.key!==a.gruppe;})+'</select>'):'')+'</div>'+
    '<p class="db-satz" id="db-satz" aria-live="polite">'+esc(satz(a))+'</p>'+
    '<div class="ar-knopfreihe"><button class="btn" type="button" data-db="abfrage-speichern" data-fokus="abfrage-speichern">'+svg('check')+'Abfrage speichern</button>'+
      '<button class="btn" type="button" data-db="abfrage-tabelle" data-fokus="abfrage-tabelle">'+svg('datei')+'Diese Dossiers in der Tabelle</button></div></section>';
}
function kzLabel(kz){var nf=kz.fn!=='anzahl'?feldVon(kz.feld):null;return nf?({mittel:'Mittelwert',median:'Median',min:'Minimum',max:'Maximum',summe:'Summe'}[kz.fn]+' '+nf.label):'Anzahl';}
function kzZahl(kz,w){return istZahl(w)?zahlDe(w,(kz.fn==='mittel'||kz.fn==='median')?1:2):'–';}
function ergebnisHtml(){
  var basis=gefiltert().map(function(x){return x.r;}), a=abf.a, kz=a.kennzahl, res=ausfuehren(basis,a), num=kz.fn!=='anzahl'&&!!feldVon(kz.feld), g=feldVon(res.gruppe);
  var h='<section class="ar-karte db-ergebnis"><div class="ar-kartenkopf"><h2>Ergebnis</h2><span class="ar-leise" data-db-treffer="'+res.n+'">'+res.n+' von '+res.basis+' Dossiers erfüllen die Filter</span></div>';
  if(!g){
    h+='<div class="db-gross"><b data-db-wert>'+esc(num?kzZahl(kz,res.gesamt.wert):String(res.n))+'</b><span>'+esc(num?kzLabel(kz):(res.n===1?'Dossier':'Dossiers'))+'</span></div>';
    if(num){h+='<p class="ar-klein">Berechnet aus '+res.gesamt.mitWert+(res.gesamt.mitWert===1?' Dossier':' Dossiers')+' mit Angabe'+(res.n-res.gesamt.mitWert?' – bei '+(res.n-res.gesamt.mitWert)+' fehlt der Wert':'')+'.</p>';}
    return h+'</section>';
  }
  if(!res.gruppen.length){return h+'<p class="ar-leise">Keine Dossiers erfüllen die Filter.</p></section>';}
  if(res.kreuz){
    h+=kreuzHtml(res,g,feldVon(res.gruppe2),kz,num,a);
    if(res.mehrfach){h+='<p class="ar-klein">Mehrfachnennung: Ein Dossier kann in mehreren Zeilen oder Spalten zählen (z. B. mit zwei laufenden Maßnahmen).</p>';}
    return h+'</section>';
  }
  dg.ergebnis={art:'balken',titel:'Ergebnis nach '+g.label,eintraege:res.gruppen.map(function(x){
    var drill=drillMit(a,[drillFuer(g.key,x.key)]);
    return {label:x.key===OHNE?'ohne Angabe':(g.key==='sprache'&&x.key!=='andere'?spracheName(x.key):x.key),titel:g.key==='sprache'?x.key:'',wert:num?(istZahl(x.wert)?x.wert:0):x.n,text:num?kzZahl(kz,x.wert):null,leer:x.key===OHNE,drill:x.n?drill:null};
  })};
  h+='<div class="db-ergraster"><div class="db-dg" data-dg="ergebnis"></div><table class="ar-mini db-ergtab"><thead><tr><th scope="col">'+esc(g.label)+(g.typ==='datum'?' (Schuljahr)':'')+'</th><th scope="col" class="zahl">Dossiers</th>'+
    (num?'<th scope="col" class="zahl">'+esc(kzLabel(kz))+'</th><th scope="col" class="zahl">mit Angabe</th>':'<th scope="col" class="zahl">Anteil</th>')+'</tr></thead><tbody>'+
    res.gruppen.map(function(x){return '<tr data-gruppe="'+esc(x.key)+'"><th scope="row">'+esc(x.key===OHNE?'ohne Angabe':(g.key==='sprache'&&x.key!=='andere'?x.key+' – '+spracheName(x.key):x.key))+'</th><td class="zahl">'+x.n+'</td>'+
      (num?'<td class="zahl">'+esc(kzZahl(kz,x.wert))+'</td><td class="zahl">'+x.mitWert+'</td>':'<td class="zahl">'+(res.n?zahlDe(100*x.n/res.n,0)+' %':'–')+'</td>')+'</tr>';}).join('')+
    '</tbody><tfoot><tr><th scope="row">Gesamt</th><td class="zahl">'+res.n+'</td>'+(num?'<td class="zahl">'+esc(kzZahl(kz,res.gesamt.wert))+'</td><td class="zahl">'+res.gesamt.mitWert+'</td>':'<td class="zahl">'+(res.mehrfach?'':'100 %')+'</td>')+'</tr></tfoot></table></div>';
  if(res.mehrfach){h+='<p class="ar-klein">Mehrfachnennung: Ein Dossier kann in mehreren Gruppen zählen (z. B. mit zwei laufenden Maßnahmen). Die Gruppen ergeben zusammen deshalb mehr als '+res.n+'.</p>';}
  return h+'</section>';
}
/* Filter einer Abfrage für die Tabelle: {und:[…], oder:[…]} (bei „oder“ muss mindestens einer zutreffen) */
function drillBasis(a){var fl=(a.filter||[]).filter(vollstaendig);return (a.verknuepfung==='oder'&&fl.length>1)?{und:[],oder:fl}:{und:fl,oder:[]};}
function drillMit(a,extra){var b=drillBasis(a);return {und:extra.concat(b.und),oder:b.oder};}
function gruppeText(g,k){return k===OHNE?'ohne Angabe':(g.key==='sprache'&&k!=='andere'?k+' – '+spracheName(k):k);}
/* Kreuztabelle: Zeilen = erste Gruppe, Spalten = zweite Gruppe; je Zelle die Kennzahl, Klick → Tabelle */
function kreuzHtml(res,g,g2,kz,num,a){
  var K=res.kreuz, max=0;
  K.zeilen.forEach(function(z){K.spalten.forEach(function(s){var c=z.zellen[s.key], w=num?c.wert:c.n;if(istZahl(w)&&w>max){max=w;}});});
  function zelle(c,drill){
    if(!c.n){return '<td class="zahl leer">–</td>';}
    var w=num?c.wert:c.n, anteil=max&&istZahl(w)?Math.round(100*w/max):0;
    return '<td class="zahl" style="--db-anteil:'+anteil+'%"><a href="#/datenbank/tabelle" data-db-drill="'+esc(JSON.stringify(drill))+'" title="Diese Dossiers in der Tabelle">'+esc(num?kzZahl(kz,c.wert):String(c.n))+(num?'<small>n = '+c.mitWert+'</small>':'')+'</a></td>';
  }
  return '<p class="ar-klein db-kreuz-info">Zeilen: <b>'+esc(g.label)+'</b> · Spalten: <b>'+esc(g2.label)+'</b> · in den Zellen: '+esc(num?kzLabel(kz)+' (n = Dossiers mit Angabe)':'Zahl der Dossiers')+'. Ein Klick auf eine Zahl zeigt diese Dossiers in der Tabelle.</p>'+
    '<div class="db-tabrahmen db-kreuzrahmen"><table class="db-kreuz" data-db-kreuz><thead><tr><th scope="col" class="db-kreuz-ecke">'+esc(g.label)+' ↓ · '+esc(g2.label)+' →</th>'+
      K.spalten.map(function(s){return '<th scope="col" class="zahl">'+esc(gruppeText(g2,s.key))+'</th>';}).join('')+'<th scope="col" class="zahl">Gesamt</th></tr></thead><tbody>'+
    K.zeilen.map(function(z){
      return '<tr data-gruppe="'+esc(z.key)+'"><th scope="row">'+esc(gruppeText(g,z.key))+'</th>'+K.spalten.map(function(s){return zelle(z.zellen[s.key],drillMit(a,[drillFuer(g.key,z.key),drillFuer(g2.key,s.key)]));}).join('')+
        '<td class="zahl summe">'+esc(num?kzZahl(kz,z.wert):String(z.n))+'</td></tr>';
    }).join('')+'</tbody><tfoot><tr><th scope="row">Gesamt</th>'+K.spalten.map(function(s){return '<td class="zahl">'+esc(num?kzZahl(kz,s.wert):String(s.n))+'</td>';}).join('')+
      '<td class="zahl">'+esc(num?kzZahl(kz,res.gesamt.wert):String(res.n))+'</td></tr></tfoot></table></div>';
}
function vorlagenHtml(){
  var gs=gespeicherte();
  return '<section class="ar-karte"><h2>Vorlagen</h2><p class="ar-klein">Häufige Fragen der Leitung und des Ministeriums – ein Klick füllt den Baukasten.</p>'+
      VORLAGEN_BEREICHE.map(function(b,bi){var l=VORLAGEN.filter(function(v){return v.b===bi;});
        return l.length?'<h3 class="db-vorlagen-b">'+esc(b)+'</h3><div class="db-vorlagenliste">'+l.map(function(v){return '<button type="button" class="db-vorlage" data-db-vorlage="'+v.id+'" data-fokus="v-'+v.id+'"><b>'+esc(v.titel)+'</b><small>'+esc(v.text)+'</small></button>';}).join('')+'</div>':'';}).join('')+'</section>'+
    '<section class="ar-karte" id="db-gespeichert"><h2>Gespeicherte Abfragen</h2>'+(gs.length?'<ul class="db-gliste">'+gs.map(function(g){
      return '<li><button type="button" class="db-vorlage" data-db-gespeichert="'+esc(g.id)+'" data-fokus="g-'+esc(g.id)+'"><b>'+esc(g.name)+'</b><small>'+esc(satz(abfrageNorm(g.abfrage)))+'</small></button><button type="button" class="db-x" data-db="gespeichert-weg" data-id="'+esc(g.id)+'" aria-label="Abfrage „'+esc(g.name)+'“ löschen">'+svg('x')+'</button></li>';
    }).join('')+'</ul>':'<p class="ar-leise">Noch keine. Im Baukasten eine Abfrage zusammenstellen und „Abfrage speichern“ wählen – sie wird nur für dich gemerkt.</p>')+'</section>';
}
function bauNeu(){
  fokusMerken();
  var b=$q('#db-bau');if(b){b.innerHTML=bauHtml();}
  ergebnisNeu();fokusZurueck();
}
function ergebnisNeu(){var e=$q('#db-ergebnis');if(e){e.innerHTML=ergebnisHtml();}var s=$q('#db-satz');if(s){s.textContent=satz(abf.a);}diagrammeZeichnen();}
function frageStellen(text){
  abf.frage=String(text||'').trim();
  if(!abf.frage){abf.verstanden=null;fokusMerken();abfragenSeite();fokusZurueck();return;}
  var r=frageVerstehen(abf.frage);abf.verstanden=r;
  if(r.verstanden){abf.a=abfrageNorm(r.abfrage);}
  fokusMerken();abfragenSeite();fokusZurueck();
}
function speichernDialog(){
  var vorschlag=satz(abf.a).replace(/\.$/,'');
  H.dialog('Abfrage speichern',H.feld('name','Name',vorschlag.length>60?vorschlag.slice(0,60):vorschlag,'text',' autofocus autocomplete="off" maxlength="80"')+'<p class="ar-klein">'+esc(satz(abf.a))+' Die Abfrage wird nur für dich gemerkt.</p>',
    [{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{pruefen:function(w){return (w.aktion&&!txt(w.werte.name))?'Bitte einen Namen eingeben.':'';}}).then(function(r){
    if(r.aktion!=='ok'){return;}
    var name=txt(r.werte.name), l=gespeicherte().filter(function(g){return norm(g.name)!==norm(name);});
    l.unshift({id:(T.neueId?T.neueId(8):String(Date.now())),name:name,abfrage:kopie(abf.a),z:new Date().toISOString()});
    gespeicherteSchreiben(l.slice(0,50));
    var v=$q('#db-vorlagen');if(v){v.innerHTML=vorlagenHtml();}
    H.toast('Abfrage gespeichert');
  });
}

/* =====================================================================
   Import aus CDSE Stats (JSON-Export aus repository.js, Sync-Datei, CSV)
   ---------------------------------------------------------------------
   Feldzuordnung CDSE Stats (public/fields.js) → Dossier des Hubs:
     matricule → person.matricule · nom/prenom → person.nachname/vorname
     sexe M/F/D → person.geschlecht m/w/– · date_naissance → person.geburtsdatum
     dossier_mfile → fiche.mfiles · dir (alte Liste) → fiche.ef.dr (Zuordnung in der Vorschau)
     ecole_lycee → fiche.schule.name + person.schule · langue_1 → fiche.ersteSprache
     DS/ISA/C&G (mesure_cdse_1..3, Daten, „réalisé par“) → fiche.cdse.diagnostic/isa/cgPro|cgEltern
     spec_school + scolarisation_specialisee + debut/fin_scol_spe → fiche.cdse.annexe|cdp|cst (+ Standort),
       ohne spec_school → fiche.cdse.sonstige · autres_services → fiche.intervenants
     ab CDSE Stats 0.5: Annexe/CST/CdP/Atelier/Rééducation mit eigenen Daten → fiche.cdse.* (welche = Standort),
       cg_type → cgPro/cgEltern, autres_cc (Liste) → db.autreCc, langue_1_autre → fiche.ersteSprache
     school_type → db.schulform · previous_school, date_school_change → db.vorherigeSchule, db.schulwechsel
     date_decision_cni → db.cni · autre_cc_implique → db.autreCc · autre_mesure (+ Daten) → db.autreMesure
     scol_etranger → db.scolEtranger · diagnostics → db.diagnosen · verdachtsdiagnosen_profil → db.verdacht
     iq → db.iq · parents → db.eltern · scas → db.scas · tutelle → db.tutelle · mesures_famille → db.massnahmenFamilie
     eldib_date, eldib_v/k/soz/kog → db.eldibStufen (nur ohne ELDiB-Einschätzung im Dossier)
     Excel-Tabelle zusätzlich: classe → Klasse, nationalite, lieu_naissance, stelle, mesures (Liste), remarque → db.notiz
     id, created_at, updated_at → db.herkunft · age → nicht übernommen (wird berechnet)
   ===================================================================== */
var STATS_FELDER=[['id','ID'],['matricule','National ID','Matricule'],['dossier_mfile','M-File No.','N° M-File','Dossier M-File'],['nom','Last name','Nom'],['prenom','First name','Prénom'],
  ['sexe','Sex','Sexe'],['date_naissance','Date of birth','Date de naissance'],['age','Age','Âge'],['dir','DIR','Direction de région'],['ecole_lycee','School','École / Lycée','Ecole/Lycée'],['school_type','School sector','Secteur'],
  ['spec_school','Specialized school','École spécialisée','Specialized school (old field)'],['previous_school','Previous school','École précédente'],['date_school_change','School change date','Date changement d’école'],
  ['mesure_cdse_1','CDSE Measure 1','Mesure CDSE 1'],['mesure_cdse_2','CDSE Measure 2','Mesure CDSE 2'],['mesure_cdse_3','CDSE Measure 3','Mesure CDSE 3'],['date_decision_cni','CNI decision date','Date décision CNI'],
  ['ds_realise_par','DS performed by','DS réalisé par'],['date_ds','DS date','Date DS'],['isa_realise_par','ISA performed by','ISA réalisé par'],['debut_isa','ISA start','Début ISA'],['fin_isa','ISA end','Fin ISA'],
  ['cg_realise_par','C&G performed by','C&G réalisé par'],['debut_cg','C&G start','Début C&G'],['fin_cg','C&G end','Fin C&G'],['scolarisation_specialisee','Institution'],['debut_scol_spe','Spec. schooling start'],['fin_scol_spe','Spec. schooling end'],
  ['autre_mesure','Other measure','Autre mesure','Other measure — which'],['debut_autre_mesure','Other measure start'],['fin_autre_mesure','Other measure end'],['autre_cc_implique','Other C&C involved','Other CC involved (old text)'],['autres_services','Other services','Autres services'],
  ['scol_etranger','Schooling abroad','Scolarité à l’étranger'],['diagnostics','Diagnoses','Diagnostics'],['verdachtsdiagnosen_profil','Suspected diagnoses / Profile'],['iq','IQ','QI'],['langue_1','First language','Langue 1'],['langue_1_autre','First language — which'],
  ['parents','Parents'],['parents_autre','Parents — which situation'],['scas','SCAS'],['tutelle','Guardianship by','Tutelle'],['mesures_famille','Family measures','Mesures famille'],['created_at','Created at'],['updated_at','Updated at'],
  /* ab CDSE Stats 0.5: Annexe, CST, CdP, Atelier und Rééducation als eigene Maßnahmen, C&G für wen, andere CC als Liste, ELDiB-Stufen */
  ['cg_type','C&G for'],['atelier_type','Which atelier'],['atelier_realise_par','Atelier led by'],['debut_atelier','Atelier start'],['fin_atelier','Atelier end'],
  ['reeducation_type','Which rééducation'],['reeducation_realise_par','Rééducation by'],['debut_reeducation','Rééducation start'],['fin_reeducation','Rééducation end'],
  ['debut_annexe','Annexe start'],['fin_annexe','Annexe end'],['cst_groupe','CST group'],['debut_cst','CST start'],['fin_cst','CST end'],
  ['cdp_region','CdP class in'],['debut_cdp','CdP start'],['fin_cdp','CdP end'],['autres_cc','Other competence centres (CC)'],
  ['eldib_date','ELDiB date'],['eldib_v','Stage — Behaviour (V)'],['eldib_k','Stage — Communication (K)'],['eldib_soz','Stage — Socialisation (SOZ)'],['eldib_kog','Stage — Cognition (KOG)']];
var STATS_LISTEN=['autres_services','diagnostics','verdachtsdiagnosen_profil','tutelle','mesures_famille','autres_cc'];
var SPRACHE_STATS={LU:'Luxemburgisch',FR:'Französisch',DE:'Deutsch',PT:'Portugiesisch',EN:'Englisch',IT:'Italienisch',ES:'Spanisch',OTHER:'andere'};
/* Alte DIR-Liste von CDSE Stats → Directions der Fiche; nicht eindeutige Namen wählt man in der Vorschau */
var DR_ALT={'dir luxembourg-ville':'01, Luxembourg','dir esch-sur-alzette':'06 Esch/Alzette','dir petange':'03 Pétange','dir remich':'09 Remich','dir grevenmacher':'10 Grevenmacher','dir echternach':'11 Echternach',
  'dir mersch':'12 Mersch','dir redange/rambrouch':'13 Rédange/Attert','dir diekirch/vianden':'14 Diekirch','dir clervaux/wiltz':'15 Wiltz','dir wiltz':'15 Wiltz'};
var DR_UNKLAR=['dir capellen','dir strassen','dir luxembourg-est','dir luxembourg-ouest'];
var ZUORDNUNG=[['matricule','person.matricule','Abgleich mit vorhandenen Dossiers'],['nom, prenom','person.nachname, person.vorname',''],['sexe (M / F / D)','person.geschlecht (m / w)','„D“ bleibt leer – der Hub kennt nur Junge/Mädchen'],
  ['date_naissance','person.geburtsdatum',''],['dossier_mfile','fiche.mfiles',''],['dir (DR 01–15 oder alte DIR-Liste)','fiche.ef.dr (Directions der Fiche)','Zuordnung in der Vorschau'],['ecole_lycee','fiche.schule.name, person.schule',''],
  ['langue_1 (LU, FR, DE, PT …)','fiche.ersteSprache','„Other“ → andere'],['mesure_cdse_1–3, date_ds, ds_realise_par','fiche.cdse.diagnostic','angekreuzt; Beginn und Ende = date_ds (ein Termin); Intervenant·e'],['debut_isa, fin_isa, isa_realise_par','fiche.cdse.isa',''],
  ['debut_cg, fin_cg, cg_realise_par','fiche.cdse.cgPro oder .cgEltern','wählbar'],['spec_school, scolarisation_specialisee, debut/fin_scol_spe','fiche.cdse.annexe / .cdp / .cst','Institution = Standort (CdP/CST); ohne spec_school: fiche.cdse.sonstige'],
  ['autres_services','fiche.intervenants (Institution)',''],['school_type (Public / Privé)','db.schulform',''],['previous_school, date_school_change','db.vorherigeSchule, db.schulwechsel',''],['date_decision_cni','db.cni',''],
  ['autres_cc (ab 0.5, Liste) oder autre_cc_implique','db.autreCc','als Kürzel: „CL; CDI“ – Unbekanntes bleibt als Text'],
  ['cg_type (Professionals / Parents / beide)','fiche.cdse.cgPro und/oder .cgEltern','ohne cg_type: Wahl oben'],
  ['atelier_type, debut/fin_atelier, atelier_realise_par','fiche.cdse.atelier','welches Atelier = Standort'],
  ['reeducation_type, debut/fin_reeducation, reeducation_realise_par','fiche.cdse.reeducation','welche Rééducation = Standort'],
  ['debut/fin_annexe · cst_groupe, debut/fin_cst · cdp_region, debut/fin_cdp','fiche.cdse.annexe · .cst · .cdp','ab CDSE Stats 0.5; CST-Gruppe und CdP-Region = Standort'],
  ['langue_1_autre, parents_autre','fiche.ersteSprache, db.eltern','Text zu „Other“'],
  ['eldib_date, eldib_v, eldib_k, eldib_soz, eldib_kog','db.eldibStufen','gelten nur, solange es im Dossier keine ELDiB-Einschätzung gibt'],['dur_*, measures_* (berechnet)','–','nicht übernommen: Dauern rechnet der Hub selbst'],['autre_mesure + Daten','db.autreMesure',''],['scol_etranger (Yes / No)','db.scolEtranger (ja / nein)',''],['diagnostics, verdachtsdiagnosen_profil','db.diagnosen, db.verdacht','unverändert übernommen'],
  ['iq','db.iq','nur 40–160'],['parents (Together / Separated / Other)','db.eltern (zusammen / getrennt / anderes)',''],['scas (Yes / No)','db.scas (ja / nein)',''],
  ['tutelle','db.tutelle','Mother → Mutter, Father → Vater, Both parents → Mutter + Vater, Foster family → Pflegefamilie …'],['mesures_famille','db.massnahmenFamilie',''],
  ['id, created_at, updated_at','db.herkunft','created_at zählt für den Beginn der Begleitung'],['age','–','wird aus dem Geburtsdatum berechnet']];
function statsSchluessel(h){var n=norm(h);for(var i=0;i<STATS_FELDER.length;i++){if(STATS_FELDER[i].some(function(x){return norm(x)===n;})){return STATS_FELDER[i][0];}}return '';}
function csvLesen(text){
  var erste=(text.split(/\r?\n/)[0]||''), z={';':0,',':0,'\t':0}, inQ=false, i, c;
  for(i=0;i<erste.length;i++){c=erste[i];if(c==='"'){inQ=!inQ;}else if(!inQ&&z[c]!=null){z[c]++;}}
  var sep=Object.keys(z).sort(function(a,b){return z[b]-z[a];})[0]||';';
  var zeilenL=[], zeile=[], feld='';inQ=false;
  for(i=0;i<text.length;i++){
    c=text[i];
    if(inQ){if(c==='"'&&text[i+1]==='"'){feld+='"';i++;}else if(c==='"'){inQ=false;}else{feld+=c;}}
    else if(c==='"'){inQ=true;}
    else if(c===sep){zeile.push(feld);feld='';}
    else if(c==='\n'){zeile.push(feld);zeilenL.push(zeile);zeile=[];feld='';}
    else if(c!=='\r'){feld+=c;}
  }
  if(feld.length||zeile.length){zeile.push(feld);zeilenL.push(zeile);}
  return zeilenL.filter(function(r){return r.some(function(x){return txt(x)!=='';});});
}
/* =====================================================================
   Excel-Tabelle (.xlsx, auch CSV mit eigenen Spalten): im Browser gelesen –
   ZIP und XML ohne Bibliothek, nichts verlässt den Computer, keine KI.
   Jede Spalte wird einer Angabe zugeordnet (geraten, in der Vorschau
   änderbar); daraus entstehen Datensätze im Format von CDSE Stats, die
   denselben Weg gehen wie dort (abbilden → Abgleich → Vorschau → Import).
   ===================================================================== */
function entpacken(bytes){
  if(typeof DecompressionStream==='undefined'){return Promise.reject(new Error('Dieser Browser kann Excel-Dateien nicht entpacken. Bitte eine aktuelle Version von Edge oder Chrome nutzen – oder die Tabelle in Excel als CSV speichern.'));}
  var st=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(st).arrayBuffer().then(function(b){return new Uint8Array(b);});
}
function zipLesen(buf){
  var v=new DataView(buf.buffer,buf.byteOffset,buf.byteLength), eocd=-1, i, e={}, dec=new TextDecoder('utf-8');
  for(i=buf.length-22;i>=Math.max(0,buf.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0){throw new Error('Das ist keine gültige Excel-Datei (.xlsx).');}
  var n=v.getUint16(eocd+10,true), p=v.getUint32(eocd+16,true);
  for(var k=0;k<n;k++){
    if(p+46>buf.length||v.getUint32(p,true)!==0x02014b50){break;}
    var meth=v.getUint16(p+10,true), csize=v.getUint32(p+20,true), nlen=v.getUint16(p+28,true), elen=v.getUint16(p+30,true), clen=v.getUint16(p+32,true), lok=v.getUint32(p+42,true);
    var name=dec.decode(buf.subarray(p+46,p+46+nlen)), start=lok+30+v.getUint16(lok+26,true)+v.getUint16(lok+28,true);
    e[name]={m:meth,d:buf.subarray(start,start+csize)};
    p+=46+nlen+elen+clen;
  }
  return {text:function(nm){
    var x=e[nm];if(!x){return Promise.resolve(null);}
    var b=x.m===0?Promise.resolve(x.d):(x.m===8?entpacken(x.d):Promise.reject(new Error('Unbekannte Kompression in der Excel-Datei.')));
    return b.then(function(u){return dec.decode(u);});
  }};
}
function xmlLesen(t){return new DOMParser().parseFromString(t,'application/xml');}
function xtags(n,name){return Array.prototype.slice.call(n.getElementsByTagNameNS('*',name));}
function spalteNr(ref){var s=String(ref).replace(/[^A-Z]/gi,'').toUpperCase(), n=0;for(var i=0;i<s.length;i++){n=n*26+(s.charCodeAt(i)-64);}return n-1;}
function spaltenName(i){var s='';i++;while(i>0){var r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;}
var XL_DATUM=[14,15,16,17,22,27,30,36,45,46,47,50,57];
/* → [{name, kopf:[…], zeilen:[[…]], nummern:[…]}] – Zellen mit Datumsformat als {excelDatum:n} */
function xlsxBlaetter(buffer){
  var zip, rel={}, geteilt=[], datumStil={}, d1904=false;
  try{zip=zipLesen(new Uint8Array(buffer));}catch(e){return Promise.reject(e);}
  return zip.text('xl/workbook.xml').then(function(wb){
    if(!wb){throw new Error('Das ist keine gültige Excel-Datei (.xlsx).');}
    return Promise.all([zip.text('xl/_rels/workbook.xml.rels'),zip.text('xl/sharedStrings.xml'),zip.text('xl/styles.xml')]).then(function(r){
      if(r[0]){xtags(xmlLesen(r[0]),'Relationship').forEach(function(x){rel[x.getAttribute('Id')]=x.getAttribute('Target');});}
      if(r[1]){xtags(xmlLesen(r[1]),'si').forEach(function(si){geteilt.push(xtags(si,'t').filter(function(t){return !t.parentNode||t.parentNode.localName!=='rPh';}).map(function(t){return t.textContent;}).join(''));});}
      if(r[2]){
        var st=xmlLesen(r[2]), eigen={};xtags(st,'numFmt').forEach(function(f){eigen[f.getAttribute('numFmtId')]=f.getAttribute('formatCode')||'';});
        var xfs=xtags(st,'cellXfs')[0];
        if(xfs){xtags(xfs,'xf').forEach(function(xf,i){var id=+(xf.getAttribute('numFmtId')||0), c=(eigen[id]||'').replace(/"[^"]*"|\[[^\]]*\]/g,'');if(XL_DATUM.indexOf(id)>=0||(/[dmy]/i.test(c)&&!/^[#0.,%\s]+$/.test(c))){datumStil[i]=1;}});}
      }
      var wdoc=xmlLesen(wb), pr=xtags(wdoc,'workbookPr')[0];d1904=!!(pr&&/^(1|true)$/.test(pr.getAttribute('date1904')||''));
      var bl=xtags(wdoc,'sheet').map(function(s){return {name:s.getAttribute('name')||'Blatt',ziel:rel[s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')]||''};}).filter(function(s){return s.ziel;});
      return Promise.all(bl.map(function(s){return zip.text('xl/'+s.ziel.replace(/^\/?xl\//,'').replace(/^\//,'')).then(function(x){return {name:s.name,xml:x};});}));
    });
  }).then(function(bl){
    var out=[];
    bl.forEach(function(s){
      if(!s.xml){return;}
      var zeilen=[], nummern=[];
      xtags(xmlLesen(s.xml),'row').forEach(function(row){
        var z=[];nummern.push(+row.getAttribute('r')||nummern.length+1);
        xtags(row,'c').forEach(function(c){
          var ref=c.getAttribute('r'), nr=ref?spalteNr(ref):z.length, t=c.getAttribute('t')||'n', vv=xtags(c,'v')[0], v=vv?vv.textContent:'', w;
          if(t==='s'){w=geteilt[+v]||'';}
          else if(t==='inlineStr'){w=xtags(c,'t').map(function(x){return x.textContent;}).join('');}
          else if(t==='b'){w=v==='1'?'ja':'nein';}
          else if(t==='str'||t==='e'){w=v;}
          else if(v!==''&&datumStil[+(c.getAttribute('s')||0)]){w={excelDatum:+v+(d1904?1462:0)};}
          else{w=v;}
          if(nr>=0){z[nr]=w;}
        });
        zeilen.push(z);
      });
      var t=tabelleAus(s.name,zeilen,nummern);if(t){out.push(t);}
    });
    if(!out.length){throw new Error('In der Excel-Datei ist kein Tabellenblatt ausgefüllt.');}
    return out;
  });
}
/* Kopfzeile = erste Zeile mit mindestens zwei Einträgen (Titelzeilen darüber werden übersprungen);
   nummern = Zeilennummern wie in Excel (für Hinweise „Zeile 7: …“) */
function tabelleAus(name,zeilen,nummern){
  var voll=function(x){return x!=null&&zelleText(x)!=='';}, nr=[], l=[];
  zeilen.forEach(function(z,i){if(z.some(voll)){l.push(z);nr.push(nummern?nummern[i]:i+1);}});
  if(!l.length){return null;}
  var k=0;while(k<l.length-1&&l[k].filter(voll).length<2){k++;}
  var breite=0;l.forEach(function(z){if(z.length>breite){breite=z.length;}});
  var auf=function(z){var o=[];for(var i=0;i<breite;i++){o.push(z[i]==null?'':z[i]);}return o;};
  return {name:name,kopf:auf(l[k]).map(zelleText),zeilen:l.slice(k+1).map(auf),nummern:nr.slice(k+1)};
}
function excelIso(n){n=+n;if(!isFinite(n)||n<10000||n>80000){return '';}var d=new Date(Math.round((n-25569)*864e5));return d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate());}
function zelleText(v){if(v&&typeof v==='object'&&v.excelDatum!=null){return excelIso(v.excelDatum);}return txt(v);}
function zelleAnzeige(v){var t=zelleText(v);return (v&&typeof v==='object')?datumDe(t):t;}
/* Tag, der es wirklich gibt (kein 31.02.) */
function ymd(y,mo,d){var Y=+y, M=+mo, D=+d;if(!(M>=1&&M<=12&&D>=1&&D<=31&&Y>=1900&&Y<=2100)){return '';}var t=new Date(Date.UTC(Y,M-1,D));return (t.getUTCMonth()===M-1&&t.getUTCDate()===D)?Y+'-'+pad2(M)+'-'+pad2(D):'';}
function datumAus(v){
  if(v&&typeof v==='object'&&v.excelDatum!=null){return excelIso(v.excelDatum);}
  var s=txt(v), m;if(!s){return '';}
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))){return ymd(m[1],m[2],m[3]);}
  if((m=/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/.exec(s))){return ymd(m[3],m[2],m[1]);}
  if((m=/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2})$/.exec(s))){return ymd(+m[3]<50?2000+ +m[3]:1900+ +m[3],m[2],m[1]);}
  if(/^\d{5}(\.\d+)?$/.test(s)){return excelIso(s);}
  return '';
}
/* Ziele einer Spalte: [Schlüssel (wie CDSE Stats), Bezeichnung, Gruppe, Art, Wörter in Spaltenüberschriften] */
var ZIELE=[
  ['nom','Nachname','Person','text',['nom','nom de famille','name','nachname','familienname','numm','last name','family name','surname']],
  ['prenom','Vorname','Person','text',['prenom','vorname','virnumm','first name','given name']],
  ['nom_prenom','Name und Vorname in einer Spalte','Person','name',['nom et prenom','nom prenom','nom de l eleve','eleve','name vorname','nachname vorname','name des kindes','schuler','schulerin','kind','enfant','full name']],
  ['matricule','Matricule','Person','text',['matricule','numero matricule','n matricule','no matricule','nr matricule','matrikel','matrikelnummer','national id','id national','secu']],
  ['sexe','Geschlecht','Person','geschlecht',['sexe','sex','gender','geschlecht','genre']],
  ['date_naissance','Geburtsdatum','Person','datum',['date de naissance','naissance','ne le','nee le','geburtsdatum','gebuertsdatum','geboren','date of birth','birth date','birthdate','dob']],
  ['lieu_naissance','Geburtsort','Person','text',['lieu de naissance','geburtsort','place of birth']],
  ['nationalite','Nationalität','Person','text',['nationalite','nationalitat','staatsangehorigkeit','nationality']],
  ['langue_1','Erstsprache','Person','text',['langue','premiere langue','langue maternelle','langue parlee','sprache','erstsprache','muttersprache','familiensprache','sprooch','language','first language','mother tongue']],
  ['ecole_lycee','Schule','Schule','text',['ecole','ecole fondamentale','lycee','etablissement','ecole lycee','schule','schoul','school']],
  ['classe','Klasse','Schule','text',['classe','classe actuelle','klasse','class','cycle','niveau']],
  ['dir','Direction régionale','Schule','text',['direction','direction regionale','direction de region','dr','dir','region','direktion','regionaldirektion']],
  ['school_type','Schulform (öffentlich / privat)','Schule','text',['secteur','public prive','ecole publique privee','schulform','school sector']],
  ['previous_school','Vorherige Schule','Schule','text',['ecole precedente','ancienne ecole','vorherige schule','fruhere schule','previous school']],
  ['date_school_change','Schulwechsel am','Schule','datum',['changement d ecole','date changement ecole','schulwechsel','school change']],
  ['scol_etranger','Schulbesuch im Ausland','Schule','janein',['scolarite a l etranger','scolarite etranger','schulbesuch im ausland','ausland','schooling abroad']],
  ['stelle','Stelle im CDSE (für neue Dossiers)','Begleitung und Maßnahmen','text',['stelle','equipe','team','service','antenne','unite']],
  ['created_at','Beginn der Begleitung','Begleitung und Maßnahmen','datum',['date d entree','entree','date entree','debut prise en charge','date de debut','date demande','date de la demande','aufnahme','aufnahmedatum','beginn','beginn der begleitung','anfrage','eingang','date fiche','datum der fiche']],
  ['mesures','Maßnahmen (auch mehrere)','Begleitung und Maßnahmen','massnahmen',['mesure','mesures','mesure cdse','mesures cdse','prise en charge','prises en charge','massnahme','massnahmen','measure','measures']],
  ['date_ds','DS: Datum','Begleitung und Maßnahmen','datum',['date ds','ds date','datum ds','date diagnostic']],
  ['ds_realise_par','DS: Intervenant·e','Begleitung und Maßnahmen','text',['ds realise par','ds par','intervenant ds']],
  ['debut_isa','ISA: Beginn','Begleitung und Maßnahmen','datum',['debut isa','isa debut','isa depuis','isa von','isa beginn','beginn isa','isa start']],
  ['fin_isa','ISA: Ende','Begleitung und Maßnahmen','datum',['fin isa','isa fin','isa bis','isa ende','ende isa','isa end']],
  ['isa_realise_par','ISA: Intervenant·e','Begleitung und Maßnahmen','text',['isa realise par','isa par','intervenant isa']],
  ['cg_type','C&G: für wen (Fachkräfte / Eltern)','Begleitung und Maßnahmen','text',['c&g pour','cg pour','type c&g','type cg','c&g fur','cg fur']],
  ['debut_cg','C&G: Beginn','Begleitung und Maßnahmen','datum',['debut c&g','debut cg','c&g debut','c&g beginn','cg beginn']],
  ['fin_cg','C&G: Ende','Begleitung und Maßnahmen','datum',['fin c&g','fin cg','c&g fin','c&g ende','cg ende']],
  ['cg_realise_par','C&G: Intervenant·e','Begleitung und Maßnahmen','text',['c&g realise par','cg realise par','c&g par','intervenant c&g']],
  ['atelier_type','Atelier: welches','Begleitung und Maßnahmen','text',['atelier','quel atelier','type atelier','type d atelier','welches atelier']],
  ['debut_atelier','Atelier: Beginn','Begleitung und Maßnahmen','datum',['debut atelier','atelier debut','atelier beginn']],
  ['fin_atelier','Atelier: Ende','Begleitung und Maßnahmen','datum',['fin atelier','atelier fin','atelier ende']],
  ['atelier_realise_par','Atelier: Intervenant·e','Begleitung und Maßnahmen','text',['atelier realise par','atelier par','intervenant atelier']],
  ['reeducation_type','Rééducation: welche','Begleitung und Maßnahmen','text',['reeducation','type de reeducation','type reeducation','welche reeducation']],
  ['debut_reeducation','Rééducation: Beginn','Begleitung und Maßnahmen','datum',['debut reeducation','reeducation debut','reeducation beginn']],
  ['fin_reeducation','Rééducation: Ende','Begleitung und Maßnahmen','datum',['fin reeducation','reeducation fin','reeducation ende']],
  ['reeducation_realise_par','Rééducation: Intervenant·e','Begleitung und Maßnahmen','text',['reeducation realise par','reeducation par','intervenant reeducation']],
  ['debut_annexe','Annexe: Beginn','Begleitung und Maßnahmen','datum',['debut annexe','annexe debut','annexe beginn','annexe depuis']],
  ['fin_annexe','Annexe: Ende','Begleitung und Maßnahmen','datum',['fin annexe','annexe fin','annexe ende']],
  ['cst_groupe','CST: Gruppe','Begleitung und Maßnahmen','text',['cst','groupe cst','cst groupe','cst gruppe','gruppe cst']],
  ['debut_cst','CST: Beginn','Begleitung und Maßnahmen','datum',['debut cst','cst debut','cst beginn','cst depuis']],
  ['fin_cst','CST: Ende','Begleitung und Maßnahmen','datum',['fin cst','cst fin','cst ende']],
  ['cdp_region','CdP: Region (Direction)','Begleitung und Maßnahmen','text',['cdp','classe de participation','cdp region','region cdp']],
  ['debut_cdp','CdP: Beginn','Begleitung und Maßnahmen','datum',['debut cdp','cdp debut','cdp beginn']],
  ['fin_cdp','CdP: Ende','Begleitung und Maßnahmen','datum',['fin cdp','cdp fin','cdp ende']],
  ['autre_mesure','Andere Maßnahme (welche)','Begleitung und Maßnahmen','text',['autre mesure','andere massnahme','other measure']],
  ['debut_autre_mesure','Andere Maßnahme: Beginn','Begleitung und Maßnahmen','datum',['debut autre mesure','andere massnahme beginn']],
  ['fin_autre_mesure','Andere Maßnahme: Ende','Begleitung und Maßnahmen','datum',['fin autre mesure','andere massnahme ende']],
  ['date_decision_cni','CNI-Entscheidung (Datum)','Begleitung und Maßnahmen','datum',['cni','decision cni','date cni','date decision cni','cni entscheidung']],
  ['autres_cc','Andere Kompetenzzentren','Familie und Umfeld','liste',['autre cc','autres cc','cc','centre de competences','centres de competences','autre centre de competences','autres centres de competences','kompetenzzentrum','kompetenzzentren','andere kompetenzzentren','other cc']],
  ['autres_services','Weitere Dienste','Familie und Umfeld','liste',['autres services','services','autres intervenants','intervenants','weitere dienste','dienste','other services']],
  ['parents','Elternsituation','Familie und Umfeld','text',['parents','situation parents','situation des parents','situation familiale','eltern','elternsituation','familiensituation']],
  ['scas','SCAS','Familie und Umfeld','janein',['scas']],
  ['tutelle','Sorgerecht','Familie und Umfeld','liste',['tutelle','autorite parentale','garde','sorgerecht','guardianship']],
  ['mesures_famille','Maßnahmen Familie','Familie und Umfeld','liste',['mesures famille','mesures familiales','massnahmen familie','family measures']],
  ['diagnostics','Diagnosen','Klinisches Profil','liste',['diagnostics','diagnose','diagnosen','cim 10','icd 10','icd','diagnosis','diagnoses']],
  ['verdachtsdiagnosen_profil','Verdacht / Profil','Klinisches Profil','liste',['profil','profile','verdacht','verdachtsdiagnose','verdachtsdiagnosen','hypothese','hypotheses']],
  ['iq','IQ','Klinisches Profil','zahl',['qi','qit','iq','quotient intellectuel','gesamt iq']],
  ['eldib_date','ELDiB: Datum','ELDiB','datum',['eldib','date eldib','eldib date','eldib datum']],
  ['eldib_v','ELDiB: Stufe Verhalten (V)','ELDiB','zahl',['eldib v','stufe v','eldib verhalten','eldib comportement','verhalten','comportement']],
  ['eldib_k','ELDiB: Stufe Kommunikation (K)','ELDiB','zahl',['eldib k','stufe k','eldib kommunikation','eldib communication','kommunikation','communication']],
  ['eldib_soz','ELDiB: Stufe Sozialisation (SOZ)','ELDiB','zahl',['eldib soz','stufe soz','eldib sozialisation','eldib socialisation','sozialisation','socialisation']],
  ['eldib_kog','ELDiB: Stufe Kognition (KOG)','ELDiB','zahl',['eldib kog','stufe kog','eldib kognition','eldib cognition','kognition','cognition']],
  ['remarque','Notiz (nur Datenbank)','Sonstiges','text',['remarque','remarques','commentaire','commentaires','bemerkung','bemerkungen','notiz','notizen','kommentar','notes']]
];
function zielVon(k){return ZIELE.filter(function(z){return z[0]===k;})[0]||null;}
function kopfNorm(h){return norm(h).replace(/[^a-z0-9&]+/g,' ').trim();}
/* Zuordnung raten: gleiche Bezeichnung > bekanntes Wort > Wort mit Nummer („Mesure 2“) > Anfang/Ende der Überschrift */
function zuordnungRaten(kopf){
  var belegt={};
  return kopf.map(function(h){
    var n=kopfNorm(h), ohneNr=n.replace(/\s*\d+$/,''), best='', punkte=0;if(!n){return '';}
    ZIELE.forEach(function(z){
      var mehrere=z[3]==='liste'||z[3]==='massnahmen';if(belegt[z[0]]&&!mehrere){return;}
      var p=0;
      if(n===kopfNorm(z[0])||n===kopfNorm(z[1])){p=100;}
      else if(z[4].indexOf(n)>=0){p=90;}
      else if(ohneNr!==n&&z[4].indexOf(ohneNr)>=0){p=mehrere?85:0;}
      else if(z[4].some(function(w){return w.length>3&&(n.indexOf(w+' ')===0||n.slice(-w.length-1)===' '+w);})){p=60;}
      if(p>punkte){punkte=p;best=z[0];}
    });
    if(best){belegt[best]=true;}
    return best;
  });
}
function listeTeilen(t){return eindeutig(String(t||'').split(/\s*[;|\n]\s*|\s*,\s+(?=[A-ZÀ-Ý0-9])/));}
var MASS_WOERTER=[['ds',['ds','diagnostic','diagnostic specialise','diagnostique','diagnostik']],['isa',['isa','intervention specialisee ambulatoire','interventions specialisees ambulatoires']],
  ['c&g',['c&g','cg','c g','conseil et guidance','guidance']],['atelier',['atelier','ateliers','atelier d apprentissage specifique']],['reeducation',['reeducation','reeducations']],
  ['annexe',['annexe','annexe junglinster']],['cst',['cst','centre socio therapeutique']],['cdp',['cdp','classe de participation','classes de participation','clapa']]];
function massWort(t){
  var n=kopfNorm(t), i;if(!n){return '';}
  for(i=0;i<MASS_WOERTER.length;i++){if(MASS_WOERTER[i][1].indexOf(n)>=0){return MASS_WOERTER[i][0];}}
  for(i=0;i<MASS_WOERTER.length;i++){if(MASS_WOERTER[i][1].some(function(w){return w.length>1&&(n.indexOf(w+' ')===0);})){return MASS_WOERTER[i][0];}}
  return '';
}
function geschlechtAus(t){var n=kopfNorm(t);if(/^(m|h|j|masculin|garcon|homme|male|boy|junge|jong|mannlich|maennlich)$/.test(n)){return 'M';}if(/^(f|w|feminin|fille|femme|female|girl|madchen|maedchen|meedchen|weiblich)$/.test(n)){return 'F';}return '';}
function jaNeinWort(t){var n=kopfNorm(t);if(/^(yes|y|oui|o|ja|j|x|1|vrai|true)$/.test(n)){return 'Yes';}if(/^(no|n|non|nein|0|faux|false)$/.test(n)){return 'No';}return '';}
function nameTeilen(t){
  t=txt(t);if(!t){return null;}
  if(t.indexOf(',')>0){var p=t.split(',');return {nach:txt(p[0]),vor:txt(p.slice(1).join(','))};}
  var w=t.split(/\s+/), gross=w.filter(function(x){return x.length>1&&x===x.toUpperCase()&&x!==x.toLowerCase();});
  if(gross.length&&gross.length<w.length){return {nach:gross.join(' '),vor:w.filter(function(x){return gross.indexOf(x)<0;}).join(' ')};}
  return w.length===1?{nach:w[0],vor:''}:{nach:w[0],vor:w.slice(1).join(' ')};
}
/* Zeilen der Tabelle → Datensätze im Format von CDSE Stats (+ Klasse, Nationalität, Stelle, Notiz, Maßnahmen als Liste) */
function tabelleZuRoh(b,map){
  var roh=[], probleme=[];
  b.zeilen.forEach(function(z,zi){
    var s={}, da=false, nr=(b.nummern&&b.nummern[zi])||zi+2, name='';
    map.forEach(function(ziel,sp){
      var zd=ziel&&zielVon(ziel);if(!zd){return;}
      var v=z[sp], t=zelleText(v);if(t===''){return;}
      da=true;
      if(zd[3]==='datum'){var dt=datumAus(v);if(dt){s[ziel]=dt;}else{probleme.push('Zeile '+nr+': „'+t+'“ ist kein Datum ('+zd[1]+')');}}
      else if(zd[3]==='zahl'){var n=zahl(t);if(n!=null){s[ziel]=n;}else{probleme.push('Zeile '+nr+': „'+t+'“ ist keine Zahl ('+zd[1]+')');}}
      else if(zd[3]==='liste'){s[ziel]=eindeutig((s[ziel]||[]).concat(listeTeilen(t)));}
      else if(zd[3]==='massnahmen'){
        listeTeilen(t).forEach(function(p){
          var mw=massWort(p);
          if(!mw){s.autre_mesure=s.autre_mesure?s.autre_mesure+'; '+p:p;return;}
          s.mesures=eindeutig((s.mesures||[]).concat([mw]));
          if(mw==='c&g'){var pn=norm(p);if(/parent|eltern|famil/.test(pn)){s.cg_type=s.cg_type&&s.cg_type!=='Parents'?'Both':'Parents';}else if(/prof|fachkr|enseign|equipe|ecole|schule/.test(pn)){s.cg_type=s.cg_type&&s.cg_type!=='Professionals'?'Both':'Professionals';}}
        });
      }
      else if(zd[3]==='geschlecht'){s.sexe=geschlechtAus(t)||t;}
      else if(zd[3]==='janein'){s[ziel]=jaNeinWort(t)||t;}
      else if(zd[3]==='name'){name=t;}
      else if(ziel==='nom'||ziel==='prenom'){s[ziel]=t;}
      else{s[ziel]=s[ziel]?s[ziel]+'; '+t:t;}
    });
    if(name){var nt=nameTeilen(name);if(!s.nom){s.nom=nt.nach;}if(!s.prenom){s.prenom=nt.vor;}}
    if(da){s.__zeile=nr;roh.push(s);}
  });
  return {roh:roh,probleme:probleme};
}
function importLesen(datei){
  if(/\.xls$/i.test(datei.name)){return Promise.reject(new Error('Alte Excel-Dateien (.xls) lassen sich nicht lesen. In Excel: Datei → Speichern unter → „Excel-Arbeitsmappe (.xlsx)“ und diese Datei wählen.'));}
  if(/\.xls[xm]$/i.test(datei.name)){
    return datei.arrayBuffer().then(xlsxBlaetter).then(function(bl){return {art:'Excel-Tabelle',tabelle:{blaetter:bl,blatt:0,map:null,probleme:[]},roh:[],unbekannt:[]};});
  }
  return datei.text().then(function(t){
    t=t.replace(/^\uFEFF/,'');
    if(/\.json$/i.test(datei.name)||/^\s*[\[{]/.test(t)){
      var j;try{j=JSON.parse(t);}catch(e){throw new Error('Die Datei ist kein gültiges JSON.');}
      var l, art;
      if(Array.isArray(j)){l=j;art='JSON-Export';}
      else if(j&&Array.isArray(j.cases)){l=j.cases;art='Sync-Datei (cdse.json)';}
      else if(j&&j.format==='cdse-hub-datenbank'){throw new Error('Das ist ein Export dieser Datenbank. Er muss nicht importiert werden – die Daten stehen schon in den Dossiers.');}
      else{throw new Error('Unbekanntes Format. Erwartet wird der JSON-Export von CDSE Stats (eine Liste von Fällen) oder die Sync-Datei cdse.json.');}
      return {art:art,roh:l.filter(function(x){return x&&typeof x==='object'&&!Array.isArray(x);}),unbekannt:[]};
    }
    var z=csvLesen(t);if(z.length<2){throw new Error('Die CSV-Datei enthält keine Datensätze.');}
    var map=z[0].map(statsSchluessel), unbekannt=z[0].filter(function(h,i){return txt(h)&&!map[i];});
    /* Keine Spalten von CDSE Stats: wie eine Excel-Tabelle mit eigener Zuordnung behandeln */
    if(map.indexOf('nom')<0&&map.indexOf('prenom')<0){var tb=tabelleAus(datei.name,z);if(!tb||!tb.zeilen.length){throw new Error('Die CSV-Datei enthält keine Datensätze.');}return {art:'CSV-Tabelle',tabelle:{blaetter:[tb],blatt:0,map:null,probleme:[]},roh:[],unbekannt:[]};}
    return {art:'CSV',unbekannt:unbekannt,roh:z.slice(1).map(function(r){var o={};map.forEach(function(k,i){if(!k){return;}var v=txt(r[i]);o[k]=STATS_LISTEN.indexOf(k)>=0?(v?v.split(/\s*[;|]\s*/).filter(Boolean):[]):v;});return o;})};
  });
}
/* Tabelle (Excel/CSV): Zuordnung raten oder übernehmen, Datensätze bilden, neue Directions vorbelegen */
function tabelleVorbereiten(){
  var tb=imp.tabelle, b=tb.blaetter[tb.blatt]||tb.blaetter[0];
  if(!tb.map||tb.map.length!==b.kopf.length){tb.map=zuordnungRaten(b.kopf);}
  var r=tabelleZuRoh(b,tb.map);imp.roh=r.roh;tb.probleme=r.probleme;
  eindeutig(imp.roh.map(function(s){return txt(s.dir);})).forEach(function(a){if(!(a in imp.einst.dr)){imp.einst.dr[a]=drImport(a);}});
}
/* Leere Vorlage (CSV für Excel) mit den Spaltenüberschriften, die der Import sicher erkennt */
function importVorlage(){
  var kopf=['nom','prenom','matricule','sexe','date_naissance','nationalite','langue_1','ecole_lycee','classe','dir','stelle','created_at','mesures','debut_isa','fin_isa','atelier_type','debut_atelier','fin_atelier',
    'reeducation_type','debut_reeducation','fin_reeducation','cst_groupe','debut_cst','fin_cst','cdp_region','debut_cdp','fin_cdp','debut_annexe','fin_annexe','cg_type','debut_cg','fin_cg','date_decision_cni',
    'autres_cc','autres_services','parents','scas','tutelle','diagnostics','verdachtsdiagnosen_profil','iq','eldib_date','eldib_v','eldib_k','eldib_soz','eldib_kog','remarque'].map(function(k){return zielVon(k)[1];});
  herunterladen('cdse-import-vorlage.csv',new Blob(['﻿'+kopf.map(csvZelle).join(';')+'\r\n'],{type:'text/csv;charset=utf-8'}));
  H.toast('Vorlage heruntergeladen – in Excel ausfüllen, als .xlsx speichern und hier wählen');
}
function drImport(alt){var n=norm(alt);if(DR_ALT[n]){return DR_ALT[n];}if(DR_UNKLAR.indexOf(n)>=0){return '';}var d=drAus(alt);return DR.indexOf(d)>=0?d:'';}
function tutelleDe(x){
  var n=norm(x);
  if(n==='mother'||n==='mere'){return ['Mutter'];}if(n==='father'||n==='pere'){return ['Vater'];}
  if(n==='both parents'||n==='les deux parents'||n==='beide eltern'){return ['Mutter','Vater'];}
  if(n==='foster family'||n.indexOf('famille d')===0){return ['Pflegefamilie'];}
  if(n==='legal guardian'||n==='tuteur'||n==='tutrice'){return ['Vormund'];}
  if(/^one\b/.test(n)){return ['ONE'];}if(n==='other'||n==='autre'){return ['andere'];}
  return [txt(x)];
}
function abbilden(s,e){
  var w=[], person={}, fiche={}, db={}, cdse={};
  function t(k){return txt(s[k]);}
  if(t('nom')){person.nachname=t('nom');}if(t('prenom')){person.vorname=t('prenom');}
  if(t('matricule')){person.matricule=t('matricule');}
  var sx=norm(s.sexe);if(sx==='m'){person.geschlecht='m';}else if(sx==='f'||sx==='w'){person.geschlecht='w';}else if(sx){w.push('Geschlecht „'+t('sexe')+'“ nicht übernommen');}
  var geb=iso(s.date_naissance);if(geb){person.geburtsdatum=geb;}else if(t('date_naissance')){w.push('Geburtsdatum unlesbar');}
  if(t('ecole_lycee')){person.schule=t('ecole_lycee');fiche.schule={name:t('ecole_lycee')};}
  /* aus einer Excel-Tabelle zusätzlich: Klasse, Nationalität, Geburtsort */
  if(t('classe')){person.klasse=t('classe');fiche.schule=Object.assign(fiche.schule||{},{klasse:t('classe')});}
  if(t('nationalite')){fiche.nationalitaet=t('nationalite');}
  if(t('lieu_naissance')){fiche.geburtsort=t('lieu_naissance');}
  if(t('dossier_mfile')){fiche.mfiles=t('dossier_mfile');}
  if(t('dir')){var dr=e.dr[t('dir')];if(dr){fiche.ef={dr:dr};}else{w.push('Direction „'+t('dir')+'“ nicht zugeordnet');}}
  if(t('langue_1')){fiche.ersteSprache=(norm(s.langue_1)==='other'&&t('langue_1_autre'))?t('langue_1_autre'):(SPRACHE_STATS[t('langue_1').toUpperCase()]||t('langue_1'));}
  var mass=[s.mesure_cdse_1,s.mesure_cdse_2,s.mesure_cdse_3].concat(liste(s.mesures)).map(norm).filter(Boolean);
  function mn(key,von,bis,wer){var o={aktiv:true};if(iso(von)){o.von=iso(von);}if(iso(bis)){o.bis=iso(bis);}if(txt(wer)){o.name=txt(wer);}cdse[key]=o;return o;}
  /* Der DS ist in CDSE Stats ein Termin (date_ds): Beginn und Ende an diesem Tag */
  if(mass.indexOf('ds')>=0||iso(s.date_ds)||t('ds_realise_par')){mn('diagnostic',s.date_ds,s.date_ds,s.ds_realise_par);}
  if(mass.indexOf('isa')>=0||iso(s.debut_isa)||t('isa_realise_par')){mn('isa',s.debut_isa,s.fin_isa,s.isa_realise_par);}
  if(mass.indexOf('c&g')>=0||iso(s.debut_cg)||t('cg_realise_par')){
    /* ab 0.5 sagt cg_type, für wen; sonst gilt die Wahl in der Vorschau */
    var cgt=norm(s.cg_type), cgK=cgt==='parents'?['cgEltern']:(cgt==='professionals'?['cgPro']:(cgt?['cgPro','cgEltern']:[e.cg==='cgEltern'?'cgEltern':'cgPro']));
    cgK.forEach(function(k){mn(k,s.debut_cg,s.fin_cg,s.cg_realise_par);});
  }
  /* ab 0.5: Atelier, Rééducation, Annexe, CST und CdP als eigene Maßnahmen (Standort = welches Atelier / welche Gruppe / Region) */
  if(mass.indexOf('atelier')>=0||iso(s.debut_atelier)||t('atelier_realise_par')||t('atelier_type')){var ma=mn('atelier',s.debut_atelier,s.fin_atelier,s.atelier_realise_par);if(t('atelier_type')){ma.standort=t('atelier_type');}}
  if(mass.indexOf('reeducation')>=0||iso(s.debut_reeducation)||t('reeducation_realise_par')||t('reeducation_type')){var mr=mn('reeducation',s.debut_reeducation,s.fin_reeducation,s.reeducation_realise_par);if(t('reeducation_type')){mr.standort=t('reeducation_type');}}
  if(mass.indexOf('annexe')>=0||iso(s.debut_annexe)||iso(s.fin_annexe)){mn('annexe',s.debut_annexe,s.fin_annexe,'');}
  if(mass.indexOf('cst')>=0||iso(s.debut_cst)||iso(s.fin_cst)||t('cst_groupe')){var mc=mn('cst',s.debut_cst,s.fin_cst,'');if(t('cst_groupe')){mc.standort=t('cst_groupe');}}
  if(mass.indexOf('cdp')>=0||iso(s.debut_cdp)||iso(s.fin_cdp)||t('cdp_region')){var mp=mn('cdp',s.debut_cdp,s.fin_cdp,'');var rg=drAus(t('cdp_region'));if(rg&&DR.indexOf(rg)>=0){mp.standort=rg;}}
  var spec=norm(s.spec_school), inst=t('scolarisation_specialisee');
  var sk=/annexe|junglinster/.test(spec)?'annexe':(/\bcst\b|socio/.test(spec)?'cst':(/participation|cdp/.test(spec)?'cdp':''));
  if(sk&&!cdse[sk]){var sm=mn(sk,s.debut_scol_spe,s.fin_scol_spe,'');if(inst&&sk!=='annexe'){sm.standort=inst;}}
  else if(!sk&&(inst||mass.indexOf('spec. school.')>=0||iso(s.debut_scol_spe))){cdse.sonstige=[{aktiv:true,label:'Scolarisation spécialisée'+(inst?' – '+inst:''),von:iso(s.debut_scol_spe),bis:iso(s.fin_scol_spe)}];}
  if(Object.keys(cdse).length){fiche.cdse=cdse;}
  var dienste=liste(s.autres_services);if(dienste.length){fiche.intervenants=dienste.map(function(x){return {institution:x};});}
  var st=norm(s.school_type);if(/^(public|publique|offentlich|oeffentlich|staatlich)/.test(st)){db.schulform='public';}else if(/^priv/.test(st)){db.schulform='prive';}
  if(t('previous_school')){db.vorherigeSchule=t('previous_school');}
  if(iso(s.date_school_change)){db.schulwechsel=iso(s.date_school_change);}
  if(iso(s.date_decision_cni)){db.cni=iso(s.date_decision_cni);}
  /* andere Kompetenzzentren als Kürzel („CL; CDI“), Unbekanntes bleibt als Text */
  var cc=ccListe(liste(s.autres_cc));if(cc.length){db.autreCc=cc.join('; ');}else if(t('autre_cc_implique')){db.autreCc=t('autre_cc_implique');}
  if(t('autre_mesure')||iso(s.debut_autre_mesure)){db.autreMesure={name:t('autre_mesure')||'andere Maßnahme',von:iso(s.debut_autre_mesure),bis:iso(s.fin_autre_mesure)};}
  else if(mass.indexOf('other')>=0){db.autreMesure={name:'andere Maßnahme',von:'',bis:''};}
  var se=jaNein(norm(s.scol_etranger)==='yes'?'ja':s.scol_etranger);if(se){db.scolEtranger=se;}
  var dg2=liste(s.diagnostics);if(dg2.length){db.diagnosen=dg2;}
  var vd=liste(s.verdachtsdiagnosen_profil);if(vd.length){db.verdacht=vd;}
  var iq=zahl(s.iq);if(iq!=null){if(iq>=40&&iq<=160){db.iq=Math.round(iq);}else{w.push('IQ '+iq+' liegt außerhalb 40–160 und wird nicht übernommen');}}
  var pa=norm(s.parents);if(/together|ensemble|zusammen|zesummen|maries|married|verheiratet/.test(pa)){db.eltern='zusammen';}else if(/separ|divorc|getrennt|geschieden/.test(pa)){db.eltern='getrennt';}else if(pa){db.eltern='anderes';}
  var sc=jaNein(norm(s.scas)==='yes'?'ja':s.scas);if(sc){db.scas=sc;}
  var tu=[];liste(s.tutelle).forEach(function(x){tutelleDe(x).forEach(function(y){if(tu.indexOf(y)<0){tu.push(y);}});});if(tu.length){db.tutelle=tu;}
  var mf=liste(s.mesures_famille).map(function(x){return norm(x)==='other'?'andere':x;});if(mf.length){db.massnahmenFamilie=mf;}
  /* ELDiB-Stufen (CDSE Stats ab 0.5 oder Excel) – gelten nur, solange im Dossier keine ELDiB-Einschätzung ist */
  var el=dbWert('eldibStufen',{datum:s.eldib_date,verhalten:s.eldib_v,kommunikation:s.eldib_k,sozialisation:s.eldib_soz,kognition:s.eldib_kog});if(el){db.eldibStufen=el;}
  else if(['eldib_v','eldib_k','eldib_soz','eldib_kog'].some(function(k){return t(k);})){w.push('ELDiB-Stufen außerhalb 0–5 nicht übernommen');}
  if(t('remarque')){db.notiz=t('remarque');}
  db.herkunft={quelle:e.quelle||'CDSE Stats',id:t('id'),angelegt:iso(s.created_at),geaendert:iso(s.updated_at),importiert:heute()};
  var sa=stelleAusText(t('stelle'));
  return {person:person,fiche:fiche,db:db,warnungen:w,stelle:sa};
}
/* Stelle aus einer Angabe wie „ISA“, „Annexe“, „CLAPA“, „Diagnostique“ (Spalte „Stelle“ einer Excel-Tabelle) */
function stelleAusText(v){
  var n=norm(v);if(!n){return '';}
  var t=teams().filter(function(x){return norm(x.name)===n||x.id===n;})[0];if(t){return t.id;}
  if(/annexe|junglinster/.test(n)){return 'annexe';}if(/\bcst\b|socio/.test(n)){return 'cst';}
  if(/\bcp\b|\bcdp\b|clapa|participation/.test(n)){return 'cp';}if(/\bisa\b|ambulatoire/.test(n)){return 'isa';}if(/diagnos/.test(n)){return 'diagnostique';}
  return '';
}
function matNorm(m){return txt(m).replace(/\D/g,'');}
function abgleich(m){
  var p=m.person, mat=matNorm(p.matricule), hid=m.db.herkunft&&m.db.herkunft.id, x=null;
  if(hid){x=zust.daten.filter(function(y){var h=(y.d.db||{}).herkunft;return h&&h.id&&h.id===hid;})[0];if(x){return {x:x,art:'schon aus '+(/Tabelle/.test((x.d.db.herkunft||{}).quelle||'')?'dieser Tabelle':'CDSE Stats')+' übernommen'};}}
  if(mat.length>=8){x=zust.daten.filter(function(y){return matNorm((y.d.person||{}).matricule)===mat;})[0];if(x){return {x:x,art:'gleiche Matricule'};}}
  var nn=norm(p.nachname)+'|'+norm(p.vorname), gb=p.geburtsdatum||'';
  var kand=zust.daten.filter(function(y){var q=y.d.person||{};return norm(q.nachname)+'|'+norm(q.vorname)===nn;});
  if(gb){
    var passend=kand.filter(function(y){var q=y.d.person||{}, m2=matNorm(q.matricule);return iso(q.geburtsdatum)===gb&&(!mat||!m2||m2===mat);})[0];
    if(passend){return {x:passend,art:'gleicher Name und Geburtsdatum'};}
    if(kand.some(function(y){return iso((y.d.person||{}).geburtsdatum)===gb;})){return {x:null,art:'',hinweis:'gleicher Name und Geburtsdatum, aber andere Matricule'};}
  }
  /* weder Geburtsdatum noch Matricule: nur dann dasselbe Dossier, wenn es genau eines mit diesem Namen und ebenfalls ohne beides gibt */
  else if(!mat){var ohne=kand.filter(function(y){var q=y.d.person||{};return !iso(q.geburtsdatum)&&!matNorm(q.matricule);});if(ohne.length===1){return {x:ohne[0],art:'gleicher Name, beide ohne Geburtsdatum und Matricule'};}}
  return {x:null,art:'',hinweis:kand.length?'gleicher Name, Geburtsdatum fehlt oder weicht ab':''};
}
function stelleFuerImport(m){
  var id=imp.einst.stelle;
  if(id==='auto'&&m.stelle){id=m.stelle;}   /* Spalte „Stelle“ der Tabelle */
  if(id==='auto'){var c=m.fiche.cdse||{};id=c.cst?'cst':(c.cdp?'cp':(c.annexe?'annexe':((c.isa&&!(c.isa.bis&&c.isa.bis<heute()))?'isa':'diagnostique')));}
  return teams().some(function(t){return t.id===id;})?id:((teams()[0]||{}).id||'diagnostique');
}
var PERSON_NAMEN={nachname:'Nachname',vorname:'Vorname',matricule:'Matricule',geschlecht:'Geschlecht',geburtsdatum:'Geburtsdatum',schule:'Schule',klasse:'Klasse'};
/* „Vorhandene ergänzen“: nur leere Felder füllen – Fiche-Abschnitte werden vollständig weitergegeben */
function ergaenzung(d,m){
  var o={anzahl:0,person:null,fiche:null,db:null,felder:[]}, p=d.person||{}, f=d.fiche||{}, mf=m.fiche;
  function nf(){return o.fiche||(o.fiche={});}
  Object.keys(m.person).forEach(function(k){if(!txt(p[k])&&txt(m.person[k])){(o.person=o.person||{})[k]=m.person[k];o.felder.push(PERSON_NAMEN[k]||k);o.anzahl++;}});
  if(mf.mfiles&&!txt(f.mfiles)){nf().mfiles=mf.mfiles;o.felder.push('Dossier M-Files');o.anzahl++;}
  if(mf.ersteSprache&&!txt(f.ersteSprache)){nf().ersteSprache=mf.ersteSprache;o.felder.push('Erstsprache');o.anzahl++;}
  if(mf.schule&&mf.schule.name&&!txt((f.schule||{}).name)){nf().schule=Object.assign({},f.schule||{},{name:mf.schule.name});o.felder.push('Schule (Fiche)');o.anzahl++;}
  if(mf.schule&&mf.schule.klasse&&!txt((f.schule||{}).klasse)){nf().schule=Object.assign({},f.schule||{},nf().schule||{},{klasse:mf.schule.klasse});o.felder.push('Klasse (Fiche)');o.anzahl++;}
  if(mf.nationalitaet&&!txt(f.nationalitaet)){nf().nationalitaet=mf.nationalitaet;o.felder.push('Nationalität');o.anzahl++;}
  if(mf.geburtsort&&!txt(f.geburtsort)){nf().geburtsort=mf.geburtsort;o.felder.push('Geburtsort');o.anzahl++;}
  if(mf.ef&&mf.ef.dr&&!txt((f.ef||{}).dr)){nf().ef=Object.assign({},f.ef||{},{dr:mf.ef.dr});o.felder.push('Direction régionale');o.anzahl++;}
  if(mf.cdse){
    var c=kopie(f.cdse||{}), neu=false;
    Object.keys(mf.cdse).forEach(function(k){
      if(k==='sonstige'){var vorh=(c.sonstige||[]).map(function(s){return norm(s&&s.label);});mf.cdse.sonstige.forEach(function(s){if(vorh.indexOf(norm(s.label))<0){c.sonstige=(c.sonstige||[]).concat([s]);neu=true;o.felder.push(s.label);}});return;}
      var alt=c[k], mk=MASSNAHMEN.filter(function(x){return x.key===k;})[0], name=mk?mk.kurz:k;
      if(!alt||leerTief(alt)){c[k]=mf.cdse[k];neu=true;o.felder.push(name);return;}
      if(alt.aktiv!==true){return;}   /* in der Fiche nicht angekreuzt: nichts dazuschreiben */
      ['von','bis','name','standort'].forEach(function(s){if(mf.cdse[k][s]&&!txt(alt[s])){alt[s]=mf.cdse[k][s];neu=true;o.felder.push(name+' '+({von:'Beginn',bis:'Ende',name:'Intervenant·e',standort:'Standort'}[s]));}});
    });
    if(neu){nf().cdse=c;o.anzahl++;}
  }
  if(mf.intervenants){
    var il=(f.intervenants||[]).slice(), da=il.map(function(i){return norm(i&&i.institution);}), dazu=0;
    mf.intervenants.forEach(function(i){if(da.indexOf(norm(i.institution))<0){il.push(i);dazu++;}});
    if(dazu){nf().intervenants=il;o.felder.push('weitere Dienste');o.anzahl++;}
  }
  var db=d.db||{};
  Object.keys(m.db).forEach(function(k){if(k==='herkunft'){return;}if(leerTief(dbWert(k,db[k]))&&!leerTief(dbWert(k,m.db[k]))){(o.db=o.db||{})[k]=m.db[k];o.felder.push(DB_NAMEN[k]||k);o.anzahl++;}});
  if(o.anzahl&&!db.herkunft){(o.db=o.db||{}).herkunft=m.db.herkunft;}
  return o;
}
/* Woher kommt der Import? „CDSE Stats“ oder „Excel-Tabelle“ / „CSV-Tabelle“ (für Protokoll und Herkunft) */
function quelleName(){return imp&&imp.tabelle?imp.art:'CDSE Stats';}
function importStarten(datei){
  imp={datei:datei.name,art:'',roh:[],unbekannt:[],tabelle:null,einst:{modus:'neu',stelle:'auto',cg:'cgPro',dr:{}},vorschau:null,laeuft:false,ergebnis:null,fehler:''};
  importSeite();
  importLesen(datei).then(function(r){
    imp.art=r.art;imp.roh=r.roh;imp.unbekannt=r.unbekannt;
    if(r.tabelle){imp.tabelle=r.tabelle;imp.einst.quelle=r.art+' ('+datei.name+')';tabelleVorbereiten();}
    else{
      if(!r.roh.length){throw new Error('In der Datei stehen keine Fälle.');}
      eindeutig(r.roh.map(function(s){return txt(s.dir);})).forEach(function(a){imp.einst.dr[a]=drImport(a);});
    }
    return T.alleDossiers(true).then(function(l){zust.daten=l.map(function(d){return {d:d,r:datensatz(d)};});});
  }).then(function(){vorschauBerechnen();importSeite();},function(e){imp.fehler=fehlerText(e);importSeite();});
}
function vorschauBerechnen(){
  var gesehen={};
  imp.vorschau=imp.roh.map(function(s,i){
    var m=abbilden(s,imp.einst), p=m.person, z={i:i,m:m,status:'',grund:'',x:null,stelle:'',erg:null,zeile:s.__zeile||0};
    if(!p.nachname&&!p.vorname){z.status='aus';z.grund='ohne Namen – wird nicht übernommen';return z;}
    var sch=matNorm(p.matricule).length>=8?'m'+matNorm(p.matricule):'n'+norm(p.nachname)+'|'+norm(p.vorname)+'|'+(p.geburtsdatum||'');
    if(gesehen[sch]!=null){z.status='aus';z.grund='doppelt in der Datei (wie Zeile '+(imp.roh[gesehen[sch]].__zeile||gesehen[sch]+1)+')';return z;}
    gesehen[sch]=i;
    var ab=abgleich(m);
    if(ab.x){z.status='vorhanden';z.x=ab.x;z.grund=ab.art;if(imp.einst.modus==='ergaenzen'){z.erg=ergaenzung(ab.x.d,m);}}
    else{z.status='neu';z.grund=ab.hinweis||'';z.stelle=stelleFuerImport(m);}
    return z;
  });
}
function zuordnungTabelle(){
  return '<div class="db-tabrahmen"><table class="db-tab db-zuotab"><thead><tr><th scope="col">CDSE Stats</th><th scope="col">Dossier im Hub</th><th scope="col">Hinweis</th></tr></thead><tbody>'+
    ZUORDNUNG.map(function(z){return '<tr><td data-label="CDSE Stats"><code>'+esc(z[0])+'</code></td><td data-label="Dossier">'+esc(z[1])+'</td><td data-label="Hinweis"'+(z[2]?'':' class="leer"')+'>'+esc(z[2]||'—')+'</td></tr>';}).join('')+'</tbody></table></div>';
}
function importSeite(){
  var h=H.karte('<h2>Daten übernehmen: Excel-Tabelle oder CDSE Stats</h2><p>Übernimmt Schüler in die Dossiers – aus einer <b>Excel-Tabelle</b> (.xlsx oder .csv, eine Zeile je Schüler) oder aus der bisherigen App „CDSE Stats“ (JSON-Export, Sync-Datei <code>cdse.json</code>, CSV-Export). Bei einer Tabelle schlägt der Hub vor, welche Spalte wohin gehört; das lässt sich in der Vorschau ändern. Vorher zeigt die Vorschau, was neu angelegt wird und was es schon gibt – abgeglichen über die Matricule, sonst über Name und Geburtsdatum.</p>'+
    '<p class="ar-klein">Die Datei wird nur hier im Browser gelesen – nichts wird hochgeladen, keine KI.</p>'+
    '<div class="ar-knopfreihe"><label class="btn primary db-dateiwahl">'+svg('hoch')+'Datei wählen …<input type="file" id="db-datei" accept=".xlsx,.xlsm,.csv,.json,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Excel-Tabelle oder Datei aus CDSE Stats wählen"'+(imp&&imp.laeuft?' disabled':'')+'></label>'+
      '<button class="btn" type="button" data-db="import-vorlage" data-fokus="import-vorlage">'+svg('runter')+'Leere Excel-Vorlage</button>'+
      (imp&&!imp.laeuft&&(imp.vorschau||imp.fehler||imp.ergebnis)?'<button class="btn" type="button" data-db="import-weg" data-fokus="import-weg">'+svg('x')+'Verwerfen</button>':'')+'</div>'+
    '<details class="db-zuordnung"><summary>Welche Angabe aus CDSE Stats landet wo im Dossier?</summary>'+zuordnungTabelle()+'</details>');
  if(imp&&imp.fehler){h+=H.hinweis(esc(imp.fehler));}
  else if(imp&&imp.ergebnis){h+=importErgebnisHtml();}
  else if(imp&&imp.vorschau){h+=vorschauHtml();}
  else if(imp){h+=H.laedt('Lese '+imp.datei+' …');}
  inhalt(h);
}
/* Excel/CSV-Tabelle: welche Spalte wird welche Angabe? (Vorschlag, änderbar) */
function zielSelect(i,wert){
  var gruppen=[];ZIELE.forEach(function(z){if(gruppen.indexOf(z[2])<0){gruppen.push(z[2]);}});
  return '<select data-db-imp="spalte" data-sp="'+i+'" data-fokus="imp-sp-'+i+'" aria-label="Angabe im Dossier für Spalte '+spaltenName(i)+'"><option value="">– nicht übernehmen –</option>'+
    gruppen.map(function(g){return '<optgroup label="'+esc(g)+'">'+ZIELE.filter(function(z){return z[2]===g;}).map(function(z){return '<option value="'+z[0]+'"'+(z[0]===wert?' selected':'')+'>'+esc(z[1])+'</option>';}).join('')+'</optgroup>';}).join('')+'</select>';
}
function spaltenHtml(){
  var tb=imp.tabelle, b=tb.blaetter[tb.blatt]||tb.blaetter[0], map=tb.map||[];
  var namen=map.some(function(k){return k==='nom'||k==='prenom'||k==='nom_prenom';}), n=map.filter(Boolean).length;
  return '<h3>Spalten zuordnen</h3><p class="ar-klein">Der Vorschlag ist geraten – bitte prüfen. <b>'+n+' von '+b.kopf.length+'</b> Spalten werden übernommen; „nicht übernehmen“ lässt eine Spalte weg. Mehrere Maßnahmen, Diagnosen oder Kompetenzzentren in einer Zelle mit „;“ trennen.</p>'+
    (tb.blaetter.length>1?'<label class="ar-feld db-blattwahl"><span>Tabellenblatt</span><select data-db-imp="blatt" data-fokus="imp-blatt">'+tb.blaetter.map(function(x,i){return '<option value="'+i+'"'+(i===tb.blatt?' selected':'')+'>'+esc(x.name)+' ('+x.zeilen.length+(x.zeilen.length===1?' Zeile':' Zeilen')+')</option>';}).join('')+'</select></label>':'')+
    (namen?'':H.hinweis('Bitte die Spalten für <b>Nachname</b> und <b>Vorname</b> zuordnen (oder „Name und Vorname in einer Spalte“) – ohne Namen wird nichts übernommen.'))+
    '<div class="db-tabrahmen"><table class="db-tab db-spzutab"><thead><tr><th scope="col">Spalte</th><th scope="col">Beispiele aus der Tabelle</th><th scope="col">Angabe im Dossier</th></tr></thead><tbody>'+
    b.kopf.map(function(k,i){
      var bsp=[];b.zeilen.some(function(z){var t=zelleAnzeige(z[i]);if(t&&bsp.indexOf(t)<0){bsp.push(t);}return bsp.length>=3;});
      return '<tr'+(map[i]?'':' class="db-sp-aus"')+'><td data-label="Spalte"><b>'+esc(k||'(ohne Überschrift)')+'</b><small>Spalte '+spaltenName(i)+'</small></td><td data-label="Beispiele"'+(bsp.length?'':' class="leer"')+'>'+esc(bsp.map(function(x){return kuerzen(x,40);}).join(' · ')||'—')+'</td><td data-label="Angabe im Dossier">'+zielSelect(i,map[i])+'</td></tr>';
    }).join('')+'</tbody></table></div>'+
    (tb.probleme.length?H.hinweis('Nicht lesbar und deshalb leer gelassen: '+esc(tb.probleme.slice(0,6).join(' · '))+(tb.probleme.length>6?' … (insgesamt '+tb.probleme.length+')':''),'info'):'');
}
function radioHtml(name,wert,titel,text,akt){return '<label class="ar-haken db-radio"><input type="radio" name="imp-'+name+'" value="'+wert+'" data-db-imp="'+name+'"'+(akt===wert?' checked':'')+'><span><b>'+esc(titel)+'</b><small>'+esc(text)+'</small></span></label>';}
function vorschauHtml(){
  var v=imp.vorschau, e=imp.einst, n={neu:0,vorhanden:0,aus:0}, ergz=0;
  v.forEach(function(z){n[z.status]++;if(z.erg&&z.erg.anzahl){ergz++;}});
  var altDr=eindeutig(imp.roh.map(function(s){return txt(s.dir);})), warn=[];
  v.forEach(function(z){z.m.warnungen.forEach(function(w){if(warn.indexOf(w)<0){warn.push(w);}});});
  var h='<section class="ar-karte db-vorschau"><div class="ar-kartenkopf"><h2>Vorschau</h2><span class="ar-leise">'+esc(imp.datei)+' · '+esc(imp.art)+' · '+v.length+(v.length===1?' Datensatz':' Datensätze')+'</span></div>'+
    '<div class="db-kpis db-kpis-klein">'+kpi('imp-neu',String(n.neu),'neu','werden angelegt')+kpi('imp-vorhanden',String(n.vorhanden),'schon vorhanden',e.modus==='ergaenzen'?ergz+' davon werden ergänzt':'bleiben, wie sie sind')+kpi('imp-aus',String(n.aus),'nicht übernommen','doppelt oder ohne Namen')+'</div>'+
    (imp.tabelle?spaltenHtml():'')+
    (imp.unbekannt.length?H.hinweis('Diese Spalten der CSV kennt der Import nicht und lässt sie weg: '+esc(imp.unbekannt.join(', ')),'info'):'')+
    '<fieldset class="db-wahl"><legend>Vorhandene Dossiers</legend>'+radioHtml('modus','neu','Nur neue Dossiers anlegen','Vorhandene bleiben, wie sie sind.',e.modus)+radioHtml('modus','ergaenzen','Vorhandene ergänzen','Nur leere Felder werden gefüllt – nichts wird überschrieben.',e.modus)+'</fieldset>'+
    '<div class="ar-raster2">'+
      '<label class="ar-feld"><span>Stelle für neue Dossiers</span><select data-db-imp="stelle" data-fokus="imp-stelle"><option value="auto"'+(e.stelle==='auto'?' selected':'')+'>automatisch aus der Maßnahme</option>'+teams().map(function(t){return '<option value="'+esc(t.id)+'"'+(e.stelle===t.id?' selected':'')+'>'+esc(t.name)+'</option>';}).join('')+'</select></label>'+
      '<label class="ar-feld"><span>„C&amp;G“ ohne Angabe „für wen“ eintragen als</span><select data-db-imp="cg" data-fokus="imp-cg"><option value="cgPro"'+(e.cg==='cgPro'?' selected':'')+'>Conseil et guidance des professionnel·le·s</option><option value="cgEltern"'+(e.cg==='cgEltern'?' selected':'')+'>Conseil et guidance parents</option></select></label>'+
    '</div><p class="ar-klein">Automatisch: '+(imp.tabelle?'die Spalte „Stelle“, wenn es sie gibt; sonst ':'')+'CST, Classe de participation oder Annexe, wenn dort eine Beschulung steht; sonst ISA bei laufender ISA; sonst Diagnostique.</p>'+
    (altDr.length?'<h3>Directions zuordnen</h3><p class="ar-klein">'+(imp.tabelle?'Nummern und Orte („5“, „DR 05“, „Sanem“) sind schon zugeordnet':'CDSE Stats nutzte eine ältere DIR-Liste. Eindeutige Namen sind schon zugeordnet')+'; bei den übrigen bitte die passende Direction der Fiche wählen – sonst bleibt das Feld leer.</p><div class="db-drwahl">'+
      altDr.map(function(a,i){return '<label class="ar-feld"><span>'+esc(a)+'</span><select data-db-imp="dr" data-alt="'+esc(a)+'" data-fokus="imp-dr-'+i+'"><option value="">– nicht übernehmen –</option>'+DR.map(function(d){return '<option'+(e.dr[a]===d?' selected':'')+'>'+esc(d)+'</option>';}).join('')+'</select></label>';}).join('')+'</div>':'')+
    (warn.length?H.hinweis('Beim Lesen aufgefallen: '+esc(warn.slice(0,8).join(' · '))+(warn.length>8?' …':''),'info'):'')+
    '<p class="ar-klein">Bei neuen Dossiers wirst du als fallverantwortlich eingetragen (später änderbar). Jede Änderung steht im Protokoll des Dossiers („Import aus '+esc(quelleName())+'“).</p>'+
    '<div class="db-tabrahmen"><table class="db-tab db-imptab"><thead><tr><th scope="col">Name</th><th scope="col">Geburtsdatum</th><th scope="col">Matricule</th><th scope="col">Was passiert</th></tr></thead><tbody>'+
      v.slice(0,300).map(function(z){
        var p=z.m.person, was;
        if(z.status==='neu'){was='<b class="db-neu">wird angelegt</b> · Stelle '+esc(stelleName(z.stelle))+(z.grund?' <small>('+esc(z.grund)+')</small>':'');}
        else if(z.status==='vorhanden'){was='<b>vorhanden</b> – '+esc(z.grund)+' · '+(e.modus==='ergaenzen'?(z.erg&&z.erg.anzahl?'wird ergänzt: '+esc(z.erg.felder.join(', ')):'nichts zu ergänzen'):'bleibt, wie es ist')+(z.x?' · <a href="#/schueler/'+esc(z.x.d.id)+'">'+esc(H.schuelerName(z.x.d.person))+'</a>':'');}
        else{was='<span class="ar-leise">'+esc(z.grund)+'</span>';}
        return '<tr class="db-imp-'+z.status+'"><td data-label="Name">'+esc(H.schuelerName(p))+'</td><td data-label="Geburtsdatum"'+(p.geburtsdatum?'':' class="leer"')+'>'+esc(p.geburtsdatum?datumDe(p.geburtsdatum):'—')+'</td><td data-label="Matricule"'+(p.matricule?'':' class="leer"')+'>'+esc(p.matricule||'—')+'</td><td data-label="Was passiert">'+was+'</td></tr>';
      }).join('')+'</tbody></table></div>'+(v.length>300?'<p class="ar-leise">… und '+(v.length-300)+' weitere Datensätze.</p>':'')+
    '<div class="ar-knopfreihe" id="db-imp-knoepfe">'+(imp.laeuft?laufHtml(0,1):'<button class="btn primary" type="button" data-db="import-los" data-fokus="import-los"'+((n.neu||ergz)?'':' disabled')+'>'+svg('hoch')+'Importieren</button><button class="btn" type="button" data-db="import-weg">Abbrechen</button>')+'</div></section>';
  return h;
}
function laufHtml(i,n){return '<div class="db-lauf" role="status"><progress max="'+n+'" value="'+i+'"></progress><span>Importiere '+i+' von '+n+' … bitte die Seite offen lassen.</span></div>';}
function importAusfuehren(){
  if(!imp||!imp.vorschau||imp.laeuft){return;}
  var liste2=imp.vorschau.filter(function(z){return z.status==='neu'||(z.status==='vorhanden'&&imp.einst.modus==='ergaenzen'&&z.erg&&z.erg.anzahl);});
  var erg={angelegt:0,ergaenzt:0,unveraendert:0,uebersprungen:imp.vorschau.length-liste2.length,fehler:[]}, i=0;
  imp.laeuft=true;
  var knoepfe=$q('#db-imp-knoepfe');if(knoepfe){knoepfe.innerHTML=laufHtml(0,liste2.length);}
  var dateiIn=$q('#db-datei');if(dateiIn){dateiIn.disabled=true;}
  function schritt(){
    if(i>=liste2.length){return Promise.resolve();}
    var z=liste2[i++];
    var k=$q('#db-imp-knoepfe');if(k){k.innerHTML=laufHtml(i,liste2.length);}
    return eineZeile(z).then(function(a){erg[a]++;},function(e){erg.fehler.push(H.schuelerName(z.m.person)+': '+fehlerText(e));}).then(schritt);
  }
  schritt().then(function(){
    protokollieren({art:'import',format:quelleName(),anzahl:erg.angelegt+erg.ergaenzt,text:'„'+imp.datei+'“: '+erg.angelegt+' angelegt, '+erg.ergaenzt+' ergänzt, '+(erg.uebersprungen+erg.unveraendert)+' unverändert'+(erg.fehler.length?', '+erg.fehler.length+' Fehler':'')});
    return laden(true);
  }).then(function(){imp.laeuft=false;imp.ergebnis=erg;if(zust.seite==='import'){importSeite();var b=$q('.db-imp-ergebnis h2');if(b){b.setAttribute('tabindex','-1');b.focus();}}},
    function(e){imp.laeuft=false;imp.ergebnis=erg;erg.fehler.push(fehlerText(e));if(zust.seite==='import'){importSeite();}});
}
function ficheText(f){var t=[];if(f.schule){t.push('Schule');}if(f.ef){t.push('Direction');}if(f.ersteSprache){t.push('Erstsprache');}if(f.cdse){t.push('Maßnahmen');}if(f.intervenants){t.push('weitere Dienste');}if(f.mfiles){t.push('M-Files');}return t.join(', ')||'Fiche-Angaben';}
function eineZeile(z){
  if(z.status==='neu'){
    return T.neuesDossier(z.m.person,{stelle:z.stelle}).then(function(d){
      var p=Promise.resolve(d);
      if(Object.keys(z.m.fiche).length){
        var fiche=Object.assign({},z.m.fiche,{quelle:{datei:quelleName()+' ('+imp.datei+')',gelesen:new Date().toISOString(),von:(K.ich()||{}).id||''}});
        p=p.then(function(){return T.ops.fiche(d.id,{fiche:fiche},'Import aus '+quelleName()+': '+ficheText(z.m.fiche));});
      }
      return p.then(function(){return T.ops.datenbank(d.id,z.m.db,'Import aus '+quelleName()+': Datenbank-Angaben');}).then(function(){return 'angelegt';});
    });
  }
  return T.dossier(z.x.d.id,true).then(function(d){
    var f=ergaenzung(d,z.m);if(!f.anzahl){return 'unveraendert';}
    var p=Promise.resolve(), txtF=f.felder.filter(function(x){return !DB_WERTE_TEXT[x];});
    if(f.person||f.fiche){p=p.then(function(){var w={};if(f.person){w.person=f.person;}if(f.fiche){w.fiche=f.fiche;}return T.ops.fiche(d.id,w,'Aus '+quelleName()+' ergänzt: '+txtF.join(', '));});}
    if(f.db){p=p.then(function(){return T.ops.datenbank(d.id,f.db,'Aus '+quelleName()+' ergänzt: '+Object.keys(f.db).filter(function(k){return k!=='herkunft';}).map(function(k){return DB_NAMEN[k]||k;}).join(', '));});}
    return p.then(function(){return 'ergaenzt';});
  });
}
var DB_WERTE_TEXT=(function(){var o={};Object.keys(DB_NAMEN).forEach(function(k){o[DB_NAMEN[k]]=1;});return o;})();
function importErgebnisHtml(){
  var e=imp.ergebnis;
  return '<section class="ar-karte db-imp-ergebnis" role="status"><h2>Import abgeschlossen</h2><div class="db-kpis db-kpis-klein">'+
    kpi('imp-angelegt',String(e.angelegt),'angelegt','neue Dossiers')+kpi('imp-ergaenzt',String(e.ergaenzt),'ergänzt','leere Felder gefüllt')+kpi('imp-unveraendert',String(e.uebersprungen+e.unveraendert),'unverändert','übersprungen oder nichts zu ergänzen')+kpi('imp-fehler',String(e.fehler.length),'Fehler','')+'</div>'+
    (e.fehler.length?H.hinweis('Nicht übernommen: '+esc(e.fehler.join(' · '))):'')+
    '<div class="ar-knopfreihe"><a class="btn primary" href="#/datenbank/tabelle">'+svg('datei')+'Zur Tabelle</a><a class="btn" href="#/datenbank/protokoll">'+svg('history')+'Protokoll</a></div></section>';
}

/* =====================================================================
   Ereignisse (am Container – er wird bei jedem Seitenwechsel neu gebaut)
   ===================================================================== */
function ereignisse(el){
  el.addEventListener('click',function(ev){
    var t=ev.target;
    var dr=t.closest&&t.closest('[data-db-drill]');
    if(dr){
      try{var dj=JSON.parse(dr.getAttribute('data-db-drill'));if(Array.isArray(dj)||dj.feld){tab.filter=[].concat(dj);tab.oder=[];}else{tab.filter=[].concat(dj.und||[]);tab.oder=[].concat(dj.oder||[]);}}catch(x){tab.filter=[];tab.oder=[];}
      tab.q='';tab.schnell={geschlecht:'',cycle:'',direction:'',massnahme:''};tab.mehr=0;return;
    }
    var b=t.closest&&t.closest('[data-db],[data-db-f],[data-db-sort],[data-db-blatt],[data-db-beispiel],[data-db-vorlage],[data-db-gespeichert],[data-db-prot]');
    if(!b){var tr=t.closest&&t.closest('tr.db-zeile');if(tr&&!t.closest('a,button,input,select,textarea')){blattOeffnen(tr.getAttribute('data-id'),tr.querySelector('.db-name'));}return;}
    if(b.hasAttribute('data-db-f')){var art=b.getAttribute('data-db-f'), w=b.getAttribute('data-wert');if(art==='status'){gf.status=w;}else{gf.stelle=w;}tab.mehr=0;neuZeichnen();return;}
    if(b.hasAttribute('data-db-sort')){var k=b.getAttribute('data-db-sort');if(tab.sortFeld===k){tab.sortAuf=!tab.sortAuf;}else{tab.sortFeld=k;tab.sortAuf=true;}tabTeilNeu();return;}
    if(b.hasAttribute('data-db-blatt')){blattOeffnen(b.getAttribute('data-db-blatt'),b);return;}
    if(b.hasAttribute('data-db-beispiel')){frageStellen(b.getAttribute('data-db-beispiel'));return;}
    if(b.hasAttribute('data-db-vorlage')){var v=VORLAGEN.filter(function(x){return x.id===b.getAttribute('data-db-vorlage');})[0];if(v){abf.a=abfrageNorm(v.a);abf.verstanden=null;var ve=$q('#db-verstanden');if(ve){ve.innerHTML='';}bauNeu();H.toast('Vorlage: '+v.titel);}return;}
    if(b.hasAttribute('data-db-gespeichert')){var g=gespeicherte().filter(function(x){return x.id===b.getAttribute('data-db-gespeichert');})[0];if(g){abf.a=abfrageNorm(g.abfrage);abf.verstanden=null;var ve2=$q('#db-verstanden');if(ve2){ve2.innerHTML='';}bauNeu();H.toast('Abfrage „'+g.name+'“ geladen');}return;}
    if(b.hasAttribute('data-db-prot')){protFilter=b.getAttribute('data-db-prot');fokusMerken();protokollSeite();fokusZurueck();return;}
    var i=+b.getAttribute('data-i');
    switch(b.getAttribute('data-db')){
      case 'neu-laden':b.disabled=true;laden(true).then(function(){zeichnen();H.toast('Neu geladen');},function(e){H.toast(fehlerText(e));}).then(function(){var n=$q('[data-db="neu-laden"]');if(n){n.disabled=false;}});break;
      case 'filter-weg':gf={status:'alle',stelle:'',sj:''};zeichnen();break;
      case 'spalten':spaltenDialog();break;
      case 'export':exportDialog();break;
      case 'mehr':tab.mehr+=200;tabTeilNeu();break;
      case 'tf-weg':tab.filter.splice(i,1);tabTeilNeu();break;
      case 'tf-oder-weg':tab.oder=[];tabTeilNeu();break;
      case 'tf-alle-weg':tab.filter=[];tab.oder=[];tabTeilNeu();break;
      case 'tab-leeren':tab.q='';tab.schnell={geschlecht:'',cycle:'',direction:'',massnahme:''};tab.filter=[];tab.oder=[];tabelleSeite();break;
      case 'fz-plus':abf.a.filter.push({feld:'geschlecht',op:'ist',wert:''});bauNeu();var s=$q('[data-fokus="fz-'+(abf.a.filter.length-1)+'-feld"]');if(s){s.focus();}break;
      case 'fz-weg':abf.a.filter.splice(i,1);bauNeu();var p=$q('[data-fokus="fz-plus"]');if(p){p.focus();}break;
      case 'abfrage-neu':abf={a:neueAbfrage(),frage:'',verstanden:null};abfragenSeite();break;
      case 'abfrage-speichern':speichernDialog();break;
      case 'abfrage-tabelle':var dbas=drillBasis(abf.a);tab.filter=kopie(dbas.und);tab.oder=kopie(dbas.oder);tab.q='';tab.schnell={geschlecht:'',cycle:'',direction:'',massnahme:''};tab.mehr=0;location.hash='#/datenbank/tabelle';break;
      case 'gespeichert-weg':
        var gid=b.getAttribute('data-id'), gg=gespeicherte().filter(function(x){return x.id===gid;})[0];if(!gg){break;}
        H.dialog('Abfrage löschen','<p>„'+esc(gg.name)+'“ wirklich löschen?</p>',[{text:'Abbrechen',wert:''},{text:'Löschen',wert:'ok',primaer:true,gefahr:true}]).then(function(r){
          if(r.aktion!=='ok'){return;}gespeicherteSchreiben(gespeicherte().filter(function(x){return x.id!==gid;}));var vv=$q('#db-vorlagen');if(vv){vv.innerHTML=vorlagenHtml();}H.toast('Abfrage gelöscht');});
        break;
      case 'import-weg':imp=null;importSeite();break;
      case 'import-vorlage':importVorlage();break;
      case 'import-los':importAusfuehren();break;
    }
  });
  el.addEventListener('change',function(ev){
    var t=ev.target;
    if(t.hasAttribute('data-db-sj')){gf.sj=t.value;tab.mehr=0;neuZeichnen();return;}
    if(t.hasAttribute('data-db-schnell')){tab.schnell[t.getAttribute('data-db-schnell')]=t.value;tab.mehr=0;tabTeilNeu();return;}
    if(t.hasAttribute('data-db-bau')){
      var a=abf.a, k=t.getAttribute('data-db-bau');
      if(k==='fn'){a.kennzahl.fn=t.value;if(t.value!=='anzahl'&&!(feldVon(a.kennzahl.feld)||{}).typ){a.kennzahl.feld='alter';}}
      else if(k==='feld'){a.kennzahl.feld=t.value;}
      else if(k==='verknuepfung'){a.verknuepfung=t.value==='oder'?'oder':'und';}
      else if(k==='gruppe2'){a.gruppe2=t.value;}
      else{a.gruppe=t.value;if(!a.gruppe||a.gruppe2===a.gruppe){a.gruppe2='';}}
      bauNeu();return;
    }
    if(t.hasAttribute('data-db-fw')){
      var wi=t.getAttribute('data-i'), wf=abf.a.filter[+wi];if(!wf){return;}
      wf.werte=Array.prototype.map.call(zust.el.querySelectorAll('input[data-db-fw][data-i="'+wi+'"]'),function(c){return c.checked?c.value:'';}).filter(Boolean);
      ergebnisNeu();return;
    }
    if(t.hasAttribute('data-db-fz')){
      var fl=abf.a.filter[+t.getAttribute('data-i')], wo=t.getAttribute('data-db-fz');if(!fl){return;}
      if(wo==='feld'){fl.feld=t.value;fl.op=(opsFuer(feldVon(t.value))[0]||['ist'])[0];fl.wert='';fl.wert2='';delete fl.werte;bauNeu();}
      else if(wo==='op'){
        var vorher=fl.op;fl.op=t.value;
        /* Wechsel zwischen einem Wert und mehreren Werten: den gewählten Wert mitnehmen */
        if(mehrfach(fl.op)&&!mehrfach(vorher)){fl.werte=txt(fl.wert)&&vorher!=='enthaeltText'?[fl.wert]:[];fl.wert='';}
        else if(!mehrfach(fl.op)&&mehrfach(vorher)){fl.wert=werteVon(fl)[0]||'';delete fl.werte;}
        if(!brauchtWert(fl.op)){fl.wert='';fl.wert2='';delete fl.werte;}
        if(fl.op==='imSchuljahr'&&!/^\d{4}\/\d{2}$/.test(fl.wert||'')){fl.wert='';}if(fl.op!=='zwischen'){fl.wert2='';}bauNeu();
      }
      else{fl[wo]=t.value;ergebnisNeu();}
      return;
    }
    if(t.hasAttribute('data-db-imp')&&imp&&!imp.laeuft){
      var ik=t.getAttribute('data-db-imp');
      if(ik==='dr'){imp.einst.dr[t.getAttribute('data-alt')]=t.value;}
      else if(ik==='spalte'&&imp.tabelle){imp.tabelle.map[+t.getAttribute('data-sp')]=t.value;tabelleVorbereiten();}
      else if(ik==='blatt'&&imp.tabelle){imp.tabelle.blatt=+t.value||0;imp.tabelle.map=null;tabelleVorbereiten();}
      else{imp.einst[ik]=t.value;}
      fokusMerken();vorschauBerechnen();importSeite();fokusZurueck();
      if(ik==='modus'){var r=$q('input[data-db-imp="modus"][value="'+t.value+'"]');if(r){r.focus();}}
      return;
    }
    if(t.id==='db-datei'&&t.files&&t.files[0]){importStarten(t.files[0]);}
  });
  el.addEventListener('input',function(ev){
    var t=ev.target;
    if(t.id==='db-q'){tab.q=t.value;tab.mehr=0;var tt=$q('#db-tabteil');if(tt){tt.innerHTML=tabTeilHtml();}return;}
    if(t.hasAttribute('data-db-fz')&&t.tagName==='INPUT'){var fl=abf.a.filter[+t.getAttribute('data-i')];if(fl){fl[t.getAttribute('data-db-fz')]=t.value;ergebnisNeu();}}
  });
  el.addEventListener('submit',function(ev){
    var f=ev.target;if(f.getAttribute('data-db-form')!=='frage'){return;}
    ev.preventDefault();var i=f.querySelector('input[name=frage]');frageStellen(i?i.value:'');
  });
}

return {seite:seite, felder:FELDER, datensatz:datensatz,
  /* Kernangaben, die im Datensatz fehlen: [{key, label}] (für den Begleitplan) */
  kernFehlt:function(r){return kernFehlt(r||{}).map(function(k){var f=FELDER.filter(function(x){return x.key===k[0];})[0];return {key:k[0],label:f?f.label:k[0],teil:k[1]};});},
  /* Verbindung zum Reiter „Fiche“ im Dossier */
  ficheKarte:ficheKarte, bearbeiten:bearbeiten, zeigen:zeigen,
  /* für Tests und andere Module: Abfragen ohne Oberfläche */
  abfrage:function(rows,a){return ausfuehren(rows,abfrageNorm(a));}, frage:frageVerstehen, satz:function(a){return satz(abfrageNorm(a));}, norm:abfrageNorm,
  kompetenzzentren:ccListe, spaltenRaten:zuordnungRaten,
  cdseStats:{abbilden:function(s,e){return abbilden(s,Object.assign({dr:{},cg:'cgPro'},e||{}));}, drImport:drImport}};
})();
