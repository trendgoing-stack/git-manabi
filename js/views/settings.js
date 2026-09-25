// 設定タブ（フェーズ1：文字サイズ、未確認項目の表示、バージョン表示）

import { h } from '../ui/dom.js';
import { screen } from '../ui/chrome.js';
import { getSettings, setSetting } from '../storage.js';
import { db } from '../data.js';
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
   */
  const radios = (name, legend, choices, current, onChange) =>
    h(
      'fieldset',
      { class: 'setting' },
      h('legend', null, legend),
      choices.map((c) =>
        h(
          'label',
          { class: 'radio' },
          h('input', {
            type: 'radio',
            name,
            checked: current === c.value,
            onchange: () => onChange(c.value),
          }),
          h('span', null, c.label)
        )
      )
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
      radios(
        'unverified',
        '未確認項目の表示',
        [
          { value: true, label: '表示する（未確認バッジ付き）' },
          { value: false, label: '表示しない' },
        ],
        s.showUnverified,
        (v) => setSetting('showUnverified', v)
      ),
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
      ),
      h('p', { class: 'sub' }, 'データ管理、アクセス解析、ヘルプは今後のフェーズで追加します。')
    )
  );
}
