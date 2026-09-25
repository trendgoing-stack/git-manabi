// 設定値を画面全体に反映する。

import { getSettings } from './storage.js';

export function applySettings() {
  const s = getSettings();
  document.documentElement.dataset.font = s.fontSize;
}
