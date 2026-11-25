/** Linemen who go to the ground on dropbacks, per 100 dropbacks, with the direction of the hit relative to his facing (read-only tap on PlaySim.tick; no RNG draw, no behavior change).
 *   [SCRATCH_CRIT_SCALE=0.88] node --import tsx scripts/diag/blocking/falls.mts [--seed 101] [--games 6] [--out out/p0/falls-X.json]
 * Pass plays that are not screens, from the snap to the release (the ball in the air or 4.5 s). Per offensive lineman (OL) and per defensive lineman (DL): the first tick the body leaves state 'up'
 * (one per man per play); the angle between his facing and the push (support.fall, the direction he is going over) at that tick: |angle| under 30 degrees = along his facing, 30-60 oblique, over 60 across. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '6')), out = arg('--out', 'out/p0/falls.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick;
const OLS = /^(LT|LG|C|RG|RT)$/, DLS = /^(DE_|DT_|NT)/;
interface Ev { unit: 'OL' | 'DL'; slot: string; t: number; ang: number }
const plays = new WeakMap<object, { seen: Set<number>; counted: boolean }>();
let dropbacks = 0; const events: Ev[] = [];
proto.tick = function (this: any) {
  const res = tick0.call(this);
  try {
    if (compilingPlan() || this.offCall?.kind !== 'pass' || this.offCall.pass?.screen || this.t < 0 || this.ball?.kind === 'air' || this.t > 4.5) return res;
    let s = plays.get(this); if (!s) { s = { seen: new Set(), counted: false }; plays.set(this, s); }
    if (!s.counted) { s.counted = true; dropbacks++; }
    for (const a of this.agents) {
      const unit = a.team === 'O' && OLS.test(a.slot) ? 'OL' : a.team === 'D' && DLS.test(a.slot) ? 'DL' : null;
      if (!unit || s.seen.has(a.idx)) continue;
      const st = a.body.support?.state;
      if (st && st !== 'up') {
        s.seen.add(a.idx);
        const f = a.body.support.fall; let ang = NaN;
        if (f && Math.hypot(f.x, f.y) > 1e-9) { let d = Math.atan2(f.y, f.x) - a.body.facing; d = Math.atan2(Math.sin(d), Math.cos(d)); ang = Math.abs(d) * 180 / Math.PI; }
        events.push({ unit, slot: a.slot, t: this.t, ang });
      }
    }
  } catch { /* read-only */ }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + g }); console.error(`game ${g + 1}/${games}: ${dropbacks} dropbacks, ${events.length} falls`); }
writeFileSync(out, JSON.stringify({ seed, games, dropbacks, events }));
