// Blocked men beside the runner (Integration, 2026-11-10): what cancels their request toward him. Fixed zone runs, one arm
// per process. At the runner's first contact (first defender within 1.0 yd after the handoff), every other defender within
// 2 yd who is blocked (an offensive non-carrier within 1.2 yd). Each tick over the next 0.5 s, along the unit vector from
// him to the runner (yd/s):
//   req        his requested velocity's component
//   dv split   his velocity change: ground force / his mass, hands joints on him, grasps on him, the rest (torso contacts)
// and, per man over the window:
//   engaged ticks; how his engagement ended (event reason) or not; win, control at contact;
//   tackle eligibility each tick, as tackle.ts tryTackles: eligible (free, or free side, or win >= 0.6) and in range
//   (centre distance <= radii + reach x arm share); attempts (missed_tackle / tackle_wrap / grasp on the runner);
//   engaged: the blocker's ground force toward the runner (summed / his mass), his requested velocity toward the runner,
//   and the pair's mass-weighted velocity and their relative velocity toward the runner (means);
//   for men with no engagement, the nearest offensive body: engaged with someone else, and its requested velocity toward
//   him (an active wall) or not.
// usage: node --import tsx scripts/diag/effective-mass/held-split.mts > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const force = (j: any, onB: boolean) => { const n = j.normalForceOnB ?? { x: 0, y: 0 }, t = j.tangentForceOnB ?? { x: 0, y: 0 }, f = j.forceOnB, s = onB ? 1 : -1;
  return f && (f.x || f.y) ? { x: s * f.x, y: s * f.y } : { x: s * (n.x + t.x), y: s * (n.y + t.y) }; };
for (let seed = 7; seed <= 29; seed += 2) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let t0 = -1, c0: any = null; const track = new Map<any, any>();
  sim.tick = () => {
    const pre = new Map<any, any>(); for (const [d] of track) pre.set(d, { vx: d.vel.x, vy: d.vel.y });
    tick(); const c = sim.carrier, w = sim.world; if (!c || sim.handoffAt < 0 || !w) return;
    if (t0 < 0) { const hit = sim.defense.find((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) <= 1.0); if (!hit) return;
      t0 = sim.t; c0 = c;
      for (const d of sim.defense) { if (d === hit) continue; const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
        if (dist > 2 || !sim.offense.some((o: any) => o !== c && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2)) continue;
        const e = d.engagement;
        track.set(d, { id: `s${seed}-${pi}`, slot: d.slot, d0: +dist.toFixed(2), eng0: !!e, win0: e ? +e.win.toFixed(2) : null, ctl0: e ? +e.control.toFixed(2) : null,
          ticks: 0, engTicks: 0, bGround: 0, bReq: 0, pairV: 0, relV: 0, bTicks: 0, req: 0, ground: 0, hands: 0, grasp: 0, rest: 0, dv: 0, elig: 0, inRange: 0, both: 0, attempt: false, ended: null, arrives: false,
          wallEngaged: null, wallReq: null, e }); }
      return; }
    if (c !== c0) return; const s = sim.t - t0; if (s > 0.5 + 1e-9) return; const dt = sim.dt, rep = sim.lastStep;
    for (const [d, r] of track) {
      const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y, dd = Math.hypot(rx, ry) || 1e-9, ux = rx / dd, uy = ry / dd, m = d.profile.massKg, k = w.indexOf(d.body);
      const P = pre.get(d); if (!P || k < 0) continue; if (dd <= 1.0) r.arrives = true;
      const U = (v: any) => v.x * ux + v.y * uy;
      const g = rep.groundImpulse[k]; let hx = 0, hy = 0, gx = 0, gy = 0;
      for (const j of w.joints) { const onB = j.b === d.body, onA = j.a === d.body; if (!onA && !onB) continue; const f = force(j, onB);
        if (j.kind === 'hands') { hx += f.x * dt / m; hy += f.y * dt / m; } else if (j.kind === 'grasp') { gx += f.x * dt / m; gy += f.y * dt / m; } }
      const dv = { x: d.vel.x - P.vx, y: d.vel.y - P.vy }, gr = { x: g.x / m, y: g.y / m };
      r.ticks++; r.dv += U(dv); r.ground += U(gr); r.hands += hx * ux + hy * uy; r.grasp += gx * ux + gy * uy; r.rest += U({ x: dv.x - gr.x - hx - gx, y: dv.y - gr.y - hy - gy });
      const it = sim.intents?.[d.idx]; if (it?.vel) r.req += U(it.vel);
      const e = d.engagement; if (e) r.engTicks++;
      if (e) { const b = e.blocker, kb = w.indexOf(b.body), mb = b.profile.massKg; const gb = rep.groundImpulse[kb];
        r.bTicks++; r.bGround += (gb.x * ux + gb.y * uy) / mb; const bi = sim.intents?.[b.idx]; if (bi?.vel) r.bReq += bi.vel.x * ux + bi.vel.y * uy;
        r.pairV += ((d.vel.x * m + b.vel.x * mb) * ux + (d.vel.y * m + b.vel.y * mb) * uy) / (m + mb); r.relV += (d.vel.x - b.vel.x) * ux + (d.vel.y - b.vel.y) * uy; }
      if (r.e && r.ended === null && !(sim.engagements ?? []).includes(r.e)) r.ended = +s.toFixed(2);
      const blockerY = e ? e.blocker.pos.y - d.pos.y : 0, freeSide = !!e && Math.abs(blockerY) >= 0.25 && blockerY * ry < 0;
      const elig = !e || freeSide || e.win >= 0.6;
      const arms = c.profile.radius + d.profile.radius + d.profile.reach * (e ? (freeSide ? 0.7 - 0.3 * Math.max(0, Math.min(1, e.control)) : 0.4) : 1.0);
      const inR = dd <= arms + (e ? 0 : 0.45);
      if (elig) r.elig++; if (inR) r.inRange++; if (elig && inR) r.both++;
      if (w.joints.some((j: any) => j.kind === 'grasp' && j.a === d.body && j.b === c.body)) r.attempt = true;
      if (!r.eng0 && r.wallEngaged === null) { let best: any = null, bd = 9; for (const o of sim.offense) { if (o === c) continue; const q = Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y); if (q < bd) { bd = q; best = o; } }
        if (best) { const ox = d.pos.x - best.pos.x, oy = d.pos.y - best.pos.y, od = Math.hypot(ox, oy) || 1, oi = sim.intents?.[best.idx];
          r.wallEngaged = !!best.engagement; r.wallReq = oi?.vel ? +((oi.vel.x * ox + oi.vel.y * oy) / od).toFixed(2) : null; } }
    } };
  sim.run();
  const ev = sim.events ?? [];
  for (const [d, r] of track) { if (ev.some((e: any) => (e.type === 'missed_tackle' || e.type === 'tackle_wrap') && sim.agents[e.a] === d && e.t >= t0 && e.t <= t0 + 0.55)) r.attempt = true;
    delete r.e; const n = Math.max(1, r.ticks); for (const k of ['req', 'ground', 'hands', 'grasp', 'rest', 'dv']) r[k] = +(r[k] / (k === 'req' ? n : 1)).toFixed(2);
    for (const k of ['elig', 'inRange', 'both', 'engTicks']) r[k] = +(r[k] / n).toFixed(2);
    const nb = Math.max(1, r.bTicks); r.bReq = +(r.bReq / nb).toFixed(2); r.pairV = +(r.pairV / nb).toFixed(2); r.relV = +(r.relV / nb).toFixed(2); r.bGround = +r.bGround.toFixed(2); console.log(JSON.stringify(r)); }
}
