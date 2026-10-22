/** Who plays outside on lab power (observation only; flags from the
 * environment). Defenders aligned outside the play-side surface at the snap
 * (0.5..9 yd outside the widest lineman or inline end, at most 8 deep): their
 * slot, coverage role, the run-fit job they hold at 1.0 s (kind, whether an
 * inside bubble is attached), the fit tags in force, and how far outside the
 * surface they stand then. Same roster and seed scheme as lbtrace.ts.
 * node --import tsx scripts/diag/runblock/forcejobs.ts [form] [concept] [reps] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefPersonnelId as DefPersonnel, DefSlot } from '../../../src/playbook/types.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const [form = 'ace_12', concept = 'power', repsS = '6'] = process.argv.slice(2);
const reps = Number(repsS), rng = new Rng(7);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID[form];
const looks: [string, DefPersonnel, string][] = [['over', 'base43', 'cover3'], ['under', 'base43', 'cover3'], ['over', 'base43', 'cover1'],
  ['tite', 'base34', 'cover3'], ['odd', 'base34', 'cover1'], ['wide9', 'nickel', 'cover3']];
for (const [front, personnel, cov] of looks) {
  const rows: Record<string, number> = {}, width: Record<string, number[]> = {};
  let plays = 0;
  for (let i = 0; i < reps; i++) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
      offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
      defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[cov], pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.fork(`${form}:${concept}:${front}:${cov}:${flip}:${i}`) });
    const ps = playSideSign(sim, RUN_BY_ID[concept]), dir = sim.attackDir(sim.offense[0].team);
    const core = () => sim.offense.filter(o => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline);
    const surf0 = Math.max(...core().map(o => ps * sim.offAlign.spots[o.slot].pos.y + o.profile.radius));
    const outside = sim.defense.filter(d => {
      const w = ps * d.pos.y - surf0, depth = (d.pos.x - sim.los) * dir;
      return w >= .5 && w <= 9 && depth <= 8;
    });
    plays++;
    while (sim.phase === 'live' && sim.t < 1.0) sim.tick();
    for (const d of outside) {
      const role = sim.defAlign.spots[d.slot as DefSlot]?.role;
      const r = role ? role.kind === 'zone' ? role.zone : role.kind : '-';
      const j = d.runFit ? `${d.runFit.kind}${d.runFit.inside ? '+inside' : ''}${d.runFit.side === ps ? '' : ' (other side)'}` : 'no fit';
      const tags = [...d.tags].filter(t => t.startsWith('fit-')).join(',') || '-';
      const key = `${d.slot} ${r} | ${j} | ${tags}${d.engagement ? ' | engaged' : ''}`;
      rows[key] = (rows[key] ?? 0) + 1;
      (width[key] ??= []).push(ps * d.pos.y - surf0);
    }
  }
  console.log(`== ${front} ${cov} (${personnel}), ${plays} plays`);
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(1);
  for (const [k, n] of Object.entries(rows).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k} | outside the surface at 1.0 s ${med(width[k])}`);
}
