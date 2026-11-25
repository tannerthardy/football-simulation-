// BELIEVED_BODY (Flex, 2026-11-24; docs/reviews/2026-11-24-believed-body.md): a holder's belief of an opponent's capacities
// from his build seen, the staff's film and his own looks; the huddle passes what a player saw, not what he believes.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam } from '../src/league/team.js';
import { derivePhysical } from '../src/players/physical.js';
import { BeliefStore, PRIOR_FIT } from '../src/sim/believed-body.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';

const team = generateTeam(new Rng(77), 'T', 'T', { strength: 0.5 });
const wr = team.roster.find((p) => p.position === 'WR')!, cb = team.roster.find((p) => p.position === 'CB')!, s = team.roster.find((p) => p.position === 'S')!;
const agent = (p: typeof wr, experience = p.experience): Agent =>
  ({ player: { ...p, experience }, profile: derivePhysical(p), slot: p.position } as unknown as Agent);
const cue = (vx: number, carrying = false): Perceived => ({ pos: { x: 0, y: 0 }, vel: { x: vx, y: 0 }, stance: null, facing: 0, carrying });

describe('BELIEVED_BODY: the believed body', () => {
  it('the build prior is the engine\'s own population relation (re-fitted here on 16 generated teams)', () => {
    const rows: Array<[number, number, number]> = [];
    for (let t = 0; t < 16; t++) for (const p of generateTeam(new Rng(9000 + t), 'x', 'x', { strength: 0.5 }).roster) {
      if (p.position === 'K' || p.position === 'P') continue;
      rows.push([p.measurables.weightLb, p.measurables.heightIn, derivePhysical(p).vmax]);
    }
    const c = PRIOR_FIT.vmax.c;
    const resid = rows.map(([w, h, v]) => { const u = (w - 250) / 50, hh = (h - 74) / 2; return v - (c[0] + c[1] * u + c[2] * u * u + c[3] * hh); });
    const mean = resid.reduce((a, b) => a + b, 0) / resid.length, sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / resid.length);
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(sd - PRIOR_FIT.vmax.sd)).toBeLessThan(0.05);
  });

  it('a rookie starts at his build (sd about 0.26); a veteran with film starts tight', () => {
    const store = new BeliefStore('t1');
    const rookie = store.belief(agent(cb), agent(wr, 0)).get('vmax');
    expect(rookie.sd).toBeGreaterThan(0.22);
    expect(rookie.sd).toBeLessThan(0.30);
    const vet = new BeliefStore('t2').belief(agent(cb), agent(wr, 6)).get('vmax');
    expect(vet.sd).toBeLessThan(0.07);
  });

  it('what he sees is a lower bound: seeing 10.4 proves at least about 10.1 at once; seeing 6 proves nothing', () => {
    const run = (v: number, carrying = false) => {
      const store = new BeliefStore('t3'), h = agent(cb), r = agent(wr, 0);
      const before = store.belief(h, r).get('vmax');
      for (let t = 0; t <= 0.8 + 1e-9; t += 0.05) store.look(h, r, cue(v, carrying), t, 1);
      return { before, after: store.belief(h, r).get('vmax') };
    };
    const fast = run(10.4);
    expect(fast.after.floor).toBeGreaterThan(10);
    expect(fast.after.mean).toBeGreaterThan(fast.after.floor);
    expect(fast.after.sd).toBeLessThan(fast.before.sd);
    const slow = run(6);
    expect(slow.after.mean).toBeCloseTo(slow.before.mean, 6);
    expect(slow.after.sd).toBeCloseTo(slow.before.sd, 6);
    // Carrying or not, a plateau is a floor: he is seldom at full effort.
    expect(run(9.6, true).after.floor).toBeCloseTo(run(9.6, false).after.floor, 9);
  });

  it('one look is one entry: a held plateau does not re-score every tick', () => {
    const store = new BeliefStore('t4'), h = agent(cb), r = agent(wr, 0);
    for (let t = 0; t <= 2.0 + 1e-9; t += 0.05) store.look(h, r, cue(9.4, true), t, 1);
    expect(store.belief(h, r).entries.filter((e) => e.source.kind === 'saw').length).toBe(1);
  });

  it('the huddle passes what he saw, not his prior or film: the hearer gets the floor, nothing else', () => {
    const store = new BeliefStore('t5'), teller = agent(cb), hearer = agent(s), r = agent(wr, 0);
    store.belief(hearer, r);
    for (let t = 0; t <= 0.8 + 1e-9; t += 0.05) store.look(teller, r, cue(10.4), t, 1);
    store.huddle([[{ id: teller.player.id, awareness01: 1 }, { id: hearer.player.id, awareness01: 1 }]]);
    const b = store.belief(hearer, r), told = b.entries.filter((e) => e.source.kind === 'told');
    expect(told.length).toBe(1);
    expect(told[0].kind).toBe('floor');
    expect(told[0].source.from).toBe(teller.player.id);
    expect(b.entries.filter((e) => e.source.kind === 'appearance' || e.source.kind === 'film').length).toBe(4); // his own, once
    expect(b.get('vmax').floor).toBeGreaterThan(9.9);
    expect(b.get('vmax').mean).toBeGreaterThan(b.get('vmax').floor);
  });
});
