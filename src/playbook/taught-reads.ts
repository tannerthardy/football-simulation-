/** TAUGHT_ORDER (experimental, off; Integration, 2026-11-18): each pass concept's read as it is taught, by receiver
 * role (S1..S3 strong #1-#3 outside-in, W1/W2 weak, B the back), the one source for the order the quarterback reads.
 * Off, the call's hand-written `progression` and the compiled plan's order disagreed on 83 of 160 concept-formation
 * pairs (the first read on 69): mesh read the backside go where the sit is taught, y_cross and four_verts read clear-outs.
 * On, the installed plan reads these refs in this order (an installed key's pair leads, high then low, as one look; a
 * ref the formation does not field drops out; a route not listed is not a read: a clear-out the quarterback does not
 * look at) and the call's progression is this list. A back listed before the last read runs a designed route that is
 * read in turn (pa_flood's flat, trips_sail's out under the sail), not the outlet. Sources: research table of 2026-11-18 (URLs and quotes, confidence)
 * in docs/reviews/2026-11-18-taught-reads.md; the shortest form is beside each row. */
import type { ReceiverRef } from './types.js';

export const TAUGHT_ORDER = process.env.TAUGHT_ORDER === '1';

export const TAUGHT_READS: Record<string, ReceiverRef[]> = {
  // Key the flat defender, slant / flat; the #3 hook; the backside (Scribd QB Reads; USA Football, Dragon).
  slant_flat: ['S1', 'S2', 'S3', 'W1', 'W2'],
  // Key the flat defender, stick / flat; the backside; the back (Throw Deep, Stick: the go is a pre-snap look only).
  stick: ['S2', 'S3', 'W1', 'W2', 'B'],
  // The flat defender, out / hitch; the seam in the void; the backside (Smart Football, BYU 64; Throw Deep).
  quick_outs: ['S1', 'S2', 'S3', 'W1', 'W2'],
  // Outside to inside on the chosen side (Win With The Pass, All Hitch).
  hitches: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // High-low the corner, hitch / corner; the hook; the backside; the back (Throw Deep; Glazier, Smash).
  smash: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // Key the flat defender, curl / flat, then the back: "No. 1 receiver to No. 2 receiver to running back" (Hewitt, USA
  // Football; USA Football, reads); the hook; the backside.
  curl_flat: ['S1', 'S2', 'B', 'S3', 'W1', 'W2'],
  // Corner, then the crossers, the sit, the back's swing; the backside go clears (Holgorsen / Leach triangle).
  mesh: ['S1', 'S2', 'W2', 'S3', 'B'],
  // The seams off the safety's cap, the read seam, then the outside goes; the back (Coach Hoover; Throw Deep).
  four_verts: ['S2', 'W2', 'S3', 'S1', 'W1', 'B'],
  // Peek the go, high-low the flat defender out / flat, the backside throwback, the back (Throw Deep; Breakdown Sports).
  flood: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // The seam on the safety, the dig to the shallow, the backside hook, the back (Coach Kou; Throw Deep).
  dagger: ['S2', 'S1', 'S3', 'W2', 'B'],
  // The hook linebacker, dig / shallow; the go; the back last (Smart Football, Drive).
  drive: ['S2', 'W2', 'S1', 'B'],
  // The post, the deep cross, the flat, the hook, the back (Throw Deep, Y-Cross).
  y_cross: ['W1', 'S2', 'S3', 'W2', 'B'],
  // Peek the seam, the in to the dig off the apex (short to deep), the backside hook, the back (Smart Football, Levels).
  levels: ['S3', 'S2', 'S1', 'W2', 'B'],
  // The comeback, the dig, the hook, the backside, the back (low: Smart Football, Drive's comeback key).
  comebacks: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // High-low the safety, post / dig; the backside dig; the hook (Throw Deep, Yankee).
  pa_post_dig: ['S1', 'S2', 'W1', 'W2'],
  // High to low: the go, the deep out, the flat, then the over and the drag (Bowen; Breakdown Sports).
  pa_flood: ['S1', 'S2', 'S3', 'B', 'W1', 'W2'],
  // The post the middle safety leaves, the go, the dig under (Throw Deep, double post; USA Football, Yankee).
  pa_shot: ['S2', 'W1', 'S1', 'W2'],
  // Off the apex, inside-out: the slants, the flat, the backside (Coach Hoover, Double Slant).
  double_slants: ['S2', 'S1', 'S3', 'W2'],
  // The fade's hole shot, then the flat defender, flat / hitch; the backside; the back (from Tare: Bowen).
  fade_flat: ['S1', 'S2', 'S3', 'W1', 'B'],
  // The hitch, the post, the flat, the backside, the back (from hitch-seam: Win With The Pass; low).
  hitch_post: ['S1', 'S2', 'S3', 'W2', 'B'],
  // High-low the flat defender, out / quick out; the hitch; the backside; the back (from sail; low).
  double_outs: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // The flat defender, quick out / hitch; the outside hitch; the backside; the back (from stick; low-medium).
  hitch_out: ['S2', 'S3', 'S1', 'W1', 'W2', 'B'],
  // The apex, slant / hitch; the backside seam and slant (no source: reasoning; the go clears).
  seam_slant: ['S2', 'S3', 'W2', 'W1'],
  // The cross over the linebackers, the curl-flat outlet, the drag, the back (Throw Deep).
  hitch_cross: ['S2', 'S1', 'S3', 'W2', 'B'],
  // High-low the free safety, post / cross; the hitch; the backside hitch (from Yankee: USA Football).
  post_cross: ['S1', 'S2', 'S3', 'W2'],
  // High-low corner / quick out; the hitch; the backside; the back (from Flat-7: Bowen).
  sail_corner: ['S1', 'S2', 'S3', 'W1', 'B'],
  // Key the flat defender, corner / flat; the hitch; the backside; the back (Bowen, Flat-7; Glazier).
  corner_flat: ['S1', 'S2', 'S3', 'W1', 'W2', 'B'],
  // 3x1 stick: flat / stick off the flat defender, the outside hitch, the backside go, the back (Throw Deep, Stick).
  trips_stick: ['S3', 'S2', 'S1', 'W1', 'B'],
  // From flood: peek the go, the out over the back's out, the hitch, the backside (Throw Deep; Breakdown Sports).
  trips_sail: ['S1', 'S2', 'B', 'S3', 'W1', 'W2'],
  // Hitch-seam: the hitch, the seam off the near safety, the hitch, the backside seam, the back (Win With The Pass).
  seam_hitch: ['S1', 'S2', 'S3', 'W2', 'B'],
  // From flood: the go, the out over the quick out, the backside (Throw Deep).
  trips_outs: ['S1', 'S2', 'S3', 'W1', 'W2'],
  // The seam off the cap, the go, the hitch under, the backside (from four verticals and hitch-seam; low-medium).
  verts_hitch: ['S2', 'S1', 'S3', 'W2', 'W1', 'B'],
};

/** The peek: a taught first look that is a glance at one vertical against a favourable picture ("peek the go", "peek
 * the seam"), not a place in the rhythm. It is the plan's alert (read on a glance before the progression), out of the
 * order; the call's progression still lists it first. Off this table, a peek took the first rhythm place and was
 * almost never thrown (staged: flood's first-read share .38 -> .09, trips_outs .68 -> .07, the ball 0.3 s later). */
export const TAUGHT_PEEK: Record<string, ReceiverRef> = {
  flood: 'S1', trips_sail: 'S1', trips_outs: 'S1', pa_flood: 'S1', fade_flat: 'S1', levels: 'S3', seam_slant: 'S1',
};

/** The taught one-look pair: a high-low or inside-out read on one defender ("high-low the flat defender", "the seam
 * off the near safety, else the hitch"), read as one look and so one place in the rhythm, where no key is installed
 * for it. Off this table the pair's second route waited a full step behind the first (staged: 8 more sacks in 965
 * dropbacks on seam_hitch, post_cross, trips_outs and seam_slant, each with the pair's second route on time). Sources
 * per row in docs/reviews/2026-11-18-taught-reads.md. */
export const TAUGHT_LOOK: Record<string, ReceiverRef[]> = {
  stick: ['S2', 'S3'], hitch_out: ['S2', 'S3'], trips_stick: ['S3', 'S2'], flood: ['S2', 'S3'], trips_outs: ['S2', 'S3'],
  trips_sail: ['S2', 'B'], dagger: ['S1', 'S3'], hitch_cross: ['S1', 'S3'], post_cross: ['S1', 'S2'],
  seam_slant: ['S2', 'S3'], seam_hitch: ['S2', 'S3'], comebacks: ['S1', 'S2'], pa_shot: ['S2', 'W1'],
  quick_outs: ['S1', 'S2'], fade_flat: ['S2', 'S3'],
};
