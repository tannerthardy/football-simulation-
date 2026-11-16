import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const concept = PASS_BY_ID[process.argv[2] ?? 'pa_flood'], formation = FORMATION_BY_ID[process.argv[3] ?? 'gun_doubles_11'];
for (const flip of [false, true]) {
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  const sim: any = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: concept, label: concept.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'none' },
    los: 40, ballY: Number(process.env.BALL_Y ?? 26.65), firstDownX: 50, seed: 1 } as any);
  const ss = sim.offAlign.strongSign, Y = sim.offense.find((a: any) => a.slot === 'Y');
  const near = sim.defense.map((d: any) => ({ s: d.slot, dx: +(d.pos.x - Y.pos.x).toFixed(2), dy: +((d.pos.y - Y.pos.y) * ss).toFixed(2), stance: d.stance, press: sim.defAlign.spots[d.slot]?.press }))
    .filter((r: any) => Math.abs(r.dy) < 2.5 && Math.abs(r.dx) < 3);
  console.log(`flip ${flip} spots: ` + Object.values(sim.defAlign.spots).map((sp: any) => `${sp.slot}(${(sp.pos.x-40).toFixed(2)},${((sp.pos.y-sim.ballY)*ss).toFixed(2)})`).join(' '));
  console.log(`flip ${flip}: Y near`, JSON.stringify(near), 'D near all', sim.defense.map((d: any) => `${d.slot}(${(d.pos.x-40).toFixed(2)},${((d.pos.y-sim.ballY)*ss).toFixed(2)})`).join(' '));
}
