// 自作スニペットの詳細画面と、追加・編集画面。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { renderBuilder } from '../ui/builder-ui.js';
import { confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { section, favoriteButton } from './entry.js';
import { getSnippet, saveSnippet, deleteSnippet, duplicateSnippet, addHistory } from '../storage.js';
import { snippetToItem, parseTags } from '../snippets.js';
import { redirect, back, go } from '../router.js';

const TITLE_MAX = 100;
const SYNTAX_MAX = 2000;
const MEMO_MAX = 2000;

/** @param {import('../router.js').RouteCtx} ctx */
export function renderSnippet(ctx) {
  const s = getSnippet(ctx.params.id);
  const view = screen({ title: '自作スニペット', tab: 'my', showBack: true, backTo: '/my?tab=snippets' });
  if (!s) {
    view.append(h('div', { class: 'empty' }, h('p', null, 'このスニペットは見つかりませんでした。'), h('a', { class: 'btn', href: '#/my?tab=snippets' }, 'マイへ')));
    return;
  }
  addHistory(s.id);
  const item = snippetToItem(s);

  view.append(
    h(
      'article',
      { class: 'entry' },
      h(
        'header',
        { class: 'entry-head' },
        h('div', { class: 'entry-title-row' }, h('h1', null, s.title), favoriteButton(s.id)),
        h('div', { class: 'badges' }, h('span', { class: 'badge badge-mine' }, '自作'), s.tags.map((t) => h('span', { class: 'badge' }, t)))
      ),
      section('コマンド', ...renderBuilder(item)),
      s.memo ? section('メモ', h('p', { class: 'pre-line' }, s.memo)) : null,
      h(
        'div',
        { class: 'action-row' },
        h('a', { class: 'btn', href: `#/snippet/${s.id}/edit` }, '編集'),
        h(
          'button',
          {
            type: 'button',
            class: 'btn',
            onclick: () => {
              const id = duplicateSnippet(s.id);
              if (id) {
                toast('複製しました');
                go(`/snippet/${id}/edit`);
              }
            },
          },
          '複製'
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-danger-outline',
            onclick: () =>
              confirmDialog({
                title: 'スニペットを削除しますか？',
                body: h('p', null, `「${s.title}」を削除します。元に戻せません。`),
                okLabel: '削除する',
                danger: true,
                onOk: () => {
                  deleteSnippet(s.id);
                  toast('削除しました');
                  redirect('/my?tab=snippets');
                },
              }),
          },
          '削除'
        )
      )
    )
  );
}

/** @param {import('../router.js').RouteCtx} ctx */
export function renderSnippetEdit(ctx) {
  const editing = ctx.params.id ? getSnippet(ctx.params.id) : null;
  const view = screen({ title: editing ? 'スニペットを編集' : 'スニペットを追加', tab: 'my', showBack: true, backTo: '/my?tab=snippets' });
  if (ctx.params.id && !editing) {
    view.append(h('div', { class: 'empty' }, h('p', null, 'このスニペットは見つかりませんでした。')));
    return;
  }

  const field = (id, label, control, note) => h('div', { class: 'field' }, h('label', { for: id }, label), control, note ? h('p', { class: 'field-note sub' }, note) : null);
  const title = h('input', { id: 'sn-title', class: 'input', type: 'text', maxlength: TITLE_MAX, required: true, value: editing?.title ?? '', placeholder: '例：直前のコミットにタグを付ける' });
  const syntax = h('textarea', {
    id: 'sn-syntax',
    class: 'textarea code-input',
    rows: 3,
    maxlength: SYNTAX_MAX,
    required: true,
    autocapitalize: 'off',
    autocomplete: 'off',
    spellcheck: 'false',
    value: editing?.syntax ?? '',
    placeholder: '例：git tag <name> HEAD',
  });
  const memo = h('textarea', { id: 'sn-memo', class: 'textarea', rows: 4, maxlength: MEMO_MAX, value: editing?.memo ?? '' });
  const tags = h('input', { id: 'sn-tags', class: 'input', type: 'text', value: editing?.tags.join(' ') ?? '', placeholder: '例：タグ リリース', autocapitalize: 'off' });

  const form = h(
    'form',
    {
      class: 'form',
      novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        const t = title.value.trim();
        const sx = syntax.value.replace(/\s+$/, '');
        if (!t || !sx.trim()) {
          toast('タイトルと構文は必須です', { kind: 'error' });
          (t ? syntax : title).focus();
          return;
        }
        const r = saveSnippet({ id: editing?.id, title: t, syntax: sx, memo: memo.value.trim(), tags: parseTags(tags.value) });
        if (r.result === 'ok') {
          toast('保存しました');
          // 編集画面を履歴に残さない
          redirect(`/snippet/${r.id}`);
        } else if (r.result === 'too-large') {
          toast('メモとスニペットの合計が大きすぎます（目安 1MB）', { kind: 'error', ms: 4000 });
        }
      },
    },
    field('sn-title', 'タイトル（必須）', title),
    field('sn-syntax', '構文（必須）', syntax, '<name> のように書いた部分は、詳細画面で入力欄になります（英小文字・数字・_・- のみ）。'),
    field('sn-memo', 'メモ', memo),
    field('sn-tags', 'タグ', tags, '空白か読点で区切ります。'),
    h('div', { class: 'action-row' }, h('button', { type: 'button', class: 'btn', onclick: () => back('/my?tab=snippets') }, 'キャンセル'), h('button', { type: 'submit', class: 'btn btn-primary' }, '保存'))
  );
  view.append(form);
}
