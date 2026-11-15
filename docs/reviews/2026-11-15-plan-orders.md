# Declared read orders for the near-threshold concepts (PLAN_ROLES, 2026-11-15)

Rules + Coaching, for Integration. Follows the audit in `2026-11-14-plan-roles.md`, which found 14 geometric concepts
within a yard of a compiler threshold. The ones whose installed plan flips between the grounds are done first.

**What the sources teach.** Coaches mostly teach these concepts as a decision on one defender, not as serial looks:
two routes put one defender in conflict, and his movement picks the throw. Wilhite (Learning to teach Y-stick) says
reading such a play as one route then the other "is real difficult". So where the source teaches a one-defender
high-low, the declaration is a key on that defender (as PLAN_KEYS does), not a serial order. "Analogue" marks a
concept with no source of its own, declared from the nearest taught concept so it is easy to revisit.

All of it is behind `PLAN_ROLES` (off); `src/playbook/read-compiler/runtime.ts` holds `ROLE_KEYS`, `ROLE_ORDER` and
`BACK_AFTER_KEY`. A key's routes are resolved by the routes the concept installs (PLAN_ROLES), so a formation that does
not run the pair falls back to the compiler's plan.

## Declared

| concept | declared | was (gun doubles) | grounds |
|---|---|---|---|
| hitch_cross | key on the hook (Mike): the shallow (W2) low, the cross (S2) high | pure S2, S1, W2, W1 | sourced: Drive |
| pa_shot | key on the free safety: the post high, the dig (W2) low | key on the deep defender over the vertical | sourced: Yankee |
| curl_flat | the compiler's key on the play-side curl-flat defender, then the back, then the backside | key, the backside, back last | sourced |
| double_outs | key on the curl-flat defender: the quick out (S2) low, the out (S1) high | pure S1, S2, W2, W1 | analogue: go-out |
| seam_slant | key on the hook inside #2: the hitch (S3) low, the slant (S2) high (trips; doubles has no #3) | pure | analogue: double slants |
| comebacks | pure S1, W1, S2 (the authored progression) | vertical peek S2, S1 | analogue: no order sourced |

Agreeing already, so unchanged:
- **trips_stick** (S3, S2 on the apex): Throw Deep: "identify the flat defender and throw off of his movement
  post-snap". Ross on Walsh: the first read is the flat route, then the stick.
- **sail_corner** (S1, S2, a corner-over-out high-low read like smash): Throw Deep's smash read.

## Sources, per concept

- **hitch_cross (Drive).**
  - Stanford Daily film study, Drive: if the key "drops back to cover the dig, the quarterback should look to the
    drag"; if he comes up, the dig opens.
  - Bullock (Commanders' Drive): the shallow "is the primary option".
  - Throw Deep, Drive: go, shallow, the deeper cross, the back.
  - Ours read the cross first, the reverse of every source.
- **pa_shot (Yankee).**
  - Throw Deep, Yankee: "If the FS plays low, he can throw the post"; if he sinks, the dig over the linebackers; order
    post, dig, crosser, check-down.
  - Kolste (USA Football): skinny post, then the deep cross; the free safety "can't take away both".
  - Which post is the Yankee post in our concept (W1 backside, S2 inside) is not sourced. The key takes the post the
    concept installs over the dig.
- **curl_flat.**
  - Hewitt (USA Football, Basic knowledge about reads): read the play-side flat defender, "If he covers the flat,
    throw the curl. If he covers the curl, throw to the flat", the progression "No. 1 receiver to No. 2 receiver to
    running back".
  - No source reads the backside before the back.
  - Dunn's Hank (a #3 hook over the ball first) is not declared: no pool formation installs our hook as the over-the-ball
    route.
- **double_outs (analogue).**
  - The go / deep-out read (Youth Football Online): the low route holds the corner; if he runs with it the low route
    goes now, if he comes off, the deeper out behind him.
  - The concept's own read line says the same of the curl-flat defender.
- **seam_slant (analogue).**
  - Double slants (Stanford Daily) and Dunn's slant-flat: one hook or curl defender decides between the inside and
    outside throw.
  - The concept's own read line names the hook defender inside #2.
- **comebacks (analogue).**
  - Walsh's 49ers notes time the comeback ("7 step and hitch step and throw to spot"; "Only when DB is turning and
    running away") but give no order for the dig and seam. The authored progression stands, declared so the geometry
    cannot flip it.
- **Verticals (not declared here).**
  - Gonzalez via Smart Football: the locked seam, then the other seam's read, then the back. Out of empty, Throw Deep
    reads the free safety between the Y to the opposite hash and the slot's seam.
  - No source says what replaces the checkdown in empty, and none gives an empty or 3x1 order for verticals-hitch
    (Goff, Glazier: the hitch against the softest corner, then the seam read, 2x2 only).
  - Left for a source.

## Gaps

- No source names comebacks, double_outs or seam_slant.
- The paywalled half of Bullock's Drive piece and the X&O Labs pages were not read.
- The quote wording above was taken from page extracts. Check it against the pages before quoting it further.

## Check

`test/plan-roles.test.ts`:
- hitch_cross from doubles is keyed on the hook (W2 low, S2 high), and not keyed off.
- curl_flat's order is S2, S1, then the back, with the back absent from the field order off.
- comebacks' order starts S1, W1, S2.
