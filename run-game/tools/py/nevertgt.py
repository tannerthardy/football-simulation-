"""Never-targeted box backers on a concept family: print snap jobs (plan, tgt, climb) of OL/TE and the defense front."""
import json, sys, statistics as st
from collections import Counter
FAM = sys.argv[1]; GROUP = {"OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "LB": "LB"}
shown = 0; ctr = Counter()
for path in sys.argv[2:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if not fr or not s.get('concept', '').startswith(FAM): continue
        grp = [GROUP.get(a['pos'], a['pos']) for a in ag]
        c = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if c is None: continue
        X = lambda f, i: fr[f]['a'][i][0] - los; Y = lambda f, i: fr[f]['a'][i][1]
        ol = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] == 'OL']
        cy = st.mean(Y(0, i) for i in ol)
        blk = [i for i, a in enumerate(ag) if a['team'] == 'O' and grp[i] in ('OL', 'TE', 'RB') and i != c]
        lbs = [j for j, a in enumerate(ag) if a['team'] == 'D' and grp[j] == 'LB' and 2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6]
        for j in lbs:
            a = ag[j]
            if any(ag[b]['tgt'] == a['slot'] or ag[b]['climb'] == a['slot'] for b in blk): continue
            if any(fr[f]['a'][b][6] == j for b in blk for f in range(len(fr))): continue
            ctr[f"box LBs {len(lbs)}, blockers {sum(1 for b in blk if grp[b] in ('OL','TE'))}, DL {sum(1 for q in ag if q['team']=='D' and q['pos'] in ('DT','DE','EDGE') and X(0,ag.index(q)) < 2.5)}"] += 1
            if shown < 10 and len(lbs) == 2 and sum(1 for q in ag if q["team"]=="D" and q["pos"] in ("DT","DE","EDGE") and X(0,ag.index(q)) < 2.5) == 4 and ".s0" in p["id"]:
                shown += 1
                print(p['id'], s['concept'], 'untargeted', a['slot'], f"y{Y(0,j)-cy:+.1f}")
                print('   ', ' '.join(f"{ag[b]['slot']}:{ag[b]['plan']}>{ag[b]['tgt']}/{ag[b]['climb']}" for b in sorted(blk, key=lambda b: Y(0, b))))
                print('   D', ' '.join(f"{q['slot']}({X(0,i):.1f},{Y(0,i)-cy:+.1f})" for i, q in enumerate(ag) if q['team'] == 'D' and X(0, i) < 8))
print(ctr)
