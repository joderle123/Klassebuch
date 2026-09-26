/* =====================================================================
   CDSE Hub — Verlauf auf einen Blick: Wirkt, was wir tun?
   ---------------------------------------------------------------------
   Karte im Reiter „Profil & Verlauf“: eine Zeitachse mit Bahnen für die
   Tageskarte, Vorfälle und Time-out je Woche, Screenings, Gespräche und
   Beobachtungen. Senkrechte Linien markieren Maßnahmen (Fokusziele,
   Tageskarte, Überprüfungen, Berichte mit Medikation, Weitergaben).
   Darunter ein Vorher-nachher-Vergleich je Maßnahme – als Hinweis auf
   eine Richtung, nicht als Beweis (Logik der Einzelfallanalyse, vgl.
   Kazdin, 2011). Dazu eine Zeile für den Überblick. Liest nur.
   ===================================================================== */
window.CDSE_VERLAUF=(function(){
'use strict';
var H=null;
function bausteine(){H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!H;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return (n<10?'0':'')+n;}
function isoVon(t){return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());}
/* Tag (JJJJ-MM-TT): Zeitstempel mit Uhrzeit (z. B. „z“, in UTC gespeichert) zählen in der Ortszeit –
   sonst landet ein Eintrag kurz nach Mitternacht beim Vortag. Ein reines Datum bleibt, wie es ist. */
function iso(v){v=String(v||'');if(v.length>10&&v.charAt(10)==='T'){var t=new Date(v);if(!isNaN(t)){return isoVon(t);}}return v.slice(0,10);}
function heute(){return H?H.heuteIso():isoVon(new Date());}
function datum(i){return H?H.datum(i):i;}
function kurzDatum(i){return datum(i).slice(0,6);}
function plusTage(i,n){var t=new Date(i+'T12:00:00');t.setDate(t.getDate()+n);return isoVon(t);}
function tageZwischen(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);}
function montag(i){var w=new Date(i+'T12:00:00').getDay();return plusTage(i,-((w+6)%7));}
function monatPlus(i){var y=+i.slice(0,4), m=+i.slice(5,7)+1;if(m>12){m=1;y++;}return y+'-'+pad(m)+'-01';}
function zahl(x){return (Math.round(x*10)/10).toString().replace('.',',');}
var BEREICHE=[[91,'3 Monate'],[182,'6 Monate'],[365,'12 Monate']], spanne=91;
var MONATE=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'], MON_KURZ=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var SC_STUFE={unauffaellig:0,beobachten:1,foerdern:2,planen:3,sofort:4}, SC_NAME=['unauffällig','im Blick behalten','gezielt fördern','Unterstützung planen','Warnsignal'];
var BERICHT={arztbrief:'Arztbrief',befund:'Befund',therapie:'Therapiebericht',schule:'Schulbericht',bericht:'Bericht'};
var HINWEIS='Klicke oder tippe auf einen Punkt, einen Balken oder eine Nummer – hier steht dann der Wert.';

/* ---------- Daten sammeln ---------- */
function daten(d,ab,bis){
  var ein=(d.eintraege||[]).filter(Boolean), imZ=function(x){return x>=ab&&x<=bis;};
  var vorf=ein.filter(function(e){return e.art==='vorfall'&&imZ(iso(e.datum));}).map(function(e){var v=e.vorfall||{};return {datum:iso(e.datum),min:(H.vorfallMinuten&&v.timeoutVon&&v.timeoutBis)?(H.vorfallMinuten(v.timeoutVon,v.timeoutBis)||0):0,schwere:v.schwere||''};});
  var TK=window.CDSE_TAGESKARTE, tk=TK?TK.karteVon(d):null, tkr=tk?TK.reihe(tk,ab,bis):[];
  var S=window.CDSE_SCREENING, sc=(d.screenings||[]).filter(function(s){return imZ(iso(s.datum));}).map(function(s){var e=null;try{e=S&&S.auswerten?S.auswerten(s):null;}catch(x){e=null;}
    return {datum:iso(s.datum),stufe:e&&SC_STUFE[e.gesamt.art]!=null?SC_STUFE[e.gesamt.art]:null,titel:e?e.gesamt.titel:'Screening',rot:e?e.bereiche.filter(function(b){return b.stufe==='rot';}).length:0};}).filter(function(x){return x.stufe!=null;});
  var gespr=ein.filter(function(e){return (e.ziel||/^gespraech_/.test(e.art)||e.art==='beobachtung')&&imZ(iso(e.datum));}).map(function(e){return {datum:iso(e.datum),art:e.art,ziel:e.ziel||''};});
  var KM=window.CDSE_KINDMODUS, km=KM?KM.verlauf(d,ab,bis):null;
  return {vorf:vorf,tk:tk,tkr:tkr,sc:sc,gespr:gespr,km:km&&(km.tage.length||km.runden.length)?km:null,marken:marken(d).filter(function(m){return imZ(m.datum);})};
}
/* Maßnahmen und Ereignisse: aus dem Protokoll (Fokusziele, Tageskarte), Überprüfungen, Berichten, Weitergaben */
function marken(d){
  var l=[];
  (d.verlauf||[]).forEach(function(v){
    var t=String(v.t||''), z=iso(v.z);
    if(/^Begleitplan: Fokusziele /.test(t)){l.push({datum:z,art:'massnahme',text:t.replace(/^Begleitplan: /,''),vergleich:true});}
    else if(/^Tageskarte (eingerichtet|wieder aufgenommen)/.test(t)){l.push({datum:z,art:'massnahme',text:t.replace(/:.*$/,''),vergleich:true});}
    else if(/^Tageskarte beendet/.test(t)){l.push({datum:z,art:'ende',text:'Tageskarte beendet'});}
    else if(/^Kindmodus eingerichtet/.test(t)){l.push({datum:z,art:'massnahme',text:'Kindmodus eingerichtet',vergleich:true});}
  });
  ((d.begleitplan||{}).reviews||[]).forEach(function(v){l.push({datum:iso(v.datum),art:'review',text:'Überprüfung'});});
  (d.berichte||[]).forEach(function(b){var m=(b.medikamente||[]).map(function(x){return x.name;}).filter(Boolean);
    l.push({datum:iso(b.datum||b.z),art:m.length?'medikation':'bericht',text:(BERICHT[b.art]||'Bericht')+(b.von?' ('+b.von+')':'')+(m.length?' – Medikation: '+m.join(', '):''),vergleich:!!m.length});});
  (d.weitergaben||[]).forEach(function(w){l.push({datum:iso(w.z),art:'weitergabe',text:'Weitergabe an '+(H&&H.team?H.team(w.an).name:w.an)});});
  return l.filter(function(m){return /^\d{4}-\d{2}-\d{2}$/.test(m.datum);}).sort(function(a,b){return a.datum.localeCompare(b.datum);});
}
/* Wochenwerte der Vorfälle */
function wochen(ab,bis){var l=[], m=montag(ab);while(m<=bis){l.push(m);m=plusTage(m,7);}return l;}

/* ---------- Grafik ---------- */
function grafik(D,ab,bis){
  var B=1000, L=176, R=22, x=function(i){return L+(B-L-R)*tageZwischen(ab,i)/Math.max(1,tageZwischen(ab,bis));};
  var bahnen=[], y0=34, g='';
  function bahn(titel,hoehe,innen,info){bahnen.push({titel:titel,hoehe:hoehe,innen:innen,info:info||''});}
  var wl=wochen(ab,bis);
  /* Mitte des sichtbaren Teils einer Woche: die erste und die laufende Woche sind angeschnitten –
     ihre Marke bleibt so in der Bahn und rutscht nicht unter die Beschriftung links */
  function wMitte(w){var a=w<ab?ab:w, e=plusTage(w,6);if(e>bis){e=bis;}return (x(a)+x(e))/2;}
  /* Tageskarte: Punkte je Tag, Wochenschnitt als Linie, Tagesziel gestrichelt */
  if(D.tkr.length){
    bahn('Tageskarte',92,function(y,h){
      var yv=function(p){return y+6+(h-12)*(100-p)/100;}, z=D.tk.ziel||80, s='<line x1="'+L+'" x2="'+(B-R)+'" y1="'+yv(z).toFixed(1)+'" y2="'+yv(z).toFixed(1)+'" class="vl-ziel"><title>Tagesziel '+z+' %</title></line>';
      var pts=wl.map(function(w){var l=D.tkr.filter(function(e){return e.datum>=w&&e.datum<plusTage(w,7);});if(!l.length){return null;}var m=l.reduce(function(a,e){return a+e.prozent;},0)/l.length;return [wMitte(w),yv(m),m,w];}).filter(Boolean);
      if(pts.length>1){s+='<polyline class="vl-linie" points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'"/>';}
      D.tkr.forEach(function(e){s+='<circle cx="'+x(e.datum).toFixed(1)+'" cy="'+yv(e.prozent).toFixed(1)+'" r="3.2" class="'+(e.erreicht?'vl-gut':'vl-knapp')+'"><title>'+esc(kurzDatum(e.datum)+': '+e.prozent+' %')+'</title></circle>';});
      return s;
    },'% je Tag · Wochenschnitt');
  }
  /* Vorfälle je Woche (Balken), Schwere als Farbe, Time-out im Tooltip */
  var vfW=wl.map(function(w){var l=D.vorf.filter(function(e){return e.datum>=w&&e.datum<plusTage(w,7);});return {w:w,n:l.length,min:l.reduce(function(a,e){return a+e.min;},0),schwer:l.some(function(e){return e.schwere==='schwer';})};});
  var vfMax=Math.max(2,Math.max.apply(null,vfW.map(function(v){return v.n;})));
  bahn('Vorfälle',64,function(y,h){
    if(!D.vorf.length){return '<text x="'+(L+8)+'" y="'+(y+h/2+4)+'" class="vl-leer">Keine Vorfälle in diesem Zeitraum</text>';}
    var bw=Math.max(4,(B-L-R)/Math.max(1,wl.length)*0.6), s='';
    vfW.forEach(function(v){if(!v.n){return;}var hh=(h-10)*v.n/vfMax, bx=Math.max(L,Math.min(B-R-bw,wMitte(v.w)-bw/2));
      s+='<rect x="'+bx.toFixed(1)+'" y="'+(y+h-4-hh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="2" class="'+(v.schwer?'vl-schwer':'vl-vorfall')+'"><title>'+esc('Woche ab '+kurzDatum(v.w)+': '+v.n+(v.n===1?' Vorfall':' Vorfälle')+(v.min?', '+v.min+' Min. Time-out':''))+'</title></rect>';});
    return s;
  },'je Woche · rot = schwer');
  /* Screening: Stufe (unten = unauffällig) */
  if(D.sc.length){
    bahn('Screening',56,function(y,h){
      var yv=function(st){return y+h-8-(h-16)*st/4;}, s='';
      if(D.sc.length>1){s+='<polyline class="vl-linie vl-sc" points="'+D.sc.map(function(e){return x(e.datum).toFixed(1)+','+yv(e.stufe).toFixed(1);}).join(' ')+'"/>';}
      D.sc.forEach(function(e){var cx=x(e.datum), cy=yv(e.stufe);s+='<path d="M'+cx.toFixed(1)+' '+(cy-5).toFixed(1)+' l5 5 -5 5 -5 -5z" class="vl-sc'+e.stufe+'"><title>'+esc(kurzDatum(e.datum)+': '+e.titel+(e.rot?' ('+e.rot+(e.rot===1?' Bereich':' Bereiche')+' deutlich)':''))+'</title></path>';});
      return s;
    },'oben = mehr Bedarf');
  }
  /* Kindmodus: Sterne der Ziel-Quest je Tag (0–3), geübte Runden als Rauten */
  if(D.km){
    bahn('Kindmodus',54,function(y,h){
      var s='', bw=Math.max(3,Math.min(8,(B-L-R)/Math.max(1,tageZwischen(ab,bis))*0.7));
      D.km.tage.forEach(function(e){var hh=Math.max(2,(h-20)*e.sterne/3);s+='<rect x="'+Math.max(L,x(e.datum)-bw/2).toFixed(1)+'" y="'+(y+h-14-hh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="1.5" class="vl-km-stern"><title>'+esc(kurzDatum(e.datum)+': Ziel-Quest '+e.sterne+(e.sterne===1?' Stern':' Sterne')+(e.einig?' (einig)':''))+'</title></rect>';});
      D.km.runden.forEach(function(e){var cx=Math.max(L+4,x(e.datum)), cy=y+h-6;s+='<path d="M'+cx.toFixed(1)+' '+(cy-4)+' l4 4 -4 4 -4 -4z" class="vl-km-runde '+e.spiel+'"><title>'+esc(kurzDatum(e.datum)+': '+(e.spiel==='atem'?'Atem-Raumschiff':'Stopp-Ampel geübt'))+'</title></path>';});
      return s;
    },'Sterne je Tag · ◆ geübt');
  }
  /* Gespräche und Beobachtungen: kleine Striche */
  if(D.gespr.length){
    bahn('Gespräche',30,function(y,h){
      return D.gespr.map(function(e){var cx=x(e.datum);return '<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(y+6)+'" y2="'+(y+h-6)+'" class="vl-strich'+(e.ziel?' ziel':'')+'"><title>'+esc(kurzDatum(e.datum)+': '+((H.ARTEN||{})[e.art]||e.art)+(e.ziel?' zu '+e.ziel:''))+'</title></line>';}).join('');
    });
  }
  var hoehe=y0+bahnen.reduce(function(a,b){return a+b.hoehe+10;},0)+22;
  g+='<svg class="vl-grafik" viewBox="0 0 '+B+' '+hoehe+'" role="img" aria-label="Verlauf vom '+esc(datum(ab))+' bis '+esc(datum(bis))+'" aria-describedby="vl-zus">';
  /* Wochenraster */
  wl.forEach(function(w){var cx=x(w);if(cx<L){return;}g+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+y0+'" y2="'+(hoehe-22)+'" class="vl-raster"/>';});
  /* Monatsnamen: jeder am 1. des Monats; Namen, die sich überschneiden würden, fallen weg (lieber den ganzen
     ersten Monat benennen als den angeschnittenen). Bei 12 Monaten kurze Namen; die Jahreszahl steht beim
     ersten Namen und beim Januar. Breite geschätzt: etwa 7,2 Einheiten je Zeichen. */
  var namen=tageZwischen(ab,bis)>200?MON_KURZ:MONATE, erst=ab.slice(0,8)+'01', ml=[{d:ab,teil:erst<ab}], mo=monatPlus(erst), gez=[];
  while(mo<=bis){ml.push({d:mo});mo=monatPlus(mo);}
  function mText(e,erster){var n=+e.d.slice(5,7);return namen[n-1]+((erster||n===1)?' '+e.d.slice(0,4):'');}
  ml.forEach(function(e){
    var t=mText(e,!gez.length), w=t.length*7.2, xx=Math.min(x(e.d)+3,B-2-w), vor=gez[gez.length-1];
    if(vor&&xx<vor.x+vor.w+8){
      if(!vor.teil){return;}
      gez.pop();t=mText(e,!gez.length);w=t.length*7.2;xx=Math.min(x(e.d)+3,B-2-w);
    }
    gez.push({x:xx,w:w,t:t,teil:!!e.teil,d:e.d});
  });
  gez.forEach(function(e){
    if(!e.teil){var cx=x(e.d);g+='<line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(hoehe-24)+'" y2="'+(hoehe-18)+'" class="vl-monat"/>';}
    g+='<text x="'+e.x.toFixed(1)+'" y="'+(hoehe-8)+'" class="vl-achse">'+esc(e.t)+'</text>';
  });
  var y=y0;
  bahnen.forEach(function(b){
    g+='<rect x="'+L+'" y="'+y+'" width="'+(B-L-R)+'" height="'+b.hoehe+'" class="vl-bahn"/><text x="'+(L-12)+'" y="'+(y+b.hoehe/2+2)+'" class="vl-titel" text-anchor="end">'+esc(b.titel)+'</text>'+
      (b.info?'<text x="'+(L-12)+'" y="'+(y+b.hoehe/2+16)+'" class="vl-info" text-anchor="end">'+esc(b.info)+'</text>':'')+b.innen(y,b.hoehe);
    y+=b.hoehe+10;
  });
  /* Maßnahmen: senkrechte Linien mit Nummer */
  var kxs=D.marken.map(function(m){return x(m.datum);}), ABST=23, RAND=B-R-11;
  for(var k=1;k<kxs.length;k++){kxs[k]=Math.max(kxs[k],kxs[k-1]+ABST);}
  if(kxs.length){kxs[kxs.length-1]=Math.min(kxs[kxs.length-1],RAND);for(var k2=kxs.length-2;k2>=0;k2--){kxs[k2]=Math.min(kxs[k2],kxs[k2+1]-ABST);}}
  D.marken.forEach(function(m,i){var cx=x(m.datum), kx=kxs[i];
    g+='<g class="vl-m"><title>'+esc(kurzDatum(m.datum)+': '+m.text)+'</title><line x1="'+cx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(y0-6)+'" y2="'+(hoehe-22)+'" class="vl-marke '+m.art+'"/>'+
      (kx!==cx?'<line x1="'+kx.toFixed(1)+'" x2="'+cx.toFixed(1)+'" y1="'+(y0-8)+'" y2="'+(y0-6)+'" class="vl-marke '+m.art+'"/>':'')+
      '<circle cx="'+kx.toFixed(1)+'" cy="'+(y0-16)+'" r="10" class="vl-nr '+m.art+'"/><text x="'+kx.toFixed(1)+'" y="'+(y0-12)+'" class="vl-nrt" text-anchor="middle">'+(i+1)+'</text></g>';});
  return g+'</svg>';
}
/* Eine Zeile unter der Grafik (auch für Screenreader): was im Zeitraum passiert ist */
function zusammenfassung(D,ab,bis){
  var t=[];
  if(D.tkr.length){var s=Math.round(D.tkr.reduce(function(a,e){return a+e.prozent;},0)/D.tkr.length), er=D.tkr.filter(function(e){return e.erreicht;}).length;
    t.push('Tageskarte an '+D.tkr.length+(D.tkr.length===1?' Tag':' Tagen')+', im Schnitt '+s+' %, Tagesziel an '+er+(er===1?' Tag':' Tagen')+' erreicht');}
  var sch=D.vorf.filter(function(e){return e.schwere==='schwer';}).length, min=D.vorf.reduce(function(a,e){return a+e.min;},0);
  t.push(D.vorf.length?D.vorf.length+(D.vorf.length===1?' Vorfall':' Vorfälle')+(sch?' (davon '+sch+' schwer)':'')+(min?', '+min+' Min. Time-out':''):'keine Vorfälle');
  if(D.sc.length){t.push(D.sc.length+(D.sc.length===1?' Screening':' Screenings')+', zuletzt: '+D.sc[D.sc.length-1].titel);}
  if(D.km){t.push('Kindmodus: Ziel-Quest an '+D.km.tage.length+(D.km.tage.length===1?' Tag':' Tagen')+', '+D.km.runden.length+(D.km.runden.length===1?' Runde':' Runden')+' geübt');}
  if(D.gespr.length){t.push(D.gespr.length+(D.gespr.length===1?' Gespräch oder Beobachtung':' Gespräche und Beobachtungen'));}
  if(D.marken.length){t.push(D.marken.length+(D.marken.length===1?' Maßnahme':' Maßnahmen')+' (Nummern in der Grafik)');}
  return 'Vom '+datum(ab)+' bis '+datum(bis)+': '+t.join('; ')+'.';
}

/* ---------- Vorher-nachher je Maßnahme ---------- */
var FENSTER=28, MIN_VOR=7;
/* Seit wann gibt es Daten zum Kind? Anlage des Dossiers – oder früher, wenn Einträge nachgetragen wurden */
function beginn(d){
  var l=[iso(d.erstellt)];
  ['eintraege','screenings','einschaetzungen','berichte'].forEach(function(k){(d[k]||[]).forEach(function(e){if(e){l.push(iso(e.datum||e.z));}});});
  var tk=d.tageskarte;if(tk){l.push(iso(tk.start));l=l.concat(Object.keys(tk.tage||{}));}
  if(d.profil&&d.profil.datum){l.push(iso(d.profil.datum));}
  return l.filter(function(t){return /^\d{4}-\d{2}-\d{2}$/.test(t);}).sort()[0]||'';
}
function vergleich(d){
  var h0=heute(), TK=window.CDSE_TAGESKARTE, tk=TK?TK.karteVon(d):null, erg=[], beg=beginn(d);
  var vorf=(d.eintraege||[]).filter(function(e){return e&&e.art==='vorfall';}).map(function(e){var v=e.vorfall||{};return {datum:iso(e.datum),min:(H.vorfallMinuten&&v.timeoutVon&&v.timeoutBis)?(H.vorfallMinuten(v.timeoutVon,v.timeoutBis)||0):0};});
  marken(d).filter(function(m){return m.vergleich;}).forEach(function(m){
    var nach=Math.min(FENSTER,tageZwischen(m.datum,h0));
    if(nach<14){erg.push({m:m,frueh:true,tage:Math.max(0,nach)});return;}
    /* davor: vier Wochen, aber nicht vor dem ersten Tag mit Daten zum Kind (war es erst 10 Tage da, zählen 10 Tage);
       danach: genau „nach“ Tage ab dem Tag der Maßnahme (ohne den Tag danach) – so passt der Teiler zu den Tagen */
    var vAb=plusTage(m.datum,-FENSTER);if(beg&&beg>vAb){vAb=beg;}
    var vorTage=Math.max(0,tageZwischen(vAb,m.datum)), nBis=plusTage(m.datum,nach);
    var vor=vorf.filter(function(e){return e.datum>=vAb&&e.datum<m.datum;}), nachL=vorf.filter(function(e){return e.datum>=m.datum&&e.datum<nBis;});
    var z=[];
    if(vorTage>=MIN_VOR){
      var pv=vor.length/(vorTage/7), pn=nachL.length/(nach/7);
      if(vor.length||nachL.length){z.push({was:'Vorfälle pro Woche',vor:pv,nach:pn,besser:pn<pv});}
      var mv=vor.reduce(function(a,e){return a+e.min;},0)/(vorTage/7), mn=nachL.reduce(function(a,e){return a+e.min;},0)/(nach/7);
      if(mv||mn){z.push({was:'Time-out (Min. pro Woche)',vor:mv,nach:mn,besser:mn<mv});}
    }
    if(tk){var tv=TK.reihe(tk,vAb,plusTage(m.datum,-1)), tn=TK.reihe(tk,m.datum,plusTage(nBis,-1));
      if(tv.length>=3&&tn.length>=3){var sv=TK.schnitt(tv), sn=TK.schnitt(tn);z.push({was:'Tageskarte (Ø %)',vor:sv,nach:sn,besser:sn>sv,prozent:true});}}
    erg.push({m:m,zeilen:z,tage:nach,vorTage:vorTage,ab:vAb});
  });
  return erg;
}
function vergleichHtml(d){
  var v=vergleich(d);if(!v.length){return '';}
  return '<div class="vl-vergleich"><h3>Vorher – nachher</h3><ul>'+v.slice(-4).reverse().map(function(x){
    var kopf='<b>'+esc(x.m.text)+'</b> <span class="ar-leise">seit '+esc(datum(x.m.datum))+'</span>';
    if(x.frueh){return '<li>'+kopf+'<span class="vl-v-text">Für einen Vergleich ist es noch zu früh ('+x.tage+(x.tage===1?' Tag':' Tage')+' seitdem; ab zwei Wochen).</span></li>';}
    if(!x.zeilen.length){return '<li>'+kopf+'<span class="vl-v-text">'+(x.vorTage<MIN_VOR?'Für einen Vergleich fehlt die Zeit davor: Daten zum Kind gibt es erst seit dem '+esc(datum(x.ab))+'.':'In der Zeit davor und danach gibt es keine Zahlen zum Vergleichen.')+'</span></li>';}
    return '<li>'+kopf+'<span class="vl-v-text">'+x.zeilen.map(function(z){var gleich=Math.abs(z.nach-z.vor)<(z.prozent?3:0.25);
      return esc(z.was)+': '+(z.prozent?Math.round(z.vor)+' % → '+Math.round(z.nach)+' %':zahl(z.vor)+' → '+zahl(z.nach))+' <span class="vl-pfeil '+(gleich?'gleich':(z.besser?'besser':'schlechter'))+'">'+(gleich?'etwa gleich':(z.besser?'günstiger':'ungünstiger'))+'</span>';}).join(' · ')+
      '</span><span class="ar-klein">'+(x.vorTage>=FENSTER?'Vier Wochen':x.vorTage+(x.vorTage===1?' Tag':' Tage'))+' davor und '+(x.tage>=FENSTER?'vier Wochen':x.tage+' Tage')+' danach'+(x.vorTage<FENSTER?' (Daten zum Kind erst seit dem '+esc(datum(x.ab))+')':'')+'.</span></li>';}).join('')+'</ul>'+
    '<p class="ar-klein">Vorher – nachher zeigt eine Richtung, keinen Beweis: Auch anderes kann sich in der Zeit verändert haben (Klasse, Familie, Gesundheit, Jahreszeit).</p></div>';
}

/* ---------- Karte ---------- */
function karte(d){
  if(!bausteine()){return '';}
  var bis=heute(), ab=plusTage(bis,-spanne+1), D=daten(d,ab,bis);
  var leer=!D.tkr.length&&!D.vorf.length&&!D.sc.length&&!D.gespr.length&&!D.marken.length&&!D.km;
  if(!leer){nachZeichnen();}
  return '<section class="ar-karte vl-karte" id="vl-karte"><div class="ar-kartenkopf"><div><h2>Verlauf auf einen Blick</h2><span class="ar-leise">Wirkt, was wir tun? Tageskarte, Vorfälle, Screenings und Gespräche auf einer Zeitachse</span></div>'+
      '<span class="catbar vl-spanne" role="group" aria-label="Zeitraum">'+BEREICHE.map(function(b){return '<button type="button" class="catchip'+(spanne===b[0]?' on':'')+'" data-vl="'+b[0]+'" aria-pressed="'+(spanne===b[0])+'">'+esc(b[1])+'</button>';}).join('')+'</span></div>'+
    (leer?'<p class="ar-leise">In diesem Zeitraum gibt es noch keine Daten. Die Zeitachse füllt sich mit Tageskarte, Vorfällen, Screenings, Gesprächen und Beobachtungen.</p>':
      '<div class="vl-rahmen" id="vl-rahmen">'+grafik(D,ab,bis)+'</div>'+
      '<p class="vl-wert" id="vl-wert" aria-live="polite">'+esc(HINWEIS)+'</p>'+
      '<p class="vl-zus" id="vl-zus">'+esc(zusammenfassung(D,ab,bis))+'</p>'+
      (D.marken.length?'<ol class="vl-legende">'+D.marken.map(function(m,i){return '<li class="'+esc(m.art)+'"><span class="vl-lnr">'+(i+1)+'</span><span class="vl-ld">'+esc(kurzDatum(m.datum))+'</span><span>'+esc(m.text)+'</span></li>';}).join('')+'</ol>':''))+
    vergleichHtml(d)+'</section>';
}
/* Nach dem Einfügen: Auf schmalen Bildschirmen zeigt die Grafik zuerst das Neueste (rechts) */
function nachZeichnen(){setTimeout(function(){var r=document.getElementById('vl-rahmen');if(r&&r.scrollWidth>r.clientWidth){r.scrollLeft=r.scrollWidth;}},0);}
/* Eine Zeile für den Überblick: Vorfälle der letzten vier Wochen gegenüber den vier davor */
function kurz(d){
  if(!bausteine()){return '';}
  var h0=heute(), a=plusTage(h0,-27), b=plusTage(h0,-55), n=0, v=0;
  (d.eintraege||[]).forEach(function(e){if(!e||e.art!=='vorfall'){return;}var t=iso(e.datum);if(t>=a&&t<=h0){n++;}else if(t>=b&&t<a){v++;}});
  if(!n&&!v){return '';}
  return 'Vorfälle: '+n+' in den letzten vier Wochen (davor '+v+')';
}

/* Tippen auf die Grafik (Tablet: keine Tooltips): den nächsten Punkt, Balken, Strich oder die nächste Nummer
   suchen (höchstens 24 Bildschirmpunkte daneben) und den Wert in der Zeile unter der Grafik zeigen */
var TIPPBAR='circle.vl-gut,circle.vl-knapp,rect.vl-vorfall,rect.vl-schwer,path.vl-sc0,path.vl-sc1,path.vl-sc2,path.vl-sc3,path.vl-sc4,rect.vl-km-stern,path.vl-km-runde,line.vl-strich,circle.vl-nr,line.vl-ziel';
function wertZeigen(ev,g){
  var info=document.getElementById('vl-wert'), m=g.getScreenCTM&&g.getScreenCTM();if(!info||!m||!g.createSVGPoint){return;}
  var p=g.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;p=p.matrixTransform(m.inverse());
  var px=1/(Math.abs(m.a)||1), best=null, bestD=24*px;
  Array.prototype.forEach.call(g.querySelectorAll(TIPPBAR),function(el){
    var b;try{b=el.getBBox();}catch(e){return;}
    var dx=Math.max(b.x-p.x,0,p.x-b.x-b.width), dy=Math.max(b.y-p.y,0,p.y-b.y-b.height);
    var dd=Math.sqrt(dx*dx+dy*dy)+(el.classList.contains('vl-ziel')?10*px:0);   /* die Ziellinie nur, wenn sonst nichts nah ist */
    if(dd<=bestD){bestD=dd;best=el;}
  });
  Array.prototype.forEach.call(g.querySelectorAll('.vl-an'),function(el){el.classList.remove('vl-an');});
  if(!best){info.textContent=HINWEIS;return;}
  var t=best.querySelector('title')||(best.parentNode&&best.parentNode.querySelector&&best.parentNode.querySelector('title'));
  best.classList.add('vl-an');info.textContent=t?t.textContent:'';
}

document.addEventListener('click',function(ev){
  if(!ev.target.closest){return;}
  var g=ev.target.closest('#arbeit-body #vl-karte svg.vl-grafik');
  if(g&&bausteine()){wertZeigen(ev,g);return;}
  var t=ev.target.closest('#arbeit-body [data-vl]');if(!t||!bausteine()){return;}
  var n=+t.getAttribute('data-vl');if(!n||n===spanne){return;}
  spanne=n;var d=H.aktDossier&&H.aktDossier(), el=document.getElementById('vl-karte');
  if(d&&el){
    el.outerHTML=karte(d);
    /* Fokus bleibt auf dem Knopf des Zeitraums (sonst springt er an den Anfang der Seite) */
    var k=document.querySelector('#vl-karte [data-vl="'+n+'"]');if(k){try{k.focus({preventScroll:true});}catch(e){k.focus();}}
  }
});

return {karte:karte, kurz:kurz, daten:function(d,ab,bis){bausteine();return daten(d,ab,bis);}, vergleich:function(d){bausteine();return vergleich(d);}, marken:function(d){bausteine();return marken(d);}};
})();
