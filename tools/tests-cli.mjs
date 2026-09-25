// 開発用：Node.js で簡易テストを実行する。 node tools/tests-cli.mjs
import { runTests } from './tests.js';

const results = runTests();
for (const r of results) console.log(`${r.ok ? 'ok  ' : 'NG  '} ${r.name}${r.detail ? '  ' + r.detail : ''}`);
const ng = results.filter((r) => !r.ok).length;
console.log(`${results.length - ng}/${results.length} 件成功`);
process.exit(ng ? 1 : 0);
