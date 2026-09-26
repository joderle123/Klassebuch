// Test: Viele Personen gleichzeitig am gemeinsamen Hub-Ordner (wie O:\ im Netz).
// Jeder Browser-Kontext ist ein eigener PC mit eigener Anmeldung; alle arbeiten auf demselben Ordner
// auf der Festplatte (tests/netzordner.js) – mit Netz-Verzögerung und gelegentlich belegten Dateien.
// Geprüft: gleichzeitig Konten anlegen, gleichzeitig freischalten (Schlüsselring und Rollen gehen nicht
// verloren), gleichzeitig ins selbe Dossier schreiben (keine Änderung geht verloren, keine Fehlermeldung),
// viele Dossiers (Liste lädt, beim Aktualisieren werden nur geänderte Dateien gelesen), Hinweis auf fremde
// Änderungen im offenen Dossier, Zugang entziehen + Schlüssel erneuern während andere schreiben,
// verwaiste Sperre (PC abgestürzt), 120 Konten mit Schlüsselwechsel.
// Nur erfundene Personen. Aufruf: node tests/gleichzeitig.js
//   PERSONEN=12 (PCs gleichzeitig), WACKELIG=0.03 (Anteil belegter Zugriffe), DOSSIERS=25 (je PC), KONTEN=120 (insgesamt)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const { netzordner, verbinden } = require('./netzordner');
const BASE = process.env.BASE || 'http://127.0.0.1:8099/hub.html';
const N = Math.max(12, +process.env.PERSONEN || 12);
const WACKELIG = process.env.WACKELIG != null ? +process.env.WACKELIG : 0.03;
const JE_PC = +process.env.DOSSIERS || 25;
const KONTEN = Math.max(N, +process.env.KONTEN || 120);
const NUR = process.env.NUR || '';   // z. B. NUR=grundlage: nur Konten, Freischalten, gleichzeitiges Schreiben
const OUT = path.join(__dirname, 'gleichzeitig-aus');   // Bilder (nicht im Repository)
const warte = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }
const NAMEN = [['Mia Muster', 'diagnostique'], ['Ben Beispiel', 'annexe'], ['Lea Probe', 'isa'], ['Tom Fiktiv', 'diagnostique'], ['Nina Beispiel', 'annexe'], ['Paul Muster', 'isa'],
  ['Emma Probe', 'diagnostique'], ['Jana Fiktiv', 'annexe'], ['Max Muster', 'isa'], ['Sara Beispiel', 'diagnostique'], ['Luca Probe', 'annexe'], ['Noah Fiktiv', 'isa'],
  ['Ida Muster', 'diagnostique'], ['Finn Beispiel', 'annexe'], ['Lina Probe', 'isa'], ['Jonas Fiktiv', 'diagnostique']];

(async () => {
  const t0 = Date.now();
  const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cdse-netz-'));
  const nord = netzordner(ROOT, { verzoegerung: [2, 18], wackelig: WACKELIG });
  const browser = await chromium.launch();
  const pcs = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    await verbinden(ctx, nord);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fehler.push(m.text()); });
    page.on('dialog', d => d.accept());
    await page.goto(BASE);
    const nm = NAMEN[i % NAMEN.length];
    pcs.push({ i, ctx, page, fehler, name: nm[0] + (i >= NAMEN.length ? ' ' + i : ''), team: nm[1], pw: 'Sonnenblume Test ' + (1000 + i) });
  }
  const T = (pc, fn, arg) => pc.page.evaluate(fn, arg);
  async function kontoAnlegen(pc, erstes) {
    const p = pc.page;
    await p.waitForSelector('#g-ordner', { timeout: 60000 }); await p.click('#g-ordner');
    if (!erstes) { await p.waitForSelector('#g-neu', { timeout: 60000 }); await p.click('#g-neu'); }
    await p.waitForSelector('#g-name', { timeout: 60000 });
    await p.fill('#g-name', pc.name); await p.check('input[name="g-team"][value="' + pc.team + '"]');
    await p.evaluate(() => { const r = document.querySelector('#g-resp'); if (r && !r.value) { r.value = '-'; } });
    await p.fill('#g-pw1', pc.pw); await p.fill('#g-pw2', pc.pw); await p.click('#g-los');
    await p.waitForSelector('#g-code', { timeout: 120000 }); await p.check('#g-ok'); await p.click('#g-weiter');
    await p.waitForSelector('#me:not([hidden])', { timeout: 120000 });
    pc.id = await p.evaluate(() => CDSE_KONTO.ich().id);
  }
  const ringVonPlatte = () => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'gemeinsam', 'schluessel.json'), 'utf8')); } catch (e) { return null; } };

  console.log('1) ' + N + ' PCs legen gleichzeitig ihr Konto an');
  let t = Date.now();
  await kontoAnlegen(pcs[0], true);
  await Promise.all(pcs.slice(1).map(pc => kontoAnlegen(pc)));
  const konten = fs.readdirSync(path.join(ROOT, 'konten')).filter(n => /\.json$/.test(n));
  check(N + ' Konto-Dateien im Ordner (' + Math.round((Date.now() - t) / 1000) + ' s)', konten.length === N, konten.length);

  console.log('2) Schülerbereich einrichten, zwei Responsables, dann gleichzeitig freischalten');
  await T(pcs[0], async () => { await CDSE_KONTO.kontenNeu(); await CDSE_TEAM.einrichten(); return (await CDSE_TEAM.laden()).art; });
  await T(pcs[0], async ids => { await CDSE_KONTO.kontenNeu(); for (const id of ids) { await CDSE_TEAM.freischalten(id); await CDSE_TEAM.rolleSetzen(id, 'responsable'); } }, [pcs[1].id, pcs[2].id]);
  for (const pc of pcs.slice(1, 3)) { const z = await T(pc, async () => { await CDSE_KONTO.kontenNeu(); return (await CDSE_TEAM.laden()).art; }); check(pc.name + ': Responsable, Bereich offen', z === 'bereit', z); }
  const rest = pcs.slice(3).map(p => p.id);
  const gruppen = [0, 1, 2].map(k => rest.filter((_, j) => j % 3 === k));
  t = Date.now();
  const fFrei = await Promise.all([0, 1, 2].map(k => T(pcs[k], async ids => {
    const f = []; await CDSE_KONTO.kontenNeu();
    await Promise.all(ids.map(async id => { try { await CDSE_TEAM.freischalten(id); } catch (e) { f.push(String(e && e.message || e)); } }));
    return f;
  }, gruppen[k])));
  const ring = ringVonPlatte();
  const imRing = ring ? Object.keys(ring.fuer || {}).length : 0;
  check('Freischalten ohne Fehlermeldung (' + Math.round((Date.now() - t) / 1000) + ' s)', fFrei.flat().length === 0, fFrei.flat());
  check('Schlüsselring: alle ' + N + ' Konten freigeschaltet (keine Freischaltung verloren)', imRing === N, imRing + ' von ' + N);
  const zst = await Promise.all(pcs.map(pc => T(pc, async () => { await CDSE_KONTO.kontenNeu(); return (await CDSE_TEAM.laden()).art; })));
  check('Alle ' + N + ' PCs können den Schülerbereich öffnen', zst.every(z => z === 'bereit'), zst);
  const mitgl = await T(pcs[0], () => CDSE_TEAM.mitglieder().filter(k => k.freigeschaltet).map(k => k.rolle));
  check('Rollenliste vollständig (' + N + ' Mitglieder, 2 Responsables, 1 Verwaltung)', mitgl.length === N && mitgl.filter(r => r === 'responsable').length === 2 && mitgl.filter(r => r === 'admin').length === 1, mitgl);

  console.log('3) Alle schreiben gleichzeitig ins selbe Dossier (3 Runden)');
  const tom = await T(pcs[0], async () => (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geburtsdatum: '2015-04-04', klasse: 'C3.1' }, { stelle: 'diagnostique' })).id);
  await T(pcs[0], async a => { await CDSE_TEAM.ops.rechtGeben(a.id, a.alle[0]); for (const k of a.alle.slice(1)) { await CDSE_TEAM.ops.rechtGeben(a.id, k); } }, { id: tom, alle: pcs.slice(1).map(p => p.id) });
  let fehlerSchreiben = [];
  for (let runde = 1; runde <= 3; runde++) {
    t = Date.now();
    const f = await Promise.all(pcs.map(pc => T(pc, async a => {
      try { await CDSE_TEAM.ops.eintrag(a.id, { art: 'notiz', titel: 'Runde ' + a.r + ' von ' + a.n, text: 'Gleichzeitig eingetragen' }); return ''; }
      catch (e) { return String(e && e.message || e); }
    }, { id: tom, r: runde, n: pc.name })));
    fehlerSchreiben = fehlerSchreiben.concat(f.filter(Boolean));
    const d = await T(pcs[0], async id => (await CDSE_TEAM.dossier(id, true)).eintraege.map(e => e.titel), tom);
    const da = pcs.filter(pc => d.includes('Runde ' + runde + ' von ' + pc.name)).length;
    check('Runde ' + runde + ': alle ' + N + ' Einträge im Dossier (' + Math.round((Date.now() - t) / 100) / 10 + ' s)', da === N, da + ' von ' + N + (f.filter(Boolean).length ? ' · Fehler: ' + f.filter(Boolean).length : ''));
  }
  check('Keine Fehlermeldung beim gleichzeitigen Schreiben', fehlerSchreiben.length === 0, fehlerSchreiben.slice(0, 3));
  const dv = await T(pcs[0], async id => { const d = await CDSE_TEAM.dossier(id, true); return { rev: d.rev, verlauf: d.verlauf.filter(v => /^Eintrag: Runde/.test(v.t)).length }; }, tom);
  check('Verlauf: jede Änderung genau einmal protokolliert', dv.verlauf === 3 * N, dv);

  if (NUR !== 'grundlage') {
    console.log('4) Viele Dossiers: jede Person legt ' + JE_PC + ' an – gleichzeitig');
    t = Date.now();
    await Promise.all(pcs.map(pc => T(pc, async a => {
      for (let j = 0; j < a.n; j++) { await CDSE_TEAM.neuesDossier({ nachname: 'Beispiel', vorname: 'Kind ' + a.i + '-' + j, geburtsdatum: '2014-01-0' + (1 + j % 9) }, {}); }
    }, { i: pc.i, n: JE_PC })));
    const soll = N * JE_PC + 1;
    check(soll + ' Dossiers angelegt (' + Math.round((Date.now() - t) / 1000) + ' s)', fs.readdirSync(path.join(ROOT, 'gemeinsam', 'schueler')).filter(n => /\.cdse$/.test(n)).length === soll);
    const pc5 = pcs[5 % N];
    t = Date.now();
    const anz = await T(pc5, async () => (await CDSE_TEAM.alleDossiers(true)).length);
    const erst = Date.now() - t;
    check('Liste lädt alle ' + soll + ' Dossiers (' + (erst / 1000).toFixed(1) + ' s)', anz === soll, anz);
    await T(pcs[1], async id => { await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Nur eine Änderung' }); }, tom);
    const vorher = nord.stat.lesen;
    t = Date.now();
    const anz2 = await T(pc5, async () => (await CDSE_TEAM.alleDossiers(true)).length);
    const gelesen = nord.stat.lesen - vorher, zweit = Date.now() - t;
    check('Aktualisieren nach einer Änderung: nur geänderte Dateien gelesen (' + gelesen + ' Lesezugriffe, ' + (zweit / 1000).toFixed(1) + ' s)', anz2 === soll && gelesen <= 5, { gelesen, zweit });

    console.log('5) Hinweis im offenen Dossier, wenn jemand anderes speichert');
    const pA = pcs[3], pB = pcs[4];
    await pA.page.evaluate(() => { window.__CDSE_PRUEF_MS = 300; });
    await pA.page.evaluate(h => { location.hash = h; }, '#/schueler/' + tom);
    await pA.page.waitForSelector('.ar-dkopf', { timeout: 30000 });
    await warte(1500);
    check('Ohne fremde Änderung kein Hinweis', await pA.page.isHidden('#ar-fremd'));
    await T(pB, async id => { await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Neu von nebenan' }); }, tom);
    let hinweis = '';
    try { await pA.page.waitForSelector('#ar-fremd:not([hidden])', { timeout: 15000 }); hinweis = await pA.page.textContent('#ar-fremd'); } catch (e) { }
    check('Hinweis erscheint und nennt, wer geändert hat', hinweis.includes(pB.name) && hinweis.includes('Neuen Stand anzeigen'), hinweis);
    if (hinweis) {
      fs.mkdirSync(OUT, { recursive: true });
      await pA.page.screenshot({ path: path.join(OUT, 'g1-hinweis.png'), clip: { x: 0, y: 0, width: 1280, height: 420 } });
      await pA.page.click('[data-ar="fremd-neu"]');
      await pA.page.click('.ar-tabs [data-tab="eintraege"]');
      await warte(300);
      check('„Neuen Stand anzeigen“: fremder Eintrag sichtbar, Hinweis weg', (await pA.page.textContent('#ar-tabinhalt')).includes('Neu von nebenan') && await pA.page.isHidden('#ar-fremd'));
    }
    await T(pA, async id => { await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Eigene Notiz' }); }, tom);
    await warte(1500);
    check('Eigene Änderung löst keinen Hinweis aus', await pA.page.isHidden('#ar-fremd'));

    console.log('5b) Zwei Personen bearbeiten gleichzeitig verschiedene Felder');
    /* Stammdaten-Formular an zwei PCs gleichzeitig offen: A ändert die Klasse, B die Schule */
    await pB.page.evaluate(h => { location.hash = h; }, '#/schueler/' + tom);
    await pB.page.waitForSelector('.ar-dkopf', { timeout: 30000 });
    for (const pc of [pA, pB]) {
      await pc.page.click('.ar-dkopf .ar-mehr summary');
      await pc.page.click('.ar-dkopf [data-ar="person"]');
      await pc.page.waitForSelector('dialog.ar-dialog input[name="klasse"]', { timeout: 15000 });
    }
    await pA.page.fill('dialog.ar-dialog input[name="klasse"]', 'C4.2');
    await pA.page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")');
    await pA.page.waitForSelector('dialog.ar-dialog', { state: 'detached', timeout: 60000 });
    await pB.page.fill('dialog.ar-dialog input[name="schule"]', 'École Beispiel');
    await pB.page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Speichern")');
    await pB.page.waitForSelector('dialog.ar-dialog', { state: 'detached', timeout: 60000 });
    const pers = await T(pcs[0], async id => (await CDSE_TEAM.dossier(id, true)).person, tom);
    check('Stammdaten an zwei PCs gleichzeitig: Klasse (A) und Schule (B) beide gespeichert', pers.klasse === 'C4.2' && pers.schule === 'École Beispiel' && pers.vorname === 'Tom', pers);
    /* Fiche: zwei Personen ändern gleichzeitig verschiedene Angaben im selben Teil (Schule: Name / Klasse) */
    await T(pcs[5], async id => CDSE_TEAM.ops.fiche(id, { fiche: { schule: { name: 'Schule Alt', klasse: 'K1' } } }, 'Test', { fiche: { schule: { name: '', klasse: '' } } }), tom);
    const basisF = { fiche: { schule: { name: 'Schule Alt', klasse: 'K1' } } };
    await Promise.all([
      T(pcs[5], async a => CDSE_TEAM.ops.fiche(a.id, { fiche: { schule: { name: 'Schule Neu', klasse: 'K1' } } }, 'Test A', a.b), { id: tom, b: basisF }),
      T(pcs[6], async a => CDSE_TEAM.ops.fiche(a.id, { fiche: { schule: { name: 'Schule Alt', klasse: 'K2' } } }, 'Test B', a.b), { id: tom, b: basisF })
    ]);
    const fs5 = await T(pcs[0], async id => ((await CDSE_TEAM.dossier(id, true)).fiche || {}).schule, tom);
    check('Fiche gleichzeitig: Name der Schule (A) und Klasse (B) beide gespeichert', fs5 && fs5.name === 'Schule Neu' && fs5.klasse === 'K2', fs5);
    const unver = await T(pcs[5], async id => { const vor = (await CDSE_TEAM.dossier(id, true)).rev; const d = await CDSE_TEAM.ops.person(id, { klasse: 'C4.2' }, { klasse: 'C4.2' }); return { vor, nach: d.rev }; }, tom);
    check('Formular ohne Änderung gespeichert: Datei bleibt unverändert', unver.vor === unver.nach, unver);

    console.log('6) Sperren: abgestürzter PC, zugeklappter Laptop, lange Arbeit');
    fs.mkdirSync(path.join(ROOT, 'sperren'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'sperren', 'dossier-' + tom + '.lock'), JSON.stringify({ token: 'absturz1', puls: 0, von: 'x', name: 'Abgestürzter PC', z: new Date().toISOString() }));
    const [absturz, schlaf, puls] = await Promise.all([
      /* a) ein abgestürzter PC hat seine Sperre liegen lassen */
      T(pcs[2], async id => { const t0 = Date.now(); try { await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Nach Absturz' }); return { ms: Date.now() - t0 }; } catch (e) { return { fehler: String(e && e.message || e) }; } }, tom),
      /* b) Laptop mitten in der Arbeit zugeklappt: keine Lebenszeichen mehr – ein anderer übernimmt, der Laptop merkt es beim Aufwachen */
      (async () => {
        const a = T(pcs[7], () => CDSE_KONTO.speicher.sperre('test-schlaf', async s => { clearInterval(s.timer); await new Promise(r => setTimeout(r, 21000)); return await s.noch(); }));
        await warte(1500);
        const b = T(pcs[8], async () => { const t0 = Date.now(); await CDSE_KONTO.speicher.sperre('test-schlaf', async () => 1); return Date.now() - t0; });
        return { nochDa: await a, wartenMs: await b };
      })(),
      /* c) jemand arbeitet 20 s lang unter der Sperre (mit Lebenszeichen) – niemand darf übernehmen */
      (async () => {
        const a = T(pcs[9], () => CDSE_KONTO.speicher.sperre('test-puls', async s => { await new Promise(r => setTimeout(r, 20000)); return await s.noch(); }));
        await warte(1500);
        const b = T(pcs[10], async () => { const t0 = Date.now(); await CDSE_KONTO.speicher.sperre('test-puls', async () => 1); return Date.now() - t0; });
        return { nochDa: await a, wartenMs: await b };
      })()
    ]);
    check('Verwaiste Sperre eines abgestürzten PCs: Speichern klappt nach ' + Math.round((absturz.ms || 0) / 1000) + ' s', !absturz.fehler && absturz.ms >= 14000 && absturz.ms < 45000, absturz);
    check('Zugeklappter Laptop: Sperre nach ' + Math.round((schlaf.wartenMs || 0) / 1000) + ' s übernommen, der Laptop merkt beim Aufwachen, dass sie weg ist', schlaf.nochDa === false && schlaf.wartenMs >= 12000 && schlaf.wartenMs < 25000, schlaf);
    check('Lange Arbeit mit Lebenszeichen: Sperre bleibt, der Nächste wartet (' + Math.round((puls.wartenMs || 0) / 1000) + ' s)', puls.nochDa === true && puls.wartenMs >= 17000, puls);

    console.log('7) Zugang entziehen und Schlüssel erneuern – während andere weiterarbeiten');
    const weg = pcs[N - 1];
    const altRing = ringVonPlatte();                       /* „alte Kopie“ der Schlüsseldatei, z. B. aus einer Sicherung */
    const tomPfad = path.join(ROOT, 'gemeinsam', 'schueler', tom + '.cdse');
    const tomAlt = fs.readFileSync(tomPfad, 'utf8');
    const alt = await T(pcs[0], async () => {
      const d = await CDSE_TEAM.neuesDossier({ nachname: 'Fiktiv', vorname: 'Altfall', geburtsdatum: '2013-03-03' }, {});
      const a = await CDSE_TEAM.anhangSpeichern(d.id, { name: 'Bericht.txt', typ: 'text/plain', bytes: new TextEncoder().encode('Erfundener Testbericht') });
      return { id: d.id, anhang: a.id };
    });
    const altfallPfad = path.join(ROOT, 'gemeinsam', 'schueler', alt.id + '.cdse');
    const altfallGen1 = fs.readFileSync(altfallPfad, 'utf8');
    await T(pcs[0], async id => { await CDSE_KONTO.kontenNeu(); await CDSE_TEAM.entziehen(id); }, weg.id);
    check('Zugang entzogen: Konto nicht mehr im Schlüsselring', !ringVonPlatte().fuer[weg.id]);
    t = Date.now();
    const [erneuert, ...nebenbei] = await Promise.all([
      T(pcs[0], async () => { try { return await CDSE_TEAM.schluesselErneuern(); } catch (e) { return { abbruch: String(e && e.message || e) }; } }),
      ...pcs.slice(1, 6).map(pc => T(pc, async a => {
        const f = [];
        for (let k = 1; k <= 4; k++) { try { await CDSE_TEAM.ops.eintrag(a.id, { art: 'notiz', titel: 'Während Wechsel ' + a.n + ' #' + k }); } catch (e) { f.push(String(e && e.message || e)); } }
        return f;
      }, { id: tom, n: pc.name })),
      T(pcs[6], async () => { const ids = [], f = []; for (let j = 0; j < 4; j++) { try { ids.push((await CDSE_TEAM.neuesDossier({ nachname: 'Probe', vorname: 'Neu ' + j, geburtsdatum: '2016-02-02' }, {})).id); } catch (e) { f.push(String(e && e.message || e)); } } return { ids, f }; })
    ]);
    const dauerWechsel = Date.now() - t;
    const neuDoss = nebenbei.pop();
    const fehlerNebenbei = nebenbei.flat().concat(neuDoss.f);
    const ring2 = ringVonPlatte();
    check('Schlüssel erneuert: Generation 2, ' + (erneuert.neu || 0) + ' von ' + (erneuert.gesamt || 0) + ' Dateien neu verschlüsselt (' + Math.round(dauerWechsel / 1000) + ' s)', !erneuert.abbruch && erneuert.gen === 2 && erneuert.fehler === 0 && ring2.gen === 2, erneuert);
    check('Neuer Ring: ' + (N - 1) + ' Konten, das entzogene nicht, ältere Schlüssel verschlossen in „alt“', Object.keys(ring2.fuer).length === N - 1 && !ring2.fuer[weg.id] && !!(ring2.alt && ring2.alt[1]), Object.keys(ring2.fuer).length);
    check('Während des Wechsels weitergeschrieben und 4 neue Dossiers angelegt – ohne Fehlermeldung', fehlerNebenbei.length === 0 && neuDoss.ids.length === 4, fehlerNebenbei.slice(0, 3));
    const kopfGen = dir => fs.readdirSync(path.join(ROOT, 'gemeinsam', dir)).filter(n => /\.(cdse|cdsa)$/.test(n)).map(n => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'gemeinsam', dir, n), 'utf8')).gen | 0; } catch (e) { return -1; } });
    const mitglGen = () => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'gemeinsam', 'mitglieder.cdse'), 'utf8')).gen | 0; } catch (e) { return -1; } };
    let gens = kopfGen('schueler').concat(kopfGen('anhaenge'));
    check('Alle ' + gens.length + ' Dateien (Dossiers, Anhang) und die Rollenliste haben den neuen Schlüssel', gens.every(g => g === 2) && mitglGen() === 2, { nichtNeu: gens.filter(g => g !== 2).length, rollen: mitglGen() });
    let dTom = [];
    try { dTom = await T(pcs[7], async id => (await CDSE_TEAM.dossier(id, true)).eintraege.map(e => e.titel), tom); } catch (e) { dTom = ['Fehler: ' + e.message]; }
    const waehrend = dTom.filter(x => /^Während Wechsel /.test(x)).length;
    check('Keine Änderung während des Wechsels verloren (' + waehrend + ' von 20)', waehrend === 20, dTom.slice(-3));
    const wegTest = await T(weg, async a => {
      const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const priv = await CDSE_KONTO.privat();
      const roh = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, priv, bytes(a.ring.fuer[a.id].k));
      const key = await crypto.subtle.importKey('raw', roh, 'AES-GCM', false, ['decrypt']);
      const geht = async txt => { const b = JSON.parse(txt); try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(b.iv) }, key, bytes(b.ct)); return true; } catch (e) { return false; } };
      let schreiben = '';
      try { await CDSE_TEAM.ops.eintrag(a.tom, { art: 'notiz', titel: 'Sollte nicht gehen' }); schreiben = 'gespeichert'; } catch (e) { schreiben = String(e && e.message || e); }
      return { altLesbar: await geht(a.tomAlt), neuLesbar: await geht(a.tomNeu), schreiben, zustand: CDSE_TEAM.zustand().art, laden: (await CDSE_TEAM.laden()).art };
    }, { ring: altRing, id: weg.id, tom, tomAlt, tomNeu: fs.readFileSync(tomPfad, 'utf8') });
    check('Entzogenes Konto mit alter Schlüsseldatei: alte Kopie lesbar (Kontrolle), neuer Stand NICHT lesbar', wegTest.altLesbar === true && wegTest.neuLesbar === false, wegTest);
    check('Entzogenes Konto: offenes Fenster speichert nicht mehr, Bereich gesperrt', /entzogen/.test(wegTest.schreiben) && wegTest.zustand === 'wartet' && wegTest.laden === 'wartet', wegTest);
    fs.writeFileSync(altfallPfad, altfallGen1);   /* eine Datei, die noch den alten Schlüssel hat (z. B. aus einer Sicherung zurückgeholt) */
    let altLesen = '';
    try { altLesen = await T(pcs[8], async a => { const d = await CDSE_TEAM.dossier(a.id, true); const x = await CDSE_TEAM.anhangLesen(a.id, a.anhang); return d.person.vorname + '|' + new TextDecoder().decode(x.bytes); }, alt); } catch (e) { altLesen = 'Fehler: ' + e.message; }
    check('Datei mit älterem Schlüssel bleibt für alle Freigeschalteten lesbar', altLesen === 'Altfall|Erfundener Testbericht', altLesen);
    const um = await T(pcs[0], async () => CDSE_TEAM.umschluesseln());
    check('„Umschlüsseln fortsetzen“ findet sie und verschlüsselt sie neu', um.neu === 1 && (JSON.parse(fs.readFileSync(altfallPfad, 'utf8')).gen | 0) === 2, um);
    let nachLaden = {};
    try {
      nachLaden = await T(pcs[9], async id => { const z = (await CDSE_TEAM.laden()).art; await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Nach neuem Laden' }); return { z }; }, tom);
      nachLaden.kopf = JSON.parse(fs.readFileSync(tomPfad, 'utf8')).gen | 0;
      nachLaden.lesbar = await T(pcs[0], async id => (await CDSE_TEAM.dossier(id, true)).eintraege.some(e => e.titel === 'Nach neuem Laden'), tom);
    } catch (e) { nachLaden.fehler = e.message; }
    check('PC, der den Bereich nach dem Wechsel neu lädt, speichert mit dem neuen Schlüssel (für alle lesbar)', nachLaden.z === 'bereit' && nachLaden.kopf === 2 && nachLaden.lesbar === true, nachLaden);
    const prot = await T(pcs[0], async () => { await CDSE_TEAM.laden(); return CDSE_TEAM.bereichsVerlauf().map(v => v.t); });
    try {
      await pcs[0].page.evaluate(() => { location.hash = '#/verwaltung'; });
      const karteEl = await pcs[0].page.waitForSelector('.ar-schluessel', { timeout: 20000 });
      fs.mkdirSync(OUT, { recursive: true });
      await karteEl.screenshot({ path: path.join(OUT, 'g2-schluessel.png') });
      check('Verwaltung zeigt die Schlüssel-Karte mit Generation 2', /Generation\s*2/.test(await karteEl.textContent()));
    } catch (e) { check('Verwaltung zeigt die Schlüssel-Karte mit Generation 2', false, e.message); }
    check('Protokoll: „Zugang entzogen“ und „Schlüssel erneuert“ vermerkt', prot.some(x => /^Zugang entzogen/.test(x)) && prot.some(x => /^Schlüssel erneuert \(Generation 2\)/.test(x)), prot.slice(0, 4));
    const r7 = ringVonPlatte();
    check('Schlüsselring kennt den Stand des Schreibverfahrens (hubStand 2)', r7.hubStand === 2, r7.hubStand);
    fs.writeFileSync(path.join(ROOT, 'gemeinsam', 'schluessel.json'), JSON.stringify(Object.assign({}, r7, { hubStand: 3 }), null, 1));
    const veraltet = await T(pcs[10], async id => { try { await CDSE_TEAM.ops.eintrag(id, { art: 'notiz', titel: 'Altes Fenster' }); return 'gespeichert'; } catch (e) { return String(e && e.message || e); } }, tom);
    fs.writeFileSync(path.join(ROOT, 'gemeinsam', 'schluessel.json'), JSON.stringify(r7, null, 1));
    check('Neuere Hub-Version im Ordner: ein älteres, noch offenes Fenster speichert nicht und bittet um Neuladen', /neu laden \(F5\)/.test(veraltet), veraltet);
    await pA.page.evaluate(() => { location.hash = '#/schueler'; });

    if (KONTEN > N) {
      console.log('8) ' + KONTEN + ' Konten: laden, freischalten, Bereich öffnen, Schlüssel erneuern');
      /* weitere erfundene Konten als Kopie einer Konto-Datei (gleiches Schlüsselpaar, eigener Name) – nur für die Menge */
      const vorlage = JSON.parse(fs.readFileSync(path.join(ROOT, 'konten', pcs[1].id + '.json'), 'utf8'));
      const TEAMS = ['diagnostique', 'annexe', 'isa'], extra = [];
      for (let k = N + 1; k <= KONTEN; k++) {
        const id = 'test-person-' + k + '-' + Math.random().toString(36).slice(2, 5);
        fs.writeFileSync(path.join(ROOT, 'konten', id + '.json'), JSON.stringify(Object.assign({}, vorlage, { id, name: 'Test Person ' + k, team: TEAMS[k % 3] }), null, 1));
        extra.push(id);
      }
      t = Date.now();
      const anzKonten = await T(pcs[0], async () => (await CDSE_KONTO.kontenNeu()).length);
      check(KONTEN + ' Konten geladen (' + ((Date.now() - t) / 1000).toFixed(1) + ' s)', anzKonten === KONTEN, anzKonten);
      t = Date.now();
      const gr8 = [0, 1, 2].map(k => extra.filter((_, j) => j % 3 === k));
      const fFrei8 = await Promise.all([0, 1, 2].map(k => T(pcs[k], async ids => {
        const f = []; await CDSE_KONTO.kontenNeu();
        for (const id of ids) { try { await CDSE_TEAM.freischalten(id); } catch (e) { f.push(String(e && e.message || e)); } }
        return f;
      }, gr8[k])));
      const sollRing = KONTEN - 1;
      const ring8 = ringVonPlatte();
      check(extra.length + ' Konten freigeschaltet, 3 Personen gleichzeitig (' + Math.round((Date.now() - t) / 1000) + ' s)', fFrei8.flat().length === 0 && Object.keys(ring8.fuer).length === sollRing, { fehler: fFrei8.flat().slice(0, 3), imRing: Object.keys(ring8.fuer).length });
      const ringKB = Math.round(fs.statSync(path.join(ROOT, 'gemeinsam', 'schluessel.json')).size / 1024);
      t = Date.now();
      const zst8 = await Promise.all(pcs.slice(0, N - 1).map(pc => T(pc, async () => { await CDSE_KONTO.kontenNeu(); return (await CDSE_TEAM.laden()).art; })));
      check((N - 1) + ' PCs öffnen den Bereich gleichzeitig (Schlüsselring ' + ringKB + ' KB, ' + ((Date.now() - t) / 1000).toFixed(1) + ' s)', zst8.every(z => z === 'bereit'), zst8);
      const mitgl8 = await T(pcs[0], () => CDSE_TEAM.mitglieder().filter(k => k.freigeschaltet).length);
      check('Rollenliste: ' + sollRing + ' freigeschaltete Mitglieder', mitgl8 === sollRing, mitgl8);
      t = Date.now();
      const [erneuert8, ...schreib8] = await Promise.all([
        T(pcs[0], async () => { try { return await CDSE_TEAM.schluesselErneuern(); } catch (e) { return { abbruch: String(e && e.message || e) }; } }),
        ...pcs.slice(1, N - 1).map(pc => T(pc, async a => { try { await CDSE_TEAM.ops.eintrag(a.id, { art: 'notiz', titel: 'Bei vielen Konten ' + a.n }); return ''; } catch (e) { return String(e && e.message || e); } }, { id: tom, n: pc.name }))
      ]);
      const ring8b = ringVonPlatte();
      check('Schlüssel erneuern mit ' + sollRing + ' Konten: Generation 3, ' + (erneuert8.neu || 0) + ' Dateien (' + Math.round((Date.now() - t) / 1000) + ' s)', !erneuert8.abbruch && erneuert8.gen === 3 && erneuert8.fehler === 0 && erneuert8.ausgelassen === 0 && ring8b.gen === 3 && Object.keys(ring8b.fuer).length === sollRing, erneuert8);
      const d8 = await T(pcs[5], async id => (await CDSE_TEAM.dossier(id, true)).eintraege.filter(e => /^Bei vielen Konten /.test(e.titel)).length, tom);
      check('Dabei gleichzeitig geschrieben: alle ' + (N - 2) + ' Einträge da, keine Fehlermeldung', d8 === N - 2 && schreib8.every(x => !x), { d8, fehler: schreib8.filter(Boolean).slice(0, 2) });
      gens = kopfGen('schueler').concat(kopfGen('anhaenge'));
      check('Alle Dateien mit Generation 3', gens.every(g => g === 3) && mitglGen() === 3, { nichtNeu: gens.filter(g => g !== 3).length, rollen: mitglGen() });
    }
  }

  const fehlerAlle = pcs.map(pc => pc.fehler.filter(e => !/Das Dossier wurde gerade von jemand anderem geändert/.test(e))).flat();
  check('Keine Skriptfehler auf den ' + N + ' PCs', fehlerAlle.length === 0, fehlerAlle.slice(0, 5));
  console.log('\nNetz: ' + JSON.stringify(nord.stat));
  await browser.close();
  try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch (e) { }
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
