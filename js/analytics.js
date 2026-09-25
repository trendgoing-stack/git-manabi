// アクセス解析（GoatCounter）。アプリ起動時に1回だけ、固定のパスを送る。
// 設定で「送信しない」を選んでいる場合は count.js を読み込まない。

import { getSettings } from './storage.js';

const ENDPOINT = 'https://km-apps.goatcounter.com/count';
/** 送るパスは固定（ハッシュ、検索語、エントリ id は送らない） */
const FIXED_PATH = '/git-manabi/';
const FIXED_TITLE = 'Gitまなび帳';

export function startAnalytics() {
  if (getSettings().analyticsOff) return;
  const s = document.createElement('script');
  s.src = './count.js';
  s.async = true;
  s.dataset.goatcounter = ENDPOINT;
  s.dataset.path = FIXED_PATH;
  s.dataset.title = FIXED_TITLE;
  s.onerror = () => {};
  document.head.append(s);
}
