// 使用独立磁盘浏览器资料目录，覆盖断网冷启动与缓存更新。
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { writeOfflineWorker } = require('../offline-plugin.ts');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const lessons = JSON.parse(fs.readFileSync('src/generated/lessons.json'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ime-offline-browser-'));
const profile = path.join(temporary, 'profile');
const manifest = JSON.parse(fs.readFileSync('dist/offline-manifest.json'));
const base = manifest.base;
const site = path.join(temporary, 'site');
const mounted = path.join(site, base);
fs.mkdirSync(mounted, {recursive: true});
fs.cpSync('dist', mounted, {recursive: true});
const htmlA = fs.readFileSync(path.join(mounted, 'index.html'), 'utf8');
const scriptPath = manifest.resources.find(r => r.url.endsWith('.js')).url.slice(base.length);
const scriptA = fs.readFileSync(path.join(mounted, scriptPath), 'utf8');
const contentType = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((request,response) => {
  const url = new URL(request.url, 'http://localhost');
  let file = path.resolve(site, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(site + path.sep)) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
  response.writeHead(200, {'Content-Type':contentType[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  response.end(fs.readFileSync(file));
});
async function launch() { return chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,viewport:{width:1024,height:768}}); }
async function banner(page, offline) { await page.getByText(offline?'当前离线，90天课程可继续学习':'90天课程已缓存，可离线学习',{exact:true}).waitFor(); }
async function saved(page) { await page.locator('.save-status').filter({hasText:'已保存到此设备'}).waitFor({state:'attached'}); }
async function dashboard(page) { await page.getByRole('button',{name:'学习仪表盘',exact:true}).click(); }
async function status(page) { return page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();return new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>reject(new Error('status timeout')),10000);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data);};registration.active.postMessage({type:'CACHE_STATUS'},[channel.port2]);});}); }
(async()=>{
 let context;
 try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}${base}`;
  context=await launch();let page=context.pages()[0];page.on('dialog',d=>d.accept());
  await page.goto(url);await banner(page,false);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert.equal((await status(page)).ready,true);
  await context.setOffline(true);await page.reload();await banner(page,true);
  for(const d of lessons){await page.getByRole('button',{name:`Day ${d.day} 开始学习`,exact:true}).click();await page.getByRole('heading',{name:d.title,exact:true}).waitFor();await dashboard(page);}
  const d=lessons.find(d=>d.day===45);
  await page.getByRole('button',{name:'Day 45 开始学习',exact:true}).click();
  await page.getByRole('button',{name:'翻转词汇卡',exact:true}).click();
  await page.getByText(d.vocabulary[0].example,{exact:true}).waitFor();
  await page.locator(`#${d.translations[0].id}`).fill('离线保存的译文');
  for(const [i,q] of d.questions.entries())await page.locator(`input[name="${q.id}"]`).nth(i===0?(q.answer+1)%4:q.answer).check();
  await page.getByRole('button',{name:'提交并查看解析',exact:true}).click();await page.getByText('本次得分 4 / 5').waitFor();
  await page.getByRole('button',{name:'标记本课已完成',exact:true}).click();await saved(page);
  await page.getByRole('button',{name:'错题本',exact:true}).click();await page.getByRole('button',{name:'提交重答',exact:true}).waitFor();
  await page.getByRole('button',{name:'模拟考试',exact:true}).click();assert.equal(await page.getByRole('button',{name:'开始新一次考试',exact:true}).count(),4);
  await context.close();context=await launch();await context.setOffline(true);page=context.pages()[0];page.on('dialog',d=>d.accept());
  await page.goto(url);await banner(page,true);
  await page.getByRole('button',{name:'Day 45 开始学习',exact:true}).click();assert.equal(await page.locator(`#${d.translations[0].id}`).inputValue(),'离线保存的译文');await page.getByText('本次得分 4 / 5').waitFor();
  console.log('断网90课导航、词卡、选择题、翻译、错题、四套模考入口和浏览器退出后重开通过');

  // 版本B完整下载后等待，当前学习窗口仍使用A。
  await context.setOffline(false);
  fs.writeFileSync(path.join(mounted,'index.html'),htmlA.replace('</head>','<!-- offline-update-test-B --></head>'));
  const b=writeOfflineWorker(mounted,base,path.resolve('scripts/service-worker.template.js'));
  await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
  await page.getByText(/新版本已缓存/).waitFor();
  assert.equal((await status(page)).version,manifest.version);
  await context.setOffline(true);await page.reload();await banner(page,true);assert.equal((await page.content()).includes('offline-update-test-B'),false);
  await context.close();context=await launch();await context.setOffline(true);page=context.pages()[0];
  await page.goto(url);await banner(page,true);assert.equal((await status(page)).version,b.version);assert.equal((await page.content()).includes('offline-update-test-B'),true);
  console.log('更新等待当前窗口结束，关闭浏览器后断网启用新版通过');

  // 版本C的资源故意与清单不符，不能覆盖有效的B。
  await context.setOffline(false);
  fs.writeFileSync(path.join(mounted,'index.html'),htmlA.replace('</head>','<!-- offline-update-test-C --></head>'));
  const c=writeOfflineWorker(mounted,base,path.resolve('scripts/service-worker.template.js'));
  fs.writeFileSync(path.join(mounted,scriptPath),scriptA+'\n/* broken release */');
  await page.evaluate(async()=>{
    const registration=await navigator.serviceWorker.getRegistration();
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('failed update timeout')),15000);registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant'){clearTimeout(timer);resolve();}});},{once:true});registration.update().catch(reject);});
  });
  await context.setOffline(true);await page.reload();await banner(page,true);assert.equal((await status(page)).version,b.version);
  assert.equal(await page.evaluate(async name=>(await caches.keys()).includes(name),c.prefix+c.version),false);
  console.log('资源不完整或哈希不一致时保留旧版离线课程通过');

  // 模拟缓存被浏览器回收，恢复联网后通过现有入口修复。
  fs.writeFileSync(path.join(mounted,'index.html'),htmlA.replace('</head>','<!-- offline-update-test-B --></head>'));fs.writeFileSync(path.join(mounted,scriptPath),scriptA);
  writeOfflineWorker(mounted,base,path.resolve('scripts/service-worker.template.js'));
  await page.evaluate(async name=>caches.delete(name),b.prefix+b.version);
  await context.setOffline(false);await page.getByRole('button',{name:'重试缓存',exact:true}).click();await banner(page,false);
  await context.setOffline(true);await page.reload();await banner(page,true);
  await page.getByRole('button',{name:'Day 45 开始学习',exact:true}).click();assert.equal(await page.locator(`#${d.translations[0].id}`).inputValue(),'离线保存的译文');
  fs.mkdirSync('output/checks',{recursive:true});fs.writeFileSync('output/checks/offline-browser.json',JSON.stringify({result:'passed',base,resources:manifest.resources.length,offlineDays:90,coldBrowserRestart:true,progressPreserved:true,waitingUpdate:true,rejectedBrokenUpdate:true,cacheRepair:true},null,2));
  console.log('缓存回收后的联网修复及学习记录保留通过');
 } finally {if(context)await context.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(temporary,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
