/** Turn bench (Tools/Physics, 2026-11-25, measurement only): one body at a steady entry speed is asked to turn by an angle at full
 * effort; the track is written at 10 Hz in the census play format so the same operator (turn_speed.py) reads it as it reads the NFL's
 * and the game's tracks.
 * World only: PlaySim fixture (contactFixture's), every other body parked, no controller. The tested body flies at the entry speed
 * (asked the entry speed along +x, started at it), steady for 1.5 s, then asked vmax x effort 1 along the new heading (cutSkill 1,
 * facing the direction of travel, the same command a pursuer's `runThrough` issues with cutSkill = bend 1). 3.5 s recorded.
 *   node --import tsx scripts/diag/pursuit/turn_bench.mts [--out out/pursuit/turn-bench.jsonl.gz] [--cut 1.0] [--effort 1]
 * Bodies: the fixture defense's CB_W, CB_S, FS, SS, LB_M, LB_W and the offense's RB, X (WR) and Y (TE) (slots as the fixture has them). */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const KIN = await import('../../../src/physics/kinematics.js');
const SUP = await import('../../../src/physics/support.js');
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const out = arg('--out', 'out/pursuit/turn-bench.jsonl.gz'), CUT = Number(arg('--cut', '1')), EFF = Number(arg('--effort', '1'));
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); gz.pipe(createWriteStream(out));
const f = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side: 1 });
const sim = (f as any).sim;
const slots = ['CB_W', 'CB_S', 'FS', 'SS', 'LB_M', 'LB_W', 'RB', 'X', 'Y'].filter(s => sim.slot(s));
const ENTRY = [5.5, 7, 8.5], ANG = [30, 60, 90, 120], SPIN = 5.0, SETTLE = 1.5, REC = 3.5, DT = 0.1; // from rest, asked the entry speed for SPIN s (a flying start leaves the support state behind the velocity), recorded from SETTLE s before the turn
const rows: any[] = [];
for (const slot of slots) {
  const a = sim.slot(slot)!;
  for (const v0 of ENTRY) for (const ang of ANG) for (const sgn of [1, -1]) {
    for (const o of sim.agents) { o.body.pos = { x: 75 + o.idx * 3, y: 10 }; o.body.vel = { x: 0, y: 0 }; o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
    a.body.pos = { x: 5, y: 26.65 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0; a.body.energy = 1; a.body.sprintLoad = 0;
    const th = sgn * ang * Math.PI / 180, vm = a.profile.vmax * EFF;
    const X: number[] = [], Y: number[] = [], FC: number[] = [], DC: number[] = [], LN: number[] = [], AV: number[] = [], PA: number[] = [], PN: number[] = []; let t = 0, next = SPIN - SETTLE;
    const steps = Math.round((SPIN + REC) / sim.dt);
    for (let k = 0; k <= steps; k++) {
      if (t >= next - 1e-9) { X.push(+a.body.pos.x.toFixed(3)); Y.push(+a.body.pos.y.toFixed(3)); FC.push(+a.body.facing.toFixed(3)); const rq = t >= SPIN - 1e-9 ? th : 0; let df = a.body.facing - rq; df = Math.atan2(Math.sin(df), Math.cos(df)); DC.push(+(KIN.directionalSpeedFactor(a.profile, df) * KIN.trunkPrice(a.body)).toFixed(3)); const su = a.body.support; LN.push(+(su ? Math.hypot(su.lean.x, su.lean.y) : 0).toFixed(2)); { const W = sim.world as any; AV.push(+SUP.availability(a.body.support, W.sp[a.idx], W.fat[a.idx]).toFixed(3)); const pl = W.plans[a.idx], sp = Math.hypot(a.body.vel.x, a.body.vel.y); if (pl && sp > 0.5) { const tx = a.body.vel.x / sp, ty = a.body.vel.y / sp; PA.push(+(pl.ax * tx + pl.ay * ty).toFixed(2)); PN.push(+(-pl.ax * ty + pl.ay * tx).toFixed(2)); } else { PA.push(NaN); PN.push(NaN); } } next += DT; }
      const turning = t >= SPIN - 1e-9;
      const intents: any[] = sim.agents.map((o: any) => ({ vel: { x: 0, y: 0 }, facing: o.facing }));
      intents[a.idx] = turning ? { vel: { x: vm * Math.cos(th), y: vm * Math.sin(th) }, effort: EFF, cutSkill: CUT } : { vel: { x: v0, y: 0 }, effort: 1, cutSkill: CUT };
      sim.world.step(intents, sim.dt); sim.t += sim.dt; t += sim.dt;
    }
    rows.push({ src: 'bench', id: `${slot}-${v0}-${sgn * ang}`, slot, v0, ang: sgn * ang, vmax: a.profile.vmax, lateral: a.profile.lateral, brake: a.profile.brake, tau: a.profile.tau, mass: a.profile.massKg, t0: Math.round(SETTLE / DT), x: [X], y: [Y], fc: [FC], dc: [DC], ln: [LN], av: [AV], pa: [PA], pn: [PN] });
  }
}
for (const r of rows) gz.write(JSON.stringify(r) + '\n');
gz.end();
console.log(`bench: ${rows.length} tracks; dt ${sim.dt}; bodies ${slots.map(s => `${s} vmax ${sim.slot(s).profile.vmax.toFixed(2)} lat ${sim.slot(s).profile.lateral.toFixed(1)} brake ${sim.slot(s).profile.brake.toFixed(1)}`).join('; ')}`);
