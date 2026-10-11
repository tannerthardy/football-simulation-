# Final frozen run guards

Existing 162-input collector ran from `out/tackle-breakthrough/final-source`,
source `8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942`.
Source before/after is identical; collector SHA is the unchanged
`1e6180d476b3a8ff5476badcf02309cf8706adcf0e954d9e475c4cce5f3685f6`.
Both comparisons validate the exact original cohort and every one of 162 IDs,
initial physical projections and profile hashes. All 162 observer/plain controls
pass. Natural outcomes, censors and fumbles are inspected over the full play;
terminal defensive return locations never supply offense gain. No source edits.

## Ordinary 160

| Guard | Immutable baseline | v3 | Final |
| --- | ---: | ---: | ---: |
| Mean offense yd | 3.344 | 2.828 | 2.534 |
| Median yd | 1.77 | 1.73 | 1.755 |
| Stuff <=0 yd | 26 | 33 | 28 |
| 10+ yd | 6 | 4 | 4 |
| 20+ yd | 3 | 1 | 0 |
| Fixed 4-yd first-down gain proxy | 35 | 36 | 37 |
| Fumble events / recorded lost | 2 / 1 | 0 / 0 | 1 / 1 |
| Missed / broken tackle events | 14 / 18 | 10 / 17 | 10 / 18 |
| First-contact yard proxy | .789 | .598 | .631 |
| Holding event flags | 34 | 31 | 34 |
| OL falls / downs | 7 / 4 | 4 / 3 | 6 / 5 |
| Natural / censored / touchdown | 160 / 0 / 2 | 160 / 0 / 1 | 160 / 0 / 0 |

Against baseline, 69 gains rise, 85 fall and six are equal. Against v3, 57 rise,
61 fall and 42 are equal; 29 complete executions are identical. All pair results
and adverse classifications are retained. Lower mean yards are not themselves
a physics or NFL-realism verdict, and a four-yard gain proxy is not a full
situational success metric. Contact/holding labels are engine events, not
independent NFL body-contact truth or enforcement outcomes.

Both originally selected touchdowns now end by tackle, while real failed
wraps and a useful assist remain visible:

- Split Zone/Over/left/S11: baseline70, v3 70, final13.05. SS wraps3.10 and
  slips3.30; FS wraps3.60 and slips3.85. CB_S assists with a hit3.80 and
  completes the tackle4.65. Final does not force the initial wrap to succeed.
- Split Zone/Odd/right/S11: baseline70, v3 11.84, final11.88. CB_S wraps and
  hits3.75 and completes the tackle4.30.

No new or increased 20+ completed run, touchdown or censor appears against
either source. The final set has no touchdown at all, which establishes this
fixed cohort's result rather than banning legitimate open-field runner wins.
The separate head-start/slow-runner controls and native approach panel remain
necessary to assess when the defense should fail.

## New fumble and remaining adverse controls

One new lost fumble appears against both baseline and v3:
`CT-R1-wz_strong-under-R-S3`, final offense gain1.73, turnover=true and
fumbleLost=true. SS wraps4.15; CB_S hits and induces the fumble4.40, recovers
4.75; Y tackles the defensive returner6.40. Previous offense gains are
baseline-.28 and v3-.94, so improved offensive gain does not make this a
non-adverse turnover. The defensive return's terminal position is unrelated
to the reported offense gain.

All other categorical adverse cases against v3:

- IZ/Odd/right/S11: extra OL fall and down; 3.62→2.21.
- IZ/Tite/right/S3: extra OL fall and down; .76→1.12.
- IZ/Bear/left/S11: lost fixed 4yd proxy, added holding flag; 5.45→.97.
- OZ/Odd/right/S3: added holding flag; 2.80→3.74.
- Power/Under/left/S11: lost fixed 4yd proxy; 7.48→2.60.
- Counter/Over/left/S11: added holding flag; -.02→.50.
- Trap/Odd/right/S3: lost fixed 4yd proxy; 6.60→1.06.
- Trap/Bear/left/S3: added holding flag; -.28→-.36.
- Duo/Over/left/S11: added OL fall; 5.20→4.91.
- Split Zone/Under/left/S11: lost gain-distance conversion; 10.28→7.15.

Additional categorical adverse cases against immutable baseline, not v3:
OZ/Under/left/S11 loses fixed4yd proxy6.36→3.52;
OZ/Tite/right/S11 loses conversion22.45→9.10;
WZ/Tite/right/S3 loses fixed4yd proxy4.15→3.60;
Duo/Under/right/S3 loses fixed4yd proxy4.34→3.55;
Duo/Tite/left/S11 adds a holding flag7.88→7.96.
The eleven v3 categories plus these five retained baseline categories cover
all non-gain categorical deteriorations. Full lower-gain pairs remain saved.

## Concept means and supplemental separation

| Concept | Baseline mean | v3 mean | Final mean |
| --- | ---: | ---: | ---: |
| Counter | .412 | .522 | .538 |
| Duo | 2.700 | 2.541 | 2.574 |
| Inside Zone | 2.785 | 2.647 | 2.763 |
| Outside Zone | 3.444 | 2.700 | 2.720 |
| Power | 2.401 | 2.612 | 2.625 |
| Split Zone | 10.761 | 7.139 | 4.757 |
| Trap | 1.843 | 1.955 | 1.679 |
| Wide Zone | 2.401 | 2.510 | 2.618 |

These equal-weight diagnostic calls are not NFL playcalling or roster samples.
Most of the baseline mean reduction comes from the selected touchdown tails;
underlying crowding, contact timing and technique remain separate issues.
The two supplemental controls stay outside the ordinary table: OZ/Over/left/S11
baseline2.34→v3 2.76→final2.36, and Power/Over/right/S3 baseline1.07→v3 .20→
final.20. Both finish naturally by tackle; no fumble or timeout is introduced.

## Files

`runs-final.json.gz`, `runs-final-film.json.gz`, `runs-final.log`.
`run-comparison-final.json` compares immutable baseline with final;
`run-v3-final-comparison.json` isolates the v3→final change. Both use the
unchanged existing read-only run-outcome review. The receipt includes input,
output and tool hashes; historical packet files were not overwritten.
