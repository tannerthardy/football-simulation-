// BRACE_GAIT staged pairs (Integration, 2026-11-14). Two equal bodies from contactFixture. The blocker faces the
// defender (+x); the defender drives into him (push 1). Scenarios set the blocker's own velocity and request (planted, or
// moving along / against / across the push at 2, 3, 4 yd/s), a pass-setter in his back-pedal against a bull vs planted,
// and a puller arriving at 4 yd/s on a man holding his ground. Over 0.5 s: the blocker's lean into the man (N, p50), the
// load he feels (N), how far he is driven along the push beyond his own request (yd), and the hands' normal force.
// usage: [BRACE_GAIT=1] node --import tsx scripts/diag/effective-mass/brace-staged.mts
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
type Sc = { name: string; bv: { x: number; y: number }; dv: { x: number; y: number }; dPush?: number; gap?: number };
const S: Sc[] = [{ name: 'planted, driven from the front', bv: { x: 0, y: 0 }, dv: { x: -2, y: 0 } }];
for (const v of [2, 3, 4]) {
  S.push({ name: `moving ${v} yd/s with the push (retreating)`, bv: { x: -v, y: 0 }, dv: { x: -v - 2, y: 0 } });
  S.push({ name: `moving ${v} yd/s against the push`, bv: { x: v, y: 0 }, dv: { x: -2, y: 0 } });
  S.push({ name: `moving ${v} yd/s across the push`, bv: { x: 0, y: v }, dv: { x: -2, y: v } });
}
S.push({ name: 'pass-setter in his back-pedal (3 yd/s) taking a bull', bv: { x: -3, y: 0 }, dv: { x: -4.5, y: 0 } });
S.push({ name: 'pass-setter planted taking the same bull', bv: { x: 0, y: 0 }, dv: { x: -4.5, y: 0 } });
S.push({ name: 'puller arriving at 4 yd/s on a man holding', bv: { x: 4, y: 0 }, dv: { x: 0, y: 0 }, gap: 0.25 });
S.push({ name: 'held in contact: puller at 4 yd/s, the man driving back', bv: { x: 4, y: 0 }, dv: { x: -1, y: 0 }, gap: 0 });
S.push({ name: 'held in contact: moving 4 yd/s against the push', bv: { x: 4, y: 0 }, dv: { x: -2, y: 0 }, gap: 0 });
for (const sc of S) {
  const { sim, blocker: b, defender: d, engagement: e } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  Object.assign(d.profile, structuredClone(b.profile));
  const R = b.profile.radius + d.profile.radius + (sc.gap ?? 0.1);
  b.body.pos = { x: 40, y: 26.65 }; b.body.vel = { ...sc.bv }; b.body.facing = 0;
  d.body.pos = { x: 40 + R, y: 26.65 }; d.body.vel = { x: sc.dv.x + 2 > 0 ? 0 : sc.dv.x + 2, y: sc.dv.y }; d.body.facing = Math.PI;
  e.control = 0;
  const lean: number[] = [], load: number[] = [], N: number[] = [], spd: number[] = []; let driven = 0, dmin = Infinity, fellAt = -1;
  const x0 = b.body.pos.x; let wantX = x0;
  for (let k = 0; k < 25; k++) {
    const intents: any[] = sim.agents.map((a: any) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    intents[b.idx] = { vel: { ...sc.bv }, facing: 0, push: 1, posture: 0.85 };
    intents[d.idx] = { vel: { ...sc.dv }, facing: Math.PI, push: sc.dPush ?? 1, posture: 0.85 };
    sim.world.step(intents, sim.dt);
    wantX += sc.bv.x * sim.dt;
    const sup = b.body.support;
    spd.push(Math.hypot(b.body.vel.x, b.body.vel.y)); dmin = Math.min(dmin, Math.hypot(d.body.pos.x - b.body.pos.x, d.body.pos.y - b.body.pos.y) - b.profile.radius - d.profile.radius);
    if (fellAt < 0 && sup?.state !== 'up') fellAt = k * sim.dt;
    lean.push(Math.max(0, sup?.lean?.x ?? 0)); load.push(Math.max(0, -(sup?.felt?.x ?? 0))); N.push(Math.max(0, e.hands?.normalForce ?? 0));
  }
  driven = wantX - b.body.pos.x;
  console.log(`${sc.name.padEnd(52)} lean into him p50 ${q(lean).toFixed(0).padStart(5)} N | load felt ${q(load).toFixed(0).padStart(5)} N | hands normal ${q(N).toFixed(0).padStart(5)} N | driven beyond his request ${driven.toFixed(2)} yd | his speed p50 ${q(spd).toFixed(2)} | closest gap ${dmin.toFixed(2)} | ${fellAt >= 0 ? `off his feet at ${fellAt.toFixed(2)} s` : 'on his feet'}`);
}
