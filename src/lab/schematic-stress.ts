/**
 * Small, fixed schematic stress panel. Native rows run all 22 production
 * controllers and the ordinary World from a declared legal static install.
 * The separate moving-slice witness is reduced/staged, not simulated motion.
 * Outcomes are measurements; no fixture prescribes a block win or gain.
 */
import { createHash } from 'node:crypto';
import { CENTER_Y, FIELD_WIDTH } from '../core/field.js';
import { Rng } from '../core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../league/team.js';
import { formationKey } from '../playbook/alignment.js';
import { PASS_BY_ID, RUN_BY_ID } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../playbook/defense.js';
import { FORMATION_BY_ID } from '../playbook/formations.js';
import { OL_SLOTS, type DefPersonnelId, type DefSlot, type Formation, type Pressure } from '../playbook/types.js';
import { RunBlocker } from '../sim/behaviors/blocking.js';
import { ManCoverage } from '../sim/behaviors/defense.js';
import { RouteRunner } from '../sim/behaviors/receiver.js';
import { CoverageDefender } from '../sim/coverage/defender.js';
import { PlaySim, type PlaySetup } from '../sim/playsim.js';
import type { PlayResult } from '../sim/types.js';
import { motionContact, type MotionContactInput } from './motion-contact.js';

export const SCHEMATIC_STRESS_SCHEMA = 'schematic-stress-v1';
/** Absolute floating-point tolerances in native units, not outcome targets.
 * A 1e-6 impulse/work discrepancy is far below meaningful player motion. */
export const SCHEMATIC_NUMERICAL_TOLERANCES = {
  momentumResidual: 1e-6, workResidual: 1e-6, armImpulseExcess: 1e-6, armWorkExcess: 1e-6, motorWorkExcess: 1e-6,
} as const;
export const SCHEMATIC_STRESS_COHORT = {
  rosterSeeds: [31, 32], strength: .55, playSeed: 3, los: 40, ballY: CENTER_Y,
  selection: 'fixed-before-outcomes', nativeControllerDt: .05,
  sliceSeed: 7, sliceInitialSpeeds: [0, 4], sliceSubsteps: 12,
} as const;

/** Legal static 4x1 inventory: five OL and X/Y endpoints on; QB + Z/H/RB off.
 * Y is the on-line diamond point, Z/H flank it behind the LOS, RB is rear.
 * The stock quick-outs call below does NOT install a screen or bubble fake. */
export const STATIC_QUAD_DIAMOND: Formation = {
  id: 'lab_static_quad_diamond', name: 'Lab static quad diamond', personnel: '11', qb: 'gun', tags: ['empty', '4x1'],
  slots: { X: { side: 'L', split: 'inline', depth: .6 }, Y: { side: 'R', split: 10, depth: .6 },
    Z: { side: 'R', split: 11.4, depth: 1.6 }, H: { side: 'R', split: 8.6, depth: 1.6 },
    RB: { side: 'R', split: 10, depth: 2.6 } },
};
export const SCHEMATIC_EDGE_DROP: Pressure = {
  id: 'lab_schematic_edge_drop', name: 'Lab edge drop: three rush/eight cover', blitzers: {},
  droppers: { DE_W: 'curl_flat_w' }, coverages: ['cover4'],
};

export interface SchematicFixture {
  id: string;
  family: 'split' | 'counter' | 'bunch' | 'quad' | 'long-yardage';
  condition: 'ordinary' | 'adverse';
  formation: string;
  kind: 'run' | 'pass';
  concept: string;
  personnel: DefPersonnelId;
  front: string;
  coverage: string;
  edge?: 'box' | 'spill';
  dropEdge?: boolean;
  down?: number;
  distance?: number;
  question: string;
  changedFactors: readonly string[];
}

export const SCHEMATIC_FIXTURES: readonly SchematicFixture[] = [
  { id: 'SS-01', family: 'split', condition: 'ordinary', formation: 'gun_wing_12', kind: 'run', concept: 'split_zone',
    personnel: 'nickel', front: 'over', coverage: 'cover3', question: 'Does a stationary slice fit actual edge contact behind the OL?', changedFactors: ['front'] },
  { id: 'SS-02', family: 'split', condition: 'adverse', formation: 'gun_wing_12', kind: 'run', concept: 'split_zone',
    personnel: 'nickel', front: 'wide9', coverage: 'cover3', question: 'Can the same slice reach a wider edge without a guaranteed kickout?', changedFactors: ['front'] },
  { id: 'SS-03', family: 'counter', condition: 'ordinary', formation: 'i_pro_21', kind: 'run', concept: 'counter',
    personnel: 'base43', front: 'over', coverage: 'cover3', edge: 'spill', question: 'How do two pullers fit traffic and a spilling edge?', changedFactors: ['front'] },
  { id: 'SS-04', family: 'counter', condition: 'adverse', formation: 'i_pro_21', kind: 'run', concept: 'counter',
    personnel: 'base43', front: 'under', coverage: 'cover3', edge: 'spill', question: 'Does changed front geometry disrupt kick/wrap timing?', changedFactors: ['front'] },
  { id: 'SS-05', family: 'bunch', condition: 'ordinary', formation: 'gun_bunch_11', kind: 'pass', concept: 'mesh',
    personnel: 'nickel', front: 'over', coverage: 'cover1_off', question: 'How does off-man handle native Bunch Mesh with its missing second crosser?', changedFactors: ['coverage install: press and underneath seat'] },
  { id: 'SS-06', family: 'bunch', condition: 'adverse', formation: 'gun_bunch_11', kind: 'pass', concept: 'mesh',
    personnel: 'nickel', front: 'over', coverage: 'cover1', question: 'Do press contacts amplify the degraded Bunch Mesh/traffic installation?', changedFactors: ['coverage install: press and underneath seat'] },
  { id: 'SS-07', family: 'quad', condition: 'ordinary', formation: 'gun_empty_11', kind: 'pass', concept: 'quick_outs',
    personnel: 'dime', front: 'over', coverage: 'cover4', question: 'What are native quick-game ownership and route timings in 3x2?', changedFactors: ['formation and resultant numbering/check/alignment'] },
  { id: 'SS-08', family: 'quad', condition: 'adverse', formation: STATIC_QUAD_DIAMOND.id, kind: 'pass', concept: 'quick_outs',
    personnel: 'dime', front: 'over', coverage: 'cover4', question: 'Can a legal static 4x1 expose numbering/check/traffic holes?', changedFactors: ['formation and resultant numbering/check/alignment'] },
  { id: 'SS-09', family: 'long-yardage', condition: 'ordinary', formation: 'gun_doubles_11', kind: 'run', concept: 'iz_strong',
    personnel: 'dime', front: 'over', coverage: 'cover4', down: 3, distance: 27,
    question: 'What gain and recognition occur against four rushers at third&27?', changedFactors: ['DE_W drop and coverage-seat allocation'] },
  { id: 'SS-10', family: 'long-yardage', condition: 'adverse', formation: 'gun_doubles_11', kind: 'run', concept: 'iz_strong',
    personnel: 'dime', front: 'over', coverage: 'cover4', down: 3, distance: 27, dropEdge: true,
    question: 'What changes when an actual edge covers instead of rushing?', changedFactors: ['DE_W drop and coverage-seat allocation'] },
];

export const schematicHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const q = (n: number) => Math.round(n * 1e9) / 1e9;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export function createSchematicTeams() {
  return { offense: generateTeam(new Rng(SCHEMATIC_STRESS_COHORT.rosterSeeds[0]), 'Schematic offense', 'SOF', { strength: .55 }),
    defense: generateTeam(new Rng(SCHEMATIC_STRESS_COHORT.rosterSeeds[1]), 'Schematic defense', 'SDF', { strength: .55 }) };
}

/** Formation depth is the engine's declared on/off approximation, not a full
 * feet/jersey/officiating rule. Refuse ambiguity and covered eligible ends. */
export function auditSchematicFormation(formation: Formation) {
  const skills = Object.entries(formation.slots).map(([slot, align]) => {
    if (!align || !Number.isFinite(align.depth) || align.depth < .5 || (align.depth > .6 && align.depth < 1.2))
      throw new Error(`Ambiguous line status ${slot}`);
    return { slot, ...align, onLine: align.depth <= .6 };
  });
  if (skills.length !== 5) throw new Error('Install requires five eligible skill slots');
  const ends = skills.filter(s => s.onLine);
  if (ends.length !== 2 || ends.some(s => s.side === 'C') || ends[0].side === ends[1].side)
    throw new Error('Install requires exactly two eligible line endpoints, one per side');
  if (ends.some(s => s.split === 'core' || (typeof s.split === 'number' && s.split <= 2.6)))
    throw new Error('Eligible line endpoint cannot be inside the offensive tackle');
  // Any other skill player on the line would have covered an eligible end;
  // exactly two and one per side leaves the five OL interior and eligible ends.
  return { convention: 'OL .55yd; declared skill .5–.6yd on, >=1.2yd off; not skeletal officiating',
    onLineCount: OL_SLOTS.length + ends.length, offLineCount: 1 + skills.filter(s => !s.onLine).length,
    endpoints: ends.map(s => s.slot), skills, movingOffensivePlayers: 0, allInitiallyStationary: true };
}

export function schematicSetup(fixture: SchematicFixture, flip = false, record = false,
  teams = createSchematicTeams()): PlaySetup {
  const formation = fixture.formation === STATIC_QUAD_DIAMOND.id ? STATIC_QUAD_DIAMOND : FORMATION_BY_ID[fixture.formation];
  const front = FRONT_BY_ID[fixture.front], coverage = COVERAGE_BY_ID[fixture.coverage];
  if (!formation || !front || !coverage || !front.personnel.includes(fixture.personnel)
    || !(fixture.kind === 'run' ? RUN_BY_ID[fixture.concept] : PASS_BY_ID[fixture.concept]))
    throw new Error('Unsupported schematic fixture');
  auditSchematicFormation(formation);
  return { offense: pickOffense(teams.offense, formation.personnel), defense: pickDefense(teams.defense, fixture.personnel),
    offCall: { formation, flip, kind: fixture.kind,
      ...(fixture.kind === 'run' ? { run: RUN_BY_ID[fixture.concept] } : { pass: PASS_BY_ID[fixture.concept] }),
      label: `${fixture.id} ${formation.name} · ${fixture.concept}` },
    defCall: { personnel: fixture.personnel, front, coverage, pressure: fixture.dropEdge ? SCHEMATIC_EDGE_DROP : null,
      zoneStyle: fixture.family === 'long-yardage' ? 'spot' : 'match',
      ...(fixture.edge ? { runPolicy: { edge: fixture.edge, linebacker: 'stack' as const } } : {}),
      label: `${fixture.id} ${front.name} · ${coverage.name}` },
    los: SCHEMATIC_STRESS_COHORT.los, ballY: CENTER_Y,
    firstDownX: SCHEMATIC_STRESS_COHORT.los + (fixture.distance ?? 10), down: fixture.down ?? 1,
    seed: SCHEMATIC_STRESS_COHORT.playSeed, hurry: false, audibles: false,
    record, recordLevel: 'full', recordEvery: 1 };
}

export function auditSchematicSnap(sim: PlaySim) {
  const legality = auditSchematicFormation(sim.offCall.formation);
  if (sim.offense.length !== 11 || sim.defense.length !== 11 || sim.agents.length !== 22
    || new Set(sim.agents.map(a => a.player.id)).size !== 22) throw new Error('Fixture requires 22 unique actual players');
  for (const a of sim.agents) {
    if (!Number.isFinite(a.pos.x + a.pos.y + a.vel.x + a.vel.y) || a.pos.x <= 0 || a.pos.x >= 120 || a.pos.y <= 0 || a.pos.y >= FIELD_WIDTH)
      throw new Error(`Invalid snap location ${a.slot}`);
    if (a.team === 'O' && Math.hypot(a.vel.x, a.vel.y) !== 0) throw new Error('Native static fixture contains fabricated motion');
  }
  const line = sim.offense.filter(a => (OL_SLOTS as readonly string[]).includes(a.slot)
    || legality.endpoints.includes(a.slot)).sort((a, b) => a.pos.y - b.pos.y);
  if (!legality.endpoints.includes(line[0].slot) || !legality.endpoints.includes(line.at(-1)!.slot))
    throw new Error('Actual line geometry covers an eligible endpoint');
  for (let i = 0; i < sim.offense.length; i++) for (let j = i + 1; j < sim.offense.length; j++) {
    const a = sim.offense[i], b = sim.offense[j];
    if (Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) < a.profile.radius + b.profile.radius)
      throw new Error(`Overlapping offensive snap bodies ${a.slot}/${b.slot}`);
  }
  const defenders = sim.defense.map(a => ({ slot: a.slot, idx: a.idx, playerId: a.player.id,
    role: copy(sim.defAlign.spots[a.slot as DefSlot]!.role), behavior: a.behavior.kind,
    target: a.behavior instanceof ManCoverage || a.behavior instanceof CoverageDefender ? a.behavior.target?.idx ?? null : null,
    runFit: a.runFit ? { ...a.runFit } : null, read: a.recog?.read ?? null,
    priorPassProbability: a.recog?.pPass() ?? null, snapReadyAt: a.snapReadyAt }));
  const offense = sim.offense.map(a => ({ slot: a.slot, idx: a.idx, playerId: a.player.id, pos: { ...a.pos },
    vel: { ...a.vel }, behavior: a.behavior.kind, ref: sim.offAlign.refOf[a.slot as keyof typeof sim.offAlign.refOf] ?? null,
    route: a.behavior instanceof RouteRunner ? a.behavior.route.id : null,
    runPlan: a.behavior instanceof RunBlocker ? { kind: a.behavior.plan.kind, target: a.behavior.target?.slot ?? null,
      climbTo: a.behavior.plan.climbTo?.slot ?? null, pullRole: a.behavior.plan.pullRole ?? null,
      pullPath: a.behavior.plan.pullPath ?? null } : null }));
  return { legality, formationKey: formationKey(sim.offAlign), counts: { ...sim.offAlign.counts },
    calledCoverage: sim.defCall.coverage.id, effectiveCoverage: sim.defAlign.coverage.id,
    rushCount: defenders.filter(a => a.role.kind === 'rush' || a.role.kind === 'blitz').length,
    coverageCount: defenders.filter(a => a.role.kind !== 'rush' && a.role.kind !== 'blitz').length,
    offense, defenders, context: { ...sim.snapContext },
    initialBodies: sim.agents.map(a => ({ idx: a.idx, slot: a.slot, playerId: a.player.id, body: copy(a.body) })),
    initialPrimaryRng: { ...sim.rng }, initialHistory: 'Native constructor perception history; no staged offensive movement',
    profileSha256: schematicHash(sim.agents.map(a => ({ slot: a.slot, playerId: a.player.id, profile: a.profile }))),
    geometrySha256: schematicHash(sim.agents.map(a => ({ slot: a.slot, pos: a.pos, vel: a.vel }))) };
}

export function assertSchematicFinite(value: unknown, path = 'report'): void {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Nonfinite ${path}`);
  if (Array.isArray(value)) value.forEach((v, i) => assertSchematicFinite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => assertSchematicFinite(v, `${path}.${k}`));
}

export function assertSchematicBudgets(invariants: Record<keyof typeof SCHEMATIC_NUMERICAL_TOLERANCES, number>) {
  assertSchematicFinite(invariants, 'physics-invariants');
  for (const [key, tolerance] of Object.entries(SCHEMATIC_NUMERICAL_TOLERANCES)) {
    const value = invariants[key as keyof typeof SCHEMATIC_NUMERICAL_TOLERANCES];
    if (Math.abs(value) > tolerance) throw new Error(`Material physics discrepancy ${key}: ${value} > ${tolerance}`);
  }
}

const signature = (sim: PlaySim, result: PlayResult) => schematicHash({ result: { ...result, frames: undefined, telemetry: undefined },
  bodies: sim.agents.map(a => a.body), intents: sim.intents, rng: { ...sim.rng } });

/** Observers only copy already-consumed see results / achieved World reports.
 * No read is invoked to populate a diagnostic, and no extra RNG is consumed. */
export function runSchematicFixture(fixture: SchematicFixture, flip = false,
  options: { record?: boolean; observe?: boolean; verifyObserver?: boolean } = {}, teams = createSchematicTeams()) {
  const input = schematicSetup(fixture, flip, options.record ?? false, teams), sim = new PlaySim(input), snap = auditSchematicSnap(sim);
  const observe = options.observe ?? true, originalStep = sim.world.step, originalSee = sim.see;
  const cues: Array<{ t: number; observer: string; target: string; position: { x: number; y: number }; velocity: { x: number; y: number }; age: number | null }> = [];
  const firstCues = new Set<string>(); let consumedSeeCalls = 0;
  const commandSamples: unknown[] = [], sampleTimes = [0, .25, .5, 1, 1.5, 2, 3, 4, 6];
  const falls: Array<{ t: number; slot: string; cause: string | null }> = [];
  const invariants = { momentumResidual: 0, workResidual: 0, armImpulseExcess: 0, armWorkExcess: 0,
    motorWorkExcess: 0, maxPenetration: 0 };
  let firstLOSAt: number | null = null, bodyContactIntervals = 0, teammateContactIntervals = 0, loadedHandIntervals = 0;
  let firstBodyContact: unknown = null, firstLoadedHands: unknown = null;
  const loadedBlockers = new Set<string>(), supportStates = new Set<string>();
  if (observe) {
    sim.see = function (a, b, delayScale) {
      const p = originalSee.call(this, a, b, delayScale); consumedSeeCalls++;
      const key = `${a.idx}:${b.idx}`;
      if (!firstCues.has(key)) { firstCues.add(key); cues.push({ t: q(this.t), observer: a.slot, target: b.slot,
        position: { ...p.pos }, velocity: { ...p.vel }, age: p.age ?? null }); }
      return p;
    };
    sim.world.step = function (intents, dt) {
      const p0 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
      const r = originalStep.call(this, intents, dt);
      const p1 = this.bodies.reduce((p, b) => ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });
      const ground = r.groundImpulse.reduce((p, j) => ({ x: p.x + j.x, y: p.y + j.y }), { x: 0, y: 0 });
      invariants.momentumResidual = Math.max(invariants.momentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
      invariants.workResidual = Math.max(invariants.workResidual, Math.abs(r.work.residual));
      invariants.maxPenetration = Math.max(invariants.maxPenetration, r.maxPenetration);
      for (let i = 0; i < sim.agents.length; i++) {
        invariants.armImpulseExcess = Math.max(invariants.armImpulseExcess, r.armImpulse[i] - r.armImpulseLimit[i]);
        invariants.armWorkExcess = Math.max(invariants.armWorkExcess, r.armWork[i] - r.armWorkLimit[i]);
        invariants.motorWorkExcess = Math.max(invariants.motorWorkExcess, r.supportMotorWork[i] - r.supportMotorWorkLimit[i]);
        const a = sim.agents[i], { since, ...support } = a.body.support!;
        supportStates.add(a.body.support?.state ?? 'absent');
        // newSupport.since=-Infinity means "never transitioned"; it is a
        // lifecycle sentinel, not a physical coordinate or numeric failure.
        assertSchematicFinite({ pos: a.pos, vel: a.vel, facing: a.facing, energy: a.body.energy, support,
          since: since === -Infinity ? null : since }, `body:${a.slot}`);
      }
      const body = r.contacts.filter(c => c.impulse > 0), friendly = body.filter(c => sim.agents[c.i].team === sim.agents[c.j].team);
      bodyContactIntervals += Number(body.length > 0); teammateContactIntervals += Number(friendly.length > 0);
      if (body.length && firstBodyContact === null) firstBodyContact = { interval: [sim.t, sim.t + dt], contacts: copy(body) };
      const loaded = sim.engagements.filter(e => e.hands && Math.hypot(e.hands.normalForce ?? 0, e.hands.tangentForce ?? 0) > 0);
      const helpers = sim.engagements.flatMap(e => [...(e.helperHands?.entries() ?? [])].filter(([, h]) => Math.hypot(h.normalForce ?? 0, h.tangentForce ?? 0) > 0));
      loadedHandIntervals += Number(loaded.length + helpers.length > 0);
      for (const e of loaded) loadedBlockers.add(e.blocker.slot);
      for (const [h] of helpers) loadedBlockers.add(h.slot);
      if (loaded.length + helpers.length > 0 && firstLoadedHands === null) firstLoadedHands = { interval: [sim.t, sim.t + dt],
        primary: loaded.map(e => ({ blocker: e.blocker.slot, defender: e.defender.slot, normalForce: e.hands!.normalForce,
          tangentForce: e.hands!.tangentForce, capacity: { push: e.hands!.push, hold: e.hands!.hold, steer: e.hands!.steer } })),
        helpers: helpers.map(([h, joint]) => ({ blocker: h.slot, normalForce: joint.normalForce, tangentForce: joint.tangentForce })) };
      for (const i of r.falls) falls.push({ t: q(sim.t + dt), slot: sim.agents[i].slot, cause: sim.agents[i].body.support?.cause ?? null });
      if (firstLOSAt === null && sim.carrier?.team === 'O' && sim.carrier !== sim.qb && sim.carrier.pos.x >= sim.los) firstLOSAt = q(sim.t + dt);
      if (sampleTimes.length && sim.t + 1e-8 >= sampleTimes[0]) {
        sampleTimes.shift(); commandSamples.push({ at: q(sim.t), afterPhysicsAt: q(sim.t + dt),
          ballKind: sim.ball.kind, carrier: sim.carrier?.slot ?? null,
          agents: sim.agents.map(a => ({ slot: a.slot, behavior: a.behavior.kind,
            position: { ...a.pos }, velocity: { ...a.vel }, intent: copy(intents[a.idx]),
            support: a.body.support ? { state: a.body.support.state, posture: a.body.support.posture,
              xi: { ...a.body.support.xi }, felt: { ...a.body.support.felt } } : null,
            read: a.recog?.read ?? null,
            block: a.behavior instanceof RunBlocker ? { kind: a.behavior.plan.kind, target: a.behavior.target?.slot ?? null,
              climbTo: a.behavior.plan.climbTo?.slot ?? null, pullRole: a.behavior.plan.pullRole ?? null } : null,
            coverageRule: a.behavior instanceof CoverageDefender ? a.behavior.recordedRule(sim.t) : null })) });
      }
      return r;
    };
  }
  let result: PlayResult;
  try { result = sim.run(); } finally { sim.world.step = originalStep; sim.see = originalSee; }
  const physicalSignature = signature(sim, result), contact = sim.events.find(e => e.type === 'carrier_contact');
  let observerVerified: boolean | null = null;
  if (options.verifyObserver) {
    const plain = new PlaySim({ ...input, record: false }); observerVerified = physicalSignature === signature(plain, plain.run());
    if (!observerVerified) throw new Error(`Observer altered ${fixture.id}`);
  }
  const metrics = { outcome: result.outcome, duration: result.duration, offenseYardsBeforePenalties: result.offenseYards,
    fieldGainBeforePenalties: result.yards, conversionBeforePenalties: !result.turnover && result.endX >= sim.firstDownX,
    turnover: result.turnover, penalty: result.penalty?.kind ?? null, handoffAt: sim.handoffAt < 0 ? null : sim.handoffAt,
    throwAt: sim.throwAt < 0 ? null : sim.throwAt, catchAt: sim.catchAt < 0 ? null : sim.catchAt,
    firstLOSAt, firstCarrierContactAt: contact?.t ?? null,
    yardsBeforeCarrierContact: sim.firstContactX === null ? null : sim.firstContactX - sim.los,
    firstLoadedBlockEventAt: sim.events.find(e => e.type === 'block_contact')?.t ?? null,
    climbs: sim.events.filter(e => e.type === 'block_climb').length, exchanges: sim.events.filter(e => e.type === 'block_exchange').length,
    bodyContactIntervals: observe ? bodyContactIntervals : null, teammateContactIntervals: observe ? teammateContactIntervals : null,
    loadedHandIntervals: observe ? loadedHandIntervals : null, loadedBlockers: [...loadedBlockers],
    pressured: result.stats.pressured, completed: result.stats.completed, sacked: result.stats.sacked,
    missedTackles: result.stats.missedTackles, brokenTackles: result.stats.brokenTackles,
    ending: result.outcome === 'timeout' ? 'engine-physical-timeout' : 'native-whistle' };
  const row = { id: `${fixture.id}-${flip ? 'flipped' : 'written'}`, fixture, seed: SCHEMATIC_STRESS_COHORT.playSeed,
    flip, setupKind: 'native-static-11v11', inputSha256: schematicHash({ ...input, record: undefined, recordLevel: undefined, recordEvery: undefined }),
    snap, metrics, physicalSignature, observerVerified, consumedSeeCalls: observe ? consumedSeeCalls : null, consumedCues: cues,
    firstBodyContact, firstLoadedHands, falls, supportStates: [...supportStates], invariants: observe ? invariants : null,
    commandSamples, events: copy(sim.events), decisions: copy(sim.trace.data?.decisions ?? []),
    missingCauses: 'Consumed inputs and emitted choices do not establish a causal cue unless the existing controller exposes one.' };
  assertSchematicFinite(row);
  if (observe) assertSchematicBudgets(invariants);
  const film = options.record ? { id: row.id, setupKind: row.setupKind, offCall: input.offCall.label, defCall: input.defCall.label,
    down: input.down, distance: sim.firstDownX - sim.los, los: sim.los, firstDownX: sim.firstDownX,
    result, players: sim.agents.map(a => ({ slot: a.slot, team: a.team, name: a.name, jersey: a.player.jersey,
      position: a.player.position, profile: a.profile })) } : null;
  return { row, film };
}

/** Reuse the existing reduced TE/end fixture instead of staging native motion
 * or silently changing mesh/controller history in a supposed natural play. */
export function runSchematicSlice(input: MotionContactInput, verifyObserver = false) {
  const rep = motionContact(input, { observe: true, recording: verifyObserver });
  let observerVerified: boolean | null = null;
  if (verifyObserver) {
    const plain = motionContact(input, { observe: false, recording: false });
    observerVerified = schematicHash({ history: rep.physicalHistory, rng: rep.rngNext }) === schematicHash({ history: plain.physicalHistory, rng: plain.rngNext });
    if (!observerVerified) throw new Error('Reduced slice observer altered physical history');
  }
  const { frames: _frames, physicalHistory: _history, recording, ...row } = rep;
  assertSchematicBudgets(rep.invariants);
  return { row: { ...row, setupKind: 'reduced-staged-snap-momentum', ending: 'inspection-censor', observerVerified }, recording };
}

export const SCHEMATIC_LIMITATIONS = [
  'Ten fixed native installs and one generated roster pair are debugging witnesses, not NFL rates or a complete schematic evaluation.',
  'Native flips change strength/slot responsibilities and preserve slot-specific traits; they are not exact mathematical mirrors.',
  'Formation legality audits the declared engine depth/end inventory. It does not enforce every NFL jersey, foot, substitution or contact rule.',
  'Quad diamond is a legal static 4x1 with stock quick-outs and fallback clearouts, not a screen install or evidence of handling presnap motion.',
  'Offensive presnap motion/history, bubble execution and complete screen blocking remain unsupported; the reduced slice does not answer those information questions.',
  'Bunch man comparison changes both press and the underneath seat because those are distinct existing calls, not a pure press-parameter treatment.',
  'Stock Mesh in 3x1 Bunch installs S2 shallow but has no W2 for shallow_high; these rows expose a degraded one-crosser installation, not a complete Mesh test.',
  'Native empty recognition currently treats an aligned RB slot as a back; the snap context is reported without correcting that engine assumption.',
  'Third&27 uses stock safety depth and real four-front-player dime roles; an edge drop creates three rush/eight cover, not new three-DL prevent personnel.',
  'Native outcomes include engine timeouts. Reduced slice endings are 2.5-second inspection censors and have no credited football yards.',
  'Force/work budget closure establishes consistency, not NFL strength calibration. Impulse/work closure and budget tolerances are absolute 1e-6 in native units; penetration is reported without inventing an acceptance bound. Hand force samples, body impacts and engagement labels are distinct.',
  'Read witnesses are actual already-consumed see calls. Missing causes stay unknown; body facing does not measure eyes.',
  'Full recording and read-only observers are compared with plain execution on predetermined witnesses, not every possible interaction.',
] as const;
