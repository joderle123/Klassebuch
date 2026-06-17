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
  "    delNote:function(id){delNote(id);}",
  "  };",
  "  window.__anwRefresh=function(){if(window.KB_ROSTER){state.students=window.KB_ROSTER.asAnwesenheit();}renderAll();};"
].join("\n");
anwScript = replaceOnce(anwScript, 'else init();\n})();', 'else init();\n' + ANW_API + '\n})();', 'anw:api-hook');

/* ============================================================
   Patch der dossier-Engine: Reconcile-Aufruf in den Bootstrap
   ============================================================ */
dosScript = replaceOnce(dosScript,
  '    checkPersistenceAndWarn();\n    render();',
  '    checkPersistenceAndWarn();\n    if(window.KB_DOS_RECONCILE){try{window.KB_DOS_RECONCILE();}catch(e){}}\n    render();',
  'dos:reconcile-hook');

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
      <button class="kb-link" data-kb-nav="klassenbuch"><span class="kb-ic">📋</span>Klassenbuch</button>
      <button class="kb-link" data-kb-nav="absenzen"><span class="kb-ic">📆</span>Absenzen</button>
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
    <section class="kb-panel kb-pad" id="kb-klassenbuch">
      <div class="kb-pagehead"><h2>📋 Klassenbuch</h2><p style="margin:0 0 16px;color:var(--kb-muted);">Bemerkungen, Hausaufgaben und Prüfungen — der Tageslog der Klasse.</p></div>
      <div style="margin-bottom:14px;"><button class="kb-btn kb-btn-primary" data-kb-act="add-note">+ Notiz erfassen</button></div>
      <div id="kb-klassenbuch-body"></div>
    </section>
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
    return '<div class="kb-hub-pad"><div class="kb-placeholder"><div class="kb-placeholder-ic">🕸️</div><h3>Helfernetz</h3><p>Dieser Bereich ist vorbereitet und kommt bald. Hier entsteht das Helfernetz und weitere Module rund um '+escapeHtml(student.name)+'.</p></div></div>';
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
        afterRender: function(root){ if(baseAfter){try{baseAfter(root);}catch(e){}} }
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
  var PANELS=['anw-root','dos-root','kb-klassenbuch','kb-klasse','kb-data'];
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
    } else if(nav==='klassenbuch'){
      showPanel('kb-klassenbuch'); setActive('klassenbuch'); renderKlassenbuch();
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
    else if(act==='add-note'){go('absenzen');if(window.KB_ANW){window.KB_ANW.openNoteToday();}}
    else if(act==='del-note'){if(confirm('Notiz löschen?')&&window.KB_ANW){window.KB_ANW.delNote(arg);renderKlassenbuch();}}
  });

  // Klassenbuch-Liste
  function renderKlassenbuch(){
    var body=$('kb-klassenbuch-body'); if(!body)return;
    if(!window.KB_ANW){body.innerHTML='<div class="kb-card">Klassenbuch-Modul nicht geladen.</div>';return;}
    var notes=window.KB_ANW.notes();
    if(!notes.length){body.innerHTML='<div class="kb-card" style="color:var(--kb-muted)">Noch keine Einträge. Notizen werden in den Absenzen am jeweiligen Tag erfasst — oder hier über „+ Notiz erfassen".</div>';return;}
    var TYPE={pruefung:['📝','Prüfung'],hausaufgabe:['📒','Hausaufgabe'],bemerkung:['💬','Bemerkung'],allgemein:['📌','Allgemein']};
    var byDate={},order=[];
    notes.forEach(function(n){if(!byDate[n.date]){byDate[n.date]=[];order.push(n.date);}byDate[n.date].push(n);});
    body.innerHTML=order.map(function(date){
      var items=byDate[date].map(function(n){var t=TYPE[n.type]||['📌',n.type];
        return '<div class="kb-note"><div class="kb-note-badge">'+t[0]+'</div><div class="kb-note-main"><div class="kb-note-meta">'+esc(t[1])+(n.subject?' · '+esc(n.subject):'')+(n.level?' · '+esc(n.level):'')+(n.byUser?' · '+esc(n.byUser):'')+'</div><div>'+esc(n.text)+'</div></div><button class="kb-btn kb-btn-ghost" data-kb-act="del-note" data-kb-arg="'+esc(n.id)+'" title="Löschen">🗑</button></div>';
      }).join('');
      return '<div class="kb-card"><div class="kb-note-date">'+esc(window.KB_ANW.fmt(date))+'</div>'+items+'</div>';
    }).join('');
  }

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
  '<script>' + anwScript + '</' + 'script>',
  '<script>' + SHELL_CONTROLLER + '</' + 'script>',
  '</body>',
  '</html>',
  ''
];

fs.writeFileSync(path.join(ROOT, 'index.html'), parts.join('\n'), 'utf8');
console.log('index.html geschrieben: ' + parts.join('\n').length + ' Bytes');
