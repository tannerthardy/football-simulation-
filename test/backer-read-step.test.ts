import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { facingTechnique } from '../src/sim/coverage/orientation.js';
import { PlaySim } from '../src/sim/playsim.js';

/** A box backer reads before he moves (G2): until his own read commits, an
 * undecided backer installed in the box stands square at his alignment, eyes
 * on the quarterback as he sees him. Constructed checks of that one branch
 * beside its opposing controls; staged pictures, not native evidence. */
function stage(dropStart?: 'early' | 'confirmed' | 'late') {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'HOM'), '11'), defense: pickDefense(generateTeam(new Rng(32), 'D', 'AWY'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', dropStart, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 5,
  });
  for (let i = 0; i < 20; i++) sim.perception.record(sim.agents);
  sim.t = 0.2;
  const zones = sim.defense.filter(a => a.behavior instanceof ZoneCoverage);
  const backer = zones.find(a => a.slot === 'LB_M')!;
  const deep = zones.find(a => (a.behavior as ZoneCoverage).zone.startsWith('deep'))!;
  for (const a of [backer, deep]) a.recog!.read = 'unsure';
  const label = (a: typeof backer) => facingTechnique((a.behavior as ZoneCoverage).update(a, sim))?.label;
  return { sim, backer, deep, label };
}

describe('a box backer reads before he moves', () => {
  it('stands square at his alignment while his read is undecided', () => {
    const f = stage();
    const command = (f.backer.behavior as ZoneCoverage).update(f.backer, f.sim);
    expect(facingTechnique(command)?.label).toBe('read-step');
    expect(command.vel).toEqual({ x: 0, y: 0 });
  });

  it('faces the quarterback he sees: moving only the unseen quarterback changes nothing', () => {
    const f = stage(), qb = f.sim.qb, fixed = structuredClone(f.sim.see(f.backer, qb));
    const see = f.sim.see.bind(f.sim);
    vi.spyOn(f.sim, 'see').mockImplementation((o, t, ...r) => o === f.backer && t === qb ? structuredClone(fixed) : see(o, t, ...r));
    const before = (f.backer.behavior as ZoneCoverage).update(f.backer, f.sim);
    qb.body.pos = { x: qb.pos.x, y: qb.pos.y + 10 };
    expect((f.backer.behavior as ZoneCoverage).update(f.backer, f.sim)).toEqual(before);
    vi.restoreAllMocks();
  });

  it('drops once his pass read is confirmed (dropStart), and keeps reading while it is not', () => {
    // A first read of pass is not yet a confirmed pass (coached: drop on a confirmed pass): under
    // dropStart 'confirmed' his own belief must reach that level. `early` (the default) drops on the read.
    const unconfirmed = stage('confirmed');
    unconfirmed.backer.recog!.read = 'pass';
    unconfirmed.backer.recog!.logOdds = Math.log(0.8 / 0.2);
    expect(unconfirmed.backer.recog!.pPass()).toBeLessThan(0.95);
    expect(unconfirmed.label(unconfirmed.backer)).toBe('read-step');
    const confirmed = stage('confirmed');
    confirmed.backer.recog!.read = 'pass';
    confirmed.backer.recog!.logOdds = Math.log(0.97 / 0.03);
    expect(confirmed.label(confirmed.backer)).not.toBe('read-step');
    const early = stage();
    early.backer.recog!.read = 'pass';
    early.backer.recog!.logOdds = Math.log(0.8 / 0.2);
    expect(early.label(early.backer)).not.toBe('read-step');
  });

  it('once he drops, a dip in his belief does not send him back to his read step', () => {
    const f = stage('confirmed');
    f.backer.recog!.read = 'pass';
    f.backer.recog!.logOdds = Math.log(0.97 / 0.03);
    expect(f.label(f.backer)).not.toBe('read-step');
    f.backer.recog!.logOdds = Math.log(0.8 / 0.2);
    expect(f.label(f.backer)).not.toBe('read-step');
  });

  it('an apex backer installed outside the box keeps his eased drop, and a deep zone is untouched', () => {
    const f = stage();
    const spot = f.sim.defAlign.spots[f.backer.slot as keyof typeof f.sim.defAlign.spots]!;
    spot.pos = { ...spot.pos, y: f.sim.ballY + 9 };
    expect(f.label(f.backer)).not.toBe('read-step');
    expect(f.label(f.deep)).not.toBe('read-step');
  });
});
