/** QB_GATHER_THROW (behaviors/qb.ts; with QB_GATHER and QB_EYES): one hitch, into the throw. Staged with the pass rush
 * taken out of the scene (the four rushers stand at the line), so only his reading moves his feet. From the
 * tick he sets to the tick his motion starts, his position is followed. Off (QB_GATHER alone): he comes up the pocket
 * while he reads, before he has decided on anyone. On: he holds his set point until his eyes are finishing on the man
 * he has decided on, and his step from there is toward that man and no longer than a hitch. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// Re-found 2026-11-16 on the engine-69 defaults (DIR_CAP on): the same staged scene, but with the monotone cap his pocket and the coverage around it differ from
// the legacy engine's, and of the original six plays only two now reach the gate (the tick his eyes finish on the man he has decided on) before the windup, short of
// the three the test needs. Six plays that gate on the defaults, with the original seam_hitch (cover1) which gates without a step toward his man, kept for variety.
// The assertions are unchanged.
const PLAYS: [string, string, number][] = [['dagger', 'cover3', 3], ['dagger', 'cover3', 2], ['drive', 'cover3', 3], ['smash', 'cover3', 3], ['seam_hitch', 'cover3', 4], ['stick', 'cover3', 3], ['seam_hitch', 'cover1', 4]];

interface Row { readCreep: number; upBeforeGate: number; step: number; toward: number | null; gated: boolean }

async function run(flag: string): Promise<Row[]> {
  vi.resetModules();
  vi.stubEnv('QB_GATHER', '1'); vi.stubEnv('QB_EYES', '1'); vi.stubEnv('QB_GATHER_THROW', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { stand } = await import('../src/sim/behaviors/common.js');
  const rows: Row[] = [];
  for (const [concept, coverage, seed] of PLAYS) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const qb = sim.qb, beh: any = qb.behavior;
    for (const d of sim.defense) if (d.behavior.kind === 'rush') d.behavior = { kind: 'idle', update: () => stand(0) };
    let set: { x: number; y: number } | null = null, gateAt: { x: number; y: number } | null = null, target: any = null;
    let readCreep = 0, upBeforeGate = 0;
    for (let i = 0; i < 500 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh && beh.phase !== 'windup'; i++) {
      sim.tick();
      if (!set && beh.phase === 'set') set = { ...qb.pos };
      if (!set) continue;
      if (!gateAt && beh.gateFor) { gateAt = { ...qb.pos }; target = beh.gateFor; }
      if (!gateAt) { readCreep = Math.max(readCreep, Math.hypot(qb.pos.x - set.x, qb.pos.y - set.y)); upBeforeGate = Math.max(upBeforeGate, qb.pos.x - set.x); }
    }
    if (!set) continue;
    let step = 0, toward: number | null = null;
    if (gateAt && target) {
      const dx = qb.pos.x - gateAt.x, dy = qb.pos.y - gateAt.y; step = Math.hypot(dx, dy);
      const tx = target.pos.x - gateAt.x, ty = target.pos.y - gateAt.y, L = Math.hypot(tx, ty) || 1;
      toward = step > 0.1 ? (dx * tx + dy * ty) / (step * L) : null;
    }
    rows.push({ readCreep, upBeforeGate, step, toward, gated: !!gateAt });
  }
  return rows;
}

describe('QB_GATHER_THROW', () => {
  it('off: he comes up the pocket while he reads', async () => {
    const rows = await run('0');
    expect(rows.length).toBe(PLAYS.length);
    expect(Math.max(...rows.map((r) => r.upBeforeGate))).toBeGreaterThan(0.4);
  });

  it('on: he holds his set point while he reads, and steps once toward the man he has decided on', async () => {
    const rows = await run('1');
    expect(rows.length).toBe(PLAYS.length);
    for (const r of rows) expect(r.readCreep).toBeLessThan(0.35); // he settles about 0.2 yd from where the drop ended
    const gated = rows.filter((r) => r.gated);
    expect(gated.length).toBeGreaterThanOrEqual(3);
    for (const r of gated) {
      expect(r.step).toBeLessThan(1.1);
      if (r.toward !== null) expect(r.toward).toBeGreaterThan(0.7);
    }
    expect(gated.some((r) => r.toward !== null)).toBe(true);
  });
});
