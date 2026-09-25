// コピー＋トースト表示。タップのハンドラから同期的に呼ぶこと。

import { copyText } from '../clipboard.js';
import { toast } from './toast.js';

/**
 * @param {string} text
 * @param {{missing?: boolean, selectEl?: HTMLElement}} [opt]
 */
export function copyWithToast(text, opt = {}) {
  copyText(text, {
    selectEl: opt.selectEl,
    onSuccess: () => toast(opt.missing ? 'コピーしました\n未入力の項目があります' : 'コピーしました'),
    onManual: () => toast('手動でコピーしてください（選択済みです）', { kind: 'warn', ms: 4000 }),
  });
}
