/** Why held carriers fall (observation only): the support model's recorded
 * fall cause, the hold's leg share, the holder's relative position and
 * speed at the first hold, and the peak felt load before the fall.
 * node --import tsx scripts/diag/stretch/fallcause.ts [--concepts iz,oz,wz] [--seeds 77,71001,1]
 */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const G = 9.8 * 1.0936;
const rows: any[] = [];
for (const concept of arg('--concepts', 'iz,oz,wz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    // Diagnostic counterfactual (HOLD_ARM): rewrite a new grasp's leg share
    // before its first World step: upper (0), half (x0.5).
    const holdArm = process.env.HOLD_ARM;
    if (holdArm) {
      const seenJ = new WeakSet<object>(), step = sim.world.step.bind(sim.world);
      (sim.world as any).step = (intents: any[], dt: number) => {
        for (const j of sim.world.joints) if (j.kind === 'grasp' && !seenJ.has(j)) {
          seenJ.add(j);
          if (holdArm === 'upper') (j as any).legs = 0;
          if (holdArm === 'half') (j as any).legs *= .5;
        }
        return step(intents, dt);
      };
    }
    let r: any = null;
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      const c = sim.carrier, b = sim.bond;
      if (!c || c.team !== 'O' || sim.handoffAt < 0) continue;
      const s = c.body.support!;
      if (b && !r) {
        const d = b.tacklers[0], j = b.holds?.get(d) as any;
        const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
        const cs = Math.hypot(c.vel.x, c.vel.y);
        const rel = Math.hypot(d.vel.x - c.vel.x, d.vel.y - c.vel.y);
        const cosA = cs > .5 ? -(c.vel.x * dx + c.vel.y * dy) / (cs * dd) : 0;
        r = { depth0: (c.pos.x - sim.los) * sim.attackDir('O'), t0: sim.t, legs: j?.legs ?? 0, origin: j?.origin, rel, cosA, ds: Math.hypot(d.vel.x, d.vel.y), cs, mass: d.profile.massKg / c.profile.massKg, peak: 0, cause: null, fellAt: null, peakXi: 0 };
      }
      if (r && r.fellAt === null) {
        r.peak = Math.max(r.peak, Math.hypot(s.felt.x, s.felt.y) / (c.profile.massKg * G));
        if (s.state !== 'up') { r.fellAt = sim.t - r.t0; r.cause = s.cause ?? 'none'; r.causes = s.causes; }
      }
    }
    if (r) { r.after = sim.buildResult().offenseYards - r.depth0; rows.push(r); }
  }
const q = (v: number[], f: number) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
const fell = rows.filter(r => r.fellAt !== null);
const tally = (k: (r: any) => string) => { const m: Record<string, number> = {}; for (const r of fell) m[k(r)] = (m[k(r)] ?? 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(', '); };
console.log(`first holds ${rows.length}, carrier fell ${fell.length}; hold->fall p25/50/75 ${q(fell.map(r => r.fellAt), .25)}/${q(fell.map(r => r.fellAt), .5)}/${q(fell.map(r => r.fellAt), .75)} s`);
console.log(`  fall cause: ${tally(r => r.cause)} | yards after first hold p25/50/75 ${q(rows.map(r => r.after), .25)}/${q(rows.map(r => r.after), .5)}/${q(rows.map(r => r.after), .75)}`);
console.log(`  hold origin: ${tally(r => String(r.origin))}`);
console.log(`  leg share of first hold: ${tally(r => r.legs > .5 ? 'legs>0.5' : r.legs > 0 ? 'some legs' : 'upper body')}`);
console.log(`  at first hold: holder speed p50 ${q(rows.map(r => r.ds), .5)}, carrier speed p50 ${q(rows.map(r => r.cs), .5)}, relative speed p50 ${q(rows.map(r => r.rel), .5)} yd/s, holder/carrier mass p50 ${q(rows.map(r => r.mass), .5)}, approach (+1 head-on) p50 ${q(rows.map(r => r.cosA), .5)}`);
console.log(`  peak felt load before the fall / body weight p25/50/75 ${q(fell.map(r => r.peak), .25)}/${q(fell.map(r => r.peak), .5)}/${q(fell.map(r => r.peak), .75)}`);
for (const band of [[0, 2], [2, 4], [4, 99]]) {
  const s = rows.filter(r => r.rel >= band[0] && r.rel < band[1]); const f2 = s.filter(r => r.fellAt !== null);
  console.log(`  relative speed [${band[0]},${band[1]}) n ${s.length}: fell ${(100 * f2.length / Math.max(1, s.length)).toFixed(0)}%, hold->fall p50 ${q(f2.map(r => r.fellAt), .5)} s, peak load p50 ${q(f2.map(r => r.peak), .5)} bw, causes ${(() => { const m: Record<string, number> = {}; for (const r of f2) m[r.cause] = (m[r.cause] ?? 0) + 1; return JSON.stringify(m); })()}`);
}
