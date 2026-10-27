/** Outside zone and toss: the back from the snap through the mesh to the edge,
 * requested vs achieved lateral (playside) and downfield speed, every 0.3 s.
 *   node --import tsx scripts/diag/oz-mesh-track.ts [seed=11]   (one run-only game; reads only) */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
type S = PlaySim & { __r?: any };
const rows: any[] = [];
const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: S) {
  tick.call(this);
  const run = (this as any).offCall?.run; if (!run || !['oz_strong', 'oz_weak', 'wz_strong', 'wz_weak', 'toss'].includes(run.id ?? run.scheme)) return;
  const rb = this.slot('RB'); if (!rb) return;
  if (!this.__r) { this.__r = { cy: this.ballY, rows: [] as any[] }; rows.push(this.__r); }
  if (this.t > 3) return;
  const cmd = ((this as any).cmds as any[])[rb.idx]?.vel ?? { x: 0, y: 0 };
  this.__r.rows.push({ t: +this.t.toFixed(2), has: this.carrier === rb, x: rb.pos.x - this.los, ly: rb.pos.y - this.__r.cy, rvy: cmd.y, rvx: cmd.x, vy: rb.vel.y, form: (this as any).offCall.formation.id, vx: rb.vel.x, job: rb.behavior.kind });
};
const seed = Number(process.argv[2] ?? 11), rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(home, away, { seed, runOnly: true });
const q = (v: number[]) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor((s.length - 1) / 2)].toFixed(2) : null; };
for (const r of rows) { const end = r.rows[r.rows.length - 1]; const sg = Math.sign(end.ly) || 1; for (const x of r.rows) { x.ly *= sg; x.rvy *= sg; x.vy *= sg; } }
console.log('OZ/toss plays', rows.length, 'formations', [...new Set(rows.map(r => r.rows[0].form))].join(','));
for (const t of [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1]) {
  const at = rows.map(r => r.rows.find((x: any) => Math.abs(x.t - t) < 0.026)).filter(Boolean);
  console.log(`t ${t}: has ball ${at.filter((x: any) => x.has).length}/${at.length} | playside lateral ${q(at.map((x: any) => x.ly))} yd, depth ${q(at.map((x: any) => x.x))} | lateral speed requested ${q(at.map((x: any) => x.rvy))} achieved ${q(at.map((x: any) => x.vy))} | downfield req ${q(at.map((x: any) => x.rvx))} ach ${q(at.map((x: any) => x.vx))} | job ${[...new Set(at.map((x: any) => x.job))].join(',')}`);
}
