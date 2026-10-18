#!/bin/bash
# Open-field tracer in 4 shards; usage: run.sh LABEL [ENV=VAL ...] [-- trace args]
set -e
label=$1; shift
envs=(); while [ $# -gt 0 ] && [ "$1" != "--" ]; do envs+=("$1"); shift; done; [ "$1" == "--" ] && shift
[ -n "${NODE_BIN:-}" ] && export PATH="$NODE_BIN:$PATH"  # optional: a Node 22.23.3 bin dir (.nvmrc)
mkdir -p out/open-field; rm -f out/open-field/$label-*.jsonl.gz out/open-field/$label-*.log
for i in 0 1 2 3; do env "${envs[@]}" node --import tsx scripts/diag/open-field/trace.ts --shard $i/4 --out out/open-field/$label-$i.jsonl.gz "$@" > out/open-field/$label-$i.log 2>&1 & done
wait; cat out/open-field/$label-*.log
