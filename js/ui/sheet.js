// 画面下からせり上がるシート（用語の定義表示など）。

import { h } from './dom.js';

let current = null;

export function closeSheet() {
  if (!current) return;
  const el = current;
  current = null;
  el.classList.remove('show');
  setTimeout(() => el.remove(), 200);
}

/**
 * @param {string} title
 * @param {Node|Node[]} body
 */
export function openSheet(title, body) {
  closeSheet();
  const panel = h(
    'div',
    { class: 'sheet-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h(
      'div',
      { class: 'sheet-head' },
      h('h2', null, title),
      h('button', { class: 'btn-icon', type: 'button', 'aria-label': '閉じる', onclick: closeSheet }, '×')
    ),
    h('div', { class: 'sheet-body' }, body)
  );
  const root = h('div', { class: 'sheet', onclick: (e) => e.target === root && closeSheet() }, panel);
  document.body.append(root);
  current = root;
  requestAnimationFrame(() => root.classList.add('show'));
  panel.querySelector('button')?.focus();
}

window.addEventListener('hashchange', closeSheet);
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeSheet());
