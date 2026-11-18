// Pass-rush get-off in whole games (Integration, 2026-11-17; the NFL side is nfl_getoff.py). The export's games (two
// generated teams, consecutive seeds). For every defensive lineman (EDGE / DT) on a pass play who starts on his side of the
// line within 2.5 yd of it and crosses it before the ball is out: snap to crossing (first time his x past the line is <= 0,
// the same operator nfl_getoff.py runs on tracking), snap to first movement (0.2 yd from his snap spot), and pressure (he
// gets within 2.0 yd of the QB before the throw, or sacks). Rows: one per rush, with his name, game, position and the
// ratings that act on the start (playRecognition, awareness -> reactionTime; anticipation; the 10-yd split -> burst).
// usage: node --import tsx scripts/diag/pass-operators/sim-getoff.mts --seed 101 --games 1 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '1')), out = arg('--out', 'getoff.json');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
// Replay players carry the agent's short name (first initial . last) and position; one roster entry per team matches.
const byName = new Map<string, any>(); for (const t of [home, away]) for (const p of t.roster) byName.set(`${t.abbr}:${p.firstName[0]}.${p.lastName}:${p.position}`, p);
const rows: any[] = [];
for (let g = 0; g < games; g++) {
  const result: any = simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true });
  for (const p of result.log) {
    const rp = p.replay; if (!rp || p.nullified || p.kind !== 'pass' || rp.frames.length < 2) continue;
    const n = rp.players.length, f0 = rp.frames[0].agents;
    const offX = rp.players.reduce((s: number, a: any, i: number) => s + (a.team === 'O' ? f0[i * 3] : 0), 0) / rp.players.filter((a: any) => a.team === 'O').length;
    const dir = offX < rp.los ? 1 : -1, X = (x: number) => (x - rp.los) * dir;
    const qb = rp.players.findIndex((a: any) => a.team === 'O' && a.slot === 'QB');
    const thr = rp.events.find((e: any) => e.type === 'throw' || e.type === 'throwaway')?.t ?? Infinity;
    const defAbbr = p.defense ?? p.defTeam ?? null;
    for (let i = 0; i < n; i++) {
      const a = rp.players[i]; if (a.team !== 'D' || !['EDGE', 'DT'].includes(a.pos)) continue;
      const x0 = X(f0[i * 3]), y0 = f0[i * 3 + 1]; if (x0 <= 0 || x0 > 2.5) continue;
      let cross = NaN, move = NaN, press = false;
      for (let k = 1; k < rp.frames.length; k++) {
        const fr = rp.frames[k], pr = rp.frames[k - 1]; if (fr.t > Math.min(thr, 6)) break;
        const x = X(fr.agents[i * 3]), y = fr.agents[i * 3 + 1];
        if (Number.isNaN(move) && Math.hypot(x - x0, y - y0) >= 0.2) move = fr.t;
        if (Number.isNaN(cross) && x <= 0) { const xp = X(pr.agents[i * 3]); cross = pr.t + (fr.t - pr.t) * (xp / Math.max(1e-6, xp - x)); }
        if (qb >= 0 && Math.hypot(fr.agents[i * 3] - fr.agents[qb * 3], y - fr.agents[qb * 3 + 1]) <= 2) press = true;
      }
      if (rp.events.some((e: any) => e.type === 'sack' && e.a === i)) press = true;
      if (Number.isNaN(cross)) continue;
      const key = [home, away].map((t) => `${t.abbr}:${a.name}:${a.pos}`).find((k) => byName.has(k));
      const pl = key ? byName.get(key) : null, r = pl?.ratings ?? {};
      rows.push({ game: seed + g, who: key ?? a.name, pos: a.pos, cross, move, press, rec: r.playRecognition, aw: r.awareness, ant: r.anticipation, ten: pl?.measurables?.tenSplit, rush: r.passRushFinesse });
    }
  }
}
writeFileSync(out, JSON.stringify(rows));
console.log(`rows ${rows.length}`);
