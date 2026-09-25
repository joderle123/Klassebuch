/* =====================================================================
   CDSE Hub — Screening: Beobachtungsbogen im Schülerdossier
   ---------------------------------------------------------------------
   Reiter „Screening“ im Dossier: neuen Bogen ausfüllen, Ergebnis als
   Profil (Ampel je Bereich, Stärken, Auswirkungen, Warnsignale) mit
   nächsten Schritten, ELDiB-Zielen, Arbeitsblättern und Lernmodulen,
   Verlauf und Vergleich mehrerer Beobachtender. Gespeichert wird im
   verschlüsselten Dossier (d.screenings) über CDSE_TEAM.ops.screening.
   Keine Diagnose: Die Ampel beschreibt die Ausprägung im Bogen, sie ist
   nicht normiert. Inhalt des Bogens: screening-bogen.js.
   ===================================================================== */
window.CDSE_SCREENING=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function B(){return window.CDSE_SCREENING_BOGEN||null;}
var LERN_TITEL=@@LERN_TITEL@@;
var GELB=0.8, ROT=1.5;          /* Mittelwert 0–3: ab „manchmal bis oft“ beobachten, ab „oft“ im Mittel deutlich */
var STUFE_TEXT={gruen:'unauffällig',gelb:'beobachten',rot:'deutlich',offen:'zu wenig Angaben'};
var zustand={};                 /* je Dossier: {modus, id, entwurf} */

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function datum(i){return H?H.datum(i):i;}
function heute(){return H?H.heuteIso():new Date().toISOString().slice(0,10);}
function zahl(n){return (Math.round(n*10)/10).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1});}
function z(id){return zustand[id]||(zustand[id]={modus:'liste',id:null,entwurf:null});}

/* ---------- Stufe aus der Klasse: C1 / GS (Cycle 2–4) / ES ---------- */
function stufeAusKlasse(d){
  var k=String(((d.fiche||{}).schule||{}).klasse||(d.person||{}).klasse||'').toUpperCase().replace(/\s+/g,'');
  if(!k){return 'GS';}
  if(/^PR[EÉ]COCE|^C(YCLE)?1|^1(\.[1-3])?$/.test(k)){return 'C1';}
  if(/^C(YCLE)?[2-4]|^[2-4](\.[1-3])?$/.test(k)){return 'GS';}
  return 'ES';
}
function rolleVorschlag(){
  var me=K&&K.ich();if(!me){return 'lehrkraft';}
  var f=String(me.funktion||'').toLowerCase();
  if(me.team==='isa'){return 'isa';}if(me.team==='diagnostique'){return 'diagnostique';}if(me.team==='reeducation'){return 'therapie';}
  if(/erzieh|[ée]duc/.test(f)){return 'educ';}
  return 'lehrkraft';
}
function rolleName(id){var r=(B().rollen||[]).filter(function(x){return x[0]===id;})[0];return r?r[1]:(id||'');}

/* ---------- Items je Stufe ---------- */
function items(bereich,stufe){
  return (bereich.items||[]).filter(function(i){return !i.nur||i.nur.indexOf(stufe)>=0;}).map(function(i){return {id:i.id,text:i[stufe]||i.text};});
}
function warnsignale(stufe){return (B().warnsignale||[]).filter(function(w){return !w.nur||w.nur.indexOf(stufe)>=0;});}
function alleItemIds(stufe){
  var l=[];B().bereiche.forEach(function(b){items(b,stufe).forEach(function(i){l.push(i.id);});});
  items(B().staerken,stufe).forEach(function(i){l.push(i.id);});
  return l;
}

/* =====================================================================
   Auswertung
   ===================================================================== */
function bereichWert(b,s){
  var l=items(b,s.stufe), werte=[], haeufig=[];
  l.forEach(function(i){var v=(s.antworten||{})[i.id];if(typeof v==='number'&&v>=0){werte.push(v);if(v>=2){haeufig.push({text:i.text,v:v});}}});
  var n=l.length, m=werte.length?werte.reduce(function(a,c){return a+c;},0)/werte.length:null;
  var stufe=(werte.length<Math.ceil(n/2))?'offen':(m>=ROT?'rot':((m>=GELB||werte.indexOf(3)>=0)?'gelb':'gruen'));
  haeufig.sort(function(a,c){return c.v-a.v;});
  return {id:b.id,name:b.name,farbe:b.farbe,wert:m,n:n,beantwortet:werte.length,stufe:stufe,haeufig:haeufig,def:b};
}
function auswerten(s){
  var bog=B(), a=s.auswirkung||{};
  var bereiche=bog.bereiche.map(function(b){return bereichWert(b,s);});
  var st=bereichWert(bog.staerken,s);
  st.niveau=st.wert==null?'offen':(st.wert>=2?'viele':(st.wert>=1?'einige':'wenige'));
  var warn=warnsignale(s.stufe).filter(function(w){return (s.warn||[]).indexOf(w.id)>=0;});
  var rot=bereiche.filter(function(b){return b.stufe==='rot';}), gelb=bereiche.filter(function(b){return b.stufe==='gelb';});
  var belastung=Math.max.apply(null,['leiden','lernen','beziehungen','gruppe'].map(function(k){var v=parseInt(a[k],10);return isFinite(v)?v:0;}));
  function namen(l){return l.map(function(b){return '„'+b.name+'“';}).join(', ').replace(/, ([^,]*)$/,' und $1');}
  var g;
  if(warn.length){g={art:'sofort',titel:'Heute handeln',text:'Mindestens ein Warnsignal ist angekreuzt. Die Schritte dazu stehen gleich darunter – sie gehen allem anderen vor.'};}
  else if(rot.length&&belastung>=2){g={art:'planen',titel:'Unterstützung planen und Abklärung besprechen',text:'In '+namen(rot)+' zeigen sich deutliche Schwierigkeiten, die den Alltag spürbar beeinträchtigen. Sinnvoll: die nächsten Schritte unten umsetzen, Förderziele festlegen und im Team besprechen, ob eine Abklärung durch die Diagnostique nötig ist.'};}
  else if(rot.length){g={art:'foerdern',titel:'Gezielt fördern und weiter beobachten',text:'In '+namen(rot)+' ist einiges deutlich ausgeprägt, beeinträchtigt den Alltag aber (noch) wenig. Die Förderideen unten umsetzen und in sechs bis acht Wochen erneut einschätzen.'};}
  else if(gelb.length){g={art:'beobachten',titel:'Im Blick behalten',text:'Einige Beobachtungen in '+namen(gelb)+'. Im Alltag fördern und in zwei bis drei Monaten erneut einschätzen.'};}
  else{g={art:'unauffaellig',titel:'Keine auffälligen Bereiche',text:'Im Bogen zeigt sich kein auffälliger Bereich. Wenn Sie sich trotzdem Sorgen machen: Beobachtungen festhalten und im Team besprechen.'};}
  var zusatz=[];
  if(!warn.length&&(rot.length||gelb.length)){
    if(a.dauer==='kurz'){zusatz.push('Die Schwierigkeiten bestehen erst seit kurzem – an mögliche Belastungen denken und in vier bis sechs Wochen erneut einschätzen.');}
    if(a.orte==='eine'){zusatz.push('Sie zeigen sich nur in einer Situation oder bei einer Person – das spricht eher für einen Zusammenhang mit dieser Situation als für ein grundsätzliches Problem.');}
    if(a.ereignis==='ja'){zusatz.push('Belastende Ereignisse können vorübergehend zu solchen Reaktionen führen – bei der Planung berücksichtigen.');}
  }
  if(st.niveau==='wenige'){zusatz.push('Es wurden wenige Stärken beobachtet: Ressourcen gezielt suchen und sichtbar machen – sie sind der wichtigste Ansatzpunkt.');}
  g.zusatz=zusatz;
  return {bereiche:bereiche,staerken:st,warn:warn,gesamt:g,belastung:belastung};
}
/* Kurzfassung für das Dossier (wird mitgespeichert – Dokumentation bleibt stabil) */
function kurz(s){
  var e=auswerten(s), o={version:B().version,gesamt:e.gesamt.art,bereiche:{},staerken:e.staerken.niveau,warn:e.warn.map(function(w){return w.id;})};
  e.bereiche.forEach(function(b){o.bereiche[b.id]={wert:b.wert==null?null:Math.round(b.wert*100)/100,stufe:b.stufe};});
  return o;
}

/* =====================================================================
   Darstellung
   ===================================================================== */
var ART_KLASSE={sofort:'rot',planen:'rot',foerdern:'gelb',beobachten:'gelb',unauffaellig:'gruen'};
function screenings(d){return (d.screenings||[]).slice().sort(function(a,b){return String(b.datum).localeCompare(String(a.datum))||String(b.z).localeCompare(String(a.z));});}
function wer(s){return (H.kname(s.von)||'')+(s.rolle?' · '+rolleName(s.rolle):'');}
function stufeName(id){var s=(B().stufen||[]).filter(function(x){return x.id===id;})[0];return s?s.name+' ('+s.alter+')':id;}

function tab(d,r){
  if(!bausteine()||!B()){return '<p>Das Screening fehlt in dieser Hub-Datei.</p>';}
  var zu=z(d.id);
  if(zu.modus==='neu'&&r.bearbeiten){return formular(d);}
  if(zu.modus==='detail'){var s=screenings(d).filter(function(x){return x.id===zu.id;})[0];if(s){return detail(d,s,r);}zu.modus='liste';}
  return liste(d,r);
}

/* ---------- Liste und Vergleich ---------- */
function liste(d,r){
  var l=screenings(d);
  var h='<div class="ar-karte sc-einfuehrung"><div class="ar-kartenkopf"><div><h2>Screening</h2><p class="ar-leise">Strukturierte Beobachtung: Wo braucht '+esc((d.person||{}).vorname||'das Kind')+' Unterstützung, wo liegen die Stärken, was ist der nächste Schritt? Kein Test und keine Diagnose.</p></div>'+
    (r.bearbeiten?'<button class="btn primary" type="button" data-sc="neu">'+svg('plus')+'Neues Screening</button>':'')+'</div>'+
    (l.length?'':'<p class="sc-leer">Noch kein Screening. Ein Bogen dauert etwa zehn Minuten. Am aussagekräftigsten wird es, wenn zwei Personen das Kind unabhängig voneinander einschätzen – zum Beispiel Lehrkraft und Éducateur.</p>')+'</div>';
  if(!l.length){return h;}
  /* Warnsignale der letzten 90 Tage – auch wenn danach jemand ohne Warnsignal eingeschätzt hat */
  var grenze=new Date(Date.now()-90*864e5).toISOString().slice(0,10);
  var warnL=l.filter(function(s){return String(s.datum)>=grenze;}).map(function(s){return {s:s,w:auswerten(s).warn};}).filter(function(x){return x.w.length;});
  if(warnL.length){h+='<div class="sc-warn-banner" role="alert">'+svg('warn')+'<div><b>Warnsignal'+(warnL.length>1?'e':'')+' in den letzten drei Monaten</b>'+
    warnL.map(function(x){return '<span>'+esc(datum(x.s.datum))+' ('+esc(H.kname(x.s.von))+'): '+x.w.map(function(w){return esc(w.text);}).join(' · ')+'</span>';}).join('')+'</div></div>';}
  h+='<div class="sc-liste">'+l.map(function(s){
    var e=auswerten(s), rot=e.bereiche.filter(function(b){return b.stufe==='rot';}), gelb=e.bereiche.filter(function(b){return b.stufe==='gelb';});
    return '<button class="sc-eintrag" type="button" data-sc="zeigen" data-id="'+esc(s.id)+'"><span class="sc-punkt '+ART_KLASSE[e.gesamt.art]+'" aria-hidden="true"></span>'+
      '<span class="sc-eintrag-text"><b>'+esc(datum(s.datum))+' · '+esc(e.gesamt.titel)+'</b><small>'+esc(wer(s))+' · '+esc(stufeName(s.stufe))+'</small>'+
      ((rot.length||gelb.length)?'<span class="sc-chips">'+rot.map(function(b){return '<span class="sc-chip rot">'+esc(b.name)+'</span>';}).join('')+gelb.map(function(b){return '<span class="sc-chip gelb">'+esc(b.name)+'</span>';}).join('')+'</span>':'')+
      '</span>'+svg('right')+'</button>';
  }).join('')+'</div>';
  if(l.length>1){h+=vergleich(l.slice(0,4));}
  return h;
}
function vergleich(l){
  var alle=l.map(auswerten), bog=B();
  var h='<div class="ar-karte"><div class="ar-kartenkopf"><h2>Vergleich</h2><span class="ar-leise">Die letzten '+l.length+' Screenings – verschiedene Personen sehen oft Verschiedenes</span></div><div class="sc-vergleich" role="table"><div class="sc-vzeile kopf" role="row"><span role="columnheader">Bereich</span>'+
    l.map(function(s){return '<span role="columnheader">'+esc(datum(s.datum))+'<small>'+esc(H.kname(s.von))+(s.rolle?' · '+esc(rolleName(s.rolle)):'')+'</small></span>';}).join('')+'</div>';
  var abweichend=[];
  bog.bereiche.forEach(function(b,i){
    var werte=alle.map(function(e){return e.bereiche[i];});
    var zahlen=werte.filter(function(x){return x.wert!=null;}).map(function(x){return x.wert;});
    if(zahlen.length>1&&Math.max.apply(null,zahlen)-Math.min.apply(null,zahlen)>=1){abweichend.push(b.name);}
    h+='<div class="sc-vzeile" role="row"><span role="rowheader">'+esc(b.name)+'</span>'+werte.map(function(x){return '<span role="cell"><span class="sc-wertchip '+x.stufe+'">'+(x.wert==null?'–':zahl(x.wert))+'</span></span>';}).join('')+'</div>';
  });
  h+='<div class="sc-vzeile staerke" role="row"><span role="rowheader">Stärken</span>'+alle.map(function(e){return '<span role="cell"><span class="sc-wertchip staerke">'+(e.staerken.wert==null?'–':zahl(e.staerken.wert))+'</span></span>';}).join('')+'</div></div>';
  if(abweichend.length){h+='<p class="sc-hinweis">'+svg('info')+'<span>Deutlich unterschiedliche Einschätzungen bei: '+esc(abweichend.join(', '))+'. Das ist wertvoll – im Team besprechen, in welchen Situationen und bei wem sich das Kind anders zeigt.</span></p>';}
  return h+'</div>';
}

/* ---------- Ergebnis ---------- */
function balken(b){
  var w=b.wert==null?0:Math.max(2,b.wert/3*100);
  return '<div class="sc-balken"><span class="sc-bname">'+esc(b.name)+'</span><span class="sc-bspur" aria-hidden="true"><span class="sc-bfuell '+b.stufe+'" style="width:'+w.toFixed(1)+'%"></span><span class="sc-bmarke" style="left:'+(GELB/3*100).toFixed(1)+'%"></span><span class="sc-bmarke" style="left:'+(ROT/3*100).toFixed(1)+'%"></span></span>'+
    '<span class="sc-bwert '+b.stufe+'">'+(b.wert==null?'–':zahl(b.wert))+' · '+STUFE_TEXT[b.stufe]+'</span></div>';
}
function toolboxListe(ids){
  var T0=window.CDSE_TOOLBOX_INDEX, bl=(T0&&Array.isArray(T0.blaetter))?T0.blaetter:[];
  return ids.map(function(id){return bl.filter(function(b){return b.id===id;})[0];}).filter(Boolean).slice(0,4);
}
function detail(d,s,r){
  var e=auswerten(s), a=s.auswirkung||{}, bog=B(), me=K.ich();
  var h='<div class="sc-ergebnis" id="sc-ergebnis">'+
    '<div class="ar-knopfreihe sc-aktionen keindruck"><button class="ar-link" type="button" data-sc="liste">'+svg('left')+'Alle Screenings</button><span class="sc-platz"></span>'+
      '<button class="btn" type="button" data-sc="drucken">'+svg('print')+'Drucken</button>'+
      ((s.von===(me&&me.id)||r.weitergeben)?'<button class="btn gefahr" type="button" data-sc="loeschen" data-id="'+esc(s.id)+'">Löschen</button>':'')+'</div>'+
    '<div class="ar-karte sc-kopf"><p class="overline">Screening · '+esc(bog.titel)+'</p><h2>'+esc(H.schuelerName(d.person))+'</h2>'+
      '<p class="ar-leise">'+esc(datum(s.datum))+' · '+esc(wer(s))+' · '+esc(stufeName(s.stufe))+'</p>'+
      '<p class="sc-klein">Strukturierte Beobachtung ('+esc(bog.zeitraum)+'), kein Test und keine Diagnose. Die Ampel beschreibt, wie ausgeprägt die Beobachtungen in diesem Bogen sind – sie ist nicht an einer Vergleichsgruppe genormt.</p></div>';
  if(e.warn.length){
    h+='<div class="sc-warn" role="alert"><h3>'+svg('warn')+'Warnsignale – heute handeln</h3>'+e.warn.map(function(w){return '<div class="sc-warnpunkt"><b>'+esc(w.text)+'</b><p>'+esc(w.tun)+'</p></div>';}).join('')+
      (s.warnNotiz?'<p class="sc-warnnotiz"><b>Notiz:</b> '+esc(s.warnNotiz)+'</p>':'')+'</div>';
  }
  h+='<div class="sc-gesamt '+ART_KLASSE[e.gesamt.art]+'"><h3>'+esc(e.gesamt.titel)+'</h3><p>'+esc(e.gesamt.text)+'</p>'+e.gesamt.zusatz.map(function(t){return '<p class="sc-zusatz">'+esc(t)+'</p>';}).join('')+'</div>';
  h+='<div class="ar-karte"><div class="ar-kartenkopf"><h2>Profil</h2><span class="sc-legende"><span class="gruen">unauffällig</span><span class="gelb">beobachten</span><span class="rot">deutlich</span></span></div>'+
    '<div class="sc-profil">'+e.bereiche.map(balken).join('')+'</div>'+
    '<div class="sc-staerken"><span class="sc-bname">Stärken & Ressourcen</span><span class="sc-bspur" aria-hidden="true"><span class="sc-bfuell staerke" style="width:'+(e.staerken.wert==null?0:Math.max(2,e.staerken.wert/3*100)).toFixed(1)+'%"></span></span>'+
      '<span class="sc-bwert staerke">'+(e.staerken.wert==null?'–':zahl(e.staerken.wert))+' · '+({viele:'viele',einige:'einige',wenige:'wenige',offen:'zu wenig Angaben'})[e.staerken.niveau]+'</span></div>'+
    '<p class="sc-klein">Mittelwert der Antworten von 0 (nie) bis 3 (sehr oft). Markierungen bei '+zahl(GELB)+' und '+zahl(ROT)+'.</p></div>';
  /* Was konkret beobachtet wurde */
  var auff=e.bereiche.filter(function(b){return b.haeufig.length&&(b.stufe==='rot'||b.stufe==='gelb');});
  var st=items(bog.staerken,s.stufe).filter(function(i){return (s.antworten||{})[i.id]>=2;});
  if(auff.length||st.length){
    h+='<div class="ar-karte"><h2>Was beobachtet wurde</h2><div class="sc-beob">'+
      auff.map(function(b){return '<div><h3>'+esc(b.name)+'</h3><ul>'+b.haeufig.map(function(x){return '<li><span class="sc-oft">'+(x.v===3?'sehr oft':'oft')+'</span>'+esc(x.text)+'</li>';}).join('')+'</ul></div>';}).join('')+
      (st.length?'<div class="sc-beob-staerken"><h3>Stärken</h3><ul>'+st.map(function(i){return '<li>'+esc(i.text)+'</li>';}).join('')+'</ul></div>':'')+'</div></div>';
  }
  /* Nächste Schritte je auffälligem Bereich */
  var ziel=e.bereiche.filter(function(b){return b.stufe==='rot';}).concat(e.bereiche.filter(function(b){return b.stufe==='gelb';}));
  if(ziel.length){
    h+='<div class="ar-karte"><h2>Nächste Schritte</h2><div class="sc-schritte">'+ziel.map(function(b){
      var def=b.def, bl=toolboxListe(def.toolbox||[]), lm=(def.lernen||[]).filter(function(id){return LERN_TITEL[id];});
      return '<section class="sc-schritt"><h3><span class="sc-punkt '+b.stufe+'" aria-hidden="true"></span>'+esc(b.name)+'</h3>'+
        '<ul class="sc-tun">'+def.schritte.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul>'+
        (b.stufe==='rot'&&def.abklaeren&&def.abklaeren.length?'<p class="sc-abkl"><b>Abklären:</b> '+def.abklaeren.map(esc).join(' ')+'</p>':'')+
        '<div class="sc-ideen">'+
          (def.eldib&&def.eldib.length?'<div><span class="sc-ideen-titel">ELDiB-Ziele (je nach Stufe)</span><span class="sc-codes">'+def.eldib.map(function(c){return '<span class="sc-code">'+esc(c)+'</span>';}).join('')+'</span></div>':'')+
          (bl.length?'<div><span class="sc-ideen-titel">Arbeitsblätter</span>'+bl.map(function(x){return '<a href="apps/toolbox.html#blatt='+encodeURIComponent(x.id)+'" target="cdse-toolbox">'+esc(x.nr)+' '+esc(x.titel)+'</a>';}).join('')+'</div>':'')+
          (lm.length?'<div><span class="sc-ideen-titel">Zum Nachlesen (Lernen)</span>'+lm.map(function(id){return '<a href="apps/lernen.html#/modul/'+encodeURIComponent(id)+'" target="cdse-lernen">'+esc(LERN_TITEL[id])+'</a>';}).join('')+'</div>':'')+
        '</div></section>';
    }).join('')+'</div></div>';
  }
  /* Auswirkungen */
  var fr=bog.auswirkung.filter(function(f){return a[f.id]!=null&&a[f.id]!=='';});
  if(fr.length){
    h+='<div class="ar-karte"><h2>Auswirkungen im Alltag</h2><dl class="ar-dl sc-dl">'+fr.map(function(f){var o=f.optionen.filter(function(x){return x[0]===String(a[f.id]);})[0];return '<dt>'+esc(f.frage)+'</dt><dd>'+esc(o?o[1]:a[f.id])+'</dd>';}).join('')+
      '</dl>'+(a.ereignisText?'<p class="sc-klein"><b>Ereignis:</b> '+esc(a.ereignisText)+'</p>':'')+'</div>';
  }
  if(s.notiz){h+='<div class="ar-karte"><h2>Notiz</h2><p class="sc-notiz">'+esc(s.notiz).replace(/\n/g,'<br>')+'</p></div>';}
  h+='<details class="ar-karte sc-grundlagen keindruck"><summary>Worauf der Bogen beruht</summary><p>Die Bereiche folgen den in Forschung und Praxis etablierten Dimensionen kindlicher Schwierigkeiten – Aufmerksamkeit und Aktivität, nach innen gerichtete Belastungen (Angst, Stimmung), nach außen gerichtetes Verhalten, soziale Beziehungen, Lernen, Sprache und Motorik –, wie sie auch internationale Fragebögen und DSM-5-TR bzw. ICD-11 beschreiben. Der Bogen fragt nach der Häufigkeit konkret beobachtbaren Verhaltens in einem festen Zeitraum, erfasst Stärken und die Beeinträchtigung im Alltag und wird am besten von mehreren Personen ausgefüllt. Alle Aussagen sind eigene Formulierungen des CDSE. Er ersetzt keine Diagnostik.</p><ol class="sc-quellen">'+bog.quellen.map(function(q){return '<li>'+esc(q)+'</li>';}).join('')+'</ol></details>';
  return h+'</div>';
}

/* ---------- Formular ---------- */
function neuerEntwurf(d){return {datum:heute(),stufe:stufeAusKlasse(d),rolle:rolleVorschlag(),antworten:{},auswirkung:{},warn:[],warnNotiz:'',notiz:''};}
function entwurfSpeichern(id){try{sessionStorage.setItem('cdse-screening-entwurf-'+id,JSON.stringify(z(id).entwurf));}catch(e){}}
function entwurfLaden(id){try{return JSON.parse(sessionStorage.getItem('cdse-screening-entwurf-'+id)||'null');}catch(e){return null;}}
function entwurfWeg(id){try{sessionStorage.removeItem('cdse-screening-entwurf-'+id);}catch(e){}}
function skala(id,wert,art){
  var opt=B().skala.concat([{w:-1,t:'k. A.'}]);
  return '<div class="sc-skala" role="radiogroup" data-art="'+(art||'problem')+'">'+opt.map(function(o){
    return '<label title="'+esc(o.w<0?'kann ich nicht beurteilen':o.t)+'"><input type="radio" name="sc-'+id+'" value="'+o.w+'"'+(wert===o.w?' checked':'')+' data-sc-item="'+id+'"><span>'+esc(o.t)+'</span></label>';
  }).join('')+'</div>';
}
function formular(d){
  var e=z(d.id).entwurf, bog=B(), n=0;
  var h='<div class="sc-bogen"><div class="ar-karte sc-formkopf"><div class="ar-kartenkopf"><div><h2>Neues Screening</h2><p class="ar-leise">'+esc(H.schuelerName(d.person))+' · '+esc(bog.titel)+'</p></div>'+
    '<button class="ar-link" type="button" data-sc="abbrechen">'+svg('x')+'Abbrechen</button></div>'+
    '<div class="ar-raster3">'+H.feld('sc-datum','Datum',e.datum,'date')+
      H.auswahl('sc-stufe','Stufe',e.stufe,bog.stufen.map(function(s){return [s.id,s.name+' ('+s.alter+')'];}))+
      H.auswahl('sc-rolle','Ich beobachte als',e.rolle,bog.rollen)+'</div>'+
    '<p class="sc-anleitung">Wie oft haben Sie das <b>'+esc(bog.zeitraum)+'</b> beobachtet? Bewerten Sie nur, was Sie selbst gesehen haben – sonst „k. A.“ (kann ich nicht beurteilen). Es gibt keine richtigen oder falschen Antworten.</p></div>';
  bog.bereiche.forEach(function(b,bi){
    h+='<section class="ar-karte sc-abschnitt" id="sc-b-'+b.id+'"><h3><span class="sc-nr">'+(bi+1)+'</span>'+esc(b.name)+'</h3><p class="sc-bhinweis">'+esc(b.hinweis)+'</p>'+
      items(b,e.stufe).map(function(i){n++;return '<div class="sc-item" id="sc-i-'+i.id+'"><p>'+esc(i.text)+'</p>'+skala(i.id,e.antworten[i.id])+'</div>';}).join('')+'</section>';
  });
  h+='<section class="ar-karte sc-abschnitt staerke" id="sc-b-staerken"><h3><span class="sc-nr">'+svg('check')+'</span>'+esc(bog.staerken.name)+'</h3><p class="sc-bhinweis">'+esc(bog.staerken.hinweis)+'</p>'+
    items(bog.staerken,e.stufe).map(function(i){n++;return '<div class="sc-item" id="sc-i-'+i.id+'"><p>'+esc(i.text)+'</p>'+skala(i.id,e.antworten[i.id],'staerke')+'</div>';}).join('')+'</section>';
  h+='<section class="ar-karte sc-abschnitt" id="sc-auswirkung"><h3><span class="sc-nr">'+svg('ziel')+'</span>Auswirkungen im Alltag</h3><p class="sc-bhinweis">Erst die Beeinträchtigung macht aus Beobachtungen einen Handlungsbedarf.</p>'+
    bog.auswirkung.map(function(f){
      return '<fieldset class="sc-frage" id="sc-f-'+f.id+'"><legend>'+esc(f.frage)+'</legend><div class="sc-optionen">'+f.optionen.map(function(o){
        return '<label><input type="radio" name="sc-a-'+f.id+'" value="'+esc(o[0])+'"'+(String(e.auswirkung[f.id])===o[0]?' checked':'')+' data-sc-auswirkung="'+f.id+'"><span>'+esc(o[1])+'</span></label>';}).join('')+'</div>'+
        (f.id==='ereignis'?'<label class="ar-feld sc-ereignis"'+(e.auswirkung.ereignis==='ja'?'':' hidden')+'><span>Welches Ereignis? (kurz)</span><input type="text" data-sc-ereignis value="'+esc(e.auswirkung.ereignisText||'')+'"></label>':'')+'</fieldset>';
    }).join('')+'</section>';
  h+='<section class="ar-karte sc-abschnitt sc-warnabschnitt" id="sc-warnsignale"><h3><span class="sc-nr">'+svg('warn')+'</span>Warnsignale</h3><p class="sc-bhinweis">Werden nicht gezählt. Jedes Kreuz bedeutet: heute handeln – die Schritte stehen im Ergebnis.</p>'+
    warnsignale(e.stufe).map(function(w){return '<label class="sc-warnwahl"><input type="checkbox" data-sc-warn="'+w.id+'"'+(e.warn.indexOf(w.id)>=0?' checked':'')+'><span>'+esc(w.text)+'</span></label>';}).join('')+
    '<label class="ar-feld voll sc-warnnotiz-feld"'+(e.warn.length?'':' hidden')+'><span>Was genau wurde beobachtet oder gesagt? (wörtlich, mit Datum)</span><textarea rows="3" data-sc-warnnotiz>'+esc(e.warnNotiz||'')+'</textarea></label></section>';
  h+='<section class="ar-karte sc-abschnitt"><h3><span class="sc-nr">'+svg('edit')+'</span>Notiz</h3><label class="ar-feld voll"><span>Beobachtungssituation, weitere Beobachtungen, was schon hilft</span><textarea rows="4" data-sc-notiz>'+esc(e.notiz||'')+'</textarea></label></section>';
  var b=beantwortet(e);
  h+='<div class="sc-fuss"><span class="sc-stand" id="sc-stand">'+b+' von '+n+' Aussagen beantwortet</span><span class="sc-fortschritt" aria-hidden="true"><span id="sc-standbalken" style="width:'+Math.round(b/Math.max(1,n)*100)+'%"></span></span>'+
    '<button class="btn primary" type="button" data-sc="speichern">'+svg('check')+'Auswerten und speichern</button></div></div>';
  return h;
}
function beantwortet(e){var ids=alleItemIds(e.stufe);return ids.filter(function(id){return typeof e.antworten[id]==='number';}).length;}
function fehlend(e){
  var ids=alleItemIds(e.stufe).filter(function(id){return typeof e.antworten[id]!=='number';});
  var f=ids.map(function(id){return 'sc-i-'+id;});
  ['dauer','orte'].forEach(function(k){if(!e.auswirkung[k]){f.push('sc-f-'+k);}});
  return f;
}
function standNeu(e){
  var n=alleItemIds(e.stufe).length, b=beantwortet(e), s=document.getElementById('sc-stand'), bb=document.getElementById('sc-standbalken');
  if(s){s.textContent=b+' von '+n+' Aussagen beantwortet';}if(bb){bb.style.width=Math.round(b/Math.max(1,n)*100)+'%';}
}

/* =====================================================================
   Ereignisse (im Dossier)
   ===================================================================== */
function aktuell(){var d=H&&H.aktDossier&&H.aktDossier();return d||null;}
function neuZeichnen(d,fokus){H.dossierZeichnen(d);if(fokus){var el=document.querySelector(fokus);if(el){el.focus();}}}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-sc]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-sc'), zu=z(d.id);
  if(a==='neu'){zu.entwurf=entwurfLaden(d.id)||neuerEntwurf(d);zu.modus='neu';neuZeichnen(d);window.scrollTo(0,0);return;}
  if(a==='abbrechen'){
    var e0=zu.entwurf, leer=!e0||(!Object.keys(e0.antworten).length&&!e0.notiz&&!e0.warn.length);
    if(!leer&&!window.confirm('Den angefangenen Bogen verwerfen?')){return;}
    entwurfWeg(d.id);zu.entwurf=null;zu.modus='liste';neuZeichnen(d);return;
  }
  if(a==='liste'){zu.modus='liste';neuZeichnen(d);window.scrollTo(0,0);return;}
  if(a==='zeigen'){zu.modus='detail';zu.id=t.getAttribute('data-id');neuZeichnen(d);window.scrollTo(0,0);return;}
  if(a==='drucken'){document.body.classList.add('sc-druck');setTimeout(function(){window.print();setTimeout(function(){document.body.classList.remove('sc-druck');},300);},50);return;}
  if(a==='loeschen'){
    var sid=t.getAttribute('data-id');
    H.dialog('Screening löschen','<p>Dieses Screening wird aus dem Dossier entfernt. Im Protokoll bleibt vermerkt, dass es gelöscht wurde.</p>',[{text:'Abbrechen',wert:''},{text:'Löschen',wert:'ok',primaer:true,gefahr:true}],
      {ausfuehren:function(){return T.ops.screeningLoeschen(d.id,sid);}}).then(function(r){if(r.ergebnis){zu.modus='liste';H.toast('Screening gelöscht');neuZeichnen(r.ergebnis);}});
    return;
  }
  if(a==='speichern'){
    var e=zu.entwurf, f=fehlend(e);
    if(f.length){
      var el=document.getElementById(f[0]);
      Array.prototype.forEach.call(document.querySelectorAll('.sc-fehlt'),function(x){x.classList.remove('sc-fehlt');});
      f.forEach(function(id){var x=document.getElementById(id);if(x){x.classList.add('sc-fehlt');}});
      H.toast(f.length===1?'Eine Angabe fehlt noch – „k. A.“ ist auch eine Antwort.':f.length+' Angaben fehlen noch – „k. A.“ ist auch eine Antwort.');
      if(el){el.scrollIntoView({block:'center',behavior:'smooth'});var r0=el.querySelector('input');if(r0){r0.focus({preventScroll:true});}}
      return;
    }
    var eintrag={datum:e.datum||heute(),stufe:e.stufe,rolle:e.rolle,version:B().version,antworten:e.antworten,auswirkung:e.auswirkung,warn:e.warn,warnNotiz:e.warnNotiz||'',notiz:e.notiz||''};
    eintrag.kurz=kurz(eintrag);
    t.disabled=true;
    T.ops.screening(d.id,eintrag).then(function(neu){
      entwurfWeg(d.id);zu.entwurf=null;zu.modus='detail';
      var l=screenings(neu);zu.id=l.length?l.filter(function(x){return x.von===(K.ich()||{}).id;}).sort(function(a2,b2){return String(b2.z).localeCompare(String(a2.z));})[0].id:null;
      H.toast('Screening gespeichert');neuZeichnen(neu);window.scrollTo(0,0);
    },function(err){t.disabled=false;H.toast((err&&err.message)||String(err));});
  }
});
document.addEventListener('change',function(ev){
  var t=ev.target;if(!t.closest||!t.closest('#arbeit-body .sc-bogen')){return;}
  var d=aktuell();if(!d){return;}var e=z(d.id).entwurf;if(!e){return;}
  if(t.hasAttribute('data-sc-item')){e.antworten[t.getAttribute('data-sc-item')]=parseInt(t.value,10);var it=t.closest('.sc-item');if(it){it.classList.remove('sc-fehlt');}standNeu(e);}
  else if(t.hasAttribute('data-sc-auswirkung')){
    var k=t.getAttribute('data-sc-auswirkung');e.auswirkung[k]=t.value;var fs=t.closest('.sc-frage');if(fs){fs.classList.remove('sc-fehlt');}
    if(k==='ereignis'){var ef=document.querySelector('.sc-ereignis');if(ef){ef.hidden=t.value!=='ja';}}
  }
  else if(t.hasAttribute('data-sc-warn')){
    var w=t.getAttribute('data-sc-warn'), i=e.warn.indexOf(w);if(t.checked&&i<0){e.warn.push(w);}if(!t.checked&&i>=0){e.warn.splice(i,1);}
    var wn=document.querySelector('.sc-warnnotiz-feld');if(wn){wn.hidden=!e.warn.length;}
  }
  else if(t.name==='sc-datum'){e.datum=t.value;}
  else if(t.name==='sc-rolle'){e.rolle=t.value;}
  else if(t.name==='sc-stufe'){e.stufe=t.value;entwurfSpeichern(d.id);neuZeichnen(d,'select[name="sc-stufe"]');return;}
  entwurfSpeichern(d.id);
});
document.addEventListener('input',function(ev){
  var t=ev.target;if(!t.closest||!t.closest('#arbeit-body .sc-bogen')){return;}
  var d=aktuell();if(!d){return;}var e=z(d.id).entwurf;if(!e){return;}
  if(t.hasAttribute('data-sc-notiz')){e.notiz=t.value;}
  else if(t.hasAttribute('data-sc-warnnotiz')){e.warnNotiz=t.value;}
  else if(t.hasAttribute('data-sc-ereignis')){e.auswirkung.ereignisText=t.value;}
  else{return;}
  clearTimeout(t.__sc);t.__sc=setTimeout(function(){entwurfSpeichern(d.id);},400);
});
window.addEventListener('afterprint',function(){document.body.classList.remove('sc-druck');});

/* ---------- Kurzinfo für den Überblick und die Datenbank ---------- */
function letztes(d){var l=screenings(d);return l.length?{s:l[0],e:auswerten(l[0])}:null;}

/* Dossier neu geöffnet: mit der Übersicht beginnen – ein angefangener Bogen bleibt offen */
function geoeffnet(id){var zu=z(id);if(zu.modus==='detail'){zu.modus='liste';zu.id=null;}}

return {tab:tab, geoeffnet:geoeffnet, auswerten:auswerten, kurz:kurz, letztes:letztes, items:items, stufeAusKlasse:stufeAusKlasse,
  /* für Tests */ schwellen:{gelb:GELB,rot:ROT}};
})();
