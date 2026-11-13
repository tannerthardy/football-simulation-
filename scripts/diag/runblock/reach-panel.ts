/** Four-scenario reach panel: one guard on a wide-zone reach against a
 * play-side shaded tackle whose feet are scripted, so only the blocker's
 * production controller (stepRunRep, stretch path) and the World decide.
 *   anchor:    square, resists (requests no motion, leans in)
 *   flow:      runs play side to stay outside
 *   slant:     crosses the blocker's inside (backside) shoulder
 *   penetrate: explodes upfield
 * plus a drive-block control (inside zone, anchoring tackle). Mirrored sides
 * and two entry speeds. Observation only; no shed attempts (QB held deep).
 * node --import tsx scripts/diag/runblock/reach-panel.ts
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { norm } from '../../../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import type { Intent } from '../../../src/physics/world.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { updateEngagements } from '../../../src/sim/engagement.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const TRACE = process.env.TRACE;
type Scenario = 'anchor' | 'flow' | 'slant' | 'penetrate';
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

function rep(scenario: Scenario, flip: boolean, entry: number, runId = 'wz_strong') {
  const run = RUN_BY_ID[runId];
  const sim = new PlaySim({ offense: pickOffense(offense, FORMATION_BY_ID.ace_11.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run, label: runId },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
  const ps = playSideSign(sim, run);
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  sim.t = 1; sim.world.time = 1;
  const B = sim.slot('RG')!, D = sim.slot('DT_W')!;
  B.body.pos = { x: 40, y: CENTER_Y }; B.body.facing = 0;
  D.body.pos = { x: 40.82, y: CENTER_Y + ps * .35 }; D.body.facing = Math.PI;
  const want = { anchor: { x: 0, y: 0 }, flow: { x: 0, y: ps * 4 }, slant: { x: -2.2, y: -ps * 2.6 }, penetrate: { x: -4, y: 0 } }[scenario];
  const ws = Math.hypot(want.x, want.y);
  D.body.vel = ws > 0 ? { x: want.x / ws * entry, y: want.y / ws * entry } : { x: 0, y: 0 };
  sim.qb.body.pos = { x: 33, y: CENTER_Y };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const stretch = run.scheme === 'wideZone' || run.scheme === 'outsideZone';
  const e = sim.engage(B, D, 'run', stretch ? norm({ x: 1, y: ps * 1.8 }) : norm({ x: 1, y: 0 }));
  if (!e) throw new Error('no engagement');
  if (stretch) { e.surfaceAxis = { x: -1, y: 0 }; e.sealTarget = ps * .5; }
  e.nextMoveAt = Infinity;
  const x0 = { b: { ...B.pos }, d: { ...D.pos } };
  const out: Record<string, number | string> = {};
  let ended = '', reqPlay = 0, n = 0;
  const seen = sim.events.length;
  for (let k = 0; k < 30; k++) {
    const intents: Intent[] = sim.agents.map((a) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    if (B.engagement) updateEngagements(sim, intents);
    else intents[B.idx] = { vel: { x: 0, y: ps * 2 }, facing: B.facing };
    intents[D.idx] = { ...intents[D.idx], vel: want, facing: Math.atan2(B.pos.y - D.pos.y, B.pos.x - D.pos.x), push: 1, posture: .85 };
    reqPlay += (intents[B.idx].vel.y) * ps; n++;
    if (TRACE === `${scenario}:${entry}:${runId}` && !flip && k % 2 === 0) {
      const sb = B.body.support!, sd = D.body.support!;
      console.log(`  t ${(sim.t - 1).toFixed(2)} B req (${f(intents[B.idx].vel.x)},${f(intents[B.idx].vel.y * ps)}) vel (${f(B.vel.x)},${f(B.vel.y * ps)}) lean ${f(Math.hypot(sb.lean.x, sb.lean.y))} felt ${f(sb.felt.x)} posture ${sb.posture.toFixed(2)} xi ${f(Math.hypot(sb.xi.x, sb.xi.y))} | D vel (${f(D.vel.x)},${f(D.vel.y * ps)}) lean ${f(Math.hypot(sd.lean.x, sd.lean.y))} posture ${sd.posture.toFixed(2)} | sep ${Math.hypot(B.pos.x - D.pos.x, B.pos.y - D.pos.y).toFixed(2)} | mass B ${B.profile.massKg.toFixed(0)} D ${D.profile.massKg.toFixed(0)}`);
    }
    sim.world.step(intents, sim.dt); sim.t += sim.dt; sim.world.time = sim.t;
    sim.perception.record(sim.agents);
    if (!ended && !B.engagement) ended = `${(sim.t - 1).toFixed(2)}s ${sim.events.slice(seen).filter((v) => ['shed', 'beat', 'disengage'].includes(v.type as string)).map((v) => v.note ?? v.type).join('/') || 'apart'}`;
    for (const tt of [.5, 1.0, 1.5]) if (Math.abs(sim.t - 1 - tt) < 1e-6) {
      out[`dLat${tt}`] = (D.pos.y - x0.d.y) * ps;
      out[`dPen${tt}`] = -(D.pos.x - x0.d.x);
      out[`across${tt}`] = (B.pos.y - D.pos.y) * ps;
    }
  }
  return { ...out, ended: ended || 'held', reqPlay: reqPlay / n, downB: B.body.support?.state !== 'up', downD: D.body.support?.state !== 'up' };
}

const f = (x: unknown) => typeof x === 'number' ? ((x >= 0 ? '+' : '') + x.toFixed(2)) : String(x);
console.log('defender lateral (play side +) / penetration (into backfield +) / blocker across (play side of him +), at 0.5 1.0 1.5 s; blocker mean play-side request; how the rep ended');
for (const [label, scenario, runId] of [['anchor', 'anchor', 'wz_strong'], ['flow', 'flow', 'wz_strong'], ['slant', 'slant', 'wz_strong'],
  ['penetrate', 'penetrate', 'wz_strong'], ['control: drive vs anchor (iz)', 'anchor', 'iz_strong']] as [string, Scenario, string][]) {
  for (const entry of [0, 2]) for (const flip of [false, true]) {
    const r = rep(scenario, flip, entry, runId) as Record<string, unknown>;
    console.log(`${label.padEnd(30)} entry ${entry} ${flip ? 'mirror' : 'normal'} | lat ${[.5, 1, 1.5].map((t) => f(r[`dLat${t}`])).join(' ')} | pen ${[.5, 1, 1.5].map((t) => f(r[`dPen${t}`])).join(' ')} | across ${[.5, 1, 1.5].map((t) => f(r[`across${t}`])).join(' ')} | req ${f(r.reqPlay)} | ${r.ended}${r.downB ? ' B down' : ''}${r.downD ? ' D down' : ''}`);
  }
}
