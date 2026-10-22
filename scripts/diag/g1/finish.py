#!/usr/bin/env python3
"""Read finish.ts output: who should have finished the play and why he
didn't. Observation only.

    python3 -I scripts/diag/g1/finish.py out/g1/finish.jsonl
"""
import json
import math
import sys
from collections import Counter, defaultdict


def q(v, f):
    v = sorted(x for x in v if x is not None and x == x)
    return v[int(f * (len(v) - 1))] if v else float('nan')


plays = [json.loads(l) for l in open(sys.argv[1])]
n = len(plays)
print(f'{n} carries: runs {sum(p["kind"] == "run" for p in plays)}, catches {sum(p["kind"] == "catch" for p in plays)}, scrambles {sum(p["kind"] == "scramble" for p in plays)}')
broken = sum(p['brokenAll'] for p in plays)
missed = sum(p['missedAll'] for p in plays)
print(f'per carry: missed (whiffs) {missed / n:.3f}, broken holds {broken / n:.3f}')

# Broken holds: how many per carry, and did the carry go on?
per = Counter(min(p['brokenAll'], 5) for p in plays)
print('broken holds per carry:', ' '.join(f'{k}:{v}' for k, v in sorted(per.items())))

# Long plays.
long = [p for p in plays if (p['kind'] == 'run' and p['gain'] >= 10) or (p['kind'] == 'catch' and p['afterStart'] >= 5)]
print(f'\nlong: {len(long)} ({sum(p["kind"] == "run" for p in long)} runs 10+, {sum(p["kind"] == "catch" for p in long)} catches 5+ after)')
first = Counter()
grp = Counter()
for p in long:
    reached = sorted((d for d in p['defs'] if d['firstReachT'] is not None), key=lambda d: d['firstReachT'])
    if not reached:
        first['nobody reached him'] += 1
        continue
    d = reached[0]
    how = 'whiffed' if d['whiffs'] and not d['wraps'] else 'wrapped, broken' if d['broken'] else 'wrapped, finished' if d['wraps'] else 'reached, no attempt'
    first[how] += 1
    grp[(d['group'], how)] += 1
L = len(long)
print('first defender to reach him:', '  '.join(f'{k} {100 * v / L:.0f}%' for k, v in first.most_common()))
print('  by position:', '  '.join(f'{g}/{h} {v}' for (g, h), v in grp.most_common(12)))

# Defenders in reach per long play, and whiffs/broken totals by position.
reachers = [sum(d['firstReachT'] is not None for d in p['defs']) for p in long]
print(f'defenders who got within reach per long play: p25/50/75 {q(reachers, .25)}/{q(reachers, .5)}/{q(reachers, .75)}; all carries {q([sum(d["firstReachT"] is not None for d in p["defs"]) for p in plays], .5)}')
pos = defaultdict(Counter)
for p in plays:
    for d in p['defs']:
        if d['firstReachT'] is not None:
            pos[d['group']]['reached'] += 1
        pos[d['group']]['whiffs'] += d['whiffs']
        pos[d['group']]['wraps'] += d['wraps']
        pos[d['group']]['broken'] += d['broken']
print('\nall carries, by position: reached / whiffs / wraps / broken (broken per wrap)')
for g in ('DL', 'LB', 'CB', 'S'):
    c = pos[g]
    print(f'  {g}: {c["reached"]} / {c["whiffs"]} / {c["wraps"]} / {c["broken"]} ({c["broken"] / max(1, c["wraps"]):.2f})')

# Pursuit: lead and speed, close (2-6 yd) and far (6-10), by position.
print('\npursuit samples (2-10 yd from the carrier, moving 2+ yd/s, not engaged):')
for g in ('DL', 'LB', 'CB', 'S'):
    for lo, hi in ((2, 6), (6, 10)):
        s = [x for p in plays for d in p['defs'] if d['group'] == g for x in d['pursuit'] if lo <= x[5] < hi]
        if not s:
            continue
        lead = [x[2] for x in s]
        at = sum(1 for x in s if x[0] < x[1]) / len(s)  # heading nearer the carrier now than the intercept
        print(f'  {g} {lo}-{hi} yd n {len(s):6d}: aims nearer the carrier than the intercept {100 * at:.0f}%, lead p25/50/75 {q(lead, .25):.2f}/{q(lead, .5):.2f}/{q(lead, .75):.2f}, '
              f'speed p50 {q([x[4] for x in s], .5):.2f}, closing p50 {q([x[3] for x in s], .5):.2f}')

# Every hold taken, by how it was taken, and how often it broke. A lunge or a
# reach is a hold at extension; a form hold is body to body.
holds = [h for p in plays for h in p.get('holds', [])]
if holds:
    by = defaultdict(lambda: [0, 0])
    for h in holds:
        k = h['origin'].split('+')[0] + (' assist' if 'assist' in h['origin'] else '')
        by[k][0] += 1
        by[k][1] += h['broken']
    print(f'\nholds taken {len(holds)}: ' + '  '.join(f'{k} {n} (broke {100 * b / n:.0f}%)' for k, (n, b) in sorted(by.items(), key=lambda x: -x[1][0])))
    for kind in ('lunge', 'reach', 'form'):
        S = [h for h in holds if h['origin'].startswith(kind) and 'assist' not in h['origin']]
        if S:
            print(f'  {kind:5s} initial n {len(S)}: carrier heading toward him (cosA) p50 {q([h["cosA"] for h in S], .5):.2f}, '
                  f'closing p50 {q([h["closing"] for h in S], .5):.2f}, carrier / tackler speed p50 {q([h["cs"] for h in S], .5):.2f} / {q([h["ds"] for h in S], .5):.2f}')
