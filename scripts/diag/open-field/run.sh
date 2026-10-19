#!/bin/bash
# Open-field tracer in 4 shards with bound provenance (see arm.mjs): applies the
# pinned baseline profile plus the listed overrides, not ambient flags, and
# writes out/open-field/LABEL.manifest.json.
# usage: run.sh LABEL [FLAG=VALUE ...] [-- trace args]
set -e
[ -n "${NODE_BIN:-}" ] && export PATH="$NODE_BIN:$PATH"  # optional: a Node 22.23.3 bin dir (.nvmrc)
node scripts/diag/open-field/arm.mjs "$@"
