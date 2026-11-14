// Crossers against man (Cover 1): his top speed, the route's requested speed and what he achieves, and his facing
// against his travel, every 0.25 s while the ball is held. Run Game diagnostic for Integration (2026-11-14).
//   node --import tsx scripts/diag/crosser/cross-probe.mts [concept=mesh] [seeds=8]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const concept = PASS_BY_ID[process.argv[2] ?? 'mesh'], seeds = Number(process.argv[3] ?? 8);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const rows: string[] = [];
for (let s = 1; s <= seeds; s++) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, kind: 'pass', flip: s % 2 === 0, pass: concept, label: concept.name },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'C1' },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * s + 7 });
  const t0 = sim.tick.bind(sim); let next = 0.5;
  const runners = () => sim.offense.filter((a: any) => a.behavior instanceof RouteRunner && ['cross', 'shallow', 'shallow_high', 'under'].includes(a.behavior.route.id));
  sim.tick = () => { t0();
    if (sim.t < next - 1e-9 || sim.ball.kind !== 'held' || sim.t > 3.01) return; next += 0.25;
    for (const a of runners()) {
      const cmd = a.behavior.update ? null : null; void cmd;
      const sp = Math.hypot(a.vel.x, a.vel.y), head = Math.atan2(a.vel.y, a.vel.x);
      const off = Math.abs(Math.atan2(Math.sin(a.body.facing - head), Math.cos(a.body.facing - head))) * 180 / Math.PI;
      const nd = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y)));
      rows.push(JSON.stringify({ s, slot: a.slot, route: a.behavior.route.id, t: +sim.t.toFixed(2), vmax: +a.profile.vmax.toFixed(2),
        effort: +a.behavior.effort.toFixed(2), sp: +sp.toFixed(2), facingOff: Math.round(off), nearest: +nd.toFixed(2), x: +(a.pos.x - sim.los).toFixed(1),
        squeeze: +(a.body.squeeze ?? 0).toFixed(2), energy: +a.body.energy.toFixed(2),
        joints: sim.world.joints.filter((j: any) => j.a === a.body || j.b === a.body).map((j: any) => j.kind ?? 'hand').join(','), contact: (a.contactWith ?? []).length,
        reqSp: +(Math.hypot(sim.cmds?.[a.idx]?.vel?.x ?? 0, sim.cmds?.[a.idx]?.vel?.y ?? 0)).toFixed(2) }));
    }
  };
  sim.run();
}
console.log(rows.join('\n'));
