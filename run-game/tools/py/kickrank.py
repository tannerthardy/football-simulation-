"""Rank counter snaps by kick-puller contact gain between two arms (sim traces, same snaps/shifts).
Per trace: kick puller (plan pull, role kick) and his snap target; reached = within 1.2 yd of the target before the
carrier crosses + 0.6 s; also the target's min distance to the carrier. usage: kickrank.py dir ARM_A ARM_B"""
import sys, json, glob, math, collections
d, A, B = sys.argv[1:4]
def load(arm):
    out = {}
    for path in glob.glob(f'{d}/trace-seed*-run-{arm}.json'):
        for p in json.load(open(path)):
            s = p['setup']
            if p['nullified'] or s.get('concept') != 'counter': continue
            ag = s['agents']; idx = {a['slot']: i for i, a in enumerate(ag)}; F = p['frames']
            kp = next((i for i, a in enumerate(ag) if a.get('plan') == 'pull' and a.get('role') == 'kick'), None)
            if kp is None or ag[kp].get('tgt') not in idx: continue
            e = idx[ag[kp]['tgt']]
            car = next((f['c'] for f in F if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
            if car is None: continue
            xy = [[(q[0] - s['los'], q[1]) for q in f['a']] for f in F]; n = len(xy)
            cross = next((k for k in range(n) if xy[k][car][0] >= 0), None); end = min(n, (cross if cross is not None else n) + 7)
            reached = next((k for k in range(end) if math.dist(xy[k][kp], xy[k][e]) < 1.2), None)
            out[p['id']] = (reached is not None, ag[kp]['slot'], ag[kp]['tgt'], s['formation'], s['front'], p['yards'])
    return out
a, b = load(A), load(B); rows = collections.defaultdict(list)
for k in a:
    if k in b: rows[k.rsplit('.', 1)[0]].append((a[k][0], b[k][0], a[k], b[k]))
best = sorted(rows.items(), key=lambda kv: (-sum(y and not x for x, y, *_ in kv[1]), sum(x for x, *_ in kv[1])))
for sn, v in best[:8]:
    print(sn, v[0][2][1:5], 'A reach', [int(x) for x, *_ in v], 'B reach', [int(y) for _, y, *_ in v])
print('snaps', len(rows), 'reach A', sum(x for v in rows.values() for x, *_ in v), 'reach B', sum(y for v in rows.values() for _, y, *_ in v), 'of', sum(len(v) for v in rows.values()))
