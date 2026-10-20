// Wrap every `return EXPR;` in the given files with a global tag call that
// records file.function@line (observation-only instrumentation, for a scratch
// copy made by instrument.sh; never run it on the working tree).
// usage: node scripts/diag/stretch/tagreturns.mjs FILE.ts ...
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const ts = require('typescript');
for (const file of process.argv.slice(2)) {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];
  const base = file.split('/').pop().replace('.ts', '');
  const visit = (n) => {
    if (ts.isReturnStatement(n) && n.expression) {
      const e = n.expression, line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
      // the enclosing function name
      let f = n.parent, name = '?';
      while (f && !ts.isFunctionLike(f)) f = f.parent;
      if (f) { if (f.name) name = f.name.getText(); else if (f.parent && ts.isVariableDeclaration(f.parent)) name = f.parent.name.getText(); else if (f.parent && ts.isPropertyAssignment(f.parent)) name = f.parent.name.getText(); }
      edits.push([e.getStart(), e.end, `(globalThis as any).__tag(${JSON.stringify(`${base}.${name}@${line}`)}, (`, `))`]);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const ins = edits.flatMap(([s, e, pre, post]) => [[s, pre], [e, post]]).sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [p, str] of ins) out = out.slice(0, p) + str + out.slice(p);
  writeFileSync(file, out);
  console.log(file, edits.length);
}
