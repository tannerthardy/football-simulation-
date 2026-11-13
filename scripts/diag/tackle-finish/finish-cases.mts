// Diagnostic, observation only. Lists each zone run in one restage capture with its first-contact class (front-on /
// side-rear, depth), when and how the carrier left his feet, and the play's gain. Usage, from a checkout with
// out/matched-restage/seed7-run.json: node --import tsx scripts/diag/tackle-finish/finish-cases.mts
// Seed 7 restage: first-contact class per zone run (front-on / side-rear, depth), with index and play yards.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const plays = JSON.parse(readFileSync('out/matched-restage/seed7-run.json', 'utf8'));
for (const [i, p] of plays.entries()) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone', 'insideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); let hit: any = null, fall: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || c === sim.qb || c.team !== 'O' || !sim.events.some((e: any) => e.type === 'handoff' || e.type === 'pitch')) return;
    if (!hit) { const d = sim.defense.find((q: any) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) <= 1.0); if (!d) return;
      const sp = Math.hypot(c.vel.x, c.vel.y) || 1, dx = d.pos.x - c.pos.x, dy = d.pos.y - c.pos.y;
      hit = { t: sim.t, x: (c.pos.x - sim.los) * up, front: (dx * c.vel.x + dy * c.vel.y) / (sp * Math.hypot(dx, dy)) > Math.SQRT1_2, d: d.slot }; }
    if (hit && !fall && c.body.support?.state !== 'up') fall = { dt: sim.t - hit.t, fx: (c.body.support?.fall?.x ?? 0) * up, cause: c.body.support?.cause }; };
  const r = sim.run(); if (!hit) continue;
  console.log(`s7-${i} ${st.offCall.run.scheme} contact ${hit.x.toFixed(2)} ${hit.front ? 'front' : 'side/rear'} by ${hit.d} | off feet +${fall?.dt.toFixed(2)} s fall-x ${fall?.fx.toFixed(2)} cause ${fall?.cause} | yards ${r.yards.toFixed(2)} gain ${(Math.min(20, r.yards) - hit.x).toFixed(2)}`);
}
