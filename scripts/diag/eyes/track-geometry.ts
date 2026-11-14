// node --import tsx scripts/diag/eyes/track-geometry.ts [seed] [games] [FLAG=value ...]
// Where TRACK_TACKLE's chase read is used: every track() call (TRACK_TACKLE=1, TT_SITES=chase), the target's distance,
// his eccentricity off the observer's body facing (deg), and whether a body stands in the sight line (tackle.ts's
// occluded() corridor). step 0's track() returns the same clean 0.12 s picture in all of them.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
const [seedArg, gamesArg, ...rest] = process.argv.slice(2);
process.env.TRACK_TACKLE = '1'; process.env.TT_SITES = 'chase';
for (const kv of rest) { const [k, v] = kv.split('='); process.env[k] = v; }
const seed = Number(seedArg ?? 101), games = Number(gamesArg ?? 2);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const occluded = (sim: any, d: any, c: any) => {
  const sx = c.pos.x - d.pos.x, sy = c.pos.y - d.pos.y, l2 = sx * sx + sy * sy; if (l2 < 0.36) return false;
  for (const o of sim.agents) { if (o === d || o === c) continue;
    const t = ((o.pos.x - d.pos.x) * sx + (o.pos.y - d.pos.y) * sy) / l2; if (t <= 0.15 || t >= 0.85) continue;
    const px = d.pos.x + sx * t - o.pos.x, py = d.pos.y + sy * t - o.pos.y; if (px * px + py * py < (o.profile.radius + 0.25) ** 2) return true; }
  return false; };
const rows: { d: number; ecc: number; occ: boolean }[] = [];
const t0 = (PlaySim.prototype as any).track;
(PlaySim.prototype as any).track = function (this: any, o: any, t: any, s = 1, group = false) {
  if (group && o.team !== t.team) {
    const b = Math.atan2(t.pos.y - o.pos.y, t.pos.x - o.pos.x) - o.body.facing;
    rows.push({ d: Math.hypot(t.pos.x - o.pos.x, t.pos.y - o.pos.y), ecc: Math.abs(Math.atan2(Math.sin(b), Math.cos(b))) * 180 / Math.PI, occ: occluded(this, o, t) });
  }
  return t0.call(this, o, t, s, group);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as any);
const n = rows.length, pc = (k: number) => `${(100 * k / n).toFixed(1)}%`;
console.log(`chase track() calls ${n}`);
for (const [lo, hi] of [[0, 3], [3, 6], [6, 12], [12, 99]]) {
  const r = rows.filter((x) => x.d >= lo && x.d < hi), m = r.length || 1;
  console.log(`${String(lo).padStart(2)}-${hi} yd: ${pc(r.length)} of calls | eccentricity >60 ${(100 * r.filter((x) => x.ecc > 60).length / m).toFixed(1)}%, >90 ${(100 * r.filter((x) => x.ecc > 90).length / m).toFixed(1)}% (behind his shoulder) | sight line through a body ${(100 * r.filter((x) => x.occ).length / m).toFixed(1)}%`);
}
console.log(`all: eccentricity >90 ${pc(rows.filter((x) => x.ecc > 90).length)}, occluded ${pc(rows.filter((x) => x.occ).length)}, either ${pc(rows.filter((x) => x.ecc > 90 || x.occ).length)}`);
