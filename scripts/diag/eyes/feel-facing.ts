// CONCEPT_DROPS=1 QB_FOOTWORK=1|3 node --import tsx scripts/diag/eyes/feel-facing.ts concept coverage roster seed rusherSlot
// Integration (2026-11-16), bit 2's open check: his feel's blind side is measured off his body's facing (offFacing,
// 1.8 rad). With bit 2 his shoulders hold on a step while his head moves. Each tick from the snap: the rusher's bearing
// off his chest and off his head (a.head, where his eyes are), whether each puts him behind (> 1.8 rad), and the
// rusher's distance. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, roster, seed, slot] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: +seed, roster: +roster, formation: 'gun_doubles_11', flip: false }));
const d = sim.defense.find((x: any) => x.slot === slot), off = (ang: number) => Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
let n = 0, chest = 0, head = 0, both = 0;
for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
  sim.tick(); const q = sim.qb; if (q.behavior?.kind !== 'qb-pass' || sim.t < 0.6) continue;
  const bear = Math.atan2(d.pos.y - q.pos.y, d.pos.x - q.pos.x), c = off(bear - q.body.facing), h = off(bear - (q.head ?? q.body.facing));
  n++; if (c > 1.8) chest++; if (h > 1.8) head++; if (c > 1.8 && h > 1.8) both++;
  if (i % 4 === 0) console.log(sim.t.toFixed(2), q.behavior.phase, 'chest', (c * 57.3).toFixed(0), 'head', (h * 57.3).toFixed(0), 'dist', Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y).toFixed(1));
}
console.log(`ticks ${n}: behind chest ${chest}, behind head ${head}, behind both ${both}; end ${sim.t.toFixed(2)} ${sim.events.some((e: any) => e.type === 'sack') ? 'sack' : ''}`);
