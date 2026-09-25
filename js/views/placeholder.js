// まだ実装していないタブの仮画面。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';

/**
 * @param {{title: string, tab: any, lines: string[]}} opt
 */
export function renderPlaceholder(opt) {
  const view = screen({ title: opt.title, tab: opt.tab });
  view.append(h('div', { class: 'empty' }, opt.lines.map((l) => h('p', null, l))));
}
