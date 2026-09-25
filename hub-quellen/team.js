/* =====================================================================
   CDSE Hub — Gemeinsamer Bereich: Schülerdossiers und Einsatzpläne
   ---------------------------------------------------------------------
   Schülerdaten sind mit einem gemeinsamen Schlüssel (AES-GCM 256)
   verschlüsselt. Diesen Schlüssel bekommt jedes freigeschaltete Konto -
   verschlossen mit seinem öffentlichen Schlüssel (RSA-OAEP 3072) in
   gemeinsam/schluessel.json. Wer (noch) nicht freigeschaltet ist, kann
   keine Schülerdaten lesen. Freischalten dürfen die Verwaltung (Admin)
   und die Responsables.

   gemeinsam/schluessel.json    Schlüsselring (je Konto der verschlossene Schlüssel)
   gemeinsam/mitglieder.cdse    Rollen: admin, responsable, mitarbeiter (verschlüsselt)
   gemeinsam/schueler/<id>.cdse ein Dossier pro Schüler (verschlüsselt)
   gemeinsam/einsatz/<konto>.cdse  Einsatzplan einer Person - nur lesbar für
                                sie selbst, ihre Responsable und die Verwaltung

   Rechte (Dossiers): Alle Freigeschalteten lesen. Bearbeiten dürfen die
   Verwaltung, die Responsables, die Fallverantwortlichen und alle, denen
   ein Recht gegeben wurde. Jede Änderung steht im Verlauf des Dossiers.
   Ehrliche Grenze: Ohne Server sind die Rechte eine Regel der App (wie die
   Teams). Sie verhindern versehentliche Änderungen und machen alles
   nachvollziehbar; gegen absichtliches Manipulieren von Dateien schützen
   nur die Ordnerrechte auf O:\ (IT).
   ===================================================================== */
window.CDSE_TEAM=(function(){
'use strict';
var K=window.CDSE_KONTO;
var P_BEREICH=['gemeinsam'], P_SCHUELER=['gemeinsam','schueler'], P_EINSATZ=['gemeinsam','einsatz'];
var RSA={name:'RSA-OAEP',hash:'SHA-256'};
var ALPHA='0123456789abcdefghjkmnpqrstvwxyz';
var te=new TextEncoder(), td=new TextDecoder();
var zustand={art:'unbekannt'};       /* unbekannt | kein-bereich | wartet | bereit | fehler */
var ring=null, orgKey=null, mitgl=null, cache={}, cacheZeit=0;

/* ---------- Hilfen ---------- */
function fehler(t){return new Error(t);}
function b64(buf){var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),s='';for(var i=0;i<b.length;i+=32768){s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));}return btoa(s);}
function unb64(s){var t=atob(s),b=new Uint8Array(t.length);for(var i=0;i<t.length;i++){b[i]=t.charCodeAt(i);}return b;}
function rnd(n){var b=new Uint8Array(n);crypto.getRandomValues(b);return b;}
function neueId(n){var b=rnd(n||12),s='';for(var i=0;i<b.length;i++){s+=ALPHA.charAt(b[i]&31);}return s;}
function jetzt(){return new Date().toISOString();}
function ich(){return K.ich();}
function gzip(bytes){
  if(typeof CompressionStream==='undefined'){return Promise.resolve(null);}
  return new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function(ab){return new Uint8Array(ab);});
}
function gunzip(bytes){return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer().then(function(ab){return new Uint8Array(ab);});}
function aesVersiegeln(key,obj,kopf){
  var roh=te.encode(JSON.stringify(obj)), iv=rnd(12);
  return gzip(roh).then(function(z){
    return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,z||roh).then(function(ct){
      var box={};Object.keys(kopf||{}).forEach(function(k){box[k]=kopf[k];});
      box.gzip=!!z;box.iv=b64(iv);box.ct=b64(ct);box.gespeichert=jetzt();
      return JSON.stringify(box);
    });
  });
}
function aesOeffnen(key,box){
  return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},key,unb64(box.ct))
    .then(function(ab){var b=new Uint8Array(ab);return box.gzip?gunzip(b):b;})
    .then(function(b){return JSON.parse(td.decode(b));});
}
function aesKey(roh,export_){return crypto.subtle.importKey('raw',roh,'AES-GCM',!!export_,['encrypt','decrypt']);}
/* Kleiner Speicher im Browser (dieselbe Datenbank wie das Konto-Modul) */
function idb(){return new Promise(function(res,rej){var r=indexedDB.open('cdse-hub',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
function idbGet(k){return idb().then(function(db){return new Promise(function(res){var q=db.transaction('kv','readonly').objectStore('kv').get(k);q.onsuccess=function(){res(q.result);};q.onerror=function(){res(undefined);};});}).catch(function(){return undefined;});}
function idbSet(k,v){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});}).catch(function(){});}
function json(t){if(!t){return null;}try{return JSON.parse(t);}catch(e){return null;}}
/* Mehrere Dateien gleichzeitig, aber nicht zu viele (Netzlaufwerk) */
function parallel(liste,n,fn){
  var i=0, erg=new Array(liste.length);
  function weiter(){if(i>=liste.length){return Promise.resolve();}var j=i++;return Promise.resolve(fn(liste[j],j)).then(function(r){erg[j]=r;},function(e){erg[j]={fehler:e};}).then(weiter);}
  var w=[];for(var k=0;k<Math.min(n,liste.length);k++){w.push(weiter());}
  return Promise.all(w).then(function(){return erg;});
}

/* =====================================================================
   Bereich: Schlüsselring, Freischalten, Rollen
   ===================================================================== */
function ringLesen(){return K.speicher.lesen(P_BEREICH,'schluessel.json').then(json);}
function ringSchreiben(r){return K.speicher.schreiben(P_BEREICH,'schluessel.json',JSON.stringify(r,null,1));}
function mitgliederLesen(){
  return K.speicher.lesen(P_BEREICH,'mitglieder.cdse').then(function(t){var b=json(t);return b?aesOeffnen(orgKey,b):{v:1,rev:0,mitglieder:{},verlauf:[]};});
}
function mitgliederSchreiben(m){return aesVersiegeln(orgKey,m,{format:'cdse-mitglieder',version:1}).then(function(t){return K.speicher.schreiben(P_BEREICH,'mitglieder.cdse',t);});}
function mitgliederAendern(fn,text){
  return mitgliederLesen().then(function(m){
    fn(m);m.rev=(m.rev|0)+1;
    m.verlauf=(m.verlauf||[]).concat([{z:jetzt(),v:ich().id,t:text}]).slice(-300);
    return mitgliederSchreiben(m).then(function(){mitgl=m;return m;});
  });
}
/* Beim Öffnen: Wo stehe ich? Liefert den Zustand. */
function laden(opt){
  opt=opt||{};
  var me=ich();
  if(!me){zustand={art:'unbekannt'};return Promise.resolve(zustand);}
  return ringLesen().then(function(r){
    ring=r;
    if(!r||r.format!=='cdse-schluesselring'){zustand={art:'kein-bereich'};return zustand;}
    if(!r.fuer||!r.fuer[me.id]){orgKey=null;zustand={art:'wartet'};return zustand;}
    return schluesselHolen(me,opt.leise).then(function(){return mitgliederLesen();}).then(function(m){mitgl=m;zustand={art:'bereit'};rolleFuerApps();return zustand;});
  }).catch(function(e){if(e&&e.abgebrochen){zustand={art:'gesperrt'};return zustand;}zustand={art:'fehler',text:(e&&e.message)||String(e)};return zustand;});
}
/* Den gemeinsamen Schlüssel holen: aus der Sitzung oder mit dem privaten Schlüssel */
function schluesselHolen(me,leise){
  if(orgKey){return Promise.resolve(orgKey);}
  return idbGet('team-schluessel').then(function(x){
    if(x&&x.key&&x.sid===K.sitzungsId()&&x.konto===me.id&&x.gen===(ring.gen|0)){orgKey=x.key;return orgKey;}
    /* im Hintergrund nie nach dem Passwort fragen */
    if(leise&&!K.privatDa()){var e=fehler('Passwort nötig');e.abgebrochen=true;throw e;}
    return K.privat('Für die Schülerdaten').then(function(priv){
      return crypto.subtle.decrypt(RSA,priv,unb64(ring.fuer[me.id].k)).then(function(raw){
        return aesKey(new Uint8Array(raw),false).then(function(k){
          orgKey=k;
          return idbSet('team-schluessel',{sid:K.sitzungsId(),konto:me.id,gen:ring.gen|0,key:k}).then(function(){return k;});
        });
      });
    });
  });
}
/* Die eigene Rolle für die Apps ablegen (z. B. dürfen Responsables in der
   Toolbox fremdes Team-Material bearbeiten). Wird beim Abmelden entfernt. */
function rolleFuerApps(){
  try{
    var me=ich();if(!me){return;}
    var alt={};try{alt=JSON.parse(localStorage.getItem('cdse-nutzer')||'{}')||{};}catch(e){alt={};}
    localStorage.setItem('cdse-nutzer',JSON.stringify({id:me.id,name:me.name||alt.name||'',team:me.team||alt.team||'',rolle:rolle(me.id)||'mitarbeiter',stand:jetzt()}));
  }catch(e){}
}
/* Beim Abmelden/Sperren alles vergessen */
function vergessen(){ring=null;orgKey=null;mitgl=null;cache={};cacheZeit=0;zustand={art:'unbekannt'};return idbSet('team-schluessel',null);}
/* Erste Einrichtung: wer das macht, wird Verwaltung (Admin) */
function einrichten(){
  var me=ich();
  return ringLesen().then(function(r){
    if(r&&r.format==='cdse-schluesselring'){throw fehler('Der Schülerbereich ist schon eingerichtet');}
    var raw=rnd(32);
    return K.kontoPub(me.id).then(function(pub){return crypto.subtle.encrypt(RSA,pub,raw);}).then(function(w){
      ring={format:'cdse-schluesselring',version:1,gen:1,erstellt:jetzt(),erstelltVon:me.id,fuer:{}};
      ring.fuer[me.id]={k:b64(w),von:me.id,am:jetzt()};
      return aesKey(raw,false);
    }).then(function(k){
      raw.fill(0);orgKey=k;
      var m={v:1,rev:1,mitglieder:{},verlauf:[{z:jetzt(),v:me.id,t:'Schülerbereich eingerichtet'}]};
      m.mitglieder[me.id]={rolle:'admin',seit:jetzt(),von:me.id};
      return ringSchreiben(ring).then(function(){return mitgliederSchreiben(m);}).then(function(){
        mitgl=m;zustand={art:'bereit'};
        return idbSet('team-schluessel',{sid:K.sitzungsId(),konto:me.id,gen:1,key:k});
      });
    });
  });
}
function rolle(id){
  if(!ring||!ring.fuer||!ring.fuer[id]){return null;}
  var m=mitgl&&mitgl.mitglieder&&mitgl.mitglieder[id];
  return (m&&m.rolle)||'mitarbeiter';
}
function istAdmin(id){return rolle(id||ich().id)==='admin';}
function istResponsable(id){var r=rolle(id||ich().id);return r==='responsable'||r==='admin';}
function darfFreischalten(){return zustand.art==='bereit'&&istResponsable();}
/* Konten, die auf Freischaltung warten */
function wartende(){
  if(!ring){return [];}
  return K.konten().filter(function(k){return k.hatSchluessel&&!(ring.fuer&&ring.fuer[k.id]);});
}
function freischalten(id){
  if(!darfFreischalten()){return Promise.reject(fehler('Freischalten dürfen die Verwaltung und die Responsables'));}
  var me=ich();
  return K.privat('Zum Freischalten').then(function(priv){
    return ringLesen().then(function(r){
      ring=r;
      if(r.fuer[id]){return;}
      return crypto.subtle.decrypt(RSA,priv,unb64(r.fuer[me.id].k)).then(function(raw){
        return K.kontoPub(id).then(function(pub){return crypto.subtle.encrypt(RSA,pub,raw);}).then(function(w){
          new Uint8Array(raw).fill(0);
          r.fuer[id]={k:b64(w),von:me.id,am:jetzt()};
          return ringSchreiben(r);
        });
      });
    });
  }).then(function(){
    var k=K.konten().filter(function(x){return x.id===id;})[0];
    return mitgliederAendern(function(m){if(!m.mitglieder[id]){m.mitglieder[id]={rolle:'mitarbeiter',seit:jetzt(),von:me.id};}},'Freigeschaltet: '+(k?k.name:id));
  });
}
/* Zugang entziehen (nur Verwaltung). Hinweis: Wer den Schlüssel schon hatte,
   konnte Daten bereits sehen - das lässt sich nicht rückgängig machen. */
function entziehen(id){
  if(!istAdmin()){return Promise.reject(fehler('Nur die Verwaltung kann den Zugang entziehen'));}
  if(id===ich().id){return Promise.reject(fehler('Den eigenen Zugang kannst du nicht entziehen'));}
  return ringLesen().then(function(r){ring=r;delete r.fuer[id];return ringSchreiben(r);}).then(function(){
    var k=K.konten().filter(function(x){return x.id===id;})[0];
    return mitgliederAendern(function(m){delete m.mitglieder[id];},'Zugang entzogen: '+(k?k.name:id));
  });
}
function rolleSetzen(id,neu){
  if(!istAdmin()){return Promise.reject(fehler('Rollen vergibt die Verwaltung'));}
  if(['admin','responsable','mitarbeiter'].indexOf(neu)<0){return Promise.reject(fehler('Unbekannte Rolle'));}
  if(id===ich().id&&neu!=='admin'){
    var admins=Object.keys((mitgl&&mitgl.mitglieder)||{}).filter(function(x){return mitgl.mitglieder[x].rolle==='admin';});
    if(admins.length<2){return Promise.reject(fehler('Es muss mindestens eine Verwaltung (Admin) geben'));}
  }
  var k=K.konten().filter(function(x){return x.id===id;})[0];
  var namen={admin:'Verwaltung',responsable:'Responsable',mitarbeiter:'Mitarbeiter/in'};
  return mitgliederAendern(function(m){var e=m.mitglieder[id]||(m.mitglieder[id]={seit:jetzt(),von:ich().id});e.rolle=neu;e.geaendert=jetzt();},'Rolle von '+(k?k.name:id)+': '+namen[neu]);
}
function mitglieder(){
  var m=(mitgl&&mitgl.mitglieder)||{};
  return K.konten().map(function(k){var e=m[k.id];k.rolle=rolle(k.id);k.freigeschaltet=!!(ring&&ring.fuer&&ring.fuer[k.id]);k.seit=e&&e.seit;return k;});
}
function bereichsVerlauf(){return ((mitgl&&mitgl.verlauf)||[]).slice().reverse();}

/* =====================================================================
   Schülerdossiers
   ===================================================================== */
function istBereit(){if(zustand.art!=='bereit'||!orgKey){throw fehler('Der Schülerbereich ist nicht geöffnet');}}
function dateiName(id){return id+'.cdse';}
function dossierLesen(id){
  return K.speicher.lesen(P_SCHUELER,dateiName(id)).then(function(t){
    var b=json(t);if(!b){throw fehler('Dossier nicht gefunden');}
    if(b.format!=='cdse-dossier'){throw fehler('Unbekanntes Dateiformat');}
    return aesOeffnen(orgKey,b);
  });
}
function dossierSchreiben(d){return aesVersiegeln(orgKey,d,{format:'cdse-dossier',version:1,id:d.id,gen:ring.gen|0}).then(function(t){return K.speicher.schreiben(P_SCHUELER,dateiName(d.id),t);});}
/* Alle Dossiers laden (für die Liste). Mit Zwischenspeicher für die Sitzung. */
function alleDossiers(neu){
  istBereit();
  if(!neu&&cacheZeit&&Date.now()-cacheZeit<60000){return Promise.resolve(Object.keys(cache).map(function(k){return cache[k];}));}
  return K.speicher.liste(P_SCHUELER).then(function(namen){
    namen=namen.filter(function(n){return /^[0-9a-z]+\.cdse$/.test(n);});
    return parallel(namen,6,function(n){return dossierLesen(n.replace(/\.cdse$/,''));});
  }).then(function(l){
    var neuCache={}, kaputt=0;
    l.forEach(function(d){if(d&&d.id&&!d.fehler){neuCache[d.id]=d;}else{kaputt++;}});
    cache=neuCache;cacheZeit=Date.now();
    var liste=Object.keys(cache).map(function(k){return cache[k];});
    liste.kaputt=kaputt;
    return liste;
  });
}
function dossier(id,neu){
  istBereit();
  if(!neu&&cache[id]){return Promise.resolve(cache[id]);}
  return dossierLesen(id).then(function(d){cache[id]=d;return d;});
}
/* Rechte an einem Dossier */
function rechte(d,id){
  id=id||ich().id;
  var r=rolle(id), verantwortlich=(d.verantwortlich||[]).indexOf(id)>=0, gegeben=!!(d.rechte&&d.rechte[id]);
  var leitend=r==='admin'||r==='responsable'||verantwortlich;
  return {lesen:!!r, bearbeiten:leitend||gegeben, weitergeben:leitend, rechteVergeben:leitend, status:leitend, loeschen:r==='admin',
          grund:r==='admin'?'Verwaltung':(r==='responsable'?'Responsable':(verantwortlich?'Fallverantwortlich':(gegeben?'Schreibrecht erhalten':'nur lesen')))};
}
function neuesDossier(person,opt){
  istBereit();opt=opt||{};
  var me=ich(), id=neueId(12), t=jetzt();
  var stelle=opt.stelle||((window.CDSE_TEAMS||[]).some(function(x){return x.id===me.team;})?me.team:'diagnostique');
  var d={v:1,id:id,rev:1,erstellt:t,erstelltVon:me.id,geaendert:t,geaendertVon:me.id,
    person:person||{},status:'aktiv',statusSeit:t.slice(0,10),stelle:stelle,stelleSeit:t.slice(0,10),
    verantwortlich:[me.id],rechte:{},profil:null,einschaetzungen:[],eintraege:[],
    verlauf:[{z:t,v:me.id,a:'angelegt',t:opt.fiche?'Dossier angelegt (aus der Fiche de renseignement)':'Dossier angelegt'}]};
  if(opt.fiche){d.fiche=opt.fiche;}
  return dossierSchreiben(d).then(function(){cache[id]=d;return d;});
}
/* Ändern: immer auf dem neuesten Stand der Datei, Rechte prüfen, Verlauf schreiben.
   fn(d, recht) ändert d und liefert den Text für den Verlauf (oder wirft einen Fehler). */
function aendern(id,fn,art){
  istBereit();
  var me=ich();
  return dossierLesen(id).then(function(d){
    var r=rechte(d,me.id);
    var text=fn(d,r);
    if(text===false){return d;}
    d.rev=(d.rev|0)+1;d.geaendert=jetzt();d.geaendertVon=me.id;
    d.verlauf=(d.verlauf||[]).concat([{z:d.geaendert,v:me.id,a:art||'geaendert',t:String(text||'Geändert')}]);
    /* kurz vor dem Schreiben prüfen, ob inzwischen jemand anderes gespeichert hat */
    return dossierLesen(id).then(function(frisch){
      if((frisch.rev|0)!==(d.rev|0)-1){var e=fehler('Das Dossier wurde gerade von jemand anderem geändert. Bitte noch einmal versuchen.');e.konflikt=true;throw e;}
      return dossierSchreiben(d);
    }).then(function(){cache[id]=d;return d;});
  });
}
function brauche(r,was){if(!r[was]){throw fehler(was==='bearbeiten'?'Du hast für dieses Dossier nur Leserechte. Bitte die Fallverantwortlichen um ein Schreibrecht.':'Dafür fehlt dir das Recht. Das dürfen die Fallverantwortlichen, die Responsables und die Verwaltung.');}}
function name(id){var k=K.konten().filter(function(x){return x.id===id;})[0];return k?k.name:'(gelöschtes Konto)';}
function teamName(id){return K.team(id).name;}
var ops={
  person:function(id,werte){return aendern(id,function(d,r){brauche(r,'bearbeiten');d.person=Object.assign({},d.person,werte);return 'Stammdaten geändert';},'person');},
  status:function(id,status,grund,datum){return aendern(id,function(d,r){
    brauche(r,'status');if(d.status===status){return false;}
    d.status=status;d.statusGrund=grund||'';d.statusSeit=datum||jetzt().slice(0,10);
    return status==='aktiv'?'Wieder aktiv':'Inaktiv gesetzt'+(grund?' ('+grund+')':'');
  },'status');},
  weitergeben:function(id,opt){return aendern(id,function(d,r){
    brauche(r,'weitergeben');
    var alt=d.stelle, altVer=(d.verantwortlich||[]).slice();
    d.stelle=opt.stelle;d.stelleSeit=jetzt().slice(0,10);
    if(opt.verantwortlich){d.verantwortlich=[opt.verantwortlich];}
    if(opt.bisherigeBehalten){altVer.forEach(function(x){if((d.verantwortlich||[]).indexOf(x)<0){d.rechte[x]={von:ich().id,am:jetzt()};}});}
    d.weitergaben=(d.weitergaben||[]).concat([{z:jetzt(),von:alt,an:opt.stelle,durch:ich().id,verantwortlich:opt.verantwortlich||'',notiz:opt.notiz||''}]);
    return 'Weitergegeben: '+teamName(alt)+' → '+teamName(opt.stelle)+(opt.verantwortlich?' (fallverantwortlich: '+name(opt.verantwortlich)+')':'')+(opt.notiz?' – '+opt.notiz:'');
  },'weitergabe');},
  rechtGeben:function(id,konto){return aendern(id,function(d,r){brauche(r,'rechteVergeben');if(d.rechte[konto]){return false;}d.rechte[konto]={von:ich().id,am:jetzt()};return 'Schreibrecht für '+name(konto);},'recht');},
  rechtNehmen:function(id,konto){return aendern(id,function(d,r){brauche(r,'rechteVergeben');if(!d.rechte[konto]){return false;}delete d.rechte[konto];return 'Schreibrecht entzogen: '+name(konto);},'recht');},
  verantwortlich:function(id,liste){return aendern(id,function(d,r){brauche(r,'weitergeben');if(!liste.length){throw fehler('Mindestens eine Person muss fallverantwortlich sein');}d.verantwortlich=liste.slice();return 'Fallverantwortlich: '+liste.map(name).join(', ');},'recht');},
  eintrag:function(id,e){return aendern(id,function(d,r){
    brauche(r,'bearbeiten');
    var neu={id:neueId(8),datum:e.datum||jetzt().slice(0,10),art:e.art||'notiz',titel:e.titel||'',text:e.text||'',von:ich().id,z:jetzt()};
    if(e.ziel){neu.ziel=String(e.ziel);}   /* Bezug zu einem ELDiB-Förderziel, z. B. "V-14" */
    d.eintraege=(d.eintraege||[]).concat([neu]);
    return 'Eintrag: '+(e.titel||e.art||'Notiz');
  },'eintrag');},
  eintragAendern:function(id,eid,werte){return aendern(id,function(d,r){
    brauche(r,'bearbeiten');
    var e=(d.eintraege||[]).filter(function(x){return x.id===eid;})[0];if(!e){throw fehler('Eintrag nicht gefunden');}
    if(e.von!==ich().id&&!r.weitergeben){throw fehler('Fremde Einträge ändern dürfen nur die Fallverantwortlichen, Responsables und die Verwaltung');}
    ['datum','art','titel','text'].forEach(function(k){if(werte[k]!=null){e[k]=werte[k];}});
    if(werte.ziel!=null){if(werte.ziel){e.ziel=String(werte.ziel);}else{delete e.ziel;}}
    e.geaendert=jetzt();e.geaendertVon=ich().id;
    return 'Eintrag geändert: '+(e.titel||e.art);
  },'eintrag');},
  eintragLoeschen:function(id,eid){return aendern(id,function(d,r){
    brauche(r,'bearbeiten');
    var e=(d.eintraege||[]).filter(function(x){return x.id===eid;})[0];if(!e){return false;}
    if(e.von!==ich().id&&!r.weitergeben){throw fehler('Fremde Einträge löschen dürfen nur die Fallverantwortlichen, Responsables und die Verwaltung');}
    d.eintraege=d.eintraege.filter(function(x){return x.id!==eid;});
    return 'Eintrag gelöscht: '+(e.titel||e.art)+' vom '+e.datum;
  },'eintrag');},
  /* Fiche de renseignement: werte = {person:{…}, fiche:{Abschnitt: vollständiger Inhalt}} */
  fiche:function(id,werte,text){return aendern(id,function(d,r){
    brauche(r,'bearbeiten');
    if(werte.person){d.person=Object.assign({},d.person,werte.person);}
    if(werte.fiche){d.fiche=Object.assign({},d.fiche||{},werte.fiche);}
    return text||'Fiche de renseignement geändert';
  },'fiche');},
  /* Angaben nur für die Datenbank (Statistik): nur Responsables und Verwaltung */
  datenbank:function(id,werte,text){return aendern(id,function(d){
    if(!istResponsable()){throw fehler('Die Datenbank-Angaben bearbeiten nur Responsables und die Verwaltung.');}
    d.db=Object.assign({},d.db||{},werte);
    return text||'Datenbank-Angaben geändert';
  },'datenbank');},
  profil:function(id,profil,text){return aendern(id,function(d,r){brauche(r,'bearbeiten');d.profil=profil;return text||'Profil übernommen';},'profil');},
  einschaetzung:function(id,e){return aendern(id,function(d,r){
    brauche(r,'bearbeiten');
    d.einschaetzungen=(d.einschaetzungen||[]).concat([{id:neueId(8),datum:e.datum||jetzt().slice(0,10),bereich:e.bereich||'schule',bewertungen:e.bewertungen||{},notiz:e.notiz||'',von:ich().id,z:jetzt()}]);
    return 'Neue Einschätzung ('+Object.keys(e.bewertungen||{}).length+' Aussagen)';
  },'einschaetzung');},
  loeschen:function(id){
    istBereit();
    return dossierLesen(id).then(function(d){
      if(!rechte(d).loeschen){throw fehler('Löschen darf nur die Verwaltung');}
      return K.speicher.loeschen(P_SCHUELER,dateiName(id)).then(function(){delete cache[id];
        return mitgliederAendern(function(){},'Dossier gelöscht: '+((d.person&&(d.person.nachname+', '+d.person.vorname))||id));});
    });
  }
};

/* =====================================================================
   Einsatzplan: jede Person verschlüsselt ihren Plan für sich, ihre
   Responsable und die Verwaltung (je ein verschlossener Schlüssel)
   ===================================================================== */
function planDatei(id){return id+'.cdse';}
function empfaengerFuer(me){
  var l=[me.id];
  if(me.responsable&&l.indexOf(me.responsable)<0){l.push(me.responsable);}
  var m=(mitgl&&mitgl.mitglieder)||{};
  Object.keys(m).forEach(function(id){if(m[id].rolle==='admin'&&l.indexOf(id)<0){l.push(id);}});
  return l.filter(function(id){return K.konten().some(function(k){return k.id===id&&k.hatSchluessel;});});
}
function planSpeichern(plan){
  var me=ich(), empf=empfaengerFuer(me), raw=rnd(32);
  plan.konto=me.id;plan.geaendert=jetzt();
  return aesKey(raw,false).then(function(key){
    return Promise.all(empf.map(function(id){return K.kontoPub(id).then(function(pub){return crypto.subtle.encrypt(RSA,pub,raw);}).then(function(w){return [id,b64(w)];},function(){return null;});}))
      .then(function(ws){
        raw.fill(0);
        var fuer={};ws.filter(Boolean).forEach(function(x){fuer[x[0]]=x[1];});
        return aesVersiegeln(key,plan,{format:'cdse-einsatz',version:1,konto:me.id,fuer:fuer});
      });
  }).then(function(t){return K.speicher.schreiben(P_EINSATZ,planDatei(me.id),t);}).then(function(){return {plan:plan,empfaenger:empf};});
}
function planOeffnen(box,priv){
  var me=ich();
  if(!box||box.format!=='cdse-einsatz'||!box.fuer||!box.fuer[me.id]){return Promise.resolve(null);}
  return crypto.subtle.decrypt(RSA,priv,unb64(box.fuer[me.id])).then(function(raw){return aesKey(new Uint8Array(raw),false);}).then(function(key){return aesOeffnen(key,box);});
}
function meinPlan(){
  var me=ich();
  return K.speicher.lesen(P_EINSATZ,planDatei(me.id)).then(function(t){
    var b=json(t);if(!b){return null;}
    return K.privat('Für deinen Einsatzplan').then(function(priv){return planOeffnen(b,priv);}).then(function(p){
      if(p){p.__empfaenger=Object.keys(b.fuer||{});}
      return p;
    });
  });
}
/* Alle Pläne, die ich lesen darf (Responsable: mein Team, Verwaltung: alle, die für mich verschlüsselt haben) */
function lesbarePlaene(){
  var me=ich();
  return K.speicher.liste(P_EINSATZ).then(function(namen){
    namen=namen.filter(function(n){return /\.cdse$/.test(n);});
    return K.privat('Für die Einsatzpläne deines Teams').then(function(priv){
      return parallel(namen,6,function(n){
        return K.speicher.lesen(P_EINSATZ,n).then(function(t){var b=json(t);if(!b||!b.fuer||!b.fuer[me.id]){return null;}
          return planOeffnen(b,priv).then(function(p){if(p){p.konto=b.konto;p.__gespeichert=b.gespeichert;}return p;});});
      });
    });
  }).then(function(l){return l.filter(function(p){return p&&!p.fehler&&p.konto;});});
}

return {
  zustand:function(){return zustand;},
  laden:laden, einrichten:einrichten, vergessen:vergessen,
  rolle:rolle, istAdmin:istAdmin, istResponsable:istResponsable, darfFreischalten:darfFreischalten,
  /* Eintrag im gemeinsamen, verschlüsselten Protokoll der Verwaltung (z. B. Datenbank-Export) */
  protokollieren:function(text){return mitgliederAendern(function(){},String(text||'').slice(0,300));},
  wartende:wartende, freischalten:freischalten, entziehen:entziehen, rolleSetzen:rolleSetzen,
  mitglieder:mitglieder, bereichsVerlauf:bereichsVerlauf,
  alleDossiers:alleDossiers, dossier:dossier, neuesDossier:neuesDossier, rechte:rechte, ops:ops,
  planSpeichern:planSpeichern, meinPlan:meinPlan, lesbarePlaene:lesbarePlaene, empfaengerFuer:function(){return empfaengerFuer(ich());},
  name:name, neueId:neueId
};
})();
