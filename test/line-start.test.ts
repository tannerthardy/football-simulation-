/** LINE_START (route-motion.ts, behaviors/receiver.ts; experimental, off): a receiver's first steps are a get-off,
 * not a sprint start. MoveCommand.drive is the share of his start force he chooses; until he declares his stem he
 * pushes with less of it, more when his first break is deep and the defender is well off, less with an early break
 * or a defender in his face. The quarterback's expected break time moves with it. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('MoveCommand.drive', () => {
  it('default (absent) and 1 are identical; a lower drive starts him slower and does not change braking', async () => {
    const { locomotionAccel } = await import('../src/physics/kinematics.js');
    const { generateTeam } = await import('../src/league/team.js');
    const { Rng } = await import('../src/core/rng.js');
    const { derivePhysical } = await import('../src/players/physical.js');
    const team: any = generateTeam(new Rng(3), 'O', 'OFF');
    const wr = (team.roster ?? team.players).find((p: any) => p.position === 'WR');
    const profile = derivePhysical(wr);
    const body = (vx: number) => ({ pos: { x: 0, y: 0 }, vel: { x: vx, y: 0 }, facing: 0, energy: 1, sprintLoad: 0, profile });
    const go = { vel: { x: 8, y: 0 } };
    expect(locomotionAccel(body(0), go, 0.05)).toEqual(locomotionAccel(body(0), { ...go, drive: 1 }, 0.05));
    expect(locomotionAccel(body(2), go, 0.05)).toEqual(locomotionAccel(body(2), { ...go, drive: 1 }, 0.05));
    expect(locomotionAccel(body(0), { ...go, drive: 0.5 }, 0.05).x).toBeLessThan(locomotionAccel(body(0), go, 0.05).x);
    expect(locomotionAccel(body(2), { ...go, drive: 0.5 }, 0.05).x).toBeLessThan(locomotionAccel(body(2), go, 0.05).x);
    const stop = { vel: { x: 0, y: 0 } };
    expect(locomotionAccel(body(5), { ...stop, drive: 0.5 }, 0.05)).toEqual(locomotionAccel(body(5), stop, 0.05));
  });
});

async function starts(flag: string) {
  vi.stubEnv('LINE_START', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const R: any = await import('../src/sim/behaviors/receiver.js');
  const out: Record<string, { v05: number[]; brk: number[] }> = {};
  for (const concept of ['four_verts', 'slant_flat']) for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    const rr = sim.offense.filter((o: any) => o.behavior instanceof R.RouteRunner && ['go', 'slant'].includes(o.behavior.route.id));
    for (const o of rr) (out[o.behavior.route.id] ??= { v05: [], brk: [] }).brk.push(o.behavior.breakTime);
    while (sim.phase === 'live' && sim.t + 1e-6 < 0.5) sim.tick();
    for (const o of rr) out[o.behavior.route.id].v05.push(Math.hypot(o.vel.x, o.vel.y));
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { v05: med(v.v05), brk: med(v.brk) }]));
}

describe('LINE_START', () => {
  it('off coverage, receivers leave the line slower; an early break slower than a go; break times move with it', async () => {
    const off = await starts('0'), on = await starts('1');
    expect(on.go.v05).toBeLessThan(off.go.v05 - 0.2);
    expect(on.slant.v05).toBeLessThan(off.slant.v05 - 0.4);
    expect(on.slant.v05).toBeLessThan(on.go.v05);
    expect(on.go.brk).toBeGreaterThan(off.go.brk);
    expect(on.slant.brk).toBeGreaterThan(off.slant.brk);
  });
});
