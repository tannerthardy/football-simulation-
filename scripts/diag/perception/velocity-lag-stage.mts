/** Where the passer's velocity lag comes from (Flex, 2026-11-25, Integration from the QB lane's proj-err): one defender
 * standing, then accelerating at a fixed rate across the passer's view; per tick, his true velocity against sim.see's
 * picture (velocity and age) and QBMind's estimate, watched in the clear cone or peripherally (gaze 40 deg off).
 * Bodies are placed by hand (no physics step); the perception record and the passer's looks run as in play.
 * usage: node --import tsx scripts/diag/perception/velocity-lag-stage.mts [accel=5] */
import { nativeTraceSetup } from '../command-trace.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const A = Number(process.argv[2] ?? 5), VMAX = 8.5;
for (const look of ['clear', 'peripheral'] as const) {
  const sim = new PlaySim({ ...nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed: 7, roster: 7, formation: 'gun_doubles_11', flip: false }), audibles: false });
  const d = sim.slot('LB_W')!, qb = sim.qb, mind = (sim as unknown as { qbMind: { observe(g: { x: number; y: number }): void; estimate(a: unknown): { pos: { x: number; y: number }; vel: { x: number; y: number } } } }).qbMind;
  // Everyone else stands well away, so nothing hides him (the passer's sight is line-of-sight, SIGHT_CARRIER).
  for (const a of sim.agents) { a.body.vel = { x: 0, y: 0 }; if (a !== qb && a !== d) a.body.pos = { x: 20, y: 1 + (a.idx % 20) * 0.5 }; }
  qb.body.facing = 0;
  qb.body.pos = { x: 33, y: 26.67 }; d.body.pos = { x: 45, y: 20 };
  console.log(`\n${look} (accel ${A} yd/s2 from t=0.5, cap ${VMAX})\n| t | true vy | see vy | see age | see pos err | QB est vy | QB est pos err |\n|---|---|---|---|---|---|---|`);
  const dt = sim.dt; sim.t = 0;
  for (let i = 0; i < 24; i++) sim.recordPerception(qb.idx);
  for (let k = 0; k <= 40; k++) {
    const t = k * dt, v = t < 0.5 ? 0 : Math.min(VMAX, A * (t - 0.5));
    d.body.vel = { x: 0, y: v }; d.body.pos = { x: 45, y: d.body.pos.y + v * dt };
    sim.t = t; sim.recordPerception(qb.idx);
    const dir = Math.atan2(d.pos.y - qb.pos.y, d.pos.x - qb.pos.x) + (look === 'clear' ? 0 : 40 * Math.PI / 180);
    mind.observe({ x: qb.pos.x + 10 * Math.cos(dir), y: qb.pos.y + 10 * Math.sin(dir) });
    const s = sim.see(qb, d), e = mind.estimate(d);
    if (k % 2 === 0 && t >= 0.4) console.log(`| ${t.toFixed(2)} | ${v.toFixed(2)} | ${s.vel.y.toFixed(2)} | ${(s.age ?? 0).toFixed(2)} | ${Math.hypot(s.pos.x - d.pos.x, s.pos.y - d.pos.y).toFixed(2)} | ${e.vel.y.toFixed(2)} | ${Math.hypot(e.pos.x - d.pos.x, e.pos.y - d.pos.y).toFixed(2)} |`);
  }
}
