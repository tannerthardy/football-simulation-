#!/bin/bash
# Build an instrumented scratch copy of this working tree for branches.ts and
# tagdump.ts: a detached git worktree at HEAD plus the uncommitted changes, with
# every return in the behavior files tagged file.function@line. Observation only;
# the copy is never committed. usage: scripts/diag/stretch/instrument.sh DIR
set -e
D=$1; M=$(git rev-parse --show-toplevel)
[ -n "$D" ] || { echo "usage: instrument.sh DIR"; exit 1; }
[ -d "$D/.git" ] || [ -f "$D/.git" ] || git -C "$M" worktree add -f --detach "$D" HEAD > /dev/null
cd "$D"
git checkout -q --detach "$(git -C "$M" rev-parse HEAD)"
git reset -q --hard; git clean -qfd -e node_modules -e out
git -C "$M" diff HEAD | git apply --allow-empty
(cd "$M" && git ls-files --others --exclude-standard -- src scripts config test viewer | tar cf - -T -) | tar xf -
ln -sfn "$M/node_modules" node_modules
mkdir -p out; ln -sfn "$M/out/mechanics" out/mechanics
node scripts/diag/stretch/tagreturns.mjs src/sim/behaviors/*.ts src/sim/run-fits.ts src/sim/approach-control.ts \
  src/sim/coverage/*.ts src/sim/zone-reach.ts src/sim/contact-motion.ts src/sim/route-motion.ts \
  src/sim/catch-approach.ts src/sim/collection-approach.ts > /dev/null
echo "(globalThis as any).__tag ??= (_l: string, v: unknown) => v;" > src/tagdefault.ts
sed -i "1i import '../tagdefault.js';" src/sim/playsim.ts
echo "instrumented copy: $D"
