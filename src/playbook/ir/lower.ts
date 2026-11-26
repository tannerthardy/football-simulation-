/** Call description → the objects today's readers take (step 1). The inverse of `describe.ts`: a Formation for
 * alignment.ts `alignOffense`, a DefensivePlayCall for `alignDefense`, a PassConcept / RunConcept for the play. Built
 * from the description alone; a preset name is only carried as the object's id (today's readers still read some ids:
 * the report's "still behind a name" list). */
import type {
  Coverage, CoverageRole, DefensivePlayCall, DefSlot, Formation, Front, PassConcept, Pressure, RunConcept,
} from '../types.js';
import type { CoverageCall, DefenseDescription, OffenseDescription, PassDescription, PressureCall, RunDescription } from './types.js';

export function lowerFormation(d: OffenseDescription): Formation {
  return {
    id: d.preset.id, name: d.name, personnel: d.personnel, qb: d.qb.where.alignment,
    slots: Object.fromEntries(d.players.map((p) => [p.who.slot, { ...p.where }])), tags: [...d.tags],
  };
}

export function lowerPass(d: PassDescription): PassConcept {
  const strong: PassConcept['strong'] = {}, weak: PassConcept['weak'] = {};
  for (const r of d.routes) (r.who[0] === 'S' ? strong : weak)[Number(r.who.slice(1)) as 1] = r.route.id;
  return {
    id: d.preset.id, name: d.name, family: d.family.id as PassConcept['family'], drop: d.drop.id as PassConcept['drop'],
    strong, weak, back: d.back.job === 'route' ? d.back.route.id : d.back.job, ...structuredClone(d.rest),
  } as PassConcept;
}

export function lowerRun(d: RunDescription): RunConcept {
  return { id: d.preset.id, name: d.name, scheme: d.scheme.id as RunConcept['scheme'], ...structuredClone(d.rest) } as RunConcept;
}

function lowerCoverage(c: CoverageCall, roles: Partial<Record<DefSlot, CoverageRole>>): Coverage {
  const out: Coverage = {
    id: c.preset.id, name: c.name, shell: c.shell, man: c.man, roles: { ...structuredClone(roles), ...structuredClone(c.offField) },
    underneath: structuredClone(c.underneath), press: c.press,
  };
  if (c.look !== undefined) out.look = c.look;
  if (c.family) out.family = c.family.id as Coverage['family'];
  if (c.checks) out.checks = structuredClone(c.checks);
  if (c.structureChecks) out.structureChecks = structuredClone(c.structureChecks);
  if (c.needs) out.needs = [...c.needs];
  if (c.note !== undefined) out.note = c.note;
  return out;
}

function lowerPressure(p: PressureCall, d: DefenseDescription): Pressure {
  const blitzers: Pressure['blitzers'] = {}, droppers: NonNullable<Pressure['droppers']> = {};
  for (const pl of d.players) {
    const job = pl.what.pressure;
    if (job && 'rush' in job) blitzers[pl.who.slot] = { ...job.rush };
    else if (job && 'drop' in job) droppers[pl.who.slot] = structuredClone(job.drop);
  }
  const out: Pressure = { id: p.preset.id, name: p.name, blitzers: { ...blitzers, ...structuredClone(p.offField.blitzers) }, coverages: [...p.coverages] };
  const allDroppers = { ...droppers, ...structuredClone(p.offField.droppers) };
  if (Object.keys(allDroppers).length) out.droppers = allDroppers;
  if (p.rushers !== undefined) out.rushers = p.rushers;
  if (p.maxRushers) out.maxRushers = { ...p.maxRushers };
  if (p.coverage !== undefined) out.coverage = p.coverage;
  if (p.flag !== undefined) out.flag = p.flag;
  return out;
}

export function lowerDefense(d: DefenseDescription): DefensivePlayCall {
  const slots: Front['slots'] = {}, fits: NonNullable<Front['fits']> = {}, roles: Partial<Record<DefSlot, CoverageRole>> = {};
  for (const p of d.players) {
    if (p.where) slots[p.who.slot] = { ...p.where };
    if (p.fit) fits[p.who.slot] = { ...p.fit };
    if (p.what.coverage) roles[p.who.slot] = structuredClone(p.what.coverage);
  }
  const front: Front = { id: d.front.preset.id, name: d.front.name, personnel: [...d.front.personnel],
    slots: { ...slots, ...structuredClone(d.front.offField.slots) } };
  const allFits = { ...fits, ...structuredClone(d.front.offField.fits) };
  if (Object.keys(allFits).length) front.fits = allFits;
  const call: DefensivePlayCall = {
    ...structuredClone(d.call), personnel: d.personnel, front, coverage: lowerCoverage(d.coverage, roles),
    pressure: d.pressure ? lowerPressure(d.pressure, d) : null,
  };
  if (d.shown) call.shown = lowerCoverage(d.shown.coverage, d.shown.roles);
  return call;
}
