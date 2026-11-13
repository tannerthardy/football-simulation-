#!/usr/bin/env python3
"""Read crowd.ts output: after first contact on a run, do the next defenders
to arrive attempt, and does the runner slow?

    python3 -I scripts/diag/g1/crowd.py out/g1/crowd.jsonl
"""
import json
import sys
from collections import Counter

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
R = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
# A defender already holding when first seen near wrapped on the tick he arrived.
for r in R:
    for a in r['arrivals']:
        if a['attempt'] is None and a['states'].get('holding'):
            a['attempt'] = 'wrap'
            a['states'].pop('holding')
print(f'{len(R)} runs with a first contact after the handoff')


def speeds(S, lab):
    rel = [[a / r['before'] for a in r['after'] if a is not None] for r in S if r['before'] > 1 and None not in r['after']]
    if rel:
        print(f'  {lab:44s} n {len(rel):4d}: speed / pre-contact at 0.3 / 0.6 / 1.0 s '
              + ' / '.join(f'{q([x[i] for x in rel]):.2f}' for i in range(3)))


for lab, S in (('all', R), ('got through (5+ yd after contact)', [r for r in R if r['gain'] >= 5])):
    print(f'\n== {lab} (n {len(S)})')
    crowd = [r for r in S if r['arrivals']]
    print(f'  crowd (another defender within 1.5 yd in 1 s): {100 * len(crowd) / max(1, len(S)):.0f}%')
    speeds([r for r in S if not r['arrivals']], 'clean')
    speeds(crowd, 'crowd')
    speeds([r for r in crowd if r['maxHolders'] >= 2], 'crowd, 2+ holding at once')
    speeds([r for r in crowd if r['maxHolders'] < 2], 'crowd, never 2 holding')
    A = [a for r in S for a in r['arrivals']]
    if not A:
        continue
    att = Counter(a['attempt'] or 'none' for a in A)
    print(f'  arrivals {len(A)} ({len(A) / max(1, len(crowd)):.2f} per crowd run): ' + '  '.join(f'{k} {100 * v / len(A):.0f}%' for k, v in att.most_common()))
    for g in ('DL', 'LB', 'DB'):
        G = [a for a in A if a['g'] == g]
        if G:
            print(f'    {g} n {len(G):4d}: ' + '  '.join(f'{k} {100 * v / len(G):.0f}%' for k, v in Counter(a['attempt'] or 'none' for a in G).most_common()))
    no = [a for a in A if a['attempt'] is None]
    st = Counter()
    for a in no:
        st[max(a['states'], key=a['states'].get) if a['states'] else '?'] += 1
    print(f'  no attempt ({len(no)}), main state while near: ' + '  '.join(f'{k} {100 * v / len(no):.0f}%' for k, v in st.most_common()))
    print(f'  no attempt: closest approach minus standing reach p25/50/75 {q([a["slack"] for a in no], .25):.2f}/{q([a["slack"] for a in no]):.2f}/{q([a["slack"] for a in no], .75):.2f} yd'
          f' | arrived p50 {q([a["at"] for a in no]):.2f} s after first contact')

# What holders do while attached: their request and achieved speed along the
# runner's travel (1 = running with him), the braking force their grips put
# on him (in his body weights), grip, and slipping. Break-throughs vs stopped.
G = 9.80665 / 0.9144
for lab, S in (('got through (5+ yd after contact)', [r for r in R if r['gain'] >= 5]), ('stopped (under 2 yd after contact)', [r for r in R if r['gain'] < 2])):
    H = [h for r in S for h in r.get('holds', [])]
    if not H:
        continue
    print(f'\n== holders while attached, {lab}: {len(H)} samples')
    for side, F in (('in front (heading toward him > 0.3)', lambda h: h[1] > .3), ('side/behind', lambda h: h[1] <= .3)):
        X = [h for h in H if F(h)]
        if not X:
            continue
        print(f'  {side:36s} n {len(X):5d}: requested along {q([h[7] for h in X]):.2f}, achieved along {q([h[8] for h in X]):.2f} |'
              f' braking p25/50/75 {q([h[6] / (h[10] * G) for h in X], .25):.2f}/{q([h[6] / (h[10] * G) for h in X]):.2f}/{q([h[6] / (h[10] * G) for h in X], .75):.2f} body weights |'
              f' grip {q([h[2] for h in X]):.2f}, slipping {100 * sum(h[5] for h in X) / len(X):.0f}%, used/capacity {q([h[4] / max(1, h[3]) for h in X]):.2f}')
    for k in (1, 2):
        X = [h for h in H if (h[9] == k if k == 1 else h[9] >= 2)]
        if X:
            tot = {}
            print(f'  {"one holder" if k == 1 else "2+ holders":36s} n {len(X):5d}: braking per holder p50 {q([h[6] / (h[10] * G) for h in X]):.2f} body weights')
