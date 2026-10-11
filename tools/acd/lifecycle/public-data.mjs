import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
// Reuse the actual public data projection, including all future approved additions.
// TypeScript is already a locked development dependency; no private tooling import.
export function publicModules(root = process.cwd(), lifecycleState) {
  const require = createRequire(path.join(root, 'package.json')), ts = require('typescript'), cache = new Map();
  function load(file) {
    if (!path.extname(file)) file += '.ts';
    if (file.endsWith('job-lifecycle.json') && lifecycleState) return lifecycleState;
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} }; cache.set(file, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    }}).outputText;
    const req = name => name.startsWith('@/') ? load(path.join(root, 'src', name.slice(2))) :
      name.startsWith('.') ? load(path.resolve(path.dirname(file), name)) : require(name);
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: file })(req,loadedModule,loadedModule.exports);
    return loadedModule.exports;
  }
  return { records: load(path.join(root,'src/data/opportunities.ts')).OPPORTUNITIES,
    snapshot: load(path.join(root,'src/lib/production-freshness.ts')).productionFreshness };
}
