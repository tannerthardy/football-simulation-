"""The edge against an off-ball tight receiver, same code for NFL and sim common format. Observation only.
At the snap, on each side where a non-OL offensive player stands 0.3-2.3 yd outside the outermost OL laterally and
0.6+ yd deeper than the OL (an off-ball tight receiver: wing, H, tight slot) with no attached player (within 0.6 yd of
the OL's depth) in that band: the widest defender on the line on that side (DL or LB within 1.5 yd of the ball), his
offset outside the tackle; whether he is outside / over / inside the receiver; and the widest defender within 4 yd of
the ball outside the receiver (the contain man): his group and depth. By kind (run / pass); runs also by direction.
usage: python3 -I scripts/diag/align/wing_edge.py name=a.jsonl.gz[,b] ..."""
import sys, gzip, json, statistics as st, collections as C


def snap(raw):
    f0 = raw['xy'][0]
    return [(f0[2 * i], f0[2 * i + 1]) for i in range(len(raw['players']))]


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            if raw.get('kind') not in ('run', 'pass') or not raw.get('xy'): continue
            pl = raw['players']; P = snap(raw); by = raw.get('ball_y', 26.65)
            OL = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'OL' and P[i][0] is not None]
            if len(OL) < 5: continue
            olx = st.median(P[i][0] for i in OL)
            for sg in (1, -1):
                ty = max((P[i][1] - by) * sg for i in OL)
                band = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] not in ('OL', 'QB')
                        and P[i][0] is not None and .3 < (P[i][1] - by) * sg - ty <= 2.3 and P[i][0] > -5]
                if not band or any(abs(P[i][0] - olx) < .6 for i in band): continue
                w = [i for i in band if olx - P[i][0] >= .6]
                if not w: continue
                w = max(w, key=lambda i: (P[i][1] - by) * sg); wy = (P[w][1] - by) * sg
                line_d = [i for i, a in enumerate(pl) if a['side'] == 'D' and a['group'] in ('DL', 'LB')
                          and P[i][0] is not None and P[i][0] <= 1.5 and (P[i][1] - by) * sg > 0]
                if not line_d: continue
                e = max(line_d, key=lambda i: (P[i][1] - by) * sg); ey = (P[e][1] - by) * sg
                near = [i for i, a in enumerate(pl) if a['side'] == 'D' and P[i][0] is not None and P[i][0] <= 4
                        and (P[i][1] - by) * sg > wy + .4]
                c = min(near, key=lambda i: (P[i][1] - by) * sg) if near else None
                rel = 'outside' if ey - wy > .4 else 'inside' if ey - wy < -.4 else 'over'
                run_dir = None
                if raw['kind'] == 'run' and raw.get('carrier') is not None and len(raw['xy']) > 15:
                    k = min(len(raw['xy']) - 1, round(1.5 / raw['dt'])); cy = raw['xy'][k][2 * raw['carrier'] + 1]
                    run_dir = 'to' if (cy - by) * sg > 1 else 'away' if (cy - by) * sg < -1 else 'middle'
                R.append(dict(kind=raw['kind'], out=ey - ty, rel=rel, wy=wy - ty, wd=olx - P[w][0], eg=pl[e]['group'],
                              cg=pl[c]['group'] if c is not None else 'none', cd=P[c][0] if c is not None else None,
                              cy=(P[c][1] - by) * sg - wy if c is not None else None, dir=run_dir, yds=raw.get('yards')))
    n = len(R)
    if not n: print(f'== {name}: none'); continue
    print(f"== {name}: sides with an off-ball tight receiver and no attached end, n {n} (run {sum(r['kind'] == 'run' for r in R)})")
    print(f"   receiver: {st.median(r['wy'] for r in R):.2f} yd outside the tackle, {st.median(r['wd'] for r in R):.2f} yd off the line")
    for kind in ('run', 'pass', None):
        X = [r for r in R if kind is None or r['kind'] == kind]
        if not X: continue
        rel = C.Counter(r['rel'] for r in X); cg = C.Counter(r['cg'] for r in X)
        q = sorted(r['out'] for r in X)
        print(f"   {kind or 'all':4} n {len(X):4}: widest on the line outside the tackle p25/p50/p75 {q[len(q) // 4]:+.2f} / {q[len(q) // 2]:+.2f} / {q[3 * len(q) // 4]:+.2f}"
              f" | vs receiver " + ', '.join(f'{k} {v / len(X):.0%}' for k, v in rel.most_common())
              + f" | his group " + ', '.join(f'{k} {v / len(X):.0%}' for k, v in C.Counter(r['eg'] for r in X).most_common())
              + f" | first defender outside the receiver (within 4 yd deep): " + ', '.join(f'{k} {v / len(X):.0%}' for k, v in cg.most_common())
              + (f", his depth {st.median(r['cd'] for r in X if r['cd'] is not None):.1f}, {st.median(r['cy'] for r in X if r['cy'] is not None):.1f} outside" if any(r['cd'] is not None for r in X) else ''))
    runs = [r for r in R if r['dir']]
    for d in ('to', 'middle', 'away'):
        X = [r for r in runs if r['dir'] == d]
        if X: print(f"   runs {d:6} n {len(X):3}: yards mean {st.mean(r['yds'] for r in X):.2f} p50 {st.median(r['yds'] for r in X):.1f}, 10+ {sum(r['yds'] >= 10 for r in X) / len(X):.0%}; widest outside tackle {st.median(r['out'] for r in X):+.2f}")
