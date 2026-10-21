/** Reproduce the retained Counter sideline-controller failure.
 * node --import tsx scripts/diag/carrier-boundary-review.ts output.json [engine-root]
 * For a historical baseline, extract the entire src tree into engine-root.
 * All imported source, fixture inputs and observation controls are pinned.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [output, rootArg] = process.argv.slice(2);
if (!output || process.argv.length > 4) throw new Error('Usage: carrier-boundary-review.ts output.json [engine-root]');
const engineRoot = resolve(rootArg ?? '.'), mod = (path: string) => import(pathToFileURL(resolve(engineRoot, path)).href);
const sourceHash = () => {
  const list = (path: string): string[] => readdirSync(resolve(engineRoot, path), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? list(`${path}/${e.name}`) : [`${path}/${e.name}`]).sort();
  const hash = createHash('sha256');
  for (const path of list('src')) hash.update(path).update('\0').update(readFileSync(resolve(engineRoot, path))).update('\0');
  return hash.digest('hex');
};
const sourceBefore = sourceHash();
const [{ Rng }, { CENTER_Y }, { generateTeam, pickOffense, pickDefense }, { RUN_BY_ID },
  { FRONT_BY_ID, COVERAGE_BY_ID }, { FORMATION_BY_ID }, { PlaySim }, { BallCarrier }] = await Promise.all([
  mod('src/core/rng.ts'), mod('src/core/field.ts'), mod('src/league/team.ts'), mod('src/playbook/concepts.ts'),
  mod('src/playbook/defense.ts'), mod('src/playbook/formations.ts'), mod('src/sim/playsim.ts'), mod('src/sim/behaviors/carrier.ts'),
]);
const offense = generateTeam(new Rng(51), 'Panel offense 3', 'O3', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Panel defense 3', 'D3', { strength: .55 });
const formation = FORMATION_BY_ID.ace_11, front = FRONT_BY_ID.under, personnel = front.personnel[0];
const fixture = { id: 'RC-R3-counter-under-L-S3', rosterSeeds: [51, 52], strength: .55,
  formation: formation.id, run: 'counter', front: front.id, coverage: 'cover3', pressure: null,
  flip: true, los: 40, ballY: CENTER_Y, firstDownX: 50, down: 1, seed: 3 };
const input = { offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
  offCall: { formation, flip: true, kind: 'run', run: RUN_BY_ID.counter, label: `${formation.name} · Counter` },
  defCall: { personnel, front, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: `${front.name} · Cover 3` },
  los: fixture.los, ballY: CENTER_Y, firstDownX: fixture.firstDownX, down: 1, seed: fixture.seed };
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const summaries: any[] = [];
let saved: any;
for (const observed of [false, true]) {
  const sim = new PlaySim({ ...input, record: observed, recordLevel: 'full' });
  const choices: any[] = [];
  const update = BallCarrier.prototype.update;
  if (observed) BallCarrier.prototype.update = function(a: any, s: any) {
    const before = { pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing };
    const command = update.call(this, a, s);
    if (a.slot === 'RB') choices.push({ t: s.t, ...before, command,
      plannedExit: (this as any).plannedExit, boundaryRecovery: (this as any).boundaryRecovery ?? null,
      heading: (this as any).heading, tags: [...a.tags],
      opponents: s.opponents(a).filter((d: any) => !d.isDown(s.t)).map((d: any) => ({ slot: d.slot,
        pos: { ...d.pos }, vel: { ...d.vel }, distance: Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y), engaged: !!d.engagement })) });
    return command;
  };
  sim.event('snap', sim.slot('C')!);
  while (sim.phase === 'live' && sim.t < 25) sim.tick();
  if (sim.phase === 'live') sim.whistle('timeout', (sim.carrier ?? sim.qb).pos);
  BallCarrier.prototype.update = update;
  const result = sim.buildResult();
  const signature = hash({ result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map((a: any) => a.body), intents: sim.intents, rngNext: sim.rng.nextU32() });
  summaries.push({ observed, signature, outcome: result.outcome, yards: result.offenseYards, duration: result.duration });
  if (observed) saved = { result, choices,
    players: sim.agents.map((a: any) => ({ team: a.team, slot: a.slot, name: `${a.player.firstName} ${a.player.lastName}`, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn,
      ratings: a.player.ratings, profile: a.profile })) };
}
if (summaries[0].signature !== summaries[1].signature) throw new Error('Observer/full-recording changed physical result');
const sourceAfter = sourceHash();
if (sourceBefore !== sourceAfter) throw new Error('Imported engine source changed during witness');
const carrierSha256 = createHash('sha256').update(readFileSync(resolve(engineRoot, 'src/sim/behaviors/carrier.ts'))).digest('hex');
const report = { schema: 'carrier-boundary-review-v1', sourceBefore, sourceAfter, engineRoot,
  carrierSha256, scriptSha256: createHash('sha256').update(readFileSync(process.argv[1])).digest('hex'),
  command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)], fixture, fixtureSha256: hash(fixture),
  profilesSha256: hash(saved.players), observerControls: summaries, observerVerified: true,
  limits: ['One retrospectively selected Counter failure; no league-rate estimate.',
    'Boundary recovery changes only commands; World resolves movement, traction, balance and contacts.',
    'Choices record actual contemporaneous defender geometry, not claimed contents of the runner perception.'], ...saved };
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, JSON.stringify(report) + '\n');
console.log(JSON.stringify({ output, sourceBefore, carrierSha256, ...summaries[1], choices: saved.choices.length }));
