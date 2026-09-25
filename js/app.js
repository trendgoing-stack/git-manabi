// 起動処理：設定の反映 → データ読込 → ルーター開始

import * as storage from './storage.js';
import { loadAll, db } from './data.js';
import { route, fallback, start, go } from './router.js';
import { toast } from './ui/toast.js';
import { showBanner } from './ui/chrome.js';
import { applySettings } from './app-settings.js';
import { renderSearch } from './views/search.js';
import { renderEntry } from './views/entry.js';
import { renderSettings } from './views/settings.js';
import { renderPlaceholder } from './views/placeholder.js';

storage.onWriteError(() => toast('保存できませんでした（容量不足の可能性があります）', { kind: 'error', ms: 4000 }));
storage.init();
applySettings();

// ---- スクロール位置の復元 ----
// 各履歴エントリの state に y を保存し、戻ったときに復元する。
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let scrollTimer = 0;
window.addEventListener(
  'scroll',
  () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      history.replaceState({ ...(history.state || {}), y: window.scrollY }, '');
    }, 100);
  },
  { passive: true }
);

/** 描画後に、その履歴エントリで最後に見ていた位置へスクロールする */
function withScroll(render) {
  return (ctx) => {
    clearTimeout(scrollTimer);
    render(ctx);
    window.scrollTo(0, history.state?.y || 0);
  };
}

route('/search', withScroll(renderSearch));
route('/entry/:id', withScroll(renderEntry));
route('/trouble', withScroll(() => renderPlaceholder({ title: '困った', tab: 'trouble', lines: ['トラブル脱出フローチャートはフェーズ3で追加します。'] })));
route('/learn', withScroll(() => renderPlaceholder({ title: '学ぶ', tab: 'learn', lines: ['クイズ、フラッシュカード、用語集はフェーズ2〜3で追加します。'] })));
route('/my', withScroll(() => renderPlaceholder({ title: 'マイ', tab: 'my', lines: ['お気に入り、履歴、メモ、スニペットはフェーズ2で追加します。'] })));
route('/settings', withScroll(renderSettings));
fallback(() => go('/search'));

async function boot() {
  await loadAll();
  if (db.failed.length) {
    showBanner('load-failed', `読み込めなかったファイル：${db.failed.join('、')}`, { kind: 'warn' });
  }
  start();
}

boot();
