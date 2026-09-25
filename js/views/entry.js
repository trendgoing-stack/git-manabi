// 詳細画面。表示順は仕様どおり：
// タイトルと危険度 → ビルダー → 説明 → 使用例 → ブランチ図 → 元に戻す方法・代替手段
// → 前提・バージョン・シェル → 関連項目 → 自分用メモ

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { dangerBadge, toolBadge } from '../ui/badges.js';
import { rich } from '../ui/rich.js';
import { guardedCopy } from '../ui/copy.js';
import { renderBuilder, displaySyntax } from '../ui/builder-ui.js';
import { toast } from '../ui/toast.js';
import { getEntry } from '../data.js';
import { addHistory, isFavorite, toggleFavorite, getNote, setNote } from '../storage.js';
import { categoryLabel, NOTE_MAX_LENGTH } from '../config.js';

/** @param {import('../router.js').RouteCtx} ctx */
export function renderEntry(ctx) {
  const entry = getEntry(ctx.params.id);
  const view = screen({ title: entry ? categoryLabel(entry.category) : '見つかりません', tab: 'search', showBack: true, backTo: '/search' });
  if (!entry) {
    view.append(
      h('div', { class: 'empty' }, h('p', null, 'この項目は見つかりませんでした。'), h('a', { class: 'btn', href: '#/search' }, '検索へ'))
    );
    return;
  }
  addHistory(entry.id);

  view.append(
    h(
      'article',
      { class: 'entry' },
      header(entry),
      entry.syntax ? section('コマンド', ...renderBuilder(entry)) : null,
      entry.steps?.length ? stepsSection(entry) : null,
      section('説明', h('p', { class: 'summary' }, rich(entry.summary, { inline: true })), entry.details ? h('div', { class: 'rich' }, rich(entry.details)) : null),
      entry.examples?.length ? examplesSection(entry) : null,
      undoSection(entry),
      notesSection(entry),
      relatedSection(entry),
      memoSection(entry.id),
      footer(entry)
    )
  );
}

/** @param {string} title @param {...any} body */
export function section(title, ...body) {
  return h('section', { class: 'entry-section' }, h('h2', null, title), ...body);
}

/** お気に入りの切り替えボタン */
export function favoriteButton(id) {
  const btn = h('button', {
    type: 'button',
    class: 'fav-btn',
    onclick: () => {
      const on = toggleFavorite(id);
      paint(on);
      toast(on ? 'お気に入りに追加しました' : 'お気に入りから外しました');
    },
  });
  const paint = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'お気に入りから外す' : 'お気に入りに追加');
    btn.textContent = on ? '★' : '☆';
  };
  paint(isFavorite(id));
  return btn;
}

function header(e) {
  return h(
    'header',
    { class: 'entry-head' },
    h('div', { class: 'entry-title-row' }, h('h1', null, e.title), favoriteButton(e.id)),
    h(
      'div',
      { class: 'badges' },
      dangerBadge(e.danger),
      toolBadge(e.tool),
      e.verified ? null : h('span', { class: 'badge badge-unverified' }, '未確認')
    ),
    e.danger !== 'safe' && e.dangerNote
      ? h('div', { class: `callout callout-${e.danger}` }, h('strong', null, e.danger === 'danger' ? '危険：' : '注意：'), rich(e.dangerNote, { inline: true }))
      : null
  );
}

function stepsSection(e) {
  return section(
    '手順',
    h('ol', { class: 'steps' }, e.steps.map((s) => h('li', null, rich(s, { inline: true })))),
    h('p', { class: 'sub' }, 'GitHub の画面は変わる場合があります。見つからないときは公式ドキュメントも確認してください。')
  );
}

function examplesSection(e) {
  return section(
    '使用例',
    h(
      'ul',
      { class: 'examples' },
      e.examples.map((ex) => {
        const code = h('code', null, ex.cmd);
        return h(
          'li',
          null,
          h(
            'div',
            { class: 'example-cmd' },
            code,
            h('button', { type: 'button', class: 'btn-small', 'aria-label': `${ex.cmd} をコピー`, onclick: () => guardedCopy(e, ex.cmd, { selectEl: code }) }, 'コピー')
          ),
          h('p', { class: 'example-desc' }, rich(ex.desc, { inline: true }))
        );
      })
    )
  );
}

function undoSection(e) {
  if (!e.undo && !e.alternatives) return null;
  return section(
    '元に戻す方法・代替手段',
    e.undo ? h('div', { class: 'kv' }, h('h3', null, '元に戻す方法'), h('div', { class: 'rich' }, rich(e.undo))) : null,
    e.alternatives ? h('div', { class: 'kv' }, h('h3', null, '代替手段'), h('div', { class: 'rich' }, rich(e.alternatives))) : null
  );
}

function notesSection(e) {
  if (!e.prereq && !e.since && !e.shellNote) return null;
  return section(
    '前提・注記',
    h(
      'dl',
      { class: 'notes' },
      e.prereq ? [h('dt', null, '前提'), h('dd', null, rich(e.prereq, { inline: true }))] : null,
      e.since ? [h('dt', null, 'バージョン'), h('dd', null, `Git ${e.since} 以降`)] : null,
      e.shellNote ? [h('dt', null, 'シェル'), h('dd', null, rich(e.shellNote, { inline: true }))] : null
    )
  );
}

function relatedSection(e) {
  const rel = (e.related || []).map(getEntry).filter(Boolean);
  if (!rel.length) return null;
  return section(
    '関連項目',
    h(
      'ul',
      { class: 'link-list' },
      rel.map((r) => h('li', null, h('a', { href: `#/entry/${r.id}` }, r.syntax ? h('code', null, displaySyntax(r.syntax).split('\n')[0]) : null, h('span', null, r.title))))
    )
  );
}

/** 自分用メモ（入力のたびに少し待って保存） */
function memoSection(id) {
  const status = h('span', { class: 'memo-status', 'aria-live': 'polite' });
  const counter = h('span', { class: 'memo-count' });
  let timer = 0;
  const ta = h('textarea', {
    class: 'textarea memo',
    rows: 4,
    maxlength: NOTE_MAX_LENGTH,
    placeholder: '自分用のメモ（この端末のこのブラウザにだけ保存されます）',
    'aria-label': '自分用メモ',
    value: getNote(id),
    oninput: () => {
      paintCount();
      status.textContent = '';
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    },
    onblur: () => {
      clearTimeout(timer);
      save();
    },
  });
  const paintCount = () => (counter.textContent = `${ta.value.length} / ${NOTE_MAX_LENGTH}`);
  let lastSaved = ta.value;
  const save = () => {
    if (ta.value === lastSaved) return;
    const r = setNote(id, ta.value);
    if (r === 'ok') {
      lastSaved = ta.value;
      status.textContent = '保存しました';
    } else if (r === 'too-large') {
      toast('メモとスニペットの合計が大きすぎます（目安 1MB）。不要なものを削除してください', { kind: 'error', ms: 4000 });
    } else if (r === 'too-long') {
      toast(`メモは ${NOTE_MAX_LENGTH} 文字までです`, { kind: 'error' });
    }
  };
  paintCount();
  return section('自分用メモ', ta, h('div', { class: 'memo-foot' }, status, counter));
}

function footer(e) {
  return h(
    'footer',
    { class: 'entry-foot' },
    e.docUrl ? h('p', null, h('a', { href: e.docUrl, target: '_blank', rel: 'noopener' }, '公式ドキュメント ↗')) : null,
    h('p', { class: 'sub' }, e.verified ? `確認済み：${e.verifiedNote || '環境の記載なし'}` : '未確認：実機での動作確認前の下書きです。'),
    h('p', { class: 'sub' }, '説明はオリジナルの要約です。正確な仕様は公式ドキュメントを確認してください。')
  );
}
