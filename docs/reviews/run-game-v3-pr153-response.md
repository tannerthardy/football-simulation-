# Run game v3: author response to the PR #153 reviews — 2026-10-19

This responds to the reviews of submission `1c578afb`. Response commits on
`claude/run-game-v3`:

- `7ad07372`: the two rejected defects repaired, the shotgun spot split
  out, the arm launcher bound to provenance.
- `92c1d0c1`: under center, `MESH_TEMPO` engages only with `UC_MESH`; the
  exporter carrier fixed; review tools.
- `3a045be0` … `bee364ae`: selected witnesses and their tools.
- `76252fa9`: a `ZONE_TE` controller defect the witnesses exposed.

Accepted develop is unchanged at `f4146275`. Nothing here asks for
promotion, activation or merge. Reviews answered:

- the independent [run/controller review][rc];
- the [measurement review][mr].

The contact/physics review of `SHED_PURSUE` is still pending, and nothing
below presumes it.

[rc]: https://github.com/tannerthardy/football-simulation-/blob/26614a6de5a8b891422c3a7f254e1099d51ee462/docs/reviews/pr153-run-controller-review.md
[mr]: https://github.com/tannerthardy/football-simulation-/blob/c9f162ab70991c5da94b4ccd68eb92f82a11f9a8/docs/reviews/pr153-measurement-review.md

## Summary

| Scope | Review | Response |
|---|---|---|
| `UC_MESH` draw | REJECT | Accepted, repaired. HOLD with the rest of `UC_MESH`. |
| `LB_KEY` | REJECT | Accepted, repaired. HOLD. |
| `MESH_TEMPO` scheduling | HOLD; `UC_MESH` not a prerequisite | **Pushback, with evidence** (§2). Under center it is one at the reviewed pin. Shotgun scheduling is independent. |
| Shotgun spot | HOLD separately | Split into `GUN_MESH_SIDE`. The 2×2 shows it is adverse on outside zone, so it stays HOLD (§3). |
| Power 40+ rise | Needs attribution | Neither the mesh nor weak DB holds (§4). The front seven rarely reach the back first. Do not cap the runner. |
| `ZONE_TE` | HOLD (gun adverse) | Gun adverse reproduced. One controller defect found and repaired; the gun outcome is unchanged. HOLD (§5). |
| `STRETCH_FLAT` | HOLD | No new evidence. HOLD. |
| Measurement wording and operators | Corrections | All adopted (§6). Two operator bugs fixed, with changed numbers; one exporter bug found. |
| Provenance and witnesses | Handoff | Bound launcher. Saved arms are reproduced play-for-play at a pinned commit. 27 witnesses published (§7). |

Selected witnesses, each with its `baseline.mjs --candidate` receipt and
checksum, are in
[`run-game-v3-witnesses.json`](../../data/reviews/current/run-game-v3-witnesses.json).
They were produced by `scripts/diag/stretch/witnesses.sh` and summarised with
`witsum.py`. Lab arm reports and manifests are under
[`run-game-v3/v5/`](run-game-v3/v5/).

## 1. The two rejections: accepted and repaired (`7ad07372`)

- **`UC_MESH` draw.** `underMesh` now excludes draw as well as toss. Draw
  keeps the accepted QB arrival and stop; no through-speed and no new time.
- **`LB_KEY`.** The step cue pairs the acquired actor with that actor's own
  alignment. It never mixes a keyed fullback's picture with the tailback's
  home. The QB and non-backfield actors give no step cue.

The reviewer's zero-step contract checks are ported into
`test/pr153-review-contracts.test.ts`:

- draw QB arrival in both orientations;
- `MESH_TEMPO` alone keeps draw, toss and `qbDraw`;
- failed-exchange recovery with through-speed 0 and 3;
- the `LB_KEY` fullback picture on both sides.

All pass, and the 1,927 core tests and typecheck pass at `76252fa9`. Both
scopes stay HOLD with the rest of their flags; no acceptance is requested.

## 2. Pushback: under center the scheduler needs an achievable meeting

The review concludes that `UC_MESH` is not a prerequisite for either
`MESH_TEMPO` hunk, because "the scheduler consumes the installed `mesh`,
`meshTime`, `aim` and own body; accepted source already supplies them."
Structurally that is true. But on several accepted under-center calls the
installed `meshTime` is not a time the QB can reach his spot. The review's
own `UC_MESH` time row asks to keep the called delay and the actually
achievable arrival distinct. A back scheduled to that called time arrives
early at full speed, passes, and the exchange is lost.

At the reviewed pin, `MESH_TEMPO` with `UC_MESH` off gives these exchanges.
The `7ad07372` lab arms are identical on these paths; the witnesses run
`1c578afb` itself.

| Concept (under center) | Handoffs, default | Handoffs, `MESH_TEMPO` alone |
|---|---|---|
| Inside zone (ace) | 400/400 | 400/400 |
| Outside zone (ace) | 400/400 | **0/400** |
| Wide zone (ace) | 400/400 | **0/400** |
| Power (I and ace) | 399/400 | **389/400** |
| Counter, duo, trap | 398–400/400 | 399–400/400 |

The 11 lost power exchanges are all weak-side power from the I formation
with roster pair 31. There the installed call precedes the QB's arrival: the
default handoff comes at 1.85 s, to a back waiting at 0.0 yd/s.

The witnesses (`w7-1c5-*`, run at `1c578afb`) show the failure:

- **OZ:** the back's closest approach to the QB is 1.62 yd at 1.50 s; the QB
  keeps at 1.60 s.
- **WZ:** closest 1.45 yd; the QB keeps at 1.65 s.
- **Power:** closest 1.28 yd; the QB keeps at 1.65 s.

In each case the default arm hands off: OZ at 1.55 s (1.17 yd, back at
4.31 yd/s), power at 1.85 s (back stopped).

The repair in `92c1d0c1`: under center, tempo engages only with `UC_MESH`.
`UC_MESH` supplies both missing components: the QB's own achievable arrival
time, and a QB still moving through the spot. Draw, toss and `qbDraw` stay
excluded, and failed-exchange recovery is untouched. `w7-head-oz-tempo` now
has the default arm's exact ticks and events (6.48 yd, same handoff).

Two attempts to make under-center scheduling independent of `UC_MESH`
failed, so I stopped:

- Keying the back to the QB's observed arrival slowed the package handoff to
  about 2 yd/s.
- Giving only the scheduler an achievable time still missed: the QB stops on
  the stretch spot and the back passes 1.37 yd away.

A scheduling-only under-center proposal needs its own achievable meeting
time and stretch exchange.

Cost of the gate: it also turns tempo off for under-center inside zone and
gap schemes with `UC_MESH` off, where nearly all exchanges complete. A
narrower stretch-only gate would still lose the 11 power exchanges. That
choice is open for the reviewer.

In the shotgun, the scheduler has no `UC_MESH` dependency: `v5gt` is
`MESH_TEMPO` alone (§3).

## 3. Shotgun: spot separated from scheduling (`GUN_MESH_SIDE`)

The own-side spot is now its own flag. All arms are on the same 600 shotgun
zone cases at `92c1d0c1` (`v5g0`/`v5gt`/`v5gs`/`v5gts`):

| | Default | `MESH_TEMPO` | `GUN_MESH_SIDE` | Both | NFL |
|---|---|---|---|---|---|
| Handoff speed IZ / OZ, yd/s | 1.41 / 1.95 | 1.95 / 2.36 | 1.41 / 1.77 | 2.30 / 2.50 | 3.82 / 4.67 |
| Negative | 8.5% | 9.8% | 11.0% | 11.8% | |
| 4+ | 40.7% | 44.8% | 42.5% | 42.3% | |
| 40+ | 5.00% | 3.17% | 5.33% | 4.17% | |

- **The own-side spot is adverse on outside zone.** With both flags, OZ
  negatives go 18 → 34 of 200 (paired, p=0.007).
- **The adverse witness** is `w3-gunoz-*`, the same OZ snap:
  - default: handoff at 1.0 s, first contact 5.8 yd downfield, +9.81;
  - own-side spot: the back takes the ball on the wrong side for a wide
    track, and the DE wraps him 2.2 yd behind the line (−1.18).
- **This agrees with the review.** It is not a universal rule: 28% of NFL OZ
  backs cross the QB's face.
- **The mesh witness** is `w1-gun-*` (IZ). The handoff is at 1.05 s in all
  four arms. Back speed at the handoff:

  | Default | `MESH_TEMPO` | `GUN_MESH_SIDE` | Both |
  |---|---|---|---|
  | 1.56 | 1.90 | 0.83 | 2.91 yd/s |

  Gains: 3.03 / 4.59 / 8.57 / 13.04.

Pushback on keeping the default as "a legitimate across-face installation":
as executed, it is not one.

- Its straight track passes 0.30 yd from the QB's centre, inside contact
  distance (0.51 yd).
- NFL backs who do cross face pass 0.7–0.8 yd in front of him.
- A legitimate across-face exchange needs a bent path in front of the QB. It
  is not built, and I am not proposing to replace the default with the
  own-side spot.

The short runway still caps shotgun handoff speed. Sim backs align 1.6 yd
beside the QB and 0.2 deep; NFL backs, 2.3 and 0.5. That is the formation
owner's handoff.

Status: `GUN_MESH_SIDE` stays HOLD (adverse OZ). Shotgun `MESH_TEMPO`
scheduling stays HOLD, with `v5gt` as its isolated evidence.

## 4. The power tail: who reaches the back first

Paired on the same 400 power cases at `92c1d0c1` (`v5rec2gap` → `v5mtrgap`):

- 40+: 18 → 40 (p=0.001);
- 4+: 153 → 202 (p<0.001).

**Witness `w4-power-*`** is one play with the package, without and with
tempo:

- The handoff is legal and on the same time (1.35 s).
- Back speed at the handoff: 2.62 vs 4.56 yd/s. He crosses the line 0.4 s
  sooner (2.85 vs 2.45 s).
- Without tempo, the corner meets him first at 3.40 s, 2.0 yd past the
  line at 7.8 yd/s, and tackles him.
- With tempo, the nickel meets him first at 2.85 s (2.35 yd, 7.6 yd/s),
  with the corner assisting. Both holds slip, then the nickel's again, and
  it is a touchdown.

So the mesh executes legally; what changes is who is there when he arrives.

New shared operator (`scripts/diag/stretch/dbhits.py --first`), applied to
both NFL and sim:

- Each run's earliest frame with a defender within 1 yd of the carrier while
  he is 0–10 yd past the line.
- Outcome as in `openfield.py`: "broken" is the survivor-conditioned motion
  proxy, not a broken-tackle label.
- Only the earliest encounter counts. Sim plays end sooner after contact, so
  later arrivals are undercounted in the sim.
- NFL OLB count as LB and sim EDGE as DL, so the front seven is the safer
  comparison.

| First near-line encounter | NFL runs | NFL power | Sim gap, develop | Sim gap, package | Sim gap, + tempo | Sim power, package | Sim power, + tempo |
|---|---|---|---|---|---|---|---|
| Front seven first | 77% | 75% | 47% | 53% | 52% | 40% | 38% |
| DL first | 42% | 34% | 14% | 15% | 14% | 10% | 12% |
| DB first, back at 7+ yd/s, per run | 0.04 | 0.03 | 0.06 | 0.06 | 0.07 | 0.08 | 0.10 |
| ... "broken" proxy | 30% | 40% | 23% | 24% | 28% | 19% | 31% |
| DB first, back at 5.5–7 yd/s, per run | 0.05 | 0.07 | 0.22 | 0.19 | 0.19 | 0.21 | 0.21 |
| ... "broken" proxy | 25% | 39% | 5% | 5% | 7% | 5% | 7% |

The sim columns are `v5d0gap`, `v5rec2gap` and `v5mtrgap`. NFL counts:
6,223 runs and 589 power. Sim counts: 1,600 gap and 400 power per arm.

Reading:

- Against fast backs, sim DBs fare no worse per encounter than NFL DBs.
  Against mid-speed backs they fare much better (5–7% vs 25–39%).
- What differs is exposure. In the NFL the front seven reach the back first
  three times in four; in sim power with the package, about two in five.
- `MESH_TEMPO` does not create this. It gets the back to the line before the
  front seven flow: Part 3 has the puller and backer flow lags, and the
  engaged pairs that do not move.
- The review is right that the histogram does not justify capping the
  runner. The repair belongs to front-seven flow and the engaged-pair
  handoff, not the mesh.
- Below 5.5 yd/s, a first encounter near the line ends the play within 1 s
  in 85–97% of sim runs, against 35–49% in the NFL. That matches the short
  first-contact-to-ending interval already handed off. It is why only first
  encounters are counted.

This replaces my earlier sim-only "DB holds at speed break" attribution. The
open-field-holds handoff in Part 3 is withdrawn as a ranked cause: per
encounter near the line, sim DBs at 7+ yd/s are within NFL's range.

## 5. `ZONE_TE`: gun adverse reproduced; one defect repaired (`76252fa9`)

`v5gte` reproduces the reported gun inside-zone result exactly: negatives
6.0 → 10.5%, 4+ 40.5 → 33.5%. The opposing control helps:
`w5-gunte-control-*`, IZ weak, goes −0.11 → +2.33.

The adverse witness `w5-gunte-*` (IZ strong, odd front) goes 3.45 → −0.87:

- The end wins width: he is outside the DE by 0.6 yd at 1.5 s.
- His rep's drive line then carries him upfield and outside at about
  (1.4, 2.3) yd/s while the DE sinks to the line. They separate at 1.8 s.
- From then on he is 1.4 yd past his man. The zone track (`zoneFlow`) still
  treats the DE as in front: its meeting time collapses to its 0.15 s
  floor.
- His width request saturates and flips sign at full speed (±8.76 yd/s)
  each time he crosses the DE's shoulder line, with depth pinned at −1. He
  never fits again; the DE and NT tackle the back 1.8 yd behind the line.

`scripts/diag/stretch/overrun.ts` measured this over 720 gun and ace
zone plays:

- Inline ends with `ZONE_TE` spend 45–70% of their track ticks level with or
  past their man.
- 78–95% of those ticks are saturated, with 266 full-speed reversals.
- OL reach the same geometry, but their request never reverses.

The repair, `ZONE_TE` only: once an end is level with his man's near surface
on his acquired picture, he leaves the track to the ordinary fit, as an end
without the flag does. A test staged from the filmed state fails without the
change in both orientations.

Results (manifests in `run-game-v3/v5/`):

- Gun (`v6gte` vs `v5gte`): the requests are coherent, and the end turns
  back to his man. Outcomes are unchanged: gun IZ negatives 10.5 → 10.0%,
  4+ 33.5 → 34.5%. Paired against no `ZONE_TE`, negatives 12 → 20 of 200
  (p=0.096).
- Ace package (`v6mtr` vs `v5mtr`): no detectable change overall (40+
  31 → 27, p=0.54). Inside-zone 4+ improves, 161 → 170 (p=0.035).

The remaining gun loss is the rep's drive line, not the track. On inside
zone every zone blocker drives along a fixed line 31° playside of vertical
(`up(ps*0.6)`). An end who has already won the man's outside pushes away
from him. That is the shared run-rep controller every zone OL uses, so I
have not changed it here. It is the next re-diagnosis target: drive through
the man once the blocker is on his playside. `ZONE_TE` stays HOLD.

## 6. Measurement review: corrections adopted

The wording corrections are in `run-game-v3.md` (`92c1d0c1`):

- **Contact interval:** "first-contact-to-selected-ending" replaces "contact
  to whistle".
- **`bondend` semantics:** one row per play, 357 play rows, 95–98%
  non-up while bonded, medians 0.30/0.30/0.35 s.
- **Force:** felt force (−2.29 body weights), not grip tension.
- **Contact-centred estimates:** described as such.
- **Proximity proxies** are named as proxies.
- **Re-latch:** counted per rep event, within two native ticks; seven
  other-blocker DL repeats remain.
- **`openfield.py`:** the residual category is not "slowed".
- **`lbpass2`:** closest approaches, not contacts.
- **Pursuit horizon:** REF+40.
- **NFL Duo:** "sim Duo versus NFL PFF MAN family".
- **Small counts:** paired tests replace "within noise" (table below).

Operator bugs:

- **`release.py` / `lbblocks.py` admission.** The crossing+1 s test used the
  clamped frame index, so short recordings were admitted on their last
  frame. 465 of 1,083 `sp` runs were wrongly admitted. With the fix:
  - same-player second-level block durations (quartiles) are sim
    0.8/1.4/2.0 s vs NFL 0.9/1.5/2.2;
  - right-censored episodes are 39% vs 36%;
  - DL with an offensive player within 1.2 yd at the crossing, +0.5 s and
    +1.0 s are sim 81/81/81% (n=618) vs NFL 76/66/57.
- **Exporter carrier (found here).** `trace.ts` exported the RB as the
  carrier on every play, and first contact used him too.
  - Saved arms: at most 9 of 1,600 plays per arm have another carrier
    (fumbles, keeps).
  - `MESH_TEMPO`-alone stretch arm: 800 of 1,200, which is how §2's failure
    first hid.
  - Fixed in `92c1d0c1`.

Paired tests on saved and reproduced arms (exact McNemar; counts per arm):

| Transition | 40+ | Negative | 10+ |
|---|---|---|---|
| `mtr` → `sp` (ace) | 31 → 26, p=0.44 | | |
| `d0` → `sp0` (ace, `SHED_PURSUE` alone) | 45 → 51, p=0.41 | | |
| `d0` → `sp` (ace) | 45 → 26, p=0.029 | 153 → 115, p=0.005 | 121 → 74, p<0.001 |
| `rec2gap` → `mtrgap` (power) | 18 → 40, p=0.001 | | 4+: 153 → 202, p<0.001 |
| `v5mtr` → `v6mtr` (ace, `ZONE_TE` repair) | 31 → 27, p=0.54 | 115 → 112, p=0.51 | 75 → 67, p=0.30 |

The measurement review's other limits stand as written:

- NFL forward-fill;
- group mapping;
- event systems;
- equal-weight lab mixtures;
- TVD cancellation and the per-concept adverse rows.

## 7. Provenance

`scripts/diag/open-field/arm.mjs` now launches every lab arm:

- It applies the pinned profile through `baseline.mjs`'s `environment()`
  plus the listed overrides; ambient flags are not inherited.
- It writes a manifest with:
  - commit, branch, dirty patch hash and untracked files, all captured at
    launch;
  - runtime source digest;
  - every resolved profile flag;
  - Node version and tracer arguments;
  - per-shard counts and checksums;
  - tracer, lab and measurement hashes.

Reproduced arms at `92c1d0c1` (runtime digest `cfc66cf5…`) match the saved
arms play for play, with zero gain and zero position-frame mismatches
(`sameplays.py`):

| Reproduced | Saved |
|---|---|
| `v5d0` | `d0` |
| `v5mt0` | `d0` (`MESH_TEMPO` under center is now a no-op) |
| `v5mtr` | `mtr` |
| `v5sp` | `sp` |
| `v5d0gap` | `d0gap` |
| `v5rec2gap` | `rec2gap` |
| `v5mtrgap` | `mtrgap` |

That binds those reports to a known source and settings. It does not
recover the original producing receipts.

- `mtrtf` and `mt2tf` stay historical, with their intermediate source
  (`mt2tf`'s spot is now `GUN_MESH_SIDE`).
- The superseded `ZONE_TE`, `mt3*`, `ptgap` and `pkgap` arms are historical
  and incompletely reproducible.
- `DEF_GETOFF` is now accepted by the launcher as a recorded numeric
  diagnostic.

The 27 witnesses have:

- case and roster pair, seed, every resolved profile flag, commit and dirty
  files, tool hash and Node version;
- all events with actor slots and notes;
- sampled ticks with position, stored velocity, behavior command, final
  intent, facing, support state, rep and possession;
- result.

Their receipts are clean: commit `b5577605`, or `1c578afb` for the four
reviewed-pin entries; `inputsUnchanged` true and exit 0.

`w7-1c5-power-default` ends in a fumble returned for a defensive touchdown,
with the offense credited 4.93 yd.

## What I ask

Nothing for promotion. When convenient:

- **Run/controller:** re-review the repaired `UC_MESH` draw and `LB_KEY`
  scopes, and the §2 evidence on the under-center dependency.
- **Contact/physics:** the `SHED_PURSUE` review stands; `w6-shed-*` are a
  favourable case and an opposing control. Both diverge after the release;
  the paired tests find no outcome effect. Front-seven presence (§4) adds
  weight to the engaged-pair and start-up handoff.
- **Formations:** the shotgun back alignment.

My next controller target is the zone run-rep drive line against a reached
man (§5).
