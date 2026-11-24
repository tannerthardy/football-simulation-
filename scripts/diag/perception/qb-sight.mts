/** The passer's picture of perimeter defenders: how old it is, whether a body blocks the line now, and which (QB lane's question, 2026-11-24; read-only tap on PlaySim.tick, no RNG draw).
 *   node --import tsx scripts/diag/perception/qb-sight.mts [--seed 101] [--games 2] [--out out/p0/qbsight.json]
 * Pass plays that are not screens, 0.3 s after the snap to the release, every tick: for each defender (CB, NB, S, LB), the age of `sim.see(qb, defender)` (asked like his controller asks; it
 * advances only the per-tick visibility memo), whether `lineOfSight` is clear from his eyes to the defender's head now, and if not which bodies block it (team, slot, perpendicular distance to the line, the
 * line's height against the blocker's shoulder / head), the defender's depth past the line and width from the passer. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { bodyHeight, EYE, HEAD_RADIUS, SHOULDER, lineOfSight } from '../../../src/sim/sight.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '2')), out = arg('--out', 'out/p0/qbsight.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick;
interface Row { clearAny: boolean; clearShoulder: boolean; clearSide: boolean; play: string; t: number; slot: string; depth: number; width: number; age: number | null; clear: boolean; blockers: string[]; formation: string }
const rows: Row[] = []; let plays = 0; const counted = new WeakSet<object>();
proto.tick = function (this: any) {
  const res = tick0.call(this);
  try {
    if (compilingPlan() || this.offCall?.kind !== 'pass' || this.offCall.pass?.screen || this.t < 0.3 || this.ball?.kind === 'air' || this.t > 3.5) return res;
    const qb = this.qb; if (!qb) return res;
    if (!counted.has(this)) { counted.add(this); plays++; }
    const id = `${seed}-${plays}`;
    for (const d of this.agents) {
      if (d.team !== 'D' || !/^(CB|NB|FS|SS|S_|LB)/.test(d.slot)) continue;
      const pic = this.see(qb, d);
      const clear = lineOfSight(this.agents, qb, d);
      // What a body-wide target would give: the same occlusion to his shoulder height, and to his head with the target shifted a torso half-width (0.2 yd) either side of the line.
      const clearShoulder = lineOfSight(this.agents, qb, d, bodyHeight(d, SHOULDER));
      const sideOf = (dy: number) => lineOfSight(this.agents, qb, d, undefined, (a: any) => a === d ? { x: a.pos.x, y: a.pos.y + dy } : a.pos);
      const clearSide = sideOf(0.2) || sideOf(-0.2);
      const blockers: string[] = [];
      if (!clear) {
        const eye = bodyHeight(qb, EYE), h = bodyHeight(d, EYE), sx = d.pos.x - qb.pos.x, sy = d.pos.y - qb.pos.y, l2 = sx * sx + sy * sy;
        for (const b of this.agents) {
          if (b === qb || b === d) continue;
          const u = ((b.pos.x - qb.pos.x) * sx + (b.pos.y - qb.pos.y) * sy) / l2; if (u <= 0 || u >= 1) continue;
          const dd = Math.hypot(qb.pos.x + sx * u - b.pos.x, qb.pos.y + sy * u - b.pos.y), line = eye + (h - eye) * u;
          if (Math.sqrt(l2) * Math.min(u, 1 - u) < b.profile.radius) continue;
          if (dd < b.profile.radius && line < bodyHeight(b, SHOULDER)) blockers.push(`${b.team}:${b.slot}:torso`);
          else if (dd < HEAD_RADIUS && line < bodyHeight(b, 1)) blockers.push(`${b.team}:${b.slot}:head`);
        }
      }
      rows.push({ clearAny: clear || clearShoulder || clearSide, clearShoulder, clearSide, play: id, t: Math.round(this.t * 100) / 100, slot: d.slot, depth: (d.pos.x - this.los) * this.attackDir('O'), width: Math.abs(d.pos.y - qb.pos.y), age: pic?.age ?? null, clear, blockers, formation: this.offCall.formation?.id ?? '?' });
    }
  } catch { /* read-only */ }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + g }); console.error(`game ${g + 1}/${games}: ${plays} plays, ${rows.length} rows`); }
writeFileSync(out, JSON.stringify({ seed, plays, rows }));
