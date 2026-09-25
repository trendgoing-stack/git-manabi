// 画面下部に短いメッセージを出す。

let timer = 0;

/**
 * @param {string} message  改行で複数行
 * @param {{kind?: 'info'|'warn'|'error', ms?: number}} [opt]
 */
export function toast(message, opt = {}) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = message;
  el.dataset.kind = opt.kind || 'info';
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), opt.ms ?? 2200);
}
