# CONCEPT_DROPS re-marked by the first read's route (2026-11-15)

Rules + Coaching, for Integration and the QB lane's footwork-keyed reads. The drops' depths and times stay the QB lane's
(`dropSpec`); this marks each concept's class and so the step its first read is on.

## The rule, as taught (checked against the page)

- **The drop by the route** (Mike Pina, "How To Coach a 3 Step Drop & 5 Step Drop", Viqtory Sports):
  - 3-step for the quick game (the 5-yd hitch, slant-flat);
  - 5-step for intermediate routes (post, curl, corner, dig);
  - 7-step for shot plays (flys, deep posts, post-corner, post-dig).
  - **From the gun:** a quick-game concept takes a 1-step drop "to keep the same timing", a 5-step concept a 3-step,
    and a 7-step concept a 5-step.
  - **Timing:** release on the 3rd step; on the 5th, "or reset the feet depending on the route".
- **The step within the drop, by the route** (Bill Walsh's 49ers notes, transcribed by Smart Football, 2009-04-07):
  - three-step: the hitch, quick out and slant;
  - five-step: the square-out on "five quick steps"; the square-in and the flanker post on "five big steps and a
    hitch"; the curl "five-step timed";
  - seven-step: the go ("seven-step hitch and throw"), and the deep comeback ("seven-step drop with a hitch").
- So the first read's route sets the mark:
  - an out, curl, flat or hitch is read on the set (our `gun5`);
  - a square-in / dig, post, corner or crosser on the hitch after it (`five`, with CONCEPT_DROPS's 0.8 s hitch);
  - the deep comeback is a seven with a hitch, so `five` from the gun.
- Supporting: the shallow cross needs a full five-step (Smart Football); comebacks "five steps and a hitch" (Coiner);
  smash 5-step under center, 3-step from the gun (coaching guides, by Pina's rule); mesh "a three step dropback pass
  play from the shotgun" (Win With The Pass, unverified).

## The re-mark (`COACHED_DROP`, behind CONCEPT_DROPS, off)

| concept | was (CONCEPT_DROPS) | now | first read, its route | why |
|---|---|---|---|---|
| smash | five | five | the corner (high), ready 2.6 | corner: five and a hitch |
| mesh | five | five | the crosser, 2.7 | the shallow cross needs a full five |
| drive | five | five | the dig over the shallow, 2.9 | square-in: five and a hitch |
| corner_flat | five | five | the corner, 2.7 | corner |
| comebacks | five | five | the comeback, 2.9–3.2 | seven + hitch; from the gun, five |
| **levels** | gun5 | **five** | the square-in, 2.9–3.0 | Walsh's square-in: five big steps and a hitch |
| **flood** | five | **gun5** | the out (doubles 2.3) or the flat (trips 1.9) | square-out: five quick steps |
| **sail_corner** | five | **gun5** | the out, 2.0 | square-out |
| **double_outs** | five | **gun5** | the quick out, 2.0 | square-out |
| **trips_sail**, **trips_outs** | five | **gun5** | from trips, the flat (S3), 1.9 | the flat first, on the set |
| dagger, y_cross | five (authored) | five | the dig / the cross, 2.7 | unchanged |

**Measured** with `installedPlan(...).rhythm`: each read's step time against its route's ready time, every pass concept
but screens, gun doubles (trips concepts from gun trips).

| marking | reads within 0.45 s of ready | early | late |
|---|---|---|---|
| CONCEPT_DROPS off | 58 | 28 | 10 |
| CONCEPT_DROPS as marked (develop) | 50 | 18 | 28 |
| this re-mark | 58 | 18 | 20 |

- **First reads:** every re-marked concept's first read lands within a hitch (0.45 s) of ready in the gun.
- **Under center** (ace_12), smash and corner_flat are 0.5 s late (corner ready 2.7–2.8, read on the hitch at 3.2).
  That is the under-center five's time (2.0 s set + 0.8 hitch), the QB lane's.

## Where no standard drop fits (stated, not fudged)

1. **Verticals in the quick and quick-five game:** four_verts and verts_hitch (`gun3`), fade_flat (`gun3`), and the
   seams of seam_slant and seam_hitch.
   - Read 1 comes about 1.0 s before the compiler's ready time.
   - Coaching reads the vertical on rhythm, "on the last step" (Gonzalez via Smart Football), before it is 12 yd deep.
   - Our compiler counts a vertical ready only at depth (2.7–2.9 s). It is the definition of "ready" for a vertical,
     not the drop: a route-depth / compiler question.
2. **Play action:** pa_post_dig, pa_shot, pa_flood. Read 1 comes 1.1–1.3 s early in the gun, 0.6–0.8 under center.
   - The post-dig and the shots are seven-step concepts (Pina).
   - After the fake, the read is a hitch after the PA set, not on it.
   - The `pa` drop's beat is the QB lane's, and there is no standard drop mark for it here.
3. **The low half of a high-low on a `five` concept:** read 2 comes 1.1–1.3 s after ready (smash's hitch, mesh's second
   crosser, y_cross's and levels' underneath route, corner_flat's flat, drive's shallow).
   - These are one-defender reads: the low route is thrown off the same key at the same beat as the high (PLAN_KEYS'
     keys), not as a serial read two hitches later.
   - The rhythm's serial step for read 2 is the QB lane's to drop for keyed concepts. It is not a drop mark.
4. **trips_outs from doubles:** with PLAN_ROLES off the go (a declared clear-out) is read first. It is a PLAN_ROLES
   dependency, not a drop.

## Integration's two questions (2026-11-15, after the QB lane's beat-vs-ready table)

**1. How long a hitch is.**
- No source found gives it in seconds. Coaches state it as one step: "stab your fifth step... take one hitch step
  (shuffle) up in the pocket... If the first read... is open, then the ball should leave your hands after that one
  hitch" (a coaching guide's five-step; search summary, not fetched).
- Walsh's "five big steps and a hitch" is the same unit.
- So a taught hitch is about one stride of the drop, not two. The rhythm's first five-step hitch at set + 0.8 s is about
  two strides: the 0.8 is the NFL's set-to-release at 3.5–5 yd (QB lane, drop-time.py), which includes the throw.
- Against the QB lane's measured plant-to-release (median 0.50 s), the beats are slow. Part of "read 2 is late" is that
  clock, not the marking.
- The step's duration in seconds is the QB lane's measurement (a stride of their own drops). This note doesn't set it.

**2. Which reads share a beat.**
- A keyed high-low is one read on one defender. The two routes now share one place in the rhythm (the place of
  whichever comes first in the order), and the reads after it move up a place (`runtime.ts`, behind CONCEPT_DROPS).
- A pure progression still steps one place a read.
- With the QB lane's thresholds (EARLY > 0.2 s, LATE > 0.4 s), the home formation, every pass concept but screens
  (ok / EARLY / LATE):

  | marking | read 1 | read 2 | reads 3+ |
  |---|---|---|---|
  | off | 14 / 18 / 0 | 17 / 15 / 0 | 28 / 10 / 24 |
  | develop's CONCEPT_DROPS | 19 / 10 / 3 | 11 / 11 / 10 | 19 / 10 / 33 |
  | re-marked, serial | 22 / 10 / 0 | 13 / 13 / 6 | 21 / 10 / 31 |
  | re-marked, keyed pairs on one beat | 22 / 10 / 0 | 9 / 17 / 6 | 19 / 13 / 30 |

- The keyed `five` concepts' read 2 comes in (smash's hitch +1.3 → +0.9 s).
- But on keyed concepts read on the set (curl_flat, sail_corner, quick_outs, slant_flat, hitch_out, trips_sail,
  trips_outs), the high route now shares read 1's beat and is not ready by it (−0.5 to −0.8 s).
- **That is not a fault in a key read.** He reads the defender at that beat, throws the low on time, and throws the
  high when the defender commits and the route opens (Brown, via the plan table: "if the cornerback sinks... throw the
  hitch; if he comes up... throw the corner").
- So the key's high route should not be scored against the shared beat as a serial read is. The check for a keyed
  place is the low route on time at the beat, and the high open within a hitch after it.
- Scoring the keyed place that way, and the step's duration, belong to the QB lane's footwork reads.

## Not changed

- The quick game (slant_flat, double_slants, quick_outs, stick, hitches, hitch_out, trips_stick) and the gun-five concepts
  whose first read is on the set (curl_flat, hitch_cross, post_cross, hitch_post) were already within a hitch.
- The earlier `five_deep` split on the QB lane's branch is theirs to keep or drop.
