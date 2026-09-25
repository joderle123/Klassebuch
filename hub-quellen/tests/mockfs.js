// Ordner-Attrappe fuer Tests auf file:// (dort gibt es kein OPFS). Inhalt liegt in localStorage.
window.__CDSE_TEST_ORDNER = function () {
  var KEY = '__mockfs';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(m) { localStorage.setItem(KEY, JSON.stringify(m)); }
  function nf() { return Promise.reject(new DOMException('nicht gefunden', 'NotFoundError')); }
  function file(p) {
    return { kind: 'file', name: p.split('/').pop(),
      getFile: function () { var m = load(); if (!(p in m)) { return nf(); } return Promise.resolve(new File([m[p]], p.split('/').pop())); },
      createWritable: function () { var buf = ''; return Promise.resolve({
        write: function (d) { if (typeof d === 'string') { buf += d; return Promise.resolve(); } return (d instanceof Blob ? d.text() : Promise.resolve(new TextDecoder().decode(d))).then(function (t) { buf += t; }); },
        close: function () { var m = load(); m[p] = buf; save(m); return Promise.resolve(); } }); } };
  }
  function dir(path) {
    return { kind: 'directory', name: path.split('/').pop(),
      getDirectoryHandle: function (n) { return Promise.resolve(dir(path + '/' + n)); },
      getFileHandle: function (n, o) { var p = path + '/' + n, m = load(); if (!(p in m)) { if (o && o.create) { m[p] = ''; save(m); } else { return nf(); } } return Promise.resolve(file(p)); },
      removeEntry: function (n) { var m = load(); delete m[path + '/' + n]; save(m); return Promise.resolve(); },
      values: function () { var m = load(), pre = path + '/', names = Object.keys(m).filter(function (k) { return k.indexOf(pre) === 0 && k.slice(pre.length).indexOf('/') < 0; }), i = 0;
        var it = { next: function () { return Promise.resolve(i < names.length ? { done: false, value: file(names[i++]) } : { done: true, value: undefined }); } };
        it[Symbol.asyncIterator] = function () { return it; }; return it; },
      queryPermission: function () { return Promise.resolve('granted'); },
      requestPermission: function () { return Promise.resolve('granted'); } };
  }
  return Promise.resolve(dir('root'));
};
