// The tackler's spin in a hold (Integration, 2026-11-10). Fixed zone runs, one arm per process. The first grasp on the
// carrier, classified by the holder's bearing from the runner against the runner's travel (front / side / behind, 45 deg
// cones). Each tick over 0.5 s, for the holder (rad/s and N·m-like units kg·yd²/s² per tick-mean):
//   spin        his yaw rate
//   ground      the ground's yaw impulse on him over the tick / dt (report.groundYawImpulse): his feet's resistance or drive
//   grasp       the grasp's moment about his centre: the force on him at his share of the grip-point arm (the patch law)
//   rest        I·Δspin − ground − grasp (torso contacts, hands)
//   request     his requested facing against his facing (deg, signed toward the spin) and against square to the runner
// Prints means per tick by approach. usage: node --import tsx scripts/diag/effective-mass/hitter-torque.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let jt: any = null, d: any = null, t0 = 0, cls = '', row: any = null, done = false;
  sim.tick = () => { const spin0 = d ? (d.body.spin ?? 0) : 0; tick(); const c = sim.carrier, w = sim.world; if (done || !c || !w) return;
    if (!jt) { const j = w.joints.find((q: any) => q.kind === 'grasp' && q.b === c.body); if (!j) return; d = sim.defense.find((a: any) => a.body === j.a); if (!d) { done = true; return; }
      const sp = Math.hypot(c.vel.x, c.vel.y); if (sp < 0.5) { done = true; return; }
      const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, cos = (rx * c.vel.x + ry * c.vel.y) / ((Math.hypot(rx, ry) || 1) * sp);
      cls = cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side'; jt = j; t0 = sim.t; row = { cls, ticks: [] }; rows.push(row); return; }
    const k = Math.round((sim.t - t0) / sim.dt); if (k < 1 || k > 10 || !w.joints.includes(jt)) { if (k > 10) done = true; return; }
    const i = w.indexOf(d.body), I = supportParams(d.profile).yawInertia, dt = sim.dt, spin = d.body.spin ?? 0, rep = sim.lastStep;
    const ground = (rep.groundYawImpulse?.[i] ?? 0) / dt;
    const pt = w.graspPoint ? w.graspPoint(jt) : c.pos; const share = d.profile.radius / (d.profile.radius + c.profile.radius);
    const ax = (pt.x - d.pos.x) * share, ay = (pt.y - d.pos.y) * share;
    const fb = { x: (jt.normalForceOnB?.x ?? 0) + (jt.tangentForceOnB?.x ?? 0), y: (jt.normalForceOnB?.y ?? 0) + (jt.tangentForceOnB?.y ?? 0) };
    const grasp = ax * -fb.y - ay * -fb.x;   // r × F on the holder (force on him is −F on B)
    const total = I * (spin - spin0) / dt;
    const it = sim.intents?.[d.idx]; const sgn = Math.sign(spin) || 1;
    const sq = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
    row.ticks[k] = { spin, ground, grasp, rest: total - ground - grasp, total, I,
      req: it?.facing !== undefined ? wrap(it.facing - d.body.facing) * sgn * 57.3 : NaN, reqSq: it?.facing !== undefined ? Math.abs(wrap(it.facing - sq)) * 57.3 : NaN, faceSq: Math.abs(wrap(d.body.facing - sq)) * 57.3 };
  };
  sim.run();
}
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
const amean = (v: number[]) => mean(v.map(Math.abs));
for (const cls of ['front', 'side', 'behind']) { const S = rows.filter(r => r.cls === cls && r.ticks.filter(Boolean).length >= 4); if (!S.length) continue;
  console.log(`== ${cls}: ${S.length} holds (yaw inertia ${mean(S.map(r => r.ticks.find(Boolean)?.I)).toFixed(1)} kg·yd²); torques signed with his spin, mean of |.|-weighted by sign`);
  for (const k of [1, 2, 3, 4, 6, 8, 10]) { const T = S.map(r => r.ticks[k]).filter(Boolean); if (!T.length) continue;
    const sg = (key: string) => mean(T.map(t => t[key] * (Math.sign(t.spin) || 1)));
    console.log(`   +${(k * .05).toFixed(2)} n ${String(T.length).padStart(3)} | |spin| ${amean(T.map(t => t.spin)).toFixed(2)} rad/s | torque along spin: total ${sg('total').toFixed(0)} = ground ${sg('ground').toFixed(0)} + grasp ${sg('grasp').toFixed(0)} + rest ${sg('rest').toFixed(0)} | request vs facing ${mean(T.map(t => t.req)).toFixed(0)} deg (+ = with the spin), request vs square ${mean(T.map(t => t.reqSq)).toFixed(0)}, facing vs square ${mean(T.map(t => t.faceSq)).toFixed(0)}`); } }
