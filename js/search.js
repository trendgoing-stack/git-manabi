// 逆引き・正引きを統合したスコア付き AND 検索。

import { normalize, splitWords } from './normalize.js';

/** 語ごとの一致フィールドの重み。大きいほど上位。 */
const W = {
  cmdPrefix: 100,
  intents: 60,
  title: 50,
  keywords: 40,
  tags: 30,
  summary: 20,
  cmdSub: 15,
};
/** 検索語全体が構文の先頭と一致したときの加点 */
const WHOLE_PREFIX_BONUS = 1000;

/**
 * @typedef {Object} IndexRow
 * @property {any} item
 * @property {number} order
 * @property {string[]} cmdLines  構文の各行と、先頭のツール名を除いたもの
 * @property {string[]} cmdTokens
 * @property {string} cmdText
 * @property {string} intents
 * @property {string} title
 * @property {string} keywords
 * @property {string} tags
 * @property {string} summary
 */

const TOOL_PREFIX_RE = /^(git|gh) /;

/**
 * @param {any[]} items  エントリ、またはエントリ形式に変換したスニペット
 * @returns {IndexRow[]}
 */
export function buildIndex(items) {
  return items.map((item, order) => {
    // ビルダー用の [options] は検索対象から外す
    const syntax = (item.syntax || '').replace(/ ?\[options\]/g, '');
    const cmdText = normalize(syntax);
    const lines = syntax.split('\n').map(normalize).filter(Boolean);
    const cmdLines = [];
    for (const l of lines) {
      cmdLines.push(l);
      if (TOOL_PREFIX_RE.test(l)) cmdLines.push(l.replace(TOOL_PREFIX_RE, ''));
    }
    return {
      item,
      order,
      cmdLines,
      cmdTokens: cmdText.split(' ').filter(Boolean),
      cmdText,
      intents: normalize((item.intents || []).join('\n')),
      title: normalize(item.title),
      keywords: normalize((item.keywords || []).join('\n')),
      tags: normalize((item.tags || []).join('\n')),
      summary: normalize(item.summary),
    };
  });
}

/** 1語に対する最大の重み。一致しなければ 0。 */
function wordScore(row, w) {
  if (row.cmdTokens.some((t) => t.startsWith(w))) return W.cmdPrefix;
  if (row.intents.includes(w)) return W.intents;
  if (row.title.includes(w)) return W.title;
  if (row.keywords.includes(w)) return W.keywords;
  if (row.tags.includes(w)) return W.tags;
  if (row.summary.includes(w)) return W.summary;
  if (row.cmdText.includes(w)) return W.cmdSub;
  return 0;
}

/**
 * @param {any} item
 * @param {{tool?: string, category?: string, showUnverified?: boolean}} f
 */
export function passesFilter(item, f) {
  if (f.tool && item.tool !== f.tool) return false;
  if (f.category && item.category !== f.category) return false;
  if (f.showUnverified === false && !item.verified && !item.isSnippet) return false;
  return true;
}

/**
 * 検索する。語が空なら絞り込み条件だけで元の順に返す。
 * @param {IndexRow[]} index
 * @param {string} query
 * @param {{tool?: string, category?: string, showUnverified?: boolean, limit?: number}} [filter]
 * @returns {{items: any[], total: number}}
 */
export function search(index, query, filter = {}) {
  const words = splitWords(query);
  const whole = words.join(' ');
  const hits = [];
  for (const row of index) {
    if (!passesFilter(row.item, filter)) continue;
    let score = 0;
    let ok = true;
    for (const w of words) {
      const s = wordScore(row, w);
      if (s === 0) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
    if (whole && row.cmdLines.some((l) => l.startsWith(whole))) score += WHOLE_PREFIX_BONUS;
    hits.push({ row, score });
  }
  hits.sort((a, b) => b.score - a.score || a.row.order - b.row.order);
  const limit = filter.limit ?? Infinity;
  return { items: hits.slice(0, limit).map((h) => h.row.item), total: hits.length };
}
