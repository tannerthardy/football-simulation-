# Play Lab clips for Tanner: today's merges

Six clips, never more than two per change, each a Play Lab scenario plus a note. Built on develop `b559fdc` (engine source SHA256 `0dea552c…`),
Node v22.22.0, with `scripts/diag/lab-clips.ts`. All six notes replay with **REPRODUCED** and "engine source IDENTICAL":

```sh
npm ci && npm run build   # as usual
for k in 274a-scramble 274b-stepup 275-edge 279-gaps 281-seal 273-remote; do
  npm run lab:replay -- artifacts/lab-clips/notes/note-$k.json | grep -E "Engine:|Note recorded"; done
```

## Open them in the Lab
```sh
mkdir -p out/lab/scenarios out/lab/notes
cp artifacts/lab-clips/scenarios/*.json out/lab/scenarios/ && cp artifacts/lab-clips/notes/*.json out/lab/notes/
npm run lab          # http://localhost:4173/ → Library → "clip-…", then Notes to jump to each moment
```
The `-off` scenarios are the same play with the change's switch off (`flags` in the file), for the Compare view.
A note's `players` are the two bodies to watch; `at` and `window` are the moment. Each note's text carries the duty, what changed, the alternative and one question.

| Clip | Change | Files | Watch | Moment |
|---|---|---|---|---|
| 274a | #274 scramble cue | `scenarios/clip-274a-scramble.json`, `notes/note-274a-scramble.json` | D:LB_M, D:CB_S | 3.2–5.2 s |
| 274b | #274 scramble cue | `scenarios/clip-274b-stepup.json`, `notes/note-274b-stepup.json` | D:LB_M, D:NB | 3.0–3.9 s |
| 275 | #275 edge contain | `scenarios/clip-275-edge.json` (+ `-off`), `notes/note-275-edge.json` | D:DE_W, O:H | 0.7–2.8 s |
| 279 | #279 gap fits | `scenarios/clip-279-gaps.json` (+ `-off`), `notes/note-279-gaps.json` | D:LB_W, D:LB_M | 0.3–1.6 s |
| 281 | #281 seal hold | `scenarios/clip-281-seal.json` (+ `-off`), `notes/note-281-seal.json` | O:LT, D:DE_W | 3.2–5.4 s |
| 273 | #273 remote grab (held) | `scenarios/clip-273-remote.json`, `notes/note-273-remote.json` | D:SS, O:Z | 2.8–4.0 s |

## The clips

### 274a: Smash vs Cover 3, the QB takes off at 3.4 s (play seed 4)
- **Duty:** Gun doubles Smash against the nickel Over in Cover 3; Mike has the strong hook, nickel and strong safety the curl-flats, free safety the deep middle, corners the deep thirds.
- **What changed:** each defender reacts only to his own delayed picture of a QB who is carrying and heading for the line (>2.5 yd/s at the front of the pocket, or outside the tackles heading downfield), not the true scramble flag. Underneath zones come up; man and deep-zone defenders stay with their receivers until the QB crosses the line.
- **Facts (matched):** scramble event 3.40 s; the QB crosses the line at 5.00 s. First request toward the QB, relative to the scramble: rushers already there (−0.05 to +0.05 s), Mike +0.05 s, Will +0.40 s, nickel/strong safety/free safety +0.55 s, both corners +1.70 s. Result: slide, 5.58 yd.
- **Alternative:** an underneath defender stays on his curl-flat until the QB crosses the line, as the corners do.
- **Question:** the Mike comes up at once, nickel, strong safety and free safety about half a second later, the corners at the line: is that the right order for Cover 3?

### 274b: same play, play seed 15, the QB steps up and throws
- **Duty:** same Smash against Cover 3; tackles driven back and the pocket collapses from the edges.
- **What changed:** a step-up inside a collapsing pocket is not runner evidence (the cue's front of the pocket is never deeper than 2 yd behind the line).
- **Facts:** no scramble event; throw at 3.75 s, incomplete. The QB's peak forward speed is 2.2 yd/s at 3.45 s, 7.0 yd behind the line, with the tackles 10.5 yd behind the line. **This is the quiet side, not a stress test:** 2.2 yd/s is below the cue's 2.5 yd/s threshold, and no fast, deep step-up occurred in the 600 snaps I scanned (four pass concepts × four coverages × 30 seeds, plus a mobile-QB Smash/Dagger variant × two coverages × 30 seeds), so the unit-test case for "fast but deep" has no natural film.
- **Alternative:** a defender who reads any forward QB movement as a run comes up and opens the throw behind him.
- **Question:** this QB climbs about 2.2 yd/s at the back of a collapsing pocket and throws; is there anything in that picture a real linebacker would read as "he's running"?

### 275: weak wide zone, the blocked end (play seed 2)
- **Duty:** Singleback Twin TE, weak wide zone, nickel 4-3 Under in Cover 3. The H (second tight end) blocks the weak-side end.
- **What changed:** `EDGE_CONTAIN` (on): a blocked edge bounds his lateral objective to just outside where the back's observed track crosses his depth; if already wider he stops and holds. Before, end and blocker chased each other down the line.
- **Facts (matched pair, `-off` = `EDGE_CONTAIN=0`):** lateral travel toward the sideline while engaged: end 1.1 yd and blocker 1.8 yd (on, 1.0–2.55 s) against end 5.4 yd and blocker 5.3 yd (off, 1.0–3.0 s). Run 2.76 yd, tackled by the end, against 2.20 yd, tackled by the Mike.
- **Alternative:** the old arm, or an end who keeps playing outside the blocker's shoulder to set the edge whatever the back does.
- **Question:** once the tight end has him and he is already outside the back's track, should the end hold his ground and make the back bend, or keep sliding outside the blocker to set the edge?

### 279: nickel Under vs 12 personnel, who has the weak C (play seed 2)
- **Duty:** same offense in Cover 2 (nickel 4-3 Under). Will and Mike are the insert backers, corners are force, nickel, free and strong safety the alley players.
- **What changed:** `GAP_MATCH` (on): the backers' open gaps are filled as a set, not nearest-first; the gap left open is one an alley player still covers on that side, never an A gap or an unsupported gap.
- **Facts (matched pair, `-off` = `GAP_MATCH=0`, fits at 0.5 s):** on: Will weak C, Mike weak A, strong B has no named fit (left to the strong-side alley safety); off: Will weak A, Mike strong B, weak C unowned. Run 1.95 yd, tackled by the end, against 10.09 yd, tackled by the nickel.
- **Alternative:** nearest-first fits.
- **Question:** the Will now has the weak C and the Mike slides to the weak A, which leaves the strong B to the strong-side alley safety: against a weak-side run, is that the fit you want?

### 281: Gun Trey Duo, the tackle and the end (captured run, seed 9 game, play 130)
- **Duty:** the left tackle blocks the weak-side end with his hands on him; a drive block, not a reach.
- **What changed:** `SEAL_HOLD` (on): once the blocker's hands are loaded, his seal correction targets the leverage he caught the man with instead of running to the end's outside at his top lateral request and carrying him along.
- **Facts (matched pair, `-off` = `SEAL_HOLD=0`):** lateral travel toward the sideline while engaged: end −4.0 yd (driven 4 yd toward the middle) and tackle −3.2 yd (on, 3.5–5.45 s), against end +5.5 and tackle +5.9 yd (off, 3.9–5.9 s). Run 3.18 yd, tackled by the corner, against 4.55 yd, tackled by the nickel. The setup is the restage's off-arm capture, `SEAL_HOLD=0 … seal-hold-restage.ts capture 9` (I could not find the PR's own P46/P123/P99 snaps in today's seed 10 and 11 captures, so this is the best fixed duo rep from the seed 7–11 restage on today's engine).
- **Alternative:** the old arm, or a tackle who gives ground and takes the end where the end wants to go.
- **Question:** the tackle caught the end on his inside half and now drives him from there instead of walking outside to get head-up: is that how a tackle blocks the end on a duo?

### 273: a strong safety grabs a receiver beyond arm's length (held PR; captured pass, seed 7 game, play 117)
- **Duty:** Pistol Doubles Slant-Flat against Palms; the strong safety is a curl-flat player who breaks on the catch.
- **What changed:** nothing yet on develop; #273 makes a hold form only if the hands can reach the runner.
- **Facts:** the safety's lunge forms a hold at 3.15 s, 1.88 yd center to center against the 1.41 yd standing arm's length (the engine's own: both radii plus 0.9 × his reach), 0.46 yd past it (0.65 yd from his center to reach + target radius). The receiver runs 5.5 yd/s, the safety 3.0. Result: tackle, 13.55 yd. **With #273's head merged into this develop** (local merge `be5bd60`, not published; `git merge f6edaa0aa1ce6d7704cd2b6f6242b2d0288a27cc`), the same snap is a **78.27-yd touchdown**: the safety no longer holds and the corner's wrap slips at 3.35 s.
- **Counts:** 22% (35/158) of grasps in one seed-7 game form past the engine's own standing arm's length, 42% (67/158) under the stricter "reach + target radius from the holder's center" reading (`scripts/diag/remote-grasp-scan.ts`). #273's table says 190 of 371 on its own snaps, so the stricter reading is closer. The `/mnt/project-files/tackle-reach/develop-6ae4bd8/` setups were not available in this container, so this example comes from a fresh develop game.
- **Alternative:** the safety misses and the receiver keeps running (the merged result above).
- **Question:** the safety is about half a yard past arm's length when the hold forms, with the receiver at 5.5 yd/s and him at 3: should a tackle that reaches this far ever hold, or is that a miss?

## Rebuild
```sh
SEAL_HOLD=0 node --import tsx scripts/diag/seal-hold-restage.ts capture 9 out/seal-hold
node --import tsx scripts/diag/remote-grasp-scan.ts 7                       # → out/lab-clips/remote-grasp-seed7.json
node --import tsx scripts/diag/lab-clips.ts build artifacts/lab-clips        # scenarios, notes, facts/*.json (matched pairs in separate processes)
```
Each `facts/*.json` holds the measured numbers above with the commit, engine SHA256 and every resolved switch.
