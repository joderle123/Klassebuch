/* KB_MATHE — Rubrik „Lehrplan": vollständiges Mathe-Jahresprogramm (5ᵉ PF).
   Wird als eigener Bereich (#kb-mathe) gerendert, getrennt von der Material-Bibliothek.
   Datenquelle: window.KB_MATHE_DATA (mathe-programm.json). PDF: #kb-mathe-pdf-b64. */
window.KB_MATHE = (function () {
  var DATA = window.KB_MATHE_DATA || { meta: {}, hinweis: [], module: [] };
  var MODULES = DATA.module || [];
  var LS_DONE = 'klassebuch_mathe_done_v1';

  /* ---------- Helfer ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  /* [[a/b]] -> gesetzter Bruch; ansonsten HTML-sicher. */
  function rich(s) {
    var t = esc(s);
    t = t.replace(/\[\[([^\]]+)\]\]/g, function (m, inner) {
      var parts = inner.split('/');
      if (parts.length === 2) { return '<span class="mfrac"><span class="mnum">' + esc(parts[0].trim()) + '</span><span class="mden">' + esc(parts[1].trim()) + '</span></span>'; }
      return esc(inner);
    });
    return t;
  }
  function loadDone() { try { var r = localStorage.getItem(LS_DONE); if (r) { return JSON.parse(r) || {}; } } catch (e) {} return {}; }
  var DONE = loadDone();
  function saveDone() { try { localStorage.setItem(LS_DONE, JSON.stringify(DONE)); } catch (e) {} }
  function lkey(mid, nr) { return mid + ':' + nr; }
  function isDone(mid, nr) { return !!DONE[lkey(mid, nr)]; }

  function findModule(id) { for (var i = 0; i < MODULES.length; i++) { if (MODULES[i].id === id) { return MODULES[i]; } } return null; }
  function flatLessons(m) { var out = []; (m.themen || []).forEach(function (t) { (t.lektionen || []).forEach(function (l) { out.push({ theme: t, lek: l }); }); }); return out; }
  function moduleProgress(m) { var fl = flatLessons(m), d = 0; fl.forEach(function (x) { if (isDone(m.id, x.lek.nr)) d++; }); return { done: d, total: fl.length }; }

  /* ---------- Zustand ---------- */
  var state = { view: 'home', mid: null, nr: null };
  function host() { return document.getElementById('kb-mathe'); }

  function open() { state.view = 'home'; render(); }

  function render() {
    var el = host(); if (!el) return;
    if (state.view === 'lesson') { el.innerHTML = lessonHtml(state.mid, state.nr); }
    else if (state.view === 'module') { el.innerHTML = moduleHtml(state.mid); }
    else { el.innerHTML = homeHtml(); }
    el.scrollTop = 0;
    var stage = document.getElementById('kb-stage'); if (stage) { stage.scrollTop = 0; }
  }

  /* ---------- Landing / Jahresübersicht ---------- */
  function homeHtml() {
    var meta = DATA.meta || {};
    var h = '<div class="mth-wrap">';
    h += '<div class="mth-hero">' +
      '<div class="mth-hero-badge">📐 Lehrplan</div>' +
      '<h1>' + esc(meta.titel || 'Mathematik') + '</h1>' +
      '<div class="mth-hero-sub">' + esc(meta.klasse || '') + '</div>' +
      '<div class="mth-hero-facts">' +
        (meta.rahmen ? '<span>🗓️ ' + esc(meta.rahmen) + '</span>' : '') +
        (meta.sprache ? '<span>🗣️ ' + esc(meta.sprache) + '</span>' : '') +
        (meta.quelle ? '<span>📘 ' + esc(meta.quelle) + '</span>' : '') +
      '</div>' +
    '</div>';

    /* Hinweis / Anleitung */
    if (DATA.hinweis && DATA.hinweis.length) {
      h += '<div class="mth-note"><div class="mth-note-t">So arbeitest du mit diesem Programm</div><ul>' +
        DATA.hinweis.map(function (p) { return '<li>' + rich(p) + '</li>'; }).join('') + '</ul>';
      if (DATA.legende) {
        h += '<div class="mth-legend">' + ['basis', 'kern', 'plus'].map(function (k) {
          var L = DATA.legende[k]; if (!L) return '';
          return '<span class="mth-lg mth-lg-' + k + '">' + esc(L.icon) + ' <b>' + esc(L.label) + '</b> — ' + esc(L.hint) + '</span>';
        }).join('') + '</div>';
      }
      h += '</div>';
    }

    /* Original-PDF */
    h += '<div class="mth-pdf">' +
      '<div class="mth-pdf-ic">📄</div>' +
      '<div class="mth-pdf-x"><div class="mth-pdf-t">Offizieller Lehrplan (PDF)</div>' +
      '<div class="mth-pdf-s">' + esc(meta.quelle || 'Référentiel de compétences') + '</div></div>' +
      '<div class="mth-pdf-b"><button class="mth-btn mth-btn-p" data-mth="pdf-view">Ansehen</button>' +
      '<button class="mth-btn" data-mth="pdf-dl">Herunterladen</button></div>' +
    '</div>';

    /* Jahresübersicht */
    h += '<h2 class="mth-h2">Das Schuljahr in 3 Modulen</h2>';
    h += '<div class="mth-modules">';
    MODULES.forEach(function (m) {
      var pr = moduleProgress(m);
      var pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
      var themes = (m.themen || []).map(function (t) { return '<span class="mth-chip">' + esc(t.icon || '') + ' ' + esc(t.titel) + '</span>'; }).join('');
      h += '<button class="mth-mcard" data-mth="module" data-id="' + esc(m.id) + '" style="--mc:' + esc(m.farbe || '#6C4CE0') + ';--mc2:' + esc(m.farbe2 || m.farbe || '#9B7BFF') + '">' +
        '<div class="mth-mcard-top"><span class="mth-mnr">Modul ' + esc(m.nr) + '</span><span class="mth-mico">' + esc(m.icon || '📐') + '</span></div>' +
        '<div class="mth-mtitle">' + esc(m.titel) + '</div>' +
        '<div class="mth-munter">' + esc(m.unter || '') + '</div>' +
        '<div class="mth-chips">' + themes + '</div>' +
        '<div class="mth-mprog"><div class="mth-mbar"><i style="width:' + pct + '%"></i></div>' +
        '<span>' + pr.done + '/' + pr.total + ' Lektionen</span></div>' +
      '</button>';
    });
    h += '</div>';
    h += '<div class="mth-footnote">' + esc(meta.module || '') + '</div>';
    h += '</div>';
    return h;
  }

  /* ---------- Modul-Ansicht ---------- */
  function moduleHtml(mid) {
    var m = findModule(mid); if (!m) return homeHtml();
    var pr = moduleProgress(m);
    var pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
    var h = '<div class="mth-wrap" style="--mc:' + esc(m.farbe || '#6C4CE0') + ';--mc2:' + esc(m.farbe2 || m.farbe || '#9B7BFF') + '">';
    h += '<button class="mth-back" data-mth="home">← Jahresübersicht</button>';
    h += '<div class="mth-modhead">' +
      '<div class="mth-modhead-ic">' + esc(m.icon || '📐') + '</div>' +
      '<div class="mth-modhead-x"><div class="mth-modhead-nr">Modul ' + esc(m.nr) + '</div>' +
      '<h1>' + esc(m.titel) + '</h1>' +
      '<p>' + esc(m.ziel || m.unter || '') + '</p>' +
      '<div class="mth-mprog mth-mprog-lg"><div class="mth-mbar"><i style="width:' + pct + '%"></i></div><span>' + pr.done + '/' + pr.total + ' erledigt</span></div>' +
      '</div></div>';

    (m.themen || []).forEach(function (t, ti) {
      h += '<div class="mth-theme" style="--tc:' + esc(t.farbe || m.farbe || '#6C4CE0') + '">';
      h += '<div class="mth-theme-head"><span class="mth-theme-ic">' + esc(t.icon || '') + '</span>' +
        '<div><div class="mth-theme-t">' + esc(t.titel) + '</div>' +
        ((t.ziele && t.ziele.length) ? '<div class="mth-theme-z">' + t.ziele.map(function (z) { return esc(z); }).join(' · ') + '</div>' : '') +
        '</div></div>';
      h += '<div class="mth-lrows">';
      (t.lektionen || []).forEach(function (l) {
        var done = isDone(m.id, l.nr);
        h += '<button class="mth-lrow' + (done ? ' is-done' : '') + '" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(l.nr) + '">' +
          '<span class="mth-lrow-nr">' + esc(l.nr) + '</span>' +
          '<span class="mth-lrow-x"><span class="mth-lrow-t">' + rich(l.titel) + '</span>' +
          '<span class="mth-lrow-goal">🎯 ' + rich(l.lernziel || '') + '</span></span>' +
          (l.dauer ? '<span class="mth-lrow-d">' + esc(l.dauer) + '</span>' : '') +
          '<span class="mth-lrow-chk">' + (done ? '✓' : '') + '</span>' +
        '</button>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------- Lektions-Ansicht ---------- */
  function lessonHtml(mid, nr) {
    var m = findModule(mid); if (!m) return homeHtml();
    var fl = flatLessons(m);
    var idx = -1; for (var i = 0; i < fl.length; i++) { if (String(fl[i].lek.nr) === String(nr)) { idx = i; break; } }
    if (idx < 0) return moduleHtml(mid);
    var lek = fl[idx].lek, theme = fl[idx].theme;
    var done = isDone(m.id, lek.nr);

    var h = '<div class="mth-wrap mth-lesson" style="--mc:' + esc(m.farbe || '#6C4CE0') + ';--mc2:' + esc(m.farbe2 || m.farbe || '#9B7BFF') + ';--tc:' + esc(theme.farbe || m.farbe || '#6C4CE0') + '">';

    /* Kopf */
    h += '<div class="mth-lbar">' +
      '<button class="mth-back" data-mth="module" data-id="' + esc(m.id) + '">← Modul ' + esc(m.nr) + '</button>' +
      '<div class="mth-lbar-b">' +
        '<button class="mth-btn mth-allsol" data-mth="allsol">👁️ Lösungen</button>' +
        '<button class="mth-btn" data-mth="print" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-sol="0">🖨️ Arbeitsblatt</button>' +
        '<button class="mth-btn" data-mth="print" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-sol="1">🖨️ + Lösungen</button>' +
        '<button class="mth-btn mth-donebtn' + (done ? ' on' : '') + '" data-mth="done" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '">' + (done ? '✓ Erledigt' : 'Als erledigt markieren') + '</button>' +
      '</div>' +
    '</div>';

    h += '<div class="mth-crumb">' + esc(theme.icon || '') + ' ' + esc(theme.titel) + ' · Lektion ' + esc(lek.nr) + '</div>';
    h += '<h1 class="mth-ltitle">' + rich(lek.titel) + '</h1>';

    /* Lernziel-Banner */
    h += '<div class="mth-goal">🎯 <b>Lernziel:</b> ' + rich(lek.lernziel || '') + '</div>';

    /* Meta: Dauer, Material, Wortschatz */
    var meta = [];
    if (lek.dauer) meta.push('<span class="mth-meta-i">⏱️ ' + esc(lek.dauer) + '</span>');
    if (lek.material && lek.material.length) meta.push('<span class="mth-meta-i">🎒 ' + lek.material.map(esc).join(', ') + '</span>');
    if (meta.length) h += '<div class="mth-meta">' + meta.join('') + '</div>';
    if (lek.wortschatz && lek.wortschatz.length) {
      h += '<div class="mth-voc-wrap"><span class="mth-voc-lbl">Wortschatz</span>' +
        lek.wortschatz.map(function (w) { return '<span class="mth-voc"><b>' + esc(w.de) + '</b><i>' + esc(w.fr) + '</i></span>'; }).join('') + '</div>';
    }

    /* Einstieg */
    if (lek.einstieg) {
      h += '<div class="mth-sec mth-sec-start"><div class="mth-sec-h">💡 Einstieg' + (lek.einstieg.titel ? ' — ' + esc(lek.einstieg.titel) : '') + '</div>' +
        '<p>' + rich(lek.einstieg.text) + '</p></div>';
    }

    /* Erklärung (Schritte) */
    if (lek.erklaerung && lek.erklaerung.length) {
      h += '<div class="mth-sec"><div class="mth-sec-h">📖 Erklärung — Schritt für Schritt</div><div class="mth-steps">';
      lek.erklaerung.forEach(function (s, i) {
        h += '<div class="mth-step"><div class="mth-step-n">' + (i + 1) + '</div><div class="mth-step-x">' +
          (s.titel ? '<div class="mth-step-t">' + rich(s.titel) + '</div>' : '') +
          '<div class="mth-step-txt">' + rich(s.text) + '</div>' +
          (s.beispiel ? '<div class="mth-ex"><span>Beispiel</span> ' + rich(s.beispiel) + '</div>' : '') +
        '</div></div>';
      });
      h += '</div></div>';
    }

    /* Merksatz */
    if (lek.merksatz) {
      h += '<div class="mth-merk"><div class="mth-merk-ic">📌</div><div><div class="mth-merk-t">Merksatz</div>' + rich(lek.merksatz) + '</div></div>';
    }

    /* Gemeinsam */
    if (lek.gemeinsam && lek.gemeinsam.length) {
      h += '<div class="mth-sec"><div class="mth-sec-h">🤝 Gemeinsam an der Tafel</div><ol class="mth-tasks">';
      lek.gemeinsam.forEach(function (g) {
        h += '<li><div class="mth-task-q">' + rich(g.a) + '</div>' + solBtn(g.l) + '</li>';
      });
      h += '</ol></div>';
    }

    /* Differenzierte Aufgaben */
    if (lek.aufgaben) {
      h += '<div class="mth-sec"><div class="mth-sec-h">✏️ Aufgaben — drei Niveaus</div><div class="mth-levels">';
      h += levelHtml('basis', lek.aufgaben.basis);
      h += levelHtml('kern', lek.aufgaben.kern);
      h += levelHtml('plus', lek.aufgaben.plus);
      h += '</div></div>';
    }

    /* Exit-Ticket */
    if (lek.exit) {
      h += '<div class="mth-exit"><div class="mth-exit-t">🎫 Exit-Ticket</div>' + rich(lek.exit) + '</div>';
    }

    /* Förder-Tipp + Spiel */
    if (lek.foerdertipp) {
      h += '<div class="mth-tip"><div class="mth-tip-t">🧩 Förder-Tipp (für dich)</div>' + rich(lek.foerdertipp) + '</div>';
    }
    if (lek.spiel) {
      h += '<div class="mth-spiel"><div class="mth-spiel-t">🎲 Spiel / Aktivität</div>' + rich(lek.spiel) + '</div>';
    }

    /* Vor / Zurück */
    h += '<div class="mth-nav">';
    if (idx > 0) { h += '<button class="mth-btn" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(fl[idx - 1].lek.nr) + '">← Lektion ' + esc(fl[idx - 1].lek.nr) + '</button>'; }
    else { h += '<span></span>'; }
    if (idx < fl.length - 1) { h += '<button class="mth-btn mth-btn-p" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(fl[idx + 1].lek.nr) + '">Lektion ' + esc(fl[idx + 1].lek.nr) + ' →</button>'; }
    else { h += '<button class="mth-btn mth-btn-p" data-mth="module" data-id="' + esc(m.id) + '">Modul abschließen ✓</button>'; }
    h += '</div>';

    h += '</div>';
    return h;
  }

  function levelHtml(key, lvl) {
    if (!lvl || !lvl.items || !lvl.items.length) return '';
    var L = (DATA.legende && DATA.legende[key]) || { icon: '', label: key, hint: '' };
    var h = '<div class="mth-level mth-level-' + key + '">' +
      '<div class="mth-level-h">' + esc(L.icon) + ' <b>' + esc(L.label) + '</b><span>' + esc(L.hint) + '</span></div>';
    if (lvl.hinweis) h += '<div class="mth-level-hint">' + rich(lvl.hinweis) + '</div>';
    h += '<ol class="mth-tasks">';
    lvl.items.forEach(function (it) {
      h += '<li><div class="mth-task-q">' + rich(it.a) + '</div>' + solBtn(it.l) + '</li>';
    });
    h += '</ol></div>';
    return h;
  }

  function solBtn(l) {
    if (l == null || l === '') return '';
    return '<button class="mth-solbtn" data-mth="sol">Lösung</button><div class="mth-sol">' + rich(l) + '</div>';
  }

  /* ---------- Druck (Arbeitsblatt) ---------- */
  function printLesson(mid, nr, withSol) {
    var m = findModule(mid); if (!m) return;
    var fl = flatLessons(m), lek = null, theme = null;
    for (var i = 0; i < fl.length; i++) { if (String(fl[i].lek.nr) === String(nr)) { lek = fl[i].lek; theme = fl[i].theme; break; } }
    if (!lek) return;
    var body = '';
    body += '<div class="ph"><div class="pt">' + rich(lek.titel) + '</div>' +
      '<div class="psub">Modul ' + esc(m.nr) + ' · ' + esc(theme.titel) + ' · Lektion ' + esc(lek.nr) + '</div></div>';
    body += '<div class="pgoal"><b>Ziel:</b> ' + rich(lek.lernziel || '') + '</div>';
    body += '<div class="pname">Name: ____________________________    Datum: ____________</div>';
    if (lek.merksatz) { body += '<div class="pmerk"><b>Merksatz.</b> ' + rich(lek.merksatz) + '</div>'; }

    function pLevel(key, lvl) {
      if (!lvl || !lvl.items || !lvl.items.length) return '';
      var L = (DATA.legende && DATA.legende[key]) || { icon: '', label: key };
      var s = '<div class="plevel"><div class="plh">' + esc(L.icon) + ' ' + esc(L.label) + '</div><ol>';
      lvl.items.forEach(function (it) {
        s += '<li><div class="pq">' + rich(it.a) + '</div>';
        if (withSol) { s += '<div class="psol"><b>Lösung:</b> ' + rich(it.l) + '</div>'; }
        else { s += '<div class="pline"></div><div class="pline"></div>'; }
        s += '</li>';
      });
      s += '</ol></div>';
      return s;
    }
    if (lek.aufgaben) {
      body += pLevel('basis', lek.aufgaben.basis);
      body += pLevel('kern', lek.aufgaben.kern);
      body += pLevel('plus', lek.aufgaben.plus);
    }

    var css = 'body{font-family:Inter,Arial,sans-serif;color:#15121f;margin:26px 30px;line-height:1.5}' +
      '.ph{border-bottom:3px solid ' + (m.farbe || '#6C4CE0') + ';padding-bottom:8px;margin-bottom:12px}' +
      '.pt{font-size:21px;font-weight:800}.psub{color:#666;font-size:13px;margin-top:2px;font-weight:600}' +
      '.pgoal{background:#f3f0ff;border-left:4px solid ' + (m.farbe || '#6C4CE0') + ';padding:8px 12px;border-radius:6px;margin:10px 0}' +
      '.pname{margin:12px 0;font-size:14px;color:#333}' +
      '.pmerk{border:1.5px dashed #b9a7ef;background:#faf8ff;border-radius:8px;padding:8px 12px;margin:12px 0;font-size:14px}' +
      '.plevel{margin:16px 0;break-inside:avoid}.plh{font-weight:800;font-size:15px;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #ddd}' +
      'ol{margin:0;padding-left:22px}li{margin:10px 0;break-inside:avoid}.pq{font-weight:600}' +
      '.pline{border-bottom:1px solid #bbb;height:20px;margin:7px 0}' +
      '.psol{color:#1d7a4d;font-size:13.5px;margin-top:3px}' +
      '.mfrac{display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle;margin:0 2px;line-height:1}' +
      '.mfrac .mnum{border-bottom:1.5px solid currentColor;padding:0 3px}.mfrac .mden{padding:0 3px}' +
      '@media print{.plevel{page-break-inside:avoid}}';
    var w = window.open('', '_blank'); if (!w) { alert('Bitte Pop-ups für den Druck erlauben.'); return; }
    w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>' + esc(lek.titel) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>');
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300);
  }

  /* ---------- PDF ansehen / laden ---------- */
  function pdfBlobUrl() {
    var node = document.getElementById('kb-mathe-pdf-b64');
    var b64 = node ? node.textContent.trim() : '';
    if (!b64) return null;
    try {
      var bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) { bytes[i] = bin.charCodeAt(i); }
      return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    } catch (e) { return null; }
  }
  function viewPdf() { var u = pdfBlobUrl(); if (u) { window.open(u, '_blank'); } else { alert('PDF nicht eingebettet.'); } }
  function dlPdf() {
    var u = pdfBlobUrl(); if (!u) { alert('PDF nicht eingebettet.'); return; }
    var a = document.createElement('a'); a.href = u; a.download = 'Lehrplan_Mathe_5PF.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /* ---------- Klick-Verdrahtung ---------- */
  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-mth]');
    if (!t) return;
    var a = t.getAttribute('data-mth');
    if (a === 'sol') { var box = t.nextElementSibling; if (box && box.classList.contains('mth-sol')) { box.classList.toggle('open'); t.classList.toggle('on'); } return; }
    if (a === 'allsol') {
      var root = host().querySelector('.mth-lesson'); if (!root) return;
      var on = root.classList.toggle('allsol');
      t.classList.toggle('on', on);
      t.textContent = on ? '🙈 Lösungen verbergen' : '👁️ Lösungen';
      return;
    }
    e.preventDefault();
    if (a === 'home') { state.view = 'home'; render(); }
    else if (a === 'module') { state.view = 'module'; state.mid = t.getAttribute('data-id'); render(); }
    else if (a === 'lesson') { state.view = 'lesson'; state.mid = t.getAttribute('data-mid'); state.nr = t.getAttribute('data-nr'); render(); }
    else if (a === 'done') {
      var mid = t.getAttribute('data-mid'), nr = t.getAttribute('data-nr'), k = lkey(mid, nr);
      if (DONE[k]) { delete DONE[k]; } else { DONE[k] = true; }
      saveDone(); render();
    }
    else if (a === 'print') { printLesson(t.getAttribute('data-mid'), t.getAttribute('data-nr'), t.getAttribute('data-sol') === '1'); }
    else if (a === 'pdf-view') { viewPdf(); }
    else if (a === 'pdf-dl') { dlPdf(); }
  }

  function init() {
    var el = host();
    if (el && !el.getAttribute('data-wired')) { el.setAttribute('data-wired', '1'); el.addEventListener('click', onClick); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

  /* ---------- Sync (Fortschritt teamweit) ---------- */
  return {
    open: open,
    render: render,
    data: function () { return DATA; },
    syncExport: function () { return { done: DONE }; },
    syncApply: function (obj) { if (obj && obj.done) { DONE = obj.done; try { localStorage.setItem(LS_DONE, JSON.stringify(DONE)); } catch (e) {} if (host()) render(); } }
  };
})();
