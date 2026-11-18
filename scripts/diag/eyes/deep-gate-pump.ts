// node --import tsx scripts/diag/eyes/deep-gate-pump.ts > rows.jsonl   (QB lane, 2026-11-18: DEEP_GATE x QB_STICK)
// Staged Cover 2/3 plays: per play, the pumps, the throw and its fate, and for each deep seat (deep thirds, deep middle,
// deep halves, Tampa's middle) whether he bit on the arm ('arm-bite') or held on it ('deep-hold'). Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const HELD = new Set(['deep_third_s', 'deep_third_w', 'deep_mid', 'deep_half_s', 'deep_half_w', 'tampa_mid']);
for (const concept of 'four_verts smash dagger y_cross sail_corner flood curl_flat stick mesh drive'.split(' ')) for (const coverage of ['cover2', 'cover3', 'cover3_match', 'tampa2']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
  const seats = new Map<any, string>(); const tick0 = sim.tick.bind(sim); const dir = sim.attackDir(sim.offense[0].team);
  sim.tick = () => { tick0(); for (const d of sim.defense) { const z = d.behavior?.zone ?? d.behavior?.recordedZone?.(); if (z && HELD.has(z)) seats.set(d, z); } };
  let thr: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !thr && intended) thr = { t: +sim.t.toFixed(2), depth: +((intended.x - sim.los) * dir).toFixed(1) }; return tb(p, target, v0, intended, ...rest); };
  let res: any; try { res = sim.run(); } catch { continue; }
  const ev = sim.events.map((e: any) => e.type);
  console.log(JSON.stringify({ concept, coverage, roster, seed, pumps: ev.filter((e: string) => e === 'pump').length, thr, cmp: !!res.stats.completed, int: ev.includes('interception'), sack: ev.includes('sack'), yards: res.yards,
    seats: [...seats].map(([d, z]) => ({ z, bite: d.tags.has('arm-bite'), hold: d.tags.has('deep-hold') })) }));
}
