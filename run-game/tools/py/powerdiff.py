"""Even/light-box POWER box backers (evengap definitions, live window): touched in arm A but not in arm B, same snap id.
For each: carrier arrival t, the assigned blocker (or none), his kind/x/target at arrival in both arms, first touch t in A."""
import json, sys, math, statistics as st
GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB", "DT": "DL", "DE": "DL", "EDGE": "DL", "CB": "DB", "S": "DB"}
def scan(paths):
    out = {}
    for path in paths:
        for p in json.load(open(path)):
            s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
            if not s.get('concept', '').startswith('power') or not fr: continue
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
                touch = next(((f, b) for f in range(3, last) for b in blk if d(f, b) < 1.5 and X(f, b) > -0.5), None)
                asg = [b for b in blk if any(fr[f]['a'][b][6] == j for f in range(last + 1))]
                b = min(asg, key=lambda b: d(last, b)) if asg else None
                info = dict(arr=round(last * .1, 2), touch=(round(touch[0] * .1, 2), ag[touch[1]]['slot']) if touch else None,
                            blk=(ag[b]['slot'], fr[last]['a'][b][8], round(X(last, b), 2), round(d(last, b), 2)) if b is not None else None)
                out[(p['id'], a['slot'])] = info
    return out
A = scan(sys.argv[1].split(',')); B = scan(sys.argv[2].split(','))
lost = [(k, A[k], B[k]) for k in A if k in B and A[k]['touch'] and not B[k]['touch']]
gained = [k for k in A if k in B and not A[k]['touch'] and B[k]['touch']]
print(f'even/light-box power backers: {len(A)} | touched only without #353: {len(lost)} | only with #353: {len(gained)}')
for (pid, lb), a, b in sorted(lost):
    print(f"{pid} {lb}: no353 touched {a['touch'][0]}s by {a['touch'][1]} (carrier at backer {a['arr']}s) | with353 carrier at backer {b['arr']}s, assigned blocker {b['blk']} (slot, kind, x past LOS, yd from backer)")
