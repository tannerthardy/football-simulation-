/** What the defenders in front of a receiver do after the catch (observation
 * only; flags from the environment). At the catch frame: defenders downfield
 * of the receiver within 5 yd either side (infront.py's lane). For catches
 * with one or with two or more in front: whether the nearest one makes the
 * first act (wrap, miss), whether his wrap breaks, how long it takes and how
 * far the receiver has gone, his speed toward the receiver at the catch, and
 * YAC. Same team generation as depth/games.ts.
 * node --import tsx scripts/diag/depth/frontact.ts [--seed 101] [--games 6] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '6'));
type Row = { inFront: number; outcome: string; t: number; d: number; closing: number; dist: number; yac: number; pos: string; back: number; engaged: boolean };
const rows: Row[] = [];
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed, record: true });
  for (const p of r.log) {
    if (p.kind !== 'pass' || p.nullified || !p.replay) continue;
    const { events: ev, players, frames, los } = p.replay;
    const c = ev.find(e => e.type === 'catch');
    if (!c || c.a === undefined || !c.pos) continue;
    const f0 = frames[0].agents, off = players.map((q, i) => q.team === 'O' ? f0[i * 3] : NaN).filter(Number.isFinite);
    const dir = off.reduce((a, b) => a + b, 0) / off.length < los ? 1 : -1;
    const k = frames.reduce((best, f, i) => Math.abs(f.t - c.t) < Math.abs(frames[best].t - c.t) ? i : best, 0);
    const at = (i: number, fi = k) => ({ x: frames[fi].agents[i * 3], y: frames[fi].agents[i * 3 + 1] });
    const rc = at(c.a);
    const front = players.map((q, i) => ({ q, i })).filter(({ q, i }) => q.team === 'D'
      && (at(i).x - rc.x) * dir > 0 && Math.abs(at(i).y - rc.y) < 5).map(({ i }) => i)
      .sort((a, b) => Math.hypot(at(a).x - rc.x, at(a).y - rc.y) - Math.hypot(at(b).x - rc.x, at(b).y - rc.y));
    const air = (c.pos.x - los) * dir, yac = p.yards - air;
    if (!front.length) { rows.push({ inFront: 0, outcome: '-', t: NaN, d: NaN, closing: NaN, dist: NaN, yac, pos: '-', back: NaN, engaged: false }); continue; }
    const m = front[0], next = Math.min(frames.length - 1, k + 1), dt = frames[next].t - frames[k].t || 1;
    const mv = { x: (at(m, next).x - at(m).x) / dt, y: (at(m, next).y - at(m).y) / dt };
    const dist = Math.hypot(at(m).x - rc.x, at(m).y - rc.y);
    const closing = (mv.x * (rc.x - at(m).x) + mv.y * (rc.y - at(m).y)) / (dist || 1);
    const mine = ev.filter(e => e.t >= c.t && e.a === m && ['tackle_wrap', 'missed_tackle', 'hit'].includes(e.type));
    const firstAny = ev.find(e => e.t >= c.t && e.a !== undefined && players[e.a]?.team === 'D' && ['tackle_wrap', 'missed_tackle', 'hit'].includes(e.type));
    const act = mine[0];
    const broke = act?.type === 'tackle_wrap' && ev.some(e => e.t > act.t && e.type === 'broken_tackle' && (e.b === m || e.a === m));
    const outcome = !act ? (firstAny ? 'another first' : 'nobody') : act !== firstAny ? 'another first'
      : act.type === 'missed_tackle' ? 'he misses' : act.type === 'tackle_wrap' ? (broke ? 'his wrap breaks' : 'his wrap holds') : 'hit';
    // Downfield (retreating) speed at the catch; whether a block engagement on him was live.
    const back = mv.x * dir;
    const engaged = ev.some(e => e.t <= c.t && e.type === 'block_contact' && (e.a === m || e.b === m))
      && !ev.some(e => e.t <= c.t && e.type === 'shed' && (e.a === m || e.b === m));
    if (process.env.SHOW && outcome === process.env.SHOW && front.length === 1) {
      const recv = players.map((q, i) => ({ q, i })).filter(({ q }) => q.team === 'O' && !['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(q.slot));
      const near = recv.reduce((b, x) => Math.hypot(at(x.i).x - at(m).x, at(x.i).y - at(m).y) < Math.hypot(at(b.i).x - at(m).x, at(b.i).y - at(m).y) ? x : b);
      const later = frames.findIndex(f => f.t >= c.t + 1);
      const mv1 = later > 0 ? Math.hypot(at(m, later).x - at(m).x, at(m, later).y - at(m).y) : NaN;
      console.log(`SHOW g${seed} #${p.index} ${p.defense} | ${players[m].slot} ${dist.toFixed(1)} yd from ${players[c.a].slot}; nearest receiver ${players[near.i].slot} ${Math.hypot(at(near.i).x - at(m).x, at(near.i).y - at(m).y).toFixed(1)} yd; moved ${mv1.toFixed(1)} yd in 1 s | yac ${yac.toFixed(1)} | ${p.text.slice(0, 80)}`);
    }
    rows.push({ inFront: front.length, outcome, t: act ? act.t - c.t : NaN, d: act?.pos ? Math.hypot(act.pos.x - c.pos.x, act.pos.y - c.pos.y) : NaN, closing, dist, yac, pos: players[m].pos, back, engaged });
  }
}
const med = (v: number[], f = .5) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(f * (w.length - 1))].toFixed(2) : '-'; };
for (const [name, ok] of [['0 in front', (n: number) => n === 0], ['1 in front', (n: number) => n === 1], ['2+ in front', (n: number) => n >= 2]] as const) {
  const r = rows.filter(x => ok(x.inFront));
  console.log(`${name}: ${r.length} catches, YAC p50/p90 ${med(r.map(x => x.yac))}/${med(r.map(x => x.yac), .9)}; nearest in front ${med(r.map(x => x.dist))} yd, closing ${med(r.map(x => x.closing))} yd/s at the catch`);
  for (const o of ['his wrap holds', 'his wrap breaks', 'he misses', 'hit', 'another first', 'nobody']) {
    const s = r.filter(x => x.outcome === o); if (!s.length) continue;
    const byPos = Object.entries(s.reduce((acc, x) => ({ ...acc, [x.pos]: (acc[x.pos] ?? 0) + 1 }), {} as Record<string, number>)).map(([k, v]) => `${k} ${v}`).join(' ');
    console.log(`  ${o.padEnd(16)} ${String(s.length).padStart(4)} (${(100 * s.length / r.length).toFixed(0)}%) | his act at +${med(s.map(x => x.t))} s, ${med(s.map(x => x.d))} yd from the catch | dist at catch ${med(s.map(x => x.dist))}, closing ${med(s.map(x => x.closing))}, retreating ${med(s.map(x => x.back))} | engaged ${s.filter(x => x.engaged).length} | ${byPos} | YAC p50/p90 ${med(s.map(x => x.yac))}/${med(s.map(x => x.yac), .9)}`);
  }
}
