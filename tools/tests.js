// normalize / builder / search の簡易テスト。tests.html と tests-cli.mjs から使う。

import { normalize, splitWords } from '../js/normalize.js';
import { build, quoteValue, blockedFlags, extractPlaceholderKeys } from '../js/builder.js';
import { buildIndex, search } from '../js/search.js';

/** @returns {{name: string, ok: boolean, detail?: string}[]} */
export function runTests() {
  const results = [];
  const eq = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ name, ok, detail: ok ? undefined : `期待値 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}` });
  };

  // ---- normalize ----
  eq('全角英数を半角・小文字に', normalize('ＧＩＴ　Ｃｏｍｍｉｔ'), 'git commit');
  eq('カタカナをひらがなに', normalize('ブランチ'), 'ぶらんち');
  eq('半角カナもひらがなに', normalize('ｽﾀｯｼｭ'), 'すたっしゅ');
  eq('長音はそのまま', normalize('マージ'), 'まーじ');
  eq('空白の連続をまとめる', normalize('  a \t  b\n c '), 'a b c');
  eq('AND 検索の語分割', splitWords(' ブランチ　削除 '), ['ぶらんち', '削除']);

  // ---- builder ----
  eq('quote：" をエスケープ', quoteValue('say "hi"'), '"say \\"hi\\""');
  const commit = { syntax: 'git commit -m <message>', placeholders: [{ key: 'message', label: 'メッセージ', example: 'x', quote: true }] };
  eq('未入力は <ラベル>', build(commit, {}).text, 'git commit -m <メッセージ>');
  eq('未入力フラグ', build(commit, {}).missing, true);
  eq('quote: true で囲む', build(commit, { message: 'fix "a"' }).text, 'git commit -m "fix \\"a\\""');
  eq('空白だけは未入力扱い', build(commit, { message: '   ' }).missing, true);
  eq('シェル特殊文字の警告', build(commit, { message: 'cost $5' }).shellWarn, true);
  eq('特殊文字がなければ警告なし', build(commit, { message: 'ok' }).shellWarn, false);
  eq('複数行の構文', build({ syntax: 'a <x>\nb <y>', placeholders: [{ key: 'x', label: 'X' }, { key: 'y', label: 'Y' }] }, { x: '1', y: '2' }).text, 'a 1\nb 2');
  eq('プレースホルダの抽出', extractPlaceholderKeys('git x <a> <b> <a>'), ['a', 'b']);

  const log = {
    syntax: 'git log [options]',
    options: [
      { flag: '--oneline', label: '1行' },
      { flag: '-n', label: '件数', value: { label: '件数', example: '5' } },
      { flag: '--format=', label: '形式', value: { label: '形式', example: '%h' }, conflicts: ['--oneline'] },
    ],
  };
  eq('オプションなしなら [options] ごと消える', build(log, {}).text, 'git log');
  eq('オプションは定義順', build(log, {}, { '-n': { on: true, value: '3' }, '--oneline': { on: true } }).text, 'git log --oneline -n 3');
  eq('= で終わる flag は空白なし', build(log, {}, { '--format=': { on: true, value: '%h' } }).text, 'git log --format=%h');
  eq('値が未入力のオプション', build(log, {}, { '-n': { on: true } }).text, 'git log -n <件数>');
  eq('conflicts は双方向', [...blockedFlags(log.options, { '--oneline': { on: true } })], ['--format=']);
  eq('conflicts（逆方向）', [...blockedFlags(log.options, { '--format=': { on: true } })], ['--oneline']);

  // ---- search ----
  const items = [
    { id: 'a', tool: 'git', category: 'branch', title: 'ブランチを削除したい', intents: ['ブランチを消したい'], keywords: [], tags: [], summary: '', syntax: 'git branch -d <b>', verified: true },
    { id: 'b', tool: 'git', category: 'basic', title: 'コミットしたい', intents: [], keywords: ['こみっと'], tags: [], summary: 'ブランチに記録', syntax: 'git commit -m <m>', verified: false },
    { id: 'c', tool: 'gh', category: 'pr', title: 'PR を作りたい', intents: [], keywords: [], tags: ['プルリク'], summary: '', syntax: 'gh pr create', verified: true },
  ];
  const idx = buildIndex(items);
  const ids = (q, f) => search(idx, q, f).items.map((x) => x.id);
  eq('コマンド名の前方一致', ids('git com'), ['b']);
  eq('ツール名を省いたコマンド名', ids('commit'), ['b']);
  eq('カタカナの検索語', ids('ブランチ'), ['a', 'b']);
  eq('ひらがなの検索語', ids('ぶらんち'), ['a', 'b']);
  eq('AND 検索', ids('ブランチ 消'), ['a']);
  eq('タグで検索', ids('プルリク'), ['c']);
  eq('ツールで絞り込み', ids('', { tool: 'gh' }), ['c']);
  eq('未確認を隠す', ids('ブランチ', { showUnverified: false }), ['a']);
  eq('0 件', ids('存在しない語'), []);
  eq('件数の上限', search(idx, '', { limit: 2 }).items.length, 2);

  return results;
}
