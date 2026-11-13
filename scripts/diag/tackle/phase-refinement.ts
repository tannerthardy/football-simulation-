/** Reconstruct only the missing phase experiment, reusing one frozen tape.
 * node --import tsx scripts/diag/tackle/phase-refinement.ts --out out/phase-recovery
 * Subsequent runs reuse inputs.json.gz in --out; --variants/--steps reduce work.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { CASES, digest, native, PIN, replay } from './grip-refinement.js';
import { sourceVersion } from '../../source-version.js';

const arg = (name: string, fallback: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const out = arg('--out', 'out/phase-recovery');
const steps = arg('--steps', '12,24,48,96,15,35').split(',').map(Number);
const variants = arg('--variants', 'full,phase,phase-timing').split(',');
if(steps.some(n=>!Number.isInteger(n)||n<=0))throw Error('Substeps must be positive integers');
if(variants.some(v=>!['full','phase','phase-timing','phase-source','continued-recovery'].includes(v)))throw Error('Unknown experiment');
mkdirSync(out, { recursive: true });
const encode = (v: unknown) => JSON.stringify(v, (_k, x) => typeof x === 'number' && !Number.isFinite(x)
  ? { nonfinite: String(x) } : x);
const save = (file: string, data: unknown) => {
  const bytes = gzipSync(encode(data), { level: 1 });
  writeFileSync(join(out, file), bytes);
  return { file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
};
const inputPath = arg('--inputs', join(out, 'inputs.json.gz'));
const source = sourceVersion();
if(source!==PIN)throw Error(`Pinned physics source mismatch: ${source}`);
const inputs = existsSync(inputPath)
  ? JSON.parse(gunzipSync(readFileSync(inputPath)).toString(), (_k, v) => v?.nonfinite ? Number(v.nonfinite) : v)
  : { source, provenance: 'Reconstructed from f8ba412; prior uncommitted experiment and traces absent.', cases: CASES.flatMap(c => [1, -1].map(side => {
    const cell = { angle: c.angle, speed: c.speed, cut: false, difficulty: 'difficult' as const };
    const capture = native(cell, c.mode, side as 1 | -1, 96);
    const control = native(cell, c.mode, side as 1 | -1, 96, false);
    if (capture.endpoint !== control.endpoint || capture.decisions !== control.decisions) throw Error('Observer changed execution');
    return { ...c, side, frames: capture.frames, endpoint: capture.endpoint, decisions: capture.decisions, result: capture.result };
  })) };
if (inputs.source !== source) throw Error('Frozen input source mismatch');
if (!existsSync(join(out,'inputs.json.gz'))) save('inputs.json.gz', inputs);
const receipt: any = { source, provenance: inputs.provenance, inputDigest: digest(inputs), steps, variants,
  collectors: ['grip-refinement.ts', 'recovery-phase.ts', 'phase-refinement.ts', 'continued-recovery.ts', 'continued-recovery-world.ts'].map(file => ({ file,
    sha256: createHash('sha256').update(readFileSync(join('scripts/diag/tackle', file))).digest('hex') })), runs: [] };
for (const c of inputs.cases) for (const variant of variants) for (const n of steps) {
  let result;
  try { result = replay(c.frames, c.mode, n, variant, true); }
  catch (error) {
    const failure = { message: String(error), ...(error as any).diagnostic };
    const file = save(`${c.mode}-${c.side}-${variant}-${n}-failure.json.gz`, failure);
    receipt.runs.push({ mode:c.mode,side:c.side,n,variant,...file,status:'failed',message:String(error) });
    console.log(JSON.stringify({mode:c.mode,side:c.side,n,variant,status:'failed',message:String(error).slice(0,170)}));
    continue;
  }
  const file = save(`${c.mode}-${c.side}-${variant}-${n}.json.gz`, result);
  const errors = result.reports.flatMap((r: any) => r.armWork.map((v: number, k: number) => v - r.armLimit[k]));
  receipt.runs.push({ mode: c.mode, side: c.side, n, variant, ...file, initial: result.initial, decisions: result.decisions,
    maxWorkResidual: Math.max(...result.reports.map((r: any) => Math.abs(r.work.residual))),
    maxArmExcess: Math.max(...errors), maxSupportExcess: Math.max(...result.reports.flatMap((r: any) => r.supportWork.map((v: number, k: number) => v - r.supportLimit[k]))),
    final: result.reports.at(-1).poses });
  console.log(JSON.stringify({ mode: c.mode, side: c.side, n, variant, file: file.file }));
}
if (sourceVersion() !== source) throw Error('Production changed while collecting');
save(`manifest-${variants.join('-')}.json.gz`, receipt);
if (receipt.runs.some((r: any) => r.status === 'failed')) process.exitCode=1;
