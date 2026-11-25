/** Is the speed roughness of our tracks real jitter of the body or an artifact of the 10 Hz export? Read-only tap on PlaySim.tick (no RNG draw, no behavior change).
 *   node --import tsx scripts/diag/body/sim_jitter.mts [--seed 101] [--games 2] [--out out/body/jitter.json]
 * The engine steps at DT = 0.05 s (20 Hz). For every player in every pass play from the snap to the release (or 4 s), every tick's position at full precision. Roughness operators (jitter.py's A: |s(k+1) - s(k)| / h on the forward speed, and B: the second difference), for players moving 2 yd/s or more with nobody within 1.5 yd, on
 *  - the native 20 Hz grid (h = 0.05 s);
 *  - the 10 Hz grid (every second tick, h = 0.1 s) at both phases, full precision and rounded to 0.01 yd (the export);
 *  - the 10 Hz grid from positions averaged over each pair of ticks (what a smoothing tracker would do).
 * If the 10 Hz even and odd phases agree and the rounded one equals the full-precision one, the export adds nothing; if the roughness at 20 Hz is much larger than at 10 Hz in the same units, the body has fast structure (a gait or a controller flip every tick) that the 10 Hz grid aliases. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '2')), out = arg('--out', 'out/body/jitter.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick0 = proto.tick;
interface Rec { X: number[][]; Y: number[][]; done: boolean; pos: string[] }
const recs = new Map<object, Rec | null>();
const plays: Rec[] = [];
proto.tick = function (this: any) {
  if (!recs.has(this)) {
    let r: Rec | null = null;
    if (!compilingPlan() && this.offCall?.kind === 'pass' && this.defCall && !this.offCall.pass?.screen) { r = { X: this.agents.map(() => []), Y: this.agents.map(() => []), done: false, pos: this.agents.map((a: any) => a.player?.position ?? '?') }; plays.push(r); }
    recs.set(this, r);
  }
  const rec = recs.get(this) as Rec | null;
  const res = tick0.call(this);
  if (rec && !rec.done) {
    try {
      if (this.t >= -1e-9) { this.agents.forEach((a: any, i: number) => { rec.X[i].push(a.pos.x - this.los); rec.Y[i].push(a.pos.y); }); }
      if (this.ball?.kind === 'air' || this.t > 4.0) rec.done = true;
    } catch { rec.done = true; }
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + g }); console.error(`game ${g + 1}/${games}: ${plays.length} plays`); }
type Series = { X: number[]; Y: number[] }[];
const ops: Record<string, number[][]> = {};
const add = (name: string, a: number, b: number) => { (ops[name] ??= [[], []])[0].push(a); ops[name][1].push(b); };
const rd = (v: number) => Math.round(v * 100) / 100;
function run(name: string, x: number[], y: number[], ok: boolean[], h: number) {
  const n = x.length; if (n < 8) return;
  const s: number[] = []; for (let k = 0; k < n - 1; k++) s.push(Math.hypot(x[k + 1] - x[k], y[k + 1] - y[k]) / h);
  for (let k = 1; k < s.length - 1; k++) {
    if (!(ok[k - 1] && ok[k] && ok[k + 1] && ok[k + 2]) || Math.min(s[k - 1], s[k], s[k + 1]) < 2) continue;
    add(name, Math.abs(s[k + 1] - s[k]) / h, Math.abs(s[k + 1] - 2 * s[k] + s[k - 1]) / h);
  }
}
for (const p of plays) {
  const n = p.X.length, F = p.X[0].length; if (F < 16) continue;
  for (let i = 0; i < n; i++) {
    // open movement: nobody within 1.5 yd at that tick
    const open: boolean[] = []; for (let k = 0; k < F; k++) { let m = 1e9; for (let j = 0; j < n; j++) if (j !== i) m = Math.min(m, Math.hypot(p.X[j][k] - p.X[i][k], p.Y[j][k] - p.Y[i][k])); open.push(m > 1.5); }
    const x = p.X[i], y = p.Y[i];
    run('20 Hz native', x, y, open, 0.05);
    for (const ph of [0, 1]) {
      const idx: number[] = []; for (let k = ph; k < F; k += 2) idx.push(k);
      const xs = idx.map(k => x[k]), ys = idx.map(k => y[k]), ok = idx.map(k => open[k]);
      run(`10 Hz phase ${ph}, full precision`, xs, ys, ok, 0.1);
      run(`10 Hz phase ${ph}, rounded 0.01 yd (the export)`, xs.map(rd), ys.map(rd), ok, 0.1);
    }
    const ax: number[] = [], ay: number[] = [], ok2: boolean[] = [];
    for (let k = 1; k < F; k += 2) { ax.push((x[k] + x[k - 1]) / 2); ay.push((y[k] + y[k - 1]) / 2); ok2.push(open[k] && open[k - 1]); }
    run('10 Hz from tick-pair means, rounded', ax.map(rd), ay.map(rd), ok2, 0.1);
  }
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };
const rows = Object.entries(ops).map(([k, [A, B]]) => ({ operator: k, n: A.length, A: [q(A, 50), q(A, 90)], B: [q(B, 50), q(B, 90)] }));
console.log('| grid | n | A p50 / p90 (yd/s2) | B p50 / p90 (yd/s2) |\n|---|---|---|---|');
for (const r of rows) console.log(`| ${r.operator} | ${r.n} | ${r.A[0].toFixed(2)} / ${r.A[1].toFixed(2)} | ${r.B[0].toFixed(2)} / ${r.B[1].toFixed(2)} |`);
writeFileSync(out, JSON.stringify(rows));
