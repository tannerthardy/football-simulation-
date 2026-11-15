// Pressed outside hitch, per 0.1 s (Run Game, 2026-11-15): where he is against his stem line, where the corner is
// (outward + relative to him), what he asks for and which stage of RouteRunner produced it (press contact, the
// PRESS_RELEASE path, route-craft, plain route). Confirms or refutes the three-step restem mechanism before RESTEM.
//   node scripts/ref.mjs -- npx tsx scripts/diag/release/hitch-trace.mts [seed=1] [slot=X] [concept=hitches]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 1), slot = process.argv[3] ?? 'X', concept = PASS_BY_ID[process.argv[4] ?? 'hitches'];
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, kind: 'pass', flip: false, pass: concept, label: concept.name },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'C1' },
  los: 35, ballY: CENTER_Y, firstDownX: 45, seed });
const R = sim.offense.find((a: any) => a.slot === slot); const B = R.behavior;
const cb = sim.defense.find((d: any) => sim.defAlign.spots[d.slot]?.manTarget === slot);
const out = Math.sign(R.pos.y - sim.ballY) || 1, y0 = R.pos.y;
console.log(`seed ${seed} ${slot} route ${B.route?.id} at y ${y0.toFixed(1)}; corner ${cb?.slot} press ${sim.defAlign.spots[cb?.slot]?.press}; path`,
  B.path.map((p: any) => `(${(p.p.x - sim.los).toFixed(1)},${((p.p.y - y0) * out).toFixed(1)})`).join(' '));
let req: any = { x: 0, y: 0 }; let stage = '';
const up = B.update.bind(B);
B.update = (a: any, s: any) => { const pc = !!B.pressContact; R.tags.clear(); const c = up(a, s); req = c.vel ?? { x: 0, y: 0 };
  stage = pc || B.pressContact ? 'jam' : R.tags.has('route-craft') ? 'craft' : B.releaseSide !== 0 && R.pos.x < sim.los + 5 ? 'release?' : 'route'; return c; };
const t0 = sim.tick.bind(sim); let next = 0.1;
sim.tick = () => { t0(); if (sim.t < next - 1e-9 || sim.t > 3.01) return; next += 0.1;
  const dy = cb ? (cb.pos.y - R.pos.y) * out : NaN, dx = cb ? cb.pos.x - R.pos.x : NaN;
  console.log(`t ${sim.t.toFixed(1)} x ${(R.pos.x - sim.los).toFixed(1)} off-stem ${((R.pos.y - y0) * out).toFixed(2)} v (${R.vel.x.toFixed(1)},${(R.vel.y * out).toFixed(1)})`
    + ` req (${req.x.toFixed(1)},${(req.y * out).toFixed(1)}) ${stage} side ${B.releaseSide * out} idx ${B.idx} | corner ahead ${dx.toFixed(2)} out ${dy.toFixed(2)}${sim.ball.kind !== 'held' ? ' [ball ' + sim.ball.kind + ']' : ''}`); };
sim.run();
