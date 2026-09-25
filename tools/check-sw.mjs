// 開発用：sw.js の SHELL（キャッシュするファイル一覧）に漏れや余分がないか確認する。
//   node tools/check-sw.mjs
// js/・css/・icons/ の全ファイルと、ルートの index.html・manifest.json・count.js が対象。

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sw = await readFile(join(root, 'sw.js'), 'utf8');
const block = sw.slice(sw.indexOf('const SHELL = ['), sw.indexOf('];', sw.indexOf('const SHELL = [')));
const listed = new Set([...block.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean));

async function walk(dir) {
  const out = [];
  for (const name of await readdir(join(root, dir))) {
    const p = join(dir, name);
    if ((await stat(join(root, p))).isDirectory()) out.push(...(await walk(p)));
    else out.push(relative('.', p).replaceAll('\\', '/'));
  }
  return out;
}

const expected = new Set(['index.html', 'manifest.json', 'count.js', ...(await walk('js')), ...(await walk('css')), ...(await walk('icons'))]);
const missing = [...expected].filter((f) => !listed.has(f));
const extra = [...listed].filter((f) => !expected.has(f));

for (const f of missing) console.log(`[漏れ] sw.js の SHELL にありません：${f}`);
for (const f of extra) console.log(`[余分] 存在しないファイルです：${f}`);
const version = sw.match(/const VERSION = '([^']+)'/)?.[1];
console.log(`VERSION=${version} 一覧=${listed.size} 件 漏れ=${missing.length} 余分=${extra.length}`);
process.exit(missing.length || extra.length ? 1 : 0);
