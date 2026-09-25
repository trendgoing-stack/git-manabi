// 未確認項目の表示設定に従って、エントリを表示してよいかを判定する。

import { getSettings } from './storage.js';

/** @param {import('./types.js').Entry|undefined|null} e */
export function isVisible(e) {
  return !!e && (e.verified === true || getSettings().showUnverified);
}
