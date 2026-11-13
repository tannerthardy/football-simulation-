// GRASP_PATCH film check (Integration, 2026-11-10): every grasp on a carrier on the fixed run set.
// Per grasp: approach (front / side / behind: the holder's bearing from the runner against the runner's travel at the
// grasp), duration, runner speed in (at the grasp) and out (at its end), the holder's mean speed while holding, and how
// it ended: 'broken' (the World broke the grip), 'runner down', 'whistle' (still on at the end), 'released' (removed
// otherwise). Momentum check: at the grasp, the pair's shared speed along the runner's travel,
// (m_r v_r + m_h v_h) / (m_r + m_h), against the runner's speed 0.15 s later. Multiple holds: runner speed decay over
// 0.3 s while one grasp is on him against two or more. Settings at load: run per arm.
// usage: node --import tsx scripts/diag/effective-mass/hold-audit.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/matched-restage';
const G: any[] = []; const decay: Record<string, number[]> = { one: [], multi: [] }; let runs = 0, stuffs = 0;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8')) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); runs++;
  const holds = new Map<any, any>(); const tick = sim.tick.bind(sim); const hist: any[] = [];
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    const sp = Math.hypot(c.vel.x, c.vel.y); const on = sim.world.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body);
    hist.push({ t: sim.t, sp, n: on.length });
    for (const j of sim.world.joints) { if (j.kind !== 'grasp' || j.b !== c.body) continue;
      let h = holds.get(j);
      if (!h) { const who = sim.agents.find((a: any) => a.body === j.a); const ux = c.vel.x / (sp || 1), uy = c.vel.y / (sp || 1);
        const bx = j.a.pos.x - c.pos.x, by = j.a.pos.y - c.pos.y, bd = Math.hypot(bx, by) || 1, cos = (bx * ux + by * uy) / bd;
        const mr = c.profile.massKg, mh = j.a.profile.massKg, vh = j.a.vel.x * ux + j.a.vel.y * uy;
        h = { slot: who?.slot, approach: cos > 0.5 ? 'front' : cos < -0.5 ? 'behind' : 'side', t0: sim.t, vIn: sp, shared: (mr * sp + mh * vh) / (mr + mh), hv: [], end: '' };
        holds.set(j, h); }
      if (h.end) continue;
      if (j.broken) { h.end = 'broken'; h.t1 = sim.t; h.vOut = sp; continue; }
      if (c.body.support?.state !== 'up') { h.end = 'runner down'; h.t1 = sim.t; h.vOut = sp; continue; }
      h.hv.push(Math.hypot(j.a.vel.x, j.a.vel.y)); h.t1 = sim.t; h.vOut = sp;
      if (h.v15 === undefined && sim.t - h.t0 >= 0.15 - 1e-9) h.v15 = sp; }
    for (const [j, h] of holds) if (!h.end && !sim.world.joints.includes(j)) { h.end = 'released'; } };
  const r = sim.run(); if (r.yards <= 0) stuffs++;
  for (const h of holds.values()) { if (!h.end) h.end = 'whistle'; G.push({ ...h, dur: (h.t1 ?? h.t0) - h.t0, hvm: h.hv.length ? h.hv.reduce((a: number, b: number) => a + b, 0) / h.hv.length : NaN }); }
  for (let i = 0; i + 6 < hist.length; i++) if (hist[i].n >= 1 && hist[i].sp > 2) (hist[i].n >= 2 ? decay.multi : decay.one).push(hist[i + 6].sp / hist[i].sp);
}
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
console.log(`runs ${runs}, stuffed (<= 0 yd) ${(100 * stuffs / runs).toFixed(1)}%; grasps on carriers ${G.length}`);
for (const ap of ['front', 'side', 'behind']) { const g = G.filter(h => h.approach === ap); if (!g.length) continue;
  const ends = ['runner down', 'broken', 'released', 'whistle'].map(e => `${e} ${(100 * g.filter(h => h.end === e).length / g.length).toFixed(0)}%`).join(', ');
  console.log(`  ${ap.padEnd(6)} n ${String(g.length).padStart(4)} | duration p50 ${q(g.map(h => h.dur)).toFixed(2)} s | runner in ${q(g.map(h => h.vIn)).toFixed(2)} -> out ${q(g.map(h => h.vOut)).toFixed(2)} yd/s | holder ${q(g.map(h => h.hvm)).toFixed(2)} yd/s | ends: ${ends}`);
  console.log(`         momentum: shared speed at the grasp ${q(g.map(h => h.shared)).toFixed(2)}, runner at +0.15 s ${q(g.map(h => h.v15)).toFixed(2)} (runner above shared by > 1 yd/s: ${(100 * g.filter(h => h.v15 - h.shared > 1).length / Math.max(1, g.filter(h => Number.isFinite(h.v15)).length)).toFixed(0)}%)`);
}
const keep = G.filter(h => h.dur >= 0.5 && h.vOut >= 0.8 * h.vIn && h.vIn > 3);
console.log(`  holds lasting >= 0.5 s with the runner keeping >= 80% of his speed: ${keep.length} (${(100 * keep.length / G.length).toFixed(1)}%); by approach ${['front', 'side', 'behind'].map(a => `${a} ${keep.filter(h => h.approach === a).length}`).join(', ')}; holder speed p50 ${q(keep.map(h => h.hvm)).toFixed(2)}; ends ${['runner down', 'broken', 'released', 'whistle'].map(e => `${e} ${keep.filter(h => h.end === e).length}`).join(', ')}`);
console.log(`  runner speed kept over 0.3 s while held: one grasp p50 ${q(decay.one).toFixed(2)} (n ${decay.one.length}), two or more ${q(decay.multi).toFixed(2)} (n ${decay.multi.length})`);
