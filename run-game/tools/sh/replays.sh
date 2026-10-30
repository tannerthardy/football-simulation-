export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
for w in before after; do
  cd /home/user/fs-meas-$w
  for s in 7 9 11 13; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $w --run-only --shifts 4 --trace > out/rep$s.log 2>&1 & done
  wait
done
echo ALLDONE
