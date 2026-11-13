// What stops the pair sliding past each other in the first 0.15 s of a front-on grasp (Integration, 2026-11-10)?
// Fixed zone runs, one arm per process. For the first grasp on the carrier by a defender within 45 deg ahead of his
// travel, each tick from the grasp to +0.15 s, the change of the pair's relative tangential velocity (runner minus
// hitter, across the line of centres, signed + along the slip at the grasp) is split by source:
//   ground   each man's ground force / his mass
//   grasp    this grasp's force (normal + tangential rows) x (1/m_r + 1/m_h)
//   hands    hands joints on either man (blocks)
//   torso    the rest of each man's momentum change: torso contacts with anyone (normal and friction), other grasps
// Also the grasp's own tangential force against its capacity, whether it slips, and onset timing: when the grasp
// forms against first proximity (centres <= 1.0 yd) and torso distance (<= 0.65 yd), with the centre distance then.
// usage: node --import tsx scripts/diag/effective-mass/slip-split.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const G = 10.72, ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const ticks: any[][] = [[], [], [], []]; const onset: any[] = [];
const force = (j: any, onB: boolean) => { const n = j.normalForceOnB ?? { x: 0, y: 0 }, t = j.tangentForceOnB ?? { x: 0, y: 0 }, s = onB ? 1 : -1; return { x: s * (n.x + t.x), y: s * (n.y + t.y) }; };
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let jt: any = null, hit: any = null, t0 = 0, sgn = 1, done = false; const prox = new Map<any, { p1?: number; p65?: number }>();
  sim.tick = () => {
    const c0 = sim.carrier, h0 = hit; const vr0 = c0 ? { ...c0.vel } : null, vh0 = h0 ? { ...h0.vel } : null;
    tick(); const c = sim.carrier, w = sim.world; if (done || !c || sim.handoffAt < 0 || !w) return;
    for (const d of sim.defense) { const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y), r = prox.get(d) ?? {};
      if (r.p1 === undefined && dist <= 1.0) r.p1 = sim.t; if (r.p65 === undefined && dist <= 0.65) r.p65 = sim.t; prox.set(d, r); }
    if (!jt) { const j = w.joints.find((q: any) => q.kind === 'grasp' && q.b === c.body); if (!j) return;
      const d = sim.defense.find((a: any) => a.body === j.a); const sp = Math.hypot(c.vel.x, c.vel.y); if (!d || sp < 0.5) { done = true; return; }
      const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
      if ((rx * c.vel.x + ry * c.vel.y) / (rd * sp) < Math.SQRT1_2) { done = true; return; }
      jt = j; hit = d; t0 = sim.t; const tx = -ry / rd, ty = rx / rd, vt = (c.vel.x - d.vel.x) * tx + (c.vel.y - d.vel.y) * ty; sgn = vt >= 0 ? 1 : -1;
      const pr = prox.get(d) ?? {};
      onset.push({ vsP1: pr.p1 !== undefined ? t0 - pr.p1 : NaN, vsP65: pr.p65 !== undefined ? t0 - pr.p65 : NaN, never65: pr.p65 === undefined ? 1 : 0, dist: rd, radii: c.profile.radius + d.profile.radius, vt: Math.abs(vt) });
      return; }
    const k = Math.round((sim.t - t0) / sim.dt); if (k < 1 || k > 3 || !w.joints.includes(jt) || !vr0 || !vh0) { if (k > 3) done = true; return; }
    const dt = sim.dt, mr = c.profile.massKg, mh = hit.profile.massKg, ir = w.indexOf(c.body), ih = w.indexOf(hit.body), rep = sim.lastStep;
    const rx = hit.pos.x - c.pos.x, ry = hit.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1, tx = sgn * -ry / rd, ty = sgn * rx / rd;
    const T = (v: any) => v.x * tx + v.y * ty;
    const dvr = { x: c.vel.x - vr0.x, y: c.vel.y - vr0.y }, dvh = { x: hit.vel.x - vh0.x, y: hit.vel.y - vh0.y };
    const gr = { x: rep.groundImpulse[ir].x / mr, y: rep.groundImpulse[ir].y / mr }, gh = { x: rep.groundImpulse[ih].x / mh, y: rep.groundImpulse[ih].y / mh };
    const Fg = force(jt, true);   // on the runner (b); its reaction on the hitter
    let hr = { x: 0, y: 0 }, hh = { x: 0, y: 0 };
    for (const j of w.joints) if (j.kind === 'hands') for (const [body, acc, m] of [[c.body, hr, mr], [hit.body, hh, mh]] as const) {
      const f = j.b === body ? force(j, true) : j.a === body ? force(j, false) : null; if (f) { acc.x += f.x * dt / m; acc.y += f.y * dt / m; } }
    const grR = { x: Fg.x * dt / mr, y: Fg.y * dt / mr }, grH = { x: -Fg.x * dt / mh, y: -Fg.y * dt / mh };
    const rest = (dv: any, g: any, gq: any, hd: any) => ({ x: dv.x - g.x - gq.x - hd.x, y: dv.y - g.y - gq.y - hd.y });
    const tr = rest(dvr, gr, grR, hr), th = rest(dvh, gh, grH, hh);
    const tf = Math.hypot(jt.tangentForceOnB?.x ?? 0, jt.tangentForceOnB?.y ?? 0);
    ticks[k].push({ total: T(dvr) - T(dvh), ground: T(gr) - T(gh), grasp: T(grR) - T(grH), hands: T(hr) - T(hh), torso: T(tr) - T(th),
      vt: T({ x: c.vel.x - hit.vel.x, y: c.vel.y - hit.vel.y }), tcap: tf / Math.max(1e-9, jt.capacity ?? 0), tg: tf / (mr * G), slip: jt.slipping ? 1 : 0 });
  };
  sim.run();
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log(`onset (${onset.length} front-on grasps): grasp forms ${med(onset.map(o => o.vsP1)).toFixed(2)} s after first proximity (1.0 yd), ${med(onset.map(o => o.vsP65)).toFixed(2)} s after torso distance (0.65 yd; never reached before the grasp ${(100 * mean(onset.map(o => o.never65))).toFixed(0)}%); centre distance then ${med(onset.map(o => o.dist)).toFixed(2)} yd (radii ${med(onset.map(o => o.radii)).toFixed(2)}), slip then ${med(onset.map(o => o.vt)).toFixed(2)} yd/s`);
console.log('tick   n  | change of relative tangential velocity (yd/s; mean, - = slows the slip): total = ground + grasp + hands + torso/rest | slip after | grasp tangential: g, / capacity, slipping');
for (const [k, r] of ticks.entries()) if (r.length) console.log(`+${(k * 0.05).toFixed(2)} ${String(r.length).padStart(4)} | ${f(mean(r.map(x => x.total)))} = ${f(mean(r.map(x => x.ground)))} ${f(mean(r.map(x => x.grasp)))} ${f(mean(r.map(x => x.hands)))} ${f(mean(r.map(x => x.torso)))} | ${mean(r.map(x => x.vt)).toFixed(2)} | ${med(r.map(x => x.tg)).toFixed(2)} g, ${med(r.map(x => x.tcap)).toFixed(2)}, ${(100 * mean(r.map(x => x.slip))).toFixed(0)}%`);
