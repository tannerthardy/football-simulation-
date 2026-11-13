// Run-block defenders on the ground (Integration, 2026-11-10). The fixed run set; every run engagement ending 'body down'
// with the defender down (and blocker-down ones for comparison). For the faller, the 10 ticks before he left 'up', read
// after each tick: capture-point deviation over his base and over the fall threshold; its direction against the felt load
// (+1 = along the push: driven over; -1 = toward the blocker: a lean left unbalanced); felt load (x mg); his velocity along
// the push (yd/s; + = being driven back) and his request along it (+ = giving ground, - = holding or attacking);
// ground force over its traction limit; availability; posture; legs held (feetLock); the contact-height tip (tipAccel
// along the push, yd/s^2); his lean (x mg); his fall's recorded cause. Per event: slots, double (helpers), rep age,
// mass and strength ratios (blocker/defender), the runner's distance.
// usage: [LEAN_PITCH=1] node --import tsx scripts/diag/effective-mass/run-dfall.mts [dir] > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const G = 9.81 * 1.0936;
const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
const SEEDS = (process.env.SEEDS ?? '7,9,11,13,15,17,19,21,23,25,27,29').split(',').map(Number);
for (const seed of SEEDS) { let k = 0; for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${k++}`; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); const hist = new Map<any, any[]>(); const ended = new Set<any>();
  const rec = (a: any, o: any) => { const w = sim.world, bd = a.body, sup = bd.support, i = w.indexOf(bd), sp = w.sp[i], m = w.mass[i];
    const w0 = S.omega0(sp, sup.posture), rb = S.baseRadiusAt(sp, sup.posture), crit = rb + S.recoverySpeed(sp, 0, w.fat[i]) / w0;
    const fl = Math.hypot(sup.felt.x, sup.felt.y), ux = fl > 1e-9 ? sup.felt.x / fl : (a.pos.x - o.pos.x), uy = fl > 1e-9 ? sup.felt.y / fl : (a.pos.y - o.pos.y);
    const un = Math.hypot(ux, uy) || 1, nx = ux / un, ny = uy / un, ex = Math.hypot(sup.xi.x, sup.xi.y), it = sim.intents?.[a.idx];
    const gi = w.report?.groundImpulse?.[i], gl = w.report?.groundImpulseLimit?.[i], tip = sup.tipAccel ?? { x: 0, y: 0 };
    return { st: sup.state, eRb: ex / rb, eCrit: ex / crit, xiPush: ex > 1e-9 ? (sup.xi.x * nx + sup.xi.y * ny) / ex : NaN, felt: fl / (m * G),
      vPush: a.vel.x * nx + a.vel.y * ny, reqPush: it?.vel ? it.vel.x * nx + it.vel.y * ny : NaN, ground: gi && gl ? Math.hypot(gi.x, gi.y) / Math.max(1e-9, gl) : NaN,
      alpha: w.alpha[i], posture: sup.posture, feetLock: sup.feetLock, tip: tip.x * nx + tip.y * ny, lean: Math.hypot(sup.lean.x, sup.lean.y) / (m * G),
      rel: w.report?.leanRelease?.[i] ? Math.hypot(w.report.leanRelease[i].x, w.report.leanRelease[i].y) : NaN, out: sup.out,
      face: Math.abs(Math.atan2(Math.sin(a.body.facing - Math.atan2(-ny, -nx)), Math.cos(a.body.facing - Math.atan2(-ny, -nx)))) * 57.3,
      reqLat: it?.vel ? Math.abs(-it.vel.x * ny + it.vel.y * nx) : NaN, vLat: Math.abs(-a.vel.x * ny + a.vel.y * nx), accel: sup.accel ? sup.accel.x * nx + sup.accel.y * ny : NaN,
      dxv: bd.__dx ? JSON.parse(JSON.stringify(bd.__dx)) : null, xiX: sup.xi.x, xiY: sup.xi.y,
      rec: w.recovery[i] / Math.max(1e-9, sp.stepSpeed), cC: sup.causes?.contact ?? 0, cL: sup.causes?.legs ?? 0, cO: sup.causes?.overspeed ?? 0 }; };
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph !== 'end' || ended.has(e)) return; ended.add(e);
    if (data?.reason !== 'body down') return; const t = sim.t;
    for (const [who, a, o] of [['defender', e.defender, e.blocker], ['blocker', e.blocker, e.defender]] as const) {
      if (!a.isDown(t)) continue; const h = hist.get(a) ?? []; const now = rec(a, o); const c = sim.carrier;
      console.log(JSON.stringify({ id, who, slot: a.slot, other: o.slot, double: e.helpers.length > 0, age: r2(t - e.start), t: r2(t),
        handoff: sim.handoffAt >= 0, cause: a.body.support.cause, mRatio: r2(o.profile.massKg / a.profile.massKg),
        sRatio: r2((o.r?.('strength') ?? NaN) / (a.r?.('strength') ?? NaN)), runner: c ? r2(Math.hypot(c.pos.x - a.pos.x, c.pos.y - a.pos.y)) : null,
        ticks: [...h.slice(-10), now].map((x: any) => Object.fromEntries(Object.entries(x).map(([k2, v]) => [k2, typeof v === 'number' ? r2(v) : v]))) })); } });
  const tick = sim.tick.bind(sim);
  sim.tick = () => { for (const a of sim.agents ?? []) delete a.body.__dx; tick(); for (const e of sim.engagements ?? []) { if (e.type !== 'run') continue;
    for (const [a, o] of [[e.defender, e.blocker], [e.blocker, e.defender]]) { if (a.body.support?.state !== 'up') continue; const h = hist.get(a) ?? []; h.push(rec(a, o)); if (h.length > 10) h.shift(); hist.set(a, h); } } };
  sim.run();
} }
