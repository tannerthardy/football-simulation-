/** What happens after the catch in simulated games (observation only; flags
 * from the environment). For every completed pass: the first defensive act
 * after the catch (wrap, miss, hit) and by whom, whether a wrap later broke
 * (broken_tackle), how many defenders wrapped before the whistle, and the
 * gain, split by gain band. Same team generation as depth/games.ts.
 * node --import tsx scripts/diag/depth/aftercatch.ts [--seed 101] [--games 4] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '4'));
const fam = (pos: string) => /^(DT|EDGE|DE|NT)$/.test(pos) ? 'DL' : pos === 'LB' ? 'LB' : 'DB';
type Row = { gain: number; yac: number; first: string; by: string; broke: boolean; wrappers: number; misses: number; tFirst: number; dFirst: number };
const rows: Row[] = [];
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed, record: true });
  for (const p of r.log) {
    if (p.kind !== 'pass' || p.nullified || !p.replay) continue;
    const ev = p.replay.events, players = p.replay.players;
    const c = ev.find(e => e.type === 'catch');
    if (!c) continue;
    const after = ev.filter(e => e.t >= c.t && e.a !== undefined && players[e.a!]?.team === 'D');
    const first = after.find(e => ['tackle_wrap', 'missed_tackle', 'hit'].includes(e.type));
    // Air yards from the catch spot, oriented as sim-export does: the offense
    // lines up behind the line at the first frame.
    const f0 = p.replay.frames[0].agents, off = players.map((q, i) => q.team === 'O' ? f0[i * 3] : NaN).filter(Number.isFinite);
    const dir = off.reduce((a, b) => a + b, 0) / off.length < p.replay.los ? 1 : -1;
    const air = c.pos ? (c.pos.x - p.replay.los) * dir : 0;
    const dFirst = first?.pos && c.pos ? Math.hypot(first.pos.x - c.pos.x, first.pos.y - c.pos.y) : NaN;
    rows.push({ gain: p.yards, yac: p.yards - air, tFirst: first ? first.t - c.t : NaN, dFirst, first: first ? first.type : 'none', by: first ? fam(players[first.a!].pos) : '-',
      broke: ev.some(e => e.t >= c.t && e.type === 'broken_tackle'),
      wrappers: new Set(after.filter(e => e.type === 'tackle_wrap').map(e => e.a)).size,
      misses: after.filter(e => e.type === 'missed_tackle').length });
  }
}
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`air yards check: median ${med(rows.map(x => x.gain - x.yac))} (should be positive)`);
for (const [name, lo, hi] of [['all', -99, 999], ['YAC <5', -99, 5], ['YAC 5-9', 5, 10], ['YAC 10-19', 10, 20], ['YAC 20+', 20, 999]] as const) {
  const r = rows.filter(x => x.yac >= lo && x.yac < hi);
  const by = (k: string) => r.filter(x => x.first === k).length;
  console.log(`${name.padEnd(8)} catches ${String(r.length).padStart(4)} | first act: wrap ${pct(by('tackle_wrap'), r.length)} miss ${pct(by('missed_tackle'), r.length)} hit ${pct(by('hit'), r.length)} none ${pct(by('none'), r.length)}`
    + ` | first actor DB ${pct(r.filter(x => x.by === 'DB').length, r.length)} LB ${pct(r.filter(x => x.by === 'LB').length, r.length)}`
    + ` | first act at +${med(r.map(x => x.tFirst))} s, ${med(r.map(x => x.dFirst))} yd from the catch spot | a wrap broke ${pct(r.filter(x => x.broke).length, r.length)} | wrappers p50 ${[...r.map(x => x.wrappers)].sort((a, b) => a - b)[Math.floor(r.length / 2)] ?? '-'} | misses/catch ${(r.reduce((a, x) => a + x.misses, 0) / Math.max(1, r.length)).toFixed(2)}`);
}
