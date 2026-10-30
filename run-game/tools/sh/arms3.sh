export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
for pair in "$@"; do
  w=${pair%%:*}; arm=${pair##*:}; cd /home/user/$w
  for s in 7 9 11 13; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $arm --run-only --shifts 4 --trace > out/rep$s.log 2>&1 & done
  wait; tail -qn 1 out/rep*.log
done
echo ALLDONE
