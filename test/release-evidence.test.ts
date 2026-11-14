/** The release candidate's evidence (src/sim/release-evidence.ts): the cues one observer saw this tick, each at the
 * moment its sample shows; nothing seen is no cue. */
import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import { releaseEvidence } from '../src/sim/release-evidence.js';

function staged(wall: boolean) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  for (let k = 0; k < 4; k++) sim.tick();
  const qb = sim.qb, d = sim.defense.find((x: any) => x.slot.startsWith('LB'))!, blocker = sim.offense.find((o: any) => o.slot === 'LG')!;
  for (const e of [...sim.engagements]) sim.disengage(e);
  for (const o of sim.agents) if (o !== qb && o !== d && o !== blocker) { o.body.pos = { x: 5, y: 1 + o.idx * 0.9 }; o.body.vel = { x: 0, y: 0 };
    o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; }
  const idle = (facing: number) => ({ kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing }) } as any);
  qb.body.pos = { x: sim.los - 6, y: 26 }; qb.body.vel = { x: 0, y: 0 }; qb.body.facing = 0; qb.behavior = idle(0);
  d.body.pos = { x: sim.los + 5, y: 26 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI; d.behavior = idle(Math.PI);
  // A 6'8" lineman standing straight up between them, or out of the way.
  blocker.body.pos = wall ? { x: sim.los - 1, y: 26 } : { x: 5, y: 50 }; blocker.body.vel = { x: 0, y: 0 };
  (blocker.body.support as any).posture = 0; (blocker as any).profile = { ...blocker.profile, heightYd: 80 / 36 };
  blocker.behavior = idle(Math.PI);
  return { sim, qb, d };
}

describe('release evidence', () => {
  it('a pump in plain view: motion, the arm through, then the pull-down; behind a tall body: nothing', () => {
    for (const wall of [false, true]) {
      const { sim, d } = staged(wall);
      const cues: { kind: string; at: number; t: number }[] = [];
      const step = () => { sim.tick(); for (const c of releaseEvidence(sim, d)) cues.push({ kind: c.kind, at: c.at, t: sim.t }); };
      for (let k = 0; k < 10; k++) step();
      const w0 = sim.t; sim.windupAt = sim.t;            // he loads
      for (let k = 0; k < 4; k++) step();
      sim.deliveryAt = sim.t;                            // the arm comes through, and he keeps the ball
      for (let k = 0; k < 3; k++) step();
      const p0 = sim.t; sim.windupAt = -1; sim.deliveryAt = -1;   // pulled down
      for (let k = 0; k < 14; k++) step();
      if (wall) { expect(cues).toEqual([]); continue; }
      expect(cues.map((c) => c.kind)).toEqual(['motion', 'through', 'pulled']);
      // Each at the moment its sample shows: after the event, and reaching him one delay later.
      expect(cues[0].at).toBeGreaterThanOrEqual(w0 - 1e-9);
      expect(cues[0].t - cues[0].at).toBeGreaterThan(0.1);
      expect(cues[2].at).toBeGreaterThanOrEqual(p0 - 1e-9);
    }
  });

  it('a real throw: ball cues only after the release, for defenders who could see it; no pull-down', () => {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'slant_flat', seed: 2, roster: 2, formation: 'gun_doubles_11', flip: false }));
    const cues: { kind: string; at: number; who: string }[] = [];
    while (sim.phase !== 'dead' && sim.t < 6 && !(sim.throwAt >= 0 && sim.t > sim.throwAt + 1)) {
      sim.tick();
      for (const d of sim.defense) for (const c of releaseEvidence(sim, d)) cues.push({ kind: c.kind, at: c.at, who: d.slot });
    }
    expect(sim.throwAt).toBeGreaterThan(0);
    const ball = cues.filter((c) => c.kind === 'ball');
    expect(ball.length).toBeGreaterThan(0);
    for (const c of ball) expect(c.at).toBeGreaterThanOrEqual(sim.throwAt - 1e-9);
    expect(cues.some((c) => c.kind === 'through' && c.at <= sim.throwAt + 1e-9)).toBe(true);
    expect(cues.filter((c) => c.kind === 'pulled')).toEqual([]);
  });
});
