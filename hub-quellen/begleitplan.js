/* =====================================================================
   CDSE Hub — Begleitplan: Schritt für Schritt durch die Begleitung
   ---------------------------------------------------------------------
   Reiter „Begleitplan“ im Dossier. Der Hub leitet die Schritte jedes Mal
   neu aus dem Dossier ab – Fiche, DS, ELDiB, Screening, Kompass,
   Einträge, Vorfälle – mit Phase, Dringlichkeit, Fälligkeit, Grund und
   der passenden Aktion. „Als Nächstes“ zeigt den einen wichtigsten
   offenen Schritt. Das Team entscheidet: erledigt, später, passt nicht;
   dazu bis zu drei Fokusziele, eigene Schritte und Überprüfungen alle
   sechs Wochen. Gespeichert werden nur diese Entscheidungen
   (d.begleitplan, über die Operationen plan* in team.js).
   ===================================================================== */
window.CDSE_BEGLEITPLAN=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
var LERN_TITEL=@@LERN_TITEL@@;

var PHASEN=[['start','Ankommen','Grundlagen klären, Beziehung aufbauen'],['verstehen','Verstehen','Einschätzen, was das Kind braucht'],
  ['planen','Planen','Ziele und Umgang festlegen'],['umsetzen','Umsetzen','Im Alltag begleiten und beobachten'],['pruefen','Überprüfen','Alle sechs Wochen: Was hat sich verändert?']];
var PHASE_NR={sofort:-1};PHASEN.forEach(function(p,i){PHASE_NR[p[0]]=i;});
var STATUS_TEXT={dringend:'dringend',faellig:'fällig',offen:'offen',geplant:'geplant',spaeter:'später',erledigt:'erledigt',laufend:'läuft','passt-nicht':'passt nicht'};
var STATUS_RANG={dringend:0,faellig:1,offen:2};
var REVIEW_TAGE=42, ELTERN_TAGE=28, ZIEL_TAGE=14, SC_WDH=90, ELDIB_WDH=183, NACH_TAGE=3, VORLAUF=7;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function datum(i){return H?H.datum(i):i;}
/* Datum nach der Uhr dieses PCs (nicht UTC) */
function lokalIso(t){return t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);}
function heute(){return H?H.heuteIso():lokalIso(new Date());}
function tageSeit(iso){if(!iso){return 1e9;}var t=new Date(String(iso).slice(0,10)+'T12:00:00').getTime();return isNaN(t)?1e9:Math.floor((Date.now()-t)/864e5);}
function plusTage(iso,n){var t=new Date(String(iso||heute()).slice(0,10)+'T12:00:00');t.setDate(t.getDate()+n);return lokalIso(t);}
var FRIST_MAX=730, SPAETER_MAX=365;   /* Tippfehler wie „2062“ abfangen: Fristen höchstens zwei Jahre, „später“ höchstens ein Jahr voraus */
function vorname(d){return ((d&&d.person)||{}).vorname||'dem Kind';}
function fallverantwortliche(d){var l=((d&&d.verantwortlich)||[]).map(function(id){return H.kname(id);});return l.length?'die Fallverantwortlichen ('+l.join(', ')+')':'die Fallverantwortlichen';}
function iso(v){return String(v||'').slice(0,10);}

/* =====================================================================
   Schritte ableiten
   ===================================================================== */
function schritte(d,r){
  r=r||{};
  var bp=d.begleitplan||{}, L=[], h=heute(), ein=(d.eintraege||[]).filter(Boolean), S=window.CDSE_SCREENING, D=window.CDSE_DATENBANK, KO=window.CDSE_KOMPASS;
  var kl=null;try{kl=KO&&KO.lesen?KO.lesen(d):null;}catch(e){kl=null;}
  var A=null;try{A=H.eldibAuswertung?H.eldibAuswertung(d):null;}catch(e){A=null;}
  var st=(H.dsStand?H.dsStand(d):null)||{bewertungen:{}};
  var ds={};try{ds=D&&D.datensatz?D.datensatz(Object.assign({},d,{db:{},id:''})):{};}catch(e){ds={};}
  var vn=vorname(d), beginn=bp.start||iso(d.stelleSeit)||iso(d.erstellt)||h;
  function add(s){s.nr=L.length;s.prio=s.prio||3;L.push(s);}
  function daten(art,ab){return ein.filter(function(e){return e.art===art&&(!ab||iso(e.datum)>=ab);}).map(function(e){return iso(e.datum);}).sort();}
  function erster(l){return l.length?l[0]:'';}
  function letzter(l){return l.length?l[l.length-1]:'';}
  /* Wiederkehrend: letzter Termin = neuestes Datum aus den Daten oder „erledigt“ des Teams; fällig nach dem Abstand */
  function wieder(key,datenDatum,abstand,start){
    var e=(bp.schritte||{})[key], z=(e&&e.status==='erledigt')?iso(e.z):'', zuletzt=[datenDatum||'',z].sort().pop();
    return {zuletzt:zuletzt,faellig:plusTage(zuletzt||start||h,abstand),teamZuletzt:z&&z===zuletzt};
  }
  var planAktiv=!!(bp.start||bp.fokusSeit);
  function profilNamen(ids){return (kl?kl.profile:[]).filter(function(x){return ids.indexOf(x.id)>=0;}).map(function(x){return (x.art==='diagnose'||x.art==='verdacht')?x.def.name:(x.def.thema||x.def.name);});}

  /* ---------- Sofort: Warnsignale der letzten drei Monate ---------- */
  var warn90=[], warnLetzt='';   /* Datum des neuesten Warnsignals: Auslöser für den Krisenplan */
  if(S&&S.auswerten){
    (d.screenings||[]).filter(function(s){return tageSeit(s.datum)<=90;}).forEach(function(s){
      var e;try{e=S.auswerten(s);}catch(x){return;}
      e.warn.forEach(function(w){
        warn90.push(w.id);if(iso(s.datum)>warnLetzt){warnLetzt=iso(s.datum);}
        var kurz=((window.CDSE_KOMPASS_WISSEN||{}).warnKurz||{})[w.id]||w.text;
        add({key:'warn:'+s.id+':'+w.id,phase:'sofort',prio:1,titel:'Warnsignal vom '+datum(s.datum)+': '+kurz,warum:w.tun,aktion:{tab:'screening',text:'Zum Screening'}});
      });
    });
  }

  /* ---------- 1 Ankommen ---------- */
  add({key:'verantwortlich',phase:'start',titel:'Fallverantwortliche Person festlegen',
    warum:'Eine Person behält den Überblick, koordiniert die Schritte und ist Ansprechperson für Eltern und Netz.',
    auto:(d.verantwortlich||[]).length?'Fallverantwortlich: '+d.verantwortlich.map(H.kname).join(', '):'',
    aktion:r.weitergeben?{ar:'verantwortlich',text:'Festlegen'}:null});
  var fehlt=(D&&D.kernFehlt&&d.fiche)?D.kernFehlt(ds):[];
  add({key:'fiche',phase:'start',titel:'Fiche de renseignement vervollständigen',
    warum:!d.fiche?'Noch keine Fiche im Dossier: hochladen oder im Reiter „Fiche“ ausfüllen.':(fehlt.length?'Es fehlen noch: '+fehlt.map(function(f){return f.label;}).join(', ')+'.':''),
    auto:(d.fiche&&!fehlt.length)?'Alle Kernangaben sind da.':'',aktion:{tab:'fiche',text:'Zur Fiche'}});
  var elt=daten('gespraech_eltern');
  add({key:'eltern-erst',phase:'start',titel:'Erstes Gespräch mit den Eltern',
    warum:'Sicht und Anliegen der Eltern kennenlernen, die Begleitung erklären, das Einverständnis für den Austausch mit anderen Diensten klären.',
    auto:elt.length?'Gespräch am '+datum(erster(elt)):'',aktion:{tab:'eintraege',text:'Gespräch eintragen'},material:['elterngespraech-vorbereiten'],lernen:['elternarbeit']});
  var kin=daten('gespraech_kind'), kDs=Object.keys(st.bewertungen||{}).some(function(k){return /^k_/.test(k);});
  add({key:'kind-erst',phase:'start',titel:'Kennenlerngespräch mit '+vn,
    warum:'Die Sicht des Kindes: Was läuft gut, was ist schwer, was wünscht es sich? Das ist die Grundlage für gemeinsame Ziele.',
    auto:kin.length?'Gespräch am '+datum(erster(kin)):(kDs?'Im DS erfasst (Sicht des Kindes)':''),aktion:{tab:'eintraege',text:'Gespräch eintragen'},lernen:['gespraechsfuehrung','beziehung-haltung']});
  var dienste=(ds.dienste||[]).slice();if(ds.scas==='ja'&&dienste.join(' ').toUpperCase().indexOf('SCAS')<0){dienste.push('SCAS');}
  if(dienste.length){
    add({key:'netz',phase:'start',titel:'Helfernetz abstimmen: Wer macht was?',
      warum:'Beteiligt: '+dienste.join(', ')+'. Aufgaben absprechen, gemeinsame Ziele festhalten, Informationen nur mit Einverständnis der Eltern weitergeben.'});
  }

  /* ---------- 2 Verstehen ---------- */
  var hatDs=!!(d.profil&&d.profil.ds&&Object.keys(d.profil.ds.bewertungen||{}).length);
  add({key:'ds',phase:'verstehen',titel:'DS aus dem ELDiB-Generator übernehmen',
    warum:'Der DS bündelt die Sicht von Schule, Kind und Eltern und die eigene Beobachtung. Daraus entstehen Stärken, Schwierigkeiten, Vorschläge fürs Screening und der Kompass.',
    auto:hatDs?'DS vom '+datum(d.profil.datum):'',aktion:r.bearbeiten?{ar:'eldib-uebernehmen',text:'Übernehmen'}:null});
  add({key:'eldib',phase:'verstehen',titel:'ELDiB-Einschätzung',
    warum:'Die Entwicklungsstufe (ETEP) bestimmt, wie viel Führung von außen '+vn+' braucht – unabhängig vom Alter.',
    auto:A?'Einschätzung vom '+datum(A.e&&A.e.datum):'',aktion:{ar:'eldib-oeffnen',text:'Im ELDiB-Generator öffnen'},lernen:['etep']});
  var sc=(d.screenings||[]).filter(function(s){return tageSeit(s.datum)<=180;}), wer={};sc.forEach(function(s){wer[s.von]=1;});
  var nWer=Object.keys(wer).length, dsV=(S&&S.dsVorschlag&&r.bearbeiten)?S.dsVorschlag(d,'lehrkraft','GS'):null;
  add({key:'screening',phase:'verstehen',titel:'Screening von zwei Personen',
    warum:(nWer===1?'Bisher eine Einschätzung ('+H.kname(sc[0].von)+', '+datum(sc[0].datum)+'). Eine zweite Person sieht oft anderes – das ist wertvoll.':
      'Zwei unabhängige Einschätzungen (z. B. Lehrkraft und Éducateur) zeigen, wo und bei wem sich '+vn+' anders zeigt.')+
      (dsV&&dsV.n&&tageSeit(dsV.datum)<=92?' Aus dem DS sind schon '+dsV.n+' Aussagen vorausgefüllt.':''),
    auto:nWer>=2?nWer+' Personen haben eingeschätzt':'',aktion:{tab:'screening',text:'Zum Screening'}});
  if(kl&&(kl.klaeren.length||kl.offen.length)){
    add({key:'kompass-klaeren',phase:'verstehen',titel:'Profil im Kompass zuordnen',
      warum:kl.klaeren.map(function(k){return 'Im DS steht „'+k.name+'“';}).concat(kl.offen.map(function(o){return o.quelle+': „'+o.text+'“';})).join(' · ')+'. Erst mit der Zuordnung zeigt der Kompass die passenden Hinweise.',
      aktion:{tab:'kompass',text:'Zum Kompass'}});
  }
  var ls=(S&&S.letztes)?S.letztes(d):null;
  if(ls&&ls.e.gesamt.art==='planen'&&d.stelle!=='diagnostique'){
    add({key:'abklaerung:'+ls.s.id,phase:'verstehen',prio:2,titel:'Abklärung durch die Diagnostique besprechen',warum:ls.e.gesamt.text,aktion:{tab:'screening',text:'Screening ansehen'}});
  }

  /* ---------- 3 Planen ---------- */
  var fokus=(bp.fokus||[]).filter(Boolean);
  if(A){
    add({key:'fokus',phase:'planen',titel:'Bis zu drei Fokusziele wählen',
      warum:'Wenige Ziele, die alle kennen und konsequent verfolgen, wirken mehr als viele. '+(A.ziele.length?A.ziele.length+(A.ziele.length===1?' Förderziel':' Förderziele')+' aus der ELDiB stehen zur Auswahl.':'Vorschläge aus den nächsten Schritten der ELDiB stehen bereit.'),
      auto:fokus.length?'Fokus: '+fokus.join(', ')+(bp.fokusSeit?' (seit '+datum(bp.fokusSeit)+')':''):'',aktion:r.bearbeiten?{bp:'fokus',text:'Fokusziele wählen'}:null});
  }
  if(kl&&kl.profile.length){
    add({key:'umgang',phase:'planen',titel:'Umgang im Team absprechen',
      warum:'Der Kompass zeigt Umgang, Material und was eher schadet – für '+kl.profile.slice(0,3).map(function(x){return (x.art==='diagnose'||x.art==='verdacht')?x.def.name:(x.def.thema||x.def.name);}).join(', ')+'. Wenn alle gleich reagieren, gibt das Halt.',
      aktion:{tab:'kompass',text:'Zum Kompass'}});
  }
  var vorf90=ein.filter(function(e){return e.art==='vorfall'&&tageSeit(e.datum)<=90;}).length;
  var risiko=kl?profilNamen(['instabil','selbstverletzung']):[];
  if(warn90.length||vorf90>=2||risiko.length){
    var akut=warn90.some(function(w){return w==='suizid'||w==='selbstverletzung'||w==='gefahr';});
    /* neuSeit: Eine Entscheidung des Teams (erledigt, später, passt nicht) vor dem neuesten Warnsignal gilt
       nicht mehr – kommt Monate später ein neues Warnsignal, ist der Plan wieder offen und wird überprüft. */
    add({key:'krisenplan',phase:'planen',prio:akut?1:2,titel:'Krisen- und Sicherheitsplan erstellen',neuSeit:warnLetzt,
      warum:[warn90.length?'Warnsignal im Screening':'',vorf90>=2?vorf90+' Vorfälle in drei Monaten':'',risiko.length?'Kompass: '+risiko.join(', '):''].filter(Boolean).join(' · ')+
        '. Mit dem Kind (und den Eltern) festhalten: Frühwarnzeichen, was hilft, wer informiert wird. Bei Suizidgedanken mit Fachleuten.',
      material:['sicherheitsplan','nachgespraech-krise'],lernen:['deeskalation','selbstverletzung-suizid']});
  }
  var verst=kl?profilNamen(['adhs','sozialverhalten','regulation']):[], TK=window.CDSE_TAGESKARTE, tk=TK?TK.karteVon(d):null;
  if(verst.length){
    add({key:'verstaerker',phase:'planen',titel:'Verstärkerplan oder tägliche Rückmeldekarte einführen',
      warum:'Bei '+verst.join(', ')+' wirkt sofortige, häufige Rückmeldung besonders gut: ein bis drei klar beschriebene Ziele, schnelle Einlösung, Rückmeldung auch an die Eltern.',
      auto:tk?'Tageskarte seit '+datum(tk.start)+(tk.ende?' (beendet am '+datum(tk.ende)+')':''):'',
      aktion:(TK&&r.bearbeiten)?{tk:'einrichten',text:'Tageskarte einrichten'}:null,
      material:['punkteplan','check-in-check-out','belohnungs-menue'],lernen:['verstaerkung']});
  }
  if(fokus.length){
    var eltNach=daten('gespraech_eltern',bp.fokusSeit||'');
    add({key:'eltern-ziele',phase:'planen',titel:'Fokusziele und Umgang mit den Eltern besprechen',
      warum:'Gleiche Ziele und gleiche Worte zu Hause und in der Schule helfen '+vn+', das Neue zu üben.',
      auto:eltNach.length?'Gespräch am '+datum(erster(eltNach)):'',aktion:{tab:'eintraege',text:'Gespräch eintragen'},material:['elterngespraech-vorbereiten']});
  }
  if(d.stelle==='isa'){
    var sch=daten('gespraech_schule',beginn);
    add({key:'schule-absprache',phase:'planen',titel:'Absprache mit der Lehrkraft',
      warum:'Ziele, Umgang und Rückmeldewege mit der Klassenlehrkraft vereinbaren.',auto:sch.length?'Gespräch am '+datum(erster(sch)):'',aktion:{tab:'eintraege',text:'Gespräch eintragen'}});
  }

  /* ---------- 4 Umsetzen ---------- */
  fokus.forEach(function(code){
    var tkLast=TK?TK.zuletztFuerCode(d,code):'';
    var last=letzter(ein.filter(function(e){return e.ziel===code;}).map(function(e){return iso(e.datum);}).concat(tkLast?[tkLast]:[]).sort());
    var inf=H.itemZu?H.itemZu(code):null, z=A?A.ziele.filter(function(x){return x.code===code;})[0]:null;
    var frisch=last&&tageSeit(last)<=ZIEL_TAGE;
    add({key:'ziel:'+code,phase:'umsetzen',laufend:true,titel:'Fortschritt beobachten: '+code+(inf&&inf.it&&inf.it.keyword?' – '+inf.it.keyword:''),
      warum:(z&&z.text?'„'+z.text+'“ ':'')+(last?'Zuletzt beobachtet am '+datum(last)+'.':'Noch keine Beobachtung.')+' Eine kurze Notiz pro Woche reicht.',
      faellig:last?plusTage(last,ZIEL_TAGE):plusTage(bp.fokusSeit||h,VORLAUF),auto:frisch?'läuft – zuletzt am '+datum(last):'',
      aktion:r.bearbeiten?{ar:'ziel-eintrag',item:code,text:'Beobachtung eintragen'}:null});
  });
  ein.filter(function(e){return e.art==='vorfall'&&tageSeit(e.datum)<=30;}).forEach(function(e){
    var v=e.vorfall||{};
    add({key:'nachgespraech:'+e.id,phase:'umsetzen',prio:2,titel:'Nachgespräch zum Vorfall vom '+datum(e.datum),
      warum:'Was ist passiert, was hat geholfen, was machen wir beim nächsten Mal anders? Das Ergebnis im Vorfallprotokoll unter „Nachbesprechung“ festhalten.',
      faellig:plusTage(e.datum,NACH_TAGE),auto:String(v.nachbesprechung||'').trim()?'Nachbesprechung festgehalten':'',
      aktion:r.bearbeiten?{ar:'eintrag-aendern',eid:e.id,text:'Protokoll ergänzen'}:null,material:['nachgespraech-krise']});
  });
  if(kl&&kl.profile.length&&KO&&KO.blattFuer){
    var gesehen={}, bl=[];
    kl.profile.slice(0,3).forEach(function(x){(x.def.blaetter||[]).slice(0,2).forEach(function(id){var b=KO.blattFuer(id,kl.ctx.schulstufe);if(b&&!gesehen[b.id]){gesehen[b.id]=1;bl.push(b.id);}});});
    if(bl.length){add({key:'material',phase:'umsetzen',titel:'Passendes Material einsetzen',warum:'Aus dem Kompass, in der Fassung für '+(kl.ctx.schulstufe||'die Schulstufe')+'. Mehr Material steht im Kompass bei jedem Profil.',material:bl.slice(0,4)});}
  }
  if(tk&&!tk.ende){
    var tk14=TK.reihe(tk,plusTage(h,-13),h), tkS=TK.schnitt(tk14), tkZiel=tk.ziel||80, tkOk=tk14.filter(function(x){return x.erreicht;}).length;
    if(tk14.length>=8&&tkS<tkZiel-20){
      add({key:'tk-anpassen:'+plusTage(h,-(new Date(h+'T12:00:00').getDay()+6)%7),phase:'umsetzen',prio:2,titel:'Tageskarte anpassen: Ziele kleiner machen',
        warum:'In den letzten zwei Wochen im Schnitt '+tkS+' % – das Tagesziel ('+tkZiel+' %) wird selten erreicht. Erfolg ist der Motor der Karte: Ziele kleiner und klarer formulieren, kürzere Abschnitte wählen oder das Tagesziel vorübergehend senken. Prüfen, ob die Belohnung für '+vn+' wirklich attraktiv ist.',
        aktion:r.bearbeiten?{tk:'einrichten',text:'Tageskarte ändern'}:null,lernen:['verstaerkung']});
    }else if(tk14.length>=8&&tkOk>=Math.ceil(tk14.length*0.8)&&tageSeit(tk.start)>=28){
      add({key:'tk-ausschleichen',phase:'pruefen',titel:'Tageskarte schrittweise ausschleichen',
        warum:'Das Tagesziel wird an '+tkOk+' von '+tk14.length+' Tagen erreicht (im Schnitt '+tkS+' %). Jetzt den nächsten Schritt planen: '+vn+' schätzt sich zuerst selbst ein und vergleicht mit der Lehrkraft, dann Rückmeldung nur noch morgens und nachmittags, schließlich ohne Karte – mit Lob für das Erreichte.',
        aktion:r.bearbeiten?{tk:'einrichten',text:'Tageskarte ändern'}:null,lernen:['verstaerkung']});
    }
  }
  if(planAktiv||elt.length){
    var we=wieder('eltern-regel',letzter(elt),ELTERN_TAGE,bp.start||beginn);
    add({key:'eltern-regel',phase:'umsetzen',wiederkehrend:we,titel:'Austausch mit den Eltern',
      warum:'Etwa alle vier Wochen: Was läuft gut, was ist schwierig, was brauchen die Eltern?'+(we.zuletzt?' Zuletzt am '+datum(we.zuletzt)+'.':''),
      faellig:we.faellig,aktion:{tab:'eintraege',text:'Gespräch eintragen'}});
  }

  /* ---------- 5 Überprüfen ---------- */
  var revs=(bp.reviews||[]).map(function(v){return iso(v.datum);}).sort();
  if(planAktiv){
    var wr=wieder('review',letzter(revs),REVIEW_TAGE,bp.fokusSeit||bp.start);
    add({key:'review',phase:'pruefen',wiederkehrend:wr,titel:(revs.length?'Nächste Überprüfung':'Erste Überprüfung')+' (alle sechs Wochen)',
      warum:'Gemeinsam anschauen: Fokusziele, Vorfälle, Screening, Rückmeldungen von Kind und Eltern – und den Plan anpassen.'+(wr.zuletzt?' Letzte Überprüfung am '+datum(wr.zuletzt)+'.':''),
      faellig:wr.faellig,aktion:r.bearbeiten?{bp:'review',text:'Überprüfung eintragen'}:null});
  }else{
    add({key:'review',phase:'pruefen',titel:'Überprüfung alle sechs Wochen',warum:'Beginnt, sobald der Plan läuft – zum Beispiel mit den Fokuszielen.',ruht:true});
  }
  var scLast=letzter((d.screenings||[]).map(function(s){return iso(s.datum);}).sort());
  if(scLast){var ws=wieder('screening-wdh',scLast,SC_WDH);add({key:'screening-wdh',phase:'pruefen',wiederkehrend:ws,titel:'Screening wiederholen',warum:'Nach etwa drei Monaten zeigt ein neues Screening, was sich verändert hat. Letztes Screening: '+datum(scLast)+'.',faellig:ws.faellig,aktion:{tab:'screening',text:'Zum Screening'}});}
  if(A&&A.e&&A.e.datum){var wd=wieder('eldib-wdh',iso(A.e.datum),ELDIB_WDH);add({key:'eldib-wdh',phase:'pruefen',wiederkehrend:wd,titel:'ELDiB neu einschätzen',warum:'Nach etwa einem halben Jahr: Welche Items sind erreicht, welche Stufe ist jetzt dran? Letzte Einschätzung: '+datum(A.e.datum)+'.',faellig:wd.faellig,aktion:{ar:'eldib-oeffnen',text:'Im ELDiB-Generator öffnen'}});}

  /* ---------- Eigene Schritte ---------- */
  (bp.eigene||[]).forEach(function(x){
    add({key:'eigen:'+x.id,eigen:x,phase:PHASE_NR[x.phase]!=null&&x.phase!=='sofort'?x.phase:'umsetzen',titel:x.titel,warum:x.text||'',faellig:x.bis||'',wer:x.wer||'',
      auto:x.status==='erledigt'?'erledigt'+(x.erledigt?' am '+datum(iso(x.erledigt)):'')+(x.erledigtVon?' ('+H.kname(x.erledigtVon)+')':''):''});
  });

  /* ---------- Status ---------- */
  L.forEach(function(s){
    var e=(bp.schritte||{})[s.key];s.entscheidung=e||null;
    if(s.auto){s.status=s.laufend?'laufend':'erledigt';return;}
    if(s.ruht){s.status='geplant';return;}
    if(e&&!s.eigen&&s.neuSeit&&e.status&&iso(e.z)<s.neuSeit){
      /* vor dem neuesten Auslöser entschieden: wieder offen */
      s.ueberholt=true;s.warum='Neues Warnsignal am '+datum(s.neuSeit)+' – den Plan überprüfen und anpassen (zuletzt „'+(STATUS_TEXT[e.status]||e.status)+'“ am '+datum(iso(e.z))+'). '+s.warum;
      e=null;s.entscheidung=null;
    }
    if(e&&!s.eigen){
      if(e.status==='erledigt'&&!s.wiederkehrend){s.status='erledigt';return;}
      if(e.status==='passt-nicht'){s.status='passt-nicht';return;}
      if(e.status==='spaeter'&&(!e.bis||e.bis>h)){s.status='spaeter';return;}
    }
    if(s.wiederkehrend&&s.faellig>plusTage(h,VORLAUF)){s.status='geplant';return;}
    if(s.prio===1){s.status='dringend';return;}
    s.status=(s.faellig&&s.faellig<=h)?'faellig':'offen';
  });
  var offen=L.filter(function(s){return STATUS_RANG[s.status]!=null;}).sort(function(a,b){
    return (STATUS_RANG[a.status]-STATUS_RANG[b.status])||(PHASE_NR[a.phase]-PHASE_NR[b.phase])||(a.prio-b.prio)||(a.nr-b.nr);});
  var phasen={};PHASEN.forEach(function(p){phasen[p[0]]={gesamt:0,fertig:0,offen:0,termin:''};});
  L.forEach(function(s){var p=phasen[s.phase];if(!p||s.status==='passt-nicht'){return;}
    if(s.status==='geplant'){if(s.faellig&&(!p.termin||s.faellig<p.termin)){p.termin=s.faellig;}return;}p.gesamt++;if(s.status==='erledigt'||s.status==='laufend'){p.fertig++;}else if(s.status!=='spaeter'){p.offen++;}});
  var gesamt=0, fertig=0;Object.keys(phasen).forEach(function(k){gesamt+=phasen[k].gesamt;fertig+=phasen[k].fertig;});
  return {liste:L,naechster:offen[0]||null,offen:offen,phasen:phasen,gesamt:gesamt,fertig:fertig,fokus:fokus,A:A,kl:kl,bp:bp,
    dringend:offen.filter(function(s){return s.status==='dringend';}).length,faellig:offen.filter(function(s){return s.status==='faellig';}).length};
}

/* =====================================================================
   Darstellung
   ===================================================================== */
var STATUS_ICON={erledigt:'check',laufend:'check',dringend:'warn',faellig:'uhr',spaeter:'uhr',geplant:'cal',offen:'',"passt-nicht":'x'};
function statusPunkt(s){var ic=STATUS_ICON[s.status];return '<span class="bp-punkt '+s.status+'" title="'+esc(STATUS_TEXT[s.status])+'" aria-label="'+esc(STATUS_TEXT[s.status])+'">'+(ic?svg(ic):'')+'</span>';}
function blatt(id){var T0=window.CDSE_TOOLBOX_INDEX, bl=(T0&&Array.isArray(T0.blaetter))?T0.blaetter:[];return bl.filter(function(b){return b.id===id;})[0]||null;}
function links(s,kl){
  var st=kl&&kl.ctx?kl.ctx.schulstufe:'', KO=window.CDSE_KOMPASS, gesehen={};
  var bl=(s.material||[]).map(function(id){var b=(KO&&KO.blattFuer)?KO.blattFuer(id,st):blatt(id);return b;}).filter(function(b){if(!b||gesehen[b.id]){return false;}gesehen[b.id]=1;return true;});
  var lm=(s.lernen||[]).filter(function(id){return LERN_TITEL[id];});
  if(!bl.length&&!lm.length){return '';}
  return '<span class="bp-links">'+bl.map(function(b){return '<a href="apps/toolbox.html#blatt='+encodeURIComponent(b.id)+'" target="cdse-toolbox">'+svg('datei')+esc(b.titel)+'</a>';}).join('')+
    lm.map(function(id){return '<a href="apps/lernen.html#/modul/'+encodeURIComponent(id)+'" target="cdse-lernen">'+svg('buch')+esc(LERN_TITEL[id])+'</a>';}).join('')+'</span>';
}
function aktionKnopf(a,primaer,r){
  if(!a){return '';}
  if(a.tab==='eintraege'&&r&&!r.bearbeiten){return '';}   /* „Gespräch eintragen“ führte ohne Schreibrecht ins Leere */
  var kl='btn'+(primaer?' primary':'');
  if(a.tab){return '<button type="button" class="'+kl+'" data-tab="'+esc(a.tab)+'">'+esc(a.text)+'</button>';}
  if(a.ar){return '<button type="button" class="'+kl+'" data-ar="'+esc(a.ar)+'"'+(a.item?' data-item="'+esc(a.item)+'"':'')+(a.eid?' data-eid="'+esc(a.eid)+'"':'')+'>'+esc(a.text)+'</button>';}
  if(a.bp){return '<button type="button" class="'+kl+'" data-bp="'+esc(a.bp)+'">'+esc(a.text)+'</button>';}
  if(a.tk){return '<button type="button" class="'+kl+'" data-tk="'+esc(a.tk)+'">'+esc(a.text)+'</button>';}
  return '';
}
function meta(s){
  var e=s.entscheidung, t=[];
  if(s.status==='erledigt'||s.status==='laufend'){t.push(s.auto||('erledigt'+(e&&e.z?' am '+datum(iso(e.z)):'')+(e&&e.von?' ('+H.kname(e.von)+')':'')));}
  else if(s.status==='spaeter'){t.push('auf später gelegt'+(e.bis?' bis '+datum(e.bis):''));}
  else if(s.status==='passt-nicht'){t.push('passt nicht'+(e&&e.von?' ('+H.kname(e.von)+')':''));}
  else if(s.status==='geplant'){t.push(s.ruht?'beginnt später':(s.wiederkehrend&&s.wiederkehrend.zuletzt?'zuletzt am '+datum(s.wiederkehrend.zuletzt)+' · ':'')+'nächster Termin '+datum(s.faellig));}
  else if(s.faellig){t.push((s.faellig<heute()?'fällig seit ':(s.faellig===heute()?'fällig heute':'fällig am '))+(s.faellig===heute()?'':datum(s.faellig)));}
  if(s.wer){t.push('zuständig: '+H.kname(s.wer));}
  if(e&&e.notiz){t.push('„'+e.notiz+'“');}
  return t.length?'<span class="bp-meta">'+esc(t.join(' · '))+'</span>':'';
}
function entscheidKnoepfe(s,r){
  if(!r.bearbeiten){return '';}
  var k=esc(s.key), h='';
  if(s.eigen){
    h+=(s.status==='erledigt'?'<button type="button" class="ar-link" data-bp="eigen-offen" data-sid="'+esc(s.eigen.id)+'">Wieder offen</button>':'<button type="button" class="ar-link" data-bp="eigen-erledigt" data-sid="'+esc(s.eigen.id)+'">'+svg('check')+'Erledigt</button>')+
      '<button type="button" class="ar-link" data-bp="eigen-aendern" data-sid="'+esc(s.eigen.id)+'">Ändern</button>';
    return '<span class="bp-entscheid">'+h+'</span>';
  }
  if(s.auto){return '';}
  if(s.entscheidung&&(s.status==='erledigt'||s.status==='spaeter'||s.status==='passt-nicht')){return '<span class="bp-entscheid"><button type="button" class="ar-link" data-bp="offen" data-key="'+k+'">Wieder offen</button></span>';}
  if(s.status==='geplant'){return '';}
  return '<span class="bp-entscheid">'+(nurDialog(s)?'':'<button type="button" class="ar-link" data-bp="erledigt" data-key="'+k+'">'+svg('check')+'Erledigt</button>')+
    '<button type="button" class="ar-link" data-bp="spaeter" data-key="'+k+'">Später</button>'+
    (s.prio===1?'':'<button type="button" class="ar-link" data-bp="passt-nicht" data-key="'+k+'">Passt nicht</button>')+'</span>';
}
/* Laufende Beobachtung und Überprüfung werden über ihre Aktion erledigt, nicht per Haken */
function nurDialog(s){return !!(s.laufend||(s.aktion&&s.aktion.bp==='review'));}
function schrittHtml(s,r,kl){
  return '<li class="bp-schritt '+s.status+(s.prio===1?' wichtig':'')+'" data-key="'+esc(s.key)+'">'+statusPunkt(s)+
    '<div class="bp-text"><b>'+esc(s.titel)+'</b>'+(s.warum&&s.status!=='erledigt'?'<span class="bp-warum">'+esc(s.warum)+'</span>':'')+meta(s)+(s.status!=='erledigt'?links(s,kl):'')+'</div>'+
    '<div class="bp-akt">'+(s.status==='erledigt'||s.status==='passt-nicht'?'':aktionKnopf(s.aktion,false,r))+entscheidKnoepfe(s,r)+'</div></li>';
}
/* Offene Schritte zuerst, laufende danach; erledigte eingeklappt („Erledigt (n) anzeigen“) */
function schrittListe(l,r,kl){
  var auf=l.filter(function(s){return s.status!=='erledigt'&&s.status!=='laufend';}).concat(l.filter(function(s){return s.status==='laufend';}));
  var erl=l.filter(function(s){return s.status==='erledigt';});
  return (auf.length?'<ol class="bp-liste">'+auf.map(function(s){return schrittHtml(s,r,kl);}).join('')+'</ol>':'<p class="ar-leise">'+(erl.length?'Alles erledigt.':'Keine Schritte.')+'</p>')+
    (erl.length?'<details class="bp-erledigt"><summary>Erledigt ('+erl.length+') anzeigen</summary><ol class="bp-liste">'+erl.map(function(s){return schrittHtml(s,r,kl);}).join('')+'</ol></details>':'');
}

function tab(d,r){
  if(!bausteine()){return '<p>Der Begleitplan fehlt in dieser Hub-Datei.</p>';}
  var P=schritte(d,r), vn=vorname(d), h='<div class="bp" id="bp-plan">';
  /* Kopf mit Fortschritt und Phasen */
  var pz=P.gesamt?Math.round(P.fertig/P.gesamt*100):0;
  h+='<section class="ar-karte bp-kopf"><div class="ar-kartenkopf"><div><p class="overline">Begleitplan</p><h2>Schritt für Schritt mit '+esc(vn)+'</h2></div>'+
    '<span class="ar-knopfreihe keindruck">'+(r.bearbeiten?'<button class="btn" type="button" data-bp="eigen-neu" title="Eine Frist (z. B. Rückruf) oder einen eigenen Schritt eintragen">'+svg('plus')+'Frist oder Schritt</button>':'')+
    '<button class="btn" type="button" data-bp="drucken">'+svg('print')+'Drucken</button></span></div>'+
    '<div class="bp-fortschritt"><span class="bp-balken" aria-hidden="true"><span style="width:'+pz+'%"></span></span><span class="bp-zahlen"><b>'+P.fertig+' von '+P.gesamt+'</b> Schritten erledigt'+
      (P.dringend?' · <span class="bp-z-dringend">'+P.dringend+' dringend</span>':'')+(P.faellig?' · <span class="bp-z-faellig">'+P.faellig+' fällig</span>':'')+'</span></div>'+
    '<ol class="bp-phasen">'+PHASEN.map(function(p,i){var x=P.phasen[p[0]], fertig=x.gesamt&&x.fertig===x.gesamt;
      return '<li class="'+(fertig?'fertig':(x.offen?'offen':''))+'"><button type="button" data-bp="phase" data-phase="'+p[0]+'"><span class="bp-pnr">'+(fertig?svg('check'):(i+1))+'</span><span class="bp-ptext"><span class="bp-pname">'+esc(p[1])+'</span><span class="bp-pzahl">'+(x.gesamt?x.fertig+' von '+x.gesamt:(x.termin?'ab '+esc(datum(x.termin).slice(0,6)):'–'))+'</span></span></button></li>';}).join('')+'</ol></section>';
  /* Nur lesen: sagen, wer ein Schreibrecht geben kann (statt Knöpfe ohne Erklärung wegzulassen) */
  if(!r.bearbeiten){h+='<div class="keindruck">'+H.hinweis('Du kannst den Begleitplan lesen. Eintragen, abhaken und die Tageskarte führen dürfen die Zuständigen – frage '+esc(fallverantwortliche(d))+' nach einem Schreibrecht.','info')+'</div>';}
  /* Als Nächstes */
  var n=P.naechster;
  if(n){
    h+='<section class="ar-karte bp-naechster '+n.status+'"><p class="overline">Als Nächstes · '+esc(n.phase==='sofort'?'Sofort':PHASEN[PHASE_NR[n.phase]][1])+(n.status!=='offen'?' · '+esc(STATUS_TEXT[n.status]):'')+'</p>'+
      '<h3>'+esc(n.titel)+'</h3>'+(n.warum?'<p>'+esc(n.warum)+'</p>':'')+meta(n)+links(n,P.kl)+
      '<div class="ar-knopfreihe">'+aktionKnopf(n.aktion,true,r)+(r.bearbeiten&&!n.eigen&&!nurDialog(n)?'<button type="button" class="btn" data-bp="erledigt" data-key="'+esc(n.key)+'">'+svg('check')+'Erledigt</button>':'')+
        (r.bearbeiten&&n.eigen?'<button type="button" class="btn" data-bp="eigen-erledigt" data-sid="'+esc(n.eigen.id)+'">'+svg('check')+'Erledigt</button>':'')+
        (r.bearbeiten&&!n.eigen?'<button type="button" class="ar-link" data-bp="spaeter" data-key="'+esc(n.key)+'">Später</button>':'')+'</div></section>';
  }else{
    h+='<section class="ar-karte bp-naechster fertig"><p class="overline">Als Nächstes</p><h3>Im Moment ist nichts offen.</h3><p>Die nächsten Schritte erscheinen hier, sobald sie anstehen – zum Beispiel die nächste Überprüfung.</p></section>';
  }
  /* Sofort – direkt unter „Als Nächstes“, vor Fokuszielen, Tageskarte und Kindmodus */
  var sofort=P.liste.filter(function(s){return s.phase==='sofort';});
  if(sofort.length){h+='<section class="ar-karte bp-phase bp-sofort"><h3>'+svg('warn')+'Sofort</h3>'+schrittListe(sofort,r,P.kl)+'</section>';}
  /* Fokusziele */
  if(P.fokus.length){
    h+='<section class="ar-karte bp-fokus"><div class="ar-kartenkopf"><h3>Fokusziele'+(P.bp.fokusSeit?' <span class="ar-leise">seit '+esc(datum(P.bp.fokusSeit))+'</span>':'')+'</h3>'+(r.bearbeiten?'<button class="ar-link" type="button" data-bp="fokus">'+svg('edit')+'Ändern</button>':'')+'</div><ul>'+
      P.fokus.map(function(c){var z=P.A?P.A.ziele.filter(function(x){return x.code===c;})[0]:null, inf=H.itemZu?H.itemZu(c):null, erreicht=P.A&&P.A.e&&P.A.e.sel&&P.A.e.sel[c]==='e';
        return '<li><span class="bp-code">'+esc(c)+'</span><span>'+esc((z&&z.text)||(inf&&inf.it&&(inf.it.text||inf.it.keyword))||'')+'</span>'+(erreicht?'<span class="bp-erreicht">laut ELDiB erreicht</span>':'')+'</li>';}).join('')+'</ul>'+
      (window.CDSE_TAGESKARTE?window.CDSE_TAGESKARTE.fokusLink(d,r):'')+'</section>';
  }
  if(window.CDSE_TAGESKARTE){h+=window.CDSE_TAGESKARTE.karte(d,r);}
  if(window.CDSE_KINDMODUS){h+=window.CDSE_KINDMODUS.karte(d,r);}
  /* Phasen */
  PHASEN.forEach(function(p,i){
    var l=P.liste.filter(function(s){return s.phase===p[0]&&s.status!=='passt-nicht';});
    var x=P.phasen[p[0]];
    h+='<section class="ar-karte bp-phase" id="bp-phase-'+p[0]+'"><div class="bp-phasekopf"><h3><span class="bp-pnr">'+(i+1)+'</span>'+esc(p[1])+'</h3><span class="ar-leise">'+esc(p[2])+'</span><span class="bp-pzahl">'+(x.gesamt?x.fertig+' von '+x.gesamt:(x.termin?'nächster Termin '+esc(datum(x.termin)):''))+'</span></div>'+
      schrittListe(l,r,P.kl)+'</section>';
  });
  /* Überprüfungen */
  var revs=(P.bp.reviews||[]).slice().sort(function(a,b){return String(b.datum).localeCompare(String(a.datum));});
  if(revs.length){
    h+='<section class="ar-karte bp-reviews"><h3>Überprüfungen</h3><ol>'+revs.map(function(v){var k=v.kennzahlen||{};
      return '<li><b>'+esc(datum(v.datum))+'</b> <span class="ar-leise">'+esc(H.kname(v.von))+'</span>'+(v.notiz?'<p>'+esc(v.notiz).replace(/\n/g,'<br>')+'</p>':'')+
        (Object.keys(k).length?'<span class="bp-kz">'+kennzahlenText(k).map(esc).join(' · ')+'</span>':'')+'</li>';}).join('')+'</ol></section>';
  }
  /* Passt nicht */
  var weg=P.liste.filter(function(s){return s.status==='passt-nicht';});
  if(weg.length){h+='<details class="ar-karte bp-weg keindruck"><summary><h3>Passt nicht ('+weg.length+')</h3></summary><ol class="bp-liste">'+weg.map(function(s){return schrittHtml(s,r,P.kl);}).join('')+'</ol></details>';}
  h+='<details class="ar-karte bp-wie keindruck"><summary><h3>Wie der Begleitplan arbeitet</h3></summary><p>Der Hub leitet die Schritte jedes Mal neu aus dem Dossier ab: Fiche, DS, ELDiB, Screening, Kompass, Einträge und Vorfälle. Was sich aus den Daten ablesen lässt, hakt er selbst ab – zum Beispiel ein Elterngespräch, sobald es als Eintrag im Dossier steht. Wiederkehrende Schritte (Austausch mit den Eltern, Überprüfung alle sechs Wochen, Screening und ELDiB wiederholen) erscheinen rechtzeitig vor dem Termin.</p><p>„Als Nächstes“ zeigt immer den wichtigsten offenen Schritt: zuerst Dringendes, dann Fälliges, dann in der Reihenfolge der Phasen. Was nicht passt, lässt sich wegklicken; jede Entscheidung steht im Protokoll.</p></details>';
  return h+'</div>';
}
function kennzahlenText(k){
  var t=[];
  if(k.vorfaelle!=null){t.push(k.vorfaelle+(k.vorfaelle===1?' Vorfall':' Vorfälle'));}
  if(k.timeout){t.push(k.timeout+' Min. Time-out');}
  if(k.beobachtungen!=null){t.push(k.beobachtungen+(k.beobachtungen===1?' Beobachtung':' Beobachtungen')+' zu den Fokuszielen');}
  if(k.erreicht&&k.erreicht.length){t.push('erreicht: '+k.erreicht.join(', '));}
  if(k.screening){t.push('Screening: '+k.screening);}
  if(k.tageskarte){t.push('Tageskarte: im Schnitt '+k.tageskarte.schnitt+' % an '+k.tageskarte.tage+(k.tageskarte.tage===1?' Tag':' Tagen')+' (Tagesziel an '+k.tageskarte.erreicht+' erreicht)');}
  if(k.kindmodus&&window.CDSE_KINDMODUS){var km=window.CDSE_KINDMODUS.kennzahlText(k.kindmodus);if(km){t.push(km);}}
  return t;
}
/* Kennzahlen seit der letzten Überprüfung (oder dem Beginn) */
function kennzahlen(d,P){
  /* seit der letzten Überprüfung (ohne ihren Tag) bzw. seit dem Start des Plans (mit dem Starttag) */
  var bp=d.begleitplan||{}, revs=(bp.reviews||[]).map(function(v){return iso(v.datum);}).sort(), nachRev=revs.length>0, ab=nachRev?revs[revs.length-1]:[bp.start||'',bp.fokusSeit||''].filter(Boolean).sort()[0]||'';
  function imZeitraum(dt){dt=iso(dt);return !ab||(nachRev?dt>ab:dt>=ab);}
  var ein=(d.eintraege||[]).filter(function(e){return e&&imZeitraum(e.datum);});
  var vf=ein.filter(function(e){return e.art==='vorfall';}), min=0;
  vf.forEach(function(e){var v=e.vorfall||{};if(H.vorfallMinuten&&v.timeoutVon&&v.timeoutBis){min+=H.vorfallMinuten(v.timeoutVon,v.timeoutBis)||0;}});
  var k={seit:ab||'',vorfaelle:vf.length,timeout:min,beobachtungen:ein.filter(function(e){return e.ziel&&P.fokus.indexOf(e.ziel)>=0;}).length};
  if(P.A&&P.A.e&&P.A.e.sel){k.erreicht=P.fokus.filter(function(c){return P.A.e.sel[c]==='e';});}
  var S=window.CDSE_SCREENING, ls=S&&S.letztes?S.letztes(d):null;
  if(ls&&imZeitraum(ls.s.datum)){k.screening=datum(ls.s.datum)+' – '+ls.e.gesamt.titel;}
  var TK=window.CDSE_TAGESKARTE, tk=TK?TK.karteVon(d):null;
  if(tk){var tl=TK.reihe(tk,'','').filter(function(x){return imZeitraum(x.datum);});if(tl.length){k.tageskarte={tage:tl.length,schnitt:TK.schnitt(tl),erreicht:tl.filter(function(x){return x.erreicht;}).length};}}
  var KM=window.CDSE_KINDMODUS, kmz=KM?KM.kennzahlen(d,imZeitraum):null;if(kmz){k.kindmodus=kmz;}
  return k;
}

/* ---------- Kurzfassung für den Überblick ---------- */
function kurzKarte(d,r){
  if(!bausteine()){return '';}
  var P;try{P=schritte(d,r||{});}catch(e){return '';}
  var n=P.naechster;
  return '<div class="ar-karte bp-kurzkarte'+(n?' '+n.status:'')+'"><div class="ar-kartenkopf"><h2>Begleitplan</h2><button class="ar-link" type="button" data-tab="begleitplan">Zum Begleitplan'+svg('right')+'</button></div>'+
    '<div class="bp-fortschritt"><span class="bp-balken" aria-hidden="true"><span style="width:'+(P.gesamt?Math.round(P.fertig/P.gesamt*100):0)+'%"></span></span><span class="bp-zahlen"><b>'+P.fertig+' von '+P.gesamt+'</b> erledigt'+
      (P.dringend?' · <span class="bp-z-dringend">'+P.dringend+' dringend</span>':'')+(P.faellig?' · <span class="bp-z-faellig">'+P.faellig+' fällig</span>':'')+'</span></div>'+
    (n?'<p class="bp-kurz-naechst"><span class="ar-leise">Als Nächstes:</span> <b>'+esc(n.titel)+'</b></p>':'<p class="ar-leise">Im Moment ist nichts offen.</p>')+
    (window.CDSE_TAGESKARTE&&window.CDSE_TAGESKARTE.kurz(d)?'<p class="bp-kurz-tk">'+esc(window.CDSE_TAGESKARTE.kurz(d))+'</p>':'')+
    (window.CDSE_KINDMODUS&&window.CDSE_KINDMODUS.kurz(d)?'<p class="bp-kurz-km">'+esc(window.CDSE_KINDMODUS.kurz(d))+'</p>':'')+
    (window.CDSE_VERLAUF&&window.CDSE_VERLAUF.kurz(d)?'<p class="bp-kurz-verlauf">'+esc(window.CDSE_VERLAUF.kurz(d))+' · <button class="ar-link" type="button" data-tab="profil">Verlauf ansehen</button></p>':'')+'</div>';
}

/* ---------- Für die Startseite: was bei diesem Kind bis zum Stichtag ansteht ----------
   Fallverantwortliche sehen die Schritte des Plans und Fristen ohne Zuständige;
   Fristen mit einer zuständigen Person sieht nur diese Person. */
function faellig(d,meId,bis){
  var P=schritte(d,{}), verantw=(d.verantwortlich||[]).indexOf(meId)>=0, l=[];
  P.liste.forEach(function(s){
    if(STATUS_RANG[s.status]==null){return;}
    var wer=s.eigen?String(s.eigen.wer||''):'';
    if(wer?wer!==meId:!verantw){return;}
    if(s.status==='offen'&&!(s.faellig&&s.faellig<=bis)){return;}
    /* Auf der Startseite ohne Inhalt des Warnsignals – Einzelheiten stehen im Dossier */
    var titel=/^warn:/.test(s.key)?s.titel.replace(/:.*$/,'')+' – bitte ansehen':s.titel;
    l.push({key:s.key,titel:titel,status:s.status,faellig:s.faellig||''});
  });
  return l.sort(function(a,b){return (STATUS_RANG[a.status]-STATUS_RANG[b.status])||String(a.faellig||'9').localeCompare(String(b.faellig||'9'));});
}

/* ---------- Teil fürs Übergabeblatt ---------- */
function druckTeil(d){
  if(!bausteine()){return '';}
  var P;try{P=schritte(d,{});}catch(e){return '';}
  if(!P.gesamt){return '';}
  var offen=P.offen.slice(0,8), revs=((P.bp.reviews)||[]).slice().sort(function(a,b){return String(b.datum).localeCompare(String(a.datum));}), rv=revs[0];
  return '<h2>Begleitplan</h2><p>'+P.fertig+' von '+P.gesamt+' Schritten erledigt.'+(P.naechster?' Als Nächstes: <b>'+esc(P.naechster.titel)+'</b>.':'')+'</p>'+
    (window.CDSE_TAGESKARTE&&window.CDSE_TAGESKARTE.kurz(d)?'<p>'+esc(window.CDSE_TAGESKARTE.kurz(d))+'.</p>':'')+
    (window.CDSE_KINDMODUS&&window.CDSE_KINDMODUS.kurz(d)?'<p>'+esc(window.CDSE_KINDMODUS.kurz(d))+'.</p>':'')+
    (P.fokus.length?'<h3>Fokusziele</h3><ul>'+P.fokus.map(function(c){var z=P.A?P.A.ziele.filter(function(x){return x.code===c;})[0]:null;return '<li><b>'+esc(c)+'</b>'+(z&&z.text?' – '+esc(z.text):'')+'</li>';}).join('')+'</ul>':'')+
    (offen.length?'<h3>Offene Schritte</h3><ul>'+offen.map(function(s){return '<li>'+esc(s.titel)+(s.status==='dringend'?' <small>(dringend)</small>':(s.faellig?' <small>(fällig '+esc(datum(s.faellig))+')</small>':''))+'</li>';}).join('')+'</ul>':'')+
    (rv?'<h3>Letzte Überprüfung ('+esc(datum(rv.datum))+')</h3><p>'+esc(rv.notiz||'').replace(/\n/g,'<br>')+'</p>':'');
}

/* =====================================================================
   Aktionen
   ===================================================================== */
function aktuell(){var d=H&&H.aktDossier&&H.aktDossier();return d||null;}
/* knopf: der geklickte Knopf – nach einem Fehler wieder frei, die Meldung bleibt sichtbar */
function fertig(p,meldung,knopf){
  return p.then(function(neu){if(neu){H.dossierZeichnen(neu);}H.toast(meldung);return neu;},function(e){
    var t=(e&&e.message)||String(e);
    if(knopf){knopf.disabled=false;}
    H.dialog('Nicht gespeichert','<p>'+esc(t)+'</p><p class="ar-leise">Bitte noch einmal versuchen. Bleibt der Fehler, das Dossier neu öffnen (F5).</p>',[{text:'Schließen',wert:'',primaer:true}]);
  });
}
function schrittVon(d,key){var P=schritte(d,T.rechte(d));return P.liste.filter(function(s){return s.key===key;})[0]||null;}
function spaeterDialog(d,s){
  H.dialog('Auf später legen','<p><b>'+esc(s.titel)+'</b></p><div class="ar-raster2">'+H.feld('bis','Wieder zeigen am',plusTage(heute(),14),'date',' min="'+plusTage(heute(),1)+'" max="'+plusTage(heute(),SPAETER_MAX)+'"')+'</div>'+H.feld('notiz','Notiz (optional)','','text',' maxlength="200"'),
    [{text:'Abbrechen',wert:''},{text:'Später',wert:'ok',primaer:true}],
    {pruefen:function(w){return !(w.werte.bis&&w.werte.bis>heute())?'Bitte ein Datum in der Zukunft wählen.':(w.werte.bis>plusTage(heute(),SPAETER_MAX)?'Bitte ein Datum innerhalb eines Jahres wählen.':'');},
     ausfuehren:function(w){return T.ops.planSchritt(d.id,s.key,{status:'spaeter',bis:w.werte.bis,notiz:w.werte.notiz,titel:s.titel});}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Auf später gelegt');}});
}
function passtNichtDialog(d,s){
  H.dialog('Passt nicht','<p><b>'+esc(s.titel)+'</b> passt für '+esc(vorname(d))+' nicht? Der Schritt wandert nach unten unter „Passt nicht“ und lässt sich dort wieder öffnen.</p>'+H.feld('notiz','Warum? (optional)','','text',' maxlength="200"'),
    [{text:'Abbrechen',wert:''},{text:'Passt nicht',wert:'ok',primaer:true}],
    {ausfuehren:function(w){return T.ops.planSchritt(d.id,s.key,{status:'passt-nicht',notiz:w.werte.notiz,titel:s.titel});}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Verschoben nach „Passt nicht“');}});
}
function fokusDialog(d){
  var A=H.eldibAuswertung?H.eldibAuswertung(d):null;if(!A){H.toast('Zuerst eine ELDiB-Einschätzung übernehmen.');return;}
  var bp=d.begleitplan||{}, alt=bp.fokus||[], gesehen={}, gruppen=[];
  var ziele=A.ziele.map(function(z){gesehen[z.code]=1;return {code:z.code,text:z.text,info:z.ueber?'für das Alter überfällig':''};});
  if(ziele.length){gruppen.push(['Förderziele (PEI) aus der ELDiB',ziele]);}
  var kand=[];(A.naechste||[]).forEach(function(n){n.items.forEach(function(x){if(gesehen[x.code]){return;}gesehen[x.code]=1;kand.push({code:x.code,text:x.it.text||x.it.keyword||'',info:n.bereich.name+', Stufe '+x.stufe+(x.nicht?' – noch nicht erreicht':'')});});});
  if(kand.length){gruppen.push(['Nächste Schritte laut ELDiB',kand]);}
  alt.forEach(function(c){if(!gesehen[c]){gruppen.unshift(['Bisheriger Fokus',[{code:c,text:'',info:''}]]);gesehen[c]=1;}});
  if(!gruppen.length){H.toast('Die ELDiB enthält noch keine Ziele.');return;}
  var inhalt='<p>Wähle höchstens drei Ziele, auf die sich alle in den nächsten Wochen konzentrieren. Die übrigen Förderziele bleiben in der ELDiB erhalten.</p>'+
    gruppen.map(function(g){return '<fieldset class="bp-wahl"><legend>'+esc(g[0])+'</legend>'+g[1].map(function(z){
      return '<label><input type="checkbox" name="z-'+esc(z.code)+'" value="'+esc(z.code)+'"'+(alt.indexOf(z.code)>=0?' checked':'')+'><span class="bp-code">'+esc(z.code)+'</span><span>'+esc(z.text)+(z.info?' <small>'+esc(z.info)+'</small>':'')+'</span></label>';}).join('')+'</fieldset>';}).join('');
  H.dialog('Fokusziele wählen',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){var n=Object.keys(w.werte).filter(function(k){return /^z-/.test(k)&&w.werte[k];}).length;return n>3?'Bitte höchstens drei Ziele wählen (gewählt: '+n+').':'';},
    ausfuehren:function(w){var l=Object.keys(w.werte).filter(function(k){return /^z-/.test(k)&&w.werte[k];}).map(function(k){return k.slice(2);});return T.ops.planFokus(d.id,l);}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Fokusziele gespeichert');}});
}
function reviewDialog(d){
  var P=schritte(d,T.rechte(d)), k=kennzahlen(d,P), kt=kennzahlenText(k);
  var inhalt='<p>Seit '+(k.seit?datum(k.seit):'Beginn')+':'+(kt.length?' '+esc(kt.join(' · ')):' noch keine Zahlen')+'.</p>'+
    '<div class="ar-raster2">'+H.feld('datum','Datum',heute(),'date',' max="'+heute()+'"')+'</div>'+
    H.textfeld('notiz','Was hat sich verändert? Was behalten wir bei, was passen wir an?','',6);
  H.dialog('Überprüfung eintragen',inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    /* eine Überprüfung in der Zukunft (Tippfehler) würde die nächste für Jahre verschieben */
    pruefen:function(w){if(w.werte.datum&&w.werte.datum>heute()){return 'Das Datum liegt in der Zukunft – bitte korrigieren.';}return String(w.werte.notiz||'').trim()?'':'Bitte kurz festhalten, was sich verändert hat.';},
    ausfuehren:function(w){return T.ops.planUeberpruefung(d.id,{datum:w.werte.datum||heute(),notiz:w.werte.notiz,kennzahlen:k});}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Überprüfung gespeichert – die nächste ist in sechs Wochen');}});
}
/* Häufige Fristen: ein Klick füllt „Was ist zu tun?“, Frist in einer Woche, zuständig ich */
var VORLAGEN=['Eltern zurückrufen','Lehrkraft kontaktieren','Helfernetz kontaktieren','PEI-Evaluation vorbereiten','Bericht schreiben','Réunion vorbereiten'];
/* „Zuständig“: alphabetisch, die Fallverantwortlichen des Dossiers zuerst */
function werAuswahl(d,wert){
  var fv=(d&&d.verantwortlich)||[], konten=(K.konten?K.konten():[]).filter(function(k){return k&&k.id;})
    .sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''),'de');});
  var oben=konten.filter(function(k){return fv.indexOf(k.id)>=0;}), rest=konten.filter(function(k){return fv.indexOf(k.id)<0;});
  function o(k){return '<option value="'+esc(k.id)+'"'+(k.id===wert?' selected':'')+'>'+esc(k.name)+'</option>';}
  var fremd=wert&&!konten.some(function(k){return k.id===wert;})?'<option value="'+esc(wert)+'" selected>'+esc(H.kname(wert))+'</option>':'';
  return '<label class="ar-feld"><span>Zuständig</span><select name="wer"><option value="">– offen –</option>'+fremd+
    (oben.length?'<optgroup label="Fallverantwortlich">'+oben.map(o).join('')+'</optgroup>'+(rest.length?'<optgroup label="Weitere">'+rest.map(o).join('')+'</optgroup>':''):rest.map(o).join(''))+'</select></label>';
}
function eigenerDialog(d,x){
  x=x||{};
  var me=(K.ich&&K.ich())||{}, bisMax=plusTage(heute(),FRIST_MAX);
  var inhalt=(x.id?'':'<div class="bp-vorlagen" role="group" aria-label="Häufige Fristen">'+VORLAGEN.map(function(v){return '<button type="button" class="catchip" data-vorlage="'+esc(v)+'">'+esc(v)+'</button>';}).join('')+'</div>')+
    H.feld('titel','Was ist zu tun?',x.titel||'','text',' maxlength="200"')+H.textfeld('text','Details (optional)',x.text||'',3)+
    '<div class="ar-raster3">'+H.auswahl('phase','Phase',x.phase||'umsetzen',PHASEN.map(function(p){return [p[0],p[1]];}))+
      werAuswahl(d,x.id?(x.wer||''):(me.id||''))+H.feld('bis','Bis wann? (optional)',x.bis||'','date',' max="'+bisMax+'"')+'</div>';
  H.dialog(x.id?'Schritt ändern':'Frist oder Schritt',inhalt,[{text:'Abbrechen',wert:''}].concat(x.id?[{text:'Löschen',wert:'loeschen',gefahr:true}]:[]).concat([{text:'Speichern',wert:'ok',primaer:true}]),{breit:true,
    nachAufbau:function(dlg){
      dlg.addEventListener('click',function(ev){
        var b=ev.target.closest&&ev.target.closest('[data-vorlage]');if(!b){return;}
        var f=dlg.querySelector('form');f.elements.titel.value=b.getAttribute('data-vorlage');
        if(!f.elements.bis.value){f.elements.bis.value=plusTage(heute(),7);}
        if(!f.elements.wer.value&&me.id){f.elements.wer.value=me.id;}
        Array.prototype.forEach.call(dlg.querySelectorAll('[data-vorlage]'),function(x){x.classList.toggle('on',x===b);});
        f.elements.titel.focus();
      });
    },
    pruefen:function(w){
      if(w.aktion==='loeschen'){return '';}
      if(!String(w.werte.titel||'').trim()){return 'Bitte angeben, was zu tun ist.';}
      return w.werte.bis&&w.werte.bis>bisMax?'Die Frist liegt mehr als zwei Jahre voraus – bitte das Datum prüfen.':'';
    },
    ausfuehren:function(w){
      if(w.aktion==='loeschen'){return T.ops.planEigenerLoeschen(d.id,x.id);}
      var v={titel:w.werte.titel,text:w.werte.text,phase:w.werte.phase,wer:w.werte.wer,bis:w.werte.bis};
      return x.id?T.ops.planEigenerAendern(d.id,x.id,v):T.ops.planEigener(d.id,v);
    }})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast(res.aktion==='loeschen'?'Schritt gelöscht':'Gespeichert');}});
}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-bp]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-bp'), key=t.getAttribute('data-key')||'', sid=t.getAttribute('data-sid')||'';
  var eigen=sid?((d.begleitplan||{}).eigene||[]).filter(function(x){return x.id===sid;})[0]:null;
  if(a==='phase'){var el=document.getElementById('bp-phase-'+t.getAttribute('data-phase'));if(el){el.scrollIntoView({block:'start',behavior:'smooth'});}return;}
  if(a==='drucken'){
    /* eingeklappte erledigte Schritte kommen mit aufs Papier */
    Array.prototype.forEach.call(document.querySelectorAll('#bp-plan details.bp-erledigt:not([open])'),function(x){x.open=true;x.setAttribute('data-bp-zu','1');});
    document.body.classList.add('bp-druck');setTimeout(function(){window.print();},50);return;
  }
  if(a==='fokus'){fokusDialog(d);return;}
  if(a==='review'){reviewDialog(d);return;}
  if(a==='eigen-neu'){eigenerDialog(d,null);return;}
  if(a==='eigen-aendern'&&eigen){eigenerDialog(d,eigen);return;}
  if(a==='eigen-erledigt'&&eigen){t.disabled=true;fertig(T.ops.planEigenerAendern(d.id,sid,{status:'erledigt'}),'Erledigt',t);return;}
  if(a==='eigen-offen'&&eigen){t.disabled=true;fertig(T.ops.planEigenerAendern(d.id,sid,{status:'offen'}),'Wieder offen',t);return;}
  var s=key?schrittVon(d,key):null;if(!s){return;}
  if(a==='erledigt'){t.disabled=true;fertig(T.ops.planSchritt(d.id,key,{status:'erledigt',titel:s.titel}),'Erledigt: '+s.titel,t);return;}
  if(a==='offen'){t.disabled=true;fertig(T.ops.planSchritt(d.id,key,{status:'',titel:s.titel}),'Wieder offen',t);return;}
  if(a==='spaeter'){spaeterDialog(d,s);return;}
  if(a==='passt-nicht'){passtNichtDialog(d,s);return;}
});
window.addEventListener('afterprint',function(){
  document.body.classList.remove('bp-druck');
  Array.prototype.forEach.call(document.querySelectorAll('#bp-plan details[data-bp-zu]'),function(x){x.open=false;x.removeAttribute('data-bp-zu');});
});

return {tab:tab, kurzKarte:kurzKarte, druckTeil:druckTeil, schritte:function(d,r){bausteine();return schritte(d,r);}, kennzahlen:function(d){bausteine();return kennzahlen(d,schritte(d,{}));},
  faellig:function(d,meId,bis){bausteine();return faellig(d,meId,bis);}};
})();
