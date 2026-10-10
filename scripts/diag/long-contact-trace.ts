/** Separate closed-loop pursuit from world symmetry in prolonged contact.
 * node --import tsx scripts/diag/long-contact-trace.ts out/long-contact.json
 * Fixed-generated bodies from the existing moving-contact frontal fixture.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { wrapAngle } from '../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { World, type Intent } from '../../src/physics/world.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

function setup(seed: number, side: number, substeps: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 1), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 58, y: CENTER_Y + side }; d.body.vel = { x: -3, y: side * 0 };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  const world = new World([c.body, d.body], { substeps });
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, c, d, world };
}
const reflected = (cmd: Intent): Intent => ({ ...cmd, vel: { x: cmd.vel.x, y: -cmd.vel.y },
  facing: cmd.facing === undefined ? undefined : -cmd.facing });
const rows = [];
for (const seed of [7, 19]) for (const substeps of [12, 48]) for (const mode of ['closed-loop', 'matched-controls']) {
  const plus = setup(seed, 1, substeps), minus = setup(seed, -1, substeps), frames = [];
  let maxPositionError = 0, firstDifference: unknown = null;
  for (let k = 0; k < 100; k++) {
    plus.sim.perception.record(plus.sim.agents); minus.sim.perception.record(minus.sim.agents);
    const cmd = chase(plus.sim, plus.d, plus.c);
    const mirror = mode === 'matched-controls' ? reflected(cmd) : chase(minus.sim, minus.d, minus.c);
    const rp = plus.world.step([{ vel: { x: 6, y: 0 }, facing: 0 }, cmd], .05);
    const rm = minus.world.step([{ vel: { x: 6, y: 0 }, facing: 0 }, mirror], .05);
    plus.sim.t += .05; minus.sim.t += .05;
    const actors = [0, 1].map(i => {
      const a = plus.world.bodies[i], b = minus.world.bodies[i];
      const positionError = Math.hypot(a.pos.x - b.pos.x, a.pos.y + b.pos.y - 2 * CENTER_Y);
      maxPositionError = Math.max(maxPositionError, positionError);
      return { actor: i === 0 ? 'carrier' : 'defender', positionError,
        velocityError: Math.hypot(a.vel.x - b.vel.x, a.vel.y + b.vel.y),
        facingError: Math.abs(wrapAngle(a.facing + b.facing)), spinError: Math.abs((a.spin ?? 0) + (b.spin ?? 0)),
        xiError: Math.hypot(a.support!.xi.x - b.support!.xi.x, a.support!.xi.y + b.support!.xi.y),
        stateMatches: a.support!.state === b.support!.state };
    });
    const frame = { t: plus.sim.t, commands: { plus: cmd, minus: mirror }, actors,
      plus: structuredClone(plus.world.bodies), minus: structuredClone(minus.world.bodies),
      reports: { plus: rp, minus: rm } };
    if (!firstDifference && actors.some(a => a.positionError > 1e-7 || a.velocityError > 1e-7 || a.facingError > 1e-7 || a.xiError > 1e-7 || !a.stateMatches)) firstDifference = frame;
    frames.push(frame);
  }
  rows.push({ seed, substeps, mode, maxPositionError, firstDifference, frames });
}
const out = process.argv[2] ?? 'out/long-contact.json'; mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceSha256: sourceVersion(),
  note: 'Eight five-second mirrored frontal pairs. Closed-loop mode executes ordinary chase independently; matched-controls reflects the positive-side command instead, isolating the world from pursuit feedback. This diagnostic does not fix inputs to force matching physical outcomes.', rows }) + '\n');
console.table(rows.map(r => ({ seed: r.seed, substeps: r.substeps, mode: r.mode,
  maxPositionError: r.maxPositionError, firstDifference: (r.firstDifference as { t?: number } | null)?.t ?? null })));
