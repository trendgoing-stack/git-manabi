// 検索タブ：逆引き＋正引き。語が空ならカテゴリ一覧とシーン別チートシートを出す。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { itemBadges } from '../ui/badges.js';
import { db, getIndex, getEntry } from '../data.js';
import { search } from '../search.js';
import { replace } from '../router.js';
import { displaySyntax } from '../ui/builder-ui.js';
import { APP_NAME, CATEGORIES, TOOLS, SEARCH_DEBOUNCE_MS, SEARCH_LIMIT } from '../config.js';

/** @param {import('../router.js').RouteCtx} ctx */
export function renderSearch(ctx) {
  // 検索はアプリのトップ画面なので、ヘッダーにはアプリ名を出す
  const view = screen({ title: APP_NAME, tab: 'search' });
  const state = {
    q: ctx.query.get('q') || '',
    tool: ctx.query.get('tool') || '',
    cat: ctx.query.get('cat') || '',
  };

  const results = h('div', { class: 'results', 'aria-live': 'polite' });

  const syncUrl = () => {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.tool) p.set('tool', state.tool);
    if (state.cat) p.set('cat', state.cat);
    const qs = p.toString();
    replace('/search' + (qs ? '?' + qs : ''));
  };

  const update = () => {
    syncUrl();
    renderResults(results, state);
  };

  let timer = 0;
  const input = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'やりたいこと・コマンド名で検索',
    'aria-label': '検索語',
    enterkeyhint: 'search',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    value: state.q,
    oninput: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.q = input.value;
        update();
      }, SEARCH_DEBOUNCE_MS);
    },
    onkeydown: (e) => {
      if (e.key === 'Enter') input.blur();
    },
  });

  const toolChips = h(
    'div',
    { class: 'chips', role: 'group', 'aria-label': 'ツールで絞り込み' },
    [{ id: '', short: 'すべて' }, ...TOOLS, { id: 'mine', short: '自作' }].map((t) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip',
          'aria-pressed': String(state.tool === t.id),
          onclick: (e) => {
            state.tool = t.id;
            for (const c of toolChips.children) c.setAttribute('aria-pressed', String(c === e.currentTarget));
            update();
          },
        },
        t.short
      )
    )
  );

  const catSelect = h(
    'select',
    {
      class: 'select',
      'aria-label': 'カテゴリで絞り込み',
      onchange: () => {
        state.cat = catSelect.value;
        update();
      },
    },
    h('option', { value: '' }, 'すべてのカテゴリ'),
    CATEGORIES.map((c) => h('option', { value: c.id, selected: state.cat === c.id }, c.label))
  );

  view.append(
    h('div', { class: 'search-bar' }, input, h('div', { class: 'filters' }, toolChips, catSelect)),
    results
  );
  renderResults(results, state);
}

function renderResults(box, state) {
  box.replaceChildren();
  if (!state.q.trim() && !state.tool && !state.cat) {
    box.append(renderHome());
    return;
  }
  const { items, total } = search(getIndex(), state.q, {
    tool: state.tool,
    category: state.cat,
    limit: SEARCH_LIMIT,
  });
  if (total === 0) {
    box.append(
      h(
        'div',
        { class: 'empty' },
        h('p', null, '見つかりませんでした。'),
        h('p', { class: 'sub' }, '言い換えるか、別の言葉で試してください。状況から探すこともできます。'),
        h('a', { class: 'btn', href: '#/trouble' }, '「困った」から探す')
      )
    );
    return;
  }
  box.append(
    h('p', { class: 'result-count' }, total > items.length ? `${total} 件中 上位 ${items.length} 件` : `${total} 件`),
    h('ul', { class: 'result-list' }, items.map(resultRow))
  );
}

/** 検索結果の1行 */
export function resultRow(item) {
  const href = item.isSnippet ? `#/snippet/${item.id}` : `#/entry/${item.id}`;
  const cmd = item.syntax ? displaySyntax(item.syntax).split('\n')[0] : null;
  return h(
    'li',
    null,
    h(
      'a',
      { class: 'result', href },
      cmd ? h('code', { class: 'result-cmd' }, cmd) : null,
      h('span', { class: 'result-title' }, item.title),
      h('span', { class: 'badges' }, itemBadges(item))
    )
  );
}

function renderHome() {
  const counts = new Map();
  for (const e of db.entries) counts.set(e.category, (counts.get(e.category) || 0) + 1);

  const cats = CATEGORIES.filter((c) => counts.get(c.id));
  const scenes = db.scenes
    .map((s) => ({ ...s, items: s.entryIds.map(getEntry).filter(Boolean) }))
    .filter((s) => s.items.length);

  return h(
    'div',
    { class: 'home' },
    h('h2', { class: 'section-title' }, 'カテゴリ'),
    cats.length
      ? h(
          'ul',
          { class: 'cat-grid' },
          cats.map((c) =>
            h(
              'li',
              null,
              h(
                'a',
                { class: 'cat-card', href: `#/search?cat=${c.id}` },
                h('span', null, c.label),
                h('span', { class: 'count' }, String(counts.get(c.id)))
              )
            )
          )
        )
      : h('p', { class: 'sub' }, 'カテゴリを読み込めませんでした。'),
    scenes.length ? h('h2', { class: 'section-title' }, 'シーン別チートシート') : null,
    scenes.map((s) =>
      h(
        'section',
        { class: 'scene' },
        h('h3', null, s.title),
        s.desc ? h('p', { class: 'sub' }, s.desc) : null,
        h(
          'ul',
          { class: 'scene-list' },
          s.items.map((e) =>
            h(
              'li',
              null,
              h(
                'a',
                { href: `#/entry/${e.id}` },
                e.syntax ? h('code', null, displaySyntax(e.syntax).split('\n')[0]) : null,
                h('span', null, e.title)
              )
            )
          )
        )
      )
    ),
    h('p', { class: 'sub home-note' }, `収録 ${db.entries.length} 件`)
  );
}
