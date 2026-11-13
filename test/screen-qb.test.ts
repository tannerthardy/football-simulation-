/** SCREEN_QB (behaviors/qb.ts; experimental, off): a dead quick screen is thrown away on the QB's read of it, not on a
 * clock (docs/reviews/2026-11-13-screen-qb.md). From the moment the screen should be thrown he reads, from his own
 * picture, whether the catcher is covered (a free defender on him or on the spot) or the lane is filled (a rusher in
 * the throw's first yards); a picture that stays dead for his patience is thrown away. A clock is only the outer bound.
 * Over a named panel of screen-lab snaps (teams 41/42, seed 1000s+7, flip on even s):
 * - every throwaway on his read had, in truth at that moment, a defender within 1.5 yd of the catcher or a rusher in
 *   the lane, and the known dead snaps are thrown away on the read;
 * - live quick screens (bunch now and now screen against Cover 3) are thrown, not thrown away;
 * - a tunnel thrown to its spot is rechecked at the delivery by the rule it was thrown on, not re-priced as a route's
 *   window (that pumped it every look to 2.7-3.0 s). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const DEAD: [string, string, number][] = [['bubble_screen', 'cover1', 1], ['bubble_screen', 'cover1', 2], ['bubble_screen', 'cover1', 3]];
const LIVE: [string, string, number][] = [['bunch_now_screen', 'cover3', 1], ['bunch_now_screen', 'cover3', 2], ['wide_now_screen', 'cover3', 1], ['wide_now_screen', 'cover3', 2]];
const TUNNEL: [string, string, number][] = [['tunnel_screen', 'cover3', 1], ['tunnel_screen', 'cover3', 2], ['tunnel_screen', 'cover1', 1], ['tunnel_screen', 'cover2', 2]];
const FORMATION: Record<string, string> = { bubble_screen: 'gun_trips_11', bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11', wide_now_screen: 'gun_doubles_11' };

async function snap(concept: string, coverage: string, s: number) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('SCREEN_QB', '1');
  const { CENTER_Y } = await import('../src/core/field.js');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID[FORMATION[concept]], pass = SCREEN_BY_ID[concept];
  const sim: any = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation, flip: s % 2 === 0, kind: 'pass', pass, label: pass.name },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * s + 7, audibles: false,
  });
  const qb = sim.qb, catcher = sim.agents.find((a: any) => a.slot === sim.offAlign.numbering[pass.screen!.receiver]);
  const seen = { truth: null as { covered: boolean; lane: boolean } | null };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const before = sim.ball.kind;
    tick();
    if (seen.truth || before === 'air' || sim.ball.kind !== 'air' || !sim.ball.throwaway) return;
    const dx = catcher.pos.x - qb.pos.x, dy = catcher.pos.y - qb.pos.y, L = Math.hypot(dx, dy) || 1;
    const truth = { covered: false, lane: false }; seen.truth = truth;
    for (const d of sim.defense) {
      if (Math.hypot(d.pos.x - catcher.pos.x, d.pos.y - catcher.pos.y) < 1.5) truth.covered = true;
      const al = ((d.pos.x - qb.pos.x) * dx + (d.pos.y - qb.pos.y) * dy) / L, off = Math.abs((d.pos.x - qb.pos.x) * dy - (d.pos.y - qb.pos.y) * dx) / L;
      if (al > 0 && al < Math.min(4, 0.45 * L) && off < 1.5) truth.lane = true;
    }
  };
  sim.run();
  const thr = sim.events.find((e: any) => e.type === 'throw');
  return { away: (qb.behavior.screenThrownAway ?? false) as false | 'dead' | 'bound', truth: seen.truth, thrown: !!thr, at: thr?.t as number | undefined };
}

describe('SCREEN_QB dead quick screen', () => {
  it('is thrown away on his read when it is dead, and live ones are thrown', async () => {
    const dead = [] as Awaited<ReturnType<typeof snap>>[];
    for (const c of DEAD) dead.push(await snap(...c));
    for (const r of dead) if (r.away === 'dead') expect(r.truth!.covered || r.truth!.lane).toBe(true);
    expect(dead.filter((r) => r.away === 'dead').length).toBeGreaterThanOrEqual(3);
    for (const c of LIVE) { const r = await snap(...c); expect(r.away).toBe(false); expect(r.thrown).toBe(true); }
  }, 120000);
  it('a tunnel thrown to its spot is not pumped by a route window at the delivery: it leaves before 2.2 s (NFL 1.6)', async () => {
    for (const c of TUNNEL) { const r = await snap(...c); expect(r.thrown).toBe(true); expect(r.at!).toBeLessThan(2.2); }
  }, 120000);
});
