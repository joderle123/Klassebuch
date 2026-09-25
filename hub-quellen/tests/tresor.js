// Test des Daten-Tresors (http + OPFS als "Hub-Ordner auf dem Server")
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const OUT = __dirname, BASE = 'http://127.0.0.1:8099/';
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + String(info).slice(0, 300) : '')); } }

// ---------- Helfer, die im Browser laufen ----------
async function seed(page, tag) {
  await page.evaluate(async (tag) => {
    localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-' + tag + '-ELDIB' }));
    localStorage.setItem('isa_roster_v1', JSON.stringify([{ id: 's1', name: 'GEHEIM-' + tag + '-KIND' }]));
    await new Promise((res, rej) => {
      const r = indexedDB.open('isa_dossier_db', 2);
      r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('students', { keyPath: 'id' }); db.createObjectStore('entries', { keyPath: 'id' }); db.createObjectStore('meta', { keyPath: 'key' }); db.createObjectStore('reunions', { keyPath: 'id' }); };
      r.onsuccess = () => { const db = r.result; const tx = db.transaction(['students', 'meta'], 'readwrite');
        tx.objectStore('students').put({ id: 'stud_1', name: 'GEHEIM-' + tag + '-SCHUELER', anonLabel: '', active: true, createdAt: '2026-09-01T08:00:00.000Z' });
        tx.objectStore('meta').put({ key: 'version', value: 2 });
        tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
      r.onerror = () => rej(r.error);
    });
    // Sonderfälle: Datum, Datei, Binärdaten, Schlüssel ohne keyPath, Index
    await new Promise((res, rej) => {
      const r = indexedDB.open('test-db', 3);
      r.onupgradeneeded = () => { const db = r.result; const s = db.createObjectStore('dinge', { autoIncrement: true }); s.createIndex('nachArt', 'art'); };
      r.onsuccess = () => { const db = r.result; const tx = db.transaction('dinge', 'readwrite');
        tx.objectStore('dinge').put({ art: 'x', datum: new Date('2026-09-01T10:00:00Z'), datei: new File(['GEHEIM-' + tag + '-DATEI'], 'bericht.txt', { type: 'text/plain', lastModified: 1700000000000 }), zahlen: new Uint16Array([1, 2, 300]), leer: undefined, karte: new Map([['a', 1]]), menge: new Set([1, 2]), __t: 'falle' }, 'eintrag-1');
        tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => rej(tx.error); };
      r.onerror = () => rej(r.error);
    });
    // Datei-/Ordnerzugang einer App (wie die Toolbox): bleibt auf dem PC
    const root = await navigator.storage.getDirectory(); const ablage = await root.getDirectoryHandle('ablage-test', { create: true });
    await new Promise((res) => { const r = indexedDB.open('isa-team', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { const db = r.result; const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(ablage, 'dirHandle'); tx.oncomplete = () => { db.close(); res(); }; }; });
  }, tag);
}
async function lokal(page) {
  return page.evaluate(async () => {
    const hub = ['cdse_hub_zuletzt', 'cdse_hub_daten', 'cdse_hub_geprueft'];
    const ls = {}; const ks = []; for (let i = 0; i < localStorage.length; i++) ks.push(localStorage.key(i)); ks.sort().forEach(k => { if (!hub.includes(k) && !k.startsWith('__')) ls[k] = localStorage.getItem(k); });
    const dbs = {};
    for (const d of (await indexedDB.databases()).sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (d.name === 'cdse-hub') continue;
      const db = await new Promise(r => { const q = indexedDB.open(d.name); q.onsuccess = () => r(q.result); });
      const out = { version: db.version };
      for (const sn of Array.from(db.objectStoreNames)) {
        out[sn] = await new Promise(r => { const tx = db.transaction(sn); const st = tx.objectStore(sn); const a = st.getAll(), b = st.getAllKeys(); tx.oncomplete = () => r({ keys: b.result, vals: a.result, idx: Array.from(st.indexNames) }); });
      }
      db.close(); dbs[d.name] = out;
    }
    async function norm(v) {
      if (v instanceof File) return 'F:' + v.name + ':' + v.type + ':' + v.lastModified + ':' + await v.text();
      if (v instanceof Blob) return 'B:' + v.type + ':' + await v.text();
      if (v instanceof Date) return 'D:' + v.toISOString();
      if (ArrayBuffer.isView(v)) return v.constructor.name + ':' + Array.from(v);
      if (typeof FileSystemHandle !== 'undefined' && v instanceof FileSystemHandle) return 'H:' + v.kind + ':' + v.name;
      if (v instanceof Map) return 'M:' + JSON.stringify(Array.from(v));
      if (v instanceof Set) return 'S:' + JSON.stringify(Array.from(v));
      if (v === undefined) return 'U';
      if (Array.isArray(v)) return Promise.all(v.map(norm));
      if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = await norm(v[k]); return o; }
      return v;
    }
    return norm({ ls, dbs });
  });
}
function zeilen(l) { let n = 0; for (const d of Object.values(l.dbs)) for (const [k, s] of Object.entries(d)) if (k !== 'version') n += s.vals.length; return n; }
async function server(page) {
  return page.evaluate(async () => {
    const root = await navigator.storage.getDirectory(); const out = {};
    async function walk(dir, p) { for await (const [n, h] of dir.entries()) { if (h.kind === 'directory') await walk(h, p + n + '/'); else out[p + n] = await (await h.getFile()).text(); } }
    await walk(root, ''); return out;
  });
}
async function schreibeServer(page, pfad, text) {
  await page.evaluate(async ({ pfad, text }) => {
    const teile = pfad.split('/'); let dir = await navigator.storage.getDirectory();
    for (const t of teile.slice(0, -1)) dir = await dir.getDirectoryHandle(t, { create: true });
    const w = await (await dir.getFileHandle(teile[teile.length - 1], { create: true })).createWritable(); await w.write(text); await w.close();
  }, { pfad, text });
}
const marke = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('cdse_hub_daten') || 'null'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  let page = await ctx.newPage();
  const errors = [];
  const beobachte = (p) => { p.on('pageerror', e => errors.push(p.url().split('/').pop() + ': ' + e.message)); };
  beobachte(page);

  async function erstelle(name, team, pw, antwort) {
    const neu = await page.$('#g-neu'); if (neu) await neu.click();
    const z = await page.$('#g-zurueck'); if (z && !(await page.$('#g-name'))) { await z.click(); await page.click('#g-neu'); }
    await page.waitForSelector('#g-name');
    await page.fill('#g-name', name); await page.check('input[name="g-team"][value="' + team + '"]');
    await page.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await page.fill('#g-pw1', pw); await page.fill('#g-pw2', pw); await page.click('#g-los');
    await page.waitForSelector('#g-ok', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter');
    if (antwort) { await page.waitForSelector('#g-meins', { timeout: 30000 }); await page.screenshot({ path: OUT + '/t1-altbestand.png' }); await page.click(antwort === 'ja' ? '#g-meins' : '#g-nicht'); }
    await page.waitForSelector('#me:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(200);
  }
  async function menue(p) { p = p || page; if (await p.isVisible('#me-btn')) await p.click('#me-btn'); else await p.click('#me-ava'); }
  async function abmelden() { await menue(); await page.click('[data-konto="abmelden"]'); await page.waitForSelector('#gate .konto, #g-pw, #g-name', { timeout: 30000 }); await page.waitForTimeout(150); }
  async function anmelden(name, pw) {
    if (!(await page.$('#gate .konto[data-id]'))) { const z = await page.$('#g-zurueck'); if (z) await z.click(); }
    await page.click('#gate .konto:has-text("' + name + '")');
    await page.fill('#g-pw', pw); await page.click('#g-los');
    await page.waitForSelector('#me:not([hidden]), .meldung.fehler, #g-meins', { timeout: 30000 });
  }
  const eldib = () => page.evaluate(() => localStorage.getItem('eldib-data'));
  const sichern = () => page.evaluate(() => window.CDSE_KONTO.sichernJetzt());

  console.log('1) Alte Daten auf dem PC, erstes Konto übernimmt sie');
  await page.goto(BASE + 'hub.html');
  await seed(page, 'ANNA');
  const vorher = await lokal(page);
  check('Testdaten angelegt (' + zeilen(vorher) + ' Zeilen)', zeilen(vorher) === 4 && vorher.ls['eldib-data'], JSON.stringify(vorher).slice(0, 200));
  await page.click('#g-ordner');
  await erstelle('Anna Muster', 'annexe', 'sonnige Tage 2026', 'ja');
  const txtAlt = fs.existsSync(OUT + '/t1-altbestand.png');
  let srv = await server(page);
  const annaId = Object.keys(srv).find(n => /^konten\/anna-muster-/.test(n)).split('/')[1].replace('.json', '');
  const annaDatei = 'daten/' + annaId + '/aktuell.cdse';
  check('Frage „Gehören sie dir?“ kam', txtAlt);
  check('Tresor-Datei auf dem Server', !!srv[annaDatei], Object.keys(srv).join(', '));
  let box = JSON.parse(srv[annaDatei] || '{}');
  check('Format, Stand 1, gzip', box.format === 'cdse-daten' && box.stand === 1 && box.gzip === true, JSON.stringify({ f: box.format, s: box.stand, g: box.gzip }));
  check('Nichts im Klartext auf dem Server', !Object.values(srv).some(t => t.includes('GEHEIM')));
  const konto = JSON.parse(srv['konten/' + annaId + '.json']);
  check('Konto hat Schlüsselpaar (öffentlich + verschlossen privat)', !!konto.oeffentlich && !!konto.privat && !!konto.privat.ct);
  check('Marke: Daten gehören Anna, Stand 1', JSON.stringify(await marke(page)).includes('"konto":"' + annaId + '"') && (await marke(page)).stand === 1);
  check('Team-Ordner fürs Klassenbuch angelegt', await page.evaluate(async () => { try { const r = await navigator.storage.getDirectory(); await (await r.getDirectoryHandle('teams')).getDirectoryHandle('Annexe Junglinster'); return true; } catch (e) { return false; } }));
  check('Team-Ordner als Startpunkt für Dateidialoge hinterlegt', await page.evaluate(() => new Promise(r => { const q = indexedDB.open('cdse-hub'); q.onsuccess = () => { const g = q.result.transaction('kv').objectStore('kv').get('team-ordner'); g.onsuccess = () => r(!!g.result && g.result.kind === 'directory' && g.result.name === 'Annexe Junglinster'); g.onerror = () => r(false); }; })));
  check('Kachel zeigt Team-Datei', ((await page.textContent('.tile[data-href] .tile-datei').catch(() => '')) || '').includes('teams\\Annexe Junglinster\\klassebuch-team.json'));
  await page.screenshot({ path: OUT + '/t2-hub.png' });

  console.log('2) Automatisch sichern');
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-2' })));
  check('Änderung → gesichert', (await sichern()) === 'gesichert');
  check('Ohne Änderung → nichts geschrieben', (await sichern()) === 'unveraendert');
  srv = await server(page); box = JSON.parse(srv[annaDatei]);
  check('Stand 2 auf dem Server', box.stand === 2, box.stand);
  check('Anzeige „Gesichert um …“', /Gesichert um \d\d:\d\d/.test(await page.textContent('#foot-t')), await page.textContent('#foot-t'));
  const annaStand2 = await lokal(page);

  console.log('3) Abmelden entfernt die Daten vom PC');
  await abmelden();
  let leer = await lokal(page);
  check('localStorage leer', Object.keys(leer.ls).length === 0, Object.keys(leer.ls).join(','));
  check('IndexedDB leer (Aufbau bleibt)', zeilen(leer) === 0 && leer.dbs.isa_dossier_db && leer.dbs.isa_dossier_db.version === 2, JSON.stringify(leer.dbs).slice(0, 200));
  check('Marke: PC geleert, gehört niemandem', !((await marke(page)) || {}).konto && !!((await marke(page)) || {}).geleert, JSON.stringify(await marke(page)));

  console.log('4) Zweites Konto: startet leer');
  await erstelle('Ben Beispiel', 'diagnostique', 'Kaffee mit Milch 7', null);
  check('Keine Frage nach alten Daten (PC war leer)', !(await page.$('#g-meins')));
  check('Ben sieht keine Daten von Anna', !JSON.stringify(await lokal(page)).includes('ANNA'));
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-BEN' })));
  check('Ben gesichert', (await sichern()) === 'gesichert');
  srv = await server(page);
  const benId = Object.keys(srv).find(n => /^konten\/ben-beispiel-/.test(n)).split('/')[1].replace('.json', '');
  await abmelden();

  console.log('5) Anna meldet sich wieder an: alles ist wieder da');
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  const zurueck = await lokal(page);
  check('Daten exakt wie vor dem Abmelden (inkl. Datum, Datei, Binärdaten, Map/Set, Index)', JSON.stringify(zurueck) === JSON.stringify(annaStand2), JSON.stringify(zurueck).slice(0, 400) + ' ≠ ' + JSON.stringify(annaStand2).slice(0, 400));
  check('Ordnerzugang der App wieder da', JSON.stringify(zurueck.dbs['isa-team']).includes('H:directory:ablage-test'));

  console.log('6) Hub-Tab ohne Abmelden geschlossen, dann meldet sich Ben an');
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-3-UNGESICHERT' })));
  await page.close();
  page = await ctx.newPage(); beobachte(page);
  await page.goto(BASE + 'hub.html');
  await page.waitForSelector('#g-pw', { timeout: 15000 });
  check('Anna wird vorgeschlagen', (await page.textContent('#gate-card')).includes('Anna Muster'));
  await anmelden('Ben Beispiel', 'Kaffee mit Milch 7');
  check('Ben sieht seine Daten', (await eldib()).includes('GEHEIM-BEN'), await eldib());
  srv = await server(page); box = JSON.parse(srv[annaDatei]);
  check('Annas ungesicherte Änderung wurde für sie gesichert (Stand 3)', box.stand === 3, box.stand);
  await abmelden();
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  check('Anna hat ihre letzte Änderung', (await eldib()).includes('ANNA-3-UNGESICHERT'), await eldib());

  console.log('7) Zwei PCs gleichzeitig (Konflikt)');
  srv = await server(page); box = JSON.parse(srv[annaDatei]);
  box.stand = box.stand + 1; await schreibeServer(page, annaDatei, JSON.stringify(box));   // "anderer PC" hat gesichert
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-KONFLIKT' })));
  check('Sichern erkennt den Konflikt', (await sichern()) === 'konflikt');
  srv = await server(page);
  check('Kopie abgelegt, Stand auf dem Server nicht überschrieben', Object.keys(srv).some(n => n.startsWith('daten/' + annaId + '/konflikt-')) && JSON.parse(srv[annaDatei]).stand === 4);
  check('Warnung in der Seitenleiste', (await page.textContent('#foot-t')).includes('Achtung'));
  await page.screenshot({ path: OUT + '/t3-konflikt.png' });
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-KONFLIKT-2' })));
  await sichern();
  srv = await server(page);
  check('Weitere Änderungen landen in derselben Kopie', Object.keys(srv).filter(n => n.startsWith('daten/' + annaId + '/konflikt-')).length === 1);
  await abmelden();
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  check('Beim Anmelden: neuerer Server-Stand geladen', (await eldib()).includes('ANNA-3-UNGESICHERT'), await eldib());

  console.log('8) Frühere Stände: Kopie zurückholen');
  await menue(); await page.click('[data-konto="staende"]');
  await page.waitForSelector('.staende label', { timeout: 15000 });
  await page.screenshot({ path: OUT + '/t4-staende.png' });
  const eintraege = await page.$$eval('.staende label', l => l.map(x => x.textContent));
  check('Liste zeigt die Konflikt-Kopie', eintraege.some(t => t.includes('anderen PC')), eintraege.join(' | '));
  check('Kein Passwort nötig (Schlüssel im Speicher)', !(await page.$('#g-alt')));
  await page.click('.staende label:has-text("anderen PC")');
  await page.click('#g-los');
  await page.waitForSelector('#g-fertig', { timeout: 30000 });
  await page.click('#g-fertig');
  check('Kopie ist jetzt der aktuelle Stand', (await eldib()).includes('ANNA-KONFLIKT-2'), await eldib());
  srv = await server(page);
  check('Vorheriger Stand als Kopie gesichert', Object.keys(srv).some(n => n.startsWith('daten/' + annaId + '/vorher-')));
  check('Neuer Stand 5 auf dem Server', JSON.parse(srv[annaDatei]).stand === 5, JSON.parse(srv[annaDatei]).stand);

  console.log('9) Tagesstand');
  box = JSON.parse(srv[annaDatei]); const gestern = new Date(Date.now() - 86400000);
  const gIso = gestern.getFullYear() + '-' + String(gestern.getMonth() + 1).padStart(2, '0') + '-' + String(gestern.getDate()).padStart(2, '0');
  box.gespeichert = new Date(gestern.getFullYear(), gestern.getMonth(), gestern.getDate(), 17, 0).toISOString();
  await schreibeServer(page, annaDatei, JSON.stringify(box));
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-HEUTE' })));
  await sichern(); srv = await server(page);
  check('Stand von gestern aufbewahrt', !!srv['daten/' + annaId + '/' + gIso + '.cdse'], Object.keys(srv).filter(n => n.includes(annaId)).join(', '));

  console.log('10) Neu laden: Sichern läuft weiter (ohne Passwort)');
  await page.reload(); await page.waitForSelector('#me:not([hidden])');
  await page.waitForFunction(() => /gesichert|Gesichert/.test(document.getElementById('foot-t').textContent), null, { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-ANNA-NACH-NEULADEN' })));
  check('Nach Neuladen gesichert', (await sichern()) === 'gesichert');
  await menue(); await page.click('[data-konto="staende"]'); await page.waitForSelector('.staende label, #g-abbruch', { timeout: 15000 });
  // Seit dem Schülerbereich bleibt der private Schlüssel für die Sitzung erhalten (IndexedDB, gelöscht bei Abmelden/Sperre)
  check('Frühere Stände nach Neuladen: ohne zweites Passwort', !(await page.$('#g-alt')));
  check('Sitzungsschlüssel liegt nur für diese Sitzung vor', await page.evaluate(() => new Promise(res => { const r = indexedDB.open('cdse-hub', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('sitzung-schluessel'); q.onsuccess = () => res(!!(q.result && q.result.sid && q.result.priv)); }; })));
  await page.click('#g-abbruch');

  console.log('11) Echte App: Journal liest die zurückgeholten Daten');
  const j = await ctx.newPage(); beobachte(j);
  await j.goto(BASE + 'apps/journal.html'); await j.waitForTimeout(2500);
  const hatRepo = await j.evaluate(() => typeof window.KB_ROSTER === 'object' && typeof Storage === 'object' && Storage.mode);
  check('Journal startet (Speicher: ' + hatRepo + ')', hatRepo === 'indexeddb');
  await j.evaluate(() => window.KB_ROSTER.add('Journal Kind Test'));
  await j.waitForTimeout(300); await j.close();
  check('Journal-Daten gesichert', (await sichern()) === 'gesichert');
  await abmelden();
  const j2 = await ctx.newPage(); beobachte(j2);
  await j2.goto(BASE + 'apps/journal.html'); await j2.waitForTimeout(2000);
  check('Nach Abmelden: Journal leer', (await j2.evaluate(() => window.KB_ROSTER.list().length)) === 0);
  await j2.close();
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  check('Journal ohne Anmeldung geöffnet → Frage „ohne Anmeldung“', ((await page.textContent('#gate-card')) || '').includes('ohne Anmeldung'), (await page.textContent('#gate-card')).slice(0, 200));
  await page.screenshot({ path: OUT + '/t6-ohne-anmeldung.png' });
  await page.click('#g-meins'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  check('Hinweis: Daten ohne Anmeldung liegen als Kopie bereit', ((await page.textContent('#home-body')) || '').includes('nicht geladen'));
  const j3 = await ctx.newPage(); beobachte(j3);
  await j3.goto(BASE + 'apps/journal.html'); await j3.waitForTimeout(2500);
  const namen = await j3.evaluate(() => window.KB_ROSTER.list().map(s => s.name));
  check('Nach Anmelden: Journal hat den Schüler wieder', namen.includes('Journal Kind Test'), namen.join(', '));
  await j3.close();

  console.log('12) Fremde alte Daten: beiseitelegen und abholen');
  await abmelden();
  await page.evaluate(() => { localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-FREMD' })); });
  await anmelden('Ben Beispiel', 'Kaffee mit Milch 7');
  check('Frage kommt bei Ben', !!(await page.$('#g-meins')));
  await page.click('#g-nicht');
  await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  check('Ben hat seine eigenen Daten', (await eldib()).includes('GEHEIM-BEN'), await eldib());
  check('Hinweis „beiseitegelegt“ in der Übersicht', ((await page.textContent('#home-body')) || '').includes('beiseitegelegt'));
  await page.screenshot({ path: OUT + '/t5-hinweis.png' });
  await abmelden();
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  await menue(); await page.click('[data-konto="staende"]'); await page.waitForSelector('.staende label', { timeout: 15000 });
  await page.click('.staende label:has-text("ohne Konto")'); await page.click('#g-los');
  await page.waitForSelector('#g-fertig', { timeout: 30000 }); await page.click('#g-fertig');
  check('Anna hat die beiseitegelegten Daten übernommen', (await eldib()).includes('GEHEIM-FREMD'), await eldib());

  console.log('13) Konto von vor dem Tresor (Phase 1) bekommt sein Schlüsselpaar');
  await abmelden();
  const alt = await ctx.newPage(); beobachte(alt);
  await alt.goto(BASE + '_alt-test.html'); await alt.waitForSelector('#g-pw, #g-neu, #g-ordner', { timeout: 15000 });
  if (await alt.$('#g-ordner')) await alt.click('#g-ordner');
  if (await alt.$('#g-zurueck')) await alt.click('#g-zurueck');
  await alt.click('#g-neu'); await alt.fill('#g-name', 'Carla Alt'); await alt.check('input[name="g-team"][value="cst"]');
  await alt.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await alt.fill('#g-pw1', 'Herbst im Wald 12'); await alt.fill('#g-pw2', 'Herbst im Wald 12'); await alt.click('#g-los');
  await alt.waitForSelector('#g-ok', { timeout: 30000 }); await alt.check('#g-ok'); await alt.click('#g-weiter'); await alt.waitForSelector('#me:not([hidden])');
  await alt.close();
  srv = await server(page);
  const carlaPfad = Object.keys(srv).find(n => /^konten\/carla-alt-/.test(n));
  check('Altes Konto ohne Schlüsselpaar', carlaPfad && !JSON.parse(srv[carlaPfad]).oeffentlich);
  await page.reload(); await page.waitForSelector('#gate .konto, #g-pw', { timeout: 15000 });
  await anmelden('Carla Alt', 'Herbst im Wald 12');
  srv = await server(page);
  check('Nach Anmelden: Schlüsselpaar ergänzt', !!JSON.parse(srv[carlaPfad]).oeffentlich && !!JSON.parse(srv[carlaPfad]).privat);
  await page.evaluate(() => localStorage.setItem('eldib-data', JSON.stringify({ kind: 'GEHEIM-CARLA' })));
  check('Carla kann sichern', (await sichern()) === 'gesichert');
  await abmelden();
  await anmelden('Carla Alt', 'Herbst im Wald 12');
  check('Carla: altes Passwort gilt weiter, Daten zurück', (await eldib()).includes('GEHEIM-CARLA'));
  await abmelden();

  console.log('14) Untergeschobener Schlüssel wird erkannt');
  srv = await server(page);
  const annaKonto = srv['konten/' + annaId + '.json'];
  const gefaelscht = JSON.parse(annaKonto); gefaelscht.oeffentlich = JSON.parse(srv[carlaPfad]).oeffentlich;
  await schreibeServer(page, 'konten/' + annaId + '.json', JSON.stringify(gefaelscht));
  await page.reload(); await page.waitForSelector('#gate .konto, #g-pw', { timeout: 15000 });
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  check('Anmelden verweigert: „verändert“', ((await page.textContent('#gate-card')) || '').includes('verändert'), (await page.textContent('#gate-card')).slice(0, 200));
  await schreibeServer(page, 'konten/' + annaId + '.json', annaKonto);
  await page.reload(); await page.waitForSelector('#gate .konto, #g-pw', { timeout: 15000 });
  await anmelden('Anna Muster', 'sonnige Tage 2026');
  check('Mit echter Datei wieder in Ordnung', !!(await page.$('#me:not([hidden])')));

  console.log('14b) Zwei Hub-Tabs: Abmelden im einen beendet auch den anderen');
  const zweiter = await ctx.newPage(); beobachte(zweiter);
  await zweiter.goto(BASE + 'hub.html'); await zweiter.waitForSelector('#g-pw, #gate .konto', { timeout: 15000 });
  // zweiter Tab: eigene Sitzung (sessionStorage ist pro Tab) - Anna meldet sich dort auch an
  if (!(await zweiter.$('#g-pw'))) await zweiter.click('#gate .konto:has-text("Anna Muster")');
  await zweiter.fill('#g-pw', 'sonnige Tage 2026'); await zweiter.click('#g-los'); await zweiter.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await abmelden();
  await zweiter.waitForSelector('#gate .konto[data-id], #g-pw', { timeout: 15000 });
  check('Zweiter Tab zeigt wieder die Anmeldung', await zweiter.evaluate(() => !document.getElementById('gate').hidden && document.getElementById('me').hidden));
  check('Zweiter Tab sichert nichts Fremdes', (await zweiter.evaluate(() => window.CDSE_KONTO.sichernJetzt())) === undefined);
  await zweiter.close();
  await anmelden('Anna Muster', 'sonnige Tage 2026');

  console.log('15) Zum Schluss');
  srv = await server(page);
  check('Nirgends Klartext auf dem Server', !Object.values(srv).some(t => t.includes('GEHEIM') || t.includes('Journal Kind')), Object.keys(srv).filter(n => srv[n].includes('GEHEIM')).join(','));
  check('Keine Skriptfehler', errors.length === 0, errors.join(' | '));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler');
  await browser.close();
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.error('ABBRUCH:', e); process.exitCode = 2; });
