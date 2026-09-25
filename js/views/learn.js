// 学ぶタブ：メニューと用語集（クイズとフラッシュカードはフェーズ3）。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { showTerm } from '../ui/rich.js';
import { plain } from '../markup.js';
import { db } from '../data.js';
import { normalize } from '../normalize.js';
import { SEARCH_DEBOUNCE_MS } from '../config.js';
import { replace } from '../router.js';

export function renderLearn() {
  const view = screen({ title: '学ぶ', tab: 'learn' });
  const card = (href, title, desc, disabled) =>
    h(
      'li',
      null,
      disabled
        ? h('div', { class: 'menu-card disabled', 'aria-disabled': 'true' }, h('strong', null, title), h('span', { class: 'sub' }, desc))
        : h('a', { class: 'menu-card', href }, h('strong', null, title), h('span', { class: 'sub' }, desc))
    );
  view.append(
    h(
      'ul',
      { class: 'menu-list' },
      card('#/learn/quiz', 'クイズ', '4択で10問。苦手な問題の復習もできます'),
      card('#/learn/cards', 'フラッシュカード', '表にやりたいこと、裏にコマンド'),
      card('#/learn/glossary', '用語集', `${db.glossary.length} 語を五十音順に`)
    )
  );
}

/** 五十音の行（見出し用） */
const ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
function rowOf(reading) {
  const c = normalize(reading || '').charAt(0);
  if (!c) return '他';
  let row = '他';
  for (const r of ROWS) if (c.localeCompare(r, 'ja') >= 0) row = r;
  return /[ぁ-ゟ]/.test(c) ? row : '他';
}

/** @param {import('../router.js').RouteCtx} ctx */
export function renderGlossary(ctx) {
  const view = screen({ title: '用語集', tab: 'learn', showBack: true, backTo: '/learn' });
  const sorted = [...db.glossary].sort((a, b) => a.reading.localeCompare(b.reading, 'ja'));
  const list = h('div', { class: 'glossary' });
  let timer = 0;

  const paint = (q) => {
    const words = normalize(q).split(' ').filter(Boolean);
    const hits = sorted.filter((t) => {
      const hay = normalize([t.term, t.reading, ...(t.aliases || []), plain(t.def)].join(' '));
      return words.every((w) => hay.includes(w));
    });
    if (!hits.length) {
      list.replaceChildren(h('p', { class: 'empty sub' }, '見つかりませんでした。'));
      return;
    }
    const groups = new Map();
    for (const t of hits) {
      const r = rowOf(t.reading);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(t);
    }
    list.replaceChildren(
      ...[...groups].map(([row, terms]) =>
        h(
          'section',
          { class: 'glossary-group' },
          h('h2', { class: 'section-title' }, row === '他' ? 'その他' : `${row}行`),
          h(
            'ul',
            { class: 'result-list' },
            terms.map((t) =>
              h(
                'li',
                null,
                h(
                  'button',
                  { type: 'button', class: 'result term-row', onclick: () => showTerm(t) },
                  h('span', { class: 'result-title' }, t.term),
                  h('span', { class: 'sub' }, plain(t.def).slice(0, 48) + (plain(t.def).length > 48 ? '…' : ''))
                )
              )
            )
          )
        )
      )
    );
  };

  const initial = ctx.query.get('q') || '';
  const input = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: '用語を検索',
    'aria-label': '用語を検索',
    autocomplete: 'off',
    autocapitalize: 'off',
    value: initial,
    oninput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        replace('/learn/glossary' + (input.value ? '?q=' + encodeURIComponent(input.value) : ''));
        paint(input.value);
      }, SEARCH_DEBOUNCE_MS);
    },
  });
  view.append(h('div', { class: 'search-bar' }, input), list);
  paint(initial);
}
