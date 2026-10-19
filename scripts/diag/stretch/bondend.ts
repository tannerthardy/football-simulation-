/** How held runs end (observation only): for each play's first bond, time
 * from first hold to the whistle, whether the carrier went down (support) or
 * forward progress stalled, how many tacklers joined, the carrier's posture
 * and support state over the hold.
 * node --import tsx scripts/diag/stretch/bondend.ts [--concepts iz,oz,wz] [--seeds 77,71001,1]
 */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const rows: any[] = [];
for (const concept of arg('--concepts', 'iz,oz,wz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    // Diagnostic counterfactual carrier requests while held (BOND_ARM): nolean
    // (push 0), keep (current velocity, no new acceleration demand), north
    // (current speed straight upfield), northlean (north at vmax, as RB_NORTH).
    const armName = process.env.BOND_ARM;
    if (armName) {
      const step = sim.world.step.bind(sim.world);
      (sim.world as any).step = (intents: any[], dt: number) => {
        const c = sim.bond?.carrier;
        if (c && c.team === 'O' && intents[c.idx] && c.body.support?.state === 'up') {
          const it = intents[c.idx], up = sim.attackDir('O'), sp = Math.hypot(c.vel.x, c.vel.y);
          if (armName === 'nolean') intents[c.idx] = { ...it, push: 0 };
          if (armName === 'keep') intents[c.idx] = { ...it, vel: { ...c.vel } };
          if (armName === 'north') intents[c.idx] = { ...it, vel: { x: up * Math.max(sp, 1), y: 0 } };
          if (armName === 'northlean') intents[c.idx] = { ...it, vel: { x: up * c.profile.vmax, y: 0 } };
        }
        return step(intents, dt);
      };
    }
    let start = -1, maxT = 0, stallMax = 0, fellAt = -1, depth = 0, pull = 0, n = 0;
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      const b = sim.bond, c = sim.carrier;
      if (b && c && c.team === 'O' && sim.handoffAt >= 0) {
        if (start < 0) { start = sim.t; depth = (c.pos.x - sim.los) * sim.attackDir('O'); }
        maxT = Math.max(maxT, b.tacklers.length); stallMax = Math.max(stallMax, b.stalled ?? 0);
        if (fellAt < 0 && c.body.support?.state !== 'up') fellAt = sim.t;
        // Mean grasp tension on the carrier toward the tacklers this tick, body weights.
        let f = 0; for (const j of sim.world.joints) if (j.kind === 'grasp' && j.b === c.body) f += (j as any).capacity ?? 0;
        pull += f / (c.profile.massKg * 9.8 * 1.0936); n++;
      }
    }
    if (start < 0) continue;
    const gain = sim.buildResult().offenseYards;
    rows.push({ after: gain - depth, held: sim.t - start, fell: fellAt >= 0 ? fellAt - start : null, stall: stallMax >= .8, tacklers: maxT, depth, cap: pull / Math.max(1, n) });
  }
const q = (v: number[], f: number) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
console.log(`held plays ${rows.length}`);
for (const band of [[-9, 0], [0, 2], [2, 99]]) {
  const s = rows.filter(r => r.depth >= band[0] && r.depth < band[1]);
  if (!s.length) continue;
  const fell = s.filter(r => r.fell !== null);
  console.log(`  first hold at [${band[0]},${band[1]}) n ${s.length} | hold to whistle p25/50/75 ${q(s.map(r => r.held), .25)}/${q(s.map(r => r.held), .5)}/${q(s.map(r => r.held), .75)} s | carrier fell ${(100 * fell.length / s.length).toFixed(0)}% (hold to fall p50 ${q(fell.map(r => r.fell), .5)} s), stall-whistled ${(100 * s.filter(r => r.stall && r.fell === null).length / s.length).toFixed(0)}% | tacklers p50 ${q(s.map(r => r.tacklers), .5)} | mean grip capacity / body weight p50 ${q(s.map(r => r.cap), .5)} | yards after hold p50 ${q(s.map(r => r.after), .5)}`);
}
