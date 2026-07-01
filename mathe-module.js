/* KB_MATHE — Rubrik „Lehrplan": vollständiges Mathe-Jahresprogramm (5ᵉ PF).
   Eigener Bereich (#kb-mathe), getrennt von der Material-Bibliothek.
   Erzeugt druckbare, schülergerechte INFOBLÄTTER (Lernblätter) und
   ARBEITSBLÄTTER pro Niveau — mit Bildern (Zahlenstrahl, 100er-Feld,
   Brüche, Koordinaten, Figuren). Datenquelle: window.KB_MATHE_DATA. */
window.KB_MATHE = (function () {
  var DATA = window.KB_MATHE_DATA || { meta: {}, hinweis: [], module: [] };
  var MODULES = DATA.module || [];
  var LS_DONE = 'klassebuch_mathe_done_v1';

  /* ---------- Helfer ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
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
  function lessonOf(m, nr) { var fl = flatLessons(m); for (var i = 0; i < fl.length; i++) { if (String(fl[i].lek.nr) === String(nr)) { return fl[i]; } } return null; }

  /* ============================================================
     VIS — Bild-Bibliothek (SVG). Alle geben HTML/SVG-Strings zurück.
     ============================================================ */
  var VIS = (function () {
    function frame(w, h, inner) { return '<svg class="mth-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" font-family="Inter,Arial,sans-serif">' + inner + '</svg>'; }
    function pt(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10]; }
    function fmt(v) { var r = Math.round(v * 100) / 100; return String(r).replace('.', ','); }

    function numberline(o) {
      o = o || {}; var col = o.color || '#6C4CE0';
      var W = 540, H = o.den ? 96 : 84, y = 44, padL = 34, padR = 34;
      var s = '';
      s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#2b2b3a" stroke-width="2.5"/>';
      s += '<polygon points="' + (W - padR) + ',' + (y - 6) + ' ' + (W - padR + 12) + ',' + y + ' ' + (W - padR) + ',' + (y + 6) + '" fill="#2b2b3a"/>';
      s += '<polygon points="' + padL + ',' + (y - 6) + ' ' + (padL - 12) + ',' + y + ' ' + padL + ',' + (y + 6) + '" fill="#2b2b3a"/>';
      if (o.den) {
        var den = o.den, x = function (n) { return padL + n / den * (W - padL - padR); };
        for (var i = 0; i <= den; i++) { var xi = x(i), big = (i === 0 || i === den); s += '<line x1="' + xi + '" y1="' + (y - (big ? 12 : 7)) + '" x2="' + xi + '" y2="' + (y + (big ? 12 : 7)) + '" stroke="#2b2b3a" stroke-width="' + (big ? 2.5 : 1.3) + '"/>'; }
        s += '<text x="' + x(0) + '" y="' + (y + 30) + '" text-anchor="middle" font-size="14" font-weight="700">0</text>';
        s += '<text x="' + x(den) + '" y="' + (y + 30) + '" text-anchor="middle" font-size="14" font-weight="700">1</text>';
        (o.marks || []).forEach(function (m) { var xm = x(m.n); s += '<circle cx="' + xm + '" cy="' + y + '" r="7" fill="' + (m.color || col) + '"/>'; s += '<line x1="' + xm + '" y1="' + (y - 20) + '" x2="' + xm + '" y2="' + (y - 8) + '" stroke="' + (m.color || col) + '" stroke-width="2"/>'; s += '<text x="' + xm + '" y="' + (y - 24) + '" text-anchor="middle" font-size="15" font-weight="800" fill="' + (m.color || col) + '">' + (m.label || (m.n + '/' + den)) + '</text>'; });
      } else {
        var from = o.from == null ? 0 : o.from, to = o.to == null ? 10 : o.to, step = o.step || 1, span = to - from;
        var xf = function (v) { return padL + (v - from) / span * (W - padL - padR); };
        for (var v = from; v <= to + 1e-9; v += step) { var xv = xf(v), zero = Math.abs(v) < 1e-9; s += '<line x1="' + xv + '" y1="' + (y - (zero ? 12 : 7)) + '" x2="' + xv + '" y2="' + (y + (zero ? 12 : 7)) + '" stroke="#2b2b3a" stroke-width="' + (zero ? 3 : 1.3) + '"/>'; s += '<text x="' + xv + '" y="' + (y + 28) + '" text-anchor="middle" font-size="13" font-weight="' + (zero ? 800 : 500) + '">' + fmt(v) + '</text>'; }
        (o.marks || []).forEach(function (m) { var xm = xf(m.at); s += '<circle cx="' + xm + '" cy="' + y + '" r="7" fill="' + (m.color || col) + '"/>'; if (m.label) { s += '<text x="' + xm + '" y="' + (y - 16) + '" text-anchor="middle" font-size="14" font-weight="800" fill="' + (m.color || col) + '">' + esc(m.label) + '</text>'; } });
      }
      return frame(W, H, s);
    }

    function grid100(o) {
      o = o || {}; var n = o.shade || 0, col = o.color || '#1FA67A', c = 21, pad = 6, W = 2 * pad + 10 * c, H = W;
      var s = '';
      for (var i = 0; i < 100; i++) { var r = Math.floor(i / 10), cc = i % 10; s += '<rect x="' + (pad + cc * c) + '" y="' + (pad + r * c) + '" width="' + c + '" height="' + c + '" fill="' + (i < n ? col : '#fff') + '" stroke="#8a8a98" stroke-width="1"/>'; }
      return frame(W, H, s);
    }

    function fractionbar(num, den, o) {
      o = o || {}; var col = o.color || '#E0724C', W = 360, H = 56, pad = 4, w = (W - 2 * pad) / den, s = '';
      for (var i = 0; i < den; i++) { s += '<rect x="' + (pad + i * w) + '" y="' + pad + '" width="' + w + '" height="' + (H - 2 * pad) + '" fill="' + (i < num ? col : '#fff') + '" stroke="#2b2b3a" stroke-width="1.6"/>'; }
      return frame(W, H, s);
    }
    function fractionbars(list, o) {
      o = o || {}; var col = o.color || '#E0724C', W = 360, rowH = 58, s = '', y = 0;
      list.forEach(function (f) { var pad = 4, w = (W - 2 * pad) / f.den; for (var i = 0; i < f.den; i++) { s += '<rect x="' + (pad + i * w) + '" y="' + (y + pad) + '" width="' + w + '" height="' + (rowH - 2 * pad - 16) + '" fill="' + (i < f.num ? col : '#fff') + '" stroke="#2b2b3a" stroke-width="1.5"/>'; } s += '<text x="' + (W / 2) + '" y="' + (y + rowH - 3) + '" text-anchor="middle" font-size="14" font-weight="700">' + (f.label || (f.num + '/' + f.den)) + '</text>'; y += rowH; });
      return frame(W, y, s);
    }

    function fractioncircle(num, den, o) {
      o = o || {}; var col = o.color || '#E0724C', cx = 75, cy = 75, r = 62, s = '';
      if (den === 1) { s += '<circle cx="75" cy="75" r="62" fill="' + (num >= 1 ? col : '#fff') + '" stroke="#2b2b3a" stroke-width="1.8"/>'; return frame(150, 150, s); }
      for (var i = 0; i < den; i++) { var a0 = -90 + i * 360 / den, a1 = -90 + (i + 1) * 360 / den, large = (a1 - a0) > 180 ? 1 : 0, p0 = pt(cx, cy, r, a0), p1 = pt(cx, cy, r, a1); s += '<path d="M75,75 L' + p0[0] + ',' + p0[1] + ' A62,62 0 ' + large + ' 1 ' + p1[0] + ',' + p1[1] + ' Z" fill="' + (i < num ? col : '#fff') + '" stroke="#2b2b3a" stroke-width="1.6"/>'; }
      return frame(150, 150, s);
    }

    function coordgrid(o) {
      o = o || {}; var max = o.max || 6, col = o.color || '#1668C4', pad = 26, unit = 34, W = 2 * pad + max * unit, H = W, ox = pad, oy = H - pad, s = '';
      for (var i = 0; i <= max; i++) { s += '<line x1="' + (ox + i * unit) + '" y1="' + pad + '" x2="' + (ox + i * unit) + '" y2="' + oy + '" stroke="#e2e2ee" stroke-width="1"/>'; s += '<line x1="' + ox + '" y1="' + (oy - i * unit) + '" x2="' + (W - pad) + '" y2="' + (oy - i * unit) + '" stroke="#e2e2ee" stroke-width="1"/>'; }
      s += '<line x1="' + ox + '" y1="' + oy + '" x2="' + (W - pad + 8) + '" y2="' + oy + '" stroke="#2b2b3a" stroke-width="2"/>';
      s += '<line x1="' + ox + '" y1="' + oy + '" x2="' + ox + '" y2="' + (pad - 8) + '" stroke="#2b2b3a" stroke-width="2"/>';
      s += '<text x="' + (W - pad + 6) + '" y="' + (oy + 16) + '" font-size="12" font-weight="700">x</text>';
      s += '<text x="' + (ox - 14) + '" y="' + (pad - 6) + '" font-size="12" font-weight="700">y</text>';
      for (i = 1; i <= max; i++) { s += '<text x="' + (ox + i * unit) + '" y="' + (oy + 16) + '" text-anchor="middle" font-size="11">' + i + '</text>'; s += '<text x="' + (ox - 12) + '" y="' + (oy - i * unit + 4) + '" text-anchor="middle" font-size="11">' + i + '</text>'; }
      (o.points || []).forEach(function (p) { var px = ox + p.x * unit, py = oy - p.y * unit; s += '<circle cx="' + px + '" cy="' + py + '" r="5.5" fill="' + col + '"/>'; if (p.label) { s += '<text x="' + (px + 8) + '" y="' + (py - 8) + '" font-size="13" font-weight="800" fill="' + col + '">' + esc(p.label) + '</text>'; } });
      return frame(W, H, s);
    }

    function triangle(o) {
      o = o || {}; var col = o.color || '#C0392B', W = 320, H = 200, Ax = 45, Ay = 160, Bx = 265, By = 160;
      var apexX = o.shape === 'stumpf' ? 300 : (o.shape === 'recht' ? 45 : 160), apexY = 42;
      var s = '<polygon points="' + Ax + ',' + Ay + ' ' + Bx + ',' + By + ' ' + apexX + ',' + apexY + '" fill="' + col + '22" stroke="#2b2b3a" stroke-width="2.2"/>';
      if (o.height !== false) {
        var footX = Math.max(Ax, Math.min(Bx, apexX));
        s += '<line x1="' + apexX + '" y1="' + apexY + '" x2="' + footX + '" y2="' + Ay + '" stroke="' + col + '" stroke-width="1.8" stroke-dasharray="6 4"/>';
        s += '<rect x="' + (footX - 10) + '" y="' + (Ay - 10) + '" width="10" height="10" fill="none" stroke="' + col + '" stroke-width="1.3"/>';
        s += '<text x="' + (footX + 7) + '" y="' + ((apexY + Ay) / 2) + '" font-size="15" font-weight="800" fill="' + col + '">h' + (o.heightLabel ? (' = ' + esc(o.heightLabel)) : '') + '</text>';
      }
      s += '<text x="' + ((Ax + Bx) / 2) + '" y="' + (Ay + 22) + '" text-anchor="middle" font-size="15" font-weight="800">g' + (o.baseLabel ? (' = ' + esc(o.baseLabel)) : '') + '</text>';
      return frame(W, H, s);
    }

    function parallelogram(o) {
      o = o || {}; var col = o.color || '#1668C4', W = 340, H = 190, s = '';
      var p = '80,150 300,150 260,50 40,50';
      s += '<polygon points="' + p + '" fill="' + col + '22" stroke="#2b2b3a" stroke-width="2.2"/>';
      s += '<line x1="80" y1="150" x2="80" y2="50" stroke="' + col + '" stroke-width="1.8" stroke-dasharray="6 4"/>';
      s += '<rect x="80" y="140" width="10" height="10" fill="none" stroke="' + col + '" stroke-width="1.3"/>';
      s += '<text x="190" y="172" text-anchor="middle" font-size="15" font-weight="800">g' + (o.baseLabel ? (' = ' + esc(o.baseLabel)) : '') + '</text>';
      s += '<text x="60" y="105" font-size="15" font-weight="800" fill="' + col + '">h' + (o.heightLabel ? (' = ' + esc(o.heightLabel)) : '') + '</text>';
      return frame(W, H, s);
    }
    function trapez(o) {
      o = o || {}; var col = o.color || '#1668C4', W = 340, H = 190, s = '';
      s += '<polygon points="40,150 300,150 240,50 110,50" fill="' + col + '22" stroke="#2b2b3a" stroke-width="2.2"/>';
      s += '<line x1="110" y1="150" x2="110" y2="50" stroke="' + col + '" stroke-width="1.8" stroke-dasharray="6 4"/>';
      s += '<rect x="110" y="140" width="10" height="10" fill="none" stroke="' + col + '" stroke-width="1.3"/>';
      s += '<text x="170" y="172" text-anchor="middle" font-size="14" font-weight="800">a' + (o.aLabel ? (' = ' + esc(o.aLabel)) : '') + '</text>';
      s += '<text x="175" y="44" text-anchor="middle" font-size="14" font-weight="800">c' + (o.cLabel ? (' = ' + esc(o.cLabel)) : '') + '</text>';
      s += '<text x="90" y="105" font-size="14" font-weight="800" fill="' + col + '">h' + (o.hLabel ? (' = ' + esc(o.hLabel)) : '') + '</text>';
      return frame(W, H, s);
    }
    function circleShape(o) {
      o = o || {}; var col = o.color || '#1668C4', cx = 110, cy = 100, r = 78, s = '';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + col + '18" stroke="#2b2b3a" stroke-width="2.2"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="#2b2b3a"/>';
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + r) + '" y2="' + cy + '" stroke="' + col + '" stroke-width="2"/>';
      s += '<text x="' + (cx + r / 2) + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="14" font-weight="800" fill="' + col + '">r' + (o.rLabel ? (' = ' + esc(o.rLabel)) : '') + '</text>';
      return frame(220, 200, s);
    }

    function angle(o) {
      o = o || {}; var deg = o.deg || 50, col = o.color || '#C0392B', vx = 40, vy = 165, len = 210, s = '';
      var p1 = [vx + len, vy], p2 = pt(vx, vy, len, -deg);
      s += '<line x1="' + vx + '" y1="' + vy + '" x2="' + p1[0] + '" y2="' + p1[1] + '" stroke="#2b2b3a" stroke-width="2.4"/>';
      s += '<line x1="' + vx + '" y1="' + vy + '" x2="' + p2[0] + '" y2="' + p2[1] + '" stroke="#2b2b3a" stroke-width="2.4"/>';
      var a0 = pt(vx, vy, 46, 0), a1 = pt(vx, vy, 46, -deg);
      s += '<path d="M' + a0[0] + ',' + a0[1] + ' A46,46 0 0 0 ' + a1[0] + ',' + a1[1] + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
      var lab = pt(vx, vy, 66, -deg / 2);
      s += '<text x="' + lab[0] + '" y="' + lab[1] + '" font-size="15" font-weight="800" fill="' + col + '">' + (o.label || (deg + '°')) + '</text>';
      s += '<circle cx="' + vx + '" cy="' + vy + '" r="3.5" fill="#2b2b3a"/>';
      return frame(280, 190, s);
    }

    function digits(o) {
      o = o || {}; var num = String(o.number == null ? '240' : o.number), col = o.color || '#6C4CE0', bw = 40, W = 30 + num.length * bw, H = 92, s = '';
      for (var i = 0; i < num.length; i++) { var last = (i === num.length - 1 && o.markLast !== false), x = 20 + i * bw; s += '<rect x="' + x + '" y="18" width="' + (bw - 6) + '" height="48" rx="6" fill="' + (last ? col : '#eeeafc') + '" stroke="#2b2b3a" stroke-width="' + (last ? 2.6 : 1) + '"/>'; s += '<text x="' + (x + (bw - 6) / 2) + '" y="52" text-anchor="middle" font-size="27" font-weight="800" fill="' + (last ? '#fff' : '#2b2b3a') + '">' + num[i] + '</text>'; }
      if (o.markLast !== false) { var lx = 20 + (num.length - 1) * bw + (bw - 6) / 2; s += '<text x="' + lx + '" y="84" text-anchor="middle" font-size="12" font-weight="800" fill="' + col + '">Endziffer</text>'; }
      return frame(W, H, s);
    }
    function quersumme(o) {
      o = o || {}; var num = String(o.number == null ? '4572' : o.number), col = o.color || '#6C4CE0', s = '', x = 20, sum = 0;
      for (var i = 0; i < num.length; i++) { sum += +num[i]; s += '<text x="' + x + '" y="46" font-size="26" font-weight="800">' + num[i] + '</text>'; x += 26; if (i < num.length - 1) { s += '<text x="' + x + '" y="46" font-size="22" fill="' + col + '">+</text>'; x += 22; } }
      s += '<text x="' + x + '" y="46" font-size="24">=</text>'; x += 26;
      s += '<text x="' + x + '" y="46" font-size="26" font-weight="800" fill="' + col + '">' + sum + '</text>';
      s += '<text x="20" y="74" font-size="12" font-weight="700" fill="' + col + '">Quersumme = ' + sum + '</text>';
      return frame(x + 50, 92, s);
    }

    var TYPES = {
      numberline: numberline, grid100: grid100, fractionbar: function (o) { return fractionbar(o.num, o.den, o); },
      fractionbars: function (o) { return fractionbars(o.list, o); }, fractioncircle: function (o) { return fractioncircle(o.num, o.den, o); },
      coordgrid: coordgrid, triangle: triangle, parallelogram: parallelogram, trapez: trapez, circle: circleShape, angle: angle,
      digits: digits, quersumme: quersumme
    };
    function render(v, color) {
      if (!v || !v.type || !TYPES[v.type]) return '';
      var o = {}; for (var k in v) { o[k] = v[k]; } if (color && !o.color) o.color = color;
      try { return TYPES[v.type](o); } catch (e) { return ''; }
    }
    return { render: render };
  })();

  /* ---------- Zustand ---------- */
  var state = { view: 'home', mid: null, nr: null, printSol: false };
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

  /* ---------- Landing ---------- */
  function homeHtml() {
    var meta = DATA.meta || {};
    var h = '<div class="mth-wrap">';
    h += '<div class="mth-hero"><div class="mth-hero-badge">📐 Lehrplan</div><h1>' + esc(meta.titel || 'Mathematik') + '</h1>' +
      '<div class="mth-hero-sub">' + esc(meta.klasse || '') + '</div><div class="mth-hero-facts">' +
      (meta.rahmen ? '<span>🗓️ ' + esc(meta.rahmen) + '</span>' : '') + (meta.sprache ? '<span>🗣️ ' + esc(meta.sprache) + '</span>' : '') +
      (meta.quelle ? '<span>📘 ' + esc(meta.quelle) + '</span>' : '') + '</div></div>';
    if (DATA.hinweis && DATA.hinweis.length) {
      h += '<div class="mth-note"><div class="mth-note-t">So arbeitest du mit diesem Programm</div><ul>' + DATA.hinweis.map(function (p) { return '<li>' + rich(p) + '</li>'; }).join('') + '</ul>';
      if (DATA.legende) { h += '<div class="mth-legend">' + ['basis', 'kern', 'plus'].map(function (k) { var L = DATA.legende[k]; if (!L) return ''; return '<span class="mth-lg mth-lg-' + k + '">' + esc(L.icon) + ' <b>' + esc(L.label) + '</b> — ' + esc(L.hint) + '</span>'; }).join('') + '</div>'; }
      h += '</div>';
    }
    h += '<div class="mth-pdf"><div class="mth-pdf-ic">📄</div><div class="mth-pdf-x"><div class="mth-pdf-t">Offizieller Lehrplan (PDF)</div><div class="mth-pdf-s">' + esc(meta.quelle || '') + '</div></div><div class="mth-pdf-b"><button class="mth-btn mth-btn-p" data-mth="pdf-view">Ansehen</button><button class="mth-btn" data-mth="pdf-dl">Herunterladen</button></div></div>';
    h += '<h2 class="mth-h2">Das Schuljahr in 3 Modulen</h2><div class="mth-modules">';
    MODULES.forEach(function (m) {
      var pr = moduleProgress(m), pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
      var themes = (m.themen || []).map(function (t) { return '<span class="mth-chip">' + esc(t.icon || '') + ' ' + esc(t.titel) + '</span>'; }).join('');
      h += '<button class="mth-mcard" data-mth="module" data-id="' + esc(m.id) + '" style="--mc:' + esc(m.farbe || '#6C4CE0') + ';--mc2:' + esc(m.farbe2 || m.farbe || '#9B7BFF') + '"><div class="mth-mcard-top"><span class="mth-mnr">Modul ' + esc(m.nr) + '</span><span class="mth-mico">' + esc(m.icon || '📐') + '</span></div><div class="mth-mtitle">' + esc(m.titel) + '</div><div class="mth-munter">' + esc(m.unter || '') + '</div><div class="mth-chips">' + themes + '</div><div class="mth-mprog"><div class="mth-mbar"><i style="width:' + pct + '%"></i></div><span>' + pr.done + '/' + pr.total + ' Lektionen</span></div></button>';
    });
    h += '</div><div class="mth-footnote">' + esc(meta.module || '') + '</div></div>';
    return h;
  }

  /* ---------- Modul ---------- */
  function moduleHtml(mid) {
    var m = findModule(mid); if (!m) return homeHtml();
    var pr = moduleProgress(m), pct = pr.total ? Math.round(pr.done / pr.total * 100) : 0;
    var h = '<div class="mth-wrap" style="--mc:' + esc(m.farbe || '#6C4CE0') + ';--mc2:' + esc(m.farbe2 || m.farbe || '#9B7BFF') + '">';
    h += '<button class="mth-back" data-mth="home">← Jahresübersicht</button>';
    h += '<div class="mth-modhead"><div class="mth-modhead-ic">' + esc(m.icon || '📐') + '</div><div class="mth-modhead-x"><div class="mth-modhead-nr">Modul ' + esc(m.nr) + '</div><h1>' + esc(m.titel) + '</h1><p>' + esc(m.ziel || m.unter || '') + '</p><div class="mth-mprog mth-mprog-lg"><div class="mth-mbar"><i style="width:' + pct + '%"></i></div><span>' + pr.done + '/' + pr.total + ' erledigt</span></div></div></div>';
    (m.themen || []).forEach(function (t) {
      h += '<div class="mth-theme" style="--tc:' + esc(t.farbe || m.farbe || '#6C4CE0') + '"><div class="mth-theme-head"><span class="mth-theme-ic">' + esc(t.icon || '') + '</span><div><div class="mth-theme-t">' + esc(t.titel) + '</div>' + ((t.ziele && t.ziele.length) ? '<div class="mth-theme-z">' + t.ziele.map(esc).join(' · ') + '</div>' : '') + '</div></div><div class="mth-lrows">';
      (t.lektionen || []).forEach(function (l) {
        var done = isDone(m.id, l.nr);
        h += '<button class="mth-lrow' + (done ? ' is-done' : '') + '" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(l.nr) + '"><span class="mth-lrow-nr">' + esc(l.nr) + '</span><span class="mth-lrow-x"><span class="mth-lrow-t">' + rich(l.titel) + '</span><span class="mth-lrow-goal">🎯 ' + rich(l.lernziel || '') + '</span></span>' + (l.dauer ? '<span class="mth-lrow-d">' + esc(l.dauer) + '</span>' : '') + '<span class="mth-lrow-chk">' + (done ? '✓' : '') + '</span></button>';
      });
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ---------- Lektion (Lehreransicht) ---------- */
  function lessonHtml(mid, nr) {
    var m = findModule(mid); if (!m) return homeHtml();
    var fl = flatLessons(m), idx = -1;
    for (var i = 0; i < fl.length; i++) { if (String(fl[i].lek.nr) === String(nr)) { idx = i; break; } }
    if (idx < 0) return moduleHtml(mid);
    var lek = fl[idx].lek, theme = fl[idx].theme, done = isDone(m.id, lek.nr), acc = m.farbe || '#6C4CE0';

    var h = '<div class="mth-wrap mth-lesson" style="--mc:' + esc(acc) + ';--mc2:' + esc(m.farbe2 || acc) + ';--tc:' + esc(theme.farbe || acc) + '">';
    h += '<div class="mth-lbar"><button class="mth-back" data-mth="module" data-id="' + esc(m.id) + '">← Modul ' + esc(m.nr) + '</button><div class="mth-lbar-b">' +
      '<button class="mth-btn mth-btn-p" data-mth="print-info" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '">📘 Infoblatt drucken</button>' +
      '<button class="mth-btn mth-ab" data-mth="print-ab" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-lvl="basis">🟢 Arbeitsblatt</button>' +
      '<button class="mth-btn mth-ab" data-mth="print-ab" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-lvl="kern">🟡 Arbeitsblatt</button>' +
      '<button class="mth-btn mth-ab" data-mth="print-ab" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-lvl="plus">🔵 Arbeitsblatt</button>' +
      '<button class="mth-btn mth-solprint' + (state.printSol ? ' on' : '') + '" data-mth="solprint" title="Lösungen mit aufs Blatt drucken">' + (state.printSol ? '✓ mit Lösungen' : 'Lösungsblatt') + '</button>' +
      '<button class="mth-btn mth-donebtn' + (done ? ' on' : '') + '" data-mth="done" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '">' + (done ? '✓ Erledigt' : 'Erledigt') + '</button>' +
      '</div></div>';
    h += '<div class="mth-crumb">' + esc(theme.icon || '') + ' ' + esc(theme.titel) + ' · Lektion ' + esc(lek.nr) + '</div>';
    h += '<h1 class="mth-ltitle">' + rich(lek.titel) + '</h1>';
    h += '<div class="mth-goal">🎯 <b>Lernziel:</b> ' + rich(lek.lernziel || '') + '</div>';

    var meta = [];
    if (lek.dauer) meta.push('<span class="mth-meta-i">⏱️ ' + esc(lek.dauer) + '</span>');
    if (lek.material && lek.material.length) meta.push('<span class="mth-meta-i">🎒 ' + lek.material.map(esc).join(', ') + '</span>');
    if (meta.length) h += '<div class="mth-meta">' + meta.join('') + '</div>';
    if (lek.wortschatz && lek.wortschatz.length) { h += '<div class="mth-voc-wrap"><span class="mth-voc-lbl">Wortschatz</span>' + lek.wortschatz.map(function (w) { return '<span class="mth-voc"><b>' + esc(w.de) + '</b><i>' + esc(w.fr) + '</i></span>'; }).join('') + '</div>'; }

    if (lek.einstieg) h += '<div class="mth-sec mth-sec-start"><div class="mth-sec-h">💡 Einstieg' + (lek.einstieg.titel ? ' — ' + esc(lek.einstieg.titel) : '') + '</div><p>' + rich(lek.einstieg.text) + '</p></div>';

    if (lek.visual) { var vh = VIS.render(lek.visual, acc); if (vh) h += '<div class="mth-visual"><div class="mth-visual-in">' + vh + '</div>' + (lek.visual.caption ? '<div class="mth-visual-cap">' + rich(lek.visual.caption) + '</div>' : '') + '</div>'; }

    if (lek.erklaerung && lek.erklaerung.length) {
      h += '<div class="mth-sec"><div class="mth-sec-h">📖 Erklärung — Schritt für Schritt</div><div class="mth-steps">';
      lek.erklaerung.forEach(function (s, i) { h += '<div class="mth-step"><div class="mth-step-n">' + (i + 1) + '</div><div class="mth-step-x">' + (s.titel ? '<div class="mth-step-t">' + rich(s.titel) + '</div>' : '') + '<div class="mth-step-txt">' + rich(s.text) + '</div>' + (s.beispiel ? '<div class="mth-ex"><span>Beispiel</span> ' + rich(s.beispiel) + '</div>' : '') + '</div></div>'; });
      h += '</div></div>';
    }

    if (lek.merksatz) h += '<div class="mth-merk"><div class="mth-merk-ic">📌</div><div><div class="mth-merk-t">Merksatz</div>' + rich(lek.merksatz) + '</div></div>';

    if (lek.musterl) {
      h += '<div class="mth-sec"><div class="mth-sec-h">✅ So rechnest du — Musteraufgabe</div><div class="mth-muster"><div class="mth-muster-q">' + rich(lek.musterl.a) + '</div><ol class="mth-muster-s">' + (lek.musterl.schritte || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' + (lek.musterl.erg ? '<div class="mth-muster-e">➜ ' + rich(lek.musterl.erg) + '</div>' : '') + '</div></div>';
    }

    if (lek.gemeinsam && lek.gemeinsam.length) { h += '<div class="mth-sec"><div class="mth-sec-h">🤝 Gemeinsam an der Tafel</div><ol class="mth-tasks">' + lek.gemeinsam.map(function (g) { return '<li><div class="mth-task-q">' + rich(g.a) + '</div>' + solBtn(g.l) + '</li>'; }).join('') + '</ol></div>'; }

    if (lek.aufgaben) { h += '<div class="mth-sec"><div class="mth-sec-h">✏️ Aufgaben — drei Niveaus</div><div class="mth-levels">' + levelHtml('basis', lek.aufgaben.basis) + levelHtml('kern', lek.aufgaben.kern) + levelHtml('plus', lek.aufgaben.plus) + '</div></div>'; }

    if (lek.exit) h += '<div class="mth-exit"><div class="mth-exit-t">🎫 Exit-Ticket</div>' + rich(lek.exit) + '</div>';
    if (lek.foerdertipp) h += '<div class="mth-tip"><div class="mth-tip-t">🧩 Förder-Tipp (für dich)</div>' + rich(lek.foerdertipp) + '</div>';
    if (lek.spiel) h += '<div class="mth-spiel"><div class="mth-spiel-t">🎲 Spiel / Aktivität</div>' + rich(lek.spiel) + '</div>';

    h += '<div class="mth-nav">';
    h += (idx > 0) ? '<button class="mth-btn" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(fl[idx - 1].lek.nr) + '">← Lektion ' + esc(fl[idx - 1].lek.nr) + '</button>' : '<span></span>';
    h += (idx < fl.length - 1) ? '<button class="mth-btn mth-btn-p" data-mth="lesson" data-mid="' + esc(m.id) + '" data-nr="' + esc(fl[idx + 1].lek.nr) + '">Lektion ' + esc(fl[idx + 1].lek.nr) + ' →</button>' : '<button class="mth-btn mth-btn-p" data-mth="module" data-id="' + esc(m.id) + '">Modul abschließen ✓</button>';
    h += '</div></div>';
    return h;
  }

  function levelHtml(key, lvl) {
    if (!lvl || !lvl.items || !lvl.items.length) return '';
    var L = (DATA.legende && DATA.legende[key]) || { icon: '', label: key, hint: '' };
    var h = '<div class="mth-level mth-level-' + key + '"><div class="mth-level-h">' + esc(L.icon) + ' <b>' + esc(L.label) + '</b><span>' + esc(L.hint) + '</span></div>';
    if (lvl.hinweis) h += '<div class="mth-level-hint">' + rich(lvl.hinweis) + '</div>';
    h += '<ol class="mth-tasks">' + lvl.items.map(function (it) { return '<li><div class="mth-task-q">' + rich(it.a) + '</div>' + solBtn(it.l) + '</li>'; }).join('') + '</ol></div>';
    return h;
  }
  function solBtn(l) { if (l == null || l === '') return ''; return '<button class="mth-solbtn" data-mth="sol">Lösung</button><div class="mth-sol">' + rich(l) + '</div>'; }

  /* ============================================================
     DRUCK — schülergerechte Infoblätter und Arbeitsblätter
     ============================================================ */
  function printCss(acc) {
    return 'body{font-family:Inter,Arial,sans-serif;color:#161425;margin:0;padding:0;line-height:1.5}' +
      '.pg{max-width:760px;margin:0 auto;padding:26px 30px 40px}' +
      '.mfrac{display:inline-flex;flex-direction:column;text-align:center;vertical-align:middle;margin:0 3px;line-height:1.02;font-weight:700}' +
      '.mfrac .mnum{border-bottom:2px solid currentColor;padding:0 4px 1px}.mfrac .mden{padding:1px 4px 0}' +
      '.mth-svg{display:block;max-width:100%;height:auto}' +
      '.hd{background:' + acc + ';color:#fff;border-radius:14px;padding:16px 22px;margin-bottom:14px}' +
      '.hd .k{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;opacity:.9}' +
      '.hd h1{margin:3px 0 0;font-size:23px;font-weight:900;line-height:1.12}' +
      '.goal{background:' + acc + '14;border-left:5px solid ' + acc + ';border-radius:8px;padding:9px 14px;margin:0 0 14px;font-size:15px}' +
      '.name{display:flex;gap:30px;font-size:14px;color:#333;border:1.5px solid #cfcfe0;border-radius:9px;padding:10px 14px;margin:0 0 16px}' +
      '.name b{color:#161425}' +
      '.sec{margin:16px 0}.sec-h{font-size:15px;font-weight:900;color:' + acc + ';margin:0 0 8px;padding-bottom:4px;border-bottom:2px solid ' + acc + '30}' +
      '.fig{text-align:center;margin:12px auto;padding:10px;border:1px solid #e6e6f0;border-radius:12px;background:#fbfbfe;max-width:560px}' +
      '.fig .cap{font-size:13px;color:#555;margin-top:6px}' +
      '.step{display:flex;gap:12px;margin:9px 0;padding:11px 14px;border:1px solid #e9e9f2;border-radius:11px;break-inside:avoid}' +
      '.step .n{flex:0 0 26px;height:26px;border-radius:50%;background:' + acc + ';color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center}' +
      '.step .t{font-weight:800;margin-bottom:2px}.step .ex{margin-top:7px;background:' + acc + '0f;border-left:3px solid ' + acc + ';border-radius:7px;padding:7px 11px;font-size:14px}' +
      '.step .ex b{color:' + acc + '}' +
      '.merk{border:2px dashed #e0b83c;background:#fffdf3;border-radius:12px;padding:13px 18px;margin:16px 0;break-inside:avoid}' +
      '.merk .l{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#9a6b12;margin-bottom:3px}' +
      '.merk .x{font-size:15px;font-weight:600;color:#4a3d13}' +
      '.mus{border:1px solid ' + acc + '40;border-radius:12px;padding:12px 16px;background:' + acc + '08;break-inside:avoid}' +
      '.mus .q{font-weight:800;margin-bottom:6px}.mus ol{margin:0;padding-left:20px}.mus li{margin:4px 0;font-size:14.5px}.mus .e{margin-top:6px;font-weight:800;color:' + acc + '}' +
      '.voc{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.voc span{font-size:13px;border:1px solid #e3e3ef;border-radius:8px;padding:5px 10px}.voc i{color:#888;font-style:normal;margin-left:6px}' +
      'ol.tasks{margin:0;padding-left:24px}ol.tasks>li{margin:0 0 16px;break-inside:avoid}.q{font-weight:600;font-size:15px}' +
      '.hint{font-style:italic;color:#555;font-size:13.5px;margin:0 0 10px}' +
      '.line{border-bottom:1.4px solid #b8b8c8;height:22px;margin:9px 0}' +
      '.sol{color:#1a7a48;font-size:14px;margin-top:5px;font-weight:600}' +
      '.remind{border:1.5px solid ' + acc + '55;background:' + acc + '0c;border-radius:11px;padding:11px 15px;margin:0 0 14px;font-size:14.5px}' +
      '.remind .l{font-weight:900;color:' + acc + ';font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}' +
      '.foot{margin-top:22px;text-align:center;font-size:11px;color:#aaa}' +
      '.tbl{border-collapse:collapse;margin:6px 0}.tbl td,.tbl th{border:1.4px solid #999;padding:8px 12px;min-width:52px;height:26px;text-align:center}' +
      '@media print{.pg{max-width:none;padding:12mm 14mm}.step,.merk,.mus,ol.tasks>li,.fig{break-inside:avoid}}';
  }
  function printDoc(title, acc, bodyHtml) {
    var w = window.open('', '_blank'); if (!w) { alert('Bitte Pop-ups für den Druck erlauben.'); return; }
    w.document.write('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + printCss(acc) + '</style></head><body><div class="pg">' + bodyHtml + '</div></body></html>');
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 350);
  }

  /* Infoblatt (Lernblatt für den Schüler) */
  function printInfo(mid, nr) {
    var m = findModule(mid); if (!m) return; var f = lessonOf(m, nr); if (!f) return;
    var lek = f.lek, theme = f.theme, acc = m.farbe || '#6C4CE0';
    var b = '<div class="hd"><div class="k">Modul ' + esc(m.nr) + ' · ' + esc(theme.titel) + ' · Infoblatt</div><h1>' + rich(lek.titel) + '</h1></div>';
    b += '<div class="goal">🎯 <b>Das lernst du:</b> ' + rich(lek.lernziel || '') + '</div>';
    if (lek.visual) { var vh = VIS.render(lek.visual, acc); if (vh) b += '<div class="fig">' + vh + (lek.visual.caption ? '<div class="cap">' + rich(lek.visual.caption) + '</div>' : '') + '</div>'; }
    if (lek.erklaerung && lek.erklaerung.length) {
      b += '<div class="sec"><div class="sec-h">Das musst du wissen</div>';
      lek.erklaerung.forEach(function (s, i) { b += '<div class="step"><div class="n">' + (i + 1) + '</div><div><div class="t">' + rich(s.titel || '') + '</div><div>' + rich(s.text) + '</div>' + (s.beispiel ? '<div class="ex"><b>Beispiel:</b> ' + rich(s.beispiel) + '</div>' : '') + '</div></div>'; });
      b += '</div>';
    }
    if (lek.merksatz) b += '<div class="merk"><div class="l">📌 Das merke ich mir</div><div class="x">' + rich(lek.merksatz) + '</div></div>';
    if (lek.musterl) b += '<div class="sec"><div class="sec-h">So rechnest du — ein Beispiel</div><div class="mus"><div class="q">' + rich(lek.musterl.a) + '</div><ol>' + (lek.musterl.schritte || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' + (lek.musterl.erg ? '<div class="e">➜ ' + rich(lek.musterl.erg) + '</div>' : '') + '</div></div>';
    if (lek.wortschatz && lek.wortschatz.length) b += '<div class="sec"><div class="sec-h">Wichtige Wörter</div><div class="voc">' + lek.wortschatz.map(function (wv) { return '<span><b>' + esc(wv.de) + '</b><i>' + esc(wv.fr) + '</i></span>'; }).join('') + '</div></div>';
    b += '<div class="foot">Mathe ' + esc((DATA.meta || {}).klasse || '') + ' · Infoblatt · Lektion ' + esc(lek.nr) + '</div>';
    printDoc('Infoblatt – ' + lek.titel, acc, b);
  }

  /* Arbeitsblatt pro Niveau (für den Schüler) */
  function printSheet(mid, nr, level, withSol) {
    var m = findModule(mid); if (!m) return; var f = lessonOf(m, nr); if (!f) return;
    var lek = f.lek, theme = f.theme, acc = m.farbe || '#6C4CE0';
    var L = (DATA.legende && DATA.legende[level]) || { icon: '', label: level };
    var lvl = (lek.aufgaben || {})[level] || { items: [] };
    var b = '<div class="hd"><div class="k">Modul ' + esc(m.nr) + ' · ' + esc(theme.titel) + ' · Arbeitsblatt ' + esc(L.icon) + ' ' + esc(L.label) + '</div><h1>' + rich(lek.titel) + '</h1></div>';
    b += '<div class="name"><span><b>Name:</b> ______________________</span><span><b>Datum:</b> ______________</span></div>';
    if (lek.merksatz) b += '<div class="remind"><div class="l">Denk dran</div>' + rich(lek.merksatz) + '</div>';
    if (lek.visual && lek.visual.tool !== false) { var vh = VIS.render(lek.visual, acc); if (vh) b += '<div class="fig">' + vh + (lek.visual.caption ? '<div class="cap">' + rich(lek.visual.caption) + '</div>' : '') + '</div>'; }
    if (lek.musterl) b += '<div class="mus" style="margin-bottom:14px"><div class="q">✅ So geht\'s: ' + rich(lek.musterl.a) + '</div><ol>' + (lek.musterl.schritte || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' + (lek.musterl.erg ? '<div class="e">➜ ' + rich(lek.musterl.erg) + '</div>' : '') + '</div>';
    b += '<div class="sec-h">Deine Aufgaben</div>';
    if (lvl.hinweis) b += '<div class="hint">' + rich(lvl.hinweis) + '</div>';
    b += '<ol class="tasks">';
    (lvl.items || []).forEach(function (it) {
      b += '<li><div class="q">' + rich(it.a) + '</div>';
      if (it.tbl) { b += tblHtml(it.tbl); }
      if (withSol) { b += '<div class="sol">Lösung: ' + rich(it.l) + '</div>'; }
      else { var rows = it.raum || (it.tbl ? 0 : 2); for (var r = 0; r < rows; r++) b += '<div class="line"></div>'; }
      b += '</li>';
    });
    b += '</ol>';
    b += '<div class="foot">Mathe ' + esc((DATA.meta || {}).klasse || '') + ' · Arbeitsblatt ' + esc(L.label) + ' · Lektion ' + esc(lek.nr) + (withSol ? ' · Lösungsblatt' : '') + '</div>';
    printDoc('Arbeitsblatt ' + L.label + ' – ' + lek.titel, acc, b);
  }
  function tblHtml(t) {
    var cols = t.cols || [], rows = t.rows || 3, s = '<table class="tbl"><thead><tr>';
    cols.forEach(function (c) { s += '<th>' + rich(c) + '</th>'; }); s += '</tr></thead><tbody>';
    for (var r = 0; r < rows; r++) { s += '<tr>'; cols.forEach(function () { s += '<td></td>'; }); s += '</tr>'; }
    return s + '</tbody></table>';
  }

  /* ---------- PDF ---------- */
  function pdfBlobUrl() {
    var node = document.getElementById('kb-mathe-pdf-b64'); var b64 = node ? node.textContent.trim() : ''; if (!b64) return null;
    try { var bin = atob(b64), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); } catch (e) { return null; }
  }
  function viewPdf() { var u = pdfBlobUrl(); if (u) window.open(u, '_blank'); else alert('PDF nicht eingebettet.'); }
  function dlPdf() { var u = pdfBlobUrl(); if (!u) { alert('PDF nicht eingebettet.'); return; } var a = document.createElement('a'); a.href = u; a.download = 'Lehrplan_Mathe_5PF.pdf'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }

  /* ---------- Klicks ---------- */
  function onClick(e) {
    var t = e.target.closest && e.target.closest('[data-mth]'); if (!t) return;
    var a = t.getAttribute('data-mth');
    if (a === 'sol') { var box = t.nextElementSibling; if (box && box.classList.contains('mth-sol')) { box.classList.toggle('open'); t.classList.toggle('on'); } return; }
    if (a === 'solprint') { state.printSol = !state.printSol; t.classList.toggle('on', state.printSol); t.textContent = state.printSol ? '✓ mit Lösungen' : 'Lösungsblatt'; return; }
    e.preventDefault();
    if (a === 'home') { state.view = 'home'; render(); }
    else if (a === 'module') { state.view = 'module'; state.mid = t.getAttribute('data-id'); render(); }
    else if (a === 'lesson') { state.view = 'lesson'; state.mid = t.getAttribute('data-mid'); state.nr = t.getAttribute('data-nr'); render(); }
    else if (a === 'done') { var k = lkey(t.getAttribute('data-mid'), t.getAttribute('data-nr')); if (DONE[k]) delete DONE[k]; else DONE[k] = true; saveDone(); render(); }
    else if (a === 'print-info') { printInfo(t.getAttribute('data-mid'), t.getAttribute('data-nr')); }
    else if (a === 'print-ab') { printSheet(t.getAttribute('data-mid'), t.getAttribute('data-nr'), t.getAttribute('data-lvl'), state.printSol); }
    else if (a === 'pdf-view') { viewPdf(); }
    else if (a === 'pdf-dl') { dlPdf(); }
  }
  function init() { var el = host(); if (el && !el.getAttribute('data-wired')) { el.setAttribute('data-wired', '1'); el.addEventListener('click', onClick); } }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

  return {
    open: open, render: render, data: function () { return DATA; }, vis: VIS,
    printInfo: printInfo, printSheet: printSheet,
    syncExport: function () { return { done: DONE }; },
    syncApply: function (obj) { if (obj && obj.done) { DONE = obj.done; try { localStorage.setItem(LS_DONE, JSON.stringify(DONE)); } catch (e) {} if (host()) render(); } }
  };
})();
