#!/bin/bash
# Part 5 witnesses (second-level blocking): DRIVE_CONNECT on a power climb
# that separated, and DEPART_TEMPO on the guard leaving the 3-technique for
# the backer. Each runs through scripts/baseline.mjs --candidate; bundled
# into data/reviews/current/run-game-v3-part5-witnesses.json.
# usage: bash scripts/diag/stretch/witnesses5.sh  (Node from .nvmrc on PATH)
set -euo pipefail
cd "$(dirname "$0")/../../.."
mkdir -p out/rgv3w5/receipts
run() { local name=$1 c=$2 slots=$3 from=$4 to=$5 every=$6; shift 6; local fl=(); for f in "$@"; do fl+=(--flag "$f"); done
  node scripts/baseline.mjs --candidate ${fl[@]+"${fl[@]}"} --receipt out/rgv3w5/receipts/$name.json -- node --import tsx \
    scripts/diag/stretch/witness.ts --case $c --slots $slots --from $from --to $to --every $every --out out/rgv3w5/$name.json \
    | grep -v '^Running\|^Profile'; }
P=power/strong/ace_12/under3/pair31/77
run w8-power-lbsep-default $P RB,LG,LB_S,LB_M,LB_W,CB_S,FS 1.5 4.5 2
run w8-power-lbsep-driveconnect $P RB,LG,LB_S,LB_M,LB_W,CB_S,FS 1.5 4.5 2 DRIVE_CONNECT=1
G=power/weak/i_pro_21/under3/pair11/77
run w9-power-departure-driveconnect $G RB,LG,LT,DT_W,LB_W,DE_W,F 0.9 3.5 2 DRIVE_CONNECT=1
run w9-power-departure-departtempo $G RB,LG,LT,DT_W,LB_W,DE_W,F 0.9 3.5 2 DRIVE_CONNECT=1 DEPART_TEMPO=1
python3 - <<'PY'
import glob, hashlib, json, os
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
tools = {p: sha(p) for p in ['scripts/diag/stretch/witnesses5.sh', 'scripts/diag/stretch/witness.ts', 'scripts/diag/stretch/witsum.py']}
rows = [{'name': os.path.basename(p)[:-5], 'sha256': sha(p), 'receipt': json.load(open(f'out/rgv3w5/receipts/{os.path.basename(p)}')),
         'witness': json.load(open(p))} for p in sorted(glob.glob('out/rgv3w5/w*.json'))]
out = 'data/reviews/current/run-game-v3-part5-witnesses.json'
open(out, 'w').write(json.dumps({'description': 'Run game v3 Part 5 witnesses (second-level blocking; observation only). '
    'Regenerate with scripts/diag/stretch/witnesses5.sh.', 'tools': tools, 'witnesses': rows}, separators=(',', ':')) + '\n')
print(len(rows), 'witnesses ->', out, os.path.getsize(out), 'bytes')
PY
