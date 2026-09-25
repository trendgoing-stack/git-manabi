// コマンドビルダーの画面部品（プレースホルダ入力、オプションのチップ、完成形、コピー）。
// 入力値は保存しない（画面を離れたら消える）。

import { h } from './dom.js';
import { rich } from './rich.js';
import { guardedCopy } from './copy.js';
import { build, blockedFlags } from '../builder.js';

/** 構文から [options] を除いた表示用の文字列 */
export function displaySyntax(syntax) {
  return (syntax || '').replace(/ ?\[options\]/g, '');
}

/**
 * @param {import('../types.js').Entry|any} spec  syntax / placeholders / options と、危険度の情報を持つもの
 * @returns {HTMLElement[]}
 */
export function renderBuilder(spec) {
  /** @type {Object<string,string>} */
  const values = {};
  /** @type {Object<string,{on: boolean, value?: string}>} */
  const selected = {};
  const out = h('pre', { class: 'cmd-out', 'aria-live': 'polite' });
  const warn = h(
    'p',
    { class: 'field-note warn', hidden: true },
    '値にシェルが解釈する文字（',
    ['$', '`', '\\', '!'].map((c, i) => [i ? ' ' : '', h('code', null, c)]),
    '）が含まれています。意図どおりに渡らない場合があります。'
  );
  let last = build(spec, values, selected);

  const refresh = () => {
    last = build(spec, values, selected);
    out.replaceChildren(...last.parts.map((p) => (p.kind === 'text' ? p.text : h('span', { class: `ph-${p.kind}` }, p.text))));
    warn.hidden = !last.shellWarn;
  };

  const input = (id, label, example, hint, onInput) =>
    h(
      'div',
      { class: 'field' },
      h('label', { for: id }, label, hint ? h('span', { class: 'field-hint' }, hint) : null),
      h('input', {
        id,
        type: 'text',
        class: 'input',
        placeholder: example ? `例：${example}` : '',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        oninput: (ev) => onInput(ev.target.value),
      })
    );

  const fields = (spec.placeholders || []).map((p) =>
    input(`ph-${p.key}`, p.label, p.example, p.quote ? '（" で囲みます）' : '', (v) => {
      values[p.key] = v;
      refresh();
    })
  );

  // ---- オプション ----
  const options = spec.options || [];
  const optDetails = h('div', { class: 'opt-details' });
  const chips = h(
    'div',
    { class: 'chips chips-wrap', role: 'group', 'aria-label': 'オプション' },
    options.map((o) =>
      h(
        'button',
        {
          type: 'button',
          class: 'chip chip-opt',
          'aria-pressed': 'false',
          dataset: { flag: o.flag },
          onclick: () => {
            const on = !selected[o.flag]?.on;
            selected[o.flag] = { on, value: selected[o.flag]?.value };
            updateOptions();
            refresh();
          },
        },
        h('code', null, o.flag.replace(/=$/, '')),
        h('span', null, o.label)
      )
    )
  );

  const updateOptions = () => {
    const blocked = blockedFlags(options, selected);
    for (const chip of chips.children) {
      const flag = chip.dataset.flag;
      const on = !!selected[flag]?.on;
      chip.setAttribute('aria-pressed', String(on));
      chip.disabled = blocked.has(flag);
      chip.title = blocked.has(flag) ? '選択中のオプションと同時に使えません' : '';
    }
    // 選択中のオプションの説明と、値の入力欄
    optDetails.replaceChildren(
      ...options
        .filter((o) => selected[o.flag]?.on)
        .map((o) => {
          const box = h('div', { class: 'opt-detail' }, h('p', null, h('code', null, o.flag.replace(/=$/, '')), ' ', rich(o.desc, { inline: true })));
          if (o.value) {
            const id = `opt-${o.flag.replace(/[^a-z0-9]/gi, '')}`;
            const el = input(id, o.value.label, o.value.example, o.value.quote ? '（" で囲みます）' : '', (v) => {
              selected[o.flag].value = v;
              refresh();
            });
            el.querySelector('input').value = selected[o.flag].value ?? '';
            box.append(el);
          }
          return box;
        })
    );
  };

  const optionList = options.length
    ? h(
        'details',
        { class: 'opt-help' },
        h('summary', null, 'オプションの説明をすべて見る'),
        h(
          'dl',
          null,
          options.map((o) => [
            h('dt', null, h('code', null, o.flag.replace(/=$/, '')), ' ', o.label),
            h('dd', null, rich(o.desc, { inline: true }), o.conflicts?.length ? h('span', { class: 'sub' }, `（${o.conflicts.join('、')} とは同時に使えません）`) : null),
          ])
        )
      )
    : null;

  refresh();
  updateOptions();
  return [
    h('div', { class: 'syntax' }, h('span', { class: 'syntax-label' }, '構文'), h('code', null, spec.syntax)),
    fields.length ? h('div', { class: 'fields' }, fields) : null,
    options.length ? h('div', { class: 'opts' }, h('span', { class: 'syntax-label' }, 'オプション（タップで ON／OFF）'), chips, optDetails, optionList) : null,
    h('div', { class: 'cmd-box' }, h('span', { class: 'syntax-label' }, '完成形'), out),
    warn,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn-primary btn-block',
        // コピーはタップ処理の中で同期的に開始する
        onclick: () => guardedCopy(spec, last.text, { missing: last.missing, selectEl: out }),
      },
      'コピー'
    ),
  ].filter(Boolean);
}
