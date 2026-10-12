#!/bin/sh
# usage: scripts/diag/runblock/ab.sh LABEL [ENV=VAL ...]
# -> out/rb/LABEL-{101,202}.{jsonl.gz,json,log} (shared mechanisms) and out/rb/LABEL-attrib-{101,202}.json
label=$1; shift
mkdir -p out/rb
for seed in 101 202; do
  ( env "$@" node --import tsx scripts/mechanics/sim-export.ts --seed $seed --games 8 --out out/rb/$label-$seed.jsonl.gz > out/rb/$label-$seed.log 2>&1
    python3 -I scripts/mechanics/measure.py out/rb/$label-$seed.jsonl.gz out/rb/$label-$seed.json --label "$label seed $seed" 2>>out/rb/$label-$seed.log ) &
  ( env "$@" node --import tsx scripts/diag/runblock/run-attrib.ts --seed $seed --games 8 --out out/rb/$label-attrib-$seed.json > out/rb/$label-attrib-$seed.log 2>&1 ) &
done
wait; echo "$label done"
