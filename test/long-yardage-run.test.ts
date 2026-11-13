import { describe, expect, it, vi } from 'vitest';

// The fixture's contract is that the situation changes nothing but roles;
// BOX_ALIGN (PR #194) sets backers' depth and end width by down and distance,
// and SITU_DEPTH sets the deep safeties' and zone corners' depth the same way.
vi.hoisted(() => { process.env.BOX_ALIGN = '0'; process.env.SITU_DEPTH = '0'; });
import { auditSnap, createLongYardageTeams, longYardageSetup } from '../scripts/diag/long-yardage-run.js';
import { PlaySim } from '../src/sim/playsim.js';

const teams = createLongYardageTeams(0);
describe('actual long-yardage run stress fixture contracts', () => {
  it.each(['iz_strong', 'draw'] as const)('has legal 11v11 and an actual three/eight job ledger for %s', run => {
    for (const flip of [false, true]) {
      const sim = new PlaySim(longYardageSetup(teams, run, '3rd27', 'drop3', flip));
      const snap = auditSnap(sim);
      expect(snap.offenseCount).toBe(11); expect(snap.defenseCount).toBe(11);
      expect(snap.rushCount).toBe(3); expect(snap.coverageCount).toBe(8);
      const dropper = snap.defenders.find(d => d.slot === 'DE_W')!;
      expect(dropper.role).toMatchObject({ kind: 'zone', zone: 'curl_flat_w' });
      expect(dropper.behavior).toBe('zone');
      // The actual curl-flat dropper can supply outside support, while the
      // same body retains its boxed C gap on inside flow. It is not a fourth rusher.
      expect(dropper.runFit).toMatchObject({ kind: 'force', gap: 'D', side: -sim.offAlign.strongSign,
        inside: { kind: 'edge', gap: 'C', side: -sim.offAlign.strongSign } });
      expect(dropper.initialRead).toBe('unsure');
      expect(sim.snapContext).toMatchObject({ down: 3, distance: 27, hurry: false });
      // Two-high safeties: 12 yd installed. DEF_ALIGN sets quarters safeties at
      // 12 and halves at 14 by role; this drop-8 call's safeties play quarters.
      expect(snap.defenders.filter(d => ['FS', 'SS'].includes(d.slot)).map(d => d.depth)).toEqual([12, 12]);
    }
  });

  it.each(['iz_strong', 'draw'] as const)('changes only declared situation/roles while retaining %s profiles and physical geometry', run => {
    for (const flip of [false, true]) {
      const four = ['1st10', '3rd27'].flatMap(situation => ['rush4', 'drop3'].map(look =>
        auditSnap(new PlaySim(longYardageSetup(teams, run, situation as '1st10' | '3rd27', look as 'rush4' | 'drop3', flip)))));
      expect(new Set(four.map(s => s.profileSha256)).size).toBe(1);
      expect(new Set(four.map(s => s.alignedGeometrySha256)).size).toBe(1);
      expect(four.map(s => s.rushCount)).toEqual([4, 3, 4, 3]);
      const normal = four[0].defenders.find(a => a.slot === 'LB_M')!;
      const long = four[2].defenders.find(a => a.slot === 'LB_M')!;
      expect(long.priorPassProbability).toBeGreaterThan(normal.priorPassProbability);
      expect(four.every(s => s.defenders.every(d => d.initialRead === 'unsure' && !!d.runFit))).toBe(true);
    }
  });

  it('lets the dropped edge retain its real coverage controller through the first native physics step', () => {
    const sim = new PlaySim(longYardageSetup(teams, 'draw', '3rd27', 'drop3', false));
    const edge = sim.slot('DE_W')!;
    expect(edge.recog!.read).toBe('unsure');
    sim.tick();
    expect(edge.behavior.kind).toBe('zone'); expect(edge.runFit).toBeDefined();
    expect(edge.recog!.read).toBe('unsure');
    expect(sim.defense.filter(d => d.behavior.kind === 'rush').length).toBe(3);
    expect(sim.intents.every(i => Number.isFinite(i.vel.x) && Number.isFinite(i.vel.y))).toBe(true);
    expect(Number.isFinite(sim.lastStep!.work.residual)).toBe(true);
  });
});
