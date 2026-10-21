#!/bin/bash
# Compact depth/pursuit scorecard per lab arm (out/open-field/all/LABEL*.jsonl.gz, see
# scripts/diag/open-field/common.sh). NFL references: out/mechanics/nfl-plays.jsonl.gz
# and nfl-ytg.json (scripts/mechanics/nfl_bdb2025.py --plays-out, nfl_ytg.py).
# usage (repo root): bash scripts/diag/depth/card.sh zone|gap LABEL [LABEL ...]
P=${PY:-python3}; S=scripts/diag/stretch; D=scripts/diag/depth
mode=$1; shift
$P $S/bands.py $mode "$@"
$P $S/survival.py "$@" | tail -n +2
for l in "$@"; do
  f=out/open-field/all/$l.jsonl.gz; c=out/open-field/all/$l-common.jsonl.gz
  echo "== $l"
  $P $S/dbdepth.py $f | grep -E "at cross|downhill"
  $P $D/deepfit.py $f | grep -E "gain (4-9|10-19|20)"
  $P $S/angles.py $c | grep -E "^  (<40|40\+):" | sed 's/| missed.*//'
  $P $S/release.py $f | grep -E "DL:|LB:"
  $P $S/stopper.py $f 5 10 | tail -1
  $P $S/openfield.py $c | grep -E "runs reaching|carrier at"
  $P scripts/diag/open-field/mech.py $f run.defenders_within_2yd_at_end contact.run.carrier_speed_at_contact | grep sim
done
