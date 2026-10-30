# usage: score-dbl.sh worktree ARM  -> filtered traces + dlsign + combo_displacement summary
w=$1; arm=$2; P=/tmp/claude-0/-home-user-football-simulation-/5a83fb11-5781-5214-b4f7-d9b7c3eae862/scratchpad/py
mkdir -p /home/user/$w/out/score-$arm
python3 -I - <<PY
import json
for s in (7, 9, 11, 13):
    d = json.load(open(f'/home/user/$w/out/matched-restage/trace-seed{s}-run-$arm.json'))
    json.dump([p for p in d if p['setup'].get('concept') is not None], open(f'/home/user/$w/out/score-$arm/runs-{s}.json', 'w'))
PY
T=$(ls /home/user/$w/out/score-$arm/runs-*.json)
cd /home/user/fs-cd
python3 -I $P/dlsign.py scripts/mechanics/run_film_reference.py /home/user/fs-pull/out/mechanics/nfl-plays-w12.jsonl.gz $T | grep sim
python3 -I scripts/mechanics/combo_displacement.py --nfl /home/user/fs-pull/out/mechanics/nfl-plays-w12.jsonl.gz --sim $T --out /home/user/$w/out/score-$arm/combo.json > /home/user/$w/out/score-$arm/combo.md 2>&1
python3 -I - <<PY
import json, statistics as st
from collections import Counter
d = json.load(open('/home/user/$w/out/score-$arm/combo.json')); R = d['rows']
for cs in (('INSIDE ZONE',), ('OUTSIDE ZONE',)):
    C = [r for r in R if r["concept"] in cs and r["src"] == "sim"]; K = [r for r in C if r['status'] == 'climb-proxy']
    m = lambda k: f"{st.median([r[k] for r in K if r.get(k) is not None]):.2f}" if K else '-'
    print(f"  combo {cs[0]:12s} episodes {len(C)} climbs {len(K)} | net {m('dl_net_yards')} lat {m('dl_lateral_yards')} dur {m('duration_s')} rate {m('dl_net_rate')} | statuses {dict(Counter(r['status'] for r in C))}")
PY
