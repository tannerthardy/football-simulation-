"""Zone box backers untouched whose assigned blocker (frame target) is free (not engaged) and at/behind x<0.5 when the
carrier reaches the backer (backergap2 definitions, live window): that blocker's kind history, when his target became
this backer, his x and speed then and at arrival, nearest body at arrival (who, dist), and min distance he got to the
backer."""
import json, sys, math, statistics as st
from collections import Counter
GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB", "DT": "DL", "DE": "DL", "EDGE": "DL", "CB": "DB", "S": "DB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ"}
C = Counter(); rows = []
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
        end = next((f for f in range(len(fr)) if fr[f]['ph'] != 'live'), len(fr))
        for j, a in enumerate(ag):
            if a['team'] != 'D' or grp[j] != 'LB' or not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = min(arrive if arrive is not None else len(fr) - 1, end - 1)
            d = lambda f, b, q=j: math.dist(fr[f]['a'][b][:2], fr[f]['a'][q][:2])
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk): continue
            assigned = [b for b in blk if any(fr[f]['a'][b][6] == j for f in range(last + 1))]
            if not assigned: continue
            b = min(assigned, key=lambda b: d(last, b)); q = fr[last]['a'][b]
            if q[5] >= 0 and q[5] != j: continue
            if X(last, b) >= 0.5: continue
            f0 = next(f for f in range(last + 1) if fr[f]['a'][b][6] == j)
            kinds = [fr[f]['a'][b][8] for f in range(last + 1)]
            near = min(((math.dist(fr[last]['a'][b][:2], fr[last]['a'][k][:2]), k) for k in range(len(ag)) if k not in (b,)), key=lambda t: t[0])
            sp_last = math.hypot(q[2], q[3])
            engaged_before = any(fr[f]['a'][b][5] >= 0 for f in range(f0, last + 1))
            mind = min(d(f, b) for f in range(f0, last + 1))
            C[f"{fam} free-at-line"] += 1
            C[f"{fam}   slot {ag[b]['slot']}"] += 1
            C[f"{fam}   snap job {ag[b]['plan']}"] += 1
            C[f"{fam}   took backer at {'<0.5' if f0*.1 < .5 else '0.5-1.0' if f0*.1 < 1 else '1.0-1.5' if f0*.1 < 1.5 else '1.5+'} s"] += 1
            C[f"{fam}   engaged on someone after taking backer: {engaged_before}"] += 1
            C[f"{fam}   speed at arrival {'<1' if sp_last < 1 else '1-2' if sp_last < 2 else '2+'} yd/s"] += 1
            C[f"{fam}   nearest body at arrival: {ag[near[1]]['team']}/{grp[near[1]]} {'<1.0' if near[0] < 1 else '1.0+'} yd"] += 1
            rows.append(dict(t0=f0 * .1, tA=last * .1, x0=X(f0, b), xA=X(last, b), dA=d(last, b), mind=mind))
for k in sorted(C): print(f"{C[k]:5} {k}")
if rows:
    med = lambda k: st.median(r[k] for r in rows)
    print(f"median: took backer {med('t0'):.2f}s at x {med('x0'):+.2f}; carrier arrives {med('tA'):.2f}s; blocker x then {med('xA'):+.2f}, {med('dA'):.2f} yd from backer (closest {med('mind'):.2f})")
