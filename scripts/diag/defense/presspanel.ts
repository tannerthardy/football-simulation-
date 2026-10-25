/** Press man 1v1 in native plays (observation only; flags from the
 * environment): Cover 1 press against gun doubles, the X running a single
 * route (go, slant, hitch, out). For each rep the corner-to-X distance at
 * 0.5 / 1.0 / 1.5 / 2.5 s, how long the jam's hands stay on, and the depth
 * the X has reached when they come off. Fixed rosters and seeds.
 * node --import tsx scripts/diag/defense/presspanel.ts [--reps 12] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const reps = Number(arg('--reps', '12'));
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[w.length >> 1].toFixed(2) : '-'; };
for (const route of ['go', 'slant', 'hitch', 'out']) {
  const at: Record<number, number[]> = { 0.5: [], 1: [], 1.5: [], 2.5: [] }, jamFor: number[] = [], jamDepth: number[] = [];
  for (let k = 0; k < reps; k++) {
    const pass = { ...PASS_BY_ID.four_verts, strong: { 1: 'go', 2: 'go' }, weak: { 1: route, 2: 'go' } };
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(100 + k), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(200 + k), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: '' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 300 + k });
    const x = sim.slot(sim.offAlign.numbering.W1!)!, cb = sim.defense.find(d => sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.manTarget === x.slot);
    if (!cb) continue;
    let on = false, start = -1, end = -1;
    while (sim.phase === 'live' && sim.t < 2.6 && sim.throwAt < 0) {
      sim.tick();
      const jam = sim.world.joints.some(j => j.kind === 'hands' && ((j.a === cb.body && j.b === x.body) || (j.b === cb.body && j.a === x.body)));
      if (jam && !on) { on = true; if (start < 0) start = sim.t; }
      if (!jam && on) { on = false; end = sim.t; jamDepth.push(x.pos.x - sim.los); }
      for (const t of [0.5, 1, 1.5, 2.5]) if (Math.abs(sim.t - t) < 1e-6 + 1 / 120) at[t].push(Math.hypot(x.pos.x - cb.pos.x, x.pos.y - cb.pos.y));
    }
    if (start >= 0) jamFor.push((end >= 0 ? end : sim.t) - start);
  }
  console.log(`${route.padEnd(6)} distance at 0.5/1.0/1.5/2.5 s ${[0.5, 1, 1.5, 2.5].map(t => med(at[t])).join('/')} | jam on ${med(jamFor)} s (n ${jamFor.length}), off at X depth ${med(jamDepth)} yd`);
}
