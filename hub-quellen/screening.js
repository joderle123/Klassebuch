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
  else{g={art:'unauffaellig',titel:'Keine auffälligen Bereiche',text:'Im Bogen zeigt sich kein auffälliger Bereich. Wenn du dir trotzdem Sorgen machst: Beobachtungen festhalten und im Team besprechen.'};}
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
  if(zu.neuGewuenscht){zu.neuGewuenscht=false;if(r.bearbeiten){zu.entwurf=zu.entwurf||entwurfLaden(d.id)||neuerEntwurf(d);zu.modus='neu';}}
  if(zu.modus==='neu'&&r.bearbeiten){return formular(d);}
  if(zu.modus==='detail'){var s=screenings(d).filter(function(x){return x.id===zu.id;})[0];if(s){return detail(d,s,r);}zu.modus='liste';}
  return liste(d,r);
}

/* ---------- Liste und Vergleich ---------- */
function grenze90(){return new Date(Date.now()-90*864e5).toISOString().slice(0,10);}
function liste(d,r){
  var l=screenings(d), alt=altListe(d);
  var h='<div class="ar-karte sc-einfuehrung"><div class="ar-kartenkopf"><div><h2>Screening</h2><p class="ar-leise">Strukturierte Beobachtung: Wo braucht '+esc((d.person||{}).vorname||'das Kind')+' Unterstützung, wo liegen die Stärken, was ist der nächste Schritt? Kein Test und keine Diagnose.</p></div>'+
    (r.bearbeiten?'<button class="btn primary" type="button" data-sc="neu">'+svg('plus')+'Neues Screening</button>':'')+'</div>'+
    (l.length?'':'<p class="sc-leer">Noch kein Screening'+(alt.length?' mit dem neuen Bogen – die früheren Beobachtungen aus dem Klassenbuch stehen weiter unten':'')+'. Ein Bogen dauert etwa zehn Minuten. Am aussagekräftigsten wird es, wenn zwei Personen das Kind unabhängig voneinander einschätzen – zum Beispiel Lehrkraft und Éducateur.</p>')+
    (function(){
      if(!r.bearbeiten){return '';}
      var v=dsVorschlag(d,rolleVorschlag(),stufeAusKlasse(d));
      if(!v||!v.n||tageSeit(v.datum)>DS_FRISCH_TAGE){return '';}
      return '<p class="sc-dsinfo">'+svg('check')+'<span>Aus dem DS vom '+esc(datum(v.datum))+' sind im neuen Bogen schon <b>'+v.n+' Aussagen</b> vorausgefüllt.</span></p>';
    })()+'</div>';
  /* Warnsignale der letzten 90 Tage – auch wenn danach jemand ohne Warnsignal eingeschätzt hat */
  var grenze=grenze90();
  var warnL=l.filter(function(s){return String(s.datum)>=grenze;}).map(function(s){return {s:s,w:auswerten(s).warn};}).filter(function(x){return x.w.length;});
  var altWarn=alt.filter(function(a){return (a.akut||[]).length&&altDatum(a)>=grenze;});
  if(warnL.length||altWarn.length){h+='<div class="sc-warn-banner" role="alert">'+svg('warn')+'<div><b>'+(warnL.length+altWarn.length>1?'Warnsignale':'Warnsignal')+' in den letzten drei Monaten</b>'+
    warnL.map(function(x){return '<span>'+esc(datum(x.s.datum))+' ('+esc(H.kname(x.s.von))+'): '+x.w.map(function(w){return esc(w.text);}).join(' · ')+'</span>';}).join('')+
    altWarn.map(function(a){return '<span>'+esc(datum(altDatum(a)))+' (altes '+esc(appName(a.quelle))+'): '+a.akut.map(function(x){return esc(x.text);}).join(' · ')+'</span>';}).join('')+'</div></div>';}
  if(!l.length){return h+alt.map(function(a){return altKarte(d,r,a,true);}).join('');}
  h+='<div class="sc-liste">'+l.map(function(s){
    var e=auswerten(s), rot=e.bereiche.filter(function(b){return b.stufe==='rot';}), gelb=e.bereiche.filter(function(b){return b.stufe==='gelb';});
    return '<button class="sc-eintrag" type="button" data-sc="zeigen" data-id="'+esc(s.id)+'"><span class="sc-punkt '+ART_KLASSE[e.gesamt.art]+'" aria-hidden="true"></span>'+
      '<span class="sc-eintrag-text"><b>'+esc(datum(s.datum))+' · '+esc(e.gesamt.titel)+'</b><small>'+esc(wer(s))+' · '+esc(stufeName(s.stufe))+'</small>'+
      ((rot.length||gelb.length)?'<span class="sc-chips">'+rot.map(function(b){return '<span class="sc-chip rot">'+esc(b.name)+'</span>';}).join('')+gelb.map(function(b){return '<span class="sc-chip gelb">'+esc(b.name)+'</span>';}).join('')+'</span>':'')+
      '</span>'+svg('right')+'</button>';
  }).join('')+'</div>';
  if(l.length>1){h+=vergleich(l.slice(0,4));}
  return h+alt.map(function(a){return altKarte(d,r,a,false);}).join('');
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
      (s.ausDs?'<p class="sc-klein">'+((s.ausDs.items||[]).length+(s.ausDs.auswirkung||[]).length)+' Antworten wurden unverändert aus dem DS vom '+esc(datum(s.ausDs.datum))+' übernommen.</p>':'')+
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

/* ---------- Vorschläge aus dem DS ----------
   Ist der DS (ELDiB-Generator) ausgefüllt, sind die gleichbedeutenden Aussagen im neuen
   Bogen schon beantwortet und mit „DS“ markiert. Wer eine Antwort ändert, nimmt sie als
   eigene. Ein DS älter als drei Monate wird nur auf Wunsch übernommen (der Bogen fragt
   nach den letzten vier Wochen). */
var DS_FRISCH_TAGE=92, dsNeg=null;
function dsNegativ(k){
  if(!dsNeg){
    if(typeof DS_AUFBAU==='undefined'||!DS_AUFBAU){return null;}
    dsNeg={};Object.keys(DS_AUFBAU).forEach(function(b){((DS_AUFBAU[b]||{}).themen||[]).forEach(function(t){(t.aussagen||[]).forEach(function(a){dsNeg[a[0]]=a[1]<0;});});});
  }
  return dsNeg.hasOwnProperty(k)?dsNeg[k]:null;
}
/* 1–7 → 0–3; bei positiv formulierten Aussagen zu Schwierigkeiten umgedreht */
function dsHaeufigkeit(r,neg,staerke){var v=(neg===!staerke)?r:8-r;return v<=2?0:(v<=4?1:(v<=6?2:3));}
function dsText(k){var a=(typeof DS_TEXTE!=='undefined'&&DS_TEXTE&&DS_TEXTE.de&&DS_TEXTE.de.a)||{};return (a[k]&&a[k].q)||k;}
function tageSeit(iso){if(!iso){return 1e9;}var t=new Date(String(iso).slice(0,10)+'T12:00:00').getTime();return isNaN(t)?1e9:Math.floor((Date.now()-t)/864e5);}
function dsVorschlag(d,rolle,stufe){
  var st=H&&H.dsStand?H.dsStand(d):null, m=B().ausDs;
  if(!st||!m||!Object.keys(st.bewertungen||{}).length){return null;}
  var teile=rolle==='eltern'?['eltern']:['schule','beobachtung','kind'], erlaubt={}, werte={}, quelle={};
  alleItemIds(stufe||'GS').forEach(function(id){erlaubt[id]=1;});
  teile.forEach(function(t){Object.keys(m[t]||{}).forEach(function(k){
    var r=st.bewertungen[k], neg=dsNegativ(k);if(!(r>=1&&r<=7)||neg==null){return;}
    m[t][k].forEach(function(id){if(!erlaubt[id]){return;}(werte[id]=werte[id]||[]).push(dsHaeufigkeit(r,neg,/^st/.test(id)));(quelle[id]=quelle[id]||[]).push([k,r]);});
  });});
  var antworten={};Object.keys(werte).forEach(function(id){var l=werte[id];antworten[id]=Math.round(l.reduce(function(a,c){return a+c;},0)/l.length);});
  var auswirkung={}, kd=st.bewertungen[m.leiden];
  if(kd>=1&&kd<=7){auswirkung.leiden=String(dsHaeufigkeit(kd,true,false));}
  var ev=(st.chips.ereignisse||[]);
  if(ev.length){
    var namen=(typeof DS_TEXTE!=='undefined'&&DS_TEXTE&&DS_TEXTE.de&&DS_TEXTE.de.chips&&DS_TEXTE.de.chips.ereignisse)||{};
    auswirkung.ereignis='ja';auswirkung.ereignisText='laut DS: '+ev.map(function(k){return k==='andere'?'':((namen[k]||[k])[0]);}).filter(Boolean).join(', ');
  }
  return {datum:st.datum,antworten:antworten,quelle:quelle,auswirkung:auswirkung,n:Object.keys(antworten).length};
}
/* DS-Vorschläge in den Entwurf übernehmen (erzwingen: auch bei älterem DS) – eigene Antworten bleiben */
function dsEntfernen(e){
  var alt=e.ds||{};
  Object.keys(alt.items||{}).forEach(function(id){delete e.antworten[id];});
  Object.keys(alt.auswirkung||{}).forEach(function(k){delete e.auswirkung[k];if(k==='ereignis'){delete e.auswirkung.ereignisText;}});
  e.ds=null;e.dsAngebot=null;
}
function dsAnwenden(d,e,erzwingen){
  dsEntfernen(e);
  if(e.dsAus){return;}
  var v=dsVorschlag(d,e.rolle,e.stufe);
  if(!v||(!v.n&&!Object.keys(v.auswirkung).length)){return;}
  if(!erzwingen&&tageSeit(v.datum)>DS_FRISCH_TAGE){e.dsAngebot={datum:v.datum,n:v.n};return;}
  var items={}, ausw={};
  Object.keys(v.antworten).forEach(function(id){if(typeof e.antworten[id]!=='number'){e.antworten[id]=v.antworten[id];items[id]=v.quelle[id];}});
  Object.keys(v.auswirkung).forEach(function(k){
    if(k==='ereignisText'){return;}
    if(e.auswirkung[k]==null||e.auswirkung[k]===''){e.auswirkung[k]=v.auswirkung[k];ausw[k]=1;if(k==='ereignis'){e.auswirkung.ereignisText=v.auswirkung.ereignisText;}}
  });
  e.ds={datum:v.datum,items:items,auswirkung:ausw};
}
function dsMarke(e,id){
  var q=e.ds&&e.ds.items&&e.ds.items[id];if(!q){return '';}
  var SK=['','trifft gar nicht zu','','','teils/teils','','','trifft voll zu'];
  return '<span class="sc-dsmarke" title="'+esc('Vorschlag aus dem DS: '+q.map(function(x){return '„'+dsText(x[0])+'“ ('+x[1]+(SK[x[1]]?' – '+SK[x[1]]:'')+')';}).join('; '))+'">DS</span>';
}
/* Für den Kompass: Bereiche, die laut DS auffällig sind (Sicht der Schule, Beobachtung, Kind) */
function dsBereiche(d){
  var stufe=stufeAusKlasse(d), v=dsVorschlag(d,'lehrkraft',stufe);if(!v){return null;}
  var st=H.dsStand(d), m=B().ausDs.bereiche||{}, res={};
  B().bereiche.forEach(function(b){
    var werte=items(b,stufe).map(function(i){return v.antworten[i.id];}).filter(function(x){return typeof x==='number';});
    (m[b.id]||[]).forEach(function(k){var r=st.bewertungen[k], neg=dsNegativ(k);if(r>=1&&r<=7&&neg!=null){werte.push(dsHaeufigkeit(r,neg,false));}});
    if(werte.length<2){return;}
    var mw=werte.reduce(function(a,c){return a+c;},0)/werte.length;
    res[b.id]={name:b.name,wert:mw,stufe:mw>=ROT?'rot':((mw>=GELB||werte.indexOf(3)>=0)?'gelb':'gruen'),n:werte.length};
  });
  return {datum:v.datum,bereiche:res};
}
function eigeneAntworten(e){var ds=(e.ds&&e.ds.items)||{};return Object.keys(e.antworten||{}).filter(function(id){return !ds[id];}).length;}
function dsAnzahl(e){return e.ds?Object.keys(e.ds.items||{}).length+Object.keys(e.ds.auswirkung||{}).length:0;}
/* Eine Antwort wurde geändert: DS-Markierung weg, Hinweis oben neu zählen */
function dsMarkeWeg(el){
  if(el){el.classList.remove('sc-ausds');var m=el.querySelector('.sc-dsmarke');if(m){m.parentNode.removeChild(m);}}
  var d=aktuell(), e=d&&z(d.id).entwurf, nt=document.querySelector('.sc-bogen .sc-dsnote');
  if(e&&nt){var neu=dsHinweis(e);if(neu){nt.outerHTML=neu;}else{nt.parentNode.removeChild(nt);}}
}
function dsHinweis(e){
  var n=dsAnzahl(e);
  if(n){return '<div class="sc-dsnote" role="note">'+svg('info')+'<span><b>'+n+(n===1?' Antwort':' Antworten')+' aus dem DS vom '+esc(datum(e.ds.datum))+' vorausgefüllt</b>, markiert mit <span class="sc-dsmarke">DS</span>. Bitte kurz prüfen, ob es zu deinen eigenen Beobachtungen passt. Was du änderst, zählt als deine Antwort.</span><button class="ar-link" type="button" data-sc="ds-weg">Ohne DS-Vorschläge</button></div>';}
  if(e.dsAngebot){return '<div class="sc-dsnote" role="note">'+svg('info')+'<span>Es gibt einen DS vom '+esc(datum(e.dsAngebot.datum))+'. Er ist älter als drei Monate, der Bogen fragt aber nach den letzten vier Wochen.</span><button class="ar-link" type="button" data-sc="ds-rein">Trotzdem daraus vorausfüllen</button></div>';}
  if(e.dsAus){return '<div class="sc-dsnote leise" role="note"><span>Ohne Vorschläge aus dem DS.</span><button class="ar-link" type="button" data-sc="ds-rein">Doch aus dem DS vorausfüllen</button></div>';}
  return '';
}

/* ---------- Formular ---------- */
function neuerEntwurf(d){
  var e={datum:heute(),stufe:stufeAusKlasse(d),rolle:rolleVorschlag(),antworten:{},auswirkung:{},warn:[],warnNotiz:'',notiz:''};
  dsAnwenden(d,e,false);
  return e;
}
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
    '<p class="sc-anleitung">Wie oft hast du das <b>'+esc(bog.zeitraum)+'</b> beobachtet? Bewerte nur, was du selbst gesehen hast – sonst „k. A.“ (kann ich nicht beurteilen). Es gibt keine richtigen oder falschen Antworten.</p>'+dsHinweis(e)+'</div>';
  function itemHtml(i,art){n++;var m=dsMarke(e,i.id);return '<div class="sc-item'+(m?' sc-ausds':'')+'" id="sc-i-'+i.id+'"><p>'+esc(i.text)+m+'</p>'+skala(i.id,e.antworten[i.id],art)+'</div>';}
  bog.bereiche.forEach(function(b,bi){
    h+='<section class="ar-karte sc-abschnitt" id="sc-b-'+b.id+'"><h3><span class="sc-nr">'+(bi+1)+'</span>'+esc(b.name)+'</h3><p class="sc-bhinweis">'+esc(b.hinweis)+'</p>'+
      items(b,e.stufe).map(function(i){return itemHtml(i);}).join('')+'</section>';
  });
  h+='<section class="ar-karte sc-abschnitt staerke" id="sc-b-staerken"><h3><span class="sc-nr">'+svg('check')+'</span>'+esc(bog.staerken.name)+'</h3><p class="sc-bhinweis">'+esc(bog.staerken.hinweis)+'</p>'+
    items(bog.staerken,e.stufe).map(function(i){return itemHtml(i,'staerke');}).join('')+'</section>';
  h+='<section class="ar-karte sc-abschnitt" id="sc-auswirkung"><h3><span class="sc-nr">'+svg('ziel')+'</span>Auswirkungen im Alltag</h3><p class="sc-bhinweis">Erst die Beeinträchtigung macht aus Beobachtungen einen Handlungsbedarf.</p>'+
    bog.auswirkung.map(function(f){
      var aus=e.ds&&e.ds.auswirkung&&e.ds.auswirkung[f.id];
      return '<fieldset class="sc-frage'+(aus?' sc-ausds':'')+'" id="sc-f-'+f.id+'"><legend>'+esc(f.frage)+(aus?'<span class="sc-dsmarke" title="'+esc(f.id==='leiden'?'Vorschlag aus dem DS: „'+dsText(B().ausDs.leiden)+'“ (Gespräch mit dem Kind)':'Vorschlag aus dem DS (belastende Ereignisse)')+'">DS</span>':'')+'</legend><div class="sc-optionen">'+f.optionen.map(function(o){
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
  if(a==='ds-weg'||a==='ds-rein'){
    var ed=zu.entwurf;if(!ed){return;}
    if(a==='ds-weg'){dsEntfernen(ed);ed.dsAus=true;}
    else{ed.dsAus=false;dsAnwenden(d,ed,true);}
    entwurfSpeichern(d.id);neuZeichnen(d);H.toast(a==='ds-weg'?'DS-Vorschläge entfernt':'Aus dem DS vorausgefüllt');return;
  }
  if(a==='abbrechen'){
    var e0=zu.entwurf, leer=!e0||(!eigeneAntworten(e0)&&!e0.notiz&&!e0.warn.length);
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
  if(a==='alt-loeschen'){
    var aid=t.getAttribute('data-id');
    H.dialog('Aus diesem Dossier entfernen','<p>Die übernommenen Beobachtungen aus dem Klassenbuch werden aus diesem Dossier entfernt – zum Beispiel, weil sie dem falschen Kind zugeordnet wurden. Im Klassenbuch selbst bleibt alles erhalten; sie lassen sich in der Screening-Übersicht erneut übernehmen.</p>',
      [{text:'Abbrechen',wert:''},{text:'Entfernen',wert:'ok',primaer:true,gefahr:true}],
      {ausfuehren:function(){return T.ops.screeningAltLoeschen(d.id,aid);}}).then(function(r){if(r.ergebnis){H.toast('Entfernt');neuZeichnen(r.ergebnis);}});
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
    /* unverändert übernommene DS-Vorschläge dokumentieren */
    if(dsAnzahl(e)){eintrag.ausDs={datum:e.ds.datum,items:Object.keys(e.ds.items),auswirkung:Object.keys(e.ds.auswirkung)};}
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
  if(t.hasAttribute('data-sc-item')){
    var iid=t.getAttribute('data-sc-item');e.antworten[iid]=parseInt(t.value,10);var it=t.closest('.sc-item');if(it){it.classList.remove('sc-fehlt');}
    if(e.ds&&e.ds.items&&e.ds.items[iid]){delete e.ds.items[iid];dsMarkeWeg(it);}
    standNeu(e);
  }
  else if(t.hasAttribute('data-sc-auswirkung')){
    var k=t.getAttribute('data-sc-auswirkung');e.auswirkung[k]=t.value;var fs=t.closest('.sc-frage');if(fs){fs.classList.remove('sc-fehlt');}
    if(e.ds&&e.ds.auswirkung&&e.ds.auswirkung[k]){delete e.ds.auswirkung[k];dsMarkeWeg(fs);}
    if(k==='ereignis'){var ef=document.querySelector('.sc-ereignis');if(ef){ef.hidden=t.value!=='ja';}}
  }
  else if(t.hasAttribute('data-sc-warn')){
    var w=t.getAttribute('data-sc-warn'), i=e.warn.indexOf(w);if(t.checked&&i<0){e.warn.push(w);}if(!t.checked&&i>=0){e.warn.splice(i,1);}
    var wn=document.querySelector('.sc-warnnotiz-feld');if(wn){wn.hidden=!e.warn.length;}
  }
  else if(t.name==='sc-datum'){e.datum=t.value;}
  else if(t.name==='sc-rolle'){
    /* Eltern bekommen die Sicht der Eltern aus dem DS, alle anderen die der Schule */
    var warEltern=e.rolle==='eltern';e.rolle=t.value;
    if((t.value==='eltern')!==warEltern&&(e.ds||e.dsAngebot)){dsAnwenden(d,e,!!e.ds);entwurfSpeichern(d.id);neuZeichnen(d,'select[name="sc-rolle"]');return;}
  }
  else if(t.name==='sc-stufe'){e.stufe=t.value;if(e.ds||e.dsAngebot){dsAnwenden(d,e,!!e.ds);}entwurfSpeichern(d.id);neuZeichnen(d,'select[name="sc-stufe"]');return;}
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

/* =====================================================================
   Frühere Screenings aus dem alten Klassenbuch und dem Journal
   ---------------------------------------------------------------------
   Beide Apps haben Beobachtungen als Ja/Nein-Liste im Browser gespeichert
   (localStorage 'klassebuch_screening_v1' bzw. 'isa_screening_v1', die
   Kinder in 'klassebuch_roster_v1' bzw. 'isa_roster_v1') und in der
   gemeinsamen Team-Datei auf O:\ (Sammlung „screening“, dazu Tageskopien).
   Übernommen werden die Beobachtungen im Wortlaut, Angaben zum Umfeld,
   Dauer und Beeinträchtigung und frühere Krisenhinweise – als Archiv im
   Dossier (d.screeningsAlt). Liegt ein Kind in mehreren Quellen, gilt der
   neueste Stand; fehlende Angaben und der Verlauf werden aus älteren
   Ständen ergänzt. Die Rohdaten werden unverändert mitgesichert (roh und
   abweichende ältere Stände in fruehere), damit nichts verloren geht; die
   frühere automatische Auswertung (Verdachtsachsen) wird nicht angezeigt.
   In Klassenbuch und Journal wird nichts verändert oder gelöscht.
   ===================================================================== */
var KB_APPS={
  klassenbuch:{name:'Klassenbuch',screening:'klassebuch_screening_v1',roster:'klassebuch_roster_v1',praefix:''},
  journal:{name:'Journal',screening:'isa_screening_v1',roster:'isa_roster_v1',praefix:'isa:'}
};
var KB_AUS='cdse-screening-kb-ausgeblendet';
var KB_AKUT={'16.1':1,'16.2':1,'16.3':1};   /* ohne Textdatei: die akuten Aussagen des Klassenbuchs */
var kbDateien=[];                           /* gewählte Team-Dateien und Sicherungen – nur für diese Sitzung */
function lsJson(k,leer){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?leer:v;}catch(e){return leer;}}
function altListe(d){return (d.screeningsAlt||[]).slice().sort(function(a,b){return altDatum(b).localeCompare(altDatum(a));});}
function altDatum(a){return String(a.stand||a.z||'').slice(0,10);}
function appName(a){return (KB_APPS[a]||KB_APPS.klassenbuch).name;}
function kbHatInhalt(r){
  if(!r||typeof r!=='object'){return false;}
  var p=(r.plans&&typeof r.plans==='object')?r.plans:{};
  return !!((Array.isArray(r.symptome)&&r.symptome.length)||(Array.isArray(r.history)&&r.history.length)||
    Object.keys(p).some(function(k){var x=p[k]||{};return (Array.isArray(x.symptome)&&x.symptome.length)||(x.kontext&&Object.keys(x.kontext).length);}));
}
function kbStand(r){return String(r.updatedAt||((Array.isArray(r.history)&&r.history[0])||{}).date||'');}
/* Eine gewählte Datei lesen: Team-Datei bzw. Tageskopie (klassebuch-shared-v1) oder Journal-Sicherung */
function kbDateiLesen(name,text){
  var j;try{j=JSON.parse(text);}catch(e){throw new Error('„'+name+'“ ist keine lesbare Datei (JSON).');}
  function sammlung(c){var o={};(Array.isArray(c)?c:[]).forEach(function(x){if(x&&x.id!=null&&!x._del&&x.d&&typeof x.d==='object'){o[String(x.id)]=x.d;}});return o;}
  if(j&&j._format==='klassebuch-shared-v1'&&j.colls&&typeof j.colls==='object'){
    var c=j.colls, ro=sammlung(c.roster);
    return {app:(c.pei||c.agenda||c.goals||c.tasks)?'journal':'klassenbuch',herkunft:name,screening:sammlung(c.screening),
      roster:Object.keys(ro).map(function(k){return Object.assign({},ro[k],{id:k});})};
  }
  if(j&&j.format==='isa-journal-backup'&&j.stores&&typeof j.stores==='object'){
    var st=function(k,leer){try{return JSON.parse(j.stores[k]||'null')||leer;}catch(e){return leer;}};
    return {app:'journal',herkunft:name,screening:st('isa_screening_v1',{}),roster:st('isa_roster_v1',[])};
  }
  throw new Error('„'+name+'“ ist weder eine Team-Datei noch eine Sicherung von Klassenbuch oder Journal.');
}
function kbQuellen(){
  return Object.keys(KB_APPS).map(function(app){var a=KB_APPS[app];return {app:app,herkunft:a.name+' in diesem Browser',screening:lsJson(a.screening,{}),roster:lsJson(a.roster,[])};}).concat(kbDateien);
}
/* Mehrere Stände desselben Kindes: der neueste gilt, fehlende Angaben und Verlauf aus älteren ergänzen */
function kbKopie(o){return JSON.parse(JSON.stringify(o));}
function kbZusammen(l){
  var s=l.slice().sort(function(a,b){return kbStand(b.r).localeCompare(kbStand(a.r));}), r=kbKopie(s[0].r), weitere=[], gesehen={};
  gesehen[JSON.stringify(s[0].r)]=1;
  s.slice(1).forEach(function(x){var t=JSON.stringify(x.r);if(!gesehen[t]){gesehen[t]=1;weitere.push(kbKopie(x.r));}});
  if(weitere.length){
    var leer=function(o){return !o||typeof o!=='object'||!Object.keys(o).length;};
    ['demografie','gate'].forEach(function(k){if(leer(r[k])){var alt=weitere.filter(function(x){return !leer(x[k]);})[0];if(alt){r[k]=kbKopie(alt[k]);}}});
    /* neueste Fassung zuerst: je Tag gilt der jüngste Stand */
    var h={};[r].concat(weitere).forEach(function(x){(Array.isArray(x.history)?x.history:[]).forEach(function(e){if(e&&e.date&&!h[e.date]){h[e.date]=e;}});});
    r.history=Object.keys(h).sort().reverse().map(function(k){return h[k];});
  }
  return {r:r,weitere:weitere.slice(0,20)};
}
/* Alle früheren Screenings aus allen Quellen – mit dem Dossier, in das sie schon übernommen wurden */
function kbListe(dossiers,X){
  var drin={}, aus=lsJson(KB_AUS,{}), gruppen={}, namen={};
  (dossiers||[]).forEach(function(d){(d.screeningsAlt||[]).forEach(function(a){drin[a.kb+'|'+String(a.stand||'')]=d;});});
  kbQuellen().forEach(function(q){
    var pf=(KB_APPS[q.app]||KB_APPS.klassenbuch).praefix, sc=q.screening;
    (Array.isArray(q.roster)?q.roster:[]).forEach(function(s){if(s&&s.id!=null&&!namen[pf+s.id]){namen[pf+s.id]=s;}});
    if(!sc||typeof sc!=='object'||Array.isArray(sc)){return;}
    Object.keys(sc).forEach(function(k){
      if(!kbHatInhalt(sc[k])){return;}
      var g=gruppen[pf+k]||(gruppen[pf+k]={app:q.app,l:[]});
      g.l.push({r:sc[k],herkunft:q.herkunft});
    });
  });
  return Object.keys(gruppen).map(function(key){
    var g=gruppen[key], z0=kbZusammen(g.l), r=z0.r, s=namen[key]||{}, stand=kbStand(r), sym=Array.isArray(r.symptome)?r.symptome:[];
    var quellen=[];g.l.forEach(function(x){if(quellen.indexOf(x.herkunft)<0){quellen.push(x.herkunft);}});
    var y={kb:key,app:g.app,name:String(s.name||''),level:String(s.level||''),klasse:String(s.klasse||''),aktiv:s.active!==false,r:r,fruehere:z0.weitere,quellen:quellen,
      stand:stand,anzahl:sym.length,akut:sym.some(function(x){return KB_AKUT[x];}),in:drin[key+'|'+stand]||null,ausgeblendet:!!aus[key+'|'+stand]};
    if(X){try{y.akut=kbUmwandeln(y,X).akut.length>0;}catch(e){}}   /* mit Texten: auch Krisenhinweise aus den Vertiefungen */
    return y;
  }).sort(function(a,b){return (a.name||'~').localeCompare(b.name||'~','de')||a.kb.localeCompare(b.kb);});
}
function kbNorm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
/* Passende Dossiers zum Namen im Klassenbuch (dort meist nur der Vorname, manchmal mit Initiale: „Alex P.“) */
function kbVorschlaege(name,dossiers){
  var t=kbNorm(name).split(' ').filter(Boolean);if(!t.length){return [];}
  return (dossiers||[]).map(function(d){
    var p=d.person||{}, v=kbNorm(p.vorname).split(' ').filter(Boolean), n=kbNorm(p.nachname).split(' ').filter(Boolean), kb=t.join(' '), pt=0;
    if(kb===v.concat(n).join(' ')||kb===n.concat(v).join(' ')){pt=3;}
    else if(v.length&&t[0]===v[0]){
      var rest=t.slice(1);
      pt=!rest.length?1:(rest.every(function(x){return v.indexOf(x)>=0||n.some(function(y){return y===x||(x.length===1&&y.charAt(0)===x);});})?2:0);
    }
    return {d:d,p:pt};
  }).filter(function(x){return x.p>0;}).sort(function(a,b){var pa=a.d.person||{}, pb=b.d.person||{};return b.p-a.p||kbNorm(pa.nachname+' '+pa.vorname).localeCompare(kbNorm(pb.nachname+' '+pb.vorname),'de');});
}
/* Eindeutiger Vorschlag oder keiner */
function kbZuordnung(name,dossiers){var v=kbVorschlaege(name,dossiers);return (v.length===1||(v.length>1&&v[0].p>v[1].p))?v[0].d.id:'';}
/* Kürzel in Text verwandeln (X = window.CDSE_KB_TEXTE) */
function kbUmwandeln(y,X){
  var r=y.r||{}, beob=[], vert=[], umfeld=[], akut=[], schon={}, vSchon={}, uSchon={}, kr=X.krise||{}, krf=X.kriseFragen||{};
  (Array.isArray(r.symptome)?r.symptome:[]).forEach(function(id){
    id=String(id);if(schon[id]){return;}schon[id]=1;
    var t=X.symptome[id], b={id:id,kat:t?(X.kategorien[t[0]]||''):'',text:t?t[1]:'Aussage '+id+' (Text nicht gefunden)'};
    beob.push(b);if(X.akut[id]){akut.push({id:id,stufe:X.akut[id].sev,text:b.text});}
  });
  function frage(th,f,v){
    var q=th&&X.themen[th]&&X.themen[th].fragen[f];
    if(!q){Object.keys(X.themen).some(function(k){var x=X.themen[k].fragen[f];if(x&&x[1][v]!=null){q=x;return true;}return false;});}
    return q?{frage:q[0],antwort:q[1][v]!=null?q[1][v]:String(v)}:{frage:f,antwort:String(v)};
  }
  function umf(th,f,v){
    if(v==null||v===''){return;}var q=frage(th,f,v), k=q.frage+'|'+q.antwort;if(uSchon[k]){return;}uSchon[k]=1;umfeld.push(q);
    if(th&&krf[th]&&(krf[th][f]||[]).indexOf(v)>=0){akut.push({id:th+':'+f,stufe:'akut',text:q.frage+': '+q.antwort});}
  }
  var demo=(r.demografie&&typeof r.demografie==='object')?r.demografie:{};
  Object.keys(demo).forEach(function(f){umf(null,f,demo[f]);});
  var plans=(r.plans&&typeof r.plans==='object')?r.plans:{};
  Object.keys(plans).forEach(function(th){
    var p=plans[th]||{}, T0=X.themen[th];
    (Array.isArray(p.symptome)?p.symptome:[]).forEach(function(id){
      var t=T0&&T0.sym[id], txt=t?t[1]:'Aussage '+id+' (Text nicht gefunden)';if(vSchon[txt]){return;}vSchon[txt]=1;vert.push(txt);
      if((kr[th]||[]).indexOf(id)>=0){akut.push({id:th+':'+id,stufe:'akut',text:txt});}
    });
    var ko=(p.kontext&&typeof p.kontext==='object')?p.kontext:{};
    Object.keys(ko).forEach(function(f){umf(th,f,ko[f]);});
  });
  var gate=[];(X.gate||[]).forEach(function(g){var v=(r.gate||{})[g.key];if(v){gate.push({frage:g.titel,antwort:g.optionen[v]!=null?g.optionen[v]:String(v)});}});
  var verlauf=(Array.isArray(r.history)?r.history:[]).filter(function(h){return h&&h.date;}).map(function(h){return {datum:String(h.date).slice(0,10),anzahl:h.symCount|0,akut:!!h.acute};})
    .sort(function(a,b){return b.datum.localeCompare(a.datum);});
  var aSchon={};akut=akut.filter(function(x){if(aSchon[x.text]){return false;}aSchon[x.text]=1;return true;});
  var o={quelle:y.app||'klassenbuch',kb:y.kb,kbName:y.name,stand:y.stand,quellen:(y.quellen||[]).slice(),beobachtungen:beob,vertiefung:vert,umfeld:umfeld,gate:gate,akut:akut,verlauf:verlauf,
    roh:kbKopie(r)};
  if(y.fruehere&&y.fruehere.length){o.fruehere=kbKopie(y.fruehere);}   /* abweichende ältere Stände, unverändert */
  return o;
}
/* Die Texte liegen in apps/kb-screening-texte.js und werden nur für die Übernahme geladen */
function kbTexte(){
  if(window.CDSE_KB_TEXTE){return Promise.resolve(window.CDSE_KB_TEXTE);}
  return new Promise(function(res,rej){
    var s=document.createElement('script');s.src='apps/kb-screening-texte.js';
    s.onload=function(){if(window.CDSE_KB_TEXTE){res(window.CDSE_KB_TEXTE);}else{rej(new Error('Die Texte des alten Screenings ließen sich nicht lesen.'));}};
    s.onerror=function(){rej(new Error('Die Datei „apps/kb-screening-texte.js“ fehlt neben dem Hub. Bitte den Hub-Ordner vollständig aktualisieren.'));};
    document.head.appendChild(s);
  });
}
/* Archiv-Karte im Dossier */
function altKarte(d,r,a,offen){
  var me=K.ich(), darf=r.bearbeiten&&((me&&a.von===me.id)||r.weitergeben);
  var gruppen={}, folge=[];
  (a.beobachtungen||[]).forEach(function(b){var k=b.kat||'Beobachtungen';if(!gruppen[k]){gruppen[k]=[];folge.push(k);}gruppen[k].push(b.text);});
  var n=(a.beobachtungen||[]).length+(a.vertiefung||[]).length, fragen=(a.gate||[]).concat(a.umfeld||[]);
  var h='<details class="ar-karte sc-kbalt"'+(offen?' open':'')+'><summary><span class="sc-kbalt-titel"><b>Frühere Beobachtungen aus dem '+esc(appName(a.quelle))+'</b>'+
      '<small>Stand '+esc(datum(altDatum(a)))+' · '+n+' Beobachtung'+(n===1?'':'en')+((a.akut||[]).length?' · mit Krisenhinweis':'')+'</small></span>'+svg('right')+'</summary>'+
    '<p class="sc-klein">Aus dem Screening des alten '+esc(appName(a.quelle))+'s übernommen'+(a.von?' von '+esc(H.kname(a.von)):'')+(a.z?' am '+esc(datum(String(a.z).slice(0,10))):'')+
      ((a.quellen||[]).length>1?' (zusammengeführt aus: '+a.quellen.map(esc).join(', ')+')':'')+'. Dort wurde nur angekreuzt, ob etwas zutrifft – ohne Häufigkeit. Deshalb lässt es sich nicht mit dem neuen Bogen vergleichen. Die frühere automatische Auswertung wird bewusst nicht mehr angezeigt: Maßgeblich sind die Beobachtungen selbst.</p>';
  if((a.akut||[]).length){
    h+='<div class="sc-kbalt-akut" role="note">'+svg('warn')+'<div><b>Frühere Krisenhinweise (Stand '+esc(datum(altDatum(a)))+')</b><ul>'+a.akut.map(function(x){return '<li>'+esc(x.text)+'</li>';}).join('')+'</ul>'+
      '<p>Klären, ob das im Team bekannt ist und begleitet wird. Trifft es heute noch zu: ein neues Screening mit Warnsignal anlegen – dort stehen die Schritte.</p></div></div>';
  }
  if(folge.length||(a.vertiefung||[]).length){
    h+='<div class="sc-beob">'+folge.map(function(k){return '<div><h3>'+esc(k)+'</h3><ul>'+gruppen[k].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';}).join('')+
      ((a.vertiefung||[]).length?'<div><h3>Weitere Beobachtungen (Vertiefung)</h3><ul>'+a.vertiefung.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>':'')+'</div>';
  }
  if(fragen.length){h+='<h3 class="sc-kbalt-zwischen">Angaben zu Dauer, Alltag und Umfeld</h3><dl class="ar-dl sc-dl">'+fragen.map(function(q){return '<dt>'+esc(q.frage)+'</dt><dd>'+esc(q.antwort)+'</dd>';}).join('')+'</dl>';}
  if((a.verlauf||[]).length>1){
    h+='<p class="sc-klein"><b>Verlauf im Klassenbuch</b> (Zahl der angekreuzten Beobachtungen): '+a.verlauf.slice(0,8).map(function(v){return esc(datum(v.datum))+': '+v.anzahl;}).join(' · ')+(a.verlauf.length>8?' · …':'')+'</p>';
  }
  if(darf){h+='<div class="ar-knopfreihe sc-kbalt-knoepfe keindruck"><button class="ar-link gefahr" type="button" data-sc="alt-loeschen" data-id="'+esc(a.id)+'">Falsch zugeordnet? Aus diesem Dossier entfernen</button></div>';}
  return h+'</details>';
}
/* Übernahme-Dialog (Screening-Übersicht): erst die Texte laden, dann zuordnen */
function kbDialog(){
  return kbTexte().then(kbDialogZeigen,function(e){H.toast((e&&e.message)||String(e));});
}
/* Gewählte Dateien lesen; gleiche Dateinamen ersetzen den früheren Stand */
function kbDateienLesen(files){
  return Promise.all(Array.prototype.map.call(files,function(f){
    return f.text().then(function(t){return kbDateiLesen(f.name,t);});
  })).then(function(l){
    l.forEach(function(q){kbDateien=kbDateien.filter(function(x){return x.herkunft!==q.herkunft;}).concat([q]);});
    return l;
  });
}
function kbDialogZeigen(X){
  var alle=ub.alle||[], x=kbListe(alle,X), offen=x.filter(function(y){return !y.in;}), neuOeffnen=false;
  var ziel=alle.filter(function(d){return T.rechte(d).bearbeiten;}).sort(function(a,b){return H.schuelerName(a.person).localeCompare(H.schuelerName(b.person),'de');});
  function opt(d,sel){var p=d.person||{}, zusatz=[p.klasse,H.team(d.stelle).name].filter(Boolean);return '<option value="'+esc(d.id)+'"'+(sel?' selected':'')+'>'+esc(H.schuelerName(p)+(zusatz.length?' · '+zusatz.join(' · '):'')+(d.status==='inaktiv'?' (inaktiv)':''))+'</option>';}
  var zeilen=x.map(function(y){
    var info=[y.app==='journal'?'Journal':'',y.level,y.klasse,y.aktiv?'':'ehemalig'].filter(Boolean).concat([y.anzahl+' Beobachtung'+(y.anzahl===1?'':'en'),y.stand?'Stand '+datum(y.stand.slice(0,10)):'']).filter(Boolean);
    var wer='<span class="sc-kb-wer"><b>'+esc(y.name||'(ohne Namen)')+'</b><small>'+esc(info.join(' · '))+'</small>'+
      (y.quellen.length>1||kbDateien.length?'<small class="sc-kb-quelle">'+esc(y.quellen.join(', '))+'</small>':'')+
      (y.akut?'<span class="sc-chip rot">'+svg('warn')+'Krisenhinweis</span>':'')+'</span>';
    if(y.in){return '<div class="sc-kb-zeile fertig">'+wer+'<span class="sc-kb-ziel">'+svg('check')+'übernommen in '+esc(H.schuelerName(y.in.person))+'</span></div>';}
    var vor=kbVorschlaege(y.name,ziel), wahl=kbZuordnung(y.name,ziel), vid={};vor.forEach(function(v){vid[v.d.id]=1;});
    return '<div class="sc-kb-zeile">'+wer+'<label class="ar-feld sc-kb-ziel"><span>Dossier</span><select name="kb:'+esc(y.kb)+'">'+
      '<option value="">– nicht übernehmen –</option>'+
      (vor.length?'<optgroup label="Passt zum Namen">'+vor.map(function(v){return opt(v.d,v.d.id===wahl);}).join('')+'</optgroup>':'')+
      '<optgroup label="Alle Dossiers">'+ziel.filter(function(d){return !vid[d.id];}).map(function(d){return opt(d,false);}).join('')+'</optgroup></select></label></div>';
  }).join('');
  var inhalt=(x.length?'<p>Gefunden: <b>'+x.length+'</b> frühere'+(x.length===1?'s Screening':' Screenings')+' aus Klassenbuch oder Journal'+(offen.length<x.length?', davon '+(x.length-offen.length)+' schon übernommen':'')+'. Ordne jedes Kind seinem Dossier zu – Vorschläge nach dem Namen sind schon ausgewählt, bitte prüfen.</p>':
      '<p>In diesem Browser liegen keine früheren Screenings aus Klassenbuch oder Journal. Wähle die Team-Datei auf O:\\ (zum Beispiel „klassebuch-team.json“) oder eine Tageskopie aus.</p>')+
    '<p class="sc-klein">Übernommen werden die Beobachtungen im Wortlaut, Angaben zu Dauer, Alltag und Umfeld und frühere Krisenhinweise. Die frühere automatische Auswertung (Verdachtsachsen) wird nicht angezeigt. In Klassenbuch und Journal bleibt alles unverändert.</p>'+
    (ziel.length||!x.length?'':'<p class="sc-hinweis">'+svg('info')+'<span>Du hast noch in keinem Dossier Schreibrechte. Lege die Dossiers zuerst an oder bitte die Fallverantwortlichen um ein Schreibrecht.</span></p>')+
    (x.length?'<div class="sc-kb-liste">'+zeilen+'</div>':'')+
    '<div class="sc-kb-datei"><label class="btn"><input type="file" accept=".json,application/json" multiple data-kb-datei>'+svg('datei')+'Team-Datei oder Tageskopien hinzufügen</label>'+
      '<span>'+(kbDateien.length?'Schon gelesen: '+kbDateien.map(function(q){return esc(q.herkunft);}).join(', ')+'.':'Die Team-Datei enthält den gemeinsamen Stand aller Geräte; Tageskopien helfen, später verlorene Angaben wiederzufinden.')+'</span></div>'+
    (offen.length?'<label class="sc-kb-aus"><input type="checkbox" name="kb-rest-aus"><span>Kinder, die ich nicht zuordne, hier nicht mehr anzeigen</span></label>':'');
  return H.dialog('Frühere Screenings übernehmen',inhalt,
    offen.length?[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}]:[{text:'Schließen',wert:''}],
    {breit:true,
     nachAufbau:function(dlg){
       var inp=dlg.querySelector('[data-kb-datei]');if(!inp){return;}
       inp.addEventListener('change',function(){
         if(!inp.files||!inp.files.length){return;}
         dlg.fehler('');
         kbDateienLesen(inp.files).then(function(){neuOeffnen=true;dlg.dispatchEvent(new Event('cancel'));},function(e){inp.value='';dlg.fehler((e&&e.message)||String(e));});
       });
     },
     pruefen:function(w){var n=offen.filter(function(y){return w.werte['kb:'+y.kb];}).length;return (n||w.werte['kb-rest-aus'])?'':'Bitte mindestens einem Kind ein Dossier zuordnen – oder „Abbrechen“.';},
     ausfuehren:function(w){
       var los=offen.map(function(y){return {y:y,id:w.werte['kb:'+y.kb]||''};});
       var mit=los.filter(function(p){return p.id;}), ohne=los.filter(function(p){return !p.id;});
       if(w.werte['kb-rest-aus']&&ohne.length){var aus=lsJson(KB_AUS,{});ohne.forEach(function(p){aus[p.y.kb+'|'+p.y.stand]=1;});try{localStorage.setItem(KB_AUS,JSON.stringify(aus));}catch(e){}}
       if(!mit.length){return {ok:0,schon:0,fehler:[]};}
       var erg={ok:0,schon:0,fehler:[]}, start=new Date().toISOString(), me=K.ich()||{};
       /* nacheinander – zwei Kinder im selben Dossier dürfen sich nicht überschreiben */
       return mit.reduce(function(p,m){return p.then(function(){
         return T.ops.screeningAlt(m.id,kbUmwandeln(m.y,X)).then(function(neu){
           var e=(neu.screeningsAlt||[]).filter(function(a){return a.kb===m.y.kb&&String(a.stand||'')===String(m.y.stand||'');})[0];
           if(e&&e.von===me.id&&String(e.z)>=start){erg.ok++;}else{erg.schon++;}
           ub.alle=ub.alle.map(function(d){return d.id===neu.id?neu:d;});ub.liste=ub.liste.map(function(d){return d.id===neu.id?neu:d;});
         },function(e){erg.fehler.push((m.y.name||m.y.kb)+': '+((e&&e.message)||String(e)));});
       });},Promise.resolve()).then(function(){return erg;});
     }}).then(function(r){
       if(neuOeffnen){return kbDialogZeigen(X);}
       if(!r.ergebnis){return;}
       var e=r.ergebnis, t=[];
       if(e.ok){t.push(e.ok+' Screening'+(e.ok===1?'':'s')+' übernommen');}
       if(e.schon){t.push(e.schon+' war'+(e.schon===1?'':'en')+' schon übernommen');}
       if(e.fehler.length){t.push(e.fehler.length+' nicht übernommen – '+e.fehler.join('; '));}
       H.toast(t.length?t.join(' · '):'Ausgeblendet');
       if(ub.el&&document.body.contains(ub.el)){ubZeichnen();}
     });
}

/* =====================================================================
   Übersicht aller Schüler (#/screening)
   ===================================================================== */
var ub={filter:'alle',q:'',el:null,liste:[],alle:[]};
var ART_TEXT={sofort:'Heute handeln',planen:'Unterstützung planen',foerdern:'Gezielt fördern',beobachten:'Im Blick behalten',unauffaellig:'Unauffällig'};
function warnNeu(d){
  var g=grenze90();
  return screenings(d).some(function(s){return String(s.datum)>=g&&auswerten(s).warn.length;})||(d.screeningsAlt||[]).some(function(a){return (a.akut||[]).length&&altDatum(a)>=g;});
}
function uebersicht(el,liste){
  if(!bausteine()||!B()){el.innerHTML='<p>Das Screening fehlt in dieser Hub-Datei.</p>';return;}
  ub.el=el;ub.alle=(liste||[]).slice();ub.liste=ub.alle.filter(function(d){return d.status!=='inaktiv';});
  if(!el.__sc){el.__sc=true;
    el.addEventListener('click',function(ev){
      var t=ev.target.closest('[data-scu]');if(!t){return;}
      var a=t.getAttribute('data-scu'), id=t.getAttribute('data-id');
      if(a==='filter'){ub.filter=t.getAttribute('data-wert');ubZeichnen();var f=ub.el.querySelector('[data-scu="filter"][data-wert="'+ub.filter+'"]');if(f){f.focus();}return;}
      if(a==='oeffnen'){H.dossierOeffnen(id,'screening');return;}
      if(a==='neu'){z(id).neuGewuenscht=true;H.dossierOeffnen(id,'screening');return;}
      if(a==='kb'){kbDialog();return;}
    });
    el.addEventListener('input',function(ev){if(ev.target.id==='sc-ub-q'){ub.q=ev.target.value;var f=ub.el.querySelector('#sc-ub-tabelle');if(f){f.outerHTML=ubTabelle();}}});
  }
  ubZeichnen();
}
function ubDaten(){
  return ub.liste.map(function(d){var l=screenings(d), e=l.length?auswerten(l[0]):null;return {d:d,s:l[0]||null,e:e,warn:warnNeu(d),r:T.rechte(d)};});
}
function ubZeichnen(){
  var x=ubDaten(), n={alle:x.length,warn:0,bedarf:0,ohne:0,meine:0}, me=K.ich();
  x.forEach(function(y){if(y.warn){n.warn++;}if(y.e&&(y.e.gesamt.art==='planen'||y.e.gesamt.art==='foerdern')){n.bedarf++;}if(!y.s){n.ohne++;}if(meine(y.d,me)){n.meine++;}});
  var kb=kbListe(ub.alle), kbOffen=kb.filter(function(y){return !y.in&&!y.ausgeblendet;});
  var h=(kbOffen.length?'<div class="ar-karte sc-kb-karte"><div class="sc-kb-text"><b>Frühere Screenings aus Klassenbuch oder Journal</b><span>'+(kbOffen.length===1?'Ein früheres Screening ist':kbOffen.length+' frühere Screenings sind')+' noch keinem Dossier zugeordnet. Übernimm '+(kbOffen.length===1?'es':'sie')+', damit die Beobachtungen nicht verloren gehen.</span></div>'+
      '<button class="btn primary" type="button" data-scu="kb">'+svg('check')+'Zuordnen und übernehmen</button></div>':'')+
    '<div class="sc-ub-zahlen">'+[['warn','Warnsignale (3 Monate)','rot'],['bedarf','Handlungsbedarf','gelb'],['ohne','ohne Screening',''],['alle','aktive Schüler','']].map(function(k){
      return '<div class="sc-ub-zahl '+k[2]+'"><b>'+n[k[0]]+'</b><span>'+k[1]+'</span></div>';}).join('')+'</div>'+
    '<div class="toolbar ar-toolbar"><div class="catbar" role="group" aria-label="Auswahl">'+[['alle','Alle'],['warn','Warnsignale'],['bedarf','Handlungsbedarf'],['ohne','Ohne Screening'],['meine','Nur meine']].map(function(f){
      return '<button class="catchip'+(ub.filter===f[0]?' on':'')+'" type="button" data-scu="filter" data-wert="'+f[0]+'" aria-pressed="'+(ub.filter===f[0])+'">'+f[1]+'<span class="n">'+n[f[0]]+'</span></button>';}).join('')+'</div>'+
    '<label class="search"><svg class="ic"><use href="#i-search"/></svg><input id="sc-ub-q" type="search" placeholder="Name, Klasse …" autocomplete="off" aria-label="Schüler suchen" value="'+esc(ub.q)+'"></label></div>'+
    ubTabelle()+
    '<p class="sc-klein">Aktive Schülerinnen und Schüler. Ein Screening dauert etwa zehn Minuten; am aussagekräftigsten ist es, wenn zwei Personen unabhängig voneinander einschätzen. Einschätzungen älter als sechs Monate sind grau markiert.'+
      (!kbOffen.length?' <button class="ar-link" type="button" data-scu="kb">Frühere Screenings aus Klassenbuch oder Journal übernehmen'+(kb.length?' ('+kb.length+')':'')+'</button>':'')+'</p>';
  ub.el.innerHTML=h;
}
function meine(d,me){return !!me&&((d.verantwortlich||[]).indexOf(me.id)>=0||!!(d.rechte&&d.rechte[me.id]));}
function ubTabelle(){
  var me=K.ich(), q=ub.q.trim().toLowerCase(), alt=new Date(Date.now()-182*864e5).toISOString().slice(0,10);
  var x=ubDaten().filter(function(y){
    if(ub.filter==='warn'&&!y.warn){return false;}
    if(ub.filter==='bedarf'&&!(y.e&&(y.e.gesamt.art==='planen'||y.e.gesamt.art==='foerdern'))){return false;}
    if(ub.filter==='ohne'&&y.s){return false;}
    if(ub.filter==='meine'&&!meine(y.d,me)){return false;}
    if(q){var p=y.d.person||{};if([p.nachname,p.vorname,p.klasse,p.schule].join(' ').toLowerCase().indexOf(q)<0){return false;}}
    return true;
  });
  var rang={sofort:0,planen:1,foerdern:2,beobachten:3,unauffaellig:4};
  x.sort(function(a,b){return ((b.warn?1:0)-(a.warn?1:0))||((a.e?rang[a.e.gesamt.art]:5)-(b.e?rang[b.e.gesamt.art]:5))||H.schuelerName(a.d.person).localeCompare(H.schuelerName(b.d.person),'de');});
  if(!x.length){return '<div id="sc-ub-tabelle" class="ar-karte ar-leer"><p>Keine Schülerinnen und Schüler für diese Auswahl.</p></div>';}
  return '<div id="sc-ub-tabelle" class="ar-tabelle sc-ub-tab" role="table" aria-label="Screening je Schüler"><div class="ar-zeile kopf" role="row"><span role="columnheader">Name</span><span role="columnheader">Letztes Screening</span><span role="columnheader">Einschätzung</span><span role="columnheader">Deutlich</span><span role="columnheader"></span></div>'+
    x.map(function(y){
      var p=y.d.person||{}, rot=y.e?y.e.bereiche.filter(function(b){return b.stufe==='rot';}):[];
      return '<div class="ar-zeile'+(y.s&&String(y.s.datum)<alt?' sc-alt':'')+'" role="row"><span role="cell" class="ar-name"><button type="button" class="sc-ub-name" data-scu="oeffnen" data-id="'+esc(y.d.id)+'"><b>'+esc(H.schuelerName(p))+'</b><small>'+esc([p.klasse,H.team(y.d.stelle).name].filter(Boolean).join(' · '))+'</small></button></span>'+
        '<span role="cell">'+(y.s?esc(datum(y.s.datum))+'<small class="sc-ub-von">'+esc(H.kname(y.s.von))+'</small>':'<span class="ar-leise">noch keins</span>'+
          ((y.d.screeningsAlt||[]).length?'<small class="sc-ub-von">früher im Klassenbuch ('+esc(datum(altDatum(altListe(y.d)[0])))+')</small>':''))+'</span>'+
        '<span role="cell">'+(y.warn?'<span class="sc-chip rot">'+svg('warn')+'Warnsignal</span> ':'')+(y.e?'<span class="sc-art '+ART_KLASSE[y.e.gesamt.art]+'">'+esc(ART_TEXT[y.e.gesamt.art])+'</span>':'')+'</span>'+
        '<span role="cell" class="sc-ub-bereiche">'+rot.map(function(b){return '<span class="sc-chip rot">'+esc(b.name)+'</span>';}).join('')+'</span>'+
        '<span role="cell">'+(y.r.bearbeiten?'<button class="btn" type="button" data-scu="neu" data-id="'+esc(y.d.id)+'">'+svg('plus')+'Screening</button>':'')+'</span></div>';
    }).join('')+'</div>';
}

/* ---------- Leerer Bogen zum Ausdrucken ---------- */
function leerDrucken(stufe){
  var bog=B(), st=(bog.stufen.filter(function(s){return s.id===stufe;})[0]||bog.stufen[1]);
  var sk=bog.skala.map(function(x){return x.t;}).concat(['k. A.']);
  function tabelle(titel,hinweis,l){
    return '<h2>'+esc(titel)+'</h2>'+(hinweis?'<p class="h">'+esc(hinweis)+'</p>':'')+'<table><thead><tr><th></th>'+sk.map(function(t){return '<th class="k">'+esc(t)+'</th>';}).join('')+'</tr></thead><tbody>'+
      l.map(function(i){return '<tr><td>'+esc(i.text)+'</td>'+sk.map(function(){return '<td class="k"><span class="box"></span></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
  }
  var h='<!doctype html><html lang="de"><head><meta charset="utf-8"><title>'+esc(bog.titel)+' – '+esc(st.name)+'</title><style>'+
    'body{font:10.5pt/1.4 "Segoe UI",Arial,sans-serif;color:#0E1628;margin:18mm 16mm;}h1{font-size:17pt;margin:0 0 2pt;}h2{font-size:11.5pt;margin:14pt 0 3pt;break-after:avoid;}'+
    '.u{color:#586277;margin:0 0 8pt;}.f{display:grid;grid-template-columns:repeat(4,1fr);gap:6pt 14pt;margin:8pt 0 10pt;}.f div{border-bottom:1px solid #8C96A8;padding-top:14pt;font-size:8.5pt;color:#586277;}'+
    '.a{background:#ECEEFA;border-radius:6pt;padding:6pt 9pt;font-size:9.5pt;}p.h{margin:0 0 4pt;font-size:8.5pt;color:#586277;}table{border-collapse:collapse;width:100%;break-inside:auto;}tr{break-inside:avoid;}'+
    'td,th{border-top:1px solid #E2E6EC;padding:4pt 4pt;vertical-align:middle;font-size:9.5pt;text-align:left;}th{font-size:8pt;color:#586277;font-weight:600;}.k{width:42pt;text-align:center;}'+
    '.box{display:inline-block;width:10pt;height:10pt;border:1.2px solid #586277;border-radius:2pt;}.w td:first-child{width:14pt;}.lin{border-bottom:1px solid #8C96A8;height:16pt;}'+
    '.fuss{margin-top:14pt;font-size:8pt;color:#8C96A8;border-top:1px solid #E2E6EC;padding-top:5pt;}@page{margin:0;}</style></head><body>'+
    '<h1>'+esc(bog.titel)+'</h1><p class="u">'+esc(st.name)+' ('+esc(st.alter)+') · CDSE · strukturierte Beobachtung, kein Test und keine Diagnose</p>'+
    '<div class="f"><div>Name des Kindes</div><div>Klasse</div><div>Beobachtet von</div><div>Datum</div></div>'+
    '<p class="a">Wie oft haben Sie das <b>'+esc(bog.zeitraum)+'</b> beobachtet? Bewerten Sie nur, was Sie selbst gesehen haben – sonst „k. A.“ (kann ich nicht beurteilen).</p>';
  bog.bereiche.forEach(function(b,i){h+=tabelle((i+1)+'. '+b.name,b.hinweis,items(b,stufe));});
  h+=tabelle(bog.staerken.name,bog.staerken.hinweis,items(bog.staerken,stufe));
  h+='<h2>Auswirkungen im Alltag</h2><table>'+bog.auswirkung.map(function(f){return '<tr><td><b>'+esc(f.frage)+'</b><br>'+f.optionen.map(function(o){return '<span class="box"></span> '+esc(o[1]);}).join('&nbsp;&nbsp;&nbsp;')+'</td></tr>';}).join('')+'</table>';
  h+='<h2>Warnsignale – jedes Kreuz heißt: heute handeln und die Leitung informieren</h2><table class="w">'+warnsignale(stufe).map(function(w){return '<tr><td><span class="box"></span></td><td>'+esc(w.text)+'</td></tr>';}).join('')+'</table>';
  h+='<h2>Notiz</h2><div class="lin"></div><div class="lin"></div><div class="lin"></div>'+
    '<p class="fuss">Auswertung im CDSE Hub (Schüler → Dossier → Screening). Eigene Formulierungen des CDSE, keine Aussagen aus geschützten Fragebögen.</p></body></html>';
  var w=window.open('','_blank');if(!w){H.toast('Das Druckfenster wurde blockiert.');return;}
  w.document.write(h);w.document.close();w.focus();setTimeout(function(){try{w.print();}catch(e){}},300);
}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('[data-scu="leer"]');if(!t||!bausteine()){return;}
  H.dialog('Leeren Bogen drucken','<p>Für welche Stufe?</p>',B().stufen.map(function(s){return {text:s.name,wert:s.id};}).concat([{text:'Abbrechen',wert:''}]),{}).then(function(r){if(r.aktion){leerDrucken(r.aktion);}});
});

return {tab:tab, geoeffnet:geoeffnet, uebersicht:uebersicht, leerDrucken:leerDrucken, auswerten:auswerten, kurz:kurz, letztes:letztes, items:items, stufeAusKlasse:stufeAusKlasse,
  /* Vorschläge aus dem DS (Formular) und auffällige Bereiche laut DS (Kompass) */ dsVorschlag:dsVorschlag, dsBereiche:dsBereiche,
  /* frühere Klassenbuch-Screenings */ kbListe:kbListe, kbVorschlaege:kbVorschlaege, kbZuordnung:kbZuordnung, kbUmwandeln:kbUmwandeln, kbTexte:kbTexte,
  /* für Tests */ schwellen:{gelb:GELB,rot:ROT}};
})();
