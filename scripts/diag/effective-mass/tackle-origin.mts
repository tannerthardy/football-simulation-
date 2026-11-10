// Sim-only half of the tackle-forms index (docs/reviews/2026-11-10-tackle-forms.md). Fixed run set, flags via env. Per
// carry that ends tackled: the grasp origins in the bond in order (form / reach / lunge / block / dive, +assist, +behind),
// the number of holders, how many held the legs (legs >= 0.5), and the finish path: 'fall' (the carrier's support left
// 'up'), 'stall' (forward progress stopped, 0.8 s firm), 'grasp' (the QB in-the-grasp rule), or 'other' (out of bounds,
// etc.); plus missed tackles and dives in the carry. One JSON line per carry.
// usage: [flags] [SEEDS=...] node --import tsx scripts/diag/effective-mass/tackle-origin.mts [dir] > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const SEEDS = (process.env.SEEDS ?? '7,9,11,13,15,17,19,21,23,25,27,29').split(',').map(Number);
for (const seed of SEEDS) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); let lastBond: any = null, carrierState = 'up', stalled = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.bond) { lastBond = sim.bond; stalled = sim.bond.stalled ?? 0; carrierState = sim.bond.carrier.body.support?.state ?? 'up'; } };
  const res = sim.run();
  const tackle = sim.events.find((e: any) => e.type === 'tackle' || e.type === 'sack');
  const missed = sim.events.filter((e: any) => e.type === 'missed_tackle').length;
  const dives = sim.events.filter((e: any) => e.type === 'missed_tackle' && e.note === 'dive').length;
  if (!tackle || !lastBond) { console.log(JSON.stringify({ tackled: false, oob: sim.events.some((e: any) => e.type === 'out_of_bounds'), missed, yards: res?.yards ?? null })); continue; }
  const holds = [...(lastBond.holds?.values?.() ?? [])] as any[];
  const finish = carrierState !== 'up' ? 'fall' : stalled >= 0.8 - 1e-6 ? 'stall' : 'grasp/other';
  console.log(JSON.stringify({ tackled: true, origins: holds.map((j) => j.origin), holders: lastBond.tacklers.length,
    legHolds: holds.filter((j) => (j.legs ?? 0) >= 0.5).length, finish, held: +(sim.t - lastBond.start).toFixed(2), missed, dives, yards: res?.yards ?? null }));
}
