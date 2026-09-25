// フローチャートの経路の検証（DOM に依存しない）。

/**
 * パスを検証し、正しくつながっている部分までを返す。
 * @param {import('../types.js').Flow} flow
 * @param {string[]} ids
 */
export function validPath(flow, ids) {
  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  const out = [flow.start];
  for (const id of ids.slice(ids[0] === flow.start ? 1 : 0)) {
    const cur = nodes.get(out[out.length - 1]);
    if (!cur?.choices?.some((c) => c.next === id)) break;
    out.push(id);
  }
  return out;
}
