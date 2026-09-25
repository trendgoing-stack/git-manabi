// 確認ダイアログ（<dialog> 要素）。
// ボタンの onClick はタップのイベントハンドラ内で同期的に呼ばれるので、中でコピーを開始してよい。

import { h } from './dom.js';

/**
 * @typedef {{label: string, kind?: 'primary'|'danger'|'plain', onClick?: () => void}} DialogAction
 */

/**
 * @param {{title: string, body: Node|Node[]|string, actions: DialogAction[]}} opt
 * @returns {HTMLDialogElement}
 */
export function openDialog(opt) {
  const dlg = /** @type {HTMLDialogElement} */ (
    h(
      'dialog',
      { class: 'dialog', 'aria-label': opt.title },
      h('h2', { class: 'dialog-title' }, opt.title),
      h('div', { class: 'dialog-body' }, opt.body),
      h(
        'div',
        { class: 'dialog-actions' },
        opt.actions.map((a) =>
          h(
            'button',
            {
              type: 'button',
              class: `btn ${a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : ''}`,
              onclick: () => {
                a.onClick?.();
                close();
              },
            },
            a.label
          )
        )
      )
    )
  );
  const close = () => {
    if (dlg.open) dlg.close();
  };
  dlg.addEventListener('close', () => dlg.remove());
  // 背景（dialog 自身）をタップしたら閉じる
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });
  window.addEventListener('hashchange', close, { once: true });
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/**
 * はい／いいえの確認。
 * @param {{title: string, body: Node|Node[]|string, okLabel: string, danger?: boolean, onOk: () => void}} opt
 */
export function confirmDialog(opt) {
  return openDialog({
    title: opt.title,
    body: opt.body,
    actions: [
      { label: 'キャンセル', kind: 'plain' },
      { label: opt.okLabel, kind: opt.danger ? 'danger' : 'primary', onClick: opt.onOk },
    ],
  });
}
