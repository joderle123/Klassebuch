/* =====================================================================
   CDSE Hub — Kindmodus: Ziel-Quest, Stopp-Ampel und Atem-Raumschiff
   ---------------------------------------------------------------------
   S1 Kindmodus: ein geschützter Bildschirm für das Kind – groß, ruhig,
   ohne Menüs und ohne Daten aus dem Dossier. Er zeigt nur den
   Spitznamen, eine Spielfigur, das Wochenziel in Kindersprache und die
   Übungen. Beenden geht nur mit dem Code der Erwachsenen; der Code
   liegt nur als Prüfwert in sessionStorage, nie im Klartext.
   S2 Ziel-Quest: Kind und Erwachsene schätzen jeden Tag ein, wie das
   Wochenziel geklappt hat (0–2). Sterne = Einschätzung der Erwachsenen
   plus ein Extra-Stern, wenn beide gleich einschätzen (Selbstbeobachtung
   mit Abgleich: Rhode, Morgan & Young, 1983; Bruhn et al., 2015). Die
   Welt wächst mit den Sternen; ab dem Wochenziel wählt das Kind eine
   Belohnung aus der Liste des Teams (Maggin et al., 2011).
   S3 Stopp-Ampel: gezeichnete Szenen aus dem Schulalltag (nie Fotos),
   Thermometer und Körpersignale; Rot = anhalten, Gelb = eine der
   Strategien wählen, die das Team festgelegt hat, Grün = sofort üben.
   Langsames Atmen mit etwa sechs Atemzügen pro Minute (Zaccaro et al.,
   2018); Übungsspiele: Fleming et al. (2017), Schoneveld et al. (2018).
   Gespeichert in d.kindmodus (Operationen kind* in team.js): nur
   Einstellungen, Sterne je Tag und geübte Runden – keine Freitexte des
   Kindes (Datensparsamkeit, DSGVO Art. 5).
   ===================================================================== */
window.CDSE_KINDMODUS=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function pad(n){return (n<10?'0':'')+n;}
function isoVon(t){return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());}
function heute(){return isoVon(new Date());}
function datum(i){return H?H.datum(i):i;}
function plusTage(iso,n){var t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+n);return isoVon(t);}
function montag(iso){var w=new Date(iso+'T12:00:00').getDay();return plusTage(iso,-((w+6)%7));}
function wtag(iso){return new Date(iso+'T12:00:00').getDay();}
function zahl(x){return (Math.round(x*10)/10).toString().replace('.',',');}
function P(n){return Math.round(n*10)/10;}
var TAGE_KURZ=['So','Mo','Di','Mi','Do','Fr','Sa'], TAGE_LANG=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
var MONATE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var TEMPO=1;                 /* Zeitfaktor (Tests: kleiner) */
var SITZ='cdse_kindmodus';   /* sessionStorage: Prüfwert des Codes, Dossier-Id, Fehlversuche */
var SPRACHE=typeof window!=='undefined'&&'speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance==='function';

/* =====================================================================
   Inhalte
   ===================================================================== */
var FIGUREN=[['fuchs','Fuchs'],['eule','Eule'],['drache','Drache'],['roboter','Roboter'],['katze','Katze'],['baer','Bär']];
var WELTEN=[['baum','Baum','Aus einem Samen wird ein großer Baum.'],['burg','Burg','Stein für Stein entsteht eine Burg.'],['raumschiff','Raumschiff','Teil für Teil wird das Raumschiff startklar.']];
var STUFEN=12, MAX_WOCHE=15;
var STRATEGIEN={
  atmen:{kind:'Tief atmen',erw:'Langsam atmen (Atem-Raumschiff, 1 Minute)'},
  zaehlen:{kind:'Langsam bis 10 zählen',erw:'Langsam bis 10 zählen'},
  weggehen:{kind:'Kurz weggehen',erw:'Kurz weggehen, zum Ruheplatz'},
  pausenkarte:{kind:'Pausenkarte zeigen',erw:'Pausenkarte zeigen'},
  hilfe:{kind:'Hilfe holen',erw:'Einen Erwachsenen um Hilfe bitten'},
  druecken:{kind:'Fest drücken, dann loslassen',erw:'Anspannen und loslassen (Hände drücken)'},
  trinken:{kind:'Einen Schluck Wasser trinken',erw:'Wasser trinken'},
  eigene:{kind:'',erw:'Eigene Strategie'}
};
var STRAT_REIHE=['atmen','zaehlen','weggehen','pausenkarte','hilfe','druecken','trinken'];
var SIGNALE=[['herz','Mein Herz klopft schnell'],['kopf','Mein Kopf wird heiß'],['faeuste','Meine Hände werden zu Fäusten'],['bauch','Mein Bauch grummelt'],
  ['traenen','Mir kommen Tränen'],['zittern','Ich zittere'],['schreien','Ich will schreien'],['nichts','Ich merke nichts']];
var THERMO=[null,['ganz ruhig','#5AA9E6'],['ein bisschen unruhig','#6CC08B'],['es brodelt','#F2C94C'],['sehr heiß','#F2994A'],['ich koche über','#EB5757']];
var BEWERTUNG=[['Noch nicht','#9CC3EE'],['Ein bisschen','#F2C94C'],['Gut geklappt','#6CC08B']];
var WEN=['Lehrerin oder Lehrer','Erzieherin oder Erzieher','Jemand vom Team','Jemand anderes'];
var SZENEN=[
  ['stift','Jemand nimmt dir den Stift weg.'],
  ['verlieren','Du verlierst beim Spiel in der Pause.'],
  ['test','Heute gibt es einen Test.'],
  ['auslachen','Zwei Kinder lachen und schauen zu dir.'],
  ['aufhoeren','Die Pause ist vorbei. Du musst aufhören.'],
  ['laut','In der Klasse ist es sehr laut.'],
  ['fehler','Du hast an der Tafel einen Fehler gemacht.'],
  ['schubsen','In der Reihe schubst dich jemand.'],
  ['nichtdran','Du meldest dich, aber jemand anderes kommt dran.'],
  ['allein','Die anderen spielen ohne dich.'],
  ['nein','Ein Erwachsener sagt Nein.'],
  ['wechsel','Heute ist jemand anderes da als sonst.']
];
function szeneTitel(id){var s=SZENEN.filter(function(x){return x[0]===id;})[0];return s?s[1]:'';}
function figurName(id){var f=FIGUREN.filter(function(x){return x[0]===id;})[0];return f?f[1]:'Figur';}
function weltName(id){var w=WELTEN.filter(function(x){return x[0]===id;})[0];return w?w[1]:'Welt';}
function signalText(id){var s=SIGNALE.filter(function(x){return x[0]===id;})[0];return s?s[1]:id;}
function stratText(km,id,erw){var s=STRATEGIEN[id];if(!s){return String(id||'');}if(id==='eigene'){return (km&&km.eigene)||'Eigene Strategie';}return erw?s.erw:s.kind;}

/* =====================================================================
   Daten
   ===================================================================== */
function kmVon(d){var x=d&&d.kindmodus;return x&&typeof x==='object'&&x.spitzname?x:null;}
function woche(km,mo){return (km&&km.wochen||{})[mo]||null;}
function sterneTag(t){return t?(t.e+(t.k===t.e?1:0)):0;}
function sterneWoche(wo){var s=0;if(wo){Object.keys(wo.tage||{}).forEach(function(k){s+=sterneTag(wo.tage[k]);});}return s;}
function stufe(st){return Math.max(0,Math.min(STUFEN,st|0));}
function questTage(km,ab,bis){
  var l=[];
  Object.keys(km.wochen||{}).forEach(function(mo){var wo=km.wochen[mo]||{};Object.keys(wo.tage||{}).forEach(function(t){
    if((!ab||t>=ab)&&(!bis||t<=bis)){var x=wo.tage[t];l.push({datum:t,k:x.k,e:x.e,sterne:sterneTag(x),einig:x.k===x.e});}
  });});
  return l.sort(function(a,b){return a.datum.localeCompare(b.datum);});
}
function rundenIn(km,ab,bis){return (km.runden||[]).filter(function(x){var t=String(x&&x.z||'').slice(0,10);return t&&(!ab||t>=ab)&&(!bis||t<=bis);});}
function auswertung(km,ab,bis){
  var q=questTage(km,ab,bis), rr=rundenIn(km,ab,bis), amp=rr.filter(function(x){return x.spiel==='ampel';}), atem=rr.filter(function(x){return x.spiel==='atem';});
  var paare=amp.filter(function(x){return x.vor&&x.nach;}), st={}, sig={};
  amp.forEach(function(x){if(x.strategie){st[x.strategie]=(st[x.strategie]||0)+1;}(x.signale||[]).forEach(function(s){if(s!=='nichts'){sig[s]=(sig[s]||0)+1;}});});
  function summe(l,f){return l.reduce(function(a,x){return a+f(x);},0);}
  return {quest:q, questSterne:q.length?summe(q,function(x){return x.sterne;})/q.length:null, einig:q.filter(function(x){return x.einig;}).length,
    ampel:amp.length, atem:atem.length, atemMin:Math.round(summe(atem,function(x){return x.dauer||0;})/60),
    vor:paare.length?summe(paare,function(x){return x.vor;})/paare.length:null, nach:paare.length?summe(paare,function(x){return x.nach;})/paare.length:null,
    strategien:Object.keys(st).sort(function(a,b){return st[b]-st[a];}).map(function(k){return {id:k,n:st[k]};}),
    signale:Object.keys(sig).sort(function(a,b){return sig[b]-sig[a];}).map(function(k){return {id:k,n:sig[k]};})};
}

/* =====================================================================
   Zeichnungen (SVG, alles gezeichnet – keine Fotos)
   ===================================================================== */
var FIGUR_BILD={
  fuchs:'<circle cx="60" cy="62" r="52" fill="#FCE9D8"/><path d="M60 100C36 100 22 82 22 64c0-14 7-24 17-29L31 12l21 17c5-1 11-1 16 0l21-17-8 23c10 5 17 15 17 29 0 18-14 36-38 36z" fill="#E8742C"/>'+
    '<path d="M36 21l8 12-6 3zM84 21l-8 12 6 3z" fill="#FFD2B0"/><path d="M60 100c-14 0-26-8-30-20 10 2 20-2 30-8 10 6 20 10 30 8-4 12-16 20-30 20z" fill="#FFF6EC"/>'+
    '<circle cx="46" cy="58" r="5.5" fill="#2B2B2B"/><circle cx="74" cy="58" r="5.5" fill="#2B2B2B"/><circle cx="47.8" cy="56.2" r="1.8" fill="#FFF"/><circle cx="75.8" cy="56.2" r="1.8" fill="#FFF"/>'+
    '<ellipse cx="60" cy="75" rx="6" ry="4.5" fill="#2B2B2B"/><path d="M54 82q6 5 12 0" stroke="#2B2B2B" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  eule:'<circle cx="60" cy="62" r="52" fill="#EFE6F7"/><path d="M28 30l12 16H26zM92 30L80 46h14z" fill="#6E513A"/><ellipse cx="60" cy="66" rx="36" ry="40" fill="#8B6A4E"/>'+
    '<ellipse cx="25" cy="78" rx="8" ry="17" fill="#6E513A"/><ellipse cx="95" cy="78" rx="8" ry="17" fill="#6E513A"/><ellipse cx="60" cy="78" rx="24" ry="24" fill="#D9C3A5"/>'+
    '<circle cx="46" cy="58" r="13" fill="#FFF"/><circle cx="74" cy="58" r="13" fill="#FFF"/><circle cx="47" cy="59" r="6.5" fill="#2B2B2B"/><circle cx="73" cy="59" r="6.5" fill="#2B2B2B"/>'+
    '<circle cx="49" cy="57" r="2" fill="#FFF"/><circle cx="75" cy="57" r="2" fill="#FFF"/><path d="M60 66l-6 7 6 8 6-8z" fill="#F2B632"/>'+
    '<ellipse cx="52" cy="105" rx="6" ry="3.5" fill="#F2B632"/><ellipse cx="68" cy="105" rx="6" ry="3.5" fill="#F2B632"/>',
  drache:'<circle cx="60" cy="62" r="52" fill="#E3F4E8"/><path d="M38 38l-5-20 13 14zM82 38l5-20-13 14z" fill="#F2D16B"/><path d="M50 32l4-11 5 10zM61 31l5-10 4 11z" fill="#3E8F5A"/>'+
    '<ellipse cx="60" cy="66" rx="38" ry="34" fill="#5DB075"/><ellipse cx="60" cy="81" rx="24" ry="15" fill="#8ED1A0"/><ellipse cx="53" cy="78" rx="2.6" ry="3.6" fill="#2F6B45"/><ellipse cx="67" cy="78" rx="2.6" ry="3.6" fill="#2F6B45"/>'+
    '<circle cx="45" cy="57" r="8.5" fill="#FFF"/><circle cx="75" cy="57" r="8.5" fill="#FFF"/><circle cx="46" cy="58" r="4.5" fill="#2B2B2B"/><circle cx="74" cy="58" r="4.5" fill="#2B2B2B"/>'+
    '<circle cx="47.3" cy="56.4" r="1.5" fill="#FFF"/><circle cx="75.3" cy="56.4" r="1.5" fill="#FFF"/><path d="M48 89q12 8 24 0" stroke="#2F6B45" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
    '<circle cx="33" cy="74" r="4.5" fill="#F4A6A6" opacity=".6"/><circle cx="87" cy="74" r="4.5" fill="#F4A6A6" opacity=".6"/>',
  roboter:'<circle cx="60" cy="62" r="52" fill="#E6EEF8"/><path d="M60 16v14" stroke="#7C8AA0" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="13" r="6" fill="#EB5757"/>'+
    '<rect x="15" y="50" width="11" height="22" rx="4" fill="#7C8AA0"/><rect x="94" y="50" width="11" height="22" rx="4" fill="#7C8AA0"/><rect x="24" y="30" width="72" height="62" rx="17" fill="#9DB4D1"/>'+
    '<rect x="34" y="41" width="52" height="37" rx="11" fill="#1F2A44"/><circle cx="48" cy="57" r="6.5" fill="#6FE3C1"/><circle cx="72" cy="57" r="6.5" fill="#6FE3C1"/>'+
    '<path d="M48 69q12 6 24 0" stroke="#6FE3C1" stroke-width="3.2" fill="none" stroke-linecap="round"/><rect x="42" y="92" width="36" height="12" rx="5" fill="#7C8AA0"/>',
  katze:'<circle cx="60" cy="62" r="52" fill="#EEEAF3"/><path d="M26 48l7-33 22 20zM94 48l-7-33-22 20z" fill="#8E8A96"/><path d="M33 38l3-14 10 11zM87 38l-3-14-10 11z" fill="#F4B8C4"/>'+
    '<ellipse cx="60" cy="66" rx="38" ry="34" fill="#8E8A96"/><ellipse cx="60" cy="80" rx="15" ry="11" fill="#EFE9F2"/>'+
    '<ellipse cx="46" cy="60" rx="6.5" ry="7.5" fill="#9BD37F"/><ellipse cx="74" cy="60" rx="6.5" ry="7.5" fill="#9BD37F"/><ellipse cx="46" cy="60" rx="2.2" ry="6" fill="#2B2B2B"/><ellipse cx="74" cy="60" rx="2.2" ry="6" fill="#2B2B2B"/>'+
    '<path d="M55 73h10l-5 5z" fill="#F28AA0"/><path d="M60 78q-4 5-8 3M60 78q4 5 8 3" stroke="#4A4550" stroke-width="1.9" fill="none" stroke-linecap="round"/>'+
    '<path d="M38 77l-17-4M38 82l-17 2M82 77l17-4M82 82l17 2" stroke="#4A4550" stroke-width="1.5" stroke-linecap="round"/>',
  baer:'<circle cx="60" cy="62" r="52" fill="#F5EBDD"/><circle cx="31" cy="32" r="13" fill="#9B6B45"/><circle cx="89" cy="32" r="13" fill="#9B6B45"/><circle cx="31" cy="32" r="6" fill="#D9A77E"/><circle cx="89" cy="32" r="6" fill="#D9A77E"/>'+
    '<circle cx="60" cy="66" r="39" fill="#9B6B45"/><ellipse cx="60" cy="81" rx="18" ry="14" fill="#E3C19D"/><ellipse cx="60" cy="74" rx="7" ry="5" fill="#3A2A20"/>'+
    '<path d="M60 78v6M54 87q6 4 12 0" stroke="#3A2A20" stroke-width="2.2" fill="none" stroke-linecap="round"/>'+
    '<circle cx="46" cy="60" r="5.5" fill="#2B2B2B"/><circle cx="74" cy="60" r="5.5" fill="#2B2B2B"/><circle cx="47.8" cy="58.2" r="1.8" fill="#FFF"/><circle cx="75.8" cy="58.2" r="1.8" fill="#FFF"/>'
};
function figurSvg(id,kl){return '<svg class="km-figur'+(kl?' '+kl:'')+'" viewBox="0 0 120 120" aria-hidden="true">'+(FIGUR_BILD[id]||FIGUR_BILD.fuchs)+'</svg>';}

function sonne(x,y){var s='<circle cx="'+x+'" cy="'+y+'" r="15" fill="#F7D154"/>';for(var i=0;i<8;i++){var a=i*Math.PI/4;s+='<path d="M'+P(x+Math.cos(a)*20)+' '+P(y+Math.sin(a)*20)+' L'+P(x+Math.cos(a)*27)+' '+P(y+Math.sin(a)*27)+'" stroke="#F7D154" stroke-width="3" stroke-linecap="round"/>';}return s;}
function blume(x,y){var s='';for(var i=0;i<5;i++){var a=i*Math.PI*2/5;s+='<circle cx="'+P(x+Math.cos(a)*3.6)+'" cy="'+P(y+Math.sin(a)*3.6)+'" r="3.1" fill="#F48FB1"/>';}return s+'<circle cx="'+x+'" cy="'+y+'" r="2.4" fill="#F7D154"/>';}
function vogel(x,y){return '<ellipse cx="'+x+'" cy="'+y+'" rx="10" ry="7" fill="#3D7DD8"/><circle cx="'+(x+8)+'" cy="'+(y-6)+'" r="5.5" fill="#3D7DD8"/><path d="M'+(x+13)+' '+(y-7)+'l6 1.5-6 2z" fill="#F2B632"/><circle cx="'+(x+9.5)+'" cy="'+(y-7.5)+'" r="1.3" fill="#FFF"/><path d="M'+(x-6)+' '+(y-2)+'q6-9 12-2" fill="#6FA0E4"/>';}
function falter(x,y){return '<ellipse cx="'+(x-6)+'" cy="'+(y-4)+'" rx="6" ry="8" fill="#C27BA0" transform="rotate(-20 '+(x-6)+' '+(y-4)+')"/><ellipse cx="'+(x+6)+'" cy="'+(y-4)+'" rx="6" ry="8" fill="#C27BA0" transform="rotate(20 '+(x+6)+' '+(y-4)+')"/><ellipse cx="'+(x-5)+'" cy="'+(y+6)+'" rx="4.5" ry="5" fill="#F6B26B"/><ellipse cx="'+(x+5)+'" cy="'+(y+6)+'" rx="4.5" ry="5" fill="#F6B26B"/><path d="M'+x+' '+(y-8)+'v18" stroke="#3A3F4B" stroke-width="2" stroke-linecap="round"/>';}

function weltBaum(st){
  var g='<rect width="320" height="220" fill="#DCEFFA"/>'+(st>=12?sonne(276,42):'')+
    '<path d="M0 188Q160 162 320 188V220H0z" fill="#A8D98F"/><path d="M0 204Q160 188 320 204V220H0z" fill="#93CC7A"/><ellipse cx="160" cy="184" rx="30" ry="7" fill="#8B6B4A"/>';
  if(st===0){g+='<ellipse cx="160" cy="178" rx="6" ry="4" fill="#C79A5B"/>';}
  if(st===1){g+='<path d="M160 181V164" stroke="#5DA45A" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="152" cy="164" rx="8" ry="4" fill="#6CC08B" transform="rotate(-25 152 164)"/><ellipse cx="168" cy="161" rx="8" ry="4" fill="#6CC08B" transform="rotate(25 168 161)"/>';}
  if(st===2){g+='<path d="M160 181V138" stroke="#7A5A3A" stroke-width="5" stroke-linecap="round"/><ellipse cx="149" cy="148" rx="11" ry="5.5" fill="#6CC08B" transform="rotate(-25 149 148)"/><ellipse cx="171" cy="141" rx="11" ry="5.5" fill="#5DB075" transform="rotate(25 171 141)"/><circle cx="160" cy="130" r="10" fill="#6CC08B"/>';}
  if(st>=3){
    g+='<path d="M150 184L155 116h10l5 68z" fill="#8B5E3C"/>';
    if(st>=4){g+='<path d="M156 146Q138 134 124 120" stroke="#8B5E3C" stroke-width="7" fill="none" stroke-linecap="round"/>';}
    if(st>=5){g+='<path d="M164 136Q182 122 198 112" stroke="#8B5E3C" stroke-width="7" fill="none" stroke-linecap="round"/>';}
    var rl=st>=7?28:(st>=4?17:0), rr=st>=8?30:(st>=5?19:0), rm=st>=6?38:24;
    if(rl){g+='<circle cx="122" cy="112" r="'+rl+'" fill="#6CC08B"/>';}
    if(rr){g+='<circle cx="200" cy="104" r="'+rr+'" fill="#4FA46A"/>';}
    g+='<circle cx="160" cy="'+(st>=6?92:104)+'" r="'+rm+'" fill="#5DB075"/>';
    if(st>=9){[[140,80],[176,70],[210,96],[114,106]].forEach(function(p){g+=blume(p[0],p[1]);});}
    if(st>=10){[[132,124],[168,100],[194,122],[150,70]].forEach(function(p){g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="#E0533D"/><path d="M'+p[0]+' '+(p[1]-6)+'l2-4" stroke="#6B4E33" stroke-width="1.6"/>';});}
    if(st>=11){g+=vogel(222,70);}
  }
  if(st>=12){g+=falter(70,150)+falter(256,158);}
  return g;
}
function weltBurg(st){
  var g='<rect width="320" height="220" fill="#DCEFFA"/>'+(st>=12?sonne(42,42):'')+'<path d="M0 192Q160 168 320 192V220H0z" fill="#A8D98F"/>';
  function zinnen(x,y,w,f){var s='';for(var i=0;i+7<=w;i+=12){s+='<rect x="'+(x+i)+'" y="'+(y-8)+'" width="7" height="8" fill="'+f+'"/>';}return s;}
  function fenster(x,y){return '<path d="M'+x+' '+(y+10)+'v-6a4 4 0 0 1 8 0v6z" fill="#3A4660"/>';}
  if(st===0){g+='<rect x="140" y="181" width="14" height="9" rx="2" fill="#B0B8C6"/><rect x="158" y="183" width="12" height="7" rx="2" fill="#A3ACBC"/><rect x="174" y="181" width="14" height="9" rx="2" fill="#B0B8C6"/>';}
  if(st>=1){g+='<rect x="84" y="178" width="152" height="12" rx="2" fill="#9AA3B5"/>';}
  if(st>=2){g+='<rect x="96" y="134" width="48" height="44" fill="#C3CBD9"/>'+zinnen(96,134,48,'#C3CBD9');}
  if(st>=3){g+='<rect x="176" y="134" width="48" height="44" fill="#C3CBD9"/>'+zinnen(176,134,48,'#C3CBD9');}
  if(st>=4){g+='<rect x="140" y="118" width="40" height="60" fill="#B9C2D2"/>'+zinnen(141,118,40,'#B9C2D2')+'<path d="M150 178v-20a10 10 0 0 1 20 0v20z" fill="#6B4E33"/>';}
  if(st>=5){g+='<rect x="78" y="98" width="30" height="80" fill="#B3BCCC"/>'+(st<7?zinnen(79,98,30,'#B3BCCC'):'');}
  if(st>=6){g+='<rect x="212" y="98" width="30" height="80" fill="#B3BCCC"/>'+(st<7?zinnen(213,98,30,'#B3BCCC'):'');}
  if(st>=7){g+='<path d="M74 98l19-34 19 34zM208 98l19-34 19 34z" fill="#D35D4E"/>';}
  if(st>=8){g+=fenster(89,116)+fenster(223,116)+fenster(112,148)+fenster(196,148)+fenster(156,128);}
  if(st>=9){g+='<path d="M93 64V42" stroke="#6B4E33" stroke-width="2.4"/><path d="M93 42l19 6-19 6z" fill="#F2B632"/>';}
  if(st>=10){g+='<path d="M227 64V42" stroke="#6B4E33" stroke-width="2.4"/><path d="M227 42l19 6-19 6z" fill="#3D7DD8"/>';}
  if(st>=11){g+='<path d="M150 190h20l20 30h-60z" fill="#E3CFA5"/>'+blume(118,200)+blume(204,204)+blume(96,210);}
  if(st>=12){g+='<path d="M108 108Q160 128 212 108" stroke="#8C96A8" stroke-width="1.5" fill="none"/>';
    [[122,113,'#EB5757'],[138,117,'#F2C94C'],[154,119,'#6CC08B'],[170,119,'#5AA9E6'],[186,117,'#C27BA0'],[200,113,'#F2994A']].forEach(function(f){g+='<path d="M'+(f[0]-5)+' '+(f[1]-1)+'h10l-5 9z" fill="'+f[2]+'"/>';});}
  return g;
}
function raketeTeile(st){
  var g='';
  if(st>=2){g+='<rect x="138" y="96" width="44" height="88" rx="8" fill="#E6EBF2"/>';}else if(st>=1){g+='<rect x="138" y="140" width="44" height="44" rx="8" fill="#E6EBF2"/>';}
  if(st>=3){g+='<path d="M138 100Q160 44 182 100z" fill="#E0533D"/>';}
  if(st>=4){g+='<circle cx="160" cy="124" r="11" fill="#7FC8F8" stroke="#5A6478" stroke-width="4"/>';}
  if(st>=5){g+='<path d="M139 150l-23 36 23-6z" fill="#E0533D"/>';}
  if(st>=6){g+='<path d="M181 150l23 36-23-6z" fill="#E0533D"/>';}
  if(st>=7){g+='<rect x="138" y="152" width="44" height="7" fill="#3D7DD8"/>';}
  if(st>=8){g+='<path d="M147 184h26l5 10h-36z" fill="#5A6478"/>';}
  if(st>=11){g+='<path d="M146 194Q160 '+(st>=12?244:226)+' 174 194z" fill="#F2994A"/><path d="M152 194Q160 '+(st>=12?226:212)+' 168 194z" fill="#F7D154"/>';}
  return g;
}
function weltRaumschiff(st){
  var g='<rect width="320" height="220" fill="#27345E"/>';
  if(st>=9){[[30,30],[70,62],[120,24],[212,40],[250,86],[292,26],[40,112],[284,132],[100,92]].forEach(function(p,i){g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(i%3?1.7:2.5)+'" fill="#FFF" opacity=".9"/>';});}
  if(st>=10){g+='<circle cx="262" cy="56" r="17" fill="#F2B632"/><ellipse cx="262" cy="56" rx="29" ry="7" fill="none" stroke="#F7D98A" stroke-width="3"/>';}
  g+='<rect y="194" width="320" height="26" fill="#4B5569"/><rect x="112" y="190" width="96" height="6" rx="2" fill="#8A94A8"/><path d="M120 196l-6 10M200 196l6 10" stroke="#8A94A8" stroke-width="4" stroke-linecap="round"/>';
  if(st===0){g+='<rect x="94" y="176" width="16" height="14" rx="2" fill="#6F7A90"/><rect x="210" y="180" width="18" height="10" rx="2" fill="#6F7A90"/>';}
  if(st>=12){g+='<circle cx="140" cy="198" r="12" fill="#E9EDF3" opacity=".8"/><circle cx="182" cy="199" r="14" fill="#E9EDF3" opacity=".8"/><circle cx="160" cy="204" r="10" fill="#FFF" opacity=".85"/>';}
  return g+'<g transform="translate(0 '+(st>=12?-40:0)+')">'+raketeTeile(st)+'</g>';
}
function weltSvg(welt,st,kl){
  st=stufe(st);
  var inhalt=welt==='burg'?weltBurg(st):(welt==='raumschiff'?weltRaumschiff(st):weltBaum(st));
  return '<svg class="km-welt'+(kl?' '+kl:'')+'" viewBox="0 0 320 220" role="img" aria-label="'+esc(weltName(welt))+': Stufe '+st+' von '+STUFEN+'">'+inhalt+'</svg>';
}

/* ---------- Szenen aus dem Schulalltag ---------- */
function person(x,y,o){
  o=o||{};
  var s=o.gross?1.28:1, HT=o.haut||'#E8B48E', SH=o.shirt||'#6FA8DC', HO=o.hose||'#4A5A78', HA=o.haarFarbe||'#3B2A20', d=o.dir||1;
  function X(n){return P(x+n*s);} function Y(n){return P(y-n*s);}
  var g='<g>';
  g+='<rect x="'+X(-9)+'" y="'+Y(31)+'" width="'+P(7.5*s)+'" height="'+P(29*s)+'" rx="'+P(3*s)+'" fill="'+HO+'"/><rect x="'+X(1.5)+'" y="'+Y(31)+'" width="'+P(7.5*s)+'" height="'+P(29*s)+'" rx="'+P(3*s)+'" fill="'+HO+'"/>'+
    '<ellipse cx="'+X(-6)+'" cy="'+Y(2)+'" rx="'+P(6.5*s)+'" ry="'+P(3.2*s)+'" fill="#3A3F4B"/><ellipse cx="'+X(6)+'" cy="'+Y(2)+'" rx="'+P(6.5*s)+'" ry="'+P(3.2*s)+'" fill="#3A3F4B"/>';
  var sl=[-13,60], sr=[13,60], el=[-19,36], er=[19,36];
  switch(o.arme){
    case 'hoch':er=[20,101];break;
    case 'beide':el=[-25,96];er=[25,96];break;
    case 'vor':if(d>0){er=[42,60];}else{el=[-42,60];}break;
    case 'zeigen':if(d>0){er=[38,74];}else{el=[-38,74];}break;
    case 'ohren':el=[-16,82];er=[16,82];break;
    case 'stopp':er=[27,86];break;
    case 'winken':er=[25,99];break;
    case 'halten':el=[-7,47];er=[7,47];break;
  }
  function arm(a,b,gross){return '<path d="M'+X(a[0])+' '+Y(a[1])+'L'+X(b[0])+' '+Y(b[1])+'" stroke="'+SH+'" stroke-width="'+P(7.5*s)+'" stroke-linecap="round"/><circle cx="'+X(b[0])+'" cy="'+Y(b[1])+'" r="'+P((gross?5.6:4)*s)+'" fill="'+HT+'"/>';}
  g+='<rect x="'+X(-15)+'" y="'+Y(68)+'" width="'+P(30*s)+'" height="'+P(40*s)+'" rx="'+P(11*s)+'" fill="'+SH+'"/>';
  g+=arm(sl,el)+arm(sr,er,o.arme==='stopp');
  if(o.arme==='winken'){g+='<path d="M'+X(33)+' '+Y(104)+'q'+P(4*s)+' '+P(3*s)+' 0 '+P(7*s)+'M'+X(37)+' '+Y(99)+'q'+P(4*s)+' '+P(3*s)+' 0 '+P(7*s)+'" stroke="#8C96A8" stroke-width="1.7" fill="none" stroke-linecap="round"/>';}
  g+='<circle cx="'+X(0)+'" cy="'+Y(84)+'" r="'+P(14.5*s)+'" fill="'+HT+'"/>';
  var kappe='<path d="M'+X(-15)+' '+Y(84)+'A'+P(15*s)+' '+P(15*s)+' 0 0 1 '+X(15)+' '+Y(84)+'Q'+X(8)+' '+Y(94)+' '+X(-2)+' '+Y(91)+'Q'+X(-10)+' '+Y(89)+' '+X(-15)+' '+Y(84)+'z" fill="'+HA+'"/>';
  var haar=o.haar||'kurz';
  if(haar==='locken'){[[-12,90],[-6,97],[1,99.5],[8,97],[13,90]].forEach(function(p){g+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+P(5.6*s)+'" fill="'+HA+'"/>';});g+=kappe;}
  else{g+=kappe;}
  if(haar==='lang'){g+='<rect x="'+X(-17)+'" y="'+Y(89)+'" width="'+P(6*s)+'" height="'+P(27*s)+'" rx="'+P(3*s)+'" fill="'+HA+'"/><rect x="'+X(11)+'" y="'+Y(89)+'" width="'+P(6*s)+'" height="'+P(27*s)+'" rx="'+P(3*s)+'" fill="'+HA+'"/>';}
  if(haar==='zopf'){g+='<circle cx="'+X(16)+'" cy="'+Y(94)+'" r="'+P(6.5*s)+'" fill="'+HA+'"/><circle cx="'+X(12)+'" cy="'+Y(92)+'" r="'+P(2.2*s)+'" fill="#E06666"/>';}
  if(haar==='dutt'){g+='<circle cx="'+X(0)+'" cy="'+Y(101)+'" r="'+P(6.5*s)+'" fill="'+HA+'"/>';}
  var a=o.ausdruck||'froh', lin=' stroke="#26262B" stroke-width="'+P(1.8*s)+'" fill="none" stroke-linecap="round"';
  g+='<circle cx="'+X(-5)+'" cy="'+Y(83)+'" r="'+P(1.9*s)+'" fill="#26262B"/><circle cx="'+X(5)+'" cy="'+Y(83)+'" r="'+P(1.9*s)+'" fill="#26262B"/>';
  if(a==='froh'){g+='<path d="M'+X(-5)+' '+Y(77)+'Q'+X(0)+' '+Y(72.5)+' '+X(5)+' '+Y(77)+'"'+lin+'/>';}
  else if(a==='lachend'){g+='<path d="M'+X(-6)+' '+Y(78)+'Q'+X(0)+' '+Y(70)+' '+X(6)+' '+Y(78)+'z" fill="#8A3A3A"/>';}
  else if(a==='traurig'){g+='<path d="M'+X(-5)+' '+Y(74)+'Q'+X(0)+' '+Y(78)+' '+X(5)+' '+Y(74)+'"'+lin+'/>';}
  else if(a==='wuetend'){g+='<path d="M'+X(-8.5)+' '+Y(89.5)+'L'+X(-2.5)+' '+Y(87)+'M'+X(8.5)+' '+Y(89.5)+'L'+X(2.5)+' '+Y(87)+'"'+lin+'/><path d="M'+X(-5)+' '+Y(74)+'Q'+X(0)+' '+Y(77.5)+' '+X(5)+' '+Y(74)+'"'+lin+'/>';}
  else if(a==='ueberrascht'){g+='<ellipse cx="'+X(0)+'" cy="'+Y(75)+'" rx="'+P(2.6*s)+'" ry="'+P(3.2*s)+'" fill="#8A3A3A"/>';}
  else{g+='<path d="M'+X(-4)+' '+Y(75.5)+'L'+X(4)+' '+Y(75.5)+'"'+lin+'/>';}
  if(a==='froh'||a==='lachend'){g+='<circle cx="'+X(-9)+'" cy="'+Y(78)+'" r="'+P(2.6*s)+'" fill="#F28B82" opacity=".35"/><circle cx="'+X(9)+'" cy="'+Y(78)+'" r="'+P(2.6*s)+'" fill="#F28B82" opacity=".35"/>';}
  if(o.du){g+='<rect x="'+X(-15)+'" y="'+Y(121)+'" width="'+P(30*s)+'" height="17" rx="8.5" fill="#2E3A9C"/><text x="'+X(0)+'" y="'+P(y-121*s+12.6)+'" text-anchor="middle" font-size="11.5" font-weight="700" fill="#FFF">du</text>';}
  return g+'</g>';
}
var DU={du:true,haar:'kurz',haarFarbe:'#3B2A20',haut:'#E8B48E',shirt:'#7E8CE0',hose:'#3F4A66'};
function du(x,y,o){var z={};Object.keys(DU).forEach(function(k){z[k]=DU[k];});Object.keys(o||{}).forEach(function(k){z[k]=o[k];});return person(x,y,z);}
function hgKlasse(){return '<rect width="360" height="220" fill="#EEF3F8"/><rect y="168" width="360" height="52" fill="#E6DCCB"/><rect y="166" width="360" height="3" fill="#D5C8B2"/>'+
  '<rect x="16" y="26" width="62" height="62" rx="4" fill="#D6ECFA" stroke="#B8C4D4" stroke-width="3"/><path d="M47 26v62M16 57h62" stroke="#B8C4D4" stroke-width="3"/>';}
function hgHof(){var s='<rect width="360" height="220" fill="#DCEFFA"/><circle cx="322" cy="34" r="15" fill="#F7D154"/><ellipse cx="96" cy="36" rx="26" ry="9" fill="#FFF" opacity=".85"/><ellipse cx="116" cy="30" rx="16" ry="8" fill="#FFF" opacity=".85"/>'+
  '<rect y="160" width="360" height="60" fill="#B7DE9C"/><path d="M0 140h360M0 152h360" stroke="#D9C7A5" stroke-width="3"/>';
  for(var x=62;x<360;x+=24){s+='<rect x="'+x+'" y="132" width="5" height="28" rx="2" fill="#D9C7A5"/>';}
  return s+'<rect x="26" y="96" width="10" height="66" fill="#8B5E3C"/><circle cx="31" cy="88" r="26" fill="#7CC38A"/>';}
function hgFlur(){return '<rect width="360" height="220" fill="#F3EBDD"/><rect y="170" width="360" height="50" fill="#D8CCB6"/>'+
  '<rect x="20" y="58" width="52" height="112" rx="3" fill="#C9A77E"/><circle cx="64" cy="116" r="3" fill="#8B6B4A"/><rect x="288" y="58" width="52" height="112" rx="3" fill="#B8C9DA"/><circle cx="296" cy="116" r="3" fill="#6F7A90"/>'+
  '<path d="M112 70h136" stroke="#C9B89A" stroke-width="3"/><circle cx="132" cy="76" r="3" fill="#A18A6A"/><circle cx="164" cy="76" r="3" fill="#A18A6A"/><circle cx="196" cy="76" r="3" fill="#A18A6A"/><circle cx="228" cy="76" r="3" fill="#A18A6A"/>';}
function hgRaum(){var s='<rect width="360" height="220" fill="#F2ECF5"/><rect y="170" width="360" height="50" fill="#E3D7C6"/><rect x="20" y="70" width="70" height="100" rx="3" fill="#CDB79A"/><path d="M20 103h70M20 136h70" stroke="#B59E80" stroke-width="3"/>';
  [['#E06666',26,80],['#6FA8DC',34,82],['#93C47D',42,79],['#F6B26B',52,84],['#C27BA0',28,113],['#FFD966',36,115],['#76A5AF',46,112]].forEach(function(b){s+='<rect x="'+b[1]+'" y="'+b[2]+'" width="7" height="'+(101-b[2]+(b[2]>100?33:0))+'" rx="1.5" fill="'+b[0]+'"/>';});
  return s+'<ellipse cx="200" cy="202" rx="110" ry="13" fill="#D9C8E6"/>';}
function tisch(x,y,w){return '<rect x="'+(x-w/2)+'" y="'+(y-42)+'" width="'+w+'" height="7" rx="2" fill="#C99A6B"/><rect x="'+(x-w/2+5)+'" y="'+(y-35)+'" width="'+(w-10)+'" height="35" fill="#D9B38C"/>';}
function tafel(x,y,w,h,text,gr){gr=gr||18;return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="#2F5D50" stroke="#8A6A4A" stroke-width="4"/>'+(text?'<text x="'+(x+w/2)+'" y="'+P(y+h/2+gr*0.36)+'" text-anchor="middle" font-size="'+gr+'" font-weight="700" fill="#F4F1E8">'+esc(text)+'</text>':'');}
function blase(x,y,text,tx,ty){
  var w=Math.max(64,Math.round(text.length*6.7+26)), h=28, mx=Math.max(x+16,Math.min(x+w-16,tx));
  return '<path d="M'+(mx-7)+' '+(y+h-1)+'L'+tx+' '+ty+'L'+(mx+7)+' '+(y+h-1)+'z" fill="#FFF" stroke="#C9CFDA" stroke-width="1.5"/><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="14" fill="#FFF" stroke="#C9CFDA" stroke-width="1.5"/>'+
    '<path d="M'+(mx-5.5)+' '+(y+h-1)+'h11" stroke="#FFF" stroke-width="3"/><text x="'+P(x+w/2)+'" y="'+(y+18.5)+'" text-anchor="middle" font-size="12.5" fill="#1D2433">'+esc(text)+'</text>';}
function ball(x,y,r){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#F2994A" stroke="#C9722F" stroke-width="1.5"/><path d="M'+(x-r)+' '+y+'Q'+x+' '+(y-r*0.6)+' '+(x+r)+' '+y+'M'+x+' '+(y-r)+'Q'+(x+r*0.5)+' '+y+' '+x+' '+(y+r)+'" stroke="#C9722F" stroke-width="1.3" fill="none"/>';}
function stift(x,y,w){return '<g transform="translate('+x+' '+y+') rotate('+w+')"><rect x="-14" y="-3.2" width="22" height="6.4" fill="#F2C94C"/><path d="M8-3.2L15.5 0 8 3.2z" fill="#E8C39E"/><path d="M13.3-1.1L15.5 0l-2.2 1.1z" fill="#3A3F4B"/><rect x="-17.5" y="-3.2" width="3.5" height="6.4" fill="#F28B82"/></g>';}
function laut(x,y){return '<path d="M'+x+' '+y+'l6-6 6 6 6-6 6 6" stroke="#E0533D" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M'+(x+4)+' '+(y-9)+'l5-5 5 5 5-5" stroke="#E0533D" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>';}
function papier(x,y){return '<rect x="'+(x-11)+'" y="'+(y-14)+'" width="22" height="26" rx="2" fill="#FFF" stroke="#C9CFDA" stroke-width="1.5"/><circle cx="'+x+'" cy="'+(y-3)+'" r="5.5" fill="#F7D154"/><rect x="'+(x-2.5)+'" y="'+(y+2)+'" width="5" height="4" rx="1" fill="#8C96A8"/>';}
function bewegung(x,y){return '<path d="M'+x+' '+y+'h10M'+(x-3)+' '+(y+7)+'h14M'+x+' '+(y+14)+'h10" stroke="#8C96A8" stroke-width="2.2" stroke-linecap="round"/>';}
function szeneInhalt(id){
  switch(id){
    case 'stift':return hgKlasse()+tafel(122,22,128,60,'')+du(118,206,{ausdruck:'ueberrascht'})+tisch(118,200,96)+
      person(250,210,{ausdruck:'lachend',haar:'locken',haarFarbe:'#1F1F1F',haut:'#C98E62',shirt:'#F6B26B',hose:'#5B6B8C',arme:'vor',dir:-1})+stift(206,150,-10);
    case 'verlieren':return hgHof()+ball(190,200,10)+du(118,206,{ausdruck:'traurig'})+
      person(262,206,{ausdruck:'lachend',haar:'zopf',haarFarbe:'#C68642',haut:'#F6D2B3',shirt:'#93C47D',arme:'beide'})+blase(210,34,'Gewonnen!',254,98);
    case 'test':return hgKlasse()+tafel(132,18,120,56,'TEST',22)+
      person(320,206,{gross:true,ausdruck:'froh',haar:'lang',haarFarbe:'#6B4E33',haut:'#F1C7A0',shirt:'#76A5AF',hose:'#44546A',arme:'zeigen',dir:-1})+
      du(84,206,{ausdruck:'ueberrascht'})+tisch(84,200,92)+blase(104,84,'Heute gibt es einen Test!',300,100);
    case 'auslachen':return hgFlur()+du(96,206,{ausdruck:'traurig'})+
      person(236,206,{ausdruck:'lachend',haar:'kurz',haarFarbe:'#1F1F1F',haut:'#8D5A3B',shirt:'#C27BA0',arme:'zeigen',dir:-1})+
      person(282,206,{ausdruck:'lachend',haar:'lang',haarFarbe:'#E0C068',haut:'#F6D2B3',shirt:'#FFD966',arme:'halten'})+
      '<text x="258" y="96" text-anchor="middle" font-size="13" font-style="italic" fill="#8C96A8">hihi</text>';
    case 'aufhoeren':return hgHof()+du(118,206,{ausdruck:'traurig',arme:'halten'})+ball(118,158,11)+
      person(274,206,{gross:true,ausdruck:'froh',haar:'kurz',haarFarbe:'#1F1F1F',haut:'#C98E62',shirt:'#6FA8DC',arme:'winken'})+blase(140,38,'Die Pause ist vorbei!',262,86);
    case 'laut':return hgKlasse()+tafel(124,20,120,50,'')+
      person(56,196,{ausdruck:'lachend',haar:'locken',haarFarbe:'#3B2A20',haut:'#C98E62',shirt:'#F6B26B',arme:'beide'})+
      person(250,192,{ausdruck:'lachend',haar:'kurz',haarFarbe:'#A0522D',haut:'#F6D2B3',shirt:'#C27BA0'})+
      person(306,196,{ausdruck:'lachend',haar:'zopf',haarFarbe:'#1F1F1F',haut:'#F1C7A0',shirt:'#93C47D',arme:'hoch'})+
      laut(70,72)+laut(232,80)+laut(286,70)+du(170,210,{ausdruck:'wuetend',arme:'ohren'})+tisch(170,202,110);
    case 'fehler':return hgKlasse()+tafel(96,20,168,64,'3 + 4 = 8',24)+'<ellipse cx="232" cy="53" rx="15" ry="18" fill="none" stroke="#E0533D" stroke-width="3"/>'+
      du(130,208,{ausdruck:'ueberrascht',arme:'zeigen',dir:1})+
      person(282,212,{ausdruck:'lachend',haar:'lang',haarFarbe:'#3B2A20',haut:'#8D5A3B',shirt:'#76A5AF'})+tisch(282,204,96);
    case 'schubsen':return hgFlur()+person(306,206,{ausdruck:'neutral',haar:'dutt',haarFarbe:'#6B4E33',haut:'#F1C7A0',shirt:'#FFD966'})+
      du(204,206,{ausdruck:'ueberrascht'})+person(134,206,{ausdruck:'wuetend',haar:'kurz',haarFarbe:'#1F1F1F',haut:'#E8B48E',shirt:'#E06666',arme:'vor',dir:1})+bewegung(178,138);
    case 'nichtdran':return hgKlasse()+tafel(120,20,120,50,'')+du(84,208,{ausdruck:'froh',arme:'hoch'})+tisch(84,200,86)+
      person(196,208,{ausdruck:'froh',haar:'zopf',haarFarbe:'#C68642',haut:'#F6D2B3',shirt:'#93C47D',arme:'hoch'})+tisch(196,200,86)+
      person(312,206,{gross:true,ausdruck:'froh',haar:'lang',haarFarbe:'#3B2A20',haut:'#C98E62',shirt:'#76A5AF',arme:'zeigen',dir:-1})+blase(226,40,'Ja, bitte!',292,84);
    case 'allein':return hgHof()+'<rect x="44" y="176" width="74" height="8" rx="3" fill="#B08A5E"/><path d="M52 184v14M110 184v14" stroke="#8B6B4A" stroke-width="4"/>'+
      du(84,206,{ausdruck:'traurig'})+person(236,206,{ausdruck:'lachend',haar:'kurz',haarFarbe:'#3B2A20',haut:'#C98E62',shirt:'#F6B26B',arme:'beide'})+
      person(310,206,{ausdruck:'froh',haar:'lang',haarFarbe:'#1F1F1F',haut:'#F6D2B3',shirt:'#C27BA0',arme:'vor',dir:-1})+ball(272,150,10);
    case 'nein':return hgRaum()+du(126,206,{ausdruck:'froh',arme:'halten'})+papier(126,160)+
      person(262,206,{gross:true,ausdruck:'neutral',haar:'kurz',haarFarbe:'#6B4E33',haut:'#E8B48E',shirt:'#6FA8DC',arme:'stopp'})+blase(150,42,'Nein, heute nicht.',250,92);
    case 'wechsel':return hgKlasse()+'<rect x="276" y="60" width="62" height="108" rx="3" fill="#C9A77E"/><circle cx="286" cy="116" r="3" fill="#8B6B4A"/>'+
      person(306,206,{gross:true,ausdruck:'froh',haar:'locken',haarFarbe:'#A0522D',haut:'#F1C7A0',shirt:'#C27BA0',arme:'winken'})+
      du(118,208,{ausdruck:'ueberrascht'})+tisch(118,200,96)+blase(132,36,'Hallo! Heute bin ich da.',290,84);
  }
  return hgKlasse();
}
function szeneSvg(id,kl){return '<svg class="km-szene'+(kl?' '+kl:'')+'" viewBox="0 0 360 220" role="img" aria-label="'+esc(szeneTitel(id))+'">'+szeneInhalt(id)+'</svg>';}

/* ---------- Thermometer, Ampel, Gesichter, Sterne, Symbole ---------- */
function thermoSvg(n){
  var g='<svg class="km-thermo-svg" viewBox="0 0 90 280" aria-hidden="true"><rect x="31" y="10" width="28" height="206" rx="14" fill="#FFF" stroke="#C9CFDA" stroke-width="3"/>';
  for(var i=1;i<=5;i++){var y=214-i*40;g+='<rect x="36" y="'+(y+2)+'" width="18" height="36" rx="7" fill="'+(n>=i?THERMO[i][1]:'#EEF1F5')+'"/>';}
  return g+'<circle cx="45" cy="240" r="30" fill="'+(n?THERMO[n][1]:'#DDE3EA')+'" stroke="#C9CFDA" stroke-width="3"/></svg>';
}
function ampelSvg(aktiv,kl){
  var L=[['rot','#EB5757',62],['gelb','#F2C94C',150],['gruen','#4CB782',238]];
  var g='<svg class="km-ampel-svg'+(kl?' '+kl:'')+'" viewBox="0 0 124 330" aria-hidden="true"><rect x="52" y="290" width="20" height="40" fill="#5B6275"/><rect x="12" y="10" width="100" height="284" rx="30" fill="#2B3140"/>';
  L.forEach(function(l){var an=aktiv===l[0]||aktiv==='alle';g+=(an&&aktiv!=='alle'?'<circle cx="62" cy="'+l[2]+'" r="45" fill="'+l[1]+'" opacity=".28"/>':'')+'<circle cx="62" cy="'+l[2]+'" r="34" fill="'+(an?l[1]:'#454C5E')+'"/>';});
  return g+'</svg>';
}
function gesichtSvg(p){
  var mund=p===2?'<path d="M30 58q18 18 36 0" stroke="#2B2B2B" stroke-width="5" fill="none" stroke-linecap="round"/>':(p===1?'<path d="M32 62q16 6 32 0" stroke="#2B2B2B" stroke-width="5" fill="none" stroke-linecap="round"/>':'<path d="M34 64h28" stroke="#2B2B2B" stroke-width="5" stroke-linecap="round"/>');
  return '<svg class="km-gesicht-svg" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="44" fill="'+BEWERTUNG[p][1]+'"/><circle cx="34" cy="40" r="6" fill="#2B2B2B"/><circle cx="62" cy="40" r="6" fill="#2B2B2B"/>'+mund+'</svg>';
}
function stern(an,kl){return '<svg class="km-stern'+(an?' an':'')+(kl?' '+kl:'')+'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.8 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.8 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/></svg>';}
function sterneHtml(n){var s='';for(var i=0;i<n;i++){s+=stern(true);}return '<span class="km-sterne" aria-label="'+n+(n===1?' Stern':' Sterne')+'">'+s+'</span>';}
var STRAT_ICON={
  atmen:'<path d="M8 18h22a6 6 0 1 0-6-6"/><path d="M8 26h30a6 6 0 1 1-6 6"/><path d="M8 34h14"/>',
  zaehlen:'<rect x="6" y="10" width="36" height="28" rx="6"/><path d="M13 20l3-2v12M21 20a3 3 0 1 1 5 2l-5 6h6M31 18h5l-3 4a3.5 3.5 0 1 1-3 5"/>',
  weggehen:'<path d="M10 40V8h18v32"/><path d="M28 24h12M35 19l5 5-5 5"/><circle cx="23" cy="24" r="1.6"/>',
  pausenkarte:'<rect x="8" y="10" width="32" height="28" rx="5"/><path d="M19 31V17h5a4 4 0 0 1 0 8h-5"/>',
  hilfe:'<path d="M20 38V16a3 3 0 0 1 6 0v10M26 22a3 3 0 0 1 6 0v6M32 24a3 3 0 0 1 6 0v6c0 6-4 10-10 10h-3c-4 0-6-2-8-5l-5-7a3 3 0 0 1 5-3l2 3"/>',
  druecken:'<path d="M12 30c0-8 4-14 12-14s12 6 12 14"/><path d="M8 34h32"/><path d="M16 12l-3-4M24 10V6M32 12l3-4"/>',
  trinken:'<path d="M14 10h20l-3 30H17z"/><path d="M15.5 22h17"/>',
  eigene:'<path d="M24 7l4.9 10.2 11.1 1.4-8.2 7.7 2.1 11-9.9-5.4-9.9 5.4 2.1-11-8.2-7.7 11.1-1.4z"/>'
};
function stratIcon(id){return '<svg class="km-s-icon" viewBox="0 0 48 48" aria-hidden="true">'+(STRAT_ICON[id]||STRAT_ICON.eigene)+'</svg>';}
var I_SCHLOSS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>';
var I_LINKS='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
var I_LAUT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
function atemRaketeSvg(kl){
  return '<svg class="km-atem-svg'+(kl?' '+kl:'')+'" viewBox="0 0 200 300" aria-hidden="true"><rect width="200" height="300" rx="24" fill="#27345E"/>'+
    [[26,34],[64,70],[150,28],[176,96],[36,140],[168,168],[110,54],[20,220],[180,236]].map(function(p,i){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(i%3?1.6:2.4)+'" fill="#FFF" opacity=".85"/>';}).join('')+
    '<rect y="270" width="200" height="30" fill="#3B4766"/><g class="km-atem-rakete"><rect x="80" y="170" width="40" height="80" rx="8" fill="#E6EBF2"/><path d="M80 174q20-54 40 0z" fill="#E0533D"/>'+
    '<circle cx="100" cy="196" r="10" fill="#7FC8F8" stroke="#5A6478" stroke-width="3"/><path d="M81 222l-19 34 19-6zM119 222l19 34-19-6z" fill="#E0533D"/><rect x="80" y="226" width="40" height="6" fill="#3D7DD8"/>'+
    '<path d="M88 250h24l4 10H84z" fill="#5A6478"/><path class="km-flamme" d="M86 260q14 30 28 0z" fill="#F2994A"/></g></svg>';
}
function glasSvg(){return '<svg class="km-glas" viewBox="0 0 80 100" aria-hidden="true"><path d="M14 8h52l-7 84H21z" fill="#EAF6FD" stroke="#9CB6CC" stroke-width="3"/><path class="km-wasser" d="M18 34h44l-5 56H23z" fill="#7FC8F8"/></svg>';}

/* =====================================================================
   Karte im Begleitplan (für die Erwachsenen)
   ===================================================================== */
function karte(d,r){
  if(!bausteine()){return '';}
  var km=kmVon(d);
  if(!km){
    if(!r||!r.bearbeiten){return '';}
    return '<section class="ar-karte km-karte leer" id="km-karte"><div class="km-k-leer">'+figurSvg('fuchs','klein')+'<div><h3>Kindmodus</h3><p class="ar-leise">Das Kind übt selbst: das Wochenziel als kleine Welt (Ziel-Quest) und Gefühle steuern mit der Stopp-Ampel. Ohne Menüs und ohne Dossierdaten; beenden nur mit Code.</p></div>'+
      '<button class="btn keindruck" type="button" data-km="einrichten">'+svg('plus')+'Einrichten</button></div></section>';
  }
  var h0=heute(), mo=montag(h0), wo=woche(km,mo), st=sterneWoche(wo), schwelle=(wo&&wo.schwelle)||km.schwelle||8, A=auswertung(km,plusTage(h0,-27),h0);
  var tage=[0,1,2,3,4].map(function(i){return plusTage(mo,i);});
  var tageHtml='<ol class="km-k-tage" aria-label="Ziel-Quest diese Woche">'+tage.map(function(t){var x=wo&&wo.tage&&wo.tage[t];
    return '<li'+(t===h0?' class="heute"':'')+'><span>'+TAGE_KURZ[wtag(t)]+'</span><b>'+(x?sterneTag(x)+' ★':'–')+'</b>'+(x?'<small>'+(x.k===x.e?'einig':'K '+x.k+' · E '+x.e)+'</small>':'')+'</li>';}).join('')+'</ol>';
  var z=[];
  if(A.ampel){z.push('<b>'+A.ampel+(A.ampel===1?' Runde':' Runden')+' Stopp-Ampel</b> in den letzten vier Wochen');}
  if(A.strategien.length){z.push('Am häufigsten gewählt: '+esc(stratText(km,A.strategien[0].id))+' ('+A.strategien[0].n+'×)');}
  if(A.vor!=null){z.push('Thermometer, vom Kind eingeschätzt: ohne Strategie Ø '+zahl(A.vor)+', mit Strategie Ø '+zahl(A.nach));}
  if(A.signale.length){z.push('Körpersignale: '+A.signale.slice(0,3).map(function(s){return esc(signalText(s.id))+' ('+s.n+'×)';}).join(', '));}
  if(A.atem){z.push('Atem-Raumschiff: '+A.atem+'× ('+A.atemMin+' Min.)');}
  return '<section class="ar-karte km-karte" id="km-karte"><div class="ar-kartenkopf"><div><h3>Kindmodus</h3><span class="ar-leise">„'+esc(km.spitzname)+'“ · '+esc(figurName(km.figur))+' · Welt: '+esc(weltName(km.welt))+'</span></div>'+
      (r&&r.bearbeiten?'<span class="ar-knopfreihe keindruck"><button class="btn primary" type="button" data-km="start">'+svg('spiel')+'Kindmodus starten</button><button class="btn" type="button" data-km="einrichten">'+svg('edit')+'Einstellungen</button></span>':'')+'</div>'+
    '<div class="km-k-raster"><div class="km-k-quest">'+weltSvg(km.welt,st,'klein')+'<div><p class="km-k-ziel"><span class="ar-leise">Wochenziel</span> „'+esc((wo&&wo.ziel)||km.ziel)+'“'+(km.code?' <span class="bp-code">'+esc(km.code)+'</span>':'')+'</p>'+
      '<p><b>Diese Woche: '+st+(st===1?' Stern':' Sterne')+'</b> · Belohnung ab '+schwelle+(wo&&wo.belohnung?' · gewählt: '+esc(wo.belohnung):'')+'</p>'+tageHtml+'</div></div>'+
    '<div class="km-k-ampel">'+(z.length?'<ul>'+z.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul>':'<p class="ar-leise">Noch keine Runde geübt. Startet den Kindmodus gemeinsam: Stopp-Ampel und Atem-Raumschiff dauern je drei bis fünf Minuten.</p>')+'</div></div>'+
    '<p class="ar-klein">Sterne: Einschätzung der Erwachsenen (0–2) und ein Extra-Stern, wenn Kind und Erwachsene gleich einschätzen (K = Kind, E = Erwachsene). Die Thermometer-Werte schätzt das Kind selbst – sie zeigen, was es sich zutraut, keine Messung.</p></section>';
}
/* Eine Zeile für den Überblick und das Übergabeblatt */
function kurz(d){
  var km=kmVon(d);if(!km){return '';}
  var h0=heute(), wo=woche(km,montag(h0)), st=sterneWoche(wo), A=auswertung(km,plusTage(h0,-27),h0), t=[];
  if(wo){t.push('Ziel-Quest diese Woche '+st+(st===1?' Stern':' Sterne')+' (Belohnung ab '+(wo.schwelle||km.schwelle||8)+')');}
  if(A.ampel){t.push(A.ampel+(A.ampel===1?' Runde':' Runden')+' Stopp-Ampel in vier Wochen');}
  return t.length?'Kindmodus: '+t.join(' · '):'Kindmodus eingerichtet, noch nicht gespielt';
}
/* Kennzahlen für die Überprüfung im Begleitplan: im Zeitraum (Filter über das Datum) */
function kennzahlen(d,imZeitraum){
  var km=kmVon(d);if(!km){return null;}
  var q=questTage(km,'','').filter(function(x){return imZeitraum(x.datum);}), rr=(km.runden||[]).filter(function(x){return x&&imZeitraum(String(x.z||'').slice(0,10));});
  var amp=rr.filter(function(x){return x.spiel==='ampel';}).length, atem=rr.filter(function(x){return x.spiel==='atem';}).length;
  if(!q.length&&!amp&&!atem){return null;}
  return {quest:q.length,sterne:q.length?Math.round(q.reduce(function(a,x){return a+x.sterne;},0)/q.length*10)/10:0,einig:q.filter(function(x){return x.einig;}).length,ampel:amp,atem:atem};
}
function kennzahlText(x){
  if(!x){return '';}
  var t=[];
  if(x.quest){t.push('Ziel-Quest an '+x.quest+(x.quest===1?' Tag':' Tagen')+' (Ø '+zahl(x.sterne)+' Sterne, '+x.einig+'× einig)');}
  if(x.ampel){t.push(x.ampel+(x.ampel===1?' Runde':' Runden')+' Stopp-Ampel');}
  if(x.atem){t.push(x.atem+'× Atem-Raumschiff');}
  return t.length?'Kindmodus: '+t.join(', '):'';
}
/* Für den Verlauf (D1): Sterne je Tag und geübte Runden */
function verlaufDaten(d,ab,bis){
  var km=kmVon(d);if(!km){return null;}
  return {tage:questTage(km,ab,bis),runden:rundenIn(km,ab,bis).map(function(x){return {datum:String(x.z).slice(0,10),spiel:x.spiel};})};
}

/* =====================================================================
   Einrichten und Starten (Dialoge für die Erwachsenen)
   ===================================================================== */
function aktuell(){return H&&H.aktDossier?H.aktDossier():null;}
function einrichtenDialog(d){
  var km=kmVon(d)||{}, TK=window.CDSE_TAGESKARTE, tk=TK&&TK.karteVon?TK.karteVon(d):null, vs=[];
  if(tk){(tk.ziele||[]).filter(function(z){return z&&!z.aus&&z.text;}).forEach(function(z){vs.push({text:z.text,code:z.code||'',kind:true});});}
  var A=H.eldibAuswertung?H.eldibAuswertung(d):null;
  ((d.begleitplan||{}).fokus||[]).filter(Boolean).forEach(function(c){
    var z=A?A.ziele.filter(function(y){return y.code===c;})[0]:null, inf=H.itemZu?H.itemZu(c):null, t=(z&&z.text)||(inf&&inf.it&&(inf.it.text||inf.it.keyword))||'';
    if(t&&!vs.some(function(v){return v.code===c&&v.kind;})){vs.push({text:t,code:c,kind:false});}
  });
  var vn=String((d.person||{}).vorname||'').trim().split(/\s+/)[0]||'';
  var startZiel=km.ziel||(vs[0]&&vs[0].kind?vs[0].text:''), startCode=km.ziel?(km.code||''):(vs[0]&&vs[0].kind?vs[0].code:'');
  var inhalt='<p>Im Kindmodus übt das Kind selbst – immer zusammen mit einer erwachsenen Person. Es sieht nur seinen Spitznamen, seine Figur, sein Wochenziel und die Übungen, nichts aus dem Dossier. Gespeichert werden nur Sterne und geübte Runden.</p>'+
    '<div class="ar-raster2">'+H.feld('spitzname','Spitzname (so heißt das Kind im Spiel)',km.spitzname||vn,'text',' maxlength="20"')+
      H.auswahl('schwelle','Belohnung ab … Sternen pro Woche',String(km.schwelle||8),[4,5,6,7,8,9,10,11,12].map(function(n){return [String(n),n+' von '+MAX_WOCHE+' Sternen'];}))+'</div>'+
    '<fieldset class="km-e-wahl km-e-figuren"><legend>Spielfigur</legend>'+FIGUREN.map(function(f){return '<label><input type="radio" name="figur" value="'+f[0]+'"'+((km.figur||'fuchs')===f[0]?' checked':'')+'>'+figurSvg(f[0])+'<span>'+esc(f[1])+'</span></label>';}).join('')+'</fieldset>'+
    '<fieldset class="km-e-wahl km-e-welten"><legend>Welt der Ziel-Quest</legend>'+WELTEN.map(function(w){return '<label><input type="radio" name="welt" value="'+w[0]+'"'+((km.welt||'baum')===w[0]?' checked':'')+'>'+weltSvg(w[0],8)+'<span><b>'+esc(w[1])+'</b> '+esc(w[2])+'</span></label>';}).join('')+'</fieldset>'+
    (vs.length?H.auswahl('vorschlag','Wochenziel aus dem Begleitplan übernehmen','',vs.map(function(v,i){return [String(i),(v.kind?'Tageskarte: ':'Fokusziel '+v.code+': ')+v.text];}),'– selbst formulieren –'):'')+
    H.feld('ziel','Wochenziel, so wie das Kind es sagt',startZiel,'text',' maxlength="90" placeholder="z. B. Ich melde mich, bevor ich rede."')+'<input type="hidden" name="code" value="'+esc(startCode)+'">'+
    '<fieldset class="km-e-strat"><legend>Strategien für die Stopp-Ampel <span class="ar-leise">(zwei bis vier, die im Alltag wirklich erlaubt sind)</span></legend><div class="km-e-haken">'+
      STRAT_REIHE.map(function(id){return '<label class="ar-haken"><input type="checkbox" name="s_'+id+'"'+((km.strategien||['atmen','weggehen','hilfe']).indexOf(id)>=0?' checked':'')+'> '+esc(STRATEGIEN[id].erw)+'</label>';}).join('')+'</div>'+
      H.feld('eigene','Eigene Strategie (optional)',km.eigene||'','text',' maxlength="60" placeholder="z. B. Knautschball drücken"')+'</fieldset>'+
    '<fieldset class="km-e-bel"><legend>Belohnungen zur Auswahl <span class="ar-leise">(optional, bis zu drei)</span></legend><div class="ar-raster2">'+[0,1,2].map(function(i){
      return H.feld('b'+i,'Belohnung '+(i+1),(km.belohnungen||[])[i]||'','text',' maxlength="60" placeholder="'+['z. B. 10 Minuten Lieblingsspiel','z. B. Den Ball für die Pause aussuchen','z. B. Einen Sticker aussuchen'][i]+'"');}).join('')+'</div></fieldset>';
  H.dialog(kmVon(d)?'Kindmodus ändern':'Kindmodus einrichten',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){
      var f=dlg.querySelector('form');if(!f.elements.vorschlag){return;}
      f.elements.vorschlag.addEventListener('change',function(){
        var i=f.elements.vorschlag.value, v=vs[+i];if(i===''||!v){return;}
        f.elements.code.value=v.code||'';
        if(v.kind){f.elements.ziel.value=v.text;}else{f.elements.ziel.value='';f.elements.ziel.placeholder='In Kindersprache, z. B. für „'+v.text.slice(0,50)+'“';f.elements.ziel.focus();}
      });
      f.elements.ziel.addEventListener('input',function(){if(f.elements.vorschlag.value===''){f.elements.code.value=km.ziel&&f.elements.ziel.value===km.ziel?(km.code||''):'';}});
    },
    pruefen:function(w){
      var x=w.werte;
      if(!String(x.spitzname||'').trim()){return 'Bitte einen Spitznamen eintragen.';}
      if(!String(x.ziel||'').trim()){return 'Bitte das Wochenziel so eintragen, wie das Kind es sagt.';}
      if(!STRAT_REIHE.some(function(id){return x['s_'+id];})&&!String(x.eigene||'').trim()){return 'Bitte mindestens eine Strategie für die Stopp-Ampel wählen.';}
      return '';
    },
    ausfuehren:function(w){var x=w.werte;
      return T.ops.kindmodus(d.id,{spitzname:x.spitzname,figur:x.figur,welt:x.welt,ziel:x.ziel,code:x.code,schwelle:+x.schwelle,
        belohnungen:[x.b0,x.b1,x.b2],strategien:STRAT_REIHE.filter(function(id){return x['s_'+id];}),eigene:x.eigene});}})
  .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Kindmodus gespeichert');}});
}
function zufall(){var b=new Uint8Array(12);try{crypto.getRandomValues(b);}catch(e){for(var i=0;i<b.length;i++){b[i]=Math.floor(Math.random()*256);}}return Array.prototype.map.call(b,function(x){return (x<16?'0':'')+x.toString(16);}).join('');}
function cyrb53(str){var h1=0xdeadbeef,h2=0x41c6ce57;for(var i=0;i<str.length;i++){var ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(16);}
function pruefwert(pin,salz){
  var text='cdse-kindmodus|'+salz+'|'+pin;
  try{if(window.crypto&&crypto.subtle&&window.TextEncoder){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(function(b){return 'sha256:'+Array.prototype.map.call(new Uint8Array(b),function(x){return (x<16?'0':'')+x.toString(16);}).join('');},function(){return 'c53:'+cyrb53(text);});}}catch(e){}
  return Promise.resolve('c53:'+cyrb53(text));
}
function sitzLesen(){try{var z=JSON.parse(sessionStorage.getItem(SITZ)||'null');return z&&z.h&&z.s?z:null;}catch(e){return null;}}
function sitzSetzen(z){try{sessionStorage.setItem(SITZ,JSON.stringify(z));}catch(e){}}
function sitzLoeschen(){try{sessionStorage.removeItem(SITZ);}catch(e){}}
function startDialog(d){
  var inhalt='<p>Das Kind sieht jetzt nur noch seinen Spitznamen, seine Figur, sein Wochenziel und die Übungen. <b>Bleib dabei</b> – die Quest schätzt ihr gemeinsam ein.</p>'+
    '<p>Zum Beenden brauchst du einen <b>Code mit vier Ziffern</b>. Denk dir einen aus und merk ihn dir; er gilt nur für diesen Kindmodus.</p>'+
    '<div class="ar-raster2">'+H.feld('pin','Code (4 Ziffern)','','password',' inputmode="numeric" maxlength="4" autocomplete="off"')+H.feld('pin2','Code wiederholen','','password',' inputmode="numeric" maxlength="4" autocomplete="off"')+'</div>'+
    '<label class="ar-haken"><input type="checkbox" name="voll" checked> Im Vollbild starten</label>';
  H.dialog('Kindmodus starten',inhalt,[{text:'Abbrechen',wert:''},{text:'Starten',wert:'ok',primaer:true}],{
    pruefen:function(w){if(!/^\d{4}$/.test(w.werte.pin||'')){return 'Bitte einen Code mit genau vier Ziffern eingeben.';}if(w.werte.pin!==w.werte.pin2){return 'Die beiden Codes sind nicht gleich.';}return '';},
    ausfuehren:function(w){
      if(w.werte.voll&&document.documentElement.requestFullscreen&&!document.fullscreenElement){try{var p=document.documentElement.requestFullscreen();if(p&&p.catch){p.catch(function(){});}}catch(e){}}
      var salz=zufall();
      return pruefwert(w.werte.pin,salz).then(function(h){sitzSetzen({h:h,s:salz,id:d.id,seit:new Date().toISOString(),fehl:0,bis:0});return true;});
    }})
  .then(function(res){
    if(res&&res.ergebnis){
      /* frischen Stand laden (z. B. wenn jemand anderes inzwischen eingetragen hat) */
      T.dossier(d.id,true).then(function(frisch){starten(frisch||d);},function(){starten(d);});
    }else if(document.fullscreenElement&&document.exitFullscreen){document.exitFullscreen().catch(function(){});}
  });
}

/* =====================================================================
   Der Bildschirm für das Kind
   ===================================================================== */
var S={aktiv:false};
function stopTimer(){if(S.timer){clearTimeout(S.timer);}if(S.intervall){clearInterval(S.intervall);}S.timer=S.intervall=null;}
function warte(ms,fn){if(S.timer){clearTimeout(S.timer);}S.timer=setTimeout(fn,ms*TEMPO);}
function starten(d){
  if(!bausteine()){return;}
  S={aktiv:true,d:d,km:kmVon(d),schirm:'start',quest:{},runde:null,uebung:null,atem:null,pin:null,meldung:'',neu:{runden:0,quest:false,atem:0}};
  if(!S.km){S.aktiv=false;sitzLoeschen();return;}
  oeffnen();
}
function dlgEl(){return document.getElementById('km-dialog');}
function oeffnen(){
  var dlg=dlgEl();
  if(!dlg){
    dlg=document.createElement('dialog');dlg.id='km-dialog';dlg.className='km';dlg.setAttribute('aria-label','Kindmodus');
    dlg.addEventListener('cancel',function(e){e.preventDefault();});
    dlg.addEventListener('close',function(){if(S.aktiv){try{dlg.showModal();}catch(e){}}});
    dlg.addEventListener('click',klick);
    document.body.appendChild(dlg);
  }
  document.body.classList.add('km-an');
  if(!dlg.open){try{dlg.showModal();}catch(e){dlg.setAttribute('open','');}}
  zeichnen();
}
function schliessen(){
  S.aktiv=false;stopTimer();
  try{if(SPRACHE){window.speechSynthesis.cancel();}}catch(e){}
  var dlg=dlgEl();if(dlg){try{dlg.close();}catch(e){}dlg.remove();}
  document.body.classList.remove('km-an');
  if(document.fullscreenElement&&document.exitFullscreen){document.exitFullscreen().catch(function(){});}
}
function beenden(){
  var d=S.d, neu=S.neu||{};
  sitzLoeschen();schliessen();
  if(d&&bausteine()){
    H.dossierZeichnen(d);
    var t=[];if(neu.quest){t.push('Quest eingetragen');}if(neu.runden){t.push(neu.runden+(neu.runden===1?' Runde':' Runden')+' Stopp-Ampel');}if(neu.atem){t.push(neu.atem+'× Atem-Raumschiff');}
    H.toast('Kindmodus beendet'+(t.length?' · '+t.join(' · '):''));
  }
  S={aktiv:false};
}
function schirm(n){stopTimer();S.schirm=n;S.meldung='';zeichnen();}
function vorlesen(t){return SPRACHE?'<button type="button" class="km-vorlesen" data-k="vorlesen" data-text="'+esc(t)+'" aria-label="Vorlesen" title="Vorlesen">'+I_LAUT+'</button>':'';}
function sprich(t){if(!SPRACHE||!t){return;}try{window.speechSynthesis.cancel();var u=new window.SpeechSynthesisUtterance(t);u.lang='de-DE';u.rate=0.9;window.speechSynthesis.speak(u);}catch(e){}}
function kopf(titel,zurueck){
  return '<header class="km-kopf">'+(zurueck?'<button type="button" class="km-zurueck" data-k="'+zurueck+'">'+I_LINKS+'<span>Zurück</span></button>':'<span></span>')+
    '<h1 class="km-titel'+(titel?'':' km-sr')+'">'+esc(titel||'Kindmodus')+'</h1><button type="button" class="km-schloss" data-k="sperre" aria-label="Beenden – nur für Erwachsene" title="Beenden – nur für Erwachsene">'+I_SCHLOSS+'</button></header>';
}
function zeichnen(){
  var dlg=dlgEl();if(!dlg){return;}
  var h;
  if(S.neuGeladen){h='<div class="km-rahmen km-leer-rahmen"></div>';}
  else{
    switch(S.schirm){
      case 'quest':h=questHtml();break;
      case 'szenen':h=szenenHtml();break;
      case 'szene':h=szeneHtml();break;
      case 'thermo':h=thermoHtml(false);break;
      case 'rot':h=rotHtml();break;
      case 'gelb':h=gelbHtml();break;
      case 'gruen':h=gruenHtml();break;
      case 'nach':h=thermoHtml(true);break;
      case 'lob':h=lobHtml();break;
      case 'atem':h=atemSchirmHtml();break;
      default:h=startHtml();
    }
    h='<div class="km-rahmen km-s-'+S.schirm+'">'+h+'</div>';
  }
  h+=(S.meldung?'<p class="km-meldung" role="alert">'+esc(S.meldung)+'</p>':'')+(S.pin?pinHtml():'');
  /* Welcher Knopf hatte den Fokus? Nach dem Neuzeichnen denselben wieder fokussieren */
  var ak=document.activeElement, merk=null;
  if(ak&&dlg.contains(ak)&&ak.getAttribute&&ak.getAttribute('data-k')){merk='[data-k="'+ak.getAttribute('data-k')+'"]'+['data-p','data-n','data-id','data-i','data-z','data-min'].map(function(x){var v=ak.getAttribute(x);return v==null?'':'['+x+'="'+v+'"]';}).join('');}
  dlg.innerHTML=h;
  /* Fokus nur bei einem neuen Bildschirm setzen, damit die Tastatur-Position beim Auswählen bleibt */
  var stand=(S.pin?'pin':'')+'|'+S.schirm+'|'+(S.uebung?S.uebung.i:'')+'|'+(S.quest&&S.quest.schritt||'');
  if(stand!==S.stand){S.stand=stand;var f=dlg.querySelector(S.pin?'.km-pin-karte':'.km-titel');if(f){f.setAttribute('tabindex','-1');try{f.focus({preventScroll:true});}catch(e){}}}
  else if(merk){var w=dlg.querySelector(merk);if(w&&!w.disabled){try{w.focus({preventScroll:true});}catch(e){}}}
  if(!S.pin){nachZeichnen();}
}
/* Zeitgesteuerte Abläufe nach dem Zeichnen starten */
function nachZeichnen(){
  stopTimer();   /* nach jedem Neuzeichnen höchstens ein laufender Ablauf */
  if(S.schirm==='rot'){var ring=document.getElementById('km-ring');if(ring){ring.style.setProperty('--km-ring-dauer',(4*TEMPO)+'s');}warte(4000,function(){if(S.aktiv&&S.schirm==='rot'&&!S.pin){schirm('gelb');}});}
  if(S.schirm==='gruen'){uebungStarten();}
  if(S.schirm==='atem'&&S.atem&&S.atem.laeuft){atemStarten(S.atem.min*6,function(sek){atemFertig(sek);});}
}

/* ---------- Start ---------- */
function startHtml(){
  var km=S.km, h0=heute(), wo=woche(km,montag(h0)), st=sterneWoche(wo), offen=!(wo&&wo.tage&&wo.tage[h0]), t=new Date();
  return kopf('',null)+'<div class="km-start"><div class="km-hallo">'+figurSvg(km.figur,'gross')+'<div><p class="km-datum">'+TAGE_LANG[t.getDay()]+', '+t.getDate()+'. '+MONATE[t.getMonth()]+'</p>'+
      '<h2>Hallo, '+esc(km.spitzname)+'!</h2><p class="km-lead">Was möchtest du heute machen?</p></div></div>'+
    '<div class="km-kacheln">'+
      '<button type="button" class="km-kachel quest" data-k="quest">'+weltSvg(km.welt,st)+'<span class="km-k-text"><b>Meine Quest</b><span>'+st+(st===1?' Stern':' Sterne')+' diese Woche</span>'+(offen?'<span class="km-badge">Heute noch offen</span>':'')+'</span></button>'+
      '<button type="button" class="km-kachel ampel" data-k="szenen"><span class="km-k-bild">'+ampelSvg('alle','klein')+'</span><span class="km-k-text"><b>Stopp-Ampel</b><span>Gefühle steuern üben</span></span></button>'+
      '<button type="button" class="km-kachel atem" data-k="atem"><span class="km-k-bild">'+atemRaketeSvg('klein')+'</span><span class="km-k-text"><b>Atem-Raumschiff</b><span>Ruhig atmen</span></span></button>'+
    '</div></div>';
}

/* ---------- Ziel-Quest ---------- */
function questHtml(){
  var km=S.km, h0=heute(), mo=montag(h0), wo=woche(km,mo), st=sterneWoche(wo), schwelle=(wo&&wo.schwelle)||km.schwelle||8, ziel=(wo&&wo.ziel)||km.ziel, q=S.quest||{};
  var tage=[0,1,2,3,4].map(function(i){return plusTage(mo,i);});
  [5,6].forEach(function(i){var t=plusTage(mo,i);if((wo&&wo.tage&&wo.tage[t])||t===h0){tage.push(t);}});
  var reihe='<ol class="km-woche" aria-label="Diese Woche">'+tage.map(function(t){var x=wo&&wo.tage&&wo.tage[t];
    return '<li class="'+(t===h0?'heute':'')+(x?' da':'')+'"><span class="km-wt">'+TAGE_KURZ[wtag(t)]+'</span><span class="km-ws">'+(x?(sterneTag(x)?sterneHtml(sterneTag(x)):'<span class="km-null">0</span>'):(t<h0?'–':''))+'</span></li>';}).join('')+'</ol>';
  var heuteX=wo&&wo.tage&&wo.tage[h0], block;
  if(q.schritt==='erw'){
    block='<h3>Und wie sieht es die oder der Erwachsene?</h3><p class="km-klein">Jetzt tippt die erwachsene Person. Das Kind hat gewählt: <b>'+esc(BEWERTUNG[q.k][0])+'</b></p>'+
      '<div class="km-wahl3 erw" role="group" aria-label="Einschätzung der Erwachsenen">'+[2,1,0].map(function(p){return '<button type="button" class="km-gesicht" data-k="q-erw" data-p="'+p+'"'+(S.speichert?' disabled':'')+'>'+gesichtSvg(p)+'<span>'+esc(BEWERTUNG[p][0])+'</span></button>';}).join('')+'</div>'+
      '<button type="button" class="km-link" data-k="q-zurueck">Das Kind möchte nochmal wählen</button>';
  }else if(q.schritt==='fertig'){
    block='<div class="km-ergebnis"><p class="km-plus">'+(q.sterne?sterneHtml(q.sterne)+' +'+q.sterne+(q.sterne===1?' Stern':' Sterne'):'Heute noch kein Stern')+'</p>'+
      (q.einig?'<p class="km-lead">Ihr seid euch einig! Dafür gibt es einen Extra-Stern.</p>':'<p class="km-lead">Ihr habt es verschieden gesehen. Sprecht kurz darüber: Was hat heute geklappt?</p>')+
      '<button type="button" class="km-knopf gross primaer" data-k="start">Fertig</button></div>';
  }else if(heuteX&&!q.neu){
    var n=sterneTag(heuteX);
    block='<div class="km-ergebnis"><p class="km-klein">Heute schon eingetragen</p><p class="km-plus">'+(n?sterneHtml(n):'')+' '+n+(n===1?' Stern':' Sterne')+'</p><p class="km-lead">Morgen geht es weiter.</p>'+
      '<button type="button" class="km-link" data-k="q-neu">Nochmal einschätzen</button></div>';
  }else{
    block='<h3>Wie hat es heute geklappt?'+vorlesen('Wie hat es heute geklappt?')+'</h3><div class="km-wahl3" role="group" aria-label="Deine Einschätzung">'+
      [2,1,0].map(function(p){return '<button type="button" class="km-gesicht" data-k="q-kind" data-p="'+p+'">'+gesichtSvg(p)+'<span>'+esc(BEWERTUNG[p][0])+'</span></button>';}).join('')+'</div>';
  }
  var bel;
  if(st>=schwelle){
    if(wo&&wo.belohnung){bel='<p class="km-bel-da">'+stern(true)+'<span>Deine Belohnung: <b>'+esc(wo.belohnung)+'</b></span></p>';}
    else if((km.belohnungen||[]).length){bel='<p class="km-bel-titel">'+stern(true)+'<span>Geschafft! Such dir deine Belohnung aus:</span></p><div class="km-bel-wahl">'+km.belohnungen.map(function(b,i){return '<button type="button" class="km-knopf" data-k="belohnung" data-i="'+i+'"'+(S.speichert?' disabled':'')+'>'+esc(b)+'</button>';}).join('')+'</div>';}
    else{bel='<p class="km-bel-da">'+stern(true)+'<span>Geschafft! Sag der oder dem Erwachsenen Bescheid.</span></p>';}
  }else{var fehlt=schwelle-st;bel='<p class="km-bel-noch">Noch '+fehlt+(fehlt===1?' Stern':' Sterne')+' bis zur Belohnung.</p>';}
  return kopf('Meine Quest','start')+'<div class="km-quest"><div class="km-quest-welt'+(q.schritt==='fertig'&&q.sterne?' waechst':'')+'">'+weltSvg(km.welt,st)+
      '<p class="km-sterne-zahl">'+stern(true)+' <b>'+st+'</b> von '+MAX_WOCHE+'</p></div>'+
    '<div class="km-quest-rechts"><p class="km-klein">Mein Ziel diese Woche</p><h2 class="km-ziel">'+esc(ziel)+vorlesen(ziel)+'</h2>'+reihe+'<div class="km-block">'+block+'</div><div class="km-belohnung">'+bel+'</div></div></div>';
}

/* ---------- Stopp-Ampel ---------- */
function szenenHtml(){
  return kopf('Stopp-Ampel','start')+'<div class="km-szenen"><p class="km-lead">Welche Situation übt ihr heute?</p><div class="km-szenen-raster">'+
    SZENEN.map(function(s){return '<button type="button" class="km-szene-karte" data-k="szene" data-id="'+s[0]+'">'+szeneSvg(s[0])+'<span>'+esc(s[1])+'</span></button>';}).join('')+'</div></div>';
}
function szeneHtml(){
  var t=szeneTitel(S.runde.szene);
  return kopf('Stopp-Ampel','szenen')+'<div class="km-schritt km-szene-schritt"><div class="km-szene-gross">'+szeneSvg(S.runde.szene)+'</div>'+
    '<h2 class="km-satz">'+esc(t)+vorlesen(t)+'</h2><p class="km-lead">Stell dir vor, das passiert dir gerade.</p><button type="button" class="km-knopf gross primaer" data-k="thermo">Weiter</button></div>';
}
function thermoHtml(nach){
  var n=nach?S.runde.nach:S.runde.vor;
  var frage=nach?'Und wenn du das machst: Wie heiß ist dein Thermometer dann?':'Wie heiß ist dein Thermometer, wenn das passiert?';
  return kopf('Stopp-Ampel',nach?'gruen-neu':'szene')+'<div class="km-schritt km-thermo"><h2 class="km-satz">'+esc(frage)+vorlesen(frage)+'</h2>'+
    '<div class="km-thermo-reihe">'+thermoSvg(n||0)+'<div class="km-thermo-wahl" role="group" aria-label="Thermometer">'+[5,4,3,2,1].map(function(i){
      return '<button type="button" class="km-stufe s'+i+(n===i?' an':'')+'" data-k="'+(nach?'nach':'vor')+'" data-n="'+i+'" aria-pressed="'+(n===i)+'"><span class="km-punkt"></span>'+esc(THERMO[i][0])+'</button>';}).join('')+'</div></div>'+
    (nach?'':'<h3>Was merkst du in deinem Körper?</h3><div class="km-signale" role="group" aria-label="Körpersignale">'+SIGNALE.map(function(s){var an=S.runde.signale.indexOf(s[0])>=0;
      return '<button type="button" class="km-chip'+(an?' an':'')+'" data-k="signal" data-id="'+s[0]+'" aria-pressed="'+an+'">'+esc(s[1])+'</button>';}).join('')+'</div>')+
    '<button type="button" class="km-knopf gross primaer" data-k="'+(nach?'runde-fertig':'rot')+'"'+(n&&!S.speichert?'':' disabled')+'>Weiter</button></div>';
}
function rotHtml(){
  return kopf('Stopp-Ampel','thermo')+'<div class="km-schritt km-ampel-schritt">'+ampelSvg('rot')+'<div class="km-ampel-text"><p class="km-ampel-wort rot">Stopp!</p><h2 class="km-satz">Erst anhalten.'+vorlesen('Stopp! Erst anhalten. Füße fest auf den Boden. Hände ruhig. Mund zu.')+'</h2>'+
    '<ul class="km-liste"><li>Füße fest auf den Boden</li><li>Hände ruhig</li><li>Mund zu</li></ul><div class="km-ring" id="km-ring" aria-hidden="true"><span></span></div>'+
    '<button type="button" class="km-knopf gross" data-k="gelb">Weiter</button></div></div>';
}
function gelbHtml(){
  var km=S.km;
  return kopf('Stopp-Ampel','rot')+'<div class="km-schritt km-ampel-schritt">'+ampelSvg('gelb')+'<div class="km-ampel-text"><p class="km-ampel-wort gelb">Nachdenken</p><h2 class="km-satz">Was hilft dir jetzt?'+vorlesen('Nachdenken. Was hilft dir jetzt?')+'</h2>'+
    '<div class="km-strategien">'+(km.strategien||[]).map(function(id){return '<button type="button" class="km-strategie" data-k="strategie" data-id="'+id+'">'+stratIcon(id)+'<span>'+esc(stratText(km,id))+'</span></button>';}).join('')+'</div></div></div>';
}
function uebungSchritte(id){
  switch(id){
    case 'atmen':return [{art:'atmen',zyklen:6}];
    case 'zaehlen':return [{art:'zaehlen',bis:10}];
    case 'weggehen':return [{art:'knopf',text:'Sag: „Ich brauche eine Pause.“',knopf:'Gesagt'},{art:'knopf',text:'Geh zu deinem Ruheplatz.',knopf:'Ich bin da'},{art:'timer',text:'Ruhig werden. Atme langsam.',sek:30}];
    case 'pausenkarte':return [{art:'karte',text:'Zeig die Karte deinem Erwachsenen.',knopf:'Gezeigt'},{art:'timer',text:'Kurze Pause.',sek:20}];
    case 'hilfe':return [{art:'wen'},{art:'knopf',text:'Sag: „Kannst du mir bitte helfen?“',knopf:'Gesagt'}];
    case 'druecken':return [{art:'druecken',runden:3}];
    case 'trinken':return [{art:'timer',text:'Hol dir Wasser und trink langsam.',sek:20,bild:'glas'}];
  }
  return [{art:'knopf',text:'Probier es jetzt aus.',knopf:'Ausprobiert'},{art:'timer',text:'Spür nach: Wie ist es jetzt?',sek:15}];
}
function uebungHtml(){
  var u=S.uebung, sch=u.schritte[u.i];
  if(!sch){return '<p class="km-lead">Geschafft! Das hast du gut gemacht.</p><button type="button" class="km-knopf gross primaer" data-k="u-fertig">Weiter</button>';}
  var fort=u.schritte.length>1?'<p class="km-klein">Schritt '+(u.i+1)+' von '+u.schritte.length+'</p>':'';
  switch(sch.art){
    case 'atmen':return fort+atemHtml(sch.zyklen)+'<button type="button" class="km-link" data-k="u-weiter">Überspringen</button>';
    case 'zaehlen':return fort+'<p class="km-lead">Zähl leise mit.</p><div class="km-zahl" id="km-zahl" aria-live="polite">1</div><button type="button" class="km-link" data-k="u-weiter">Überspringen</button>';
    case 'knopf':return fort+'<p class="km-auftrag">'+esc(sch.text)+vorlesen(sch.text)+'</p><button type="button" class="km-knopf gross primaer" data-k="u-weiter">'+esc(sch.knopf)+'</button>';
    case 'karte':return fort+'<div class="km-pausenkarte" aria-label="Pausenkarte">PAUSE</div><p class="km-auftrag">'+esc(sch.text)+vorlesen(sch.text)+'</p><button type="button" class="km-knopf gross primaer" data-k="u-weiter">'+esc(sch.knopf)+'</button>';
    case 'timer':return fort+(sch.bild==='glas'?glasSvg():'')+'<p class="km-auftrag">'+esc(sch.text)+vorlesen(sch.text)+'</p>'+'<div class="km-uhr" id="km-uhr" style="--p:0"><span id="km-uhr-zahl">'+sch.sek+'</span></div><button type="button" class="km-link" data-k="u-weiter">Überspringen</button>';
    case 'wen':return fort+'<p class="km-auftrag">Wen fragst du?'+vorlesen('Wen fragst du?')+'</p><div class="km-wen">'+WEN.map(function(w,i){return '<button type="button" class="km-chip gross" data-k="wen" data-i="'+i+'">'+esc(w)+'</button>';}).join('')+'</div>';
    case 'druecken':return fort+'<p class="km-auftrag" id="km-dr-text">Hände fest zusammendrücken …</p><div class="km-druecken" id="km-dr" aria-hidden="true"><span></span><span></span></div><p class="km-klein" id="km-dr-fort">Runde 1 von '+sch.runden+'</p><button type="button" class="km-link" data-k="u-weiter">Überspringen</button>';
  }
  return '';
}
function gruenHtml(){
  return kopf('Stopp-Ampel','gelb')+'<div class="km-schritt km-ampel-schritt">'+ampelSvg('gruen')+'<div class="km-ampel-text km-ueben"><p class="km-ampel-wort gruen">Los!</p><h2 class="km-satz">'+esc(stratText(S.km,S.runde.strategie))+'</h2>'+uebungHtml()+'</div></div>';
}
function uebungWeiter(){if(!S.uebung){return;}stopTimer();S.uebung.i++;zeichnen();}
function uebungStarten(){
  var u=S.uebung, sch=u&&u.schritte[u.i];if(!sch){return;}
  if(sch.art==='atmen'){atemStarten(sch.zyklen,function(){uebungWeiter();});}
  else if(sch.art==='zaehlen'){var i=1;S.intervall=setInterval(function(){i++;var z=document.getElementById('km-zahl');if(!z){stopTimer();return;}if(i>sch.bis){uebungWeiter();return;}z.textContent=String(i);z.classList.remove('neu');void z.offsetWidth;z.classList.add('neu');},1500*TEMPO);}
  else if(sch.art==='timer'){uhrStarten(sch.sek,function(){uebungWeiter();});}
  else if(sch.art==='druecken'){drueckenStarten(sch.runden,function(){uebungWeiter();});}
}
function uhrStarten(sek,fertig){
  var i=0;
  S.intervall=setInterval(function(){i++;var u=document.getElementById('km-uhr'), z=document.getElementById('km-uhr-zahl');if(!u){stopTimer();return;}
    u.style.setProperty('--p',String(Math.min(1,i/sek)));z.textContent=String(Math.max(0,sek-i));if(i>=sek){stopTimer();fertig();}},1000*TEMPO);
}
function drueckenStarten(runden,fertig){
  var s=0, PH=5;
  function zeig(){var t=document.getElementById('km-dr-text'), el=document.getElementById('km-dr'), f=document.getElementById('km-dr-fort');if(!t){stopTimer();return;}
    var druck=(s%(2*PH))<PH;t.textContent=druck?'Hände fest zusammendrücken …':'Und jetzt loslassen. Spür nach.';el.classList.toggle('an',druck);f.textContent='Runde '+(Math.floor(s/(2*PH))+1)+' von '+runden;}
  zeig();
  S.intervall=setInterval(function(){s++;if(s>=runden*2*PH){stopTimer();fertig();return;}zeig();},1000*TEMPO);
}
function atemHtml(z){
  return '<div class="km-atem" id="km-atem"><div class="km-atem-bahn">'+atemRaketeSvg()+'</div><div class="km-atem-info"><p class="km-atem-text" id="km-atem-text" aria-live="polite">Mach es dir bequem.</p>'+
    '<p class="km-atem-zahl" id="km-atem-zahl" aria-hidden="true"></p><p class="km-klein" id="km-atem-fort">Atemzug 1 von '+z+'</p></div></div>';
}
function atemStarten(z,fertig){
  var el=document.getElementById('km-atem');if(!el){return;}
  var sek=0, PH=5;S.atemSek=0;
  el.style.setProperty('--km-dauer',(PH*TEMPO)+'s');
  function phase(){
    var t=document.getElementById('km-atem-text'), n=document.getElementById('km-atem-zahl'), f=document.getElementById('km-atem-fort');if(!t){stopTimer();return;}
    var ein=(sek%(2*PH))<PH;el.classList.toggle('ein',ein);el.classList.toggle('aus',!ein);
    t.textContent=ein?'Einatmen …':'Ausatmen …';n.textContent=String((sek%PH)+1);f.textContent='Atemzug '+(Math.floor(sek/(2*PH))+1)+' von '+z;
  }
  phase();
  S.intervall=setInterval(function(){sek++;S.atemSek=sek;if(sek>=z*2*PH){stopTimer();fertig(sek);return;}phase();},1000*TEMPO);
}
function lobHtml(){
  var r=S.letzte||{}, besser=r.vor&&r.nach&&r.nach<r.vor;
  return kopf('Stopp-Ampel',null)+'<div class="km-schritt km-lob">'+figurSvg(S.km.figur,'gross huepft')+'<p class="km-plus">'+stern(true)+' Super geübt!</p>'+
    (besser?'<p class="km-lead">Mit „'+esc(stratText(S.km,r.strategie))+'“ wird dein Thermometer kühler: von '+r.vor+' auf '+r.nach+'.</p>':'<p class="km-lead">Je öfter du übst, desto leichter klappt es, wenn es wirklich passiert.</p>')+
    '<div class="km-knopfreihe"><button type="button" class="km-knopf gross" data-k="szenen">Noch eine Situation</button><button type="button" class="km-knopf gross primaer" data-k="start">Zum Start</button></div></div>';
}

/* ---------- Atem-Raumschiff ---------- */
function atemSchirmHtml(){
  var a=S.atem||{};
  if(a.fertig){
    var m=Math.round(a.sek/60);
    return kopf('Atem-Raumschiff','start')+'<div class="km-schritt km-lob">'+figurSvg(S.km.figur,'gross huepft')+'<p class="km-plus">'+stern(true)+' Geschafft!</p><p class="km-lead">Du hast '+(a.sek>=60?m+(m===1?' Minute':' Minuten'):a.sek+' Sekunden')+' ruhig geatmet.</p>'+
      '<button type="button" class="km-knopf gross primaer" data-k="start">Zum Start</button></div>';
  }
  if(a.laeuft){return kopf('Atem-Raumschiff',null)+'<div class="km-schritt">'+atemHtml(a.min*6)+'<button type="button" class="km-knopf" data-k="atem-stopp">Aufhören</button></div>';}
  return kopf('Atem-Raumschiff','start')+'<div class="km-schritt km-atem-wahl"><div class="km-atem-vorschau">'+atemRaketeSvg()+'</div><div><h2 class="km-satz">Das Raumschiff fliegt mit deinem Atem.'+vorlesen('Das Raumschiff fliegt mit deinem Atem. Beim Einatmen steigt es, beim Ausatmen sinkt es.')+'</h2>'+
    '<p class="km-lead">Beim Einatmen steigt es, beim Ausatmen sinkt es. Wie lange möchtest du fliegen?</p><div class="km-knopfreihe">'+[1,2,3].map(function(m){
      return '<button type="button" class="km-knopf gross'+(m===1?' primaer':'')+'" data-k="atem-los" data-min="'+m+'">'+m+(m===1?' Minute':' Minuten')+'</button>';}).join('')+'</div></div></div>';
}
function atemFertig(sek){
  stopTimer();
  if(sek<20){S.atem={};zeichnen();return;}
  S.atem={fertig:true,sek:sek};
  speichern(T.ops.kindRunde(S.d.id,{spiel:'atem',dauer:sek}),function(){S.neu.atem++;});
}

/* ---------- Speichern ---------- */
function speichern(p,danach){
  S.speichert=true;S.meldung='';zeichnen();
  return p.then(function(neu){S.speichert=false;if(!S.aktiv){return;}if(neu){S.d=neu;S.km=kmVon(neu)||S.km;}if(danach){danach();}zeichnen();},
    function(e){S.speichert=false;if(!S.aktiv){return;}S.meldung='Das Speichern hat nicht geklappt. Bitte eine erwachsene Person holen. ('+((e&&e.message)||String(e))+')';zeichnen();});
}

/* ---------- Code-Eingabe zum Beenden ---------- */
function pinHtml(){
  var p=S.pin, z=sitzLesen()||{}, gesperrt=z.bis&&z.bis>Date.now();
  var taste=function(n){return '<button type="button" class="km-taste" data-k="pin-z" data-z="'+n+'"'+(gesperrt?' disabled':'')+'>'+n+'</button>';};
  return '<div class="km-pin"><div class="km-pin-karte" role="dialog" aria-modal="true" aria-labelledby="km-pin-t"><h2 id="km-pin-t">'+(S.neuGeladen?'Der Kindmodus ist noch an':'Kindmodus beenden')+'</h2>'+
    '<p>Nur für Erwachsene: Code eingeben.</p><div class="km-pin-punkte" aria-label="'+p.eingabe.length+' von 4 Ziffern">'+[0,1,2,3].map(function(i){return '<span class="'+(p.eingabe.length>i?'an':'')+'"></span>';}).join('')+'</div>'+
    '<p class="km-pin-fehler" role="alert">'+esc(gesperrt?'Zu viele Versuche. Bitte '+Math.ceil((z.bis-Date.now())/1000)+' Sekunden warten.':(p.fehler||''))+'</p>'+
    '<div class="km-pin-tasten">'+[1,2,3,4,5,6,7,8,9].map(taste).join('')+
      (S.neuGeladen?'<span></span>':'<button type="button" class="km-taste leise" data-k="pin-ab">Zurück</button>')+taste(0)+
      '<button type="button" class="km-taste leise" data-k="pin-weg" aria-label="Letzte Ziffer löschen">⌫</button></div>'+
    '<button type="button" class="km-link" data-k="abmelden">Code vergessen? Vom Hub abmelden</button></div></div>';
}
function pinZiffer(n){
  var z=sitzLesen();if(!z||(z.bis&&z.bis>Date.now())||S.pin.prueft){return;}
  if(S.pin.eingabe.length>=4){return;}
  S.pin.eingabe+=String(n);S.pin.fehler='';
  if(S.pin.eingabe.length<4){zeichnen();return;}
  S.pin.prueft=true;zeichnen();
  pruefwert(S.pin.eingabe,z.s).then(function(h){
    S.pin.prueft=false;
    if(h===z.h){beenden();return;}
    z.fehl=(z.fehl|0)+1;if(z.fehl>=5){z.bis=Date.now()+30000;z.fehl=0;}sitzSetzen(z);
    S.pin.eingabe='';S.pin.fehler='Der Code stimmt nicht.';zeichnen();
    var k=document.querySelector('.km-pin-karte');if(k){k.classList.add('wackelt');}
    if(z.bis){setTimeout(function(){if(S.pin){zeichnen();}},30000);}
  });
}
function abmelden(){
  sitzLoeschen();schliessen();S={aktiv:false};
  if(K&&K.abmelden){try{K.abmelden();}catch(e){}}
}

/* ---------- Bedienung ---------- */
function klick(ev){
  var b=ev.target.closest&&ev.target.closest('[data-k]');if(!b||b.disabled){return;}
  var k=b.getAttribute('data-k');
  if(S.pin){
    if(k==='pin-z'){pinZiffer(+b.getAttribute('data-z'));}
    else if(k==='pin-weg'){S.pin.eingabe=S.pin.eingabe.slice(0,-1);S.pin.fehler='';zeichnen();}
    else if(k==='pin-ab'&&!S.neuGeladen){S.pin=null;zeichnen();}
    else if(k==='abmelden'){abmelden();}
    return;
  }
  if(S.speichert&&/^(q-erw|belohnung|runde-fertig|atem-stopp)$/.test(k)){return;}
  switch(k){
    case 'sperre':stopTimer();S.pin={eingabe:'',fehler:''};zeichnen();return;
    case 'vorlesen':sprich(b.getAttribute('data-text'));return;
    case 'start':S.quest={};S.runde=null;S.uebung=null;S.atem=null;schirm('start');return;
    case 'quest':S.quest={};schirm('quest');return;
    case 'szenen':S.runde=null;schirm('szenen');return;
    case 'atem':S.atem={};schirm('atem');return;
    /* Ziel-Quest */
    case 'q-kind':S.quest={schritt:'erw',k:+b.getAttribute('data-p')};zeichnen();return;
    case 'q-zurueck':S.quest={neu:true};zeichnen();return;
    case 'q-neu':S.quest={neu:true};zeichnen();return;
    case 'q-erw':
      var kk=S.quest.k, e=+b.getAttribute('data-p');
      speichern(T.ops.kindQuestTag(S.d.id,heute(),{k:kk,e:e}),function(){S.neu.quest=true;S.quest={schritt:'fertig',sterne:e+(kk===e?1:0),einig:kk===e};});return;
    case 'belohnung':
      var bl=(S.km.belohnungen||[])[+b.getAttribute('data-i')];if(!bl){return;}
      speichern(T.ops.kindBelohnung(S.d.id,montag(heute()),bl));return;
    /* Stopp-Ampel */
    case 'szene':S.runde={szene:b.getAttribute('data-id'),signale:[],vor:null,nach:null,strategie:''};schirm('szene');return;
    case 'thermo':schirm('thermo');return;
    case 'vor':S.runde.vor=+b.getAttribute('data-n');zeichnen();return;
    case 'nach':S.runde.nach=+b.getAttribute('data-n');zeichnen();return;
    case 'signal':
      var id=b.getAttribute('data-id'), l=S.runde.signale;
      if(l.indexOf(id)>=0){S.runde.signale=l.filter(function(x){return x!==id;});}
      else if(id==='nichts'){S.runde.signale=['nichts'];}
      else{S.runde.signale=l.filter(function(x){return x!=='nichts';}).concat([id]);}
      zeichnen();return;
    case 'rot':schirm('rot');return;
    case 'gelb':schirm('gelb');return;
    case 'strategie':S.runde.strategie=b.getAttribute('data-id');S.uebung={schritte:uebungSchritte(S.runde.strategie),i:0};schirm('gruen');return;
    case 'gruen-neu':S.uebung={schritte:uebungSchritte(S.runde.strategie),i:0};schirm('gruen');return;
    case 'u-weiter':uebungWeiter();return;
    case 'wen':S.uebung.wen=+b.getAttribute('data-i');uebungWeiter();return;
    case 'u-fertig':schirm('nach');return;
    case 'runde-fertig':
      var r=S.runde;S.letzte={vor:r.vor,nach:r.nach,strategie:r.strategie};
      speichern(T.ops.kindRunde(S.d.id,{spiel:'ampel',szene:r.szene,vor:r.vor,nach:r.nach,strategie:r.strategie,signale:r.signale}),function(){S.neu.runden++;S.schirm='lob';});return;
    /* Atem-Raumschiff */
    case 'atem-los':S.atem={min:+b.getAttribute('data-min')||1,laeuft:true};schirm('atem');return;
    case 'atem-stopp':atemFertig(S.atemSek||0);return;
  }
}
function taste(ev){
  if(!S.aktiv||!S.pin||ev.altKey||ev.ctrlKey||ev.metaKey){return;}
  if(/^[0-9]$/.test(ev.key)){ev.preventDefault();pinZiffer(+ev.key);}
  else if(ev.key==='Backspace'){ev.preventDefault();S.pin.eingabe=S.pin.eingabe.slice(0,-1);zeichnen();}
}

/* Tastatur für die Code-Eingabe (auf dem Dokument, weil der Fokus beim Neuzeichnen wechselt) */
document.addEventListener('keydown',taste,true);

/* Nach dem Neuladen: Ist der Kindmodus noch an, erscheint zuerst die Code-Eingabe */
function nachNeuladen(){
  if(!sitzLesen()||S.aktiv){return;}
  bausteine();
  S={aktiv:true,neuGeladen:true,pin:{eingabe:'',fehler:''},neu:{}};
  oeffnen();
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',nachNeuladen);}else{setTimeout(nachNeuladen,0);}

/* Knöpfe der Karte im Begleitplan */
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-km]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-km');
  if(a==='einrichten'){einrichtenDialog(d);}
  else if(a==='start'){if(kmVon(d)){startDialog(d);}else{einrichtenDialog(d);}}
});

return {karte:karte, kurz:kurz, kennzahlen:kennzahlen, kennzahlText:kennzahlText, verlauf:verlaufDaten, auswertung:auswertung, kmVon:kmVon,
  szeneSvg:szeneSvg, weltSvg:weltSvg, figurSvg:figurSvg, SZENEN:SZENEN,
  _test:{tempo:function(t){TEMPO=t;}, aktiv:function(){return !!S.aktiv;}, schirm:function(){return S.schirm||'';}}};
})();
