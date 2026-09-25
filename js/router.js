// ハッシュルーティング。#/entry/<id>?a=b の形式。

/**
 * @typedef {{path: string, params: Object<string,string>, query: URLSearchParams}} RouteCtx
 * @typedef {{pattern: string, re: RegExp, keys: string[], handler: (ctx: RouteCtx) => void}} Route
 */

/** @type {Route[]} */
const routes = [];
let notFound = (ctx) => {};
/** アプリ内での深さ。history.state.d に保存し、戻る／進むでも正しく復元する。 */
let depth = 0;

/**
 * @param {string} pattern  例：'/entry/:id'
 * @param {(ctx: RouteCtx) => void} handler
 */
export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp(
    '^' +
      pattern.replace(/:([a-zA-Z]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '$'
  );
  routes.push({ pattern, re, keys, handler });
}

export function fallback(handler) {
  notFound = handler;
}

/** 現在のハッシュを {path, query} に分ける */
export function current() {
  const raw = location.hash.replace(/^#/, '') || '/search';
  const [path, qs = ''] = raw.split('?');
  return { path, query: new URLSearchParams(qs) };
}

function dispatch() {
  const { path, query } = current();
  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
    r.handler({ path, params, query });
    return;
  }
  notFound({ path, params: {}, query });
}

export function start() {
  const st = history.state;
  if (st && typeof st.d === 'number') depth = st.d;
  else history.replaceState({ d: 0 }, '');
  window.addEventListener('hashchange', () => {
    const s = history.state;
    if (s && typeof s.d === 'number') {
      depth = s.d;
    } else {
      depth += 1;
      history.replaceState({ d: depth }, '');
    }
    dispatch();
  });
  dispatch();
}

/** 画面遷移（履歴に積む） */
export function go(path) {
  location.hash = '#' + path;
}

/** 履歴を積まずにハッシュを書き換える（検索語の入力中など）。画面の再描画はしない。 */
export function replace(path) {
  history.replaceState(history.state, '', '#' + path);
}

/** アプリ内で前の画面があれば戻り、なければ指定の画面へ */
export function back(fallbackPath = '/search') {
  if (depth > 0) {
    history.back();
  } else {
    go(fallbackPath);
  }
}
