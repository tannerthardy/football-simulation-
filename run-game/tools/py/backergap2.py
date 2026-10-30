"""Box backers on run-only sim film (run-restage/run-film-trace frames), same definition as run_film_reference.py:
LB 2.5-8 yd deep within 6 yd of the OL centre; touched if an OL/TE/RB (not the carrier) past -0.5 yd comes within
1.5 yd before the carrier reaches his depth minus 1 yd. For each untouched backer: was anyone's current target him
(frame field tg), and what was the nearest such blocker doing when the carrier got there.
    python3 -I backergap.py trace.json ..."""
import json, sys, statistics as st
from collections import Counter, defaultdict
GROUP = {"QB": "QB", "OT": "OL", "OG": "OL", "C": "OL", "TE": "TE", "RB": "RB", "FB": "RB", "WR": "WR",
         "EDGE": "DL", "DT": "DL", "DE": "DL", "LB": "LB", "CB": "DB", "S": "DB"}
FAM = {"iz": "IZ", "duo": "IZ", "split": "IZ", "oz": "OZ", "wz": "OZ", "toss": "OZ", "power": "POWER", "counter": "COUNTER", "trap": "TRAP", "draw": "DRAW"}
cats = defaultdict(Counter); tot = Counter(); short = defaultdict(list); detail = defaultdict(Counter)
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
            if a['team'] != 'D' or grp[j] != 'LB': continue
            if not (2.5 <= X(0, j) <= 8 and abs(Y(0, j) - cy) < 6): continue
            arrive = next((f for f in range(len(fr)) if X(f, c) >= X(f, j) - 1), None)
            last = arrive if arrive is not None else len(fr) - 1
            d = lambda f, b: ((fr[f]['a'][b][0] - fr[f]['a'][j][0]) ** 2 + (fr[f]['a'][b][1] - fr[f]['a'][j][1]) ** 2) ** .5
            tot[fam] += 1
            if any(d(f, b) < 1.5 and X(f, b) > -0.5 for f in range(3, last) for b in blk):
                cats[fam]['touched'] += 1; continue
            assigned = [b for b in blk if any(fr[f]['a'][b][6] == j for f in range(last + 1))]
            if not assigned:
                # who could have: was the backer's initial target owner someone in the setup plan?
                planned = [b for b in blk if ag[b]['tgt'] == a['slot'] or ag[b]['climb'] == a['slot']]
                cats[fam]['nobody targets him' + (' (planned at snap, retargeted)' if planned else '')] += 1; continue
            b = min(assigned, key=lambda b: d(last, b)); q = fr[last]['a'][b]
            eng = q[5]; kind = q[8]; dist = d(last, b)
            short[fam].append(dist)
            if eng >= 0 and eng != j: cats[fam][f'his blocker still engaged on {grp[eng]}'] += 1; detail[fam][f'{ag[b]["slot"]}:{kind} on {ag[eng]["slot"]}'] += 1
            elif X(last, b) < 0.5: cats[fam]['his blocker free but still at/behind the line'] += 1; detail[fam][f'{ag[b]["slot"]}:{kind} at line'] += 1
            else: cats[fam]['his blocker past the line, late'] += 1
print('family: n | category share (count)')
for fam in sorted(tot):
    n = tot[fam]; print(f'{fam} n={n}: ' + '; '.join(f'{k} {v/n:.0%}' for k, v in cats[fam].most_common()))
    if short[fam]: print(f'     untouched-with-blocker: his distance to the backer at carrier arrival p50 {st.median(short[fam]):.1f} yd')
allc = Counter(); [allc.update(v) for v in cats.values()]; N = sum(tot.values())
print('ALL n=%d: ' % N + '; '.join(f'{k} {v/N:.0%}' for k, v in allc.most_common()))
for fam in ('COUNTER', 'IZ', 'POWER'):
    print(fam, 'free-at-line detail:', detail[fam].most_common(10))
