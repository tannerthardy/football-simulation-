import { describe, expect, it } from 'vitest';
import { DETECTORS } from '../scripts/scorecard/weird/detectors.js';
import { Tracker } from '../scripts/scorecard/weird/tracker.js';
import type { DetectorId, WAgent, WFrame } from '../scripts/scorecard/weird/types.js';

const agent = (idx: number, patch: Partial<WAgent> = {}): WAgent => ({
  idx, team: 'D', slot: `P${idx}`, x: 0, y: 0, vx: 0, vy: 0, facing: 0,
  rvx: 0, rvy: 0, rfacing: null, engaged: false, down: false, inBond: false,
  blocks: -1, job: '', ...patch,
});
const frame = (t: number, agents: WAgent[], patch: Partial<WFrame> = {}): WFrame => ({
  t, phase: 'live', isPass: false, offense: true, runner: -1, agents, ...patch,
});
const ticks = (n: number, make: (t: number, i: number) => WFrame) =>
  Array.from({ length: n }, (_, i) => make(i / 20, i));

/** Same bounded copied-state interface the observer supplies, no simulator. */
function run(id: DetectorId, frames: WFrame[]) {
  const tracker = new Tracker(DETECTORS.filter(d => d.id === id), frames[0].agents.map(a => a.slot));
  const recent: WFrame[] = [];
  let flight: WFrame[] = [];
  for (const f of frames) {
    if (f.ball?.kind === 'air') {
      if (flight[0]?.ball?.releaseT !== f.ball.releaseT) flight = [];
      flight.push(f);
    }
    tracker.feed({ ...f, recent, flight });
    if (f.ball?.kind !== 'air') flight = [];
    recent.push(f);
    while (recent.length && f.t - recent[0].t > .55 + 1e-9) recent.shift();
  }
  tracker.close();
  return tracker.events;
}

describe('frozen: a request flag, not a failed-block verdict', () => {
  const scene = (t: number, patch: Partial<WAgent> = {}) => frame(t, [
    agent(0, { team: 'O', slot: 'RT', job: 'climb', vx: .8, ...patch }),
    agent(1, { team: 'O', slot: 'RB' }),
  ], { runner: 1 });
  it('flags ten zero requests, retaining achieved coasting and candidate status', () => {
    const events = run('frozen', ticks(10, t => scene(t)));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ candidate: true, t0: 0, t1: .45,
      intent: { speed: 0 }, achieved: { speed: .8 } });
  });
  it('also flags installed run work before the handoff (historical S7-P070)', () => {
    expect(run('frozen', ticks(10, t => ({ ...scene(t), runner: -1 })))).toHaveLength(1);
  });
  it('does not flag an engaged/down blocker, pass protection, or an unknown job', () => {
    for (const patch of [{ engaged: true }, { down: true }, { inBond: true }, { job: 'drive' }, { rvx: .3 }])
      expect(run('frozen', ticks(10, t => scene(t, patch)))).toEqual([]);
    expect(run('frozen', ticks(10, t => ({ ...scene(t), isPass: true })))).toEqual([]);
  });
  it('does not bridge two brief quiet requests across movement or engagement', () => {
    expect(run('frozen', ticks(10, (t, i) => scene(t, { rvx: i === 4 ? 1 : 0 })))).toEqual([]);
    expect(run('frozen', ticks(10, (t, i) => scene(t, { engaged: i === 4 })))).toEqual([]);
    expect(run('frozen', ticks(7, t => scene(t)))).toEqual([]);
  });
});

describe('downalone: complete prior distance evidence and a new fall', () => {
  const scene = (t: number, near = 4, patch: Partial<WAgent> = {}) => frame(t, [
    agent(0, { team: 'O', slot: 'QB', down: t >= .6, ...patch }),
    agent(1, { slot: 'DE_W', x: near }),
  ], { qb: 0, isPass: true });
  it('flags the onset once after a full clear half second', () => {
    expect(run('downalone', ticks(16, t => scene(t)))).toMatchObject([
      { candidate: true, t0: .6, achieved: { nearestDefender: 4, priorSeconds: .5 } },
    ]);
  });
  it('does not flag a sack with contact or a defender near on any prior tick', () => {
    expect(run('downalone', ticks(16, t => scene(t, 1)))).toEqual([]);
    expect(run('downalone', ticks(16, (t, i) => scene(t, i === 5 ? 1.9 : 4)))).toEqual([]);
    expect(run('downalone', ticks(16, t => scene(t, 4, { inBond: true })))).toEqual([]);
  });
  it('treats missing history/defenders and an already down QB as unknown', () => {
    expect(run('downalone', [scene(.6)])).toEqual([]);
    expect(run('downalone', ticks(16, t => scene(t, 4, { down: true })))).toEqual([]);
    expect(run('downalone', ticks(16, t => ({ ...scene(t), agents: [scene(t).agents[0]] })))).toEqual([]);
  });
});

describe('blindball: whole-flight facing proxy with shoulder side', () => {
  const scene = (t: number, patch: Partial<WAgent> = {}): WFrame => frame(t, [
    agent(0, { team: 'O', slot: 'Z', x: 10 }),
    agent(1, { slot: 'CB_S', x: 9, manTarget: 0, ...patch }),
  ], { isPass: true, ball: t < .2 ? { kind: 'air', x: 1 + t * 10, y: 1, vx: 10, vy: 0,
    releaseT: 0, target: 0, throwaway: false, deflected: false } : { kind: 'held' } });
  it('flags only at flight end, labels body-facing and reports the arrival side', () => {
    expect(run('blindball', ticks(4, t => scene(t)))).toEqual([]);
    const events = run('blindball', ticks(5, t => scene(t)));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ candidate: true, t0: 0, achieved: { arrivalSide: 'left-rear' } });
    expect(events[0].text).toContain('not gaze evidence');
  });
  it('does not flag a defender who turns, a zone defender, or one ahead/far away', () => {
    for (const patch of [{ facing: Math.PI }, { manTarget: null }, { x: 11 }, { x: 7 }])
      expect(run('blindball', ticks(5, t => scene(t, patch)))).toEqual([]);
    expect(run('blindball', ticks(5, (t, i) => scene(t, { facing: i === 2 ? .7 : 0 })))).toEqual([]);
  });
  it('rejects incomplete/missing/deflected/throwaway flight data', () => {
    expect(run('blindball', ticks(5, t => scene(t)).slice(2))).toEqual([]);
    for (const key of ['deflected', 'throwaway'] as const) {
      expect(run('blindball', ticks(5, t => {
        const f = scene(t); if (f.ball?.kind === 'air') f.ball[key] = true; return f;
      }))).toEqual([]);
    }
    expect(run('blindball', ticks(5, t => ({ ...scene(t), ball: undefined })))).toEqual([]);
  });
  it('also checks the final airborne tick when the play ends during flight', () => {
    const frames = ticks(4, t => scene(t)); frames[3].ended = true;
    expect(run('blindball', frames)).toHaveLength(1);
  });
});

describe('phantomlane: travel versus static installed-aim bearing', () => {
  const scene = (patch: Partial<WAgent> = {}, d: Partial<WAgent> = {}) => frame(1, [
    agent(0, { team: 'O', slot: 'RB', vy: 3, rvy: 3, ...patch }),
    agent(1, { slot: 'LB_M', y: 2, ...d }),
  ], { runner: 0, runAim: { x: 4, y: 0 } });
  it('flags a 90-degree departure toward a defender and reports both headings', () => {
    expect(run('phantomlane', [scene()])).toMatchObject([{ candidate: true,
      intent: { heading: 90, installedAimHeading: 0 }, achieved: { heading: 90, defenderAhead: 2 } }]);
  });
  it('does not flag the designed heading, no obstacle, or a defender behind', () => {
    expect(run('phantomlane', [scene({ vx: 3, vy: 0 })])).toEqual([]);
    for (const d of [{ x: 2 }, { y: 3.1 }, { y: -1 }, { down: true }])
      expect(run('phantomlane', [scene({}, d)])).toEqual([]);
  });
  it('does not invent a track for a scramble, missing aim, or beyond the landmark', () => {
    for (const patch of [{ isPass: true }, { runAim: undefined }, { runAim: { x: -1, y: 0 } }])
      expect(run('phantomlane', [{ ...scene(), ...patch }])).toEqual([]);
  });
});
