import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { plannedFakeEnd } from './called-drop.js';

/** Play-action run look, ended by what happens to the lineman rather than a
 * clock (PUNCH; the owner's request, 2026-11-12). The playbook has one
 * generic play-action protection today: a `fake` on the concept, no
 * protection type (aggressive run-action, boot, gap fake with a puller, plain
 * set). Those types are Rules+Coaching's concept queue; this is only the
 * transition. On a fake a lineman shows run -- low pads, firing out, hands on
 * his pass-pro man -- until: he has engaged his man; he has reached his depth
 * limit (a yard past the line); his man has declared a pass rush (seen in the
 * backfield, half a yard past the line, coming on); or he stops selling
 * (stands up), which a poor seller does early: his patience is his discipline
 * (0.35 s at none to 1.0 s at full). Off (PUNCH off), every lineman showed
 * low pads for 0.35 s and the interior held at the line for 0.35 s. */
const lookOver = new WeakMap<PlaySim, Set<Agent>>();

export function paRunLook(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  if (sim.offCall.kind !== 'pass' || !sim.offCall.pass?.fake) return false;
  let over = lookOver.get(sim);
  if (!over) { over = new Set(); lookOver.set(sim, over); }
  if (over.has(a)) return false;
  const dir = sim.attackDir(a.team);
  let end = !!a.engagement || (a.pos.x - sim.los) * dir > 1.0 || sim.t > 0.35 + 0.65 * a.r('discipline');
  if (!end && man) {
    const seen = sim.see(a, man);
    end = (sim.los - seen.pos.x) * dir > 0.5 && -seen.vel.x * dir > 1.0;
  }
  if (end) over.add(a);
  return !end;
}

/** PA_HINGE (experimental, off; PA_HINGE=1; Integration, 2026-11-16, Rules' sourced install): on a zone run fake the
 * line shows the zone it fakes. "All the offensive linemen step and reach play-side ... and have the backside offensive
 * tackle or tight-end (whoever is the end man on the backside of your offensive line) hinge" (Youth Football Online,
 * pass protection fundamentals; the instruction is a checked page, the hinge's footwork is not: pages give the hinge only as
 * the backside gate on runs, so the steps here are that gate). Until the fake's end (the back's mesh: called-drop.ts plannedFakeEnd, which the back, the QB and the line share) every lineman takes
 * his reach steps to the fake's side, staying on the line, and the backside end man hinges (a step to the fake's side and
 * back, opening his backside shoulder); then each converts to his protection (whom he has, from the call), one committed
 * switch at the fake's end. The steps are the set step the line already uses (0.45 yd). Gun and under centre alike: the
 * run look is the scheme's, not the QB's alignment. Off, the edge tackles kicked from the snap on every PA play (a pass
 * read for the ends: NFL gun PA ends, the fake side's 0.36 / 1.45 / 2.43 and the away side's 0.25 / 1.32 / 2.06 yd past the
 * line at 1.0 / 1.5 / 2.0 s against about 1.15 / 3.1 / 4.8 on dropbacks; ours, DE_W the fake-side end in gun_doubles_11,
 * ran the dropback path; nfl_pa_backside.py, pa-backside-trace.mts). The boot and
 * the aggressive fire-out are not part of it (unsourced as pages / a separate design item). */
export const PA_HINGE = process.env.PA_HINGE !== '0';
/** The zone fakes the hinge protection belongs to. */
const ZONE_FAKES = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone']);
/** PA_HINGE: the call's fake side (+1 / -1 in field y) for this play, set at install. */
export const paFakeSide = new WeakMap<PlaySim, number>();
/** PA_HINGE: one set step (yd). */
const STEP = 0.45;
/** PA_HINGE: his steps are done when his body is this close to the spot (yd). */
const STEP_DONE = 0.2;
/** PA_HINGE: the linemen (agent idx) whose steps are done this play. */
const stepsDone = new WeakMap<PlaySim, Set<number>>();
/** PA_HINGE: where this lineman's run-look steps put him, or null once his steps are done (or no zone fake).
 * `homeY` is his alignment; `snapX` his stance at the snap; `endMan` whether he is the backside end man; `idx` / `pos`
 * his own body. His look ends when his own steps are done (his body within STEP_DONE of the spot: he knows where his
 * feet are), latched, and never later than the fake's end. Attempt 2 (Integration, 2026-11-16): attempt 1 held the look
 * until plannedFakeEnd, and with QB_FOOTWORK bit 16's measured mesh (gun 1.45 s) the line set too late: PA sacks 25 -> 285
 * on the QB lane's grid, the fake-side end unengaged on 114 of 192 pa_post_dig plays. The install teaches the steps,
 * then the set; the look is not held through the mesh. */
export function paHingeSpot(sim: PlaySim, homeY: number, snapX: number, endMan: boolean, idx: number, pos: { x: number; y: number }): { x: number; y: number; facing: number } | null {
  if (!PA_HINGE || sim.offCall.kind !== 'pass' || !ZONE_FAKES.has(sim.offCall.pass?.fake ?? '') || sim.t >= plannedFakeEnd(sim.offCall.formation.qb !== 'under')) return null;
  const side = paFakeSide.get(sim); if (!side) return null;
  const dir = sim.attackDir(sim.offense[0].team);
  let done = stepsDone.get(sim); if (!done) stepsDone.set(sim, done = new Set());
  if (done.has(idx)) return null;
  const spot = endMan ? { x: snapX - dir * 2 * STEP, y: homeY + side * STEP, facing: Math.atan2(side, dir) }
    : { x: snapX, y: homeY + side * 2 * STEP, facing: Math.atan2(side * 0.5, dir) };
  if (Math.hypot(pos.x - spot.x, pos.y - spot.y) <= STEP_DONE) { done.add(idx); return null; }
  return spot;
}
