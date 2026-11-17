/**
 * Pre-snap play art for the replay viewer: the call as called, for a person watching.
 *
 * A passive read-only tap on PlaySim.prototype.tick: on a sim's first tick (behaviors are assigned by then) it copies the
 * call and each agent's assigned job into a plain-data "sheet". Nothing here is read by any player, draws no random
 * numbers, and changes no play (the recorded replay is identical with or without the tap; scripts/play-art-check.ts).
 *
 * Sources, all already held by the engine for the play: the offensive and defensive call objects (concept, formation,
 * coverage, front, pressure), the alignment's roles (`defAlign.spots[slot].role`, `manTarget`, `rushGap`), the installed
 * receiver routes (`ownRoutes`: the called route as a path in field coordinates), and each agent's assigned behavior.
 * What is decided after the snap (a pass-protection pick-up, a pattern-match rule's choice, a back's check release, a
 * screen blocker's target) is shown as the RULE, not as a fixed line: the sheet marks those `live: true`.
 */
import { ownRoutes } from '../src/sim/ball-estimate.js';
import { gapY, zoneLandmark } from '../src/playbook/alignment.js';
import { PlaySim } from '../src/sim/playsim.js';
import { FIELD_WIDTH } from '../src/core/field.js';
import type { PlayLog } from '../src/game/game.js';
import type { MatchRule, ZoneId } from '../src/playbook/types.js';

type XY = [number, number];
const r1 = (v: number) => Math.round(v * 10) / 10;
const xy = (p: { x: number; y: number }): XY => [r1(p.x), r1(p.y)];

export type Job =
  | { t: 'qb'; text: string; drop?: string; reads?: string[] }
  | { t: 'route'; route: string; path: XY[]; brk?: number; text: string; live?: boolean; ref?: string }
  | { t: 'protect'; text: string; live: true; release?: { route: string; path: XY[] } }
  | { t: 'runblock'; kind: string; text: string; drive: XY; pull?: XY[]; target?: string; live?: boolean }
  | { t: 'carry'; text: string; aim: XY }
  | { t: 'fake'; text: string; path?: XY[] }
  | { t: 'block'; text: string; live: true }
  | { t: 'zone'; zone: string; area: [number, number, number, number]; center: XY; text: string; rule?: string; style: string }
  | { t: 'man'; target: string; text: string; press: boolean; lev?: string }
  | { t: 'rush'; gap: string; to: XY; text: string }
  | { t: 'blitz'; gap: string; to: XY; text: string }
  | { t: 'fit'; gap: string; to: XY; text: string }
  | { t: 'spy'; text: string };

export interface ArtSheet {
  los: number;
  formation: string;
  coverage: string;
  /** Pass concept id, run scheme id or screen id, as the call names it. */
  concept: string;
  offense: {
    kind: 'pass' | 'run';
    name: string;
    formation: string;
    personnel: string;
    drop?: string;
    read?: string;
    progression?: string[];
    screen?: string;
    motion?: string;
    fake?: boolean;
  };
  defense: { coverage: string; family?: string; shell: string; front: string; personnel: string; pressure: string | null; note?: string; zoneStyle: string };
  players: Array<{ team: 'O' | 'D'; slot: string; pos: XY; job: Job | null }>;
}

// ---------------------------------------------------------------------------------- words for the rules
/** One line per pattern-match rule, from the rule's own comment in src/sim/coverage/rules.ts (the textbook meaning). */
export const RULE_TEXT: Record<MatchRule, string> = {
  c3_corner: 'Cover 3 corner: carry #1 in the outside third; if #1 breaks shallow, zone off and find #2 high',
  c3_curl_flat: 'Curl-flat (seam): match #2 vertical to about 12 yd, otherwise the curl-flat zone; a fast #3 to the flat pushes him to chase it',
  c3_seam: 'Seam-flat: match #2 vertical, otherwise play the curl-flat zone',
  c3_hook: 'Hook: carry #3 (or the back to his side) vertical to 15 yd; cut a shallow crosser; otherwise play the hook and read the QB',
  mike_3: 'Mike on #3: the back is his #3; carry a vertical or angle release, cut crossers, otherwise wall the middle',
  q_corner_mod: 'Quarters corner (MOD): man on #1 unless #1 declares shallow, then zone his quarter',
  q_corner_meg: 'Quarters corner (MEG): man on #1 wherever he goes',
  q_safety: 'Quarters safety: #2 decides. #2 vertical: carry him over the top; #2 out/flat/under or blocking: help #1',
  q_apex: 'Quarter-flat apex: own #2\'s low out (and a later wheel); otherwise wall #2\'s vertical for the safety',
  palms_corner: 'Palms corner: trap #2\'s quick out; otherwise play #1 like MOD',
  palms_safety: 'Palms safety: #2 quick out: replace the corner over #1; #2 vertical: carry him; #2 under: help #1',
  cloud_corner: 'Cloud corner (half-side): reroute #1 and take the first threat to the flat',
  sink_corner: 'Sink corner: with no flat threat, sink under #1\'s vertical to about 13 yd; otherwise as the cloud corner',
  c2_hook: 'Halves apex (vertical curl): wall #2\'s vertical to 12 yd and match him up and in; otherwise zone the curl and cut what comes under',
  vertical_hook: 'Vertical hook vs trips: take #3 vertical up the middle between the halves; otherwise play the 3-match Mike job',
  box_out_low: 'Box (vs bunch), low-out: take the first receiver to break out underneath',
  box_in_low: 'Box (vs bunch), low-in: take the first receiver to break in underneath',
  box_out_deep: 'Box (vs bunch), deep-out: take the outermost receiver up the field',
  box_in_deep: 'Box (vs bunch), deep-in: take the innermost receiver up the field',
  area_flat: 'Area (Cover 6 vs trips): quarter-flat nickel takes the outermost underneath (first out by #2/#3)',
  area_hook: 'Area (Cover 6 vs trips): quarter hook takes the innermost (first in), otherwise walls the final #3',
  topper: 'Topper safety: top whichever of #2/#3 goes deep; with both deep, play vision and squeeze',
  banjo_out: 'Banjo (man vs bunch), outside defender: trades #1 and #3 with his partner by release',
  banjo_in: 'Banjo (man vs bunch), inside defender: trades #1 and #3 with his partner by release',
  clue_corner: 'Clue corner (vs bunch/stack): key #2 to #1; if #2 eliminates himself, lock on #1; if #2 climbs, squeeze his seam',
  three_rec_hook: '#3 receiver hook (Cover 9): cut off and carry the final #3 up the seam; if he cancels, zone the hook',
  bonus_hook: 'Bonus hook (Cover 9): overdrop toward #2/#3 to the strength, relate to the final #3, cut what comes under',
  tampa_mike: 'Tampa 2 Mike: run the pipe, carry the inside-most vertical to about 20 yd, otherwise the deep hole',
  poach_safety: 'Poach safety (vs trips): overtake #3\'s vertical; if #3 cancels, zone the quarter and squeeze to X',
  stubbie_safety: 'Stubbie/Book safety vs trips: match #3 up the seam; if #3 cancels, cap #2 up and over; otherwise rob #2\'s in-breaker',
  invert_safety: 'Inverted safety: drops down to the apex and plays it with the apex rules',
  read_hook: 'Read hook (Book/Stubbie midpoint): key #3. Reroute #3 up the seam and hand him to the safety; zone the hook if #3 goes flat',
  mush: 'Mush nickel (Stubbie/Book apex): man on #2 unless he runs shallow or #3 cancels him; then seven-seam-flat',
  rat: 'Rat (low hole): 5-7 yd in the middle; cut crossers and carry them',
  robber: 'Robber: sit in the intermediate middle and rob the in-breaker',
};

const ZONE_NAME: Record<ZoneId, string> = {
  deep_third_s: 'deep third (strong side)', deep_third_w: 'deep third (weak side)', deep_mid: 'deep middle third',
  deep_half_s: 'deep half (strong side)', deep_half_w: 'deep half (weak side)',
  quarter_s_out: 'deep quarter (strong outside)', quarter_s_in: 'deep quarter (strong inside)',
  quarter_w_in: 'deep quarter (weak inside)', quarter_w_out: 'deep quarter (weak outside)',
  flat_s: 'flat (strong side)', flat_w: 'flat (weak side)', curl_flat_s: 'curl-flat (strong side)', curl_flat_w: 'curl-flat (weak side)',
  hook_s: 'hook (strong side)', hook_w: 'hook (weak side)', hook_mid: 'middle hook', tampa_mid: 'Tampa middle (the pipe)',
  robber: 'robber (intermediate middle)', hole: 'low hole', curl_s: 'curl (strong side)', curl_w: 'curl (weak side)',
};

/** A drawn area for a zone: a nominal box around the landmark the engine gives the defender. The engine plays a landmark,
 * not a box; the box is the textbook area, for the eye (the legend says so). [x0, x1, y0, y1] in field yards. */
function zoneArea(zone: ZoneId, c: XY, los: number): [number, number, number, number] {
  const clampY = (lo: number, hi: number): [number, number] => [Math.max(0, lo), Math.min(FIELD_WIDTH, hi)];
  const deep = (h: number): [number, number, number, number] => { const [a, b] = clampY(c[1] - h, c[1] + h); return [r1(c[0] - 3), r1(Math.min(c[0] + 12, 110)), a, b]; };
  switch (zone) {
    case 'deep_third_s': case 'deep_third_w': return deep(FIELD_WIDTH / 6);
    case 'deep_mid': case 'tampa_mid': return deep(FIELD_WIDTH / 6);
    case 'deep_half_s': case 'deep_half_w': return deep(FIELD_WIDTH / 4);
    case 'quarter_s_out': case 'quarter_s_in': case 'quarter_w_in': case 'quarter_w_out': return deep(FIELD_WIDTH / 8);
    case 'flat_s': case 'flat_w': { const [a, b] = clampY(c[1] - 6, c[1] + 6); return [r1(los + 0.5), r1(los + 7.5), a, b]; }
    case 'curl_flat_s': case 'curl_flat_w': { const [a, b] = clampY(c[1] - 7, c[1] + 7); return [r1(c[0] - 4), r1(c[0] + 4), a, b]; }
    default: { const [a, b] = clampY(c[1] - 5.5, c[1] + 5.5); return [r1(c[0] - 3), r1(c[0] + 3), a, b]; }
  }
}

// ---------------------------------------------------------------------------------- the tap
const sheets: ArtSheet[] = [];
const seen = new WeakSet<object>();
let installed = false;

/** Install the read-only tap (idempotent). Sheets are collected in the order plays are simulated. */
export function installPlayArtTap(): void {
  if (installed) return;
  installed = true;
  const proto = PlaySim.prototype as unknown as { tick: () => void };
  const tick = proto.tick;
  proto.tick = function (this: any) {
    if (!seen.has(this)) { seen.add(this); try { const s = sheetOf(this); if (s) sheets.push(s); } catch (e) { sheets.push(null as never); } }
    return tick.call(this);
  };
}
export const takeSheets = (): ArtSheet[] => sheets.splice(0, sheets.length);

function sheetOf(sim: any): ArtSheet | null {
  const call = sim.offCall, dcall = sim.defCall, off = sim.offAlign, los: number = sim.los;
  if (!call || !dcall) return null;
  const slotOf = (ref: string | undefined) => (ref ? (off.numbering[ref] as string | undefined) : undefined);
  const concept = call.kind === 'pass' ? call.pass : call.run;
  const progression = call.pass?.progression?.map((r: string) => `${r}${slotOf(r) ? ` (${slotOf(r)})` : ''}`);
  const offense: ArtSheet['offense'] = {
    kind: call.kind, name: concept?.name ?? call.label, formation: call.formation.name, personnel: call.formation.personnel,
    drop: call.pass?.drop, read: call.pass?.read, progression, fake: !!call.pass?.fake,
    screen: call.pass?.screen ? `${call.pass.screen.tempo} screen to ${call.pass.screen.receiver} (${slotOf(call.pass.screen.receiver) ?? '?'}), linemen release on a count of ${call.pass.screen.count}s` : undefined,
    motion: call.motion ? `${call.motion.kind} motion` : undefined,
  };
  const defense: ArtSheet['defense'] = {
    coverage: dcall.coverage.name, family: dcall.coverage.family, shell: dcall.coverage.shell, front: dcall.front.name, personnel: dcall.personnel,
    pressure: dcall.pressure?.name ?? null, note: dcall.coverage.note, zoneStyle: dcall.zoneStyle ?? 'match',
  };
  const players: ArtSheet['players'] = [];
  for (const a of sim.agents) {
    const job = a.team === 'O' ? offJob(sim, a, call, off, los) : defJob(sim, a, dcall, off, los);
    players.push({ team: a.team, slot: a.slot, pos: xy(a.pos), job });
  }
  return { los, formation: call.formation.id, coverage: dcall.coverage.id, concept: call.kind === 'pass' ? call.pass.id : (call.run?.scheme ?? call.label), offense, defense, players };
}

function offJob(sim: any, a: any, call: any, off: any, los: number): Job | null {
  const b = a.behavior;
  const refOf = off.refOf[a.slot] as string | undefined;
  const routeOf = (agent: any) => {
    const r = ownRoutes.get(agent);
    if (!r) return null;
    // The called route only: the continuation the engine adds past it (ext points) is not part of the call. A leg that
    // runs far downfield is cut at 24 yd past the line for the drawing (the direction is kept).
    const pts = [r.start, ...r.path.filter((q: any) => !q.ext).map((q: any) => q.p)];
    const xmax = los + 24;
    const path: XY[] = [];
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i], prev = pts[i - 1];
      if (prev && q.x > xmax && prev.x < xmax) { const k = (xmax - prev.x) / (q.x - prev.x); path.push(xy({ x: xmax, y: prev.y + (q.y - prev.y) * k })); break; }
      if (q.x > xmax && !prev) { path.push(xy({ x: xmax, y: q.y })); break; }
      path.push(xy(q));
      if (q.x >= xmax) break;
    }
    return { id: r.routeId ?? 'route', path, brk: r.breakIdx !== undefined && r.breakIdx + 1 < path.length ? r.breakIdx + 1 : undefined };
  };
  switch (b.kind) {
    case 'qb-pass': {
      const c = call.pass;
      const order = c.progression.map((r: string) => `${r} ${off.numbering[r] ?? ''}`.trim());
      return { t: 'qb', text: `${c.drop.replace('gun', 'gun ')} drop${c.fake ? ' off a play-action fake' : ''}; reads ${order.join(' → ')}`, drop: c.drop, reads: order };
    }
    case 'qb-handoff': return { t: 'qb', text: `${call.run ? `${call.run.name}: takes the snap, hands to the back` : 'takes the snap'}` };
    case 'route': case 'block-look': {
      const r = routeOf(a);
      if (!r) return null;
      return { t: 'route', route: r.id, path: r.path, brk: r.brk, ref: refOf, text: `${refOf ? `${refOf}: ` : ''}${r.id.replace(/_/g, ' ')} route` };
    }
    case 'pass-pro': {
      const r = routeOf(a);
      const ol = ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot);
      if (ol && call.pass?.screen) return { t: 'protect', live: true, text: `Screen: sells pass protection, releases on the ${call.pass.screen.count}s count to block for the catch (out / up / in by his place on the screen side); the rest stay in` };
      if (ol) return { t: 'protect', live: true, text: 'Pass set: blocks the rusher who shows in his area (the protection rule picks the man live)' };
      if (r) return { t: 'protect', live: true, release: { route: r.id, path: r.path }, text: `Stays in to block first; if nobody comes he releases on a ${r.id.replace(/_/g, ' ')} (decided live)` };
      return { t: 'protect', live: true, text: 'Stays in to block the rusher who shows (picked live)' };
    }
    case 'run-block': {
      const p = b.plan;
      const kind = String(p.kind);
      const target = p.target ? `${p.target.team}${p.target.slot}` : undefined;
      const words = kind === 'pull' ? `Pulls${p.pullRole ? ` (${p.pullRole})` : ''}` : kind;
      return { t: 'runblock', kind, target, drive: xy(p.drive), pull: p.pullPath?.map(xy), live: !p.target, text: `${words}${target ? ` on ${p.target.slot}` : ''}${p.target ? '' : ' (takes the first man to show)'}` };
    }
    case 'mesh': return { t: 'carry', aim: xy(b.aim), text: `Takes the handoff and runs to ${b.aim ? `the ${call.run?.aim ?? ''} aiming point` : 'the aiming point'}` };
    case 'screen-block': return { t: 'block', live: true, text: `Screen block: ${b.job} (${b.job === 'out' ? 'the outermost threat' : b.job === 'up' ? 'the alley' : b.job === 'in' ? 'anyone chasing from inside' : b.job === 'stalk' ? 'the man over him' : 'the next man inside'}); target picked live` };
    case 'downfield-block': return { t: 'block', live: true, text: 'Blocks downfield (picks his man live)' };
    case 'fake': return { t: 'fake', text: 'Sells the run fake through the mesh' };
    default: {
      if (b.constructor?.name === 'PlayActionFake') return { t: 'fake', text: 'Sells the run fake through the mesh, then releases' };
      return null;
    }
  }
}

function defJob(sim: any, d: any, dcall: any, off: any, los: number): Job | null {
  const spot = sim.defAlign.spots[d.slot];
  if (!spot) return null;
  const role = spot.role;
  // A designed run: the defense plays its run fits (gap and technique); the coverage roles apply to a play-action or a throw.
  if (sim.offCall.kind === 'run' && d.runFit) {
    const f = d.runFit;
    const kind: Record<string, string> = { interior: 'interior fit', edge: 'edge: sets the edge', insert: 'insert (fills the gap from depth)', force: 'force: keeps the ball inside him', alley: 'alley: fills outside the box', cutback: 'cutback: backside, stays home' };
    return { t: 'fit', gap: f.gap, to: [r1(los + 0.2), r1(gapY(off, f.gap, f.side))], text: `Run fit: ${f.gap} gap, ${kind[f.kind] ?? f.kind}, ${f.technique}` };
  }
  switch (role.kind) {
    case 'rush': case 'blitz': {
      const fit = d.runFit;
      const gap = role.kind === 'blitz' ? role.gap : (spot.rushGap ?? fit?.gap);
      const sign = role.kind === 'blitz' ? spot.gapSign : (fit?.side ?? spot.gapSign);
      const to: XY = [r1(los + 0.2), r1(gapY(off, gap, sign))];
      return role.kind === 'blitz'
        ? { t: 'blitz', gap, to, text: `Blitz: through the ${gap} gap` }
        : { t: 'rush', gap, to, text: `Pass rush: ${gap} gap` };
    }
    case 'man': {
      const tgt = spot.manTarget as string | undefined;
      if (!tgt) return { t: 'spy', text: 'Robber/spy: reads the QB and the middle' };
      const bits = [`man on ${tgt}${off.refOf[tgt] ? ` (${off.refOf[tgt]})` : ''}`, spot.press ? 'press' : 'off', role.lev ?? 'inside', role.trail ? 'trail' : '', role.overTop ? 'over the top' : ''].filter(Boolean);
      return { t: 'man', target: tgt, press: !!spot.press, lev: role.lev, text: bits.join(' · ') };
    }
    case 'zone': {
      const zone = role.zone as ZoneId;
      const lm = zoneLandmark(zone, off);
      const center = xy(lm);
      const style = role.style ?? (role.zone === 'robber' || role.zone === 'hole' ? 'match' : dcall.zoneStyle ?? 'match');
      const rule = role.rule && style === 'match' ? (role.rule as MatchRule) : undefined;
      return {
        t: 'zone', zone, center, area: zoneArea(zone, center, los), style, rule,
        text: rule ? `${ZONE_NAME[zone]} — pattern-match rule: ${RULE_TEXT[rule]}` : `${ZONE_NAME[zone]}${style === 'spot' ? ' (spot drop)' : ''}`,
      };
    }
    case 'spy': return { t: 'spy', text: 'Spy: shadows the QB' };
  }
  return null;
}

/** Pair each filmed play with its sheet: sheets are in simulation order and the log is a subsequence of them
 * (no-play and kicking plays make none that match), so walk forward to the next sheet with the same line, formation and coverage. */
export function matchSheets(plays: PlayLog[], all: ArtSheet[]): Map<PlayLog, ArtSheet> {
  const out = new Map<PlayLog, ArtSheet>();
  let k = 0;
  for (const p of plays) {
    if (!p.replay || !p.plan) continue;
    for (let j = k; j < all.length; j++) {
      const s = all[j];
      if (s && Math.abs(s.los - p.replay.los) < 0.01 && s.formation === p.plan.formation && s.coverage === (p.plan.coverage) && String(p.plan.concept).startsWith(s.concept.split('+')[0])) {
        out.set(p, s); k = j + 1; break;
      }
    }
  }
  return out;
}

/** Roster-indexed art for one packed play: `jobs[i]` is the job of replay player i (roster order), null for none. */
export function packArt(sheet: ArtSheet, roster: ReadonlyArray<{ team: string; slot: string }>) {
  const jobs = roster.map((r) => sheet.players.find((q) => q.team === r.team && q.slot === r.slot)?.job ?? null);
  return { v: 1, offense: sheet.offense, defense: sheet.defense, jobs };
}
