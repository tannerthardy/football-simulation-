// One captured counter snap replayed as GH: the H's position, plan path index/waypoints, wrap corner, target, every 0.1 s.
import { readFileSync } from 'node:fs';
const W = process.argv[2], seed = process.argv[3], idx = Number(process.argv[4]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { COUNTER_VARIANTS } = await import(`${W}/src/playbook/concepts.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const setup = restoreSetup(Buffer.from(snaps[idx].setup, 'base64'));
setup.offCall = { ...setup.offCall, run: { ...COUNTER_VARIANTS.gh } };
const sim = new PlaySim(setup);
const h = sim.slot('H'), b: any = h.behavior, los = sim.los;
const r = (v: number) => v.toFixed(2);
console.log('H plan', b.plan.kind, b.plan.pullRole, 'tgt', b.plan.target?.slot, 'path', JSON.stringify(b.plan.pullPath.map((w: any) => [r(w.x - los), r(w.y)])), 'ballY', sim.ballY);
const tick = sim.tick.bind(sim); let n = 0;
sim.tick = () => { tick(); if (++n % 2 === 0 && sim.t <= 3.05) {
  const t = b.plan.target, car = sim.carrier;
  console.log(`${r(sim.t)} H (${r(h.pos.x - los)},${r(h.pos.y)}) v ${r(Math.hypot(h.vel.x, h.vel.y))} idx ${b.pullIdx} wp ${b.plan.pullPath?.[b.pullIdx] ? `(${r(b.plan.pullPath[b.pullIdx].x - los)},${r(b.plan.pullPath[b.pullIdx].y)})` : '-'} corner ${b.wrapCorner ? 'y' : '-'} out ${b.wrapOutside} tgt ${t?.slot}@(${t ? r(t.pos.x - los) : ''},${t ? r(t.pos.y) : ''}) eng ${h.engagement ? 'Y' : '-'} kind ${b.plan.kind} car ${car ? `(${r(car.pos.x - los)},${r(car.pos.y)})` : '-'}`);
} };
sim.run();
