// 開発用：Node.js で検証を実行する。 node tools/validate-cli.mjs
// 出力は validate.html と同じ。エラーがあれば終了コード 1。

import { readFile } from 'node:fs/promises';
import { validateAll } from './validate-core.js';

const root = new URL('../data/', import.meta.url);
const loadErrors = [];
async function get(p) {
  try {
    return JSON.parse(await readFile(new URL(p, root), 'utf8'));
  } catch {
    loadErrors.push(p);
    return null;
  }
}

const meta = await get('meta.json');
const files = meta?.entryFiles ?? ['entries/git.json', 'entries/gh.json', 'entries/github-web.json'];
const entryFiles = await Promise.all(files.map(async (name) => ({ name, entries: (await get(name)) ?? [] })));
const [flows, glossary, quiz, scenes] = await Promise.all(['flows.json', 'glossary.json', 'quiz.json', 'scenes.json'].map(get));

const { issues, stats } = validateAll({ meta, entryFiles, flows, glossary, quiz, scenes, loadErrors });
const showInfo = process.argv.includes('--info');
for (const x of issues) {
  if (x.level === 'info' && !showInfo) continue;
  console.log(`[${x.level}] ${x.file} ${x.id}: ${x.msg}`);
}
console.log(Object.entries(stats).map(([k, v]) => `${k}=${v}`).join(' '));
process.exit(stats['エラー'] ? 1 : 0);
