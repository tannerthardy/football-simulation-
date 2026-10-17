import { describe, expect, it } from 'vitest';
import { OWN_GOAL_X, OPP_GOAL_X } from '../src/core/field.js';
import { restore } from './helpers/saved-game-result-accounting.js';

function stopped(id: string) {
  const r = restore(id);
  const event = r.c.events.find(e => e.type === 'safety' || e.type === 'sack')!;
  const wrap = r.c.events.find(e => e.type === 'tackle_wrap')!;
  r.sim.stats.sacked = false;
  r.sim.stats.tacklers = [];
  delete r.sim.stats.sackedBy;
  delete r.sim.stats.passer;
  // Replay only the finishing boundary, leaving the archived result untouched.
  const prefix = r.c.events.filter(e => !(e.t === event.t && ['sack','tackle','safety'].includes(e.type)));
  r.sim.events.splice(0, r.sim.events.length, ...prefix);
  r.sim.t = event.t;
  r.sim.bond = { carrier: r.carrier, tacklers: [r.agents[wrap.a!]], start: wrap.t, progressX: r.result.endX, down: false };
  return r;
}

describe('safety result credit at the goal plane', () => {
  it('restores G2-P140 sack/tackler credit, credits only five yards, and retains its physical stop', () => {
    const { sim, c, result, record, qb, off, def } = stopped('G2-P140');
    expect(result.yards).toBe(-7.5); // Historical observation, not the desired box value.
    sim.finishCarry('tackle', { x: result.endX, y: result.endY });
    sim.t = c.log.duration!; // Preserve the enclosing native tick's recorded duration.
    const corrected = sim.buildResult();
    expect(corrected).toMatchObject({ outcome: 'safety', score: { team: 'D', kind: 'safety' },
      yards: -5, offenseYards: -5, endX: 7.502919246685144, duration: result.duration });
    expect(corrected.segments).toEqual(result.segments);
    expect(corrected.stats).toMatchObject({ passer: 'A2-QB2', sacked: true, sackedBy: ['H2-EDGE4'], tacklers: ['H2-EDGE4'], attempted: false, scramble: false, pressured: false });
    expect(corrected.events.filter(e => ['sack','safety'].includes(e.type)).map(e => [e.type,e.t]))
      .toEqual([['sack',2.8], ['safety',2.8]]);
    const box = record(corrected);
    expect(box.players.get(qb.player.id)).toMatchObject({ sacked: 1, sackYds: 5, att: 0, passYds: 0, rushAtt: 0 });
    expect(box.team(off.abbr)).toMatchObject({ sacksAllowed: 1, passYds: -5, totalYds: -5, rushYds: 0, turnovers: 0 });
    expect(box.players.get('H2-EDGE4')).toMatchObject({ team: def.abbr, sacks: 1, tackles: 1, pressures: 0 });
  });

  it('retains the ordinary G2-P093 sack and its physical field-of-play yardage', () => {
    const { sim, result, record } = stopped('G2-P093');
    sim.finishCarry('tackle', { x: result.endX, y: result.endY });
    const r = sim.buildResult();
    expect(r.score).toBeNull();
    expect(r.yards).toBe(result.yards);
    expect(r.stats.sackedBy).toEqual(['H2-EDGE4']);
    expect(record(r).players.get('H2-EDGE4')).toMatchObject({ sacks: 1, tackles: 1 });
  });

  it('retains rush credit for a declared QB scramble into the end zone', () => {
    const { sim, result, record, off } = stopped('G2-P140');
    sim.scrambled = true;
    sim.stats.scramble = true;
    sim.stats.rusher = sim.qb.player.id;
    sim.finishCarry('tackle', { x: result.endX, y: result.endY });
    const r = sim.buildResult(), box = record(r);
    expect(r.stats.sacked).toBe(false);
    expect(box.team(off.abbr)).toMatchObject({ rushYds: -5, passYds: 0, sacksAllowed: 0, totalYds: -5 });
    expect(box.players.get('H2-EDGE4')).toMatchObject({ tackles: 1, sacks: 0 });
  });

  it('bounds an out-of-bounds safety without inventing a tackle or sack', () => {
    const { sim, result } = restore('G2-P140');
    sim.finishCarry('oob', { x: result.endX, y: result.endY });
    expect(sim.buildResult()).toMatchObject({ yards: OWN_GOAL_X-sim.los, outcome: 'safety', stats: { sacked: false, tacklers: [] } });
  });

  it('retains an opponent-end-zone interception touchback with no offensive safety loss', () => {
    const { sim, carrier } = restore('G1-P141');
    sim.finishCarry('tackle', { x: OPP_GOAL_X+2, y: carrier.pos.y });
    expect(sim.buildResult()).toMatchObject({ outcome: 'touchback', turnover: true, score: null, yards: 0, offenseYards: 0 });
  });
});
