"""Power box backers: who touched each one first in arm A, and whether arm B still touched him (same play, same shift)."""
import json, sys
from collections import Counter
def touches(path):
    out = {}
    for p in json.load(open(path)):
        s = p['setup']; ag = s['agents']; los = s['los']; fr = p['frames']
        if 'power' not in s.get('concept', '') or not fr: continue
        car = next((f['c'] for f in fr if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
        if car is None: continue
        f0 = fr[0]; by = s['ballY']
        for d in ag:
            if d['team'] != 'D' or d['pos'] not in ('ILB', 'OLB', 'MLB', 'LB'): continue
            x0 = f0['a'][d['i']][0] - los
            if not (2.5 <= x0 <= 8 and abs(f0['a'][d['i']][1] - by) <= 6): continue
            who = None
            for f in fr:
                cx = f['a'][car][0] - los if f['c'] == car else None
                dx, dy = f['a'][d['i']][0], f['a'][d['i']][1]
                if cx is not None and cx >= dx - los - 1: break
                for o in ag:
                    if o['team'] != 'O' or o['slot'] in ('QB',) or o['i'] == car: continue
                    ox, oy = f['a'][o['i']][0], f['a'][o['i']][1]
                    if ox - los > -0.5 and ((ox-dx)**2 + (oy-dy)**2) ** .5 < 1.5: who = f"{o['slot']}:{o['plan'] or o['job']}/{o['role'] or ''}"; break
                if who: break
            out[(p['id'], d['slot'])] = who
    return out
A = {}; B = {}
for k in range(4):
    for s in (7, 9, 11, 13):
        for key, v in touches(f'out/run/restage/trace-{sys.argv[1]}-seed{s}-k{k}.json').items(): A[(s, k) + key] = v
        for key, v in touches(f'out/run/restage/trace-{sys.argv[2]}-seed{s}-k{k}.json').items(): B[(s, k) + key] = v
lost = Counter(A[k].split(':')[1] for k in A if A[k] and not B.get(k)); gained = Counter(B[k].split(':')[1] for k in B if B[k] and not A.get(k))
print('touched A', sum(1 for v in A.values() if v), 'B', sum(1 for v in B.values() if v), 'of', len(A))
print('lost (blocker job in A):', lost.most_common(8)); print('gained (blocker job in B):', gained.most_common(8))
