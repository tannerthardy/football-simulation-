// #164: double-team climbers after release. Per tick for 0.7 s after a combo
// release to a backer: requested vs achieved velocity, ground impulse vs the
// traction limit, contact impulses by partner, hand/grasp joints, yaw.
// argv: worktree seed [schemes,comma] [maxSnaps] [verboseIndex]
import { readFileSync } from 'node:fs';
const [W, seed] = [process.argv[2], process.argv[3]];
const schemes = new Set((process.argv[4] ?? 'power,counter,insideZone,outsideZone,wideZone,duo,splitZone').split(','));
const maxSnaps = Number(process.argv[5] ?? 999), verbose = process.argv[6] !== undefined ? Number(process.argv[6]) : -1;
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'Y', 'H', 'F']);
const rows: any[] = [];
let done = 0;
for (let idx = 0; idx < snaps.length && done < maxSnaps; idx++) {
  const setup = restoreSetup(Buffer.from(snaps[idx].setup, 'base64'));
  const scheme = setup.offCall?.run?.scheme;
  if (!scheme || !schemes.has(scheme)) continue;
  done++;
  const sim: any = new PlaySim(setup);
  const dir = sim.attackDir('O');
  const ags: any[] = sim.agents;
  const byBody = new Map(ags.map((a: any) => [a.body, a]));
  const idxOf = (a: any) => ags.indexOf(a);
  const prev = new Map<any, string>();
  const releases: Array<{ a: any; t: number; from: string; to: string; ticks: any[] }> = [];
  const NODRIVE = process.env.CF_NODRIVE === '1';
  if (NODRIVE) { const wstep = sim.world.step.bind(sim.world); sim.world.step = (intents: any[], dt: number) => {
    for (const r of releases) { if (sim.t - r.t > 0.6) continue; const dl = sim.defense.find((x: any) => x.slot === r.from); if (!dl) continue;
      const k = idxOf(dl), it = intents[k]; if (!it) continue; const nx0 = r.a.pos.x - dl.pos.x, ny0 = r.a.pos.y - dl.pos.y, L = Math.hypot(nx0, ny0); if (L > 1.2) continue;
      const nx = nx0 / L, ny = ny0 / L, into = it.vel.x * nx + it.vel.y * ny; if (into > 0) intents[k] = { ...it, vel: { x: it.vel.x - into * nx, y: it.vel.y - into * ny }, push: 0 }; }
    return wstep(intents, dt); }; }
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const rep = sim.lastStep; if (!rep) return;
    for (const a of sim.offense) {
      if (!OL.has(a.slot)) continue;
      const tgt = a.behavior?.plan?.target?.slot ?? '-';
      const p = prev.get(a);
      if (p && p !== tgt && !p.startsWith('LB') && p !== '-' && tgt.startsWith('LB') && sim.t < 3) releases.push({ a, t: sim.t, from: p, to: tgt, ticks: [] });
      prev.set(a, tgt);
    }
    for (const r of releases) {
      if (sim.t > r.t + 0.7 + 1e-9) continue;
      const a = r.a, i = idxOf(a), it = sim.intents[i];
      const req = it?.vel ?? { x: 0, y: 0 };
      const gI = rep.groundImpulse[i], lim = rep.groundImpulseLimit[i];
      const contacts = rep.contacts.filter((c: any) => c.i === i || c.j === i)
        .map((c: any) => `${ags[c.i === i ? c.j : c.i].slot}:${c.impulse.toFixed(1)}`);
      const joints = sim.world.joints.filter((j: any) => !j.broken && (j.a === a.body || j.b === a.body))
        .map((j: any) => `${j.kind}:${(byBody.get(j.a === a.body ? j.b : j.a) as any)?.slot}`);
      const fwd = (v: any) => v.x * dir, lat = (v: any) => v.y;
      const dl = sim.defense.find((x: any) => x.slot === r.from), di = dl ? idxOf(dl) : -1;
      let dlReqN = NaN, clReqN = NaN, dlPush = NaN, dlGroundN = NaN, gap = NaN, dlHands = '';
      if (dl) { const nx0 = dl.pos.x - a.pos.x, ny0 = dl.pos.y - a.pos.y; gap = Math.hypot(nx0, ny0); const nx = nx0 / gap, ny = ny0 / gap;
        const dI = sim.intents[di]; dlReqN = -((dI?.vel?.x ?? 0) * nx + (dI?.vel?.y ?? 0) * ny); clReqN = req.x * nx + req.y * ny; dlPush = dI?.push ?? 0;
        dlGroundN = -(rep.groundImpulse[di].x * nx + rep.groundImpulse[di].y * ny) / sim.dt / sim.world.mass[di];
        dlHands = sim.world.joints.filter((j: any) => !j.broken && j.a === dl.body).map((j: any) => (byBody.get(j.b) as any)?.slot).join('+'); }
      const contactA = rep.contacts.filter((c: any) => (c.i === i && c.j === di) || (c.j === i && c.i === di)).reduce((s: number, c: any) => s + c.impulse, 0) / sim.dt / sim.world.mass[i];
      r.ticks.push({ t: +(sim.t - r.t).toFixed(3), req: [+fwd(req).toFixed(2), +lat(req).toFixed(2)], got: [+fwd(a.vel).toFixed(2), +lat(a.vel).toFixed(2)],
        reqSp: +Math.hypot(req.x, req.y).toFixed(2), sp: +Math.hypot(a.vel.x, a.vel.y).toFixed(2),
        ground: +Math.hypot(gI.x, gI.y).toFixed(2), limit: +lim.toFixed(2), facing: +(a.facing * 57.3).toFixed(0),
        support: a.body.support?.state ?? 'up', contacts, joints, dlReqN, clReqN, dlPush, dlGroundN, gap, contactA, dlHands, dlBeh: dl?.behavior?.constructor?.name, hip: dl ? (gap <= a.profile.radius + dl.profile.radius + .15) : false, kind: a.behavior?.plan?.kind, tgt: a.behavior?.plan?.target?.slot });
    }
  };
  sim.run();
  for (const r of releases) {
    const at = (dt: number) => r.ticks.find((k) => Math.abs(k.t - dt) < 0.026) ?? r.ticks.filter(k => k.t <= dt).at(-1);
    const w = r.ticks.filter(k => k.t > 0 && k.t <= 0.5);
    const sat = w.filter(k => k.limit > 0 && k.ground >= 0.95 * k.limit).length / Math.max(1, w.length);
    const contactTicks = w.filter(k => k.contacts.length).length / Math.max(1, w.length);
    const jointTicks = w.filter(k => k.joints.length).length / Math.max(1, w.length);
    const impBy: Record<string, number> = {};
    for (const k of w) for (const c of k.contacts) { const [s, v] = c.split(':'); impBy[s] = (impBy[s] ?? 0) + Number(v); }
    const w4 = r.ticks.filter(k => k.t > 0 && k.t <= 0.4), mean = (f: (k: any) => number) => +(w4.reduce((s, k) => s + f(k), 0) / Math.max(1, w4.length)).toFixed(2);
    const w5 = r.ticks.filter(k => k.t > 0 && k.t <= 0.5); let flips = 0, maxTurn = 0; const flipWhy: string[] = []; let hipFlips = 0; const hipTicks = w5.filter(k => k.hip).length;
    for (let q = 1; q < w5.length; q++) { const A = w5[q - 1], B = w5[q]; if (A.reqSp < 1 || B.reqSp < 1) continue;
      let d = Math.abs(Math.atan2(B.req[1], B.req[0]) - Math.atan2(A.req[1], A.req[0])) * 57.3; if (d > 180) d = 360 - d; if (d > 60) { flips++; if (A.hip || B.hip) hipFlips++; flipWhy.push(`${A.kind}/${A.tgt}->${B.kind}/${B.tgt}`); } maxTurn = Math.max(maxTurn, d); }
    rows.push({ hipFlips, hipTicks, flipWhy, flips, maxTurn: Math.round(maxTurn), idx, scheme, slot: r.a.slot, from: r.from, to: r.to, t: +r.t.toFixed(2), dlReqN: mean(k => k.dlReqN), dlPush: mean(k => k.dlPush), dlGroundN: mean(k => k.dlGroundN), clReqN: mean(k => k.clReqN), contactA: mean(k => k.contactA), inContact: mean(k => k.contactA > 0.5 ? 1 : 0), dlBeh: w4[0]?.dlBeh, dlHands: w4[0]?.dlHands, sp04: r.ticks.find(k => Math.abs(k.t - 0.4) < 0.026)?.sp,
      sp: [0.1, 0.3, 0.5].map(d => at(d)?.sp), reqSp: [0.1, 0.3, 0.5].map(d => at(d)?.reqSp), sat: +sat.toFixed(2), contactTicks: +contactTicks.toFixed(2), jointTicks: +jointTicks.toFixed(2), impBy });
    if (idx === verbose) { console.error(`--- idx ${idx} ${scheme} ${r.a.slot} ${r.from}->${r.to} at ${r.t.toFixed(2)}`); for (const k of r.ticks) console.error(JSON.stringify(k)); }
  }
}
console.log(JSON.stringify(rows));
