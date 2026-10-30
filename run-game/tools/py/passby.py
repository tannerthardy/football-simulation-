"""Untouched box backers nobody targeted (backergap2 definitions): was a free climbing blocker (kind climb, not engaged)
near him (<=3 yd) at some frame before the carrier arrived, heading for someone else? Where did that climber's own
target end up (touched by him / by others / not)? And on which side of the play was the backer?"""
import json, sys, math, statistics as st
from collections import Counter, defaultdict
GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ"}
C = defaultdict(Counter)
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
        cross = next((f for f in range(len(fr)) if X(f, c) > 0), len(fr) - 1)
        playside = (Y(cross, c) - cy)
        for j, a in enumerate(ag):
            if a['team'] != 'D' or grp[j] != 'LB' or not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = arrive if arrive is not None else len(fr) - 1
            d = lambda f, b, q=j: math.dist(fr[f]['a'][b][:2], fr[f]['a'][q][:2])
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk): continue
            if any(fr[f]['a'][b][6] == j for b in blk for f in range(last + 1)): continue
            side = 'play' if (Y(0, j) - cy) * playside > 1 else 'back' if (Y(0, j) - cy) * playside < -1 else 'mid'
            C[fam]['untargeted ' + side] += 1
            near = [(f, b) for f in range(last + 1) for b in blk if fr[f]['a'][b][8] == 'climb' and fr[f]['a'][b][5] < 0
                    and d(f, b) <= 3 and fr[f]['a'][b][6] >= 0 and fr[f]['a'][b][6] != j]
            if not near: C[fam][f'  {side}: no free climber passed within 3 yd'] += 1; continue
            f, b = near[0]; t2 = fr[f]['a'][b][6]
            dt2 = d(f, b, t2)
            got = any(math.dist(fr[k]['a'][b][:2], fr[k]['a'][t2][:2]) < 1.5 for k in range(f, last + 1))
            C[fam][f"  {side}: climber {ag[b]['slot']} passed him for a {'farther' if dt2 > d(f, b) else 'nearer'} {ag[t2]['pos']} ({'reached' if got else 'not reached'} before carrier)"] += 1
for fam in sorted(C):
    print(fam); [print('  ', k, v) for k, v in sorted(C[fam].items())]
