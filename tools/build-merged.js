/* ============================================================
   build-merged.js — erzeugt die fusionierte index.html
   ------------------------------------------------------------
   Fügt anwesenheit.html + dossier.html zu EINER App zusammen:
     • EIN aufgeräumtes Seitenmenü (Schüler · Réunionen · Klassenbuch ·
       Absenzen · Klasse · Mehr)
     • Schüler-Hub: Klick auf einen Schüler -> Reiter Übersicht / Réunion /
       Dossier / Absenzen / Aufgaben / Helfernetz (Platzhalter)
     • gemeinsame Schülerliste (KB_ROSTER, 8 Schüler) für beide Bereiche
     • CSS jeder App unter ihren Wurzel-Container gescoped
   Aufruf:  node tools/build-merged.js
   ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function between(s, a, b) {
  var i = s.indexOf(a); if (i < 0) throw new Error('Marker fehlt: ' + a);
  i += a.length;
  var j = s.indexOf(b, i); if (j < 0) throw new Error('Endmarker fehlt: ' + b);
  return s.slice(i, j);
}
function replaceOnce(s, find, repl, label) {
  var i = s.indexOf(find);
  if (i < 0) throw new Error('Patch-Anker nicht gefunden: ' + label);
  if (s.indexOf(find, i + 1) >= 0) throw new Error('Patch-Anker mehrdeutig: ' + label);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

var anw = read('anwesenheit.html');
var dos = read('dossier.html');

/* ---- Teile extrahieren ---- */
var anwStyle  = between(anw, '<style>', '</style>');
var anwBody   = between(anw, '<body>', '<script>');
var anwScript = between(anw, '<script>', '</script>');
var dosStyle  = between(dos, '<style>', '</style>');
var dosBody   = between(dos, '<body>', '<script>');
var dosScript = between(dos, '<script>', '</script>');

/* ============================================================
   CSS-Scoper
   ============================================================ */
function splitTopComma(sel) {
  var parts = [], depth = 0, cur = '';
  for (var k = 0; k < sel.length; k++) {
    var c = sel[k];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  return parts;
}
function scopeSelector(sel, scope) {
  return splitTopComma(sel).map(function (one) {
    var s = one.trim();
    if (!s) return '';
    var low = s.toLowerCase();
    if (low === ':root' || low === 'html' || low === 'body') return scope;
    if (s === '*') return scope + ' *';
    s = s.replace(/^html\s+/i, '').replace(/^body\s+/i, '');
    return scope + ' ' + s;
  }).filter(Boolean).join(', ');
}
function scopeCss(css, scope) {
  var out = '', i = 0, n = css.length;
  while (i < n) {
    var c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      var e = css.indexOf('*/', i); e = e < 0 ? n : e + 2;
      out += css.slice(i, e); i = e; continue;
    }
    if (/\s/.test(c)) { out += c; i++; continue; }
    var start = i;
    while (i < n) {
      if (css[i] === '/' && css[i + 1] === '*') { var ce = css.indexOf('*/', i); i = ce < 0 ? n : ce + 2; continue; }
      if (css[i] === '{' || css[i] === ';' || css[i] === '}') break;
      i++;
    }
    if (i >= n) { out += css.slice(start); break; }
    if (css[i] === ';') { out += css.slice(start, i + 1); i++; continue; }
    if (css[i] === '}') { out += css.slice(start, i + 1); i++; continue; }
    var prelude = css.slice(start, i).trim();
    var depth = 0, bs = i;
    do {
      if (css[i] === '/' && css[i + 1] === '*') { var c2 = css.indexOf('*/', i); i = c2 < 0 ? n : c2 + 1; }
      else if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    } while (i < n && depth > 0);
    var block = css.slice(bs + 1, i - 1);
    if (prelude.charAt(0) === '@') {
      var at = prelude.split(/\s|\(/)[0].toLowerCase();
      if (at === '@media' || at === '@supports' || at === '@container') {
        out += prelude + '{' + scopeCss(block, scope) + '}';
      } else {
        out += prelude + '{' + block + '}';
      }
    } else {
      out += scopeSelector(prelude, scope) + '{' + block + '}';
    }
  }
  return out;
}
var anwStyleScoped = scopeCss(anwStyle, '#anw-root');
var dosStyleScoped = scopeCss(dosStyle, '#dos-root');

/* ============================================================
   Patches der anwesenheit-Engine
   ============================================================ */
anwScript = replaceOnce(anwScript,
  'load();ensurePeriods();',
  "load();if(window.KB_ROSTER){state.students=window.KB_ROSTER.asAnwesenheit();}ensurePeriods();",
  'anw:init-roster');
anwScript = replaceOnce(anwScript,
  's.level=lv;save();renderStudentMgmt();renderStudents();',
  's.level=lv;if(window.KB_ROSTER){window.KB_ROSTER.setLevel(id,lv);}save();renderStudents();',
  'anw:setLevel-roster');
anwScript = replaceOnce(anwScript,
  "if(!state.currentUser){renderUserGrid();openModal('modal-user');}",
  "/* Bediener-Auswahl in der gemeinsamen App nicht erzwingen */",
  'anw:no-force-user');

/* Lese-Schnittstelle KB_ANW + Refresh-Hook am Ende der IIFE einsetzen */
var ANW_API = [
  "  window.KB_ANW={",
  "    entriesForStudent:function(id){return state.entries.filter(function(e){return e.studentId===id;});},",
  "    summaryForStudent:function(id){var e=0,u=0,v=0,he=0,hu=0;state.entries.forEach(function(x){if(x.studentId!==id)return;var h=countHours(x);if(x.status==='entschuldigt'){e++;he+=h;}else if(x.status==='unentschuldigt'){u++;hu+=h;}else if(x.status==='verspaetet'){v++;}});return {entschuldigt:e,unentschuldigt:u,verspaetet:v,hoursEnt:he,hoursUnent:hu,total:e+u+v};},",
  "    recentForStudent:function(id,n){return state.entries.filter(function(e){return e.studentId===id;}).sort(function(a,b){return a.date<b.date?1:-1;}).slice(0,n||8);},",
  "    notes:function(){return state.notes.slice().sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:0);});},",
  "    tasksForLevel:function(level){return state.notes.filter(function(n){return (n.type==='hausaufgabe'||n.type==='pruefung')&&(!n.level||!level||n.level===level);}).sort(function(a,b){return a.date<b.date?1:-1;});},",
  "    statusLabel:function(s){return (STATUS[s]&&STATUS[s].label)||s;},",
  "    fmt:function(iso){return fmtD(iso);},",
  "    openStudent:function(id){activeStudentId=id;var s=state.students.find(function(x){return x.id===id;});if(s){classFilter=s.level||classFilter;}renderAll();},",
  "    openNoteToday:function(){openNoteModal({date:today(),blockId:null,subject:null,level:null});},",
  "    delNote:function(id){delNote(id);},",
  "    exportEntries:function(){return state.entries.map(function(e){return e;});},",
  "    exportNotes:function(){return state.notes.map(function(n){return n;});},",
  "    exportSettings:function(){return {id:'settings',timetable:state.timetable,periods:state.periods,ttVersion:state.ttVersion};},",
  "    applyEntries:function(list){state.entries=(list||[]).slice();save();renderAll();},",
  "    applyNotes:function(list){state.notes=(list||[]).slice();save();renderAll();},",
  "    applySettings:function(s){if(s){if(s.timetable){state.timetable=s.timetable;}if(s.periods){state.periods=s.periods;}if(s.ttVersion!=null){state.ttVersion=s.ttVersion;}}save();renderAll();}",
  "  };",
  "  window.__anwRefresh=function(){if(window.KB_ROSTER){state.students=window.KB_ROSTER.asAnwesenheit();}renderAll();};"
].join("\n");
anwScript = replaceOnce(anwScript, 'else init();\n})();', 'else init();\n' + ANW_API + '\n})();', 'anw:api-hook');

/* Klassenbuch-Beiträge der Woche klar NACH TAG gruppiert anzeigen (unter dem Raster). */
anwScript = replaceOnce(anwScript,
  `return '<div class="wk-notes"><div class="wk-notes-head"><h4>📔 Klassenbuch — diese Woche</h4><span class="badge">'+list.length+'</span></div><div class="wk-notes-list">'+items+'</div></div>';`,
  `var byDay={};list.forEach(function(n){(byDay[n.date]=byDay[n.date]||[]).push(n);});
    var dayHtml=days.map(function(d){var dl=byDay[d]||[];if(!dl.length){return '';}return '<div class="kb-day-notes"><div class="kb-day-h">'+DOW[wdOf(d)]+', '+fmtD(d)+' <span class="badge">'+dl.length+'</span></div>'+dl.map(function(n){var nt=NOTE_TYPES[n.type]||NOTE_TYPES.allgemein;var b=BLOCKS.find(function(x){return x.id===n.blockId;});var meta=(n.subject||'Allgemein')+(b?' · '+b.start+'–'+b.end:'');return '<div class="wk-note '+n.type+'" data-noteopen="'+n.id+'"><span class="wn-ic">'+nt.icon+'</span><div class="wn-body"><div class="wn-meta">'+nt.label+' · '+esc(meta)+(n.byUser?' · <span style="color:var(--primary-dark);">'+esc(n.byUser)+'</span>':'')+'</div><div class="wn-txt">'+esc(n.text)+'</div></div></div>';}).join('')+'</div>';}).join('');
    return '<div class="wk-notes"><div class="wk-notes-head"><h4>📔 Klassenbuch — Beiträge nach Tag</h4><span class="badge">'+list.length+'</span></div><div class="wk-notes-list">'+(dayHtml||'<div class="wk-notes-empty">Keine Notizen diese Woche.</div>')+'</div></div>';`,
  'anw:weeknotes-byday');

/* ============================================================
   Patch der dossier-Engine: Reconcile-Aufruf in den Bootstrap
   ============================================================ */
dosScript = replaceOnce(dosScript,
  '    checkPersistenceAndWarn();\n    render();',
  '    checkPersistenceAndWarn();\n    if(window.KB_DOS_RECONCILE){try{window.KB_DOS_RECONCILE();}catch(e){}}\n    render();',
  'dos:reconcile-hook');

/* Info-Chips (Aktive Stellen / Behandler / Laufende Themen) im Schüler-Dossier
   anklickbar machen -> Suche zeigt sofort die Beiträge zu diesem Begriff. */
(function(){
  var find = `'<span class="chip">' + escapeHtml(i) + '</span>'`;
  var repl = `'<button type="button" class="chip chip-link" data-route="#/search?student=' + encodeURIComponent(student.id) + '&q=' + encodeURIComponent(i) + '">' + escapeHtml(i) + '</button>'`;
  var count = dosScript.split(find).length - 1;
  if (count !== 3) throw new Error('Chip-Muster: erwartet 3, gefunden ' + count);
  dosScript = dosScript.split(find).join(repl);
})();

/* ============================================================
   Statische Bausteine
   ============================================================ */
var SHELL_CSS = `
*{box-sizing:border-box;}
:root{
  --kb-accent:#4f5bd5; --kb-accent-dark:#3e49b0; --kb-accent-light:#7c86e6;
  --kb-accent-50:#eef0fc; --kb-accent-100:#dde1f8;
  --kb-bg:#eef1f7; --kb-surface:#ffffff; --kb-border:#e3e7f1;
  --kb-text:#1d2433; --kb-muted:#5c6478;
}
html,body{margin:0;padding:0;}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--kb-text);background:var(--kb-bg);-webkit-font-smoothing:antialiased;}
.kb-app{display:flex;min-height:100vh;min-height:100dvh;}
.kb-topbar{display:none;}
.kb-side{flex:0 0 248px;width:248px;background:var(--kb-surface);border-right:1px solid var(--kb-border);display:flex;flex-direction:column;padding:16px 12px;position:sticky;top:0;height:100vh;height:100dvh;overflow:auto;z-index:40;}
.kb-brand{display:flex;align-items:center;gap:11px;padding:4px 8px 16px;}
.kb-logo{flex:0 0 auto;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:19px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;}
.kb-brandtext{display:flex;flex-direction:column;line-height:1.15;}
.kb-brandtext b{font-weight:800;font-size:16px;letter-spacing:-.02em;}
.kb-brandtext small{font-size:11px;color:var(--kb-muted);font-weight:600;}
.kb-nav{display:flex;flex-direction:column;gap:3px;}
.kb-link{display:flex;align-items:center;gap:11px;padding:10px 11px;border:none;background:none;border-radius:9px;cursor:pointer;font:inherit;font-size:14px;font-weight:600;color:var(--kb-text);text-align:left;width:100%;transition:.13s;}
.kb-link:hover{background:var(--kb-accent-50);}
.kb-link.active{background:var(--kb-accent);color:#fff;box-shadow:0 4px 12px rgba(79,91,213,.3);}
.kb-ic{flex:0 0 auto;width:22px;text-align:center;font-size:15px;}
.kb-more-toggle{margin-top:8px;color:var(--kb-muted);font-weight:700;font-size:12.5px;}
.kb-more-caret{margin-left:auto;transition:transform .15s;font-size:11px;}
.kb-more-toggle.open .kb-more-caret{transform:rotate(180deg);}
.kb-more{display:none;flex-direction:column;gap:3px;margin-top:3px;padding-left:6px;border-left:2px solid var(--kb-border);}
.kb-more.open{display:flex;}
.kb-foot{margin-top:auto;font-size:11px;color:var(--kb-muted);padding:14px 8px 4px;line-height:1.45;}
.kb-stage{flex:1;min-width:0;position:relative;}
.kb-panel{display:none;}
.kb-panel.active{display:block;}
.kb-pad{padding:24px 28px 64px;max-width:1120px;}
.kb-pagehead h2{margin:0 0 4px;font-size:22px;letter-spacing:-.02em;}
.kb-card{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:14px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(20,25,45,.04);}
.kb-in{font:inherit;padding:8px 10px;border:1px solid var(--kb-border);border-radius:9px;background:#fff;color:var(--kb-text);width:100%;}
.kb-in:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.kb-btn{font:inherit;font-weight:700;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);padding:9px 15px;border-radius:9px;cursor:pointer;transition:.13s;}
.kb-btn:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.kb-btn-primary{background:var(--kb-accent);color:#fff;border-color:var(--kb-accent);}
.kb-btn-primary:hover{background:var(--kb-accent-dark);color:#fff;}
.kb-btn-ghost{background:none;border-color:transparent;}
.kb-table{width:100%;border-collapse:collapse;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:12px;overflow:hidden;}
.kb-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--kb-muted);background:var(--kb-accent-50);padding:9px 12px;}
.kb-table td{padding:8px 12px;border-top:1px solid var(--kb-border);vertical-align:middle;}
/* Schüler-Hub */
.kb-hub-head{padding:18px 24px 0;}
.kb-hub-back{display:inline-block;color:var(--kb-muted);text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px;}
.kb-hub-back:hover{color:var(--kb-accent);}
.kb-hub-id{display:flex;align-items:center;gap:12px;margin:4px 0 14px;}
.kb-hub-avatar{flex:0 0 auto;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;display:grid;place-items:center;font-size:20px;font-weight:800;}
.kb-hub-name{font-size:21px;font-weight:800;letter-spacing:-.02em;}
.kb-hub-meta{color:var(--kb-muted);font-size:13px;font-weight:600;}
.kb-hub-tabs{display:flex;gap:3px;flex-wrap:wrap;border-bottom:1px solid var(--kb-border);}
.kb-hub-tab{padding:9px 15px;border-radius:9px 9px 0 0;text-decoration:none;color:var(--kb-muted);font-weight:700;font-size:13.5px;border-bottom:2px solid transparent;margin-bottom:-1px;}
.kb-hub-tab:hover{background:var(--kb-accent-50);color:var(--kb-text);}
.kb-hub-tab.active{color:var(--kb-accent);border-bottom-color:var(--kb-accent);background:var(--kb-accent-50);}
.kb-hub-body{padding:18px 24px 56px;max-width:1080px;}
.kb-hub-pad{max-width:840px;}
.kb-hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;align-items:start;}
.kb-stat-row{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0 12px;}
.kb-stat{text-align:center;}
.kb-stat-n{font-size:24px;font-weight:800;color:var(--kb-accent);line-height:1;}
.kb-stat-l{font-size:10.5px;color:var(--kb-muted);text-transform:uppercase;letter-spacing:.03em;margin-top:3px;}
.kb-placeholder{text-align:center;padding:54px 20px;color:var(--kb-muted);border:2px dashed var(--kb-border);border-radius:16px;background:var(--kb-surface);}
.kb-placeholder-ic{font-size:46px;opacity:.55;margin-bottom:6px;}
.kb-placeholder h3{margin:0 0 6px;color:var(--kb-text);}
.kb-note{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--kb-border);}
.kb-note:first-of-type{border-top:none;}
.kb-note-badge{flex:0 0 auto;font-size:18px;line-height:1.3;}
.kb-note-main{flex:1;min-width:0;}
.kb-note-meta{font-size:12px;color:var(--kb-muted);margin-bottom:2px;}
.kb-note-date{font-weight:800;margin-bottom:8px;font-size:14px;}
/* Helfernetz / Support Bubble */
.kb-bubble-bar{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.kb-bubble-bar label{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:var(--kb-muted);}
.kb-bubble-cols{display:grid;grid-template-columns:340px 1fr;gap:20px;align-items:start;}
.kb-bubble-selrow{display:flex;gap:8px;}
.kb-bubble-selrow label{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;color:var(--kb-muted);}
.kb-bubble-actions{display:flex;gap:8px;justify-content:flex-end;margin-bottom:10px;flex-wrap:wrap;}
.kb-bubble-svg{background:#fff;border:1px solid var(--kb-border);border-radius:14px;padding:10px;box-shadow:0 1px 2px rgba(20,25,45,.04);}
.kb-bubble-svg svg{display:block;width:100%;height:auto;}
.kb-bnode{display:flex;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--kb-border);}
.kb-bnode:first-child{border-top:none;}
.kb-bdot{flex:0 0 auto;width:12px;height:12px;border-radius:50%;}
.kb-bnode-main{flex:1;min-width:0;}
.kb-bnode-name{font-weight:700;font-size:13.5px;}
.kb-bnode-note{font-weight:400;color:var(--kb-muted);}
.kb-bnode-meta{font-size:11.5px;color:var(--kb-muted);}
@media(max-width:880px){.kb-bubble-cols{grid-template-columns:1fr;}}
/* Klassenbuch-Beiträge pro Tag + klickbare Dossier-Chips */
.kb-day-notes{margin:6px 0 2px;}
.kb-day-h{font-weight:800;font-size:13px;color:var(--kb-accent-dark);margin:12px 0 5px;padding-bottom:3px;border-bottom:1px solid var(--kb-border);}
.chip-link{cursor:pointer;}
#dos-root .chip-link:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.kb-scrim{display:none;}
@media(max-width:880px){
  .kb-app{flex-direction:column;}
  .kb-topbar{display:flex;align-items:center;gap:12px;padding:9px 14px;background:var(--kb-surface);border-bottom:1px solid var(--kb-border);position:sticky;top:0;z-index:50;}
  .kb-burger{font-size:19px;line-height:1;background:none;border:1px solid var(--kb-border);border-radius:9px;width:40px;height:40px;cursor:pointer;}
  .kb-topbrand{display:flex;align-items:center;gap:9px;font-weight:800;}
  .kb-topbrand .kb-logo{width:30px;height:30px;font-size:16px;}
  .kb-side{position:fixed;top:0;left:0;bottom:0;height:100vh;height:100dvh;transform:translateX(-100%);transition:transform .2s ease;box-shadow:0 0 50px rgba(0,0,0,.25);}
  .kb-app.kb-open .kb-side{transform:none;}
  .kb-app.kb-open .kb-scrim{display:block;position:fixed;inset:0;background:rgba(15,20,35,.45);z-index:39;}
  .kb-pad,.kb-hub-head,.kb-hub-body{padding-left:16px;padding-right:16px;}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;}}
`;

var ACCENT_OVERRIDE = `
#dos-root{ --accent:var(--kb-accent); --accent-soft:var(--kb-accent-50); }
#anw-root{ --primary:var(--kb-accent); --primary-dark:var(--kb-accent-dark); --primary-light:var(--kb-accent-light); --primary-50:var(--kb-accent-50); --primary-100:var(--kb-accent-100); }
#anw-root header{ position:static; background:linear-gradient(120deg,var(--kb-accent),var(--kb-accent-dark)); box-shadow:0 2px 12px rgba(79,91,213,.22); }
#anw-root header::after{ background:rgba(255,255,255,.2); }
/* Aktionen, die jetzt im Menü / in "Klasse" liegen, im anwesenheit-Kopf ausblenden */
#anw-root #btn-students,#anw-root #btn-add-student,
#anw-root #btn-tt,#anw-root #btn-cal,#anw-root #btn-pdf,#anw-root #btn-data{ display:none; }
#dos-root .main{ max-width:none; }
`;

var SHELL_BODY_TOP = `
<div class="kb-app" id="kb-app">
  <div class="kb-topbar">
    <button class="kb-burger" id="kb-burger" aria-label="Menü öffnen">☰</button>
    <div class="kb-topbrand"><span class="kb-logo">📘</span><span>Klassebuch</span></div>
  </div>
  <aside class="kb-side" id="kb-side" aria-label="Hauptnavigation">
    <div class="kb-brand"><span class="kb-logo">📘</span><span class="kb-brandtext"><b>Klassebuch</b><small>Annexe Junglinster</small></span></div>
    <nav class="kb-nav">
      <button class="kb-link" data-kb-nav="students"><span class="kb-ic">👥</span>Schüler</button>
      <button class="kb-link" data-kb-nav="reunion"><span class="kb-ic">🤝</span>Réunionen</button>
      <button class="kb-link" data-kb-nav="absenzen"><span class="kb-ic">📋</span>Klassenbuch</button>
      <button class="kb-link" data-kb-nav="klasse"><span class="kb-ic">🏫</span>Klasse</button>
      <button class="kb-link kb-more-toggle" id="kb-more-toggle" type="button"><span class="kb-ic">⋯</span>Mehr<span class="kb-more-caret">▾</span></button>
      <div class="kb-more" id="kb-more">
        <button class="kb-link" data-kb-nav="search"><span class="kb-ic">🔎</span>Suche</button>
        <button class="kb-link" data-kb-nav="themes"><span class="kb-ic">🏷️</span>Themen-Analyse</button>
        <button class="kb-link" data-kb-nav="orga"><span class="kb-ic">🗒️</span>Organisation</button>
        <button class="kb-link" data-kb-nav="absenzen-pdf"><span class="kb-ic">📄</span>Absenzen-PDF</button>
        <button class="kb-link" data-kb-nav="export"><span class="kb-ic">📑</span>Dossier-PDF</button>
        <button class="kb-link" data-kb-nav="ai"><span class="kb-ic">🤖</span>KI-Export</button>
        <button class="kb-link" data-kb-nav="data"><span class="kb-ic">💾</span>Daten & Backup</button>
      </div>
    </nav>
    <div class="kb-foot">Alle Daten bleiben lokal auf diesem Gerät. Kein Server, keine Cloud.</div>
  </aside>
  <div class="kb-scrim" id="kb-scrim"></div>
  <main class="kb-stage" id="kb-stage">
`;

var SHELL_PANELS_EXTRA = `
    <section class="kb-panel kb-pad" id="kb-klasse">
      <div class="kb-pagehead"><h2>🏫 Klasse</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Struktur der Klasse: Schülerliste, Stundenplan und Schulkalender.</p></div>
      <div class="kb-card" style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="kb-btn" data-kb-act="open-tt">🗓️ Stundenplan bearbeiten</button>
        <button class="kb-btn" data-kb-act="open-cal">📆 Schulkalender</button>
      </div>
      <h3 style="margin:18px 0 8px;">Gemeinsame Schülerliste</h3>
      <p style="margin:0 0 12px;color:var(--kb-muted);font-size:13.5px;">Eine Liste für Anwesenheit und Dossiers — Änderungen wirken sofort in beiden Bereichen.</p>
      <div class="kb-card" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input class="kb-in" id="kb-roster-name" style="flex:1;min-width:170px;" placeholder="Name des neuen Schülers">
        <input class="kb-in" id="kb-roster-klasse" style="max-width:130px;" placeholder="Klasse (optional)">
        <select class="kb-in" id="kb-roster-level" style="max-width:90px;"><option>L1</option><option>L2</option></select>
        <button class="kb-btn kb-btn-primary" id="kb-roster-add">+ Hinzufügen</button>
      </div>
      <div id="kb-roster-body"></div>
    </section>
    <section class="kb-panel kb-pad" id="kb-data">
      <div class="kb-pagehead"><h2>💾 Daten & Backup</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Sicherung und Export — getrennt nach Bereich, da beide unterschiedliche Daten enthalten.</p></div>
      <div class="kb-card"><h3 style="margin:0 0 6px;">📋 Anwesenheit & Klassenbuch</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Absenzen, Stundenplan und Notizen — Backup, Excel/CSV-Export, gemeinsame Datei.</p><button class="kb-btn kb-btn-primary" id="kb-data-anw">Anwesenheit-Daten öffnen</button></div>
      <div class="kb-card"><h3 style="margin:0 0 6px;">🗂️ Dossiers & Réunion</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Schüler-Dossiers, Réunionen und Organisation — Backup exportieren/importieren.</p><button class="kb-btn kb-btn-primary" id="kb-data-dos">Dossier-Backup öffnen</button></div>
    </section>
  </main>
</div>
`;

var ROSTER_MODULE = `
window.KB_ROSTER=(function(){
  var LS='klassebuch_roster_v1';
  var SEED=[
    {id:'stud_ben',   name:'Ben',     anonLabel:'Schüler G', klasse:'', level:'L1', active:true},
    {id:'stud_lilly', name:'Lilly',   anonLabel:'Schüler I', klasse:'', level:'L1', active:true},
    {id:'stud_jason', name:'Jason',   anonLabel:'Schüler D', klasse:'', level:'L1', active:true},
    {id:'stud_alexp', name:'Alex P.', anonLabel:'Schüler A', klasse:'', level:'L1', active:true},
    {id:'stud_alexk', name:'Alex K.', anonLabel:'Schüler B', klasse:'', level:'L1', active:true},
    {id:'stud_chase', name:'Chase',   anonLabel:'Schüler F', klasse:'', level:'L1', active:true},
    {id:'stud_colin', name:'Colin',   anonLabel:'Schüler C', klasse:'', level:'L1', active:true},
    {id:'stud_miguel',name:'Miguel',  anonLabel:'Schüler E', klasse:'', level:'L1', active:true}
  ];
  function clone(o){var r={};for(var k in o){r[k]=o[k];}return r;}
  function loadList(){
    try{var raw=localStorage.getItem(LS);if(raw){var a=JSON.parse(raw);if(a&&a.length){return a.map(clone);}}}catch(e){}
    return SEED.map(clone);
  }
  var list=loadList(); var hooks=[];
  function persist(){try{localStorage.setItem(LS,JSON.stringify(list));}catch(e){}}
  function notify(){persist();for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function find(id){for(var i=0;i<list.length;i++){if(list[i].id===id){return list[i];}}return null;}
  function newId(){return 'stud_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  return {
    list:function(){return list.map(clone);},
    byId:function(id){var s=find(id);return s?clone(s):null;},
    ids:function(){var m={};for(var i=0;i<list.length;i++){m[list[i].id]=true;}return m;},
    asAnwesenheit:function(){return list.map(function(s){return {id:s.id,name:s.name,klasse:s.klasse||'',level:s.level||'L1'};});},
    asDossier:function(){return list.map(function(s){return {id:s.id,name:s.name,anonLabel:s.anonLabel||'',active:s.active!==false,createdAt:s.createdAt||''};});},
    add:function(name,klasse,level){var id=newId();list.push({id:id,name:String(name||'').trim(),anonLabel:'',klasse:klasse||'',level:level||'L1',active:true,createdAt:new Date().toISOString()});notify();return id;},
    update:function(id,fields){var s=find(id);if(s){for(var k in fields){s[k]=fields[k];}notify();}},
    setLevel:function(id,lv){var s=find(id);if(s&&s.level!==lv){s.level=lv;notify();}},
    remove:function(id){list=list.filter(function(s){return s.id!==id;});notify();},
    onChange:function(fn){hooks.push(fn);}
  };
})();
`;

/* Monkey-Patches + Schüler-Hub für dossier (laufen NACH dem dossier-Skript) */
var DOS_OVERRIDES = `
(function(){
  if(typeof Repo==='undefined'){return;}
  function byName(a,b){return String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'});}
  Repo.listStudents=function(){return (window.KB_ROSTER?window.KB_ROSTER.asDossier():[]).sort(byName);};
  Repo.getStudent=function(id){var s=window.KB_ROSTER?window.KB_ROSTER.byId(id):null;return s?{id:s.id,name:s.name,anonLabel:s.anonLabel||'',active:s.active!==false,createdAt:s.createdAt||''}:null;};
  Repo.listEntries=function(){var keep=window.KB_ROSTER?window.KB_ROSTER.ids():{};return this.entries.filter(function(e){return keep[e.studentId];});};
  if(typeof shellHtml!=='undefined'){window.shellHtml=function(activeKey,contentHtml){return '<main class="main" id="main-content" tabindex="-1">'+contentHtml+'</main>';};}

  /* ---- Schüler-Hub: Wrapper um viewStudentDetail ---- */
  function rosterLevel(id){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(id);return (s&&s.level)||'L1';}
  function rosterKlasse(id){var s=window.KB_ROSTER&&window.KB_ROSTER.byId(id);return (s&&s.klasse)||'';}
  function stat(n,l){return '<div class="kb-stat"><div class="kb-stat-n">'+n+'</div><div class="kb-stat-l">'+escapeHtml(l)+'</div></div>';}
  function hubHeader(student,tab){
    var sid=student.id; var meta=[]; var kl=rosterKlasse(sid); if(kl){meta.push(escapeHtml(kl));} meta.push('Niveau '+escapeHtml(rosterLevel(sid)));
    var tabs=[['uebersicht','Übersicht'],['reunion','Réunion'],['dossier','Dossier'],['absenzen','Absenzen'],['aufgaben','Aufgaben'],['helfernetz','Helfernetz']];
    var tb=tabs.map(function(t){var r='#/student/'+encodeURIComponent(sid)+'?hub='+t[0];return '<a class="kb-hub-tab'+(t[0]===tab?' active':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(t[1])+'</a>';}).join('');
    var initial=escapeHtml((student.name||'?').charAt(0).toUpperCase());
    return '<div class="kb-hub-head">'+
      '<a class="kb-hub-back" href="#/dashboard" data-route="#/dashboard">← Alle Schüler</a>'+
      '<div class="kb-hub-id"><div class="kb-hub-avatar">'+initial+'</div><div><div class="kb-hub-name">'+escapeHtml(student.name)+'</div><div class="kb-hub-meta">'+meta.join(' · ')+'</div></div></div>'+
      '<div class="kb-hub-tabs">'+tb+'</div></div>';
  }
  function hubOverview(student){
    var sid=student.id;
    var sum=window.KB_ANW?window.KB_ANW.summaryForStudent(sid):{entschuldigt:0,unentschuldigt:0,verspaetet:0};
    var entries=Repo.entriesForStudent(sid).slice().sort(function(a,b){return a.date<b.date?1:-1;});
    var last=entries[0];
    var reu=Repo.listReunions(); var lastReu=null,lastReuDate=null,goals=[];
    for(var i=0;i<reu.length;i++){var e=Repo.reunionEntryFor(reu[i].date,sid);if(e&&!lastReu){lastReu=e;lastReuDate=reu[i].date;}if(reu[i].goals&&reu[i].goals[sid]&&reu[i].goals[sid].length&&!goals.length){goals=reu[i].goals[sid];}}
    return '<div class="kb-hub-grid">'+
      '<div class="card"><h4>Absenzen</h4><div class="kb-stat-row">'+stat(sum.entschuldigt,'Excusé')+stat(sum.unentschuldigt,'Non-excusé')+stat(sum.verspaetet,'Retard')+'</div><button class="btn btn-sm" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">In Absenzen öffnen</button></div>'+
      '<div class="card"><h4>Aktuelle Ziele</h4>'+(goals.length?'<ul style="margin:6px 0 0;padding-left:18px;">'+goals.map(function(g){return '<li>'+escapeHtml(g)+'</li>';}).join('')+'</ul>':'<p class="muted">Keine Ziele hinterlegt.</p>')+'</div>'+
      '<div class="card"><h4>Letztes Réunion-Update'+(lastReuDate?' · '+escapeHtml(formatDate(lastReuDate)):'')+'</h4>'+(lastReu?'<div class="entry-body">'+highlightThemesHtml(lastReu.text)+'</div>':'<p class="muted">Noch kein Réunion-Update.</p>')+'</div>'+
      '<div class="card"><h4>Letzter Dossier-Eintrag</h4>'+(last?'<div class="muted" style="font-size:.85em;margin-bottom:4px;">'+escapeHtml(formatDate(last.date))+' · '+escapeHtml(last.category)+'</div><div class="entry-body">'+escapeHtml(String(last.text||'').slice(0,260))+'</div>':'<p class="muted">Noch keine Einträge.</p>')+'</div>'+
    '</div>';
  }
  function hubReunion(student){
    var sid=student.id; var reu=Repo.listReunions(); var out=[];
    reu.forEach(function(r){
      var e=Repo.reunionEntryFor(r.date,sid); var g=(r.goals&&r.goals[sid])||[];
      if(!e&&!g.length){return;}
      out.push('<div class="card"><div class="muted" style="font-size:.85em;">Réunion '+escapeHtml(formatDate(r.date))+'</div>'+
        (e?'<div class="entry-body reunion-update">'+highlightThemesHtml(e.text)+'</div>':'<p class="muted">Kein Update.</p>')+
        (g.length?'<div class="goal-box"><strong>Ziele:</strong><ul class="goal-list">'+g.map(function(x){return '<li>'+escapeHtml(x)+'</li>';}).join('')+'</ul></div>':'')+'</div>');
    });
    return '<div class="kb-hub-pad"><p class="muted">Alle Réunion-Beiträge von '+escapeHtml(student.name)+'. Neue Updates erfasst ihr unter <a href="#/reunion" data-route="#/reunion">Réunionen</a>.</p>'+(out.length?out.join(''):'<div class="empty-state">Noch keine Réunion-Beiträge.</div>')+'</div>';
  }
  function hubAbsenzen(student){
    var sid=student.id;
    if(!window.KB_ANW){return '<div class="empty-state">Anwesenheits-Modul nicht geladen.</div>';}
    var sum=window.KB_ANW.summaryForStudent(sid); var recent=window.KB_ANW.recentForStudent(sid,15);
    var rows=recent.map(function(e){return '<tr><td>'+escapeHtml(window.KB_ANW.fmt(e.date))+'</td><td>'+escapeHtml(e.subject||'—')+'</td><td>'+escapeHtml(window.KB_ANW.statusLabel(e.status))+'</td></tr>';}).join('');
    return '<div class="kb-hub-pad"><div class="kb-stat-row">'+stat(sum.entschuldigt,'Excusé')+stat(sum.unentschuldigt,'Non-excusé')+stat(sum.verspaetet,'Retard')+stat(sum.total,'Gesamt')+'</div>'+
      '<button class="btn btn-primary" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">In Absenzen erfassen / bearbeiten</button>'+
      (recent.length?'<table class="kb-table" style="margin-top:14px;"><thead><tr><th>Datum</th><th>Fach</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="muted" style="margin-top:14px;">Noch keine Absenzen erfasst.</p>')+'</div>';
  }
  function hubAufgaben(student){
    var lvl=rosterLevel(student.id);
    if(!window.KB_ANW){return '<div class="empty-state">Klassenbuch-Modul nicht geladen.</div>';}
    var tasks=window.KB_ANW.tasksForLevel(lvl);
    var rows=tasks.map(function(n){var icon=n.type==='pruefung'?'📝':'📒';return '<div class="card"><div class="muted" style="font-size:.85em;">'+icon+' '+escapeHtml(window.KB_ANW.fmt(n.date))+(n.subject?' · '+escapeHtml(n.subject):'')+'</div><div>'+escapeHtml(n.text)+'</div></div>';}).join('');
    return '<div class="kb-hub-pad"><p class="muted">Hausaufgaben & Prüfungen aus dem Klassenbuch für Niveau '+escapeHtml(lvl)+'. (Individuell zugewiesene Aufgaben folgen später.)</p>'+(tasks.length?rows:'<div class="empty-state">Keine Aufgaben/Prüfungen hinterlegt.</div>')+'</div>';
  }
  function hubHelfernetz(student){
    if(window.KB_BUBBLE_RENDER){return window.KB_BUBBLE_RENDER(student);}
    return '<div class="kb-hub-pad"><div class="kb-placeholder"><div class="kb-placeholder-ic">🕸️</div><h3>Helfernetz</h3><p>Modul wird geladen …</p></div></div>';
  }

  if(typeof viewStudentDetail!=='undefined'){
    var _origDetail=viewStudentDetail;
    window.viewStudentDetail=function(params){
      var student=(Repo.getStudent)?Repo.getStudent(params.studentId):null;
      if(!student){return _origDetail(params);}
      var q=(typeof parseHash==='function')?parseHash().query:{};
      var tab=q.hub||(params.focusEntry?'dossier':'uebersicht');
      var sectionHtml='', baseAfter=null;
      try{
        if(tab==='dossier'){var base=_origDetail(params);sectionHtml=base.html;baseAfter=base.afterRender;}
        else if(tab==='reunion'){sectionHtml=hubReunion(student);}
        else if(tab==='absenzen'){sectionHtml=hubAbsenzen(student);}
        else if(tab==='aufgaben'){sectionHtml=hubAufgaben(student);}
        else if(tab==='helfernetz'){sectionHtml=hubHelfernetz(student);}
        else {tab='uebersicht';sectionHtml=hubOverview(student);}
      }catch(err){sectionHtml='<div class="empty-state">Fehler im Hub-Bereich: '+escapeHtml((err&&err.message)||String(err))+'</div>';}
      return {
        navKey:'students',
        html: hubHeader(student,tab)+'<div class="kb-hub-body">'+sectionHtml+'</div>',
        afterRender: function(root){ if(baseAfter){try{baseAfter(root);}catch(e){}} if(tab==='helfernetz'&&window.KB_BUBBLE_WIRE){try{window.KB_BUBBLE_WIRE(root,student);}catch(e){}} }
      };
    };
  }

  window.KB_DOS_RECONCILE=function(){
    if(!window.KB_ROSTER){return;}
    var keep=window.KB_ROSTER.ids();
    Repo.students=(Repo.students||[]).filter(function(s){return keep[s.id];});
    Repo.entries=(Repo.entries||[]).filter(function(e){return keep[e.studentId];});
    (Repo.reunions||[]).forEach(function(r){
      if(r&&Array.isArray(r.studentOrder)){r.studentOrder=r.studentOrder.filter(function(id){return keep[id];});}
      if(r&&r.goals){Object.keys(r.goals).forEach(function(k){if(k!=='group'&&!keep[k]){delete r.goals[k];}});}
    });
    try{
      if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){
        Storage.clear('students').then(function(){return Storage.putAll('students',Repo.students);}).catch(function(){});
        Storage.clear('entries').then(function(){return Storage.putAll('entries',Repo.entries);}).catch(function(){});
        Storage.putAll('reunions',Repo.reunions).catch(function(){});
      }
    }catch(e){}
  };
})();
`;

var SHELL_CONTROLLER = `
(function(){
  var app=document.getElementById('kb-app');
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var PANELS=['anw-root','dos-root','kb-klasse','kb-data'];
  var DOS_ROUTES={students:'#/dashboard',reunion:'#/reunion',orga:'#/orga',search:'#/search',themes:'#/themes',export:'#/export',ai:'#/ai-export'};
  function showPanel(id){for(var i=0;i<PANELS.length;i++){var el=$(PANELS[i]);if(el){el.classList.toggle('active',PANELS[i]===id);}}}
  function setActive(nav){var links=document.querySelectorAll('[data-kb-nav]');for(var i=0;i<links.length;i++){links[i].classList.toggle('active',links[i].getAttribute('data-kb-nav')===nav);}}
  function closeAnwModals(){try{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}catch(e){}}
  function clickAnwBtn(id){var b=document.getElementById(id);if(b){b.click();}}
  function closeDrawer(){app.classList.remove('kb-open');}

  function go(nav){
    if(DOS_ROUTES[nav]){
      showPanel('dos-root'); setActive(nav);
      if(window.navigate){window.navigate(DOS_ROUTES[nav]);}
    } else if(nav==='absenzen'){
      showPanel('anw-root'); setActive('absenzen'); closeAnwModals();
    } else if(nav==='absenzen-pdf'){
      showPanel('anw-root'); setActive('absenzen'); closeAnwModals(); clickAnwBtn('btn-pdf');
    } else if(nav==='klasse'){
      showPanel('kb-klasse'); setActive('klasse'); renderRoster();
    } else if(nav==='data'){
      showPanel('kb-data'); setActive('data');
    }
    closeDrawer();
  }

  // Seitenmenü
  var links=document.querySelectorAll('[data-kb-nav]');
  for(var i=0;i<links.length;i++){(function(l){l.addEventListener('click',function(){go(l.getAttribute('data-kb-nav'));});})(links[i]);}
  // "Mehr" ein-/ausklappen
  var moreT=$('kb-more-toggle'), moreBox=$('kb-more');
  if(moreT&&moreBox){moreT.addEventListener('click',function(){var open=moreBox.classList.toggle('open');moreT.classList.toggle('open',open);});}
  // Mobile-Schublade
  var burger=$('kb-burger'); if(burger){burger.addEventListener('click',function(){app.classList.toggle('kb-open');});}
  var scrim=$('kb-scrim'); if(scrim){scrim.addEventListener('click',closeDrawer);}

  // Aktive Markierung anhand der dossier-Route
  function dosNavForHash(){var h=location.hash||'';
    if(h.indexOf('#/reunion')===0)return 'reunion';
    if(h.indexOf('#/orga')===0)return 'orga';
    if(h.indexOf('#/search')===0)return 'search';
    if(h.indexOf('#/themes')===0)return 'themes';
    if(h.indexOf('#/export')===0)return 'export';
    if(h.indexOf('#/ai-export')===0)return 'ai';
    if(h.indexOf('#/backup')===0)return null;
    return 'students';
  }
  window.addEventListener('hashchange',function(){var d=$('dos-root');if(d&&d.classList.contains('active')){var n=dosNavForHash();if(n){setActive(n);}}});

  // Brücke Hub/Klasse/Klassenbuch -> Shell-Aktionen
  document.addEventListener('click',function(ev){
    var el=ev.target.closest&&ev.target.closest('[data-kb-act]'); if(!el)return;
    var act=el.getAttribute('data-kb-act'), arg=el.getAttribute('data-kb-arg');
    if(act==='open-absenzen'){go('absenzen');if(window.KB_ANW){window.KB_ANW.openStudent(arg);}}
    else if(act==='open-tt'){go('absenzen');clickAnwBtn('btn-tt');}
    else if(act==='open-cal'){go('absenzen');clickAnwBtn('btn-cal');}
  });

  // Gemeinsame Schülerliste (im Bereich "Klasse")
  function renderRoster(){
    var body=$('kb-roster-body'); if(!body||!window.KB_ROSTER)return;
    var rows=window.KB_ROSTER.list().map(function(s){
      return '<tr data-id="'+esc(s.id)+'">'+
        '<td><input class="kb-in kb-rn" value="'+esc(s.name)+'"></td>'+
        '<td><input class="kb-in kb-rk" style="max-width:130px" value="'+esc(s.klasse||'')+'" placeholder="—"></td>'+
        '<td><select class="kb-in kb-rl" style="max-width:90px"><option'+(s.level!=='L2'?' selected':'')+'>L1</option><option'+(s.level==='L2'?' selected':'')+'>L2</option></select></td>'+
        '<td style="text-align:right"><button class="kb-btn kb-btn-ghost kb-rd" title="Schüler löschen">🗑</button></td></tr>';
    }).join('');
    body.innerHTML='<table class="kb-table" style="margin-top:6px"><thead><tr><th>Name</th><th>Klasse</th><th>Niveau</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
    var trs=body.querySelectorAll('tr[data-id]');
    for(var i=0;i<trs.length;i++){(function(tr){
      var id=tr.getAttribute('data-id');
      tr.querySelector('.kb-rn').addEventListener('change',function(e){window.KB_ROSTER.update(id,{name:e.target.value.trim()});});
      tr.querySelector('.kb-rk').addEventListener('change',function(e){window.KB_ROSTER.update(id,{klasse:e.target.value.trim()});});
      tr.querySelector('.kb-rl').addEventListener('change',function(e){window.KB_ROSTER.update(id,{level:e.target.value});});
      tr.querySelector('.kb-rd').addEventListener('click',function(){var s=window.KB_ROSTER.byId(id);if(confirm('„'+(s?s.name:'')+'“ aus der gemeinsamen Liste löschen? Absenzen und Dossier dieses Schülers werden ausgeblendet.')){window.KB_ROSTER.remove(id);renderRoster();}});
    })(trs[i]);}
  }
  var addBtn=$('kb-roster-add');
  if(addBtn){addBtn.addEventListener('click',function(){
    var n=$('kb-roster-name'),k=$('kb-roster-klasse'),l=$('kb-roster-level');
    var name=(n.value||'').trim(); if(!name){n.focus();return;}
    window.KB_ROSTER.add(name,k.value.trim(),l.value); n.value='';k.value='';n.focus(); renderRoster();
  });}
  var dA=$('kb-data-anw'); if(dA){dA.addEventListener('click',function(){go('absenzen');var b=document.getElementById('btn-data');if(b){b.click();}});}
  var dD=$('kb-data-dos'); if(dD){dD.addEventListener('click',function(){showPanel('dos-root');setActive('');if(window.navigate){window.navigate('#/backup');}closeDrawer();});}

  // Roster-Änderungen -> beide Engines + offene Listen aktualisieren
  if(window.KB_ROSTER){
    window.KB_ROSTER.onChange(function(){
      if(window.__anwRefresh){try{window.__anwRefresh();}catch(e){}}
      if(window.render){try{window.render();}catch(e){}}
      if($('kb-klasse')&&$('kb-klasse').classList.contains('active')){renderRoster();}
    });
  }

  // Startseite: Schüler
  go('students');
})();
`;

/* ============================================================
   Zusammenbauen
   ============================================================ */
/* ============================================================
   Helfernetz „Support Bubble" (CDSE) — interaktiv, druck-/herunterladbar
   Zentrum = Kind, 3 Häufigkeits-Ringe (wöchentlich/monatlich/auf Anfrage),
   4 Sektoren (Familie · Schule lokal/regional · Schule national · Externe),
   Beziehungslinien (durchgezogen=direkt, gestrichelt=indirekt),
   Status (bestehend / neu / nicht weitergeführt = X), Diagnostik-Daten.
   ============================================================ */
var BUBBLE_MODULE = `
window.KB_BUBBLE=(function(){
  var LS='klassebuch_bubble_v1';
  function loadAll(){try{var r=localStorage.getItem(LS);if(r){return JSON.parse(r)||{};}}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();
  function get(sid){var r=data[sid];if(!r){r={matrikel:'',dateBegin:'',dateEnd:'',nodes:[]};}if(!r.nodes){r.nodes=[];}return r;}
  function set(sid,r){data[sid]=r;saveAll(data);}
  return {
    get:get,
    setMeta:function(sid,f){var r=get(sid);for(var k in f){r[k]=f[k];}set(sid,r);},
    addNode:function(sid,n){var r=get(sid);n.id='bn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);r.nodes.push(n);set(sid,r);return n.id;},
    updateNode:function(sid,id,f){var r=get(sid);r.nodes.forEach(function(n){if(n.id===id){for(var k in f){n[k]=f[k];}}});set(sid,r);},
    removeNode:function(sid,id){var r=get(sid);r.nodes=r.nodes.filter(function(n){return n.id!==id;});set(sid,r);}
  };
})();

(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var AREAS=[['familie','Familie / familiäre Hilfen'],['schule_lokal','Schule: lokal/regional'],['schule_national','Schule: national'],['externe','Externe Akteur:innen']];
  var FREQ=[['woechentlich','wöchentlich'],['monatlich','monatlich'],['anfrage','auf Anfrage']];
  var REL=[['direkt','direkter Kontakt'],['indirekt','indirekter Kontakt']];
  var STAT=[['bestehend','bestehend (zu Beginn)'],['neu','neu hinzugekommen'],['beendet','nicht weitergeführt (X)']];
  var STATCOL={bestehend:'#37414f',neu:'#1d8a52',beendet:'#b3432d'};
  var RAD={woechentlich:150,monatlich:244,anfrage:338};
  var QUAD={familie:{a0:188,a1:262},schule_lokal:{a0:278,a1:352},externe:{a0:98,a1:172},schule_national:{a0:8,a1:82}};
  function label(arr,v){for(var i=0;i<arr.length;i++){if(arr[i][0]===v){return arr[i][1];}}return v;}

  function bubbleSVG(name, rec){
    var W=820,H=975,cx=410,cy=478,childR=64;
    var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" style="max-width:100%;height:auto" font-family="Inter, Arial, sans-serif">';
    s+='<rect width="'+W+'" height="'+H+'" fill="#ffffff"/>';
    s+='<text x="'+(W/2)+'" y="40" text-anchor="middle" font-size="25" font-weight="800" fill="#1d2433">Support Bubble</text>';
    s+='<text x="40" y="76" font-size="14" fill="#1d2433">Name des Kindes / Jugendlichen: <tspan font-weight="700">'+esc(name||'')+'</tspan></text>';
    s+='<text x="40" y="98" font-size="14" fill="#1d2433">Matrikelnummer: <tspan font-weight="700">'+esc(rec.matrikel||'')+'</tspan></text>';
    var rings=[['anfrage',338,'#f5f7fc'],['monatlich',244,'#eef1f9'],['woechentlich',150,'#e6eaf6']];
    for(var i=0;i<rings.length;i++){s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+rings[i][1]+'" fill="'+rings[i][2]+'" stroke="#cdd4e6" stroke-width="1.5"/>';}
    s+='<line x1="'+(cx-338)+'" y1="'+cy+'" x2="'+(cx+338)+'" y2="'+cy+'" stroke="#cdd4e6" stroke-width="1.4"/>';
    s+='<line x1="'+cx+'" y1="'+(cy-338)+'" x2="'+cx+'" y2="'+(cy+338)+'" stroke="#cdd4e6" stroke-width="1.4"/>';
    var rl=[['wöchentlich',150],['monatlich',244],['auf Anfrage',338]];
    for(i=0;i<rl.length;i++){s+='<text x="'+cx+'" y="'+(cy-rl[i][1]+17)+'" text-anchor="middle" font-size="11" font-style="italic" fill="#7a8295" paint-order="stroke" stroke="#ffffff" stroke-width="3">'+rl[i][0]+'</text>';}
    s+='<text x="44" y="150" font-size="13" font-weight="700" fill="#3a5a78">Familie / familiäre Hilfen</text>';
    s+='<text x="'+(W-44)+'" y="150" text-anchor="end" font-size="13" font-weight="700" fill="#3a5a78">Schule: lokal / regional</text>';
    s+='<text x="44" y="'+(cy+356)+'" font-size="13" font-weight="700" fill="#3a5a78">Externe Akteur:innen</text>';
    s+='<text x="'+(W-44)+'" y="'+(cy+356)+'" text-anchor="end" font-size="13" font-weight="700" fill="#3a5a78">Schule: national</text>';
    var groups={};
    (rec.nodes||[]).forEach(function(n){var k=n.area+'|'+n.freq;(groups[k]=groups[k]||[]).push(n);});
    Object.keys(groups).forEach(function(k){
      var p=k.split('|'),q=QUAD[p[0]],r=RAD[p[1]];if(!q||!r){return;}
      var arr=groups[k],nn=arr.length;
      arr.forEach(function(n,idx){
        var t=(idx+1)/(nn+1),ang=(q.a0+t*(q.a1-q.a0))*Math.PI/180;
        var x=cx+r*Math.cos(ang),y=cy+r*Math.sin(ang),sx=cx+childR*Math.cos(ang),sy=cy+childR*Math.sin(ang);
        var col=STATCOL[n.status]||'#37414f',dash=(n.relation==='indirekt')?' stroke-dasharray="6 5"':'';
        s+='<line x1="'+sx.toFixed(1)+'" y1="'+sy.toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="'+col+'" stroke-width="2"'+dash+'/>';
        s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="7" fill="'+col+'"/>';
        if(n.status==='beendet'){var dd=5.5;s+='<line x1="'+(x-dd).toFixed(1)+'" y1="'+(y-dd).toFixed(1)+'" x2="'+(x+dd).toFixed(1)+'" y2="'+(y+dd).toFixed(1)+'" stroke="#fff" stroke-width="2"/><line x1="'+(x-dd).toFixed(1)+'" y1="'+(y+dd).toFixed(1)+'" x2="'+(x+dd).toFixed(1)+'" y2="'+(y-dd).toFixed(1)+'" stroke="#fff" stroke-width="2"/>';}
        var anchor=(Math.cos(ang)>=0)?'start':'end';
        var lx=cx+(r+13)*Math.cos(ang),ly=cy+(r+13)*Math.sin(ang)+4;
        s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+anchor+'" font-size="12" fill="#1d2433" paint-order="stroke" stroke="#ffffff" stroke-width="3.5">'+esc(n.name||'')+'</text>';
      });
    });
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+childR+'" fill="#4f5bd5"/>';
    s+='<text x="'+cx+'" y="'+(cy-3)+'" text-anchor="middle" font-size="15" font-weight="800" fill="#ffffff">'+esc(name||'Kind')+'</text>';
    s+='<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" font-size="9.5" fill="#dfe3fb">Kind / Jugendliche*r</text>';
    var ly1=cy+374,ly2=ly1+24,ly3=ly2+26;
    s+='<line x1="44" y1="'+ly1+'" x2="86" y2="'+ly1+'" stroke="#37414f" stroke-width="2"/><text x="94" y="'+(ly1+4)+'" font-size="12" fill="#1d2433">direkter Kontakt</text>';
    s+='<line x1="240" y1="'+ly1+'" x2="282" y2="'+ly1+'" stroke="#37414f" stroke-width="2" stroke-dasharray="6 5"/><text x="290" y="'+(ly1+4)+'" font-size="12" fill="#1d2433">indirekter Kontakt</text>';
    s+='<circle cx="50" cy="'+ly2+'" r="6" fill="#37414f"/><text x="62" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">bestehend (zu Beginn)</text>';
    s+='<circle cx="240" cy="'+ly2+'" r="6" fill="#1d8a52"/><text x="252" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">neu hinzugekommen</text>';
    s+='<circle cx="430" cy="'+ly2+'" r="6" fill="#b3432d"/><line x1="446" y1="'+(ly2-4)+'" x2="454" y2="'+(ly2+4)+'" stroke="#b3432d" stroke-width="1.5"/><line x1="454" y1="'+(ly2-4)+'" x2="446" y2="'+(ly2+4)+'" stroke="#b3432d" stroke-width="1.5"/><text x="462" y="'+(ly2+4)+'" font-size="12" fill="#1d2433">nicht weitergeführt (X)</text>';
    s+='<text x="44" y="'+ly3+'" font-size="12" fill="#1d2433">Beginn der spezialisierten Diagnostik: <tspan font-weight="700">'+esc(rec.dateBegin||'—')+'</tspan>     Ende: <tspan font-weight="700">'+esc(rec.dateEnd||'—')+'</tspan></text>';
    s+='<text x="'+(W-44)+'" y="'+(H-14)+'" text-anchor="end" font-size="10" fill="#9aa2b3">CDSE · Annexe Junglinster</text>';
    s+='</svg>';
    return s;
  }
  window.KB_BUBBLE_SVG=bubbleSVG;

  function optList(arr,v){return arr.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===v?' selected':'')+'>'+esc(o[1])+'</option>';}).join('');}

  window.KB_BUBBLE_RENDER=function(student){
    var rec=window.KB_BUBBLE.get(student.id);
    return '<div class="kb-hub-pad kb-bubble">'+
      '<p class="muted" style="margin-top:0">Helfernetz / „Support Bubble" — das Unterstützungssystem von '+esc(student.name)+' auf einen Blick. Personen/Institutionen hinzufügen, Karte drucken oder herunterladen.</p>'+
      '<div class="kb-bubble-bar">'+
        '<label>Matrikelnummer<input class="kb-in" id="kbb-matrikel" value="'+esc(rec.matrikel||'')+'"></label>'+
        '<label>Beginn Diagnostik<input class="kb-in" id="kbb-begin" type="date" value="'+esc(rec.dateBegin||'')+'"></label>'+
        '<label>Ende Diagnostik<input class="kb-in" id="kbb-end" type="date" value="'+esc(rec.dateEnd||'')+'"></label>'+
      '</div>'+
      '<div class="kb-bubble-cols">'+
        '<div class="kb-bubble-side">'+
          '<div class="kb-card"><h4 id="kbb-form-title" style="margin:0 0 10px">Person / Institution hinzufügen</h4>'+
            '<input class="kb-in" id="kbb-name" placeholder="Name (Person/Institution)" style="margin-bottom:8px">'+
            '<input class="kb-in" id="kbb-note" placeholder="Funktion / Rolle (optional)" style="margin-bottom:8px">'+
            '<div class="kb-bubble-selrow"><label>Bereich<select class="kb-in" id="kbb-area">'+optList(AREAS,'familie')+'</select></label><label>Häufigkeit<select class="kb-in" id="kbb-freq">'+optList(FREQ,'woechentlich')+'</select></label></div>'+
            '<div class="kb-bubble-selrow" style="margin-top:8px"><label>Kontakt<select class="kb-in" id="kbb-rel">'+optList(REL,'direkt')+'</select></label><label>Status<select class="kb-in" id="kbb-status">'+optList(STAT,'bestehend')+'</select></label></div>'+
            '<div style="margin-top:10px;display:flex;gap:8px"><button class="kb-btn kb-btn-primary" id="kbb-add">+ Hinzufügen</button><button class="kb-btn" id="kbb-cancel" style="display:none">Abbrechen</button></div>'+
          '</div>'+
          '<div id="kbb-list"></div>'+
        '</div>'+
        '<div class="kb-bubble-main">'+
          '<div class="kb-bubble-actions"><button class="kb-btn" id="kbb-print">🖨 Drucken</button><button class="kb-btn" id="kbb-svg">⬇ SVG</button><button class="kb-btn" id="kbb-png">⬇ PNG</button></div>'+
          '<div id="kb-bubble-svg" class="kb-bubble-svg"></div>'+
        '</div>'+
      '</div>'+
    '</div>';
  };

  function dl(blob,fn){var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},800);}
  function safe(n){return String(n||'Kind').replace(/[^\\wäöüÄÖÜ-]+/g,'_');}

  window.KB_BUBBLE_WIRE=function(root, student){
    var sid=student.id, editing=null;
    function q(s){return root.querySelector(s);}
    function rec(){return window.KB_BUBBLE.get(sid);}
    function redraw(){var c=q('#kb-bubble-svg');if(c){c.innerHTML=bubbleSVG(student.name, rec());}}
    function list(){
      var el=q('#kbb-list');if(!el){return;}var ns=rec().nodes||[];
      if(!ns.length){el.innerHTML='<div class="kb-card" style="color:var(--kb-muted)">Noch keine Personen/Institutionen erfasst.</div>';return;}
      el.innerHTML='<div class="kb-card" style="padding:4px 0">'+ns.map(function(n){
        return '<div class="kb-bnode" data-id="'+esc(n.id)+'"><span class="kb-bdot" style="background:'+(STATCOL[n.status]||'#37414f')+'"></span><div class="kb-bnode-main"><div class="kb-bnode-name">'+esc(n.name)+(n.note?' <span class="kb-bnode-note">· '+esc(n.note)+'</span>':'')+'</div><div class="kb-bnode-meta">'+esc(label(AREAS,n.area))+' · '+esc(label(FREQ,n.freq))+' · '+esc(label(REL,n.relation))+(n.status!=='bestehend'?' · '+esc(label(STAT,n.status)):'')+'</div></div><button class="kb-btn kb-btn-ghost kbb-edit" title="Bearbeiten">✎</button><button class="kb-btn kb-btn-ghost kbb-del" title="Löschen">🗑</button></div>';
      }).join('')+'</div>';
    }
    function readForm(){return {name:(q('#kbb-name').value||'').trim(),note:(q('#kbb-note').value||'').trim(),area:q('#kbb-area').value,freq:q('#kbb-freq').value,relation:q('#kbb-rel').value,status:q('#kbb-status').value};}
    function reset(){editing=null;q('#kbb-name').value='';q('#kbb-note').value='';q('#kbb-add').textContent='+ Hinzufügen';q('#kbb-cancel').style.display='none';q('#kbb-form-title').textContent='Person / Institution hinzufügen';}
    q('#kbb-matrikel').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{matrikel:e.target.value});redraw();});
    q('#kbb-begin').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{dateBegin:e.target.value});redraw();});
    q('#kbb-end').addEventListener('change',function(e){window.KB_BUBBLE.setMeta(sid,{dateEnd:e.target.value});redraw();});
    q('#kbb-add').addEventListener('click',function(){var d=readForm();if(!d.name){q('#kbb-name').focus();return;}if(editing){window.KB_BUBBLE.updateNode(sid,editing,d);}else{window.KB_BUBBLE.addNode(sid,d);}reset();list();redraw();});
    q('#kbb-cancel').addEventListener('click',reset);
    q('#kbb-list').addEventListener('click',function(ev){
      var row=ev.target.closest('.kb-bnode');if(!row){return;}var id=row.getAttribute('data-id');
      if(ev.target.closest('.kbb-del')){if(confirm('Eintrag löschen?')){window.KB_BUBBLE.removeNode(sid,id);if(editing===id){reset();}list();redraw();}}
      else if(ev.target.closest('.kbb-edit')){var n=null;rec().nodes.forEach(function(x){if(x.id===id){n=x;}});if(n){editing=id;q('#kbb-name').value=n.name||'';q('#kbb-note').value=n.note||'';q('#kbb-area').value=n.area;q('#kbb-freq').value=n.freq;q('#kbb-rel').value=n.relation;q('#kbb-status').value=n.status;q('#kbb-add').textContent='Speichern';q('#kbb-cancel').style.display='';q('#kbb-form-title').textContent='Eintrag bearbeiten';q('#kbb-name').focus();}}
    });
    q('#kbb-print').addEventListener('click',function(){
      var w=window.open('','_blank');if(!w){alert('Bitte Pop-ups erlauben oder SVG/PNG herunterladen.');return;}
      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Support Bubble — '+esc(student.name)+'</title><style>@page{size:A4 portrait;margin:8mm}body{margin:0}svg{width:100%;height:auto}</style></head><body>'+bubbleSVG(student.name, rec())+'</body></html>');
      w.document.close();w.focus();setTimeout(function(){try{w.print();}catch(e){}},350);
    });
    q('#kbb-svg').addEventListener('click',function(){dl(new Blob([bubbleSVG(student.name, rec())],{type:'image/svg+xml;charset=utf-8'}),'Support-Bubble-'+safe(student.name)+'.svg');});
    q('#kbb-png').addEventListener('click',function(){
      try{
        var svg=bubbleSVG(student.name, rec());var url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));var img=new Image();
        img.onload=function(){var sc=2,c=document.createElement('canvas');c.width=820*sc;c.height=975*sc;var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);try{c.toBlob(function(b){if(b){dl(b,'Support-Bubble-'+safe(student.name)+'.png');}else{alert('PNG nicht möglich — bitte SVG verwenden.');}});}catch(e){alert('PNG nicht möglich — bitte SVG verwenden.');}};
        img.onerror=function(){URL.revokeObjectURL(url);alert('PNG nicht möglich — bitte SVG verwenden.');};
        img.src=url;
      }catch(e){alert('PNG nicht möglich — bitte SVG verwenden.');}
    });
    redraw();list();
  };
})();
`;

var FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Ctext%20y='.9em'%20font-size='88'%3E%F0%9F%93%98%3C/text%3E%3C/svg%3E";

var parts = [
  '<!DOCTYPE html>',
  '<!-- GENERIERT von tools/build-merged.js aus anwesenheit.html + dossier.html.',
  '     Nicht direkt bearbeiten — Quelle ändern und neu bauen: node tools/build-merged.js -->',
  '<html lang="de">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<title>Klassebuch — Annexe Junglinster</title>',
  '<meta name="theme-color" content="#4f5bd5">',
  '<link rel="icon" href="' + FAVICON + '">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap">',
  '<style>',
  '/* === Gemeinsames Gerüst === */', SHELL_CSS,
  '/* === dossier (gescoped) === */', dosStyleScoped,
  '/* === anwesenheit (gescoped) === */', anwStyleScoped,
  '/* === Akzent-Vereinheitlichung === */', ACCENT_OVERRIDE,
  '</style>',
  '</head>',
  '<body>',
  SHELL_BODY_TOP,
  '<section class="kb-panel" id="anw-root">', anwBody, '</section>',
  '<section class="kb-panel" id="dos-root">', dosBody, '</section>',
  SHELL_PANELS_EXTRA,
  '<script>' + ROSTER_MODULE + '</' + 'script>',
  '<script>' + dosScript + '</' + 'script>',
  '<script>' + DOS_OVERRIDES + '</' + 'script>',
  '<script>' + BUBBLE_MODULE + '</' + 'script>',
  '<script>' + anwScript + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

fs.writeFileSync(path.join(ROOT, 'index.html'), parts.join('\n'), 'utf8');
console.log('index.html geschrieben: ' + parts.join('\n').length + ' Bytes');
