/**
 * Route features from the engine itself: the play is run with the called concept and formation, the ball held
 * and every defender parked out of play, so each receiver runs his installed route with his own release,
 * acceleration and cuts (RouteRunner, src/sim/route-motion.ts) and the quarterback takes his real drop. That is
 * the planned, observer-free schedule the design asks for (§6): what our routes do, not nominal numbers.
 */
import type { PassConcept, ReceiverRef } from '../types.js';
import type { Team } from '../../league/team.js';
import { pickDefense, pickOffense } from '../../league/team.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../defense.js';
import { FORMATION_BY_ID } from '../formations.js';
import { PlaySim } from '../../sim/playsim.js';
import { RouteRunner } from '../../sim/behaviors/receiver.js';
import type { RouteDescriptor } from './types.js';

const DT = 0.1, HORIZON = 4.0;
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

export interface Sampled { qbSetAt: number; routes: RouteDescriptor[]; excluded: Array<{ ref: string; why: string }> }

/** Heading in the strength frame: 0 downfield, +90 toward the strength, -90 toward the weak side. */
const heading = (dx: number, dy: number) => Math.atan2(dy, dx) * 180 / Math.PI;
const turn = (a: number, b: number) => Math.abs(((b - a + 540) % 360) - 180);

export function sampleRoutes(concept: PassConcept, formationId: string, flip: boolean, off: Team, def: Team): Sampled {
  const formation = FORMATION_BY_ID[formationId];
  const sim = new PlaySim({
    offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: concept, label: concept.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'none' },
    los: 40, ballY: 26.65, firstDownX: 50, seed: 1,
  });
  sim.throwBall = () => undefined;
  const park = () => sim.defense.forEach((d, i) => { d.body.pos = { x: sim.los + 60 + i * 2, y: 1 }; d.body.vel = { x: 0, y: 0 }; });
  park();
  const dir = sim.attackDir(sim.offense[0].team), ss = sim.offAlign.strongSign;
  const tick = sim as unknown as { tick(): void };
  const skill = sim.offense.filter((a) => a !== sim.qb && !OL.has(a.slot));
  const tr = new Map(skill.map((a) => [a, [] as Array<{ t: number; x: number; y: number; speed: number }>]));
  const route = new Map<typeof skill[number], string>();
  const qbTrack: Array<{ t: number; x: number; v: number }> = [];
  let next = 0;
  while (sim.phase === 'live' && sim.t <= HORIZON + 1e-9 && !sim.scrambleDrill) {
    tick.tick();
    park();
    if (sim.t + 1e-9 < next) continue;
    next += DT;
    for (const a of skill) {
      if (a.behavior instanceof RouteRunner && !route.has(a)) route.set(a, (a.behavior as unknown as { route: { id: string } }).route.id);
      tr.get(a)!.push({ t: +sim.t.toFixed(2), x: (a.pos.x - sim.los) * dir, y: (a.pos.y - sim.ballY) * ss, speed: Math.hypot(a.vel.x, a.vel.y) });
    }
    qbTrack.push({ t: sim.t, x: (sim.qb.pos.x - sim.los) * dir, v: Math.hypot(sim.qb.vel.x, sim.qb.vel.y) });
  }
  // The QB is set when he has given ground and stopped (the end of his drop).
  let deepest = 0, qbSetAt = HORIZON;
  for (const q of qbTrack) { deepest = Math.min(deepest, q.x); if (q.t > 0.4 && q.x <= deepest + 0.3 && q.v < 1.2) { qbSetAt = q.t; break; } }

  const routes: RouteDescriptor[] = [], excluded: Sampled['excluded'] = [];
  for (const a of skill) {
    const ref = sim.offAlign.refOf[a.slot as never] as ReceiverRef | undefined;
    const id = route.get(a);
    if (!ref) { excluded.push({ ref: a.slot, why: 'no receiver number' }); continue; }
    if (!id) { excluded.push({ ref, why: 'blocks (never ran a route in the horizon)' }); continue; }
    const P = tr.get(a)!;
    const start = P[0];
    // The planned break: the heading turns more than 35 deg over 0.3 s at speed, or he settles (slows below 55%).
    let breakT: number | null = null, breakAt: { x: number; y: number } | null = null;
    for (let i = 3; i + 3 < P.length; i++) {
      const s0 = Math.hypot(P[i].x - P[i - 3].x, P[i].y - P[i - 3].y) / 0.3, s1 = Math.hypot(P[i + 3].x - P[i].x, P[i + 3].y - P[i].y) / 0.3;
      if (s0 < 2.5 || P[i].t < 0.3) continue;
      const h0 = heading(P[i].x - P[i - 3].x, P[i].y - P[i - 3].y), h1 = heading(P[i + 3].x - P[i].x, P[i + 3].y - P[i].y);
      if (turn(h0, h1) > 35 || s1 < 0.55 * s0) { breakT = P[i].t; breakAt = { x: P[i].x, y: P[i].y }; break; }
    }
    const isBack = ref === 'B' || ref === 'B2';
    const side: 'S' | 'W' | 'B' = isBack ? 'B' : ref[0] as 'S' | 'W';
    const at = (t: number) => P[Math.min(P.length - 1, Math.max(0, Math.round(t / DT) - Math.round(P[0].t / DT)))];
    // Ready: his route has shown its answer (the break, or 12 yd of a vertical) and the QB can throw (set, less a beat).
    const vertical = breakT === null ? P.find((p) => p.x >= 12)?.t ?? null : null;
    const declared = breakT !== null ? breakT + 0.1 : vertical ?? HORIZON;
    const ready = Math.max(qbSetAt - 0.15, declared);
    const settles = P.length > 3 && P[P.length - 1].speed < 1.5;
    const last = settles ? Math.min(HORIZON, ready + 1.2) : Math.min(HORIZON, ready + 1.6);
    const yEnd = P[P.length - 1].y;
    routes.push({
      ref, slot: a.slot, routeId: id, startDepth: -start.x, startWidth: start.y, side, family: id,
      trajectory: P, breakT, breakAt,
      window: { ready: +ready.toFixed(2), best: +Math.min(last, ready + 0.25).toFixed(2), last: +last.toFixed(2) },
      depthAtReady: +at(ready).x.toFixed(1), crossesField: Math.sign(yEnd) !== Math.sign(start.y) && Math.abs(yEnd - start.y) > 8,
      isBack,
    });
  }
  return { qbSetAt: +qbSetAt.toFixed(2), routes, excluded };
}
