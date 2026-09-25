// localStorage の読み書きをまとめるモジュール。画面側は localStorage を直接触らない。
// キーはアプリ名と連動させず、常に "gitdict:" で始める。

import { DEFAULT_SETTINGS, HISTORY_LIMIT, NOTE_MAX_LENGTH } from './config.js';

const PREFIX = 'gitdict:';
export const USER_SCHEMA_VERSION = 1;
/** エクスポートファイルの識別子 */
export const EXPORT_APP_ID = 'gitdict';
/** スニペットとメモの合計サイズの目安（文字数×2 バイトで概算） */
export const USER_TEXT_LIMIT_BYTES = 1024 * 1024;

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
/** エクスポート・インポートの対象 */
const DATA_KEYS = ['settings', 'favorites', 'history', 'notes', 'snippets', 'quiz'];

/** @type {(err: unknown) => void} */
let errorHandler = () => {};
/** @type {Set<() => void>} */
const listeners = new Set();

/** 書き込み失敗（容量超過など）の通知先を登録する */
export function onWriteError(fn) {
  errorHandler = fn;
}

/** スニペットなどが変わったときの通知先を登録する */
export function onChange(fn) {
  listeners.add(fn);
}

function read(key, fallback) {
  try {
    const s = localStorage.getItem(PREFIX + key);
    return s == null ? fallback : JSON.parse(s);
  } catch {
    return fallback;
  }
}

function write(key, value, notify = true) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    errorHandler(err);
    return false;
  }
  if (notify) listeners.forEach((fn) => fn());
  return true;
}

/** 起動時に呼ぶ。スキーマ版を記録し、必要なら移行する。 */
export function init() {
  const v = read(KEYS.schema, null);
  if (v === null) write(KEYS.schema, USER_SCHEMA_VERSION, false);
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
  return write(KEYS.settings, saved, false);
}

// ---- お気に入り（id の配列。並び順を保持） ----

/** @returns {string[]} */
export function getFavorites() {
  return read(KEYS.favorites, []);
}

export function isFavorite(id) {
  return getFavorites().includes(id);
}

/** @returns {boolean} 切り替え後にお気に入りかどうか */
export function toggleFavorite(id) {
  const list = getFavorites();
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(id);
  write(KEYS.favorites, list);
  return i < 0;
}

/** @param {number} delta -1 で上へ、+1 で下へ */
export function moveFavorite(id, delta) {
  const list = getFavorites();
  const i = list.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  write(KEYS.favorites, list);
}

// ---- 閲覧履歴（新しい順、最大 HISTORY_LIMIT 件） ----

/** @returns {{id: string, at: number}[]} */
export function getHistory() {
  return read(KEYS.history, []);
}

export function addHistory(id) {
  const list = getHistory().filter((h) => h.id !== id);
  list.unshift({ id, at: Date.now() });
  write(KEYS.history, list.slice(0, HISTORY_LIMIT), false);
}

export function clearHistory() {
  write(KEYS.history, []);
}

// ---- メモ（エントリごとに1件） ----

/** @returns {Object<string, {text: string, updatedAt: number}>} */
export function getNotes() {
  return read(KEYS.notes, {});
}

export function getNote(id) {
  return getNotes()[id]?.text ?? '';
}

/**
 * 空文字なら削除する。
 * @returns {'ok'|'too-long'|'too-large'|'failed'}
 */
export function setNote(id, text) {
  if (text.length > NOTE_MAX_LENGTH) return 'too-long';
  const notes = getNotes();
  if (text.trim() === '') delete notes[id];
  else notes[id] = { text, updatedAt: Date.now() };
  if (userTextBytes({ notes }) > USER_TEXT_LIMIT_BYTES) return 'too-large';
  return write(KEYS.notes, notes, false) ? 'ok' : 'failed';
}

// ---- 自作スニペット ----

/** @returns {import('./types.js').Snippet[]} */
export function getSnippets() {
  return read(KEYS.snippets, []);
}

export function getSnippet(id) {
  return getSnippets().find((s) => s.id === id);
}

function newSnippetId() {
  return 'my-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * 追加または更新する。id がなければ新規。
 * @param {{id?: string, title: string, syntax: string, memo: string, tags: string[]}} input
 * @returns {{result: 'ok'|'too-large'|'failed', id: string}}
 */
export function saveSnippet(input) {
  const list = getSnippets();
  const now = Date.now();
  let id = input.id;
  const i = id ? list.findIndex((s) => s.id === id) : -1;
  if (i >= 0) {
    list[i] = { ...list[i], title: input.title, syntax: input.syntax, memo: input.memo, tags: input.tags, updatedAt: now };
  } else {
    id = newSnippetId();
    list.unshift({ id, title: input.title, syntax: input.syntax, memo: input.memo, tags: input.tags, createdAt: now, updatedAt: now });
  }
  if (userTextBytes({ snippets: list }) > USER_TEXT_LIMIT_BYTES) return { result: 'too-large', id };
  return { result: write(KEYS.snippets, list) ? 'ok' : 'failed', id };
}

/** @returns {string|null} 複製したスニペットの id */
export function duplicateSnippet(id) {
  const s = getSnippet(id);
  if (!s) return null;
  const r = saveSnippet({ title: `${s.title}（コピー）`, syntax: s.syntax, memo: s.memo, tags: [...s.tags] });
  return r.result === 'ok' ? r.id : null;
}

export function deleteSnippet(id) {
  write(KEYS.snippets, getSnippets().filter((s) => s.id !== id));
  const fav = getFavorites();
  if (fav.includes(id)) write(KEYS.favorites, fav.filter((f) => f !== id), false);
}

/** スニペットとメモの合計サイズ（概算バイト） */
export function userTextBytes(override = {}) {
  const notes = override.notes ?? getNotes();
  const snippets = override.snippets ?? getSnippets();
  return (JSON.stringify(notes).length + JSON.stringify(snippets).length) * 2;
}

// ---- クイズの成績（フェーズ3で使用） ----

/** @returns {Object<string, {ok: number, ng: number}>} */
export function getQuizStats() {
  return read(KEYS.quiz, {});
}

export function recordQuiz(id, correct) {
  const stats = getQuizStats();
  const s = stats[id] || { ok: 0, ng: 0 };
  if (correct) s.ok++;
  else s.ng++;
  stats[id] = s;
  write(KEYS.quiz, stats, false);
}

// ---- エクスポート・インポート・全削除 ----

export function exportData() {
  const data = {};
  for (const k of DATA_KEYS) data[k] = read(k, null);
  return {
    app: EXPORT_APP_ID,
    schemaVersion: USER_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);
const isStrArr = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * インポートするデータの形式を検査する。
 * @returns {string[]} 問題の一覧（空なら正常）
 */
export function checkImport(obj) {
  const errs = [];
  if (!isObj(obj) || obj.app !== EXPORT_APP_ID) return ['Gitまなび帳のエクスポートファイルではありません'];
  if (!Number.isInteger(obj.schemaVersion)) errs.push('schemaVersion がありません');
  else if (obj.schemaVersion > USER_SCHEMA_VERSION) errs.push('新しいバージョンのアプリで作られたファイルです。アプリを更新してから読み込んでください');
  const d = obj.data;
  if (!isObj(d)) return [...errs, 'data がありません'];
  if (d.settings != null && !isObj(d.settings)) errs.push('settings の形式が不正です');
  if (d.favorites != null && !isStrArr(d.favorites)) errs.push('favorites の形式が不正です');
  if (d.history != null && !(Array.isArray(d.history) && d.history.every((h) => isObj(h) && typeof h.id === 'string' && typeof h.at === 'number'))) {
    errs.push('history の形式が不正です');
  }
  if (d.notes != null && !(isObj(d.notes) && Object.values(d.notes).every((n) => isObj(n) && typeof n.text === 'string' && n.text.length <= NOTE_MAX_LENGTH))) {
    errs.push('notes の形式が不正です');
  }
  if (
    d.snippets != null &&
    !(
      Array.isArray(d.snippets) &&
      d.snippets.every((s) => isObj(s) && /^my-[a-z0-9]+$/.test(s.id) && typeof s.title === 'string' && typeof s.syntax === 'string' && typeof s.memo === 'string' && isStrArr(s.tags))
    )
  ) {
    errs.push('snippets の形式が不正です');
  }
  if (d.quiz != null && !(isObj(d.quiz) && Object.values(d.quiz).every((q) => isObj(q) && Number.isInteger(q.ok) && Number.isInteger(q.ng)))) {
    errs.push('quiz の形式が不正です');
  }
  return errs;
}

/** 2つの配列を id で統合し、updatedAt（なければ at）が新しい方を残す */
function mergeById(a, b, time) {
  const map = new Map(a.map((x) => [x.id, x]));
  for (const x of b) {
    const cur = map.get(x.id);
    if (!cur || (time(x) ?? 0) > (time(cur) ?? 0)) map.set(x.id, x);
  }
  return [...map.values()];
}

/**
 * インポートする。形式が不正なら何も変更しない。
 * @param {any} obj
 * @param {'merge'|'replace'} mode
 * @returns {{ok: boolean, errors: string[]}}
 */
export function importData(obj, mode) {
  const errors = checkImport(obj);
  if (errors.length) return { ok: false, errors };
  const d = obj.data;
  /** @type {Object<string, any>} */
  const next = {};

  if (mode === 'replace') {
    for (const k of DATA_KEYS) next[k] = d[k] ?? null;
  } else {
    next.settings = read(KEYS.settings, null); // 設定は今の端末のものを残す
    const fav = getFavorites();
    next.favorites = [...fav, ...(d.favorites || []).filter((f) => !fav.includes(f))];
    next.history = mergeById(getHistory(), d.history || [], (h) => h.at)
      .sort((x, y) => y.at - x.at)
      .slice(0, HISTORY_LIMIT);
    const notes = getNotes();
    for (const [id, n] of Object.entries(d.notes || {})) {
      if (!notes[id] || (n.updatedAt ?? 0) > (notes[id].updatedAt ?? 0)) notes[id] = n;
    }
    next.notes = notes;
    next.snippets = mergeById(getSnippets(), d.snippets || [], (s) => s.updatedAt).sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0));
    const quiz = getQuizStats();
    for (const [id, q] of Object.entries(d.quiz || {})) {
      const cur = quiz[id];
      if (!cur || q.ok + q.ng > cur.ok + cur.ng) quiz[id] = q;
    }
    next.quiz = quiz;
  }

  if (userTextBytes({ notes: next.notes ?? {}, snippets: next.snippets ?? [] }) > USER_TEXT_LIMIT_BYTES) {
    return { ok: false, errors: ['スニペットとメモの合計が大きすぎます（目安 1MB）'] };
  }

  // 書き込みに失敗したら元に戻す
  const backup = {};
  for (const k of DATA_KEYS) backup[k] = localStorage.getItem(PREFIX + k);
  try {
    for (const k of DATA_KEYS) {
      if (next[k] == null) localStorage.removeItem(PREFIX + k);
      else localStorage.setItem(PREFIX + k, JSON.stringify(next[k]));
    }
  } catch {
    for (const k of DATA_KEYS) {
      try {
        if (backup[k] == null) localStorage.removeItem(PREFIX + k);
        else localStorage.setItem(PREFIX + k, backup[k]);
      } catch {
        /* 復元も失敗した場合は諦める */
      }
    }
    return { ok: false, errors: ['保存できませんでした（容量不足の可能性があります）。データは変更していません'] };
  }
  listeners.forEach((fn) => fn());
  return { ok: true, errors: [] };
}

/** gitdict: で始まるキーをすべて削除する */
export function clearAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* 失敗しても続行 */
  }
  init();
  listeners.forEach((fn) => fn());
}

