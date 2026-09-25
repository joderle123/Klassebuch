// Regressionstest des Hubs auf file:// - jetzt mit Anmeldung (Annexe, dann Diagnostique)
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs');
const ROOT='file:///home/user/Klassebuch/', SHOT=process.argv[2];
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  await ctx.addInitScript({content:fs.readFileSync(__dirname+'/mockfs.js','utf8')});
  const errs=[]; ctx.on('page',pg=>pg.on('pageerror',e=>errs.push(pg.url().split('/').pop()+': '+e.message.slice(0,120))));
  let pass=0,fail=0; const ok=(c,m)=>{if(c){pass++;console.log('  ✓ '+m);}else{fail++;console.log('  ✗ '+m);}};

  const kb0=await ctx.newPage();
  await kb0.goto(ROOT+'apps/klassenbuch.html'); await kb0.waitForTimeout(3500);
  const kbInfo=await kb0.evaluate(()=>({year:window.KB_TERMS&&window.KB_TERMS.yearLabel(), term:window.KB_TERMS&&window.KB_TERMS.activeTermKey(), n:window.KB_ROSTER&&window.KB_ROSTER.list().filter(s=>s.active!==false).length}));
  await kb0.evaluate(()=>{const s=window.KB_ROSTER.list()[0];window.KB_ROSTER.update(s.id,{klasse:s.klasse||''});});
  console.log('[0] Klassenbuch direkt: Jahr '+kbInfo.year+', '+kbInfo.term+', '+kbInfo.n+' aktive Schüler');
  await kb0.close();

  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push('hub: '+e.message.slice(0,120)));
  await p.goto(ROOT+'hub.html');
  async function konto(name,team,pw){
    const neu=await p.$('#g-neu'); if(neu) await neu.click();
    const ord=await p.$('#g-ordner'); if(ord){await ord.click();}
    await p.waitForSelector('#g-name');
    await p.fill('#g-name',name); await p.check('input[name="g-team"][value="'+team+'"]');
    await p.evaluate(()=>{const r=document.querySelector('#g-resp');if(r&&!r.value){r.value='-';}}); await p.fill('#g-pw1',pw); await p.fill('#g-pw2',pw); await p.click('#g-los');
    await p.waitForSelector('#g-ok',{timeout:20000}); await p.check('#g-ok'); await p.click('#g-weiter');
    await p.waitForSelector('#g-meins, #me:not([hidden])',{timeout:30000});
    if(await p.$('#g-meins')){console.log('  (Frage nach alten Daten: übernommen)');await p.click('#g-meins');}
    await p.waitForSelector('#me:not([hidden])',{timeout:30000}); await p.waitForTimeout(300);
  }
  await konto('Anna Muster','annexe','sonnige Tage 2026');

  console.log('\n[1] Übersicht Annexe');
  let names=await p.$$eval('.tile[data-href] h3',h=>h.map(x=>x.textContent));
  ok(names.join('|')==='Klassenbuch|ELDiB-Generator|Toolbox|Lernen','Kacheln: '+names.join(', '));
  const stands=await p.$$eval('.tile-stand',s=>s.map(x=>x.textContent));
  // Erwartung aus apps/versionen.js (ändert sich mit jedem update-apps)
  const erwartetStand=await p.evaluate(()=>['klassenbuch','eldib','toolbox'].map(id=>{const v=(window.CDSE_APP_VERSIONEN||{})[id];const d=v&&(v.datum||v.stand);return d?'Stand '+d.split('-').reverse().join('.'):'';}).join('|'));
  ok(stands.join("|")===erwartetStand||(!erwartetStand.replace(/\|/g,'')&&stands.length===3),'Versionsstand: '+stands.join(', ')+' (erwartet '+erwartetStand+')');
  ok(await p.$$eval('.chip.tab',c=>c.length)===2,'"eigener Tab" bei Klassenbuch und Toolbox');
  const live=await p.textContent('.tile[data-tabtile="klassenbuch"] .tile-info').catch(()=>'');
  const erwartet=kbInfo.year+' · '+({T1:'1. Trimester',T2:'2. Trimester',T3:'3. Trimester'}[kbInfo.term])+' · '+kbInfo.n+' Schüler';
  ok(live===erwartet,'Live-Info = was das Klassenbuch selbst sagt: "'+live+'"');
  ok((await p.textContent('#today')).includes('Team Annexe Junglinster'),'Team in der Datumszeile: '+(await p.textContent('#today')));
  if(SHOT) await p.screenshot({path:SHOT+'-home.png'});

  console.log('\n[2] Klassenbuch im eigenen Tab');
  const [kbTab]=await Promise.all([ctx.waitForEvent('page'),p.click('.tile[data-tabtile="klassenbuch"] .tile-open')]);
  await kbTab.waitForLoadState('load'); await kbTab.waitForTimeout(2500);
  ok(/apps\/klassenbuch\.html$/.test(kbTab.url()),'Tab zeigt apps/klassenbuch.html');
  await kbTab.evaluate(()=>{window.__marker='noch-da';});
  let neueSeite=false; const merk=()=>{neueSeite=true;}; ctx.on('page',merk);
  await p.click('.tile[data-tabtile="klassenbuch"] .tile-open'); await p.waitForTimeout(1200);
  ctx.off('page',merk);
  ok(!neueSeite,'zweiter Klick öffnet KEINEN weiteren Tab');
  ok((await kbTab.evaluate(()=>window.__marker))==='noch-da','…und lädt den offenen Tab NICHT neu');
  const kbData=await kbTab.evaluate(()=>window.KB_ROSTER&&window.KB_ROSTER.list().filter(s=>s.active!==false).length);
  ok(kbData===kbInfo.n,'dieselben Daten wie direkt geöffnet ('+kbData+' Schüler)');

  console.log('\n[3] Toolbox im eigenen Tab, ELDiB eingebettet');
  const [tbTab]=await Promise.all([ctx.waitForEvent('page'),p.click('.tile[data-tabtile="toolbox"] .tile-open')]);
  await tbTab.waitForLoadState('load'); await tbTab.waitForTimeout(2500);
  ok(/Toolbox|ISA-App/.test(await tbTab.title()),'Toolbox lädt: "'+(await tbTab.title())+'"');
  await p.bringToFront(); await p.click('.lnk[data-app="eldib"]'); await p.waitForTimeout(3000);
  const ef=p.frames().find(f=>/eldib-generator\.html/.test(f.url()));
  ok(ef&&(await ef.title())==='ELDiB Generator','ELDiB im Rahmen: '+(ef&&await ef.title()));

  console.log('\n[4] Abmelden schließt alle Apps');
  await p.click('#me-ava'); await p.click('[data-konto="abmelden"]'); await p.waitForSelector('#gate .konto[data-id], #g-pw',{timeout:30000}); await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>Object.keys(localStorage).some(k=>/^klassebuch_/.test(k)))),'Klassenbuch-Daten nach dem Abmelden vom PC entfernt');
  ok(kbTab.isClosed(),'Klassenbuch-Tab geschlossen');
  ok(tbTab.isClosed(),'Toolbox-Tab geschlossen');
  ok(await p.$$eval('iframe.appframe',f=>f.length)===0,'ELDiB-Rahmen entfernt');

  console.log('\n[5] Diagnostique');
  await konto('Ben Beispiel','diagnostique','Kaffee mit Milch 7');
  names=await p.$$eval('.tile[data-href] h3',h=>h.map(x=>x.textContent));
  ok(names.join('|')==='Journal|Befundbericht|ELDiB-Generator|Toolbox|Lernen','Kacheln: '+names.join(', '));
  const [jTab]=await Promise.all([ctx.waitForEvent('page'),p.click('.tile[data-tabtile="journal"] .tile-open')]);
  await jTab.waitForLoadState('load'); await jTab.waitForTimeout(3000);
  ok(/apps\/journal\.html$/.test(jTab.url()),'Journal im eigenen Tab');
  ok(await jTab.evaluate(()=>document.body.innerText.trim().length>200),'Journal-Oberfläche ist aufgebaut');
  await p.bringToFront(); await p.click('.lnk[data-app="screening"]'); await p.waitForTimeout(3000);
  const sf=p.frames().find(f=>/screening\.html/.test(f.url()));
  ok(sf&&/Befundbericht/.test(await sf.title()),'Befundbericht im Rahmen: '+(sf&&await sf.title()));
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),
    sf.evaluate(()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['Test'],{type:'application/octet-stream'}));a.download='bericht-test.docx';document.body.appendChild(a);a.click();})]);
  ok(!!dl&&dl.suggestedFilename()==='bericht-test.docx','Download aus dem Rahmen funktioniert');
  if(SHOT) await p.screenshot({path:SHOT+'-screening.png'});

  console.log('\n[6] Startseite index.html');
  const r=await ctx.newPage(); await r.goto(ROOT+'index.html'); await r.waitForTimeout(800);
  ok(/hub\.html/.test(r.url()),'index.html leitet zum Hub weiter');

  console.log('\n[7] Fehlerfreiheit');
  ok(errs.length===0,'keine Laufzeitfehler'+(errs.length?':\n      '+errs.join('\n      '):''));
  console.log('\n=== '+pass+' bestanden, '+fail+' fehlgeschlagen ===');
  await b.close(); process.exit(fail?1:0);
})().catch(e=>{console.error('ABBRUCH:',e.message);process.exit(2);});
