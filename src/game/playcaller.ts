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
import { CORNER_SIDE, callCornerTech, pressHabit } from '../playbook/corner-side.js';
import type { Rng } from '../core/rng.js';
import { CENTER_Y } from '../core/field.js';
import { overallAt, ROLE_BY_ID, roleSuitability } from '../players/roles.js';
import { r01, type Player } from '../players/types.js';
import type { ManPreference } from '../playbook/alignment.js';
import { coverageHasNamedZonePlayers, pressureIsInstallable } from '../playbook/call-integrity.js';
import { PASS_CONCEPTS, RPO_CONCEPTS, RUN_BY_ID, RUN_CONCEPTS, SCREEN_BY_ID } from '../playbook/concepts.js';
import { COVERAGE_BY_ID, FRONTS, MENU_FRONTS, NICKEL_FRONT_IDS, PRESSURES } from '../playbook/defense.js';
import { FORMATION_BY_ID, FORMATIONS } from '../playbook/formations.js';
import type { Coverage, DefPersonnelId, DefSlot, DefensivePlayCall, Formation, MotionCall, OffensivePlayCall, OffSlot, PassConcept, PersonnelId, RunConcept, SkillSlot, ZoneStyle } from '../playbook/types.js';
import { DEF_PERSONNEL, OFF_PERSONNEL } from '../playbook/types.js';
import { alignStyle, type CoverageSystem, type Team } from '../league/team.js';
import { motionEnabled } from '../sim/motion.js';
import { CALL_MIX, callMixWeight } from './call-mix.js';

/** FRONT_ALIGN (on; =0 turns it off): fronts are called as team installs use
 * them (2017 Colts, 2013 Seahawks, 2020 Ravens via the playbook session):
 * Under is the base front and Over a secondary call; nickel lines up in the
 * Over family; its pass-down front is a wide "Rush". One draw either way. */
const FRONT_ALIGN = process.env.FRONT_ALIGN !== '0';
/** SAM_ON_TE (experimental, off): see the defensive call; share of Over/Even calls with the Sam on the TE. */
const SAM_ON_TE = process.env.SAM_ON_TE === '1', SAM_ON_RATE = 0.5;
/** MUG_CALLS (experimental, off): mug rates [>=1, 2] by package and situation
 * (1 = 1st, 2 = 2nd, 3 = 3rd/4th and short (< 4), 4 = 3rd/4th and long). NFL 2022
 * snap frames: a non-lineman 0-1.6 yd off the ball inside the guards. */
const MUG_CALLS = process.env.MUG_CALLS !== '0';
/** NICKEL_FRONTS (experimental, off): shares of nickel's five-man front and of the three-man front, by moment. */
const NICKEL_FRONTS = process.env.NICKEL_FRONTS !== '0';
const SUB_SHARE: Record<'nickel' | 'dime', Record<Moment, Record<string, number>>> = {
  nickel: {
    early: { penny: .02, penny_bear: .05, mint: .03, okie: .01 },
    third: { penny: .01, penny_bear: .03, mint: .01, okie: .05 },
    short: { penny: .03, penny_bear: .10, mint: .03 },
  },
  dime: { early: { okie: .11 }, third: { okie: .18 }, short: { okie: .12 } },
};
/** MUG_PRESSURES (experimental, off): mug packages by mug count; the remainder bails (no pressure). */
const MUG_PRESSURES = process.env.MUG_PRESSURES !== '0';
const MUG_PACKAGES: Record<'double' | 'single', Array<[string, number]>> = {
  double: [['mug_one', .24], ['mug_sim', .08], ['mug_fire', .06], ['mug_both', .19]],
  single: [['mug_one', .44], ['mug_sim', .06]],
};
/** SHORT_BASE (experimental, off): share of short-yardage snaps vs heavy personnel played from the heavy package. */
const SHORT_BASE = process.env.SHORT_BASE !== '0', SHORT_HEAVY_RATE = .15;
/** NICKEL_FRONTS: share of nickel calls played from 3-3-5 personnel (the 3-3 Stack). */
const STACK_RATE = .03;
const FRONT_BY_ID_SUB = Object.fromEntries(FRONTS.filter(f => NICKEL_FRONT_IDS.has(f.id)).map(f => [f.id, f]));
const MUG_RATES: Record<'nickel' | 'dime', Record<number, [number, number]>> = {
  nickel: { 1: [.013, .001], 2: [.026, .008], 3: [.072, .023], 4: [.19, .068] },
  dime: { 1: [.062, .003], 2: [.062, .007], 3: [.105, .011], 4: [.113, .016] },
};
/** SHORT_PACKAGE (on; =0 turns it off): a short-yardage package answers the
 * offense's heavy package anywhere on the field, not only at the goal line:
 * goal-line personnel and the Bear at 2 yd or less to go vs 13, 21 or 22
 * personnel, and vs 12 at a yard or less. Tracked 2022 runs at 1-3 yd to go
 * put six or more on the line on 27% of snaps (7% otherwise) and no deep
 * safety on 27% (2%); the line tightens with the offense's package, not
 * the down (run-offense session, docs/reviews/presnap.md). Goal-line
 * personnel has no free safety, so it plays no one deep: the installs use it
 * only at the goal line, where there is no deep field. Elsewhere their heavy
 * answers keep one safety deep (Colts "36 Heavy" Cover 1, "44" 6-2 front):
 * heavy personnel (five down, two backers, both safeties) in the Bear, a
 * single-high or zero coverage (the zero call by the ordinary situational
 * weights; tracked heavy fronts at 1-3 yd play no one deep 55% of snaps). */
const SHORT_PACKAGE = process.env.SHORT_PACKAGE !== '0';
/** FRONT_STRENGTH (on; =0 turns it off): see playbook/alignment.ts. Each snap's
 * call carries where the front sets without a single attached end, from the
 * team's lean (league/team.ts alignStyle). */
const FRONT_STRENGTH = process.env.FRONT_STRENGTH !== '0';
/** FRONT_MENU (on; =0 turns it off): the front is called from the families
 * teams line up in, by defensive personnel and situation (2022 tracking,
 * weeks 1-9; scripts/diag/align/deflook.py, families from body positions in
 * line units). Teams whose base personnel shows three interior linemen on 45%
 * or more of snaps call 3-4 fronts: the bear (3-0-3) about 45%, the tite
 * about 20%, their Under about 15%, the 5-0-5 odd 2%. 4-3 base: Over about
 * 47%, Under 21%, Even 5% (their bear and tite need a fifth lineman base
 * 4-3 personnel does not have). Nickel early downs: Over 50%, Under 17%, Even
 * 8%; third down: Even 20%, Over 17%, Under 11%; dime: Even 25%, Over 18%,
 * Under 10%. Each listed weight is that family's share; families the
 * personnel cannot form are left out. The wide-nine nickel is an Over: it
 * takes a fifth of the Over share on early downs and three fifths on third
 * down. Base personnel is rare on third down; it keeps its early weights.
 * Overrides FRONT_ALIGN's install weights. On third down and 4 or more, nickel
 * and dime walk backers into the open A gaps: tracked on third and 7 or more,
 * a non-lineman within 2 yd of the ball between the guards on 17% of snaps,
 * two on 5% (docs/references/defensive-alignment-sources.md, section 8.2). */
const FRONT_MENU = process.env.FRONT_MENU !== '0';
type Moment = 'early' | 'third' | 'short';
/** DEF_PACKAGE (on; =0 turns it off): the defensive package answers the
 * offense's personnel by down and distance as 2022 tracking shows (counting
 * defensive backs at the snap, scripts/diag/align/deflook.py): against 10 or
 * 11 personnel nickel 85% on early downs with dime 8% and base 6%; on third
 * and 3-6 dime 29%, on third and 7 or more 40%; against 12 base 56% and
 * nickel 43%; against two backs or three ends base 65% and nickel 34%. A
 * nickel-first team calls base a third as often. Goal-line and short-yardage
 * packages are called first, as before. */
const DEF_PACKAGE = process.env.DEF_PACKAGE !== '0';
/** SHELL_SHOW (on; =0 turns it off): how often the secondary shows the other
 * shell depends on the coverage called, as 2022 tracking shows for dropbacks
 * (deep defenders at the snap against PFF's coverage): Cover 3 shows two high
 * 42% of the time, Cover 1 26%, a Cover 0 shows someone deep 36%; Cover 2 shows
 * one high 28%, quarters 16%, Cover 6 11%, 2-man 12%. The coordinator's habit
 * and his safeties' recognition scale it (the league mean habit is 0.275);
 * two-high trees disguise their one-high calls half again as often. Those
 * rates are the shotgun's (most dropbacks); the shell is checked to the
 * formation seen. Against the quarterback under center a one-high call shows
 * two high a third as often (13% against 35% on early downs) and a two-high
 * call rolls down to one high 1.6 times as often (30% against 19%): the run
 * fit is wanted in place before the snap. Against empty, 1.2 and 0.7 times.
 * Off: every call disguises at the coordinator's one rate. */
const SHELL_SHOW = process.env.SHELL_SHOW !== '0';
const SHOW: Record<string, number> = { cover3: .42, cover1: .26, cover0: .36, cover2: .28, tampa2: .28, cover4: .16, cover6: .11, cover2man: .12 };
const SHOW_CHECK = { under: { oneHigh: .37, twoHigh: 1.6 }, empty: { oneHigh: 1.2, twoHigh: .7 } };
/** COVER_CALL (on; =0 turns it off): the coverage call reads the matchup
 * against the league and checks to the formation seen.
 * - Matchup: the coordinator weighs his two best man corners against the
 *   receivers on the field, each against what that group usually is (the
 *   generator's league means: corners 79.3; receivers by personnel). Read
 *   raw, the corners' man ratings sit 7-10 points above the receivers' route
 *   ratings in every league, so an average matchup read as a 1.44x man edge
 *   (generated teams' mean) and Cover 1 was 34% of early-down calls against
 *   18% tracked (2022 dropbacks, PFF).
 * - Formation: tracked early-down calls by the quarterback's alignment, as
 *   ratios to the gun's (the shares the weights come from): under center
 *   Cover 3 x1.38, quarters x0.8, Cover 6 x0.6, Cover 2 x0.75; against empty
 *   quarters x1.5, Cover 1 x0.78, Cover 0 x1.7.
 * - Early downs: the base shares are the league's over all dropbacks, and
 *   the third-down factors are relative to them (Cover 1 x2 on third and
 *   3-6: 44%, tracked 45%); first and second down get their own tracked
 *   ratio to the whole (Cover 1 0.82, Cover 0 0.75, 2-man 0.5, Cover 3
 *   1.12, quarters 1.07, Cover 6 1.1). */
const COVER_CALL = process.env.COVER_CALL !== '0';
/** RUN_FORM_PAIR (default off): the run concept is called for the formation
 * the quarterback is in. Tracked 2022 runs (BDB, scripts' concept labels),
 * by quarterback alignment at the snap (under centre <= 2 yd, pistol with the
 * back directly behind, gun with the back beside him), as a ratio of the
 * concept's share in that alignment to its share of all runs (under 58.5%,
 * pistol 5.9%, gun 34.7%): outside zone is 77% under centre and 15% gun,
 * inside zone 35% and 62%, draw 19% and 75%. The installed call drew the
 * concept independently of the formation, so half our outside zone came from
 * the gun and half our inside zone from under centre, which changes where the
 * back takes the ball (tracked outside-zone backs 2.6 yd play side and running,
 * ours level with the ball). Duo uses the tracked man/duo label. Run
 * formations themselves follow the tracked alignment shares of all runs
 * (ours were about 49% gun, 39% under centre). */
const RUN_FORM_PAIR = process.env.RUN_FORM_PAIR !== '0';
/** RUN_FORM_PAIR: tracked quarterback alignment shares of all 2022 runs. */
const RUN_QB_SHARE = { under: 0.585, pistol: 0.059, gun: 0.347 };
const RUN_FORM_RATIO: Partial<Record<RunConcept['scheme'], Record<'under' | 'pistol' | 'gun', number>>> = {
  outsideZone: { under: 1.32, pistol: 1.31, gun: 0.42 }, wideZone: { under: 1.32, pistol: 1.31, gun: 0.42 },
  insideZone: { under: 0.59, pistol: 0.37, gun: 1.78 }, splitZone: { under: 0.59, pistol: 0.37, gun: 1.78 },
  duo: { under: 1.27, pistol: 1.5, gun: 0.48 }, power: { under: 0.74, pistol: 1.12, gun: 1.4 },
  counter: { under: 0.75, pistol: 1.64, gun: 1.32 }, trap: { under: 0.7, pistol: 0.47, gun: 1.58 },
  draw: { under: 0.33, pistol: 0.71, gun: 2.16 },
};
/** PRESSURE_CALL (on; =0 turns it off): how often the coordinator brings
 * pressure depends on the shell behind it. 2022 tracking, dropbacks (initial
 * pass rushers against PFF's coverage, scripts/diag/align): five or more
 * rushers behind a one-high shell on 38% of snaps, behind two-high on 11%,
 * Cover 0 85% (it is called with its pressure), all 29%. The coordinator's
 * blitz habit keeps its overall level; his chance is scaled by the shell's
 * tracked ratio to the whole, normalized over the tracked mix (one-high 56%,
 * two-high 40%): x1.48 behind one high, x0.43 behind two. Off: one chance
 * whatever the coverage, and a two-high call without an installable
 * pressure rushes four (3% with five or more, 24% behind one high). */
const PRESSURE_CALL = process.env.PRESSURE_CALL !== '0';
/** DL_GAMES (experimental, off): the coordinator calls defensive-line games
 * (angles, slants, pinches; twists on passing downs). Off: no line game is called. */
const DL_GAMES = process.env.DL_GAMES === '1';
const PRESSURE_BY_SHELL: Record<string, number> = { 'one-high': 1.48, 'two-high': .43 };
export const CB_NORM = 79.3;
// 20 personnel fields the same three receivers as 11.
/** Split-back shotgun's share of each personnel group's snaps (2022 weeks
 * 1-9, one back on each side of a shotgun QB): 11 128 of 10,114, 12 33 of
 * 2,945, 21 102 of 1,379. 20 personnel has no other installed set. */
const SPLIT_BACK_SHARE: Partial<Record<PersonnelId, number>> = { '11': .013, '12': .011, '21': .074 };
/** Of the group's runs: 11 36 of 3,036, 12 21 of 1,552, 21 48 of 761. */
const SPLIT_BACK_RUN_SHARE: Partial<Record<PersonnelId, number>> = { '11': .012, '12': .014, '21': .063 };
export const WR_NORM: Partial<Record<PersonnelId, number>> = { '10': 69.6, '11': 71.3, '12': 72.0, '20': 71.3, '21': 72.0, '13': 76.6, '22': 76.6 };
/** COVER_LONG (on since run-ref-24; COVER_LONG=0 restores): the early-down tilt is not
 * applied on 2nd and 7+. An offence off schedule is passing, and NFL defences
 * call 2nd and long like 3rd and long (BDB 2025 weeks 1-9, pff_passCoverage:
 * Cover 3 29.7% on 2nd & 8+, 27.7% on 3rd & 8+, 38.6% on 1st down). The tilt
 * applied to every 1st and 2nd down, so over 200 league-sampled coordinators
 * 2nd & 7+ was Cover 3 41.6% (docs/reviews/2026-11-11-cover-mix.md). No new
 * weights: 2nd & 7+ keeps the base shares and the coordinator's tree. */
const COVER_LONG = process.env.COVER_LONG !== '0';
const EARLY_DOWN: Record<string, number> = { cover1: .82, cover0: .75, cover2man: .5, cover3: 1.12, cover4: 1.07, cover6: 1.1 };
const CALL_CHECK: Record<'under' | 'empty', Record<string, number>> = {
  under: { cover3: 1.38, cover4: .8, cover6: .6, cover2: .75, tampa2: .75, cover0: 1.3 },
  empty: { cover4: 1.5, cover1: .78, cover0: 1.7, cover3: .91, cover6: .92 },
};
function defPackage(rng: Rng, off: PersonnelId, s: Situation, scheme: string): DefPersonnelId {
  const third = s.down >= 3 && s.distance >= 3;
  const short = s.distance <= 2;
  const w: [number, number, number] = off === '10' || off === '11'
    ? short ? [9, 83, 8] : !third ? [6, 85, 8] : s.distance <= 6 ? [1, 70, 29] : [0, 57, 43]
    // 20 personnel is met like 12 (2022 weeks 1-9, early downs: base 45%,
    // nickel 53% of 86 snaps; 12 is 58/41, 21 is 56/43).
    : off === '12' || off === '20' ? short ? [58, 42, 0] : third ? [20, 50, 30] : [56, 43, 1]
    : short ? [75, 25, 0] : third ? [30, 60, 10] : [65, 34, 1];
  if (scheme === 'nickel-heavy') w[0] /= 3;
  const base: DefPersonnelId = scheme === '3-4' ? 'base34' : 'base43';
  return rng.weighted([base, 'nickel', 'dime'] as DefPersonnelId[], w);
}
const MENU: Record<'43' | '34', Partial<Record<DefPersonnelId, Record<Moment, Record<string, number>>>>> = {
  '43': {
    base43: { early: { over: 47, under: 21, even: 5 }, third: { over: 47, under: 21, even: 5 }, short: { over: 34, under: 16, even: 4 } },
    nickel: { early: { over: 52, under: 19, even: 8 }, third: { over: 17, under: 11, even: 20 }, short: { over: 39, under: 14, even: 4 } },
    dime: { early: { over: 26, under: 10, even: 27 }, third: { over: 11, under: 11, even: 23 }, short: { over: 26, under: 10, even: 20 } },
  },
  '34': {
    base34: { early: { bear34: 44, tite: 20, under34: 16, odd: 2 }, third: { bear34: 44, tite: 20, under34: 16, odd: 2 }, short: { bear34: 39, tite: 9, under34: 13, odd: 2 } },
    nickel: { early: { over: 45, under: 15, even: 8 }, third: { over: 20, under: 11, even: 20 }, short: { over: 33, under: 12, even: 8 } },
    dime: { early: { over: 24, under: 10, even: 22 }, third: { over: 13, under: 9, even: 21 }, short: { over: 24, under: 10, even: 20 } },
  },
};
function menuWeight(id: string, personnel: DefPersonnelId, scheme: string, moment: Moment): number {
  const table = (MENU[scheme === '3-4' ? '34' : '43'][personnel] ?? MENU['43'][personnel])?.[moment];
  if (!table) return 1;
  if (id === 'wide9') return (table.over ?? 0) * (moment === 'third' ? .6 : .2) * (scheme === 'nickel-heavy' ? 2 : 1);
  if (id === 'over' && (personnel === 'nickel' || personnel === 'dime')) return (table.over ?? 0) * (moment === 'third' ? .4 : .8);
  return table[id] ?? 0;
}
function shortPackage(offPersonnel: PersonnelId, distance: number): boolean {
  if (offPersonnel === '13' || offPersonnel === '21' || offPersonnel === '22') return distance <= 2;
  return offPersonnel === '12' && distance <= 1;
}
function installWeight(id: string, personnel: DefPersonnelId, passingDown: boolean, scheme: string): number {
  if (personnel === 'base43') return id === 'under' ? 3 : id === 'over' ? 1 : 0;
  if (personnel === 'nickel' || personnel === 'dime') {
    if (id === 'wide9') return passingDown ? 3 : scheme === 'nickel-heavy' ? 1 : .5;
    return id === 'over' ? passingDown ? 1 : 3 : id === 'under' ? passingDown ? .25 : 1 : 0;
  }
  return 1;
}

/** SCREEN_CALL (experimental, off; SCREEN_CALL=1; menu sizing, 2026-11-14): the quick perimeter screens and the
 * screen RPO in the caller's pool, as calls of their own at the NFL's rate for the down and distance. Pool admission
 * only: the screens, their blocking, the QB's kills and the RPO's pre-snap read are the screen lab's, unchanged.
 * Rates are BDB 2025 weeks 1-9 (plays.csv, player_play.csv): [quick screen to a WR, per pass call, not an RPO;
 * the RPO, per run call (run or RPO)]. The WR-screen rate is the targeted rate divided by the share of our pass calls
 * whose formation fits a quick screen (engine-62 collect, seeds 101-116), so the called share matches; a killed
 * screen still counts as a call. The RPO is called from 11 personnel only (its formation is gun doubles 11). */
export const SCREEN_CALL = process.env.SCREEN_CALL !== '0';
const SCREEN_CALL_RATE: Record<string, [number, number]> = {
  '1st': [0.037, 0.220],        // WR screen 2.6% of 3,542 dropbacks; RPO 826 of 3,747 runs
  '2nd_short': [0.021, 0.289],  // 1.5% of 342; 161 of 557
  '2nd_med': [0.038, 0.257],    // 3.0% of 978; 212 of 824
  '2nd_long': [0.055, 0.315],   // 3.8% of 2,030; 257 of 815
  '3rd_short': [0.015, 0.208],  // 1.0% of 616; 121 of 583 (3rd and 4th down)
  '3rd_med': [0.012, 0.370],    // 0.9% of 1,022; 37 of 100
  '3rd_long': [0.052, 0.220],   // 4.3% of 1,206; 20 of 91
};
const screenBucket = (s: Situation) => s.down === 1 ? '1st'
  : `${s.down === 2 ? '2nd' : '3rd'}_${s.distance <= 3 ? 'short' : s.distance <= 7 ? 'med' : 'long'}`;
/** The quick screens a formation can run: the bubble from trips (the slot behind #1's stalk and #3's crack), the
 * bunch now from a bunch, the now screen from 2x2 (#2 stalks for #1), the tunnel from 2x2 or trips (#2 stalks). */
function quickScreensFor(f: Formation): PassConcept[] {
  const t = f.tags, out: PassConcept[] = [];
  if (t.includes('bunch')) out.push(SCREEN_BY_ID.bunch_now_screen);
  if (t.includes('trips') && !t.includes('bunch')) out.push(SCREEN_BY_ID.bubble_screen);
  if (t.includes('2x2')) out.push(SCREEN_BY_ID.wide_now_screen);
  if (t.includes('2x2') || (t.includes('trips') && !t.includes('bunch'))) out.push(SCREEN_BY_ID.tunnel_screen);
  return out.filter(Boolean);
}

/** PA_CALL (experimental, off; PA_CALL=1): play action as a tag on the call (see playActionTag). */
const PA_CALL = process.env.PA_CALL !== '0';
/** The NFL's play-action rate on drop-backs by down/distance and the QB's alignment [gun, under center or pistol]
 * (BDB 2025 plays.csv, drop-backs, not empty, not spikes; 9,7xx plays). Under center about 80% everywhere; from the
 * gun it falls with the situation. */
const PA_TAG_RATE: Record<string, [number, number]> = {
  '1st': [0.24, 0.81], '2nd_short': [0.23, 0.75], '2nd_med': [0.21, 0.79], '2nd_long': [0.16, 0.77],
  '3rd_short': [0.11, 0.79], '3rd_med': [0.03, 0.5], '3rd_long': [0.02, 0.47], '4th': [0.06, 0.73],
};

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

export type FourthDownChoice = 'go' | 'punt' | 'fg';

/** Fourth-down policy, separate from executing a snap or kick. Range is the
 * coach's estimate for the available kicker, never the next kick's result.
 * Game.fourthDown delegates here. */
export function chooseFourthDown(
  s: Pick<Situation, 'distance' | 'yardline' | 'quarter' | 'clock' | 'scoreDiff'>,
  options: { fieldGoalRange: number; aggression: number },
): FourthDownChoice {
  const toGoal = 100 - s.yardline;
  const fgDistance = toGoal + 17;
  const inRange = fgDistance <= options.fieldGoalRange;
  // Retain the existing short endgame window. A kick can win a tied game,
  // too: short yardage is not a reason to spend this scoring opportunity.
  if (s.quarter === 4 && s.clock < 36 && s.scoreDiff === 0 && inRange) return 'fg';
  if (s.quarter >= 4 && s.scoreDiff < 0 && (s.clock < 150 || (s.scoreDiff < -8 && s.clock < 300))) {
    if (s.scoreDiff >= -3 && inRange && s.clock < 36) return 'fg';
    return 'go';
  }

  // Preserve the existing ordinary field-position/distance/aggression policy.
  // NFL choice rates diagnose its limits; they are not fitted probabilities.
  let goThreshold = 0;
  if (s.yardline >= 40) goThreshold = 1;
  if (s.yardline >= 55) goThreshold = 2;
  if (s.yardline >= 62 && !inRange) goThreshold = 4;
  if (toGoal <= 5) goThreshold = 1.5;
  goThreshold += (options.aggression - 0.5) * 2;
  if (s.yardline < 30) goThreshold -= 1;
  if (s.distance <= goThreshold) return 'go';
  return inRange ? 'fg' : 'punt';
}

/** Score margin is AFTER the touchdown's six points, BEFORE the Try.
 * The game still owns whether a Try is required, hook overrides and overtime
 * adjudication; its afterTouchdown delegates the default choice here.
 * This repairs the existing chart, not a win-probability optimizer. */
export function chooseTry(
  s: Pick<Situation, 'quarter' | 'clock' | 'scoreDiff'>,
  aggression: number,
  rng: Rng,
): 'kick' | 'two' {
  // With regulation over and the score tied, one point already wins. Don't
  // let the discretionary two-point draw spend that opportunity at random.
  if (s.quarter === 4 && s.clock === 0 && s.scoreDiff === 0) return 'kick';
  // -13 -> -11 permits a TD+two and FG to tie; +12 -> +14 protects against
  // two TD+XP scores. Both were absent from the old late-game chart.
  if (s.quarter === 4 && (s.scoreDiff === -13 || s.scoreDiff === 12)) return 'two';
  if (s.quarter >= 4 && [-12, -10, -9, -5, -2, 1, 5].includes(s.scoreDiff)) return 'two';
  // Retain the existing discretionary coach tendency elsewhere. Estimating
  // conversion chances and a fuller risk policy are separate coaching work.
  return rng.chance(0.06 + 0.1 * aggression) ? 'two' : 'kick';
}

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
    /** Evaluation harness: call only designed runs (the pass draw is still taken). */
    private readonly runOnly = false,
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
    const isPass = rng.chance(pass) && !this.runOnly;

    const personnel = this.choosePersonnel(s, isPass);
    const formation = this.chooseFormation(personnel, isPass);
    // Strength to the field (wide side) most of the time.
    const fieldLeft = s.ballY < CENTER_Y;
    const flip = rng.chance(0.7) ? fieldLeft : !fieldLeft;
    const motion = motionEnabled() ? this.chooseMotion(formation, isPass) : undefined;
    const tag = motion ? ` (${motion.slot} ${motion.kind} motion)` : '';
    if (isPass) {
      // SCREEN_CALL: a quick screen is its own call, drawn on its own stream before the concept.
      if (SCREEN_CALL) {
        const screens = quickScreensFor(formation), rs = this.rng.fork(`screen-call:${this.screenCalls++}`);
        if (screens.length && rs.next() < SCREEN_CALL_RATE[screenBucket(s)][0]) {
          const pass = screens[Math.floor(rs.next() * screens.length)];
          // Without motion: the screens' blocking and spots are built from the formation as aligned (screen lab).
          return { formation, flip, kind: 'pass', pass, label: `${formation.name} — ${pass.name}` };
        }
      }
      let concept = this.choosePass(s, formation, defense);
      // PA_CALL: play action as a tag on the call, at the NFL's rate for this situation and alignment.
      if (PA_CALL) concept = this.playActionTag(concept, s, formation);
      return { formation, flip, kind: 'pass', pass: concept, motion, label: `${formation.name} — ${concept.name}${tag}` };
    }
    // SCREEN_CALL: the screen RPO, from 11 personnel, on its own stream.
    if (SCREEN_CALL && personnel === '11') {
      const rpo = RPO_CONCEPTS[0], rr = this.rng.fork(`rpo-call:${this.screenCalls++}`);
      if (rpo && rr.next() < SCREEN_CALL_RATE[screenBucket(s)][1]) {
        const f = FORMATION_BY_ID[rpo.formation], run = RUN_BY_ID[rpo.run], screen = SCREEN_BY_ID[rpo.screen];
        if (f && run && screen) return { formation: f, flip, kind: 'run', run, rpo: screen, label: `${f.name} — ${rpo.name}` };
      }
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
    // 20 personnel was 0.6% of 2022 snaps (weeks 1-9): a weight of 0.06 in
    // tables that sum to about 10.
    const table: Record<string, Array<[PersonnelId, number]>> = {
      'air-raid': [['10', 3], ['11', 6], ['12', 1], ['20', 0.06]],
      spread: [['11', 6.5], ['10', 1.5], ['12', 2], ['20', 0.06]],
      'west-coast': [['11', 5.5], ['12', 2.5], ['21', 1.5], ['10', 0.5], ['20', 0.06]],
      'wide-zone': [['11', 5.5], ['12', 2.5], ['21', 1.5], ['13', 0.5], ['20', 0.06]],
      power: [['11', 4], ['12', 3], ['21', 2], ['22', 1], ['20', 0.06]],
    };
    return pickWeighted(this.rng, table[scheme]);
  }

  private chooseFormation(personnel: PersonnelId, isPass: boolean): Formation {
    const scheme = this.team.offScheme;
    const forms = FORMATIONS.filter((f) => f.personnel === personnel);
    const gunPref = scheme === 'air-raid' || scheme === 'spread' ? 2.5 : scheme === 'west-coast' ? 1.4 : 0.8;
    const runPair = RUN_FORM_PAIR && !isPass;
    let weights: Array<[Formation, number]>;
    if (runPair) {
      // Runs: the tracked quarterback alignment shares of all runs, spread
      // over this personnel's formations of each alignment, with the
      // scheme's gun preference kept as a tilt (1 for a pro-style offense).
      const count = (qb: string) => forms.filter((f) => f.qb === qb && !f.tags.includes('empty')).length || 1;
      weights = forms.map((f): [Formation, number] => [f, f.tags.includes('empty') ? 0.002
        : (f.qb === 'gun' ? RUN_QB_SHARE.gun * gunPref / 0.8 : f.qb === 'pistol' ? RUN_QB_SHARE.pistol : RUN_QB_SHARE.under) / count(f.qb)]);
    } else weights = forms.map((f): [Formation, number] => [f, (f.qb === 'gun' ? gunPref * (isPass ? 1.3 : 0.8) : f.qb === 'pistol' ? 1 : isPass ? 0.8 : 1.4) * (f.tags.includes('empty') && !isPass ? 0.05 : 1)]);
    // Split-back gun takes its 2022 share of its personnel group's snaps
    // (of its runs, when runs follow the tracked alignment shares).
    const share = (runPair ? SPLIT_BACK_RUN_SHARE : SPLIT_BACK_SHARE)[personnel];
    const splitW = weights.filter(([f]) => f.tags.includes('split-backs')).reduce((t, [, w]) => t + w, 0);
    const otherW = weights.reduce((t, [, w]) => t + w, 0) - splitW;
    if (share !== undefined && splitW > 0 && otherW > 0) {
      const k = share / (1 - share) * otherW / splitW;
      for (const entry of weights) if (entry[0].tags.includes('split-backs')) entry[1] *= k;
    }
    return pickWeighted(this.rng, weights);
  }

  /**
   * PA_CALL: play action is an action put in front of a concept, not a family of its own (docs/reviews/
   * 2026-11-12-pa-call.md). After the concept is chosen the caller decides whether to put the run action on it, at
   * the NFL's rate for the down and distance and the QB's alignment (PA_TAG_RATE). Quick and drop-back concepts take
   * it from either alignment (NFL play action from the gun: 53% of throws under 5 air yards; under center 42% under 5
   * and 32% at 15+). Screens and empty sets never do; the PA concepts already carry it. The tagged call is
   * the same concept with the fake (the back's run track, the line's look, the QB's PA drop by alignment). Drawn on
   * its own stream, so the rest of the call is unchanged.
   */
  private playActionTag(c: PassConcept, s: Situation, f: Formation): PassConcept {
    if (c.family === 'playaction' || c.family === 'screen' || f.tags.includes('empty')) return c;
    const gun = f.qb === 'gun';
    const bucket = s.down === 1 ? '1st' : s.down === 2 ? (s.distance <= 3 ? '2nd_short' : s.distance <= 6 ? '2nd_med' : '2nd_long')
      : s.down === 3 ? (s.distance <= 3 ? '3rd_short' : s.distance <= 6 ? '3rd_med' : '3rd_long') : '4th';
    const rate = (s.hurry ? 0.25 : 1) * PA_TAG_RATE[bucket][gun ? 0 : 1];
    if (this.rng.fork(`pa-tag:${this.paTags++}`).next() >= rate) return c;
    return { ...c, id: `${c.id}+pa`, name: `PA ${c.name}`, family: 'playaction', drop: 'pa', fake: gun ? 'insideZone' : 'outsideZone' };
  }
  private paTags = 0;
  private screenCalls = 0;

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
      // CALL_MIX: the route classes this down and distance calls for (src/game/call-mix.ts).
      if (CALL_MIX) w *= callMixWeight(c, s.down, s.distance);
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
      // Split zone needs a slicer: a fullback, an off-ball tight end, or a
      // second back set beside the QB.
      if (c.scheme === 'splitZone' && !Object.entries(f.slots).some(([slot,p]) =>
        (slot === 'F' || ((slot === 'H' || slot === 'Y') && (f.personnel === '12' || f.personnel === '22'))
          || (slot !== 'RB' && !!p && p.depth >= 3))
        && p && p.depth > .9 && (p.split === 'core' || p.split === 'wing' || (typeof p.split === 'number' && p.split < 6)))) w = 0;
      if (gap) w *= scheme === 'power' ? 2.0 : 0.9;
      w *= Math.exp(((zone ? zoneFit : gap ? gapFit : (zoneFit + gapFit) / 2) - 55) / 25);
      if (c.scheme === 'power' && hasFB) w *= 1.5;
      if (c.scheme === 'draw' && !RUN_FORM_PAIR) w *= gun ? 1.2 : 0.5;
      const pair = RUN_FORM_PAIR ? RUN_FORM_RATIO[c.scheme]?.[f.qb as 'under' | 'pistol' | 'gun'] : undefined;
      if (pair !== undefined) w *= pair;
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
  /** Calls made: names each call's own stream for draws added later, so they
   * leave every earlier draw unchanged. */
  private calls = 0;
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

  /** formation: the offense's set as seen before the snap, for the shell check. */
  call(s: Situation, offPersonnel: PersonnelId, offense: Team, offSlots: Partial<Record<OffSlot, Player>>, formation?: Formation): { call: DefensivePlayCall; prefs: ManPreference } {
    const rng = this.rng;
    const coach = this.team.coach;
    const scheme = this.team.defScheme;
    const passingDown = s.down >= 3 && s.distance >= 7;
    const own = rng.fork(`call:${this.calls++}`);
    const goalLine = 100 - s.yardline <= 2;
    let personnel: DefPersonnelId;
    let heavy = false;
    if (goalLine && (offPersonnel === '22' || offPersonnel === '13' || offPersonnel === '21')) personnel = 'goalline';
    else if (SHORT_PACKAGE && shortPackage(offPersonnel, s.distance) && 100 - s.yardline <= 5) personnel = 'goalline';
    // SHORT_BASE (experimental, off): short yardage against heavy personnel
    // goes to the heavy package (its bear) on 15% of snaps, the league's
    // 4+-interior "heavy" share there; otherwise base personnel and its
    // short-yardage menu, whose 3-4 bear supplies the rest of the bear (NFL vs
    // 3+ backs and ends at 2 yards or less, 2022 snap frames: over/under 33%,
    // bear 24%, heavy 13%, tite 8%, even 6%; scripts/diag/align/nfronts.py).
    // Ours played the bear on 88% of those snaps.
    else if (SHORT_PACKAGE && shortPackage(offPersonnel, s.distance) && (!SHORT_BASE || own.fork('short-heavy').next() < SHORT_HEAVY_RATE)) { personnel = 'heavy'; heavy = true; }
    else if (SHORT_BASE && SHORT_PACKAGE && shortPackage(offPersonnel, s.distance)) personnel = scheme === '3-4' ? 'base34' : 'base43';
    else if (DEF_PACKAGE) personnel = defPackage(own.fork('package'), offPersonnel, s, scheme);
    else if (offPersonnel === '10') personnel = rng.chance(passingDown ? 0.7 : 0.35) ? 'dime' : 'nickel';
    else if (offPersonnel === '11') personnel = passingDown && rng.chance(0.4) ? 'dime' : scheme === 'nickel-heavy' || rng.chance(0.85) ? 'nickel' : scheme === '3-4' ? 'base34' : 'base43';
    else if (offPersonnel === '12' || offPersonnel === '20') personnel = rng.chance(scheme === 'nickel-heavy' ? 0.6 : 0.4) ? 'nickel' : scheme === '3-4' ? 'base34' : 'base43';
    else personnel = scheme === '3-4' ? 'base34' : 'base43';

    if (NICKEL_FRONTS && personnel === 'nickel' && own.fork('stack335').next() < STACK_RATE) personnel = 'stack335';
    const fronts = FRONTS.filter((f) => f.personnel.includes(personnel) && (FRONT_MENU || !MENU_FRONTS.has(f.id)) && !NICKEL_FRONT_IDS.has(f.id));
    const moment: Moment = s.distance <= 2 ? 'short' : s.down >= 3 ? 'third' : 'early';
    // NICKEL_FRONTS (experimental, off): sub packages also play the Penny,
    // Penny Bear, Mint, Okie and (in 3-3-5 personnel) the 3-3 Stack, at shares
    // from 2022 snap frames classified by interior shape
    // (scripts/diag/align/nfronts.py), less what mugs and walk-ups add.
    const subDraw = own.fork('sub-front').next();
    let sub: typeof fronts[number] | undefined;
    if (NICKEL_FRONTS && (personnel === 'nickel' || personnel === 'dime')) {
      let acc = 0;
      for (const [id, share] of Object.entries(SUB_SHARE[personnel][moment])) {
        acc += share;
        if (subDraw < acc) { sub = FRONT_BY_ID_SUB[id]; break; }
      }
    }
    if (NICKEL_FRONTS && personnel === 'stack335') sub = FRONT_BY_ID_SUB.stack33;
    let front = sub ?? pickWeighted(
      rng,
      fronts.map((f) => [f, FRONT_MENU ? menuWeight(f.id, personnel, scheme, moment)
        : FRONT_ALIGN ? installWeight(f.id, personnel, passingDown, scheme)
        : scheme === '4-3' && (f.id === 'over' || f.id === 'under') ? 2 : scheme === 'nickel-heavy' && f.id === 'wide9' ? 2 : 1] as [typeof f, number]),
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
    const matchupEdge = COVER_CALL ? Math.exp(((cbMan - CB_NORM) - (wrs.length ? wrRoute - (WR_NORM[offPersonnel] ?? 72) : 0)) / 25) : Math.exp((cbMan - wrRoute) / 25);
    const seenForm = formation?.tags.includes('empty') ? 'empty' : formation?.qb === 'under' ? 'under' : undefined;
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
      if (COVER_CALL && seenForm) fw[1] *= CALL_CHECK[seenForm][f] ?? 1;
      if (COVER_CALL && s.down <= 2 && !(COVER_LONG && s.down === 2 && s.distance >= 7)) fw[1] *= EARLY_DOWN[f] ?? 1;
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
    const family = pickWeighted(rng, famW.filter(([id]) => availableVariants[id]?.length && (!heavy || id === 'cover1' || id === 'cover3' || id === 'cover0')));
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
    if (PRESSURE_CALL) blitz *= PRESSURE_BY_SHELL[coverage.look ?? coverage.shell] ?? 1;
    let pressure = null;
    if (rng.chance(blitz)) {
      const options = PRESSURES.filter((p) => !p.id.startsWith('mug_') && pressureIsInstallable(personnel, front, coverage, p));
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
    const habit = coach.disguise * (0.6 + 0.8 * dbIQ);
    const seen = formation?.tags.includes('empty') ? SHOW_CHECK.empty : formation?.qb === 'under' ? SHOW_CHECK.under : undefined;
    const check = seen ? (look === 'two-high' ? seen.twoHigh : seen.oneHigh) : 1;
    // SHELL_SHOW: a two-high tree keeps its own presentation (tracked Fangio
    // trees show two high on 85-87% of snaps: HNFL-186 scouting, 2025 Eagles
    // 87%), checked to the formation; other systems disguise by family.
    const tree = system === 'two-high' && look !== 'two-high';
    const disguiseRate = SHELL_SHOW ? Math.min(.9, (tree ? 0.85 : (SHOW[family] ?? .2) * habit / .275) * check)
      : tree ? 0.85 : habit;
    if (rng.chance(disguiseRate)) {
      // A two-high tree shows one home shell, quarters, on everything it
      // rotates out of (Fangio: "don't let them know"); others vary the look.
      // SHELL_SHOW: a disguised zero shows one high as often as two (tracked 21% and 16%).
      const pool = system === 'two-high' ? (look === 'two-high' ? [] : ['cover4'])
        : look === 'zero' && SHELL_SHOW && own.fork('zero-look').chance(.57) ? ['cover1', 'cover3']
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
    const strength: DefensivePlayCall['strength'] = !FRONT_STRENGTH ? undefined
      : own.fork('strength').chance(alignStyle(this.team).passingStrength ?? .6) ? 'passing' : 'opposite';
    const mugDraw = own.fork('mug').next();
    // MUG_CALLS (experimental, off): nickel and dime mug on every down at the
    // league's rates by package and situation (rates[0] one or more backers in
    // an A gap at the snap, rates[1] two; 2022 tracking, rgtools/mugwalk.py).
    // Whether a mugged backer rushes or bails stays with the pressure call.
    const mugRates = MUG_CALLS && (personnel === 'nickel' || personnel === 'dime') ? MUG_RATES[personnel][s.down <= 2 ? s.down : s.distance < 4 ? 3 : 4] : null;
    const mug: DefensivePlayCall['mug'] = mugRates
      ? mugDraw < mugRates[1] ? 2 : mugDraw < mugRates[0] ? 1 : undefined
      : FRONT_MENU && (personnel === 'nickel' || personnel === 'dime') && s.down >= 3 && s.distance >= 4
        ? mugDraw < .05 ? 2 : mugDraw < .17 ? 1 : undefined : undefined;
    // MUG_PRESSURES (experimental, off): a call that mugs also says who of
    // the muggers comes (the mug package), at the shares 2022 tracking shows
    // on nickel dropbacks with a mug at the snap (scripts/diag/align/mugrush.py):
    // double mug no mugger rushes 42%, one 32%, both 25% (a lineman dropping
    // 14%); single mug the mugger rushes half the time. A package the called
    // coverage cannot carry falls back to the bail (no pressure).
    // A double mug is called out of a front that leaves both A gaps open
    // (the Even's two 3 techniques, the "Jet" look); from an Over or Under
    // the 1 technique sits in one of them and only one backer can mug.
    if (MUG_PRESSURES && mug === 2 && front.id !== 'even') {
      const even = FRONTS.find((f) => f.id === 'even' && f.personnel.includes(personnel));
      if (even) front = even;
    }
    if (MUG_PRESSURES && mug) {
      const table = mug === 2 && personnel === 'nickel' ? MUG_PACKAGES.double : MUG_PACKAGES.single;
      const draw = own.fork('mug-package').next();
      let acc = 0, id: string | null = null;
      for (const [pid, share] of table) { acc += share; if (draw < acc) { id = pid; break; } }
      const pick = id ? PRESSURES.find((p) => p.id === id) : undefined;
      pressure = pick && pressureIsInstallable(personnel, front, coverage, pick) ? pick : null;
    }
    // A creep must belong to the pressure finally called.
    const creepCalled = creep && pressure && creep.slot in pressure.blitzers ? creep : undefined;
    // SAM_ON_TE (experimental, off): in an Over or Even front the Sam is
    // called on the line on the tight end ("Sam on") or kept off the ball
    // as the front's stack backer. NFL backers over an attached TE stand on
    // the line on 56% of snaps (30% at backer depth); Under calls already
    // put ours on, so about half the Over/Even calls do.
    const samOn = SAM_ON_TE && (front.id === 'over' || front.id === 'even') && 'LB_S' in DEF_PERSONNEL[personnel] && own.fork('sam-on').next() < SAM_ON_RATE ? true : undefined;
    // DL_GAMES: a called line game. Passing downs bring twists; run downs an
    // occasional angle, slant or pinch (more in short yardage). Rates from 2022
    // tracking: twists on about 6-10% of dropbacks, movement led by the line on
    // a few percent of runs (most early DL lateral movement is a read).
    let dlGame: DefensivePlayCall['dlGame'];
    if (DL_GAMES && !pressure?.droppers) {
      const g = own.fork('dlgame'), u = g.next(), dir = g.chance(.5) ? 'S' as const : 'W' as const;
      const short = s.distance <= 2;
      if (passingDown) { if (u < .12) dlGame = { kind: 'twist', dir, pair: g.weighted(['TE', 'ET', 'TT'] as const, [.4, .35, .25]) }; }
      else if (short) { if (u < .04) dlGame = { kind: 'pinch', dir }; else if (u < .07) dlGame = { kind: 'slant', dir }; else if (u < .11) dlGame = { kind: 'angle', dir }; }
      else if (u < .04) dlGame = { kind: 'angle', dir }; else if (u < .055) dlGame = { kind: 'slant', dir };
      else if (u < .06) dlGame = { kind: 'pinch', dir }; else if (u < .09) dlGame = { kind: 'twist', dir, pair: g.weighted(['TE', 'ET', 'TT'] as const, [.4, .35, .25]) };
    }
    const gameTag = dlGame ? ` [${dlGame.kind}${dlGame.pair ? ' ' + dlGame.pair : ''} ${dlGame.dir}]` : '';
    // CORNER_SIDE (experimental, off): the corner technique by side, on a zone family that can install a solo corner.
    // The receivers he expects to each side and the one alone there come from the seen formation (W its short side,
    // S its long); his corner is CB_S the better by overall, CB_W the next, as the depth chart fills them; unseen, the
    // wideouts' average and the lone corner's rate. His team's habit (pressHabit, from his man rate) moves how often.
    let cornerTech: DefensivePlayCall['cornerTech'];
    if (CORNER_SIDE) {
      const bySide: Record<string, string[]> = { L: [], R: [] };
      if (formation) for (const [slot, a] of Object.entries(formation.slots)) if (a && a.side !== 'C' && a.split !== 'core') bySide[a.side].push(slot);
      const [short, long] = bySide.L.length <= bySide.R.length ? [bySide.L, bySide.R] : [bySide.R, bySide.L];
      const at = (side: 'S' | 'W') => (side === 'W' ? short : long);
      const byCorner = this.team.roster.filter((p) => p.position === 'CB').sort((a, b) => overallAt(b) - overallAt(a));
      cornerTech = callCornerTech(coverage, pressHabit(coach.manRate), (side) => {
        const cb = byCorner[side === 'S' ? 0 : 1]?.ratings.manCoverage ?? cbMan;
        const lone = at(side).length === 1 ? offSlots[at(side)[0] as OffSlot] : undefined;
        const wr = lone ? (lone.ratings.routeRunning + lone.ratings.releaseVsPress) / 2 : wrRoute;
        return Math.exp(((cb - CB_NORM) - (wr - (WR_NORM[offPersonnel] ?? 72))) / 25);
      }, (side) => own.fork(`corner-tech:${side}`).next(), (side) => (formation ? at(side).length || undefined : undefined));
    }
    return {
      call: { personnel, front, coverage, pressure, shown, zoneStyle, ...(cornerTech ? { cornerTech } : {}), frontStem, creep: creepCalled, checkPick: coach.checkPick,
        checkPrefer: this.checkPrefer(passingDown, system), zeus, strength, mug, samOn, ...(dlGame ? { dlGame } : {}),
        runPolicy:{edge:scheme==='3-4' ? 'spill':'box',linebacker:'stack'},
        label: `${front.name} ${coverage.name}${styleTag}${pressure ? ` + ${pressure.name}` : ''}${shown ? ` (shows ${shown.name})` : ''}${gameTag}` },
      prefs,
    };
  }
}

function personnelHas(p: DefPersonnelId, slot: DefSlot): boolean {
  return !!DEF_PERSONNEL[p][slot];
}
