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
function pdfObjekte(b,bin){
  var o={}, re=/(\d+)\s+(\d+)\s+obj\b/g, m;
  function laengeVon(dict){
    var d=/\/Length\s+(\d+)(?:\s+(\d+)\s+R)?/.exec(dict);if(!d){return -1;}
    if(d[2]==null){return +d[1];}
    var rm=new RegExp('(?:^|[^0-9])'+d[1]+'\\s+'+d[2]+'\\s+obj\\s*(\\d+)\\s*endobj').exec(bin);return rm?+rm[1]:-1;
  }
  while((m=re.exec(bin))){
    var start=re.lastIndex, eIdx=bin.indexOf('endobj',start);if(eIdx<0){break;}
    var sIdx=bin.indexOf('stream',start), obj={nr:+m[1],dict:'',daten:null};
    if(sIdx>=0&&sIdx<eIdx){
      obj.dict=bin.slice(start,sIdx);
      var ds=sIdx+6;if(bin.charCodeAt(ds)===13){ds++;}if(bin.charCodeAt(ds)===10){ds++;}
      var len=laengeVon(obj.dict), de=len>=0?ds+len:-1;
      if(de<ds||bin.slice(de,de+40).indexOf('endstream')<0){de=bin.indexOf('endstream',ds);}
      obj.daten=b.subarray(ds,Math.max(ds,de));
      eIdx=bin.indexOf('endobj',de);if(eIdx<0){o[obj.nr]=obj;break;}
    }else{obj.dict=bin.slice(start,eIdx);}
    o[obj.nr]=obj;re.lastIndex=eIdx+6;
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
  while(i<n){
    var c=t.charAt(i);
    if(c==='%'){while(i<n&&t.charAt(i)!=='\n'&&t.charAt(i)!=='\r'){i++;}continue;}
    if(/\s/.test(c)){i++;continue;}
    if(c==='('){var tiefe=1,j=i+1,roh='';while(j<n&&tiefe>0){var cj=t.charAt(j);if(cj==='\\'){roh+=cj+t.charAt(j+1);j+=2;continue;}if(cj==='('){tiefe++;}else if(cj===')'){tiefe--;if(!tiefe){break;}}roh+=cj;j++;}
      stapel.push({str:literalBytes(roh)});i=j+1;continue;}
    if(c==='<'&&t.charAt(i+1)!=='<'){var e=t.indexOf('>',i);stapel.push({str:hexBytes(t.slice(i+1,e))});i=e+1;continue;}
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
   ===================================================================== */
/* Satzgrenze: Punkt, Semikolon, Zeilenende – ein Punkt vor einer Ziffer (F84.0, 2.5 mg) zählt nicht */
var NEG_VOR=/(kein(e|en|er|em|es)?|nicht|ohne|ausgeschlossen|ausschluss|keinerlei|pas d['e]|pas de|aucun(e)?|absence d|sans|no |not |without|ruled out|excluded)(?:[^.;\n]|\.(?=\d)){0,60}$/i;
var NEG_NACH=/^(?:[^.;\n]|\.(?=\d)){0,40}(ausgeschlossen|ausgeschlossen werden|nicht bestätigt|nicht bestätigen|unauffällig|nicht erfüllt|exclu|écarté|ruled out|excluded|not confirmed)/i;
var VERD_VOR=/(verdacht|v\.\s?a\.|vd\.\s?a\.|verdachtsdiagnose|dd\b|differentialdiagnos|differenzialdiagnos|abklärung|zu klären|möglich(e|er|es)?|wahrscheinlich|suspicion|suspecté?e?|hypothèse|probable|à confirmer|à exclure|possible|suspected|probable)(?:[^.;\n]|\.(?=\d)){0,50}$/i;
var VERD_NACH=/^(?:[^.;\n]|\.(?=\d)){0,20}(\?|\(v\.\s?a\.\)|à confirmer|zu klären|to be confirmed)/i;
var VERD_FREI=/verdacht|v\.\s?a\.|suspicion|suspect|à confirmer|\?/i;
var MEDIKAMENTE=[['Methylphenidat',/methylphenidat|ritalin|medikinet|concerta|equasym|kinecteen|rubifen/i],['Lisdexamfetamin',/lisdexamfetamin|elvanse/i],['Dexamfetamin',/dexamfetamin|attentin/i],
  ['Atomoxetin',/atomoxetin|strattera/i],['Guanfacin',/guanfacin|intuniv/i],['Clonidin',/clonidin|catapres/i],['Risperidon',/risperidon|risperdal/i],['Aripiprazol',/aripiprazol|abilify/i],
  ['Quetiapin',/quetiapin|seroquel/i],['Olanzapin',/olanzapin|zyprexa/i],['Fluoxetin',/fluoxetin|fluctine|prozac/i],['Sertralin',/sertralin|zoloft/i],['Escitalopram',/escitalopram|cipralex|seroplex/i],
  ['Melatonin',/melatonin|circadin|slenyto/i],['Valproat',/valpro|depakin|orfiril/i],['Levetiracetam',/levetiracetam|keppra/i],['Lamotrigin',/lamotrigin|lamictal/i],['Lithium',/lithium/i]];
var MED_AB=/(abgesetzt|beendet|ausgeschlichen|gestoppt|arrêté|interrompu|discontinued|stopped)/i;
var EMPF_KOPF=/^\s*(empfehlung(en)?|therapieempfehlung(en)?|weiteres vorgehen|procédure|procedure|recommandation(s)?|recommendation(s)?|vorschl(ä|a)ge|conseils?|propositions?|plan de traitement)\b[^\n]{0,40}:?\s*$/i;
var EMPF_ZEILE=/^\s*(?:empfehlung(?:en)?|therapieempfehlung(?:en)?|weiteres vorgehen|recommandations?|recommendations?)\s*:\s*(.+)$/i;
var MONATE={januar:1,jänner:1,janvier:1,january:1,februar:2,février:2,fevrier:2,february:2,märz:3,maerz:3,mars:3,march:3,april:4,avril:4,mai:5,may:5,juni:6,juin:6,june:6,juli:7,juillet:7,july:7,august:8,août:8,aout:8,september:9,septembre:9,oktober:10,octobre:10,october:10,november:11,novembre:11,dezember:12,décembre:12,decembre:12,december:12};
function pad(n){return (n<10?'0':'')+n;}
function daten(text){
  var o=[], m, re=/\b(\d{1,2})[./](\d{1,2})[./](\d{2,4})\b/g;
  while((m=re.exec(text))){var j=+m[3];if(j<100){j+=2000;}var mo=+m[2], t=+m[1];if(mo>=1&&mo<=12&&t>=1&&t<=31&&j>=1990&&j<=2100){o.push({iso:j+'-'+pad(mo)+'-'+pad(t),index:m.index});}}
  var re2=/\b(\d{1,2})\.?\s+([A-Za-zäöüéèûôÄÖÜ]+)\s+(\d{4})\b/g;
  while((m=re2.exec(text))){var mm=MONATE[m[2].toLowerCase()];if(mm){o.push({iso:m[3]+'-'+pad(mm)+'-'+pad(+m[1]),index:m.index});}}
  return o.sort(function(a,b){return a.index-b.index;});
}
function satzUm(text,i){
  var a=Math.max(text.lastIndexOf('\n',i-1),text.lastIndexOf('. ',i-1)+1,0), e=text.length, e1=text.indexOf('\n',i), e2=text.indexOf('. ',i);
  if(e1>=0){e=e1;}if(e2>=0&&e2<e){e=e2+1;}
  return text.slice(a,e).replace(/\s+/g,' ').trim().replace(/^[-•*·–]\s*/,'').slice(0,240);
}
var UEBER_DIAG=/^\s*(diagnose(n)?|verdachtsdiagnose(n)?|diagnos(is|es)|diagnostics?|diagnostique|conclusion|synthèse|synthese|beurteilung|zusammenfassung|zusammenfassende beurteilung|impression clinique|klinische diagnose(n)?)\b/i;
var UEBER_ANDERE=/^\s*(empfehlung|therapieempfehlung|weiteres vorgehen|procédure|recommandation|recommendation|medikation|médication|medication|traitement|behandlung|therapie|anamnese|familienanamnese|sozialanamnese|vorgeschichte|antécédents|verlauf|befund)\b/i;
var FAMILIE=/\b(vater|mutter|eltern|bruder|schwester|geschwister|onkel|tante|großvater|großmutter|opa|oma|cousin|cousine|père|mère|frère|sœur|soeur|oncle|grand-père|grand-mère|father|mother|brother|sister|familienanamnese|familiär)/i;
/* Zusammenhang einer Fundstelle: 'diagnose', 'familie' oder 'andere' */
function zusammenhang(text,i){
  var ls=text.lastIndexOf('\n',i-1)+1, le=text.indexOf('\n',i);if(le<0){le=text.length;}
  var zeile=text.slice(ls,le);
  if(FAMILIE.test(zeile)){return 'familie';}
  if(/\b([FZ]\d{2}(\.\d{1,2})?|6[A-E]\d{2})\b/.test(zeile)||/\b(diagnos\w*|diagnostiziert|leidet an|souffre d|présente une?|besteht eine?|es liegt\b.{0,40}\bvor)/i.test(zeile)){return 'diagnose';}
  var pos=ls-1;
  while(pos>0&&ls-pos<4000){
    var s2=text.lastIndexOf('\n',pos-1)+1, z=text.slice(s2,pos).trim();
    if(z&&z.length<70){if(UEBER_DIAG.test(z)){return 'diagnose';}if(UEBER_ANDERE.test(z)){return FAMILIE.test(z)?'familie':'andere';}}
    pos=s2-1;
  }
  return 'andere';
}
function erkennen(text,d){
  text=String(text||'').replace(/\r\n?/g,'\n');
  var KO=window.CDSE_KOMPASS, res={profile:[],codes:[],medikamente:[],datum:'',von:'',art:'bericht',empfehlungen:[]};
  /* Diagnosen, Verdacht, Verneinung. Vorausgewählt wird nur, was im Diagnose-Zusammenhang steht
     (Abschnitt „Diagnosen“, ICD-Code in der Zeile, „Diagnose:“); sonst „im Text erwähnt“. */
  var analyse=text.replace(/nicht näher bezeichnet\w*|non précisée?s?|not otherwise specified/gi,function(m){return m.replace(/\S/g,'x');});
  var je={};
  (KO&&KO.fundstellen?KO.fundstellen(text):[]).forEach(function(f){
    var vor=analyse.slice(Math.max(0,f.index-80),f.index), nach=analyse.slice(f.index+f.text.length,f.index+f.text.length+60);
    var neg=NEG_VOR.test(vor)||NEG_NACH.test(nach), verd=VERD_VOR.test(vor)||VERD_NACH.test(nach), kx=zusammenhang(text,f.index);
    var art=neg?'aus':(kx==='familie'?'erwaehnt':(verd?'verdacht':(kx==='diagnose'?'diagnose':'erwaehnt')));
    var RANG={diagnose:4,verdacht:3,erwaehnt:2,aus:1}, alt=je[f.id];
    if(!alt||RANG[art]>RANG[alt.art]){je[f.id]={id:f.id,art:art,beleg:satzUm(text,f.index)};}
  });
  var FOLGE={diagnose:0,verdacht:1,erwaehnt:2,aus:3};
  res.profile=Object.keys(je).map(function(k){var x=je[k], p=KO.profilDef(k);x.name=p?p.name:k;return x;}).sort(function(a,b){return FOLGE[a.art]-FOLGE[b.art];});
  /* ICD-Codes ohne Profil */
  var gesehen={}, m, reIcd=/\b([FZ]\d{2}(?:\.\d{1,2})?|6[A-E]\d{2}(?:\.[0-9A-Z]{1,2})?)\b/g;
  while((m=reIcd.exec(text))){var c=m[1];if(gesehen[c]){continue;}gesehen[c]=1;var ids=KO&&KO.passende?KO.passende(c):[];if(!ids.length){res.codes.push({code:c,beleg:satzUm(text,m.index)});}}
  /* Medikamente mit Dosis */
  MEDIKAMENTE.forEach(function(md){
    var re=new RegExp(md[1].source,'gi'), mm;
    while((mm=re.exec(text))){
      var um=text.slice(mm.index,mm.index+60), dosis=(/(\d+(?:[.,]\d+)?)\s?(mg|µg|mcg|ml)\b/i.exec(um)||[])[0]||'', satz=satzUm(text,mm.index);
      if(res.medikamente.some(function(x){return x.name===md[0];})){break;}
      res.medikamente.push({name:md[0],dosis:dosis,beleg:satz,abgesetzt:MED_AB.test(satz)});break;
    }
  });
  /* Datum: das erste Datum im Kopf, das nicht das Geburtsdatum ist */
  var geb=((d&&d.person)||{}).geburtsdatum||'', kopf=text.slice(0,1500);
  var dt=daten(kopf).filter(function(x){return x.iso!==geb;})[0]||daten(text).filter(function(x){return x.iso!==geb;})[0];
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
  /* Empfehlungen: Zeilen unter einer Überschrift wie „Empfehlungen“ */
  for(var i=0;i<zeilen.length&&res.empfehlungen.length<8;i++){
    var ez=EMPF_ZEILE.exec(zeilen[i]);if(ez&&ez[1].length>8){res.empfehlungen.push(ez[1].replace(/^[-•*·–]\s*/,'').slice(0,240));continue;}
    if(!EMPF_KOPF.test(zeilen[i])){continue;}
    for(var j=i+1;j<zeilen.length&&res.empfehlungen.length<8;j++){
      var z=zeilen[j];
      if(/:\s*$/.test(z)&&z.length<60&&!/^[-•*·–]/.test(z)){break;}
      if(z.length<8){continue;}
      if(/^(mit freundlichen|freundliche grüße|cordialement|meilleures salutations|kind regards|dr\.?\s?med)/i.test(z)){break;}
      res.empfehlungen.push(z.replace(/^[-•*·–\d.)\s]+/,'').slice(0,240));
    }
    break;
  }
  return res;
}

/* =====================================================================
   Darstellung im Kompass
   ===================================================================== */
function liste(d){return (d.berichte||[]).slice().sort(function(a,b){return String(b.datum||b.z).localeCompare(String(a.datum||a.z));});}
function karte(d,r){
  if(!bausteine()){return '';}
  var l=liste(d);
  if(!l.length&&!r.bearbeiten){return '';}
  var KO=window.CDSE_KOMPASS;
  return '<section class="ar-karte ber-karte keindruck"><div class="ar-kartenkopf"><h3>'+svg('datei')+'Berichte und Arztbriefe'+(l.length?' ('+l.length+')':'')+'</h3>'+
    (r.bearbeiten?'<button class="btn" type="button" data-ber="neu">'+svg('hoch')+'Bericht hinzufügen</button>':'')+'</div>'+
    (l.length?'<ul class="ber-liste">'+l.map(function(b){
      var prof=(b.profile||[]).map(function(p){var def=KO&&KO.profilDef?KO.profilDef(p.id):null;return (def?def.name:p.id)+(p.art==='verdacht'?' (Verdacht)':'');});
      var med=(b.medikamente||[]).map(function(m){return m.name+(m.dosis?' '+m.dosis:'');});
      return '<li><div class="ber-kopf"><b>'+esc(ART[b.art]||'Bericht')+(b.von?' – '+esc(b.von):'')+'</b><span class="ar-leise">'+esc(b.datum?datum(b.datum):'ohne Datum')+(b.titel?' · '+esc(b.titel):'')+'</span></div>'+
        (prof.length?'<span class="ber-zeile">Im Kompass: '+esc(prof.join(', '))+'</span>':'')+(med.length?'<span class="ber-zeile">Medikation: '+esc(med.join(', '))+'</span>':'')+
        '<span class="ber-akt"><button type="button" class="ar-link" data-ber="lesen" data-bid="'+esc(b.id)+'">Lesen</button>'+
        (b.datei?'<button type="button" class="ar-link" data-ber="datei" data-bid="'+esc(b.id)+'">'+svg('runter')+'Originaldatei ('+esc(groesse(b.datei.groesse||0))+')</button>':'')+
        (r.bearbeiten?'<button type="button" class="ar-link gefahr" data-ber="loeschen" data-bid="'+esc(b.id)+'">Entfernen</button>':'')+'</span></li>';}).join('')+'</ul>'
      :'<p class="ar-leise">Arztbriefe, Befunde oder Therapieberichte als PDF, Word oder Text hinzufügen: Der Hub liest Diagnosen, Medikation und Empfehlungen aus und schlägt sie zur Übernahme in den Kompass und den Begleitplan vor. Übernommen wird nur, was du bestätigst.</p>')+
    '</section>';
}
/* Medikation laut den Berichten (je Wirkstoff der neueste Bericht, ohne abgesetzte) */
function medikation(d){
  var o={};
  liste(d).slice().reverse().forEach(function(b){(b.medikamente||[]).forEach(function(m){o[m.name]={name:m.name,dosis:m.dosis,datum:b.datum,art:ART[b.art]||'Bericht',abgesetzt:!!m.abgesetzt};});});
  return Object.keys(o).map(function(k){return o[k];}).filter(function(m){return !m.abgesetzt;});
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
function pruefDialog(d,x){
  var text=x.text||'', buchstaben=(text.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  var E=erkennen(text,d), KO=window.CDSE_KOMPASS;
  var ARTNAME={diagnose:'Diagnose',verdacht:'Verdacht',aus:'ausgeschlossen'};
  var leer=buchstaben<80;
  var inhalt=(leer?'<div class="ber-warn">'+svg('warn')+'<span>'+(x.datei?'In dieser Datei steht kaum lesbarer Text – vermutlich ein Scan. ':'')+'Bitte die wichtigsten Angaben (Diagnosen mit ICD-Code, Medikation, Empfehlungen) unten eintragen oder den Text einfügen; die Datei kann trotzdem abgelegt werden.</span></div>':'')+
    '<div class="ar-raster3">'+H.auswahl('art','Art',E.art,Object.keys(ART).map(function(k){return [k,ART[k]];}))+H.feld('datum','Datum des Berichts',E.datum,'date')+H.feld('von','Von (Klinik, Praxis, Dienst)',E.von,'text',' maxlength="200"')+'</div>'+
    H.feld('titel','Titel (optional)','','text',' maxlength="200"')+
    '<fieldset class="ber-wahl"><legend>Diagnosen und Verdacht – in den Kompass übernehmen</legend>'+
      (E.profile.length?E.profile.map(function(p){
        var an=p.art==='diagnose'||p.art==='verdacht';
        return '<div class="ber-p'+(p.art==='aus'?' aus':'')+(p.art==='erwaehnt'?' erwaehnt':'')+'"><label><input type="checkbox" name="p-'+esc(p.id)+'"'+(an?' checked':'')+'><b>'+esc(p.name)+'</b></label>'+
          '<select name="pa-'+esc(p.id)+'" aria-label="Stand"><option value="diagnose"'+(p.art!=='verdacht'?' selected':'')+'>Diagnose</option><option value="verdacht"'+(p.art==='verdacht'?' selected':'')+'>Verdacht</option></select>'+
          (p.art==='aus'?'<span class="ber-aus">im Text verneint oder ausgeschlossen</span>':'')+(p.art==='erwaehnt'?'<span class="ber-aus">nur erwähnt (nicht als Diagnose des Kindes) – bitte prüfen</span>':'')+'<small>„'+esc(p.beleg)+'“</small></div>';}).join('')
        :'<p class="ar-leise">Keine Diagnose erkannt.</p>')+
      '<label class="ar-feld voll"><span>Weitere Diagnose oder Verdacht (Freitext, z. B. „F90.0“ oder „Verdacht auf Autismus“)</span><input type="text" name="frei" maxlength="200"></label>'+
      (E.codes.length?'<p class="ar-leise">Weitere ICD-Codes im Text, keinem Profil zugeordnet: '+esc(E.codes.map(function(c){return c.code;}).join(', '))+'</p>':'')+'</fieldset>'+
    '<fieldset class="ber-wahl"><legend>Medikation</legend>'+
      (E.medikamente.length?E.medikamente.map(function(m,i){
        return '<div class="ber-p'+(m.abgesetzt?' aus':'')+'"><label><input type="checkbox" name="m-'+i+'"'+(m.abgesetzt?'':' checked')+'><b>'+esc(m.name)+'</b>'+(m.dosis?' '+esc(m.dosis):'')+'</label>'+(m.abgesetzt?'<span class="ber-aus">abgesetzt</span>':'')+'<small>„'+esc(m.beleg)+'“</small></div>';}).join('')
        :'<p class="ar-leise">Keine Medikation erkannt.</p>')+'</fieldset>'+
    '<fieldset class="ber-wahl"><legend>Empfehlungen – als Schritt in den Begleitplan?</legend>'+
      (E.empfehlungen.length?E.empfehlungen.map(function(e,i){return '<div class="ber-p"><label><input type="checkbox" name="e-'+i+'"><span>'+esc(e)+'</span></label></div>';}).join('')
        :'<p class="ar-leise">Keine Empfehlungen erkannt.</p>')+'</fieldset>'+
    (x.datei?'<label class="ar-haken"><input type="checkbox" name="ablegen" checked> Originaldatei verschlüsselt beim Dossier ablegen ('+esc(x.datei.name)+', '+esc(groesse(x.datei.bytes.length))+')</label>':'')+
    '<p class="ber-hinweis">'+svg('users')+'Was du übernimmst, sehen alle, die das Dossier lesen dürfen – Diagnosen im Kompass mit dem Vermerk „laut Bericht“.</p>';
  H.dialog('Bericht prüfen und übernehmen',inhalt,[{text:'Abbrechen',wert:''},{text:'Übernehmen',wert:'ok',primaer:true}],{breit:true,
    ausfuehren:function(w){
      var v=w.werte, prof=[], med=[], empf=[], schritte=[];
      E.profile.forEach(function(p){if(v['p-'+p.id]){prof.push({id:p.id,art:v['pa-'+p.id]==='verdacht'?'verdacht':'diagnose',beleg:p.beleg});}});
      var frei=String(v.frei||'').trim();
      if(frei&&KO&&KO.passende){var ids=KO.passende(frei), verd=VERD_FREI.test(frei);ids.forEach(function(id){if(!prof.some(function(p){return p.id===id;})){prof.push({id:id,art:verd?'verdacht':'diagnose',beleg:frei});}});}
      E.medikamente.forEach(function(m,i){if(v['m-'+i]){med.push({name:m.name,dosis:m.dosis,beleg:m.beleg,abgesetzt:m.abgesetzt});}});
      E.empfehlungen.forEach(function(e,i){empf.push(e);if(v['e-'+i]){schritte.push(e);}});
      var p=Promise.resolve(null);
      if(x.datei&&v.ablegen){p=T.anhangSpeichern(d.id,x.datei);}
      return p.then(function(meta){
        return T.ops.bericht(d.id,{art:v.art,datum:v.datum,von:v.von,titel:v.titel,text:text,datei:meta,profile:prof,medikamente:med,empfehlungen:empf,schritte:schritte})
          .catch(function(e){if(meta){T.anhangLoeschen(d.id,meta.id).catch(function(){});}throw e;});
      });
    }
  }).then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Bericht übernommen');}});
}
function lesenDialog(d,b){
  var KO=window.CDSE_KOMPASS;
  var inhalt='<p class="ar-leise">'+esc(ART[b.art]||'Bericht')+(b.von?' – '+esc(b.von):'')+(b.datum?' · '+esc(datum(b.datum)):'')+' · eingetragen von '+esc(H.kname(b.eingetragenVon))+' am '+esc(datum(String(b.z||'').slice(0,10)))+'</p>'+
    ((b.profile||[]).length?'<p><b>Im Kompass:</b> '+esc(b.profile.map(function(p){var def=KO&&KO.profilDef?KO.profilDef(p.id):null;return (def?def.name:p.id)+(p.art==='verdacht'?' (Verdacht)':'');}).join(', '))+'</p>':'')+
    ((b.medikamente||[]).length?'<p><b>Medikation:</b> '+esc(b.medikamente.map(function(m){return m.name+(m.dosis?' '+m.dosis:'')+(m.abgesetzt?' (abgesetzt)':'');}).join(', '))+'</p>':'')+
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

return {karte:karte, medikation:medikation, erkennen:erkennen, pdfText:pdfText, dateiText:dateiText, ART:ART};
})();
