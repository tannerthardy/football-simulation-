import { describe, expect, it } from 'vitest';
import { SCHEMATIC_FIXTURES, STATIC_QUAD_DIAMOND, auditSchematicFormation, auditSchematicSnap,
  assertSchematicBudgets, createSchematicTeams, runSchematicFixture, schematicSetup } from '../src/lab/schematic-stress.js';
import { PlaySim } from '../src/sim/playsim.js';

const teams = createSchematicTeams();
describe('native schematic stress installation and measurement contracts', () => {
  it('audits actual 11v11 static players and legal eligible endpoints in every fixed call direction', () => {
    for (const fixture of SCHEMATIC_FIXTURES) for (const flip of [false, true]) {
      const sim = new PlaySim(schematicSetup(fixture, flip, false, teams)), snap = auditSchematicSnap(sim);
      expect(sim.agents).toHaveLength(22);
      expect(snap.legality.onLineCount).toBe(7); expect(snap.legality.offLineCount).toBe(4);
      expect(snap.legality.movingOffensivePlayers).toBe(0);
      expect(snap.rushCount + snap.coverageCount).toBe(11);
      expect(snap.defenders.every(d => d.read === 'unsure')).toBe(true);
      expect(snap.offense.every(a => a.vel.x === 0 && a.vel.y === 0)).toBe(true);
    }
  });

  it('rejects covered line eligibles and ambiguous approximate line depths before outcome collection', () => {
    const covered = structuredClone(STATIC_QUAD_DIAMOND); covered.slots.Z!.depth = .6;
    expect(() => auditSchematicFormation(covered)).toThrow('two eligible');
    const ambiguous = structuredClone(STATIC_QUAD_DIAMOND); ambiguous.slots.H!.depth = .9;
    expect(() => auditSchematicFormation(ambiguous)).toThrow('Ambiguous');
    const ambiguousOn = structuredClone(STATIC_QUAD_DIAMOND); ambiguousOn.slots.Y!.depth = .7;
    expect(() => auditSchematicFormation(ambiguousOn)).toThrow('Ambiguous');
    const sameSide = structuredClone(STATIC_QUAD_DIAMOND); sameSide.slots.X!.side = 'R';
    expect(() => auditSchematicFormation(sameSide)).toThrow('two eligible');
    const inside = structuredClone(STATIC_QUAD_DIAMOND); inside.slots.X!.split = 1;
    expect(() => auditSchematicFormation(inside)).toThrow('inside the offensive tackle');
    const ahead = structuredClone(STATIC_QUAD_DIAMOND); ahead.slots.Y!.depth = -.2;
    expect(() => auditSchematicFormation(ahead)).toThrow('Ambiguous');
  });

  it('rejects material impulse/work inconsistencies instead of publishing an apparently finite failure', () => {
    const clean = { momentumResidual: 0, workResidual: 0, armImpulseExcess: 0, armWorkExcess: 0, motorWorkExcess: 0 };
    expect(() => assertSchematicBudgets(clean)).not.toThrow();
    expect(() => assertSchematicBudgets({ ...clean, momentumResidual: .001 })).toThrow('Material physics');
    expect(() => assertSchematicBudgets({ ...clean, armWorkExcess: .001 })).toThrow('Material physics');
    expect(() => assertSchematicBudgets({ ...clean, motorWorkExcess: Number.NaN })).toThrow('Nonfinite');
  });

  it('refuses real overlapping snap bodies and a line end moved inside the tackle', () => {
    const fixture = SCHEMATIC_FIXTURES.find(f => f.id === 'SS-08')!;
    const overlapping = new PlaySim(schematicSetup(fixture, false, false, teams));
    overlapping.slot('Z')!.body.pos = { ...overlapping.slot('H')!.pos };
    expect(() => auditSchematicSnap(overlapping)).toThrow('Overlapping offensive');
    const covered = new PlaySim(schematicSetup(fixture, false, false, teams));
    covered.slot('X')!.body.pos.y = covered.ballY + 1;
    expect(() => auditSchematicSnap(covered)).toThrow('covers an eligible');
  });

  it('retains the actual quad 4x1 and diamond geometry without claiming native motion or a screen', () => {
    const fixture = SCHEMATIC_FIXTURES.find(f => f.id === 'SS-08')!;
    for (const flip of [false, true]) {
      const sim = new PlaySim(schematicSetup(fixture, flip, false, teams)), snap = auditSchematicSnap(sim);
      expect(snap.formationKey).toBe('4x1'); expect(snap.counts).toEqual({ S: 4, W: 1 });
      expect(sim.offCall.pass!.id).toBe('quick_outs'); expect(sim.offCall.pass!.family).toBe('quick');
      const point = sim.slot('Y')!, rear = sim.slot('RB')!, a = sim.slot('H')!, b = sim.slot('Z')!;
      expect(point.pos.x).toBeGreaterThan(a.pos.x); expect(a.pos.x).toBeGreaterThan(rear.pos.x);
      expect(rear.pos.y).toBe(point.pos.y); expect((a.pos.y + b.pos.y) / 2).toBeCloseTo(point.pos.y, 12);
    }
  });

  it('three/eight changes actual jobs while preserving situation, roster and geometry', () => {
    const fixtures = SCHEMATIC_FIXTURES.filter(f => f.family === 'long-yardage');
    const ordinary = new PlaySim(schematicSetup(fixtures[0], false, false, teams)), dropped = new PlaySim(schematicSetup(fixtures[1], false, false, teams));
    const a = auditSchematicSnap(ordinary), b = auditSchematicSnap(dropped);
    expect(a.context).toEqual(b.context); expect(b.context).toMatchObject({ down: 3, distance: 27 });
    expect(a.profileSha256).toBe(b.profileSha256); expect(a.geometrySha256).toBe(b.geometrySha256);
    expect([a.rushCount, a.coverageCount]).toEqual([4, 7]); expect([b.rushCount, b.coverageCount]).toEqual([3, 8]);
    expect(b.defenders.find(d => d.slot === 'DE_W')).toMatchObject({ role: { kind: 'zone', zone: 'curl_flat_w' }, behavior: 'zone',
      runFit: { kind: 'force', gap: 'D', side: -dropped.offAlign.strongSign,
        inside: { kind: 'edge', gap: 'C', side: -dropped.offAlign.strongSign } } });
    dropped.tick(); expect(dropped.slot('DE_W')!.behavior.kind).toBe('zone');
    expect(dropped.defense.filter(d => d.behavior.kind === 'rush')).toHaveLength(3);
  });

  it('exposes the missing second Bunch Mesh crosser instead of presenting the label as a full installation', () => {
    const fixture = SCHEMATIC_FIXTURES.find(f => f.id === 'SS-05')!;
    const snap = auditSchematicSnap(new PlaySim(schematicSetup(fixture, false, false, teams)));
    expect(snap.counts).toEqual({ S: 3, W: 1 });
    expect(snap.offense.filter(a => a.route === 'shallow')).toHaveLength(1);
    expect(snap.offense.filter(a => a.route === 'shallow_high')).toHaveLength(0);
  });

  it('keeps family counterpart capabilities fixed instead of manufacturing a favorable roster', () => {
    for (const family of ['split', 'counter', 'bunch', 'quad', 'long-yardage']) {
      const pair = SCHEMATIC_FIXTURES.filter(f => f.family === family).map(f => auditSchematicSnap(new PlaySim(schematicSetup(f, false, false, teams))));
      expect(pair).toHaveLength(2); expect(pair[0].profileSha256).toBe(pair[1].profileSha256);
    }
  });

  it('recording and consumed-read instrumentation preserve the complete native physical result and RNG', () => {
    const fixture = SCHEMATIC_FIXTURES.find(f => f.id === 'SS-08')!;
    const observed = runSchematicFixture(fixture, false, { record: true, observe: true, verifyObserver: true }, teams);
    const plain = runSchematicFixture(fixture, false, { observe: false }, teams);
    expect(observed.row.observerVerified).toBe(true);
    expect(observed.row.physicalSignature).toBe(plain.row.physicalSignature);
    expect(observed.row.consumedSeeCalls).toBeGreaterThan(0);
    expect(observed.row.consumedCues.length).toBeGreaterThan(0);
    expect(observed.row.metrics.ending).toMatch(/native-whistle|engine-physical-timeout/);
    expect(observed.row.invariants!.momentumResidual).toBeLessThan(1e-7);
    expect(observed.row.invariants!.workResidual).toBeLessThan(1e-7);
    expect(observed.row.invariants!.armImpulseExcess).toBeLessThan(1e-7);
    expect(observed.row.invariants!.armWorkExcess).toBeLessThan(1e-7);
    expect(observed.row.invariants!.motorWorkExcess).toBeLessThan(1e-7);
    expect(observed.film!.result.telemetry!.frames.some(f => f.perception?.length)).toBe(true);
  }, 15000);
});
