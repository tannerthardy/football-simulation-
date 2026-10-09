/** Fixed calls, fronts, rosters and seeds; no tuning to the full-game average.
 * node --import tsx scripts/coverage-lab.ts [reps=8] [output=out/coverage.json]
 * Copy this script unchanged into an archived revision to obtain paired evidence.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Vec2 } from '../src/core/vec.js';

const reps = Number(process.argv[2] ?? 8);
const output = process.argv[3] ?? 'out/coverage.json';
if (!Number.isInteger(reps) || reps < 1) throw new Error('reps must be a positive integer');
const rosterSeeds = [7, 19, 31];
const forms = ['gun_doubles_11', 'gun_trips_11'];
const concepts = ['slant_flat', 'quick_outs', 'curl_flat', 'mesh', 'four_verts', 'dagger'];
const covers = process.argv[4]?.split(',') ?? ['cover0', 'cover1', 'cover2man', 'cover2:match', 'cover2:spot', 'cover3:match', 'cover3:spot', 'cover4', 'cover6'];
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
const hash = createHash('sha256');
for (const file of files('src')) hash.update(file).update('\0').update(readFileSync(file)).update('\0');
const sourceSha256 = hash.digest('hex');
type Snapshot = { separation: number; nearest: string; defenders: Array<{ slot: string; job: string; zone?: string; target?: string; dx: number; dy: number; vx: number; vy: number; facing: number }> };
function snapshot(sim: PlaySim, r: Agent): Snapshot {
  let separation = Infinity, nearest = '';
  const defenders = sim.defense.map(d => {
    const dx = d.pos.x - r.pos.x, dy = d.pos.y - r.pos.y;
    if (Math.hypot(dx, dy) < separation) { separation = Math.hypot(dx, dy); nearest = d.slot; }
    const b = d.behavior;
    return { slot: d.slot, job: b instanceof CoverageDefender ? b.job : b.kind, zone: b instanceof ZoneCoverage || b instanceof CoverageDefender ? b.zone : undefined,
      target: b instanceof ManCoverage || b instanceof ZoneCoverage || b instanceof CoverageDefender ? b.target?.slot : undefined,
      dx, dy, vx: d.vel.x, vy: d.vel.y, facing: d.body.facing };
  });
  return { separation, nearest, defenders };
}
const plays: Array<{ roster: number; formation: string; flip: boolean; concept: string; coverage: string; rep: number; seed: number;
  target?: string; route?: string; throw?: Snapshot; catch?: Snapshot; throwT?: number; catchT?: number; catchDepth?: number;
  attempted: boolean; completed: boolean; sacked: boolean; scramble: boolean; intercepted: boolean; yards: number; yac?: number;
  opportunitySeparation?: number; trace?: Array<{ t: number; receiver: Vec2; snapshot: Snapshot }> }> = [];
for (const roster of rosterSeeds) {
  const lr = new Rng(roster);
  const ot = generateTeam(lr.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const dt = generateTeam(lr.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
  for (const formationId of forms) for (const flip of [false, true]) for (const concept of concepts) for (const coverage of covers) for (let rep = 0; rep < reps; rep++) {
    const [coverId, style = 'match'] = coverage.split(':');
    const formation = FORMATION_BY_ID[formationId];
    const seed = lr.fork(`${formationId}:${flip}:${concept}:${coverage}:${rep}`).nextU32();
    const sim = new PlaySim({ offense: pickOffense(ot, formation.personnel), defense: pickDefense(dt, 'nickel'),
      offCall: { formation, flip, kind: 'pass', pass: PASS_BY_ID[concept], label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverId], pressure: null, zoneStyle: style as 'match' | 'spot', label: '' },
      los: 40, ballY: HASH_LEFT_Y, firstDownX: 50, seed, down: 1 });
    const routes = new Map(sim.offense.map(r => [r, r.behavior instanceof RouteRunner ? r.behavior.route.id : r.behavior.kind]));
    let atThrow: Snapshot | undefined, atCatch: Snapshot | undefined, route: string | undefined, target: string | undefined;
    let catchDepth: number | undefined;
    // A predetermined receiver on rep 0, selected before any outcome is known.
    const traced = sim.offense.find(r => r.slot === 'X');
    const trace: Array<{ t: number; receiver: Vec2; snapshot: Snapshot }> | undefined = rep === 0 && roster === rosterSeeds[0] ? [] : undefined;
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      if (!atThrow && sim.ball.kind === 'air' && sim.ball.target) {
        const r = sim.ball.target;
        atThrow = snapshot(sim, r); target = r.slot;
        route = routes.get(r);
      }
      if (!atCatch && sim.catchAt >= 0) {
        const r = sim.offense.find(r => r.player.id === sim.stats.receiver);
        if (r) { atCatch = snapshot(sim, r); catchDepth = sim.catchX - sim.los; }
      }
      if (trace && traced && sim.t <= 4 && Math.abs(sim.t * 2 - Math.round(sim.t * 2)) < 1e-6)
        trace.push({ t: sim.t, receiver: { ...traced.pos }, snapshot: snapshot(sim, traced) });
    }
    const result = sim.run();
    const st = result.stats;
    plays.push({ roster, formation: formationId, flip, concept, coverage, rep, seed, target, route, throw: atThrow, catch: atCatch,
      throwT: sim.throwAt >= 0 ? sim.throwAt : undefined, catchT: sim.catchAt >= 0 ? sim.catchAt : undefined, catchDepth,
      attempted: st.attempted, completed: st.completed, sacked: st.sacked, scramble: st.scramble, intercepted: !!st.interceptedBy,
      yards: result.offenseYards, yac: st.yac, opportunitySeparation: st.separation, trace });
  }
}
function summary(ps: typeof plays) {
  const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const attempts = ps.filter(p => p.attempted), completions = ps.filter(p => p.completed && !p.intercepted);
  const throws = ps.flatMap(p => p.throw ? [p.throw.separation] : []);
  const opportunities = ps.flatMap(p => p.opportunitySeparation === undefined ? [] : [p.opportunitySeparation]);
  const catches = ps.flatMap(p => p.catch ? [p.catch.separation] : []);
  return { n: ps.length, attempts: attempts.length, completions: completions.length, sacks: ps.filter(p => p.sacked).length,
    interceptions: ps.filter(p => p.intercepted).length, scrambles: ps.filter(p => p.scramble).length,
    throwSeparationN: throws.length, throwSeparation: avg(throws), opportunitySeparationN: opportunities.length, opportunitySeparation: avg(opportunities),
    tightOpportunityPct: opportunities.length ? 100 * opportunities.filter(s => s < 1).length / opportunities.length : null,
    catchSeparationN: catches.length, catchSeparation: avg(catches), yardsPerCompletion: avg(completions.map(p => p.yards)),
    yac: avg(completions.flatMap(p => p.yac === undefined ? [] : [p.yac])), catchDepth: avg(completions.flatMap(p => p.catchDepth === undefined ? [] : [p.catchDepth])),
    explosiveAttemptsPct: attempts.length ? 100 * completions.filter(p => p.yards >= 20).length / attempts.length : null };
}
const groups = (key: (p: typeof plays[number]) => string) => {
  const cells = new Map<string, typeof plays>();
  for (const p of plays) { const k = key(p); if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(p); }
  return Object.fromEntries([...cells].map(([k, ps]) => [k, summary(ps)]));
};
const result = { sourceSha256, scriptSha256: createHash('sha256').update(readFileSync('scripts/coverage-lab.ts')).digest('hex'),
  setup: { reps, rosterSeeds, forms, concepts, covers, front: 'over', personnel: 'nickel', los: 40, ballY: HASH_LEFT_Y, down: 1, distance: 10 },
  definitions: { throw: 'First post-integration tick with a targeted pass in flight; nearest defender center distance.',
    catch: 'First post-integration tick after an offensive catch, before subsequent carrier movement.',
    opportunity: 'Engine catch-contest separation (includes catchable incompletions; missing on off-target/deflected passes).',
    trace: 'X receiver every 0.5 seconds through 4 seconds, rep 0 / roster seed 7, selected before outcomes.' },
  overall: summary(plays), byCoverage: groups(p => p.coverage), byConcept: groups(p => p.concept),
  byCoverageRoute: groups(p => `${p.coverage}|${p.route ?? 'no-target'}`), byRoster: groups(p => String(p.roster)), plays };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result));
console.log(JSON.stringify({ overall: result.overall, byCoverage: result.byCoverage }, null, 2));
