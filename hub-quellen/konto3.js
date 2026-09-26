/* =====================================================================
   CDSE Hub — Konten, Anmeldung und Daten-Tresor
   ---------------------------------------------------------------------
   Konten liegen als Dateien im Hub-Ordner auf dem Server (konten/).
   Das Passwort schützt einen zufälligen Datenschlüssel: AES-GCM 256,
   Schlüsselableitung PBKDF2-SHA256 mit 600 000 Durchläufen und zufälligem
   Salz (Empfehlung OWASP 2023). Ein zweiter "Umschlag" mit dem
   Wiederherstellungs-Code erlaubt ein neues Passwort, ohne dass irgendwer
   sonst den Schlüssel kennt. Klartext im Konto: nur Name, Team und
   Zeitstempel, Funktion und Responsable - für die Auswahl "Wer bist du?"
   und damit Responsables sehen, wer zu ihnen gehört.

   Daten-Tresor: Die Daten der Apps (localStorage und IndexedDB dieses
   Browsers) werden pro Person verschlüsselt im Hub-Ordner gesichert
   (daten/<konto>/aktuell.cdse), beim Anmelden geladen und beim Abmelden
   vom PC entfernt. Gesichert wird mit dem öffentlichen Schlüssel des
   Kontos (RSA-OAEP 3072) - das geht ohne Passwort, z. B. wenn sich jemand
   anderes am selben PC anmeldet. Öffnen kann den Tresor nur, wer das
   Passwort oder den Code kennt. Datei- und Ordnerzugänge der Apps (etwa
   die Team-Datei des Klassenbuchs) bleiben auf dem PC, getrennt pro Konto.

   Ehrliche Grenzen: Ohne Anmeldeserver ist die Team-Zuordnung eine
   Anzeige-Regel, keine Sperre - echte Sperren setzt die IT über die
   Ordnerrechte. Wer Schreibrechte im Hub-Ordner hat, kann Dateien löschen
   oder ersetzen; fremde Daten lesen kann er nicht.
   ===================================================================== */
window.CDSE_KONTO=(function(){
'use strict';
var ITER=600000, AUTO_MS=60000;
var SITZUNG='cdse_hub_sitzung';                                                          /* sessionStorage */
var ZULETZT='cdse_hub_zuletzt', MARKE='cdse_hub_daten', GEPRUEFT='cdse_hub_geprueft';    /* localStorage des Hubs */
var IDB_NAME='cdse-hub', IDB_STORE='kv', ORDNER_KEY='hub-ordner', FORMAT_DATEN='cdse-daten';
var S=window.CDSE_HUB||{};
var SPERRE_MS=(S.sperreNachMinuten>0?S.sperreNachMinuten:60)*60000;
var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id&&t.name;});
var ordner=null, konten=[], sitzung=null, cb={}, fehlversuche={}, letzteAktivitaet=Date.now(), gesperrt=false;
/* Von der Verwaltung vorbereitete Konten (Startcode): Name, Team, Funktion, Responsable – noch ohne Schlüssel */
var vorbereitete=[];
var tresor={id:null,pub:null,priv:null};      /* Schlüssel der angemeldeten Person - nur im Arbeitsspeicher */
var aktStatus={art:'aus'}, letzteSicherung=0;
var $=function(id){return document.getElementById(id);};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ic(n){return '<svg class="ic" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
function team(id){for(var i=0;i<TEAMS.length;i++){if(TEAMS[i].id===id){return TEAMS[i];}}return {id:id,name:id||'—',farbe:'#586277'};}
function initialen(n){var p=String(n||'').trim().split(/\s+/).filter(Boolean);if(!p.length){return '?';}return (p[0].charAt(0)+(p.length>1?p[p.length-1].charAt(0):'')).toUpperCase();}
function ava(k){return '<span class="ava" style="--tc:'+esc(team(k.team).farbe)+'">'+esc(initialen(k.name))+'</span>';}
function warte(ms){return new Promise(function(r){setTimeout(r,ms);});}
function fehler(text){return new Error(text);}
function text(e){return esc((e&&e.message)||e);}
function pad(n){return (n<10?'0':'')+n;}
function datumIso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function zeitName(){var d=new Date();return datumIso(d)+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());}

/* ---------- Kleiner Speicher des Hubs im Browser ---------- */
function idb(){return new Promise(function(res,rej){var r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=function(){r.result.createObjectStore(IDB_STORE);};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
function idbGet(k){return idb().then(function(db){return new Promise(function(res){var q=db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(k);q.onsuccess=function(){res(q.result);};q.onerror=function(){res(undefined);};});}).catch(function(){return undefined;});}
function idbSet(k,v){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(v,k);tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});});}

/* ---------- Verschlüsselung (Web Crypto, im Browser eingebaut) ---------- */
var te=new TextEncoder(), td=new TextDecoder();
var RSA={name:'RSA-OAEP',hash:'SHA-256'};
function b64(buf){var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),s='';for(var i=0;i<b.length;i+=32768){s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));}return btoa(s);}
function unb64(s){var t=atob(s),b=new Uint8Array(t.length);for(var i=0;i<t.length;i++){b[i]=t.charCodeAt(i);}return b;}
function rnd(n){var b=new Uint8Array(n);crypto.getRandomValues(b);return b;}
function sha256(bytes){return crypto.subtle.digest('SHA-256',bytes).then(b64);}
function ableiten(geheim,salz,iter){
  return crypto.subtle.importKey('raw',te.encode(geheim),'PBKDF2',false,['deriveKey']).then(function(basis){
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:salz,iterations:iter},basis,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  });
}
function versiegeln(schl,bytes){var iv=rnd(12);return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},schl,bytes).then(function(ct){return {iv:b64(iv),ct:b64(ct)};});}
function oeffnen(schl,box){return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},schl,unb64(box.ct));}
function datenschluessel(roh){return crypto.subtle.importKey('raw',roh,'AES-GCM',false,['encrypt','decrypt']);}
/* Code-Alphabet ohne I, L, O, U - nichts zum Verwechseln. 256 ist durch 32
   teilbar, deshalb ist "Byte & 31" gleichverteilt. 20 Zeichen = 100 Bit. */
var ALPHA='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function neuerCode(){var b=rnd(20),s='';for(var i=0;i<20;i++){s+=ALPHA.charAt(b[i]&31);if(i%4===3&&i<19){s+='-';}}return s;}
function codeNorm(s){return String(s||'').toUpperCase().replace(/O/g,'0').replace(/[IL]/g,'1').replace(/U/g,'V').replace(/[^0-9A-Z]/g,'');}
function umschlag(geheim,roh){
  var salz=rnd(16);
  return ableiten(geheim,salz,ITER).then(function(k){return versiegeln(k,roh);}).then(function(b){return {kdf:'PBKDF2-SHA256',iter:ITER,salz:b64(salz),iv:b.iv,ct:b.ct};});
}
function aufmachen(u,geheim){
  return ableiten(geheim,unb64(u.salz),u.iter||ITER).then(function(k){return oeffnen(k,u);})
    .then(function(roh){return new Uint8Array(roh);},function(){var e=new Error('falsch');e.falsch=true;throw e;});
}
function neuesPaar(){return crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);}
function pubVon(spki){return crypto.subtle.importKey('spki',unb64(spki),RSA,false,['encrypt']);}

/* ---------- Der gemeinsame Ordner auf dem Server ---------- */
function testOrdner(){return typeof window.__CDSE_TEST_ORDNER==='function';}
function kryptoDa(){return !!(window.isSecureContext&&window.crypto&&crypto.subtle);}
function unterstuetzt(){return kryptoDa()&&!!window.indexedDB&&(testOrdner()||!!window.showDirectoryPicker);}
function istHubOrdner(h){if(testOrdner()){return Promise.resolve(true);}return h.getFileHandle('hub.html').then(function(){return true;},function(){return false;});}
function recht(h,fragen){
  if(!h||!h.queryPermission){return Promise.resolve('granted');}
  var o={mode:'readwrite'};
  return h.queryPermission(o).then(function(p){return (p==='granted'||!fragen)?p:h.requestPermission(o);});
}
function ordnerWaehlen(){
  var p=testOrdner()?window.__CDSE_TEST_ORDNER():window.showDirectoryPicker({id:'cdse-hub',mode:'readwrite'});
  return p.then(function(h){return istHubOrdner(h).then(function(ok){
    if(!ok){var e=new Error('falscher Ordner');e.falscherOrdner=true;throw e;}
    ordner=h;return idbSet(ORDNER_KEY,h).catch(function(){}).then(function(){return h;});
  });});
}
/* Zugang sicherstellen - bei Bedarf nachfragen (nur innerhalb eines Klicks möglich) */
function ordnerBereit(){
  var p=ordner?Promise.resolve(ordner):idbGet(ORDNER_KEY);
  return p.then(function(h){
    if(h){ordner=h;return recht(h,true).then(function(r){if(r!=='granted'){throw fehler('Kein Zugriff auf den Hub-Ordner');}return h;});}
    return ordnerWaehlen();
  }).then(function(){return konten.length?konten:ladeKonten();});
}
function unterordner(pfad){return pfad.reduce(function(p,n){return p.then(function(d){return d.getDirectoryHandle(n,{create:true});});},Promise.resolve(ordner));}
function eintraege(dir){
  var l=[], it=dir.values();
  function w(){return it.next().then(function(r){if(r.done){return l;}if(r.value&&r.value.kind==='file'){l.push(r.value);}return w();});}
  return w();
}
/* Im Netz (O:\) ist eine Datei manchmal kurz belegt, weil jemand anderes sie gerade schreibt oder liest.
   Solche vorübergehenden Fehler wiederholt der Hub mit wachsender Pause, statt eine Meldung zu zeigen. */
var VORUEBERGEHEND=/^(NotReadableError|NoModificationAllowedError|InvalidStateError|AbortError|UnknownError|NetworkError|TimeoutError|InvalidModificationError)$/;
function nochmal(fn,versuche){
  versuche=versuche||6;
  function v(n){
    return Promise.resolve().then(fn).catch(function(e){
      if(n>=versuche||!e||!VORUEBERGEHEND.test(e.name||'')){throw e;}
      return warte(Math.min(1600,70*Math.pow(2,n))+Math.random()*120).then(function(){return v(n+1);});
    });
  }
  return v(1);
}
function dateiLesen(dir,name){
  return nochmal(function(){
    return dir.getFileHandle(name).then(function(h){return h.getFile();}).then(function(f){return f.text();})
      .then(function(t){return t||null;},function(e){if(e&&e.name==='NotFoundError'){return null;}throw e;});
  });
}
function dateiSchreiben(dir,name,inhalt){
  return nochmal(function(){
    return dir.getFileHandle(name,{create:true}).then(function(h){return h.createWritable();})
      .then(function(w){return w.write(inhalt).then(function(){return w.close();},function(e){try{w.abort();}catch(x){}throw e;});});
  });
}
/* Datei-Stand ohne Inhalt: Zeitpunkt der letzten Änderung und Größe (für „nur Geändertes neu lesen“) */
function dateiInfo(dir,name){
  return nochmal(function(){
    return dir.getFileHandle(name).then(function(h){return h.getFile();}).then(function(f){return {name:name,lastModified:f.lastModified,size:f.size,datei:f};},
      function(e){if(e&&e.name==='NotFoundError'){return null;}throw e;});
  });
}
function istVorbereitet(k){return !!(k&&k.format==='cdse-konto'&&k.id&&k.start&&k.start.ct&&!k.schluessel);}
function nachName(a,b){return String(a.name).localeCompare(String(b.name),'de');}
function ladeKonten(){
  var vorb=[];
  return unterordner(['konten']).then(eintraege).then(function(dateien){
    var liste=[];
    /* mehrere Konto-Dateien gleichzeitig lesen (bei 100 und mehr Konten deutlich schneller) */
    var l=dateien.filter(function(h){return /\.json$/i.test(h.name);}), i=0;
    function weiter(){
      if(i>=l.length){return Promise.resolve();}
      var h=l[i++];
      return nochmal(function(){return h.getFile().then(function(f){return f.text();});}).then(function(t){
        try{var k=JSON.parse(t);if(k&&k.format==='cdse-konto'&&k.id&&k.schluessel&&k.profil){liste.push(k);}else if(istVorbereitet(k)){vorb.push(k);}}catch(e){}
      },function(){}).then(weiter);
    }
    var w=[];for(var n=0;n<Math.min(8,l.length);n++){w.push(weiter());}
    return Promise.all(w).then(function(){return liste;});
  }).then(function(l){l.sort(nachName);konten=l;vorb.sort(nachName);vorbereitete=vorb;return teamlisteLesen().then(function(){return l;});});
}
/* Die eigene Konto-Datei frisch lesen: Passwort oder Profil wurden vielleicht an einem anderen PC geändert.
   Mit dem alten Stand würde „Profil ändern“ sonst eine neuere Passwortänderung überschreiben. */
function kontoFrisch(id){
  return unterordner(['konten']).then(function(dir){return dateiLesen(dir,id+'.json');}).then(function(t){
    var k=null;try{k=JSON.parse(t||'null');}catch(e){}
    if(k&&k.format==='cdse-konto'&&k.id===id&&k.schluessel&&k.profil){
      var i=-1;konten.forEach(function(x,j){if(x.id===id){i=j;}});
      if(i>=0){konten[i]=k;}else{konten.push(k);konten.sort(nachName);}
      return k;
    }
    return kontoVon(id);
  },function(){return kontoVon(id);});
}
/* Kontenliste frisch laden, dann „Wer bist du?“ zeigen (am geteilten PC entstehen tagsüber neue Konten) */
function kontenListe(){return ordnerDa().then(ladeKonten).then(zeigeKonten,zeigeKonten);}
function vorbereitetVon(id){for(var i=0;i<vorbereitete.length;i++){if(vorbereitete[i].id===id){return vorbereitete[i];}}return null;}
function vorbereitetMitNamen(name){var k=namensSchluessel(name);for(var i=0;i<vorbereitete.length;i++){if(namensSchluessel(vorbereitete[i].name)===k){return vorbereitete[i];}}return null;}
/* ---------- Teamliste: vorbereitete Konten ----------
   Die Verwaltung trägt alle Mitarbeitenden ein (Name, Team, Funktion, Rolle).
   Wer ein Konto erstellt, wählt seinen Namen aus der Liste: Team und Funktion
   sind dann vorausgefüllt, das Passwort legt jede Person selbst fest. Die Datei
   „teamliste.json“ liegt im Hub-Ordner im Klartext – wie Name und Team in den
   Konto-Dateien; sie enthält keine Schülerdaten und keine Passwörter. Rollen
   daraus übernimmt der Hub nur, wenn die Verwaltung freischaltet – und nie die
   Rolle „Verwaltung“ selbst. */
var teamliste=[], teamlisteStand='';
var ROLLEN_TL=['mitarbeiter','responsable','admin'];
function namensSchluessel(n){return String(n||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean).sort().join(' ');}
function tlPerson(x){
  if(!x||typeof x!=='object'){return null;}
  var name=String(x.name||'').trim().replace(/\s+/g,' ');if(name.length<3){return null;}
  return {name:name,team:TEAMS.some(function(t){return t.id===x.team;})?x.team:'',funktion:String(x.funktion||'').trim(),rolle:ROLLEN_TL.indexOf(x.rolle)>=0?x.rolle:'mitarbeiter',responsable:String(x.responsable||'').trim()};
}
function teamlisteLesen(){
  if(!ordner){teamliste=[];return Promise.resolve([]);}
  return dateiLesen(ordner,'teamliste.json').then(function(t){
    var l=[], stand='';try{var o=JSON.parse(t||'null');if(o&&o.format==='cdse-teamliste'&&Array.isArray(o.personen)){l=o.personen.map(tlPerson).filter(Boolean);stand=String(o.geaendert||'');}}catch(e){}
    teamliste=l;teamlisteStand=stand;return l;
  },function(){teamliste=[];return [];});
}
function teamlisteSchreiben(personen){
  var l=(personen||[]).map(tlPerson).filter(Boolean);
  l.sort(function(a,b){return a.name.localeCompare(b.name,'de');});
  var o={format:'cdse-teamliste',version:1,geaendert:new Date().toISOString(),von:sitzung?sitzung.id:'',personen:l};
  /* unter der Schreibsperre und nur, wenn niemand die Liste inzwischen geändert hat */
  return ordnerBereit().then(function(){
    return speicher.sperre('teamliste',function(s){
      return dateiLesen(ordner,'teamliste.json').then(function(t){
        var x=null;try{x=JSON.parse(t||'null');}catch(e){}
        var jetzt=x&&x.format==='cdse-teamliste'?String(x.geaendert||''):'';
        if(jetzt&&jetzt!==teamlisteStand){
          var k=x.von?kontoVon(x.von):null, e=fehler('Die Teamliste wurde inzwischen'+(k?' von '+k.name:'')+' geändert. Bitte die Seite neu laden und die Änderung noch einmal machen.');e.konflikt=true;throw e;
        }
        return s.noch().then(function(ja){
          if(!ja){throw fehler('Das Speichern hat zu lange gedauert. Bitte noch einmal versuchen.');}
          return dateiSchreiben(ordner,'teamliste.json',JSON.stringify(o,null,1));
        });
      });
    });
  }).then(function(){teamliste=l;teamlisteStand=o.geaendert;return l;});
}
function teamlisteEintrag(name){var k=namensSchluessel(name);if(!k){return null;}for(var i=0;i<teamliste.length;i++){if(namensSchluessel(teamliste[i].name)===k){return teamliste[i];}}return null;}
function kontoMitNamen(name){var k=namensSchluessel(name);for(var i=0;i<konten.length;i++){if(namensSchluessel(konten[i].name)===k){return konten[i];}}return null;}
/* Team aus einer Angabe wie „ISA“, „Diagnostic spécialisé“, „CLAPA“, „Annexe Junglinster“ */
var TEAM_WOERTER={annexe:['annexe','junglinster'],isa:['isa','interventions specialisees ambulatoires','interventions specialisees','ambulatoires','stop mobbing'],
  diagnostique:['diagnostic','diagnostique','diagnostik','ds'],cp:['classes de participation','classe de participation','clapa','cdp','cp'],
  cst:['cst','centre socio therapeutique','centres socio therapeutiques','socio therapeutique','socio therapeutiques'],
  reeducation:['reeducation','ateliers','atelier','therapie','volet parents'],social:['service social','social','assistante sociale','assistant social'],
  direction:['direction','administration','administrative','uat','secretariat','coordination','gestion pedagogique']};
function tlNorm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function teamAusText(t){
  var n=tlNorm(t);if(!n){return '';}
  for(var i=0;i<TEAMS.length;i++){if(n===TEAMS[i].id||n===tlNorm(TEAMS[i].name)){return TEAMS[i].id;}}
  var ids=Object.keys(TEAM_WOERTER), m=' '+n+' ';
  for(var j=0;j<ids.length;j++){
    if(!TEAMS.some(function(x){return x.id===ids[j];})){continue;}
    if(TEAM_WOERTER[ids[j]].some(function(w){return m.indexOf(' '+w+' ')>=0;})){return ids[j];}
  }
  return '';
}
function rolleAusText(t){
  var n=String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(/respons/.test(n)){return 'responsable';}
  if(/verwaltung|admin|direct|direkt/.test(n)){return 'admin';}
  return 'mitarbeiter';
}
/* Eingefügte Liste lesen: eine Person pro Zeile – „Name; Team; Funktion; Rolle; Responsable“
   (Tabulator aus Excel, Semikolon oder Komma). Kopfzeile wird erkannt. */
/* eine Zeile an einem Trennzeichen zerlegen – nicht innerhalb von Anführungszeichen („Muster, Tom“) */
function zerlegen(z,t){var l=[], akt='', inQ=false;for(var i=0;i<z.length;i++){var c=z.charAt(i);if(c==='"'){inQ=!inQ;akt+=c;}else if(c===t&&!inQ){l.push(akt);akt='';}else{akt+=c;}}l.push(akt);return l;}
function teamlisteParsen(text){
  var personen=[], probleme=[], gesehen={};
  String(text||'').split(/\r?\n/).forEach(function(zeile,i){
    var z=zeile.trim();if(!z){return;}
    var trenner=z.indexOf('\t')>=0?'\t':(z.indexOf(';')>=0?';':(z.indexOf(',')>=0?',':''));
    var teile=trenner?zerlegen(z,trenner):[z];
    teile=teile.map(function(x){return x.trim().replace(/^"|"$/g,'').replace(/""/g,'"').trim();});
    if(i===0&&/^name$/i.test(teile[0])&&teile.length>1){return;}
    var name=(teile[0]||'').replace(/\s+/g,' ');
    if(name.length<3){probleme.push({zeile:i+1,text:'kein Name: „'+z.slice(0,40)+'“'});return;}
    var team=teamAusText(teile[1]||'');
    if(teile[1]&&!team){probleme.push({zeile:i+1,text:'Team „'+teile[1]+'“ unbekannt – bitte in der Liste wählen'});}
    var p={name:name,team:team,funktion:teile[2]||'',rolle:rolleAusText(teile[3]||''),responsable:teile[4]||''};
    var k=namensSchluessel(name);
    if(gesehen[k]!=null){probleme.push({zeile:i+1,text:name+' steht doppelt – die letzte Zeile gilt'});personen[gesehen[k]]=p;return;}
    gesehen[k]=personen.length;personen.push(p);
  });
  return {personen:personen,probleme:probleme};
}
function schreibeKonto(k){return unterordner(['konten']).then(function(dir){return dateiSchreiben(dir,k.id+'.json',JSON.stringify(k,null,1));});}
function kontoVon(id){for(var i=0;i<konten.length;i++){if(konten[i].id===id){return konten[i];}}return null;}

/* ---------- Konten ---------- */
function slug(n){return String(n).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'konto';}
function neueKontoId(name){
  var id;
  do{id=slug(name)+'-'+Array.prototype.map.call(rnd(3),function(x){return ALPHA.charAt(x&31).toLowerCase();}).join('');}while(kontoVon(id)||vorbereitetVon(id));
  return id;
}
/* extra: funktion, responsable; bei vorbereiteten Konten zusätzlich id (bleibt gleich) und start (bis zur Freischaltung) */
function kontoErstellen(name,teamId,pw,extra){
  extra=extra||{};
  var roh=rnd(32), code=neuerCode(), id=extra.id||neueKontoId(name);
  return Promise.all([umschlag(pw,roh),umschlag(codeNorm(code),roh),datenschluessel(roh),neuesPaar()]).then(function(r){
    var dek=r[2], kp=r[3];
    return Promise.all([crypto.subtle.exportKey('spki',kp.publicKey),crypto.subtle.exportKey('pkcs8',kp.privateKey)]).then(function(ex){
      return Promise.all([sha256(ex[0]),versiegeln(dek,new Uint8Array(ex[1]))]).then(function(q){
        var prof={name:name,team:teamId,schluessel:q[0],funktion:extra.funktion||'',responsable:extra.responsable||''};
        return versiegeln(dek,te.encode(JSON.stringify(prof))).then(function(profil){
          var jetzt=new Date().toISOString();
          var k={format:'cdse-konto',version:1,id:id,name:name,team:teamId,funktion:prof.funktion,responsable:prof.responsable,erstellt:jetzt,geaendert:jetzt,
                 schluessel:{passwort:r[0],code:r[1]},oeffentlich:b64(ex[0]),privat:q[1],profil:profil};
          if(extra.start){k.start=extra.start;}
          return schreibeKonto(k).then(function(){
            konten=konten.filter(function(x){return x.id!==id;});konten.push(k);konten.sort(nachName);
            vorbereitete=vorbereitete.filter(function(x){return x.id!==id;});
            roh.fill(0);
            return {konto:k,code:code,s:{id:id,name:name,team:teamId,funktion:prof.funktion,responsable:prof.responsable,rg:true,konto:k,dek:dek,prof:prof,pub:kp.publicKey,priv:kp.privateKey,hash:q[0]}};
          });
        });
      });
    });
  });
}
function anmeldenMit(k,geheim,art){
  return aufmachen(k.schluessel[art],art==='code'?codeNorm(geheim):geheim).then(function(roh){
    return datenschluessel(roh).then(function(dek){
      return oeffnen(dek,k.profil).then(function(p){
        var prof=JSON.parse(td.decode(p));
        return {id:k.id,name:prof.name||k.name,team:prof.team||k.team,funktion:prof.funktion||k.funktion||'',responsable:prof.responsable||k.responsable||'',rg:Object.prototype.hasOwnProperty.call(prof,'responsable'),konto:k,dek:dek,roh:roh,prof:prof};
      });
    });
  });
}
/* Schlüsselpaar des Kontos öffnen. Der Fingerabdruck des öffentlichen
   Schlüssels steckt im verschlüsselten Profil - ein untergeschobener
   Schlüssel fällt so auf. Konten von vor dem Tresor bekommen ihr Paar hier. */
function schluesselBereit(s){
  var k=s.konto, dek=s.dek, prof=s.prof;
  function profilSchreiben(){return versiegeln(dek,te.encode(JSON.stringify(prof))).then(function(pr){k.profil=pr;k.geaendert=new Date().toISOString();return schreibeKonto(k);});}
  /* Rest einer Startcode-Einrichtung (Schreiben war unterbrochen): der verschlossene Schlüssel gehört nicht mehr in die Datei */
  if(k.start&&k.schluessel){delete k.start;schreibeKonto(k).catch(function(){});}
  if(k.oeffentlich&&k.privat){
    return sha256(unb64(k.oeffentlich)).then(function(h){
      if(prof.schluessel&&prof.schluessel!==h){throw fehler('Deine Konto-Datei wurde verändert (der Schlüssel passt nicht). Bitte informiere die IT');}
      return oeffnen(dek,k.privat).then(function(p8){return Promise.all([crypto.subtle.importKey('pkcs8',p8,RSA,false,['decrypt']),pubVon(k.oeffentlich)]);}).then(function(ks){
        s.priv=ks[0];s.pub=ks[1];s.hash=h;
        if(prof.schluessel){return s;}
        prof.schluessel=h;return profilSchreiben().then(function(){return s;});
      });
    });
  }
  return neuesPaar().then(function(kp){
    return Promise.all([crypto.subtle.exportKey('spki',kp.publicKey),crypto.subtle.exportKey('pkcs8',kp.privateKey)]).then(function(ex){
      return Promise.all([sha256(ex[0]),versiegeln(dek,new Uint8Array(ex[1]))]).then(function(q){
        k.oeffentlich=b64(ex[0]);k.privat=q[1];prof.schluessel=q[0];
        return profilSchreiben().then(function(){s.pub=kp.publicKey;s.priv=kp.privateKey;s.hash=q[0];return s;});
      });
    });
  });
}
function passwortSetzen(k,roh,pw){
  return umschlag(pw,roh).then(function(u){k.schluessel.passwort=u;k.geaendert=new Date().toISOString();return schreibeKonto(k);});
}
function profilSetzen(k,dek,prof,werte){
  prof.team=werte.team;prof.funktion=werte.funktion||'';prof.responsable=werte.responsable||'';
  return versiegeln(dek,te.encode(JSON.stringify(prof))).then(function(profil){
    k.team=prof.team;k.funktion=prof.funktion;k.responsable=prof.responsable;k.profil=profil;k.geaendert=new Date().toISOString();return schreibeKonto(k);
  });
}
function pwProblem(pw,name){
  if(pw.length<10){return 'Das Passwort braucht mindestens 10 Zeichen.';}
  /* der Vorname als eigenes Wort (z. B. „Lea2026!“) – als Teil eines anderen Wortes („Leas Katze“) ist er erlaubt */
  function woerter(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z]+/).filter(function(x){return x.length>=2;});}
  var vor=woerter(String(name||'').trim().split(/\s+/)[0]), pwW=woerter(pw);
  if(vor.some(function(v){return pwW.indexOf(v)>=0;})){return 'Das Passwort darf deinen Vornamen nicht als eigenes Wort enthalten.';}
  if(/^(.)\1+$/.test(pw)){return 'Bitte kein Passwort aus lauter gleichen Zeichen.';}
  return '';
}
/* Nach 5 falschen Versuchen 30 Sekunden Pause - bremst Raten am Bildschirm */
function gebremst(id){var f=fehlversuche[id];return (f&&f.bis>Date.now())?Math.ceil((f.bis-Date.now())/1000):0;}
function fehlversuch(id){var f=fehlversuche[id]||(fehlversuche[id]={n:0,bis:0});f.n++;if(f.n>=5){f.n=0;f.bis=Date.now()+30000;}}
/* Öffentliche Schlüssel, die auf diesem PC schon einmal mit dem Passwort
   bestätigt wurden. Nur an solche wird ohne Passwort gesichert. */
function geprueft(){try{return JSON.parse(localStorage.getItem(GEPRUEFT)||'{}')||{};}catch(e){return {};}}
function geprueftMerken(id,h){var g=geprueft();g[id]=h;try{localStorage.setItem(GEPRUEFT,JSON.stringify(g));}catch(e){}}
function pubGeprueft(k){
  var h=k&&geprueft()[k.id];
  if(!k||!k.oeffentlich||!h){return Promise.reject(fehler('Der Schlüssel dieses Kontos ist auf diesem PC noch nicht bestätigt'));}
  return sha256(unb64(k.oeffentlich)).then(function(x){if(x!==h){throw fehler('Der Schlüssel dieses Kontos hat sich verändert');}return pubVon(k.oeffentlich);});
}

/* =====================================================================
   Daten-Tresor
   ===================================================================== */
/* Was dem Hub selbst gehört, wird weder gesichert noch gelöscht */
function hubSchluessel(k){return k===ZULETZT||k===MARKE||k===GEPRUEFT||k.indexOf('__')===0;}
/* Die Marke sagt, wem die App-Daten auf diesem PC gehören und welchem Stand
   auf dem Server sie entsprechen: {konto, stand, hash, ...} */
function marke(){try{var m=JSON.parse(localStorage.getItem(MARKE)||'null');return (m&&m.konto)?m:null;}catch(e){return null;}}
function markeSetzen(m){try{if(m){localStorage.setItem(MARKE,JSON.stringify(m));}else{localStorage.removeItem(MARKE);}}catch(e){}}
/* Vom Hub geleert: später gefundene App-Daten sind ohne Anmeldung entstanden */
function geleertMerken(){markeSetzen({konto:null,geleert:Date.now()});}
function geleertSeit(){try{var m=JSON.parse(localStorage.getItem(MARKE)||'null');return (m&&!m.konto&&m.geleert)||0;}catch(e){return 0;}}
function lsSchluessel(){var a=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k!=null&&!hubSchluessel(k)){a.push(k);}}return a.sort();}
function datenbanken(){
  if(!indexedDB.databases){return Promise.resolve([]);}
  return indexedDB.databases().then(function(l){return l.map(function(d){return d&&d.name;}).filter(function(n){return n&&n!==IDB_NAME;}).sort();});
}
function dbVersion(name){
  if(!indexedDB.databases){return Promise.resolve(0);}
  return indexedDB.databases().then(function(l){for(var i=0;i<l.length;i++){if(l[i].name===name){return l[i].version||0;}}return 0;});
}
function dbAuf(name,version,schema){
  return new Promise(function(res,rej){
    var r=version?indexedDB.open(name,version):indexedDB.open(name);
    r.onupgradeneeded=function(){if(schema){schema(r.result);}};
    r.onsuccess=function(){var db=r.result;db.onversionchange=function(){db.close();};res(db);};   /* nie eine App blockieren */
    r.onerror=function(){rej(r.error);};
  });
}

/* Werte aus IndexedDB in JSON verwandeln und zurück (Datum, Dateien, Binärdaten …) */
function istGriff(v){return typeof FileSystemHandle!=='undefined'&&v instanceof FileSystemHandle;}
function hatGriff(v,t){
  if(v==null||typeof v!=='object'||(t|0)>40){return false;}
  if(istGriff(v)){return true;}
  if(v instanceof Blob||v instanceof Date||v instanceof ArrayBuffer||ArrayBuffer.isView(v)){return false;}
  var f=false;
  if(v instanceof Map){v.forEach(function(x,k){f=f||hatGriff(x,(t|0)+1)||hatGriff(k,(t|0)+1);});return f;}
  if(v instanceof Set){v.forEach(function(x){f=f||hatGriff(x,(t|0)+1);});return f;}
  for(var k in v){if(Object.prototype.hasOwnProperty.call(v,k)&&hatGriff(v[k],(t|0)+1)){return true;}}
  return false;
}
function packen(v,blobs){
  if(v===null||typeof v==='string'||typeof v==='boolean'){return v;}
  if(typeof v==='number'){return isFinite(v)?v:{__t:'zahl',v:String(v)};}
  if(v===undefined){return {__t:'undef'};}
  if(typeof v==='bigint'){return {__t:'bigint',v:String(v)};}
  if(typeof v!=='object'){return null;}
  if(v instanceof Date){return {__t:'datum',v:isNaN(v)?null:v.toISOString()};}
  if(v instanceof Blob){var o={__t:'blob',typ:v.type,b:''};if(typeof File!=='undefined'&&v instanceof File){o.name=v.name;o.lm=v.lastModified;}blobs.push([o,v]);return o;}
  if(v instanceof ArrayBuffer){return {__t:'ab',b:b64(v)};}
  if(ArrayBuffer.isView(v)){return {__t:'ta',k:v.constructor.name,b:b64(new Uint8Array(v.buffer,v.byteOffset,v.byteLength))};}
  if(v instanceof RegExp){return {__t:'re',s:v.source,f:v.flags};}
  if(Array.isArray(v)){var a=new Array(v.length);for(var i=0;i<v.length;i++){a[i]=packen(v[i],blobs);}return a;}
  if(v instanceof Map){var e=[];v.forEach(function(x,k){e.push([packen(k,blobs),packen(x,blobs)]);});return {__t:'map',v:e};}
  if(v instanceof Set){var s=[];v.forEach(function(x){s.push(packen(x,blobs));});return {__t:'set',v:s};}
  var r={};for(var n in v){if(Object.prototype.hasOwnProperty.call(v,n)){r[n]=packen(v[n],blobs);}}
  return Object.prototype.hasOwnProperty.call(v,'__t')?{__t:'obj',v:r}:r;
}
var TA={Int8Array:Int8Array,Uint8Array:Uint8Array,Uint8ClampedArray:Uint8ClampedArray,Int16Array:Int16Array,Uint16Array:Uint16Array,
        Int32Array:Int32Array,Uint32Array:Uint32Array,Float32Array:Float32Array,Float64Array:Float64Array,DataView:DataView};
function auspacken(x){
  if(x===null||typeof x!=='object'){return x;}
  if(Array.isArray(x)){return x.map(auspacken);}
  switch(x.__t){
    case 'zahl':return Number(x.v);
    case 'undef':return undefined;
    case 'bigint':return typeof BigInt==='function'?BigInt(x.v):Number(x.v);
    case 'datum':return new Date(x.v===null?NaN:x.v);
    case 'blob':var b=unb64(x.b);return (x.name!=null&&typeof File!=='undefined')?new File([b],x.name,{type:x.typ,lastModified:x.lm}):new Blob([b],{type:x.typ});
    case 'ab':return unb64(x.b).buffer;
    case 'ta':var u=unb64(x.b),C=TA[x.k]||Uint8Array;return new C(u.buffer);
    case 're':return new RegExp(x.s,x.f);
    case 'map':var m=new Map();x.v.forEach(function(e){m.set(auspacken(e[0]),auspacken(e[1]));});return m;
    case 'set':return new Set(x.v.map(auspacken));
    case 'obj':return objAuspacken(x.v);
  }
  return objAuspacken(x);
}
function objAuspacken(o){var r={};for(var k in o){if(Object.prototype.hasOwnProperty.call(o,k)){r[k]=auspacken(o[k]);}}return r;}

/* Momentaufnahme aller App-Daten dieses Browsers.
   daten:  JSON-fähig - kommt verschlüsselt auf den Server
   griffe: Datei-/Ordnerzugänge der Apps - bleiben auf diesem PC */
function momentaufnahme(){
  var daten={v:1,ls:{},idb:{}}, griffe={}, blobs=[], zeilen=0;
  lsSchluessel().forEach(function(k){daten.ls[k]=localStorage.getItem(k);});
  return datenbanken().then(function(namen){
    return namen.reduce(function(p,n){return p.then(function(){return dbLesen(n,daten,griffe,blobs).then(function(z){zeilen+=z;});});},Promise.resolve());
  }).then(function(){
    return Promise.all(blobs.map(function(p){return p[1].arrayBuffer().then(function(ab){p[0].b=b64(ab);});}));
  }).then(function(){
    var json=JSON.stringify(daten);
    return sha256(te.encode(json)).then(function(h){
      return {daten:daten,json:json,griffe:griffe,hash:h,leer:!Object.keys(daten.ls).length&&!zeilen};
    });
  });
}
function dbLesen(name,daten,griffe,blobs){
  return dbAuf(name).then(function(db){
    var namen=Array.prototype.slice.call(db.objectStoreNames), eintrag={version:db.version,stores:[]};
    daten.idb[name]=eintrag;
    if(!namen.length){db.close();return 0;}
    return new Promise(function(res,rej){
      var tx=db.transaction(namen,'readonly'), roh={};
      namen.forEach(function(sn){
        var st=tx.objectStore(sn), info={name:sn,keyPath:st.keyPath,autoIncrement:st.autoIncrement,indexes:[]};
        Array.prototype.forEach.call(st.indexNames,function(n){var ix=st.index(n);info.indexes.push({name:ix.name,keyPath:ix.keyPath,unique:ix.unique,multiEntry:ix.multiEntry});});
        var r=roh[sn]={info:info,keys:[],vals:[]}, rk=st.getAllKeys(), rv=st.getAll();
        rk.onsuccess=function(){r.keys=rk.result;};rv.onsuccess=function(){r.vals=rv.result;};
      });
      tx.oncomplete=function(){
        db.close();var z=0;
        namen.forEach(function(sn){
          var r=roh[sn], s={name:sn,keyPath:r.info.keyPath,autoIncrement:r.info.autoIncrement,indexes:r.info.indexes,rows:[]};
          for(var i=0;i<r.vals.length;i++){
            if(hatGriff(r.vals[i])){
              var g=griffe[name]||(griffe[name]={version:eintrag.version,stores:{}});
              (g.stores[sn]||(g.stores[sn]={info:s,rows:[]})).rows.push({k:r.keys[i],v:r.vals[i]});
            }else{s.rows.push({k:packen(r.keys[i],blobs),v:packen(r.vals[i],blobs)});z++;}
          }
          eintrag.stores.push(s);
        });
        res(z);
      };
      tx.onerror=tx.onabort=function(){db.close();rej(tx.error||fehler('Lesen abgebrochen'));};
    });
  });
}
/* Alle App-Daten auf diesem PC löschen (Aufbau der Datenbanken bleibt) */
function leeren(){
  lsSchluessel().forEach(function(k){try{localStorage.removeItem(k);}catch(e){}});
  return datenbanken().then(function(namen){
    return Promise.all(namen.map(function(n){
      return dbAuf(n).then(function(db){
        var st=Array.prototype.slice.call(db.objectStoreNames);
        if(!st.length){db.close();return;}
        return new Promise(function(res,rej){
          var tx=db.transaction(st,'readwrite');
          st.forEach(function(sn){tx.objectStore(sn).clear();});
          tx.oncomplete=function(){db.close();res();};
          tx.onerror=tx.onabort=function(){db.close();rej(tx.error||fehler('Löschen abgebrochen'));};
        });
      });
    }));
  });
}
/* Gesicherte Daten einspielen. Fehlt eine Datenbank, wird sie so angelegt,
   wie sie auf dem anderen PC war - die App findet dann alles wie gewohnt. */
function einspielen(daten,griffe){
  Object.keys(daten.ls||{}).forEach(function(k){localStorage.setItem(k,daten.ls[k]);});
  var dbs={};
  Object.keys(daten.idb||{}).forEach(function(n){
    var d=dbs[n]={version:daten.idb[n].version,stores:{}};
    daten.idb[n].stores.forEach(function(s){d.stores[s.name]={info:s,rows:s.rows.map(function(r){return {k:auspacken(r.k),v:auspacken(r.v)};})};});
  });
  Object.keys(griffe||{}).forEach(function(n){
    var g=griffe[n], d=dbs[n]||(dbs[n]={version:g.version,stores:{}});
    if(g.version>d.version){d.version=g.version;}
    Object.keys(g.stores).forEach(function(sn){var x=d.stores[sn]||(d.stores[sn]={info:g.stores[sn].info,rows:[]});x.rows=x.rows.concat(g.stores[sn].rows);});
  });
  return Object.keys(dbs).reduce(function(p,n){return p.then(function(){return dbSchreiben(n,dbs[n]);});},Promise.resolve());
}
function dbSchreiben(name,d){
  return dbVersion(name).then(function(da){
    /* nie über die Version hinaus, die die App selbst kennt */
    var ziel=(!da||da<d.version)?d.version:0;
    return dbAuf(name,ziel||undefined,function(db){
      Object.keys(d.stores).forEach(function(sn){
        if(db.objectStoreNames.contains(sn)){return;}
        var i=d.stores[sn].info, o={autoIncrement:!!i.autoIncrement};
        if(i.keyPath!=null){o.keyPath=i.keyPath;}
        var st=db.createObjectStore(sn,o);
        (i.indexes||[]).forEach(function(x){try{st.createIndex(x.name,x.keyPath,{unique:!!x.unique,multiEntry:!!x.multiEntry});}catch(e){}});
      });
    });
  }).then(function(db){
    var st=Object.keys(d.stores).filter(function(sn){return db.objectStoreNames.contains(sn)&&d.stores[sn].rows.length;});
    if(!st.length){db.close();return;}
    return new Promise(function(res,rej){
      var tx=db.transaction(st,'readwrite');
      st.forEach(function(sn){
        var o=tx.objectStore(sn);
        d.stores[sn].rows.forEach(function(r){
          try{var q=o.keyPath!=null?o.put(r.v):o.put(r.v,r.k);q.onerror=function(ev){ev.preventDefault();};}catch(e){}   /* eine kaputte Zeile hält den Rest nicht auf */
        });
      });
      tx.oncomplete=function(){db.close();res();};
      tx.onerror=tx.onabort=function(){db.close();rej(tx.error||fehler('Schreiben abgebrochen'));};
    });
  });
}
function lokaleGriffe(id){return idbGet('griffe:'+id).then(function(g){return g||{};});}
function griffeMerken(id,g){return idbSet('griffe:'+id,g||{}).catch(function(){});}

/* Verschlüsselte Datei: zufälliger AES-Schlüssel für die (gepackten) Daten,
   der selbst mit dem öffentlichen Schlüssel des Kontos verschlossen ist */
function gzip(bytes){
  if(typeof CompressionStream==='undefined'){return Promise.resolve(null);}
  return new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function(ab){return new Uint8Array(ab);});
}
function gunzip(bytes){return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer().then(function(ab){return new Uint8Array(ab);});}
function tresorPacken(k,pub,snap,art,stand){
  var roh=te.encode(snap.json);
  return gzip(roh).then(function(z){
    var schl=rnd(32), iv=rnd(12);
    return crypto.subtle.importKey('raw',schl,'AES-GCM',false,['encrypt']).then(function(aes){
      return Promise.all([crypto.subtle.encrypt(RSA,pub,schl),crypto.subtle.encrypt({name:'AES-GCM',iv:iv},aes,z||roh)]);
    }).then(function(r){
      schl.fill(0);
      return JSON.stringify({format:FORMAT_DATEN,version:1,konto:k.id,art:art,stand:stand,gespeichert:new Date().toISOString(),
                             gzip:!!z,schluessel:b64(r[0]),iv:b64(iv),ct:b64(r[1])});
    });
  });
}
function tresorOeffnen(priv,box){
  if(!box||box.format!==FORMAT_DATEN){return Promise.reject(fehler('Die Daten-Datei hat ein unbekanntes Format'));}
  return crypto.subtle.decrypt(RSA,priv,unb64(box.schluessel)).then(function(schl){return crypto.subtle.importKey('raw',schl,'AES-GCM',false,['decrypt']);})
    .then(function(aes){return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.iv)},aes,unb64(box.ct));})
    .then(function(ab){var b=new Uint8Array(ab);return box.gzip?gunzip(b):b;})
    .then(function(b){return JSON.parse(td.decode(b));},function(e){throw fehler('Die Daten-Datei ließ sich nicht öffnen ('+((e&&e.name)||e)+')');});
}
function datenOrdner(id){return unterordner(['daten',id]);}
/* Immer nur eine Sicherung gleichzeitig - auch über mehrere Hub-Tabs */
var kette=Promise.resolve();
function exklusiv(fn){
  if(navigator.locks&&navigator.locks.request){return navigator.locks.request('cdse-hub-tresor',fn);}
  var p=kette.then(fn,fn);kette=p.catch(function(){});return p;
}
function kopieAblegen(k,pub,snap,art){
  var m=marke();
  return datenOrdner(k.id).then(function(dir){
    return tresorPacken(k,pub,snap,art,m&&m.konto===k.id?(m.stand|0):0).then(function(txt){return dateiSchreiben(dir,art+'-'+zeitName()+'.cdse',txt);}).then(function(){return altesAufraeumen(dir);});
  });
}
/* Aufbewahrt werden die Tagesstände der letzten 14 Tage und 20 Kopien */
function altesAufraeumen(dir){
  return eintraege(dir).then(function(l){
    var tage=l.map(function(h){return h.name;}).filter(function(n){return /^\d{4}-\d{2}-\d{2}\.cdse$/.test(n);}).sort().reverse();
    var kopien=l.map(function(h){return h.name;}).filter(function(n){return /^[a-z]+-\d{4}-.*\.cdse$/.test(n);})
      .sort(function(a,b){a=a.replace(/^[a-z]+-/,'');b=b.replace(/^[a-z]+-/,'');return a<b?1:(a>b?-1:0);});
    return Promise.all(tage.slice(14).concat(kopien.slice(20)).map(function(n){return dir.removeEntry(n).catch(function(){});}));
  }).catch(function(){});
}
/* Lokale Daten der Person k auf den Server bringen - ohne Passwort.
   Ergebnis: 'gesichert' | 'unveraendert' | 'konflikt' | 'fremd' | 'unvollstaendig' */
function sichern(k,pub,snap){
  return exklusiv(function(){
    var m=marke();
    if(!m||m.konto!==k.id){return 'fremd';}   /* die Daten auf dem PC gehören nicht (mehr) dieser Person */
    if(m.unvollstaendig){return 'unvollstaendig';}   /* halb eingespielte Daten nie als neuen Stand sichern */
    return (snap?Promise.resolve(snap):momentaufnahme()).then(function(sn){
      if(m&&m.hash===sn.hash){return 'unveraendert';}
      return datenOrdner(k.id).then(function(dir){
        return dateiLesen(dir,'aktuell.cdse').then(function(alt){
          var box=null;try{box=alt?JSON.parse(alt):null;}catch(e){box=null;}
          var stand=box?(box.stand|0):0;
          if(m.konflikt||stand>(m.stand|0)){
            /* Inzwischen wurde anderswo weitergearbeitet: nichts überschreiben,
               die Daten dieses PCs als Kopie ablegen */
            var name=m.kopie||('konflikt-'+zeitName()+'.cdse');
            return tresorPacken(k,pub,sn,'konflikt',m.stand|0).then(function(txt){return dateiSchreiben(dir,name,txt);}).then(function(){
              markeSetzen({konto:k.id,stand:m.stand|0,hash:sn.hash,zeit:Date.now(),konflikt:true,kopie:name});
              return 'konflikt';
            });
          }
          var tag=box&&box.gespeichert?datumIso(new Date(box.gespeichert)):'';
          var tagesstand=(tag&&tag!==datumIso(new Date()))?dateiSchreiben(dir,tag+'.cdse',alt).then(function(){return altesAufraeumen(dir);}):Promise.resolve();
          return tagesstand.then(function(){return tresorPacken(k,pub,sn,'aktuell',stand+1);}).then(function(txt){return dateiSchreiben(dir,'aktuell.cdse',txt);}).then(function(){
            markeSetzen({konto:k.id,stand:stand+1,hash:sn.hash,zeit:Date.now()});
            return 'gesichert';
          });
        });
      });
    });
  });
}
function ladenVomServer(k,priv,box){
  return tresorOeffnen(priv,box).then(function(daten){
    return lokaleGriffe(k.id).then(function(gr){
      markeSetzen({konto:k.id,stand:box.stand|0,hash:'',zeit:Date.now(),unvollstaendig:true});
      return leeren().then(function(){return einspielen(daten,gr);});
    });
  }).then(momentaufnahme).then(function(sn){markeSetzen({konto:k.id,stand:box.stand|0,hash:sn.hash,zeit:Date.now()});});
}
/* Daten, die (noch) keinem Konto zugeordnet werden können, bleiben auf
   diesem PC - unsichtbar, bis ihre Besitzerin oder ihr Besitzer sie holt */
function beiseiteLegen(snap,von){
  return idbGet('beiseite').then(function(l){
    l=Array.isArray(l)?l:[];
    l.push({id:zeitName()+'-'+b64(rnd(3)).replace(/[^a-z0-9]/gi,''),zeit:Date.now(),von:von||null,json:snap.json,griffe:snap.griffe});
    return idbSet('beiseite',l.slice(-10));   /* höchstens 10 Pakete pro PC */
  });
}
/* Die Daten der letzten Person auf diesem PC für sie sichern */
function fremdeSichern(m,snap){
  var k=kontoVon(m.konto);
  if(!k){return Promise.resolve('geloescht');}   /* Konto wurde gelöscht - seine Daten gehen mit */
  return pubGeprueft(k).then(function(pub){
    return griffeMerken(k.id,snap.griffe).then(function(){return sichern(k,pub,snap);});
  },function(){return beiseiteLegen(snap,k.id).then(function(){return 'beiseite';});});
}
var APP_SPUREN=[['klassenbuch',/^(klassebuch_|anwesenheit|anw_|cdse_dossier)/,'cdse_dossier_db'],['journal',/^isa_(?!team_user$|uploader_ok$)/,'isa_dossier_db'],
                ['screening',/^cdse-autosave/,null],['eldib',/^eldib-/,null],['toolbox',/^isa_(team_user|uploader_ok)$/,null]];
function altbestandApps(snap){
  var namen={}, d=snap.daten, out=[];
  (window.CDSE_APPS||[]).forEach(function(a){if(a&&a.id){namen[a.id]=a.name;}});
  APP_SPUREN.forEach(function(sp){
    var ls=Object.keys(d.ls).some(function(k){return sp[1].test(k);});
    var db=sp[2]&&d.idb[sp[2]]&&d.idb[sp[2]].stores.some(function(s){return s.rows.length>0;});
    if(ls||db){out.push(namen[sp[0]]||sp[0]);}
  });
  return out;
}
/* Beim Anmelden: die Daten auf diesem PC in Ordnung bringen und die eigenen
   laden. Liefert Hinweise für die Oberfläche. */
function appsZu(){if(cb.appsSchliessen){cb.appsSchliessen();}return warte(300);}   /* offene Apps würden alte Daten zurückschreiben */
function datenAnmelden(s,fortschritt){
  var hinweise=[], k=s.konto, m0=marke(), p;
  if(m0&&m0.konto!==s.id){
    fortschritt('Sichere die Daten der letzten Person …');
    p=appsZu().then(momentaufnahme).then(function(snap){return fremdeSichern(m0,snap);}).then(leeren).then(function(){geleertMerken();return momentaufnahme();});
  }else{p=momentaufnahme();}
  return p.then(function(snap){
    if(marke()||snap.leer){return snap;}
    return frageAltbestand(altbestandApps(snap),geleertSeit()).then(function(a){
      fortschritt('Einen Moment …');
      if(a==='meins'){markeSetzen({konto:s.id,stand:0,hash:'',zeit:Date.now(),altbestand:true});return snap;}
      return appsZu().then(function(){return beiseiteLegen(snap,null);}).then(leeren).then(function(){hinweise.push('beiseite');return momentaufnahme();});
    });
  }).then(function(snap){
    fortschritt('Lade deine Daten …');
    return datenOrdner(s.id).then(function(dir){return dateiLesen(dir,'aktuell.cdse');}).then(function(t){
      var box=null;
      if(t){try{box=JSON.parse(t);}catch(e){throw fehler('Deine Daten-Datei ist beschädigt');}}
      var m=marke();
      if(!m){
        if(box){return appsZu().then(function(){return ladenVomServer(k,s.priv,box);});}
        markeSetzen({konto:s.id,stand:0,hash:snap.hash,zeit:Date.now()});return;
      }
      if(m.unvollstaendig){if(box){return appsZu().then(function(){return ladenVomServer(k,s.priv,box);});}markeSetzen({konto:s.id,stand:0,hash:'',zeit:Date.now()});return sichern(k,s.pub);}
      var geaendert=m.hash!==snap.hash&&!snap.leer, neuer=!!box&&((box.stand|0)>(m.stand|0)||!!m.konflikt);
      if(neuer){
        var art=m.altbestand?'altbestand':'konflikt';
        return (geaendert?kopieAblegen(k,s.pub,snap,art).then(function(){hinweise.push(art);}):Promise.resolve())
          .then(appsZu).then(function(){return ladenVomServer(k,s.priv,box);});
      }
      if(m.konflikt||m.altbestand||m.kopie){markeSetzen({konto:s.id,stand:m.stand|0,hash:m.hash,zeit:Date.now()});}
      if(m.hash!==snap.hash){return sichern(k,s.pub,snap);}
    });
  }).then(function(){return idbGet('beiseite');}).then(function(l){
    if((Array.isArray(l)?l:[]).some(function(x){return x.von===s.id;})){hinweise.push('fuer-dich');}
    return hinweise;
  });
}

/* ---------- Automatisch sichern ---------- */
function status(st){aktStatus=st;if(cb.status){try{cb.status(st);}catch(e){}}}
function autoSichern(){
  if(!sitzung||!tresor.pub||tresor.id!==sitzung.id||!ordner){return Promise.resolve();}
  var k=kontoVon(sitzung.id);if(!k){return Promise.resolve();}
  return sichern(k,tresor.pub).then(function(r){
    if(r==='gesichert'){letzteSicherung=Date.now();status({art:'gesichert',zeit:letzteSicherung});}
    else if(r==='konflikt'){status({art:'konflikt'});}
    else if(r==='fremd'||r==='unvollstaendig'){status({art:'fehler',text:'Die Daten auf diesem PC passen nicht zu deinem Konto. Bitte ab- und wieder anmelden.'});}
    else if(aktStatus.art==='fehler'){status(letzteSicherung?{art:'gesichert',zeit:letzteSicherung}:{art:'bereit'});}
    return r;
  },function(e){status({art:'fehler',text:(e&&e.message)||String(e)});});
}
setInterval(autoSichern,AUTO_MS);
var baldTimer=null;
/* eine App hat Daten geändert: bald sichern – höchstens alle 30 Sekunden (Apps speichern teils alle paar Sekunden) */
function baldSichern(){if(baldTimer){return;}baldTimer=setTimeout(function(){baldTimer=null;autoSichern();},30000);}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden'){autoSichern();}});
function tresorWiederaufnehmen(){
  if(!sitzung){return Promise.resolve();}
  var k=kontoVon(sitzung.id);
  if(!k){status({art:'fehler',text:'Dein Konto wurde im Hub-Ordner nicht gefunden.'});return Promise.resolve();}
  return pubGeprueft(k).then(function(pub){
    tresor={id:k.id,pub:pub,priv:null};status({art:'bereit'});
    return idbGet('sitzung-schluessel').then(function(x){if(x&&x.priv&&x.sid&&sitzung&&x.sid===sitzung.sid&&x.konto===sitzung.id){tresor.priv=x.priv;}}).then(autoSichern);
  },
    function(e){status({art:'fehler',text:(e&&e.message)||String(e)});});
}

/* ---------- Sitzung ---------- */
/* bis = letzte Aktivität + Sperrzeit; lebt = Lebenszeichen der offenen Seite (alle 30 s). Stellt der Browser nach einem
   Neustart den Tab samt Sitzungsspeicher wieder her, ist das Lebenszeichen alt – dann braucht es wieder das Passwort. */
var LEBT_MS=180000;
function sitzungMerken(s){try{sessionStorage.setItem(SITZUNG,JSON.stringify({id:s.id,name:s.name,team:s.team,funktion:s.funktion||'',responsable:s.responsable||'',rg:!!s.rg,sid:s.sid||'',bis:letzteAktivitaet+SPERRE_MS,lebt:Date.now()}));}catch(e){}}
function sitzungLesen(){try{var s=JSON.parse(sessionStorage.getItem(SITZUNG)||'null');return (s&&s.id&&s.bis>Date.now()&&s.lebt&&Date.now()-s.lebt<LEBT_MS)?s:null;}catch(e){return null;}}
setInterval(function(){if(sitzung&&!gesperrt){sitzungMerken(sitzung);}},30000);
function sitzungLoeschen(){try{sessionStorage.removeItem(SITZUNG);}catch(e){}}
function oeffentlich(s){var t=team(s.team);return {id:s.id,name:s.name,team:s.team,teamName:t.name,teamFarbe:t.farbe,funktion:s.funktion||'',responsable:s.responsable||'',responsableGewaehlt:!!s.rg};}
/* Privater Schlüssel für die Dauer der Sitzung: als nicht exportierbarer
   CryptoKey in IndexedDB, damit er ein Neuladen des Tabs übersteht. Beim
   Abmelden, Sperren und beim nächsten Start ohne Sitzung wird er gelöscht. */
function sitzungsSchluesselMerken(){
  if(!sitzung||!sitzung.sid||!tresor.priv){return Promise.resolve();}
  return idbSet('sitzung-schluessel',{sid:sitzung.sid,konto:sitzung.id,priv:tresor.priv}).catch(function(){});
}
function sitzungsSchluesselLoeschen(){return idbSet('sitzung-schluessel',null).catch(function(){}).then(function(){if(cb.schluesselWeg){try{cb.schluesselWeg();}catch(e){}}});}
function angemeldet(s,hinweise){
  var vorher=sitzung&&sitzung.id;
  sitzung={id:s.id,name:s.name,team:s.team,funktion:s.funktion||'',responsable:s.responsable||'',rg:!!s.rg,sid:s.sid||b64(rnd(12))};gesperrt=false;letzteAktivitaet=Date.now();sitzungMerken(sitzung);
  if(s.pub){tresor={id:s.id,pub:s.pub,priv:s.priv||null};geprueftMerken(s.id,s.hash);sitzungsSchluesselMerken();}
  try{localStorage.setItem(ZULETZT,s.id);}catch(e){}
  if(s.roh&&s.roh.fill){s.roh.fill(0);}
  tor(false);
  if(cb.bereit){cb.bereit(oeffentlich(sitzung),hinweise||[]);}
  if(s.pub){letzteSicherung=0;status({art:'bereit'});}
  /* entsperrt: angefangene Formulare wieder zeigen (nur für dieselbe Person) */
  if(pausiert.length){if(vorher===s.id){pausierteZeigen();}else{pausierteVerwerfen();}}
}
function ende(){
  pausierteVerwerfen();if(privatAbbruch){try{privatAbbruch();}catch(e){}}
  sitzung=null;gesperrt=false;tresor={id:null,pub:null,priv:null};sitzungLoeschen();sitzungsSchluesselLoeschen();
  if(cb.abgemeldet){cb.abgemeldet();}
  status({art:'aus'});
  if(konten.length){kontenListe();}else{zeigeVerbinden(null,!!ordner);}
}
/* Abmelden: sichern, dann die App-Daten von diesem PC entfernen */
function abmelden(){
  if(!sitzung){ende();return;}
  var s=sitzung, k;
  tor(true);
  karte('<h2>Abmelden …</h2><p class="sub">Deine Daten werden verschlüsselt im Hub-Ordner gesichert und danach von diesem PC entfernt.</p><div class="warten"><span class="laden dunkel" aria-hidden="true"></span>Einen Moment …</div>');
  if(cb.appsSchliessen){cb.appsSchliessen();}
  ordnerBereit().then(function(){
    k=kontoVon(s.id);if(!k){throw fehler('Dein Konto wurde im Hub-Ordner nicht gefunden');}
    return (tresor.pub&&tresor.id===s.id)?tresor.pub:pubGeprueft(k);
  }).then(function(pub){
    return warte(300).then(momentaufnahme).then(function(snap){
      return griffeMerken(s.id,snap.griffe).then(function(){return sichern(k,pub,snap);});
    });
  }).then(function(r){
    if(r==='fremd'){return r;}   /* gehört nicht (mehr) dieser Person: nicht anfassen */
    return leeren().then(geleertMerken).then(function(){return r;});
  }).then(function(r){if(r==='konflikt'){zeigeKonfliktHinweis();return;}ende();}).catch(function(e){zeigeAbmeldeFehler(e);});
}
/* Beim Abmelden war auf dem Server schon ein neuerer Stand (an einem anderen PC weitergearbeitet):
   die Daten dieses PCs liegen als Kopie bereit – das muss die Person wissen */
function zeigeKonfliktHinweis(){
  karte('<h2>Als Kopie gesichert</h2>'+meldung('Mit deinem Konto wurde inzwischen an einem anderen PC weitergearbeitet. Damit nichts überschrieben wird, liegen deine Änderungen von diesem PC als <b>Kopie</b> bereit.','info')+
    '<p class="sub">Beim nächsten Anmelden findest du sie im Konto-Menü unter „Frühere Stände“ (Kopie: Änderungen von einem anderen PC).</p><button class="btn primary voll" type="button" id="g-ok2">Verstanden</button>');
  $('g-ok2').onclick=ende;
}
function zeigeAbmeldeFehler(e){
  karte('<h2>Nicht gesichert</h2>'+meldung('Deine Daten konnten nicht im Hub-Ordner gesichert werden: '+text(e)+'.')+
    '<p class="sub">Bis das klappt, bleiben sie auf diesem PC. Sie werden beim nächsten Anmelden an diesem PC gesichert — egal von wem.</p>'+
    '<button class="btn primary voll" type="button" id="g-nochmal">Nochmal versuchen</button>'+
    '<div class="knopfreihe" style="margin-top:8px"><button class="btn" type="button" id="g-zurueck">'+(gesperrt?'Zurück':'Zurück zum Hub')+'</button><button class="btn" type="button" id="g-trotzdem">Trotzdem abmelden</button></div>');
  $('g-nochmal').onclick=abmelden;
  /* gesperrt: zurück zum Sperrbildschirm, nie offen in den Hub */
  $('g-zurueck').onclick=function(){if(gesperrt&&sitzung){sperrBildschirm();return;}tor(false);};
  $('g-trotzdem').onclick=ende;
}

/* ---------- Sperre nach Inaktivität ----------
   Als Aktivität zählen nur echte Eingaben (Maus, Tastatur, Touch) – auch in eingebetteten Apps, soweit der Browser
   das erlaubt. Dass eine App Daten speichert, zählt nicht (manche speichern alle paar Sekunden von selbst).
   Eine Minute vor der Sperre erscheint „Noch da?“. */
var VORWARNUNG_MS=60000, vorwarnungSeit=0, sperrGrund='';
function aktiv(){letzteAktivitaet=Date.now();if(vorwarnungSeit){vorwarnungWeg();}if(sitzung&&!gesperrt){sitzungMerken(sitzung);}}
['pointerdown','keydown','wheel','touchstart'].forEach(function(t){document.addEventListener(t,aktiv,{passive:true,capture:true});});
function iframeBeobachten(f){try{var d=f.contentWindow.document;['pointerdown','keydown','wheel','touchstart'].forEach(function(t){d.addEventListener(t,aktiv,{passive:true,capture:true});});}catch(e){}}
document.addEventListener('load',function(e){if(e.target&&e.target.tagName==='IFRAME'){iframeBeobachten(e.target);}},true);
window.addEventListener('storage',function(e){
  if(e.key===MARKE&&sitzung){var m=marke();if(!m||m.konto!==sitzung.id){ende();return;}}   /* in einem anderen Hub-Tab ab- oder umgemeldet */
  if(e.key!==MARKE&&e.key!==GEPRUEFT&&e.key!==ZULETZT){baldSichern();}   /* eine App hat gespeichert: bald sichern */
});
function vorwarnungZeigen(){
  var el=$('g-nochda');
  if(!el){el=document.createElement('div');el.id='g-nochda';el.className='nochda';el.setAttribute('role','alert');document.body.appendChild(el);}
  el.innerHTML='<span id="g-nochda-t">Noch da? In <b id="g-nochda-s">60</b> Sekunden wird der Hub gesperrt.</span><button type="button" class="btn primary" id="g-nochda-ja">Ich bin da</button>';
  el.hidden=false;
}
function vorwarnungWeg(){vorwarnungSeit=0;var el=$('g-nochda');if(el){el.hidden=true;}}
setInterval(function(){
  if(!sitzung||gesperrt){if(vorwarnungSeit){vorwarnungWeg();}return;}
  var ruhe=Date.now()-letzteAktivitaet;
  if(ruhe>=SPERRE_MS){vorwarnungWeg();sperren('Nach '+Math.round(SPERRE_MS/60000)+' Minuten ohne Aktivität gesperrt. Bitte gib dein Passwort ein.');return;}
  if(ruhe<SPERRE_MS-VORWARNUNG_MS){if(vorwarnungSeit){vorwarnungWeg();}return;}
  if(!vorwarnungSeit){vorwarnungSeit=Date.now();vorwarnungZeigen();}
  var z=$('g-nochda-s');if(z){z.textContent=Math.max(1,Math.ceil((SPERRE_MS-ruhe)/1000));}
},5000);
/* Offene Formulare des Hubs schließen (ihre Inhalte wären sonst über dem Sperrbildschirm lesbar). Der Kindmodus bleibt.
   Ein Formular, das das Ereignis „cdse-schliessen“ abfängt (preventDefault), wird nur ausgeblendet und nach dem
   Entsperren wieder gezeigt – ein angefangener Text geht so nicht verloren. Beim Abmelden wird es verworfen. */
var pausiert=[];
function offeneDialogeSchliessen(){
  Array.prototype.forEach.call(document.querySelectorAll('dialog[open]'),function(d){
    if(d.id==='km-dialog'){return;}
    var ev=null;try{ev=new Event('cdse-schliessen',{cancelable:true});d.dispatchEvent(ev);}catch(e){}
    if(ev&&ev.defaultPrevented&&pausiert.indexOf(d)<0){pausiert.push(d);}
    if(d.open){try{d.close();}catch(e){}}
  });
}
function pausierteZeigen(){var l=pausiert;pausiert=[];l.forEach(function(d){if(d.isConnected&&!d.open){try{d.showModal();}catch(e){}}});}
function pausierteVerwerfen(){var l=pausiert;pausiert=[];l.forEach(function(d){try{d.dispatchEvent(new Event('cdse-schliessen'));}catch(e){}if(d.isConnected){d.remove();}});}
function sperren(grund){
  if(!sitzung){return;}
  gesperrt=true;sperrGrund=grund||'Der Hub ist gesperrt. Bitte gib dein Passwort ein.';
  if(privatAbbruch){try{privatAbbruch();}catch(e){}}
  sitzungLoeschen();tresor.priv=null;sitzungsSchluesselLoeschen();
  offeneDialogeSchliessen();
  sperrBildschirm();
}
function sperrBildschirm(){
  var k=kontoVon(sitzung.id)||{id:sitzung.id,name:sitzung.name,team:sitzung.team};
  zeigeAnmelden(k,sperrGrund||'Der Hub ist gesperrt. Bitte gib dein Passwort ein.');
}

/* ---------- Oberfläche ---------- */
function tor(an,modal){var g=$('gate'),h=$('hub');g.hidden=!an;g.classList.toggle('modal',!!(an&&modal));document.documentElement.classList.toggle('tor-offen',!!(an&&!modal));if(h){h.inert=!!an;}}
function karte(html,breit){
  var c=$('gate-card');c.className='gate-card'+(breit?' breit':'');
  c.innerHTML='<div class="gate-brand"><span class="mark">'+ic('hub')+'</span><b>'+esc(S.titel||'CDSE Hub')+'</b></div>'+html;
  var f=c.querySelector('[autofocus]');if(f){setTimeout(function(){f.focus();},40);}
}
function meldung(t,art){return '<div class="meldung '+(art||'fehler')+'" role="'+(art==='info'?'status':'alert')+'">'+ic(art==='info'?'info':'warn')+'<div>'+t+'</div></div>';}
function beschaeftigt(btn,an,t){if(!btn){return;}btn.disabled=an;if(an){btn.setAttribute('data-t',btn.innerHTML);btn.innerHTML='<span class="laden" aria-hidden="true"></span>'+esc(t||'Einen Moment …');}else if(btn.getAttribute('data-t')){btn.innerHTML=btn.getAttribute('data-t');}}
function knopfText(btn){return function(t){if(btn&&btn.disabled){btn.innerHTML='<span class="laden" aria-hidden="true"></span>'+esc(t);}};}
function kontoKopf(k){return '<div class="konto konto-fix">'+ava(k)+'<span><b>'+esc(k.name)+'</b><small>'+esc(team(k.team).name)+'</small></span></div>';}
var FUNKTIONEN=['Erzieher/in (Éducateur/trice gradué/e)','Lehrer/in (Instituteur/trice)','Psychologe/Psychologin','Pädagoge/Pädagogin','Sozialarbeiter/in (Assistant/e social/e)','Logopäde/Logopädin','Ergotherapeut/in','Psychomotoriker/in','Koordination','Direktion'];
function funktionFeld(wert){
  return '<div class="feld"><label for="g-funktion">Deine Funktion</label><input id="g-funktion" list="g-funktionen" autocomplete="off" value="'+esc(wert||'')+'" placeholder="z. B. Erzieher/in, Psychologin …">'+
    '<datalist id="g-funktionen">'+FUNKTIONEN.map(function(f){return '<option value="'+esc(f)+'">';}).join('')+'</datalist></div>';
}
/* Wer ist dein/e Responsable? Auswahl aus allen Konten (ohne das eigene) */
function responsableFeld(wert,ohneId){
  var l=konten.filter(function(k){return k.id!==ohneId;});
  return '<div class="feld"><label for="g-resp">Dein/e Responsable</label><select id="g-resp">'+
    '<option value=""'+(wert==null?' selected':'')+' disabled>– bitte wählen –</option>'+
    l.map(function(k){return '<option value="'+esc(k.id)+'"'+(wert===k.id?' selected':'')+'>'+esc(k.name)+' · '+esc(team(k.team).name)+'</option>';}).join('')+
    '<option value="-"'+(wert==='-'||wert===''?' selected':'')+'>Ich habe keine/n Responsable (z. B. Direktion)</option></select>'+
    '<span class="hilfe">Deine Responsable sieht deinen Einsatzplan: wo du wann arbeitest. Sonst niemand außer der Verwaltung.</span></div>';
}
function gewaehlterResponsable(){var e=$('g-resp');if(!e||e.value===''){return null;}return e.value==='-'?'':e.value;}
function teamWahl(akt){return '<div class="teams" role="radiogroup" aria-label="Team">'+TEAMS.map(function(t){return '<label><input type="radio" name="g-team" value="'+esc(t.id)+'"'+(akt===t.id?' checked':'')+'>'+esc(t.name)+'</label>';}).join('')+'</div>';}
function gewaehltesTeam(){var r=document.querySelector('input[name="g-team"]:checked');return r?r.value:'';}
function pfadHinweis(){try{var p=decodeURIComponent(location.pathname).replace(/^\/([A-Za-z]:)/,'$1').replace(/\//g,'\\');return p.replace(/\\[^\\]*$/,'');}catch(e){return '';}}
function formular(id,fn){var f=$(id);if(f){f.onsubmit=function(e){e.preventDefault();fn(f);};}}
/* Anmelden abschließen: Schlüssel, Daten, fertig */
function weiterMitDaten(s,fortschritt){
  return schluesselBereit(s).then(function(s2){
    return datenAnmelden(s2,fortschritt).then(function(h){angemeldet(s2,h);});
  });
}

function zeigeVerbinden(fehlerText,wiederkehr){
  tor(true);
  if(!window.isSecureContext){karte('<h2>Bitte direkt vom Laufwerk öffnen</h2><p class="sub">Über diese Adresse erlaubt der Browser keine Verschlüsselung. Öffne den Hub per Doppelklick auf <b>hub.html</b> im Hub-Ordner (z. B. O:\\CDSE-Hub).</p>');return;}
  if(!unterstuetzt()){karte('<h2>Bitte Microsoft Edge verwenden</h2><p class="sub">Dieser Browser kann nicht auf den gemeinsamen Ordner zugreifen. Öffne den Hub in <b>Microsoft Edge</b> oder Google Chrome.</p>');return;}
  var pfad=pfadHinweis();
  karte((wiederkehr
    ?'<h2>Willkommen zurück</h2><p class="sub">Edge fragt einmal pro Sitzung, ob der Hub auf den gemeinsamen Ordner zugreifen darf.</p>'
    :'<h2>Mit dem Hub-Ordner verbinden</h2><p class="sub">Konten und Daten liegen im gemeinsamen Ordner auf dem Server. Wähle beim ersten Mal den Ordner, in dem diese Seite liegt'+(pfad?':<br><b>'+esc(pfad)+'</b>':'.')+'</p>')+
    (fehlerText?meldung(fehlerText):'')+
    '<button class="btn primary voll" id="g-ordner" type="button">'+ic('folder')+(wiederkehr?'Zugriff erlauben':'Ordner auswählen')+'</button>');
  $('g-ordner').onclick=function(){
    var b=this;beschaeftigt(b,true,'Verbinde …');
    var p=(wiederkehr&&ordner)?recht(ordner,true).then(function(r){if(r!=='granted'){throw fehler('abgelehnt');}return ordner;}):ordnerWaehlen();
    p.then(function(){return ladeKonten();}).then(function(){zeigeStart();}).catch(function(e){
      beschaeftigt(b,false);
      if(e&&e.name==='AbortError'){return;}
      zeigeVerbinden(e&&e.falscherOrdner?'In diesem Ordner liegt keine <b>hub.html</b>. Bitte den Ordner wählen, in dem der Hub liegt.':'Der Zugriff wurde nicht erlaubt. Ohne Zugriff kann der Hub keine Konten lesen.',!!(wiederkehr&&!(e&&e.falscherOrdner)));
    });
  };
}

function zeigeKonten(){
  tor(true);
  if(!konten.length&&!vorbereitete.length){zeigeErstellen(true);return;}
  /* eingerichtete und vorbereitete Konten (Startcode) in einer Liste, nach Namen */
  var alle=konten.map(function(k){return {k:k,neu:false};}).concat(vorbereitete.map(function(v){return {k:v,neu:true};}))
    .sort(function(a,b){return nachName(a.k,b.k);});
  var viele=alle.length>8;
  karte('<h2>Wer bist du?</h2><p class="sub">Wähle dein Konto.'+(vorbereitete.length?' Neu hier? Klicke auf deinen Namen und gib den Startcode von deinem Zettel ein.':'')+'</p>'+
    (viele?'<div class="feld"><input id="g-suche" type="search" placeholder="Name suchen …" aria-label="Konto suchen" autocomplete="off" autofocus></div>':'')+
    '<div class="konto-liste" id="g-liste">'+
    alle.map(function(x){var k=x.k;return '<button class="konto'+(x.neu?' neu':'')+'" type="button" '+(x.neu?'data-start':'data-id')+'="'+esc(k.id)+'">'+ava(k)+'<span><b>'+esc(k.name)+'</b><small>'+esc(team(k.team).name)+(x.neu?' · erste Anmeldung mit Startcode':'')+'</small></span>'+ic('right')+'</button>';}).join('')+
    '</div><p class="sub" id="g-leer" hidden>Kein Konto mit diesem Namen.</p><button class="btn voll" id="g-neu" type="button">'+ic('plus')+'Neues Konto erstellen</button>');
  Array.prototype.forEach.call(document.querySelectorAll('#gate .konto[data-start]'),function(el){el.onclick=function(){var v=vorbereitetVon(el.getAttribute('data-start'));if(v){zeigeStartcode(v);}};});
  /* Suche: nur im Namen, ohne Akzente, Reihenfolge egal („muster tom“ findet „Tom Muster“); Enter öffnet den ersten Treffer */
  function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss');}
  if(viele){
    $('g-suche').oninput=function(){
      var w=norm(this.value).split(/[^a-z0-9]+/).filter(Boolean), n=0;
      Array.prototype.forEach.call(document.querySelectorAll('#g-liste .konto'),function(el){
        var teile=norm((el.querySelector('b')||el).textContent).split(/[^a-z0-9]+/);
        var an=w.every(function(x){return teile.some(function(t){return t.indexOf(x)===0;});});
        el.hidden=!an;if(an){n++;}
      });
      $('g-leer').hidden=n>0;
    };
    $('g-suche').onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();var t=document.querySelector('#g-liste .konto:not([hidden])');if(t){t.click();}}};
  }
  Array.prototype.forEach.call(document.querySelectorAll('#gate .konto[data-id]'),function(el){el.onclick=function(){zeigeAnmelden(kontoVon(el.getAttribute('data-id')));};});
  $('g-neu').onclick=function(){var b=this;beschaeftigt(b,true,'Einen Moment …');ordnerDa().then(ladeKonten).then(function(){zeigeErstellen(false);},function(){zeigeErstellen(false);});};
}

function zeigeStart(){
  var z=null;try{z=localStorage.getItem(ZULETZT);}catch(e){}
  var k=z&&kontoVon(z);
  if(k){zeigeAnmelden(k);}else{zeigeKonten();}
}

function zeigeAnmelden(k,hinweis,fehlerText){
  tor(true);
  karte(kontoKopf(k)+(hinweis?meldung(hinweis,'info'):'')+(fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate><div class="feld"><label for="g-pw">Passwort</label><input id="g-pw" type="password" autocomplete="off" autofocus></div>'+
    '<button class="btn primary voll" id="g-los" type="submit">Anmelden</button></form>'+
    '<div class="gate-links">'+(gesperrt?'<button type="button" id="g-ab">Abmelden</button>':'<button type="button" id="g-zurueck">← Anderes Konto</button>')+'<button type="button" id="g-vergessen">Passwort vergessen?</button></div>');
  formular('g-form',function(){
    var pw=$('g-pw').value, b=$('g-los'), warten=gebremst(k.id);
    if(warten){zeigeAnmelden(k,hinweis,'Zu viele Versuche. Bitte warte noch '+warten+' Sekunden.');return;}
    if(!pw){zeigeAnmelden(k,hinweis,'Bitte gib dein Passwort ein.');return;}
    beschaeftigt(b,true,'Prüfe …');
    ['g-zurueck','g-vergessen','g-ab'].forEach(function(i){var x=$(i);if(x){x.disabled=true;}});   /* keine zweite Anmeldung dazwischen */
    ordnerBereit().then(function(){return kontoFrisch(k.id);}).then(function(echt){if(!echt){throw fehler('Konto nicht gefunden');}k=echt;return anmeldenMit(k,pw,'passwort');})
      .then(function(s){return weiterMitDaten(s,knopfText(b));})
      .catch(function(e){
        if(e&&e.falsch){fehlversuch(k.id);zeigeAnmelden(k,hinweis,'Das Passwort stimmt nicht.');return;}
        zeigeAnmelden(k,hinweis,'Anmelden ging nicht: '+text(e)+'. Ist der Server erreichbar?');
      });
  });
  if($('g-zurueck')){$('g-zurueck').onclick=kontenListe;}
  if($('g-ab')){$('g-ab').onclick=abmelden;}
  $('g-vergessen').onclick=function(){zeigeVergessen(k);};
}

/* Personen der Teamliste, die noch kein Konto haben (und für die keines vorbereitet ist) */
function offeneTL(){return teamliste.filter(function(p){return !kontoMitNamen(p.name)&&!vorbereitetMitNamen(p.name);});}
function zeigeErstellen(erstes,fehlerText,werte){
  werte=werte||{};tor(true);
  karte('<h2>'+(erstes?'Das erste Konto anlegen':'Neues Konto erstellen')+'</h2>'+
    '<p class="sub">Das Konto wird einmal erstellt. Dein Passwort verschlüsselt deine Daten — niemand sonst kann sie lesen.</p>'+
    (fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate>'+
    '<div class="feld"><label for="g-name">Vor- und Nachname</label><input id="g-name" autocomplete="off" value="'+esc(werte.name||'')+'" autofocus'+(offeneTL().length?' list="g-namen"':'')+'>'+
      (offeneTL().length?'<datalist id="g-namen">'+offeneTL().map(function(p){return '<option value="'+esc(p.name)+'">';}).join('')+'</datalist><span class="hilfe" id="g-tl">Tippe deinen Namen – du stehst wahrscheinlich schon in der Teamliste.</span>':'')+'</div>'+
    (TEAMS.length?'<div class="feld"><span class="label">In welchem Team arbeitest du?</span>'+teamWahl(werte.team)+'</div>':'')+
    funktionFeld(werte.funktion)+responsableFeld(werte.responsable,null)+
    '<div class="feld"><label for="g-pw1">Passwort</label><input id="g-pw1" type="password" autocomplete="off" aria-describedby="g-pw-hilfe"><span class="hilfe" id="g-pw-hilfe">Mindestens 10 Zeichen. Ein kurzer Satz ist leicht zu merken und sicher.</span></div>'+
    '<div class="feld"><label for="g-pw2">Passwort wiederholen</label><input id="g-pw2" type="password" autocomplete="off"></div>'+
    '<button class="btn primary voll" type="submit" id="g-los">Konto erstellen</button></form>'+
    (konten.length?'<div class="gate-links"><button type="button" id="g-zurueck">← Zurück</button><span></span></div>':''),true);
  /* Name aus der Teamliste gewählt: Team, Funktion und Responsable vorausfüllen */
  function tlVorfuellen(){
    var e=teamlisteEintrag($('g-name').value), h=$('g-tl');
    if(!e){if(h){h.textContent='Tippe deinen Namen – du stehst wahrscheinlich schon in der Teamliste.';}return;}
    if(e.team){var r=document.querySelector('input[name="g-team"][value="'+e.team+'"]');if(r){r.checked=true;}}
    if(e.funktion&&!$('g-funktion').value.trim()){$('g-funktion').value=e.funktion;}
    var rs=$('g-resp');
    if(rs&&rs.value===''){var rk=e.responsable&&kontoMitNamen(e.responsable);if(rk){rs.value=rk.id;}else if(e.rolle==='admin'){rs.value='-';}}
    if(h){h.textContent='In der Teamliste: '+[team(e.team).name,e.funktion,e.rolle==='responsable'?'Responsable':''].filter(Boolean).join(' · ')+'. Bitte prüfen und ein eigenes Passwort wählen.';}
  }
  if($('g-tl')){$('g-name').addEventListener('input',tlVorfuellen);$('g-name').addEventListener('change',tlVorfuellen);if(werte.name){tlVorfuellen();}}
  formular('g-form',function(){
    var name=$('g-name').value.trim().replace(/\s+/g,' '), t=gewaehltesTeam(), pw1=$('g-pw1').value, pw2=$('g-pw2').value;
    var fu=$('g-funktion').value.trim().replace(/\s+/g,' '), re=gewaehlterResponsable(), w={name:name,team:t,funktion:fu,responsable:re};
    if(name.length<3){zeigeErstellen(erstes,'Bitte gib deinen Vor- und Nachnamen ein.',w);return;}
    var vb=vorbereitetMitNamen(name);
    if(vb){zeigeStartcode(vb,null,'Für dich hat die Verwaltung schon ein Konto vorbereitet. Gib den Startcode von deinem Zettel ein und wähle dein Passwort.');return;}
    if(kontoMitNamen(name)){zeigeErstellen(erstes,'Es gibt schon ein Konto „'+esc(name)+'“. Melde dich dort an — oder ergänze z. B. einen zweiten Vornamen.',w);return;}
    if(!t&&TEAMS.length){zeigeErstellen(erstes,'Bitte wähle dein Team.',w);return;}
    if(re===null){zeigeErstellen(erstes,'Bitte wähle deine/n Responsable – oder „Ich habe keine/n Responsable“.',w);return;}
    var pr=pwProblem(pw1,name);if(pr){zeigeErstellen(erstes,pr,w);return;}
    if(pw1!==pw2){zeigeErstellen(erstes,'Die beiden Passwörter sind nicht gleich.',w);return;}
    beschaeftigt($('g-los'),true,'Konto wird verschlüsselt …');
    ordnerBereit().then(function(){return kontoErstellen(name,t,pw1,{funktion:fu,responsable:re});}).then(zeigeCode).catch(function(e){
      zeigeErstellen(erstes,'Das Konto konnte nicht gespeichert werden: '+text(e)+'. Ist der Server erreichbar?',w);
    });
  });
  if($('g-zurueck')){$('g-zurueck').onclick=zeigeKonten;}
}

/* ---------- Startcode: von der Verwaltung vorbereitete Konten ----------
   Die Verwaltung legt für jede Person der Teamliste eine Konto-Datei ohne Schlüssel an (Name, Team, Funktion,
   Responsable) und gibt ihr einen Startcode auf Papier. In der Datei liegt der gemeinsame Schlüssel des
   Schülerbereichs – verschlossen mit einem Schlüssel aus dem Startcode (PBKDF2, 12 Zeichen = 60 Bit Zufall).
   Beim ersten Anmelden gibt die Person den Code ein und wählt ihr eigenes Passwort; ihr Browser erzeugt das
   Schlüsselpaar, trägt sie in den Schlüsselring ein (Freischaltung) und entfernt den verschlossenen Schlüssel
   aus der Datei. Die Verwaltung kennt nie das Passwort; die Codes speichert der Hub nirgends. */
var START_ITER=200000;
function startUmschlag(code,bytes){
  var salz=rnd(16);
  return ableiten(codeNorm(code),salz,START_ITER).then(function(k){return versiegeln(k,bytes);})
    .then(function(b){return {kdf:'PBKDF2-SHA256',iter:START_ITER,salz:b64(salz),iv:b.iv,ct:b.ct};});
}
function kontoDateiLesen(id){
  return unterordner(['konten']).then(function(dir){return dateiLesen(dir,id+'.json');}).then(function(t){try{return JSON.parse(t||'null');}catch(e){return null;}});
}
/* Vorbereitete Konto-Datei schreiben – nie über ein eingerichtetes Konto */
function kontoVorbereiten(pl,ueberschreiben){
  if(!istVorbereitet(pl)){return Promise.reject(fehler('Ungültige Vorbereitung'));}
  return ordnerDa().then(function(){return kontoDateiLesen(pl.id);}).then(function(alt){
    if(alt&&!(ueberschreiben&&istVorbereitet(alt))){throw fehler('Für '+pl.name+' gibt es schon eine Konto-Datei.');}
    return unterordner(['konten']).then(function(dir){return dateiSchreiben(dir,pl.id+'.json',JSON.stringify(pl,null,1));});
  }).then(function(){vorbereitete=vorbereitete.filter(function(x){return x.id!==pl.id;}).concat([pl]).sort(nachName);return pl;});
}
function vorbereitungLoeschen(id){
  return ordnerDa().then(function(){return kontoDateiLesen(id);}).then(function(alt){
    if(alt&&!istVorbereitet(alt)){throw fehler('Dieses Konto ist schon eingerichtet.');}
    if(!alt){return;}
    return unterordner(['konten']).then(function(dir){return nochmal(function(){return dir.removeEntry(id+'.json');});});
  }).then(function(){vorbereitete=vorbereitete.filter(function(x){return x.id!==id;});});
}
function zeigeStartcode(v,fehlerText,hinweis){
  tor(true);
  var r=v.responsable&&(kontoVon(v.responsable)||vorbereitetVon(v.responsable));
  var info=[team(v.team).name,v.funktion,r?'Responsable: '+r.name:''].filter(Boolean).join(' · ');
  karte(kontoKopf(v)+'<h2>Erste Anmeldung</h2><p class="sub">Die Verwaltung hat dein Konto vorbereitet. Gib den Startcode von deinem Zettel ein und wähle ein eigenes Passwort – nur du kennst es.</p>'+
    (hinweis?meldung(hinweis,'info'):'')+(fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate>'+
    '<div class="feld"><label for="g-start">Startcode</label><input id="g-start" autocomplete="off" spellcheck="false" autocapitalize="characters" autofocus placeholder="XXXX-XXXX-XXXX" aria-describedby="g-start-hilfe"><span class="hilfe" id="g-start-hilfe">Steht auf deinem Zettel. Bindestriche und Groß-/Kleinschreibung sind egal.</span></div>'+
    '<div class="feld"><label for="g-pw1">Dein Passwort</label><input id="g-pw1" type="password" autocomplete="new-password" aria-describedby="g-pw-hilfe"><span class="hilfe" id="g-pw-hilfe">Mindestens 10 Zeichen. Ein kurzer Satz ist leicht zu merken und sicher.</span></div>'+
    '<div class="feld"><label for="g-pw2">Passwort wiederholen</label><input id="g-pw2" type="password" autocomplete="new-password"></div>'+
    (info?'<p class="hilfe">Aus der Teamliste: '+esc(info)+'. Das kannst du später unter „Profil ändern“ anpassen.</p>':'')+
    '<button class="btn primary voll" type="submit" id="g-los">Konto einrichten</button></form>'+
    '<div class="gate-links"><button type="button" id="g-zurueck">← Anderes Konto</button><span></span></div>');
  formular('g-form',function(){
    var code=$('g-start').value, pw1=$('g-pw1').value, pw2=$('g-pw2').value, b=$('g-los'), warten=gebremst('start:'+v.id);
    if(warten){zeigeStartcode(v,'Zu viele Versuche. Bitte warte noch '+warten+' Sekunden.');return;}
    if(codeNorm(code).length!==12){zeigeStartcode(v,'Der Startcode hat 12 Zeichen, zum Beispiel 7KQ4-M2XP-9HT3.');return;}
    var pr=pwProblem(pw1,v.name);if(pr){zeigeStartcode(v,pr);return;}
    if(pw1!==pw2){zeigeStartcode(v,'Die beiden Passwörter sind nicht gleich.');return;}
    beschaeftigt(b,true,'Prüfe den Startcode …');
    ordnerBereit().then(function(){return startEinloesen(v,code,pw1,knopfText(b));}).then(zeigeCode).catch(function(e){
      if(e&&e.falsch){fehlversuch('start:'+v.id);zeigeStartcode(v,'Der Startcode stimmt nicht. Bitte genau abschreiben.');return;}
      if(e&&e.eingerichtet){var k=kontoVon(v.id);if(k){zeigeAnmelden(k,'Dein Konto ist schon eingerichtet. Bitte melde dich mit deinem Passwort an.');return;}}
      zeigeStartcode(v,text(e));
    });
  });
  $('g-zurueck').onclick=zeigeKonten;
}
/* Startcode einlösen: Konto mit eigenem Passwort erstellen (gleiche ID), selbst freischalten, verschlossenen Schlüssel entfernen */
function startEinloesen(v,code,pw,fortschritt){
  return kontoDateiLesen(v.id).then(function(p){
    if(p&&p.schluessel&&p.profil){
      return ladeKonten().then(function(){var e=fehler('Dieses Konto ist schon eingerichtet.');e.eingerichtet=true;throw e;});
    }
    if(!istVorbereitet(p)){throw fehler('Die Vorbereitung für dieses Konto gibt es nicht mehr. Bitte bei der Verwaltung melden.');}
    if(p.start.bis&&p.start.bis<datumIso(new Date())){throw fehler('Dein Startcode ist am '+p.start.bis.split('-').reverse().join('.')+' abgelaufen. Bitte hol dir bei der Verwaltung einen neuen.');}
    return aufmachen(p.start,codeNorm(code)).then(function(roh){
      var inhalt=JSON.parse(td.decode(roh));roh.fill(0);
      if(fortschritt){fortschritt('Konto wird verschlüsselt …');}
      return kontoErstellen(p.name,p.team,pw,{funktion:p.funktion||'',responsable:p.responsable||'',id:p.id,start:p.start}).then(function(res){
        var orgRoh=inhalt.org?unb64(inhalt.org):null, T=window.CDSE_TEAM;
        if(fortschritt){fortschritt('Freischalten …');}
        var frei=(orgRoh&&T&&T.startFreischalten)
          ?T.startFreischalten({id:res.konto.id,name:res.konto.name,pub:res.s.pub,orgRoh:orgRoh,gen:inhalt.gen|0,rolle:inhalt.rolle,von:p.start.von})
            .then(function(){res.hinweis='Du bist freigeschaltet und kannst gleich mit den Schülerdaten arbeiten.';res.hinweisArt='info';},
                  function(e){res.hinweis='Die Freischaltung für die Schülerdaten übernimmt die Verwaltung ('+((e&&e.message)||e)+').';res.hinweisArt='info';})
          :Promise.resolve();
        /* der verschlossene Schlüssel wird nur einmal gebraucht */
        return frei.then(function(){if(orgRoh){orgRoh.fill(0);}delete res.konto.start;return schreibeKonto(res.konto);}).then(function(){return res;});
      });
    });
  });
}

function druckeCode(k,code){
  var w=window.open('','_blank','width=640,height=760');if(!w){return;}
  w.document.write('<!doctype html><meta charset="utf-8"><title>Wiederherstellungs-Code</title><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#0E1628">'+
    '<h1 style="font-size:22px;margin:0 0 6px">CDSE Hub — Wiederherstellungs-Code</h1>'+
    '<p style="margin:0 0 24px;color:#586277">'+esc(k.name)+' · '+esc(team(k.team).name)+' · erstellt am '+esc(new Date().toLocaleDateString('de-DE'))+'</p>'+
    '<div style="font:600 26px/1.4 Consolas,monospace;letter-spacing:.06em;border:2px dashed #CFD6E0;border-radius:12px;padding:22px;text-align:center">'+esc(code)+'</div>'+
    '<p style="margin:24px 0 0;line-height:1.6">Mit diesem Code setzt du ein neues Passwort, falls du deines vergisst. Er ist der <b>einzige</b> Weg zurück zu deinen Daten.<br>Bewahre ihn sicher auf — nicht am Bildschirm, nicht im selben Ordner wie deine Daten.</p></body>');
  w.document.close();w.focus();try{w.print();}catch(e){}
}
function zeigeCode(res){
  var k=res.konto;
  karte('<h2>Dein Wiederherstellungs-Code</h2>'+
    '<p class="sub">Falls du dein Passwort vergisst, ist dieser Code der <b>einzige</b> Weg zurück zu deinen Daten. Drucke ihn aus oder schreib ihn ab und bewahre ihn sicher auf.</p>'+
    '<div class="codebox" id="g-code">'+esc(res.code)+'</div>'+
    '<div class="knopfreihe"><button class="btn" type="button" id="g-kopie">'+ic('copy')+'Kopieren</button><button class="btn" type="button" id="g-druck">'+ic('print')+'Drucken</button></div>'+
    (res.hinweis?meldung(esc(res.hinweis),res.hinweisArt||'info'):'')+
    '<label class="check"><input type="checkbox" id="g-ok"> Ich habe den Code sicher aufbewahrt.</label>'+
    '<button class="btn primary voll" type="button" id="g-weiter" disabled>Weiter zum Hub</button>',true);
  $('g-kopie').onclick=function(){var b=this;(navigator.clipboard?navigator.clipboard.writeText(res.code):Promise.reject()).then(function(){b.innerHTML=ic('check')+'Kopiert';},function(){b.innerHTML='Bitte abschreiben';});};
  $('g-druck').onclick=function(){druckeCode(k,res.code);};
  $('g-ok').onchange=function(){$('g-weiter').disabled=!this.checked;};
  $('g-weiter').onclick=function(){
    var b=this;beschaeftigt(b,true,'Einen Moment …');
    datenAnmelden(res.s,knopfText(b)).then(function(h){angemeldet(res.s,h);}).catch(function(e){
      karte('<h2>Fast fertig</h2>'+meldung('Dein Konto ist erstellt, aber die Daten ließen sich nicht einrichten: '+text(e)+'.')+'<button class="btn primary voll" type="button" id="g-weiter2">Zur Anmeldung</button>');
      $('g-weiter2').onclick=function(){zeigeAnmelden(k);};
    });
  };
}

function zeigeVergessen(k,fehlerText){
  tor(true);
  karte(kontoKopf(k)+'<h2>Neues Passwort setzen</h2><p class="sub">Gib deinen Wiederherstellungs-Code ein. Groß-/Kleinschreibung und Bindestriche sind egal.</p>'+
    (fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate>'+
    '<div class="feld"><label for="g-code-in">Wiederherstellungs-Code</label><input id="g-code-in" autocomplete="off" spellcheck="false" autofocus placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"></div>'+
    '<div class="feld"><label for="g-pw1">Neues Passwort</label><input id="g-pw1" type="password" autocomplete="off"><span class="hilfe">Mindestens 10 Zeichen.</span></div>'+
    '<div class="feld"><label for="g-pw2">Neues Passwort wiederholen</label><input id="g-pw2" type="password" autocomplete="off"></div>'+
    '<button class="btn primary voll" type="submit" id="g-los">Passwort setzen und anmelden</button></form>'+
    '<div class="gate-links"><button type="button" id="g-zurueck">← Zurück</button><span></span></div>');
  formular('g-form',function(){
    var code=$('g-code-in').value, pw1=$('g-pw1').value, pw2=$('g-pw2').value, warten=gebremst(k.id), b=$('g-los');
    if(warten){zeigeVergessen(k,'Zu viele Versuche. Bitte warte noch '+warten+' Sekunden.');return;}
    if(codeNorm(code).length!==20){zeigeVergessen(k,'Der Code hat 20 Zeichen (ohne Bindestriche).');return;}
    var pr=pwProblem(pw1,k.name);if(pr){zeigeVergessen(k,pr);return;}
    if(pw1!==pw2){zeigeVergessen(k,'Die beiden Passwörter sind nicht gleich.');return;}
    beschaeftigt(b,true,'Prüfe den Code …');
    ordnerBereit().then(function(){return kontoFrisch(k.id);}).then(function(f){k=f||k;return anmeldenMit(k,code,'code');}).then(function(s){
      return passwortSetzen(k,s.roh,pw1).then(function(){return weiterMitDaten(s,knopfText(b));});
    }).catch(function(e){
      if(e&&e.falsch){fehlversuch(k.id);zeigeVergessen(k,'Dieser Code passt nicht zu diesem Konto.');return;}
      zeigeVergessen(k,'Das ging nicht: '+text(e)+'.');
    });
  });
  $('g-zurueck').onclick=function(){zeigeAnmelden(k);};
}

/* Die Frage beim ersten Anmelden an einem PC, auf dem schon App-Daten liegen */
function frageAltbestand(apps,seit){
  var welche=apps.length?' (<b>'+apps.map(esc).join(', ')+'</b>)':'';
  return new Promise(function(res){
    karte('<h2>Daten auf diesem PC</h2>'+
      (seit
        ?'<p class="sub">Seit der letzten Abmeldung am '+esc(new Date(seit).toLocaleDateString('de-DE'))+' wurden an diesem PC Apps <b>ohne Anmeldung</b> benutzt'+welche+'. Hast du darin gearbeitet?</p>'
        :'<p class="sub">Auf diesem PC sind schon Daten aus den Apps gespeichert'+welche+' — aus der Zeit vor den Konten. Gehören sie dir?</p>')+
      '<button class="btn primary voll" type="button" id="g-meins">Ja, in mein Konto übernehmen</button>'+
      '<button class="btn voll" type="button" id="g-nicht" style="margin-top:8px">Nein, auf diesem PC beiseitelegen</button>'+
      '<p class="hilfe" style="margin:14px 0 0">Beiseitegelegte Daten gehen nicht verloren: Wem sie gehören, holt sie sich an diesem PC über das Konto-Menü → <b>Frühere Stände</b>.</p>',true);
    $('g-meins').onclick=function(){beschaeftigt(this,true,'Übernehme …');res('meins');};
    $('g-nicht').onclick=function(){beschaeftigt(this,true,'Lege beiseite …');res('beiseite');};
  });
}

/* ---------- Konto-Menü (angemeldet) ---------- */
function dialogZu(){if(gesperrt&&sitzung){sperrBildschirm();return;}tor(false);}
function zeigePasswortAendern(fehlerText){
  var k=kontoVon(sitzung.id)||{id:sitzung.id,name:sitzung.name,team:sitzung.team};
  tor(true,true);
  karte('<h2>Passwort ändern</h2>'+(fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate>'+
    '<div class="feld"><label for="g-alt">Bisheriges Passwort</label><input id="g-alt" type="password" autocomplete="off" autofocus></div>'+
    '<div class="feld"><label for="g-pw1">Neues Passwort</label><input id="g-pw1" type="password" autocomplete="off"><span class="hilfe">Mindestens 10 Zeichen. Dein Wiederherstellungs-Code bleibt gültig.</span></div>'+
    '<div class="feld"><label for="g-pw2">Neues Passwort wiederholen</label><input id="g-pw2" type="password" autocomplete="off"></div>'+
    '<div class="knopfreihe"><button class="btn" type="button" id="g-abbruch">Abbrechen</button><button class="btn primary" type="submit" id="g-los">Speichern</button></div></form>');
  formular('g-form',function(){
    var alt=$('g-alt').value, pw1=$('g-pw1').value, pw2=$('g-pw2').value;
    var pr=pwProblem(pw1,k.name);if(pr){zeigePasswortAendern(pr);return;}
    if(pw1!==pw2){zeigePasswortAendern('Die beiden neuen Passwörter sind nicht gleich.');return;}
    beschaeftigt($('g-los'),true,'Speichere …');
    ordnerBereit().then(function(){return kontoFrisch(k.id);}).then(function(f){k=f;return anmeldenMit(k,alt,'passwort');}).then(function(s){return passwortSetzen(k,s.roh,pw1).then(function(){s.roh.fill(0);});})
      .then(function(){karte('<h2>Passwort geändert</h2><p class="sub">Ab jetzt meldest du dich mit dem neuen Passwort an.</p><button class="btn primary voll" type="button" id="g-fertig">Fertig</button>');$('g-fertig').onclick=dialogZu;})
      .catch(function(e){zeigePasswortAendern(e&&e.falsch?'Das bisherige Passwort stimmt nicht.':'Das ging nicht: '+text(e)+'.');});
  });
  $('g-abbruch').onclick=dialogZu;
}
function zeigeProfilAendern(fehlerText,werte){
  var k=kontoVon(sitzung.id)||{id:sitzung.id,name:sitzung.name,team:sitzung.team};
  werte=werte||{team:sitzung.team,funktion:sitzung.funktion||k.funktion||'',responsable:sitzung.rg?(sitzung.responsable!=null?sitzung.responsable:k.responsable):null};
  tor(true,true);
  karte('<h2>Profil ändern</h2><p class="sub">Team, Funktion und Responsable. Das Team bestimmt, welche Apps du siehst; deine Responsable sieht deinen Einsatzplan.</p>'+(fehlerText?meldung(fehlerText):'')+
    '<form id="g-form" novalidate>'+(TEAMS.length?'<div class="feld"><span class="label">Team</span>'+teamWahl(werte.team)+'</div>':'')+
    funktionFeld(werte.funktion)+responsableFeld(werte.responsable,sitzung.id)+
    '<div class="feld"><label for="g-alt">Zur Bestätigung: dein Passwort</label><input id="g-alt" type="password" autocomplete="off"></div>'+
    '<div class="knopfreihe"><button class="btn" type="button" id="g-abbruch">Abbrechen</button><button class="btn primary" type="submit" id="g-los">Speichern</button></div></form>',true);
  formular('g-form',function(){
    var w={team:TEAMS.length?gewaehltesTeam():sitzung.team,funktion:$('g-funktion').value.trim().replace(/\s+/g,' '),responsable:gewaehlterResponsable()}, alt=$('g-alt').value;
    if(!w.team){zeigeProfilAendern('Bitte wähle ein Team.',w);return;}
    if(w.responsable===null){zeigeProfilAendern('Bitte wähle deine/n Responsable – oder „Ich habe keine/n Responsable“.',w);return;}
    beschaeftigt($('g-los'),true,'Speichere …');
    ordnerBereit().then(function(){return kontoFrisch(k.id);}).then(function(f){k=f;return anmeldenMit(k,alt,'passwort');}).then(function(s){s.roh.fill(0);return profilSetzen(k,s.dek,s.prof,w);})
      .then(function(){sitzung.team=w.team;sitzung.funktion=w.funktion;sitzung.responsable=w.responsable;sitzung.rg=true;sitzungMerken(sitzung);dialogZu();if(cb.geaendert){cb.geaendert(oeffentlich(sitzung));}})
      .catch(function(e){zeigeProfilAendern(e&&e.falsch?'Das Passwort stimmt nicht.':'Das ging nicht: '+text(e)+'.',w);});
  });
  $('g-abbruch').onclick=dialogZu;
}

/* Frühere Stände: Tagesstände und Kopien auf dem Server, beiseitegelegte Daten auf diesem PC */
function staende(id){
  return datenOrdner(id).then(eintraege).then(function(l){
    return Promise.all(l.filter(function(h){return /\.cdse$/.test(h.name)&&h.name!=='aktuell.cdse';}).map(function(h){
      return h.getFile().then(function(f){return {quelle:'server',datei:h.name,zeit:f.lastModified};});
    }));
  }).then(function(server){
    return idbGet('beiseite').then(function(b){
      var pc=(Array.isArray(b)?b:[]).filter(function(x){return !x.von||x.von===id;}).map(function(x){return {quelle:'pc',id:x.id,zeit:x.zeit,von:x.von};});
      /* nach Zeitpunkt (neueste zuerst): Tagesstände zählen als Ende ihres Tages (Ortszeit), Kopien mit ihrer Dateizeit */
      function wann(e){var m=e.datei&&/^(\d{4})-(\d{2})-(\d{2})\.cdse$/.exec(e.datei);return m?new Date(+m[1],+m[2]-1,+m[3],23,59).getTime():(+e.zeit||0);}
      return pc.concat(server).sort(function(a,b){return wann(b)-wann(a);});
    });
  });
}
function standText(e){
  var d=new Date(e.zeit), wann=d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})+', '+pad(d.getHours())+':'+pad(d.getMinutes())+' Uhr';
  if(e.quelle==='pc'){return e.von?{t:'Deine Daten, an diesem PC beiseitegelegt',w:wann}:{t:'Daten ohne Konto, an diesem PC beiseitegelegt',w:wann};}
  var m=/^(\d{4})-(\d{2})-(\d{2})\.cdse$/.exec(e.datei);
  if(m){var tag=new Date(+m[1],+m[2]-1,+m[3]);return {t:'Stand vom '+tag.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),w:'am Ende des Tages'};}
  if(/^konflikt-/.test(e.datei)){return {t:'Kopie: Änderungen von einem anderen PC',w:wann};}
  if(/^altbestand-/.test(e.datei)){return {t:'Kopie: alte Daten eines PCs',w:wann};}
  if(/^vorher-/.test(e.datei)){return {t:'Kopie: dein Stand vor dem Zurückholen',w:wann};}
  return {t:e.datei,w:wann};
}
function zurueckholen(k,e,priv){
  if(cb.appsSchliessen){cb.appsSchliessen();}
  return warte(300).then(momentaufnahme).then(function(snap){
    return sichern(k,tresor.pub,snap).then(function(){return kopieAblegen(k,tresor.pub,snap,'vorher');});
  }).then(function(){
    if(e.quelle==='server'){
      return datenOrdner(k.id).then(function(dir){return dateiLesen(dir,e.datei);}).then(function(t){
        if(!t){throw fehler('Diese Datei gibt es nicht mehr');}return tresorOeffnen(priv,JSON.parse(t));
      }).then(function(d){return {daten:d,griffe:null};});
    }
    return idbGet('beiseite').then(function(l){
      var x=(Array.isArray(l)?l:[]).filter(function(y){return y.id===e.id;})[0];
      if(!x){throw fehler('Diese Daten gibt es nicht mehr');}
      return {daten:JSON.parse(x.json),griffe:x.griffe};
    });
  }).then(function(q){
    return lokaleGriffe(k.id).then(function(gr){
      var m=marke();
      markeSetzen({konto:k.id,stand:m&&m.konto===k.id?(m.stand|0):0,hash:'',zeit:Date.now(),unvollstaendig:true});
      return leeren().then(function(){return einspielen(q.daten,(q.griffe&&Object.keys(q.griffe).length)?q.griffe:gr);});
    });
  }).then(function(){
    var m=marke();delete m.unvollstaendig;markeSetzen(m);
    return sichern(k,tresor.pub);
  }).then(function(){
    if(e.quelle==='pc'){return idbGet('beiseite').then(function(l){return idbSet('beiseite',(Array.isArray(l)?l:[]).filter(function(y){return y.id!==e.id;}));});}
  });
}
function zeigeStaende(fehlerText){
  tor(true,true);
  karte('<h2>Frühere Stände</h2><div class="warten"><span class="laden dunkel" aria-hidden="true"></span>Suche …</div>',true);
  var k;
  ordnerBereit().then(function(){k=kontoVon(sitzung.id);if(!tresor.pub&&k){return pubGeprueft(k).then(function(p){tresor={id:k.id,pub:p,priv:null};});}})
  .then(function(){return staende(sitzung.id);}).then(function(liste){
    var pw=!tresor.priv&&liste.some(function(e){return e.quelle==='server';});
    karte('<h2>Frühere Stände</h2><p class="sub">Der Hub bewahrt die Stände der letzten 14 Tage auf. Holst du einen zurück, wird dein jetziger Stand vorher als Kopie gesichert.</p>'+
      (fehlerText?meldung(fehlerText):'')+
      (liste.length
        ?'<form id="g-form" novalidate><div class="staende" role="radiogroup" aria-label="Stand">'+liste.map(function(e,i){var x=standText(e);return '<label><input type="radio" name="g-stand" value="'+i+'"><span><b>'+esc(x.t)+'</b><small>'+esc(x.w)+'</small></span></label>';}).join('')+'</div>'+
          (pw?'<div class="feld"><label for="g-alt">Zur Bestätigung: dein Passwort</label><input id="g-alt" type="password" autocomplete="off"></div>':'')+
          '<div class="knopfreihe"><button class="btn" type="button" id="g-abbruch">Abbrechen</button><button class="btn primary" type="submit" id="g-los">Zurückholen</button></div></form>'
        :'<p class="sub">Noch keine früheren Stände. Der erste entsteht, sobald du an einem neuen Tag weiterarbeitest.</p><button class="btn voll" type="button" id="g-abbruch">Schließen</button>'),true);
    $('g-abbruch').onclick=dialogZu;
    formular('g-form',function(){
      var r=document.querySelector('input[name="g-stand"]:checked');if(!r){zeigeStaende('Bitte zuerst einen Stand auswählen.');return;}
      var e=liste[+r.value], b=$('g-los');
      beschaeftigt(b,true,'Hole zurück …');
      var privP=(tresor.priv||e.quelle!=='server')?Promise.resolve(tresor.priv)
        :anmeldenMit(k,$('g-alt').value,'passwort').then(schluesselBereit).then(function(s){s.roh.fill(0);tresor.priv=s.priv;return s.priv;});
      privP.then(function(priv){return zurueckholen(k,e,priv);}).then(function(){
        karte('<h2>Stand zurückgeholt</h2><p class="sub">Die Apps zeigen jetzt den gewählten Stand. Dein vorheriger Stand liegt als Kopie unter „Frühere Stände“.</p><button class="btn primary voll" type="button" id="g-fertig">Fertig</button>');
        $('g-fertig').onclick=function(){dialogZu();if(cb.geaendert){cb.geaendert(oeffentlich(sitzung));}};
        status({art:'gesichert',zeit:Date.now()});
      }).catch(function(x){zeigeStaende(x&&x.falsch?'Das Passwort stimmt nicht.':'Das ging nicht: '+text(x)+'.');});
    });
  }).catch(function(x){
    karte('<h2>Frühere Stände</h2>'+meldung('Die Stände ließen sich nicht lesen: '+text(x)+'.')+'<button class="btn voll" type="button" id="g-abbruch">Schließen</button>',true);
    $('g-abbruch').onclick=dialogZu;
  });
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&sitzung&&!gesperrt){var g=$('gate');if(g&&!g.hidden&&g.classList.contains('modal')&&!g.querySelector('button:disabled')){var ab=$('g-abbruch');if(ab){ab.click();}else{dialogZu();}}}});

/* ---------- Schnittstelle für den gemeinsamen Bereich (Schüler, Einsatzplan) ---------- */
/* Privater Schlüssel der angemeldeten Person. Fehlt er (z. B. nach der Sperre),
   wird einmal das Passwort erfragt. */
var privatLaeuft=null, privatAbbruch=null;   /* eine laufende Passwortabfrage – weitere Aufrufe warten auf dieselbe */
function privat(grund){
  if(!sitzung){return Promise.reject(fehler('Nicht angemeldet'));}
  /* gesperrt: nie eine eigene Passwortabfrage öffnen (sie ließe sich wegklicken) – entsperrt wird nur über den Sperrbildschirm */
  if(gesperrt){var eg=fehler('Der Hub ist gesperrt');eg.abgebrochen=true;return Promise.reject(eg);}
  if(tresor.priv&&tresor.id===sitzung.id){return Promise.resolve(tresor.priv);}
  if(privatLaeuft){return privatLaeuft;}
  var k=kontoVon(sitzung.id);
  if(!k){return Promise.reject(fehler('Dein Konto wurde im Hub-Ordner nicht gefunden'));}
  var p=privatFragen(k,grund);
  privatLaeuft=p;
  p.then(function(){privatLaeuft=null;privatAbbruch=null;},function(){privatLaeuft=null;privatAbbruch=null;});
  return p;
}
function privatFragen(k,grund){
  return new Promise(function(res,rej){
    /* wird der Hub gesperrt, während die Abfrage offen ist: abbrechen (sonst wartet die Aktion dahinter für immer) */
    privatAbbruch=function(){var e=fehler('Abgebrochen');e.abgebrochen=true;rej(e);};
    function zeige(fehlerText){
      tor(true,true);
      karte(kontoKopf(k)+'<h2>Passwort bestätigen</h2><p class="sub">'+esc(grund||'Für die Schülerdaten')+' braucht der Hub einmal dein Passwort.</p>'+(fehlerText?meldung(fehlerText):'')+
        '<form id="g-form" novalidate><div class="feld"><label for="g-pw">Passwort</label><input id="g-pw" type="password" autocomplete="off" autofocus></div>'+
        '<div class="knopfreihe"><button class="btn" type="button" id="g-abbruch">Abbrechen</button><button class="btn primary" type="submit" id="g-los">Bestätigen</button></div></form>');
      formular('g-form',function(){
        var pw=$('g-pw').value, b=$('g-los'), w=gebremst(k.id);
        if(w){zeige('Zu viele Versuche. Bitte warte noch '+w+' Sekunden.');return;}
        if(!pw){zeige('Bitte gib dein Passwort ein.');return;}
        beschaeftigt(b,true,'Prüfe …');
        ordnerBereit().then(function(){return kontoFrisch(k.id);}).then(function(f){k=f||k;return anmeldenMit(k,pw,'passwort');}).then(schluesselBereit).then(function(s2){
          if(s2.roh&&s2.roh.fill){s2.roh.fill(0);}
          tresor={id:s2.id,pub:s2.pub,priv:s2.priv};geprueftMerken(s2.id,s2.hash);sitzungsSchluesselMerken();
          dialogZu();res(s2.priv);
        }).catch(function(e){if(e&&e.falsch){fehlversuch(k.id);zeige('Das Passwort stimmt nicht.');return;}zeige('Das ging nicht: '+text(e)+'.');});
      });
      $('g-abbruch').onclick=function(){dialogZu();var e=fehler('Abgebrochen');e.abgebrochen=true;rej(e);};
    }
    zeige();
  });
}
function oeffentlichesKonto(k){var t=team(k.team);return {id:k.id,name:k.name,team:k.team,teamName:t.name,teamFarbe:t.farbe,funktion:k.funktion||'',responsable:k.responsable||'',hatSchluessel:!!k.oeffentlich};}
function kontoPub(id){var k=kontoVon(id);if(!k||!k.oeffentlich){return Promise.reject(fehler('Für dieses Konto gibt es keinen Schlüssel'));}return pubVon(k.oeffentlich);}
/* Kontrollcode eines Kontos (aus dem Fingerabdruck des öffentlichen Schlüssels).
   Beim Freischalten vergleichen: steht auf beiden Bildschirmen derselbe Code,
   gehört der Schlüssel wirklich dieser Person. */
function kontrollcode(id){
  var k=kontoVon(id);if(!k||!k.oeffentlich){return Promise.resolve('');}
  return crypto.subtle.digest('SHA-256',unb64(k.oeffentlich)).then(function(h){var b=new Uint8Array(h),c='';for(var i=0;i<8;i++){c+=ALPHA.charAt(b[i]&31);if(i===3){c+='-';}}return c;});
}
/* Dateien im Hub-Ordner (ohne Nachfrage; fehlt der Zugriff, zeigt die Seitenleiste den Knopf) */
function ordnerDa(){
  if(!ordner){return Promise.reject(fehler('Kein Zugriff auf den Hub-Ordner'));}
  return recht(ordner,false).then(function(r){if(r!=='granted'){throw fehler('Kein Zugriff auf den Hub-Ordner');}return ordner;});
}
/* ---------- Gemeinsame Dateien: Schreibsperre ----------
   Ohne Server gibt es kein „Datei exklusiv öffnen“ über alle PCs hinweg. Deshalb eine kleine
   Sperrdatei je Ziel (sperren/<ziel>.lock): lesen – fremde gültige Sperre? warten – eigene Sperre
   schreiben – kurz warten – nachlesen; nur wer seine eigene Sperre wiederfindet, schreibt.
   Wer länger arbeitet, gibt alle SPERR_PULS ein Lebenszeichen (puls). Ändert sich eine fremde Sperre
   länger als SPERR_DAUER nicht (gemessen mit der eigenen Uhr), gilt sie als verwaist (PC abgestürzt,
   Laptop zugeklappt). Vor dem Schreiben prüft der Hub, ob er die Sperre noch hat (s.noch()) – ein
   aufgewachter Laptop überschreibt so nicht, was andere inzwischen gespeichert haben. */
var P_SPERREN=['sperren'], SPERR_DAUER=15000, SPERR_PULS=4000, SPERR_BEDENKZEIT=160, SPERR_GEDULD=45000;
function sperrName(ziel){return String(ziel||'').replace(/[^0-9A-Za-z._-]/g,'_').slice(0,80)+'.lock';}
function sperrJson(t){try{return JSON.parse(t||'null');}catch(e){return null;}}
/* nur Konto-ID und Zeitpunkt (keine Namen, keine Schülerdaten) */
function sperrInhalt(token,puls){return JSON.stringify({token:token,puls:puls,von:sitzung?sitzung.id:'',z:new Date().toISOString()});}
function sperreHolen(ziel){
  var name=sperrName(ziel), token=neueSperrId(), start=Date.now(), fremd={};
  function lies(){return speicher.lesen(P_SPERREN,name).then(sperrJson,function(){return null;});}
  function versuch(n){
    return lies().then(function(s){
      if(s&&s.token&&s.token!==token){
        /* fremde Sperre: wie lange sehen wir genau diesen Stand (Token und Lebenszeichen) schon? */
        var stand=s.token+'|'+(s.puls|0);
        if(!fremd[stand]){fremd[stand]=Date.now();}
        if(Date.now()-fremd[stand]<SPERR_DAUER){
          if(Date.now()-start>SPERR_GEDULD){var wer=s.von?kontoVon(s.von):null, e=fehler((wer?wer.name:'Jemand')+' speichert gerade. Bitte gleich noch einmal versuchen.');e.gesperrt=true;throw e;}
          return warte(60+Math.random()*140*Math.min(n,6)).then(function(){return versuch(n+1);});
        }
      }
      return speicher.schreiben(P_SPERREN,name,sperrInhalt(token,0))
        .then(function(){return warte(SPERR_BEDENKZEIT);}).then(lies).then(function(s2){
          if(s2&&s2.token===token){return gehalteneSperre(name,token);}
          return warte(40+Math.random()*160).then(function(){return versuch(n+1);});
        });
    });
  }
  return versuch(1);
}
/* Eine gehaltene Sperre: gibt Lebenszeichen und kann prüfen, ob sie noch gilt */
function gehalteneSperre(name,token){
  var s={name:name,token:token,puls:0,bestaetigt:Date.now(),verloren:false,frei:false,laeuft:null};
  function eigene(){return speicher.lesen(P_SPERREN,name).then(function(t){var x=sperrJson(t);return !!x&&x.token===token;},function(){return false;});}
  s.timer=setInterval(function(){
    if(s.frei||s.verloren||s.laeuft){return;}
    var p=++s.puls;
    s.laeuft=eigene().then(function(ja){
      if(!ja){s.verloren=true;return;}
      if(s.frei){return;}
      return speicher.schreiben(P_SPERREN,name,sperrInhalt(token,p)).then(function(){s.bestaetigt=Date.now();});
    }).catch(function(){}).then(function(){s.laeuft=null;});
  },SPERR_PULS);
  /* Gilt die Sperre noch? Kurz nach dem letzten Lebenszeichen ohne Netzzugriff, sonst nachlesen. */
  s.noch=function(){
    if(s.verloren){return Promise.resolve(false);}
    if(Date.now()-s.bestaetigt<SPERR_DAUER/3){return Promise.resolve(true);}
    return eigene().then(function(ja){if(ja){s.bestaetigt=Date.now();}else{s.verloren=true;}return ja;});
  };
  return s;
}
function sperreFrei(s){
  if(!s){return Promise.resolve();}
  s.frei=true;if(s.timer){clearInterval(s.timer);}
  /* ein gerade laufendes Lebenszeichen abwarten – sonst entstünde die Sperrdatei nach dem Löschen neu */
  return Promise.resolve(s.laeuft).then(function(){return speicher.lesen(P_SPERREN,s.name);}).then(function(t){
    var x=sperrJson(t);
    if(x&&x.token===s.token){return speicher.loeschen(P_SPERREN,s.name);}
  }).catch(function(){});
}
function neueSperrId(){var b=rnd(9),c='';for(var i=0;i<b.length;i++){c+=ALPHA.charAt(b[i]&31);}return c;}
var speicher={
  lesen:function(pfad,name){return ordnerDa().then(function(){return unterordner(pfad);}).then(function(d){return dateiLesen(d,name);});},
  schreiben:function(pfad,name,inhalt){return ordnerDa().then(function(){return unterordner(pfad);}).then(function(d){return dateiSchreiben(d,name,inhalt);});},
  liste:function(pfad){return ordnerDa().then(function(){return unterordner(pfad);}).then(eintraege).then(function(l){return l.map(function(h){return h.name;});});},
  loeschen:function(pfad,name){return ordnerDa().then(function(){return unterordner(pfad);}).then(function(d){return nochmal(function(){return d.removeEntry(name);}).catch(function(e){if(e&&e.name==='NotFoundError'){return;}throw e;});});},
  /* Stand einer Datei (Änderungszeit, Größe) ohne den Inhalt zu lesen; null, wenn es sie nicht gibt */
  info:function(pfad,name){return ordnerDa().then(function(){return unterordner(pfad);}).then(function(d){return dateiInfo(d,name);});},
  /* alle Dateien eines Ordners mit Stand; .datei ist der Datei-Inhalt zum späteren Lesen (text()) */
  listeInfo:function(pfad,filter){
    return ordnerDa().then(function(){return unterordner(pfad);}).then(function(d){
      return eintraege(d).then(function(l){
        l=l.filter(function(h){return !filter||filter.test(h.name);});
        var erg=[], i=0;
        function weiter(){if(i>=l.length){return Promise.resolve();}var h=l[i++];
          return nochmal(function(){return h.getFile();}).then(function(f){erg.push({name:h.name,lastModified:f.lastModified,size:f.size,datei:f});},function(){}).then(weiter);}
        var w=[];for(var n=0;n<Math.min(8,l.length);n++){w.push(weiter());}
        return Promise.all(w).then(function(){return erg;});
      });
    });
  },
  /* Arbeit unter der Schreibsperre ausführen (Sperre wird in jedem Fall wieder freigegeben).
     arbeit(s) bekommt die Sperre; vor dem Schreiben mit s.noch() prüfen, ob sie noch gilt. */
  sperre:function(ziel,arbeit){
    return sperreHolen(ziel).then(function(s){
      return Promise.resolve().then(function(){return arbeit(s);}).then(function(r){return sperreFrei(s).then(function(){return r;});},function(e){return sperreFrei(s).then(function(){throw e;});});
    });
  }
};

/* ---------- Start ---------- */
function start(callbacks){
  cb=callbacks||{};
  var gemerkt=sitzungLesen();
  tor(true);karte('<p class="sub" style="margin:0">Einen Moment …</p>');
  if(!unterstuetzt()){zeigeVerbinden(null,false);return;}
  idbGet(ORDNER_KEY).then(function(h){
    if(h){ordner=h;}
    if(gemerkt){  /* Tab neu geladen: angemeldet bleiben; Sichern braucht den Ordner */
      angemeldet(gemerkt,[]);
      if(!ordner){status({art:'zugriff'});return;}
      return recht(ordner,false).then(function(r){
        if(r!=='granted'){status({art:'zugriff'});return;}
        return ladeKonten().then(tresorWiederaufnehmen);
      });
    }
    sitzungsSchluesselLoeschen();   /* keine Sitzung: ein übrig gebliebener Schlüssel wird entfernt */
    if(!ordner){zeigeVerbinden(null,false);return;}
    return recht(ordner,false).then(function(r){
      if(r==='granted'){return ladeKonten().then(zeigeStart);}
      zeigeVerbinden(null,true);
    });
  }).catch(function(){if(sitzung){status({art:'zugriff'});}else{zeigeVerbinden(null,false);}});
}

return {
  start:start,
  abmelden:abmelden,
  menue:function(aktion){
    if(!sitzung){return;}
    if(aktion==='passwort'){zeigePasswortAendern();}
    else if(aktion==='team'||aktion==='profil'){zeigeProfilAendern();}
    else if(aktion==='staende'){zeigeStaende();}
    else if(aktion==='sperren'){sperren('Du hast den Hub gesperrt. Zum Weiterarbeiten dein Passwort eingeben.');}
    else if(aktion==='abmelden'){abmelden();}
  },
  /* Hub sperren (z. B. Kindmodus „Code vergessen“): wie nach Inaktivität, die Arbeit bleibt erhalten */
  sperren:function(grund){sperren(grund);},
  gesperrt:function(){return !!(sitzung&&gesperrt);},
  /* Knopf "Zugriff erlauben" in der Seitenleiste (braucht einen Klick) */
  zugriff:function(){return ordnerBereit().then(tresorWiederaufnehmen).catch(function(e){status({art:'fehler',text:(e&&e.message)||String(e)});});},
  sichernJetzt:autoSichern,
  /* Ordner für gemeinsame Team-Dateien (z. B. das Klassenbuch) anlegen. Der Zugang
     liegt zusätzlich in IndexedDB "cdse-hub" → "kv" → "team-ordner": Apps können
     ihren Dateidialog damit direkt dort öffnen (showOpenFilePicker({startIn})). */
  teamOrdner:function(name){
    if(!ordner||!name){return Promise.resolve(false);}
    return unterordner(['teams',name]).then(function(h){return idbSet('team-ordner',h).catch(function(){}).then(function(){return true;});},function(){return false;});
  },
  pfad:pfadHinweis,
  team:team,
  initialen:initialen,
  /* für den gemeinsamen Bereich */
  ich:function(){return sitzung?oeffentlich(sitzung):null;},
  konten:function(){return konten.map(oeffentlichesKonto);},
  /* Startcode: vorbereitete Konten (ohne Schlüssel) – nur für die Verwaltung und die Anmeldung */
  vorbereitete:function(){return vorbereitete.map(function(v){var t=team(v.team);return {id:v.id,name:v.name,team:v.team,teamName:t.name,teamFarbe:t.farbe,funktion:v.funktion||'',responsable:v.responsable||'',am:v.start.am||'',von:v.start.von||'',bis:v.start.bis||'',gen:(v.start.gen|0)||1};});},
  neueKontoId:neueKontoId,
  startUmschlag:startUmschlag,
  kontoVorbereiten:kontoVorbereiten,
  vorbereitungLoeschen:vorbereitungLoeschen,
  codeNorm:codeNorm,
  /* Teamliste (vorbereitete Konten) */
  teamliste:function(){return teamliste.map(function(p){return Object.assign({},p);});},
  teamlisteNeu:function(){return ordnerDa().then(teamlisteLesen);},
  teamlisteSpeichern:teamlisteSchreiben,
  teamlisteEintrag:function(n){var e=teamlisteEintrag(n);return e?Object.assign({},e):null;},
  teamlisteParsen:teamlisteParsen,
  namensSchluessel:namensSchluessel,
  kontenNeu:function(){return ordnerDa().then(ladeKonten).then(function(l){return l.map(oeffentlichesKonto);});},
  privat:privat,
  privatDa:function(){return !!(sitzung&&tresor.priv&&tresor.id===sitzung.id);},
  kontoPub:kontoPub,
  kontrollcode:kontrollcode,
  sitzungsId:function(){return sitzung?sitzung.sid:'';},
  speicher:speicher
};
})();
