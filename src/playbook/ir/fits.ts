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
 *   - **Insert pool, by job (step 3b, Integration's ruling R1):** a second-level defender (at most INSERT_DEPTH past
 *     the line) whose coverage job is an underneath zone, wherever that zone aligns him (an apex walked out to
 *     #2 still folds), or who is in man on an attached end or a back. Today: an LB slot within 5.5 yd of the ball.
 *     A man defender on a detached receiver is out of the interior fit: he plays the alley.
 *   - **Low safety:** an underneath-zone defender deeper than INSERT_DEPTH (a robber). He takes an interior gap only
 *     when the second level leaves one open.
 *   - **Inside-out:** in label-free mode, the second level takes the leftover gaps in order (no two fits cross), so
 *     widening a man does not trade his gap with another's.
 *   - **Alley:** every other off-ball, non-force defender. Today: any slot that is not LB.
 *
 * Flow (ruling R2): each job also carries its flow-relative form (`flow`). A gap that no one owns statically but a
 * flow rule closes is reported in `byFlow`, not in `unowned`. That covers C on an attached end's side squeezed by the
 * man on or outside the end, and an A gap shared by a lag nose (backside) and the playside insert backer.
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
 * - BOX_WIDTH: today's backer limit from the ball (faithful mode only; label-free pools by job).
 * - INSERT_DEPTH: second-level depth. */
export const FRONT_DEPTH = 3, BOX_WIDTH = 5.5, INSERT_DEPTH = 7;

export interface GapRef { gap: Gap; side: number }
export interface FitResult {
  jobs: Partial<Record<DefSlot, RunFitJob>>;
  /** Gaps A-C on each side that no one owns after the second level is spent, and a side with no force player (D). */
  unowned: GapRef[];
  /** The unowned gaps the call declared as intended concessions. */
  conceded: GapRef[];
  /** Gaps no one owns before the snap that a flow rule closes after it, and the rule (R2). */
  byFlow: Array<GapRef & { rule: string }>;
  /** Each job in flow-relative form, as the sim (or the taught rule) plays it after the snap. */
  flow: Partial<Record<DefSlot, string>>;
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
  // R1: the insert pool by job. A man defender on a detached receiver goes where the receiver goes.
  const underneath = (s: DefSlot) => { const r = spot(s).role; return r.kind === 'zone' && !isDeepZone(r.zone); };
  const secondLevel = (s: DefSlot) => spot(s).pos.x - los <= INSERT_DEPTH;
  const manInside = (s: DefSlot) => { const sp = spot(s); return sp.role.kind === 'man' && !!sp.manTarget
    && (off.spots[sp.manTarget]?.inline || off.spots[sp.manTarget]?.backfield); };
  // A deep-zone defender at second-level depth inside the core is a Tampa Mike: he reads run before the pipe.
  const surface = Math.max(Math.abs(off.coreEdge.S - ballY), Math.abs(off.coreEdge.W - ballY));
  const middleDeep = (s: DefSlot) => spot(s).role.kind === 'zone' && !underneath(s) && Math.abs(spot(s).pos.y - ballY) <= surface + 2;
  const byJob = (s: DefSlot) => secondLevel(s) && (underneath(s) || middleDeep(s) || manInside(s) || spot(s).role.kind === 'spy');
  const lowSafety = (s: DefSlot) => !secondLevel(s) && underneath(s);
  // A second-level blitzer attacks his own gap (he is a first-level player either way): an inserter, as today.
  const isBacker = (s: DefSlot) => (lf ? byJob(s) || (secondLevel(s) && spot(s).role.kind === 'blitz') : s.startsWith('LB'));
  void inBox;

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
  // Step 3c ruling 2: a force aligned on or outside #1 (a cloud corner) is force and contain only; fold belongs to
  // second-level players aligned from the apex inward. With no #1 on his side, wider than an apex is outside.
  const outsideNo1 = (s: DefSlot, side: number) => {
    const n1 = off.numbering[side === off.strongSign ? 'S1' : 'W1'], w = Math.abs(pos(s).y - ballY);
    return n1 ? w >= Math.abs(off.spots[n1].pos.y - ballY) - 1 : w > 8;
  };
  const backers = slots.filter((s) => isBacker(s) && !first.has(s)
    && (jobs.get(s)!.kind !== 'force' || outsideSide(s) !== null)
    && !(lf && jobs.get(s)!.kind === 'force' && outsideNo1(s, jobs.get(s)!.side))
    && (lf || Math.abs(spot(s).pos.y - ballY) < BOX_WIDTH))
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
        // Label-free: inside-out, no two fits cross (a man outside another takes the gap outside his).
        if (lf) for (let k = 0; k < backers.length; k++) for (let l = k + 1; l < backers.length; l++) {
          const pk = pick[k], pl = pick[l];
          if (pk && pl && (pos(backers[k]).y - pos(backers[l]).y) * (gapY(off, pk.gap, pk.side) - gapY(off, pl.gap, pl.side)) < 0) return;
        }
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
  // R1: a gap the second level leaves goes to a low safety (nearest first).
  if (lf) for (const s of slots.filter((x) => lowSafety(x) && !first.has(x) && jobs.get(x)!.kind === 'alley')
    .sort((p, q) => Math.min(...bubbles.map((b) => reach(p, b))) - Math.min(...bubbles.map((b) => reach(q, b))))) {
    if (!bubbles.length) break;
    const b = [...bubbles].sort((p, q) => reach(s, p) - reach(s, q))[0];
    bubbles.splice(bubbles.indexOf(b), 1);
    Object.assign(jobs.get(s)!, { gap: b.gap, side: b.side, kind: 'insert' as const });
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
  // R2, the flow rules that close a gap no one owns before the snap:
  // - squeeze: C on an attached end's side, with the man on or outside the end (a line player claiming D) squeezing it;
  // - lag: an A gap whose partner A is owned by a lag nose, while an insert backer is left to take the playside A.
  const all = [...jobs.values()];
  const lagNose = all.some((j) => j.technique === 'lag' && j.gap === 'A' && j.kind === 'interior');
  const inserts = all.some((j) => j.kind === 'insert');
  const flowRule = (g: GapRef): string | null => {
    if (g.gap === 'C' && te(g.side) && claimed.has(`${g.side}:D`)) return 'squeeze: the man on or outside the end squeezes C';
    if (g.gap === 'A' && lagNose && inserts) return 'lag: the nose takes the backside A, the playside backer the other';
    return null;
  };
  const byFlow = unowned.filter((g) => !declared(g) && flowRule(g)).map((g) => ({ ...g, rule: flowRule(g)! }));
  const flow: Partial<Record<DefSlot, string>> = {};
  const nm = (gap: Gap, side: number) => `${gap}${side === off.strongSign ? ' strong' : ' weak'}`;
  for (const [s, j] of jobs) {
    flow[s] = j.technique === 'lag' ? 'A gap away from flow (lag)'
      : j.kind === 'force' && j.inside ? `force if the run is outside him; else fold to ${nm(j.inside.gap, j.inside.side)}`
      : j.kind === 'force' ? `force ${j.side === off.strongSign ? 'strong' : 'weak'}`
      : j.kind === 'insert' && spot(s).role.kind === 'man' ? `${nm(j.gap, j.side)} off his man's block: if his man blocks he fits the gap the block opens to him; if he releases he covers`
      : j.kind === 'insert' ? `${nm(j.gap, j.side)}, then flows inside-out with the ball`
      : j.kind === 'cutback' ? `${nm(j.gap, j.side)} cutback (holds backside)`
      : j.kind === 'alley' ? 'alley: fits outside-in, last level'
      : `${nm(j.gap, j.side)}${j.technique === 'control' ? ' (control, two-way)' : ''}`;
  }
  return { jobs: Object.fromEntries(jobs), unowned: unowned.filter((g) => !declared(g) && !flowRule(g)), conceded: unowned.filter(declared), byFlow, flow };
}
