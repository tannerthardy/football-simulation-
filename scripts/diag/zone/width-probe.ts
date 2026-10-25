/** Where outside-zone width is lost: lateral play-side displacement at 1.5 s
 * by role (OL engaged / free, DL, LB, RB), and for engaged defenders the
 * lateral speed they requested versus what their body achieved.
 * Observation only. node --import tsx scripts/diag/zone/width-probe.ts [runs] [seeds]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const runs = (process.argv[2] ?? 'wz_strong,oz_strong').split(',');
const seeds = (process.argv[3] ?? '3,7').split(',').map(Number);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const acc = new Map<string, number[]>();
const add = (k: string, v: number) => acc.set(k, [...(acc.get(k) ?? []), v]);
for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const ps = playSideSign(sim, RUN_BY_ID[run]);
    const y0 = new Map(sim.agents.map((a) => [a, a.pos.y]));
    const engagedTicks = new Map(sim.agents.map((a) => [a, 0]));
    let ticks = 0;
    while (sim.phase === 'live' && sim.t < 1.5) {
      sim.tick(); ticks++;
      for (const e of sim.engagements) {
        engagedTicks.set(e.blocker, engagedTicks.get(e.blocker)! + 1); engagedTicks.set(e.defender, engagedTicks.get(e.defender)! + 1);
        for (const h of e.helpers) engagedTicks.set(h, engagedTicks.get(h)! + 1);
        if (sim.t > .6) {
          const req = sim.intents[e.defender.idx]?.vel.y ?? 0;
          add('DL engaged: requested lateral yd/s', req * ps); add('DL engaged: achieved lateral yd/s', e.defender.vel.y * ps);
          add('OL engaged: requested lateral yd/s', (sim.intents[e.blocker.idx]?.vel.y ?? 0) * ps); add('OL engaged: achieved lateral yd/s', e.blocker.vel.y * ps);
        }
      }
    }
    for (const a of sim.agents) {
      const lat = (a.pos.y - y0.get(a)!) * ps, mostly = engagedTicks.get(a)! > ticks * .5;
      const role = OL.has(a.slot) ? `OL ${mostly ? 'mostly engaged' : 'mostly free'}` : a.slot.startsWith('D') ? `DL ${mostly ? 'mostly engaged' : 'mostly free'}`
        : a.slot.startsWith('LB') ? 'LB' : a.slot === 'RB' ? 'RB' : null;
      if (role) add(`${role}: lateral at 1.5 s, yd`, lat);
    }
  }
for (const [k, v] of [...acc].sort()) {
  const s = [...v].sort((a, b) => a - b);
  console.log(`${k.padEnd(42)} n ${String(v.length).padStart(5)}  mean ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2).padStart(5)}  median ${s[s.length >> 1].toFixed(2).padStart(5)}`);
}
