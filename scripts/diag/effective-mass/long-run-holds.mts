// GRASP_PATCH's watch row (Integration, 2026-11-10): runs of 20+ yards that reach 40. On the fixed run set, for every
// run gaining 20+ yards: each grasp on the carrier (holder slot and origin), how long it lasted, the carrier's speed
// while held (mean) and how it ended (broken by the World, released when the bond ended, or still on at the whistle),
// and the yards the carrier gained while held. A hold that lasts while the carrier runs at speed is the case to look
// at. Settings at load: run per arm. usage: node --import tsx scripts/diag/effective-mass/long-run-holds.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/matched-restage';
const long: any[] = []; let runs = 0;
for (let seed = 7; seed <= 29; seed += 2) for (const [i, p] of (JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); runs++;
  const holds = new Map<any, any>(); const up = sim.attackDir('O'); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    const live = new Set<any>();
    for (const j of sim.world.joints) { if (j.kind !== 'grasp' || j.b !== c.body) continue; live.add(j);
      let h = holds.get(j); if (!h) { const who = sim.agents.find((a: any) => a.body === j.a); h = { slot: who?.slot, origin: j.origin, t0: sim.t, x0: c.pos.x, v: [], end: 'on at whistle' }; holds.set(j, h); }
      if (j.broken && h.end === 'on at whistle') h.end = 'broken';
      if (!j.broken) { h.t1 = sim.t; h.x1 = c.pos.x; h.v.push(Math.hypot(c.vel.x, c.vel.y)); } }
    for (const [j, h] of holds) if (!live.has(j) && h.end === 'on at whistle') h.end = 'released'; };
  const r = sim.run();
  if (r.yards >= 20) long.push({ id: `s${seed}-${i}`, yards: r.yards, holds: [...holds.values()].map(h => ({ ...h, dur: (h.t1 ?? h.t0) - h.t0, gained: ((h.x1 ?? h.x0) - h.x0) * up, vMean: h.v.length ? h.v.reduce((a: number, b: number) => a + b, 0) / h.v.length : 0 })) });
}
console.log(`runs ${runs}; gaining 20+: ${long.length} (reaching 40: ${long.filter(l => l.yards >= 40).length})`);
const all = long.flatMap(l => l.holds);
console.log(`grasps on those carriers: ${all.length} (${(all.length / Math.max(1, long.length)).toFixed(1)} a run) | ended: ${['broken', 'released', 'on at whistle'].map(e => `${e} ${all.filter(h => h.end === e).length}`).join(', ')}`);
const fast = all.filter(h => h.dur >= 0.3 && h.vMean >= 4);
console.log(`held >= 0.3 s with the carrier averaging >= 4 yd/s: ${fast.length} | yards gained while held: p50 ${[...all.map(h => h.gained)].sort((a, b) => a - b)[all.length >> 1]?.toFixed(1)}, max ${Math.max(0, ...all.map(h => h.gained)).toFixed(1)}`);
for (const l of long.filter(l => l.yards >= 40).slice(0, 8)) console.log(`  ${l.id} ${l.yards.toFixed(0)} yd: ${l.holds.map((h: any) => `${h.slot}/${h.origin} ${h.dur.toFixed(2)}s at ${h.vMean.toFixed(1)} yd/s, +${h.gained.toFixed(1)} yd, ${h.end}`).join(' | ') || 'no grasp'}`);
