// 本文の簡易記法。
//   [[用語]] / [[用語|表示]] … 用語集へのリンク
//   `code`                  … インラインコード
//   空行                     … 段落区切り、改行 … <br>

/** [[...]] を拾う正規表現（用語、表示名） */
export const TERM_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/**
 * 文字列中の [[用語]] の用語名を列挙する（検証ページでも使う）。
 * @param {string} text
 * @returns {string[]}
 */
export function extractTerms(text) {
  return [...(text || '').matchAll(TERM_RE)].map((m) => m[1].trim());
}

/** 記法を取り除いたプレーンテキスト（クイズやカード用） */
export function plain(text) {
  return (text || '').replace(TERM_RE, (_, t, label) => label || t).replace(/`([^`]+)`/g, '$1');
}

const INLINE_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|`([^`]+)`/g;

/**
 * 1行分をノード列にする。
 * @param {string} line
 * @param {(term: string, label: string) => Node} makeTerm
 * @returns {Node[]}
 */
function inline(line, makeTerm) {
  const out = [];
  let last = 0;
  for (const m of line.matchAll(INLINE_RE)) {
    if (m.index > last) out.push(document.createTextNode(line.slice(last, m.index)));
    if (m[3] !== undefined) {
      const code = document.createElement('code');
      code.textContent = m[3];
      out.push(code);
    } else {
      out.push(makeTerm(m[1].trim(), (m[2] || m[1]).trim()));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(document.createTextNode(line.slice(last)));
  return out;
}

/**
 * 記法付きテキストを段落の DocumentFragment にする。
 * @param {string} text
 * @param {(term: string, label: string) => Node} makeTerm
 * @param {{inline?: boolean}} [opt] inline: true なら <p> で包まない
 */
export function renderRich(text, makeTerm, opt = {}) {
  const frag = document.createDocumentFragment();
  const paras = (text || '').split(/\n{2,}/);
  for (const para of paras) {
    const container = opt.inline ? frag : document.createElement('p');
    para.split('\n').forEach((line, i) => {
      if (i > 0) container.append(document.createElement('br'));
      container.append(...inline(line, makeTerm));
    });
    if (!opt.inline) frag.append(container);
  }
  return frag;
}
