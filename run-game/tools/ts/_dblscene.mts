// Constructed double: RG (owner) and C/RT (helper) hip to hip square in front of DT_S, both engaged; real
// engagement law for 1.0 s. Prints the double's shape every 0.2 s: each member's lateral off the DT (field y,
// + away from partner) and depth in front; member gap; DT displacement. argv: worktree [helperSlot] [flip]
import { createHash } from 'node:crypto';
const W = process.argv[2], hs = process.argv[3] ?? 'C', flip = process.argv[4] === 'flip';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const sim: any = new PlaySim(structuredClone(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'iz_strong', seed: 1, roster: 7, formation: 'ace_11', flip })));
const o = sim.slot('RG'), h = sim.slot(hs), d = sim.slot('DT_S'), dir = sim.attackDir('O');
for (const b of sim.agents) { b.body.pos = { x: 80 + b.idx * 2, y: 3 }; b.body.vel = { x: 0, y: 0 }; b.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; b.snapReadyAt = 0; }
const y0 = sim.ballY, x0 = sim.los;
const w = (o.profile.radius + h.profile.radius) / 2, cd = Math.sqrt((o.profile.radius + d.profile.radius) ** 2 - w * w);
d.body.pos = { x: x0 + dir * .3, y: y0 }; d.body.facing = dir > 0 ? Math.PI : 0;
const wide = process.argv[5] === 'wide';
o.body.pos = wide ? { x: d.pos.x - dir * .45, y: y0 - .55 } : { x: d.pos.x - dir * cd, y: y0 - w };
h.body.pos = wide ? { x: d.pos.x - dir * .4, y: y0 + .6 } : { x: d.pos.x - dir * cd, y: y0 + w };
for (const b of [o, h]) b.body.facing = dir > 0 ? 0 : Math.PI;
const combination: any = { members: [o, h], defender: d, backer: null, released: false, secureSince: -1, nextRead: Infinity };
const mk = (a: any, kind: string) => { const bh = new RunBlocker({ kind, target: d, drive: { x: dir, y: 0 }, combination } as any); a.behavior = bh;
  for (const k of ['nextRuleRead', 'nextThreatRead']) Reflect.set(bh, k, Infinity); return bh; };
mk(o, 'drive'); mk(h, 'combo');
sim.t = sim.world.time = .5;
for (let k = 0; k < 24; k++) sim.perception.record(sim.agents, null);
sim.engage(o, d, 'run', { x: dir, y: 0 }); sim.engage(h, d, 'run', { x: dir, y: 0 });
const e = d.engagement; console.log('owner', e?.blocker?.slot, 'helpers', e?.helpers?.map((x: any) => x.slot));
const f = (v: number) => v.toFixed(2);
const shape = () => { const side = Math.sign(h.pos.y - o.pos.y) || 1;
  return `t=${f(sim.t)} owner lat ${f((o.pos.y - d.pos.y) * -side)} dep ${f((d.pos.x - o.pos.x) * dir)} | helper lat ${f((h.pos.y - d.pos.y) * side)} dep ${f((d.pos.x - h.pos.x) * dir)} | gap ${f(Math.hypot(h.pos.x - o.pos.x, h.pos.y - o.pos.y))} | DT moved ${f((d.pos.x - (x0 + dir * .3)) * dir)},${f(d.pos.y - y0)} | eng ${d.engagement?.blocker?.slot ?? '-'}+${d.engagement?.helpers?.map((x: any) => x.slot) ?? ''}`; };
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
runContactObservers.set(sim, (ee: any, ph: string, dd: any) => { if (ph !== 'movement' || ee.blocker !== o || Math.abs(sim.t*20-Math.round(sim.t*20))>1e-6 || sim.t > 1.15) return;
  const c = dd.command.vel; console.log(`  owner t=${f(sim.t)} lat=(${f(dd.lat.x)},${f(dd.lat.y)}) offset ${f(dd.offset)} want ${f(dd.wantOffset)} corr ${f(dd.correction)} dLat ${f(dd.dLat)} felt ${f(dd.feedback)} seal ${f(dd.seal)} mirror ${f(dd.mirror)} lateralReq ${f(c.x*dd.lat.x+c.y*dd.lat.y)} achLat ${f(o.vel.x*dd.lat.x+o.vel.y*dd.lat.y)} anchored ${dd.anchored} helpers ${ee.helpers.length}`); });
console.log(shape());
(globalThis as any).__hlog = [];
for (let k = 1; k <= 30; k++) { sim.tick(); if (k % 4 === 0) console.log(shape()); }
for (const r of (globalThis as any).__hlog.filter((r: any, i: number) => i % 2 === 0).slice(0, 12)) console.log('  helper', f(r.t), r.recovery ? `RECOVERY goalVel (${f(r.goalVel.x)},${f(r.goalVel.y)})` : `toSpot (${f(r.toSpot.x)},${f(r.toSpot.y)}) feet (${f(r.feet.x)},${f(r.feet.y)})`, `vel (${f(r.h.x)},${f(r.h.y)})`);
