// localStorage の読み書きをまとめるモジュール。画面側は localStorage を直接触らない。
// キーはアプリ名と連動させず、常に "gitdict:" で始める。

import { DEFAULT_SETTINGS } from './config.js';

const PREFIX = 'gitdict:';
export const USER_SCHEMA_VERSION = 1;

/** 保存に使うキー（PREFIX を除いた部分） */
export const KEYS = {
  schema: 'schema',
  settings: 'settings',
  favorites: 'favorites',
  history: 'history',
  notes: 'notes',
  snippets: 'snippets',
  quiz: 'quiz',
};

/** @type {(err: unknown) => void} */
let errorHandler = () => {};

/** 書き込み失敗（容量超過など）の通知先を登録する */
export function onWriteError(fn) {
  errorHandler = fn;
}

function read(key, fallback) {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s == null ? fallback : JSON.parse(s);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch (err) {
    errorHandler(err);
    return false;
  }
}

/** 起動時に呼ぶ。スキーマ版を記録し、必要なら移行する。 */
export function init() {
  const v = read(KEYS.schema, null);
  if (v === null) write(KEYS.schema, USER_SCHEMA_VERSION);
  // 将来ここで v < USER_SCHEMA_VERSION のときの移行処理を行う
}

// ---- 設定 ----
// ユーザーが操作した項目だけを保存する（既定値の変更が、一度も触っていない項目には効くように）。

/** @returns {import('./types.js').Settings} */
export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
}

/**
 * @param {keyof import('./types.js').Settings} key
 * @param {any} value
 */
export function setSetting(key, value) {
  const saved = read(KEYS.settings, {});
  saved[key] = value;
  return write(KEYS.settings, saved);
}
