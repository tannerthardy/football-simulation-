#!/bin/bash
# Run the zone lab in 4 shards with extra env; usage: run.sh LABEL [ENV=VAL ...] [-- lab args]
set -e
label=$1; shift
envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ "$1" == "--" ] && shift
export PATH=/tmp/claude-0/-home-user-football-simulation-/b98f1354-5437-5610-aee0-b805f99d297e/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
mkdir -p out/zone-lab; rm -f out/zone-lab/$label-*.jsonl.gz out/zone-lab/$label-*.log
for i in 0 1 2 3; do env "${envs[@]}" node --import tsx scripts/diag/zone-lab/lab.ts --film --seeds ${SEEDS:-77,71001,1,2,3,4,5,6,7,8} --shard $i/4 --out out/zone-lab/$label-$i.jsonl.gz "$@" > out/zone-lab/$label-$i.log 2>&1 & done
wait; cat out/zone-lab/$label-*.log
