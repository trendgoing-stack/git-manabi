// 型定義だけを置くファイル（実行コードなし）。
// 各モジュールからは import('./types.js').Entry のように参照する。

/** @typedef {'git'|'gh'|'github-web'} Tool */
/** @typedef {'safe'|'caution'|'danger'} Danger */

/**
 * 構文中の <key> に対応する入力欄。
 * quote: true のときは値を " で囲み、値の中の " を \" にする。
 * @typedef {Object} Placeholder
 * @property {string} key
 * @property {string} label
 * @property {string} example
 * @property {boolean} [quote]
 */

/**
 * コマンドビルダーのオプション。
 * 構文中の [options] の位置に、定義順で差し込まれる。
 * flag が "=" で終わる場合は値を空白なしでつなぐ（例：--format=）。
 * @typedef {Object} BuilderOption
 * @property {string} flag
 * @property {string} label
 * @property {string} desc
 * @property {{label: string, example: string, quote?: boolean}} [value]
 * @property {string[]} [conflicts]
 */

/**
 * @typedef {Object} DiagCommit
 * @property {string} id
 * @property {string[]} [parents]
 * @property {string} [label]   表示名（C' など）。省略時は id
 * @property {boolean} [ghost]  どのブランチからも辿れなくなったコミット（薄く描く）
 */

/**
 * @typedef {Object} DiagState
 * @property {DiagCommit[]} commits
 * @property {Object<string, string>} branches  ブランチ名 → コミット id。キー順がレーン順
 * @property {string} head                      ブランチ名、またはコミット id（detached）
 * @property {string[]} [highlight]
 */

/**
 * @typedef {Object} Entry
 * @property {string} id
 * @property {Tool} tool
 * @property {string} category
 * @property {string} title
 * @property {string[]} intents
 * @property {string[]} keywords
 * @property {string} [syntax]          プレースホルダは <key>。改行で複数コマンド
 * @property {Placeholder[]} [placeholders]
 * @property {BuilderOption[]} [options]
 * @property {string} summary
 * @property {string} details           [[用語]] で用語集にリンク
 * @property {string[]} [steps]         github-web 用の手順
 * @property {{cmd: string, desc: string}[]} [examples]
 * @property {Danger} danger
 * @property {string} [dangerNote]
 * @property {string} [undo]
 * @property {string} [alternatives]
 * @property {string} [prereq]
 * @property {string} [since]
 * @property {string} [shellNote]
 * @property {{before: DiagState, after: DiagState, note?: string}} [diagram]  note は図の補足（[[用語]] 可）
 * @property {string[]} [related]
 * @property {string} [docUrl]
 * @property {string[]} [tags]
 */

/**
 * @typedef {Object} Meta
 * @property {number} schemaVersion
 * @property {string} dataVersion
 * @property {string[]} entryFiles   data/ からの相対パス
 * @property {Object<string, number>} counts
 */

/**
 * @typedef {Object} GlossaryTerm
 * @property {string} term
 * @property {string} reading    五十音順の並べ替え用（ひらがな）
 * @property {string[]} [aliases]
 * @property {string} def
 * @property {string[]} [related] 関連エントリの id
 */

/**
 * @typedef {Object} FlowQuestion
 * @property {string} id
 * @property {string} question
 * @property {{label: string, next: string}[]} choices
 */

/**
 * @typedef {Object} FlowResult
 * @property {string} id
 * @property {string[]} entryIds
 * @property {string} note
 */

/**
 * @typedef {Object} Flow
 * @property {string} id
 * @property {string} title
 * @property {string} start
 * @property {(FlowQuestion|FlowResult)[]} nodes
 */

/**
 * @typedef {Object} QuizItem
 * @property {string} id
 * @property {string} question
 * @property {string[]} choices   4件
 * @property {number} answer      正解の添字
 * @property {string} [explain]
 * @property {string} [entryId]
 * @property {Tool} tool
 * @property {string} category
 */

/**
 * @typedef {Object} Scene
 * @property {string} id
 * @property {string} title
 * @property {string} [desc]
 * @property {string[]} entryIds
 */

/**
 * @typedef {Object} Snippet
 * @property {string} id         "my-" で始まる
 * @property {string} title
 * @property {string} syntax
 * @property {string} memo
 * @property {string[]} tags
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} Settings
 * @property {'normal'|'large'} fontSize
 * @property {boolean} confirmDanger
 * @property {boolean} analyticsOff
 */

export {};
