// The second man, sim side (Integration, 2026-11-10). Fixed zone runs, one arm per process. At the first contact (first
// defender within 1.0 yd of the carrier after the handoff), every other defender within 3 yd: blocked (an offensive
// non-carrier within 1.2 yd) and engaged (in a sim engagement as the defender); then over the next 0.5 s: whether he
// comes within 1.0 yd of the runner, his closest approach, whether his engagement ends (shed / released) and when,
// whether he grasps the runner; his requested and achieved velocity toward the runner (yd/s, mean over the window);
// and the closest offensive body to him at +0.25 s. JSON lines, one per such defender.
// usage: node --import tsx scripts/diag/effective-mass/second-man.mts > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
for (let seed = 7; seed <= 29; seed += 2) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let t0 = -1, c0: any = null, up = 1; const track = new Map<any, any>();
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || sim.handoffAt < 0) return;
    if (t0 < 0) { const hit = sim.defense.find((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 1.0); if (!hit) return;
      t0 = sim.t; c0 = c; up = sim.attackDir('O');
      for (const d of sim.defense) { if (d === hit) continue; const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); if (dist > 3) continue;
        const e = (sim.engagements ?? []).find((q: any) => q.defender === d);
        track.set(d, { id: `s${seed}-${pi}`, slot: d.slot, depth: +((c.pos.x - sim.los) * up).toFixed(2), d0: +dist.toFixed(2),
          blocked: sim.offense.some((o: any) => o !== c && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2), engaged: !!e, eng: e,
          arrives: false, closest: dist, endEng: null, grasp: false, req: [], ach: [], nearO: null }); }
      return; }
    if (c !== c0) return; const s = sim.t - t0; if (s > 0.5 + 1e-9) return;
    for (const [d, r] of track) { const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y, dist = Math.hypot(rx, ry) || 1e-9;
      r.closest = Math.min(r.closest, dist); if (dist <= 1.0) r.arrives = true;
      if (r.eng && r.endEng === null && !(sim.engagements ?? []).includes(r.eng)) r.endEng = +s.toFixed(2);
      if (sim.world?.joints?.some((j: any) => j.kind === 'grasp' && j.a === d.body && j.b === c.body)) r.grasp = true;
      const it = sim.intents?.[d.idx]; if (it?.vel) r.req.push((it.vel.x * rx + it.vel.y * ry) / dist);
      r.ach.push((d.vel.x * rx + d.vel.y * ry) / dist);
      if (Math.abs(s - 0.25) < 0.026) { let best = 9, who = ''; for (const o of sim.offense) { if (o === c) continue; const q = Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y); if (q < best) { best = q; who = o.slot; } } r.nearO = { d: +best.toFixed(2), who }; } } };
  sim.run();
  const mean = (v: number[]) => v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null;
  for (const r of track.values()) { delete r.eng; r.closest = +r.closest.toFixed(2); r.req = mean(r.req); r.ach = mean(r.ach); console.log(JSON.stringify(r)); }
}
