import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serialize } from 'node:v8';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ScoutingReport } from '../src/sim/recognition.js';
import { CoverageScouting } from '../src/sim/qbmind.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { captureOrdinaryPlay, originalFilm } from '../scripts/diag/capture-game-play.js';
import { captureSetup, compareExecution, copySaved, firstDifference, identityDifference, initialState,
  readSavedPlay, replayState, restoreSetup, runRestoredPlay } from '../scripts/diag/saved-play.js';
import { composeHooks } from '../scripts/scorecard/hooks.js';

// GAP_MATCH changes seed 7's game history, so its first catch from play 10 comes on a drive the
// defense hasn't scouted yet; the captured catch and CB_W entries are staged on nearest-first fits
// (re-record by review 2). INFO-1 PR 3 moves the history again: on game play 1 (a checkdown to the
// back) the blocked edge and corners see no holder for the 0.25 s before their pictures show the
// catch, where they were handed the true catcher; that run ends in a tackle, not a touchdown, and the
// first catch from play 10 becomes G1-P012, whose corner is a matching wrapper. With the gait start law
// (#336) and the back's own mesh start (#344) together the history moves again: the first catch from play 10
// is one the defense has not scouted (its scouting holds 0 plays), so the capture starts from play 11, whose
// first catch had two scouted plays behind it. Later controller changes can
// put that first eligible catch on a fresh drive again. This fixture needs
// genuinely acquired scouting: select the first warm catch in the same bounded
// game, without changing its seed, calls or state. Restoration errors still fail.
vi.hoisted(() => { process.env.GAP_MATCH = '0'; });

describe('ordinary-game constructor capture and independent replay', () => {
  let captured: ReturnType<typeof captureOrdinaryPlay>;
  beforeAll(() => {
    captured = captureOrdinaryPlay({ seed: 7, play: 'first-catch', minPlay: 11, maxSteps: 60,
      accept: saved => restoreSetup(saved.setup).scouting!.plays() > 0 });
  }, 30_000);

  it('preserves the whole normal game prefix compared with the observer absent', () => {
    const rng = new Rng(7);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 });
    const away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
    const control = new Game(home, away, { seed: 7, record: true, recordLevel: 'full' });
    control.kickoffToStart();
    for (let n = 0; n < captured.saved.game.steps; n++) control.step();
    expect(captured.prefix).toEqual(control.result());
    expect(captured.saved.game.complete).toBe(false); // Completed play; deliberately unfinished game.
  });

  it('restores the actual fatigue, styles, preferences, scouting and audible context, then exactly reproduces the catch and entire replay', () => {
    const { saved } = captured, setup = restoreSetup(saved.setup);
    expect(saved.context.kind).toBe('scrimmage');
    expect(setup.energy).toBeInstanceOf(Map);
    expect(setup.energy!.size).toBeGreaterThan(22);
    expect([...setup.energy!.values()].some(e => e < 1)).toBe(true);
    expect(setup.scouting).toBeInstanceOf(ScoutingReport);
    expect(setup.scouting!.plays()).toBeGreaterThan(0);
    expect(setup.coverageScouting).toBeInstanceOf(CoverageScouting);
    expect(setup.coverageScouting!.frequencies()).toHaveProperty('cover1');
    expect(Object.values(setup.offStyle!).some(n => typeof n === 'number' && n !== 0)).toBe(true);
    expect(Object.values(setup.defStyle!).some(n => typeof n === 'number' && n !== 0)).toBe(true);
    expect(setup.manPrefs).toBeDefined();
    expect(setup.audibles).toBe(true);
    expect(setup.down).toBe(saved.context.state.down);
    expect(setup.los).toBe(10 + saved.context.state.yardline);
    expect(setup.recordLevel).toBe('full');
    expect(identityDifference(saved)).toBeNull();
    const plain = runRestoredPlay(saved);
    expect(plain.difference).toBeNull();
    const catcher = saved.original.result.events.find(e => e.type === 'catch')!;
    expect(catcher).toBeDefined();
    const sim = new PlaySim(restoreSetup(saved.setup)), initial = initialState(sim);
    const selected = sim.defense.find(a => a.slot === 'CB_W')!;
    const entries = new Map<number, { controller: string; kind: string }>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const owner = selected.behavior, update = owner.update;
      const descriptor = Object.getOwnPropertyDescriptor(owner, 'update');
      owner.update = (a, s) => {
        if (a === selected) entries.set(s.t, { controller: owner.constructor.name, kind: owner.kind });
        return update.call(owner, a, s);
      };
      try { tick(); } finally {
        if (descriptor) Object.defineProperty(owner, 'update', descriptor);
        else Reflect.deleteProperty(owner, 'update');
      }
    };
    const trace = sim.recordCommands({ actor: { team: 'D', slot: 'CB_W' }, from: catcher.t - .05, to: catcher.t + .15 });
    const result = sim.run(), execution = { initial, result, replay: replayState(sim, result, saved.context) };
    const traced = { trace, execution, difference: compareExecution(saved.original, execution) };
    expect(traced.difference).toBeNull();
    expect(compareExecution(plain.execution, traced.execution)).toBeNull();
    expect(traced.execution).toEqual(saved.original); // Every field, including the game replay envelope.
    const boundary = traced.trace!.steps.find(s => s.stepStart === catcher.t)!;
    // The normal game's later call may install a direct man controller or a
    // matching-coverage wrapper. Assert actual update entry independently of
    // the recorder; never derive authorship from the endpoint's replacement.
    expect(entries.has(catcher.t)).toBe(true);
    expect(boundary.decision!.owner.controller).toBe(entries.get(catcher.t)!.controller);
    expect(boundary.decision!.owner.kind).toBe(entries.get(catcher.t)!.kind);
    // The captured game decides man or zone for this corner, and a matching
    // wrapper may hand its man job to zone inside the same controller; either
    // way it is a coverage controller, not a pursuit broadcast.
    const owner = boundary.decision!.owner.controller;
    // INFO-1 retires the physical catch's universal controller notification.
    // The same observer-off/on restoration assertions above remain exact.
    expect(boundary.endpoint!.behavior.controller).toBe(owner);
    // Only his own coverage stages (field containment, hip orientation) and
    // teammate spacing may rewrite the command at the catch: he is still
    // covering, not in contact or a tackle.
    const free = ['containment', 'coverage-orientation', 'spacing'];
    expect(boundary.rewrites.every(r => free.includes(r.stage))).toBe(true);
    for (const s of traced.trace!.steps) {
      expect(s.decision!.owner.controller).toBe(owner);
      expect(['man', 'zone']).toContain(s.decision!.owner.kind);
      expect(['man', 'zone']).toContain(s.endpoint!.behavior.kind);
    }
    const noEnergy = restoreSetup(saved.setup); delete noEnergy.energy;
    const rested = new PlaySim(noEnergy);
    expect(rested.agents.some((a, i) => a.body.energy !== saved.original.initial.actors[i].energy)).toBe(true);
    // The film uses the original game recording, not the independently executed play.
    expect(originalFilm(saved)).toContain(saved.game.playId);
    expect(originalFilm(saved)).toContain('captured prefix score');
  });

  it('writes and reloads the authoritative binary with context frozen before later game changes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'football-play-'));
    try {
      const file = join(dir, 'play.bin'); writeFileSync(file, serialize(captured.saved));
      const saved = readSavedPlay(file);
      expect(saved).toEqual(captured.saved);
      expect(saved.context.state.clock).toBeGreaterThan(captured.endpoint.clock);
      expect(Math.abs(saved.context.state.clock - saved.film.clock)).toBeLessThanOrEqual(.5); // Film rounds the pre-snap clock.
      expect(runRestoredPlay(saved).difference).toBeNull();
      const invalid = copySaved(saved); invalid.setupSha256 = 'corrupt';
      writeFileSync(file, serialize(invalid));
      expect(() => readSavedPlay(file)).toThrow('checksum');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('reports the earliest saved divergence across frames/events rather than a later final-yardage difference', () => {
    const expected = captured.saved.original, altered = copySaved(expected);
    const frame = altered.result.frames![5]; frame.agents[0] += .01;
    const laterEvent = altered.result.events.find(e => e.t > frame.t)!; laterEvent.note = 'changed';
    altered.result.yards += 1;
    const d = compareExecution(expected, altered)!;
    expect(d.path).toBe('$.result.frames[5].agents[0]');
    expect(d.time).toBe(frame.t); expect(d.timeBasis).toBe('recorded');
    const initialization = copySaved(expected); initialization.initial.actors[0].energy -= .01;
    expect(compareExecution(expected, initialization)).toMatchObject({ path: '$.initial.actors[0].energy', time: 0, timeBasis: 'initialization' });
    expect(firstDifference([], [undefined])).toMatchObject({ path: '$[0]', expected: '<absent>', actual: '<undefined>' });
    expect(firstDifference({}, { missing: undefined })).not.toBeNull();
    expect(firstDifference({ value: null }, {})).toMatchObject({ expected: null, actual: '<absent>' });
  });

  it.each([-.5, .5])('orders a declared synthetic %ss frame against time-zero initialization', time => {
    // Clock-order unit fixture, not a restorable simulator checkpoint. Ordinary
    // plays need not contain pre-snap motion or a negative fifth frame.
    const expected = copySaved(captured.saved.original);
    const anchor = expected.result.frames![5].t;
    // Build the declared clock around its anchor. Adding a computed shift to
    // the anchor can leave -0.49999999999999994 instead of exactly -0.5.
    for (const frame of expected.result.frames!) frame.t = time + (frame.t - anchor);
    for (const event of expected.result.events) event.t = time + (event.t - anchor);
    expect(expected.result.frames![5].t).toBe(time);
    const altered = copySaved(expected);
    altered.result.frames![5].agents[0] += .01;
    altered.initial.actors[0].energy -= .01;
    const frameDifference = { path: '$.result.frames[5].agents[0]', time, timeBasis: 'recorded' };
    const initializationDifference = { path: '$.initial.actors[0].energy', time: 0, timeBasis: 'initialization' };
    expect(compareExecution(expected, altered)).toMatchObject(time < 0 ? frameDifference : initializationDifference);
  });
});

describe('known PlaySetup class behavior', () => {
  it('retains advanced RNG state including a spare normal, nondefault scouting strengths, Maps and identity aliases', () => {
    const setup = nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false });
    const rng = new Rng(971); rng.nextU32(); rng.gaussian(); setup.seed = rng;
    setup.energy = new Map(Object.values(setup.offense).map(p => [p!.id, .83]));
    setup.offStyle = { wrRoom: .9, olWidth: -.08 }; setup.defStyle = { cbDepth: -.5, safetyDepth: .8 };
    setup.scouting = new ScoutingReport(3); setup.coverageScouting = new CoverageScouting(4); setup.audibles = true;
    const context = { down: 2, distance: 8, yardline: 30, personnel: '11' as const, qb: 'gun' as const, empty: false, hurry: false };
    for (let n = 0; n < 9; n++) { setup.scouting.observe(context, true); setup.coverageScouting.observe(setup.defCall); }
    const expectedRng = Object.assign(new Rng(0), rng);
    const bytes = captureSetup(setup), restored = restoreSetup(bytes);
    expect(restored.seed).toBeInstanceOf(Rng);
    const next = restored.seed as Rng;
    expect(next.gaussian()).toBe(rng.gaussian());
    expect(next.nextU32()).toBe(rng.nextU32());
    expect(next.fork('child').nextU32()).toBe(rng.fork('child').nextU32());
    expect(restored.scouting!.plays()).toBe(setup.scouting.plays());
    expect(restored.scouting!.passLogOdds(context)).toBe(setup.scouting.passLogOdds(context));
    expect(restored.coverageScouting!.frequencies()).toEqual(setup.coverageScouting.frequencies());
    expect(restored.coverageScouting!.disguiseRate()).toBe(setup.coverageScouting.disguiseRate());
    expect(restored.energy).toBeInstanceOf(Map);
    const aliased = restoreSetup(captureSetup({ ...setup, offStyle: setup.defStyle }));
    expect(aliased.offStyle).toBe(aliased.defStyle);
    const originalRun = new PlaySim({ ...setup, seed: expectedRng }), restoredRun = new PlaySim(restoreSetup(bytes));
    expect(originalRun.run()).toEqual(restoredRun.run());
    const again = restoreSetup(bytes); again.seed = new Rng((again.seed as Rng).key);
    expect({ ...new PlaySim(again).rng }).not.toEqual({ ...new PlaySim(restoreSetup(bytes)).rng });
    const unsupported = { ...setup, offStyle: new Date() } as unknown as typeof setup;
    expect(() => captureSetup(unsupported)).toThrow('Unsupported PlaySetup prototype');
  });

  it('composes constructor-input observers in order without replacing other game hooks', () => {
    const calls: string[] = [];
    const a = { playSetup: () => { calls.push('a'); }, tryChoice: () => 'two' as const };
    const b = { playSetup: () => { calls.push('b'); } };
    const hooks = composeHooks(a, b);
    hooks.playSetup!({} as never, {} as never);
    expect(calls).toEqual(['a', 'b']);
    expect(hooks.tryChoice!('home')).toBe('two');
  });
});
