/* =====================================================================
   CDSE Hub — Berichte und Arztbriefe im Dossier
   ---------------------------------------------------------------------
   Einen Bericht hinzufügen (PDF, Word oder eingefügter Text): Der Hub
   liest den Text aus und schlägt vor, was er gefunden hat – Diagnosen
   und Verdacht (mit Verneinung: „kein Hinweis auf …“), ICD-Codes,
   Medikamente, Datum, Absender und Empfehlungen. Übernommen wird nur,
   was das Team abhakt: Profile gehen in den Kompass, Empfehlungen auf
   Wunsch als Schritte in den Begleitplan. Die Originaldatei liegt auf
   Wunsch verschlüsselt neben dem Dossier (CDSE_TEAM.anhangSpeichern).
   Gescannte PDFs enthalten keinen Text – dann hilft Einfügen/Abtippen.
   ===================================================================== */
window.CDSE_BERICHTE=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
var ART={arztbrief:'Arztbrief',befund:'Befund',therapie:'Therapiebericht',schule:'Schulbericht',bericht:'Bericht'};
var MAX_DATEI=12*1024*1024;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function datum(i){return H?H.datum(i):i;}
function groesse(n){return n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';}

/* =====================================================================
   PDF: Text auslesen, ohne Bibliothek. Unterstützt Flate-komprimierte
   Inhalte, Objekt-Streams und ToUnicode-Tabellen (so erzeugen Word,
   LibreOffice und Browser ihre PDFs). Scans enthalten keinen Text.
   ===================================================================== */
function latin1(b,s,e){var t='';for(var i=s;i<e;i+=8192){t+=String.fromCharCode.apply(null,b.subarray(i,Math.min(e,i+8192)));}return t;}
function inflatePdf(bytes){
  var ds=new DecompressionStream('deflate'), w=ds.writable.getWriter(), r=ds.readable.getReader(), teile=[], n=0;
  w.write(bytes).catch(function(){});w.close().catch(function(){});
  function lies(){return r.read().then(function(x){if(x.done){return;}teile.push(x.value);n+=x.value.length;return lies();},function(){/* Rest nach einem Fehler ignorieren */});}
  return lies().then(function(){var o=new Uint8Array(n),p=0;teile.forEach(function(t){o.set(t,p);p+=t.length;});return o;});
}
/* Schlüsselwort „stream“ nach dem Wörterbuch (davor Leerraum oder „>>“, danach ein Zeilenende) – nicht irgendwo im Text */
function streamAb(bin,von,bis){
  var i=bin.indexOf('stream',von);
  while(i>=0&&i<bis){var v=bin.charAt(i-1), n=bin.charAt(i+6);if((v==='>'||/\s/.test(v))&&(n==='\r'||n==='\n')){return i;}i=bin.indexOf('stream',i+6);}
  return -1;
}
function pdfObjekte(b,bin){
  var o={}, re=/(\d+)\s+(\d+)\s+obj\b/g, m, runden=0;
  function laengeVon(dict){
    var d=/\/Length\s+(\d+)(?:\s+(\d+)\s+R)?/.exec(dict);if(!d){return -1;}
    if(d[2]==null){return +d[1];}
    var rm=new RegExp('(?:^|[^0-9])'+d[1]+'\\s+'+d[2]+'\\s+obj\\s*(\\d+)\\s*endobj').exec(bin);return rm?+rm[1]:-1;
  }
  /* Die Suche geht nur vorwärts (re.lastIndex wird nie kleiner); zur Sicherheit höchstens 200 000 Objekte */
  while((m=re.exec(bin))&&runden++<200000){
    var start=re.lastIndex, eIdx=bin.indexOf('endobj',start);if(eIdx<0){break;}
    var sIdx=streamAb(bin,start,eIdx), obj={nr:+m[1],dict:'',daten:null};
    if(sIdx>=0){
      var ds=sIdx+6;if(bin.charCodeAt(ds)===13){ds++;}if(bin.charCodeAt(ds)===10){ds++;}
      var len=laengeVon(bin.slice(start,sIdx)), de=len>=0?ds+len:-1;
      if(de<ds||bin.slice(de,de+40).indexOf('endstream')<0){de=bin.indexOf('endstream',ds);}
      if(de>=ds){
        obj.dict=bin.slice(start,sIdx);obj.daten=b.subarray(ds,de);
        var e2=bin.indexOf('endobj',de);eIdx=e2<0?bin.length:e2;
      }else{obj.dict=bin.slice(start,eIdx);}   /* kein „endstream“: als Objekt ohne Datenstrom lesen */
    }else{obj.dict=bin.slice(start,eIdx);}
    o[obj.nr]=obj;re.lastIndex=Math.max(start,eIdx+6);
  }
  return o;
}
function stromText(obj){
  if(!obj||!obj.daten){return Promise.resolve('');}
  if(/\/Filter\s*\[?\s*\/FlateDecode/.test(obj.dict)){return inflatePdf(obj.daten).then(function(u){return u?latin1(u,0,u.length):'';});}
  if(/\/Filter/.test(obj.dict)){return Promise.resolve('');}   /* Bilder, andere Filter */
  return Promise.resolve(latin1(obj.daten,0,obj.daten.length));
}
function hexBytes(h){h=h.replace(/[^0-9a-fA-F]/g,'');if(h.length%2){h+='0';}var o=[];for(var i=0;i<h.length;i+=2){o.push(parseInt(h.substr(i,2),16));}return o;}
function utf16(bytes){var s='';for(var i=0;i+1<bytes.length;i+=2){s+=String.fromCharCode((bytes[i]<<8)|bytes[i+1]);}return s;}
/* ToUnicode-Tabelle: {laenge, map:{code: text}} */
function cmapLesen(t){
  var map={}, laenge=1, m;
  var cs=/begincodespacerange([\s\S]*?)endcodespacerange/.exec(t);if(cs){var h=/<([0-9a-fA-F]+)>/.exec(cs[1]);if(h){laenge=Math.max(1,h[1].length/2);}}
  var reC=/beginbfchar([\s\S]*?)endbfchar/g;
  while((m=reC.exec(t))){var reP=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g,p;while((p=reP.exec(m[1]))){map[parseInt(p[1],16)]=utf16(hexBytes(p[2]));}}
  var reR=/beginbfrange([\s\S]*?)endbfrange/g;
  while((m=reR.exec(t))){
    var reZ=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g,z;
    while((z=reZ.exec(m[1]))){
      var lo=parseInt(z[1],16), hi=parseInt(z[2],16);if(hi-lo>5000){continue;}
      if(z[3].charAt(0)==='['){var l=z[3].match(/<([0-9a-fA-F]*)>/g)||[];for(var i=0;i<l.length&&lo+i<=hi;i++){map[lo+i]=utf16(hexBytes(l[i]));}}
      else{var basis=hexBytes(z[3].slice(1,-1));for(var c=lo;c<=hi;c++){var bb=basis.slice(),k=c-lo,j=bb.length-1;while(k>0&&j>=0){var s2=bb[j]+k;bb[j]=s2&255;k=s2>>8;j--;}map[c]=utf16(bb);}}
    }
  }
  return {laenge:laenge,map:map};
}
var WINANSI={128:'€',130:'‚',131:'ƒ',132:'„',133:'…',134:'†',135:'‡',136:'ˆ',137:'‰',138:'Š',139:'‹',140:'Œ',142:'Ž',145:'‘',146:'’',147:'“',148:'”',149:'•',150:'–',151:'—',152:'˜',153:'™',154:'š',155:'›',156:'œ',158:'ž',159:'Ÿ'};
/* Bytes → {text, breite (in 1/1000 der Schriftgröße), leer (Anzahl Leerzeichen)} */
function zeichenkette(bytes,font){
  var laenge=font?(font.cmap?font.cmap.laenge:(font.zweiByte?2:1)):1, s='', breite=0, leer=0;
  for(var i=0;i+laenge<=bytes.length;i+=laenge){
    var code=0;for(var j=0;j<laenge;j++){code=(code<<8)|bytes[i+j];}
    var ch=(font&&font.cmap)?font.cmap.map[code]:(laenge===1?(WINANSI[code]||String.fromCharCode(code)):null);
    if(ch!=null){s+=ch;if(ch===' '){leer++;}}
    breite+=font&&font.breite?font.breite(code):500;
  }
  return {text:s,breite:breite,leer:leer};
}
function literalBytes(s){
  var o=[], i=0;
  while(i<s.length){
    var c=s.charAt(i);
    if(c!=='\\'){o.push(s.charCodeAt(i)&255);i++;continue;}
    var n=s.charAt(i+1);
    if(/[0-7]/.test(n)){var oct=/^[0-7]{1,3}/.exec(s.slice(i+1))[0];o.push(parseInt(oct,8)&255);i+=1+oct.length;continue;}
    var esc2={n:10,r:13,t:9,b:8,f:12};
    if(esc2[n]!=null){o.push(esc2[n]);}else if(n==='\r'||n==='\n'){if(n==='\r'&&s.charAt(i+2)==='\n'){i++;}}else{o.push(n.charCodeAt(0)&255);}
    i+=2;
  }
  return o;
}
/* Inhaltsstrom deuten: Text-Operatoren mit der jeweils gewählten Schrift */
function inhaltText(t,fonts){
  var aus='', font=null, groesse=12, i=0, n=t.length, stapel=[];
  /* Position im Textraum: x (aktuell), zx (Zeilenanfang); tm = Textmatrix [a,b,c,d,e,f] */
  var x=0, zx=0, zy=0, tm=[1,0,0,1,0,0], tc=0, tw=0;
  function zeile(){if(aus&&!/\n$/.test(aus)){aus+='\n';}}
  function luecke(dx){if(dx>groesse*0.22&&aus&&!/\s$/.test(aus)){aus+=' ';}}
  function schreibe(bytes){var z=zeichenkette(bytes,font);aus+=z.text;x+=z.breite/1000*groesse+tc*(z.text.length)+tw*z.leer;}
  var runden=0, maxRunden=2*n+1000;   /* Sicherung gegen Endlosschleifen bei kaputten Dateien */
  while(i<n&&runden++<maxRunden){
    var c=t.charAt(i);
    if(c==='%'){while(i<n&&t.charAt(i)!=='\n'&&t.charAt(i)!=='\r'){i++;}continue;}
    if(/\s/.test(c)){i++;continue;}
    if(c==='('){var tiefe=1,j=i+1,roh='';while(j<n&&tiefe>0){var cj=t.charAt(j);if(cj==='\\'){roh+=cj+t.charAt(j+1);j+=2;continue;}if(cj==='('){tiefe++;}else if(cj===')'){tiefe--;if(!tiefe){break;}}roh+=cj;j++;}
      stapel.push({str:literalBytes(roh)});i=j+1;continue;}
    if(c==='<'&&t.charAt(i+1)!=='<'){var e=t.indexOf('>',i);if(e<0){break;}stapel.push({str:hexBytes(t.slice(i+1,e))});i=e+1;continue;}   /* ohne „>“: Rest überspringen */
    if(c==='['){stapel.push({auf:true});i++;continue;}
    if(c===']'){var arr=[];while(stapel.length&&!stapel[stapel.length-1].auf){arr.unshift(stapel.pop());}stapel.pop();stapel.push({arr:arr});i++;continue;}
    if(c==='<'&&t.charAt(i+1)==='<'){i+=2;continue;}
    if(c==='>'&&t.charAt(i+1)==='>'){i+=2;continue;}
    var m=/^(\/[^\s\/\[\]()<>{}%]*|[+-]?(?:\d+\.?\d*|\.\d+)|[A-Za-z'"*]+)/.exec(t.slice(i,i+64));
    if(!m){i++;continue;}
    var tok=m[1];i+=tok.length;
    if(tok.charAt(0)==='/'){stapel.push({name:tok.slice(1)});continue;}
    if(/^[+-]?[\d.]/.test(tok)){stapel.push({zahl:parseFloat(tok)});continue;}
    /* Operator */
    var zahlen=stapel.filter(function(q){return q.zahl!=null;}).map(function(q){return q.zahl;});
    if(tok==='Tf'){var nm=stapel.filter(function(q){return q.name!=null;}).pop();font=nm?fonts[nm.name]||null:null;if(zahlen.length){groesse=Math.abs(zahlen[zahlen.length-1])||groesse;}}
    else if(tok==='Tc'){tc=zahlen.length?zahlen[0]:0;}
    else if(tok==='Tw'){tw=zahlen.length?zahlen[0]:0;}
    else if(tok==='Tj'||tok==="'"||tok==='"'){if(tok!=='Tj'){zeile();x=zx;}var sx=stapel.filter(function(q){return q.str;}).pop();if(sx){schreibe(sx.str);}}
    else if(tok==='TJ'){var ax=stapel.filter(function(q){return q.arr;}).pop();if(ax){ax.arr.forEach(function(q){if(q.str){schreibe(q.str);}else if(q.zahl!=null){var dx=-q.zahl/1000*groesse;luecke(dx);x+=dx;}});}}
    else if(tok==='Td'||tok==='TD'){var ty=zahlen.length?zahlen[zahlen.length-1]:0, tx=zahlen.length>1?zahlen[zahlen.length-2]:0;
      zx+=tx;zy+=ty;if(Math.abs(ty)>groesse*0.3){zeile();}else{luecke(zx-x);}x=zx;}
    else if(tok==='T*'){zeile();x=zx;}
    else if(tok==='BT'){x=zx=zy=0;tm=[1,0,0,1,0,0];}
    else if(tok==='ET'){zeile();}
    else if(tok==='Tm'&&zahlen.length>=6){
      var neu=zahlen.slice(-6), skala=Math.abs(neu[0])||1, altEnde=tm[4]+tm[0]*x;
      if(Math.abs(neu[5]-tm[5])>groesse*skala*0.3){zeile();}else{luecke((neu[4]-altEnde)/skala);}
      tm=neu;x=zx=zy=0;
    }
    else if(tok==='BI'){var ei=t.indexOf('EI',i);i=ei<0?n:ei+2;}
    stapel=[];
  }
  return aus;
}
function pdfText(buf){
  var b=new Uint8Array(buf), bin=latin1(b,0,b.length);
  if(bin.slice(0,1024).indexOf('%PDF')<0){return Promise.reject(new Error('Das ist keine PDF-Datei.'));}
  if(/\/Encrypt\s/.test(bin)){return Promise.reject(new Error('Das PDF ist geschützt (verschlüsselt). Bitte den Text im PDF markieren, kopieren und einfügen.'));}
  var o=pdfObjekte(b,bin);
  /* Objekt-Streams auspacken */
  var objStm=Object.keys(o).map(function(k){return o[k];}).filter(function(x){return x.daten&&/\/Type\s*\/ObjStm/.test(x.dict);});
  return Promise.all(objStm.map(function(x){
    return stromText(x).then(function(t){
      var first=+((/\/First\s+(\d+)/.exec(x.dict)||[])[1]||0), kopf=t.slice(0,first).trim().split(/\s+/).map(Number);
      for(var i=0;i+1<kopf.length;i+=2){var von=first+kopf[i+1], bis=i+3<kopf.length?first+kopf[i+3]:t.length;if(!o[kopf[i]]){o[kopf[i]]={nr:kopf[i],dict:t.slice(von,bis),daten:null};}}
    });
  })).then(function(){
    function ref(dict,key){var m=new RegExp('/'+key+'\\s+(\\d+)\\s+\\d+\\s+R').exec(dict);return m?o[+m[1]]:null;}
    /* Seiten in Lesereihenfolge (Seitenbaum), sonst in Dateireihenfolge */
    var seiten=[], gesehen={};
    function baum(x){
      if(!x||gesehen[x.nr]){return;}gesehen[x.nr]=1;
      if(/\/Type\s*\/Page\b/.test(x.dict)&&!/\/Type\s*\/Pages\b/.test(x.dict)){seiten.push(x);return;}
      var kids=/\/Kids\s*\[([^\]]*)\]/.exec(x.dict);if(!kids){return;}
      var re=/(\d+)\s+\d+\s+R/g,k;while((k=re.exec(kids[1]))){baum(o[+k[1]]);}
    }
    var root=null, rm, reRoot=/\/Root\s+(\d+)\s+\d+\s+R/g;while((rm=reRoot.exec(bin))){root=o[+rm[1]];}
    if(root){baum(ref(root.dict,'Pages'));}
    if(!seiten.length){seiten=Object.keys(o).map(function(k){return o[k];}).filter(function(x){return /\/Type\s*\/Page\b/.test(x.dict)&&!/\/Type\s*\/Pages\b/.test(x.dict);});}
    var cmaps={};
    function arrayText(dict,key){
      var m=new RegExp('/'+key+'\\s*(\\[|(\\d+)\\s+\\d+\\s+R)').exec(dict);if(!m){return '';}
      if(m[2]){var ob=o[+m[2]];return ob?ob.dict:'';}
      var a=m.index+m[0].length-1, tiefe=0;for(var j=a;j<dict.length;j++){var ch=dict.charAt(j);if(ch==='['){tiefe++;}else if(ch===']'){tiefe--;if(!tiefe){return dict.slice(a,j+1);}}}
      return dict.slice(a);
    }
    function breiten(fo){
      var w={}, dw=0, dict=fo.dict;
      if(/\/Subtype\s*\/Type0/.test(dict)){
        var df=arrayText(dict,'DescendantFonts'), r1=/(\d+)\s+\d+\s+R/.exec(df), cid=r1?o[+r1[1]]:null;
        if(cid){
          dw=+((/\/DW\s+(\d+)/.exec(cid.dict)||[])[1]||1000);
          var wt=arrayText(cid.dict,'W').replace(/^\s*\[|\]\s*$/g,''), tk=wt.match(/\[[^\]]*\]|[\d.]+/g)||[];
          for(var k=0;k<tk.length;){
            var c0=+tk[k];
            if(tk[k+1]&&tk[k+1].charAt(0)==='['){(tk[k+1].match(/[\d.]+/g)||[]).forEach(function(v,j){w[c0+j]=+v;});k+=2;}
            else{var c1=+tk[k+1], wv=+tk[k+2];if(c1-c0<70000){for(var c=c0;c<=c1;c++){w[c]=wv;}}k+=3;}
          }
        }
        return {zweiByte:true,breite:function(code){return w[code]!=null?w[code]:dw;}};
      }
      var erst=+((/\/FirstChar\s+(\d+)/.exec(dict)||[])[1]||0);
      (arrayText(dict,'Widths').match(/[\d.]+/g)||[]).forEach(function(v,j){w[erst+j]=+v;});
      return {zweiByte:false,breite:function(code){return w[code]!=null?w[code]:500;}};
    }
    function schriften(seite){
      var res=/\/Resources\s*<</.test(seite.dict)?seite.dict:((ref(seite.dict,'Resources')||{}).dict||'');
      /* geerbte Ressourcen aus dem Seitenbaum */
      if(!/\/Font/.test(res)){var p=ref(seite.dict,'Parent');while(p&&!/\/Font/.test(res)){res=/\/Resources\s*<</.test(p.dict)?p.dict:((ref(p.dict,'Resources')||{}).dict||'');p=ref(p.dict,'Parent');}}
      var fd=/\/Font\s*<<([\s\S]*?)>>/.exec(res), fr=fd?fd[1]:(((ref(res,'Font')||{}).dict)||'');
      var f={}, re=/\/([^\s\/]+)\s+(\d+)\s+\d+\s+R/g, m;
      while((m=re.exec(fr))){var fo=o[+m[2]];if(!fo){continue;}var tu=ref(fo.dict,'ToUnicode'), br=breiten(fo);f[m[1]]={nr:fo.nr,cmapObj:tu,breite:br.breite,zweiByte:br.zweiByte};}
      return f;
    }
    var text=[];
    return seiten.reduce(function(p,seite){
      return p.then(function(){
        var fonts=schriften(seite);
        var cm=Object.keys(fonts).map(function(k){var x=fonts[k];if(!x.cmapObj){return Promise.resolve();}
          if(cmaps[x.cmapObj.nr]){x.cmap=cmaps[x.cmapObj.nr];return Promise.resolve();}
          return stromText(x.cmapObj).then(function(t){x.cmap=cmaps[x.cmapObj.nr]=cmapLesen(t);});});
        return Promise.all(cm).then(function(){
          var c=/\/Contents\s*\[([^\]]*)\]/.exec(seite.dict), l=[];
          if(c){var re=/(\d+)\s+\d+\s+R/g,k;while((k=re.exec(c[1]))){l.push(o[+k[1]]);}}else{var r1=ref(seite.dict,'Contents');if(r1){l.push(r1);}}
          return Promise.all(l.map(stromText)).then(function(teile){text.push(inhaltText(teile.join('\n'),fonts));});
        });
      });
    },Promise.resolve()).then(function(){return text.join('\n\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();});
  });
}

/* ---------- Datei → Text ---------- */
function dateiText(datei){
  var name=String(datei.name||'').toLowerCase();
  return datei.arrayBuffer().then(function(buf){
    if(/\.pdf$/.test(name)||datei.type==='application/pdf'){return pdfText(buf).then(function(t){return {text:t,buf:buf};});}
    if(/\.docx$/.test(name)){if(!window.CDSE_FICHE||!window.CDSE_FICHE.docxText){throw new Error('Word-Dateien kann diese Hub-Datei nicht lesen.');}return window.CDSE_FICHE.docxText(buf).then(function(t){return {text:t,buf:buf};});}
    if(/\.doc$/.test(name)){throw new Error('Alte Word-Dateien (.doc) kann der Hub nicht lesen. Bitte als .docx oder PDF speichern – oder den Text einfügen.');}
    if(/\.(txt|text|md)$/.test(name)||/^text\//.test(datei.type)){return {text:new TextDecoder().decode(buf),buf:buf};}
    throw new Error('Diese Dateiart kann der Hub nicht lesen. Möglich sind PDF, Word (.docx) und Text.');
  });
}

/* =====================================================================
   Erkennen: Vorschläge, die das Team bestätigt
   ---------------------------------------------------------------------
   Grundsatz: Vorausgewählt wird nur, was eindeutig als Diagnose oder
   Verdacht des Kindes im Text steht. Im Zweifel – verneint, widersprüchlich,
   nur in der Fragestellung, bei einem Familienmitglied, nur als Untersuchung
   erwähnt – wird nichts vorausgewählt; der Dialog zeigt die Belegsätze.
   Gearbeitet wird je Satz: Ein einfacher Zeilenumbruch mitten im Satz
   (typisch für PDFs) gehört zum Satz, Leerzeilen und Aufzählungen trennen.
   Ein Punkt vor einer Ziffer (F84.0, 2.5 mg) oder in einer Abkürzung
   (V. a., z. B., Dr. med.) beendet keinen Satz.
   ===================================================================== */
var BU='a-zäöüßàâæçéèêëîïôûùÿœ';   /* Buchstaben für Wortgrenzen – auch Umlaute und Französisch */
/* Wörter als regulärer Ausdruck mit Wortgrenzen: „ohne“ trifft nicht in „wohnen“ */
function wortRe(w,f){return new RegExp('(?:^|[^'+BU+'])('+w+')(?!['+BU+'])',f||'gi');}
function treff(m){var e=m.index+m[0].length;return {i:e-m[1].length,e:e};}
function suche(re,s){re.lastIndex=0;var m=re.exec(s);return m?treff(m):null;}
function letzte(re,s){re.lastIndex=0;var m,l=null;while((m=re.exec(s))){l=treff(m);if(!m[0].length){re.lastIndex++;}}return l;}
/* Verneinung vor der Fundstelle – gilt für den ganzen Satzteil: „Kein Hinweis auf Autismus oder ADHS“ */
var NEG_VOR=wortRe('kein|keine|keinen|keiner|keinem|keines|keinerlei|nicht|nichts|weder|nie|niemals|ausgeschlossen|verneint|pas de|pas d(?=[\'’])|aucune?|ni|jamais|no|not|never|neither|nor|negative for|negativ für|ruled out|excluded');
/* … nur bis zum nächsten Verb: „Nach Ausschluss organischer Ursachen besteht eine ADHS“ */
var NEG_VOR_NG=wortRe('ausschluss|ausschluß|ohne|sans|without|absence de|absence d(?=[\'’])|absence of|frei von');
var VERB=wortRe('besteht|bestehen|bestand|bestanden|liegt|liegen|lag|lagen|zeigt|zeigen|zeigte|zeigten|ergibt|ergeben|ergab|ergaben|findet|finden|fand|fanden|hat|haben|hatte|hatten|ist|sind|war|waren|wird|werden|wurde|wurden|leidet|leiden|litt|imponiert|imponieren|spricht|sprechen|deutet|deuten|weist|weisen|présente|présentait|souffre|est|sont|était|montre|has|have|had|is|are|was|were|shows|showed');
/* Verneinung nach der Fundstelle: „Eine ADHS liegt nicht vor“, „kann nicht gestellt werden“, „n'est pas retenu“ */
var NEG_NACH=wortRe('ausgeschlossen|ausgeräumt|entkräftet|widerlegt|nicht bestätigt|nicht bestätigen|nicht zu bestätigen|nicht erhärtet|nicht erfüllt|nicht gestellt|nicht (?:sicher |eindeutig )?(?:diagnostiziert|festgestellt|nachgewiesen|nachweisbar|feststellbar|vorhanden|gegeben|beobachtet|beobachtbar|erkennbar|zu erkennen|zu beobachten|zu finden|zu sehen)|nicht vor|(?:besteht|bestehen|bestand|bestanden) nicht|(?:ergab|ergaben|ergibt|ergeben|zeigte|zeigten|zeigt|zeigen|fand|fanden|findet|finden|bestätigte|bestätigten|erhärtete|erhärteten) sich nicht|sich (?:dafür |hierfür |dabei )?keine?|unauffällig|unwahrscheinlich|nicht wahrscheinlich|verneint|negativ|nein|keine? (?:auffälligkeiten|hinweise?|anzeichen|symptome|anhalt|befund)|exclue?s?|écartée?s?|(?:pas|non) retenue?s?|absente?s?|ruled out|excluded|not confirmed|not present|denied|unlikely|peu probable|improbable');
/* … direkt dahinter: „Suizidalität: keine“, „ADHS nein“; Frage und Antwort: „ADHS? Nein.“ */
var NEG_KURZ=new RegExp('^\\s*(?:[:=–-]\\s*)?(?:kein|keine|nein|negativ|verneint|unauffällig|ø|none|non|aucune?|absente?)(?!['+BU+'])','i');
var FRAGE_NEIN=new RegExp('^[^.;]{0,30}\\?\\s*(?:nein|no|non|negativ|keine?|verneint)(?!['+BU+'])','i');
/* Verdacht, der vor der Verneinung zählt: „ADHS kann nicht ausgeschlossen werden“ */
var VERD_ZUERST=wortRe('nicht (?:sicher |mit sicherheit |eindeutig |ganz |vollständig )?(?:ausgeschlossen|auszuschließen|ausschließbar)|nicht unwahrscheinlich|à exclure|à éliminer|ne (?:peut|pouvant|pouvait) (?:pas )?être (?:exclue?|écartée?)|non exclue?|cannot be (?:ruled out|excluded)|can[\'’]t be ruled out|not (?:be )?ruled out|not excluded');
var VERD_VOR=wortRe('verdacht|verdachtsdiagnosen?|verdachtsweise|v\\.\\s?a\\.|vd\\.\\s?a\\.|dd|differentialdiagnos\\w*|differenzialdiagnos\\w*|möglich|mögliche[nrs]?|möglicherweise|wahrscheinlich|wahrscheinliche[nrs]?|wahrscheinlichkeit|vermutlich|vermutete?[nrs]?|fraglich|fragliche[nrs]?|hinweise? auf|anhaltspunkte? für|suspicion|suspecte?|suspectée?s?|hypothèse|probable|possible|évoquant|évocat(?:eur|rice)|suspected|likely|query');
var VERD_NACH=wortRe('verdacht\\w*|v\\.\\s?a\\.|vd\\.\\s?a\\.|fraglich\\w*|vermutet|möglich|wahrscheinlich|zu erwägen|erwogen|in betracht|differentialdiagnos\\w*|differenzialdiagnos\\w*|zu diskutieren|zu bestätigen|(?:muss|müsste|sollte|soll) (?:noch )?bestätigt werden|noch bestätigt werden|à confirmer|à préciser|suspectée?s?|suspected|to be confirmed|possible|probable|likely');
/* Bestätigt: „Der Verdacht auf eine ADHS hat sich bestätigt“ ist eine Diagnose */
var BESTAETIGT=wortRe('(?:hat sich|haben sich|wurde|wurden|konnte|konnten|ist|sind) (?:\\S+ ){0,3}?bestätigt|bestätigte sich|bestätigen sich|(?:est|a été|fut) confirmée?s?|(?:was|has been|is) confirmed');
/* Nur Untersuchung, Abklärung oder Behandlung: „Wir empfehlen eine ADHS-Diagnostik“ ist keine Diagnose */
var TEST_ZUERST=wortRe('zum ausschluss|zum ausschluß|zur abklärung|zur weiteren abklärung|ausschlussdiagnostik|pour exclure|afin d[\'’]exclure|to rule out|rule out');
var TEST_VOR=wortRe('diagnostik|testung|screening|abklärung|untersuchung auf|untersuchung hinsichtlich|untersuchung bezüglich|abzuklären|evaluation|bilan|dépistage|évaluation|assessment');
var TEST_NACH=wortRe('zu klären|abzuklären|in abklärung|wird abgeklärt|abklärung|diagnostik|à évaluer|à investiguer|to be assessed|to be evaluated');
var TEST_WORT=/diagnostik|abklärung|abklaerung|screening|test|fragebogen|sprechstunde|ambulanz|therap|training|gruppe|beratung|schulung|zentrum|station|evaluation|bogen|skala|verfahren|pädagog|paedagog/;
/* Diagnose-Zusammenhang im Satz: „Diagnose(n):“, „diagnostiziert“, ICD-Code – nicht „Diagnostik“ */
var DIAG_SATZ=new RegExp('(?:^|[^'+BU+'])(?:diagnosen?\\s*:|diagnostiziert\\w*|die diagnose|eine diagnose|diagnos[ie]s\\s*:|diagnostics?\\s*:|diagnostic (?:de|d[\'’]|retenu|posé)|leidet (?:an|unter)|litt (?:an|unter)|souffre d|présente (?:un|une|des)(?!['+BU+'])|besteht (?:ein|eine|der|die)(?!['+BU+'])|es besteht|(?:liegt|liegen) .{0,50}[^'+BU+']vor(?!['+BU+'])|kriterien .{0,40}erfüllt|erfüllt .{0,25}kriterien|meets (?:the )?criteria|diagnosed)','i');
var ICD=/(?:^|[^A-Za-z0-9])(?:[FZ]\d{2}(?:\.\d{1,2})?|6[A-E]\d{2})(?![0-9])/;
var CODE_KLAMMER=/^\s*\(\s*(?:ICD[- ]?1[01]\s*:?\s*)?(?:[FZ]\d{2}(?:\.\d{1,2})?|6[A-E]\d{2}(?:\.[0-9A-Z]{1,2})?)\s*\)/i;
var ICD_ANFANG=/^(?:[FZ]\d{2}|6[A-E]\d{2})/i;   /* Fundstelle ist ein ICD-Code (nicht ein Name) */
/* Neuer Satzteil: Gegensatz („…, jedoch ADHS“), neues Subjekt („…, es besteht …“), „… und hat …“ */
var GEGEN='jedoch|aber|sondern|allerdings|dagegen|hingegen|wohingegen|vielmehr|stattdessen|trotzdem|dennoch|mais|cependant|toutefois|par contre|en revanche|néanmoins|but|however|whereas|although';
var TEIL_NEU=[wortRe(GEGEN),new RegExp(',\\s*(es|er|sie|das kind|zudem|außerdem|daneben|zusätzlich|ferner|il|elle|on|it|he|she|there)(?!['+BU+'])','gi'),
  wortRe('(?:und|oder|sowie|et|and)\\s+(?:\\S+\\s+)?(?:besteht|liegt|zeigt|zeigte|ergab|hat|hatte|ist|war|wurde|wird|leidet|kann|konnte|présente|souffre|est|a|has|is|shows)')];
var TEIL_ENDE=[wortRe(GEGEN+'|sonst|ansonsten|übrigen|außerdem|zudem|ferner|zusätzlich|par ailleurs|sinon|otherwise|additionally'),new RegExp(',\\s*(es|er|sie|das kind|il|elle|on|it|he|she|there)(?!['+BU+'])','gi')];
/* Aufzählung zwischen zwei Fundstellen: „ADHS und Autismus ausgeschlossen“ */
var KOORD=/^\s*,?\s*(?:und|oder|sowie|bzw\.?|beziehungsweise|\/|&|et|ou|and|or|noch|ni|wie auch)\s*$/i;
/* Familie – auch als Wortteil (Kindsmutter, Stiefvater, Halbbruder), nicht Muttersprache, Elterntraining, „Eltern“ */
var FAMILIE=new RegExp('(?:^|[^'+BU+'])(?:['+BU+']*(?:mutter|mütter|vater|väter|bruder|brüder|schwester|geschwister|elternteil)(?:s|n|en|e|es)?|(?:ur|stief|groß|gross)?(?:oma|opa|omi|opi|mama|papa|mami|papi|tante|onkel)s?|großeltern|grosseltern|beide eltern|beiden eltern|bei den eltern|cousine?n?|familie|familien|familiär\\w*|familienanamnese|mütterlicherseits|väterlicherseits|maman|m[èe]re|p[èe]re|fr[èe]re|s(?:œ|oe)ur|oncle|famille|parent|antécédents familiaux|mother|father|brother|sister|mom|mum|dad|sibling|aunt|uncle|grand(?:mother|father|ma|pa)|family)(?!['+BU+'])','i');
var FAMILIE_KURZ=/(?:^|[^A-Za-z])(?:KM|KV|KE|KiMu|KiVa)(?![A-Za-z])/;
/* „nicht näher bezeichnet“, „nicht-suizidal“ usw. sind keine Verneinung */
var MASKE=/nicht näher bezeichnet\w*|ohne nähere angaben?|o\.\s?n\.\s?a\.|n\.\s?n\.\s?b\.|non précisée?s?|sans précision|not otherwise specified|nicht[- ]?suizidal\w*|nicht[- ]?organisch\w*|non[- ]suicidaire\w*|non[- ]suicidal\w*|non[- ]organique\w*/gi;
var MEDIKAMENTE=[['Methylphenidat',/methylphenidat|ritalin|medikinet|concerta|equasym|kinecteen|rubifen/i],['Lisdexamfetamin',/lisdexamfetamin|elvanse/i],['Dexamfetamin',/dexamfetamin|attentin/i],
  ['Atomoxetin',/atomoxetin|strattera/i],['Guanfacin',/guanfacin|intuniv/i],['Clonidin',/clonidin|catapres/i],['Risperidon',/risperidon|risperdal/i],['Aripiprazol',/aripiprazol|abilify/i],
  ['Quetiapin',/quetiapin|seroquel/i],['Olanzapin',/olanzapin|zyprexa/i],['Fluoxetin',/fluoxetin|fluctine|prozac/i],['Sertralin',/sertralin|zoloft/i],['Escitalopram',/escitalopram|cipralex|seroplex/i],
  ['Melatonin',/melatonin|circadin|slenyto/i],['Valproat',/valpro|depakin|orfiril/i],['Levetiracetam',/levetiracetam|keppra/i],['Lamotrigin',/lamotrigin|lamictal/i],['Lithium',/lithium/i]];
/* Stand der Medikation je Satzteil – vorausgewählt wird nur aktuelle Medikation */
var MED_WIE=wortRe('wie zuvor|wie bisher|wie gehabt|unverändert|unveränderte[nrs]?|inchangée?s?|as before|unchanged');
var MED_AB=wortRe('abgesetzt|beendet|ausgeschlichen|gestoppt|pausiert|früher|frühere[nrs]?|ehemals|ehemalige[nrs]?|vormals|damals|zuvor|nicht mehr (?:ein)?genommen|nicht mehr gegeben|nicht mehr verordnet|nicht mehr(?=[\\s.,;:!)|]*$)|kein\\w*\\s+(?:\\S+\\s+){0,4}?mehr|arrêtée?s?|interrompue?s?|auparavant|anciennement|discontinued|stopped|previously|formerly');
var MED_UM=/(?:umstellung|umgestellt|wechsel|gewechselt)\s+von\s*$/i;   /* „Umstellung von Ritalin auf …“ */
var MED_NEIN=wortRe('abgelehnt|lehnen|lehnt|lehnten|verweigert|verweigern|nicht gewünscht|refusée?s?|refus|declined|refused');
var MED_JA_STARK=wortRe('fortgeführt|fortgesetzt|fortführen|fortsetzen|fortführung|fortsetzung|beibehalten|beibehaltung|weiterhin|weiter mit|weiter gegeben|weitergegeben|weiter eingenommen|weitergeführt|weiterführen|weiterführung|dosiserhöhung|dosisreduktion|dosisanpassung|aufdosierung|aufdosiert|erhöht|reduziert|angepasst|poursuivie?s?|poursuite|maintenue?s?|continued|continue');
var MED_EMPF=wortRe('empfehlen|empfohlen|empfiehlt|empfehlung|erwägen|erwogen|erwägung|betracht|therapieversuch|behandlungsversuch|versuch|probatorisch|könnte|sollte|sollten|wäre|indiziert|angeraten|vorgeschlagen|geplant|beginnen|einleiten|besprochen|diskutiert|option|ggf|gegebenenfalls|eventuell|evtl|recommandée?s?|recommandons|proposée?s?|proposons|envisag\\w*|à discuter|à introduire|introduction|recommended|consider|suggested|trial|could|should');
var MED_JA=wortRe('aktuell|aktuelle[nrs]?|derzeit|derzeitige[nrs]?|zurzeit|momentan|seit|erhält|bekommt|nimmt|eingestellt auf|begonnen|gestartet|eingeleitet|eindosiert|täglich|tgl|morgens|mittags|abends|actuellement|prend|reçoit|currently|takes|daily');
var MED_UNTER=/(?:^|\s)unter\s+(?:der\s+)?(?:(?:medikation|behandlung|therapie)\s+mit\s+)?$/i;   /* „unter Methylphenidat …“ */
var DOSIS=/\d+(?:[.,]\d+)?\s?(?:mg|µg|mcg|ml)(?![a-zäöü])/i, DOSIS_ENDE=/\d+(?:[.,]\d+)?\s?(?:mg|µg|mcg|ml)\s*$/i, DOSIS_SCHEMA=/(?:^|\s)\d(?:[.,]5)?-\d(?:[.,]5)?-\d(?:[.,]5)?(?:\s|$)/;
var EMPF_KOPF=/^\s*(empfehlung(en)?|therapieempfehlung(en)?|weiteres vorgehen|procédure|procedure|recommandation(s)?|recommendation(s)?|vorschl(ä|a)ge|conseils?|propositions?|plan de traitement)\b[^\n]{0,40}:?\s*$/i;
var EMPF_ZEILE=/^\s*(?:empfehlung(?:en)?|therapieempfehlung(?:en)?|weiteres vorgehen|recommandations?|recommendations?)\s*:\s*(.+)$/i;
var MONATE={januar:1,jänner:1,janvier:1,january:1,februar:2,février:2,fevrier:2,february:2,märz:3,maerz:3,mars:3,march:3,april:4,avril:4,mai:5,may:5,juni:6,juin:6,june:6,juli:7,juillet:7,july:7,august:8,août:8,aout:8,september:9,septembre:9,oktober:10,octobre:10,october:10,november:11,novembre:11,dezember:12,décembre:12,decembre:12,december:12};
function pad(n){return (n<10?'0':'')+n;}
/* Ein Datum direkt nach „geb.“, „geboren“, „né(e) le“ ist ein Geburtsdatum, kein Berichtsdatum */
var GEB=/(?:geb\.|geboren(?:\s+am)?|geburtsdatum|geb\.-?datum|(?:^|[\s,(])née?(?:\(e\))?(?:\s+le)?|date de naissance|born(?:\s+on)?|date of birth|d\.?o\.?b\.?|\*)\s*:?\s*(?:am\s+|le\s+|on\s+)?$/i;
function daten(text){
  var o=[], m, re=/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/g;
  function geb(i){return GEB.test(text.slice(Math.max(0,i-30),i));}
  while((m=re.exec(text))){var j=+m[3];if(j<100){j+=2000;}var mo=+m[2], t=+m[1];if(mo>=1&&mo<=12&&t>=1&&t<=31&&j>=1990&&j<=2100){o.push({iso:j+'-'+pad(mo)+'-'+pad(t),index:m.index,geb:geb(m.index)});}}
  var re2=/\b(\d{1,2})\.?\s+([A-Za-zäöüéèûôÄÖÜ]+)\s+(\d{4})\b/g;
  while((m=re2.exec(text))){var mm=MONATE[m[2].toLowerCase()];if(mm){o.push({iso:m[3]+'-'+pad(mm)+'-'+pad(+m[1]),index:m.index,geb:geb(m.index)});}}
  return o.sort(function(a,b){return a.index-b.index;});
}
/* ---------- Sätze ---------- */
var ABK=/^(?:[a-zäöüß]|vd|dr|med|dipl|psych|päd|paed|prof|geb|ca|bzw|ggf|evtl|sog|nr|str|tel|hr|fr|frau|mme|mr|mrs|ms|st|vs|bzgl|inkl|incl|max|min|mind|tgl|lt|gem|vgl|usw|etc|kl|jan|feb|mär|apr|jun|jul|aug|sep|sept|okt|nov|dez|diagn|ärztl|psychol|therap|ambul|stat|dres|pd|oä|oa|chr|lfd|ggü|entspr|bspw|zzgl|abs|kap|ziff|anm)$/i;
var AUFZ=/^(?:[-•*·–▪◦‣]\s*|\(?\d{1,2}[.)]\s+|\(?[a-h]\)\s+)/;   /* Aufzählungszeichen, „1.“, „1)“, „a)“ */
var VERBINDER=/^(?:der|die|das|des|dem|den|ein|eine|einer|eines|einem|einen|und|oder|sowie|mit|ohne|an|auf|bei|von|vom|zu|zur|zum|im|in|für|über|unter|nach|wegen|aufgrund|durch|gegen|seit|bzw|als|wie|dass|ob|sich|sehr|eher|nicht|kein|keine|keinen|keiner|de|du|la|le|les|une|un|d|et|ou|avec|sans|pour|par|sur|dans|en|of|the|and|with|a|an|or|to|for)$/i;
function satzPunkt(t,i){
  var nach=t.charAt(i+1);
  if(/\d/.test(nach)||(nach&&!/[\s"“”'’)\]]/.test(nach))){return false;}           /* F84.0, 2.5 mg, z.B. */
  var wort=(/([A-Za-zÀ-ÿ]+)$/.exec(t.slice(Math.max(0,i-12),i))||[])[1]||'';
  if(wort&&ABK.test(wort)){return false;}                                            /* V. a., Dr. med., geb. */
  if(/(?:^|[^\d.])\d{1,2}$/.test(t.slice(Math.max(0,i-4),i))){return false;}       /* „3. Klasse“, „12. März“ */
  return !/^[a-zäöüßàâçéèêëîïôûù]/.test(t.slice(i+1,i+30).replace(/^[\s"“”'’)\]]+/,''));
}
/* Zeilenumbruch: Satzgrenze (hart) oder mitten im Satz? „…Erkrankung der Mutter⏎(rezidivierende …)“ gehört zusammen */
function harterUmbruch(t,i){
  var z1=t.slice(t.lastIndexOf('\n',i-1)+1,i).replace(/\s+$/,''), e=t.indexOf('\n',i+1), z2=t.slice(i+1,e<0?t.length:e).replace(/^\s+/,'');
  if(!z1||!z2||/[.!?;:]$/.test(z1)||AUFZ.test(z2)){return true;}                      /* Leerzeile, Satzende, Aufzählung */
  if(/[-,(\/]$/.test(z1)||/^[a-zäöüßàâçéèêëîïôûù(),]/.test(z2)){return false;}
  var w=(/([A-Za-zÀ-ÿ']+)$/.exec(z1)||[])[1]||'';
  if(VERBINDER.test(w)){return false;}                                                   /* „leidet an einer⏎Depression“ */
  if((z1.length<45&&abschnittArt(z1))||!/[a-zäöüß]/.test(z1)||/^[A-ZÄÖÜ][^:\n]{0,30}:\s/.test(z2)){return true;}   /* Überschrift, „Mutter: …“ */
  return !/^[a-zäöüßàâçéèêëîïôûù]/.test(w);                                             /* klein am Zeilenende: der Satz geht weiter */
}
function saetze(t){
  var l=[], a=0, n=t.length;
  function zu(e,weiter){if(e>a){l.push({a:a,e:e});}a=weiter;}
  for(var i=0;i<n;i++){
    var c=t.charAt(i);
    if(c==='\n'){if(harterUmbruch(t,i)){zu(i,i+1);}}
    else if(c===';'||c==='!'||c==='?'){zu(i+1,i+1);}
    else if(c==='.'&&satzPunkt(t,i)){zu(i+1,i+1);}
  }
  zu(n,n);
  return l;
}
function satzBei(S,i){var lo=0, hi=S.length-1;while(lo<=hi){var m=(lo+hi)>>1;if(S[m].e<=i){lo=m+1;}else if(S[m].a>i){hi=m-1;}else{return S[m];}}return {a:i,e:i+1};}
function satzText(t,s,i){
  var a=s.a, e=s.e;if(e-a>240&&i!=null){a=Math.max(s.a,i-110);e=Math.min(s.e,a+240);}
  return ((a>s.a?'… ':'')+t.slice(a,e)+(e<s.e?' …':'')).replace(/\s+/g,' ').trim().replace(/^[-•*·–]\s*/,'');
}

/* ---------- Abschnitte: Fragestellung, Diagnosen/Beurteilung, Familie, Medikation, andere ---------- */
var UEBER_FRAGE=/^\s*(?:fragestellung(?:en)?|frage|vorstellungsgrund|vorstellungsanlass|anlass|überweisungsgrund|zuweisungsgrund|zuweisung|überweisung|auftrag|untersuchungsauftrag|motif|demande|questions? posées?|reason for referral|referral)(?![a-zäöüß])/i;
var UEBER_DIAG=/^\s*(?:diagnosen?|verdachtsdiagnosen?|arbeitsdiagnosen?|entlassungsdiagnosen?|hauptdiagnosen?|nebendiagnosen?|klinische diagnosen?|diagnos(?:is|es)|diagnostics?|diagnostische (?:einschätzung|beurteilung|zusammenfassung)|conclusions?|synth[èe]se|beurteilung|zusammenfassung|zusammenfassende beurteilung|epikrise|impression clinique|assessment|summary)(?![a-zäöüß])/i;
var UEBER_FAMILIE=/^\s*(?:familienanamnese|familiäre anamnese|familie|familiensituation|antécédents familiaux|famille|family history)(?![a-zäöüß])/i;
var UEBER_MED=/^\s*(?:medikation|aktuelle medikation|medikamente|médication|traitement(?: actuel| médicamenteux)?|medication|current medication)(?![a-zäöüß])/i;
var UEBER_ANDERE=/^\s*(?:empfehlung|therapieempfehlung|weiteres vorgehen|procédure|recommandation|recommendation|behandlung|therapie|anamnese|eigenanamnese|sozialanamnese|vorgeschichte|antécédents|verlauf|befund|psychischer befund|diagnostik|testergebnisse|untersuchung)/i;
function abschnittArt(z){
  z=String(z||'').replace(/:\s*$/,'');
  return UEBER_FRAGE.test(z)?'frage':(UEBER_DIAG.test(z)?'diagnose':(UEBER_FAMILIE.test(z)?'familie':(UEBER_MED.test(z)?'medikation':(UEBER_ANDERE.test(z)?'andere':''))));
}
/* Abschnitt eines Satzes: eigene Bezeichnung („Beurteilung: …“) oder die letzte Überschrift darüber */
function abschnitt(t,s){
  var m=/^\s*(?:[-•*·–]\s*)?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .\/-]{0,40}?)\s*:/.exec(t.slice(s.a,Math.min(s.e,s.a+60)));
  if(m){var k=abschnittArt(m[1]);if(k){return k;}}
  var ende=t.lastIndexOf('\n',s.a-1), grenze=Math.max(0,s.a-4000);
  while(ende>grenze){
    var anf=t.lastIndexOf('\n',ende-1)+1, z=t.slice(anf,ende).trim();
    if(z&&z.length<70&&(/:$/.test(z)||(z.length<45&&!/[.!?;,]/.test(z)&&abschnittArt(z)))){return abschnittArt(z)||'andere';}
    ende=anf-1;
  }
  return '';
}

/* ---------- Fundstellen einordnen ---------- */
function wortEnde(t,e){
  while(e<t.length){var c=t.charAt(e);if(/[A-Za-zÀ-ÿ0-9]/.test(c)||(c==='-'&&/[A-Za-zÀ-ÿ]/.test(t.charAt(e+1)))){e++;}else{break;}}
  return e;
}
function teilVor(v){var ab=0;TEIL_NEU.forEach(function(re){var x=letzte(re,v);if(x&&x.e>ab){ab=x.e;}});return v.slice(ab);}
/* „…, jedoch nicht bestätigt“: folgt auf den Gegensatz gleich eine Verneinung, gehört sie noch zur Fundstelle
   (nicht aber „…, jedoch keine Hinweise auf Epilepsie“ – das ist etwas Neues) */
var NEG_FOLGT=new RegExp('^\\s*,?\\s*(?:nicht|ausgeschlossen|verneint|unauffällig|negativ|pas|non|not|no|kein\\w*(?!\\s+(?:hinweise?|anhalt\\w*|anzeichen|zeichen)\\s))(?!['+BU+'])','i');
function teilNach(v){
  var bis=v.length;
  TEIL_ENDE.forEach(function(re){re.lastIndex=0;var m;while((m=re.exec(v))){var x=treff(m);if(!NEG_FOLGT.test(v.slice(x.e))){if(x.i<bis){bis=x.i;}break;}if(!m[0].length){re.lastIndex++;}}});
  return v.slice(0,bis);
}
/* Jede Fundstelle eines Profils: stand = diagnose, verdacht, aus (verneint), test (nur Untersuchung),
   familie (bei jemand anderem) oder erwaehnt; dazu der Abschnitt und der Satz als Beleg */
function analysieren(t,extra,S){
  var KO=window.CDSE_KOMPASS, funde=(KO&&KO.fundstellen?KO.fundstellen(t):[]).concat(extra||[]);
  if(!funde.length){return [];}
  S=S||saetze(t);
  var ana=t.replace(MASKE,function(m){return m.replace(/\S/g,'x');}).replace(/\s/g,' ');   /* Zeilenumbrüche und geschützte Leerzeichen → Leerzeichen (gleiche Länge) */
  funde=funde.map(function(f){
    var code=ICD_ANFANG.test(f.text), we=wortEnde(t,f.index+f.text.length);
    if(code){we+=(/^\.[0-9A-Z]{1,2}(?![0-9A-Za-z])/.exec(t.slice(we))||[''])[0].length;}   /* „F90.0“: der ganze Code */
    var x={id:f.id,index:f.index,wortEnde:we,ende:we,rest:t.slice(f.index+f.text.length,we).toLowerCase(),satz:satzBei(S,f.index),code:code};
    var ck=CODE_KLAMMER.exec(t.slice(we,we+40));if(ck){x.ende=we+ck[0].length;x.mitCode=true;}   /* „ADHS (F90.0)“ ist eine Angabe */
    return x;
  }).sort(function(a,b){return (a.index-b.index)||(a.ende-b.ende);});
  funde.forEach(function(g){funde.forEach(function(f){if(f.mitCode&&!g.in&&g!==f&&g.index>=f.wortEnde&&g.index<f.ende){g.in=f;}});});
  var frei=funde.filter(function(f){return !f.in;});
  frei.forEach(function(f,k){
    var j, g;
    for(j=k-1;j>=0;j--){g=frei[j];if(g.satz!==f.satz){break;}if(g.ende<=f.index){f.vor=g;break;}}
    for(j=k+1;j<frei.length;j++){g=frei[j];if(g.satz!==f.satz){break;}if(g.index>=f.ende){f.nach=g;break;}}
  });
  /* ICD-Code mit Titel: „F90.0 Einfache Aktivitäts- und Aufmerksamkeitsstörung“ ist eine Angabe (wie „ADHS (F90.0)“) –
     „Verdacht auf“ davor und „(Verdacht)“ dahinter gelten für Code und Titel. Titel = dasselbe Profil nach dem Code,
     dazwischen kein Satzzeichen und kein Wort, das selbst etwas einordnet */
  frei.forEach(function(c){
    if(!c.code||c.kopf){return;}
    var ende=c.ende;
    frei.forEach(function(g){
      if(g.index<ende||g.code||g.kopf||g.id!==c.id||g.satz!==c.satz){return;}
      var zw=ana.slice(ende,g.index);
      if(zw.length>80||/[,;:)\]!?]/.test(zw)||/verdacht/.test(g.rest)||TEST_WORT.test(g.rest)||[VERD_VOR,VERD_NACH,NEG_VOR,NEG_VOR_NG,TEST_VOR].some(function(re){return suche(re,zw);})){return;}
      g.kopf=c;c.titel=g;ende=g.ende;
    });
  });
  /* Aufzählung: „ADHS und Autismus“, „Autismus, ADHS oder …“ – nach einer Angabe mit ICD-Code trennt das Komma */
  function reihe(v,f){var zw=ana.slice(v.ende,f.index);return KOORD.test(zw)||(!v.mitCode&&!v.kopf&&!v.titel&&/^\s*,\s*$/.test(zw));}
  function vorStart(f,n){if(f.kopf&&n<20){return vorStart(f.kopf,n+1);}var v=f.vor;if(!v||n>20){return f.satz.a;}if(reihe(v,f)){return vorStart(v,n+1);}var k=ana.slice(v.ende,f.index).lastIndexOf(',');return k>=0?v.ende+k+1:v.ende;}
  function nachText(f,n){
    if(f.titel&&n<20){return nachText(f.titel,n+1);}   /* hinter dem Titel weiterlesen */
    var g=f.nach;
    /* g gehört zum Titel eines Codes, der nicht nach f beginnt („F90.1 Hyperkinetische Störung des Sozialverhaltens“): dieselbe Angabe */
    if(g&&n<20){if(reihe(f,g)||(g.kopf&&g.kopf.index<=(f.kopf||f).index)){return nachText(g,n+1);}var zw=ana.slice(f.ende,g.index), k=zw.lastIndexOf(',');return k>=0?zw.slice(0,k):zw;}
    var x=ana.slice(f.ende,Math.min(f.satz.e,f.ende+120)), c=x.indexOf(',');
    if(c>=0&&(f.mitCode||ICD.test(x.slice(0,c)))){x=x.slice(0,c);}   /* „ADHS (F90.0), Epilepsie ausgeschlossen“ */
    return x;
  }
  function info(s){
    if(!s.info){var x=t.slice(s.a,s.e).replace(/\s+/g,' '), ab=abschnitt(t,s);s.info={abschnitt:ab,familie:ab==='familie'||FAMILIE.test(x)||FAMILIE_KURZ.test(x),diag:ICD.test(x)||DIAG_SATZ.test(x)};}
    return s.info;
  }
  function stand(f){
    if(f.kopf){return f.kopf.stand||stand(f.kopf);}   /* Titel zum ICD-Code: wie der Code */
    var s=info(f.satz);if(s.familie){return 'familie';}
    var vor=teilVor(ana.slice(vorStart(f,0),f.index)), nach=teilNach(nachText(f,0)), nah=vor.slice(-70), x;
    if(suche(TEST_ZUERST,nah)){return 'test';}
    if(suche(VERD_ZUERST,nah)||suche(VERD_ZUERST,nach.slice(0,70))){return 'verdacht';}
    x=letzte(NEG_VOR,vor);if(x&&vor.length-x.e<=60){return 'aus';}
    x=letzte(NEG_VOR_NG,vor);if(x&&vor.length-x.e<=50&&!suche(VERB,vor.slice(x.e))){return 'aus';}
    if(NEG_KURZ.test(nach)||suche(NEG_NACH,nach.slice(0,70))||FRAGE_NEIN.test(ana.slice(f.ende,f.ende+40))){return 'aus';}
    if(suche(VERD_NACH,nach.slice(0,40))||/^[^.;]{0,15}\?/.test(nach)){return 'verdacht';}
    if(suche(BESTAETIGT,nach.slice(0,60))){return 'diagnose';}                    /* „Verdacht … hat sich bestätigt“ */
    x=letzte(VERD_VOR,vor);
    if(/verdacht/.test(f.rest)||(x&&vor.length-x.e<=60)){return 'verdacht';}
    x=letzte(TEST_VOR,vor);
    if(TEST_WORT.test(f.rest)||(x&&vor.length-x.e<=40&&!suche(VERB,vor.slice(x.e)))||suche(TEST_NACH,nach.slice(0,40))){return 'test';}
    return (/diagnose/.test(f.rest)||s.diag||s.abschnitt==='diagnose')?'diagnose':'erwaehnt';
  }
  frei.forEach(function(f){f.stand=stand(f);});
  funde.forEach(function(f){if(f.in){f.stand=f.in.stand;}});
  return funde.map(function(f){return {id:f.id,stand:f.stand,abschnitt:info(f.satz).abschnitt,index:f.index,satz:satzText(t,f.satz,f.index)};});
}
var STAND_NAME={diagnose:'Diagnose',verdacht:'Verdacht',aus:'verneint',test:'Untersuchung',familie:'Familie',erwaehnt:'erwähnt',frage:'Fragestellung'};
/* Je Profil zusammenfassen: art = diagnose, verdacht, unklar (widersprüchlich), erwaehnt oder aus.
   Widersprechen sich die Stellen, wird nichts vorausgewählt – außer: Eine Verneinung in Beurteilung
   oder Diagnosen gilt vor einem Verdacht; die Fragestellung allein ist keine Aussage des Berichts. */
function zusammenfassen(funde){
  var je={}, reihe=[];
  funde.forEach(function(f){if(!je[f.id]){je[f.id]=[];reihe.push(f.id);}je[f.id].push(f);});
  function mit(l,a){return l.filter(function(f){return f.stand===a;});}
  return reihe.map(function(id){
    var l=je[id], eigen=l.filter(function(f){return f.stand!=='familie';});
    var frage=eigen.filter(function(f){return f.abschnitt==='frage';}), rest=eigen.filter(function(f){return f.abschnitt!=='frage';});
    var pos=rest.filter(function(f){return f.stand==='diagnose'||f.stand==='verdacht';}), neg=mit(rest,'aus'), art, grund='', belege;
    if(pos.length&&neg.length){
      art=(!mit(pos,'diagnose').length&&neg.some(function(f){return f.abschnitt==='diagnose';}))?'aus':'unklar';
      belege=art==='aus'?neg.concat(pos,frage):pos.concat(neg,frage);
    }else if(pos.length){art=mit(pos,'diagnose').length?'diagnose':'verdacht';belege=mit(pos,art);}
    else if(neg.length){art='aus';belege=neg.concat(frage);}
    else if(frage.length){art='erwaehnt';grund='frage';belege=frage;}
    else if(rest.length){art='erwaehnt';grund=mit(rest,'test').length?'test':'';belege=rest;}
    else{art='erwaehnt';grund='familie';belege=l;}
    var gesehen={}, bl=[];
    belege.forEach(function(f){if(!gesehen[f.satz]&&bl.length<4){gesehen[f.satz]=1;bl.push({text:f.satz,stand:(f.abschnitt==='frage'&&f.stand!=='familie')?'frage':f.stand});}});
    return {id:id,art:art,grund:grund,beleg:bl.length?bl[0].text:'',belege:bl};
  });
}
/* Kurzer Text aus DS oder Datenbank einordnen (auch für den Kompass): [{id, art, grund, beleg}].
   fuer: Profil, um das es im Text geht (Details zu einem angekreuzten Feld im DS) */
function einordnen(text,fuer){
  var t=String(text||'').replace(/\r\n?/g,'\n'), extra=[];
  if(fuer){t='§: '+t;extra.push({id:fuer,index:0,text:'§'});}
  return zusammenfassen(analysieren(t,extra));
}

/* ---------- Medikation: je Nennung der eigene Satzteil ---------- */
function medStand(w){
  if(suche(MED_WIE,w)){return 'aktuell';}
  if(suche(MED_AB,w)){return 'abgesetzt';}
  if(suche(MED_NEIN,w)){return 'abgelehnt';}
  if(suche(MED_JA_STARK,w)){return 'aktuell';}
  if(suche(MED_EMPF,w)){return 'empfohlen';}
  if(DOSIS.test(w)||DOSIS_SCHEMA.test(w)||suche(MED_JA,w)){return 'aktuell';}
  return '';
}
function medikamenteLesen(t,S){
  var ana=t.replace(/\n/g,' '), funde=[];
  MEDIKAMENTE.forEach(function(md){var re=new RegExp(md[1].source,'gi'), m;while((m=re.exec(t))){funde.push({name:md[0],index:m.index,ende:wortEnde(t,m.index+m[0].length),satz:satzBei(S,m.index)});}});
  funde.sort(function(a,b){return a.index-b.index;});
  funde.forEach(function(f,k){
    var v=funde[k-1], n=funde[k+1];
    if(v&&(v.satz!==f.satz||v.ende>f.index)){v=null;}if(n&&(n.satz!==f.satz||n.index<f.ende)){n=null;}
    var vor=ana.slice(v?v.ende:f.satz.a,f.index), nach=ana.slice(f.ende,n?n.index:Math.min(f.satz.e,f.ende+80));
    if(v&&vor.lastIndexOf(',')>=0){vor=vor.slice(vor.lastIndexOf(',')+1);}   /* „Risperidon abgesetzt, Methylphenidat …“ */
    if(n&&nach.lastIndexOf(',')>=0){nach=nach.slice(0,nach.lastIndexOf(','));}
    vor=vor.slice(-60);
    var nah=nach.split(',')[0];
    f.dosis=((DOSIS.exec(nah)||DOSIS_ENDE.exec(vor)||[])[0]||'').replace(/\s+/g,' ');
    f.status=MED_UM.test(vor)?'abgesetzt':(medStand(vor+' | '+nah)||medStand(vor+' | '+nach)||((MED_UNTER.test(vor)||abschnitt(t,f.satz)==='medikation')?'aktuell':'erwaehnt'));
    f.beleg=satzText(t,f.satz,f.index);
  });
  /* je Wirkstoff eine Zeile: aktuelle Nennung vor abgesetzter („früher Ritalin … jetzt Medikinet 20 mg“) */
  var RANG={aktuell:0,abgesetzt:1,abgelehnt:2,empfohlen:3,erwaehnt:4}, je={}, reihe=[];
  funde.forEach(function(f){if(!je[f.name]){je[f.name]=[];reihe.push(f.name);}je[f.name].push(f);});
  return reihe.map(function(name){
    var x=je[name].slice().sort(function(a,b){return (RANG[a.status]-RANG[b.status])||((b.dosis?1:0)-(a.dosis?1:0))||(a.index-b.index);})[0];
    return {name:name,dosis:x.dosis,beleg:x.beleg,status:x.status,abgesetzt:x.status==='abgesetzt'};
  });
}

/* ---------- Empfehlungen: Punkte unter einer Überschrift wie „Empfehlungen“ ----------
   Entfernt werden nur Aufzählungszeichen und „1.“/„1)“ („2x wöchentlich“ bleibt), umbrochene
   Zeilen werden zusammengefügt, Seitenzahlen und ein wiederholter Briefkopf übersprungen. */
var SEITE=/^(?:[-–]\s*)?(?:seite|page|s\.)\s*\d+(?:\s*(?:von|of|sur|\/)\s*\d+)?(?:\s*[-–])?$|^[-–]?\s*\d{1,3}\s*[-–]?$|^\d{1,3}\s*\/\s*\d{1,3}$/i;
var GRUSS=/^(?:mit freundlichen|mit besten|freundliche grüße|beste grüße|viele grüße|hochachtungsvoll|cordialement|meilleures salutations|salutations|bien à vous|kind regards|best regards|sincerely|dr\.?\s?med|gez\.|i\.\s?a\.)/i;
var ORT_DATUM=/^[A-ZÄÖÜ][^,]{0,40},?\s+(?:den\s+)?\d{1,2}\.\d{1,2}\.\d{2,4}\s*$/;
function geht(a,b){   /* Zeile a geht in Zeile b weiter */
  if(/[.!?;:]$/.test(a)){return false;}
  if(/[-,(\/]$/.test(a)||/^[a-zäöüßàâçéèêëîïôûù(]/.test(b)){return true;}
  return VERBINDER.test((/([A-Za-zÀ-ÿ']+)$/.exec(a)||[])[1]||'');
}
function anfuegen(a,b){return (/[a-zäöüß]-$/.test(a)&&/^[a-zäöüß]/.test(b)&&!/^(?:und|oder|bzw|sowie)\b/.test(b))?a.slice(0,-1)+b:a+' '+b;}
function empfehlungenLesen(text){
  var z=text.split('\n').map(function(x){return x.trim();}), o=[], kopf={};
  z.filter(Boolean).slice(0,4).forEach(function(x){kopf[x.toLowerCase()]=1;});
  function dazu(t){t=t.replace(/\s+/g,' ').trim().slice(0,240);if(t.length>=8&&o.length<8&&o.indexOf(t)<0){o.push(t);}}
  for(var i=0;i<z.length&&o.length<8;i++){
    var ez=EMPF_ZEILE.exec(z[i]);
    if(ez){var t=ez[1];while(i+1<z.length&&z[i+1]&&!AUFZ.test(z[i+1])&&geht(t,z[i+1])){i++;t=anfuegen(t,z[i]);}dazu(t.replace(AUFZ,''));continue;}
    if(!EMPF_KOPF.test(z[i])){continue;}
    var akt=null, punkte=false, leer=false;
    for(var j=i+1;j<z.length;j++){
      var x=z[j];
      if(!x){leer=true;continue;}
      if(GRUSS.test(x)||ORT_DATUM.test(x)){break;}
      if(SEITE.test(x)||(j>8&&kopf[x.toLowerCase()])){continue;}             /* Seitenzahl, wiederholter Briefkopf */
      var neu=AUFZ.test(x);
      if(!neu&&/:\s*$/.test(x)&&x.length<60){break;}                          /* nächste Überschrift */
      if(!neu&&akt!==null&&leer&&punkte){break;}                              /* nach der Liste geht der Brief weiter */
      if(akt!==null&&!neu&&!leer&&(punkte||geht(akt,x))){akt=anfuegen(akt,x);continue;}   /* umbrochene Zeile */
      if(akt!==null){dazu(akt);}
      if(o.length>=8){akt=null;break;}
      akt=x.replace(AUFZ,'');punkte=punkte||neu;leer=false;
    }
    if(akt!==null){dazu(akt);}
    break;
  }
  return o;
}
function erkennen(text,d){
  text=String(text||'').replace(/\r\n?/g,'\n');
  var KO=window.CDSE_KOMPASS, S=saetze(text), res={profile:[],codes:[],medikamente:[],datum:'',von:'',art:'bericht',empfehlungen:[]};
  /* Diagnosen, Verdacht, Verneinung – vorausgewählt werden nur „diagnose“ und „verdacht“ */
  var FOLGE={diagnose:0,verdacht:1,unklar:2,erwaehnt:3,aus:4};
  res.profile=zusammenfassen(analysieren(text,null,S)).map(function(x){var p=KO&&KO.profilDef?KO.profilDef(x.id):null;x.name=p?p.name:x.id;return x;})
    .sort(function(a,b){return FOLGE[a.art]-FOLGE[b.art];});
  /* ICD-Codes ohne Profil */
  var gesehen={}, m, reIcd=/\b([FZ]\d{2}(?:\.\d{1,2})?|6[A-E]\d{2}(?:\.[0-9A-Z]{1,2})?)\b/g;
  while((m=reIcd.exec(text))){var c=m[1];if(gesehen[c]){continue;}gesehen[c]=1;var ids=KO&&KO.passende?KO.passende(c):[];if(!ids.length){res.codes.push({code:c,beleg:satzText(text,satzBei(S,m.index),m.index)});}}
  /* Medikamente mit Dosis und Stand (aktuell, abgesetzt, abgelehnt, nur empfohlen) */
  res.medikamente=medikamenteLesen(text,S);
  /* Datum: das erste Datum im Kopf, das kein Geburtsdatum ist (auch nicht nach „geb.“) */
  var geb=((d&&d.person)||{}).geburtsdatum||'', kopf=text.slice(0,1500);
  function kein(x){return x.iso!==geb&&!x.geb;}
  var dt=daten(kopf).filter(kein)[0]||daten(text).filter(kein)[0];
  res.datum=dt?dt.iso:'';
  /* Absender: eine Zeile im Kopf mit Klinik, Praxis, Dienst … */
  var zeilen=text.split('\n').map(function(z){return z.trim();}).filter(Boolean);
  var von=zeilen.slice(0,15).filter(function(z){return /(klinik|psychiatrie|pédopsychiatrie|pedopsychiatrie|hôpital|hopital|centre hospitalier|\bCHL\b|\bHRS\b|\bCHEM\b|kannerklinik|service|praxis|cabinet|dr\.?\s?med|psycholog|therap|institut|zentrum|centre|ambulanz|consultation)/i.test(z)&&z.length<=90;})[0];
  res.von=von||'';
  /* Art des Berichts: das Schlüsselwort, das im Text zuerst steht */
  var ARTEN_RE=[['arztbrief',/arztbrief|entlassungsbrief|epikrise|lettre de sortie|compte[- ]rendu|consultation|dr\.?\s?med/i],
    ['befund',/befundbericht|\bbefund\b|diagnostik|bilan psycho|évaluation|evaluation|testergebnis|wisc|\biq\b|intelligenztest/i],
    ['therapie',/therapiebericht|ergotherapie|logopädie|psychotherapie|psychomotori|thérapie|rapport de thérapie/i],
    ['schule',/schulbericht|rapport scolaire|zeugnis|bulletin/i]];
  var frueh=1e9;ARTEN_RE.forEach(function(a){var mm=a[1].exec(text);if(mm&&mm.index<frueh){frueh=mm.index;res.art=a[0];}});
  /* Empfehlungen */
  res.empfehlungen=empfehlungenLesen(text);
  return res;
}

/* =====================================================================
   Darstellung im Kompass
   ===================================================================== */
function liste(d){return (d.berichte||[]).slice().sort(function(a,b){return String(b.datum||b.z).localeCompare(String(a.datum||a.z));});}
/* Medikation als Text, mit Stand („abgesetzt“, „nur empfohlen“, „abgelehnt“) */
function medName(m){var st=m.abgesetzt?'abgesetzt':(m.status==='empfohlen'?'nur empfohlen':(m.status==='abgelehnt'?'abgelehnt':''));return m.name+(m.dosis?' '+m.dosis:'')+(st?' ('+st+')':'');}
/* Freitext des Teams ohne passendes Profil: wird am Ende des gespeicherten Textes vermerkt, nicht im Kompass */
var OHNE_PROFIL='Vom Team ergänzt, keinem Profil zugeordnet: ';
function ohneProfil(b){var t=String((b&&b.text)||''), i=t.lastIndexOf(OHNE_PROFIL);return i>=0?t.slice(i+OHNE_PROFIL.length).split('\n')[0].trim():'';}
function karte(d,r){
  if(!bausteine()){return '';}
  var l=liste(d);
  if(!l.length&&!r.bearbeiten){return '';}
  var KO=window.CDSE_KOMPASS;
  return '<section class="ar-karte ber-karte keindruck"><div class="ar-kartenkopf"><h3>'+svg('datei')+'Berichte und Arztbriefe'+(l.length?' ('+l.length+')':'')+'</h3>'+
    (r.bearbeiten?'<button class="btn" type="button" data-ber="neu">'+svg('hoch')+'Bericht hinzufügen</button>':'')+'</div>'+
    (l.length?'<ul class="ber-liste">'+l.map(function(b){
      var prof=(b.profile||[]).map(function(p){var def=KO&&KO.profilDef?KO.profilDef(p.id):null;return (def?def.name:p.id)+(p.art==='verdacht'?' (Verdacht)':'');});
      var med=(b.medikamente||[]).map(medName), op=ohneProfil(b);
      return '<li><div class="ber-kopf"><b>'+esc(ART[b.art]||'Bericht')+(b.von?' – '+esc(b.von):'')+'</b><span class="ar-leise">'+esc(b.datum?datum(b.datum):'ohne Datum')+(b.titel?' · '+esc(b.titel):'')+'</span></div>'+
        (prof.length?'<span class="ber-zeile">Im Kompass: '+esc(prof.join(', '))+'</span>':'')+(med.length?'<span class="ber-zeile">Medikation: '+esc(med.join(', '))+'</span>':'')+
        (op?'<span class="ber-zeile">Keinem Profil zugeordnet: '+esc(op)+'</span>':'')+
        '<span class="ber-akt"><button type="button" class="ar-link" data-ber="lesen" data-bid="'+esc(b.id)+'">Lesen</button>'+
        (b.datei?'<button type="button" class="ar-link" data-ber="datei" data-bid="'+esc(b.id)+'">'+svg('runter')+'Originaldatei ('+esc(groesse(b.datei.groesse||0))+')</button>':'')+
        (r.bearbeiten?'<button type="button" class="ar-link gefahr" data-ber="loeschen" data-bid="'+esc(b.id)+'">Entfernen</button>':'')+'</span></li>';}).join('')+'</ul>'
      :'<p class="ar-leise">Arztbriefe, Befunde oder Therapieberichte als PDF, Word oder Text hinzufügen: Der Hub liest Diagnosen, Medikation und Empfehlungen aus und schlägt sie zur Übernahme in den Kompass und den Begleitplan vor. Übernommen wird nur, was du bestätigst.</p>')+
    '</section>';
}
/* Medikation laut den Berichten (je Wirkstoff der neueste Bericht, ohne abgesetzte, abgelehnte und nur empfohlene) */
function medikation(d){
  var o={};
  liste(d).slice().reverse().forEach(function(b){(b.medikamente||[]).forEach(function(m){o[m.name]={name:m.name,dosis:m.dosis,datum:b.datum,art:ART[b.art]||'Bericht',abgesetzt:!!m.abgesetzt,status:m.status||''};});});
  return Object.keys(o).map(function(k){return o[k];}).filter(function(m){return !m.abgesetzt&&m.status!=='empfohlen'&&m.status!=='abgelehnt';});
}

/* =====================================================================
   Hinzufügen: Datei oder Text → Vorschläge prüfen → speichern
   ===================================================================== */
function aktuell(){var d=H&&H.aktDossier&&H.aktDossier();return d||null;}
function neuDialog(d){
  var inhalt='<p>PDF, Word-Datei (.docx) oder Text. Der Hub liest Diagnosen, Medikation und Empfehlungen aus und zeigt sie dir zur Prüfung. Übernommen wird nur, was du abhakst.</p>'+
    '<label class="ar-feld voll ber-datei"><span>Datei wählen</span><input type="file" name="datei" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"></label>'+
    '<details class="ber-einfuegen"><summary>Oder Text einfügen (z. B. aus einem gescannten Brief abgetippt)</summary>'+H.textfeld('text','Text des Berichts','',8)+'</details>';
  H.dialog('Bericht hinzufügen',inhalt,[{text:'Abbrechen',wert:''},{text:'Auslesen',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){var f=w.dialog.querySelector('input[name=datei]').files[0];if(!f&&!String(w.werte.text||'').trim()){return 'Bitte eine Datei wählen oder Text einfügen.';}if(f&&f.size>MAX_DATEI){return 'Die Datei ist zu groß (höchstens 12 MB).';}return '';},
    ausfuehren:function(w){
      var f=w.dialog.querySelector('input[name=datei]').files[0], txt=String(w.werte.text||'');
      if(!f){return {text:txt,datei:null};}
      return dateiText(f).then(function(x){return {text:(x.text||'')+(txt.trim()?'\n\n'+txt:''),datei:{name:f.name,typ:f.type||'',bytes:new Uint8Array(x.buf)}};});
    }
  }).then(function(res){if(res&&res.ergebnis){pruefDialog(d,res.ergebnis);}});
}
/* Hinweise im Prüfdialog – vorausgewählt sind nur Diagnose, Verdacht und aktuelle Medikation */
var HINWEIS_P={aus:'im Text verneint oder ausgeschlossen',unklar:'widersprüchliche Angaben im Text – nichts vorausgewählt, bitte die Sätze prüfen',
  familie:'bei einem Familienmitglied erwähnt – nicht die Diagnose des Kindes',test:'nur als Untersuchung, Abklärung oder Behandlung erwähnt – bitte prüfen',
  frage:'nur in der Fragestellung – im Bericht keine Antwort gefunden, bitte prüfen',erwaehnt:'nur erwähnt (nicht als Diagnose des Kindes) – bitte prüfen'};
var HINWEIS_M={abgesetzt:'abgesetzt',abgelehnt:'abgelehnt – wird nicht eingenommen',empfohlen:'nur empfohlen oder erwogen – nicht als aktuelle Medikation vorausgewählt',erwaehnt:'nur erwähnt – bitte prüfen'};
function profilZeile(p){
  var an=p.art==='diagnose'||p.art==='verdacht', verd=p.art==='verdacht'||p.art==='unklar'||p.grund==='frage'||p.grund==='test';
  var hw=(p.art==='aus'||p.art==='unklar')?HINWEIS_P[p.art]:(p.art==='erwaehnt'?HINWEIS_P[p.grund||'erwaehnt']:'');
  var bl=(p.belege&&p.belege.length)?p.belege:[{text:p.beleg,stand:''}], mehr=bl.length>1&&(p.art==='unklar'||p.art==='aus');
  return '<div class="ber-p'+(p.art==='aus'||p.art==='unklar'||p.art==='erwaehnt'?' '+p.art:'')+'"><label><input type="checkbox" name="p-'+esc(p.id)+'"'+(an?' checked':'')+'><b>'+esc(p.name)+'</b></label>'+
    '<select name="pa-'+esc(p.id)+'" aria-label="Stand"><option value="diagnose"'+(verd?'':' selected')+'>Diagnose</option><option value="verdacht"'+(verd?' selected':'')+'>Verdacht</option></select>'+
    (hw?'<span class="ber-aus">'+esc(hw)+'</span>':'')+
    bl.map(function(b){return '<small>'+(mehr&&STAND_NAME[b.stand]?'<i>'+esc(STAND_NAME[b.stand])+':</i> ':'')+'„'+esc(b.text)+'“</small>';}).join('')+'</div>';
}
function medZeile(m,i){
  var st=m.status||(m.abgesetzt?'abgesetzt':'aktuell'), hw=HINWEIS_M[st]||'';
  return '<div class="ber-p'+(st==='abgesetzt'||st==='abgelehnt'?' aus':'')+'"><label><input type="checkbox" name="m-'+i+'"'+(st==='aktuell'?' checked':'')+'><b>'+esc(m.name)+'</b>'+(m.dosis?' '+esc(m.dosis):'')+'</label>'+
    (hw?'<span class="ber-aus">'+esc(hw)+'</span>':'')+'<small>„'+esc(m.beleg)+'“</small></div>';
}
/* Freitext „Weitere Diagnose oder Verdacht“: mit Verneinung und Verdacht einordnen. Was keinem Profil
   passt (z. B. „Enuresis F98.0“), geht nicht verloren: Es wird beim Bericht vermerkt, nicht im Kompass. */
function freiAuswerten(frei){
  var KO=window.CDSE_KOMPASS, an=[], weg=[], ohne=[], m, re=/\b([FZ]\d{2}(?:\.\d{1,2})?|6[A-E]\d{2}(?:\.[0-9A-Z]{1,2})?)\b/g;
  einordnen(frei).forEach(function(x){if(x.art==='aus'||x.grund==='familie'){weg.push(x.id);}else{an.push({id:x.id,art:(x.art==='diagnose'||(x.art==='erwaehnt'&&!x.grund))?'diagnose':'verdacht'});}});
  while((m=re.exec(frei))){if(!(KO&&KO.passende&&KO.passende(m[1]).length)&&ohne.indexOf(m[1])<0){ohne.push(m[1]);}}
  return {an:an,weg:weg,ohne:ohne,vermerken:!an.length||ohne.length>0};
}
function freiHinweis(v){
  v=String(v||'').trim();if(!v){return {text:'',ohne:false};}
  var KO=window.CDSE_KOMPASS, r=freiAuswerten(v);
  function name(id){var p=KO&&KO.profilDef?KO.profilDef(id):null;return p?p.name:id;}
  var t=r.an.length?'Wird übernommen: '+r.an.map(function(y){return name(y.id)+' ('+(y.art==='verdacht'?'Verdacht':'Diagnose')+')';}).join(', ')+'. ':'';
  if(r.weg.length&&!r.an.length){t+='Im Text verneint oder nicht beim Kind. ';}
  if(r.vermerken){t+=(r.an.length?'Ohne Profil: '+r.ohne.join(', ')+' – ':'Keinem Profil zugeordnet – ')+'wird nur beim Bericht vermerkt, nicht im Kompass.';}
  return {text:t.trim(),ohne:r.vermerken};
}
function pruefDialog(d,x){
  var text=x.text||'', buchstaben=(text.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  var E=erkennen(text,d);
  var leer=buchstaben<80;
  var inhalt=(leer?'<div class="ber-warn">'+svg('warn')+'<span>'+(x.datei?'In dieser Datei steht kaum lesbarer Text – vermutlich ein Scan. ':'')+'Bitte die wichtigsten Angaben (Diagnosen mit ICD-Code, Medikation, Empfehlungen) unten eintragen oder den Text einfügen; die Datei kann trotzdem abgelegt werden.</span></div>':'')+
    '<div class="ar-raster3">'+H.auswahl('art','Art',E.art,Object.keys(ART).map(function(k){return [k,ART[k]];}))+H.feld('datum','Datum des Berichts',E.datum,'date')+H.feld('von','Von (Klinik, Praxis, Dienst)',E.von,'text',' maxlength="200"')+'</div>'+
    H.feld('titel','Titel (optional)','','text',' maxlength="200"')+
    '<fieldset class="ber-wahl"><legend>Diagnosen und Verdacht – in den Kompass übernehmen</legend>'+
      (E.profile.length?E.profile.map(profilZeile).join(''):'<p class="ar-leise">Keine Diagnose erkannt.</p>')+
      '<label class="ar-feld voll"><span>Weitere Diagnose oder Verdacht (Freitext, z. B. „F90.0“ oder „Verdacht auf Autismus“)</span><input type="text" name="frei" maxlength="200"></label>'+
      '<p class="ber-frei" aria-live="polite"></p>'+
      (E.codes.length?'<p class="ar-leise">Weitere ICD-Codes im Text, keinem Profil zugeordnet: '+esc(E.codes.map(function(c){return c.code;}).join(', '))+'</p>':'')+'</fieldset>'+
    '<fieldset class="ber-wahl"><legend>Medikation</legend>'+
      (E.medikamente.length?E.medikamente.map(medZeile).join(''):'<p class="ar-leise">Keine Medikation erkannt.</p>')+'</fieldset>'+
    '<fieldset class="ber-wahl"><legend>Empfehlungen – als Schritt in den Begleitplan?</legend>'+
      (E.empfehlungen.length?E.empfehlungen.map(function(e,i){return '<div class="ber-p"><label><input type="checkbox" name="e-'+i+'"><span>'+esc(e)+'</span></label></div>';}).join('')
        :'<p class="ar-leise">Keine Empfehlungen erkannt.</p>')+'</fieldset>'+
    (x.datei?'<label class="ar-haken"><input type="checkbox" name="ablegen" checked> Originaldatei verschlüsselt beim Dossier ablegen ('+esc(x.datei.name)+', '+esc(groesse(x.datei.bytes.length))+')</label>':'')+
    '<p class="ber-hinweis">'+svg('users')+'Was du übernimmst, sehen alle, die das Dossier lesen dürfen – Diagnosen im Kompass mit dem Vermerk „laut Bericht“.</p>';
  H.dialog('Bericht prüfen und übernehmen',inhalt,[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    /* Beim Tippen zeigen, was aus dem Freitext wird – nichts verschwindet stillschweigend */
    nachAufbau:function(dl){
      var inp=dl.querySelector('input[name=frei]'), aus=dl.querySelector('.ber-frei');if(!inp||!aus){return;}
      inp.addEventListener('input',function(){var h=freiHinweis(inp.value);aus.textContent=h.text;aus.className='ber-frei'+(h.ohne?' ohne':'');});
    },
    ausfuehren:function(w){
      var v=w.werte, prof=[], med=[], empf=[], schritte=[], notiz='';
      E.profile.forEach(function(p){if(v['p-'+p.id]){prof.push({id:p.id,art:v['pa-'+p.id]==='verdacht'?'verdacht':'diagnose',beleg:p.beleg});}});
      var frei=String(v.frei||'').trim();
      if(frei){
        var r=freiAuswerten(frei);
        r.an.forEach(function(y){if(!prof.some(function(p){return p.id===y.id;})){prof.push({id:y.id,art:y.art,beleg:frei});}});
        if(r.vermerken){notiz='\n\n'+OHNE_PROFIL+(r.an.length?r.ohne.join(', ')+' (aus „'+frei+'“)':frei);}
      }
      /* abgesetzt und Stand werden mitgegeben (abgesetzt, abgelehnt, nur empfohlen zählen nicht als aktuelle Medikation) */
      E.medikamente.forEach(function(m,i){if(v['m-'+i]){med.push({name:m.name,dosis:m.dosis,beleg:m.beleg,abgesetzt:!!m.abgesetzt,status:m.status||''});}});
      E.empfehlungen.forEach(function(e,i){empf.push(e);if(v['e-'+i]){schritte.push(e);}});
      var p=Promise.resolve(null);
      if(x.datei&&v.ablegen){p=T.anhangSpeichern(d.id,x.datei);}
      return p.then(function(meta){
        return T.ops.bericht(d.id,{art:v.art,datum:v.datum,von:v.von,titel:v.titel,text:text+notiz,datei:meta,profile:prof,medikamente:med,empfehlungen:empf,schritte:schritte})
          .catch(function(e){if(meta){T.anhangLoeschen(d.id,meta.id).catch(function(){});}throw e;});
      });
    }
  }).then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Bericht übernommen');}});
}
function lesenDialog(d,b){
  var KO=window.CDSE_KOMPASS;
  var inhalt='<p class="ar-leise">'+esc(ART[b.art]||'Bericht')+(b.von?' – '+esc(b.von):'')+(b.datum?' · '+esc(datum(b.datum)):'')+' · eingetragen von '+esc(H.kname(b.eingetragenVon))+' am '+esc(datum(String(b.z||'').slice(0,10)))+'</p>'+
    ((b.profile||[]).length?'<p><b>Im Kompass:</b> '+esc(b.profile.map(function(p){var def=KO&&KO.profilDef?KO.profilDef(p.id):null;return (def?def.name:p.id)+(p.art==='verdacht'?' (Verdacht)':'');}).join(', '))+'</p>':'')+
    ((b.medikamente||[]).length?'<p><b>Medikation:</b> '+esc(b.medikamente.map(medName).join(', '))+'</p>':'')+
    ((b.empfehlungen||[]).length?'<p><b>Empfehlungen:</b></p><ul>'+b.empfehlungen.map(function(e){return '<li>'+esc(e)+'</li>';}).join('')+'</ul>':'')+
    (b.text?'<div class="ber-text">'+esc(b.text)+'</div>':'<p class="ar-leise">Kein Text gespeichert.</p>');
  H.dialog(b.titel||(ART[b.art]||'Bericht'),inhalt,[{text:'Schließen',wert:''}],{breit:true});
}
function dateiHerunterladen(d,b,t){
  if(t){t.disabled=true;}
  T.anhangLesen(d.id,b.datei.id).then(function(f){
    var url=URL.createObjectURL(new Blob([f.bytes],{type:f.typ||'application/octet-stream'})), a=document.createElement('a');
    a.href=url;a.download=f.name||'Bericht';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},20000);
  },function(e){H.toast((e&&e.message)||String(e));}).then(function(){if(t){t.disabled=false;}});
}
function loeschenDialog(d,b){
  H.dialog('Bericht entfernen','<p>Den Bericht'+(b.von?' von '+esc(b.von):'')+' aus dem Dossier entfernen? Profile, die aus diesem Bericht in den Kompass übernommen wurden, werden dort wieder entfernt'+(b.datei?'; die Originaldatei wird gelöscht':'')+'. Im Protokoll bleibt vermerkt, dass es den Bericht gab.</p>',
    [{text:'Abbrechen',wert:''},{text:'Entfernen',wert:'ok',primaer:true,gefahr:true}],
    {ausfuehren:function(){return T.ops.berichtLoeschen(d.id,b.id).then(function(neu){if(b.datei){return T.anhangLoeschen(d.id,b.datei.id).catch(function(){}).then(function(){return neu;});}return neu;});}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Bericht entfernt');}});
}
document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-ber]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-ber'), b=(d.berichte||[]).filter(function(x){return x.id===t.getAttribute('data-bid');})[0];
  if(a==='neu'){neuDialog(d);return;}
  if(!b){return;}
  if(a==='lesen'){lesenDialog(d,b);return;}
  if(a==='datei'&&b.datei){dateiHerunterladen(d,b,t);return;}
  if(a==='loeschen'){loeschenDialog(d,b);return;}
});

return {karte:karte, medikation:medikation, erkennen:erkennen, einordnen:einordnen, pdfText:pdfText, dateiText:dateiText, ART:ART};
})();
