// Diagnostic copy of test/pursuit-commit.test.ts (2026-11-24, Defense): fresh/held x spaced breakdown of the 3-8 yd band, and the
// spacing attribution (passive ledger stub: intents before/after the spacing pass; the teammate the cut steers off).
// Not a suite test. To run: copy to test/zz-pc-diag.test.ts on the build to measure, then PC_PRINT=1 npx vitest run test/zz-pc-diag.test.ts
/** PURSUIT_COMMIT (src/sim/behaviors/common.ts commitMeeting, defense.ts playObservedFlight; experimental, off).
 * Fixed short passes against zone and man (teams from fixed seeds, the reference stack's on-flags):
 *  - on the last tick of the ball's flight a defender playing it no longer decides to stop (his decided command,
 *    before teammate spacing; off: some defenders within 8 yd of the catch decide zero speed on that tick; on: none
 *    do). Teammate spacing can still stop a defender who is running straight at a teammate converging on the same
 *    catch; that is spacing's limit, not this decision;
 *  - an open-field pursuer keeps the meeting he chose: his final request's heading turns less (median per tick, while
 *    his pursuit planner runs; engine-54: 13.2 -> 8.4 deg/s over about 6,000 pursuer-ticks each), and the bearing to
 *    his planned meeting point jumps (> 10 deg in a tick) no more often than off, within two standard errors, both at
 *    matched range (3-8 yd from the pursued body; pooled, engine-54: 0.0230 vs 0.0223; the engine-52 reduction, about
 *    1.5 SE, is not claimed). Requests only; no outcome is asserted. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StagedThrow } from '../src/sim/playsim.js';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Staged throws (PlaySetup.stagedThrow): the start, receiver, aim point and flight time the QB produced on each play,
 * so a change in the QB does not move this defensive panel (at 99: no throw). Re-recorded 2026-11-14 on the engine-65
 * candidate (078259db, PURSUIT_COMMIT off): with TRUNK_TWIST the receiver no longer turns his hips to the ball, so the
 * catches under the throws recorded at 45e17fcc changed and the off arm's one catch-tick stop (1 of 21 near the catch)
 * was gone (0 of 20). Each throw is the one the candidate's own QB makes on that play; on these, natural and staged,
 * slant_flat 3 has the off arm's stop (1 of 23 near the catch). */
const STAGED: Record<string, StagedThrow> = {
  'stick 1': { at: 1.6, slot: 'Y', aim: { x: 42.75510797494996, y: 19.56064538246492, z: 1.0617966851885154 }, T: 1.0038315902082997 },
  'stick 2': { at: 1.55, slot: 'Y', aim: { x: 42.49685920375324, y: 34.996214115854954, z: 1.0518294590764268 }, T: 1.0257939920774732 },
  'stick 3': { at: 1.55, slot: 'Y', aim: { x: 42.39534338548073, y: 21.85848482966286, z: 1.386049343309459 }, T: 0.7546031063889594 },
  'stick 4': { at: 2.2, slot: 'X', aim: { x: 43.38762440342937, y: 21.7200787522111, z: 1.4627209619332504 }, T: 1.0459135857816348 },
  'slant_flat 1': { at: 1.45, slot: 'Z', aim: { x: 42.883028319742365, y: 16.707114563020333, z: 1.0517015031526282 }, T: 1.1028011204157764 },
  'slant_flat 2': { at: 1.35, slot: 'Y', aim: { x: 37.24904534955806, y: 40.193866705871585, z: 1.0628041437908053 }, T: 0.8393484080434719 },
  'slant_flat 3': { at: 1.35, slot: 'Z', aim: { x: 42.43081147278477, y: 15.800155973421282, z: 1.3976200014616258 }, T: 0.9157546952175947 },
  'slant_flat 4': { at: 1.35, slot: 'Y', aim: { x: 36.86503893273646, y: 38.684306845472584, z: 1.4338924620612206 }, T: 0.6077638867004113 },
  'curl_flat 1': { at: 1.7, slot: 'Y', aim: { x: 39.52890174545266, y: 7.648628322167302, z: 0.986535531061994 }, T: 1.2515707703976044 },
  'curl_flat 2': { at: 3.2, slot: 'H', aim: { x: 34.08914346442984, y: 2.7442216626806357, z: 0.9342567505230237 }, T: 1.7058412494929553 },
  'curl_flat 3': { at: 2.55, slot: 'Y', aim: { x: 42.823244532222965, y: 4.817934611601114, z: 1.4435721221544409 }, T: 1.5857250784330437 },
  'curl_flat 4': { at: 3.35, slot: 'H', aim: { x: 31.200178898910032, y: 1.3878638268298746, z: 1.5073341527039337 }, T: 1.6185628993112684 },
  'smash 1': { at: 1.8, slot: 'Z', aim: { x: 40.48615966593969, y: 13.187896383729573, z: 1.0329555385949074 }, T: 0.955074410531322 },
  'smash 2': { at: 99, slot: 'X' },
  'smash 3': { at: 2.05, slot: 'Z', aim: { x: 40.504534255649816, y: 14.65027724392218, z: 1.409590867927052 }, T: 0.9401310837056995 },
  'smash 4': { at: 2.3, slot: 'RB', aim: { x: 34.65166493483928, y: 8.341046466472683, z: 1.5354225662507992 }, T: 0.8849477816930452 },
  // Premise plays (see PREMISE below): natural plays whose off arm has a catch-tick stop, staged the same way.
  'slant_flat 5': { at: 1.35, slot: 'Z', aim: { x: 42.712774723645296, y: 16.092459987041924, z: 1.2570290013056966 }, T: 0.8652268329094622 },
  'slant_flat 11': { at: 1.35, slot: 'Z', aim: { x: 41.11439456150391, y: 14.140593254025129, z: 1.096593306435676 }, T: 0.7136210866143071 },
  'curl_flat 11': { at: 2.5, slot: 'Y', aim: { x: 41.32099469724703, y: 4.159674473686895, z: 0.9943495088177103 }, T: 1.6418439913806147 },
};
/** The panel: four passes against seeds 1-4, and premise plays. Re-recorded 2026-11-14 on the ball-cue fix (the ball is
 * its own percept in release-evidence.ts, at his own delay): the one off-arm catch-tick stop on seeds 1-4 (slant_flat 3)
 * was gone (0 of 23 near the catch). Rather than move the claim, the panel adds the natural plays (same passes, seeds
 * 1-16, the QB's own throws) whose off arm has a stop: slant_flat 5, slant_flat 11, curl_flat 11. */
const PANEL: [string, number][] = [...['stick', 'slant_flat', 'curl_flat', 'smash'].flatMap(p => [1, 2, 3, 4].map(s => [p, s] as [string, number])),
  ['slant_flat', 5], ['slant_flat', 11], ['curl_flat', 11]];

async function run(flag: string) {
  const flagName = flag;
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('PURSUIT_COMMIT', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(101), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DEF', { strength: .55 });
  // Distance from the pursuer to the body he pursues: whether turning is steady depends on range (close pursuit turns
  // more), so a change in which pursuits a stack produces must not read as a change in steadiness.
  const bandOf = (a: any, t: any) => { const d = t ? Math.hypot(t.pos.x - a.pos.x, t.pos.y - a.pos.y) : 99; return d < 3 ? '0-3' : d < 8 ? '3-8' : d < 15 ? '8-15' : '15+'; };
  const diag: Record<string, number[]> = {}; let zeroAtCatch = 0, nearAtCatch = 0, jumps = 0, ticks = 0; const turns: number[] = []; const band: Record<string, number[]> = {}; const bandJ: Record<string, [number, number]> = {};
  for (const [pass, seed] of PANEL) {
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 't' },
      los: 35, ballY: 26.65, firstDownX: 45, seed, stagedThrow: STAGED[`${pass} ${seed}`] } as never) as any;
    const fresh = new Map<unknown, boolean>(), headD = new Map<unknown, number>(); const meet = new Map<unknown, number>(), seen = new Map<unknown, number>(), head = new Map<unknown, number>(), tgt = new Map<unknown, any>();
    // Passive ledger stub (as dither-core): the intents just before (tackle-bond) and after (spacing) the spacing pass.
    let preSp: any[] = [], postSp: any[] = []; const steer = new Map<unknown, any>();
    sim.responsibility = new Proxy({}, { get: (_o, k) => k === 'stageAll' ? (st: string, I: any[]) => { if (st === 'tackle-bond') preSp = I.map((c: any) => c && { ...c.vel }); if (st === 'spacing') postSp = I.map((c: any) => c && { ...c.vel }); } : () => undefined });
    const tc0 = sim.commandTraceFor.bind(sim);
    sim.commandTraceFor = (a: unknown) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
      ? (t: unknown, d: any) => { if (d?.kind === 'intercept') { const q = (a as any).pos; meet.set(a, Math.atan2(d.steeringPoint.y - q.y, d.steeringPoint.x - q.x)); tgt.set(a, t); steer.set(a, { ...d.steeringPoint }); fresh.set(a, Math.abs(d.biasedTime + d.timeBias - d.prediction.t) < 1e-6 || d.biasedTime <= 1e-9); } return o?.pursuit?.(t, d); }
      : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
    let caught = false;
    while (sim.phase !== 'dead' && sim.t < 12) {
      const wasAir = sim.ball.kind === 'air'; meet.clear(); tgt.clear(); steer.clear();
      sim.tick();
      const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (wasAir && !caught && c && c.team === 'O' && c !== sim.qb) {
        caught = true;
        for (const d of sim.defense) if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 8) {
          nearAtCatch++; const v = sim.cmds[d.idx].vel; if (Math.hypot(v.x, v.y) < 0.3) zeroAtCatch++; }
      }
      for (const [a, m] of meet) { const p = seen.get(a); if (p !== undefined) { ticks++; const dd = Math.abs(((m - p) * 180 / Math.PI + 540) % 360 - 180); if (dd > 10) jumps++;
        const bj = (bandJ[bandOf(a, tgt.get(a))] ??= [0, 0]); bj[1]++; if (dd > 10) bj[0]++; } seen.set(a, m); }
      for (const a of [...seen.keys()]) if (!meet.has(a)) seen.delete(a);
      // His final request's heading (after every stage), tick to tick, while his pursuit planner runs and he asks to move.
      for (const a of meet.keys()) { const v = sim.intents[(a as any).idx].vel; if (Math.hypot(v.x, v.y) < 1) { head.delete(a); continue; }
        const h = Math.atan2(v.y, v.x), p = head.get(a);
        const vd = sim.cmds[(a as any).idx].vel, hd = Math.atan2(vd.y, vd.x), pd = headD.get(a);
        const spaced = Math.hypot(vd.x - v.x, vd.y - v.y) > 0.3;
        if (p !== undefined) { const r = Math.abs(((h - p) * 180 / Math.PI + 540) % 360 - 180) / 0.05; turns.push(r); const bk = bandOf(a, tgt.get(a)); (band[bk] ??= []).push(r);
          const g = `${bk}|${fresh.get(a) ? 'fresh' : 'held'}|${spaced ? 'spaced' : 'own'}`; (diag[g] ??= []).push(r);
          // SPACING attribution: the spacing pass's own change to his request, and the teammate it steers him off.
          const i0 = (a as any).idx, pv = preSp[i0], qv = postSp[i0];
          if (bk === '3-8' && pv && qv && Math.hypot(qv.x - pv.x, qv.y - pv.y) > 0.3) {
            const cx = qv.x - pv.x, cy = qv.y - pv.y, cn = Math.hypot(cx, cy), A = a as any;
            let best: any = null, bd = 1e9;
            for (const b of sim.defense) { if (b === a) continue; const dx = b.pos.x - A.pos.x, dy = b.pos.y - A.pos.y, dd2 = Math.hypot(dx, dy);
              if (dd2 > 4) continue; const cosv = -(dx * cx + dy * cy) / (dd2 * cn); if (cosv < Math.cos(Math.PI / 4)) continue; if (dd2 < bd) { bd = dd2; best = b; } }
            const T = tgt.get(a), sa = steer.get(a);
            const kind = !best ? 'none within 4 yd' : !meet.has(best) ? `teammate not pursuing (${best.behavior?.kind ?? '?'}${best.engagement ? ', engaged' : ''})`
              : tgt.get(best) !== T ? 'pursuer of another target' : 'pursuer of the same carrier';
            const sb = best ? steer.get(best) : null, spotGap = sa && sb ? Math.hypot(sa.x - sb.x, sa.y - sb.y) : null;
            const cd = (x: any) => Math.hypot(x.pos.x - T.pos.x, x.pos.y - T.pos.y);
            const rec = ((globalThis as any).__spc ??= {})[`${flagName}|${fresh.get(a) ? 'fresh' : 'held'}`] ??= { n: 0, kinds: {}, spotGap: [], ahead: 0, behind: 0, cut: [], teammateHeld: 0 };
            rec.n++; rec.kinds[kind] = (rec.kinds[kind] ?? 0) + 1; rec.cut.push(cn);
            if (spotGap !== null) rec.spotGap.push(spotGap);
            if (best && meet.has(best) && T) { if (cd(best) < cd(A)) rec.ahead++; else rec.behind++; if (!fresh.get(best)) rec.teammateHeld++; }
          }
          if (pd !== undefined) (diag[`${bk}|decided`] ??= []).push(Math.abs(((hd - pd) * 180 / Math.PI + 540) % 360 - 180) / 0.05); }
        head.set(a, h); headD.set(a, hd); }
      for (const a of [...head.keys()]) if (!meet.has(a)) head.delete(a);
    }
  }
  const w = [...turns].sort((a, b) => a - b), turnP50 = w.length ? w[Math.floor(.5 * (w.length - 1))] : NaN;
  const p50 = (x: number[] = []) => { const y = [...x].sort((a, b) => a - b); return y.length ? y[Math.floor(.5 * (y.length - 1))] : NaN; };
  const bandP50 = Object.fromEntries(Object.entries(band).map(([k, v]) => [k, { p50: p50(v), n: v.length }]));
  if (process.env.PC_PRINT) { const pp = (x: number[]) => { const y = [...x].sort((a, b) => a - b); return y.length ? y[Math.floor(.5 * (y.length - 1))].toFixed(1) : 'nan'; }; for (const k of Object.keys(diag).sort()) if (k.startsWith('3-8')) console.log('PCD', flagName, k, 'n', diag[k].length, 'p50', pp(diag[k])); }
  if (process.env.PC_PRINT) { const y = [...((globalThis as any).__yw ?? [])].sort((a: number, b: number) => a - b); console.log('YW', flagName, y.length, [.1, .25, .5, .75, .9].map(q => y.length ? y[Math.floor(q * (y.length - 1))].toFixed(2) : 'nan').join(' ')); (globalThis as any).__yw = []; }
  if (process.env.PC_PRINT) { const S = (globalThis as any).__spc ?? {}; const q = (x: number[], f: number) => { const y = [...x].sort((a, b) => a - b); return y.length ? y[Math.floor(f * (y.length - 1))].toFixed(2) : 'nan'; };
    for (const k of Object.keys(S).filter(k => k.startsWith(`${flagName}|`))) { const r = S[k]; console.log('SPC', k, 'n', r.n, JSON.stringify(r.kinds), 'cut p50', q(r.cut, .5), '| same-target pairs: held spots apart p25/p50/p75', q(r.spotGap, .25), q(r.spotGap, .5), q(r.spotGap, .75), '| teammate nearer the carrier', r.ahead, 'farther', r.behind, '| teammate held', r.teammateHeld); }
    for (const k of Object.keys(S)) if (k.startsWith(`${flagName}|`)) delete S[k]; }
  if (process.env.PC_PRINT) console.log('WHY', flagName, JSON.stringify((globalThis as any).__commitWhy)); (globalThis as any).__commitWhy = {};
  if (process.env.PC_PRINT) console.log('PC', flagName, zeroAtCatch, nearAtCatch, jumps, ticks, 'turn p50', turnP50?.toFixed(1), 'n', w.length, JSON.stringify(bandP50), JSON.stringify(bandJ));
  return { zeroAtCatch, nearAtCatch, jumpRate: jumps / Math.max(1, ticks), ticks: Math.max(1, ticks), turnP50, turnN: w.length, bandP50, bandJ };
}

describe('PURSUIT_COMMIT: pursuers commit to their meeting and keep their approach through the catch', () => {
  it('off: some nearby defenders ask for a stop on the catch tick', async () => {
    const r = await run('0');
    // Premise floor (a sample for the claim, not a mechanism): enough defenders near the catch. With the throws staged
    // the count still moves with what defenders saw of the passer before the throw (his eyes and body under QB_EYES:
    // develop 21, the QB lane's engine-63 arm 19), so the floor is 15. Measured 1 of 27 asking for a stop before staging.
    expect(r.nearAtCatch).toBeGreaterThanOrEqual(15);
    expect(r.zeroAtCatch).toBeGreaterThan(0);
  }, 240_000);
  it('on: none do, his request turns less, and the bearing to his planned meeting jumps no more often', async () => {
    const off = await run('0'), on = await run('1');
    expect(on.zeroAtCatch).toBe(0);
    expect(on.ticks).toBeGreaterThan(200);
    // Meeting-bearing jumps at matched range, as the turn rate below: the pooled rate moves with the band mix (engine-61
    // candidate: pooled 187/3292 on vs 188/4175 off fails a pooled bound while 3-8 yd is 22/857 vs 22/1062, because the
    // 0-3 yd band, where most jumps are, is 266 vs 477 ticks). The pooled counts and every band are printed by PC_PRINT.
    const [jOn, nOn] = on.bandJ['3-8'] ?? [0, 0], [jOff, nOff] = off.bandJ['3-8'] ?? [0, 0];
    expect(nOn).toBeGreaterThan(300); expect(nOff).toBeGreaterThan(300);
    const rOn = jOn / nOn, rOff = jOff / nOff;
    const se = Math.sqrt(rOn * (1 - rOn) / nOn + rOff * (1 - rOff) / nOff);
    expect(rOn).toBeLessThan(rOff + 2 * se);
    expect(on.turnN).toBeGreaterThan(1000);
    // Steadiness at matched range: the pooled median mixes ranges (close pursuit turns more), and a stack that changes
    // which pursuits occur moves it without any change in steadiness (engine-59's QB_BODY_SEEN changes the catches:
    // fewer long chases, pooled p50 13 -> 27 deg/s in both arms). At 3-8 yd, where the commit acts on the approach:
    // engine-59 candidate 15.2 -> 6.7 deg/s; the other bands are reported by PC_PRINT.
    expect(on.bandP50['3-8'].n).toBeGreaterThan(300);
    expect(on.bandP50['3-8'].p50).toBeLessThan(off.bandP50['3-8'].p50 * 0.8);
  }, 480_000);
});
