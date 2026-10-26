/** Saved, tiny replay witnesses; importing/running these tests generates no games. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { PlayLog } from '../src/game/game.js';
import { replayPaths } from '../scripts/diag/yaw-sim.js';

type Replay = NonNullable<PlayLog['replay']>;
const replay = (times: number[], degrees: number[]): Replay => ({
  players: [{ team: 'D', slot: 'LB_M', name: 'fixture', jersey: 1, pos: 'LB' }],
  frames: times.map((t, i) => ({ t, agents: [3 * t, 0, degrees[i] * Math.PI / 180], ball: [0, 0, 0], carrier: -1 })),
  los: 0, firstDownX: 10, flip: false, events: [],
});
const run = (r: Replay) => {
  const folder = mkdtempSync(join(tmpdir(), 'turning-witness-'));
  try {
    const input = join(folder, 'saved.json');
    writeFileSync(input, JSON.stringify({ log: [{ kind: 'run', replay: r }], meta: { source: 'synthetic fixture, no NFL comparison' } }));
    const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/diag/yaw-sim.ts'), '--input', input], { encoding: 'utf8' });
    expect(result.stderr).toBe('');
    return { code: result.status, report: JSON.parse(result.stdout) };
  } finally { rmSync(folder, { recursive: true }); }
};

describe('saved replay turning measurement', () => {
  it('explicitly counts known slots, excluded roles, and unknown roster entries', () => {
    const r = replay([0, .1], [0, 10]);
    r.players.push({ ...r.players[0], team: 'O', slot: 'QB' }, { ...r.players[0], slot: 'DE_S' },
      { ...r.players[0], slot: 'UNRECOGNIZED' });
    r.frames.forEach(frame => { frame.agents = Array.from({ length: 4 }, () => frame.agents).flat(); });
    const adapted = replayPaths(r, 'saved');
    expect(adapted.eligibility.paths).toEqual({ eligible: 1, excluded: 2, unknown: 1 });
    expect(adapted.eligibility.rows).toEqual({ eligible: 2, excluded: 4, unknown: 2 });
    expect(adapted.paths).toHaveLength(1);
  });

  it('keeps body rotation separate from straight travel and excludes snap from denominators', () => {
    const { code, report } = run(replay([0, .1, .2, .3], [0, 30, 60, 90]));
    expect(code).toBe(0);
    const bin = report.raw.frequencyByStartSpeed['2-4 yd/s'];
    expect(bin.bodyRotationDegS).toMatchObject({ n: 2, p90: 300 });
    expect(bin.travelDirectionChangeDegS).toMatchObject({ n: 2, p90: 0 });
    expect(bin.bodyVsTravelDegrees.n).toBe(3);
    expect(report.measurementVersion).toBe('turning-v2');
    expect(report.inputs[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.adapter.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.cadence.fallbackSeconds).toBeNull();
  });

  it('uses the short terminal interval and does not create a fake .2s window', () => {
    const { code, report } = run(replay([0, .1, .2, .25], [0, 10, 20, 25]));
    expect(code).toBe(0);
    const bin = report.raw.frequencyByStartSpeed['2-4 yd/s'];
    expect(bin.bodyRotationDegS).toMatchObject({ n: 2, p90: 100 });
    expect(bin.bodyRotationSwingAtLeast90In02s).toMatchObject({ n: 0, share: null });
    expect(report.raw.pathExtremesByEntrySpeed['2-4 yd/s'].bodyRotationFastest02sDegSPerPath.n).toBe(0);
    expect(report.raw.opportunities['bodyRotation:partialTerminalWindows']).toBe(2);
  });

  it('rejects conflicting saved observations and missing timestamps explicitly', () => {
    const r = replay([0, .1, .2], [0, 10, 20]);
    r.frames.push({ ...r.frames[1], agents: [0, 0, Math.PI] });
    const conflict = run(r);
    expect(conflict.code).toBe(1);
    expect(conflict.report.status).toBe('unavailable');
    expect(conflict.report.quality.conflictingDuplicateClockPaths).toBe(1);
    const invalid = replay([0, .1, .2], [0, 10, 20]);
    invalid.frames[1].t = NaN;
    const missing = run(invalid);
    expect(missing.code).toBe(1);
    expect(missing.report.quality.missingOrInvalidClockPaths).toBe(1);
  });
});
