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
import { PASS_CONCEPTS, RUN_CONCEPTS } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONTS, PRESSURES } from '../playbook/defense.js';
import { FORMATIONS } from '../playbook/formations.js';
import type { Coverage, DefPersonnelId, DefSlot, DefensivePlayCall, Formation, OffensivePlayCall, OffSlot, PassConcept, PersonnelId, RunConcept, SkillSlot } from '../playbook/types.js';
import { OFF_PERSONNEL } from '../playbook/types.js';
import type { Team } from '../league/team.js';

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
    if (isPass) {
      const concept = this.choosePass(s, formation, defense);
      return { formation, flip, kind: 'pass', pass: concept, label: `${formation.name} — ${concept.name}` };
    }
    const run = this.chooseRun(s, formation);
    return { formation, flip, kind: 'run', run, label: `${formation.name} — ${run.name}` };
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
      const zone = c.scheme === 'insideZone' || c.scheme === 'outsideZone';
      const gap = c.scheme === 'power' || c.scheme === 'counter' || c.scheme === 'trap';
      if (zone) w *= scheme === 'wide-zone' ? 2.4 : 1.2;
      if (c.scheme === 'outsideZone') w *= scheme === 'wide-zone' ? 1.6 : 0.8;
      if (gap) w *= scheme === 'power' ? 2.0 : 0.9;
      w *= Math.exp(((zone ? zoneFit : gap ? gapFit : (zoneFit + gapFit) / 2) - 55) / 25);
      if (c.scheme === 'power' && hasFB) w *= 1.5;
      if (c.scheme === 'draw') w *= gun ? 1.2 : 0.5;
      if (c.scheme === 'toss') w *= gun ? 0.1 : 0.8;
      if (c.scheme === 'qbDraw') w *= gun && mobile ? 0.6 : 0;
      if (s.distance <= 2 && (c.scheme === 'outsideZone' || c.scheme === 'toss' || c.scheme === 'draw')) w *= 0.4;
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

  /** Feed back the offense's success against a coverage (higher = worse for us). */
  observe(call: DefensivePlayCall, offenseSuccess: number): void {
    const k = call.coverage.id;
    const l = this.learn.get(k) ?? { n: 0, sum: 0 };
    l.n++;
    l.sum += offenseSuccess;
    this.learn.set(k, l);
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

    // Coverage mix.
    const manScale = coach.manRate / 0.4;
    const cbs = this.team.roster.filter((p) => p.position === 'CB').sort((a, b) => b.ratings.manCoverage - a.ratings.manCoverage).slice(0, 2);
    const wrs = Object.values(offSlots).filter((p): p is Player => !!p && p.position === 'WR');
    const cbMan = avg(cbs.map((p) => p.ratings.manCoverage));
    const wrRoute = avg(wrs.map((p) => (p.ratings.routeRunning + p.ratings.releaseVsPress) / 2));
    const matchupEdge = Math.exp((cbMan - wrRoute) / 25);
    const covW: Array<[string, number]> = [
      ['cover3', 28],
      ['cover1', 18 * manScale * matchupEdge],
      ['cover2', 10],
      ['cover4', 16],
      ['cover6', 7],
      ['tampa2', 5],
      ['cover2man', 6 * manScale * matchupEdge],
      ['cover0', 3 * manScale],
    ];
    for (const cw of covW) {
      if (passingDown && ['cover4', 'cover2', 'cover2man', 'tampa2', 'cover6'].includes(cw[0])) cw[1] *= 1.6;
      if (passingDown && cw[0] === 'cover0') cw[1] *= 0.4;
      if (s.distance <= 2 && (cw[0] === 'cover1' || cw[0] === 'cover0' || cw[0] === 'cover3')) cw[1] *= 1.6;
      if (100 - s.yardline <= 20 && (cw[0] === 'cover1' || cw[0] === 'cover0')) cw[1] *= 1.6;
      if (s.hurry && s.scoreDiff < 0 && ['cover2', 'cover4', 'cover6', 'tampa2'].includes(cw[0])) cw[1] *= 2;
      cw[1] *= this.learned(cw[0]);
    }
    const coverage = COVERAGE_BY_ID[pickWeighted(rng, covW)];

    // Pressure.
    const qb = offSlots.QB ?? bestAt(offense, 'QB');
    let blitz = coach.blitzRate;
    if (s.down >= 3 && s.distance >= 3 && s.distance <= 8) blitz += 0.1;
    blitz += (0.5 - r01(qb.ratings.pocketPresence)) * 0.2;
    if (s.hurry && s.scoreDiff < 0) blitz -= 0.12;
    let pressure = null;
    if (rng.chance(blitz)) {
      const options = PRESSURES.filter((p) => p.coverages.includes(coverage.id) && Object.keys(p.blitzers).every((slot) => personnelHas(personnel, slot as DefSlot)));
      if (options.length) pressure = rng.pick(options);
    }
    if (coverage.id === 'cover0' && !pressure) pressure = PRESSURES.find((p) => p.id === 'zero_6')!;

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
    if (rng.chance(coach.disguise * (0.6 + 0.8 * dbIQ))) {
      const pool = coverage.shell === 'one-high' || coverage.id === 'cover0' ? ['cover4', 'cover2', 'cover6', 'cover2man'] : ['cover3', 'cover1'];
      shown = COVERAGE_BY_ID[rng.pick(pool.filter((id) => id !== coverage.id))];
    }
    return {
      call: { personnel, front, coverage, pressure, shown, label: `${front.name} ${coverage.name}${pressure ? ` + ${pressure.name}` : ''}${shown ? ` (shows ${shown.name})` : ''}` },
      prefs,
    };
  }
}

function personnelHas(p: DefPersonnelId, slot: DefSlot): boolean {
  const table: Record<DefPersonnelId, DefSlot[]> = {
    base43: ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'LB_S', 'LB_M', 'LB_W', 'CB_S', 'CB_W', 'FS', 'SS'],
    base34: ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT', 'LB_M', 'LB_W', 'CB_S', 'CB_W', 'FS', 'SS'],
    nickel: ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'LB_M', 'LB_W', 'CB_S', 'CB_W', 'NB', 'FS', 'SS'],
    dime: ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'LB_M', 'CB_S', 'CB_W', 'NB', 'DB', 'FS', 'SS'],
    goalline: ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT', 'LB_S', 'LB_M', 'LB_W', 'CB_S', 'CB_W', 'SS'],
  };
  return table[p].includes(slot);
}
