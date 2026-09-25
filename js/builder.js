// コマンドの完成形を組み立てる純粋関数群（DOM に依存しない）。

/** 構文中の <key> と [options] を拾う。[options] 直前の空白1つも一緒に拾う。 */
const TOKEN_RE = /( ?)\[options\]|<([a-z0-9_-]+)>/g;

/** bash/zsh のダブルクォート内で解釈される文字 */
const SHELL_SPECIAL_RE = /[$`\\!]/;

/**
 * 値を " で囲み、値の中の " を \" にする。
 * @param {string} v
 */
export function quoteValue(v) {
  return '"' + v.replace(/"/g, '\\"') + '"';
}

/**
 * 構文から <key> の一覧を出現順（重複なし）で取り出す。
 * @param {string} syntax
 * @returns {string[]}
 */
export function extractPlaceholderKeys(syntax) {
  const keys = [];
  for (const m of (syntax || '').matchAll(/<([a-z0-9_-]+)>/g)) {
    if (!keys.includes(m[1])) keys.push(m[1]);
  }
  return keys;
}

/**
 * @typedef {{text: string, kind: 'text'|'value'|'missing'}} Part
 * @typedef {{text: string, parts: Part[], missing: boolean, shellWarn: boolean}} BuildResult
 */

/**
 * 完成形を組み立てる。
 * @param {{syntax?: string, placeholders?: import('./types.js').Placeholder[], options?: import('./types.js').BuilderOption[]}} spec
 * @param {Object<string, string>} values        プレースホルダの入力値
 * @param {Object<string, {on: boolean, value?: string}>} [selected]  オプションの選択状態
 * @returns {BuildResult}
 */
export function build(spec, values, selected = {}) {
  const syntax = spec.syntax || '';
  const phs = spec.placeholders || [];
  /** @type {Part[]} */
  const parts = [];
  let missing = false;
  let shellWarn = false;

  const pushText = (text) => {
    if (text) parts.push({ text, kind: 'text' });
  };

  /** 値を1つ書き出す。未入力なら <ラベル> のまま残す。 */
  const pushValue = (raw, label, quote) => {
    const v = (raw ?? '').trim() === '' ? '' : raw;
    if (!v) {
      missing = true;
      parts.push({ text: `<${label}>`, kind: 'missing' });
      return;
    }
    if (quote) {
      if (SHELL_SPECIAL_RE.test(v)) shellWarn = true;
      parts.push({ text: quoteValue(v), kind: 'value' });
    } else {
      parts.push({ text: v, kind: 'value' });
    }
  };

  const pushOptions = (lead) => {
    const opts = (spec.options || []).filter((o) => selected[o.flag]?.on);
    if (opts.length === 0) return;
    pushText(lead);
    opts.forEach((o, i) => {
      if (i > 0) pushText(' ');
      if (!o.value) {
        pushText(o.flag);
        return;
      }
      const joined = o.flag.endsWith('=');
      pushText(joined ? o.flag : o.flag + ' ');
      pushValue(selected[o.flag]?.value, o.value.label, o.value.quote);
    });
  };

  let last = 0;
  let sawOptions = false;
  for (const m of syntax.matchAll(TOKEN_RE)) {
    pushText(syntax.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] === undefined) {
      sawOptions = true;
      pushOptions(m[1]);
    } else {
      const ph = phs.find((p) => p.key === m[2]);
      pushValue(values[m[2]], ph?.label ?? m[2], ph?.quote);
    }
  }
  pushText(syntax.slice(last));

  // [options] がない構文にオプション定義がある場合は、1行目の末尾に付ける
  if (!sawOptions && spec.options?.length) {
    const nl = parts.findIndex((p) => p.kind === 'text' && p.text.includes('\n'));
    if (nl === -1) {
      pushOptions(' ');
    } else {
      const tail = parts.splice(nl);
      const [head, ...rest] = tail[0].text.split('\n');
      pushText(head);
      pushOptions(' ');
      parts.push({ text: '\n' + rest.join('\n'), kind: 'text' }, ...tail.slice(1));
    }
  }

  return { text: parts.map((p) => p.text).join(''), parts, missing, shellWarn };
}

/**
 * conflicts を双方向に解釈して、いま選べないオプションの flag 集合を返す。
 * @param {import('./types.js').BuilderOption[]} options
 * @param {Object<string, {on: boolean}>} selected
 * @returns {Set<string>}
 */
export function blockedFlags(options = [], selected = {}) {
  const blocked = new Set();
  for (const o of options) {
    if (!selected[o.flag]?.on) continue;
    for (const c of o.conflicts || []) blocked.add(c);
    for (const other of options) {
      if (other.conflicts?.includes(o.flag)) blocked.add(other.flag);
    }
  }
  for (const o of options) if (selected[o.flag]?.on) blocked.delete(o.flag);
  return blocked;
}
