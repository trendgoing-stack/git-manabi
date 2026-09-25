// ブランチ図のレンダラー。{ commits, branches, head, highlight } から SVG を作る。
// 時間は左→右、ブランチごとにレーン（段）を分ける。配色はすべて CSS 変数（css/views.css）。

const NS = 'http://www.w3.org/2000/svg';
const COL_W = 56; // 列の間隔
const LANE_H = 52; // レーンの間隔
const R = 13; // コミットの円の半径
const PAD_X = 24;
const PAD_Y = 22;
const LABEL_H = 22;
const LANE_COLORS = 5;

/**
 * @typedef {Object} LaidCommit
 * @property {import('./types.js').DiagCommit} c
 * @property {number} lane
 * @property {number} col
 * @property {boolean} ghost
 */

/**
 * 各コミットのレーンと列を決める（DOM に依存しない）。
 * - ブランチをキー順に見て、先端から最初の親をたどり、まだ決まっていないコミットをそのレーンにする
 * - ghost のコミットは最下段の「外れたコミット」レーンにまとめる
 * - どちらでもないコミット（detached HEAD など）は最初の親のレーンにする
 * - 列は「親の列の最大 + 1」。同じレーン・同じ列がふさがっていれば右にずらす
 * @param {import('./types.js').DiagState} state
 * @returns {{commits: LaidCommit[], laneCount: number, lanes: string[], ghostLane: number, colCount: number}}
 */
export function layout(state) {
  const byId = new Map(state.commits.map((c) => [c.id, c]));
  const lanes = Object.keys(state.branches);
  const laneOf = new Map();

  lanes.forEach((name, i) => {
    let cur = byId.get(state.branches[name]);
    while (cur && !laneOf.has(cur.id)) {
      laneOf.set(cur.id, i);
      cur = byId.get(cur.parents?.[0]);
    }
  });

  const hasGhost = state.commits.some((c) => c.ghost);
  const ghostLane = hasGhost ? lanes.length : -1;
  for (const c of state.commits) {
    if (laneOf.has(c.id)) continue;
    if (c.ghost) laneOf.set(c.id, ghostLane);
    else laneOf.set(c.id, laneOf.get(c.parents?.[0]) ?? 0);
  }

  const colOf = new Map();
  const used = new Set();
  for (const c of state.commits) {
    let col = Math.max(-1, ...(c.parents || []).map((p) => colOf.get(p) ?? -1)) + 1;
    const lane = laneOf.get(c.id);
    while (used.has(`${lane}:${col}`)) col++;
    used.add(`${lane}:${col}`);
    colOf.set(c.id, col);
  }

  return {
    commits: state.commits.map((c) => ({ c, lane: laneOf.get(c.id), col: colOf.get(c.id), ghost: !!c.ghost })),
    laneCount: lanes.length + (hasGhost ? 1 : 0),
    lanes,
    ghostLane,
    colCount: Math.max(0, ...colOf.values()) + 1,
  };
}

/**
 * 図の内容を文章で説明する（スクリーンリーダー用）。
 * @param {import('./types.js').DiagState} state
 */
export function describe(state) {
  const label = (id) => state.commits.find((c) => c.id === id)?.label ?? id;
  const parts = Object.entries(state.branches).map(([b, c]) => `${b} は ${label(c)} を指す`);
  parts.push(state.head in state.branches ? `HEAD は ${state.head}` : `HEAD は ${label(state.head)} を直接指す`);
  const ghosts = state.commits.filter((c) => c.ghost).map((c) => c.label ?? c.id);
  if (ghosts.length) parts.push(`${ghosts.join('、')} はどのブランチからも辿れない`);
  return parts.join('。') + '。';
}

function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text != null) e.textContent = text;
  return e;
}

/** 文字列のおおよその幅（等幅フォント前提） */
function textWidth(s) {
  let w = 0;
  for (const ch of s) w += /[\u0000-ÿ]/.test(ch) ? 7.4 : 13;
  return w;
}

/**
 * @param {import('./types.js').DiagState} state
 * @param {string} caption  図の見出し（「実行前」など）
 * @returns {SVGSVGElement}
 */
export function renderDiagram(state, caption) {
  const L = layout(state);
  const x = (col) => PAD_X + col * COL_W;
  const y = (lane) => PAD_Y + LABEL_H + lane * LANE_H;
  const pos = new Map(L.commits.map((k) => [k.c.id, k]));
  const laneClass = (lane) => (lane === L.ghostLane ? 'dg-ghost' : `dg-lane-${lane % LANE_COLORS}`);
  const highlight = new Set(state.highlight || []);

  // ラベル（ブランチ名と HEAD）はコミットの上に横並びで置く
  /** @type {Map<string, {text: string, cls: string}[]>} */
  const labels = new Map();
  for (const [b, c] of Object.entries(state.branches)) {
    const list = labels.get(c) || [];
    const isHead = state.head === b;
    list.push({ text: isHead ? `HEAD→${b}` : b, cls: `dg-tag ${laneClass(L.lanes.indexOf(b))}${isHead ? ' dg-tag-head' : ''}` });
    labels.set(c, list);
  }
  if (!(state.head in state.branches)) {
    const list = labels.get(state.head) || [];
    list.unshift({ text: 'HEAD', cls: 'dg-tag dg-tag-head dg-tag-detached' });
    labels.set(state.head, list);
  }

  let maxX = x(L.colCount - 1) + R + PAD_X;
  const tagEls = [];
  for (const [id, list] of labels) {
    const k = pos.get(id);
    if (!k) continue;
    let tx = x(k.col) - R;
    const ty = y(k.lane) - R - LABEL_H + 2;
    for (const t of list) {
      const w = textWidth(t.text) + 12;
      const g = el('g', { class: t.cls });
      g.append(el('rect', { x: tx, y: ty, width: w, height: LABEL_H - 5, rx: 4 }), el('text', { x: tx + 6, y: ty + LABEL_H - 10 }, t.text));
      tagEls.push(g);
      tx += w + 4;
    }
    maxX = Math.max(maxX, tx + PAD_X);
  }

  const width = Math.ceil(maxX);
  const height = y(L.laneCount - 1) + R + PAD_Y;
  const svg = el('svg', {
    class: 'diagram-svg',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    role: 'img',
    'aria-label': `${caption}：${describe(state)}`,
  });

  // 外れたコミットのレーンの目印
  if (L.ghostLane >= 0) {
    svg.append(el('text', { x: 4, y: y(L.ghostLane) + R + 12, class: 'dg-ghost-caption' }, 'どのブランチからも辿れないコミット'));
  }

  // 線（親 → 子）
  for (const k of L.commits) {
    (k.c.parents || []).forEach((pid, i) => {
      const p = pos.get(pid);
      if (!p) return;
      const x1 = x(p.col) + R;
      const y1 = y(p.lane);
      const x2 = x(k.col) - R;
      const y2 = y(k.lane);
      const d = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${x1 + COL_W / 2},${y1} ${x2 - COL_W / 2},${y2} ${x2},${y2}`;
      const cls = `dg-edge ${laneClass(k.ghost ? L.ghostLane : i > 0 ? p.lane : k.lane)}${k.ghost ? ' is-ghost' : ''}`;
      svg.append(el('path', { d, class: cls }));
    });
  }

  // コミット
  for (const k of L.commits) {
    const g = el('g', { class: `dg-commit ${laneClass(k.lane)}${k.ghost ? ' is-ghost' : ''}${highlight.has(k.c.id) ? ' is-highlight' : ''}` });
    if (highlight.has(k.c.id)) g.append(el('circle', { cx: x(k.col), cy: y(k.lane), r: R + 5, class: 'dg-halo' }));
    g.append(el('circle', { cx: x(k.col), cy: y(k.lane), r: R }), el('text', { x: x(k.col), y: y(k.lane) + 4.5, 'text-anchor': 'middle' }, k.c.label ?? k.c.id));
    svg.append(g);
  }
  svg.append(...tagEls);
  return /** @type {SVGSVGElement} */ (svg);
}
