// Service Worker の登録と、更新の通知。

import { showBanner } from './ui/chrome.js';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // 「更新があります」をタップした後に、新しい Service Worker へ切り替わったら一度だけ再読み込みする
  // （初回インストール時の clients.claim() では再読み込みしない）
  let updateRequested = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    location.reload();
  });

  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      const notify = (worker) =>
        showBanner('update', '更新があります（タップで再読み込み）', {
          kind: 'info',
          onclick: () => {
            updateRequested = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          },
        });

      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => {
          // 既存の Service Worker がある＝更新。初回インストールでは出さない
          if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w);
        });
      });

      // ホーム画面のアプリは開きっぱなしになりやすいので、表示に戻ったときにも更新を確認する
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    })
    .catch(() => {
      /* 登録できない環境（プライベートブラウズなど）では何もしない */
    });
}
