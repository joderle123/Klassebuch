/* Materialvorschläge im Klassenbuch – aus dem Verzeichnis der Hub-Toolbox
   (toolbox-index.js neben dieser Datei): zuerst die neuen Arbeitsblätter,
   dann die Materialien. Details, Druck und Arbeitsblätter öffnen sich in der
   Toolbox des Hubs (#blatt=… bzw. #material=…). */
window.KB_MATERIALS=(function(){
  var TAX=window.KB_TAXONOMY||{};
  var IDX=window.CDSE_TOOLBOX_INDEX||{};
  var THID={};(function(){var l=TAX.themeLabels||{};for(var k in l){THID[l[k]]=k;}})();
  var DATA=(IDX.blaetter||[]).map(function(b){return {id:'blatt:'+b.id,ziel:'blatt='+encodeURIComponent(b.id),blatt:true,title:(b.nr?b.nr+' ':'')+b.titel,ageLevels:b.stufen||[],type:['Arbeitsblatt'],themes:[],tags:[b.bereich,b.thema].filter(Boolean),shortDescription:b.kurz||'',eldibGoals:b.eldib||[]};})
    .concat((IDX.materialien||[]).map(function(m){return {id:m.id,ziel:'material='+encodeURIComponent(m.id),title:m.titel,ageLevels:m.alter||[],type:m.typ||[],themes:(m.themen||[]).map(function(t){return THID[t]||t;}),tags:m.themen||[],shortDescription:m.kurz||'',eldibGoals:m.eldib||[],worksheet:!!m.ab,ki:!!m.ki};}));
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
      var score=(exact?1000:0)+(related?100:0)+(m.blatt?60:0)+as*8;   /* neue Arbeitsblätter der Toolbox zuerst */
      res.push({m:m,score:score,exact:exact,tier:exact?'exact':'related',age:as,warn:(cyc&&as===0)});
    }
    res.sort(function(a,b){return b.score-a.score||(a.m.title<b.m.title?-1:1);});
    return res;
  }

  /* Fallback, wenn ein Förderziel KEINEN ELDiB-Code hat (nur eine
     Zielformulierung als Text): Stichwörter der Formulierung gegen
     Titel/Beschreibung/Themen/Tags der Materialien matchen. */
  var STOP={und:1,oder:1,der:1,die:1,das:1,den:1,dem:1,ein:1,eine:1,einen:1,einem:1,einer:1,mich:1,mir:1,sich:1,ich:1,meine:1,meinen:1,meines:1,nicht:1,bevor:1,erst:1,zuerst:1,wenn:1,dass:1,auf:1,bei:1,mit:1,fuer:1,für:1,von:1,zum:1,zur:1,wie:1,auch:1,aber:1,noch:1,schon:1,kann:1,soll:1,will:1,wird:1,sind:1,habe:1,haben:1,bin:1,ist:1,war:1,sein:1,ihre:1,seine:1,andere:1,anderen:1,immer:1,mehr:1,sehr:1,ganz:1,dann:1,hier:1,dort:1,lasse:1,ziehe:1,wende:1,reagiere:1,akzeptiere:1};
  /* Stamm-/Präfix-Match: deutsche Wortformen unterscheiden sich (aggressiv/
     Aggression, Verhalten/Verhaltens) — daher auf die ersten ~6 Zeichen kürzen. */
  function kw(text){var w=String(text||'').toLowerCase().replace(/[„“”"’'.,;:!?()\/]/g,' ').split(/\s+/);var out=[],seen={};for(var i=0;i<w.length;i++){var x=w[i];if(x.length>=5&&!STOP[x]){var st=x.slice(0,6);if(!seen[st]){seen[st]=1;out.push(st);}}}return out;}
  function forGoalText(text,cyc){
    var words=kw(text); if(!words.length)return [];
    var res=[];
    for(var i=0;i<DATA.length;i++){
      var m=DATA[i];
      var hay=((m.title||'')+' '+(m.shortDescription||'')+' '+(m.tags||[]).join(' ')+' '+(m.themes||[]).map(function(t){return THLAB[t]||t;}).join(' ')).toLowerCase();
      var sc=0; for(var w=0;w<words.length;w++){ if(hay.indexOf(words[w])>=0)sc++; }
      if(sc<2)continue;
      var as=ageScore(m,cyc); if(cyc&&as===0)continue;
      res.push({m:m,score:sc*10+as+(m.blatt?5:0),age:as,warn:false});
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
      res.push({m:m,score:ts*10+as+(m.blatt?5:0),age:as,warn:false});
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
    bits.push(m.blatt?'Arbeitsblatt der Toolbox':(m.ki?'KI-Entwurf':'Original'));
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
      '<div class="kbm-acts"><button class="kbm-btn kbm-btn-p" data-detail="'+esc(m.id)+'">'+(m.blatt?'📝 Arbeitsblatt in der Toolbox':(m.worksheet?'📝 Arbeitsblatt &amp; Details (Toolbox)':'📋 Details in der Toolbox'))+'</button></div></div>';
  }
  function listHtml(arr,cap){return '<div class="kbm-list">'+arr.slice(0,cap).map(cardHtml).join('')+'</div>'+(arr.length>cap?'<div class="kbm-more">… '+(arr.length-cap)+' weitere — bitte Zyklus eingrenzen.</div>':'');}

  function renderResults(){
    var cyc=state.cyc;
    var isTextGoal=(state.mode==='goal'&&!state.key);
    var list=state.mode==='goal'?(state.key?forGoal(state.key,cyc):forGoalText(state.goaltext,cyc)):forTheme(state.key,cyc);
    state.last=list;
    var title;
    if(state.mode==='goal'){
      if(state.key){
        var d=domainOf(state.key),dm=DOM[d]||{label:d,color:'#777'};
        title='📄 Arbeitsblätter zum Förderziel <span class="kbm-goalcode" style="background:'+dm.color+'">'+esc(state.key)+'</span> '+esc(state.label||GLAB[state.key]||'');
      }else{
        title='📄 Arbeitsblätter zum Förderziel „'+esc(state.label||state.goaltext||'')+'“';
      }
    }else{
      title='📄 Arbeitsblätter zur Thematik „'+esc(state.label||state.key)+'“';
    }
    ov.querySelector('#kbm-title').innerHTML=title;
    ov.querySelector('#kbm-cyc').innerHTML=cycBar();
    var body=ov.querySelector('#kbm-body');
    if(!list.length){
      body.innerHTML='<div class="kbm-count">0 Treffer'+(cyc?(' für Zyklus '+esc(cyc)):'')+'</div><div class="kbm-empty">Keine passenden Materialien'+(cyc?(' für Zyklus '+esc(cyc)+' — versuche „alle“ Zyklen'):'')+(isTextGoal?'. Dieses Ziel hat keinen ELDiB-Code — gesucht wurde nach Stichworten der Zielformulierung.':'.')+'</div>'+isaFooter();
      return;
    }
    if(state.mode==='goal'&&state.key){
      var exact=[],related=[];
      for(var i=0;i<list.length;i++){(list[i].exact?exact:related).push(list[i]);}
      var dlabel=esc((DOM[domainOf(state.key)]||{}).label||domainOf(state.key));
      var html='<div class="kbm-count">'+exact.length+' direkt passende'+(exact.length===1?'s Material':' Materialien')+(cyc?(' für Zyklus '+esc(cyc)):'')+'</div>';
      if(exact.length){html+=listHtml(exact,40);}
      else{html+='<div class="kbm-empty">Kein Material trainiert genau diesen Code — verwandte Materialien siehe unten.</div>';}
      if(related.length){html+='<div class="kbm-divider">↓ Verwandt — selber Entwicklungsschritt im Bereich '+dlabel+'</div>'+listHtml(related,25);}
      body.innerHTML=html+isaFooter();
    }else{
      var note=isTextGoal?' <span style="font-weight:600;opacity:.65;">(nach Stichworten der Zielformulierung)</span>':'';
      var head='<div class="kbm-count">'+list.length+' passende'+(list.length===1?'s Material':' Materialien')+(cyc?(' für Zyklus '+esc(cyc)):'')+note+'</div>';
      body.innerHTML=head+listHtml(list,60)+isaFooter();
    }
    body.scrollTop=0;
  }

  function isaFooter(){
    var zu=(state&&state.mode==='goal'&&state.key)?' zum Ziel '+esc(state.key):'';
    return '<div class="kbm-foot"><button class="kbm-btn" id="kbm-openlib">🧰 Toolbox öffnen'+zu+'</button>'+(DATA.length?'':'<span class="kbm-foot-hinweis">Das Verzeichnis der Toolbox (toolbox-index.js) liegt nicht neben dieser Datei – bitte über den Hub öffnen.</span>')+'</div>';
  }
  /* Toolbox des Hubs im eigenen Tab öffnen (derselbe Tab wie aus dem Hub) */
  function toolbox(ziel){var w=window.open('toolbox.html'+(ziel?'#'+ziel:''),'cdse-toolbox');if(w){try{w.focus();}catch(e){}}}

  function onOvClick(e){
    var t=e.target;
    var c=t.closest&&t.closest('[data-cyc]');
    if(c){var v=c.getAttribute('data-cyc');state.cyc=v;
      /* Konkreten Zyklus dauerhaft am Schüler speichern; „alle" filtert nur temporär. */
      if(v&&window.KB_ROSTER){try{window.KB_ROSTER.update(state.sid,{zyklus:v});}catch(_){}}
      renderResults();return;}
    var d=t.closest&&t.closest('[data-detail]');
    if(d){var m=byId(d.getAttribute('data-detail'));if(m){toolbox(m.ziel);}return;}
    if(t.closest&&t.closest('#kbm-openlib')){closeOverlay();toolbox(state&&state.mode==='goal'&&state.key?'eldib='+encodeURIComponent(state.key):'');return;}
  }

  function openMatch(opts){
    state={mode:opts.mode,key:opts.key,goaltext:opts.goaltext||'',sid:opts.sid,label:opts.label,cyc:cycleOf(opts.sid)};
    openOverlay();renderResults();
  }

  function loadTab(){toolbox('');}
  function gotoTab(){toolbox('');}

  /* ---------- Wiring ---------- */
  function goalLabelFromEl(el){return el.getAttribute('data-mat-label')||'';}
  document.addEventListener('click',function(e){
    var g=e.target.closest&&e.target.closest('[data-mat-goal]');
    if(g){e.preventDefault();openMatch({mode:'goal',key:g.getAttribute('data-mat-goal'),goaltext:g.getAttribute('data-mat-goaltext')||'',sid:g.getAttribute('data-mat-sid'),label:goalLabelFromEl(g)});return;}
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
