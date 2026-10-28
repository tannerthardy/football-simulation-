import { describe, expect, it } from 'vitest';
import { DETECTORS } from '../scripts/scorecard/weird/detectors.js';
import { watchLine } from '../scripts/scorecard/weird/report.js';
import { Tracker } from '../scripts/scorecard/weird/tracker.js';
import type { Detector, WAgent, WeirdEvent } from '../scripts/scorecard/weird/types.js';

const agent = (idx: number, patch: Partial<WAgent>): WAgent => ({
  idx, team: 'D', slot: 'LB_M', x: 0, y: 0, vx: 0, vy: 0, facing: 0,
  rvx: 0, rvy: 0, rfacing: null, engaged: false, down: false, inBond: false,
  blocks: -1, job: '', ...patch,
});
function run(distances: number[]) {
  const tr = new Tracker(DETECTORS.filter(d => d.id === 'phantomlane'), ['RB', 'LB_M']);
  distances.forEach((y, i) => tr.feed({ t: 1 + i / 20, phase: 'live', isPass: false,
    offense: true, runner: 0, runAim: { x: 4, y: 0 }, agents: [
      agent(0, { team: 'O', slot: 'RB', vy: 3, rvy: 3 }), agent(1, { y }),
    ] }));
  tr.close();
  return tr;
}
const withoutTick = ({ representativeT: _tick, ...legacy }: Partial<WeirdEvent>) => legacy;

describe('representative detector tick', () => {
  it('distinguishes run histories with identical episode bounds and representative geometry', () => {
    const middle = run([2.5, .2, 1.5]), last = run([2.5, 1.5, .2]);
    expect(middle.events).toHaveLength(1);
    expect(last.events).toHaveLength(1);
    expect(middle.counts).toEqual(last.counts);
    expect(withoutTick(middle.events[0])).toEqual(withoutTick(last.events[0]));
    expect(middle.events[0]).toMatchObject({ t0: 1, t1: 1.1, representativeT: 1.05,
      achieved: { defenderAhead: .2 } });
    expect(last.events[0].representativeT).toBe(1.1);
  });

  it('retains the first representative on equal severity and when later hits are weaker', () => {
    expect(run([.2, .2, 1.5]).events[0].representativeT).toBe(1);
    const event = run([.2, 1, 1.5]).events[0];
    expect(event.representativeT).toBe(event.t0);
  });

  it('uses the existing minimum representative policy without substituting a backdated window start', () => {
    const detector: Detector = { id: 'slide', label: 'window fixture', minHold: 0, episodeMin: true,
      hit: f => [{ key: '0', players: [0], sev: f.t === 1.05 ? .5 : .9, at: .5, data: {} }],
      describe: () => 'window summary', accept: () => true };
    const tr = new Tracker([detector], ['RB']);
    for (const t of [1, 1.05, 1.1]) tr.feed({ t, phase: 'live', isPass: false, offense: true, runner: 0, agents: [] });
    tr.close();
    expect(tr.events[0]).toMatchObject({ t0: .5, t1: 1.1, representativeT: 1.05 });
  });

  it('shows a later evaluation tick alongside the episode start without relabeling a legacy record', () => {
    const event: WeirdEvent = { ...run([2.5, .2, 1.5]).events[0], id: 'G1-P001', play: 1 };
    expect(watchLine(event)).toContain('@ 1.00 s [representative detector tick 1.05 s]');
    const legacy = withoutTick(event) as WeirdEvent;
    expect(watchLine(legacy)).toBe(`G1-P001 @ 1.00 s: ${event.text}`);
    expect(legacy).not.toHaveProperty('representativeT');
    expect(watchLine({ ...event, representativeT: event.t0 })).not.toContain('representative detector tick');
  });
});
