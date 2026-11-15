/** One fixed, installed COV-7 run/deception pair. No fabricated pictures,
 * beliefs, throws, player motion, contact wins or outcome selection. */
import { strict as assert } from 'node:assert';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { nativeTraceSetup } from './command-trace.js';
import { bytesHash, captureSetup, copySaved, executionIdentity, restoreSetup } from './saved-play.js';
import { arrivalJson } from './pursuit-arrival.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { ManCoverage } from '../../src/sim/behaviors/defense.js';
import { ReceiverBlockLook } from '../../src/sim/behaviors/block-look.js';
import type { Agent } from '../../src/sim/agent.js';
import type { PlayLog } from '../../src/game/game.js';
import { packReplayPlay } from '../replay-data.js';
import { compactReplayPlays } from '../replay-telemetry-packing.js';

export const recipe = Object.freeze({ coverage: 'cover1_off', seed: 1, roster: 7, formation: 'ace_11', flip: false });
export const BLOCK_LOOK_UNTIL = 1;
const actor = (a: Agent) => ({ playerId: a.player.id, team: a.team, slot: a.slot, index: a.idx });

/** Explicit Z split prevents automatic route/run room from changing the
 * selected receiver's alignment. This is a declared installed scenario,
 * not an ordinary-game capture or the historical P029 checkpoint. */
export function abandonmentSetup(kind: 'run' | 'deception', until = BLOCK_LOOK_UNTIL): PlaySetup {
  const setup = nativeTraceSetup({ ...recipe, concept: kind === 'run' ? 'toss' : 'pa_shot' });
  setup.offCall.formation = { ...setup.offCall.formation, id: 'cov7_ace_fixed_z',
    name: 'Ace / COV-7 fixed Z', slots: { ...setup.offCall.formation.slots,
      Z: { ...setup.offCall.formation.slots.Z!, split: 8 + 1 / 3 } } };
  setup.offCall.receiverBlockLook = { Z: { until } };
  // Declared coach matchup: the nickel takes the inline Y and the strong safety
  // the detached H. This was the installed picture when the scenario was
  // qualified; the default rule now gives the nickel the slot.
  setup.manPrefs = { overrides: { NB: 'Y', SS: 'H' } };
  return { ...setup, record: true, recordLevel: 'full' };
}

/** The role-local treatment opens only this actor's existing alley branch.
 * It is an experimental comparison, not a new default defensive policy.
 * Private-method wrappers below only copy real entered calls/returned values. */
export function runAbandonment(bytes: Buffer, support: boolean, observe: boolean) {
  const sim = new PlaySim(restoreSetup(bytes));
  const a = sim.slot('CB_S')!, primary = sim.slot('Z')!;
  assert(a.behavior instanceof ManCoverage);
  const man = a.behavior;
  assert(primary.behavior instanceof ReceiverBlockLook);
  assert.equal(man.target, primary);
  assert.equal(a.runFit?.kind, 'alley');
  const installed = copySaved({ actor: actor(a), primary: actor(primary), fit: a.runFit,
    primarySpot: sim.offAlign.spots.Z, primaryJersey: primary.player.jersey,
    roster: sim.agents.map(p => ({ team: p.team, slot: p.slot, name: p.name, jersey: p.player.jersey,
      pos: p.player.position, weightLb: p.player.measurables.weightLb })),
    lookTarget: actor(primary.behavior.target),
    snap: sim.snapAssessment, formation: sim.offCall.formation, calls: { off: sim.offCall, def: sim.defCall } });
  const rows: any[] = [], endpoints: any[] = [], qbEvaluations: any[] = [], releases: any[] = [], zReads: any[] = [];
  const trace = observe ? sim.recordCommands({ actor: { team: 'D', slot: 'CB_S' }, from: 0, to: 20 }) : undefined;
  let row: any;
  if (observe) {
    const see = sim.see.bind(sim);
    // Every argument passes through (see's `sight` included): an observer that drops one changes the play it records.
    sim.see = (observer, target, scale, sight) => {
      const cue = see(observer, target, scale, sight);
      if (row && observer === a) row.observations.push({ target: actor(target), scale, cue: copySaved(cue) });
      return cue;
    };
    const methods = man as any;
    for (const name of ['blockingSupport', 'trackReceiver']) {
      const method = methods[name].bind(man);
      methods[name] = (...args: any[]) => { if (row) row.branch = name; return method(...args); };
    }
    const qb = sim.qb.behavior as any, evaluate = qb.evaluate;
    if (evaluate) qb.evaluate = function(...args: any[]) {
      const ev = evaluate.apply(this, args);
      qbEvaluations.push(copySaved({ at: sim.t, target: actor(args[2]), urgency: args[3],
        evaluation: ev ? { point: ev.point, flightTime: ev.T, completion: ev.P,
          interceptionRisk: ev.intRisk, value: ev.value, depth: ev.depth } : null }));
      return ev;
    };
    const throwBall = sim.throwBall.bind(sim);
    sim.throwBall = (...args: Parameters<PlaySim['throwBall']>) => {
      releases.push(copySaved({ at: sim.t, passer: actor(args[0]), target: args[1] ? actor(args[1]) : null,
        velocity: args[2], intended: args[3], arrivalTime: args[4], throwaway: args[5] ?? false,
        passerBody: args[0].body, priorForwardThrows: releases.filter(r => r.velocity.x > 0).length,
        actors: sim.offense.map(p => ({ actor: actor(p), position: p.pos, radius: p.profile.radius })),
        // Diagnostic reality at the actual native release, never defender input.
        corner: { position: a.pos, velocity: a.vel, facing: a.facing },
        primary: { position: primary.pos, velocity: primary.vel } }));
      return throwBall(...args);
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const start = sim.t;
      tick();
      // The QB's own score of Z every tick before the throw, wherever his eyes
      // are: his held picture of Z and his remembered defenders, no dice drawn.
      if (evaluate && sim.throwAt < 0 && sim.carrier === sim.qb) {
        // Not a controller request, so it stays out of the perception record.
        const observe = sim.trace.observe;
        sim.trace.observe = () => {};
        let ev;
        try { ev = evaluate.call(qb, sim.qb, sim, primary, 0); } finally { sim.trace.observe = observe; }
        zReads.push({ at: sim.t, eyesOnZ: sim.qbEyes === primary,
          completion: ev?.P ?? null, interceptionRisk: ev?.intRisk ?? null });
      }
      endpoints.push(copySaved({ start, end: sim.world.time, primary: { body: primary.body,
        stance: primary.stance, behavior: primary.behavior.kind, engaged: !!primary.engagement },
        corner: { body: a.body, behavior: a.behavior.kind }, qb: { body: sim.qb.body },
        carrier: sim.carrier ? { actor: actor(sim.carrier), body: sim.carrier.body } : null,
        beforeForwardPass: sim.throwAt < 0,
        ineligible: sim.snapAssessment.eligibility.filter(e => e.eligible === false).map(e => {
          const p = sim.agents.find(p => p.player.id === e.playerId)!;
          return { actor: actor(p), position: p.pos, radius: p.profile.radius };
        }),
        primaryContacts: sim.lastStep?.contacts.filter(c => c.i === primary.idx || c.j === primary.idx) ?? [] }));
    };
  }
  if (observe || support) {
    const update = man.update.bind(man);
    man.update = (self, world) => {
      if (observe) row = { at: world.t, read: self.recog?.read, logOdds: self.recog?.logOdds,
        branch: 'other', observations: [], body: copySaved(self.body),
        primary: { body: copySaved(primary.body), stance: primary.stance, behavior: primary.behavior.kind },
        retainedPrimary: actor(man.target), fit: copySaved(self.runFit) };
      const previous = process.env.PASS_FIRST;
      try {
        if (support && self.runFit?.kind === 'alley') process.env.PASS_FIRST = '0';
        const command = update(self, world);
        if (row) { row.command = copySaved(command); rows.push(row); }
        return command;
      } finally {
        if (previous === undefined) delete process.env.PASS_FIRST; else process.env.PASS_FIRST = previous;
        row = undefined;
      }
    };
  }
  const result = sim.run();
  const execution = copySaved({ result, rng: sim.rng, perception: sim.perception,
    actors: sim.agents.map(p => ({ actor: actor(p), body: p.body, mind: p.mind, recognition: p.recog,
      controller: p.behavior.constructor.name, behavior: p.behavior.kind })) });
  return { installed, rows, endpoints, qbEvaluations, releases, zReads, steps: trace?.steps, execution };
}

const primaryCue = (r: any) => r.observations.find((o: any) => o.target.slot === 'Z')?.cue;

/** Sufficient measured facts for this case, not a universal legality oracle.
 * Center+radius bounds are conservative; no body was teleported to satisfy them. */
export function legalityEvidence(run: ReturnType<typeof runAbandonment>) {
  const release = run.releases[0], before = run.endpoints.filter(r => r.beforeForwardPass);
  const eligible = run.installed.snap.eligibility.find(e => e.playerId === run.installed.primary.playerId);
  const prefix = release ? run.endpoints.filter(r => r.start < release.at) : run.endpoints;
  return { snapPermitted: run.installed.snap.snapPermitted, snapFouls: run.installed.snap.fouls,
    snapUnresolved: run.installed.snap.unresolved, primaryEligibility: eligible,
    nativeFouls: run.execution.result.foulRecords ?? [], limitations: run.execution.result.ruleLimitations ?? [],
    forwardPassRestrictionApplicable: !!release,
    primaryContactsBeforeRelease: release ? prefix.flatMap(r => r.primaryContacts) : null,
    primaryEngagedBeforeRelease: release ? prefix.some(r => r.primary.engaged) : null,
    maxIneligibleForwardEdgeBeforeRelease: release ? Math.max(...before.flatMap(r => r.ineligible.map((p: any) => p.position.x + p.radius)),
      ...(release?.actors.filter((p: any) => run.installed.snap.eligibility.some(e => e.playerId === p.actor.playerId && e.eligible === false))
        .map((p: any) => p.position.x + p.radius) ?? [])) : null,
    maxQBForwardEdgeBeforeRelease: release ? Math.max(...before.map(r => r.qb.body.pos.x + r.qb.body.profile.radius),
      release.passerBody.pos.x + release.passerBody.profile.radius) : null,
    releases: run.releases.map(r => ({ at: r.at, passer: r.passer, target: r.target,
      priorForwardThrows: r.priorForwardThrows, velocity: r.velocity, passerPosition: r.passerBody.pos })),
    runCornerContacts: run.execution.result.events.filter(e =>
      (e.a === run.installed.actor.index || e.b === run.installed.actor.index)
      && ['carrier_contact', 'tackle_wrap', 'tackle'].includes(e.type)) };
}
function geometry(r: any) {
  if (!r) return null;
  const d = r.body.pos, p = r.primary.body.pos;
  return { at: r.at, branch: r.branch, depthLeverage: d.x - p.x, lateralGap: Math.abs(d.y - p.y),
    distance: Math.hypot(d.x - p.x, d.y - p.y), position: d, velocity: r.body.vel, facing: r.body.facing,
    travelHeading: Math.hypot(r.body.vel.x, r.body.vel.y) > .01 ? Math.atan2(r.body.vel.y, r.body.vel.x) : null };
}

/** Corner and Z at the native release, with the QB's consumed evaluations of Z
 * before it. Diagnostic reality, never defender input. */
function atRelease(run: ReturnType<typeof runAbandonment>) {
  const r = run.releases[0];
  if (!r) return null;
  const d = r.corner.position, p = r.primary.position;
  return { at: r.at, target: r.target, depthLeverage: d.x - p.x, lateralGap: Math.abs(d.y - p.y),
    distance: Math.hypot(d.x - p.x, d.y - p.y),
    zEvaluations: run.qbEvaluations.filter(e => e.at <= r.at && e.target.slot === 'Z' && e.evaluation).length };
}

export function compareAbandonment(kind: 'run' | 'deception', until = BLOCK_LOOK_UNTIL) {
  const bytes = captureSetup(abandonmentSetup(kind, until));
  const plain = runAbandonment(bytes, false, false), baseline = runAbandonment(bytes, false, true);
  const alternative = runAbandonment(bytes, true, true), alternativePlain = runAbandonment(bytes, true, false);
  assert.deepEqual(baseline.execution, plain.execution, 'baseline observer changed execution');
  assert.deepEqual(alternative.execution, alternativePlain.execution, 'support observer changed execution');
  assert.deepEqual(baseline.installed, alternative.installed);
  const supportRows = alternative.rows.filter(r => r.branch === 'blockingSupport');
  const first = supportRows[0];
  assert(first, `${kind}: support did not activate`);
  const same = baseline.rows.find(r => r.at === first.at)!;
  assert.deepEqual(first.body, same.body, 'policy arms differ before support');
  assert.deepEqual(first.observations.slice(0, 2), same.observations.slice(0, 2));
  assert(alternative.rows.every(r => r.retainedPrimary.playerId === baseline.installed.primary.playerId));
  const reacquired = alternative.rows.find(r => r.at > first.at && r.branch === 'trackReceiver');
  const reversed = reacquired && alternative.rows.find(r => r.at >= reacquired.at && r.body.vel.y <= 0);
  const summary = { kind, until, setupSha256: bytesHash(bytes), installed: baseline.installed,
    observerEquality: true, firstSupport: first.at, supportEntries: supportRows.length,
    firstSupportEvidence: first,
    acquiredUpright: alternative.rows.find(r => r.at > first.at && primaryCue(r)?.stance === 'high')?.at ?? null,
    returnedToMan: reacquired?.at ?? null, inwardMomentumArrested: reversed?.at ?? null,
    legality: { man: legalityEvidence(baseline), support: legalityEvidence(alternative) },
    samples: [.65, 1, 1.4, 2, 2.4].map(at => ({ at,
      man: geometry(baseline.rows.find(r => r.at === at)), support: geometry(alternative.rows.find(r => r.at === at)) })),
    atRelease: { man: atRelease(baseline), support: atRelease(alternative) },
    result: { man: { outcome: baseline.execution.result.outcome, yards: baseline.execution.result.yards },
      support: { outcome: alternative.execution.result.outcome, yards: alternative.execution.result.yards } } };
  return { bytes, summary, baseline, alternative };
}

function main() {
  assert.equal(process.version, 'v22.23.3');
  assert.notEqual(process.env.PASS_FIRST, '0', 'Use the accepted global PASS_FIRST default');
  // Usage: cov7-abandonment.ts [out-dir] [--until seconds]  (release variation)
  const args = process.argv.slice(2), u = args.indexOf('--until');
  const until = u >= 0 ? Number(args.splice(u, 2)[1]) : BLOCK_LOOK_UNTIL;
  assert(until > 0, 'until must be a positive time');
  const out = args[0] ?? 'out/cov7-abandonment';
  mkdirSync(out, { recursive: true });
  const identity = executionIdentity(), pair = (['run', 'deception'] as const).map(kind => compareAbandonment(kind, until));
  // Same primary picture and own body across calls at admission. QB/back
  // pictures may differ and are retained; do not call all cues identical.
  assert.deepEqual(primaryCue(pair[0].summary.firstSupportEvidence), primaryCue(pair[1].summary.firstSupportEvidence));
  assert.deepEqual(pair[0].summary.firstSupportEvidence.body, pair[1].summary.firstSupportEvidence.body);
  for (const item of pair) {
    writeFileSync(`${out}/${item.summary.kind}.setup.bin`, item.bytes);
    writeFileSync(`${out}/${item.summary.kind}.json`, arrivalJson({ identity,
      recipe, ...item.summary, baseline: item.baseline, alternative: item.alternative }));
  }
  writeFileSync(`${out}/summary.json`, arrivalJson({ identity, recipe, pair: pair.map(p => p.summary) }));
  // Reuse the existing viewer/packing. Clock/score labels below are display
  // placeholders for declared scenarios, not a claim these came from a game.
  const films: PlayLog[] = pair.flatMap((p, i) => [p.baseline, p.alternative].map((r, j) => {
    const result = r.execution.result;
    return { index: i * 2 + j, quarter: 1, clock: 900, offense: 'home', down: 1, distance: 10, yardline: 30,
      call: `${p.summary.kind} / ${j ? 'installed alley' : 'retain man'}`, defense: 'Cover1 Off',
      text: `Declared COV-7 scenario: ${p.summary.kind}, ${j ? 'support' : 'man'}.`, yards: result.yards,
      score: { home: 0, away: 0 }, kind: p.summary.kind === 'run' ? 'run' : 'pass', stats: result.stats,
      outcome: result.outcome, segments: result.segments,
      replay: { frames: result.frames!, players: r.installed.roster, los: 40, firstDownX: 50, flip: false,
        events: result.events, telemetry: result.telemetry } };
  }));
  const data = { meta: { seed: 1, sourceSha256: identity.engineSha256,
    home: { name: 'Offense', abbr: 'OFF', color: '#a3302a', alt: '#f4efe6', text: '#fff' },
    away: { name: 'Defense', abbr: 'DEF', color: '#1d4f91', alt: '#f2c14e', text: '#fff' } },
    games: [{ seed: 1, final: { home: 0, away: 0 }, quarters: [] }],
    plays: compactReplayPlays(films.map(p => packReplayPlay(p, 0))), catalog: { coverage: {}, front: {}, formation: {} } };
  const template = readFileSync('viewer/replay.template.html', 'utf8');
  assert(template.includes('/*__REPLAY_DATA__*/null'));
  writeFileSync(`${out}/film.html`, '<!doctype html><html><head><meta charset="utf-8"></head><body>'
    + '<p>Declared COV-7 native scenarios. Clock/score are display placeholders, not ordinary game film.</p>'
    + template.replace('/*__REPLAY_DATA__*/null', () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '</body></html>');
  console.log(arrivalJson(pair.map(p => ({ kind: p.summary.kind, until, setupSha256: p.summary.setupSha256,
    firstSupport: p.summary.firstSupport, acquiredUpright: p.summary.acquiredUpright, returnedToMan: p.summary.returnedToMan,
    inwardMomentumArrested: p.summary.inwardMomentumArrested, atRelease: p.summary.atRelease, result: p.summary.result }))));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
