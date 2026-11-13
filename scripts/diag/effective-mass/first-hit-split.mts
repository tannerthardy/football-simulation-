// The first 0.2 s of a front-on hit, by source (Integration, 2026-11-10). Fixed zone runs, one arm per process. The
// first defender within 1.0 yd of the carrier after the handoff, within 45 deg ahead of his travel. Each tick for 0.2 s
// (4 ticks) after proximity, the runner's velocity change along his approach axis (the travel at proximity), in yd/s,
// split by source:
//   ground        his ground impulse / his mass
//   torso normal  the torso contact rows' normal impulses on him (report.contacts, along the current line of centres)
//   grasp, hands  joint forces on him
//   rest          everything else (torso friction and the relax pass's tangential share, other bodies' contacts)
// and the hitter's change along the same axis by the same split; plus the runner's ground share of its limit and of
// his push budget, and his request along the axis. Prints means per tick and the 0.2 s totals, by offset band.
// usage: node --import tsx scripts/diag/effective-mass/first-hit-split.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const force = (j: any, onB: boolean) => { const n = j.normalForceOnB ?? { x: 0, y: 0 }, t = j.tangentForceOnB ?? { x: 0, y: 0 }, f = j.forceOnB, s = onB ? 1 : -1;
  return f && (f.x || f.y) ? { x: s * f.x, y: s * f.y } : { x: s * (n.x + t.x), y: s * (n.y + t.y) }; };
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let t0 = -1, c0: any = null, h0: any = null, ux = 0, uy = 0, done = false, row: any = null;
  sim.tick = () => {
    const pre = c0 && h0 ? { r: { ...c0.vel }, h: { ...h0.vel } } : null;
    tick(); const c = sim.carrier, w = sim.world; if (done || !c || sim.handoffAt < 0 || !w) return;
    if (t0 < 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0); if (!d) return;
      const sp = Math.hypot(c.vel.x, c.vel.y); if (sp < 1) { done = true; return; }
      ux = c.vel.x / sp; uy = c.vel.y / sp; const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
      if ((rx * ux + ry * uy) / rd < Math.SQRT1_2) { done = true; return; }
      t0 = sim.t; c0 = c; h0 = d; row = { off: Math.abs(-rx * uy + ry * ux), v0: sp, ticks: [] as any[] }; rows.push(row); return; }
    const k = Math.round((sim.t - t0) / sim.dt); if (k > 4 || c !== c0 || !pre) { if (k > 4) done = true; return; }
    const dt = sim.dt, rep = sim.lastStep, U = (v: any) => v.x * ux + v.y * uy;
    const split = (a: any, vel0: any) => { const m = a.profile.massKg, i = w.indexOf(a.body); const g = rep.groundImpulse[i];
      let tn = { x: 0, y: 0 }; for (const ct of rep.contacts ?? []) { if (ct.i !== i && ct.j !== i) continue; const o = ct.i === i ? ct.j : ct.i, ob = w.bodies?.[o] ?? sim.agents.find((q: any) => w.indexOf(q.body) === o)?.body; if (!ob) continue;
        const nx = a.pos.x - ob.pos.x, ny = a.pos.y - ob.pos.y, nd = Math.hypot(nx, ny) || 1; tn.x += ct.impulse * nx / nd / m; tn.y += ct.impulse * ny / nd / m; }
      let gr = { x: 0, y: 0 }, hd = { x: 0, y: 0 }; for (const j of w.joints) { const onB = j.b === a.body, onA = j.a === a.body; if (!onA && !onB) continue; const f = force(j, onB);
        if (j.kind === 'grasp') { gr.x += f.x * dt / m; gr.y += f.y * dt / m; } else if (j.kind === 'hands') { hd.x += f.x * dt / m; hd.y += f.y * dt / m; } }
      const dv = { x: a.vel.x - vel0.x, y: a.vel.y - vel0.y }, gd = { x: g.x / m, y: g.y / m };
      return { dv: U(dv), ground: U(gd), gmag: Math.hypot(gd.x, gd.y), gperp: gd.x * -uy + gd.y * ux, torsoN: U(tn), grasp: U(gr), hands: U(hd), rest: U(dv) - U(gd) - U(tn) - U(gr) - U(hd),
        gshare: Math.hypot(g.x, g.y) / (rep.groundImpulseLimit[i] || 1), push: Math.hypot(g.x, g.y) / dt / supportParams(a.profile).pushForce,
        req: sim.intents?.[a.idx]?.vel ? U(sim.intents[a.idx].vel) : NaN, v: U(a.vel),
        lean: Math.hypot(w.braceX?.[i] ?? 0, w.braceY?.[i] ?? 0) / m, leanAlong: ((w.braceX?.[i] ?? 0) * ux + (w.braceY?.[i] ?? 0) * uy) / m, felt: Math.hypot(a.body.support?.felt?.x ?? 0, a.body.support?.felt?.y ?? 0) / m,
        pushReq: sim.intents?.[a.idx]?.push ?? 0, alpha: w.alpha?.[i] ?? NaN, fvAlong: Math.max(0, 1 - U(a.vel) / a.profile.vmax), state: a.body.support?.state === 'up' ? 1 : 0,
        load: Math.hypot(a.body.support?.load?.x ?? 0, a.body.support?.load?.y ?? 0) / m }; };
    row.ticks[k] = { r: split(c, pre.r), h: split(h0, pre.h) }; };
  sim.run();
}
const R = rows.filter(r => r.ticks.filter(Boolean).length === 4);
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
for (const [lab, lo, hi] of [['all', 0, 9], ['offset < 0.15', 0, .15], ['0.15-0.3', .15, .3], ['0.3+', .3, 9]] as const) {
  const S = R.filter(r => r.off >= lo && r.off < hi); if (!S.length) continue;
  const tot = (who: 'r' | 'h', key: string) => mean(S.map(r => [1, 2, 3, 4].reduce((s, k) => s + r.ticks[k][who][key], 0)));
  console.log(`${lab.padEnd(14)} n ${String(S.length).padStart(3)} | runner v0 ${mean(S.map(r => r.v0)).toFixed(2)}, at +0.2 ${mean(S.map(r => r.ticks[4].r.v)).toFixed(2)} | runner dv ${f(tot('r', 'dv'))} = ground ${f(tot('r', 'ground'))} torso-normal ${f(tot('r', 'torsoN'))} grasp ${f(tot('r', 'grasp'))} hands ${f(tot('r', 'hands'))} rest ${f(tot('r', 'rest'))}`);
  console.log(`${''.padEnd(14)}       | hitter dv ${f(tot('h', 'dv'))} = ground ${f(tot('h', 'ground'))} torso-normal ${f(tot('h', 'torsoN'))} grasp ${f(tot('h', 'grasp'))} rest ${f(tot('h', 'rest'))} | runner ground share of limit ${mean(S.flatMap(r => [1, 2, 3, 4].map(k => r.ticks[k].r.gshare))).toFixed(2)}, of push ${mean(S.flatMap(r => [1, 2, 3, 4].map(k => r.ticks[k].r.push))).toFixed(2)}, request along axis ${mean(S.flatMap(r => [1, 2, 3, 4].map(k => r.ticks[k].r.req))).toFixed(2)} | runner ground |.| ${tot('r', 'gmag').toFixed(2)}, along ${f(tot('r', 'ground'))}, across ${f(tot('r', 'gperp'))} yd/s over 0.2 s`);
  for (const k of [1, 2, 3, 4]) console.log(`${''.padEnd(14)}   t+${(k * .05).toFixed(2)} runner: load ${mean(S.map(r => r.ticks[k].r.load)).toFixed(1)} felt ${mean(S.map(r => r.ticks[k].r.felt)).toFixed(1)} lean ${mean(S.map(r => r.ticks[k].r.lean)).toFixed(1)} [push req ${mean(S.map(r => r.ticks[k].r.pushReq)).toFixed(2)} (zero ${(100*S.filter(r => !r.ticks[k].r.pushReq).length/S.length).toFixed(0)}%), avail ${mean(S.map(r => r.ticks[k].r.alpha)).toFixed(2)}, f-v ${mean(S.map(r => r.ticks[k].r.fvAlong)).toFixed(2)}, up ${(100*mean(S.map(r => r.ticks[k].r.state))).toFixed(0)}%] (along ${f(mean(S.map(r => r.ticks[k].r.leanAlong)))}) yd/s^2 | dv ${f(mean(S.map(r => r.ticks[k].r.dv)))} ground ${f(mean(S.map(r => r.ticks[k].r.ground)))} torsoN ${f(mean(S.map(r => r.ticks[k].r.torsoN)))} grasp ${f(mean(S.map(r => r.ticks[k].r.grasp)))} rest ${f(mean(S.map(r => r.ticks[k].r.rest)))}`);
}
