S=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad
cd /home/user/fs-cand && git apply -R $S/kick.patch && git diff --quiet -- src && echo "KQ0 clean"
cd /home/user && bash $S/ctrarm.sh fs-cand KQ0 X=1
cd /home/user/fs-cand && git apply $S/kick.patch && git diff --stat -- src
cd /home/user && bash $S/ctrarm.sh fs-cand KQ1 X=1
echo KQDONE
