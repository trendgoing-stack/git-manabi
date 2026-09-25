// クイズの出題ロジック（DOM に依存しない）。
// 出題対象は verified: true のエントリと手書き問題だけ（未確認項目の表示設定とは無関係）。

import { plain } from './markup.js';

export const QUIZ_SIZE = 10;
export const MIN_ITEMS = 4;

/**
 * @typedef {Object} Question
 * @property {string} statId        成績を記録するキー（エントリ id か手書き問題の id）
 * @property {'reverse'|'forward'|'manual'} kind
 * @property {string} lead          問題文の前置き
 * @property {string} prompt
 * @property {boolean} promptIsCode
 * @property {string[]} choices
 * @property {boolean} choicesAreCode
 * @property {number} answer
 * @property {string} [explain]
 * @property {string} [entryId]
 */

/** 0 以上 1 未満の乱数を返す関数 @typedef {() => number} Rng */

/** @param {any[]} arr @param {Rng} rng */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** クイズで使うコマンド表記（[options] を除いた1行目） */
export function commandOf(entry) {
  return (entry.syntax || '').replace(/ ?\[options\]/g, '').split('\n')[0];
}

/**
 * 出題の対象を集める。
 * @param {import('./types.js').Entry[]} entries
 * @param {import('./types.js').QuizItem[]} quizItems
 * @param {{tool?: string, category?: string}} scope
 */
export function eligible(entries, quizItems, scope = {}) {
  const inScope = (x) => (!scope.tool || x.tool === scope.tool) && (!scope.category || x.category === scope.category);
  // 自動出題はコマンドのある確認済みエントリだけ（GitHub 画面の項目は手書き問題で扱う）
  const auto = entries.filter((e) => e.verified === true && e.syntax && inScope(e));
  const manual = quizItems.filter((q) => q.verified === true && inScope(q));
  // 自動出題は選択肢が4つそろうときだけ使う
  const usableAuto = uniqueBy(auto, commandOf).length >= MIN_ITEMS ? auto : [];
  return { auto: usableAuto, manual, total: usableAuto.length + manual.length };
}

function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * 不正解の選択肢を選ぶ。できるだけ同じカテゴリから、表記が重ならないように。
 * @param {import('./types.js').Entry} target
 * @param {import('./types.js').Entry[]} pool
 * @param {(e: import('./types.js').Entry) => string} label
 * @param {Rng} rng
 */
function distractors(target, pool, label, rng) {
  const used = new Set([label(target)]);
  const out = [];
  const same = shuffle(pool.filter((e) => e.id !== target.id && e.category === target.category), rng);
  const other = shuffle(pool.filter((e) => e.id !== target.id && e.category !== target.category), rng);
  for (const e of [...same, ...other]) {
    const l = label(e);
    if (used.has(l)) continue;
    used.add(l);
    out.push(l);
    if (out.length === 3) break;
  }
  return out;
}

/**
 * @param {import('./types.js').Entry} e
 * @param {import('./types.js').Entry[]} pool 選択肢に使うエントリ
 * @param {Rng} rng
 * @returns {Question}
 */
export function autoQuestion(e, pool, rng = Math.random) {
  const reverse = rng() < 0.5;
  if (reverse) {
    const intents = [e.title, ...(e.intents || [])];
    const prompt = intents[Math.floor(rng() * intents.length)];
    const choices = shuffle([commandOf(e), ...distractors(e, pool, commandOf, rng)], rng);
    return {
      statId: e.id,
      kind: 'reverse',
      lead: 'このやりたいことに合うコマンドは？',
      prompt,
      promptIsCode: false,
      choices,
      choicesAreCode: true,
      answer: choices.indexOf(commandOf(e)),
      explain: plain(e.summary),
      entryId: e.id,
    };
  }
  const choices = shuffle([e.title, ...distractors(e, pool, (x) => x.title, rng)], rng);
  return {
    statId: e.id,
    kind: 'forward',
    lead: 'このコマンドでできることは？',
    prompt: commandOf(e),
    promptIsCode: true,
    choices,
    choicesAreCode: false,
    answer: choices.indexOf(e.title),
    explain: plain(e.summary),
    entryId: e.id,
  };
}

/**
 * @param {import('./types.js').QuizItem} q
 * @param {Rng} rng
 * @returns {Question}
 */
export function manualQuestion(q, rng = Math.random) {
  const order = shuffle([0, 1, 2, 3], rng);
  return {
    statId: q.id,
    kind: 'manual',
    lead: '問題',
    prompt: q.question,
    promptIsCode: false,
    choices: order.map((i) => q.choices[i]),
    choicesAreCode: false,
    answer: order.indexOf(q.answer),
    explain: q.explain,
    entryId: q.entryId,
  };
}

/** 不正解率。未回答なら -1 */
export function wrongRate(stat) {
  if (!stat || stat.ok + stat.ng === 0) return -1;
  return stat.ng / (stat.ok + stat.ng);
}

/**
 * 1セット分の問題を作る。
 * - normal：対象からランダムに QUIZ_SIZE 問
 * - weak：一度でも間違えた項目を、不正解率の高い順（同率なら不正解数の多い順）に出題
 * @param {{entries: import('./types.js').Entry[], quizItems: import('./types.js').QuizItem[], stats: Object<string, {ok: number, ng: number}>,
 *   scope?: {tool?: string, category?: string}, mode?: 'normal'|'weak', size?: number, rng?: Rng}} opt
 * @returns {Question[]}
 */
export function buildQuiz(opt) {
  const rng = opt.rng ?? Math.random;
  const size = opt.size ?? QUIZ_SIZE;
  const { auto, manual, total } = eligible(opt.entries, opt.quizItems, opt.scope);
  if (total < MIN_ITEMS) return [];
  // 選択肢は範囲外も含めた確認済みエントリから選ぶ（範囲が狭くても4択にできるように）
  const pool = opt.entries.filter((e) => e.verified === true && e.syntax);
  const items = [...auto.map((e) => ({ id: e.id, make: () => autoQuestion(e, pool, rng) })), ...manual.map((q) => ({ id: q.id, make: () => manualQuestion(q, rng) }))];

  let picked;
  if (opt.mode === 'weak') {
    picked = items
      .map((it) => ({ it, s: opt.stats[it.id] }))
      .filter((x) => x.s && x.s.ng > 0)
      .sort((a, b) => wrongRate(b.s) - wrongRate(a.s) || b.s.ng - a.s.ng)
      .slice(0, size)
      .map((x) => x.it);
  } else {
    picked = shuffle(items, rng).slice(0, size);
  }
  return picked.map((it) => it.make());
}
