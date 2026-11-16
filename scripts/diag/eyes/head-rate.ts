// [QB_HEAD=1] node --import tsx scripts/diag/eyes/head-rate.ts
// QB_HEAD's gate (Integration, 2026-11-16): on staged dropbacks while he holds the ball in the pass behavior, his head's
// angular rate each tick (deg/s), and the time from each read change (readIdx) to his eyes reaching the new read (head
// within 0.15 rad of his forecast of the man). Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const rates: number[] = [], arrive: number[] = [];
for (const concept of ['smash', 'dagger', 'mesh', 'stick', 'flood', 'four_verts']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const roster of [3, 7]) for (const seed of [1, 2]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
  let prev: number | null = null, idx = -1, since = 0, pending: any = null;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
    sim.tick(); const b: any = sim.qb.behavior, h = sim.qb.head;
    if (b?.kind !== 'qb-pass' || h === null || h === undefined) continue;
    if (prev !== null) rates.push(Math.abs(Math.atan2(Math.sin(h - prev), Math.cos(h - prev))) / sim.dt * 180 / Math.PI);
    prev = h;
    if (b.phase === 'set' && b.readIdx !== idx) { idx = b.readIdx; since = sim.t; pending = b.reads[idx] ?? null; }
    if (pending) { const p = b.receiverForecasts.get(pending)?.predict(sim.t, 0) ?? pending.pos, br = Math.atan2(p.y - sim.qb.pos.y, p.x - sim.qb.pos.x);
      if (Math.abs(Math.atan2(Math.sin(br - h), Math.cos(br - h))) < 0.15) { arrive.push(sim.t - since); pending = null; } }
  }
}
const q = (v: number[], p: number) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(p * (z.length - 1))] : NaN; };
console.log(`head rate deg/s: p50 ${q(rates, 0.5).toFixed(0)} p95 ${q(rates, 0.95).toFixed(0)} p99 ${q(rates, 0.99).toFixed(0)} max ${Math.max(...rates).toFixed(0)} (n ${rates.length}; over 344: ${rates.filter((r) => r > 344.5).length})`);
console.log(`read change -> eyes on the new read (s): p50 ${q(arrive, 0.5).toFixed(2)} p90 ${q(arrive, 0.9).toFixed(2)} (n ${arrive.length})`);
