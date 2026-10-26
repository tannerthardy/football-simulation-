// TKL-2: the slow-hip-chase reproducers on the frozen set, with the slow gather gate off and on
// (the "off" arm needs a temporary globalThis.__NO_SLOWGATE check in gatheringApproach; without it both arms match).
//   node --import tsx scripts/diag/slow-gather-cases.ts setups.bin
import { readFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
const plays = deserialize(readFileSync(process.argv[2])) as any[];
const cases = [{ seed: 7, play: 6, slot: 'LB_M', t: [1.9, 3.0] }, { seed: 7, play: 36, slot: 'SS', t: [2.6, 3.6] }, { seed: 7, play: 51, slot: 'LB_M', t: [3.5, 4.6] }];
const G = globalThis as any;
const deg = (v: any) => Math.round(Math.atan2(v.y, v.x) * 180 / Math.PI);
for (const c of cases) {
  const p = plays.find(x => x.seed === c.seed && x.index + 1 === c.play);
  for (const off of [true, false]) {
    G.__NO_SLOWGATE = off;
    const sim: any = new PlaySim(restoreSetup(p.setup) as any);
    const d = sim.defense.find((x: any) => x.slot === c.slot);
    const rows: string[] = []; let minGap = 99, ahead = 0, n = 0, turn = 0, last: number | null = null;
    const evs: string[] = []; const ev = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note: any) => { if ((a === d || b === d) && /tackle|missed|broken/.test(type)) evs.push(`${type}@${sim.t.toFixed(2)}`); return ev(type, a, b, note); };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const r = sim.carrier;
      if (!r || r.team !== 'O' || sim.t < c.t[0] || sim.t > c.t[1]) return;
      const dx = d.pos.x - r.pos.x, dy = d.pos.y - r.pos.y, dist = Math.hypot(dx, dy), rs = Math.hypot(r.vel.x, r.vel.y);
      const front = rs > .5 ? (dx * r.vel.x + dy * r.vel.y) / rs : 0; // + = ahead of the runner along his path
      minGap = Math.min(minGap, dist - d.profile.reach - r.profile.radius); n++; if (front > 0) ahead++;
      const h = deg(d.vel); if (last !== null) turn += Math.abs(((h - last + 540) % 360) - 180); last = h;
      if (Math.round(sim.t * 100) % 10 === 0) rows.push(`t ${sim.t.toFixed(1)} dist ${dist.toFixed(1)} sp ${Math.hypot(d.vel.x, d.vel.y).toFixed(1)}/${rs.toFixed(1)} cmd ${deg(sim.intents[d.idx].vel)} body ${h} front ${front.toFixed(1)}`);
    };
    const res = sim.run();
    console.log(`== s${c.seed} P${String(c.play).padStart(3, '0')} ${c.slot} ${off ? 'gate off' : 'gate on'}: yards ${res.yards.toFixed(1)}, min gap ${minGap.toFixed(2)}, ahead ${Math.round(100 * ahead / Math.max(1, n))}%, body turn ${turn}° in window, ${evs.join(' ') || 'no contact events'}`);
    for (const r of rows) console.log('   ', r);
  }
}
