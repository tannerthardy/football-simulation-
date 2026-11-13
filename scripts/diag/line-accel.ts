/** Where linemen's accelerations come from on run plays: their own feet
 * (ground impulse) or contact (development aid).
 *   node --import tsx scripts/diag/line-accel.ts [games] [seed] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = new Set(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT']);
type Peak = { ground: number; contact: number; total: number; smooth: number; at: { body: number; hands: number; strike: number; grasp: number } };
const peaks: Record<'OL' | 'DL', Peak[]> = { OL: [], DL: [] };
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const isRun = !sim.isPass;
    const watch = sim.agents.filter((a) => OL.has(a.slot) || DL.has(a.slot));
    const hist = new Map(watch.map((a) => [a, { ground: 0, contact: 0, total: 0, speeds: [] as number[], at: { body: 0, hands: 0, strike: 0, grasp: 0 } }]));
    // Attribute contact impulses by source at each lineman's peak tick.
    const struck = new Map<number, number>();
    const strike = sim.world.strike.bind(sim.world);
    sim.world.strike = (a, b, j) => { const m = Math.hypot(j.x, j.y); for (const x of [a, b]) { const i = sim.world.indexOf(x); struck.set(i, (struck.get(i) ?? 0) + m); } strike(a, b, j); };
    while (sim.phase === 'live' && sim.t < 25) {
      const v0 = watch.map((a) => ({ ...a.vel }));
      tick.tick();
      const r = sim.lastStep;
      if (!r || !isRun) continue;
      watch.forEach((a, k) => {
        const h = hist.get(a)!;
        const m = a.profile.massKg, g = r.groundImpulse[a.idx];
        const dvx = a.vel.x - v0[k].x, dvy = a.vel.y - v0[k].y;
        const gx = g.x / m, gy = g.y / m;
        h.ground = Math.max(h.ground, Math.hypot(gx, gy) / sim.dt);
        const ca = Math.hypot(dvx - gx, dvy - gy) / sim.dt;
        if (ca > h.contact) {
          const i = a.idx;
          const body = r.contacts.filter((c) => c.i === i || c.j === i).reduce((s2, c) => s2 + c.impulse, 0);
          let hands = 0, grasp = 0;
          for (const j of sim.world.joints) {
            if (j.a !== a.body && j.b !== a.body) continue;
            if (j.kind === 'hands') hands += (Math.abs(j.normalForce ?? 0) + Math.abs(j.tangentForce ?? 0)) * sim.dt;
            else grasp += (j.force ?? 0) * sim.dt;
          }
          h.at = { body: body / m, hands: hands / m, strike: (struck.get(i) ?? 0) / m, grasp: grasp / m };
        }
        h.contact = Math.max(h.contact, ca);
        h.total = Math.max(h.total, Math.hypot(dvx, dvy) / sim.dt);
        h.speeds.push(Math.hypot(a.vel.x, a.vel.y));
      });
      struck.clear();
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    if (isRun) for (const [a, h] of hist) {
      // Tracking-style: max rate of change of a 0.25 s-smoothed speed.
      const s = h.speeds.map((_, k) => { const w = h.speeds.slice(Math.max(0, k - 2), k + 3); return w.reduce((x, y) => x + y, 0) / w.length; });
      let sm = 0;
      for (let k = 2; k < s.length - 2; k++) sm = Math.max(sm, (s[k + 2] - s[k - 2]) / (4 * sim.dt));
      peaks[OL.has(a.slot) ? 'OL' : 'DL'].push({ ground: h.ground, contact: h.contact, total: h.total, smooth: sm, at: h.at });
    }
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
for (const k of ['OL', 'DL'] as const) {
  const ps = peaks[k];
  const f = (sel: (p: Peak) => number) => `${q(ps.map(sel), 0.5).toFixed(1)}/${q(ps.map(sel), 0.9).toFixed(1)}`;
  console.log(`${k} n ${ps.length} per-play peak accel p50/p90 (yd/s^2, one tick): total ${f((p) => p.total)} ground ${f((p) => p.ground)} contact ${f((p) => p.contact)} | smoothed speed-rate ${f((p) => p.smooth)}`);
  console.log(`   at the peak contact tick, delta-v by source p50/p90 (yd/s): body ${f((p) => p.at.body)} hands ${f((p) => p.at.hands)} strike ${f((p) => p.at.strike)} grasp ${f((p) => p.at.grasp)}`);
}
