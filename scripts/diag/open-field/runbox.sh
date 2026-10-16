#!/bin/bash
# Box tracer in 4 shards; usage: runbox.sh LABEL [ENV=VAL ...] [-- args]
set -e
label=$1; shift
envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ "$1" == "--" ] && shift
export PATH=/tmp/claude-0/-home-user-football-simulation-/b98f1354-5437-5610-aee0-b805f99d297e/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
mkdir -p out/open-field/box; rm -f out/open-field/box/$label-*
for i in 0 1 2 3; do env "${envs[@]}" node --import tsx scripts/diag/open-field/box.ts --shard $i/4 --out out/open-field/box/$label-$i.jsonl.gz "$@" > out/open-field/box/$label-$i.log 2>&1 & done
wait; cat out/open-field/box/$label-*.log
