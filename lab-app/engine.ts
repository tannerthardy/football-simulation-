/**
 * Play Lab's only door into the engine. A recipe becomes an ordinary
 * PlaySetup; a run is an ordinary PlaySim run with recording on. Nothing here
 * moves a body, edits a result or draws anything the engine did not record.
 * Coach's-hand alignment reaches the engine through PlaySetup.alignment.
 */
import { createHash } from 'node:crypto';
import { CENTER_Y, FIELD_WIDTH, HASH_LEFT_Y, HASH_RIGHT_Y, OWN_GOAL_X } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { alignStyle, generateTeam, pickDefense, pickOffense, type Team } from '../src/league/team.js';
import { PASS_CONCEPTS, PASS_BY_ID, RUN_CONCEPTS, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGES, COVERAGE_BY_ID, FRONTS, FRONT_BY_ID, PRESSURES, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefPersonnelId, type DefSlot, type OffSlot } from '../src/playbook/types.js';
import { derivePhysical } from '../src/players/physical.js';
import { RATING_KEYS, type Measurables, type Player, type RatingKey } from '../src/players/types.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import { captureSetup, restoreSetup } from '../scripts/diag/saved-play.js';
import { engineSettings } from '../scripts/scorecard/provenance.js';
import { sourceVersion } from '../scripts/source-version.js';
import type { LedgerData } from '../src/sim/responsibility-ledger.js';
import { dutyTimeline, initialJobCensus } from '../src/sim/responsibility-views.js';

export const SCENARIO_FORMAT = 'play-lab-scenario-v1';

/** What Tanner picked in the builder; regenerated into a setup when it changes. */
export interface Recipe {
  rosterSeed: number;
  strength: number;
  offense: { formation: string; kind: 'run' | 'pass'; concept: string; flip: boolean };
  defense: { personnel: DefPersonnelId; front: string; coverage: string; pressure: string | null; zoneStyle: 'spot' | 'match' };
  /** ballOn: yards from the offense's own goal line (1–99). Hash from the offense's view. */
  situation: { down: number; distance: number; ballOn: number; hash: 'left' | 'middle' | 'right' };
  seed: number;
  audibles: boolean;
  /** Replace the depth chart's pick at a slot with another player from the same team. */
  picks: Array<{ team: 'O' | 'D'; slot: string; playerId: string }>;
  edits: Array<{ playerId: string; ratings?: Partial<Record<RatingKey, number>>; measurables?: Partial<Measurables> }>;
}

/** A human change to the play. Always shown as the coach's hand, never as a player's choice. */
export interface Intervention {
  id: string;
  kind: 'align';
  by: "coach's hand";
  team: 'O' | 'D';
  slot: string;
  playerId: string;
  /** Where the engine's own rules put him, and where the coach put him (play-frame yards). */
  from: { x: number; y: number };
  to: { x: number; y: number };
  note?: string;
}

export interface StoredSetup { encoding: 'v8-base64'; sha256: string; bytes: string }

export interface Scenario {
  format: typeof SCENARIO_FORMAT;
  id: string;
  name: string;
  created: string;
  /** Absent for an imported saved game play: its setup is the authority. */
  recipe?: Recipe;
  /** #254 constructor capture of the setup before interventions. */
  setup: StoredSetup;
  interventions: Intervention[];
  /** Engine switches for this scenario, applied to the worker that runs it. */
  flags: Record<string, string>;
  source?: { kind: 'builder' } | { kind: 'saved-play'; playId: string; identity: unknown; text?: string;
    /** The game's own result, to show whether this engine reproduces it. */
    original?: { outcome: string; yards: number; events: number } };
}

export const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

export function defaultRecipe(): Recipe {
  return {
    rosterSeed: 7, strength: 0.6,
    offense: { formation: 'gun_doubles_11', kind: 'pass', concept: 'four_verts', flip: false },
    defense: { personnel: 'nickel', front: 'over', coverage: 'cover3', pressure: null, zoneStyle: 'match' },
    situation: { down: 1, distance: 10, ballOn: 30, hash: 'middle' },
    seed: 1, audibles: false, picks: [], edits: [],
  };
}

// ------------------------------------------------------------------ catalog

export function catalog() {
  const settings = engineSettings(process.env);
  return {
    formations: FORMATIONS.map(f => ({ id: f.id, name: f.name, personnel: f.personnel, qb: f.qb, slots: Object.keys(f.slots) })),
    pass: PASS_CONCEPTS.map(c => ({ id: c.id, name: c.name, family: c.family })),
    run: RUN_CONCEPTS.map(c => ({ id: c.id, name: c.name, scheme: c.scheme, direction: c.direction, aim: c.aim })),
    defPersonnel: Object.entries(DEF_PERSONNEL).map(([id, slots]) => ({ id, slots: Object.keys(slots) })),
    fronts: FRONTS.map(f => ({ id: f.id, name: f.name, personnel: f.personnel })),
    coverages: COVERAGES.map(c => ({ id: c.id, name: c.name, family: c.family ?? null, man: c.man, shell: c.shell, note: c.note ?? null })),
    pressures: PRESSURES.map(p => ({ id: p.id, name: p.name, coverages: p.coverages, flag: p.flag ?? null })),
    ratings: [...RATING_KEYS],
    settings,
  };
}

// ------------------------------------------------------------------ rosters

const teamsCache = new Map<string, { offense: Team; defense: Team }>();
/** Same generated-team recipe as scripts/diag/command-trace.ts. */
export function teams(rosterSeed: number, strength: number) {
  const key = `${rosterSeed}:${strength}`;
  let t = teamsCache.get(key);
  if (!t) {
    const rng = new Rng(rosterSeed);
    t = { offense: generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength }),
      defense: generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength }) };
    teamsCache.set(key, t);
  }
  return t;
}

export function playerSummary(p: Player) {
  const physical = derivePhysical(p);
  return { id: p.id, name: `${p.firstName} ${p.lastName}`, jersey: p.jersey, position: p.position, age: p.age,
    archetype: p.archetype, measurables: { ...p.measurables }, ratings: { ...p.ratings },
    physical: { vmax: physical.vmax, massKg: physical.massKg, radius: physical.radius, reach: physical.reach,
      reactionTime: physical.reactionTime, power: physical.power } };
}

export function rosters(rosterSeed: number, strength: number) {
  const t = teams(rosterSeed, strength);
  return { offense: t.offense.roster.map(playerSummary), defense: t.defense.roster.map(playerSummary) };
}

// ------------------------------------------------------------------ setup

function check(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message);
}

function editedPlayer(p: Player, recipe: Recipe): Player {
  const edit = recipe.edits.find(e => e.playerId === p.id);
  if (!edit) return p;
  const copy: Player = structuredClone(p);
  for (const [k, v] of Object.entries(edit.ratings ?? {})) {
    check((RATING_KEYS as readonly string[]).includes(k) && Number.isFinite(v) && v! >= 1 && v! <= 100, `Bad rating ${k}`);
    copy.ratings[k as RatingKey] = v!;
  }
  for (const [k, v] of Object.entries(edit.measurables ?? {})) {
    check(k in copy.measurables && Number.isFinite(v) && v! > 0, `Bad measurable ${k}`);
    copy.measurables[k as keyof Measurables] = v!;
  }
  return copy;
}

const hashY = (h: Recipe['situation']['hash']) =>
  // The play frame's +y is the offense's left as it attacks +x.
  h === 'left' ? Math.max(HASH_LEFT_Y, HASH_RIGHT_Y) : h === 'right' ? Math.min(HASH_LEFT_Y, HASH_RIGHT_Y) : CENTER_Y;

/** An ordinary constructor input, built the way games and diagnostics build theirs. */
export function buildSetup(recipe: Recipe): PlaySetup {
  const formation = FORMATION_BY_ID[recipe.offense.formation];
  check(formation, `Unknown formation ${recipe.offense.formation}`);
  const pass = recipe.offense.kind === 'pass' ? PASS_BY_ID[recipe.offense.concept] : undefined;
  const run = recipe.offense.kind === 'run' ? RUN_BY_ID[recipe.offense.concept] : undefined;
  check(pass || run, `Unknown ${recipe.offense.kind} concept ${recipe.offense.concept}`);
  const front = FRONT_BY_ID[recipe.defense.front], coverage = COVERAGE_BY_ID[recipe.defense.coverage];
  check(front && coverage, 'Unknown front or coverage');
  check(front.personnel.includes(recipe.defense.personnel), `${front.name} is not installed for ${recipe.defense.personnel} personnel`);
  const pressure = recipe.defense.pressure ? PRESSURE_BY_ID[recipe.defense.pressure] : null;
  check(pressure !== undefined, 'Unknown pressure');
  const { down, distance, ballOn } = recipe.situation;
  check(Number.isInteger(down) && down >= 1 && down <= 4, 'Down must be 1–4');
  check(Number.isFinite(ballOn) && ballOn >= 1 && ballOn <= 99, 'Ball must be between the 1-yard lines');
  check(Number.isFinite(distance) && distance > 0 && distance <= 99, 'Distance must be positive');
  check(Number.isSafeInteger(recipe.seed) && recipe.seed >= 0 && recipe.seed <= 0xffffffff, 'Seed must be a uint32');
  const t = teams(recipe.rosterSeed, recipe.strength);
  const offense: Partial<Record<OffSlot, Player>> = pickOffense(t.offense, formation.personnel);
  const defense: Partial<Record<DefSlot, Player>> = pickDefense(t.defense, recipe.defense.personnel);
  for (const pick of recipe.picks) {
    const team = pick.team === 'O' ? t.offense : t.defense, lineup = (pick.team === 'O' ? offense : defense) as Record<string, Player>;
    check(pick.slot in lineup, `${pick.slot} is not in this lineup`);
    const player = team.roster.find(p => p.id === pick.playerId);
    check(player, `Player ${pick.playerId} is not on the ${pick.team === 'O' ? 'offense' : 'defense'}`);
    for (const [slot, p] of Object.entries(lineup)) if (p.id === player.id && slot !== pick.slot) lineup[slot] = lineup[pick.slot];
    lineup[pick.slot] = player;
  }
  for (const lineup of [offense, defense] as Array<Record<string, Player>>)
    for (const slot of Object.keys(lineup)) lineup[slot] = editedPlayer(lineup[slot], recipe);
  const los = OWN_GOAL_X + ballOn;
  return {
    offense, defense,
    offCall: { formation, flip: recipe.offense.flip, kind: recipe.offense.kind, pass, run, label: recipe.offense.concept },
    defCall: { personnel: recipe.defense.personnel, front, coverage, pressure, zoneStyle: recipe.defense.zoneStyle,
      label: `${front.id} ${coverage.id}${pressure ? ' ' + pressure.id : ''}` },
    los, ballY: hashY(recipe.situation.hash), firstDownX: Math.min(110, los + distance),
    seed: recipe.seed, down, offStyle: alignStyle(t.offense), defStyle: alignStyle(t.defense), audibles: recipe.audibles,
  };
}

export function storeSetup(setup: PlaySetup): StoredSetup {
  const bytes = captureSetup(setup);
  return { encoding: 'v8-base64', sha256: sha256(bytes), bytes: bytes.toString('base64') };
}

export function loadSetup(stored: StoredSetup): PlaySetup {
  check(stored.encoding === 'v8-base64', 'Unsupported setup encoding');
  const bytes = Buffer.from(stored.bytes, 'base64');
  check(sha256(bytes) === stored.sha256, 'Scenario setup checksum mismatch');
  return restoreSetup(bytes);
}

/** The exact constructor input for one run: the stored setup, the run's seed and the coach's hand. */
export function runSetup(scenario: Scenario, seed?: number): PlaySetup {
  const setup = loadSetup(scenario.setup);
  if (seed !== undefined) setup.seed = seed;
  const placed = scenario.interventions.filter(i => i.kind === 'align');
  if (placed.length) setup.alignment = placed.map(i => ({ team: i.team, slot: i.slot, pos: { x: i.to.x, y: i.to.y } }));
  return setup;
}

export function identity() {
  return { engineSha256: sourceVersion(), settings: engineSettings(process.env), node: process.version };
}

// ------------------------------------------------------------------ runs

/** The ledger as the client needs it: the census, each blocker's duty spans and a light per-tick load/access series. */
function responsibilityPayload(d: LedgerData) {
  const r3 = (v: number | null) => v === null ? null : Math.round(v * 1000) / 1000;
  const byActor = new Map<number, LedgerData['rows']>();
  for (const row of d.rows) (byActor.get(row.actor) ?? byActor.set(row.actor, []).get(row.actor)!).push(row);
  return {
    jobs: initialJobCensus(d),
    timeline: dutyTimeline(d).map(b => ({ actor: b.actor, spans: b.spans.map(s => ({ from: s.from, to: s.to, because: s.because,
      kind: s.plan.kind, target: s.plan.target, departure: !!s.plan.departure, combination: s.plan.combination?.id ?? null })) })),
    changes: d.changes.map(c => ({ t: c.t, actor: c.actor, reason: c.reason, fields: c.fields })),
    ticks: [...byActor].map(([actor, rows]) => ({ actor, endpoint: rows.map(x => x.endpoint),
      loadCurrent: rows.map(x => r3(x.loadOnCurrent?.magnitude ?? null)), loadInitial: rows.map(x => r3(x.loadOnInitial?.magnitude ?? null)),
      deficit: rows.map(x => r3(x.access.reduce<number | null>((s, a) => a.deficit === null ? s : (s ?? 0) + a.deficit, null))),
      owner: rows.map(x => x.command?.finalOwner ?? null) })),
    play: { censored: d.play.censored, carrierEvents: d.play.carrierEvents },
  };
}

const round = (v: number, k = 1000) => Math.round(v * k) / k;

function rosterOf(sim: PlaySim) {
  return sim.agents.map(a => ({ team: a.team, slot: a.slot, playerId: a.player.id, name: `${a.player.firstName} ${a.player.lastName}`,
    jersey: a.player.jersey, position: a.player.position, heightIn: a.player.measurables.heightIn, weightLb: a.player.measurables.weightLb,
    ratings: { ...a.player.ratings },
    physical: { radius: a.profile.radius, reach: a.profile.reach, vmax: a.profile.vmax, massKg: a.profile.massKg, reactionTime: a.profile.reactionTime } }));
}

/** Pre-snap spots as the constructor left them, with and without the coach's hand. */
export function preview(scenario: Scenario) {
  const native = new PlaySim(runSetup({ ...scenario, interventions: [] }));
  const placed = scenario.interventions.length ? new PlaySim(runSetup(scenario)) : native;
  const spots = (sim: PlaySim) => sim.agents.map(a => ({ x: round(a.pos.x), y: round(a.pos.y), facing: round(a.facing) }));
  return { roster: rosterOf(placed), los: placed.los, firstDownX: placed.firstDownX, ballY: placed.ballY,
    native: spots(native), placed: spots(placed),
    offCall: { label: placed.offCall.label, kind: placed.offCall.kind, formation: placed.offCall.formation.id },
    defCall: { label: placed.defCall.label, coverage: placed.defCall.coverage.id, check: placed.defCall.check ?? null },
    snap: { permitted: placed.snapAssessment.snapPermitted, fouls: placed.snapAssessment.fouls } };
}

function execute(scenario: Scenario, seed: number | undefined, record: boolean) {
  const setup = runSetup(scenario, seed);
  if (record) Object.assign(setup, { record: true, recordLevel: 'full', recordEvery: 1 });
  const sim = new PlaySim(setup);
  // The responsibility ledger only reads; it is on for watched runs, never for batches.
  const ledger = record ? sim.recordResponsibility() : null;
  const t0 = performance.now();
  const result = sim.run();
  const ms = performance.now() - t0;
  const summary = { outcome: result.outcome, yards: round(result.yards, 100), offenseYards: round(result.offenseYards, 100),
    duration: round(result.duration, 100), turnover: result.turnover, kind: result.kind,
    penalty: result.penalty ? { kind: result.penalty.kind, against: result.penalty.against } : null,
    stats: result.stats, snapPermitted: sim.snapAssessment.snapPermitted, ms: Math.round(ms) };
  return { sim, result, summary, ledger, seed: typeof setup.seed === 'number' ? setup.seed : null };
}

/** One ordinary play, summary only (batches). Recording is off, as in games. */
export function runSummary(scenario: Scenario, seed?: number) {
  const { seed: used, summary } = execute(scenario, seed, false);
  return { seed: used, summary };
}

/** One ordinary play with full recording at every tick. */
export function run(scenario: Scenario, options: { seed?: number } = {}) {
  const { sim, result, summary, seed, ledger } = execute(scenario, options.seed, true);
  const frames = result.frames ?? [];
  return {
    seed, summary,
    los: sim.los, firstDownX: sim.firstDownX, ballY: sim.ballY,
    offCall: { label: sim.offCall.label, kind: sim.offCall.kind, formation: sim.offCall.formation.id },
    defCall: { label: sim.defCall.label, coverage: sim.defCall.coverage.id, check: sim.defCall.check ?? null },
    roster: rosterOf(sim),
    frames: { t: frames.map(f => round(f.t, 10000)), p: frames.flatMap(f => f.agents.map(v => round(v))),
      b: frames.flatMap(f => f.ball.map(v => round(v))), c: frames.map(f => f.carrier),
      s: frames.flatMap(f => (f.carrierPosture ?? [0, 0]).map(v => round(v))) },
    events: result.events,
    segments: result.segments,
    telemetry: result.telemetry ?? null,
    fouls: sim.snapAssessment.fouls,
    responsibility: ledger && responsibilityPayload(ledger.data),
  };
}

/** The selected player's command trace: who owned each command, what each stage rewrote, what he saw. */
export function trace(scenario: Scenario, actor: { team: 'O' | 'D'; slot: string }, from: number, to: number, seed?: number) {
  const sim = new PlaySim(runSetup(scenario, seed));
  const commands = sim.recordCommands({ actor, from, to });
  sim.run();
  return { actor: commands.actor, steps: commands.steps };
}

/** A builder scenario from a recipe; interventions survive when their player still has that slot. */
export function scenarioFromRecipe(recipe: Recipe, base?: Partial<Scenario>): Scenario {
  const setup = buildSetup(recipe);
  const ids = new Map<string, string>();
  for (const [team, lineup] of [['O', setup.offense], ['D', setup.defense]] as const)
    for (const [slot, p] of Object.entries(lineup)) ids.set(`${team}:${slot}`, p!.id);
  const interventions = (base?.interventions ?? []).filter(i => ids.get(`${i.team}:${i.slot}`) === i.playerId);
  return { format: SCENARIO_FORMAT, id: base?.id ?? newId(), name: base?.name ?? 'Untitled play',
    created: base?.created ?? new Date().toISOString(), recipe, setup: storeSetup(setup), interventions,
    flags: base?.flags ?? {}, source: { kind: 'builder' } };
}

export function newId() {
  return `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const FIELD = { width: FIELD_WIDTH };
