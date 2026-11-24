// Tools 2026-11-24 (Integration, from the QB lane's 8% clean drops): the 'should obviously work' staged case. An uncovered receiver stands at (50, 26) facing the ball; no defender within 30 yd; the ball arrives
// at lateral offsets 0 / 0.3 / 0.6 / 0.9 yd and heights 1.4 / 1.9 / 2.4 yd (the QB lane's clean drops arrived 0.5-1.0 yd off at 1.4-2.4 yd). 30 seeds (real dice) per cell.
// Outcome per try: reach (the ball never comes into his reach: no attempt), caught clean (held at once), securing then secured, securing then lost (a drop), with the step that failed.
//   [HANDS_ON_ARMS=0 SECURE_SPLIT=0 SECURE_FACE_GEOM=0] node --import tsx scripts/diag/catch/clean_catch.mts   (flags read at load: run once per arm)
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { resolveCatchOpportunities, secureStep } from '../../../src/sim/catching.js';
import { PlaySim } from '../../../src/sim/playsim.js';
PlaySim.recordedSingleStream = true;
const OFFSETS = [0, 0.3, 0.6, 0.9], HEIGHTS = [1.4, 1.9, 2.4], SEEDS = 30;
const arm = `HANDS_ON_ARMS=${process.env.HANDS_ON_ARMS ?? 'default'} SECURE_SPLIT=${process.env.SECURE_SPLIT ?? 'default'} SECURE_FACE_GEOM=${process.env.SECURE_FACE_GEOM ?? 'default'}`;
console.log(`# ${arm}`);
console.log('| offset yd | height yd | caught (of 30) | no catch (a drop, or no attempt) | secured after securing | lost in securing | first failing event |'); console.log('|---|---|---|---|---|---|---|');
const total = { n: 0, caught: 0, none: 0, lost: 0 };
for (const dy of OFFSETS) for (const z of HEIGHTS) {
  let caught = 0, none = 0, secured = 0, lost = 0; const why: Record<string, number> = {};
  for (let seed = 1; seed <= SEEDS; seed++) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'), defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' }, los: 40, ballY: 26, firstDownX: 50, seed }) as any;
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    r.body.pos = { x: 50, y: 26 }; r.body.vel = { x: 0, y: 0 }; r.body.facing = Math.PI;
    const events: string[] = []; const ev0 = sim.event.bind(sim);
    sim.event = (type: string, a: any, b?: any, detail?: any) => { events.push(`${type}${detail ? ':' + detail : ''}`); return ev0(type, a, b, detail); };
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26 + dy, z: z }, 1.0);
    sim.t = 1.0;
    resolveCatchOpportunities(sim, { x: 48.4, y: 26 + dy, z }, { x: 50.3, y: 26 + dy, z });
    if (sim.ball.kind === 'held' && sim.ball.carrier === r) { caught++; continue; }
    const sec = (sim.ball as any).securing;
    if (!(sim.ball.kind === 'air' && sec?.receiver === r)) { none++; const e = events.find(x => /drop|tip|pbu/.test(x)) ?? 'no attempt (the ball never comes into his reach)'; why[e] = (why[e] ?? 0) + 1; continue; }
    let ended = false;
    for (let k = 0; k < 24; k++) { sim.t = 1.0 + 0.05 * (k + 1); secureStep(sim); if (!(sim.ball as any).securing) { ended = true; break; } }
    if (sim.ball.kind === 'held' && sim.ball.carrier === r) { secured++; caught++; }
    else if (!ended) { secured++; caught++; }
    else { lost++; const e = events.find(x => /drop|loose|fumble|strip|pbu/.test(x)) ?? 'ended with the ball not held'; why[e] = (why[e] ?? 0) + 1; }
  }
  total.n += SEEDS; total.caught += caught; total.none += none; total.lost += lost;
  console.log(`| ${dy} | ${z} | ${caught} | ${none} | ${secured} | ${lost} | ${Object.entries(why).map(([k, v]) => `${k} x${v}`).join('; ') || '-'} |`);
}
console.log(`\ntotal ${total.n}: caught ${total.caught} (${(100 * total.caught / total.n).toFixed(1)}%), no attempt ${total.none}, lost in securing ${total.lost}`);
