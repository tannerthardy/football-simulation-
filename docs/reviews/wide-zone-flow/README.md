# Continuous wide-zone movement

**Recommendation: adopt the bounded moving-fit and mesh correction; wide-zone
execution still has specific second-level misses.** The broader departure-route
experiment is rejected. This is a measured blocking improvement, not a claim of
NFL visual equivalence or successful blocks by every lineman.

[Before/after replay](replay.gif) · [per-tick summary](summary.json) ·
[timeline](timeline.csv.gz) · [artifact hashes/decoder receipts](artifacts-manifest.json)

This work continues PR #47; it does not promote PR #36's experimental
`6828467` or this branch to a shared baseline. The rejected PR #45 spacing
replacement, failed post-mesh expectation and old RT recovery search stay out.
Physics, player capacities, collisions, sight, read cadence and memory durations
are unchanged. All native comparisons start naturally from snap with 22 reacting
players and stop at 3 seconds or an earlier whistle.

## What the films establish

The first user clip is zone-action play action: the QB keeps and sets to throw.
Its opening supports common angled steps, foot replacement and local defensive
reaction, but its later pass protection is not a handoff-run timing target.
The second clip is an actual exchange followed by a perimeter press and interior
cut. All five linemen start toward the play; they then take different jobs.
The uncovered players check the near surface and climb; a penetrating body is
collected rather than ignored to manufacture uniform sideways movement.
The moving camera and recording speed do not calibrate yards per second.

The user's pasted coaching notes support an offense-initiated stretch and a
continuous contested response. They are evidence, not instructions to give the
defense the play call or force every body outward. The written coaching sources
and covered/uncovered installation are preserved in the [parent report](../wide-zone-help-read/README.md).

## Demonstrated controller problems

1. The parent opening correction distinguished installed requested tempo from
   achievable movement and checked all acquired neighboring routes together.
   This preserves that information interface, its .60s installed-call validity,
   source priority and observed stopping restrictions.
2. Active combinations still bypassed that moving fit. They approached a held
   half-man point and inherited contact movement with a diagonal-axis gate that
   could discard lateral footwork. The new acquired fit keeps each installed
   combination half, requests movement from own support/momentum and one held
   opponent picture, and projects requests continuously into the unchanged
   contact frame. Inside threats collect; obstructed shoulders recover.
   Existing lost-depth anchoring and helper-recovery controls remain active.
3. A first version put the shoulder a full torso distance behind the defender
   and also added the lateral half offset. The fresh-front witness demonstrates
   the resulting backward request before contact/climb. The corrected landmark
   lies on the torso contact circle; extra .15yd clearance belongs to recovery.
   It does not grant speed, hand reach, control or a successful block.
4. Free DL initially had no local response to their own acquired low lateral
   key while run/pass belief remained uncertain. A bounded response now uses
   the installed public key/gap and delayed acquired motion. It yields to the
   existing run/pass, carrier and contact behaviors. A null read still consumes
   the ordinary decision beat. In the three original captures only weak DE_W
   actually fires this layer, at .45s; strong gains must not be credited to a
   universal new defensive reaction.
5. The riding QB was still braking toward a stationary mesh landmark. The QB
   now carries the installed ride through it, using only the owned teammate
   picture/finite called forecast near the exchange. Physical reach and ball
   transfer gates are unchanged. The away fake uses installed opposite play
   side; crossing the mesh cannot reverse it. Native first reachable transfer
   moves from 1.60s to 1.45s. RB turns finitely at 1.15s in both versions.

LBs already acquire lateral RB motion and request flow. Strong LB_S requests
vy=-9.101 at .65s; weak M/S request +4.756/+9.101 at .60s. Strong LB_M at1.00
requests(-4.90,-7.22) but achieves(-2.44,-1.43). The captures do not justify faster
reads or forced defensive lateral movement. Carrier evaluation starts immediately
after transfer; baseline RUN_READ=0 means a timed press, not a stuck scheme reader.

## Rejected departure experiment

At `42c7095`, strong-Y LG releases at1.15 but repeatedly station-keeps on a tiny
.35rad exit while matching a retreating DL. Ordinary interception begins only
at1.90. A transit-only trial `e5fb914` improves the exact same-body first beat
from .03107 to .04807yd but does not repair the coupled delay.

`f10eac9` tries a complete acquired local route with existing cornering and own
World preview. It improves LG's actual position, but earns no LB_M load by3s.
It also changes weak's departing member: RT's .90 departure is rejected, RG
leaves at1.10, and the retained RT collides with Y at2.25–2.40. Four impulses
total209.19 kg*yd/s. **That experiment is rejected and absent from runtime.**

The [same-state probe](weak-departure-command-probe.json) finds both the old
interception command and the static-target preflight unsafe against RT's own
acquired DL picture: minimum separation .51305/.52546 versus the .64512 initial
bound over .20790s. The keeper is clear. The prediction/execution mismatch is
real, but does not explain this rejection. Restoring RT's former departure to
rescue the ending would bypass a demonstrated obstruction. No third Y route
adjustment was made.

## How to read the evidence

Actual hand load includes either player's action; high load alone is not an
OL win. We keep each opponent separate from a later nominal assignment.
Loaded displacement, achieved position, own support and teammate impulses are
reported alongside ordinary total lateral progress. A free climb is not loaded
stretch work. A nominal join with no normal or tangent force gets no load halo.

In the historical first candidate `42c7095`, strong TE–DE hands remain loaded through the2.30 tackle decision. They do
not first fail reach, facing, support or a combination release. The defender
starts an engaged reduced-range reach to RB, and the current tackle controller
removes the old block. The joint was defender-controlled with hold=0: its load
does not establish an offensive grip that should be artificially preserved.
The old-axis `e.win` eligibility and offensive-contact lifetime deserve separate
mechanism controls; neither an automatic shed nor an illegitimate tackle has
been demonstrated here. World already budgets shared hand/grasp arm demand.

Portable captures use lossless JSON container references. Their decoder retains
all22 before/after bodies, requests, joints, complete physical reports, behaviors,
initial information, consumed cues and original state/information hashes.
Repeated write/method/phase debugging and per-tick observer/RNG snapshots are
omitted from core packets, so these are offline evidence, not native restarts.
Selected exploratory witnesses retain their full recorded fields. Original
capture hashes and exact retained-JSON digests remain distinct.

```sh
python3 scripts/diag/wz-flow-evidence.py decode docs/reviews/wide-zone-flow/before.jsonrefs.gz --out out/wide-zone-flow/decoded-before.json.gz
python3 scripts/diag/wz-flow-evidence.py decode docs/reviews/wide-zone-flow/final.jsonrefs.gz --out out/wide-zone-flow/decoded-final.json.gz
python3 scripts/diag/wz-flow-replay.py --before out/wide-zone-flow/decoded-before.json.gz --candidate out/wide-zone-flow/decoded-final.json.gz --out out/wide-zone-flow/decoded-replay
```

All replay/report/packing operations add zero simulation steps. After an earlier
whistle the replay holds the last actual pose with no phantom load/contact.

## Final matched result and retained misses

At2s, play-side displacement while hands actually transmit load (yd):

| Opening / blocker | PR47 before | Final | Interpretation |
|---|---:|---:|---|
| Strong Y / C | -.17 | .82 | Interior combination now travels under real load |
| Strong Y / Y | 3.18 | 3.14 | Similar lateral travel; normal impulse229→1023, actual fit retained |
| Strong H / H | 2.79 | 2.67 | Similar lateral travel; normal impulse306→1194 |
| Weak / RG | .11 | .47 | More lateral loaded work, less purely vertical travel |
| Tite / RT | 1.64 | 1.73 | Loaded edge help retained; through3s3.70yd and571 normal impulse |

Normal impulses here are kg*yd/s, not newtons or offensive-control scores.
All four final openings have zero teammate torso impacts. H whistles at2.85;
other cases remain live/censored at3.00. No full ending or yardage recovery is
an acceptance condition.

The Tite check first exposed the depth regression: at9518, RT had zero hand
load through3s. Correct contact-circle geometry restores571 normal impulse
against DE_S, versus645 in the parent. This is useful contact, rather than
credit for a nominal join. The same-state correction alone was small: C/RT
normal requests changed from-.991 to-.512/-.144 and their first-step forward
position by .00019/.00032yd. Coupled contact response, not that tiny isolated
movement, establishes the recovered RT work.

Tite C still misses LB_S: final has no hand load through3, versus650 normal
impulse in the parent. Weak RT also has no LB_S load through3 despite5.83yd
lateral travel; its82 normal impulse belongs to earlier DT_S work. Strong-Y
LG and strong-H C also fail to reach LB_M by their short stop. These are
retained misses, not successful second-level execution. Fresh Tite is now an
observed diagnostic front, not an unobserved holdout to keep tuning against.

## Why the remaining climbs miss

The [saved-cue physical review](climb-read-review.json) supports actual pursuit decisions, not instantaneous
requested-speed reach. Isolated ordinary-World checks of the same own bodies
find fresh C's first .85 plan reaches working range after1.25s (including
recomputed held-waypoint steering); its1.45 plan predicts+.30s. Weak RT's .90
plan predicts+.95s, its1.40 plan+.65s. The actual backers subsequently accelerate
away from those delayed pictures. By fresh1.85 and weak1.90 both the planner and
same-state physical forecast find no tested attainable fit: closest margins
are+.316/.247yd outside working reach. Enlarging sight, reach or memory would
conceal that uncertainty rather than establish a better movement law.

Weak RT also leaves the joined block while still physically touching DT_S:
center distance.598yd at.90, followed by opposing torso impulses79.874,18.726,
15.650 and9.765 through1.05. At1.15 the own-only forecast reachesx40.156 while
native contact leaves himx40.042. The actual first contact costs pursuit;
spacing does not suppress his decisive early climb requests. The rejected
planner's refusal to call that route free was defensible, but its resulting
member/route interaction was not a successful replacement.

The joined-release gate checks a straight geometric corridor but does not
preview RT's residual lateral momentum. In the final own acquired picture,
initial full-radius clearance is+.00675yd; the actual requested World prefix
reaches-.10547yd clearance after.15s. Ordinary gathering still reaches-.08102,
so this witness does not establish a magically safe alternative. Joined
releases need the same achieved-prefix near-body check already used by
unjoined stretch help, followed by a tested way to preserve ongoing work and
neighboring routes. This is the concrete remaining movement mechanism; the
failed graph trial is not a safe fix for it.

Fresh C has no such departure impact. Corrected acquired DL co-flow still
reduces his climb-entry forward velocity from the parent's+.680 to+.178 while
climb time remains.85. That is a real interception-position tradeoff of the
new fit, not proof that a full-speed positive-x request could both preserve the
near surface and catch the backer. No new controller error in the ensuing
LB interception is demonstrated by these histories. A next release correction
must preserve near-surface work while checking the actual departing action and
neighboring jobs together; the failed route experiment shows why a local
'clear' label or restoring the former member is insufficient.

## Exact pins, checks and cost

| Role | Commit | Runtime source SHA256 |
|---|---|---|
| Parent publication | 8e68bf7ec1706a33305d02981889806f61ecabe9 | df7dae5752038a5b4b73651cf06eecee6fd1a02aa13d0e4f2fa9f12fe6d56e96 |
| First moving-fit candidate | 42c7095c9519e89a23cc17861d85cec6e008c744 | 42ce9955360fbda8a469615e9e3976d34ad5cfd504c74393c1bcf65f188e36d3 |
| Rejected complete departure | f10eac973094cc81dd10dfb98f78f8a9010fd22d | 094fd6d0e4436b010916579d17b5c705f057afd5911163cbf9122a79552749f4 |
| Reverted route / withdrawn depth witness | 9518ce99a0936d0c71ce0b0ab5da394fdba786b2 | 934a3637bf481fbcaea997de28339d81d0f6aa4a5be1bf9d4f553c614d82b443 |
| Final tested code/capture | 0336414fd8170610f17d7db4a8ccba94b8712b02 | afb8a307e7607c26d87e1d5f52b51a43deda2ea4712126ee3826077a994102d2 |

The final56 directly affected checks pass in1.96s; typecheck passes on the
identical engine source. The first combined candidate passed319 checks across
23 files, including contact, spacing, defensive awareness and information
contracts; unchanged pieces reuse those receipts. Final depth checks cover
exact fresh own states, reflection, recovery obstruction, preserved body/RNG,
actual World motion and capacity budgets. Loaded controls reproduce four
published World steps exactly, then compare feet-only counterfactuals and
bracing/outward/inward/obstruction responses. Mesh controls retain physical
transfer and finite turning. No physics files or44 baseline flag values change.

An initial circle test receipt fails four implementation-label assertions:
the newly exact contact-circle chord correctly enters recovery. Those
assertions now require recovery while retaining the actual lateral movement,
loaded force and capacity checks; all16 loaded checks and final56 pass.
The failed receipt is preserved.

Final four short native openings cost9.407s /237 native outer World steps.
Including parent3s extension, every exploratory candidate, rejected route,
observed-front diagnostics and final captures:69.018s /1194 native outer steps /
20 short play instances, zero full games. Each collector is bounded to30s;
these captures use the same physics/profile/seed and natural reacting players.
The parent0–2s prefix exactly reproduces all published state/information hashes.
[Runtime ledger](runtime.json) separates each source and receipt. Controller
previews and standalone mechanism tests are not counted as native play steps;
their work is included in recorded command runtimes. The final read-only climb review adds587 standalone own-body World ticks in2.8s of diagnostic commands, with zero native continuations. Portable encoding costs
33.26s with zero simulation steps; final replay26.56s, also zero simulation.
