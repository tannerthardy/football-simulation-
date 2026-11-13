/**
 * Run-blocking assignment audit: prints each blocker's snap-time plan for a
 * formation × run concept × front, the box defenders nobody is assigned, and
 * (with N > 0) the outcome distribution and leading tacklers over N forced
 * repetitions (alternating flip and Cover 2 / Cover 3, no coaches).
 *
 *   node --import tsx scripts/diag/run-plans.ts [formations] [concepts] [fronts] [N]
 *   node --import tsx scripts/diag/run-plans.ts i_pro_21 power,counter over,under 150
 *
 * Lateral positions are yards from the ball, + = playside. `L` marks a
 * defender off the line (linebacker depth). See
 * docs/reviews/run-blocking-assignment-audit.md.
 */
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../../src/playbook/types.js';
import { planRunBlocking, playSideSign } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';

const [forms = 'i_pro_21', concepts = 'power,counter,trap,iz_strong,oz_strong', fronts = 'over,under,odd', nStr = '0'] = process.argv.slice(2);
const N = Number(nStr);
const LOS = 35;

function setup(rng: Rng, fid: string, cid: string, frid: string, flip: boolean, cov: string): PlaySim {
  const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.55 });
  const formation = FORMATION_BY_ID[fid];
  const front = FRONT_BY_ID[frid];
  const personnel = front.personnel[0];
  const offCall: OffensivePlayCall = { formation, flip, kind: 'run', run: RUN_BY_ID[cid], label: cid };
  const defCall: DefensivePlayCall = { personnel, front, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov };
  return new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel), offCall, defCall, los: LOS, ballY: HASH_LEFT_Y, firstDownX: LOS + 10, seed: rng.nextU32() });
}

for (const fid of forms.split(',')) {
  for (const cid of concepts.split(',')) {
    for (const frid of fronts.split(',')) {
      const concept = RUN_BY_ID[cid];
      const sim = setup(new Rng(3), fid, cid, frid, false, 'cover3');
      const ps = playSideSign(sim, concept);
      const rel = (y: number) => ((y - sim.ballY) * ps).toFixed(1);
      const plans = planRunBlocking(sim, concept);
      console.log(`## ${fid} ${cid} vs ${frid}`);
      for (const [a, p] of plans) {
        if (p.kind === 'stalk') continue;
        const tgt = p.target ? `${p.target.slot}@${rel(p.target.pos.y)}${p.target.pos.x - LOS > 2 ? 'L' : ''}` : '— (no target)';
        console.log(`  ${`${a.slot}@${rel(a.pos.y)}`.padEnd(9)} ${(p.kind + (p.pullRole ? `/${p.pullRole}` : '')).padEnd(10)} → ${tgt}${p.climbTo ? ` ⇒ ${p.climbTo.slot}` : ''}`);
      }
      const assigned = new Set([...plans.values()].flatMap((p) => [p.target, p.climbTo]));
      const free = sim.defense.filter((d) => !assigned.has(d) && d.pos.x - LOS < 7.5 && Math.abs(d.pos.y - sim.ballY) < 9);
      console.log(`  unassigned box: ${free.map((d) => `${d.slot}@${rel(d.pos.y)}`).join(' ') || 'none'}`);

      if (N <= 0) continue;
      const rng = new Rng(11);
      const yards: number[] = [];
      const tacklers: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const s = setup(rng, fid, cid, frid, i % 2 === 1, i % 2 ? 'cover3' : 'cover2');
        const r = s.run();
        yards.push(r.yards);
        const tackle = r.events.find((e) => e.type === 'tackle');
        if (tackle?.a !== undefined) tacklers[s.agents[tackle.a].slot] = (tacklers[s.agents[tackle.a].slot] ?? 0) + 1;
      }
      yards.sort((a, b) => a - b);
      const share = (f: (y: number) => boolean) => `${((yards.filter(f).length / N) * 100).toFixed(0)}%`;
      const top = Object.entries(tacklers).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' ');
      console.log(`  n ${N} median ${yards[N >> 1].toFixed(1)} mean ${(yards.reduce((a, b) => a + b, 0) / N).toFixed(1)} ≤0 ${share((y) => y <= 0)} 2–5 ${share((y) => y >= 2 && y <= 5)} 10+ ${share((y) => y >= 10)} | tacklers ${top}`);
    }
  }
}
