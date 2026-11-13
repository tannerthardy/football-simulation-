/** PURSUIT_COMMIT (src/sim/behaviors/common.ts commitMeeting, defense.ts playObservedFlight; experimental, off).
 * Fixed short passes against zone and man (teams from fixed seeds, the reference stack's on-flags):
 *  - on the last tick of the ball's flight a defender playing it no longer decides to stop (his decided command,
 *    before teammate spacing; off: some defenders within 8 yd of the catch decide zero speed on that tick; on: none
 *    do). Teammate spacing can still stop a defender who is running straight at a teammate converging on the same
 *    catch; that is spacing's limit, not this decision;
 *  - an open-field pursuer keeps the meeting he chose: his final request's heading turns less (median per tick, while
 *    his pursuit planner runs; engine-54: 13.2 -> 8.4 deg/s over about 6,000 pursuer-ticks each), and the bearing to
 *    his planned meeting point jumps (> 10 deg in a tick) no more often than off, within two standard errors (engine-54:
 *    0.0230 vs 0.0223; the engine-52 reduction, about 1.5 SE, is not claimed). Requests only; no outcome is asserted. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

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
  let zeroAtCatch = 0, nearAtCatch = 0, jumps = 0, ticks = 0; const turns: number[] = [];
  for (const pass of ['stick', 'slant_flat', 'curl_flat', 'smash']) for (let seed = 1; seed <= 4; seed++) {
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 't' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never) as any;
    const meet = new Map<unknown, number>(), seen = new Map<unknown, number>(), head = new Map<unknown, number>();
    const tc0 = sim.commandTraceFor.bind(sim);
    sim.commandTraceFor = (a: unknown) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
      ? (t: unknown, d: any) => { if (d?.kind === 'intercept') { const q = (a as any).pos; meet.set(a, Math.atan2(d.steeringPoint.y - q.y, d.steeringPoint.x - q.x)); } return o?.pursuit?.(t, d); }
      : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
    let caught = false;
    while (sim.phase !== 'dead' && sim.t < 12) {
      const wasAir = sim.ball.kind === 'air'; meet.clear();
      sim.tick();
      const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (wasAir && !caught && c && c.team === 'O' && c !== sim.qb) {
        caught = true;
        for (const d of sim.defense) if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 8) {
          nearAtCatch++; const v = sim.cmds[d.idx].vel; if (Math.hypot(v.x, v.y) < 0.3) zeroAtCatch++; }
      }
      for (const [a, m] of meet) { const p = seen.get(a); if (p !== undefined) { ticks++; const dd = Math.abs(((m - p) * 180 / Math.PI + 540) % 360 - 180); if (dd > 10) jumps++; } seen.set(a, m); }
      for (const a of [...seen.keys()]) if (!meet.has(a)) seen.delete(a);
      // His final request's heading (after every stage), tick to tick, while his pursuit planner runs and he asks to move.
      for (const a of meet.keys()) { const v = sim.intents[(a as any).idx].vel; if (Math.hypot(v.x, v.y) < 1) { head.delete(a); continue; }
        const h = Math.atan2(v.y, v.x), p = head.get(a); if (p !== undefined) turns.push(Math.abs(((h - p) * 180 / Math.PI + 540) % 360 - 180) / 0.05); head.set(a, h); }
      for (const a of [...head.keys()]) if (!meet.has(a)) head.delete(a);
    }
  }
  const w = [...turns].sort((a, b) => a - b), turnP50 = w.length ? w[Math.floor(.5 * (w.length - 1))] : NaN;
  if (process.env.PC_PRINT) console.log('PC', flagName, zeroAtCatch, nearAtCatch, jumps, ticks, 'turn p50', turnP50?.toFixed(1), 'n', w.length);
  return { zeroAtCatch, nearAtCatch, jumpRate: jumps / Math.max(1, ticks), ticks: Math.max(1, ticks), turnP50, turnN: w.length };
}

describe('PURSUIT_COMMIT: pursuers commit to their meeting and keep their approach through the catch', () => {
  it('off: some nearby defenders ask for a stop on the catch tick', async () => {
    const r = await run('0');
    expect(r.nearAtCatch).toBeGreaterThan(20); // measured 1 of 27 asking for a stop
    expect(r.zeroAtCatch).toBeGreaterThan(0);
  }, 240_000);
  it('on: none do, his request turns less, and the bearing to his planned meeting jumps no more often', async () => {
    const off = await run('0'), on = await run('1');
    expect(on.zeroAtCatch).toBe(0);
    expect(on.ticks).toBeGreaterThan(200);
    const se = Math.sqrt(on.jumpRate * (1 - on.jumpRate) / on.ticks + off.jumpRate * (1 - off.jumpRate) / off.ticks);
    expect(on.jumpRate).toBeLessThan(off.jumpRate + 2 * se); // engine-54: 137/5945 vs 151/6783 per pursuer-tick
    expect(on.turnN).toBeGreaterThan(1000);
    expect(on.turnP50).toBeLessThan(off.turnP50 * 0.8); // engine-54: 8.4 vs 13.2 deg/s
  }, 480_000);
});
