# Run Game measurement operators

These are the operators behind Run Game's sim-vs-NFL tables. Each Python file runs the **same code** on the 2022 NFL tracking file (`out/mechanics/nfl-plays.jsonl.gz`, built by the mechanics export; see docs/NFL_DATA.md) and on a sim dump.

- Frames are 0.1 s apart.
- x is depth from the LOS (+ = the defense's side), y is lateral.
- Where an operator says "NFL shifted 0.1 s", NFL frame f+1 is compared with sim frame f (snap-event lag).

## 1. Make a sim dump

The dumps replay the matched restage: `out/matched-restage/seed{7..29 odd}-run.json`, each an array of `{pass, call, setup}`, with `setup` the base64 consumed by `scripts/diag/saved-play.ts` `restoreSetup`. The play id is `s{seed}-{index in that file}`.

```sh
npm run -s baseline:run -- --candidate <flags> -- \
  node --import tsx scripts/diag/run-operators/dump-zone.mts "$PWD" off | grep '^{' > out/rb.jsonl   # OZ/WZ/IZ
#   dump-gap.mts: the same for counter / power / trap
```

Each line holds:
- `concept`, `yards` (`sim.run().yards`), `handoff` (s), `contact` (first `carrier_contact` event);
- `car`: carrier [x, y] per frame;
- `ol`: the five OL's y per frame;
- `def`: every defender's [x, y] per frame;
- `off`: every offensive non-carrier's [x, y] per frame.

The `off` argument is required by every operator that measures blocking.

## 2. Operators (`python3 -I <op>.py <nfl or sim file> [more files]`)

| File | What it measures |
|---|---|
| `hitblk.py` | **First contact**: the first frame after the handoff that any defender's centre is within **1.0 yd** of the carrier's centre. The class is a proximity rule, not a bond, tackle or collision event. **No depth band**: any first contact counts. **Hitter class** at that frame:<br>- `blocked`: an offensive non-carrier within 1.2 yd of the hitter;<br>- `shed`: not blocked, but within 1.2 yd of one on at least 3 of the previous 10 frames;<br>- `free`: otherwise.<br>Group by the hitter's snap depth: line ≤ 1.6, LB ≤ 7, else DB. Yards are play yards **capped at 20** (`min(yds, 20)`), mean per class. Zone only. |
| `stuffbin.py` | Stops by carrier depth at first contact (same contact rule): share of plays, share ending ≤ 0, yards after contact, contact-to-end time. |
| `deephit.py` | First contacts deeper than 1 yd behind the LOS: hitter class (as in hitblk), share ending ≤ 0, carrier speed at contact. First arg is the concept list, e.g. `"OUTSIDE ZONE,INSIDE ZONE"`. |
| `deephit2.py` | Same, with line hitters outside the OL split into play-side and backside edge. Play side is the sign of mean OL lateral motion at 1.0 s. |
| `psend.py` / `bsend.py` | The play-side / backside edge: a defender at depth 0–1.6 yd at the snap, more than 0.5 yd outside the tackle, within 6 yd of the OL centre, and **no offensive non-OL within 1 yd laterally at depth > −2**. Reports his depth and inward squeeze at 0.5/1.0/1.5 s. psend also gives the nearest OL's depth/width and their gap.<br>This class also catches on-line Sams and men later blocked by a wing or H-back from off the line. Inspect reps before reading it as one mechanism. |
| `mugsplit3.py` | Box defenders 0–3.5 yd deep at the snap, by depth band and alignment (outside the tackles ± TE over him ± play side / backside; in a gap; stacked over a DL; over an OL with no DL). Outcome by 1.5 s: `blocked first` (an offensive non-carrier within 1.0 yd before he crosses the LOS), `rushed untouched`, or `sat untouched`. |
| `linestep.py` | The first time at least 4 of 5 OL move laterally the same way faster than 0.7 yd/s (0.2 s central difference). Share of plays by 0.6/1.0/1.5 s, and median OL lateral speed at 0.5 s. |
| `pile.py` | Zone runs, first contact at -1..+3 yd: from contact to the end (NFL `events.end`, sim last frame), carrier forward speed by the number of defenders within 1.0 yd, and when a 2nd / 3rd defender arrives. |
| `hitterback.py` | Zone runs, first contact at -1..+3 yd: the first hitter's x displacement from contact to the end (+ = driven back) and the carrier's gain, split front-on (hitter within 45 deg ahead of the carrier's travel) vs side/rear. |
| `mesh.py` | The handoff mesh by QB alignment (under / pistol / gun, from the QB's snap depth) and concept, at the `handoff` event: QB depth and lateral (from the snap ball, + toward play) and speed, the back's position relative to the QB, centre separation, the back's speed and heading. Also QB depth at 0.3 / 0.6 s and the back's start. Sim dumps need `off` and `handoff` (dump-zone / dump-gap). |
| `trench2.py` | DL (as in trench) classed at 0.5 s by OL within 1.2 yd centre to centre (solo / double / free): depth from the snap at 0.5/1.0/2.0 s, and the share driven back ≥ 0.5 yd **from the 0.5 s position** by 2.0 s vs from the snap. NFL shifted 0.1 s. |
| `trench.py` / `ollat.py` | DL/OL depth and lateral displacement from the snap (trench, NFL shifted 0.1 s), and OL lateral by position from the play side (ollat). Both use `olturn.py`'s loader. |

`lbwho.py` and `olturn.py` are shared loaders.

## 3. Traces (TypeScript, run under `baseline:run`)

- `trace-psedge.mts`: the play-side edge's blocker, request by responsibility stage vs achieved.
- `replay-defender.mts <dir> <plays.json> '{"s9-39":0}'`: replays named restage plays and prints one defender's depth and engagement every 0.25 s.
