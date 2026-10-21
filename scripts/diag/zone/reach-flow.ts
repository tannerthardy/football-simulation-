/** Who limits the play-side line's lateral flow on stretch runs? For the
 * play-side guard, tackle and inline end on the lab's outside/wide zone
 * cases, per 0.5 s window from the snap: share of ticks in each state (free,
 * solo reach by read phase, double team, climbing/second level), and the
 * play-side lateral velocity requested (final intent) and achieved. NFL
 * reference flow is in scripts/diag/align/meshwidth.py. Observation only.
 * node --import tsx scripts/diag/zone/reach-flow.ts [concepts=oz,wz] [seeds=77,1,2]
 */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
import { playSideSign, RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';

const concepts = (process.argv[2] ?? 'oz,wz').split(',');
const seeds = (process.argv[3] ?? '77,1,2').split(',').map(Number);
const R = rosters();
const W = [0.5, 1.0, 1.5, 2.0, 2.5];
type Acc = { n: number; req: number; ach: number };
const acc = new Map<string, Acc>(), totals = new Map<string, number>();
const add = (k: string, req: number, ach: number) => {
  const a = acc.get(k) ?? { n: 0, req: 0, ach: 0 }; a.n++; a.req += req; a.ach += ach; acc.set(k, a);
};
const disp = new Map<string, number[]>();
for (const concept of concepts) for (const [lk] of LOOK_SPECS) for (const roster of Object.keys(R)) for (const seed of seeds) {
  const sim = makeSim({ concept, dir: 'strong', formation: 'ace_12', look: lk, roster, seed }, R);
  const run = sim.offCall.run!, ps = playSideSign(sim, run);
  const slots = new Set(ps > 0 ? ['RG', 'RT'] : ['LG', 'LT']);
  const men = sim.offense.filter((a) => slots.has(a.slot) || (sim.offAlign.spots[a.slot]?.inline && (a.pos.y - sim.ballY) * ps > 0));
  const y0 = new Map(men.map((a) => [a, a.pos.y]));
  while (sim.phase === 'live' && sim.t < 2.5) {
    (sim as unknown as { tick(): void }).tick();
    const w = W.find((x) => sim.t <= x + 1e-9); if (w === undefined) break;
    for (const a of men) {
      const b = a.behavior; if (!(b instanceof RunBlocker)) continue;
      const req = (sim as any).intents[a.idx]?.vel; if (!req) continue;
      const e = a.engagement, read = (b as any).zoneRead;
      const role = a.slot.endsWith('G') ? 'G' : a.slot.endsWith('T') ? 'T' : 'E';
      const state = !e ? (b.plan.kind === 'climb' || b.plan.combination?.released ? 'free-2nd' : 'free')
        : e.blocker !== a ? 'helping' : e.helpers.length ? 'double'
        : /^(LB|CB|S|FS|SS)/.test(e.defender.slot) ? 'on-LB'
        : `solo-${read && read.target === e.defender.idx ? read.phase : 'other'}`;
      const k = `${concept} ${role} <=${w.toFixed(1)} ${state}`;
      add(k, req.y * ps, a.vel.y * ps);
      totals.set(`${concept} ${role} <=${w.toFixed(1)}`, (totals.get(`${concept} ${role} <=${w.toFixed(1)}`) ?? 0) + 1);
    }
    if (Math.abs(sim.t - 1.65) < sim.dt / 2 || Math.abs(sim.t - 2.35) < sim.dt / 2)
      for (const a of men) {
        const role = a.slot.endsWith('G') ? 'G' : a.slot.endsWith('T') ? 'T' : 'E';
        const k = `${concept} ${role} lateral at ${sim.t.toFixed(2)}s`;
        disp.set(k, [...(disp.get(k) ?? []), (a.pos.y - y0.get(a)!) * ps]);
      }
  }
}
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log('play-side lateral velocity, yd/s: requested / achieved; share = ticks in state / ticks in window');
for (const [k, a] of [...acc].sort((p, q) => p[0].localeCompare(q[0]))) {
  const tot = totals.get(k.split(' ').slice(0, 3).join(' '))!;
  if (a.n / tot < .05) continue;
  console.log(`${k.padEnd(30)} share ${(100 * a.n / tot).toFixed(0).padStart(3)}% | ${f(a.req / a.n)} / ${f(a.ach / a.n)}`);
}
const med = (v: number[]) => v.sort((p, q) => p - q)[Math.floor(v.length / 2)];
for (const [k, v] of disp) console.log(`${k.padEnd(30)} median ${f(med(v))} (n ${v.length})`);
