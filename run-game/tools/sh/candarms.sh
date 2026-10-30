S=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad
cd /home/user && bash $S/ctrarm.sh fs-cand CAND0 X=1
cd /home/user/fs-cand && git cherry-pick 5e69fa82 >/dev/null && git log --oneline -1
cd /home/user && bash $S/ctrarm.sh fs-cand CAND2 X=1
echo CANDDONE
