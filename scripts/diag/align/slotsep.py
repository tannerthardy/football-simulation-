"""Separation of the detached #2 from the off-man defender over him (nearest at the snap, 2+ yd off, within 2 yd
laterally) at 1.0 and 1.5 s, man coverage, common-format plays (NFL: out/mechanics/nfl-plays.jsonl.gz).
usage: slotsep.py PLAYS.jsonl.gz"""
import gzip, json, sys, math, collections
MAN = {'Cover-0', 'Cover-1', '2-Man', 'Cover 1', 'Cover 0'}
def q(v):
    v = sorted(v); n = len(v)
    return f"{v[n//4]:.2f}/{v[n//2]:.2f}/{v[(3*n)//4]:.2f} (n {n})" if n >= 10 else f"- (n {n})"
R = collections.defaultdict(list)
for line in gzip.open(sys.argv[1], 'rt'):
    p = json.loads(line)
    if p.get('kind') != 'pass' or (p.get('cell') or {}).get('coverage') not in MAN: continue
    xy, dt, by = p['xy'], p['dt'], p['ball_y']; pl = p['players']
    if len(xy) < int(1.5 / dt) + 1: continue
    X = lambda k, i: xy[k][2*i]; Y = lambda k, i: xy[k][2*i+1]
    ol = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'OL']
    if len(ol) != 5: continue
    los = max(X(0, i) for i in ol) + 0.0
    for sgn in (1, -1):
        tk = max(Y(0, i) * sgn for i in ol) * sgn
        recs = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] in ('WR', 'TE', 'RB') and (Y(0, i) - tk) * sgn > 0.5 and (abs(Y(0, i) - by) > 3.5)]
        recs.sort(key=lambda i: -(Y(0, i) - by) * sgn)
        if len(recs) < 2: continue
        two = recs[1]; w = (Y(0, two) - tk) * sgn
        if not 3.5 <= w < 8: continue
        de = [j for j, a in enumerate(pl) if a['side'] == 'D' and a['group'] in ('DB', 'LB')]
        if not de: continue
        m = min(de, key=lambda j: math.hypot(X(0, j) - X(0, two), Y(0, j) - Y(0, two)))
        dep = abs(X(0, m) - X(0, two))
        if dep < 2 or abs(Y(0, m) - Y(0, two)) > 2: continue   # off man, over him
        s = lambda t: math.hypot(X(int(round(t/dt)), m) - X(int(round(t/dt)), two), Y(int(round(t/dt)), m) - Y(int(round(t/dt)), two))
        R['depth'].append(dep); R['s10'].append(s(1.0)); R['s15'].append(s(1.5))
        k = 'shallow (<3.5)' if dep < 3.5 else 'deep (>=3.5)'
        R[k+' s10'].append(s(1.0)); R[k+' s15'].append(s(1.5))
print(sys.argv[1].split('/')[-1], '| off-man defender over the detached #2 (nearest at the snap, 2+ yd off, within 2 yd laterally)')
print('  depth off him', q(R['depth'])); print('  sep 1.0 s', q(R['s10'])); print('  sep 1.5 s', q(R['s15']))
for k in ('shallow (<3.5)', 'deep (>=3.5)'): print(f"  {k}: sep 1.0 s {q(R[k+' s10'])} | 1.5 s {q(R[k+' s15'])}")
