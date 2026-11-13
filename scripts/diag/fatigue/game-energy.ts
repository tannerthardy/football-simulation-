/** How much fatigue players carry into each snap over full games, by position.
 * Energy at the snap, per-play cost, and the resulting speed/force factor
 * (fatigueFactor). Observes PlaySim only; no engine change.
 *
 * node --import tsx scripts/diag/fatigue/game-energy.ts [seed ...]
 */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { simulateGame } from '../../../src/game/game.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { fatigueFactor } from '../../../src/physics/kinematics.js';
const rows: { pos: string; id: string; start: number; end: number }[] = [];
const starts = new WeakMap<object, Map<string, number>>();
const tick = (PlaySim.prototype as any).tick;
(PlaySim.prototype as any).tick = function () { if (!starts.has(this)) starts.set(this, new Map(this.agents.map((a: any) => [a.player.id, a.body.energy]))); return tick.call(this); };
const wh = PlaySim.prototype.whistle;
PlaySim.prototype.whistle = function (o, s) { const st = starts.get(this); for (const a of this.agents) rows.push({ pos: a.player.position, id: a.player.id, start: st?.get(a.player.id) ?? 1, end: a.body.energy }); return wh.call(this, o, s); };
const seeds = process.argv.slice(2).map(Number);
for (const seed of seeds.length ? seeds : [101, 202]) { const rng = new Rng(seed); simulateGame(generateTeam(rng, 'A', 'AAA', { strength: .55 }), generateTeam(rng, 'B', 'BBB', { strength: .55 }), { seed }); }
const groups: Record<string, typeof rows> = {};
for (const r of rows) (groups[['OT','OG','C','T','G'].includes(r.pos) ? 'OL' : ['DT','DE','NT','EDGE'].includes(r.pos) ? 'DL' : r.pos] ??= []).push(r);
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * (v.length - 1))];
console.log('group snaps | energy at snap p50/p10/min | per-play cost p50/p90 | speed+force factor at snap p50/p10/min');
for (const [g, rs] of Object.entries(groups)) {
  const s = rs.map(r => r.start), c = rs.map(r => r.start - r.end), f = s.map(fatigueFactor);
  const perPlayer = new Map<string, number>(); for (const r of rs) perPlayer.set(r.id, (perPlayer.get(r.id) ?? 0) + 1);
  console.log(`${g.padEnd(5)} ${String(rs.length).padStart(5)} | ${q(s,.5).toFixed(3)}/${q(s,.1).toFixed(3)}/${Math.min(...s).toFixed(3)} | ${q(c,.5).toFixed(3)}/${q(c,.9).toFixed(3)} | ${q(f,.5).toFixed(4)}/${q(f,.1).toFixed(4)}/${Math.min(...f).toFixed(4)} | max snaps/player/2 games ${Math.max(...perPlayer.values())}`);
}
