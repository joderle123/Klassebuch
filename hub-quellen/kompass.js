/* =====================================================================
   CDSE Hub — Kompass: Umgang, Förderung und Material passend zum Profil
   ---------------------------------------------------------------------
   Reiter „Kompass“ im Dossier. Liest, was das Dossier über ein Kind
   weiß – Diagnosen und Verdacht (DS, Datenbank, Team), Arbeitshypothesen
   und Anlass aus dem DS, Screenings, Warnsignale, Vorfälle, die
   ELDiB-Stufen, Alter und Lebenslage – und wählt aus der Wissensbasis
   (kompass-wissen.js) aus, was dazu passt. Jeder Punkt zeigt, warum er
   erscheint, und nennt seine Fachquellen. Keine Diagnose.
   Gespeichert werden nur Entscheidungen des Teams (d.begleitplan.merkmale,
   über CDSE_TEAM.ops.planMerkmal). Angaben, die nur in der Datenbank
   stehen, sehen wie dort nur Responsables und Verwaltung.
   ===================================================================== */
window.CDSE_KOMPASS=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function W(){return window.CDSE_KOMPASS_WISSEN||null;}
var LERN_TITEL=@@LERN_TITEL@@;
var QUELLEN=@@KOMPASS_QUELLEN@@;

var RANG={diagnose:4,verdacht:3,hypothese:2,beobachtet:1};
var ART_NAME={diagnose:'Diagnose',verdacht:'Verdacht',hypothese:'Arbeitshypothese',beobachtet:'Beobachtet'};
var ART_TEXT={diagnose:'Eine Diagnose ist dokumentiert.',verdacht:'Ein Verdacht ist dokumentiert – noch nicht abgeklärt.',
  hypothese:'Eine Arbeitshypothese aus dem DS oder der Lebensgeschichte – keine Diagnose.',beobachtet:'Aus Beobachtungen (Screening, DS, Einträge) – keine Diagnose.'};
/* Kurze Zeile auf der Profilkarte, damit „Beobachtet“ nicht wie eine Diagnose wirkt */
var KEINE_DIAGNOSE={verdacht:'Keine gesicherte Diagnose – Verdacht, noch nicht abgeklärt',hypothese:'Keine Diagnose – Arbeitshypothese des Teams',beobachtet:'Keine Diagnose – Beobachtungen des Teams'};
var ROEM=['','I','II','III','IV','V'];
var ABSCHNITTE=[['verstehen','Verstehen'],['umgang','Umgang'],['konkret','Konkret im Alltag'],['lassen','Was eher schadet'],['krise','In der Krise'],['zusammenarbeit','Zusammenarbeit']];
var HYP_AB=5, SC_TAGE=365, WARN_TAGE=90, VORFALL_TAGE=90, NEU_TAGE=730;
var STUFE_RANG={gelb:1,rot:2};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function datum(i){return H?H.datum(i):i;}
function tageSeit(iso){if(!iso){return 1e9;}var t=new Date(String(iso).slice(0,10)+'T12:00:00').getTime();return isNaN(t)?1e9:Math.floor((Date.now()-t)/864e5);}
function zeilen(v){return (Array.isArray(v)?v:(v?String(v).split(/\n/):[])).map(function(x){return String(x&&typeof x==='object'?(x.label||x.name||''):x).trim();}).filter(Boolean);}
function istResp(){return !!(T&&T.istResponsable&&T.istResponsable());}
function vorname(d){return ((d&&d.person)||{}).vorname||'das Kind';}

/* ---------- Wissensbasis ---------- */
var reCache=null;
function profilDef(id){var w=W();if(!w){return null;}for(var i=0;i<w.profile.length;i++){if(w.profile[i].id===id){return w.profile[i];}}return null;}
function profilIndex(id){var w=W();for(var i=0;i<w.profile.length;i++){if(w.profile[i].id===id){return i;}}return 999;}
/* Muster je Profil: „re“ findet, „nicht“ und „nichtKlein“ nehmen Fehltreffer wieder heraus */
function muster(){
  var w=W();if(!w){return [];}
  if(!reCache){reCache=w.profile.filter(function(p){return p.re;}).map(function(p){
    return {id:p.id,re:new RegExp(p.re,'gi'),nicht:[p.nicht?new RegExp(p.nicht,'gi'):null,p.nichtKlein?new RegExp(p.nichtKlein,'g'):null].filter(Boolean)};});}
  return reCache;
}
/* Treffer eines Profils im Text: [{index, text}], ohne Fehltreffer („ASS 100 mg“ ist kein Autismus) */
function treffer(x,t){
  var weg=[], o=[], m;
  x.nicht.forEach(function(re){re.lastIndex=0;while((m=re.exec(t))){weg.push([m.index,m.index+m[0].length]);if(!m[0].length){re.lastIndex++;}}});
  x.re.lastIndex=0;
  while((m=x.re.exec(t))){
    var a=m.index, e=a+m[0].length;if(!m[0].length){x.re.lastIndex++;continue;}
    if(!weg.some(function(z){return a<z[1]&&e>z[0];})){o.push({index:a,text:m[0]});}
  }
  return o;
}
/* Diagnose- oder Verdachtstext → passende Profile (ICD-10, ICD-11, Namen DE/FR/EN) */
function passende(text){
  if(!W()||!text){return [];}
  var t=String(text).normalize?String(text).normalize('NFC'):String(text);
  return muster().filter(function(x){return treffer(x,t).length>0;}).map(function(x){return x.id;});
}
/* Fundstellen im Text: [{id, index, text}] – für das Auslesen von Berichten */
function fundstellen(text){
  if(!W()||!text){return [];}
  var o=[];
  muster().forEach(function(x){treffer(x,String(text)).forEach(function(f){o.push({id:x.id,index:f.index,text:f.text});});});
  return o.sort(function(a,b){return a.index-b.index;});
}
/* Text aus DS oder Datenbank einordnen – mit Verneinung, Verdacht und Familie wie beim Auslesen
   von Berichten („ADHS ausgeschlossen“ ist keine Diagnose, „V.a. Autismus“ ein Verdacht).
   fuer: Profil, um das es im Text geht (Details zu einem angekreuzten Feld im DS). */
function einordnen(t,fuer){
  var B=window.CDSE_BERICHTE;
  if(B&&B.einordnen){try{return B.einordnen(t,fuer);}catch(e){}}
  var l=passende(t).map(function(id){return {id:id,art:'erwaehnt',grund:''};});
  if(fuer&&!l.some(function(x){return x.id===fuer;})){l.push({id:fuer,art:'erwaehnt',grund:''});}
  return l;
}
/* Einstufung aus dem Feld (diagnose/verdacht) und dem Text; null = verneint oder nicht das Kind */
function standAus(x,feld){
  if(x.art==='aus'||x.grund==='familie'){return null;}
  if(feld==='verdacht'||x.art==='verdacht'||x.art==='unklar'||x.grund==='test'||x.grund==='frage'){return 'verdacht';}
  return 'diagnose';
}
function dsFrage(k){var a=(typeof DS_TEXTE!=='undefined'&&DS_TEXTE&&DS_TEXTE.de&&DS_TEXTE.de.a)||{};return (a[k]&&a[k].q)||k;}
function chipName(g,k){var c=(typeof DS_TEXTE!=='undefined'&&DS_TEXTE&&DS_TEXTE.de&&DS_TEXTE.de.chips&&DS_TEXTE.de.chips[g])||{};return (c[k]&&c[k][0])||k;}
function umfeldDef(id){var w=W();return w?w.umfeld.filter(function(u){return u.id===id;})[0]||null:null;}

/* ---------- Datensatz der Datenbank: für alle ohne die reinen Datenbank-Angaben ---------- */
function datensatz(d,resp){
  var D=window.CDSE_DATENBANK;if(!D||!D.datensatz){return {};}
  try{return resp?D.datensatz(d):D.datensatz(Object.assign({},d,{db:{},id:''}));}catch(e){return {};}
}

/* =====================================================================
   Profil lesen
   ===================================================================== */
function lesen(d){
  var w=W(), resp=istResp(), m={}, offen=[], klaeren=[], umfeld={};
  var team=((d.begleitplan||{}).merkmale)||{};
  function grund(pid,art,text,quelle,nurResp){
    if(!profilDef(pid)){return;}
    var x=m[pid]||(m[pid]={id:pid,def:profilDef(pid),art:art,gruende:[]});
    if(RANG[art]>RANG[x.art]){x.art=art;}
    if(!x.gruende.some(function(g){return g.text===text;})){x.gruende.push({art:art,text:text,quelle:quelle,nurResp:!!nurResp});}
  }
  function lage(id,text){if(!umfeldDef(id)){return;}(umfeld[id]=umfeld[id]||[]);if(text&&umfeld[id].indexOf(text)<0){umfeld[id].push(text);}}
  var st=(H.dsStand?H.dsStand(d):null)||{bewertungen:{},chips:{},frei:{},f:{},datum:''};
  var ch=st.chips||{}, f=st.f||{};
  var geklaert={};Object.keys(team).forEach(function(k){if(team[k]&&team[k].bezug){geklaert[team[k].bezug]=1;}if(team[k]&&team[k].art==='geklaert'){geklaert[k]=1;}});

  /* 1) DS: Diagnosen – Verneintes („kein Hinweis auf …“) wird kein Profil, „V. a.“ wird Verdacht */
  (ch.diagnosen||[]).forEach(function(k){
    var det=String(((f.diagnosen_details||{})[k])||'').trim();
    if(k==='andere'){
      var t=[String((st.frei||{}).diagnose_andere||'').trim(),det].filter(Boolean).join(' – ');if(!t){return;}
      var l=einordnen(t);
      l.forEach(function(x){var a=standAus(x,'diagnose');if(a){grund(x.id,a,'Im DS eingetragen: „'+t+'“','ds');}});
      if(!l.length&&!geklaert['ds-text:'+t.slice(0,50)]){offen.push({text:t,quelle:'DS',art:'diagnose'});}
      return;
    }
    var pid=w.ds.diagnosen[k], l2=det?einordnen(det,pid||null):[], weitere=[];
    if(pid){
      var eigen=l2.filter(function(x){return x.id===pid;})[0], a=eigen?standAus(eigen,'diagnose'):'diagnose';
      if(a){grund(pid,a,'Im DS eingetragen: '+chipName('diagnosen',k)+(det?' ('+det+')':''),'ds');}
    }
    l2.forEach(function(x){if(x.id===pid){return;}var a2=standAus(x,'diagnose');if(a2){weitere.push(x.id);grund(x.id,a2,'Im DS eingetragen: '+chipName('diagnosen',k)+' ('+det+')','ds');}});
    var ob=w.ds.oberbegriff[k];
    if(ob&&!weitere.length&&!geklaert['ds:'+k]){klaeren.push({key:'ds:'+k,name:ob.name,auswahl:ob.auswahl});}
  });
  /* 2) Datenbank: Diagnosen und Verdacht (nur Responsables und Verwaltung) */
  if(resp&&d.db){
    [['diagnosen','diagnose','Datenbank'],['verdacht','verdacht','Datenbank, Verdacht']].forEach(function(z){
      zeilen(d.db[z[0]]).forEach(function(t){
        var l=einordnen(t);
        l.forEach(function(x){var a=standAus(x,z[1]);if(a){grund(x.id,a,z[2]+': „'+t+'“','db',true);}});
        if(!l.length&&!geklaert['db:'+t.slice(0,50)]){offen.push({text:t,quelle:z[2],art:z[1],nurResp:true});}
      });
    });
  }
  /* 3) vom Team eingetragen (z. B. aus einem Arztbrief) */
  Object.keys(team).forEach(function(k){
    var x=team[k];if(!x||(x.art!=='diagnose'&&x.art!=='verdacht')){return;}
    if(x.bezug&&/^bericht:/.test(x.bezug)){grund(k,x.art,'Laut '+(x.quelle||'Bericht')+(x.art==='verdacht'?' (Verdacht)':''),'team');return;}
    grund(k,x.art,'Vom Team eingetragen'+(x.art==='verdacht'?' (Verdacht)':'')+(x.quelle?': '+x.quelle:''),'team');
  });
  /* 4) DS: Arbeitshypothesen, Lebenslage, Anlass, Ereignisse */
  var b=st.bewertungen||{};
  Object.keys(w.ds.hypothesen).forEach(function(k){var r=b[k];if(r>=HYP_AB){grund(w.ds.hypothesen[k],'hypothese','Arbeitshypothese im DS: „'+dsFrage(k)+'“ ('+r+' von 7)','ds');}});
  Object.keys(w.ds.umfeld).forEach(function(k){var r=b[k];if(r>=HYP_AB){lage(w.ds.umfeld[k],'DS: „'+dsFrage(k)+'“ ('+r+' von 7)');}});
  (ch.anlass||[]).forEach(function(k){var pid=w.ds.anlass[k];if(pid){grund(pid,'beobachtet','Anlass der Anfrage (DS): '+chipName('anlass',k),'ds');}});
  (ch.ereignisse||[]).forEach(function(k){
    if(k==='trauma'){grund('trauma','hypothese','Belastendes Erlebnis im DS genannt','ds');}
    if(k==='migration'){lage('mehrsprachig','Migrationserfahrung (DS)');}
    else{lage('belastung',chipName('ereignisse',k)+' (DS)');}
  });
  /* 5) Beobachtungen: Screening, auffällige Bereiche laut DS, Warnsignale, Vorfälle */
  var o=beobachtungen(d,st);
  w.profile.forEach(function(p){
    (p.beob||[]).some(function(alt){
      var g=[], ok=alt.every(function(bed){var r=bedingung(bed,o);if(r&&r.text){g.push(r);}return !!r;});
      if(ok){g.forEach(function(r){grund(p.id,'beobachtet',r.text,r.quelle);});}
      return ok;
    });
  });
  /* 6) Entscheidungen des Teams: ausgeblendet */
  var ausgeblendet=[];
  Object.keys(m).forEach(function(id){if(team[id]&&team[id].art==='aus'){m[id].aus=team[id];ausgeblendet.push(m[id]);delete m[id];}});
  /* 7) Profile, die in einem anderen aufgehen (z. B. Emotionsregulation in den Borderline-Zügen) */
  Object.keys(m).forEach(function(id){
    var x=m[id];if(!x){return;}
    (x.def.umfasst||[]).forEach(function(u){
      var y=m[u];if(!y||u===id){return;}
      /* Gründe übernehmen, aber nicht für die Einstufung zählen */
      y.gruende.forEach(function(g){if(!x.gruende.some(function(h){return h.text===g.text;})){x.gruende.push({art:g.art,text:g.text,quelle:g.quelle,nurResp:g.nurResp,umfasst:true});}});
      x.umfasst=(x.umfasst||[]).concat([y.def.thema||y.def.name]);delete m[u];
    });
  });
  /* Was sieht das Team ohne die reinen Datenbank-Angaben? (teilen: Einstufung beruht nur auf der Datenbank) */
  var liste=Object.keys(m).map(function(id){
      var x=m[id], sicht=x.gruende.filter(function(g){return !g.nurResp&&!g.umfasst;});
      x.nurResp=!sicht.length;x.artTeam=sicht.reduce(function(a,g){return (!a||RANG[g.art]>RANG[a])?g.art:a;},null);x.teilen=x.artTeam!==x.art;
      return x;})
    .sort(function(a,c){return (RANG[c.art]-RANG[a.art])||(c.gruende.length-a.gruende.length)||(profilIndex(a.id)-profilIndex(c.id));});
  var ids={};liste.forEach(function(x){ids[x.id]=1;});
  var ctx=kontext(d,resp,o,umfeld,ids);
  return {profile:liste,ids:ids,offen:offen,klaeren:klaeren,ausgeblendet:ausgeblendet,beob:o,ctx:ctx,ds:st};
}

/* Screenings der letzten 12 Monate (je Bereich die deutlichste Einschätzung), sonst die
   auffälligen Bereiche laut DS; Warnsignale der letzten drei Monate; Vorfälle */
function beobachtungen(d,st){
  var o={sc:{},warn:{},vorfaelle:0,alter:null}, S=window.CDSE_SCREENING, w=W();
  var g=(d.person||{}).geburtsdatum;o.alter=(g&&H.alter)?H.alter(g):null;
  var neuestesSc='';
  if(S&&S.auswerten){
    (d.screenings||[]).forEach(function(s){
      if(String(s.datum)>neuestesSc){neuestesSc=String(s.datum);}
      if(tageSeit(s.datum)>SC_TAGE){return;}
      var e;try{e=S.auswerten(s);}catch(x){return;}
      e.bereiche.forEach(function(b){
        if(!STUFE_RANG[b.stufe]){return;}
        var alt=o.sc[b.id];
        if(!alt||STUFE_RANG[b.stufe]>STUFE_RANG[alt.stufe]||(b.stufe===alt.stufe&&String(s.datum)>String(alt.datum))){o.sc[b.id]={stufe:b.stufe,name:b.name,datum:s.datum,quelle:'screening'};}
      });
      if(tageSeit(s.datum)<=WARN_TAGE){e.warn.forEach(function(x){o.warn[x.id]={text:(w.warnKurz||{})[x.id]||x.text,datum:s.datum};});}
    });
    /* Der DS zählt nur, wenn danach noch kein Screening gemacht wurde */
    var dsb=(S.dsBereiche&&st&&st.datum&&!(neuestesSc&&neuestesSc>=st.datum))?S.dsBereiche(d):null;
    if(dsb){Object.keys(dsb.bereiche).forEach(function(id){var x=dsb.bereiche[id];if(STUFE_RANG[x.stufe]&&!o.sc[id]){o.sc[id]={stufe:x.stufe,name:x.name,datum:dsb.datum,quelle:'ds'};}});}
  }
  o.vorfaelle=(d.eintraege||[]).filter(function(e){return e&&e.art==='vorfall'&&tageSeit(e.datum)<=VORFALL_TAGE;}).length;
  return o;
}
function bedingung(b,o){
  var t=String(b).split(':');
  if(t[0]==='sc'){
    var x=o.sc[t[1]];if(!x){return null;}if(t[2]!=='gelb'&&x.stufe!=='rot'){return null;}
    return {text:(x.quelle==='ds'?'DS vom ':'Screening vom ')+datum(x.datum)+': „'+x.name+'“ '+(x.stufe==='rot'?'deutlich':'zu beobachten'),quelle:x.quelle};
  }
  if(t[0]==='warn'){var w=o.warn[t[1]];return w?{text:'Warnsignal im Screening vom '+datum(w.datum)+': '+w.text,quelle:'screening'}:null;}
  if(t[0]==='alter'){var n=parseInt(t[1],10);return (o.alter!=null&&o.alter>=n)?{}:null;}
  if(t[0]==='vorfaelle'){var v=parseInt(t[1],10);return o.vorfaelle>=v?{text:o.vorfaelle+' Vorfälle in den letzten drei Monaten',quelle:'eintraege'}:null;}
  return null;
}

/* ---------- Entwicklungsstufe (ELDiB) und Lebenslage ---------- */
function stufenLesen(d){
  var A=null;try{A=H.eldibAuswertung?H.eldibAuswertung(d):null;}catch(e){A=null;}
  if(!A){return null;}
  var o={};A.bereiche.forEach(function(b){if(b.bewertet){o[b.code]={stufe:b.arbeit,name:b.name,abstand:b.abstand};}});
  var l=['V','SOZ'].map(function(c){return o[c];}).filter(Boolean);if(!l.length){return null;}
  return {bereiche:o,rolle:Math.min.apply(null,l.map(function(x){return x.stufe;})),datum:(A.e&&A.e.datum)||''};
}
function schulstufe(r,alter){
  var c=r.cycle;if(c&&c!=='andere'){return c;}
  if(alter==null){return '';}
  return alter<6?'C1':(alter<8?'C2':(alter<10?'C3':(alter<12?'C4':'ES')));
}
function kontext(d,resp,o,umfeld,ids){
  var r=datensatz(d,resp), a=o.alter, st=stufenLesen(d);
  function lage(id,text){if(!umfeldDef(id)){return;}(umfeld[id]=umfeld[id]||[]);if(text&&umfeld[id].indexOf(text)<0){umfeld[id].push(text);}}
  if(a!=null&&a<8){lage('klein',a+' Jahre');}
  if(a!=null&&a>=12){lage('jugend',a+' Jahre');}
  var sr=(r.sorgerecht||[]).filter(function(x){return /pflege|foyer|vormund|one\b/i.test(x);});
  if(sr.length){lage('fremd','Sorgerecht: '+sr.join(', '));}
  if(resp){
    (r.massnahmenFamilie||[]).filter(function(x){return /placement|foyer|accueil|pflege|heim/i.test(x);}).forEach(function(x){lage('fremd',x+' (Datenbank)');});
    if(r.eltern==='anderes'){lage('fremd','Elternsituation „anderes“ (Datenbank)');}
  }
  if(r.ankunft&&tageSeit(r.ankunft)<=NEU_TAGE){lage('neu','in Luxemburg seit '+datum(r.ankunft));}
  if(r.sprache&&r.sprache!=='LU'){lage('mehrsprachig','Erstsprache: '+(r.erstsprache||r.sprache));}
  var netz=(r.dienste||[]).slice();if(r.scas==='ja'&&netz.join(' ').toUpperCase().indexOf('SCAS')<0){netz.push('SCAS');}
  if(netz.length>=2||r.scas==='ja'){lage('netz',netz.join(', '));}
  if(o.vorfaelle>=3){lage('vorfaelle',o.vorfaelle+' Vorfälle in drei Monaten');}
  if(st){['V','SOZ'].forEach(function(c){var x=st.bereiche[c];if(x&&x.abstand!=null&&x.abstand>=2){lage('entwicklung','ELDiB '+x.name+': Stufe '+ROEM[x.stufe]+', '+x.abstand+' Stufen unter dem Alter');}});}
  return {alter:a,stufen:st,schulstufe:schulstufe(r,a),umfeld:umfeld,ids:ids};
}

/* ---------- Passt ein Baustein zu diesem Kind? ---------- */
function passt(it,ctx){
  var tag='', warum='';
  if(it.b&&it.st){
    var s=ctx.stufen&&ctx.stufen.bereiche[it.b];
    var bereich=it.st[0]===it.st[1]?ROEM[it.st[0]]:ROEM[it.st[0]]+'–'+ROEM[it.st[1]];
    if(s){if(s.stufe<it.st[0]||s.stufe>it.st[1]){return null;}warum='passt zu ETEP-Stufe '+ROEM[s.stufe]+' ('+s.name+')';}
    else{tag='bei Stufe '+bereich;}
  }
  if(it.alter){
    if(ctx.alter==null){tag=(tag?tag+', ':'')+it.alter[0]+'–'+it.alter[1]+' Jahre';}
    else if(ctx.alter<it.alter[0]||ctx.alter>it.alter[1]){return null;}
  }
  return {tag:tag,warum:warum};
}

/* =====================================================================
   Darstellung
   ===================================================================== */
function neueQ(){return {liste:[],nr:{}};}
function zit(q,Q){
  var teile=[];
  (q||[]).forEach(function(k){
    if(k==='Praxis'){teile.push('<span class="ko-praxis" title="Erfahrung aus der pädagogischen Praxis, keine eigene Studie">Praxis</span>');return;}
    if(!QUELLEN[k]){return;}
    if(!Q.nr[k]){Q.liste.push(k);Q.nr[k]=Q.liste.length;}
    teile.push('<button type="button" class="ko-q" data-ko="quelle" data-nr="'+Q.nr[k]+'" title="'+esc(QUELLEN[k])+'" aria-label="Quelle '+Q.nr[k]+'">'+Q.nr[k]+'</button>');
  });
  return teile.length?'<span class="ko-qs">'+teile.join('')+'</span>':'';
}
function punkt(it,ctx,Q,extra){
  var p=passt(it,ctx);if(!p){return '';}
  return '<li><span class="ko-t">'+esc(it.t)+'</span>'+(extra?'<span class="ko-von">'+esc(extra)+'</span>':'')+
    (p.warum?'<span class="ko-passt">'+svg('check')+esc(p.warum)+'</span>':'')+(p.tag?'<span class="ko-tag">'+esc(p.tag)+'</span>':'')+zit(it.q,Q)+'</li>';
}
function anzeigeName(x){return (x.art==='diagnose'||x.art==='verdacht')?x.def.name:(x.def.thema||x.def.name);}
function artChip(art){return '<span class="ko-art '+art+'" title="'+esc(ART_TEXT[art])+'">'+ART_NAME[art]+'</span>';}

/* Arbeitsblatt in der Fassung für die Schulstufe des Kindes (gleiches Thema, andere Stufe) */
function blattFuer(id,stufe){
  var T0=window.CDSE_TOOLBOX_INDEX, bl=(T0&&Array.isArray(T0.blaetter))?T0.blaetter:[];
  var b=bl.filter(function(x){return x.id===id;})[0];if(!b){return null;}
  if(!stufe||(b.stufen||[]).indexOf(stufe)>=0||b.bereich==='Werkzeuge für Fachkräfte'){return b;}
  return bl.filter(function(x){return x.bereich===b.bereich&&x.thema===b.thema&&(x.stufen||[]).indexOf(stufe)>=0;})[0]||b;
}
function material(ids,ctx){
  var gesehen={}, l=[];
  (ids||[]).forEach(function(id){var b=blattFuer(id,ctx.schulstufe);if(b&&!gesehen[b.id]){gesehen[b.id]=1;l.push(b);}});
  return l;
}
function blattLink(b){return '<a href="apps/toolbox.html#blatt='+encodeURIComponent(b.id)+'" target="cdse-toolbox">'+esc(b.nr?b.nr+' ':'')+esc(b.titel)+'<small>'+esc((b.stufen||[]).join(', '))+'</small></a>';}
function lernLink(id){return LERN_TITEL[id]?'<a href="apps/lernen.html#/modul/'+encodeURIComponent(id)+'" target="cdse-lernen">'+esc(LERN_TITEL[id])+'</a>':'';}

/* ---------- Reiter ---------- */
function tab(d,r){
  if(!bausteine()||!W()){return '<p>Der Kompass fehlt in dieser Hub-Datei.</p>';}
  var L=lesen(d), ctx=L.ctx, Q=neueQ(), w=W(), vn=vorname(d), h='';
  h+='<div class="ko" id="ko-ergebnis">';
  h+='<div class="ko-stand keindruck" role="note">'+svg('info')+'<span><b>Entwurf, Stand '+esc(datum(w.stand))+':</b> Die Inhalte sind vor dem Einsatz fachlich zu prüfen (z. B. durch die Diagnostique). Der Kompass ordnet Fachwissen dem Profil zu. Er stellt keine Diagnose und ersetzt keine Behandlung.</span></div>';
  /* Profil */
  h+='<section class="ar-karte ko-kopf"><div class="ar-kartenkopf"><div><p class="overline">Kompass</p><h2>Was '+esc(vn)+' braucht</h2></div>'+
    '<span class="ar-knopfreihe keindruck">'+(r.bearbeiten&&window.CDSE_BERICHTE?'<button class="btn" type="button" data-ber="neu">'+svg('hoch')+'Bericht hinzufügen</button>':'')+
    (r.bearbeiten?'<button class="btn" type="button" data-ko="ergaenzen">'+svg('plus')+'Profil ergänzen</button>':'')+
    '<button class="btn" type="button" data-ko="drucken">'+svg('print')+'Drucken</button></span></div>';
  if(L.profile.length){
    h+='<ul class="ko-profilchips">'+L.profile.map(function(x){
      return '<li><button type="button" class="ko-pchip '+x.art+'" data-ko="springen" data-id="'+esc(x.def.id)+'">'+esc(anzeigeName(x))+artChip(x.art)+'</button></li>';}).join('')+'</ul>';
  }else{
    h+='<p class="ko-leer">Noch kein Profil erkennbar. Der Kompass liest Diagnosen und Hypothesen aus dem DS, das Screening, Warnsignale und Vorfälle'+(istResp()?', die Datenbank-Angaben':'')+' und was das Team einträgt. '+
      (r.bearbeiten?'Liegt ein Befund oder Arztbrief vor, trag das Profil mit <b>„Profil ergänzen“</b> ein.':'')+'</p>';
  }
  var st=ctx.stufen;
  h+='<dl class="ko-fakten">'+
    '<dt>Entwicklung (ELDiB)</dt><dd>'+(st?Object.keys(st.bereiche).filter(function(c){return c==='V'||c==='SOZ'||c==='K';}).map(function(c){var x=st.bereiche[c];return esc(x.name)+' Stufe '+ROEM[x.stufe];}).join(' · ')+
      ' <span class="ko-leise">→ Rolle der Erwachsenen: <b>'+esc(w.stufen[st.rolle].rolle)+'</b></span>':'<span class="ko-leise">noch keine ELDiB-Einschätzung – Hinweise gelten dann für alle Stufen</span>')+'</dd>'+
    '<dt>Lebenslage</dt><dd>'+(Object.keys(ctx.umfeld).length?Object.keys(ctx.umfeld).map(function(id){return esc(umfeldDef(id).name);}).join(' · '):'<span class="ko-leise">keine besonderen Angaben</span>')+'</dd>'+
    (function(){var med=window.CDSE_BERICHTE?window.CDSE_BERICHTE.medikation(d):[];return med.length?'<dt>Medikation</dt><dd>'+med.map(function(m){return esc(m.name+(m.dosis?' '+m.dosis:''))+' <span class="ko-leise">(laut '+esc(m.art)+(m.datum?' vom '+esc(datum(m.datum)):'')+')</span>';}).join(' · ')+'</dd>':'';})()+
    '<dt>Material für</dt><dd>'+(ctx.schulstufe?esc(ctx.schulstufe):'<span class="ko-leise">Schulstufe unbekannt</span>')+'</dd></dl>';
  /* Rückfragen */
  L.klaeren.forEach(function(k){
    h+='<div class="ko-frage">'+svg('info')+'<div><b>Im DS steht „'+esc(k.name)+'“.</b> Das ist ein Oberbegriff. Welches Bild passt am ehesten?'+
      (r.bearbeiten?'<div class="ko-wahl">'+k.auswahl.map(function(id){var p=profilDef(id);return '<button type="button" class="btn klein" data-ko="klaeren" data-key="'+esc(k.key)+'" data-id="'+esc(id)+'">'+esc(p.name)+'</button>';}).join('')+
        '<button type="button" class="ar-link" data-ko="klaeren" data-key="'+esc(k.key)+'" data-id="">keines davon</button></div>':'<p class="ko-leise">Das kann jemand mit Schreibrecht zuordnen.</p>')+'</div></div>';
  });
  L.offen.forEach(function(x){
    h+='<div class="ko-frage">'+svg('info')+'<div><b>'+esc(x.quelle)+': „'+esc(x.text)+'“</b> ist keinem Profil zugeordnet.'+(x.nurResp?' <span class="ko-nurresp">nur Responsables</span>':'')+
      (r.bearbeiten?' <button type="button" class="ar-link" data-ko="zuordnen" data-text="'+esc(x.text)+'" data-art="'+esc(x.art)+'" data-resp="'+(x.nurResp?1:0)+'">Profil wählen</button>':'')+'</div></div>';
  });
  h+='</section>';
  var berichte=window.CDSE_BERICHTE?window.CDSE_BERICHTE.karte(d,r):'';
  if(!L.profile.length&&!Object.keys(ctx.umfeld).length&&!st){return h+berichte+ausgeblendetKarte(L,r)+'</div>';}
  /* Das Wichtigste zuerst */
  h+=wichtigstes(d,L,ctx,Q,r);
  /* Profile */
  L.profile.forEach(function(x,i){h+=profilKarte(d,x,ctx,Q,r,i===0);});
  /* Kombinationen */
  var kombi=w.kombinationen.filter(function(k){return k.wenn.every(function(id){return L.ids[id];});});
  if(kombi.length){h+='<section class="ar-karte ko-block"><h3>Wenn mehreres zusammenkommt</h3><ul class="ko-liste">'+kombi.map(function(k){return punkt(k,ctx,Q,k.wenn.map(function(id){var x=L.profile.filter(function(p){return p.id===id;})[0];return x?anzeigeName(x):id;}).join(' + '));}).join('')+'</ul></section>';}
  /* Entwicklungsstufe */
  if(st){
    var s=w.stufen[st.rolle];
    h+='<section class="ar-karte ko-block"><h3>Umgang nach der Entwicklungsstufe</h3><p class="ko-leise">ETEP-Stufe '+ROEM[st.rolle]+' (niedrigere Stufe aus Verhalten und Sozialisation der ELDiB'+(st.datum?' vom '+esc(datum(st.datum)):'')+'). Rolle der Erwachsenen: <b>'+esc(s.rolle)+'</b>.</p>'+
      '<ul class="ko-liste">'+s.umgang.map(function(it){return punkt(it,ctx,Q);}).join('')+'</ul></section>';
  }
  /* Lebenslage */
  var ul=Object.keys(ctx.umfeld);
  if(ul.length){h+='<section class="ar-karte ko-block"><h3>Lebenslage mitdenken</h3><ul class="ko-liste">'+ul.map(function(id){var u=umfeldDef(id);return punkt(u,ctx,Q,u.name+(ctx.umfeld[id].length?': '+ctx.umfeld[id].join('; '):''));}).join('')+'</ul></section>';}
  h+=berichte+ausgeblendetKarte(L,r);
  /* Quellen */
  if(Q.liste.length){
    h+='<details class="ar-karte ko-quellen" id="ko-quellen"><summary><h3>Quellen ('+Q.liste.length+')</h3></summary><ol>'+Q.liste.map(function(k,i){return '<li id="ko-q-'+(i+1)+'">'+esc(QUELLEN[k])+'</li>';}).join('')+'</ol>'+
      '<p class="ko-leise">Die Zahlen hinter jedem Punkt verweisen auf diese Liste. „Praxis“ heißt: bewährte pädagogische Erfahrung ohne eigene Studie.</p></details>';
  }
  h+='<details class="ar-karte ko-wie keindruck"><summary><h3>Wie der Kompass arbeitet</h3></summary><p>Der Kompass liest, was im Dossier steht: Diagnosen und Verdacht (DS'+(istResp()?', Datenbank':'')+', vom Team eingetragen), Arbeitshypothesen und Anlass aus dem DS, die Screenings der letzten zwölf Monate, Warnsignale und Vorfälle der letzten drei Monate, die ELDiB-Stufen sowie Alter und Lebenslage. Daraus wählt er Bausteine aus einer Wissensbasis mit Leitlinien und Fachliteratur. Hinweise für bestimmte Entwicklungsstufen erscheinen nur, wenn sie zur ELDiB-Stufe passen.</p>'+
    '<p>Die Abzeichen zeigen, worauf ein Profil beruht: <b>Diagnose</b> (dokumentiert), <b>Verdacht</b>, <b>Arbeitshypothese</b> (DS-Deutung, keine Diagnose), <b>Beobachtet</b> (Screening, DS, Einträge – keine Diagnose). Was nicht passt, kann das Team ausblenden. Jede Änderung steht im Protokoll.</p></details>';
  return h+'</div>';
}

/* „Das Wichtigste zuerst“: Warnsignale, je Profil der wichtigste Umgangshinweis, Kombinationen, Rolle nach Stufe */
function wichtigstes(d,L,ctx,Q,r){
  var w=W(), l=[];
  var warn=Object.keys(L.beob.warn);
  if(warn.length){
    l.push('<li class="ko-dringend"><span class="ko-t"><b>Warnsignal im Screening:</b> '+esc(warn.map(function(k){return L.beob.warn[k].text;}).join(', '))+'. Die Schritte im Screening gehen allem anderen vor.</span>'+
      '<button type="button" class="ar-link" data-tab="screening">Zum Screening</button></li>');
    L.profile.forEach(function(x){(x.def.krise||[]).slice(0,1).forEach(function(it){var p=punkt(it,ctx,Q,anzeigeName(x));if(p&&l.length<3){l.push(p);}});});
  }
  L.profile.slice(0,3).forEach(function(x){
    var um=(x.def.umgang||[]), spez=um.filter(function(it){var p=passt(it,ctx);return p&&p.warum;})[0], it=spez||um.filter(function(i){return passt(i,ctx);})[0];
    if(it){l.push(punkt(it,ctx,Q,anzeigeName(x)));}
  });
  w.kombinationen.filter(function(k){return k.wenn.every(function(id){return L.ids[id];});}).slice(0,2).forEach(function(k){l.push(punkt(k,ctx,Q,'Kombination'));});
  if(ctx.stufen){var s=w.stufen[ctx.stufen.rolle];if(s&&s.umgang[0]){l.push(punkt(s.umgang[0],ctx,Q,'ETEP-Stufe '+ROEM[ctx.stufen.rolle]+': '+s.rolle));}}
  l=l.filter(Boolean).slice(0,7);
  if(!l.length){return '';}
  return '<section class="ar-karte ko-wichtig"><h3>'+svg('ziel')+'Das Wichtigste zuerst</h3><ol class="ko-liste">'+l.join('')+'</ol></section>';
}

function profilKarte(d,x,ctx,Q,r,offen){
  var p=x.def, vn=vorname(d), h='<details class="ar-karte ko-profil '+x.art+'" id="ko-p-'+esc(p.id)+'"'+(offen?' open':'')+'>'+
    '<summary><span class="ko-pkopf"><span class="ko-pname">'+esc(anzeigeName(x))+'</span>'+artChip(x.art)+(x.teilen?'<span class="ko-nurresp" title="'+esc(x.nurResp?'Steht nur in der Datenbank – sichtbar für Responsables und Verwaltung':'Diese Einstufung beruht auf der Datenbank – das Team sieht hier „'+ART_NAME[x.artTeam]+'“')+'">nur Responsables</span>':'')+
      (KEINE_DIAGNOSE[x.art]?'<span class="ko-keinediag">'+esc(KEINE_DIAGNOSE[x.art])+'</span>':'')+'</span>'+
    (x.umfasst&&x.umfasst.length?'<span class="ko-umfasst">umfasst: '+esc(x.umfasst.join(', '))+'</span>':'')+svg('right')+'</summary><div class="ko-pinhalt">';
  h+='<div class="ko-warum"><b>Warum für '+esc(vn)+'?</b><ul>'+x.gruende.map(function(g){return '<li>'+esc(g.text)+(g.nurResp?' <span class="ko-nurresp">nur Responsables</span>':'')+'</li>';}).join('')+'</ul></div>';
  if(p.kurz){h+='<p class="ko-kurz">'+esc(p.kurz)+'</p>';}
  var inhalt=0;
  ABSCHNITTE.forEach(function(a){
    var l=(p[a[0]]||[]).map(function(it){return punkt(it,ctx,Q);}).filter(Boolean);
    if(l.length){inhalt++;h+='<section class="ko-ab ko-ab-'+a[0]+'"><h4>'+esc(a[1])+'</h4><ul class="ko-liste">'+l.join('')+'</ul></section>';}
  });
  if(!inhalt){h+='<p class="ko-leise">Ausführliche Bausteine für dieses Profil folgen. Bis dahin: das Lernmodul und das Material unten.</p>';}
  var bl=material(p.blaetter,ctx), lm=(p.lernen||[]).map(lernLink).filter(Boolean);
  if(bl.length||lm.length){
    h+='<div class="ko-material">'+(bl.length?'<div><span class="ko-mtitel">Arbeitsblätter'+(ctx.schulstufe?' ('+esc(ctx.schulstufe)+')':'')+'</span>'+bl.map(blattLink).join('')+'</div>':'')+
      (lm.length?'<div><span class="ko-mtitel">Zum Nachlesen (Lernen)</span>'+lm.join('')+'</div>':'')+'</div>';
  }
  if(r.bearbeiten){
    var teamEintrag=x.gruende.some(function(g){return g.quelle==='team';});
    h+='<div class="ko-paktionen keindruck">'+
      (x.teilen&&istResp()?'<button type="button" class="ar-link" data-ko="teilen" data-id="'+esc(p.id)+'" data-art="'+esc(x.art)+'">'+svg('users')+'Für das Team sichtbar machen</button>':'')+
      (teamEintrag?'<button type="button" class="ar-link" data-ko="zuruecksetzen" data-id="'+esc(p.id)+'">'+svg('x')+'Eintrag des Teams entfernen</button>':'')+
      '<button type="button" class="ar-link" data-ko="aus" data-id="'+esc(p.id)+'">Passt nicht – ausblenden</button></div>';
  }
  return h+'</div></details>';
}
function ausgeblendetKarte(L,r){
  if(!L.ausgeblendet.length){return '';}
  return '<details class="ar-karte ko-aus keindruck"><summary><h3>Ausgeblendet ('+L.ausgeblendet.length+')</h3></summary><ul>'+L.ausgeblendet.map(function(x){
    return '<li><b>'+esc(anzeigeName(x))+'</b> '+artChip(x.art)+(x.aus.quelle?' <span class="ko-leise">– '+esc(x.aus.quelle)+'</span>':'')+
      (r.bearbeiten?' <button type="button" class="ar-link" data-ko="zuruecksetzen" data-id="'+esc(x.def.id)+'">Wieder zeigen</button>':'')+'</li>';}).join('')+'</ul></details>';
}

/* ---------- Kurzfassung für den Überblick ---------- */
function kurzKarte(d){
  if(!bausteine()||!W()){return '';}
  var L;try{L=lesen(d);}catch(e){return '';}
  if(!L.profile.length&&!L.klaeren.length){return '';}
  return '<div class="ar-karte ko-kurzkarte"><div class="ar-kartenkopf"><h2>Kompass</h2><button class="ar-link" type="button" data-tab="kompass">Umgang und Material ansehen'+svg('right')+'</button></div>'+
    (L.profile.length?'<ul class="ko-profilchips">'+L.profile.slice(0,5).map(function(x){return '<li><span class="ko-pchip '+x.art+'">'+esc(anzeigeName(x))+artChip(x.art)+'</span></li>';}).join('')+'</ul>':'')+
    (L.klaeren.length?'<p class="ko-leise">Im DS steht ein Oberbegriff, der noch zugeordnet werden kann.</p>':'')+'</div>';
}

/* ---------- Teil fürs Übergabeblatt (ohne Quellenliste – die steht im Hub) ---------- */
function druckTeil(d){
  if(!bausteine()||!W()){return '';}
  var L;try{L=lesen(d);}catch(e){return '';}
  /* Gedruckt wird nur, was alle im Team sehen: Profile allein aus der Datenbank (nur Responsables)
     bleiben weg, sonst gilt die Einstufung ohne die Datenbank-Angaben */
  var prof=L.profile.filter(function(x){return !x.nurResp;}).map(function(x){return {x:x,art:(x.teilen&&x.artTeam)?x.artTeam:x.art};});
  if(!prof.length){return '';}
  var ids={};prof.forEach(function(p){ids[p.x.id]=1;});
  function name(p){return (p.art==='diagnose'||p.art==='verdacht')?p.x.def.name:(p.x.def.thema||p.x.def.name);}
  var w=W(), ctx=L.ctx, l=[], warn=Object.keys(L.beob.warn);
  if(warn.length){l.push(['Warnsignal im Screening: '+warn.map(function(k){return L.beob.warn[k].text;}).join(', ')+'. Die Schritte im Screening gehen vor.','dringend']);}
  prof.slice(0,4).forEach(function(p){
    var um=p.x.def.umgang||[], it=um.filter(function(i){var q=passt(i,ctx);return q&&q.warum;})[0]||um.filter(function(i){return passt(i,ctx);})[0];
    if(it){l.push([it.t,name(p)]);}
  });
  w.kombinationen.filter(function(k){return k.wenn.every(function(id){return ids[id];});}).slice(0,2).forEach(function(k){l.push([k.t,'Kombination']);});
  if(ctx.stufen){var s=w.stufen[ctx.stufen.rolle];if(s&&s.umgang[0]){l.push([s.umgang[0].t,'ETEP-Stufe '+ROEM[ctx.stufen.rolle]+': '+s.rolle]);}}
  return '<h2>Kompass</h2><p>'+prof.map(function(p){return '<b>'+esc(name(p))+'</b> ('+esc(ART_NAME[p.art])+(p.art==='beobachtet'||p.art==='hypothese'?', keine Diagnose':'')+')';}).join(' · ')+'</p>'+
    '<h3>Das Wichtigste im Umgang</h3><ul>'+l.map(function(z){return '<li>'+esc(z[0])+' <small>('+esc(z[1])+')</small></li>';}).join('')+'</ul>'+
    '<p class="klein">Entwurf, fachlich zu prüfen – keine Diagnose. Alle Hinweise mit Fachquellen: Hub → Dossier → Kompass.</p>';
}

/* =====================================================================
   Aktionen
   ===================================================================== */
function aktuell(){var d=H&&H.aktDossier&&H.aktDossier();return d||null;}
function speichern(d,key,werte,meldung){
  return T.ops.planMerkmal(d.id,key,werte).then(function(neu){H.toast(meldung);H.dossierZeichnen(neu);return neu;},function(e){H.toast((e&&e.message)||String(e));});
}
function profilOptionen(){return W().profile.map(function(p){return [p.id,p.name+(p.thema&&p.thema!==p.name?' ('+p.thema+')':'')];});}
function ergaenzenDialog(d,vorgabe){
  vorgabe=vorgabe||{};
  var hinweis=vorgabe.resp?'<p class="ko-dialog-hinweis">'+svg('users')+'Danach sehen alle, die das Dossier lesen dürfen, dieses Profil im Kompass.</p>':'';
  var inhalt=(vorgabe.text?'<p>Zuordnen: <b>„'+esc(vorgabe.text)+'“</b></p>':'<p>Zum Beispiel aus einem Arztbrief, einem Befund oder einem Bericht der Diagnostique. Der Kompass zeigt dann Umgang, Material und Quellen dazu.</p>')+
    H.auswahl('profil','Profil',vorgabe.id||'',profilOptionen(),'– bitte wählen –')+
    /* Nichts vorausgewählt: „Diagnose liegt vor“ nur, wenn jemand das bewusst wählt (beim Zuordnen gilt der Stand aus DS oder Datenbank) */
    '<fieldset class="ko-dialog-art"><legend>Stand</legend><label><input type="radio" name="art" value="diagnose"'+(vorgabe.art==='diagnose'?' checked':'')+'> Diagnose liegt vor</label><label><input type="radio" name="art" value="verdacht"'+(vorgabe.art==='verdacht'?' checked':'')+'> Verdacht (noch nicht abgeklärt)</label></fieldset>'+
    H.feld('quelle','Woher? (z. B. „Bericht Kinderpsychiatrie, 03/2026“)',vorgabe.quelle||'','text',' maxlength="300"')+hinweis;
  H.dialog(vorgabe.text?'Profil zuordnen':'Profil ergänzen',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{
    pruefen:function(x){if(!x.werte.profil){return 'Bitte ein Profil wählen.';}return (x.werte.art==='diagnose'||x.werte.art==='verdacht')?'':'Bitte den Stand wählen: Diagnose liegt vor oder Verdacht.';},
    ausfuehren:function(x){
      var p=profilDef(x.werte.profil), q=String(x.werte.quelle||'').trim();
      var werte={art:x.werte.art==='verdacht'?'verdacht':'diagnose',quelle:q,name:p.name};
      var weiter=T.ops.planMerkmal(d.id,p.id,werte);
      if(vorgabe.bezug){weiter=weiter.then(function(){return T.ops.planMerkmal(d.id,vorgabe.bezug,{art:'geklaert',name:vorgabe.text||vorgabe.bezug});});}
      return weiter;
    }
  }).then(function(res){if(res&&res.ergebnis){H.toast('Im Kompass eingetragen');H.dossierZeichnen(res.ergebnis);}});
}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-ko]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-ko'), id=t.getAttribute('data-id')||'', p=id?profilDef(id):null;
  if(a==='quelle'){
    ev.preventDefault();var q=document.getElementById('ko-quellen'), li=document.getElementById('ko-q-'+t.getAttribute('data-nr'));
    if(q){q.open=true;}if(li){li.scrollIntoView({block:'center',behavior:'smooth'});li.classList.add('ko-hell');setTimeout(function(){li.classList.remove('ko-hell');},1600);}
    return;
  }
  if(a==='springen'){var el=document.getElementById('ko-p-'+id);if(el){el.open=true;el.scrollIntoView({block:'start',behavior:'smooth'});}return;}
  if(a==='drucken'){
    Array.prototype.forEach.call(document.querySelectorAll('#ko-ergebnis details'),function(x){x.setAttribute('data-war-offen',x.open?'1':'');x.open=true;});
    document.body.classList.add('ko-druck');setTimeout(function(){window.print();},50);return;
  }
  if(a==='ergaenzen'){ergaenzenDialog(d);return;}
  if(a==='zuordnen'){
    var text=t.getAttribute('data-text')||'';
    ergaenzenDialog(d,{text:text,art:t.getAttribute('data-art')==='verdacht'?'verdacht':'diagnose',quelle:(t.getAttribute('data-resp')==='1'?'Datenbank: ':'DS: ')+'„'+text+'“',resp:t.getAttribute('data-resp')==='1',
      bezug:(t.getAttribute('data-resp')==='1'?'db:':'ds-text:')+text.slice(0,50)});
    return;
  }
  if(a==='klaeren'){
    var key=t.getAttribute('data-key');
    if(!id){speichern(d,key,{art:'geklaert',name:'Oberbegriff im DS'},'Erledigt');return;}
    t.disabled=true;
    T.ops.planMerkmal(d.id,id,{art:'diagnose',quelle:'DS: „'+(((W().ds.oberbegriff[key.replace(/^ds:/,'')]||{}).name)||key)+'“, vom Team zugeordnet',bezug:key,name:p.name})
      .then(function(neu){H.toast('Zugeordnet: '+p.name);H.dossierZeichnen(neu);},function(e){t.disabled=false;H.toast((e&&e.message)||String(e));});
    return;
  }
  if(a==='teilen'&&p){
    H.dialog('Für das Team sichtbar machen','<p>„'+esc(p.name)+'“ steht bisher nur in der Datenbank. Danach sehen alle, die das Dossier lesen dürfen, dieses Profil im Kompass – mit dem Vermerk „vom Team eingetragen“.</p>',
      [{text:'Abbrechen',wert:''},{text:'Sichtbar machen',wert:'ok',primaer:true}],
      {ausfuehren:function(){return T.ops.planMerkmal(d.id,p.id,{art:t.getAttribute('data-art')==='verdacht'?'verdacht':'diagnose',quelle:'Datenbank-Angabe',name:p.name});}})
      .then(function(res){if(res&&res.ergebnis){H.toast('Für das Team sichtbar');H.dossierZeichnen(res.ergebnis);}});
    return;
  }
  if(a==='aus'&&p){
    var L=lesen(d), x=L.profile.filter(function(y){return y.id===id;})[0], still=x&&x.nurResp;
    H.dialog('Ausblenden','<p>„'+esc(x?anzeigeName(x):p.name)+'“ passt nicht zu '+esc(vorname(d))+'? Das Profil verschwindet aus dem Kompass und lässt sich unten unter „Ausgeblendet“ wieder zeigen.</p>'+H.feld('grund','Warum? (optional)','','text',' maxlength="200"'),
      [{text:'Abbrechen',wert:''},{text:'Ausblenden',wert:'ok',primaer:true}],
      {ausfuehren:function(z){return T.ops.planMerkmal(d.id,id,{art:'aus',quelle:String(z.werte.grund||'').trim(),name:still?'ein Profil aus der Datenbank':(x?anzeigeName(x):p.name)});}})
      .then(function(res){if(res&&res.ergebnis){H.toast('Ausgeblendet');H.dossierZeichnen(res.ergebnis);}});
    return;
  }
  if(a==='zuruecksetzen'&&p){speichern(d,id,{art:'',name:p.name},'Zurückgesetzt');return;}
});
window.addEventListener('afterprint',function(){
  if(!document.body.classList.contains('ko-druck')){return;}
  document.body.classList.remove('ko-druck');
  Array.prototype.forEach.call(document.querySelectorAll('#ko-ergebnis details[data-war-offen]'),function(x){x.open=x.getAttribute('data-war-offen')==='1';x.removeAttribute('data-war-offen');});
});

return {tab:tab, kurzKarte:kurzKarte, druckTeil:druckTeil, fundstellen:fundstellen, profilDef:function(id){return profilDef(id);}, lesen:function(d){bausteine();return lesen(d);}, passende:passende, blattFuer:blattFuer};
})();
