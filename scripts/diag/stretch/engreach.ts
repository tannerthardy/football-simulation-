/** Engaged defenders the carrier passes within full arm reach of (observation
 * only): per (defender, play) the closest pass while engaged, his block
 * leverage `win` and shed state then, and whether he got a hold this play.
 * node --import tsx scripts/diag/stretch/engreach.ts [--concepts iz,oz] [--seeds 1,2,3] */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const rows: any[] = [];
let plays = 0;
for (const concept of arg('--concepts', 'iz,oz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '1,2,3').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: 'ace_12' }, R); plays++;
    const best = new Map<any, any>();
    const held = new Set<any>();
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || sim.handoffAt < 0) continue;
      for (const j of sim.world.joints) if (j.kind === 'grasp' && j.b === c.body) held.add(sim.agents.find(a => a.body === j.a));
      for (const d of sim.defense) {
        const e = d.engagement;
        if (!e || e.type !== 'run' || d.isDown(sim.t)) continue;
        const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
        const full = c.profile.radius + d.profile.radius + d.profile.reach;
        if (dd > full) continue;
        const depth = (c.pos.x - sim.los) * sim.attackDir('O');
        const b = best.get(d);
        if (!b || dd < b.dd) best.set(d, { dd: +(dd / full).toFixed(2), win: +e.win.toFixed(2), phi: +e.phi.toFixed(2), baseB: +e.baseB.toFixed(2),
          shed: d.tags.has('shed-attempt'), depth: +depth.toFixed(1), slot: d.slot, blocker: e.blocker.slot, t: +sim.t.toFixed(2), concept });
      }
    }
    for (const [d, b] of best) rows.push({ ...b, held: held.has(d), gain: +sim.buildResult().offenseYards.toFixed(1) });
  }
const n = rows.length;
const pct = (f: (r: any) => boolean, s = rows) => `${(100 * s.filter(f).length / Math.max(1, s.length)).toFixed(0)}%`;
console.log(`plays ${plays}; engaged defenders the carrier passed within full arm reach: ${n} (${(n / plays).toFixed(2)}/play)`);
console.log(`  win>=0.6 (eligible to reach) ${pct(r => r.win >= .6)} | shed attempt tagged ${pct(r => r.shed)} | got a hold this play ${pct(r => r.held)}`);
for (const band of [[-9, 0], [0, 2], [2, 9]]) {
  const s = rows.filter(r => r.depth >= band[0] && r.depth < band[1]);
  console.log(`  runner depth ${band[0]}..${band[1]}: n ${s.length} eligible ${pct(r => r.win >= .6, s)} held ${pct(r => r.held, s)} | win p50 ${s.map(r => r.win).sort((a, b) => a - b)[s.length >> 1]}`);
}
