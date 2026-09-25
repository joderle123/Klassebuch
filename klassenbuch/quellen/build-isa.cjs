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
var TABS_GUARD = read('tabs-guard.js');
var SPELL_JS  = read('spell.js');
var SPELL_CSS = read('spell.css');
var NSPELL_JS = read('vendor/nspell.bundle.js');
/* Woerterbuch gepackt einbetten: ausgepackt wird es erst im Browser, und
   erst dann, wenn wirklich jemand schreibt. */
var SPELL_DATA = 'window.KB_SPELL_DATA={aff:"' + fs.readFileSync(path.join(ROOT,'vendor/lb/lb_LU.aff.gz')).toString('base64') +
  '",dic:"' + fs.readFileSync(path.join(ROOT,'vendor/lb/lb_LU.dic.gz')).toString('base64') + '"};';
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
  "    applySettings:function(s){if(s){if(s.timetable){state.timetable=s.timetable;}if(s.periods){state.periods=s.periods;}if(s.ttVersion!=null){state.ttVersion=s.ttVersion;}}save();renderAll();},",
  "    getUser:function(){return state.currentUser||'';},",
  "    setUser:function(u){setUser(u);},",
  "    users:function(){return USERS.slice();},",
  "    initials:function(n){return initials(n);},",
  "    avatarBg:function(n){return avatarBg(n);},",
  "    subjectsForLevel:function(level){var set={},out=[];var tt=state.timetable&&state.timetable[level];if(!tt)return [];for(var wd=1;wd<=5;wd++){var day=tt[wd]||[];for(var i=0;i<day.length;i++){var s=day[i];if(s&&!PAUSE_SUBJECTS[s]&&s!=='Morning Meeting'&&s!=='Hausaufgaben'&&!set[s]){set[s]=1;out.push(s);}}}return out.sort(function(a,b){return a.localeCompare(b);});}",
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
.kb-hub-head{padding:18px 24px 0;background:var(--kb-surface);}
.kb-hub-back{display:inline-block;color:var(--kb-muted);text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px;}
.kb-hub-back:hover{color:var(--kb-accent);}
.kb-hub-id{display:flex;align-items:center;gap:12px;margin:4px 0 14px;}
.kb-hub-avatar{flex:0 0 auto;width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark));color:#fff;display:grid;place-items:center;font-size:20px;font-weight:800;}
.kb-hub-name{font-size:21px;font-weight:800;letter-spacing:-.02em;}
.kb-hub-meta{color:var(--kb-muted);font-size:13px;font-weight:600;}
.kb-hub-tabs{display:flex;gap:3px;flex-wrap:wrap;border-bottom:1px solid var(--kb-border);}
.kb-hub-tab{padding:9px 15px;border-radius:9px 9px 0 0;text-decoration:none;color:var(--kb-muted);font-weight:700;font-size:13.5px;border-bottom:2px solid transparent;margin-bottom:-1px;}
.kb-hub-tab:hover{background:var(--kb-accent-50);color:var(--kb-text);}
.kb-hub-tab.active{color:var(--kb-accent);border-bottom-color:var(--kb-accent);background:transparent;}
.kb-hub-body{padding:22px 24px 56px;}
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
.kbb-compare{margin-top:20px;}
.kbb-snaprow{display:flex;gap:8px;flex-wrap:wrap;}
.kbb-snaprow .kb-in{flex:1;min-width:180px;}
.kbb-snapitem{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;padding:6px 2px;border-top:1px solid var(--kb-border);}
.kbb-snapitem:first-child{border-top:none;}
.kbb-cmp-controls{display:flex;align-items:flex-end;gap:10px;margin:14px 0 4px;flex-wrap:wrap;}
.kbb-cmp-controls label{flex:1;min-width:160px;display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:700;color:var(--kb-muted);}
.kbb-cmp-arrow{font-weight:800;color:var(--kb-muted);padding-bottom:8px;}
.kbb-cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:14px 0;}
.kbb-cmp-col{min-width:0;}
.kbb-cmp-title{font-size:12.5px;font-weight:800;color:var(--kb-text);margin:0 0 6px;}
.kbb-cmp-col .kb-bubble-svg,.kbb-cmp-col svg{background:#fff;border:1px solid var(--kb-border);border-radius:12px;}
.kbb-diff{display:flex;flex-direction:column;gap:10px;}
.kbb-diff-grp{border:1px solid var(--kb-border);border-left-width:4px;border-radius:10px;padding:10px 13px;}
.kbb-diff-grp ul{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.5;}
.kbb-diff-grp li{margin:3px 0;}
.kbb-diff-h{font-weight:800;font-size:13px;}
.kbb-diff-add{border-left-color:var(--kb-ok);} .kbb-diff-add .kbb-diff-h{color:var(--kb-ok);}
.kbb-diff-rem{border-left-color:var(--kb-danger);} .kbb-diff-rem .kbb-diff-h{color:var(--kb-danger-dark);}
.kbb-diff-chg{border-left-color:var(--kb-warn);} .kbb-diff-chg .kbb-diff-h{color:#8a5a00;}
@media(max-width:880px){.kb-bubble-cols{grid-template-columns:1fr;}.kbb-cmp-grid{grid-template-columns:1fr;}}
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
  .kb-side{position:fixed;top:0;left:0;bottom:0;height:100vh;height:100dvh;transform:translateX(-100%);transition:transform .2s ease,box-shadow .2s ease;box-shadow:none;}
  .kb-app.kb-open .kb-side{transform:none;box-shadow:0 0 50px rgba(0,0,0,.25);}   /* Schatten nur offen – sonst ragt er zugeklappt in die Seite */
  .kb-app.kb-open .kb-scrim{display:block;position:fixed;inset:0;background:rgba(15,20,35,.45);z-index:39;}
  .kb-pad,.kb-hub-head,.kb-hub-body{padding-left:16px;padding-right:16px;}
}
/* Desktop: einklappbare Seitenleiste (mehr Platz für den Hauptbereich) */
.kb-collapse{margin-left:auto;flex:0 0 auto;width:28px;height:28px;border-radius:8px;border:1px solid var(--kb-border);background:none;color:var(--kb-muted);font-size:16px;line-height:1;cursor:pointer;transition:.13s;}
.kb-collapse:hover{background:var(--kb-accent-50);color:var(--kb-accent);border-color:var(--kb-accent);}
.kb-reopen{display:none;position:fixed;top:12px;left:10px;z-index:60;width:38px;height:38px;border-radius:10px;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);font-size:17px;line-height:1;cursor:pointer;box-shadow:var(--kb-shadow-sm);transition:.13s;}
.kb-reopen:hover{background:var(--kb-accent-50);color:var(--kb-accent);border-color:var(--kb-accent);}
@media(min-width:881px){
  .kb-app.kb-collapsed .kb-side{display:none;}
  .kb-app.kb-collapsed .kb-reopen{display:grid;place-items:center;}
  .kb-app.kb-collapsed .kb-stage{padding-left:46px;}
}
@media(max-width:880px){ .kb-collapse{display:none;} }
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
/* Handy/Tablet: schmale Ränder – steht nach den „luftigen“ Abständen, sonst würde es überschrieben */
@media(max-width:880px){.kb-pad,.kb-hub-head,.kb-hub-body{padding-left:16px;padding-right:16px;}.kb-pad{padding-top:20px;padding-bottom:56px;}.kb-hub-body{padding-top:18px;padding-bottom:48px;}}
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
.kb-statstrip{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,138px),1fr));gap:12px;margin:0 0 22px;}
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
.kb-hub-id .kb-hub-dossier{margin-left:auto;align-self:center;}
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
.hub-acute{display:flex;align-items:center;gap:12px;background:var(--kb-danger-50);border:1px solid var(--kb-danger);border-radius:12px;padding:10px 14px;margin:0 0 18px;color:var(--kb-danger-dark);font-weight:700;font-size:13.5px;}
.hub-acute a{margin-left:auto;flex:0 0 auto;}
.hub-empty-ic{font-size:46px;margin-bottom:8px;}
.hub-empty h3{margin:0 0 6px;font-size:21px;letter-spacing:-.01em;}
.hub-empty p{color:var(--kb-muted);margin:0 0 20px;}
.hub-empty-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
/* Réunion-Beitrag direkt beim Schüler schreiben */
.reu-h{font-size:15px;font-weight:800;margin:0 0 10px;color:var(--kb-text);}
.reu-write .reu-input{width:100%;border:1px solid var(--kb-border);border-radius:10px;padding:10px 12px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;background:var(--kb-surface);color:var(--kb-text);box-sizing:border-box;}
.reu-write .reu-input:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.reu-lbl{display:block;font-size:12px;font-weight:700;color:var(--kb-muted);margin:0 0 5px;}
.reu-write .reu-goals{width:100%;border:1px solid var(--kb-border);border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;line-height:1.5;resize:vertical;background:var(--kb-surface);color:var(--kb-text);box-sizing:border-box;}
.reu-write .reu-goals:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
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
/* ===== Verlauf: Filter-Chips (der aktive war blau auf blau) ===== */
.tl-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);font-size:13px;font-weight:650;text-decoration:none;}
.tl-chip:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.tl-chip.is-on{background:var(--kb-accent);border-color:var(--kb-accent);color:#fff;}
.kb-ziel-ok{color:var(--kb-muted);}
/* ===== Screening: Hinweis auf den Hub und frühere Angaben (nur lesen) ===== */
.kb-scr-hinweis{background:var(--kb-accent-50);border:1px solid var(--kb-accent-100);border-radius:14px;padding:16px 18px;margin:0 0 16px;}
.kb-scr-hinweis h3{margin:0 0 6px;font-size:16px;}
.kb-scr-hinweis p{margin:0 0 12px;font-size:14px;line-height:1.55;color:var(--kb-text-soft);max-width:72ch;}
.kb-scr-alt h4{margin:0 0 4px;font-size:15px;}
.kb-scr-alt .kb-scr-sub{font-size:12.5px;color:var(--kb-muted);margin:0 0 12px;}
.kb-scr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px 20px;margin:0 0 12px;}
.kb-scr-grid h5{margin:0 0 6px;font-size:13.5px;}
.kb-scr-grid ul{margin:0;padding-left:18px;display:grid;gap:4px;font-size:13.5px;}
.kb-scr-dl{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:6px 14px;font-size:13.5px;margin:4px 0 0;}
.kb-scr-dl dt{color:var(--kb-muted);}.kb-scr-dl dd{margin:0;font-weight:600;}
@media (max-width:640px){.kb-scr-dl{grid-template-columns:minmax(0,1fr);}}
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
#anw-root #btn-cal,#anw-root #btn-pdf,#anw-root #btn-data{ display:none; }
/* Stundenplan (🗓️) im Klassenbuch-Kopf sichtbar lassen — gut auffindbar */
#anw-root #btn-tt{ display:inline-flex; }
#anw-root .sync-section,#anw-root #reconnect-bar{ display:none !important; }
#dos-root .main{ max-width:1180px; margin:0 auto; }
/* Dossier ruhiger & luftiger */
#dos-root .card{ border-radius:16px; box-shadow:none; }
#dos-root .card-grid{ gap:18px; }
#dos-root .page-head h2{ font-size:25px; letter-spacing:-.02em; }
#dos-root .empty-state{ border-radius:16px; }
#dos-root .card.kb-mini{ padding:14px 16px 16px; box-shadow:var(--kb-shadow-sm); transition:box-shadow .15s ease, transform .15s ease; }
#dos-root .card.kb-mini:hover{ box-shadow:var(--kb-shadow); transform:translateY(-2px); }
#dos-root .sv-muster{ box-shadow:var(--kb-shadow-sm); }
/* Einklappbarer Analyse-Block in der Dossier-Ansicht (entschlackt) */
#dos-root .dossier-fold{ border:1px solid var(--kb-border); border-radius:14px; background:var(--kb-surface); margin:0 0 16px; box-shadow:var(--kb-shadow-sm); }
#dos-root .dossier-fold>summary{ cursor:pointer; padding:14px 18px; font-weight:800; font-size:15px; list-style:none; display:flex; align-items:center; gap:8px; }
#dos-root .dossier-fold>summary::-webkit-details-marker{ display:none; }
#dos-root .dossier-fold>summary::before{ content:'▸'; color:var(--kb-muted); font-size:13px; transition:transform .15s; }
#dos-root .dossier-fold[open]>summary::before{ transform:rotate(90deg); }
#dos-root .dossier-fold>:not(summary){ margin-left:18px; margin-right:18px; }
#dos-root .dossier-fold .section-title{ margin-top:14px; }
#dos-root .dossier-fold .charts-grid{ padding-bottom:16px; }

/* =================================================================
   Professioneller Feinschliff — einheitliches, ruhiges, „fertiges" Layout
   ================================================================= */
/* Datenschutz-Hinweis: schlanke, elegante Leiste, an den Inhalt zentriert */
#dos-root #banner-root{ max-width:1180px; margin:0 auto; }
#dos-root .privacy-banner{ display:flex; align-items:center; gap:14px; background:var(--kb-accent-50); border:1px solid var(--kb-accent-100); border-bottom:1px solid var(--kb-accent-100); border-radius:12px; padding:10px 16px; margin:14px 16px 2px; box-shadow:none; }
#dos-root .privacy-banner>div{ font-size:12.5px; line-height:1.5; color:var(--kb-text-soft); }
#dos-root .privacy-banner>div strong{ color:var(--kb-text); }
#dos-root .privacy-banner button{ margin-left:auto; flex:0 0 auto; white-space:nowrap; border:1px solid var(--kb-border); background:#fff; color:var(--kb-text); font-weight:700; border-radius:9px; padding:8px 14px; cursor:pointer; }
#dos-root .privacy-banner button:hover{ border-color:var(--kb-accent); color:var(--kb-accent); }
/* Schüler-Hub-Kopf als saubere, klar abgegrenzte Leiste */
#dos-root .kb-hub-head{ border-bottom:1px solid var(--kb-border); margin-bottom:0; }
#dos-root .kb-hub-tabs{ border-bottom:none; }
#dos-root .kb-hub-body{ background:var(--kb-bg); }
/* Listen-/Karten-Raster etwas luftiger & konsistent */
#dos-root .card-grid{ gap:16px; }

/* ---- Anwesenheit (Klassenbuch) angleichen ---- */
/* Avatare vereinheitlichen — Marke statt Regenbogen */
#anw-root .avatar{ background:linear-gradient(135deg,var(--kb-accent),var(--kb-accent-dark))!important; color:#fff!important; box-shadow:0 2px 6px rgba(79,91,213,.22)!important; }
/* Ruhiger, eleganter Leerzustand */
#anw-root .main-empty{ padding:48px 24px; }
#anw-root .main-empty .i{ font-size:34px; opacity:.45; }
#anw-root .main-empty p{ color:var(--kb-text-soft); font-weight:700; }
#anw-root .main-empty .hint{ font-weight:500; color:var(--kb-muted); }
/* Kopfleiste etwas ruhiger */
#anw-root header{ box-shadow:0 1px 0 rgba(255,255,255,.12) inset, 0 6px 18px rgba(79,91,213,.16); }

/* ---- Stundenplan: groß & übersichtlich, einheitliches Design ---- */
#anw-root #modal-tt .modal{ max-width:1040px; }
#anw-root .tt-tabs{ gap:8px; margin-bottom:16px; }
#anw-root .tt-tab{ padding:9px 22px; font-size:14.5px; }
#anw-root .tt-grid table{ width:100%; font-size:14px; border-collapse:separate; border-spacing:0; }
#anw-root .tt-grid th,#anw-root .tt-grid td{ padding:9px 10px; }
#anw-root .tt-grid input{ font-size:14px; min-width:104px; padding:9px 10px; border-radius:8px; }
#anw-root .tt-grid .tcol{ font-size:13px; font-weight:800; }

/* ---- Wochen-Horaire (Klassenbuch): größer & besser lesbar ---- */
/* Höhere Zellen + größere Schrift = Hauptgewinn; Spaltenbreite moderat,
   damit alle 5 Tage auch auf Laptops ohne Scrollen passen. */
#anw-root .wk-grid table{ border-spacing:6px; }
#anw-root .wk-grid-large table{ min-width:800px; }
#anw-root .wk-grid thead th{ min-width:124px; padding:11px 8px; font-size:14px; }
#anw-root .wk-grid thead th .dn{ font-size:16.5px; }
#anw-root .wk-grid thead th .dt{ font-size:12.5px; }
#anw-root .wk-grid .tc{ font-size:13px; padding:10px 10px; }
#anw-root .wk-grid .tc .tw{ font-size:11.5px; }
#anw-root .wk-grid .wcell{ min-height:82px; font-size:15.5px; padding:12px 10px; border-radius:13px; gap:5px; }
#anw-root .wk-grid .wcell .subj-lbl{ font-size:15.5px; line-height:1.25; }
#anw-root .wk-grid .wcell.empty{ min-height:82px; }
#anw-root .wk-grid .wcell.pause{ font-size:13.5px; }
#anw-root .wk-grid .wcell .mk{ font-size:12px; padding:2px 10px; }
#anw-root .wk-grid .wcell.has-note{ padding-top:30px; }
@media (max-width:900px){ #anw-root .wk-grid .wcell{ min-height:68px; font-size:14px; } #anw-root .wk-grid .wcell .subj-lbl{ font-size:14px; } }

/* ---- Schülerliste schlanker -> mehr Platz fürs Horaire ---- */
#anw-root .layout{ max-width:1680px; }
#anw-root .sidebar{ flex:0 0 196px; padding:12px 8px; }
#anw-root .side-stu{ padding:6px 8px; gap:8px; }
#anw-root .side-stu .avatar{ width:30px; height:30px; font-size:12px; border-radius:9px; }
#anw-root .side-stu .nm{ font-size:13px; }
#anw-root .side-stu .nm small{ font-size:10px; }
#anw-root .side-stu .hrs{ font-size:11px; padding:2px 7px; }
/* Spalten dürfen den frei gewordenen Platz nutzen */
#anw-root .wk-grid thead th{ min-width:138px; }

/* ---- Schülerliste per Klick einklappen + Summe unter das Horaire ---- */
#anw-root .wrap{ display:flex; flex-direction:column; }
#anw-root .wrap > .side-toggle{ order:0; align-self:flex-start; margin:0 0 14px; }
#anw-root .wrap > #main-area{ order:2; }
#anw-root .wrap > #summary{ order:3; margin:22px 0 0; }
#anw-root .side-toggle{ display:inline-flex; align-items:center; gap:7px; background:var(--kb-surface,#fff); border:1px solid var(--line,#e2e3ee); border-radius:10px; padding:8px 14px; font-size:13.5px; font-weight:700; cursor:pointer; color:var(--primary-dark,#4f5bd5); transition:.12s; }
#anw-root .side-toggle:hover{ border-color:var(--primary,#6C5CE7); background:var(--primary-50,#eef0fb); }
/* Eingeklappt: Schülerliste weg -> Horaire über volle Breite */
#anw-root .layout.side-collapsed .sidebar{ display:none; }
#anw-root .layout.side-collapsed .wk-grid-large table{ min-width:0; }
#anw-root .layout.side-collapsed .wk-grid thead th{ min-width:150px; }
#anw-root .layout.side-collapsed .wk-grid .wcell{ min-height:90px; }
`;

var SHELL_BODY_TOP = `
<div class="kb-app" id="kb-app">
  <div class="kb-topbar">
    <button class="kb-burger" id="kb-burger" aria-label="Menü öffnen">☰</button>
    <div class="kb-topbrand"><span class="kb-logo">📓</span><span>Journal</span></div>
  </div>
  <button class="kb-reopen" id="kb-reopen" aria-label="Seitenleiste einblenden" title="Seitenleiste einblenden">☰</button>
  <aside class="kb-side" id="kb-side" aria-label="Hauptnavigation">
    <div class="kb-brand"><span class="kb-logo">📓</span><span class="kb-brandtext"><b>Journal</b><small id="kb-brand-team">CDSE</small></span><button class="kb-collapse" id="kb-collapse" aria-label="Seitenleiste einklappen" title="Seitenleiste einklappen">«</button></div>
    <button class="kb-userchip" id="kb-userchip" aria-label="Aktuelle Person — klicken zum Wechseln"></button>
    <div class="kb-yearbar" id="kb-yearbar"></div>
    <nav class="kb-nav">
      <button class="kb-link" data-kb-nav="meintag"><span class="kb-ic">🌤️</span>Mein Tag</button>
      <button class="kb-link" data-kb-nav="agenda"><span class="kb-ic">🗓️</span>Terminplan</button>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Betreuung</div>
        <button class="kb-link" data-kb-nav="students"><span class="kb-ic">👥</span>Meine Schüler</button>
        <button class="kb-link" data-kb-nav="search"><span class="kb-ic">🔎</span>Notizen suchen</button>
        <button class="kb-link" data-kb-nav="themes"><span class="kb-ic">🏷️</span>Themen-Analyse</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Im CDSE Hub</div>
        <button class="kb-link" data-kb-hub="toolbox"><span class="kb-ic">🧰</span>Toolbox</button>
        <button class="kb-link" data-kb-hub="screening"><span class="kb-ic">🔍</span>Screening</button>
        <button class="kb-link" data-kb-hub="lernen"><span class="kb-ic">📖</span>Lernen</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Export &amp; Daten</div>
        <button class="kb-link" data-kb-nav="export"><span class="kb-ic">📑</span>Dossier-PDF</button>
        <button class="kb-link" data-kb-nav="data"><span class="kb-ic">💾</span>Daten &amp; Backup</button>
      </div>
    </nav>
    <div class="kb-foot">Gespeichert in diesem Browser, verschlüsselt im Hub-Tresor und – falls verbunden – in der Team-Datei. Keine Cloud.</div>
  </aside>
  <div class="kb-scrim" id="kb-scrim"></div>
  <main class="kb-stage" id="kb-stage">
`;

var SHELL_PANELS_EXTRA = `
    <section class="kb-panel kb-pad" id="kb-data">
      <div class="kb-pagehead"><h2>💾 Daten & Backup</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Optionale gemeinsame Speicherung fürs Team, plus lokale Sicherung/Export.</p></div>
      <div class="kb-card" id="kb-sync-card">
        <h3 style="margin:0 0 6px;">🗄️ Gemeinsamer Speicher (Team-Datei auf O:\\)</h3>
        <p style="margin:0 0 10px;color:var(--kb-muted);">Eine gemeinsame Datei auf eurem Netzlaufwerk — alle Geräte schreiben hinein, Änderungen werden <b>pro Eintrag zusammengeführt</b> (nichts wird überschrieben). Nur in Chrome/Edge; jede Person verbindet die Datei einmal. Eine Person legt sie an, alle anderen wählen „Bestehende Datei öffnen".</p>
        <div id="kb-sync-status" class="kb-sync-status">…</div>
        <div id="kb-sync-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;"></div>
      </div>
      <div class="kb-card">
        <h3 style="margin:0 0 6px;">🗂️ Komplett-Sicherung (empfohlen)</h3>
        <p style="margin:0 0 10px;color:var(--kb-muted);"><b>Alles in einer Datei</b> — Schüler, Notizen, Fortschritte &amp; Themen, ELDiB-Ziele, Terminplan, Schuljahre, Aufgaben, Screening und Helfernetz. Das ist die Sicherung, die du bei einem PC-Wechsel brauchst.</p>
        <div id="kb-bk-counts" class="kb-sync-status" style="margin-bottom:10px;">…</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="kb-btn kb-btn-primary" id="kb-bk-export">⬇️ Komplett-Sicherung herunterladen</button>
          <button class="kb-btn" id="kb-bk-pick">⬆️ Sicherung wiederherstellen …</button>
          <input type="file" id="kb-bk-file" accept="application/json,.json" style="display:none;">
        </div>
        <div id="kb-bk-msg" style="margin-top:10px;"></div>
      </div>
      <div class="kb-card"><h3 style="margin:0 0 6px;">📄 Nur Dossier (Schüler &amp; Notizen)</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Der schlanke Dossier-Export — kompatibel mit dem Klassebuch, enthält aber <b>keine</b> Ziele, Terminpläne oder Schuljahre.</p><button class="kb-btn" id="kb-data-dos">Dossier exportieren / importieren</button></div>
    </section>
  </main>
</div>
`;

var ROSTER_MODULE = `
window.KB_ROSTER=(function(){
  var LS='klassebuch_roster_v1';
  /* ISA-Journal: leere Schülerliste — jede/r legt die eigenen betreuten
     Schüler selbst an. */
  var SEED=[];
  function clone(o){var r={};for(var k in o){r[k]=o[k];}return r;}
  function loadList(){
    try{var raw=localStorage.getItem(LS);if(raw){var a=JSON.parse(raw);if(a){return a.map(clone);}}}catch(e){}
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
    asAnwesenheit:function(){return list.map(function(s){return {id:s.id,name:s.name,klasse:s.klasse||'',level:s.level||'L1',zyklus:s.zyklus||''};});},
    asDossier:function(){return list.map(function(s){return {id:s.id,name:s.name,anonLabel:s.anonLabel||'',active:s.active!==false,createdAt:s.createdAt||''};});},
    add:function(name,klasse,level,zyklus){var id=newId();list.push({id:id,name:String(name||'').trim(),anonLabel:'',klasse:klasse||'',level:level||'L1',zyklus:zyklus||'ES',active:true,createdAt:new Date().toISOString()});notify();return id;},
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
    var sid=student.id; var meta=[]; var kl=rosterKlasse(sid); if(kl){meta.push(escapeHtml(kl));}
    var _rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null; if(_rep&&_rep.type){meta.push(escapeHtml(_rep.type));}
    if(!meta.length){meta.push('betreut');}
    var tabs=[['uebersicht','Übersicht'],['notizen','Notizen'],['fortschritt','Fortschritt & Ziele'],['dossier','Dossier'],['screening','Screening'],['helfernetz','Helfernetz']];
    var tb=tabs.map(function(t){var r='#/student/'+encodeURIComponent(sid)+'?hub='+t[0];return '<a class="kb-hub-tab'+(t[0]===tab?' active':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(t[1])+'</a>';}).join('');
    var initial=escapeHtml((student.name||'?').charAt(0).toUpperCase());
    return '<div class="kb-hub-head">'+
      '<a class="kb-hub-back" href="#/dashboard" data-route="#/dashboard">← Meine Schüler</a>'+
      '<div class="kb-hub-id"><div class="kb-hub-avatar">'+initial+'</div><div><div class="kb-hub-name">'+escapeHtml(student.name)+'</div><div class="kb-hub-meta">'+meta.join(' · ')+'</div></div>'+
        (function(){var z={};try{z=JSON.parse(localStorage.getItem('cdse-kb-zuordnung')||'{}')||{};}catch(e){}var hid=z.journal&&z.journal[sid];
          return hid?'<button class="btn btn-sm kb-hub-dossier" type="button" data-kb-hub="schueler" data-kb-hub-zusatz="/'+escapeAttr(encodeURIComponent(hid))+'" title="Das verschlüsselte Dossier dieses Kindes im CDSE Hub öffnen">📂 Dossier im Hub</button>':'';})()+
      '</div>'+
      '<div class="kb-hub-tabs">'+tb+'</div></div>';
  }
  function isaNoteRoute(sid){var ret=encodeURIComponent('#/student/'+encodeURIComponent(sid)+'?hub=notizen');return '#/entry/new/'+encodeURIComponent(sid)+'?return='+ret;}
  /* Strukturierte Notiz rendern: Leitfragen-Zeilen ("— Frage") fett hervorheben */
  function isaNoteBody(text){
    return String(text||'').split('\\n').map(function(ln){
      if(ln.indexOf('— ')===0){return '<span class="isa-nq">'+highlightThemesHtml(ln.slice(2))+'</span>';}
      return highlightThemesHtml(ln);
    }).join('<br>');
  }
  function hubOverview(student){
    var sid=student.id;
    var entries=Repo.entriesForStudent(sid).slice().sort(function(a,b){return a.date<b.date?1:-1;});
    var last=entries[0];
    var rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null;
    var cg=window.KB_REPORTS?window.KB_REPORTS.currentGoals(sid):null;
    var impBtn='<button class="btn btn-sm" data-route="#/report-import?student='+encodeURIComponent(sid)+'">📄 DS/PEI importieren</button>';
    var newNoteBtn='<button class="btn btn-primary" data-kb-act="new-note" data-kb-arg="'+escapeAttr(sid)+'">✍️ Neue Notiz</button>';
    var DM={V:{l:'Verhalten',c:'#c0562d'},K:{l:'Kommunikation',c:'#2f6fb0'},SOZ:{l:'Sozialisation',c:'#3a8a5f'},KOG:{l:'Kognition',c:'#7a52b3'}};

    function mh(ic,t,c){return '<h4><span class="mi mi-'+(c||'a')+'">'+ic+'</span><span class="mt">'+t+'</span></h4>';}
    function tile(v,l,cls,ic){return '<div class="kb-stat-tile'+(cls?(' kt-'+cls):'')+'"><div class="kt-ic">'+(ic||'')+'</div><div class="kt-b"><div class="v">'+v+'</div><div class="l">'+escapeHtml(l)+'</div></div></div>';}
    var scr=window.KB_SCREENING?window.KB_SCREENING.result(sid):null;
    var scrAcute=scr&&scr.acute&&scr.acute.length;
    var scrTile=scrAcute?tile('Krise','Screening','warn','🚨'):((scr&&scr.hasData)?((scr.risiken&&scr.risiken.length)?tile('Risiko','Screening','warn','🧠'):tile('erfasst','Screening','ok','🧠')):tile('—','Screening','','🧠'));
    var stripHtml='<div class="kb-statstrip">'+tile(entries.length,'Notizen','','🗒️')+tile((cg&&cg.goals?cg.goals.length:0),'Förderziele','','🎯')+tile((last?formatDate(last.date):'—'),'Letzte Notiz','','🕒')+scrTile+'</div>';

    /* ---- Schüler ohne Daten: klare Erste-Schritte statt leerer Karten ---- */
    var hasAny=(scr&&scr.hasData)||(cg&&cg.goals&&cg.goals.length)||entries.length;
    if(!hasAny){
      return stripHtml+'<div class="hub-empty"><div class="hub-empty-ic">🚀</div><h3>Noch nichts erfasst für '+escapeHtml(student.name)+'</h3><p>Leg los — deine Notizen, Ziele und Screenings sammeln sich danach automatisch hier.</p><div class="hub-empty-actions">'+newNoteBtn+impBtn+'<button class="btn" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">🧠 Screening</button></div></div>';
    }

    /* ---- Screening bewusst zurückhaltend: nur Akut-Krise als schlanke Sicherheits-
           zeile sichtbar; das Ergebnis selbst lebt kompakt in der Seitenspalte. ---- */
    var acuteLine = scrAcute ? '<div class="hub-acute"><span>🚨 Akute Krise laut Screening — Sicherheit hat Vorrang.</span><a class="btn btn-sm" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Ansehen</a></div>' : '';
    var scrVal, scrAct;
    if(scr&&scr.hasData){
      scrVal = scrAcute ? '🚨 Krise' : ((scr.risiken&&scr.risiken.length) ? 'Risiko-Hinweis' : 'erfasst');
      scrAct = '<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Öffnen</button>';
    } else {
      scrVal = '—';
      scrAct = '<button class="btn btn-sm ra" data-kb-hub="screening">Im Hub</button>';
    }

    /* ---- Förderziele ---- */
    var foerderCard;
    if(cg&&cg.goals&&cg.goals.length){
      var gl=cg.goals.slice(0,5).map(function(g){
        var dm=DM[g.domain]||{l:g.domain,c:'#777'};
        var code=g.code||'';
        var elbl=''; try{ if(code&&window.KB_TAXONOMY&&window.KB_TAXONOMY.eldibGoalLabels){elbl=window.KB_TAXONOMY.eldibGoalLabels[code]||'';} }catch(_e){}
        var badge=code?('<span class="hub-gcode" style="background:'+dm.c+'" title="ELDiB '+escapeAttr((dm.l||'')+(elbl?' · '+elbl:''))+'">'+escapeHtml(code)+'</span>'):('<span class="hub-dot" style="background:'+dm.c+'"></span>');
        var head=elbl?'<span class="hub-gelbl">'+escapeHtml(elbl)+'</span> ':'';
        var btn=window.KB_MATERIALS?'<button class="hub-mat" data-mat-goal="'+escapeAttr(code)+'" data-mat-goaltext="'+escapeAttr(g.formulation||g.title||'')+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(elbl||g.title||g.formulation||code)+'" title="Passende Arbeitsblätter finden">📄 Arbeitsblätter</button>':'';
        var _fmt=g.formulation||g.title||'';
        var _txt=(_fmt&&_fmt!==elbl)?escapeHtml(_fmt):(elbl?'':escapeHtml(code||'Ziel'));
        return '<li>'+badge+'<span class="hub-gtext">'+head+_txt+'</span>'+btn+'</li>';
      }).join('');
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele <span class="hub-count">'+cg.goals.length+'</span>','g')+'<ul class="hub-list">'+gl+'</ul>'+(cg.goals.length>5?'<div class="muted" style="font-size:.8em;margin-top:4px;">+'+(cg.goals.length-5)+' weitere</div>':'')+'</div>';
    } else {
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele','g')+'<p class="muted">Noch keine hinterlegt.</p><div class="kb-btn-row">'+impBtn+'</div></div>';
    }

    /* ---- Thematiken aus den Notizen -> Arbeitsblätter ---- */
    var themeCard='';
    try{
      if(window.KB_MATERIALS){
        var txtParts=[]; entries.forEach(function(e){if(e.text)txtParts.push(e.text);});
        var det=(typeof analyzeText==='function')?analyzeText(txtParts.join('  ')):[];
        var picks=[],seenK={};
        for(var ti=0;ti<det.length;ti++){var tkk=det[ti];if(window.KB_MATERIALS.themeMatchable(tkk.key)&&!seenK[tkk.key]){seenK[tkk.key]=1;picks.push(tkk);}if(picks.length>=6)break;}
        if(picks.length){
          var chips=picks.map(function(t){return '<button class="hub-theme-chip sev-'+t.severity+'" data-mat-theme="'+escapeAttr(t.key)+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(t.key)+'" title="Arbeitsblätter zu „'+escapeAttr(t.key)+'“">'+escapeHtml(t.key)+' <span class="ht-n">'+t.count+'×</span></button>';}).join('');
          themeCard='<div class="card kb-mini">'+mh('🏷️','Thematiken → Arbeitsblätter','a')+'<p class="muted" style="font-size:.82em;margin:-2px 0 9px;">Aus deinen Notizen erkannt — ein Klick öffnet passende Arbeitsblätter.</p><div class="hub-theme-wrap">'+chips+'</div></div>';
        }
      }
    }catch(_te){}

    /* ---- Letzte Notizen (Hauptbereich) ---- */
    var notesCard;
    if(entries.length){
      var nrows=entries.slice(0,3).map(function(e){
        return '<div class="isa-note-mini"><div class="isa-note-mini-h"><span class="isa-cat">'+escapeHtml(e.category||'Notiz')+'</span><span class="muted">'+escapeHtml(formatDate(e.date))+(e.author?' · ✍ '+escapeHtml(e.author):'')+'</span></div><div class="entry-body hub-clamp">'+highlightThemesHtml(e.text||'')+'</div></div>';
      }).join('');
      notesCard='<div class="card kb-mini">'+mh('🗒️','Letzte Notizen','a')+nrows+'<div class="kb-btn-row" style="margin-top:10px;"><a class="btn btn-sm" href="#/student/'+encodeURIComponent(sid)+'?hub=notizen" data-route="#/student/'+encodeURIComponent(sid)+'?hub=notizen">Alle Notizen →</a></div></div>';
    } else {
      notesCard='<div class="card kb-mini">'+mh('🗒️','Notizen','a')+'<p class="muted">Noch keine Notiz.</p><div class="kb-btn-row">'+newNoteBtn+'</div></div>';
    }

    /* ---- Seitenspalte: kompakte Info-Zeilen ---- */
    function row(ic,l,v,act){return '<div class="hub-row"><span class="ri">'+ic+'</span><div class="rb"><div class="rl">'+l+'</div>'+(v?'<div class="rv">'+v+'</div>':'')+'</div>'+(act||'')+'</div>';}
    var sideRows='';
    sideRows+=row('✍️','Notizen',(entries.length?entries.length+' erfasst':'keine'),'<a class="btn btn-sm ra" href="#/student/'+encodeURIComponent(sid)+'?hub=notizen" data-route="#/student/'+encodeURIComponent(sid)+'?hub=notizen">Öffnen</a>');
    sideRows+=row('🩺','Diagnostik',(rep?escapeHtml((rep.type||'Bericht')+' · '+formatDate(rep.date)):'kein DS/PEI'),(rep?'<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=dossier">Dossier</button>':impBtn));
    sideRows+=row('🧠','Screening',scrVal,scrAct);
    sideRows+=row('🕸️','Helfernetz','Support-Netz','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=helfernetz">Öffnen</button>');
    var sideCard='<div class="card hub-side-card">'+sideRows+'</div>';

    return stripHtml+acuteLine+'<div class="hub-quickbar">'+newNoteBtn+'</div><div class="hub2"><div class="hub2-main">'+foerderCard+themeCard+notesCard+'</div><aside class="hub2-side">'+sideCard+'</aside></div>';
  }
  function hubVerlauf(student){
    var sid=student.id;
    var q=(typeof parseHash==='function')?(parseHash().query||{}):{};
    var vf=q.vf||'all';
    var items=[];
    (Repo.entriesForStudent?Repo.entriesForStudent(sid):[]).forEach(function(e){
      var isReu=(e.category==='Team-Réunion');
      items.push({date:e.date,type:isReu?'reunion':'entry',icon:isReu?'🗣️':'🗒️',title:isReu?'Réunion-Beitrag':escapeHtml(e.category||'Eintrag'),author:(e.author||''),body:'<div class="entry-body">'+highlightThemesHtml(e.text||'')+'</div>'});
    });
    (Repo.listReunions?Repo.listReunions():[]).forEach(function(r){
      var g=(r.goals&&r.goals[sid])||[]; if(g.length){items.push({date:r.date,type:'goal',icon:'📌',title:'Wochenziel(e)',body:'<ul class="tl-goals">'+window.kbZiele(g).map(zielLi).join('')+'</ul>'});}
    });
    if(window.KB_ANW&&window.KB_ANW.recentForStudent){try{window.KB_ANW.recentForStudent(sid,40).forEach(function(e){items.push({date:e.date,type:'absence',icon:'📉',title:'Absenz · '+escapeHtml(window.KB_ANW.statusLabel?window.KB_ANW.statusLabel(e.status):(e.status||'')),body:escapeHtml(e.subject||'')});});}catch(_){}}
    /* Frühere Screenings: nur Datum, Zahl der Beobachtungen und Krisenhinweis – keine Verdachtsachsen */
    if(window.KB_SCREENING&&window.KB_SCREENING.history){window.KB_SCREENING.history(sid).forEach(function(s){
      var b=(s.acute?'<span class="sv-risk" style="background:var(--kb-danger);color:#fff;">🚨 Krisenhinweis</span> ':'')+
        '<div class="tl-scr">'+(s.symCount|0)+' Beobachtung'+((s.symCount|0)===1?'':'en')+' angekreuzt (früheres Screening, Einzelheiten im Reiter „Screening“)</div>';
      items.push({date:s.date,type:'screening',icon:'🧠',title:'Screening (früher)',body:b});
    });}
    var rep=window.KB_REPORTS?window.KB_REPORTS.summary(sid):null; if(rep&&rep.date){items.push({date:rep.date,type:'report',icon:'🩺',title:escapeHtml(rep.type||'Diagnostischer Bericht'),body:'Bericht im Dossier hinterlegt.'});}
    items.sort(function(a,b){return (a.date<b.date)?1:(a.date>b.date?-1:0);});
    var counts={}; items.forEach(function(it){counts[it.type]=(counts[it.type]||0)+1;});
    var defs=[['all','Alles',items.length],['screening','Screening',counts.screening||0],['entry','Einträge',counts.entry||0],['reunion','Réunion',counts.reunion||0],['goal','Ziele',counts.goal||0],['absence','Absenzen',counts.absence||0]];
    var chips=defs.filter(function(dd){return dd[0]==='all'||dd[2];}).map(function(dd){var r='#/student/'+encodeURIComponent(sid)+'?hub=verlauf&vf='+dd[0];return '<a class="tl-chip'+(vf===dd[0]?' is-on':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(dd[1])+' <span>'+dd[2]+'</span></a>';}).join('');
    var filtered=(vf==='all')?items:items.filter(function(it){return it.type===vf;});
    var body;
    if(!filtered.length){body='<div class="empty-state">'+(items.length?'Nichts in diesem Filter.':'Noch keine Aktivitäten — Einträge, Screenings, Absenzen und Ziele sammeln sich hier automatisch.')+'</div>';}
    else{
      body='<div class="tl">'+filtered.map(function(it){
        return '<div class="tl-item tl-'+it.type+'"><div class="tl-ic">'+it.icon+'</div><div class="tl-c"><div class="tl-h"><span class="tl-t">'+it.title+(it.author?' <span class="tl-author">✍ '+escapeHtml(it.author)+'</span>':'')+'</span><span class="tl-d">'+escapeHtml(formatDate(it.date))+'</span></div><div class="tl-b">'+it.body+'</div></div></div>';
      }).join('')+'</div>';
    }
    return '<div class="kb-hub-pad"><div class="tl-filters">'+chips+'</div>'+body+'</div>';
  }
  function hubNotizen(student){
    var sid=student.id;
    var entries=Repo.entriesForStudent(sid).slice().sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:((a.createdAt||'')<(b.createdAt||'')?1:-1));});
    var q=(typeof parseHash==='function')?(parseHash().query||{}):{};
    var cf=q.cf||'all';
    var head='<div class="isa-notes-head"><button class="btn btn-primary" data-kb-act="new-note" data-kb-arg="'+escapeAttr(sid)+'">✍️ Neue Notiz</button></div>';
    if(!entries.length){
      return '<div class="kb-hub-pad">'+head+'<div class="empty-state">Noch keine Notizen zu '+escapeHtml(student.name)+'. Halte hier Beobachtungen, Gespräche und Vereinbarungen fest — jede Notiz wird mit Datum, Kategorie und deinem Namen gespeichert.</div></div>';
    }
    /* Kategorie-Filter aus vorhandenen Notizen */
    var catCount={}; entries.forEach(function(e){var c=e.category||'Notiz';catCount[c]=(catCount[c]||0)+1;});
    var cats=Object.keys(catCount).sort();
    var chips='<a class="tl-chip'+(cf==='all'?' is-on':'')+'" href="#/student/'+encodeURIComponent(sid)+'?hub=notizen&cf=all" data-route="#/student/'+encodeURIComponent(sid)+'?hub=notizen&cf=all">Alle <span>'+entries.length+'</span></a>';
    chips+=cats.map(function(c){var r='#/student/'+encodeURIComponent(sid)+'?hub=notizen&cf='+encodeURIComponent(c);return '<a class="tl-chip'+(cf===c?' is-on':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(c)+' <span>'+catCount[c]+'</span></a>';}).join('');
    var filtered=(cf==='all')?entries:entries.filter(function(e){return (e.category||'Notiz')===cf;});
    var ret=encodeURIComponent('#/student/'+encodeURIComponent(sid)+'?hub=notizen');
    var cards=filtered.map(function(e){
      var editRoute='#/entry/'+encodeURIComponent(e.id)+'/edit?return='+ret;
      var tags=(e.tags&&e.tags.length)?'<div class="isa-note-tags">'+e.tags.map(function(t){return '<span class="isa-tag">'+escapeHtml(t)+'</span>';}).join('')+'</div>':'';
      return '<div class="isa-note-card">'+
        '<div class="isa-note-top"><span class="isa-cat">'+escapeHtml(e.category||'Notiz')+'</span>'+
          '<span class="isa-note-meta">'+escapeHtml(formatDate(e.date))+(e.author?' · <span class="reunion-author">✍ '+escapeHtml(e.author)+'</span>':'')+'</span>'+
          '<a class="isa-note-edit" href="'+editRoute+'" data-route="'+editRoute+'" title="Notiz bearbeiten">✎</a></div>'+
        '<div class="entry-body isa-note-text">'+isaNoteBody(e.text)+'</div>'+tags+'</div>';
    }).join('');
    return '<div class="kb-hub-pad">'+head+'<div class="tl-filters">'+chips+'</div>'+(cards||'<div class="empty-state">Keine Notiz in diesem Filter.</div>')+'</div>';
  }
  /* ---- Fortschritt & Ziele (PEI-Bausteine) + Vorschläge ---- */
  function eldibDomColor(code){
    var dom=String(code||'').split('-')[0];
    try{if(window.KB_TAXONOMY&&window.KB_TAXONOMY.eldibDomains&&window.KB_TAXONOMY.eldibDomains[dom])return window.KB_TAXONOMY.eldibDomains[dom].color;}catch(e){}
    return ({V:'#2f5597',K:'#548235',SOZ:'#bf8f00',KOG:'#c55a11'})[dom]||'#64748b';
  }
  function eldibSection(sid){
    var goals=window.KB_GOALS?window.KB_GOALS.list(sid):[];
    var chips=goals.map(function(g){
      var col=eldibDomColor(g.code);
      var mat=window.KB_MATERIALS?'<button class="hub-mat" data-mat-goal="'+escapeAttr(g.code)+'" data-mat-goaltext="'+escapeAttr(g.label||'')+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(g.label||g.code)+'" title="Passende Arbeitsblätter finden">📄 Arbeitsblätter</button>':'';
      return '<div class="eldib-chip"><span class="eldib-code" style="background:'+col+'">'+escapeHtml(g.code)+'</span><span class="eldib-lbl">'+escapeHtml(g.label||'unbekannter Code')+'</span>'+mat+'<button class="eldib-del" data-eldib-del="'+escapeAttr(g.id)+'" title="Entfernen">✕</button></div>';
    }).join('');
    var opts=''; try{ var lbls=(window.KB_TAXONOMY&&window.KB_TAXONOMY.eldibGoalLabels)||{}; opts=Object.keys(lbls).map(function(c){return '<option value="'+escapeAttr(c)+'">'+escapeHtml(c+' — '+lbls[c])+'</option>';}).join(''); }catch(e){}
    return '<div class="card eldib-card"><h3 class="home-h">🎯 PEI-Ziele (ELDiB)</h3>'+
      '<p class="muted" style="font-size:12.5px;margin:-4px 0 10px;">Ziel-Code direkt eingeben (z. B. <b>SOZ-33</b>) — die Bezeichnung erscheint automatisch und passende Arbeitsblätter gibt es dazu. So sind die Ziele erfasst, ohne den PEI hochladen zu müssen.</p>'+
      '<div class="eldib-add"><input class="kb-in" id="eldib-in" list="eldib-codes" autocomplete="off" placeholder="Code eingeben, z. B. SOZ-33 …"><button class="btn btn-sm btn-primary" id="eldib-addbtn">+ Ziel</button></div>'+
      '<div class="eldib-warn muted" id="eldib-warn" style="font-size:12px;margin-top:4px;"></div>'+
      (chips?'<div class="eldib-list">'+chips+'</div>':'<p class="muted" style="font-size:13px;margin-top:8px;">Noch keine Ziele erfasst.</p>')+
      '<datalist id="eldib-codes">'+opts+'</datalist></div>';
  }
  function hubFortschritt(student){
    var sid=student.id;
    var pei=window.KB_PEI?window.KB_PEI.list(sid):{progress:[],topics:[]};
    var suggestions=window.KB_SUGGEST?window.KB_SUGGEST.forStudent(sid):[];
    function itemRow(kind,it){
      return '<div class="pei-item'+(it.done?' is-done':'')+'"><label class="pei-check"><input type="checkbox" data-pei-toggle="'+escapeAttr(kind+'|'+it.id)+'"'+(it.done?' checked':'')+'></label>'+
        '<div class="pei-txt"><div>'+escapeHtml(it.text)+'</div><div class="pei-meta">'+escapeHtml(formatDate(it.date)||'')+(it.by?' · '+escapeHtml(it.by):'')+'</div></div>'+
        '<button class="pei-del" data-pei-del="'+escapeAttr(kind+'|'+it.id)+'" title="Löschen">✕</button></div>';
    }
    function col(kind,ic,title,items,ph){
      var rows=items.length?items.map(function(it){return itemRow(kind,it);}).join(''):'<p class="muted" style="font-size:13px;margin:6px 2px;">Noch nichts erfasst.</p>';
      return '<div class="card pei-col"><h3 class="home-h">'+ic+' '+title+'</h3>'+
        '<div class="pei-add"><input class="kb-in" data-pei-add="'+kind+'" placeholder="'+ph+'"><button class="btn btn-sm btn-primary" data-pei-addbtn="'+kind+'">+</button></div>'+
        '<div class="pei-list">'+rows+'</div></div>';
    }
    var sugHtml='';
    if(suggestions.length){
      sugHtml='<div class="card pei-sug"><h3 class="home-h">💡 Vorschläge <span class="muted" style="font-weight:600;font-size:.8em;">aus deinen Notizen</span></h3>'+
        '<p class="muted" style="font-size:12.5px;margin:-4px 0 12px;">Automatisch aus deinen Notizen erkannt und professionell formuliert — übernimm, was passt.</p>'+
        suggestions.map(function(s){
          return '<div class="pei-sug-card"><div class="pei-sug-lbl">'+escapeHtml(s.label)+' <span class="pei-sug-n">'+s.count+'×</span> <button class="pei-sug-x" data-sug-dis="'+escapeAttr(s.key)+'">verwerfen</button></div>'+
            '<div class="pei-sug-opt"><span class="pei-sug-txt">✅ '+escapeHtml(s.progress)+'</span><button class="btn btn-sm" data-sug-acc="'+escapeAttr('progress|'+s.key)+'">übernehmen</button></div>'+
            '<div class="pei-sug-opt"><span class="pei-sug-txt">🎯 '+escapeHtml(s.topic)+'</span><button class="btn btn-sm" data-sug-acc="'+escapeAttr('topics|'+s.key)+'">übernehmen</button></div></div>';
        }).join('')+'</div>';
    }
    return '<div class="kb-hub-pad"><p class="pei-intro">PEI-Ziele, kleine Fortschritte und anzugehende Themen an einem Ort — sie bilden nach und nach die Grundlage fürs PEI, damit nichts vergessen geht.</p>'+
      eldibSection(sid)+
      '<div class="pei-grid">'+col('progress','✅','Fortschritte',pei.progress,'Kleinen Fortschritt notieren …')+col('topics','🎯','Anzugehende Themen',pei.topics,'Thema / Ziel notieren …')+'</div>'+sugHtml+'</div>';
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
    var sid=student.id, S=window.KB_SCREENING, d=S?S.get(sid):null, akut=S?S.acuteFlags(sid):[];
    var kopf='<div class="kb-scr-hinweis"><h3>Das Screening ist in den CDSE Hub umgezogen</h3>'+
      '<p>Dort gibt es einen Beobachtungsbogen mit Stärken, Auswirkungen im Alltag und nächsten Schritten – ohne Verdachtsdiagnosen. Frühere Angaben aus dem Klassenbuch übernimmt der Hub in der Screening-Übersicht ins Dossier; hier bleiben sie zum Nachlesen.</p>'+
      '<button class="btn btn-primary btn-sm" data-kb-hub="screening">Screening im Hub öffnen</button></div>';
    if(!d||(!d.symptome.length&&!d.history.length)){return '<div class="kb-hub-pad">'+kopf+'<div class="empty-state">Im Klassenbuch wurde für '+escapeHtml(student.name)+' kein Screening erfasst.</div></div>';}
    return '<div class="kb-hub-pad">'+kopf+
      (akut.length?'<div class="hub-acute"><span>🚨 Frühere Angabe im Screening: '+akut.map(function(a){return escapeHtml(a.label);}).join(' · ')+' – bitte klären, ob das bekannt ist und begleitet wird.</span></div>':'')+
      '<div class="kb-scr-alt" id="kb-scr-alt" data-sid="'+escapeAttr(sid)+'"><h4>Frühere Beobachtungen</h4><p class="kb-scr-sub">Wird geladen …</p></div></div>';
  }
  /* ---- Noten & Module (pro Schüler/Fach) ---- */
  function hubNoten(student){
    var sid=student.id;
    if(!window.KB_NOTEN){return '<div class="kb-hub-pad"><div class="empty-state">Noten-Modul nicht geladen.</div></div>';}
    var N=window.KB_NOTEN;
    var lvl=(typeof rosterLevel==='function')?rosterLevel(sid):'L1';
    var subjects=(window.KB_ANW&&window.KB_ANW.subjectsForLevel)?window.KB_ANW.subjectsForLevel(lvl):[];
    N.list(sid,null,null).forEach(function(g){if(g.subject&&subjects.indexOf(g.subject)<0)subjects.push(g.subject);});
    var mode=N.getMode(sid), periods=N.periodsFor(mode);
    var PLABEL={S1:'1. Semester',S2:'2. Semester',T1:'1. Trimester',T2:'2. Trimester',T3:'3. Trimester'};
    var q=(typeof parseHash==='function')?(parseHash().query||{}):{};
    var per=q.np||periods[0]; if(periods.indexOf(per)<0)per=periods[0];
    function isAcademic(s){s=(s||'').toLowerCase();var bad=['fit for life','skills','atelier','sport','option','init','hausaufgaben','llis','morning','paus'];for(var i=0;i<bad.length;i++){if(s.indexOf(bad[i])>=0)return false;}return true;}
    function nfn(x){return (Math.round(x*10)/10).toString().replace('.',',');}
    function chip60(v){return '<span class="note-60 '+(v>=30?'note-ok':'note-low')+'">'+nfn(v)+'<small>/60</small></span>';}
    var acadSubs=subjects.filter(isAcademic);

    var modeBtns='<div class="note-mode"><span class="note-mode-lbl">Einteilung:</span>'+['semester','trimester'].map(function(m){return '<button class="note-mode-btn'+(mode===m?' on':'')+'" data-noten-mode="'+m+'" data-sid="'+escapeAttr(sid)+'">'+(m==='semester'?'Semester':'Trimester')+'</button>';}).join('')+'</div>';
    var perTabs='<div class="note-pertabs">'+periods.map(function(p){var r='#/student/'+encodeURIComponent(sid)+'?hub=noten&np='+p;return '<a class="note-pertab'+(p===per?' on':'')+'" href="'+r+'" data-route="'+r+'">'+escapeHtml(PLABEL[p]||p)+'</a>';}).join('')+'</div>';

    var openIdx=parseInt(q.nf,10); if(isNaN(openIdx))openIdx=-1;
    var cards='';
    subjects.forEach(function(su,si){
      var acad=isAcademic(su), gs=N.list(sid,su,per), avg=N.subjectAvg(sid,su,per);
      var open=(si===openIdx);
      var m=acad?N.moduleOf(sid,su):null;
      var headRoute='#/student/'+encodeURIComponent(sid)+'?hub=noten&np='+per+'&nf='+(open?'':si);
      var badge=(acad&&m.done>0)?'<span class="note-modbadge">📦 Modul '+(m.done+1)+'</span>':'';
      var head='<a class="note-card-head" href="'+headRoute+'" data-route="'+headRoute+'"><span class="note-caret">'+(open?'▾':'▸')+'</span><h4>'+escapeHtml(su)+(acad?'':' <span class="note-na-tag">kein Modulfach</span>')+'</h4>'+badge+(gs.length?'<span class="note-cnt">'+gs.length+'</span>':'')+(avg!=null?'<span class="note-avg">Ø '+chip60(avg)+'</span>':'<span class="note-avg muted">—</span>')+'</a>';
      var body='';
      if(open){
        var modHtml='';
        if(acad){
          var top=Math.max(m.cap,m.done+2), chips='';
          for(var k=1;k<=top;k++){var st=k<=m.done?'done':(k===m.done+1?'current':'future');chips+='<button class="mod-chip mod-'+st+'" data-mod-set="'+k+'" data-subj="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" title="Modul '+k+(k<=m.done?' – erreicht (Klick = zurücksetzen)':' als erreicht markieren')+'">'+k+'</button>';}
          modHtml='<div class="mod-track"><div class="mod-track-head"><span class="mod-status">'+(m.done>0?('📦 Modul '+m.done+' erreicht · arbeitet an <b>Modul '+(m.done+1)+'</b>'):'📦 arbeitet an <b>Modul 1</b>')+'</span></div><div class="mod-chips">'+chips+'<button class="mod-more" data-mod-more="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" title="Mehr Module anzeigen">+</button></div></div>';
        }
        var rows=gs.map(function(g){return '<div class="note-row"><span class="note-row-lbl">'+(g.label?escapeHtml(g.label):'<span class="muted">Note</span>')+'</span><span class="note-raw">'+nfn(g.points)+' / '+nfn(g.max)+'</span><span class="note-arrow">→</span>'+chip60(N.norm(g))+'<button class="note-del" data-noten-del="'+g.id+'" data-sid="'+escapeAttr(sid)+'" title="Löschen">🗑</button></div>';}).join('');
        body='<div class="note-card-body">'+modHtml+(rows?'<div class="note-rows">'+rows+'</div>':'')+'<div class="note-add"><input class="note-in note-in-lbl" type="text" placeholder="Bezeichnung (optional)" data-nf="label"><input class="note-in note-in-num" type="number" step="0.01" min="0" placeholder="erreicht" data-nf="points"><span class="note-of">von</span><input class="note-in note-in-num" type="number" step="0.01" min="1" value="60" data-nf="max"><button class="btn btn-sm btn-primary note-add-btn" data-noten-add="'+escapeAttr(su)+'" data-sid="'+escapeAttr(sid)+'" data-per="'+per+'">+ Note</button></div></div>';
      }
      cards+='<div class="note-card'+(acad?'':' note-card-na')+(open?' is-open':'')+'">'+head+body+'</div>';
    });
    if(!subjects.length){cards='<div class="empty-state">Keine Fächer im Stundenplan für Niveau '+escapeHtml(lvl)+'. Lege den Stundenplan unter „Klasse &amp; Stundenplan" an.</div>';}

    var overall=N.periodAvg(sid,per,subjects), totMod=N.totalModules(sid,acadSubs);
    var foot='<div class="note-foot"><div class="note-foot-item">📦 Module gesamt erreicht: <b>'+totMod+'</b></div>'+(overall!=null?'<div class="note-foot-item">📊 Gesamt-Ø '+escapeHtml(PLABEL[per]||per)+': '+chip60(overall)+'</div>':'')+'</div>';

    return '<div class="kb-hub-pad note-wrap"><div class="note-top">'+modeBtns+'</div>'+perTabs+'<p class="muted note-hint">Noten auf <b>/60</b> (bestanden ab 30) — „erreicht von" eingeben, Umrechnung läuft automatisch. Module je Schulfach anklicken; Gesamt zählt sich von selbst.</p>'+cards+foot+'</div>';
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
        else if(tab==='notizen'){sectionHtml=hubNotizen(student);}
        else if(tab==='fortschritt'){sectionHtml=hubFortschritt(student);}
        else if(tab==='screening'){sectionHtml=hubScreening(student);}
        else if(tab==='helfernetz'){sectionHtml=hubHelfernetz(student);}
        else {tab='uebersicht';sectionHtml=hubOverview(student);}
      }catch(err){sectionHtml='<div class="empty-state">Fehler im Hub-Bereich: '+escapeHtml((err&&err.message)||String(err))+'</div>';}
      return {
        navKey:'students',
        html: hubHeader(student,tab)+'<div class="kb-hub-body">'+sectionHtml+'</div>',
        afterRender: function(root){
        if(baseAfter){try{baseAfter(root);}catch(e){}}
        if(tab==='screening'&&window.KB_SCREENING&&window.KB_SCREENING.fuellen){try{window.KB_SCREENING.fuellen(root);}catch(e){}}
        if(tab==='helfernetz'&&window.KB_BUBBLE_WIRE){try{window.KB_BUBBLE_WIRE(root,student);}catch(e){}}
        if(tab==='fortschritt'&&window.KB_PEI){try{
          var sid2=student.id; var rr=function(){if(window.render){try{window.render();}catch(e){}}};
          function pair(v){var p=String(v||'').split('|');return {kind:p[0],id:p[1]};}
          root.querySelectorAll('[data-pei-addbtn]').forEach(function(b){b.addEventListener('click',function(){
            var kind=b.getAttribute('data-pei-addbtn');var inp=root.querySelector('[data-pei-add="'+kind+'"]');var v=inp?inp.value.trim():'';if(!v){if(inp)inp.focus();return;}window.KB_PEI.add(sid2,kind,v);rr();});});
          root.querySelectorAll('[data-pei-add]').forEach(function(inp){inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();var kind=inp.getAttribute('data-pei-add');var v=inp.value.trim();if(v){window.KB_PEI.add(sid2,kind,v);rr();}}});});
          root.querySelectorAll('[data-pei-toggle]').forEach(function(c){c.addEventListener('change',function(){var pr=pair(c.getAttribute('data-pei-toggle'));window.KB_PEI.toggle(sid2,pr.kind,pr.id);rr();});});
          root.querySelectorAll('[data-pei-del]').forEach(function(b){b.addEventListener('click',function(){var pr=pair(b.getAttribute('data-pei-del'));window.KB_PEI.remove(sid2,pr.kind,pr.id);rr();});});
          root.querySelectorAll('[data-sug-acc]').forEach(function(b){b.addEventListener('click',function(){
            var pr=pair(b.getAttribute('data-sug-acc'));var bank=(window.KB_SUGGEST&&window.KB_SUGGEST.bank)||[];var d=bank.filter(function(x){return x.key===pr.id;})[0];if(!d)return;
            window.KB_PEI.add(sid2,pr.kind,(pr.kind==='progress'?d.progress:d.topic),d.key);rr();});});
          root.querySelectorAll('[data-sug-dis]').forEach(function(b){b.addEventListener('click',function(){window.KB_PEI.dismiss(sid2,b.getAttribute('data-sug-dis'));rr();});});
          // ELDiB-Ziele manuell erfassen
          if(window.KB_GOALS){
            var gin=root.querySelector('#eldib-in'), gwarn=root.querySelector('#eldib-warn');
            function addGoal(){var v=gin?gin.value.trim():'';if(!v)return;var res=window.KB_GOALS.add(sid2,v);
              if(res&&res.err==='format'){if(gwarn)gwarn.textContent='Bitte einen Code wie „SOZ-33" eingeben.';return;}
              if(res&&res.err==='dup'){if(gwarn)gwarn.textContent=res.code+' ist bereits erfasst.';return;}
              rr();}
            var gbtn=root.querySelector('#eldib-addbtn');if(gbtn)gbtn.addEventListener('click',addGoal);
            if(gin)gin.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();addGoal();}});
            root.querySelectorAll('[data-eldib-del]').forEach(function(b){b.addEventListener('click',function(){window.KB_GOALS.remove(sid2,b.getAttribute('data-eldib-del'));rr();});});
          }
        }catch(e){}}
      }
      };
    };
  }

  /* Dashboard („Meine Schüler") um „+ Neuer Schüler" ergänzen */
  if(typeof viewDashboard!=='undefined'){
    var _origDash=viewDashboard;
    window.viewDashboard=function(){
      var r=_origDash.apply(this,arguments);
      /* in die Knopfleiste neben „+ Neuer Eintrag“ (vorher eigene Zeile darüber, Knöpfe versetzt) */
      var knopf='<button class="btn" data-kb-act="add-student">+ Neuer Schüler</button>';
      function rein(h){return h.indexOf('<div class="actions">')>=0?h.replace('<div class="actions">','<div class="actions">'+knopf):'<div class="isa-dash-add">'+knopf+'</div>'+h;}
      if(r&&typeof r==='object'&&typeof r.html==='string'){r.html=rein(r.html);return r;}
      if(typeof r==='string'){return rein(r);}
      return r;
    };
  }

  /* Wochenziele liegen je nach Ansicht als Text oder als {text,done} vor.
     Überall dieselbe Umwandlung – sonst erscheint „[object Object]“, und beim
     Aktualisieren wird der Zieltext überschrieben (Fehler H5). */
  window.kbZiele=function(arr){
    return (Array.isArray(arr)?arr:[]).map(function(g){
      var t=(g&&typeof g==='object')?String(g.text||''):String(g==null?'':g);
      if(t==='[object Object]'){t='⚠ Zieltext verloren (Fehler einer älteren Version) – in einer Tageskopie nachsehen';}
      return {text:t,done:!!(g&&typeof g==='object'&&g.done)};
    }).filter(function(g){return g.text.trim();});
  };
  function zielLi(g){return '<li'+(g.done?' class="kb-ziel-ok"':'')+'>'+(g.done?'✓ ':'')+escapeHtml(g.text)+'</li>';}
  window.KB_DOS_RECONCILE=function(){
    if(!window.KB_ROSTER){return;}
    var keep=window.KB_ROSTER.ids();
    Repo.students=(Repo.students||[]).filter(function(s){return keep[s.id];});
    /* Einträge von Kindern, die nicht (mehr) in der Liste stehen, bleiben erhalten (Fehler H7) */
    (Repo.reunions||[]).forEach(function(r){
      if(r&&Array.isArray(r.studentOrder)){r.studentOrder=r.studentOrder.filter(function(id){return keep[id];});}
    });
    try{
      if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){
        Storage.clear('students').then(function(){return Storage.putAll('students',Repo.students);}).catch(function(){});
        Storage.putAll('reunions',Repo.reunions).catch(function(){});
      }
    }catch(e){}
  };
  function kbDosPersist(store,arr){try{if(typeof Storage!=='undefined'&&Storage.clear&&Storage.putAll){Storage.clear(store).then(function(){return Storage.putAll(store,arr);}).catch(function(){});}}catch(e){}}
  window.KB_DOS_SYNC={
    /* Erst wenn das Dossier wirklich geladen ist, darf sein Schweigen als
       "nichts da" gelten - sonst loescht der Abgleich alles. */
    ready:function(){return !!Repo.ready;},
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
  var PANELS=['dos-root','kb-data','isa-home','isa-agenda'];
  /* Hub-Apps im selben Ordner bzw. den Hub selbst öffnen – in denselben
     benannten Tabs wie der Hub (ein Tab je App, kein Neuladen des Hubs) */
  var HUB_ZIELE={toolbox:['toolbox.html','cdse-toolbox'],lernen:['lernen.html','cdse-lernen'],screening:['../hub.html#/screening','cdse-hub'],hub:['../hub.html#/','cdse-hub'],schueler:['../hub.html#/schueler','cdse-hub']};
  function hubOpen(was,zusatz){var z=HUB_ZIELE[was];if(!z){return;}var w=window.open(z[0]+(zusatz||''),z[1]);if(w){try{w.focus();}catch(e){}}}
  window.__kbHub=hubOpen;
  document.addEventListener('click',function(ev){var el=ev.target.closest&&ev.target.closest('[data-kb-hub]');if(!el){return;}ev.preventDefault();hubOpen(el.getAttribute('data-kb-hub'),el.getAttribute('data-kb-hub-zusatz')||'');if(app.classList.contains('kb-open')){app.classList.remove('kb-open');}});
  var DOS_ROUTES={students:'#/dashboard',reunion:'#/reunion',orga:'#/orga',search:'#/search',themes:'#/themes',export:'#/export',ai:'#/ai-export'};
  var DOS_ROUTES={students:'#/dashboard',search:'#/search',themes:'#/themes',export:'#/export',ai:'#/ai-export'};
  function showPanel(id){for(var i=0;i<PANELS.length;i++){var el=$(PANELS[i]);if(el){el.classList.toggle('active',PANELS[i]===id);}}}
  function setActive(nav){var links=document.querySelectorAll('[data-kb-nav]');for(var i=0;i<links.length;i++){links[i].classList.toggle('active',links[i].getAttribute('data-kb-nav')===nav);}}
  function closeDrawer(){app.classList.remove('kb-open');}

  function go(nav){
    if(DOS_ROUTES[nav]){
      showPanel('dos-root'); setActive(nav);
      if(window.navigate){window.navigate(DOS_ROUTES[nav]);}
    } else if(nav==='meintag'){
      showPanel('isa-home'); setActive('meintag');
      if(window.KB_HOME){try{window.KB_HOME.render();}catch(e){}}
    } else if(nav==='agenda'){
      showPanel('isa-agenda'); setActive('agenda');
      if(window.KB_AGENDA){try{window.KB_AGENDA.render();}catch(e){}}
    } else if(nav==='data'){
      showPanel('kb-data'); setActive('data');
      try{renderBkCounts();}catch(e){}
    } else if(nav==='material'){
      hubOpen('toolbox');
    } else if(nav==='patho'){
      hubOpen('lernen');
    }
    closeDrawer();
  }
  window.__kbGo=go;

  // Seitenmenü
  var links=document.querySelectorAll('[data-kb-nav]');
  for(var i=0;i<links.length;i++){(function(l){l.addEventListener('click',function(){go(l.getAttribute('data-kb-nav'));});})(links[i]);}
  // "Mehr" ein-/ausklappen
  var moreT=$('kb-more-toggle'), moreBox=$('kb-more');
  if(moreT&&moreBox){moreT.addEventListener('click',function(){var open=moreBox.classList.toggle('open');moreT.classList.toggle('open',open);});}
  // Mobile-Schublade
  var burger=$('kb-burger'); if(burger){burger.addEventListener('click',function(){app.classList.toggle('kb-open');});}
  var scrim=$('kb-scrim'); if(scrim){scrim.addEventListener('click',closeDrawer);}
  // Desktop-Seitenleiste ein-/ausklappen (Zustand merken)
  function setCollapsed(on){app.classList.toggle('kb-collapsed',on);try{localStorage.setItem('kb_side_collapsed',on?'1':'0');}catch(e){}}
  try{if(localStorage.getItem('kb_side_collapsed')==='1')app.classList.add('kb-collapsed');}catch(e){}
  var collapseBtn=$('kb-collapse'); if(collapseBtn){collapseBtn.addEventListener('click',function(){setCollapsed(true);});}
  var reopenBtn=$('kb-reopen'); if(reopenBtn){reopenBtn.addEventListener('click',function(){setCollapsed(false);});}

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

  // Neuen Schüler anlegen (aus Dashboard / Mein Tag) und direkt öffnen
  function addStudentFlow(){
    if(!window.KB_ROSTER)return;
    var name=window.prompt('Name des/der neuen Schüler·in:');
    if(!name||!name.trim())return;
    var id=window.KB_ROSTER.add(name.trim(),'','','ES');
    showPanel('dos-root'); setActive('students');
    if(window.navigate){window.navigate('#/student/'+encodeURIComponent(id)+'?hub=uebersicht');}
  }
  window.__isaAddStudent=addStudentFlow;

  // Brücke Hub -> Shell-Aktionen
  document.addEventListener('click',function(ev){
    var el=ev.target.closest&&ev.target.closest('[data-kb-act]'); if(!el)return;
    var act=el.getAttribute('data-kb-act'), arg=el.getAttribute('data-kb-arg');
    if(act==='add-student'){ addStudentFlow(); }
    else if(act==='new-note'){ if(window.KB_NOTECOMPOSER){window.KB_NOTECOMPOSER.open(arg);} }
    else if(act==='go-students'){ go('students'); }
    else if(act==='open-notes'){ showPanel('dos-root'); setActive('students'); if(window.navigate){window.navigate('#/student/'+encodeURIComponent(arg)+'?hub=notizen');} }
    else if(act==='open-screening'){
      showPanel('dos-root'); setActive('students');
      if(window.navigate){window.navigate('#/student/'+encodeURIComponent(arg)+'?hub=screening');}
      closeDrawer();
    }
  });

  var dD=$('kb-data-dos'); if(dD){dD.addEventListener('click',function(){showPanel('dos-root');setActive('');if(window.navigate){window.navigate('#/backup');}closeDrawer();});}

  /* ---- Komplett-Sicherung (KB_BACKUP): alles in einer Datei ---- */
  function bkMsg(html,kind){
    var m=$('kb-bk-msg'); if(!m)return;
    var col=kind==='err'?'#b3432d':(kind==='ok'?'#1d8a52':'var(--kb-muted)');
    m.innerHTML=html?('<span style="color:'+col+';font-size:13px;">'+html+'</span>'):'';
  }
  function renderBkCounts(){
    var el=$('kb-bk-counts'); if(!el||!window.KB_BACKUP)return;
    var c=window.KB_BACKUP.counts();
    el.innerHTML='Aktuell auf diesem Gerät: <b>'+c.students+'</b> Schüler · <b>'+c.entries+'</b> Notizen · <b>'+c.pei+
      '</b> × Fortschritt/Themen · <b>'+c.goals+'</b> × ELDiB-Ziele · <b>'+c.agenda+'</b> Terminpläne · <b>'+c.years+
      '</b> Schuljahre · <b>'+c.screening+'</b> Screenings · <b>'+c.bubble+'</b> Helfernetz';
  }
  var bkExp=$('kb-bk-export');
  if(bkExp){bkExp.addEventListener('click',function(){
    try{var n=window.KB_BACKUP.download();bkMsg('✓ Sicherung erstellt: '+esc(n),'ok');}
    catch(e){bkMsg('Sicherung fehlgeschlagen: '+esc(String((e&&e.message)||e)),'err');}
  });}
  var bkPick=$('kb-bk-pick'), bkFile=$('kb-bk-file');
  if(bkPick&&bkFile){
    bkPick.addEventListener('click',function(){bkFile.click();});
    bkFile.addEventListener('change',function(){
      var f=bkFile.files&&bkFile.files[0]; if(!f)return;
      var rd=new FileReader();
      rd.onload=function(){
        var d;try{d=JSON.parse(rd.result);}catch(e){bkMsg('Datei konnte nicht gelesen werden.','err');bkFile.value='';return;}
        if(!window.KB_BACKUP.valid(d)){bkMsg('Das sieht nicht nach einer ISA-Journal-Komplett-Sicherung aus. (Ein reiner Dossier-Export gehört in die Karte darunter.)','err');bkFile.value='';return;}
        var dc=(d.dossier&&d.dossier.students?d.dossier.students.length:0);
        var when=d.exportedAt?(' vom '+String(d.exportedAt).slice(0,10)):'';
        var rep=confirm('Sicherung'+when+' mit '+dc+' Schülern wiederherstellen.\\n\\nOK = ERSETZEN (alles Aktuelle auf diesem Gerät wird verworfen)\\nAbbrechen = ZUSAMMENFÜHREN (Vorhandenes bleibt, Gleiches wird überschrieben)');
        bkMsg('Wird wiederhergestellt …');
        window.KB_BACKUP.restore(d,rep?'replace':'merge').then(function(){
          bkMsg('✓ Wiederhergestellt. Die App wird neu geladen …','ok');
          setTimeout(function(){location.reload();},900);
        }).catch(function(e){bkMsg('Fehlgeschlagen: '+esc(String((e&&e.message)||e)),'err');});
        bkFile.value='';
      };
      rd.readAsText(f);
    });
  }

  // Roster-Änderungen -> Dossier + Mein-Tag/Terminplan aktualisieren
  if(window.KB_ROSTER){
    window.KB_ROSTER.onChange(function(){
      if(window.render){try{window.render();}catch(e){}}
      if($('isa-home')&&$('isa-home').classList.contains('active')&&window.KB_HOME){try{window.KB_HOME.render();}catch(e){}}
    });
  }

  // Gemeinsamer Speicher (KB_SYNC) — Status + Aktionen
  function renderSync(){
    var st=$('kb-sync-status'),ac=$('kb-sync-actions'); if(!st||!ac||!window.KB_SYNC)return;
    var s=window.KB_SYNC.getStatus();
    if(!s.supported){st.innerHTML='<b style="color:#b3432d">Dieser Browser unterstützt die gemeinsame Datei nicht (z. B. Firefox).</b><br>Bitte die App in <b>Microsoft Edge</b> öffnen: Rechtsklick auf <i>index.html</i> → „Öffnen mit" → Microsoft Edge. Edge ist auf jedem Windows-PC vorinstalliert; eure Daten bleiben im Haus.';ac.innerHTML='';return;}
    var info;
    if(s.connected){info='<b style="color:#1d8a52">✓ Verbunden</b> · '+esc(s.fileName)+(s.lastSync?' · zuletzt '+new Date(s.lastSync).toLocaleTimeString():'')+(s.lastBy?' · zuletzt von '+esc(s.lastBy):'')+(s.pending?' · synchronisiert…':'')+(s.warten?' · <b style="color:#c9851f">wartet auf '+esc(s.warten)+'</b>':'');}
    else if(s.error==='reconnect'){info='<b style="color:#c9851f">Verbindung muss bestätigt werden</b> — der Browser setzt die Freigabe beim Neustart zurück. Die App fragt beim ersten Klick von selbst danach, sonst hier „Verbinden" ('+esc(s.fileName)+').';}
    else{info='Nicht verbunden — Daten liegen nur auf diesem Gerät.';}
    if(s.error&&s.error!=='reconnect'){info+='<br><span style="color:#b3432d">'+esc(s.error)+'</span>';}
    if(s.connected&&s.counts){var k=s.counts;info+='<div style="margin-top:6px;color:var(--kb-muted);font-size:12.5px;">In der gemeinsamen Datei: <b>'+(k.roster||0)+'</b> Schüler · <b>'+(k.dosEntries||0)+'</b> Notizen · <b>'+(k.pei||0)+'</b> × Fortschritt/Themen · <b>'+(k.goals||0)+'</b> × ELDiB-Ziele · <b>'+(k.agenda||0)+'</b> Terminpläne · <b>'+(k.screening||0)+'</b> Screenings · <b>'+(k.bubble||0)+'</b> Helfernetz</div>';}
    if(s.connected){
      var bk;
      if(s.backupName){bk='🗂️ Auto-Sicherung: Ordner <b>'+esc(s.backupName)+'</b> · letzte Kopie: '+(s.backupLast?esc(s.backupLast):'noch keine')+(s.backupErr==='reconnect'?' · <span style="color:#c9851f">bitte bestätigen</span>':'');}
      else{bk='🗂️ <b>Tägliche Auto-Sicherung</b> noch nicht eingerichtet — Ordner auf O: wählen, dann legt die App 1×/Tag automatisch eine datierte Kopie an (die letzten 30 bleiben erhalten).';}
      if(s.backupErr&&s.backupErr!=='reconnect'){bk+=' <span style="color:#b3432d">'+esc(s.backupErr)+'</span>';}
      info+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);color:var(--kb-muted);font-size:12.5px;">'+bk+'</div>';
    }
    if(s.fileName||s.connected){
      var an=!window.KB_SYNC.autoOn||window.KB_SYNC.autoOn();
      info+='<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);font-size:12.5px;\">'+
        '<label style=\"display:flex;gap:7px;align-items:flex-start;cursor:pointer;\">'+
        '<input type=\"checkbox\" id=\"kbs-auto\"'+(an?' checked':'')+' style=\"margin-top:2px;\">'+
        '<span>Beim Öffnen von selbst verbinden — die App fragt einmal beim ersten Klick nach der Datei, statt dass man jedes Mal hierher muss.</span>'+
        '</label></div>';
    }
    st.innerHTML=info;
    var au=$('kbs-auto');
    if(au)au.addEventListener('change',function(){window.KB_SYNC.setAuto(au.checked);});
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

  /* ============================================================
     Identität: „Wer arbeitet hier?" — erste Ansicht der App.
     Eigenständiger ISA-Speicher (kein Anwesenheits-Modul). Der gewählte
     Name wird automatisch Autor von Notizen. Team-Namen werden beim
     ersten „+ Andere Person" angelegt und danach angeboten.
     ============================================================ */
  var EXTRA_LS='klassebuch_extra_users';
  function extraUsers(){try{return JSON.parse(localStorage.getItem(EXTRA_LS)||'[]')||[];}catch(e){return [];}}
  function addExtraUser(u){var l=extraUsers();if(l.indexOf(u)<0){l.push(u);try{localStorage.setItem(EXTRA_LS,JSON.stringify(l));}catch(e){}}}
  function allUsers(){var seen={},out=[];extraUsers().forEach(function(u){if(u&&!seen[u]){seen[u]=1;out.push(u);}});return out;}
  function curUser(){try{return localStorage.getItem('anwesenheit_user')||'';}catch(e){return '';}}
  function setCurUser(u){try{localStorage.setItem('anwesenheit_user',u||'');}catch(e){}}
  function uIni(n){n=String(n||'?').trim();var p=n.split(/\\s+/);var a=(p[0]||'').charAt(0);var b=p.length>1?(p[p.length-1]||'').charAt(0):'';return (a+b).toUpperCase()||'?';}
  var AV=['#0f766e','#2563eb','#7c3aed','#c0562d','#3a8a5f','#b45309','#9d174d','#0e7490'];
  function uBg(n){n=String(n||'');var h=0;for(var i=0;i<n.length;i++){h=(h*31+n.charCodeAt(i))>>>0;}return AV[h%AV.length];}
  var userHooks=[];
  window.KB_USER={get:curUser,list:allUsers,set:function(u){pickUser(u);},onChange:function(fn){if(typeof fn==='function')userHooks.push(fn);}};

  var gate=null;
  function buildGate(){
    gate=document.createElement('div');gate.className='kb-gate';gate.id='kb-gate';
    gate.innerHTML='<div class="kb-gate-card"><div class="kb-gate-logo">📓</div><h2>Wer arbeitet hier?</h2><p>Wähle deinen Namen — er wird bei deinen Notizen automatisch als Autor gespeichert. Beim ersten Mal legst du deinen Namen über „+ Andere Person" an.</p><div class="kb-gate-grid" id="kb-gate-grid"></div><button class="kb-gate-other" id="kb-gate-other">+ Andere Person</button></div>';
    document.body.appendChild(gate);
    gate.addEventListener('click',function(e){
      var t=e.target.closest&&e.target.closest('[data-user]');
      if(t){pickUser(t.getAttribute('data-user'));return;}
      if(e.target.id==='kb-gate-other'){var n=window.prompt('Name der Person:');if(n&&n.trim()){var nm=n.trim();addExtraUser(nm);pickUser(nm);}return;}
    });
  }
  function renderGateGrid(){
    var g=$('kb-gate-grid');if(!g)return;var cur=curUser();
    g.innerHTML=allUsers().map(function(u){return '<button class="kb-gate-user'+(cur===u?' on':'')+'" data-user="'+esc(u)+'"><span class="kb-gate-av" style="background:'+uBg(u)+'">'+esc(uIni(u))+'</span><span>'+esc(u)+'</span></button>';}).join('');
  }
  function openGate(){if(!gate)buildGate();renderGateGrid();gate.classList.add('open');}
  function closeGate(){if(gate)gate.classList.remove('open');}
  function pickUser(u){setCurUser(u);addExtraUser(u);closeGate();updateUserChip();for(var i=0;i<userHooks.length;i++){try{userHooks[i](u);}catch(e){}}if(window.render){try{window.render();}catch(e){}}if($('isa-home')&&$('isa-home').classList.contains('active')&&window.KB_HOME){try{window.KB_HOME.render();}catch(e){}}}
  /* Angemeldet im CDSE Hub? Dann gilt diese Person – kein zweites „Wer arbeitet
     hier?“ und kein frei wählbarer Name. Der Hub legt sie beim Anmelden in
     'cdse-nutzer' ab und entfernt sie beim Abmelden. Ohne Hub (Datei einzeln
     geöffnet) bleibt die Personenwahl wie bisher. */
  function hubNutzer(){try{var n=JSON.parse(localStorage.getItem('cdse-nutzer')||'null');return (n&&n.name)?n:null;}catch(e){return null;}}
  function updateUserChip(){var c=$('kb-userchip');if(!c)return;var u=curUser(), hn=hubNutzer();
    if(u){c.innerHTML='<span class="kb-uc-av" style="background:'+uBg(u)+'">'+esc(uIni(u))+'</span><span class="kb-uc-n">'+esc(u)+'</span><span class="kb-uc-x">'+(hn?'Hub':'wechseln')+'</span>';
      c.title=hn?('Angemeldet im CDSE Hub als '+u+' – Person wechseln: im Hub abmelden und neu anmelden'):('Angemeldet als '+u+' — klicken zum Wechseln');}
    else{c.innerHTML='<span class="kb-uc-av">?</span><span class="kb-uc-n">Wer bist du?</span>';c.title='Person wählen';}
  }
  var ucBtn=$('kb-userchip'); if(ucBtn){ucBtn.addEventListener('click',function(){if(hubNutzer()){hubOpen('hub');}else{openGate();}});}
  function hubPersonUebernehmen(){var hn=hubNutzer();if(hn&&curUser()!==hn.name){pickUser(hn.name);}else{updateUserChip();}return !!hn;}
  if(!hubPersonUebernehmen()&&!curUser()){openGate();}
  window.addEventListener('storage',function(e){if(e.key==='cdse-nutzer'){hubPersonUebernehmen();teamZeigen();}});

  /* Team aus dem Hub: Name in der Seitenleiste und im Fenstertitel */
  function teamZeigen(){
    var hn=hubNutzer(), t=hn&&hn.team, name='';
    var liste=(window.CDSE_TEAMS||[]);for(var i=0;i<liste.length;i++){if(liste[i].id===t){name=liste[i].name;break;}}
    var el=$('kb-brand-team');if(el){el.textContent=name||'CDSE';}
    document.title='Journal · '+(name||'CDSE');
  }
  teamZeigen();

  /* ============================================================
     Schuljahre (KB_YEARS): Auswahl in der Seitenleiste + Verwaltung.
     Schüler/Notizen/Ziele bleiben durchgehend; nur der Terminplan
     wird pro Schuljahr geführt.
     ============================================================ */
  function refreshYearView(){
    // aktuelle Ansicht neu zeichnen (Terminplan hört selbst auf KB_YEARS)
    if($('isa-home')&&$('isa-home').classList.contains('active')&&window.KB_HOME){try{window.KB_HOME.render();}catch(e){}}
  }
  function renderYearBar(){
    var bar=$('kb-yearbar'); if(!bar||!window.KB_YEARS)return;
    var years=window.KB_YEARS.list(), act=window.KB_YEARS.active();
    var opts=years.map(function(y){return '<option value="'+esc(y.id)+'"'+(y.id===act?' selected':'')+'>'+esc(y.label)+(y.closed?' (abgeschlossen)':'')+'</option>';}).join('');
    bar.innerHTML='<span class="kb-yl">🎓 Schuljahr</span>'+
      '<div class="kb-yrow"><select class="kb-ysel" id="kb-yearsel" aria-label="Schuljahr wählen">'+opts+'</select>'+
      '<button class="kb-ymgr" id="kb-yearmgr" title="Schuljahre verwalten" aria-label="Schuljahre verwalten">⋯</button></div>';
    var sel=$('kb-yearsel'); if(sel){sel.addEventListener('change',function(){window.KB_YEARS.setActive(sel.value);});}
    var mgr=$('kb-yearmgr'); if(mgr){mgr.addEventListener('click',openYearMgr);}
  }
  var yearMgr=null;
  function buildYearMgr(){
    yearMgr=document.createElement('div');yearMgr.className='kb-ymodal';yearMgr.id='kb-ymodal';
    yearMgr.innerHTML='<div class="kb-ymodal-card"><div class="kb-ymodal-h"><b>🎓 Schuljahre</b><button class="kb-ymodal-x" id="kb-ym-x" title="Schließen">✕</button></div>'+
      '<p class="kb-ym-note">Wähle das aktive Schuljahr, schließe ein Jahr ab oder lege ein neues an. <b>Schüler, Notizen und Ziele bleiben in allen Jahren erhalten</b> — nur der Terminplan (Horaire) wird pro Schuljahr geführt.</p>'+
      '<div class="kb-ym-list" id="kb-ym-list"></div>'+
      '<div class="kb-ym-new"><div class="kb-ym-new-h">➕ Neues Schuljahr</div>'+
        '<div class="kb-ym-new-row"><input class="kb-in" id="kb-ym-input" placeholder="z. B. 2027/28" autocomplete="off">'+
        '<button class="btn btn-primary" id="kb-ym-add">Anlegen &amp; aktivieren</button></div>'+
        '<label class="kb-ym-carry"><input type="checkbox" id="kb-ym-carry" checked> Grundwoche (Horaire) aus dem aktuellen Jahr übernehmen</label>'+
      '</div></div>';
    document.body.appendChild(yearMgr);
    yearMgr.addEventListener('click',function(e){if(e.target===yearMgr)closeYearMgr();});
    $('kb-ym-x').addEventListener('click',closeYearMgr);
    $('kb-ym-add').addEventListener('click',function(){
      var inp=$('kb-ym-input'); var raw=inp?inp.value:''; if(!raw||!raw.trim()){if(inp)inp.focus();return;}
      var carry=$('kb-ym-carry')&&$('kb-ym-carry').checked;
      var prev=window.KB_YEARS.activeYear();
      var id=window.KB_YEARS.add(raw.trim());
      if(!id){alert('Bitte ein gültiges Schuljahr eingeben, z. B. 2027/28.');return;}
      var now=window.KB_YEARS.activeYear();
      if(carry&&window.KB_AGENDA&&window.KB_AGENDA.copyBase&&prev&&now&&prev!==now){try{window.KB_AGENDA.copyBase(prev,now);}catch(e){}}
      if(inp)inp.value='';
      renderYearMgrList();
    });
    $('kb-ym-input').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();$('kb-ym-add').click();}});
  }
  function renderYearMgrList(){
    var box=$('kb-ym-list'); if(!box||!window.KB_YEARS)return;
    var years=window.KB_YEARS.list().slice().sort(function(a,b){return b.start-a.start;}), act=window.KB_YEARS.active();
    box.innerHTML=years.map(function(y){
      var isAct=y.id===act;
      var badge=isAct?'<span class="kb-ym-badge">aktiv</span>':(y.closed?'<span class="kb-ym-badge closed">abgeschlossen</span>':'');
      var acts='';
      if(!isAct){acts+='<button class="btn btn-sm" data-ym-act="'+esc(y.id)+'">aktivieren</button>';}
      if(y.closed){acts+='<button class="btn btn-sm" data-ym-reopen="'+esc(y.id)+'">wieder öffnen</button>';}
      else{acts+='<button class="btn btn-sm" data-ym-close="'+esc(y.id)+'">abschließen</button>';}
      return '<div class="kb-ym-item'+(isAct?' is-active':'')+'"><div class="kb-ym-label">'+esc(y.label)+' '+badge+'</div><div class="kb-ym-actions">'+acts+'</div></div>';
    }).join('');
    box.querySelectorAll('[data-ym-act]').forEach(function(el){el.addEventListener('click',function(){window.KB_YEARS.setActive(el.getAttribute('data-ym-act'));renderYearMgrList();});});
    box.querySelectorAll('[data-ym-close]').forEach(function(el){el.addEventListener('click',function(){window.KB_YEARS.close(el.getAttribute('data-ym-close'));renderYearMgrList();});});
    box.querySelectorAll('[data-ym-reopen]').forEach(function(el){el.addEventListener('click',function(){window.KB_YEARS.reopen(el.getAttribute('data-ym-reopen'));renderYearMgrList();});});
  }
  function openYearMgr(){if(!yearMgr)buildYearMgr();renderYearMgrList();yearMgr.classList.add('open');}
  function closeYearMgr(){if(yearMgr)yearMgr.classList.remove('open');}
  if(window.KB_YEARS){renderYearBar();window.KB_YEARS.onChange(function(){renderYearBar();refreshYearView();});}

  // Startseite: Mein Tag
  go('meintag');
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
  function get(sid){var r=data[sid];if(!r){r={matrikel:'',dateBegin:'',dateEnd:'',nodes:[],snapshots:[]};}if(!r.nodes){r.nodes=[];}if(!Array.isArray(r.snapshots)){r.snapshots=[];}return r;}
  function set(sid,r){data[sid]=r;saveAll(data);}
  function clone(x){try{return JSON.parse(JSON.stringify(x));}catch(e){return x;}}
  return {
    get:get,
    setMeta:function(sid,f){var r=get(sid);for(var k in f){r[k]=f[k];}set(sid,r);},
    addNode:function(sid,n){var r=get(sid);n.id='bn_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);r.nodes.push(n);set(sid,r);return n.id;},
    updateNode:function(sid,id,f){var r=get(sid);r.nodes.forEach(function(n){if(n.id===id){for(var k in f){n[k]=f[k];}}});set(sid,r);},
    removeNode:function(sid,id){var r=get(sid);r.nodes=r.nodes.filter(function(n){return n.id!==id;});set(sid,r);},
    snapshot:function(sid,label){var r=get(sid);var snap={id:'bs_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),date:new Date().toISOString().slice(0,10),label:label||'',matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:clone(r.nodes||[])};r.snapshots=r.snapshots||[];r.snapshots.push(snap);r.snapshots.sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:0);});set(sid,r);return snap.id;},
    snapshots:function(sid){return (get(sid).snapshots||[]).slice();},
    removeSnapshot:function(sid,snapId){var r=get(sid);r.snapshots=(r.snapshots||[]).filter(function(s){return s.id!==snapId;});set(sid,r);},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[],snapshots:r.snapshots||[]});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){data[r.id]={matrikel:r.matrikel||'',dateBegin:r.dateBegin||'',dateEnd:r.dateEnd||'',nodes:r.nodes||[],snapshots:r.snapshots||[]};});saveAll(data);}
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
        var lx=cx+(r+13)*Math.cos(ang),ly=cy+(r+13)*Math.sin(ang)+(n.note?0:4);
        s+='<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+anchor+'" font-size="12" font-weight="700" fill="#1d2433" paint-order="stroke" stroke="#ffffff" stroke-width="3.5">'+esc(n.name||'')+'</text>';
        if(n.note){var fn=String(n.note);if(fn.length>26){fn=fn.slice(0,25)+'…';}s+='<text x="'+lx.toFixed(1)+'" y="'+(ly+12).toFixed(1)+'" text-anchor="'+anchor+'" font-size="9.5" font-style="italic" fill="#5c6478" paint-order="stroke" stroke="#ffffff" stroke-width="3">'+esc(fn)+'</text>';}
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

  /* Vergleich zweier Bubble-Zustände (Moment A vs. B). Identität per Name
     (normalisiert) — so wird „dieselbe Person" über die Zeit erkannt. */
  function normName(s){return String(s==null?'':s).trim().toLowerCase();}
  function bubbleDiff(a,b){
    a=a||{nodes:[]};b=b||{nodes:[]};
    var am={},bm={};
    (a.nodes||[]).forEach(function(n){if(n&&n.name)am[normName(n.name)]=n;});
    (b.nodes||[]).forEach(function(n){if(n&&n.name)bm[normName(n.name)]=n;});
    var added=[],removed=[],changed=[],same=0;
    Object.keys(bm).forEach(function(k){if(!am[k])added.push(bm[k]);});
    Object.keys(am).forEach(function(k){if(!bm[k])removed.push(am[k]);});
    Object.keys(am).forEach(function(k){if(bm[k]){var x=am[k],y=bm[k],ch=[];
      ['note','area','freq','relation','status'].forEach(function(f){if((x[f]||'')!==(y[f]||'')){ch.push({field:f,from:x[f]||'',to:y[f]||''});}});
      if(ch.length)changed.push({name:y.name,changes:ch});else same++;}});
    return {added:added,removed:removed,changed:changed,same:same,countA:(a.nodes||[]).length,countB:(b.nodes||[]).length};
  }
  window.KB_BUBBLE_DIFF=bubbleDiff;

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
      '<div class="kb-card kbb-compare">'+
        '<h4 style="margin:0 0 6px">📸 Verlauf &amp; Vergleich</h4>'+
        '<p class="muted" style="font-size:.85em;margin:0 0 10px">Halte den aktuellen Stand als Snapshot fest und vergleiche zwei Zeitpunkte — was kam neu dazu, was fiel weg, was veränderte sich.</p>'+
        '<div class="kbb-snaprow"><input class="kb-in" id="kbb-snap-label" placeholder="Label (z. B. Schuljahresbeginn)"><button class="kb-btn kb-btn-primary" id="kbb-snap">📸 Snapshot speichern</button></div>'+
        '<div id="kbb-snaplist" style="margin-top:8px"></div>'+
        '<div class="kbb-cmp-controls"><label>A · vorher<select class="kb-in" id="kbb-cmp-a"></select></label><span class="kbb-cmp-arrow">→</span><label>B · nachher<select class="kb-in" id="kbb-cmp-b"></select></label></div>'+
        '<div id="kbb-cmp-body" class="kbb-cmp-body"></div>'+
      '</div>'+
    '</div>';
  };

  function dl(blob,fn){var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},800);}
  function safe(n){return String(n||'Kind').replace(/[^\\wäöüÄÖÜ-]+/g,'_');}

  window.KB_BUBBLE_WIRE=function(root, student){
    var sid=student.id, editing=null;
    function q(s){return root.querySelector(s);}
    function rec(){return window.KB_BUBBLE.get(sid);}
    function redraw(){var c=q('#kb-bubble-svg');if(c){c.innerHTML=bubbleSVG(student.name, rec());}var ca=q('#kbb-cmp-a');if(ca&&ca.options.length&&q('#kbb-cmp-body')){renderCompare();}}
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
    /* ---- Snapshots & Moment-Vergleich ---- */
    function snaps(){return window.KB_BUBBLE.snapshots(sid);}
    function cmpOptions(){var o=[{key:'live',label:'Aktuell'}];snaps().forEach(function(s){o.push({key:s.id,label:(s.date||'')+(s.label?(' · '+s.label):'')});});return o;}
    function stateFor(key){if(key==='live')return rec();var ss=snaps();for(var i=0;i<ss.length;i++){if(ss[i].id===key)return ss[i];}return rec();}
    function fieldLabel(f){return ({note:'Funktion',area:'Bereich',freq:'Häufigkeit',relation:'Kontakt',status:'Status'})[f]||f;}
    function valLabel(f,v){if(f==='area')return label(AREAS,v);if(f==='freq')return label(FREQ,v);if(f==='relation')return label(REL,v);if(f==='status')return label(STAT,v);return v;}
    function snaplistRender(){
      var el=q('#kbb-snaplist');if(!el){return;}var ss=snaps();
      if(!ss.length){el.innerHTML='<div class="muted" style="font-size:.85em">Noch keine Snapshots — speichere den aktuellen Stand, um später zu vergleichen.</div>';return;}
      el.innerHTML=ss.map(function(s){return '<div class="kbb-snapitem" data-id="'+esc(s.id)+'"><span>📸 '+esc(s.date||'')+(s.label?(' · '+esc(s.label)):'')+' <span class="muted">('+((s.nodes||[]).length)+' Personen)</span></span><button class="kb-btn kb-btn-ghost kbb-snapdel" title="Snapshot löschen">🗑</button></div>';}).join('');
    }
    function fillSelects(){
      var a=q('#kbb-cmp-a'),b=q('#kbb-cmp-b');if(!a||!b){return;}
      var opts=cmpOptions();var snapKeys=opts.filter(function(o){return o.key!=='live';});
      var defA=snapKeys.length?snapKeys[0].key:'live',defB='live';
      var pa=a.value,pb=b.value;var has=function(k){return opts.some(function(o){return o.key===k;});};
      function html(sel){return opts.map(function(o){return '<option value="'+esc(o.key)+'"'+(o.key===sel?' selected':'')+'>'+esc(o.label)+'</option>';}).join('');}
      a.innerHTML=html(has(pa)?pa:defA);b.innerHTML=html(has(pb)?pb:defB);
    }
    function diffGrp(title,arr,cls,fmt){if(!arr.length){return '';}return '<div class="kbb-diff-grp kbb-diff-'+cls+'"><div class="kbb-diff-h">'+esc(title)+' ('+arr.length+')</div><ul>'+arr.map(fmt).join('')+'</ul></div>';}
    function renderCompare(){
      var body=q('#kbb-cmp-body');if(!body){return;}
      var a=q('#kbb-cmp-a'),b=q('#kbb-cmp-b');var ka=a?a.value:'live',kb=b?b.value:'live';
      var sa=stateFor(ka),sb=stateFor(kb);var d=window.KB_BUBBLE_DIFF(sa,sb);
      var ta=a?a.options[a.selectedIndex].text:'',tb=b?b.options[b.selectedIndex].text:'';
      var bubbles='<div class="kbb-cmp-grid">'+
        '<div class="kbb-cmp-col"><div class="kbb-cmp-title">A · '+esc(ta)+' <span class="muted">('+d.countA+')</span></div>'+bubbleSVG(student.name,{matrikel:sa.matrikel,dateBegin:sa.dateBegin,dateEnd:sa.dateEnd,nodes:sa.nodes||[]})+'</div>'+
        '<div class="kbb-cmp-col"><div class="kbb-cmp-title">B · '+esc(tb)+' <span class="muted">('+d.countB+')</span></div>'+bubbleSVG(student.name,{matrikel:sb.matrikel,dateBegin:sb.dateBegin,dateEnd:sb.dateEnd,nodes:sb.nodes||[]})+'</div>'+
      '</div>';
      var fa=function(n){return '<li><strong>'+esc(n.name)+'</strong>'+(n.note?(' — '+esc(n.note)):'')+' <span class="muted">('+esc(label(AREAS,n.area))+', '+esc(label(FREQ,n.freq))+')</span></li>';};
      var fc=function(c){return '<li><strong>'+esc(c.name)+'</strong>: '+c.changes.map(function(ch){return esc(fieldLabel(ch.field))+' „'+esc(valLabel(ch.field,ch.from)||'—')+'" → „'+esc(valLabel(ch.field,ch.to)||'—')+'"';}).join('; ')+'</li>';};
      var none=(!d.added.length&&!d.removed.length&&!d.changed.length);
      var diff='<div class="kbb-diff">'+
        diffGrp('Neu hinzugekommen',d.added,'add',fa)+
        diffGrp('Weggefallen',d.removed,'rem',fa)+
        diffGrp('Verändert',d.changed,'chg',fc)+
        (none?'<div class="muted" style="font-size:.9em">Keine Unterschiede zwischen A und B'+(d.same?(' ('+d.same+' Personen unverändert)'):'')+'.</div>':'<div class="muted" style="font-size:.82em;margin-top:8px">'+d.same+' Personen unverändert.</div>')+
      '</div>';
      body.innerHTML=bubbles+diff;
    }
    var snapBtn=q('#kbb-snap');if(snapBtn){snapBtn.addEventListener('click',function(){var lab=((q('#kbb-snap-label')||{}).value||'').trim();window.KB_BUBBLE.snapshot(sid,lab);if(q('#kbb-snap-label'))q('#kbb-snap-label').value='';snaplistRender();fillSelects();renderCompare();});}
    var snapL=q('#kbb-snaplist');if(snapL){snapL.addEventListener('click',function(ev){var it=ev.target.closest('.kbb-snapitem');if(!it){return;}if(ev.target.closest('.kbb-snapdel')){if(confirm('Snapshot löschen?')){window.KB_BUBBLE.removeSnapshot(sid,it.getAttribute('data-id'));snaplistRender();fillSelects();renderCompare();}}});}
    if(q('#kbb-cmp-a'))q('#kbb-cmp-a').addEventListener('change',renderCompare);
    if(q('#kbb-cmp-b'))q('#kbb-cmp-b').addEventListener('change',renderCompare);
    snaplistRender();fillSelects();
    redraw();list();renderCompare();
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
  /* ACHTUNG: Jede Sammlung, die collGet() liefert, MUSS hier stehen. Fehlt sie,
     landet sie nie in der gemeinsamen Datei — und collSet() würde sie beim
     Anwenden mit einer leeren Liste überschreiben (= Datenverlust). */
  var COLLS=['roster','dosEntries','dosReunions','anwEntries','anwNotes','anwSettings','bubble','screening','pei','goals','years','agenda','tasks'];
  var BASE_LS='klassebuch_sync_base';
  /* Welche App schreibt die Datei? Klassenbuch und Journal nutzen dasselbe
     Format; eine fremde Datei wird abgelehnt statt vermischt (Fehler H2). */
  var APP='journal', FREMD_COLLS=['noten','terms','timetables','blocks'];
  /* Tiefe Kopie: Basis und Live-Daten dürfen sich nie Objekte teilen, sonst
     sieht der Vergleich Änderungen „an Ort und Stelle“ nicht (Fehler K4). */
  function kopie(o){return o==null?o:JSON.parse(JSON.stringify(o));}
  var DBNAME='klassebuch-sync';
  function fsSupported(){return (typeof window!=='undefined')&&('showOpenFilePicker' in window)&&('showSaveFilePicker' in window);}

  function eqPayload(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  /* Je Datensatz gewinnt der jüngere Zeitstempel. Bei Gleichstand entscheidet
     der Inhalt – auf allen Geräten gleich, damit die Datei nicht zwischen zwei
     Fassungen hin- und herpendelt (früher gewann immer die eigene Fassung). */
  function gewinnt(a,b){var ta=a._ts||0,tb=b._ts||0;if(ta!==tb){return ta>tb;}var sa=JSON.stringify(a),sb=JSON.stringify(b);return sa>=sb;}
  function mergeColl(remote,local){
    var by={},i,r,ex;
    for(i=0;i<(remote||[]).length;i++){r=remote[i];by[r.id]=r;}
    for(i=0;i<(local||[]).length;i++){r=local[i];ex=by[r.id];if(!ex||gewinnt(r,ex)){by[r.id]=r;}}
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
  function emptyDoc(){var d={_format:FMT,_app:APP,colls:{}};for(var i=0;i<COLLS.length;i++){d.colls[COLLS[i]]=[];}return d;}
  function buildLocalDoc(base,live,now){var ld=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var bc=(base&&base.colls&&base.colls[n])||[];ld.colls[n]=mergeColl(bc,diffColl(bc,live[n]||[],now));}return ld;}
  /* Sammlungen, die diese Version nicht kennt (neuere App-Stände), unverändert durchreichen */
  function fremdeBehalten(nb,remote){if(remote&&remote.colls){for(var k in remote.colls){if(COLLS.indexOf(k)<0&&Array.isArray(remote.colls[k])){nb.colls[k]=remote.colls[k];}}}return nb;}
  function mergeDocs(remote,localDoc){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];nb.colls[n]=mergeColl(rc,localDoc.colls[n]);}return fremdeBehalten(nb,remote);}
  function firstReconcile(live,remote,now){var nb=emptyDoc();for(var i=0;i<COLLS.length;i++){var n=COLLS[i];var rc=(remote&&remote.colls&&remote.colls[n])||[];var rby={};for(var j=0;j<rc.length;j++){rby[rc[j].id]=true;}var add=[];var lv=live[n]||[];for(j=0;j<lv.length;j++){if(!rby[lv[j].id]){add.push({id:lv[j].id,_ts:now,d:lv[j]});}}nb.colls[n]=mergeColl(rc,add);}return fremdeBehalten(nb,remote);}
  function normColl(c){return (c||[]).slice().sort(function(a,b){return a.id<b.id?-1:(a.id>b.id?1:0);}).map(function(r){return r.id+'|'+(r._ts||0)+'|'+(r._del?1:0)+'|'+JSON.stringify(r.d||null);}).join(';');}
  function sameDoc(a,b){if(!a||!b)return false;for(var i=0;i<COLLS.length;i++){if(normColl(a.colls[COLLS[i]])!==normColl(b.colls[COLLS[i]]))return false;}return true;}
  function summarize(doc){var keys=['roster','dosEntries','pei','goals','agenda','screening','bubble'];var c={};for(var j=0;j<keys.length;j++){var coll=(doc&&doc.colls&&doc.colls[keys[j]])||[];var n=0;for(var i=0;i<coll.length;i++){if(!coll[i]._del)n++;}c[keys[j]]=n;}return c;}

  function collGet(){
    function c(o,m){return (o&&o[m])?o[m]():[];}
    var st=(window.KB_ANW&&window.KB_ANW.exportSettings)?[window.KB_ANW.exportSettings()]:[];
    return {roster:c(window.KB_ROSTER,'syncExport'),bubble:c(window.KB_BUBBLE,'syncExport'),dosEntries:c(window.KB_DOS_SYNC,'exportEntries'),dosReunions:c(window.KB_DOS_SYNC,'exportReunions'),anwEntries:c(window.KB_ANW,'exportEntries'),anwNotes:c(window.KB_ANW,'exportNotes'),anwSettings:st,screening:c(window.KB_SCREENING,'syncExport'),pei:c(window.KB_PEI,'syncExport'),goals:c(window.KB_GOALS,'syncExport'),years:c(window.KB_YEARS,'syncExport'),agenda:c(window.KB_AGENDA,'syncExport'),tasks:c(window.KB_HOME,'syncExport')};
  }
  function collSet(doc){
    function s(o,m,v){if(o&&o[m]){try{o[m](v);}catch(e){}}}
    /* Sicherheitsnetz: Fehlt eine Sammlung im Dokument (ältere Team-Datei,
       oder die Sammlung steht nicht in COLLS), wird sie NICHT angewendet.
       Sonst käme syncApply([]) an und würde lokale Daten löschen. */
    function sc(o,m,coll){if(!coll)return;s(o,m,kopie(liveOf(coll)));}
    sc(window.KB_ROSTER,'syncApply',doc.colls.roster);
    sc(window.KB_DOS_SYNC,'applyEntries',doc.colls.dosEntries);
    sc(window.KB_DOS_SYNC,'applyReunions',doc.colls.dosReunions);
    sc(window.KB_ANW,'applyEntries',doc.colls.anwEntries);
    sc(window.KB_ANW,'applyNotes',doc.colls.anwNotes);
    if(doc.colls.anwSettings){var se=kopie(liveOf(doc.colls.anwSettings));s(window.KB_ANW,'applySettings',se[0]||null);}
    sc(window.KB_BUBBLE,'syncApply',doc.colls.bubble);
    sc(window.KB_SCREENING,'syncApply',doc.colls.screening);
    sc(window.KB_PEI,'syncApply',doc.colls.pei);
    sc(window.KB_GOALS,'syncApply',doc.colls.goals);
    sc(window.KB_YEARS,'syncApply',doc.colls.years);
    sc(window.KB_AGENDA,'syncApply',doc.colls.agenda);
    sc(window.KB_HOME,'syncApply',doc.colls.tasks);
  }

  var base=null,busy=false,applying=false,timer=null,fileHandle=null;
  var status={connected:false,supported:fsSupported(),fileName:'',lastSync:0,lastBy:'',error:'',pending:false,backupName:'',backupLast:'',backupErr:''};
  var statusCb=null;
  function setStatus(p){for(var k in p){status[k]=p[k];}if(statusCb){try{statusCb(status);}catch(e){}}try{warnBar();}catch(e){}}
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
      if((d._app&&d._app!==APP)||(!d._app&&FREMD_COLLS.some(function(k){return !!d.colls[k];}))){return 'FREMD';}
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
  /* Die Tageskopie sichert den Stand, der GERADE NOCH in der gemeinsamen Datei
     steht - nicht das Ergebnis des Abgleichs. Sonst waere die Kopie im
     Schadensfall genauso leer wie das Original. */
  function writeBackup(doc){
    var q=doc||base;
    if(!backupDir||!q)return Promise.resolve();
    var name='klassebuch-'+todayStr()+'.json';var snap={};for(var k in q){snap[k]=q[k];}
    snap._backupAt=Date.now();snap._backupBy=operator();
    var json=JSON.stringify(snap);
    return backupDir.getFileHandle(name,{create:true}).then(function(fh){return fh.createWritable();}).then(function(w){return w.write(json).then(function(){return w.close();});}).then(function(){return pruneBackups();});
  }
  function maybeBackup(doc){
    var q=doc||base;
    if(!backupDir||backupBusy||!q)return Promise.resolve();
    var today=todayStr();if(bkLastDay()===today)return Promise.resolve();
    backupBusy=true;
    return verifyPermission(backupDir,false).then(function(ok){
      if(!ok){backupBusy=false;return;}
      return writeBackup(q).then(function(){bkSetDay(today);setStatus({backupLast:today,backupErr:''});});
    }).then(function(){backupBusy=false;}).catch(function(e){backupBusy=false;setStatus({backupErr:'Backup-Fehler: '+((e&&e.message)||e)});});
  }

  /* ---- Schicht 1: nicht abgleichen, bevor alles geladen ist ----
     Das Dossier liegt in der Browser-Datenbank und antwortet die ersten
     Millisekunden mit "nichts". Ohne diese Sperre haelt der Abgleich das fuer
     "alles geloescht" und traegt Loeschmarken in die gemeinsame Datei ein -
     auf allen Geraeten. */
  function quellenBereit(){
    var f=[];
    try{if(window.KB_DOS_SYNC&&window.KB_DOS_SYNC.ready&&!window.KB_DOS_SYNC.ready())f.push('Dossier');}catch(e){}
    try{if(window.KB_ANW&&window.KB_ANW.ready&&!window.KB_ANW.ready())f.push('Klassenbuch');}catch(e){}
    return f;
  }

  /* ---- Schicht 2: Bremse gegen Massenloeschung ----
     Ein Abgleich, der auf einen Schlag viel loescht, ist fast nie Absicht.
     Dann wird NICHTS geschrieben, sondern gefragt. */
  var WIPE_ABS=8;        // ab so vielen Loeschungen wird hingeschaut
  var WIPE_ANTEIL=0.34;  // ... und ab diesem Anteil einer Sammlung gebremst
  var wipeOk=false;      // hat jemand "Trotzdem" gesagt?
  function neueLoeschungen(ld,now){
    var out=[],ges=0;
    for(var i=0;i<COLLS.length;i++){
      var n=COLLS[i],c=ld.colls[n]||[],del=0;
      for(var j=0;j<c.length;j++){if(c[j]._del&&(c[j]._ts||0)>=now)del++;}
      if(!del)continue;
      var vorher=0,bc=(base&&base.colls&&base.colls[n])||[];
      for(j=0;j<bc.length;j++){if(!bc[j]._del)vorher++;}
      ges+=del;
      out.push({coll:n,del:del,vorher:vorher,anteil:vorher?del/vorher:1});
    }
    return {ges:ges,teile:out};
  }
  function verdaechtig(w){
    if(wipeOk)return false;
    if(w.ges<WIPE_ABS)return false;
    for(var i=0;i<w.teile.length;i++){var t=w.teile[i];if(t.anteil>=WIPE_ANTEIL)return true;}
    return false;
  }
  var NAMEN={roster:'Schüler',dosEntries:'Dossier-Einträge',dosReunions:'Réunionen',
    anwEntries:'Absenzen',anwNotes:'Klassenbuch-Notizen',noten:'Noten',screening:'Screenings',
    bubble:'Helfernetz',terms:'Schuljahre',timetables:'Stundenpläne',blocks:'Stundenraster',anwSettings:'Einstellungen'};
  function wipeBar(w){
    var el=document.getElementById('kb-wipewarn');
    if(el&&el.parentNode)el.parentNode.removeChild(el);
    el=document.createElement('div');el.id='kb-wipewarn';el.setAttribute('role','alert');
    el.style.cssText='position:fixed;left:0;right:0;top:0;z-index:10000;background:#8E1B12;color:#fff;'+
      'font:600 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:11px 16px;'+
      'display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;box-shadow:0 2px 14px rgba(0,0,0,.35);';
    var was=w.teile.filter(function(t){return t.del;}).map(function(t){
      return t.del+' '+(NAMEN[t.coll]||t.coll);
    }).join(', ');
    var t=document.createElement('span');
    t.textContent='⛔ Der Abgleich würde ' + was + ' löschen. Das sieht nach einem Fehler aus — es wurde nichts in die Team-Datei geschrieben.';
    el.appendChild(t);
    function knopf(txt,fn,stark){
      var b=document.createElement('button');b.textContent=txt;
      b.style.cssText='border:1px solid rgba(255,255,255,.75);background:'+(stark?'#fff':'transparent')+';color:'+(stark?'#8E1B12':'#fff')+';'+
        'border-radius:8px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap;';
      b.onclick=fn;el.appendChild(b);
    }
    knopf('Nicht löschen — Seite neu laden',function(){location.reload();},true);
    knopf('Trotzdem löschen',function(){
      if(!confirm('Wirklich? ' + was + ' werden dann auf ALLEN Geräten gelöscht.'))return;
      wipeOk=true;el.parentNode&&el.parentNode.removeChild(el);cycle();
    });
    (document.body||document.documentElement).appendChild(el);
  }

  function cycle(){
    if(!fileHandle||busy||applying)return Promise.resolve();
    var fehlt=quellenBereit();
    if(fehlt.length){setStatus({pending:false,error:'',warten:fehlt.join(', ')});return Promise.resolve();}
    if(status.warten)setStatus({warten:''});
    busy=true;setStatus({pending:true});
    var now=Date.now();var live=kopie(collGet());
    return readFile().then(function(remote){
      if(remote==='INVALID'){setStatus({error:'Gemeinsame Datei nicht lesbar — Sync pausiert (lokale Daten bleiben unveraendert).',pending:false});busy=false;return;}
      if(remote==='FREMD'){setStatus({error:'Diese Team-Datei gehört zum Klassenbuch, nicht zum Journal — bitte die Datei des Journals wählen. Nichts wurde verändert.',pending:false});busy=false;return;}
      var nb,apply;
      if(!base){nb=firstReconcile(live,remote||null,now);apply=true;}
      else{
        var ld=buildLocalDoc(base,live,now);
        var w=neueLoeschungen(ld,now);
        if(verdaechtig(w)){
          setStatus({pending:false,error:'Abgleich angehalten: würde ungewöhnlich viel löschen.'});
          busy=false;try{wipeBar(w);}catch(e){}
          return;
        }
        nb=mergeDocs(remote||null,ld);apply=!sameDoc(nb,ld);
      }
      if(apply){applying=true;try{collSet(nb);}catch(e){}applying=false;}
      /* Schicht 3: die Tageskopie entsteht VOR dem ersten Schreiben, also vom
         Stand, der noch in der Datei steht - nicht hinterher vom Ergebnis. */
      var changed=!remote||!sameDoc(nb,remote);
      var vorher=changed?maybeBackup(remote||base):Promise.resolve();
      base=nb;saveBase(nb);
      return vorher.then(function(){
        return changed?writeFile(nb):Promise.resolve();
      }).then(function(){
        setStatus({error:'',lastSync:Date.now(),lastBy:(remote&&remote._savedBy)||status.lastBy,pending:false,counts:summarize(base)});
        busy=false;
      });
    }).catch(function(e){setStatus({error:'Sync-Fehler: '+((e&&e.message)||e),pending:false});busy=false;});
  }
  function start(){stop();timer=setInterval(cycle,5000);cycle();}
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function afterPick(h){return verifyPermission(h,true).then(function(ok){if(!ok){setStatus({error:'Kein Zugriff auf die Datei erteilt.'});return;}fileHandle=h;base=loadBase();setAuto(true);return idbSet(h).then(function(){setStatus({connected:true,fileName:h.name||'gemeinsame Datei',error:''});start();});});}

  /* ---- Von selbst verbinden ----
     Der Griff auf die Datei liegt dauerhaft in der Datenbank des Browsers.
     Die ERLAUBNIS dazu setzt der Browser beim naechsten Oeffnen aber oft
     wieder auf "fragen" zurueck, und fragen darf man nur als Antwort auf
     einen Klick. Also: beim ersten Klick irgendwo einmal fragen - das ist
     meist der Klick auf den eigenen Namen - statt jedes Mal von Hand in die
     Einstellungen zu gehen. Wird abgelehnt, bleibt der Balken stehen und
     nichts fragt ungefragt nach. */
  var AUTO_KEY='kb_sync_auto';
  var autoArmed=false,autoTried=false;
  function autoOn(){try{return localStorage.getItem(AUTO_KEY)!=='0';}catch(e){return true;}}
  function setAuto(v){try{localStorage.setItem(AUTO_KEY,v?'1':'0');}catch(e){}}
  function armAuto(h){
    if(autoArmed||!h||!autoOn())return;autoArmed=true;
    var go=function(){
      document.removeEventListener('pointerdown',go,true);
      document.removeEventListener('keydown',go,true);
      if(autoTried||fileHandle)return;autoTried=true;
      verifyPermission(h,true).then(function(ok){
        if(ok){fileHandle=h;base=loadBase();setStatus({connected:true,fileName:h.name||'gemeinsame Datei',error:''});start();}
        else{setStatus({connected:false,fileName:h.name||'gemeinsame Datei',error:'reconnect'});}
      }).catch(function(){});
    };
    document.addEventListener('pointerdown',go,true);
    document.addEventListener('keydown',go,true);
  }

  /* Solange eine bekannte Team-Datei NICHT verbunden ist, steht das oben -
     sonst merkt es waehrend einer Réunion niemand. */
  function warnBar(){
    var zeig=!!(status&&status.error==='reconnect'&&!status.connected);
    var el=document.getElementById('kb-syncwarn');
    if(!zeig){if(el&&el.parentNode)el.parentNode.removeChild(el);return;}
    if(!el){
      el=document.createElement('div');el.id='kb-syncwarn';el.setAttribute('role','alert');
      el.style.cssText='position:fixed;left:0;right:0;top:0;z-index:9998;background:#E8A317;color:#3a2a00;'+
        'font:600 14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:9px 14px;'+
        'display:flex;gap:12px;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.2);';
      var t=document.createElement('span');
      t.textContent='Team-Datei ist nicht verbunden — Eingaben bleiben vorerst nur auf diesem Gerät.';
      el.appendChild(t);
      var b=document.createElement('button');
      b.textContent='Jetzt verbinden';
      b.style.cssText='border:1px solid rgba(0,0,0,.4);background:#fff;color:#3a2a00;border-radius:8px;'+
        'padding:3px 12px;font:inherit;font-size:13px;cursor:pointer;';
      b.onclick=function(){idbGet().then(function(h){if(h){autoTried=false;afterPick(h);}});};
      el.appendChild(b);
      (document.body||document.documentElement).appendChild(el);
    }
  }

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
    autoOn:autoOn,
    setAuto:function(v){setAuto(v);if(v&&!fileHandle)idbGet().then(function(h){if(h)armAuto(h);});},
    init:function(){if(!fsSupported())return;idbGet().then(function(h){if(!h)return;h.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){fileHandle=h;base=loadBase();setStatus({connected:true,fileName:h.name||'gemeinsame Datei'});start();}else{setStatus({connected:false,fileName:h.name||'gemeinsame Datei',error:'reconnect'});armAuto(h);}});});idbGet('backupdir').then(function(d){if(!d)return;d.queryPermission({mode:'readwrite'}).then(function(p){if(p==='granted'){backupDir=d;setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay()});}else{setStatus({backupName:d.name||'Backup-Ordner',backupLast:bkLastDay(),backupErr:'reconnect'});}});});},
    _test:{mergeColl:mergeColl,diffColl:diffColl,buildLocalDoc:buildLocalDoc,mergeDocs:mergeDocs,firstReconcile:firstReconcile,liveOf:liveOf,sameDoc:sameDoc,emptyDoc:emptyDoc,COLLS:COLLS,isBackupName:isBackupName,planPrune:planPrune,todayStr:todayStr,writeBackup:writeBackup,pruneBackups:pruneBackups,maybeBackup:maybeBackup,setBackupDir:function(d){backupDir=d;},setBase:function(b){base=b;},lastDay:bkLastDay,resetDay:function(){bkSetDay('');}}
  };
})();
`;

/* ============================================================
   KB_SCREENING — nur noch zum Nachlesen. Das Screening ist in den CDSE Hub
   umgezogen (Schüler → Dossier → Screening: Beobachtungsbogen ohne
   Verdachtsdiagnosen). Frühere Angaben bleiben hier lesbar und werden über
   die Team-Datei unverändert weitergereicht (Sammlung „screening“), bis der
   Hub sie ins Dossier übernommen hat. Die Texte zu den Kürzeln stehen in
   kb-screening-texte.js (neben dieser Datei, nur bei Bedarf geladen).
   ============================================================ */
var SCREENING_MODULE = `
window.KB_SCREENING=(function(){
  var LS='klassebuch_screening_v1';
  var AKUT={'16.1':'Suizidale Gedanken berichtet','16.2':'Konkreter Suizidplan oder Vorbereitungs-Handlungen','16.3':'Selbstverletzendes Verhalten'};
  function loadAll(){try{var r=localStorage.getItem(LS);if(r){return JSON.parse(r)||{};}}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();
  function kopie(o){return JSON.parse(JSON.stringify(o));}
  function get(sid){var r=data[sid]||{};return kopie({symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:Array.isArray(r.history)?r.history:[],updatedAt:r.updatedAt||''});}
  function hat(sid){var r=data[sid];return !!(r&&((r.symptome&&r.symptome.length)||(r.history&&r.history.length)));}
  function acuteFlags(sid){return (get(sid).symptome||[]).filter(function(id){return AKUT[id];}).map(function(id){return {id:id,label:AKUT[id]};});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function datum(i){var m=/^(\\d{4})-(\\d{2})-(\\d{2})/.exec(String(i||''));return m?(m[3]+'.'+m[2]+'.'+m[1]):'';}
  var texteLaden=null;
  function texte(){
    if(window.CDSE_KB_TEXTE){return Promise.resolve(window.CDSE_KB_TEXTE);}
    if(!texteLaden){texteLaden=new Promise(function(res){var s=document.createElement('script');s.src='kb-screening-texte.js';s.onload=function(){res(window.CDSE_KB_TEXTE||null);};s.onerror=function(){res(null);};document.head.appendChild(s);});}
    return texteLaden;
  }
  /* Frühere Angaben lesbar darstellen: Beobachtungen nach Bereich, Vertiefung, Dauer/Umfeld */
  function fuellen(root){
    var el=root&&root.querySelector('#kb-scr-alt');if(!el){return;}
    var sid=el.getAttribute('data-sid'), d=get(sid);
    texte().then(function(X){
      if(!document.body.contains(el)){return;}
      var gruppen={}, folge=[], vert=[], fragen=[];
      d.symptome.forEach(function(id){var t=X&&X.symptome[id], k=t?(X.kategorien[t[0]]||'Beobachtungen'):'Beobachtungen';if(!gruppen[k]){gruppen[k]=[];folge.push(k);}gruppen[k].push(t?t[1]:('Aussage '+id));});
      Object.keys(d.plans||{}).forEach(function(th){var p=d.plans[th]||{}, T=X&&X.themen[th];
        (p.symptome||[]).forEach(function(id){var t=T&&T.sym[id], x=t?t[1]:('Aussage '+id);if(vert.indexOf(x)<0){vert.push(x);}});
        Object.keys(p.kontext||{}).forEach(function(f){var q=T&&T.fragen[f], v=p.kontext[f];fragen.push([q?q[0]:f,q&&q[1][v]!=null?q[1][v]:v]);});
      });
      Object.keys(d.demografie||{}).forEach(function(f){var v=d.demografie[f], q=null;if(X){Object.keys(X.themen).some(function(k){var x=X.themen[k].fragen[f];if(x&&x[1][v]!=null){q=x;return true;}return false;});}fragen.unshift([q?q[0]:f,q?q[1][v]:v]);});
      ((X&&X.gate)||[]).forEach(function(g){var v=(d.gate||{})[g.key];if(v){fragen.unshift([g.titel,g.optionen[v]!=null?g.optionen[v]:v]);}});
      var gesehen={};fragen=fragen.filter(function(q){var k=q[0]+'|'+q[1];if(gesehen[k]){return false;}gesehen[k]=1;return true;});
      var h='<h4>Frühere Beobachtungen</h4><p class="kb-scr-sub">'+(d.updatedAt?'Stand '+datum(d.updatedAt)+' · ':'')+'Ja/Nein-Liste des alten Screenings. Die frühere automatische Auswertung wird nicht mehr angezeigt.'+(X?'':' (Die Texte zu den Kürzeln fehlen: kb-screening-texte.js liegt nicht neben dieser Datei.)')+'</p>';
      h+='<div class="kb-scr-grid">'+folge.map(function(k){return '<div><h5>'+esc(k)+'</h5><ul>'+gruppen[k].map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>';}).join('')+
        (vert.length?'<div><h5>Weitere Beobachtungen (Vertiefung)</h5><ul>'+vert.map(function(t){return '<li>'+esc(t)+'</li>';}).join('')+'</ul></div>':'')+'</div>';
      if(fragen.length){h+='<dl class="kb-scr-dl">'+fragen.map(function(q){return '<dt>'+esc(q[0])+'</dt><dd>'+esc(q[1])+'</dd>';}).join('')+'</dl>';}
      el.innerHTML=h;
    });
  }
  return {
    get:get, hasData:hat, acuteFlags:acuteFlags, fuellen:fuellen,
    history:function(sid){return get(sid).history;},
    result:function(sid){var d=get(sid);return {hasData:hat(sid),acute:acuteFlags(sid),risiken:[],globalCount:d.symptome.length,updatedAt:d.updatedAt,nurLesen:true};},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''});}return kopie(out);},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){if(r&&r.id){data[r.id]=kopie({symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''});}});saveAll(data);}
  };
})();
`;

/* ============================================================
   Isa-Toolbox-Integration: Materialdaten, Taxonomie, Modul
   ============================================================ */
/* Materialvorschläge kommen aus dem Verzeichnis der Hub-Toolbox (toolbox-index.js
   neben dieser Datei); geöffnet wird die Toolbox im Hub. */
var TAXONOMY_JSON = read('taxonomy.json');
var MATERIALS_MODULE = read('materials-module.js');
function scriptSafe(s) { return String(s).replace(/<\/(script)/gi, '<\\/$1'); }

function jsonForScript(s) { return String(s).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029'); }

var MATERIAL_CSS = `
/* === Material-Tab (ISA-App eingebettet) === */
#isa-root.kb-panel{ padding:0; }
/* Aktives Panel füllt die (position:relative, min-height:100vh) Stage komplett,
   damit das absolut positionierte iframe eine echte Höhe bekommt. */
#isa-root.kb-panel.active{ position:absolute; inset:0; display:block; }
#isa-root .isa-host,#isa-root #isa-host{ position:absolute; inset:0; width:100%; height:100%; }
#isa-root .isa-frame{ width:100%; height:100%; border:0; display:block; background:#fff; }
#isa-root .isa-loading{ display:flex; align-items:center; justify-content:center; height:100%; color:var(--kb-muted); font-weight:600; }

/* === Arbeitsblatt-Buttons im Hub === */
.hub-list li .hub-mat{ order:3; margin-left:auto; align-self:center; white-space:nowrap; border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:7px; padding:2px 9px; font-size:12.5px; font-weight:600; cursor:pointer; line-height:1.5; color:var(--kb-accent,#4f5bd5); }
.hub-list li .hub-mat:hover{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.hub-list li .hub-gtext{ flex:1; min-width:0; }
.hub-list li .hub-gcode{ order:0; flex:0 0 auto; align-self:flex-start; margin-top:1px; font-size:11px; font-weight:800; color:#fff; border-radius:5px; padding:2px 7px; white-space:nowrap; letter-spacing:.01em; }
.hub-list li .hub-gelbl{ font-weight:800; color:var(--kb-ink,#23243a); }
.hub-theme-wrap{ display:flex; flex-wrap:wrap; gap:7px; }
.hub-theme-chip{ display:inline-flex; align-items:center; gap:6px; border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:999px; padding:5px 11px; font-size:13px; cursor:pointer; font-weight:600; color:var(--kb-ink,#23243a); }
.hub-theme-chip:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.hub-theme-chip .ht-n{ font-size:11px; opacity:.6; }
.hub-theme-chip.sev-3{ border-color:#e3b7ac; } .hub-theme-chip.sev-2{ border-color:#e8d3a8; }

/* === Material-Such-Modal (KB-nativ) === */
.kbm-ov{ position:fixed; inset:0; background:rgba(20,22,40,.55); backdrop-filter:blur(3px); z-index:9000; display:none; align-items:flex-start; justify-content:center; padding:32px 16px; overflow:auto; }
.kbm-ov.open{ display:flex; }
.kbm-modal{ background:var(--kb-bg,#f6f7fb); width:100%; max-width:860px; border-radius:18px; box-shadow:0 24px 70px rgba(0,0,0,.3); overflow:hidden; display:flex; flex-direction:column; max-height:calc(100vh - 64px); }
.kbm-head{ display:flex; align-items:flex-start; gap:12px; padding:18px 22px 14px; background:var(--kb-surface,#fff); border-bottom:1px solid var(--kb-border,#ececf3); }
.kbm-head-t{ font-size:17px; font-weight:800; line-height:1.35; flex:1; color:var(--kb-ink,#23243a); }
.kbm-goalcode{ color:#fff; border-radius:6px; padding:1px 8px; font-size:13px; font-weight:800; margin-right:4px; }
.kbm-x{ border:0; background:transparent; font-size:26px; line-height:1; cursor:pointer; color:var(--kb-muted,#777); padding:0 2px; }
.kbm-cyc{ padding:0 22px; background:var(--kb-surface,#fff); }
.kbm-cyc:empty{ display:none; }
.kbm-cyc-note{ font-size:13px; color:var(--kb-muted,#666); padding:10px 0 6px; }
.kbm-chips{ display:flex; flex-wrap:wrap; gap:7px; padding-bottom:14px; }
.kbm-chip{ border:1px solid var(--kb-border,#dcdce6); background:var(--kb-bg,#f3f4fa); border-radius:999px; padding:5px 13px; font-size:13px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
.kbm-chip.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.kbm-body{ padding:16px 22px 22px; overflow:auto; }
.kbm-count{ font-size:13px; color:var(--kb-muted,#666); font-weight:600; margin-bottom:12px; }
.kbm-empty{ padding:26px; text-align:center; color:var(--kb-muted,#888); }
.kbm-list{ display:flex; flex-direction:column; gap:12px; }
.kbm-card{ background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:13px; padding:14px 16px; }
.kbm-card-h{ display:flex; align-items:flex-start; gap:10px; }
.kbm-card-h h4{ margin:0; font-size:15.5px; flex:1; color:var(--kb-ink,#23243a); }
.kbm-ages{ display:flex; flex-wrap:wrap; gap:4px; }
.kbm-age{ background:#eef0fb; color:#4a4f86; border-radius:5px; padding:1px 6px; font-size:11px; font-weight:800; }
.kbm-age-warn{ background:#fbe7d8; color:#b3611f; }
.kbm-meta{ font-size:12px; color:var(--kb-muted,#888); margin:7px 0; }
.kbm-desc{ font-size:13.5px; color:var(--kb-ink,#33344c); margin:6px 0 9px; line-height:1.5; }
.kbm-desc-full{ font-size:14px; color:var(--kb-ink,#33344c); margin:12px 0; line-height:1.6; }
.kbm-tags{ display:flex; flex-wrap:wrap; gap:5px; }
.kbm-tag{ background:var(--kb-bg,#f0f1f8); color:#5a5f7e; border-radius:999px; padding:2px 9px; font-size:11.5px; font-weight:600; }
.kbm-acts{ margin-top:11px; display:flex; gap:8px; flex-wrap:wrap; }
.kbm-btn{ border:1px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); border-radius:9px; padding:8px 14px; font-size:13.5px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
.kbm-btn:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.kbm-btn-p{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
.kbm-btn-p:hover{ filter:brightness(1.06); color:#fff; }
.kbm-more{ margin-top:12px; font-size:12.5px; color:var(--kb-muted,#888); text-align:center; }
.kbm-divider{ margin:20px 0 12px; font-size:12px; font-weight:800; letter-spacing:.02em; text-transform:uppercase; color:var(--kb-muted,#8a8fa6); border-top:1px dashed var(--kb-border,#dcdce6); padding-top:14px; }
.kbm-foot{ margin-top:18px; padding-top:14px; border-top:1px solid var(--kb-border,#ececf3); text-align:center; }
.kbm-detail .kbm-d-back{ display:flex; justify-content:space-between; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.kbm-section{ margin-top:18px; }
.kbm-section h4{ margin:0 0 8px; font-size:14.5px; color:var(--kb-ink,#23243a); border-bottom:1px solid var(--kb-border,#ececf3); padding-bottom:5px; }
.kbm-phase{ margin-bottom:12px; } .kbm-phase h5{ margin:0 0 3px; font-size:13.5px; color:var(--kb-accent,#4f5bd5); }
.kbm-phase p{ margin:0; font-size:13.5px; line-height:1.55; color:var(--kb-ink,#33344c); }
.kbm-info{ font-size:12.5px; color:var(--kb-muted,#666); display:flex; flex-direction:column; gap:2px; margin:10px 0; }
.kbm-goals{ display:flex; flex-wrap:wrap; gap:6px; }
.kbm-goalmini{ border:1px solid; border-radius:6px; padding:2px 8px; font-size:11.5px; font-weight:700; background:#fff; }
.kbm-ws{ background:var(--kb-surface,#fff); border:1px dashed var(--kb-border,#d6d7e3); border-radius:12px; padding:16px 18px; }
.kbm-ws-title{ font-weight:800; margin-bottom:6px; } .kbm-ws-intro{ color:var(--kb-muted,#666); margin-bottom:12px; font-size:13px; }
.kbm-ws-h{ font-size:14px; font-weight:800; margin:16px 0 6px; border-bottom:1px solid var(--kb-border,#e6e6ef); padding-bottom:3px; }
.kbm-ws-ins{ font-style:italic; color:var(--kb-muted,#555); margin:6px 0; font-size:13px; }
.kbm-ws-qp{ font-weight:700; margin:10px 0 5px; font-size:13.5px; }
.kbm-ws-line{ border-bottom:1px solid #b9bacb; height:21px; margin:6px 0; }
.kbm-ws-box{ border:1px solid #b9bacb; border-radius:7px; margin:8px 0; padding:6px; }
.kbm-ws-check{ list-style:none; padding:0; margin:6px 0; } .kbm-ws-check li{ margin:7px 0; font-size:13.5px; }
.kbm-ws-tick{ display:inline-block; width:13px; height:13px; border:1.6px solid #888; border-radius:3px; margin-right:9px; vertical-align:middle; }
.kbm-ws-scale .kbm-ws-sc{ display:inline-block; margin-right:16px; font-size:13px; }
.kbm-ws-tab{ border-collapse:collapse; width:100%; margin:8px 0; } .kbm-ws-tab th,.kbm-ws-tab td{ border:1px solid #b9bacb; padding:7px 9px; text-align:left; font-size:13px; } .kbm-ws-tab td{ height:25px; }
@media(max-width:560px){ .kbm-modal{ max-height:calc(100vh - 32px);} .kbm-ov{ padding:16px 8px; } }

/* === Identität: „Wer arbeitet hier?"-Gate + Sidebar-Chip === */
.kb-gate{ position:fixed; inset:0; z-index:11000; background:linear-gradient(135deg,#3b3f8f,#5a3f9e); display:none; align-items:center; justify-content:center; padding:24px; }
.kb-gate.open{ display:flex; }
.kb-gate-card{ background:var(--kb-surface,#fff); border-radius:22px; max-width:560px; width:100%; padding:32px 30px; box-shadow:0 30px 80px rgba(0,0,0,.4); text-align:center; }
.kb-gate-logo{ font-size:40px; }
.kb-gate-card h2{ margin:8px 0 4px; font-size:22px; color:var(--kb-ink,#23243a); }
.kb-gate-card p{ margin:0 0 20px; color:var(--kb-muted,#666); font-size:14px; }
.kb-gate-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; }
.kb-gate-user{ display:flex; flex-direction:column; align-items:center; gap:8px; padding:14px 8px; border:1px solid var(--kb-border,#e6e6ef); border-radius:14px; background:var(--kb-bg,#f6f7fb); cursor:pointer; font-weight:700; font-size:14px; color:var(--kb-ink,#23243a); transition:transform .08s ease,border-color .12s ease; }
.kb-gate-user:hover{ border-color:var(--kb-accent,#4f5bd5); transform:translateY(-1px); }
.kb-gate-user.on{ border-color:var(--kb-accent,#4f5bd5); box-shadow:0 0 0 2px var(--kb-accent,#4f5bd5) inset; }
.kb-gate-av{ width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:16px; font-weight:800; }
.kb-gate-other{ margin-top:18px; border:1px dashed var(--kb-border,#cfd0de); background:transparent; border-radius:10px; padding:9px 16px; font-size:13.5px; font-weight:600; cursor:pointer; color:var(--kb-muted,#666); }
.kb-gate-other:hover{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); }
.kb-userchip{ display:flex; align-items:center; gap:8px; width:100%; margin:2px 0 10px; padding:8px 10px; border:1px solid var(--kb-border,#e6e6ef); border-radius:12px; background:var(--kb-bg,#f3f4fa); cursor:pointer; font:inherit; text-align:left; }
.kb-userchip:hover{ border-color:var(--kb-accent,#4f5bd5); }
.kb-uc-av{ width:30px; height:30px; border-radius:50%; background:#4f5bd5; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12.5px; flex:0 0 auto; }
.kb-uc-n{ font-weight:700; font-size:13.5px; color:var(--kb-ink,#23243a); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kb-uc-x{ font-size:11px; color:var(--kb-muted,#8a8fa6); font-weight:600; }
/* Autor-Kennzeichnung in Réunion/Verlauf */
.reunion-author,.hub-author{ font-size:12px; font-weight:700; color:var(--kb-accent,#4f5bd5); background:rgba(79,91,213,.09); border-radius:999px; padding:1px 9px; white-space:nowrap; }
.tl-author{ font-size:11.5px; color:var(--kb-muted,#8a8fa6); font-weight:600; }
@media(max-width:720px){ .kb-gate-card{ padding:24px 18px; } }

/* === Noten & Module (Schüler-Hub) === */
#dos-root .note-top{ display:flex; justify-content:flex-end; }
#dos-root .note-mode{ display:inline-flex; align-items:center; gap:8px; }
#dos-root .note-mode-lbl{ font-size:12.5px; color:var(--kb-muted,#777); font-weight:600; }
#dos-root .note-mode-btn{ border:1px solid var(--kb-border,#e2e3ee); background:var(--kb-surface,#fff); border-radius:999px; padding:4px 13px; font-size:13px; font-weight:700; cursor:pointer; color:var(--kb-ink,#23243a); }
#dos-root .note-mode-btn.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
#dos-root .note-pertabs{ display:flex; gap:8px; flex-wrap:wrap; margin:14px 0 4px; }
#dos-root .note-pertab{ text-decoration:none; border:1px solid var(--kb-border,#e2e3ee); border-radius:10px; padding:7px 15px; font-size:14px; font-weight:700; color:var(--kb-ink,#23243a); background:var(--kb-surface,#fff); }
#dos-root .note-pertab.on{ background:var(--kb-accent,#4f5bd5); color:#fff; border-color:var(--kb-accent,#4f5bd5); }
#dos-root .note-hint{ font-size:12.5px; margin:6px 0 14px; }
#dos-root .note-card{ background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:14px; padding:4px 16px; margin-bottom:10px; transition:box-shadow .12s ease,border-color .12s ease; }
#dos-root .note-card.is-open{ padding:14px 16px; box-shadow:0 6px 22px rgba(0,0,0,.07); border-color:var(--kb-border,#e2e3ee); }
#dos-root .note-card-na{ background:var(--kb-bg,#f7f7fb); }
#dos-root .note-card-head{ display:flex; align-items:center; gap:10px; cursor:pointer; text-decoration:none; color:inherit; padding:10px 0; }
#dos-root .note-card.is-open .note-card-head{ padding-bottom:6px; }
#dos-root .note-card-head:hover h4{ color:var(--kb-accent,#4f5bd5); }
#dos-root .note-card-head h4{ margin:0; font-size:16px; flex:1; color:var(--kb-ink,#23243a); }
#dos-root .note-caret{ font-size:11px; color:var(--kb-muted,#9a9ab0); width:12px; flex:0 0 auto; }
#dos-root .note-modbadge{ font-size:12px; font-weight:700; color:var(--kb-accent,#4f5bd5); background:rgba(79,91,213,.09); border-radius:999px; padding:2px 9px; white-space:nowrap; }
#dos-root .note-cnt{ font-size:11px; font-weight:800; color:var(--kb-muted,#888); background:var(--kb-bg,#eef0f6); border-radius:999px; padding:1px 8px; }
#dos-root .note-card-body{ margin-top:4px; padding-bottom:6px; }
#dos-root .note-na-tag{ font-size:10.5px; font-weight:700; color:var(--kb-muted,#999); background:var(--kb-border,#ececf3); border-radius:999px; padding:1px 8px; vertical-align:middle; }
#dos-root .note-avg{ font-size:13px; font-weight:700; color:var(--kb-muted,#777); white-space:nowrap; }
#dos-root .note-60{ display:inline-flex; align-items:baseline; gap:1px; font-weight:800; border-radius:7px; padding:2px 9px; font-size:15px; }
#dos-root .note-60 small{ font-size:10px; font-weight:700; opacity:.7; }
#dos-root .note-60.note-ok{ background:#e3f3ea; color:#1d7a48; }
#dos-root .note-60.note-low{ background:#fbe4e0; color:#b3432d; }
/* Modul-Tracker */
#dos-root .mod-track{ margin:10px 0 12px; padding:10px 12px; background:var(--kb-bg,#f4f5fb); border-radius:11px; }
#dos-root .mod-status{ font-size:13px; color:var(--kb-ink,#33344c); }
#dos-root .mod-chips{ display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; }
#dos-root .mod-chip{ width:34px; height:34px; border-radius:9px; border:1.5px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); font-weight:800; font-size:13.5px; cursor:pointer; color:var(--kb-muted,#9a9ab0); transition:.1s; }
#dos-root .mod-chip.mod-done{ background:#2e9e5b; border-color:#2e9e5b; color:#fff; }
#dos-root .mod-chip.mod-current{ border-color:var(--kb-accent,#4f5bd5); color:var(--kb-accent,#4f5bd5); box-shadow:0 0 0 2px rgba(79,91,213,.18); }
#dos-root .mod-chip:hover{ transform:translateY(-1px); }
#dos-root .mod-more{ width:34px; height:34px; border-radius:9px; border:1.5px dashed var(--kb-border,#cfd0de); background:transparent; font-weight:800; cursor:pointer; color:var(--kb-muted,#9a9ab0); }
/* Noten-Zeilen + Eingabe */
#dos-root .note-rows{ margin:6px 0 4px; display:flex; flex-direction:column; gap:5px; }
#dos-root .note-row{ display:flex; align-items:center; gap:10px; padding:6px 4px; border-bottom:1px solid var(--kb-border,#f0f0f6); }
#dos-root .note-row-lbl{ flex:1; font-size:13.5px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#dos-root .note-raw{ font-size:13px; color:var(--kb-muted,#666); font-variant-numeric:tabular-nums; }
#dos-root .note-arrow{ color:var(--kb-muted,#bbb); }
#dos-root .note-del{ border:0; background:transparent; cursor:pointer; opacity:.5; font-size:13px; }
#dos-root .note-del:hover{ opacity:1; }
#dos-root .note-add{ display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:10px; }
#dos-root .note-in{ border:1px solid var(--kb-border,#dcdce6); border-radius:8px; padding:7px 10px; font:inherit; font-size:13.5px; }
#dos-root .note-in-lbl{ flex:1; min-width:120px; }
#dos-root .note-in-num{ width:78px; }
#dos-root .note-of{ font-size:13px; color:var(--kb-muted,#777); }
#dos-root .note-foot{ display:flex; flex-wrap:wrap; gap:10px 22px; margin-top:8px; padding:14px 16px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:13px; }
#dos-root .note-foot-item{ font-size:14px; font-weight:700; color:var(--kb-ink,#23243a); display:flex; align-items:center; gap:8px; }
`;

/* === Lehrplan-Rubrik (KB_MATHE) — Mathe-Jahresprogramm 5ᵉ PF === */
var MATHE_CSS = `
#kb-mathe{ --mc:#6C4CE0; --mc2:#9B7BFF; --tc:#6C4CE0; }
#kb-mathe .mth-wrap{ max-width:1010px; margin:0 auto; padding:20px 20px 70px; }
#kb-mathe .mfrac{ display:inline-flex; flex-direction:column; text-align:center; vertical-align:middle; margin:0 3px; line-height:1.02; font-weight:700; }
#kb-mathe .mfrac .mnum{ border-bottom:2px solid currentColor; padding:0 4px 1px; }
#kb-mathe .mfrac .mden{ padding:1px 4px 0; }

/* Hero */
#kb-mathe .mth-hero{ position:relative; overflow:hidden; border-radius:22px; padding:30px 34px; color:#fff;
  background:linear-gradient(135deg,#6C4CE0 0%,#8B3FC4 55%,#B4308A 100%); box-shadow:0 16px 40px rgba(96,48,160,.28); }
#kb-mathe .mth-hero::after{ content:"➗ ✕ π √ ∡ %"; position:absolute; right:-6px; bottom:-14px; font-size:74px; opacity:.10; letter-spacing:10px; white-space:nowrap; }
#kb-mathe .mth-hero-badge{ display:inline-block; font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; background:rgba(255,255,255,.22); padding:5px 12px; border-radius:999px; }
#kb-mathe .mth-hero h1{ margin:12px 0 2px; font-size:31px; font-weight:900; line-height:1.1; }
#kb-mathe .mth-hero-sub{ font-size:16px; font-weight:700; opacity:.92; }
#kb-mathe .mth-hero-facts{ display:flex; flex-wrap:wrap; gap:8px 14px; margin-top:16px; }
#kb-mathe .mth-hero-facts span{ font-size:12.5px; font-weight:600; background:rgba(255,255,255,.16); padding:6px 11px; border-radius:9px; backdrop-filter:blur(2px); }

/* Hinweis / Anleitung */
#kb-mathe .mth-note{ margin-top:20px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-left:5px solid var(--mc); border-radius:14px; padding:16px 20px; }
#kb-mathe .mth-note-t{ font-weight:800; font-size:15px; margin-bottom:6px; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-note ul{ margin:0; padding-left:20px; }
#kb-mathe .mth-note li{ margin:7px 0; font-size:14px; line-height:1.55; color:var(--kb-ink,#33344a); }
#kb-mathe .mth-legend{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
#kb-mathe .mth-lg{ font-size:12.5px; font-weight:600; padding:6px 11px; border-radius:9px; }
#kb-mathe .mth-lg-basis{ background:#e7f7ee; color:#1a7a48; } #kb-mathe .mth-lg-kern{ background:#fdf3d9; color:#9a6b12; } #kb-mathe .mth-lg-plus{ background:#e6effd; color:#1d5fb0; }

/* Original-PDF */
#kb-mathe .mth-pdf{ display:flex; align-items:center; gap:16px; margin-top:16px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:14px; padding:14px 18px; }
#kb-mathe .mth-pdf-ic{ font-size:30px; }
#kb-mathe .mth-pdf-x{ flex:1; min-width:0; }
#kb-mathe .mth-pdf-t{ font-weight:800; font-size:15px; }
#kb-mathe .mth-pdf-s{ font-size:12.5px; color:var(--kb-muted,#777); }
#kb-mathe .mth-pdf-b{ display:flex; gap:8px; flex-wrap:wrap; }

/* Buttons */
#kb-mathe .mth-btn{ appearance:none; border:1px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); color:var(--kb-ink,#23243a); font-weight:700; font-size:13.5px; padding:9px 15px; border-radius:11px; cursor:pointer; transition:.15s; font-family:inherit; }
#kb-mathe .mth-btn:hover{ border-color:var(--mc); color:var(--mc); transform:translateY(-1px); }
#kb-mathe .mth-btn-p{ background:var(--mc); border-color:var(--mc); color:#fff; }
#kb-mathe .mth-btn-p:hover{ color:#fff; filter:brightness(1.06); }
#kb-mathe .mth-btn-dl{ background:color-mix(in srgb, var(--mc) 12%, #fff); border-color:var(--mc); color:var(--mc); }
#kb-mathe .mth-btn-dl:hover{ background:var(--mc); color:#fff; transform:translateY(-1px); }
#kb-mathe .mth-abpair{ display:inline-flex; align-items:stretch; }
#kb-mathe .mth-abpair .mth-ab:first-child{ border-top-right-radius:0; border-bottom-right-radius:0; }
#kb-mathe .mth-abpair .mth-abdl{ border-top-left-radius:0; border-bottom-left-radius:0; border-left:0; padding:9px 10px; color:var(--mc); }
#kb-mathe .mth-abpair .mth-btn:hover{ transform:none; }
#kb-mathe .mth-btn.on{ background:var(--mc); border-color:var(--mc); color:#fff; }
#kb-mathe .mth-donebtn.on{ background:#1a7a48; border-color:#1a7a48; color:#fff; }

/* Jahresübersicht */
#kb-mathe .mth-h2{ margin:28px 4px 12px; font-size:20px; font-weight:900; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-modules{ display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; }
#kb-mathe .mth-mcard{ text-align:left; cursor:pointer; border:none; border-radius:18px; padding:2px; background:linear-gradient(135deg,var(--mc),var(--mc2)); box-shadow:0 8px 22px rgba(60,40,120,.14); transition:.18s; font-family:inherit; }
#kb-mathe .mth-mcard:hover{ transform:translateY(-3px); box-shadow:0 14px 30px rgba(60,40,120,.22); }
#kb-mathe .mth-mcard>*{ }
#kb-mathe .mth-mcard{ color:#fff; }
#kb-mathe .mth-mcard-inner{}
#kb-mathe .mth-mcard-top{ display:flex; justify-content:space-between; align-items:center; padding:16px 18px 0; }
#kb-mathe .mth-mnr{ font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; background:rgba(255,255,255,.22); padding:4px 10px; border-radius:999px; }
#kb-mathe .mth-mico{ font-size:26px; }
#kb-mathe .mth-mtitle{ padding:10px 18px 0; font-size:19px; font-weight:900; line-height:1.15; }
#kb-mathe .mth-munter{ padding:5px 18px 0; font-size:13px; opacity:.92; line-height:1.4; }
#kb-mathe .mth-chips{ display:flex; flex-wrap:wrap; gap:6px; padding:12px 18px 0; }
#kb-mathe .mth-chip{ font-size:11.5px; font-weight:700; background:rgba(255,255,255,.18); padding:4px 9px; border-radius:8px; }
#kb-mathe .mth-mprog{ display:flex; align-items:center; gap:9px; padding:14px 18px 16px; }
#kb-mathe .mth-mbar{ flex:1; height:8px; border-radius:999px; background:rgba(255,255,255,.28); overflow:hidden; }
#kb-mathe .mth-mbar i{ display:block; height:100%; background:#fff; border-radius:999px; }
#kb-mathe .mth-mprog span{ font-size:12px; font-weight:800; white-space:nowrap; }
#kb-mathe .mth-footnote{ margin:22px 4px 0; font-size:12.5px; color:var(--kb-muted,#888); font-style:italic; }

/* Zurück / Modulkopf */
#kb-mathe .mth-back{ appearance:none; border:none; background:none; color:var(--mc); font-weight:800; font-size:14px; cursor:pointer; padding:4px 0; margin-bottom:8px; font-family:inherit; }
#kb-mathe .mth-back:hover{ text-decoration:underline; }
#kb-mathe .mth-modhead{ display:flex; gap:18px; align-items:flex-start; border-radius:20px; padding:24px 26px; color:#fff; background:linear-gradient(135deg,var(--mc),var(--mc2)); box-shadow:0 12px 30px rgba(60,40,120,.2); }
#kb-mathe .mth-modhead-ic{ font-size:42px; line-height:1; }
#kb-mathe .mth-modhead-nr{ font-size:12px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; opacity:.9; }
#kb-mathe .mth-modhead h1{ margin:3px 0 6px; font-size:26px; font-weight:900; line-height:1.12; }
#kb-mathe .mth-modhead p{ margin:0; font-size:14px; opacity:.94; line-height:1.5; }
#kb-mathe .mth-mprog-lg{ padding:14px 0 0; }
#kb-mathe .mth-mprog-lg .mth-mbar{ max-width:340px; }

/* Themen + Lektionsliste */
#kb-mathe .mth-theme{ margin-top:22px; }
#kb-mathe .mth-theme-head{ display:flex; align-items:center; gap:12px; margin:0 2px 10px; flex-wrap:wrap; }
#kb-mathe .mth-theme-ic{ font-size:24px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px; background:color-mix(in srgb, var(--tc) 14%, #fff); }
#kb-mathe .mth-theme-hx{ flex:1; min-width:170px; }
#kb-mathe .mth-theme-t{ font-size:18px; font-weight:900; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-theme-z{ font-size:12.5px; color:var(--kb-muted,#888); margin-top:1px; }
#kb-mathe .mth-theme-dl{ display:flex; gap:8px; flex-wrap:wrap; margin-left:auto; }
#kb-mathe .mth-btn-sm{ font-size:12.5px; padding:7px 11px; border-radius:9px; }
#kb-mathe .mth-theme-dl .mth-btn-p{ --mc:var(--tc); }
#kb-mathe .mth-theme-dl .mth-btn-dl{ --mc:var(--tc); }
#kb-mathe .mth-lrows{ display:flex; flex-direction:column; gap:9px; }
#kb-mathe .mth-lrow{ display:flex; align-items:center; gap:14px; text-align:left; cursor:pointer; width:100%; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-left:4px solid var(--tc); border-radius:13px; padding:13px 16px; transition:.15s; font-family:inherit; }
#kb-mathe .mth-lrow:hover{ transform:translateX(3px); box-shadow:0 6px 16px rgba(60,40,120,.1); border-color:var(--tc); }
#kb-mathe .mth-lrow.is-done{ background:color-mix(in srgb, var(--tc) 5%, #fff); }
#kb-mathe .mth-lrow-nr{ flex:0 0 34px; height:34px; border-radius:9px; background:color-mix(in srgb, var(--tc) 14%, #fff); color:var(--tc); font-weight:900; font-size:16px; display:flex; align-items:center; justify-content:center; }
#kb-mathe .mth-lrow-x{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
#kb-mathe .mth-lrow-t{ font-weight:800; font-size:15px; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-lrow-goal{ font-size:12.5px; color:var(--kb-muted,#7a7a88); }
#kb-mathe .mth-lrow-d{ font-size:11.5px; font-weight:700; color:var(--kb-muted,#999); white-space:nowrap; }
#kb-mathe .mth-lrow-chk{ flex:0 0 24px; height:24px; border-radius:50%; border:2px solid var(--kb-border,#dcdce6); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:13px; }
#kb-mathe .mth-lrow.is-done .mth-lrow-chk{ background:#1a7a48; border-color:#1a7a48; }

/* Lektion */
#kb-mathe .mth-lbar{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
#kb-mathe .mth-lbar-b{ display:flex; gap:8px; flex-wrap:wrap; }
#kb-mathe .mth-crumb{ font-size:12.5px; font-weight:700; color:var(--tc); text-transform:uppercase; letter-spacing:.04em; }
#kb-mathe .mth-ltitle{ margin:4px 0 14px; font-size:27px; font-weight:900; line-height:1.14; color:var(--kb-ink,#20213a); }
#kb-mathe .mth-goal{ background:linear-gradient(135deg, color-mix(in srgb,var(--mc) 12%,#fff), color-mix(in srgb,var(--mc2) 10%,#fff)); border:1px solid color-mix(in srgb,var(--mc) 26%,#fff); border-radius:14px; padding:13px 18px; font-size:15.5px; line-height:1.5; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-meta{ display:flex; flex-wrap:wrap; gap:8px 16px; margin:14px 2px 0; }
#kb-mathe .mth-meta-i{ font-size:13px; font-weight:600; color:var(--kb-muted,#666); }
#kb-mathe .mth-voc-wrap{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:12px 0 0; }
#kb-mathe .mth-voc-lbl{ font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--kb-muted,#999); }
#kb-mathe .mth-voc{ font-size:12.5px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:9px; padding:5px 10px; }
#kb-mathe .mth-voc b{ color:var(--kb-ink,#23243a); } #kb-mathe .mth-voc i{ color:var(--kb-muted,#999); font-style:normal; margin-left:6px; }

#kb-mathe .mth-sec{ margin-top:22px; }
#kb-mathe .mth-sec-h{ font-size:16px; font-weight:900; color:var(--kb-ink,#23243a); margin-bottom:11px; padding-bottom:6px; border-bottom:2px solid color-mix(in srgb,var(--tc) 20%,#eee); }
#kb-mathe .mth-sec-start{ background:#fff8ed; border:1px solid #f2dcb5; border-radius:14px; padding:14px 18px; }
#kb-mathe .mth-sec-start .mth-sec-h{ border:none; padding:0; margin-bottom:6px; color:#9a6b12; }
#kb-mathe .mth-sec-start p{ margin:0; font-size:14.5px; line-height:1.55; }

/* Erklär-Schritte */
#kb-mathe .mth-steps{ display:flex; flex-direction:column; gap:12px; }
#kb-mathe .mth-step{ display:flex; gap:14px; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:14px; padding:14px 16px; }
#kb-mathe .mth-step-n{ flex:0 0 30px; height:30px; border-radius:50%; background:var(--mc); color:#fff; font-weight:900; font-size:15px; display:flex; align-items:center; justify-content:center; }
#kb-mathe .mth-step-x{ flex:1; min-width:0; }
#kb-mathe .mth-step-t{ font-weight:800; font-size:15px; margin-bottom:3px; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-step-txt{ font-size:14.5px; line-height:1.55; color:var(--kb-ink,#33344a); }
#kb-mathe .mth-ex{ margin-top:9px; background:color-mix(in srgb,var(--mc) 7%,#fff); border-left:3px solid var(--mc); border-radius:8px; padding:9px 13px; font-size:14.5px; line-height:1.55; }
#kb-mathe .mth-ex span{ display:inline-block; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--mc); margin-right:6px; }

/* Merksatz */
#kb-mathe .mth-merk{ display:flex; gap:14px; margin-top:20px; background:linear-gradient(135deg,#fffdf5,#fff8e8); border:2px dashed #e6c65c; border-radius:16px; padding:16px 20px; }
#kb-mathe .mth-merk-ic{ font-size:26px; }
#kb-mathe .mth-merk-t{ font-size:12px; font-weight:900; text-transform:uppercase; letter-spacing:.07em; color:#9a6b12; margin-bottom:3px; }
#kb-mathe .mth-merk{ font-size:15.5px; line-height:1.55; font-weight:600; color:#4a3d13; }

/* Aufgabenlisten */
#kb-mathe .mth-tasks{ margin:0; padding-left:22px; }
#kb-mathe .mth-tasks li{ margin:11px 0; }
#kb-mathe .mth-task-q{ font-size:14.5px; line-height:1.5; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-solbtn{ appearance:none; margin-top:6px; border:1px solid var(--kb-border,#dcdce6); background:var(--kb-bg,#f6f6fb); color:var(--kb-muted,#777); font-weight:700; font-size:12px; padding:3px 11px; border-radius:8px; cursor:pointer; font-family:inherit; }
#kb-mathe .mth-solbtn:hover{ border-color:#1a7a48; color:#1a7a48; }
#kb-mathe .mth-solbtn.on{ background:#1a7a48; border-color:#1a7a48; color:#fff; }
#kb-mathe .mth-sol{ display:none; margin-top:6px; background:#eef8f1; border-left:3px solid #1a7a48; border-radius:8px; padding:8px 13px; font-size:14px; line-height:1.5; color:#175f39; }
#kb-mathe .mth-sol.open{ display:block; }
#kb-mathe .mth-lesson.allsol .mth-sol{ display:block; }
#kb-mathe .mth-lesson.allsol .mth-solbtn{ display:none; }

/* Drei Niveaus */
#kb-mathe .mth-levels{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
#kb-mathe .mth-level{ border:1px solid var(--kb-border,#ececf3); border-top:4px solid #ccc; border-radius:14px; padding:12px 15px 6px; background:var(--kb-surface,#fff); }
#kb-mathe .mth-level-basis{ border-top-color:#2aa85f; } #kb-mathe .mth-level-kern{ border-top-color:#e0a821; } #kb-mathe .mth-level-plus{ border-top-color:#2d78d6; }
#kb-mathe .mth-level-h{ font-size:15px; font-weight:900; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-level-h span{ display:block; font-size:11.5px; font-weight:600; color:var(--kb-muted,#999); margin-top:1px; }
#kb-mathe .mth-level-hint{ font-size:12.5px; font-style:italic; color:var(--kb-muted,#888); margin:6px 0 0; }
#kb-mathe .mth-level .mth-tasks{ padding-left:20px; }
#kb-mathe .mth-level .mth-tasks li{ margin:9px 0; }

/* Exit / Tipp / Spiel */
#kb-mathe .mth-exit{ margin-top:22px; background:color-mix(in srgb,var(--mc) 9%,#fff); border:1px solid color-mix(in srgb,var(--mc) 22%,#fff); border-radius:14px; padding:14px 18px; font-size:14.5px; line-height:1.55; }
#kb-mathe .mth-exit-t{ font-weight:900; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--mc); margin-bottom:4px; }
#kb-mathe .mth-tip{ margin-top:14px; background:#f3f7ff; border:1px dashed #b8c8e8; border-radius:14px; padding:13px 18px; font-size:14px; line-height:1.55; color:#33405c; }
#kb-mathe .mth-tip-t{ font-weight:900; font-size:12.5px; color:#2d5296; margin-bottom:3px; }
#kb-mathe .mth-spiel{ margin-top:12px; background:#fef4fb; border:1px dashed #eabbdd; border-radius:14px; padding:13px 18px; font-size:14px; line-height:1.55; color:#6a2a58; }
#kb-mathe .mth-spiel-t{ font-weight:900; font-size:12.5px; color:#a53384; margin-bottom:3px; }

/* Bild / Visualisierung */
#kb-mathe .mth-visual{ margin:16px auto; text-align:center; }
#kb-mathe .mth-visual-in{ display:inline-block; padding:14px 18px; background:#fbfbfe; border:1px solid var(--kb-border,#ececf3); border-radius:14px; max-width:100%; }
#kb-mathe .mth-svg{ display:block; max-width:100%; height:auto; }
#kb-mathe .mth-visual-cap{ font-size:13px; color:var(--kb-muted,#777); margin-top:7px; }

/* Musteraufgabe */
#kb-mathe .mth-muster{ border:1px solid color-mix(in srgb,var(--mc) 30%,#fff); background:color-mix(in srgb,var(--mc) 6%,#fff); border-radius:14px; padding:14px 18px; }
#kb-mathe .mth-muster-q{ font-weight:800; font-size:15px; margin-bottom:8px; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-muster-s{ margin:0; padding-left:22px; }
#kb-mathe .mth-muster-s li{ margin:5px 0; font-size:14.5px; line-height:1.5; }
#kb-mathe .mth-muster-e{ margin-top:8px; font-weight:800; color:var(--mc); font-size:15px; }
#kb-mathe .mth-muster{ margin-bottom:10px; }
#kb-mathe .mth-muster-tl{ font-weight:800; font-size:12.5px; color:var(--mc); margin-bottom:3px; }
#kb-mathe .mth-def{ background:color-mix(in srgb,var(--mc) 8%,#fff); border:1px solid color-mix(in srgb,var(--mc) 28%,#fff); border-radius:12px; padding:12px 16px; margin:14px 0; font-size:15px; line-height:1.55; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-def-b{ display:block; font-weight:900; color:var(--mc); margin-bottom:2px; }
#kb-mathe .mth-vorgehen{ margin:0; padding-left:24px; }
#kb-mathe .mth-vorgehen li{ margin:6px 0; font-size:14.5px; line-height:1.55; color:var(--kb-ink,#33344a); }

/* Druck-Buttons */
#kb-mathe .mth-ab{ font-size:13px; padding:9px 12px; }
#kb-mathe .mth-solprint.on{ background:#1a7a48; border-color:#1a7a48; color:#fff; }

/* Aufgaben-Generator */
#kb-mathe .mth-genwrap{ border:2px solid color-mix(in srgb,var(--mc) 30%,#fff); background:color-mix(in srgb,var(--mc) 5%,#fff); border-radius:16px; padding:16px 18px; }
#kb-mathe .mth-gtitle{ font-size:16px; font-weight:900; color:var(--mc); margin-bottom:12px; }
#kb-mathe .mth-gbar, #kb-mathe .mth-gbar2, #kb-mathe .mth-curated{ display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
#kb-mathe .mth-gbar2{ margin-top:10px; }
#kb-mathe .mth-glbl{ font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--kb-muted,#999); margin-right:2px; }
#kb-mathe .mth-gbar .mth-glbl:not(:first-child){ margin-left:10px; }
#kb-mathe .mth-gchip{ appearance:none; border:1.5px solid var(--kb-border,#dcdce6); background:var(--kb-surface,#fff); color:var(--kb-ink,#33344a); font-weight:700; font-size:13px; padding:7px 13px; border-radius:999px; cursor:pointer; font-family:inherit; transition:.14s; }
#kb-mathe .mth-gchip:hover{ border-color:var(--mc); }
#kb-mathe .mth-gchip.on{ background:var(--mc); border-color:var(--mc); color:#fff; }
#kb-mathe .mth-gsol.on{ background:#1a7a48; border-color:#1a7a48; color:#fff; }
#kb-mathe .mth-ghint{ font-size:12.5px; color:var(--kb-muted,#888); font-style:italic; margin:11px 0 6px; }
#kb-mathe .mth-gprev{ display:grid; grid-template-columns:1fr 1fr; gap:8px 14px; margin-top:8px; }
#kb-mathe .mth-gcard{ display:flex; gap:9px; align-items:flex-start; background:var(--kb-surface,#fff); border:1px solid var(--kb-border,#ececf3); border-radius:10px; padding:8px 11px; }
#kb-mathe .mth-gnum{ flex:0 0 22px; height:22px; border-radius:50%; background:color-mix(in srgb,var(--mc) 16%,#fff); color:var(--mc); font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center; margin-top:1px; }
#kb-mathe .mth-gq{ font-size:14px; font-weight:600; color:var(--kb-ink,#23243a); line-height:1.5; }
#kb-mathe .mth-ga{ margin-top:3px; color:#1a7a48; font-size:13px; font-weight:700; }
#kb-mathe .mth-curated{ margin-top:14px; padding-top:12px; border-top:1px dashed var(--kb-border,#e2e2ec); }
@media (max-width:560px){ #kb-mathe .mth-gprev{ grid-template-columns:1fr; } }

/* Ganzes Modul als Heft drucken */
#kb-mathe .mth-modprint{ margin:16px 0 6px; border:2px solid color-mix(in srgb,var(--mc) 32%,#fff); background:color-mix(in srgb,var(--mc) 6%,#fff); border-radius:16px; padding:16px 18px; }
#kb-mathe .mth-modprint-t{ font-size:16px; font-weight:900; color:var(--mc); margin-bottom:11px; }
#kb-mathe .mth-modprint-b{ display:flex; flex-wrap:wrap; align-items:center; gap:9px; }

/* Vor/Zurück */
#kb-mathe .mth-nav{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:30px; padding-top:18px; border-top:1px solid var(--kb-border,#ececf3); }

@media (max-width:640px){
  #kb-mathe .mth-hero{ padding:22px 20px; } #kb-mathe .mth-hero h1{ font-size:25px; }
  #kb-mathe .mth-ltitle{ font-size:22px; } #kb-mathe .mth-modhead{ flex-direction:column; gap:10px; }
  #kb-mathe .mth-lbar-b{ width:100%; }
}
`;

/* Noten & Module pro Schüler/Fach. Noten auf /60 (LU), automatische
   Umrechnung „erreicht von X" -> /60; Module-Fortschritt je Schulfach. */
var NOTEN_MODULE = `
window.KB_NOTEN=(function(){
  var LS='klassebuch_noten_v1';
  function loadAll(){try{var r=localStorage.getItem(LS);if(r)return JSON.parse(r)||{};}catch(e){}return {};}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  var data=loadAll();var hooks=[];
  function rec(sid){var r=data[sid];if(!r){r={mode:'semester',grades:[],modules:{}};data[sid]=r;}if(!r.grades)r.grades=[];if(!r.modules)r.modules={};if(!r.mode)r.mode='semester';return r;}
  function notify(sid){saveAll(data);for(var i=0;i<hooks.length;i++){try{hooks[i](sid);}catch(e){}}}
  function nid(){return 'gr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
  function norm(g){var m=+g.max;return (m>0)?(+g.points/m*60):0;}
  function periodsFor(mode){return mode==='trimester'?['T1','T2','T3']:['S1','S2'];}
  function listOf(sid,subject,period){return rec(sid).grades.filter(function(g){return (!subject||g.subject===subject)&&(!period||g.period===period);});}
  function subjAvg(sid,subject,period){var gs=listOf(sid,subject,period);if(!gs.length)return null;var s=0;for(var i=0;i<gs.length;i++)s+=norm(gs[i]);return s/gs.length;}
  function modOf(sid,subject){var r=rec(sid);var m=r.modules[subject];if(!m){m={done:0,cap:8};r.modules[subject]=m;}if(typeof m.done!=='number')m.done=0;if(typeof m.cap!=='number')m.cap=8;return m;}
  return {
    periodsFor:periodsFor, norm:norm, list:listOf, subjectAvg:subjAvg,
    getMode:function(sid){return rec(sid).mode;},
    setMode:function(sid,m){var r=rec(sid);var nm=(m==='trimester'?'trimester':'semester');if(r.mode!==nm){r.mode=nm;r.updatedAt=new Date().toISOString();notify(sid);}},
    add:function(sid,o){var r=rec(sid);r.grades.push({id:nid(),subject:o.subject||'',period:o.period||'S1',label:(o.label||'').trim(),points:+o.points||0,max:(+o.max>0?+o.max:60),date:new Date().toISOString().slice(0,10)});r.updatedAt=new Date().toISOString();notify(sid);},
    remove:function(sid,id){var r=rec(sid);r.grades=r.grades.filter(function(g){return g.id!==id;});r.updatedAt=new Date().toISOString();notify(sid);},
    periodAvg:function(sid,period,subjects){var avgs=[];(subjects||[]).forEach(function(su){var a=subjAvg(sid,su,period);if(a!=null)avgs.push(a);});if(!avgs.length)return null;var s=0;for(var i=0;i<avgs.length;i++)s+=avgs[i];return s/avgs.length;},
    moduleOf:function(sid,subject){return modOf(sid,subject);},
    setModule:function(sid,subject,n){var m=modOf(sid,subject);n=Math.max(0,n|0);if(m.done!==n){m.done=n;if(m.cap<n+2)m.cap=n+2;rec(sid).updatedAt=new Date().toISOString();notify(sid);}},
    addCap:function(sid,subject,by){var m=modOf(sid,subject);m.cap=Math.min(99,m.cap+(by||4));notify(sid);},
    totalModules:function(sid,subjects){var t=0,r=rec(sid);if(subjects){subjects.forEach(function(su){if(r.modules[su])t+=(r.modules[su].done||0);});}else{for(var k in r.modules)t+=(r.modules[k].done||0);}return t;},
    onChange:function(fn){hooks.push(fn);},
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,mode:r.mode||'semester',grades:r.grades||[],modules:r.modules||{},updatedAt:r.updatedAt||''});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){data[r.id]={mode:r.mode||'semester',grades:r.grades||[],modules:r.modules||{},updatedAt:r.updatedAt||''};});saveAll(data);for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  };
})();
`;

/* Wochen-Bericht: lädt eine übersichtliche Datei mit ALLEM Neuen der
   letzten 5 Wochen herunter (Réunionen, Ziele, Dossier, Noten, Absenzen,
   Screenings, Notizen) — damit nie etwas verloren geht. */
var WEEKLY_MODULE = `
window.KB_WEEKLY=(function(){
  function pad(n){return n<10?'0'+n:''+n;}
  function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function mondayOf(d){d=new Date(d);var g=(d.getDay()+6)%7;d.setDate(d.getDate()-g);d.setHours(0,0,0,0);return d;}
  function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
  function fmtD(s){var p=String(s).split('-');return (p.length===3)?(p[2]+'.'+p[1]+'.'+p[0]):s;}
  function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c];});}
  function nl2br(s){return esc(s).split(String.fromCharCode(10)).join('<br>');}
  function nameMap(){var m={};try{(window.KB_ROSTER?KB_ROSTER.list():[]).forEach(function(s){m[s.id]=s.name;});}catch(e){}return m;}
  function nameOf(m,id){return m[id]||id||'—';}

  function build(){
    var students=nameMap();
    var today=new Date(), m0=mondayOf(today), wks=[];
    for(var i=0;i<5;i++){var mo=addDays(m0,-7*i);wks.push({lo:iso(mo),hi:iso(addDays(mo,6))});}
    function weekOf(ds){if(!ds)return -1;for(var i=0;i<wks.length;i++){if(ds>=wks[i].lo&&ds<=wks[i].hi)return i;}return -1;}
    var buckets=wks.map(function(){return {};});
    function push(wi,cat,line){if(wi<0)return;(buckets[wi][cat]=buckets[wi][cat]||[]).push(line);}

    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportEntries():[]).forEach(function(e){var wi=weekOf(e.date);if(wi<0)return;var cat=(e.category==='Team-Réunion')?'Réunion-Beiträge':'Dossier-Einträge';var by=e.author?(' <em>(von '+esc(e.author)+')</em>'):'';push(wi,cat,'<div class="it"><div class="ih"><b>'+esc(nameOf(students,e.studentId))+'</b>'+by+' · '+fmtD(e.date)+((e.category&&e.category!=='Team-Réunion')?(' · '+esc(e.category)):'')+'</div><div class="tx">'+nl2br(e.text||'')+'</div></div>');});}catch(e){}
    try{(window.KB_DOS_SYNC?KB_DOS_SYNC.exportReunions():[]).forEach(function(r){var wi=weekOf(r.date);if(wi<0)return;var g=r.goals||{};Object.keys(g).forEach(function(sid){var arr=g[sid]||[];if(!arr.length)return;var who=(sid==='group')?'Gruppe':esc(nameOf(students,sid));push(wi,'Wochenziele','<div class="it"><div class="ih"><b>'+who+'</b> · '+fmtD(r.date)+'</div><div class="tx">'+arr.map(function(x){return '• '+esc(x);}).join('<br>')+'</div></div>');});});}catch(e){}
    try{(window.KB_NOTEN?KB_NOTEN.syncExport():[]).forEach(function(r){(r.grades||[]).forEach(function(g){var wi=weekOf(g.date);if(wi<0)return;var n60=(+g.max>0?(+g.points/+g.max*60):0);push(wi,'Noten','<div class="it2">'+fmtD(g.date)+' · <b>'+esc(nameOf(students,r.id))+'</b> · '+esc(g.subject||'')+(g.label?(' ('+esc(g.label)+')'):'')+': '+(+g.points)+'/'+(+g.max)+' → '+(Math.round(n60*10)/10).toString().replace('.',',')+'/60</div>');});});}catch(e){}
    try{if(window.KB_SCREENING&&KB_SCREENING.history){(window.KB_ROSTER?KB_ROSTER.list():[]).forEach(function(s){(KB_SCREENING.history(s.id)||[]).forEach(function(h){var wi=weekOf(h.date);if(wi<0)return;var mu=(h.muster||[]).map(function(x){return (x&&x.name)?x.name:x;}).join(' · ');var risk=h.acute?'akute Krise':(h.risk?'Risiko':'');push(wi,'Screenings','<div class="it2">'+fmtD(h.date)+' · <b>'+esc(s.name)+'</b>'+(risk?(' · '+risk):'')+(mu?(' · '+esc(mu)):'')+'</div>');});});}}catch(e){}
    try{(window.KB_ANW?KB_ANW.exportEntries():[]).forEach(function(e){var wi=weekOf(e.date);if(wi<0)return;var lab=(window.KB_ANW.statusLabel?KB_ANW.statusLabel(e.status):e.status);push(wi,'Absenzen','<div class="it2">'+fmtD(e.date)+' · <b>'+esc(nameOf(students,e.studentId))+'</b> · '+esc(lab)+(e.subject?(' · '+esc(e.subject)):'')+(e.byUser?(' <em>('+esc(e.byUser)+')</em>'):'')+'</div>');});}catch(e){}
    try{(window.KB_ANW?KB_ANW.exportNotes():[]).forEach(function(n){var wi=weekOf(n.date);if(wi<0)return;push(wi,'Klassenbuch-Notizen','<div class="it"><div class="ih"><b>'+esc(n.type||'Notiz')+'</b> · '+fmtD(n.date)+(n.subject?(' · '+esc(n.subject)):'')+(n.byUser?(' <em>(von '+esc(n.byUser)+')</em>'):'')+'</div><div class="tx">'+nl2br(n.text||'')+'</div></div>');});}catch(e){}

    var CATS=['Réunion-Beiträge','Wochenziele','Noten','Screenings','Dossier-Einträge','Absenzen','Klassenbuch-Notizen'];
    var body='';
    wks.forEach(function(wk,wi){
      body+='<section class="wk"><h2>Woche '+fmtD(wk.lo)+' – '+fmtD(wk.hi)+'</h2>';
      var keys=CATS.filter(function(c){return buckets[wi][c]&&buckets[wi][c].length;});
      if(!keys.length){body+='<p class="empty">Keine neuen Einträge in dieser Woche.</p>';}
      else{keys.forEach(function(cat){var arr=buckets[wi][cat];body+='<h3>'+cat+' <span class="cnt">'+arr.length+'</span></h3>'+arr.join('');});}
      body+='</section>';
    });
    var css='body{font-family:Inter,Segoe UI,Arial,sans-serif;color:#23243a;max-width:900px;margin:24px auto;padding:0 22px;line-height:1.5}h1{font-size:24px;margin:0 0 2px}.sub{color:#777;margin:0 0 22px;font-size:13.5px}.wk{margin:0 0 30px;border-top:3px solid #4f5bd5;padding-top:10px}.wk h2{font-size:18px;margin:0 0 10px;color:#3b3f8f}h3{font-size:14px;margin:16px 0 6px;color:#4f5bd5;border-bottom:1px solid #e6e6ef;padding-bottom:3px}.cnt{font-size:11px;background:#eef0fb;color:#4a4f86;border-radius:999px;padding:1px 8px;font-weight:700}.it{margin:6px 0;padding:8px 10px;background:#f7f8fc;border-radius:8px}.ih{font-size:13px;color:#444}.tx{margin-top:4px;font-size:13.5px;white-space:normal}.it2{font-size:13px;padding:3px 4px;border-bottom:1px solid #f0f0f6}.empty{color:#999;font-style:italic;font-size:13px}em{color:#4f5bd5;font-style:normal;font-weight:600}@media print{.wk{break-inside:avoid}}';
    return '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Klassebuch — Wochen-Bericht</title><style>'+css+'</style></head><body><h1>📘 Klassebuch — Wochen-Bericht</h1><p class="sub">Annexe Junglinster · erstellt am '+fmtD(iso(today))+' · letzte 5 Wochen · alle neuen Einträge</p>'+body+'</body></html>';
  }
  function download(){
    try{
      var html=build();
      var blob=new Blob([html],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=url;a.download='Klassebuch-Wochenbericht-'+iso(new Date())+'.html';
      document.body.appendChild(a);a.click();
      setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}a.remove();},200);
      return true;
    }catch(e){try{alert('Download fehlgeschlagen: '+(e&&e.message||e));}catch(_){}return false;}
  }
  return {build:build, download:download};
})();
`;

/* Anwesenheit: Schülerliste per Klick ein-/ausklappen (Horaire wird größer). */
var ANW_SIDE_TOGGLE = `
(function(){
  var KEY='anw_side_collapsed';
  function lay(){return document.querySelector('#anw-root .layout');}
  function setLabel(){var b=document.getElementById('anw-side-toggle');if(!b)return;var l=lay();var c=l&&l.classList.contains('side-collapsed');b.innerHTML=c?'☰ Schüler einblenden':'‹ Liste ausblenden';}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('#anw-side-toggle');if(!b)return;
    var l=lay();if(!l)return;
    var c=!l.classList.contains('side-collapsed');l.classList.toggle('side-collapsed',c);
    try{localStorage.setItem(KEY,c?'1':'');}catch(_){}
    setLabel();
  });
  function init(){var l=lay();if(!l){return setTimeout(init,250);}try{if(localStorage.getItem(KEY)==='1')l.classList.add('side-collapsed');}catch(_){}setLabel();}
  init();
})();
`;

/* ============================================================
   ISA-Journal — eigenständige Variante für ambulante Mitarbeiter (ISA/CDSE).
   Sämtliche Speicher-Schlüssel werden umbenannt, damit diese App ihre
   Daten VOLLSTÄNDIG getrennt vom Klassebuch hält (gleicher Origin →
   sonst würden localStorage/IndexedDB kollidieren).
   ============================================================ */
function isaNS(s){
  return s
    .split('cdse_dossier_db').join('isa_dossier_db')
    .split('cdse_dossier_v1_').join('isa_dossier_v1_')
    .split('klassebuch_roster_v1').join('isa_roster_v1')
    .split('klassebuch_bubble_v1').join('isa_bubble_v1')
    .split('klassebuch_screening_v1').join('isa_screening_v1')
    .split('klassebuch_sync_base').join('isa_sync_base')
    .split('klassebuch-sync').join('isa-sync')
    .split('klassebuch_extra_users').join('isa_extra_users')
    .split('savoir_plans').join('isa_savoir_plans')
    .split('anwesenheit_user').join('isa_user')
    .split('kb_side_collapsed').join('isa_side_collapsed')
    /* auch diese Schlüssel trennen – sonst unterdrückt die Tageskopie der einen App die der anderen (Fehler M6) */
    .split('klassebuch_backup_lastday').join('isa_backup_lastday')
    .split('kb_sync_auto').join('isa_sync_auto')
    .split('klassebuch_fenster').join('isa_fenster');
}
dosScript      = isaNS(dosScript);
/* ISA startet ohne Klassebuch-Seed (keine Beispiel-Schüler/-Einträge/-Réunionen). */
(function(){
  var i = dosScript.indexOf('window.SEED_DATA = {');
  if (i >= 0) {
    var nl = dosScript.indexOf('\n', i); if (nl < 0) nl = dosScript.length;
    dosScript = dosScript.slice(0, i) + 'window.SEED_DATA = {"students":[],"entries":[],"reunions":[],"reunionEntries":[]};' + dosScript.slice(nl);
  }
})();

/* ============================================================
   ISA-Notiz-Typen ("Fragestellungen"): jeder Typ blendet passende
   Leitfragen ein, sodass eine Notiz strukturiert entsteht. Der Typ ist
   zugleich die Kategorie (Farbe/Filter). 'Bericht (DS/PEI)' bleibt für
   den DS/PEI-Import erhalten. Zum Anpassen: diese Liste ändern + neu bauen.
   ============================================================ */
var ISA_NOTE_TYPES = [
  { key:'Krise / Vorfall', ic:'🚨', color:'hsl(4, 62%, 46%)', questions:[
    'Was ist passiert? (Situation, Auslöser)',
    'Wie wurde reagiert? (Intervention, Deeskalation)',
    'Wie hat der/die Schüler·in reagiert?',
    'Was hat geholfen — was nicht?',
    'Vereinbarung / nächster Schritt'
  ]},
  { key:'Fördereinheit', ic:'🎯', color:'hsl(150, 40%, 38%)', questions:[
    'Woran wurde gearbeitet? (Ziel / Thema)',
    'Vorgehen / Methode',
    'Mitarbeit & Reaktion',
    'Ergebnis / beobachteter Fortschritt'
  ]},
  { key:'Gespräch', ic:'💬', color:'hsl(206, 55%, 45%)', questions:[
    'Mit wem & aus welchem Anlass?',
    'Wichtigste Punkte',
    'Vereinbarungen / To-dos'
  ]},
  { key:'Netzwerk & Austausch', ic:'🔗', color:'hsl(195, 45%, 40%)', questions:[
    'Mit welcher Stelle? (ONE, Therapie, Schule …)',
    'Thema / Anliegen',
    'Ergebnis / weiteres Vorgehen'
  ]},
  { key:'Beobachtung', ic:'👀', color:'hsl(255, 35%, 52%)', questions:[
    'Situation / Kontext',
    'Konkrete Beobachtung',
    'Einordnung / Hypothese (optional)'
  ]},
  { key:'Allgemeine Notiz', ic:'📝', color:'hsl(210, 15%, 45%)', questions:[] }
];
/* Vorschlags-Bank: erkennt Förderdomänen in den Notiztexten (Stichwörter,
   LU/DE/FR) und schlägt professionell formulierte Fortschritte / Ziele vor.
   Zum Erweitern: hier eine Domäne ergänzen. */
var ISA_SUGGEST_BANK = [
  { key:'emo', label:'Emotionsregulation', patterns:['reguléier','regulier','emotioun','emotion','wüttend','roueg bleiwen','beroui','ampel','frustratioun','frustration','iwwerwältegt'],
    progress:'Zeigt zunehmend Strategien, um belastende Gefühle selbst zu regulieren.',
    topic:'Emotionsregulation in belastenden Situationen weiter stärken.' },
  { key:'impuls', label:'Impulskontrolle', patterns:['impuls','selbststeier','selbstkontroll','kontrolléier','innehalen','stopp-signal'],
    progress:'Kann Impulse in strukturierten Situationen zunehmend zurückhalten.',
    topic:'Impulskontrolle in unstrukturierten Momenten weiter aufbauen.' },
  { key:'sozial', label:'Soziale Beziehungen', patterns:['sozial','kolleeg','frënn','peer','beziehung','gruppen','integréier','matschüler'],
    progress:'Geht zunehmend angemessen auf andere Jugendliche zu.',
    topic:'Tragfähige soziale Beziehungen zu Gleichaltrigen aufbauen.' },
  { key:'konflikt', label:'Konfliktverhalten', patterns:['konflikt','sträit','streit','provozéier','aggressiv','geschloen','beleidegt','eskal'],
    progress:'Löst Konflikte häufiger im Gespräch statt über Eskalation.',
    topic:'Konstruktive Konfliktlösung ohne Eskalation einüben.' },
  { key:'kommunik', label:'Kommunikation & Ausdruck', patterns:['kommunik','ausdréck','ausdruck','verbalis','erzielt','mëndlech','sproochlech','seng bedürfnisser'],
    progress:'Drückt eigene Bedürfnisse zunehmend verbal aus.',
    topic:'Eigene Anliegen sprachlich klar äußern lernen.' },
  { key:'motiv', label:'Motivation & Mitarbeit', patterns:['motiv','matmaachen','engagéiert','interess','usträngen','méi lëscht','mitarbeit'],
    progress:'Zeigt in Bereichen mit persönlichem Bezug gute Mitarbeit.',
    topic:'Motivation und aktive Mitarbeit im Alltag stärken.' },
  { key:'selbst', label:'Selbstständigkeit & Struktur', patterns:['selbststänn','selbständig','struktur','organiséier','ordnung','material','plangen','eegenstänn'],
    progress:'Organisiert Aufgaben und Material zunehmend eigenständig.',
    topic:'Selbstorganisation und Tagesstruktur weiter festigen.' },
  { key:'konz', label:'Konzentration & Ausdauer', patterns:['konzentr','opmierksam','aufmerksam','fokus','oflenkbar','ausdauer'],
    progress:'Bleibt in kurzen, klar strukturierten Einheiten aufmerksam.',
    topic:'Konzentration und Ausdauer schrittweise ausbauen.' },
  { key:'selbstwert', label:'Selbstwert & Zutrauen', patterns:['selbstwäert','selbstwert','selbstvertrauen','selbstbild','stolz','minnerwäerteg','traut sech'],
    progress:'Traut sich zunehmend neue Aufgaben zu.',
    topic:'Selbstwert und Zutrauen in eigene Fähigkeiten stärken.' },
  { key:'schule', label:'Schulteilnahme', patterns:['schoul','absen','net komm','reintegrat','präsenz','fielt','net an d.schoul','verweigert schoul'],
    progress:'Nimmt verlässlicher am Schulalltag teil.',
    topic:'Regelmäßige Schulteilnahme stabilisieren.' },
  { key:'beruf', label:'Berufliche Orientierung', patterns:['stage','praktikum','beruff','ausbildung','atva','adem','zukunft','orientéierung','patron'],
    progress:'Entwickelt konkrete Vorstellungen zur beruflichen Zukunft.',
    topic:'Berufliche Orientierung und Praktikumserfahrung ausbauen.' },
  { key:'regeln', label:'Regeln & Grenzen', patterns:['reegel','regel','grenz','limit','vereinbar','ofmaachung','haalt sech un'],
    progress:'Akzeptiert vereinbarte Regeln zunehmend.',
    topic:'Akzeptanz von Regeln und Grenzen weiter aufbauen.' },
  { key:'familie', label:'Familiäres Umfeld', patterns:['famill','elteren','doheem','heem','mamm','papp','geschwëster','haushalt'],
    progress:'Zusammenarbeit mit dem familiären Umfeld verläuft konstruktiv.',
    topic:'Zusammenarbeit mit dem familiären Umfeld weiter stärken.' },
  { key:'medien', label:'Umgang mit Medien/Konsum', patterns:['handy','gaming','medien','vape','konsum','bildschierm','internet','sozial medien'],
    progress:'Reflektiert den eigenen Medienkonsum zunehmend.',
    topic:'Einen ausgewogenen Umgang mit Medien und Konsum entwickeln.' },
  { key:'vertrauen', label:'Vertrauensbeziehung', patterns:['vertrauen','vertraut','bezéiung opgebaut','trauen','oppe ginn','oppen'],
    progress:'Hat eine tragfähige Vertrauensbasis zur Begleitung aufgebaut.',
    topic:'Vertrauensbeziehung als Basis der Förderung weiter festigen.' }
];
/* CATEGORIES/COLORS aus den Notiz-Typen ableiten (+ Bericht für den Import) */
var ISA_CATEGORIES = ISA_NOTE_TYPES.map(function(t){return t.key;}).concat(['Bericht (DS/PEI)']);
var ISA_CATEGORY_COLORS = {}; ISA_NOTE_TYPES.forEach(function(t){ISA_CATEGORY_COLORS[t.key]=t.color;});
ISA_CATEGORY_COLORS['Bericht (DS/PEI)']='hsl(262, 45%, 50%)';
(function(){
  var catsSrc='var CATEGORIES = '+JSON.stringify(ISA_CATEGORIES,null,2)+';';
  var colSrc='var CATEGORY_COLORS = '+JSON.stringify(ISA_CATEGORY_COLORS,null,2)+';';
  var i=dosScript.indexOf('var CATEGORIES = [');
  if(i>=0){var j=dosScript.indexOf('];',i);if(j>=0){dosScript=dosScript.slice(0,i)+catsSrc+dosScript.slice(j+2);}}
  var k=dosScript.indexOf('var CATEGORY_COLORS = {');
  if(k>=0){var m=dosScript.indexOf('};',k);if(m>=0){dosScript=dosScript.slice(0,k)+colSrc+dosScript.slice(m+2);}}
})();

/* Verlaufs-Slider + Datumslabel auf den ISA-Kontext anpassen (interne Keys
   bleiben gleich, damit Charts/Verlauf weiter funktionieren). */
dosScript = dosScript
  .split('Schulische Stabilität / Mitarbeit').join('Kooperation & Mitarbeit')
  .split('1 = sehr instabil … 10 = sehr stabil').join('1 = wenig kooperativ … 10 = sehr kooperativ')
  .split("label: 'Anwesenheit',").join("label: 'Selbstständigkeit',")
  .split('1 = kaum da … 10 = vollständig present').join('1 = viel Unterstützung … 10 = sehr selbstständig')
  .split('Datum (Wochendatum des Rapports)').join('Datum')
  .split('Eintragstext (Luxemburgisch — Originaltext, nicht übersetzen)').join('Notiztext');
/* Datenintegrität: Beim BEARBEITEN einer bestehenden Notiz darf der Schüler
   NICHT mehr geändert werden — sonst wandert die Notiz zu einem anderen
   Schüler und die Historie „verrutscht". Das Auswahlfeld wird deshalb im
   Bearbeiten-Modus gesperrt (disabled). Ein disabled <select> liefert per
   JS weiterhin .value, deshalb bleibt das Speichern korrekt. */
dosScript = replaceOnce(dosScript,
  '\'<label for="f-student">Schüler</label>\'',
  '\'<label for="f-student">Schüler\'+(isEdit?\' <span class="hint">🔒 bei bestehender Notiz fest</span>\':\'\')+\'</label>\'',
  'isa:f-student-label-lock');
dosScript = replaceOnce(dosScript,
  '\'<select id="f-student" required>\'',
  '\'<select id="f-student" required\'+(isEdit?\' disabled title="Der Schüler eines bestehenden Eintrags kann nicht geändert werden — so bleibt die Zuordnung/Historie korrekt."\':\'\')+\'>\'',
  'isa:f-student-select-lock');
ROSTER_MODULE  = isaNS(ROSTER_MODULE);
BUBBLE_MODULE  = isaNS(BUBBLE_MODULE);
SCREENING_MODULE = isaNS(SCREENING_MODULE);
SYNC_MODULE    = isaNS(SYNC_MODULE);
DOS_OVERRIDES  = isaNS(DOS_OVERRIDES);
MATERIALS_MODULE = isaNS(MATERIALS_MODULE);
SHELL_CONTROLLER = isaNS(SHELL_CONTROLLER);
TABS_GUARD = isaNS(TABS_GUARD);   /* eigener Fensterkanal, sonst falsche Warnung „zwei Fenster“ (M6) */

var FAVICON = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Ctext%20y='.9em'%20font-size='88'%3E%F0%9F%93%93%3C/text%3E%3C/svg%3E";

/* ISA-spezifische Bausteine (CSS + Module) */

/* ============================================================
   KB_BACKUP — Komplett-Sicherung des ganzen Journals in EINE Datei.
   Das Dossier-Backup allein enthält nur Schüler/Notizen/Réunionen; alles
   andere (Fortschritte, ELDiB-Ziele, Terminplan, Schuljahre, Aufgaben,
   Screening, Helfernetz) liegt in localStorage. Hier wird beides
   zusammengeführt, damit eine Sicherung wirklich alles umfasst.
   Bewusst NICHT enthalten: angemeldete Person, UI-Zustand und der
   Sync-Abgleichstand (isa_sync_base) — die sind gerätespezifisch.
   ============================================================ */
var ISA_BACKUP_MODULE = `
window.KB_BACKUP=(function(){
  var FMT='isa-journal-backup';
  var SKIP={isa_user:1,isa_side_collapsed:1,isa_sync_base:1};
  function isOurs(k){
    if(!k||k.indexOf('isa_')!==0)return false;
    if(SKIP[k])return false;
    if(k.indexOf('isa_dossier')===0)return false;   /* steckt schon im Dossier-Teil */
    return true;
  }
  function stores(){
    var o={};
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(isOurs(k)){o[k]=localStorage.getItem(k);}}}catch(e){}
    return o;
  }
  function jlen(raw){try{var v=JSON.parse(raw||'{}');if(Array.isArray(v))return v.length;var n=0;for(var k in v)n++;return n;}catch(e){return 0;}}
  function build(){
    var dos=null;try{dos=window.Repo?window.Repo.exportAll():null;}catch(e){}
    return {format:FMT,version:1,exportedAt:new Date().toISOString(),app:'ISA-Journal',dossier:dos,stores:stores()};
  }
  function counts(){
    var d=build();var s=d.stores||{};
    return {
      /* Schüler leben im ISA-Journal im Roster (isa_roster_v1), nicht in
         Repo.students — dort stünde sonst irreführend immer 0. */
      students:(function(){try{return (window.KB_ROSTER?window.KB_ROSTER.list().length:0);}catch(e){return 0;}})(),
      entries:(d.dossier&&d.dossier.entries?d.dossier.entries.length:0),
      pei:jlen(s.isa_pei_v1), goals:jlen(s.isa_goals_v1),
      agenda:jlen(s.isa_agenda_v1), tasks:jlen(s.isa_tasks_v1),
      screening:jlen(s.isa_screening_v1), bubble:jlen(s.isa_bubble_v1),
      years:(function(){try{return (JSON.parse(s.isa_years_v1||'{}').years||[]).length;}catch(e){return 0;}})()
    };
  }
  function download(){
    var d=build();
    var name='isa-journal-backup_'+d.exportedAt.slice(0,10)+'.json';
    var json=JSON.stringify(d,null,2);
    if(window.downloadBlob){window.downloadBlob(name,json,'application/json');}
    else{
      var b=new Blob([json],{type:'application/json'});var u=URL.createObjectURL(b);
      var a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();
      setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u);},0);
    }
    return name;
  }
  function valid(d){return !!(d&&d.format===FMT&&(d.dossier||d.stores));}
  /* mode: 'merge' (Standard) oder 'replace' */
  function restore(d,mode){
    if(!valid(d))return Promise.reject(new Error('Keine gültige ISA-Journal-Sicherung.'));
    var st=d.stores||{};
    return Promise.resolve()
      .then(function(){ if(d.dossier&&window.Repo&&window.Repo.importAll){return window.Repo.importAll(d.dossier,mode==='replace'?'replace':'merge');} })
      .then(function(){
        if(mode==='replace'){
          /* nur unsere eigenen Schlüssel entfernen — fremde bleiben unberührt */
          var kill=[];
          try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(isOurs(k))kill.push(k);}}catch(e){}
          for(var j=0;j<kill.length;j++){try{localStorage.removeItem(kill[j]);}catch(e){}}
        }
        for(var k2 in st){if(isOurs(k2)){try{localStorage.setItem(k2,st[k2]);}catch(e){}}}
      });
  }
  return {build:build,counts:counts,download:download,restore:restore,valid:valid,FORMAT:FMT};
})();
`;

/* ============================================================
   KB_YEARS — Schuljahre (2026/27 …). Ein Jahr ist „aktiv"; man kann
   ein Jahr abschließen (nur Ansicht) und ein neues anlegen. WICHTIG:
   Schüler, Notizen, Ziele und PEI sind NICHT nach Jahr getrennt — sie
   bleiben durchgehend erhalten. Nur der Terminplan (Horaire) wird pro
   Schuljahr geführt (siehe KB_AGENDA). Speicher rein lokal.
   ============================================================ */
var ISA_YEAR_MODULE = `
window.KB_YEARS=(function(){
  var LS='isa_years_v1';
  function labelOf(y){function pad(x){return (x<10?'0':'')+x;}return y+'/'+pad((y+1)%100);}
  function normStart(raw){
    var s=String(raw==null?'':raw);var m=s.match(/[0-9]{1,4}/);if(!m)return 0;
    var n=parseInt(m[0],10);if(n<100)n=2000+n;if(n<1900||n>2200)return 0;return n;
  }
  function defaultStart(){var d=new Date();var y=d.getFullYear();return (d.getMonth()>=7)?y:(y-1);}
  function startDate(y){return new Date(y,8,15);}            /* ~15. Sept */
  function endDate(y){return new Date(y+1,6,31);}            /* ~31. Juli */
  function containsToday(y){var t=new Date();t.setHours(0,0,0,0);return t>=startDate(y)&&t<=endDate(y);}
  function load(){try{var o=JSON.parse(localStorage.getItem(LS)||'null');return (o&&o.years&&o.years.length)?o:null;}catch(e){return null;}}
  function save(){try{localStorage.setItem(LS,JSON.stringify(data));}catch(e){}}
  var data=load();
  var hooks=[];
  function fire(){for(var i=0;i<hooks.length;i++){try{hooks[i]();}catch(e){}}}
  function byId(id){if(!data)return null;for(var i=0;i<data.years.length;i++){if(data.years[i].id===id)return data.years[i];}return null;}
  function sortY(){data.years.sort(function(a,b){return a.start-b.start;});}
  function mk(st){return {id:'y'+st,start:st,label:labelOf(st),createdAt:Date.now(),closed:false};}
  function ensure(){
    if(!data||!data.years||!data.years.length){var st=defaultStart();data={years:[mk(st)],active:'y'+st};save();}
    if(!data.active||!byId(data.active)){data.active=data.years[data.years.length-1].id;save();}
    return data;
  }
  ensure();
  function list(){ensure();return data.years.map(function(y){return {id:y.id,start:y.start,label:y.label,closed:!!y.closed,createdAt:y.createdAt};});}
  function activeObj(){ensure();return byId(data.active);}
  function add(raw){ensure();var st=normStart(raw);if(!st)return null;var id='y'+st;if(byId(id)){data.active=id;save();fire();return id;}data.years.push(mk(st));sortY();data.active=id;save();fire();return id;}
  function setActive(id){ensure();if(byId(id)){data.active=id;save();fire();return true;}return false;}
  function close(id){var o=byId(id||(data&&data.active));if(o){o.closed=true;save();fire();}}
  function reopen(id){var o=byId(id||(data&&data.active));if(o){o.closed=false;save();fire();}}
  function nextStart(){ensure();var mx=0;for(var i=0;i<data.years.length;i++){if(data.years[i].start>mx)mx=data.years[i].start;}return mx?(mx+1):defaultStart();}
  return {
    list:list, active:function(){return activeObj()?activeObj().id:'';},
    activeYear:function(){return activeObj()?activeObj().start:0;},
    activeLabel:function(){return activeObj()?activeObj().label:'';},
    isClosed:function(id){var o=byId(id||(data&&data.active));return !!(o&&o.closed);},
    setActive:setActive, add:add, close:close, reopen:reopen,
    nextStart:nextStart, nextLabel:function(){return labelOf(nextStart());}, labelOf:labelOf,
    startDate:startDate, containsToday:containsToday,
    /* Team-Sync: die LISTE der Schuljahre wird geteilt, das aktive Jahr
       bleibt bewusst pro Gerät (jede Person arbeitet ggf. in einem anderen). */
    syncExport:function(){ensure();return data.years.map(function(y){return {id:y.id,start:y.start,label:y.label,closed:!!y.closed,createdAt:y.createdAt||0};});},
    syncApply:function(arr){
      if(!arr||!arr.length)return;                 /* nie mit leer überschreiben */
      var keepActive=(data&&data.active)||'';
      data={years:[],active:keepActive};
      arr.forEach(function(r){if(r&&r.id&&r.start){data.years.push({id:r.id,start:r.start,label:r.label||labelOf(r.start),createdAt:r.createdAt||Date.now(),closed:!!r.closed});}});
      sortY();
      if(!byId(data.active)){data.active=data.years.length?data.years[data.years.length-1].id:'';}
      save();fire();
    },
    onChange:function(fn){if(typeof fn==='function')hooks.push(fn);}
  };
})();
`;

var AGENDA_MODULE = `
window.KB_AGENDA=(function(){
  var LS='isa_agenda_v1';
  var DOW=['','Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
  var KINDS={begleitung:{l:'Begleitung',ic:'🧑‍🏫',c:'#2563eb'},einheit:{l:'Fördereinheit',ic:'🎯',c:'#0f766e'},gespraech:{l:'Gespräch',ic:'💬',c:'#7c3aed'},netzwerk:{l:'Netzwerk/Besprechung',ic:'🔗',c:'#0e7490'},buero:{l:'Büro/Bericht',ic:'💻',c:'#b45309'},fahrt:{l:'Fahrt',ic:'🚗',c:'#0891b2'},sonstiges:{l:'Sonstiges',ic:'📌',c:'#6b7280'}};
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function user(){try{return (window.KB_USER&&window.KB_USER.get())||'_';}catch(e){return '_';}}
  function yearOf(){try{return (window.KB_YEARS&&window.KB_YEARS.activeYear())||0;}catch(e){return 0;}}
  function yearClosed(){try{return !!(window.KB_YEARS&&window.KB_YEARS.isClosed&&window.KB_YEARS.isClosed());}catch(e){return false;}}
  function keyOf(u,y){return String(u)+'::'+String(y);}
  function loadAll(){try{return JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){return {};}}
  function saveAll(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  /* Ablage pro (Mitarbeiter · Schuljahr). Migration: eine alte, nicht nach
     Jahr getrennte Ablage wird einmalig ins aktuelle Schuljahr übernommen. */
  function mine(){
    var all=loadAll();var u=user();var y=yearOf();var key=keyOf(u,y);
    if(!all[key]){
      if(all[u]&&(all[u].base||all[u].appts)){all[key]=all[u];delete all[u];}
      else{all[key]={base:{},appts:[]};}
      saveAll(all);
    }
    if(!all[key].base){all[key].base={};}
    if(!all[key].appts){all[key].appts=[];}
    return {all:all,d:all[key],key:key};
  }
  /* Grundwoche eines Schuljahres in ein anderes übernehmen (neue IDs). */
  function copyBase(fromY,toY){
    var all=loadAll();var u=user();var fk=keyOf(u,fromY),tk=keyOf(u,toY);
    var src=all[fk];if(!src||!src.base)return;
    if(!all[tk])all[tk]={base:{},appts:[]};
    var nb={};for(var w=1;w<=5;w++){nb[w]=(src.base[w]||[]).map(function(b){return {id:uid(),start:b.start,end:b.end,title:b.title,kind:b.kind,studentId:b.studentId,note:b.note};});}
    all[tk].base=nb;if(!all[tk].appts)all[tk].appts=[];saveAll(all);
  }
  function weekStartForActive(){
    try{var y=yearOf();
      if(window.KB_YEARS&&window.KB_YEARS.containsToday&&window.KB_YEARS.containsToday(y))return mondayOf(new Date());
      if(window.KB_YEARS&&window.KB_YEARS.startDate)return mondayOf(window.KB_YEARS.startDate(y));
    }catch(e){}
    return mondayOf(new Date());
  }
  function persist(m){saveAll(m.all);}
  function uid(){return 'ag_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+('-')+('0'+d.getDate()).slice(-2);}
  function parseIso(s){var p=String(s||'').split('-');return new Date(+p[0],(+p[1]||1)-1,+p[2]||1);}
  function mondayOf(d){var x=new Date(d);var wd=(x.getDay()+6)%7;x.setDate(x.getDate()-wd);x.setHours(0,0,0,0);return x;}
  function fmtDay(d){return DOW[((d.getDay()+6)%7)+1]+', '+('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+'.';}
  function timeOk(t){return /^[0-2][0-9]:[0-5][0-9]$/.test(t);}
  function sortByStart(a,b){return (a.start||'')<(b.start||'')?-1:((a.start||'')>(b.start||'')?1:0);}

  /* ---- öffentliche Datenzugriffe (für Mein Tag) ---- */
  function forDate(isoDate){
    var m=mine(), d=parseIso(isoDate), wd=((d.getDay()+6)%7)+1, out=[];
    if(wd>=1&&wd<=5){(m.d.base[wd]||[]).forEach(function(b){out.push({start:b.start,end:b.end,title:b.title,kind:b.kind,studentId:b.studentId,note:b.note,_type:'base',_id:b.id});});}
    m.d.appts.forEach(function(a){if(a.date===isoDate){out.push({start:a.start,end:a.end,title:a.title,kind:a.kind,studentId:a.studentId,note:a.note,done:a.done,_type:'appt',_id:a.id});}});
    out.sort(sortByStart); return out;
  }
  function upcoming(days){
    var m=mine(), today=new Date(); today.setHours(0,0,0,0); var out=[];
    m.d.appts.forEach(function(a){var d=parseIso(a.date);if(d>=today){var diff=Math.round((d-today)/86400000);if(diff<=days){out.push(a);}}});
    out.sort(function(a,b){return a.date<b.date?-1:(a.date>b.date?1:sortByStart(a,b));});
    return out;
  }

  /* ---- Renderer ---- */
  var host, state={weekStart:null, form:null};
  function studentOpts(sel){
    var list=(window.KB_ROSTER?window.KB_ROSTER.list():[]);
    return '<option value="">— kein Schüler —</option>'+list.map(function(s){return '<option value="'+esc(s.id)+'"'+(sel===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('');
  }
  function kindOpts(sel){return Object.keys(KINDS).map(function(k){return '<option value="'+k+'"'+(sel===k?' selected':'')+'>'+KINDS[k].ic+' '+esc(KINDS[k].l)+'</option>';}).join('');}
  function studentName(id){var s=id&&window.KB_ROSTER?window.KB_ROSTER.byId(id):null;return s?s.name:'';}

  function itemHtml(it){
    var k=KINDS[it.kind]||KINDS.sonstiges;
    var who=it.studentId?('<span class="ag-who">👤 '+esc(studentName(it.studentId))+'</span>'):'';
    var tcls='ag-item ag-'+(it._type)+(it.done?' ag-done':'');
    var editKey=(it._type==='base'?('base:'+it._id):it._id);
    return '<div class="'+tcls+'" style="border-left-color:'+k.c+'" data-ag-edit="'+esc(editKey)+'">'+
      '<div class="ag-time">'+esc(it.start||'')+(it.end?('–'+esc(it.end)):'')+'</div>'+
      '<div class="ag-body"><div class="ag-title">'+k.ic+' '+esc(it.title||k.l)+'</div>'+
      (who||it.note?('<div class="ag-sub">'+who+(it.note?'<span class="ag-note">'+esc(it.note)+'</span>':'')+'</div>'):'')+'</div>'+
      (it._type==='base'?'<span class="ag-badge" title="feste Grundwoche">wöchentl.</span>':'')+'</div>';
  }

  function formHtml(){
    var f=state.form; if(!f)return '';
    var isBase=f.mode==='base';
    var title=f.id?'Termin bearbeiten':(isBase?'Fester Wochen-Block':'Neuer Termin');
    var whenField=isBase
      ? '<label class="ag-l">Wochentag<select class="ag-in" id="ag-f-wd">'+[1,2,3,4,5].map(function(w){return '<option value="'+w+'"'+(f.weekday===w?' selected':'')+'>'+DOW[w]+'</option>';}).join('')+'</select></label>'
      : '<label class="ag-l">Datum<input class="ag-in" id="ag-f-date" type="date" value="'+esc(f.date||'')+'"></label>';
    return '<div class="ag-form-ov" id="ag-form-ov"><div class="ag-form">'+
      '<div class="ag-form-h"><b>'+esc(title)+'</b><button class="ag-x" id="ag-f-cancel" title="Schließen">✕</button></div>'+
      '<div class="ag-grid2">'+whenField+
        '<label class="ag-l">Art<select class="ag-in" id="ag-f-kind">'+kindOpts(f.kind||'begleitung')+'</select></label>'+
        '<label class="ag-l">Von<input class="ag-in" id="ag-f-start" type="time" value="'+esc(f.start||'')+'"></label>'+
        '<label class="ag-l">Bis<input class="ag-in" id="ag-f-end" type="time" value="'+esc(f.end||'')+'"></label>'+
      '</div>'+
      '<label class="ag-l">Titel<input class="ag-in" id="ag-f-title" type="text" placeholder="z. B. Begleitung Schule …" value="'+esc(f.title||'')+'"></label>'+
      '<label class="ag-l">Schüler (optional)<select class="ag-in" id="ag-f-stud">'+studentOpts(f.studentId||'')+'</select></label>'+
      '<label class="ag-l">Notiz (optional)<input class="ag-in" id="ag-f-note" type="text" placeholder="Ort, Details …" value="'+esc(f.note||'')+'"></label>'+
      '<div class="ag-form-foot">'+
        (f.id?'<button class="btn btn-ghost ag-del" id="ag-f-del">🗑 Löschen</button>':'<span></span>')+
        '<div><button class="btn" id="ag-f-cancel2">Abbrechen</button> <button class="btn btn-primary" id="ag-f-save">Speichern</button></div>'+
      '</div></div></div>';
  }

  function render(){
    host=document.getElementById('isa-agenda-body'); if(!host)return;
    if(!state.weekStart){state.weekStart=weekStartForActive();}
    var closed=yearClosed();
    var ws=new Date(state.weekStart), we=new Date(ws); we.setDate(we.getDate()+4);
    var cols='';
    var todayIso=iso(new Date());
    for(var i=0;i<5;i++){
      var d=new Date(ws); d.setDate(d.getDate()+i); var di=iso(d);
      var items=forDate(di);
      cols+='<div class="ag-col'+(di===todayIso?' ag-today':'')+'"><div class="ag-col-h">'+esc(fmtDay(d))+(di===todayIso?' <span class="ag-heute">heute</span>':'')+'</div>'+
        '<div class="ag-col-b">'+(items.length?items.map(itemHtml).join(''):'<div class="ag-empty">—</div>')+
        (closed?'':'<button class="ag-add-day" data-ag-newday="'+di+'">+ Termin</button>')+'</div></div>';
    }
    var range=('0'+ws.getDate()).slice(-2)+'.'+('0'+(ws.getMonth()+1)).slice(-2)+'. – '+('0'+we.getDate()).slice(-2)+'.'+('0'+(we.getMonth()+1)).slice(-2)+'.'+we.getFullYear();
    var legend=Object.keys(KINDS).map(function(k){return '<span class="ag-leg"><span class="ag-dot" style="background:'+KINDS[k].c+'"></span>'+esc(KINDS[k].l)+'</span>';}).join('');
    var yl=''; try{yl=(window.KB_YEARS&&window.KB_YEARS.activeLabel())||'';}catch(e){}
    host.innerHTML='<div class="kb-pagehead"><h2>🗓️ Terminplan'+(yl?' <span class="ag-year">'+esc(yl)+'</span>':'')+'</h2><p style="margin:0 0 4px;color:var(--kb-muted);">Deine Woche: feste Grundwoche + einzelne Termine. Klick auf einen Eintrag zum Bearbeiten.</p>'+
      (closed?'<div class="ag-closed">🔒 Dieses Schuljahr ist abgeschlossen — nur Ansicht. Zum Ändern oben links ein anderes Schuljahr wählen oder es wieder öffnen.</div>':'')+'</div>'+
      '<div class="ag-bar"><div class="ag-nav"><button class="btn btn-sm" id="ag-prev">‹</button><button class="btn btn-sm" id="ag-today-btn">Heute</button><button class="btn btn-sm" id="ag-next">›</button><span class="ag-range">'+esc(range)+'</span></div>'+
      (closed?'':'<div class="ag-actions"><button class="btn btn-sm" id="ag-add-base">+ Fester Block</button><button class="btn btn-sm btn-primary" id="ag-add">+ Termin</button></div>')+'</div>'+
      '<div class="ag-week">'+cols+'</div>'+
      '<div class="ag-legend">'+legend+'</div>'+
      (closed?'':formHtml());
    wire();
  }

  function openForm(f){state.form=f;render();}
  function editKey(key){
    var m=mine();
    if(key.indexOf('base:')===0){var bid=key.slice(5);for(var w=1;w<=5;w++){var arr=m.d.base[w]||[];for(var i=0;i<arr.length;i++){if(arr[i].id===bid){var b=arr[i];return {mode:'base',id:bid,weekday:w,kind:b.kind,start:b.start,end:b.end,title:b.title,studentId:b.studentId,note:b.note};}}}return null;}
    for(var j=0;j<m.d.appts.length;j++){if(m.d.appts[j].id===key){var a=m.d.appts[j];return {mode:'appt',id:a.id,date:a.date,kind:a.kind,start:a.start,end:a.end,title:a.title,studentId:a.studentId,note:a.note};}}
    return null;
  }
  function readForm(){
    var g=function(id){var el=document.getElementById(id);return el?el.value:'';};
    var f=state.form||{};
    var o={mode:f.mode,id:f.id,kind:g('ag-f-kind'),start:g('ag-f-start'),end:g('ag-f-end'),title:g('ag-f-title').trim(),studentId:g('ag-f-stud'),note:g('ag-f-note').trim()};
    if(f.mode==='base'){o.weekday=+g('ag-f-wd')||1;}else{o.date=g('ag-f-date');}
    return o;
  }
  function saveForm(){
    var o=readForm();
    if(!o.start||!timeOk(o.start)){alert('Bitte eine Startzeit angeben.');return;}
    if(o.mode!=='base'&&!o.date){alert('Bitte ein Datum angeben.');return;}
    if(!o.title){o.title=(KINDS[o.kind]||KINDS.sonstiges).l;}
    var m=mine();
    if(o.mode==='base'){
      // aus evtl. altem Wochentag entfernen
      for(var w=1;w<=5;w++){m.d.base[w]=(m.d.base[w]||[]).filter(function(b){return b.id!==o.id;});}
      var wd=o.weekday; m.d.base[wd]=m.d.base[wd]||[];
      m.d.base[wd].push({id:o.id||uid(),start:o.start,end:o.end,title:o.title,kind:o.kind,studentId:o.studentId,note:o.note});
      m.d.base[wd].sort(sortByStart);
    } else {
      if(o.id){for(var i=0;i<m.d.appts.length;i++){if(m.d.appts[i].id===o.id){m.d.appts[i]={id:o.id,date:o.date,start:o.start,end:o.end,title:o.title,kind:o.kind,studentId:o.studentId,note:o.note,done:m.d.appts[i].done};break;}}}
      else{m.d.appts.push({id:uid(),date:o.date,start:o.start,end:o.end,title:o.title,kind:o.kind,studentId:o.studentId,note:o.note,done:false});}
    }
    persist(m); state.form=null; render();
    if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
  }
  function delForm(){
    var f=state.form; if(!f||!f.id)return; var m=mine();
    if(f.mode==='base'){for(var w=1;w<=5;w++){m.d.base[w]=(m.d.base[w]||[]).filter(function(b){return b.id!==f.id;});}}
    else{m.d.appts=m.d.appts.filter(function(a){return a.id!==f.id;});}
    persist(m); state.form=null; render();
  }
  function wire(){
    var b=function(id,fn){var el=document.getElementById(id);if(el)el.addEventListener('click',fn);};
    b('ag-prev',function(){state.weekStart.setDate(state.weekStart.getDate()-7);render();});
    b('ag-next',function(){state.weekStart.setDate(state.weekStart.getDate()+7);render();});
    b('ag-today-btn',function(){state.weekStart=mondayOf(new Date());render();});
    if(yearClosed())return; /* abgeschlossenes Schuljahr: nur Ansicht */
    b('ag-add',function(){openForm({mode:'appt',date:iso(new Date()),kind:'begleitung',start:'',end:''});});
    b('ag-add-base',function(){openForm({mode:'base',weekday:1,kind:'begleitung',start:'',end:''});});
    b('ag-f-save',saveForm); b('ag-f-del',delForm);
    b('ag-f-cancel',function(){state.form=null;render();}); b('ag-f-cancel2',function(){state.form=null;render();});
    var ov=document.getElementById('ag-form-ov'); if(ov){ov.addEventListener('click',function(e){if(e.target===ov){state.form=null;render();}});}
    host.querySelectorAll('[data-ag-newday]').forEach(function(el){el.addEventListener('click',function(){openForm({mode:'appt',date:el.getAttribute('data-ag-newday'),kind:'begleitung',start:'',end:''});});});
    host.querySelectorAll('[data-ag-edit]').forEach(function(el){el.addEventListener('click',function(){var f=editKey(el.getAttribute('data-ag-edit'));if(f)openForm(f);});});
  }

  /* Schuljahr gewechselt/geändert -> passende Woche zeigen + neu rendern */
  try{if(window.KB_YEARS&&window.KB_YEARS.onChange){window.KB_YEARS.onChange(function(){state.form=null;state.weekStart=weekStartForActive();if(document.getElementById('isa-agenda-body'))render();});}}catch(e){}

  /* Team-Sync/Backup: ein Datensatz je (Mitarbeiter · Schuljahr). Weil jede
     Person eine eigene ID hat, überschreibt niemand den Plan der anderen. */
  function syncExport(){var all=loadAll();var out=[];for(var k in all){var d=all[k]||{};out.push({id:k,base:d.base||{},appts:d.appts||[]});}return out;}
  function syncApply(arr){
    if(!arr)return;                                /* fehlende Sammlung: nichts tun */
    var all={};
    for(var i=0;i<arr.length;i++){var r=arr[i];if(r&&r.id){all[r.id]={base:r.base||{},appts:r.appts||[]};}}
    saveAll(all);
    if(document.getElementById('isa-agenda-body')){try{render();}catch(e){}}
  }

  return {render:render, forDate:forDate, upcoming:upcoming, kinds:KINDS, studentName:studentName, copyBase:copyBase, syncExport:syncExport, syncApply:syncApply};
})();
`;

/* Notiz-Typen + PEI-Bausteine (Fortschritte/Themen) + Vorschlags-Engine */
var ISA_NOTES_MODULE = `
window.ISA_NOTE_TYPES=${JSON.stringify(ISA_NOTE_TYPES)};
window.KB_PEI=(function(){
  var LS="isa_pei_v1";
  function load(){try{return JSON.parse(localStorage.getItem(LS)||"{}")||{};}catch(e){return {};}}
  function save(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  function rec(o,sid){if(!o[sid]){o[sid]={progress:[],topics:[],dismissed:[]};}var r=o[sid];if(!r.progress)r.progress=[];if(!r.topics)r.topics=[];if(!r.dismissed)r.dismissed=[];return r;}
  function by(){try{return (window.KB_USER&&window.KB_USER.get())||"";}catch(e){return "";}}
  function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function uid(){return "p_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
  function sync(){if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}}
  return {
    list:function(sid){var o=load();var r=rec(o,sid);return {progress:r.progress.slice(),topics:r.topics.slice(),dismissed:r.dismissed.slice()};},
    add:function(sid,kind,text,key){if(!text)return;var o=load();var r=rec(o,sid);(kind==="progress"?r.progress:r.topics).push({id:uid(),text:text,key:key||"",date:today(),by:by(),done:false});save(o);sync();},
    toggle:function(sid,kind,id){var o=load();var r=rec(o,sid);(kind==="progress"?r.progress:r.topics).forEach(function(x){if(x.id===id)x.done=!x.done;});save(o);sync();},
    remove:function(sid,kind,id){var o=load();var r=rec(o,sid);r[kind]=(kind==="progress"?r.progress:r.topics).filter(function(x){return x.id!==id;});save(o);sync();},
    dismiss:function(sid,key){var o=load();var r=rec(o,sid);if(r.dismissed.indexOf(key)<0)r.dismissed.push(key);save(o);},
    keysIn:function(sid){var o=load();var r=rec(o,sid);var s={};r.progress.concat(r.topics).forEach(function(x){if(x.key)s[x.key]=1;});r.dismissed.forEach(function(k){s[k]=1;});return s;},
    syncExport:function(){var o=load();var out=[];for(var k in o){out.push({id:k,progress:o[k].progress||[],topics:o[k].topics||[],dismissed:o[k].dismissed||[]});}return out;},
    syncApply:function(arr){var o={};(arr||[]).forEach(function(r){if(r&&r.id){o[r.id]={progress:r.progress||[],topics:r.topics||[],dismissed:r.dismissed||[]};}});save(o);}
  };
})();
window.KB_SUGGEST=(function(){
  var BANK=${JSON.stringify(ISA_SUGGEST_BANK)};
  function forStudent(sid){
    var ents=(window.Repo&&Repo.entriesForStudent)?Repo.entriesForStudent(sid):[];
    var txt=ents.map(function(e){return (e.text||"");}).join("  ").toLowerCase();
    if(!txt.trim())return [];
    var have=(window.KB_PEI?window.KB_PEI.keysIn(sid):{});
    var out=[];
    BANK.forEach(function(d){
      if(have[d.key])return;
      var c=0;d.patterns.forEach(function(p){if(txt.indexOf(p)>=0)c++;});
      if(c>0){out.push({key:d.key,label:d.label,progress:d.progress,topic:d.topic,count:c});}
    });
    out.sort(function(a,b){return b.count-a.count;});
    return out.slice(0,6);
  }
  return {forStudent:forStudent,bank:BANK};
})();
window.KB_GOALS=(function(){
  var LS="isa_goals_v1";
  function load(){try{return JSON.parse(localStorage.getItem(LS)||"{}")||{};}catch(e){return {};}}
  function save(o){try{localStorage.setItem(LS,JSON.stringify(o));}catch(e){}}
  function by(){try{return (window.KB_USER&&window.KB_USER.get())||"";}catch(e){return "";}}
  function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function uid(){return "g_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5);}
  function labels(){return (window.KB_TAXONOMY&&window.KB_TAXONOMY.eldibGoalLabels)||{};}
  function norm(raw){var s=String(raw||"").toUpperCase().replace(/[^A-Z0-9]/g,"");var m=s.match(/^([A-Z]+)([0-9]+)$/);if(!m)return "";return m[1]+"-"+m[2];}
  function sync(){if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}}
  return {
    norm:norm,
    labelFor:function(code){return labels()[code]||"";},
    list:function(sid){var o=load();return (o[sid]||[]).slice();},
    add:function(sid,raw){var code=norm(raw);if(!code)return {err:"format"};var o=load();o[sid]=o[sid]||[];if(o[sid].some(function(g){return g.code===code;}))return {err:"dup",code:code};var lbl=labels()[code]||"";o[sid].push({id:uid(),code:code,label:lbl,date:today(),by:by()});save(o);sync();return {code:code,label:lbl,known:!!lbl};},
    remove:function(sid,id){var o=load();o[sid]=(o[sid]||[]).filter(function(g){return g.id!==id;});save(o);sync();},
    asGoals:function(sid){var o=load();return (o[sid]||[]).map(function(g){return {code:g.code,domain:g.code.split("-")[0],title:g.label||g.code,formulation:g.label||g.code,methods:[],manual:true};});},
    codes:function(){return Object.keys(labels());},
    syncExport:function(){var o=load();var out=[];for(var k in o){out.push({id:k,goals:o[k]||[]});}return out;},
    syncApply:function(arr){var o={};(arr||[]).forEach(function(r){if(r&&r.id){o[r.id]=r.goals||[];}});save(o);}
  };
})();
/* Manuelle ELDiB-Ziele in KB_REPORTS.currentGoals einmischen → erscheinen
   auf der Übersicht, im KI-Export und speisen die Arbeitsblatt-Vorschläge
   (kein PEI-Upload nötig). */
(function(){
  if(!window.KB_REPORTS)return;
  var orig=window.KB_REPORTS.currentGoals;
  window.KB_REPORTS.currentGoals=function(sid){
    var base=orig?orig.call(window.KB_REPORTS,sid):null;
    var manual=window.KB_GOALS?window.KB_GOALS.asGoals(sid):[];
    if(!manual.length)return base;
    var goals=(base&&base.goals)?base.goals.slice():[];
    var have={};goals.forEach(function(g){if(g.code)have[g.code]=1;});
    manual.forEach(function(g){if(!have[g.code])goals.push(g);});
    return {date:(base&&base.date)||"",goals:goals,type:(base&&base.type)||"Manuell erfasst"};
  };
})();
window.KB_NOTECOMPOSER=(function(){
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);}
  function types(){return window.ISA_NOTE_TYPES||[];}
  var ov=null, sel=null, sid=null;
  function close(){if(ov&&ov.parentNode)ov.parentNode.removeChild(ov);ov=null;}
  function typeBtns(){return types().map(function(t){return '<button type="button" class="nc-type'+(sel&&sel.key===t.key?' on':'')+'" data-nc-type="'+esc(t.key)+'" style="--nc:'+t.color+'">'+t.ic+' '+esc(t.key)+'</button>';}).join('');}
  function questionsHtml(){
    if(!sel)return '';
    if(!sel.questions||!sel.questions.length){return '<label class="nc-l">Notiz<textarea class="nc-in" id="nc-free" rows="6" placeholder="Freie Notiz …"></textarea></label>';}
    return '<p class="nc-hint">Beantworte, was zutrifft — leere Felder werden weggelassen.</p>'+sel.questions.map(function(q){return '<label class="nc-l">'+esc(q)+'<textarea class="nc-in nc-q" data-q="'+esc(q)+'" rows="2" placeholder="…"></textarea></label>';}).join('');
  }
  function render(){
    ov.innerHTML='<div class="nc-modal"><div class="nc-h"><b>✍️ Neue Notiz</b><button class="nc-x" id="nc-cancel" title="Schließen">✕</button></div>'+
      '<div class="nc-types">'+typeBtns()+'</div>'+
      '<div class="nc-body"><label class="nc-l nc-date">Datum<input class="nc-in" id="nc-date" type="date" value="'+esc(today())+'"></label>'+
        '<div id="nc-questions">'+questionsHtml()+'</div>'+
        '<label class="nc-l">Themen-Tags (optional)<input class="nc-in" id="nc-tags" placeholder="mit Komma trennen …"></label></div>'+
      '<div class="nc-foot"><button class="btn" id="nc-cancel2">Abbrechen</button><button class="btn btn-primary" id="nc-save"'+(sel?'':' disabled')+'>Speichern</button></div></div>';
    wire();
  }
  function wire(){
    ov.querySelectorAll('[data-nc-type]').forEach(function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-nc-type');sel=types().filter(function(t){return t.key===k;})[0]||null;render();});});
    var c1=ov.querySelector('#nc-cancel'),c2=ov.querySelector('#nc-cancel2');if(c1)c1.onclick=close;if(c2)c2.onclick=close;
    ov.addEventListener('click',function(e){if(e.target===ov)close();});
    var sv=ov.querySelector('#nc-save');if(sv)sv.onclick=save;
  }
  function save(){
    if(!sel)return;
    var date=(ov.querySelector('#nc-date')||{}).value||today();
    var tags=(((ov.querySelector('#nc-tags')||{}).value)||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
    var text='';
    if(!sel.questions||!sel.questions.length){text=(((ov.querySelector('#nc-free')||{}).value)||'').trim();}
    else{var parts=[];ov.querySelectorAll('.nc-q').forEach(function(ta){var a=(ta.value||'').trim();if(a){parts.push('— '+ta.getAttribute('data-q')+'\\n'+a);}});text=parts.join('\\n\\n');}
    if(!text){alert('Bitte etwas eintragen.');return;}
    var p={studentId:sid,date:date,category:sel.key,tags:tags,text:text,author:((window.KB_USER&&window.KB_USER.get())||'')};
    var r=Repo.saveEntry(p);
    if(r&&r.then){r.then(function(){close();if(window.render){try{window.render();}catch(e){}}}).catch(function(){alert('Fehler beim Speichern.');});}
    else{close();if(window.render){try{window.render();}catch(e){}}}
  }
  function open(studentId){sid=studentId;sel=(types()[0]||null);ov=document.createElement('div');ov.className='nc-ov';document.body.appendChild(ov);render();}
  return {open:open};
})();`;

var ISA_HOME_MODULE = `
window.KB_HOME=(function(){
  var TLS='isa_tasks_v1';
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function user(){try{return (window.KB_USER&&window.KB_USER.get())||'';}catch(e){return '';}}
  function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  function fmtLong(d){var DW=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];var MO=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];return DW[d.getDay()]+', '+d.getDate()+'. '+MO[d.getMonth()]+' '+d.getFullYear();}
  function fmtD(isoS){try{return (typeof formatDate==='function')?formatDate(isoS):isoS;}catch(e){return isoS;}}
  function studentName(id){try{var s=window.KB_ROSTER&&window.KB_ROSTER.byId(id);return s?s.name:'';}catch(e){return '';}}

  /* ---- Aufgaben (persönliche To-dos, pro Person) ---- */
  function loadTasks(){try{var o=JSON.parse(localStorage.getItem(TLS)||'{}')||{};return o[user()||'_']||[];}catch(e){return [];}}
  function saveTasks(list){try{var o=JSON.parse(localStorage.getItem(TLS)||'{}')||{};o[user()||'_']=list;localStorage.setItem(TLS,JSON.stringify(o));}catch(e){}}
  function addTask(t){var l=loadTasks();l.push({id:'t_'+Date.now().toString(36),text:t,done:false});saveTasks(l);}
  function toggleTask(id){var l=loadTasks();l.forEach(function(x){if(x.id===id)x.done=!x.done;});saveTasks(l);}
  function delTask(id){saveTasks(loadTasks().filter(function(x){return x.id!==id;}));}

  function agItem(it){
    var K=(window.KB_AGENDA&&window.KB_AGENDA.kinds)||{}; var k=K[it.kind]||{ic:'📌',c:'#6b7280',l:'Termin'};
    var who=it.studentId?(' · 👤 '+esc(studentName(it.studentId))):'';
    return '<div class="home-ag" style="border-left-color:'+k.c+'"><span class="home-ag-t">'+esc(it.start||'')+(it.end?('–'+esc(it.end)):'')+'</span><span class="home-ag-x">'+k.ic+' '+esc(it.title||k.l)+who+'</span></div>';
  }

  function render(){
    var host=document.getElementById('isa-home-body'); if(!host)return;
    var u=user(); var today=new Date(); var tIso=iso(today);
    var students=(window.KB_ROSTER?window.KB_ROSTER.list():[]);
    var todayAg=(window.KB_AGENDA?window.KB_AGENDA.forDate(tIso):[]);
    var up=(window.KB_AGENDA?window.KB_AGENDA.upcoming(7):[]).filter(function(a){return a.date!==tIso;}).slice(0,6);
    var tasks=loadTasks(); var openTasks=tasks.filter(function(t){return !t.done;});
    var entries=[]; try{entries=(Repo.listEntries?Repo.listEntries():[]).slice();}catch(e){entries=[];}
    entries.sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:((a.createdAt||'')<(b.createdAt||'')?1:-1));});
    var recent=entries.slice(0,6);

    /* Kopf */
    var hello='<div class="home-hero"><div><div class="home-hi">'+esc(u?('Moien, '+u+' 👋'):'Willkommen 👋')+'</div><div class="home-date">'+esc(fmtLong(today))+'</div></div>'+
      '<div class="home-quick"><button class="btn btn-sm" data-home="agenda">🗓️ Termin</button><button class="btn btn-sm" data-home="note">✍️ Notiz</button><button class="btn btn-sm" data-home="add-student">➕ Schüler</button></div></div>';

    /* Heute */
    var todayCard='<div class="card home-card"><h3 class="home-h">🌤️ Heute</h3>'+
      (todayAg.length?('<div class="home-ag-list">'+todayAg.map(agItem).join('')+'</div>'):'<p class="muted">Keine Termine für heute. <a href="#" data-home="agenda">Terminplan öffnen →</a></p>')+'</div>';

    /* Demnächst */
    var upByDay={}; up.forEach(function(a){(upByDay[a.date]=upByDay[a.date]||[]).push(a);});
    var upHtml=Object.keys(upByDay).sort().map(function(dt){
      return '<div class="home-up-day"><div class="home-up-date">'+esc(fmtD(dt))+'</div>'+upByDay[dt].map(agItem).join('')+'</div>';
    }).join('');
    var upCard='<div class="card home-card"><h3 class="home-h">📅 Demnächst <span class="muted" style="font-weight:600;font-size:.8em;">(7 Tage)</span></h3>'+
      (upHtml||'<p class="muted">Keine anstehenden Termine.</p>')+'</div>';

    /* Aufgaben */
    var taskRows=tasks.slice().sort(function(a,b){return (a.done?1:0)-(b.done?1:0);}).map(function(t){
      return '<label class="home-task'+(t.done?' is-done':'')+'"><input type="checkbox" data-task-toggle="'+esc(t.id)+'"'+(t.done?' checked':'')+'><span>'+esc(t.text)+'</span><button class="home-task-x" data-task-del="'+esc(t.id)+'" title="Löschen">✕</button></label>';
    }).join('');
    var taskCard='<div class="card home-card"><h3 class="home-h">✅ Aufgaben'+(openTasks.length?(' <span class="home-badge">'+openTasks.length+'</span>'):'')+'</h3>'+
      '<div class="home-task-add"><input class="kb-in" id="home-task-in" placeholder="Neue Aufgabe … (Enter)"><button class="btn btn-sm btn-primary" id="home-task-btn">+</button></div>'+
      (taskRows?('<div class="home-tasks">'+taskRows+'</div>'):'<p class="muted" style="margin-top:8px;">Keine Aufgaben — trag hier ein, was du nicht vergessen willst.</p>')+'</div>';

    /* Letzte Notizen */
    var noteRows=recent.map(function(e){
      var nm=studentName(e.studentId);
      var r='#/student/'+encodeURIComponent(e.studentId)+'?hub=notizen';
      return '<a class="home-note" href="'+r+'" data-route="'+r+'"><div class="home-note-h"><b>'+esc(nm||'Schüler')+'</b><span class="muted">'+esc(fmtD(e.date))+'</span></div><div class="home-note-c"><span class="isa-cat">'+esc(e.category||'Notiz')+'</span> '+esc((e.text||'').slice(0,120))+((e.text||'').length>120?'…':'')+'</div></a>';
    }).join('');
    var noteCard='<div class="card home-card"><h3 class="home-h">🗒️ Letzte Notizen</h3>'+
      (noteRows||'<p class="muted">Noch keine Notizen. Öffne einen Schüler und halte deine erste Beobachtung fest.</p>')+'</div>';

    /* Schüler-Schnellzugriff */
    var studChips=students.slice(0,12).map(function(s){var r='#/student/'+encodeURIComponent(s.id)+'?hub=uebersicht';return '<a class="home-chip" href="'+r+'" data-route="'+r+'">'+esc(s.name)+'</a>';}).join('');
    var studCard='<div class="card home-card"><h3 class="home-h">👥 Meine Schüler <span class="muted" style="font-weight:600;font-size:.8em;">('+students.length+')</span></h3>'+
      (students.length?('<div class="home-chips">'+studChips+'</div>'):'<p class="muted">Noch keine Schüler angelegt. <a href="#" data-home="add-student">Ersten Schüler hinzufügen →</a></p>')+'</div>';

    host.innerHTML=hello+'<div class="home-grid"><div class="home-col">'+todayCard+upCard+studCard+'</div><div class="home-col">'+taskCard+noteCard+'</div></div>';
    wire(host);
  }

  function wire(host){
    host.querySelectorAll('[data-home]').forEach(function(el){el.addEventListener('click',function(ev){
      var a=el.getAttribute('data-home');
      if(a==='agenda'){ev.preventDefault();if(window.__kbGo)window.__kbGo('agenda');}
      else if(a==='add-student'){ev.preventDefault();if(window.__isaAddStudent)window.__isaAddStudent();}
      else if(a==='note'){ev.preventDefault();if(window.__kbGo)window.__kbGo('students');}
    });});
    var tin=document.getElementById('home-task-in'), tbtn=document.getElementById('home-task-btn');
    function add(){var v=(tin&&tin.value||'').trim();if(!v)return;addTask(v);render();}
    if(tbtn)tbtn.addEventListener('click',add);
    if(tin)tin.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();add();}});
    host.querySelectorAll('[data-task-toggle]').forEach(function(el){el.addEventListener('change',function(){toggleTask(el.getAttribute('data-task-toggle'));render();});});
    host.querySelectorAll('[data-task-del]').forEach(function(el){el.addEventListener('click',function(e){e.preventDefault();delTask(el.getAttribute('data-task-del'));render();});});
  }

  /* Team-Sync/Backup der Aufgaben: ein Datensatz je Mitarbeiter. */
  function syncExport(){try{var o=JSON.parse(localStorage.getItem(TLS)||'{}')||{};var out=[];for(var k in o){out.push({id:k,tasks:o[k]||[]});}return out;}catch(e){return [];}}
  function syncApply(arr){
    if(!arr)return;
    var o={};for(var i=0;i<arr.length;i++){var r=arr[i];if(r&&r.id){o[r.id]=r.tasks||[];}}
    try{localStorage.setItem(TLS,JSON.stringify(o));}catch(e){}
    var h=document.getElementById('isa-home');
    if(h&&h.classList.contains('active')){try{render();}catch(e){}}
  }

  return {render:render, syncExport:syncExport, syncApply:syncApply};
})();
`;
var ISA_CSS = `
/* ---- ISA-Journal: Teal-Akzent (unterscheidet die App klar vom Klassebuch) ---- */
:root{
  --kb-accent:#0f766e; --kb-accent-dark:#0b5b54; --kb-accent-light:#7dd3c8;
  --kb-accent-50:#e7f4f1; --kb-accent-100:#c9e8e2; --kb-accent-200:#a7dad1;
}
/* Kategorie-Badge (Notizen) */
.isa-cat{display:inline-block;background:var(--kb-accent-50);color:var(--kb-accent-dark);border:1px solid var(--kb-accent-100);border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:700;white-space:nowrap;}
/* ---- Notizen-Tab ---- */
.isa-notes-head{display:flex;justify-content:flex-end;margin-bottom:12px;}
.isa-note-card{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:var(--kb-shadow-sm);}
.isa-note-top{display:flex;align-items:center;gap:10px;margin-bottom:6px;}
.isa-note-meta{color:var(--kb-muted);font-size:12.5px;margin-left:auto;}
.isa-note-edit{text-decoration:none;color:var(--kb-muted);border:1px solid var(--kb-border);border-radius:8px;width:28px;height:28px;display:inline-grid;place-items:center;flex:0 0 auto;}
.isa-note-edit:hover{color:var(--kb-accent);border-color:var(--kb-accent);}
.isa-note-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
.isa-tag{background:var(--kb-bg);border:1px solid var(--kb-border);border-radius:999px;padding:1px 8px;font-size:11px;color:var(--kb-muted);}
.isa-note-mini{padding:8px 0;border-top:1px solid var(--kb-border);}
.isa-note-mini:first-of-type{border-top:none;}
.isa-note-mini-h{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:12.5px;margin-bottom:3px;}
.hub-quickbar{display:flex;justify-content:flex-end;margin:0 0 14px;}
.isa-dash-add{display:flex;justify-content:flex-end;margin:0 0 12px;}
.isa-note-text{white-space:pre-wrap;}
.isa-nq{font-weight:700;color:var(--kb-accent-dark);}
/* ---- Notiz-Composer (geführte Fragen) ---- */
.nc-ov{position:fixed;inset:0;background:rgba(15,25,30,.45);z-index:210;display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;}
.nc-modal{background:var(--kb-surface);border-radius:16px;width:100%;max-width:560px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;}
.nc-h{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--kb-border);font-size:16px;}
.nc-x{border:none;background:none;font-size:18px;cursor:pointer;color:var(--kb-muted);}
.nc-types{display:flex;flex-wrap:wrap;gap:7px;padding:14px 20px 4px;}
.nc-type{border:1px solid var(--kb-border);background:var(--kb-bg);border-radius:999px;padding:6px 12px;font:inherit;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--kb-text);transition:.12s;}
.nc-type:hover{border-color:var(--nc);}
.nc-type.on{background:var(--nc);border-color:var(--nc);color:#fff;}
.nc-body{padding:8px 20px 4px;}
.nc-hint{color:var(--kb-muted);font-size:12.5px;margin:2px 0 10px;}
.nc-l{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:700;color:var(--kb-muted);margin-bottom:12px;}
.nc-date{max-width:200px;}
.nc-in{font:inherit;font-weight:500;color:var(--kb-text);padding:9px 11px;border:1px solid var(--kb-border);border-radius:9px;background:var(--kb-bg);resize:vertical;}
.nc-in:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.nc-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--kb-border);}
/* ---- Fortschritt & Ziele ---- */
.pei-intro{background:var(--kb-accent-50);border:1px solid var(--kb-accent-100);color:var(--kb-accent-dark);border-radius:10px;padding:10px 14px;font-size:13.5px;margin:0 0 16px;}
.pei-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;margin-bottom:16px;}
.pei-col{padding:16px 18px;}
.pei-add{display:flex;gap:8px;margin-bottom:12px;}
.pei-add .kb-in{flex:1;}
.pei-list{display:flex;flex-direction:column;gap:6px;}
.pei-item{display:flex;gap:10px;align-items:flex-start;background:var(--kb-bg);border:1px solid var(--kb-border);border-radius:9px;padding:8px 10px;}
.pei-check input{width:17px;height:17px;accent-color:var(--kb-accent);cursor:pointer;margin-top:1px;}
.pei-txt{flex:1;min-width:0;font-size:13.5px;}
.pei-meta{color:var(--kb-muted);font-size:11.5px;margin-top:3px;}
.pei-item.is-done .pei-txt>div:first-child{text-decoration:line-through;color:var(--kb-muted);}
.pei-del{border:none;background:none;color:var(--kb-muted);cursor:pointer;font-size:13px;opacity:.5;}
.pei-del:hover{opacity:1;color:var(--kb-danger);}
.pei-sug{padding:16px 18px;}
.pei-sug-card{border:1px solid var(--kb-border);border-radius:11px;padding:11px 13px;margin-bottom:10px;background:var(--kb-bg);}
.pei-sug-lbl{font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.pei-sug-n{background:var(--kb-accent-50);color:var(--kb-accent-dark);border-radius:999px;font-size:11px;padding:0 7px;font-weight:700;}
.pei-sug-x{margin-left:auto;border:1px solid var(--kb-border);background:var(--kb-surface);border-radius:7px;font-size:11.5px;padding:2px 8px;cursor:pointer;color:var(--kb-muted);font-weight:600;}
.pei-sug-x:hover{border-color:var(--kb-danger);color:var(--kb-danger);}
.pei-sug-opt{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px dashed var(--kb-border);}
.pei-sug-txt{flex:1;font-size:13px;color:var(--kb-text);}
/* ---- PEI-Ziele (ELDiB) ---- */
.eldib-card{padding:16px 18px;margin-bottom:16px;}
.eldib-add{display:flex;gap:8px;}
.eldib-add .kb-in{flex:1;}
.eldib-warn{color:var(--kb-danger);}
.eldib-warn:empty{display:none;}
.eldib-list{display:flex;flex-direction:column;gap:7px;margin-top:12px;}
.eldib-chip{display:flex;align-items:center;gap:10px;background:var(--kb-bg);border:1px solid var(--kb-border);border-radius:9px;padding:6px 10px;}
.eldib-code{color:#fff;font-weight:800;font-size:11.5px;border-radius:6px;padding:2px 8px;letter-spacing:.02em;white-space:nowrap;flex:0 0 auto;}
.eldib-lbl{flex:1;font-size:13.5px;font-weight:600;color:var(--kb-text);min-width:0;}
.eldib-del{border:none;background:none;color:var(--kb-muted);cursor:pointer;font-size:13px;opacity:.5;flex:0 0 auto;}
.eldib-del:hover{opacity:1;color:var(--kb-danger);}
.eldib-chip .hub-mat{flex:0 0 auto;}
@media(max-width:820px){ .pei-grid{grid-template-columns:1fr;} }
/* ---- Mein Tag ---- */
/* Karten, Knöpfe, Links und Felder auch außerhalb des Schülerbereichs (Mein Tag, Terminplan) –
   die Dossier-Stile gelten nur in #dos-root, deshalb sahen die Knöpfe hier wie Browser-Knöpfe aus */
#isa-home .card,#isa-agenda .card{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:16px;box-shadow:var(--kb-shadow-sm);}
#isa-home .btn,#isa-agenda .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--kb-border);background:var(--kb-surface);color:var(--kb-text);font:inherit;font-size:13.5px;font-weight:650;line-height:1.2;padding:8px 13px;border-radius:10px;cursor:pointer;transition:border-color .12s,color .12s,background .12s;}
#isa-home .btn:hover,#isa-agenda .btn:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
#isa-home .btn-sm,#isa-agenda .btn-sm{font-size:12.5px;padding:6px 11px;}
#isa-home .btn-primary,#isa-agenda .btn-primary{background:var(--kb-accent);border-color:var(--kb-accent);color:#fff;}
#isa-home .btn-primary:hover,#isa-agenda .btn-primary:hover{background:var(--kb-accent-dark);border-color:var(--kb-accent-dark);color:#fff;}
#isa-home .btn[disabled],#isa-agenda .btn[disabled]{opacity:.5;cursor:not-allowed;}
#isa-home a,#isa-agenda a{color:var(--kb-accent);font-weight:650;text-decoration:none;}
#isa-home a:hover,#isa-agenda a:hover{text-decoration:underline;}
#isa-home input:not([type=checkbox]):not([type=radio]),#isa-agenda input:not([type=checkbox]):not([type=radio]){border:1px solid var(--kb-border);border-radius:10px;padding:8px 12px;font:inherit;font-size:14px;background:var(--kb-surface);color:var(--kb-text);}
#isa-home input:focus,#isa-agenda input:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
#isa-home .muted,#isa-agenda .muted{color:var(--kb-muted);font-size:14px;}
.home-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px;}
.home-hi{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--kb-text);}
.home-date{color:var(--kb-muted);font-size:14px;margin-top:2px;}
.home-quick{display:flex;gap:8px;flex-wrap:wrap;}
.home-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start;}
.home-col{display:flex;flex-direction:column;gap:16px;min-width:0;}
.home-card{padding:16px 18px;}
.home-h{margin:0 0 12px;font-size:15px;font-weight:800;display:flex;align-items:center;gap:8px;}
.home-badge{background:var(--kb-accent);color:#fff;border-radius:999px;font-size:11px;padding:1px 8px;font-weight:700;}
.home-ag,.home-up-day .home-ag{display:flex;align-items:center;gap:10px;border-left:3px solid var(--kb-accent);background:var(--kb-bg);border-radius:8px;padding:7px 10px;margin-bottom:6px;}
.home-ag-t{font-variant-numeric:tabular-nums;font-weight:700;font-size:12.5px;color:var(--kb-accent-dark);min-width:74px;}
.home-ag-x{font-size:13.5px;color:var(--kb-text);}
.home-up-day{margin-bottom:12px;}
.home-up-date{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--kb-muted);margin:0 0 5px;}
.home-task-add{display:flex;gap:8px;margin-bottom:10px;}
.home-task-add .kb-in{flex:1;}
.home-tasks{display:flex;flex-direction:column;gap:2px;}
.home-task{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;font-size:14px;}
.home-task:hover{background:var(--kb-bg);}
.home-task input{width:17px;height:17px;accent-color:var(--kb-accent);cursor:pointer;flex:0 0 auto;}
.home-task span{flex:1;}
.home-task.is-done span{text-decoration:line-through;color:var(--kb-muted);}
.home-task-x{border:none;background:none;color:var(--kb-muted);cursor:pointer;font-size:13px;opacity:0;}
.home-task:hover .home-task-x{opacity:1;}
.home-note{display:block;text-decoration:none;color:inherit;padding:9px 0;border-top:1px solid var(--kb-border);}
.home-note:first-of-type{border-top:none;}
.home-note-h{display:flex;justify-content:space-between;gap:8px;font-size:13px;}
.home-note-c{color:var(--kb-muted);font-size:13px;margin-top:3px;}
.home-note:hover .home-note-h b{color:var(--kb-accent);}
.home-chips{display:flex;flex-wrap:wrap;gap:7px;}
.home-chip{text-decoration:none;background:var(--kb-accent-50);color:var(--kb-accent-dark);border:1px solid var(--kb-accent-100);border-radius:999px;padding:4px 12px;font-size:13px;font-weight:600;}
.home-chip:hover{background:var(--kb-accent);color:#fff;border-color:var(--kb-accent);}
/* ---- Terminplan ---- */
/* Schuljahr-Auswahl (Seitenleiste) */
.kb-yearbar{margin:0 0 12px;padding:8px 10px;border:1px solid var(--kb-border);border-radius:12px;background:var(--kb-bg);}
.kb-yl{display:block;font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:var(--kb-muted);margin:0 0 6px;}
.kb-yrow{display:flex;gap:6px;align-items:center;}
.kb-ysel{flex:1;min-width:0;font:inherit;font-weight:700;color:var(--kb-text);background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:9px;padding:6px 8px;cursor:pointer;}
.kb-ysel:hover{border-color:var(--kb-accent);}
.kb-ymgr{flex:0 0 auto;width:32px;height:32px;border:1px solid var(--kb-border);border-radius:9px;background:var(--kb-surface);cursor:pointer;font-size:16px;line-height:1;color:var(--kb-muted);}
.kb-ymgr:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
/* Schuljahr-Verwaltung (Modal) */
.kb-ymodal{position:fixed;inset:0;background:rgba(15,23,42,.5);display:none;align-items:flex-start;justify-content:center;padding:6vh 16px;z-index:120;}
.kb-ymodal.open{display:flex;}
.kb-ymodal-card{background:var(--kb-surface);border-radius:16px;max-width:520px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:18px 18px 20px;max-height:88vh;overflow:auto;}
.kb-ymodal-h{display:flex;justify-content:space-between;align-items:center;font-size:18px;margin-bottom:6px;}
.kb-ymodal-x{border:none;background:transparent;font-size:18px;cursor:pointer;color:var(--kb-muted);padding:4px 8px;border-radius:8px;}
.kb-ymodal-x:hover{background:var(--kb-bg);}
.kb-ym-note{color:var(--kb-muted);font-size:13px;line-height:1.5;margin:0 0 14px;}
.kb-ym-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.kb-ym-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--kb-border);border-radius:11px;background:var(--kb-bg);flex-wrap:wrap;}
.kb-ym-item.is-active{border-color:var(--kb-accent);box-shadow:0 0 0 1px var(--kb-accent);}
.kb-ym-label{font-weight:800;color:var(--kb-text);display:flex;align-items:center;gap:8px;}
.kb-ym-actions{display:flex;gap:6px;flex-wrap:wrap;}
.kb-ym-badge{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;background:var(--kb-accent);color:#fff;border-radius:999px;padding:2px 8px;}
.kb-ym-badge.closed{background:#94a3b8;}
.kb-ym-new{border-top:1px solid var(--kb-border);padding-top:14px;}
.kb-ym-new-h{font-weight:800;margin-bottom:8px;}
.kb-ym-new-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.kb-ym-new-row .kb-in{flex:1;min-width:150px;}
.kb-ym-carry{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:var(--kb-muted);cursor:pointer;}
/* Terminplan: Jahr-Label + Abschluss-Banner */
.ag-year{font-size:13px;font-weight:800;background:var(--kb-accent);color:#fff;border-radius:999px;padding:2px 12px;vertical-align:middle;margin-left:8px;}
.ag-closed{margin:8px 0 0;padding:9px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px;font-weight:600;}
.ag-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:6px 0 14px;}
.ag-nav{display:flex;align-items:center;gap:6px;}
.ag-range{font-weight:700;margin-left:6px;color:var(--kb-text);}
.ag-actions{display:flex;gap:8px;flex-wrap:wrap;}
.ag-week{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;align-items:start;}
.ag-col{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:12px;overflow:hidden;min-width:0;}
.ag-col.ag-today{border-color:var(--kb-accent);box-shadow:0 0 0 1px var(--kb-accent);}
.ag-col-h{padding:9px 11px;font-weight:700;font-size:13px;background:var(--kb-bg);border-bottom:1px solid var(--kb-border);display:flex;justify-content:space-between;align-items:center;}
.ag-heute{background:var(--kb-accent);color:#fff;border-radius:999px;font-size:10.5px;padding:1px 7px;font-weight:700;}
.ag-col-b{padding:8px;display:flex;flex-direction:column;gap:6px;min-height:60px;}
.ag-item{display:flex;gap:8px;align-items:flex-start;background:var(--kb-bg);border-left:3px solid var(--kb-accent);border-radius:8px;padding:7px 9px;cursor:pointer;transition:.1s;}
.ag-item:hover{background:var(--kb-accent-50);}
.ag-item.ag-done{opacity:.55;}
.ag-time{font-variant-numeric:tabular-nums;font-weight:700;font-size:11.5px;color:var(--kb-accent-dark);white-space:nowrap;}
.ag-body{min-width:0;flex:1;}
.ag-title{font-size:13px;font-weight:600;line-height:1.25;}
.ag-sub{font-size:11.5px;color:var(--kb-muted);margin-top:2px;display:flex;flex-wrap:wrap;gap:6px;}
.ag-badge{font-size:9.5px;color:var(--kb-muted);align-self:flex-start;border:1px solid var(--kb-border);border-radius:5px;padding:0 4px;}
.ag-empty{color:var(--kb-muted);font-size:12px;text-align:center;padding:6px 0;}
.ag-add-day{margin-top:2px;border:1px dashed var(--kb-border);background:none;color:var(--kb-muted);border-radius:8px;padding:5px;font-size:12px;cursor:pointer;font-weight:600;}
.ag-add-day:hover{border-color:var(--kb-accent);color:var(--kb-accent);}
.ag-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px;font-size:12px;color:var(--kb-muted);}
.ag-leg{display:inline-flex;align-items:center;gap:6px;}
.ag-dot{width:10px;height:10px;border-radius:3px;display:inline-block;}
.ag-form-ov{position:fixed;inset:0;background:rgba(15,25,30,.42);z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;}
.ag-form{background:var(--kb-surface);border-radius:16px;width:100%;max-width:460px;padding:20px 22px;box-shadow:0 24px 60px rgba(0,0,0,.35);max-height:92vh;overflow:auto;}
.ag-form-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:16px;}
.ag-x{border:none;background:none;font-size:18px;cursor:pointer;color:var(--kb-muted);}
.ag-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ag-l{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:var(--kb-muted);margin-bottom:10px;}
.ag-in{font:inherit;font-weight:500;color:var(--kb-text);padding:8px 10px;border:1px solid var(--kb-border);border-radius:9px;background:var(--kb-bg);}
.ag-in:focus{outline:none;border-color:var(--kb-accent);box-shadow:0 0 0 3px var(--kb-accent-50);}
.ag-form-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;}
@media(max-width:820px){ .home-grid{grid-template-columns:1fr;} .ag-week{grid-template-columns:1fr;} }
`;

var parts = [
  '<!DOCTYPE html>',
  '<!-- GENERIERT von build-isa.cjs aus dossier.html + SAVOIR.html + ISA-App.html.',
  '     Nicht direkt bearbeiten — Quelle ändern und neu bauen: node build-isa.cjs -->',
  '<html lang="de">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '<title>Journal · CDSE</title>',
  '<meta name="theme-color" content="#0f766e">',
  '<link rel="icon" href="' + FAVICON + '">',
  '<style>',
  '/* === Gemeinsames Gerüst === */', SHELL_CSS,
  '/* === Rechtschreibpruefung === */', SPELL_CSS,
  '/* === dossier (gescoped) === */', dosStyleScoped,
  '/* === Akzent-Vereinheitlichung === */', ACCENT_OVERRIDE,
  '/* === Material / Isa-Toolbox === */', MATERIAL_CSS,
  '/* === ISA-Journal (Home · Terminplan · Notizen) === */', ISA_CSS,
  '</style>',
  '</head>',
  '<body>',
  SHELL_BODY_TOP,
  '<section class="kb-panel" id="dos-root">', dosBody, '</section>',
  '<section class="kb-panel kb-pad" id="isa-home"><div id="isa-home-body"></div></section>',
  '<section class="kb-panel kb-pad" id="isa-agenda"><div id="isa-agenda-body"></div></section>',
  SHELL_PANELS_EXTRA,
  '<script src="toolbox-index.js"></' + 'script>',
  '<script src="../hub-apps.js"></' + 'script>',
  '<script>window.KB_TAXONOMY=' + jsonForScript(TAXONOMY_JSON) + ';</' + 'script>',
  '<script>' + ROSTER_MODULE + '</' + 'script>',
  '<script>' + dosScript + '</' + 'script>',
  '<script>' + DOS_OVERRIDES + '</' + 'script>',
  '<script>' + BUBBLE_MODULE + '</' + 'script>',
  '<script>' + SCREENING_MODULE + '</' + 'script>',
  '<script>' + SYNC_MODULE + '</' + 'script>',
  '<script>' + MATERIALS_MODULE + '</' + 'script>',
  '<script>' + ISA_NOTES_MODULE + '</' + 'script>',
  '<script>' + ISA_BACKUP_MODULE + '</' + 'script>',
  '<script>' + ISA_YEAR_MODULE + '</' + 'script>',
  '<script>' + AGENDA_MODULE + '</' + 'script>',
  '<script>' + ISA_HOME_MODULE + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '<script>' + TABS_GUARD + '</' + 'script>',
  '<script>' + SPELL_DATA + '</' + 'script>',
  '<script>' + NSPELL_JS + '</' + 'script>',
  '<script>' + SPELL_JS + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

var ZIEL = process.env.KB_ZIEL || path.join(ROOT, '..', '..', 'apps', 'journal.html');
fs.writeFileSync(ZIEL, parts.join('\n'), 'utf8');
console.log(path.relative(process.cwd(), ZIEL) + ' geschrieben: ' + Math.round(Buffer.byteLength(parts.join('\n')) / 1024) + ' KB');
