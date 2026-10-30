export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
cd /home/user/fs-ctr2
run() { arm=$1; for batch in "7 9 11 13" "15 17 19 21" "23 25 27 29"; do
  for s in $batch; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $arm --run-only --shifts 2 --trace --concept power,trap > out/rep$arm$s.log 2>&1 & done; wait; done; }
git stash push -q -m cb2 -- src/sim/behaviors/blocking.ts && git diff --quiet -- src && run PT0
git stash pop -q && git diff --stat -- src && run PT2
tail -qn 1 out/repPT*.log | sort | uniq -c
echo ALLDONE
