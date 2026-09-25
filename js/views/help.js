// ヘルプ：使い方と注意書き。

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { APP_NAME } from '../config.js';

const LINKS = [
  { href: 'https://git-scm.com/docs', label: 'Git 公式リファレンス（英語）' },
  { href: 'https://cli.github.com/manual/', label: 'GitHub CLI マニュアル（英語）' },
  { href: 'https://docs.github.com/ja', label: 'GitHub Docs（日本語）' },
];

export function renderHelp() {
  const view = screen({ title: 'ヘルプ', tab: 'settings', showBack: true, backTo: '/settings' });
  const sec = (title, ...body) => h('section', { class: 'setting help' }, h('h2', null, title), ...body);
  const ul = (...items) => h('ul', null, items.map((t) => h('li', null, t)));

  view.append(
    h(
      'div',
      { class: 'settings' },
      sec(
        'このアプリについて',
        h('p', null, `${APP_NAME}は、Git・GitHub CLI（gh）・GitHub の画面操作を、「やりたいこと」と「コマンド名」の両方から引ける学習向けの辞典です。コマンドは表示とコピーだけで、このアプリから実行することはありません。`)
      ),
      sec(
        '使い方',
        ul(
          '検索：やりたいこと（例：コミットを取り消したい）やコマンド名（例：reset）で探せます。空白で区切ると、すべての語を含む項目に絞り込みます。',
          '詳細画面：入力欄に値を入れると完成形のコマンドができ、「コピー」でターミナルに貼り付けられます。',
          '困った：状況に合わせて質問に答えると、使うコマンドにたどり着けます。',
          '学ぶ：クイズ、フラッシュカード、用語集で覚えられます。',
          'マイ：お気に入り、閲覧履歴、メモ、自作スニペットをまとめて見られます。'
        )
      ),
      sec(
        '注意事項',
        ul(
          '説明はオリジナルの要約です。正確な仕様は公式ドキュメントを確認してください。',
          '危険なコマンド（「危険」「注意」のバッジ付き）は、実行する前にバックアップを取るか、ブランチを作っておいてください。',
          'GitHub の画面は変わる場合があります。手順どおりの場所にボタンが見つからないときは、GitHub Docs を確認してください。'
        )
      ),
      sec(
        '保存されるデータ',
        ul(
          'お気に入り、閲覧履歴、メモ、スニペット、クイズの成績、設定は、この端末のこのブラウザの中にだけ保存されます。外部には送信しません。',
          'Safari で開いた場合と、ホーム画面に追加したアプリから開いた場合では、保存先が別になります。',
          '移したいときは、設定の「エクスポート」で書き出し、もう一方で「インポート」してください。',
          'ブラウザの履歴やWebサイトデータを消去すると、保存したデータも消えることがあります。'
        )
      ),
      sec(
        'ホーム画面に追加する（iPhone）',
        h(
          'ol',
          null,
          h('li', null, 'Safari でこのページを開きます。'),
          h('li', null, '画面下の共有ボタン（四角から矢印が出たアイコン）をタップします。'),
          h('li', null, '「ホーム画面に追加」を選び、「追加」をタップします。')
        ),
        h('p', { class: 'sub' }, '一度開いたあとは、機内モードなどのオフラインでもすべての機能が使えます。')
      ),
      sec(
        'アクセス解析について',
        ul(
          '利用状況を知るために、アプリを開いたときに1回だけ、GoatCounter（km-apps.goatcounter.com）へページ表示の情報を送ります。',
          '送るのは固定のページ名だけで、検索語、見た項目、メモやスニペットの内容は送りません。',
          '設定の「アクセス解析を送信しない」をオンにすると、次回の起動から送信しません。'
        )
      ),
      sec('公式ドキュメント', h('ul', { class: 'link-list' }, LINKS.map((l) => h('li', null, h('a', { href: l.href, target: '_blank', rel: 'noopener' }, `${l.label} ↗`)))))
    )
  );
}
