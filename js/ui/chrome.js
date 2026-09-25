// 画面の外枠（上部バー、タブバー、お知らせ帯）の操作。

import { back } from '../router.js';

/**
 * 画面を切り替える前に呼ぶ。上部バーとタブの状態を更新し、空の描画先を返す。
 * @param {{title: string, tab: 'search'|'trouble'|'learn'|'my'|'settings', showBack?: boolean, backTo?: string}} opt
 * @returns {HTMLElement}
 */
export function screen(opt) {
  document.getElementById('appbar-title').textContent = opt.title;
  const btn = document.getElementById('appbar-back');
  btn.hidden = !opt.showBack;
  btn.onclick = () => back(opt.backTo || `/${opt.tab}`);
  for (const a of document.querySelectorAll('.tabbar a')) {
    const on = a.dataset.tab === opt.tab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const view = document.getElementById('view');
  view.replaceChildren();
  view.dataset.tab = opt.tab;
  return view;
}

/**
 * 上部のお知らせ帯に1件追加する。
 * @param {string} id
 * @param {string|Node} content
 * @param {{kind?: 'info'|'warn', onclick?: () => void}} [opt]
 */
export function showBanner(id, content, opt = {}) {
  const box = document.getElementById('banners');
  box.querySelector(`[data-id="${id}"]`)?.remove();
  const el = document.createElement(opt.onclick ? 'button' : 'div');
  el.className = `banner banner-${opt.kind || 'info'}`;
  el.dataset.id = id;
  if (opt.onclick) {
    el.type = 'button';
    el.addEventListener('click', opt.onclick);
  }
  el.append(content);
  box.append(el);
}
