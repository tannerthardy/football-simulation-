"""Zone double-team climbs, phase by phase (NFL tracking vs sim, same code).
For each offensive lineman who first comes within 1.2 yd of a line defender
(<2 yd deep at the snap) and later within 1.2 yd of an off-ball defender
(2.5-8 yd deep at the snap) before 3 s: first DL touch, the last frame he is
still within 1.2 yd of that DL before reaching the backer (leave), and the
backer touch. Reports p25/50/75 of each time and of leave - touch (time on
the down man) and backer - leave (the climb), plus the share of linemen who
reach a backer by 2.0 s.
usage: climbphase.py FILE [FILE ...]"""
import gzip, json, sys
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
ZONE = ('INSIDE ZONE', 'OUTSIDE ZONE', 'insideZone', 'outsideZone', 'wideZone')
for path in sys.argv[1:]:
    touch, leave, reach, on, climb = [], [], [], [], []
    n = by2 = 0
    for line in gzip.open(path, 'rt'):
        r = json.loads(line)
        if r.get('kind') != 'run' or (r.get('cell') or {}).get('concept') not in ZONE: continue
        xy, P, dt = r['xy'], r['players'], r['dt']
        x0 = xy[0]
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and x0[2 * i] is not None], key=lambda i: x0[2 * i + 1])
        if len(ol) != 5: continue
        los = x0[2 * ol[2]] + .3
        dl = [i for i, p in enumerate(P) if p['side'] == 'D' and x0[2 * i] is not None and x0[2 * i] - los < 2]
        lb = [i for i, p in enumerate(P) if p['side'] == 'D' and x0[2 * i] is not None and 2.5 <= x0[2 * i] - los <= 8]
        near = lambda k, i, ds: next((d for d in ds if xy[k][2 * d] is not None and xy[k][2 * i] is not None
            and ((xy[k][2 * i] - xy[k][2 * d]) ** 2 + (xy[k][2 * i + 1] - xy[k][2 * d + 1]) ** 2) ** .5 < 1.2), None)
        K = min(len(xy), int(3.0 / dt))
        for i in ol:
            n += 1
            t0 = next((k for k in range(K) if near(k, i, dl) is not None), None)
            if t0 is None: continue
            t2 = next((k for k in range(t0, K) if near(k, i, lb) is not None), None)
            if t2 is None: continue
            t1 = max(k for k in range(t0, t2 + 1) if near(k, i, dl) is not None)
            touch.append(t0 * dt); leave.append(t1 * dt); reach.append(t2 * dt)
            on.append((t1 - t0) * dt); climb.append((t2 - t1) * dt)
            by2 += t2 * dt <= 2.0
    print(f"== {path.split('/')[-1]} linemen {n} | touch DL then reach a backer: {len(reach)} ({100 * len(reach) / max(n, 1):.0f}%), by 2.0 s {100 * by2 / max(n, 1):.0f}%")
    for name, v in (('DL touch', touch), ('leave DL', leave), ('reach backer', reach), ('on the down man', on), ('climb', climb)):
        print(f"  {name:16s} p25/50/75 {q(v, .25)}/{q(v)}/{q(v, .75)} s")
