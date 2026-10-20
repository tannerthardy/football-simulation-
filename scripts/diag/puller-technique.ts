/** Full-player puller request/cue/phase trace on a saved PlaySetup. No policy overrides. */
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gunzipSync, gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {PlaySim, type PlaySetup} from '../../src/sim/playsim.js';
import {RunBlocker} from '../../src/sim/behaviors/blocking.js';
import {runContactObservers} from '../../src/sim/run-contact-observer.js';
import {sourceVersion} from '../source-version.js';

const arg = (key: string, fallback = '') => {const i = process.argv.indexOf(key); return i < 0 ? fallback : process.argv[i + 1];};
const file = arg('--inputs', 'test/fixtures/puller-access-inputs.json.gz');
const id = arg('--id'), output = arg('--out'), until = Number(arg('--until', '8'));
if (!id || !output || !(until > 0 && until <= 8)) throw Error('Require --id, --out, bounded --until.');
const bytes = readFileSync(file), inputs = JSON.parse(gunzipSync(bytes).toString());
const row = inputs.rows.find((r: {id: string}) => r.id === id);
if (!row) throw Error('Unknown saved input ' + id);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const setup = structuredClone(row.setup) as PlaySetup;
setup.record = false;
const sim = new PlaySim(structuredClone(setup));
const tracked = new Set(sim.offense.filter(a => a.behavior instanceof RunBlocker).map(a => a.idx));
const state = (behavior: RunBlocker) => {
  const c = behavior as any, p = behavior.plan;
  return {kind: p.kind, role: p.pullRole, target: p.target?.slot, drive: {...p.drive}, path: p.pullPath,
    pullIdx: c.pullIdx, cleared: c.pullCleared, homeY: c.homeY, pullRead: c.pullRead ? {
      target: c.pullRead.target.slot, seen: c.pullRead.seen, clearanceX: c.pullRead.clearanceX,
      nextRead: c.pullRead.nextRead} : null, departure: c.departureRead,
    wrapOutside: c.wrapOutside, wrapCorner: c.wrapCorner, zoneRead: c.zoneRead};
};
const bodies = () => sim.agents.map(a => ({slot: a.slot, pos: {...a.pos}, vel: {...a.vel}, facing: a.facing,
  support: a.body.support?.state, plan: a.behavior instanceof RunBlocker ? structuredClone(state(a.behavior)) : null}));
const hands = () => sim.engagements.map(e => ({b: e.blocker.slot, d: e.defender.slot,
  helpers: e.helpers.map(h => h.slot), start: e.start,
  hand: e.hands ? {normal: e.hands.normalForce, tangent: e.hands.tangentForce} : null}));
let updates: any[] = [], cues: any[] = [];
const frames: any[] = [], contacts: any[] = [];
const see = sim.see.bind(sim);
sim.see = (observer, other, scale) => {
  const picture = see(observer, other, scale);
  if (tracked.has(observer.idx)) cues.push(structuredClone({observer: observer.slot, other: other.slot, picture}));
  return picture;
};
for (const a of sim.offense) {
  if (!(a.behavior instanceof RunBlocker)) continue;
  const b = a.behavior, update = b.update.bind(b);
  b.update = (agent, play) => {
    const before = structuredClone(state(b)), command = update(agent, play);
    updates.push(structuredClone({slot: agent.slot, before, after: state(b), command}));
    return command;
  };
}
runContactObservers.set(sim, (e, kind, data) => contacts.push(structuredClone({t: sim.t,
  b: e.blocker.slot, d: e.defender.slot, kind, data})));
const step = sim.world.step.bind(sim.world);
sim.world.step = (commands, dt) => {
  const before = bodies(), final = structuredClone(commands), entryHands = hands();
  const report = step(commands, dt);
  frames.push(structuredClone({t: sim.t, end: sim.t + dt, before, after: bodies(), updates, cues,
    final, entryHands, hands: hands(), contacts: report.contacts,
    budgets: {workResidual: report.work.residual,
      armImpulseExcess: Math.max(0, ...report.armImpulse.map((x, i) => x - report.armImpulseLimit[i])),
      armWorkExcess: Math.max(0, ...report.armWork.map((x, i) => x - report.armWorkLimit[i])),
      supportWorkExcess: Math.max(0, ...report.supportMotorWork.map((x, i) => x - report.supportMotorWorkLimit[i]))}}));
  return report;
};
while (sim.phase === 'live' && sim.t < until - 1e-9) {updates = []; cues = []; sim.tick();}
const signature = (s: PlaySim) => hash({t: s.t, phase: s.phase, bodies: s.agents.map(a => a.body), rng: s.rng, events: s.events});
let passive: boolean | null = null;
if (process.argv.includes('--verify')) {
  const plain = new PlaySim(structuredClone(setup));
  while (plain.phase === 'live' && plain.t < until - 1e-9) plain.tick();
  passive = signature(sim) === signature(plain);
  if (!passive) throw Error('Observer changed physical state, RNG or events.');
}
const result = sim.phase === 'live' ? null : sim.buildResult();
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
const data = {id, fixture: file, fixtureSha256: createHash('sha256').update(bytes).digest('hex'),
  setup, inputSha256: hash(setup), sourceSha256: sourceVersion(), node: process.version,
  flags: Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null])),
  slots: sim.agents.map(a => a.slot), profiles: sim.agents.map(a => a.profile), frames, contacts,
  events: sim.events, censored: sim.phase === 'live', passive,
  signature: signature(sim), result: result ? {gain: result.offenseYards, outcome: result.outcome} : null};
mkdirSync(dirname(output), {recursive: true});
writeFileSync(output, gzipSync(JSON.stringify(data), {mtime: 0} as any));
console.log(JSON.stringify({output, id, frames: frames.length, passive, result: data.result, censored: data.censored}));
