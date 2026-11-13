#!/bin/sh
# usage: scripts/diag/pursuit/ab.sh LABEL [ENV=VAL ...] -> out/pc/LABEL-{101,202}.jsonl.gz/.json/.log (seeds in parallel)
label=$1; shift
for seed in 101 202; do
  ( env "$@" node --import tsx scripts/mechanics/sim-export.ts --seed $seed --games 8 --out out/pc/$label-$seed.jsonl.gz > out/pc/$label-$seed.log 2>&1
    python3 -I scripts/mechanics/measure.py out/pc/$label-$seed.jsonl.gz out/pc/$label-$seed.json --label "$label seed $seed" 2>>out/pc/$label-$seed.log ) &
done
wait; echo "$label done"
