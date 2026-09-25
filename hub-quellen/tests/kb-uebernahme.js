// Test: Übernahme aus Klassenbuch und Journal in die Hub-Dossiers – Einträge (Kategorie, Schlagwörter, Verfasser,
// DS/PEI-Bericht, Herkunft), Wochenziele je Réunion, Helfernetz und Matricule, frühere Screenings in einem Durchgang;
// Zuordnung nach dem Namen oder neues Dossier; nichts doppelt, Änderungen werden nachgetragen; Anzeige im Dossier;
// verschlüsselt; Klassenbuch bleibt unverändert. Nur erfundene Personen.
// Aufruf: node tests/kb-uebernahme.js   (Webserver auf Port 8099 für den Hauptordner)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || 'http://127.0.0.1:8099/';
const OUT = path.join(__dirname, 'screening-aus'); fs.mkdirSync(OUT, { recursive: true });
let ok = 0, bad = 0;
function check(name, cond, info) { if (cond) { ok++; console.log('  ✓ ' + name); } else { bad++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } }

(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => { window.__CDSE_TEST_ORDNER = () => navigator.storage.getDirectory(); });
  const page = await ctx.newPage();
  const errors = [];
  const aufPage = p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); p.on('dialog', d => d.type() === 'prompt' ? d.accept('Test Person') : d.accept()); };
  aufPage(page);
  const warte = ms => page.waitForTimeout(ms);
  const text = sel => page.textContent(sel);
  async function gehe(hash) { await page.evaluate(h => { location.hash = h; }, hash); await warte(400); }
  async function dialogZu() { await page.waitForFunction(() => !document.querySelector('dialog.ar-dialog'), null, { timeout: 30000 }); await warte(400); }

  await page.goto(ROOT + 'hub.html');
  await page.evaluate(async () => {
    const r = await navigator.storage.getDirectory(); for await (const [n] of r.entries()) { await r.removeEntry(n, { recursive: true }); }
    localStorage.clear(); sessionStorage.clear();
    for (const n of ['cdse_dossier_db', 'isa_dossier_db', 'klassebuch-sync']) { await new Promise(res => { const q = indexedDB.deleteDatabase(n); q.onsuccess = q.onerror = q.onblocked = () => res(); }); }
  });
  await page.evaluate(async () => { const r = await navigator.storage.getDirectory(); await r.getFileHandle('hub.html', { create: true }); });
  await page.reload();
  await page.click('#g-ordner'); await page.waitForSelector('#g-name');

  console.log('1) Hub einrichten, Dossiers Tom Muster und Lea Beispiel');
  await page.fill('#g-name', 'Mia Muster'); await page.check('input[name="g-team"][value="annexe"]'); await page.selectOption('#g-resp', '-');
  await page.fill('#g-pw1', 'ein sicheres Passwort 1'); await page.fill('#g-pw2', 'ein sicheres Passwort 1'); await page.click('#g-los');
  await page.waitForSelector('#g-code', { timeout: 30000 }); await page.check('#g-ok'); await page.click('#g-weiter'); await page.waitForSelector('#me:not([hidden])', { timeout: 30000 });
  await gehe('#/schueler'); await page.waitForSelector('[data-ar="einrichten"]'); await page.click('[data-ar="einrichten"]');
  await page.waitForSelector('[data-ar="neu"]', { timeout: 20000 });
  const ids = await page.evaluate(async () => ({
    tom: (await CDSE_TEAM.neuesDossier({ nachname: 'Muster', vorname: 'Tom', geschlecht: 'm', geburtsdatum: '2013-03-10', klasse: 'L1' }, { stelle: 'annexe' })).id,
    lea: (await CDSE_TEAM.neuesDossier({ nachname: 'Beispiel', vorname: 'Lea', geschlecht: 'w', geburtsdatum: '2012-06-01', klasse: 'L2' }, { stelle: 'annexe' })).id
  }));

  console.log('2) Im Klassenbuch (eigener Tab) erfundene Daten anlegen');
  const kb = await ctx.newPage(); aufPage(kb);
  await kb.goto(ROOT + 'apps/klassenbuch.html', { waitUntil: 'load' }); await kb.waitForTimeout(1500);
  const kbIds = await kb.evaluate(async () => {
    const tom = KB_ROSTER.add('Tom', '', 'L1', 'ES'), lea = KB_ROSTER.add('Lea B.', '', 'L2', 'ES'), noah = KB_ROSTER.add('Noah', '', 'L1', 'ES');
    KB_ROSTER.update(noah, { active: false });
    const e1 = await Repo.saveEntry({ studentId: tom, date: '2026-09-07', author: 'MM', category: 'Schule', tags: ['Stage'], text: 'Tom war pünktlich und hat mitgearbeitet (erfunden).' });
    await Repo.saveEntry({ studentId: tom, date: '2026-09-14', author: 'LB', category: 'Team-Réunion', tags: ['Réunion'], text: 'Réunion-Beitrag zu Tom (erfunden).' });
    await Repo.saveEntry({ studentId: tom, date: '2026-09-01', author: 'MM', category: 'Bericht (DS/PEI)', tags: [], text: 'PEI (erfunden)', report: { v: 1, type: 'PEI', goals: [{ code: 'V-21', domain: 'V', title: 'Wut erkennen (erfunden)' }] } });
    await Repo.saveEntry({ studentId: lea, date: '2026-09-10', author: 'MM', category: 'Risiko & Sorge', tags: ['Familie'], text: 'Sorge um Lea (erfunden).' });
    await Repo.saveEntry({ studentId: noah, date: '2026-03-02', author: 'MM', category: 'Schule', tags: [], text: 'Eintrag zu Noah (erfunden).' });
    await Repo.saveReunion({ date: '2026-09-14', orgItems: [], studentOrder: [tom], goals: { [tom]: [{ text: 'Pünktlich kommen', done: true }, 'Heft mitbringen'] } });
    KB_BUBBLE.setMeta(tom, { matrikel: '2013031012345', dateBegin: '2026-01-10', dateEnd: '' });
    KB_BUBBLE.addNode(tom, { name: 'Mutter (erfunden)', area: 'familie', freq: 'woechentlich', relation: 'direkt', status: 'bestehend' });
    KB_BUBBLE.addNode(tom, { name: 'SCAS (erfunden)', area: 'externe', freq: 'monatlich', relation: 'direkt', status: 'neu' });
    localStorage.setItem('klassebuch_screening_v1', JSON.stringify({ [tom]: { symptome: ['1.1'], plans: {}, demografie: {}, gate: {}, history: [], updatedAt: '2026-09-12T08:00:00.000Z' } }));
    return { tom, lea, noah, e1: e1.id, n: Repo.entries.length };
  });
  check('Klassenbuch: 3 Kinder, 5 Einträge, Wochenziele, Helfernetz', kbIds.n === 5);

  console.log('3) Schülerseite im Hub: Hinweis und Dialog');
  await page.bringToFront(); await gehe('#/'); await gehe('#/schueler');
  await page.waitForSelector('#ar-kbu .sc-kb-karte', { timeout: 20000 });
  check('Karte „Schülerdaten aus Klassenbuch oder Journal“ für 3 Kinder', (await text('#ar-kbu')).includes('Für 3 Kinder liegen'), await text('#ar-kbu'));
  await page.click('#ar-kbu [data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  const zeilen = await page.$$eval('dialog .sc-kb-zeile', l => l.map(x => ({ t: x.textContent.replace(/\s+/g, ' '), s: (x.querySelector('select') || {}).value })));
  check('Dialog: Lea B., Noah (ehemalig), Tom – mit Zahl der Einträge, Wochenziele, Helfernetz', zeilen.length === 3 && /^Lea B\..*1 Eintrag/.test(zeilen[0].t) && /^Noah.*ehemalig/.test(zeilen[1].t) && /^Tom.*3 Einträge.*1× Wochenziele.*Helfernetz/.test(zeilen[2].t), zeilen.map(z => z.t));
  check('Vorauswahl: Lea B. → Lea Beispiel, Tom → Tom Muster, Noah → nicht übernehmen', zeilen[0].s === ids.lea && zeilen[2].s === ids.tom && zeilen[1].s === '', zeilen.map(z => z.s));
  await page.selectOption('dialog select[name="kbu:' + kbIds.noah + '"]', 'neu');
  await page.locator('dialog.ar-dialog').screenshot({ path: path.join(OUT, 'u1-dialog.png') });
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await dialogZu();

  console.log('4) Im Dossier: vollständig, verschlüsselt');
  const d = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), ids.tom);
  const e = d.eintraege || [], schule = e.find(x => x.thema === 'Schule'), reu = e.find(x => x.art === 'reunion'), ber = e.find(x => x.bericht), ziele = e.find(x => x.art === 'vereinbarung');
  check('Tom: 3 Einträge und 1 Eintrag „Wochenziele“', e.length === 4, e.length);
  check('Kategorie, Schlagwörter, Verfasser und Herkunft erhalten', schule && schule.art === 'notiz' && schule.tags.join() === 'Stage' && schule.autorName === 'MM' && schule.herkunft.app === 'klassenbuch' && schule.herkunft.id === kbIds.e1 && schule.datum === '2026-09-07', schule);
  check('Réunion-Beitrag als „Réunion“, DS/PEI-Bericht mit Förderzielen', reu && reu.titel === 'Réunion' && ber && ber.bericht.goals[0].code === 'V-21');
  check('Wochenziele mit erledigt/offen', ziele && ziele.text === '✓ Pünktlich kommen\n○ Heft mitbringen' && ziele.datum === '2026-09-14', ziele);
  check('Helfernetz, Matricule (war leer) und Zuordnung gemerkt', d.helfernetz && d.helfernetz.klassenbuch.daten.nodes.length === 2 && d.person.matricule === '2013031012345' && d.herkunft.klassenbuch.indexOf(kbIds.tom) >= 0);
  check('Früheres Screening im selben Durchgang übernommen', (d.screeningsAlt || []).length === 1 && d.screeningsAlt[0].beobachtungen[0].text.startsWith('Driftet'));
  check('Protokoll: „Übernahme aus dem Klassenbuch: 4 Einträge neu …“', d.verlauf.some(v => /^Übernahme aus dem Klassenbuch: 4 Einträge neu, Zuordnung, Helfernetz, Matricule$/.test(v.t)), d.verlauf.map(v => v.t));
  const dl = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), ids.lea);
  check('Lea: Sorge-Eintrag als Beobachtung', dl.eintraege.length === 1 && dl.eintraege[0].art === 'beobachtung' && dl.eintraege[0].thema === 'Risiko & Sorge');
  const alle = await page.evaluate(async () => (await CDSE_TEAM.alleDossiers(true)).map(x => ({ id: x.id, v: x.person.vorname, n: x.person.nachname, s: x.status, e: (x.eintraege || []).length })));
  const noah = alle.find(x => x.v === 'Noah');
  check('Noah: neues Dossier angelegt, inaktiv (ehemalig), mit seinem Eintrag', noah && noah.s === 'inaktiv' && noah.e === 1, noah);
  const zu = await page.evaluate(() => JSON.parse(localStorage.getItem('cdse-kb-zuordnung') || '{}'));
  check('Zuordnung für das Klassenbuch abgelegt', zu.klassenbuch && zu.klassenbuch[kbIds.tom] === ids.tom && zu.klassenbuch[kbIds.lea] === ids.lea);
  const roh = await page.evaluate(async id => { const r = await navigator.storage.getDirectory(); const g = await (await r.getDirectoryHandle('gemeinsam')).getDirectoryHandle('schueler'); return await (await (await g.getFileHandle(id + '.cdse')).getFile()).text(); }, ids.tom);
  check('Dossier-Datei bleibt verschlüsselt', roh.includes('cdse-dossier') && !roh.includes('mitgearbeitet') && !roh.includes('Mutter'));
  check('Klassenbuch unverändert (5 Einträge)', (await kb.evaluate(() => Repo.entries.length)) === 5);

  console.log('5) Anzeige im Dossier');
  await gehe('#/'); await gehe('#/schueler/' + ids.tom); await page.waitForSelector('.ar-tabs [data-tab="eintraege"]', { timeout: 20000 });
  const ueb = (await text('#ar-dossier')).replace(/\s+/g, ' ');
  check('Überblick: Helfernetz mit Personen nach Bereichen', ueb.includes('Helfernetz') && ueb.includes('Mutter (erfunden)') && ueb.includes('Externe Akteur:innen') && ueb.includes('neu hinzugekommen'));
  await page.click('.ar-tabs [data-tab="eintraege"]'); await warte(300);
  const ein = (await text('#ar-dossier')).replace(/\s+/g, ' ');
  check('Einträge: Herkunft, Verfasser, Schlagwörter und Förderziele sichtbar', ein.includes('aus dem Klassenbuch · verfasst von MM · Schlagwörter: Stage') && ein.includes('PEI mit 1 Förderziel: V-21'), ein.slice(0, 400));
  await page.screenshot({ path: path.join(OUT, 'u2-eintraege.png') });

  console.log('6) Nichts doppelt, Änderungen werden nachgetragen');
  await gehe('#/'); await gehe('#/schueler'); await page.waitForSelector('#ar-kbu', { timeout: 20000 }); await warte(800);
  check('Alles übernommen: nur noch der kleine Link', !(await page.$('#ar-kbu .sc-kb-karte')) && (await text('#ar-kbu')).includes('Daten aus Klassenbuch oder Journal übernehmen (3)'));
  await kb.evaluate(async id => { const e = Repo.getEntry(id); await new Promise(r => setTimeout(r, 20)); return Repo.saveEntry(Object.assign({}, e, { text: 'Tom war pünktlich (geändert, erfunden).' })); }, kbIds.e1);
  await gehe('#/'); await gehe('#/schueler'); await page.waitForSelector('#ar-kbu .sc-kb-karte', { timeout: 20000 });
  await page.click('#ar-kbu [data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  check('Geänderter Eintrag: Tom wieder offen, Dossier schon zugeordnet (1 neu oder geändert)', (await text('dialog .sc-kb-zeile:has(select[name="kbu:' + kbIds.tom + '"])')).includes('schon zugeordnet – 1 neu oder geändert'));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await dialogZu();
  const d2 = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), ids.tom);
  const s2 = d2.eintraege.filter(x => x.herkunft && x.herkunft.id === kbIds.e1);
  check('Eintrag aktualisiert statt verdoppelt', d2.eintraege.length === 4 && s2.length === 1 && s2[0].text === 'Tom war pünktlich (geändert, erfunden).' && d2.verlauf.some(v => /1 aktualisiert/.test(v.t)));

  // im Hub bearbeitet, danach im Klassenbuch erneut geändert: Hub-Fassung bleibt, neuer Stand kommt daneben
  await page.evaluate(async ([id, eid]) => { const d = await CDSE_TEAM.dossier(id, true); const x = d.eintraege.find(e => e.herkunft && e.herkunft.id === eid); return CDSE_TEAM.ops.eintragAendern(id, x.id, { text: 'Im Hub ergänzt (erfunden).' }); }, [ids.tom, kbIds.e1]);
  await kb.evaluate(async id => { const e = Repo.getEntry(id); await new Promise(r => setTimeout(r, 20)); return Repo.saveEntry(Object.assign({}, e, { text: 'Zweite Änderung im Klassenbuch (erfunden).' })); }, kbIds.e1);
  await gehe('#/'); await gehe('#/schueler'); await page.waitForSelector('#ar-kbu .sc-kb-karte', { timeout: 20000 });
  await page.click('#ar-kbu [data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste');
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Übernehmen")'); await dialogZu();
  const d3 = await page.evaluate(async id => await CDSE_TEAM.dossier(id, true), ids.tom);
  const s3 = d3.eintraege.filter(x => x.herkunft && x.herkunft.id === kbIds.e1).map(x => x.text + ' | ' + x.titel);
  check('Im Hub bearbeiteter Eintrag wird nicht überschrieben, der neue Stand kommt daneben', s3.length === 2 && s3.some(t => t.startsWith('Im Hub ergänzt')) && s3.some(t => t.startsWith('Zweite Änderung') && t.includes('neuer Stand aus dem Klassenbuch')), s3);

  console.log('7) Team-Datei auswählen');
  const team = { _format: 'klassebuch-shared-v1', _app: 'klassenbuch', colls: {
    roster: [{ id: 'stud_x1', _ts: 1, d: { id: 'stud_x1', name: 'Ella', level: 'L2', active: true } }],
    dosEntries: [{ id: 'e_x1', _ts: 1, d: { id: 'e_x1', studentId: 'stud_x1', date: '2026-09-15', author: 'LB', category: 'Familie & Eltern', tags: [], text: 'Elterngespräch (erfunden).', createdAt: '2026-09-15T10:00:00Z', updatedAt: '2026-09-15T10:00:00Z' } }, { id: 'e_weg', _ts: 2, _del: true }],
    dosReunions: [], bubble: [] } };
  await page.click('#ar-kbu [data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog');
  await page.setInputFiles('dialog [data-kbu-datei]', { name: 'klassebuch-team.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(team)) });
  await page.waitForSelector('dialog select[name="kbu:stud_x1"]', { timeout: 20000 });
  check('Kind aus der Team-Datei erscheint (Quelle genannt), gelöschte Einträge nicht', (await text('dialog .sc-kb-zeile:has(select[name="kbu:stud_x1"])')).includes('klassebuch-team.json') && !(await page.$('dialog select[name="kbu:stud_weg"]')));
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await dialogZu();

  console.log('8) Handy (390 px)');
  await page.setViewportSize({ width: 390, height: 844 }); await warte(300);
  await page.click('#ar-kbu [data-kbu="oeffnen"]'); await page.waitForSelector('dialog.ar-dialog .sc-kb-liste'); await warte(200);
  const q = await page.evaluate(() => { const f = document.querySelector('dialog.ar-dialog form'); return f.scrollWidth - f.clientWidth; });
  check('390 px: Dialog ohne waagrechtes Scrollen', q <= 1, q);
  await page.click('dialog.ar-dialog .ar-knoepfe button:has-text("Abbrechen")'); await dialogZu();
  await page.setViewportSize({ width: 1280, height: 900 });

  check('Keine Fehler in der Konsole', errors.length === 0, errors.slice(0, 5));
  console.log('\n' + ok + ' ok, ' + bad + ' Fehler  (' + Math.round((Date.now() - t0) / 1000) + ' s, Bilder in ' + OUT + ')');
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
