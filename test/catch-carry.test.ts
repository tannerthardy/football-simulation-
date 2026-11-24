/** CATCH_CARRY (defense.ts pursueIfLive; experimental, off): a defender who was driving through a receiver's hands
 * while he secured the ball keeps driving on that receiver, as he last saw him, until his own picture resolves the
 * outcome, instead of going to the ball's landing spot. Caught: he stays on the catcher. Dropped: a newer picture of
 * the receiver without the ball ends it. Broken up: a ball back in the air is played as flight. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Run = { carried: boolean; towardAt04: number[]; refutedCarry: boolean; airResult: unknown };

async function plays(flag: string, opts: { dropPicture?: boolean; airProbe?: boolean } = {}): Promise<Run> {
  vi.resetModules();
  vi.stubEnv('CATCH_CARRY', flag);
  // The suite pins the pre-promotion engine; the securing window and the drive on it are what this builds on.
  vi.stubEnv('CATCH_SECURE', '1');
  vi.stubEnv('DRIVE_CATCH', '1');
  // Pinned to FLIGHT_BREAK=0 (engine-94, Coverage C14): with the break on, the off arm's rally continues the break on the
  // same receiver through the catch (pursueIfLive), so both arms close on him at about 4 yd/s 0.15 s after the secure
  // (off 4.03, on 3.98) and the comparison no longer isolates the carry. The retired path is pursueIfLive's rally goTo
  // after the flight lands. Owner: Defense (CATCH_CARRY); re-find the carry's own case with the break on, or retire
  // CATCH_CARRY with that path when FLIGHT_BREAK=0's paths are removed.
  vi.stubEnv('FLIGHT_BREAK', '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { pursueIfLive } = await import('../src/sim/behaviors/defense.js');
  const offense = generateTeam(new Rng(101), 'Carry O', 'CRO', { strength: .55 });
  const defense = generateTeam(new Rng(102), 'Carry D', 'CRD', { strength: .55 });
  const out: Run = { carried: false, towardAt04: [], refutedCarry: false, airResult: 'unset' };
  for (const concept of ['curl_flat', 'stick'] as const) for (let seed = 1; seed <= 24; seed++) {
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: 'cc' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'cc' },
      los: 40, ballY: 26, firstDownX: 50, seed });
    let driver: (typeof sim.defense)[number] | null = null, R: (typeof sim.offense)[number] | null = null, securedAt = -1;
    const see = sim.see.bind(sim);
    if (opts.dropPicture) sim.see = (who, t, d) => {
      const s = see(who, t, d);
      return R && t === R && securedAt >= 0 && sim.t >= securedAt ? { ...s, carrying: false, age: 0 } : s;
    };
    while (sim.t < 6) {
      sim.tick();
      if (!driver) {
        const sec = sim.ball.kind === 'air' ? sim.ball.securing : null;
        if (sec) { R = sec.receiver; driver = sim.defense.find(d => d.tags.has('drive-catch')) ?? null; continue; }
        if (R) break; // the securing window ended with no defender driving on the catch
        continue;
      }
      if (securedAt < 0) { if (sim.ball.kind === 'held' && sim.ball.carrier === R) securedAt = sim.t; else if (sim.ball.kind !== 'air') break; continue; }
      if (driver.tags.has('catch-carry')) { if (opts.dropPicture) out.refutedCarry = true; else out.carried = true; }
      if (opts.airProbe) {
        // A ball back in the air: the unresolved-possession branch must not carry him.
        const real = sim.ball; driver.tags.delete('catch-carry');
        (sim as { ball: unknown }).ball = { ...real, kind: 'air' };
        out.airResult = pursueIfLive(sim, driver);
        (sim as { ball: unknown }).ball = real;
        if (driver.tags.has('catch-carry')) out.refutedCarry = true;
        break;
      }
      if (sim.t - securedAt >= 0.15 && R) {
        const dx = R.pos.x - driver.pos.x, dy = R.pos.y - driver.pos.y, L = Math.hypot(dx, dy) || 1;
        out.towardAt04.push((driver.vel.x * dx + driver.vel.y * dy) / L);
        break;
      }
    }
  }
  return out;
}

const median = (v: number[]) => [...v].sort((p, q) => p - q)[Math.floor(v.length / 2)];

describe('CATCH_CARRY: a defender driving on a catch keeps driving on the catcher until his picture resolves it', () => {
  it('caught: on, he carries on the receiver and is faster toward him just after the catch than off', async () => {
    const off = await plays('0'), on = await plays('1');
    expect(off.carried).toBe(false);
    expect(on.carried).toBe(true);
    expect(on.towardAt04.length).toBeGreaterThan(3);
    expect(median(on.towardAt04)).toBeGreaterThan(median(off.towardAt04));
  }, 180_000);
  it('dropped: a newer picture of the receiver without the ball ends the carry', async () => {
    const dropped = await plays('1', { dropPicture: true });
    expect(dropped.refutedCarry).toBe(false);
  }, 180_000);
  it('broken up: with the ball back in the air he is not carried; the flight is played', async () => {
    const air = await plays('1', { airProbe: true });
    expect(air.refutedCarry).toBe(false);
    expect(air.airResult).toBeNull();
  }, 180_000);
});

