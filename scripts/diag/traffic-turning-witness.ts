/** One natural 11v11 adverse run, with native commands, consumed pictures and
 * actual loads. No additional observations, decisions or RNG draws are made.
 * Run from the project root with Node 22:
 * node --import tsx scripts/diag/traffic-turning-witness.ts \
 *   --engine=/absolute/source/archive --expected-source=<whole-source-sha> \
 *   --output=/absolute/path/witness.json.gz
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--([a-z-]+)=(.+)$/.exec(arg);
  if (!match) throw new Error(`Expected --name=value, received ${arg}`);
  return [match[1], match[2]];
}));
const engine = resolve(args.engine ?? process.cwd());
const output = resolve(args.output ?? 'out/traffic-turning/witness.json.gz');
const expected = args['expected-source'];
if (!expected || Object.keys(args).some(key => !['engine', 'output', 'expected-source'].includes(key))) {
  throw new Error('Specify --expected-source=<whole-source-sha>; optional --engine and --output');
}
process.chdir(engine);
const load = (path: string) => import(pathToFileURL(resolve(engine, path)).href);
const [{ CENTER_Y }, { Rng }, { generateTeam, pickDefense, pickOffense },
  { RUN_BY_ID }, { COVERAGE_BY_ID, FRONT_BY_ID }, { FORMATION_BY_ID },
  { PlaySim }, { sourceVersion }] = await Promise.all([
  load('src/core/field.ts'), load('src/core/rng.ts'), load('src/league/team.ts'),
  load('src/playbook/concepts.ts'), load('src/playbook/defense.ts'),
  load('src/playbook/formations.ts'), load('src/sim/playsim.ts'), load('scripts/source-version.ts'),
]);
const sourceBefore = sourceVersion();
if (sourceBefore !== expected) throw new Error(`Expected source ${expected}, found ${sourceBefore}`);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
const formation = FORMATION_BY_ID.ace_11, personnel = FRONT_BY_ID.under.personnel[0];
const input = {
  offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
  offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong,
    label: `${formation.name} · ${RUN_BY_ID.iz_strong.name}` },
  defCall: { personnel, front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3,
    pressure: null, label: `${FRONT_BY_ID.under.name} · Cover 3` },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: false,
};
const sim = new PlaySim(input);
const initial = sim.agents.map((a: any) => ({ slot: a.slot, team: a.team,
  body: structuredClone(a.body), ratings: a.player.ratings, snapReadyAt: a.snapReadyAt }));
const joint = (s: any, j: any) => ({ kind: j.kind,
  a: s.agents.find((a: any) => a.body === j.a).slot,
  b: s.agents.find((a: any) => a.body === j.b).slot,
  ...Object.fromEntries(Object.entries(j).filter(([key]) => !['a', 'b', 'actor'].includes(key))),
  actor: j.actor ? s.agents.find((a: any) => a.body === j.actor).slot : null,
});
let reads: any[] = [];
const observedSee = sim.see;
sim.see = function (a: any, b: any, ...rest: any[]) {
  const seen = observedSee.call(this, a, b, ...rest);
  reads.push({ observer: a.slot, target: b.slot, team: b.team, image: structuredClone(seen) });
  return seen;
};
const steps: any[] = [], nativeStep = sim.world.step;
sim.world.step = function (intents: any, dt: number) {
  const before = { t: sim.t,
    bodies: sim.agents.map((a: any) => ({ slot: a.slot, idx: a.idx,
      body: structuredClone(a.body), engaged: !!a.engagement, down: a.isDown(sim.t) })),
    // This diagnostic reads existing controller output; it does not call it.
    commands: structuredClone(sim.cmds), intents: structuredClone(intents),
    joints: sim.world.joints.map((j: any) => joint(sim, j)),
    previousContacts: structuredClone(sim.lastStep?.contacts ?? []), reads,
  };
  reads = [];
  const report = nativeStep.call(this, intents, dt);
  steps.push({ before, after: sim.agents.map((a: any) => ({ slot: a.slot,
    body: structuredClone(a.body) })), report: structuredClone(report) });
  return report;
};
const result = sim.run();
function signature(s: any, r: any) {
  return hash({ result: { ...r, frames: undefined, telemetry: undefined },
    bodies: s.agents.map((a: any) => a.body), intents: s.intents, events: s.events,
    minds: s.agents.map((a: any) => a.mind), perception: s.perception,
    joints: s.world.joints.map((j: any) => joint(s, j)), nextRng: s.rng.nextU32() });
}
const observedSignature = signature(sim, result), plain = new PlaySim(input);
const plainResult = plain.run(), plainSignature = signature(plain, plainResult);
if (observedSignature !== plainSignature) throw new Error('Observer changed native execution');
const sourceAfter = sourceVersion();
if (sourceAfter !== sourceBefore) throw new Error('Source changed during collection');
const packet = { schema: 'traffic-adverse-native-v1', id: 'CT-R1-iz_strong-under-R-S3',
  sourceBefore, sourceAfter,
  toolSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  node: process.version, initial, initialSha256: hash(initial), observedSignature, plainSignature,
  observerVerified: true, naturalEnd: result.outcome !== 'timeout', result, steps,
  method: 'Natural source-labelled Inside Zone/Under/R/seed3 with roster31/32. Wraps existing see and World.step only. Extra reads are not introduced. Compared with plain execution including endpoint bodies, intents, events, minds, perception, live joint state and next native RNG.',
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(packet), { level: 9 }));
console.log(JSON.stringify({ output, sourceBefore, sourceAfter, toolSha256: packet.toolSha256,
  initialSha256: packet.initialSha256, observerVerified: true, offenseYards: result.offenseYards,
  naturalEnd: packet.naturalEnd, steps: steps.length }));
