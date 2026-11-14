// Sim side of nfl_open_run.py: speed by the angle between a player's facing and his travel direction, by position
// group, on drop-back passes from the snap to the pass's arrival (the ball's first catch, incompletion or the end of
// its flight), 10 Hz, as a share of each player's own p99 speed over the same frames. NOTE: our `facing` is the whole
// body (gait and shoulders together); the NFL's `o` is the shoulder pads. The comparison is what the cap does to a
// turned-shoulder run, which is the question.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/sim-open-run.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const GROUP: Record<string, string> = { WR: 'WR', TE: 'TE', RB: 'RB', FB: 'RB', CB: 'CB', S: 'S' };
const rows = new Map<string, Array<[string, number]>>(), own = new Map<string, number[]>();
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  this.__or = (this.__or ?? 0) + 1;
  if (this.ball.kind === 'air') this.__orAir = true;
  else if (this.__orAir) this.__orDone = true;
  if (this.__orDone || this.__or % 2 !== 0 || this.t < 0.05) return r;
  for (const a of this.agents) {
    const g = GROUP[a.player?.position]; if (!g) continue;
    const s = Math.hypot(a.vel.x, a.vel.y); if (s < 0.3) continue;
    let d = Math.abs(Math.atan2(Math.sin(a.facing - Math.atan2(a.vel.y, a.vel.x)), Math.cos(a.facing - Math.atan2(a.vel.y, a.vel.x)))) * 180 / Math.PI;
    const id = String(a.player.id); (own.get(id) ?? own.set(id, []).get(id)!).push(s);
    const k = `${g}:${Math.min(11, Math.floor(d / 15))}`; (rows.get(k) ?? rows.set(k, []).get(k)!).push([id, s]);
  }
  return r;
};
P.buildResult = function () { this.__or = 0; this.__orAir = false; this.__orDone = false; return b0.call(this); };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const vmax = new Map<string, number>();
for (const [i, v] of own) if (v.length >= 50) { v.sort((a, b) => a - b); vmax.set(i, v[Math.floor(0.99 * (v.length - 1))]); }
const qq = (v: number[], p: number) => { v = [...v].sort((a, b) => a - b); return v.length ? v[Math.floor(p * (v.length - 1))] : NaN; };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: speed by facing angle off the running line: n, p95 / p99 share of his own p99 (p95 yd/s)`);
for (const g of ['WR', 'TE', 'RB', 'CB', 'S']) {
  const out: string[] = [];
  for (let b = 0; b < 12; b++) {
    const R = (rows.get(`${g}:${b}`) ?? []).filter(([i]) => vmax.has(i)).map(([i, s]) => [s / vmax.get(i)!, s]);
    if (R.length < 30) continue;
    out.push(`${b * 15}-${b * 15 + 15}: n ${R.length} ${qq(R.map(x => x[0]), .95).toFixed(2)}/${qq(R.map(x => x[0]), .99).toFixed(2)} (${qq(R.map(x => x[1]), .95).toFixed(1)})`);
  }
  console.log(`${g}: ${out.join(' | ')}`);
}
