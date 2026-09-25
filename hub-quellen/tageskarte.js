/* =====================================================================
   CDSE Hub — Tageskarte: Punkte je Ziel und Tagesabschnitt
   ---------------------------------------------------------------------
   Check-in/Check-out mit täglicher Rückmeldekarte. Liegt im Begleitplan
   unter den Fokuszielen: ein bis drei Ziele in der Sprache des Kindes,
   Tagesabschnitte, je Abschnitt 0, 1 oder 2 Punkte; morgens kurz
   ankommen (Stimmung), nachmittags Rückmeldung; Tagesziel in Prozent;
   Wochenkarte zum Drucken (auf Wunsch mit Unterschrift der Eltern).
   Gespeichert in d.tageskarte (Operationen tageskarte* in team.js).
   Grundlage: tägliche Verhaltenskarten wirken am stärksten mit den
   Eltern und über den ganzen Tag (Vannest et al., 2010); Check-in/
   Check-out (Hawken & Horner, 2003; Maggin et al., 2015).
   ===================================================================== */
window.CDSE_TAGESKARTE=(function(){
'use strict';
var T=null, K=null, H=null;
function bausteine(){T=window.CDSE_TEAM||null;K=window.CDSE_KONTO||null;H=(window.CDSE_ARBEIT&&window.CDSE_ARBEIT.hilfen)||null;return !!(T&&K&&H);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function svg(n){return H?H.svg(n):'';}
function pad(n){return (n<10?'0':'')+n;}
function isoVon(t){return t.getFullYear()+'-'+pad(t.getMonth()+1)+'-'+pad(t.getDate());}
function heute(){return H?H.heuteIso():isoVon(new Date());}
function datum(i){return H?H.datum(i):i;}
function plusTage(iso,n){var t=new Date(iso+'T12:00:00');t.setDate(t.getDate()+n);return isoVon(t);}
function wtag(iso){return new Date(iso+'T12:00:00').getDay();}
var TAGE_KURZ=['So','Mo','Di','Mi','Do','Fr','Sa'];
var ABSCHNITTE=['Morgen','Pause','Vormittag','Mittag','Nachmittag'];
var STIMMUNG=[['gut','gut'],['mittel','geht so'],['schwer','schwer']];
var PROZENT=[60,70,75,80,90];

/* ---------- Daten ---------- */
function karteVon(d){var x=d&&d.tageskarte;return x&&Array.isArray(x.ziele)&&x.ziele.length?x:null;}
function aktiveZiele(x){return (x.ziele||[]).filter(function(z){return z&&!z.aus;});}
/* Punkte eines Tages: nur bewertete Felder zählen (ausgefallener Abschnitt = leer) */
function tagWert(x,tag){
  var t=((x&&x.tage)||{})[tag];if(!t){return null;}
  var p=0,m=0;
  Object.keys(t.p||{}).forEach(function(zid){(t.p[zid]||[]).forEach(function(v){if(v===0||v===1||v===2){p+=v;m+=2;}});});
  return {punkte:p,max:m,prozent:m?Math.round(p/m*100):null,stimmung:t.s||'',notiz:t.notiz||''};
}
/* Tage mit Punkten zwischen ab und bis (einschließlich) */
function reihe(x,ab,bis){
  if(!x){return [];}
  return Object.keys(x.tage||{}).filter(function(k){return (!ab||k>=ab)&&(!bis||k<=bis);}).sort().map(function(k){
    var w=tagWert(x,k);return w&&w.prozent!=null?{datum:k,prozent:w.prozent,punkte:w.punkte,max:w.max,erreicht:w.prozent>=(x.ziel||80),stimmung:w.stimmung}:null;
  }).filter(Boolean);
}
function schnitt(l){return l&&l.length?Math.round(l.reduce(function(s,x){return s+x.prozent;},0)/l.length):null;}
/* Letzter Tag, an dem ein Ziel mit diesem ELDiB-Code bewertet wurde (für „Fortschritt beobachten“) */
function zuletztFuerCode(d,code){
  var x=karteVon(d);if(!x||!code){return '';}
  var ids=(x.ziele||[]).filter(function(z){return z&&z.code===code;}).map(function(z){return z.id;});if(!ids.length){return '';}
  return Object.keys(x.tage||{}).sort().reverse().filter(function(k){var p=(x.tage[k]||{}).p||{};return ids.some(function(id){return (p[id]||[]).some(function(v){return v===0||v===1||v===2;});});})[0]||'';
}
/* Montag der Woche (am Wochenende: der nächste Montag) */
function montag(iso){var w=wtag(iso);return plusTage(iso,w===0?1:(w===6?2:1-w));}

/* ---------- Darstellung im Begleitplan ---------- */
function balken(x,l){
  var B=240,Hh=46,n=10,bw=16,gap=(B-n*bw)/(n-1), ziel=x.ziel||80, y=function(p){return 4+(Hh-8)*(100-p)/100;};
  var g='<svg class="tk-balken" viewBox="0 0 '+B+' '+Hh+'" role="img" aria-label="Die letzten '+l.length+' Tage in Prozent">';
  g+='<line x1="0" x2="'+B+'" y1="'+y(ziel).toFixed(1)+'" y2="'+y(ziel).toFixed(1)+'" class="tk-ziellinie"/>';
  var start=n-l.length;
  for(var i=0;i<n;i++){
    var x0=(i*(bw+gap)).toFixed(1), e=l[i-start];
    if(!e){g+='<rect x="'+x0+'" y="'+(Hh-6)+'" width="'+bw+'" height="2" rx="1" class="tk-leer"/>';continue;}
    var h1=Math.max(2,(Hh-8)*e.prozent/100);
    g+='<rect x="'+x0+'" y="'+(Hh-4-h1).toFixed(1)+'" width="'+bw+'" height="'+h1.toFixed(1)+'" rx="3" class="'+(e.erreicht?'tk-gut':'tk-knapp')+'"><title>'+esc(TAGE_KURZ[wtag(e.datum)]+' '+datum(e.datum)+': '+e.prozent+' %')+'</title></rect>';
  }
  return g+'</svg>';
}
function kartenHtml(d,r){
  if(!bausteine()){return '';}
  var x=karteVon(d);if(!x){return '';}
  var h0=heute(), l=reihe(x,plusTage(h0,-40),h0).slice(-10), zwei=reihe(x,plusTage(h0,-13),h0), s2=schnitt(zwei), hw=tagWert(x,h0), ziel=x.ziel||80;
  var erreicht=zwei.filter(function(e){return e.erreicht;}).length, zs=aktiveZiele(x), aktiv=!x.ende, schreiben=r&&r.bearbeiten;
  var heuteText=!aktiv?'<b>Beendet am '+esc(datum(x.ende))+(x.endeGrund?' – '+esc(x.endeGrund):'')+'</b>':(hw&&hw.prozent!=null?'<b>Heute: '+hw.punkte+' von '+hw.max+' Punkten ('+hw.prozent+' %)</b>':'<b>Heute noch nicht eingetragen</b>');
  return '<section class="ar-karte tk-karte'+(aktiv?'':' beendet')+'" id="tk-karte"><div class="ar-kartenkopf"><div><h3>Tageskarte</h3><span class="ar-leise">'+(aktiv?'seit '+esc(datum(x.start))+' · Tagesziel '+ziel+' %'+(x.belohnung?' · Belohnung: '+esc(x.belohnung):''):'lief vom '+esc(datum(x.start))+' bis '+esc(datum(x.ende)))+'</span></div>'+
      (schreiben?'<span class="ar-knopfreihe keindruck">'+(aktiv?'<button class="btn primary" type="button" data-tk="tag">'+svg('check')+'Heute eintragen</button><button class="btn" type="button" data-tk="drucken">'+svg('print')+'Woche drucken</button>'+
        '<details class="ar-mehr"><summary class="btn" aria-label="Weitere Aktionen zur Tageskarte">'+svg('more')+'</summary><div class="ar-mehr-menue"><button type="button" data-tk="nachtragen">'+svg('cal')+'Anderen Tag eintragen</button><button type="button" data-tk="einrichten">'+svg('edit')+'Ziele und Abschnitte ändern</button><button type="button" data-tk="beenden">'+svg('x')+'Tageskarte beenden</button></div></details>':
        '<button class="btn" type="button" data-tk="einrichten">'+svg('reload')+'Wieder aufnehmen</button>')+'</span>':'')+'</div>'+
    '<ol class="tk-ziele">'+zs.map(function(z,i){return '<li><span class="tk-nr">'+(i+1)+'</span><span>'+esc(z.text)+'</span>'+(z.code?'<span class="bp-code">'+esc(z.code)+'</span>':'')+'</li>';}).join('')+'</ol>'+
    '<div class="tk-stand">'+(l.length?balken(x,l):'')+'<p>'+heuteText+(s2!=null?'<span>Letzte zwei Wochen: im Schnitt '+s2+' % · Tagesziel an '+erreicht+' von '+zwei.length+(zwei.length===1?' Tag':' Tagen')+' erreicht</span>':'<span>Noch keine Tage eingetragen.</span>')+'</p></div></section>';
}
/* Kleiner Verweis in der Karte „Fokusziele“, solange es keine Tageskarte gibt */
function fokusLink(d,r){
  if(!bausteine()||!r||!r.bearbeiten||karteVon(d)){return '';}
  return '<p class="tk-fokuslink"><button class="ar-link" type="button" data-tk="einrichten">'+svg('plus')+'Als Tageskarte mit Punkten einsetzen</button><span class="ar-leise">Rückmeldung nach jedem Tagesabschnitt, auf Wunsch auch für die Eltern</span></p>';
}
/* Eine Zeile für den Überblick und die Überprüfung */
function kurz(d){
  var x=karteVon(d);if(!x){return '';}
  var h0=heute(), zwei=reihe(x,plusTage(h0,-13),h0), s=schnitt(zwei);
  if(x.ende){return 'Tageskarte beendet am '+datum(x.ende);}
  return s!=null?'Tageskarte: im Schnitt '+s+' % in den letzten zwei Wochen (Ziel '+(x.ziel||80)+' %)':'Tageskarte seit '+datum(x.start)+' – noch keine Tage eingetragen';
}

/* ---------- Dialoge ---------- */
function aktuell(){return H&&H.aktDossier?H.aktDossier():null;}
function einrichtenDialog(d){
  var x=karteVon(d), A=H.eldibAuswertung?H.eldibAuswertung(d):null, fokus=((d.begleitplan||{}).fokus||[]).filter(Boolean);
  var ziele=x?aktiveZiele(x).map(function(z){return {id:z.id,code:z.code||'',text:z.text};}):fokus.map(function(c){
    var z=A?A.ziele.filter(function(y){return y.code===c;})[0]:null, inf=H.itemZu?H.itemZu(c):null;
    return {id:'',code:c,text:(z&&z.text)||(inf&&inf.it&&(inf.it.text||inf.it.keyword))||''};
  });
  while(ziele.length<3){ziele.push({id:'',code:'',text:''});}
  var inhalt='<p>Nach jedem Tagesabschnitt gibt es für jedes Ziel <b>0, 1 oder 2 Punkte</b> (2 = hat gut geklappt). Morgens kommt das Kind kurz an: Wie geht es dir, was ist heute dein Ziel? Nachmittags gibt es eine kurze Rückmeldung mit Lob. Formuliere die Ziele positiv und so, wie das Kind sie versteht.</p>'+
    ziele.slice(0,3).map(function(z,i){return '<div class="tk-zielfeld"><span class="tk-nr">'+(i+1)+'</span>'+H.feld('z'+i,'Ziel '+(i+1)+(i?' (optional)':'')+(z.code?' – '+z.code:''),z.text,'text',' maxlength="140"')+
      '<input type="hidden" name="zid'+i+'" value="'+esc(z.id)+'"><input type="hidden" name="zcode'+i+'" value="'+esc(z.code)+'"></div>';}).join('')+
    H.feld('abschnitte','Tagesabschnitte, mit Komma getrennt',((x&&x.abschnitte)||ABSCHNITTE).join(', '),'text',' maxlength="300"')+
    '<div class="ar-raster2">'+H.auswahl('ziel','Tagesziel',String((x&&x.ziel)||80),PROZENT.map(function(p){return [String(p),p+' % der Punkte'];}))+
      H.feld('belohnung','Belohnung, wenn das Tagesziel erreicht ist (optional)',(x&&x.belohnung)||'','text',' maxlength="120" placeholder="z. B. 5 Minuten Lieblingsspiel"')+'</div>'+
    '<label class="ar-haken"><input type="checkbox" name="heim"'+(!x||x.heim?' checked':'')+'> Die Karte geht täglich mit nach Hause (Unterschrift der Eltern auf der Wochenkarte)</label>';
  H.dialog(x&&!x.ende?'Tageskarte ändern':(x?'Tageskarte wieder aufnehmen':'Tageskarte einrichten'),inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    pruefen:function(w){
      if(![0,1,2].some(function(i){return String(w.werte['z'+i]||'').trim();})){return 'Bitte mindestens ein Ziel eintragen.';}
      if(!String(w.werte.abschnitte||'').split(',').some(function(a){return a.trim();})){return 'Bitte mindestens einen Tagesabschnitt angeben.';}
      return '';
    },
    ausfuehren:function(w){
      return T.ops.tageskarte(d.id,{ziele:[0,1,2].map(function(i){return {id:w.werte['zid'+i],code:w.werte['zcode'+i],text:w.werte['z'+i]};}),
        abschnitte:String(w.werte.abschnitte||'').split(','),ziel:+w.werte.ziel,belohnung:w.werte.belohnung,heim:!!w.werte.heim});
    }})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Tageskarte gespeichert');}});
}
function tagDialog(d,tag){
  var x=karteVon(d);if(!x){return;}
  tag=tag||heute();
  var zs=aktiveZiele(x), werte={}, stimmung='';
  function laden(t){
    var e=(x.tage||{})[t]||{};werte={};stimmung=e.s||'';
    zs.forEach(function(z){werte[z.id]=x.abschnitte.map(function(a,j){var v=((e.p||{})[z.id]||[])[j];return (v===0||v===1||v===2)?v:null;});});
    return e;
  }
  var e0=laden(tag);
  function raster(){
    return '<table class="tk-tabelle"><thead><tr><th scope="col"><span class="tk-sr">Ziel</span></th>'+x.abschnitte.map(function(a){return '<th scope="col">'+esc(a)+'</th>';}).join('')+'</tr></thead><tbody>'+
      zs.map(function(z,i){return '<tr><th scope="row" title="'+esc(z.text)+'"><span class="tk-nr">'+(i+1)+'</span></th>'+x.abschnitte.map(function(a,j){var v=werte[z.id][j];
        return '<td><span class="tk-wahl" role="group" aria-label="Ziel '+(i+1)+', '+esc(a)+'">'+[2,1,0].map(function(p){return '<button type="button" class="p'+p+(v===p?' an':'')+'" data-z="'+esc(z.id)+'" data-j="'+j+'" data-p="'+p+'" aria-pressed="'+(v===p)+'">'+p+'</button>';}).join('')+'</span></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
  }
  function summe(){
    var p=0,m=0;Object.keys(werte).forEach(function(k){werte[k].forEach(function(v){if(v!=null){p+=v;m+=2;}});});
    if(!m){return 'Noch keine Punkte eingetragen. Ein ausgefallener Abschnitt bleibt einfach leer.';}
    var pr=Math.round(p/m*100);
    return '<b>'+p+' von '+m+' Punkten · '+pr+' %</b> – Tagesziel '+(x.ziel||80)+' % '+(pr>=(x.ziel||80)?'<span class="tk-ja">erreicht'+(x.belohnung?': '+esc(x.belohnung):'')+'</span>':'<span class="tk-nein">noch nicht erreicht</span>');
  }
  var inhalt='<div class="ar-raster2">'+H.feld('tag','Tag',tag,'date',' max="'+heute()+'"')+'</div>'+
    '<ol class="tk-ziele klein">'+zs.map(function(z,i){return '<li><span class="tk-nr">'+(i+1)+'</span><span>'+esc(z.text)+'</span></li>';}).join('')+'</ol>'+
    '<fieldset class="tk-stimmung"><legend>Morgens: Wie geht es dir heute?</legend>'+STIMMUNG.map(function(s){return '<label><input type="radio" name="s" value="'+s[0]+'"'+(stimmung===s[0]?' checked':'')+'><span>'+esc(s[1])+'</span></label>';}).join('')+'</fieldset>'+
    '<div class="tk-rasterbox" id="tk-raster">'+raster()+'</div><p class="tk-summe" id="tk-summe">'+summe()+'</p>'+
    H.textfeld('notiz','Nachmittags: Rückmeldung (optional)',e0.notiz||'',2);
  H.dialog('Tageskarte · '+(d.person&&d.person.vorname||''),inhalt,[{text:'Abbrechen',wert:''},{text:'Speichern',wert:'ok',primaer:true}],{breit:true,
    nachAufbau:function(dlg){
      var f=dlg.querySelector('form');
      function neu(){dlg.querySelector('#tk-raster').innerHTML=raster();dlg.querySelector('#tk-summe').innerHTML=summe();}
      dlg.addEventListener('click',function(ev){
        var b=ev.target.closest&&ev.target.closest('.tk-wahl button');if(!b){return;}
        var zid=b.getAttribute('data-z'), j=+b.getAttribute('data-j'), p=+b.getAttribute('data-p');
        werte[zid][j]=werte[zid][j]===p?null:p;neu();
        var n=dlg.querySelector('.tk-wahl button[data-z="'+zid+'"][data-j="'+j+'"][data-p="'+p+'"]');if(n){n.focus();}
      });
      f.elements.tag.addEventListener('change',function(){
        var t=f.elements.tag.value;if(!/^\d{4}-\d{2}-\d{2}$/.test(t)){return;}
        var e=laden(t);f.elements.notiz.value=e.notiz||'';
        Array.prototype.forEach.call(f.querySelectorAll('input[name="s"]'),function(r){r.checked=r.value===stimmung;});neu();
      });
    },
    pruefen:function(w){return /^\d{4}-\d{2}-\d{2}$/.test(String(w.werte.tag||''))&&w.werte.tag<=heute()?'':'Bitte einen Tag bis heute wählen.';},
    ausfuehren:function(w){return T.ops.tageskarteTag(d.id,w.werte.tag,{p:werte,s:w.werte.s||'',notiz:w.werte.notiz||''});}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);var tw=tagWert(karteVon(res.ergebnis),res.werte.tag);H.toast(tw&&tw.prozent!=null?'Gespeichert: '+tw.prozent+' %':'Gespeichert');}});
}
function beendenDialog(d){
  H.dialog('Tageskarte beenden','<p>Die Tageskarte wird beendet. Alle eingetragenen Tage bleiben erhalten und erscheinen weiter im Verlauf. Später lässt sie sich wieder aufnehmen.</p>'+H.feld('grund','Warum? (optional)','','text',' maxlength="200" placeholder="z. B. Ziele erreicht, ausgeschlichen"'),
    [{text:'Abbrechen',wert:''},{text:'Beenden',wert:'ok',primaer:true}],{ausfuehren:function(w){return T.ops.tageskarteEnde(d.id,w.werte.grund||'');}})
    .then(function(res){if(res&&res.ergebnis){H.dossierZeichnen(res.ergebnis);H.toast('Tageskarte beendet');}});
}

/* ---------- Wochenkarte zum Drucken ---------- */
function wocheHtml(d){
  var x=karteVon(d), p=d.person||{}, mo=montag(heute()), tage=[0,1,2,3,4].map(function(i){return plusTage(mo,i);}), zs=aktiveZiele(x), ziel=x.ziel||80;
  var max=zs.length*x.abschnitte.length*2, noetig=Math.ceil(max*ziel/100);
  var css='@page{size:A4 landscape;margin:11mm 12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0E1628;font-size:10.5pt;margin:0}'+
    'h1{font-size:18pt;margin:0 0 1mm}.unter{color:#586277;margin:0 0 4mm;font-size:10pt}.ziele{display:flex;gap:6mm;margin:0 0 4mm;padding:0;list-style:none}.ziele li{flex:1;border:1.2px solid #C8CDF0;border-radius:3mm;padding:2mm 3mm;font-size:11pt}'+
    '.nr{display:inline-block;width:6mm;height:6mm;line-height:6mm;border-radius:50%;background:#2E3A9C;color:#fff;text-align:center;font-weight:bold;font-size:9pt;margin-right:2mm}'+
    'table{width:100%;border-collapse:collapse}th,td{border:1px solid #9AA3B5;padding:1.2mm 1.5mm;text-align:center;vertical-align:middle}th{background:#ECEEFA;font-size:9pt}td.tag{font-weight:bold;text-align:left;width:22mm;font-size:10pt}'+
    '.k{display:inline-block;width:5.2mm;height:5.2mm;line-height:5mm;border:1px solid #586277;border-radius:50%;font-size:8pt;margin:0 .6mm;color:#586277}.k.an{background:#2E3A9C;border-color:#2E3A9C;color:#fff;font-weight:bold}'+
    'td.summe{width:24mm;font-size:9pt;color:#586277}td.unterschrift{width:30mm}.stimmung{font-size:8pt;color:#586277;white-space:nowrap}.stimmung span{margin:0 .8mm}.fuss{margin-top:3mm;font-size:9pt;color:#586277;display:flex;justify-content:space-between}tr.trenner td{border-top:2px solid #0E1628}';
  var kopf='<tr><th>Tag</th><th>Ziel</th>'+x.abschnitte.map(function(a){return '<th>'+esc(a)+'</th>';}).join('')+'<th>Punkte</th>'+(x.heim?'<th>Eltern</th>':'')+'</tr>';
  var zeilen=tage.map(function(t,ti){
    var e=(x.tage||{})[t]||{}, w=tagWert(x,t);
    return zs.map(function(z,i){
      var zellen=x.abschnitte.map(function(a,j){var v=((e.p||{})[z.id]||[])[j];return '<td>'+[2,1,0].map(function(p){return '<span class="k'+(v===p?' an':'')+'">'+p+'</span>';}).join('')+'</td>';}).join('');
      return '<tr'+(i===0&&ti>0?' class="trenner"':'')+'>'+(i===0?'<td class="tag" rowspan="'+zs.length+'">'+TAGE_KURZ[wtag(t)]+' '+esc(datum(t).slice(0,6))+'<div class="stimmung">'+(e.s?'Morgens: '+esc((STIMMUNG.filter(function(s){return s[0]===e.s;})[0]||['',''])[1]):'<span>☐ gut</span><span>☐ geht so</span><span>☐ schwer</span>')+'</div></td>':'')+
        '<td><span class="nr">'+(i+1)+'</span></td>'+zellen+
        (i===0?'<td class="summe" rowspan="'+zs.length+'">'+(w&&w.prozent!=null?'<b>'+w.punkte+' / '+w.max+'</b><br>'+w.prozent+' %':'___ / '+max)+'</td>'+(x.heim?'<td class="unterschrift" rowspan="'+zs.length+'"></td>':''):'')+'</tr>';
    }).join('');
  }).join('');
  return '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Tageskarte '+esc(p.vorname||'')+'</title><style>'+css+'</style></head><body>'+
    '<h1>Meine Tageskarte – '+esc(p.vorname||'')+'</h1><p class="unter">Woche vom '+esc(datum(tage[0]))+' bis '+esc(datum(tage[4]))+' · 2 = hat gut geklappt, 1 = teilweise, 0 = noch nicht · Tagesziel: '+noetig+' von '+max+' Punkten ('+ziel+' %)'+(x.belohnung?' · Belohnung: '+esc(x.belohnung):'')+'</p>'+
    '<ol class="ziele">'+zs.map(function(z,i){return '<li><span class="nr">'+(i+1)+'</span>'+esc(z.text)+'</li>';}).join('')+'</ol>'+
    '<table>'+kopf+zeilen+'</table><div class="fuss"><span>Morgens kurz ankommen, nach jedem Abschnitt Punkte, nachmittags Rückmeldung mit Lob.</span><span>CDSE</span></div></body></html>';
}
function drucken(html){
  var f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(f);var doc=f.contentWindow.document;doc.open();doc.write(html);doc.close();
  setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){}setTimeout(function(){f.remove();},60000);},250);
}

document.addEventListener('click',function(ev){
  var t=ev.target.closest&&ev.target.closest('#arbeit-body [data-tk]');if(!t||!bausteine()){return;}
  var d=aktuell();if(!d){return;}
  var a=t.getAttribute('data-tk');
  var m=t.closest('details.ar-mehr');if(m){m.open=false;}
  if(a==='einrichten'){einrichtenDialog(d);return;}
  if(a==='tag'){tagDialog(d,heute());return;}
  if(a==='nachtragen'){tagDialog(d,plusTage(heute(),-1));return;}
  if(a==='beenden'){beendenDialog(d);return;}
  if(a==='drucken'){drucken(wocheHtml(d));return;}
});

return {karte:kartenHtml, fokusLink:fokusLink, kurz:kurz, reihe:reihe, schnitt:schnitt, tagWert:tagWert, zuletztFuerCode:zuletztFuerCode,
  karteVon:karteVon, wocheHtml:function(d){bausteine();return wocheHtml(d);}};
})();
