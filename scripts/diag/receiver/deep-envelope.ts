/** How far off the aim can a deep throw land before the receiver cannot get to it? Re-stages plays from a deep-arrival-sim.ts output (same formation, concept, coverage, roster,
 * seed: identical to the throw), and at the throw moves the aim point by M yd short, long or lateral (toward the near sideline) and re-solves the launch, the flight time unchanged.
 * Output per variant: the target's arrival event, ball-to-receiver at it, and whether he secured it.
 *   node --import tsx scripts/diag/receiver/deep-envelope.ts IN.jsonl OUT.jsonl [--max 60] [--mags 0,1,2,3,4,5] [--part 0/4]  */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { solveLaunch, DRAG_SPIRAL } from '../../../src/physics/ball.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const [inf, outf] = process.argv.slice(2); const max = Number(arg('--max', '60')), mags = arg('--mags', '0,1,2,3,4,5').split(',').map(Number);
const [pi, pn] = arg('--part', '0/1').split('/').map(Number);
const rows = readFileSync(inf, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.result === 'secure' || r.result === 'drop' || r.result === 'miss');
const pick = rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / max)) === 0).slice(0, max).filter((_, i) => i % pn === pi);
const ARR = new Set(['secure', 'catch', 'drop', 'miss', 'pbu', 'interception', 'incomplete']); const r2 = (v: number) => Math.round(v * 100) / 100; const lines: string[] = [];
for (const r of pick) for (const dir of ['short', 'long', 'lateral']) for (const m of mags) {
  if (m === 0 && dir !== 'short') continue;
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: r.coverage, concept: r.concept, seed: r.seed, roster: r.roster, formation: r.formation, flip: false }));
  let thr: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => {
    if (!thr && target && m > 0) {
      const side = Math.sign(intended.y - 26.67) || 1; const dx = dir === 'short' ? -m : dir === 'long' ? m : 0, dy = dir === 'lateral' ? m * side : 0;
      const ni = { x: intended.x + dx, y: intended.y + dy, z: intended.z };
      const release = { x: qb.pos.x + Math.cos(qb.body.facing) * 0.3, y: qb.pos.y + Math.sin(qb.body.facing) * 0.3, z: 2.2 };
      v0 = solveLaunch(release, ni, Math.max(0.3, arrivalT - sim.t), DRAG_SPIRAL, sim.wind); intended = ni;
    }
    tb(qb, target, v0, intended, arrivalT, ...rest); if (!thr && target) thr = { t: sim.t, target };
  };
  const tick0 = sim.tick.bind(sim); let arr: any = null, seen = 0, best = 99; let near = 99;
  sim.tick = () => { tick0(); if (!thr) return; const R = thr.target, f = sim.ball.flight; for (; seen < sim.events.length; seen++) { const e = sim.events[seen]; if (ARR.has(e.type) && e.t >= thr.t + 0.1 && !arr) arr = { type: e.type, t: e.t, a: e.a, d: Math.hypot(f.pos.x - R.pos.x, f.pos.y - R.pos.y) }; } if (!arr && sim.ball.kind === 'air') near = Math.min(near, Math.hypot(f.pos.x - R.pos.x, f.pos.y - R.pos.y)); };
  try { sim.run(); } catch { continue; }
  if (!thr) continue; const tgt = thr.target.idx;
  lines.push(JSON.stringify({ concept: r.concept, coverage: r.coverage, roster: r.roster, seed: r.seed, dir, m, event: arr?.type ?? 'none', byTarget: arr ? arr.a === tgt : false, d: arr ? r2(arr.d) : null, closest: r2(near), result: sim.events.filter((e: any) => ['interception', 'catch', 'incomplete'].includes(e.type)).map((e: any) => e.type).join(',') }));
}
writeFileSync(outf, lines.join('\n') + '\n'); console.log(lines.length, 'variants ->', outf);
