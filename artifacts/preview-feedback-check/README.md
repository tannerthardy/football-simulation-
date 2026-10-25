# Independent check of the feedback movement preview (#284)

Subject: `previewFreeMovement`'s new callback form and its three callers, PR #284 head `2590d3af3fb1c44463afd093a28afa9b1fc2f913`,
against develop `b559fdc5` (its base). Run Game's declared 20-play ordinary zone set (`scripts/diag/zone-climb-ordinary.ts capture`), identical setup bytes on both
arms. Node v22.22.0. Tool: `scripts/diag/preview-feedback-check.ts` plus `scripts/diag/preview-probe.mjs` (an observation-only probe, applied in a scratch worktree).

```sh
git worktree add --detach /tmp/pr284 2590d3af3fb1c44463afd093a28afa9b1fc2f913 && git worktree add --detach /tmp/dev b559fdc5fd2c46776cad679e7292cc9ec425b0c1
for w in /tmp/pr284 /tmp/dev; do ln -s "$PWD/node_modules" $w/node_modules; done
# copy scripts/diag/preview-probe.mjs and preview-feedback-check.ts from this branch into both, then in each:
node scripts/diag/preview-probe.mjs apply
(cd /tmp/pr284 && node --import tsx scripts/diag/zone-climb-ordinary.ts capture /tmp/set.bin)                       # the declared set
(cd /tmp/pr284 && node --import tsx scripts/diag/preview-feedback-check.ts /tmp/set.bin /tmp/pr284.json --write-samples /tmp/samples.bin)
(cd /tmp/dev   && node --import tsx scripts/diag/preview-feedback-check.ts /tmp/set.bin /tmp/dev.json   --contract /tmp/samples.bin)
```
(Each arm reads the same `set.bin`; the develop arm replays the PR arm's sampled bodies, so the held-Intent path is compared on identical inputs.)

## Results
| Check | develop `b559fdc5` | PR `2590d3af` |
|---|---|---|
| Held Intent path == an independent fresh World, source unchanged (559 real bodies × center and patch) | 1,118/1,118 | 1,118/1,118 |
| Held Intent path digest on those inputs | `396b1bb8aa5d7319` | `396b1bb8aa5d7319` (identical) |
| Constant callback == held Intent | n/a | 1,118/1,118 |
| Feedback law == an independent World stepped with the same law | n/a | 1,118/1,118 |
| Callback receives a scratch body, never the source | n/a | 1,118/1,118 |
| A callback that vandalizes its body: source unchanged, nothing left behind, interleaved candidates (12, 5, 8 steps) each equal independent runs | n/a | 0 failures in each, 1,118 each |
| RNG, `sim.see`, `perceive` calls while a preview runs (all 20 plays) | 0 / 0 / 0 | 0 / 0 / 0 |
| Results identical with probe and spies on vs off | yes | yes |
| Preview calls / feedback calls | 10,231 / 0 | 10,848 / 782 (blocking 540, climb-access 242) |
| World steps in previews | 138,452 | 156,212 (+12.8%) |
| Decisions (same body, same time) / calls per decision / most candidates in one decision | 4,543 / 2.25 / 14 | 4,633 / 2.34 / 13 |
| Total median play time, 20 plays (18 live), 3 reps per run | 2,579 and 2,477 ms | 2,685, 2,615 and 2,834 ms |
| 12-step preview, µs per call: Intent / constant callback / feedback law | 65.2 / n/a / n/a | 62.6–66.7 / 63.0–71.6 / 62.5–66.6 |

Notes: two of the 20 set plays are dead-ball pre-snap fouls (S7-P027 false start, S8-P004 neutral zone), so there is no football in them. The two arms also differ in
blocking behavior (the PR changes it), so the count differences mix preview use with different play; the microbenchmark is the pure per-call cost, and shows no callback overhead beyond noise.
By that microbenchmark, preview World steps are roughly 30% of a play's run time on both arms (about 5.4 µs per step). The timing runs are noisy in this container.

Code read of the three callbacks (`demand` and `control` in `blocking.ts` `plannedClimb`, `accessCommand` in `climb-access.ts`): each reads only its scratch body, constants fixed at creation
(`meet`, `seen.vel` from a fresh `Perceived`, `a.profile.vmax`, a cloned `read`), and nothing from `sim` or an RNG. `Readonly<Body>` is a type, not a freeze; the vandalism test shows a mutating callback cannot leak.
The "cannot observe another live body" promise is a convention enforced by these three closures, not by the API: a callback can capture anything.
Not checked: whether the preview improves football outcomes, the 7 known-red tests, the Play Lab scenarios.
