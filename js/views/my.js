// マイタブ：お気に入り、閲覧履歴、メモを付けた項目、自作スニペット。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { itemBadges } from '../ui/badges.js';
import { confirmDialog } from '../ui/dialog.js';
import { displaySyntax } from '../ui/builder-ui.js';
import { getEntry } from '../data.js';
import { getFavorites, moveFavorite, toggleFavorite, getHistory, clearHistory, getNotes, getSnippets, getSnippet } from '../storage.js';
import { snippetToItem } from '../snippets.js';
import { replace } from '../router.js';

const TABS = [
  { id: 'fav', label: 'お気に入り' },
  { id: 'history', label: '履歴' },
  { id: 'notes', label: 'メモ' },
  { id: 'snippets', label: 'スニペット' },
];

/** id からエントリかスニペット（エントリ形式）を引く */
function lookup(id) {
  if (id.startsWith('my-')) {
    const s = getSnippet(id);
    return s ? snippetToItem(s) : null;
  }
  return getEntry(id) ?? null;
}

function itemLink(item, extra) {
  const href = item.isSnippet ? `#/snippet/${item.id}` : `#/entry/${item.id}`;
  return h(
    'a',
    { class: 'result', href },
    item.syntax ? h('code', { class: 'result-cmd' }, displaySyntax(item.syntax).split('\n')[0]) : null,
    h('span', { class: 'result-title' }, item.title),
    extra,
    h('span', { class: 'badges' }, itemBadges(item))
  );
}

/** @param {import('../router.js').RouteCtx} ctx */
export function renderMy(ctx) {
  const view = screen({ title: 'マイ', tab: 'my' });
  let tab = TABS.some((t) => t.id === ctx.query.get('tab')) ? ctx.query.get('tab') : 'fav';
  const body = h('div', { class: 'my-body' });

  const tabs = h(
    'div',
    { class: 'segmented', role: 'tablist', 'aria-label': 'マイの表示切り替え' },
    TABS.map((t) =>
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': String(t.id === tab),
          onclick: (e) => {
            tab = t.id;
            for (const b of tabs.children) b.setAttribute('aria-selected', String(b === e.currentTarget));
            replace(`/my?tab=${tab}`);
            paint();
          },
        },
        t.label
      )
    )
  );

  const paint = () => {
    body.replaceChildren(
      tab === 'fav' ? favorites(paint) : tab === 'history' ? historyList(paint) : tab === 'notes' ? notesList() : snippetsList()
    );
  };

  view.append(tabs, body);
  paint();
}

function empty(...lines) {
  return h('div', { class: 'empty' }, lines.map((l) => (typeof l === 'string' ? h('p', { class: 'sub' }, l) : l)));
}

function favorites(repaint) {
  const ids = getFavorites();
  const items = ids.map((id) => ({ id, item: lookup(id) }));
  if (!items.length) return empty('お気に入りはまだありません。', '詳細画面の ☆ をタップすると追加できます。');
  let editing = false;
  const list = h('ul', { class: 'result-list' });
  const toggle = h('button', { type: 'button', class: 'btn-small', 'aria-pressed': 'false' }, '並べ替え・削除');
  const paintList = () => {
    toggle.setAttribute('aria-pressed', String(editing));
    toggle.textContent = editing ? '完了' : '並べ替え・削除';
    list.replaceChildren(
      ...items.map(({ id, item }, i) => {
        const main = item ? itemLink(item) : h('div', { class: 'result' }, h('span', { class: 'result-title sub' }, `削除された項目（${id}）`));
        if (!editing) return h('li', null, main);
        return h(
          'li',
          { class: 'edit-row' },
          h('div', { class: 'edit-row-main' }, item?.title ?? id),
          h('button', { type: 'button', class: 'btn-small', 'aria-label': '上へ', disabled: i === 0, onclick: () => { moveFavorite(id, -1); [items[i - 1], items[i]] = [items[i], items[i - 1]]; paintList(); } }, '↑'),
          h('button', { type: 'button', class: 'btn-small', 'aria-label': '下へ', disabled: i === items.length - 1, onclick: () => { moveFavorite(id, 1); [items[i + 1], items[i]] = [items[i], items[i + 1]]; paintList(); } }, '↓'),
          h('button', { type: 'button', class: 'btn-small danger-text', 'aria-label': 'お気に入りから外す', onclick: () => { toggleFavorite(id); items.splice(i, 1); items.length ? paintList() : repaint(); } }, '外す')
        );
      })
    );
  };
  toggle.addEventListener('click', () => {
    editing = !editing;
    paintList();
  });
  paintList();
  return h('div', null, h('div', { class: 'list-head' }, h('span', { class: 'sub' }, `${items.length} 件`), toggle), list);
}

function historyList(repaint) {
  const hist = getHistory()
    .map((x) => ({ ...x, item: lookup(x.id) }))
    .filter((x) => x.item);
  if (!hist.length) return empty('閲覧履歴はまだありません。');
  const fmt = new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return h(
    'div',
    null,
    h(
      'div',
      { class: 'list-head' },
      h('span', { class: 'sub' }, `最新 ${hist.length} 件`),
      h(
        'button',
        {
          type: 'button',
          class: 'btn-small danger-text',
          onclick: () =>
            confirmDialog({
              title: '閲覧履歴をすべて消しますか？',
              body: h('p', null, 'お気に入り、メモ、スニペットは消えません。'),
              okLabel: '消去する',
              danger: true,
              onOk: () => {
                clearHistory();
                repaint();
              },
            }),
        },
        '全消去'
      )
    ),
    h('ul', { class: 'result-list' }, hist.map((x) => h('li', null, itemLink(x.item, h('span', { class: 'result-meta' }, fmt.format(x.at))))))
  );
}

function notesList() {
  const notes = Object.entries(getNotes())
    .map(([id, n]) => ({ id, n, item: lookup(id) }))
    .filter((x) => x.item)
    .sort((a, b) => (b.n.updatedAt ?? 0) - (a.n.updatedAt ?? 0));
  if (!notes.length) return empty('メモを付けた項目はまだありません。', '詳細画面の下にある「自分用メモ」に書くと、ここに並びます。');
  return h(
    'ul',
    { class: 'result-list' },
    notes.map((x) => h('li', null, itemLink(x.item, h('span', { class: 'result-note' }, x.n.text.length > 80 ? x.n.text.slice(0, 80) + '…' : x.n.text))))
  );
}

function snippetsList() {
  const list = getSnippets();
  return h(
    'div',
    null,
    h('div', { class: 'list-head' }, h('span', { class: 'sub' }, `${list.length} 件`), h('a', { class: 'btn btn-primary btn-compact', href: '#/snippet/new' }, '＋ 追加')),
    list.length
      ? h('ul', { class: 'result-list' }, list.map((s) => h('li', null, itemLink(snippetToItem(s)))))
      : empty('自作スニペットはまだありません。', 'よく使うコマンドを登録すると、検索やコピーに使えます。')
  );
}
