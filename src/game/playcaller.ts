/**
 * Coordinators.
 *
 * The offensive coordinator picks personnel, formation and concept from the
 * situation, the team's scheme identity, the players it actually has (a
 * concept is weighted by how good the player its first read features is, and
 * deep shots by the QB's arm), and what has worked against this opponent today
 * (a simple bandit over concept families).
 *
 * The defensive coordinator answers the offense's personnel, picks a front
 * from its scheme, and chooses coverage and pressure from the situation, its
 * own corners vs. their receivers (good corners → more man), the opposing
 * QB's pocket presence (blitz the panicky ones) and what has worked today. In
 * man coverage a shadowing coach puts his best corner on their best receiver.
 */
import type { Rng } from '../core/rng.js';
import { CENTER_Y } from '../core/field.js';
import { overallAt, ROLE_BY_ID, roleSuitability } from '../players/roles.js';
import { r01, type Player } from '../players/types.js';
import type { ManPreference } from '../playbook/alignment.js';
import { coverageHasNamedZonePlayers, pressureIsInstallable } from '../playbook/call-integrity.js';
import { PASS_CONCEPTS, RUN_CONCEPTS } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONTS, PRESSURES } from '../playbook/defense.js';
import { FORMATIONS } from '../playbook/formations.js';
import type { Coverage, DefPersonnelId, DefSlot, DefensivePlayCall, Formation, MotionCall, OffensivePlayCall, OffSlot, PassConcept, PersonnelId, RunConcept, SkillSlot, ZoneStyle } from '../playbook/types.js';
import { DEF_PERSONNEL, OFF_PERSONNEL } from '../playbook/types.js';
import type { CoverageSystem, Team } from '../league/team.js';
import { motionEnabled } from '../sim/motion.js';

export interface Situation {
  down: number;
  distance: number;
  /** Yards from the offense's own goal line. */
  yardline: number;
  quarter: number;
  /** Seconds left in the quarter. */
  clock: number;
  /** Offense score minus defense score. */
  scoreDiff: number;
  ballY: number;
  hurry: boolean;
}

const secondsLeftInHalf = (s: Situation) => (s.quarter === 1 || s.quarter === 3 ? 900 : 0) + s.clock;
const lateGame = (s: Situation) => s.quarter >= 4;

function pickWeighted<T>(rng: Rng, items: Array<[T, number]>): T {
  return rng.weighted(
    items.map((i) => i[0]),
    items.map((i) => Math.max(0, i[1])),
  );
}

interface Learn {
  n: number;
  sum: number;
}

/** Concept family key for learning. */
const familyOf = (c: OffensivePlayCall) => (c.kind === 'run' ? `run:${c.run!.scheme}` : `pass:${c.pass!.family}:${c.pass!.id}`);

export class OffensiveCoordinator {
  private readonly learn = new Map<string, Learn>();
  private runN = 0;
  private motionCalls = 0;
  private runSum = 0;
  private passN = 0;
  private passSum = 0;

  constructor(
    readonly team: Team,
    private readonly rng: Rng,
  ) {}

  /** Feed back a play's success (0–1 success value from the game layer). */
  observe(call: OffensivePlayCall, success: number): void {
    const k = familyOf(call);
    const l = this.learn.get(k) ?? { n: 0, sum: 0 };
    l.n++;
    l.sum += success;
    this.learn.set(k, l);
    if (call.kind === 'run') {
      this.runN++;
      this.runSum += success;
    } else {
      this.passN++;
      this.passSum += success;
    }
  }

  private learned(k: string): number {
    const l = this.learn.get(k);
    if (!l || l.n < 2) return 1;
    // Shrink toward the prior (success ≈ 0.45) and turn into a multiplier.
    const rate = (l.sum + 0.45 * 3) / (l.n + 3);
    return Math.exp((rate - 0.45) * 2.2);
  }

  call(s: Situation, defense: Team): OffensivePlayCall {
    const rng = this.rng;
    const coach = this.team.coach;
    const scheme = this.team.offScheme;
    let pass = coach.passRate;
    const d = s.distance;
    if (s.down === 1) pass -= 0.04;
    if (s.down === 2) pass += d >= 8 ? 0.12 : d <= 3 ? -0.15 : 0;
    if (s.down >= 3) pass += d >= 7 ? 0.36 : d >= 3 ? 0.22 : -0.18;
    if (100 - s.yardline <= 3) pass -= 0.15;
    const left = secondsLeftInHalf(s);
    if (s.hurry) pass += 0.3;
    if (lateGame(s) && s.scoreDiff <= -9) pass += 0.25;
    if (lateGame(s) && s.scoreDiff >= 7 && left < 480) pass -= 0.28;
    // In-game learning: lean toward what's working.
    if (this.runN >= 4 && this.passN >= 4) pass += ((this.passSum / this.passN) - (this.runSum / this.runN)) * 0.5;
    // Talent: a great QB or a great back pulls the mix.
    const qb = bestAt(this.team, 'QB');
    const rb = bestAt(this.team, 'RB');
    pass += (overallAt(qb) - overallAt(rb)) / 250;
    pass = Math.min(0.95, Math.max(0.08, pass));
    const isPass = rng.chance(pass);

    const personnel = this.choosePersonnel(s, isPass);
    const formation = this.chooseFormation(personnel, isPass);
    // Strength to the field (wide side) most of the time.
    const fieldLeft = s.ballY < CENTER_Y;
    const flip = rng.chance(0.7) ? fieldLeft : !fieldLeft;
    const motion = motionEnabled() ? this.chooseMotion(formation, isPass) : undefined;
    const tag = motion ? ` (${motion.slot} ${motion.kind} motion)` : '';
    if (isPass) {
      const concept = this.choosePass(s, formation, defense);
      return { formation, flip, kind: 'pass', pass: concept, motion, label: `${formation.name} — ${concept.name}${tag}` };
    }
    const run = this.chooseRun(s, formation);
    return { formation, flip, kind: 'run', run, motion, label: `${formation.name} — ${run.name}${tag}` };
  }

  /**
   * Pre-snap motion (MOTION=1): modern offenses move someone on roughly half
   * their snaps, to change the structure the defense must check (across),
   * to threaten the edge (jet), to get to empty, or to read man/zone (return).
   * Draws from its own forked stream so the rest of the call is unchanged.
   */
  private chooseMotion(f: Formation, isPass: boolean): MotionCall | undefined {
    const rng = this.rng.fork(`motion:${this.motionCalls++}`);
    if (!rng.chance(isPass ? 0.5 : 0.4)) return undefined;
    const off = Object.entries(f.slots).filter(([, a]) => a && a.depth >= 1 && a.split !== 'inline') as Array<[SkillSlot, NonNullable<Formation['slots'][SkillSlot]>]>;
    const backs = off.filter(([, a]) => a.depth >= 3 && (a.split === 0 || (typeof a.split === 'number' && a.split < 3.5)));
    const receivers = off.filter(([slot]) => !backs.some(([b]) => b === slot));
    const options: Array<[MotionCall, number]> = [];
    for (const [slot, a] of receivers) {
      options.push([{ slot, kind: 'across' }, 0.45], [{ slot, kind: 'return' }, 0.15]);
      // A jet needs a run-up: slots and wideouts, not a tight inside receiver.
      if (f.qb !== 'under' && (a.split === 'slot' || a.split === 'wide')) options.push([{ slot, kind: 'jet' }, 0.25]);
    }
    if (isPass) for (const [slot] of backs.filter(([s]) => s === 'RB')) options.push([{ slot, kind: 'empty' }, 0.3]);
    return options.length ? pickWeighted(rng, options) : undefined;
  }

  private choosePersonnel(s: Situation, isPass: boolean): PersonnelId {
    const scheme = this.team.offScheme;
    const shortYd = s.distance <= 2 || 100 - s.yardline <= 3;
    if (shortYd && !isPass) return pickWeighted(this.rng, [['12', 3], ['21', 3], ['22', 2], ['13', 1.5], ['11', 1]]);
    if (s.hurry || (s.down >= 3 && s.distance >= 7)) return pickWeighted(this.rng, [['11', 7], ['10', scheme === 'air-raid' || scheme === 'spread' ? 3.5 : 1.5], ['12', 0.5]]);
    const table: Record<string, Array<[PersonnelId, number]>> = {
      'air-raid': [['10', 3], ['11', 6], ['12', 1]],
      spread: [['11', 6.5], ['10', 1.5], ['12', 2]],
      'west-coast': [['11', 5.5], ['12', 2.5], ['21', 1.5], ['10', 0.5]],
      'wide-zone': [['11', 5.5], ['12', 2.5], ['21', 1.5], ['13', 0.5]],
      power: [['11', 4], ['12', 3], ['21', 2], ['22', 1]],
    };
    return pickWeighted(this.rng, table[scheme]);
  }

  private chooseFormation(personnel: PersonnelId, isPass: boolean): Formation {
    const scheme = this.team.offScheme;
    const forms = FORMATIONS.filter((f) => f.personnel === personnel);
    const gunPref = scheme === 'air-raid' || scheme === 'spread' ? 2.5 : scheme === 'west-coast' ? 1.4 : 0.8;
    return pickWeighted(
      this.rng,
      forms.map((f): [Formation, number] => [f, (f.qb === 'gun' ? gunPref * (isPass ? 1.3 : 0.8) : f.qb === 'pistol' ? 1 : isPass ? 0.8 : 1.4) * (f.tags.includes('empty') && !isPass ? 0.05 : 1)]),
    );
  }

  private choosePass(s: Situation, f: Formation, defense: Team): PassConcept {
    const qb = bestAt(this.team, 'QB');
    const arm = r01(qb.ratings.throwPower) * 0.5 + r01(qb.ratings.accDeep) * 0.5;
    const thirdShort = s.down >= 3 && s.distance <= 4;
    const longYd = s.distance >= 9;
    const earlyDown = s.down <= 2 && s.distance >= 7;
    const underCenter = f.qb !== 'gun';
    const weights: Array<[PassConcept, number]> = [];
    for (const c of PASS_CONCEPTS) {
      let w = 1;
      if (c.family === 'quick') w *= thirdShort ? 2.2 : longYd ? 0.6 : 1.1;
      if (c.family === 'dropback') w *= longYd ? 1.6 : 1;
      if (c.family === 'playaction') w *= earlyDown && !s.hurry ? (underCenter ? 2.2 : 1.1) : 0.15;
      if (c.id === 'four_verts' || c.id === 'pa_shot') w *= 0.5 + arm;
      if (c.id === 'comebacks' && s.hurry) w *= 2;
      // Feature our best players: weight by the first read's talent.
      const first = c.progression[0];
      const slot = firstReadSlot(f, first);
      if (slot) {
        const pos = OFF_PERSONNEL[f.personnel][slot];
        const p = pos ? bestAt(this.team, pos) : null;
        if (p) w *= 0.7 + 0.6 * (overallAt(p) / 100);
      }
      w *= this.learned(`pass:${c.family}:${c.id}`);
      weights.push([c, w]);
    }
    void defense;
    return pickWeighted(this.rng, weights);
  }

  private chooseRun(s: Situation, f: Formation): RunConcept {
    const scheme = this.team.offScheme;
    const hasFB = f.personnel === '21' || f.personnel === '22';
    const gun = f.qb === 'gun';
    const qb = bestAt(this.team, 'QB');
    const mobile = r01(qb.ratings.elusiveness) > 0.6;
    // OL suitability for zone vs. gap.
    const ol = this.team.roster.filter((p) => p.position === 'OT' || p.position === 'OG' || p.position === 'C');
    const zoneFit = avg(ol.map((p) => roleSuitability(p, ROLE_BY_ID.OL_ZONE)));
    const gapFit = avg(ol.map((p) => roleSuitability(p, ROLE_BY_ID.OL_POWER)));
    const weights: Array<[RunConcept, number]> = RUN_CONCEPTS.map((c) => {
      let w = 1;
      const zone = c.scheme === 'insideZone' || c.scheme === 'outsideZone' || c.scheme === 'wideZone' || c.scheme === 'splitZone';
      const gap = c.scheme === 'power' || c.scheme === 'counter' || c.scheme === 'trap' || c.scheme === 'duo';
      if (zone) w *= scheme === 'wide-zone' ? 2.4 : 1.2;
      if (c.scheme === 'outsideZone' || c.scheme === 'wideZone') w *= scheme === 'wide-zone' ? 1.6 : 0.8;
      if (c.scheme === 'splitZone' && !Object.entries(f.slots).some(([slot,p]) =>
        (slot === 'F' || ((slot === 'H' || slot === 'Y') && (f.personnel === '12' || f.personnel === '22')))
        && p && p.depth > .9 && (p.split === 'core' || p.split === 'wing' || (typeof p.split === 'number' && p.split < 6)))) w = 0;
      if (gap) w *= scheme === 'power' ? 2.0 : 0.9;
      w *= Math.exp(((zone ? zoneFit : gap ? gapFit : (zoneFit + gapFit) / 2) - 55) / 25);
      if (c.scheme === 'power' && hasFB) w *= 1.5;
      if (c.scheme === 'draw') w *= gun ? 1.2 : 0.5;
      if (c.scheme === 'toss') w *= gun ? 0.1 : 0.8;
      if (c.scheme === 'qbDraw') w *= gun && mobile ? 0.6 : 0;
      if (s.distance <= 2 && (c.scheme === 'outsideZone' || c.scheme === 'wideZone' || c.scheme === 'toss' || c.scheme === 'draw')) w *= 0.4;
      w *= this.learned(`run:${c.scheme}`);
      return [c, w];
    });
    return pickWeighted(this.rng, weights);
  }
}

function firstReadSlot(f: Formation, ref: string): SkillSlot | null {
  // Approximate receiver numbering from the formation spec (right-handed).
  const right = Object.entries(f.slots).filter(([, a]) => a!.side === 'R' && a!.depth < 3);
  const left = Object.entries(f.slots).filter(([, a]) => a!.side === 'L' && a!.depth < 3);
  const strong = right.length >= left.length ? right : left;
  const weak = strong === right ? left : right;
  const order = (list: typeof right) => list.sort((a, b) => splitRank(b[1]!.split) - splitRank(a[1]!.split)).map(([s]) => s as SkillSlot);
  const s = order(strong);
  const w = order(weak);
  if (ref === 'B') return 'RB';
  const n = Number(ref[1]) - 1;
  return (ref[0] === 'S' ? s[n] : w[n]) ?? null;
}

function splitRank(s: unknown): number {
  if (typeof s === 'number') return s;
  return s === 'wide' ? 20 : s === 'slot' ? 8 : s === 'slot2' ? 5 : s === 'wing' ? 4.8 : s === 'inline' ? 3.9 : 0;
}

export function bestAt(team: Team, pos: Player['position']): Player {
  let best = team.roster[0];
  let bs = -1;
  for (const p of team.roster) {
    if (p.position !== pos) continue;
    const o = overallAt(p);
    if (o > bs) {
      bs = o;
      best = p;
    }
  }
  return best;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ------------------------------------------------------------------ defense

export class DefensiveCoordinator {
  private readonly learn = new Map<string, Learn>();
  constructor(
    readonly team: Team,
    private readonly rng: Rng,
  ) {}

  /** Feed back the offense's success against a coverage (higher = worse for us).
   * `installed` is the call actually played after the secondary's check. */
  observe(call: DefensivePlayCall, offenseSuccess: number, installed: DefensivePlayCall = call): void {
    const keys = [call.coverage.family ?? call.coverage.id];
    if (installed.check) keys.push(`check:${installed.coverage.id}`);
    for (const k of keys) {
      const l = this.learn.get(k) ?? { n: 0, sum: 0 };
      l.n++;
      l.sum += offenseSuccess;
      this.learn.set(k, l);
    }
  }

  /**
   * The trips check this snap when the call offers several (HNFL-195):
   * Trix (backside safety poaches #3, backside on its own) on passing downs;
   * Book/Stubbie when the backside must stay 3-over-2, i.e. early downs with
   * run support needed. A Saban-style quarters tree defaults to Stubbie
   * against all 3x1, a Fangio-style two-high tree leans Trix. A check the
   * offense has been beating today gives way to the other.
   */
  private checkPrefer(passingDown: boolean, system: CoverageSystem): string[] {
    const trix = 'cover4_poach', book = 'cover4_stubbie';
    let first = system === 'quarters' ? book : system === 'two-high' ? trix : passingDown ? trix : book;
    const other = first === trix ? book : trix;
    if (this.learned(`check:${other}`) > this.learned(`check:${first}`) * 1.2) first = other;
    return [first, first === trix ? book : trix];
  }

  private learned(k: string): number {
    const l = this.learn.get(k);
    if (!l || l.n < 2) return 1;
    const rate = (l.sum + 0.45 * 3) / (l.n + 3);
    return Math.exp(-(rate - 0.45) * 2.0);
  }

  call(s: Situation, offPersonnel: PersonnelId, offense: Team, offSlots: Partial<Record<OffSlot, Player>>): { call: DefensivePlayCall; prefs: ManPreference } {
    const rng = this.rng;
    const coach = this.team.coach;
    const scheme = this.team.defScheme;
    const passingDown = s.down >= 3 && s.distance >= 7;
    const goalLine = 100 - s.yardline <= 2;
    let personnel: DefPersonnelId;
    if (goalLine && (offPersonnel === '22' || offPersonnel === '13' || offPersonnel === '21')) personnel = 'goalline';
    else if (offPersonnel === '10') personnel = rng.chance(passingDown ? 0.7 : 0.35) ? 'dime' : 'nickel';
    else if (offPersonnel === '11') personnel = passingDown && rng.chance(0.4) ? 'dime' : scheme === 'nickel-heavy' || rng.chance(0.85) ? 'nickel' : scheme === '3-4' ? 'base34' : 'base43';
    else if (offPersonnel === '12') personnel = rng.chance(scheme === 'nickel-heavy' ? 0.6 : 0.4) ? 'nickel' : scheme === '3-4' ? 'base34' : 'base43';
    else personnel = scheme === '3-4' ? 'base34' : 'base43';

    const fronts = FRONTS.filter((f) => f.personnel.includes(personnel));
    const front = pickWeighted(
      rng,
      fronts.map((f) => [f, scheme === '4-3' && (f.id === 'over' || f.id === 'under') ? 2 : scheme === 'nickel-heavy' && f.id === 'wide9' ? 2 : 1] as [typeof f, number]),
    );

    // Coverage: family from NFL situational shares (2022 dropbacks, PFF
    // charting; scripts/data/bdb2025_defense_calls.py), shaped by the
    // coordinator's tree and the man matchup; then the variant his system
    // plays within that family.
    const manScale = coach.manRate / 0.4;
    const cbs = this.team.roster.filter((p) => p.position === 'CB').sort((a, b) => b.ratings.manCoverage - a.ratings.manCoverage).slice(0, 2);
    const wrs = Object.values(offSlots).filter((p): p is Player => !!p && p.position === 'WR');
    const cbMan = avg(cbs.map((p) => p.ratings.manCoverage));
    const wrRoute = avg(wrs.map((p) => (p.ratings.routeRunning + p.ratings.releaseVsPress) / 2));
    const matchupEdge = Math.exp((cbMan - wrRoute) / 25);
    const system = coach.coverageSystem;
    const toGoal = 100 - s.yardline;
    const famW: Array<[string, number]> = [
      ['cover3', 31.8], ['cover1', 21 * manScale * matchupEdge], ['cover2', 12], ['tampa2', 2.5],
      ['cover4', 13.1], ['cover6', 9.6], ['cover2man', 1.8 * manScale * matchupEdge], ['cover0', 3.6 * manScale],
    ];
    const SYSTEM: Record<string, Record<string, number>> = {
      'single-high': { cover3: 1.5, cover1: 1.2, cover4: 0.5, cover6: 0.5, cover2: 0.6, tampa2: 0.5 },
      quarters: { cover4: 1.7, cover6: 1.3, cover3: 0.9, cover1: 0.9, cover2: 0.6, tampa2: 0.3 },
      'two-high': { cover6: 1.8, cover4: 1.3, cover2: 1.4, cover3: 0.85, cover1: 0.6, cover0: 0.5 },
      tampa: { cover2: 1.6, tampa2: 4, cover3: 1.0, cover1: 0.7, cover4: 0.7, cover6: 0.8 },
      'pressure-man': { cover1: 1.5, cover0: 2.2, cover2man: 1.5, cover3: 0.9, cover4: 0.6, cover6: 0.6, cover2: 0.6 },
    };
    for (const fw of famW) {
      const f = fw[0];
      fw[1] *= SYSTEM[system]?.[f] ?? 1;
      if (s.down >= 3 && s.distance >= 3 && s.distance <= 6) fw[1] *= f === 'cover1' ? 2 : f === 'cover0' ? 1.5 : f === 'cover2man' ? 1.4 : 0.6;
      else if (s.down >= 3 && s.distance >= 7 && s.distance <= 10) fw[1] *= f === 'cover1' ? 1.5 : 1;
      else if (passingDown && s.distance >= 11) fw[1] *= f === 'cover4' ? 1.4 : f === 'cover2' || f === 'tampa2' ? 1.25 : f === 'cover1' ? 0.55 : f === 'cover0' ? 0.3 : 1;
      if (s.distance <= 2) fw[1] *= f === 'cover1' ? 1.8 : f === 'cover0' ? 3 : 1;
      if (toGoal <= 5) fw[1] *= f === 'cover0' ? 4 : f === 'cover1' ? 1.8 : f === 'cover2' || f === 'cover4' || f === 'tampa2' ? 0.7 : 1;
      else if (toGoal <= 20) fw[1] *= f === 'cover1' ? 1.4 : f === 'cover0' ? 1.5 : 1;
      if (s.hurry && s.scoreDiff < 0 && ['cover2', 'cover4', 'cover6', 'tampa2'].includes(f)) fw[1] *= 2;
      fw[1] *= this.learned(f);
    }
    // Variants within the family by tree; spot vs. match by the coach's habit.
    const m = coach.matchRate;
    const VARIANTS: Record<string, Array<[string, number]>> = {
      // A two-high (Fangio) tree plays its Cover 3 as weak rotation from the
      // shell: 99 Weak Sky 21% vs 33 Buzz 3% in HNFL-186 scouting; Cover 3
      // Seam is about a third of the Eagles' 2025 Cover 3.
      cover3: system === 'two-high'
        ? [['cover9', 2.0], ['cover3_seam', 0.6], ['cover3_match', 0.2 * m], ['cover3', 0.1], ['cover3_buzz', 0.12], ['cover3_cloud', 0.12]]
        : [['cover3', 1.1 - m], ['cover3_match', m * 0.75], ['cover3_seam', 0.18], ['cover9', 0.03],
          ['cover3_buzz', system === 'single-high' ? 0.3 : 0.12], ['cover3_cloud', 0.05]],
      cover1: [['cover1', system === 'two-high' ? 0.1 : 0.45], ['cover1_off', 0.25], ['cover1_robber', system === 'single-high' ? 0.3 : 0.15],
        ['cover1_lurk', system === 'two-high' ? 0.8 : 0.05], ['cover1_double', 0.04 * (1 + (coach.shadow ? 1 : 0))]],
      cover2: [['cover2', 1 - m], ['cover2_match', m], ['cover2_invert', system === 'two-high' ? 0.15 : 0.04]],
      tampa2: [['tampa2', 1]],
      cover4: [['cover4', 0.45], ['cover4_meg', system === 'quarters' ? 0.3 : 0.15], ['cover4_palms', system === 'quarters' || system === 'two-high' ? 0.4 : 0.2]],
      cover6: [['cover6', 0.45], ['cover6_rev', 0.45], ['split_quarters_2man', system === 'quarters' ? 0.25 : 0.08]],
      cover2man: [['cover2man', 1], ['pounder', system === 'two-high' || system === 'quarters' ? 0.7 : 0.25],
        ['finger', system === 'two-high' ? 0.3 : 0.1], ['rolex', system === 'two-high' ? 0.3 : 0.1]],
      cover0: [['cover0', 1]],
    };
    // Eligibility belongs to the actual variant's named zone players. Cover
    // 9/inverted 2 retain a roof without FS, but his weak flat remains missing;
    // reject that installation rather than invent a replacement silently.
    const availableVariants = Object.fromEntries(Object.entries(VARIANTS).map(([family, variants]) =>
      [family, variants.filter(([id]) => coverageHasNamedZonePlayers(personnel, COVERAGE_BY_ID[id]))]));
    const family = pickWeighted(rng, famW.filter(([id]) => availableVariants[id]?.length));
    const coverage = COVERAGE_BY_ID[pickWeighted(rng, availableVariants[family])];
    // Zeus: a two-high tree doubles the opponent's best receiver with Cover 8 /
    // Stuff / Quads, chosen by where he lines up (resolved at the snap).
    let zeus: SkillSlot | undefined;
    if (system === 'two-high' && coach.shadow && (family === 'cover6' || family === 'cover4') && rng.chance(0.5)) {
      const wr1 = [...Object.entries(offSlots)].filter(([, p]) => p && p.position === 'WR').sort((a, b) => overallAt(b[1]!) - overallAt(a[1]!))[0];
      if (wr1) zeus = wr1[0] as SkillSlot;
    }

    // Pressure.
    const qb = offSlots.QB ?? bestAt(offense, 'QB');
    let blitz = coach.blitzRate;
    if (s.down >= 3 && s.distance >= 3 && s.distance <= 8) blitz += 0.1;
    blitz += (0.5 - r01(qb.ratings.pocketPresence)) * 0.2;
    if (s.hurry && s.scoreDiff < 0) blitz -= 0.12;
    let pressure = null;
    if (rng.chance(blitz)) {
      const options = PRESSURES.filter((p) => pressureIsInstallable(personnel, front, coverage, p));
      // A two-high tree brings its pressure mostly as four-man simulated
      // pressures (Whip, Slug, Sting) rather than extra rushers (HNFL-186:
      // a four-man rush on ~80% of snaps).
      const sim = (p: (typeof options)[number]) => p.rushers === 4;
      if (options.length) pressure = pickWeighted(rng, options.map((p): [typeof p, number] => [p, sim(p) ? (system === 'two-high' ? 2.5 : 0.6) : 1]));
    }
    if (coverage.id === 'cover0' && !pressure) {
      // Dime has no Will slot. Keep an installed zero-help pressure instead
      // of silently dropping an absent participant from a named six-man call.
      const options = PRESSURES.filter((p) => pressureIsInstallable(personnel, front, coverage, p));
      pressure = options.find((p) => p.id === 'zero_6') ?? options.find((p) => p.id === 'mike_a') ?? null;
    }

    // Shadow: best corner on their best receiver in man coverage.
    const prefs: ManPreference = {};
    if (coverage.man && coach.shadow && wrs.length) {
      const wr1 = [...Object.entries(offSlots)].filter(([, p]) => p && p.position === 'WR').sort((a, b) => overallAt(b[1]!) - overallAt(a[1]!))[0];
      if (wr1) prefs.overrides = { CB_S: wr1[0] as SkillSlot };
    }
    // Disguise: show the other shell and rotate at the snap. Smart safeties
    // make it work; it costs them a late start to their real landmarks.
    let shown: Coverage | undefined;
    const safeties = this.team.roster.filter((p) => p.position === 'S').sort((a, b) => overallAt(b) - overallAt(a)).slice(0, 2);
    const dbIQ = safeties.length ? avg(safeties.map((p) => r01(p.ratings.playRecognition))) : 0.5;
    // Two-high trees show two high on everything; the rest disguise by habit.
    const look = coverage.look ?? coverage.shell;
    const disguiseRate = system === 'two-high' && look !== 'two-high' ? 0.85 : coach.disguise * (0.6 + 0.8 * dbIQ);
    if (rng.chance(disguiseRate)) {
      // A two-high tree shows one home shell, quarters, on everything it
      // rotates out of (Fangio: "don't let them know"); others vary the look.
      const pool = system === 'two-high' ? (look === 'two-high' ? [] : ['cover4'])
        : look === 'one-high' || look === 'zero' ? ['cover4', 'cover2', 'cover6', 'cover2man'] : ['cover3', 'cover1'];
      const available = pool.filter((id) => id !== coverage.id && coverageHasNamedZonePlayers(personnel, COVERAGE_BY_ID[id]));
      if (available.length) shown = COVERAGE_BY_ID[rng.pick(available)];
    }
    // Zone technique: pattern-match or spot drop. Quarters is match by nature.
    let zoneStyle: ZoneStyle | undefined;
    if (!coverage.man) {
      // Pattern-match calls are match by definition; the classic calls are
      // played match or spot-drop by the coach's habit.
      const ruled = Object.values(coverage.roles).some((r) => r?.kind === 'zone' && r.rule) || coverage.underneath.some((u) => typeof u !== 'string' && u.rule);
      zoneStyle = ruled || rng.chance(coach.matchRate) ? 'match' : 'spot';
    }
    const styleTag = zoneStyle === 'spot' ? ' (spot)' : zoneStyle === 'match' ? ' (match)' : '';
    const motionRng=rng.fork(`movement:${front.id}:${coverage.id}`);
    const alternatives=fronts.filter((f)=>f.id!==front.id);
    const frontStem=alternatives.length && motionRng.chance(coach.disguise*.35) ? {
      from:motionRng.pick(alternatives),secondsBeforeSnap:motionRng.range(.4,1.6),
    } : undefined;
    // Only an installed pressure participant can creep.
    const pressureSlots=pressure ? (Object.keys(pressure.blitzers) as DefSlot[]).filter((slot)=>personnelHas(personnel,slot)) : [];
    const creep=pressureSlots.length && motionRng.chance(coach.disguise*.5) ? {
      slot:motionRng.pick(pressureSlots),secondsBeforeSnap:motionRng.range(.3,1.2),
    } : undefined;
    return {
      call: { personnel, front, coverage, pressure, shown, zoneStyle, frontStem, creep, checkPick: coach.checkPick,
        checkPrefer: this.checkPrefer(passingDown, system), zeus,
        runPolicy:{edge:scheme==='3-4' ? 'spill':'box',linebacker:'stack'},
        label: `${front.name} ${coverage.name}${styleTag}${pressure ? ` + ${pressure.name}` : ''}${shown ? ` (shows ${shown.name})` : ''}` },
      prefs,
    };
  }
}

function personnelHas(p: DefPersonnelId, slot: DefSlot): boolean {
  return !!DEF_PERSONNEL[p][slot];
}
