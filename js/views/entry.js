// 詳細画面。表示順は仕様どおり：
// タイトルと危険度 → ビルダー → 説明 → 使用例 → ブランチ図 → 元に戻す方法・代替手段
// → 前提・バージョン・シェル → 関連項目 → 自分用メモ

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { dangerBadge, toolBadge } from '../ui/badges.js';
import { rich } from '../ui/rich.js';
import { copyWithToast } from '../ui/copy.js';
import { getEntry } from '../data.js';
import { build } from '../builder.js';
import { categoryLabel } from '../config.js';

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

  view.append(
    h(
      'article',
      { class: 'entry' },
      header(entry),
      entry.syntax ? builderSection(entry) : null,
      entry.steps?.length ? stepsSection(entry) : null,
      section('説明', h('p', { class: 'summary' }, rich(entry.summary, { inline: true })), entry.details ? h('div', { class: 'rich' }, rich(entry.details)) : null),
      entry.examples?.length ? examplesSection(entry) : null,
      undoSection(entry),
      notesSection(entry),
      relatedSection(entry),
      footer(entry)
    )
  );
}

/** @param {string} title @param {...any} body */
function section(title, ...body) {
  return h('section', { class: 'entry-section' }, h('h2', null, title), ...body);
}

function header(e) {
  return h(
    'header',
    { class: 'entry-head' },
    h('h1', null, e.title),
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

function builderSection(e) {
  /** @type {Object<string,string>} 入力値は保存しない（画面を離れたら消える） */
  const values = {};
  const out = h('pre', { class: 'cmd-out', 'aria-live': 'polite' });
  const warn = h(
    'p',
    { class: 'field-note warn', hidden: true },
    '値にシェルが解釈する文字（',
    ['$', '`', '\\', '!'].map((c, i) => [i ? ' ' : '', h('code', null, c)]),
    '）が含まれています。意図どおりに渡らない場合があります。'
  );
  let last = build(e, values);

  const refresh = () => {
    last = build(e, values);
    out.replaceChildren(...last.parts.map((p) => (p.kind === 'text' ? p.text : h('span', { class: `ph-${p.kind}` }, p.text))));
    warn.hidden = !last.shellWarn;
  };

  const fields = (e.placeholders || []).map((p) => {
    const id = `ph-${p.key}`;
    return h(
      'div',
      { class: 'field' },
      h('label', { for: id }, p.label, p.quote ? h('span', { class: 'field-hint' }, '（" で囲みます）') : null),
      h('input', {
        id,
        type: 'text',
        class: 'input',
        placeholder: `例：${p.example}`,
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        oninput: (ev) => {
          values[p.key] = ev.target.value;
          refresh();
        },
      })
    );
  });

  refresh();
  return section(
    'コマンド',
    h('div', { class: 'syntax' }, h('span', { class: 'syntax-label' }, '構文'), h('code', null, e.syntax)),
    fields.length ? h('div', { class: 'fields' }, fields) : null,
    h('div', { class: 'cmd-box' }, h('span', { class: 'syntax-label' }, '完成形'), out),
    warn,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-block',
        // コピーはタップ処理の中で同期的に開始する
        onclick: () => copyWithToast(last.text, { missing: last.missing, selectEl: out }),
      },
      'コピー'
    )
  );
}

function stepsSection(e) {
  return section('手順', h('ol', { class: 'steps' }, e.steps.map((s) => h('li', null, rich(s, { inline: true })))));
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
            h('button', { type: 'button', class: 'btn-small', 'aria-label': `${ex.cmd} をコピー`, onclick: () => copyWithToast(ex.cmd, { selectEl: code }) }, 'コピー')
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
      rel.map((r) => h('li', null, h('a', { href: `#/entry/${r.id}` }, r.syntax ? h('code', null, r.syntax.split('\n')[0]) : null, h('span', null, r.title))))
    )
  );
}

function footer(e) {
  return h(
    'footer',
    { class: 'entry-foot' },
    e.docUrl ? h('p', null, h('a', { href: e.docUrl, target: '_blank', rel: 'noopener' }, '公式ドキュメント（英語）↗')) : null,
    h('p', { class: 'sub' }, e.verified ? `確認済み：${e.verifiedNote || '環境の記載なし'}` : '未確認：実機での動作確認前の下書きです。'),
    h('p', { class: 'sub' }, '説明はオリジナルの要約です。正確な仕様は公式ドキュメントを確認してください。')
  );
}
