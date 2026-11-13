/** A matched actual 11v11 job-ledger probe, not a complete NFL prevent scheme.
 * node --import tsx scripts/diag/long-yardage-run.ts [out/long-yardage-run/panel.json]
 * Stock dime/Over/spot Quarters. The existing pressure dropper API makes the
 * weak edge cover a curl-flat: four front players, three rushers, eight cover.
 * Factorial down/distance and dropper comparisons keep rosters and seeds fixed.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { CENTER_Y, FIELD_WIDTH } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { DefSlot, Pressure } from '../../src/playbook/types.js';
import { ZoneCoverage } from '../../src/sim/behaviors/defense.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

export const LONG_YARDAGE_COHORT = {
  rosterSeeds: [[31, 32], [41, 42]], strength: .55, playSeed: 3,
  runs: ['iz_strong', 'draw'] as const, flips: [false, true],
  situations: ['1st10', '3rd27'] as const, looks: ['rush4', 'drop3'] as const,
  formation: 'gun_doubles_11', personnel: 'dime', front: 'over', coverage: 'cover4', zoneStyle: 'spot',
  los: 40, ballY: CENTER_Y, hurry: false,
};
type Situation = typeof LONG_YARDAGE_COHORT.situations[number];
type Look = typeof LONG_YARDAGE_COHORT.looks[number];
type Run = typeof LONG_YARDAGE_COHORT.runs[number];
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const q = (n: number) => Math.round(n * 1e9) / 1e9;
const average = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const EDGE_DROP: Pressure = {
  id: 'lab_weak_edge_drop', name: 'Lab weak-edge drop (three rushers/eight cover)',
  blitzers: {}, droppers: { DE_W: 'curl_flat_w' }, coverages: ['cover4'],
};

export function createLongYardageTeams(index: number) {
  const seeds = LONG_YARDAGE_COHORT.rosterSeeds[index];
  if (!seeds) throw new Error('Unknown roster pair');
  return {
    offense: generateTeam(new Rng(seeds[0]), `Long-yardage offense ${index + 1}`, `LO${index + 1}`, { strength: .55 }),
    defense: generateTeam(new Rng(seeds[1]), `Long-yardage defense ${index + 1}`, `LD${index + 1}`, { strength: .55 }),
  };
}

export function longYardageSetup(teams: ReturnType<typeof createLongYardageTeams>, run: Run,
  situation: Situation, look: Look, flip: boolean, record = false): PlaySetup {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return { offense: pickOffense(teams.offense, formation.personnel), defense: pickDefense(teams.defense, 'dime'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: `${formation.name} · ${RUN_BY_ID[run].name}` },
    defCall: { personnel: 'dime', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, zoneStyle: 'spot',
      pressure: look === 'drop3' ? EDGE_DROP : null,
      label: `Dime Over · spot Quarters · ${look === 'drop3' ? 'DE_W drops; three rush/eight cover' : 'four rush/seven cover'}` },
    los: LONG_YARDAGE_COHORT.los, ballY: CENTER_Y, firstDownX: 40 + (situation === '3rd27' ? 27 : 10),
    down: situation === '3rd27' ? 3 : 1, hurry: false, audibles: false,
    seed: LONG_YARDAGE_COHORT.playSeed, record, recordLevel: 'full', recordEvery: 1 };
}

/** Actual assigned seats and controllers, not the declared coverage name. */
export function auditSnap(sim: PlaySim) {
  if (sim.offense.length !== 11 || sim.defense.length !== 11 || sim.agents.length !== 22)
    throw new Error('Stress fixture must have 11 actual players per side');
  if (new Set(sim.agents.map(a => a.player.id)).size !== 22) throw new Error('Duplicated player identity');
  for (const a of sim.agents) if (a.pos.y <= 0 || a.pos.y >= FIELD_WIDTH || a.pos.x <= 0 || a.pos.x >= 120)
    throw new Error(`Illegal starting field location ${a.slot}`);
  const defenders = sim.defense.map(a => {
    const spot = sim.defAlign.spots[a.slot as DefSlot]!;
    if (!a.runFit || !a.recog) throw new Error(`Missing live recognition/run-fit contract ${a.slot}`);
    const landmark = a.behavior instanceof ZoneCoverage ? a.behavior.recordedLandmark() : null;
    return { slot: a.slot, playerId: a.player.id, role: spot.role, behavior: a.behavior.kind,
      depth: q(a.pos.x - sim.los), y: q(a.pos.y), landmark,
      runFit: { ...a.runFit }, priorPassProbability: q(a.recog.pPass()), initialRead: a.recog.read,
      snapReadyAt: q(a.snapReadyAt), readGate: q(a.readAt) };
  });
  const rushers = defenders.filter(a => a.role.kind === 'rush' || a.role.kind === 'blitz');
  const covers = defenders.filter(a => a.role.kind !== 'rush' && a.role.kind !== 'blitz');
  const dropped = sim.defCall.pressure?.droppers?.DE_W !== undefined;
  if (rushers.length !== (dropped ? 3 : 4) || covers.length !== (dropped ? 8 : 7))
    throw new Error('Actual snap roles disagree with intended three/eight or four/seven probe');
  if (defenders.filter(a => a.behavior === 'rush' || a.behavior === 'blitz').length !== rushers.length)
    throw new Error('Snap controllers disagree with role ledger');
  if (defenders.some(a => a.initialRead !== 'unsure')) throw new Error('Hidden run call pre-informed the defense');
  return { offenseCount: sim.offense.length, defenseCount: sim.defense.length,
    rushCount: rushers.length, coverageCount: covers.length, defenders,
    offGeometry: sim.offense.map(a => ({ slot: a.slot, x: a.pos.x, y: a.pos.y })),
    profileSha256: hash(sim.agents.map(a => ({ id: a.player.id, slot: a.slot, profile: a.profile }))),
    alignedGeometrySha256: hash(sim.agents.map(a => ({ slot: a.slot, pos: a.pos, vel: a.vel }))) };
}

function physicalSignature(sim: PlaySim, result: PlayResult) {
  return hash({ result: { ...result, frames: undefined, telemetry: undefined }, bodies: sim.agents.map(a => a.body),
    intents: sim.intents, rng: { ...sim.rng } });
}
function finite(value: unknown, path = 'report'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Nonfinite ${path}`);
  if (Array.isArray(value)) value.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => finite(v, `${path}.${k}`));
}

function trial(input: PlaySetup, roster: number, run: Run, situation: Situation, look: Look, flip: boolean) {
  const id = `LY-R${roster + 1}-${run}-${situation}-${look}-${flip ? 'L' : 'R'}`;
  const sim = new PlaySim(input), snap = auditSnap(sim), original = sim.world.step;
  let maxMomentumResidual = 0, maxWorkResidual = 0, maxMotorWorkExcess = 0;
  let firstActualRushControllerCount: number | null = null, firstLOSAt: number | null = null;
  const decisions: unknown[] = [], reads = new Map(sim.defense.map(a => [a.idx, a.recog!.read]));
  const sampleTimes = [0, .25, .5, 1, 1.5, 2, 3, 5], snapshots: unknown[] = [];
  sim.world.step = function (intents, dt) {
    const p0 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
    const report = original.call(this, intents, dt);
    const p1 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
    const ground = report.groundImpulse.reduce((p, j) => ({ x: p.x + j.x, y: p.y + j.y }), { x: 0, y: 0 });
    maxMomentumResidual = Math.max(maxMomentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
    for (let i = 0; i < report.supportMotorWork.length; i++)
      maxMotorWorkExcess = Math.max(maxMotorWorkExcess, report.supportMotorWork[i] - report.supportMotorWorkLimit[i]);
    if (firstActualRushControllerCount === null)
      firstActualRushControllerCount = sim.defense.filter(a => a.behavior.kind === 'rush' || a.behavior.kind === 'blitz').length;
    for (const a of sim.defense) if (reads.get(a.idx) !== a.recog!.read) {
      decisions.push({ t: q(sim.t), slot: a.slot, previous: reads.get(a.idx), read: a.recog!.read,
        passProbability: q(a.recog!.pPass()), changedMind: a.recog!.changedMind,
        behavior: a.behavior.kind, position: { ...a.pos },
        intendedVelocity: intents[a.idx] ? { ...intents[a.idx]!.vel } : null });
      reads.set(a.idx, a.recog!.read);
    }
    if (sampleTimes.length && sim.t + 1e-8 >= sampleTimes[0]) {
      sampleTimes.shift();
      snapshots.push({ t: q(sim.t), afterPhysicsAt: q(sim.t + dt), carrier: sim.carrier?.slot ?? null,
        defenders: sim.defense.map(a => ({ slot: a.slot, read: a.recog!.read, passProbability: q(a.recog!.pPass()),
          behavior: a.behavior.kind, position: { ...a.pos }, velocity: { ...a.vel },
          intendedVelocity: intents[a.idx] ? { ...intents[a.idx]!.vel } : null, runFit: a.runFit,
          engagedWith: a.engagement?.blocker.slot ?? null })) });
    }
    const c = sim.carrier;
    if (firstLOSAt === null && c?.team === 'O' && c !== sim.qb && c.pos.x >= sim.los) firstLOSAt = q(sim.t + dt);
    return report;
  };
  const result = sim.run(); sim.world.step = original;
  if (firstActualRushControllerCount !== snap.rushCount) throw new Error('Actual first-step jobs differ from snap audit');
  const signature = physicalSignature(sim, result);
  let observerVerified: boolean | null = null;
  if (input.record) {
    const control = new PlaySim({ ...input, record: false });
    observerVerified = signature === physicalSignature(control, control.run());
    if (!observerVerified) throw new Error(`Observer/recording changes physical state or RNG in ${id}`);
  }
  const contact = sim.events.find(e => e.type === 'carrier_contact');
  const distance = sim.firstDownX - sim.los;
  const film = input.record ? { id, selection: 'fixed-before-outcomes: roster1/right/3rd27/both concepts and both looks',
    roster, run, situation, look, flip, seed: LONG_YARDAGE_COHORT.playSeed, down: input.down,
    distance, los: sim.los, firstDownX: sim.firstDownX, offCall: input.offCall.label, defCall: input.defCall.label,
    result, snap, players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey,
      position: a.player.position, weightLb: a.player.measurables.weightLb, heightIn: a.player.measurables.heightIn, ratings: a.player.ratings })) } : null;
  const row = { id, roster, run, situation, look, flip, seed: LONG_YARDAGE_COHORT.playSeed, distance,
    inputSha256: hash({ ...input, record: undefined, recordLevel: undefined, recordEvery: undefined }),
    snap, firstActualRushControllerCount, signature, observerVerified,
    yardsBeforePenaltyEnforcement: result.offenseYards, fieldGainBeforePenaltyEnforcement: result.yards,
    reachesLineToGainBeforePenalties: !result.turnover && result.endX >= sim.firstDownX,
    outcome: result.outcome, duration: q(result.duration), clockStops: result.clockStops,
    turnover: result.turnover, penalty: result.penalty?.kind ?? null, firstLOSAt,
    handoffAt: sim.handoffAt < 0 ? null : q(sim.handoffAt),
    firstContact: contact ? { t: contact.t, carrier: contact.a === undefined ? null : sim.agents[contact.a].slot,
      defender: contact.b === undefined ? null : sim.agents[contact.b].slot, kind: contact.note ?? null,
      x: sim.firstContactX, yardsBeforeContact: sim.firstContactX === null ? null : sim.firstContactX - sim.los,
      afterTransfer: contact.t >= sim.handoffAt && sim.handoffAt >= 0 && contact.a !== sim.qb.idx } : null,
    missedAttempts: result.stats.missedTackles, brokenHolds: result.stats.brokenTackles,
    tackleEvents: result.events.filter(e => ['tackle', 'missed_tackle', 'broken_tackle', 'out_of_bounds'].includes(e.type)),
    defenderReadTiming: sim.defense.map(a => ({ slot: a.slot, finalRead: a.recog!.read, changedMind: a.recog!.changedMind,
      firstRunAt: sim.events.find(e => e.type === 'read' && e.a === a.idx && e.note?.startsWith('run;'))?.t ?? null,
      firstPassAt: sim.events.find(e => e.type === 'read' && e.a === a.idx && e.note?.startsWith('pass;'))?.t ?? null })),
    readTransitions: decisions, controllerSnapshots: snapshots,
    maxMomentumResidual, maxWorkResidual, maxMotorWorkExcess };
  finite(row); finite(film);
  return { row, film };
}

function summarize(rows: ReturnType<typeof trial>['row'][]) {
  const contacts = rows.flatMap(r => r.firstContact?.yardsBeforeContact === null || !r.firstContact ? [] : [r.firstContact]);
  return { snaps: rows.length, meanYards: average(rows.map(r => r.yardsBeforePenaltyEnforcement)),
    meanFirstContactTime: average(contacts.map(c => c.t)), meanYardsBeforeContact: average(contacts.map(c => c.yardsBeforeContact!)),
    conversionsBeforePenalties: rows.filter(r => r.reachesLineToGainBeforePenalties).length,
    gains10OrMore: rows.filter(r => r.yardsBeforePenaltyEnforcement >= 10).length,
    stuffs: rows.filter(r => r.yardsBeforePenaltyEnforcement <= 0).length,
    timeouts: rows.filter(r => r.outcome === 'timeout').length,
    defenderReadTiming: [...new Set(rows.flatMap(r => r.defenderReadTiming.map(d => d.slot)))].map(slot => {
      const defenders = rows.flatMap(r => r.defenderReadTiming.filter(d => d.slot === slot));
      return { slot, samples: defenders.length, runReadSamples: defenders.filter(d => d.firstRunAt !== null).length,
        meanFirstRunAt: average(defenders.flatMap(d => d.firstRunAt === null ? [] : [d.firstRunAt])),
        initialPassReadSamples: defenders.filter(d => d.firstPassAt !== null && (d.firstRunAt === null || d.firstPassAt < d.firstRunAt)).length,
        changedMindSamples: defenders.filter(d => d.changedMind).length };
    }),
    outcomes: Object.fromEntries([...new Set(rows.map(r => r.outcome))].map(k => [k, rows.filter(r => r.outcome === k).length])),
    maxMomentumResidual: Math.max(...rows.map(r => r.maxMomentumResidual)),
    maxWorkResidual: Math.max(...rows.map(r => r.maxWorkResidual)),
    maxMotorWorkExcess: Math.max(...rows.map(r => r.maxMotorWorkExcess)) };
}

function main() {
  const output = process.argv[2] ?? 'out/long-yardage-run/panel.json';
  if (process.argv.length > 3) throw new Error('Usage: long-yardage-run.ts [output.json]');
  const sourceBefore = sourceVersion(), startedAt = new Date().toISOString(), cpuStart = process.cpuUsage(), wallStart = performance.now();
  const rosterPairs = LONG_YARDAGE_COHORT.rosterSeeds.map((_, i) => createLongYardageTeams(i));
  const rows: ReturnType<typeof trial>['row'][] = [], films: NonNullable<ReturnType<typeof trial>['film']>[] = [];
  for (let roster = 0; roster < rosterPairs.length; roster++) for (const run of LONG_YARDAGE_COHORT.runs)
    for (const flip of LONG_YARDAGE_COHORT.flips) for (const situation of LONG_YARDAGE_COHORT.situations) for (const look of LONG_YARDAGE_COHORT.looks) {
      const record = roster === 0 && !flip && situation === '3rd27';
      const t = trial(longYardageSetup(rosterPairs[roster], run, situation, look, flip, record), roster, run, situation, look, flip);
      rows.push(t.row); if (t.film) films.push(t.film);
    }
  // Only these declared factors may change within a matched four-cell pair.
  for (const roster of [0, 1]) for (const run of LONG_YARDAGE_COHORT.runs) for (const flip of LONG_YARDAGE_COHORT.flips) {
    const pair = rows.filter(r => r.roster === roster && r.run === run && r.flip === flip);
    if (pair.length !== 4 || new Set(pair.map(r => r.snap.profileSha256)).size !== 1
      || new Set(pair.map(r => r.snap.alignedGeometrySha256)).size !== 1) throw new Error('Matched cohort changed profiles or alignment');
  }
  const cpu = process.cpuUsage(cpuStart), sourceAfter = sourceVersion();
  if (sourceBefore !== sourceAfter) throw new Error('Engine source changed during probe; refusing report');
  const report = { schema: 'long-yardage-run-v1', sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(),
    node: process.version, executable: process.execPath, argv: process.execArgv,
    scriptSha256: fileHash('scripts/diag/long-yardage-run.ts'), cohort: { ...LONG_YARDAGE_COHORT, rosterSha256: hash(rosterPairs),
      selectedProfilesSha256: hash(rows.map(r => ({ id: r.id, sha256: r.snap.profileSha256 }))), pressureDrop: EDGE_DROP },
    wallMs: performance.now() - wallStart, cpuMs: (cpu.user + cpu.system) / 1000,
    filmIds: films.map(f => f.id), observerVerifiedCount: rows.filter(r => r.observerVerified).length,
    definitions: { yards: 'PlaySim offenseYards before game-level penalty acceptance/enforcement; lost-fumble gain credited at fumble spot.',
      conversion: 'No turnover and final endX >= firstDownX before game-level penalty enforcement; field gain and conversion deliberately separate.',
      firstContact: 'First existing carrier_contact event: body contact or acquired grasp, not mere proximity or blocking contact.',
      firstLOS: 'First completed World step with a non-QB offensive carrier at or beyond LOS; tick-end sample, not exact substep crossing.',
      clock: 'Play duration and engine clockStops only; no quarter/time/score or game-level clock management in these isolated plays.',
      motion: 'No offensive presnap motion is added in this probe.',
      snapshots: 'Existing controller kind, intended movement and read at named native tick; read changes are observed facts, not invented choice causes.' },
    limitations: ['32 balanced synthetic plays, two roster pairs and one reused play seed are a debugging panel, not NFL rate estimates.',
      'This is a four-front-player dime package with one edge dropping; it is not three-DL NFL personnel or a complete prevent call.',
      'Stock spot Quarters uses actual snap safety depth12yd; third&27 changes belief prior/line to gain, not a new deep-shell depth policy.',
      'A 5–10yd run gain can coexist with a failed third&27 conversion; no fixed gain target or success bonus was applied.',
      'Existing recognition buckets all third&7+ together; there is no separate third&27 prior or clock/score policy here.',
      'Role/fit contracts and read transitions are audited; controller kind persists while its internal branches change, so snapshots do not prove which branch caused a movement.',
      'Read-only World observer and full recording are equivalence checked on four predetermined films, not every fixture.',
      'Observer signatures cover result/events, final bodies, intents and enumerable primary RNG state; they do not serialize private solver WeakMaps or the full controller object graph.',
      'Mirror calls reuse the same random stream but slot-specific traits/scatter are not mirrored anonymous bodies, so exact mirrored trajectories are not expected.'],
    summary: summarize(rows), groups: LONG_YARDAGE_COHORT.runs.flatMap(run => LONG_YARDAGE_COHORT.situations.flatMap(situation =>
      LONG_YARDAGE_COHORT.looks.map(look => ({ run, situation, look, ...summarize(rows.filter(r => r.run === run && r.situation === situation && r.look === look)) })))), rows };
  finite(report); mkdirSync(dirname(output), { recursive: true });
  const raw = JSON.stringify(report, null, 2) + '\n'; writeFileSync(output, raw); writeFileSync(output + '.gz', gzipSync(raw));
  const film = JSON.stringify({ schema: 'long-yardage-run-film-v1', sourceBefore, sourceAfter,
    scriptSha256: report.scriptSha256, cohort: report.cohort, limitations: report.limitations, plays: films }) + '\n';
  writeFileSync(output.replace(/\.json$/, '') + '-film.json.gz', gzipSync(film));
  console.log(JSON.stringify({ output, sourceBefore, summary: report.summary, groups: report.groups, filmIds: report.filmIds }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
