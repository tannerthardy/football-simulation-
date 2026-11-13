/** Constructor contract census and a fixed native pass panel. No call fitting.
 * Run unchanged against a frozen baseline checkout and the candidate source:
 * node --import tsx scripts/diag/pass-installation.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS, PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { QBPass } from '../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const sourceBefore = sourceVersion();
const output = process.argv[2] ?? 'out/pass-installation/panel.json';
if (process.argv.length > 3) throw new Error('Usage: pass-installation.ts [output.json]');
const cases = [
  { formation: 'gun_doubles_11', concept: 'pa_shot', treatment: 'protector-read' },
  { formation: 'ace_12', concept: 'pa_post_dig', treatment: 'formation-and-protector-read' },
  { formation: 'pistol_12', concept: 'pa_shot', treatment: 'formation-and-protector-read' },
  { formation: 'gun_doubles_11', concept: 'curl_flat', treatment: 'check-outlet-control' },
  { formation: 'gun_trips_11', concept: 'four_verts', treatment: 'vertical-control' },
  { formation: 'gun_bunch_11', concept: 'mesh', treatment: 'degraded-install-control' },
];
const cohort = { rosterSeedPairs: [[31, 32], [41, 42]], strength: .55, playSeed: 3,
  los: 40, ballY: CENTER_Y, cases, flips: [false, true], declaration: 'fixed before native outcomes' };
const teams = cohort.rosterSeedPairs.map(([o, d]) => ({
  offense: generateTeam(new Rng(o), 'Pass offense', 'POF', { strength: cohort.strength }),
  defense: generateTeam(new Rng(d), 'Pass defense', 'PDF', { strength: cohort.strength }),
}));
function create(roster: number, formationId: string, conceptId: string, flip = false, record = false) {
  const formation = FORMATION_BY_ID[formationId], concept = PASS_BY_ID[conceptId];
  return new PlaySim({ offense: pickOffense(teams[roster].offense, formation.personnel),
    defense: pickDefense(teams[roster].defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: concept, label: `${formationId}/${conceptId}` },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'match', label: 'Over Cover 3 control' },
    los: cohort.los, ballY: cohort.ballY, firstDownX: cohort.los + 10, seed: cohort.playSeed,
    record, recordLevel: 'full', recordEvery: 1, audibles: false });
}
function permanentSlots(sim: PlaySim): string[] {
  const c = sim.offCall.pass!;
  return sim.offense.filter(a => {
    const ref = sim.offAlign.refOf[a.slot as keyof typeof sim.offAlign.refOf];
    return !!ref && ((c.teBlock && sim.offAlign.spots[a.slot]?.inline)
      || (ref === 'B' && c.back === 'block'));
  }).map(a => a.slot);
}
function firstRead(sim: PlaySim): string | null {
  const idx = (sim.qb.behavior as QBPass).recordedState().read;
  return idx == null ? null : sim.agents[idx].slot;
}
function install(sim: PlaySim) {
  const skills = Object.entries(sim.offCall.formation.slots), on = skills.filter(([, a]) => a!.depth <= .6);
  const line = ['LT', 'LG', 'C', 'RG', 'RT', ...on.map(([s]) => s)].sort((a, b) => sim.offAlign.spots[a].pos.y - sim.offAlign.spots[b].pos.y);
  const covered = on.map(([s]) => s).filter(s => s !== line[0] && s !== line.at(-1));
  const permanent = permanentSlots(sim), read = firstRead(sim);
  return { onLine: line.length, coveredSkillSlots: covered,
    coveredRouteSlots: covered.filter(s => sim.slot(s)!.behavior.kind === 'route'),
    permanentSlots: permanent, firstRead: read, firstReadPermanent: read !== null && permanent.includes(read),
    missingProgression: sim.offCall.pass!.progression.filter(ref => !sim.offAlign.numbering[ref]),
    backfieldRefs: { B: sim.offAlign.numbering.B ?? null, B2: sim.offAlign.numbering.B2 ?? null } };
}
const census = FORMATIONS.flatMap(f => PASS_CONCEPTS.map(c => ({ formation: f.id, concept: c.id, ...install(create(0, f.id, c.id)) })));
const signature = (sim: PlaySim, result: PlayResult) => hash({
  result: { ...result, frames: undefined, telemetry: undefined }, bodies: sim.agents.map(a => a.body),
  intents: sim.intents, rng: { ...sim.rng },
});
const rows: Array<{ id: string; stats: PlayResult['stats']; outcome: PlayResult['outcome'];
  observerVerified: boolean | null; setWithPermanentReadTicks: number } & Record<string, unknown>> = [];
const film: unknown[] = [];
for (let roster = 0; roster < teams.length; roster++) for (const c of cases) for (const flip of cohort.flips) {
  const record = roster === 0 && !flip && (c.concept === 'pa_shot' || c.treatment === 'check-outlet-control');
  const sim = create(roster, c.formation, c.concept, flip, record), installed = install(sim);
  const permanent = permanentSlots(sim), originalStep = sim.world.step;
  let setWithPermanentReadTicks = 0;
  sim.world.step = function (intents, dt) {
    const b = sim.qb.behavior;
    if (b instanceof QBPass) {
      const q = b.recordedState();
      if (q.phase === 'set' && q.read != null && permanent.includes(sim.agents[q.read].slot)) setWithPermanentReadTicks++;
    }
    return originalStep.call(this, intents, dt);
  };
  let result: PlayResult;
  try { result = sim.run(); } finally { sim.world.step = originalStep; }
  const executionSha256 = signature(sim, result);
  let observerVerified: boolean | null = null;
  if (!flip && (c.concept === 'pa_shot' || c.treatment === 'check-outlet-control')) {
    const plain = create(roster, c.formation, c.concept, flip, false);
    observerVerified = executionSha256 === signature(plain, plain.run());
    if (!observerVerified) throw new Error('Read observer or recording changed execution');
  }
  const id = `${roster}:${c.formation}:${c.concept}:${flip}`;
  rows.push({ id, rosterSeedPair: cohort.rosterSeedPairs[roster], ...c, flip, installed,
    profilesSha256: hash(sim.agents.map(a => ({ slot: a.slot, playerId: a.player.id, profile: a.profile }))),
    outcome: result.outcome, duration: result.duration, fieldGainBeforePenalties: result.yards,
    offenseYardsBeforePenalties: result.offenseYards, stats: result.stats, penalty: result.penalty,
    setWithPermanentReadTicks, executionSha256, observerVerified });
  if (record) film.push({ id, result, players: sim.agents.map(a => ({ slot: a.slot, team: a.team, player: a.player })) });
}
const attempts = rows.filter(r => r.stats.attempted), sum = (key: 'completed' | 'sacked') => rows.filter(r => r.stats[key]).length;
if (attempts.some(r => r.stats.timeToThrow === undefined || !Number.isFinite(r.stats.timeToThrow))) throw new Error('Attempt without known time to throw');
const sourceAfter = sourceVersion();
if (sourceBefore !== sourceAfter) throw new Error('Source changed during pass-installation collector');
const report = { schema: 'pass-installation-panel-v1', sourceBefore, sourceAfter,
  node: process.version, scriptSha256: fileHash('scripts/diag/pass-installation.ts'),
  sharedWorldSha256: fileHash('src/physics/world.ts'), cohort, rostersSha256: hash(teams),
  definitions: { permanent: 'Declared inline teBlock or back B with back:block. A check outlet remains receiving work.',
    onLine: 'Engine declared depth<=.6; endpoint inventory, not skeletal NFL officiating.',
    ticks: 'Public QB state points at a permanent protector during set, sampled before each native World step. Not an inferred eye gaze.',
    endpoints: 'Native-whistle or engine physical timeout; field/offense yards are before game-level penalty enforcement.',
    controls: 'Explicit identical Over nickel Cover3; tests production pass controllers, not automatic coordinator repair.' },
  summary: { censusPairs: census.length, coveredPairs: census.filter(r => r.coveredSkillSlots.length).length,
    coveredRoutePairs: census.filter(r => r.coveredRouteSlots.length).length,
    firstReadPermanentPairs: census.filter(r => r.firstReadPermanent).length,
    missingProgressionPairs: census.filter(r => r.missingProgression.length).length,
    nativeRows: rows.length, attempts: attempts.length, completions: sum('completed'), sacks: sum('sacked'),
    interceptions: rows.filter(r => r.stats.interceptedBy).length,
    timeToThrowMean: attempts.length ? attempts.reduce((n, r) => n + r.stats.timeToThrow!, 0) / attempts.length : null,
    setWithPermanentReadTicks: rows.reduce((n, r) => n + r.setWithPermanentReadTicks, 0),
    observerVerified: rows.filter(r => r.observerVerified).length,
    physicalTimeouts: rows.filter(r => r.outcome === 'timeout').length }, census, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
writeFileSync(output.replace(/\.json$/, '') + '-film.json.gz', gzipSync(JSON.stringify({ sourceBefore, sourceAfter, film }) + '\n'));
console.log(JSON.stringify({ output, source: sourceBefore, summary: report.summary }, null, 2));
