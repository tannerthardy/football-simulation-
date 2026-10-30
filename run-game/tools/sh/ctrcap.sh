export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
cd /home/user/fs-ctr2
for batch in "15 17 19 21" "23 25 27 29"; do
  for s in $batch; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts capture $s --run-only > out/cap$s.log 2>&1 & done
  wait
done
tail -qn 2 out/cap*.log
echo CAPDONE
