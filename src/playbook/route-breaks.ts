/**
 * DECLARED_BREAK (experimental, off; docs/reviews/2026-11-14-declared-break.md): each route's break, as installed.
 *
 * The route's fact is where his break is: an index into its points (the vertex he plants or rolls at), or, for a route
 * with no vertex, the declare rule it has always had (a crosser or a back's release once he has moved 5 yd, a vertical
 * at 12 yd, a now screen at the snap). The read compiler times "reached" on its own sample of the installed route,
 * never on a live play.
 *
 * The passer's lead is a separate thing, per throw family:
 * - `onBreak`: thrown on the break (the hitch, out, comeback, curl, dig, slant, the sink-and-sit routes).
 * - `seenOpen`: thrown to a man seen open (crossers, verticals, screens, the backs' releases); his readiness is his
 *   picture of separation, not a time.
 * `anchorLead` is the team-level lead the plan orders and rhythms reads with. The first build sets it to reproduce
 * today's windows, the detector's systematic lead on plants (it timed a plant from where the bend begins: hitch +0.2,
 * out / hook / comeback / stick / deep out +0.3, curl +0.4), so nothing moves by construction except the misreads. It is
 * labelled the anchor: the quarterback's own lead is `leadFor(passer, throwFamily, route)` in the QB lane, called when a
 * read is checked, and the throwing motion (the windup) is theirs, added on their side.
 */
export type ThrowFamily = 'onBreak' | 'seenOpen';
export interface BreakDecl {
  /** The break vertex (an index into the route's points), or the declare rule for a route with none. */
  readonly at: number | 'moved' | 'vertical' | 'now';
  readonly throwFamily: ThrowFamily;
  /** The plan's lead before the break, s (the anchor; see above). */
  readonly anchorLead: number;
}

const cut = (at: number, anchorLead: number): BreakDecl => ({ at, throwFamily: 'onBreak', anchorLead });
const open = (at: BreakDecl['at']): BreakDecl => ({ at, throwFamily: 'seenOpen', anchorLead: 0 });

export const BREAK_DECL: Readonly<Record<string, BreakDecl>> = {
  // Thrown on the break: the plant (or roll) at the route's first point.
  hitch: cut(0, 0.2), quick_hitch: cut(0, 0.2), curl: cut(0, 0.4), comeback: cut(0, 0.3), stick: cut(0, 0.3), hook: cut(0, 0.3),
  out: cut(0, 0.3), deep_out: cut(0, 0.3), quick_out: cut(0, 0), dig: cut(0, 0), short_in: cut(0, 0), slant: cut(0, 0),
  // The deep breaks are thrown on the break as well (the corner and post over a high-low), with no lead today.
  corner: cut(0, 0), post: cut(0, 0), seam_read: cut(0, 0),
  // Seen open: crossers once across, verticals at depth, the back's releases once moved; the wheel at its turn up.
  shallow: open('moved'), shallow_high: open('moved'), mesh_under: open('moved'), cross: open('moved'),
  go: open('vertical'), fade: open('vertical'), seam: open('vertical'),
  // OFF_VARIETY double moves: thrown when seen open deep, past the fake.
  sluggo: open('vertical'), out_up: open('vertical'), stutter_go: open('vertical'), wheel: open(1),
  flat: open('moved'), arrow: open('moved'), swing: open('moved'), back_flat: open('moved'),
  angle: cut(0, 0.3), back_out: open(1), checkdown: open(1),
  // Screens: the turn back to the catch point; the now screen is turned to the ball at the snap.
  bubble: open(1), tunnel: open(1), slip_screen: open(1), te_screen: open(1), now_screen: open('now'),
};
