/** Controlled mechanical anatomy, independent of play calling/outcome tuning.
 * node --import tsx scripts/contact-fundamentals-lab.ts [output=out/contact-fundamentals.json]
 * Copy unchanged into an archived revision together with source-version.ts.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { createEngagement, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
import { sourceVersion } from './source-version.js';

function fixture(seed: number) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(seed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(seed + 12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'mechanical rep' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'mechanical rep' },
    los: 40, ballY: 26, firstDownX: 50, seed });
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
  }
  const b = sim.slot('RT')!, d = sim.slot('DE_S')!, other = sim.slot('RG')!;
  b.body.pos = { x: 34, y: 26 }; d.body.pos = { x: b.pos.x + b.profile.radius + d.profile.radius, y: 26 };
  sim.qb.body.pos = { x: 30, y: 26 };
  return { sim, b, d, other };
}
const center = (agents: Agent[]) => {
  const mass = agents.reduce((s, a) => s + a.profile.massKg, 0);
  return { x: agents.reduce((s, a) => s + a.pos.x * a.profile.massKg, 0) / mass,
    y: agents.reduce((s, a) => s + a.pos.y * a.profile.massKg, 0) / mass };
};
const velocity = (agents: Agent[]) => {
  const mass = agents.reduce((s, a) => s + a.profile.massKg, 0);
  return { x: agents.reduce((s, a) => s + a.vel.x * a.profile.massKg, 0) / mass,
    y: agents.reduce((s, a) => s + a.vel.y * a.profile.massKg, 0) / mass };
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const gap = (b: Agent, d: Agent) => ({ x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y });
const rows = [];
for (const seed of [7, 19, 31, 43]) {
  // No tangential foot force: changing the remote launch position must not
  // turn a normal driving force into sideways translation.
  for (const shift of [-10, 0, 10]) {
    const { sim, b, d } = fixture(seed);
    sim.qb.body.pos.y += shift; b.profile.power = 0; d.profile.power *= 2;
    b.profile.lateral = d.profile.lateral = 0;
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.nextMoveAt = Infinity; e.move = 'bull'; e.control = 0;
    const before = center([b, d]); updateEngagements(sim); const after = center([b, d]);
    rows.push({ seed, test: 'normal-force', shift, backward: before.x - after.x, sideways: after.y - before.y });
  }
  {
    const { sim, b, d } = fixture(seed);
    b.profile.power = d.profile.power = 0;
    const e = createEngagement(sim, b, d, 'run', { x: 1, y: 0 })!; e.nextMoveAt = Infinity;
    const before = center([b, d]), oldGap = gap(b, d); updateEngagements(sim);
    rows.push({ seed, test: 'internal-reposition', centerDrift: distance(center([b, d]), before), relativeChange: distance(gap(b, d), oldGap) });
  }
  {
    const { sim, b, d, other } = fixture(seed);
    const e = createEngagement(sim, b, d, 'pass', null)!;
    e.nextMoveAt = Infinity; e.move = 'bull'; e.phi = 0; e.control = 0;
    other.body.pos = { x: b.pos.x, y: b.pos.y + 0.4 }; other.body.vel = { x: 0, y: -8 };
    const before = center([b, d, other]), oldGap = gap(b, d);
    // Use the same collision entry on both revisions. This is a diagnostic,
    // not a second implementation of the contact solver.
    (sim as unknown as { resolveCollisions(): void }).resolveCollisions();
    const after = center([b, d, other]), bump = velocity([b, d]);
    const distortion = distance(gap(b, d), oldGap); updateEngagements(sim);
    rows.push({ seed, test: 'outside-bump', centerDrift: distance(after, before), blockDistortion: distortion,
      commonYAfterBump: bump.y, commonYAfterNextSolve: velocity([b, d]).y });
  }
}
const average = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
const result = { sourceSha256: sourceVersion(), setup: { seeds: [7, 19, 31, 43], dt: 0.05, reps: rows.length },
  definitions: { normal: 'One contact tick with lateral acceleration disabled; identical bodies, shifted remote QB, zero blocker power.',
    internal: 'Zero-power run block; relative leverage may change, but internal correction must preserve center and momentum.',
    bump: 'An arriving neighbor bumps a pass block. Collision preserves total center and block separation, and momentum persists into the next block solve.',
    limitations: 'Synthetic mechanical invariants, not NFL targets. Does not validate limb mechanics, torque, coefficient of friction or game realism.' },
  summary: {
    maxNormalSideways: Math.max(...rows.filter(r => r.test === 'normal-force').map(r => Math.abs(r.sideways!))),
    meanInternalDrift: average(rows.filter(r => r.test === 'internal-reposition').map(r => r.centerDrift!)),
    meanBumpDistortion: average(rows.filter(r => r.test === 'outside-bump').map(r => r.blockDistortion!)),
    meanBumpY: average(rows.filter(r => r.test === 'outside-bump').map(r => r.commonYAfterBump!)),
    meanNextSolveY: average(rows.filter(r => r.test === 'outside-bump').map(r => r.commonYAfterNextSolve!)),
  }, rows };
const output = process.argv[2] ?? 'out/contact-fundamentals.json';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: result.summary }, null, 2));
