import { describe, expect, it } from 'vitest';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { linePicture } from '../src/sim/live-gaps.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';

/** A flat puller leaves the line picture. Counter and power pullers run
 * 0.2-0.4 yd behind their stance, inside the old half-yard departure depth,
 * so a guard crossing behind the line still bounded the gaps he ran behind.
 * Each case moves only the left guard's seen body; everyone else stays home. */
const LOS = 30, BALL = 26.65;
function scene(guard: { dx: number; dy: number }, onDefender = false) {
  const offAlign = alignOffense(FORMATION_BY_ID.ace_11, false, LOS, BALL);
  const slots = ['LT', 'LG', 'C', 'RG', 'RT', 'Y'].filter(s => offAlign.spots[s as keyof typeof offAlign.spots]);
  const offense = slots.map(slot => ({ slot, team: 'O', profile: { radius: .35 }, pos: { ...offAlign.spots[slot as keyof typeof offAlign.spots]!.pos } })) as unknown as Agent[];
  const lg = offense.find(a => a.slot === 'LG')!;
  lg.pos = { x: lg.pos.x - guard.dx, y: lg.pos.y + guard.dy };
  const backer = { slot: 'LB_M', team: 'D', profile: { radius: .35 }, pos: { x: LOS + 4.5, y: BALL } } as unknown as Agent;
  const blocked = { slot: 'DT_W', team: 'D', profile: { radius: .35 }, pos: { x: lg.pos.x + .6, y: lg.pos.y } } as unknown as Agent;
  const defense = onDefender ? [backer, blocked] : [backer];
  const sim = {
    t: 1.5, offense, offAlign, ballY: BALL, attackDir: () => 1,
    opponents: (a: Agent) => a.team === 'O' ? defense : offense,
    see: (_o: Agent, b: Agent) => ({ pos: { ...b.pos }, vel: { x: 0, y: 0 } }),
  } as unknown as PlaySim;
  return { sim, backer, gone: () => linePicture(sim, backer).departed.map(b => b.agent.slot) };
}

describe('a flat puller has left his place in the line', () => {
  it('a guard 3 yd across and 0.3 yd behind his stance is departed', () => {
    expect(scene({ dx: .3, dy: 3 }).gone()).toEqual(['LG']);
  });
  it('the same body a yard across (inside his split) still bounds the line', () => {
    expect(scene({ dx: .3, dy: 1 }).gone()).toEqual([]);
  });
  it('a zone step gains ground: 3 yd across but on or past his stance depth is not departed', () => {
    expect(scene({ dx: 0, dy: 3 }).gone()).toEqual([]);
    expect(scene({ dx: -.3, dy: 3 }).gone()).toEqual([]);
  });
  it('a defender seen on him keeps him on the surface: he is blocking there', () => {
    expect(scene({ dx: .3, dy: 3 }, true).gone()).toEqual([]);
  });
});
