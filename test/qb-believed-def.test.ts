/** QB_BELIEVED_DEF (behaviors/qb.ts, sim/believed.ts): the quarterback prices a throw against the defender he believes
 * in, not the defender's measured body. Staged: one play is run to 0.3 s after he sets; the defender nearest a receiver
 * is then made an elite, a typical or a poor man for his position (top speed, reaction, reach, ball skills), and the
 * quarterback is made one who knows the opponent (awareness 99, 8 years) or one who does not (awareness 1, a rookie).
 * Only the chance he puts on the throw is read. The mechanism is asserted, not a game outcome:
 * off, he prices the true man whoever he is; on, the quarterback who knows him prices the same true man; the one who
 * does not prices nearly the typical man, so he is too hopeful against the elite one and too careful against the poor
 * one; and a typical man is priced the same by both. */
import { afterEach, describe, expect, it, vi } from 'vitest';
// engine-92 (DIR_START on): fixture recorded before a start from rest cost the legs in a direction they were not loaded for; pinned test-only, the owning lane to re-record with it on
vi.hoisted(() => { process.env.DIR_START = '0'; });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Man = 'elite' | 'typical' | 'poor';

async function scene(flag: string) {
  vi.resetModules();
  vi.stubEnv('QB_BELIEVED_DEF', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { typicalAt } = await import('../src/sim/believed.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'comebacks', seed: 2, roster: 2, formation: 'gun_doubles_11', flip: false }));
  const qb = sim.qb, beh: any = qb.behavior;
  let setAt = -1;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    sim.tick();
    if (setAt < 0 && beh.phase === 'set') setAt = sim.t;
    if (setAt >= 0 && sim.t >= setAt + 0.3) break;
  }
  expect(setAt).toBeGreaterThan(0);
  // The receiver with a defender closest to him, and that defender.
  let r: any = null, d: any = null, best = Infinity;
  for (const o of sim.offense) {
    if (o === qb || !beh.evaluate(qb, sim, o, 0)) continue;
    for (const x of sim.defense) { const gap = Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y); if (gap < best) { best = gap; r = o; d = x; } }
  }
  expect(best).toBeLessThan(4);
  const typ = typicalAt(d.player.position)!;
  expect(typ).not.toBeNull();
  // Every other defender is the typical man at his position, so only the staged one differs between quarterbacks.
  for (const x of sim.defense) {
    const t = typicalAt(x.player.position);
    if (x === d || !t) continue;
    const own = x.r.bind(x);
    x.profile = t.profile;
    x.r = (k: string) => (k === 'ballSkills' ? t.ratings.ballSkills : own(k));
  }
  const rate = d.r.bind(d);
  const price = (man: Man, knows: boolean): number => {
    const s = man === 'elite' ? 1 : man === 'poor' ? -1 : 0;
    d.profile = { ...typ.profile, vmax: typ.profile.vmax + 0.7 * s, reactionTime: typ.profile.reactionTime - 0.06 * s, reach: typ.profile.reach + 0.12 * s };
    d.r = (k: string) => (k === 'ballSkills' ? typ.ratings.ballSkills + 0.3 * s : rate(k));
    // His knowledge of the opponent is set only while the belief is formed (it is then fixed for the play), so nothing
    // else that reads his awareness or experience differs between the two quarterbacks.
    const was = { awareness: qb.player.ratings.awareness, experience: qb.player.experience };
    qb.player.ratings.awareness = knows ? 99 : 1;
    qb.player.experience = knows ? 8 : 0;
    beh.believed.clear();
    for (const x of sim.defense) beh.believe(qb, x);
    qb.player.ratings.awareness = was.awareness;
    qb.player.experience = was.experience;
    return beh.evaluate(qb, sim, r, 0).P as number;
  };
  return { price };
}

describe('QB_BELIEVED_DEF', () => {
  it('off: he prices the true man, and what he knows of the opponent does not enter', async () => {
    const { price } = await scene('0');
    for (const man of ['elite', 'typical', 'poor'] as const) expect(price(man, false)).toBe(price(man, true));
    expect(price('elite', true)).toBeLessThan(price('typical', true));
    expect(price('typical', true)).toBeLessThan(price('poor', true));
  });

  it('on: the quarterback who knows the opponent prices the true man', async () => {
    const off = await scene('0'), on = await scene('1');
    for (const man of ['elite', 'typical', 'poor'] as const) expect(on.price(man, true)).toBeCloseTo(off.price(man, true), 2);
  });

  it('on: the one who does not is too hopeful against the elite man and too careful against the poor one', async () => {
    const { price } = await scene('1');
    expect(price('elite', false)).toBeGreaterThan(price('elite', true));
    expect(price('poor', false)).toBeLessThan(price('poor', true));
    // He still prices in the right order, on the fifth of the difference his position knowledge gives him.
    const spreadKnown = price('poor', true) - price('elite', true), spreadUnknown = price('poor', false) - price('elite', false);
    expect(spreadUnknown).toBeGreaterThan(0);
    expect(spreadUnknown).toBeLessThan(0.5 * spreadKnown);
  });

  it('on: a typical man is priced the same by both', async () => {
    const { price } = await scene('1');
    expect(price('typical', false)).toBeCloseTo(price('typical', true), 9);
  });
});
