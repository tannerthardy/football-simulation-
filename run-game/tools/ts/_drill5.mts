// Raw physics: two hand-joined bodies moving sideways together, both asking for the same lateral speed.
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { stand } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
const LOS = 40, formation = FORMATION_BY_ID.ace_11, G = 10.7;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
function run(v0: number, bLat: number, dLat: number, bFwd: number, joined: boolean, bFace = 0, dFace = Math.PI) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) { a.body.pos = { x: 90 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) }; a.snapReadyAt = 0; }
  const c = sim.slot('C'), d = sim.slot('LB_M'), rb = sim.slot('RB');
  const gap = c.profile.radius + d.profile.radius;
  c.body.pos = { x: LOS + 2, y: 10 }; c.body.facing = bFace; d.body.pos = { x: LOS + 2 + gap, y: 10 }; d.body.facing = dFace;
  c.body.vel = { x: 0, y: v0 }; d.body.vel = { x: 0, y: v0 };
  rb.body.pos = { x: LOS - 6, y: 45 };
  c.behavior = { kind: 'b', update: () => ({ vel: { x: bFwd, y: bLat }, facing: bFace, push: 1 }) };
  d.behavior = { kind: 'd', update: () => ({ vel: { x: 0, y: dLat }, facing: dFace, push: 1 }) };
  const dW = d.profile.massKg * G;
  if (joined) sim.world.joints.push({ kind: 'hands', a: c.body, b: d.body, actor: c.body, extension: gap + .1, push: 2 * dW, hold: 0, steer: .41 * dW });
  sim.ball = { kind: 'held', carrier: rb }; sim.phase = 'live';
  const y0c = c.pos.y, y0d = d.pos.y; const sp: string[] = [];
  for (let k = 1; k <= 20; k++) { sim.tick(); if (k % 5 === 0) sp.push(`${c.vel.y.toFixed(2)}/${d.vel.y.toFixed(2)}`); }
  return `C lat ${(c.pos.y - y0c).toFixed(2)} LB lat ${(d.pos.y - y0d).toFixed(2)} | lateral speed C/LB @0.25..1.0 s: ${sp.join('  ')}`;
}
const cases: [string, number, number, number, number, boolean, number?, number?][] = [
  ['free, apart (control): both ask 3 sideways', 3, 3, 3, 0, false],
  ['joined: both ask 3 sideways, square (facing each other)', 3, 3, 3, 0, true],
  ['joined: both ask 3, blocker also drives forward 2.4', 3, 3, 3, 2.4, true],
  ['joined: both ask 3, both FACING the run direction', 3, 3, 3, 0, true, Math.PI / 2, Math.PI / 2],
  ['free, apart: square-facing, ask 3 sideways (shuffle)', 3, 3, 3, 0, false],
];
for (const [nm, v0, bl, dl, bf, j, bF, dF] of cases) console.log(nm.padEnd(58), run(v0, bl, dl, bf, j, bF ?? 0, dF ?? Math.PI));
