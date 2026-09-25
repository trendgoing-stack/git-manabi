// 設定タブ

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { toast } from '../ui/toast.js';
import { openDialog, confirmDialog } from '../ui/dialog.js';
import { copyWithToast } from '../ui/copy.js';
import { getSettings, setSetting, exportData, importData, clearAll } from '../storage.js';
import { db, invalidateIndex } from '../data.js';
import { APP_VERSION } from '../config.js';
import { applySettings } from '../app-settings.js';

export function renderSettings() {
  const view = screen({ title: '設定', tab: 'settings' });
  const s = getSettings();

  /**
   * @param {string} name
   * @param {string} legend
   * @param {{value: any, label: string}[]} choices
   * @param {any} current
   * @param {(v: any) => void} onChange
   * @param {string} [note]
   */
  const radios = (name, legend, choices, current, onChange, note) =>
    h(
      'fieldset',
      { class: 'setting' },
      h('legend', null, legend),
      choices.map((c) =>
        h(
          'label',
          { class: 'radio' },
          h('input', { type: 'radio', name, checked: current === c.value, onchange: () => onChange(c.value) }),
          h('span', null, c.label)
        )
      ),
      note ? h('p', { class: 'sub setting-note' }, note) : null
    );

  const toggle = (label, checked, onChange, note) =>
    h(
      'div',
      { class: 'setting' },
      h(
        'label',
        { class: 'switch-row' },
        h('span', null, label),
        h('input', { type: 'checkbox', role: 'switch', class: 'switch', checked, onchange: (e) => onChange(e.target.checked) })
      ),
      note ? h('p', { class: 'sub setting-note' }, note) : null
    );

  view.append(
    h(
      'div',
      { class: 'settings' },
      radios(
        'font',
        '文字サイズ',
        [
          { value: 'normal', label: '標準' },
          { value: 'large', label: '大' },
        ],
        s.fontSize,
        (v) => {
          setSetting('fontSize', v);
          applySettings();
        }
      ),
      toggle('危険なコマンドのコピー時に確認する', s.confirmDanger, (v) => setSetting('confirmDanger', v), '「危険」の項目をコピーする前に、危険な理由と元に戻す方法を表示します。'),
      radios(
        'unverified',
        '未確認項目の表示',
        [
          { value: true, label: '表示する（未確認バッジ付き）' },
          { value: false, label: '表示しない' },
        ],
        s.showUnverified,
        (v) => {
          setSetting('showUnverified', v);
          invalidateIndex();
        },
        '未確認：作者が実際に動作を確かめる前の下書きです。クイズには出題されません。'
      ),
      toggle(
        'アクセス解析を送信しない',
        s.analyticsOff,
        (v) => setSetting('analyticsOff', v),
        'オフのときは、アプリを開いたときに1回だけ、ページ表示の情報（固定のページ名のみ）を GoatCounter に送ります。検索語やメモの内容は送りません。変更は次回の起動から有効です。'
      ),
      h('a', { class: 'btn btn-block', href: '#/help' }, 'ヘルプ・注意事項'),
      dataSection(),
      h(
        'section',
        { class: 'setting' },
        h('h2', null, 'バージョン'),
        h(
          'dl',
          { class: 'notes' },
          h('dt', null, 'アプリ'),
          h('dd', null, APP_VERSION),
          h('dt', null, 'データ'),
          h('dd', null, db.meta?.dataVersion ?? '不明'),
          h('dt', null, '収録'),
          h('dd', null, `${db.entries.length} 件（確認済み ${db.entries.filter((e) => e.verified).length} 件）`)
        )
      )
    )
  );
}

// ---- データ管理 ----

function dataSection() {
  return h(
    'section',
    { class: 'setting' },
    h('h2', null, 'データ管理'),
    h('p', { class: 'sub setting-note' }, 'お気に入り、履歴、メモ、スニペット、学習記録、設定は、この端末のこのブラウザにだけ保存されています。Safari とホーム画面のアプリでは保存先が別なので、移すときはエクスポートとインポートを使います。'),
    h(
      'div',
      { class: 'action-col' },
      h('button', { type: 'button', class: 'btn', onclick: exportDialog }, 'エクスポート'),
      h('button', { type: 'button', class: 'btn', onclick: importDialog }, 'インポート'),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-danger-outline',
          onclick: () =>
            confirmDialog({
              title: 'すべてのデータを削除しますか？',
              body: h('p', null, 'お気に入り、履歴、メモ、スニペット、学習記録、設定をすべて削除します。元に戻せません。必要なら先にエクスポートしてください。'),
              okLabel: 'すべて削除',
              danger: true,
              onOk: () => {
                clearAll();
                invalidateIndex();
                applySettings();
                toast('すべてのデータを削除しました');
                renderSettings();
              },
            }),
        },
        'すべてのデータを削除'
      )
    )
  );
}

function backupFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `gitdict-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

function exportDialog() {
  const json = JSON.stringify(exportData(), null, 2);
  const pre = h('pre', { class: 'dialog-cmd export-text' }, json);
  openDialog({
    title: 'エクスポート',
    body: [
      h('p', null, 'ファイルとして保存するか、テキストをコピーしてメモアプリなどに貼り付けてください。'),
      h(
        'div',
        { class: 'action-col' },
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            onclick: () => {
              const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
              const a = h('a', { href: url, download: backupFileName() });
              document.body.append(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 10000);
            },
          },
          'ファイルを保存'
        ),
        h('button', { type: 'button', class: 'btn', onclick: () => copyWithToast(json, { selectEl: pre }) }, 'テキストをコピー')
      ),
      h('details', null, h('summary', null, '内容を見る'), pre),
    ],
    actions: [{ label: '閉じる', kind: 'plain' }],
  });
}

function importDialog() {
  let text = '';
  const status = h('p', { class: 'sub', 'aria-live': 'polite' }, 'ファイルを選ぶか、エクスポートしたテキストを貼り付けてください。');
  const file = h('input', {
    type: 'file',
    accept: 'application/json,.json,text/plain',
    class: 'file-input',
    onchange: async () => {
      const f = file.files?.[0];
      if (!f) return;
      text = await f.text();
      paste.value = '';
      status.textContent = `選択中：${f.name}`;
    },
  });
  const paste = h('textarea', {
    class: 'textarea code-input',
    rows: 4,
    placeholder: 'ここに貼り付け',
    'aria-label': 'エクスポートしたテキスト',
    oninput: () => {
      text = paste.value;
      status.textContent = text ? '貼り付けたテキストを使います' : '';
    },
  });
  const mode = (value, label, desc, checked) =>
    h('label', { class: 'radio radio-desc' }, h('input', { type: 'radio', name: 'import-mode', value, checked }), h('span', null, h('strong', null, label), h('span', { class: 'sub' }, desc)));
  const modes = h(
    'fieldset',
    { class: 'import-modes' },
    h('legend', null, '読み込み方'),
    mode('merge', '統合', '今のデータを残し、ファイルの内容を足します（同じ項目は新しい方を採用。設定は今のまま）', true),
    mode('replace', '置き換え', '今のデータをすべて消して、ファイルの内容にします', false)
  );

  const dlg = openDialog({
    title: 'インポート',
    body: [file, h('p', { class: 'sub or' }, 'または'), paste, status, modes],
    actions: [
      { label: 'キャンセル', kind: 'plain' },
      {
        label: '読み込む',
        kind: 'primary',
        onClick: () => {
          const m = /** @type {'merge'|'replace'} */ (dlg.querySelector('input[name="import-mode"]:checked')?.value || 'merge');
          doImport(text, m);
        },
      },
    ],
  });
}

function doImport(text, mode) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    showImportError(['JSON として読み取れませんでした。ファイルやテキストが途中で切れていないか確認してください。']);
    return;
  }
  const r = importData(obj, mode);
  if (!r.ok) {
    showImportError(r.errors);
    return;
  }
  invalidateIndex();
  applySettings();
  toast(mode === 'merge' ? '統合しました' : '置き換えました');
  renderSettings();
}

function showImportError(errors) {
  // 読み込むボタンのダイアログが閉じた後に出す
  setTimeout(() =>
    openDialog({
      title: '読み込めませんでした',
      body: [h('p', null, 'データは変更していません。'), h('ul', null, errors.map((e) => h('li', null, e)))],
      actions: [{ label: '閉じる', kind: 'primary' }],
    })
  );
}
