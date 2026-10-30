"""Draws: handoff time, first carrier contact (who, group, when, where), per OL first engagement time,
DL depth (yd behind LOS) at handoff, and the share of DL engaged with an OL at 0.5 / 1.0 s and at the handoff."""
import json, sys
from collections import Counter
fc_by = Counter(); n = 0; olfirst = []; hand = []; dlpen = []; eng = {0.5: [], 1.0: [], 'h': []}
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; fr = p['frames']
        if s.get('scheme') != 'draw' or not fr or p.get('nullified'): continue
        n += 1
        ag, los = s['agents'], s['los']; off = {a['i'] for a in ag if a['team'] == 'O'}
        dfn = [a['i'] for a in ag if a['team'] == 'D']
        dirx = 1 if sum(fr[0]['a'][i][0] for i in dfn) / len(dfn) > los else -1
        ol = [a['i'] for a in ag if a['slot'] in ('LT', 'LG', 'C', 'RG', 'RT')]
        dl = [a['i'] for a in ag if a['slot'].startswith(('DE', 'DT', 'NT'))]
        ev = p['events']
        h = next((e['t'] for e in ev if e['type'] == 'handoff'), None)
        fc = next((e for e in ev if e['type'] in ('carrier_contact', 'tackle_wrap')), None)
        if fc:
            d = fc['b'] if fc['a'] in off else fc['a']
            sl = ag[d]['slot'] if d is not None else '?'
            fc_by[('DL' if sl.startswith(('DE', 'DT', 'NT')) else 'LB' if sl.startswith('LB') else 'DB')] += 1
        for o in ol:
            k = next((k for k, f in enumerate(fr) if f['a'][o][5] >= 0), None)
            olfirst.append(k * 0.1 if k is not None else 9)
        if h is not None:
            hand.append(h); kh = min(len(fr) - 1, int(round(h / 0.1)))
            dlpen += [-(fr[kh]['a'][d][0] - los) * dirx for d in dl]
        for key in eng:
            k = kh if key == 'h' and h is not None else (int(key / 0.1) if key != 'h' else None)
            if k is None or k >= len(fr): continue
            eng[key].append(sum(fr[k]['a'][d][5] in off for d in dl) / max(1, len(dl)))
def med(v): v = sorted(v); return round(v[len(v) // 2], 2) if v else None
mean = lambda v: round(sum(v) / len(v), 2) if v else None
print(f"draws {n}; handoff median {med(hand)}; first contact by {dict(fc_by)}; OL first engagement median {med(olfirst)} s (never by end: {sum(x == 9 for x in olfirst)}/{len(olfirst)})")
print(f"DL depth behind LOS at handoff: median {med(dlpen)}, share >2 yd {sum(x > 2 for x in dlpen) / max(1, len(dlpen)):.2f}; DL engaged with OL at 0.5 / 1.0 s / handoff: {mean(eng[0.5])} / {mean(eng[1.0])} / {mean(eng['h'])}")
