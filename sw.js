// Service Worker：アプリ本体と data/ の JSON をキャッシュファーストで返す。
//
// ★ アプリや辞書データを更新したら VERSION を必ず上げる（上げないと利用者に届かない）。
//   SHELL にファイルを追加・削除したときも上げる。手順は README.md を参照。
const VERSION = '1.1.0-1';
const CACHE = `gitdict-${VERSION}`;

// アプリ本体（data/ の JSON は meta.json の entryFiles を読んで追加する）
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './count.js',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/analytics.js',
  './js/app.js',
  './js/app-settings.js',
  './js/builder.js',
  './js/clipboard.js',
  './js/config.js',
  './js/data.js',
  './js/diagram.js',
  './js/flow.js',
  './js/markup.js',
  './js/normalize.js',
  './js/pwa.js',
  './js/quiz.js',
  './js/router.js',
  './js/search.js',
  './js/snippets.js',
  './js/storage.js',
  './js/types.js',
  './js/ui/badges.js',
  './js/ui/builder-ui.js',
  './js/ui/chrome.js',
  './js/ui/copy.js',
  './js/ui/dialog.js',
  './js/ui/dom.js',
  './js/ui/rich.js',
  './js/ui/sheet.js',
  './js/ui/toast.js',
  './js/views/cards.js',
  './js/views/entry.js',
  './js/views/help.js',
  './js/views/learn.js',
  './js/views/my.js',
  './js/views/quiz.js',
  './js/views/search.js',
  './js/views/settings.js',
  './js/views/snippet.js',
  './js/views/trouble.js',
];
const DATA_FIXED = ['./data/meta.json', './data/flows.json', './data/glossary.json', './data/quiz.json', './data/scenes.json'];

/** HTTP キャッシュを通さずに取得する */
const fresh = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map(fresh));
      // 辞書データ：meta.json に書かれたエントリファイルも含めて取得する
      const metaRes = await fetch(fresh('./data/meta.json'));
      const meta = await metaRes.clone().json();
      const entryFiles = (meta.entryFiles || []).map((f) => './data/' + f);
      await cache.addAll([...DATA_FIXED, ...entryFiles].map(fresh));
      // skipWaiting はしない。画面の「更新があります」をタップしたときに切り替える
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('gitdict-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 別オリジン（GoatCounter など）には介入しない：respondWith を呼ばず、ブラウザにそのまま任せる
  if (url.origin !== self.location.origin) return;
  // 検証ページやテストはキャッシュしない
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.pathname.startsWith(scopePath + 'tools/')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // 画面遷移（ホーム画面からの起動など）は、クエリに関係なく index.html を返す
      if (req.mode === 'navigate') {
        const shell = (await cache.match('./index.html')) || (await cache.match('./'));
        if (shell) return shell;
      }
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
