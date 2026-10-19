/** Block reps of front-seven defenders after the carrier crosses the line
 * (observation only): how each rep ended (run-contact observer reasons) and
 * how often a new rep on the same defender started within one tick, by
 * whom and from where (blocker in front of him, at his side, behind his back).
 * node --import tsx scripts/diag/stretch/relatch.ts [--group DL|LB] [--seeds 77,71001] */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const SLOTS = arg('--group', 'DL') === 'LB' ? ['LB_S', 'LB_W', 'LB_M', 'LB_SI', 'LB_WI'] : ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];
const R = rosters();
const reasons: Record<string, number> = {}, again: Record<string, number> = {};
let plays = 0;
for (const concept of arg('--concepts', 'iz,oz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    const up = sim.attackDir('O');
    let cross = -1;
    plays++;
    const last = new Map<unknown, { t: number; b: unknown; why: string }>();
    runContactObservers.set(sim, (e, kind, data) => {
      if (kind !== 'end' || cross < 0 || !SLOTS.includes(e.defender.slot)) return;
      last.set(e.defender, { t: sim.t, b: e.blocker, why: String((data as { reason?: string }).reason) });
      reasons[String((data as { reason?: string }).reason)] = (reasons[String((data as { reason?: string }).reason)] ?? 0) + 1;
    });
    const prev = new Map<unknown, unknown>();
    while (sim.phase === 'live' && sim.t < 10) {
      sim.tick();
      const c = sim.carrier;
      if (cross < 0 && c && c.team === 'O' && sim.handoffAt >= 0 && (c.pos.x - sim.los) * up > 0) cross = sim.t;
      if (cross < 0) continue;
      for (const d of sim.defense) {
        if (!SLOTS.includes(d.slot)) continue;
        const e = d.engagement, l = last.get(d);
        if (e && prev.get(d) !== e && l && sim.t - l.t < sim.dt * 2.1) {
          const toB = Math.atan2(e.blocker.pos.y - d.pos.y, e.blocker.pos.x - d.pos.x);
          const off = Math.abs(Math.atan2(Math.sin(toB - d.facing), Math.cos(toB - d.facing))) * 180 / Math.PI;
          const key = `${e.blocker === l.b ? 'same' : 'other'} blocker after '${l.why}', blocker ${off > 120 ? 'behind his back' : off > 60 ? 'at his side' : 'in front'}`;
          again[key] = (again[key] ?? 0) + 1;
        }
        prev.set(d, e);
      }
    }
  }
console.log(`plays ${plays}, ${arg('--group', 'DL')} reps ended after the crossing:`, reasons);
for (const [k, v] of Object.entries(again).sort((a, b) => b[1] - a[1])) console.log(`  re-engaged within a tick: ${v} ${k}`);
