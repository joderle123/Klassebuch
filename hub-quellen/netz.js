/* =====================================================================
   CDSE Hub — Netz: alles, was das Dossier über ein Kind weiß, auf einen Blick
   ---------------------------------------------------------------------
   Karte im Überblick. In der Mitte das Kind, rundherum sieben Bereiche
   wie ein Spinnennetz: Profil, Entwicklung, Stärken, Familie & Umfeld,
   Schule, Helfernetz & CDSE, Ziele & Plan. Jeder Punkt führt zum Reiter,
   in dem er steht. Auf schmalen Bildschirmen dieselbe Information als
   Liste. Liest nur; Datenbank-Angaben sieht wie überall nur, wer
   Responsable oder Verwaltung ist (über den Kompass).
   ===================================================================== */
window.CDSE_NETZ=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function kurz(t,n){t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1).replace(/[\s,;:–-]+$/,'')+'…':t;}
var ROEM=['','I','II','III','IV','V'];
var MAX=5;
var BEREICHE=[
  {id:'profil',name:'Profil',farbe:'#2E3A9C',tab:'kompass'},
  {id:'entwicklung',name:'Entwicklung',farbe:'#1F6B6F',tab:'entwicklung'},
  {id:'staerken',name:'Stärken',farbe:'#2F7A4F',tab:'profil'},
  {id:'umfeld',name:'Familie & Umfeld',farbe:'#8A6414',tab:'fiche'},
  {id:'schule',name:'Schule',farbe:'#586277',tab:'fiche'},
  {id:'netz',name:'Helfernetz & CDSE',farbe:'#6E4A7E',tab:'fiche'},
  {id:'ziele',name:'Ziele & Plan',farbe:'#B4533A',tab:'begleitplan'}
];

/* ---------- Daten sammeln: je Bereich [{t, tab, art}] ---------- */
function sammeln(d){
  var o={}, p=d.person||{};BEREICHE.forEach(function(b){o[b.id]=[];});
  function add(b,t,tab,art,titel){t=String(t||'').trim();if(!t){return;}if(o[b].some(function(x){return x.t===t;})){return;}o[b].push({t:t,tab:tab||'',art:art||'',titel:titel||t});}
  var KO=window.CDSE_KOMPASS, L=null;try{L=KO&&KO.lesen?KO.lesen(d):null;}catch(e){L=null;}
  /* Profil */
  if(L){
    var KURZ={diagnose:'Diagnose',verdacht:'Verdacht',hypothese:'Hypothese',beobachtet:'beobachtet'};
    L.profile.forEach(function(x){var n=(x.art==='diagnose'||x.art==='verdacht')?x.def.name:(x.def.thema||x.def.name);add('profil',n+' ('+KURZ[x.art]+')','kompass',x.art,n+' – '+KURZ[x.art]);});
    if(L.klaeren.length){add('profil','Oberbegriff zuordnen','kompass','offen');}
  }
  /* Entwicklung: ETEP-Stufen, deutliche Bereiche im Screening */
  if(L&&L.ctx&&L.ctx.stufen){var st=L.ctx.stufen.bereiche;['V','SOZ','K','KOG'].forEach(function(c){if(st[c]){add('entwicklung',st[c].name+': Stufe '+ROEM[st[c].stufe],'entwicklung');}});}
  if(L){Object.keys(L.beob.sc).forEach(function(id){var x=L.beob.sc[id];if(x.stufe==='rot'){add('entwicklung',x.name+' deutlich','screening','warn',(x.quelle==='ds'?'laut DS: ':'Screening: ')+x.name+' deutlich');}});}
  var alter=(p.geburtsdatum&&H.alter)?H.alter(p.geburtsdatum):null;
  if(alter!=null){add('entwicklung',alter+' Jahre','ueberblick');}
  /* Stärken aus dem DS */
  var b=null;try{b=H.blick?H.blick(d):null;}catch(e){b=null;}
  if(b){
    (b.ressourcen||[]).slice(0,3).forEach(function(x){add('staerken',x,'profil');});
    (b.interessen||[]).slice(0,2).forEach(function(x){add('staerken','Interesse: '+x,'profil');});
    (b.staerken||[]).slice(0,2).forEach(function(x){add('staerken',kurz(x.s,60),'profil','',x.s);});
    (b.hilft||[]).slice(0,1).forEach(function(x){add('staerken','Hilft: '+x,'profil');});
  }
  /* Familie & Umfeld */
  if(L&&L.ctx){Object.keys(L.ctx.umfeld).forEach(function(id){if(id==='netz'||id==='vorfaelle'){return;}var W=window.CDSE_KOMPASS_WISSEN, u=W?W.umfeld.filter(function(x){return x.id===id;})[0]:null;if(u){add('umfeld',u.name+(L.ctx.umfeld[id].length?': '+L.ctx.umfeld[id].join(', '):''),'kompass','',u.name);}});}
  var ds={};try{ds=window.CDSE_DATENBANK&&window.CDSE_DATENBANK.datensatz?window.CDSE_DATENBANK.datensatz(Object.assign({},d,{db:{},id:''})):{};}catch(e){ds={};}
  if((ds.sorgerecht||[]).length){add('umfeld','Sorgerecht: '+ds.sorgerecht.join(', '),'fiche');}
  if(ds.erstsprache){add('umfeld','Erstsprache: '+ds.erstsprache,'fiche');}
  if(ds.wohnort){add('umfeld','Wohnort: '+ds.wohnort,'fiche');}
  /* Schule */
  if(p.klasse||ds.klasse){add('schule','Klasse '+(ds.klasse||p.klasse),'fiche');}
  if(ds.schule||p.schule){add('schule',ds.schule||p.schule,'fiche');}
  (ds.schulHilfen||[]).forEach(function(x){add('schule',x,'fiche');});
  if(ds.beschulung){add('schule',ds.beschulung+(ds.beschulungOrt?' ('+ds.beschulungOrt+')':''),'fiche');}
  /* Helfernetz & CDSE */
  if(d.stelle){add('netz','CDSE: '+H.team(d.stelle).name,'ueberblick');}
  (d.verantwortlich||[]).slice(0,2).forEach(function(k){add('netz','fallverantwortlich: '+H.kname(k),'ueberblick');});
  (ds.massnahmen||[]).forEach(function(x){add('netz',x,'fiche');});
  (ds.dienste||[]).forEach(function(x){add('netz',x,'fiche');});
  if(ds.scas==='ja'){add('netz','SCAS','fiche');}
  var med=window.CDSE_BERICHTE&&window.CDSE_BERICHTE.medikation?window.CDSE_BERICHTE.medikation(d):[];
  med.forEach(function(m){add('netz','Medikation: '+m.name+(m.dosis?' '+m.dosis:''),'kompass');});
  /* Ziele & Plan */
  var W2=L&&L.beob?L.beob.warn:{};Object.keys(W2).forEach(function(k){add('ziele','Warnsignal: '+W2[k].text,'screening','warn');});
  var P=null;try{P=window.CDSE_BEGLEITPLAN&&window.CDSE_BEGLEITPLAN.schritte?window.CDSE_BEGLEITPLAN.schritte(d,{}):null;}catch(e){P=null;}
  if(P){
    P.fokus.forEach(function(c){var inf=H.itemZu?H.itemZu(c):null;add('ziele','Fokus '+c+(inf&&inf.it&&inf.it.keyword?': '+inf.it.keyword:''),'begleitplan');});
    if(P.naechster){add('ziele','Als Nächstes: '+kurz(P.naechster.titel,48),'begleitplan',P.naechster.status==='dringend'?'warn':'',P.naechster.titel);}
  }
  if(L&&L.beob.vorfaelle){add('ziele',L.beob.vorfaelle+(L.beob.vorfaelle===1?' Vorfall':' Vorfälle')+' (3 Monate)','eintraege',L.beob.vorfaelle>=3?'warn':'');}
  return o;
}

/* ---------- Zeichnen ---------- */
function punkte(n,cx,cy,r,start){var l=[];for(var i=0;i<n;i++){var w=start+i*2*Math.PI/n;l.push([cx+r*Math.cos(w),cy+r*Math.sin(w)]);}return l;}
function netzSvg(d,o){
  /* Mitte: das Kind; innerer Kreis: die sieben Bereiche wie ein Spinnennetz. Die Punkte stehen
     untereinander in einer linken und einer rechten Spalte – so überlappt keine Beschriftung. */
  var W=1000, R=150, n=BEREICHE.length, start=-Math.PI/2, ZEILE=25, LUECKE=14, SPALTE=248, TEXT=28;
  var koepfe=BEREICHE.map(function(b,i){var w=start+i*2*Math.PI/n;return {b:b,w:w,rechts:Math.cos(w)>=-0.01};});
  function block(bereich){var l=o[bereich.id], z=Math.min(l.length,MAX)+(l.length>MAX?1:0);return Math.max(1,z);}
  var spalten={rechts:koepfe.filter(function(k){return k.rechts;}),links:koepfe.filter(function(k){return !k.rechts;})};
  ['rechts','links'].forEach(function(seite){spalten[seite].sort(function(x,y){return Math.sin(x.w)-Math.sin(y.w);});});
  var hoehe=Math.max.apply(null,['rechts','links'].map(function(seite){return spalten[seite].reduce(function(a,k){return a+block(k.b)*ZEILE;},0)+(spalten[seite].length-1)*LUECKE;}));
  var Hh=Math.max(560,hoehe+80), cx=W/2, cy=Hh/2;
  var s='<svg class="nz-svg" viewBox="0 0 '+W+' '+Hh+'" role="group" aria-labelledby="nz-titel nz-desc"><title id="nz-titel">Netz um '+esc((d.person||{}).vorname||'das Kind')+'</title><desc id="nz-desc">Alles, was das Dossier weiß, in sieben Bereichen um das Kind. Jeder Punkt führt zum Reiter, in dem er steht.</desc>';
  /* Netz im Hintergrund */
  [0.42,0.72,1.0,1.28].forEach(function(f,i){var pk=punkte(n,cx,cy,R*f,start);s+='<polygon class="nz-ring'+(i===3?' aussen':'')+'" points="'+pk.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>';});
  punkte(n,cx,cy,R*1.28,start).forEach(function(q){s+='<line class="nz-speiche" x1="'+cx+'" y1="'+cy+'" x2="'+q[0].toFixed(1)+'" y2="'+q[1].toFixed(1)+'"/>';});
  var faeden='', knoten='', kopfe='';
  ['rechts','links'].forEach(function(seite){
    var liste2=spalten[seite], gesamt=liste2.reduce(function(a,k){return a+block(k.b)*ZEILE;},0)+(liste2.length-1)*LUECKE, y=cy-gesamt/2+ZEILE/2;
    var dx=seite==='rechts'?SPALTE:-SPALTE, anker=seite==='rechts'?'start':'end', tversatz=seite==='rechts'?12:-12;
    liste2.forEach(function(k){
      var b=k.b, l=o[b.id], zeigen=l.slice(0,MAX), rest=l.length-zeigen.length, bx=cx+R*0.72*Math.cos(k.w), by=cy+R*0.72*Math.sin(k.w);
      k.bx=bx;k.by=by;
      var eintraege=zeigen.concat(rest>0?[{t:'+ '+rest+' weitere',tab:b.tab,art:'mehr',titel:l.slice(MAX).map(function(x){return x.titel;}).join('; ')}]:[]);
      if(!eintraege.length){knoten+='<text class="nz-leer" x="'+(cx+dx+tversatz).toFixed(1)+'" y="'+(y+4.5).toFixed(1)+'" text-anchor="'+anker+'" style="--nz:'+b.farbe+'">'+esc(b.name)+': noch leer</text>';y+=ZEILE+LUECKE;return;}
      eintraege.forEach(function(x){
        var lx=cx+dx, ly=y, mx=(bx+lx)/2;
        faeden+='<path class="nz-faden" style="--nz:'+b.farbe+'" d="M'+bx.toFixed(1)+','+by.toFixed(1)+' C'+mx.toFixed(1)+','+by.toFixed(1)+' '+mx.toFixed(1)+','+ly.toFixed(1)+' '+lx.toFixed(1)+','+ly.toFixed(1)+'"/>';
        knoten+='<g class="nz-knoten '+esc(x.art||'')+'" style="--nz:'+b.farbe+'" tabindex="0" role="button" data-tab="'+esc(x.tab||b.tab)+'" aria-label="'+esc(b.name+': '+x.titel)+'"><title>'+esc(x.titel)+'</title>'+
          '<circle cx="'+lx.toFixed(1)+'" cy="'+ly.toFixed(1)+'" r="6.5"/><text x="'+(lx+tversatz).toFixed(1)+'" y="'+(ly+5).toFixed(1)+'" text-anchor="'+anker+'">'+esc(kurz(x.t,TEXT))+'</text></g>';
        y+=ZEILE;
      });
      y+=LUECKE;
    });
  });
  koepfe.forEach(function(k){
    var b=k.b, unten=Math.sin(k.w)>0.3;
    kopfe+='<g class="nz-bereich" style="--nz:'+b.farbe+'"><line class="nz-arm" x1="'+cx+'" y1="'+cy+'" x2="'+k.bx.toFixed(1)+'" y2="'+k.by.toFixed(1)+'"/>'+
      '<g class="nz-kopf" tabindex="0" role="button" data-tab="'+esc(b.tab)+'" aria-label="'+esc(b.name)+'"><circle cx="'+k.bx.toFixed(1)+'" cy="'+k.by.toFixed(1)+'" r="15"/>'+
      /* unten: Namen nach außen rücken, damit benachbarte Bereiche nicht zusammenstoßen */
      '<text x="'+(k.bx+(unten?(Math.cos(k.w)<0?14:-14):0)).toFixed(1)+'" y="'+(k.by+(unten?36:-23)).toFixed(1)+'" text-anchor="'+(unten?(Math.cos(k.w)<0?'end':'start'):'middle')+'">'+esc(b.name)+'</text><text class="nz-zahl" x="'+k.bx.toFixed(1)+'" y="'+(k.by+4.5).toFixed(1)+'" text-anchor="middle">'+o[b.id].length+'</text></g></g>';
  });
  s+=faeden+kopfe+knoten;
  var vn=(d.person||{}).vorname||'', nn=(d.person||{}).nachname||'', ini=((vn[0]||'')+(nn[0]||'')).toUpperCase()||'?';
  s+='<g class="nz-mitte"><circle cx="'+cx+'" cy="'+cy+'" r="30"/><text x="'+cx+'" y="'+(cy+7)+'" text-anchor="middle">'+esc(ini)+'</text></g>';
  return s+'</svg>';
}
function liste(o){
  return '<div class="nz-liste">'+BEREICHE.map(function(b){var l=o[b.id];
    return '<section style="--nz:'+b.farbe+'"><h3><button type="button" class="ar-link" data-tab="'+b.tab+'">'+esc(b.name)+'</button> <span class="ar-leise">'+l.length+'</span></h3>'+
      (l.length?'<ul>'+l.map(function(x){return '<li class="'+esc(x.art||'')+'">'+esc(x.titel)+'</li>';}).join('')+'</ul>':'<p class="ar-leise">noch leer</p>')+'</section>';}).join('')+'</div>';
}
function karte(d){
  if(!bausteine()){return '';}
  var o;try{o=sammeln(d);}catch(e){return '';}
  var gesamt=BEREICHE.reduce(function(a,b){return a+o[b.id].length;},0);
  if(gesamt<3){return '';}
  var zu=false;try{zu=localStorage.getItem('cdse-netz-zu')==='1';}catch(e){}
  return '<details class="ar-karte nz-karte"'+(zu?'':' open')+'><summary><h2>Netz um '+esc((d.person||{}).vorname||'das Kind')+'</h2><span class="ar-leise">'+gesamt+' Angaben aus dem ganzen Dossier – anklicken führt zum Reiter</span></summary>'+
    '<div class="nz-bild">'+netzSvg(d,o)+'</div>'+liste(o)+'</details>';
}
/* Auf- und Zuklappen für diesen Browser merken */
document.addEventListener('toggle',function(ev){var t=ev.target;if(t&&t.classList&&t.classList.contains('nz-karte')){try{localStorage.setItem('cdse-netz-zu',t.open?'0':'1');}catch(e){}}},true);
/* Tastatur: Enter und Leertaste wie ein Klick */
document.addEventListener('keydown',function(ev){
  if(ev.key!=='Enter'&&ev.key!==' '){return;}
  var t=ev.target;if(!t||!t.closest||!t.closest('#arbeit-body .nz-svg')||!t.getAttribute('data-tab')){return;}
  ev.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}));
});
return {karte:karte, sammeln:function(d){bausteine();return sammeln(d);}};
})();
