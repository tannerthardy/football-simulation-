// The deep catch point in whole games (2026-11-18): staged throws share one dice stream per seed and receiver slot (the
// 'catch:O:<slot>' stream forks from the play seed), so the staged grid draws the same contest roll across coverages,
// concepts and throw times; whole games draw a fresh stream each play. Throws whose arrival spot (the ball at the first
// arrival event: catch / secure / incomplete / pbu / interception / drop / deflection / miss) is 15+ yd past the LOS.
// The deep man as Defense's operator: the defender 10+ yd past the LOS at the release nearest the arrival spot; his
// distance to it at arrival. Outcome: int / catch / pbu / incomplete (untouched). Rows to OUT.
// usage: node --import tsx scripts/diag/pass-operators/deep-catch-games.mts --seed 101 --games 1 --out rows.json
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '1')), out = arg('--out', 'dcg.json');
const ARRIVE = new Set(['secure', 'catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss']);
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const rows: any[] = [];
for (let g = 0; g < games; g++) {
  const result: any = simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true });
  for (const p of result.log) {
    const rp = p.replay; if (!rp || p.nullified || p.kind !== 'pass' || rp.frames.length < 2) continue;
    const thr = rp.events.find((e: any) => e.type === 'throw'); if (!thr) continue;
    const arr = rp.events.find((e: any) => ARRIVE.has(e.type) && e.t >= thr.t); if (!arr) continue;
    const fAt = (t: number) => rp.frames.reduce((a: any, b: any) => Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a);
    const f0 = rp.frames[0].agents, n = rp.players.length;
    const offX = rp.players.reduce((s: number, a: any, i: number) => s + (a.team === 'O' ? f0[i * 3] : 0), 0) / rp.players.filter((a: any) => a.team === 'O').length;
    const dir = offX < rp.los ? 1 : -1, X = (x: number) => (x - rp.los) * dir;
    const fr = fAt(arr.t), fr0 = fAt(thr.t), cp = { x: fr.ball[0], y: fr.ball[1] };
    if (X(cp.x) < 15) continue;
    let dm = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (rp.players[i].team === 'D' && X(fr0.agents[i * 3]) >= 10) { const d = Math.hypot(fr0.agents[i * 3] - cp.x, fr0.agents[i * 3 + 1] - cp.y); if (d < best) { best = d; dm = i; } }
    if (dm < 0) continue;
    const dArr = Math.hypot(fr.agents[dm * 3] - cp.x, fr.agents[dm * 3 + 1] - cp.y);
    const ev = rp.events, has = (t: string) => ev.some((e: any) => e.type === t && e.t >= thr.t);
    const outcome = has('interception') ? 'int' : has('catch') ? 'catch' : has('pbu') ? 'pbu' : has('deflection') ? 'deflection' : 'incomplete';
    rows.push({ game: seed + g, air: +X(cp.x).toFixed(1), dArr: +dArr.toFixed(2), outcome, byDeep: ev.some((e: any) => (e.type === 'pbu' || e.type === 'interception') && e.a === dm) });
  }
}
writeFileSync(out, JSON.stringify(rows)); console.log('rows', rows.length);
