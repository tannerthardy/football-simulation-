#!/bin/bash
# Run the zone lab in 4 shards with extra env; usage: run.sh LABEL [ENV=VAL ...] [-- lab args]
set -e
label=$1; shift
envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ "$1" == "--" ] && shift
[ -n "${NODE_BIN:-}" ] && export PATH="$NODE_BIN:$PATH"  # optional: a Node 22.23.3 bin dir (.nvmrc)
mkdir -p out/zone-lab; rm -f out/zone-lab/$label-*.jsonl.gz out/zone-lab/$label-*.log
for i in 0 1 2 3; do env "${envs[@]}" node --import tsx scripts/diag/zone-lab/lab.ts --film --seeds ${SEEDS:-77,71001,1,2,3,4,5,6,7,8} --shard $i/4 --out out/zone-lab/$label-$i.jsonl.gz "$@" > out/zone-lab/$label-$i.log 2>&1 & done
wait; cat out/zone-lab/$label-*.log
