// SPACING_HOLD review (Integration, 2026-11-15): the headway limit hold on film. For each run on the matched-restage run set, one JSON line: yards, stuffed (<= 0 yd), and the ticks
// where the carrier is braking for a teammate ONLY because the hold keeps the limit (the plain test would have dropped it: the teammate is beyond the awareness gap or his swept path
// clears the touch distance), with the gap, the teammate's speed, the lateral miss of the swept line and the speed removed. MODE=film IDS=s7-3,s9-12 prints per-tick rows for those plays.
// Needs the uncommitted __lh hook in src/sim/spacing.ts (measurement only, no RNG, no state).
// usage: [SPACING_HOLD=1 ...] node --import tsx scripts/diag/effective-mass/limit-hold-film.mts > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const film = process.env.MODE === 'film', ids = new Set((process.env.IDS ?? '').split(',').filter(Boolean));
const seeds = (process.env.SEEDS ?? '7,9,11,13,15,17,19,21,23,25,27,29').split(',').map(Number);
for (const seed of seeds) for (const [i, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  const id = `s${seed}-${i}`; if (film && !ids.has(id)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const up = sim.attackDir('O');
  const ev: any[] = []; const rows: string[] = [];
  (globalThis as any).__lh = (a: any, b: any, v: any) => {
    if (a !== sim.carrier) return;
    ev.push({ t: +sim.t.toFixed(2), peer: b.role ?? b.pos?.role ?? '?', gap: +v.gap.toFixed(2), miss: +v.miss.toFixed(2), touch: +v.touch.toFixed(2), allowed: +v.allowed.toFixed(2), closing: +v.closing.toFixed(2),
      cut: +v.cut.toFixed(2), plainAware: v.plainAware, plainLane: v.plainLane, peerSpeed: +Math.hypot(b.vel.x, b.vel.y).toFixed(2), carrierSpeed: +Math.hypot(a.vel.x, a.vel.y).toFixed(2),
      peerAhead: +(((b.pos.x - a.pos.x) * up)).toFixed(2), peerSide: +(b.pos.y - a.pos.y).toFixed(2) });
  };
  const tick = sim.tick.bind(sim);
  if (film) sim.tick = () => { tick(); const c = sim.carrier; if (!c || sim.handoffAt < 0) return;
    const d = sim.defense.reduce((m: any, q: any) => { const r = Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y); return !m || r < m.r ? { q, r } : m; }, null);
    rows.push(`${sim.t.toFixed(2)} c x${((c.pos.x - sim.los) * up).toFixed(1)} y${c.pos.y.toFixed(1)} v${Math.hypot(c.vel.x, c.vel.y).toFixed(1)} hd${Math.round(Math.atan2(c.vel.y, c.vel.x) * 180 / Math.PI)} | nearest def ${d.r.toFixed(1)} @x${((d.q.pos.x - sim.los) * up).toFixed(1)} v${Math.hypot(d.q.vel.x, d.q.vel.y).toFixed(1)}`); };
  const r = sim.run();
  if (film) { console.log(`== ${id} yards ${r.yards.toFixed(2)} ${r.outcome}`); rows.filter((_, k) => k % 3 === 0).forEach(x => console.log(x)); ev.forEach(e => console.log('   HOLD-ONLY', JSON.stringify(e))); continue; }
  const bind = ev.filter(e => e.cut > 0.01);
  console.log(JSON.stringify({ id, yards: +r.yards.toFixed(2), stuffed: r.yards <= 0, outcome: r.outcome, holdTicks: ev.length, bindTicks: bind.length, removed: +bind.reduce((s, e) => s + e.cut, 0).toFixed(2), first: bind[0]?.t ?? null, ev: bind.slice(0, 6) }));
}
