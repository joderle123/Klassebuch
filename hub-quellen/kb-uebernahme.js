/* =====================================================================
   CDSE Hub — Übernahme aus Klassenbuch und Journal
   ---------------------------------------------------------------------
   Die Kinder gab es doppelt: im Klassenbuch/Journal (eigene Schülerliste,
   Dossier-Einträge in der Browser-Datenbank) und im verschlüsselten
   Hub-Dossier. Dieser Assistent führt zusammen, ohne etwas zu verlieren:
   - Dossier-Einträge und Réunion-Beiträge → Einträge im Hub-Dossier
     (Kategorie, Schlagwörter, Autorname, DS/PEI-Bericht und Herkunft
     bleiben als eigene Felder erhalten)
   - Wochenziele je Réunion → ein Eintrag „Wochenziele“ je Datum
   - Helfernetz → d.helfernetz (unverändert), Matricule, falls leer
   - frühere Screenings → wie in der Screening-Übersicht (d.screeningsAlt)
   Quellen: Klassenbuch und Journal in diesem Browser, dazu gewählte
   Team-Dateien, Tageskopien und Sicherungen. Liegt ein Eintrag mehrfach
   vor, gilt der neueste Stand. Die Zuordnung Kind → Dossier wird im
   Dossier gemerkt (d.herkunft), damit eine spätere Übernahme ohne
   Dubletten neue und geänderte Einträge nachträgt. In Klassenbuch und
   Journal wird nichts verändert oder gelöscht.
   ===================================================================== */
window.CDSE_KB_UEBERNAHME=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function S(){return window.CDSE_SCREENING||null;}
var APPS={
  klassenbuch:{name:'Klassenbuch',db:'cdse_dossier_db',roster:'klassebuch_roster_v1',bubble:'klassebuch_bubble_v1',praefix:''},
  journal:{name:'Journal',db:'isa_dossier_db',roster:'isa_roster_v1',bubble:'isa_bubble_v1',praefix:'isa:'}
};
var AUS='cdse-kb-uebernahme-ausgeblendet', ZUORDNUNG='cdse-kb-zuordnung';
/* Klassenbuch-Kategorie bzw. Journal-Notiztyp → Art im Hub (Kategorie bleibt als „Thema“) */
var ART={'Team-Réunion':'reunion','Wochenziel':'vereinbarung','Verhalten & Krisen':'beobachtung','Risiko & Sorge':'beobachtung',
  'Krise / Vorfall':'vorfall','Beobachtung':'beobachtung','Fördereinheit':'massnahme'};
var dateien=[];     /* gewählte Team-Dateien und Sicherungen – nur für diese Sitzung */
var karteEl=null, karteListe=[];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function datum(i){return H?H.datum(i):i;}
function lsJson(k,leer){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?leer:v;}catch(e){return leer;}}
function kopie(o){return o==null?o:JSON.parse(JSON.stringify(o));}
function artVon(kat){return ART[kat]||'notiz';}
function appName(a){return (APPS[a]||APPS.klassenbuch).name;}

/* ---------- Quellen lesen ---------- */
/* Browser-Datenbank nur lesen – und nur, wenn es sie gibt (sonst würde open() sie anlegen) */
function dbLesen(name){
  if(!window.indexedDB||!indexedDB.databases){return Promise.resolve(null);}
  return indexedDB.databases().then(function(l){
    if(!(l||[]).some(function(d){return d&&d.name===name;})){return null;}
    return new Promise(function(res){
      var r=indexedDB.open(name);
      r.onupgradeneeded=function(){try{r.transaction.abort();}catch(e){}};
      r.onerror=function(){res(null);};r.onblocked=function(){res(null);};
      r.onsuccess=function(){
        var db=r.result;db.onversionchange=function(){db.close();};
        var stores=['entries','reunions'].filter(function(s){return db.objectStoreNames.contains(s);}), out={entries:[],reunions:[]};
        if(!stores.length){db.close();res(out);return;}
        var tx=db.transaction(stores,'readonly');
        stores.forEach(function(s){var q=tx.objectStore(s).getAll();q.onsuccess=function(){out[s]=q.result||[];};});
        tx.oncomplete=function(){db.close();res(out);};tx.onerror=function(){db.close();res(out);};
      };
    });
  }).catch(function(){return null;});
}
function quellenLesen(){
  return Promise.all(Object.keys(APPS).map(function(app){
    var a=APPS[app];
    return dbLesen(a.db).then(function(db){return {app:app,herkunft:a.name+' in diesem Browser',entries:(db&&db.entries)||[],reunions:(db&&db.reunions)||[],roster:lsJson(a.roster,[]),bubble:lsJson(a.bubble,{})};});
  })).then(function(l){return l.concat(dateien);});
}
/* Team-Datei bzw. Tageskopie, Dossier-Sicherung des Klassenbuchs oder Komplett-Sicherung des Journals */
function dateiLesen(name,text){
  var j;try{j=JSON.parse(text);}catch(e){throw new Error('„'+name+'“ ist keine lesbare Datei (JSON).');}
  function sammlung(c){return (Array.isArray(c)?c:[]).filter(function(x){return x&&x.id!=null&&!x._del&&x.d&&typeof x.d==='object';}).map(function(x){return x.d;});}
  if(j&&j._format==='klassebuch-shared-v1'&&j.colls){
    var c=j.colls, bub={};sammlung(c.bubble).forEach(function(b){bub[b.id]=b;});
    return {app:(j._app==='journal'||c.pei||c.agenda||c.goals||c.tasks)?'journal':'klassenbuch',herkunft:name,entries:sammlung(c.dosEntries),reunions:sammlung(c.dosReunions),roster:sammlung(c.roster),bubble:bub};
  }
  if(j&&j.format==='isa-journal-backup'){
    var st=function(k,leer){try{return JSON.parse((j.stores||{})[k]||'null')||leer;}catch(e){return leer;}}, dj=j.dossier||{};
    return {app:'journal',herkunft:name,entries:dj.entries||[],reunions:dj.reunions||[],roster:st('isa_roster_v1',[]),bubble:st('isa_bubble_v1',{})};
  }
  if(j&&j.format==='cdse-dossier-backup'){
    return {app:'klassenbuch',herkunft:name,entries:j.entries||[],reunions:j.reunions||[],roster:(j.students||[]).map(function(s){return {id:s.id,name:s.name,active:s.active!==false};}),bubble:{}};
  }
  throw new Error('„'+name+'“ ist weder eine Team-Datei noch eine Sicherung von Klassenbuch oder Journal.');
}

/* ---------- Je Kind sammeln ---------- */
function zielListe(arr){
  return (Array.isArray(arr)?arr:[]).map(function(g){var t=(g&&typeof g==='object')?String(g.text||''):String(g==null?'':g);return {text:t,done:!!(g&&typeof g==='object'&&g.done)};})
    .filter(function(g){return g.text.trim();});
}
function sammeln(quellen){
  var kinder={};
  function kind(app,sid){var k=APPS[app].praefix+sid;return kinder[k]||(kinder[k]={kb:k,app:app,sid:String(sid),name:'',level:'',aktiv:true,eintraege:{},ziele:{},bubble:null,quellen:[]});}
  function quelle(c,h){if(c.quellen.indexOf(h)<0){c.quellen.push(h);}}
  quellen.forEach(function(q){
    (Array.isArray(q.roster)?q.roster:[]).forEach(function(s){if(s&&s.id!=null){var c=kind(q.app,s.id);if(!c.name&&s.name){c.name=String(s.name);c.level=String(s.level||'');c.aktiv=s.active!==false;}}});
    (q.entries||[]).forEach(function(e){
      if(!e||!e.id||!e.studentId){return;}
      var c=kind(q.app,e.studentId), alt=c.eintraege[e.id];
      if(!alt||String(e.updatedAt||'')>String(alt.updatedAt||'')){c.eintraege[e.id]=e;}
      quelle(c,q.herkunft);
    });
    (q.reunions||[]).forEach(function(r){
      if(!r||!r.goals||typeof r.goals!=='object'){return;}
      Object.keys(r.goals).forEach(function(sid){
        if(sid==='group'){return;}
        var g=zielListe(r.goals[sid]);if(!g.length){return;}
        var c=kind(q.app,sid), key=String(r.id||r.date), alt=c.ziele[key];
        if(!alt||String(r.updatedAt||'')>String(alt.updatedAt||'')){c.ziele[key]={id:key,date:String(r.date||'').slice(0,10),goals:g,updatedAt:String(r.updatedAt||'')};}
        quelle(c,q.herkunft);
      });
    });
    var b=(q.bubble&&typeof q.bubble==='object')?q.bubble:{};
    Object.keys(b).forEach(function(sid){
      var x=b[sid];if(!x||!((x.nodes||[]).length||(x.snapshots||[]).length||x.matrikel)){return;}
      var c=kind(q.app,sid);if(!c.bubble){c.bubble=kopie(x);delete c.bubble.id;quelle(c,q.herkunft);}
    });
  });
  return Object.keys(kinder).map(function(k){return kinder[k];})
    .filter(function(c){return Object.keys(c.eintraege).length||Object.keys(c.ziele).length||c.bubble;})
    .sort(function(a,b){return (a.name||'~').localeCompare(b.name||'~','de')||a.kb.localeCompare(b.kb);});
}

/* ---------- In Hub-Einträge umwandeln ---------- */
function eintragVon(app,e){
  var o={datum:String(e.date||'').slice(0,10), art:artVon(e.category), titel:e.category==='Team-Réunion'?'Réunion':String(e.category||''), text:String(e.text||''),
    thema:String(e.category||''), tags:Array.isArray(e.tags)?e.tags.slice():[], autorName:String(e.author||''),
    herkunft:{app:app,id:String(e.id),createdAt:e.createdAt||'',updatedAt:e.updatedAt||'',updatedBy:e.updatedBy||''}};
  if(e.report&&typeof e.report==='object'){o.bericht=kopie(e.report);}
  if(e.source&&typeof e.source==='object'){o.quelle=kopie(e.source);}
  var sl=e.sliders||{};if(Object.keys(sl).some(function(k){return sl[k]!=null;})){o.skalen=kopie(sl);}
  return o;
}
function zieleVon(app,c,z){
  return {datum:z.date, art:'vereinbarung', titel:'Wochenziele (Réunion)', text:z.goals.map(function(g){return (g.done?'✓ ':'○ ')+g.text;}).join('\n'), thema:'Wochenziel', tags:[], autorName:'',
    herkunft:{app:app,id:'reu:'+z.id+':'+c.sid,updatedAt:z.updatedAt||z.date}};
}
function paketVon(c){
  var l=Object.keys(c.eintraege).map(function(k){return eintragVon(c.app,c.eintraege[k]);})
    .concat(Object.keys(c.ziele).map(function(k){return zieleVon(c.app,c,c.ziele[k]);}));
  var p={app:c.app,kb:c.kb,sid:c.sid,eintraege:l};
  if(c.bubble){p.helfernetz={daten:kopie(c.bubble),quellen:c.quellen.slice()};}
  return p;
}

/* ---------- Was ist schon übernommen, welches Dossier gehört dazu? ---------- */
function stand(dossiers){
  var hk={}, zu={};
  (dossiers||[]).forEach(function(d){
    (d.eintraege||[]).forEach(function(e){if(e.herkunft&&e.herkunft.app){hk[e.herkunft.app+'|'+e.herkunft.id]={d:d,u:String(e.herkunft.updatedAt||'')};}});
    Object.keys(d.herkunft||{}).forEach(function(app){(d.herkunft[app]||[]).forEach(function(kb){zu[kb]=d;});});
    (d.screeningsAlt||[]).forEach(function(a){if(a.kb&&!zu[a.kb]){zu[a.kb]=d;}});
  });
  return {hk:hk,zu:zu};
}
function offenZaehlen(c,st){
  var n=0;
  Object.keys(c.eintraege).forEach(function(k){var e=c.eintraege[k], x=st.hk[c.app+'|'+e.id];if(!x||String(e.updatedAt||'')>x.u){n++;}});
  Object.keys(c.ziele).forEach(function(k){var z=c.ziele[k], x=st.hk[c.app+'|reu:'+z.id+':'+c.sid];if(!x||String(z.updatedAt||'')>x.u){n++;}});
  return n;
}
function liste(dossiers){
  return quellenLesen().then(function(q){
    var st=stand(dossiers), aus=lsJson(AUS,{});
    return sammeln(q).map(function(c){
      c.anzahl=Object.keys(c.eintraege).length;c.zielTage=Object.keys(c.ziele).length;
      c.offen=offenZaehlen(c,st);c.dossier=st.zu[c.kb]||null;c.ausgeblendet=!!aus[c.kb];
      c.fertig=!!c.dossier&&!c.offen;
      return c;
    });
  });
}
/* Zuordnung für das Klassenbuch ablegen: {app:{Kennung im Klassenbuch: Dossier-Id}} – dort „Dossier im Hub“ */
function zuordnungMerken(c,did){
  var z=lsJson(ZUORDNUNG,{});z[c.app]=z[c.app]||{};z[c.app][c.sid]=did;
  try{localStorage.setItem(ZUORDNUNG,JSON.stringify(z));}catch(e){}
}

/* ---------- Karte auf der Schülerseite ---------- */
function karte(el,dossiers){
  if(!bausteine()||!el){return;}
  karteEl=el;karteListe=dossiers||[];
  liste(karteListe).then(function(l){
    if(!document.body.contains(el)){return;}
    var offen=l.filter(function(c){return !c.fertig&&!c.ausgeblendet;});
    if(!l.length){el.innerHTML='';return;}
    el.innerHTML=offen.length?
      '<div class="ar-karte sc-kb-karte"><div class="sc-kb-text"><b>Schülerdaten aus Klassenbuch oder Journal</b><span>'+
        (offen.length===1?'Für ein Kind liegen':'Für '+offen.length+' Kinder liegen')+' Einträge, Wochenziele oder ein Helfernetz im Klassenbuch bzw. Journal, die noch nicht im Hub-Dossier stehen. Übernimm sie – dann steht alles an einem Ort, verschlüsselt und mit Rechten.</span></div>'+
        '<button class="btn primary" type="button" data-kbu="oeffnen">'+svg('check')+'Zuordnen und übernehmen</button></div>':
      '<p class="ar-klein kbu-link"><button class="ar-link" type="button" data-kbu="oeffnen">Daten aus Klassenbuch oder Journal übernehmen ('+l.length+')</button></p>';
  });
}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('[data-kbu="oeffnen"]');if(!t||!bausteine()){return;}
  dialogZeigen();
});

/* ---------- Dialog ---------- */
function dialogZeigen(){
  var alle=karteListe||[], neuOeffnen=false;
  return liste(alle).then(function(l){
    var offen=l.filter(function(c){return !c.fertig;}), me=K.ich();
    var ziel=alle.filter(function(d){return T.rechte(d).bearbeiten;}).sort(function(a,b){return H.schuelerName(a.person).localeCompare(H.schuelerName(b.person),'de');});
    function opt(d,sel){var p=d.person||{}, z=[p.klasse,H.team(d.stelle).name].filter(Boolean);return '<option value="'+esc(d.id)+'"'+(sel?' selected':'')+'>'+esc(H.schuelerName(p)+(z.length?' · '+z.join(' · '):'')+(d.status==='inaktiv'?' (inaktiv)':''))+'</option>';}
    var zeilen=l.map(function(c){
      var info=[c.app==='journal'?'Journal':'',c.level,c.aktiv?'':'ehemalig',c.anzahl?c.anzahl+(c.anzahl===1?' Eintrag':' Einträge'):'',c.zielTage?c.zielTage+'× Wochenziele':'',c.bubble?'Helfernetz':''].filter(Boolean);
      var wer='<span class="sc-kb-wer"><b>'+esc(c.name||'(ohne Namen)')+'</b><small>'+esc(info.join(' · '))+'</small>'+
        ((c.quellen.length>1||dateien.length)?'<small class="sc-kb-quelle">'+esc(c.quellen.join(', '))+'</small>':'')+'</span>';
      if(c.fertig){return '<div class="sc-kb-zeile fertig">'+wer+'<span class="sc-kb-ziel">'+svg('check')+'übernommen in '+esc(H.schuelerName(c.dossier.person))+'</span></div>';}
      var fest=c.dossier&&T.rechte(c.dossier).bearbeiten?c.dossier:null;
      var S0=S(), vor=(!fest&&S0)?S0.kbVorschlaege(c.name,ziel):[], wahl=fest?fest.id:((S0&&!fest)?S0.kbZuordnung(c.name,ziel):''), vid={};
      vor.forEach(function(v){vid[v.d.id]=1;});if(fest){vid[fest.id]=1;}
      return '<div class="sc-kb-zeile">'+wer+'<label class="ar-feld sc-kb-ziel"><span>'+(fest?'Dossier (schon zugeordnet – '+c.offen+' neu oder geändert)':'Dossier')+'</span><select name="kbu:'+esc(c.kb)+'">'+
        '<option value="">– nicht übernehmen –</option>'+
        (fest?'<optgroup label="Zugeordnet">'+opt(fest,true)+'</optgroup>':'')+
        (vor.length?'<optgroup label="Passt zum Namen">'+vor.map(function(v){return opt(v.d,v.d.id===wahl);}).join('')+'</optgroup>':'')+
        '<optgroup label="Neu">'+'<option value="neu">+ Neues Dossier anlegen („'+esc(c.name||'ohne Namen')+'“)</option></optgroup>'+
        '<optgroup label="Alle Dossiers">'+ziel.filter(function(d){return !vid[d.id];}).map(function(d){return opt(d,false);}).join('')+'</optgroup></select></label></div>';
    }).join('');
    var inhalt=(l.length?'<p>Gefunden: <b>'+l.length+'</b> '+(l.length===1?'Kind':'Kinder')+' mit Daten aus Klassenbuch oder Journal'+(offen.length<l.length?', davon '+(l.length-offen.length)+' schon vollständig übernommen':'')+'. Ordne jedes Kind seinem Dossier zu – oder lege ein neues an. Vorschläge nach dem Namen sind ausgewählt, bitte prüfen.</p>':
        '<p>In diesem Browser liegen keine Schülerdaten aus Klassenbuch oder Journal. Wähle die Team-Datei auf O:\\ (z. B. „klassebuch-team.json“), eine Tageskopie oder eine Sicherung aus.</p>')+
      '<p class="sc-klein">Übernommen werden Dossier-Einträge und Réunion-Beiträge (mit Kategorie, Schlagwörtern und Verfasser), Wochenziele, das Helfernetz, DS/PEI-Berichte und frühere Screenings. Was schon übernommen ist, wird nicht verdoppelt; geänderte Einträge werden nachgetragen. In Klassenbuch und Journal bleibt alles unverändert.</p>'+
      (ziel.length||!l.length?'':'<p class="sc-hinweis">'+svg('info')+'<span>Du hast noch in keinem Dossier Schreibrechte – du kannst aber neue Dossiers anlegen.</span></p>')+
      (l.length?'<div class="sc-kb-liste">'+zeilen+'</div>':'')+
      '<div class="sc-kb-datei"><label class="btn"><input type="file" accept=".json,application/json" multiple data-kbu-datei>'+svg('datei')+'Team-Datei, Tageskopie oder Sicherung hinzufügen</label>'+
        '<span>'+(dateien.length?'Schon gelesen: '+dateien.map(function(q){return esc(q.herkunft);}).join(', ')+'.':'Die Team-Datei enthält den gemeinsamen Stand aller Geräte; Tageskopien und Sicherungen ergänzen, was anderswo fehlt.')+'</span></div>'+
      (offen.length?'<label class="sc-kb-aus"><input type="checkbox" name="kbu-rest-aus"><span>Kinder, die ich nicht zuordne, auf der Schülerseite nicht mehr anzeigen</span></label>':'');
    return H.dialog('Aus Klassenbuch und Journal übernehmen',inhalt,
      offen.length?[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}]:[{text:'Schließen',wert:''}],
      {breit:true,
       nachAufbau:function(dlg){
         var inp=dlg.querySelector('[data-kbu-datei]');if(!inp){return;}
         inp.addEventListener('change',function(){
           if(!inp.files||!inp.files.length){return;}dlg.fehler('');
           Promise.all(Array.prototype.map.call(inp.files,function(f){return f.text().then(function(t){return dateiLesen(f.name,t);});}))
             .then(function(neu){neu.forEach(function(q){dateien=dateien.filter(function(x){return x.herkunft!==q.herkunft;}).concat([q]);});neuOeffnen=true;dlg.dispatchEvent(new Event('cancel'));},
                   function(e){inp.value='';dlg.fehler((e&&e.message)||String(e));});
         });
       },
       pruefen:function(w){var n=offen.filter(function(c){return w.werte['kbu:'+c.kb];}).length;return (n||w.werte['kbu-rest-aus'])?'':'Bitte mindestens einem Kind ein Dossier zuordnen – oder „Abbrechen“.';},
       ausfuehren:function(w){
         var los=offen.map(function(c){return {c:c,id:w.werte['kbu:'+c.kb]||''};});
         if(w.werte['kbu-rest-aus']){var aus=lsJson(AUS,{});los.filter(function(p){return !p.id;}).forEach(function(p){aus[p.c.kb]=1;});try{localStorage.setItem(AUS,JSON.stringify(aus));}catch(e){}}
         var mit=los.filter(function(p){return p.id;}), erg={kinder:0,neu:0,dossiersNeu:0,screenings:0,fehler:[]};
         var S0=S(), texte=(S0&&S0.kbTexte)?S0.kbTexte().catch(function(){return null;}):Promise.resolve(null);
         /* nacheinander: jedes Kind ein Schreibvorgang (plus ggf. Screening) */
         return texte.then(function(X){
           var scr=(S0&&X)?S0.kbListe(alle,X):[];
           return mit.reduce(function(p,m){return p.then(function(){
             var ziel0=m.id==='neu'?neuesDossier(m.c).then(function(d){erg.dossiersNeu++;alle.push(d);return d.id;}):Promise.resolve(m.id);
             return ziel0.then(function(did){
               var paket=paketVon(m.c);
               return T.ops.klassenbuchUebernehmen(did,paket).then(function(d){
                 erg.kinder++;erg.neu+=paket.eintraege.length;zuordnungMerken(m.c,did);
                 alle.forEach(function(x,i){if(x.id===d.id){alle[i]=d;}});
                 var y=scr.filter(function(s){return s.kb===m.c.kb&&!s.in;})[0];
                 if(!y){return;}
                 return T.ops.screeningAlt(did,S0.kbUmwandeln(y,X)).then(function(d2){erg.screenings++;alle.forEach(function(x,i){if(x.id===d2.id){alle[i]=d2;}});});
               });
             }).catch(function(e){erg.fehler.push((m.c.name||m.c.kb)+': '+((e&&e.message)||String(e)));});
           });},Promise.resolve());
         }).then(function(){return erg;});
       }}).then(function(r){
         if(neuOeffnen){return dialogZeigen();}
         if(!r.ergebnis){return;}
         var e=r.ergebnis, t=[];
         if(e.kinder){t.push(e.kinder+(e.kinder===1?' Kind':' Kinder')+' übernommen');}
         if(e.dossiersNeu){t.push(e.dossiersNeu+(e.dossiersNeu===1?' Dossier':' Dossiers')+' neu angelegt');}
         if(e.screenings){t.push(e.screenings+' frühere'+(e.screenings===1?'s Screening':' Screenings'));}
         if(e.fehler.length){t.push(e.fehler.length+' nicht übernommen – '+e.fehler.join('; '));}
         H.toast(t.length?t.join(' · '):'Ausgeblendet');
         if(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.neuLaden){window.CDSE_ARBEIT.neuLaden();}
         else if(karteEl&&document.body.contains(karteEl)){karte(karteEl,alle);}
       });
  });
}
/* Neues Dossier aus dem Klassenbuch-Eintrag: Vorname, Rest als Nachname (z. B. „Alex P.“) */
function neuesDossier(c){
  var teile=String(c.name||'').trim().split(/\s+/), me=K.ich(), stellen=(window.CDSE_TEAMS||[]).filter(function(t){return t.stelle!==false;});
  var stelle=stellen.some(function(t){return t.id===(me&&me.team);})?me.team:'diagnostique';
  return T.neuesDossier({vorname:teile[0]||'(ohne Namen)',nachname:teile.slice(1).join(' ')},{stelle:stelle}).then(function(d){
    if(c.aktiv===false){return T.ops.status(d.id,'inaktiv','ehemalig laut '+appName(c.app)).catch(function(){return d;});}
    return d;
  });
}

return {karte:karte, dialog:dialogZeigen,
  /* für Tests */ liste:liste, dateiLesen:dateiLesen, paketVon:paketVon, sammeln:sammeln, dbLesen:dbLesen};
})();
