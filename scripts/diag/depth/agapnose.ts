/** The A-gap 1 technique on power (lab; observation only, flags from the
 * environment). For the interior lineman aligned nearest the centre: the
 * first blocker to engage him, whether he squeezed (DL_SQUEEZE's tag), and
 * his lateral offset from the back when the back crosses the line (+ = on
 * the back's play side), with the run's yards.
 * node --import tsx scripts/diag/depth/agapnose.ts [--n 30] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '30'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const by = new Map<string, number>(); let sq = 0, rows = 0; const offs: number[] = [], yards: number[] = [], spot: number[] = [];
for (const form of ['ace_11', 'i_pro_21']) for (const front of ['over', 'under']) for (let i = 0; i < n; i++) {
  const formation = FORMATION_BY_ID[form], personnel = formation.personnel === '21' ? 'base43' : 'nickel';
  const seed = [...`${form}|${front}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID.power, label: 'power' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed, aGap: .63 } as never);
  const c0 = sim.slot('C')!;
  const nose: Agent = sim.defense.filter(d => /^(DT|NT)/.test(d.slot)).reduce((p, q) => Math.abs(q.pos.y - c0.pos.y) < Math.abs(p.pos.y - c0.pos.y) ? q : p);
  spot.push(Math.abs(nose.pos.y - c0.pos.y));
  let first = '', at: number | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!first && nose.engagement) first = nose.engagement.blocker.slot;
    const c = sim.carrier;
    if (at === null && c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * sim.attackDir('O') >= 0) {
      const side = Math.sign(c.pos.y - c0.pos.y) || 1; at = (nose.pos.y - c.pos.y) * side;
    }
  };
  const r = sim.run();
  rows++; by.set(first || 'none', (by.get(first || 'none') ?? 0) + 1); if (nose.tags.has('squeeze')) sq++;
  if (at !== null) offs.push(at); yards.push(r.yards);
}
const med = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`plays ${rows} | nose off the centre at the snap p50 ${med(spot)} yd | first blocker ${[...by].map(([k, v]) => `${k} ${Math.round(100 * v / rows)}%`).join(', ')} | squeezed ${Math.round(100 * sq / rows)}% | at the crossing, nose from the back toward the play side p50 ${med(offs)} yd | yards p50 ${med(yards)}, 10+ ${Math.round(100 * yards.filter(y => y >= 10).length / rows)}%`);
