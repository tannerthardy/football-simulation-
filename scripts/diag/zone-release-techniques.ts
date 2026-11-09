/** COV-1 (docs/reviews/cov1-flight-closing.md): every zone (non-man, non-rushing) defender 3+ yd off the ball, at the release:
 * technique label, downfield speed, depth, by starting depth group. usage: node --import tsx scripts/diag/zone-release-techniques.ts [games=4] [seed=101] */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { facingTechnique } from '../../src/sim/coverage/orientation.js';
type S = PlaySim & { __x0?: number[]; __done?: boolean; __prev?: Map<number, string> };
const rows: any[] = [];
const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: S) {
  if (!this.__x0) this.__x0 = this.agents.map(a => a.pos.x - this.los);
  tick.call(this);
  if (this.__done || this.ball.kind !== 'air' || !this.isPass) return;
  this.__done = true;
  const cmds = (this as any).cmds as any[];
  for (const d of this.defense) {
    const x0 = this.__x0[d.idx]; if (x0 < 3) continue;
    const label = facingTechnique(cmds[d.idx])?.label ?? 'none';
    if (label.startsWith('man')) continue;
    const cmd = cmds[d.idx]?.vel ?? { x: 0, y: 0 };
    rows.push({ group: x0 < 9 ? 'under' : 'deep', label, vx: d.vel.x, cmdVx: cmd.x, depth: d.pos.x - this.los, t: this.t });
  }
};
const [games = 4, seed = 101] = process.argv.slice(2).map(Number);
const rng = new Rng(seed);
const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });
const q = (v: number[]) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor((s.length - 1) / 2)].toFixed(2) : null; };
for (const group of ['under', 'deep']) {
  const xs = rows.filter(r => r.group === group);
  console.log(`${group}: n ${xs.length}, vx p50 ${q(xs.map(r => r.vx))}, mean ${(xs.reduce((s, r) => s + r.vx, 0) / xs.length).toFixed(2)}`);
  const m = new Map<string, any[]>(); for (const r of xs) m.set(r.label, [...(m.get(r.label) ?? []), r]);
  for (const [k, v] of [...m].sort((a, b) => b[1].length - a[1].length))
    console.log(`  ${k.padEnd(16)} share ${(v.length / xs.length).toFixed(2)} vx p50 ${q(v.map(r => r.vx))} cmd vx p50 ${q(v.map(r => r.cmdVx))} depth ${q(v.map(r => r.depth))} | contrib to mean vx ${(v.reduce((s, r) => s + r.vx, 0) / xs.length).toFixed(2)}`);
}
