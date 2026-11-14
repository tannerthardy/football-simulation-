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
import { stand } from '../../sim/behaviors/common.js';
import type { RouteDescriptor } from './types.js';
import { ROUTES } from '../routes.js';

/** CROSS_OVER (routes.ts): the over climbs across on a diagonal without a sharp cut, so it declares as the comment
 * below says a crosser does (5 yd from his start, the line crossed), not as a vertical at 12 yd. Off, unchanged. */
const CROSS_OVER = process.env.CROSS_OVER === '1';
/** ROUTE_FILLET (src/sim/route-motion.ts): read here only for the crosser's declare. */
const ROUTE_FILLET_ON = process.env.ROUTE_FILLET === '1';
/** SCREEN_DECLARE (experimental, off): a screen's receiver has shown his answer when he turns back to the catch point
 * (the break), not when he has moved 5 yd past the line, which a screen behind the line may never do in the horizon. Off,
 * the tunnel's S1 window came from the fallback (no `moved`, so break + 0.1 = 1.3 s), and running him 0.1 yd/s faster
 * upfield at the end (ROUTE_EFFORT) crossed +0.5 at 3.9 s and declared him at 4.1 s. With the flag a route in a screen
 * concept that has a break declares on it, ahead of `moved`. The screen QB's own throw timing (SCREEN_QB) does not read
 * these windows. */
const SCREEN_DECLARE = process.env.SCREEN_DECLARE === '1';

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
  let next = 0, frozen = false, qx0: number | null = null, qDeep = Infinity;
  while (sim.phase === 'live' && sim.t <= HORIZON + 1e-9 && !sim.scrambleDrill) {
    tick.tick();
    park();
    // Once set, the quarterback stays in his spot holding the ball, so every route runs its full course
    // (unpressured and unable to throw, he would otherwise leave the pocket and start the scramble drill).
    const qx = (sim.qb.pos.x - sim.los) * dir;
    qx0 ??= qx; qDeep = Math.min(qDeep, qx);
    if (!frozen && qx0 - qDeep >= 1 && Math.hypot(sim.qb.vel.x, sim.qb.vel.y) < 1.2) {
      frozen = true;
      sim.qb.behavior = { kind: 'qb-hold', update: () => stand(0) } as unknown as typeof sim.qb.behavior;
    }
    if (sim.t + 1e-9 < next) continue;
    next += DT;
    for (const a of skill) {
      if (a.behavior instanceof RouteRunner && !route.has(a)) route.set(a, (a.behavior as unknown as { route: { id: string } }).route.id);
      tr.get(a)!.push({ t: +sim.t.toFixed(2), x: (a.pos.x - sim.los) * dir, y: (a.pos.y - sim.ballY) * ss, speed: Math.hypot(a.vel.x, a.vel.y) });
    }
    qbTrack.push({ t: sim.t, x: (sim.qb.pos.x - sim.los) * dir, v: Math.hypot(sim.qb.vel.x, sim.qb.vel.y) });
  }
  // The QB is set when he has given ground (a yard or more from where he took the snap) and stopped.
  const x0 = qbTrack[0]?.x ?? 0;
  let deepest = x0, qbSetAt = HORIZON, dropped = false;
  for (const q of qbTrack) {
    deepest = Math.min(deepest, q.x);
    if (x0 - deepest >= 1) dropped = true;
    if (dropped && q.x <= deepest + 0.4 && q.v < 1.2) { qbSetAt = q.t; break; }
  }

  const routes: RouteDescriptor[] = [], excluded: Sampled['excluded'] = [];
  for (const a of skill) {
    const ref = sim.offAlign.refOf[a.slot as never] as ReceiverRef | undefined;
    const id = route.get(a);
    if (!ref) { excluded.push({ ref: a.slot, why: 'no receiver number' }); continue; }
    if (!id) { excluded.push({ ref, why: 'blocks (never ran a route in the horizon)' }); continue; }
    const P = tr.get(a)!;
    const start = P[0];
    // The planned break, against his own stem: the first point where his heading over the next 0.5 s is more
    // than 30 deg off the stem's heading (so a rounded bend counts as well as a cut), placed back at the point
    // where the bend began (8 deg); or a settle (slowing below 55% of his stem speed). From 0.5 s on.
    let breakT: number | null = null, breakAt: { x: number; y: number } | null = null;
    const k0 = Math.min(P.length - 1, 5);
    for (let i = k0 + 3; i + 5 < P.length; i++) {
      const stemLen = Math.hypot(P[i].x - P[k0].x, P[i].y - P[k0].y);
      if (stemLen < 1.5) continue;
      const hs = heading(P[i].x - P[k0].x, P[i].y - P[k0].y), hn = heading(P[i + 5].x - P[i].x, P[i + 5].y - P[i].y);
      const s0 = stemLen / (P[i].t - P[k0].t), s1 = Math.hypot(P[i + 5].x - P[i].x, P[i + 5].y - P[i].y) / 0.5;
      if (turn(hs, hn) > 30 || (s1 < 0.55 * s0 && s0 > 2.5)) {
        let k = i;
        while (k > k0 + 3 && turn(hs, heading(P[k + 3].x - P[k].x, P[k + 3].y - P[k].y)) > 8) k--;
        breakT = P[k].t; breakAt = { x: P[k].x, y: P[k].y }; break;
      }
    }
    const isBack = ref === 'B' || ref === 'B2';
    const side: 'S' | 'W' | 'B' = isBack ? 'B' : ref[0] as 'S' | 'W';
    const at = (t: number) => P[Math.min(P.length - 1, Math.max(0, Math.round(t / DT) - Math.round(P[0].t / DT)))];
    // Ready: his route has shown its answer (the break, or 12 yd of a vertical) and the QB can throw (set, less a beat).
    // Declared: his break; or 12 yd of a vertical; or, for a route that bends without a sharp cut (a flat, a
    // back's release, a crosser), 5 yd from his start with the line crossed (a back need not cross it).
    const vertical = breakT === null ? P.find((p) => p.x >= 12)?.t ?? null : null;
    // A back's release (swing, flat, angle) is a throw behind or at the line, so it need not cross it.
    const moved = P.find((p) => Math.hypot(p.x - start.x, p.y - start.y) >= 5 && (p.x >= 0.5 || ref === 'B' || ref === 'B2'))?.t ?? null;
    // A stem that is mostly lateral (a flat, a swing, an angle's first step) declares by moving, not by a break.
    const p10 = P[Math.min(P.length - 1, 10)];
    const lateralStem = Math.abs(p10.y - start.y) > Math.abs(p10.x - start.x);
    // ROUTE_FILLET leads a crosser's bends, so a rolled cross shows no 30 deg turn either: it declares the same way.
    const crosser = (CROSS_OVER || ROUTE_FILLET_ON) && !!id && ROUTES[id]?.family === 'cross';
    const screenTurn = SCREEN_DECLARE && concept.family === 'screen' && breakT !== null;
    const declared = screenTurn ? breakT! + 0.1
      : (lateralStem || (crosser && breakT === null)) && moved !== null ? moved + 0.2
      : breakT !== null ? breakT + 0.1 : vertical !== null ? vertical : moved !== null ? moved + 0.2 : HORIZON;
    const ready = Math.max(qbSetAt - 0.15, declared);
    const settles = P.length > 3 && P[P.length - 1].speed < 1.5;
    const last = settles ? Math.min(HORIZON, ready + 1.2) : Math.min(HORIZON, ready + 1.6);
    const yEnd = P[P.length - 1].y;
    routes.push({
      ref, slot: a.slot, routeId: id, startDepth: -start.x, startWidth: start.y, side, family: id,
      trajectory: P, breakT, breakAt,
      window: { ready: +ready.toFixed(2), best: +Math.min(last, ready + 0.25).toFixed(2), last: +last.toFixed(2) },
      depthAtReady: +at(ready).x.toFixed(1), crossesField: Math.sign(yEnd) !== Math.sign(start.y) && Math.abs(yEnd - start.y) > 8,
      isBack, settles,
    });
  }
  return { qbSetAt: +qbSetAt.toFixed(2), routes, excluded };
}
