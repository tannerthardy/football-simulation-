// Holds that never finish (Integration, 2026-11-10): grasps on a carrier that last >= 0.3 s while he averages
// >= 4 yd/s. Per held tick, along the carrier's travel (+ = his way): the holder's requested speed against the
// carrier's speed (does he ask to plant, or to run along?), the holder's achieved speed, his ground force (+ drives
// with the runner, - brakes) as a share of his traction limit, the grasp's pull on the carrier along his path (from the
// joint's force on him), and the gates of tackle.ts's two finishes: drop weight (leg share >= 0.35, secure >= 0.6,
// bond >= 0.4 s, dragged) and roll (tight wrap, secure >= 0.5). Classified per hold:
//   running along  holder asks >= 80% of the carrier's speed on most ticks;
//   towed          he asks for less (a plant) but is carried at the carrier's speed.
// Settings at load: run per arm. usage: node --import tsx scripts/diag/effective-mass/unfinished-holds.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/matched-restage';
const holds: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const [pi, p] of (JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const tick = sim.tick.bind(sim); const H = new Map<any, any>();
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || !sim.lastStep) return; const cs = Math.hypot(c.vel.x, c.vel.y); if (cs < 0.3) return;
    const ux = c.vel.x / cs, uy = c.vel.y / cs;
    for (const j of sim.world.joints) { if (j.kind !== 'grasp' || j.broken || j.b !== c.body) continue;
      const d = sim.agents.find((a: any) => a.body === j.a); if (!d) continue;
      let h = H.get(j); if (!h) { h = { id: `s${seed}-${pi}`, slot: d.slot, origin: j.origin, legs: j.legs, t0: sim.t, ticks: [] }; H.set(j, h); }
      const req = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, i = d.idx, g = sim.lastStep.groundImpulse[i], lim = sim.lastStep.groundImpulseLimit[i];
      const fOn = { x: (j.normalForceOnB?.x ?? 0) + (j.tangentForceOnB?.x ?? 0), y: (j.normalForceOnB?.y ?? 0) + (j.tangentForceOnB?.y ?? 0) };
      const secure = (sim.bond?.grip?.get(d) ?? 0);
      h.ticks.push({ cs, req: req.x * ux + req.y * uy, hv: d.vel.x * ux + d.vel.y * uy, gf: lim > 0 ? (g.x * ux + g.y * uy) / lim : NaN,
        pull: (fOn.x * ux + fOn.y * uy) / (c.profile.massKg * 10.72), up: d.body.support?.state === 'up', secure, bondAge: sim.bond ? sim.t - sim.bond.start : 0 }); } };
  sim.run();
  for (const h of H.values()) { const n = h.ticks.length; if (n * 0.05 < 0.3) continue; const mv = h.ticks.reduce((a: number, t: any) => a + t.cs, 0) / n; if (mv < 4) continue; holds.push({ ...h, dur: n * 0.05, mv }); }
}
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const frac = (h: any, f: (t: any) => boolean) => h.ticks.filter(f).length / h.ticks.length;
for (const h of holds) h.kind = frac(h, (t: any) => t.req >= 0.8 * t.cs) >= 0.5 ? 'running along' : 'towed';
console.log(`holds >= 0.3 s with the carrier averaging >= 4 yd/s: ${holds.length}`);
for (const k of ['running along', 'towed']) { const g = holds.filter(h => h.kind === k); if (!g.length) continue; const T = g.flatMap(h => h.ticks);
  console.log(`  ${k.padEnd(13)} n ${String(g.length).padStart(3)} | duration p50 ${q(g.map(h => h.dur)).toFixed(2)} s, carrier ${q(g.map(h => h.mv)).toFixed(1)} yd/s | holder: asks ${q(T.map((t: any) => t.req)).toFixed(2)}, moves ${q(T.map((t: any) => t.hv)).toFixed(2)} along the carrier's path; ground force ${q(T.map((t: any) => t.gf)).toFixed(2)} of his limit (braking on ${(100 * T.filter((t: any) => t.gf < -0.1).length / T.length).toFixed(0)}% of ticks); on his feet ${(100 * T.filter((t: any) => t.up).length / T.length).toFixed(0)}%`);
  console.log(`  ${''.padEnd(13)}         grasp pull on the carrier along his path ${q(T.map((t: any) => t.pull)).toFixed(2)} g (p10 ${q(T.map((t: any) => t.pull), 0.1).toFixed(2)}) | leg share p50 ${q(g.map(h => h.legs)).toFixed(2)} (>= 0.35: ${g.filter(h => h.legs >= 0.35).length}/${g.length}) | secure p50 ${q(T.map((t: any) => t.secure)).toFixed(2)} (>= 0.6 on ${(100 * T.filter((t: any) => t.secure >= 0.6).length / T.length).toFixed(0)}% of ticks) | origins ${[...new Set(g.map(h => h.origin))].slice(0, 6).join(', ')}`);
}
for (const h of holds.sort((a, b) => b.dur - a.dur).slice(0, 6)) console.log(`  ${h.id} ${h.slot}/${h.origin} legs ${h.legs.toFixed(2)} ${h.dur.toFixed(2)} s at ${h.mv.toFixed(1)} yd/s: ${h.kind}; holder asks ${q(h.ticks.map((t: any) => t.req)).toFixed(1)} moves ${q(h.ticks.map((t: any) => t.hv)).toFixed(1)}; ground ${q(h.ticks.map((t: any) => t.gf)).toFixed(2)}; pull ${q(h.ticks.map((t: any) => t.pull)).toFixed(2)} g; secure ${q(h.ticks.map((t: any) => t.secure)).toFixed(2)}`);
