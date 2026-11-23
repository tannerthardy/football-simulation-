// The catch in motion, the sim's side (Integration, 2026-11-23): completions from whole recorded games (generated teams
// at strength 0.55, leagueSample per seed) in the per-catch format nfl-catch-film.py writes. The catch time is the ball
// reaching his hands (the 'secure' event: CATCH_SECURE's window opens there; the 'catch' event comes up to 0.45 s later
// at its end), to match the NFL's pass_outcome_caught. Frames resampled to 0.1 s from the throw - 1.0 s to the catch +
// 1.0 s. route = his first installed route (PlayLog.routes, 'family:id'), air = the catch spot past the line.
// usage: node --import tsx scripts/diag/catch-speed/sim-catch-film.mts --seed 101 --out rows.jsonl
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), out = arg('--out', 'catch.jsonl');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const result: any = simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed, record: true });
const lines: string[] = [];
for (const p of result.log) {
  const rp = p.replay; if (!rp || p.nullified || p.kind !== 'pass') continue;
  const ev = rp.events, thr = ev.find((e: any) => e.type === 'throw'); if (!thr) continue;
  const caught = ev.find((e: any) => e.type === 'catch' && e.t >= thr.t); if (!caught) continue;
  const sec = ev.find((e: any) => e.type === 'secure' && e.t >= thr.t && e.a === caught.a);
  const t0 = sec ? sec.t : caught.t, i = caught.a;
  const n = rp.players.length, f0 = rp.frames[0].agents;
  const offX = rp.players.reduce((s: number, a: any, k: number) => s + (a.team === 'O' ? f0[k * 3] : 0), 0) / rp.players.filter((a: any) => a.team === 'O').length;
  const dir = offX < rp.los ? 1 : -1, X = (x: number) => +((x - rp.los) * dir).toFixed(2);
  const at = (t: number) => { let j = 0; while (j < rp.frames.length - 2 && rp.frames[j + 1].t < t) j++;
    const a = rp.frames[j], b = rp.frames[Math.min(j + 1, rp.frames.length - 1)], w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    const L = (u: number, v: number) => u + w * (v - u);
    return { r: [X(L(a.agents[i * 3], b.agents[i * 3])), +L(a.agents[i * 3 + 1], b.agents[i * 3 + 1]).toFixed(2)],
             b: [X(L(a.ball[0], b.ball[0])), +L(a.ball[1], b.ball[1]).toFixed(2), +L(a.ball[2], b.ball[2]).toFixed(2)] }; };
  const ts: number[] = []; for (let t = thr.t - 1.0; t <= t0 + 1.0 + 1e-9; t += 0.1) if (t >= 0 && t <= rp.frames[rp.frames.length - 1].t) ts.push(t);
  if (ts.length < 10) continue;
  const S = ts.map(at);
  lines.push(JSON.stringify({ src: 'sim', id: `S${seed}-${p.index}`, route: p.routes?.[i] ?? null, air: at(t0).b[0],
    t: ts.map((t) => +(t - t0).toFixed(2)), r: S.map((s) => s.r), b: S.map((s) => s.b), throw: +(thr.t - t0).toFixed(2), arrive: 0 }));
}
writeFileSync(out, lines.join('\n') + '\n'); console.log('catches', lines.length);
