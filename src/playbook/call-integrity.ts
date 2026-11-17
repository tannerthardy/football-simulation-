/**
 * Narrow installation guards for the automatic defensive caller.
 *
 * This protects named zone players, retained deep help and the stock five-man
 * fire-zone package. It is not a complete coverage contract: generic underneath seats, match
 * exchanges, marker allocation and formation checks still belong to the
 * existing installer. Explicit lab calls may deliberately bypass these guards.
 */
import { isDeepZone, seatRole } from './alignment.js';
import { COVERAGE_BY_ID } from './coverages.js';
import { DEF_PERSONNEL, type Coverage, type CoverageRole, type DefPersonnelId, type DefSlot, type Front, type Pressure, type UnderSeat } from './types.js';

/** RUSH_PROMISE (on by default; RUSH_PROMISE=0 turns it off): a pressure's maxRushers bounds its rush behind a coverage family. */
const RUSH_PROMISE = process.env.RUSH_PROMISE !== '0';
const FRONT_RUSHERS: readonly DefSlot[] = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];

/** A coverage variant needs the players it explicitly assigns deep help to. */
export function coverageHasDeepSupport(personnel: DefPersonnelId, coverage: Coverage): boolean {
  return (Object.entries(coverage.roles) as Array<[DefSlot, CoverageRole]>).every(([slot, role]) =>
    role.kind !== 'zone' || !isDeepZone(role.zone) || !!DEF_PERSONNEL[personnel][slot]);
}

/**
 * Every explicitly named zone seat needs its player. A roof can survive a
 * missing safety while his separately named weak flat remains unfilled.
 * Generic underneath-seat pools and optional man preferences are flexible;
 * this guard does not require every listed fallback or spare matchup.
 */
export function coverageHasNamedZonePlayers(personnel: DefPersonnelId, coverage: Coverage): boolean {
  return (Object.entries(coverage.roles) as Array<[DefSlot, CoverageRole]>).every(([slot, role]) =>
    role.kind !== 'zone' || !!DEF_PERSONNEL[personnel][slot])
    && (coverage.needs ?? []).every(slot => !!DEF_PERSONNEL[personnel][slot]);
}

/**
 * The portion of alignDefense's role installation before free underneath
 * seats and man matching. Those later stages cannot restore a missing deep
 * obligation. Man matching may drop an uncalled edge, so this budget must not
 * be used to reject a man pressure solely for its initial rusher count.
 */
function initialRoles(personnel: DefPersonnelId, front: Front, coverage: Coverage, pressure: Pressure): Map<DefSlot, CoverageRole> {
  const present = Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];
  const has = (slot: DefSlot) => !!DEF_PERSONNEL[personnel][slot];
  const roles = new Map<DefSlot, CoverageRole>();
  for (const [slot, blitz] of Object.entries(pressure.blitzers) as Array<[DefSlot, { gap: 'A' | 'B' | 'C' | 'D'; side: 'S' | 'W' }]>) {
    if (has(slot)) roles.set(slot, { kind: 'blitz', ...blitz });
  }
  for (const [slot, seat] of Object.entries(pressure.droppers ?? {}) as Array<[DefSlot, UnderSeat]>) {
    if (has(slot)) roles.set(slot, seatRole(seat));
  }
  for (const slot of FRONT_RUSHERS) if (has(slot) && !roles.has(slot)) roles.set(slot, { kind: 'rush' });
  if (has('LB_S') && front.slots.LB_S && front.slots.LB_S.depth < 2 && !coverage.man && !roles.has('LB_S')) {
    roles.set('LB_S', { kind: 'rush' });
  }
  // RUSH_PROMISE: count the backer alignDefense walks up onto the line as an
  // edge (Penny's Will or Mike) as a rusher too, as it installs him.
  if (RUSH_PROMISE) for (const lb of ['LB_W', 'LB_M'] as DefSlot[]) {
    if (has(lb) && front.slots[lb] && front.slots[lb]!.depth < 2 && !coverage.man && !roles.has(lb)) roles.set(lb, { kind: 'rush' });
  }
  for (const slot of present) {
    const role = coverage.roles[slot];
    if (role && !roles.has(slot)) roles.set(slot, role);
  }
  return roles;
}

/**
 * Keep compatible named personnel and deep obligations after a pressure is
 * installed. A blitzer can leave deep help only if the package actually names
 * a replacement for that zone; a shared family label is insufficient.
 */
/** Experimental pressures by their flag, read literally so the baseline
 * profile's flag inventory sees them; an unknown flag name reads as off. */
const PRESSURE_FLAGS: Record<string, () => boolean> = { DEUCE: () => process.env.DEUCE !== '0', MUG_PRESSURES: () => process.env.MUG_PRESSURES !== '0' };

export function pressureIsInstallable(personnel: DefPersonnelId, front: Front, called: Coverage, pressure: Pressure): boolean {
  if (pressure.flag && !PRESSURE_FLAGS[pressure.flag]?.()) return false;
  if (!pressure.coverages.includes(called.family ?? called.id)) return false;
  // A pressure with its own coverage (Deuce) is judged on what it installs.
  const coverage = pressure.coverage ? COVERAGE_BY_ID[pressure.coverage] : called;
  if (!front.personnel.includes(personnel) || !coverageHasNamedZonePlayers(personnel, coverage)) return false;
  const named = [...Object.keys(pressure.blitzers), ...Object.keys(pressure.droppers ?? {})] as DefSlot[];
  if (named.some((slot) => !DEF_PERSONNEL[personnel][slot])) return false;
  const roles = initialRoles(personnel, front, coverage, pressure);
  const retainedDeep = new Set([...roles.values()].flatMap((role) => role.kind === 'zone' && isDeepZone(role.zone) ? [role.zone] : []));
  for (const role of Object.values(coverage.roles)) {
    if (role?.kind === 'zone' && isDeepZone(role.zone) && !retainedDeep.has(role.zone)) return false;
  }
  // A pressure that promises a rush count must deliver it: Odd/Tite and an
  // on-line Sam in base Under otherwise turn a five-man fire zone into six,
  // or a four-man simulated pressure into five.
  const promised = pressure.rushers ?? (pressure.id === 'fire_zone' ? 5 : undefined);
  const rushers = [...roles.values()].filter((role) => role.kind === 'rush' || role.kind === 'blitz').length;
  if (promised !== undefined && rushers !== promised) return false;
  // RUSH_PROMISE: the most this call sends behind the installed coverage family.
  const most = RUSH_PROMISE ? pressure.maxRushers?.[coverage.family ?? coverage.id] : undefined;
  if (most !== undefined && rushers > most) return false;
  return true;
}
