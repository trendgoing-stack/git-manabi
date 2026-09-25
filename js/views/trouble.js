// 困ったタブ：トラブル脱出フローチャート。
// 選択のたびに #/trouble/<flow>?path=q1.q2.r3 を履歴に積むので、ブラウザの戻る＝1つ戻る。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { rich } from '../ui/rich.js';
import { resultRow } from './search.js';
import { db, getEntry } from '../data.js';
import { go, redirect, back } from '../router.js';
import { validPath } from '../flow.js';

/** 選択肢のタップで積んだパス（「1つ戻る」で history.back してよいかの判定用） */
let pushed = [];

export function renderTroubleList() {
  const view = screen({ title: '困った', tab: 'trouble' });
  pushed = [];
  view.append(
    h('p', { class: 'sub lead' }, '今の状況に近いものを選び、質問に答えていくと、使うコマンドが見つかります。'),
    db.flows.length
      ? h(
          'ul',
          { class: 'menu-list' },
          db.flows.map((f) => h('li', null, h('a', { class: 'menu-card', href: `#/trouble/${f.id}` }, h('strong', null, f.title))))
        )
      : h('p', { class: 'empty sub' }, 'フローチャートを読み込めませんでした。'),
    h('p', { class: 'sub lead' }, '見つからないときは、検索タブでやりたいことを入力してみてください。')
  );
}

/** @param {import('../router.js').RouteCtx} ctx */
export function renderFlow(ctx) {
  const flow = db.flows.find((f) => f.id === ctx.params.id);
  const view = screen({ title: flow?.title ?? '困った', tab: 'trouble', showBack: true, backTo: '/trouble' });
  if (!flow) {
    view.append(h('div', { class: 'empty' }, h('p', null, 'このフローチャートは見つかりませんでした。'), h('a', { class: 'btn', href: '#/trouble' }, '一覧へ')));
    return;
  }
  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  const raw = (ctx.query.get('path') || '').split('.').filter(Boolean);
  const path = validPath(flow, raw);
  const key = `${flow.id}:${path.join('.')}`;
  const url = (p) => `/trouble/${flow.id}` + (p.length > 1 ? `?path=${p.join('.')}` : '');

  // ブラウザの戻る・進むで来た場合に合わせて、積んだ記録を整える
  while (pushed.length && pushed[pushed.length - 1] !== key) pushed.pop();

  const choose = (next) => {
    const p = [...path, next];
    pushed.push(`${flow.id}:${p.join('.')}`);
    go(url(p));
  };
  const stepBack = () => {
    if (path.length <= 1) return;
    if (pushed[pushed.length - 1] === key) back(url(path.slice(0, -1)));
    else redirect(url(path.slice(0, -1)));
  };

  // パンくず：これまでの質問と選んだ答え
  const crumbs = path.slice(0, -1).map((id, i) => {
    const q = nodes.get(id);
    const choice = q.choices.find((c) => c.next === path[i + 1]);
    return h(
      'li',
      null,
      h('a', { href: '#' + url(path.slice(0, i + 1)), class: 'crumb' }, h('span', { class: 'crumb-q' }, rich(q.question, { inline: true })), h('span', { class: 'crumb-a' }, `→ ${choice.label}`))
    );
  });

  const node = nodes.get(path[path.length - 1]);
  const body =
    'question' in node
      ? h(
          'section',
          { class: 'flow-card' },
          h('p', { class: 'flow-step' }, `質問 ${path.length}`),
          h('h2', { class: 'flow-q' }, rich(node.question, { inline: true })),
          h(
            'div',
            { class: 'flow-choices' },
            node.choices.map((c) => h('button', { type: 'button', class: 'btn flow-choice', onclick: () => choose(c.next) }, c.label))
          )
        )
      : h(
          'section',
          { class: 'flow-card flow-result' },
          h('p', { class: 'flow-step' }, 'おすすめの方法'),
          h('div', { class: 'rich' }, rich(node.note)),
          h('ul', { class: 'result-list' }, node.entryIds.map(getEntry).filter(Boolean).map(resultRow))
        );

  view.append(
    crumbs.length ? h('ol', { class: 'crumbs', 'aria-label': 'これまでの回答' }, crumbs) : null,
    body,
    h(
      'div',
      { class: 'action-row' },
      h('button', { type: 'button', class: 'btn', disabled: path.length <= 1, onclick: stepBack }, '1つ戻る'),
      h('button', { type: 'button', class: 'btn', disabled: path.length <= 1, onclick: () => go(url([flow.start])) }, '最初からやり直す')
    )
  );
}
