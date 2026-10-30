S=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad
export PATH=$S/node/node-v22.23.3-linux-x64/bin:$PATH
pt() { w=$1; arm=$2; cd /home/user/$w; for batch in "7 9 11 13" "15 17 19 21" "23 25 27 29"; do
  for s in $batch; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $arm --run-only --shifts 2 --trace --concept power,trap > out/rep$arm$s.log 2>&1 & done; wait; done; }
cd /home/user && bash $S/ctrarm.sh fs-ctr2 CB5 X=1
cd /home/user/fs-cand && git stash push -q -m kick -- src/sim/behaviors/blocking.ts && pt fs-cand PTK0
cd /home/user/fs-cand && git stash pop -q && git diff --stat -- src && pt fs-cand PTK1
echo KICKDONE
