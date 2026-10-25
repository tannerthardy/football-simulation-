/** Where YAC comes from: yards before first contact vs after, by depth and coverage. */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const rng = new Rng(Number(process.argv[3] ?? 21));
const rows: Array<{ yac: number; pre: number; air: number; cov: string; con: string; sep: number; fail: number; ft: number }> = [];
for (let g = 0; g < Number(process.argv[2] ?? 6); g++) {
  const res = simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const s = p.stats;
    if (!s?.completed || !p.replay || s.yac === undefined) continue;
    const ev = p.replay.events;
    const c = ev.find((e) => e.type === 'catch');
    const firstFail = ev.find((e) => (e.type === 'missed_tackle' || e.type === 'broken_tackle') && e.t > (c?.t ?? 0));
    // yards from catch to first defender within 1.2 yd (contact proxy) using frames
    const fr = p.replay.frames;
    const ri = c?.a ?? -1;
    let pre = s.yac, ft = 99;
    if (c && ri >= 0) {
      const cx = fr.find((f) => f.t >= c.t)?.agents[ri * 3] ?? 0;
      for (const f of fr) {
        if (f.t < c.t) continue;
        const x = f.agents[ri * 3], y = f.agents[ri * 3 + 1];
        let near = Infinity;
        for (let j = 0; j < 22; j++) if (p.replay.players[j].team === 'D') near = Math.min(near, Math.hypot(f.agents[j * 3] - x, f.agents[j * 3 + 1] - y));
        if (near < 1.3) { pre = x - cx; ft = f.t - c.t; break; }
      }
    }
    rows.push({ yac: s.yac, pre, air: s.airYards ?? 0, cov: (p.defense.match(/Cover [0-9]( Man)?|Tampa 2|2-Man/)?.[0] ?? '?'), con: p.call.split('—').pop()!.trim(), sep: s.separation ?? 0, fail: firstFail ? 1 : 0, ft });
  }
}
const avg = (a: number[]) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(2);
console.log('receptions', rows.length, 'YAC', avg(rows.map((r) => r.yac)), 'pre-contact', avg(rows.map((r) => r.pre)), 'time-to-contact', avg(rows.filter((r) => r.ft < 99).map((r) => r.ft)), 'any failed tackle', avg(rows.map((r) => r.fail)));
for (const [lo, hi] of [[-10, 0], [0, 5], [5, 10], [10, 20], [20, 60]]) {
  const b = rows.filter((r) => r.air >= lo && r.air < hi);
  console.log(`air ${lo}..${hi}: n=${b.length} yac=${avg(b.map((r) => r.yac))} pre=${avg(b.map((r) => r.pre))} sep=${avg(b.map((r) => r.sep))} ttc=${avg(b.filter((r) => r.ft < 99).map((r) => r.ft))} fail=${avg(b.map((r) => r.fail))}`);
}
const big = rows.filter((r) => r.yac >= 15);
console.log(`\nYAC>=15: ${big.length} (${(100 * big.length / rows.length).toFixed(1)}%), with failed tackle ${big.filter((r) => r.fail).length}, pre-contact avg ${avg(big.map((r) => r.pre))}`);
const byCon: Record<string, number[]> = {};
for (const r of big) (byCon[r.con] ??= []).push(r.yac);
console.log(Object.entries(byCon).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => `${k}:${v.length}`).join(' '));
