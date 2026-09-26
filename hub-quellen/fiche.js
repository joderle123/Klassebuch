/* =====================================================================
   CDSE Hub — Fiche de renseignement: Word-Datei lesen und ausfüllen
   ---------------------------------------------------------------------
   Hochladen: Die .docx (ein ZIP-Archiv) wird im Browser entpackt – ohne
   Internet (DecompressionStream) –, das Word-XML gelesen und jede Angabe
   über ihre BESCHRIFTUNG gefunden, nicht über die Position. So lassen
   sich auch ältere Fassungen der Fiche (z. B. 25-26) lesen.
   Herunterladen: Die eingebettete leere Vorlage (Fiche 26-27) wird mit
   den Daten des Dossiers gefüllt – Textfelder, Auswahllisten, Ankreuz-
   und Datumsfelder – und als neue .docx gespeichert.
   Lesen und Schreiben benutzen dieselbe Zellen-Karte (karte()); was aus
   einer Zelle gelesen wird, wird beim Herunterladen genau dort wieder
   hineingeschrieben.
   ===================================================================== */
window.CDSE_FICHE=(function(){
'use strict';
var W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
var W14='http://schemas.microsoft.com/office/word/2010/wordml';
var XMLNS='http://www.w3.org/XML/1998/namespace';
var VORLAGE_B64='@@FICHE_VORLAGE_B64@@';
var DOCX_TYP='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
var PLATZHALTER=/^(choose an item|click or tap to enter a date|click or tap here to enter text|choisissez un élément|choisir un élément|cliquez ou appuyez ici pour entrer (du texte|une date)|wählen sie ein element aus|klicken oder tippen sie hier, um text einzugeben|klicken oder tippen sie, um ein datum einzugeben)\.?$/i;

/* ---------------- ZIP (docx) ---------------- */
function u16(b,o){return b[o]|(b[o+1]<<8);}
function u32(b,o){return (b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0;}
function inflate(bytes){
  var ds=new DecompressionStream('deflate-raw');
  return new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer().then(function(ab){return new Uint8Array(ab);});
}
function zipLesen(buf){
  var b=new Uint8Array(buf), e=-1;
  for(var i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(b,i)===0x06054b50){e=i;break;}}
  if(e<0){return Promise.reject(new Error('Das ist keine Word-Datei (.docx) – oder sie ist beschädigt.'));}
  var n=u16(b,e+10), off=u32(b,e+16), liste=[], td=new TextDecoder();
  for(var k=0;k<n;k++){
    if(u32(b,off)!==0x02014b50){return Promise.reject(new Error('Die Word-Datei ist beschädigt (Inhaltsverzeichnis).'));}
    var meth=u16(b,off+10), csize=u32(b,off+20), nl=u16(b,off+28), xl=u16(b,off+30), cl=u16(b,off+32), lho=u32(b,off+42);
    var name=td.decode(b.subarray(off+46,off+46+nl));
    var start=lho+30+u16(b,lho+26)+u16(b,lho+28);
    liste.push({name:name,meth:meth,daten:b.subarray(start,start+csize)});
    off+=46+nl+xl+cl;
  }
  return Promise.all(liste.map(function(f){
    if(f.meth===0){return {name:f.name,daten:f.daten};}
    if(f.meth===8){return inflate(f.daten).then(function(d){return {name:f.name,daten:d};});}
    throw new Error('Unbekanntes Packverfahren in der Word-Datei ('+f.name+').');
  }));
}
/* Reiner Text einer Word-Datei (für Berichte und Arztbriefe): Absätze durch Zeilenumbrüche getrennt */
function docxText(buf){
  return zipLesen(buf).then(function(dateien){
    var f=dateien.filter(function(x){return x.name==='word/document.xml';})[0];
    if(!f){throw new Error('Das ist keine Word-Datei (.docx).');}
    var doc=new DOMParser().parseFromString(new TextDecoder().decode(f.daten),'application/xml');
    var body=doc.getElementsByTagNameNS(W,'body')[0]||doc.documentElement;
    return textVon(body);
  });
}
var CRC=(function(){var t=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++){c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);}t[n]=c>>>0;}return t;})();
function crc32(b){var c=0xFFFFFFFF;for(var i=0;i<b.length;i++){c=CRC[(c^b[i])&255]^(c>>>8);}return (c^0xFFFFFFFF)>>>0;}
/* Einträge ungepackt (Methode 0) – gültig für Word, LibreOffice und Pages */
function zipSchreiben(dateien){
  var te=new TextEncoder(), teile=[], zentral=[], off=0, d=new Date();
  var zeit=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, tag=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  dateien.forEach(function(f){
    var n=te.encode(f.name), c=crc32(f.daten), l=new Uint8Array(30+n.length), v=new DataView(l.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint16(10,zeit,true);v.setUint16(12,tag,true);
    v.setUint32(14,c,true);v.setUint32(18,f.daten.length,true);v.setUint32(22,f.daten.length,true);v.setUint16(26,n.length,true);v.setUint16(28,0,true);l.set(n,30);
    var z=new Uint8Array(46+n.length), w=new DataView(z.buffer);
    w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x0800,true);w.setUint16(10,0,true);w.setUint16(12,zeit,true);w.setUint16(14,tag,true);
    w.setUint32(16,c,true);w.setUint32(20,f.daten.length,true);w.setUint32(24,f.daten.length,true);w.setUint16(28,n.length,true);w.setUint32(42,off,true);z.set(n,46);
    teile.push(l,f.daten);zentral.push(z);off+=l.length+f.daten.length;
  });
  var zl=zentral.reduce(function(a,z){return a+z.length;},0), e=new Uint8Array(22), ev=new DataView(e.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,dateien.length,true);ev.setUint16(10,dateien.length,true);ev.setUint32(12,zl,true);ev.setUint32(16,off,true);
  return new Blob(teile.concat(zentral,[e]),{type:DOCX_TYP});
}
function base64Bytes(s){var t=atob(s),b=new Uint8Array(t.length);for(var i=0;i<t.length;i++){b[i]=t.charCodeAt(i);}return b;}

/* ---------------- Word-XML: kleine Helfer ---------------- */
function kinder(el,name){var l=[];for(var c=el.firstChild;c;c=c.nextSibling){if(c.nodeType===1&&c.namespaceURI===W&&(!name||c.localName===name)){l.push(c);}}return l;}
function alle(el,name){return Array.prototype.slice.call(el.getElementsByTagNameNS(W,name));}
function wAttr(el,name){var v=el.getAttributeNS(W,name);return v==null||v===''?el.getAttribute('w:'+name):v;}
function neu(doc,name){return doc.createElementNS(W,'w:'+name);}
function norm(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[    ]/g,' ')
    .replace(/[·•∙]/g,'.').replace(/[’`´‘]/g,"'").replace(/[☐☒⊠]/g,' ').toLowerCase().replace(/\s+/g,' ').replace(/[\s:]+$/,'').trim();
}
/* Text eines Knotens; ohneSdt: Inhaltssteuerelemente auslassen (= reine Beschriftung) */
function textVon(el,ohneSdt){
  var s='';
  (function lauf(n){
    for(var c=n.firstChild;c;c=c.nextSibling){
      if(c.nodeType!==1){continue;}
      var ln=c.localName;
      if(ln==='sdt'&&ohneSdt){continue;}
      if(ln==='delText'||ln==='instrText'||ln==='sdtPr'||ln==='rPr'||ln==='pPr'||ln==='tcPr'||ln==='trPr'||ln==='tblPr'){continue;}
      if(ln==='t'){s+=c.textContent;}
      else if(ln==='tab'){s+=' ';}
      else if(ln==='br'||ln==='cr'){s+='\n';}
      else if(ln==='sym'){var ch=parseInt(wAttr(c,'char')||'0',16);if(ch===0xF0FE||ch===0xF078||ch===0xF0FD){s+='☒';}else if(ch===0xF0A8||ch===0xF06F){s+='☐';}}
      else if(ln==='p'){if(s&&!/\n$/.test(s)){s+='\n';}lauf(c);}
      else{lauf(c);}
    }
  })(el);
  return s.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function sdtInfo(sdt){
  var pr=kinder(sdt,'sdtPr')[0], inhalt=kinder(sdt,'sdtContent')[0], typ='text';
  if(pr){
    if(pr.getElementsByTagNameNS(W14,'checkbox').length){typ='checkbox';}
    else if(alle(pr,'dropDownList').length||alle(pr,'comboBox').length){typ='auswahl';}
    else if(alle(pr,'date').length){typ='datum';}
  }
  var platz=!!(pr&&alle(pr,'showingPlcHdr').length), t=inhalt?textVon(inhalt):'', wert=t;
  if(typ==='checkbox'){
    var cb=pr.getElementsByTagNameNS(W14,'checked')[0], v=cb?(cb.getAttributeNS(W14,'val')||cb.getAttribute('w14:val')):'';
    wert=cb?(v==='1'||v==='true'):/☒|⊠/.test(t);
  }else if(platz||PLATZHALTER.test(t.trim())){wert='';}
  else if(typ==='datum'){var d=alle(pr,'date')[0], fd=d?wAttr(d,'fullDate'):'';wert=(fd&&/^\d{4}-\d{2}-\d{2}/.test(fd))?fd.slice(0,10):(isoAus(t)||t);}
  var liste=pr?alle(pr,'listItem').map(function(li){return wAttr(li,'displayText')||wAttr(li,'value')||'';}):[];
  return {typ:typ,wert:wert,node:sdt,pr:pr,inhalt:inhalt,liste:liste};
}
function hatSdtVorfahr(el,bis){for(var p=el.parentNode;p&&p!==bis;p=p.parentNode){if(p.localName==='sdt'){return true;}}return false;}
function zelleLesen(tc){
  var tcPr=kinder(tc,'tcPr')[0], span=1, vm=null;
  if(tcPr){
    var gs=kinder(tcPr,'gridSpan')[0];if(gs){span=+wAttr(gs,'val')||1;}
    var v=kinder(tcPr,'vMerge')[0];if(v){vm=wAttr(v,'val')==='restart'?'restart':'continue';}
  }
  var sdts=alle(tc,'sdt').filter(function(s){return !hatSdtVorfahr(s,tc);}).map(sdtInfo);
  var fix=textVon(tc,true), text=textVon(tc);
  return {tc:tc,span:span,vm:vm,sdts:sdts,fix:fix,n:norm(fix),text:text,
    haken:sdts.some(function(s){return s.typ==='checkbox';})||/[☐☒⊠]/.test(fix)};
}
function tabelleLesen(tbl){
  var zeilen=[];
  kinder(tbl,'tr').forEach(function(tr){
    var pos=0, trPr=kinder(tr,'trPr')[0];
    if(trPr){var gb=kinder(trPr,'gridBefore')[0];if(gb){pos=+wAttr(gb,'val')||0;}}
    var zellen=[];
    /* Zellen können auch in einem Inhaltssteuerelement der Zeile stecken */
    kinder(tr).forEach(function(k){
      var tcs=k.localName==='tc'?[k]:(k.localName==='sdt'?alle(k,'tc'):[]);
      tcs.forEach(function(tc){
        var z=zelleLesen(tc);z.pos=pos;pos+=z.span;
        if(k.localName==='sdt'){var info=sdtInfo(k);info.umschliessend=true;z.sdts.unshift(info);if(info.typ==='checkbox'){z.haken=true;}}
        zellen.push(z);
      });
    });
    zeilen.push({tr:tr,zellen:zellen});
  });
  zeilen.forEach(function(z,i){
    z.zellen.forEach(function(c){
      if(c.vm!=='continue'){return;}
      for(var j=i-1;j>=0;j--){
        var o=zeilen[j].zellen.filter(function(x){return x.pos===c.pos;})[0];
        if(!o){break;}
        if(o.vm!=='continue'){c.start=o;break;}
      }
    });
  });
  return zeilen;
}
function startZelle(c){return c&&c.start?c.start:c;}
function zelleBei(zeile,pos){return zeile.zellen.filter(function(c){return c.pos<=pos&&pos<c.pos+c.span;})[0];}

/* ---------------- Datum, Geschlecht, Matricule ---------------- */
function pad(n){return (n<10?'0':'')+n;}
function isoAus(t){
  t=String(t||'').trim();
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(t);if(m){return m[1]+'-'+m[2]+'-'+m[3];}
  m=/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/.exec(t);
  if(m){var j=+m[3];if(j<100){j+=j<70?2000:1900;}var mo=+m[2],ta=+m[1];if(mo<1||mo>12||ta<1||ta>31){return '';}return j+'-'+pad(mo)+'-'+pad(ta);}
  return '';
}
function datumText(iso){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?m[3]+'.'+m[2]+'.'+m[1]:String(iso||'');}
function datumKurz(iso){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?m[3]+'.'+m[2]+'.'+m[1].slice(2):String(iso||'');}
/* Geschlecht: das erste Wort als Ganzes vergleichen – „Mädchen“ (madchen) beginnt mit „m“, ist aber kein Junge */
var G_W=['f','w','fem','femme','feminin','feminine','fille','female','girl','weibl','weiblich','madchen','maedchen','meedchen'];
var G_M=['m','h','masc','masculin','masculine','garcon','homme','male','boy','mannl','mannlich','maennlich','junge','jong'];
function geschlechtAus(t){
  var w=norm(t).replace(/[^a-z]+/g,' ').trim().split(' ')[0];if(!w){return '';}
  if(G_W.indexOf(w)>=0){return 'w';}
  if(G_M.indexOf(w)>=0){return 'm';}
  return '';
}
/* Luxemburger Matricule: 13 Ziffern, beginnt mit dem Geburtsdatum JJJJMMTT */
function gebAusMatricule(m){
  var z=String(m||'').replace(/\D/g,'');if(z.length<8){return '';}
  var j=+z.slice(0,4),mo=+z.slice(4,6),t=+z.slice(6,8);
  if(j<1990||j>2100||mo<1||mo>12||t<1||t>31){return '';}
  var d=new Date(j,mo-1,t);if(d.getMonth()!==mo-1){return '';}
  return j+'-'+pad(mo)+'-'+pad(t);
}
/* Schuljahr zu einem Datum: ab 15. August zählt das neue Schuljahr */
function schuljahr(iso){
  var d=iso?new Date(iso+'T12:00:00'):new Date();if(isNaN(d)){d=new Date();}
  var j=d.getFullYear(), start=(d.getMonth()>7||(d.getMonth()===7&&d.getDate()>=15))?j:j-1;
  return String(start).slice(2)+'-'+String(start+1).slice(2);
}

/* ---------------- Die Zellen-Karte ---------------- */
var MASSNAHMEN=[
  ['diagnostic specialise','diagnostic','Diagnostic spécialisé'],
  ['conseil et guidance des prof','cgPro','Conseil et guidance des professionnel·le·s'],
  ['conseil et guidance parent','cgEltern','Conseil et guidance parents'],
  ['isa','isa','Intervention spécialisée ambulatoire (ISA)'],
  ['atelier d','atelier','Atelier d’apprentissage spécifique'],
  ['reeducation','reeducation','Rééducation'],
  ['scolarisation specialisee','scol','']
];
function massnahmeVon(n){
  for(var i=0;i<MASSNAHMEN.length;i++){
    var m=MASSNAHMEN[i];
    if(m[0]==='isa'?n==='isa':n.indexOf(m[0])===0){
      if(m[1]!=='scol'){return m[1];}
      if(/annexe|junglinster/.test(n)){return 'annexe';}
      if(/\bcdp\b|participation|\bclapa\b/.test(n)){return 'cdp';}   /* ältere Fiches: „CLAPA“ */
      if(/\bcst\b|socio/.test(n)){return 'cst';}
      return 'scol';
    }
  }
  return '';
}
function karte(doc){
  var body=alle(doc,'body')[0], slots={}, rest=[], abschnitt='', belegt=[];
  function setze(pfad,slot){
    if(!slot||slots[pfad]){return;}
    var ziel=slot.art==='sdt'||slot.art==='haken'?slot.sdt.node:(slot.c?slot.c.tc:slot.p);
    if(slot.art!=='rest'&&ziel&&belegt.indexOf(ziel)>=0){return;}
    if(ziel&&slot.art!=='rest'){belegt.push(ziel);}
    slots[pfad]=slot;
  }
  function wertSlot(c){
    c=startZelle(c);if(!c){return null;}
    var s=c.sdts.filter(function(x){return x.typ!=='checkbox';})[0];
    return s?{art:'sdt',c:c,sdt:s}:{art:'zelle',c:c};
  }
  function hakenSlot(c){
    c=startZelle(c);if(!c){return null;}
    var s=c.sdts.filter(function(x){return x.typ==='checkbox';})[0];
    return s?{art:'haken',c:c,sdt:s}:{art:'hakentext',c:c};
  }
  function naechste(zeile,i){return zeile.zellen[i+1];}
  function labelPaare(zeilen,labels,pfadFn){
    zeilen.forEach(function(z){
      var nr=0;
      z.zellen.forEach(function(c,i){
        if(c.start){return;}
        var l=labels.filter(function(x){return x[2]==='anfang'?c.n.indexOf(x[0])===0:c.n===x[0];})[0];
        if(!l){return;}
        var ziel=naechste(z,i);
        setze(pfadFn?pfadFn(l[1],nr):l[1],wertSlot(ziel));
        nr++;
      });
    });
  }
  function absatz(p){
    var t=textVon(p), n=norm(t);
    if(!n){return;}
    if(/^fiche de renseignement/.test(n)){setze('fiche.schuljahr',{art:'titel',p:p});return;}
    if(/^date( de la)? fiche/.test(n)){setze('fiche.datum',{art:'absatz',p:p});return;}
    if(/donnees de l'?eleve/.test(n)){abschnitt='eleve';return;}
    if(/representant/.test(n)){abschnitt='vertreter';return;}
    if(/donnees scolaires/.test(n)){abschnitt='schule';return;}
    if(/progression scolaire/.test(n)){abschnitt='progression';return;}
    if(/^depistage/.test(n)){abschnitt='depistage';return;}
    if(/autres intervenant/.test(n)){abschnitt='intervenants';return;}
    if(/prise en charge specialisee/.test(n)){abschnitt='cdse';return;}
  }
  function tabelle(tbl){
    var zeilen=tabelleLesen(tbl), alleN=zeilen.map(function(z){return z.zellen.map(function(c){return c.n;}).join(' | ');}).join(' || ');
    if(/dossier m-?files/.test(alleN)){labelPaare(zeilen,[['dossier m','fiche.mfiles','anfang']]);return;}
    if(abschnitt==='eleve'||(/\bmatricule\b/.test(alleN)&&/\bprenom\b/.test(alleN))){
      labelPaare(zeilen,[['nom','person.nachname'],['prenom','person.vorname'],['matricule','person.matricule'],['identite iam','fiche.iam','anfang'],
        ['numero, rue','fiche.strasse'],['code, localite','fiche.ort'],['nationalite','fiche.nationalitaet'],['premiere langue','fiche.ersteSprache','anfang'],
        ['sexe','person.geschlecht'],['lieu de naissance','fiche.geburtsort','anfang'],['date de naissance','person.geburtsdatum','anfang'],
        ['contexte migratoire','fiche.ankunft','anfang']]);
      return;
    }
    if(abschnitt==='vertreter'||/autorite parentale/.test(alleN)){
      zeilen.forEach(function(z){
        var ap=z.zellen.filter(function(c){return /autorite parentale/.test(c.n);});
        ap.forEach(function(c,i){setze('fiche.vertreter.'+i+'.autoritaet',hakenSlot(c));});
      });
      labelPaare(zeilen,[['nom et prenom','name'],['nom, prenom','name'],['fonction','funktion'],['numero, rue','strasse'],['code, localite','ort'],['telephone','tel'],['e-mail','mail'],['email','mail'],['remarques','familie','anfang']],
        function(k,nr){return k==='familie'?'fiche.familie':'fiche.vertreter.'+nr+'.'+k;});
      return;
    }
    if(abschnitt==='schule'&&/ecole|lycee|classe actuelle/.test(alleN)&&!/informations supplementaires|direction regionale/.test(alleN)){
      labelPaare(zeilen,[['ecole/lycee','fiche.schule.name'],['ecole / lycee','fiche.schule.name'],['ecole','fiche.schule.name'],['classe actuelle','fiche.schule.klasse'],['classe','fiche.schule.klasse'],
        ['numero, rue','fiche.schule.strasse'],['code, localite','fiche.schule.ort']]);
      return;
    }
    if(/informations supplementaires|direction regionale|pdr ci|titulaire de classe/.test(alleN)){efEs(zeilen);return;}
    if(abschnitt==='progression'){progression(zeilen);return;}
    if(abschnitt==='depistage'||/\bcdm\b.*\bcdv\b/.test(alleN)){spaltenTabelle(zeilen,[['cl','cl'],['cdm','cdm'],['cdv','cdv'],['autres','autres']],function(k){return 'fiche.depistage.'+k;},true);return;}
    if(abschnitt==='intervenants'||/institution/.test(alleN)){
      spaltenTabelle(zeilen,[['institution','institution'],['nom et prenom','name'],['nom','name'],['telephone','tel'],['e-mail','mail'],['email','mail']],function(k,nr){return 'fiche.intervenants.'+nr+'.'+k;});
      return;
    }
    if(abschnitt==='cdse'||/diagnostic specialise/.test(alleN)){cdse(zeilen);return;}
    rest.push(textVon(tbl).slice(0,200));
  }
  /* Tabelle mit Kopfzeile: Spalten über die Überschrift finden, Datenzeilen darunter */
  function spaltenTabelle(zeilen,kopf,pfadFn,nurEine){
    var spalten=null, nr=0;
    zeilen.forEach(function(z){
      if(!spalten){
        var s={};
        z.zellen.forEach(function(c){var k=kopf.filter(function(x){return c.n===x[0]||c.n.indexOf(x[0])===0;})[0];if(k&&s[k[1]]==null){s[k[1]]=c.pos;}});
        if(Object.keys(s).length>=2){spalten=s;}
        return;
      }
      if(nurEine&&nr>0){return;}
      Object.keys(spalten).forEach(function(k){setze(pfadFn(k,nr),wertSlot(zelleBei(z,spalten[k])));});
      nr++;
    });
  }
  function efEs(zeilen){
    var teil='ef', spalten=null, nr={ef:0,es:0};
    zeilen.forEach(function(z){
      var erste=z.zellen[0];if(!erste){return;}
      var n=erste.n;
      if(/^informations supplementaires/.test(n)){teil=/\bes\b|secondaire/.test(n)?'es':'ef';spalten=null;return;}
      if(/^direction regionale/.test(n)){
        var s=erste.sdts.filter(function(x){return x.typ!=='checkbox';})[0];
        setze('fiche.'+teil+'.dr',s?{art:'sdt',c:erste,sdt:s}:(z.zellen[1]?wertSlot(z.zellen[1]):{art:'rest',c:erste,label:'direction regionale'}));
        return;
      }
      var s2={};z.zellen.forEach(function(c){
        if(c.n==='nom'){s2.name=c.pos;}else if(c.n==='adresse'){s2.adresse=c.pos;}else if(c.n==='telephone'){s2.tel=c.pos;}else if(c.n==='e-mail'||c.n==='email'){s2.mail=c.pos;}
      });
      if(Object.keys(s2).length>=2){spalten=s2;return;}
      if(!spalten){return;}
      var ziel, rolle=null;
      if(/^pdr ci/.test(n)){ziel='fiche.'+teil+'.pdr';}
      else if(/^titulaire/.test(n)){ziel='fiche.'+teil+'.titulaire';}
      else if(/^maison relais/.test(n)){ziel='fiche.'+teil+'.maisonRelais';}
      else{ziel='fiche.'+teil+'.weitere.'+nr[teil];nr[teil]++;rolle=wertSlot(erste);}
      if(rolle){setze(ziel+'.rolle',rolle);}
      Object.keys(spalten).forEach(function(k){setze(ziel+'.'+k,wertSlot(zelleBei(z,spalten[k])));});
    });
  }
  function progression(zeilen){
    var i=0;
    zeilen.forEach(function(z,zi){
      var erste=z.zellen[0];
      if(erste&&/^remarques/.test(erste.n)){setze('fiche.progressionBemerkung',wertSlot(z.zellen[1]));return;}
      if(zi===0||z.zellen.some(function(c){return c.sdts.length;})){
        z.zellen.forEach(function(c){if(c.start){return;}setze('fiche.progression.'+i,wertSlot(c));i++;});
      }
    });
  }
  function cdse(zeilen){
    var spalten=null, akt='', sonst=0;
    zeilen.forEach(function(z){
      if(!spalten){
        var s={};
        z.zellen.forEach(function(c){
          if(c.n==='nom'){s.name=c.pos;}else if(c.n==='telephone'){s.tel=c.pos;}else if(c.n==='e-mail'||c.n==='email'){s.mail=c.pos;}
          else if(/^date de debut/.test(c.n)){s.von=c.pos;}else if(/^date de fin/.test(c.n)){s.bis=c.pos;}
        });
        if(Object.keys(s).length>=3){spalten=s;}
        return;
      }
      /* Beschriftung: erste Zelle mit Text (ohne das Ankreuzfeld) */
      var lz=z.zellen.filter(function(c){return !c.start&&c.n&&!/^[☐☒⊠\s]*$/.test(c.fix);})[0], n=lz?lz.n:'';
      var haken=z.zellen.filter(function(c){return c.haken;})[0];
      var m=massnahmeVon(n);
      function werte(basis){Object.keys(spalten).forEach(function(k){setze(basis+'.'+k,wertSlot(zelleBei(z,spalten[k])));});}
      if(m){
        akt=m;
        if(haken){setze('fiche.cdse.'+m+'.aktiv',hakenSlot(haken));}
        werte('fiche.cdse.'+m);
        return;
      }
      if(/^intervenant/.test(n)){if(akt){werte('fiche.cdse.'+akt);}return;}
      if(/^cloture/.test(n)){if(haken){setze('fiche.cdse.cloture.aktiv',hakenSlot(haken));}werte('fiche.cdse.cloture');return;}
      if(/^(cdp|clapa)\b/.test(n)&&lz){var s1=lz.sdts.filter(function(x){return x.typ!=='checkbox';})[0];setze('fiche.cdse.cdp.standort',s1?{art:'sdt',c:lz,sdt:s1}:{art:'rest',c:lz,label:'cdp'});werte('fiche.cdse.cdp');return;}
      if(/^cst\b/.test(n)&&lz){var s3=lz.sdts.filter(function(x){return x.typ!=='checkbox';})[0];setze('fiche.cdse.cst.standort',s3?{art:'sdt',c:lz,sdt:s3}:{art:'rest',c:lz,label:'cst'});werte('fiche.cdse.cst.standortKontakt');return;}
      if(/^responsable cst/.test(n)){werte('fiche.cdse.cst.responsable');return;}
      if(/^personne de reference/.test(n)){werte('fiche.cdse.cst.referent');return;}
      if(n||z.zellen.some(function(c){return !c.start&&c.text;})){
        var basis='fiche.cdse.sonstige.'+sonst;sonst++;
        if(lz){setze(basis+'.label',{art:'zelle',c:lz});}
        if(haken){setze(basis+'.aktiv',hakenSlot(haken));}
        werte(basis);
      }
    });
  }
  function lauf(el){
    kinder(el).forEach(function(k){
      if(k.localName==='p'){absatz(k);}
      else if(k.localName==='tbl'){tabelle(k);}
      else if(k.localName==='sdt'){var inh=kinder(k,'sdtContent')[0];if(inh){lauf(inh);}}
    });
  }
  lauf(body);
  return {slots:slots,rest:rest};
}

/* ---------------- Lesen ---------------- */
function setzePfad(o,pfad,wert){
  var t=pfad.split('.'), x=o;
  for(var i=0;i<t.length-1;i++){var k=t[i], naechst=/^\d+$/.test(t[i+1]);if(x[k]==null){x[k]=naechst?[]:{};}x=x[k];}
  x[t[t.length-1]]=wert;
}
function holePfad(o,pfad){return pfad.split('.').reduce(function(x,k){return x==null?undefined:x[k];},o);}
/* Angekreuzt (Kästchen als Zeichen, kein Ankreuzfeld): ☒ ⊠ ☑ ✓ ✔, „[x]“ oder ein einzelnes x/X –
   z. B. von Hand neben das leere Kästchen geschrieben („☐ x autorité parentale“) */
function angekreuzt(t){t=String(t||'');return /[☒⊠☑✓✔]|\[\s*x\s*\]/i.test(t)||/(^|[\s☐(\[])[xX](?=$|[\s☐)\]])/.test(t);}
function slotLesen(s){
  if(!s){return '';}
  if(s.art==='sdt'){return s.sdt.wert;}
  if(s.art==='haken'){return !!s.sdt.wert;}
  if(s.art==='hakentext'){return angekreuzt(s.c.text);}
  if(s.art==='zelle'){var t=s.c.text.trim();return PLATZHALTER.test(t)?'':t;}
  if(s.art==='absatz'){var a=textVon(s.p);var i=a.indexOf(':');return i>=0?a.slice(i+1).trim():'';}
  if(s.art==='titel'){var m=/(\d{2})\s*[-\/]\s*(\d{2})/.exec(textVon(s.p));return m?m[1]+'-'+m[2]:'';}
  if(s.art==='rest'){
    var f=s.c.fix, r='';
    if(s.label==='direction regionale'){var m1=/\)\s*:?\s*(.+)$/.exec(f)||/:\s*(.+)$/.exec(f);r=m1?m1[1]:'';}
    else{r=f.replace(/^\s*(cdp|cst|clapa)\s*:?\s*/i,'');}
    r=r.trim();return PLATZHALTER.test(r)?'':r;
  }
  return '';
}
function leer(v){return v==null||v===''||v===false;}
function aufraeumen(o){
  /* leere Einträge in Listen entfernen, Listen verdichten */
  if(Array.isArray(o)){return o.map(aufraeumen).filter(function(x){return x!=null&&!(typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(function(k){return leer(x[k])||(typeof x[k]==='object'&&!Object.keys(x[k]).length);}))&&x!=='';});}
  if(o&&typeof o==='object'){var r={};Object.keys(o).forEach(function(k){r[k]=aufraeumen(o[k]);});return r;}
  return o;
}
/* Namen der Maßnahmen für Hinweise */
var M_NAMEN={diagnostic:'Diagnostic spécialisé',cgPro:'Conseil et guidance des professionnel·le·s',cgEltern:'Conseil et guidance parents',isa:'ISA',atelier:'Atelier',reeducation:'Rééducation',
  annexe:'Annexe',cdp:'Classe de participation',cst:'CST',cloture:'Clôture du dossier',scol:'Scolarisation spécialisée'};
function lesenAusDoc(doc){
  var k=karte(doc), roh={};
  Object.keys(k.slots).forEach(function(p){
    var w=slotLesen(k.slots[p]);if(typeof w==='string'){w=w.trim();}
    if(!leer(w)){setzePfad(roh,p,w);}
    /* Maßnahme steht in der Datei, ist aber nicht angekreuzt: aktiv:false ausdrücklich mitgeben –
       sonst kann eine neuere Fiche beim Aktualisieren einen Haken nie entfernen */
    else if(w===false&&/^fiche\.cdse\.[a-zA-Z]+\.aktiv$/.test(p)){setzePfad(roh,p,false);}
  });
  var d={person:roh.person||{},fiche:roh.fiche||{}}, f=d.fiche, p=d.person, hinweise=[];
  /* Aufbereiten */
  if(f.datum){var di=isoAus(f.datum);if(di){f.datum=di;}else{hinweise.push('„Date Fiche“ ist kein Datum: '+f.datum);}}
  if(p.geschlecht){var g=geschlechtAus(p.geschlecht);if(!g){hinweise.push('Geschlecht nicht erkannt: '+p.geschlecht);}p.geschlecht=g;}
  if(p.matricule){p.matricule=String(p.matricule).replace(/\s+/g,' ').trim();}
  if(p.geburtsdatum){var gd=isoAus(p.geburtsdatum);if(!gd){hinweise.push('„Date de naissance“ ist kein Datum („'+p.geburtsdatum+'“) – bitte das Geburtsdatum prüfen.');}p.geburtsdatum=gd||'';}
  if(!p.geburtsdatum&&p.matricule){var gb=gebAusMatricule(p.matricule);if(gb){p.geburtsdatum=gb;hinweise.push('Geburtsdatum aus der Matricule übernommen: '+datumText(gb));}}
  if(f.ankunft){var an=isoAus(f.ankunft);if(an){f.ankunft=an;}else{f.migration=f.ankunft;delete f.ankunft;}}
  if(f.schule){if(f.schule.name){p.schule=f.schule.name;}if(f.schule.klasse){p.klasse=f.schule.klasse;}}
  /* Daten der Maßnahmen als Datum; was kein Datum ist („Sept. 2025“), bleibt als Text – mit Hinweis je Feld */
  if(f.cdse){Object.keys(f.cdse).forEach(function(m){var x=f.cdse[m];if(!x||typeof x!=='object'){return;}
    (Array.isArray(x)?x:[x]).forEach(function(y){if(!y||typeof y!=='object'){return;}['von','bis'].forEach(function(k){if(y[k]){var iso=isoAus(y[k]);if(iso){y[k]=iso;}
      else{hinweise.push((m==='sonstige'?(y.label||'Sonstige Maßnahme'):(M_NAMEN[m]||m))+': „'+(k==='von'?'Date de début':'Date de fin')+'“ ist kein Datum („'+y[k]+'“) – so zählt die Maßnahme als '+(k==='von'?'„ohne Beginn“':'„ohne Ende“ (laufend)')+'. Bitte im Reiter „Fiche“ als Datum eintragen.');}}});});});}
  /* Lücken (leere Spalten) als '' – map() überspringt Lücken im Array, deshalb eine Schleife */
  if(f.progression){var pr=[];for(var pi=0;pi<f.progression.length;pi++){var px=f.progression[pi];pr.push(px==null?'':String(px).trim());}while(pr.length&&!pr[pr.length-1]){pr.pop();}f.progression=pr;}
  /* Schullaufbahn nicht verdichten: jede Angabe gehört zu ihrer Spalte (Schuljahr), Lücken bleiben leer */
  var prog=f.progression;
  d.fiche=aufraeumen(f);d.person=p;
  if(prog){d.fiche.progression=prog;}
  if(!p.nachname&&!p.vorname){hinweise.push('In der Datei wurde kein Name gefunden. Ist es eine Fiche de renseignement?');}
  return {daten:d,hinweise:hinweise,nichtZugeordnet:k.rest};
}
function lesen(datei){
  if(!datei){return Promise.reject(new Error('Keine Datei gewählt.'));}
  if(datei.size>15*1024*1024){return Promise.reject(new Error('Die Datei ist zu groß für eine Fiche (über 15 MB).'));}
  if(/\.doc$/i.test(datei.name)){return Promise.reject(new Error('Das ist das alte Word-Format (.doc). Bitte in Word als .docx speichern und dann hochladen.'));}
  return datei.arrayBuffer().then(zipLesen).then(function(dateien){
    var dx=dateien.filter(function(f){return f.name==='word/document.xml';})[0];
    if(!dx){throw new Error('Das ist keine Word-Datei (.docx).');}
    var doc=new DOMParser().parseFromString(new TextDecoder().decode(dx.daten),'application/xml');
    if(doc.getElementsByTagName('parsererror').length){throw new Error('Die Word-Datei ließ sich nicht lesen (beschädigtes XML).');}
    var r=lesenAusDoc(doc);r.datei=datei.name;return r;
  });
}

/* ---------------- Schreiben ---------------- */
function rPrMuster(c){
  var pPr=kinder(c.tc,'p').map(function(p){return kinder(p,'pPr')[0];}).filter(Boolean)[0];
  var r=pPr&&kinder(pPr,'rPr')[0];
  if(!r){var run=alle(c.tc,'r')[0];r=run&&kinder(run,'rPr')[0];}
  if(!r){return null;}
  var k=r.cloneNode(true);
  kinder(k,'rStyle').forEach(function(s){if(/placeholder/i.test(wAttr(s,'val')||'')){k.removeChild(s);}});
  /* eingetragene Werte immer normal (nicht fett/kursiv), wie in einem ausgefüllten Formular üblich */
  ['b','bCs','i','iCs','color'].forEach(function(n){kinder(k,n).forEach(function(x){k.removeChild(x);});});
  return k;
}
function lauftext(doc,r,text){
  String(text).split('\n').forEach(function(z,i){
    if(i){r.appendChild(neu(doc,'br'));}
    var t=neu(doc,'t');t.setAttributeNS(XMLNS,'xml:space','preserve');t.textContent=z;r.appendChild(t);
  });
}
function zelleSchreiben(doc,c,text){
  var tc=c.tc, ps=kinder(tc,'p'), muster=rPrMuster(c);
  var p=ps[0];if(!p){p=neu(doc,'p');tc.appendChild(p);}
  ps.slice(1).forEach(function(x){tc.removeChild(x);});
  kinder(tc,'sdt').forEach(function(x){tc.removeChild(x);});
  kinder(p).forEach(function(k){if(k.localName!=='pPr'){p.removeChild(k);}});
  if(text===''||text==null){return;}
  var r=neu(doc,'r');if(muster){r.appendChild(muster);}
  lauftext(doc,r,text);p.appendChild(r);
}
function sdtSchreiben(doc,info,text,iso){
  var pr=info.pr, inh=info.inhalt;if(!pr||!inh){return;}
  alle(pr,'showingPlcHdr').forEach(function(x){x.parentNode.removeChild(x);});
  if(info.typ==='datum'){var d=alle(pr,'date')[0];if(d){if(iso){d.setAttributeNS(W,'w:fullDate',iso+'T00:00:00Z');}else{d.removeAttributeNS(W,'fullDate');d.removeAttribute('w:fullDate');}}}
  if(info.typ==='auswahl'&&text){
    var dl=alle(pr,'dropDownList')[0]||alle(pr,'comboBox')[0];
    if(dl&&!alle(dl,'listItem').some(function(li){return (wAttr(li,'displayText')||wAttr(li,'value'))===text;})){
      var li=neu(doc,'listItem');li.setAttributeNS(W,'w:displayText',text);li.setAttributeNS(W,'w:value',text);dl.appendChild(li);
    }
  }
  var runs=alle(inh,'r'), r=runs[0];
  if(!r){var p=alle(inh,'p')[0];r=neu(doc,'r');if(p){p.appendChild(r);}else{inh.appendChild(r);}}
  runs.slice(1).forEach(function(x){x.parentNode.removeChild(x);});
  var rPr=kinder(r,'rPr')[0];
  if(rPr){kinder(rPr,'rStyle').forEach(function(s){if(/placeholder/i.test(wAttr(s,'val')||'')){rPr.removeChild(s);}});}
  kinder(r).forEach(function(k){if(k.localName!=='rPr'){r.removeChild(k);}});
  lauftext(doc,r,text==null?'':text);
}
function hakenSchreiben(doc,info,an){
  var cb=info.pr&&info.pr.getElementsByTagNameNS(W14,'checked')[0];
  if(cb){cb.setAttributeNS(W14,'w14:val',an?'1':'0');}
  var t=info.inhalt&&alle(info.inhalt,'t')[0];if(t){t.textContent=an?'☒':'☐';}
}
function slotSchreiben(doc,s,wert,pfad){
  var text=wert==null?'':(typeof wert==='boolean'?'':String(wert));
  if(s.art==='haken'){hakenSchreiben(doc,s.sdt,!!wert);return;}
  if(s.art==='hakentext'){
    var tt=alle(s.c.tc,'t').filter(function(t){return /[☐☒⊠]/.test(t.textContent);})[0];
    if(tt){tt.textContent=tt.textContent.replace(/[☐☒⊠]/,wert?'☒':'☐');}
    return;
  }
  if(s.art==='titel'){
    var ts=alle(s.p,'t'), hit=ts.filter(function(t){return /\d{2}\s*[-\/]\s*\d{2}/.test(t.textContent);})[0];
    if(hit&&text){hit.textContent=hit.textContent.replace(/\d{2}\s*[-\/]\s*\d{2}/,text);}
    return;
  }
  if(s.art==='absatz'){
    var runs=alle(s.p,'r'), vorlage=runs[0];
    var r=neu(doc,'r');if(vorlage&&kinder(vorlage,'rPr')[0]){r.appendChild(kinder(vorlage,'rPr')[0].cloneNode(true));}
    lauftext(doc,r,' '+datumText(wert));s.p.appendChild(r);return;
  }
  if(s.art==='sdt'){
    if(s.sdt.typ==='datum'){var iso=isoAus(text)||'';sdtSchreiben(doc,s.sdt,iso?datumKurz(iso):text,iso);return;}
    sdtSchreiben(doc,s.sdt,text);return;
  }
  if(s.art==='zelle'){
    if(/\.(von|bis|ankunft|datum)$/.test(pfad)){var iso2=isoAus(text);if(iso2){text=datumText(iso2);}}
    zelleSchreiben(doc,s.c,text);return;
  }
}
/* Genug Zeilen für Listen: Datenzeilen der Tabellen „Autres intervenants“ klonen */
function zeilenErgaenzen(doc,daten){
  var n=((daten.fiche||{}).intervenants||[]).length;
  var k=karte(doc), vorhanden=0;
  while(k.slots['fiche.intervenants.'+vorhanden+'.name']||k.slots['fiche.intervenants.'+vorhanden+'.institution']){vorhanden++;}
  if(n<=vorhanden||!vorhanden){return;}
  var letzte=(k.slots['fiche.intervenants.'+(vorhanden-1)+'.name']||k.slots['fiche.intervenants.'+(vorhanden-1)+'.institution']).c.tc.parentNode;
  for(var i=vorhanden;i<n;i++){
    var kl=letzte.cloneNode(true);
    [kl].concat(Array.prototype.slice.call(kl.getElementsByTagName('*'))).forEach(function(e){e.removeAttributeNS&&e.removeAttributeNS(W14,'paraId');e.removeAttributeNS&&e.removeAttributeNS(W14,'textId');});
    alle(kl,'t').forEach(function(t){t.textContent='';});
    letzte.parentNode.insertBefore(kl,letzte.nextSibling);letzte=kl;
  }
}
/* Dossier → Werte für die Vorlage (gleiche Pfade wie beim Lesen) */
function werteAusDossier(d){
  var p=d.person||{}, f=JSON.parse(JSON.stringify(d.fiche||{}));
  f.schule=Object.assign({},f.schule||{});
  if(p.schule){f.schule.name=p.schule;}
  if(p.klasse){f.schule.klasse=p.klasse;}
  f.datum=f.datum||new Date().toISOString().slice(0,10);
  f.schuljahr=schuljahr(f.datum);
  var person={nachname:p.nachname||'',vorname:p.vorname||'',matricule:p.matricule||'',geschlecht:p.geschlecht==='m'?'M':(p.geschlecht==='w'?'F':''),geburtsdatum:p.geburtsdatum||''};
  return {person:person,fiche:f};
}
function schreiben(d){
  return zipLesen(base64Bytes(VORLAGE_B64).buffer).then(function(dateien){
    var dx=dateien.filter(function(x){return x.name==='word/document.xml';})[0];
    var doc=new DOMParser().parseFromString(new TextDecoder().decode(dx.daten),'application/xml');
    var werte=werteAusDossier(d);
    zeilenErgaenzen(doc,werte);
    var k=karte(doc);
    Object.keys(k.slots).forEach(function(pfad){
      var w=holePfad(werte,pfad);
      if(pfad==='fiche.ankunft'&&!w&&werte.fiche.migration){w=werte.fiche.migration;}
      slotSchreiben(doc,k.slots[pfad],w,pfad);
    });
    var xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'+new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>\s*/,'');
    dx.daten=new TextEncoder().encode(xml);
    return zipSchreiben(dateien);
  });
}
function dateiname(d){
  var p=d.person||{}, f=d.fiche||{}, t=(f.datum||new Date().toISOString().slice(0,10)).replace(/-/g,'');
  function sauber(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9-]+/g,'');}
  return t+'_'+sauber(p.nachname)+sauber(p.vorname)+'_Fiche_de_renseignement.docx';
}
/* Leere Vorlage (für Tests und zum Ausfüllen von Hand) */
function vorlageBlob(){return new Blob([base64Bytes(VORLAGE_B64)],{type:DOCX_TYP});}
/* Nur für Tests: Rundlauf ohne Datei */
function lesenAusBlob(blob){return blob.arrayBuffer().then(zipLesen).then(function(dateien){
  var dx=dateien.filter(function(f){return f.name==='word/document.xml';})[0];
  return lesenAusDoc(new DOMParser().parseFromString(new TextDecoder().decode(dx.daten),'application/xml'));
});}

/* Nur für Tests: welche Felder die Zellen-Karte in einer Datei findet */
function pfadeAusBlob(blob){return blob.arrayBuffer().then(zipLesen).then(function(dateien){
  var dx=dateien.filter(function(f){return f.name==='word/document.xml';})[0];
  var k=karte(new DOMParser().parseFromString(new TextDecoder().decode(dx.daten),'application/xml'));
  return {pfade:Object.keys(k.slots).map(function(p){return p+' ['+k.slots[p].art+(k.slots[p].sdt?':'+k.slots[p].sdt.typ:'')+']';}),rest:k.rest};
});}
return {pfadeAusBlob:pfadeAusBlob, lesen:lesen, schreiben:schreiben, dateiname:dateiname, vorlageBlob:vorlageBlob, lesenAusBlob:lesenAusBlob,
  isoAus:isoAus, gebAusMatricule:gebAusMatricule, schuljahr:schuljahr, massnahmen:MASSNAHMEN, datumText:datumText, docxText:docxText,
  /* für Tests: Geschlecht aus dem Text, Kästchen als Zeichen angekreuzt? */
  geschlechtAus:geschlechtAus, angekreuzt:angekreuzt};
})();
