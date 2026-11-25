/** HANDS_SEEN (src/sim/ball-estimate.ts, catching.ts facingBall): a defender plays the ball with his hands only on his own
 * sight of it, which the play builds tick by tick (the ball in his head's cone for his reaction time). Staged scenes that
 * resolve a catch window directly, with a defender the scene says is looking at or facing the ball, give him that sight
 * here: his head on the ball, sensed half a second before the window and at it. Nothing is done with the flag off. */
export function stageSight(sim: any, a: any): void {
  if (process.env.HANDS_SEEN !== '1' || !sim.ballEstimates || sim.ball?.kind !== 'air' || a.team !== 'D') return;
  const b = sim.ball.flight.pos;
  a.head = Math.atan2(b.y - a.pos.y, b.x - a.pos.x);
  const t = sim.t;
  sim.t = t - 0.5; sim.ballEstimates.sense(sim);
  sim.t = t; sim.ballEstimates.sense(sim);
}
