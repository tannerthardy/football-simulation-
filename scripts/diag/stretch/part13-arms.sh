#!/bin/bash
PY=${PY:-python3}
GAP="--formations i_pro_21,ace_12 --concepts power,counter,duo,trap --seeds 77,71001,1,2,3"
arm() { local l=$1; shift; node scripts/diag/open-field/arm.mjs $l "$@" > out/open-field/$l.arm.log 2>&1; PY=$PY bash scripts/diag/open-field/common.sh $l > /dev/null 2>&1; echo "$l done: $($PY scripts/diag/open-field/report.py $l 2>/dev/null | grep '^  sim' | head -1)"; }
C="EDGE_SQUEEZE=1 SHED_PURSUE=1 MAN_RUN_COMMIT=1 BLOCK_FRONT=1 DEEP_CAP=1 LB_DEPTH=1 ZONE_TE=1 UC_MESH=1 MESH_TEMPO=1 QB_CARRYOUT=1 PACE_LEAD=1 GAIT_STEP=0.5 FORCE_LEAD=1 PULL_STEP=1 LEAD_READ=1"
arm fl4gap $C -- $GAP
arm st2co $C SPACE_STEER=2
arm st2gap $C SPACE_STEER=2 -- $GAP
arm tr1gap $C TRAP_READ=1 -- $GAP
echo ALL DONE
