"""Stalk events from the 'blocker on a man who is out of the play' detector,
split by cause using the run-film trace (same games and play ids).

    python3 -I scripts/diag/stalk-causes.py out/weird/film-seed11.json out/run/trace-seed11.json [--sample 20]

Per event, at its first frame and through its window:
- "engaged": the receiver is in contact with that defender (a block under way;
  a defender driven away from the runner is not out of the play by fault);
- "left coverage, receiver stays": the defender's controller has switched from
  coverage (man/zone) to a run job before the event, and the receiver is still
  on him without contact;
- "still in coverage": the defender is still in his coverage controller (man or
  zone, bailing with or carrying the receiver), no contact.
Also: who the detector's "free" defender is (his job, and whether he is himself
engaged), and where the runner is relative to the LOS. The sample takes the
first stalk event of each play in play order.
"""
import collections
import json
import math
import re
import sys

film, trace = sys.argv[1], sys.argv[2]
n = int(sys.argv[sys.argv.index('--sample') + 1]) if '--sample' in sys.argv else 0
ev = [e for e in json.load(open(film))['events'] if e['detector'] == 'stuck' and '(stalk)' in e['text']]
tr = {p['id']: p for p in json.load(open(trace))}
ev.sort(key=lambda e: (int(e['id'].split('-P')[0][1:]), e['play'], e['t0']))


def classify(e):
    p = tr[e['id']]; los = p['setup']['los']
    slot = {a['slot'] + a['team']: a['i'] for a in p['setup']['agents']}
    b, d = slot[e['players'][0] + 'O'], slot[e['players'][1] + 'D']
    fr = [f for f in p['frames'] if e['t0'] - 1e-6 <= f['t'] <= e['t1'] + 1e-6]
    f0 = fr[0]; r = f0['c']
    free = slot[re.search(r'while (\w+) is free', e['text']).group(1) + 'D']  # the detector's free defender
    left = any(f['a'][d][8] not in ('man', 'zone') for f in p['frames'] if f['t'] <= e['t1'])
    cause = ('engaged' if any(f['a'][b][5] == d for f in fr)
             else 'left coverage, receiver stays' if left else 'still in coverage')
    gap = math.hypot(f0['a'][b][0] - f0['a'][d][0], f0['a'][b][1] - f0['a'][d][1])
    return {'id': e['id'], 't': e['t0'], 'pair': f"{e['players'][0]}>{e['players'][1]}", 'concept': p['setup']['concept'],
            'cause': cause, 'gap': round(gap, 1), 'defender_job': f0['a'][d][8],
            'free': f"{re.search(r'while (\w+) is free', e['text']).group(1)}:{f0['a'][free][8]}{'/engaged' if f0['a'][free][5] >= 0 else ''}",
            'runner_x': round(f0['a'][r][0] - los, 1)}


rows = [classify(e) for e in ev]
if n:
    seen, sample = set(), []
    for r in rows:
        if r['id'] not in seen:
            seen.add(r['id']); sample.append(r)
    for r in sample[:n]:
        print(json.dumps(r))
    rows_n = sample[:n]
    print(f"sample {len(rows_n)}:", dict(collections.Counter(r['cause'] for r in rows_n)))
print(f"all {len(rows)} stalk events in {len({r['id'] for r in rows})} plays:", dict(collections.Counter(r['cause'] for r in rows)))
print('  free defender:', dict(collections.Counter(r['free'].split(':')[1] for r in rows).most_common(6)))
rx = sorted(r['runner_x'] for r in rows)
print(f"  runner behind the LOS at the event: {sum(x <= 0 for x in rx)} of {len(rx)}; median runner x {rx[len(rx) // 2]}")
