// normalize / builder / search の簡易テスト。tests.html と tests-cli.mjs から使う。

import { normalize, splitWords } from '../js/normalize.js';
import { build, quoteValue, blockedFlags, extractPlaceholderKeys } from '../js/builder.js';
import { buildIndex, search } from '../js/search.js';
import { layout, describe } from '../js/diagram.js';
import { buildQuiz, eligible, wrongRate } from '../js/quiz.js';
import { validPath } from '../js/flow.js';

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
    { id: 'a', tool: 'git', category: 'branch', title: 'ブランチを削除したい', intents: ['ブランチを消したい'], keywords: [], tags: [], summary: '', syntax: 'git branch -d <b>' },
    { id: 'b', tool: 'git', category: 'basic', title: 'コミットしたい', intents: [], keywords: ['こみっと'], tags: [], summary: 'ブランチに記録', syntax: 'git commit -m <m>' },
    { id: 'c', tool: 'gh', category: 'pr', title: 'PR を作りたい', intents: [], keywords: [], tags: ['プルリク'], summary: '', syntax: 'gh pr create' },
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
  eq('0 件', ids('存在しない語'), []);
  eq('件数の上限', search(idx, '', { limit: 2 }).items.length, 2);

  // ---- ブランチ図のレイアウト ----
  const merge = {
    commits: [{ id: 'A' }, { id: 'B', parents: ['A'] }, { id: 'C', parents: ['B'] }, { id: 'D', parents: ['B'] }, { id: 'M', parents: ['C', 'D'] }],
    branches: { main: 'M', feature: 'D' },
    head: 'main',
  };
  const L = layout(merge);
  const at = (id) => L.commits.find((k) => k.c.id === id);
  eq('図：main の最初の親の列はレーン0', ['A', 'B', 'C', 'M'].map((id) => at(id).lane), [0, 0, 0, 0]);
  eq('図：feature だけのコミットはレーン1', at('D').lane, 1);
  eq('図：列は親の列＋1', [at('C').col, at('D').col, at('M').col], [2, 2, 3]);
  const reset = { commits: [{ id: 'A' }, { id: 'B', parents: ['A'] }, { id: 'C', parents: ['B'], ghost: true }], branches: { main: 'B' }, head: 'main' };
  const LR = layout(reset);
  eq('図：ghost は最下段のレーン', [LR.ghostLane, LR.commits[2].lane, LR.laneCount], [1, 1, 2]);
  eq('図：説明文', describe({ ...reset, head: 'A' }), 'main は B を指す。HEAD は A を直接指す。C はどのブランチからも辿れない。');

  // ---- クイズ ----
  const mk = (id, cat, syntax = `git ${id} [options]`) => ({ id, tool: 'git', category: cat, title: `t-${id}`, intents: [`i-${id}`], syntax, summary: 's' });
  const ents = [mk('a', 'x'), mk('b', 'x'), mk('c', 'x'), mk('d', 'y'), mk('e', 'y'), mk('w', 'y', undefined)];
  delete ents[5].syntax;
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const qs = buildQuiz({ entries: ents, quizItems: [], stats: {}, rng });
  eq('クイズ：すべての項目を出題', qs.map((q) => q.statId).sort(), ['a', 'b', 'c', 'd', 'e', 'w']);
  eq('クイズ：コマンドのない項目は説明から出題', qs.find((q) => q.statId === 'w').kind, 'describe');
  eq('クイズ：コマンドの選択肢に空の項目が混ざらない', qs.every((q) => !q.choicesAreCode || q.choices.every((c) => c && c.startsWith('git '))), true);
  eq('クイズ：正解が選択肢に入っている', qs.every((q) => q.answer >= 0 && q.choices.length === 4), true);
  eq('クイズ：[options] は表示しない', qs.every((q) => !(q.prompt + q.choices.join()).includes('[options]')), true);
  eq('クイズ：4件未満は開始できない', buildQuiz({ entries: ents.slice(0, 3), quizItems: [], stats: {} }).length, 0);
  eq('クイズ：範囲で絞り込み', eligible(ents, [], { category: 'y' }).total, 3);
  eq('クイズ：4件未満の範囲は出題しない', buildQuiz({ entries: ents, quizItems: [], stats: {}, scope: { category: 'y' } }).length, 0);
  const manual = [0, 1, 2, 3].map((n) => ({ id: `m${n}`, question: 'q', choices: ['w', 'x', 'y', 'z'], answer: 2, tool: 'git', category: 'y' }));
  const mq = buildQuiz({ entries: [], quizItems: manual, stats: {}, rng });
  eq('クイズ：手書き問題の正解を並べ替え後も追跡', mq.every((q) => q.choices[q.answer] === 'y'), true);
  const stats = { a: { ok: 1, ng: 3 }, b: { ok: 3, ng: 1 }, c: { ok: 0, ng: 1 }, d: { ok: 5, ng: 0 } };
  eq('クイズ：苦手は不正解率の高い順', buildQuiz({ entries: ents, quizItems: [], stats, mode: 'weak', rng }).map((q) => q.statId), ['c', 'a', 'b']);
  eq('クイズ：不正解率', [wrongRate({ ok: 1, ng: 1 }), wrongRate(undefined)], [0.5, -1]);

  // ---- フローチャートの経路 ----
  const flow = { id: 'f', title: 't', start: 'q1', nodes: [{ id: 'q1', question: '?', choices: [{ label: 'a', next: 'q2' }, { label: 'b', next: 'r1' }] }, { id: 'q2', question: '?', choices: [{ label: 'c', next: 'r1' }] }, { id: 'r1', entryIds: [], note: '' }] };
  eq('フロー：正しい経路', validPath(flow, ['q1', 'q2', 'r1']), ['q1', 'q2', 'r1']);
  eq('フロー：start は省略可', validPath(flow, ['q2']), ['q1', 'q2']);
  eq('フロー：つながらない所で切る', validPath(flow, ['q1', 'r1', 'q2']), ['q1', 'r1']);

  return results;
}
