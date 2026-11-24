/** Read-only tap: each play's players' energy and sprint load on the play's first tick (what the previous plays left on the bodies), one arm per process.
 *   [BALL_DRAG=1] node --import tsx scripts/diag/ball/start_state_tap.mts [--seed 102] [--out out/drag/start-0.json]  (first 6 plays of one game) */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), first = Number(arg('--first', '1')), out = arg('--out', 'out/drag/start.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick; const seen = new WeakSet<object>(); const rows: any[] = [];
proto.tick = function (this: any) {
  if (!seen.has(this)) { seen.add(this); try { rows.push({ n: rows.length, call: this.offCall?.kind, es: this.agents.map((a: any) => [a.player?.id ?? a.slot, +(a.body.energy ?? 1).toFixed(5), +(a.body.sprintLoad ?? 0).toFixed(4)]) }); } catch { /* read-only */ } }
  return tick0.call(this);
};
const rng = new Rng(101);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(home, away, { seed: seed + first });
writeFileSync(out, JSON.stringify(rows.slice(0, 8)));
