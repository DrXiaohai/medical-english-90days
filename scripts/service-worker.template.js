/* 构建时填入静态资源清单；本文件不包含任何个人学习记录。 */
const CONFIG = __OFFLINE_CONFIG__;
const CACHE_NAME = CONFIG.prefix + CONFIG.version;
const SHELL_URL = new URL('index.html', self.registration.scope).href;
const RESOURCES = CONFIG.resources.map(item => ({ ...item, absolute: new URL(item.url, self.location.origin).href }));
const STATIC_URLS = new Set(RESOURCES.map(item => item.absolute));
let repairTask = null;

async function downloadResources() {
  // 整批校验通过后才写缓存，防止发布切换时HTML与资源版本混用。
  const responses = await Promise.all(RESOURCES.map(async item => {
    const response = await fetch(new Request(item.absolute, { cache: 'reload', credentials: 'same-origin' }));
    if (!response.ok || response.type === 'opaque') throw new Error('离线资源下载失败');
    const bytes = await response.clone().arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    if (actual !== item.sha256) throw new Error('离线资源版本尚未同步');
    return [item.absolute, response];
  }));
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
}

async function cacheStatus() {
  const exists = (await caches.keys()).includes(CACHE_NAME);
  if (!exists) return { ready: false, version: CONFIG.version, files: 0, total: RESOURCES.length };
  const cache = await caches.open(CACHE_NAME);
  const matches = await Promise.all(RESOURCES.map(item => cache.match(item.absolute)));
  const files = matches.filter(Boolean).length;
  return { ready: files === RESOURCES.length, version: CONFIG.version, files, total: RESOURCES.length };
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      await downloadResources();
      // 更新版本保持等待状态，已有学习窗口结束后再接管。
      if (!self.registration.active) await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CONFIG.prefix) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(CONFIG.base)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(SHELL_URL)) || fetch(request);
    })());
    return;
  }
  url.search = '';
  url.hash = '';
  if (!STATIC_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(url.href)) || fetch(request);
  })());
});

self.addEventListener('message', event => {
  if (!event.ports[0]) return;
  if (event.data?.type === 'CACHE_STATUS') {
    event.waitUntil(cacheStatus().then(status => event.ports[0].postMessage(status)));
  }
  if (event.data?.type === 'REPAIR_CACHE') {
    // 浏览器回收缓存后可联网修复，同一时刻只执行一个修复任务。
    if (!repairTask) repairTask = downloadResources().finally(() => { repairTask = null; });
    event.waitUntil(repairTask.then(cacheStatus).then(status => event.ports[0].postMessage(status)).catch(() => event.ports[0].postMessage({ ready: false, error: true })));
  }
});
