/** Step 6 item 2 staged cases: run with SURFACE_ON_LINE on and =0 and compare.
 *   npx tsx scripts/diag/ir/surface-on-line.ts ; SURFACE_ON_LINE=0 npx tsx scripts/diag/ir/surface-on-line.ts
 * Per case: who stands within 2 yd of the line at the snap, the share of climber decision ticks with a detour around a
 * surface, mean yards, and a per-play hash of the event log (identity check). */
import { createHash } from 'node:crypto';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall, PersonnelId } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = 16, rng = new Rng(404);
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 }), away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
const run = (f: string): OffensivePlayCall => ({ formation: FORMATION_BY_ID[f], flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'iz' });
const def = (personnel: any, front: string, cov: string, pr?: string) => ({ personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: pr ? PRESSURE_BY_ID[pr] : null, label: front }) as DefensivePlayCall;
const CASES: Array<{ id: string; off: OffensivePlayCall; per: PersonnelId; def: DefensivePlayCall }> = [
  { id: 'inside zone (ace_11) vs Over base, double-A mug, cover 1', off: run('ace_11'), per: '11', def: def('base43', 'over', 'cover1', 'double_a') },
  { id: 'inside zone (gun_doubles_11) vs okie nickel, cover 3', off: run('gun_doubles_11'), per: '11', def: def('nickel', 'okie', 'cover3') },
  { id: 'inside zone (ace_11) vs Over base, cover 3 (ordinary)', off: run('ace_11'), per: '11', def: def('base43', 'over', 'cover3') },
];
for (const c of CASES) {
  const offense = pickOffense(home, c.per), defense = pickDefense(away, c.def.personnel), seeds = new Rng(7);
  let yards = 0, ticks = 0, detour = 0; const h = createHash('sha256'); let onLine = '';
  for (let i = 0; i < N; i++) {
    const sim = new PlaySim({ offense, defense, offCall: c.off, defCall: c.def, los: 35, ballY: CENTER_Y, firstDownX: 45, seed: seeds.nextU32() });
    if (i === 0) onLine = sim.defense.filter((d) => { const sp = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]; return sp && (sp.pos.x - sim.los) * sim.attackDir('O') < 2; })
      .map((d) => `${d.slot}@${((sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!.pos.x - sim.los) * sim.attackDir('O')).toFixed(1)}`).join(' ');
    while (sim.phase === 'live' && sim.t < 12) {
      sim.tick();
      for (const o of sim.offense) { const b = o.behavior as any; if (b?.climbRead) { ticks++; if (b.climbAccess) detour++; } }
    }
    const r = sim.run(); yards += r.yards;
    h.update(JSON.stringify(r.events.map((e) => [e.t, e.type, e.a, e.b])) + r.yards.toFixed(4));
  }
  console.log(`${c.id}: within 2 yd ${onLine}; climber ticks with a detour ${detour}/${ticks}; mean ${(yards / N).toFixed(2)} yd; plays hash ${h.digest('hex').slice(0, 12)}`);
}
