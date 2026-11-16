// The anchor, staged (Integration, 2026-11-15, after SET_SPOT: "a rusher asking 4.5 yd/s into a set blocker and getting
// 0.2 is the anchor and the drive"). contactFixture's pass pair (the C and DT_W), both on the engine's own stepPassRep,
// with the protector's set staged (SET_SPOT's short set) and NO override of either request: the rusher asks what he
// asks in games. For each arm (the rusher's or the blocker's mass or leg power scaled, the other fixed), over
// 0.5-2.0 s of the rep:
//   - the pair's velocity toward the QB (the walk-back), and each body's requested / achieved velocity along that axis;
//   - each body's felt contact force along the axis (support.felt, N = kg yd/s^2 x 0.9144), his lean committed into it
//     (support.lean), and his leg capacity (supportParams: pushForce = min(leg drive, traction)) and traction;
//   - each body's posture (pad level: 0 tall .. 1 sunk) and whether he is still up.
// Measurement only: nothing in src changes.
// usage: [SET_SPOT=1] node --import tsx scripts/diag/effective-mass/anchor-staged.mts
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const { passSetDepth } = await import('../../../src/sim/engagement.js');
const { supportParams } = await import('../../../src/physics/support.js');
const N = 0.9144; // kg yd/s^2 -> N
const ARMS: [string, (b: any, d: any) => void][] = [
  ['base', () => {}],
  ['rusher mass x0.9', (_b, d) => { d.profile.massKg *= 0.9; }],
  ['rusher mass x1.1', (_b, d) => { d.profile.massKg *= 1.1; }],
  ['rusher power x0.85', (_b, d) => { d.profile.power *= 0.85; }],
  ['rusher power x1.15', (_b, d) => { d.profile.power *= 1.15; }],
  ['blocker mass x0.9', (b) => { b.profile.massKg *= 0.9; }],
  ['blocker mass x1.1', (b) => { b.profile.massKg *= 1.1; }],
  ['blocker power x0.85', (b) => { b.profile.power *= 0.85; }],
  ['blocker power x1.15', (b) => { b.profile.power *= 1.15; }],
];
const mean = (v: number[]) => v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN;
for (const [name, edit] of ARMS) {
  const rows: any[] = [];
  for (const side of [1, -1]) {
    const { sim, blocker: b, defender: d } = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side }) as any;
    edit(b, d);
    const home = b.pos.y;
    const setPass = () => { b.passSet = { depth: passSetDepth(sim, b), laneY: home, outside: 0 }; };
    setPass();
    const step = sim.world.step.bind(sim.world);
    let breq = 0, dreq = 0;
    let rep: any = null;
    sim.world.step = (intents: any[], dt: number) => { breq = intents[b.idx]?.vel?.x ?? 0; dreq = intents[d.idx]?.vel?.x ?? 0; setPass(); rep = step(intents, dt); return rep; };
    const gi = (i: number) => rep?.groundImpulse?.[i] && rep.groundImpulseLimit?.[i] ? Math.hypot(rep.groundImpulse[i].x, rep.groundImpulse[i].y) / rep.groundImpulseLimit[i] : NaN;
    const lift = (a: any) => (sim.world.liftFelt?.[a.idx] ?? NaN) / (a.profile.massKg * 9.81 / 0.9144);
    const t0 = sim.t;
    while (sim.t - t0 < 2.5 + 1e-9 && sim.phase !== 'dead') {
      sim.tick();
      const t = sim.t - t0;
      // Axis toward the QB is -x in the fixture (QB at x 35, the pair at x 40): retreat / drive toward the QB +.
      const spb = supportParams(b.profile), spd = supportParams(d.profile);
      rows.push({
        pair: -(b.vel.x + d.vel.x) / 2, breq: -breq, bgot: -b.vel.x, dreq: -dreq, dgot: -d.vel.x,
        bFelt: -(b.body.support?.felt.x ?? 0) * N, dFelt: (d.body.support?.felt.x ?? 0) * N,
        bLean: (b.body.support?.lean.x ?? 0) * N, dLean: -(d.body.support?.lean.x ?? 0) * N,
        bCap: spb.pushForce * N, dCap: spd.pushForce * N, bTr: spb.traction * N, dTr: spd.traction * N,
        bPost: b.body.support?.posture ?? NaN, dPost: d.body.support?.posture ?? NaN,
        up: (b.body.support?.state ?? 'up') === 'up' && (d.body.support?.state ?? 'up') === 'up', eng: !!d.engagement,
        bKg: b.profile.massKg, dKg: d.profile.massKg, t, depth: 40 - b.pos.x, bGI: gi(b.idx), dGI: gi(d.idx), bLift: lift(b), dLift: lift(d),
      });
    }
  }
  if (process.env.ANCHOR_BINS) for (const [a0, c0] of [[0, .5], [.5, 1], [1, 1.5], [1.5, 2.5]]) {
    const B = rows.filter((r) => r.eng && r.up && r.t >= a0 && r.t < c0), g = (k: string) => mean(B.map((r) => r[k]));
    console.log(`  ${name} ${a0.toFixed(1)}-${c0.toFixed(1)} s: pair ${g('pair').toFixed(2)} | rusher asks/gets ${g('dreq').toFixed(2)}/${g('dgot').toFixed(2)} | blocker asks/gets ${g('breq').toFixed(2)}/${g('bgot').toFixed(2)} | felt ${g('bFelt').toFixed(0)}/${g('dFelt').toFixed(0)} | lean blocker ${g('bLean').toFixed(0)} rusher ${g('dLean').toFixed(0)} | blocker depth ${g('depth').toFixed(2)} | ground impulse / limit blocker ${g('bGI').toFixed(2)} rusher ${g('dGI').toFixed(2)} | lift (share of weight) blocker ${g('bLift').toFixed(2)} rusher ${g('dLift').toFixed(2)} | posture ${g('bPost').toFixed(2)}/${g('dPost').toFixed(2)}`);
  }
  const E = rows.filter((r) => r.eng && r.up && r.t >= 0.5 && r.t < 2.0), f = (k: string) => mean(E.map((r) => r[k]));
  console.log(`${name.padEnd(20)} (n ${E.length}, engaged and up ${(100 * E.length / Math.max(1, rows.length)).toFixed(0)}%): ` +
    `pair toward the QB ${f('pair').toFixed(2)} yd/s | rusher asks / gets ${f('dreq').toFixed(2)} / ${f('dgot').toFixed(2)} | ` +
    `blocker asks / gets ${f('breq').toFixed(2)} / ${f('bgot').toFixed(2)} || ` +
    `felt: blocker ${f('bFelt').toFixed(0)} N, rusher ${f('dFelt').toFixed(0)} N | lean into it: blocker ${f('bLean').toFixed(0)}, rusher ${f('dLean').toFixed(0)} N | ` +
    `leg capacity (traction): blocker ${f('bCap').toFixed(0)} (${f('bTr').toFixed(0)}), rusher ${f('dCap').toFixed(0)} (${f('dTr').toFixed(0)}) N | ` +
    `posture blocker ${f('bPost').toFixed(2)}, rusher ${f('dPost').toFixed(2)} | kg ${f('bKg').toFixed(0)} / ${f('dKg').toFixed(0)}`);
}
