import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Two files read the true ball on purpose, as perception: the estimate producer and the release-evidence record. The information scan lets them
// read it (an exemption and a row); this test is the other half of that deal: what makes each one a perception producer must stay true.
const root = new URL('..', import.meta.url).pathname;
const sources = (dir: string): string[] => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : []; });
const files = sources(join(root, 'src')).map(p => ({ file: relative(root, p).split('\\').join('/'), text: readFileSync(p, 'utf8') }));
const get = (file: string) => files.find(f => f.file === file)!.text;

describe('ball-estimate.ts is a perception producer', () => {
  const text = get('src/sim/ball-estimate.ts');
  it('states what makes it one', () => {
    const header = text.slice(0, text.indexOf('*/'));
    for (const phrase of ['PERCEPTION PRODUCER', 'perception delay ago', 'own head and sight gate', 'with angular and range error', 'own estimate', 'only playsim.ts'])
      expect(header, phrase).toContain(phrase);
  });
  it('exports no read of the true ball: a new export is reviewed here before it can be used', () => {
    const names = [...text.matchAll(/^export (?:const|function|class|type|interface) (\w+)/gm)].map(m => m[1]).sort();
    // Reviewed 2026-11-16 at the engine-71 refresh: the new exports are flags and constants (BALL_EST_DEEP_LOOK, _DEF_ONLY, _GLANCE, _INCIDENTAL, _MAN_LOOK, _RCV, _RCV_ONLY, _SERVO, _TRUNK; DEEP_LOOK_DEPTH/HOLD,
    // GAZE_SEARCH, GLANCE_DEPTH/DWELL_TARGET/HOLD_REF, PHASE_BEHIND) and four functions whose inputs are a team, ratings or numbers (estimatesFor, glanceSd, lookAnyway, phaseJudgeSd): none takes or returns the true ball.
    // Reviewed 2026-11-16 at the engine-72 refresh: SEEN_EMPTY is a flag constant (`process.env.SEEN_EMPTY !== '0'`); it takes and returns no ball.
    // Reviewed 2026-11-25 (Defense, HANDS_SEEN): HANDS_SEEN is a flag constant; handsCone takes an agent's vision rating and
    // returns an angle. Neither takes or returns the true ball (BallEstimates.handsSees is a method and returns only whether
    // the ball has been in his peripheral cone for his reaction time).
    expect(names).toEqual([
      'BALL_EST', 'BALL_EST_DEEP_LOOK', 'BALL_EST_DEF_ONLY', 'BALL_EST_GLANCE', 'BALL_EST_INCIDENTAL', 'BALL_EST_LOOMING',
      'BALL_EST_MAN_LOOK', 'BALL_EST_MOVING_CHOICE', 'BALL_EST_NO_TRACKPEN', 'BALL_EST_RCV', 'BALL_EST_RCV_ONLY', 'BALL_EST_SERVO',
      'BALL_EST_TRUNK', 'BallEstimates', 'DEEP_LOOK_DEPTH', 'DEEP_LOOK_HOLD', 'GAZE_SEARCH', 'GLANCE_DEPTH',
      'GLANCE_DWELL_TARGET', 'GLANCE_HOLD_REF', 'HANDS_SEEN', 'LOOK_NECK', 'PHASE_BEHIND', 'PRE_LOOK_EARLY', 'PRE_LOOK_LATE',
      'PathSample', 'SEEN_EMPTY', 'bodyTurnLead', 'estimatesFor', 'fitFlight', 'glanceSd', 'handsCone', 'lookAnyway',
      'lookJoints', 'neckOf', 'ownRoutes', 'phaseJudgeSd', 'sideOf'].sort());
  });
});

describe('release-evidence.ts: the ball record has one reader', () => {
  const text = get('src/sim/release-evidence.ts');
  it('recordBall is private and called once, inside releaseEvidence', () => {
    expect(text).not.toMatch(/export (?:const|function) recordBall/);
    expect([...text.matchAll(/\brecordBall\(/g)].length).toBe(2); // the definition and its single call
    const call = text.indexOf('recordBall(sim)');
    expect(text.lastIndexOf('export function releaseEvidence', call)).toBeGreaterThan(text.lastIndexOf('function recordBall'));
  });
  it('its flight record is read only as a cue judged by sawAt at the sample moment', () => {
    expect([...text.matchAll(/\bflights\b/g)].length).toBe(3); // declaration, get, set: the WeakMap never leaves recordBall
    expect(text).toMatch(/sawAt\(sim, observer, [^)]*\)/);
  });
  it('no other file reads the record', () => {
    expect(files.filter(f => f.file !== 'src/sim/release-evidence.ts' && /\brecordBall\b|\breleaseEvidence\b/.test(f.text)).map(f => f.file)).toEqual(['src/sim/release-belief.ts']);
  });
});
