// 起動処理：設定の反映 → データ読込 → ルーター開始

import * as storage from './storage.js';
import { loadAll, db, setExtraItems, invalidateIndex } from './data.js';
import { snippetToItem } from './snippets.js';
import { route, fallback, start, go } from './router.js';
import { toast } from './ui/toast.js';
import { showBanner } from './ui/chrome.js';
import { applySettings } from './app-settings.js';
import { renderSearch } from './views/search.js';
import { renderEntry } from './views/entry.js';
import { renderSettings } from './views/settings.js';
import { renderMy } from './views/my.js';
import { renderSnippet, renderSnippetEdit } from './views/snippet.js';
import { renderLearn, renderGlossary } from './views/learn.js';
import { renderTroubleList, renderFlow } from './views/trouble.js';
import { renderQuiz } from './views/quiz.js';
import { renderCards } from './views/cards.js';

storage.onWriteError(() => toast('保存できませんでした（容量不足の可能性があります）', { kind: 'error', ms: 4000 }));
storage.init();
applySettings();
// 自作スニペットも検索対象にする
setExtraItems(() => storage.getSnippets().map(snippetToItem));
storage.onChange(invalidateIndex);

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
route('/snippet/new', withScroll(renderSnippetEdit));
route('/snippet/:id', withScroll(renderSnippet));
route('/snippet/:id/edit', withScroll(renderSnippetEdit));
route('/trouble', withScroll(renderTroubleList));
route('/trouble/:id', withScroll(renderFlow));
route('/learn', withScroll(renderLearn));
route('/learn/glossary', withScroll(renderGlossary));
route('/learn/quiz', withScroll(renderQuiz));
route('/learn/cards', withScroll(renderCards));
route('/my', withScroll(renderMy));
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
