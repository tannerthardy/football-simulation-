/**
 * Teams, roster generation and personnel selection. Depth charts are built
 * from role suitability, so the players who take the field — and who plays
 * X vs. slot, nose vs. 3-tech, box vs. free safety — depend on how each
 * athlete fits each role.
 */
import { Rng } from '../core/rng.js';
import { generatePlayer } from '../players/generator.js';
import { overallAt, ROLE_BY_ID, roleSuitability } from '../players/roles.js';
import { r01, type Player, type Position } from '../players/types.js';
import type { AlignStyle } from '../playbook/alignment.js';
import { DEF_PERSONNEL, OFF_PERSONNEL, type DefPersonnelId, type DefSlot, type OffSlot, type PersonnelId, type SkillSlot } from '../playbook/types.js';

export type OffScheme = 'west-coast' | 'air-raid' | 'spread' | 'power' | 'wide-zone';
export type DefScheme = '4-3' | '3-4' | 'nickel-heavy';

export interface Team {
  id: string;
  name: string;
  abbr: string;
  roster: Player[];
  offScheme: OffScheme;
  defScheme: DefScheme;
  /** Coaching tendencies 0–1. */
  coach: {
    aggression: number;
    passRate: number;
    blitzRate: number;
    manRate: number;
    /** Shadow the opponent's best receiver with the top corner. */
    shadow: boolean;
    /** How often the secondary disguises its coverage pre-snap. */
    disguise: number;
    /** Share of zone calls played with pattern-match rules; the rest are spot drops. */
    matchRate: number;
    /** Coverage tree: which families and variants the coordinator builds around. */
    coverageSystem: CoverageSystem;
    /** Preferred trips check when a call offers several (e.g. Poach vs. Stubbie). */
    checkPick: number;
  };
}

const ROSTER_COUNTS: Array<[Position, number, number]> = [
  // position, count, number of starters
  ['QB', 3, 1],
  ['RB', 3, 1],
  ['FB', 1, 1],
  ['WR', 6, 3],
  ['TE', 3, 2],
  ['OT', 4, 2],
  ['OG', 4, 2],
  ['C', 2, 1],
  ['EDGE', 5, 2],
  ['DT', 5, 3],
  ['LB', 5, 3],
  ['CB', 6, 3],
  ['S', 4, 2],
  ['K', 1, 1],
  ['P', 1, 1],
];

const JERSEY_RANGES: Record<Position, Array<[number, number]>> = {
  QB: [[1, 19]],
  RB: [[20, 39]],
  FB: [[40, 49]],
  WR: [[10, 19], [80, 89]],
  TE: [[80, 89], [40, 49]],
  OT: [[60, 79]],
  OG: [[60, 79]],
  C: [[50, 79]],
  EDGE: [[90, 99], [50, 59]],
  DT: [[90, 99], [70, 79]],
  LB: [[40, 59]],
  CB: [[20, 39]],
  S: [[20, 49]],
  K: [[1, 19]],
  P: [[1, 19]],
};

/**
 * Defensive coverage trees: single-high (Seattle Cover 3/Cover 1), quarters
 * (Saban match quarters, Rip/Liz, Cover 7 checks), two-high rotation
 * (Fangio/Staley: two-high shells, Cover 6 and quarters, rotating to 3 and
 * inverted 2), Tampa (Cover 2 family), pressure-man (Cover 1/0 with pressure).
 */
export type CoverageSystem = 'single-high' | 'quarters' | 'two-high' | 'tampa' | 'pressure-man';

export function generateTeam(rng: Rng, name: string, abbr: string, opts: { strength?: number; offScheme?: OffScheme; defScheme?: DefScheme } = {}): Team {
  const strength = opts.strength ?? 0.5;
  const roster: Player[] = [];
  const used = new Set<number>();
  for (const [pos, count, starters] of ROSTER_COUNTS) {
    for (let i = 0; i < count; i++) {
      const starter = i < starters;
      const quality = starter ? rng.normalClamped(0.48 + 0.3 * strength, 0.14, 0.15, 0.97) : rng.normalClamped(0.3 + 0.15 * strength, 0.12, 0.05, 0.8);
      // Roster-scoped identity: the same team generated twice has the same ids.
      const p = generatePlayer(rng, pos, { quality, id: `${abbr}-${pos}${i + 1}` });
      p.jersey = pickJersey(rng, pos, used);
      roster.push(p);
    }
  }
  return { id: abbr, name, abbr, roster, ...drawCoaching(rng, opts) };
}

/** The schemes and coaching tendencies, in generateTeam's draw order. */
function drawCoaching(rng: Rng, opts: { offScheme?: OffScheme; defScheme?: DefScheme } = {}): Pick<Team, 'offScheme' | 'defScheme' | 'coach'> {
  const offScheme = opts.offScheme ?? rng.pick<OffScheme>(['west-coast', 'air-raid', 'spread', 'power', 'wide-zone']);
  const defScheme = opts.defScheme ?? rng.pick<DefScheme>(['4-3', '3-4', 'nickel-heavy']);
  return {
    offScheme,
    defScheme,
    coach: {
      aggression: rng.range(0.25, 0.75),
      passRate: offScheme === 'air-raid' ? 0.66 : offScheme === 'power' ? 0.5 : offScheme === 'wide-zone' ? 0.53 : 0.58,
      blitzRate: rng.range(0.15, 0.4),
      manRate: rng.range(0.25, 0.55),
      shadow: rng.chance(0.35),
      disguise: rng.range(0.1, 0.45),
      matchRate: rng.range(0.3, 0.9),
      coverageSystem: rng.pick<CoverageSystem>(['single-high', 'quarters', 'two-high', 'tampa', 'pressure-man']),
      checkPick: rng.int(0, 1),
    },
  };
}

/** The same team under another identity. Its id and its players' ids carry
 * `salt`, so everything seeded by identity is drawn afresh: the team's
 * alignment style and A-gap habit (`align:`/`agap:` + team id) and each
 * player's ALIGN_HABIT depth habit (`align-habit:` + player id). Ratings,
 * names, jerseys, schemes and coaching are unchanged. For diagnostic games,
 * which otherwise reuse one fixed pair of identities (IRN, COM) on every seed
 * and so sample two teams' habits instead of the league's. */
export function withIdentity(team: Team, salt: string | number): Team {
  const id = `${team.id}~${salt}`;
  return { ...team, id, roster: team.roster.map((p) => ({ ...p, id: `${id}-${p.id.slice(p.id.indexOf('-') + 1)}` })) };
}

/** The same team under other coordinators: offensive and defensive schemes and
 * every coaching tendency (pass and blitz rates, man rate, coverage tree,
 * disguise, match rate, shadowing) redrawn from the league's distribution,
 * seeded by the team id and `salt`. The roster is unchanged. Diagnostic games
 * reuse two fixed rosters per seed, so without this a card samples two or four
 * coordinators: the 32-game card of 2026-11-11 had two single-high coverage
 * trees and no pressure-man or quarters tree
 * (docs/reviews/2026-11-11-cover-mix.md). */
export function withCoaching(team: Team, salt: string | number): Team {
  return { ...team, ...drawCoaching(new Rng(`coach:${team.id}~${salt}`)) };
}

/** A diagnostic game's team, sampling the league: identity-seeded habits
 * (withIdentity) and coordinators (withCoaching) drawn afresh per salt. */
export function leagueSample(team: Team, salt: string | number): Team {
  return withCoaching(withIdentity(team, salt), salt);
}

function pickJersey(rng: Rng, pos: Position, used: Set<number>): number {
  for (let tries = 0; tries < 60; tries++) {
    const [lo, hi] = rng.pick(JERSEY_RANGES[pos]);
    const n = rng.int(lo, hi);
    if (!used.has(n)) {
      used.add(n);
      return n;
    }
  }
  for (let n = 1; n < 100; n++) if (!used.has(n)) {
    used.add(n);
    return n;
  }
  return 0;
}

// ------------------------------------------------------------ depth chart

export interface Availability {
  /** Players who cannot play (injured, resting). */
  unavailable?: Set<string>;
  /** The coach's count of each player's recent work: snaps played, fading
   * with time off the field (`decayWorkload`). What a staff tracks on the
   * sideline, never the body's energy. */
  workload?: Map<string, number>;
  /** The unit's players on its last snap of this series. A change between
   * snaps costs `substitutionCost` slot-score points, so a staff spells a
   * player for a stretch instead of swapping every snap. */
  lastSnap?: Set<string>;
  substitutionCost?: number;
}

/** Slot-score points a substitution between snaps of a series costs: the
 * call, the run on and off, the risk of a short-handed snap. Staffs mostly
 * rotate between series and give a breather inside one only to a player
 * well past his tolerance. */
export const SUBSTITUTION_COST = 20;

/** How long the staff's count of a player's recent snaps lasts: about five
 * minutes of time off the field to forget most of a series. */
export const ROTATION_MEMORY_SECONDS = 600;

/** The coach's count after `seconds` without a snap. */
export function decayWorkload(load: number, seconds: number): number {
  return load * Math.exp(-Math.max(0, seconds) / ROTATION_MEMORY_SECONDS);
}

/**
 * How readily a staff gives a player a breather for a fresher backup, in
 * slot-score points per recent snap past his tolerance. Linemen and backs
 * rotate; the offensive line and the QB don't (cohesion and the snap count).
 * BDB 2025, median per game: DT1 63%, DE/OLB1 76%, RB1 63%, TE1 74%, WR1 91%,
 * LB1, S1, CB1–2 and the OL about 100%.
 */
const ROTATION_WEIGHT: Partial<Record<Position, number>> = { DT: 20, EDGE: 12, RB: 12, TE: 5, WR: 2, LB: 1.5, CB: 1, S: 1.5 };

/** Recent snaps a player takes before his coach wants him spelled: more for
 * a well-conditioned player. The staff knows its players' conditioning. */
export function workloadTolerance(p: Player): number {
  return 1.5 + 2.5 * r01(p.ratings.stamina);
}

/** The slot-score a staff gives up to keep a worked player on the field. */
export function rotationCost(p: Player, av: Availability): number {
  const load = av.workload?.get(p.id) ?? 0;
  return (ROTATION_WEIGHT[p.position] ?? 0) * Math.max(0, load - workloadTolerance(p));
}

function pool(team: Team, positions: Position[], av: Availability, taken: Set<string>): Player[] {
  return team.roster.filter((p) => positions.includes(p.position) && !taken.has(p.id) && !av.unavailable?.has(p.id));
}

/** Score for a slot: role suitability, less the cost of keeping a worked
 * player in. Depth decides who goes in: a weak backup needs a starter far
 * past his tolerance before he plays. */
function pickBest(cands: Player[], score: (p: Player) => number, av: Availability): Player | null {
  let best: Player | null = null;
  let bs = -Infinity;
  for (const p of cands) {
    const s = score(p) - rotationCost(p, av) - (av.lastSnap && !av.lastSnap.has(p.id) ? av.substitutionCost ?? SUBSTITUTION_COST : 0);
    if (s > bs) {
      bs = s;
      best = p;
    }
  }
  return best;
}

const role = (id: string) => (p: Player) => roleSuitability(p, ROLE_BY_ID[id]);
const at = (pos: Position) => (p: Player) => overallAt(p, pos);

export function pickOffense(team: Team, personnel: PersonnelId, av: Availability = {}): Record<OffSlot, Player> {
  const taken = new Set<string>();
  const out = {} as Record<OffSlot, Player>;
  const take = (slot: OffSlot, p: Player | null) => {
    if (!p) throw new Error(`${team.abbr}: no player for ${slot}`);
    out[slot] = p;
    taken.add(p.id);
  };
  take('QB', pickBest(pool(team, ['QB'], av, taken), at('QB'), av));
  take('LT', pickBest(pool(team, ['OT'], av, taken), role('OL_PASS'), av));
  take('RT', pickBest(pool(team, ['OT', 'OG'], av, taken), at('OT'), av));
  take('C', pickBest(pool(team, ['C', 'OG'], av, taken), at('C'), av));
  take('LG', pickBest(pool(team, ['OG', 'C', 'OT'], av, taken), at('OG'), av));
  take('RG', pickBest(pool(team, ['OG', 'C', 'OT'], av, taken), at('OG'), av));

  const map = OFF_PERSONNEL[personnel];
  const zoneTeam = team.offScheme === 'wide-zone';
  const order: SkillSlot[] = ['RB', 'Y', 'X', 'Z', 'H', 'F'];
  for (const slot of order) {
    const pos = map[slot];
    if (!pos) continue;
    let score: (p: Player) => number;
    if (pos === 'RB') score = (p) => Math.max(roleSuitability(p, ROLE_BY_ID.RB_WORKHORSE), roleSuitability(p, ROLE_BY_ID[zoneTeam ? 'RB_ELUSIVE' : 'RB_POWER']) - 2);
    else if (pos === 'FB') score = at('FB');
    else if (pos === 'TE') score = slot === 'Y' ? (p) => Math.max(role('TE_Y')(p), role('TE_F')(p)) : (p) => Math.max(role('TE_H')(p), role('TE_F')(p));
    else if (slot === 'X') score = (p) => role('WR_X')(p) * 0.6 + at('WR')(p) * 0.4;
    else if (slot === 'Z') score = (p) => Math.max(role('WR_Z')(p), role('WR_DEEP')(p)) * 0.6 + at('WR')(p) * 0.4;
    else score = (p) => role('WR_SLOT')(p) * 0.6 + at('WR')(p) * 0.4;
    const positions: Position[] = pos === 'FB' ? ['FB', 'TE', 'RB'] : pos === 'TE' ? ['TE', 'FB'] : [pos];
    take(slot, pickBest(pool(team, positions, av, taken), score, av));
  }
  return out;
}

/** DB_SLOTS (on since run-ref-21; DB_SLOTS=0 restores): the defensive backs are placed by
 * position before the nickel and dime are filled. The installed order filled
 * NB and DB first from corners or safeties, scored on slot-corner and zone
 * suitability, so a safety usually took the nickel; the safeties' slots then
 * went to whoever remained, FS from S or CB and SS from S, LB or CB on box and
 * robber suitability. On 200 generated rosters with fresh legs the nickel was
 * a safety 84% of the time, the nickel SS a linebacker 20% and the dime SS a
 * linebacker 64%; on the pass panel an LB held SS on 78 of 197 snaps and
 * played a deep half or quarter. With it on, FS and SS take safeties (a corner,
 * then for SS a backer, only when none is available), then NB and DB choose
 * from the corners and the safeties left, as before. Rosters carry 6 CB and
 * 4 S, so nickel and dime stay staffed by defensive backs.
 * docs/reviews/2026-11-11-db-slots.md. */
export const DB_SLOTS = process.env.DB_SLOTS !== '0';

export function pickDefense(team: Team, personnel: DefPersonnelId, av: Availability = {}): Partial<Record<DefSlot, Player>> {
  const taken = new Set<string>();
  const out: Partial<Record<DefSlot, Player>> = {};
  const need = DEF_PERSONNEL[personnel];
  const take = (slot: DefSlot, cands: Position[], score: (p: Player) => number, fallback: Position[] = []) => {
    if (!need[slot]) return;
    const p = pickBest(pool(team, cands, av, taken), score, av) ?? pickBest(pool(team, fallback, av, taken), score, av);
    if (!p) throw new Error(`${team.abbr}: no player for ${slot}`);
    out[slot] = p;
    taken.add(p.id);
  };
  const best = (...ids: string[]) => (p: Player) => Math.max(...ids.map((id) => roleSuitability(p, ROLE_BY_ID[id])));
  // Front: the nose first in 3-down fronts, then the edges.
  take('NT', ['DT'], best('DT_NOSE'));
  take('DE_W', ['EDGE', 'DT', 'LB'], (p) => best('EDGE_SPEED', 'EDGE_POWER')(p) * 0.6 + at('EDGE')(p) * 0.4);
  take('DE_S', ['EDGE', 'DT', 'LB'], (p) => best('EDGE_RUN', 'EDGE_POWER')(p) * 0.5 + at('EDGE')(p) * 0.5);
  const interior = personnel === 'base34' ? best('DT_5TECH', 'DT_3TECH') : best('DT_3TECH', 'DT_NOSE', 'DT_5TECH');
  take('DT_S', ['DT', 'EDGE'], interior);
  take('DT_W', ['DT', 'EDGE'], interior);
  take('LB_M', ['LB'], best('LB_MIKE'));
  take('LB_W', ['LB'], best('LB_WILL', 'LB_MIKE'));
  take('LB_S', ['LB', 'EDGE'], best('LB_SAM', 'LB_MIKE'));
  take('CB_S', ['CB'], at('CB'));
  take('CB_W', ['CB'], at('CB'));
  if (DB_SLOTS) {
    // Safeties first, from the safeties; then the nickel and dime from the corners.
    take('FS', ['S'], best('S_FREE', 'S_ROBBER'), ['CB']);
    take('SS', ['S'], best('S_BOX', 'S_ROBBER'), ['CB', 'LB']);
    take('NB', ['CB', 'S'], best('CB_SLOT', 'CB_ZONE'));
    take('DB', ['CB', 'S'], (p) => at('CB')(p) * 0.6 + at('S')(p) * 0.4);
    return out;
  }
  take('NB', ['CB', 'S'], best('CB_SLOT', 'CB_ZONE'));
  take('DB', ['CB', 'S'], (p) => at('CB')(p) * 0.6 + at('S')(p) * 0.4);
  take('FS', ['S', 'CB'], best('S_FREE', 'S_ROBBER'));
  take('SS', ['S', 'LB', 'CB'], best('S_BOX', 'S_ROBBER'));
  return out;
}

export function specialist(team: Team, pos: 'K' | 'P'): Player {
  return team.roster.find((p) => p.position === pos) ?? team.roster[0];
}

/** A team's alignment habits on top of its scheme: one draw per team, one sd
 * each, from 2022 team medians after removing the scheme (route, assignment,
 * call): receivers' room to the sideline 0.8 yd, line width 4.9%, zone
 * corners' depth 0.85 yd, deep safeties' depth 0.95 yd. Seeded by the team's
 * id, so it costs roster generation no draws. The front's lean to the
 * passing strength without a single attached end (FRONT_STRENGTH): 2022 team
 * shares of a 4-down front's 3 technique set toward the receivers run 0.34
 * (TEN) to 0.84 (NE), league about 0.6 (scripts/diag/align/deflook.py).
 * Drawn last, so the earlier habits keep their values. The 1 technique's
 * spot is `aGapHabit`'s own draw. */
export function alignStyle(team: Pick<Team, 'id'>): AlignStyle {
  const rng = new Rng(`align:${team.id}`);
  return { wrRoom: rng.normalClamped(0, .8, -1.6, 1.6), olWidth: rng.normalClamped(0, .049, -.1, .1),
    cbDepth: rng.normalClamped(0, .85, -1.7, 1.7), safetyDepth: rng.normalClamped(0, .95, -1.9, 1.9),
    passingStrength: rng.normalClamped(.6, .12, .3, .9), aGap: aGapHabit(team) };
}

/** AGAP_ALIGN: where a team's 1 technique stands, as a share of the
 * centre-guard split from the centre. 2022 team medians run 0.30 (NYG) to
 * 0.82 (PHI), mean 0.63, sd 0.14 (scripts/diag/align/deflook.py). Its own
 * seed, as on the shared build's port (#197), so a team's habit is the same
 * on both and costs no other draw. */
export function aGapHabit(team: Pick<Team, 'id'>): number {
  return new Rng(`agap:${team.id}`).normalClamped(.63, .14, .3, .85);
}
