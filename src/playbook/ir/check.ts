/**
 * The call description's second reader (step 2a; Integration's grammar plan): legality and accounting. It reads only a
 * description and the alignment resolved from it, never a preset name, and never feeds a play's outcome.
 * - Errors: a real official would flag it, or it cannot line up, or today's sim throws on it.
 * - Warnings: legal but unsound, a coach's chalkboard check (typed and specific, not a verdict on who wins).
 * Body size: the smallest body radius in the player model (src/players/physical.ts: radius = clamp(0.24 + (weight -
 * 180) / 1100, 0.22, 0.42) yd), so two bodies overlap when their centres are under 0.44 yd apart, and a defender is in
 * the neutral zone when his centre is under 0.22 yd past the line.
 * Not checked: protection (the description carries no protection data yet).
 */
import { isDeepZone, type DefenseAlignment, type OffenseAlignment } from '../alignment.js';
import type { DefSlot, ReceiverRef } from '../types.js';
import { runFitJobs, type GapRef } from './fits.js';
import type { OffenseSnapDescription } from './offense.js';
import type { DefenseDescription, RouteJob } from './types.js';

export const MIN_BODY_RADIUS = 0.22;
export interface Issue { level: 'error' | 'warning' | 'note'; kind: string; detail: string }
const err = (kind: string, detail: string): Issue => ({ level: 'error', kind, detail });
const warn = (kind: string, detail: string): Issue => ({ level: 'warning', kind, detail });

function overlaps(spots: Array<{ slot: string; pos: { x: number; y: number } }>): Issue[] {
  const out: Issue[] = [];
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
    const a = spots[i], b = spots[j], d = Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
    if (d < 2 * MIN_BODY_RADIUS) out.push(err('overlap', `${a.slot} and ${b.slot} ${d.toFixed(2)} yd apart`));
  }
  return out;
}

/** The offense: count, the line, eligible ends, covered receivers given a route, motion, bodies, the call's required
 * players. `routes`: the pass's routes by number (block / none: not a downfield route). */
export function checkOffense(d: OffenseSnapDescription, a: OffenseAlignment, routes: RouteJob[] = []): Issue[] {
  const out: Issue[] = [];
  const n = d.linemen.length + 1 + d.players.length;
  if (n !== 11) out.push(err('offense-count', `${n} men`));
  const eligible = new Map<string, boolean>([...d.linemen.map((l) => [l.who.slot, l.who.eligible ?? false] as const),
    ...d.players.map((p) => [p.who.slot, p.who.eligible ?? true] as const), ['QB', false]]);
  const on = Object.values(a.spots).filter((s) => s.onLine).sort((p, q) => p.pos.y - q.pos.y);
  if (on.length < 7) out.push(err('line-count', `${on.length} on the line`));
  if (n - on.length > 4) out.push(err('backs-count', `${n - on.length} off the line`));
  if (on.length) for (const end of [on[0], on[on.length - 1]]) if (!eligible.get(end.slot)) out.push(err('end-ineligible', `${end.slot} is an end man`));
  const covered = on.slice(1, -1).filter((s) => eligible.get(s.slot));
  for (const s of covered) {
    const ref = a.refOf[s.slot as keyof typeof a.refOf], job = ref && routes.find((r) => r.who === ref && r.route.id !== 'block');
    if (job) out.push(err('covered-route', `${s.slot} (${ref}) is covered on the line and runs ${job.route.id}`));
  }
  const moving = d.motion ?? [];
  if (moving.length > 1) out.push(err('motion-count', `${moving.length} in motion`));
  for (const m of moving) if (m.toward === 'line') out.push(err('motion-forward', `${m.slot} moving toward the line`));
  out.push(...overlaps(Object.values(a.spots)));
  for (const r of d.requires ?? []) {
    if (r.kind === 'receiver' && !a.numbering[r.ref]) out.push(err('structural:receiver', `no ${r.ref} in the formation (assign.ts:717)`));
    if (r.kind === 'slicer') {
      // blocking.ts:999-1001: a TE or FB body, or a second back, not attached, off the ball, within the core.
      const by = a.ballY, surface = Math.max(Math.abs(a.coreEdge.S - by), Math.abs(a.coreEdge.W - by));
      const ok = d.players.some((p) => {
        const s = a.spots[p.who.slot];
        return s && (p.who.position === 'TE' || p.who.position === 'FB' || a.numbering.B2 === p.who.slot)
          && !s.inline && Math.abs(s.pos.y - by) < Math.max(6, surface + 2) && s.pos.x < a.los - 0.9;
      });
      if (!ok) out.push(err('structural:slicer', 'split zone with no core off-ball TE or FB, or second back (blocking.ts:1001)'));
    }
  }
  return out;
}

/** The defense: count, alignment, the neutral zone, bodies, the call's structure; then the chalkboard warnings. */
export function checkDefense(d: DefenseDescription, a: DefenseAlignment, off: OffenseAlignment, opt: { labelFree?: boolean } = {}): Issue[] {
  const out: Issue[] = [];
  if (d.players.length !== 11) out.push(err('defense-count', `${d.players.length} men`));
  const los = off.los, spots = Object.values(a.spots).filter((s): s is NonNullable<typeof s> => !!s);
  for (const p of d.players) if (!a.spots[p.who.slot]) out.push(err('unaligned', `${p.who.slot} has no spot (playsim.ts:422)`));
  for (const s of spots) if (s.pos.x - los < MIN_BODY_RADIUS) out.push(err('neutral-zone', `${s.slot} ${(s.pos.x - los).toFixed(2)} yd past the line`));
  out.push(...overlaps(spots));
  const present = new Set(d.players.map((p) => p.who.slot));
  const stem = d.call.frontStem;
  if (stem && !stem.from.personnel.includes(d.personnel)) out.push(err('structural:stem', 'stem front without this personnel (playsim.ts:531)'));
  for (const [what, t] of [['stem', stem?.secondsBeforeSnap], ['creep', d.call.creep?.secondsBeforeSnap]] as const)
    if (t !== undefined && (!Number.isFinite(t) || t <= 0 || t > 3)) out.push(err('structural:presnap-time', `${what} starts ${t} s before the snap (playsim.ts:529)`));
  const creep = d.call.creep;
  if (creep && !present.has(creep.slot)) out.push(err('structural:creep', `creep ${creep.slot} not on the field (playsim.ts:543)`));
  else if (creep && a.spots[creep.slot]?.role.kind !== 'blitz') out.push(err('structural:creep', `creep ${creep.slot} is not a blitzer (playsim.ts:545)`));

  // Gaps from run-fit assignment (step 3a, ir/fits.ts): a gap no one owns after the front, the blitzers and the second
  // level are spent, or a side with no force player. A gap the call declares as a concession is a note, not a warning.
  const fit = runFitJobs(d, a, off, { labelFree: opt.labelFree });
  const name = (g: GapRef) => `${g.gap} gap ${g.side === off.strongSign ? 'strong' : 'weak'} side`;
  for (const g of fit.unowned) out.push(warn('gap-unowned', name(g)));
  for (const g of fit.conceded) out.push({ level: 'note', kind: 'gap-conceded', detail: name(g) });
  // Receivers accounted for: in man, each eligible receiver is someone's man or a spare underneath player is left;
  // in zone, enough coverage players for the eligible receivers.
  const refs = (['S1', 'S2', 'S3', 'S4', 'W1', 'W2', 'W3', 'W4', 'B', 'B2'] as ReceiverRef[]).filter((r) => off.numbering[r]);
  const cover = spots.filter((s) => s.role.kind === 'zone' || s.role.kind === 'man');
  if (d.coverage.man) {
    const marked = new Set(spots.map((s) => s.manTarget).filter(Boolean));
    const spare = spots.filter((s) => s.role.kind === 'zone' && !isDeepZone(s.role.zone)).length;
    const free = refs.filter((r) => !marked.has(off.numbering[r]));
    if (free.length > spare) out.push(warn('receiver-unaccounted', `${free.join(', ')} with no man and ${spare} spare underneath`));
  } else if (cover.length < refs.length) out.push(warn('receiver-unaccounted', `${refs.length} eligible receivers against ${cover.length} in coverage`));
  if (d.coverage.shell !== 'zero' && !spots.some((s) => (s.role.kind === 'zone' && isDeepZone(s.role.zone)) || (s.role.kind === 'man' && s.role.overTop)))
    out.push(warn('no-deep', `shell ${d.coverage.shell} with nobody deep`));
  const offP = d.pressure?.offField;
  for (const slot of Object.keys({ ...(offP?.blitzers ?? {}), ...(offP?.droppers ?? {}) }) as DefSlot[])
    out.push(warn('pressure-off-field', `${slot} has a pressure job and is not on the field`));
  for (const slot of Object.keys(d.front.offField.slots) as DefSlot[])
    out.push(warn('front-spot-ignored', `the front places ${slot}, who is not on the field`));
  return out;
}
