#!/bin/bash
# usage: [ENV] arm2.sh NAME — zone sets, fate, export on /home/user/fs-rel
S=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad; N=$1; O=/home/user/fs-rel/out/rel/arms-$N; mkdir -p $O; cd /home/user/fs-rel
export PATH=$S/node/node-v22.23.3-linux-x64/bin:$PATH
(node --import tsx scripts/mechanics/sim-export.ts --out $O/export.jsonl.gz > $O/export.log 2>&1; python3 -I scripts/mechanics/climb_reference.py $O/export.jsonl.gz > $O/climb.json) &
for set in set-7-8 set-9-10 current-zone-set set-11-12; do node --import tsx scripts/diag/zone-climb-ordinary.ts measure out/rel/$set.bin $O/$set.json 2>&1 | tail -n 1 | sed "s/^/$N $set: /" > $O/$set.txt & done
node --import tsx $S/climbfate.mts out/rel/set-7-8.bin out/rel/set-9-10.bin out/rel/current-zone-set.bin $O/fate.json 2>/dev/null | head -3 | sed "s/^/$N fate: /" > $O/fate.txt &
node --import tsx $S/climbfate.mts out/rel/set-11-12.bin $O/fate-11-12.json 2>/dev/null | head -3 | sed "s/^/$N fate-holdout: /" > $O/fate-11-12.txt &
wait
cat $O/*.txt
python3 -c "
import json
v=list(json.load(open('$O/climb.json')).values())[0]; c=v['climb.backer_distance_at_release.combo']; u=v.get('climb.backer_distance_at_release.uncovered',{'n':0})
print('$N export', v['plays'], 'climbers/zone run %.2f'%((c['n']+u['n'])/v['plays']['zone_runs']), 'dist p50',c['p50'],'touched first',v['climb.backer_contacted_before_carrier.combo']['share'],'dep speed',v['climb.departure_speed_0.5s.combo']['p50'])"
