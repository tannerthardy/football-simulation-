/**
 * Why do engaged defensive linemen get driven back? Steps real game plays tick
 * by tick and records every run-block rep: displacement, strength, balance,
 * lean, hand forces, control, helpers and the requested intents.
 *   node --import tsx scripts/diag/drive-trace.ts [games] [seed] [out.json]
 */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import { availability, supportParams } from '../../src/physics/support.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { Engagement, Agent } from '../../src/sim/agent.js';

const games = Number(process.argv[2] ?? 4);
const rng = new Rng(Number(process.argv[3] ?? 21));
const out = process.argv[4] ?? 'out/trench/drive-trace.json';
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

type Sample = {
  t: number; disp: number; vD: number; vB: number; helpers: number; control: number;
  availD: number; availB: number; leanD: number; leanB: number; feltD: number; postureD: number; postureB: number;
  xiD: number; normal: number; handPush: number; actorB: boolean; intentD: number; intentB: number; pushD: number;
  facingD: number; stateD: string; phi: number;
  vBy: number; vDy: number; intentBy: number; intentDy: number; facingBmove: number; handHold: number; handSteer: number; tangent: number; limB: string; limD: string;
};
type Rep = {
  play: string; concept: string; blocker: string; defender: string; dPos: string; start: number; end: number; why: string;
  massB: number; massD: number; pushB: number; pushD: number; armB: number; armD: number; strB: number; strD: number;
  helperMass: number; samples: Sample[];
};
const reps: Rep[] = [];

const avail = (a: Agent) => a.body.support ? availability(a.body.support, supportParams(a.profile), fatigueFactor(a.body.energy)) : 1;
const along = (v: { x: number; y: number }, u: { x: number; y: number }) => v.x * u.x + v.y * u.y;

const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    if (sim.isPass) return undefined;
    const live = new Map<Engagement, Rep & { x0: number; dir: number }>();
    const concept = (sim as unknown as { offCall?: { run?: { scheme?: string } } }).offCall?.run?.scheme ?? '?';
    while (sim.phase === 'live' && sim.t < 12) {
      const n = sim.events.length;
      tick.tick();
      for (const e of sim.engagements) {
        if (e.type !== 'run' || !OL.has(e.blocker.slot) || live.has(e)) continue;
        const b = e.blocker, d = e.defender, sb = supportParams(b.profile), sd = supportParams(d.profile);
        live.set(e, { play: 'run', concept, blocker: b.slot, defender: d.slot, dPos: d.player.position, start: sim.t, end: -1, why: 'open',
          massB: b.profile.massKg, massD: d.profile.massKg, pushB: sb.pushForce, pushD: sd.pushForce, armB: sb.armForce, armD: sd.armForce,
          strB: b.r('strength'), strD: d.r('strength'), helperMass: 0, samples: [], x0: d.pos.x, dir: sim.attackDir(b.team) });
      }
      const ev = sim.events.slice(n);
      for (const [e, r] of live) {
        if (r.end >= 0) continue;
        const d = e.defender, b = e.blocker;
        if (!sim.engagements.includes(e)) {
          const shed = ev.find((x) => x.type === 'shed' && x.a === d.idx);
          r.end = sim.t; r.why = shed?.note ?? (sim.phase !== 'live' ? 'whistle' : 'released');
          continue;
        }
        const dir = { x: r.dir, y: 0 };
        const sD = d.body.support!, sB = b.body.support!;
        const iD = sim.intents[d.idx], iB = sim.intents[b.idx];
        r.helperMass = Math.max(r.helperMass, e.helpers.reduce((s, h) => s + h.profile.massKg, 0));
        r.samples.push({
          t: +(sim.t - r.start).toFixed(2), disp: (d.pos.x - r.x0) * r.dir, vD: along(d.vel, dir), vB: along(b.vel, dir),
          helpers: e.helpers.length, control: e.control, availD: avail(d), availB: avail(b),
          leanD: along(sD.lean, dir), leanB: along(sB.lean, dir), feltD: along(sD.felt, dir),
          postureD: sD.posture, postureB: sB.posture, xiD: Math.hypot(sD.xi.x, sD.xi.y),
          normal: e.hands?.normalForce ?? 0, handPush: e.hands?.push ?? 0, actorB: e.hands?.actor === b.body,
          intentD: iD ? along(iD.vel, dir) : NaN, intentB: iB ? along(iB.vel, dir) : NaN, pushD: iD?.push ?? NaN,
          facingD: Math.cos(d.body.facing - Math.atan2(-dir.y, -dir.x)), stateD: sD.state, phi: e.phi,
          vBy: b.vel.y, vDy: d.vel.y, intentBy: iB ? iB.vel.y : NaN, intentDy: iD ? iD.vel.y : NaN,
          facingBmove: iB ? Math.cos(b.body.facing - Math.atan2(iB.vel.y, iB.vel.x)) : NaN,
          handHold: e.hands?.hold ?? 0, handSteer: e.hands?.steer ?? 0, tangent: e.hands?.tangentForce ?? 0,
          limB: sim.world.limiter[sim.world.bodies.indexOf(b.body)] ?? '?', limD: sim.world.limiter[sim.world.bodies.indexOf(d.body)] ?? '?',
        });
      }
    }
    for (const [, r] of live) if (r.end < 0) { r.end = sim.t; r.why = 'whistle'; }
    for (const [, r] of live) { const { x0, dir, ...rest } = r; void x0; void dir; reps.push(rest); }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) {
  simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
  console.error(`game ${g + 1}/${games}: ${reps.length} run reps so far`);
}
writeFileSync(out, JSON.stringify(reps));
console.error(`${reps.length} reps -> ${out}`);
