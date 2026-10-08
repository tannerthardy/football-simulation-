/** One carrier and one pursuer, mirrored, with clean / costly contact / sticks
 * scenarios. node --import tsx scripts/sideline-lab.ts [reps=30] [out.json]
 * The sideline is a real terminal boundary, not a whistled decision.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { Pursuit } from '../src/sim/behaviors/defense.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const reps = Number(process.argv[2] ?? 30), output = process.argv[3] ?? 'out/sideline.json';
if (!Number.isInteger(reps) || reps < 1) throw new Error('reps must be a positive integer');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
const hash = createHash('sha256');
for (const file of files('src')) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
const rows: Array<{ roster: number; slot: string; geometry: string; boundaryDistance: number; mirrored: boolean; down: number; rep: number; outcome: string; yards: number; duration: number; contacts: number; lost: boolean }> = [];
for (const roster of [7, 19]) {
  const lr = new Rng(roster);
  const ot = generateTeam(lr.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const dt = generateTeam(lr.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
  for (const slot of ['X', 'RB']) for (const geometry of ['clean', 'head-on', 'sticks', 'boxed-boundary', 'past-sticks']) for (const boundaryDistance of [0.75, 2, 4]) for (const mirrored of [false, true]) for (const down of [1, 3]) for (let rep = 0; rep < reps; rep++) {
    const sim = new PlaySim({ offense: pickOffense(ot, '11'), defense: pickDefense(dt, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: '' },
      los: 40, ballY: 26, firstDownX: geometry === 'sticks' ? 49.3 : geometry === 'past-sticks' ? 47 : 50, down,
      seed: lr.fork(`${slot}:${geometry}:${boundaryDistance}:${mirrored}:${down}:${rep}`).nextU32() });
    for (const a of sim.agents) {
      a.body.pos = { x: 10, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
      a.behavior = { kind: 'parked', update: () => stand() }; a.downUntil = Infinity;
    }
    const c = sim.slot(slot)!, d = sim.slot('LB_M')!;
    const y = mirrored ? FIELD_WIDTH - boundaryDistance : boundaryDistance, inward = mirrored ? -1 : 1;
    c.downUntil = 0; c.body.pos = { x: 48, y }; c.body.vel = { x: 6, y: -inward * 1 }; c.body.facing = 0;
    c.behavior = new BallCarrier({}, c);
    d.downUntil = 0; d.body.pos = { x: geometry === 'clean' ? 38 : geometry === 'past-sticks' ? 50 : geometry === 'boxed-boundary' ? 53 : 55, y: y + inward * (geometry === 'boxed-boundary' ? -0.5 : geometry === 'past-sticks' ? 1 : 0.35) };
    d.body.vel = geometry === 'clean' ? { x: 0, y: 0 } : { x: geometry === 'past-sticks' ? -5 : -3, y: geometry === 'boxed-boundary' ? inward : geometry === 'past-sticks' ? -inward * 2 : 0 }; d.body.facing = Math.atan2(d.vel.y, d.vel.x);
    d.behavior = new Pursuit();
    sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0; sim.catchX = c.pos.x; sim.crossedLOS = true;
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    const result = sim.run();
    rows.push({ roster, slot, geometry, boundaryDistance, mirrored, down, rep, outcome: result.outcome, yards: result.endX - 48,
      duration: result.duration, contacts: result.events.filter(e => ['carrier_contact', 'tackle_wrap', 'hit'].includes(e.type) && (e.a === c.idx || e.b === c.idx)).length,
      lost: !!result.stats.fumbleLost });
  }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const cells = new Map<string, typeof rows>();
for (const row of rows) { const key = `${row.slot}|${row.geometry}|edge${row.boundaryDistance}|down${row.down}`; if (!cells.has(key)) cells.set(key, []); cells.get(key)!.push(row); }
const byContext = Object.fromEntries([...cells].map(([key, rs]) => [key, { n: rs.length, oob: rs.filter(r => r.outcome === 'oob').length,
  contactPlays: rs.filter(r => r.contacts > 0).length, meanYards: avg(rs.map(r => r.yards)), meanDuration: avg(rs.map(r => r.duration)) }]));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ sourceSha256: hash.digest('hex'), scriptSha256: createHash('sha256').update(readFileSync('scripts/sideline-lab.ts')).digest('hex'), reps,
  definitions: { yards: 'Dead-ball center relative to the artificial starting point; not official credited fumble yards.',
    scenario: 'Isolated carrier at +8 yards, 0.75/2/4 yards from sideline, velocity (6, ±1); LB head-on +7 yards, boundary force +5, glancing hit +2 after conversion, or clean -10. All other bodies parked/down. Controlled anatomy, not an NFL rate target.' }, byContext, rows }));
console.log(JSON.stringify(byContext, null, 2));
