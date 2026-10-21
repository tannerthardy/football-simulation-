/** Which holds break, in simulated games (observation only; flags from the
 * environment). Every grasp on a carrier, from the recorded tackle frames:
 * its origin (form / reach / lunge / dive / block, +behind, +assist), the
 * tackler's group, its best grip and legs share, the carrier's speed when
 * it began, and whether it ended in a broken tackle. Split by play type
 * (run / completion). Same team generation as depth/games.ts.
 * node --import tsx scripts/diag/depth/holds.ts [--seed 101] [--games 6] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '6'));
const fam = (pos: string) => /^(DT|EDGE|DE|NT)$/.test(pos) ? 'DL' : pos === 'LB' ? 'LB' : 'DB';
type Hold = { kind: string; origin: string; by: string; grip: number; legs: number; speed: number; broke: boolean };
const holds: Hold[] = [];
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed, record: true, recordLevel: 'full' });
  for (const p of r.log) {
    if (p.nullified || !p.replay || !p.stats) continue;
    const kind = p.kind === 'run' ? 'run' : p.kind === 'pass' && p.stats.completed && !p.stats.interceptedBy ? 'catch' : null;
    if (!kind) continue;
    const { frames, events, players } = p.replay, tel = p.replay.telemetry?.frames ?? [];
    const at = (t: number) => frames.reduce((b, f, k) => Math.abs(f.t - t) < Math.abs(frames[b].t - t) ? k : b, 0);
    const seen = new Map<number, Hold>();
    for (const tf of tel) {
      const tk = tf.tackle, i = at(tf.t);
      if (!tk) continue;
      for (const h of tk.tacklers) {
        let o = seen.get(h.a);
        if (!o) {
          const prev = frames[Math.max(0, i - 1)], cx = tk.carrier;
          const speed = i > 0 ? Math.hypot(frames[i].agents[cx * 3] - prev.agents[cx * 3], frames[i].agents[cx * 3 + 1] - prev.agents[cx * 3 + 1]) / Math.max(1e-6, frames[i].t - prev.t) : NaN;
          o = { kind, origin: h.origin ?? '?', by: fam(players[h.a].pos), grip: 0, legs: h.legs, speed, broke: false };
          seen.set(h.a, o); holds.push(o);
        }
        o.grip = Math.max(o.grip, h.grip ?? 0); o.legs = Math.max(o.legs, h.legs);
      }
    }
    for (const e of events) if (e.type === 'broken_tackle' && e.b !== undefined && seen.has(e.b)) seen.get(e.b)!.broke = true;
  }
}
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[w.length >> 1].toFixed(2) : '-'; };
for (const kind of ['run', 'catch']) {
  const hs = holds.filter(h => h.kind === kind);
  console.log(`${kind}: ${hs.length} holds, broke ${pct(hs.filter(h => h.broke).length, hs.length)}`);
  const base = (o: string) => o.replace('+assist', '').replace('+behind', '');
  const groups = new Map<string, Hold[]>();
  for (const h of hs) { const k = `${base(h.origin)}${h.origin.includes('+behind') ? ' behind' : ''}${h.origin.includes('+assist') ? ' assist' : ''} ${h.by}`; groups.set(k, [...(groups.get(k) ?? []), h]); }
  for (const [k, v] of [...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 12))
    console.log(`  ${k.padEnd(22)} ${String(v.length).padStart(4)} (${pct(v.length, hs.length)}) broke ${pct(v.filter(h => h.broke).length, v.length).padStart(4)} | best grip p50 ${med(v.map(h => h.grip))}, legs ${med(v.map(h => h.legs))}, carrier ${med(v.map(h => h.speed))} yd/s`);
}
