// #1 slant vs go, first 1.5 s after the snap (Coverage, 2026-11-18; reads only): X in gun doubles on slant or go, six coverages x 12 seeds.
// Every 0.1 s: path angle inside of upfield, facing (hips) inside of upfield, inside lateral, depth; and when the weak corner
// first reads the slant under/in. Compare with scripts/mechanics/slant_go_sep.py (NFL reference: slant_go_nfl_ref.json).
// usage: [flags] node --import tsx scripts/diag/coverage/slant-go.mts OUT.json   (run from the checkout root)
import { writeFileSync } from 'node:fs';
import { sceneSim } from '../../../src/lab/coverage-scene.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
const res: unknown[] = [];
for (const cov of ['cover1', 'cover2', 'cover3', 'cover4', 'cover2_match', 'cover3_match'])
  for (const route of ['slant', 'go']) for (let seed = 1; seed <= 12; seed++) {
    let s: any;
    try { s = sceneSim({ formation: 'gun_doubles_11', coverage: cov, strong: { 1: 'go', 2: 'go' }, weak: { 1: route, 2: 'seam' }, until: 1.6, seed } as any); } catch { continue; }
    const X = s.slot('X'), dir = s.attackDir(X.team), side = Math.sign(X.pos.y - s.ballY), inward = -side;
    const y0 = X.pos.y, series: unknown[] = []; let readAt: number | null = null; let readRel = '';
    for (let k = 0; s.phase === 'live' && s.t < 1.55 && s.throwAt < 0; k++) {
      const t = s.t;
      if (k % 2 === 0) {
        const ang = (vx: number, vy: number) => Math.atan2(vy * inward, vx * dir) * 180 / Math.PI;
        const f = X.facing ?? X.body?.facing ?? 0;
        series.push({ t: Math.round(t * 10) / 10, depth: +((X.pos.x - s.los) * dir).toFixed(2), lat_in: +((X.pos.y - y0) * inward).toFixed(2),
          path_in: +ang(X.vel.x, X.vel.y).toFixed(1), hips_in: +ang(Math.cos(f), Math.sin(f)).toFixed(1), s: +Math.hypot(X.vel.x, X.vel.y).toFixed(2) });
      }
      s.tick();
      if (readAt === null) for (const d of s.defense) { const b = d.behavior; if (!(b instanceof CoverageDefender) || d.slot !== 'CB_W') continue;
        const r = b.recordedRule(t).reads.find((q: any) => q.slot === 'X'); if (r && ['under', 'in'].includes(r.release)) { readAt = t; readRel = r.release; } }
    }
    res.push({ cov, seed, route, readAt, readRel, series });
  }
writeFileSync(process.argv[2], JSON.stringify(res));
console.log(res.length, 'routes');
