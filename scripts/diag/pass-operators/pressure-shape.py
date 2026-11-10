"""What 'pressure by a blocked man' is, physically (Integration, 2026-11-10). Same code on NFL tracking
(out/mechanics/nfl-plays.jsonl.gz, pass plays) and the sim's pass-frames.mts records: x from the line of scrimmage, offense
attacking +x, 0.1 s frames from the snap. First pressure = the first frame from 0.3 s, before the throw, with a defender
within 2.0 yd of the QB. 'Blocked' = an offensive player other than the QB within 1.2 yd of that defender then.
For blocked pressures, at that frame:
  - shape: 'in front' = the nearest such blocker is between him and the QB (blocker nearer the QB by > 0.3 yd and within
    45 deg of the rusher's line to the QB); else 'edge' (level with or past the blocker's shoulder toward the QB);
  - who closed the last 0.5 s: the QB's displacement toward the rusher against the rusher's toward the QB (QB-driven if
    the QB's share is larger);
  - the blocker's depth behind the line and his retreat speed over the last 0.5 s, and the QB's depth;
  - then: how long the QB still held the ball, and the closest the rusher got before the throw.
usage: python3 -I pressure-shape.py <nfl.jsonl.gz | sim pass-frames jsonl> [...]"""
import sys, os, json, gzip, math, statistics as st, collections as C
def med(a):
    return round(st.median(a), 2) if a else float('nan')
for path in sys.argv[1:]:
    op = gzip.open if path.endswith('.gz') else open
    n = pressed = 0; blk = C.Counter(); M = C.defaultdict(list)
    for l in op(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass':
            continue
        pl, X = p['players'], p['xy']
        Q = [i for i, q in enumerate(pl) if q['group'] == 'QB']
        if len(Q) != 1:
            continue
        q = Q[0]; O = [i for i, a in enumerate(pl) if a['side'] == 'O' and i != q]; D = [i for i, a in enumerate(pl) if a['side'] == 'D']
        thr = p['events'].get('pass_forward'); end = len(X) if thr is None else min(len(X), int(round(thr / 0.1)))
        if end < 8:
            continue
        n += 1
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1])
        dist = lambda i, j, f: math.dist(P(i, f), P(j, f))
        hit = None
        for f in range(3, end):
            ds = [(dist(d, q, f), d) for d in D]
            dm, d = min(ds)
            if dm <= 2.0:
                hit = (f, d); break
        if not hit:
            continue
        pressed += 1; f, d = hit
        near = sorted((dist(o, d, f), o) for o in O)
        if near[0][0] > 1.2:
            blk['free'] += 1; continue
        b = near[0][1]
        dq, bq = dist(d, q, f), dist(b, q, f)
        rx, ry = P(q, f)[0] - P(d, f)[0], P(q, f)[1] - P(d, f)[1]; bx, by = P(b, f)[0] - P(d, f)[0], P(b, f)[1] - P(d, f)[1]
        ang = math.degrees(math.acos(max(-1, min(1, (rx * bx + ry * by) / max(1e-6, math.hypot(rx, ry) * math.hypot(bx, by))))))
        shape = 'in front' if bq < dq - 0.3 and ang < 45 else 'edge'
        g = max(0, f - 5); u = ((P(d, g)[0] - P(q, g)[0]), (P(d, g)[1] - P(q, g)[1])); un = math.hypot(*u) or 1; u = (u[0] / un, u[1] / un)
        qb_part = (P(q, f)[0] - P(q, g)[0]) * u[0] + (P(q, f)[1] - P(q, g)[1]) * u[1]
        r_part = -((P(d, f)[0] - P(d, g)[0]) * u[0] + (P(d, f)[1] - P(d, g)[1]) * u[1])
        closer = 'QB' if qb_part > r_part else 'rusher'
        key = f'{shape}, {closer} closed'
        blk[key] += 1
        M[key + '|bdepth'].append(-P(b, f)[0]); M[key + '|bback'].append(-(P(b, f)[0] - P(b, g)[0]) / ((f - g) * 0.1))
        M[key + '|qdepth'].append(-P(q, f)[0]); M[key + '|t'].append(f * 0.1); M[key + '|held'].append((end - f) * 0.1)
        M[key + '|closest'].append(min(dist(d, q, h) for h in range(f, end)))
        M['all|bdepth'].append(-P(b, f)[0]); M['all|bback'].append(-(P(b, f)[0] - P(b, g)[0]) / ((f - g) * 0.1)); M['all|held'].append((end - f) * 0.1)
        M['all|closest'].append(min(dist(d, q, h) for h in range(f, end))); M['all|qdepth'].append(-P(q, f)[0]); M['all|t'].append(f * 0.1)
    nb = sum(v for k, v in blk.items() if k != 'free')
    print(f"== {os.path.basename(path)}: {n} dropbacks; first pressure {pressed / max(1, n):.1%}; by a blocked man {nb / max(1, pressed):.0%}, free {blk['free'] / max(1, pressed):.0%}")
    for k in ['all'] + sorted(k for k in blk if k != 'free'):
        c = nb if k == 'all' else blk[k]
        print(f"   {k:28s} n {c:5d} ({c / max(1, nb):4.0%} of blocked) | at {med(M[k + '|t'])} s; blocker depth {med(M[k + '|bdepth'])} yd, retreat {med(M[k + '|bback'])} yd/s; QB depth {med(M[k + '|qdepth'])} | QB then held {med(M[k + '|held'])} s, closest {med(M[k + '|closest'])} yd")
