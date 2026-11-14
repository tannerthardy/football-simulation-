/** QB_KEY_MAN (behaviors/qb.ts; with READ_PLAN, PLAN_KEYS and OUTLET_LAST): his key read is taken on the defender the
 * concept names. Staged on concepts whose installed plan has a defender key: the named man (the one the role's
 * alignment rule picks before the snap) plays to 0.25 s and is then sent deep over the high route (he sinks: the low
 * man is the answer) or down onto the low route (he jumps it: the high man is the answer).
 * Off: the read is taken on whoever is nearest the line between the two routes in his pictures, so on some of these
 * scenes it is another man and the answer does not follow what the named man did.
 * On: the read is on the named man every time it is made, and the answer follows him.
 * QB_KEY_THROW: the answer is then thrown on its step unless somebody is in the window, where off it was priced like
 * any read: the high man is thrown more often when the key jumps the low route. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const SCENES: [string, string][] = [['corner_flat', 'cover2'], ['smash', 'cover2'], ['drive', 'cover3'], ['corner_flat', 'cover3'], ['smash', 'cover3'], ['curl_flat', 'cover3'], ['flood', 'cover3'], ['levels', 'cover2']];

async function stage(flag: string, keyThrow = '0') {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('READ_PLAN', '1'); vi.stubEnv('PLAN_KEYS', '1'); vi.stubEnv('OUTLET_LAST', '1'); vi.stubEnv('QB_KEY_MAN', flag); vi.stubEnv('QB_KEY_THROW', keyThrow);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { goTo } = await import('../src/sim/behaviors/common.js');
  const rows: { scene: string; mode: string; role: string; named: string; on: string | null; answer: string | null; thrown: string | null }[] = [];
  for (const [concept, coverage] of SCENES) for (const mode of ['sink', 'jump'] as const) for (const seed of [1, 2]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const qb: any = sim.qb.behavior, k = qb.plan?.key;
    if (!k) continue;
    const man = k.man ?? qb.keyMan(sim, k.role, k.low, k.high);
    if (!man) continue;
    const orig = man.behavior, dir = sim.attackDir(sim.offense[0].team);
    man.behavior = { kind: orig.kind, update: (a: any, s: any) => s.t < 0.25 ? orig.update(a, s) : goTo(a, mode === 'sink' ? { x: s.los + 15 * dir, y: k.high.pos.y } : { x: s.los + 2 * dir, y: k.low.pos.y }, { speed: 0.95 }) };
    for (let i = 0; i < 200 && sim.phase === 'live' && !qb.keyRead; i++) sim.tick();
    const kr = qb.keyRead;
    if (!kr) continue;
    // The play is run on to the throw: who it went to (the pair's low or high man, or another).
    let thrown: string | null = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && thrown === null) thrown = target === k.low ? 'low' : target === k.high ? 'high' : 'other'; return tb(p, target, ...rest); };
    for (let i = 0; i < 300 && sim.phase === 'live' && thrown === null && sim.carrier === sim.qb; i++) sim.tick();
    rows.push({ scene: `${concept}/${coverage}/${seed}`, mode, role: k.role, named: man.player.id, on: kr.defender, answer: kr.defender ? kr.throwTo : null, thrown });
  }
  return rows;
}

describe('QB_KEY_MAN', () => {
  it('off: the read is sometimes taken on a man who is not the one the concept names', async () => {
    const rows = await stage('0');
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.filter((r) => r.on !== null && r.on !== r.named).length).toBeGreaterThanOrEqual(2);
  }, 120000);

  it('on: the read is on the named man, and the answer follows what he did', async () => {
    const rows = await stage('1');
    expect(rows.length).toBeGreaterThanOrEqual(12);
    const made = rows.filter((r) => r.on !== null);
    // He has a picture of the man he is looking at on nearly every scene.
    expect(made.length / rows.length).toBeGreaterThanOrEqual(0.85);
    for (const r of made) expect(r.on, JSON.stringify(r)).toBe(r.named);
    // Sinking gives the low man, jumping the high man, to within his reading noise on a man who has just started.
    const right = made.filter((r) => r.answer === (r.mode === 'sink' ? 'low' : 'high')).length;
    expect(right / made.length).toBeGreaterThanOrEqual(0.8);
  }, 120000);

  it('QB_KEY_THROW: when the key jumps the low route, the high man is thrown on the read more often than when he is priced', async () => {
    const priced = await stage('1', '0'), read = await stage('1', '1');
    const high = (rows: typeof priced) => rows.filter((r) => r.answer === 'high');
    const share = (rows: typeof priced) => high(rows).filter((r) => r.thrown === 'high').length / Math.max(1, high(rows).length);
    expect(high(priced).length).toBeGreaterThanOrEqual(6);
    expect(high(read).length).toBeGreaterThanOrEqual(6);
    expect(share(read)).toBeGreaterThan(share(priced));
    // And the low answer is still thrown low at least as often.
    const low = (rows: typeof priced) => rows.filter((r) => r.answer === 'low');
    const lowShare = (rows: typeof priced) => low(rows).filter((r) => r.thrown === 'low').length / Math.max(1, low(rows).length);
    expect(lowShare(read)).toBeGreaterThanOrEqual(lowShare(priced) - 1e-9);
  }, 240000);
});
