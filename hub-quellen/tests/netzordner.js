// Test-Werkzeug: ein gemeinsamer Ordner wie O:\ im Netz – für mehrere Browser-Kontexte (= mehrere PCs).
// Die Dateien liegen wirklich auf der Festplatte (Node-Dateisystem). Jeder Kontext bekommt eine Attrappe
// der File System Access API (window.__CDSE_TEST_ORDNER), die über eine Playwright-Bindung hierher ruft.
// Wie im Netz: jede Anfrage dauert ein wenig (Verzögerung), Schreiben geht über eine Tauschdatei mit
// anschließendem Umbenennen (wie Chrome mit .crswap), und auf Wunsch schlagen einzelne Zugriffe
// vorübergehend fehl (NotReadableError / NoModificationAllowedError) – wie bei einer gerade belegten Datei.
const fs = require('fs'), fsp = fs.promises, path = require('path');

function netzordner(root, opt) {
  opt = opt || {};
  const verz = opt.verzoegerung || [3, 25];
  const wackelig = opt.wackelig || 0;
  const stat = { lesen: 0, info: 0, schreiben: 0, liste: 0, fehler: 0, sperren: 0 };
  const ROOT = path.resolve(root);
  function pfad(p) {
    const teile = String(p || '').split('/').filter(Boolean);
    if (teile.some(t => t === '..' || t === '.')) throw new Error('ungültiger Pfad');
    return path.join(ROOT, ...teile);
  }
  function pause(f) { const ms = (verz[0] + Math.random() * (verz[1] - verz[0])) * (f || 1); return new Promise(r => setTimeout(r, ms)); }
  async function op(_quelle, art, a) {
    a = a || {};
    await pause();
    try {
      switch (art) {
        case 'dir': {
          const q = pfad(a.p);
          if (a.create) { await fsp.mkdir(q, { recursive: true }); return { ok: true }; }
          try { const s = await fsp.stat(q); return s.isDirectory() ? { ok: true } : { fehler: 'TypeMismatchError' }; } catch (e) { return { fehler: 'NotFoundError' }; }
        }
        case 'datei': {
          const q = pfad(a.p);
          try { const s = await fsp.stat(q); return s.isFile() ? { ok: true } : { fehler: 'TypeMismatchError' }; }
          catch (e) {
            if (!a.create) return { fehler: 'NotFoundError' };
            await fsp.mkdir(path.dirname(q), { recursive: true });
            await fsp.writeFile(q, '', { flag: 'a' });
            return { ok: true };
          }
        }
        case 'lesen': {
          stat.lesen++;
          if (/\/sperren\//.test('/' + a.p)) stat.sperren++;
          if (wackelig && Math.random() < wackelig) { stat.fehler++; return { fehler: 'NotReadableError', text: 'Datei gerade belegt (Test)' }; }
          const q = pfad(a.p);
          try { const [t, s] = await Promise.all([fsp.readFile(q, 'utf8'), fsp.stat(q)]); return { text: t, lastModified: Math.floor(s.mtimeMs), size: s.size }; }
          catch (e) { return { fehler: e.code === 'ENOENT' ? 'NotFoundError' : 'NotReadableError', text: String(e.message || e) }; }
        }
        case 'info': {
          stat.info++;
          const q = pfad(a.p);
          try { const s = await fsp.stat(q); return { lastModified: Math.floor(s.mtimeMs), size: s.size }; }
          catch (e) { return { fehler: e.code === 'ENOENT' ? 'NotFoundError' : 'NotReadableError', text: String(e.message || e) }; }
        }
        case 'schreiben': {
          stat.schreiben++;
          if (wackelig && Math.random() < wackelig) { stat.fehler++; return { fehler: 'NoModificationAllowedError', text: 'Datei gerade belegt (Test)' }; }
          const q = pfad(a.p);
          const tmp = q + '.' + Math.random().toString(36).slice(2, 8) + '.crswap';
          await fsp.mkdir(path.dirname(q), { recursive: true });
          await fsp.writeFile(tmp, a.text == null ? '' : String(a.text));
          await pause(1.5);           // Übertragung im Netz – das Fenster, in dem andere dazwischenkommen können
          await fsp.rename(tmp, q);
          return { ok: true };
        }
        case 'loeschen': {
          const q = pfad(a.p);
          try { await fsp.rm(q, { recursive: !!a.recursive }); return { ok: true }; } catch (e) { return { fehler: 'NotFoundError' }; }
        }
        case 'liste': {
          stat.liste++;
          const q = pfad(a.p);
          try {
            const l = await fsp.readdir(q, { withFileTypes: true });
            return { eintraege: l.filter(e => !/\.crswap$/.test(e.name)).map(e => ({ name: e.name, kind: e.isDirectory() ? 'directory' : 'file' })) };
          } catch (e) { return { eintraege: [] }; }
        }
      }
      return { fehler: 'NotSupportedError' };
    } catch (e) { return { fehler: 'UnknownError', text: String(e && e.message || e) }; }
  }
  return { op, stat, root: ROOT };
}

// Läuft im Browser: baut Ordner- und Datei-Objekte, die über window.__nf ins Node-Dateisystem rufen.
const initSkript = function () {
  function fehlerAus(r) { return new DOMException(r.text || r.fehler, r.fehler); }
  function rufe(art, a) { return window.__nf(art, a).then(function (r) { if (r && r.fehler) { throw fehlerAus(r); } return r; }); }
  function datei(p, name) {
    return {
      kind: 'file', name: name, __p: p,
      /* wie im Browser: getFile() liefert nur den Stand (Zeit, Größe); gelesen wird erst mit text() */
      getFile: function () {
        return rufe('info', { p: p }).then(function (r) {
          var text = function () { return rufe('lesen', { p: p }).then(function (x) { return x.text; }); };
          return { name: name, lastModified: r.lastModified, size: r.size, type: '', text: text,
            arrayBuffer: function () { return text().then(function (t) { return new TextEncoder().encode(t).buffer; }); } };
        });
      },
      createWritable: function () {
        var teile = [];
        return Promise.resolve({
          write: function (d) {
            var w = typeof d === 'string' ? Promise.resolve(d) : (d instanceof Blob ? d.text() : (d && d.data !== undefined ? Promise.resolve(String(d.data)) : Promise.resolve(new TextDecoder().decode(d))));
            return w.then(function (t) { teile.push(t); });
          },
          close: function () { return rufe('schreiben', { p: p, text: teile.join('') }).then(function () { return undefined; }); },
          abort: function () { teile = []; return Promise.resolve(); }
        });
      },
      isSameEntry: function (o) { return Promise.resolve(!!o && o.__p === p); },
      queryPermission: function () { return Promise.resolve('granted'); },
      requestPermission: function () { return Promise.resolve('granted'); }
    };
  }
  function ordner(p, name) {
    function eintrag(e) { var q = (p ? p + '/' : '') + e.name; return e.kind === 'directory' ? ordner(q, e.name) : datei(q, e.name); }
    function iter(abbild) {
      var l = null, i = 0;
      var it = {
        next: function () {
          var w = l ? Promise.resolve(l) : rufe('liste', { p: p }).then(function (r) { l = r.eintraege; return l; });
          return w.then(function (liste) {
            if (i >= liste.length) { return { done: true, value: undefined }; }
            var e = liste[i]; i++;
            return { done: false, value: abbild(e, eintrag(e)) };
          });
        }
      };
      it[Symbol.asyncIterator] = function () { return it; };
      return it;
    }
    return {
      kind: 'directory', name: name, __p: p,
      getDirectoryHandle: function (n, o) { var q = (p ? p + '/' : '') + n; return rufe('dir', { p: q, create: !!(o && o.create) }).then(function () { return ordner(q, n); }); },
      getFileHandle: function (n, o) { var q = (p ? p + '/' : '') + n; return rufe('datei', { p: q, create: !!(o && o.create) }).then(function () { return datei(q, n); }); },
      removeEntry: function (n, o) { return rufe('loeschen', { p: (p ? p + '/' : '') + n, recursive: !!(o && o.recursive) }).then(function () { return undefined; }); },
      values: function () { return iter(function (e, h) { return h; }); },
      entries: function () { return iter(function (e, h) { return [e.name, h]; }); },
      keys: function () { return iter(function (e) { return e.name; }); },
      isSameEntry: function (o) { return Promise.resolve(!!o && o.__p === p); },
      queryPermission: function () { return Promise.resolve('granted'); },
      requestPermission: function () { return Promise.resolve('granted'); }
    };
  }
  window.__CDSE_TEST_ORDNER = function () { return Promise.resolve(ordner('', 'O')); };
};

async function verbinden(ctx, nord) {
  await ctx.exposeBinding('__nf', (quelle, art, a) => nord.op(quelle, art, a));
  await ctx.addInitScript(initSkript);
}

module.exports = { netzordner, initSkript, verbinden };
