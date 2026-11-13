// Frozen aim-jump reproducer (TKL-2, Stage 4; diagnosis only, no behavior change).
// Restores one ordinary audit-game play from its exact constructor input
// (captureOrdinaryPlay: seed, G1-Pnnn), restages it with one defender's command trace,
// and prints, step by step, what the intercept chooser in pursuitPoint read and chose.
// At the named step it re-runs the chooser offline with the previous step's inputs and
// one group of new inputs at a time, to show which input alone moves the choice.
//   node --import tsx scripts/diag/aim-jump/repro.ts --seed 7 --play 12 --slot SS --at 3.4 [--from 2.9 --to 3.9]
// --frozen KEY replays a saved setup from scripts/diag/aim-jump/frozen.bin.gz instead (KEY s7-P115 or
// s8-P111, captured at develop a27ccd84), so the same constructor input runs on any later engine.
// --freeze OUT writes the play's setup to a frozen file entry (append).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { gunzipSync, gzipSync } from 'node:zlib';
import { deserialize, serialize } from 'node:v8';
import { PlaySim } from '../../../src/sim/playsim.js';
import { captureOrdinaryPlay } from '../capture-game-play.js';
import { compareExecution, initialState, replayState, restoreSetup } from '../saved-play.js';
import { choose, inputs, swaps } from './chooser.js';
const { values: v } = parseArgs({ options: { seed: { type: 'string', default: '7' }, play: { type: 'string' }, slot: { type: 'string' },
  at: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, frozen: { type: 'string' }, freeze: { type: 'string' } } });
const at = Number(v.at), from = Number(v.from ?? at - 0.5), to = Number(v.to ?? at + 0.5);
const FROZEN = new URL('./frozen.bin.gz', import.meta.url);
type Frozen = Record<string, { capturedAt: string; setupSha256: string; setup: Buffer; yards: number; duration: number }>;
const frozen: Frozen = existsSync(FROZEN) ? deserialize(gunzipSync(readFileSync(FROZEN))) : {};
const saved: any = v.frozen ? { ...frozen[v.frozen], game: { playId: v.frozen, seed: '-' } }
  : captureOrdinaryPlay({ seed: Number(v.seed), play: Number(v.play), minPlay: 1, maxSteps: 400 }).saved;
if (!saved.setup) throw new Error(`No frozen setup ${v.frozen}`);
if (v.freeze) {
  frozen[v.freeze] = { capturedAt: saved.identity.commit, setupSha256: saved.setupSha256, setup: saved.setup,
    yards: saved.original.result.yards, duration: saved.original.result.duration };
  writeFileSync(FROZEN, gzipSync(serialize(frozen)));
}
const sim: any = new PlaySim(restoreSetup(saved.setup));
const initial = initialState(sim);
const trace = sim.recordCommands({ actor: { team: 'D', slot: v.slot! }, from, to: to + 0.05 });
const truth = new Map<number, any>();
const tick = sim.tick.bind(sim);
sim.tick = () => { const c = sim.carrier; if (c && sim.ball.kind === 'held' && c.team === 'O')
  truth.set(Math.round(sim.t * 1000), { id: c.player.id, slot: c.slot, pos: { ...c.pos }, vel: { ...c.vel } }); tick(); };
const result = sim.run();
const same = v.frozen ? (result.yards === saved.yards && result.duration === saved.duration ? null
  : `no: ${result.yards} yd in ${result.duration} s here, ${saved.yards} yd in ${saved.duration} s at capture (${saved.capturedAt.slice(0, 8)})`)
  : compareExecution(saved.original, { initial, result, replay: replayState(sim, result, saved.context) });
const me = sim.defense.find((d: any) => d.slot === v.slot);
const f2 = (x: number) => x.toFixed(2), deg = (p: any) => Math.round(Math.atan2(p.y, p.x) * 180 / Math.PI);
console.log(`${saved.game.playId} seed ${saved.game.seed}, setup sha256 ${saved.setupSha256.slice(0, 16)}; ${saved.setup.length} bytes`);
console.log(`call: ${sim.offCall.label} vs ${sim.defCall.label}; restaged with trace matches the original play: ${same === null ? 'yes' : JSON.stringify(same)}`);
console.log(`${v.slot} ${me.player.id}: vmax ${f2(me.profile.vmax)} yd/s, tau ${f2(me.profile.tau)} s, lateral ${f2(me.profile.lateral)}, brake ${f2(me.profile.brake)}`);
const rows: any[] = [];
console.log('\n t     carrier sp/hd (true) | seen sp  acc    V    | his sp  dist | effort hor | status ipT  aim brg | cmd brg body hd | slack at 0 / best / end');
for (const s of trace.steps as any[]) {
  const c = truth.get(Math.round(s.stepStart * 1000));
  const pr = (s.pursuit ?? []).filter((x: any) => c && x.target.playerId === c.id);
  const ch = pr.filter((x: any) => x.data.kind === 'chase').at(-1)?.data, ip = pr.filter((x: any) => x.data.kind === 'intercept').at(-1)?.data;
  if (!c || !ip) continue;
  const e = ip.prediction.estimate, f = ip.forecast, sl = ip.prediction.samples.map((q: any) => q.slack);
  const row = { t: s.stepStart, c, ipT: ip.prediction.t, status: e.status === 'estimated-feasible' ? 'F' : 'B', radius: e.radius, horizonIp: e.horizon,
    req: e.request ? { speed: e.request.speed, effort: e.request.effort } : null, scale: ip.pursuer.speedScale ?? 1,
    mpos: ip.pursuer.position, mvel: ip.pursuer.velocity, seen: ip.observed,
    fc: { h: f.heading, sp: f.initialSpeed, acc: f.acceleration, V: f.relaxedSpeed, tau: f.relaxationTime }, aim: ip.steeringPoint, slack: sl };
  rows.push(row);
  const brg = deg({ x: ip.steeringPoint.x - row.mpos.x, y: ip.steeringPoint.y - row.mpos.y });
  console.log(`${f2(s.stepStart)}  ${f2(Math.hypot(c.vel.x, c.vel.y))} / ${String(deg(c.vel)).padStart(4)}       | ${f2(f.initialSpeed)} ${f2(f.acceleration).padStart(6)} ${f2(f.relaxedSpeed)} | `
    + `${f2(Math.hypot(row.mvel.x, row.mvel.y))}  ${f2(ch?.distance ?? NaN).padStart(5)} | ${f2(row.req?.effort ?? 1)}   ${e.horizon}  | `
    + `${row.status}      ${f2(row.ipT)} ${String(brg).padStart(4)} | ${String(s.final ? deg(s.final.vel) : '-').padStart(5)}   ${String(s.endpoint ? deg(s.endpoint.body.velocity) : '-').padStart(5)}  | ${f2(sl[0])} / ${f2(Math.max(...sl))} / ${f2(sl.at(-1))}`);
}
const k = rows.findIndex(r => Math.abs(r.t - at) < 1e-6);
if (k > 0) {
  const o = rows[k - 1], n = rows[k];
  console.log(`\nAt ${f2(n.t)}: choice ${o.status} ${f2(o.ipT)} -> ${n.status} ${f2(n.ipT)}. Offline re-run (inputs as traced, unrounded):`);
  const I = inputs(o), J = inputs(n);
  const base = choose(I, me.profile), all = choose(J, me.profile);
  console.log(`  previous inputs        -> ${base.status} ${f2(base.t)}`);
  console.log(`  new inputs             -> ${all.status} ${f2(all.t)}`);
  for (const [g, fn] of Object.entries(swaps)) { const r = choose(fn(I, J), me.profile);
    console.log(`  previous + new ${g.padEnd(8)}-> ${r.status} ${f2(r.t)}`); }
  for (const H of [6, 9]) { const a = choose({ ...I, horizon: H }, me.profile), b = choose({ ...J, horizon: H }, me.profile);
    console.log(`  same inputs, horizon ${H} s: ${a.status} ${f2(a.t)} -> ${b.status} ${f2(b.t)}`); }
  { const a = choose({ ...I, V: I.sp }, me.profile), b = choose({ ...J, V: J.sp }, me.profile);
    console.log(`  same inputs, no acceleration term: ${a.status} ${f2(a.t)} -> ${b.status} ${f2(b.t)}`); }
  console.log('  input changes: ' + [
    `his speed ${f2(Math.hypot(o.mvel.x, o.mvel.y))} -> ${f2(Math.hypot(n.mvel.x, n.mvel.y))}`,
    `seen speed ${f2(o.fc.sp)} -> ${f2(n.fc.sp)}`, `seen accel ${f2(o.fc.acc)} -> ${f2(n.fc.acc)}`,
    `forecast relaxed speed ${f2(o.fc.V)} -> ${f2(n.fc.V)}`, `heading ${deg(o.fc.h)} -> ${deg(n.fc.h)} deg`,
    `effort ${f2(o.req?.effort ?? 1)} -> ${f2(n.req?.effort ?? 1)}`].join('; '));
  console.log('  slack curve (s, every 0.3 s from t=0):');
  for (const r of [o, n]) console.log(`    ${f2(r.t)}: ${r.slack.filter((_: number, i: number) => i % 3 === 0).map(f2).join(' ')}`);
}
