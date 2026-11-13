"""Run mechanisms, NFL 2022 vs sim variants (shared metrics.py output).
python3 -I scripts/diag/runblock/compare.py LABEL=sim.json [...]  (NFL 2022/2017 shown first)"""
import json, sys
KEYS = ['run.yards', 'run.yards_before_contact', 'run.yards_after_contact', 'run.first_contact_s', 'run.carrier_cross_los_s',
        'run.engaged_dl_driven_back_1s', 'run.engaged_dl_driven_back_3s', 'run.max_engaged_dl_driven_back_3s', 'contact.run.tackler_speed_at_contact',
        'run.yards@inside_zone', 'run.yards@outside_zone', 'run.yards@gap_pull', 'run.yards@man_duo', 'run.yards@draw']
srcs = [('NFL22', 'data/reviews/mechanics/nfl-bdb2022.json'), ('NFL17', 'data/reviews/mechanics/nfl-bdb2017.json')] + [tuple(a.split('=', 1)) for a in sys.argv[1:]]
data = [(l, json.load(open(p))['metrics']) for l, p in srcs]
for k in KEYS:
    print(k)
    for l, m in data:
        v = m.get(k)
        if v: print(f"   {l:10} n={v['n']:5} p10 {v['p10']:6.2f} p25 {v['p25']:6.2f} p50 {v['p50']:6.2f} p75 {v['p75']:6.2f} p90 {v['p90']:6.2f}")
