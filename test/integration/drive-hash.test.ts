/** DRIVE_HASH (src/game/game.ts; experimental, off): a drive begun on a kick result starts on a hash, not at the field's
 * center line. One game each way (seed 101): first-and-10 snaps exactly on the center line. Off, every drive after a
 * kick starts there; on, none does (a play that ends between the hashes lands exactly on the line with probability 0). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function centerFirstDowns(on: boolean): Promise<{ center: number; firsts: number }> {
  vi.stubEnv('DRIVE_HASH', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../../src/sim/playsim.js');
  const { Rng } = await import('../../src/core/rng.js');
  const { generateTeam } = await import('../../src/league/team.js');
  const { simulateGame } = await import('../../src/game/game.js');
  const { CENTER_Y } = await import('../../src/core/field.js');
  const proto = PlaySim.prototype as any, run = proto.run;
  let center = 0, firsts = 0;
  proto.run = function (this: any) {
    if (this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') && Math.abs(Math.abs(this.firstDownX - this.los) - 10) < 1e-6) {
      firsts++; if (Math.abs(this.ballY - CENTER_Y) < 1e-6) center++;
    }
    return run.call(this);
  };
  try {
    const rng = new Rng(101);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
    simulateGame(home, away, { seed: 101 });
  } finally { proto.run = run; }
  return { center, firsts };
}

describe('DRIVE_HASH', () => {
  it('drives after a kick start on a hash', async () => {
    const off = await centerFirstDowns(false), on = await centerFirstDowns(true);
    expect(off.firsts).toBeGreaterThan(30);
    expect(off.center).toBeGreaterThan(3);
    expect(on.center).toBe(0);
  }, 240_000);
});
