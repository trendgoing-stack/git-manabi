# 開発メモ（DEVELOPMENT.md）

公開手順と更新手順は [README.md](README.md) の「開発者向け」、辞書データの書き方は [CONTENT.md](CONTENT.md)、実機確認は [TESTING.md](TESTING.md) を参照してください。

## 方針

- ビルド不要（バニラ JavaScript の ES Modules ＋ HTML ＋ CSS）。外部ライブラリ、外部 CDN、Web フォントは使わない
- 辞書データはリポジトリ内の JSON に同梱する。ユーザーデータは localStorage（キーは `gitdict:` で始まる）に保存し、読み書きは `js/storage.js` にまとめる
- 外部への送信は GoatCounter（起動時に1回、固定のパスのみ）だけ。Service Worker は送信に介入しない
- 画面遷移はハッシュルーティング（`#/entry/<id>` など）

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
js/storage.js     localStorage の読み書き
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

## 手元で動かす

```bash
python -m http.server 8765
```

http://localhost:8765/ を開きます。localhost でも Service Worker が動くので、ファイルを変えたのに表示が変わらないときは `sw.js` の `VERSION` を上げて再読み込みするか、開発者ツールで Service Worker を登録解除してください。アクセス解析は localhost では送信しません。

## 開発用ツール

| パス | 内容 |
|---|---|
| `tools/validate.html` | 辞書データの検証ページ（ブラウザで開く） |
| `tools/tests.html` | 検索・正規化・コマンド組み立て・図・クイズの簡易テスト |
| `node tools/validate-cli.mjs` | 検証を Node.js で実行（`--info` で未確認の一覧も表示） |
| `node tools/tests-cli.mjs` | 簡易テストを Node.js で実行 |
| `node tools/check-sw.mjs` | `sw.js` のキャッシュ一覧に漏れや余分がないか確認 |
| `tools/make-icons.ps1` | `icons/icon.svg` と同じデザインの PNG アイコンを作る（Windows PowerShell） |

`package.json` は Node.js で上記を実行するためだけのもので、アプリの動作には不要です。
