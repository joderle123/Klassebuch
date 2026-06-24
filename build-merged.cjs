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
   Aufruf:  node build-merged.cjs
   ============================================================ */
'use strict';
var fs = require('fs');
var path = require('path');
var ROOT = __dirname;

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
var sav = read('SAVOIR.html');

/* ---- Teile extrahieren ---- */
var anwStyle  = between(anw, '<style>', '</style>');
var anwBody   = between(anw, '<body>', '<script>');
var anwScript = between(anw, '<script>', '</script>');
var dosStyle  = between(dos, '<style>', '</style>');
var dosBody   = between(dos, '<body>', '<script>');
var dosScript = between(dos, '<script>', '</script>');
var savStyle  = between(sav, '<style>', '</style>');
var savBody   = between(sav, '<body>', '<script>');
var savScript = between(sav, '<script>', '</script>');

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
var savStyleScoped = scopeCss(savStyle, '#sav-root');

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

/* Alte anwesenheit-eigene Datei-Sync abschalten (KB_SYNC deckt jetzt ALLES ab) */
anwScript = replaceOnce(anwScript, 'initSync();', '/* initSync deaktiviert (KB_SYNC) */', 'anw:drop-initsync');

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
  /* Markenfarbe — Indigo (verfeinert) */
  --kb-accent:#4f5bd5; --kb-accent-dark:#3b46b8; --kb-accent-light:#8b93ea;
  --kb-accent-50:#eef0fc; --kb-accent-100:#dde1f8; --kb-accent-200:#c3c9f3;
  /* Sekundär-Akzent — ruhiges Grün */
  --kb-accent2:#2f9e7a; --kb-accent2-dark:#268063; --kb-accent2-50:#e7f6f1;
  /* Status */
  --kb-ok:#0f9d6b; --kb-ok-50:#e6f6ef;
  --kb-warn:#d98a0b; --kb-warn-50:#fbf2e0;
  --kb-danger:#d6492f; --kb-danger-dark:#b3432d; --kb-danger-50:#fbeae6;
  --kb-info:#3b6fd4; --kb-info-50:#eaf1fc;
  /* Flächen, Linien, Text (kühl & ruhig) */
  --kb-bg:#eef1f7; --kb-surface:#ffffff; --kb-surface-2:#f7f8fc;
  --kb-border:#e3e7f1; --kb-border-strong:#cfd5e6;
  --kb-text:#1d2433; --kb-text-soft:#3a4256; --kb-muted:#5c6478; --kb-muted-2:#8b92a4;
  /* Radien & Schatten */
  --kb-radius-lg:18px; --kb-radius:12px; --kb-radius-sm:9px;
  --kb-shadow-sm:0 1px 2px rgba(20,25,45,.05);
  --kb-shadow:0 1px 2px rgba(20,25,45,.05),0 6px 18px rgba(20,25,45,.06);
  --kb-shadow-lg:0 10px 30px rgba(20,25,45,.10),0 30px 60px rgba(20,25,45,.10);
  --kb-ring:0 0 0 3px rgba(79,91,213,.18);
  --kb-font:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
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
.kb-mini-grid{margin-top:4px;}
/* ELDiB-Förderziele + Wochenziele */
.kb-hub-sec{margin:0 0 24px;}
.kb-sec-head{display:flex;align-items:baseline;gap:10px;margin:0 0 12px;border-bottom:2px solid var(--kb-accent-50);padding-bottom:7px;}
.kb-sec-head h3{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em;color:var(--kb-text);}
.kb-sec-sub{color:var(--kb-muted);font-size:12.5px;font-weight:600;}
.kb-goals{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px;}
.kb-goal{background:var(--kb-surface,#fff);border:1px solid var(--kb-border);border-left:5px solid var(--gc,#999);border-radius:13px;padding:13px 15px;box-shadow:0 1px 3px rgba(20,30,50,.05);transition:box-shadow .15s ease,transform .15s ease;}
.kb-goal:hover{box-shadow:0 5px 16px rgba(20,30,50,.11);transform:translateY(-1px);}
.kb-goal-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:7px;}
.kb-goal-badge{background:var(--gc,#999);color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px;letter-spacing:.02em;}
.kb-goal-code{font-size:12.5px;font-weight:800;color:var(--gc,#666);}
.kb-goal-title{font-size:13px;font-weight:600;color:var(--kb-muted);}
.kb-goal-form{font-size:14.5px;line-height:1.5;color:var(--kb-text);margin:2px 0 10px;font-weight:600;}
.kb-goal-methods{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.kb-method-lbl{font-size:10.5px;font-weight:800;color:var(--kb-muted);text-transform:uppercase;letter-spacing:.05em;margin-right:2px;}
.kb-method{background:var(--kb-accent-50);color:var(--kb-text);font-size:12px;font-weight:600;padding:3px 10px;border-radius:8px;border:1px solid var(--kb-border);}
.kb-weekly{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px;}
.kb-weekly li{background:var(--kb-surface,#fff);border:1px solid var(--kb-border);border-radius:10px;padding:10px 12px 10px 34px;font-size:14px;font-weight:600;position:relative;box-shadow:0 1px 2px rgba(20,30,50,.04);}
.kb-weekly li:before{content:'📌';position:absolute;left:11px;top:9px;}
.kb-empty-card{background:var(--kb-accent-50);border:1px dashed var(--kb-border);border-radius:12px;padding:16px;color:var(--kb-muted);font-size:14px;}
.kb-mini h4{display:flex;align-items:center;gap:6px;}
.kb-btn-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;}
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
.kb-sync-status{font-size:13.5px;line-height:1.55;}
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
/* Screening-Ergebnis (kompakt, im Schüler-Hub) */
.sv-riskbox{background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:12px;padding:12px 14px;margin-bottom:14px;color:var(--kb-text);}
.sv-risk{display:inline-block;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;margin:2px 4px 2px 0;background:#fff;border:1px solid var(--kb-danger);color:var(--kb-danger-dark);}
.sv-staerke{display:inline-block;font-size:12px;font-weight:800;padding:2px 9px;border-radius:999px;}
.sv-deutlich{background:var(--kb-danger-50);color:var(--kb-danger-dark);}
.sv-mittel{background:var(--kb-warn-50);color:#8a5a00;}
.sv-mild{background:var(--kb-accent-50);color:var(--kb-accent-dark);}
.sv-prose{font-size:14px;line-height:1.55;}
.sv-prose p{margin:.4em 0;}
.sv-prose ul,.sv-prose ol{margin:.4em 0 .4em 1.2em;}
.sv-prose h3,.sv-prose h4{font-size:14px;margin:.6em 0 .2em;}
.kb-screen-risk{background:var(--kb-danger-50);color:var(--kb-danger-dark);border:1px solid var(--kb-danger);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;margin-bottom:6px;}
/* ============ Übersichtlichkeit: ruhiger & luftiger ============ */
.kb-pad{padding:30px 34px 76px;max-width:1080px;}
.kb-pagehead h2{font-size:25px;margin:0 0 6px;letter-spacing:-.02em;}
.kb-card{padding:20px 22px;border-radius:16px;box-shadow:none;}
.kb-hub-body{padding:22px 28px 64px;}
.kb-hub-grid{gap:18px;}
.kb-hub-sec{margin:0 0 28px;}
/* Sidebar-Gruppen */
.kb-navgroup{margin-top:16px;}
.kb-navlabel{font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--kb-muted-2);padding:2px 11px 5px;}
/* Schüler-Status-Karten */
.st-card{display:flex;flex-direction:column;gap:12px;border-radius:16px;box-shadow:none;transition:box-shadow .15s ease,transform .15s ease,border-color .15s ease;}
.st-card:hover{box-shadow:var(--kb-shadow);transform:translateY(-1px);border-color:var(--kb-accent-200);}
.st-top{display:flex;align-items:center;gap:12px;}
.st-avatar{flex:0 0 auto;width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;display:grid;place-items:center;font-size:19px;font-weight:800;}
.st-name{font-size:16.5px;font-weight:800;letter-spacing:-.01em;color:var(--kb-text);line-height:1.2;}
.st-sub{font-size:12.5px;color:var(--kb-muted);font-weight:600;margin-top:2px;}
.st-chips{display:flex;flex-wrap:wrap;gap:6px;}
.st-chip{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;background:var(--kb-surface-2);color:var(--kb-text-soft);border:1px solid var(--kb-border);}
.st-chip.st-warn{background:var(--kb-warn-50);color:#8a5a00;border-color:transparent;}
.st-chip.st-danger{background:var(--kb-danger-50);color:var(--kb-danger-dark);border-color:transparent;}
.st-chip.st-ok{background:var(--kb-accent2-50);color:var(--kb-accent2-dark);border-color:transparent;}
.st-foot{font-size:12px;color:var(--kb-muted);margin-top:auto;}
/* Hub-Status-Leiste */
.kb-statstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin:0 0 22px;}
.kb-stat-tile{display:flex;align-items:center;gap:12px;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:14px;padding:13px 15px;box-shadow:var(--kb-shadow-sm);}
.kb-stat-tile .kt-ic{flex:0 0 auto;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;background:var(--kb-accent-50);}
.kb-stat-tile .v{font-size:21px;font-weight:800;color:var(--kb-text);line-height:1;}
.kb-stat-tile .l{font-size:11px;color:var(--kb-muted);font-weight:600;margin-top:3px;}
.kb-stat-tile.kt-warn .kt-ic{background:var(--kb-danger-50);}
.kb-stat-tile.kt-warn .v{color:var(--kb-danger-dark);}
.kb-stat-tile.kt-ok .kt-ic{background:var(--kb-accent2-50);}
.kb-stat-tile.kt-ok .v{color:var(--kb-accent2-dark);}
.kb-hub-avatar{width:54px;height:54px;border-radius:15px;font-size:23px;box-shadow:0 6px 16px rgba(79,91,213,.28);}
.kb-hub-name{font-size:22px;}
.kb-hub-head{padding-top:22px;}
.card.kb-mini h4{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:800;margin:0 0 11px;padding-bottom:10px;border-bottom:1px solid var(--kb-border);}
.kb-subhead{font-size:17px;font-weight:800;letter-spacing:-.01em;margin:0 0 12px;color:var(--kb-text);}
.kb-subhead.kb-subhead-mt{margin-top:30px;border-top:1px solid var(--kb-border);padding-top:24px;}
/* Hub-Karten-Inhalte */
.hub-list{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13.5px;}
.hub-list li{display:flex;align-items:flex-start;gap:8px;line-height:1.4;}
.hub-dot{flex:0 0 auto;width:8px;height:8px;border-radius:50%;margin-top:5px;}
.hub-count{font-size:11.5px;font-weight:800;color:var(--kb-accent);background:var(--kb-accent-50);padding:1px 8px;border-radius:999px;margin-left:4px;}
.hub-line{font-size:13.5px;margin:4px 0;line-height:1.45;}
.hub-clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;font-size:13.5px;line-height:1.45;}
.hub-hero-risk{display:flex;align-items:center;gap:14px;background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:16px;padding:14px 18px;margin:0 0 22px;}
.hub-hero-risk .hub-hero-ic{font-size:24px;line-height:1;}
.hub-hero-risk .hub-hero-t{font-weight:800;color:var(--kb-danger-dark);}
.hub-hero-risk .hub-hero-s{font-size:13px;color:var(--kb-text-soft);margin-top:2px;}
.hub-hero-risk .btn{margin-left:auto;flex:0 0 auto;}
/* Karten-Kopf mit Icon-Badge */
.card.kb-mini h4 .mi{flex:0 0 auto;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:15px;}
.card.kb-mini h4 .mt{flex:1;min-width:0;}
.mi-a{background:var(--kb-accent-50);}
.mi-g{background:var(--kb-accent2-50);}
.mi-w{background:var(--kb-warn-50);}
.mi-r{background:var(--kb-danger-50);}
.mi-b{background:var(--kb-info-50);}
/* Zwei-Spalten-Layout */
.hub2{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start;}
.hub2-main{display:flex;flex-direction:column;gap:16px;min-width:0;}
.hub2-side{display:flex;flex-direction:column;gap:16px;}
@media(max-width:980px){.hub2{grid-template-columns:1fr;}}
/* Fokus-Panel: Screening */
.scr-panel{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:18px;padding:20px 22px;box-shadow:var(--kb-shadow);}
.scr-panel.is-risk{border-color:var(--kb-danger);background:linear-gradient(180deg,var(--kb-danger-50),var(--kb-surface) 70%);}
.scr-panel-h{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.scr-panel-h .mi{flex:0 0 auto;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:18px;}
.scr-panel-t{font-size:17px;font-weight:800;letter-spacing:-.01em;}
.scr-panel .hub-line{margin:6px 0;}
/* Info-Zeilen-Karte (Seitenspalte) */
.hub-side-card{padding:4px 0;}
.hub-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--kb-border);}
.hub-row:first-child{border-top:none;}
.hub-row .ri{flex:0 0 auto;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:16px;background:var(--kb-surface-2);}
.hub-row .rb{flex:1;min-width:0;}
.hub-row .rl{font-size:13.5px;font-weight:700;line-height:1.2;}
.hub-row .rv{font-size:12px;color:var(--kb-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.hub-row .ra{flex:0 0 auto;}
/* Leerer Schüler: Erste Schritte */
.hub-empty{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:20px;padding:44px 28px;text-align:center;box-shadow:var(--kb-shadow);}
.hub-empty-ic{font-size:46px;margin-bottom:8px;}
.hub-empty h3{margin:0 0 6px;font-size:21px;letter-spacing:-.01em;}
.hub-empty p{color:var(--kb-muted);margin:0 0 20px;}
.hub-empty-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
/* Screening-Ansicht (kurz & einklappbar) */
.sv-h{margin:8px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--kb-muted);font-weight:800;}
.sv-axes{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 4px;}
.sv-axis{font-size:13px;font-weight:600;padding:5px 12px;border-radius:10px;background:var(--kb-surface-2);border:1px solid var(--kb-border);}
.sv-axis em{font-style:normal;font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;margin-left:5px;opacity:.85;}
.sv-axis-deutlich{background:var(--kb-danger-50);border-color:transparent;color:var(--kb-danger-dark);}
.sv-axis-mittel{background:var(--kb-warn-50);border-color:transparent;color:#8a5a00;}
.sv-axis-mild{background:var(--kb-accent-50);border-color:transparent;color:var(--kb-accent-dark);}
.sv-muster{margin-top:16px;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:16px;padding:18px 20px;}
.sv-muster-name{margin:.1em 0 .5em;font-size:18px;letter-spacing:-.01em;}
.sv-teaser{font-size:14px;line-height:1.55;color:var(--kb-text-soft);margin:0 0 6px;}
.sv-acc{border-top:1px solid var(--kb-border);}
.sv-acc summary{cursor:pointer;padding:11px 0;font-weight:700;font-size:14px;list-style:none;display:flex;align-items:center;gap:8px;color:var(--kb-text);}
.sv-acc summary::-webkit-details-marker{display:none;}
.sv-acc summary::before{content:'▸';color:var(--kb-muted);font-size:12px;transition:transform .15s;}
.sv-acc[open] summary::before{transform:rotate(90deg);}
.sv-acc .sv-prose{padding:0 0 14px;}
.sv-do strong{color:var(--kb-accent2-dark);}
.sv-dont strong{color:var(--kb-danger-dark);}
@media (prefers-reduced-motion:reduce){*{transition:none!important;}}
`;

var ACCENT_OVERRIDE = `
/* ---- Dossier auf gemeinsame Tokens mappen ---- */
#dos-root{
  --bg:var(--kb-bg); --surface:var(--kb-surface); --border:var(--kb-border);
  --text:var(--kb-text); --text-muted:var(--kb-muted);
  --accent:var(--kb-accent); --accent-soft:var(--kb-accent-50);
  --danger:var(--kb-danger); --danger-soft:var(--kb-danger-50);
  --radius:var(--kb-radius); --shadow:var(--kb-shadow);
  font-family:var(--kb-font);
}
/* ---- Anwesenheit auf gemeinsame Tokens mappen ---- */
#anw-root{
  --primary:var(--kb-accent); --primary-dark:var(--kb-accent-dark); --primary-light:var(--kb-accent-light);
  --primary-50:var(--kb-accent-50); --primary-100:var(--kb-accent-100);
  --ok:var(--kb-ok); --ok-50:var(--kb-ok-50);
  --warn:var(--kb-warn); --warn-50:var(--kb-warn-50);
  --danger:var(--kb-danger); --danger-50:var(--kb-danger-50); --danger-dark:var(--kb-danger-dark);
  --info:var(--kb-info); --info-50:var(--kb-info-50);
  --bg:var(--kb-bg); --card:var(--kb-surface);
  --text:var(--kb-text); --muted:var(--kb-muted); --line:var(--kb-border);
  --radius-lg:var(--kb-radius-lg); --radius:var(--kb-radius); --radius-sm:var(--kb-radius-sm);
  --shadow-sm:var(--kb-shadow-sm); --shadow:var(--kb-shadow); --shadow-lg:var(--kb-shadow-lg);
  --ring:var(--kb-ring);
}
#anw-root header{ position:static; background:linear-gradient(120deg,var(--kb-accent),var(--kb-accent-dark)); box-shadow:0 2px 12px rgba(79,91,213,.22); }
#anw-root header::after{ background:rgba(255,255,255,.2); }
/* Aktionen, die jetzt im Menü / in "Klasse" liegen, im anwesenheit-Kopf ausblenden */
#anw-root #btn-students,#anw-root #btn-add-student,
#anw-root #btn-tt,#anw-root #btn-cal,#anw-root #btn-pdf,#anw-root #btn-data{ display:none; }
#anw-root .sync-section,#anw-root #reconnect-bar{ display:none !important; }
#dos-root .main{ max-width:none; }
/* ---- Savoir (Screening) auf gemeinsame Tokens mappen ---- */
#sav-root{
  --ink:var(--kb-text); --paper:var(--kb-bg); --cream:var(--kb-surface-2);
  --gold:var(--kb-accent2); --rust:var(--kb-accent); --sage:var(--kb-muted);
  --line:var(--kb-border);
  font-family:var(--kb-font);
}
/* Savoir-Innenansicht an den Klassenbuch-Look angleichen (nur CSS, keine Struktur) */
#sav-root .topnav{ position:static; background:var(--kb-surface); padding:14px 28px; }
#sav-root .topnav-inner,#sav-root .global-nav,#sav-root .main{ max-width:1120px; }
#sav-root .global-nav{ padding:16px 28px 0; }
#sav-root .main{ padding:26px 28px 80px; }
#sav-root .brand-logo,#sav-root .brand-sub{ font-family:var(--kb-font); }
#sav-root .brand-logo{ font-size:20px; font-weight:800; letter-spacing:-.02em; color:var(--kb-text); }
#sav-root .brand-sub{ letter-spacing:.08em; }
#sav-root .global-nav-btn,#sav-root .diag-subtab{ font-family:var(--kb-font); text-transform:none; letter-spacing:0; font-size:13.5px; font-weight:700; }
#sav-root .global-nav-btn.active,#sav-root .diag-subtab.active{ color:var(--kb-accent); border-bottom-color:var(--kb-accent); }
/* Kontext-Leiste über dem eingebetteten Screening */
.sav-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 16px;background:var(--kb-accent-50);border-bottom:1px solid var(--kb-border);}
.sav-bar .sav-back{font:inherit;font-weight:700;border:1px solid var(--kb-border);background:#fff;color:var(--kb-text);padding:7px 12px;border-radius:9px;cursor:pointer;}
.sav-bar .sav-back:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.sav-bar .sav-who{font-weight:800;}
.sav-bar .sav-hint{font-size:12px;color:var(--kb-muted);}
/* Dossier ruhiger & luftiger */
#dos-root .card{ border-radius:16px; box-shadow:none; }
#dos-root .card-grid{ gap:18px; }
#dos-root .page-head h2{ font-size:25px; letter-spacing:-.02em; }
#dos-root .empty-state{ border-radius:16px; }
#dos-root .card.kb-mini{ box-shadow:var(--kb-shadow-sm); transition:box-shadow .15s ease, transform .15s ease; }
#dos-root .card.kb-mini:hover{ box-shadow:var(--kb-shadow); transform:translateY(-2px); }
#dos-root .sv-muster{ box-shadow:var(--kb-shadow-sm); }
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
      <div class="kb-navgroup">
        <div class="kb-navlabel">Unterricht</div>
        <button class="kb-link" data-kb-nav="absenzen"><span class="kb-ic">📋</span>Klassenbuch</button>
        <button class="kb-link" data-kb-nav="reunion"><span class="kb-ic">🤝</span>Réunionen</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Klinisch</div>
        <button class="kb-link" data-kb-nav="patho"><span class="kb-ic">🧠</span>Pathologien</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Werkzeuge</div>
        <button class="kb-link" data-kb-nav="search"><span class="kb-ic">🔎</span>Suche</button>
        <button class="kb-link" data-kb-nav="themes"><span class="kb-ic">🏷️</span>Themen-Analyse</button>
        <button class="kb-link" data-kb-nav="orga"><span class="kb-ic">🗒️</span>Organisation</button>
        <button class="kb-link" data-kb-nav="klasse"><span class="kb-ic">🏫</span>Klasse &amp; Stundenplan</button>
        <button class="kb-link" data-kb-nav="absenzen-pdf"><span class="kb-ic">📄</span>Absenzen-PDF</button>
        <button class="kb-link" data-kb-nav="export"><span class="kb-ic">📑</span>Dossier-PDF</button>
        <button class="kb-link" data-kb-nav="ai"><span class="kb-ic">🤖</span>KI-Export</button>
        <button class="kb-link" data-kb-nav="data"><span class="kb-ic">💾</span>Daten &amp; Backup</button>
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
      <div class="kb-pagehead"><h2>💾 Daten & Backup</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Gemeinsame Speicherung für das Team, plus lokale Sicherung/Export.</p></div>
      <div class="kb-card" id="kb-sync-card">
        <h3 style="margin:0 0 6px;">🗄️ Gemeinsamer Speicher (Team-Datei auf O:\\)</h3>
        <p style="margin:0 0 10px;color:var(--kb-muted);">Eine gemeinsame Datei auf eurem Netzlaufwerk — alle Geräte schreiben hinein, Änderungen werden <b>pro Eintrag zusammengeführt</b> (nichts wird überschrieben). Nur in Chrome/Edge; jede Person verbindet die Datei einmal. Eine Person legt sie an, alle anderen wählen „Bestehende Datei öffnen".</p>
        <div id="kb-sync-status" class="kb-sync-status">…</div>
        <div id="kb-sync-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"></div>
      </div>
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
    onChange:function(fn){hooks.push(fn);},
    syncExport:function(){return list.map(clone);},
    syncApply:function(arr){list=(arr||[]).map(clone);persist();for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
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
    var tabs=[['uebersicht','Übersicht'],['dossier','Dossier'],['screening','Screening'],['schule','Schule'],['reunion','Réunion'],['helfernetz','Helfernetz']];
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
    var reu=Repo.listReunions(); var lastReu=null,lastReuDate=null,weekly=[],weeklyDate=null;
    for(var i=0;i<reu.length;i++){var e=Repo.reunionEntryFor(reu[i].date,sid);if(e&&!lastReu){lastReu=e;lastReuDate=reu[i].date;}if(reu[i].goals&&reu[i].goals[sid]&&reu[i].goals[sid].length&&!weekly.length){weekly=reu[i].goals[sid];weeklyDate=reu[i].date;}}
    var rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null;
    var cg=window.KB_REPORTS?window.KB_REPORTS.currentGoals(sid):null;
    var impBtn='<button class="btn btn-sm" data-route="#/report-import?student='+encodeURIComponent(sid)+'">📄 DS/PEI importieren</button>';
    var DM={V:{l:'Verhalten',c:'#c0562d'},K:{l:'Kommunikation',c:'#2f6fb0'},SOZ:{l:'Sozialisation',c:'#3a8a5f'},KOG:{l:'Kognition',c:'#7a52b3'}};

    function mh(ic,t,c){return '<h4><span class="mi mi-'+(c||'a')+'">'+ic+'</span><span class="mt">'+t+'</span></h4>';}
    function tile(v,l,cls,ic){return '<div class="kb-stat-tile'+(cls?(' kt-'+cls):'')+'"><div class="kt-ic">'+(ic||'')+'</div><div class="kt-b"><div class="v">'+v+'</div><div class="l">'+escapeHtml(l)+'</div></div></div>';}
    var scr=window.KB_SCREENING?window.KB_SCREENING.result(sid):null;
    var scrTile=(scr&&scr.hasData)?((scr.risiken&&scr.risiken.length)?tile('Risiko','Screening','warn','🧠'):tile('erfasst','Screening','ok','🧠')):tile('—','Screening','','🧠');
    var stripHtml='<div class="kb-statstrip">'+tile((sum.unentschuldigt||0),'Unentsch. Absenzen',(sum.unentschuldigt?'warn':''),'📉')+scrTile+tile((cg&&cg.goals?cg.goals.length:0),'Förderziele','','🎯')+tile(weekly.length,'Wochenziele','','📌')+'</div>';

    /* ---- Schüler ohne Daten: klare Erste-Schritte statt leerer Karten ---- */
    var hasAny=(scr&&scr.hasData)||(cg&&cg.goals&&cg.goals.length)||weekly.length||entries.length||(sum&&sum.total)||lastReu;
    if(!hasAny){
      return stripHtml+'<div class="hub-empty"><div class="hub-empty-ic">🚀</div><h3>Noch nichts erfasst für '+escapeHtml(student.name)+'</h3><p>Leg los — alle Infos sammeln sich danach automatisch hier.</p><div class="hub-empty-actions"><button class="btn btn-primary" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">🧠 Screening durchführen</button>'+impBtn+'<button class="btn" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">📉 Absenzen erfassen</button></div></div>';
    }

    /* ---- Fokus-Panel: Screening ---- */
    var scrPanel;
    if(scr&&scr.hasData){
      var risk=scr.risiken&&scr.risiken.length;
      var sTop=scr.achsen&&scr.achsen[0];
      var body='';
      if(risk){body+='<div class="hub-line"><span class="sv-risk">⚠ '+scr.risiken.map(function(x){return escapeHtml((x.risiko&&x.risiko.name)||'?');}).join('</span> <span class="sv-risk">')+'</span></div>';}
      if(sTop){body+='<div class="hub-line"><strong>'+escapeHtml((sTop.achse&&sTop.achse.name)||'?')+'</strong> <span class="sv-staerke sv-'+escapeHtml(sTop.staerke)+'">'+escapeHtml(sTop.staerke)+'</span></div>';}
      if(scr.topMuster){body+='<div class="hub-line muted">Submuster: <strong style="color:var(--kb-text)">'+escapeHtml(scr.topMuster.name||'?')+'</strong></div>';}
      scrPanel='<div class="scr-panel'+(risk?' is-risk':'')+'"><div class="scr-panel-h"><span class="mi mi-'+(risk?'r':'a')+'">🧠</span><span class="scr-panel-t">Screening</span></div>'+body+'<div class="kb-btn-row" style="margin-top:12px;"><button class="btn btn-sm btn-primary" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Ergebnis ansehen</button></div></div>';
    } else {
      scrPanel='<div class="scr-panel"><div class="scr-panel-h"><span class="mi mi-a">🧠</span><span class="scr-panel-t">Screening</span></div><p class="muted">'+(scr&&scr.noApi?'Modul lädt …':'Noch kein Screening — erfasse Beobachtungen, um Verdachtsachsen & Submuster zu erhalten.')+'</p><div class="kb-btn-row" style="margin-top:10px;"><button class="btn btn-sm btn-primary" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">Screening durchführen</button></div></div>';
    }

    /* ---- Förderziele ---- */
    var foerderCard;
    if(cg&&cg.goals&&cg.goals.length){
      var gl=cg.goals.slice(0,5).map(function(g){var dm=DM[g.domain]||{l:g.domain,c:'#777'};return '<li><span class="hub-dot" style="background:'+dm.c+'"></span>'+escapeHtml(g.formulation||g.title||g.code)+'</li>';}).join('');
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele <span class="hub-count">'+cg.goals.length+'</span>','g')+'<ul class="hub-list">'+gl+'</ul>'+(cg.goals.length>5?'<div class="muted" style="font-size:.8em;margin-top:4px;">+'+(cg.goals.length-5)+' weitere</div>':'')+'</div>';
    } else {
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele','g')+'<p class="muted">Noch keine hinterlegt.</p><div class="kb-btn-row">'+impBtn+'</div></div>';
    }

    /* ---- Réunion-Update (Hauptbereich) ---- */
    var reuCard=lastReu?('<div class="card kb-mini">'+mh('🗣️','Réunion-Update <span class="muted" style="font-weight:600;font-size:.78em;">'+(lastReuDate?escapeHtml(formatDate(lastReuDate)):'')+'</span>','a')+'<div class="entry-body hub-clamp">'+highlightThemesHtml(lastReu.text)+'</div></div>'):'';

    /* ---- Seitenspalte: kompakte Info-Zeilen statt Einzelkärtchen ---- */
    function row(ic,l,v,act){return '<div class="hub-row"><span class="ri">'+ic+'</span><div class="rb"><div class="rl">'+l+'</div>'+(v?'<div class="rv">'+v+'</div>':'')+'</div>'+(act||'')+'</div>';}
    var sideRows='';
    sideRows+=row('📉','Absenzen',(sum.total?(sum.entschuldigt+' E · '+sum.unentschuldigt+' NE · '+sum.verspaetet+' R'):'keine'),'<button class="btn btn-sm ra" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">Öffnen</button>');
    sideRows+=row('📌','Wochenziele',(weekly.length?weekly.length+' Ziele':'keine'),'');
    sideRows+=row('🩺','Diagnostik',(rep?escapeHtml((rep.type||'Bericht')+' · '+formatDate(rep.date)):'kein DS/PEI'),(rep?'<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=dossier">Dossier</button>':''));
    sideRows+=row('🗒️','Letzter Eintrag',(last?escapeHtml(formatDate(last.date)+' · '+last.category):'keiner'),'');
    sideRows+=row('🕸️','Helfernetz','Support-Bubble','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=helfernetz">Öffnen</button>');
    var sideCard='<div class="card hub-side-card">'+sideRows+'</div>';

    return stripHtml+'<div class="hub2"><div class="hub2-main">'+scrPanel+foerderCard+reuCard+'</div><aside class="hub2-side">'+sideCard+'</aside></div>';
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
  function hubScreening(student){
    var sid=student.id;
    var r=window.KB_SCREENING?window.KB_SCREENING.result(sid):null;
    var has=r&&r.hasData;
    var btn='<button class="btn btn-primary" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">'+(has?'Screening öffnen / bearbeiten':'Screening durchführen')+'</button>';
    var hint='<p class="muted" style="font-size:.85em;margin:.2em 0 1.1em;">Klinisches Screening (Savoir) — <strong>Hypothesen, keine Diagnosen</strong>.</p>';
    if(!has){
      var why=(r&&r.noApi)?'Das Screening-Modul wird noch geladen — bitte kurz warten und erneut öffnen.':('Für '+escapeHtml(student.name)+' wurde noch kein Screening erfasst.');
      return '<div class="kb-hub-pad">'+hint+'<div class="empty-state">'+why+'<div style="margin-top:12px;">'+btn+'</div></div></div>';
    }
    var when=r.updatedAt?('<span class="muted" style="font-size:.8em;"> · Stand '+escapeHtml(formatDate(String(r.updatedAt).slice(0,10)))+'</span>'):'';
    var riskHtml='';
    if(r.risiken&&r.risiken.length){
      var chips=r.risiken.map(function(x){return '<span class="sv-risk">'+escapeHtml((x.risiko&&x.risiko.name)||'?')+' · '+escapeHtml(x.staerke)+'</span>';}).join('');
      riskHtml='<div class="sv-riskbox"><strong>⚠ Risiko-Hinweise:</strong> '+chips+'<div class="muted" style="font-size:.8em;margin-top:6px;">Bei akuter Gefährdung den Fachweg einschalten (siehe Umfeld → Helfernetz).</div></div>';
    }
    var axHtml=r.achsen.length?('<div class="sv-axes">'+r.achsen.map(function(a){return '<span class="sv-axis sv-axis-'+escapeHtml(a.staerke)+'">'+escapeHtml((a.achse&&a.achse.name)||'?')+' <em>'+escapeHtml(a.staerke)+'</em></span>';}).join('')+'</div>'):'<p class="muted">Keine Verdachtsachse über der Schwelle.</p>';
    var subHtml;
    if(r.topMuster){
      var b=r.topMuster.bloecke||{};
      function sec(title,html){ if(!html) return ''; return '<details class="sv-acc"><summary>'+title+'</summary><div class="sv-prose">'+html+'</div></details>'; }
      var profilText=String(b.profil||'').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim();
      var teaser=profilText?('<p class="sv-teaser">'+escapeHtml(profilText.slice(0,210))+(profilText.length>210?'…':'')+'</p>'):'';
      var umgang=[b.ansatzHaupt||'',b.ansatzTust?('<p class="sv-do"><strong>✓ Konkret tun</strong></p>'+b.ansatzTust):'',b.ansatzNicht?('<p class="sv-dont"><strong>✗ Vermeiden</strong></p>'+b.ansatzNicht):''].filter(Boolean).join('');
      var phase0=(b.phasen&&b.phasen[0])?('<p><strong>'+escapeHtml(b.phasen[0].titel||'Erste Phase')+'</strong></p>'+(b.phasen[0].was||b.phasen[0].ziele||'')):'';
      subHtml='<div class="sv-muster"><div class="muted" style="font-size:.8em;">Erkanntes Submuster'+(r.topAchseName?' · '+escapeHtml(r.topAchseName):'')+'</div><h3 class="sv-muster-name">'+escapeHtml(r.topMuster.name||'?')+'</h3>'+teaser+
        sec('Worum es geht (ausführlich)',b.profil)+
        sec('Umgang mit diesem Profil',umgang)+
        sec('Nächste Schritte',phase0)+
        sec('Schulanpassungen',b.schuleAnpassungen)+
        '<p class="muted" style="font-size:.8em;margin-top:12px;">Tipp: Abschnitte aufklappen für Details. Vollständiger Plan im <strong>Screening</strong> (Button oben).</p></div>';
    } else {
      subHtml='<div class="kb-empty-card" style="margin-top:14px;">Noch kein Submuster bestimmt. Öffne das Screening und vertiefe die Top-Achse, um es zu erhalten.</div>';
    }
    return '<div class="kb-hub-pad kb-hub-screening">'+hint+riskHtml+'<div class="kb-btn-row" style="margin-bottom:16px;">'+btn+when+'</div><h4 class="sv-h">Verdachtsachsen</h4>'+axHtml+subHtml+'</div>';
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
        else if(tab==='screening'){sectionHtml=hubScreening(student);}
        else if(tab==='schule'){sectionHtml='<h3 class="kb-subhead">📉 Absenzen</h3>'+hubAbsenzen(student)+'<h3 class="kb-subhead kb-subhead-mt">📒 Aufgaben &amp; Prüfungen</h3>'+hubAufgaben(student);}
        else if(tab==='reunion'){sectionHtml=hubReunion(student);}
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
  function kbDosPersist(store,arr){try{if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){Storage.clear(store).then(function(){return Storage.putAll(store,arr);}).catch(function(){});}}catch(e){}}
  window.KB_DOS_SYNC={
    exportEntries:function(){return (Repo.entries||[]).slice();},
    exportReunions:function(){return (Repo.reunions||[]).slice();},
    applyEntries:function(list){Repo.entries=(list||[]).slice();kbDosPersist('entries',Repo.entries);if(window.render){try{window.render();}catch(e){}}},
    applyReunions:function(list){Repo.reunions=(list||[]).slice();kbDosPersist('reunions',Repo.reunions);if(window.render){try{window.render();}catch(e){}}}
  };
})();
`;

var SHELL_CONTROLLER = `
(function(){
  var app=document.getElementById('kb-app');
  function $(id){return document.getElementById(id);}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var PANELS=['anw-root','dos-root','sav-root','kb-klasse','kb-data'];
  var DOS_ROUTES={students:'#/dashboard',reunion:'#/reunion',orga:'#/orga',search:'#/search',themes:'#/themes',export:'#/export',ai:'#/ai-export'};
  function showPanel(id){for(var i=0;i<PANELS.length;i++){var el=$(PANELS[i]);if(el){el.classList.toggle('active',PANELS[i]===id);}}}
  function setActive(nav){var links=document.querySelectorAll('[data-kb-nav]');for(var i=0;i<links.length;i++){links[i].classList.toggle('active',links[i].getAttribute('data-kb-nav')===nav);}}
  function closeAnwModals(){try{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));}catch(e){}}
  function clickAnwBtn(id){var b=document.getElementById(id);if(b){b.click();}}
  function closeDrawer(){app.classList.remove('kb-open');}

  function go(nav){
    if(window.KB_SCREENING){try{window.KB_SCREENING.capture();}catch(e){}}
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
    } else if(nav==='patho'){
      showPanel('sav-root'); setActive('patho');
      var sb=$('sav-bar'); if(sb){sb.style.display='none';}
      if(window.SAVOIR_API&&window.SAVOIR_API.gotoInfos){window.SAVOIR_API.gotoInfos();}
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
    else if(act==='open-screening'){
      showPanel('sav-root'); setActive('students');
      var sb=$('sav-bar'); if(sb){sb.style.display='';}
      var who=$('sav-who'); var nm=(window.KB_ROSTER&&window.KB_ROSTER.byId(arg));
      if(who){who.textContent=nm?('Screening: '+nm.name):'Screening';}
      window.__SAV_RETURN=arg;
      if(window.KB_SCREENING){try{window.KB_SCREENING.openStudent(arg);}catch(e){}}
      else if(window.SAVOIR_API&&window.SAVOIR_API.gotoScreening){window.SAVOIR_API.gotoScreening();}
      closeDrawer();
    }
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

  // Gemeinsamer Speicher (KB_SYNC) — Status + Aktionen
  function renderSync(){
    var st=$('kb-sync-status'),ac=$('kb-sync-actions'); if(!st||!ac||!window.KB_SYNC)return;
    var s=window.KB_SYNC.getStatus();
    if(!s.supported){st.innerHTML='<b style="color:#b3432d">Dieser Browser unterstützt die gemeinsame Datei nicht (z. B. Firefox).</b><br>Bitte die App in <b>Microsoft Edge</b> öffnen: Rechtsklick auf <i>index.html</i> → „Öffnen mit" → Microsoft Edge. Edge ist auf jedem Windows-PC vorinstalliert; eure Daten bleiben im Haus.';ac.innerHTML='';return;}
    var info;
    if(s.connected){info='<b style="color:#1d8a52">✓ Verbunden</b> · '+esc(s.fileName)+(s.lastSync?' · zuletzt '+new Date(s.lastSync).toLocaleTimeString():'')+(s.lastBy?' · zuletzt von '+esc(s.lastBy):'')+(s.pending?' · synchronisiert…':'');}
    else if(s.error==='reconnect'){info='<b style="color:#c9851f">Verbindung muss bestätigt werden</b> — bitte „Verbinden" klicken ('+esc(s.fileName)+').';}
    else{info='Nicht verbunden — Daten liegen nur auf diesem Gerät.';}
    if(s.error&&s.error!=='reconnect'){info+='<br><span style="color:#b3432d">'+esc(s.error)+'</span>';}
    if(s.connected&&s.counts){var k=s.counts;info+='<div style="margin-top:6px;color:var(--kb-muted);font-size:12.5px;">In der gemeinsamen Datei: <b>'+(k.roster||0)+'</b> Schüler · <b>'+(k.dosEntries||0)+'</b> Dossier-Einträge · <b>'+(k.anwEntries||0)+'</b> Absenzen · <b>'+(k.anwNotes||0)+'</b> Notizen · <b>'+(k.dosReunions||0)+'</b> Réunionen · <b>'+(k.bubble||0)+'</b> Helfernetz</div>';}
    if(s.connected){
      var bk;
      if(s.backupName){bk='🗂️ Auto-Sicherung: Ordner <b>'+esc(s.backupName)+'</b> · letzte Kopie: '+(s.backupLast?esc(s.backupLast):'noch keine')+(s.backupErr==='reconnect'?' · <span style="color:#c9851f">bitte bestätigen</span>':'');}
      else{bk='🗂️ <b>Tägliche Auto-Sicherung</b> noch nicht eingerichtet — Ordner auf O: wählen, dann legt die App 1×/Tag automatisch eine datierte Kopie an (die letzten 30 bleiben erhalten).';}
      if(s.backupErr&&s.backupErr!=='reconnect'){bk+=' <span style="color:#b3432d">'+esc(s.backupErr)+'</span>';}
      info+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);color:var(--kb-muted);font-size:12.5px;">'+bk+'</div>';
    }
    st.innerHTML=info;
    var b;
    if(s.connected){var bkBtn=s.backupErr==='reconnect'?'<button class="kb-btn" id="kbs-bkok">🗂️ Auto-Backup bestätigen</button>':(s.backupName?'<button class="kb-btn" id="kbs-bkdir">🗂️ Backup-Ordner ändern</button>':'<button class="kb-btn kb-btn-primary" id="kbs-bkdir">🗂️ Auto-Backup einrichten</button>');b='<button class="kb-btn" id="kbs-now">🔄 Jetzt synchronisieren</button>'+bkBtn+'<button class="kb-btn" id="kbs-disc">Trennen</button>';}
    else if(s.error==='reconnect'){b='<button class="kb-btn kb-btn-primary" id="kbs-recon">Verbinden</button>';}
    else{b='<button class="kb-btn kb-btn-primary" id="kbs-open">📂 Bestehende Datei öffnen</button><button class="kb-btn" id="kbs-new">➕ Neue gemeinsame Datei</button>';}
    ac.innerHTML=b;
    function w(id,fn){var e=$(id);if(e)e.addEventListener('click',fn);}
    w('kbs-now',function(){window.KB_SYNC.syncNow();});
    w('kbs-bkdir',function(){window.KB_SYNC.chooseBackupDir();});
    w('kbs-bkok',function(){window.KB_SYNC.regrantBackupDir();});
    w('kbs-disc',function(){if(confirm('Verbindung trennen? Lokale Daten bleiben erhalten.'))window.KB_SYNC.disconnect();});
    w('kbs-recon',function(){window.KB_SYNC.reconnect();});
    w('kbs-open',function(){window.KB_SYNC.connectExisting();});
    w('kbs-new',function(){window.KB_SYNC.connectNew();});
  }
  if(window.KB_SYNC){window.KB_SYNC.onStatus(function(){renderSync();});window.KB_SYNC.init();}

  // Savoir-Kontextleiste: zurück zum Schüler (Eingaben werden gesichert)
  var savBack=$('sav-back');
  if(savBack){savBack.addEventListener('click',function(){
    if(window.KB_SCREENING){try{window.KB_SCREENING.capture();}catch(e){}}
    var sid=window.__SAV_RETURN||(window.KB_SCREENING&&window.KB_SCREENING.activeId);
    var sb=$('sav-bar'); if(sb){sb.style.display='none';}
    showPanel('dos-root'); setActive('students');
    if(sid&&window.navigate){window.navigate('#/student/'+encodeURIComponent(sid)+'?hub=screening');}
    else if(window.navigate){window.navigate('#/dashboard');}
  });}
  // Sicherheitsnetz: Screening-Eingaben beim Verlassen/Tab-Wechsel sichern
  window.addEventListener('beforeunload',function(){if(window.KB_SCREENING){try{window.KB_SCREENING.capture();}catch(e){}}});
  document.addEventListener('visibilitychange',function(){if(document.hidden&&window.KB_SCREENING){try{window.KB_SCREENING.capture();}catch(e){}}});

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
    removeNode:function(sid,id){var r=get(sid);r.nodes=r.nodes.filter(function(n){return n.id!==id;});set(sid,r);},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[]});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){data[r.id]={matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[]};});saveAll(data);}
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
    s+='<text x="44" y="150" font-size="13" font-weight="700" fill="#3b46b8">Familie / familiäre Hilfen</text>';
    s+='<text x="'+(W-44)+'" y="150" text-anchor="end" font-size="13" font-weight="700" fill="#3b46b8">Schule: lokal / regional</text>';
    s+='<text x="44" y="'+(cy+356)+'" font-size="13" font-weight="700" fill="#3b46b8">Externe Akteur:innen</text>';
    s+='<text x="'+(W-44)+'" y="'+(cy+356)+'" text-anchor="end" font-size="13" font-weight="700" fill="#3b46b8">Schule: national</text>';
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

/* ============================================================
   KB_SYNC — gemeinsame Datei auf O:\ (File System Access API)
   Zusammenführung PRO EINTRAG (kein Überschreiben bei mehreren
   Schreibenden). Reine Merge-/Diff-Funktionen sind testbar (_test).
   ============================================================ */
var SYNC_MODULE = `
window.KB_SYNC=(function(){
  var FMT='klassebuch-shared-v1';
  var COLLS=['roster','dosEntries','dosReunions','anwEntries','anwNotes','anwSettings','bubble','screening'];
  var BASE_LS='klassebuch_sync_base';
  var DBNAME='klassebuch-sync';
  function fsSupported(){return (typeof window!=='undefined')&&('showOpenFilePicker' in window)&&('showSaveFilePicker' in window);}

  function eqPayload(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function mergeColl(remote,local){
    var by={},i,r,ex;
    for(i=0;i<(remote||[]).length;i++){r=remote[i];by[r.id]=r;}
    for(i=0;i<(local||[]).length;i++){r=local[i];ex=by[r.id];if(!ex||(r._ts||0)>=(ex._ts||0)){by[r.id]=r;}}
    var out=[];for(var k in by){out.push(by[k]);}return out;
  }
  function diffColl(base,live,now){
    var baseBy={},liveBy={},i,out=[];
    for(i=0;i<(base||[]).length;i++){baseBy[base[i].id]=base[i];}
    for(i=0;i<(live||[]).length;i++){liveBy[live[i].id]=live[i];}
    for(i=0;i<(live||[]).length;i++){var p=live[i];var b=baseBy[p.id];if(!b||b._del||!eqPayload(b.d,p)){out.push({id:p.id,_ts:now,d:p});}}
    for(i=0;i<(base||[]).length;i++){var bb=base[i];if(!bb._del&&!liveBy[bb.id]){out.push({id:bb.id,_ts:now,_del:true});}}
    return out;
  }
  function liveOf(coll){var out=[];for(var i=0;i<(coll||[]).length;i++){if(!coll[i]._del){out.push(coll[i].d);}}return out;}
  function emptyDoc(){var d={_format:FMT,colls:{}};for(var i=0;i<COLLS.length;i++){d.colls[COLLS[i]]=[];}return d;}
  function buildLocalDoc(base,live,now){var ld=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var bc=(base&&base.colls&&base.colls[n])||[];ld.colls[n]=mergeColl(bc,diffColl(bc,live[n]||[],now));}return ld;}
  function mergeDocs(remote,localDoc){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];nb.colls[n]=mergeColl(rc,localDoc.colls[n]);}return nb;}
  function firstReconcile(live,remote,now){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];var rby={};for(var j=0;j<rc.length;j++){rby[rc[j].id]=true;}var add=[];var lv=live[n]||[];for(j=0;j<lv.length;j++){if(!rby[lv[j].id]){add.push({id:lv[j].id,_ts:now,d:lv[j]});}}nb.colls[n]=mergeColl(rc,add);}return nb;}
  function normColl(c){return (c||[]).slice().sort(function(a,b){return a.id<b.id?-1:(a.id>b.id?1:0);}).map(function(r){return r.id+'|'+(r._ts||0)+'|'+(r._del?1:0)+'|'+JSON.stringify(r.d||null);}).join(';');}
  function sameDoc(a,b){if(!a||!b)return false;for(var i=0;i<COLLS.length;i++){if(normColl(a.colls[COLLS[i]])!==normColl(b.colls[COLLS[i]]))return false;}return true;}
  function summarize(doc){var keys=['roster','dosEntries','dosReunions','anwEntries','anwNotes','bubble'];var c={};for(var j=0;j<keys.length;j++){var coll=(doc&&doc.colls&&doc.colls[keys[j]])||[];var n=0;for(var i=0;i<coll.length;i++){if(!coll[i]._del)n++;}c[keys[j]]=n;}return c;}

  function collGet(){
    function c(o,m){return (o&&o[m])?o[m]():[];}
    var st=(window.KB_ANW&&window.KB_ANW.exportSettings)?[window.KB_ANW.exportSettings()]:[];
    return {roster:c(window.KB_ROSTER,'syncExport'),bubble:c(window.KB_BUBBLE,'syncExport'),dosEntries:c(window.KB_DOS_SYNC,'exportEntries'),dosReunions:c(window.KB_DOS_SYNC,'exportReunions'),anwEntries:c(window.KB_ANW,'exportEntries'),anwNotes:c(window.KB_ANW,'exportNotes'),anwSettings:st,screening:c(window.KB_SCREENING,'syncExport')};
  }
  function collSet(doc){
    function s(o,m,v){if(o&&o[m]){try{o[m](v);}catch(e){}}}
    s(window.KB_ROSTER,'syncApply',liveOf(doc.colls.roster));
    s(window.KB_DOS_SYNC,'applyEntries',liveOf(doc.colls.dosEntries));
    s(window.KB_DOS_SYNC,'applyReunions',liveOf(doc.colls.dosReunions));
    s(window.KB_ANW,'applyEntries',liveOf(doc.colls.anwEntries));
    s(window.KB_ANW,'applyNotes',liveOf(doc.colls.anwNotes));
    var se=liveOf(doc.colls.anwSettings);s(window.KB_ANW,'applySettings',se[0]||null);
    s(window.KB_BUBBLE,'syncApply',liveOf(doc.colls.bubble));
    s(window.KB_SCREENING,'syncApply',liveOf(doc.colls.screening));
  }

  var base=null,busy=false,applying=false,timer=null,fileHandle=null;
  var status={connected:false,supported:fsSupported(),fileName:'',lastSync:0,lastBy:'',error:'',pending:false,backupName:'',backupLast:'',backupErr:''};
  var statusCb=null;
  function setStatus(p){for(var k in p){status[k]=p[k];}if(statusCb){try{statusCb(status);}catch(e){}}}
  function loadBase(){try{var r=localStorage.getItem(BASE_LS);if(r)return JSON.parse(r);}catch(e){}return null;}
  function saveBase(b){try{localStorage.setItem(BASE_LS,JSON.stringify(b));}catch(e){}}
  function operator(){try{return localStorage.getItem('anwesenheit_user')||'';}catch(e){return '';}}

  function idb(){return new Promise(function(res,rej){var r=indexedDB.open(DBNAME,1);r.onupgradeneeded=function(){r.result.createObjectStore('h');};r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};});}
  function idbSet(h,key){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction('h','readwrite');tx.objectStore('h').put(h,key||'handle');tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};});});}
  function idbGet(key){return idb().then(function(db){return new Promise(function(res){var tx=db.transaction('h','readonly');var rq=tx.objectStore('h').get(key||'handle');rq.onsuccess=function(){res(rq.result||null);};rq.onerror=function(){res(null);};});}).catch(function(){return null;});}
  function idbDel(key){return idb().then(function(db){return new Promise(function(res){var tx=db.transaction('h','readwrite');tx.objectStore('h').delete(key||'handle');tx.oncomplete=function(){res();};tx.onerror=function(){res();};});}).catch(function(){});}
  function verifyPermission(h,req){var o={mode:'readwrite'};return h.queryPermission(o).then(function(p){if(p==='granted')return true;if(req)return h.requestPermission(o).then(function(p2){return p2==='granted';});return false;});}

  function readFile(){
    if(!fileHandle)return Promise.resolve(undefined);
    return fileHandle.getFile().then(function(f){return f.text();}).then(function(txt){
      if(!txt||!txt.trim())return null;
      var d;try{d=JSON.parse(txt);}catch(e){return 'INVALID';}
      if(!d||d._format!==FMT||!d.colls)return 'INVALID';
      return d;
    });
  }
  function writeFile(doc){if(!fileHandle)return Promise.resolve();doc._savedAt=Date.now();doc._savedBy=operator();var json=JSON.stringify(doc);return fileHandle.createWritable().then(function(w){return w.write(json).then(function(){return w.close();});});}

  // --- Tägliche Auto-Sicherung: datierte Kopie in einen Ordner auf O: ---
  var backupDir=null,backupBusy=false,BK_DAY='klassebuch_backup_lastday';
  function bkLastDay(){try{return localStorage.getItem(BK_DAY)||'';}catch(e){return '';}}
  function bkSetDay(d){try{localStorage.setItem(BK_DAY,d);}catch(e){}}
  function todayStr(){var d=new Date();function p(n){return (n<10?'0':'')+n;}return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
  function isBackupName(n){return !!n&&n.length===26&&n.indexOf('klassebuch-')===0&&n.slice(-5)==='.json'&&n.charAt(15)==='-'&&n.charAt(18)==='-';}
  function listDirFiles(dir){var it=dir.values();var names=[];function step(){return it.next().then(function(r){if(r.done)return names;var v=r.value;if(v&&v.kind==='file'&&v.name)names.push(v.name);return step();});}return step();}
  function planPrune(names,keep){var mine=(names||[]).filter(isBackupName).sort();return mine.slice(0,Math.max(0,mine.length-keep));}
  function pruneBackups(){if(!backupDir)return Promise.resolve();return listDirFiles(backupDir).then(function(names){var del=planPrune(names,30);var p=Promise.resolve();for(var i=0;i<del.length;i++){(function(n){p=p.then(function(){return backupDir.removeEntry(n).catch(function(){});});})(del[i]);}return p;}).catch(function(){});}
  function writeBackup(){if(!backupDir||!base)return Promise.resolve();var name='klassebuch-'+todayStr()+'.json';var snap={};for(var k in base){snap[k]=base[k];}snap._backupAt=Date.now();snap._backupBy=operator();var json=JSON.stringify(snap);return backupDir.getFileHandle(name,{create:true}).then(function(fh){return fh.createWritable();}).then(function(w){return w.write(json).then(function(){return w.close();});}).then(function(){return pruneBackups();});}
  function maybeBackup(){
    if(!backupDir||backupBusy||!base)return;
    var today=todayStr();if(bkLastDay()===today)return;
    backupBusy=true;
    verifyPermission(backupDir,false).then(function(ok){
      if(!ok){backupBusy=false;return;}
      return writeBackup().then(function(){bkSetDay(today);setStatus({backupLast:today,backupErr:''});});
    }).then(function(){backupBusy=false;}).catch(function(e){backupBusy=false;setStatus({backupErr:'Backup-Fehler: '+((e&&e.message)||e)});});
  }

  function cycle(){
    if(!fileHandle||busy||applying)return Promise.resolve();
    busy=true;setStatus({pending:true});
    var now=Date.now();var live=collGet();
    return readFile().then(function(remote){
      if(remote==='INVALID'){setStatus({error:'Gemeinsame Datei nicht lesbar — Sync pausiert (lokale Daten bleiben unveraendert).',pending:false});busy=false;return;}
      var nb,apply;
      if(!base){nb=firstReconcile(live,remote||null,now);apply=true;}
      else{var ld=buildLocalDoc(base,live,now);nb=mergeDocs(remote||null,ld);apply=!sameDoc(nb,ld);}
      if(apply){applying=true;try{collSet(nb);}catch(e){}applying=false;}
      base=nb;saveBase(nb);
      var changed=!remote||!sameDoc(nb,remote);
      var p=changed?writeFile(nb):Promise.resolve();
      return p.then(function(){setStatus({error:'',lastSync:Date.now(),lastBy:(remote&&remote._savedBy)||status.lastBy,pending:false,counts:summarize(base)});busy=false;maybeBackup();});
    }).catch(function(e){setStatus({error:'Sync-Fehler: '+((e&&e.message)||e),pending:false});busy=false;});
  }
  function start(){stop();timer=setInterval(cycle,5000);cycle();}
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function afterPick(h){return verifyPermission(h,true).then(function(ok){if(!ok){setStatus({error:'Kein Zugriff auf die Datei erteilt.'});return;}fileHandle=h;base=loadBase();return idbSet(h).then(function(){setStatus({connected:true,fileName:h.name||'gemeinsame Datei',error:''});start();});});}

  return {
    supported:fsSupported,
    getStatus:function(){return status;},
    onStatus:function(cb){statusCb=cb;try{cb(status);}catch(e){}},
    connectNew:function(){if(!fsSupported()){setStatus({error:'Nur in Chrome/Edge moeglich.'});return;}window.showSaveFilePicker({suggestedName:'klassebuch-team.json',types:[{description:'Klassebuch-Daten',accept:{'application/json':['.json']}}]}).then(afterPick).catch(function(e){if(e&&e.name!=='AbortError')setStatus({error:String((e&&e.message)||e)});});},
    connectExisting:function(){if(!fsSupported()){setStatus({error:'Nur in Chrome/Edge moeglich.'});return;}window.showOpenFilePicker({multiple:false,types:[{description:'Klassebuch-Daten',accept:{'application/json':['.json']}}]}).then(function(a){return afterPick(a[0]);}).catch(function(e){if(e&&e.name!=='AbortError')setStatus({error:String((e&&e.message)||e)});});},
    chooseBackupDir:function(){if(!fsSupported()||!('showDirectoryPicker' in window)){setStatus({backupErr:'Nur in Chrome/Edge moeglich.'});return;}window.showDirectoryPicker({mode:'readwrite'}).then(function(d){return verifyPermission(d,true).then(function(ok){if(!ok){setStatus({backupErr:'Kein Zugriff auf den Ordner erteilt.'});return;}backupDir=d;bkSetDay('');return idbSet(d,'backupdir').then(function(){setStatus({backupName:d.name||'Backup-Ordner',backupLast:'',backupErr:''});maybeBackup();});});}).catch(function(e){if(e&&e.name!=='AbortError')setStatus({backupErr:String((e&&e.message)||e)});});},
    regrantBackupDir:function(){idbGet('backupdir').then(function(d){if(!d)return;return verifyPermission(d,true).then(function(ok){if(ok){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupErr:''});maybeBackup();}else{setStatus({backupErr:'Kein Zugriff auf den Ordner erteilt.'});}});});},
    clearBackupDir:function(){backupDir=null;idbDel('backupdir');setStatus({backupName:'',backupLast:'',backupErr:''});},
    disconnect:function(){stop();fileHandle=null;idbDel();setStatus({connected:false,fileName:'',error:''});},
    syncNow:function(){return cycle();},
    reconnect:function(){idbGet().then(function(h){if(h)return afterPick(h);}).then(function(){return idbGet('backupdir');}).then(function(d){if(!d)return;return verifyPermission(d,true).then(function(ok){if(ok){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupErr:''});maybeBackup();}});});},
    init:function(){if(!fsSupported())return;idbGet().then(function(h){if(!h)return;h.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){fileHandle=h;base=loadBase();setStatus({connected:true,fileName:h.name||'gemeinsame Datei'});start();}else{setStatus({connected:false,fileName:h.name||'gemeinsame Datei',error:'reconnect'});}});});idbGet('backupdir').then(function(d){if(!d)return;d.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay()});}else{setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay(),backupErr:'reconnect'});}});});},
    _test:{mergeColl:mergeColl,diffColl:diffColl,buildLocalDoc:buildLocalDoc,mergeDocs:mergeDocs,firstReconcile:firstReconcile,liveOf:liveOf,sameDoc:sameDoc,emptyDoc:emptyDoc,COLLS:COLLS,isBackupName:isBackupName,planPrune:planPrune,todayStr:todayStr,writeBackup:writeBackup,pruneBackups:pruneBackups,maybeBackup:maybeBackup,setBackupDir:function(d){backupDir=d;},setBase:function(b){base=b;},lastDay:bkLastDay,resetDay:function(){bkSetDay('');}}
  };
})();
`;

/* ============================================================
   SAVOIR (klinisches Screening) — als #sav-root eingebettet.
   Das gesamte Original-Skript wird in eine Funktion gewrappt
   (JS-Globals isoliert, keine Kollision mit anw/dos) und gibt
   eine schmale window.SAVOIR_API nach außen: reine Scoring-/
   Daten-Funktionen + getScreening/setScreening (Pro-Schüler-
   Puffer) + Moduswechsel (Diagnostik / Krankheitsbilder).
   ============================================================ */
var SAVOIR_API_EXPORT = `
  /* === Savoir-API nach außen (für Klassenbuch-Hub & KI-Export) === */
  try{
    window.SAVOIR_API = {
      SAVOIR_GLOBAL: (typeof SAVOIR_GLOBAL!=='undefined')?SAVOIR_GLOBAL:null,
      scoreVerdachtsachsen: (typeof scoreVerdachtsachsen!=='undefined')?scoreVerdachtsachsen:null,
      computeSymptomScores: (typeof computeSymptomScores!=='undefined')?computeSymptomScores:null,
      planMusterFor: (typeof planMusterFor!=='undefined')?planMusterFor:null,
      symptomDiagnoseFor: (typeof symptomDiagnoseFor!=='undefined')?symptomDiagnoseFor:null,
      STATE: (typeof STATE!=='undefined')?STATE:null,
      showMode: (typeof showMode!=='undefined')?showMode:null,
      showView: (typeof showView!=='undefined')?showView:null,
      renderDiagnostik: (typeof renderDiagnostik!=='undefined')?renderDiagnostik:null,
      getScreening: function(){
        var g={symptome:[]}; try{ g=loadGlobalDiag()||g; }catch(e){}
        var plans={}; try{ plans=JSON.parse(window.localStorage.getItem('savoir_plans')||'{}')||{}; }catch(e){}
        return { symptome:(g.symptome||[]).slice(), plans:plans };
      },
      setScreening: function(data){
        data=data||{};
        try{ saveGlobalDiag({symptome:(data.symptome||[]).slice(), lastAchse:null}); }catch(e){}
        try{ window.localStorage.setItem('savoir_plans', JSON.stringify(data.plans||{})); }catch(e){}
        try{ if(typeof STATE!=='undefined'){STATE.diagSubtab='eingabe';} if(typeof showMode!=='undefined'){showMode('diagnostik');} }catch(e){}
      },
      gotoInfos: function(){ try{ if(typeof showMode!=='undefined'){showMode('krankheitsbilder');} }catch(e){} },
      gotoScreening: function(){ try{ if(typeof STATE!=='undefined'){STATE.diagSubtab='eingabe';} if(typeof showMode!=='undefined'){showMode('diagnostik');} }catch(e){} }
    };
  }catch(e){ try{console.error('SAVOIR_API export failed',e);}catch(_){ } }
`;
/* API VOR dem Original-init() exportieren, damit SAVOIR_API auch dann steht,
   falls init() in einer Umgebung mal stolpert. Alles in try/catch gekapselt. */
var savScriptPatched = replaceOnce(savScript, '(function init() {',
  SAVOIR_API_EXPORT + '\n/* --- danach folgt der originale Savoir-init --- */\n(function init() {',
  'sav:api-before-init');
var SAVOIR_MODULE = '(function(){\ntry{\n/* === SAVOIR.html <script> — gewrappt, JS-Globals isoliert === */\n' + savScriptPatched + '\n}catch(__savErr){try{console.error("SAVOIR embed error", __savErr);}catch(_){ }}\n})();';

/* ============================================================
   KB_SCREENING — Pro-Schüler-Speicher fürs Savoir-Screening.
   Hält je Schüler {symptome, plans} (= Savoirs Eingabe-Puffer),
   lädt sie beim Öffnen ins Savoir-Modul (setScreening) und liest
   sie beim Verlassen zurück (capture). result()/detail() berechnen
   über SAVOIR_API das kompakte Ergebnis (Achsen + Risiken + Submuster).
   ============================================================ */
var SCREENING_MODULE = `
window.KB_SCREENING=(function(){
  var LS='klassebuch_screening_v1';
  var activeId=null;
  function loadAll(){try{var r=localStorage.getItem(LS);if(r){return JSON.parse(r)||{};}}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();
  function get(sid){var r=data[sid];if(!r){r={symptome:[],plans:{},updatedAt:''};}if(!r.symptome){r.symptome=[];}if(!r.plans){r.plans={};}return r;}
  function set(sid,r){data[sid]=r;saveAll(data);}
  function api(){return window.SAVOIR_API||null;}
  function capture(){
    if(!activeId)return;var a=api();if(!a||!a.getScreening)return;
    try{var s=a.getScreening();set(activeId,{symptome:(s.symptome||[]).slice(),plans:s.plans||{},updatedAt:new Date().toISOString()});}catch(e){}
  }
  function openStudent(sid){
    capture(); activeId=sid; var a=api();
    if(a&&a.setScreening){try{a.setScreening(get(sid));}catch(e){}}
  }
  function plain(html){return String(html==null?'':html).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\\s+/g,' ').trim();}
  function result(sid){
    var a=api(); var d=get(sid);
    if(!a||!a.scoreVerdachtsachsen)return {hasData:false,noApi:true};
    if(!d.symptome||!d.symptome.length)return {hasData:false};
    var res; try{res=a.scoreVerdachtsachsen(d.symptome.slice());}catch(e){return {hasData:false};}
    var achsen=((res&&res.achsenSortiert)||[]).filter(function(x){return x&&x.staerke;});
    var risiken=((res&&res.aktiveRisiken)||[]).filter(function(x){return x&&x.staerke;});
    var topMuster=null,topTopicKey=null,topAchseName=null;
    for(var i=0;i<achsen.length && !topMuster;i++){
      var ac=achsen[i].achse||{}; var tk=ac.topicKey; if(!tk||!d.plans[tk])continue;
      if(a.computeSymptomScores){try{var ms=a.computeSymptomScores(d.plans[tk],tk);if(ms&&ms.length&&ms[0].muster){topMuster=ms[0].muster;topTopicKey=tk;topAchseName=ac.name;}}catch(e){}}
    }
    return {hasData:true,achsen:achsen,risiken:risiken,topMuster:topMuster,topTopicKey:topTopicKey,topAchseName:topAchseName,updatedAt:d.updatedAt};
  }
  function symTextMap(){
    var m={}; try{var a=api(); var pool=a&&a.SAVOIR_GLOBAL&&a.SAVOIR_GLOBAL.symptomPool; (pool&&pool.symptome||[]).forEach(function(s){m[s.id]=s.text;});}catch(e){} return m;
  }
  function detail(sid){
    var a=api(); var r=result(sid); if(!r.hasData)return null;
    var d=get(sid); var L=[]; var sm=symTextMap();
    L.push('A) Erfasste Beobachtungen im Screening (die Antworten):');
    if(d.symptome&&d.symptome.length){d.symptome.forEach(function(id){L.push('  - '+(sm[id]||id));});}else{L.push('  - (keine globalen Symptome markiert)');}
    if(r.topTopicKey&&a&&a.symptomDiagnoseFor){
      var diag=a.symptomDiagnoseFor(r.topTopicKey)||{}; var ps=d.plans[r.topTopicKey]||{};
      if(ps.kontext&&diag.kontextFragen){
        var cl=[]; diag.kontextFragen.forEach(function(f){var v=ps.kontext[f.id]; if(v){var opt=(f.optionen||[]).filter(function(o){return o.val===v;})[0]; cl.push((f.titel||f.id)+': '+((opt&&opt.text)||v));}});
        if(cl.length)L.push('  Kontext ('+(r.topAchseName||r.topTopicKey)+'): '+cl.join('; '));
      }
      if(ps.symptome&&ps.symptome.length&&diag.symptomKategorien){
        var tm={}; diag.symptomKategorien.forEach(function(k){(k.symptome||[]).forEach(function(s){tm[s.id]=s.text;});});
        L.push('  Vertiefte Merkmale ('+(r.topAchseName||r.topTopicKey)+'):');
        ps.symptome.forEach(function(id){L.push('    - '+(tm[id]||id));});
      }
    }
    L.push('');
    L.push('B) Ergebnis (vom Programm berechnet):');
    L.push('Verdachtsachsen (Ausprägung):');
    if(r.achsen.length){r.achsen.forEach(function(x){L.push('  - '+((x.achse&&x.achse.name)||(x.achse&&x.achse.id)||'?')+': '+x.staerke);});}else{L.push('  - keine über Schwelle');}
    if(r.risiken.length){L.push('Risiko-Hinweise:');r.risiken.forEach(function(x){L.push('  - '+((x.risiko&&x.risiko.name)||'?')+': '+x.staerke);});}
    if(r.topMuster){var b=r.topMuster.bloecke||{};
      L.push('Erkanntes Submuster: '+(r.topMuster.name||'?')+(r.topAchseName?' ('+r.topAchseName+')':''));
      if(b.profil)L.push('  Erklärung: '+plain(b.profil));
      if(b.ansatzHaupt)L.push('  Umgang/Ansatz: '+plain(b.ansatzHaupt));
      if(b.ansatzTust)L.push('  Konkret tun: '+plain(b.ansatzTust));
      if(b.ansatzNicht)L.push('  Vermeiden: '+plain(b.ansatzNicht));
      if(b.phasen&&b.phasen[0])L.push('  Nächste Schritte: '+(b.phasen[0].titel||'')+' — '+plain(b.phasen[0].was||b.phasen[0].ziele||''));
      if(b.schuleAnpassungen)L.push('  Schulanpassungen: '+plain(b.schuleAnpassungen));
      var krise=b.risikoKritisch||(b.krisenampel&&b.krisenampel.rot&&[].concat(b.krisenampel.rot.zeichen||[]).join('; '));
      if(krise)L.push('  Krisen-/Risikohinweis: '+plain(krise));
    }
    return {text:L.join('\\n'), updatedAt:r.updatedAt};
  }
  return {
    get:function(sid){return get(sid);},
    hasData:function(sid){var d=get(sid);return !!(d.symptome&&d.symptome.length);},
    get activeId(){return activeId;},
    setActive:function(sid){activeId=sid;},
    capture:capture,
    openStudent:openStudent,
    result:result,
    detail:detail,
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,symptome:r.symptome||[],plans:r.plans||{},updatedAt:r.updatedAt||''});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){if(r&&r.id){data[r.id]={symptome:r.symptome||[],plans:r.plans||{},updatedAt:r.updatedAt||''};}});saveAll(data);}
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
  '/* === savoir / screening (gescoped) === */', savStyleScoped,
  '/* === Akzent-Vereinheitlichung === */', ACCENT_OVERRIDE,
  '</style>',
  '</head>',
  '<body>',
  SHELL_BODY_TOP,
  '<section class="kb-panel" id="anw-root">', anwBody, '</section>',
  '<section class="kb-panel" id="dos-root">', dosBody, '</section>',
  '<section class="kb-panel" id="sav-root">',
  '<div class="sav-bar" id="sav-bar" style="display:none"><button class="sav-back" id="sav-back">← Zurück zum Schüler</button><span class="sav-who" id="sav-who"></span><span class="sav-hint">Screening-Befunde sind Beobachtungs-Hypothesen, keine Diagnosen.</span></div>',
  savBody,
  '</section>',
  SHELL_PANELS_EXTRA,
  '<script>' + ROSTER_MODULE + '</' + 'script>',
  '<script>' + dosScript + '</' + 'script>',
  '<script>' + DOS_OVERRIDES + '</' + 'script>',
  '<script>' + BUBBLE_MODULE + '</' + 'script>',
  '<script>' + anwScript + '</' + 'script>',
  '<script>' + SAVOIR_MODULE + '</' + 'script>',
  '<script>' + SCREENING_MODULE + '</' + 'script>',
  '<script>' + SYNC_MODULE + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

fs.writeFileSync(path.join(ROOT, 'index.html'), parts.join('\n'), 'utf8');
console.log('index.html geschrieben: ' + parts.join('\n').length + ' Bytes');
