"""Kick/trap/lead pullers: x relative to LOS at snap and at 0.3..2.0 s, lateral progress toward the play,
and distance to the target at first engagement. python3 -I pulldepth.py trace.json ..."""
import json, sys, statistics as st
from collections import defaultdict
acc = defaultdict(lambda: defaultdict(list))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        for a in ag:
            if a['team'] != 'O' or a['plan'] != 'pull' or not a['role']: continue
            i = a['i']
            if not fr: continue
            for T in (0.0, 0.3, 0.6, 0.9, 1.2, 1.5, 2.0):
                f = min(fr, key=lambda f: abs(f['t'] - T))
                if abs(f['t'] - T) < 0.06: acc[a['role']][f'x@{T}'].append(f['a'][i][0] - los)
for role, d in acc.items():
    print(role, ' '.join(f'{k}:{st.median(v):.2f}' for k, v in sorted(d.items(), key=lambda kv: float(kv[0][2:]))))
