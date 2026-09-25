// 自作スニペットを、検索やビルダーで扱えるエントリ形式に変換する。

import { extractPlaceholderKeys } from './builder.js';

/**
 * @param {import('./types.js').Snippet} s
 */
export function snippetToItem(s) {
  return {
    id: s.id,
    isSnippet: true,
    tool: 'mine',
    category: '',
    title: s.title,
    intents: [],
    keywords: [],
    tags: s.tags,
    summary: s.memo,
    syntax: s.syntax,
    placeholders: extractPlaceholderKeys(s.syntax).map((key) => ({ key, label: key, example: '' })),
    danger: 'safe',
  };
}

/** タグ入力（空白・読点・カンマ区切り）を配列にする */
export function parseTags(text) {
  return [...new Set(text.split(/[\s,、，]+/).map((t) => t.trim()).filter(Boolean))];
}
