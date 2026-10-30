"""For box backers not touched although some blocker's current target was him: that blocker's plan kind and motion
over the last 0.5 s before the carrier arrived (speed, upfield speed), distance to the backer, and his depth."""
import json, sys, statistics as st
from collections import Counter, defaultdict
GROUP = {"QB": "QB", "OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "WR": "WR",
         "EDGE": "DL", "DT": "DL", "DE": "DL", "LB": "LB", "CB": "DB", "S": "DB"}
want = sys.argv[1]; FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ", "toss": "OZ"}
rows = defaultdict(list)
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if not fr or next((v for k, v in FAM.items() if s.get('concept', '').startswith(k)), None) != want: continue
        grp = [GROUP.get(a['pos'], a['pos']) for a in ag]
        c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if c is None: continue
        X = lambda f, i: fr[f]['a'][i][0] - los; Y = lambda f, i: fr[f]['a'][i][1]
        ol = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] == 'OL']
        if len(ol) < 5: continue
        cy = st.mean(Y(0, i) for i in ol)
        blk = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] in ('OL', 'TE', 'RB') and i != c]
        for j, a in enumerate(ag):
            if a['team'] != 'D' or grp[j] != 'LB' or not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = arrive if arrive is not None else len(fr) - 1
            d = lambda f, b: ((fr[f]['a'][b][0] - fr[f]['a'][j][0]) ** 2 + (fr[f]['a'][b][1] - fr[f]['a'][j][1]) ** 2) ** .5
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk): continue
            asg = [b for b in blk if any(fr[f]['a'][b][6] == j for f in range(last + 1))]
            if not asg: continue
            b = min(asg, key=lambda b: d(last, b)); q = fr[last]['a'][b]
            if q[5] >= 0 and q[5] != j: continue
            f0 = max(0, last - 5); win = range(f0, last + 1)
            first = next(f for f in range(last + 1) if fr[f]['a'][b][6] == j)
            sp = st.mean((fr[f]['a'][b][2] ** 2 + fr[f]['a'][b][3] ** 2) ** .5 for f in win)
            up = st.mean(fr[f]['a'][b][2] for f in win)
            rows[q[8]].append(dict(sp=sp, up=up, dist=d(last, b), depth=X(last, b), tfirst=fr[first]['t'], tarr=fr[last]['t'],
                                   gap_at_first=d(first, b), atline=X(last, b) < 0.5))
for k, v in sorted(rows.items(), key=lambda kv: -len(kv[1])):
    m = lambda key: round(st.median(x[key] for x in v), 2)
    print(f"{k}: n={len(v)} at/behind line {sum(x['atline'] for x in v)/len(v):.0%} | speed {m('sp')} upfield {m('up')} | dist to backer {m('dist')} | "
          f"targeted him at {m('tfirst')}s from {m('gap_at_first')} yd; carrier arrived {m('tarr')}s")
