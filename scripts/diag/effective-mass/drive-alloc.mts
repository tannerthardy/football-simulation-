// Inside the ground-force allocation during a front-on contact (Integration's step-3 question: why does the runner
// deliver about half his strength cap?). For front-on first contacts on zone runs, every tick of the 0.3 s from first
// proximity, for the runner and for the hitter, as shares of each one's traction limit:
//   cap      leg-strength budget = pushForce x force-velocity (along the delivered force) x facing x availability
//   delivered  |ground force| and its component along the runner's path (+ = the runner's way)
//   lean     the push into the felt load (World brace), and the felt load (sensed contact force)
// plus intent.push, the felt load's angle to the path, and the stride hold. Split by whether a grasp is on the runner
// and whether it is one-armed. Diagnostic only; reads World state after each tick.
// usage: node --import tsx scripts/diag/effective-mass/drive-alloc.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const { directionalSpeedFactor, fatigueFactor } = await import(`${W}/src/physics/kinematics.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const R: any[] = [], H: any[] = [], F: any[] = []; let playNo = 0;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (let seed = 7; seed <= 29; seed += 2) { for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  playNo++; const sim: any = new PlaySim(st); const up = sim.attackDir('O'); let contact: number | null = null, front = false, hitter: any = null, path = 0;
  const bufR: any[] = [], bufH: any[] = [], pre: any[] = []; const tick = sim.tick.bind(sim);
  const sample = (a: any, rep: any, w: any, holds: any[], oneArm: boolean, buf: any[]) => {
    const k = a.idx, sup = a.body.support, dt = 0.05, m = a.profile.massKg;
    const lim = rep.groundImpulseLimit[k] / dt, g = rep.groundImpulse[k], gx = g.x / dt, gy = g.y / dt, gm = Math.hypot(gx, gy);
    const along = gx * Math.cos(path) + gy * Math.sin(path);
    const dirF = gm > 1e-6 ? Math.atan2(gy, gx) : path;
    const fv = Math.min(1.2, Math.max(0, 1 - (a.vel.x * Math.cos(dirF) + a.vel.y * Math.sin(dirF)) / a.profile.vmax));
    const facing = directionalSpeedFactor(a.profile, wrap(dirF - a.body.facing));
    const avail = w.alpha?.[k] ?? 1;
    const cap = supportParams(a.profile).pushForce * fv * facing * avail * fatigueFactor(a.body.energy);
    const felt = Math.hypot(sup.felt.x, sup.felt.y), feltAng = felt > 1e-6 ? Math.abs(wrap(Math.atan2(-sup.felt.y, -sup.felt.x) - path)) * 180 / Math.PI : NaN;
    const it = sim.intents?.[k]; const rv = it ? it.vel : { x: 0, y: 0 }, rs = Math.hypot(rv.x, rv.y);
    const relAng = (x: number, y: number) => { const a = Math.atan2(y, x) - path; return Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI; };
    // the velocity change the request asks for, and where the delivered force points, relative to the runner's path
    const need = { x: rv.x - a.vel.x, y: rv.y - a.vel.y };
    // signed components in the path frame, lateral sign chosen so that the request's lateral side is positive
    const cp = Math.cos(path), sp_ = Math.sin(path), lat = (x: number, y: number) => -x * sp_ + y * cp, alo = (x: number, y: number) => x * cp + y * sp_;
    const side = Math.sign(lat(rv.x, rv.y)) || 1;
    buf.push({ fLat: Math.abs(lat(gx, gy)) / lim, feltLat: Math.abs(lat(-sup.felt.x, -sup.felt.y)) / lim, gx: gx / lim, gy: gy / lim, play: playNo, dvA: alo(need.x, need.y), dvL: side * lat(need.x, need.y), fA: alo(gx, gy) / lim, fL: side * lat(gx, gy) / lim, vL: side * lat(a.vel.x, a.vel.y), rL: side * lat(rv.x, rv.y), reqAng: rs > 0.2 ? Math.abs(relAng(rv.x, rv.y)) : NaN, needAng: Math.abs(relAng(need.x, need.y)), needMag: Math.hypot(need.x, need.y),
      gAng: gm > 1e-6 ? Math.abs(relAng(gx, gy)) : NaN, miss: gm > 1e-6 && Math.hypot(need.x, need.y) > 0.2 ? Math.abs(wrap(Math.atan2(gy, gx) - Math.atan2(need.y, need.x))) * 180 / Math.PI : NaN, velAng: Math.hypot(a.vel.x, a.vel.y) > 0.3 ? Math.abs(relAng(a.vel.x, a.vel.y)) : NaN, reqSpeed: rs, speed: Math.hypot(a.vel.x, a.vel.y), lim, gm: gm / lim, along: along / lim, cap: cap / lim, lean: Math.hypot(w.braceX[k], w.braceY[k]) / lim, felt: felt / lim, feltAng,
      push: sim.intents?.[k]?.push ?? 0, stride: w.strideHolds?.[k] ?? 0, up: sup.state === 'up', held: holds.length > 0, oneArm, m });
  };
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    if (contact === null && sim.handoffAt >= 0 && sim.lastStep) {
      // free-running control: the same runner before contact (path = his current travel)
      const sp0 = Math.hypot(c.vel.x, c.vel.y);
      if (sp0 > 1) { path = Math.atan2(c.vel.y, c.vel.x); const w = sim.world; sample(c, sim.lastStep, w, [], false, pre); pre[pre.length - 1].t = sim.t; }
    }
    if (contact === null && sim.handoffAt >= 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
      if (d) { contact = sim.t; hitter = d; const sp = Math.hypot(c.vel.x, c.vel.y), rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
        path = Math.atan2(c.vel.y, c.vel.x);
        front = sp > 0.5 && (rx * c.vel.x + ry * c.vel.y) / (rd * sp) > Math.cos(Math.PI / 4) && (c.pos.x - sim.los) * up >= -1 && (c.pos.x - sim.los) * up < 3; } }
    if (contact !== null && sim.t > contact + 1e-9 && sim.t <= contact + 0.3 + 1e-9 && sim.lastStep) {
      const w = sim.world, holds = w.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body);
      const oneArm = holds.some((j: any) => sim.bond?.oneArm?.has(sim.agents.find((a: any) => a.body === j.a)));
      sample(c, sim.lastStep, w, holds, oneArm, bufR); sample(hitter, sim.lastStep, w, holds, oneArm, bufH); } };
  sim.run();
  if (front) { R.push(...bufR); H.push(...bufH); F.push(...pre.filter((r: any) => r.t >= contact! - 0.6 && r.t <= contact! - 0.1)); }
} }
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const dirs = (label: string, rows: any[]) => console.log(`  ${''.padEnd(30)}      directions to his path (deg, median): request ${med(rows.map(r => r.reqAng)).toFixed(0)}, velocity change asked ${med(rows.map(r => r.needAng)).toFixed(0)} (${med(rows.map(r => r.needMag)).toFixed(1)} yd/s), ground force ${med(rows.map(r => r.gAng)).toFixed(0)}, force off the asked change ${med(rows.map(r => r.miss)).toFixed(0)} | his travel ${med(rows.map(r => r.velAng)).toFixed(0)} | request speed ${med(rows.map(r => r.reqSpeed)).toFixed(1)}, speed ${med(rows.map(r => r.speed)).toFixed(1)}`);
const comps = (rows: any[]) => console.log(`  ${''.padEnd(30)}      signed, path frame (lateral + = his request's side): asked change along ${med(rows.map(r => r.dvA)).toFixed(2)} across ${med(rows.map(r => r.dvL)).toFixed(2)} yd/s | ground force along ${med(rows.map(r => r.fA)).toFixed(2)} across ${med(rows.map(r => r.fL)).toFixed(2)} | velocity across ${med(rows.map(r => r.vL)).toFixed(2)}, request across ${med(rows.map(r => r.rL)).toFixed(2)} yd/s`);
const line = (label: string, rows: any[], all: number) => { dirs0(label, rows, all); dirs(label, rows); comps(rows); };
const dirs0 = (label: string, rows: any[], all: number) => console.log(`  ${label.padEnd(30)} ${String(rows.length).padStart(4)} (${(100 * rows.length / all).toFixed(0).padStart(3)}%) | cap ${med(rows.map(r => r.cap)).toFixed(2)} | delivered ${med(rows.map(r => r.gm)).toFixed(2)}, along path ${med(rows.map(r => r.along)).toFixed(2)} | lean ${med(rows.map(r => r.lean)).toFixed(2)} felt ${med(rows.map(r => r.felt)).toFixed(2)} at ${med(rows.map(r => r.feltAng)).toFixed(0)} deg to path | push ${med(rows.map(r => r.push)).toFixed(2)} | stride ${med(rows.map(r => r.stride)).toFixed(2)}`);
console.log('CONTROL: the same runners running free, 0.6 to 0.1 s before contact (path = his travel that tick)');
line('up, free running', F.filter((r: any) => r.up), F.length);
for (const [name, rows] of [['RUNNER', R], ['HITTER', H]] as const) {
  console.log(`${name}: ticks in the 0.3 s after front-on first proximity; shares of his own traction limit (median ${med(rows.map((r: any) => r.lim)).toFixed(0)} kg yd/s^2)`);
  const up = rows.filter((r: any) => r.up);
  line('up, all', up, rows.length);
  line('up, no grasp on the runner', up.filter((r: any) => !r.held), rows.length);
  line('up, grasp on him, two-arm', up.filter((r: any) => r.held && !r.oneArm), rows.length);
  line('up, grasp on him, one-arm', up.filter((r: any) => r.held && r.oneArm), rows.length);
  line('off his feet', rows.filter((r: any) => !r.up), rows.length);
}
// Persistence of the ground force within each play's window: |sum of force vectors| / sum of |force| (1 = steady
// direction, 0 = it reverses tick to tick), and the share of ticks whose force reverses (cos < 0) from the tick before.
const persist = (label: string, rows: any[]) => {
  const by = new Map<number, any[]>(); for (const r of rows) { if (!by.has(r.play)) by.set(r.play, []); by.get(r.play)!.push(r); }
  const ps: number[] = [], net: number[] = []; let rev = 0, pairs = 0;
  for (const rs of by.values()) { if (rs.length < 3) continue;
    const sx = rs.reduce((a, r) => a + r.gx, 0), sy = rs.reduce((a, r) => a + r.gy, 0), sm = rs.reduce((a, r) => a + Math.hypot(r.gx, r.gy), 0);
    ps.push(Math.hypot(sx, sy) / Math.max(1e-9, sm)); net.push(Math.hypot(sx, sy) / rs.length);
    for (let i = 1; i < rs.length; i++) { pairs++; if (rs[i].gx * rs[i - 1].gx + rs[i].gy * rs[i - 1].gy < 0) rev++; } }
  console.log(`  ${label.padEnd(30)} windows ${ps.length} | persistence ${med(ps).toFixed(2)} | mean net force ${med(net).toFixed(2)} of his limit | ticks reversing from the tick before ${(100 * rev / Math.max(1, pairs)).toFixed(0)}%`);
};
console.log('PERSISTENCE of the ground force inside each window (consecutive ticks on his feet)');
persist('runner, free running', F.filter((r: any) => r.up));
persist('runner, 0.3 s after contact', R.filter((r: any) => r.up));
persist('hitter, 0.3 s after contact', H.filter((r: any) => r.up));
const split = (label: string, rows: any[]) => {
  const atCap = rows.filter((r: any) => r.gm >= 0.95 * r.cap), below = rows.filter((r: any) => r.gm < 0.95 * r.cap);
  console.log(`  ${label.padEnd(30)} at his cap ${(100 * atCap.length / rows.length).toFixed(0)}%: |force across| ${med(atCap.map((r: any) => r.fLat)).toFixed(2)} vs felt load across ${med(atCap.map((r: any) => r.feltLat)).toFixed(2)}, along ${med(atCap.map((r: any) => r.fA)).toFixed(2)}, lean ${med(atCap.map((r: any) => r.lean)).toFixed(2)}`);
  console.log(`  ${''.padEnd(30)} below his cap ${(100 * below.length / rows.length).toFixed(0)}%: delivered ${med(below.map((r: any) => r.gm)).toFixed(2)} of cap ${med(below.map((r: any) => r.cap)).toFixed(2)}, along ${med(below.map((r: any) => r.fA)).toFixed(2)}, lean ${med(below.map((r: any) => r.lean)).toFixed(2)}, felt ${med(below.map((r: any) => r.felt)).toFixed(2)}; push 0 on ${(100 * below.filter((r: any) => r.push === 0).length / Math.max(1, below.length)).toFixed(0)}%, felt > 0.1 with lean < 0.02 on ${(100 * below.filter((r: any) => r.felt > 0.1 && r.lean < 0.02).length / Math.max(1, below.length)).toFixed(0)}% (of which push 0: ${(100 * below.filter((r: any) => r.felt > 0.1 && r.lean < 0.02 && r.push === 0).length / Math.max(1, below.filter((r: any) => r.felt > 0.1 && r.lean < 0.02).length)).toFixed(0)}%)`);
};
console.log('AT OR BELOW HIS STRENGTH CAP (on his feet; at cap = delivered >= 0.95 cap)');
split('runner, free running', F.filter((r: any) => r.up)); split('runner, 0.3 s after contact', R.filter((r: any) => r.up)); split('hitter, 0.3 s after contact', H.filter((r: any) => r.up));
if (process.env.DUMP) { const pl = [...new Set(R.map((r: any) => r.play))].slice(0, 3);
  for (const p of pl) { console.log('play', p); for (const r of R.filter((r: any) => r.play === p)) console.log(`   up ${r.up ? 1 : 0} dv ${r.dvA.toFixed(2)},${r.dvL.toFixed(2)} | F ${r.fA.toFixed(2)},${r.fL.toFixed(2)} |F| ${r.gm.toFixed(2)} cap ${r.cap.toFixed(2)} miss ${r.miss?.toFixed(0)} lean ${r.lean.toFixed(2)} felt ${r.felt.toFixed(2)} speed ${r.speed.toFixed(2)} req ${r.reqSpeed.toFixed(2)}`); } }
