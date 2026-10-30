"""Puller table by concept and pull role from run-film-trace frames (10 Hz).
Per puller (setup plan 'pull' with a pullRole): engaged anyone in the play; first engagement time; that man's
depth vs LOS and whether he is deeper than the carrier then; engaged before the carrier crosses the LOS; deepest
point in 2.5 s.   python3 -I pullroles.py trace.json ..."""
import json, sys, statistics as st
from collections import defaultdict
rows = defaultdict(list)
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        conc = s.get('concept', '?'); fam = 'counter' if 'counter' in conc else 'power' if 'power' in conc else 'trap' if 'trap' in conc else conc
        car = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        cross = next((f['t'] for f in fr if car is not None and f['c'] == car and f['a'][car][0] - los > 0), None)
        for a in ag:
            if a['team'] != 'O' or a['plan'] != 'pull' or not a['role']: continue
            i = a['i']; first = None
            for f in fr:
                e = f['a'][i][5]
                if e >= 0 and ag[e]['team'] == 'D':
                    cx = f['a'][car][0] if car is not None and f['c'] == car else None
                    first = (f['t'], f['a'][e][0] - los, cx - los if cx is not None else None, ag[e]['slot']); break
            deep = min([f['a'][i][0] - los for f in fr if f['t'] <= 2.5] or [0])
            rows[(fam, a['role'])].append(dict(id=p['id'], eng=first is not None, t=first[0] if first else None,
                manx=first[1] if first else None, behind=(first is not None and first[2] is not None and first[1] < first[2] - 0.5),
                before=(first is not None and (cross is None or first[0] <= cross)), deep=deep))
print('concept/role: n, engaged anyone, first engagement s (p50), engaged before carrier crosses, first man deeper than carrier, deepest p50')
for k in sorted(rows):
    r = rows[k]; n = len(r); e = [x for x in r if x['eng']]
    med = lambda v: round(st.median(v), 2) if v else None
    print(f'  {k[0]:8} {k[1]:5}: {n:4}  {len(e)/n:.0%}  {med([x["t"] for x in e])}  {sum(x["before"] for x in r)/n:.0%}  {sum(x["behind"] for x in r)} ({sum(x["behind"] for x in r)/max(1,len(e)):.0%} of engaged)  {med([x["deep"] for x in r])}')
