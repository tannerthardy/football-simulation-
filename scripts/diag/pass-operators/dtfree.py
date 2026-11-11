"""Interior defensive linemen coming free untouched, per 100 dropbacks, same operator both sides (report only).

A dropback as in protection.py (5 OL, at least 0.8 s before the throw). First pressure: the first frame from 0.3 s,
before the throw, with a defender within 2.0 yd of the QB; free if no offensive non-QB player is within 1.2 yd of him.
Counted only if he is past the line of scrimmage then (under center, a nose tackle on the ball is
within 2 yd of the QB at 0.3 s without rushing). Interior: a DL aligned inside the tackles at the snap (between the LT's and RT's y, 0.5 yd inside each). Untouched:
no offensive non-QB player within 1.0 yd of him at any frame from the snap to the pressure. Context, by geometry:
a DL game if any two DL have swapped lateral order by the pressure frame; an interior blitz if an off-ball LB/DB
(1.5+ yd off at the snap) is past the line within the OL span by 1.0 s.
  python3 dtfree.py nfl out/mechanics/nfl-plays.jsonl.gz
  python3 dtfree.py sim exp.jsonl.gz[,exp2.jsonl.gz]"""
import sys, json, gzip, math, collections as C
mode, paths = sys.argv[1], sys.argv[2].split(',')
n = 0; c = C.Counter()
for path in paths:
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass': continue
        pl, X = p['players'], p['xy']; Q = [i for i, q in enumerate(pl) if q['group'] == 'QB']
        if len(Q) != 1: continue
        q = Q[0]; O = [i for i, a in enumerate(pl) if a['side'] == 'O' and i != q]; Dd = [i for i, a in enumerate(pl) if a['side'] == 'D']
        OLi = [i for i in O if pl[i]['group'] == 'OL']
        if len(OLi) < 5: continue
        thr = p['events'].get('pass_forward'); end = len(X) if thr is None else min(len(X), int(round(thr / 0.1)))
        if end < 8: continue
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1])
        n += 1
        ys = sorted(P(o, 0)[1] for o in OLi); lo, hi = ys[0] + 0.5, ys[-1] - 0.5
        hit = None
        for f in range(3, end):
            dm, d = min((math.dist(P(e, f), P(q, f)), e) for e in Dd)
            if dm <= 2.0: hit = (f, d); break
        if not hit: continue
        f, d = hit
        c['first pressure'] += 1
        if min(math.dist(P(o, f), P(d, f)) for o in O) <= 1.2: continue
        c['free first pressure'] += 1
        # Past the line: with the QB under center a nose tackle on the ball is within 2 yd of him at 0.3 s
        # without having rushed (23 of the first 34 NFL rows were that).
        if P(d, f)[0] >= 0: c['free first pressure, defender not past the line'] += 1; continue
        if pl[d]['group'] != 'DL' or not (lo <= P(d, 0)[1] <= hi): continue
        if any(math.dist(P(o, g), P(d, g)) <= 1.0 for g in range(0, f + 1) for o in O): continue
        DL = sorted((i for i in Dd if pl[i]['group'] == 'DL'), key=lambda i: P(i, 0)[1])
        game = [i for i in sorted(DL, key=lambda i: P(i, f)[1])] != DL
        k = min(10, len(X) - 1)
        blitz = any(pl[e]['group'] in ('LB', 'DB') and P(e, 0)[0] > 1.5 and P(e, k)[0] < 0 and ys[0] - 1 <= P(e, k)[1] <= ys[-1] + 1 for e in Dd)
        c['interior DL free untouched'] += 1
        c[f"interior DL free untouched: {'after a DL game' if game else 'with an interior blitz' if blitz else 'no game, no interior blitz'}"] += 1
print(f'== {mode}: {n} dropbacks')
for k in sorted(c): print(f'  {k:55} {c[k]:5d}  {100 * c[k] / n:5.2f} per 100')
