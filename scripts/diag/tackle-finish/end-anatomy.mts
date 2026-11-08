// Diagnostic, observation only. Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json
// (scripts/diag/edge/capture-runs.ts). node --import tsx scripts/diag/tackle-finish/end-anatomy.mts
// Zone runs: first proximity contact (defender within 1.0 yd), bond start, how the play ended and when.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const fam: Record<string, string> = { outsideZone: 'OZ', wideZone: 'OZ', insideZone: 'IZ' };
const R: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!fam[st.offCall?.run?.scheme]) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O');
  let hit: any = null, bondAt: number | null = null, why = 'other', end: number | null = null, maxTack = 0, downAt: number | null = null, stallAt: number | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier;
    if (!hit && c && c.team === 'O' && c !== sim.qb && sim.events.some((e: any) => e.type === 'handoff' || e.type === 'pitch')) {
      if (sim.defense.some((q: any) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) <= 1.0)) hit = { t: sim.t, x: (c.pos.x - sim.los) * up }; }
    if (hit && sim.bond && bondAt === null) bondAt = sim.t;
    if (sim.bond) maxTack = Math.max(maxTack, sim.bond.tacklers.length);
    if (hit && c && downAt === null && c.body.support?.state !== 'up') downAt = sim.t;
    if (sim.bond?.down && end === null) { end = sim.t; why = c?.body.support?.state === 'down' ? 'carrier down' : 'stall'; }
  };
  const r = sim.run(); if (end === null) { end = sim.t; why = r.outcome; }
  if (hit) R.push({ x: hit.x, dt: (end ?? sim.t) - hit.t, toBond: bondAt !== null ? bondAt - hit.t : null, why, maxTack, yac: Math.min(r.yards, 20) - hit.x, fall: downAt !== null ? downAt - hit.t : null });
}
const med = (a: number[]) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : '—'; };
for (const [lo, hi] of [[-1, 0], [0, 1], [1, 3]]) { const b = R.filter(r => r.x >= lo && r.x < hi);
  const by: Record<string, any[]> = {}; for (const r of b) (by[r.why] ??= []).push(r);
  console.log(`contact ${lo}..${hi}: n ${b.length}, contact->end med ${med(b.map(r => r.dt))}, ->bond ${med(b.filter(r => r.toBond !== null).map(r => r.toBond))}, ->carrier off feet ${med(b.filter(r => r.fall !== null).map(r => r.fall))}, yac med ${med(b.map(r => r.yac))}, 2+ tacklers ${(100 * b.filter(r => r.maxTack >= 2).length / b.length).toFixed(0)}%`);
  for (const [k, v] of Object.entries(by)) console.log(`   ${k}: ${(100 * v.length / b.length).toFixed(0)}% dt ${med(v.map(r => r.dt))} yac ${med(v.map(r => r.yac))}`); }
