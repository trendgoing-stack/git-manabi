// フラッシュカード：表にやりたいこと、裏にコマンドと要約。
// 左右スワイプ（Pointer Events）かボタンで移動。touch-action: pan-y で縦スクロールは妨げない。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { rich } from '../ui/rich.js';
import { db } from '../data.js';
import { getSettings } from '../storage.js';
import { shuffle, commandOf } from '../quiz.js';
import { TOOLS, CATEGORIES } from '../config.js';

const SWIPE_PX = 60;
const state = { tool: '', category: '', shuffled: false };

export function renderCards() {
  const view = screen({ title: 'フラッシュカード', tab: 'learn', showBack: true, backTo: '/learn' });
  const stage = h('div', { class: 'cards-stage' });

  const makeDeck = () => {
    const showUnverified = getSettings().showUnverified;
    const deck = db.entries.filter(
      (e) => (showUnverified || e.verified) && (!state.tool || e.tool === state.tool) && (!state.category || e.category === state.category)
    );
    return state.shuffled ? shuffle(deck) : deck;
  };

  const sel = (label, options, key) => {
    const s = h(
      'select',
      {
        class: 'select',
        'aria-label': label,
        onchange: () => {
          state[key] = s.value;
          start();
        },
      },
      options.map((o) => h('option', { value: o.value, selected: state[key] === o.value }, o.label))
    );
    return s;
  };
  const shuffleBtn = h(
    'button',
    {
      type: 'button',
      class: 'chip',
      'aria-pressed': String(state.shuffled),
      onclick: () => {
        state.shuffled = !state.shuffled;
        shuffleBtn.setAttribute('aria-pressed', String(state.shuffled));
        start();
      },
    },
    'シャッフル'
  );

  const start = () => {
    const deck = makeDeck();
    if (!deck.length) {
      stage.replaceChildren(h('p', { class: 'empty sub' }, 'この範囲に表示できるカードがありません。'));
      return;
    }
    runDeck(stage, deck);
  };

  view.append(
    h(
      'div',
      { class: 'cards-filters' },
      sel('ツール', [{ value: '', label: 'すべてのツール' }, ...TOOLS.map((t) => ({ value: t.id, label: t.label }))], 'tool'),
      sel('カテゴリ', [{ value: '', label: 'すべてのカテゴリ' }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))], 'category'),
      shuffleBtn
    ),
    stage
  );
  start();
}

function runDeck(stage, deck) {
  let i = 0;
  let flipped = false;

  const front = h('div', { class: 'card-face card-front' });
  const backFace = h('div', { class: 'card-face card-back' });
  const card = h('div', {
    class: 'flashcard',
    role: 'button',
    tabindex: '0',
    'aria-live': 'polite',
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      } else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
    },
  }, front, backFace);
  const counter = h('span', { class: 'cards-counter' });

  const paint = () => {
    const e = deck[i];
    front.replaceChildren(
      h('span', { class: 'card-hint' }, 'やりたいこと'),
      h('p', { class: 'card-title' }, e.title),
      e.verified ? null : h('span', { class: 'badge badge-unverified' }, '未確認'),
      h('span', { class: 'card-hint' }, 'タップで裏返す')
    );
    backFace.replaceChildren(
      h('span', { class: 'card-hint' }, e.syntax ? 'コマンド' : 'GitHub の画面で操作'),
      e.syntax ? h('code', { class: 'card-cmd' }, commandOf(e)) : null,
      h('p', { class: 'card-summary' }, rich(e.summary, { inline: true })),
      h('a', { href: `#/entry/${e.id}`, class: 'card-link' }, '詳しく見る')
    );
    card.classList.toggle('is-flipped', flipped);
    card.setAttribute('aria-label', flipped ? `裏：${e.syntax ? commandOf(e) : e.title}` : `表：${e.title}`);
    front.hidden = flipped;
    backFace.hidden = !flipped;
    counter.textContent = `${i + 1} / ${deck.length}`;
  };
  const flip = () => {
    flipped = !flipped;
    paint();
  };
  const move = (d) => {
    i = (i + d + deck.length) % deck.length;
    flipped = false;
    paint();
  };

  // ---- スワイプ（Pointer Events） ----
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let active = false;
  let horizontal = false;
  card.addEventListener('pointerdown', (e) => {
    // カード内のリンクや用語ボタンは、それ自体の操作を優先する
    if (e.button !== 0 || e.target.closest('a, button')) return;
    active = true;
    horizontal = false;
    sx = e.clientX;
    sy = e.clientY;
    dx = 0;
  });
  card.addEventListener('pointermove', (e) => {
    if (!active) return;
    dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (!horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      horizontal = true;
      card.setPointerCapture(e.pointerId);
    }
    if (horizontal) card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
  });
  const end = (e) => {
    if (!active) return;
    active = false;
    card.style.transform = '';
    if (e.type === 'pointercancel') return;
    if (horizontal && Math.abs(dx) > SWIPE_PX) move(dx < 0 ? 1 : -1);
    else if (!horizontal && Math.abs(e.clientY - sy) < 10 && Math.abs(dx) < 10) flip();
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  stage.replaceChildren(
    card,
    h(
      'div',
      { class: 'cards-controls' },
      h('button', { type: 'button', class: 'btn', 'aria-label': '前のカード', onclick: () => move(-1) }, '← 前へ'),
      counter,
      h('button', { type: 'button', class: 'btn', 'aria-label': '次のカード', onclick: () => move(1) }, '次へ →')
    ),
    h('button', { type: 'button', class: 'btn btn-block', onclick: flip }, '裏返す'),
    h('p', { class: 'sub cards-help' }, 'カードを左右にスワイプしても移動できます。')
  );
  paint();
}
