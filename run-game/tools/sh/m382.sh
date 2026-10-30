S=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad
export PATH=$S/node/node-v22.23.3-linux-x64/bin:$PATH
cd /home/user/fs-stk && git checkout -q -B run/G2-382-check origin/develop && git log --oneline -1
rep() { arm=$1; for s in 7 9 11 13; do npm run -s baseline:run -- --candidate -- node --import tsx scripts/diag/matched-restage.ts replay $s $arm --run-only --shifts 3 > out/rep$arm$s.log 2>&1 & done; wait; tail -qn1 out/rep$arm*.log; }
rep D9A
git merge -q --no-edit 5f06af56 && git log --oneline -2
rep M382
node --import tsx scripts/diag/matched-restage.ts compare D9A M382 7 9 11 13 --run-only --list 40 > $S/m382-compare.txt 2>&1; head -50 $S/m382-compare.txt
git checkout -q run/G2-stalk-assignment && git log --oneline -1
echo M382DONE
