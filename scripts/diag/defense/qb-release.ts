// QB_RELEASE scenario: a scripted QB (holds the ball, never throws) after 0.3 s:
//  rollout  - out of the pocket wide, then drifts downfield ~1.5 yd/s, 4-7 yd deep, to 4.5 s
//  scramble - up the middle at full speed from 0.8 s
//  drift-run- the rollout to 2.6 s, then runs for the sideline/upfield at full speed
// Per play: each underneath zone defender's first possession-pursuit release time, and the play's yards.
//   [QB_RELEASE=1] node scripts/ref.mjs --flag QB_RELEASE=0|1 -- node --import tsx scripts/diag/defense/qb-release.ts
import { PlaySim } from '../../../src/sim/playsim.js';
import { runThrough } from '../../../src/sim/behaviors/common.js';
import { nativeTraceSetup } from '../command-trace.js';
const scripts: Record<string, (t: number, los: number, y0: number) => { p: { x: number; y: number }; s: number }> = {
  rollout: (t, los, y0) => t < 2.0 ? { p: { x: los - 7, y: y0 + 10 }, s: 0.9 } : { p: { x: los - 3, y: y0 + 13 }, s: 0.2 },
  scramble: (t, los, y0) => t < 0.8 ? { p: { x: los - 6, y: y0 }, s: 0.3 } : { p: { x: los + 25, y: y0 + 1 }, s: 1 },
  'drift-run': (t, los, y0) => t < 2.0 ? { p: { x: los - 7, y: y0 + 10 }, s: 0.9 } : t < 2.6 ? { p: { x: los - 3, y: y0 + 13 }, s: 0.2 } : { p: { x: los + 25, y: y0 + 16 }, s: 1 },
};
const out: any[] = [];
for (const name of Object.keys(scripts)) for (const coverage of ['cover3', 'cover4', 'cover2']) for (const seed of [1, 2, 3, 4, 5, 6]) {
  const setup: any = { ...nativeTraceSetup({ coverage, concept: 'curl_flat', seed, roster: seed, formation: 'gun_doubles_11', flip: false }), record: true, recordLevel: 'standard' };
  const sim: any = new PlaySim(setup);
  const y0 = sim.ballY, los = sim.los, script = scripts[name];
  const under = sim.defense.filter((d: any) => d.behavior?.kind === 'zone' && !/deep|quarter/.test(sim.defAlign.spots[d.slot]?.zone ?? 'deep'));
  const tick = sim.tick.bind(sim);
  let swapped = false;
  sim.tick = () => {
    if (!swapped && sim.t >= 0.3) { swapped = true; sim.qb.behavior = { kind: 'scripted-qb', update: (a: any, s: any) => { const w = script(s.t, los, y0); return runThrough(a, w.p, { speed: w.s }); } }; }
    tick();
  };
  const res = sim.run();
  const rel = new Map<number, number>();
  for (const d of sim.trace.data?.decisions ?? []) if (d.kind === 'possession-pursuit' && !rel.has(d.a)) rel.set(d.a, d.t);
  const times = under.map((d: any) => rel.get(d.idx) ?? null);
  const qbEnd = sim.qb.pos;
  out.push({ name, coverage, seed, under: under.map((d: any) => d.slot), release: times, yards: res?.yards ?? null, end: sim.events.at(-1)?.type, qbEnd: { x: +(qbEnd.x - los).toFixed(1) } });
}
for (const r of out) console.log(JSON.stringify(r));
