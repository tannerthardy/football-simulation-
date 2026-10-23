/**
 * Film weirdness detectors (scripts/scorecard/weird): each rule gets one scene
 * where it must fire and one where it must not, staged as WFrame literals with
 * no simulation. The tracker's merging and the NFL retention table are checked
 * too. Detectors say where to look; nothing here is tuned to a count.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DETECTORS, RETENTION_FALLBACK, RETENTION_P90, retentionThreshold } from '../scripts/scorecard/weird/detectors.js';
import { Tracker } from '../scripts/scorecard/weird/tracker.js';
import type { DetectorId, WAgent, WFrame } from '../scripts/scorecard/weird/types.js';

const PI = Math.PI;
const agent = (idx: number, o: Partial<WAgent> = {}): WAgent => ({
  idx, team: 'D', slot: `P${idx}`, x: 50 + idx, y: 40, vx: 0, vy: 0, facing: 0, rvx: 0, rvy: 0, rfacing: null,
  engaged: false, down: false, inBond: false, blocks: -1, job: '', ...o,
});
const frame = (t: number, agents: WAgent[], o: Partial<WFrame> = {}): WFrame =>
  ({ t, phase: 'live', isPass: false, offense: true, runner: -1, agents, ...o });
/** `n` ticks of the same scene from t0 at DT = 0.05. */
const hold = (n: number, mk: (t: number) => WFrame, t0 = 0): WFrame[] =>
  Array.from({ length: n }, (_, k) => mk(Math.round((t0 + k * 0.05) * 100) / 100));
function run(frames: WFrame[], ids?: DetectorId[]) {
  const slots = frames[0].agents.map((a) => a.slot);
  const tr = new Tracker(DETECTORS.filter((d) => !ids || ids.includes(d.id)), slots);
  for (const f of frames) tr.feed(f);
  tr.close();
  return tr;
}
const of = (tr: Tracker, id: DetectorId) => tr.events.filter((e) => e.detector === id);

describe('pre-snap teammate contact', () => {
  const scene = (b: Partial<WAgent>, contacts = [{ i: 0, j: 1, impulse: 12, closing: 1.4 }]) => frame(-0.35, [
    agent(0, { team: 'O', slot: 'RB' }), agent(1, { team: 'O', slot: 'QB', ...b }),
  ], { phase: 'pre', contacts, motion: { kind: 'jet', slot: 'RB' } });
  it('fires when two offensive bodies touch, and names the motion', () => {
    const tr = run([scene({})], ['presnap']);
    expect(of(tr, 'presnap')).toHaveLength(1);
    expect(of(tr, 'presnap')[0].text).toContain('jet RB motion');
    expect(of(tr, 'presnap')[0].players).toEqual(['RB', 'QB']);
  });
  it('ignores offense-defense contact and a play with no contact', () => {
    expect(of(run([scene({ team: 'D' })], ['presnap']), 'presnap')).toHaveLength(0);
    expect(of(run([scene({}, [])], ['presnap']), 'presnap')).toHaveLength(0);
  });
  it('merges the steps of one touch into one event', () => {
    const tr = run([-0.4, -0.35, -0.3].map((t) => ({ ...scene({}), t })), ['presnap']);
    expect(of(tr, 'presnap')).toHaveLength(1);
  });
});

describe('defender turned away from a nearby runner', () => {
  const scene = (t: number, lb: Partial<WAgent> = {}, runner = 0) => frame(t, [
    agent(0, { team: 'O', slot: 'RB', x: 10, y: 20 }),
    agent(1, { slot: 'LB_M', x: 13, y: 20, facing: 0, ...lb }), // his back is to the runner at 3 yd
  ], { runner });
  it('fires when he stays turned for a quarter second', () => {
    const tr = run(hold(8, (t) => scene(t)), ['turned']);
    const e = of(tr, 'turned');
    expect(e).toHaveLength(1);
    expect(e[0].text).toContain('LB_M facing 180° from the runner (RB) at 3 yd');
  });
  it('logs what he asked for beside what he did', () => {
    const e = of(run(hold(8, (t) => scene(t, { rfacing: PI })), ['turned']), 'turned')[0];
    expect(e.intent).toMatchObject({ facingOff: 0, source: 'asked' });
    expect(e.achieved).toMatchObject({ facingOff: 180 });
  });
  it('does not fire for a zone dropper when there is no runner', () => {
    expect(of(run(hold(8, (t) => scene(t, {}, -1)), ['turned']), 'turned')).toHaveLength(0);
  });
  it('does not fire when he faces the runner, is blocked, is down or the turn is brief', () => {
    expect(of(run(hold(8, (t) => scene(t, { facing: PI })), ['turned']), 'turned')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { engaged: true })), ['turned']), 'turned')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { down: true })), ['turned']), 'turned')).toHaveLength(0);
    expect(of(run(hold(3, (t) => scene(t)), ['turned']), 'turned')).toHaveLength(0);
  });
});

describe('blocker on a man who is out of the play', () => {
  const scene = (t: number, o: { dx?: number; away?: number; pass?: boolean; guard?: Partial<WAgent> } = {}) => frame(t, [
    agent(0, { team: 'O', slot: 'RB', x: 5, y: 20 }),
    agent(1, { team: 'O', slot: 'RG', x: 4, y: 24, blocks: 2, job: 'cutoff' }),
    agent(2, { slot: 'DE_W', x: 5 + (o.dx ?? 7), y: 24, vx: o.away ?? 2 }),
    agent(3, { slot: 'LB_M', x: 7, y: 20, ...o.guard }), // free, 2 yd from the runner
  ], { runner: 0, isPass: o.pass ?? false });
  it('fires: his man is 7 yd from the runner and leaving while a free defender is on the runner', () => {
    const e = of(run(hold(8, (t) => scene(t)), ['stuck']), 'stuck');
    expect(e).toHaveLength(1);
    expect(e[0].text).toContain('RG (cutoff) on DE_W');
    expect(e[0].text).toContain('LB_M is free');
  });
  it('does not fire when his man is near the runner, is closing, or every defender near the runner is blocked', () => {
    expect(of(run(hold(8, (t) => scene(t, { dx: 2 })), ['stuck']), 'stuck')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { away: -2 })), ['stuck']), 'stuck')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { guard: { engaged: true } })), ['stuck']), 'stuck')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { pass: true })), ['stuck']), 'stuck')).toHaveLength(0);
  });
});

describe('lineman backpedaling while facing his own backfield', () => {
  const scene = (t: number, o: Partial<WAgent> = {}) => frame(t, [
    agent(0, { team: 'O', slot: 'LG', x: 30, y: 25, facing: PI, vx: -2, ...o }),
  ]);
  it('fires when an unengaged guard faces his backfield and moves back', () => {
    const e = of(run(hold(8, (t) => scene(t)), ['backpedal']), 'backpedal');
    expect(e).toHaveLength(1);
    expect(e[0].text).toContain('LG facing 180° from downfield, moving back at 2 yd/s');
  });
  it('does not fire after a turnover, when downfield is the other way', () => {
    expect(of(run(hold(8, (t) => frame(t, scene(t).agents, { offense: false })), ['backpedal']), 'backpedal')).toHaveLength(0);
  });
  it('does not fire facing downfield (a pass set), engaged, or barely moving', () => {
    expect(of(run(hold(8, (t) => scene(t, { facing: 0 })), ['backpedal']), 'backpedal')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { engaged: true })), ['backpedal']), 'backpedal')).toHaveLength(0);
    expect(of(run(hold(8, (t) => scene(t, { vx: -0.5 })), ['backpedal']), 'backpedal')).toHaveLength(0);
  });
  it('is about offensive linemen only', () => {
    expect(of(run(hold(8, (t) => scene(t, { team: 'D', slot: 'DE_W' })), ['backpedal']), 'backpedal')).toHaveLength(0);
  });
});

describe('sliding through a cut', () => {
  /** Straight at 5 yd/s, a 90° turn over 0.5 s starting at 0.6 s, then straight. `slow` drops the speed through the turn. */
  function path(slot: string, slow = 1) {
    const frames: WFrame[] = [];
    let x = 20, y = 20;
    for (let k = 0; k <= 60; k++) {
      const t = Math.round(k * 5) / 100;
      const u = Math.min(1, Math.max(0, (t - 0.6) / 0.5));
      const heading = u * PI / 2;
      const speed = 5 * (1 - (1 - slow) * Math.sin(u * PI));
      const vx = speed * Math.cos(heading), vy = speed * Math.sin(heading);
      frames.push(frame(t, [agent(0, { slot, team: 'D', x, y, vx, vy, rvx: vx, rvy: vy })]));
      x += vx * 0.05; y += vy * 0.05;
    }
    return frames;
  }
  it('fires for a safety who turns 90° at full speed', () => {
    const tr = run(path('SS'), ['slide']);
    const e = of(tr, 'slide');
    expect(e).toHaveLength(1);
    expect(e[0].candidate).toBe(true);
    expect(e[0].text).toMatch(/SS turned \d+° from 5 yd\/s keeping (9\d|100)% of his speed/);
    expect(e[0].intent).toMatchObject({ turn: expect.any(Number) });
    expect(tr.counts['slide.episodes']).toBe(1);
  });
  it('does not fire when he plants and slows, though it is still counted as a sharp turn', () => {
    const tr = run(path('SS', 0.35), ['slide']);
    expect(of(tr, 'slide')).toHaveLength(0);
    expect(tr.counts['slide.episodes']).toBe(1);
  });
  it('ignores a shuffle: a jog that keeps its speed through a turn is not a slide', () => {
    const slow = path('SS').map((f) => ({ ...f, agents: f.agents.map((x) => ({ ...x, vx: x.vx * 0.3, vy: x.vy * 0.3, x: 20 + (x.x - 20) * 0.3, y: 20 + (x.y - 20) * 0.3 })) }));
    const tr = run(slow, ['slide']);
    expect(of(tr, 'slide')).toHaveLength(0);
    expect(tr.counts['slide.episodes']).toBe(0);
  });
  it('skips a turn made while blocked', () => {
    const frames = path('SS').map((f) => ({ ...f, agents: f.agents.map((a) => ({ ...a, engaged: true })) }));
    expect(of(run(frames, ['slide']), 'slide')).toHaveLength(0);
  });
  it('uses the role threshold, and a stated fallback for slots with no tracking role', () => {
    expect(retentionThreshold('SS')).toBe(RETENTION_P90.HIGH_SAFETY);
    expect(retentionThreshold('LT')).toBe(RETENTION_P90.T);
    expect(retentionThreshold('RB')).toBe(RETENTION_FALLBACK);
  });
});

describe('tracker', () => {
  const scene = (t: number, on: boolean) => frame(t, [agent(0, { team: 'O', slot: 'LG', facing: on ? PI : 0, vx: -2 })]);
  it('bridges a one-tick gap and starts a new event after a longer one', () => {
    const ticks = [...Array(6).keys()].map((k) => scene(k * 0.05, true));
    const bridged = [...ticks, scene(0.3, false), ...[0.35, 0.4, 0.45, 0.5, 0.55].map((t) => scene(t, true))];
    expect(of(run(bridged, ['backpedal']), 'backpedal')).toHaveLength(1);
    const split = [...ticks, scene(0.3, false), scene(0.35, false), ...[0.4, 0.45, 0.5, 0.55, 0.6, 0.65].map((t) => scene(t, true))];
    expect(of(run(split, ['backpedal']), 'backpedal')).toHaveLength(2);
  });
  it('counts hit frames even when no event results', () => {
    const tr = run(hold(3, (t) => scene(t, true)), ['backpedal']);
    expect(tr.counts['backpedal.frames']).toBe(3);
    expect(tr.counts['backpedal.events']).toBe(0);
  });
});

describe('NFL retention table', () => {
  it('is the trajectory-weighted p90 in the movement file', () => {
    const d = JSON.parse(readFileSync('data/reviews/physics-world/nfl-movement/bdb2027-movement.json', 'utf8'));
    const acc = new Map<string, [number, number]>();
    for (const [k, v] of Object.entries<any>(d.gameByDraftPositionAndRole)) {
      const role = k.split(':')[2];
      const r = v.playerMedianTurn?.speedRetention, n = v.turnTrajectories ?? 0;
      if (!r || n < 1 || r.n < 5) continue;
      const a = acc.get(role) ?? [0, 0];
      acc.set(role, [a[0] + n, a[1] + n * r.p90]);
    }
    for (const [role, thr] of Object.entries(RETENTION_P90)) {
      const [n, s] = acc.get(role) ?? [0, 0];
      expect(n, role).toBeGreaterThanOrEqual(90);
      expect(Math.abs(s / n - thr), role).toBeLessThan(0.006);
    }
  });
});
