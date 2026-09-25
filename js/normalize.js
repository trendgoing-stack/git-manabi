// 検索用の文字列正規化。索引作成と検索語の両方に同じ処理をかける。

/**
 * NFKC → 英字小文字化 → カタカナをひらがなへ → 空白の連続を1つにまとめる。
 * @param {string} s
 * @returns {string}
 */
export function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 検索語を AND 検索用の語に分ける。
 * @param {string} q
 * @returns {string[]}
 */
export function splitWords(q) {
  const n = normalize(q);
  return n ? n.split(' ') : [];
}
