#!/bin/bash
# Build an instrumented scratch copy of this working tree for branches.ts and
# tagdump.ts: a new detached git worktree at HEAD plus the uncommitted changes,
# with every return in the behavior files tagged file.function@line.
# Observation only; the copy is never committed.
#
# Safety: DIR must be a new path outside this repository. The only existing
# directory it will replace is one it created itself (it carries the marker
# file .instrumented-copy and is registered as a worktree); it never resets,
# cleans or overwrites any other checkout.
# usage: scripts/diag/stretch/instrument.sh DIR
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: instrument.sh DIR" >&2; exit 1; }
M=$(git rev-parse --show-toplevel)
D=$(realpath -m "$1")
case "$D/" in "$M"/*) echo "refusing: $D is inside the repository $M" >&2; exit 1;; esac
if [ -e "$D" ]; then
  if [ -f "$D/.instrumented-copy" ] && git -C "$M" worktree list --porcelain | grep -qx "worktree $D"; then
    git -C "$M" worktree remove --force "$D"
  else
    echo "refusing: $D exists and is not an instrumented copy made by this script" >&2; exit 1
  fi
fi
git -C "$M" worktree add --detach "$D" HEAD > /dev/null
touch "$D/.instrumented-copy"
cd "$D"
git -C "$M" diff --binary HEAD | git apply --allow-empty
(cd "$M" && git ls-files --others --exclude-standard -- src scripts config test viewer | tar cf - -T -) | tar xf -
ln -s "$M/node_modules" node_modules
mkdir -p out; ln -s "$M/out/mechanics" out/mechanics
node scripts/diag/stretch/tagreturns.mjs src/sim/behaviors/*.ts src/sim/run-fits.ts src/sim/approach-control.ts \
  src/sim/coverage/*.ts src/sim/zone-reach.ts src/sim/contact-motion.ts src/sim/route-motion.ts \
  src/sim/catch-approach.ts src/sim/collection-approach.ts > /dev/null
echo "(globalThis as any).__tag ??= (_l: string, v: unknown) => v;" > src/tagdefault.ts
sed -i "1i import '../tagdefault.js';" src/sim/playsim.ts
echo "instrumented copy: $D (remove with: git worktree remove --force $D)"
