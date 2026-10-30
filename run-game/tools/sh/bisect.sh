#!/bin/bash
export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
C="--runs iz_strong,oz_strong,power,counter --covs cover1,cover2,cover3,cover4,cover6 --n 6"
run() { # dir name flags...
  local dir=$1 name=$2; shift 2
  (cd $dir && node scripts/baseline.mjs --candidate "$@" -- node --import tsx scripts/diag/depth/forcelab.ts --out out/bx-$name.jsonl $C > out/bx-$name.log 2>&1)
}
V=/home/user/fs-v3c
run /home/user/fs-develop develop --flag PAD_LEVERAGE=1 --flag DL_ANCHOR=1 --flag DL_FLATTEN=1 --flag SNAP_REACT=1 &
run $V base &
run $V HOLD_POINT --flag HOLD_POINT=0 &
wait
run $V TETHER --flag TETHER=0 &
run $V WRAP_BIND --flag WRAP_BIND=0 &
run $V TACKLE_ROLL --flag TACKLE_ROLL=0 &
wait
run $V LEG_BRACE --flag LEG_BRACE=0 &
run $V LEG_FV --flag LEG_FV=0 &
run $V GAIT_STEP --flag GAIT_STEP=0 &
wait
run $V SHED_PURSUE --flag SHED_PURSUE=0 &
run $V LEAN_AXIS --flag LEAN_AXIS=0 &
run $V RUN_ARMS --flag RUN_ARMS=0 --flag RUN_REACH=0 &
wait
echo ALLDONE
