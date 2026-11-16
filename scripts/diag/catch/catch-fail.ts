// Why open, in-reach staged throws fail: wraps paired-throws.ts and logs, per catch event on the target ('secure',
// 'catch', 'drop', 'miss', 'pbu'), his speed, the ball's height and speed, the ball's angle from his line of run and from
// his shoulders, the ball's offset from his chest, his first sample's age, and the hands rating. Interleaved on stdout as #EV lines (each before its row).
// usage: [flags] npx tsx scripts/diag/catch/catch-fail.ts SEEDS > out.txt
import { PlaySim } from '../../../src/sim/playsim.js';
import { shouldersOf } from '../../../src/physics/kinematics.js';
import { lastClosure } from '../../../src/sim/catching.js';
const P: any = PlaySim.prototype, ev0 = P.event;
P.event = function (type: string, a?: any, b?: any, note?: string) {
  if (['secure', 'catch', 'drop', 'miss', 'pbu'].includes(type) && this.ball?.kind === 'air' && (a === this.ball.target || b === this.ball.target)) {
    const R = this.ball.target, f = this.ball.flight, bv = f.vel, bs = Math.hypot(bv.x, bv.y) || 1, rs = Math.hypot(R.vel.x, R.vel.y);
    const ang = (h: number) => Math.round(Math.acos(Math.max(-1, Math.min(1, -(Math.cos(h) * bv.x + Math.sin(h) * bv.y) / bs))) * 180 / Math.PI);
    const sh = shouldersOf(R.body), dx = f.pos.x - R.pos.x, dy = f.pos.y - R.pos.y;
    const E = this.ballEstimates, first = E?.firstSampleOf?.(R);
    process.stdout.write('#EV ' + JSON.stringify({ type, note, t: +(this.t - this.ball.releaseT).toFixed(2), rs: +rs.toFixed(1), z: +f.pos.z.toFixed(2), bs: +Math.hypot(bv.x, bv.y, bv.z).toFixed(1),
      faceRun: rs > 1 ? ang(Math.atan2(R.vel.y, R.vel.x)) : null, faceSh: ang(sh), off: +Math.hypot(dx, dy).toFixed(2), samples: E?.samplesOf?.(R) ?? null, first, close: lastClosure.get(R), hands: +R.r('hands').toFixed(2) }) + '\n');
  }
  return ev0.call(this, type, a, b, note);
};
await import('./paired-throws.js');
