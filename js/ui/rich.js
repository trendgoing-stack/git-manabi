// [[用語]] 付きの本文を描画し、用語タップで定義をシート表示する。

import { h } from './dom.js';
import { renderRich } from '../markup.js';
import { findTerm, getEntry } from '../data.js';
import { openSheet } from './sheet.js';

/** @param {import('../types.js').GlossaryTerm} t */
export function showTerm(t) {
  const related = (t.related || []).map(getEntry).filter(Boolean);
  openSheet(t.term, [
    h('div', { class: 'rich' }, rich(t.def)),
    related.length
      ? h(
          'div',
          { class: 'sheet-related' },
          h('h3', null, '関連項目'),
          h('ul', { class: 'link-list' }, related.map((e) => h('li', null, h('a', { href: `#/entry/${e.id}` }, e.title))))
        )
      : null,
  ]);
}

function makeTerm(term, label) {
  const t = findTerm(term);
  if (!t) return h('span', { class: 'term-missing' }, label);
  return h('button', { type: 'button', class: 'term-link', onclick: () => showTerm(t) }, label);
}

/**
 * @param {string} text
 * @param {{inline?: boolean}} [opt]
 */
export function rich(text, opt) {
  return renderRich(text, makeTerm, opt);
}
