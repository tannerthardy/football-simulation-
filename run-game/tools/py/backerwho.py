"""Untouched box backers nobody ends up targeting: who targeted him at the snap and what that blocker targeted instead
(first change of tg away from him), and for never-targeted backers, what each OL's snap plan was."""
import json, sys, statistics as st
from collections import Counter, defaultdict
GROUP = {"QB": "QB", "OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "WR": "WR",
         "EDGE": "DL", "DT": "DL", "DE": "DL", "LB": "LB", "CB": "DB", "S": "DB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ", "toss": "OZ", "power": "POWER", "counter": "COUNTER", "trap": "TRAP", "draw": "DRAW"}
drop = defaultdict(Counter); never = defaultdict(Counter); ex = defaultdict(list)
for path in sys.argv[1:]:
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if not fr: continue
        fam = next((v for k, v in FAM.items() if s.get('concept', '').startswith(k)), 'OTHER')
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
            if any(fr[f]['a'][b][6] == j for b in blk for f in range(last + 1)): continue
            planned = [b for b in blk if ag[b]['tgt'] == a['slot'] or ag[b]['climb'] == a['slot']]
            if planned:
                for b in planned:
                    # first frame his target differs from the planned backer
                    f0 = next((f for f in range(len(fr)) if fr[f]['a'][b][6] != j), 0)
                    new = fr[f0]['a'][b][6]
                    drop[fam][f'{ag[b]["plan"]}: -> {grp[new] if new >= 0 else "none"} at {fr[f0]["t"]:.1f}s'] += 1
                    if len(ex[fam]) < 4: ex[fam].append(f"{p['id']} {ag[b]['slot']} {ag[b]['plan']} {a['slot']} -> {ag[new]['slot'] if new >= 0 else '-'} @ {fr[f0]['t']}")
            else:
                jobs = Counter(f'{ag[b]["plan"]}->{grp[[q["slot"] for q in ag].index(ag[b]["tgt"])] if ag[b]["tgt"] in [q["slot"] for q in ag] else "-"}' for b in ol)
                never[fam]['OL snap jobs: ' + ', '.join(f'{k} x{v}' for k, v in sorted(jobs.items()))] += 1
for fam in sorted(set(drop) | set(never)):
    print(f'== {fam}')
    print('   planned then dropped:', drop[fam].most_common(6))
    print('   examples:', ex[fam])
    print('   never targeted, top OL job sets:', never[fam].most_common(3))
