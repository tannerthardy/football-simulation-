// Adds an observation-only probe to src/physics/movement-preview.ts in the CURRENT checkout (use a scratch worktree):
//   node scripts/diag/preview-probe.mjs apply | revert
// The probe calls globalThis.__previewProbe?.begin/step/end around the unchanged loop. It reads, never writes.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/physics/movement-preview.ts', mode = process.argv[2];
if (mode === 'revert') { execFileSync('git', ['checkout', '--', file]); process.exit(0); }
if (mode !== 'apply') throw new Error('usage: apply | revert');
let s = readFileSync(file, 'utf8');
if (s.includes('__previewProbe')) throw new Error('already applied');
const need = (re) => { if (!re.test(s)) throw new Error(`anchor not found: ${re}`); };
need(/^  const samples: MovementSample\[\] = \[\];$/m); need(/^(\s*)world\.step\(\[/m); need(/^  return samples;$/m);
s = s.replace(/^  const samples: MovementSample\[\] = \[\];$/m, m =>
  `  const probe = (globalThis as any).__previewProbe;\n  probe?.begin(source, now, steps, typeof intent === 'function', handContact);\n${m}`);
s = s.replace(/^(\s*)(world\.step\(\[)/m, (m, ws, call) => `${ws}probe?.step();\n${ws}${call}`);
s = s.replace(/^  return samples;$/m, '  probe?.end();\n  return samples;');
writeFileSync(file, s);
