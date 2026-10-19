#!/bin/bash
# Selected PR #153 review witnesses. Each runs through scripts/baseline.mjs
# --candidate (receipt binds commit, source digest and resolved flags) and
# writes out/rgv3w/NAME.json plus out/rgv3w/receipts/NAME.json. The w7-1c5
# pair runs the reviewed commit 1c578afb in a detached worktree under
# out/rgv3w/ with the current witness tool copied in. Then bundles everything
# into data/reviews/current/run-game-v3-witnesses.json.
# usage: bash scripts/diag/stretch/witnesses.sh  (Node from .nvmrc on PATH)
set -euo pipefail
cd "$(dirname "$0")/../../.."
mkdir -p out/rgv3w/receipts
run() { local name=$1 c=$2 slots=$3 from=$4 to=$5 every=$6; shift 6; local fl=(); for f in "$@"; do fl+=(--flag "$f"); done
  node scripts/baseline.mjs --candidate ${fl[@]+"${fl[@]}"} --receipt out/rgv3w/receipts/$name.json -- node --import tsx \
    scripts/diag/stretch/witness.ts --case $c --slots $slots --from $from --to $to --every $every --out out/rgv3w/$name.json \
    | grep -v '^Running\|^Profile'; }
PKG="UC_MESH=1 ZONE_TE=1 STRETCH_FLAT=1 LB_KEY=1"
MS=RB,QB
# Mesh: shotgun spot/tempo 2x2, under-center package with and without tempo.
G=iz/strong/gun_doubles_11/over3/pair11/77
run w1-gun-default $G $MS 0 2.5 1
run w1-gun-tempo $G $MS 0 2.5 1 MESH_TEMPO=1
run w1-gun-side $G $MS 0 2.5 1 GUN_MESH_SIDE=1
run w1-gun-tempo-side $G $MS 0 2.5 1 MESH_TEMPO=1 GUN_MESH_SIDE=1
U=iz/strong/ace_12/over3/pair11/77
run w2-uc-default $U $MS 0 2.5 1
run w2-uc-package $U $MS 0 2.5 1 $PKG
run w2-uc-package-tempo $U $MS 0 2.5 1 $PKG MESH_TEMPO=1
# Adverse shotgun OZ with the own-side spot.
O=oz/strong/gun_doubles_11/odd3/pair31/1
run w3-gunoz-default $O RB,QB,LT,LG,C,RG,RT,Y,NT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W 0 3.5 4
run w3-gunoz-side $O RB,QB,LT,LG,C,RG,RT,Y,NT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W 0 3.5 4 GUN_MESH_SIDE=1
# Adverse power tail: package without and with tempo.
P=power/strong/i_pro_21/wide9/pair11/77
run w4-power-package $P RB,F,LG,CB_S,CB_W,NB,FS,SS,LB_M,LB_W 0 4.5 4 $PKG
run w4-power-package-tempo $P RB,F,LG,CB_S,CB_W,NB,FS,SS,LB_M,LB_W 0 4.5 4 $PKG MESH_TEMPO=1
# Shotgun IZ ZONE_TE: adverse case and opposing control.
T=iz/strong/gun_doubles_11/odd3/pair11/77
run w5-gunte-default $T RB,QB,Y,RT,NT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W 0 4 4
run w5-gunte-zonete $T RB,QB,Y,RT,NT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W 0 4 4 ZONE_TE=1
TC=iz/weak/gun_doubles_11/over3/pair11/1
run w5-gunte-control-default $TC RB,QB,Y,LT,RT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W,LB_S 0 4 4
run w5-gunte-control-zonete $TC RB,QB,Y,LT,RT,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W,LB_S 0 4 4 ZONE_TE=1
# SHED_PURSUE (contact review pending): favourable case and opposing control.
SS=RB,DE_W,DE_S,DT_S,DT_W,LB_M,LB_W,LB_S,FS,SS
run w6-shed-tempo oz/strong/ace_12/off1/pair11/77 $SS 0 5 4 $PKG MESH_TEMPO=1
run w6-shed-pursue oz/strong/ace_12/off1/pair11/77 $SS 0 5 4 $PKG MESH_TEMPO=1 SHED_PURSUE=1
run w6-shed-control-tempo oz/strong/ace_12/over4/pair11/6 $SS 0 5 4 $PKG MESH_TEMPO=1
run w6-shed-control-pursue oz/strong/ace_12/over4/pair11/6 $SS 0 5 4 $PKG MESH_TEMPO=1 SHED_PURSUE=1
# MESH_TEMPO with UC_MESH off under center: now a no-op here; at the reviewed
# commit the back runs past and the QB keeps (every OZ/WZ snap, and weak
# I-formation power whose installed call precedes the QB's arrival).
H=oz/strong/ace_12/over3/pair11/77
run w7-head-oz-default $H $MS 0 4 1
run w7-head-oz-tempo $H $MS 0 4 1 MESH_TEMPO=1
WT=out/rgv3w/wt-1c578afb
[ -d $WT ] || { git worktree add -q --detach $WT 1c578afb && ln -s "$PWD/node_modules" $WT/node_modules; }
cp scripts/diag/stretch/witness.ts $WT/scripts/diag/stretch/witness.ts
for c in oz:$H wz:wz/weak/ace_12/under3/pair31/3 power:power/weak/i_pro_21/over3/pair31/77; do
  for f in default tempo; do
    n=w7-1c5-${c%%:*}-$f; fl=(); [ $f = tempo ] && fl=(--flag MESH_TEMPO=1)
    (cd $WT && node scripts/baseline.mjs --candidate ${fl[@]+"${fl[@]}"} --receipt ../receipts/$n.json -- node --import tsx \
      scripts/diag/stretch/witness.ts --case ${c#*:} --slots $MS --from 0 --to 4 --every 1 --out ../$n.json | grep -v '^Running\|^Profile')
  done
done
python3 - <<'PY'
import glob, hashlib, json, os
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
tools = {p: sha(p) for p in ['scripts/diag/stretch/witnesses.sh', 'scripts/diag/stretch/witness.ts', 'scripts/diag/stretch/witsum.py']}
rows = []
for path in sorted(glob.glob('out/rgv3w/w*.json')):
    name = os.path.basename(path)[:-5]
    rows.append({'name': name, 'sha256': sha(path), 'receipt': json.load(open(f'out/rgv3w/receipts/{name}.json')),
                 'witness': json.load(open(path))})
bundle = {'description': 'Selected PR #153 review witnesses (observation only). Each entry: the witness file checksum, '
          'the scripts/baseline.mjs --candidate receipt (commit, source digest, resolved flags, command) and the witness '
          '(case, roster pair, seed, resolved profile flags, commit, tool hash, events, sampled ticks). '
          'Regenerate with scripts/diag/stretch/witnesses.sh; summarise with scripts/diag/stretch/witsum.py.',
          'tools': tools, 'witnesses': rows}
open('data/reviews/current/run-game-v3-witnesses.json', 'w').write(json.dumps(bundle, separators=(',', ':')) + '\n')
print(len(rows), 'witnesses ->', 'data/reviews/current/run-game-v3-witnesses.json', os.path.getsize('data/reviews/current/run-game-v3-witnesses.json'), 'bytes')
PY
