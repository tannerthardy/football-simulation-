/** usage: [CATCH_HANDS=1 ...] node --import tsx scripts/diag/risk/mid-pbu.ts <seed> <games> <max rows> > out/risk/mid-pbu.jsonl */
// Mid-openness PBUs (target 1.5-3 yd from the nearest defender at the release), contest flags on: exact sim-time
// geometry at the PBU event (defender, ball in 3D, target), the defender's reach, and his body facing toward the ball
// (body, not gaze). Arms by environment; the sim's PBU note says which path made it (plain = defenderPlay).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2), want = Number(process.argv[4] ?? 12);
const P: any = PlaySim.prototype, ev0 = P.event;
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b) {
    const sep = Math.min(...this.defense.map((d: any) => Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y)));
    this.__throw = { t: this.t, sep, target: b, los: this.los, dir: this.attackDir(b.team) };
  }
  if (type === 'pbu' && a && this.__throw && this.__throw.sep >= 1.5 && this.__throw.sep < 3) {
    const T = this.__throw.target, bp = this.ballPos?.() ?? this.ball.flight?.pos, bz = this.ball.flight?.pos?.z ?? bp?.z;
    const sh = a.body?.parts?.shoulder ?? null;
    rows.push({
      cov: this.defCall?.coverage?.id, sep: +this.__throw.sep.toFixed(2), air: +(this.t - this.__throw.t).toFixed(2),
      depth: +((T.pos.x - this.__throw.los) * this.__throw.dir).toFixed(1), slot: a.slot, note: note ?? '',
      dT: +Math.hypot(a.pos.x - T.pos.x, a.pos.y - T.pos.y).toFixed(2),
      ballToD: bp ? +Math.hypot(bp.x - a.pos.x, bp.y - a.pos.y).toFixed(2) : null,
      ballToT: bp ? +Math.hypot(bp.x - T.pos.x, bp.y - T.pos.y).toFixed(2) : null,
      ballZ: bz !== undefined ? +bz.toFixed(2) : null,
      dSpeed: +Math.hypot(a.vel.x, a.vel.y).toFixed(1), reach: +(a.profile.reach ?? NaN).toFixed(2), radius: +a.profile.radius.toFixed(2),
      tSpeed: +Math.hypot(T.vel.x, T.vel.y).toFixed(1), facingBall: bp ? +Math.cos(Math.atan2(bp.y - a.pos.y, bp.x - a.pos.x) - a.facing).toFixed(2) : null,
      wasNearest: this.defense.every((d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y) >= Math.hypot(a.pos.x - T.pos.x, a.pos.y - T.pos.y) - 1e-6),
    });
  }
  return ev0.call(this, type, a, b, note);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games && rows.length < want; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
for (const r of rows) console.log(JSON.stringify(r));
const kinds = rows.reduce((m: any, r: any) => (m[r.note || 'plain'] = (m[r.note || 'plain'] ?? 0) + 1, m), {});
console.error(`mid PBUs ${rows.length}: ${JSON.stringify(kinds)} | ball within reach+radius of the defender: ${rows.filter(r => r.ballToD !== null && r.ballToD <= r.reach + r.radius).length}`);
