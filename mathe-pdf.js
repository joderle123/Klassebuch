/* KB_PDF — nativer PDF-Satz für das Mathe-Programm (jsPDF + eingebettete DejaVu-Subsets).
   Vektor-Text (scharf, durchsuchbar), Vektor-Figuren (eigener SVG-Interpreter für die
   VIS-Primitive), Atom-basierte Seitenplanung: Karten/Boxen werden nie zerschnitten. */
window.KB_PDF = (function () {
  'use strict';

  /* ---------- Konstanten (Layout in mm) ---------- */
  var PW = 210, PH = 297, ML = 14, MR = 14, MT = 13, MB = 17;
  var CW = PW - ML - MR;               /* Inhaltsbreite 182 */
  var BOT = PH - MB;                   /* untere Inhaltskante */
  var PT2MM = 0.352778;                /* 1 pt in mm */
  var INK = '#1f2333', GREY = '#6b6b7a', LINE = '#d9d9e3', SOLGREEN = '#1a7a48';
  var F = { body: 9.5, small: 8, tiny: 7.2, h1: 12.5, h2: 10.8, lh: 1.42 };

  function available() {
    return !!(window.jspdf && window.jspdf.jsPDF && window.KB_PDF_FONTS && window.KB_PDF_FONTS.regular && window.KB_PDF_FONTS.bold);
  }

  /* ---------- Text-Aufbereitung ---------- */
  var MAP = { '✅': '✓', '❌': '✗', '➡': '→', '➜': '→' };
  function sanitize(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');            /* Emojis (Astralebene) */
    s = s.replace(/[︎️‍⃣]/g, '');                /* Variation/ZWJ */
    s = s.replace(/[✅❌➡➜]/g, function (c) { return MAP[c] || c; });
    return s.replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  /* Läufe: {t, b?, col?, size?} — [[a/b]] wird zum gestapelten Bruch. */
  function tokenize(runs) {
    var out = [];
    runs.forEach(function (r) {
      var txt = sanitize(r.t);
      if (!txt) return;
      var parts = txt.split(/\[\[(\d+)\s*\/\s*(\d+)\]\]/g);
      for (var i = 0; i < parts.length; i++) {
        if (i % 3 === 1) { out.push({ frac: [parts[i], parts[i + 1]], b: r.b, col: r.col, size: r.size }); i++; continue; }
        var words = parts[i].split(' ');
        for (var w = 0; w < words.length; w++) {
          if (words[w] === '') continue;
          out.push({ t: words[w], b: r.b, col: r.col, size: r.size });
        }
      }
    });
    return out;
  }

  /* ---------- Engine-Objekt je Dokument ---------- */
  function Engine(accent) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    doc.addFileToVFS('DejaVu.ttf', window.KB_PDF_FONTS.regular);
    doc.addFont('DejaVu.ttf', 'DejaVu', 'normal');
    doc.addFileToVFS('DejaVuB.ttf', window.KB_PDF_FONTS.bold);
    doc.addFont('DejaVuB.ttf', 'DejaVu', 'bold');
    var self = { doc: doc, accent: accent, y: MT, atTop: true, footL: '', coverPages: 1 };

    function setF(b, size, col) { doc.setFont('DejaVu', b ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(col || INK); }
    function tw(t, b, size) { doc.setFont('DejaVu', b ? 'bold' : 'normal'); doc.setFontSize(size); return doc.getTextWidth(t); }
    function op(alpha) { doc.setGState(new doc.GState({ opacity: alpha })); }

    /* Zeilenumbruch: Tokens → Zeilen (greedy). */
    function layout(runs, maxW, base) {
      var size = base.size || F.body, lh = (base.lh || F.lh) * size * PT2MM;
      var toks = tokenize(runs), lines = [], cur = [], curW = 0;
      var spaceW = tw(' ', false, size);
      toks.forEach(function (tk) {
        var s = tk.size || size, wdt;
        if (tk.frac) {
          var nw = tw(tk.frac[0], tk.b, s * 0.72), dw = tw(tk.frac[1], tk.b, s * 0.72);
          wdt = Math.max(nw, dw) + 1.2; tk._w = wdt; tk._nw = nw; tk._dw = dw;
        } else { wdt = tw(tk.t, tk.b, s); tk._w = wdt; }
        var need = wdt + (cur.length ? spaceW : 0);
        if (cur.length && curW + need > maxW) { lines.push({ toks: cur, w: curW }); cur = []; curW = 0; need = wdt; }
        cur.push(tk); curW += need;
      });
      if (cur.length) lines.push({ toks: cur, w: curW });
      return { lines: lines, h: Math.max(1, lines.length) * lh, lh: lh, size: size, base: base };
    }
    function drawLayout(L, x, y, maxW, align) {
      var col = L.base.col || INK, size = L.size;
      var yy = y + L.lh * 0.75;
      L.lines.forEach(function (ln) {
        var xx = x + (align === 'center' ? (maxW - ln.w) / 2 : 0);
        var spaceW = tw(' ', false, size);
        ln.toks.forEach(function (tk) {
          var s = tk.size || size;
          if (tk.frac) {
            var fw = tk._w, fs = s * 0.72;
            setF(tk.b, fs, tk.col || col);
            doc.text(tk.frac[0], xx + (fw - tk._nw) / 2, yy - s * PT2MM * 0.28);
            doc.text(tk.frac[1], xx + (fw - tk._dw) / 2, yy + s * PT2MM * 0.52);
            doc.setDrawColor(tk.col || col); doc.setLineWidth(0.22);
            doc.line(xx, yy - s * PT2MM * 0.12, xx + fw, yy - s * PT2MM * 0.12);
          } else {
            setF(tk.b, s, tk.col || col);
            doc.text(tk.t, xx, yy);
          }
          xx += tk._w + spaceW;
        });
        yy += L.lh;
      });
    }
    /* Absatz-Atom */
    function para(runs, o) {
      o = o || {}; var maxW = o.w || CW, ind = o.indent || 0;
      var L = layout(runs, maxW - ind, { size: o.size, col: o.col, lh: o.lh });
      return { h: L.h + (o.after || 0), draw: function (x, y) { drawLayout(L, x + ind, y, maxW - ind, o.align); } };
    }

    /* ---------- SVG → Vektor-PDF (für VIS-Figuren) ---------- */
    function hex(colStr, fallback) {
      if (!colStr || colStr === 'none') return null;
      var c = String(colStr).trim().toLowerCase();
      if (c === 'white') c = '#ffffff'; else if (c === 'black') c = '#000000';
      var m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(c);
      if (m3) c = '#' + m3[1] + m3[1] + m3[2] + m3[2] + m3[3] + m3[3];
      var m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(c);
      if (!m) return { c: fallback || '#222222', a: 1 };
      return { c: '#' + m[1], a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
    }
    function svgDraw(svgStr, x, y, wmm) {
      var docp;
      try { docp = new DOMParser().parseFromString(svgStr, 'image/svg+xml'); } catch (e) { return 0; }
      var root = docp.documentElement; if (!root || root.nodeName !== 'svg') return 0;
      var vb = (root.getAttribute('viewBox') || '0 0 100 100').split(/[\s,]+/).map(Number);
      var W = vb[2] || 100, H = vb[3] || 100, sc = wmm / W, hmm = H * sc;
      function A(el, n, d) { var v = el.getAttribute(n); return v == null || v === '' ? d : v; }
      function N(el, n, d) { var v = parseFloat(el.getAttribute(n)); return isNaN(v) ? d : v; }
      function px(v) { return x + v * sc; } function py(v) { return y + v * sc; }
      function styleFor(el) {
        var f = hex(A(el, 'fill', null)), st = hex(A(el, 'stroke', null));
        var lw = N(el, 'stroke-width', 1) * sc;
        return { f: f, st: st, lw: lw };
      }
      function applyAndStyle(s) {
        var mode = '';
        if (s.f) { doc.setFillColor(s.f.c); mode += 'F'; }
        if (s.st) { doc.setDrawColor(s.st.c); doc.setLineWidth(s.lw); mode += 'D'; }
        return mode || 'D';
      }
      var els = root.getElementsByTagName('*');
      for (var i = 0; i < els.length; i++) {
        var el = els[i], tag = el.nodeName.toLowerCase(), s = styleFor(el);
        var needOp = (s.f && s.f.a < 1);
        if (needOp) op(s.f.a);
        try {
          if (tag === 'line') {
            doc.setDrawColor((s.st || { c: '#222' }).c); doc.setLineWidth(s.lw);
            var dash = A(el, 'stroke-dasharray', null);
            if (dash) { var dd = dash.split(/[\s,]+/).map(Number).map(function (v) { return v * sc; }); doc.setLineDashPattern(dd, 0); }
            doc.line(px(N(el, 'x1', 0)), py(N(el, 'y1', 0)), px(N(el, 'x2', 0)), py(N(el, 'y2', 0)));
            if (dash) doc.setLineDashPattern([], 0);
          } else if (tag === 'rect') {
            doc.rect(px(N(el, 'x', 0)), py(N(el, 'y', 0)), N(el, 'width', 0) * sc, N(el, 'height', 0) * sc, applyAndStyle(s));
          } else if (tag === 'circle') {
            doc.circle(px(N(el, 'cx', 0)), py(N(el, 'cy', 0)), N(el, 'r', 1) * sc, applyAndStyle(s));
          } else if (tag === 'polygon' || tag === 'polyline') {
            var pts = (A(el, 'points', '') || '').trim().split(/[\s,]+/).map(Number);
            if (pts.length >= 4) {
              var segs = [], px0 = pts[0], py0 = pts[1];
              for (var p = 2; p < pts.length; p += 2) { segs.push([(pts[p] - pts[p - 2]) * sc, (pts[p + 1] - pts[p - 1]) * sc]); }
              doc.lines(segs, px(px0), py(py0), [1, 1], applyAndStyle(s), tag === 'polygon');
            }
          } else if (tag === 'path') {
            drawPath(A(el, 'd', ''), s);
          } else if (tag === 'text') {
            var fsPx = N(el, 'font-size', 12), fsPt = (fsPx * sc) / PT2MM;
            var bold = /^(700|800|900|bold)$/.test(A(el, 'font-weight', '400'));
            var fill = s.f ? s.f.c : '#222222';
            setF(bold, fsPt, fill);
            var anchor = A(el, 'text-anchor', 'start');
            var txt = sanitize(el.textContent).replace(/\[\[(\d+)\s*\/\s*(\d+)\]\]/g, '$1/$2');
            var tx = px(N(el, 'x', 0)), ty = py(N(el, 'y', 0));
            var opts = { align: anchor === 'middle' ? 'center' : (anchor === 'end' ? 'right' : 'left') };
            var tr = A(el, 'transform', '');
            var rot = /rotate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(tr);
            if (rot) { opts.angle = -parseFloat(rot[1]); tx = px(parseFloat(rot[2])); ty = py(parseFloat(rot[3])); }
            doc.text(txt, tx, ty, opts);
          }
        } catch (e) {}
        if (needOp) op(1);
      }
      return hmm;
      /* Pfad mit M/L/A/Z (Bögen der VIS-Figuren) → Polylinie */
      function drawPath(d, st) {
        var toks = d.match(/[MLAZ]|-?[\d.]+/gi); if (!toks) return;
        var pts = [], cx = 0, cy = 0, k = 0;
        function num() { return parseFloat(toks[k++]); }
        while (k < toks.length) {
          var c = toks[k++];
          if (c === 'M' || c === 'L') { cx = num(); cy = num(); pts.push([cx, cy]); }
          else if (c === 'A') {
            var rx = num(), ry = num(); num(); var laf = num(), swf = num(), x2 = num(), y2 = num();
            arcPts(cx, cy, rx, ry, laf, swf, x2, y2).forEach(function (pp) { pts.push(pp); });
            cx = x2; cy = y2;
          } else if (c === 'Z' || c === 'z') { if (pts.length) pts.push(pts[0].slice()); }
          else { k--; break; }
        }
        if (pts.length < 2) return;
        var segs = [];
        for (var q = 1; q < pts.length; q++) segs.push([(pts[q][0] - pts[q - 1][0]) * sc, (pts[q][1] - pts[q - 1][1]) * sc]);
        doc.lines(segs, px(pts[0][0]), py(pts[0][1]), [1, 1], applyAndStyle(st), false);
      }
      function arcPts(x1, y1, rx, ry, laf, swf, x2, y2) {
        /* SVG-Endpunkt → Mittelpunkt (vereinfachte Standard-Umrechnung) */
        var dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
        var l = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        if (l > 1) { rx *= Math.sqrt(l); ry *= Math.sqrt(l); }
        var sq = ((rx * rx * ry * ry) - (rx * rx * dy * dy) - (ry * ry * dx * dx)) / ((rx * rx * dy * dy) + (ry * ry * dx * dx));
        sq = sq < 0 ? 0 : Math.sqrt(sq); if (laf === swf) sq = -sq;
        var cxp = sq * rx * dy / ry, cyp = -sq * ry * dx / rx;
        var cx0 = cxp + (x1 + x2) / 2, cy0 = cyp + (y1 + y2) / 2;
        function ang(ux, uy, vx, vy) {
          var dot = ux * vx + uy * vy, len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
          var a = Math.acos(Math.max(-1, Math.min(1, dot / len)));
          return (ux * vy - uy * vx < 0 ? -1 : 1) * a;
        }
        var a1 = ang(1, 0, (x1 - cx0) / rx, (y1 - cy0) / ry);
        var da = ang((x1 - cx0) / rx, (y1 - cy0) / ry, (x2 - cx0) / rx, (y2 - cy0) / ry);
        if (!swf && da > 0) da -= 2 * Math.PI;
        if (swf && da < 0) da += 2 * Math.PI;
        var out = [], n = Math.max(8, Math.ceil(Math.abs(da) / (Math.PI / 16)));
        for (var t = 1; t <= n; t++) {
          var a = a1 + da * t / n;
          out.push([cx0 + rx * Math.cos(a), cy0 + ry * Math.sin(a)]);
        }
        return out;
      }
    }

    /* ---------- Seitenfluss ---------- */
    var pending = [];
    function push(atom) { if (atom) pending.push(atom); }
    function pushAll(list) { (list || []).forEach(push); }
    function pageBreak() { pending.push({ br: true }); }
    function flow() {
      pending.forEach(function (a) {
        if (a.br) { if (!self.atTop) newPage(); return; }
        if (a.soft != null) { if (!self.atTop) { if (BOT - self.y < a.soft) newPage(); else self.y += 4; } return; }
        var h = a.h || 0;
        if (!self.atTop && self.y + h > BOT) newPage();
        a.draw(ML, self.y);
        self.y += h; self.atTop = false;
      });
      pending = [];
    }
    function newPage() { doc.addPage(); self.y = MT; self.atTop = true; }
    function finalize(footL) {
      var total = doc.getNumberOfPages();
      for (var i = 1; i <= total; i++) {
        if (i <= self.coverPages) continue;
        doc.setPage(i);
        doc.setDrawColor(LINE); doc.setLineWidth(0.2);
        doc.line(ML, PH - 11, PW - MR, PH - 11);
        setF(false, F.tiny, GREY);
        doc.text(footL, ML, PH - 7);
        doc.text('Seite ' + i + ' / ' + total, PW - MR, PH - 7, { align: 'right' });
      }
      doc.setPage(total);
    }

    /* ---------- Bausteine ---------- */
    function roundBox(x, y, w, h, o) {
      o = o || {};
      if (o.fill) { if (o.fillA != null && o.fillA < 1) op(o.fillA); doc.setFillColor(o.fill); doc.roundedRect(x, y, w, h, o.r || 2.4, o.r || 2.4, 'F'); if (o.fillA != null && o.fillA < 1) op(1); }
      if (o.stroke) { doc.setDrawColor(o.stroke); doc.setLineWidth(o.lw || 0.25); doc.roundedRect(x, y, w, h, o.r || 2.4, o.r || 2.4, 'D'); }
      if (o.bar) { doc.setFillColor(o.bar); doc.roundedRect(x, y, 1.5, h, 0.7, 0.7, 'F'); }
    }
    /* getönte Box mit fettem Auftakt + Text */
    function leadBox(lead, text, o) {
      o = o || {};
      var pad = 3.4, w = CW, innerW = w - 2 * pad - (o.bar ? 2 : 0);
      var runs = [];
      if (lead) runs.push({ t: lead + ' ', b: true, col: o.leadCol || o.accent || accent });
      runs.push({ t: text, col: o.col || INK });
      var L = layout(runs, innerW, { size: o.size || F.body });
      var h = L.h + 2 * pad;
      return {
        h: h + (o.after != null ? o.after : 3), draw: function (x, y) {
          roundBox(x, y, w, h, { fill: o.fill || accent, fillA: o.fillA != null ? o.fillA : 0.09, stroke: o.stroke, bar: o.bar ? (o.accent || accent) : null, r: o.r });
          drawLayout(L, x + pad + (o.bar ? 2 : 0), y + pad, innerW);
        }
      };
    }
    function sectionHead(txt, col) {
      var L = layout([{ t: txt, b: true, col: col || accent }], CW, { size: F.h2 });
      return { h: L.h + 3.6, draw: function (x, y) { drawLayout(L, x, y, CW); doc.setDrawColor(col || accent); op(0.35); doc.setLineWidth(0.4); doc.line(x, y + L.h + 1.2, x + CW, y + L.h + 1.2); op(1); } };
    }
    function badgePara(nr, title, text, beispiel) {
      var pad = 3.2, innerW = CW - 2 * pad - 9;
      var Lt = title ? layout([{ t: title, b: true }], innerW, { size: F.body }) : null;
      var Lx = layout([{ t: text }], innerW, { size: F.body });
      var Lb = beispiel ? layout([{ t: 'Beispiel: ', b: true, col: accent }, { t: beispiel }], innerW - 4, { size: F.small }) : null;
      var h = pad + (Lt ? Lt.h + 0.8 : 0) + Lx.h + (Lb ? Lb.h + 4.4 : 0) + pad;
      return {
        h: h + 2.6, draw: function (x, y) {
          roundBox(x, y, CW, h, { stroke: '#e6e6ef', lw: 0.25, r: 2.2 });
          doc.setFillColor(accent); doc.circle(x + pad + 3, y + pad + 3.1, 3, 'F');
          setF(true, 9, '#ffffff'); doc.text(String(nr), x + pad + 3, y + pad + 4.25, { align: 'center' });
          var yy = y + pad, xx = x + pad + 9;
          if (Lt) { drawLayout(Lt, xx, yy, innerW); yy += Lt.h + 0.8; }
          drawLayout(Lx, xx, yy, innerW); yy += Lx.h;
          if (Lb) {
            yy += 1.6;
            var bh = Lb.h + 2.4;
            roundBox(xx, yy, innerW, bh, { fill: accent, fillA: 0.07, bar: accent, r: 1.6 });
            drawLayout(Lb, xx + 3.4, yy + 1.2, innerW - 4);
          }
        }
      };
    }
    function numberedList(items, o) {
      o = o || {};
      return items.map(function (t, i) {
        var L = layout([{ t: t }], CW - 8, { size: o.size || F.body });
        return {
          h: L.h + 1.6, draw: function (x, y) {
            setF(true, o.size || F.body, o.col || accent);
            doc.text((i + 1) + '.', x + 1.5, y + L.lh * 0.75);
            drawLayout(L, x + 8, y, CW - 8);
          }
        };
      });
    }
    function musterBox(ml, idx, count) {
      var pad = 3.4, innerW = CW - 2 * pad;
      var Lt = ml.titel ? layout([{ t: (count > 1 ? 'Beispiel ' + (idx + 1) + ' · ' : '') + ml.titel, b: true, col: accent }], innerW, { size: F.small }) : null;
      var Lq = layout([{ t: ml.a, b: true }], innerW, { size: F.body });
      var steps = (ml.schritte || []).map(function (s, i) { return layout([{ t: (i + 1) + '. ', b: true, col: GREY }, { t: s }], innerW - 4, { size: F.body }); });
      var Le = ml.erg ? layout([{ t: '→ ', b: true, col: accent }, { t: ml.erg, b: true, col: accent }], innerW, { size: F.body }) : null;
      var h = pad + (Lt ? Lt.h + 1 : 0) + Lq.h + 1.6;
      steps.forEach(function (L) { h += L.h + 0.6; });
      if (Le) h += Le.h + 1;
      h += pad;
      return {
        h: h + 3, draw: function (x, y) {
          roundBox(x, y, CW, h, { fill: accent, fillA: 0.05, stroke: accent, lw: 0.3, r: 2.4 });
          var yy = y + pad;
          if (Lt) { drawLayout(Lt, x + pad, yy, innerW); yy += Lt.h + 1; }
          drawLayout(Lq, x + pad, yy, innerW); yy += Lq.h + 1.6;
          steps.forEach(function (L) { drawLayout(L, x + pad + 4, yy, innerW - 4); yy += L.h + 0.6; });
          if (Le) { yy += 0.4; drawLayout(Le, x + pad, yy, innerW); }
        }
      };
    }
    function chipRows(pairs) {
      var padX = 2.6, hCh = 6.6, gap = 2.2, rows = [], cur = [], curW = 0;
      pairs.forEach(function (p) {
        var wDe = tw(sanitize(p.de), true, F.small), wFr = tw(' ' + sanitize(p.fr), false, F.tiny);
        var w = wDe + wFr + 2 * padX;
        if (cur.length && curW + gap + w > CW) { rows.push(cur); cur = []; curW = 0; }
        cur.push({ de: p.de, fr: p.fr, w: w, wDe: wDe });
        curW += (cur.length > 1 ? gap : 0) + w;
      });
      if (cur.length) rows.push(cur);
      return rows.map(function (row) {
        return {
          h: hCh + 2, draw: function (x, y) {
            var xx = x;
            row.forEach(function (c) {
              roundBox(xx, y, c.w, hCh, { stroke: LINE, lw: 0.25, r: 2.6 });
              setF(true, F.small, INK); doc.text(sanitize(c.de), xx + padX, y + 4.4);
              setF(false, F.tiny, GREY); doc.text(sanitize(c.fr), xx + padX + c.wDe + 1.2, y + 4.4);
              xx += c.w + gap;
            });
          }
        };
      });
    }
    function figureAtom(svg, caption) {
      var pad = 3, boxW = Math.min(CW, 132), figW = boxW - 2 * pad;
      var vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      var ratio = vb ? (parseFloat(vb[2]) / parseFloat(vb[1])) : 0.6;
      var figH = figW * ratio;
      var Lc = caption ? layout([{ t: caption, col: GREY }], boxW - 2 * pad, { size: F.small }) : null;
      var h = pad + figH + (Lc ? Lc.h + 1.6 : 0) + pad;
      return {
        h: h + 3, draw: function (x, y) {
          var bx = x + (CW - boxW) / 2;
          roundBox(bx, y, boxW, h, { stroke: '#e6e6f0', lw: 0.25, r: 2.6, fill: '#fbfbfe', fillA: 1 });
          svgDraw(svg, bx + pad, y + pad, figW);
          if (Lc) drawLayout(Lc, bx + pad, y + pad + figH + 1.2, boxW - 2 * pad, 'center');
        }
      };
    }
    function barHeader(kicker, title) {
      var pad = 4, innerW = CW - 2 * pad;
      var Lk = kicker ? layout([{ t: kicker, b: true, col: '#ffffff' }], innerW, { size: F.tiny }) : null;
      var Lt = layout([{ t: title, b: true, col: '#ffffff' }], innerW, { size: F.h1, lh: 1.25 });
      var h = pad * 0.9 + (Lk ? Lk.h + 0.4 : 0) + Lt.h + pad * 0.9;
      return {
        h: h + 4, draw: function (x, y) {
          roundBox(x, y, CW, h, { fill: accent, fillA: 1, r: 3 });
          var yy = y + pad * 0.9;
          if (Lk) { op(0.85); drawLayout(Lk, x + pad, yy, innerW); op(1); yy += Lk.h + 0.4; }
          drawLayout(Lt, x + pad, yy, innerW);
        }
      };
    }
    function dot(x, y, r, col) { doc.setFillColor(col); doc.circle(x, y, r, 'F'); }

    self.setF = setF; self.tw = tw; self.op = op;
    self.layout = layout; self.drawLayout = drawLayout; self.para = para;
    self.push = push; self.pushAll = pushAll; self.pageBreak = pageBreak; self.flow = flow; self.newPage = newPage; self.finalize = finalize;
    self.leadBox = leadBox; self.sectionHead = sectionHead; self.badgePara = badgePara; self.numberedList = numberedList;
    self.musterBox = musterBox; self.chipRows = chipRows; self.figureAtom = figureAtom; self.barHeader = barHeader;
    self.roundBox = roundBox; self.dot = dot; self.svgDraw = svgDraw;
    return self;
  }

  /* ---------- Inhalts-Helfer ---------- */
  function musterlList(lek) { if (!lek.musterl) return []; return Array.isArray(lek.musterl) ? lek.musterl : [lek.musterl]; }
  function KM() { return window.KB_MATHE || {}; }
  function levelInfo(key) {
    var lg = ((KM().data && KM().data()) || {}).legende || {};
    var L = lg[key] || { label: key };
    var col = key === 'basis' ? '#2E9E5B' : (key === 'kern' ? '#E0A50A' : '#1668C4');
    return { label: L.label || key, hint: L.hint || '', col: col };
  }

  /* ---------- Seiten-Renderer ---------- */
  function lessonInfo(E, m, lek) {
    var acc = E.accent;
    E.push(E.barHeader('Lektion ' + lek.nr, lek.titel));
    if (lek.lernziel) E.push(E.leadBox('Das lernst du:', lek.lernziel, { bar: true }));
    if (lek.einstieg && lek.einstieg.text) E.push(E.leadBox(lek.einstieg.titel ? lek.einstieg.titel + '.' : '', lek.einstieg.text, { fill: '#8a8a99', fillA: 0.08, leadCol: INK }));
    if (lek.visual && KM().vis) {
      var svg = ''; try { svg = KM().vis.render(lek.visual, acc); } catch (e) {}
      if (svg) E.push(E.figureAtom(svg, lek.visual.caption || ''));
    }
    if (lek.def && lek.def.text) E.push(E.leadBox(lek.def.begriff ? lek.def.begriff + ':' : 'Definition:', lek.def.text, { fillA: 0.06, stroke: acc }));
    if (lek.erklaerung && lek.erklaerung.length) {
      E.push(E.sectionHead('Das musst du wissen'));
      lek.erklaerung.forEach(function (s, i) { E.push(E.badgePara(i + 1, s.titel || '', s.text || '', s.beispiel || '')); });
    }
    if (lek.merksatz) E.push(E.leadBox('Das merke ich mir:', lek.merksatz, { fill: '#e0b83c', fillA: 0.14, leadCol: '#9a6b12' }));
    if (lek.vorgehen && lek.vorgehen.length) {
      E.push(E.sectionHead('So gehst du vor'));
      E.pushAll(E.numberedList(lek.vorgehen));
    }
    var mls = musterlList(lek);
    if (mls.length) {
      E.push(E.sectionHead(mls.length > 1 ? 'So rechnest du — Beispiele' : 'So rechnest du — ein Beispiel'));
      mls.forEach(function (ml, i) { E.push(E.musterBox(ml, i, mls.length)); });
    }
    if (lek.wortschatz && lek.wortschatz.length) E.pushAll(E.chipRows(lek.wortschatz));
  }

  function exerciseCards(E, items, sol) {
    var doc = E.doc, acc = E.accent;
    var gap = 6, colW = (CW - gap) / 2, pad = 2.8, innerW = colW - 2 * pad - 7.2;
    var atoms = [];
    function card(it, nr) {
      var Lq = E.layout([{ t: it.a }], innerW, { size: F.body });
      var Ls = sol ? E.layout([{ t: it.l, b: true, col: SOLGREEN }], innerW, { size: F.small }) : null;
      var h = pad + Lq.h + (Ls ? Ls.h + 1.2 : 5.6) + pad;
      return {
        h: h, draw: function (x, y) {
          E.roundBox(x, y, colW, h, { stroke: '#e2e2ec', lw: 0.28, r: 2.2 });
          E.dot(x + pad + 2.4, y + pad + 2.4, 2.4, acc);
          E.setF(true, 8, '#ffffff'); doc.text(String(nr), x + pad + 2.4, y + pad + 3.35, { align: 'center' });
          E.drawLayout(Lq, x + pad + 7.2, y + pad, innerW);
          if (Ls) E.drawLayout(Ls, x + pad + 7.2, y + pad + Lq.h + 0.8, innerW);
          else { doc.setDrawColor('#b9b9c6'); doc.setLineWidth(0.25); doc.line(x + pad + 7.2, y + h - pad - 0.8, x + colW - pad, y + h - pad - 0.8); }
        }
      };
    }
    for (var i = 0; i < items.length; i += 2) {
      (function (a, b) {
        var h = Math.max(a.h, b ? b.h : 0);
        atoms.push({
          h: h + 2.4, draw: function (x, y) {
            a.draw(x, y);
            if (b) b.draw(x + colW + gap, y);
          }
        });
      })(card(items[i], i + 1), items[i + 1] ? card(items[i + 1], i + 2) : null);
    }
    return atoms;
  }
  function answerLines(E, n, w, x, y) {
    var doc = E.doc;
    for (var r = 0; r < n; r++) { doc.setDrawColor('#b9b9c6'); doc.setLineWidth(0.25); doc.line(x, y + r * 7 + 5.4, x + w, y + r * 7 + 5.4); }
    return n * 7;
  }
  function tableAtom(E, tbl) {
    var doc = E.doc, cols = tbl.cols || [], rows = tbl.rows || 3, rowH = 7.4;
    var widths = cols.map(function (c) { return Math.max(20, E.tw(sanitize(String(c)), true, F.small) + 7); });
    var totW = widths.reduce(function (a, b) { return a + b; }, 0);
    if (totW > CW - 8) { var f = (CW - 8) / totW; widths = widths.map(function (w) { return w * f; }); totW = CW - 8; }
    var h = rowH * (rows + 1);
    return {
      h: h + 3, draw: function (x, y) {
        var xx = x + 4;
        doc.setDrawColor('#9a9aa8'); doc.setLineWidth(0.25);
        for (var c = 0; c < cols.length; c++) {
          var wl = widths[c];
          for (var r = 0; r <= rows; r++) {
            doc.rect(xx, y + r * rowH, wl, rowH, 'D');
            if (r === 0) { E.setF(true, F.small, INK); doc.text(sanitize(String(cols[c])).replace(/\[\[(\d+)\s*\/\s*(\d+)\]\]/g, '$1/$2'), xx + wl / 2, y + 4.9, { align: 'center' }); }
          }
          xx += wl;
        }
      }
    };
  }
  function curatedItems(E, lek, sol) {
    var lv = lek.aufgaben || {};
    ['basis', 'kern', 'plus'].forEach(function (k) {
      var sec = lv[k]; if (!sec || !sec.items || !sec.items.length) return;
      var LI = levelInfo(k);
      E.push({
        h: 8, kwn: true, draw: function (x, y) {
          E.dot(x + 2, y + 3.4, 2, LI.col);
          E.setF(true, F.h2, INK); E.doc.text(LI.label, x + 6.4, y + 4.8);
          E.doc.setDrawColor(LINE); E.doc.setLineWidth(0.25); E.doc.line(x, y + 6.8, x + CW, y + 6.8);
        }
      });
      if (sec.hinweis) E.push(E.para([{ t: sec.hinweis, col: GREY }], { size: F.small, after: 1.5 }));
      sec.items.forEach(function (it, i) {
        var innerW = CW - 8;
        var Lq = E.layout([{ t: (i + 1) + '. ', b: true }, { t: it.a }], innerW, { size: F.body });
        var tblA = it.tbl ? tableAtom(E, it.tbl) : null;
        var Ls = sol ? E.layout([{ t: 'Lösung: ', b: true, col: SOLGREEN }, { t: it.l, col: SOLGREEN }], innerW - 4, { size: F.small }) : null;
        var linesN = sol ? 0 : (it.raum != null ? it.raum : (it.tbl ? 0 : 2));
        var h = Lq.h + (tblA ? tblA.h : 0) + (Ls ? Ls.h + 1 : linesN * 7) + 2.4;
        E.push({
          h: h, draw: function (x, y) {
            E.drawLayout(Lq, x + 2, y, innerW);
            var yy = y + Lq.h;
            if (tblA) { tblA.draw(x + 2, yy + 1); yy += tblA.h; }
            if (Ls) E.drawLayout(Ls, x + 6, yy + 1, innerW - 4);
            else if (linesN) answerLines(E, linesN, CW - 12, x + 6, yy);
          }
        });
      });
    });
  }
  function lessonExercises(E, m, lek, sol, count) {
    if (lek.gen && KM().gen) {
      var firstLevel = true;
      ['basis', 'kern', 'plus'].forEach(function (k) {
        var LI = levelInfo(k);
        var items = [];
        try { items = KM().gen.make(lek.gen, count, k) || []; } catch (e) {}
        if (!items.length) return;
        /* Niveaus fließen an, wenn genug Platz bleibt (verhindert Fast-Leerseiten);
           das erste Niveau braucht mehr Rest-Platz, sonst frische Seite. */
        E.push({ soft: firstLevel ? 110 : 64 });
        E.push(exHead(E, lek, LI));
        if (firstLevel && !sol) E.push(nameLine(E));
        firstLevel = false;
        if (LI.hint) E.push(E.para([{ t: LI.hint, col: GREY }], { size: F.small, after: 2 }));
        E.pushAll(exerciseCards(E, items, sol));
      });
    } else {
      E.push({ soft: 110 });
      E.push(exHead(E, lek, null));
      if (!sol) E.push(nameLine(E));
      curatedItems(E, lek, sol);
    }
  }
  function exHead(E, lek, LI) {
    var doc = E.doc, acc = E.accent;
    var kick = 'Lektion ' + lek.nr + ' · ' + sanitize(lek.titel);
    var title = 'Übungen' + (LI ? ' — ' + LI.label : ' — Basis · Kern · Plus');
    var Lk = E.layout([{ t: kick, b: true, col: GREY }], CW, { size: F.tiny });
    var Lt = E.layout([{ t: title, b: true }], CW - 10, { size: F.h1 });
    var h = Lk.h + Lt.h + 3;
    return {
      h: h + 2.5, draw: function (x, y) {
        E.drawLayout(Lk, x, y, CW);
        var yy = y + Lk.h + 1;
        if (LI) { E.dot(x + 2.4, yy + 2.6, 2.4, LI.col); E.drawLayout(Lt, x + 7, yy, CW - 10); }
        else E.drawLayout(Lt, x, yy, CW);
        doc.setDrawColor(acc); E.op(0.5); doc.setLineWidth(0.5); doc.line(x, y + h + 0.6, x + CW, y + h + 0.6); E.op(1);
      }
    };
  }
  function nameLine(E) {
    return {
      h: 9.5, draw: function (x, y) {
        E.roundBox(x, y, CW, 7.6, { stroke: LINE, lw: 0.25, r: 2 });
        E.setF(true, F.small, INK); E.doc.text('Name:', x + 3, y + 5);
        E.doc.setDrawColor('#b9b9c6'); E.doc.setLineWidth(0.25); E.doc.line(x + 16, y + 5.4, x + 88, y + 5.4);
        E.setF(true, F.small, INK); E.doc.text('Datum:', x + 96, y + 5);
        E.doc.line(x + 110, y + 5.4, x + CW - 4, y + 5.4);
      }
    };
  }
  function themeBand(E, t) {
    var acc = t.farbe || E.accent;
    var Lt = E.layout([{ t: 'Kapitel · ' + t.titel, b: true, col: acc }], CW - 8, { size: 13 });
    var Lz = (t.ziele && t.ziele.length) ? E.layout([{ t: t.ziele.join('  ·  '), col: GREY }], CW - 8, { size: F.small }) : null;
    var h = 3 + Lt.h + (Lz ? Lz.h + 1 : 0) + 3;
    return {
      h: h + 5, draw: function (x, y) {
        E.roundBox(x, y, CW, h, { fill: acc, fillA: 0.09, bar: acc, r: 2.6 });
        E.drawLayout(Lt, x + 6, y + 3, CW - 8);
        if (Lz) E.drawLayout(Lz, x + 6, y + 3 + Lt.h + 1, CW - 8);
      }
    };
  }
  function cover(E, m, opts) {
    var doc = E.doc, acc = E.accent, meta = ((KM().data && KM().data()) || {}).meta || {};
    var t = opts || {};
    return {
      h: 0, draw: function () {
        var y0 = 40, pad = 12;
        var titleL = E.layout([{ t: t.titel, b: true, col: '#ffffff' }], CW - 2 * pad - 12, { size: 23, lh: 1.2 });
        var subL = t.unter ? E.layout([{ t: t.unter, col: '#ffffff' }], CW - 2 * pad - 20, { size: 10.5 }) : null;
        var chips = t.chips || [];
        var chipH = chips.length ? 9 : 0, chipRowsN = 1, wsum = 0;
        var chipWs = chips.map(function (c) { var w = E.tw(sanitize(c), true, 8.5) + 7; wsum += w + 3; if (wsum > CW - 2 * pad) { chipRowsN++; wsum = w + 3; } return w; });
        var panelH = 16 + 6 + 8 + titleL.h + (subL ? subL.h + 3 : 0) + (chips.length ? chipRowsN * (chipH + 2) + 6 : 0) + 14;
        E.roundBox(ML, y0, CW, panelH, { fill: acc, fillA: 1, r: 5 });
        var yy = y0 + 15;
        E.setF(true, 8.5, '#ffffff'); E.op(0.9);
        doc.text('MATHEMATIK · ' + sanitize(meta.klasse || '5e PF'), ML + CW / 2, yy, { align: 'center' }); E.op(1);
        yy += 8;
        E.setF(true, 9.5, '#ffffff'); E.op(0.95);
        doc.text(sanitize(t.kicker || ''), ML + CW / 2, yy, { align: 'center' }); E.op(1);
        yy += 4;
        E.drawLayout(titleL, ML + pad + 6, yy, CW - 2 * pad - 12, 'center'); yy += titleL.h + 3;
        if (subL) { E.op(0.92); E.drawLayout(subL, ML + pad + 10, yy, CW - 2 * pad - 20, 'center'); E.op(1); yy += subL.h + 6; }
        if (chips.length) {
          var rowsArr = [], cur = [], curW = 0;
          chips.forEach(function (c, i) {
            var w = chipWs[i];
            if (cur.length && curW + 3 + w > CW - 2 * pad) { rowsArr.push(cur); cur = []; curW = 0; }
            cur.push({ t: c, w: w }); curW += (cur.length > 1 ? 3 : 0) + w;
          });
          if (cur.length) rowsArr.push(cur);
          rowsArr.forEach(function (row) {
            var rw = row.reduce(function (a, c) { return a + c.w; }, 0) + (row.length - 1) * 3;
            var xx = ML + (CW - rw) / 2;
            row.forEach(function (c) {
              doc.setDrawColor('#ffffff'); E.op(0.65); doc.setLineWidth(0.3); doc.roundedRect(xx, yy, c.w, chipH, 4, 4, 'D'); E.op(1);
              E.setF(true, 8.5, '#ffffff'); doc.text(sanitize(c.t), xx + c.w / 2, yy + 5.8, { align: 'center' });
              xx += c.w + 3;
            });
            yy += chipH + 2;
          });
        }
        /* Niveau-Legende unten */
        var ly = y0 + panelH + 16;
        E.setF(true, 9, GREY); doc.text('Drei Niveaus in jedem Übungsteil', ML + CW / 2, ly, { align: 'center' });
        var lv = [['basis', 'Basis'], ['kern', 'Kern'], ['plus', 'Plus']], lx = ML + CW / 2 - 42;
        lv.forEach(function (pair) {
          var LI = levelInfo(pair[0]);
          E.dot(lx, ly + 8, 2.2, LI.col);
          E.setF(true, 9, INK); doc.text(pair[1], lx + 4, ly + 9.4);
          lx += 30;
        });
        if (t.solHint) { E.setF(true, 9.5, SOLGREEN); doc.text('LÖSUNGSHEFT (für die Lehrperson)', ML + CW / 2, ly + 22, { align: 'center' }); }
        E.setF(false, 8, GREY);
        doc.text(sanitize((meta.quelle || '')), ML + CW / 2, PH - 26, { align: 'center', maxWidth: CW - 20 });
        self_footNote(doc);
      }
    };
    function self_footNote(doc) {
      E.setF(false, 8, GREY);
      doc.text('Eigenes Unterrichtsmaterial · erstellt mit dem Klassebuch', ML + CW / 2, PH - 18, { align: 'center' });
    }
  }

  /* ---------- Dokumente ---------- */
  function buildDoc(spec, onProgress) {
    var data = (KM().data && KM().data()) || { module: [] };
    var m = null;
    (data.module || []).forEach(function (mm) { if (mm.id === spec.mid) m = mm; });
    if (!m) throw new Error('Modul nicht gefunden');
    var acc = spec.accent || m.farbe || '#6C4CE0';
    var E = Engine(acc);
    var count = Math.max(12, spec.count || 24);
    var sol = !!spec.sol;
    function flatThemes() { return m.themen || []; }
    function lessonsOf(t) { return t.lektionen || []; }
    var footBase = 'Mathe ' + sanitize((data.meta || {}).klasse || '') + ' · Modul ' + m.nr;

    if (spec.kind === 'module' || spec.kind === 'theme') {
      var themes = spec.kind === 'theme' ? [flatThemes()[+spec.tix]] : flatThemes();
      if (!themes[0]) throw new Error('Kapitel nicht gefunden');
      var covOpts = spec.kind === 'theme'
        ? { kicker: 'MODUL ' + m.nr + ' · KAPITEL', titel: themes[0].titel, unter: (themes[0].ziele || []).join(' · '), chips: lessonsOf(themes[0]).map(function (l) { return 'Lektion ' + l.nr; }), solHint: sol }
        : { kicker: 'MODUL ' + m.nr, titel: m.titel, unter: m.unter || '', chips: flatThemes().map(function (t) { return t.titel; }), solHint: sol };
      E.push(cover(E, m, covOpts)); E.flow();
      var totalLessons = themes.reduce(function (a, t) { return a + lessonsOf(t).length; }, 0), done = 0;
      themes.forEach(function (t, ti) {
        var tAcc = t.farbe || acc;
        lessonsOf(t).forEach(function (lek, li) {
          E.accent = tAcc;
          E.pageBreak();
          if (li === 0) E.push(themeBand(E, t));
          lessonInfo(E, m, lek);
          lessonExercises(E, m, lek, sol, count);
          E.flow();
          done++;
          if (onProgress) onProgress(6 + Math.round(done / totalLessons * 88), 'Lektion ' + done + ' / ' + totalLessons);
        });
      });
      E.accent = acc;
      E.finalize(footBase + (spec.kind === 'theme' ? ' · Kapitel „' + sanitize(themes[0].titel) + '"' : ' · ' + sanitize(m.titel)) + (sol ? ' · Lösungsheft' : ''));
      return E.doc;
    }

    /* Einzel-Dokumente: Lektion suchen */
    var found = null, theme = null;
    flatThemes().forEach(function (t) { lessonsOf(t).forEach(function (l) { if (String(l.nr) === String(spec.nr)) { found = l; theme = t; } }); });
    if (!found) throw new Error('Lektion nicht gefunden');
    E.accent = (theme && theme.farbe) || acc;
    E.coverPages = 0;

    if (spec.kind === 'info') {
      E.push(E.barHeader('Modul ' + m.nr + ' · ' + sanitize(theme.titel) + ' · Infoblatt', found.titel));
      lessonInfo2(E, m, found);
      E.flow();
      E.finalize(footBase + ' · Infoblatt · Lektion ' + found.nr);
      return E.doc;
    }
    if (spec.kind === 'sheet') {
      var LI = levelInfo(spec.level);
      E.push(E.barHeader('Modul ' + m.nr + ' · ' + sanitize(theme.titel) + ' · Arbeitsblatt — ' + LI.label, found.titel));
      E.push(nameLine(E));
      if (found.merksatz) E.push(E.leadBox('Denk dran:', found.merksatz, { fillA: 0.07, bar: true }));
      var ml0 = musterlList(found)[0];
      if (ml0) E.push(E.musterBox(ml0, 0, 1));
      E.push(E.sectionHead('Deine Aufgaben'));
      var sec = ((found.aufgaben || {})[spec.level]) || { items: [] };
      if (sec.hinweis) E.push(E.para([{ t: sec.hinweis, col: GREY }], { size: F.small, after: 1.5 }));
      (sec.items || []).forEach(function (it, i) {
        var innerW = CW - 8;
        var Lq = E.layout([{ t: (i + 1) + '. ', b: true }, { t: it.a }], innerW, { size: F.body });
        var tblA = it.tbl ? tableAtom(E, it.tbl) : null;
        var Ls = sol ? E.layout([{ t: 'Lösung: ', b: true, col: SOLGREEN }, { t: it.l, col: SOLGREEN }], innerW - 4, { size: F.small }) : null;
        var linesN = sol ? 0 : (it.raum != null ? it.raum : (it.tbl ? 0 : 2));
        var h = Lq.h + (tblA ? tblA.h : 0) + (Ls ? Ls.h + 1 : linesN * 7) + 2.6;
        E.push({
          h: h, draw: function (x, y) {
            E.drawLayout(Lq, x + 2, y, innerW);
            var yy = y + Lq.h;
            if (tblA) { tblA.draw(x + 2, yy + 1); yy += tblA.h; }
            if (Ls) E.drawLayout(Ls, x + 6, yy + 1, innerW - 4);
            else if (linesN) answerLines(E, linesN, CW - 12, x + 6, yy);
          }
        });
      });
      E.flow();
      E.finalize(footBase + ' · Arbeitsblatt ' + LI.label + ' · Lektion ' + found.nr + (sol ? ' · Lösungsblatt' : ''));
      return E.doc;
    }
    throw new Error('Unbekannter Dokumenttyp');

    function lessonInfo2(E2, m2, lek2) { lessonInfo(E2, m2, lek2); }
  }

  function save(spec, hooks) {
    hooks = hooks || {};
    setTimeout(function () {
      try {
        var doc = buildDoc(spec, hooks.progress || function () {});
        if (hooks.progress) hooks.progress(99, 'Speichern …');
        doc.save(spec.filename || 'Dokument.pdf');
        if (hooks.done) hooks.done(doc.getNumberOfPages());
      } catch (e) {
        if (hooks.fail) hooks.fail(e);
      }
    }, 60);
  }

  return { available: available, build: buildDoc, save: save };
})();
