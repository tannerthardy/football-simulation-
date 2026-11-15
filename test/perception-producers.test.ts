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
    expect(names).toEqual(['BALL_EST', 'BALL_EST_LOOMING', 'BALL_EST_MOVING_CHOICE', 'BALL_EST_NO_TRACKPEN', 'BallEstimates', 'LOOK_NECK', 'PRE_LOOK_EARLY', 'PRE_LOOK_LATE',
      'PathSample', 'bodyTurnLead', 'fitFlight', 'lookJoints', 'neckOf', 'ownRoutes', 'sideOf'].sort());
  });
  it('is the only file that holds BallEstimates besides the owner of the state', () => {
    const users = files.filter(f => f.file !== 'src/sim/ball-estimate.ts' && /\bBallEstimates\b/.test(f.text)).map(f => f.file);
    expect(users).toEqual(['src/sim/playsim.ts']);
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
