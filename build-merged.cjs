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
/* ===== Geführter klinischer Trichter (KB_GUIDE) ===== */
.kb-guide-disc{font-size:13px;line-height:1.55;color:var(--kb-text-soft);background:var(--kb-accent-50);border:1px solid var(--kb-accent-100);border-radius:12px;padding:11px 14px;margin:0 0 16px;}
.kb-guide-host{margin:0;}
.kb-guide-footer{margin-top:16px;text-align:center;}
.kb-guide-expert{color:var(--kb-muted);}
.gd-steps{display:flex;align-items:center;gap:4px;margin:0 0 18px;flex-wrap:wrap;}
.gd-step{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--kb-muted-2);}
.gd-step .gd-num{width:21px;height:21px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:var(--kb-surface-2);border:1px solid var(--kb-border);color:var(--kb-muted);}
.gd-step.is-on{color:var(--kb-accent);}
.gd-step.is-on .gd-num{background:var(--kb-accent);border-color:var(--kb-accent);color:#fff;}
.gd-step.is-done{color:var(--kb-accent2-dark);}
.gd-step.is-done .gd-num{background:var(--kb-accent2-50);border-color:transparent;color:var(--kb-accent2-dark);}
.gd-sep{flex:0 0 12px;height:2px;border-radius:2px;background:var(--kb-border);}
.gd-card{background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:18px;padding:22px 24px;box-shadow:var(--kb-shadow-sm);}
.gd-kicker{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--kb-accent);margin:0 0 6px;}
.gd-q{font-size:19px;font-weight:800;letter-spacing:-.01em;margin:0 0 4px;color:var(--kb-text);line-height:1.25;}
.gd-sub{font-size:13.5px;color:var(--kb-muted);margin:0 0 16px;line-height:1.5;}
.gd-progress{height:6px;border-radius:6px;background:var(--kb-surface-2);overflow:hidden;margin:0 0 18px;}
.gd-progress>i{display:block;height:100%;background:linear-gradient(90deg,var(--kb-accent),var(--kb-accent-light));border-radius:6px;transition:width .3s ease;}
.gd-chips{display:flex;flex-wrap:wrap;gap:9px;}
.gd-chip{font:inherit;font-size:13.5px;font-weight:600;text-align:left;padding:10px 14px;border-radius:12px;background:var(--kb-surface);border:1.5px solid var(--kb-border);color:var(--kb-text);cursor:pointer;transition:border-color .12s ease,background .12s ease;line-height:1.35;}
.gd-chip:hover{border-color:var(--kb-accent-light);background:var(--kb-accent-50);}
.gd-chip.is-sel{border-color:var(--kb-accent);background:var(--kb-accent-50);color:var(--kb-accent-dark);}
.gd-chip.is-sel::before{content:'✓ ';font-weight:900;}
.gd-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(208px,1fr));gap:10px;}
.gd-cat{font:inherit;text-align:left;padding:13px 15px;border-radius:14px;background:var(--kb-surface);border:1.5px solid var(--kb-border);cursor:pointer;transition:border-color .12s ease,background .12s ease;}
.gd-cat:hover{border-color:var(--kb-accent-light);}
.gd-cat.is-sel{border-color:var(--kb-accent);background:var(--kb-accent-50);}
.gd-cat.is-lock{border-color:transparent;background:var(--kb-danger-50);cursor:default;}
.gd-cat-t{font-weight:800;font-size:13.5px;color:var(--kb-text);display:flex;align-items:center;gap:6px;}
.gd-cat-t .gd-cat-n{margin-left:auto;font-size:11px;font-weight:800;color:#fff;background:var(--kb-accent);border-radius:999px;padding:1px 7px;}
.gd-cat-f{font-size:11.5px;color:var(--kb-muted);margin-top:3px;line-height:1.4;}
.gd-opts{display:flex;flex-direction:column;gap:8px;}
.gd-opt{font:inherit;font-size:14px;font-weight:600;text-align:left;padding:12px 16px;border-radius:12px;background:var(--kb-surface);border:1.5px solid var(--kb-border);color:var(--kb-text);cursor:pointer;display:flex;align-items:center;gap:11px;transition:border-color .12s ease,background .12s ease;}
.gd-opt:hover{border-color:var(--kb-accent-light);background:var(--kb-accent-50);}
.gd-opt.is-sel{border-color:var(--kb-accent);background:var(--kb-accent-50);color:var(--kb-accent-dark);}
.gd-opt .gd-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--kb-border);flex:0 0 auto;}
.gd-opt.is-sel .gd-radio{border-color:var(--kb-accent);background:radial-gradient(circle at center,var(--kb-accent) 0 4px,transparent 5px);}
.gd-conv{margin-top:18px;background:var(--kb-accent2-50);border-radius:12px;padding:12px 15px;}
.gd-conv-h{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--kb-accent2-dark);margin:0 0 8px;}
.gd-conv-row{display:flex;align-items:center;gap:10px;margin:0 0 6px;font-size:13px;}
.gd-conv-row:last-child{margin-bottom:0;}
.gd-conv-n{flex:1;font-weight:700;color:var(--kb-text);}
.gd-conv-bar{flex:0 0 90px;height:7px;border-radius:7px;background:#fff;overflow:hidden;}
.gd-conv-bar>i{display:block;height:100%;background:var(--kb-accent2);border-radius:7px;transition:width .3s ease;}
.gd-nav{display:flex;align-items:center;gap:10px;margin-top:20px;}
.gd-nav .gd-spacer{flex:1;}
.gd-back{font:inherit;font-weight:700;font-size:14px;background:none;border:none;color:var(--kb-muted);cursor:pointer;padding:10px 4px;}
.gd-back:hover{color:var(--kb-text);}
.gd-count{font-size:12.5px;color:var(--kb-muted);font-weight:600;}
.gd-axis{width:100%;font:inherit;text-align:left;padding:14px 18px;border-radius:14px;background:var(--kb-surface);border:1.5px solid var(--kb-border);cursor:pointer;margin:0 0 10px;display:flex;align-items:center;gap:14px;transition:border-color .12s ease,transform .12s ease,box-shadow .12s ease;}
.gd-axis:hover{border-color:var(--kb-accent);transform:translateX(2px);box-shadow:var(--kb-shadow-sm);}
.gd-axis-rank{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;background:var(--kb-accent-50);color:var(--kb-accent-dark);flex:0 0 auto;}
.gd-axis-b{flex:1;}
.gd-axis-n{font-weight:800;font-size:15px;color:var(--kb-text);}
.gd-axis-meta{font-size:12px;color:var(--kb-muted);margin-top:2px;}
.gd-axis-go{color:var(--kb-accent);font-weight:800;font-size:20px;}
.gd-axis.is-sel{border-color:var(--kb-accent);background:var(--kb-accent-50);}
.gd-check{width:24px;height:24px;border-radius:7px;border:2px solid var(--kb-border);flex:0 0 auto;display:grid;place-items:center;font-weight:900;color:#fff;font-size:14px;line-height:1;}
.gd-axis.is-sel .gd-check{background:var(--kb-accent);border-color:var(--kb-accent);}
.gd-multi-h{font-size:13.5px;font-weight:800;color:var(--kb-text-soft);margin:2px 2px 12px;}
/* ===== Stylisches Lese-Ergebnis (Submuster) ===== */
.gd-axiscard{margin-bottom:16px;padding:0;overflow:hidden;}
.rs-hero{padding:20px 22px 16px;background:linear-gradient(135deg,var(--kb-accent-50),var(--kb-surface) 70%);border-bottom:1px solid var(--kb-border);}
.rs-hero-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 9px;}
.rs-hero-badge{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--kb-accent2-dark);background:var(--kb-accent2-50);padding:4px 11px;border-radius:999px;}
.rs-axis-chip{font-size:12px;font-weight:700;color:var(--kb-accent-dark);background:#fff;border:1px solid var(--kb-accent-100);padding:4px 11px;border-radius:999px;}
.rs-hero-name{font-size:23px;font-weight:900;letter-spacing:-.02em;line-height:1.15;color:var(--kb-text);}
.gd-axiscard .gd-caveat{margin:14px 18px 0;}
.rs-list{padding:14px 16px 18px;display:flex;flex-direction:column;gap:10px;}
.rs-sec{border:1px solid var(--kb-border);border-radius:14px;background:var(--kb-surface);overflow:hidden;transition:border-color .15s ease,box-shadow .15s ease;}
.rs-sec[open]{border-color:var(--kb-accent-200);box-shadow:var(--kb-shadow-sm);}
.rs-head{cursor:pointer;list-style:none;display:flex;align-items:center;gap:13px;padding:13px 15px;}
.rs-head::-webkit-details-marker{display:none;}
.rs-head:hover{background:var(--kb-accent-50);}
.rs-ic{width:38px;height:38px;flex:0 0 auto;display:grid;place-items:center;font-size:18px;border-radius:11px;background:var(--kb-accent-50);}
.rs-ht{flex:1;min-width:0;}
.rs-title{display:block;font-weight:800;font-size:14.5px;color:var(--kb-text);line-height:1.25;}
.rs-blurb{display:block;font-size:12.5px;color:var(--kb-muted);line-height:1.45;margin-top:2px;}
.rs-sec[open] .rs-blurb{display:none;}
.rs-more{flex:0 0 auto;font-size:11.5px;font-weight:700;color:var(--kb-accent);white-space:nowrap;}
.rs-sec[open] .rs-more{display:none;}
.rs-chev{flex:0 0 auto;color:var(--kb-muted);font-size:12px;transition:transform .18s ease;}
.rs-sec[open] .rs-chev{transform:rotate(180deg);}
.rs-body{padding:0 16px 16px;font-size:14px;line-height:1.6;color:var(--kb-text-soft);}
.rs-body>:first-child{margin-top:6px;}
.rs-gold-lead{font-weight:600;color:var(--kb-text);}
.gd-trend{font-size:12.5px;line-height:1.5;color:var(--kb-text-soft);background:var(--kb-surface-2);border:1px solid var(--kb-border);border-radius:10px;padding:9px 13px;margin:0 0 14px;}
/* ===== Verlauf-Timeline ===== */
.tl-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;}
.tl-chip{font-size:13px;font-weight:700;text-decoration:none;color:var(--kb-text-soft);background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:999px;padding:6px 13px;transition:all .12s ease;}
.tl-chip span{opacity:.6;font-weight:800;margin-left:3px;}
.tl-chip:hover{border-color:var(--kb-accent-light);color:var(--kb-text);}
.tl-chip.is-on{background:var(--kb-accent);border-color:var(--kb-accent);color:#fff;}
.tl-chip.is-on span{opacity:.85;}
.tl{position:relative;padding-left:8px;}
.tl-item{position:relative;display:flex;gap:14px;padding:0 0 18px 0;}
.tl-item::before{content:'';position:absolute;left:18px;top:38px;bottom:-4px;width:2px;background:var(--kb-border);}
.tl-item:last-child::before{display:none;}
.tl-ic{position:relative;z-index:1;width:38px;height:38px;flex:0 0 auto;display:grid;place-items:center;font-size:17px;border-radius:50%;background:var(--kb-surface);border:1.5px solid var(--kb-border);box-shadow:var(--kb-shadow-sm);}
.tl-screening .tl-ic{background:var(--kb-accent-50);border-color:var(--kb-accent-200);}
.tl-absence .tl-ic{background:var(--kb-warn-50);border-color:transparent;}
.tl-goal .tl-ic{background:var(--kb-accent2-50);border-color:transparent;}
.tl-c{flex:1;min-width:0;background:var(--kb-surface);border:1px solid var(--kb-border);border-radius:14px;padding:12px 15px;box-shadow:var(--kb-shadow-sm);}
.tl-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 5px;}
.tl-t{font-weight:800;font-size:14px;color:var(--kb-text);}
.tl-d{font-size:12px;color:var(--kb-muted);font-weight:600;white-space:nowrap;flex:0 0 auto;}
.tl-b{font-size:13.5px;line-height:1.55;color:var(--kb-text-soft);}
.tl-b .entry-body{margin:0;}
.tl-scr em{font-style:normal;font-weight:800;font-size:10.5px;text-transform:uppercase;letter-spacing:.02em;opacity:.8;}
.tl-goals{margin:4px 0 0;padding-left:18px;}
.tl-goals li{margin:2px 0;}
.gd-sb{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;padding:2px 8px;border-radius:8px;margin-left:8px;vertical-align:middle;}
.gd-sb-deutlich{background:var(--kb-danger-50);color:var(--kb-danger-dark);}
.gd-sb-mittel{background:var(--kb-warn-50);color:#8a5a00;}
.gd-sb-mild{background:var(--kb-accent-50);color:var(--kb-accent-dark);}
.gd-risk{background:var(--kb-danger-50);border-radius:12px;padding:12px 15px;margin:0 0 16px;color:var(--kb-danger-dark);font-size:13.5px;font-weight:600;line-height:1.5;}
.gd-result-head{text-align:center;padding:4px 0 2px;}
.gd-result-badge{display:inline-block;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--kb-accent2-dark);background:var(--kb-accent2-50);padding:4px 12px;border-radius:999px;}
.gd-result-name{font-size:22px;font-weight:900;letter-spacing:-.02em;margin:10px 0 2px;color:var(--kb-text);line-height:1.2;}
.gd-result-axis{font-size:13px;color:var(--kb-muted);}
.gd-acute{background:var(--kb-danger-50);border:1.5px solid var(--kb-danger);border-radius:14px;padding:14px 16px;margin:0 0 16px;}
.gd-acute.is-krit{background:var(--kb-danger);color:#fff;border-color:var(--kb-danger-dark);}
.gd-acute-h{font-weight:900;font-size:15px;color:var(--kb-danger-dark);margin:0 0 6px;}
.gd-acute.is-krit .gd-acute-h{color:#fff;}
.gd-acute-list{margin:0 0 8px;padding-left:20px;font-size:13.5px;font-weight:600;}
.gd-acute-do{font-size:13px;line-height:1.5;}
.gd-acute:not(.is-krit) .gd-acute-do{color:var(--kb-danger-dark);}
.gd-caveat{font-size:12.5px;line-height:1.5;color:var(--kb-text-soft);background:var(--kb-warn-50);border-radius:10px;padding:10px 13px;margin:14px 0 0;}
.gd-altbox{margin-top:16px;border:1px dashed var(--kb-accent-200);border-radius:12px;padding:13px 15px;background:var(--kb-accent-50);}
.gd-altbox-h{font-weight:800;font-size:13px;color:var(--kb-accent-dark);margin:0 0 4px;}
.gd-altbox p{font-size:13px;color:var(--kb-text-soft);margin:0 0 10px;line-height:1.5;}
.gd-gate-q{margin:0 0 16px;}
.gd-gate-t{font-weight:700;font-size:14px;color:var(--kb-text);margin:0 0 8px;}
.gd-conf{border-radius:12px;padding:13px 15px;margin:0 0 16px;border-left:4px solid var(--kb-muted);background:var(--kb-surface-2);}
.gd-conf-l{font-weight:800;font-size:14.5px;color:var(--kb-text);}
.gd-conf-t{font-size:12.5px;color:var(--kb-text-soft);margin-top:4px;line-height:1.5;}
.gd-conf-ok{border-left-color:var(--kb-accent2);background:var(--kb-accent2-50);}
.gd-conf-ok .gd-conf-l{color:var(--kb-accent2-dark);}
.gd-conf-warn{border-left-color:var(--kb-warn);background:var(--kb-warn-50);}
.gd-conf-warn .gd-conf-l{color:#8a5a00;}
.gd-conf-muted{border-left-color:var(--kb-muted-2);}
.gd-linkbtn{font:inherit;font-weight:700;font-size:inherit;background:none;border:none;color:var(--kb-accent);cursor:pointer;padding:0;text-decoration:underline;}
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
#sav-root .verdacht-guide{ font-size:13.5px; color:var(--kb-text-soft); background:var(--kb-accent-50); border:1px solid var(--kb-border); border-radius:10px; padding:10px 14px; margin:0 0 16px; line-height:1.5; }
#sav-root .verdacht-mild{ margin-top:14px; border-top:1px solid var(--kb-border); }
#sav-root .verdacht-mild>summary{ cursor:pointer; font-weight:700; font-size:13.5px; color:var(--kb-muted); padding:10px 0; list-style:none; }
#sav-root .verdacht-mild>summary::-webkit-details-marker{ display:none; }
#sav-root .verdacht-mild>summary::before{ content:'▸ '; color:var(--kb-muted); }
#sav-root .verdacht-mild[open]>summary::before{ content:'▾ '; }
/* Optionale "System & Kontext"-Sektion: standardmäßig ruhig & zugeklappt */
#sav-root .kontext-modul-fold{ border:1px dashed var(--kb-border); border-radius:12px; background:var(--kb-surface-2); padding:0; }
#sav-root .kontext-modul-fold>.kontext-modul-summary{ cursor:pointer; list-style:none; display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:13px 16px; font-weight:800; color:var(--kb-text); }
#sav-root .kontext-modul-fold>.kontext-modul-summary::-webkit-details-marker{ display:none; }
#sav-root .kontext-modul-fold>.kontext-modul-summary::before{ content:'▸'; color:var(--kb-muted); font-size:13px; transition:transform .15s; }
#sav-root .kontext-modul-fold[open]>.kontext-modul-summary::before{ transform:rotate(90deg); }
#sav-root .kontext-modul-fold .kontext-modul-opt{ font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--kb-muted); }
#sav-root .kontext-modul-fold .kontext-modul-badge{ margin-left:auto; font-size:11.5px; font-weight:800; color:#fff; background:var(--kb-accent2); border-radius:999px; padding:2px 9px; }
#sav-root .kontext-modul-fold>:not(summary){ padding-left:16px; padding-right:16px; }
#sav-root .kontext-modul-fold>.symdia-sym-grid{ padding-bottom:14px; }
#sav-root .kontext-modul-fold .kontext-modul-subline{ padding-top:2px; padding-bottom:10px; }
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
    <div class="kb-topbrand"><span class="kb-logo">📘</span><span>Klassebuch</span></div>
  </div>
  <aside class="kb-side" id="kb-side" aria-label="Hauptnavigation">
    <div class="kb-brand"><span class="kb-logo">📘</span><span class="kb-brandtext"><b>Klassebuch</b><small>Annexe Junglinster</small></span></div>
    <button class="kb-userchip" id="kb-userchip" aria-label="Aktuelle Person — klicken zum Wechseln"></button>
    <nav class="kb-nav">
      <button class="kb-link" data-kb-nav="students"><span class="kb-ic">👥</span>Schüler</button>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Unterricht</div>
        <button class="kb-link" data-kb-nav="absenzen"><span class="kb-ic">📋</span>Klassenbuch</button>
        <button class="kb-link" data-kb-nav="reunion"><span class="kb-ic">🤝</span>Réunionen</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Material</div>
        <button class="kb-link" data-kb-nav="material"><span class="kb-ic">🧰</span>Material-Bibliothek</button>
      </div>
      <div class="kb-navgroup">
        <div class="kb-navlabel">Lehrplan</div>
        <button class="kb-link" data-kb-nav="mathe"><span class="kb-ic">📐</span>Mathe 5ᵉ PF</button>
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
      <div class="kb-card"><h3 style="margin:0 0 6px;">📅 Wochen-Bericht (letzte 5 Wochen)</h3><p style="margin:0 0 12px;color:var(--kb-muted);">Eine übersichtliche Datei mit <b>allem Neuen</b> der letzten 5 Wochen — Réunionen, Wochenziele, Dossier-Einträge, Noten, Screenings, Absenzen und Notizen. Zum Archivieren, damit nie etwas verloren geht. Öffnet im Browser und ist als PDF druckbar.</p><button class="kb-btn kb-btn-primary" id="kb-weekly-dl">📥 Wochen-Bericht herunterladen</button></div>
    </section>
  </main>
</div>
`;

var ROSTER_MODULE = `
window.KB_ROSTER=(function(){
  var LS='klassebuch_roster_v1';
  var SEED=[
    {id:'stud_ben',   name:'Ben',     anonLabel:'Schüler G', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_lilly', name:'Lilly',   anonLabel:'Schüler I', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_jason', name:'Jason',   anonLabel:'Schüler D', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_alexp', name:'Alex P.', anonLabel:'Schüler A', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_alexk', name:'Alex K.', anonLabel:'Schüler B', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_chase', name:'Chase',   anonLabel:'Schüler F', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_colin', name:'Colin',   anonLabel:'Schüler C', klasse:'', level:'L1', zyklus:'ES', active:true},
    {id:'stud_miguel',name:'Miguel',  anonLabel:'Schüler E', klasse:'', level:'L1', zyklus:'ES', active:true}
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
    var sid=student.id; var meta=[]; var kl=rosterKlasse(sid); if(kl){meta.push(escapeHtml(kl));} meta.push('Niveau '+escapeHtml(rosterLevel(sid)));
    var tabs=[['uebersicht','Übersicht'],['verlauf','Verlauf'],['dossier','Dossier'],['noten','Noten'],['screening','Screening'],['schule','Schule'],['reunion','Réunion'],['helfernetz','Helfernetz']];
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
    var scrAcute=scr&&scr.acute&&scr.acute.length;
    var scrTile=scrAcute?tile('Krise','Screening','warn','🚨'):((scr&&scr.hasData)?((scr.risiken&&scr.risiken.length)?tile('Risiko','Screening','warn','🧠'):tile('erfasst','Screening','ok','🧠')):tile('—','Screening','','🧠'));
    var stripHtml='<div class="kb-statstrip">'+tile((sum.unentschuldigt||0),'Unentsch. Absenzen',(sum.unentschuldigt?'warn':''),'📉')+tile((cg&&cg.goals?cg.goals.length:0),'Förderziele','','🎯')+tile(weekly.length,'Wochenziele','','📌')+scrTile+'</div>';

    /* ---- Schüler ohne Daten: klare Erste-Schritte statt leerer Karten ---- */
    var hasAny=(scr&&scr.hasData)||(cg&&cg.goals&&cg.goals.length)||weekly.length||entries.length||(sum&&sum.total)||lastReu;
    if(!hasAny){
      return stripHtml+'<div class="hub-empty"><div class="hub-empty-ic">🚀</div><h3>Noch nichts erfasst für '+escapeHtml(student.name)+'</h3><p>Leg los — alle Infos sammeln sich danach automatisch hier.</p><div class="hub-empty-actions"><button class="btn btn-primary" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">📉 Absenzen erfassen</button>'+impBtn+'<button class="btn" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">🧠 Screening</button></div></div>';
    }

    /* ---- Screening bewusst zurückhaltend: nur Akut-Krise als schlanke Sicherheits-
           zeile sichtbar; das Ergebnis selbst lebt kompakt in der Seitenspalte. ---- */
    var acuteLine = scrAcute ? '<div class="hub-acute"><span>🚨 Akute Krise laut Screening — Sicherheit hat Vorrang.</span><a class="btn btn-sm" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Ansehen</a></div>' : '';
    var scrVal, scrAct;
    if(scr&&scr.hasData){
      scrVal = scrAcute ? '🚨 Krise' : ((scr.risiken&&scr.risiken.length) ? 'Risiko-Hinweis' : 'erfasst');
      scrAct = '<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=screening">Öffnen</button>';
    } else {
      scrVal = (scr&&scr.noApi) ? 'lädt …' : '—';
      scrAct = '<button class="btn btn-sm ra" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">Start</button>';
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
        return '<li>'+badge+'<span class="hub-gtext">'+head+escapeHtml(g.formulation||g.title||code||'Ziel')+'</span>'+btn+'</li>';
      }).join('');
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele <span class="hub-count">'+cg.goals.length+'</span>','g')+'<ul class="hub-list">'+gl+'</ul>'+(cg.goals.length>5?'<div class="muted" style="font-size:.8em;margin-top:4px;">+'+(cg.goals.length-5)+' weitere</div>':'')+'</div>';
    } else {
      foerderCard='<div class="card kb-mini">'+mh('🎯','Förderziele','g')+'<p class="muted">Noch keine hinterlegt.</p><div class="kb-btn-row">'+impBtn+'</div></div>';
    }

    /* ---- Wochenziele (sichtbar mit Ziel-Texten) ---- */
    var wochenCard;
    if(weekly.length){
      wochenCard='<div class="card kb-mini">'+mh('📌','Wochenziele','w')+'<ul class="hub-list">'+weekly.map(function(g){return '<li>'+escapeHtml(g)+'</li>';}).join('')+'</ul></div>';
    } else {
      wochenCard='<div class="card kb-mini">'+mh('📌','Wochenziele','w')+'<p class="muted">Noch keine — in der <a href="#/reunion" data-route="#/reunion">Réunion</a> festlegen.</p></div>';
    }

    /* ---- Thematiken aus Réunionen/Verlauf -> Arbeitsblätter ---- */
    var themeCard='';
    try{
      if(window.KB_MATERIALS){
        var txtParts=[]; entries.forEach(function(e){if(e.text)txtParts.push(e.text);});
        if(lastReu&&lastReu.text)txtParts.push(lastReu.text);
        var det=(typeof analyzeText==='function')?analyzeText(txtParts.join('  ')):[];
        var picks=[],seenK={};
        for(var ti=0;ti<det.length;ti++){var tkk=det[ti];if(window.KB_MATERIALS.themeMatchable(tkk.key)&&!seenK[tkk.key]){seenK[tkk.key]=1;picks.push(tkk);}if(picks.length>=6)break;}
        if(picks.length){
          var chips=picks.map(function(t){return '<button class="hub-theme-chip sev-'+t.severity+'" data-mat-theme="'+escapeAttr(t.key)+'" data-mat-sid="'+escapeAttr(sid)+'" data-mat-label="'+escapeAttr(t.key)+'" title="Arbeitsblätter zu „'+escapeAttr(t.key)+'“">'+escapeHtml(t.key)+' <span class="ht-n">'+t.count+'×</span></button>';}).join('');
          themeCard='<div class="card kb-mini">'+mh('🏷️','Thematiken → Arbeitsblätter','a')+'<p class="muted" style="font-size:.82em;margin:-2px 0 9px;">Aus den Réunion-/Verlaufstexten erkannt — ein Klick öffnet passende Arbeitsblätter.</p><div class="hub-theme-wrap">'+chips+'</div></div>';
        }
      }
    }catch(_te){}

    /* ---- Réunion-Update (Hauptbereich) ---- */
    var reuCard=lastReu?('<div class="card kb-mini">'+mh('🗣️','Réunion-Update <span class="muted" style="font-weight:600;font-size:.78em;">'+(lastReuDate?escapeHtml(formatDate(lastReuDate)):'')+'</span>'+(lastReu.author?' <span class="reunion-author" title="Verfasst von '+escapeAttr(lastReu.author)+'">✍ '+escapeHtml(lastReu.author)+'</span>':''),'a')+'<div class="entry-body hub-clamp">'+highlightThemesHtml(lastReu.text)+'</div></div>'):'';

    /* ---- Seitenspalte: kompakte Info-Zeilen statt Einzelkärtchen ---- */
    function row(ic,l,v,act){return '<div class="hub-row"><span class="ri">'+ic+'</span><div class="rb"><div class="rl">'+l+'</div>'+(v?'<div class="rv">'+v+'</div>':'')+'</div>'+(act||'')+'</div>';}
    var sideRows='';
    sideRows+=row('📉','Absenzen',(sum.total?(sum.entschuldigt+' E · '+sum.unentschuldigt+' NE · '+sum.verspaetet+' R'):'keine'),'<button class="btn btn-sm ra" data-kb-act="open-absenzen" data-kb-arg="'+escapeAttr(sid)+'">Öffnen</button>');
    sideRows+=row('🩺','Diagnostik',(rep?escapeHtml((rep.type||'Bericht')+' · '+formatDate(rep.date)):'kein DS/PEI'),(rep?'<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=dossier">Dossier</button>':''));
    sideRows+=row('🧠','Screening',scrVal,scrAct);
    sideRows+=row('🗒️','Letzter Eintrag',(last?escapeHtml(formatDate(last.date)+' · '+last.category):'keiner'),'');
    var ngN=window.KB_NOTEN?window.KB_NOTEN.list(sid,null,null).length:0;
    var ntMod=window.KB_NOTEN?window.KB_NOTEN.totalModules(sid):0;
    sideRows+=row('📊','Noten & Module',(ngN||ntMod)?((ngN?ngN+' Noten':'')+(ngN&&ntMod?' · ':'')+(ntMod?ntMod+' Module':'')):'—','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=noten">Öffnen</button>');
    sideRows+=row('🕸️','Helfernetz','Support-Bubble','<button class="btn btn-sm ra" data-route="#/student/'+encodeURIComponent(sid)+'?hub=helfernetz">Öffnen</button>');
    var sideCard='<div class="card hub-side-card">'+sideRows+'</div>';

    return stripHtml+acuteLine+'<div class="hub2"><div class="hub2-main">'+foerderCard+themeCard+wochenCard+reuCard+'</div><aside class="hub2-side">'+sideCard+'</aside></div>';
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
      var g=(r.goals&&r.goals[sid])||[]; if(g.length){items.push({date:r.date,type:'goal',icon:'📌',title:'Wochenziel(e)',body:'<ul class="tl-goals">'+g.map(function(x){return '<li>'+escapeHtml(x)+'</li>';}).join('')+'</ul>'});}
    });
    if(window.KB_ANW&&window.KB_ANW.recentForStudent){try{window.KB_ANW.recentForStudent(sid,40).forEach(function(e){items.push({date:e.date,type:'absence',icon:'📉',title:'Absenz · '+escapeHtml(window.KB_ANW.statusLabel?window.KB_ANW.statusLabel(e.status):(e.status||'')),body:escapeHtml(e.subject||'')});});}catch(_){}}
    if(window.KB_SCREENING&&window.KB_SCREENING.history){window.KB_SCREENING.history(sid).forEach(function(s){
      var ax=(s.axes||[]).map(function(a){return escapeHtml(a.name)+' <em>'+escapeHtml(a.staerke)+'</em>';}).join(', ');
      var mu=(s.muster||[]).map(function(m){return escapeHtml(m.name);}).join(' · ');
      var b='';
      if(s.acute)b+='<span class="sv-risk" style="background:var(--kb-danger);color:#fff;">🚨 Akute Krise</span> ';
      else if(s.risk)b+='<span class="sv-risk">⚠ Risiko</span> ';
      b+='<div class="tl-scr">'+(ax?('Achsen: '+ax):'keine über Schwelle')+(mu?('<br>Submuster: <strong>'+mu+'</strong>'):'')+(s.confidence?('<br>Einordnung: '+escapeHtml(s.confidence)):'')+'</div>';
      items.push({date:s.date,type:'screening',icon:'🧠',title:'Screening',body:b});
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
  function hubReunion(student){
    var sid=student.id; var reu=Repo.listReunions(); var out=[];
    reu.forEach(function(r){
      var e=Repo.reunionEntryFor(r.date,sid); var g=(r.goals&&r.goals[sid])||[];
      if(!e&&!g.length){return;}
      out.push('<div class="card"><div class="muted" style="font-size:.85em;display:flex;justify-content:space-between;gap:8px;align-items:center;"><span>Réunion '+escapeHtml(formatDate(r.date))+'</span>'+(e&&e.author?'<span class="reunion-author" title="Verfasst von '+escapeAttr(e.author)+'">✍ '+escapeHtml(e.author)+'</span>':'')+'</div>'+
        (e?'<div class="entry-body reunion-update">'+highlightThemesHtml(e.text)+'</div>':'<p class="muted">Kein Update.</p>')+
        (g.length?'<div class="goal-box"><strong>Ziele:</strong><ul class="goal-list">'+g.map(function(x){return '<li>'+escapeHtml(x)+'</li>';}).join('')+'</ul></div>':'')+'</div>');
    });
    var today=(new Date()).toISOString().slice(0,10);
    var up=reu.filter(function(r){return r.date>=today;}).sort(function(a,b){return a.date<b.date?-1:1;});
    function nextMondayISO(){var d=new Date();var add=(1-d.getDay()+7)%7;d.setDate(d.getDate()+add);return d.toISOString().slice(0,10);}
    var nextDate=up.length?up[0].date:nextMondayISO();
    var nObj=Repo.getReunionByDate?Repo.getReunionByDate(nextDate):null;
    var ex=Repo.reunionEntryFor(nextDate,sid);
    var exGoals=(nObj&&nObj.goals&&nObj.goals[sid])?nObj.goals[sid]:[];
    var willCreate=!nObj;
    var writeBox='<div class="card reu-write">'+
      '<h4 class="reu-h">✍️ Für die Réunion am '+escapeHtml(formatDate(nextDate))+(willCreate?' <span class="muted" style="font-weight:600;font-size:.8em;">(wird neu angelegt)</span>':'')+'</h4>'+
      '<label class="reu-lbl">Beitrag / Update für die Réunion</label>'+
      '<textarea class="reu-input" rows="4" placeholder="Was soll zu '+escapeAttr(student.name)+' besprochen werden?">'+escapeHtml(ex?ex.text:'')+'</textarea>'+
      '<label class="reu-lbl" style="margin-top:12px;">Wochenziel(e) <span class="muted" style="font-weight:600;">— optional, je Zeile eins</span></label>'+
      '<textarea class="reu-goals" rows="2" placeholder="z. B. Pünktlich zur Schule kommen">'+escapeHtml(exGoals.join('\\n'))+'</textarea>'+
      '<div class="kb-btn-row" style="margin-top:10px;"><button class="btn btn-primary reu-save" data-sid="'+escapeAttr(sid)+'" data-date="'+escapeAttr(nextDate)+'"'+(ex?(' data-eid="'+escapeAttr(ex.id)+'"'):'')+'>'+((ex||exGoals.length)?'Aktualisieren':'Speichern')+'</button> <span class="reu-status muted" style="font-size:.85em;"></span></div>'+
      '<p class="muted" style="font-size:.8em;margin-top:6px;">Beitrag wird als Réunion-Eintrag gespeichert, Wochenziele wandern in die Réunion-Ziele — alles synchronisiert automatisch (Team-Datei & überall).</p>'+
    '</div>';
    return '<div class="kb-hub-pad">'+writeBox+'<h4 class="reu-h" style="margin-top:22px;">Bisherige Réunion-Beiträge</h4>'+(out.length?out.join(''):'<div class="empty-state">Noch keine Réunion-Beiträge.</div>')+'</div>';
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
    var disc='<p class="kb-guide-disc">Geführtes klinisches Screening (Savoir): Schritt für Schritt durchklicken — die Antworten verdichten sich wie ein Spinnennetz zum konkreten Submuster. <strong>Hypothesen, keine Diagnosen.</strong></p>';
    var host='<div id="kb-guide-host" class="kb-guide-host" data-sid="'+escapeAttr(sid)+'">'+
      '<div class="gd-card"><p class="gd-sub" style="margin:0;">Screening-Modul lädt …</p></div></div>';
    var expert='<div class="kb-guide-footer"><button class="btn btn-sm kb-guide-expert" data-kb-act="open-screening" data-kb-arg="'+escapeAttr(sid)+'">Experten-Ansicht öffnen (vollständiges Savoir)</button></div>';
    return '<div class="kb-hub-pad kb-hub-screening">'+disc+host+expert+'</div>';
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
        else if(tab==='verlauf'){sectionHtml=hubVerlauf(student);}
        else if(tab==='screening'){sectionHtml=hubScreening(student);}
        else if(tab==='noten'){sectionHtml=hubNoten(student);}
        else if(tab==='schule'){sectionHtml='<h3 class="kb-subhead">📉 Absenzen</h3>'+hubAbsenzen(student)+'<h3 class="kb-subhead kb-subhead-mt">📒 Aufgaben &amp; Prüfungen</h3>'+hubAufgaben(student);}
        else if(tab==='reunion'){sectionHtml=hubReunion(student);}
        else if(tab==='helfernetz'){sectionHtml=hubHelfernetz(student);}
        else {tab='uebersicht';sectionHtml=hubOverview(student);}
      }catch(err){sectionHtml='<div class="empty-state">Fehler im Hub-Bereich: '+escapeHtml((err&&err.message)||String(err))+'</div>';}
      return {
        navKey:'students',
        html: hubHeader(student,tab)+'<div class="kb-hub-body">'+sectionHtml+'</div>',
        afterRender: function(root){
        if(baseAfter){try{baseAfter(root);}catch(e){}}
        if(tab==='screening'&&window.KB_GUIDE){try{var gh=root.querySelector('#kb-guide-host');if(gh){window.KB_GUIDE.mount(gh,student);}}catch(e){}}
        if(tab==='helfernetz'&&window.KB_BUBBLE_WIRE){try{window.KB_BUBBLE_WIRE(root,student);}catch(e){}}
        if(tab==='noten'&&window.KB_NOTEN){try{
          var rrN=function(){if(window.render){try{window.render();}catch(e){}}};
          root.querySelectorAll('[data-noten-mode]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.setMode(b.getAttribute('data-sid'),b.getAttribute('data-noten-mode'));rrN();});});
          root.querySelectorAll('[data-noten-del]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.remove(b.getAttribute('data-sid'),b.getAttribute('data-noten-del'));rrN();});});
          root.querySelectorAll('[data-noten-add]').forEach(function(b){b.addEventListener('click',function(){var card=b.closest('.note-card');if(!card)return;var lbl=card.querySelector('[data-nf=label]').value;var pts=card.querySelector('[data-nf=points]').value;var max=card.querySelector('[data-nf=max]').value;if(pts===''||!(+max>0)){var pi=card.querySelector('[data-nf=points]');if(pi)pi.focus();return;}window.KB_NOTEN.add(b.getAttribute('data-sid'),{subject:b.getAttribute('data-noten-add'),period:b.getAttribute('data-per'),label:lbl,points:pts,max:max});rrN();});});
          root.querySelectorAll('[data-mod-set]').forEach(function(b){b.addEventListener('click',function(){var n=+b.getAttribute('data-mod-set');var sid3=b.getAttribute('data-sid');var su=b.getAttribute('data-subj');var cur=window.KB_NOTEN.moduleOf(sid3,su).done;window.KB_NOTEN.setModule(sid3,su,(n===cur?n-1:n));rrN();});});
          root.querySelectorAll('[data-mod-more]').forEach(function(b){b.addEventListener('click',function(){window.KB_NOTEN.addCap(b.getAttribute('data-sid'),b.getAttribute('data-mod-more'),4);rrN();});});
        }catch(e){}}
        if(tab==='reunion'){try{
          var rbtn=root.querySelector('.reu-save'), rta=root.querySelector('.reu-input'), rgta=root.querySelector('.reu-goals'), rst=root.querySelector('.reu-status');
          if(rbtn){rbtn.addEventListener('click',function(){
            var sid2=rbtn.getAttribute('data-sid'), date2=rbtn.getAttribute('data-date'), eid2=rbtn.getAttribute('data-eid');
            var text2=((rta&&rta.value)||'').trim();
            var goals2=((rgta&&rgta.value)||'').split('\\n').map(function(s){return s.trim();}).filter(Boolean);
            if(!text2 && !goals2.length){ if(rta){rta.focus();} return; }
            rbtn.disabled=true; if(rst){rst.textContent='Speichert …';}
            var r2=Repo.getReunionByDate?Repo.getReunionByDate(date2):null;
            var base=r2?r2:{date:date2,studentOrder:(Repo.listStudents?Repo.listStudents().map(function(s){return s.id;}):[]),orgItems:[],goals:{}};
            base.goals=base.goals||{};
            if(goals2.length){base.goals[sid2]=goals2;}else if(base.goals[sid2]){delete base.goals[sid2];}
            Repo.saveReunion(base).then(function(){
              if(text2){var p2={studentId:sid2,date:date2,category:'Team-Réunion',text:text2,author:((window.KB_USER&&window.KB_USER.get())||'')};if(eid2){p2.id=eid2;}return Repo.saveEntry(p2);}
            }).then(function(){
              if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
              if(window.render){try{window.render();}catch(e){}}
            }).catch(function(){rbtn.disabled=false;if(rst){rst.textContent='Fehler beim Speichern';}});
          });}
        }catch(e){}}
      }
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
  var PANELS=['anw-root','dos-root','sav-root','isa-root','kb-mathe','kb-klasse','kb-data'];
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
    } else if(nav==='material'){
      showPanel('isa-root'); setActive('material');
      if(window.KB_MATERIALS){try{window.KB_MATERIALS.openTab();}catch(e){}}
    } else if(nav==='mathe'){
      showPanel('kb-mathe'); setActive('mathe');
      if(window.KB_MATHE){try{window.KB_MATHE.open();}catch(e){}}
    } else if(nav==='patho'){
      showPanel('sav-root'); setActive('patho');
      var sb=$('sav-bar'); if(sb){sb.style.display='none';}
      if(window.SAVOIR_API&&window.SAVOIR_API.gotoInfos){window.SAVOIR_API.gotoInfos();}
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
    var CYC=['C1','C2','C3','C4','ES'];
    function cycOpts(sel){sel=sel||'ES';return CYC.map(function(c){return '<option value="'+c+'"'+(sel===c?' selected':'')+'>'+c+'</option>';}).join('');}
    var rows=window.KB_ROSTER.list().map(function(s){
      return '<tr data-id="'+esc(s.id)+'">'+
        '<td><input class="kb-in kb-rn" value="'+esc(s.name)+'"></td>'+
        '<td><input class="kb-in kb-rk" style="max-width:120px" value="'+esc(s.klasse||'')+'" placeholder="—"></td>'+
        '<td><select class="kb-in kb-rz" style="max-width:84px" title="Zyklus (Alter) — steuert passende Arbeitsblätter">'+cycOpts(s.zyklus)+'</select></td>'+
        '<td><select class="kb-in kb-rl" style="max-width:84px"><option'+(s.level!=='L2'?' selected':'')+'>L1</option><option'+(s.level==='L2'?' selected':'')+'>L2</option></select></td>'+
        '<td style="text-align:right"><button class="kb-btn kb-btn-ghost kb-rd" title="Schüler löschen">🗑</button></td></tr>';
    }).join('');
    body.innerHTML='<table class="kb-table" style="margin-top:6px"><thead><tr><th>Name</th><th>Klasse</th><th title="Cycle 1–4 / Sekundar — bestimmt altersgerechte Arbeitsblätter">Zyklus</th><th>Niveau</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><p class="muted" style="font-size:12.5px;margin:8px 2px 0;">Der <b>Zyklus</b> (C1 ≈ 3–5 J. · C2 ≈ 6–7 · C3 ≈ 8–9 · C4 ≈ 10–11 · ES ≥ 12) steuert, welche Arbeitsblätter altersgerecht vorgeschlagen werden.</p>';
    var trs=body.querySelectorAll('tr[data-id]');
    for(var i=0;i<trs.length;i++){(function(tr){
      var id=tr.getAttribute('data-id');
      tr.querySelector('.kb-rn').addEventListener('change',function(e){window.KB_ROSTER.update(id,{name:e.target.value.trim()});});
      tr.querySelector('.kb-rk').addEventListener('change',function(e){window.KB_ROSTER.update(id,{klasse:e.target.value.trim()});});
      tr.querySelector('.kb-rz').addEventListener('change',function(e){window.KB_ROSTER.update(id,{zyklus:e.target.value});});
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
  var wDl=$('kb-weekly-dl'); if(wDl){wDl.addEventListener('click',function(){if(window.KB_WEEKLY){KB_WEEKLY.download();}});}

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

  /* ============================================================
     Identität: „Wer arbeitet hier?" — erste Ansicht der App.
     Quelle der Wahrheit = KB_ANW (state.currentUser, persistiert).
     Der gewählte Name wird automatisch Autor von Einträgen/Réunionen.
     ============================================================ */
  var EXTRA_LS='klassebuch_extra_users';
  function extraUsers(){try{return JSON.parse(localStorage.getItem(EXTRA_LS)||'[]')||[];}catch(e){return [];}}
  function addExtraUser(u){var l=extraUsers();if(l.indexOf(u)<0){l.push(u);try{localStorage.setItem(EXTRA_LS,JSON.stringify(l));}catch(e){}}}
  function allUsers(){var base=(window.KB_ANW&&KB_ANW.users)?KB_ANW.users():[];var seen={},out=[];base.concat(extraUsers()).forEach(function(u){if(u&&!seen[u]){seen[u]=1;out.push(u);}});return out;}
  function curUser(){return (window.KB_ANW&&KB_ANW.getUser&&KB_ANW.getUser())||'';}
  function uIni(n){return (window.KB_ANW&&KB_ANW.initials)?KB_ANW.initials(n):String(n||'?').charAt(0).toUpperCase();}
  function uBg(n){return (window.KB_ANW&&KB_ANW.avatarBg)?KB_ANW.avatarBg(n):'#4f5bd5';}
  var userHooks=[];
  window.KB_USER={get:curUser,list:allUsers,set:function(u){pickUser(u);},onChange:function(fn){if(typeof fn==='function')userHooks.push(fn);}};

  var gate=null;
  function buildGate(){
    gate=document.createElement('div');gate.className='kb-gate';gate.id='kb-gate';
    gate.innerHTML='<div class="kb-gate-card"><div class="kb-gate-logo">📘</div><h2>Wer arbeitet hier?</h2><p>Wähle deinen Namen — er wird bei Einträgen, Réunionen und Notizen automatisch als Autor gespeichert.</p><div class="kb-gate-grid" id="kb-gate-grid"></div><button class="kb-gate-other" id="kb-gate-other">+ Andere Person</button></div>';
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
  function pickUser(u){if(window.KB_ANW&&KB_ANW.setUser){try{KB_ANW.setUser(u);}catch(e){}}closeGate();updateUserChip();for(var i=0;i<userHooks.length;i++){try{userHooks[i](u);}catch(e){}}if(window.render){try{window.render();}catch(e){}}}
  function updateUserChip(){var c=$('kb-userchip');if(!c)return;var u=curUser();
    if(u){c.innerHTML='<span class="kb-uc-av" style="background:'+uBg(u)+'">'+esc(uIni(u))+'</span><span class="kb-uc-n">'+esc(u)+'</span><span class="kb-uc-x">wechseln</span>';c.title='Angemeldet als '+u+' — klicken zum Wechseln';}
    else{c.innerHTML='<span class="kb-uc-av">?</span><span class="kb-uc-n">Wer bist du?</span>';c.title='Person wählen';}
  }
  var ucBtn=$('kb-userchip'); if(ucBtn){ucBtn.addEventListener('click',openGate);}
  updateUserChip();
  if(!curUser()){openGate();}

  // Startseite: Klassenbuch (Anwesenheit)
  go('absenzen');
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
    return {roster:c(window.KB_ROSTER,'syncExport'),bubble:c(window.KB_BUBBLE,'syncExport'),dosEntries:c(window.KB_DOS_SYNC,'exportEntries'),dosReunions:c(window.KB_DOS_SYNC,'exportReunions'),anwEntries:c(window.KB_ANW,'exportEntries'),anwNotes:c(window.KB_ANW,'exportNotes'),anwSettings:st,screening:c(window.KB_SCREENING,'syncExport'),noten:c(window.KB_NOTEN,'syncExport')};
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
    s(window.KB_NOTEN,'syncApply',liveOf(doc.colls.noten));
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
      SAVOIR_TUNING: (typeof SAVOIR_TUNING!=='undefined')?SAVOIR_TUNING:null,
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
  function get(sid){var r=data[sid];if(!r){r={symptome:[],plans:{},demografie:{},gate:{},history:[],updatedAt:''};}if(!r.symptome){r.symptome=[];}if(!r.plans){r.plans={};}if(!r.demografie){r.demografie={};}if(!r.gate){r.gate={};}if(!Array.isArray(r.history)){r.history=[];}return r;}
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
  /* Klinische Stellschrauben kommen zentral aus SAVOIR_TUNING (SAVOIR.html) via
     SAVOIR_API. Fallbacks greifen nur, falls die API mal nicht bereit ist.
     Diese Schicht verändert das Savoir-Scoring NICHT — sie liest dieselbe Config. */
  function TUNE(){var a=window.SAVOIR_API;return (a&&a.SAVOIR_TUNING)?a.SAVOIR_TUNING:null;}
  var ACUTE_FALLBACK={'16.2':{sev:'kritisch',forcesRisk:'R01',label:'Konkreter Suizidplan / Vorbereitungshandlungen'},'16.1':{sev:'akut',forcesRisk:null,label:'Suizidale Gedanken berichtet'},'16.3':{sev:'akut',forcesRisk:'R02',label:'Aktive Selbstverletzung'}};
  var CRISIS_LINE='Sofort Fachweg einschalten: KJP-Notdienst, SOS Détresse 454545, im Notfall 112. Schüler/in nicht allein lassen.';
  function acuteMap(){var t=TUNE();return (t&&t.acuteItems)?t.acuteItems:ACUTE_FALLBACK;}
  function weakBelow(){var t=TUNE();return (t&&typeof t.weakGlobalBelow==='number')?t.weakGlobalBelow:3;}
  function isRareAxis(id){var t=TUNE();if(t&&t.axisPrior&&t.axisPrior[id]!=null)return t.axisPrior[id]<=0.6;return (id==='A13'||id==='A04'||id==='A12');}
  function acuteFlags(symptome){var M=acuteMap();var out=[];(symptome||[]).forEach(function(id){if(M[id])out.push({id:id,sev:M[id].sev,label:M[id].label});});out.sort(function(a,b){return (a.sev==='kritisch'?-1:0)-(b.sev==='kritisch'?-1:0);});return out;}
  function matchGate(when,g){when=when||{};for(var k in when){if(k.slice(-2)==='In'){var f=k.slice(0,-2);if((when[k]||[]).indexOf(g[f])<0)return false;}else if(g[k]!==when[k]){return false;}}return true;}
  /* Klinische Konfidenz aus dem Kriterien-Check (Dauer/Beeinträchtigung/Ausschluss),
     regelbasiert aus SAVOIR_TUNING.confidenceRules. Bildet das DSM/ICD-Prinzip
     "Symptome + Dauer + klinisch bedeutsame Beeinträchtigung + Ausschluss" ab.
     Ändert NICHT, WELCHE Achse führt — nur, wie belastbar der Verdacht ist. */
  function confidenceOf(gate){
    var g=gate||{}; if(!g.dauer&&!g.beeintr&&!g.alt)return null;
    var t=TUNE();
    var rules=(t&&t.confidenceRules)?t.confidenceRules:[
      {when:{alt:'ja'},tone:'warn',label:'Differential zuerst klären',text:''},
      {when:{beeintr:'kaum'},tone:'muted',label:'Beobachten — aktuell kein bedeutsamer Leidensdruck',text:''},
      {when:{dauer:'kurz'},tone:'warn',label:'Mögliche akute Belastungsreaktion — beobachten',text:''},
      {when:{dauerIn:['mittel','lang'],beeintrIn:['merklich','stark']},tone:'ok',label:'Verdacht erhärtet — fachliche Abklärung empfohlen',text:''},
      {when:{},tone:'muted',label:'Hinweis — weiter beobachten, Daten ergänzen',text:''}
    ];
    for(var i=0;i<rules.length;i++){if(matchGate(rules[i].when,g))return {key:'r'+i,tone:rules[i].tone,label:rules[i].label,text:rules[i].text||''};}
    return null;
  }
  function result(sid){
    var a=api(); var d=get(sid);
    if(!a||!a.scoreVerdachtsachsen)return {hasData:false,noApi:true};
    if(!d.symptome||!d.symptome.length)return {hasData:false,acute:acuteFlags(d.symptome)};
    var res; try{res=a.scoreVerdachtsachsen(d.symptome.slice());}catch(e){return {hasData:false};}
    var achsen=((res&&res.achsenSortiert)||[]).filter(function(x){return x&&x.staerke;});
    var risiken=((res&&res.aktiveRisiken)||[]).filter(function(x){return x&&x.staerke;});
    var topMuster=null,topTopicKey=null,topAchseName=null;
    for(var i=0;i<achsen.length && !topMuster;i++){
      var ac=achsen[i].achse||{}; var tk=ac.topicKey; if(!tk||!d.plans[tk])continue;
      if(a.computeSymptomScores){try{var ms=a.computeSymptomScores(d.plans[tk],tk);if(ms&&ms.length&&ms[0].muster){topMuster=ms[0].muster;topTopicKey=tk;topAchseName=ac.name;}}catch(e){}}
    }
    var conf=confidenceOf(d.gate);
    return {hasData:true,achsen:achsen,risiken:risiken,topMuster:topMuster,topTopicKey:topTopicKey,topAchseName:topAchseName,confidence:conf,acute:acuteFlags(d.symptome),globalCount:(d.symptome||[]).length,updatedAt:d.updatedAt};
  }
  function symTextMap(){
    var m={}; try{var a=api(); var pool=a&&a.SAVOIR_GLOBAL&&a.SAVOIR_GLOBAL.symptomPool; (pool&&pool.symptome||[]).forEach(function(s){m[s.id]=s.text;});}catch(e){} return m;
  }
  function detail(sid){
    var a=api(); var r=result(sid); if(!r.hasData)return null;
    var d=get(sid); var L=[]; var sm=symTextMap();
    var acute=acuteFlags(d.symptome);
    if(acute.length){
      L.push('⚠⚠ AKUTE KRISE — SICHERHEIT HAT VORRANG ⚠⚠');
      acute.forEach(function(x){L.push('  - '+x.label+' ['+x.sev+']');});
      L.push('  '+CRISIS_LINE);
      L.push('');
    }
    L.push('A) Erfasste Beobachtungen im Screening (die Antworten):');
    if(d.symptome&&d.symptome.length){d.symptome.forEach(function(id){L.push('  - '+(sm[id]||id));});}else{L.push('  - (keine globalen Symptome markiert)');}
    var SHK=(a&&a.SAVOIR_TUNING&&a.SAVOIR_TUNING.sharedKontextKeys)?a.SAVOIR_TUNING.sharedKontextKeys:['alter','geschlecht','schule','familie'];
    function axName(tk){var g=a&&a.SAVOIR_GLOBAL;if(g){for(var i=0;i<g.achsen.length;i++){if(g.achsen[i].topicKey===tk)return g.achsen[i].name;}}return tk;}
    var deepKeys=[];
    if(d.plans){for(var dk in d.plans){var dp=d.plans[dk];if(dp&&((dp.symptome&&dp.symptome.length)||(dp.kontext&&Object.keys(dp.kontext).length)))deepKeys.push(dk);}}
    // Eckdaten (einmal): aus der geteilten Demografie, lesbar gemacht
    var demo=d.demografie||{};
    if(Object.keys(demo).length&&a&&a.symptomDiagnoseFor&&deepKeys.length){
      var lab={}; (a.symptomDiagnoseFor(deepKeys[0]).kontextFragen||[]).forEach(function(f){(f.optionen||[]).forEach(function(o){lab[f.id+'='+o.val]=(f.titel||f.id)+': '+o.text;});});
      var dd=Object.keys(demo).map(function(k){return lab[k+'='+demo[k]]||(k+': '+demo[k]);});
      if(dd.length)L.push('  Eckdaten: '+dd.join('; '));
    }
    if(deepKeys.length&&a&&a.symptomDiagnoseFor){
      deepKeys.forEach(function(tk){
        var diag=a.symptomDiagnoseFor(tk)||{}; var ps=d.plans[tk]||{};
        L.push('  Vertiefung — '+axName(tk)+':');
        if(ps.kontext&&diag.kontextFragen){
          var cl=[]; diag.kontextFragen.forEach(function(f){if(SHK.indexOf(f.id)>=0)return;var v=ps.kontext[f.id]; if(v){var opt=(f.optionen||[]).filter(function(o){return o.val===v;})[0]; cl.push((f.titel||f.id)+': '+((opt&&opt.text)||v));}});
          if(cl.length)L.push('    Kontext: '+cl.join('; '));
        }
        if(ps.symptome&&ps.symptome.length&&diag.symptomKategorien){
          var tm={}; diag.symptomKategorien.forEach(function(k){(k.symptome||[]).forEach(function(s){tm[s.id]=s.text;});});
          ps.symptome.forEach(function(id){L.push('    - '+(tm[id]||id));});
        }
      });
    }
    L.push('');
    L.push('B) Ergebnis (vom Programm berechnet):');
    if(r.confidence)L.push('Klinische Einordnung (Kriterien-Check Dauer/Beeinträchtigung): '+r.confidence.label+'.');
    L.push('Verdachtsachsen (Ausprägung):');
    if(r.achsen.length){r.achsen.forEach(function(x){L.push('  - '+((x.achse&&x.achse.name)||(x.achse&&x.achse.id)||'?')+': '+x.staerke);});}else{L.push('  - keine über Schwelle');}
    if(r.risiken.length){L.push('Risiko-Hinweise:');r.risiken.forEach(function(x){L.push('  - '+((x.risiko&&x.risiko.name)||'?')+': '+x.staerke);});}
    deepKeys.forEach(function(tk){
      var ms=[]; try{ms=a.computeSymptomScores(d.plans[tk],tk)||[];}catch(e){}
      var top=ms[0]; if(!top||!top.muster)return; var b=top.muster.bloecke||{};
      L.push('');
      L.push('Submuster — '+axName(tk)+': '+(top.muster.name||'?'));
      if(b.profil)L.push('  Erklärung: '+plain(b.profil));
      if(b.ansatzHaupt)L.push('  Umgang/Ansatz: '+plain(b.ansatzHaupt));
      if(b.ansatzTust)L.push('  Konkret tun: '+plain(b.ansatzTust));
      if(b.ansatzNicht)L.push('  Vermeiden: '+plain(b.ansatzNicht));
      if(b.phasen&&b.phasen[0])L.push('  Nächste Schritte: '+(b.phasen[0].titel||'')+' — '+plain(b.phasen[0].was||b.phasen[0].ziele||''));
      if(b.schuleAnpassungen)L.push('  Schulanpassungen: '+plain(b.schuleAnpassungen));
      var krise=b.risikoKritisch||(b.krisenampel&&b.krisenampel.rot&&[].concat(b.krisenampel.rot.zeichen||[]).join('; '));
      if(krise)L.push('  Krisen-/Risikohinweis: '+plain(krise));
    });
    /* Ehrliche methodische Einordnung (Wrapper, ändert das Scoring nicht) */
    var rare=(r.achsen||[]).filter(function(x){return x.achse&&isRareAxis(x.achse.id);}).map(function(x){return x.achse.name;});
    L.push('');
    L.push('Methodischer Hinweis: rechnerische Verdachts-/Triage-Hilfe (KI-Programm Savoir), KEINE Diagnose. Das Ergebnis ist eine Beobachtungs-Schwerpunkt-Hypothese, die einen Fachblick verdient; die klinische Bedeutung hängt von Dauer, Beeinträchtigung und Ausschluss ab (Kriterien-Check). Fachliche Abklärung (Mehr-Informanten, Anamnese, Goldstandards) bleibt erforderlich.');
    if(rare.length)L.push('Basisraten-Vorsicht: '+rare.join(', ')+' sind selten — mit besonderer Zurückhaltung lesen.');
    if((d.symptome||[]).length<weakBelow())L.push('Schwache Datenbasis: beruht auf wenigen Beobachtungen ('+(d.symptome||[]).length+') — als vorläufig behandeln.');
    return {text:L.join('\\n'), updatedAt:r.updatedAt};
  }
  /* Datierter Snapshot fürs Verlauf-/Trend-Bild: kompakte Zusammenfassung des
     aktuellen Ergebnisses. snapshotDaily upsertet einen Eintrag pro Kalendertag. */
  function snapshotOf(sid){
    var a=api(); var d=get(sid); var r=result(sid); if(!r||!r.hasData)return null;
    var axes=(r.achsen||[]).slice(0,4).map(function(x){return {id:(x.achse&&x.achse.id)||'',name:(x.achse&&x.achse.name)||'',staerke:x.staerke};});
    var muster=[];
    if(a&&a.computeSymptomScores&&d.plans){for(var k in d.plans){var p=d.plans[k];if(!p||!((p.symptome&&p.symptome.length)||(p.kontext&&Object.keys(p.kontext).length)))continue;try{var ms=a.computeSymptomScores(p,k);if(ms&&ms[0]&&ms[0].muster){var ax=null,GG=a.SAVOIR_GLOBAL;if(GG){for(var i=0;i<GG.achsen.length;i++){if(GG.achsen[i].topicKey===k){ax=GG.achsen[i];break;}}}muster.push({axis:(ax&&ax.name)||k,name:ms[0].muster.name||''});}}catch(e){}}}
    var conf=confidenceOf(d.gate);
    return {risk:!!(r.risiken&&r.risiken.length),acute:!!(r.acute&&r.acute.length),symCount:(d.symptome||[]).length,axes:axes,muster:muster,confidence:conf?conf.label:null};
  }
  function snapshotDaily(sid){
    var s=snapshotOf(sid); if(!s)return;
    var today=new Date().toISOString().slice(0,10);
    var d=get(sid); d.history=Array.isArray(d.history)?d.history:[];
    var snap={date:today}; for(var k in s)snap[k]=s[k];
    var idx=-1; for(var i=0;i<d.history.length;i++){if(d.history[i].date===today){idx=i;break;}}
    var isNew=(idx<0);
    if(!isNew){ if(JSON.stringify(d.history[idx])===JSON.stringify(snap))return; d.history[idx]=snap; }
    else { d.history.push(snap); }
    d.history.sort(function(a,b){return a.date<b.date?1:-1;});
    set(sid,d);
    if(isNew&&window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
  }
  return {
    get:function(sid){return get(sid);},
    hasData:function(sid){var d=get(sid);return !!(d.symptome&&d.symptome.length);},
    snapshotDaily:snapshotDaily,
    history:function(sid){var d=get(sid);return (d.history||[]).slice();},
    get activeId(){return activeId;},
    setActive:function(sid){activeId=sid;},
    /* Direkter Schreibzugriff für den geführten Trichter (KB_GUIDE):
       schreibt {symptome, plans} pro Schüler, ohne die Experten-Ansicht zu
       laden. activeId wird neutralisiert, damit ein späteres capture() aus der
       Experten-Ansicht die frisch geführten Daten nicht überschreibt. */
    update:function(sid,d){
      d=d||{}; var r=get(sid);
      r={ symptome:(d.symptome!=null?d.symptome.slice():(r.symptome||[])),
          plans:(d.plans!=null?d.plans:(r.plans||{})),
          demografie:(d.demografie!=null?d.demografie:(r.demografie||{})),
          gate:(d.gate!=null?d.gate:(r.gate||{})),
          history:(d.history!=null?d.history:(r.history||[])),
          updatedAt:new Date().toISOString() };
      set(sid,r); activeId=null;
      if(window.KB_SYNC&&window.KB_SYNC.syncNow){try{window.KB_SYNC.syncNow();}catch(e){}}
      return r;
    },
    capture:capture,
    openStudent:openStudent,
    acuteFlags:function(sid){return acuteFlags((get(sid).symptome)||[]);},
    confidenceOf:confidenceOf,
    result:result,
    detail:detail,
    syncExport:function(){var out=[];for(var k in data){var r=data[k]||{};out.push({id:k,symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''});}return out;},
    syncApply:function(arr){data={};(arr||[]).forEach(function(r){if(r&&r.id){data[r.id]={symptome:r.symptome||[],plans:r.plans||{},demografie:r.demografie||{},gate:r.gate||{},history:r.history||[],updatedAt:r.updatedAt||''};}});saveAll(data);}
  };
})();
`;

/* ============================================================
   KB_GUIDE — Geführter klinischer Trichter ("durchklicken").
   Reine Präsentations-Schicht über der UNVERÄNDERTEN Savoir-Engine:
   - Phase 1 "Beobachten": Triage der 16 Kategorien → gezieltes Ankreuzen
     der beobachtbaren Items (K16/Krise IMMER dabei). Ergebnis = globale
     Symptom-IDs, die 1:1 an scoreVerdachtsachsen gehen.
   - Phase 2 "Verdacht": scoreVerdachtsachsen verdichtet zur/zu den Top-Achse(n)
     (+ Risikofilter R01-R03). Nutzer wählt die Achse zum Vertiefen.
   - Phase 3 "Vertiefen": symptomDiagnoseFor(topicKey) liefert die exakten
     kontextFragen + symptomKategorien. Eine Frage pro Schritt; nach jeder
     Antwort zeigt computeSymptomScores live, welches Submuster führt
     (Spinnennetz, das sich zusammenzieht).
   - Phase 4 "Ergebnis": konkretes Submuster + Erklärung + Umgang + Goldstandards.
   Scores sind per Konstruktion identisch zur Engine — es werden dieselben
   Funktionen mit denselben Eingaben aufgerufen. Daten landen in KB_SCREENING
   ({symptome, plans}); result()/detail() und KI-Export lesen daraus.
   Die OPTIONALE "System & Kontext"-Schicht (verändert NIE das Ranking) ist
   bewusst nicht Teil des Trichters; sie bleibt der Experten-Ansicht vorbehalten.
   ============================================================ */
var GUIDE_MODULE = `
window.KB_GUIDE=(function(){
  function api(){return window.SAVOIR_API||null;}
  function SG(){var a=api();return (a&&a.SAVOIR_GLOBAL)?a.SAVOIR_GLOBAL:null;}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  function plain(h){return String(h==null?'':h).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\\s+/g,' ').trim();}
  function clamp(s,n){s=String(s||'');return s.length>n?(s.slice(0,n).replace(/\\s+\\S*$/,'')+'…'):s;}

  var host=null, student=null, ST=null;

  function symById(id){var g=SG();if(!g)return null;var p=g.symptomPool.symptome;for(var i=0;i<p.length;i++){if(p[i].id===id)return p[i];}return null;}
  function axisByTopic(tk){var g=SG();if(!g)return null;for(var i=0;i<g.achsen.length;i++){if(g.achsen[i].topicKey===tk)return g.achsen[i];}return null;}
  function symsOfCat(catId){var g=SG();if(!g)return [];return g.symptomPool.symptome.filter(function(s){return s.kategorie===catId;});}
  function buildTiefe(tk){var a=api();var diag=(a&&a.symptomDiagnoseFor)?a.symptomDiagnoseFor(tk):null;var steps=[];var keys=sharedKeys();if(diag){(diag.kontextFragen||[]).forEach(function(f){if(keys.indexOf(f.id)<0)steps.push({type:'kontext',frage:f});});(diag.symptomKategorien||[]).forEach(function(k){if(k&&k.symptome&&k.symptome.length){steps.push({type:'symptome',kat:k});}});}return steps;}

  function read(){return window.KB_SCREENING?window.KB_SCREENING.get(ST.sid):{symptome:[],plans:{}};}
  function write(d){if(window.KB_SCREENING&&window.KB_SCREENING.update){window.KB_SCREENING.update(ST.sid,d);}}
  function ensurePlan(tk,d){d.plans=d.plans||{};if(!d.plans[tk]){d.plans[tk]={symptome:[],kontext:{}};}var p=d.plans[tk];if(!p.symptome)p.symptome=[];if(!p.kontext)p.kontext={};return p;}

  function initState(sid){
    var st={sid:sid,stage:'breit',breitSub:'triage',cats:[],catIdx:0,selAxes:[],curIdx:0,axisTopicKey:null,axisName:null,tiefeSteps:[],tiefeIdx:0,_selInit:false};
    if(!api()||!SG())return st;
    var d=window.KB_SCREENING?window.KB_SCREENING.get(sid):{symptome:[],plans:{}};
    var hasSym=d.symptome&&d.symptome.length;
    if(hasSym){var seen={};(d.symptome||[]).forEach(function(id){var s=symById(id);if(s)seen[s.kategorie]=1;});st.cats=Object.keys(seen);}
    var deepened=[];
    if(d.plans){for(var k in d.plans){var p=d.plans[k];if(p&&((p.symptome&&p.symptome.length)||(p.kontext&&Object.keys(p.kontext).length)))deepened.push(k);}}
    if(deepened.length){st.selAxes=deepened;st._selInit=true;st.curIdx=0;st.axisTopicKey=deepened[0];var ax0=axisByTopic(deepened[0]);st.axisName=ax0?ax0.name:deepened[0];st.tiefeSteps=buildTiefe(deepened[0]);st.stage='ergebnis';return st;}
    if(hasSym){st.stage='verdacht';return st;}
    return st;
  }

  /* ---------- Wrapper + geteilte Helfer (lesen SAVOIR_TUNING, ändern das Scoring nicht) ---------- */
  function TUNE(){var a=api();return (a&&a.SAVOIR_TUNING)?a.SAVOIR_TUNING:null;}
  function rareAxis(id){var t=TUNE();if(t&&t.axisPrior&&t.axisPrior[id]!=null)return t.axisPrior[id]<=0.6;return id==='A13'||id==='A04'||id==='A12';}
  function weakGlobalBelow(){var t=TUNE();return (t&&typeof t.weakGlobalBelow==='number')?t.weakGlobalBelow:3;}
  function weakAxisMax(){var t=TUNE();return (t&&typeof t.weakAxisEvidenceMax==='number')?t.weakAxisEvidenceMax:2;}
  function sharedKeys(){var t=TUNE();return (t&&t.sharedKontextKeys)?t.sharedKontextKeys:['alter','geschlecht','schule','familie'];}
  function gateQs(){var t=TUNE();return (t&&t.gateQuestions&&t.gateQuestions.length)?t.gateQuestions:[
    {key:'dauer',titel:'Seit wann bestehen die Auffälligkeiten?',optionen:[{val:'kurz',text:'unter ~2 Wochen'},{val:'mittel',text:'einige Wochen bis Monate'},{val:'lang',text:'über ~6 Monate / anhaltend'}]},
    {key:'beeintr',titel:'Wie stark ist der Alltag beeinträchtigt (Schule, Familie, Freunde)?',optionen:[{val:'kaum',text:'kaum oder nicht'},{val:'merklich',text:'merklich'},{val:'stark',text:'stark'}]},
    {key:'alt',titel:'Gibt es eine naheliegendere Erklärung (akute Belastung, Substanz, somatisch)?',optionen:[{val:'nein',text:'eher nicht'},{val:'ja',text:'ja, möglich'}]}
  ];}
  function acuteBanner(){
    var fl=(window.KB_SCREENING&&window.KB_SCREENING.acuteFlags)?window.KB_SCREENING.acuteFlags(ST.sid):[];
    if(!fl.length)return '';
    var krit=fl.some(function(x){return x.sev==='kritisch';});
    return '<div class="gd-acute'+(krit?' is-krit':'')+'"><div class="gd-acute-h">🚨 Akute Krise — Sicherheit hat Vorrang</div>'+
      '<ul class="gd-acute-list">'+fl.map(function(x){return '<li>'+esc(x.label)+(x.sev==='kritisch'?' <strong>(kritisch)</strong>':'')+'</li>';}).join('')+'</ul>'+
      '<div class="gd-acute-do">Sofort Fachweg: <strong>KJP-Notdienst</strong> · <strong>SOS Détresse 454545</strong> · im Notfall <strong>112</strong>. Schüler/in nicht allein lassen.</div></div>';
  }
  function axisEvidence(symptome,axisId){var g=SG();if(!g)return 0;var map=g.symptomMapping||{};var n=0;(symptome||[]).forEach(function(id){if(map[id]&&map[id][axisId])n++;});return n;}
  function deepenedAxes(d){var out=[];d=d||read();if(d.plans){for(var k in d.plans){var p=d.plans[k];if(p&&((p.symptome&&p.symptome.length)||(p.kontext&&Object.keys(p.kontext).length)))out.push(k);}}return out;}
  function demoQuestions(){
    var a=api();var keys=sharedKeys();var seen={};var out=[];
    (ST.selAxes||[]).forEach(function(tk){var diag=a&&a.symptomDiagnoseFor?a.symptomDiagnoseFor(tk):null;if(!diag)return;(diag.kontextFragen||[]).forEach(function(f){if(keys.indexOf(f.id)>=0&&!seen[f.id]){seen[f.id]=1;out.push(f);}});});
    return out;
  }
  function demoComplete(){var d=read();var demo=d.demografie||{};var qs=demoQuestions();if(!qs.length)return true;for(var i=0;i<qs.length;i++){if(!demo[qs[i].id])return false;}return true;}
  function applyDemoToPlans(d){var demo=d.demografie||{};(ST.selAxes||[]).forEach(function(tk){var ps=ensurePlan(tk,d);Object.keys(demo).forEach(function(k){ps.kontext[k]=demo[k];});});}
  function setCurrentAxis(i){ST.curIdx=i;ST.axisTopicKey=ST.selAxes[i];var ax=axisByTopic(ST.axisTopicKey);ST.axisName=ax?ax.name:ST.axisTopicKey;ST.tiefeSteps=buildTiefe(ST.axisTopicKey);ST.tiefeIdx=0;}
  function startDeepening(){for(var i=0;i<ST.selAxes.length;i++){setCurrentAxis(i);if(ST.tiefeSteps.length){ST.stage='tiefe';return;}}ST.stage='kriterien';}
  function nextAxisOrKriterien(){var i=ST.curIdx+1;while(i<ST.selAxes.length){setCurrentAxis(i);if(ST.tiefeSteps.length){ST.stage='tiefe';return;}i++;}ST.stage='kriterien';}

  /* ---------- Phasen-Stepper ---------- */
  function phaseBar(){
    var order=['breit','verdacht','tiefe','kriterien','ergebnis'];
    var labels={breit:'Beobachten',verdacht:'Verdacht',tiefe:'Vertiefen',kriterien:'Prüfen',ergebnis:'Ergebnis'};
    var stage=(ST.stage==='demografie')?'tiefe':ST.stage;
    var cur=order.indexOf(stage);
    var h='<div class="gd-steps">';
    order.forEach(function(s,i){
      var cls=i<cur?'is-done':(i===cur?'is-on':'');
      var num=i<cur?'✓':String(i+1);
      h+=(i?'<span class="gd-sep"></span>':'')+'<span class="gd-step '+cls+'"><span class="gd-num">'+num+'</span>'+esc(labels[s])+'</span>';
    });
    return h+'</div>';
  }
  function navBar(backLabel,nextLabel,nextG,count){
    var h='<div class="gd-nav">';
    h+=backLabel?('<button class="gd-back" data-g="back">‹ '+esc(backLabel)+'</button>'):'<span></span>';
    h+='<span class="gd-spacer"></span>';
    if(count)h+='<span class="gd-count">'+esc(count)+'</span>';
    if(nextLabel)h+='<button class="btn btn-primary" data-g="'+esc(nextG||'next')+'">'+esc(nextLabel)+'</button>';
    return h+'</div>';
  }

  /* ---------- Phase 1: Beobachten ---------- */
  function drillCats(){var g=SG();if(!g)return [];return g.symptomPool.kategorien.filter(function(c){return ST.cats.indexOf(c.id)>=0||c.id==='K16';});}

  function renderBreit(){
    var g=SG();if(!g)return loading();
    if(ST.breitSub==='triage'){
      var d=read();var counts={};(d.symptome||[]).forEach(function(id){var s=symById(id);if(s)counts[s.kategorie]=(counts[s.kategorie]||0)+1;});
      var tiles=g.symptomPool.kategorien.map(function(c){
        var lock=(c.id==='K16');var sel=lock||ST.cats.indexOf(c.id)>=0;var n=counts[c.id]||0;
        return '<button class="gd-cat'+(sel?' is-sel':'')+(lock?' is-lock':'')+'" data-g="cat" data-id="'+esc(c.id)+'"'+(lock?' disabled':'')+'>'+
          '<div class="gd-cat-t">'+esc(c.name)+(lock?' 🔒':'')+(n?'<span class="gd-cat-n">'+n+'</span>':'')+'</div>'+
          '<div class="gd-cat-f">'+esc(clamp(c.fokus,90))+'</div></button>';
      }).join('');
      return phaseBar()+'<div class="gd-card"><p class="gd-kicker">Phase 1 · Beobachten</p>'+
        '<h3 class="gd-q">In welchen Bereichen zeigt sich etwas?</h3>'+
        '<p class="gd-sub">Tippe die auffälligen Bereiche an — danach kreuzt du nur dort die konkreten Beobachtungen an. <strong>Krise &amp; Selbstgefährdung</strong> wird immer geprüft.</p>'+
        '<div class="gd-cats">'+tiles+'</div>'+
        navBar('',(ST.cats.length?'Weiter · '+ST.cats.length+' Bereich'+(ST.cats.length>1?'e':''):'Nur Krise prüfen')+' ›','breit-drill','')+'</div>';
    }
    /* drill */
    var cats=drillCats();var c=cats[ST.catIdx]||cats[0];
    var d2=read();var sel=d2.symptome||[];
    var chips=symsOfCat(c.id).map(function(s){
      var on=sel.indexOf(s.id)>=0;
      return '<button class="gd-chip'+(on?' is-sel':'')+'" data-g="sym" data-id="'+esc(s.id)+'">'+esc(s.text)+'</button>';
    }).join('');
    var pct=Math.round(((ST.catIdx+1)/Math.max(1,cats.length))*100);
    var last=ST.catIdx>=cats.length-1;
    return phaseBar()+'<div class="gd-card"><p class="gd-kicker">Phase 1 · Beobachten · '+esc(c.id==='K16'?'Krise':('Bereich '+(ST.catIdx+1)+'/'+cats.length))+'</p>'+
      '<h3 class="gd-q">'+esc(c.name)+'</h3>'+
      '<p class="gd-sub">'+esc(c.fokus)+'</p>'+
      '<div class="gd-progress"><i style="width:'+pct+'%"></i></div>'+
      '<div class="gd-chips">'+(chips||'<span class="muted">Keine Items.</span>')+'</div>'+
      navBar('Zurück',(last?'Zur Auswertung ›':'Weiter ›'),'breit-next',(ST.catIdx+1)+' / '+cats.length)+'</div>';
  }

  /* ---------- Phase 2: Verdacht (Mehrfachauswahl) ---------- */
  function staerkeBadge(s){return '<span class="gd-sb gd-sb-'+esc(s)+'">'+esc(s)+'</span>';}
  function axisToggle(x){
    var ac=x.achse||{};var on=ST.selAxes.indexOf(ac.topicKey)>=0;
    var meta=(ac.goldstandards&&ac.goldstandards.length)?('Absicherung: '+clamp(ac.goldstandards.join(', '),52)):'';
    return '<button class="gd-axis'+(on?' is-sel':'')+'" data-g="axis-toggle" data-topic="'+esc(ac.topicKey||'')+'">'+
      '<span class="gd-check">'+(on?'✓':'')+'</span>'+
      '<span class="gd-axis-b"><span class="gd-axis-n">'+esc(ac.name||'?')+(x.staerke?staerkeBadge(x.staerke):'')+'</span>'+(meta?'<span class="gd-axis-meta">'+esc(meta)+'</span>':'')+'</span></button>';
  }
  function renderVerdacht(){
    var a=api();if(!a||!a.scoreVerdachtsachsen)return loading();
    var d=read();var res=a.scoreVerdachtsachsen((d.symptome||[]).slice());
    var achsen=(res&&res.achsenSortiert)||[];
    var risiken=((res&&res.aktiveRisiken)||[]).filter(function(x){return x&&x.staerke;});
    var strong=achsen.filter(function(x){return x.staerke!=='mild';});
    var mild=achsen.filter(function(x){return x.staerke==='mild';});
    if(!ST._selInit){ST.selAxes=strong.map(function(x){return x.achse.topicKey;}).filter(Boolean);ST._selInit=true;}
    var h=phaseBar();
    if(risiken.length){h+='<div class="gd-risk">⚠ <strong>Risiko-Hinweis:</strong> '+risiken.map(function(x){return esc((x.risiko&&x.risiko.name)||'?')+' ('+esc(x.staerke)+')';}).join(', ')+' — bei akuter Gefährdung den Fachweg einschalten (Helfernetz / KJP-Notdienst, 112).</div>';}
    h+='<div class="gd-card"><p class="gd-kicker">Phase 2 · Beobachtungs-Schwerpunkte</p>';
    if(achsen.length){
      h+='<h3 class="gd-q">Was soll vertieft werden?</h3>'+
         '<p class="gd-sub">Schwerpunkte, die einen <strong>Fachblick verdienen</strong>. <strong>Mehrfachauswahl</strong> — Komorbidität ist der Normalfall (z. B. ADHS <em>und</em> Depression); starke sind vorausgewählt, tippe zum An-/Abwählen. Reihung = rechnerische Symptomdichte, kein Diagnose-Ranking.</p>';
      var list=strong.length?strong:achsen;
      h+=list.map(function(x){return axisToggle(x);}).join('');
      if(strong.length&&mild.length){h+='<details class="sv-acc" style="margin-top:6px;"><summary>Schwächere Tendenzen ('+mild.length+') — auch wählbar</summary><div class="sv-prose">'+mild.map(function(x){return axisToggle(x);}).join('')+'</div></details>';}
      var rareShown=achsen.filter(function(x){return x.achse&&rareAxis(x.achse.id);}).map(function(x){return x.achse.name||'';});
      h+='<div class="gd-caveat">Dauer, Verlauf und Beeinträchtigung prüft das Programm nicht hier — das kommt gleich als kurzer Kriterien-Check und gehört in die fachliche Abklärung.';
      if(rareShown.length)h+='<br>Basisraten-Vorsicht bei <strong>'+rareShown.map(esc).join(', ')+'</strong>: selten.';
      h+='</div>';
      if((d.symptome||[]).length<weakGlobalBelow()){h+='<div class="gd-caveat">⚖ Schwache Datenbasis: erst '+(d.symptome||[]).length+' Beobachtung(en) — ein einzelnes Zeichen ist kein Syndrom.</div>';}
      var n=ST.selAxes.length;
      h+='<div class="gd-nav"><button class="gd-back" data-g="back">‹ Beobachtungen</button><span class="gd-spacer"></span><button class="btn btn-primary" data-g="deepen-start"'+(n?'':' disabled')+'>'+(n?('Vertiefen ('+n+') ›'):'Mind. 1 wählen')+'</button></div>';
    } else {
      var scores=(res&&res.achsenScores)||{};var g=SG();
      var raw=g.achsen.map(function(ac){return {achse:ac,score:scores[ac.id]||0};}).filter(function(x){return x.score>0;}).sort(function(a2,b2){return b2.score-a2.score;}).slice(0,3);
      if(raw.length){
        h+='<h3 class="gd-q">Noch kein belastbares Muster</h3><p class="gd-sub">Keine Achse erreicht die Konvergenz-Schwelle (mind. zwei zusammenpassende Beobachtungen). Mehr beobachten — oder einer leichten Tendenz nachgehen:</p>';
        h+=raw.map(function(x){return axisToggle({achse:x.achse,staerke:'mild'});}).join('');
        if((d.symptome||[]).length<weakGlobalBelow()){h+='<div class="gd-caveat">⚖ Schwache Datenbasis: erst '+(d.symptome||[]).length+' Beobachtung(en) — ein einzelnes Zeichen ist kein Syndrom.</div>';}
        var n2=ST.selAxes.length;
        h+='<div class="gd-nav"><button class="gd-back" data-g="back">‹ Beobachtungen</button><span class="gd-spacer"></span><button class="btn btn-primary" data-g="deepen-start"'+(n2?'':' disabled')+'>'+(n2?('Vertiefen ('+n2+') ›'):'Mind. 1 wählen')+'</button></div>';
      } else {
        h+='<h3 class="gd-q">Noch keine Beobachtungen</h3><p class="gd-sub">Geh zurück und kreuze einige Beobachtungen an, dann verdichtet sich hier ein Verdacht.</p>'+navBar('Beobachtungen ergänzen','','','');
      }
    }
    return h+'</div>';
  }

  /* ---------- Phase 3: Eckdaten (einmal, geteilt) ---------- */
  function renderDemografie(){
    var d=read();var demo=d.demografie||{};var qs=demoQuestions();
    var blocks=qs.map(function(f){
      return '<div class="gd-gate-q"><div class="gd-gate-t">'+esc(f.titel)+'</div><div class="gd-opts">'+
        (f.optionen||[]).map(function(o){var on=demo[f.id]===o.val;return '<button class="gd-opt'+(on?' is-sel':'')+'" data-g="demo" data-key="'+esc(f.id)+'" data-val="'+esc(o.val)+'"><span class="gd-radio"></span>'+esc(o.text)+'</button>';}).join('')+'</div></div>';
    }).join('');
    return phaseBar()+'<div class="gd-card"><p class="gd-kicker">Phase 3 · Eckdaten (einmal)</p>'+
      '<h3 class="gd-q">Kurz zur Person</h3><p class="gd-sub">Gilt für alle gewählten Achsen — du gibst es nur <strong>einmal</strong> ein, nicht pro Achse erneut.</p>'+
      (blocks||'<p class="gd-sub">Keine Eckdaten nötig.</p>')+
      '<div class="gd-nav"><button class="gd-back" data-g="demo-back">‹ Zurück</button><span class="gd-spacer"></span><button class="btn btn-primary" data-g="demo-done">Weiter ›</button></div></div>';
  }

  /* ---------- Phase 4: Vertiefen (je Achse) ---------- */
  function convergence(ps){
    var a=api();if(!a||!a.computeSymptomScores)return '';
    var scores=[];try{scores=a.computeSymptomScores(ps,ST.axisTopicKey)||[];}catch(e){}
    if(!scores.length)return '<div class="gd-conv"><div class="gd-conv-h">Spur</div><div class="gd-conv-row"><span class="gd-conv-n muted">Noch zu wenig — wähle ein paar Merkmale.</span></div></div>';
    var top=scores.slice(0,2);var max=top[0].score||1;
    var rows=top.map(function(s){var w=Math.max(12,Math.round((s.score/max)*100));return '<div class="gd-conv-row"><span class="gd-conv-n">'+esc((s.muster&&s.muster.name)||'?')+'</span><span class="gd-conv-bar"><i style="width:'+w+'%"></i></span></div>';}).join('');
    return '<div class="gd-conv"><div class="gd-conv-h">🕸 Aktuell am wahrscheinlichsten</div>'+rows+'</div>';
  }
  function renderTiefe(){
    var steps=ST.tiefeSteps||[];if(!steps.length){nextAxisOrKriterien();return (ST.stage==='kriterien')?renderKriterien():renderTiefe();}
    if(ST.tiefeIdx>=steps.length)ST.tiefeIdx=steps.length-1;
    var step=steps[ST.tiefeIdx];var d=read();var ps=ensurePlan(ST.axisTopicKey,d);
    var pct=Math.round(((ST.tiefeIdx+1)/steps.length)*100);
    var nAx=(ST.selAxes||[]).length;var axPos=(nAx>1)?(' · Achse '+(ST.curIdx+1)+'/'+nAx):'';
    var body='';
    if(step.type==='kontext'){
      var f=step.frage;var cur=ps.kontext[f.id];
      body='<h3 class="gd-q">'+esc(f.titel)+'</h3><p class="gd-sub">'+esc(ST.axisName||'')+' · eine Auswahl</p>'+
        '<div class="gd-progress"><i style="width:'+pct+'%"></i></div><div class="gd-opts">'+
        (f.optionen||[]).map(function(o){var on=cur===o.val;return '<button class="gd-opt'+(on?' is-sel':'')+'" data-g="opt" data-fid="'+esc(f.id)+'" data-val="'+esc(o.val)+'"><span class="gd-radio"></span>'+esc(o.text)+'</button>';}).join('')+
        '</div>';
    } else {
      var k=step.kat;
      body='<h3 class="gd-q">'+esc(k.titel)+'</h3><p class="gd-sub">'+esc(ST.axisName||'')+' · zutreffende Merkmale ankreuzen</p>'+
        '<div class="gd-progress"><i style="width:'+pct+'%"></i></div><div class="gd-chips">'+
        (k.symptome||[]).map(function(s){var on=ps.symptome.indexOf(s.id)>=0;return '<button class="gd-chip'+(on?' is-sel':'')+'" data-g="tsym" data-id="'+esc(s.id)+'">'+esc(s.text)+'</button>';}).join('')+
        '</div>';
    }
    var lastStep=ST.tiefeIdx>=steps.length-1;var lastAxis=ST.curIdx>=nAx-1;
    var nextLabel=lastStep?(lastAxis?'Weiter zu Kriterien ›':'Nächste Achse ›'):'Weiter ›';
    return phaseBar()+'<div class="gd-card"><p class="gd-kicker">Phase 4 · Vertiefen — '+esc(ST.axisName||'')+esc(axPos)+'</p>'+body+
      convergence(ps)+
      navBar('Zurück',nextLabel,'tiefe-next',(ST.tiefeIdx+1)+' / '+steps.length)+'</div>';
  }

  /* ---------- Phase 5: Kriterien-Check (einmal, geteilt) ---------- */
  function renderKriterien(){
    var d=read();var g=d.gate||{};
    var blocks=gateQs().map(function(q){
      return '<div class="gd-gate-q"><div class="gd-gate-t">'+esc(q.titel)+'</div><div class="gd-opts">'+
        (q.optionen||[]).map(function(o){var on=g[q.key]===o.val;return '<button class="gd-opt'+(on?' is-sel':'')+'" data-g="gate" data-key="'+esc(q.key)+'" data-val="'+esc(o.val)+'"><span class="gd-radio"></span>'+esc(o.text)+'</button>';}).join('')+
        '</div></div>';
    }).join('');
    var conf=(window.KB_SCREENING&&window.KB_SCREENING.confidenceOf)?window.KB_SCREENING.confidenceOf(g):null;
    var live=conf?('<div class="gd-conf gd-conf-'+conf.tone+'"><div class="gd-conf-l">'+esc(conf.label)+'</div></div>'):'';
    return phaseBar()+'<div class="gd-card"><p class="gd-kicker">Phase 5 · Klinische Kriterien</p>'+
      '<h3 class="gd-q">Kurz absichern, bevor wir einordnen</h3>'+
      '<p class="gd-sub">Symptome allein sind keine Diagnose. Dauer, Beeinträchtigung und Ausschluss entscheiden über die klinische Bedeutung — gilt für alle gewählten Achsen.</p>'+
      blocks+live+
      '<div class="gd-nav"><button class="gd-back" data-g="kriterien-back">‹ Zurück</button><span class="gd-spacer"></span><button class="btn btn-sm" data-g="gate-skip">Überspringen</button> <button class="btn btn-primary btn-sm" data-g="gate-done">Ergebnis ansehen ›</button></div></div>';
  }

  /* ---------- Phase 6: Ergebnis (alle vertieften Achsen, vollständig lesbar) ---------- */
  function firstSentence(html,n){var t=plain(html);if(!t)return '';var m=t.match(/^[^.!?]*[.!?]/);var s=(m&&m[0].length>=40)?m[0]:t;return clamp(s,n||150);}
  function secCard(ic,title,blurb,full,open){
    if(!full)return '';
    return '<details class="rs-sec"'+(open?' open':'')+'>'+
      '<summary class="rs-head"><span class="rs-ic">'+ic+'</span>'+
        '<span class="rs-ht"><span class="rs-title">'+esc(title)+'</span>'+(blurb?'<span class="rs-blurb">'+esc(blurb)+'</span>':'')+'</span>'+
        '<span class="rs-more">ganz lesen</span><span class="rs-chev">▾</span></summary>'+
      '<div class="rs-body sv-prose">'+full+'</div></details>';
  }
  function musterSections(b,ax,openFirst){
    b=b||{};var h='<div class="rs-list">';
    if(b.profil)h+=secCard('🧭','Worum es geht',firstSentence(b.profil,170),b.profil,openFirst);
    var umgang=[b.ansatzHaupt||'',b.ansatzTust?('<p class="sv-do"><strong>✓ Konkret tun</strong></p>'+b.ansatzTust):'',b.ansatzNicht?('<p class="sv-dont"><strong>✗ Vermeiden</strong></p>'+b.ansatzNicht):''].filter(Boolean).join('');
    if(umgang)h+=secCard('🤝','Umgang mit diesem Profil',firstSentence(b.ansatzHaupt||b.ansatzTust||umgang,170)||'Wie du dich verhältst — und was du vermeidest.',umgang,false);
    if(b.phasen&&b.phasen.length){var ph=b.phasen.map(function(p){return '<p><strong>'+esc(p.titel||'')+'</strong></p>'+(p.was||p.ziele||'');}).join('');var pt=b.phasen.map(function(p){return p.titel;}).filter(Boolean).slice(0,3).join(' → ');h+=secCard('🪜','Nächste Schritte',pt||'Der Weg in sinnvollen Etappen.',ph,false);}
    if(b.schuleAnpassungen)h+=secCard('🏫','Schulanpassungen',firstSentence(b.schuleAnpassungen,170)||'Konkrete Anpassungen im Schulalltag.',b.schuleAnpassungen,false);
    var krise=b.risikoKritisch||(b.krisenampel&&b.krisenampel.rot&&[].concat(b.krisenampel.rot.zeichen||[]).join('; '));
    if(krise){var kfull=(String(krise).indexOf('<')>=0)?krise:('<p>'+esc(krise)+'</p>');h+=secCard('🚨','Krisen-/Risikohinweis',firstSentence(krise,170)||'Worauf du bei Gefahr sofort achtest.',kfull,false);}
    if(ax&&ax.goldstandards&&ax.goldstandards.length)h+=secCard('🔬','Womit fachlich absichern',ax.goldstandards.slice(0,2).join(' · ')+(ax.goldstandards.length>2?' …':''),'<p class="rs-gold-lead">Diese Verfahren sichern den Verdacht fachlich ab:</p><ul>'+ax.goldstandards.map(function(g){return '<li>'+esc(g)+'</li>';}).join('')+'</ul>',false);
    return h+'</div>';
  }
  function renderErgebnis(){
    var a=api();if(!a)return loading();
    var d=read();
    var axes=(ST.selAxes&&ST.selAxes.length)?ST.selAxes.slice():deepenedAxes(d);
    axes=axes.filter(function(tk){return d.plans&&d.plans[tk];});
    var res=a.scoreVerdachtsachsen?a.scoreVerdachtsachsen((d.symptome||[]).slice()):null;
    var risiken=((res&&res.aktiveRisiken)||[]).filter(function(x){return x&&x.staerke;});
    var h=phaseBar();
    if(risiken.length){h+='<div class="gd-risk">⚠ <strong>Risiko-Hinweis:</strong> '+risiken.map(function(x){return esc((x.risiko&&x.risiko.name)||'?')+' ('+esc(x.staerke)+')';}).join(', ')+' — Sicherheit hat Vorrang (Helfernetz / KJP-Notdienst, 112).</div>';}
    var conf=(window.KB_SCREENING&&window.KB_SCREENING.confidenceOf)?window.KB_SCREENING.confidenceOf(d.gate):null;
    if(conf){h+='<div class="gd-conf gd-conf-'+conf.tone+'"><div class="gd-conf-l">'+esc(conf.label)+'</div>'+(conf.text?'<div class="gd-conf-t">'+esc(conf.text)+'</div>':'')+'</div>';}
    else{h+='<div class="gd-caveat">Klinische Kriterien (Dauer/Beeinträchtigung) noch nicht geprüft — <button class="gd-linkbtn" data-g="goto-kriterien">jetzt prüfen</button>, das schärft die Einordnung erheblich.</div>';}
    if(!axes.length){
      h+='<div class="gd-card"><div class="gd-result-head"><span class="gd-result-badge">Ergebnis</span><div class="gd-result-name">Noch nichts vertieft</div></div><p class="gd-sub" style="margin-top:12px;">Wähle in der Verdachts-Phase mindestens eine Achse zum Vertiefen.</p><div class="gd-nav"><button class="gd-back" data-g="goto-verdacht">‹ Achsen wählen</button><span class="gd-spacer"></span><button class="btn btn-sm" data-g="restart">Neu starten</button></div></div>';
      return h;
    }
    /* datierten Snapshot festhalten (Verlauf/Trend) + Trend-Zeile zeigen */
    if(window.KB_SCREENING&&window.KB_SCREENING.snapshotDaily){try{window.KB_SCREENING.snapshotDaily(ST.sid);}catch(e){}}
    var hist=(window.KB_SCREENING&&window.KB_SCREENING.history)?window.KB_SCREENING.history(ST.sid):[];
    if(hist.length>1){
      var prev=hist[1],pAx=(prev.axes&&prev.axes[0])?(prev.axes[0].name+' ('+prev.axes[0].staerke+')'):'—';
      h+='<div class="gd-trend">📈 <strong>Verlauf:</strong> '+hist.length+' Screenings · zuvor '+esc((prev.date||'').slice(8,10)+'.'+(prev.date||'').slice(5,7)+'.')+': '+esc(pAx)+(prev.acute?' · Krise':(prev.risk?' · Risiko':''))+' — kompletter Verlauf im Tab <strong>Verlauf</strong>.</div>';
    }
    if(axes.length>1){h+='<p class="gd-multi-h">'+axes.length+' Befunde (Komorbidität) — alle gehören in die fachliche Abklärung:</p>';}
    axes.forEach(function(tk,i){
      var ax=axisByTopic(tk);var ps=d.plans[tk]||{symptome:[],kontext:{}};
      var scores=[];try{scores=a.computeSymptomScores(ps,tk)||[];}catch(e){}
      var top=scores[0];
      h+='<div class="gd-card gd-axiscard">';
      h+='<div class="rs-hero"><div class="rs-hero-row"><span class="rs-hero-badge">'+(axes.length>1?('Befund '+(i+1)+'/'+axes.length):'Erkanntes Submuster')+'</span><span class="rs-axis-chip">'+esc((ax&&ax.name)||tk)+'</span></div>'+
        '<div class="rs-hero-name">'+esc(top&&top.muster?top.muster.name:'Kein eindeutiges Submuster')+'</div></div>';
      var evN=axisEvidence(d.symptome,(ax&&ax.id)||'');
      if(evN<=weakAxisMax()){h+='<div class="gd-caveat">⚖ <strong>Schwache Datenbasis:</strong> nur '+evN+' passende Beobachtung(en) — vorläufig behandeln.</div>';}
      if(ax&&rareAxis(ax.id)){h+='<div class="gd-caveat"><strong>Basisraten-Vorsicht:</strong> '+esc(ax.name)+' ist selten — mit Zurückhaltung lesen, früh fachlich abklären.</div>';}
      if(top&&top.muster){h+=musterSections(top.muster.bloecke,ax,i===0);}
      else{h+='<p class="gd-sub" style="margin-top:10px;">Kein eindeutiges Submuster — ergänze vertiefende Merkmale: <button class="gd-linkbtn" data-g="redeepen" data-topic="'+esc(tk)+'">jetzt vertiefen</button>.</p>';}
      h+='</div>';
    });
    h+='<p class="muted" style="font-size:12px;margin:4px 2px 0;line-height:1.5;">Beobachtungs-Hypothese eines KI-geschriebenen Programms (Savoir) — <strong>keine Diagnose</strong>. Alles oben ist hier vollständig lesbar (keine separate App nötig). Erscheint auch im Schüler-Hub und im KI-Export des Dossiers.</p>';
    h+='<div class="gd-nav" style="margin-top:14px;"><button class="gd-back" data-g="goto-verdacht">‹ Achsen ändern</button><span class="gd-spacer"></span><button class="btn btn-sm" data-g="goto-kriterien">Kriterien</button> <button class="btn btn-sm" data-g="restart">Neu starten</button></div>';
    return h;
  }

  function loading(){return '<div class="gd-card"><p class="gd-sub" style="margin:0;">Screening-Modul lädt … einen Moment.</p></div>';}

  function paint(){
    if(!host)return;
    if(!api()||!SG()){host.innerHTML=loading();if(!ST||!ST._retry){if(ST)ST._retry=1;setTimeout(function(){if(host)paint();},450);}return;}
    var h='';
    try{
      h=acuteBanner();
      if(ST.stage==='breit')h+=renderBreit();
      else if(ST.stage==='verdacht')h+=renderVerdacht();
      else if(ST.stage==='demografie')h+=renderDemografie();
      else if(ST.stage==='tiefe')h+=renderTiefe();
      else if(ST.stage==='kriterien')h+=renderKriterien();
      else if(ST.stage==='ergebnis')h+=renderErgebnis();
      else h+=renderBreit();
    }catch(e){h='<div class="gd-card"><p class="gd-sub">Fehler im Trichter: '+esc((e&&e.message)||String(e))+'</p></div>';}
    host.innerHTML=h;
  }

  function onClick(ev){
    var el=ev.target.closest&&ev.target.closest('[data-g]');
    if(!el||!host.contains(el))return;
    var g=el.getAttribute('data-g');ev.preventDefault();
    var d,ps;
    if(g==='cat'){var id=el.getAttribute('data-id');if(id==='K16')return;var i=ST.cats.indexOf(id);if(i>=0)ST.cats.splice(i,1);else ST.cats.push(id);paint();return;}
    if(g==='breit-drill'){ST.breitSub='drill';ST.catIdx=0;paint();return;}
    if(g==='sym'){var sid=el.getAttribute('data-id');d=read();d.symptome=d.symptome||[];var j=d.symptome.indexOf(sid);if(j>=0)d.symptome.splice(j,1);else d.symptome.push(sid);write(d);paint();return;}
    if(g==='breit-next'){var cats=drillCats();if(ST.catIdx<cats.length-1){ST.catIdx++;}else{ST._selInit=false;ST.stage='verdacht';}paint();return;}
    if(g==='back'){
      if(ST.stage==='breit'){if(ST.breitSub==='drill'){if(ST.catIdx>0){ST.catIdx--;}else{ST.breitSub='triage';}}paint();return;}
      if(ST.stage==='verdacht'){ST.stage='breit';ST.breitSub='drill';var c2=drillCats();ST.catIdx=Math.max(0,c2.length-1);paint();return;}
      if(ST.stage==='tiefe'){if(ST.tiefeIdx>0){ST.tiefeIdx--;}else if(ST.curIdx>0){setCurrentAxis(ST.curIdx-1);ST.tiefeIdx=Math.max(0,ST.tiefeSteps.length-1);}else if(demoQuestions().length){ST.stage='demografie';}else{ST.stage='verdacht';}paint();return;}
      return;
    }
    if(g==='axis-toggle'){var tk=el.getAttribute('data-topic');if(!tk)return;var ti=ST.selAxes.indexOf(tk);if(ti>=0)ST.selAxes.splice(ti,1);else ST.selAxes.push(tk);paint();return;}
    if(g==='deepen-start'){if(!ST.selAxes.length)return;d=read();ST.selAxes.forEach(function(tk){ensurePlan(tk,d);});write(d);ST.curIdx=0;if(demoQuestions().length&&!demoComplete()){ST.stage='demografie';}else{applyDemoToPlans(d);write(d);startDeepening();}paint();return;}
    if(g==='demo'){var dk=el.getAttribute('data-key'),dv=el.getAttribute('data-val');d=read();d.demografie=d.demografie||{};if(d.demografie[dk]===dv)delete d.demografie[dk];else d.demografie[dk]=dv;write(d);paint();return;}
    if(g==='demo-back'){ST.stage='verdacht';paint();return;}
    if(g==='demo-done'){d=read();applyDemoToPlans(d);write(d);startDeepening();paint();return;}
    if(g==='opt'){var fid=el.getAttribute('data-fid'),val=el.getAttribute('data-val');d=read();ps=ensurePlan(ST.axisTopicKey,d);if(ps.kontext[fid]===val)delete ps.kontext[fid];else ps.kontext[fid]=val;write(d);paint();return;}
    if(g==='tsym'){var tid=el.getAttribute('data-id');d=read();ps=ensurePlan(ST.axisTopicKey,d);var k2=ps.symptome.indexOf(tid);if(k2>=0)ps.symptome.splice(k2,1);else ps.symptome.push(tid);write(d);paint();return;}
    if(g==='tiefe-next'){if(ST.tiefeIdx<ST.tiefeSteps.length-1){ST.tiefeIdx++;}else{nextAxisOrKriterien();}paint();return;}
    if(g==='gate'){var gk=el.getAttribute('data-key'),gv=el.getAttribute('data-val');d=read();d.gate=d.gate||{};if(d.gate[gk]===gv)delete d.gate[gk];else d.gate[gk]=gv;write(d);paint();return;}
    if(g==='gate-done'||g==='gate-skip'){ST.stage='ergebnis';paint();return;}
    if(g==='kriterien-back'){if(ST.selAxes.length){setCurrentAxis(ST.selAxes.length-1);ST.tiefeIdx=Math.max(0,ST.tiefeSteps.length-1);ST.stage=ST.tiefeSteps.length?'tiefe':'verdacht';}else{ST.stage='verdacht';}paint();return;}
    if(g==='goto-kriterien'){ST.stage='kriterien';paint();return;}
    if(g==='goto-verdacht'){ST._selInit=true;ST.stage='verdacht';paint();return;}
    if(g==='redeepen'){var rtk=el.getAttribute('data-topic');if(rtk){if(ST.selAxes.indexOf(rtk)<0)ST.selAxes.push(rtk);var idx=ST.selAxes.indexOf(rtk);setCurrentAxis(idx);d=read();ensurePlan(rtk,d);applyDemoToPlans(d);write(d);ST.stage=ST.tiefeSteps.length?'tiefe':'kriterien';}paint();return;}
    if(g==='restart'){ST=initState(ST.sid);ST.stage='breit';ST.breitSub='triage';ST.catIdx=0;ST.selAxes=[];ST._selInit=false;paint();return;}
  }

  return {
    mount:function(hostEl,stu){
      if(!hostEl||!stu)return;
      host=hostEl;student=stu;
      if(!ST||ST.sid!==stu.id){ST=initState(stu.id);}
      else{ST._retry=0;}
      host.addEventListener('click',onClick);
      paint();
    },
    reset:function(sid){if(ST&&ST.sid===sid){ST=initState(sid);}}
  };
})();
`;

/* ============================================================
   Isa-Toolbox-Integration: Materialdaten, Taxonomie, Modul, ISA-App
   ============================================================ */
var MATERIALS_JSON = '[]', TAXONOMY_JSON = '{}', ISA_B64 = '', MATERIALS_MODULE = '';
try { MATERIALS_JSON = read('materials.json'); } catch (e) { console.warn('materials.json fehlt — Material-Matching leer.'); }
try { TAXONOMY_JSON = read('taxonomy.json'); } catch (e) { console.warn('taxonomy.json fehlt.'); }
try { MATERIALS_MODULE = read('materials-module.js'); } catch (e) { console.warn('materials-module.js fehlt — KB_MATERIALS deaktiviert.'); }
try { ISA_B64 = fs.readFileSync(path.join(ROOT, 'ISA-App.html')).toString('base64'); }
catch (e) { console.warn('ISA-App.html fehlt — Material-Tab ohne Bibliothek.'); }

/* Lehrplan-Rubrik: Mathe-Jahresprogramm 5ᵉ PF (getrennt von der Material-Bibliothek) */
var MATHE_JSON = '{}', MATHE_MODULE = '', MATHE_PDF_B64 = '';
try { MATHE_JSON = read('mathe-programm.json'); } catch (e) { console.warn('mathe-programm.json fehlt — Lehrplan leer.'); }
try { MATHE_MODULE = read('mathe-module.js'); } catch (e) { console.warn('mathe-module.js fehlt — KB_MATHE deaktiviert.'); }
try { MATHE_PDF_B64 = fs.readFileSync(path.join(ROOT, 'PROG_5PF_MATHE.pdf')).toString('base64'); } catch (e) { console.warn('PROG_5PF_MATHE.pdf fehlt — Original-PDF nicht eingebettet.'); }

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
#kb-mathe .mth-theme-head{ display:flex; align-items:center; gap:12px; margin:0 2px 10px; }
#kb-mathe .mth-theme-ic{ font-size:24px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:12px; background:color-mix(in srgb, var(--tc) 14%, #fff); }
#kb-mathe .mth-theme-t{ font-size:18px; font-weight:900; color:var(--kb-ink,#23243a); }
#kb-mathe .mth-theme-z{ font-size:12.5px; color:var(--kb-muted,#888); margin-top:1px; }
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
  '/* === Material / Isa-Toolbox === */', MATERIAL_CSS,
  '/* === Lehrplan (Mathe) === */', MATHE_CSS,
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
  '<section class="kb-panel" id="isa-root"><div class="isa-host" id="isa-host"></div></section>',
  '<section class="kb-panel" id="kb-mathe"></section>',
  SHELL_PANELS_EXTRA,
  '<script type="application/octet-stream" id="kb-isa-b64">' + ISA_B64 + '</' + 'script>',
  '<script>window.KB_MATERIALS_DATA=' + jsonForScript(MATERIALS_JSON) + ';window.KB_TAXONOMY=' + jsonForScript(TAXONOMY_JSON) + ';</' + 'script>',
  '<script>' + ROSTER_MODULE + '</' + 'script>',
  '<script>' + dosScript + '</' + 'script>',
  '<script>' + DOS_OVERRIDES + '</' + 'script>',
  '<script>' + BUBBLE_MODULE + '</' + 'script>',
  '<script>' + anwScript + '</' + 'script>',
  '<script>' + SAVOIR_MODULE + '</' + 'script>',
  '<script>' + SCREENING_MODULE + '</' + 'script>',
  '<script>' + NOTEN_MODULE + '</' + 'script>',
  '<script>' + WEEKLY_MODULE + '</' + 'script>',
  '<script>' + GUIDE_MODULE + '</' + 'script>',
  '<script>' + SYNC_MODULE + '</' + 'script>',
  '<script>' + MATERIALS_MODULE + '</' + 'script>',
  '<script>window.KB_MATHE_DATA=' + jsonForScript(MATHE_JSON) + ';</' + 'script>',
  '<script type="application/octet-stream" id="kb-mathe-pdf-b64">' + MATHE_PDF_B64 + '</' + 'script>',
  '<script>' + MATHE_MODULE + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '<script>' + ANW_SIDE_TOGGLE + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

fs.writeFileSync(path.join(ROOT, 'index.html'), parts.join('\n'), 'utf8');
console.log('index.html geschrieben: ' + parts.join('\n').length + ' Bytes');
