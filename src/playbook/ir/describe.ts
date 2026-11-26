/** Presets → call description (step 1): today's formations, concepts, fronts, coverages and pressures written as
 * players. Pure data: nothing is computed that the presets do not already state. */
import type {
  Coverage, CoverageRole, DefensivePlayCall, DefSlot, Formation, Front, PassConcept, Pressure, ReceiverRef, RunConcept,
  SkillSlot,
} from '../types.js';
import { DEF_PERSONNEL } from '../types.js';
import { BACKERS, FAMILY, FRONT_MENU } from '../alignment.js';
import { ref, type CoverageCall, type DefenseDescription, type DefPlayer, type OffenseDescription, type PassDescription,
  type PressureCall, type RunDescription } from './types.js';

export function describeFormation(f: Formation): OffenseDescription {
  return {
    preset: ref('formation', f.id), name: f.name, personnel: f.personnel, qb: { where: { alignment: f.qb } },
    players: (Object.entries(f.slots) as [SkillSlot, NonNullable<Formation['slots'][SkillSlot]>][])
      .map(([slot, where]) => ({ who: { slot }, where: { ...where } })),
    tags: [...f.tags],
  };
}

export function describePass(c: PassConcept): PassDescription {
  const { id, name, family, drop, strong, weak, back, ...rest } = c;
  const routes = [
    ...Object.entries(strong).filter(([, r]) => r).map(([n, r]) => ({ who: `S${n}` as ReceiverRef, route: ref('route', r as string) })),
    ...Object.entries(weak).filter(([, r]) => r).map(([n, r]) => ({ who: `W${n}` as ReceiverRef, route: ref('route', r as string) })),
  ];
  return {
    preset: ref('concept', id), name, family: ref('pass-family', family), drop: ref('drop', drop), routes,
    back: back === 'block' || back === 'check' ? { job: back } : { job: 'route', route: ref('route', back) },
    rest: structuredClone(rest),
  };
}

export function describeRun(c: RunConcept): RunDescription {
  const { id, name, scheme, ...rest } = c;
  return { preset: ref('concept', id), name, scheme: ref('run-scheme', scheme), rest: structuredClone(rest) };
}

function coverageCall(c: Coverage, present: ReadonlySet<DefSlot>): CoverageCall {
  const offField = Object.fromEntries(Object.entries(c.roles).filter(([s]) => !present.has(s as DefSlot))) as CoverageCall['offField'];
  return {
    preset: ref('coverage', c.id), name: c.name, shell: c.shell, man: c.man, press: c.press, look: c.look,
    family: c.family ? ref('coverage-family', c.family) : undefined, underneath: structuredClone(c.underneath),
    checks: c.checks && structuredClone(c.checks), structureChecks: c.structureChecks && structuredClone(c.structureChecks),
    needs: c.needs && [...c.needs], note: c.note, offField: structuredClone(offField),
  };
}

function pressureCall(p: Pressure, present: ReadonlySet<DefSlot>): PressureCall {
  const off = <T>(r: Partial<Record<DefSlot, T>> | undefined) => Object.fromEntries(Object.entries(r ?? {}).filter(([s]) => !present.has(s as DefSlot))) as Partial<Record<DefSlot, T>>;
  return {
    preset: ref('pressure', p.id), name: p.name, rushers: p.rushers, maxRushers: p.maxRushers && { ...p.maxRushers },
    coverages: [...p.coverages], coverage: p.coverage, flag: p.flag,
    offField: { blitzers: structuredClone(off(p.blitzers)), droppers: structuredClone(off(p.droppers)) },
  };
}

/** A defensive call as players: every slot the personnel fields, with his front spot, fit, coverage role and pressure
 * job as the presets state them. */
export function describeDefense(call: DefensivePlayCall): DefenseDescription {
  const bodies = DEF_PERSONNEL[call.personnel] ?? {};
  const slots = Object.keys(bodies) as DefSlot[], present = new Set(slots);
  const { personnel, front, coverage, pressure, shown, ...rest } = call;
  const players: DefPlayer[] = slots.map((slot) => {
    const p: DefPlayer = { who: { slot, position: bodies[slot] }, what: {} };
    if (front.slots[slot]) p.where = { ...front.slots[slot]! };
    if (front.fits?.[slot]) p.fit = { ...front.fits[slot]! };
    if (coverage.roles[slot]) p.what.coverage = structuredClone(coverage.roles[slot]) as CoverageRole;
    if (pressure?.blitzers[slot]) p.what.pressure = { rush: { ...pressure.blitzers[slot]! } };
    else if (pressure?.droppers?.[slot]) p.what.pressure = { drop: structuredClone(pressure.droppers[slot]!) };
    return p;
  });
  const offSlots = Object.fromEntries(Object.entries(front.slots).filter(([s]) => !present.has(s as DefSlot))) as Front['slots'];
  const offFits = Object.fromEntries(Object.entries(front.fits ?? {}).filter(([s]) => !present.has(s as DefSlot))) as NonNullable<Front['fits']>;
  // The preset step: what today's alignment code keys by name, written as data.
  const frontRules = [
    ...(front.id === 'over' || front.id === 'even' ? ['samOnTE' as const] : []),
    ...(front.id === 'over' ? ['samOverEnd' as const] : []),
    ...(front.id === 'bear' ? ['samBearEnd' as const] : []),
  ];
  const secondLevel = FRONT_MENU ? BACKERS[FAMILY[front.id] ?? ''] : undefined;
  const alignment = { subPackage: personnel === 'nickel' || personnel === 'dime', frontRules,
    ...(secondLevel ? { secondLevel: structuredClone(secondLevel) as DefenseDescription['alignment']['secondLevel'] } : {}) };
  return {
    personnel, players, alignment,
    front: { preset: ref('front', front.id), name: front.name, personnel: [...front.personnel], offField: { slots: structuredClone(offSlots), fits: structuredClone(offFits) } },
    coverage: coverageCall(coverage, present),
    pressure: pressure ? pressureCall(pressure, present) : null,
    shown: shown && shown.id !== coverage.id ? { coverage: coverageCall(shown, present), roles: Object.fromEntries(slots.filter((s) => shown.roles[s]).map((s) => [s, structuredClone(shown.roles[s])])) } : undefined,
    call: structuredClone(rest),
  };
}
