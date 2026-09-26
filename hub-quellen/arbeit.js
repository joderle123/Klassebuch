/* =====================================================================
   CDSE Hub — Arbeit: Schüler, Dossiers, Einsatzplan, Team, Verwaltung
   ---------------------------------------------------------------------
   Oberfläche zum Modul CDSE_TEAM. Wird vom Hub-Router aufgerufen:
     #/schueler              Liste aller Schüler (aktiv / inaktiv)
     #/schueler/<id>         Dossier eines Schülers
     #/einsatz               Mein Einsatzplan (Wochenplan + Ausnahmen)
     #/team                  Mein Team: wer ist gerade wo (Responsables)
     #/verwaltung            Freischalten, Rollen, Protokoll
   Das Profil eines Schülers kommt aus dem ELDiB-Generator: aus dem DS
   (Aussagen 1-7) Stärken, Schwierigkeiten, was hilft, wann es schwierig
   wird, Bedürfnisse; aus den ELDiB-Einschätzungen die Entwicklungsstufen,
   die für das Alter längst erwarteten Items und die Förderziele (PEI).
   Dafür lädt der Hub apps/ds-motor.js (Text-Motor und Itembank des
   ELDiB-Generators); fehlt die Datei, zeigt das Dossier nur die Fakten.
   ===================================================================== */
window.CDSE_ARBEIT=(function(){
'use strict';
var K=window.CDSE_KONTO, T=window.CDSE_TEAM;
var TEAMS=(window.CDSE_TEAMS||[]).filter(function(t){return t&&t.id;});
var $=function(id){return document.getElementById(id);};
var akt={seite:'',param:''}, filter={status:'aktiv',stelle:'',meine:false,ueber:false,q:''};
var dossierTab='ueberblick', geladen=false, ladeVersprechen=null;
var planEntwurf=null, planDirty=false, teamAnsicht='jetzt', teamDaten=null, teamZeit=0, uhrTimer=null;
var ARTEN={notiz:'Notiz',gespraech_eltern:'Gespräch mit den Eltern',gespraech_schule:'Gespräch mit der Schule',gespraech_kind:'Gespräch mit dem Kind',beobachtung:'Beobachtung',vorfall:'Vorfall / Krise',reunion:'Réunion',massnahme:'Maßnahme',vereinbarung:'Vereinbarung',sonstiges:'Sonstiges'};
var TAETIGKEIT={unterricht:'Unterricht / Klasse',beobachtung:'Beobachtung',gespraech:'Gespräch',diagnostik:'Diagnostik',reunion:'Réunion / Sitzung',buero:'Büro / Dokumentation',fahrt:'Fahrt',anderes:'Anderes'};
var AUSNAHME={urlaub:'Urlaub',krank:'Krank',fortbildung:'Fortbildung',frei:'Frei / Ausgleich',termin:'Anderer Einsatz'};
var TAGE=['So','Mo','Di','Mi','Do','Fr','Sa'], TAGE_LANG=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

/* ---------- Hilfen ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n,c){return '<svg class="ic'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
function pad(n){return (n<10?'0':'')+n;}
function heuteIso(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function datum(iso){if(!iso){return '';}var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);return m?m[3]+'.'+m[2]+'.'+m[1]:iso;}
function datumZeit(iso){if(!iso){return '';}var d=new Date(iso);return isNaN(d)?iso:pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.'+d.getFullYear()+', '+pad(d.getHours())+':'+pad(d.getMinutes());}
/* Kalendertag eines Zeitstempels in Ortszeit (ein reines Datum bleibt, wie es ist) */
function tagVon(iso){if(!iso||/^\d{4}-\d{2}-\d{2}$/.test(iso)){return iso||'';}var d=new Date(iso);return isNaN(d)?String(iso).slice(0,10):d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function alter(geb){if(!geb){return null;}var g=new Date(geb+'T12:00:00'),h=new Date();if(isNaN(g)){return null;}var j=h.getFullYear()-g.getFullYear();if(h.getMonth()<g.getMonth()||(h.getMonth()===g.getMonth()&&h.getDate()<g.getDate())){j--;}return j;}
function team(id){return K.team(id);}
function ini(n){return K.initialen(n);}
function ava(name,farbe,klein){return '<span class="ava'+(klein?' klein':'')+'" style="--tc:'+esc(farbe||'#586277')+'">'+esc(ini(name))+'</span>';}
function konto(id){return K.konten().filter(function(k){return k.id===id;})[0]||null;}
function kname(id){var k=konto(id);return k?k.name:'(unbekannt)';}
function schuelerName(p){p=p||{};return ((p.nachname||'').toUpperCase()+(p.vorname?' '+p.vorname:'')).trim()||'(ohne Namen)';}
function schuelerNameKurz(p){p=p||{};return ((p.vorname||'')+' '+(p.nachname||'')).trim()||'(ohne Namen)';}
function kopf(ov,titel,lead,rechts){return '<header class="head"><div><p class="overline">'+esc(ov)+'</p><h1>'+titel+'</h1>'+(lead?'<p class="lead">'+lead+'</p>':'')+'</div>'+(rechts||'')+'</header>';}
function karte(inhalt,kl){return '<div class="ar-karte'+(kl?' '+kl:'')+'">'+inhalt+'</div>';}
function hinweis(t,art){return '<div class="callout'+(art==='info'?' info':'')+'">'+svg(art==='info'?'info':'warn')+'<div>'+t+'</div></div>';}
function laedt(t){return '<div class="ar-laedt"><span class="laden dunkel" aria-hidden="true"></span>'+esc(t||'Lade …')+'</div>';}
function fehlerText(e){return esc((e&&e.message)||String(e));}
function body(){return $('arbeit-body');}
function setzen(html){var b=body();if(b){b.innerHTML=html;}}
/* Kurze Rückmeldung unten; Fehler (fehler=true) bleiben länger stehen und lassen sich wegklicken */
function toast(t,fehler){
  Array.prototype.forEach.call(document.querySelectorAll('.ar-toast'),function(x){x.remove();});
  var el=document.createElement('div');el.className='ar-toast'+(fehler?' fehler':'');el.setAttribute('role',fehler?'alert':'status');el.textContent=t;
  if(fehler){el.title='Zum Schließen klicken';el.onclick=function(){el.remove();};}
  document.body.appendChild(el);
  var ms=fehler?9000:2600;setTimeout(function(){el.classList.add('weg');},ms);setTimeout(function(){el.remove();},ms+600);
}
function fehlerToast(e){if(e&&e.abgebrochen){return;}toast((e&&e.message)||String(e),true);}
function stelleChip(id){var t=team(id);return '<span class="ar-stelle" style="--tc:'+esc(t.farbe)+'">'+esc(t.name)+'</span>';}
function motorDa(){return typeof DsText!=='undefined'&&typeof DS_AUFBAU!=='undefined'&&typeof DS_TEXTE!=='undefined';}

/* ---------- Dialog ---------- */
function dialog(titel,inhalt,knoepfe,opt){
  opt=opt||{};
  return new Promise(function(res){
    var d=document.createElement('dialog');d.className='ar-dialog'+(opt.breit?' breit':'');
    d.innerHTML='<form method="dialog" novalidate><h2>'+esc(titel)+'</h2><div class="ar-dialog-inhalt">'+inhalt+'</div><p class="ar-dialog-fehler" hidden></p>'+
      '<div class="ar-knoepfe">'+(knoepfe||[{text:'Schließen',wert:''}]).map(function(k){return '<button class="btn'+(k.primaer?' primary':'')+(k.gefahr?' gefahr':'')+'" value="'+esc(k.wert)+'"'+(k.primaer?' type="submit"':' type="button"')+'>'+esc(k.text)+'</button>';}).join('')+'</div></form>';
    document.body.appendChild(d);
    var form=d.querySelector('form'), fertig=false, laeuft=false, pause=false, anfang=null;
    function werte(){var o={};Array.prototype.forEach.call(form.elements,function(el){if(!el.name){return;}if(el.type==='checkbox'){o[el.name]=el.checked;}else if(el.type==='radio'){if(el.checked){o[el.name]=el.value;}}else{o[el.name]=el.value;}});return o;}
    /* Geschriebener Text, der beim Abbrechen verloren ginge (Auswahlfelder sind schnell wieder gesetzt) */
    function textGeaendert(){
      if(!anfang){return false;}
      return Array.prototype.some.call(form.querySelectorAll('textarea[name],input[name]'),function(el){
        if(el.tagName==='INPUT'&&!/^(text|search|email|tel|url)$/.test(el.type)){return false;}
        return String(el.value||'').trim()!==String(anfang[el.name]==null?'':anfang[el.name]).trim();
      });
    }
    function zu(w){if(fertig){return;}fertig=true;if(d.open){d.close();}d.remove();res(w);}
    function knoepfeAn(an){Array.prototype.forEach.call(form.querySelectorAll('.ar-knoepfe button'),function(x){x.disabled=!an;});}
    d.fehler=function(t){var p=d.querySelector('.ar-dialog-fehler');p.textContent=t;p.hidden=!t;if(t&&p.scrollIntoView){p.scrollIntoView({block:'nearest'});}};
    /* Abbrechen (Knopf ohne Wert oder Esc): während des Speicherns nicht; angefangenen Text nicht ohne Rückfrage verwerfen */
    function abbrechen(){
      if(laeuft){return;}
      if(textGeaendert()&&d.dataset.verwerfen!=='1'){d.dataset.verwerfen='1';d.fehler('Du hast etwas geschrieben, das noch nicht gespeichert ist. Nochmal „'+((form.querySelector('.ar-knoepfe button[value=""]')||{}).textContent||'Abbrechen')+'“ (oder Esc), um es zu verwerfen.');return;}
      zu({aktion:'',werte:werte()});
    }
    form.addEventListener('input',function(){if(d.dataset.verwerfen==='1'){d.dataset.verwerfen='';d.fehler('');}});
    Array.prototype.forEach.call(form.querySelectorAll('.ar-knoepfe button'),function(b){
      b.addEventListener('click',function(ev){
        ev.preventDefault();
        if(laeuft){return;}
        if(!b.value){abbrechen();return;}
        /* anfang = Werte beim Öffnen: damit speichern Formulare nur, was wirklich geändert wurde */
        var w={aktion:b.value,werte:werte(),anfang:anfang,dialog:d};
        if(opt.pruefen){var f=opt.pruefen(w);if(f){d.fehler(f);return;}}
        if(opt.ausfuehren){
          laeuft=true;knoepfeAn(false);d.fehler('');var alt=b.textContent;b.innerHTML='<span class="laden" aria-hidden="true"></span>'+esc(alt);
          /* nach dem Entsperren ist der Schülerbereich erst wieder zu öffnen */
          Promise.resolve().then(function(){return (geladen&&T.zustand().art==='unbekannt')?bereichLaden(false,true).catch(function(){}):null;})
            .then(function(){return opt.ausfuehren(w);})
            .then(function(r){laeuft=false;zu({aktion:b.value,werte:w.werte,ergebnis:r});},
              function(e){laeuft=false;knoepfeAn(true);b.textContent=alt;if(e&&e.abgebrochen){return;}d.fehler((e&&e.message)||String(e));});
          return;
        }
        zu({aktion:b.value,werte:w.werte});
      });
    });
    form.addEventListener('submit',function(ev){ev.preventDefault();var p=form.querySelector('button[type=submit]');if(p){p.click();}});
    d.addEventListener('cancel',function(ev){ev.preventDefault();abbrechen();});
    /* Hub wird gesperrt: nur ausblenden (nach dem Entsperren geht es weiter); beim Abmelden verwerfen */
    d.addEventListener('cdse-schliessen',function(ev){if(ev.cancelable){ev.preventDefault();pause=true;return;}laeuft=false;zu({aktion:'',werte:werte()});});
    /* ohne unser Zutun geschlossen (z. B. zweimal Esc): wie Abbrechen – außer beim Sperren oder Speichern */
    d.addEventListener('close',function(){if(pause){pause=false;return;}if(!fertig&&!laeuft){zu({aktion:'',werte:werte()});}});
    if(opt.nachAufbau){opt.nachAufbau(d);}
    anfang=werte();
    d.showModal();
    var f=d.querySelector('[autofocus]')||d.querySelector('input,select,textarea');if(f){f.focus();}
  });
}
function feld(name,label,wert,typ,extra){return '<label class="ar-feld"><span>'+esc(label)+'</span><input name="'+name+'" type="'+(typ||'text')+'" value="'+esc(wert==null?'':wert)+'"'+(extra||'')+'></label>';}
function auswahl(name,label,wert,optionen,leer){return '<label class="ar-feld"><span>'+esc(label)+'</span><select name="'+name+'">'+(leer!=null?'<option value="">'+esc(leer)+'</option>':'')+optionen.map(function(o){return '<option value="'+esc(o[0])+'"'+(String(o[0])===String(wert==null?'':wert)?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select></label>';}
function textfeld(name,label,wert,zeilen){return '<label class="ar-feld voll"><span>'+esc(label)+'</span><textarea name="'+name+'" rows="'+(zeilen||4)+'">'+esc(wert||'')+'</textarea></label>';}
function teamOptionen(){return TEAMS.map(function(t){return [t.id,t.name];});}
/* Stellen = Teams, die Schüler begleiten (nicht z. B. die Direction) */
var STELLEN=TEAMS.filter(function(t){return t.stelle!==false;});
function stellenOptionen(){return STELLEN.map(function(t){return [t.id,t.name];});}
function eigeneStelle(me){return STELLEN.some(function(t){return t.id===me.team;})?me.team:'diagnostique';}
/* Personen, die Schülerdaten lesen können – nur sie kommen für Schreibrechte und Fallverantwortung in Frage */
function freieKonten(){return T.zustand().art==='bereit'?T.mitglieder().filter(function(k){return k.freigeschaltet;}):K.konten();}
/* Suchfeld über einer langen Auswahl (select) oder Liste (.ar-checkliste): blendet Unpassendes aus */
function suchfeld(ziel,platzhalter){return '<input type="search" class="ar-suchfeld" data-suche="'+esc(ziel)+'" placeholder="'+esc(platzhalter||'Name suchen …')+'" autocomplete="off" aria-label="'+esc(platzhalter||'Name suchen')+'">';}
function suchfelderVerbinden(dlg){
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-suche]'),function(inp){
    inp.addEventListener('input',function(){
      var w=suchWoerter(inp.value), ziel=inp.getAttribute('data-suche'), sel=dlg.querySelector('select[name="'+ziel+'"]');
      if(sel){Array.prototype.forEach.call(sel.options,function(o){if(!o.value){return;}o.hidden=!w.every(function(x){return suchNorm(o.textContent).indexOf(x)>=0;});});var sicht=Array.prototype.filter.call(sel.options,function(o){return o.value&&!o.hidden;});if(sicht.length===1){sel.value=sicht[0].value;}return;}
      var box=dlg.querySelector('#'+ziel);if(!box){return;}
      Array.prototype.forEach.call(box.querySelectorAll('label'),function(l){var an=l.querySelector('input:checked');l.hidden=!an&&!w.every(function(x){return suchNorm(l.textContent).indexOf(x)>=0;});});
    });
    inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();}});
  });
}
function kontoOptionen(filterFn){return freieKonten().filter(filterFn||function(){return true;}).sort(function(a,b){return a.name.localeCompare(b.name,'de');}).map(function(k){return [k.id,k.name+' · '+k.teamName];});}

/* ---------- Laden des Bereichs ---------- */
function bereichLaden(neu,leise){
  var z0=T.zustand().art;
  if(!neu&&geladen&&z0!=='unbekannt'&&!(z0==='gesperrt'&&!leise)){return Promise.resolve(T.zustand());}
  if(ladeVersprechen&&!neu){return ladeVersprechen;}
  ladeVersprechen=K.kontenNeu().catch(function(){return K.konten();}).then(function(){return T.laden({leise:!!leise});}).then(function(z){geladen=true;ladeVersprechen=null;navNeu();return z;},function(e){ladeVersprechen=null;throw e;});
  return ladeVersprechen;
}
/* Nach dem Anmelden im Hintergrund: Menü (Verwaltung, Mein Team) aktuell halten */
function vorladen(){return bereichLaden(false,true).catch(function(){});}
function navNeu(){if(window.CDSE_HUB_NAV){window.CDSE_HUB_NAV();}}

/* ---------- Seitenleiste ---------- */
function zeigtTeam(){var me=K.ich();if(!me){return false;}if(T.zustand().art==='bereit'&&T.istResponsable()){return true;}return K.konten().some(function(k){return k.responsable===me.id;});}
function navHtml(aktiv){
  var me=K.ich();if(!me){return '';}
  var z=T.zustand(), w=(z.art==='bereit'&&T.darfFreischalten())?T.wartende().length:0;
  function lnk(seite,titel,icon,zahl){
    return '<a class="lnk'+(aktiv===seite?' active':'')+'" href="#/'+seite+'" data-route="arbeit-'+seite+'" title="'+esc(titel)+'"><span class="lic">'+svg(icon)+'</span><span class="lnk-t">'+esc(titel)+(zahl?'<span class="ar-zahl">'+zahl+'</span>':'')+'</span></a>';
  }
  return '<div class="navlabel">Arbeit</div><div class="navsep"></div>'+
    lnk('schueler','Schüler','schueler')+((z.art==='bereit'&&window.CDSE_SCREENING)?lnk('screening','Screening','test'):'')+lnk('einsatz','Mein Einsatzplan','uhr')+
    (zeigtTeam()?lnk('team','Mein Team','team'):'')+
    ((z.art==='bereit'&&T.istResponsable()&&window.CDSE_DATENBANK)?lnk('datenbank','Datenbank','daten'):'')+
    ((z.art==='bereit'&&T.darfFreischalten())?lnk('verwaltung','Verwaltung','schild',w):'');
}

/* =====================================================================
   Zustände des Schülerbereichs
   ===================================================================== */
function zustandsKarte(z){
  if(z.art==='kein-bereich'){
    return karte('<h2>Der Schülerbereich ist noch nicht eingerichtet</h2><p>Hier liegen später alle Schülerdossiers des CDSE – verschlüsselt im Hub-Ordner. Wer ihn einrichtet, wird <b>Verwaltung</b>: Sie oder er schaltet die Kolleginnen und Kollegen frei und vergibt die Rolle „Responsable“.</p>'+
      '<button class="btn primary" type="button" data-ar="einrichten">'+svg('schild')+'Schülerbereich einrichten</button>','ar-leer');
  }
  if(z.art==='wartet'){
    return karte('<h2>Noch nicht freigeschaltet</h2><p>Schülerdaten sind verschlüsselt. Damit du sie lesen kannst, muss dich eine <b>Responsable</b> oder die <b>Verwaltung</b> freischalten.</p>'+
      '<p>Nenne ihr diesen <b>Kontrollcode</b>. Sie sieht denselben Code bei deinem Konto und weiß so, dass es wirklich deins ist:</p><div class="codebox" id="ar-mein-code">…</div>'+
      '<button class="btn" type="button" data-ar="neu-laden">'+svg('reload')+'Nochmal prüfen</button>','ar-leer');
  }
  if(z.art==='gesperrt'){return karte('<h2>Schülerdaten gesperrt</h2><p>Für die Schülerdaten braucht der Hub dein Passwort.</p><button class="btn primary" type="button" data-ar="neu-laden">Passwort eingeben</button>','ar-leer');}
  return karte('<h2>Der Schülerbereich ließ sich nicht öffnen</h2>'+hinweis(fehlerText(z.text||z))+'<button class="btn" type="button" data-ar="neu-laden">'+svg('reload')+'Nochmal versuchen</button>','ar-leer');
}
function meinenCodeZeigen(){var el=$('ar-mein-code');if(el){K.kontrollcode(K.ich().id).then(function(c){el.textContent=c||'—';});}}

/* =====================================================================
   Schülerliste
   ===================================================================== */
function seiteSchueler(neu){
  var suche='<label class="search"><svg class="ic"><use href="#i-search"/></svg><input id="ar-q" type="search" placeholder="Name, Klasse, Schule …" autocomplete="off" aria-label="Schüler suchen" value="'+esc(filter.q)+'"></label>';
  setzen(kopf('Arbeit','Schüler','Alle Schülerinnen und Schüler des CDSE – aktiv und ehemalig. Jede und jeder im CDSE kann die Dossiers lesen; bearbeiten dürfen die Zuständigen.',suche)+'<div id="ar-liste">'+laedt('Lade Schülerdossiers …')+'</div>');
  var q=$('ar-q'), qTimer=null;
  if(q){q.oninput=function(){filter.q=q.value;clearTimeout(qTimer);qTimer=setTimeout(function(){listeZeichnen(letzteListe);},120);};
    q.onkeydown=function(e){if(e.key==='Enter'){var z=document.querySelector('#ar-liste a.ar-zeile');if(z){z.click();}}if(e.key==='Escape'&&q.value){q.value='';filter.q='';listeZeichnen(letzteListe);}};}
  bereichLaden(neu).then(function(z){
    if(z.art!=='bereit'){$('ar-liste').innerHTML=zustandsKarte(z);meinenCodeZeigen();return;}
    return T.alleDossiers(neu).then(function(l){letzteListe=l;listeZeichnen(l);});
  }).catch(function(e){$('ar-liste').innerHTML=zustandsKarte({art:'fehler',text:(e&&e.message)||String(e)});});
}
var letzteListe=null;
function meineDossier(d,me){return (d.verantwortlich||[]).indexOf(me.id)>=0||!!(d.rechte&&d.rechte[me.id]);}
/* Suche: jedes Wort muss vorkommen (Groß-/Kleinschreibung und Akzente egal) */
function suchNorm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function suchWoerter(q){return suchNorm(q).split(/\s+/).filter(Boolean);}
function passtSuche(d,w){
  if(!w.length){return true;}
  var p=d.person||{}, h=suchNorm([p.nachname,p.vorname,p.klasse,p.schule,p.matricule,datum(p.geburtsdatum),team(d.stelle).name,(d.verantwortlich||[]).map(kname).join(' ')].join(' '));
  return w.every(function(x){return h.indexOf(x)>=0;});
}
function listeZeichnen(l){
  var el=$('ar-liste');if(!el||!l){return;}
  var me=K.ich(), qw=suchWoerter(filter.q);
  var zaehl={aktiv:0,inaktiv:0,alle:l.length}, stellen={};
  l.forEach(function(d){zaehl[d.status==='inaktiv'?'inaktiv':'aktiv']++;});
  var sicht=l.filter(function(d){
    if(filter.status!=='alle'&&(d.status==='inaktiv'?'inaktiv':'aktiv')!==filter.status){return false;}
    stellen[d.stelle]=(stellen[d.stelle]||0)+1;
    if(filter.stelle&&d.stelle!==filter.stelle){return false;}
    if(filter.meine&&!meineDossier(d,me)){return false;}
    if(filter.ueber){var k=eldibKurz(d);if(!k||!k.ueber){return false;}}
    if(!passtSuche(d,qw)){return false;}
    return true;
  }).sort(function(a,b){return schuelerName(a.person).localeCompare(schuelerName(b.person),'de');});
  var wart=T.darfFreischalten()?T.wartende().length:0;
  var h='';
  if(wart){h+=hinweis('<b>'+wart+(wart===1?' Konto wartet':' Konten warten')+' auf Freischaltung.</b> <a href="#/verwaltung">Zur Verwaltung</a>','info');}
  if(l.kaputt){h+=hinweis(l.kaputt+' Dossier-Datei(en) ließen sich nicht öffnen. Bitte die Verwaltung informieren.');}
  h+='<div class="toolbar ar-toolbar"><div class="catbar">'+
    [['aktiv','Aktiv'],['inaktiv','Inaktiv'],['alle','Alle']].map(function(s){return '<button class="catchip'+(filter.status===s[0]?' on':'')+'" type="button" data-filter-status="'+s[0]+'">'+s[1]+'<span class="n">'+zaehl[s[0]]+'</span></button>';}).join('')+
    '<span class="ar-trenner"></span>'+
    '<button class="catchip'+(!filter.stelle?' on':'')+'" type="button" data-filter-stelle="">Alle Stellen</button>'+
    STELLEN.map(function(t){return '<button class="catchip'+(filter.stelle===t.id?' on':'')+'" type="button" data-filter-stelle="'+esc(t.id)+'">'+esc(t.name)+(stellen[t.id]?'<span class="n">'+stellen[t.id]+'</span>':'')+'</button>';}).join('')+
    '<span class="ar-trenner"></span><button class="catchip'+(filter.meine?' on':'')+'" type="button" data-filter-meine="1">'+svg('check')+'Nur meine</button>'+
    (bankDa()?'<button class="catchip'+(filter.ueber?' on':'')+'" type="button" data-filter-ueber="1" title="Schüler mit ELDiB-Items, die für ihr Alter längst erwartet werden">'+svg('warn')+'Überfällige Items</button>':'')+'</div>'+
    '<span class="ar-knopfreihe"><button class="btn" type="button" data-ar="fiche-hochladen" title="Aus einer Fiche de renseignement (.docx) ein Dossier anlegen oder aktualisieren">'+svg('hoch')+'Fiche hochladen</button>'+
    '<button class="btn primary" type="button" data-ar="neu">'+svg('plus')+'Neuer Schüler</button></span></div>'+
    (window.CDSE_KB_UEBERNAHME?'<div id="ar-kbu"></div>':'');
  /* gesucht, aber nur bei den Inaktiven (oder Aktiven) gefunden: darauf hinweisen */
  var anderswo=(qw.length&&filter.status!=='alle')?l.filter(function(d){return (d.status==='inaktiv'?'inaktiv':'aktiv')!==filter.status&&passtSuche(d,qw);}).length:0;
  if(anderswo){h+=hinweis(anderswo+(anderswo===1?' Treffer':' Treffer')+' bei den <b>'+(filter.status==='aktiv'?'Inaktiven':'Aktiven')+'</b>. <button class="ar-link" type="button" data-filter-status="alle">Alle zeigen</button>','info');}
  if(!sicht.length){
    h+=karte(l.length?'<p>Keine Schüler für diese Auswahl'+(qw.length?' und die Suche „'+esc(filter.q.trim())+'“':'')+'.</p>':'<h2>Noch keine Dossiers</h2><p>Meist beginnt ein Dossier beim Diagnostique: <b>„Neuer Schüler“</b> anlegen, dann das Profil aus dem DS des ELDiB-Generators übernehmen.</p>','ar-leer');
  }else{
    h+='<div class="ar-tabelle" role="table" aria-label="Schüler"><div class="ar-zeile kopf" role="row"><span role="columnheader">Name</span><span role="columnheader">Klasse · Schule</span><span role="columnheader">Stelle</span><span role="columnheader">Fallverantwortlich</span><span role="columnheader">Geändert</span></div>'+
      sicht.map(function(d){
        var p=d.person||{}, a=alter(p.geburtsdatum), r=T.rechte(d), k=eldibKurz(d);
        var klein=[a!=null?a+' Jahre':'',d.status==='inaktiv'?'inaktiv':'',k&&k.ziele?k.ziele+(k.ziele>1?' Förderziele':' Förderziel'):'',r.bearbeiten?'<span class="ar-recht">bearbeitbar</span>':'',
          k&&k.ueber?'<span class="ar-ueb-mini" title="'+k.ueber+' ELDiB-Items sind für das Alter längst erwartet und noch nicht erreicht'+(k.ohneZiel?', '+k.ohneZiel+' davon noch ohne Förderziel':'')+'">'+svg('warn')+k.ueber+' überfällig</span>':''].filter(Boolean);
        return '<a class="ar-zeile'+(d.status==='inaktiv'?' inaktiv':'')+'" role="row" href="#/schueler/'+esc(d.id)+'">'+
          '<span role="cell" class="ar-name">'+ava(schuelerNameKurz(p),team(d.stelle).farbe)+'<span><b>'+esc(schuelerName(p))+'</b><small>'+klein.join(' · ')+'</small></span></span>'+
          '<span role="cell">'+esc([p.klasse,p.schule].filter(Boolean).join(' · ')||'—')+'</span>'+
          '<span role="cell">'+stelleChip(d.stelle)+'</span>'+
          '<span role="cell">'+esc((d.verantwortlich||[]).map(kname).join(', ')||'—')+'</span>'+
          '<span role="cell" class="ar-leise">'+esc(datum(tagVon(d.geaendert)))+'</span></a>';
      }).join('')+'</div>';
  }
  el.innerHTML=h;
  /* Daten aus Klassenbuch oder Journal, die noch nicht im Hub stehen */
  if(window.CDSE_KB_UEBERNAHME){try{window.CDSE_KB_UEBERNAHME.karte($('ar-kbu'),l);}catch(e){}}
}
function neuerSchueler(){
  var me=K.ich();
  var inhalt='<div class="ar-raster2">'+feld('nachname','Nachname','','text',' required autofocus autocomplete="off"')+feld('vorname','Vorname','','text',' required autocomplete="off"')+
    feld('geburtsdatum','Geburtsdatum','','date')+auswahl('geschlecht','Geschlecht','',[['m','Junge'],['w','Mädchen']],'–')+
    feld('schule','Schule','','text',' autocomplete="off"')+feld('klasse','Klasse / Cycle','','text',' autocomplete="off"')+
    feld('matricule','Matricule (Sozialversicherungsnummer)','','text',' autocomplete="off"')+
    auswahl('stelle','Zuständige Stelle',eigeneStelle(me),stellenOptionen())+'</div>'+
    '<p class="ar-klein">Du wirst fallverantwortlich und kannst später anderen ein Schreibrecht geben oder den Schüler an eine andere Stelle weitergeben.</p>';
  dialog('Neuer Schüler',inhalt,[{text:'Abbrechen',wert:''},{text:'Anlegen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){
      if(!w.werte.nachname.trim()||!w.werte.vorname.trim()){return 'Bitte Vor- und Nachname eingeben.';}
      var doppelt=(letzteListe||[]).filter(function(d){var p=d.person||{};return String(p.nachname).toLowerCase()===w.werte.nachname.trim().toLowerCase()&&String(p.vorname).toLowerCase()===w.werte.vorname.trim().toLowerCase()&&(!w.werte.geburtsdatum||!p.geburtsdatum||p.geburtsdatum===w.werte.geburtsdatum);})[0];
      if(doppelt&&!w.dialog.dataset.bestaetigt){w.dialog.dataset.bestaetigt='1';return 'Es gibt schon ein Dossier für '+schuelerName(doppelt.person)+'. Nochmal „Anlegen“ klicken, wenn es wirklich ein anderer Schüler ist.';}
      return '';
    },
    ausfuehren:function(w){
      var v=w.werte;
      return T.neuesDossier({nachname:v.nachname.trim(),vorname:v.vorname.trim(),geburtsdatum:v.geburtsdatum,geschlecht:v.geschlecht,schule:v.schule.trim(),klasse:v.klasse.trim(),matricule:v.matricule.trim()},{stelle:v.stelle});
    }
  }).then(function(r){if(r.ergebnis){if(letzteListe){letzteListe.push(r.ergebnis);}location.hash='#/schueler/'+r.ergebnis.id;}});
}

/* =====================================================================
   Dossier
   ===================================================================== */
var aktDossier=null;
function seiteDossier(id,neu){
  setzen('<a class="ar-zurueck" href="#/schueler">'+svg('left')+'Alle Schüler</a><div id="ar-dossier">'+laedt('Öffne das Dossier …')+'</div>');
  bereichLaden().then(function(z){
    if(z.art!=='bereit'){$('ar-dossier').innerHTML=zustandsKarte(z);meinenCodeZeigen();return;}
    if(window.CDSE_SCREENING&&window.CDSE_SCREENING.geoeffnet){window.CDSE_SCREENING.geoeffnet(id);}
    /* beim Öffnen immer den neuesten Stand (andere arbeiten vielleicht gerade daran); nur wenn die Datei
       gerade nicht lesbar ist, den Stand aus dieser Sitzung zeigen */
    return T.dossier(id,true).catch(function(e){if(neu){throw e;}return T.dossier(id,false).catch(function(){throw e;});}).then(function(d){
      /* inzwischen ein anderes Kind gewählt: nichts zeichnen (sonst landet der nächste Eintrag im falschen Dossier) */
      if(!nochGewaehlt(id)){return;}
      if(!aktDossier||aktDossier.id!==d.id){eldibWahl=null;}
      dossierNeu(d);
    });
  }).catch(function(e){if(!nochGewaehlt(id)){return;}var el=$('ar-dossier');if(el){el.innerHTML=karte('<h2>Dossier nicht gefunden</h2>'+hinweis(fehlerText(e))+'<a class="btn" href="#/schueler">Zur Liste</a>','ar-leer');}});
}
function nochGewaehlt(id){return akt.seite==='schueler'&&akt.param===id;}
/* Neuer Stand nach dem Speichern: nur übernehmen, wenn dieses Kind noch gewählt ist (schnelles Wechseln) */
function dossierNeu(d){if(!d||!nochGewaehlt(d.id)){return false;}aktDossier=d;dossierZeichnen(d);return true;}
function dossierZeichnen(d){
  var el=$('ar-dossier');if(!el||!nochGewaehlt(d.id)){return;}
  var p=d.person||{}, r=T.rechte(d), a=alter(p.geburtsdatum);
  var aktionen='';
  if(r.bearbeiten){aktionen+='<button class="btn primary" type="button" data-ar="eintrag-neu" title="Neuen Eintrag schreiben (Notiz, Gespräch, Beobachtung, Vorfall …)">'+svg('plus')+'Eintrag</button>';}
  if(r.weitergeben){aktionen+='<button class="btn" type="button" data-ar="weitergeben">'+svg('weiter')+'Weitergeben</button>';}
  if(r.rechteVergeben){aktionen+='<button class="btn" type="button" data-ar="rechte">'+svg('users')+'Rechte</button>';}
  aktionen+='<button class="btn" type="button" data-ar="drucken">'+svg('print')+'Übergabeblatt</button>';
  aktionen+='<button class="btn" type="button" data-ar="eldib-oeffnen" title="Den Schüler im ELDiB-Generator öffnen (ELDiB und DS)">'+svg('ziel')+'ELDiB / DS</button>';
  var mehr='<details class="ar-mehr"><summary class="btn" aria-label="Weitere Aktionen">'+svg('more')+'</summary><div class="ar-mehr-menue">'+
    (r.bearbeiten?'<button type="button" data-ar="person">'+svg('edit')+'Stammdaten bearbeiten</button>':'')+
    '<button type="button" data-ar="fiche-download">'+svg('runter')+'Fiche de renseignement (Word)</button>'+
    (r.status?'<button type="button" data-ar="status">'+svg('history')+(d.status==='inaktiv'?'Wieder aktiv setzen':'Inaktiv setzen')+'</button>':'')+
    (r.weitergeben?'<button type="button" data-ar="verantwortlich">'+svg('users')+'Fallverantwortliche ändern</button>':'')+
    '<button type="button" data-ar="neu-laden-dossier">'+svg('reload')+'Neu laden</button>'+
    (r.loeschen?'<button type="button" class="gefahr" data-ar="loeschen">'+svg('x')+'Dossier löschen</button>':'')+'</div></details>';
  var tabs=[['ueberblick','Überblick']].concat(window.CDSE_KOMPASS?[['kompass','Kompass']]:[]).concat(window.CDSE_BEGLEITPLAN?[['begleitplan','Begleitplan']]:[]).concat([['fiche','Fiche'],['entwicklung','Entwicklung & Ziele']]).concat(window.CDSE_SCREENING?[['screening','Screening'+(((d.screenings||[]).length+(d.screeningsAlt||[]).length)?' ('+((d.screenings||[]).length+(d.screeningsAlt||[]).length)+')':'')]]:[])
    .concat([['profil','Profil & Verlauf'],['eintraege','Einträge ('+((d.eintraege||[]).length)+')'+(entwurfDa(d.id)&&dossierTab!=='eintraege'?' · Entwurf':'')],['verlauf','Protokoll']]);
  el.innerHTML='<header class="ar-dkopf">'+ava(schuelerNameKurz(p),team(d.stelle).farbe)+'<div class="ar-dtitel"><h1>'+esc(schuelerName(p))+'</h1>'+
      '<p>'+[a!=null?a+' Jahre':'',p.geburtsdatum?'geb. '+datum(p.geburtsdatum):'',p.klasse,p.schule].filter(Boolean).map(esc).join(' · ')+'</p>'+
      '<div class="ar-chips">'+stelleChip(d.stelle)+'<span class="ar-status '+(d.status==='inaktiv'?'aus':'an')+'">'+(d.status==='inaktiv'?'inaktiv seit '+esc(datum(d.statusSeit)):'aktiv')+'</span>'+
      '<span class="ar-meinrecht '+(r.bearbeiten?'ja':'nein')+'" title="'+esc(r.grund)+'">'+(r.bearbeiten?svg('edit')+'Du kannst bearbeiten':svg('lock')+'Nur lesen')+'</span></div></div>'+
      '<div class="ar-daktionen">'+aktionen+mehr+'</div></header>'+
    '<div class="ar-fremd" id="ar-fremd" role="status" hidden></div>'+
    '<nav class="ar-tabs" role="tablist">'+tabs.map(function(t){return '<button type="button" role="tab" aria-selected="'+(dossierTab===t[0])+'" class="'+(dossierTab===t[0]?'on':'')+'" data-tab="'+t[0]+'">'+esc(t[1])+'</button>';}).join('')+'</nav>'+
    '<div class="ar-tabinhalt" id="ar-tabinhalt">'+tabInhalt(d,r)+'</div>';
  nachZeichnen(d);
  fremdBeobachten(d.id);
}
/* Mehrere Personen gleichzeitig: Speichert jemand anderes (oder dieselbe Person an einem anderen PC)
   dieses Dossier, erscheint oben ein Hinweis mit „Neuen Stand anzeigen“. Geprüft wird nur der
   Datei-Stand (Zeit, Größe) – das kostet im Netz fast nichts. */
var fremdTimer=null, fremdNeu=null;
function fremdBeobachten(id){
  if(fremdTimer){clearInterval(fremdTimer);fremdTimer=null;}
  fremdNeu=null;
  if(!T||!T.pruefen){return;}
  var ms=+window.__CDSE_PRUEF_MS||20000, laeuft=false;
  fremdTimer=setInterval(function(){
    if(!$('ar-dossier')||!aktDossier||aktDossier.id!==id){clearInterval(fremdTimer);fremdTimer=null;return;}
    if(laeuft||document.visibilityState==='hidden'||T.zustand().art!=='bereit'){return;}
    laeuft=true;
    T.pruefen(id).then(function(x){
      laeuft=false;
      var b=$('ar-fremd');
      if(!x||!b||!aktDossier||aktDossier.id!==id){return;}
      if(x.geloescht){b.hidden=false;b.innerHTML=svg('warn')+'<span>Dieses Dossier wurde inzwischen gelöscht.</span><a class="btn" href="#/schueler">Zur Liste</a>';return;}
      if(!x.neu){return;}
      fremdNeu=x.dossier;
      b.hidden=false;
      b.innerHTML=svg('info')+'<span>'+(x.eigen?'Du hast dieses Dossier an einem anderen PC geändert':'<b>'+esc(x.vonName||'Jemand')+'</b> hat dieses Dossier gerade geändert')+(x.wann?' ('+esc(datumZeit(x.wann).slice(-5))+' Uhr)':'')+'.</span>'+
        '<button class="btn" type="button" data-ar="fremd-neu">'+svg('reload')+'Neuen Stand anzeigen</button>';
    },function(){laeuft=false;});
  },ms);
}
function tabInhalt(d,r){
  if(dossierTab==='kompass'&&window.CDSE_KOMPASS){return window.CDSE_KOMPASS.tab(d,r);}
  if(dossierTab==='begleitplan'&&window.CDSE_BEGLEITPLAN){return window.CDSE_BEGLEITPLAN.tab(d,r);}
  if(dossierTab==='fiche'){return tabFiche(d,r);}
  if(dossierTab==='entwicklung'){return tabEntwicklung(d,r);}
  if(dossierTab==='screening'&&window.CDSE_SCREENING){return window.CDSE_SCREENING.tab(d,r);}
  if(dossierTab==='profil'){return tabProfil(d,r);}
  if(dossierTab==='eintraege'){return tabEintraege(d,r);}
  if(dossierTab==='verlauf'){return tabVerlauf(d);}
  return tabUeberblick(d,r);
}
var entwuerfe={};
function entwurfInhalt(w){return !!w&&['text','titel'].concat(VORFALL_TEXTE.map(function(x){return 'v_'+x[0];})).some(function(k){return String(w[k]||'').trim();});}
function entwurfDa(id){return entwurfInhalt(entwuerfe[id]);}
function nachZeichnen(d){
  var f=$('ar-eintrag-form');
  if(f){
    f.onsubmit=function(ev){ev.preventDefault();eintragSpeichern(d,f);};
    var ew=entwuerfe[d.id];
    if(entwurfInhalt(ew)){
      Object.keys(ew).forEach(function(k){var el=f.elements[k];if(!el||!el.name||el.length&&!el.tagName){return;}if(el.type==='checkbox'){el.checked=!!ew[k];}else{el.value=ew[k];}});
      var eh=$('ar-entwurf-hinweis');if(eh){eh.hidden=false;}
    }
    f.addEventListener('input',function(){var w=formWerte(f);if(entwurfInhalt(w)){entwuerfe[d.id]=w;}else{delete entwuerfe[d.id];}});
    f.addEventListener('change',function(){var w=formWerte(f);if(entwurfInhalt(w)){entwuerfe[d.id]=w;}});
    /* Vorfall / Krise: Protokollfelder einblenden, der Text wird zum „Verlauf“ */
    var art=f.elements.art, platz=f.querySelector('.ar-vorfall-platz'), lab=f.elements.text&&f.elements.text.closest('label');
    if(art&&platz){art.onchange=function(){var v=art.value==='vorfall';platz.hidden=!v;if(lab){lab.querySelector('span').textContent=v?'Was ist passiert? (Verlauf)':'Text';}};if(art.value==='vorfall'){art.onchange();}}
  }
}

/* ---------- Auf einen Blick (aus dem DS-Profil) ---------- */
function aktuelleBewertungen(d){
  var b={}, g=(d.profil&&d.profil.ds&&d.profil.ds.bewertungen)||{};
  Object.keys(g).forEach(function(k){b[k]=g[k];});
  (d.einschaetzungen||[]).slice().sort(function(x,y){return x.datum<y.datum?-1:1;}).forEach(function(e){Object.keys(e.bewertungen||{}).forEach(function(k){b[k]=e.bewertungen[k];});});
  return b;
}
function dsFuerText(d){
  var ds=JSON.parse(JSON.stringify((d.profil&&d.profil.ds)||{v:2,bewertungen:{},chips:{},f:{},frei:{},tabellen:{}}));
  ds.bewertungen=aktuelleBewertungen(d);
  ds.geschlecht=ds.geschlecht||(d.person&&d.person.geschlecht)||'m';
  return ds;
}
/* Stand des DS für Screening und Kompass: aktuelle Bewertungen (DS + spätere Einschätzungen), Auswahlfelder, Datum */
function dsStand(d){
  var ds=(d.profil&&d.profil.ds)||{};
  var daten=[d.profil&&d.profil.ds?d.profil.datum:''].concat((d.einschaetzungen||[]).map(function(e){return e.datum;})).filter(Boolean).sort();
  return {bewertungen:aktuelleBewertungen(d),chips:ds.chips||{},frei:ds.frei||{},f:ds.f||{},datum:daten.length?daten[daten.length-1]:''};
}
function stammFuerText(d){var p=d.person||{};return {schueler_name:(p.nachname||'')+', '+(p.vorname||''),geburtsdatum:p.geburtsdatum||'',klasse:p.klasse||'',foerderort:p.schule||''};}
function aufEinenBlick(d){
  if(!motorDa()){return null;}
  var ds=dsFuerText(d), st=stammFuerText(d), b=ds.bewertungen, T2=DS_TEXTE.de;
  var staerken=[], schwierig=[];
  /* Was das Kind betrifft: Schule, Beobachtung, Alltag zu Hause; beim Kind selbst nur das
     Befinden. Die Sicht auf die Eltern (Erziehung, Zusammenarbeit) gehört nicht dazu. */
  var THEMEN={schule:['lernen','verhalten','beziehung'],beobachtung:['arbeit','verhalten','kontakt'],eltern:['alltag'],kind:['selbst']};
  /* Beobachtung nur, wenn die Schule dasselbe Thema nicht schon eingeschätzt hat */
  var GLEICH={b_start:'s_selbst',b_konz:'s_konz',b_ablenk:'s_konz',b_anweisung:'s_regeln',b_regeln:'s_regeln',b_hilfe:'s_hilfe',b_unruhe:'s_unruhe',b_frust:'s_frust',b_peers:'s_peers',b_erwachsene:'s_erwachsene',b_isol:'s_rueckzug',b_provo:'s_aggr',e_regeln:'s_regeln',e_wut:'s_wut',e_rueckzug:'s_rueckzug',e_angst:'s_angst',k_angst:'s_angst'};
  Object.keys(THEMEN).forEach(function(ber){
    (DS_AUFBAU[ber]||{themen:[]}).themen.filter(function(th){return THEMEN[ber].indexOf(th.id)>=0;}).forEach(function(th){
      th.aussagen.forEach(function(a){
        var r=b[a[0]];if(!r){return;}
        if(GLEICH[a[0]]&&b[GLEICH[a[0]]]){return;}
        var v=a[1]<0?8-r:r;
        if(a[1]<0&&r<=2){return;}   /* "keine Wutausbrüche" ist keine Stärke, nur ein fehlender Hinweis */
        var s=DsText.vorschauSatz('de',ds,st,a[0],r);if(!s){return;}
        if(v>=6){staerken.push({s:s,v:v,ber:ber});}else if(v<=3){schwierig.push({s:s,v:v,ber:ber});}
      });
    });
  });
  schwierig.sort(function(x,y){return x.v-y.v;});staerken.sort(function(x,y){return y.v-x.v;});
  function chipLabels(g){return ((ds.chips||{})[g]||[]).map(function(k){var c=(T2.chips[g]||{})[k];return c?c[0]:k;});}
  function chipTexte(g){return ((ds.chips||{})[g]||[]).map(function(k){var c=(T2.chips[g]||{})[k];return c?(c[1]||c[0]):k;}).map(function(t){return DsText.fuelle?t:t;});}
  var wann=[];
  ((DS_AUFBAU.deutung.themen.filter(function(t){return t.id==='muster';})[0])||{aussagen:[]}).aussagen.forEach(function(a){
    var r=b[a[0]];if(!r||r<5){return;}var t=T2.a[a[0]];
    wann.push(t&&t.m?'vor allem '+t.m:DsText.vorschauSatz('de',ds,st,a[0],r));
  });
  var beduerf=[];
  (DS_AUFBAU.beduerfnisse.themen[0].aussagen||[]).forEach(function(a){var r=b[a[0]];if(r&&r>=5){beduerf.push({t:T2.a[a[0]].q,r:r});}});
  beduerf.sort(function(x,y){return y.r-x.r;});
  var hilft=chipLabels('s_hilft').concat(chipTexte('empf_schule'));
  return {staerken:staerken.slice(0,7),schwierig:schwierig.slice(0,7),hilft:hilft,wann:wann,beduerfnisse:beduerf.map(function(x){return x.t;}),
    ressourcen:ohneDoppelte(chipLabels('ressourcen').concat(chipLabels('s_staerken'))),
    interessen:chipLabels('k_interessen'),wuensche:chipLabels('k_wuensche'),diagnosen:chipLabels('diagnosen').filter(function(x){return x!=='andere';}),
    empfehlungen:chipTexte('empf_familie').concat(chipTexte('empf_region')),cni:chipTexte('cni'),hatDaten:Object.keys(b).length>0||Object.keys(ds.chips||{}).length>0};
}
/* „Kreativität“ und „kreativ“, „Sport“ und „sportlich“ nur einmal zeigen (gleicher Wortstamm) */
function ohneDoppelte(l){
  var gesehen={};
  return l.filter(function(x){var k=String(x).toLowerCase().replace(/[^a-zäöüß]/g,'').slice(0,5);if(!k||gesehen[k]){return !k;}gesehen[k]=1;return true;});
}
function blickListe(titel,l,kl,leer){
  if(!l||!l.length){return leer?'<div class="ar-blick '+(kl||'')+'"><h3>'+esc(titel)+'</h3><p class="ar-leise">'+esc(leer)+'</p></div>':'';}
  return '<div class="ar-blick '+(kl||'')+'"><h3>'+esc(titel)+'</h3><ul>'+l.map(function(x){return '<li>'+esc(typeof x==='string'?x:x.s)+'</li>';}).join('')+'</ul></div>';
}
/* Helfernetz („Support Bubble“), übernommen aus Klassenbuch/Journal – nur lesen */
var NETZ_BEREICH={familie:'Familie / familiäre Hilfen',schule_lokal:'Schule: lokal/regional',schule_national:'Schule: national',externe:'Externe Akteur:innen'};
var NETZ_FREQ={woechentlich:'wöchentlich',monatlich:'monatlich',anfrage:'auf Anfrage',auf_anfrage:'auf Anfrage'};
function helfernetzKarte(d){
  var hn=d.helfernetz||{}, apps=Object.keys(hn);if(!apps.length){return '';}
  return apps.map(function(app){
    var x=(hn[app]||{}).daten||{}, nodes=x.nodes||[];
    var gruppen={};nodes.forEach(function(n){var b=NETZ_BEREICH[n.area]||n.area||'Weitere';(gruppen[b]=gruppen[b]||[]).push(n);});
    return karte('<h3>Helfernetz</h3><p class="ar-klein">aus dem '+(app==='journal'?'Journal':'Klassenbuch')+(x.dateBegin||x.dateEnd?' · Diagnostik '+esc([datum(x.dateBegin),datum(x.dateEnd)].filter(Boolean).join(' – ')):'')+'</p>'+
      (nodes.length?Object.keys(gruppen).map(function(b){return '<p class="ar-netz-b">'+esc(b)+'</p><ul class="ar-netz">'+gruppen[b].map(function(n){
        var z=[NETZ_FREQ[n.freq]||n.freq,n.status==='neu'?'neu hinzugekommen':(n.status==='beendet'?'nicht weitergeführt':''),n.relation==='indirekt'?'indirekt':''].filter(Boolean);
        return '<li'+(n.status==='beendet'?' class="aus"':'')+'><b>'+esc(n.name||'')+'</b>'+(z.length?' <small>'+esc(z.join(' · '))+'</small>':'')+(n.note?'<small class="ar-netz-n">'+esc(n.note)+'</small>':'')+'</li>';}).join('')+'</ul>';}).join(''):'<p class="ar-leise">Keine Personen eingetragen.</p>')+
      ((x.snapshots||[]).length?'<p class="ar-klein">'+x.snapshots.length+(x.snapshots.length===1?' gespeicherter Stand':' gespeicherte Stände')+' im Dossier gesichert.</p>':''));
  }).join('');
}
function tabUeberblick(d,r){
  var p=d.person||{}, blick=aufEinenBlick(d), h='<div class="ar-zwei"><div class="ar-haupt">';
  var neu=(d.profil&&r.bearbeiten&&bankDa())?eldibNeuer(d):null;
  if(neu){h+=hinweis('Im ELDiB-Generator auf diesem Computer gibt es neuere Daten zu '+esc(p.vorname||'diesem Schüler')+' (gespeichert am '+esc(datumZeit(neu.gespeichert))+'). <button class="ar-link" type="button" data-ar="eldib-uebernehmen">Jetzt übernehmen</button>','info');}
  if(!d.profil&&!(d.einschaetzungen||[]).length){
    h+=karte('<h2>Auf einen Blick</h2><p>Noch kein Profil. Es entsteht aus dem <b>ELDiB-Generator</b>: aus dem DS (Aussagen 1–7) Stärken, Schwierigkeiten, was hilft, wann es schwierig wird und was der Schüler braucht – aus der ELDiB-Einschätzung die Entwicklungsstufen, die für das Alter längst erwarteten Items und die Förderziele (PEI).</p>'+
      (r.bearbeiten?'<div class="ar-knopfreihe"><button class="btn primary" type="button" data-ar="eldib-uebernehmen">'+svg('ziel')+'Aus dem ELDiB-Generator übernehmen</button><button class="btn" type="button" data-ar="einschaetzung">'+svg('check')+'Selbst einschätzen</button></div>':''),'ar-blickkarte');
  }else if(!blick){
    h+=karte('<h2>Auf einen Blick</h2>'+hinweis('Für die Auswertung fehlt die Datei <code>apps/ds-motor.js</code> im Hub-Ordner (Text-Motor des ELDiB-Generators). Bitte mit <code>update-apps.cjs</code> holen.'),'ar-blickkarte');
  }else if(!blick.hatDaten){
    h+=karte('<h2>Auf einen Blick</h2><p class="ar-leise">Noch kein DS übernommen. Stärken, Schwierigkeiten und was hilft erscheinen hier, sobald der DS im ELDiB-Generator ausgefüllt und übernommen ist.</p>','ar-blickkarte');
  }else{
    h+='<div class="ar-karte ar-blickkarte"><div class="ar-kartenkopf"><h2>Auf einen Blick</h2><span class="ar-leise">'+esc(profilQuelle(d))+'</span></div><div class="ar-blickraster">'+
      blickListe('Stärken',blick.staerken,'gut','Noch keine Stärken eingeschätzt')+
      blickListe('Schwierigkeiten',blick.schwierig,'schwer','Keine deutlichen Schwierigkeiten eingeschätzt')+
      blickListe('Was hilft',blick.hilft,'hilft')+blickListe('Wann es schwierig wird',blick.wann,'wann')+
      blickListe('Was '+(p.vorname||'das Kind')+' braucht',blick.beduerfnisse,'braucht')+
      blickListe('Ressourcen',blick.ressourcen,'')+blickListe('Interessen',blick.interessen,'')+blickListe('Wünsche',blick.wuensche,'')+
      '</div></div>';
  }
  if(window.CDSE_BEGLEITPLAN){h+=window.CDSE_BEGLEITPLAN.kurzKarte(d,r);}
  if(window.CDSE_KOMPASS){h+=window.CDSE_KOMPASS.kurzKarte(d);}
  h+=eldibUeberblick(d);
  if(blick&&(blick.diagnosen.length||blick.empfehlungen.length||blick.cni.length)){
    h+=karte('<h2>Aus dem DS</h2>'+(blick.diagnosen.length?'<p><b>Diagnosen:</b> '+esc(blick.diagnosen.join(', '))+'</p>':'')+
      (blick.cni.length?'<p><b>Empfehlung an die CNI:</b> '+esc(blick.cni.join('; '))+'</p>':'')+
      (blick.empfehlungen.length?'<p><b>Empfehlungen:</b></p><ul>'+blick.empfehlungen.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':''));
  }
  var letzte=(d.eintraege||[]).slice().sort(function(a,b){return (b.datum+b.z)<(a.datum+a.z)?-1:1;}).slice(0,3);
  h+=karte('<div class="ar-kartenkopf"><h2>Letzte Einträge</h2><button class="ar-link" type="button" data-tab="eintraege">Alle Einträge</button></div>'+
    (letzte.length?letzte.map(eintragHtml).join(''):'<p class="ar-leise">Noch keine Einträge.</p>'));
  h+='</div><aside class="ar-seite">';
  h+=karte('<h3>Stammdaten</h3><dl class="ar-dl">'+[['Geburtsdatum',datum(p.geburtsdatum)],['Geschlecht',p.geschlecht==='w'?'weiblich':(p.geschlecht==='m'?'männlich':'')],['Matricule',p.matricule],['Schule',p.schule],['Klasse',p.klasse],['Sprachen',p.sprachen],['Eltern / Kontakt',p.kontakt]].filter(function(x){return x[1];}).map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>';}).join('')+'</dl>'+
    (r.bearbeiten?'<button class="ar-link" type="button" data-ar="person">'+svg('edit')+'Bearbeiten</button>':''));
  var rechteListe=Object.keys(d.rechte||{});
  h+=karte('<h3>Zuständigkeit</h3><dl class="ar-dl"><dt>Stelle</dt><dd>'+esc(team(d.stelle).name)+(d.stelleSeit?' <small>seit '+esc(datum(d.stelleSeit))+'</small>':'')+'</dd>'+
    '<dt>Fallverantwortlich</dt><dd>'+esc((d.verantwortlich||[]).map(kname).join(', ')||'—')+'</dd>'+
    '<dt>Schreibrecht</dt><dd>'+esc(rechteListe.map(kname).join(', ')||'—')+'</dd></dl><p class="ar-klein">Außerdem bearbeiten dürfen die Responsables und die Verwaltung. Lesen dürfen alle Freigeschalteten.</p>');
  h+=helfernetzKarte(d);
  var wg=(d.weitergaben||[]);
  if(wg.length){h+=karte('<h3>Weg durch das CDSE</h3><ol class="ar-weg">'+wg.map(function(w){return '<li><b>'+esc(team(w.von).name)+' → '+esc(team(w.an).name)+'</b><small>'+esc(datum(w.z.slice(0,10)))+' · '+esc(kname(w.durch))+'</small>'+(w.notiz?'<span>'+esc(w.notiz)+'</span>':'')+'</li>';}).join('')+'</ol>');}
  h+='</aside></div>';
  return h;
}
function profilQuelle(d){
  var e=(d.einschaetzungen||[]).slice().sort(function(a,b){return a.datum<b.datum?1:-1;})[0];
  var t=[];
  if(d.profil&&d.profil.ds){t.push('DS vom '+datum(d.profil.datum)+(d.profil.von?' ('+kname(d.profil.von)+')':''));}
  if(e){t.push('zuletzt eingeschätzt am '+datum(e.datum));}
  return t.join(' · ');
}

/* ---------- Profil & Verlauf ---------- */
var BEREICH_NAMEN={schule:'Schulalltag',beobachtung:'Beobachtung',kind:'Sicht des Kindes',eltern:'Sicht der Eltern'};
function tabProfil(d,r){
  var h=window.CDSE_VERLAUF?window.CDSE_VERLAUF.karte(d):'';
  h+='<div class="ar-knopfreihe">'+(r.bearbeiten?'<button class="btn primary" type="button" data-ar="einschaetzung">'+svg('check')+'Neue Einschätzung</button><button class="btn" type="button" data-ar="eldib-uebernehmen">'+svg('ziel')+'DS aus dem ELDiB-Generator übernehmen</button>':'')+'</div>';
  if(!motorDa()){return h+hinweis('Für Profil und Verlauf fehlt die Datei <code>apps/ds-motor.js</code> im Hub-Ordner.');}
  var serien=verlaufsSerien(d);
  if(serien.punkte.length>1){h+=karte('<h2>Einschätzungen im Verlauf</h2><p class="ar-leise">Durchschnitt der Einschätzungen je Bereich (7 = sehr günstig). Jede Einschätzung ist ein Punkt.</p>'+verlaufsGrafik(serien)+verlaufsTabelle(d));}
  else if(serien.punkte.length===1){h+=karte('<h2>Einschätzungen im Verlauf</h2><p>Bisher gibt es eine Einschätzung. Mit der nächsten (z. B. nach einigen Wochen in der neuen Stelle) zeigt der Hub hier, was sich verbessert oder verschlechtert hat.</p>');}
  var A=bankDa()?eldibAuswertung(d):null;
  if(d.profil&&(d.profil.ds||A)){
    try{
      var ab=DsText.bericht('de',dsFuerText(d),stammFuerText(d),dsEldibProfilAus(A));
      var teile=[['sozialbericht','Familie'],['schule','Sicht der Schule'],['kind','Sicht des Kindes'],['eltern','Sicht der Eltern'],['beobachtung','Beobachtung'],['eldib','ELDiB-Ergebnisse'],['deutung','Interpretation'],['beduerfnisse','Bedürfnisse und Ressourcen'],['empfehlungen','Empfehlungen']];
      if(!d.profil.ds){teile=[['eldib','ELDiB-Ergebnisse']];}
      if(!A){teile=teile.filter(function(t){return t[0]!=='eldib';});}
      h+=karte('<div class="ar-kartenkopf"><h2>Profil im Wortlaut</h2><span class="ar-leise">'+esc(profilQuelle(d))+'</span></div>'+
        teile.map(function(t){var bl=ab[t[0]]||[];if(!bl.length){return '';}return '<h3>'+esc(t[1])+'</h3>'+bloeckeHtml(bl);}).join(''),'ar-wortlaut');
    }catch(e){h+=hinweis('Das Profil ließ sich nicht darstellen: '+fehlerText(e));}
  }
  return h;
}
function bloeckeHtml(bl){
  return bl.map(function(b){
    if(b.typ==='absatz'){return '<p>'+esc(b.text)+'</p>';}
    if(b.typ==='zwischen'){return '<p><b>'+esc(b.text)+'</b></p>';}
    if(b.typ==='liste'){return '<ul>'+b.punkte.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';}
    if(b.typ==='tabelle'){return '<table class="ar-mini"><tr>'+b.kopf.map(function(k){return '<th>'+esc(k)+'</th>';}).join('')+'</tr>'+b.zeilen.map(function(z){return '<tr>'+z.map(function(x){return '<td>'+esc(x)+'</td>';}).join('')+'</tr>';}).join('')+'</table>';}
    return '';
  }).join('');
}
/* Zeitreihe: je Einschätzung (und DS) der Durchschnitt je Thema der Schule */
function verlaufsSerien(d){
  var punkte=[];
  if(d.profil&&d.profil.ds&&d.profil.ds.bewertungen){punkte.push({datum:d.profil.datum||'',b:d.profil.ds.bewertungen,quelle:'DS'});}
  (d.einschaetzungen||[]).forEach(function(e){punkte.push({datum:e.datum,b:e.bewertungen,quelle:kname(e.von)});});
  punkte.sort(function(a,b){return a.datum<b.datum?-1:1;});
  var themen=[];
  (DS_AUFBAU.schule.themen||[]).forEach(function(th){themen.push({id:th.id,name:DS_TEXTE.de.ui.themen['schule.'+th.id]||th.id,aussagen:th.aussagen});});
  punkte.forEach(function(pk){
    pk.werte={};
    themen.forEach(function(th){
      var s=0,n=0;th.aussagen.forEach(function(a){var r=pk.b[a[0]];if(r){s+=a[1]<0?8-r:r;n++;}});
      pk.werte[th.id]=n?s/n:null;
    });
  });
  return {punkte:punkte.filter(function(p){return themen.some(function(t){return p.werte[t.id]!=null;});}),themen:themen};
}
function verlaufsGrafik(s){
  var B=640,H=220,L=36,R=12,O=14,U=34, n=s.punkte.length;
  var farben=['#2E3A9C','#B4533A','#1F6B6F','#A8741A'];
  function x(i){return L+(n<2?0:(B-L-R)*i/(n-1));}
  function y(v){return O+(H-O-U)*(7-v)/6;}
  var g='<svg class="ar-grafik" viewBox="0 0 '+B+' '+H+'" role="img" aria-label="Verlauf der Einschätzungen">';
  for(var v=1;v<=7;v++){g+='<line x1="'+L+'" x2="'+(B-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" class="ar-gitter'+(v===4?' mitte':'')+'"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" class="ar-achse" text-anchor="end">'+v+'</text>';}
  s.punkte.forEach(function(p,i){g+='<text x="'+x(i)+'" y="'+(H-12)+'" class="ar-achse" text-anchor="middle">'+esc(datum(p.datum).slice(0,5))+'</text>';});
  s.themen.forEach(function(th,k){
    var pts=s.punkte.map(function(p,i){return p.werte[th.id]==null?null:[x(i),y(p.werte[th.id])];}).filter(Boolean);
    if(!pts.length){return;}
    g+='<polyline fill="none" stroke="'+farben[k%4]+'" stroke-width="2.5" points="'+pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ')+'"/>';
    pts.forEach(function(q){g+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="4" fill="'+farben[k%4]+'"/>';});
  });
  g+='</svg><div class="ar-legende">'+s.themen.map(function(th,k){return '<span><i style="background:'+farben[k%4]+'"></i>'+esc(th.name)+'</span>';}).join('')+'</div>';
  return g;
}
/* Welche Aussagen haben sich zwischen der ersten und der letzten Einschätzung verändert? */
function verlaufsTabelle(d){
  var s=verlaufsSerien(d);if(s.punkte.length<2){return '';}
  var erste=s.punkte[0], letzte=s.punkte[s.punkte.length-1], zeilen=[];
  s.themen.forEach(function(th){th.aussagen.forEach(function(a){
    var r1=erste.b[a[0]], r2=letzte.b[a[0]];if(!r1||!r2||r1===r2){return;}
    var v1=a[1]<0?8-r1:r1, v2=a[1]<0?8-r2:r2;
    zeilen.push({q:DS_TEXTE.de.a[a[0]].q,r1:r1,r2:r2,diff:v2-v1});
  });});
  if(!zeilen.length){return '<p class="ar-leise">Keine Aussage hat sich zwischen der ersten und der letzten Einschätzung verändert.</p>';}
  zeilen.sort(function(a,b){return b.diff-a.diff;});
  return '<table class="ar-mini ar-veraenderung"><tr><th>Aussage</th><th>'+esc(datum(erste.datum))+'</th><th>'+esc(datum(letzte.datum))+'</th><th></th></tr>'+
    zeilen.map(function(z){return '<tr><td>'+esc(z.q)+'</td><td>'+z.r1+'</td><td>'+z.r2+'</td><td class="'+(z.diff>0?'besser':'schlechter')+'">'+(z.diff>0?'▲ günstiger':'▼ ungünstiger')+'</td></tr>';}).join('')+'</table>';
}
function einschaetzungDialog(d){
  if(!motorDa()){toast('Für Einschätzungen fehlt apps/ds-motor.js');return;}
  var b=aktuelleBewertungen(d), T2=DS_TEXTE.de;
  var bereiche=['schule','beobachtung','kind','eltern'];
  var inhalt='<p class="ar-klein">Dieselben Aussagen wie im DS. Bewerte, was <b>jetzt</b> zutrifft (1 = trifft gar nicht zu, 7 = trifft voll zu). Leer lassen, was du nicht beurteilen kannst. Die letzte Bewertung ist vorausgewählt.</p>'+
    '<div class="ar-raster2">'+feld('datum','Datum',heuteIso(),'date')+auswahl('bereich','Welche Aussagen?','schule',bereiche.map(function(x){return [x,BEREICH_NAMEN[x]];}))+'</div>'+
    '<div id="ar-einsch-aussagen"></div>'+textfeld('notiz','Notiz (optional)','',2);
  var gewaehlt={};
  function zeichne(dlg,bereich){
    var box=dlg.querySelector('#ar-einsch-aussagen');
    box.innerHTML=(DS_AUFBAU[bereich].themen||[]).map(function(th){
      return '<fieldset class="ar-einsch-thema"><legend>'+esc(T2.ui.themen[bereich+'.'+th.id]||th.id)+'</legend>'+th.aussagen.map(function(a){
        var r=gewaehlt[a[0]]!=null?gewaehlt[a[0]]:(b[a[0]]||0);
        return '<div class="ar-einsch-zeile" data-id="'+a[0]+'"><span>'+esc(T2.a[a[0]].q)+'</span><span class="ar-skala">'+[1,2,3,4,5,6,7].map(function(i){return '<button type="button" class="'+(r===i?'an':'')+'" data-r="'+i+'">'+i+'</button>';}).join('')+'</span></div>';
      }).join('')+'</fieldset>';
    }).join('');
  }
  return dialog('Neue Einschätzung',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){
      var sel=dlg.querySelector('select[name=bereich]');
      zeichne(dlg,sel.value);
      /* in der Auswahl markieren, in welchen Bereichen schon bewertet wurde (gespeichert werden alle) */
      function markieren(){Array.prototype.forEach.call(sel.options,function(o){var n=(DS_AUFBAU[o.value].themen||[]).reduce(function(s,th){return s+th.aussagen.filter(function(a){return gewaehlt[a[0]];}).length;},0);o.textContent=BEREICH_NAMEN[o.value]+(n?' ('+n+' bewertet)':'');});}
      sel.onchange=function(){zeichne(dlg,sel.value);};
      dlg.addEventListener('click',function(ev){if(ev.target.closest('.ar-skala button')){setTimeout(markieren,0);}});
      dlg.addEventListener('click',function(ev){
        var btn=ev.target.closest('.ar-skala button');if(!btn){return;}
        var z=btn.closest('.ar-einsch-zeile'), id=z.dataset.id, r=+btn.dataset.r;
        gewaehlt[id]=(gewaehlt[id]===r)?0:r;
        Array.prototype.forEach.call(z.querySelectorAll('button'),function(x){x.classList.toggle('an',+x.dataset.r===gewaehlt[id]);});
      });
    },
    ausfuehren:function(w){
      /* alle Bereiche speichern, in denen etwas bewertet wurde – nicht nur den gerade gezeigten */
      function beruehrt(ber){return (DS_AUFBAU[ber].themen||[]).some(function(th){return th.aussagen.some(function(a){return gewaehlt[a[0]]!=null;});});}
      var liste=bereiche.filter(function(ber){return ber===w.werte.bereich||beruehrt(ber);}).map(function(ber){
        var bew={};
        (DS_AUFBAU[ber].themen||[]).forEach(function(th){th.aussagen.forEach(function(a){
          var r=gewaehlt[a[0]]!=null?gewaehlt[a[0]]:(b[a[0]]||0);if(r){bew[a[0]]=r;}
        });});
        return {datum:w.werte.datum,bereich:ber,bewertungen:bew,notiz:ber===w.werte.bereich?w.werte.notiz:''};
      }).filter(function(x){return Object.keys(x.bewertungen).length;});
      if(!liste.length){throw new Error('Bitte mindestens eine Aussage bewerten.');}
      return T.ops.einschaetzung(d.id,liste.length===1?liste[0]:liste);
    }
  }).then(function(r){if(r.ergebnis){if(nochGewaehlt(r.ergebnis.id)){dossierTab='profil';}dossierNeu(r.ergebnis);toast('Einschätzung gespeichert');}});
}

/* ---------- Einträge ---------- */
function zielChip(code){if(!code){return '';}var inf=itemZu(code);return '<span class="ar-zielchip" style="--bc:'+(inf?elBereich(inf.bereich).farbe:'#586277')+'" title="Bezug zum Förderziel">'+svg('ziel')+esc(code)+(inf?' '+esc(inf.it.keyword):'')+'</span>';}
/* Förderziele der neuesten Einschätzung als Auswahl (für Einträge) */
function zielOptionen(d,dazu){
  var A=bankDa()?eldibAuswertung(d):null, l=A?A.ziele.map(function(z){var t=z.text.length>70?z.text.slice(0,67)+'…':z.text;return [z.code,z.code+' '+z.it.keyword+' – „'+t+'“'];}):[];
  if(dazu&&!l.some(function(o){return o[0]===dazu;})){var inf=itemZu(dazu);l.push([dazu,dazu+(inf?' '+inf.it.keyword:'')+' (früheres Ziel)']);}
  return l;
}
function eintragHtml(e,r,d){
  var eigen=e.von===(K.ich()||{}).id;
  return '<article class="ar-eintrag" data-eid="'+esc(e.id)+'"><header><span class="ar-art">'+esc(ARTEN[e.art]||e.art)+'</span>'+zielChip(e.ziel)+'<b>'+esc(e.titel||'')+'</b><small>'+esc(datum(e.datum))+' · '+(e.herkunft?'übernommen von ':'')+esc(kname(e.von))+(e.geaendert?' · geändert':'')+'</small>'+
    (r&&r.bearbeiten&&(eigen||r.weitergeben)?'<span class="ar-eintrag-aktion"><button type="button" class="ar-link" data-ar="eintrag-aendern" data-eid="'+esc(e.id)+'">'+svg('edit')+'Ändern</button><button type="button" class="ar-link gefahr" data-ar="eintrag-loeschen" data-eid="'+esc(e.id)+'">'+svg('x')+'Löschen</button></span>':'')+
    '</header>'+(e.vorfall?vorfallHtml(e.vorfall,e.text):'<p>'+esc(e.text).replace(/\n/g,'<br>')+'</p>')+herkunftZeile(e)+'</article>';
}
/* ---------- Vorfall-/Krisenprotokoll: feste Felder statt freiem Text ---------- */
var VORFALL_TEXTE=[['ausloeser','Was ging voraus? (Auslöser)'],['intervention','Was wurde getan? (Maßnahme)'],['nachbesprechung','Nachbesprechung – was hilft beim nächsten Mal?']];
var VORFALL_MELDUNG=[['leitung','Leitung/Responsable informiert'],['eltern','Eltern informiert'],['meldung','Meldepflicht geprüft (Signalement)']];
function vorfallFelder(v){
  v=v||{};
  return '<fieldset class="ar-vorfall"><legend>Protokoll zum Vorfall</legend>'+
    '<div class="ar-raster3">'+feld('v_zeit','Uhrzeit',v.zeit,'time')+feld('v_situation','Stunde / Situation',v.situation,'text',' placeholder="z. B. 3. Stunde, Pause, Bus"')+feld('v_ort','Ort',v.ort)+'</div>'+
    VORFALL_TEXTE.map(function(t){return textfeld('v_'+t[0],t[1],v[t[0]],2);}).join('')+
    '<div class="ar-raster3">'+feld('v_toVon','Time-out von',v.timeoutVon,'time')+feld('v_toBis','Time-out bis',v.timeoutBis,'time')+auswahl('v_schwere','Schwere',v.schwere||'',[['leicht','leicht'],['mittel','mittel'],['schwer','schwer']],'–')+'</div>'+
    feld('v_beteiligte','Beteiligte (nur so viel wie nötig)',v.beteiligte)+
    '<div class="ar-vorfall-checks">'+VORFALL_MELDUNG.map(function(m){return '<label class="ar-check"><input type="checkbox" name="v_'+m[0]+'"'+(v[m[0]]?' checked':'')+'><span>'+esc(m[1])+'</span></label>';}).join('')+'</div></fieldset>';
}
function vorfallAus(w){
  function t(k){return String(w['v_'+k]||'').trim();}
  var o={zeit:t('zeit'),situation:t('situation'),ort:t('ort'),timeoutVon:t('toVon'),timeoutBis:t('toBis'),schwere:t('schwere'),beteiligte:t('beteiligte')};
  VORFALL_TEXTE.forEach(function(x){o[x[0]]=t(x[0]);});VORFALL_MELDUNG.forEach(function(m){o[m[0]]=!!w['v_'+m[0]];});
  return o;
}
function formWerte(f){var o={};Array.prototype.forEach.call(f.elements,function(el){if(!el.name){return;}o[el.name]=el.type==='checkbox'?el.checked:el.value;});return o;}
function vorfallMinuten(von,bis){var a=/^(\d\d):(\d\d)$/.exec(von||''), b=/^(\d\d):(\d\d)$/.exec(bis||'');if(!a||!b){return 0;}var m=(+b[1]*60+ +b[2])-(+a[1]*60+ +a[2]);return m>0?m:0;}
function vorfallKopf(v){var m=vorfallMinuten(v.timeoutVon,v.timeoutBis);return [v.zeit?v.zeit+' Uhr':'',v.situation,v.ort,v.schwere?'Schwere: '+v.schwere:'',m?'Time-out '+v.timeoutVon+'–'+v.timeoutBis+' ('+m+' Min.)':''].filter(Boolean);}
/* fürs Übergabeblatt: dieselben Angaben als schlichter Text */
function vorfallDruck(v,text){
  function z(t,x){return x?'<br><i>'+esc(t)+':</i> '+esc(x).replace(/\n/g,'<br>'):'';}
  var kopf=vorfallKopf(v), info=VORFALL_MELDUNG.filter(function(m){return v[m[0]];}).map(function(m){return m[1];});
  return (kopf.length?'<br><small>'+esc(kopf.join(' · '))+'</small>':'')+z('Auslöser',v.ausloeser)+z('Verlauf',text)+z('Maßnahme',v.intervention)+z('Nachbesprechung',v.nachbesprechung)+(info.length?'<br><small>'+esc(info.join(' · '))+'</small>':'');
}
function vorfallHtml(v,text){
  var kopf=vorfallKopf(v);
  return (kopf.length?'<p class="ar-vorfall-kopf">'+esc(kopf.join(' · '))+'</p>':'')+
    '<dl class="ar-dl ar-vorfall-dl">'+(v.ausloeser?'<dt>Auslöser</dt><dd>'+esc(v.ausloeser).replace(/\n/g,'<br>')+'</dd>':'')+
      '<dt>Verlauf</dt><dd>'+esc(text||'').replace(/\n/g,'<br>')+'</dd>'+
      (v.intervention?'<dt>Maßnahme</dt><dd>'+esc(v.intervention).replace(/\n/g,'<br>')+'</dd>':'')+
      (v.nachbesprechung?'<dt>Nachbesprechung</dt><dd>'+esc(v.nachbesprechung).replace(/\n/g,'<br>')+'</dd>':'')+
      (v.beteiligte?'<dt>Beteiligte</dt><dd>'+esc(v.beteiligte)+'</dd>':'')+'</dl>'+
    '<p class="ar-vorfall-meldung">'+VORFALL_MELDUNG.map(function(m){return '<span class="'+(v[m[0]]?'ja':'nein')+'">'+(v[m[0]]?'✓ ':'○ ')+esc(m[1])+'</span>';}).join('')+'</p>';
}
/* Wann häufen sich Vorfälle? Wochentag, Situation, Time-out – ab zwei Vorfällen */
function vorfallAuswertung(d){
  var l=(d.eintraege||[]).filter(function(e){return e.art==='vorfall';});if(l.length<2){return '';}
  var tage={}, sit={}, to=0, acht=new Date(Date.now()-56*864e5).toISOString().slice(0,10), n8=0, offen=0;
  l.forEach(function(e){var dt=new Date(e.datum+'T12:00:00'), t=TAGE[dt.getDay()];tage[t]=(tage[t]||0)+1;var v=e.vorfall||{};if(v.situation){sit[v.situation]=(sit[v.situation]||0)+1;}to+=vorfallMinuten(v.timeoutVon,v.timeoutBis);if(e.datum>=acht){n8++;}if(e.vorfall&&!(v.leitung&&v.eltern)){offen++;}});
  function top(o){return Object.keys(o).sort(function(a,b){return o[b]-o[a];}).slice(0,3).map(function(k){return k+' ('+o[k]+')';}).join(', ');}
  return karte('<h2>Vorfälle im Überblick</h2><p>'+l.length+' Vorfälle, davon '+n8+' in den letzten 8 Wochen.'+(to?' Time-out insgesamt '+to+' Minuten.':'')+'</p>'+
    '<dl class="ar-dl"><dt>Häufigste Tage</dt><dd>'+esc(top(tage))+'</dd>'+(Object.keys(sit).length?'<dt>Häufigste Situationen</dt><dd>'+esc(top(sit))+'</dd>':'')+'</dl>'+
    (offen?'<p class="ar-klein">Bei '+offen+(offen===1?' Vorfall':' Vorfällen')+' ist nicht vermerkt, dass Leitung und Eltern informiert wurden.</p>':''),'ar-vorfall-ueberblick');
}
/* Übernommen aus Klassenbuch/Journal: Kategorie, Schlagwörter, Verfasser und Bericht bleiben sichtbar */
function herkunftZeile(e){
  if(!e.herkunft||!e.herkunft.app){return '';}
  var t=[(e.herkunft.app==='journal'?'aus dem Journal':'aus dem Klassenbuch')];
  if(e.thema&&e.thema!==e.titel){t.push(e.thema);}
  if(e.autorName){t.push('verfasst von '+e.autorName);}
  if(e.tags&&e.tags.length){t.push('Schlagwörter: '+e.tags.join(', '));}
  if(e.bericht&&e.bericht.goals&&e.bericht.goals.length){t.push((e.bericht.type||'Bericht')+' mit '+e.bericht.goals.length+(e.bericht.goals.length===1?' Förderziel':' Förderzielen')+': '+e.bericht.goals.map(function(g){return g.code||g.title;}).filter(Boolean).join(', '));}
  return '<p class="ar-herkunft">'+esc(t.join(' · '))+'</p>';
}
function tabEintraege(d,r){
  var h='';
  if(r.bearbeiten){
    var zo=zielOptionen(d);
    h+=karte('<form id="ar-eintrag-form" class="ar-eintrag-form" novalidate><h2>Neuer Eintrag<span class="ar-entwurf" id="ar-entwurf-hinweis" hidden>ungespeicherter Entwurf</span></h2><div class="ar-raster3">'+feld('datum','Datum',heuteIso(),'date')+
      auswahl('art','Art','notiz',Object.keys(ARTEN).map(function(k){return [k,ARTEN[k]];}))+feld('titel','Titel (optional)','','text',' autocomplete="off"')+'</div>'+
      (zo.length?auswahl('ziel','Bezug zu einem Förderziel (optional)','',zo,'– kein Bezug –'):'')+
      '<div class="ar-vorfall-platz" hidden>'+vorfallFelder()+'</div>'+
      textfeld('text','Text','',4)+'<p class="ar-dialog-fehler" id="ar-eintrag-fehler" role="alert" hidden></p><div class="ar-knopfreihe"><button class="btn primary" type="submit">'+svg('plus')+'Eintrag speichern</button>'+
      '<label class="ar-wv" title="Erscheint als Frist im Begleitplan und unter „Fällig diese Woche“"><span>Wiedervorlage am (optional)</span><input type="date" name="wiedervorlage" min="'+heuteIso()+'"></label></div></form>');
  }else{h+=hinweis('Du kannst die Einträge lesen. Schreiben dürfen die Zuständigen – frage die Fallverantwortlichen nach einem Schreibrecht.','info');}
  h+=vorfallAuswertung(d);
  var l=(d.eintraege||[]).slice().sort(function(a,b){return (b.datum+(b.z||''))<(a.datum+(a.z||''))?-1:1;});
  h+=l.length?l.map(function(e){return eintragHtml(e,r,d);}).join(''):karte('<p class="ar-leise">Noch keine Einträge.</p>');
  return h;
}
function eintragSpeichern(d,f){
  var text=f.elements.text.value.trim(), fe=$('ar-eintrag-fehler');
  function fehlerZeigen(t){if(fe){fe.textContent=t;fe.hidden=!t;}else if(t){toast(t);}}
  if(!text){fehlerZeigen('Bitte einen Text eingeben.');f.elements.text.focus();return;}
  fehlerZeigen('');
  var b=f.querySelector('button[type=submit]');b.disabled=true;
  var art=f.elements.art.value, titel=f.elements.titel.value.trim(), dat=f.elements.datum.value||heuteIso(), wv=f.elements.wiedervorlage?f.elements.wiedervorlage.value:'';
  T.ops.eintrag(d.id,{datum:dat,art:art,titel:titel,text:text,ziel:f.elements.ziel?f.elements.ziel.value:'',vorfall:art==='vorfall'?vorfallAus(formWerte(f)):null,
    wiedervorlage:wv?{bis:wv,titel:'Nachfassen: '+(titel||ARTEN[art]||'Eintrag')+' vom '+datum(dat)}:null})
    .then(function(neu){delete entwuerfe[d.id];dossierNeu(neu);toast(wv?'Eintrag gespeichert – Wiedervorlage am '+datum(wv):'Eintrag gespeichert');},
      function(e){b.disabled=false;if(e&&e.abgebrochen){return;}fehlerZeigen('Nicht gespeichert: '+((e&&e.message)||String(e))+' – dein Text bleibt hier stehen.');});
}
function tabVerlauf(d){
  return karte('<h2>Protokoll</h2><p class="ar-leise">Jede Änderung am Dossier – wer, wann, was.</p><ol class="ar-protokoll">'+
    (d.verlauf||[]).slice().reverse().map(function(v){return '<li><span class="ar-leise">'+esc(datumZeit(v.z))+'</span><b>'+esc(kname(v.v))+'</b><span>'+esc(v.t)+'</span></li>';}).join('')+'</ol>');
}

/* ---------- Aktionen am Dossier ---------- */
function mitDossier(p,t){return p.then(function(d){dossierNeu(d);if(t){toast(t);}return d;});}
function weitergebenDialog(d){
  var inhalt='<p>Der Schüler wechselt die zuständige Stelle – z. B. vom Diagnostique in die Annexe. Alle können das Dossier weiter lesen; der ganze Weg bleibt im Dossier sichtbar.</p><div class="ar-raster2">'+
    auswahl('stelle','An welche Stelle?','',stellenOptionen().filter(function(o){return o[0]!==d.stelle;}),'– bitte wählen –')+
    '<div>'+suchfeld('verantwortlich')+auswahl('verantwortlich','Neue/r Fallverantwortliche/r (optional)','',kontoOptionen(),'– später festlegen –')+'</div></div>'+
    '<label class="ar-haken"><input type="checkbox" name="behalten"> Die bisherigen Fallverantwortlichen ('+esc((d.verantwortlich||[]).map(kname).join(', ')||'—')+') behalten ein Schreibrecht</label>'+
    textfeld('notiz','Notiz zur Weitergabe (optional)','',2);
  dialog('Weitergeben',inhalt,[{text:'Abbrechen',wert:''},{text:'Weitergeben',wert:'ok',primaer:true}],{breit:true,nachAufbau:suchfelderVerbinden,
    pruefen:function(w){return w.werte.stelle?'':'Bitte die neue Stelle wählen.';},
    ausfuehren:function(w){return T.ops.weitergeben(d.id,{stelle:w.werte.stelle,verantwortlich:w.werte.verantwortlich,bisherigeBehalten:!!w.werte.behalten,notiz:w.werte.notiz.trim()});}
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Weitergegeben an '+team(r.ergebnis.stelle).name);}});
}
function rechteDialog(d){
  var liste=Object.keys(d.rechte||{});
  var inhalt='<p>Wer ein Schreibrecht hat, kann Einträge schreiben, Einschätzungen machen und Stammdaten ändern. <b>Lesen</b> können ohnehin alle Freigeschalteten.</p>'+
    '<h3>Fallverantwortlich</h3><p>'+esc((d.verantwortlich||[]).map(kname).join(', ')||'—')+'</p>'+
    '<h3>Schreibrecht</h3>'+(liste.length?'<ul class="ar-rechteliste">'+liste.map(function(id){return '<li>'+esc(kname(id))+'<small> seit '+esc(datum(tagVon(d.rechte[id].am)))+', von '+esc(kname(d.rechte[id].von))+'</small><button type="button" class="ar-link gefahr" data-weg="'+esc(id)+'">Entziehen</button></li>';}).join('')+'</ul>':'<p class="ar-leise">Noch niemand.</p>')+
    suchfeld('neu')+auswahl('neu','Schreibrecht geben an','',kontoOptionen(function(k){return liste.indexOf(k.id)<0&&(d.verantwortlich||[]).indexOf(k.id)<0;}),'– Person wählen –');
  dialog('Rechte',inhalt,[{text:'Schließen',wert:''},{text:'Recht geben',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){
      suchfelderVerbinden(dlg);
      dlg.addEventListener('click',function(ev){
        var b=ev.target.closest('[data-weg]');if(!b){return;}
        b.disabled=true;
        T.ops.rechtNehmen(d.id,b.getAttribute('data-weg')).then(function(neu){dossierNeu(neu);b.closest('li').remove();toast('Schreibrecht entzogen');},function(e){b.disabled=false;dlg.fehler((e&&e.message)||String(e));});
      });
    },
    pruefen:function(w){return w.werte.neu?'':'Bitte eine Person wählen.';},
    ausfuehren:function(w){return T.ops.rechtGeben(d.id,w.werte.neu);}
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Schreibrecht gegeben');}});
}
function verantwortlichDialog(d){
  var inhalt='<p>Fallverantwortliche leiten den Fall: Sie dürfen weitergeben und Rechte vergeben.</p>'+
    suchfeld('ar-verantw-liste')+
    '<div class="ar-checkliste ar-checkliste-lang" id="ar-verantw-liste">'+freieKonten().slice().sort(function(a,b){var x=(d.verantwortlich||[]).indexOf(a.id)>=0, y=(d.verantwortlich||[]).indexOf(b.id)>=0;return x!==y?(x?-1:1):a.name.localeCompare(b.name,'de');}).map(function(k){return '<label class="ar-haken"><input type="checkbox" name="v_'+esc(k.id)+'"'+((d.verantwortlich||[]).indexOf(k.id)>=0?' checked':'')+'> '+esc(k.name)+' <small>'+esc(k.teamName)+'</small></label>';}).join('')+'</div>';
  dialog('Fallverantwortliche',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,nachAufbau:suchfelderVerbinden,
    pruefen:function(w){return Object.keys(w.werte).some(function(k){return /^v_/.test(k)&&w.werte[k];})?'':'Mindestens eine Person muss fallverantwortlich sein.';},
    ausfuehren:function(w){var l=Object.keys(w.werte).filter(function(k){return /^v_/.test(k)&&w.werte[k];}).map(function(k){return k.slice(2);});return T.ops.verantwortlich(d.id,l);}
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Gespeichert');}});
}
function personDialog(d){
  var p=d.person||{};
  var inhalt='<div class="ar-raster2">'+feld('nachname','Nachname',p.nachname)+feld('vorname','Vorname',p.vorname)+feld('geburtsdatum','Geburtsdatum',p.geburtsdatum,'date')+
    auswahl('geschlecht','Geschlecht',p.geschlecht||'',[['m','Junge'],['w','Mädchen']],'–')+feld('schule','Schule',p.schule)+feld('klasse','Klasse / Cycle',p.klasse)+
    feld('matricule','Matricule',p.matricule)+feld('sprachen','Sprachen',p.sprachen)+'</div>'+textfeld('kontakt','Eltern / Kontakt (Namen, Telefon)',p.kontakt,2);
  dialog('Stammdaten',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){return (w.werte.nachname.trim()&&w.werte.vorname.trim())?'':'Vor- und Nachname fehlen.';},
    ausfuehren:function(w){function sauber(o){var v={};Object.keys(o||{}).forEach(function(k){v[k]=String(o[k]).trim();});return v;}return T.ops.person(d.id,sauber(w.werte),sauber(w.anfang));}
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Stammdaten gespeichert');}});
}
function statusDialog(d){
  if(d.status==='inaktiv'){
    dialog('Wieder aktiv setzen','<p>'+esc(schuelerName(d.person))+' wird wieder als aktiv geführt.</p>',[{text:'Abbrechen',wert:''},{text:'Aktiv setzen',wert:'ok',primaer:true}],{ausfuehren:function(){return T.ops.status(d.id,'aktiv');}})
      .then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Wieder aktiv');}});
    return;
  }
  var inhalt='<p>Inaktive Schüler bleiben mit allen Daten erhalten und sind unter „Inaktiv“ zu finden.</p><div class="ar-raster2">'+
    auswahl('grund','Grund','Abschluss',[['Abschluss','Abschluss der Begleitung'],['Umzug','Umzug'],['Wechsel','Wechsel in eine andere Einrichtung'],['Schulende','Ende der Schulpflicht'],['Sonstiges','Sonstiges']])+feld('datum','Seit',heuteIso(),'date')+'</div>';
  dialog('Inaktiv setzen',inhalt,[{text:'Abbrechen',wert:''},{text:'Inaktiv setzen',wert:'ok',primaer:true}],{ausfuehren:function(w){return T.ops.status(d.id,'inaktiv',w.werte.grund,w.werte.datum);}})
    .then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Inaktiv gesetzt');}});
}
function eintragAendernDialog(d,eid){
  var e=(d.eintraege||[]).filter(function(x){return x.id===eid;})[0];if(!e){return;}
  var zo=zielOptionen(d,e.ziel);
  var inhalt='<div class="ar-raster3">'+feld('datum','Datum',e.datum,'date')+auswahl('art','Art',e.art,Object.keys(ARTEN).map(function(k){return [k,ARTEN[k]];}))+feld('titel','Titel',e.titel)+'</div>'+
    (zo.length?auswahl('ziel','Bezug zu einem Förderziel',e.ziel||'',zo,'– kein Bezug –'):'')+
    '<div class="ar-vorfall-platz"'+(e.art==='vorfall'?'':' hidden')+'>'+vorfallFelder(e.vorfall)+'</div>'+textfeld('text',e.art==='vorfall'?'Was ist passiert? (Verlauf)':'Text',e.text,6);
  dialog('Eintrag ändern',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){var a=dlg.querySelector('select[name="art"]'), p=dlg.querySelector('.ar-vorfall-platz'), t=dlg.querySelector('textarea[name="text"]'), lab=t&&t.closest('label');
      if(a&&p){a.addEventListener('change',function(){var v=a.value==='vorfall';p.hidden=!v;if(lab&&lab.querySelector('span')){lab.querySelector('span').textContent=v?'Was ist passiert? (Verlauf)':'Text';}});}},
    ausfuehren:function(w){
      function bau(roh){var x=Object.assign({},roh);x.vorfall=roh.art==='vorfall'?vorfallAus(roh):null;Object.keys(x).forEach(function(k){if(k.indexOf('v_')===0){delete x[k];}});return x;}
      return T.ops.eintragAendern(d.id,eid,bau(w.werte),bau(w.anfang||{}));}}).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Eintrag geändert');}});
}
/* Beobachtung direkt zu einem Förderziel eintragen */
function zielEintragDialog(d,code){
  var inf=itemZu(code), A=eldibAuswertung(d), z=A&&A.ziele.filter(function(x){return x.code===code;})[0];
  var inhalt='<p class="ar-zielkopf">'+zielChip(code)+(z?'<span>„'+esc(z.text)+'“</span>':'')+'</p><div class="ar-raster2">'+feld('datum','Datum',heuteIso(),'date')+
    auswahl('art','Art','beobachtung',Object.keys(ARTEN).map(function(k){return [k,ARTEN[k]];}))+'</div>'+
    textfeld('text','Was hast du beobachtet? (Situation, was '+((d.person||{}).vorname||'das Kind')+' gemacht hat, was geholfen hat)','',5);
  dialog('Beobachtung zum Förderziel',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){return w.werte.text.trim()?'':'Bitte beschreiben, was du beobachtet hast.';},
    ausfuehren:function(w){return T.ops.eintrag(d.id,{datum:w.werte.datum,art:w.werte.art,titel:'Zum Ziel '+code+(inf?' ('+inf.it.keyword+')':''),text:w.werte.text.trim(),ziel:code});}
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Beobachtung gespeichert');}});
}
function eintragLoeschenDialog(d,eid){
  dialog('Eintrag löschen','<p>Den Eintrag wirklich löschen? Im Protokoll bleibt vermerkt, dass er gelöscht wurde.</p>',[{text:'Abbrechen',wert:''},{text:'Löschen',wert:'ok',primaer:true,gefahr:true}],{ausfuehren:function(){return T.ops.eintragLoeschen(d.id,eid);}})
    .then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Eintrag gelöscht');}});
}
function loeschenDialog(d){
  dialog('Dossier löschen','<p><b>'+esc(schuelerName(d.person))+'</b> und alle Einträge werden endgültig gelöscht. Meist ist „Inaktiv setzen“ die bessere Wahl.</p>'+feld('bestaetigung','Zur Bestätigung den Nachnamen eintippen','','text',' autocomplete="off"'),
    [{text:'Abbrechen',wert:''},{text:'Endgültig löschen',wert:'ok',primaer:true,gefahr:true}],{
      pruefen:function(w){return w.werte.bestaetigung.trim().toLowerCase()===String((d.person||{}).nachname||'').toLowerCase()?'':'Der Nachname stimmt nicht.';},
      ausfuehren:function(){return T.ops.loeschen(d.id);}
    }).then(function(r){if(r.aktion==='ok'){if(letzteListe){letzteListe=letzteListe.filter(function(x){return x.id!==d.id;});}location.hash='#/schueler';toast('Dossier gelöscht');}});
}

/* ---------- Verbindung zum ELDiB-Generator ---------- */
function eldibListe(){try{return JSON.parse(localStorage.getItem('eldib-schueler-liste')||'[]')||[];}catch(e){return [];}}
function eldibListeSpeichern(l){localStorage.setItem('eldib-schueler-liste',JSON.stringify(l));}
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');}
function eldibPasst(s,d){
  if(s.hubId===d.id){return 3;}
  var p=d.person||{}, n=String(s.name||'').split(','), nach=norm(n[0]), vor=norm(n.slice(1).join(','));
  var name=nach===norm(p.nachname)&&vor===norm(p.vorname);
  if(name&&(!s.geburtsdatum||!p.geburtsdatum||s.geburtsdatum===p.geburtsdatum)){return 2;}
  return 0;
}
function hatDs(e){var ds=e&&e.dsData;return !!(ds&&(Object.keys(ds.bewertungen||{}).length||Object.keys(ds.chips||{}).length||Object.keys(ds.f||{}).some(function(k){return ds.f[k];})));}
function eldibUebernehmenDialog(d){
  var l=eldibListe();
  if(!l.length){dialog('Aus dem ELDiB-Generator übernehmen','<p>Im ELDiB-Generator ist auf diesem Computer noch kein Schüler angelegt.</p><p>Tipp: Mit <b>„ELDiB / DS“</b> oben im Dossier öffnest du den Schüler direkt im ELDiB-Generator – mit den Stammdaten aus dem Dossier.</p>');return;}
  l=l.map(function(s){
    var e2=hatDs(s.einschaetzung2)?s.einschaetzung2:null, e1=hatDs(s.einschaetzung1)?s.einschaetzung1:null;
    return {s:s,passt:eldibPasst(s,d),dsE:e2||e1,ein:eldibAusEintrag(s)};
  }).sort(function(a,b){return b.passt-a.passt||String(a.s.name).localeCompare(String(b.s.name),'de');});
  var inhalt='<p>Welcher Schüler im ELDiB-Generator ist '+esc(schuelerNameKurz(d.person))+'? Übernommen werden der <b>DS</b> (Aussagen, Auswahlfelder, Fakten) und die <b>ELDiB-Einschätzungen</b> mit Stufen, Förderzielen, Zusatzzielen und Notizen. Was beim gewählten Schüler fehlt, bleibt im Dossier, wie es ist.</p><div class="ar-wahlliste">'+
    l.map(function(x,i){
      var n=x.dsE?Object.keys(x.dsE.dsData.bewertungen||{}).length:0, letzte=x.ein[x.ein.length-1];
      var zi=letzte?Object.keys(letzte.sel).filter(function(c){return letzte.sel[c]==='z';}).length:0;
      var info=[x.s.geburtsdatum?datum(x.s.geburtsdatum):'',x.s.klasse,x.dsE?(n?n+' DS-Aussagen':'DS begonnen'):'kein DS',
        x.ein.length?(x.ein.length>1?'ELDiB-Einschätzung 1 und 2':'1 ELDiB-Einschätzung')+(zi?' · '+zi+(zi>1?' Ziele':' Ziel'):''):'kein ELDiB'];
      return '<label class="ar-wahl'+(x.passt?' passt':'')+'"><input type="radio" name="wahl" value="'+i+'"'+(i===0&&x.passt?' checked':'')+'><span><b>'+esc(x.s.name)+'</b><small>'+esc(info.filter(Boolean).join(' · '))+'</small></span>'+(x.passt?'<span class="ar-passt">passt</span>':'')+'</label>';
    }).join('')+'</div>';
  dialog('Aus dem ELDiB-Generator übernehmen',inhalt,[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){if(w.werte.wahl==null){return 'Bitte einen Schüler wählen.';}var x=l[+w.werte.wahl];if(!x.dsE&&!x.ein.length){return 'Bei diesem Schüler ist noch nichts eingeschätzt – weder DS noch ELDiB.';}return '';},
    ausfuehren:function(w){
      var x=l[+w.werte.wahl], profil=JSON.parse(JSON.stringify(d.profil||{})), teile=[];
      profil.quelle='eldib';profil.von=K.ich().id;profil.uebernommen=new Date().toISOString();
      if(x.dsE){
        var ds=JSON.parse(JSON.stringify(x.dsE.dsData));delete ds.bearbeitet;delete ds.alt;
        profil.ds=ds;profil.datum=(x.dsE.savedAt||profil.uebernommen).slice(0,10);profil.gespeichert=x.dsE.savedAt||'';teile.push('DS');
      }
      if(x.ein.length){
        var letzte=x.ein[x.ein.length-1];
        profil.eldib={v:2,datum:letzte.datum,erreicht:Object.keys(letzte.sel).filter(function(c){return letzte.sel[c]==='e';}),
          ziele:Object.keys(letzte.sel).filter(function(c){return letzte.sel[c]==='z';}),einschaetzungen:x.ein};
        teile.push(x.ein.length>1?'ELDiB-Einschätzungen 1 und 2':'ELDiB-Einschätzung');
      }
      if(!profil.datum){profil.datum=profil.uebernommen.slice(0,10);}
      return T.ops.profil(d.id,profil,'Aus dem ELDiB-Generator übernommen: '+teile.join(' und ')+' ('+x.s.name+')').then(function(neu){
        /* Verknüpfen, damit es beim nächsten Mal sofort passt */
        var liste=eldibListe();liste.forEach(function(s){if(s.id===x.s.id){s.hubId=d.id;}});eldibListeSpeichern(liste);
        return neu;
      });
    }
  }).then(function(r){if(r.ergebnis){if(nochGewaehlt(r.ergebnis.id)){eldibWahl=null;}dossierNeu(r.ergebnis);toast('Übernommen');}});
}
/* Den Schüler im ELDiB-Generator öffnen (anlegen, falls es ihn dort noch nicht gibt) */
function eldibOeffnen(d){
  var p=d.person||{}, l=eldibListe();
  var s=l.map(function(x){return {x:x,p:eldibPasst(x,d)};}).filter(function(y){return y.p;}).sort(function(a,b){return b.p-a.p;})[0];
  var eintrag;
  if(s){eintrag=s.x;eintrag.hubId=d.id;}
  else{
    eintrag={id:'sch-'+Date.now()+'-'+Math.random().toString(36).slice(2,11),name:(p.nachname||'')+', '+(p.vorname||''),klasse:p.klasse||'',geburtsdatum:p.geburtsdatum||'',hubId:d.id,einschaetzung1:null,einschaetzung2:null};
    var ds=d.profil&&d.profil.ds?JSON.parse(JSON.stringify(d.profil.ds)):{v:2,geschlecht:p.geschlecht||'',bewertungen:{},chips:{},f:{},frei:{},tabellen:{vorgeschichte:[],aktuell:[],interventionen:[]},bearbeitet:{}};
    if(!ds.geschlecht&&p.geschlecht){ds.geschlecht=p.geschlecht;}
    eintrag.einschaetzung1={language:'de',selections:{},zusaetzlicheZiele:{demarches_mentales:{},manieres_apprendre:{},attitudes_relationnelles:{},attitudes_affectives:{},competences_essentielles:{},culture_loisirs:{}},
      stammdaten:{schueler_name:eintrag.name,geburtsdatum:p.geburtsdatum||'',matricule:p.matricule||'',foerderort:p.schule||'',klasse:p.klasse||'',periodenTyp:'trimester',periode:'1'},dsData:ds};
    l.push(eintrag);
  }
  eldibListeSpeichern(l);
  var nr=eintrag.einschaetzung2&&Object.keys(eintrag.einschaetzung2).length?2:1;
  localStorage.setItem('eldib-sm-aktiv',JSON.stringify({id:eintrag.id,einschaetzungNr:nr}));
  localStorage.removeItem('eldib-data');
  if(window.CDSE_HUB_OEFFNE){window.CDSE_HUB_OEFFNE('eldib',true);}else{location.hash='#/app/eldib';}
}

/* =====================================================================
   Entwicklung & Ziele: ELDiB und PEI im Dossier
   ---------------------------------------------------------------------
   Aus den übernommenen ELDiB-Einschätzungen: die Stufe je Bereich im
   Vergleich zum Lebensalter, Items, die für das Alter längst erwartet
   werden und noch fehlen, die aktuellen Förderziele (PEI) mit Ich-Satz,
   Förderideen und Beobachtungsbeispielen, die Zusatzziele und der
   Fortschritt zwischen zwei Einschätzungen. Die Items kommen aus
   ELDIB_BANK (apps/ds-motor.js, gebaut vom ELDiB-Generator).
   ===================================================================== */
var EL_BEREICHE=[{id:'verhalten',name:'Verhalten',farbe:'#B4533A'},{id:'kommunikation',name:'Kommunikation',farbe:'#2E3A9C'},{id:'sozialisation',name:'Sozialisation',farbe:'#1F6B6F'},{id:'kognition',name:'Kognition',farbe:'#8A6414'}];
var ROEM=['','I','II','III','IV','V'];
var ZUSATZ_NAMEN={demarches_mentales:['Denkweisen','démarches mentales'],manieres_apprendre:['Lernweisen','manières d’apprendre'],attitudes_relationnelles:['Beziehungshaltungen','attitudes relationnelles'],
  attitudes_affectives:['Emotionale Haltungen','attitudes affectives'],competences_essentielles:['Wesentliche Kompetenzen','compétences essentielles'],culture_loisirs:['Kultur und Freizeit','culture et loisirs']};
/* Ein Item gilt als „für das Alter längst erwartet“, wenn das Kind mindestens
   UEBER_AB Jahre älter ist als das Ende der Altersspanne seiner Stufe;
   ab UEBER_DEUTLICH Jahren wird es deutlich hervorgehoben. */
var UEBER_AB=1, UEBER_DEUTLICH=3, VERALTET_TAGE=183;
var eldibWahl=null, itemIndex=null, kurzCache={};
function bankDa(){return typeof ELDIB_BANK!=='undefined'&&!!ELDIB_BANK&&!!ELDIB_BANK.bereiche;}
function elBereich(id){return EL_BEREICHE.filter(function(b){return b.id===id;})[0]||EL_BEREICHE[0];}
function itemZu(code){
  if(!bankDa()){return null;}
  if(!itemIndex){
    itemIndex={};
    Object.keys(ELDIB_BANK.bereiche).forEach(function(b){var B=ELDIB_BANK.bereiche[b];
      Object.keys(B.stufen).forEach(function(s){B.stufen[s].items.forEach(function(it){itemIndex[it.code]={bereich:b,stufe:+s,it:it};});});});
  }
  return itemIndex[code]||null;
}
function codeFolge(a,b){
  var x=itemZu(a), y=itemZu(b), ids=EL_BEREICHE.map(function(q){return q.id;});
  return ((x?ids.indexOf(x.bereich):9)-(y?ids.indexOf(y.bereich):9))||((x?x.it.nr:0)-(y?y.it.nr:0));
}
function stufeSpanne(s){var m=ELDIB_BANK.stufen[s];return m?m.min+'–'+m.max+' Jahre':'';}
/* Alter in Jahren (mit Monaten als Bruchteil) an einem Tag */
function alterAm(geb,iso){
  if(!geb){return null;}
  var g=new Date(geb+'T12:00:00'), h=iso?new Date(String(iso).slice(0,10)+'T12:00:00'):new Date();
  if(isNaN(g)||isNaN(h)){return null;}
  var m=(h.getFullYear()-g.getFullYear())*12+(h.getMonth()-g.getMonth())-(h.getDate()<g.getDate()?1:0);
  return m<0?null:m/12;
}
function alterText(j){if(j==null){return '';}var y=Math.floor(j+1e-6), m=Math.round((j-y)*12);if(m>=12){y++;m=0;}return y+' J.'+(m?' '+m+' M.':'');}
function jahreText(n){n=Math.max(1,Math.round(n));return 'rund '+n+(n===1?' Jahr':' Jahre');}
function zielText(code,z){
  var inf=itemZu(code), f=(inf&&inf.it.zielformulierungen)||[];
  if(z&&typeof z.i==='number'&&z.i>=0&&f[z.i]){return f[z.i];}   /* Standard-Formulierung: immer deutsch */
  if(z&&z.t){
    /* ohne Nummer auf Französisch/Englisch gewählt? Dann die deutsche Fassung derselben Formulierung */
    var fr=((ELDIB_BANK.zieleFremd||{})[code])||{}, t=String(z.t).trim(), k=-1;
    ['fr','en'].forEach(function(l){if(k<0&&fr[l]){k=fr[l].map(function(x){return String(x).trim();}).indexOf(t);}});
    if(k>=0&&f[k]){return f[k];}
    return z.t;                                                   /* eigene Formulierung */
  }
  return f[0]||'';
}
function foerderideen(code){var inf=itemZu(code);if(!inf){return [];}return (ELDIB_BANK.interventionen||{})[code]||(ELDIB_BANK.fallback||{})[inf.bereich]||[];}
/* Passende Materialien aus der Toolbox (apps/toolbox-index.js, von update-apps.cjs geholt).
   Reihenfolge: gezielte Materialien (wenige ELDiB-Codes) vor Sammelmaterial, passender Cycle,
   mit Arbeitsblatt; KI-Entwürfe etwas nach hinten. Links öffnen die Toolbox in ihrem Tab. */
function toolboxDa(){var T=window.CDSE_TOOLBOX_INDEX;return !!(T&&Array.isArray(T.materialien));}
function zyklusVon(klasse){
  var k=String(klasse||'').toUpperCase().replace(/\s+/g,''), m=k.match(/C(?:YCLE)?([1-4])/)||k.match(/^([1-4])[.\/-]?[1-3]?$/);
  if(m){return 'C'+m[1];}
  return /ES|ESG|SECOND|LYC|^[1-7](E|EME|ÈME|IEME|IÈME|C|G|GCC|AD|PRO)?$/.test(k)?'ES':'';
}
function toolboxZuItem(code,klasse,max){
  if(!toolboxDa()){return {liste:[],n:0};}
  var zy=zyklusVon(klasse);
  var l=window.CDSE_TOOLBOX_INDEX.materialien.filter(function(m){return (m.eldib||[]).indexOf(code)>=0;});
  var bew=l.map(function(m){return {m:m,s:6/Math.max(1,(m.eldib||[]).length)+(zy&&(m.alter||[]).indexOf(zy)>=0?3:0)+(m.ab?1:0)-(m.ki?0.5:0)};});
  bew.sort(function(a,b){return b.s-a.s||String(a.m.titel).localeCompare(String(b.m.titel),'de');});
  var liste=bew.slice(0,max||3).map(function(x){return x.m;});
  /* Gibt es ein vom ISA-Team erstelltes (geprüftes) Material, steht mindestens eines in der Auswahl */
  if(liste.length&&!liste.some(function(m){return !m.ki;})){var team=bew.filter(function(x){return !x.m.ki;})[0];if(team){liste[liste.length-1]=team.m;}}
  return {liste:liste,n:l.length};
}
/* Arbeitsblätter (Toolbox v2): professionell gesetzt, mit Seite für die Lehrperson.
   Passender Cycle zählt am meisten, dann wie gezielt das Blatt das Item fördert. */
function blaetterZuItem(code,klasse,max){
  var T=window.CDSE_TOOLBOX_INDEX;
  if(!T||!Array.isArray(T.blaetter)){return {liste:[],n:0};}
  var zy=zyklusVon(klasse);
  var l=T.blaetter.filter(function(b){return (b.eldib||[]).indexOf(code)>=0;});
  var bew=l.map(function(b){return {b:b,s:4/Math.max(1,(b.eldib||[]).length)+(zy&&(b.stufen||[]).indexOf(zy)>=0?5:0)};});
  bew.sort(function(a,b){return b.s-a.s||String(a.b.nr).localeCompare(String(b.b.nr));});
  return {liste:bew.slice(0,max||3).map(function(x){return x.b;}),n:l.length};
}
function stufenKurz(s){s=(s||[]).slice();return s.length>1?s[0]+'–'+s[s.length-1]:(s[0]||'');}
function toolboxHref(teile){return 'apps/toolbox.html#'+teile.map(function(t){return t[0]+'='+encodeURIComponent(t[1]);}).join('&');}
function toolboxBlock(code,d){
  var kl=(d.person||{}).klasse, B=blaetterZuItem(code,kl,3), T=toolboxZuItem(code,kl,3);
  if(!T.n&&!B.n){return '';}
  var ab=B.n?'<ul class="ar-blaetter">'+B.liste.map(function(b){
      return '<li><a href="'+esc(toolboxHref([['blatt',b.id]]))+'" target="cdse-toolbox"><span class="ar-ab-nr">'+esc(b.nr)+'</span>'+esc(b.titel)+'</a>'+
        '<small>Arbeitsblatt · '+esc(stufenKurz(b.stufen))+' · '+esc(b.bereich)+(b.fr?' · auch Französisch':'')+'</small></li>';
    }).join('')+'</ul>'+
    (B.n>B.liste.length?'<a class="ar-link ar-blaetter-alle" href="'+esc(toolboxHref([['eldib',code]]))+'" target="cdse-toolbox">Alle '+B.n+' Arbeitsblätter zu '+esc(code)+'</a>':''):'';
  if(!T.n){return '<h4>Passende Arbeitsblätter aus der Toolbox</h4>'+ab;}
  return '<h4>Passende Materialien aus der Toolbox</h4>'+ab+'<ul class="ar-material">'+T.liste.map(function(m){
      var info=[(m.typ||[]).join(', '),(m.alter||[]).join(' · '),m.ab?'mit Arbeitsblatt':''].filter(Boolean).join(' · ');
      return '<li><a href="'+esc(toolboxHref([['eldib',code],['material',m.id]]))+'" target="cdse-toolbox">'+esc(m.titel)+'</a>'+
        '<small>'+esc(info)+(m.ki?' · <span class="ar-ki" title="Von einer KI entworfen – vor dem Einsatz fachlich prüfen">KI-Entwurf</span>':'')+'</small></li>';
    }).join('')+'</ul>'+
    (T.n>T.liste.length?'<a class="ar-link ar-material-alle" href="'+esc(toolboxHref([['eldib',code],['seite','einheiten']]))+'" target="cdse-toolbox">Alle '+T.n+' Materialien zu '+esc(code)+' in der Toolbox</a>':'');
}
function beispiele(code){return (ELDIB_BANK.beispiele||{})[code]||[];}
/* Hinweise des CDSE zum Item (z. B. „Logopädie einschalten“, „Piktogramme vorhanden“) */
function itemHinweise(code){var h=(ELDIB_BANK.hinweise||{})[code];return h?(Array.isArray(h)?h:[h]).filter(Boolean):[];}
function hinweisHtml(code){var h=itemHinweise(code);return h.length?'<p class="ar-itemhinweis">'+svg('info')+'<span>'+h.map(esc).join(' ')+'</span></p>':'';}
function einschaetzungName(e){return (e.nr?'Einschätzung '+e.nr:'ELDiB-Einschätzung')+(e.datum?' vom '+datum(e.datum):'');}

/* Aus einem Schüler der ELDiB-Liste die Einschätzungen fürs Dossier
   (nur Status, Ziel-Formulierung, Zusatzziele, Notizen – ohne DS) */
function eldibAusEintrag(s){
  var aus=[];
  [[1,s.einschaetzung1],[2,s.einschaetzung2]].forEach(function(x){
    var e=x[1];if(!e||typeof e!=='object'){return;}
    var sel={}, ziele={}, zus={}, no={}, st=e.stammdaten||{};
    Object.keys(e.selections||{}).forEach(function(c){
      var v=e.selections[c]||{};
      if(v.status==='erreicht'){sel[c]='e';}
      else if(v.status==='nicht-erreicht'){sel[c]='n';}
      else if(v.status==='ziel'){sel[c]='z';ziele[c]={t:v.zieltext||'',i:typeof v.zielIndex==='number'?v.zielIndex:null};}
    });
    Object.keys(e.zusaetzlicheZiele||{}).forEach(function(k){
      var o=e.zusaetzlicheZiele[k]||{}, n={};
      Object.keys(o).forEach(function(id){var w=o[id];w=w==='erreicht'?'stufe3':(w==='ziel'?'stufe1':w);var m=/^stufe([123])$/.exec(w||'');if(m){n[id]=+m[1];}});
      if(Object.keys(n).length){zus[k]=n;}
    });
    Object.keys(e.bereichNotizen||{}).forEach(function(k){var t=String(e.bereichNotizen[k]||'').trim();if(t){no[k]=t;}});
    if(!Object.keys(sel).length&&!Object.keys(zus).length){return;}
    aus.push({nr:x[0],datum:st.einschaetzungsdatum||'',von:st.einschaetzende||'',schuljahr:st.schuljahr||'',
      periode:st.periode?((st.periodenTyp==='semester'?'Semester ':'Trimester ')+st.periode):'',gespeichert:e.savedAt||'',sel:sel,ziele:ziele,zusatz:zus,notizen:no});
  });
  return aus;
}
/* Einschätzungen des Dossiers, älteste zuerst (auch aus älteren Übernahmen) */
function eldibEinschaetzungen(d){
  var e=d&&d.profil&&d.profil.eldib;if(!e){return [];}
  if(e.einschaetzungen&&e.einschaetzungen.length){return e.einschaetzungen.slice().sort(function(a,b){return (a.nr||0)-(b.nr||0);});}
  var sel={};(e.erreicht||[]).forEach(function(c){sel[c]='e';});(e.ziele||[]).forEach(function(c){sel[c]='z';});
  return Object.keys(sel).length?[{nr:0,datum:e.datum||'',sel:sel,ziele:{},zusatz:{},notizen:{}}]:[];
}
/* Höchste Stufe mit erreichten Items (wie im DS-Bericht) */
function hoechsteStufe(sel,bereich){
  var bank=ELDIB_BANK.bereiche[bereich], h=0;
  Object.keys(bank.stufen).forEach(function(s){if(bank.stufen[s].items.some(function(it){return sel[it.code]==='e';})){h=Math.max(h,+s);}});
  return h;
}
function eldibAuswertung(d,nr){
  if(!bankDa()){return null;}
  var alle=eldibEinschaetzungen(d);if(!alle.length){return null;}
  var i=alle.length-1;
  if(nr!=null){alle.forEach(function(x,k){if(x.nr===nr){i=k;}});}
  var e=alle[i], p=d.person||{};
  var bezug=e.datum||(e.gespeichert||'').slice(0,10)||'';
  var j=alterAm(p.geburtsdatum,bezug||null), jahre=j==null?null:Math.floor(j+1e-6);
  var erwartet=jahre==null?null:(jahre<=2?1:jahre<=5?2:jahre<=9?3:jahre<=12?4:5);
  var bereiche=[], ueber=[], offen=0;
  EL_BEREICHE.forEach(function(B){
    var bank=ELDIB_BANK.bereiche[B.id];if(!bank){return;}
    var stufen=[], hoch=0, bewertet=false;
    Object.keys(bank.stufen).map(Number).sort(function(a,b){return a-b;}).forEach(function(s){
      var luecke=j==null?null:j-ELDIB_BANK.stufen[s].max;
      var z={s:s,n:0,e:0,nicht:0,ziel:0,offen:0,ueber:0,spaet:luecke!=null&&luecke>=UEBER_AB};
      bank.stufen[s].items.forEach(function(it){
        var v=e.sel[it.code];z.n++;
        if(v==='e'){z.e++;}else if(v==='n'){z.nicht++;}else if(v==='z'){z.ziel++;}else{z.offen++;}
        if((v==='n'||v==='z')&&z.spaet){z.ueber++;ueber.push({code:it.code,it:it,bereich:B.id,stufe:s,luecke:luecke,istZiel:v==='z'});}
      });
      if(z.e){hoch=s;}
      if(z.e||z.nicht||z.ziel){bewertet=true;}
      stufen.push(z);
    });
    /* Nicht eingeschätzte Items in längst fälligen Stufen, die das Kind noch nicht sicher hinter sich hat */
    stufen.forEach(function(z){if(bewertet&&z.spaet&&z.s>=hoch&&z.offen){offen+=z.offen;}});
    var voll=hoch&&stufen[hoch-1].e===stufen[hoch-1].n, arbeit=!hoch?1:(voll&&hoch<5?hoch+1:hoch);
    bereiche.push({id:B.id,name:B.name,code:bank.code,farbe:B.farbe,stufen:stufen,stufe:hoch,bewertet:bewertet,
      abstand:(erwartet&&hoch)?erwartet-hoch:null,arbeit:arbeit,leitziel:(bank.stufen[arbeit]||{}).ziel||'',notiz:(e.notizen||{})[B.id]||''});
  });
  ueber.sort(function(a,b){return (b.luecke-a.luecke)||codeFolge(a.code,b.code);});
  var ziele=Object.keys(e.sel).filter(function(c){return e.sel[c]==='z'&&itemZu(c);}).sort(codeFolge).map(function(c){
    var inf=itemZu(c);
    return {code:c,it:inf.it,bereich:inf.bereich,stufe:inf.stufe,text:zielText(c,(e.ziele||{})[c]),ideen:foerderideen(c),beispiele:beispiele(c),
      ueber:ueber.filter(function(u){return u.code===c;})[0]||null};
  });
  return {e:e,alle:alle,index:i,alter:j,jahre:jahre,erwartet:erwartet,bereiche:bereiche,ueber:ueber,offen:offen,ziele:ziele,
    zusatz:zusatzListen(e),naechste:naechsteSchritte(e,bereiche),fortschritt:i>0?fortschritt(alle[i-1],e):null,
    tage:bezug?Math.floor((Date.now()-new Date(bezug.slice(0,10)+'T12:00:00').getTime())/864e5):null,
    notizZusatz:(e.notizen||{}).zusaetzlich||''};
}
/* Kandidaten für die nächsten Ziele: je Bereich die ersten zwei offenen Items ab der Arbeitsstufe */
function naechsteSchritte(e,bereiche){
  var r=[];
  bereiche.forEach(function(b){
    if(!b.bewertet){return;}
    var bank=ELDIB_BANK.bereiche[b.id], l=[];
    Object.keys(bank.stufen).map(Number).sort(function(x,y){return x-y;}).forEach(function(s){
      bank.stufen[s].items.forEach(function(it){var v=e.sel[it.code];if(v==='e'||v==='z'){return;}if(v==='n'||s>=b.arbeit){l.push({code:it.code,it:it,stufe:s,nicht:v==='n'});}});
    });
    if(l.length){r.push({bereich:b,items:l.slice(0,2)});}
  });
  return r;
}
function zusatzListen(e){
  var r={kann:[],hilfe:[],lernt:[]};
  Object.keys(ZUSATZ_NAMEN).forEach(function(kat){
    var o=(e.zusatz||{})[kat]||{}, bank=(ELDIB_BANK.zusatz||{})[kat]||[];
    bank.forEach(function(g){
      var st=o[g.id];if(!st){return;}
      var x={kat:kat,id:g.id,titel:g.title,text:(g.stufen||{})['stufe'+st]||'',ideen:g.intervention||[]};
      (st===3?r.kann:(st===2?r.hilfe:r.lernt)).push(x);
    });
  });
  return r;
}
/* Was hat sich zwischen zwei Einschätzungen getan? */
function fortschritt(a,b){
  var neu=[], zurueck=[], ziele=[];
  Object.keys(b.sel).forEach(function(c){if(b.sel[c]==='e'&&a.sel[c]!=='e'&&itemZu(c)){neu.push(c);}});
  Object.keys(a.sel).forEach(function(c){
    if(!itemZu(c)){return;}
    if(a.sel[c]==='e'&&(b.sel[c]==='n'||b.sel[c]==='z')){zurueck.push(c);}
    if(a.sel[c]==='z'){ziele.push({code:c,jetzt:b.sel[c]||'',text:zielText(c,(a.ziele||{})[c])});}
  });
  neu.sort(codeFolge);zurueck.sort(codeFolge);ziele.sort(function(x,y){return codeFolge(x.code,y.code);});
  var stufen=EL_BEREICHE.map(function(B){return {b:B,von:hoechsteStufe(a.sel,B.id),bis:hoechsteStufe(b.sel,B.id),
    plus:Object.keys(b.sel).filter(function(c){var i=itemZu(c);return i&&i.bereich===B.id&&b.sel[c]==='e'&&a.sel[c]!=='e';}).length};});
  return {von:a,bis:b,neu:neu,zurueck:zurueck,ziele:ziele,erreicht:ziele.filter(function(z){return z.jetzt==='e';}).length,stufen:stufen};
}
/* Kurzfassung für die Schülerliste (zwischengespeichert je Dossier-Stand) */
function eldibKurz(d){
  var k=d.id+':'+(d.rev|0);
  if(!(k in kurzCache)){var A=bankDa()?eldibAuswertung(d):null;kurzCache[k]=A?{ueber:A.ueber.length,ohneZiel:A.ueber.filter(function(u){return !u.istZiel;}).length,ziele:A.ziele.length,
    /* für die Datenbank: Stufe je Bereich (null = nicht eingeschätzt), Datum und erwartete Stufe */
    datum:A.e.datum||String(A.e.gespeichert||'').slice(0,10)||'',erwartet:A.erwartet,stufen:A.bereiche.reduce(function(o,b){o[b.id]=b.bewertet?b.stufe:null;return o;},{})}:null;}
  return kurzCache[k];
}
/* Profil im Format des DS-Berichts (Abschnitt „Ergebnisse der Testverfahren“) */
function dsEldibProfilAus(A){
  if(!A){return null;}
  var bereiche=A.bereiche.map(function(b){
    var er=[], zi=[], bank=ELDIB_BANK.bereiche[b.id];
    Object.keys(bank.stufen).map(Number).sort(function(x,y){return x-y;}).forEach(function(s){
      bank.stufen[s].items.forEach(function(it){
        var v=A.e.sel[it.code], x={code:it.code,intern:it.code,nr:it.nr,description:it.description,keyword:it.keyword,stufe:s};
        if(v==='e'){er.push(x);}else if(v==='z'){zi.push(x);}
      });
    });
    var alter=0, r=(ELDIB_BANK.dsStufenAlter||{})[b.stufe];
    if(b.stufe&&r){var st=b.stufen[b.stufe-1];alter=r[0]+(r[1]-r[0])*st.e/st.n;}
    return {id:b.id,code:b.code,name:b.name,stufe:b.stufe,alter:alter,richtziel:(ELDIB_BANK.richtziel||[])[b.stufe]||'',erreicht:er,ziele:zi};
  }).sort(function(x,y){return y.alter-x.alter;});
  return {bereiche:bereiche,lebensalter:A.jahre,erwarteteStufe:A.erwartet};
}
/* Gibt es im ELDiB-Generator auf diesem Computer neuere Daten als im Dossier? */
function eldibNeuer(d){
  var l=eldibListe().map(function(x){return {x:x,p:eldibPasst(x,d)};}).filter(function(y){return y.p;}).sort(function(a,b){return b.p-a.p;});
  if(!l.length){return null;}
  var s=l[0].x, neu='';
  [s.einschaetzung1,s.einschaetzung2].forEach(function(e){if(e&&e.savedAt&&e.savedAt>neu){neu=e.savedAt;}});
  if(!neu){return null;}
  var pr=d.profil||{}, bekannt=pr.gespeichert||'';
  eldibEinschaetzungen(d).forEach(function(e){if(e.gespeichert&&e.gespeichert>bekannt){bekannt=e.gespeichert;}});
  if(!bekannt){bekannt=pr.datum?pr.datum+'T23:59:59':'';}
  return neu>bekannt?{s:s,gespeichert:neu}:null;
}

/* ---------- Darstellung ---------- */
function stufenLeiter(A,gross){
  return '<div class="ar-leiter'+(gross?' gross':'')+'">'+A.bereiche.map(function(b){
    var art=!b.bewertet?'leer':(!b.stufe?'krit':(b.abstand==null?'leer':(b.abstand<=0?'ok':(b.abstand===1?'warn':'krit'))));
    var txt=!b.bewertet?'nicht eingeschätzt':(!b.stufe?'noch kein Item erreicht':(b.abstand==null?'':(b.abstand<=0?'altersgemäß':(b.abstand===1?'1 Stufe unter dem Alter':b.abstand+' Stufen unter dem Alter'))));
    return '<div class="ar-leiter-zeile" style="--bc:'+b.farbe+'">'+
      '<div class="ar-leiter-name"><b>'+esc(b.name)+'</b><small>'+(b.stufe?'Stufe '+ROEM[b.stufe]+' · '+esc(stufeSpanne(b.stufe)):'–')+'</small></div>'+
      '<div class="ar-leiter-bahn">'+b.stufen.map(function(z){
        var f=z.n?z.e/z.n:0, erw=A.erwartet===z.s;
        var t='Stufe '+ROEM[z.s]+' ('+stufeSpanne(z.s)+'): '+z.e+' von '+z.n+' Items erreicht'+(z.ziel?', '+z.ziel+(z.ziel>1?' Förderziele':' Förderziel'):'')+(z.nicht?', '+z.nicht+' nicht erreicht':'')+
          (z.ueber?'. '+z.ueber+(z.ueber>1?' Items sind':' Item ist')+' für das Alter längst erwartet':'')+(erw?'. Diese Stufe ist für das Alter zu erwarten':'');
        return '<div class="ar-seg'+(erw?' erwartet':'')+(z.ueber?' ueber':'')+'" style="--f:'+f.toFixed(3)+'" role="img" aria-label="'+esc(t)+'" title="'+esc(t)+'">'+
          '<span class="ar-seg-f"></span><span class="ar-seg-t">'+ROEM[z.s]+'</span>'+(z.ueber?'<i class="ar-seg-u">'+z.ueber+'</i>':'')+(z.ziel?'<i class="ar-seg-z"></i>':'')+'</div>';
      }).join('')+'</div>'+
      '<div class="ar-leiter-status '+art+'">'+esc(txt)+'</div></div>';
  }).join('')+
  '<div class="ar-leiter-legende"><span><i class="f"></i>erreicht</span><span><i class="e"></i>für das Alter zu erwarten'+(A.jahre!=null?' ('+A.jahre+' Jahre)':'')+'</span><span><i class="u">3</i>Items überfällig</span><span><i class="z"></i>Förderziel in der Stufe</span></div></div>';
}
function icode(code){var inf=itemZu(code);return '<span class="ar-icode" style="--bc:'+(inf?elBereich(inf.bereich).farbe:'#586277')+'">'+esc(code)+'</span>';}
function ueberZeile(u){
  return '<li class="ar-ueb'+(u.luecke>=UEBER_DEUTLICH?' stark':'')+'">'+icode(u.code)+'<div><b>'+esc(u.it.keyword)+'</b> – '+esc(u.it.description)+
    '<small>Stufe '+ROEM[u.stufe]+', üblich bis etwa '+ELDIB_BANK.stufen[u.stufe].max+' Jahre · <b>'+esc(jahreText(u.luecke))+' überfällig</b> · '+
    (u.istZiel?'<span class="ar-ist-ziel">ist Förderziel</span>':'<span class="ar-kein-ziel">noch kein Förderziel</span>')+
    (function(){
      var n=toolboxZuItem(u.code).n, b=blaetterZuItem(u.code).n;if(!n&&!b){return '';}
      var t=[b?b+(b>1?' Arbeitsblätter':' Arbeitsblatt'):'',n?n+(n>1?' Materialien':' Material'):''].filter(Boolean).join(' · ');
      return ' · <a class="ar-tb" href="'+esc(toolboxHref([['eldib',u.code]]))+'" target="cdse-toolbox">'+t+' in der Toolbox</a>';
    })()+
    '</small>'+hinweisHtml(u.code)+'</div></li>';
}
function eldibUeberblick(d){
  if(!bankDa()){return '';}
  var A=eldibAuswertung(d);if(!A){return '';}
  var h='<div class="ar-karte ar-eldibkarte"><div class="ar-kartenkopf"><h2>Entwicklung & Ziele</h2><span class="ar-leise">'+esc(einschaetzungName(A.e))+(A.alter!=null?' · Alter damals '+esc(alterText(A.alter)):'')+'</span></div>'+stufenLeiter(A);
  if(A.ueber.length){
    var oz=A.ueber.filter(function(u){return !u.istZiel;}).length;
    h+='<div class="ar-ueber-kurz"><p><b>'+A.ueber.length+(A.ueber.length>1?' Items sind':' Item ist')+' für das Alter längst erwartet</b> und noch nicht erreicht'+(oz?' – '+oz+' davon noch ohne Förderziel':'')+'.</p><ul class="ar-ueb-liste">'+A.ueber.slice(0,4).map(ueberZeile).join('')+'</ul>'+
      (A.ueber.length>4?'<button class="ar-link" type="button" data-tab="entwicklung">Alle '+A.ueber.length+' anzeigen</button>':'')+'</div>';
  }
  if(A.ziele.length){
    h+='<h3 class="ar-zwischen">Woran wir gerade arbeiten</h3><ul class="ar-zielkurz">'+A.ziele.map(function(z){return '<li>'+icode(z.code)+'<span>„'+esc(z.text)+'“</span></li>';}).join('')+'</ul>';
  }
  h+='<button class="ar-link" type="button" data-tab="entwicklung">'+svg('ziel')+'Alles zu Entwicklung & Zielen</button></div>';
  return h;
}
function zielKarte(z,d,r){
  var B=elBereich(z.bereich);
  var ein=(d.eintraege||[]).filter(function(e){return e.ziel===z.code;}).sort(function(a,b){return (b.datum+(b.z||''))<(a.datum+(a.z||''))?-1:1;});
  return '<article class="ar-ziel" style="--bc:'+B.farbe+'"><header>'+icode(z.code)+'<b>'+esc(z.it.keyword)+'</b><small>'+esc(B.name)+' · Stufe '+ROEM[z.stufe]+'</small>'+
      (z.ueber?'<span class="ar-ueb-badge" title="Für das Alter längst erwartet">überfällig</span>':'')+'</header>'+
    '<p class="ar-ichsatz">„'+esc(z.text)+'“</p><p class="ar-klein">'+esc(z.it.description)+'</p>'+hinweisHtml(z.code)+
    (z.ideen.length?'<h4>Förderideen</h4><ul>'+z.ideen.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
    (z.beispiele.length?'<h4>Woran man es merkt</h4><ul>'+z.beispiele.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
    toolboxBlock(z.code,d)+
    '<footer>'+(ein.length?'<span>'+ein.length+(ein.length>1?' Einträge':' Eintrag')+' dazu, zuletzt am '+esc(datum(ein[0].datum))+'</span>':'<span class="ar-leise">Noch keine Einträge zu diesem Ziel</span>')+
      (r.bearbeiten?'<button class="ar-link" type="button" data-ar="ziel-eintrag" data-item="'+esc(z.code)+'">'+svg('plus')+'Beobachtung eintragen</button>':'')+'</footer></article>';
}
function tabEntwicklung(d,r){
  if(!bankDa()){return hinweis('Für diese Ansicht fehlt die Datei <code>apps/ds-motor.js</code> im Hub-Ordner (Text-Motor und Itembank des ELDiB-Generators). Bitte mit <code>update-apps.cjs</code> holen.');}
  var alle=eldibEinschaetzungen(d), h='', neu=r.bearbeiten?eldibNeuer(d):null;
  if(neu){h+=hinweis('Im ELDiB-Generator auf diesem Computer gibt es neuere Daten (gespeichert am '+esc(datumZeit(neu.gespeichert))+'). <button class="ar-link" type="button" data-ar="eldib-uebernehmen">Jetzt übernehmen</button>','info');}
  if(!alle.length){
    return h+karte('<h2>Noch keine ELDiB-Einschätzung</h2><p>Hier erscheinen der Entwicklungsstand je Bereich, die Items, die für das Alter längst erwartet werden, und die Förderziele des PEI – sobald eine Einschätzung aus dem ELDiB-Generator übernommen ist.</p>'+
      (r.bearbeiten?'<div class="ar-knopfreihe"><button class="btn primary" type="button" data-ar="eldib-uebernehmen">'+svg('ziel')+'Aus dem ELDiB-Generator übernehmen</button><button class="btn" type="button" data-ar="eldib-oeffnen">Im ELDiB-Generator öffnen</button></div>':''),'ar-leer');
  }
  var A=eldibAuswertung(d,eldibWahl), p=d.person||{}, vn=p.vorname||'das Kind';
  /* Kopf: welche Einschätzung, Alter, Aktualität */
  h+='<div class="ar-eldibkopf">'+(alle.length>1?'<div class="ar-ansicht" role="tablist">'+alle.map(function(e){var an=e===A.e;return '<button type="button" role="tab" aria-selected="'+an+'" class="'+(an?'on':'')+'" data-ar="eldib-wahl" data-nr="'+e.nr+'">'+esc(einschaetzungName(e))+'</button>';}).join('')+'</div>':'<b>'+esc(einschaetzungName(A.e))+'</b>')+
    '<span class="ar-leise">'+esc([A.e.von?'eingeschätzt von '+A.e.von:'',A.e.schuljahr?'Schuljahr '+A.e.schuljahr:'',A.e.periode,A.alter!=null?'Alter damals '+alterText(A.alter):''].filter(Boolean).join(' · '))+'</span>'+
    (r.bearbeiten?'<span class="ar-eldibkopf-knoepfe"><button class="btn" type="button" data-ar="eldib-uebernehmen">'+svg('reload')+'Neu übernehmen</button><button class="btn" type="button" data-ar="eldib-oeffnen">'+svg('ziel')+'Im ELDiB-Generator öffnen</button></span>':'')+'</div>';
  if(A.alter==null){h+=hinweis('Für den Vergleich mit dem Alter fehlt das Geburtsdatum in den Stammdaten.'+(r.bearbeiten?' <button class="ar-link" type="button" data-ar="person">Stammdaten ergänzen</button>':''),'info');}
  if(A.tage!=null&&A.tage>VERALTET_TAGE&&A.index===A.alle.length-1){h+=hinweis('Diese Einschätzung ist über ein halbes Jahr alt. Für das PEI und für Übergaben lohnt sich eine neue ELDiB-Einschätzung.','info');}
  /* Entwicklungsstand */
  h+=karte('<div class="ar-kartenkopf"><h2>Entwicklungsstand je Bereich</h2><span class="ar-leise">Balken = erreichte Items je Stufe</span></div>'+stufenLeiter(A,true)+
    '<div class="ar-leitziele">'+A.bereiche.filter(function(b){return b.bewertet;}).map(function(b){
      return '<div style="--bc:'+b.farbe+'"><b>'+esc(b.name)+'</b><span>Leitziel Stufe '+ROEM[b.arbeit]+': '+esc(b.leitziel)+'</span>'+(b.notiz?'<q>'+esc(b.notiz)+'</q>':'')+'</div>';
    }).join('')+'</div>'+(A.notizZusatz?'<p class="ar-klein"><b>Notiz:</b> '+esc(A.notizZusatz)+'</p>':''),'ar-eldibkarte');
  /* Für das Alter längst erwartet */
  if(A.ueber.length||A.offen){
    var oz=A.ueber.filter(function(u){return !u.istZiel;}).length;
    h+=karte('<div class="ar-kartenkopf"><h2>Für das Alter längst erwartet</h2><span class="ar-leise">nicht erreicht, obwohl '+esc(vn)+' mindestens '+UEBER_AB+' Jahr älter ist als die Altersspanne der Stufe</span></div>'+
      (A.ueber.length?'<p>'+A.ueber.length+(A.ueber.length>1?' Items':' Item')+(oz?', davon <b>'+oz+' noch ohne Förderziel</b>':', alle sind bereits Förderziele')+'. Die ältesten Lücken stehen oben – hier lohnt es sich, zuerst anzusetzen.</p>':'')+
      EL_BEREICHE.map(function(B){var l=A.ueber.filter(function(u){return u.bereich===B.id;});return l.length?'<h3 class="ar-bereichskopf" style="--bc:'+B.farbe+'">'+esc(B.name)+' <small>'+l.length+'</small></h3><ul class="ar-ueb-liste">'+l.map(ueberZeile).join('')+'</ul>':'';}).join('')+
      (A.offen?hinweis('Außerdem sind '+A.offen+(A.offen>1?' Items':' Item')+' aus Stufen, die für das Alter längst abgeschlossen sein sollten, noch nicht eingeschätzt. Bitte im ELDiB-Generator ergänzen, damit das Bild vollständig ist.','info'):''));
  }else if(A.alter!=null){
    h+=karte('<h2>Für das Alter längst erwartet</h2><p class="ar-ok">Keine Lücken: Alle Items der Stufen, die für das Alter längst abgeschlossen sein sollten, sind erreicht oder waren nicht einzuschätzen.</p>');
  }
  /* Förderziele */
  h+=karte('<div class="ar-kartenkopf"><h2>Aktuelle Förderziele (PEI)</h2><span class="ar-leise">'+(A.ziele.length?A.ziele.length+(A.ziele.length>1?' Ziele':' Ziel'):'')+'</span></div>'+
    (A.ziele.length?'<p class="ar-klein">So formuliert '+esc(vn)+' die Ziele selbst. Alle, die mit '+esc(vn)+' arbeiten, können daran anknüpfen – und Beobachtungen direkt zum Ziel eintragen.</p><div class="ar-zielraster">'+A.ziele.map(function(z){return zielKarte(z,d,r);}).join('')+'</div>':
      '<p class="ar-leise">In dieser Einschätzung sind keine Förderziele markiert.</p>'));
  /* Nächste Schritte */
  if(A.naechste.length){
    h+=karte('<h2>Als Nächstes möglich</h2><p class="ar-klein">Die nächsten noch offenen Items je Bereich – Kandidaten, wenn ein Ziel erreicht ist.</p><ul class="ar-ueb-liste">'+
      A.naechste.map(function(n){return n.items.map(function(x){return '<li>'+icode(x.code)+'<div><b>'+esc(x.it.keyword)+'</b> – '+esc(x.it.description)+'<small>'+esc(n.bereich.name)+' · Stufe '+ROEM[x.stufe]+(x.nicht?' · als nicht erreicht eingeschätzt':'')+'</small></div></li>';}).join('');}).join('')+'</ul>');
  }
  /* Zusatzziele */
  var Z=A.zusatz;
  if(Z.kann.length||Z.hilfe.length||Z.lernt.length){
    var spalte=function(t,l,kl){return '<div class="ar-blick '+kl+'"><h3>'+esc(t)+' <small>'+l.length+'</small></h3>'+(l.length?'<ul>'+l.map(function(x){return '<li><b>'+esc(x.titel)+'</b> – '+esc(x.text)+'<small>'+esc(ZUSATZ_NAMEN[x.kat][0])+'</small></li>';}).join('')+'</ul>':'<p class="ar-leise">–</p>')+'</div>';};
    h+=karte('<h2>Weitere Kompetenzen (PEI-Complément)</h2><div class="ar-zusatz">'+spalte('Lernt noch (Ziel)',Z.lernt,'schwer')+spalte('Mit Unterstützung',Z.hilfe,'wann')+spalte('Kann schon',Z.kann,'gut')+'</div>');
  }
  /* Fortschritt */
  var F=A.fortschritt;
  if(F){
    h+=karte('<div class="ar-kartenkopf"><h2>Fortschritt</h2><span class="ar-leise">'+esc(einschaetzungName(F.von))+' → '+esc(einschaetzungName(F.bis))+'</span></div>'+
      '<div class="ar-kennzahlen ar-fortschritt">'+F.stufen.map(function(s){return '<div style="--bc:'+s.b.farbe+'"><b>+'+s.plus+'</b><span>'+esc(s.b.name)+(s.bis>s.von?' · Stufe '+ROEM[s.von]+' → '+ROEM[s.bis]:(s.bis?' · Stufe '+ROEM[s.bis]:''))+'</span></div>';}).join('')+
        '<div><b>'+F.erreicht+'/'+F.ziele.length+'</b><span>Ziele erreicht</span></div></div>'+
      (F.ziele.length?'<h3>Ziele aus '+esc(einschaetzungName(F.von))+'</h3><ul class="ar-zielstand">'+F.ziele.map(function(z){var t=z.jetzt==='e'?['ja','erreicht']:(z.jetzt==='z'?['weiter','weiter Ziel']:(z.jetzt==='n'?['nein','nicht erreicht']:['offen','nicht mehr eingeschätzt']));return '<li class="'+t[0]+'">'+icode(z.code)+'<span>„'+esc(z.text)+'“</span><b>'+t[1]+'</b></li>';}).join('')+'</ul>':'')+
      (F.neu.length?'<h3>Neu erreicht ('+F.neu.length+')</h3><p class="ar-klein">'+F.neu.map(function(c){return esc(c)+' '+esc(itemZu(c).it.keyword);}).join(' · ')+'</p>':'<p class="ar-leise">Seit der vorigen Einschätzung wurden keine Items neu als erreicht eingeschätzt.</p>')+
      (F.zurueck.length?hinweis('<b>Rückschritt:</b> '+F.zurueck.map(function(c){return esc(c)+' '+esc(itemZu(c).it.keyword);}).join(', ')+' – war erreicht und ist jetzt wieder offen. Gibt es einen Anlass (Wechsel, Belastung zu Hause)?'):''));
  }
  return h;
}

/* ---------- Übergabeblatt (Druck / PDF) ---------- */
function eldibDruck(d){
  if(!bankDa()){return '';}
  var A=eldibAuswertung(d);if(!A){return '';}
  var h='<h2>Entwicklung (ELDiB) – '+esc(einschaetzungName(A.e))+(A.alter!=null?', Alter damals '+esc(alterText(A.alter)):'')+'</h2>'+
    '<table class="eldib"><tr><th>Bereich</th><th>Stufe</th><th>Einordnung</th><th>Leitziel der Arbeitsstufe</th></tr>'+A.bereiche.map(function(b){
      var txt=!b.bewertet?'nicht eingeschätzt':(!b.stufe?'noch kein Item erreicht':(b.abstand==null?'':(b.abstand<=0?'altersgemäß':(b.abstand===1?'1 Stufe unter dem Alter':b.abstand+' Stufen unter dem Alter'))));
      return '<tr><td>'+esc(b.name)+'</td><td>'+(b.stufe?'Stufe '+ROEM[b.stufe]+' ('+esc(stufeSpanne(b.stufe))+')':'–')+'</td><td>'+esc(txt)+'</td><td>'+esc(b.bewertet?'Stufe '+ROEM[b.arbeit]+': '+b.leitziel:'')+'</td></tr>';
    }).join('')+'</table>';
  if(A.ueber.length){h+='<h3>Für das Alter längst erwartet, noch nicht erreicht ('+A.ueber.length+')</h3><ul>'+A.ueber.map(function(u){return '<li><b>'+esc(u.code)+' '+esc(u.it.keyword)+'</b> – '+esc(u.it.description)+' <small>(Stufe '+ROEM[u.stufe]+', '+esc(jahreText(u.luecke))+' überfällig'+(u.istZiel?', ist Förderziel':'')+')</small></li>';}).join('')+'</ul>';}
  if(A.ziele.length){h+='<h2>Aktuelle Förderziele (PEI)</h2>'+A.ziele.map(function(z){var hw=itemHinweise(z.code);return '<div class="ziel"><b>'+esc(z.code)+' '+esc(z.it.keyword)+':</b> „'+esc(z.text)+'“'+(z.ideen.length?'<br><small>Förderideen: '+esc(z.ideen.join('; '))+'</small>':'')+(hw.length?'<br><small><b>Hinweis:</b> '+esc(hw.join(' '))+'</small>':'')+'</div>';}).join('');}
  if(A.zusatz.lernt.length){h+='<h3>Weitere Kompetenzen – lernt noch</h3><ul>'+A.zusatz.lernt.map(function(x){return '<li><b>'+esc(x.titel)+'</b> – '+esc(x.text)+' <small>('+esc(ZUSATZ_NAMEN[x.kat][0])+')</small></li>';}).join('')+'</ul>';}
  return h;
}
function drucken(d){
  var html=uebergabeHtml(d);
  var f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);var doc=f.contentWindow.document;doc.open();doc.write(html);doc.close();
  setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){}setTimeout(function(){f.remove();},60000);},250);
}
/* Teile aus Zusatzmodulen (Kompass, Begleitplan) */
function zusatzDruck(d){
  var h='';
  [window.CDSE_KOMPASS,window.CDSE_BEGLEITPLAN].forEach(function(m){try{if(m&&m.druckTeil){h+=m.druckTeil(d);}}catch(e){}});
  return h;
}
function uebergabeHtml(d){
  var p=d.person||{}, b=aufEinenBlick(d), a=alter(p.geburtsdatum);
  function liste(t,l){return l&&l.length?'<h3>'+esc(t)+'</h3><ul>'+l.map(function(x){return '<li>'+esc(typeof x==='string'?x:x.s)+'</li>';}).join('')+'</ul>':'';}
  var letzte=(d.eintraege||[]).slice().sort(function(x,y){return x.datum<y.datum?1:-1;}).slice(0,5);
  var html='<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Übergabeblatt – '+esc(schuelerName(p))+'</title><style>'+
    'body{font:10.5pt/1.45 Arial,Helvetica,sans-serif;color:#111;margin:0}main{max-width:17.5cm;margin:0 auto}h1{font-size:17pt;margin:0}h2{font-size:12pt;margin:14pt 0 4pt;color:#23307a;border-bottom:1px solid #c9cde0;padding-bottom:2pt}h3{font-size:10.5pt;margin:8pt 0 2pt}'+
    'ul{margin:0 0 4pt 16pt;padding:0}li{margin:1pt 0}.sub{color:#444;margin:2pt 0 10pt}.raster{display:grid;grid-template-columns:1fr 1fr;gap:0 18pt}table{border-collapse:collapse;width:100%}td{border:1px solid #bbb;padding:3pt 5pt;vertical-align:top}td:first-child{width:32%;background:#f3f4f8}'+
    '.eintrag{margin:4pt 0}.eintrag small{color:#555}.fuss{margin-top:16pt;font-size:8.5pt;color:#666}@page{margin:1.6cm}'+
    'table.eldib{margin-top:4pt}table.eldib th{border:1px solid #bbb;padding:3pt 5pt;background:#e8eaf3;text-align:left;font-size:9.5pt}table.eldib td{font-size:9.5pt}table.eldib td:first-child{width:18%}'+
    '.ziel{margin:4pt 0;page-break-inside:avoid}.ziel small,li small{color:#444}.klein{font-size:8.5pt;color:#555;margin:2pt 0 0}</style></head><body><main>'+
    '<h1>Übergabeblatt: '+esc(schuelerName(p))+'</h1><p class="sub">'+esc([a!=null?a+' Jahre':'',p.klasse,p.schule].filter(Boolean).join(' · '))+' — Stelle: '+esc(team(d.stelle).name)+', fallverantwortlich: '+esc((d.verantwortlich||[]).map(kname).join(', ')||'—')+'</p>'+
    '<table><tr><td>Geburtsdatum</td><td>'+esc(datum(p.geburtsdatum))+'</td></tr><tr><td>Matricule</td><td>'+esc(p.matricule||'')+'</td></tr><tr><td>Eltern / Kontakt</td><td>'+esc(p.kontakt||'')+'</td></tr><tr><td>Sprachen</td><td>'+esc(p.sprachen||'')+'</td></tr></table>'+
    (b?'<h2>Auf einen Blick</h2><div class="raster"><div>'+liste('Stärken',b.staerken)+liste('Was hilft',b.hilft)+liste('Ressourcen',b.ressourcen)+liste('Interessen',b.interessen)+'</div><div>'+liste('Schwierigkeiten',b.schwierig)+liste('Wann es schwierig wird',b.wann)+liste('Was '+(p.vorname||'das Kind')+' braucht',b.beduerfnisse)+liste('Diagnosen',b.diagnosen)+'</div></div>'+liste('Empfehlungen',b.empfehlungen):'<p><i>Noch kein DS-Profil vorhanden.</i></p>')+
    zusatzDruck(d)+
    eldibDruck(d)+
    (letzte.length?'<h2>Letzte Einträge</h2>'+letzte.map(function(e){return '<div class="eintrag"><b>'+esc(datum(e.datum))+' – '+esc(ARTEN[e.art]||e.art)+(e.titel?': '+esc(e.titel):'')+'</b> <small>('+esc(kname(e.von))+')</small>'+(e.vorfall?vorfallDruck(e.vorfall,e.text):'<br>'+esc(e.text).replace(/\n/g,'<br>'))+'</div>';}).join(''):'')+
    '<p class="fuss">Vertraulich – nur für die Arbeit im CDSE. Erstellt am '+esc(datum(heuteIso()))+' von '+esc(K.ich().name)+'. '+esc(profilQuelle(d))+'</p></main></body></html>';
  return html;
}

/* =====================================================================
   Einsatzplan
   ===================================================================== */
function leererPlan(){return {v:1,woche:[],ausnahmen:[],samstag:false};}
function minuten(hhmm){var m=/^(\d{1,2}):(\d{2})/.exec(hhmm||'');return m?(+m[1])*60+(+m[2]):null;}
function hhmm(min){return pad(Math.floor(min/60))+':'+pad(min%60);}
/* Was steht jetzt (oder zu einem Zeitpunkt) im Plan? */
function planZu(plan,wann){
  wann=wann||new Date();
  var iso=wann.getFullYear()+'-'+pad(wann.getMonth()+1)+'-'+pad(wann.getDate()), tag=wann.getDay(), min=wann.getHours()*60+wann.getMinutes();
  var aus=(plan.ausnahmen||[]).filter(function(a){return a.von<=iso&&iso<=(a.bis||a.von);});
  var ganz=aus.filter(function(a){return !a.zeitVon;})[0];
  if(ganz&&ganz.art!=='termin'){return {art:'abwesend',grund:AUSNAHME[ganz.art]||ganz.art,bis:ganz.bis||ganz.von,notiz:ganz.notiz};}
  var bloecke=tagesBloecke(plan,wann);
  var jetzt=bloecke.filter(function(b){return minuten(b.von)<=min&&min<minuten(b.bis);})[0];
  var naechster=bloecke.filter(function(b){return minuten(b.von)>min;})[0];
  if(jetzt){return {art:'im-einsatz',block:jetzt,naechster:naechster};}
  if(!bloecke.length){return {art:'kein-plan',naechster:null};}
  if(min<minuten(bloecke[0].von)){return {art:'noch-nicht',naechster:naechster};}
  if(naechster){return {art:'unterwegs',naechster:naechster,vorher:bloecke.filter(function(b){return minuten(b.bis)<=min;}).pop()};}
  return {art:'feierabend',naechster:null};
}
function tagesBloecke(plan,wann){
  var iso=wann.getFullYear()+'-'+pad(wann.getMonth()+1)+'-'+pad(wann.getDate()), tag=wann.getDay();
  var aus=(plan.ausnahmen||[]).filter(function(a){return a.von<=iso&&iso<=(a.bis||a.von);});
  var ganz=aus.filter(function(a){return !a.zeitVon;})[0];
  if(ganz&&ganz.art!=='termin'){return [];}
  var bl=(plan.woche||[]).filter(function(b){return +b.tag===tag;}).map(function(b){return {von:b.von,bis:b.bis,ort:b.ort,klasse:b.klasse,art:b.art,notiz:b.notiz};});
  /* ganztags an einem anderen Ort: ersetzt den ganzen Tag (Zeitraum wie sonst an diesem Tag, sonst 8–16 Uhr) */
  if(ganz){
    var von=bl.length?Math.min.apply(null,bl.map(function(b){return minuten(b.von);})):480, bis=bl.length?Math.max.apply(null,bl.map(function(b){return minuten(b.bis);})):960;
    return [{von:hhmm(von),bis:hhmm(bis),ort:ganz.ort||AUSNAHME.termin,klasse:ganz.klasse,art:'anderes',notiz:ganz.notiz,ausnahme:true,ganztags:true}];
  }
  aus.filter(function(a){return a.zeitVon;}).forEach(function(a){
    var v=minuten(a.zeitVon), e=minuten(a.zeitBis)||v+60;
    bl=bl.filter(function(b){return minuten(b.bis)<=v||minuten(b.von)>=e;});   /* Ausnahme ersetzt diese Zeit */
    if(a.art==='termin'){bl.push({von:a.zeitVon,bis:a.zeitBis||hhmm(e),ort:a.ort,klasse:a.klasse,art:'anderes',notiz:a.notiz,ausnahme:true});}
    else{bl.push({von:a.zeitVon,bis:a.zeitBis||hhmm(e),ort:AUSNAHME[a.art]||a.art,art:'abwesend',notiz:a.notiz,ausnahme:true,abwesend:true});}
  });
  return bl.sort(function(a,b){return minuten(a.von)-minuten(b.von);});
}
function statusText(s){
  if(s.art==='abwesend'){return s.grund+(s.bis?' bis '+datum(s.bis):'');}
  if(s.art==='im-einsatz'){var b=s.block;return (b.abwesend?b.ort:(b.ort||'ohne Ort'))+(b.klasse?' · '+b.klasse:'')+' · bis '+b.bis;}
  if(s.art==='unterwegs'){return 'Zwischen zwei Einsätzen – ab '+s.naechster.von+' '+(s.naechster.ort||'');}
  if(s.art==='noch-nicht'){return 'Beginnt um '+s.naechster.von+(s.naechster.ort?' · '+s.naechster.ort:'');}
  if(s.art==='feierabend'){return 'Für heute fertig';}
  return 'Heute kein Einsatz eingetragen';
}
function seiteEinsatz(){
  setzen(kopf('Arbeit','Mein Einsatzplan','Wann du wo arbeitest: Klasse, Ort und Zeit. Sichtbar nur für dich, deine Responsable und die Verwaltung – verschlüsselt im Hub-Ordner.')+'<div id="ar-einsatz">'+laedt('Lade deinen Plan …')+'</div>');
  var me=K.ich();
  /* ungespeicherte Änderungen von vorhin (z. B. kurz eine App geöffnet): nicht vom gespeicherten Plan überschreiben */
  if(planDirty&&planEntwurf){einsatzZeichnen();return;}
  bereichLaden().catch(function(){}).then(function(){return T.meinPlan();}).then(function(p){
    planEntwurf=p||leererPlan();planDirty=false;
    einsatzZeichnen();
  }).catch(function(e){if(e&&e.abgebrochen){$('ar-einsatz').innerHTML=karte('<p>Ohne Passwort kann der Hub deinen Plan nicht öffnen.</p><button class="btn" type="button" data-ar="einsatz-neu">Nochmal</button>');return;}
    $('ar-einsatz').innerHTML=karte(hinweis(fehlerText(e))+'<button class="btn" type="button" data-ar="einsatz-neu">Nochmal</button>');});
  void me;
}
function sichtbarFuer(){
  var me=K.ich(), l=[];
  if(me.responsable){l.push(kname(me.responsable)+' (Responsable)');}
  var z=T.zustand();
  if(z.art==='bereit'){T.mitglieder().filter(function(k){return k.rolle==='admin'&&k.id!==me.id&&k.id!==me.responsable;}).forEach(function(k){l.push(k.name+' (Verwaltung)');});}
  return l;
}
function einsatzZeichnen(){
  var el=$('ar-einsatz');if(!el){return;}
  var p=planEntwurf, me=K.ich(), tage=p.samstag?[1,2,3,4,5,6]:[1,2,3,4,5], s=planZu(p);
  var h='';
  if(!me.responsable){h+=hinweis('Du hast noch keine/n <b>Responsable</b> eingetragen. Konto-Menü → <b>Profil ändern</b>. Solange sieht nur die Verwaltung deinen Plan.','info');}
  h+='<div class="ar-jetzt '+esc(s.art)+'"><span class="ar-puls"></span><div><small>Laut deinem Plan jetzt ('+pad(new Date().getHours())+':'+pad(new Date().getMinutes())+' Uhr)</small><b>'+esc(statusText(s))+'</b></div>'+
    '<div class="ar-sicht">'+svg('lock')+'<span>Sichtbar für: du'+(sichtbarFuer().length?', '+esc(sichtbarFuer().join(', ')):'')+'</span></div></div>';
  h+='<div class="ar-karte"><div class="ar-kartenkopf"><h2>Wochenplan</h2><label class="ar-haken"><input type="checkbox" id="ar-samstag"'+(p.samstag?' checked':'')+'> Samstag</label></div>'+
    '<div class="ar-woche" style="--tage:'+tage.length+'">'+tage.map(function(t){
      var bl=(p.woche||[]).filter(function(b){return +b.tag===t;}).sort(function(a,b){return minuten(a.von)-minuten(b.von);});
      return '<div class="ar-tag"><h3>'+TAGE_LANG[t]+'</h3>'+bl.map(blockHtml).join('')+
        '<button class="ar-blockneu" type="button" data-ar="block-neu" data-tag="'+t+'">'+svg('plus')+'Zeitblock</button>'+
        (bl.length?'<button class="ar-link ar-kopie" type="button" data-ar="tag-kopieren" data-tag="'+t+'">'+svg('copy')+'auf andere Tage</button>':'')+'</div>';
    }).join('')+'</div></div>';
  var aus=(p.ausnahmen||[]).slice().sort(function(a,b){return a.von<b.von?-1:1;}).filter(function(a){return (a.bis||a.von)>=heuteIso();});
  h+='<div class="ar-karte"><div class="ar-kartenkopf"><h2>Ausnahmen</h2><button class="btn" type="button" data-ar="ausnahme-neu">'+svg('plus')+'Ausnahme</button></div>'+
    '<p class="ar-leise">Urlaub, Krankheit, Fortbildung oder ein anderer Einsatz an bestimmten Tagen. Vergangene Ausnahmen werden ausgeblendet.</p>'+
    (aus.length?'<ul class="ar-ausnahmen">'+aus.map(function(a){return '<li><span class="ar-art">'+esc(AUSNAHME[a.art]||a.art)+'</span><b>'+esc(datum(a.von))+(a.bis&&a.bis!==a.von?' – '+esc(datum(a.bis)):'')+'</b>'+(a.zeitVon?' <span>'+esc(a.zeitVon)+'–'+esc(a.zeitBis||'')+'</span>':' <span>ganztags</span>')+(a.ort?' · '+esc(a.ort):'')+(a.notiz?' · '+esc(a.notiz):'')+'<button type="button" class="ar-link gefahr" data-ar="ausnahme-weg" data-id="'+esc(a.id)+'">'+svg('x')+'Entfernen</button></li>';}).join('')+'</ul>':'<p>Keine anstehenden Ausnahmen.</p>')+'</div>';
  var fehlt=planEmpfaengerFehlen(p), offen=planDirty||fehlt.length>0;
  if(fehlt.length&&!planDirty){h+=hinweis('<b>'+esc(fehlt.map(kname).join(', '))+'</b> '+(fehlt.length===1?'kann':'können')+' deinen Plan noch nicht sehen (neu als Responsable oder Verwaltung). Bitte einmal <b>„Plan speichern“</b>.','info');}
  h+='<div class="ar-speicherleiste'+(offen?' offen':'')+'"><span>'+(planDirty?'Ungespeicherte Änderungen':(fehlt.length?'Für die neuen Empfänger speichern':'Alles gespeichert'))+'</span><button class="btn primary" type="button" data-ar="plan-speichern"'+(offen?'':' disabled')+'>'+svg('check')+'Plan speichern</button></div>';
  el.innerHTML=h;
  var sa=$('ar-samstag');if(sa){sa.onchange=function(){planEntwurf.samstag=sa.checked;planDirty=true;einsatzZeichnen();};}
}
/* Wer den Plan lesen soll (eigene Responsable, Verwaltung), aber beim letzten Speichern noch nicht dabei war */
function planEmpfaengerFehlen(p){
  var me=K.ich(), da=p&&p.__empfaenger;if(!me||!Array.isArray(da)){return [];}
  var soll=[];if(me.responsable){soll.push(me.responsable);}
  if(T.zustand().art==='bereit'){T.mitglieder().forEach(function(k){if(k.rolle==='admin'&&k.hatSchluessel&&k.id!==me.id&&soll.indexOf(k.id)<0){soll.push(k.id);}});}
  return soll.filter(function(id){return id!==me.id&&da.indexOf(id)<0&&!!konto(id);});
}
function ortFarbe(ort){var s=String(ort||'').toLowerCase(),h=0;for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;}var f=['#3F5AA6','#1F6B6F','#B4533A','#A8741A','#6E4A7E','#2E7D4F','#9C3D6B','#476B9C'];return s?f[h%f.length]:'#8C96A8';}
function blockHtml(b){
  return '<button class="ar-block" type="button" data-ar="block-aendern" data-id="'+esc(b.id)+'" style="--oc:'+esc(ortFarbe(b.ort))+'"><b>'+esc(b.von)+'–'+esc(b.bis)+'</b><span>'+esc(b.ort||'ohne Ort')+'</span>'+(b.klasse?'<small>'+esc(b.klasse)+'</small>':'')+(b.art?'<small>'+esc(TAETIGKEIT[b.art]||b.art)+'</small>':'')+'</button>';
}
function bekannteOrte(){var s={};(planEntwurf.woche||[]).concat(planEntwurf.ausnahmen||[]).forEach(function(b){if(b.ort){s[b.ort]=1;}});return Object.keys(s).sort();}
function blockDialog(tag,id){
  var b=id?(planEntwurf.woche||[]).filter(function(x){return x.id===id;})[0]:{tag:tag,von:'08:00',bis:'11:45',ort:'',klasse:'',art:'unterwegs'};
  if(!b){return;}
  var orte=bekannteOrte();
  var inhalt='<div class="ar-raster3">'+auswahl('tag','Tag',b.tag,[1,2,3,4,5,6].map(function(t){return [t,TAGE_LANG[t]];}))+feld('von','Von',b.von,'time')+feld('bis','Bis',b.bis,'time')+'</div>'+
    '<div class="ar-raster2">'+feld('ort','Ort (Schule, Gebäude, Adresse)',b.ort,'text',' list="ar-orte" autocomplete="off" autofocus')+feld('klasse','Klasse / Gruppe',b.klasse,'text',' autocomplete="off"')+'</div>'+
    '<datalist id="ar-orte">'+orte.map(function(o){return '<option value="'+esc(o)+'">';}).join('')+'</datalist>'+
    auswahl('art','Tätigkeit',b.art==='unterwegs'?'unterricht':b.art,Object.keys(TAETIGKEIT).map(function(k){return [k,TAETIGKEIT[k]];}))+feld('notiz','Notiz (optional, keine Schülernamen)',b.notiz);
  var knoepfe=[{text:'Abbrechen',wert:''}];if(id){knoepfe.push({text:'Löschen',wert:'weg',gefahr:true});}knoepfe.push({text:'Übernehmen',wert:'ok',primaer:true});
  dialog(id?'Zeitblock ändern':'Neuer Zeitblock',inhalt,knoepfe,{breit:true,
    pruefen:function(w){if(w.aktion==='weg'){return '';}var v=minuten(w.werte.von),e=minuten(w.werte.bis);if(v==null||e==null){return 'Bitte Von und Bis angeben.';}if(e<=v){return '„Bis“ muss nach „Von“ liegen.';}
      var ueber=(planEntwurf.woche||[]).filter(function(x){return x.id!==id&&+x.tag===+w.werte.tag&&minuten(x.von)<e&&v<minuten(x.bis);})[0];
      return ueber?'Überschneidet sich mit '+ueber.von+'–'+ueber.bis+' ('+(ueber.ort||'ohne Ort')+').':'';}
  }).then(function(r){
    if(r.aktion==='weg'){planEntwurf.woche=planEntwurf.woche.filter(function(x){return x.id!==id;});}
    else if(r.aktion==='ok'){
      var v=r.werte, neu={id:id||T.neueId(8),tag:+v.tag,von:v.von,bis:v.bis,ort:v.ort.trim(),klasse:v.klasse.trim(),art:v.art,notiz:v.notiz.trim()};
      planEntwurf.woche=(planEntwurf.woche||[]).filter(function(x){return x.id!==id;}).concat([neu]);
    }else{return;}
    planDirty=true;einsatzZeichnen();
  });
}
function tagKopierenDialog(tag){
  var inhalt='<p>Die Zeitblöcke vom '+TAGE_LANG[tag]+' auf diese Tage kopieren (vorhandene Blöcke dort werden ersetzt):</p><div class="ar-checkliste">'+
    [1,2,3,4,5,6].filter(function(t){return t!==tag&&(t<6||planEntwurf.samstag);}).map(function(t){return '<label class="ar-haken"><input type="checkbox" name="t'+t+'"> '+TAGE_LANG[t]+'</label>';}).join('')+'</div>';
  dialog('Tag kopieren',inhalt,[{text:'Abbrechen',wert:''},{text:'Kopieren',wert:'ok',primaer:true}]).then(function(r){
    if(r.aktion!=='ok'){return;}
    var ziele=Object.keys(r.werte).filter(function(k){return r.werte[k];}).map(function(k){return +k.slice(1);});if(!ziele.length){return;}
    var quelle=planEntwurf.woche.filter(function(b){return +b.tag===tag;});
    planEntwurf.woche=planEntwurf.woche.filter(function(b){return ziele.indexOf(+b.tag)<0;});
    ziele.forEach(function(t){quelle.forEach(function(b){var c=JSON.parse(JSON.stringify(b));c.id=T.neueId(8);c.tag=t;planEntwurf.woche.push(c);});});
    planDirty=true;einsatzZeichnen();
  });
}
function ausnahmeDialog(){
  var inhalt='<div class="ar-raster3">'+auswahl('art','Art','urlaub',Object.keys(AUSNAHME).map(function(k){return [k,AUSNAHME[k]];}))+feld('von','Von',heuteIso(),'date')+feld('bis','Bis (optional)','','date')+'</div>'+
    '<label class="ar-haken"><input type="checkbox" name="stunden"> Nur zu bestimmten Uhrzeiten</label>'+
    '<div class="ar-raster2" id="ar-aus-zeit" hidden>'+feld('zeitVon','Von (Uhrzeit)','','time')+feld('zeitBis','Bis (Uhrzeit)','','time')+'</div>'+
    '<div class="ar-raster2">'+feld('ort','Ort (bei anderem Einsatz)','','text',' list="ar-orte2" autocomplete="off"')+feld('klasse','Klasse (optional)','','text')+'</div>'+
    '<datalist id="ar-orte2">'+bekannteOrte().map(function(o){return '<option value="'+esc(o)+'">';}).join('')+'</datalist>'+feld('notiz','Notiz (optional)','');
  dialog('Ausnahme',inhalt,[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){var c=dlg.querySelector('[name=stunden]');c.onchange=function(){dlg.querySelector('#ar-aus-zeit').hidden=!c.checked;};},
    pruefen:function(w){var v=w.werte;if(!v.von){return 'Bitte das Datum angeben.';}if(v.bis&&v.bis<v.von){return '„Bis“ liegt vor „Von“.';}if(v.stunden&&(!v.zeitVon||!v.zeitBis)){return 'Bitte die Uhrzeiten angeben.';}return '';}
  }).then(function(r){
    if(r.aktion!=='ok'){return;}
    var v=r.werte;
    planEntwurf.ausnahmen=(planEntwurf.ausnahmen||[]).concat([{id:T.neueId(8),art:v.art,von:v.von,bis:v.bis||v.von,zeitVon:v.stunden?v.zeitVon:'',zeitBis:v.stunden?v.zeitBis:'',ort:v.ort.trim(),klasse:v.klasse.trim(),notiz:v.notiz.trim()}]);
    planDirty=true;einsatzZeichnen();
  });
}
function planSpeichern(btn){
  if(btn){btn.disabled=true;}
  var p=JSON.parse(JSON.stringify(planEntwurf));delete p.__empfaenger;
  /* Vergangene Ausnahmen (älter als 60 Tage) nicht ewig mitschleppen */
  var grenze=new Date(Date.now()-60*864e5).toISOString().slice(0,10);
  p.ausnahmen=(p.ausnahmen||[]).filter(function(a){return (a.bis||a.von)>=grenze;});
  T.planSpeichern(p).then(function(r){planEntwurf=r.plan;planDirty=false;einsatzZeichnen();toast('Plan gespeichert');},function(e){if(btn){btn.disabled=false;}toast('Nicht gespeichert: '+((e&&e.message)||e),true);});
}

/* =====================================================================
   Mein Team: wer ist gerade wo?
   ===================================================================== */
function seiteTeam(neu){
  setzen(kopf('Arbeit','Mein Team','Wo deine Mitarbeitenden laut Einsatzplan gerade sind – live, nach Ort sortiert.',
    '<div class="ar-ansicht" role="tablist">'+[['jetzt','Jetzt'],['heute','Heute'],['woche','Woche']].map(function(a){return '<button type="button" role="tab" class="'+(teamAnsicht===a[0]?'on':'')+'" aria-selected="'+(teamAnsicht===a[0])+'" data-ansicht="'+a[0]+'">'+a[1]+'</button>';}).join('')+'</div>')+
    '<div id="ar-team">'+laedt('Lade die Einsatzpläne …')+'</div>');
  var p=(!neu&&teamDaten&&Date.now()-teamZeit<300000)?Promise.resolve(teamDaten):bereichLaden().catch(function(){}).then(function(){return T.lesbarePlaene();}).then(function(l){teamDaten=l;teamZeit=Date.now();return l;});
  p.then(teamZeichnen).catch(function(e){if(e&&e.abgebrochen){$('ar-team').innerHTML=karte('<p>Ohne Passwort können die Pläne nicht geöffnet werden.</p><button class="btn" type="button" data-ar="team-neu">Nochmal</button>');return;}$('ar-team').innerHTML=karte(hinweis(fehlerText(e))+'<button class="btn" type="button" data-ar="team-neu">Nochmal</button>');});
  uhrStarten();
}
function teamPersonen(){
  var me=K.ich(), plaene={};(teamDaten||[]).forEach(function(p){if(p.konto!==me.id){plaene[p.konto]=p;}});
  var ids={};
  K.konten().forEach(function(k){if(k.responsable===me.id){ids[k.id]=1;}});
  Object.keys(plaene).forEach(function(id){ids[id]=1;});
  return Object.keys(ids).map(function(id){var k=konto(id)||{id:id,name:'(unbekannt)',teamFarbe:'#586277',teamName:''};return {k:k,plan:plaene[id]||null,direkt:k.responsable===me.id};})
    .sort(function(a,b){return (b.direkt-a.direkt)||a.k.name.localeCompare(b.k.name,'de');});
}
function teamZeichnen(){
  var el=$('ar-team');if(!el){return;}
  var leute=teamPersonen(), jetzt=new Date();
  if(!leute.length){el.innerHTML=karte('<h2>Noch niemand in deinem Team</h2><p>Hier erscheinen alle, die dich im Profil als <b>Responsable</b> eingetragen haben (Konto-Menü → Profil ändern) und ihren Einsatzplan gespeichert haben.</p>','ar-leer');return;}
  var h='<p class="ar-uhr" id="ar-uhr">'+TAGE_LANG[jetzt.getDay()]+', '+datum(heuteIso())+' · <b>'+pad(jetzt.getHours())+':'+pad(jetzt.getMinutes())+'</b> Uhr <button class="ar-link" type="button" data-ar="team-neu">'+svg('reload')+'Pläne neu laden</button></p>';
  if(teamAnsicht==='heute'){h+=teamHeute(leute);}
  else if(teamAnsicht==='woche'){h+=teamWoche(leute);}
  else{h+=teamJetzt(leute);}
  var ohne=leute.filter(function(x){return !x.plan;});
  if(ohne.length){h+='<p class="ar-leise ar-ohneplan">Noch kein Einsatzplan gespeichert: '+esc(ohne.map(function(x){return x.k.name;}).join(', '))+'</p>';}
  el.innerHTML=h;
}
function personChip(x,s){
  var b=s.block;
  return '<div class="ar-person"><span class="ava" style="--tc:'+esc(x.k.teamFarbe)+'">'+esc(ini(x.k.name))+'</span><span><b>'+esc(x.k.name)+'</b><small>'+
    esc(s.art==='im-einsatz'?((b.klasse?b.klasse+' · ':'')+'bis '+b.bis):statusText(s))+'</small></span></div>';
}
function teamJetzt(leute){
  var orte={}, sonst={abwesend:[],unterwegs:[],frei:[],ohne:[]};
  leute.forEach(function(x){
    if(!x.plan){sonst.ohne.push(x);return;}
    var s=planZu(x.plan);
    if(s.art==='im-einsatz'&&!s.block.abwesend){var o=s.block.ort||'Ohne Ortsangabe';(orte[o]=orte[o]||[]).push({x:x,s:s});}
    else if(s.art==='abwesend'||(s.art==='im-einsatz'&&s.block.abwesend)){sonst.abwesend.push({x:x,s:s});}
    else if(s.art==='unterwegs'){sonst.unterwegs.push({x:x,s:s});}
    else{sonst.frei.push({x:x,s:s});}
  });
  var namen=Object.keys(orte).sort(function(a,b){return orte[b].length-orte[a].length||a.localeCompare(b,'de');});
  var zahl=leute.length, im=namen.reduce(function(n,o){return n+orte[o].length;},0);
  var h='<div class="ar-kennzahlen"><div><b>'+im+'</b><span>im Einsatz</span></div><div><b>'+sonst.unterwegs.length+'</b><span>zwischen Einsätzen</span></div><div><b>'+sonst.abwesend.length+'</b><span>abwesend</span></div><div><b>'+(sonst.frei.length+sonst.ohne.length)+'</b><span>ohne Einsatz jetzt</span></div><div><b>'+zahl+'</b><span>im Team</span></div></div>';
  h+='<div class="ar-orte">'+namen.map(function(o){
    return '<section class="ar-ort" style="--oc:'+esc(ortFarbe(o))+'"><header><span class="ar-pin">'+svg('pin')+'</span><h3>'+esc(o)+'</h3><span class="ar-anzahl">'+orte[o].length+'</span></header>'+orte[o].map(function(e){return personChip(e.x,e.s);}).join('')+'</section>';
  }).join('')+'</div>';
  function gruppe(t,l,kl){return l.length?'<section class="ar-gruppe '+kl+'"><h3>'+esc(t)+' <span>'+l.length+'</span></h3><div class="ar-gruppe-l">'+l.map(function(e){return personChip(e.x,e.s);}).join('')+'</div></section>':'';}
  h+=gruppe('Zwischen zwei Einsätzen',sonst.unterwegs,'unterwegs')+gruppe('Abwesend',sonst.abwesend,'abwesend')+gruppe('Jetzt kein Einsatz',sonst.frei,'frei');
  return h;
}
function teamHeute(leute){
  var START=7*60, ENDE=18*60, jetzt=new Date(), min=jetzt.getHours()*60+jetzt.getMinutes();
  function pos(m){return Math.max(0,Math.min(100,(m-START)/(ENDE-START)*100));}
  var skala='';for(var s=START;s<=ENDE;s+=60){skala+='<span style="left:'+pos(s)+'%">'+pad(s/60)+'</span>';}
  var h='<div class="ar-zeitstrahl"><div class="ar-zs-kopf"><span></span><div class="ar-zs-skala">'+skala+'</div></div>';
  leute.filter(function(x){return x.plan;}).forEach(function(x){
    var bl=tagesBloecke(x.plan,jetzt), s=planZu(x.plan);
    h+='<div class="ar-zs-zeile"><span class="ar-zs-name"><span class="ava klein" style="--tc:'+esc(x.k.teamFarbe)+'">'+esc(ini(x.k.name))+'</span>'+esc(x.k.name)+'</span><div class="ar-zs-bahn">'+
      (s.art==='abwesend'?'<span class="ar-zs-abw">'+esc(statusText(s))+'</span>':'')+
      bl.map(function(b){var v=minuten(b.von),e=minuten(b.bis);return '<span class="ar-zs-block'+(b.abwesend?' abw':'')+'" style="left:'+pos(v)+'%;width:'+Math.max(0.8,pos(e)-pos(v))+'%;--oc:'+esc(b.abwesend?'#8C96A8':ortFarbe(b.ort))+'" title="'+esc(b.von+'–'+b.bis+' · '+(b.ort||'')+(b.klasse?' · '+b.klasse:''))+'"><b>'+esc(b.ort||'')+'</b>'+(b.klasse?' '+esc(b.klasse):'')+'</span>';}).join('')+
      '</div></div>';
  });
  if(min>=START&&min<=ENDE){h+='<div class="ar-zs-jetzt" style="--p:'+pos(min)+'"><span>'+pad(jetzt.getHours())+':'+pad(jetzt.getMinutes())+'</span></div>';}
  return h+'</div>';
}
function teamWoche(leute){
  var tage=[1,2,3,4,5], heute=new Date(), montag=new Date(heute);montag.setDate(heute.getDate()-((heute.getDay()+6)%7));
  var h='<div class="ar-wochenmatrix" style="--tage:'+tage.length+'"><div class="kopf"></div>'+tage.map(function(t,i){var d=new Date(montag);d.setDate(montag.getDate()+i);return '<div class="kopf'+(d.toDateString()===heute.toDateString()?' heute':'')+'">'+TAGE[t]+' '+pad(d.getDate())+'.'+pad(d.getMonth()+1)+'.</div>';}).join('');
  leute.filter(function(x){return x.plan;}).forEach(function(x){
    h+='<div class="ar-wm-name"><span class="ava klein" style="--tc:'+esc(x.k.teamFarbe)+'">'+esc(ini(x.k.name))+'</span>'+esc(x.k.name)+'</div>';
    tage.forEach(function(t,i){
      var d=new Date(montag);d.setDate(montag.getDate()+i);
      var bl=tagesBloecke(x.plan,d), s=planZu(x.plan,new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0));
      h+='<div class="ar-wm-zelle">'+(s.art==='abwesend'?'<span class="ar-wm-abw">'+esc(s.grund)+'</span>':bl.map(function(b){return '<span class="ar-wm-block" style="--oc:'+esc(b.abwesend?'#8C96A8':ortFarbe(b.ort))+'">'+esc(b.von)+'–'+esc(b.bis)+' <b>'+esc(b.ort||'')+'</b></span>';}).join(''))+'</div>';
    });
  });
  return h+'</div>';
}
var teamNeuLaeuft=false;
function uhrStarten(){
  clearInterval(uhrTimer);
  uhrTimer=setInterval(function(){
    if(akt.seite!=='team'||!$('ar-team')){clearInterval(uhrTimer);return;}
    /* alle 5 Minuten die Pläne neu lesen – still im Hintergrund und nur, wenn dafür kein Passwort nötig ist */
    if(teamDaten&&!teamNeuLaeuft&&Date.now()-teamZeit>300000&&K.privatDa()){
      teamNeuLaeuft=true;
      T.lesbarePlaene().then(function(l){teamDaten=l;teamZeit=Date.now();},function(){teamZeit=Date.now();})
        .then(function(){teamNeuLaeuft=false;if(akt.seite==='team'&&$('ar-team')){teamZeichnen();}});
      return;
    }
    if(teamDaten){teamZeichnen();}
  },30000);
}

/* =====================================================================
   Verwaltung: freischalten, Rollen, Protokoll
   ===================================================================== */
function seiteVerwaltung(){
  setzen(kopf('Arbeit','Verwaltung','Neue Konten freischalten, Rollen vergeben und nachsehen, was im Schülerbereich passiert ist.')+'<div id="ar-verw">'+laedt()+'</div>');
  bereichLaden(true).then(function(z){
    if(z.art!=='bereit'){$('ar-verw').innerHTML=zustandsKarte(z);meinenCodeZeigen();return;}
    if(!T.darfFreischalten()){$('ar-verw').innerHTML=karte('<p>Die Verwaltung sehen nur die Verwaltung und die Responsables.</p>','ar-leer');return;}
    verwaltungZeichnen();
  }).catch(function(e){$('ar-verw').innerHTML=zustandsKarte({art:'fehler',text:(e&&e.message)||String(e)});});
}
/* ---------- Teamliste: alle Mitarbeitenden vorbereiten (Verwaltung) ---------- */
var tlFilter='';
function T_NAME(id){return team(id).name;}
function tlVon(name){return K.teamlisteEintrag?K.teamlisteEintrag(name):null;}
function tlKonto(p,m){var s=K.namensSchluessel(p.name);return m.filter(function(k){return K.namensSchluessel(k.name)===s;})[0]||null;}
var TL_STAND={aktiv:'Konto aktiv',wartet:'wartet auf Freischaltung',vorbereitet:'Startcode ausgegeben',fehlt:'noch kein Konto'};
/* Vorbereitetes Konto (Startcode) zu einem Namen der Teamliste */
function tlVorbereitet(p,vb){var s=K.namensSchluessel(p.name);return vb.filter(function(v){return K.namensSchluessel(v.name)===s;})[0]||null;}
function tlStartText(v){
  if(!v){return '';}
  if(v.gen!==((T.schluesselStand?T.schluesselStand().gen:v.gen)||1)){return 'Startcode ungültig (Schlüssel erneuert)';}
  if(v.bis&&v.bis<heuteIso()){return 'Startcode abgelaufen';}
  return 'Startcode bis '+datum(v.bis);
}
function teamlisteKarte(admin,ROLLEN){
  if(!K.teamliste){return '';}
  var tl=K.teamliste(), m=T.mitglieder(), vb=K.vorbereitete?K.vorbereitete():[];
  var z=tl.map(function(p,i){var k=tlKonto(p,m), v=k?null:tlVorbereitet(p,vb);return {p:p,i:i,k:k,v:v,st:k?(k.freigeschaltet?'aktiv':'wartet'):(v?'vorbereitet':'fehlt')};});
  var n={aktiv:0,wartet:0,vorbereitet:0,fehlt:0};z.forEach(function(x){n[x.st]++;});
  var ohne=m.filter(function(k){return !tlVon(k.name);});
  var teams=TEAMS.filter(function(t){return tl.some(function(p){return p.team===t.id;});});
  var sicht=z.filter(function(x){return !tlFilter||(tlFilter==='_'?!x.p.team:x.p.team===tlFilter);});
  var reihe=TEAMS.map(function(t){return t.id;});function rang(p){var i=reihe.indexOf(p.team);return i<0?999:i;}
  sicht.sort(function(a,b){return (rang(a.p)-rang(b.p))||a.p.name.localeCompare(b.p.name,'de');});
  var h='<div class="ar-kartenkopf"><h2>Teamliste'+(tl.length?' <span class="ar-zahl">'+tl.length+'</span>':'')+'</h2>'+
    (admin?'<div class="ar-knopfreihe">'+(n.fehlt&&T.kontenVorbereiten?'<button class="btn primary" type="button" data-ar="tl-vorbereiten">'+svg('key')+'Konten vorbereiten ('+n.fehlt+')</button>':'')+
      '<button class="btn" type="button" data-ar="tl-einfuegen">'+svg('hoch')+'Liste einfügen</button><button class="btn" type="button" data-ar="tl-neu">'+svg('plus')+'Person</button>'+(tl.length?'<button class="btn" type="button" data-ar="tl-export">'+svg('runter')+'Als Tabelle</button>':'')+'</div>':'')+'</div>'+
    '<p class="ar-klein">Alle Mitarbeitenden mit Team, Funktion und Rolle. '+(T.kontenVorbereiten?'Mit <b>„Konten vorbereiten“</b> legt die Verwaltung die Konten aller Personen ohne Konto an und druckt für jede Person einen Zettel mit ihrem <b>Startcode</b>. Beim ersten Anmelden klickt die Person auf ihren Namen, gibt den Code ein und wählt ihr eigenes Passwort – danach ist sie sofort freigeschaltet. ':'')+
      'Wer selbst ein Konto erstellt, wählt seinen Namen aus dieser Liste – Team und Funktion sind dann schon eingetragen. '+
      'Die Rolle „Responsable“ übernimmt der Hub aus der Liste; die Rolle „Verwaltung“ vergibt er nie von selbst.</p>';
  if(!tl.length){
    return karte(h+'<p class="ar-leise">Noch leer. '+(admin?'Mit „Liste einfügen“ lässt sich die Teamliste aus Excel oder einer Textliste übernehmen – eine Person pro Zeile.':'Die Verwaltung pflegt die Liste.')+'</p>','ar-tl');
  }
  h+='<div class="ar-tl-stand"><span><b>'+n.aktiv+'</b> '+(n.aktiv===1?'Konto':'Konten')+' aktiv</span><span><b>'+n.wartet+'</b> '+(n.wartet===1?'wartet':'warten')+' auf Freischaltung</span>'+
      (n.vorbereitet?'<span><b>'+n.vorbereitet+'</b> mit Startcode vorbereitet</span>':'')+'<span><b>'+n.fehlt+'</b> noch ohne Konto</span></div>'+
    '<div class="catbar" role="group" aria-label="Team"><button class="catchip'+(!tlFilter?' on':'')+'" type="button" data-ar="tl-filter" data-team="" aria-pressed="'+!tlFilter+'">Alle</button>'+
    teams.map(function(t){var c=tl.filter(function(p){return p.team===t.id;}).length;return '<button class="catchip'+(tlFilter===t.id?' on':'')+'" type="button" data-ar="tl-filter" data-team="'+esc(t.id)+'" aria-pressed="'+(tlFilter===t.id)+'">'+esc(t.name)+'<span class="n">'+c+'</span></button>';}).join('')+
    (tl.some(function(p){return !p.team;})?'<button class="catchip'+(tlFilter==='_'?' on':'')+'" type="button" data-ar="tl-filter" data-team="_" aria-pressed="'+(tlFilter==='_')+'">ohne Team</button>':'')+'</div>'+
    '<div class="ar-tabelle ar-tl-tab"><div class="ar-zeile kopf"><span>Name</span><span>Team · Funktion</span><span>Rolle</span><span>Konto</span><span></span></div>'+
    sicht.map(function(x){
      return '<div class="ar-zeile"><span class="ar-name"><span class="ava" style="--tc:'+esc(team(x.p.team).farbe||'#8C96A8')+'">'+esc(ini(x.p.name))+'</span><b>'+esc(x.p.name)+'</b></span>'+
        '<span>'+esc([x.p.team?T_NAME(x.p.team):'ohne Team',x.p.funktion].filter(Boolean).join(' · '))+'</span><span>'+esc(ROLLEN[x.p.rolle]||'Mitarbeiter/in')+'</span>'+
        '<span><span class="ar-tl-st '+x.st+'">'+(x.v?esc(tlStartText(x.v)):TL_STAND[x.st])+'</span></span>'+
        '<span>'+(admin&&x.v&&T.startcodeErneuern?'<button class="ar-link" type="button" data-ar="tl-startneu" data-id="'+esc(x.v.id)+'">Neuer Code</button><button class="ar-link gefahr" type="button" data-ar="tl-startweg" data-id="'+esc(x.v.id)+'" aria-label="Vorbereitetes Konto von '+esc(x.p.name)+' löschen">Löschen</button>':'')+
          (admin?'<button class="ar-link" type="button" data-ar="tl-bearbeiten" data-i="'+x.i+'" aria-label="'+esc(x.p.name)+' bearbeiten">'+svg('edit')+'</button>':'')+'</span></div>';
    }).join('')+'</div>'+
    (ohne.length?'<p class="ar-klein">Konten, die nicht in der Teamliste stehen: '+ohne.map(function(k){return esc(k.name);}).join(', ')+'.</p>':'');
  return karte(h,'ar-tl');
}
function tlPersonDialog(i){
  var tl=K.teamliste(), p=i!=null?tl[i]:{name:'',team:'',funktion:'',rolle:'mitarbeiter',responsable:''};
  var inh='<datalist id="ar-tl-namen">'+tl.filter(function(x){return x.rolle!=='mitarbeiter';}).map(function(x){return '<option value="'+esc(x.name)+'">';}).join('')+'</datalist>'+
    '<div class="ar-raster2">'+feld('name','Vor- und Nachname',p.name,'text',' required autofocus')+auswahl('team','Team',p.team,teamOptionen(),'– ohne Team –')+
    feld('funktion','Funktion',p.funktion)+auswahl('rolle','Rolle im Hub',p.rolle,[['mitarbeiter','Mitarbeiter/in'],['responsable','Responsable'],['admin','Verwaltung']])+
    feld('responsable','Responsable dieser Person (Name)',p.responsable,'text',' list="ar-tl-namen" autocomplete="off"')+'</div>'+
    '<p class="ar-klein">„Verwaltung“ ist hier nur ein Vermerk: Diese Rolle vergibt die Verwaltung nach der Freischaltung selbst.</p>';
  var kn=[{text:'Abbrechen',wert:''}];if(i!=null){kn.push({text:'Entfernen',wert:'weg',gefahr:true});}kn.push({text:'Speichern',wert:'ok',primaer:true});
  dialog(i!=null?'Person bearbeiten':'Person hinzufügen',inh,kn,{breit:true,
    pruefen:function(w){
      if(w.aktion!=='ok'){return '';}
      var n=(w.werte.name||'').trim().replace(/\s+/g,' ');if(n.length<3){return 'Bitte den Vor- und Nachnamen eintragen.';}
      var s=K.namensSchluessel(n);if(tl.some(function(x,j){return j!==i&&K.namensSchluessel(x.name)===s;})){return n+' steht schon in der Liste.';}
      return '';
    },
    ausfuehren:function(w){
      var l=K.teamliste();
      if(w.aktion==='weg'){l.splice(i,1);return K.teamlisteSpeichern(l).then(function(){return 'Entfernt';});}
      var v=w.werte, neu={name:v.name.trim().replace(/\s+/g,' '),team:v.team,funktion:(v.funktion||'').trim(),rolle:v.rolle,responsable:(v.responsable||'').trim()};
      if(i!=null){l[i]=neu;}else{l.push(neu);}
      return K.teamlisteSpeichern(l).then(function(){return 'Gespeichert';});
    }
  }).then(function(r){if(r.ergebnis){toast(r.ergebnis);verwaltungZeichnen();}});
}
function tlEinfuegenDialog(text){
  var inh='<p class="ar-klein">Eine Person pro Zeile: <b>Name; Team; Funktion; Rolle</b> – so, wie es aus Excel kommt (Spalten mit Tabulator) oder mit Semikolon getrennt. Team zum Beispiel „ISA“, „Diagnostique“, „Annexe“, „CLAPA“ oder „CST“; Rolle „Responsable“ oder leer. Personen, die schon in der Liste stehen, werden aktualisiert.</p>'+
    textfeld('text','Liste',text||'',12)+'<p class="ar-klein">Beispiel: <code>Lea Beispiel; ISA; Éducatrice graduée; Responsable</code></p>';
  dialog('Teamliste einfügen',inh,[{text:'Abbrechen',wert:''},{text:'Prüfen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){if(w.aktion==='ok'&&!(w.werte.text||'').trim()){return 'Bitte die Liste einfügen.';}return '';}
  }).then(function(r){
    if(r.aktion!=='ok'){return;}
    var erg=K.teamlisteParsen(r.werte.text), alt=K.teamliste();
    var neu=0, akt=0;erg.personen.forEach(function(p){if(alt.some(function(x){return K.namensSchluessel(x.name)===K.namensSchluessel(p.name);})){akt++;}else{neu++;}});
    var ROL={admin:'Verwaltung',responsable:'Responsable',mitarbeiter:''};
    var inh2='<p><b>'+erg.personen.length+'</b> Personen erkannt: '+neu+' neu, '+akt+' aktualisiert.</p>'+
      (erg.probleme.length?'<div class="callout"><div><b>Bitte prüfen</b><ul>'+erg.probleme.map(function(x){return '<li>Zeile '+x.zeile+': '+esc(x.text)+'</li>';}).join('')+'</ul></div></div>':'')+
      '<div class="ar-tl-vorschau"><table><thead><tr><th>Name</th><th>Team</th><th>Funktion</th><th>Rolle</th></tr></thead><tbody>'+erg.personen.map(function(p){
        return '<tr><td>'+esc(p.name)+'</td><td'+(p.team?'':' class="fehlt"')+'>'+esc(p.team?T_NAME(p.team):'– fehlt –')+'</td><td>'+esc(p.funktion)+'</td><td>'+esc(ROL[p.rolle])+'</td></tr>';
      }).join('')+'</tbody></table></div>';
    dialog('Teamliste übernehmen?',inh2,[{text:'Zurück',wert:'zurueck'},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
      ausfuehren:function(w){
        if(w.aktion!=='ok'){return null;}
        var l=K.teamliste();
        erg.personen.forEach(function(p){var s=K.namensSchluessel(p.name), j=-1;l.forEach(function(x,k){if(K.namensSchluessel(x.name)===s){j=k;}});if(j>=0){l[j]=Object.assign({},l[j],p,{team:p.team||l[j].team,funktion:p.funktion||l[j].funktion});}else{l.push(p);}});
        return K.teamlisteSpeichern(l).then(function(){return erg.personen.length;});
      }
    }).then(function(r2){
      if(r2.aktion==='zurueck'){tlEinfuegenDialog(r.werte.text);return;}
      if(r2.ergebnis){toast('Teamliste gespeichert ('+r2.ergebnis+' Personen)');verwaltungZeichnen();}
    });
  });
}
function tlExport(){
  var ROL={admin:'Verwaltung',responsable:'Responsable',mitarbeiter:'Mitarbeiter/in'}, m=T.mitglieder();
  var vb=K.vorbereitete?K.vorbereitete():[];
  var zeilen=[['Name','Team','Funktion','Rolle','Responsable','Konto']].concat(K.teamliste().map(function(p){var k=tlKonto(p,m), v=k?null:tlVorbereitet(p,vb);return [p.name,p.team?T_NAME(p.team):'',p.funktion,ROL[p.rolle],p.responsable,k?(k.freigeschaltet?TL_STAND.aktiv:TL_STAND.wartet):(v?tlStartText(v):TL_STAND.fehlt)];}));
  var csv='\ufeff'+zeilen.map(function(z){return z.map(function(c){c=String(c==null?'':c);return /[;"\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c;}).join(';');}).join('\r\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='CDSE-Teamliste.csv';document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);toast('Teamliste als Tabelle gespeichert (CSV)');
}
/* ---------- Startcode: Konten vorbereiten und Zettel drucken (Verwaltung) ---------- */
function tlVorbereitenDialog(){
  var m=T.mitglieder(), vb=K.vorbereitete(), reihe=TEAMS.map(function(t){return t.id;});
  var offen=K.teamliste().filter(function(p){return !tlKonto(p,m)&&!tlVorbereitet(p,vb);});
  if(!offen.length){toast('Für alle in der Teamliste gibt es schon ein Konto oder einen Startcode.');return;}
  function rang(p){var i=reihe.indexOf(p.team);return i<0?999:i;}
  offen.sort(function(a,b){return (rang(a)-rang(b))||a.name.localeCompare(b.name,'de');});
  var inh='<p>Für <b>'+offen.length+'</b> '+(offen.length===1?'Person':'Personen')+' der Teamliste gibt es noch kein Konto. Der Hub legt die Konten mit Name, Team, Funktion und Responsable aus der Liste an und erzeugt für jede Person einen persönlichen <b>Startcode</b>.</p>'+
    '<p class="ar-klein">Danach druckst du die Zettel und gibst sie persönlich weiter. Mit Namen und Startcode meldet sich die Person an und wählt ihr eigenes Passwort – dann ist sie sofort freigeschaltet. Die Codes speichert der Hub nicht; wer seinen Zettel verliert, bekommt einfach einen neuen Code. Ein Startcode gilt 60 Tage und nur einmal.</p>'+
    '<div class="ar-knopfreihe"><button type="button" class="ar-link" data-tl-alle="1">Alle auswählen</button><button type="button" class="ar-link" data-tl-alle="0">Keine auswählen</button></div>'+
    '<div class="ar-checkliste ar-tl-auswahl">'+offen.map(function(p,i){return '<label class="ar-haken"><input type="checkbox" name="p_'+i+'" checked> '+esc(p.name)+' <small>'+esc([p.team?T_NAME(p.team):'ohne Team',p.funktion].filter(Boolean).join(' · '))+'</small></label>';}).join('')+'</div>'+
    '<p class="ar-klein" id="ar-tlv-stand" aria-live="polite"></p>';
  dialog('Konten vorbereiten',inh,[{text:'Abbrechen',wert:''},{text:'Vorbereiten',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){Array.prototype.forEach.call(dlg.querySelectorAll('[data-tl-alle]'),function(b){b.onclick=function(){var an=b.getAttribute('data-tl-alle')==='1';Array.prototype.forEach.call(dlg.querySelectorAll('.ar-tl-auswahl input'),function(c){c.checked=an;});};});},
    pruefen:function(w){if(w.aktion==='ok'&&!offen.some(function(p,i){return w.werte['p_'+i];})){return 'Bitte mindestens eine Person auswählen.';}return '';},
    ausfuehren:function(w){
      var gew=offen.filter(function(p,i){return w.werte['p_'+i];}), st=w.dialog.querySelector('#ar-tlv-stand');
      return T.kontenVorbereiten(gew,function(n,g){if(st){st.textContent='Konten vorbereiten: '+n+' von '+g+' …';}});
    }
  }).then(function(r){
    if(r.aktion!=='ok'||!r.ergebnis){return;}
    verwaltungZeichnen();
    startZettelDialog(r.ergebnis);
  });
}
/* Die Codes gibt es nur in diesem Dialog: drucken (oder als PDF speichern), dann schließen */
function startZettelDialog(liste){
  var gedruckt=false, fehlerTeil=(liste.fehler&&liste.fehler.length)?'<div class="callout"><div><b>Nicht vorbereitet</b><ul>'+liste.fehler.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></div>':'';
  var inh='<p><b>'+liste.length+'</b> '+(liste.length===1?'Konto':'Konten')+' mit Startcode vorbereitet. Jetzt die Zettel drucken – drei pro Seite, zum Ausschneiden. Im Druckfenster geht auch „Als PDF speichern“.</p>'+
    '<p class="ar-klein"><b>Wichtig:</b> Die Startcodes gibt es nur jetzt. Wird ein Zettel nicht gedruckt oder geht verloren: Teamliste → „Neuer Code“.</p>'+fehlerTeil+
    '<p><button type="button" class="btn primary" data-zettel>'+svg('print')+'Zettel drucken</button></p>'+
    '<div class="ar-tl-vorschau"><table><thead><tr><th>Name</th><th>Team</th><th>Startcode</th><th>gültig bis</th></tr></thead><tbody>'+liste.map(function(x){return '<tr><td>'+esc(x.name)+'</td><td>'+esc(x.team?T_NAME(x.team):'')+'</td><td><code>'+esc(x.code)+'</code></td><td>'+esc(datum(x.bis))+'</td></tr>';}).join('')+'</tbody></table></div>';
  dialog('Startcodes drucken',inh,[{text:'Fertig',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){var b=dlg.querySelector('[data-zettel]');if(b){b.onclick=function(){gedruckt=true;zettelDrucken(liste);};}},
    pruefen:function(){if(!gedruckt){gedruckt=true;return 'Die Zettel sind noch nicht gedruckt. Ohne Druck sind die Codes weg – zum Schließen trotzdem noch einmal auf „Fertig“.';}return '';}
  });
}
function zettelDrucken(liste){
  var f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);var doc=f.contentWindow.document;doc.open();doc.write(startZettelHtml(liste));doc.close();
  setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){}setTimeout(function(){f.remove();},60000);},250);
}
function startZettelHtml(liste){
  var pfad=K.pfad?K.pfad():'', ort=/^[A-Za-z]:\\|^\\\\/.test(pfad)?pfad+'\\hub.html':'die Datei hub.html im Hub-Ordner';
  var css='@page{size:A4;margin:12mm}body{font:10.5pt/1.4 Arial,Helvetica,sans-serif;color:#111;margin:0}'+
    '.z{border:1.5px dashed #9aa3b5;border-radius:10px;padding:12pt 16pt 26pt;margin:0 0 9mm;page-break-inside:avoid;min-height:78mm;box-sizing:border-box;position:relative}'+
    '.k{font-size:8.5pt;color:#555;text-transform:uppercase;letter-spacing:.06em}.n{font-size:16pt;font-weight:700;margin:3pt 0 0}.t{color:#444;margin:0 0 8pt}'+
    '.c{font:700 19pt/1 Consolas,"Courier New",monospace;letter-spacing:.08em;border:1.5px solid #23307a;border-radius:8px;display:inline-block;padding:6pt 12pt;color:#23307a;margin-left:6pt}'+
    'ol{margin:9pt 0 0 15pt;padding:0}li{margin:1.5pt 0}.f{position:absolute;left:16pt;right:16pt;bottom:9pt;font-size:8pt;color:#555}';
  return '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Startcodes – CDSE Hub</title><style>'+css+'</style></head><body>'+
    liste.map(function(x){
      return '<div class="z"><div class="k">CDSE Hub · dein Zugang · persönlich</div><div class="n">'+esc(x.name)+'</div><div class="t">'+esc([x.team?T_NAME(x.team):'',x.funktion].filter(Boolean).join(' · '))+'</div>'+
        '<div>Dein Startcode:<span class="c">'+esc(x.code)+'</span></div>'+
        '<ol><li>Öffne in <b>Microsoft Edge</b>: '+esc(ort)+'</li><li>Beim ersten Mal: den Hub-Ordner auswählen bzw. „Zugriff erlauben“.</li><li>Klicke auf deinen Namen.</li>'+
        '<li>Gib den Startcode ein und wähle ein <b>eigenes Passwort</b> (mindestens 10 Zeichen, zum Beispiel ein kurzer Satz).</li><li>Drucke deinen <b>Wiederherstellungs-Code</b> aus und bewahre ihn sicher auf.</li></ol>'+
        '<div class="f">Gültig bis '+esc(datum(x.bis))+' · nur einmal verwendbar · nicht weitergeben – nach dem ersten Anmelden vernichten.</div></div>';
    }).join('')+'</body></html>';
}
function tlStartNeu(id){
  var v=K.vorbereitete().filter(function(x){return x.id===id;})[0];if(!v){return;}
  dialog('Neuer Startcode','<p>Für <b>'+esc(v.name)+'</b> wird ein neuer Startcode erzeugt. Der alte Zettel gilt dann nicht mehr.</p>',[{text:'Abbrechen',wert:''},{text:'Neuen Code erzeugen',wert:'ok',primaer:true}],{
    ausfuehren:function(){return T.startcodeErneuern(id);}
  }).then(function(r){if(r.aktion==='ok'&&r.ergebnis){verwaltungZeichnen();var l=[r.ergebnis];l.fehler=[];startZettelDialog(l);}});
}
function tlStartWeg(id){
  var v=K.vorbereitete().filter(function(x){return x.id===id;})[0];if(!v){return;}
  dialog('Vorbereitetes Konto löschen','<p>Das vorbereitete Konto von <b>'+esc(v.name)+'</b> wird gelöscht; der Startcode gilt dann nicht mehr. Die Person bleibt in der Teamliste.</p>',[{text:'Abbrechen',wert:''},{text:'Löschen',wert:'ok',primaer:true,gefahr:true}],{
    ausfuehren:function(){return T.vorbereitungEntfernen(id);}
  }).then(function(r){if(r.aktion==='ok'){toast('Vorbereitung gelöscht');verwaltungZeichnen();}});
}
/* Schlüssel des Schülerbereichs erneuern (nach dem Entziehen eines Zugangs) */
function schluesselKarte(){
  var st=T.schluesselStand(), e=st.erneuert;
  return karte('<h2>Schlüssel des Schülerbereichs</h2><p>Generation <b>'+st.gen+'</b>'+(e?' · zuletzt erneuert am '+esc(datumZeit(e.am))+' von '+esc(kname(e.von)):' · noch nie erneuert')+'.</p>'+
    '<p class="ar-klein">Nach dem Entziehen eines Zugangs den Schlüssel erneuern: Dann kann die Person auch mit einer alten Kopie der Schlüsseldatei (zum Beispiel aus einer Sicherung) nichts Neues mehr lesen. Alle anderen arbeiten ohne Unterbrechung weiter.</p>'+
    '<div class="ar-knopfreihe"><button class="btn" type="button" data-ar="schluessel-erneuern">'+svg('key')+'Schlüssel erneuern</button>'+
    (e?'<button class="ar-link" type="button" data-ar="umschluesseln">Umschlüsseln fortsetzen</button>':'')+'</div>','ar-schluessel');
}
function schluesselErneuernDialog(nachEntzug){
  var st=T.schluesselStand();
  var inhalt=(nachEntzug?'<p><b>Der Zugang ist entzogen.</b> Jetzt sollte der Schlüssel erneuert werden.</p>':'')+
    '<p>Mit einem neuen Schlüssel kann eine Person, der der Zugang entzogen wurde, auch mit einer alten Kopie der Schlüsseldatei nichts Neues mehr lesen. Der Hub verschlüsselt dafür alle Dossiers, Anhänge und die Rollenliste neu – je nach Anzahl dauert das einige Minuten.</p>'+
    '<p>Alle anderen können währenddessen weiterarbeiten; ihr Hub übernimmt den neuen Schlüssel beim nächsten Speichern von selbst.</p>'+
    '<p class="ar-klein" id="ar-schl-stand">Aktuell: Generation '+st.gen+'.</p>';
  dialog('Schlüssel erneuern',inhalt,[{text:nachEntzug?'Später':'Abbrechen',wert:''},{text:'Jetzt erneuern',wert:'ok',primaer:true}],{
    ausfuehren:function(w){
      var p=w.dialog.querySelector('#ar-schl-stand');
      return T.schluesselErneuern(function(n,g){if(p){p.textContent='Neu verschlüsseln: '+n+' von '+g+' Dateien …';}});
    }})
  .then(function(r){
    if(r.aktion!=='ok'||!r.ergebnis){return;}
    var z=r.ergebnis;
    toast('Schlüssel erneuert (Generation '+z.gen+') – '+z.neu+' Dateien neu verschlüsselt'+(z.fehler?', '+z.fehler+' noch offen':''));
    verwaltungZeichnen();
  });
}
function umschluesselnDialog(){
  dialog('Umschlüsseln fortsetzen','<p>Der Hub sucht Dateien, die noch mit einem älteren Schlüssel verschlüsselt sind, und verschlüsselt sie mit dem aktuellen neu.</p><p class="ar-klein" id="ar-schl-stand"></p>',
    [{text:'Abbrechen',wert:''},{text:'Starten',wert:'ok',primaer:true}],{
    ausfuehren:function(w){var p=w.dialog.querySelector('#ar-schl-stand');return T.umschluesseln(function(n,g){if(p){p.textContent=n+' von '+g+' Dateien geprüft …';}});}})
  .then(function(r){if(r.aktion==='ok'&&r.ergebnis){toast(r.ergebnis.neu?r.ergebnis.neu+' Dateien neu verschlüsselt':'Alles ist schon mit dem aktuellen Schlüssel verschlüsselt');}});
}
function verwaltungZeichnen(){
  var el=$('ar-verw');if(!el){return;}
  var admin=T.istAdmin(), w=T.wartende(), m=T.mitglieder();
  var ROLLEN={admin:'Verwaltung',responsable:'Responsable',mitarbeiter:'Mitarbeiter/in'};
  var h=karte('<h2>Warten auf Freischaltung'+(w.length?' <span class="ar-zahl">'+w.length+'</span>':'')+'</h2>'+
    (w.length?'<p class="ar-klein">Vergleiche den <b>Kontrollcode</b> mit dem Code, den die Person auf ihrem Bildschirm sieht (Schüler → „Noch nicht freigeschaltet“) – zum Beispiel am Telefon. Stimmt er, gehört das Konto wirklich ihr.</p>'+
      '<div class="ar-wartende">'+w.map(function(k){var tl=tlVon(k.name);return '<div class="ar-wartend"><span class="ava" style="--tc:'+esc(k.teamFarbe)+'">'+esc(ini(k.name))+'</span><span><b>'+esc(k.name)+'</b><small>'+esc([k.teamName,k.funktion].filter(Boolean).join(' · '))+'</small>'+
        (K.teamliste&&K.teamliste().length?(tl?'<small class="ar-tl-ok">'+svg('check')+'In der Teamliste'+(tl.rolle==='responsable'?' · Responsable'+(admin?' (wird übernommen)':''):'')+(tl.team&&tl.team!==k.team?' · Team laut Liste: '+esc(T_NAME(tl.team)):'')+'</small>':'<small class="ar-tl-fehlt">'+svg('warn')+'Nicht in der Teamliste – Identität besonders sorgfältig prüfen</small>'):'')+'</span>'+
        '<code class="ar-code" data-code="'+esc(k.id)+'">…</code><button class="btn primary" type="button" data-ar="freischalten" data-id="'+esc(k.id)+'">'+svg('check')+'Freischalten</button></div>';}).join('')+'</div>'
      :'<p class="ar-leise">Niemand wartet.</p>'));
  var ez=T.entzogene?T.entzogene():[];
  if(ez.length){h+=karte('<h2>Zugang entzogen <span class="ar-zahl">'+ez.length+'</span></h2><p class="ar-klein">Diese Konten warten nicht auf Freischaltung – ihnen hat die Verwaltung den Zugang entzogen.</p><div class="ar-wartende">'+
    ez.map(function(k){return '<div class="ar-wartend"><span class="ava" style="--tc:'+esc(k.teamFarbe)+'">'+esc(ini(k.name))+'</span><span><b>'+esc(k.name)+'</b><small>entzogen am '+esc(datum(tagVon(k.entzogenAm)))+(k.entzogenVon?' von '+esc(kname(k.entzogenVon)):'')+'</small></span><span></span>'+
      (admin?'<button class="btn" type="button" data-ar="freischalten" data-id="'+esc(k.id)+'">'+svg('check')+'Wieder freischalten</button>':'')+'</div>';}).join('')+'</div>');}
  h+=karte('<h2>Mitglieder</h2><div class="ar-tabelle ar-mitglieder"><div class="ar-zeile kopf"><span>Name</span><span>Team · Funktion</span><span>Responsable</span><span>Rolle</span><span></span></div>'+
    m.filter(function(k){return k.freigeschaltet;}).sort(function(a,b){return a.name.localeCompare(b.name,'de');}).map(function(k){
      return '<div class="ar-zeile"><span class="ar-name"><span class="ava" style="--tc:'+esc(k.teamFarbe)+'">'+esc(ini(k.name))+'</span><b>'+esc(k.name)+'</b></span><span>'+esc([k.teamName,k.funktion].filter(Boolean).join(' · '))+'</span><span>'+esc(k.responsable?kname(k.responsable):'—')+'</span>'+
        '<span>'+(admin?'<select data-rolle="'+esc(k.id)+'" aria-label="Rolle von '+esc(k.name)+'">'+Object.keys(ROLLEN).map(function(r){return '<option value="'+r+'"'+(k.rolle===r?' selected':'')+'>'+ROLLEN[r]+'</option>';}).join('')+'</select>':esc(ROLLEN[k.rolle]||k.rolle))+
          (function(){var tl=tlVon(k.name);return admin&&tl&&tl.rolle!==k.rolle?'<button class="ar-link ar-tl-rolle" type="button" data-ar="tl-rolle" data-id="'+esc(k.id)+'" data-rolle="'+esc(tl.rolle)+'">Teamliste: '+esc(ROLLEN[tl.rolle])+' übernehmen</button>':'';})()+'</span>'+
        '<span>'+(admin&&k.id!==K.ich().id?'<button class="ar-link gefahr" type="button" data-ar="entziehen" data-id="'+esc(k.id)+'">Zugang entziehen</button>':'')+'</span></div>';
    }).join('')+'</div>'+(admin?'<p class="ar-klein"><b>Responsables</b> können Konten freischalten und alle Dossiers bearbeiten. Die <b>Verwaltung</b> vergibt zusätzlich Rollen und kann Dossiers löschen.</p>':''));
  h+=teamlisteKarte(admin,ROLLEN);
  if(admin&&T.schluesselStand){h+=schluesselKarte();}
  var log=T.bereichsVerlauf().slice(0,60);
  h+=karte('<h2>Protokoll des Schülerbereichs</h2><ol class="ar-protokoll">'+log.map(function(v){return '<li><span class="ar-leise">'+esc(datumZeit(v.z))+'</span><b>'+esc(kname(v.v))+'</b><span>'+esc(v.t)+'</span></li>';}).join('')+'</ol>');
  el.innerHTML=h;
  Array.prototype.forEach.call(el.querySelectorAll('[data-code]'),function(c){K.kontrollcode(c.getAttribute('data-code')).then(function(x){c.textContent=x||'—';});});
  Array.prototype.forEach.call(el.querySelectorAll('select[data-rolle]'),function(s){
    s.onchange=function(){var id=s.getAttribute('data-rolle'), alt=T.rolle(id), neu=s.value;
      var WAS={admin:'vergibt Rollen, schaltet frei, kann Zugänge entziehen und Dossiers löschen',responsable:'schaltet Konten frei und kann alle Dossiers bearbeiten',mitarbeiter:'liest alle Dossiers und bearbeitet die eigenen Fälle'};
      dialog('Rolle ändern','<p><b>'+esc(kname(id))+'</b>: '+esc(ROLLEN[alt]||alt)+' → <b>'+esc(ROLLEN[neu])+'</b></p><p class="ar-klein">'+esc(ROLLEN[neu])+' '+esc(WAS[neu])+'.</p>',
        [{text:'Abbrechen',wert:''},{text:'Rolle ändern',wert:'ok',primaer:true}],{ausfuehren:function(){return T.rolleSetzen(id,neu);}})
        .then(function(r){if(r.aktion==='ok'){toast('Rolle geändert');verwaltungZeichnen();navNeu();}else{s.value=alt;}});};
  });
}

/* =====================================================================
   Ereignisse
   ===================================================================== */
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-ar], #arbeit-body [data-tab], #arbeit-body [data-filter-status], #arbeit-body [data-filter-stelle], #arbeit-body [data-filter-meine], #arbeit-body [data-filter-ueber], #arbeit-body [data-ansicht]');
  if(!t){return;}
  if(t.hasAttribute('data-filter-status')){filter.status=t.getAttribute('data-filter-status');listeZeichnen(letzteListe);return;}
  if(t.hasAttribute('data-filter-stelle')){filter.stelle=t.getAttribute('data-filter-stelle');listeZeichnen(letzteListe);return;}
  if(t.hasAttribute('data-filter-meine')){filter.meine=!filter.meine;listeZeichnen(letzteListe);return;}
  if(t.hasAttribute('data-filter-ueber')){filter.ueber=!filter.ueber;listeZeichnen(letzteListe);return;}
  if(t.hasAttribute('data-ansicht')){teamAnsicht=t.getAttribute('data-ansicht');Array.prototype.forEach.call(document.querySelectorAll('[data-ansicht]'),function(b){b.classList.toggle('on',b===t);b.setAttribute('aria-selected',String(b===t));});teamZeichnen();return;}
  if(t.hasAttribute('data-tab')){dossierTab=t.getAttribute('data-tab');if(aktDossier){dossierZeichnen(aktDossier);}reiterInSicht();return;}
  var a=t.getAttribute('data-ar'), d=aktDossier;
  var det=t.closest('details');if(det){det.open=false;}
  switch(a){
    case 'einrichten':
      t.disabled=true;T.einrichten().then(function(){toast('Schülerbereich eingerichtet – du bist Verwaltung');navNeu();seiteSchueler(true);},function(e){t.disabled=false;fehlerToast(e);});break;
    case 'neu-laden':geladen=false;T.vergessen().then(function(){zeigen(akt.seite,akt.param,true);});break;
    case 'neu':neuerSchueler();break;
    case 'fiche-hochladen':ficheHochladen(null);break;
    case 'fiche-hochladen-dossier':ficheHochladen(d);break;
    case 'fiche-download':ficheHerunterladen(d,t);break;
    case 'fiche-teil':ficheTeilDialog(d,t.getAttribute('data-teil'));break;
    case 'tl-neu':tlPersonDialog(null);break;
    case 'tl-bearbeiten':tlPersonDialog(+t.getAttribute('data-i'));break;
    case 'tl-einfuegen':tlEinfuegenDialog('');break;
    case 'tl-export':tlExport();break;
    case 'tl-vorbereiten':tlVorbereitenDialog();break;
    case 'tl-startneu':tlStartNeu(t.getAttribute('data-id'));break;
    case 'tl-startweg':tlStartWeg(t.getAttribute('data-id'));break;
    case 'tl-filter':tlFilter=t.getAttribute('data-team')||'';verwaltungZeichnen();var fb=document.querySelector('[data-ar="tl-filter"][data-team="'+tlFilter+'"]');if(fb){fb.focus();}break;
    case 'tl-rolle':t.disabled=true;T.rolleSetzen(t.getAttribute('data-id'),t.getAttribute('data-rolle')).then(function(){toast('Rolle laut Teamliste übernommen');verwaltungZeichnen();navNeu();},function(e){t.disabled=false;fehlerToast(e);});break;
    case 'db-angaben':if(window.CDSE_DATENBANK){window.CDSE_DATENBANK.bearbeiten(d).then(function(neu){if(neu){dossierNeu(neu);}});}break;
    case 'db-zeigen':if(window.CDSE_DATENBANK){window.CDSE_DATENBANK.zeigen(d.id);}break;
    case 'weitergeben':weitergebenDialog(d);break;
    case 'rechte':rechteDialog(d);break;
    case 'verantwortlich':verantwortlichDialog(d);break;
    case 'person':personDialog(d);break;
    case 'status':statusDialog(d);break;
    case 'loeschen':loeschenDialog(d);break;
    case 'drucken':drucken(d);break;
    case 'eldib-uebernehmen':eldibUebernehmenDialog(d);break;
    case 'eldib-oeffnen':eldibOeffnen(d);break;
    case 'einschaetzung':einschaetzungDialog(d);break;
    case 'neu-laden-dossier':seiteDossier(d.id,true);break;
    case 'eintrag-neu':dossierTab='eintraege';dossierZeichnen(d);reiterInSicht();var tf=document.querySelector('#ar-eintrag-form textarea[name=text]');if(tf){tf.focus();}break;
    case 'fremd-neu':if(fremdNeu&&fremdNeu.id===d.id){dossierNeu(fremdNeu);toast('Neuer Stand angezeigt');}else{seiteDossier(d.id,true);}break;
    case 'eintrag-aendern':eintragAendernDialog(d,t.getAttribute('data-eid'));break;
    case 'eintrag-loeschen':eintragLoeschenDialog(d,t.getAttribute('data-eid'));break;
    case 'ziel-eintrag':zielEintragDialog(d,t.getAttribute('data-item'));break;
    case 'eldib-wahl':eldibWahl=+t.getAttribute('data-nr');dossierZeichnen(d);break;
    case 'einsatz-neu':seiteEinsatz();break;
    case 'block-neu':blockDialog(+t.getAttribute('data-tag'),null);break;
    case 'block-aendern':blockDialog(null,t.getAttribute('data-id'));break;
    case 'tag-kopieren':tagKopierenDialog(+t.getAttribute('data-tag'));break;
    case 'ausnahme-neu':ausnahmeDialog();break;
    case 'ausnahme-weg':planEntwurf.ausnahmen=planEntwurf.ausnahmen.filter(function(x){return x.id!==t.getAttribute('data-id');});planDirty=true;einsatzZeichnen();break;
    case 'plan-speichern':planSpeichern(t);break;
    case 'team-neu':seiteTeam(true);break;
    case 'freischalten':
      t.disabled=true;T.freischalten(t.getAttribute('data-id')).then(function(){toast('Freigeschaltet');verwaltungZeichnen();navNeu();},function(e){t.disabled=false;if(!(e&&e.abgebrochen)){fehlerToast(e);}});break;
    case 'entziehen':
      dialog('Zugang entziehen','<p><b>'+esc(kname(t.getAttribute('data-id')))+'</b> kann danach keine Schülerdaten mehr öffnen. Was die Person bisher gesehen hat, lässt sich nicht zurückholen.</p>',[{text:'Abbrechen',wert:''},{text:'Entziehen',wert:'ok',primaer:true,gefahr:true}],{ausfuehren:function(){return T.entziehen(t.getAttribute('data-id'));}})
        .then(function(r){if(r.aktion==='ok'){toast('Zugang entzogen');verwaltungZeichnen();if(T.schluesselErneuern){schluesselErneuernDialog(true);}}});break;
    case 'schluessel-erneuern':schluesselErneuernDialog(false);break;
    case 'umschluesseln':umschluesselnDialog();break;
  }
});
/* „Weitere Aktionen“ (⋯) schließt bei einem Klick daneben und mit Esc */
document.addEventListener('click',function(ev){Array.prototype.forEach.call(document.querySelectorAll('details.ar-mehr[open]'),function(det){if(!det.contains(ev.target)){det.open=false;}});},true);
document.addEventListener('keydown',function(ev){if(ev.key!=='Escape'){return;}Array.prototype.forEach.call(document.querySelectorAll('details.ar-mehr[open]'),function(det){det.open=false;var su=det.querySelector('summary');if(su){su.focus();}});});
/* Nach dem Reiterwechsel: stand die Reiterleiste schon oberhalb des sichtbaren Bereichs, dorthin zurück */
function reiterInSicht(){
  var nav=document.querySelector('#ar-dossier .ar-tabs'), b=body(), sc=b&&b.parentNode;if(!nav||!sc){return;}
  var oben=nav.getBoundingClientRect().top-sc.getBoundingClientRect().top;
  if(oben<0){sc.scrollTop=Math.max(0,sc.scrollTop+oben-8);}
  var on=nav.querySelector('.on');if(on&&on.scrollIntoView){on.scrollIntoView({block:'nearest',inline:'nearest'});}
}
/* Ungespeicherten Einsatzplan nicht verlieren (auch wenn inzwischen eine App offen ist) */
window.addEventListener('beforeunload',function(ev){if(planDirty){ev.preventDefault();ev.returnValue='';}});

/* ---------- Screening: Übersicht aller Schüler (Modul CDSE_SCREENING) ---------- */
function seiteScreening(neu){
  setzen(kopf('Arbeit','Screening','Strukturierte Beobachtung – keine Diagnose: Wo braucht ein Kind Unterstützung, wo liegen seine Stärken, was ist der nächste Schritt? Hier stehen alle Schülerinnen und Schüler mit ihrem letzten Screening.',
    '<button class="btn" type="button" data-scu="leer">'+svg('print')+'Leeren Bogen drucken</button>')+'<div id="ar-sc">'+laedt('Lade die Dossiers …')+'</div>');
  bereichLaden(neu).then(function(z){
    if(z.art!=='bereit'){$('ar-sc').innerHTML=zustandsKarte(z);meinenCodeZeigen();return;}
    if(!window.CDSE_SCREENING){$('ar-sc').innerHTML=karte('<h2>Screening fehlt</h2>'+hinweis('Das Modul ist in dieser Hub-Datei nicht enthalten.'),'ar-leer');return;}
    return T.alleDossiers(neu).then(function(l){letzteListe=l;window.CDSE_SCREENING.uebersicht($('ar-sc'),l);});
  }).catch(function(e){var el=$('ar-sc');if(el){el.innerHTML=zustandsKarte({art:'fehler',text:(e&&e.message)||String(e)});}});
}
var naechsterTab=null;   /* Reiter, der beim Öffnen eines anderen Dossiers gezeigt werden soll */
var TAB_IDS=['ueberblick','kompass','begleitplan','fiche','entwicklung','screening','profil','eintraege','verlauf'];

/* ---------- Einstieg ---------- */
function zeigen(seite,param,neu){
  if(akt.seite==='einsatz'&&seite!=='einsatz'&&planDirty){
    if(!window.confirm('Dein Einsatzplan hat ungespeicherte Änderungen. Trotzdem verlassen?')){history.back();return;}
    planDirty=false;
  }
  akt={seite:seite,param:param||''};
  /* Verweis von außen auf einen bestimmten Reiter (z. B. „Fällig diese Woche“ → Begleitplan) */
  var tabWunsch=/[?&]tab=([a-z]+)/.exec(location.hash||'');
  if(tabWunsch&&TAB_IDS.indexOf(tabWunsch[1])<0){tabWunsch=null;}
  if(seite==='schueler'&&param&&tabWunsch){try{history.replaceState(null,'','#/schueler/'+encodeURIComponent(param));}catch(e){}}
  if(seite==='schueler'&&param){
    if(tabWunsch){dossierTab=tabWunsch[1];}
    else if(!aktDossier||aktDossier.id!==param){dossierTab=naechsterTab||'ueberblick';}
    naechsterTab=null;seiteDossier(param,neu);
  }
  else if(seite==='screening'){seiteScreening(neu);}
  else if(seite==='schueler'){seiteSchueler(neu);}
  else if(seite==='einsatz'){seiteEinsatz();}
  else if(seite==='team'){seiteTeam(neu);}
  else if(seite==='verwaltung'){seiteVerwaltung();}
  else if(seite==='datenbank'){seiteDatenbank(param,neu);}
  var b=body();if(b&&b.parentNode){b.parentNode.scrollTop=0;}
}
/* =====================================================================
   Fiche de renseignement: hochladen → Dossier anlegen/aktualisieren,
   im Dossier ansehen und bearbeiten, aktualisierte Fiche herunterladen
   (Lesen/Schreiben der Word-Datei: Modul CDSE_FICHE)
   ===================================================================== */
var F_DR=['01, Luxembourg','02 Mamer','03 Pétange','04 Differdange','05 Sanem','06 Esch/Alzette','07 Dudelange','08 Bettembourg','09 Remich','10 Grevenmacher','11 Echternach','12 Mersch','13 Rédange/Attert','14 Diekirch','15 Wiltz'];
var F_ROLLEN={ef:['I-EBS','A-EBS','ESEB'],es:['ESEB','SePas','SSE']};
var F_KLASSEN=['Précoce','C1.1','C1.2','C1.3','C2.1','C2.2','C2.3','C3.1','C3.2','C3.3','C4.1','C4.2','C4.3','Stage1','Stage2','Stage3','Stage4','Stage5','Stage6','M1','M2','P1','P2','P3','P4','P5',
  '7G','7P','7C','7I','7IEC','S1','6G','6P','6C','6I','6IEC','S2','5G','5AD','CIP','5P','5C','5I','5IEC','S3','4T','4G','1ère année DAP','1ère année CCP','4C','4I','4IEC','S4','2e année DAP','2e année CCP',
  '3T','3G','3C','3e année DAP','3e année CCP','3IEC','3I','S5','2T','2G','2C','2BI','2IEC','S6','1T','1G','1C','1BI','1IEC','S7'];
var F_CST=['Moveo','iami','X-Track','Attivo','Switch','Twist','Kautenbach','Passo','Nobu','Klick-Klack'];
var F_MASSN=[['diagnostic','Diagnostic spécialisé','DS'],['cgPro','Conseil et guidance des professionnel·le·s','C&G'],['cgEltern','Conseil et guidance parents','C&G'],['isa','Intervention spécialisée ambulatoire (ISA)','ISA'],
  ['atelier','Atelier d’apprentissage spécifique',''],['reeducation','Rééducation',''],['annexe','Scolarisation spécialisée – Annexe Junglinster','Annexe'],['cdp','Scolarisation spécialisée – CdP','CdP'],['cst','Scolarisation spécialisée – CST','CST']];
function ficheDa(){return !!window.CDSE_FICHE;}
function fv(o,pfad){return String(pfad).split('.').reduce(function(x,k){return x==null?undefined:x[k];},o);}
function fsetz(o,pfad,w){var t=pfad.split('.'),x=o;for(var i=0;i<t.length-1;i++){var k=t[i],n=/^\d+$/.test(t[i+1]);if(x[k]==null){x[k]=n?[]:{};}x=x[k];}x[t[t.length-1]]=w;}
function fleer(v){if(v==null||v===''||v===false){return true;}if(Array.isArray(v)){return v.every(fleer);}if(typeof v==='object'){return Object.keys(v).every(function(k){return fleer(v[k]);});}return false;}
/* Hochgeladene Werte gewinnen, wo sie etwas enthalten; Listen werden ersetzt */
function fmischen(alt,neu){
  var beenden=!!(neu&&typeof neu==='object'&&neu.aktiv===false);   /* Maßnahme ausdrücklich beendet (beim Hochladen bestätigt) */
  if(fleer(neu)&&!beenden){return alt;}
  if(Array.isArray(neu)||neu==null||typeof neu!=='object'||alt==null||typeof alt!=='object'||Array.isArray(alt)){return neu;}
  var r=Object.assign({},alt);Object.keys(neu).forEach(function(k){if(k==='aktiv'&&neu[k]===false){r[k]=false;return;}r[k]=fmischen(alt[k],neu[k]);});return r;
}
function ohneLeere(l){return (l||[]).filter(function(x){return !fleer(x);});}
function kontaktText(k){k=k||{};return [k.name,k.adresse,k.tel,k.mail].filter(Boolean).join(' · ');}
function massnahmeZeit(m){return [m.von?'seit '+datum(m.von):'',m.bis?'bis '+datum(m.bis):''].filter(Boolean).join(' ');}
function laufendeMassnahmen(f){
  var c=(f&&f.cdse)||{};
  return F_MASSN.filter(function(m){var x=c[m[0]];return x&&x.aktiv;}).map(function(m){var x=c[m[0]];return {id:m[0],name:m[1],kurz:m[2],x:x};});
}
/* Welche Stelle passt zu den Maßnahmen der Fiche? (Vorschlag beim Anlegen) */
function stelleAusFiche(f){
  var c=(f&&f.cdse)||{}, me=K.ich();
  if(c.cst&&c.cst.aktiv){return 'cst';}
  if(c.cdp&&c.cdp.aktiv){return 'cp';}
  if(c.annexe&&c.annexe.aktiv){return 'annexe';}
  if(c.isa&&c.isa.aktiv){return 'isa';}
  if(c.diagnostic&&c.diagnostic.aktiv){return 'diagnostique';}
  return eigeneStelle(me);
}
function ficheHochladen(ziel){
  if(!ficheDa()){toast('Das Fiche-Modul fehlt in dieser Hub-Datei.');return;}
  var inp=document.createElement('input');inp.type='file';inp.accept='.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document';inp.hidden=true;
  document.body.appendChild(inp);
  inp.onchange=function(){
    var f=inp.files&&inp.files[0];inp.remove();if(!f){return;}
    toast('Lese die Fiche …');
    var liste=letzteListe?Promise.resolve(letzteListe):T.alleDossiers().then(function(l){letzteListe=l;return l;});
    Promise.all([window.CDSE_FICHE.lesen(f),liste]).then(function(x){ficheVorschau(x[0],ziel,x[1]);},function(e){
      dialog('Fiche ließ sich nicht lesen',hinweis(fehlerText(e))+'<p class="ar-klein">Tipp: In Word „Speichern unter“ → Format „Word-Dokument (.docx)“ wählen und die neue Datei hochladen.</p>');
    });
  };
  inp.click();
}
function matriculeGleich(a,b){a=String(a||'').replace(/\D/g,'');b=String(b||'').replace(/\D/g,'');return a.length>=8&&a===b;}
/* beide Matricules bekannt und verschieden: dann ist es ein anderes Kind, auch bei gleichem Namen */
function matriculeAnders(a,b){a=String(a||'').replace(/\D/g,'');b=String(b||'').replace(/\D/g,'');return a.length>=8&&b.length>=8&&a!==b;}
function passendesDossier(p,liste){
  var l=liste||[];
  var m=l.filter(function(d){return matriculeGleich((d.person||{}).matricule,p.matricule);})[0];
  if(m){return {d:m,grund:'gleiche Matricule'};}
  var namensGleich=l.filter(function(d){var q=d.person||{};return norm(q.nachname)===norm(p.nachname)&&norm(q.vorname)===norm(p.vorname)&&(!p.geburtsdatum||!q.geburtsdatum||p.geburtsdatum===q.geburtsdatum);});
  m=namensGleich.filter(function(d){return !matriculeAnders((d.person||{}).matricule,p.matricule);})[0];
  if(m){return {d:m,grund:'gleicher Name'+(p.geburtsdatum?' und Geburtsdatum':'')};}
  return namensGleich.length?{d:null,aehnlich:namensGleich[0]}:null;
}
function ficheZusammenfassung(f){
  f=f||{};
  var z=[];
  function add(t,w){if(!fleer(w)){z.push('<dt>'+esc(t)+'</dt><dd>'+w+'</dd>');}}
  add('Stand der Fiche',esc([f.datum?datum(f.datum):'',f.schuljahr?'Schuljahr '+f.schuljahr:''].filter(Boolean).join(' · ')));
  add('Erziehungsberechtigte',esc(ohneLeere(f.vertreter).map(function(v){return (v.name||'—')+(v.funktion?' ('+v.funktion+')':'')+(v.autoritaet?' – autorité parentale':'');}).join('; ')));
  add('Direction régionale',esc((f.ef&&f.ef.dr)||''));
  var kontakte=[].concat(f.ef?[f.ef.pdr,f.ef.titulaire,f.ef.maisonRelais].concat(f.ef.weitere||[]):[],f.es?[f.es.pdr,f.es.titulaire].concat(f.es.weitere||[]):[]).filter(function(k){return !fleer(k);});
  add('Kontakte Schule',kontakte.length?esc(kontakte.length+(kontakte.length>1?' Personen':' Person')):'');
  add('Progression',esc(ohneLeere(f.progression).join(' → ')));
  add('Autres intervenant·e·s',esc(ohneLeere(f.intervenants).map(function(i){return i.institution||i.name;}).join(', ')));
  add('Maßnahmen CDSE',esc(laufendeMassnahmen(f).map(function(m){return m.name+(massnahmeZeit(m.x)?' ('+massnahmeZeit(m.x)+')':'');}).join('; ')));
  return z.length?'<dl class="ar-dl">'+z.join('')+'</dl>':'<p class="ar-leise">Außer den Personendaten wurde nichts gefunden.</p>';
}
function ficheVorschau(erg,ziel,liste){
  var dat=erg.daten, p=dat.person||{}, f=dat.fiche||{};
  var treffer=ziel?{d:ziel,grund:'dieses Dossier'}:passendesDossier(p,liste), aehnlich=null;
  if(treffer&&!treffer.d){aehnlich=treffer.aehnlich;treffer=null;}
  /* Aktualisieren nur mit Schreibrecht – sonst nicht aus Versehen ein zweites Dossier für dasselbe Kind */
  var darf=!treffer||T.rechte(treffer.d).bearbeiten;
  /* Im Dossier laufende Maßnahmen, die in dieser Datei nicht angekreuzt sind: nicht still beenden – einzeln wählen */
  var fc=(f&&f.cdse)||{}, altC=(treffer&&treffer.d&&treffer.d.fiche&&treffer.d.fiche.cdse)||{};
  var nichtMehr=treffer?F_MASSN.filter(function(m){return altC[m[0]]&&altC[m[0]].aktiv===true&&fc[m[0]]&&fc[m[0]].aktiv===false;}):[];
  var endeWahl=nichtMehr.length?'<fieldset class="ar-wahlgruppe"><legend>In dieser Fiche nicht (mehr) angekreuzt</legend><p class="ar-klein">Im Dossier laufen diese Maßnahmen noch. Nur ankreuzen, was wirklich beendet ist – sonst bleiben sie unverändert.</p>'+
    nichtMehr.map(function(m){var x=altC[m[0]]||{};return '<label class="ar-haken"><input type="checkbox" name="ende_'+m[0]+'"> '+esc(m[1])+' beenden'+(x.von?' <small>(seit '+esc(datum(x.von))+')</small>':'')+'</label>';}).join('')+'</fieldset>':'';
  var inhalt='<p class="ar-klein">'+svg('datei')+' '+esc(erg.datei||'Fiche')+'</p>'+
    (aehnlich?hinweis('Es gibt schon ein Dossier <b>'+esc(schuelerName(aehnlich.person))+'</b> mit gleichem Namen, aber einer <b>anderen Matricule</b>. Bitte prüfen, ob es wirklich ein anderes Kind ist.'):'')+
    (treffer&&!darf?hinweis('Für <b>'+esc(schuelerName(treffer.d.person))+'</b> gibt es schon ein Dossier ('+esc(treffer.grund)+'). Du hast dort nur Leserechte. Bitte '+esc((treffer.d.verantwortlich||[]).map(kname).join(', ')||'die Fallverantwortlichen')+' um ein Schreibrecht und lade die Fiche dann noch einmal hoch.'):'')+
    (erg.hinweise||[]).map(function(h){return hinweis(esc(h),'info');}).join('')+
    ((erg.nichtZugeordnet||[]).length?hinweis('Einige Tabellen der Datei waren keinem Feld zuzuordnen. Bitte nach dem Übernehmen kurz prüfen.','info'):'')+
    (treffer?'<fieldset class="ar-wahlgruppe"><legend>Was soll passieren?</legend>'+
      '<label class="ar-radio'+(darf?'':' aus')+'"><input type="radio" name="modus" value="aktualisieren"'+(darf?' checked':' disabled')+'><span><b>Dossier von '+esc(schuelerName(treffer.d.person))+' aktualisieren</b><small>'+esc(treffer.grund)+' – Angaben aus der Fiche ersetzen die alten, leere Felder der Fiche ändern nichts.</small></span></label>'+
      (ziel?'':'<label class="ar-radio"><input type="radio" name="modus" value="neu"><span><b>Neues Dossier anlegen</b><small>Nur wählen, wenn es wirklich ein anderes Kind ist.</small></span></label>')+'</fieldset>':'<input type="hidden" name="modus" value="neu">')+
    '<h3 class="ar-zwischen">Personendaten – bitte prüfen</h3><div class="ar-raster2">'+
      feld('nachname','Nachname',p.nachname,'text',' required')+feld('vorname','Vorname',p.vorname,'text',' required')+
      feld('geburtsdatum','Geburtsdatum',p.geburtsdatum,'date')+auswahl('geschlecht','Geschlecht',p.geschlecht||'',[['m','Junge'],['w','Mädchen']],'–')+
      feld('matricule','Matricule',p.matricule)+feld('schule','Schule',p.schule)+feld('klasse','Klasse / Cycle',p.klasse)+
      (treffer&&ziel?'':auswahl('stelle','Zuständige Stelle (bei neuem Dossier)',stelleAusFiche(f),stellenOptionen()))+'</div>'+
    endeWahl+
    '<h3 class="ar-zwischen">Außerdem in der Fiche</h3>'+ficheZusammenfassung(f);
  dialog('Fiche de renseignement übernehmen',inhalt,[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){
      if(!w.werte.modus){return 'Bitte wählen, was passieren soll.';}
      if(w.werte.modus==='aktualisieren'&&!darf){return 'Für dieses Dossier hast du nur Leserechte.';}
      if(w.werte.modus==='aktualisieren'&&treffer&&matriculeAnders(w.werte.matricule,(treffer.d.person||{}).matricule)&&!w.dialog.dataset.mOk){
        w.dialog.dataset.mOk='1';return 'Die Matricule in der Fiche ist eine andere als im Dossier. Nochmal „Übernehmen“, wenn es wirklich dasselbe Kind ist.';}
      return (String(w.werte.nachname).trim()&&String(w.werte.vorname).trim())?'':'Vor- und Nachname fehlen.';},
    ausfuehren:function(w){
      var v=w.werte, person={nachname:v.nachname.trim(),vorname:v.vorname.trim(),geburtsdatum:v.geburtsdatum,geschlecht:v.geschlecht,matricule:v.matricule.trim(),schule:v.schule.trim(),klasse:v.klasse.trim()};
      var fiche=Object.assign({},f,{quelle:{datei:erg.datei||'',gelesen:new Date().toISOString(),von:K.ich().id}});
      /* „nicht angekreuzt“ aus der Datei nur übernehmen, wo es bestätigt wurde (sonst bleibt die Maßnahme, wie sie ist) */
      if(fiche.cdse){fiche.cdse=Object.assign({},fiche.cdse);Object.keys(fiche.cdse).forEach(function(k){
        var x=fiche.cdse[k];if(!x||typeof x!=='object'||x.aktiv!==false){return;}
        if(v.modus==='aktualisieren'&&v['ende_'+k]){return;}
        if(v.modus==='aktualisieren'){var y=Object.assign({},x);delete y.aktiv;fiche.cdse[k]=y;}
      });}
      if(fiche.schule){fiche.schule=Object.assign({},fiche.schule,{name:person.schule||fiche.schule.name,klasse:person.klasse||fiche.schule.klasse});}
      if(v.modus==='aktualisieren'&&treffer){
        var alt=treffer.d;
        var np=fmischen(alt.person||{},person), nf=fmischen(alt.fiche||{},fiche);
        /* Stand beim Öffnen als Basis: was andere inzwischen an anderen Feldern gespeichert haben, bleibt erhalten */
        return T.ops.fiche(alt.id,{person:np,fiche:nf},'Fiche de renseignement hochgeladen ('+(erg.datei||'Datei')+')',{person:alt.person||{},fiche:alt.fiche||{}});
      }
      return T.neuesDossier(person,{stelle:v.stelle||stelleAusFiche(f),fiche:fiche});
    }
  }).then(function(r){
    if(!r.ergebnis){return;}
    var d=r.ergebnis;
    if(letzteListe){letzteListe=letzteListe.filter(function(x){return x.id!==d.id;}).concat([d]);}
    aktDossier=d;dossierTab='fiche';toast('Fiche übernommen');
    if(location.hash==='#/schueler/'+d.id){dossierZeichnen(d);}else{location.hash='#/schueler/'+d.id;}
  });
}
function ficheHerunterladen(d,knopf){
  if(!ficheDa()){toast('Das Fiche-Modul fehlt in dieser Hub-Datei.');return;}
  if(knopf){knopf.disabled=true;}
  window.CDSE_FICHE.schreiben(d).then(function(blob){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=window.CDSE_FICHE.dateiname(d);document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000);toast('Fiche erstellt – Word-Datei wird gespeichert');
  },function(e){toast('Fiche ließ sich nicht erstellen: '+((e&&e.message)||e));}).then(function(){if(knopf){knopf.disabled=false;}});
}
/* ---------- Reiter „Fiche“ ---------- */
function fdl(zeilen){
  var z=zeilen.filter(function(x){return !fleer(x[1]);});
  return z.length?'<dl class="ar-dl">'+z.map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+(x[2]?x[1]:esc(x[1]).replace(/\n/g,'<br>'))+'</dd>';}).join('')+'</dl>':'<p class="ar-leise">Keine Angaben.</p>';
}
function fkarte(titel,fr,inhalt,aktion,r){
  return '<section class="ar-karte ar-fkarte"><div class="ar-kartenkopf"><h2>'+esc(titel)+(fr?' <small lang="fr">'+esc(fr)+'</small>':'')+'</h2>'+
    (r.bearbeiten&&aktion?'<button class="ar-link" type="button" data-ar="fiche-teil" data-teil="'+aktion+'">'+svg('edit')+'Bearbeiten</button>':'')+'</div>'+inhalt+'</section>';
}
function tabFiche(d,r){
  var p=d.person||{}, f=d.fiche||{}, h='';
  if(!ficheDa()){return hinweis('Für diese Ansicht fehlt das Fiche-Modul in dieser Hub-Datei.');}
  var hat=!fleer(f);
  h+='<div class="ar-fkopf ar-karte"><div><h2>Fiche de renseignement</h2><p class="ar-leise">'+(hat?esc(['Stand '+(f.datum?datum(f.datum):'ohne Datum'),f.schuljahr?'Schuljahr '+f.schuljahr:'',f.quelle&&f.quelle.datei?'aus „'+f.quelle.datei+'“':''].filter(Boolean).join(' · ')):'Noch keine Fiche hinterlegt. Hochladen oder die Abschnitte direkt ausfüllen.')+'</p></div>'+
    '<div class="ar-knopfreihe">'+(r.bearbeiten?'<button class="btn" type="button" data-ar="fiche-hochladen-dossier">'+svg('hoch')+(hat?'Neue Fiche hochladen':'Fiche hochladen')+'</button>':'')+
    '<button class="btn primary" type="button" data-ar="fiche-download">'+svg('runter')+'Fiche herunterladen (Word)</button></div></div>';
  var ueber=laufendeMassnahmen(f);
  h+='<div class="ar-fraster">';
  h+=fkarte('Schüler·in','Données de l’élève',fdl([['Name',[p.nachname,p.vorname].filter(Boolean).join(', ')],['Geburtsdatum',p.geburtsdatum?datum(p.geburtsdatum):''],['Geburtsort',f.geburtsort],
    ['Geschlecht',p.geschlecht==='m'?'männlich':(p.geschlecht==='w'?'weiblich':'')],['Matricule',p.matricule],['Dossier M-Files',f.mfiles],['Identité IAM',f.iam],
    ['Adresse',[f.strasse,f.ort].filter(Boolean).join(', ')],['Nationalität',f.nationalitaet],['Erstsprache',f.ersteSprache],
    ['Migration',[f.migration,f.ankunft?'angekommen am '+datum(f.ankunft):''].filter(Boolean).join(' · ')]]),'person',r);
  var vt=ohneLeere(f.vertreter);
  h+=fkarte('Erziehungsberechtigte','Représentant·e·s légaux·ales',(vt.length?vt.map(function(v,i){
      return '<h3 class="ar-fklein">'+esc(v.name||('Person '+(i+1)))+(v.funktion?' <small>'+esc(v.funktion)+'</small>':'')+(v.autoritaet?' <span class="ar-chip-ok">autorité parentale</span>':'')+'</h3>'+
        fdl([['Adresse',[v.strasse,v.ort].filter(Boolean).join(', ')],['Telefon',v.tel],['E-Mail',v.mail]]);
    }).join(''):'<p class="ar-leise">Keine Angaben.</p>')+(f.familie?'<h3 class="ar-fklein">Familiäre Situation</h3><p class="ar-ftext">'+esc(f.familie).replace(/\n/g,'<br>')+'</p>':''),'vertreter',r);
  var sch=f.schule||{};
  function kontaktListe(teil){
    var t=f[teil]||{}, z=[];
    if(t.dr){z.push(['Direction régionale',t.dr]);}
    if(!fleer(t.pdr)){z.push(['Pdr CI',kontaktText(t.pdr)]);}
    if(!fleer(t.titulaire)){z.push(['Titulaire de classe',kontaktText(t.titulaire)]);}
    ohneLeere(t.weitere).forEach(function(w){z.push([w.rolle||'Weitere Person',kontaktText(w)]);});
    if(!fleer(t.maisonRelais)){z.push(['Maison Relais',kontaktText(t.maisonRelais)]);}
    return z;
  }
  var ef=kontaktListe('ef'), es=kontaktListe('es');
  h+=fkarte('Schule','Données scolaires',fdl([['Schule',sch.name||p.schule],['Klasse',sch.klasse||p.klasse],['Adresse',[sch.strasse,sch.ort].filter(Boolean).join(', ')]])+
    (ef.length?'<h3 class="ar-fklein">Enseignement fondamental</h3>'+fdl(ef):'')+(es.length?'<h3 class="ar-fklein">Enseignement secondaire</h3>'+fdl(es):''),'schule',r);
  var pr=ohneLeere(f.progression);
  h+=fkarte('Schullaufbahn','Progression scolaire',(pr.length?'<ol class="ar-laufbahn">'+pr.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ol>':'<p class="ar-leise">Keine Angaben.</p>')+
    (f.progressionBemerkung?'<p class="ar-ftext">'+esc(f.progressionBemerkung)+'</p>':''),'progression',r);
  var dp=f.depistage||{};
  h+=fkarte('Dépistage','Dépistage',fdl([['CL',dp.cl],['CDM',dp.cdm],['CDV',dp.cdv],['Andere',dp.autres]]),'depistage',r);
  var iv=ohneLeere(f.intervenants);
  h+=fkarte('Weitere Fachpersonen','Autres intervenant·e·s professionnel·le·s',iv.length?'<ul class="ar-fliste">'+iv.map(function(i){return '<li><b>'+esc(i.institution||'—')+'</b><span>'+esc([i.name,i.tel,i.mail].filter(Boolean).join(' · '))+'</span></li>';}).join('')+'</ul>':'<p class="ar-leise">Keine Angaben.</p>','intervenants',r);
  var c=f.cdse||{};
  h+=fkarte('Maßnahmen des CDSE','Prise en charge spécialisée',
    '<ul class="ar-massn">'+F_MASSN.map(function(m){var x=c[m[0]]||{};if(!x.aktiv&&fleer(x)){return '';}
      return '<li class="'+(x.aktiv?'an':'aus')+'"><span class="ar-massn-punkt" aria-hidden="true"></span><div><b>'+esc(m[1])+(x.standort?' · '+esc(x.standort):'')+'</b>'+
        '<small>'+esc([x.aktiv?'laufend':'nicht angekreuzt',x.name?'Intervenant·e: '+x.name:'',massnahmeZeit(x),[x.tel,x.mail].filter(Boolean).join(' · ')].filter(Boolean).join(' · '))+'</small>'+
        (m[0]==='cst'&&!fleer(x.responsable)?'<small>Responsable CST: '+esc(kontaktText(x.responsable))+'</small>':'')+
        (m[0]==='cst'&&!fleer(x.referent)?'<small>Personne de référence CDSE: '+esc(kontaktText(x.referent))+'</small>':'')+'</div></li>';}).join('')+
      (c.cloture&&!fleer(c.cloture)?'<li class="aus"><span class="ar-massn-punkt" aria-hidden="true"></span><div><b>Clôture du dossier</b><small>'+esc([c.cloture.von,c.cloture.bis,c.cloture.name].filter(Boolean).join(' · '))+'</small></div></li>':'')+
      ohneLeere(c.sonstige).map(function(s){return '<li class="aus"><span class="ar-massn-punkt" aria-hidden="true"></span><div><b>'+esc(s.label||'Weitere Angabe')+'</b><small>'+esc([s.name,s.von,s.bis].filter(Boolean).join(' · '))+'</small></div></li>';}).join('')+'</ul>'+
    (!ueber.length&&fleer(c)?'<p class="ar-leise">Keine Maßnahme eingetragen.</p>':''),'cdse',r);
  h+='</div>';
  /* Responsables: was aus dieser Fiche in der Datenbank steht und was dort noch fehlt */
  if(T.istResponsable()&&window.CDSE_DATENBANK&&window.CDSE_DATENBANK.ficheKarte){h+=window.CDSE_DATENBANK.ficheKarte(d,r);}
  return h;
}
/* ---------- Abschnitte bearbeiten ---------- */
function kontaktFelder(pfad,k,rollen){
  k=k||{};
  return '<div class="ar-kontakt">'+(rollen?'<label class="ar-feld"><span>Rolle</span><input name="'+pfad+'.rolle" list="ar-rollen-'+esc(rollen)+'" value="'+esc(k.rolle||'')+'" autocomplete="off"></label>':'')+
    feld(pfad+'.name','Name',k.name)+feld(pfad+'.adresse','Adresse',k.adresse)+feld(pfad+'.tel','Telefon',k.tel,'tel')+feld(pfad+'.mail','E-Mail',k.mail,'email')+'</div>';
}
function werteZuObjekt(werte,praefix){
  var o={};
  Object.keys(werte).forEach(function(k){if(k.indexOf(praefix+'.')!==0){return;}var v=werte[k];fsetz(o,k.slice(praefix.length+1),typeof v==='string'?v.trim():v);});
  return o;
}
function ficheTeilDialog(d,teil){
  var p=d.person||{}, f=d.fiche||{}, titel='', inhalt='', breit=true;
  if(teil==='person'){
    titel='Schüler·in (Données de l’élève)';
    inhalt='<div class="ar-raster2">'+feld('p.nachname','Nachname',p.nachname,'text',' required')+feld('p.vorname','Vorname',p.vorname,'text',' required')+
      feld('p.geburtsdatum','Geburtsdatum',p.geburtsdatum,'date')+auswahl('p.geschlecht','Geschlecht',p.geschlecht||'',[['m','männlich'],['w','weiblich']],'–')+
      feld('p.matricule','Matricule',p.matricule)+feld('f.mfiles','Dossier M-Files',f.mfiles)+feld('f.iam','Identité IAM',f.iam)+feld('f.geburtsort','Geburtsort',f.geburtsort)+
      feld('f.strasse','Numéro, rue',f.strasse)+feld('f.ort','Code, localité',f.ort)+feld('f.nationalitaet','Nationalität',f.nationalitaet)+feld('f.ersteSprache','Erstsprache (Première langue)',f.ersteSprache)+
      feld('f.migration','Migrationskontext',f.migration)+feld('f.ankunft','Ankunft in Luxemburg',f.ankunft,'date')+feld('f.datum','Datum der Fiche',f.datum||heuteIso(),'date')+'</div>';
  }else if(teil==='vertreter'){
    titel='Erziehungsberechtigte (Représentant·e·s légaux·ales)';
    var v=(f.vertreter||[]).slice();while(v.length<2){v.push({});}
    inhalt=v.map(function(x,i){return '<fieldset class="ar-fset"><legend>Person '+(i+1)+'</legend><label class="ar-haken"><input type="checkbox" name="f.vertreter.'+i+'.autoritaet"'+(x.autoritaet?' checked':'')+'> autorité parentale</label><div class="ar-raster2">'+
      feld('f.vertreter.'+i+'.name','Nom et prénom',x.name)+feld('f.vertreter.'+i+'.funktion','Fonction (z. B. Mère, Père, Tuteur)',x.funktion)+feld('f.vertreter.'+i+'.strasse','Numéro, rue',x.strasse)+feld('f.vertreter.'+i+'.ort','Code, localité',x.ort)+
      feld('f.vertreter.'+i+'.tel','Téléphone',x.tel,'tel')+feld('f.vertreter.'+i+'.mail','E-Mail',x.mail,'email')+'</div></fieldset>';}).join('')+
      textfeld('f.familie','Remarques (situation familiale)',f.familie,3);
  }else if(teil==='schule'){
    titel='Schule (Données scolaires)';
    var s=f.schule||{}, ef=f.ef||{}, es=f.es||{};
    function weitere(t,l){l=(l||[]).slice();while(l.length<3){l.push({});}return l.map(function(x,i){return kontaktFelder('f.'+t+'.weitere.'+i,x,t);}).join('');}
    inhalt='<datalist id="ar-rollen-ef">'+F_ROLLEN.ef.map(function(x){return '<option value="'+esc(x)+'">';}).join('')+'</datalist><datalist id="ar-rollen-es">'+F_ROLLEN.es.map(function(x){return '<option value="'+esc(x)+'">';}).join('')+'</datalist>'+
      '<div class="ar-raster2">'+feld('f.schule.name','École / Lycée',s.name||p.schule)+feld('f.schule.klasse','Classe actuelle',s.klasse||p.klasse)+feld('f.schule.strasse','Numéro, rue',s.strasse)+feld('f.schule.ort','Code, localité',s.ort)+'</div>'+
      '<details class="ar-fdetails" open><summary>Enseignement fondamental (EF)</summary>'+auswahl('f.ef.dr','Direction régionale (DR)',ef.dr||'',F_DR.map(function(x){return [x,x];}),'–')+
        '<h4>Pdr CI</h4>'+kontaktFelder('f.ef.pdr',ef.pdr)+'<h4>Titulaire de classe</h4>'+kontaktFelder('f.ef.titulaire',ef.titulaire)+'<h4>Weitere Personen (I-EBS, A-EBS, ESEB …)</h4>'+weitere('ef',ef.weitere)+
        '<h4>Maison Relais</h4>'+kontaktFelder('f.ef.maisonRelais',ef.maisonRelais)+'</details>'+
      '<details class="ar-fdetails"'+(fleer(es)?'':' open')+'><summary>Enseignement secondaire (ES)</summary><h4>Pdr CI</h4>'+kontaktFelder('f.es.pdr',es.pdr)+'<h4>Titulaire de classe</h4>'+kontaktFelder('f.es.titulaire',es.titulaire)+
        '<h4>Weitere Personen (ESEB, SePas, SSE …)</h4>'+weitere('es',es.weitere)+'</details>';
  }else if(teil==='progression'){
    titel='Schullaufbahn (Progression scolaire)';
    var pg=(f.progression||[]).slice();while(pg.length<12){pg.push('');}
    inhalt='<p class="ar-klein">Ein Feld je Schuljahr, vom ersten bis zum aktuellen.</p><datalist id="ar-klassen">'+F_KLASSEN.map(function(x){return '<option value="'+esc(x)+'">';}).join('')+'</datalist>'+
      '<div class="ar-laufbahn-felder">'+pg.map(function(x,i){return '<label class="ar-feld"><span>'+(i+1)+'. Jahr</span><input name="f.progression.'+i+'" list="ar-klassen" value="'+esc(x||'')+'" autocomplete="off"></label>';}).join('')+'</div>'+
      textfeld('f.progressionBemerkung','Remarques',f.progressionBemerkung,2);
  }else if(teil==='depistage'){
    titel='Dépistage';breit=false;
    var dp=f.depistage||{};
    inhalt='<div class="ar-raster2">'+feld('f.depistage.cl','CL',dp.cl)+feld('f.depistage.cdm','CDM',dp.cdm)+feld('f.depistage.cdv','CDV',dp.cdv)+feld('f.depistage.autres','Autres',dp.autres)+'</div>';
  }else if(teil==='intervenants'){
    titel='Weitere Fachpersonen (Autres intervenant·e·s)';
    var iv=(f.intervenants||[]).slice();iv.push({},{});while(iv.length<5){iv.push({});}
    inhalt='<p class="ar-klein">z. B. CPI, assistance en famille, SCAS, Maison Relais, pédiatre, neuropédiatre, pédopsychiatre, psychothérapeute. Leere Zeilen werden nicht gespeichert.</p>'+
      iv.map(function(x,i){return '<div class="ar-kontakt">'+feld('f.intervenants.'+i+'.institution','Institution / Fonction',x.institution)+feld('f.intervenants.'+i+'.name','Nom et prénom',x.name)+
        feld('f.intervenants.'+i+'.tel','Téléphone',x.tel,'tel')+feld('f.intervenants.'+i+'.mail','E-Mail',x.mail,'email')+'</div>';}).join('');
  }else if(teil==='cdse'){
    titel='Maßnahmen des CDSE (Prise en charge spécialisée)';
    var c=f.cdse||{};
    inhalt=F_MASSN.map(function(m){var x=c[m[0]]||{}, b='f.cdse.'+m[0];
      return '<fieldset class="ar-fset"><legend><label class="ar-haken"><input type="checkbox" name="'+b+'.aktiv"'+(x.aktiv?' checked':'')+'> '+esc(m[1])+'</label></legend><div class="ar-raster2">'+
        (m[0]==='cdp'?auswahl(b+'.standort','CdP (Direction régionale)',x.standort||'',F_DR.map(function(y){return [y,y];}),'–'):'')+
        (m[0]==='cst'?auswahl(b+'.standort','CST',x.standort||'',F_CST.map(function(y){return [y,y];}),'–'):'')+
        (m[0]==='atelier'?feld(b+'.standort','Quel atelier',x.standort):'')+
        (m[0]==='reeducation'?feld(b+'.standort','Type de rééducation',x.standort):'')+
        feld(b+'.name','Intervenant·e',x.name)+feld(b+'.tel','Téléphone',x.tel,'tel')+feld(b+'.mail','E-Mail',x.mail,'email')+feld(b+'.von','Début de la mesure',x.von,'date')+feld(b+'.bis','Fin de la mesure',x.bis,'date')+'</div>'+
        (m[0]==='cst'?'<h4>Responsable CST</h4>'+kontaktFelder(b+'.responsable',x.responsable)+'<h4>Personne de référence CDSE</h4>'+kontaktFelder(b+'.referent',x.referent):'')+'</fieldset>';}).join('');
  }else{return;}
  dialog(titel,inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:breit,
    pruefen:function(w){if(teil==='person'&&!(String(w.werte['p.nachname']).trim()&&String(w.werte['p.vorname']).trim())){return 'Vor- und Nachname fehlen.';}return '';},
    ausfuehren:function(w){
      /* aus den Formularwerten die Fiche-Teile bauen – einmal für die Eingabe, einmal für den Stand beim Öffnen:
         gespeichert wird nur, was sich dazwischen geändert hat */
      function bau(roh){
        var pn=werteZuObjekt(roh,'p'), fn=werteZuObjekt(roh,'f'), werte={fiche:{}};
        if(teil==='person'){werte.person=pn;Object.keys(fn).forEach(function(k){werte.fiche[k]=fn[k];});}
        else if(teil==='schule'){
          werte.fiche.schule=fn.schule||{};
          ['ef','es'].forEach(function(t){var x=fn[t]||{};x.weitere=ohneLeere(x.weitere);werte.fiche[t]=x;});
          werte.person={schule:(fn.schule||{}).name||'',klasse:(fn.schule||{}).klasse||''};
        }
        else if(teil==='vertreter'){werte.fiche.vertreter=(fn.vertreter||[]).map(function(x){return x||{};});werte.fiche.familie=fn.familie||'';}
        else if(teil==='progression'){var l=(fn.progression||[]).map(function(x){return x||'';});while(l.length&&!l[l.length-1]){l.pop();}werte.fiche.progression=l;werte.fiche.progressionBemerkung=fn.progressionBemerkung||'';}
        else if(teil==='intervenants'){werte.fiche.intervenants=ohneLeere(fn.intervenants);}
        else{werte.fiche[teil]=fn[teil]||{};}
        return werte;
      }
      return T.ops.fiche(d.id,bau(w.werte),'Fiche geändert: '+titel.replace(/ \(.*$/,''),bau(w.anfang||{}));
    }
  }).then(function(r){if(r.ergebnis){dossierNeu(r.ergebnis);toast('Gespeichert');}});
}

/* =====================================================================
   Datenbank (nur Responsables und Verwaltung): eigenes Modul CDSE_DATENBANK,
   liest dieselben verschlüsselten Dossiers – keine zweite Datenhaltung
   ===================================================================== */
function seiteDatenbank(param,neu){
  setzen('<div id="ar-db">'+laedt('Öffne die Datenbank …')+'</div>');
  bereichLaden(neu).then(function(z){
    var el=$('ar-db');if(!el){return;}
    if(z.art!=='bereit'){el.innerHTML=zustandsKarte(z);meinenCodeZeigen();return;}
    if(!T.istResponsable()){el.innerHTML=karte('<h2>Kein Zugang</h2><p>Die Datenbank ist nur für Responsables und die Verwaltung.</p>','ar-leer');return;}
    if(!window.CDSE_DATENBANK){el.innerHTML=karte('<h2>Datenbank fehlt</h2>'+hinweis('Das Modul der Datenbank ist in dieser Hub-Datei nicht enthalten.'),'ar-leer');return;}
    window.CDSE_DATENBANK.seite(el,param||'',!!neu);
  }).catch(function(e){var el=$('ar-db');if(el){el.innerHTML=zustandsKarte({art:'fehler',text:(e&&e.message)||String(e)});}});
}
function zuruecksetzen(){
  geladen=false;ladeVersprechen=null;aktDossier=null;letzteListe=null;teamDaten=null;planEntwurf=null;planDirty=false;akt={seite:'',param:''};
  eldibWahl=null;kurzCache={};fremdNeu=null;entwuerfe={};if(fremdTimer){clearInterval(fremdTimer);fremdTimer=null;}clearInterval(uhrTimer);setzen('');
  ['CDSE_SCREENING','CDSE_BEGLEITPLAN','CDSE_BERICHTE','CDSE_KOMPASS','CDSE_TAGESKARTE','CDSE_VERLAUF','CDSE_KINDMODUS','CDSE_DATENBANK','CDSE_FICHE','CDSE_KB_UEBERNAHME'].forEach(function(n){
    var m=window[n];if(m&&typeof m.vergessen==='function'){try{m.vergessen();}catch(e){}}
  });
  /* noch offene Formulare und Blätter schließen (z. B. nach dem Abmelden in einem anderen Tab) – ohne zu speichern */
  Array.prototype.forEach.call(document.querySelectorAll('dialog.ar-dialog,dialog.db-blatt'),function(dl){
    try{dl.dispatchEvent(new Event('cdse-schliessen'));}catch(e){}
    if(dl.open){try{dl.close();}catch(e){}}
    if(dl.isConnected){dl.remove();}
  });
  return T.vergessen();
}
/* Kleine Zusammenfassung für die Übersicht des Hubs */
function heuteKarte(){
  var me=K.ich();if(!me||!K.privatDa()){return Promise.resolve('');}   /* auf der Übersicht nie nach dem Passwort fragen */
  var plan=T.meinPlan().then(function(p){
    if(!p){return '<a class="ar-heute" href="#/einsatz">'+svg('uhr')+'<span><b>Mein Einsatzplan</b><small>Noch nicht eingetragen – wann bist du wo?</small></span></a>';}
    var s=planZu(p);return '<a class="ar-heute '+esc(s.art)+'" href="#/einsatz">'+svg('uhr')+'<span><b>Jetzt laut Plan</b><small>'+esc(statusText(s))+'</small></span></a>';
  }).catch(function(){return '';});
  return Promise.all([plan,faelligKarte()]).then(function(x){return x.join('');});
}
/* „Fällig diese Woche“: je Kind eine Zeile – nur eigene Fälle und eigene Fristen, nur aktive Dossiers.
   Ohne Passwortabfrage: fehlt der Schlüssel, bleibt die Karte weg. */
var FAELLIG_ZEILEN=6;
function plusTageIso(iso,n){var t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+n);return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());}
function faelligWann(f,h){
  if(f.status==='dringend'){return 'dringend';}
  if(f.faellig&&f.faellig<h){return 'seit '+datum(f.faellig).slice(0,6);}
  if(f.faellig===h||f.status==='faellig'){return 'heute';}
  var dt=new Date(f.faellig+'T12:00:00');return TAGE[dt.getDay()]+' '+datum(f.faellig).slice(0,6);
}
function faelligKarte(){
  var me=K.ich();if(!me||!window.CDSE_BEGLEITPLAN){return Promise.resolve('');}
  return bereichLaden(false,true).then(function(z){
    if(z.art!=='bereit'){return '';}
    return T.alleDossiers().then(function(l){
      var h=heuteIso(), bis=plusTageIso(h,7), zeilen=[], eigene=0;
      l.forEach(function(d){
        if(!d||!d.id||d.status==='inaktiv'){return;}
        var verantw=(d.verantwortlich||[]).indexOf(me.id)>=0, fuerMich=((d.begleitplan||{}).eigene||[]).some(function(x){return x&&x.wer===me.id&&x.status!=='erledigt';});
        if(!verantw&&!fuerMich){return;}
        eigene++;
        var f;try{f=window.CDSE_BEGLEITPLAN.faellig(d,me.id,bis);}catch(e){return;}
        if(f.length){zeilen.push({d:d,f:f});}
      });
      if(!eigene){return '';}
      if(!zeilen.length){return '<p class="ar-faellig-leer">'+svg('check')+'<span><b>Fällig diese Woche:</b> nichts – alles im Plan.</span></p>';}
      var RANG={dringend:0,faellig:1,offen:2};
      zeilen.sort(function(a,b){return (RANG[a.f[0].status]-RANG[b.f[0].status])||String(a.f[0].faellig||'9').localeCompare(String(b.f[0].faellig||'9'))||schuelerNameKurz(a.d.person).localeCompare(schuelerNameKurz(b.d.person),'de');});
      var n=zeilen.reduce(function(s,z){return s+z.f.length;},0);
      function zeile(z){
        var f=z.f[0], art=f.status==='dringend'?'dringend':((f.status==='faellig'||(f.faellig&&f.faellig<=h))?'faellig':'bald');
        return '<li><a class="ar-faellig-z '+art+'" href="#/schueler/'+encodeURIComponent(z.d.id)+'?tab=begleitplan" title="'+esc(z.f.map(function(x){return x.titel;}).join('\n'))+'">'+
          '<span class="ar-f-punkt" aria-hidden="true"></span><b class="ar-f-name">'+esc(schuelerNameKurz(z.d.person))+'</b>'+
          '<span class="ar-f-was">'+esc(f.titel)+(z.f.length>1?' <span class="ar-f-mehr">+'+(z.f.length-1)+'</span>':'')+'</span>'+
          '<span class="ar-f-wann">'+esc(faelligWann(f,h))+'</span></a></li>';
      }
      var vorn=zeilen.slice(0,FAELLIG_ZEILEN), rest=zeilen.slice(FAELLIG_ZEILEN);
      return '<section class="ar-faellig" aria-labelledby="ar-faellig-t"><header>'+svg('uhr')+'<h2 id="ar-faellig-t">Fällig diese Woche</h2><span class="ar-leise">'+
          zeilen.length+(zeilen.length===1?' Kind':' Kinder')+' · '+n+(n===1?' Schritt':' Schritte')+'</span></header>'+
        '<ul>'+vorn.map(zeile).join('')+'</ul>'+
        (rest.length?'<details><summary>'+rest.length+(rest.length===1?' weiteres Kind':' weitere Kinder')+'</summary><ul>'+rest.map(zeile).join('')+'</ul></details>':'')+'</section>';
    });
  }).catch(function(){return '';});
}

return {zeigen:zeigen, navHtml:navHtml, zuruecksetzen:zuruecksetzen, bereichLaden:bereichLaden, vorladen:vorladen, heuteKarte:heuteKarte, planZu:planZu,
  /* gemeinsame Bausteine für Zusatzmodule (Datenbank, Fiche) – gleiche Optik überall */
  neuLaden:function(){if(akt&&akt.seite){zeigen(akt.seite,akt.param,true);}},
  hilfen:{esc:esc, svg:svg, pad:pad, heuteIso:heuteIso, datum:datum, datumZeit:datumZeit, alter:alter, team:team, ava:ava, kname:kname,
    schuelerName:schuelerName, schuelerNameKurz:schuelerNameKurz, kopf:kopf, karte:karte, hinweis:hinweis, laedt:laedt, fehlerText:fehlerText,
    toast:toast, fehlerToast:fehlerToast, stelleChip:stelleChip, dialog:dialog, feld:feld, auswahl:auswahl, textfeld:textfeld, TEAMS:TEAMS,
    eldibKurz:function(d){return eldibKurz(d);}, dossierOeffnen:function(id,tab){if(tab){dossierTab=tab;naechsterTab=tab;}location.hash='#/schueler/'+encodeURIComponent(id);},
    aktDossier:function(){return aktDossier;}, dossierZeichnen:function(d){dossierNeu(d);},
    /* für Kompass, Begleitplan und Screening: ELDiB-Auswertung, DS, passende Arbeitsblätter, Vorfall-Minuten, Eintragsarten */
    eldibAuswertung:function(d){return bankDa()?eldibAuswertung(d):null;}, blaetterZuItem:blaetterZuItem, toolboxHref:toolboxHref,
    itemZu:function(c){return bankDa()?itemZu(c):null;}, vorfallMinuten:vorfallMinuten, ARTEN:ARTEN,
    dsStand:dsStand, blick:function(d){return aufEinenBlick(d);}, uebergabeHtml:uebergabeHtml}};
})();
