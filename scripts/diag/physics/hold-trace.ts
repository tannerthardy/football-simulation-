/** Per-tick trace of one tackle-panel rep at two resolutions, side by side:
 * carrier and holder speed, capture deviation, support state, grasp force,
 * tackle intents. For finding where a coarse hold diverges from a fine one.
 * node --import tsx scripts/diag/physics/hold-trace.ts angle speed cut(0|1) seed [coarse=12] [fine=64] [mode=center] [every=2] [--stay-down-hook]
 */
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { rep } from '../tackle/panel.js';

const a = process.argv.slice(2).filter((x) => x !== '--stay-down-hook');
if (process.argv.includes('--stay-down-hook')) await import('../tackle/stay-down-hook.js');
const [angle, speed, cut, seed] = [Number(a[0]), Number(a[1]), a[2] === '1', Number(a[3])];
const coarse = Number(a[4] ?? 12), fine = Number(a[5] ?? 64), mode = (a[6] ?? 'center') as 'center' | 'patch', every = Number(a[7] ?? 2);
const [t0, t1] = (process.env.WINDOW ?? '0,99').split(',').map(Number);
type Row = Record<string, number | string>;
let rows: Row[] = [];
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: PlaySim & Record<string, any>) {
  original.call(this);
  const c = this.slot('RB') as Agent, d = this.defense.find((x: Agent) => x.slot === 'MLB' || x.slot.startsWith('LB')) as Agent;
  const xi = (x: Agent) => x.body.support ? Math.hypot(x.body.support.xi.x, x.body.support.xi.y) : NaN;
  const g = this.world.joints.find((j: any) => j.kind === 'grasp' && j.b === c.body && !j.broken) as any;
  const di = this.intents?.[d.idx] ?? (this as any).lastIntents?.[d.idx];
  rows.push({ t: this.t, cv: Math.hypot(c.vel.x, c.vel.y), cxi: xi(c), cs: c.body.support?.state ?? '?',
    dv: Math.hypot(d.vel.x, d.vel.y), dxi: xi(d), ds: d.body.support?.state ?? '?',
    gf: g ? g.force ?? 0 : -1, gl: g ? g.legs ?? 0 : -1, cap: g ? (this.world as any).gripCapacity(g) : 0, dist: Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y),
    dive: di?.dive ? 1 : 0, stall: (this as any).bond?.stalled ?? -1 });
};
const run = (n: number) => { rows = []; const r = rep({ angle, speed, cut, difficulty: 'difficult' }, 1, seed, { handContact: mode, substeps: n || undefined }); return { rows, r }; };
const A = run(coarse), B = run(fine);
console.log(`${angle}/${speed}${cut ? ' cut' : ''} seed ${seed} ${mode}: ${coarse} -> ${A.r.ending}${A.r.carrierState === 'down' ? '(fell)' : ''}, ${fine} -> ${B.r.ending}${B.r.carrierState === 'down' ? '(fell)' : ''}`);
const f = (v: number | string, w = 6, p = 2) => typeof v === 'number' ? v.toFixed(p).padStart(w) : String(v).padStart(w);
console.log('     t |   carrier v   xi  st |   holder v   xi  st |  grasp F  cap   legs slip%  dist stall');
// Slipping time this tick, from the leg-slide law dl = (1 - l)(1 - exp(-T / 0.3)).
const slip = (R: Row[], i: number) => i && R[i - 1] && (R[i - 1].gl as number) >= 0 && (R[i].gl as number) >= 0 ? -0.3 * Math.log(Math.max(1e-9, (1 - (R[i].gl as number)) / (1 - (R[i - 1].gl as number)))) / 0.05 * 100 : NaN;
for (let i = 0; i < Math.max(A.rows.length, B.rows.length); i += every) for (const [lab, R] of [[coarse, A.rows], [fine, B.rows]] as const) {
  const r = R[i]; if (!r || (r.gf as number) < 0 && i % (every * 5) || (r.t as number) < t0 - 1e-6 || (r.t as number) > t1 + 1e-6) continue;
  console.log(`${f(r.t, 6)} ${String(lab).padStart(3)} | ${f(r.cv)} ${f(r.cxi, 5, 3)} ${f(r.cs, 4)} | ${f(r.dv)} ${f(r.dxi, 5, 3)} ${f(r.ds, 4)} | ${f(r.gf, 7, 0)} ${f(r.cap as number, 5, 0)} ${f(r.gl, 6, 3)} ${f(slip(R, i), 5, 0)} ${f(r.dist, 5)} ${f(r.stall as number, 5)}`);
}
