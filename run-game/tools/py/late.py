"""Even/light-box zone backers whose targeting blocker was past the line but late (evengap definitions): when he first
targeted the backer, distance then, at carrier arrival; his closing rate vs the rate needed; his speed; share of his
speed toward the backer; the backer's speed toward/away from him; time from the snap."""
import json, sys, math, statistics as st, os
from collections import Counter
GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB", "DT": "DL", "DE": "DL", "EDGE": "DL", "CB": "DB", "S": "DB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ"}
rows = []
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        fam = next((v for k, v in FAM.items() if s.get('concept', '').startswith(k)), None)
        if not fam or not fr: continue
        grp = [GROUP.get(a['pos'], a['pos']) for a in ag]
        c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if c is None: continue
        X = lambda f, i: fr[f]['a'][i][0] - los; Y = lambda f, i: fr[f]['a'][i][1]
        ol = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] == 'OL']
        if len(ol) < 5: continue
        cy = st.mean(Y(0, i) for i in ol)
        blk = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] in ('OL', 'TE', 'RB') and i != c]
        box = sum(1 for i in range(len(ag)) if ag[i]['team'] == 'D' and grp[i] in ('DL', 'LB', 'DB') and X(0, i) < 7.5 and abs(Y(0, i) - cy) < 6.5)
        nb = len(ol) + sum(1 for i in range(len(ag)) if ag[i]['team'] == 'O' and ((grp[i] == 'TE' and abs(Y(0, i) - cy) < 6.5) or (grp[i] == 'RB' and i != c and X(0, i) < -1 and abs(Y(0, i) - cy) < 6.5)))
        if box - nb > 0: continue
        end = next((f for f in range(len(fr)) if fr[f]['ph'] != 'live'), len(fr))
        for j, a in enumerate(ag):
            if a['team'] != 'D' or grp[j] != 'LB' or not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = min(arrive if arrive is not None else len(fr) - 1, end - 1)
            d = lambda f, b: math.dist(fr[f]['a'][b][:2], fr[f]['a'][j][:2])
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk): continue
            assigned = [b for b in blk if any(fr[f]['a'][b][6] == j for f in range(last + 1))]
            if not assigned: continue
            b = min(assigned, key=lambda b: d(last, b)); q = fr[last]['a'][b]
            if q[5] >= 0 and q[5] != j: continue
            if X(last, b) < 0.5: continue
            f0 = next(f for f in range(last + 1) if fr[f]['a'][b][6] == j)
            T = (last - f0) * 0.1 or 0.1
            sp = st.mean(math.hypot(fr[f]['a'][b][2], fr[f]['a'][b][3]) for f in range(f0, last + 1))
            tow = []; bk = []
            for f in range(f0, last + 1):
                ux, uy = fr[f]['a'][j][0] - fr[f]['a'][b][0], fr[f]['a'][j][1] - fr[f]['a'][b][1]; n = math.hypot(ux, uy) or 1
                tow.append((fr[f]['a'][b][2] * ux + fr[f]['a'][b][3] * uy) / n); bk.append(-(fr[f]['a'][j][2] * ux + fr[f]['a'][j][3] * uy) / n)
            kinds = Counter(fr[f]['a'][b][8] for f in range(f0, last + 1)).most_common(2)
            rows.append(dict(fam=fam, t0=f0 * .1, tA=last * .1, d0=d(f0, b), dA=d(last, b), T=T, sp=sp, tow=st.mean(tow), bk=st.mean(bk),
                             x0=X(f0, b), kind0=fr[max(0, f0 - 1)]['a'][b][8], kinds=kinds))
print('late cases', len(rows))
med = lambda k: st.median(r[k] for r in rows)
print(f"targeted at {med('t0'):.2f}s from {med('d0'):.2f} yd (blocker depth {med('x0'):+.2f}); carrier arrives {med('tA'):.2f}s; still {med('dA'):.2f} yd away")
print(f"his speed {med('sp'):.2f} yd/s, toward backer {med('tow'):.2f}; backer moving away from him {med('bk'):.2f} yd/s")
need = [(r['d0'] - 1.5) / r['T'] for r in rows]; got = [(r['d0'] - r['dA']) / r['T'] for r in rows]
print(f"closing needed {st.median(need):.2f} yd/s, achieved {st.median(got):.2f}")
print('previous job when he took the backer:', Counter(r['kind0'] for r in rows).most_common(6))
print('targeted at:', Counter(('<1.0' if r['t0'] < 1 else '1.0-1.5' if r['t0'] < 1.5 else '1.5-2.0' if r['t0'] < 2 else '2.0+') for r in rows))
print('backer moving away >1 yd/s:', sum(r['bk'] > 1 for r in rows), '| toward-share <0.5:', sum(r['tow'] < .5 * r['sp'] for r in rows))
