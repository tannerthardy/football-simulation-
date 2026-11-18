// Corner turn on a vertical, sim side of scripts/mechanics/cb_turn.py (Coverage, 2026-11-18; reads only). Summary: cb_turn_sum.py.
// usage: [MAN_TURN=1] node --import tsx scripts/diag/coverage/cb-turn.mts OUT.json   (run from the checkout root)
// Sim side of cb_turn.py: corners over a #1 go (four verticals), man (cover1, cover1_off, cover0, cover2man) vs zone
// (cover3, cover4, cover2); facing vs travel, facing to QB (cos), speed, WR speed, cushion every 0.1 s to 3.0 s.
import { writeFileSync } from 'node:fs';
import { sceneSim } from '../../../src/lab/coverage-scene.js';
const res: unknown[] = [];
const covs: Record<string, 'Man' | 'Zone'> = { cover1: 'Man', cover1_off: 'Man', cover0: 'Man', cover2man: 'Man', cover3: 'Zone', cover4: 'Zone', cover2: 'Zone' };
for (const [cov, mz] of Object.entries(covs)) for (const formation of ['gun_doubles_11', 'gun_spread_10']) for (let seed = 1; seed <= 10; seed++) {
  let s: any;
  try { s = sceneSim({ formation, coverage: cov, strong: { 1: 'go', 2: 'seam' }, weak: { 1: 'go', 2: 'seam' }, until: 3.1, seed } as any); } catch { continue; }
  // The QB holds the ball: these reps ask about the corner on a vertical.
  s.throwBall = () => undefined;
  const dir = s.attackDir(s.offense[0].team);
  const pairs = ['CB_S', 'CB_W'].map((cb) => { const C = s.slot(cb); if (!C) return null;
    const W = s.offense.filter((o: any) => ['X', 'Z'].includes(o.slot)).sort((a: any, b: any) => Math.hypot(a.pos.x - C.pos.x, a.pos.y - C.pos.y) - Math.hypot(b.pos.x - C.pos.x, b.pos.y - C.pos.y))[0];
    return W ? { C, W, d0: Math.hypot(W.pos.x - C.pos.x, W.pos.y - C.pos.y), ser: [] as any[] } : null; }).filter(Boolean) as any[];
  for (let k = 0; s.phase === 'live' && s.t < 3.05; k++) {
    if (k % 2 === 0) for (const p of pairs) {
      const f = p.C.facing ?? p.C.body?.facing ?? 0, fx = Math.cos(f), fy = Math.sin(f);
      const sp = Math.hypot(p.C.vel.x, p.C.vel.y);
      const rel = sp > 0.05 ? Math.acos(Math.max(-1, Math.min(1, (fx * p.C.vel.x + fy * p.C.vel.y) / sp))) * 180 / Math.PI : 180;
      const qx = s.qb.pos.x - p.C.pos.x, qy = s.qb.pos.y - p.C.pos.y, qd = Math.hypot(qx, qy) || 1;
      p.ser.push({ t: Math.round(s.t * 10) / 10, face_vs_travel: +rel.toFixed(1), face_qb: +((fx * qx + fy * qy) / qd).toFixed(2), s: +sp.toFixed(2),
        wr_s: +Math.hypot(p.W.vel.x, p.W.vel.y).toFixed(2), cushion: +((p.C.pos.x - p.W.pos.x) * dir).toFixed(2) });
    }
    s.tick();
  }
  for (const p of pairs) if (p.d0 <= 12 && p.ser.length >= 31) res.push({ cov, mz, seed, formation, slot: p.C.slot, press: p.d0 < 2.5, d0: +p.d0.toFixed(1), series: p.ser.slice(0, 31) });
}
writeFileSync(process.argv[2], JSON.stringify(res)); console.log(res.length, 'corners');
