#!/bin/sh
# usage: ab.sh LABEL [ENV=VAL ...]  -> out/trench/LABEL-{101,202}.jsonl.gz + measured json
label=$1; shift
for seed in 101 202; do
  env "$@" node --import tsx scripts/mechanics/sim-export.ts --seed $seed --games 8 --out out/trench/$label-$seed.jsonl.gz > out/trench/$label-$seed.log 2>&1
  python3 -I scripts/mechanics/measure.py out/trench/$label-$seed.jsonl.gz out/trench/$label-$seed.json --label "$label seed $seed" 2>>out/trench/$label-$seed.log
done
echo "$label done"
