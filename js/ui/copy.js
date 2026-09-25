// コピー＋トースト表示。タップのハンドラから同期的に呼ぶこと。

import { h } from './dom.js';
import { copyText } from '../clipboard.js';
import { toast } from './toast.js';
import { confirmDialog } from './dialog.js';
import { rich } from './rich.js';
import { getSettings } from '../storage.js';

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

/**
 * 危険度が danger の項目は、設定に応じて確認ダイアログを挟んでからコピーする。
 * ダイアログの「コピーする」ボタンのタップ内でコピーを開始するので、iOS でも失敗しない。
 * @param {{danger?: string, dangerNote?: string, undo?: string}|null} entry
 * @param {string} text
 * @param {{missing?: boolean, selectEl?: HTMLElement}} [opt]
 */
export function guardedCopy(entry, text, opt = {}) {
  if (entry?.danger !== 'danger' || !getSettings().confirmDanger) {
    copyWithToast(text, opt);
    return;
  }
  confirmDialog({
    title: '危険なコマンドです',
    body: [
      h('pre', { class: 'dialog-cmd' }, text),
      entry.dangerNote ? h('div', { class: 'dialog-block' }, h('h3', null, '危険な理由'), h('div', { class: 'rich' }, rich(entry.dangerNote))) : null,
      entry.undo ? h('div', { class: 'dialog-block' }, h('h3', null, '元に戻す方法'), h('div', { class: 'rich' }, rich(entry.undo))) : null,
      h('p', { class: 'sub' }, '実行する前に、バックアップを取るかブランチを作っておくと安心です。'),
    ],
    okLabel: 'コピーする',
    danger: true,
    onOk: () => copyWithToast(text, opt),
  });
}
