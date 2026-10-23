/** Film review 2026-10-23 (P007, P012, P013, P024, P026): motion men ran into
 * the line and the QB before the snap. Every planned motion now goes around
 * its set teammates, and the man in motion is judged by his velocity at the
 * snap (7-4-8). */
import { afterEach, describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { inspectInstalledSnap } from '../src/game/presnap-rules.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { MotionKind, SkillSlot } from '../src/playbook/types.js';
import { World } from '../src/physics/world.js';
import { canMotion, planMotion } from '../src/sim/motion.js';
import { PlaySim } from '../src/sim/playsim.js';

const offenseTeam = generateTeam(new Rng(3), 'Motion', 'MOT', { strength: .55 });
const defenseTeam = generateTeam(new Rng(4), 'Front', 'FRO', { strength: .55 });
const body = { vmax: 9, tau: .6, brake: 9, lateral: 9, radius: .27 };

function segDist(a: { x: number; y: number }, b: { x: number; y: number }, p: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const u = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y);
}

describe('motion planner', () => {
  it('never plans a path through a set teammate, in any formation', () => {
    let plans = 0;
    for (const f of FORMATIONS) for (const kind of ['across', 'jet', 'empty', 'return'] as MotionKind[]) {
      const off = alignOffense(f, false, 40, CENTER_Y, { kind: 'run' });
      for (const slot of Object.keys(f.slots) as SkillSlot[]) {
        if (!canMotion(off, slot)) continue;
        const plan = planMotion(off, { slot, kind }, body);
        if (!plan) continue;
        plans++;
        const p0 = off.spots[slot].pos;
        const path = [p0, ...plan.legs.map(l => l.to)];
        for (const o of Object.values(off.spots)) {
          if (o.slot === slot) continue;
          const start = Math.hypot(p0.x - o.pos.x, p0.y - o.pos.y);
          // Waypoints may be cut short of a corner; bodies touch at about .62.
          const closest = Math.min(...path.slice(1).map((q, i) => segDist(path[i], q, o.pos)));
          expect(closest, `${f.id} ${slot} ${kind} vs ${o.slot}`).toBeGreaterThanOrEqual(Math.min(.62 + .2, start) - .01);
        }
      }
    }
    expect(plans).toBeGreaterThan(80);
  });

  it('passes an across motion behind a QB under center', () => {
    const off = alignOffense(FORMATION_BY_ID.ace_12, false, 40, CENTER_Y, { kind: 'run' });
    const plan = planMotion(off, { slot: 'Z', kind: 'across' }, body)!;
    const qb = off.spots.QB.pos;
    expect(qb.x).toBeCloseTo(38.4, 5);
    const lane = Math.min(...plan.legs.map(l => l.to.x));
    expect(lane).toBeLessThan(qb.x - .55);
  });
});

describe('a motion played out by the bodies', () => {
  afterEach(() => { delete process.env.MOTION; });

  function sim(formation: string, slot: SkillSlot, kind: MotionKind, personnel: '11' | '12') {
    return new PlaySim({
      offense: pickOffense(offenseTeam, personnel), defense: pickDefense(defenseTeam, 'base43'),
      offCall: { formation: FORMATION_BY_ID[formation], flip: false, kind: 'run', run: RUN_BY_ID.iz_strong,
        motion: { slot, kind }, label: 'motion clearance' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover 3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
    });
  }

  it('touches no teammate before the snap', () => {
    const step = World.prototype.step;
    const touches: string[] = [];
    let current: PlaySim | null = null;
    World.prototype.step = function (intents, dt) {
      const report = step.call(this, intents, dt);
      // Only the pre-snap phase; the PlaySim's agents are in world order.
      if (this.time < 0) for (const c of report.contacts) {
        if (!(c.impulse > 0) || !current) continue;
        const a = current.agents[c.i], b = current.agents[c.j];
        if (a?.team === 'O' && b?.team === 'O') touches.push(`${a.slot}-${b.slot}`);
      }
      return report;
    };
    try {
      const cases: Array<[string, SkillSlot, MotionKind, '11' | '12']> = [
        ['ace_12', 'Z', 'across', '12'], ['gun_trips_11', 'Y', 'across', '11'], ['gun_doubles_11', 'H', 'return', '11'],
        ['gun_wing_12', 'H', 'across', '12'], ['gun_doubles_11', 'Z', 'jet', '11']];
      for (const [f, slot, kind, personnel] of cases) {
        // The constructor plays the pre-snap phase; capture its world first.
        const proto = PlaySim.prototype as unknown as { stageDefense(...args: unknown[]): void };
        const stage = proto.stageDefense;
        proto.stageDefense = function (this: PlaySim, ...args: unknown[]) { current = this; return stage.apply(this, args); };
        try {
          const s = sim(f, slot, kind, personnel);
          expect(s.motion, `${f} ${slot} ${kind} planned`).not.toBeNull();
        } finally { proto.stageDefense = stage; }
      }
    } finally { World.prototype.step = step; }
    expect(touches).toEqual([]);
  }, 60000);

  it('snaps a jet where his plan times him', () => {
    for (const [f, slot] of [['gun_doubles_11', 'Z'], ['gun_trey_11', 'Z'], ['gun_doubles_11', 'H']] as const) {
      const s = sim(f, slot, 'jet', '11'), man = s.slot(slot)!;
      expect(s.motion, `${f} ${slot}`).not.toBeNull();
      // Timed from where he cuts the corner: within half a yard of his snap point.
      expect(Math.abs(man.pos.y - s.motion!.plan.snapPos.y), `${f} ${slot}`).toBeLessThan(.5);
    }
  });

  it('flags a motion man still moving toward the line at the snap', () => {
    const s = sim('gun_trips_11', 'Y', 'across', '11');
    expect(inspectInstalledSnap(s).fouls.some(f => f.kind === 'illegal_motion')).toBe(false);
    s.slot('Y')!.body.vel = { x: 2, y: 0 };
    const fouls = inspectInstalledSnap(s).fouls.filter(f => f.kind === 'illegal_motion');
    expect(fouls.map(f => f.playerId)).toEqual([s.slot('Y')!.player.id]);
    // Moving parallel to the line (a jet) is legal.
    s.slot('Y')!.body.vel = { x: 0, y: 6 };
    expect(inspectInstalledSnap(s).fouls.some(f => f.kind === 'illegal_motion')).toBe(false);
  });
});
