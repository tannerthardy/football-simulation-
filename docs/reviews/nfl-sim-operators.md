# NFL-vs-sim trench and pursuit operators

These are measurement scripts that read NFL tracking and sim exports through
one code path. They work on the common play format in
`scripts/mechanics/metrics.py`, and positions are quantized to 0.1 yd on both
sources by `metrics.Play`. All of them use positions only: none reads block
labels, contact events or provider speeds, except where noted. Each prints
NFL and sim side by side when given both files. They take 10–25 s each on the
full NFL file.

**Inputs**
- **NFL:** `python3 -I scripts/mechanics/nfl_bdb2025.py --plays-out
  out/mechanics/nfl-plays.jsonl.gz --out out/mechanics/nfl-bdb2022.json`.
  This is BDB 2025, 2022 weeks 1–9. It needs the fetched archive
  (`data/README.md`) and takes about 2.5 min.
- **Sim:** `npm run baseline:run -- --candidate -- node --import tsx
  scripts/mechanics/sim-export.ts --seed 301 --games 8 --out out/x.jsonl.gz`.
  It takes about 4 min. Two 4-game exports can be joined with `cat a.gz b.gz
  > c.gz`.

**Usage:** `python3 -I scripts/diag/<operator> out/mechanics/nfl-plays.jsonl.gz out/x.jsonl.gz`

**Shared definitions**
- **Line start:** the median time for the five OL to move 0.15 yd. It cancels
  the tracked NFL snap frame's lag of about 0.1 s.
- **Dropbacks without play action:** NFL plays with no PFF run concept; sim
  plays without a `pa_` concept.
- **Engaged:** within 1.0 yd of an offensive non-QB player for 0.2 s or
  longer.
- **Free:** after his last engagement, 2+ frames with nobody within 1.5 yd
  while nearer the QB than his last blocker.
- **Pressure:** a defender within 2 yd of the QB from 0.5 s to the throw, as
  in `metrics.py`.

Current geometric-pressure sampling and unknown denominators are versioned
as [`sampled-geometric-pressure-v2`](pressure-measurement.md). The shared
boundary witnesses also cover `passpro/pressure.py` and `passpro/qbdrop.py`;
their different cohorts and engagement definitions remain separate. Historical
#191/#198 numbers are from the earlier operator, not current validation.

| Operator | Answers | Main outputs |
|---|---|---|
| `scripts/diag/pass-contact.py` | When and where line rushers first meet their blocker; how the OL sets | Contact time, rusher depth and blocker retreat at contact; crossing time; OL retreat by T/G/C at 0.3–1.5 s. Uses block pairs (NFL PFF labels, sim contact events). |
| `scripts/diag/pass-pressure.py` | Who makes the pressure, and how | Pressures per 100 dropbacks by interior, edge or off-ball, and engaged or unblocked; escape (still engaged / through / inside / outside); share of engaged reps that get free. |
| `scripts/diag/edge-rep.py` | How edge rushers beat tackles; who should have blocked unblocked edges | Hip, lateral offset, heading and speeds from first contact, by outcome; exit side; the same-side tackle's and the nearest back's first block. |
| `scripts/diag/interior-rush.py` | Pocket depth, how interior rushers win, the QB's launch point | Blocker and rusher depth and push; the rusher's velocity relative to his blocker; free and off-block rates at equal time; QB depth, step-up and nearest interior rusher at the throw. |
| `scripts/diag/qb-pocket.py` | QB movement after the drop | Set depth and time, step-up, lateral slide; climb and slide after an edge rusher gets level. |
| `scripts/diag/run-hole.py` | Width of the inside-run crease and how it forms | Defender and blocker opening as the back crosses, by concept, and over the last second; nearest DL (matches `gap/reach-contact.py` on run-game-v3). `--uc` keeps under center only. |
| `scripts/diag/long-run.py` | Why long runs get long: pursuit, deep support or tackling | Reach-10/20/40 rates; nearest defenders and bearing at 5 and 10 yd; deep-defender depth, width and trigger speed; chances between 10 and 20 yd. |
| `scripts/diag/pursuit.py` | Pursuit angles and speed | Error against the intercept heading and against pure pursuit; share aiming at the carrier; speed over play max. Binned by distance, carrier speed, cut and run length. |
| `scripts/data/bdb2025_pass_set_contact.py` | Raw-CSV check of `pass-contact.py` | The same contact timing from PFF initial rushers, with men moving at the snap excluded; tracked crossing minus the NGS get-off label. Reads `data/raw/bdb2025/big-data-bowl-data` directly. |

`scripts/diag/arm-power.py` has two modes. `noise` gives game-to-game noise
and the games an arm comparison needs. `pair` gives the first play where two
same-seed arms diverge: the change's first effect in an ordinary game. For
noise intervals on the shared stats, use `npm run scorecard` instead.

The 2026-10-22 results and their readings are summarized in PR #191's
description. They are not kept as files in Git.

**Limits shared by all**
- Velocities are ±0.2 s central differences on the 0.1 yd grid, so speeds
  come in steps of about 0.25 yd/s.
- "Engaged" and "free" are proximity proxies, applied identically on both
  sources.
- Sim samples from 8–16 games give a few hundred reps per cell. Medians move
  by a few tenths between seeds, so compare arms on the same seeds.
- The NFL common format includes scramble-type dropbacks. The raw extractor
  keeps TRADITIONAL dropbacks only.
