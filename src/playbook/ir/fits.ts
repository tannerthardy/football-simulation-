/**
 * Run-fit assignment as shared structural rules (step 3a, sidecar; Integration's grammar plan). This is the
 * pre-snap part of `buildRunFits` (src/sim/run-fits.ts), written as one pure function. Its inputs are a call
 * description, the alignment resolved from it, and the observed offense. Its output is each player's job and the gaps
 * left unowned. It reads no sim state. The sim keeps running run-fits.ts as it is: nothing in the sim imports this.
 *
 * Two modes, set by one parameter:
 * - **faithful** (`labelFree: false`): today's rules, including the places that decide by a slot label. It equals
 *   `buildRunFits` across the catalog (test/ir-fits.test.ts).
 * - **label-free** (`labelFree: true`): the same rules. Each label read is replaced by the taught rule, which uses
 *   where the man stands and what his role is:
 *   - **Front gap player:** the front places him on or near the line (within FRONT_DEPTH) and he is not a called
 *     blitzer (a blitzer owns his blitz gap either way), or he rushes from the line. Today: a DE, DT or NT slot.
 *   - **Interior or end, for a line game:** the line players inside the tackles' outside shoulders are interior, and
 *     those outside them are ends. Today: DT and NT, or DE.
 *   - **Insert pool:** an off-ball second-level defender inside the box. That means within BOX_WIDTH of the ball, at
 *     most INSERT_DEPTH past the line, whoever he is, whatever his zone. Today: an LB slot.
 *   - **Alley:** every other off-ball, non-force defender. Today: any slot that is not LB.
 *
 * The rules describe; they never forbid. A gap no one owns is reported (`unowned`), unless the call declares it
 * (`concede`); then it is reported as `conceded`.
 */
import { gapY, isDeepZone, SHOULDER, tackleOf, type DefenseAlignment, type OffenseAlignment } from '../alignment.js';
import type { DefSlot, Gap } from '../types.js';
import type { Vec2 } from '../../core/vec.js';
import type { RunFitJob } from '../../sim/run-fits.js';
import type { DefenseDescription } from './types.js';

/** FIT_BLITZ_SLIDE and GAP_MATCH as the sim reads them (src/sim/run-fits.ts). */
const FIT_BLITZ_SLIDE = process.env.FIT_BLITZ_SLIDE !== '0';
const GAP_MATCH = process.env.GAP_MATCH !== '0';

/** Label-free thresholds:
 * - FRONT_DEPTH: a front player within this many yards of the line is a gap player of the front. It covers a
 *   stand-up rover at 2.6.
 * - BOX_WIDTH: the insert pool's lateral limit from the ball. It is today's backer limit.
 * - INSERT_DEPTH: second-level depth. */
export const FRONT_DEPTH = 3, BOX_WIDTH = 5.5, INSERT_DEPTH = 7;

export interface GapRef { gap: Gap; side: number }
export interface FitResult {
  jobs: Partial<Record<DefSlot, RunFitJob>>;
  /** Gaps A-C on each side that no one owns after the second level is spent, and a side with no force player (D). */
  unowned: GapRef[];
  /** The unowned gaps the call declared as intended concessions. */
  conceded: GapRef[];
}
export interface FitOptions {
  /** Where each man stands, if not on his resolved spot (the sim passes the bodies). */
  pos?: Partial<Record<DefSlot, Vec2>>;
  labelFree?: boolean;
}

const GAP_RANK: Record<Gap, number> = { A: 1, B: 2, C: 3, D: 4 };
const RANK_GAP: Gap[] = ['A', 'A', 'B', 'C', 'D'];
const FRONT_SLOTS = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'];

export function runFitJobs(desc: DefenseDescription, a: DefenseAlignment, off: OffenseAlignment, opt: FitOptions = {}): FitResult {
  const lf = !!opt.labelFree, los = off.los, ballY = off.ballY;
  const call = desc.call;
  const players = desc.players.filter((p) => a.spots[p.who.slot]);
  const slots = players.map((p) => p.who.slot);
  const spot = (s: DefSlot) => a.spots[s]!;
  const pos = (s: DefSlot) => opt.pos?.[s] ?? spot(s).pos;
  const fitOf = new Map(players.map((p) => [p.who.slot, p.fit] as const));
  const dropperSet = new Set(players.filter((p) => p.what.pressure && 'drop' in p.what.pressure).map((p) => p.who.slot));
  const placed = new Set(players.filter((p) => p.where).map((p) => p.who.slot));
  const T = tackleOf(off.line);

  // Label reads and their taught replacements.
  const isFrontPlayer = (s: DefSlot) => (lf ? placed.has(s) && spot(s).role.kind !== 'blitz' && spot(s).pos.x - los < FRONT_DEPTH : FRONT_SLOTS.includes(s));
  const isInterior = (s: DefSlot) => (lf ? Math.abs(pos(s).y - ballY) <= T + SHOULDER : ['DT_S', 'DT_W', 'NT'].includes(s));
  const isEnd = (s: DefSlot) => (lf ? !isInterior(s) : s === 'DE_S' || s === 'DE_W');
  // A Tampa Mike reads run before he runs the pipe: his zone does not take him out of the box; his depth would.
  const inBox = (s: DefSlot) => Math.abs(spot(s).pos.y - ballY) < BOX_WIDTH && spot(s).pos.x - los <= INSERT_DEPTH;
  const isBacker = (s: DefSlot) => (lf ? inBox(s) : s.startsWith('LB'));

  const gameGap = (s: DefSlot, gap: Gap, side: number): GapRef | null => {
    const game = call.dlGame;
    if (!game || game.kind === 'twist') return null;
    const interior = isInterior(s), end = isEnd(s);
    const strong = off.strongSign, toward = game.dir === 'S' ? strong : -strong;
    let step = 0;
    if (game.kind === 'angle' && interior) step = toward;
    else if (game.kind === 'slant' && (interior || end)) step = toward;
    else if (game.kind === 'pinch' && end) step = -Math.sign(side || 1);
    if (!step) return null;
    const u = Math.sign(side || 1) * GAP_RANK[gap];
    let v = u + step; if (v === 0) v = step;
    v = Math.max(-4, Math.min(4, v));
    return { gap: RANK_GAP[Math.abs(v)], side: Math.sign(v) };
  };

  const jobs = new Map<DefSlot, RunFitJob>();
  const policy = call.runPolicy ?? { edge: 'box', linebacker: 'stack' };
  const first = new Set<DefSlot>();
  const claimed = new Set<string>();
  for (const s of slots) {
    const sp = spot(s), override = fitOf.get(s);
    const frontSlot = isFrontPlayer(s);
    const dropper = frontSlot && sp.role.kind === 'zone' && dropperSet.has(s);
    const line = (frontSlot && !dropper) || (sp.pos.x < los + 2 && sp.role.kind === 'rush');
    const gap = sp.role.kind === 'blitz' ? sp.role.gap : sp.gap;
    const side = sp.role.kind === 'blitz' ? (sp.role.side === 'S' ? off.strongSign : -off.strongSign) : sp.gapSign;
    let kind: RunFitJob['kind'] = line || dropper ? (gap === 'C' || gap === 'D' ? 'edge' : 'interior') : isBacker(s) ? 'insert' : 'alley';
    const moved = line && !dropper && sp.role.kind !== 'blitz' ? gameGap(s, gap, side) : null;
    const g = moved?.gap ?? gap, sd = moved?.side ?? side;
    if (moved) kind = g === 'C' || g === 'D' ? 'edge' : 'interior';
    jobs.set(s, { gap: g, side: sd, kind, technique: moved ? 'attack' : override?.technique ?? 'attack', edge: policy.edge, pace: policy.linebacker });
    if (line || sp.role.kind === 'blitz') first.add(s);
    if (line || sp.role.kind === 'blitz' || dropper) claimed.add(`${sd}:${g}`);
    if (dropper && kind === 'edge') jobs.get(s)!.inside = { gap, side, kind: 'edge' };
  }
  if (FIT_BLITZ_SLIDE) {
    const blitzed = new Set(slots.filter((s) => spot(s).role.kind === 'blitz').map((s) => { const j = jobs.get(s)!; return `${j.side}:${j.gap}`; }));
    const order = (['D', 'C', 'B', 'A'] as Gap[]).map((gap) => ({ side: -1, gap })).concat((['A', 'B', 'C', 'D'] as Gap[]).map((gap) => ({ side: 1, gap })));
    const at = (side: number, gap: Gap) => order.findIndex((o) => o.side === side && o.gap === gap);
    for (const s of first) {
      const j = jobs.get(s)!;
      if (spot(s).role.kind === 'blitz' || !blitzed.has(`${j.side}:${j.gap}`)) continue;
      const i = at(j.side, j.gap);
      const open = [order[i - 1], order[i + 1]].filter((o): o is typeof order[number] => !!o
        && !blitzed.has(`${o.side}:${o.gap}`) && !claimed.has(`${o.side}:${o.gap}`));
      const dist = (o: GapRef) => Math.abs(gapY(off, o.gap, o.side) - pos(s).y);
      const to = open.sort((p, q) => dist(p) - dist(q))[0];
      if (!to) { j.technique = 'control'; continue; }
      claimed.add(`${to.side}:${to.gap}`);
      j.gap = to.gap; j.side = to.side;
      j.kind = to.gap === 'C' || to.gap === 'D' ? 'edge' : 'interior';
    }
  }
  const exchange = call.gapExchange;
  const exchangeBacker = exchange && slots.includes(exchange.edge) && slots.includes(exchange.backer) ? exchange.backer : undefined;
  const available = (s: DefSlot) => !first.has(s) && s !== exchangeBacker && jobs.get(s)!.kind !== 'force';
  const deepZone = (s: DefSlot) => { const role = spot(s).role; return role.kind === 'zone' && isDeepZone(role.zone); };
  const outsideSide = (s: DefSlot): number | null => {
    const role = spot(s).role;
    if (role.kind !== 'zone') return null;
    if (role.zone === 'flat_s' || role.zone === 'curl_flat_s') return off.strongSign;
    if (role.zone === 'flat_w' || role.zone === 'curl_flat_w') return -off.strongSign;
    return null;
  };
  const forced = new Set<number>();
  for (const side of [-1, 1]) {
    const designated = slots.filter((s) => available(s) && outsideSide(s) === side);
    const candidates = designated.length ? designated : slots.filter((s) => available(s) && outsideSide(s) === null && (pos(s).y - ballY) * side > 2);
    const priority = (s: DefSlot) => {
      const role = spot(s).role;
      return role.kind === 'zone' ? role.zone.startsWith('flat') ? 0 : role.zone.startsWith('curl_flat') ? 1 : isDeepZone(role.zone) ? 6 : 3 : 7;
    };
    const cost = (s: DefSlot) => priority(s) * 4 + Math.abs(Math.abs(pos(s).y - ballY) - 5.5);
    candidates.sort((p, q) => (designated.length ? priority(p) - priority(q) : 0) || cost(p) - cost(q));
    const force = candidates[0];
    if (force) { const j = jobs.get(force)!; j.kind = 'force'; j.side = side; j.gap = 'D'; forced.add(side); }
    for (const s of first) {
      const j = jobs.get(s)!;
      if (j.side !== side || j.kind !== 'edge') continue;
      if (!force || pos(force).x > los + 8 || (pos(force).y - pos(s).y) * side < .2) j.edge = 'box';
      if (force) j.partner = force;
    }
  }
  const backers = slots.filter((s) => isBacker(s) && !first.has(s)
    && (jobs.get(s)!.kind !== 'force' || outsideSide(s) !== null)
    && Math.abs(spot(s).pos.y - ballY) < BOX_WIDTH)
    .sort((p, q) => Number(jobs.get(p)!.kind === 'force') - Number(jobs.get(q)!.kind === 'force') || pos(p).y - pos(q).y);
  const bubbles = [-1, 1].flatMap((side) => (['A', 'B', 'C'] as Gap[]).filter((gap) => !claimed.has(`${side}:${gap}`)).map((gap) => ({ side, gap })));
  const reach = (s: DefSlot, b: GapRef) => Math.abs(gapY(off, b.gap, b.side) - pos(s).y);
  if (GAP_MATCH) {
    const support = (side: number) => slots.some((s) => jobs.get(s)!.kind === 'alley' && !deepZone(s) && (pos(s).y - ballY) * side > 0);
    const open = (b: GapRef) => (support(b.side) ? 1 : 2) + (b.gap === 'A' ? .5 : 0);
    let best: { cost: number; dist: number; pick: (GapRef | undefined)[] } | null = null;
    const pick: (GapRef | undefined)[] = [];
    const search = (i: number, used: Set<number>) => {
      if (i === backers.length) {
        if (backers.some((s, k) => jobs.get(s)!.kind !== 'force' && !pick[k] && used.size < bubbles.length)) return;
        const c = bubbles.reduce((t, b, k) => (used.has(k) ? t : t + open(b)), 0);
        const dist = backers.reduce((t, s, k) => t + (pick[k] ? reach(s, pick[k]!) : 0), 0);
        if (!best || c < best.cost - 1e-9 || (Math.abs(c - best.cost) < 1e-9 && dist < best.dist)) best = { cost: c, dist, pick: [...pick] };
        return;
      }
      const job = jobs.get(backers[i])!;
      pick[i] = undefined; search(i + 1, used);
      bubbles.forEach((b, k) => {
        if (used.has(k) || (job.kind === 'force' && b.side !== job.side)) return;
        pick[i] = b; used.add(k); search(i + 1, used); used.delete(k);
      });
      pick[i] = undefined;
    };
    search(0, new Set());
    const chosen = (best as { pick: (GapRef | undefined)[] } | null)?.pick;
    backers.forEach((s, k) => {
      const bubble = chosen?.[k], job = jobs.get(s)!;
      if (!bubble) return;
      bubbles.splice(bubbles.indexOf(bubble as typeof bubbles[number]), 1);
      if (job.kind === 'force') job.inside = bubble;
      else Object.assign(job, bubble);
    });
  } else for (const s of backers) {
    const job = jobs.get(s)!;
    const eligible = job.kind === 'force' ? bubbles.filter((b) => b.side === job.side) : bubbles;
    eligible.sort((p, q) => reach(s, p) - reach(s, q));
    const bubble = eligible[0];
    if (bubble) {
      bubbles.splice(bubbles.indexOf(bubble), 1);
      if (job.kind === 'force') job.inside = bubble;
      else Object.assign(job, bubble);
    }
  }
  if (exchange && slots.includes(exchange.edge) && slots.includes(exchange.backer)) {
    const end = exchange.edge, backer = exchange.backer;
    if (!first.has(backer) && jobs.get(backer)?.kind !== 'force') {
      const e = jobs.get(end)!, b = jobs.get(backer)!;
      b.gap = e.gap; b.side = e.side; b.kind = 'cutback'; b.partner = end;
      e.gap = 'B'; e.kind = 'interior'; e.partner = backer;
    }
  }
  // The report (not the jobs): with no attached end on a side the last gap is C, and a line player claiming D there (a
  // wide technique outside the tackle) owns it. run-fits.ts still offers that C as a bubble to the second level.
  const te = (side: number) => (side === off.strongSign ? off.hasTE.S : off.hasTE.W);
  const unowned: GapRef[] = [...bubbles.filter((b) => !(b.gap === 'C' && !te(b.side) && claimed.has(`${b.side}:D`))).map((b) => ({ gap: b.gap, side: b.side })),
    ...[-1, 1].filter((side) => !forced.has(side)).map((side) => ({ gap: 'D' as Gap, side }))];
  const declared = (g: GapRef) => (desc.concede ?? []).some((c) => c.gap === g.gap && (c.side === 'S' ? off.strongSign : -off.strongSign) === g.side);
  return { jobs: Object.fromEntries(jobs), unowned: unowned.filter((g) => !declared(g)), conceded: unowned.filter(declared) };
}
