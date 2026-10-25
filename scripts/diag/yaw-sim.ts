/**
 * Sim side of scripts/data/yaw_speed_audit.py and yaw_capability_audit.py
 * (KNOWN_PROBLEMS TKL-4, COV-6): LB/DB body yaw after the snap, by speed.
 *   node --import tsx scripts/diag/yaw-sim.ts [seed] [--games 2]
 * Same operator as the tracking scripts: 10 Hz frames, speed from positions.
 */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';

const argv = process.argv.slice(2);
const gi = argv.indexOf('--games');
const games = gi >= 0 ? Number(argv[gi + 1]) || 1 : 2;
const seed = Number(argv.find((a, i) => !a.startsWith('--') && (gi < 0 || i !== gi + 1)) ?? 7);
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const BINS = [[0, 2], [2, 4], [4, 6], [6, 99]] as const;
const wrap = (d: number) => ((d + 180) % 360 + 360) % 360 - 180;
const binOf = (s: number) => { const b = BINS.find(([lo, hi]) => s >= lo && s < hi); return b ? `${b[0]}-${b[1]}` : null; };
const yaw: Record<string, number[]> = {}, windows: Record<string, [number, number]> = {};
const fastest: Record<string, number[]> = {}, turn150: Record<string, number[]> = {};
for (let g = 0; g < games; g++) {
  for (const p of simulateGame(home, away, { seed: seed + g, record: true }).log) {
    const r = p.replay;
    if (!r || (p.kind !== 'run' && p.kind !== 'pass')) continue;
    const F = r.frames.filter(f => f.t >= 0);
    r.players.forEach((pl, i) => {
      if (pl.team !== 'D' || /^(DE|DT|NT)/.test(pl.slot)) return;
      const rows = F.map((f, k) => {
        const a = F[Math.max(0, k - 1)], b = F[Math.min(F.length - 1, k + 1)];
        return { s: Math.hypot(b.agents[i * 3] - a.agents[i * 3], b.agents[i * 3 + 1] - a.agents[i * 3 + 1]) / Math.max(1e-6, b.t - a.t),
          o: f.agents[i * 3 + 2] * 180 / Math.PI };
      });
      const best: Record<string, number> = {};
      rows.forEach((row, k) => {
        const b = binOf(row.s);
        if (!b) return;
        if (k + 1 < rows.length) (yaw[b] ??= []).push(Math.abs(wrap(rows[k + 1].o - row.o)) * 10);
        if (k + 2 < rows.length) {
          const swing = Math.abs(wrap(rows[k + 2].o - row.o));
          const w = windows[b] ??= [0, 0];
          w[0]++;
          if (swing >= 90) w[1]++;
          best[b] = Math.max(best[b] ?? 0, swing / 0.2);
        }
      });
      for (const [b, v] of Object.entries(best)) (fastest[b] ??= []).push(v);
      // Cumulative same-direction turns of 150 deg or more (3 deg/frame dead band).
      for (let k = 0; k < rows.length - 1;) {
        let start = k, acc = 0, j = k, sign = 0;
        while (j < rows.length - 1) {
          const d = wrap(rows[j + 1].o - rows[j].o);
          if (Math.abs(d) < 3) { if (acc === 0) start = j + 1; j++; continue; }
          if (sign && (d > 0) !== (sign > 0)) break;
          sign = d > 0 ? 1 : -1; acc += Math.abs(d); j++;
          if (acc >= 150) { const b = binOf(rows[start].s); if (b) (turn150[b] ??= []).push((j - start) / 10); break; }
        }
        k = Math.max(j, k + 1);
      }
    });
  }
}
const q = (v: number[] = []) => {
  const s = [...v].sort((a, b) => a - b), at = (p: number) => s.length ? +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(1) : null;
  return { n: s.length, p50: at(.5), p90: at(.9), p99: at(.99) };
};
const report: Record<string, unknown> = {};
for (const [lo, hi] of BINS) {
  const b = `${lo}-${hi}`, w = windows[b] ?? [0, 0];
  report[`${b} yd/s`] = { yawDegS: q(yaw[b]), swing90In02s: w[0] ? +(w[1] / w[0]).toFixed(4) : null,
    fastest02sPerPath: q(fastest[b]), turn150Seconds: q(turn150[b]) };
}
console.log(JSON.stringify(report, null, 2));
