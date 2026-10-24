/** RAT-3: two bounded channels, not a trait platform or ability calibration. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { overallAt, ROLE_BY_ID, roleSuitability } from '../../src/players/roles.js';
import { r01, type RatingKey } from '../../src/players/types.js';
import { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { gameSense } from '../../src/sim/recognition.js';
import { nativeTraceSetup } from './command-trace.js';
import { bytesHash, captureSetup, copySaved, executionIdentity, firstDifference, restoreSetup } from './saved-play.js';

export const RATINGS = [1, 50, 99] as const;
// Declared before inspecting contrasts. These are generated native scenarios,
// not an ordinary-game sample or new empirical latency targets.
export const CASES = [
  { id: 'lead-power', trait: 'leadBlock', team: 'O', slot: 'F', formation: 'i_pro_21', concept: 'power', until: 2.5 },
  { id: 'playaction-read', trait: 'playRecognition', team: 'D', slot: 'LB_M', formation: 'ace_12', concept: 'pa_post_dig', until: 2.5 },
  { id: 'no-new-information', trait: 'playRecognition', team: 'D', slot: 'LB_M', formation: 'ace_12', concept: 'pa_post_dig', until: .1 },
] as const;
type Case = typeof CASES[number];
// V8 byte encodings can differ for equal numbers after representation changes.
// Use value identity for execution checks; authoritative constructor bytes keep
// their separate SHA256. Preserve Maps, undefined and nonfinite clocks.
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value, (_key, v) =>
  v instanceof Map ? { mapEntries: [...v] } : v instanceof Set ? { setEntries: [...v] }
    : v === undefined ? { undefinedValue: true } : typeof v === 'number' && !Number.isFinite(v) ? { numberValue: String(v) } : v)).digest('hex');
const capacities = (a: Agent) => { const { reactionTime: latency, ...physical } = a.profile; return physical; };
const lineup = (sim: PlaySim) => sim.agents.map(a => ({ team: a.team, slot: a.slot, playerId: a.player.id }));

export function caseInput(c: Case): Buffer {
  return captureSetup(nativeTraceSetup({ coverage: 'cover3', concept: c.concept, seed: 1, roster: 7,
    formation: c.formation, flip: false }));
}

function declaredInputs() {
  const mental = caseInput(CASES[1]);
  return { 'lead-power': caseInput(CASES[0]), 'playaction-read': mental, 'no-new-information': mental };
}

/** Actual personnel selector, separately from the lineup used in execution. */
export function selectionExperiment(trait: 'leadBlock' | 'playRecognition', personnel: '21' | '12' = '21') {
  const team = generateTeam(new Rng(7).fork(trait === 'leadBlock' ? 'offense' : 'defense'),
    'Selection', trait === 'leadBlock' ? 'OFF' : 'DEF', { strength: .6 });
  const choose = (t: typeof team) => trait === 'leadBlock' ? pickOffense(t, personnel) : pickDefense(t, 'base43');
  const slot = trait === 'leadBlock' ? personnel === '21' ? 'F' : 'H' : 'LB_M';
  const original = choose(team) as Record<string, Agent['player']>;
  const id = original[slot].id;
  return { trait, personnel: trait === 'leadBlock' ? personnel : 'base43', candidateId: id, slot, arms: RATINGS.map(rating => {
    const t = copySaved(team), p = t.roster.find(p => p.id === id)!;
    p.ratings[trait] = rating;
    const selected = choose(t);
    const roleIds = trait === 'leadBlock' ? ['FB_LEAD', 'TE_H', 'TE_F'] : ['LB_MIKE'];
    return { rating, normalized: r01(rating), roleScores: Object.fromEntries(roleIds.map(role => [role, roleSuitability(p, ROLE_BY_ID[role])])),
      selected: Object.fromEntries(Object.entries(selected).map(([slot, p]) => [slot, p!.id])),
      selectorScore: trait === 'leadBlock' ? personnel === '21' ? overallAt(p, 'FB')
        : Math.max(roleSuitability(p, ROLE_BY_ID.TE_H), roleSuitability(p, ROLE_BY_ID.TE_F)) : roleSuitability(p, ROLE_BY_ID.LB_MIKE),
      selectedCandidateAtOriginalSlot: (selected as Record<string, Agent['player']>)[slot].id === id };
  }) };
}

/** All interventions precede construction: cached profiles/minds/recognition rebuild normally. */
export function execute(c: Case, input: Buffer, rating: number, observe = true) {
  assert(Number.isInteger(rating) && rating >= 1 && rating <= 99, 'Rating must be an integer1..99');
  const setup = restoreSetup(input);
  const players = c.team === 'O' ? setup.offense : setup.defense;
  const p = (players as Record<string, Agent['player']>)[c.slot];
  assert(p, 'Selected actor absent');
  const originalPlayer = copySaved(p);
  p.ratings[c.trait] = rating;
  const expectedPlayer = copySaved(originalPlayer); expectedPlayer.ratings[c.trait] = rating;
  assert.deepEqual(p, expectedPlayer, 'Only selected trait may change');
  const traitReads: Array<{ t: number | 'construction'; value: number }> = [];
  const draws: Array<{ t: number | 'construction'; key: number; value: number }> = [];
  const randomStreams = new Set<Rng>();
  const pictures: Array<{ t: number; target: string; scale: number | undefined; seen: unknown }> = [];
  let clock: number | 'construction' = 'construction';
  const rawDraw = Rng.prototype.nextU32, rawRating = Agent.prototype.r;
  if (observe) {
    Rng.prototype.nextU32 = function () { const value = rawDraw.call(this); randomStreams.add(this); draws.push({ t: clock, key: this.key, value }); return value; };
    Agent.prototype.r = function (key: RatingKey) {
      const value = rawRating.call(this, key);
      if (this.player.id === p.id && key === c.trait) traitReads.push({ t: clock, value });
      return value;
    };
  }
  try {
    const sim = new PlaySim(setup), a = sim.agents.find(a => a.team === c.team && a.slot === c.slot)!;
    const profilePins = sim.agents.map(a => hash(capacities(a)));
    const initial = { lineup: lineup(sim), profilePins, rng: copySaved(sim.rng), bodies: sim.agents.map(a => ({ ...copySaved(a.body), profile: capacities(a) })),
      player: copySaved(a.player), normalized: r01(p.ratings[c.trait]), reactionTime: a.profile.reactionTime,
      decisionInterval: a.mind.decisionInterval, gameSense: gameSense(a.player), snapReadyAt: a.snapReadyAt, legacyReadAt: a.readAt,
      recognition: a.recog ? Object.fromEntries(Object.entries(a.recog)) : null,
      constructorDraws: copySaved(draws), constructorRandomStates: copySaved([...randomStreams]), setupSha256: bytesHash(captureSetup(setup)) };
    const trace = observe ? sim.recordCommands({ actor: { playerId: a.player.id }, from: 0, to: c.until }) : undefined;
    const see = sim.see;
    if (observe) sim.see = function (observer, target, scale) {
      const seen = see.call(this, observer, target, scale);
      if (observer === a) pictures.push({ t: sim.t, target: target.player.id, scale, seen: copySaved(seen) });
      return seen;
    };
    const states = [];
    while (sim.phase === 'live' && sim.t < c.until - 1e-9) {
      clock = sim.t;
      sim.tick();
      if (observe) states.push({ t: sim.t, readEvaluatedAt: clock as number, position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing,
        read: a.recog?.read, readAt: a.recog?.readAt, pPass: a.recog?.pPass(),
        decisionInterval: a.mind.decisionInterval,
        others: sim.agents.filter(other => other !== a).map(other => ({ playerId: other.player.id,
          position: { ...other.pos }, velocity: { ...other.vel }, facing: other.facing })),
        otherBodiesSha256: hash(sim.agents.filter(other => other !== a).map(a => a.body)) });
    }
    const final = copySaved({ result: sim.buildResult(), bodies: sim.agents.map(a => a.body), minds: sim.agents.map(a => a.mind),
      rng: sim.rng, perception: sim.perception, intents: sim.intents });
    return { rating, initial, initialRngSha256: hash(initial.rng), inputSha256: bytesHash(input),
      states, pictures, traitReads, draws, trace: trace?.steps,
      readEvents: sim.events.filter(e => e.type === 'read' && e.a === a.idx),
      finalStateSha256: hash(final), actualEnd: sim.t, phase: sim.phase };
  } finally {
    Rng.prototype.nextU32 = rawDraw; Agent.prototype.r = rawRating;
  }
}

const first = (a: unknown, b: unknown) => firstDifference(a, b, '$', 0, 'recorded');
export function runCase(c: Case, input = caseInput(c)) {
  const arms = RATINGS.map(r => execute(c, input, r));
  const reference = arms[1];
  const comparisons = arms.map(arm => {
    assert.deepEqual(arm.initial.lineup, reference.initial.lineup);
    assert.deepEqual(arm.initial.profilePins, reference.initial.profilePins, 'Physical capacity changed');
    assert.deepEqual(arm.initial.bodies, reference.initial.bodies, 'Initial body changed');
    assert.equal(arm.initialRngSha256, reference.initialRngSha256);
    assert.deepEqual(arm.initial.constructorDraws, reference.initial.constructorDraws, 'Constructor random consumption differs');
    assert.deepEqual(arm.initial.constructorRandomStates, reference.initial.constructorRandomStates, 'Constructor stream state differs');
    const plain = execute(c, input, arm.rating, false);
    assert.equal(arm.finalStateSha256, plain.finalStateSha256, 'Diagnostic observer changes execution');
    const commands = (x: typeof arm) => x.trace!.map(s => ({ t: s.stepStart, raw: s.decision?.raw, applied: s.final }));
    const otherMotion = reference.states.flatMap((s, i) => arm.states[i]?.t === s.t ? s.others.map((a, j) => {
      const b = arm.states[i].others[j];
      assert.equal(a.playerId, b.playerId);
      return { t: s.t, playerId: a.playerId, positionDeltaYd: Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y),
        velocityDeltaYdS: Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y), facingDeltaRad: Math.abs(a.facing - b.facing) };
    }) : []);
    return { rating: arm.rating, observerParity: 'exact full result/bodies/minds/RNG/perception/intents',
      firstCommandDifference: first(commands(reference), commands(arm)),
      firstMovementDifference: first(reference.states.map(s => ({ t: s.t, position: s.position, velocity: s.velocity, facing: s.facing })),
        arm.states.map(s => ({ t: s.t, position: s.position, velocity: s.velocity, facing: s.facing }))),
      firstReadDifference: first(reference.states.map(s => ({ t: s.readEvaluatedAt, read: s.read, readAt: s.readAt })), arm.states.map(s => ({ t: s.readEvaluatedAt, read: s.read, readAt: s.readAt }))),
      firstConsumedPictureDifference: first(reference.pictures, arm.pictures), firstRandomConsumptionDifference: first(reference.draws, arm.draws),
      firstOtherBodyDifference: first(reference.states.map(s => ({ t: s.t, actors: s.others })), arm.states.map(s => ({ t: s.t, actors: s.others }))),
      firstOtherContextStateDifference: first(reference.states.map(s => ({ t: s.t, hash: s.otherBodiesSha256 })), arm.states.map(s => ({ t: s.t, hash: s.otherBodiesSha256 }))),
      maximumOtherPositionDeltaYd: Math.max(0, ...otherMotion.map(d => d.positionDeltaYd)),
      firstOtherMotionAboveNumericTolerance: otherMotion.find(d => Math.max(d.positionDeltaYd, d.velocityDeltaYdS, d.facingDeltaRad) > 1e-9) ?? null,
      numericTolerance: '1e-9 per stated unit, precision diagnostic only; exact differences are also retained',
      runtimeTraitReads: arm.traitReads.filter(r => r.t !== 'construction').length,
      constructorTraitReads: arm.traitReads.filter(r => r.t === 'construction').length,
      evaluatedDecisionIntervals: arm.trace!.filter(s => s.decision?.evaluated).length,
      finalStateEquals50: reference.finalStateSha256 === arm.finalStateSha256 };
  });
  return { id: c.id, declaration: c, inputSha256: bytesHash(input), arms, comparisons };
}

export function markdown(report: ReturnType<typeof runExperiment>) {
  const lines = ['| Case | Rating / r01 | Derived latency / decision interval s | First read / raw-applied / movement change vs50 s | Agent.r trait reads constructor / live |',
    '|---|---|---|---|---|'];
  for (const c of report.cases) for (const a of c.arms) {
    const d = c.comparisons.find(d => d.rating === a.rating)!;
    const time = (x: { time: number } | null) => x ? x.time.toFixed(2) : 'none';
    lines.push(`| ${c.id} | ${a.rating} / ${a.initial.normalized} | ${a.initial.reactionTime.toFixed(4)} / ${a.initial.decisionInterval.toFixed(4)} | ${time(d.firstReadDifference)} / ${time(d.firstCommandDifference)} / ${time(d.firstMovementDifference)} | ${d.constructorTraitReads} / ${d.runtimeTraitReads} |`);
  }
  lines.push('', 'No live Agent.r read does not exclude a cached trait effect. Read/command clocks are tick starts; movement clocks are tick ends. None means no difference versus50 in this declared exposure, not unavailable evidence.', '',
    '| Selection channel | Rating | Actual role scores | Original candidate retained in slot |', '|---|---|---|---|');
  for (const s of report.selection) for (const a of s.arms)
    lines.push(`| ${s.trait} / ${s.slot} | ${a.rating} | ${JSON.stringify(a.roleScores)} | ${a.selectedCandidateAtOriginalSlot} |`);
  return lines.join('\n') + '\n';
}

export function runExperiment(inputs: Record<string, Buffer> = declaredInputs()) {
  for (const c of CASES) assert(inputs[c.id], `Unavailable declared input: ${c.id}`);
  return { schema: 'rating-channels-v1', source: executionIdentity(),
    operatorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
    selection: [selectionExperiment('leadBlock'), selectionExperiment('leadBlock', '12'), selectionExperiment('playRecognition')], cases: CASES.map(c => runCase(c, inputs[c.id])),
    limits: 'Generated native cases, fixed selected lineup, seed and unrelated ratings. Profile reactionTime is mental latency and rebuilds intentionally; every other physical field is invariant. No final-yard target. Each arm has an unobserved control. First sampled disagreements are witnesses, not substep causal proofs. Read bias/priors, snap latency and later context can all change with playRecognition; do not attribute the total to only one mediator.' };
}

function main() {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'out/rating-channels' }, 'input-dir': { type: 'string' } } });
  assert(/^22\./.test(process.versions.node), 'Use supported Node22');
  const directory = values.out!; mkdirSync(directory, { recursive: true });
  const inputs = values['input-dir'] ? Object.fromEntries(CASES.map(c => [c.id, readFileSync(`${values['input-dir']}/${c.id}.setup.bin`)])) : declaredInputs();
  const oldManifest = values['input-dir'] && existsSync(`${values['input-dir']}/input-manifest.json`)
    ? JSON.parse(readFileSync(`${values['input-dir']}/input-manifest.json`, 'utf8')) : null;
  if (oldManifest) for (const c of CASES) assert.equal(oldManifest.files[c.id], bytesHash(inputs[c.id]), 'Saved constructor checksum differs');
  const manifest = { schema: 'rating-channel-inputs-v1', source: oldManifest?.source ?? (values['input-dir']
    ? { status: 'unavailable: original source not supplied with saved constructor bytes' } : executionIdentity()),
    files: Object.fromEntries(CASES.map(c => [c.id, bytesHash(inputs[c.id])])), declaration: CASES };
  for (const c of CASES) writeFileSync(`${directory}/${c.id}.setup.bin`, inputs[c.id]);
  writeFileSync(`${directory}/input-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  const report = runExperiment(inputs);
  writeFileSync(`${directory}/report.json`, JSON.stringify({ ...report, inputProvenance: manifest }, (_key, value) =>
    typeof value === 'number' && !Number.isFinite(value) ? { nonfinite: String(value) } : value, 2) + '\n');
  writeFileSync(`${directory}/table.md`, markdown(report));
  console.log(markdown(report));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
