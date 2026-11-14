/** Depth and across by time since the snap for named routes in staged concepts (ball held, cover 3), the rows Rules' crosser-class
 * witnesses use (NFL shallow class 2.2 / 2.9 / 3.1 deep at 2.0 / 2.5 / 3.0 s and 5.1 / 11.3 across at 2.0 / 3.0 s).
 *   [flags] node --import tsx scripts/diag/route-speed/depth_by_time.ts [N=16] route=concept,concept ... */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 16), TS = [1.5, 2.0, 2.5, 3.0];
const specs = process.argv.slice(3).map((s) => { const [route, cs] = s.split('='); return { route, concepts: cs.split(',') }; });
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
for (const { route, concepts } of specs) {
  const D: Record<string, number[]> = {}, A: Record<string, number[]> = {}; let n = 0;
  for (const concept of concepts) for (const form of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= N; seed++) {
    const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
    const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID[form], flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'c3' },
      los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at: 6, slot: 'X' } } as never);
    const rs = sim.offense.filter((a: any) => (a.behavior?.fallback?.route ?? a.behavior?.route)?.id === route);
    for (const a of rs) {
      const y0 = a.pos.y; n++;
      const snapshot: Record<string, [number, number]> = {};
      const rec = () => {};
      (a as any).__y0 = y0; (a as any).__snap = snapshot;
    }
    while (sim.phase !== 'dead' && sim.t < 3.1) {
      sim.tick();
      for (const a of rs) for (const t of TS) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9) { const k = String(t); (D[k] ??= []).push(a.pos.x - 40); (A[k] ??= []).push(Math.abs(a.pos.y - (a as any).__y0)); }
    }
  }
  console.log(`${route.padEnd(13)} n ${String(n).padStart(3)} | depth ${TS.map((t) => med(D[String(t)] ?? []).toFixed(1)).join(' / ')} | across ${TS.map((t) => med(A[String(t)] ?? []).toFixed(1)).join(' / ')}   (1.5 / 2.0 / 2.5 / 3.0 s)`);
}
