// 辞書データの読み込みと参照。画面側は fetch を直接使わずここを通す。

import { normalize } from './normalize.js';
import { buildIndex } from './search.js';

/** meta.json が読めなかったときに使うエントリファイル一覧 */
const FALLBACK_ENTRY_FILES = ['entries/git.json', 'entries/gh.json', 'entries/github-web.json'];

export const db = {
  /** @type {import('./types.js').Meta|null} */
  meta: null,
  /** @type {import('./types.js').Entry[]} */
  entries: [],
  /** @type {Map<string, import('./types.js').Entry>} */
  byId: new Map(),
  /** @type {import('./types.js').Flow[]} */
  flows: [],
  /** @type {import('./types.js').GlossaryTerm[]} */
  glossary: [],
  /** @type {import('./types.js').QuizItem[]} */
  quiz: [],
  /** @type {import('./types.js').Scene[]} */
  scenes: [],
  /** 読み込みに失敗したファイル名 @type {string[]} */
  failed: [],
};

/** 正規化した用語・別名 → 用語 */
const termMap = new Map();

async function fetchJson(path) {
  const res = await fetch('data/' + path);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/**
 * 全 JSON を並列で読み込む。1ファイルが失敗しても残りで続行し、失敗したファイルは db.failed に入る。
 */
export async function loadAll() {
  let entryFiles = FALLBACK_ENTRY_FILES;
  try {
    db.meta = await fetchJson('meta.json');
    if (Array.isArray(db.meta.entryFiles)) entryFiles = db.meta.entryFiles;
  } catch {
    db.failed.push('meta.json');
  }

  const others = ['flows.json', 'glossary.json', 'quiz.json', 'scenes.json'];
  const files = [...entryFiles, ...others];
  const results = await Promise.allSettled(files.map(fetchJson));

  results.forEach((r, i) => {
    const name = files[i];
    if (r.status === 'rejected' || !Array.isArray(r.value)) {
      db.failed.push(name);
      return;
    }
    if (i < entryFiles.length) {
      for (const e of r.value) {
        if (!e || !e.id || db.byId.has(e.id)) continue;
        db.entries.push(e);
        db.byId.set(e.id, e);
      }
    } else {
      const key = name.replace('.json', '');
      db[key] = r.value;
    }
  });

  termMap.clear();
  for (const t of db.glossary) {
    for (const name of [t.term, ...(t.aliases || [])]) termMap.set(normalize(name), t);
  }
  invalidateIndex();
}

/** @param {string} id */
export function getEntry(id) {
  return db.byId.get(id);
}

/** @param {string} name 用語名または別名 */
export function findTerm(name) {
  return termMap.get(normalize(name));
}

// ---- 検索索引（スニペットを含む。スニペットはフェーズ2で追加） ----

let index = null;
/** @type {() => any[]} */
let extraItems = () => [];

/** 検索対象に加える項目（自作スニペット）の供給元を登録する */
export function setExtraItems(fn) {
  extraItems = fn;
  invalidateIndex();
}

export function invalidateIndex() {
  index = null;
}

export function getIndex() {
  if (!index) index = buildIndex([...db.entries, ...extraItems()]);
  return index;
}
