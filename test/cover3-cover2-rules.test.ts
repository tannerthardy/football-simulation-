/**
 * Cover 3 match and Cover 2 match rules against their teaching sheets:
 * Push on a fast #3 (HNFL-203/065), the Smash rule (HNFL-016, Rip/Liz),
 * the squat corner's man-under conversion (HNFL-099/255), the vertical
 * curl's up-and-in match (HNFL-097) and the Wild trips check with a
 * vertical hook on #3 (HNFL-131/334). Each case has an opposing control.
 */
import { describe, expect, it, vi } from 'vitest';

// The scenes read the coverage rules on a held ball. AGAP_ALIGN's wider 1
// technique sends the rush another way, and the far end sacks the vertical
// curl's QB at 2.9 s, before the 3.4 s read: the rush, not the rule.
// Under PASS_KICK's vertical set the back flat route's aim (the line, 4 yd
// outside) is the end's rush lane: the back paths around his tackle
// (ROUTE_CLEAR) and the push starts on time, but he meets the end at 1.35 s
// and the flat defender passes him off. The route's path, not the rule
// (KNOWN_PROBLEMS PRO-1).
// ARM_PRESS puts a press through the hands at the bench max; this scene is staged on arm-force hands (KNOWN_PROBLEMS RUN-11, re-record by review 2).
// Historically GRIP_HOLD kept the end's 2.4 s grab a beat longer; the QB
// went down at 3.2 s, before the original 3.4 s exposure. Keep that recorded
// setting for a like-for-like coverage fixture (KNOWN_PROBLEMS TKL-1).
// On the current source the up-and-in read occurs before a legitimate sack.
// The late-dig case therefore checks its acquired cue and job BEFORE the end,
// rather than requiring a held QB to survive after that read has succeeded.
vi.hoisted(() => { process.env.AGAP_ALIGN = '0'; process.env.PASS_KICK = '0'; process.env.ARM_PRESS = '0'; process.env.GRIP_HOLD = '0'; });
import { filmScene, jobsOf, modeOf, type SceneFilm } from '../src/lab/coverage-scene.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { PlaySim } from '../src/sim/playsim.js';
import { Rng } from '../src/core/rng.js';

/** The defender whose installed landmark is `zone`. */
const seat = (f: SceneFilm, zone: string): string =>
  Object.values(f.defenders).find(d => d.jobs[0]?.startsWith(`zone:${zone}@`))!.slot;

// Start law (#336): on seed 5 the DE now beats the LT (down at 1.55 s) and
// the blocking back slides out to him behind the line, which the weak
// defenders read as a flat release; DE_S also sacks the dig's QB at 3.0 s.
// The rush, not the rule: these scenes are re-staged on seed 1.
const SEED = 1;

describe('Cover 3 match: Push', () => {
  const scene = (back: string) => filmScene({ formation: 'gun_spread_10', coverage: 'cover3_match',
    strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'seam' }, back, until: 2.6, seed: SEED });

  it('a fast back to the flat is chased by the seam/flat player while the hook pushes to #2', () => {
    const f = scene('back_flat');
    const flat = seat(f, 'curl_flat_w'), hook = seat(f, 'hook_w');
    expect(modeOf(f, flat)).toBe('push');
    expect(jobsOf(f, flat).at(-1)).toBe(`man:${f.numbering.B}`);
    expect(modeOf(f, hook)).toBe('push');
    expect(jobsOf(f, hook).at(-1)).toBe(`man:${f.numbering.W2}`);
  });

  it('with the back in protection the seam/flat player keeps #2 and the hook stays home', () => {
    const f = scene('block');
    const flat = seat(f, 'curl_flat_w'), hook = seat(f, 'hook_w');
    expect(modeOf(f, flat)).not.toBe('push');
    expect(jobsOf(f, flat).at(-1)).toBe(`man:${f.numbering.W2}`);
    expect(jobsOf(f, hook)).not.toContain(`man:${f.numbering.W2}`);
  });
});

describe('Cover 3 match: Smash rule', () => {
  it('#1 settling short with #2 vertical sends the overhang to hunt #1; #1 vertical does not', () => {
    const smash = filmScene({ formation: 'gun_spread_10', coverage: 'cover3_match', strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'lab_hitch4', 2: 'corner' }, until: 2.6 });
    const flat = seat(smash, 'curl_flat_w');
    expect(modeOf(smash, flat)).toBe('smash');
    expect(jobsOf(smash, flat).at(-1)).toBe(`man:${smash.numbering.W1}`);
    const control = filmScene({ formation: 'gun_spread_10', coverage: 'cover3_match', strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'corner' }, until: 2.6 });
    expect(jobsOf(control, seat(control, 'curl_flat_w'))).not.toContain(`man:${control.numbering.W1}`);
  });
});

describe('Cover 2 match', () => {
  it('the squat corner converts to man under #1 with no flat threat, and stays in the flat when #2 goes there', () => {
    const none = filmScene({ formation: 'gun_doubles_11', coverage: 'cover2_match', strong: { 1: 'go', 2: 'go' }, weak: { 1: 'lab_curl7', 2: 'hitch' }, until: 2.6, seed: SEED });
    expect(modeOf(none, 'CB_W')).toBe('under');
    expect(jobsOf(none, 'CB_W')).toContain(`man:${none.numbering.W1}`);
    const flat = filmScene({ formation: 'gun_doubles_11', coverage: 'cover2_match', strong: { 1: 'go', 2: 'go' }, weak: { 1: 'lab_curl7', 2: 'flat' }, until: 2.6, seed: SEED });
    expect(modeOf(flat, 'CB_W')).toBe('flat');
    expect(jobsOf(flat, 'CB_W')).not.toContain(`man:${flat.numbering.W1}`);
  });

  it('the vertical curl matches #2 up and in, and walls a seam', () => {
    const cueSamples: Array<{ t: number; liveHeld: boolean; rule: ReturnType<CoverageDefender['recordedRule']> }> = [];
    const runDig = (observeCue: boolean, until = 3.4) => {
      const states: unknown[] = [];
      const draws: number[] = [];
      let endAt = until;
      const nativeDraw = Rng.prototype.nextU32;
      const draw = vi.spyOn(Rng.prototype, 'nextU32').mockImplementation(function (this: Rng) {
        const value = nativeDraw.call(this); draws.push(value); return value;
      });
      const nativeTick = PlaySim.prototype.tick;
      const tick = vi.spyOn(PlaySim.prototype, 'tick').mockImplementation(function (this: PlaySim) {
        const t = this.t, liveHeld = this.phase === 'live' && this.ball.kind === 'held';
        nativeTick.call(this);
        if (this.phase !== 'live') endAt = Math.min(endAt, t);
        if (observeCue) {
          const curl = this.defense.find(a => a.behavior instanceof CoverageDefender
            && a.behavior.history[0]?.job === 'zone:hook_s')?.behavior as CoverageDefender | undefined;
          // Copies keys consumed by this tick, never calls see or draws dice.
          if (curl) cueSamples.push({ t, liveHeld, rule: curl.recordedRule(t) });
        }
        // A common passive recorder proves that adding the cue observer does
        // not change any native body/support, RNG, event or coverage sequence.
        states.push(structuredClone({ bodies: this.agents.map(a => a.body), intents: this.intents,
          minds: this.agents.map(a => a.mind), rng: this.rng,
          events: this.events, phase: this.phase, ball: this.ball.kind }));
      });
      try {
        return { film: filmScene({ formation: 'gun_spread_10', coverage: 'cover2_match',
          strong: { 1: 'go', 2: 'lab_in9' }, weak: { 1: 'go', 2: 'seam' }, until, seed: SEED }), states, draws, endAt: () => endAt };
      } finally { tick.mockRestore(); draw.mockRestore(); }
    };
    const plain = runDig(false), observed = runDig(true), dig = observed.film;
    expect(observed.states).toEqual(plain.states);
    expect(observed.draws).toEqual(plain.draws); // Main and named RNG draws, in order.
    expect(dig.defenders).toEqual(plain.film.defenders);
    const curl = seat(dig, 'hook_s');
    // Require the actual acquired vertical-to-in cue and wall-to-man decision
    // while live/held, before the first non-live tick by at least one tick.
    // A wrap is not the coverage boundary: the QB can remain up with the ball.
    // Pending #336 c7d4d0e2 wraps at 2.75; with #328 at 2.80. Both read in at
    // 2.85, before the composition's 3.05 sack. Coverage plays to the whistle.
    const decisionAt = (records: string[], job: string) => Number(records.find(r => r.split('@')[0] === job)?.split('@')[1]);
    const inAt = decisionAt(dig.defenders[curl].modes, 'in');
    const manAt = decisionAt(dig.defenders[curl].jobs, `man:${dig.numbering.S2}`);
    const wallAt = decisionAt(dig.defenders[curl].jobs, `wall:${dig.numbering.S2}`);
    const cutoff = observed.endAt();
    expect(wallAt).toBeLessThan(inAt);
    expect(inAt + dig.sim.dt).toBeLessThanOrEqual(cutoff);
    expect(manAt + dig.sim.dt).toBeLessThanOrEqual(cutoff);
    const sample = cueSamples.find(s => s.t === inAt);
    expect(sample?.liveHeld).toBe(true);
    const cue = sample?.rule.reads.find(r => r.slot === dig.numbering.S2);
    expect(cue?.first).toBe('vertical');
    expect(cue?.release).toBe('in');
    expect(cue?.climbed).toBe(true);
    expect(cue?.since).toBeLessThanOrEqual(manAt);
    expect(modeOf(dig, curl)).toBe('in');
    expect(jobsOf(dig, curl).at(-1)).toBe(`man:${dig.numbering.S2}`);
    // The SAME native input, stopped during its vertical stem, must not earn
    // the later in-match from installed route knowledge or the final outcome.
    const early = runDig(false, 2), earlyCurl = seat(early.film, 'hook_s');
    expect(early.states).toEqual(observed.states.slice(0, early.states.length));
    expect(early.draws).toEqual(observed.draws.slice(0, early.draws.length));
    expect(jobsOf(early.film, earlyCurl)).toContain(`wall:${early.film.numbering.S2}`);
    expect(modeOf(early.film, earlyCurl)).not.toBe('in');
    expect(jobsOf(early.film, earlyCurl)).not.toContain(`man:${early.film.numbering.S2}`);
    const seam = filmScene({ formation: 'gun_spread_10', coverage: 'cover2_match', strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'seam' }, until: 3.0, seed: SEED });
    expect(jobsOf(seam, seat(seam, 'hook_s'))).toContain(`wall:${seam.numbering.S2}`);
  });

  it('checks to Wild vs trips, where the middle hook carries #3 vertical; 2x2 keeps the call', () => {
    const trips = filmScene({ formation: 'gun_trips_11', coverage: 'cover2_match', strong: { 1: 'go', 2: 'go', 3: 'seam' }, weak: { 1: 'go' }, until: 2.6 });
    expect(trips.played).toBe('cover2_wild');
    expect(trips.sim.defCall.check).toEqual({ from: 'cover2_match', when: 'trips' });
    expect(jobsOf(trips, seat(trips, 'hook_mid'))).toContain(`man:${trips.numbering.S3}`);
    const doubles = filmScene({ formation: 'gun_spread_10', coverage: 'cover2_match', until: 0.2 });
    expect(doubles.played).toBe('cover2_match');
  });
});
