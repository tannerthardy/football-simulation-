"""Kick/lead pullers who never engage anyone: at 1.5 and 2.0 s, where are they, their planned target and the carrier."""
import json, sys, statistics as st
from collections import Counter, defaultdict
cat = defaultdict(Counter); vals = defaultdict(lambda: defaultdict(list))
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if not fr: continue
        slot = {a['slot']: a['i'] for a in ag}
        for a in ag:
            if a['team'] != 'O' or a['plan'] != 'pull' or a['role'] not in ('kick', 'lead'): continue
            i = a['i']
            if any(f['a'][i][5] >= 0 for f in fr): continue
            role = a['role']; tg = slot.get(a['tgt']) if a['tgt'] else None
            f = min(fr, key=lambda f: abs(f['t'] - 2.0))
            car = f['c']
            ended = fr[-1]['t'] < 2.0
            if ended: cat[role]['play over before 2.0 s'] += 1; continue
            me = f['a'][i]
            if tg is None: cat[role]['no target'] += 1; continue
            T = f['a'][tg]
            d = ((me[0]-T[0])**2 + (me[1]-T[1])**2) ** .5
            eng = T[5] >= 0
            cat[role][('target engaged by someone else' if eng else 'target free') + (', within 1.5 yd' if d < 1.5 else ', 1.5-3 yd' if d < 3 else ', 3+ yd')] += 1
            vals[role]['dist to target'].append(d); vals[role]['puller x'].append(me[0]-los); vals[role]['target x'].append(T[0]-los)
            vals[role]['current tgt is planned'].append(1 if me[6] == tg else 0)
for role in cat:
    n = sum(cat[role].values()); print(role, 'never engaged:', n)
    for k, v in cat[role].most_common(): print(f'   {k}: {v}')
    print('   medians:', {k: round(st.median(v), 2) for k, v in vals[role].items()})
