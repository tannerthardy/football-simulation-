import { describe, expect, it } from 'vitest';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { linePicture } from '../src/sim/live-gaps.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';

/** A flat puller leaves the line picture. Counter and power pullers run
 * 0.2-0.4 yd behind their stance, inside the old half-yard departure depth,
 * so a guard crossing behind the line still bounded the gaps he ran behind.
 * He has left once he is seen past a teammate he lined up beside, with that
 * teammate on the path he crossed. Each case moves seen bodies from their
 * stances (x back toward the offense, y across); the rest stay home unless the line flows. */
const LOS = 30, BALL = 26.65;
type Move = { dx: number; dy: number };
function scene(moves: Record<string, Move>, onDefender = false, flow = 0) {
  const offAlign = alignOffense(FORMATION_BY_ID.ace_11, false, LOS, BALL);
  const slots = ['LT', 'LG', 'C', 'RG', 'RT', 'Y'].filter(s => offAlign.spots[s as keyof typeof offAlign.spots]);
  const offense = slots.map(slot => {
    const home = offAlign.spots[slot as keyof typeof offAlign.spots]!.pos, m = moves[slot];
    // flow: the rest of the line steps the same way along it, as a zone line does.
    const pos = m ? { x: home.x - m.dx, y: home.y + m.dy } : { x: home.x, y: home.y + flow };
    return { slot, team: 'O', profile: { radius: .35 }, pos };
  }) as unknown as Agent[];
  const lg = offense.find(a => a.slot === 'LG')!;
  const backer = { slot: 'LB_M', team: 'D', profile: { radius: .35 }, pos: { x: LOS + 4.5, y: BALL } } as unknown as Agent;
  const blocked = { slot: 'DT_W', team: 'D', profile: { radius: .35 }, pos: { x: lg.pos.x + .6, y: lg.pos.y } } as unknown as Agent;
  const defense = onDefender ? [backer, blocked] : [backer];
  const sim = {
    t: 1.5, offense, offAlign, ballY: BALL, attackDir: () => 1,
    opponents: (a: Agent) => a.team === 'O' ? defense : offense,
    see: (_o: Agent, b: Agent) => ({ pos: { ...b.pos }, vel: { x: 0, y: 0 } }),
  } as unknown as PlaySim;
  return { sim, backer, gone: () => linePicture(sim, backer).departed.map(b => b.agent.slot).sort() };
}
const guard = (dx: number, dy: number) => ({ LG: { dx, dy } });

describe('a flat puller has left his place in the line', () => {
  it('a guard 3 yd across and 0.3 yd behind his stance is departed', () => {
    expect(scene(guard(.3, 3)).gone()).toEqual(['LG']);
  });
  it('a zone line running flat together keeps its order: the same guard stays on the surface', () => {
    expect(scene(guard(.3, 3), false, 3).gone()).toEqual([]);
  });
  it('the same body a yard across (not yet past the center) still bounds the line', () => {
    expect(scene(guard(.3, 1)).gone()).toEqual([]);
  });
  it('a zone step gains ground: 3 yd across but on or past his stance depth is not departed', () => {
    expect(scene(guard(0, 3)).gone()).toEqual([]);
    expect(scene(guard(-.3, 3)).gone()).toEqual([]);
  });
  it('a defender seen on him keeps him on the surface: he is blocking there', () => {
    expect(scene(guard(.3, 3), true).gone()).toEqual([]);
  });
  it('a tackle setting back outside his tight end has not crossed him: both stay on the line', () => {
    // COV-7's play-action edge: the tackle kicks back 1.32 yd and out 0.73 yd while the tight end steps in
    // 0.8 yd, so the two meet side by side at the edge (0.01 yd apart across), a yard apart in depth.
    expect(scene({ RT: { dx: 1.32, dy: -.73 }, Y: { dx: .1, dy: .8 } }).gone()).toEqual([]);
  });
  it('a nearly still guard is not taken off the line because the other guard pulled across behind him', () => {
    // Integration's acquired-picture control (#393), staged by stance: the guard at y 25.11 moves 0.10 yd
    // across and 0.30 yd back; the guard from y 28.19 pulls past him to (27.17, 24.85), departed by depth.
    expect(scene({ RG: { dx: .30, dy: .10 }, LG: { dx: 2.0, dy: -3.34 } }).gone()).toEqual(['LG']);
  });
  it('a guard who has not reached his neighbour\'s stance has crossed no one, even past the neighbour\'s current spot', () => {
    // Integration's second control (#393): the guard at y 25.11 moves 0.80 yd across and 0.30 yd back, short of the
    // center's stance (26.65); the other guard pulls from y 28.19 to (27.17, 25.16), just beyond his home.
    // The still guard is clear past that body's current position, but its stance lies beyond where he is now.
    expect(scene({ RG: { dx: .3, dy: .8 }, LG: { dx: 2, dy: -3.03 } }).gone()).toEqual(['LG']);
  });
});
