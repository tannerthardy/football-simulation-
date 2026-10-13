/** Resolution check for held (loaded) recovery, on the physics session's two
 * witnesses: rear 180 deg at 6 yd/s (center hands) and angled 45 deg at 8 yd/s
 * (patch), seed 3001, both mirrors. Each runs natively at 12/24/48/96 substeps
 * per 0.05 s tick; every tick records carrier and tackler position, capture
 * deviation, support state and the live grasp. Prints, against 96 substeps,
 * the first tick where carrier position differs by > 0.01 yd or deviation by
 * > 0.002 yd, the largest end-of-run position gap, and each run's ending.
 * Native runs (controllers decide each run), so differences compound; the
 * first divergence is the useful marker. Observation only.
 * node --import tsx scripts/diag/physics/loaded-refinement.ts
 */
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { rep, type Cell } from '../tackle/panel.js';

type Row = { t: number; cx: number; cy: number; cxi: number; cstate: string; dx: number; dy: number; dxi: number; dstate: string; grip: number };
let current: Row[] = [];
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: PlaySim & Record<string, any>) {
  original.call(this);
  const c = this.slot('RB') as Agent, d = this.defense.find((a: Agent) => a.slot === 'MLB' || a.slot.startsWith('LB')) as Agent;
  const xi = (a: Agent) => a.body.support ? Math.hypot(a.body.support.xi.x, a.body.support.xi.y) : NaN;
  const g = this.world.joints.find((j: any) => j.kind === 'grasp' && j.b === c.body && !j.broken) as any;
  current.push({ t: +this.t.toFixed(4), cx: c.pos.x, cy: c.pos.y, cxi: xi(c), cstate: c.body.support?.state ?? '?', dx: d.pos.x, dy: d.pos.y, dxi: xi(d), dstate: d.body.support?.state ?? '?', grip: g ? (g.force ?? 0) : -1 });
};
const CASES: { name: string; cell: Cell; mode: 'center' | 'patch' }[] = [
  { name: 'rear 180/6 center', cell: { angle: 180, speed: 6, cut: false, difficulty: 'difficult' }, mode: 'center' },
  { name: 'angled 45/8 patch', cell: { angle: 45, speed: 8, cut: false, difficulty: 'difficult' }, mode: 'patch' },
];
const STEPS = (process.env.STEPS ?? '12,24,48,96').split(',').map(Number);
for (const c of CASES) for (const side of [1, -1] as const) {
  const runs = new Map<number, { rows: Row[]; ending: string; after: number | null }>();
  for (const n of STEPS) {
    current = [];
    const r = rep(c.cell, side, 3001, { handContact: c.mode, substeps: n });
    runs.set(n, { rows: current, ending: `${r.ending}/${r.endWhy}${r.carrierState === 'down' ? ' (fell)' : ''}`, after: r.afterContact });
  }
  const ref = runs.get(STEPS[STEPS.length - 1])!;
  console.log(`\n== ${c.name} side ${side}: finest ${STEPS[STEPS.length - 1]} -> ${ref.ending}, after contact ${ref.after?.toFixed(2)} yd`);
  for (const n of STEPS.slice(0, -1)) {
    const run = runs.get(n)!;
    let firstPos = '', firstXi = '', maxGap = 0;
    for (let k = 0; k < Math.min(run.rows.length, ref.rows.length); k++) {
      const a = run.rows[k], b = ref.rows[k];
      const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy);
      maxGap = Math.max(maxGap, gap);
      if (!firstPos && gap > .01) firstPos = `${a.t.toFixed(2)}s (${gap.toFixed(3)})`;
      if (!firstXi && a.cstate === 'up' && b.cstate === 'up' && Math.abs(a.cxi - b.cxi) > .002) firstXi = `${a.t.toFixed(2)}s (${a.cxi.toFixed(3)} vs ${b.cxi.toFixed(3)}, grip ${a.grip.toFixed(0)} vs ${b.grip.toFixed(0)})`;
    }
    console.log(`  ${String(n).padStart(2)} steps: ${run.ending.padEnd(34)} after ${run.after?.toFixed(2) ?? '-'} yd | first carrier pos gap ${firstPos || 'none'} | first deviation gap ${firstXi || 'none'} | max pos gap ${maxGap.toFixed(2)} yd`);
  }
}
