// Forced outside go throws (Rules+Coaching's forced-deep.ts selection, unchanged: four verticals from 2x2 and 3x1
// against Cover 1-4; at the first moment from 2.3 to 2.6 s that the QB is set and an outside go is ready, he is made
// to throw it, his own evaluation and release), written in the common format so the shared pass operators read them
// like any export. usage: npx tsx scripts/diag/risk/forced-deep-export.ts [--n 40] [--out out/mechanics/forced.jsonl.gz]
import { createGzip } from 'node:zlib';
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { RouteRunner, routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { commonPlay } from '../../mechanics/sim-export.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', '40')), out = arg('--out', 'out/mechanics/forced.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); const done = new Promise<void>(r => gz.pipe(createWriteStream(out)).on('finish', () => r()));
let count = 0;
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let i = 1; i <= N; i++) {
  const seed = Math.ceil(i / 2), flip = i % 2 === 0;
  const setup: any = { ...nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }), record: true, recordEvery: 1 };
  const sim: any = new PlaySim(setup);
  const by = sim.ballY;
  const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
  const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
    return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
  let qb: any = null, forced = false;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb && !forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.3 && sim.t <= 2.6) {
      const go = gos.find((r: any) => qb.ready(r, sim)); const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
      if (ev) { forced = true; qb.startThrow(sim.qb, sim, ev); }
    }
  };
  const r: any = sim.run();
  if (!forced || !r.frames) continue;
  const log: any = { kind: 'pass', yards: r.yards, down: 1, distance: 10, routes: sim.agents.map((a: any) => routeOfAgent.get(a) ?? null),
    plan: { concept: 'four_verts', coverage, formation, front: sim.defCall?.front?.id ?? null, defPersonnel: null },
    replay: { frames: r.frames, players: sim.agents.map((a: any) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      los: sim.los, firstDownX: sim.los + 10, flip: false, events: r.events } };
  const c = commonPlay(log, `F-${coverage}-${formation}-${i}`);
  if (c) { gz.write(JSON.stringify(c) + '\n'); count++; }
}
gz.end(); await done;
console.error(`${count} forced plays -> ${out}`);
