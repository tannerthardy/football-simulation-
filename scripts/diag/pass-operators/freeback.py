"""Free inside-backer first pressures: where was the back? (common play format)

First pressure: first frame from 0.3 s, before the throw, with a defender
within 2.0 yd of the QB; free: no other offensive player within 1.2 yd of
him (freerush.py's operator). Kept: an off-ball (more than 1 yd off the ball
at the snap) defender inside the OL span at the snap. For each, the back:
  none      no RB on the field;
  released  he left (past the line, or 6+ yd wide) before the blitzer
            crossed the line;
  late      he left after the blitzer crossed;
  in        he was still in the backfield, and how near the blitzer he was
            when the blitzer crossed (on the blitzer's side or the other).

  python3 -I scripts/diag/pass-operators/freeback.py PLAYS.jsonl.gz [...]
"""
import collections, gzip, json, math, statistics as st, sys

for path in sys.argv[1:]:
    C = collections.Counter(); D = []
    for line in gzip.open(path, 'rt'):
        p = json.loads(line)
        if p.get('kind') != 'pass':
            continue
        pl = p['players']; xy = p['xy']; dt = p.get('dt', .1); by = p.get('ball_y', 0)
        ev = p.get('events', {}); end = ev.get('pass_forward', ev.get('end', (len(xy) - 1) * dt))
        P = lambda f, j: (xy[f][2 * j], xy[f][2 * j + 1])
        qb = next((j for j, q in enumerate(pl) if q['side'] == 'O' and q['group'] == 'QB'), None)
        if qb is None:
            continue
        off = [j for j, q in enumerate(pl) if q['side'] == 'O' and j != qb]
        ol = [j for j in off if pl[j]['group'] == 'OL']
        de = [j for j, q in enumerate(pl) if q['side'] == 'D']
        rbs = [j for j in off if pl[j]['group'] == 'RB']
        lo = min(P(0, j)[1] for j in ol); hi = max(P(0, j)[1] for j in ol)
        hit = None
        for f in range(int(round(.3 / dt)), min(len(xy), int(round(end / dt)) + 1)):
            qx, qy = P(f, qb)
            for d in de:
                dx, dy = P(f, d)
                if math.hypot(dx - qx, dy - qy) <= 2.0:
                    if all(math.hypot(P(f, o)[0] - dx, P(f, o)[1] - dy) > 1.2 for o in off):
                        hit = (f, d)
                    else:
                        hit = (f, None)
                    break
            if hit:
                break
        if not hit or hit[1] is None:
            continue
        f, d = hit
        x0, y0 = P(0, d)
        if not (x0 > 1 and lo - 0.5 <= y0 <= hi + 0.5):
            continue
        C['free_inside_backer'] += 1
        cross = next((g for g in range(f + 1) if P(g, d)[0] <= 0), f)
        if not rbs:
            C['none'] += 1; continue
        rb = rbs[0]
        rel = next((g for g in range(f + 1) if P(g, rb)[0] > 0 or abs(P(g, rb)[1] - by) > 6), None)
        if rel is not None and rel <= cross:
            C['released'] += 1
        elif rel is not None:
            C['late'] += 1
        else:
            C['in'] += 1
            bx, byy = P(cross, rb); dx, dy = P(cross, d)
            D.append(math.hypot(bx - dx, byy - dy))
            C['in_same_side' if (byy - by) * (dy - by) > 0 else 'in_other_side'] += 1
    n = max(1, C['free_inside_backer'])
    print(f"{path.split('/')[-1]}: free inside-backer first pressures {C['free_inside_backer']}")
    for k in ('none', 'released', 'late', 'in', 'in_same_side', 'in_other_side'):
        print(f"  {k:14s} {C[k]:4d} ({100*C[k]/n:.0f}%)")
    if D:
        print(f"  back in: distance to the blitzer as he crosses p25/50/75 {'/'.join(f'{v:.1f}' for v in st.quantiles(D, n=4))} yd")
