# 辞書データの書き方（CONTENT.md）

Gitまなび帳の辞書データ（`data/`）を追加・修正するときのルールです。型の正式な定義は [js/types.js](js/types.js) にあります。

## 基本ルール

- 説明文はすべてオリジナルで書く。Git 公式マニュアル、Pro Git、GitHub Docs の文章を転載しない（リンクは `docUrl` に書く）。
- 基準は **Git 2.30 以降**、デフォルトブランチ名は **`main`**。
- `switch`／`restore` を優先して載せる。`checkout` の使い方は、対応する項目の details や examples の中で示す。
- 下書きはすべて `verified: false` で登録する。
- 実際にコマンドを実行して確かめた項目だけを `verified: true` にし、`verifiedNote` に確認環境を書く（例：`git 2.45 / macOS 14`）。
- データを変更したら `meta.json` の `dataVersion` と `counts` を更新する（PWA 化後は `sw.js` のバージョンも上げる。手順は README を参照）。
- 変更後は `tools/validate.html` をブラウザで開き、エラーが 0 件であることを確認する。

## ファイル構成

| ファイル | 内容 |
|---|---|
| `data/meta.json` | `schemaVersion`、`dataVersion`、`entryFiles`（読み込むエントリファイルの一覧）、`counts` |
| `data/entries/git.json` など | ツール別のエントリ（配列） |
| `data/glossary.json` | 用語集 |
| `data/scenes.json` | 検索タブのシーン別チートシート |
| `data/flows.json` | トラブル脱出フローチャート |
| `data/quiz.json` | 手書きのクイズ問題 |

新しいツールを追加するときは、`data/entries/<tool>.json` を作り、`meta.json` の `entryFiles` に1行足します（静的サイトではフォルダの中身を一覧できないため）。

## エントリ

```json
{
  "id": "git-commit",
  "tool": "git",
  "category": "basic",
  "title": "ステージした変更を記録したい（コミットする）",
  "intents": ["変更を保存したい", "コミットしたい"],
  "keywords": ["こみっと", "きろく", "commit"],
  "syntax": "git commit -m <message>",
  "placeholders": [{ "key": "message", "label": "コミットメッセージ", "example": "ログイン画面を追加", "quote": true }],
  "summary": "[[ステージ]]にある変更を記録します。",
  "details": "本文。空行で段落、`code` でインラインコード。",
  "examples": [{ "cmd": "git commit -m \"ログイン画面を追加\"", "desc": "説明" }],
  "danger": "safe",
  "related": ["git-add"],
  "docUrl": "https://git-scm.com/docs/git-commit",
  "tags": ["毎日"],
  "verified": false,
  "verifiedNote": ""
}
```

### フィールドの書き方

| フィールド | 必須 | 書き方 |
|---|---|---|
| `id` | ○ | 英小文字・数字・ハイフン。全ファイルで一意。`<tool>-<内容>` の形にする |
| `tool` | ○ | `git`／`gh`／`github-web`。ファイル名と一致させる |
| `category` | ○ | 下の「カテゴリ」から1つ |
| `title` | ○ | 代表的な「やりたいこと」を「〜したい」の文で |
| `intents` | ○ | title の言い換えを 1〜5 件。検索で2番目に重く扱われる |
| `keywords` | ○ | 読み（ひらがな）、別表記、英語。**漢字の読みは自動変換しないので、ここで補う**（例：「取り消し」に対して `とりけし`） |
| `syntax` | git/gh で○ | プレースホルダは `<key>`（英小文字・数字・`_`・`-`）。改行で複数コマンドにできる。ビルダーのオプションを差し込む位置に `[options]` と書く |
| `placeholders` | syntax に `<key>` があれば○ | `{ key, label, example, quote }`。`quote: true` なら値を `"` で囲み、値の中の `"` を `\"` にする |
| `options` | 任意 | `{ flag, label, desc, value?: {label, example, quote?}, conflicts?: [flag] }`。完成形では定義順に並ぶ。flag が `=` で終わると値を空白なしでつなぐ（`--format=%h`）。conflicts は片方に書けば双方向に効く |
| `summary` | ○ | 1〜2文 |
| `details` | ○ | 本文。`[[用語]]` または `[[用語\|表示名]]` で用語集にリンク |
| `steps` | github-web で○ | 画面操作の手順（文字列の配列） |
| `examples` | 任意 | `{ cmd, desc }` |
| `danger` | ○ | `safe`／`caution`／`danger` |
| `dangerNote` | safe 以外で○ | 危険な理由 |
| `undo` | danger で○ | 元に戻す方法。戻せない場合は「戻せない」と明記する |
| `alternatives` | 任意 | 代替手段 |
| `prereq` | 任意 | 前提（例：gh のインストールと `gh auth login` が必要） |
| `since` | 任意 | 必要な Git のバージョン番号だけ（例：`2.23`） |
| `shellNote` | 任意 | Windows（PowerShell）と mac/Linux の書き方の違い |
| `diagram` | 任意 | ブランチ図（下記） |
| `related` | 任意 | 関連エントリの id |
| `docUrl` | 任意 | 公式ドキュメントの URL（https） |
| `tags` | 任意 | 絞り込み・検索用のタグ |
| `verified` | ○ | 確認済みなら true |
| `verifiedNote` | verified で○ | 確認した環境 |

### カテゴリ

`setup` 初期設定／`basic` 基本操作／`branch` ブランチ／`integrate` マージ・リベース／`history` 履歴の確認／`undo` 取り消し／`remote` リモート／`stash` stash／`tag` タグ／`config` 設定／`pr` PR／`issue` Issue／`repo` リポジトリ管理／`release` リリース／`other` その他

一覧は [js/config.js](js/config.js) の `CATEGORIES` で管理しています。

### 危険度の目安

- `safe`：取り消しが簡単、または何も変更しない
- `caution`：コンフリクトや履歴の書き換えが起こりうる。手順を知っていれば戻せる
- `danger`：未コミットの変更が消えるなど、Git でも取り戻せないものがある

### 検索の優先順位（参考）

コマンド名・構文の前方一致 ＞ intents ＞ title ＞ keywords ＞ tags ＞ summary。検索語はすべて「NFKC → 小文字化 → カタカナをひらがなへ」と正規化してから比べます。

## 用語集

```json
{ "term": "ステージ", "reading": "すてーじ", "aliases": ["ステージング", "インデックス"], "def": "定義文。[[コミット]] のように他の用語にもリンクできる", "related": ["git-add"] }
```

- `reading` はひらがな（五十音順の並べ替えに使う）。
- 本文の `[[…]]` は term か aliases のどれかと一致させる。一致しないと検証ページでエラーになる。

## ブランチ図（diagram）

before と after をそれぞれ次の形式で書きます。SVG は手描きせず、レンダラーが描きます。

```json
"diagram": {
  "before": {
    "commits": [{ "id": "A" }, { "id": "B", "parents": ["A"] }, { "id": "C", "parents": ["B"] }],
    "branches": { "main": "C" },
    "head": "main"
  },
  "after": {
    "commits": [{ "id": "A" }, { "id": "B", "parents": ["A"] }, { "id": "C", "parents": ["B"], "ghost": true }],
    "branches": { "main": "B" },
    "head": "main",
    "highlight": ["B"]
  },
  "note": "図の補足。[[用語]] も使えます"
}
```

- commits は親が先に来る順に並べる（親より前に子を書かない）。
- branches のキーの順番がレーン（段）の順番になる。main を先頭に書く。
- head はブランチ名、またはコミット id（detached HEAD の場合）。
- `note`（任意）は図の下に表示する補足。コミットの形では違いが出ない操作（`reset` の `--soft`／`--mixed`／`--hard` など）は、ここで違いを説明する。
- `highlight` は強調するコミット。`ghost: true` はどのブランチからも辿れなくなったコミット（薄く表示）。`label` で表示名を変えられる（リベース後の `C'` など）。

## フローチャート（flows.json）

```json
{
  "id": "undo-commit",
  "title": "コミットを取り消したい",
  "start": "q1",
  "nodes": [
    { "id": "q1", "question": "そのコミットはもう push しましたか？", "choices": [
      { "label": "まだ", "next": "r-local" },
      { "label": "push した", "next": "r-pushed" }
    ]},
    { "id": "r-local", "entryIds": ["git-reset-soft"], "note": "手元だけなら履歴から外せます。" },
    { "id": "r-pushed", "entryIds": ["git-revert"], "note": "共有済みなら打ち消しコミットを作ります。" }
  ]
}
```

- 質問ノードは `question` と `choices`、結果ノードは `entryIds` と `note` を持つ。
- 深さは 5 段以内を目安にする（超えると検証ページで警告）。

- 結果ノードの `note` は改行で箇条書き風に書ける（`1. …
2. …`）。

## クイズ（quiz.json）

```json
{
  "id": "quiz-fetch",
  "question": "手元のブランチを変えずに、リモートの最新状態だけを取得するコマンドは？",
  "choices": ["`git pull`", "`git fetch`", "`git push`", "`git clone`"],
  "answer": 1,
  "explain": "解説",
  "entryId": "git-fetch",
  "tool": "git",
  "category": "remote",
  "verified": false
}
```

- `choices` は4件、`answer` は正解の添字（0〜3）。表示時に選択肢は並べ替えられる。
- 出題されるのは `verified: true` の手書き問題と、`verified: true` でコマンドのあるエントリから自動で作る問題だけ（設定の「未確認項目の表示」とは無関係）。
- エントリを確認したら、そのエントリを参照する手書き問題も確認して `verified: true` にする。

## シーン（scenes.json）

```json
{ "id": "daily", "title": "毎日の作業", "desc": "説明", "entryIds": ["git-status", "git-add"] }
```

## 検証

- ブラウザ：ローカルサーバーを立てて `tools/validate.html` を開く（アプリ画面からはリンクしていません）。
- Node.js（任意）：`node tools/validate-cli.mjs`（`--info` を付けると未確認の一覧も出す）。

検証ページでは、スキーマ違反、id の重複、`related`／`entryIds`／`next` のリンク切れ、用語集にない `[[用語]]`、未確認の件数をチェックします。
