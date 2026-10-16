#!/bin/bash
# Open-field tracer in 4 shards; usage: run.sh LABEL [ENV=VAL ...] [-- trace args]
set -e
label=$1; shift
envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ "$1" == "--" ] && shift
export PATH=/tmp/claude-0/-home-user-football-simulation-/b98f1354-5437-5610-aee0-b805f99d297e/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
mkdir -p out/open-field; rm -f out/open-field/$label-*.jsonl.gz out/open-field/$label-*.log
for i in 0 1 2 3; do env "${envs[@]}" node --import tsx scripts/diag/open-field/trace.ts --shard $i/4 --out out/open-field/$label-$i.jsonl.gz "$@" > out/open-field/$label-$i.log 2>&1 & done
wait; cat out/open-field/$label-*.log
