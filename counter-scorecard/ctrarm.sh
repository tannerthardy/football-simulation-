# usage: ctrarm.sh <worktree> <ARM> [ENV=VAL ...]
export PATH=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/node/node-v22.23.3-linux-x64/bin:$PATH
w=$1; arm=$2; shift 2; cd /home/user/$w
for batch in "7 9 11 13" "15 17 19 21" "23 25 27 29"; do
  for s in $batch; do env "$@" npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $arm --run-only --shifts 4 --trace --concept counter > out/rep$arm$s.log 2>&1 & done
  wait
done
tail -qn 2 out/rep$arm*.log | grep -v "^$"
echo ALLDONE
