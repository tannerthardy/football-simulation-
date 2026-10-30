"""Play-side untargeted box backers on zone (passby definitions): box arithmetic at the snap (blockers OL/TE/FB vs
defenders within 6 yd of the OL centre and < 8 yd deep), and each blocker's snap target (pos, side, depth)."""
import json, sys, math, statistics as st
from collections import Counter
GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB"}
fam0 = sys.argv[1]; C = Counter(); shown = 0
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if not fr or not s.get('concept', '').startswith(fam0): continue
        grp = [GROUP.get(a['pos'], a['pos']) for a in ag]
        c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if c is None: continue
        X = lambda f, i: fr[f]['a'][i][0] - los; Y = lambda f, i: fr[f]['a'][i][1]
        ol = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] == 'OL']
        cy = st.mean(Y(0, i) for i in ol)
        blk = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] in ('OL', 'TE', 'RB') and i != c]
        cross = next((f for f in range(len(fr)) if X(f, c) > 0), len(fr) - 1)
        ps = 1 if Y(cross, c) > cy else -1
        box = [j for j, a in enumerate(ag) if a['team'] == 'D' and X(0, j) < 8 and abs(Y(0, j) - cy) < 6]
        inbox_blk = [b for b in blk if abs(Y(0, b) - cy) < 6 and X(0, b) > -6]
        for j, a in enumerate(ag):
            if a['team'] != 'D' or grp[j] != 'LB' or not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            if (Y(0, j) - cy) * ps <= 1: continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = arrive if arrive is not None else len(fr) - 1
            d = lambda f, b: math.dist(fr[f]['a'][b][:2], fr[f]['a'][j][:2])
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk): continue
            if any(fr[f]['a'][b][6] == j for b in blk for f in range(last + 1)): continue
            C['play-side untargeted'] += 1
            C[f'box {len(inbox_blk)} blockers vs {len(box)} defenders: ' + ('short' if len(inbox_blk) < len(box) else 'even/plus')] += 1
            tg = [fr[0]['a'][b][6] for b in inbox_blk]
            away = [b for b in inbox_blk if fr[0]['a'][b][6] >= 0 and fr[0]['a'][b][6] not in box]
            back2 = [b for b in inbox_blk if fr[0]['a'][b][6] in box and grp[fr[0]['a'][b][6]] in ('LB', 'S', 'CB') and (Y(0, fr[0]['a'][b][6]) - cy) * ps < -1]
            if away: C['  a blocker targets a defender outside the box'] += 1
            if back2: C['  a blocker targets a backside second-level defender'] += 1
            if shown < 6 and len(inbox_blk) >= len(box):
                shown += 1
                print(p['id'], s['concept'], 'ps', ps, 'untargeted', a['slot'], f"({X(0,j):.1f},{(Y(0,j)-cy)*ps:+.1f})")
                print('   ', ' '.join(f"{ag[b]['slot']}:{ag[b]['plan']}>{ag[fr[0]['a'][b][6]]['slot'] if fr[0]['a'][b][6]>=0 else '-'}/{ag[b]['climb']}" for b in sorted(inbox_blk, key=lambda b: -(Y(0, b)-cy)*ps)))
                print('   D', ' '.join(f"{ag[q]['slot']}({X(0,q):.1f},{(Y(0,q)-cy)*ps:+.1f})" for q in sorted(box, key=lambda q: -(Y(0,q)-cy)*ps)))
for k, v in sorted(C.items()): print(k, v)
