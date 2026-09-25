// 辞書データの検証ロジック（DOM に依存しない）。validate.html と validate-cli.mjs から使う。

import { CATEGORIES, TOOLS } from '../js/config.js';
import { extractTerms } from '../js/markup.js';
import { extractPlaceholderKeys } from '../js/builder.js';

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY_RE = /^[a-z0-9_-]+$/;
const TOOL_IDS = TOOLS.map((t) => t.id);
const CAT_IDS = CATEGORIES.map((c) => c.id);
const DANGERS = ['safe', 'caution', 'danger'];
/** [[用語]] を探すフィールド */
const RICH_FIELDS = ['summary', 'details', 'dangerNote', 'undo', 'alternatives', 'prereq', 'shellNote'];
const MAX_FLOW_DEPTH = 5;

/**
 * @typedef {{level: 'error'|'warn'|'info', file: string, id: string, msg: string}} Issue
 * @typedef {Object} ValidateInput
 * @property {any} meta
 * @property {{name: string, entries: any[]}[]} entryFiles
 * @property {any[]} flows
 * @property {any[]} glossary
 * @property {any[]} quiz
 * @property {any[]} scenes
 * @property {string[]} loadErrors  読み込めなかったファイル
 */

/**
 * @param {ValidateInput} input
 * @returns {{issues: Issue[], stats: Object<string, number>}}
 */
export function validateAll(input) {
  /** @type {Issue[]} */
  const issues = [];
  const add = (level, file, id, msg) => issues.push({ level, file, id: id ?? '', msg });

  for (const f of input.loadErrors) add('error', f, '', '読み込めないか、JSON として不正です');

  // ---- 用語集 ----
  const terms = new Set();
  const glossary = asArray(input.glossary, 'glossary.json', add);
  glossary.forEach((t, i) => {
    const where = t?.term || `#${i}`;
    if (!isStr(t?.term)) add('error', 'glossary.json', where, 'term がありません');
    if (!isStr(t?.reading)) add('error', 'glossary.json', where, 'reading（ひらがなの読み）がありません');
    else if (!/^[ぁ-ゟー・ー]+$/.test(t.reading)) add('warn', 'glossary.json', where, 'reading はひらがなで書いてください');
    if (!isStr(t?.def)) add('error', 'glossary.json', where, 'def がありません');
    for (const name of [t?.term, ...(t?.aliases || [])].filter(isStr)) {
      if (terms.has(name)) add('error', 'glossary.json', where, `用語・別名「${name}」が重複しています`);
      terms.add(name);
    }
  });

  // ---- エントリ ----
  const ids = new Map(); // id → ファイル名
  const all = [];
  for (const { name, entries } of input.entryFiles) {
    for (const [i, e] of asArray(entries, name, add).entries()) {
      const where = e?.id || `#${i}`;
      if (e?.id && ids.has(e.id)) add('error', name, where, `id が重複しています（${ids.get(e.id)} にもあります）`);
      if (e?.id) ids.set(e.id, name);
      all.push({ file: name, e, where });
    }
  }

  for (const { file, e, where } of all) {
    const err = (msg) => add('error', file, where, msg);
    const warn = (msg) => add('warn', file, where, msg);

    if (!isStr(e.id) || !ID_RE.test(e.id)) err('id は英小文字・数字・ハイフンで書いてください');
    if (!TOOL_IDS.includes(e.tool)) err(`tool が不正です：${e.tool}`);
    else if (!file.includes(e.tool + '.json')) warn(`tool（${e.tool}）とファイル名が一致しません`);
    if (!CAT_IDS.includes(e.category)) err(`category が固定リストにありません：${e.category}`);
    if (!isStr(e.title)) err('title がありません');
    if (!Array.isArray(e.intents) || e.intents.length < 1 || e.intents.length > 5) err('intents は1〜5件にしてください');
    else if (!e.intents.every(isStr)) err('intents に空の要素があります');
    if (!Array.isArray(e.keywords)) err('keywords は配列にしてください');
    if (!isStr(e.summary)) err('summary がありません');
    if (typeof e.details !== 'string') err('details がありません');
    if (!DANGERS.includes(e.danger)) err(`danger が不正です：${e.danger}`);
    if (typeof e.verified !== 'boolean') err('verified は true/false で書いてください');
    if (e.verified && !isStr(e.verifiedNote)) err('verified: true のときは verifiedNote（確認環境）を書いてください');
    if (e.danger && e.danger !== 'safe' && !isStr(e.dangerNote)) err('safe 以外のときは dangerNote を書いてください');
    if (e.danger === 'danger' && !isStr(e.undo)) err('danger のときは undo（元に戻す方法）を書いてください');
    if (e.docUrl != null && !/^https:\/\//.test(e.docUrl)) err('docUrl は https:// で始めてください');
    if (e.tags != null && (!Array.isArray(e.tags) || !e.tags.every(isStr))) err('tags は文字列の配列にしてください');
    if (e.since != null && !/^\d+\.\d+(\.\d+)?$/.test(e.since)) warn('since はバージョン番号だけを書いてください（例：2.23）');

    // 構文とプレースホルダ
    if (e.tool === 'github-web') {
      if (!Array.isArray(e.steps) || e.steps.length === 0) err('github-web には steps が必要です');
      if (e.syntax) warn('github-web で syntax が指定されています');
    } else if (!isStr(e.syntax)) {
      err('syntax がありません');
    }
    if (isStr(e.syntax)) {
      const keys = extractPlaceholderKeys(e.syntax);
      const defs = e.placeholders || [];
      for (const p of defs) {
        if (!isStr(p?.key) || !KEY_RE.test(p.key)) err(`placeholders の key が不正です：${p?.key}`);
        else if (!keys.includes(p.key)) err(`placeholders の <${p.key}> が syntax にありません`);
        if (!isStr(p?.label)) err(`placeholders <${p?.key}> に label がありません`);
        if (!isStr(p?.example)) warn(`placeholders <${p?.key}> に example がありません`);
      }
      for (const k of keys) if (!defs.some((p) => p?.key === k)) err(`syntax の <${k}> が placeholders に定義されていません`);
      if (e.options?.length && !e.syntax.includes('[options]')) err('options があるときは syntax に [options] を書いてください');
    }
    if (e.options != null) {
      if (!Array.isArray(e.options)) err('options は配列にしてください');
      else {
        const flags = e.options.map((o) => o?.flag);
        e.options.forEach((o) => {
          if (!isStr(o?.flag) || !isStr(o?.label)) err('options に flag / label のないものがあります');
          if (flags.filter((f) => f === o?.flag).length > 1) err(`options の flag が重複しています：${o?.flag}`);
          if (o?.value && (!isStr(o.value.label) || !isStr(o.value.example))) err(`options ${o.flag} の value に label / example がありません`);
          for (const c of o?.conflicts || []) if (!flags.includes(c)) err(`options ${o.flag} の conflicts に存在しない flag があります：${c}`);
        });
      }
    }

    // 使用例
    if (e.examples != null) {
      if (!Array.isArray(e.examples)) err('examples は配列にしてください');
      else e.examples.forEach((x, j) => (!isStr(x?.cmd) || !isStr(x?.desc)) && err(`examples[${j}] に cmd / desc がありません`));
    }

    // 関連
    for (const r of e.related || []) {
      if (r === e.id) warn('related に自分自身が入っています');
      else if (!ids.has(r)) err(`related のリンク切れ：${r}`);
    }

    // 用語
    const texts = RICH_FIELDS.map((k) => e[k]).concat(e.steps || [], (e.examples || []).map((x) => x?.desc));
    for (const t of texts.filter(isStr).flatMap(extractTerms)) {
      if (!terms.has(t)) err(`用語集にない [[${t}]] があります`);
    }

    // 図
    if (e.diagram != null) {
      for (const side of ['before', 'after']) {
        for (const m of checkDiagram(e.diagram?.[side])) err(`diagram.${side}: ${m}`);
      }
      if (e.diagram.note != null && !isStr(e.diagram.note)) err('diagram.note は文字列にしてください');
      for (const t of extractTerms(e.diagram.note)) if (!terms.has(t)) err(`用語集にない [[${t}]] があります`);
    }
  }

  // 用語集の related
  glossary.forEach((t) => {
    for (const r of t?.related || []) if (!ids.has(r)) add('error', 'glossary.json', t.term, `related のリンク切れ：${r}`);
    for (const x of extractTerms(t?.def)) if (!terms.has(x)) add('error', 'glossary.json', t.term, `用語集にない [[${x}]] があります`);
  });

  // ---- フローチャート ----
  const flowIds = new Set();
  asArray(input.flows, 'flows.json', add).forEach((f, i) => {
    const where = f?.id || `#${i}`;
    const err = (msg) => add('error', 'flows.json', where, msg);
    if (!isStr(f?.id) || !ID_RE.test(f.id)) err('id は英小文字・数字・ハイフンで書いてください');
    if (flowIds.has(f?.id)) err('flow の id が重複しています');
    flowIds.add(f?.id);
    if (!isStr(f?.title)) err('title がありません');
    const nodes = new Map();
    for (const n of f?.nodes || []) {
      if (!isStr(n?.id)) err('id のないノードがあります');
      else if (nodes.has(n.id)) err(`ノード id が重複しています：${n.id}`);
      else nodes.set(n.id, n);
    }
    if (!nodes.has(f?.start)) err(`start のノードがありません：${f?.start}`);
    for (const n of nodes.values()) {
      const isQ = 'question' in n;
      const isR = 'entryIds' in n;
      if (isQ === isR) {
        err(`ノード ${n.id} は質問ノード（question, choices）か結果ノード（entryIds, note）のどちらかにしてください`);
        continue;
      }
      if (isQ) {
        if (!Array.isArray(n.choices) || n.choices.length < 2) err(`ノード ${n.id} の choices は2件以上にしてください`);
        for (const c of n.choices || []) if (!nodes.has(c?.next)) err(`ノード ${n.id} の next のリンク切れ：${c?.next}`);
      } else {
        if (!isStr(n.note)) err(`結果ノード ${n.id} に note がありません`);
        for (const id of n.entryIds || []) if (!ids.has(id)) err(`結果ノード ${n.id} の entryIds のリンク切れ：${id}`);
        for (const x of extractTerms(n.note)) if (!terms.has(x)) err(`用語集にない [[${x}]] があります`);
      }
    }
    // 深さと到達できないノード
    if (nodes.has(f?.start)) {
      const depth = new Map([[f.start, 1]]);
      const queue = [f.start];
      while (queue.length) {
        const cur = nodes.get(queue.shift());
        for (const c of cur?.choices || []) {
          if (nodes.has(c.next) && !depth.has(c.next)) {
            depth.set(c.next, depth.get(cur.id) + 1);
            queue.push(c.next);
          }
        }
      }
      const max = Math.max(...depth.values());
      if (max > MAX_FLOW_DEPTH) add('warn', 'flows.json', where, `深さが ${max} 段あります（目安は ${MAX_FLOW_DEPTH} 段以内）`);
      for (const id of nodes.keys()) if (!depth.has(id)) add('warn', 'flows.json', where, `start から辿れないノードがあります：${id}`);
    }
  });

  // ---- クイズ ----
  const quizIds = new Set();
  asArray(input.quiz, 'quiz.json', add).forEach((q, i) => {
    const where = q?.id || `#${i}`;
    const err = (msg) => add('error', 'quiz.json', where, msg);
    if (!isStr(q?.id)) err('id がありません');
    else if (quizIds.has(q.id) || ids.has(q.id)) err('id がほかのクイズかエントリと重複しています');
    quizIds.add(q?.id);
    if (!isStr(q?.question)) err('question がありません');
    if (!Array.isArray(q?.choices) || q.choices.length !== 4) err('choices は4件にしてください');
    if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 3) err('answer は 0〜3 の添字にしてください');
    if (!TOOL_IDS.includes(q?.tool)) err(`tool が不正です：${q?.tool}`);
    if (!CAT_IDS.includes(q?.category)) err(`category が固定リストにありません：${q?.category}`);
    if (q?.entryId != null && !ids.has(q.entryId)) err(`entryId のリンク切れ：${q.entryId}`);
    if (typeof q?.verified !== 'boolean') err('verified は true/false で書いてください');
    else if (q.verified && q.entryId && all.find((x) => x.e.id === q.entryId)?.e.verified !== true) add('warn', 'quiz.json', where, 'verified: true ですが、関連エントリが未確認です');
  });

  // ---- シーン ----
  asArray(input.scenes, 'scenes.json', add).forEach((s, i) => {
    const where = s?.id || `#${i}`;
    if (!isStr(s?.title)) add('error', 'scenes.json', where, 'title がありません');
    for (const id of s?.entryIds || []) if (!ids.has(id)) add('error', 'scenes.json', where, `entryIds のリンク切れ：${id}`);
  });

  // ---- meta ----
  const byTool = {};
  for (const { e } of all) byTool[e.tool] = (byTool[e.tool] || 0) + 1;
  const actual = {
    ...Object.fromEntries(TOOL_IDS.map((t) => [t, byTool[t] || 0])),
    flows: (input.flows || []).length,
    glossary: glossary.length,
    quiz: (input.quiz || []).length,
    scenes: (input.scenes || []).length,
  };
  const meta = input.meta;
  if (meta) {
    if (!Number.isInteger(meta.schemaVersion)) add('error', 'meta.json', '', 'schemaVersion がありません');
    if (!isStr(meta.dataVersion)) add('error', 'meta.json', '', 'dataVersion がありません');
    for (const [k, v] of Object.entries(actual)) {
      if (meta.counts?.[k] !== v) add('warn', 'meta.json', '', `counts.${k} が実際の件数（${v}）と違います：${meta.counts?.[k]}`);
    }
  }

  // ---- 集計 ----
  const unverified = all.filter(({ e }) => e.verified !== true);
  const quizVerified = (input.quiz || []).filter((q) => q?.verified === true).length;
  const stats = {
    エントリ: all.length,
    確認済み: all.length - unverified.length,
    未確認: unverified.length,
    ...Object.fromEntries(TOOL_IDS.map((t) => [t, actual[t]])),
    用語: glossary.length,
    フロー: actual.flows,
    クイズ: actual.quiz,
    '出題できるクイズ（確認済み）': quizVerified,
    エラー: issues.filter((x) => x.level === 'error').length,
    警告: issues.filter((x) => x.level === 'warn').length,
  };
  for (const { file, e, where } of unverified) add('info', file, where, `未確認：${e.title ?? ''}`);
  return { issues, stats };
}

function isStr(v) {
  return typeof v === 'string' && v.trim() !== '';
}

function asArray(v, file, add) {
  if (v == null) return [];
  if (!Array.isArray(v)) {
    add('error', file, '', '最上位は配列にしてください');
    return [];
  }
  return v;
}

/**
 * ブランチ図の1状態を検査する。
 * @returns {string[]} エラーメッセージ
 */
export function checkDiagram(d) {
  const out = [];
  if (!d || !Array.isArray(d.commits)) return ['commits がありません'];
  const ids = new Set();
  for (const c of d.commits) {
    if (!isStr(c?.id)) out.push('id のないコミットがあります');
    else if (ids.has(c.id)) out.push(`コミット id が重複しています：${c.id}`);
    else {
      for (const p of c.parents || []) if (!ids.has(p)) out.push(`コミット ${c.id} の親 ${p} が、それより前に定義されていません`);
      ids.add(c.id);
    }
  }
  if (!d.branches || typeof d.branches !== 'object') out.push('branches がありません');
  else for (const [b, c] of Object.entries(d.branches)) if (!ids.has(c)) out.push(`ブランチ ${b} の指すコミットがありません：${c}`);
  if (!isStr(d.head)) out.push('head がありません');
  else if (!(d.branches && d.head in d.branches) && !ids.has(d.head)) out.push(`head がブランチ名にもコミットにもありません：${d.head}`);
  for (const x of d.highlight || []) if (!ids.has(x)) out.push(`highlight のコミットがありません：${x}`);
  return out;
}
