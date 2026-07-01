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
  function musterlList(lek) { if (!lek.musterl) return []; return Array.isArray(lek.musterl) ? lek.musterl : [lek.musterl]; }

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

    function rechteck(o) {
      o = o || {}; var col = o.color || '#1668C4', W = 340, H = 210, x = 78, y = 34, rw = 208, rh = 128;
      var bx = x - 20, by = y + rh / 2;
      var s = '<rect x="' + x + '" y="' + y + '" width="' + rw + '" height="' + rh + '" fill="' + col + '18" stroke="#2b2b3a" stroke-width="2.2"/>';
      s += '<text x="' + (x + rw / 2) + '" y="' + (y + rh + 27) + '" text-anchor="middle" font-size="15" font-weight="800">L' + (o.lLabel ? ' = ' + esc(o.lLabel) : '') + '</text>';
      s += '<text x="' + bx + '" y="' + by + '" text-anchor="middle" font-size="15" font-weight="800" fill="' + col + '" transform="rotate(-90 ' + bx + ' ' + by + ')">B' + (o.bLabel ? ' = ' + esc(o.bLabel) : '') + '</text>';
      return frame(W, H, s);
    }
    function balken(o) {
      o = o || {}; var col = o.color || '#1668C4', data = o.data || [{ l: 'A', v: 3 }, { l: 'B', v: 5 }, { l: 'C', v: 2 }], W = 340, H = 210, bw = 42, gap = 26, x0 = 44, base = 165, maxv = 1;
      data.forEach(function (d) { if (d.v > maxv) maxv = d.v; }); var scale = 120 / maxv, s = '<line x1="30" y1="' + base + '" x2="' + (W - 10) + '" y2="' + base + '" stroke="#2b2b3a" stroke-width="1.5"/>', x = x0;
      data.forEach(function (d) { var bh = d.v * scale; s += '<rect x="' + x + '" y="' + (base - bh) + '" width="' + bw + '" height="' + bh + '" fill="' + col + '" stroke="#2b2b3a" stroke-width="1"/>'; s += '<text x="' + (x + bw / 2) + '" y="' + (base - bh - 6) + '" text-anchor="middle" font-size="13" font-weight="800">' + d.v + '</text>'; s += '<text x="' + (x + bw / 2) + '" y="' + (base + 17) + '" text-anchor="middle" font-size="12">' + esc(d.l) + '</text>'; x += bw + gap; });
      return frame(W, H, s);
    }
    var TYPES = {
      numberline: numberline, grid100: grid100, fractionbar: function (o) { return fractionbar(o.num, o.den, o); },
      fractionbars: function (o) { return fractionbars(o.list, o); }, fractioncircle: function (o) { return fractioncircle(o.num, o.den, o); },
      coordgrid: coordgrid, triangle: triangle, parallelogram: parallelogram, trapez: trapez, circle: circleShape, angle: angle,
      rechteck: rechteck, balken: balken, digits: digits, quersumme: quersumme
    };
    function render(v, color) {
      if (!v || !v.type || !TYPES[v.type]) return '';
      var o = {}; for (var k in v) { o[k] = v[k]; } if (color && !o.color) o.color = color;
      try { return TYPES[v.type](o); } catch (e) { return ''; }
    }
    return { render: render };
  })();

  /* ============================================================
     GEN — Aufgaben-Generatoren. Erzeugen beliebig viele, frisch
     gewürfelte Übungen mit Lösung. make(spec, anzahl, niveau).
     ============================================================ */
  var GEN = (function () {
    function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function de(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }
    function grp(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
    function fr(n, d) { return '[[' + n + '/' + d + ']]'; }
    function red(n, d) { var g = gcd(n, d); return [n / g, d / g]; }
    function qs(N) { return String(N).split('').reduce(function (s, d) { return s + (+d); }, 0); }
    function termStr(list) {
      var s = '', first = true;
      list.forEach(function (t) { var c = t.coef; if (c === 0) return; var sym = t.sym || ''; var ab = Math.abs(c); var disp = (sym === 'x' && ab === 1) ? 'x' : (ab + sym); if (first) { s += (c < 0 ? '−' : '') + disp; first = false; } else { s += (c < 0 ? ' − ' : ' + ') + disp; } });
      return s === '' ? '0' : s;
    }
    var T = {};
    T.teilbar = function (sp, lvl) { var t = pick(sp.teiler || [2, 5, 10]); var N = ri(12, lvl === 'plus' ? 9999 : 999); return { a: 'Ist ' + N + ' durch ' + t + ' teilbar?', l: (N % t === 0 ? 'Ja ✅' : 'Nein ❌') }; };
    T.quersumme = function (sp, lvl) { var N = ri(100, lvl === 'basis' ? 999 : 9999); var by = pick(sp.by || [3, 9]); return { a: 'Quersumme von ' + N + ' = ? Ist ' + N + ' durch ' + by + ' teilbar?', l: 'QS ' + qs(N) + ' → ' + (qs(N) % by === 0 ? 'durch ' + by + ' ✅' : 'nicht durch ' + by + ' ❌') }; };
    T.bruchteil = function (sp, lvl) { var d = pick([2, 3, 4, 5, 6, 8, 10]); var k = ri(1, d - 1); var q = ri(2, lvl === 'basis' ? 9 : 15); var N = d * q; return { a: fr(k, d) + ' von ' + N + ' = ?', l: N + ' ÷ ' + d + ' · ' + k + ' = ' + (N / d * k) }; };
    T.bruchVergleich = function (sp, lvl) { var d = pick([5, 6, 7, 8, 9, 10, 12]); var a = ri(1, d - 1), b = ri(1, d - 1); while (b === a) b = ri(1, d - 1); return { a: 'Setze < oder >:  ' + fr(a, d) + '  ▢  ' + fr(b, d), l: (a < b ? '<' : '>') }; };
    T.bruchKuerzen = function (sp, lvl) { var base = pick([[1, 2], [2, 3], [3, 4], [1, 5], [2, 5], [3, 5], [1, 3], [5, 6], [3, 8]]); var k = ri(2, lvl === 'basis' ? 5 : 9); return { a: 'Kürze ' + fr(base[0] * k, base[1] * k) + ' so weit wie möglich.', l: fr(base[0], base[1]) }; };
    T.bruchAddSub = function (sp, lvl) { var d = pick([5, 6, 7, 8, 9, 10, 12]); var op = pick(['+', '−']); var x, y, res; if (op === '+') { x = ri(1, d - 2); y = ri(1, d - 1 - x); res = x + y; } else { x = ri(2, d - 1); y = ri(1, x - 1); res = x - y; } var r = red(res, d); return { a: fr(x, d) + ' ' + op + ' ' + fr(y, d) + ' = ?', l: fr(res, d) + (r[1] !== d ? ' = ' + fr(r[0], r[1]) : '') }; };
    T.bruchDezimal = function (sp, lvl) { var m = pick([[1, 2, '0,5'], [1, 4, '0,25'], [3, 4, '0,75'], [1, 10, '0,1'], [3, 10, '0,3'], [7, 10, '0,7'], [1, 5, '0,2'], [2, 5, '0,4'], [9, 10, '0,9'], [1, 100, '0,01']]); return { a: 'Schreibe ' + fr(m[0], m[1]) + ' als Dezimalzahl.', l: m[2] }; };
    T.prozentBruch = function (sp, lvl) { var p = pick([10, 20, 25, 50, 75, 5, 40, 60, 80, 30]); var r = red(p, 100); return { a: 'Schreibe ' + p + ' % als gekürzten Bruch.', l: fr(r[0], r[1]) }; };
    T.prozentwert = function (sp, lvl) { var p = pick(lvl === 'basis' ? [10, 50, 25] : [5, 10, 15, 20, 25, 30, 40, 50, 75]); var M = ri(1, lvl === 'plus' ? 40 : 20) * 20; return { a: p + ' % von ' + M + ' € = ?', l: de(M * p / 100) + ' €' }; };
    T.rabatt = function (sp, lvl) { var p = pick([10, 20, 25, 50, 30]); var M = ri(1, 20) * 20; var rab = M * p / 100; return { a: 'Ein Artikel kostet ' + M + ' €, jetzt −' + p + ' %. Neuer Preis?', l: 'Rabatt ' + de(rab) + ' € → ' + de(M - rab) + ' €' }; };
    T.aufschlag = function (sp, lvl) { var p = pick([10, 20, 25, 50, 5]); var M = ri(1, 20) * 20; var auf = M * p / 100; return { a: 'Ein Preis von ' + M + ' € steigt um ' + p + ' %. Neuer Preis?', l: 'Aufschlag ' + de(auf) + ' € → ' + de(M + auf) + ' €' }; };
    T.dreieckFlaeche = function (sp, lvl) { var g = ri(2, 20), h = ri(2, 16); if ((g * h) % 2 !== 0) h += (h < 16 ? 1 : -1); return { a: 'Dreieck: g = ' + g + ' cm, h = ' + h + ' cm. Fläche?', l: '(' + g + '·' + h + ')÷2 = ' + de(g * h / 2) + ' cm²' }; };
    T.winkelArt = function (sp, lvl) { var d = ri(10, 170); return { a: 'Ein Winkel misst ' + d + '°. Spitz, recht oder stumpf?', l: (d < 90 ? 'spitzwinklig' : (d === 90 ? 'rechtwinklig' : 'stumpfwinklig')) }; };
    T.winkelDritter = function (sp, lvl) { var a = ri(30, 90), b = ri(30, 150 - a); return { a: 'Zwei Winkel eines Dreiecks: ' + a + '° und ' + b + '°. Der dritte?', l: (180 - a - b) + '°' }; };
    T.negVergleich = function (sp, lvl) { var R = lvl === 'plus' ? 30 : 15; var a = ri(-R, R), b = ri(-R, R); while (b === a) b = ri(-R, R); return { a: 'Setze < oder >:  ' + a + '  ▢  ' + b, l: (a < b ? '<' : '>') }; };
    T.negAddSub = function (sp, lvl) { var R = lvl === 'plus' ? 20 : 12; var x = ri(-R, R), y = ri(1, R), op = pick(['+', '−']); return { a: 'Rechne  ' + x + ' ' + op + ' ' + y + '  =', l: '' + (op === '+' ? x + y : x - y) }; };
    T.tempAenderung = function (sp, lvl) { var t1 = ri(-10, 5), t2 = ri(-8, 15); var d = t2 - t1; return { a: 'Morgens ' + t1 + ' °C, mittags ' + t2 + ' °C. Änderung?', l: (d >= 0 ? '+' : '') + d + ' °C (' + (d >= 0 ? 'wärmer' : 'kälter') + ')' }; };
    T.dreisatz = function (sp, lvl) { var n = ri(2, 6), per = ri(2, 9), m = ri(2, 9); return { a: n + ' Stück kosten ' + (n * per) + ' €. Was kosten ' + m + ' Stück?', l: '1 Stück ' + per + ' € → ' + m + ' Stück ' + (per * m) + ' €' }; };
    T.flaechePara = function (sp, lvl) { var g = ri(3, 20), h = ri(3, 15); return { a: 'Parallelogramm: g = ' + g + ' cm, h = ' + h + ' cm. Fläche?', l: (g * h) + ' cm²' }; };
    T.flaecheTrapez = function (sp, lvl) { var a = ri(6, 20), c = ri(2, a - 2); if ((a + c) % 2 !== 0) c += 1; var h = ri(2, 10); return { a: 'Trapez: a = ' + a + ' cm, c = ' + c + ' cm, h = ' + h + ' cm. Fläche?', l: '(' + a + '+' + c + ')÷2·' + h + ' = ' + ((a + c) / 2 * h) + ' cm²' }; };
    T.flaecheKreis = function (sp, lvl) { var r = pick([2, 3, 4, 5, 6, 10]); return { a: 'Kreis mit r = ' + r + ' cm. Fläche (π ≈ 3,14)?', l: '3,14·' + r + '·' + r + ' = ' + de(3.14 * r * r) + ' cm²' }; };
    T.umfangKreis = function (sp, lvl) { var r = pick([2, 3, 4, 5, 10]); return { a: 'Kreis mit r = ' + r + ' cm. Umfang (π ≈ 3,14)?', l: '2·3,14·' + r + ' = ' + de(2 * 3.14 * r) + ' cm' }; };
    T.relMult = function (sp, lvl) { var R = lvl === 'basis' ? 6 : 10; var x = ri(-R, R) || 2, y = ri(-R, R) || 2; return { a: '(' + x + ') · (' + y + ') =', l: '' + (x * y) }; };
    T.prioritaet = function (sp, lvl) { var a = ri(2, 9), b = ri(2, 9), c = ri(2, 9), f = pick(['a+bc', 'a-bc', 'ab+c', '(a+b)c']); var q, res; if (f === 'a+bc') { q = a + ' + ' + b + ' · ' + c; res = a + b * c; } else if (f === 'a-bc') { a = b * c + ri(1, 6); q = a + ' − ' + b + ' · ' + c; res = a - b * c; } else if (f === 'ab+c') { q = a + ' · ' + b + ' + ' + c; res = a * b + c; } else { q = '(' + a + ' + ' + b + ') · ' + c; res = (a + b) * c; } return { a: 'Rechne: ' + q + ' =', l: '' + res }; };
    T.termEinsetzen = function (sp, lvl) { var a = ri(2, 6), b = ri(-6, 8), v = ri(lvl === 'plus' ? -6 : 0, 8); return { a: 'A(x) = ' + a + 'x ' + (b >= 0 ? '+ ' + b : '− ' + (-b)) + '.  Berechne A(' + v + ').', l: 'A(' + v + ') = ' + (a * v + b) }; };
    T.termReduzieren = function (sp, lvl) { var a1 = ri(-6, 6) || 1, c1 = ri(-9, 9), a2 = ri(-6, 6) || 1, c2 = ri(-9, 9); return { a: 'Fasse zusammen:  ' + termStr([{ coef: a1, sym: 'x' }, { coef: c1, sym: '' }, { coef: a2, sym: 'x' }, { coef: c2, sym: '' }]), l: termStr([{ coef: a1 + a2, sym: 'x' }, { coef: c1 + c2, sym: '' }]) }; };
    T.klammern = function (sp, lvl) { var a = ri(1, 6), sign = pick(['+', '−']); var bx = (Math.random() < 0.5 ? -1 : 1) * ri(1, 6), cc = (Math.random() < 0.5 ? -1 : 1) * ri(1, 9); var inside = termStr([{ coef: bx, sym: 'x' }, { coef: cc, sym: '' }]); var rx = sign === '+' ? a + bx : a - bx, rc = sign === '+' ? cc : -cc; return { a: 'Löse die Klammer auf:  ' + a + 'x ' + sign + ' (' + inside + ')', l: termStr([{ coef: rx, sym: 'x' }, { coef: rc, sym: '' }]) }; };

    /* ---- Modul 1: Zahlen, Rechnen, Größen, Figuren (CCP-Sockel) ---- */
    var STELLEN = { 1: 'Einer', 10: 'Zehner', 100: 'Hunderter', 1000: 'Tausender', 10000: 'Zehntausender', 100000: 'Hunderttausender' };
    T.stellenwert = function (sp, lvl) { var N = ri(1000, lvl === 'basis' ? 99999 : 999999); var s = String(N); var pos = ri(0, s.length - 1); while (s[pos] === '0') { pos = ri(0, s.length - 1); } var d = s[pos], st = Math.pow(10, s.length - 1 - pos); return { a: 'Welchen Wert hat die Ziffer ' + d + ' in der Zahl ' + grp(N) + '?', l: grp((+d) * st) + ' (' + STELLEN[st] + ')' }; };
    T.zahlVergleich = function (sp, lvl) { var mx = lvl === 'basis' ? 9999 : 999999; var a = ri(100, mx), b = ri(100, mx); while (b === a) b = ri(100, mx); return { a: 'Setze < oder >:  ' + grp(a) + '  ▢  ' + grp(b), l: (a < b ? '<' : '>') }; };
    T.zahlOrdnen = function (sp, lvl) { var mx = lvl === 'basis' ? 9999 : 999999, arr = []; while (arr.length < 4) { var x = ri(100, mx); if (arr.indexOf(x) < 0) arr.push(x); } var so = arr.slice().sort(function (p, q) { return p - q; }); return { a: 'Ordne von klein nach groß:  ' + arr.map(grp).join('  ·  '), l: so.map(grp).join(' < ') }; };
    T.runden = function (sp, lvl) { var st = pick(lvl === 'basis' ? [10, 100] : [10, 100, 1000]); var N = ri(st * 2, lvl === 'plus' ? 99999 : 9999); return { a: 'Runde ' + grp(N) + ' auf ' + STELLEN[st] + '.', l: grp(Math.round(N / st) * st) }; };
    T.vorNach = function (sp, lvl) { var mx = lvl === 'basis' ? 9999 : 999999, N = ri(101, mx); return { a: 'Vorgänger und Nachfolger von ' + grp(N) + '?', l: grp(N - 1) + ' und ' + grp(N + 1) }; };
    T.kopfAdd = function (sp, lvl) { var R = lvl === 'basis' ? 100 : 1000; var a = ri(10, R), b = ri(10, R); return { a: a + ' + ' + b + ' =', l: '' + (a + b) }; };
    T.kopfSub = function (sp, lvl) { var R = lvl === 'basis' ? 100 : 1000; var a = ri(20, R), b = ri(1, a); return { a: a + ' − ' + b + ' =', l: '' + (a - b) }; };
    T.schriftAdd = function (sp, lvl) { var R = lvl === 'basis' ? 9999 : 999999; var a = ri(1000, R), b = ri(1000, R); return { a: grp(a) + ' + ' + grp(b) + ' =', l: grp(a + b) }; };
    T.schriftSub = function (sp, lvl) { var R = lvl === 'basis' ? 9999 : 999999; var a = ri(2000, R), b = ri(100, a); return { a: grp(a) + ' − ' + grp(b) + ' =', l: grp(a - b) }; };
    T.malZehn = function (sp, lvl) { var z = pick([10, 100, 1000]), op = pick(['·', '÷']); if (op === '·') { var a = ri(2, lvl === 'basis' ? 99 : 999); return { a: a + ' · ' + z + ' =', l: grp(a * z) }; } var base = ri(2, 999) * z; return { a: grp(base) + ' ÷ ' + z + ' =', l: grp(base / z) }; };
    T.einmaleins = function (sp, lvl) { var a = ri(2, lvl === 'basis' ? 10 : 12), b = ri(2, lvl === 'basis' ? 10 : 12); return { a: a + ' · ' + b + ' =', l: '' + (a * b) }; };
    T.laenge = function (sp, lvl) { var u = [['km', 1000000], ['m', 1000], ['dm', 100], ['cm', 10], ['mm', 1]]; var i = ri(0, 3), from = u[i], to = u[i + 1], n = ri(1, 9); return { a: n + ' ' + from[0] + ' = ___ ' + to[0], l: grp(n * (from[1] / to[1])) + ' ' + to[0] }; };
    T.geld = function (sp, lvl) { var a = ri(2, 25), b = ri(2, 25), c = ri(1, 20), sum = a + b + c, pay = 100; return { a: 'Du kaufst für ' + a + ' €, ' + b + ' € und ' + c + ' €. Wie viel zusammen? Du zahlst mit ' + pay + ' €, wie viel bekommst du zurück?', l: 'Zusammen ' + sum + ' €, zurück ' + (pay - sum) + ' €' }; };
    T.uhrzeit = function (sp, lvl) { var h = ri(6, 20), m = pick([0, 15, 30, 45]), add = pick([15, 30, 45, 60, 90]); var tot = h * 60 + m + add, h2 = Math.floor(tot / 60) % 24, m2 = tot % 60; function p(x) { return (x < 10 ? '0' : '') + x; } return { a: 'Es ist ' + p(h) + ':' + p(m) + ' Uhr. Wie spät ist es in ' + add + ' Minuten?', l: p(h2) + ':' + p(m2) + ' Uhr' }; };
    T.figurBenennen = function (sp, lvl) { var f = pick([['4 gleich lange Seiten und 4 rechte Winkel', 'Quadrat'], ['2 lange und 2 kurze Seiten, 4 rechte Winkel', 'Rechteck'], ['genau 3 Seiten', 'Dreieck'], ['rund, alle Randpunkte gleich weit vom Mittelpunkt', 'Kreis'], ['4 Seiten, gegenüberliegende Seiten parallel und gleich lang', 'Parallelogramm']]); return { a: 'Welche Figur hat: ' + f[0] + '?', l: f[1] }; };
    T.kreisTeile = function (sp, lvl) { var q = pick([['Wie heißt die Strecke vom Mittelpunkt zum Kreisrand?', 'Radius'], ['Wie heißt die Strecke quer durch den Kreis durch den Mittelpunkt?', 'Durchmesser'], ['Der Durchmesser ist wie lang im Vergleich zum Radius?', 'doppelt so lang (2 · Radius)'], ['Wie heißt die Fläche innerhalb des Kreises?', '(Kreis-)Scheibe'], ['Wie heißt der Punkt genau in der Mitte des Kreises?', 'Mittelpunkt']]); return { a: q[0], l: q[1] }; };

    /* ---- Modul 2: Dezimalzahlen, Größen, Geometrie-Grundbegriffe ---- */
    function decGen(lvl) { var w = ri(0, 99), dp = lvl === 'basis' ? 1 : pick([1, 2]), fr = ''; for (var k = 0; k < dp; k++) fr += ri(0, 9); return { s: w + ',' + fr, v: w + (+fr) / Math.pow(10, dp), dp: dp }; }
    T.dezimalStellenwert = function (sp, lvl) { var w = ri(1, 99), z = ri(1, 9), h = lvl === 'basis' ? null : ri(1, 9); var s = w + ',' + z + (h !== null ? '' + h : ''); if (h !== null && Math.random() < 0.5) return { a: 'Welchen Wert hat die Ziffer ' + h + ' in ' + s + '?', l: h + ' Hundertstel = 0,0' + h }; return { a: 'Welchen Wert hat die Ziffer ' + z + ' in ' + s + '?', l: z + ' Zehntel = 0,' + z }; };
    T.dezimalVergleich = function (sp, lvl) { var A = decGen(lvl), B = decGen(lvl); while (B.v === A.v) B = decGen(lvl); return { a: 'Setze < oder >:  ' + A.s + '  ▢  ' + B.s, l: (A.v < B.v ? '<' : '>') }; };
    T.dezimalOrdnen = function (sp, lvl) { var arr = []; while (arr.length < 4) { var d = decGen(lvl); if (!arr.some(function (x) { return x.v === d.v; })) arr.push(d); } var so = arr.slice().sort(function (p, q) { return p.v - q.v; }); return { a: 'Ordne von klein nach groß:  ' + arr.map(function (x) { return x.s; }).join('  ·  '), l: so.map(function (x) { return x.s; }).join(' < ') }; };
    T.dezimalAddSub = function (sp, lvl) { var dp = lvl === 'basis' ? 1 : pick([1, 2]), f = Math.pow(10, dp), op = pick(['+', '−']); var A = ri(f, 200 * f) / f, B = ri(1, 150 * f) / f; if (op === '−' && B > A) { var t = A; A = B; B = t; } var res = op === '+' ? A + B : A - B; function d(x) { return x.toFixed(dp).replace('.', ','); } return { a: d(A) + ' ' + op + ' ' + d(B) + ' =', l: d(res) }; };
    T.dezimalMalZehn = function (sp, lvl) { var z = pick([10, 100, 1000]); if (Math.random() < 0.5) { var dp = pick([1, 2]), f = Math.pow(10, dp), a = ri(1, 999) / f; function d(x) { return (Math.round(x * 1000) / 1000).toString().replace('.', ','); } return { a: d(a) + ' · ' + z + ' =', l: d(a * z) }; } var base = ri(1, 9999), zz = pick([10, 100]); function d2(x) { return (Math.round(x * 1000) / 1000).toString().replace('.', ','); } return { a: base + ' ÷ ' + zz + ' =', l: d2(base / zz) }; };
    T.kapazitaet = function (sp, lvl) { var u = [['l', 1000], ['dl', 100], ['cl', 10], ['ml', 1]]; var i = ri(0, 2), from = u[i], to = u[i + 1], n = ri(1, 9); return { a: n + ' ' + from[0] + ' = ___ ' + to[0], l: grp(n * (from[1] / to[1])) + ' ' + to[0] }; };
    T.masse = function (sp, lvl) { var p = pick([['t', 1000, 'kg'], ['kg', 1000, 'g']]); var n = ri(1, 9); return { a: n + ' ' + p[0] + ' = ___ ' + p[2], l: grp(n * p[1]) + ' ' + p[2] }; };
    T.umfang = function (sp, lvl) { var f = pick(['quadrat', 'rechteck', 'dreieck']); if (f === 'quadrat') { var a = ri(2, 20); return { a: 'Umfang eines Quadrats mit Seite ' + a + ' cm?', l: '4 · ' + a + ' = ' + (4 * a) + ' cm' }; } if (f === 'rechteck') { var l1 = ri(3, 20), b = ri(2, l1 - 1); return { a: 'Umfang eines Rechtecks: Länge ' + l1 + ' cm, Breite ' + b + ' cm?', l: '2 · (' + l1 + ' + ' + b + ') = ' + (2 * (l1 + b)) + ' cm' }; } var x = ri(3, 12), y = ri(3, 12), zz = ri(3, 12); return { a: 'Umfang eines Dreiecks mit den Seiten ' + x + ' cm, ' + y + ' cm und ' + zz + ' cm?', l: x + ' + ' + y + ' + ' + zz + ' = ' + (x + y + zz) + ' cm' }; };
    T.geoNotation = function (sp, lvl) { var q = pick([['Wie schreibt man die Gerade durch die Punkte A und B?', '(AB)'], ['Wie schreibt man die Strecke von A bis B?', '[AB]'], ['Wie schreibt man die Halbgerade mit Anfangspunkt A durch B?', '[AB)'], ['Welche Klammern benutzt man für eine Strecke?', 'eckige Klammern [ ]'], ['Hat eine Gerade eine Länge?', 'Nein – sie ist zu beiden Seiten unendlich lang'], ['Hat eine Strecke einen Anfangs- und einen Endpunkt?', 'Ja']]); return { a: q[0], l: q[1] }; };

    /* ---- Modul 3: Dezimalzahlen (mal/geteilt), Flächeninhalt, Temperatur, Statistik ---- */
    T.rundenEinheit = function (sp, lvl) { var w = ri(1, lvl === 'basis' ? 20 : 99), z = ri(1, 9), h = lvl === 'basis' ? null : (Math.random() < 0.6 ? ri(0, 9) : null); var s = w + ',' + z + (h !== null ? '' + h : ''); var v = parseFloat(w + '.' + z + (h !== null ? '' + h : '')); return { a: 'Runde ' + s + ' auf die Einheit (ganze Zahl).', l: '≈ ' + Math.round(v) }; };
    T.dezimalMalGanz = function (sp, lvl) { var dp = lvl === 'basis' ? 1 : pick([1, 2]), f = Math.pow(10, dp); var a = ri(11, lvl === 'basis' ? 99 : 999) / f; var m = ri(2, lvl === 'basis' ? 5 : 9); function d(x) { return (Math.round(x * 1000) / 1000).toString().replace('.', ','); } return { a: d(a) + ' · ' + m + ' =', l: d(a * m) }; };
    T.dezimalDurchGanz = function (sp, lvl) { var dp = lvl === 'basis' ? 1 : pick([1, 2]), f = Math.pow(10, dp); var q = ri(11, lvl === 'basis' ? 99 : 499) / f; var m = ri(2, lvl === 'basis' ? 5 : 9); var dividend = q * m; function d(x) { return (Math.round(x * 1000) / 1000).toString().replace('.', ','); } return { a: d(dividend) + ' ÷ ' + m + ' =', l: d(q) }; };
    T.flaecheRechteck = function (sp, lvl) { if (Math.random() < 0.3) { var a = ri(2, lvl === 'basis' ? 12 : 25); return { a: 'Quadrat mit Seite ' + a + ' cm. Flächeninhalt?', l: a + ' · ' + a + ' = ' + (a * a) + ' cm²' }; } var L = ri(3, lvl === 'basis' ? 15 : 30), B = ri(2, L - 1); return { a: 'Rechteck: Länge ' + L + ' cm, Breite ' + B + ' cm. Flächeninhalt?', l: L + ' · ' + B + ' = ' + (L * B) + ' cm²' }; };
    T.flaecheEinheit = function (sp, lvl) { var p = pick([['m²', 'dm²'], ['dm²', 'cm²'], ['cm²', 'mm²'], ['a', 'm²'], ['ha', 'a'], ['km²', 'ha']]); var n = ri(1, 9); return { a: n + ' ' + p[0] + ' = ___ ' + p[1], l: grp(n * 100) + ' ' + p[1] + '  (× 100)' }; };
    T.mittelwert = function (sp, lvl) { var k = lvl === 'basis' ? 3 : pick([3, 4]); var arr = [], sum = 0; for (var i = 0; i < k; i++) { var x = ri(2, lvl === 'plus' ? 40 : 20); arr.push(x); sum += x; } var rem = sum % k; if (rem !== 0) { arr[k - 1] += (k - rem); sum += (k - rem); } var mean = sum / k; return { a: 'Berechne den Mittelwert (Durchschnitt) von: ' + arr.join(', ') + '.', l: '(' + arr.join(' + ') + ') ÷ ' + k + ' = ' + sum + ' ÷ ' + k + ' = ' + mean }; };

    function make(spec, n, lvl) {
      if (!spec) return [];
      var specs = Array.isArray(spec) ? spec : [spec];
      var out = [], seen = {}, guard = 0;
      while (out.length < n && guard < n * 30) { guard++; var sp = specs[out.length % specs.length]; var f = T[sp.type]; if (!f) break; var e = f(sp, lvl || 'kern'); if (!e || seen[e.a]) continue; seen[e.a] = 1; out.push(e); }
      return out;
    }
    return { make: make, has: function (t) { return !!T[t]; } };
  })();

  /* ---------- Zustand ---------- */
  var state = { view: 'home', mid: null, nr: null, printSol: false, gen: { lvl: 'kern', count: 20, sol: false, items: [] } };
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
    h += '<div class="mth-modprint"><div class="mth-modprint-t">📄 Ganzes Modul als Heft drucken</div>' +
      '<div class="mth-modprint-b">' +
      '<button class="mth-btn mth-btn-p" data-mth="print-module" data-id="' + esc(m.id) + '">📖 Heft drucken</button>' +
      '<button class="mth-btn mth-btn-dl" data-mth="download-module" data-id="' + esc(m.id) + '">⬇️ Heft speichern (Datei)</button>' +
      '<button class="mth-btn mth-solprint' + (state.printSol ? ' on' : '') + '" data-mth="solprint">' + (state.printSol ? '✓ mit Lösungen (Lehrerheft)' : 'Lösungsheft') + '</button>' +
      '<span class="mth-gchip' + (state.gen.count === 24 ? ' on' : '') + '" data-mth="gen-count" data-n="24">Standard</span>' +
      '<span class="mth-gchip' + (state.gen.count === 40 ? ' on' : '') + '" data-mth="gen-count" data-n="40">viele Aufgaben</span>' +
      '</div>' +
      '<div class="mth-ghint">Ein komplettes Heft mit allen Lektionen: Erklärung, Bild, Merksatz, Musteraufgabe und Übungsseiten. „Speichern" legt das Heft als Datei ab (offline nutzbar, mit Knopf „Als PDF speichern"); „Drucken" öffnet direkt den Druckdialog.</div></div>';
    (m.themen || []).forEach(function (t, ti) {
      h += '<div class="mth-theme" style="--tc:' + esc(t.farbe || m.farbe || '#6C4CE0') + '"><div class="mth-theme-head"><span class="mth-theme-ic">' + esc(t.icon || '') + '</span><div class="mth-theme-hx"><div class="mth-theme-t">' + esc(t.titel) + '</div>' + ((t.ziele && t.ziele.length) ? '<div class="mth-theme-z">' + t.ziele.map(esc).join(' · ') + '</div>' : '') + '</div>' +
        '<div class="mth-theme-dl"><button class="mth-btn mth-btn-p mth-btn-sm" data-mth="print-theme" data-mid="' + esc(m.id) + '" data-tix="' + ti + '">📖 Kapitel drucken</button><button class="mth-btn mth-btn-dl mth-btn-sm" data-mth="download-theme" data-mid="' + esc(m.id) + '" data-tix="' + ti + '">⬇️ Kapitel speichern</button></div></div><div class="mth-lrows">';
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
    if (lek.gen) { state.gen.items = GEN.make(lek.gen, state.gen.count, state.gen.lvl); } else { state.gen.items = []; }
    h += '<div class="mth-lbar"><button class="mth-back" data-mth="module" data-id="' + esc(m.id) + '">← Modul ' + esc(m.nr) + '</button><div class="mth-lbar-b">' +
      '<button class="mth-btn mth-btn-p" data-mth="print-info" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '">📘 Infoblatt drucken</button>' +
      '<button class="mth-btn mth-btn-dl" data-mth="download-info" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '">⬇️ speichern</button>' +
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

    if (lek.def) h += '<div class="mth-def"><span class="mth-def-b">' + rich(lek.def.begriff) + '</span>' + rich(lek.def.text) + '</div>';

    if (lek.erklaerung && lek.erklaerung.length) {
      h += '<div class="mth-sec"><div class="mth-sec-h">📖 Erklärung — Schritt für Schritt</div><div class="mth-steps">';
      lek.erklaerung.forEach(function (s, i) { h += '<div class="mth-step"><div class="mth-step-n">' + (i + 1) + '</div><div class="mth-step-x">' + (s.titel ? '<div class="mth-step-t">' + rich(s.titel) + '</div>' : '') + '<div class="mth-step-txt">' + rich(s.text) + '</div>' + (s.beispiel ? '<div class="mth-ex"><span>Beispiel</span> ' + rich(s.beispiel) + '</div>' : '') + '</div></div>'; });
      h += '</div></div>';
    }

    if (lek.merksatz) h += '<div class="mth-merk"><div class="mth-merk-ic">📌</div><div><div class="mth-merk-t">Merksatz</div>' + rich(lek.merksatz) + '</div></div>';

    if (lek.vorgehen && lek.vorgehen.length) h += '<div class="mth-sec"><div class="mth-sec-h">🧭 So gehst du vor</div><ol class="mth-vorgehen">' + lek.vorgehen.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol></div>';

    var mls = musterlList(lek);
    if (mls.length) {
      h += '<div class="mth-sec"><div class="mth-sec-h">✅ So rechnest du — ' + (mls.length > 1 ? 'Musteraufgaben' : 'Musteraufgabe') + '</div>' + mls.map(function (ml) { return '<div class="mth-muster">' + (ml.titel ? '<div class="mth-muster-tl">' + rich(ml.titel) + '</div>' : '') + '<div class="mth-muster-q">' + rich(ml.a) + '</div><ol class="mth-muster-s">' + (ml.schritte || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' + (ml.erg ? '<div class="mth-muster-e">➜ ' + rich(ml.erg) + '</div>' : '') + '</div>'; }).join('') + '</div>';
    }

    h += genSectionHtml(m, lek);

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

  /* ---------- Arbeitsblatt-Generator (Lehreransicht) ---------- */
  function curLek() { var m = findModule(state.mid), f = m && lessonOf(m, state.nr); return f ? f.lek : {}; }
  function genBoxInner(lek) {
    var g = state.gen;
    var chips = [['basis', '🟢'], ['kern', '🟡'], ['plus', '🔵']].map(function (x) { var L = (DATA.legende && DATA.legende[x[0]]) || { label: x[0] }; return '<button class="mth-gchip' + (g.lvl === x[0] ? ' on' : '') + '" data-mth="gen-lvl" data-lvl="' + x[0] + '">' + x[1] + ' ' + esc(L.label) + '</button>'; }).join('');
    var counts = [12, 20, 30].map(function (n) { return '<button class="mth-gchip' + (g.count === n ? ' on' : '') + '" data-mth="gen-count" data-n="' + n + '">' + n + ' Aufgaben</button>'; }).join('');
    var prev = '<div class="mth-gprev">' + g.items.map(function (it, i) { return '<div class="mth-gcard"><span class="mth-gnum">' + (i + 1) + '</span><div class="mth-gq">' + rich(it.a) + (g.sol ? '<div class="mth-ga">' + rich(it.l) + '</div>' : '') + '</div></div>'; }).join('') + '</div>';
    return '<div class="mth-genwrap"><div class="mth-gtitle">🎲 Aufgaben-Generator — endlos viele frische Blätter</div>' +
      '<div class="mth-gbar"><span class="mth-glbl">Niveau</span>' + chips + '<span class="mth-glbl">Umfang</span>' + counts + '</div>' +
      '<div class="mth-gbar2"><button class="mth-btn mth-gnew" data-mth="gen-new">🔁 Neu würfeln</button>' +
      '<button class="mth-btn mth-gsol' + (g.sol ? ' on' : '') + '" data-mth="gen-sol">' + (g.sol ? '✓ Lösungen sichtbar' : '👁️ Lösungen') + '</button>' +
      '<button class="mth-btn mth-btn-p" data-mth="gen-print">🖨️ Dieses Blatt drucken</button></div>' +
      '<div class="mth-ghint">Jeder Klick auf „Neu würfeln" erzeugt ein komplett neues Blatt — so viele du brauchst, alle mit Lösungen.</div>' + prev + '</div>';
  }
  function genSectionHtml(m, lek) {
    var h = '<div class="mth-sec"><div class="mth-sec-h">🖨️ Arbeitsblätter drucken — für die Schüler</div>';
    if (lek.gen) { h += '<div id="mth-genbox">' + genBoxInner(lek) + '</div>'; }
    h += '<div class="mth-curated"><span class="mth-glbl">' + (lek.gen ? 'Oder die Beispiel-Aufgaben von oben als Blatt:' : 'Aufgabenblatt (Beispiel-Aufgaben):') + '</span>' +
      ['basis', 'kern', 'plus'].map(function (k) { var L = (DATA.legende && DATA.legende[k]) || { icon: '', label: k }; return '<span class="mth-abpair"><button class="mth-btn mth-ab" data-mth="print-ab" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-lvl="' + k + '">' + esc(L.icon) + ' ' + esc(L.label) + '</button><button class="mth-btn mth-ab mth-abdl" title="Blatt als Datei speichern" data-mth="download-ab" data-mid="' + esc(m.id) + '" data-nr="' + esc(lek.nr) + '" data-lvl="' + k + '">⬇️</button></span>'; }).join('') +
      '<button class="mth-btn mth-solprint' + (state.printSol ? ' on' : '') + '" data-mth="solprint">' + (state.printSol ? '✓ mit Lösungen' : 'Lösungen') + '</button></div></div>';
    return h;
  }
  function updateGenBox() { var el = document.getElementById('mth-genbox'); if (el) { var m = findModule(state.mid), f = m && lessonOf(m, state.nr); if (f) { el.innerHTML = genBoxInner(f.lek); } } }
  function regenGen() { state.gen.items = GEN.make(curLek().gen, state.gen.count, state.gen.lvl); }
  function printGenSheet(mid, nr) {
    var m = findModule(mid), f = lessonOf(m, nr); if (!f) return; var lek = f.lek, theme = f.theme, acc = m.farbe || '#6C4CE0', g = state.gen;
    var lvlL = (DATA.legende && DATA.legende[g.lvl] ? DATA.legende[g.lvl].label : g.lvl);
    var b = '<div class="hd"><div class="k">Modul ' + esc(m.nr) + ' · ' + esc(theme.titel) + ' · Übungsblatt ' + esc(g.sol ? 'Lösungen · ' : '') + esc(lvlL) + '</div><h1>' + rich(lek.titel) + '</h1></div>';
    b += '<div class="name"><span><b>Name:</b> ______________________</span><span><b>Datum:</b> ______________</span></div>';
    if (lek.merksatz) b += '<div class="remind"><div class="l">Denk dran</div>' + rich(lek.merksatz) + '</div>';
    b += '<div class="ggrid">' + g.items.map(function (it, i) { return '<div class="gcard"><span class="gnum">' + (i + 1) + '</span><div class="gq">' + rich(it.a) + (g.sol ? '<div class="gsol">' + rich(it.l) + '</div>' : '<div class="gans"></div>') + '</div></div>'; }).join('') + '</div>';
    b += '<div class="foot">Mathe ' + esc((DATA.meta || {}).klasse || '') + ' · Übungsblatt ' + esc(lvlL) + ' · Lektion ' + esc(lek.nr) + (g.sol ? ' · Lösungsblatt' : '') + '</div>';
    printDoc('Übungsblatt ' + lvlL + ' – ' + lek.titel, acc, b);
  }

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
      '.intro{background:#f6f6fb;border-radius:8px;padding:9px 13px;margin:0 0 12px;font-size:14px;line-height:1.55}' +
      '.defbox{border:1.5px solid ' + acc + '55;background:' + acc + '0c;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:14.5px;line-height:1.5}.defb{display:block;font-weight:800;color:' + acc + ';margin-bottom:2px}' +
      '.vorgehen{margin:6px 0 0;padding-left:22px}.vorgehen li{margin:5px 0;font-size:14.5px;line-height:1.5}' +
      '.mus-tl{font-weight:800;font-size:13px;color:' + acc + ';margin-bottom:3px}' +
      'ol.tasks{margin:0;padding-left:24px}ol.tasks>li{margin:0 0 16px;break-inside:avoid}.q{font-weight:600;font-size:15px}' +
      '.hint{font-style:italic;color:#555;font-size:13.5px;margin:0 0 10px}' +
      '.line{border-bottom:1.4px solid #b8b8c8;height:22px;margin:9px 0}' +
      '.sol{color:#1a7a48;font-size:14px;margin-top:5px;font-weight:600}' +
      '.remind{border:1.5px solid ' + acc + '55;background:' + acc + '0c;border-radius:11px;padding:11px 15px;margin:0 0 14px;font-size:14.5px}' +
      '.remind .l{font-weight:900;color:' + acc + ';font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}' +
      '.foot{margin-top:22px;text-align:center;font-size:11px;color:#aaa}' +
      '.tbl{border-collapse:collapse;margin:6px 0}.tbl td,.tbl th{border:1.4px solid #999;padding:8px 12px;min-width:52px;height:26px;text-align:center}' +
      '.ggrid{display:grid;grid-template-columns:1fr 1fr;gap:9px 16px;margin-top:8px}' +
      '.gcard{display:flex;gap:9px;border:1px solid #e4e4ef;border-radius:9px;padding:9px 11px;break-inside:avoid}' +
      '.gnum{flex:0 0 22px;height:22px;border-radius:50%;background:' + acc + ';color:#fff;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}' +
      '.gq{font-size:14px;font-weight:600;flex:1}.gans{border-bottom:1.3px solid #bbb;height:17px;margin-top:9px}' +
      '.gsol{color:#1a7a48;font-size:13px;font-weight:700;margin-top:4px}' +
      /* Ganzes Modul als Heft */
      '.cover{color:#fff;background:' + acc + ';border-radius:16px;padding:54px 36px;text-align:center;margin-bottom:8px}' +
      '.cover .cov-k{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.9}' +
      '.cover .cov-nr{font-size:15px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-top:18px;opacity:.95}' +
      '.cover h1{font-size:34px;margin:6px 0 8px;line-height:1.1}' +
      '.cover .cov-sub{font-size:15px;opacity:.92;max-width:520px;margin:0 auto}' +
      '.cover .cov-th{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:22px}' +
      '.cover .cov-th span{background:rgba(255,255,255,.22);padding:6px 13px;border-radius:20px;font-size:13px;font-weight:600}' +
      '.tdiv{font-size:21px;font-weight:900;border-left:7px solid;padding:8px 0 8px 14px;margin:6px 0 12px;page-break-before:always}' +
      '.lesson{page-break-before:always}' +
      '.lhd{color:#fff;background:' + acc + ';border-radius:11px;padding:11px 17px;font-size:18px;font-weight:800;margin:0 0 14px}' +
      '.lhd-n{opacity:.85;font-weight:700;margin-right:8px;font-size:13px;text-transform:uppercase;letter-spacing:.04em}' +
      '.lex{border-top:2px dashed ' + acc + '55;margin-top:16px;padding-top:12px}' +
      '.name2{font-size:13.5px;margin:0 0 12px;color:#333;border:1.4px solid #d5d5e2;border-radius:8px;padding:8px 12px}' +
      '.exhead{font-size:18px;font-weight:800;color:#20203a;margin:0 0 6px}.exsub{display:block;font-weight:600;color:#999;font-size:12px;margin-bottom:2px}' +
      '.plevel{margin:12px 0;break-inside:avoid}.plh{font-weight:800;font-size:15px;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #ddd}' +
      '@media print{.pg{max-width:none;padding:11mm 12mm}.step,.merk,.mus,ol.tasks>li,.fig,.gcard,.plevel>ol>li{break-inside:avoid}}';
  }
  function safeFile(s) { return String(s == null ? 'Heft' : s).replace(/[·–—:/\\]+/g, '-').replace(/[^\wäöüÄÖÜß.\- ]+/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^[-_]+|[-_]+$/g, '').slice(0, 90) || 'Heft'; }
  function buildDoc(title, acc, bodyHtml, forDownload) {
    var bar = forDownload ? '<div class="dlbar"><button onclick="window.print()">🖨️ Drucken / als PDF speichern</button><span>Diese Datei ist offline nutzbar – öffnen, drucken oder als PDF speichern.</span></div>' : '';
    var barCss = forDownload ? '.dlbar{position:sticky;top:0;z-index:9;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;background:#fff;padding:11px 14px;border-bottom:1px solid #e2e2ee;font:400 12.5px Inter,Arial,sans-serif;color:#666}.dlbar button{font:700 14px Inter,Arial,sans-serif;padding:9px 18px;border:0;border-radius:9px;background:' + acc + ';color:#fff;cursor:pointer}@media print{.dlbar{display:none}}' : '';
    return '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' + printCss(acc) + barCss + '</style></head><body>' + bar + '<div class="pg">' + bodyHtml + '</div></body></html>';
  }
  function printDoc(title, acc, bodyHtml) {
    var w = window.open('', '_blank'); if (!w) { alert('Bitte Pop-ups für den Druck erlauben.'); return; }
    w.document.write(buildDoc(title, acc, bodyHtml, false));
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 350);
  }
  function downloadDoc(filename, title, acc, bodyHtml) {
    try {
      var blob = new Blob([buildDoc(title, acc, bodyHtml, true)], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) { alert('Download nicht möglich: ' + e.message); }
  }

  /* Infoblatt (Lernblatt für den Schüler) */
  function infoBody(mid, nr) {
    var m = findModule(mid); if (!m) return null; var f = lessonOf(m, nr); if (!f) return null;
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
    return { title: 'Infoblatt – ' + lek.titel, acc: acc, body: b, file: 'Infoblatt_M' + m.nr + '-L' + lek.nr + '_' + safeFile(lek.titel) + '.html' };
  }
  function printInfo(mid, nr) { var d = infoBody(mid, nr); if (d) printDoc(d.title, d.acc, d.body); }
  function downloadInfo(mid, nr) { var d = infoBody(mid, nr); if (d) downloadDoc(d.file, d.title, d.acc, d.body); }

  /* Arbeitsblatt pro Niveau (für den Schüler) */
  function sheetBody(mid, nr, level, withSol) {
    var m = findModule(mid); if (!m) return null; var f = lessonOf(m, nr); if (!f) return null;
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
    return { title: 'Arbeitsblatt ' + L.label + ' – ' + lek.titel, acc: acc, body: b, file: 'Arbeitsblatt_' + safeFile(L.label) + '_M' + m.nr + '-L' + lek.nr + '_' + safeFile(lek.titel) + (withSol ? '_Loesung' : '') + '.html' };
  }
  function printSheet(mid, nr, level, withSol) { var d = sheetBody(mid, nr, level, withSol); if (d) printDoc(d.title, d.acc, d.body); }
  function downloadSheet(mid, nr, level, withSol) { var d = sheetBody(mid, nr, level, withSol); if (d) downloadDoc(d.file, d.title, d.acc, d.body); }
  function tblHtml(t) {
    var cols = t.cols || [], rows = t.rows || 3, s = '<table class="tbl"><thead><tr>';
    cols.forEach(function (c) { s += '<th>' + rich(c) + '</th>'; }); s += '</tr></thead><tbody>';
    for (var r = 0; r < rows; r++) { s += '<tr>'; cols.forEach(function () { s += '<td></td>'; }); s += '</tr>'; }
    return s + '</tbody></table>';
  }

  /* ---------- Ganzes Modul als druckbares Heft ---------- */
  function infoInner(m, lek) {
    var acc = m.farbe || '#6C4CE0', b = '';
    b += '<div class="goal">🎯 <b>Das lernst du:</b> ' + rich(lek.lernziel || '') + '</div>';
    if (lek.einstieg) b += '<div class="intro">' + (lek.einstieg.titel ? '<b>💡 ' + esc(lek.einstieg.titel) + '.</b> ' : '') + rich(lek.einstieg.text) + '</div>';
    if (lek.visual) { var vh = VIS.render(lek.visual, acc); if (vh) b += '<div class="fig">' + vh + (lek.visual.caption ? '<div class="cap">' + rich(lek.visual.caption) + '</div>' : '') + '</div>'; }
    if (lek.def) b += '<div class="defbox"><span class="defb">' + rich(lek.def.begriff) + '</span>' + rich(lek.def.text) + '</div>';
    if (lek.erklaerung && lek.erklaerung.length) { b += '<div class="sec"><div class="sec-h">Das musst du wissen</div>'; lek.erklaerung.forEach(function (s, i) { b += '<div class="step"><div class="n">' + (i + 1) + '</div><div><div class="t">' + rich(s.titel || '') + '</div><div>' + rich(s.text) + '</div>' + (s.beispiel ? '<div class="ex"><b>Beispiel:</b> ' + rich(s.beispiel) + '</div>' : '') + '</div></div>'; }); b += '</div>'; }
    if (lek.merksatz) b += '<div class="merk"><div class="l">📌 Das merke ich mir</div><div class="x">' + rich(lek.merksatz) + '</div></div>';
    if (lek.vorgehen && lek.vorgehen.length) b += '<div class="sec"><div class="sec-h">🧭 So gehst du vor</div><ol class="vorgehen">' + lek.vorgehen.map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol></div>';
    var mls = musterlList(lek);
    if (mls.length) { b += '<div class="sec"><div class="sec-h">So rechnest du — ' + (mls.length > 1 ? 'Beispiele' : 'ein Beispiel') + '</div>' + mls.map(function (ml) { return '<div class="mus">' + (ml.titel ? '<div class="mus-tl">' + rich(ml.titel) + '</div>' : '') + '<div class="q">' + rich(ml.a) + '</div><ol>' + (ml.schritte || []).map(function (s) { return '<li>' + rich(s) + '</li>'; }).join('') + '</ol>' + (ml.erg ? '<div class="e">➜ ' + rich(ml.erg) + '</div>' : '') + '</div>'; }).join('') + '</div>'; }
    if (lek.wortschatz && lek.wortschatz.length) b += '<div class="voc">' + lek.wortschatz.map(function (wv) { return '<span><b>' + esc(wv.de) + '</b><i>' + esc(wv.fr) + '</i></span>'; }).join('') + '</div>';
    return b;
  }
  function exHeadHtml(lek, label) {
    return '<div class="exhead"><span class="exsub">Lektion ' + esc(lek.nr) + ' · ' + rich(lek.titel) + '</span>✏️ Übungen — ' + label + '</div>' +
      '<div class="name2"><b>Name:</b> ____________________     <b>Datum:</b> ____________</div>';
  }
  /* Eine volle Übungsseite je Niveau (Generator). */
  function genPage(m, lek, level, sol, count) {
    var L = (DATA.legende && DATA.legende[level]) || { icon: '', label: level };
    var items = GEN.make(lek.gen, count, level);
    return exHeadHtml(lek, esc(L.icon) + ' ' + esc(L.label)) +
      (L.hint ? '<div class="hint">' + esc(L.hint) + '</div>' : '') +
      '<div class="ggrid">' + items.map(function (it, i) { return '<div class="gcard"><span class="gnum">' + (i + 1) + '</span><div class="gq">' + rich(it.a) + (sol ? '<div class="gsol">' + rich(it.l) + '</div>' : '<div class="gans"></div>') + '</div></div>'; }).join('') + '</div>';
  }
  /* Eine Übungsseite mit den kuratierten Aufgaben aller Niveaus (für Lektionen ohne Generator). */
  function curatedPage(m, lek, sol) {
    var b = exHeadHtml(lek, 'Basis · Kern · Plus');
    ['basis', 'kern', 'plus'].forEach(function (k) {
      var lvl = (lek.aufgaben || {})[k]; if (!lvl || !lvl.items || !lvl.items.length) return;
      var L = (DATA.legende && DATA.legende[k]) || { icon: '', label: k };
      b += '<div class="plevel"><div class="plh">' + esc(L.icon) + ' ' + esc(L.label) + '</div>' + (lvl.hinweis ? '<div class="hint">' + rich(lvl.hinweis) + '</div>' : '') + '<ol>';
      lvl.items.forEach(function (it) { b += '<li><div class="pq">' + rich(it.a) + '</div>'; if (it.tbl) b += tblHtml(it.tbl); if (sol) b += '<div class="psol"><b>Lösung:</b> ' + rich(it.l) + '</div>'; else { var rows = it.raum || (it.tbl ? 0 : 3); for (var r = 0; r < rows; r++) b += '<div class="pline"></div>'; } b += '</li>'; });
      b += '</ol></div>';
    });
    return b;
  }
  function lessonBlocks(m, lekList, sol, count) {
    var b = '';
    (lekList || []).forEach(function (lek) {
      b += '<div class="lesson"><div class="lhd"><span class="lhd-n">Lektion ' + esc(lek.nr) + '</span>' + rich(lek.titel) + '</div><div class="linfo">' + infoInner(m, lek) + '</div></div>';
      if (lek.gen) { ['basis', 'kern', 'plus'].forEach(function (level) { b += '<div class="lesson lesson-ex">' + genPage(m, lek, level, sol, count) + '</div>'; }); }
      else { b += '<div class="lesson lesson-ex">' + curatedPage(m, lek, sol) + '</div>'; }
    });
    return b;
  }
  function moduleBody(mid) {
    var m = findModule(mid); if (!m) return null; var acc = m.farbe || '#6C4CE0', sol = state.printSol, count = Math.max(24, state.gen.count || 24);
    var b = '<div class="cover"><div class="cov-k">Mathematik · ' + esc((DATA.meta || {}).klasse || '') + '</div><div class="cov-nr">Modul ' + esc(m.nr) + '</div><h1>' + esc(m.titel) + '</h1><div class="cov-sub">' + esc(m.unter || '') + '</div><div class="cov-th">' + (m.themen || []).map(function (t) { return '<span>' + esc(t.icon || '') + ' ' + esc(t.titel) + '</span>'; }).join('') + '</div></div>';
    (m.themen || []).forEach(function (t) {
      b += '<div class="tdiv" style="border-color:' + (t.farbe || acc) + ';color:' + (t.farbe || acc) + '">' + esc(t.icon || '') + ' ' + esc(t.titel) + '</div>';
      b += lessonBlocks(m, t.lektionen, sol, count);
    });
    b += '<div class="foot">Mathe ' + esc((DATA.meta || {}).klasse || '') + ' · Modul ' + esc(m.nr) + ' · ' + esc(m.titel) + (sol ? ' · Lösungsheft' : '') + '</div>';
    return { m: m, acc: acc, sol: sol, title: 'Modul ' + m.nr + ' – ' + m.titel, body: b, file: 'Mathe_Modul-' + m.nr + '_' + safeFile(m.titel) + (sol ? '_Loesungsheft' : '_Heft') + '.html' };
  }
  function printModule(mid) { var d = moduleBody(mid); if (d) printDoc(d.title, d.acc, d.body); }
  function downloadModule(mid) { var d = moduleBody(mid); if (d) downloadDoc(d.file, d.title, d.acc, d.body); }
  /* ---------- Ein Kapitel (Thema) als Heft ---------- */
  function themeBody(mid, tix) {
    var m = findModule(mid); if (!m) return null; var t = (m.themen || [])[+tix]; if (!t) return null;
    var acc = t.farbe || m.farbe || '#6C4CE0', sol = state.printSol, count = Math.max(24, state.gen.count || 24);
    var b = '<div class="cover"><div class="cov-k">Mathematik · ' + esc((DATA.meta || {}).klasse || '') + ' · Modul ' + esc(m.nr) + '</div><div class="cov-nr">' + esc(t.icon || '') + ' Kapitel</div><h1>' + esc(t.titel) + '</h1>' + ((t.ziele && t.ziele.length) ? '<div class="cov-sub">' + esc(t.ziele.join(' · ')) + '</div>' : '') + '</div>';
    b += lessonBlocks(m, t.lektionen, sol, count);
    b += '<div class="foot">Mathe ' + esc((DATA.meta || {}).klasse || '') + ' · Modul ' + esc(m.nr) + ' · Kapitel „' + esc(t.titel) + '"' + (sol ? ' · Lösungsheft' : '') + '</div>';
    return { m: m, t: t, acc: acc, sol: sol, title: 'Modul ' + m.nr + ' · ' + t.titel, body: b, file: 'Mathe_Modul-' + m.nr + '_Kapitel_' + safeFile(t.titel) + (sol ? '_Loesungen' : '') + '.html' };
  }
  function printTheme(mid, tix) { var d = themeBody(mid, tix); if (d) printDoc(d.title, d.acc, d.body); }
  function downloadTheme(mid, tix) { var d = themeBody(mid, tix); if (d) downloadDoc(d.file, d.title, d.acc, d.body); }

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
    else if (a === 'download-info') { downloadInfo(t.getAttribute('data-mid'), t.getAttribute('data-nr')); }
    else if (a === 'print-ab') { printSheet(t.getAttribute('data-mid'), t.getAttribute('data-nr'), t.getAttribute('data-lvl'), state.printSol); }
    else if (a === 'download-ab') { downloadSheet(t.getAttribute('data-mid'), t.getAttribute('data-nr'), t.getAttribute('data-lvl'), state.printSol); }
    else if (a === 'print-module') { printModule(t.getAttribute('data-id')); }
    else if (a === 'download-module') { downloadModule(t.getAttribute('data-id')); }
    else if (a === 'print-theme') { printTheme(t.getAttribute('data-mid'), t.getAttribute('data-tix')); }
    else if (a === 'download-theme') { downloadTheme(t.getAttribute('data-mid'), t.getAttribute('data-tix')); }
    else if (a === 'gen-lvl') { state.gen.lvl = t.getAttribute('data-lvl'); regenGen(); updateGenBox(); }
    else if (a === 'gen-count') { state.gen.count = +t.getAttribute('data-n'); regenGen(); updateGenBox(); }
    else if (a === 'gen-new') { regenGen(); updateGenBox(); }
    else if (a === 'gen-sol') { state.gen.sol = !state.gen.sol; updateGenBox(); }
    else if (a === 'gen-print') { printGenSheet(state.mid, state.nr); }
    else if (a === 'pdf-view') { viewPdf(); }
    else if (a === 'pdf-dl') { dlPdf(); }
  }
  function init() { var el = host(); if (el && !el.getAttribute('data-wired')) { el.setAttribute('data-wired', '1'); el.addEventListener('click', onClick); } }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

  return {
    open: open, render: render, data: function () { return DATA; }, vis: VIS, gen: GEN,
    printInfo: printInfo, printSheet: printSheet,
    syncExport: function () { return { done: DONE }; },
    syncApply: function (obj) { if (obj && obj.done) { DONE = obj.done; try { localStorage.setItem(LS_DONE, JSON.stringify(DONE)); } catch (e) {} if (host()) render(); } }
  };
})();
