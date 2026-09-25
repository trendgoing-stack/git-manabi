// アプリ全体で共有する定数。表示ラベルや既定値はここだけで管理する。

export const APP_NAME = 'Gitまなび帳';
export const APP_VERSION = '1.0.0';

/** @type {{id: import('./types.js').Tool, label: string, short: string}[]} */
export const TOOLS = [
  { id: 'git', label: 'git', short: 'git' },
  { id: 'gh', label: 'gh（GitHub CLI）', short: 'gh' },
  { id: 'github-web', label: 'GitHub画面', short: 'Web' },
];

/** カテゴリの固定リスト。JSON には id を書き、表示はこのラベルを使う。 */
export const CATEGORIES = [
  { id: 'setup', label: '初期設定' },
  { id: 'basic', label: '基本操作' },
  { id: 'branch', label: 'ブランチ' },
  { id: 'integrate', label: 'マージ・リベース' },
  { id: 'history', label: '履歴の確認' },
  { id: 'undo', label: '取り消し' },
  { id: 'remote', label: 'リモート' },
  { id: 'stash', label: 'stash' },
  { id: 'tag', label: 'タグ' },
  { id: 'config', label: '設定' },
  { id: 'pr', label: 'PR' },
  { id: 'issue', label: 'Issue' },
  { id: 'repo', label: 'リポジトリ管理' },
  { id: 'release', label: 'リリース' },
  { id: 'other', label: 'その他' },
];

export const DANGER_LEVELS = {
  safe: '安全',
  caution: '注意',
  danger: '危険',
};

/**
 * 設定の既定値。ユーザーが変更した項目だけを保存するので、
 * ここを変えると「未変更のユーザー」にも新しい既定値が適用される。
 * @type {import('./types.js').Settings}
 */
export const DEFAULT_SETTINGS = {
  fontSize: 'normal',
  confirmDanger: true,
  // 公開向けの既定は「表示しない」（開発中は true にしていた）
  showUnverified: false,
  analyticsOff: false,
};

export const SEARCH_DEBOUNCE_MS = 150;
export const SEARCH_LIMIT = 50;
export const HISTORY_LIMIT = 50;
export const NOTE_MAX_LENGTH = 2000;

export function toolLabel(id) {
  return TOOLS.find((t) => t.id === id)?.short ?? id;
}

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
