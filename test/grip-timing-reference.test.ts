/** Independent constant-Jacobian channel: isolate force timing from moving
 * geometry. Actual World geometry/contact contracts live in grip-timing.test.
 */
import { describe, expect, it } from 'vitest';
import { resolveGripInterval } from '../src/physics/grip-timing.js';
import { resolveFastGripInterval } from '../src/physics/grip-fast.js';
import { passiveSlipReference } from '../scripts/diag/physics/passive-slip-reference.js';

class Channel {
  bodies = [0, 1].map(x => ({ pos: { x, y: 0 }, vel: { x: 0, y: x * 4 },
    facing: 0, spin: 0, support: { state: 'up' }, profile: { massKg: 100, radius: .3 } }));
  mass = [100, 100]; inertia = [2, 2]; time = 0;
  joints = [{ kind: 'grasp', a: this.bodies[0], b: this.bodies[1], force: 0, capacity: 2000, legs: 1 }];
  // This constant-Jacobian fixture has a fixed, fully coupled reference at
  // the held COM. Its only attachment motion is the independent linear
  // offset integrated below; it has no rotating material or share transition.
  attachments = new WeakMap([[this.joints[0], { offset: 0, share: 1, reference: { x: 0, y: 0 } }]]);
  report = { work: { hands: 0, grasps: 0, contacts: 0, strikes: 0 }, supportMotorWork: [0, 0], passiveGraspWork: 0 };
  constructor(public mobility: number) {}
  indexOf(b: (typeof this.bodies)[number]) { return this.bodies.indexOf(b); }
  gripCapacity(j: (typeof this.joints)[number]) { return j.capacity; }
  graspPoint(j: (typeof this.joints)[number]) {
    const p = this.attachments.get(j)!;
    return { x: j.b.pos.x + p.reference.x, y: j.b.pos.y + p.reference.y + p.offset };
  }
  energy() { return this.bodies.reduce((s, b, i) => s + .5 * this.mass[i] * b.vel.y ** 2 + .5 * this.inertia[i] * b.spin ** 2, 0); }
  advance(h: number) {
    const [a, b] = this.bodies, K = .02 + 1 / this.inertia[0];
    const slip = b.vel.y - a.vel.y - a.spin;
    const impulse = Math.max(-this.joints[0].capacity * h,
      Math.min(this.joints[0].capacity * h, -slip / (K + this.mobility / h)));
    const transport = impulse * h / 2, before = this.energy();
    a.pos.y += a.vel.y * h - transport / this.mass[0];
    b.pos.y += b.vel.y * h + transport / this.mass[1];
    a.facing += a.spin * h - transport / this.inertia[0];
    a.vel.y -= impulse / this.mass[0]; b.vel.y += impulse / this.mass[1];
    a.spin -= impulse / this.inertia[0];
    this.attachments.get(this.joints[0])!.offset += this.mobility * impulse;
    const work = this.energy() - before, motor = -this.mobility * impulse ** 2 / h;
    this.report.work.grasps += work; this.report.supportMotorWork[1] += motor;
    this.report.passiveGraspWork += work - motor;
    this.joints[0].force += Math.abs(impulse); this.time += h;
  }
}

describe('resolved impulse, temporal moment, attachment and work against a separate force reference', () => {
  it('falls back to the corrected reference when the fast search budget is exhausted',()=>{
    const a=new Channel(.002),b=new Channel(.002), args=(w:Channel)=>[[0,1],[],[],.01,.01,w.report,new Map(),true];
    const r=resolveFastGripInterval(a,args(a),(w,x)=>w.advance(x[3]),undefined,2);
    resolveGripInterval(b,args(b),(w,x)=>w.advance(x[3]));
    expect(a.bodies).toEqual(b.bodies);expect(a.report).toEqual(b.report);
    expect(a.attachments.get(a.joints[0])).toEqual(b.attachments.get(b.joints[0]));
    expect(r.fallbacks).toBe(1);expect(r.limited).toBe(0);
  });
  it.each([0, .0001, .002].flatMap(mobility => ['resolved','fast'].map(mode=>({mobility,mode}))))('matches the exact bounded response with $mode, mobility $mobility', ({mobility,mode}) => {
    const w = new Channel(mobility), dt = .01, K = .52, cap = 2000;
    const j = w.joints[0], bodies = w.bodies, attachments = w.attachments;
    const args = [[0, 1], [], [], dt, dt, w.report, new Map(), true];
    const solve=mode==='fast'?resolveFastGripInterval:resolveGripInterval;
    const r = solve(w, args, (trial, a) => trial.advance(a[3]));
    const ref = passiveSlipReference(4, K, mobility, cap, dt), J = -w.joints[0].force;
    expect(J).toBeCloseTo(ref.impulse, 2);
    expect(w.bodies[0].facing).toBeCloseTo(-ref.transport / 2, 5);
    expect(w.bodies[0].pos.y).toBeCloseTo(-ref.transport / 100, 6);
    expect(w.bodies[1].pos.y).toBeCloseTo(4 * dt + ref.transport / 100, 6);
    expect(w.attachments.get(j)!.offset).toBeCloseTo(mobility * ref.impulse, 6);
    const ts = ref.saturatedUntil, v = Math.max(0, 4 - K * cap * ts), remaining = dt - ts;
    const expectedMotor = mobility === 0 ? 0 : -mobility * cap ** 2 * ts
      - v ** 2 / (2 * K) * -Math.expm1(-2 * K / mobility * remaining);
    expect(Math.abs(w.report.supportMotorWork[1] - expectedMotor)).toBeLessThan(.015);
    expect(w.report.passiveGraspWork).toBeLessThanOrEqual(1e-9);
    expect(w.time).toBeCloseTo(dt, 12);
    expect(r.limited).toBe(0);
    expect(w.bodies).toBe(bodies); expect(w.joints[0]).toBe(j); expect(w.attachments).toBe(attachments);
  });
});
