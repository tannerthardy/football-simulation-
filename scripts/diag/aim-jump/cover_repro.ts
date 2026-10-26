// Coverage-objective jitter on designed runs (TKL-2, Stage 4 diagnosis; Coverage's code).
// Replays a frozen setup (frozen.bin.gz, as repro.ts) with one defender's command trace and
// prints, each step: his controller and job, the raw command's objective point and his
// distance to it, the raw command and final command bearings, his body heading, and the
// runner's yards past the line. A moving objective about 2 yd away that is re-picked every
// tick swings the command while the runner is still behind the line.
//   node --import tsx scripts/diag/aim-jump/cover_repro.ts KEY SLOT FROM TO
//   node --import tsx scripts/diag/aim-jump/cover_repro.ts --freeze KEY SETUPS.bin INDEX   (adds a setup from capture.ts output)
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { gunzipSync, gzipSync } from 'node:zlib';
import { PlaySim } from '../../../src/sim/playsim.js';
import { bytesHash, restoreSetup } from '../saved-play.js';
const FROZEN = new URL('./frozen.bin.gz', import.meta.url);
const frozen = deserialize(gunzipSync(readFileSync(FROZEN))) as Record<string, any>;
const args = process.argv.slice(2);
if (args[0] === '--freeze') {
  const [, key, file, index] = args;
  const p = (deserialize(readFileSync(file)) as any[]).find(x => x.index === Number(index))!;
  const sim = new PlaySim(restoreSetup(p.setup)); const r = sim.run();
  frozen[key] = { capturedAt: 'a27ccd84 (aim-jump scan setups)', setupSha256: bytesHash(p.setup), setup: p.setup, yards: r.yards, duration: r.duration };
  writeFileSync(FROZEN, gzipSync(serialize(frozen))); console.log('froze', key, r.yards, r.duration); process.exit(0);
}
const [key, slot, from, to] = args;
const f = frozen[key]; if (!f) throw new Error(`No frozen setup ${key}`);
const sim: any = new PlaySim(restoreSetup(f.setup));
const trace = sim.recordCommands({ actor: { team: 'D', slot }, from: Number(from), to: Number(to) + 0.05 });
const carrier = new Map<number, any>();
const tick = sim.tick.bind(sim);
sim.tick = () => { const c = sim.carrier; if (c) carrier.set(Math.round(sim.t * 1000), { slot: c.slot, x: (c.pos.x - sim.los) * sim.attackDir('O') }); tick(); };
const r = sim.run();
const deg = (v: any) => v && Math.hypot(v.x, v.y) > .3 ? String(Math.round(Math.atan2(v.y, v.x) * 180 / Math.PI)).padStart(4) : '   -';
console.log(`${key} ${slot}: ${sim.offCall.label} vs ${sim.defCall.label}; ${r.yards.toFixed(1)} yd (${r.yards === f.yards && r.duration === f.duration ? 'same as at capture' : `capture had ${f.yards}`})`);
console.log(' t     controller/job               objective (x, y)   dist | raw  final body | carrier x');
for (const s of trace.steps as any[]) {
  const o = s.decision?.raw.objective, p = s.start.body.position, c = carrier.get(Math.round(s.stepStart * 1000));
  const own = `${s.decision?.owner.controller}/${s.decision?.owner.job ?? s.decision?.owner.kind}`.padEnd(28);
  const ob = o ? `${o.kind.padEnd(6)} (${o.point.x.toFixed(1)}, ${o.point.y.toFixed(1)}) ${Math.hypot(o.point.x - p.x, o.point.y - p.y).toFixed(2).padStart(5)}` : '                         -';
  console.log(`${s.stepStart.toFixed(2)}  ${own} ${ob} | ${deg(s.decision?.raw.vel)} ${deg(s.final?.vel)} ${deg(s.start.body.velocity)} | ${c ? `${c.slot} ${c.x.toFixed(1)}` : '-'}`);
}
