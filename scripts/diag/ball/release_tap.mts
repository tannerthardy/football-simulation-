/** Release speed by air distance in actual games (read-only tap on PlaySim.tick: no RNG draw, no behavior change).
 *   [BALL_DRAG=1] node --import tsx scripts/diag/ball/release_tap.mts [--seed 101] [--games 4] [--out out/drag/release-0.json]
 * One row per pass the tick after the ball is in the air: horizontal speed and 3-D speed of the launch, the air distance (the ball's horizontal distance to the pending catch point, from the flight's own solve: the target the QB threw to) and the flight time. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), out = arg('--out', 'out/drag/release.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick;
const seen = new WeakMap<object, Set<number>>(); const rows: any[] = [];
proto.tick = function (this: any) {
  const r = tick0.call(this);
  try {
    const b = this.ball;
    if (b?.kind === 'air') {
      let s = seen.get(this); if (!s) { s = new Set(); seen.set(this, s); }
      const key = b.releaseT;
      if (!s.has(key) && b.flight && b.intended) {
        s.add(key); const v = b.flight.vel;
        rows.push({ h: Math.hypot(v.x, v.y), v3: Math.hypot(v.x, v.y, v.z), air: Math.hypot(b.intended.x - b.flight.pos.x, b.intended.y - b.flight.pos.y), T: b.arrivalT - this.t });
      }
    }
  } catch { /* read-only */ }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + g }); console.error(`game ${g + 1}/${games}: ${rows.length}`); }
writeFileSync(out, JSON.stringify(rows));
console.log(JSON.stringify(rows[0]));
