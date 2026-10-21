/** Debug one approach-tackle scenario tick by tick (development aid). */
import { CENTER_Y } from '../../src/core/field.js';
import { approachTackle } from '../../src/lab/scenarios.js';
import { PlaySim } from '../../src/sim/playsim.js';
// Wrap tick to report the momentum residual per tick for the two players.
const orig = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: PlaySim) {
  const c = this.slot('Z')!, d = this.slot('FS')!;
  const px = c.profile.massKg * c.vel.x + d.profile.massKg * d.vel.x, py = c.profile.massKg * c.vel.y + d.profile.massKg * d.vel.y;
  const t = this.t, phase = this.phase;
  orig.call(this);
  const r = this.lastStep!;
  const gx = r.groundImpulse[c.idx].x + r.groundImpulse[d.idx].x, gy = r.groundImpulse[c.idx].y + r.groundImpulse[d.idx].y;
  const qx = c.profile.massKg * c.vel.x + d.profile.massKg * d.vel.x, qy = c.profile.massKg * c.vel.y + d.profile.massKg * d.vel.y;
  const err = Math.hypot(qx - px - gx, qy - py - gy);
  const ev = this.events.filter((e) => e.t >= t - 1e-9 && e.type !== 'read').map((e) => e.type + (e.note ? `(${e.note})` : '')).join(' ');
  console.log(`${t.toFixed(2)} ${phase}->${this.phase} err ${err.toFixed(2)} c(${c.pos.x.toFixed(2)},${(c.pos.y - CENTER_Y).toFixed(2)} v${c.vel.x.toFixed(2)},${c.vel.y.toFixed(2)} ${c.body.support!.state}) d(${d.pos.x.toFixed(2)},${(d.pos.y - CENTER_Y).toFixed(2)} v${d.vel.x.toFixed(2)},${d.vel.y.toFixed(2)} ${d.body.support!.state}) ${ev}`);
};
const side = Number(process.argv[2] ?? 1) as 1 | -1;
const r = approachTackle({ side, bearing: Number(process.argv[3] ?? 30), speed: Number(process.argv[4] ?? 4) });
console.log(JSON.stringify({ tackled: r.tackled, time: r.time, err: r.momentumError }));
