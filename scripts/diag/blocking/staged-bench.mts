/** Phase 0 staged bench and sensitivity table (Tools/Physics, blocking plan 2026-11-24, no engine change).
 * World only, no controllers: the C and DT_W of contactFixture in latched hands (control 0 frozen), each asking a fixed
 * velocity with push 1 and a fixed pad level for 2.0 s. Mode pass (a bull): the rusher asks 4.5 yd/s toward the QB, the
 * blocker anchors (asks 0). Mode run (a drive): the blocker asks 3.0 yd/s into the defender, who presses 1.5.
 * Metric: the pair's mean velocity toward the QB (pass) or toward the defender's side (run) over 0.5-2.0 s (yd/s; + = the
 * blocker is walked back / the defender is driven back), and each body's ground gained. One thing changes per row; the
 * table prints the change from the base row and the direction a football reading expects.
 * usage: [CAP=1.25] node --import tsx scripts/diag/blocking/staged-bench.mts [pass|run|both] [--trace]
 * CAP scales the traction cap of bodies in hands (TURF_MU_SCALE; diagnostic) - set as env TURF_MU_SCALE. */
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { supportParams } = await import('../../../src/physics/support.js');
const CENTER_Y = 26.65, N = 0.9144;
type Mod = { str?: number; mass?: number; massP?: number; press?: number; reach?: number; posture?: number; balance?: number; bend?: number; req?: number };
type Case = { name: string; who: 'R' | 'B' | '-'; exp: 1 | -1 | 0; mod?: Mod; both?: { B: Mod; R: Mod }; note?: string };
const mode = (process.argv[2] === 'run' || process.argv[2] === 'pass') ? process.argv[2] : 'both';
const trace = process.argv.includes('--trace');
const DUR = 2.0;
function rep(kind: 'pass' | 'run', B: Mod, R: Mod, tr = false) {
  const f = contactFixture({ type: kind, runBlock: 60, passBlock: 60, side: 1 });
  const { sim, blocker: b, defender: d, engagement: e } = f as any;
  const j = e.hands!;
  e.control = 0;
  const apply = (a: any, m: Mod) => {
    const p = a.profile;
    if (m.mass) { p.massKg *= m.mass; if (m.massP !== undefined) p.power *= m.massP; }
    if (m.str !== undefined) p.power = p.massKg * (0.55 + 0.75 * m.str);
    if (m.press !== undefined) p.press = (p.press ?? 140) * m.press;
    if (m.reach !== undefined) p.reach += m.reach;
    if (m.balance !== undefined) p.balance = m.balance;
    if (m.bend !== undefined) p.bend = m.bend;
  };
  apply(b, B); apply(d, R);
  b.body.pos = { x: 40, y: CENTER_Y }; b.body.vel = { x: 0, y: 0 }; b.body.facing = 0;
  { const Rr = b.profile.radius + d.profile.radius + 0.1; d.body.pos = { x: 40 + Rr, y: CENTER_Y }; } d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  const pass = kind === 'pass';
  const bReq = pass ? (B.req ?? 0) : (B.req ?? 3.0), dReq = pass ? (R.req ?? 4.5) : (R.req ?? 1.5);
  const bPost = B.posture ?? (pass ? 0.8 : 0.85), dPost = R.posture ?? (pass ? 0.74 : 0.85);
  const x0 = { b: b.body.pos.x, d: d.body.pos.x };
  const rows: any[] = [];
  const steps = Math.round(DUR / sim.dt);
  let first = -1;
  for (let k = 0; k < steps; k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { x: bReq, y: 0 }, facing: 0, push: 1, posture: bPost };
    intents[d.idx] = { vel: { x: -dReq, y: 0 }, facing: Math.PI, push: 1, posture: dPost };
    sim.world.step(intents, sim.dt); sim.t += sim.dt;
    const t = (k + 1) * sim.dt;
    const sb = b.body.support, sd = d.body.support;
    if (first < 0 && ((sb?.state ?? 'up') !== 'up' || (sd?.state ?? 'up') !== 'up')) first = t;
    rows.push({ t, pair: -(b.body.vel.x + d.body.vel.x) / 2, bv: -b.body.vel.x, dv: -d.body.vel.x,
      hand: (j.normalForce ?? 0) * N, bFelt: -(sb?.felt.x ?? 0) * N, dFelt: (sd?.felt.x ?? 0) * N,
      bPost: sb?.posture, dPost: sd?.posture, bXi: Math.hypot(sb?.xi.x ?? 0, sb?.xi.y ?? 0), dXi: Math.hypot(sd?.xi.x ?? 0, sd?.xi.y ?? 0),
      bLift: (sim.world.liftFelt?.[b.idx] ?? 0) / (b.profile.massKg * 10.73), dLift: (sim.world.liftFelt?.[d.idx] ?? 0) / (d.profile.massKg * 10.73),
      bs: sb?.state, ds: sd?.state });
  }
  const W = rows.filter(r => r.t >= 0.5), m = (k: string) => W.reduce((s, r) => s + r[k], 0) / W.length;
  if (tr) for (const r of rows.filter((_, i) => i % 12 === 0))
    console.log(`   t ${r.t.toFixed(2)} pair ${r.pair.toFixed(2)} hand ${r.hand.toFixed(0)}N felt b/d ${r.bFelt.toFixed(0)}/${r.dFelt.toFixed(0)} lift b/d ${r.bLift.toFixed(2)}/${r.dLift.toFixed(2)} posture b/d ${(r.bPost ?? 0).toFixed(2)}/${(r.dPost ?? 0).toFixed(2)} base off b/d ${r.bXi.toFixed(2)}/${r.dXi.toFixed(2)} ${r.bs}/${r.ds}`);
  const spB = supportParams(b.profile), spD = supportParams(d.profile);
  return { pair: m('pair'), bv: m('bv'), dv: m('dv'), hand: m('hand'), bFelt: m('bFelt'), dFelt: m('dFelt'), bLift: m('bLift'), dLift: m('dLift'),
    dispB: -(b.body.pos.x - x0.b), dispD: d.body.pos.x - x0.d, fell: first,
    cap: { bPush: spB.pushForce * N, bTr: spB.traction * N, dPush: spD.pushForce * N, dTr: spD.traction * N, bKg: b.profile.massKg, dKg: d.profile.massKg } };
}
const CASES: Case[] = [
  { name: 'base (staged C vs DT_W)', who: '-', exp: 0 },
  { name: 'rusher strength +0.2', who: 'R', exp: 1, mod: { str: 0.95 } },
  { name: 'rusher strength -0.2', who: 'R', exp: -1, mod: { str: 0.55 } },
  { name: 'blocker strength +0.2', who: 'B', exp: -1, mod: { str: 0.97 } },
  { name: 'blocker strength -0.2', who: 'B', exp: 1, mod: { str: 0.57 } },
  { name: 'rusher heavier +10% (power with mass)', who: 'R', exp: 1, mod: { mass: 1.1, massP: 1.1 } },
  { name: 'rusher lighter -10% (power with mass)', who: 'R', exp: -1, mod: { mass: 0.9, massP: 0.9 } },
  { name: 'blocker heavier +10% (power with mass)', who: 'B', exp: -1, mod: { mass: 1.1, massP: 1.1 } },
  { name: 'blocker lighter -10% (power with mass)', who: 'B', exp: 1, mod: { mass: 0.9, massP: 0.9 } },
  { name: 'rusher stronger arms (press x1.3)', who: 'R', exp: 1, mod: { press: 1.3 } },
  { name: 'blocker stronger arms (press x1.3)', who: 'B', exp: -1, mod: { press: 1.3 } },
  { name: 'rusher longer arms (+0.15 yd reach)', who: 'R', exp: 1, mod: { reach: 0.15 } },
  { name: 'blocker longer arms (+0.15 yd reach)', who: 'B', exp: -1, mod: { reach: 0.15 } },
  { name: 'rusher lower pads (posture 1.0)', who: 'R', exp: 1, mod: { posture: 1.0 } },
  { name: 'rusher higher pads (posture 0.45)', who: 'R', exp: -1, mod: { posture: 0.45 } },
  { name: 'blocker lower pads (posture 1.0)', who: 'B', exp: -1, mod: { posture: 1.0 } },
  { name: 'blocker higher pads (posture 0.45)', who: 'B', exp: 1, mod: { posture: 0.45 } },
  { name: 'blocker wider base (balance 0.9)', who: 'B', exp: -1, mod: { balance: 0.9 } },
  { name: 'rusher wider base (balance 0.9)', who: 'R', exp: 1, mod: { balance: 0.9 } },
  { name: 'blocker more flexible (bend 0.9)', who: 'B', exp: -1, mod: { bend: 0.9 } },
  { name: 'rusher asks 3.0 instead of 4.5', who: 'R', exp: 0, mod: { req: 3.0 } },
  { name: 'blocker kicks back (asks 1.5 away)', who: 'B', exp: 1, mod: { req: -1.5 } },
  // The user's test: a stronger, lower man must beat a heavier, higher one (rusher = the stronger, lower man).
  { name: 'COMBO rusher stronger (+0.2) and lower (1.0) vs blocker heavier (+10%) and higher (0.6)', who: 'R', exp: 1, both: { R: { str: 0.95, posture: 1.0 }, B: { mass: 1.1, massP: 1.1, posture: 0.6 } } },
  { name: 'COMBO rusher heavier (+10%) and higher (0.6) vs blocker stronger (+0.2) and lower (1.0)', who: 'R', exp: -1, both: { R: { mass: 1.1, massP: 1.1, posture: 0.6 }, B: { str: 0.97, posture: 1.0 } } },
  { name: 'COMBO rusher lower (1.0) only, matched otherwise: blocker anchors at 0.45', who: 'R', exp: 1, both: { R: { posture: 1.0 }, B: { posture: 0.45 } } },
];
for (const kind of (mode === 'both' ? ['pass', 'run'] : [mode]) as ('pass' | 'run')[]) {
  console.log(`\n== ${kind}: ${kind === 'pass' ? 'rusher bulls 4.5 yd/s, blocker anchors' : 'blocker drives 3.0, defender presses 1.5'} | ${DUR} s, pair velocity ${kind === 'pass' ? 'toward the QB (+ walked back)' : 'toward the defender (+ driven back)'}, mean 0.5-2.0 s | TURF_MU_SCALE ${process.env.TURF_MU_SCALE ?? 1}`);
  let base = NaN;
  for (const c of CASES) {
    const Bm = c.both ? c.both.B : c.who === 'B' ? c.mod ?? {} : {}, Rm = c.both ? c.both.R : c.who === 'R' ? c.mod ?? {} : {};
    const r = rep(kind, Bm, Rm, trace && c.who === '-');
    if (c.who === '-') base = r.pair;
    const dv = r.pair - base, dir = c.exp === 0 ? '' : (Math.sign(dv) === c.exp || Math.abs(dv) < 0.02) ? (Math.abs(dv) < 0.02 ? ' NO EFFECT' : ' ok') : ' WRONG WAY';
    console.log(`${c.name.padEnd(44)} pair ${r.pair.toFixed(2)} (${dv >= 0 ? '+' : ''}${dv.toFixed(2)})${dir.padEnd(11)}| gets b/d ${r.bv.toFixed(2)}/${r.dv.toFixed(2)} | hand ${r.hand.toFixed(0)} N | lift b/d ${r.bLift.toFixed(2)}/${r.dLift.toFixed(2)} bw | push cap b/d ${r.cap.bPush.toFixed(0)}/${r.cap.dPush.toFixed(0)} (traction ${r.cap.bTr.toFixed(0)}/${r.cap.dTr.toFixed(0)}) N | kg ${r.cap.bKg.toFixed(0)}/${r.cap.dKg.toFixed(0)}${r.fell > 0 ? ` | FELL at ${r.fell.toFixed(2)} s` : ''}`);
  }
}
