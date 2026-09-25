# Gitまなび帳

Git・GitHub CLI・GitHub の操作を「やりたいこと」と「コマンド名」の両方から引ける、学習向けの辞典 PWA です。

- 公開URL：https://trendgoing-stack.github.io/git-manabi/
- ビルド不要（バニラ JavaScript の ES Modules ＋ HTML ＋ CSS）。外部ライブラリや CDN は使いません。
- ユーザーデータ（お気に入り、メモなど）はブラウザの localStorage にだけ保存し、外部には送りません。

> 開発中（フェーズ1）です。公開手順、ホーム画面への追加手順、更新手順はフェーズ4で追記します。

## ローカルで動かす

ES Modules と fetch を使うため、ファイルを直接開くのではなく、ローカルサーバー経由で開いてください。

```bash
python -m http.server 8765
```

ブラウザで http://localhost:8765/ を開きます。

## 開発用ツール

| パス | 内容 |
|---|---|
| `tools/validate.html` | 辞書データの検証ページ（ブラウザで開く） |
| `tools/tests.html` | 検索・正規化・コマンド組み立ての簡易テスト |
| `node tools/validate-cli.mjs` | 検証を Node.js で実行（任意） |
| `node tools/tests-cli.mjs` | 簡易テストを Node.js で実行（任意） |

`package.json` は Node.js で上記を実行するためだけのもので、アプリの動作には不要です。

## ディレクトリ構成

```
index.html        画面の外枠
css/              base（配色・外枠）、components、views
js/app.js         起動処理
js/config.js      バージョン、カテゴリ、既定の設定値
js/types.js       JSDoc の型定義
js/router.js      ハッシュルーティング
js/data.js        辞書データの読み込みと索引
js/storage.js     localStorage の読み書き（キーは gitdict: で始まる）
js/normalize.js   検索用の正規化
js/search.js      検索
js/builder.js     コマンドの完成形の組み立て
js/clipboard.js   コピー処理
js/markup.js      本文の記法（[[用語]]、`code`）
js/ui/            共通 UI 部品
js/views/         各画面
data/             辞書データ（書き方は CONTENT.md）
tools/            検証ページ、テスト
```

## データの追加・修正

[CONTENT.md](CONTENT.md) を参照してください。
