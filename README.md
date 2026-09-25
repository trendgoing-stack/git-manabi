# Gitまなび帳

Git・GitHub CLI（gh）・GitHub の操作を、「やりたいこと」と「コマンド名」の両方から引ける学習向けの辞典 PWA です。

- 公開URL：https://trendgoing-stack.github.io/git-manabi/
- 逆引き・正引き検索、コマンドビルダー（入力欄とオプションから完成形を作ってコピー）、ブランチ図、トラブル脱出フローチャート、クイズ、フラッシュカード、用語集
- ビルド不要（バニラ JavaScript の ES Modules ＋ HTML ＋ CSS）。外部ライブラリ、外部 CDN、Web フォントは使いません。
- 初回読み込み後は、オフラインでもすべての機能が動きます。
- ユーザーデータ（お気に入り、履歴、メモ、スニペット、学習記録、設定）はブラウザの localStorage にだけ保存し、外部には送りません。外部への送信は、起動時のアクセス解析（GoatCounter）1回だけです（設定でオフにできます）。

## ディレクトリ構成

```
index.html        画面の外枠
manifest.json     PWA の設定
sw.js             Service Worker（キャッシュ）
count.js          GoatCounter 送信用の最小スクリプト（同梱）
css/              base（配色・外枠）、components、views
icons/            アイコン（icon.svg と PNG）
js/app.js         起動処理
js/config.js      アプリのバージョン、カテゴリ、既定の設定値
js/types.js       JSDoc の型定義
js/router.js      ハッシュルーティング
js/data.js        辞書データの読み込みと索引
js/storage.js     localStorage の読み書き（キーは gitdict: で始まる）
js/normalize.js   検索用の正規化
js/search.js      検索
js/builder.js     コマンドの完成形の組み立て
js/clipboard.js   コピー処理
js/markup.js      本文の記法（[[用語]]、`code`）
js/diagram.js     ブランチ図のレンダラー
js/flow.js        フローチャートの経路の検証
js/quiz.js        クイズの出題ロジック
js/snippets.js    自作スニペットをエントリ形式に変換
js/visibility.js  未確認項目の表示判定
js/pwa.js         Service Worker の登録と更新通知
js/analytics.js   アクセス解析の読み込み
js/ui/            共通 UI 部品
js/views/         各画面
data/             辞書データ（書き方は CONTENT.md）
tools/            検証ページ、テスト、開発用スクリプト（アプリからはリンクせず、キャッシュもしない）
```

## ローカルで動かす

ES Modules と fetch を使うため、ファイルを直接開くのではなく、ローカルサーバー経由で開いてください。

```bash
python -m http.server 8765
```

ブラウザで http://localhost:8765/ を開きます。localhost では Service Worker も動くので、ファイルを変えたのに表示が変わらないときは `sw.js` の `VERSION` を上げて再読み込みするか、開発者ツールで Service Worker を登録解除してください。アクセス解析は localhost では送信しません。

## 開発用ツール

| パス | 内容 |
|---|---|
| `tools/validate.html` | 辞書データの検証ページ（ブラウザで開く） |
| `tools/tests.html` | 検索・正規化・コマンド組み立て・図・クイズの簡易テスト |
| `node tools/validate-cli.mjs` | 検証を Node.js で実行（任意） |
| `node tools/tests-cli.mjs` | 簡易テストを Node.js で実行（任意） |
| `node tools/check-sw.mjs` | `sw.js` のキャッシュ一覧に漏れや余分がないか確認（任意） |
| `tools/make-icons.ps1` | `icons/icon.svg` と同じデザインの PNG アイコンを作る（Windows PowerShell） |

`package.json` は Node.js で上記を実行するためだけのもので、アプリの動作には不要です。

## GitHub Pages で公開する

1. GitHub に `git-manabi` という名前のリポジトリを作ります（公開リポジトリ）。
2. 手元のリポジトリを結び付けて push します。
   ```bash
   git remote add origin https://github.com/trendgoing-stack/git-manabi.git
   ```
   ```bash
   git push -u origin main
   ```
3. GitHub のリポジトリ画面で「Settings」→「Pages」を開きます。
4. 「Build and deployment」の「Source」で「Deploy from a branch」を選び、「Branch」で `main`、フォルダで `/ (root)` を選んで「Save」を押します。
5. 数分待つと https://trendgoing-stack.github.io/git-manabi/ で公開されます。

iPhone でクリップボードや Service Worker を試すには HTTPS が必要なので、実機確認は GitHub Pages に push して行います。

## ホーム画面に追加する（iPhone）

1. Safari で公開URLを開きます。
2. 画面下の共有ボタン（四角から矢印が出たアイコン）をタップします。
3. 「ホーム画面に追加」を選び、名前が「まなび帳」になっていることを確かめて「追加」をタップします。

Safari で開いた場合とホーム画面のアプリでは、保存データ（お気に入りやメモなど）が別になります。移すときは、設定の「エクスポート」と「インポート」を使います。

## 更新するとき

利用者の端末には Service Worker がキャッシュしたファイルが表示されるので、**何かを変えたら必ず `sw.js` の `VERSION` を上げます**。上げると、利用者の画面に「更新があります（タップで再読み込み）」が表示されます。

### 辞書データ（data/）を変えたとき

1. `data/` の JSON を編集します（書き方は [CONTENT.md](CONTENT.md)）。
2. `data/meta.json` の `dataVersion`（例：`2026.10.01-1`）と、件数が変わったら `counts` を更新します。
3. `sw.js` の `VERSION` を上げます（例：`1.0.0-1` → `1.0.0-2`）。
4. `tools/validate.html`（または `node tools/validate-cli.mjs`）でエラーが 0 件であることを確認します。
5. コミットして push します。

エントリファイルを新しく追加したときは、`meta.json` の `entryFiles` にも追加します（Service Worker は meta.json を読んでキャッシュします）。

### アプリ本体（HTML・CSS・JS）を変えたとき

1. ファイルを編集します。ファイルを追加・削除したときは `sw.js` の `SHELL` も直します（`node tools/check-sw.mjs` で漏れを確認できます）。
2. `js/config.js` の `APP_VERSION` を上げます（設定画面に表示されます）。
3. `sw.js` の `VERSION` を上げます。
4. コミットして push します。

### 確認済みにしたとき

実際にコマンドを実行して確かめた項目は、`verified: true` と `verifiedNote`（確認した環境）を書き、上の「辞書データを変えたとき」と同じ手順で公開します。設定の既定値は「未確認項目を表示しない」なので、確認済みの項目だけが利用者に表示されます。

## ドキュメント

- [CONTENT.md](CONTENT.md)：辞書データの書き方、スキーマ、確認ルール、ブランチ図とフローチャートの記述例
- [TESTING.md](TESTING.md)：実機確認用のチェックリスト
