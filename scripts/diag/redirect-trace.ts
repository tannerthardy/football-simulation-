/** Redirect scenario traced at two substep counts side by side (development aid). */
import { redirect } from '../../src/lab/scenarios.js';
import { PlaySim } from '../../src/sim/playsim.js';
const rows: Record<number, string[]> = {};
let current = 0;
const orig = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: PlaySim) {
  orig.call(this);
  const b = this.slot('RT')!, d = this.slot('DE_S')!;
  const e = d.engagement;
  const sb = b.body.support!, sd = d.body.support!;
  (rows[current] ??= []).push(`${this.t.toFixed(2)} B(${b.pos.x.toFixed(2)},${b.pos.y.toFixed(2)} v${b.vel.x.toFixed(2)},${b.vel.y.toFixed(2)} L${Math.hypot(sb.lean.x, sb.lean.y).toFixed(0)} xi${Math.hypot(sb.xi.x, sb.xi.y).toFixed(2)}) D(${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)} v${d.vel.x.toFixed(2)},${d.vel.y.toFixed(2)} L${Math.hypot(sd.lean.x, sd.lean.y).toFixed(0)} xi${Math.hypot(sd.xi.x, sd.xi.y).toFixed(2)}) ${e ? `phi${e.phi.toFixed(2)} N${(e.hands?.normalForce ?? 0).toFixed(0)} T${(e.hands?.tangentForce ?? 0).toFixed(0)}` : '-'}`);
};
for (const n of [6, 24]) { current = n; redirect({ substeps: n }); }
const a = rows[6], b = rows[24];
for (let i = 0; i < Math.max(a.length, b.length); i += 2) console.log(`${(a[i] ?? '').padEnd(120)} || ${(b[i] ?? '').slice(5)}`);
