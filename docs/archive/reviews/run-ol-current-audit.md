# Current run OL: trained contact execution and coordinated jobs

## Status and recommendation

This audit started on `d087104`, engine source
`11b97574138bdd4a99b373e4089261519bd4484f2e5ae5c87f90276a07215f85`.
It inspected the installer, free approach, combination lifecycle and actual
engagement controller. The subsequent **OL-only** contact increment is source
`01a504731ec27ee4d1767c9203ff71d91e597f0d0e67ad54084ea52664da3036`.
These are distinct phases; neither is a later combined carrier treatment.

Keep the reduced shared physics model. The clearest demonstrated OL error was
which learned technique the contact controller consulted: run hands and feet
mostly used `passBlock`. Correct that contract before changing ground friction,
strength or support. The next well-defined football defect is Draw presentation:
helpers fire out while their covered owners show pass. Healthy-target recovery
and live stretch combinations deserve investigation, but the current evidence
does not justify automatic abandonment, automatic climbs or a new force law.

The existing sources remain useful: [the common controller review](universal-ol-controller.md),
[independent combination attention](joined-combination-attention.md),
[the technique implementation](ol-technique-implementation.md),
[solo zone reach](zone-reach-and-displacement.md),
[the promoted cutoff](position-technique-and-awareness.md), and
[the trench handbook](../../football-handbook/trenches.md). Several defects in older
reviews have already been repaired; their prototype results are not today's
baseline.

## 1. A proven contextual skill error, with a narrow repair

Before this increment, `traits(a)` in
[`engagement.ts`](../../../src/sim/engagement.ts) gave every offensive blocker:

- Hands: `0.65 handTechnique + 0.35 passBlock`.
- Feet: `0.60 passBlock + 0.20 balance + 0.20 three-cone score`.

The same values governed a run's initial punch, later hand-control drift,
seal/mirror gains and cutting-technique request. A run specialist consequently
had worse run hand/foot execution than a pass specialist of identical size,
strength, drills, shared hand training and balance. `runBlock` was not absent:
it already influenced approach-placement error, the mixed bend/pad proxy, and
the shed-sustain estimate. Actual `baseB` came from body support, rather than
either blocking rating. The specific inconsistency was contact hands/feet.

The increment makes `traits(a, type)` choose offensive hands/feet using the
**actual engagement type**. Default `traits(a)` retains the previous pass
behavior for pre-contact protection and other existing callers. Run and pass
results are cached separately for an athlete; conversion or a later rep cannot
reuse the wrong context. Creation, refreshed hands and sustained run technique
consult that type. Defender traits remain identical.

Only the trained execution rating changes. Mixed bend/pad, drill-derived
lateral quickness, reach, arm length, mass, support parameters, traction,
push/arm capacities and World are unchanged. Better inside-hand execution can
request more of the existing hand budget through higher control; it does not
give the athlete a larger force/work budget. The existing cutting-technique
input also uses run-trained feet, with its original coefficients and shared
ground/support limits.

### Controlled evidence

[`run-contact-technique.ts`](../../../scripts/diag/run-contact-technique.ts) executes
48 reduced real-contact reps: run/pass, exact reflected contact geometry,
three fixed seeds, and four run/pass training combinations. Profiles are pinned
before contact, including the pass-derived backpedal factor. All measurables,
shared hand training, balance, initial bodies, positions and RNG contexts match.
This is an execution diagnostic, not ordinary 11v11 or evidence that the more
skilled player must win every rep.

| Check | Baseline versus OL-only |
| --- | --- |
| Matched physical-profile and initial-body hashes | 48/48 |
| Actual loaded hand reps | 48 in each phase |
| Pass traces identical | 24/24 |
| Run traces changed | 12/24; equal run/pass training controls stay identical |
| Candidate run traces identical when only pass training changes | 12/12 paired checks |
| Maximum candidate work-accounting residual | `6.715e-13` native work units |
| Maximum numerical force/work budget excess | `2.843e-14` |

At seed 11, the run specialist's initial run hand control was `0.23404`, below
the pass specialist's `0.48404`. The contextual repair reverses those values on
the same bodies and RNG. It changes learned execution, not strength. Some seeds
still begin with defender-controlled hands. The collector records actual load
and its actor: a defender-controlled hand joint need not spend the blocker's
arm budget.

The nine new [contact tests](../../../test/run-contact-technique.test.ts) pass;
the same new tests have four failures against the archived baseline, exposing
the wrong-context ranking, irrelevant-rating effect and context-cache contract.
The nearby 95 run, combination, fit, exchange, protection and pursuit tests and
the strict typecheck pass. Full integration checks belong to the final combined
candidate, rather than this isolated source phase.

### Ordinary football evidence and adverse cases

The unchanged `combo-transfer-review.ts` panel contains 160 balanced ordinary
runs (Ace 11 except Split Zone in Gun Wing 12), eight concepts, five fronts,
two flips and two play seeds, plus
two separately reported prior witnesses. Its observed execution matches plain
execution on all 160 ordinary inputs in each phase. All reach natural endings;
none are physical timeouts. One generated roster is the pooled panel; the
supplemental roster and reduced contact island do not make it a league sample.

Use **`result.offenseYards`** for primary offensive segment gain. `result.yards`
can differ on a fumble/return. Both are before game-level penalty enforcement;
a holding flag is not an automatic ten-yard deduction in this collector. Any
holding-adjusted or penalty-excluded outcome must be reported separately.

| Ordinary measure | Baseline | OL-only |
| --- | ---: | ---: |
| Mean offensive segment gain | 1.279875 yd | 1.280688 yd |
| Nonpositive offensive segment gain | 39/160 | 52/160 |
| OL falls | 11 | 12 |
| Command-local climbs (not whole-play count) | 5 | 6 |
| Stale combination-pointer updates | 0 | 0 |
| Natural endings / physical censors | 160 / 0 | 160 / 0 |

The essentially unchanged mean does **not** demonstrate generally better run
football. Duo mean decreases `1.875 → 0.996 yd`; Power increases
`0.751 → 1.373 yd`, and Wide Zone `1.027 → 1.343 yd`. The panel's changed
interactions and decisions remain important even though their pooled mean is
stable. World budgets stay bounded: maximum OL-only work residual
`9.714e-12`, momentum residual `3.622e-12`, support-motor excess zero.

Three adverse witnesses should remain visible:

| Witness | Offensive segment gain | What changes |
| --- | --- | --- |
| `CT-R1-duo-odd-L-S3` | `7.44 → 0.33 yd` | Same first-load bins and NT combination climb at 0.95 s; LT loses leverage at 1.35 rather than 1.85 s. DT_W later brings the runner down near the LOS. No OL falls in either phase. A later holding flag also differs, without a direct yardage deduction. |
| `CT-R1-duo-odd-L-S11` | `11.61 → 4.72 yd` | Same NT climb at 1.40 s; C's later exit changes from geometric leverage loss at 2.40 s to a hand shed at 2.45 s. Subsequent contact, carrier path and LB tackle differ. No OL falls in either phase. |
| `CT-R1-power-under-R-S3` | `4.13 → -0.28 yd` | Same earned climb at 1.20 s and first-load bins; Y exits at 1.75 rather than 1.95 s, RG at 1.45 rather than 1.55 s. The runner is tackled behind the LOS. Baseline RT falls; candidate RT remains up. |

This roster's run/pass ratings are LT `65/86`, RT `72/64`, C `78/77`,
LG `82/67`, RG `61/67`. The correction reduces the LT's learned run execution
while improving the LG's. Keeping old yards by secretly restoring pass skills
to a run rep would undermine the trait contract. These adverse results justify
continued football inspection, not a strength retune or a claim that all
decreased yardage is automatically more realistic.

## 2. Draw combines incompatible presentations

**Source-confirmed and reproduced, not repaired here.**

The installer converts first-level owners to `draw`, but leaves helpers as
`combo` and unassigned second-level work as `climb`
([`planRunBlocking`](../../../src/sim/behaviors/blocking.ts)). `RunBlocker.update`
then bases the high/low stance and pre-entry pass-influence request only on
`plan.kind === 'draw'`. A combo helper shows low hat and starts an ordinary
forward approach while his covered owner sets backward and shows high hat.
Saving `soloKind: draw` repaired later metadata; it did not coordinate this
initial presentation.

Eight unchanged ordinary Ace 11 Draw calls against Over, Under, Odd and Bear,
both flips, seed 3, were inspected on the separately pinned OL-only source.
Every case installs at least one such combination. At 0.35 s in Over/right:
the covered C shows high hat and requests approximately `(-1.801, 0) yd/s`;
helper LG shows low hat and requests `(7.594, -0.384) yd/s`. Their achieved
positions remain near the initial line: those commands are not proof of
instantaneous sprint acceleration. The contradictory presentation itself is
the defect. All eight plays finish naturally; their yards are not acceptance
targets.

**Minimal next increment:** separate the installation's presentation from its
eventual first-level/helper/climb job. Preserve combination identity and
reserved responsibilities while giving the members compatible pass-influence
requests. Specify the transition cue honestly: a communicated install or
observed mesh/release is a football cue; retaining the current fixed transition
temporarily is a timing approximation, not evidence that the blocker read the
play. Do not turn every helper into a permanent pass protector or erase his
second-level account.

Tests should compare owner/helper stance, backward/forward requests and achieved
paths before the transition, then actual acquired hands and surviving keeper
load afterward. Include a squeezing DL, late helper and ordinary non-Draw zone
control. Different staffs teach Draw differently; the requirement is internal
coherence with this installation, not universal identical line motion.

## 3. Healthy-target recovery needs a better witness

**A source limitation and hypothesis, not a confirmed widespread failure.**

After first entry, `RunBlocker.update` calls `findWork` when its target is
missing, down or physically owned by another unrelated blocker. A healthy,
unengaged original target is not invalidated merely because the useful
approach has disappeared. `readRules` can exchange nearby crossing threats,
and climb/combo players can collect near-gap penetration; neither is a complete
recovery policy for a free solo first-level blocker.

This could explain a blocker chasing dead old work, but a DL behind the OL may
still threaten a runner behind the line. A geometric scan of the ten fixed
baseline films found 56 free updates across eight retained jobs with a
personally observed upright target at least one yard behind the blocker. **In
none did the recorded carrier already advance 2.8 yards past that target.**
The sampled consumed pictures also supply no nearby forward LB on those exact
updates. Retaining or recovering that threat can therefore be sensible. The
scan is not a prevalence estimate or a demonstrated opportunity to climb.

Require these controlled cases before changing the rule:

1. The runner has passed the original threat, the original useful surface is
   no longer reachable, and a personally acquired reachable backer is unowned.
2. The original DL crosses behind, but the runner is still behind and recovery
   remains possible: keep working rather than automatically climbing.
3. The current defender moves behind while the blocker's delayed picture still
   shows a live surface: same consumed cue must produce the same decision.

Use the existing support-aware arrival request and actual hands, not a new
chase-strength bonus. Record old responsibility, consumed threat/runner
picture, selected replacement, requested path, reached shoulder and delivered
load. The original blocked path matters more than the opponent's roster label.

## 4. Stretch combinations are an unmeasured generalization gap

The current personal `zoneEligible` reader applies to solo OL reach work on
Outside/Wide Zone. It excludes live combinations, existing helpers and other
joint ownership. This avoids rotating an acquired joint frame and avoids
remotely applying one actor's read to both members. It also means an OZ/WZ
combo can keep the original diagonal displacement/contact frame rather than
using the later solo reach/run-with-threat policy.

Do not broaden the solo fix just because its name says zone. A supported
lateral overtake has two readers, two arrival surfaces and a surviving keeper.
The next witness should record the owner and helper's own delayed widening
picture, approach to each useful half, actual helper load, whether either
member gains an outside surface, and whether the backer fill makes departure
useful. Include attainable reach, faster widening DL, inside slant, and late
helper. Keep a fixed frame once hands are acquired. A local job decision can
change displacement intent; it must not retroactively grade a bad arrival as
a successful hook.

## 5. Gap and pull work need richer relationships before more named calls

The current installer accounts for first-level geometry, reserves one trap or
kick target, protects a pulling guard's vacated area, and assigns distinct
kick/lead roles. Pullers already brake for turns and fit a moving shoulder;
some wrong-arm looks change their drive/log instruction. These are meaningful
improvements over generic sprint-to-a-jersey behavior.

Remaining shallow contracts include a wrapper following any teammate's
`block-log` intention rather than a named kick relationship and achieved wash;
generic straight backer paths; and limited explicit backside hinge/inside-first
responsibility. These warrant named relationship/observed-path tests, not
blanket slower pullers or another hidden strength multiplier. A gap/front
ownership constructor audit checks installation counts; it does not prove
clearance, leverage or communication under a moving front.

The handbook's retained coaching receipts support the useful reductions:
covered/uncovered local checks [Kuchar], brief check versus prolonged help
[Grabowski], even versus widening zone threats [Penree], and slant/fill/scrape
keeper transfer [Janak]. They do not establish NFL prevalence or one universal
footwork sequence. See [the inspected-source list](offensive-line-run-technique.md#primary-and-public-coaching-evidence).
No new anatomical model or unverified clinic claim is needed for this increment.

## Measurement and reproducibility

Use Node 22. The unchanged native panel commands are:

```sh
node --import tsx scripts/diag/combo-transfer-review.ts out/run-current-dive/baseline.json.gz
node --import tsx scripts/diag/combo-transfer-review.ts out/run-current-dive/ol-only.json.gz
node --import tsx scripts/diag/run-contact-technique.ts out/run-current-dive/contact-technique-candidate.json
node_modules/.bin/vitest run test/run-contact-technique.test.ts
node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Run each phase from its corresponding frozen source. The baseline controlled
probe uses the identical new collector copied into the archived `d087104`
checkout; no baseline production file is modified. Its raw collector SHA is
`f753dcdfa82d4a1d036ae81811208d25621320a2b7bc981a03985d9ca0d7e08b`.
Receipts include both source hashes, profile/body hashes, actual commands,
joint loads, actors and bounded World reports. Scratch Draw and healthy-target
inspections live under `out/run-current-dive/`; keep their declared scopes
separate from promoted native evidence.

The common standard remains: the installed job generates a fallible observed
decision; that decision requests an attainable useful surface; real contact
and support produce bounded movement and load. A label, a climb event, fewer
falls or improved average yards alone proves none of those stages.
