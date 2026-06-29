window.KB_MATERIALS=(function(){
  var DATA=window.KB_MATERIALS_DATA||[];
  var TAX=window.KB_TAXONOMY||{};
  var AGEORDER=TAX.ageOrder||['C1','C2','C3','C4','ES'];
  var THLAB=TAX.themeLabels||{};
  var GLAB=TAX.eldibGoalLabels||{};
  var DOM=TAX.eldibDomains||{V:{label:'Verhalten',color:'#2f5597'},K:{label:'Kommunikation',color:'#548235'},SOZ:{label:'Sozialisation',color:'#bf8f00'},KOG:{label:'Kognition',color:'#c55a11'}};

  /* Réunion-Thematiken (THEME_LEXICON-Schlüssel) -> Isa-Themen/Tags */
  var THEME_MAP={
    'Suizidalität':{themes:['psychische-gesundheit','resilienz','emotionen'],tags:['gefühle','krise','hilfe']},
    'Selbstverletzung':{themes:['psychische-gesundheit','emotionen','stressbewaeltigung','achtsamkeit'],tags:['gefühle','stress','selbstfürsorge']},
    'Selbstgefährdung':{themes:['psychische-gesundheit','impulskontrolle','resilienz'],tags:['sicherheit','gefühle']},
    'Krise & Aggression':{themes:['impulskontrolle','emotionen','konfliktloesung','gewalt'],tags:['wut','aggression','selbstkontrolle','gefühle']},
    'Signalement & Justiz':{themes:['gerechtigkeit','grenzen','disziplin'],tags:['regeln','verantwortung']},
    'Mobbing':{themes:['mobbing','fremdwahrnehmung','konfliktloesung','gruppendruck'],tags:['ausgrenzung','mobbing','empathie','akzeptanz']},
    'Vape & Konsum':{themes:['sucht-praevention','geld-konsum','psychische-gesundheit'],tags:['sucht','konsum','gesundheit']},
    'Medikation':{themes:['psychische-gesundheit','achtsamkeit'],tags:['gesundheit']},
    'Schlaf':{themes:['stressbewaeltigung','achtsamkeit','resilienz'],tags:['schlaf','entspannung','ruhe']},
    'Klinik & Hospitalisierung':{themes:['psychische-gesundheit','resilienz'],tags:['gesundheit']},
    'Absenzen & Anwesenheit':{themes:['motivation','disziplin','zukunft-beruf'],tags:['schule','motivation']},
    'Verweigerung & Vermeidung':{themes:['motivation','resilienz','stressbewaeltigung','selbstwertgefuehl'],tags:['motivation','mut']},
    'Familienkonflikt':{themes:['konfliktloesung','beziehungsaufbau','kommunikation','emotionen'],tags:['familie','konflikt','gefühle']},
    'Vertrauen':{themes:['beziehungsaufbau','kommunikation','selbstwertgefuehl'],tags:['vertrauen','beziehung']},
    'Therapie & Suivi':{themes:['psychische-gesundheit','ressourcen','selbstwahrnehmung'],tags:['gefühle','ressourcen']},
    'Diagnostik & Testung':{themes:['selbstwahrnehmung','ressourcen'],tags:['stärken','ressourcen']},
    'Autismus / ASS':{themes:['kommunikation','fremdwahrnehmung','emotionen','selbstwahrnehmung'],tags:['autismus','soziale kompetenz','gefühle']},
    'Hochbegabung':{themes:['motivation','identitaet','ressourcen','kreativitaet'],tags:['stärken','motivation']},
    'Dys & Teilleistung':{themes:['ressourcen','selbstwertgefuehl','motivation'],tags:['stärken','lernen']},
    'Stage & Praktikum':{themes:['zukunft-beruf','kommunikation'],tags:['beruf','zukunft']},
    'Ausbildung & Arbeit':{themes:['zukunft-beruf','motivation','geld-konsum'],tags:['beruf','zukunft']},
    'Reintegration':{themes:['beziehungsaufbau','resilienz','motivation'],tags:['neuanfang','schule']},
    'Leistung & Module':{themes:['motivation','stressbewaeltigung','disziplin'],tags:['schule','motivation']}
  };

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function clamp(s,n){s=String(s||'');return s.length>n?(s.slice(0,n).replace(/\s+\S*$/,'')+'…'):s;}
  function domainOf(code){return String(code||'').split('-')[0];}
  function byId(id){for(var i=0;i<DATA.length;i++){if(DATA[i].id===id)return DATA[i];}return null;}
  function themeMatchable(key){return !!THEME_MAP[key];}
  function rawCycle(sid){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(sid);return (s&&s.zyklus)||'';}
  /* Annexe = Sekundarschule: ohne gesetzten Zyklus gilt ES als Standard. */
  function cycleOf(sid){return rawCycle(sid)||'ES';}
  function nameOf(sid){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(sid);return (s&&s.name)||'Schüler';}

  function ageScore(m,cyc){
    if(!cyc)return 1;
    var lv=m.ageLevels||[];
    if(lv.indexOf(cyc)>=0)return 3;
    var ci=AGEORDER.indexOf(cyc),best=0;
    for(var i=0;i<lv.length;i++){var d=Math.abs(AGEORDER.indexOf(lv[i])-ci);if(d===1)best=Math.max(best,1);}
    return best;
  }

  var BANDS=TAX.eldibBands||[];
  function bandRange(code){
    var d=domainOf(code),n=parseInt(String(code).split('-')[1],10);
    for(var i=0;i<BANDS.length;i++){var r=BANDS[i]&&BANDS[i][d];if(r&&n>=r[0]&&n<=r[1])return r;}
    return null;
  }
  function inBand(code,dom,range){if(domainOf(code)!==dom)return false;var n=parseInt(String(code).split('-')[1],10);return n>=range[0]&&n<=range[1];}

  /* Treffer für ein Förderziel: exakter ELDiB-Code (direkt) + als Fallback
     verwandte Ziele im selben Entwicklungs-Band (kein ganzer Bereich -> präzise). */
  function forGoal(code,cyc){
    var dm=domainOf(code),range=bandRange(code),res=[];
    for(var i=0;i<DATA.length;i++){
      var m=DATA[i],g=m.eldibGoals||[];
      var exact=g.indexOf(code)>=0,related=false;
      if(!exact&&range){for(var j=0;j<g.length;j++){if(inBand(g[j],dm,range)){related=true;break;}}}
      if(!exact&&!related)continue;
      var as=ageScore(m,cyc);
      if(cyc&&as===0&&!exact)continue;
      var score=(exact?1000:0)+(related?100:0)+as*8;
      res.push({m:m,score:score,exact:exact,tier:exact?'exact':'related',age:as,warn:(cyc&&as===0)});
    }
    res.sort(function(a,b){return b.score-a.score||(a.m.title<b.m.title?-1:1);});
    return res;
  }

  function forTheme(key,cyc){
    var map=THEME_MAP[key]||{themes:[],tags:[]};
    var ths=map.themes||[],tgs=(map.tags||[]).map(function(x){return x.toLowerCase();}),res=[];
    for(var i=0;i<DATA.length;i++){
      var m=DATA[i],ts=0;
      var mth=m.themes||[];for(var a=0;a<mth.length;a++){if(ths.indexOf(mth[a])>=0)ts+=3;}
      var mtg=(m.tags||[]).map(function(x){return String(x).toLowerCase();});
      for(var b=0;b<tgs.length;b++){if(mtg.indexOf(tgs[b])>=0)ts+=1;}
      if(!ts)continue;
      var as=ageScore(m,cyc);
      if(cyc&&as===0)continue;
      res.push({m:m,score:ts*10+as,age:as,warn:false});
    }
    res.sort(function(a,b){return b.score-a.score||(a.m.title<b.m.title?-1:1);});
    return res;
  }

  /* ---------- UI ---------- */
  var ov=null,state=null;
  function ensureOverlay(){
    if(ov)return ov;
    ov=document.createElement('div');ov.className='kbm-ov';ov.id='kbm-ov';
    ov.innerHTML='<div class="kbm-modal" role="dialog" aria-modal="true"><div class="kbm-head"><div class="kbm-head-t" id="kbm-title">Arbeitsblätter</div><button class="kbm-x" id="kbm-x" aria-label="Schließen">×</button></div><div class="kbm-cyc" id="kbm-cyc"></div><div class="kbm-body" id="kbm-body"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',function(e){if(e.target===ov)closeOverlay();});
    ov.querySelector('#kbm-x').addEventListener('click',closeOverlay);
    ov.addEventListener('click',onOvClick);
    return ov;
  }
  function closeOverlay(){if(ov){ov.classList.remove('open');}}
  function openOverlay(){ensureOverlay();ov.classList.add('open');}

  function ageBadges(m,warn){
    var lv=m.ageLevels||[];
    var h=lv.map(function(a){return '<span class="kbm-age">'+esc(a)+'</span>';}).join('');
    if(warn)h+='<span class="kbm-age kbm-age-warn" title="Außerhalb des gewählten Zyklus">außerhalb Zyklus</span>';
    return h;
  }
  function metaLine(m){
    var bits=[];
    if(m.type&&m.type.length)bits.push(esc(m.type.join(' · ')));
    if(m.participants&&m.participants.length)bits.push(esc(m.participants.map(function(p){return p.mode;}).join('/')));
    if(m.duration)bits.push(esc(m.duration));
    bits.push(m.source==='original'?'Original':'KI-Entwurf');
    return bits.join(' • ');
  }
  function themeTags(m){
    return (m.themes||[]).slice(0,5).map(function(t){return '<span class="kbm-tag">'+esc(THLAB[t]||t)+'</span>';}).join('');
  }

  function cycBar(){
    var sid=state.sid,saved=rawCycle(sid),cur=state.cyc;
    var chips=AGEORDER.map(function(a){
      return '<button class="kbm-chip'+(cur===a?' on':'')+'" data-cyc="'+a+'">'+esc(a)+'</button>';
    }).join('');
    chips+='<button class="kbm-chip'+(cur===''?' on':'')+'" data-cyc="">alle</button>';
    var note;
    if(saved){note='Zyklus von '+esc(nameOf(sid))+': <b>'+esc(saved)+'</b> (gespeichert) — anderen Zyklus wählen passt die Treffer an.';}
    else{note='Annexe-Standard <b>ES</b> für '+esc(nameOf(sid))+' — bei Bedarf anderen Zyklus wählen (wird gespeichert).';}
    return '<div class="kbm-cyc-note">'+note+'</div><div class="kbm-chips">'+chips+'</div>';
  }

  function cardHtml(r){
    var m=r.m;
    return '<div class="kbm-card"><div class="kbm-card-h"><h4>'+esc(m.title)+'</h4><div class="kbm-ages">'+ageBadges(m,r.warn)+'</div></div>'+
      '<div class="kbm-meta">'+metaLine(m)+'</div>'+
      '<p class="kbm-desc">'+esc(clamp(m.shortDescription,240))+'</p>'+
      '<div class="kbm-tags">'+themeTags(m)+'</div>'+
      '<div class="kbm-acts"><button class="kbm-btn kbm-btn-p" data-detail="'+esc(m.id)+'">'+(m.worksheet?'📝 Arbeitsblatt &amp; Details':'📋 Details ansehen')+'</button></div></div>';
  }
  function listHtml(arr,cap){return '<div class="kbm-list">'+arr.slice(0,cap).map(cardHtml).join('')+'</div>'+(arr.length>cap?'<div class="kbm-more">… '+(arr.length-cap)+' weitere — bitte Zyklus eingrenzen.</div>':'');}

  function renderResults(){
    var cyc=state.cyc;
    var list=state.mode==='goal'?forGoal(state.key,cyc):forTheme(state.key,cyc);
    state.last=list;
    var title;
    if(state.mode==='goal'){
      var d=domainOf(state.key),dm=DOM[d]||{label:d,color:'#777'};
      title='📄 Arbeitsblätter zum Förderziel <span class="kbm-goalcode" style="background:'+dm.color+'">'+esc(state.key)+'</span> '+esc(state.label||GLAB[state.key]||'');
    }else{
      title='📄 Arbeitsblätter zur Thematik „'+esc(state.label||state.key)+'“';
    }
    ov.querySelector('#kbm-title').innerHTML=title;
    ov.querySelector('#kbm-cyc').innerHTML=cycBar();
    var body=ov.querySelector('#kbm-body');
    if(!list.length){
      body.innerHTML='<div class="kbm-count">0 Treffer'+(cyc?(' für Zyklus '+esc(cyc)):'')+'</div><div class="kbm-empty">Keine passenden Materialien'+(cyc?(' für Zyklus '+esc(cyc)+' — versuche „alle“ Zyklen'):'')+'.</div>'+isaFooter();
      return;
    }
    if(state.mode==='goal'){
      var exact=[],related=[];
      for(var i=0;i<list.length;i++){(list[i].exact?exact:related).push(list[i]);}
      var dlabel=esc((DOM[domainOf(state.key)]||{}).label||domainOf(state.key));
      var html='<div class="kbm-count">'+exact.length+' direkt passende'+(exact.length===1?'s Material':' Materialien')+(cyc?(' für Zyklus '+esc(cyc)):'')+'</div>';
      if(exact.length){html+=listHtml(exact,40);}
      else{html+='<div class="kbm-empty">Kein Material trainiert genau diesen Code — verwandte Materialien siehe unten.</div>';}
      if(related.length){html+='<div class="kbm-divider">↓ Verwandt — selber Entwicklungsschritt im Bereich '+dlabel+'</div>'+listHtml(related,25);}
      body.innerHTML=html+isaFooter();
    }else{
      var head='<div class="kbm-count">'+list.length+' passende'+(list.length===1?'s Material':' Materialien')+(cyc?(' für Zyklus '+esc(cyc)):'')+'</div>';
      body.innerHTML=head+listHtml(list,60)+isaFooter();
    }
    body.scrollTop=0;
  }

  function isaFooter(){
    return '<div class="kbm-foot"><button class="kbm-btn" id="kbm-openlib">🧰 Ganze Material-Bibliothek öffnen</button></div>';
  }

  function renderDetail(id){
    var m=byId(id);if(!m)return;
    state.detailId=id;
    var body=ov.querySelector('#kbm-body');
    ov.querySelector('#kbm-title').innerHTML='📋 '+esc(m.title);
    ov.querySelector('#kbm-cyc').innerHTML='';
    var goals=(m.eldibGoals||[]).map(function(c){var d=domainOf(c),dm=DOM[d]||{color:'#777'};return '<span class="kbm-goalmini" style="border-color:'+dm.color+';color:'+dm.color+'">'+esc(c)+(GLAB[c]?(' '+esc(GLAB[c])):'')+'</span>';}).join('');
    var ablauf=(m.ablauf||[]).map(function(p){return '<div class="kbm-phase">'+(p.title?'<h5>'+esc(p.title)+'</h5>':'')+'<p>'+esc(p.text).replace(/\n/g,'<br>')+'</p></div>';}).join('');
    var info=[];
    if(m.author)info.push('Autor:in: '+esc(m.author));
    if(m.duration)info.push('Dauer: '+esc(m.duration));
    if(m.materialsNeeded)info.push('Material: '+esc(m.materialsNeeded));
    var html='<div class="kbm-detail">'+
      '<div class="kbm-d-back"><button class="kbm-btn" id="kbm-back">← Zurück zu den Treffern</button>'+
        '<button class="kbm-btn kbm-btn-p" id="kbm-print">'+(m.worksheet?'🖨️ Arbeitsblatt drucken':'🖨️ Material drucken')+'</button></div>'+
      '<div class="kbm-ages">'+ageBadges(m,false)+'</div>'+
      '<div class="kbm-meta">'+metaLine(m)+'</div>'+
      '<p class="kbm-desc-full">'+esc(m.shortDescription).replace(/\n/g,'<br>')+'</p>'+
      (info.length?'<div class="kbm-info">'+info.map(function(x){return '<div>'+x+'</div>';}).join('')+'</div>':'')+
      (m.themes&&m.themes.length?'<div class="kbm-tags">'+themeTags(m)+'</div>':'')+
      (ablauf?'<div class="kbm-section"><h4>Ablauf</h4>'+ablauf+'</div>':'')+
      (goals?'<div class="kbm-section"><h4>ELDiB-Förderziele</h4><div class="kbm-goals">'+goals+'</div></div>':'')+
      (m.worksheet?'<div class="kbm-section"><h4>Arbeitsblatt</h4>'+renderWorksheet(m.worksheet)+'</div>':'')+
    '</div>';
    body.innerHTML=html;
    body.scrollTop=0;
  }

  function renderWorksheet(ws){
    var out='';
    if(ws.title)out+='<div class="kbm-ws-title">'+esc(ws.title)+'</div>';
    if(ws.intro)out+='<div class="kbm-ws-intro">'+esc(ws.intro)+'</div>';
    (ws.blocks||[]).forEach(function(b){out+=wsBlock(b);});
    return '<div class="kbm-ws">'+out+'</div>';
  }
  function wsBlock(b){
    var n=b.lines||2,i,r;
    if(b.kind==='heading')return '<h5 class="kbm-ws-h">'+esc(b.text||'')+'</h5>';
    if(b.kind==='instruction')return '<p class="kbm-ws-ins">'+esc(b.text||'')+'</p>';
    if(b.kind==='question'){r='<div class="kbm-ws-q"><div class="kbm-ws-qp">'+esc(b.text||'')+'</div>';for(i=0;i<n;i++)r+='<div class="kbm-ws-line"></div>';return r+'</div>';}
    if(b.kind==='lines'){r='<div class="kbm-ws-q">'+(b.text?'<div class="kbm-ws-qp">'+esc(b.text)+'</div>':'');for(i=0;i<n;i++)r+='<div class="kbm-ws-line"></div>';return r+'</div>';}
    if(b.kind==='box')return '<div class="kbm-ws-box" style="min-height:'+(n*20+10)+'px">'+(b.text?'<span class="kbm-ws-boxl">'+esc(b.text)+'</span>':'')+'</div>';
    if(b.kind==='checklist'){r='<ul class="kbm-ws-check">';(b.items||[]).forEach(function(it){r+='<li><span class="kbm-ws-tick"></span>'+esc(it)+'</li>';});return r+'</ul>';}
    if(b.kind==='scale'){r='<div class="kbm-ws-q"><div class="kbm-ws-qp">'+esc(b.text||'')+'</div><div class="kbm-ws-scale">';(b.items||[]).forEach(function(it){r+='<span class="kbm-ws-sc"><span class="kbm-ws-tick"></span>'+esc(it)+'</span>';});return r+'</div></div>';}
    if(b.kind==='table'){var cols=b.items||[];r='<table class="kbm-ws-tab"><thead><tr>';cols.forEach(function(c){r+='<th>'+esc(c)+'</th>';});r+='</tr></thead><tbody>';for(i=0;i<n;i++){r+='<tr>';cols.forEach(function(){r+='<td></td>';});r+='</tr>';}return r+'</tbody></table>';}
    return '';
  }

  function printSheet(id){
    var m=byId(id);if(!m)return;
    var inner;
    if(m.worksheet){inner=renderWorksheet(m.worksheet);}
    else{inner='<p>'+esc(m.shortDescription).replace(/\n/g,'<br>')+'</p>'+(m.ablauf||[]).map(function(p){return (p.title?'<h3>'+esc(p.title)+'</h3>':'')+'<p>'+esc(p.text).replace(/\n/g,'<br>')+'</p>';}).join('');}
    var css='body{font-family:Inter,Arial,sans-serif;color:#1a1a2e;margin:32px;line-height:1.5}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;color:#555;font-weight:600;margin:0 0 18px}h3{font-size:14px;margin:14px 0 4px}.kbm-ws-h{font-size:15px;font-weight:700;margin:16px 0 6px;border-bottom:1px solid #ccc;padding-bottom:3px}.kbm-ws-ins{color:#444;font-style:italic;margin:6px 0}.kbm-ws-qp{font-weight:600;margin:10px 0 4px}.kbm-ws-line{border-bottom:1px solid #999;height:22px;margin:6px 0}.kbm-ws-box{border:1px solid #999;border-radius:6px;margin:8px 0;padding:6px}.kbm-ws-check{list-style:none;padding:0}.kbm-ws-check li{margin:6px 0}.kbm-ws-tick{display:inline-block;width:13px;height:13px;border:1.5px solid #555;border-radius:3px;margin-right:8px;vertical-align:middle}.kbm-ws-tab{border-collapse:collapse;width:100%;margin:8px 0}.kbm-ws-tab th,.kbm-ws-tab td{border:1px solid #999;padding:7px 9px;text-align:left}.kbm-ws-tab td{height:26px}.kbm-ws-sc{display:inline-block;margin-right:16px}.kbm-ws-title{font-weight:700;font-size:16px;margin:0 0 8px}.kbm-ws-intro{color:#444;margin:0 0 12px}';
    var w=window.open('','_blank');if(!w)return;
    w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>'+esc(m.title)+'</title><style>'+css+'</style></head><body><h1>'+esc(m.title)+'</h1><h2>'+esc(m.worksheet&&m.worksheet.title?m.worksheet.title:'ISA · Material')+'</h2>'+inner+'</body></html>');
    w.document.close();
    setTimeout(function(){try{w.focus();w.print();}catch(e){}},250);
  }

  function onOvClick(e){
    var t=e.target;
    var c=t.closest&&t.closest('[data-cyc]');
    if(c){var v=c.getAttribute('data-cyc');state.cyc=v;
      /* Konkreten Zyklus dauerhaft am Schüler speichern; „alle" filtert nur temporär. */
      if(v&&window.KB_ROSTER){try{window.KB_ROSTER.update(state.sid,{zyklus:v});}catch(_){}}
      renderResults();return;}
    var d=t.closest&&t.closest('[data-detail]');
    if(d){renderDetail(d.getAttribute('data-detail'));return;}
    if(t.id==='kbm-back'){renderResults();return;}
    if(t.id==='kbm-print'){printSheet(state.detailId);return;}
    if(t.id==='kbm-openlib'){closeOverlay();gotoTab();return;}
  }

  function openMatch(opts){
    state={mode:opts.mode,key:opts.key,sid:opts.sid,label:opts.label,cyc:cycleOf(opts.sid)};
    openOverlay();renderResults();
  }

  /* ---------- Material-Tab (ISA-App.html intakt im iframe) ---------- */
  function loadTab(){
    var host=document.getElementById('isa-host');if(!host)return;
    if(host.getAttribute('data-loaded'))return;
    host.setAttribute('data-loaded','1');
    host.innerHTML='<div class="isa-loading">Material-Bibliothek wird geladen …</div>';
    try{
      var node=document.getElementById('kb-isa-b64');var b64=node?node.textContent.trim():'';
      if(!b64){host.innerHTML='<div class="isa-loading">Material-Bibliothek nicht eingebettet.</div>';return;}
      var bin=atob(b64),bytes=new Uint8Array(bin.length);
      for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      var html=new TextDecoder('utf-8').decode(bytes);
      var ifr=document.createElement('iframe');ifr.className='isa-frame';ifr.title='ISA Material-Bibliothek';
      ifr.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-modals allow-downloads allow-forms allow-popups-to-escape-sandbox');
      host.innerHTML='';host.appendChild(ifr);
      ifr.srcdoc=html;
    }catch(e){host.innerHTML='<div class="isa-loading">Fehler beim Laden der Bibliothek: '+esc(e&&e.message||e)+'</div>';}
  }
  function gotoTab(){
    if(window.__kbGo){window.__kbGo('material');}
    else{var b=document.querySelector('[data-kb-nav="material"]');if(b)b.click();}
  }

  /* ---------- Wiring ---------- */
  function goalLabelFromEl(el){return el.getAttribute('data-mat-label')||'';}
  document.addEventListener('click',function(e){
    var g=e.target.closest&&e.target.closest('[data-mat-goal]');
    if(g){e.preventDefault();openMatch({mode:'goal',key:g.getAttribute('data-mat-goal'),sid:g.getAttribute('data-mat-sid'),label:goalLabelFromEl(g)});return;}
    var th=e.target.closest&&e.target.closest('[data-mat-theme]');
    if(th){e.preventDefault();openMatch({mode:'theme',key:th.getAttribute('data-mat-theme'),sid:th.getAttribute('data-mat-sid'),label:th.getAttribute('data-mat-label')||th.getAttribute('data-mat-theme')});return;}
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ov&&ov.classList.contains('open'))closeOverlay();});

  return {
    all:function(){return DATA;},
    forGoal:forGoal,forTheme:forTheme,themeMatchable:themeMatchable,
    cycleOf:cycleOf,byId:byId,
    openMatch:openMatch,openTab:loadTab,gotoTab:gotoTab,close:closeOverlay,
    THEME_MAP:THEME_MAP
  };
})();
