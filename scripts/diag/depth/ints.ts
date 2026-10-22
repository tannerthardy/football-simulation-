/** Where interceptions come from in simulated games (observation only; flags
 * from the environment). For every intercepted pass: tipped (a drop, pbu or
 * deflection earlier on the play) or clean; the targeted receiver's distance
 * to the ball at the interception (contested within 1.5 yd, else undercut /
 * in front of him); the interceptor's position group and distance from the
 * target at the throw; air yards to the interception spot.
 * node --import tsx scripts/diag/depth/ints.ts [--seed 101] [--games 6] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '6'));
type Row = { tipped: string; contested: boolean; by: string; dThrow: number; air: number; tAir: number };
const rows: Row[] = [];
let attempts = 0;
const touched = { pbu: 0, drop: 0, deflection: 0, any: 0, anyInt: 0, ownTip: 0 };
const fam = (pos: string) => /^(DT|EDGE|DE|NT)$/.test(pos) ? 'DL' : pos === 'LB' ? 'LB' : /^(CB)$/.test(pos) ? 'CB' : 'S';
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed, record: true });
  for (const p of r.log) {
    if (p.kind !== 'pass' || p.nullified || !p.stats?.attempted || p.stats.sacked) continue;
    attempts++;
    if (!p.replay) continue;
    const ev = p.replay.events, players = p.replay.players, frames = p.replay.frames;
    const pick = ev.find(e => e.type === 'interception');
    const tips = ev.filter(e => ['drop', 'pbu', 'deflection'].includes(e.type));
    for (const k of ['pbu', 'drop', 'deflection'] as const) if (tips.some(e => e.type === k)) touched[k]++;
    if (tips.length) { touched.any++; if (pick) { touched.anyInt++; if (tips.some(e => e.a === pick.a)) touched.ownTip++; } }
    if (!p.stats.interceptedBy) continue;
    const thrown = ev.find(e => e.type === 'throw');
    if (!pick || pick.a === undefined) continue;
    const before = ev.filter(e => e.t <= pick.t && ['drop', 'pbu', 'deflection'].includes(e.type)).map(e => e.type);
    const at = (t: number) => frames.reduce((b, f) => Math.abs(f.t - t) < Math.abs(b.t - t) ? f : b, frames[0]);
    const xy = (f: typeof frames[number], i: number) => ({ x: f.agents[i * 3], y: f.agents[i * 3 + 1] });
    const target = thrown?.b ?? -1;
    const fi = at(pick.t), ft = thrown ? at(thrown.t) : frames[0];
    const pp = xy(fi, pick.a);
    const tgtAt = target >= 0 ? xy(fi, target) : null;
    const contested = !!tgtAt && Math.hypot(tgtAt.x - pp.x, tgtAt.y - pp.y) <= 1.5;
    const dThrow = target >= 0 ? Math.hypot(xy(ft, pick.a).x - xy(ft, target).x, xy(ft, pick.a).y - xy(ft, target).y) : NaN;
    const off = players.map((q, i) => q.team === 'O' ? frames[0].agents[i * 3] : NaN).filter(Number.isFinite);
    const dir = off.reduce((a, b) => a + b, 0) / off.length < p.replay.los ? 1 : -1;
    rows.push({ tipped: before.length ? before.join('+') : 'clean', contested, by: fam(players[pick.a].pos),
      dThrow, air: (pp.x - p.replay.los) * dir, tAir: thrown ? pick.t - thrown.t : NaN });
  }
}
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[w.length >> 1].toFixed(1) : '-'; };
console.log(`${games} games: ${attempts} attempts, ${rows.length} interceptions (${(100 * rows.length / Math.max(1, attempts)).toFixed(1)}%; NFL 2.2%)`);
console.log(`  attempts with a pbu ${pct(touched.pbu, attempts)}, a drop ${pct(touched.drop, attempts)}, a batted/deflected ball ${pct(touched.deflection, attempts)}; of those touched balls ${pct(touched.anyInt, touched.any)} were intercepted (${touched.ownTip} by the defender who touched it)`);
const tipped = rows.filter(r => r.tipped !== 'clean');
console.log(`  after a tip/drop/pbu ${pct(tipped.length, rows.length)} (${[...new Set(tipped.map(r => r.tipped))].join(', ')})`);
const clean = rows.filter(r => r.tipped === 'clean');
console.log(`  clean ${clean.length}: contested at the receiver (<= 1.5 yd) ${pct(clean.filter(r => r.contested).length, clean.length)}, undercut/away from him ${pct(clean.filter(r => !r.contested).length, clean.length)}`);
console.log(`  interceptor: ${['CB', 'S', 'LB', 'DL'].map(k => `${k} ${pct(rows.filter(r => r.by === k).length, rows.length)}`).join(' ')} | distance from the target at the throw p50 ${med(rows.map(r => r.dThrow))} yd | air yards p50 ${med(rows.map(r => r.air))} | air time p50 ${med(rows.map(r => r.tAir))} s`);
