/** Observe protection on three existing native controls without changing their
 * requests or physics. Geometric interposition is not a certified safe lane. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import type { Vec2 } from '../../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import type { HandJoint, Intent } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const input = 'config/block-protection.json', tool = 'scripts/diag/physics/block-protection.ts';
const cfg = JSON.parse(readFileSync(input, 'utf8'));
const sha = (x: string | Buffer) => createHash('sha256').update(x).digest('hex');
const hash = (x: unknown) => sha(JSON.stringify(x));
const output = process.argv[2] ?? 'out/block-protection/result.json.gz';
const started = performance.now(), source = sourceVersion();
const identity = (a: Agent) => ({ idx: a.idx, slot: a.slot, team: a.team, player: a.player.id });
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const snapshot = (a: Agent) => ({ ...identity(a), pos: { ...a.pos }, vel: { ...a.vel },
  facing: a.facing, spin: a.body.spin ?? 0, energy: a.body.energy,
  support: structuredClone(a.body.support), request: null as Intent | null });

/** Minimal unchanged extraction of f2cedaef's case factory. Roster names and
 * labels participate in the original inputs and are preserved verbatim. */
function makeSim(c: any): { sim: PlaySim; setupHash: string; fixtureHash?: string } {
  if (c.kind === 'fixture') {
    const raw = readFileSync(c.fixture), fixtureHash = sha(raw);
    assert.equal(fixtureHash, c.fixtureSha256, 'Existing fixture changed');
    const fixture = JSON.parse(gunzipSync(raw).toString());
    return { sim: new PlaySim(structuredClone(fixture.setup)), setupHash: hash(fixture.setup), fixtureHash };
  }
  const p = cfg.pair11;
  const o = generateTeam(new Rng(p.offenseSeed), 'pair11 O', 'pair11O', { strength: p.strength });
  const d = generateTeam(new Rng(p.defenseSeed), 'pair11 D', 'pair11D', { strength: p.strength });
  const formation = structuredClone(FORMATION_BY_ID[p.formation]);
  const run = structuredClone(RUN_BY_ID[`wz_${c.direction}`]);
  run.direction = c.direction;
  const setup = {
    offense: structuredClone(pickOffense(o, formation.personnel)),
    defense: structuredClone(pickDefense(d, 'base43')),
    offCall: { formation, flip: false, kind: 'run' as const, run, label: 'wz' },
    defCall: { personnel: 'base43' as const, front: FRONT_BY_ID[p.front], coverage: COVERAGE_BY_ID[p.coverage],
      pressure: null, zoneStyle: 'match' as const, runPolicy: { edge: 'box' as const, linebacker: 'stack' as const }, label: 'over3' },
    los: p.los, ballY: p.ballY, firstDownX: p.firstDownX, down: p.down,
    seed: c.seed ?? p.playSeed, audibles: false, hurry: false, record: false,
  };
  return { sim: new PlaySim(setup), setupHash: hash(setup) };
}

function geometry(b: Agent, d: Agent, r: Agent, attack: number, los: number) {
  const dx = r.pos.x - d.pos.x, dy = r.pos.y - d.pos.y, len2 = dx * dx + dy * dy;
  const projection = len2 > 1e-12 ? ((b.pos.x - d.pos.x) * dx + (b.pos.y - d.pos.y) * dy) / len2 : null;
  const interior = projection !== null && projection > 0 && projection < 1;
  const perpendicular = projection === null ? null : Math.hypot(b.pos.x - d.pos.x - projection * dx,
    b.pos.y - d.pos.y - projection * dy);
  const interpositionMarginYd = interior ? b.profile.radius - perpendicular! : null;
  return {
    runnerPairLongitudinalOffsetYd: attack * (r.pos.x - (b.pos.x + d.pos.x) / 2),
    runnerLineOffsetYd: attack * (r.pos.x - los),
    pairCenterDistanceYd: distance(b.pos, d.pos),
    pairNominalSurfaceGapYd: distance(b.pos, d.pos) - b.profile.radius - d.profile.radius,
    defenderRunnerNominalSurfaceGapYd: distance(d.pos, r.pos) - d.profile.radius - r.profile.radius,
    defenderNominalReachEnvelope: distance(d.pos, r.pos) <= d.profile.reach + r.profile.radius,
    blockerProjectionFraction: projection, perpendicularDistanceYd: perpendicular,
    interpositionMarginYd, directCenterlineInterposition: interpositionMarginYd !== null && interpositionMarginYd > 0,
  };
}

type Pair = { blocker: Agent; defender: Agent; firstSeen: number; helper: boolean };
const rows: any[] = [];
const selectedCases = process.argv.includes('--fresh-only') ? cfg.cases.filter((c: any) => c.fresh)
  : cfg.cases.filter((c: any) => !c.fresh);
assert(selectedCases.length > 0, 'No selected inputs');
for (const c of selectedCases) {
  const begin = performance.now(), { sim, setupHash, fixtureHash } = makeSim(c);
  const initial = structuredClone(sim.agents.map(a => ({ ...identity(a), profile: a.profile, body: a.body })));
  const initialProfilesAndBodiesSha256 = hash(initial);
  const pairs = new Map<string, Pair>(), frames: any[] = [], arrivals: any[] = [], physicalIntervals: any[] = [];
  const latest = new Map<string, any>(), passed = new Set<string>();
  let linePrevious: any = null, lineArrival: any = null, firstNonzeroRunnerTorso: any = null;
  let firstLoadedRunnerGrasp: any = null, error: string | null = null;
  const register = (b: Agent, d: Agent, helper = false) => {
    if (b.team === d.team) return;
    if (b.team === 'D') [b, d] = [d, b];
    if (b === sim.carrier || b === sim.qb) return;
    const key = `${b.idx}/${d.idx}`;
    if (!pairs.has(key)) pairs.set(key, { blocker: b, defender: d, firstSeen: sim.t, helper });
    return key;
  };
  const originalStep = sim.world.step.bind(sim.world);
  // Read-only wrapper observes the exact joints passed to the actual World.
  sim.world.step = (intents, dt) => {
    for (const e of sim.engagements) if (e.type === 'run') {
      register(e.blocker, e.defender);
      for (const h of e.helpers) register(h, e.defender, true);
    }
    const hands = sim.world.joints.filter((j): j is HandJoint => j.kind === 'hands');
    const report = originalStep(intents, dt), runner = sim.carrier;
    const loads = hands.map(j => ({ a: sim.agents.find(a => a.body === j.a)!, b: sim.agents.find(a => a.body === j.b)!, j }))
      .filter(({ a, b }) => a.team !== b.team)
      .map(({ a, b, j }) => ({ key: register(a, b), a: a.idx, b: b.idx,
        normalMeanForce: j.normalForce ?? 0, tangentMeanForce: j.tangentForce ?? 0,
        nonzeroMeanLoad: Math.hypot(j.normalForce ?? 0, j.tangentForce ?? 0) > cfg.loadThreshold }));
    const torso = report.contacts.filter(p => p.impulse > cfg.loadThreshold).map(p => {
      const [a, b] = sim.agents[p.i].team === 'O' ? [sim.agents[p.i], sim.agents[p.j]] : [sim.agents[p.j], sim.agents[p.i]];
      const key = `${a.idx}/${b.idx}`;
      return { ...p, key: a.team !== b.team && pairs.has(key) ? key : null };
    });
    const grasps = sim.world.joints.filter(j => j.kind === 'grasp').map(j => ({
      a: sim.agents.find(a => a.body === j.a)!.idx, b: sim.agents.find(a => a.body === j.b)!.idx,
      meanForce: j.force ?? 0, broken: j.broken ?? false, slipping: j.slipping ?? false }));
    if (runner && runner.team === 'O' && runner !== sim.qb) {
      const hit = torso.find(p => (p.i === runner.idx || p.j === runner.idx)
        && sim.agents[p.i].team !== sim.agents[p.j].team);
      if (hit && !firstNonzeroRunnerTorso) firstNonzeroRunnerTorso = { interval: [sim.t, sim.t + dt], runner: identity(runner), contact: hit };
      const hold = grasps.find(j => j.b === runner.idx && j.meanForce > cfg.loadThreshold);
      if (hold && !firstLoadedRunnerGrasp) firstLoadedRunnerGrasp = { interval: [sim.t, sim.t + dt], runner: identity(runner), grasp: hold };
    }
    physicalIntervals.push({ start: sim.t, end: sim.t + dt, runner: runner ? identity(runner) : null,
      requests: structuredClone(intents),
      handLoads: loads, torsoImpulses: torso, acquiredGraspLoads: grasps,
      workResidual: report.work.residual, substeps: report.substeps });
    return report;
  };
  function observeLive() {
    assert.equal(sim.phase, 'live', 'No post-whistle frame');
    const runner = sim.carrier && sim.carrier.team === 'O' && sim.carrier !== sim.qb ? sim.carrier : null;
    const bodies = sim.agents.map(a => ({ ...snapshot(a), request: structuredClone(sim.intents[a.idx] ?? null) }));
    const observations: any[] = [];
    if (runner) {
      const attack = sim.attackDir('O'), line = { t: sim.t, runner: runner.idx, offset: attack * (runner.pos.x - sim.los) };
      if (!lineArrival && linePrevious?.runner === line.runner && linePrevious.offset < 0 && line.offset >= 0)
        lineArrival = { bracket: [linePrevious.t, line.t], runner: identity(runner) };
      linePrevious = line;
      for (const [key, p] of pairs) {
        const e = sim.engagements.find(e => e.defender === p.defender && (e.blocker === p.blocker || e.helpers.includes(p.blocker)));
        const observation = { key, blocker: p.blocker.idx, defender: p.defender.idx, runner: runner.idx,
          engagementPresent: !!e, primary: e?.blocker.idx ?? null, helper: !!e && e.blocker !== p.blocker,
          geometry: geometry(p.blocker, p.defender, runner, attack, sim.los),
          precedingIntervalHandLoads: physicalIntervals.at(-1)?.handLoads.filter((j: any) => j.key === key) ?? [],
          precedingIntervalTorsoImpulses: physicalIntervals.at(-1)?.torsoImpulses.filter((p: any) => p.key === key) ?? [] };
        const previous = latest.get(key), offset = observation.geometry.runnerPairLongitudinalOffsetYd;
        if (!passed.has(key) && previous?.runner === runner.idx && previous.offset < 0 && offset >= 0) {
          arrivals.push({ key, bracket: [previous.t, sim.t], observation,
            bodies: bodies.filter(a => [p.blocker.idx, p.defender.idx, runner.idx].includes(a.idx)) });
          passed.add(key);
        }
        latest.set(key, { t: sim.t, runner: runner.idx, offset }); observations.push(observation);
      }
      if (lineArrival?.bracket[1] === sim.t) lineArrival.pairObservations = observations;
    } else linePrevious = null;
    frames.push({ t: sim.t, runner: runner ? identity(runner) : null, bodies, pairs: observations });
  }
  observeLive();
  while (sim.phase === 'live' && sim.t < c.until - 1e-9) {
    if (performance.now() - begin > cfg.limits.caseWallSeconds * 1000 || performance.now() - started > cfg.limits.totalWallSeconds * 1000) {
      error = 'wall-budget'; break;
    }
    try { sim.tick(); } catch (e) { error = e instanceof Error ? e.stack ?? e.message : String(e); break; }
    if (sim.phase === 'live') observeLive();
  }
  const terminal = sim.phase !== 'live', result = terminal ? sim.buildResult() : null;
  const firstContact = sim.events.find(e => e.type === 'carrier_contact') ?? null;
  rows.push({ id: c.id, input: c, setupHash, fixtureHash, initialProfilesAndBodiesSha256,
    initial, terminal, error, censor: terminal ? null : error ?? 'explicit-live-prefix', finalTime: sim.t,
    ending: result?.outcome ?? null, gain: result?.offenseYards ?? null, firstContact,
    firstNonzeroRunnerTorso, firstLoadedRunnerGrasp, lineArrival, pairArrivals: arrivals,
    pairRegistry: [...pairs.entries()].map(([key, p]) => ({ key, blocker: identity(p.blocker), defender: identity(p.defender),
      firstSeen: p.firstSeen, initiallyHelper: p.helper, localArrivalObserved: passed.has(key) })),
    events: sim.events, frames, physicalIntervals, elapsedSeconds: (performance.now() - begin) / 1000 });
}
const result = { protocol: cfg.protocol, testedRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  source, node: process.version, input, inputSha256: sha(readFileSync(input)), tool, toolSha256: sha(readFileSync(tool)),
  settings: { launcher: 'scripts/baseline.mjs --candidate', baselineConfigSha256: sha(readFileSync('config/baseline.json')),
    world: 'unchanged native settings; no solver, profile, request or controller intervention' },
  definitions: { arrival: cfg.arrival, interposition: cfg.interposition, scope: cfg.scope },
  elapsedSeconds: (performance.now() - started) / 1000, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, gzipSync(JSON.stringify(result)));
console.log(JSON.stringify({ ...result, rows: rows.map(({ frames, physicalIntervals, events, initial, ...row }) => row), output }, null, 2));
if (rows.some(r => r.error)) process.exitCode = 1;
