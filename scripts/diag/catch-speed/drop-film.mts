// Drops by how the ball was met (Integration, 2026-11-23, CATCH_STRIDE's drop rise 5.0 -> 7.8%). Whole recorded games
// (generated teams at strength 0.55, leagueSample per seed). Per pass, the targeted receiver's first ball event after
// the throw: secure / catch (caught), drop, miss (off target, out of his window), pbu (a defender's hand). At that
// moment: his speed (positions over +-0.1 s), the ball's direction against his travel (cosine of his velocity with the
// ball's: + = the ball comes from behind him, running with it; - = he runs at it), and the nearest defender's distance.
// usage: [CATCH_STRIDE=1] node --import tsx scripts/diag/catch-speed/drop-film.mts --seed 101 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = arg('--out', 'drops.json');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const result: any = simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
const rows: any[] = [];
const KIND: Record<string, string> = { secure: 'caught', catch: 'caught', drop: 'drop', miss: 'miss', pbu: 'pbu' };
for (const p of result.log) {
  const rp = p.replay; if (!rp || p.nullified || p.kind !== 'pass') continue;
  const thr = rp.events.find((e: any) => e.type === 'throw'); if (!thr || thr.b === undefined) continue;
  const tgt = thr.b;
  const ev = rp.events.find((e: any) => e.t >= thr.t && KIND[e.type] && (e.type === 'pbu' ? e.b === tgt : e.a === tgt)); if (!ev) continue;
  const at = (t: number) => rp.frames.reduce((a: any, b: any) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
  const f0 = at(ev.t), fa = at(ev.t - 0.1), fb = at(ev.t + 0.1), fp = at(ev.t - 0.2);
  const dt = Math.max(0.05, fb.t - fa.t);
  const vx = (fb.agents[tgt * 3] - fa.agents[tgt * 3]) / dt, vy = (fb.agents[tgt * 3 + 1] - fa.agents[tgt * 3 + 1]) / dt, sp = Math.hypot(vx, vy);
  const bx = f0.ball[0] - fp.ball[0], by = f0.ball[1] - fp.ball[1], bl = Math.hypot(bx, by);
  const cos = sp > 1 && bl > 0.3 ? (vx * bx + vy * by) / (sp * bl) : null;
  let near = Infinity;
  for (let i = 0; i < rp.players.length; i++) if (rp.players[i].team === 'D') near = Math.min(near, Math.hypot(f0.agents[i * 3] - f0.agents[tgt * 3], f0.agents[i * 3 + 1] - f0.agents[tgt * 3 + 1]));
  rows.push({ kind: KIND[ev.type], speed: +sp.toFixed(2), cos: cos === null ? null : +cos.toFixed(2), near: +near.toFixed(2), route: p.routes?.[tgt] ?? null });
}
writeFileSync(out, JSON.stringify(rows)); console.log('rows', rows.length);
