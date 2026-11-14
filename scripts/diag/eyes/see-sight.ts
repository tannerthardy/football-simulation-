// node --import tsx scripts/diag/eyes/see-sight.ts [seed] [games] [FLAG=value ...]
// Integration (2026-11-14): does see() hand a player a picture of a man he cannot see? For a sample of see() calls on
// opponents (1 in 10), whether the observer could see the target now: a body's centre line across the sight line
// (15-85% of the way, within that body's radius), or the target behind his shoulder (beyond 1.8 rad of body facing).
// Grouped by the calling function (file:function). see() has no line-of-sight term with GAZE off.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
const [seedArg, gamesArg, ...rest] = process.argv.slice(2);
for (const kv of rest) { const [k, v] = kv.split('='); process.env[k] = v; }
const seed = Number(seedArg ?? 101), games = Number(gamesArg ?? 1);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const blocked = (sim: any, o: any, t: any) => {
  const sx = t.pos.x - o.pos.x, sy = t.pos.y - o.pos.y, l2 = sx * sx + sy * sy; if (l2 < 0.36) return false;
  for (const b of sim.agents) { if (b === o || b === t) continue;
    const u = ((b.pos.x - o.pos.x) * sx + (b.pos.y - o.pos.y) * sy) / l2; if (u <= 0.15 || u >= 0.85) continue;
    const px = o.pos.x + sx * u - b.pos.x, py = o.pos.y + sy * u - b.pos.y; if (px * px + py * py < b.profile.radius ** 2) return true; }
  return false; };
const byCaller = new Map<string, { n: number; occ: number; behind: number }>(); let k = 0;
const see0 = (PlaySim.prototype as any).see;
(PlaySim.prototype as any).see = function (this: any, o: any, t: any, s = 1) {
  if (o.team !== t.team && (k++ % 10) === 0) {
    const line = (new Error().stack ?? '').split('\n')[2] ?? '';
    const m = line.match(/at (?:(?:\S+\.)?(\S+) )?\(?.*\/src\/(\S+?)\.ts/);
    const caller = m ? `${m[2]}:${m[1] ?? '?'}` : '?';
    const b = Math.atan2(t.pos.y - o.pos.y, t.pos.x - o.pos.x) - o.body.facing;
    const behind = Math.abs(Math.atan2(Math.sin(b), Math.cos(b))) > 1.8;
    const r = byCaller.get(caller) ?? { n: 0, occ: 0, behind: 0 }; r.n++; if (blocked(this, o, t)) r.occ++; if (behind) r.behind++; byCaller.set(caller, r);
  }
  return see0.call(this, o, t, s);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as any);
const rows = [...byCaller.entries()].sort((a, b) => b[1].n - a[1].n), N = rows.reduce((x, [, r]) => x + r.n, 0);
const tot = rows.reduce((x, [, r]) => ({ occ: x.occ + r.occ, behind: x.behind + r.behind }), { occ: 0, behind: 0 });
console.log(`sampled see() calls on opponents ${N}: through a body ${(100 * tot.occ / N).toFixed(1)}%, behind the shoulder ${(100 * tot.behind / N).toFixed(1)}%`);
for (const [c, r] of rows.slice(0, 30)) console.log(`${c.padEnd(48)} ${String(r.n).padStart(7)} (${(100 * r.n / N).toFixed(1).padStart(4)}%)  through a body ${(100 * r.occ / r.n).toFixed(1).padStart(5)}%  behind ${(100 * r.behind / r.n).toFixed(1).padStart(5)}%`);
