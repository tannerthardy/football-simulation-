/** FITTED_HANDS (physics/world.ts handPair / stepHandPair / handHold(k); experimental, off; requires RUSH_HANDS): the
 * hand fight's stage 1. The blocker's two hands are separate one-degree-of-freedom bodies. A strike acts on the hand it
 * meets and only that arm holds against it; each hand carries half the joint's press, friction and steer at its own
 * edge; with no force on the hands every joint force is RUSH_HANDS' (and so today's); momentum is conserved; the
 * result does not depend on the substep count. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Vec2 } from '../src/core/vec.js';
import type { PhysicalProfile } from '../src/players/physical.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flags: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  const { newSupport } = await import('../src/physics/support.js');
  const W = await import('../src/physics/world.js');
  const body = (mass: number, pos: Vec2, facing = 0) => {
    const profile: PhysicalProfile = { massKg: mass, radius: 0.3, reach: 0.25 + 0.95 * 0.85, heightYd: 2.05, vmax: 9, tau: 1.3,
      brake: 6, lateral: 6, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
      reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 };
    return { pos, vel: { x: 0, y: 0 }, facing, energy: 1, profile, support: newSupport(0.4) } as any;
  };
  return { W, body };
}

async function scene(opts: { ext: number; press: number; F: number; dur: number; substeps?: number; flags: Record<string, string>; steps?: number }) {
  const { W, body } = await load({ RUSH_HANDS: '1', ...opts.flags });
  const a = body(140, { x: 0, y: 0 }, 0), b = body(120, { x: 0.6 + opts.ext, y: 0 }, Math.PI);
  const w = new W.World([a, b], { substeps: opts.substeps ?? 12 });
  const j: any = { kind: 'hands', a, b, extension: 0.6 + opts.ext, push: 1500, hold: 0, steer: 700 };
  w.joints.push(j);
  const rows: { N: number; T: number }[] = [];
  let p0 = { x: 0, y: 0 }; const ground = { x: 0, y: 0 };
  const mom = () => ({ x: a.profile.massKg * a.vel.x + b.profile.massKg * b.vel.x, y: a.profile.massKg * a.vel.y + b.profile.massKg * b.vel.y });
  for (let k = 0; k < (opts.steps ?? 12); k++) {
    if (k === 2 && opts.F) { p0 = mom(); w.handForce(j, b, { x: 0, y: opts.F }, w.time, w.time + opts.dur); }
    const rep = w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: -1.5 * opts.press, y: 0 }, push: opts.press }], 0.05);
    if (k >= 2) { ground.x += (rep.groundImpulse[0]?.x ?? 0) + (rep.groundImpulse[1]?.x ?? 0); ground.y += (rep.groundImpulse[0]?.y ?? 0) + (rep.groundImpulse[1]?.y ?? 0); }
    rows.push({ N: j.normalForce ?? 0, T: j.tangentForce ?? 0 });
  }
  const pair = j.handPair as { slide: number; vel: number; on: boolean }[] | undefined;
  const armV = pair ? pair.reduce((s, h) => s + (h.on ? h.vel : 0), 0) : j.handVel ?? 0;
  const p1 = mom(), arm = W.ARM_MASS * a.profile.massKg * armV;
  return { j, pair, rows, residualY: p1.y + arm - p0.y - ground.y, scaleY: Math.abs(opts.F * opts.dur) };
}

describe('FITTED_HANDS: the two hands', () => {
  it('a strike takes off the hand it meets; the other stays on (the sweep after the clear barely moves it)', async () => {
    const r = await scene({ ext: 0.6 * 0.95, press: 0, F: 900, dur: 0.08, flags: { FITTED_HANDS: '1' } });
    console.log(`hand 0 on ${r.pair![0].on} slide ${r.pair![0].slide.toFixed(3)} | hand 1 on ${r.pair![1].on} slide ${r.pair![1].slide.toFixed(3)} | handsOn ${r.j.handsOn} offSide ${r.j.offSide}`);
    expect(r.pair![1].on).toBe(true); expect(Math.abs(r.pair![1].slide)).toBeLessThan(0.05);
    expect(r.pair![0].on).toBe(false);
    expect(r.j.handsOn).toBe(1); expect(r.j.offSide).toBe(-1); expect(r.j.off).toBe(false);
  });

  it('one arm holds less than the pair: a strike the joint holds takes one fitted hand off', async () => {
    const F = 1200, base = { ext: 0.25 * 0.95, press: 1, dur: 0.08 };
    const pairHold = await scene({ ...base, F, flags: {} });
    const oneArm = await scene({ ...base, F, flags: { FITTED_HANDS: '1' } });
    console.log(`RUSH_HANDS handsOn ${pairHold.j.handsOn ?? 2} | FITTED_HANDS handsOn ${oneArm.j.handsOn}`);
    expect(pairHold.j.handsOn ?? 2).toBe(2);
    expect(oneArm.j.handsOn).toBe(1);
  });

  it('with one hand off, the joint carries half its press', async () => {
    const both = await scene({ ext: 0.25 * 0.95, press: 1, F: 0, dur: 0.08, flags: { FITTED_HANDS: '1' }, steps: 1 });
    const { W, body } = await load({ RUSH_HANDS: '1', FITTED_HANDS: '1' });
    expect(W.FITTED_HANDS).toBe(true);
    const a = body(140, { x: 0, y: 0 }, 0), b = body(120, { x: 0.6 + 0.25 * 0.95, y: 0 }, Math.PI);
    const w = new W.World([a, b], { substeps: 12 });
    const j: any = { kind: 'hands', a, b, extension: 0.6 + 0.25 * 0.95, push: 1500, hold: 0, steer: 700 };
    W.handPairOf(j)[1].on = false; W.syncHandPair(j);
    w.joints.push(j);
    let maxN = 0;
    for (let k = 0; k < 8; k++) { w.step([{ vel: { x: 0, y: 0 }, push: 1 }, { vel: { x: -1.5, y: 0 }, push: 1 }], 0.05); maxN = Math.max(maxN, Math.abs(j.normalForce ?? 0)); }
    console.log(`one hand: |N| max ${maxN.toFixed(0)} (push 1500 -> 750 cap)`);
    expect(maxN).toBeLessThanOrEqual(750 + 1);
    expect(both.j.handsOn ?? 2).toBe(2);
  });

  it('with no force on the hands every joint force is RUSH_HANDS\'', async () => {
    const off = await scene({ ext: 0.6 * 0.95, press: 0.7, F: 0, dur: 0.08, flags: {} });
    const on = await scene({ ext: 0.6 * 0.95, press: 0.7, F: 0, dur: 0.08, flags: { FITTED_HANDS: '1' } });
    expect(on.rows).toEqual(off.rows);
  });

  it('momentum is conserved and the slide does not depend on the substep count', async () => {
    const r = await scene({ ext: 0.6 * 0.95, press: 0.5, F: 800, dur: 0.08, flags: { FITTED_HANDS: '1' } });
    console.log(`momentum residual y ${r.residualY.toFixed(3)} against ${r.scaleY.toFixed(1)}`);
    expect(Math.abs(r.residualY)).toBeLessThan(0.02 * r.scaleY + 0.5);
    const coarse = await scene({ ext: 0.6 * 0.95, press: 0, F: 300, dur: 0.08, substeps: 6, steps: 6, flags: { FITTED_HANDS: '1' } });
    const fine = await scene({ ext: 0.6 * 0.95, press: 0, F: 300, dur: 0.08, substeps: 24, steps: 6, flags: { FITTED_HANDS: '1' } });
    const sc = coarse.pair![0].slide, sf = fine.pair![0].slide;
    console.log(`substeps 6: ${sc.toFixed(4)} | 24: ${sf.toFixed(4)} | on ${coarse.pair![0].on}/${fine.pair![0].on}`);
    expect(coarse.pair![0].on && fine.pair![0].on).toBe(true);
    expect(Math.abs(sc)).toBeGreaterThan(0.01);
    expect(Math.abs(sc - sf)).toBeLessThan(0.1 * Math.abs(sf) + 0.005);
  });

  it('FITTED_HANDS without RUSH_HANDS is refused', async () => {
    vi.resetModules(); vi.stubEnv('FITTED_HANDS', '1');
    await expect(import('../src/physics/world.js')).rejects.toThrow(/requires RUSH_HANDS/);
  });
});
