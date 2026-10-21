# Fixed native panel comparison

Baseline source: `8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`. Candidate source: `c2b65e9f02a95a80dde97625d6e2dd1bdf89da327eb15f2eb093860af08e1ff8`.

All six raw files have stable before/after source guards. Cohort/configuration, collector, profile and recorded input hashes match. All observer/plain controls pass (162 run, 96 passing, 32 approach). The shared World source is unchanged. This reads saved output only.

Ordinary runs: all 160 offensive gains match, mean 2.534188 yd in both phases. 159/160 complete execution signatures match; the two separate supplemental inputs match completely. All 162 are natural, with zero physical timeouts or inspection censors.

Important adverse outcome: `CT-R1-wz_strong-under-R-S3` retains its 1.73-yard offensive gain and lost fumble, but the defensive return changes from 4.04 to 32.43 yards and becomes a defensive touchdown. Duration 6.45→9.75 s, with one new missed and one new broken-tackle event. An identical rushing mean does not mean identical football execution.

Passing: all 96/96 raw rows and complete execution signatures match exactly. Mean 8.755104 yd, 55 completions, 7 interceptions, one sack, 12 gains 20+, no physical timeout. There is no new passing improvement or adverse difference in this fixed panel.

Approach populations stay separate:

- ordinary-native: 15/16 saved encounters exactly match after removing only source pin; inspection censors 0→0, physical timeouts 0→0.
- retained-adverse-split: 4/4 saved encounters exactly match after removing only source pin; inspection censors 0→0, physical timeouts 0→0.
- isolated-encounter: 12/12 saved encounters exactly match after removing only source pin; inspection censors 4→4, physical timeouts 0→0.

One ordinary approach input changes: `TA-R2-iz_strong-over-L-S3`, gain 3.47→3.72 yd, duration 3.40→4.15 s. Its existing contact fumble remains, with created/positively loaded holds 1→4, assists 0→2 and slipping holds 1→3. It still finishes naturally. All 12 isolated encounters, including mirrored crossing, fatigued-crossing and traffic-crossing cases, match exactly. Their four retained six-second censors remain.

Raw run update records now include carrying observations: those field additions are retained and distinguished from motor/execution changes. The corresponding normalized comparison drops only the newly added carrying field. Approach comparison drops only row source pin. Source, old/new input file hashes and collector provenance are in `panel-comparison-receipt.json`; every per-input gain, result, event list and changed contact data is in the compressed comparisons.

These balanced native panels are regression controls, not NFL playcalling frequencies. The selected Duo witness and separate eight-game outcomes must establish the targeted mechanism and integration behavior; this panel does not prove a universal awareness, pursuit or physics improvement.
