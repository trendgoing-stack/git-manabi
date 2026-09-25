import { h } from './dom.js';
import { DANGER_LEVELS, toolLabel } from '../config.js';

/** @param {import('../types.js').Danger} level */
export function dangerBadge(level) {
  if (!level) return null;
  return h('span', { class: `badge badge-${level}` }, DANGER_LEVELS[level] ?? level);
}

/** @param {string} tool */
export function toolBadge(tool) {
  return h('span', { class: `badge badge-tool badge-tool-${tool}` }, toolLabel(tool));
}

/** 項目に応じたバッジ一式（ツール、危険度、自作、未確認） */
export function itemBadges(item) {
  return [
    item.isSnippet ? h('span', { class: 'badge badge-mine' }, '自作') : toolBadge(item.tool),
    item.danger && item.danger !== 'safe' ? dangerBadge(item.danger) : null,
    !item.isSnippet && !item.verified ? h('span', { class: 'badge badge-unverified' }, '未確認') : null,
  ];
}
