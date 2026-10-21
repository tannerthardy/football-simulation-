/**
 * Teams, roster generation and personnel selection. Depth charts are built
 * from role suitability, so the players who take the field — and who plays
 * X vs. slot, nose vs. 3-tech, box vs. free safety — depend on how each
 * athlete fits each role.
 */
import type { Rng } from '../core/rng.js';
import { generatePlayer } from '../players/generator.js';
import { overallAt, ROLE_BY_ID, roleSuitability } from '../players/roles.js';
import { familiarityAt, type Player, type Position } from '../players/types.js';
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
    /** The line coach's base split, centre to centre, in yards (OL_ALIGN).
     * Tracked team medians run 1.46-1.74 (2022; scripts/diag/align/olsplits.py). */
    lineSplit?: number;
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
  const offScheme = opts.offScheme ?? rng.pick<OffScheme>(['west-coast', 'air-raid', 'spread', 'power', 'wide-zone']);
  const defScheme = opts.defScheme ?? rng.pick<DefScheme>(['4-3', '3-4', 'nickel-heavy']);
  return {
    id: abbr,
    name,
    abbr,
    roster,
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
      // A named stream: drawing it changes no other team trait.
      lineSplit: rng.fork('line-split').range(1.44, 1.7),
    },
  };
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
  /** Energy by player id; tired players lose snaps to rested backups. */
  energy?: Map<string, number>;
}

function pool(team: Team, positions: Position[], av: Availability, taken: Set<string>): Player[] {
  return team.roster.filter((p) => positions.includes(p.position) && !taken.has(p.id) && !av.unavailable?.has(p.id));
}

/** Score for a slot: role suitability, discounted for fatigue. */
function pickBest(cands: Player[], score: (p: Player) => number, av: Availability): Player | null {
  let best: Player | null = null;
  let bs = -Infinity;
  for (const p of cands) {
    const e = av.energy?.get(p.id) ?? 1;
    const s = score(p) - Math.max(0, 0.8 - e) * 60;
    if (s > bs) {
      bs = s;
      best = p;
    }
  }
  return best;
}

const role = (id: string) => (p: Player) => roleSuitability(p, ROLE_BY_ID[id]);
const at = (pos: Position) => (p: Player) => overallAt(p, pos);

/** FRONT_FIT=1 (default off): interior line slots weigh familiarity at DT,
 * as overallAt does and the edge slots already do. Raw 3-technique
 * suitability (pass-rush finesse, burst, agility; no mass or strength) put a
 * 109-114 kg EDGE at DT in 32 of 120 base 4-3 slots across 60 generated
 * teams, and on the lab defense's DT_S (docs/reviews/run-offense.md). The
 * edge it displaces may then play SAM (picked later from LBs and edges). */
const FRONT_FIT = process.env.FRONT_FIT === '1';

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

export function pickDefense(team: Team, personnel: DefPersonnelId, av: Availability = {}): Partial<Record<DefSlot, Player>> {
  const taken = new Set<string>();
  const out: Partial<Record<DefSlot, Player>> = {};
  const need = DEF_PERSONNEL[personnel];
  const take = (slot: DefSlot, cands: Position[], score: (p: Player) => number) => {
    if (!need[slot]) return;
    const p = pickBest(pool(team, cands, av, taken), score, av);
    if (!p) throw new Error(`${team.abbr}: no player for ${slot}`);
    out[slot] = p;
    taken.add(p.id);
  };
  const best = (...ids: string[]) => (p: Player) => Math.max(...ids.map((id) => roleSuitability(p, ROLE_BY_ID[id])));
  // Front: the nose first in 3-down fronts, then the edges.
  take('NT', ['DT'], best('DT_NOSE'));
  take('DE_W', ['EDGE', 'DT', 'LB'], (p) => best('EDGE_SPEED', 'EDGE_POWER')(p) * 0.6 + at('EDGE')(p) * 0.4);
  take('DE_S', ['EDGE', 'DT', 'LB'], (p) => best('EDGE_RUN', 'EDGE_POWER')(p) * 0.5 + at('EDGE')(p) * 0.5);
  const inside = personnel === 'base34' ? best('DT_5TECH', 'DT_3TECH') : best('DT_3TECH', 'DT_NOSE', 'DT_5TECH');
  // FRONT_FIT: an inside spot is scored like the edges, on how well he plays
  // the position (the role scaled by his familiarity at DT), so a light edge
  // rusher with a high 3-technique score does not displace the tackles.
  const interior = FRONT_FIT ? (p: Player) => inside(p) * (0.7 + 0.3 * familiarityAt(p, 'DT')) : inside;
  take('DT_S', ['DT', 'EDGE'], interior);
  take('DT_W', ['DT', 'EDGE'], interior);
  take('LB_M', ['LB'], best('LB_MIKE'));
  take('LB_W', ['LB'], best('LB_WILL', 'LB_MIKE'));
  take('LB_S', ['LB', 'EDGE'], best('LB_SAM', 'LB_MIKE'));
  take('CB_S', ['CB'], at('CB'));
  take('CB_W', ['CB'], at('CB'));
  take('NB', ['CB', 'S'], best('CB_SLOT', 'CB_ZONE'));
  take('DB', ['CB', 'S'], (p) => at('CB')(p) * 0.6 + at('S')(p) * 0.4);
  take('FS', ['S', 'CB'], best('S_FREE', 'S_ROBBER'));
  take('SS', ['S', 'LB', 'CB'], best('S_BOX', 'S_ROBBER'));
  return out;
}

export function specialist(team: Team, pos: 'K' | 'P'): Player {
  return team.roster.find((p) => p.position === pos) ?? team.roster[0];
}
