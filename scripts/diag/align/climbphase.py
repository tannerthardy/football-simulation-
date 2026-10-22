"""Zone double-team climbs, phase by phase (NFL tracking vs sim, same code).
For each offensive lineman who first comes within 1.2 yd of a line defender
(<2 yd deep at the snap) and later within 1.2 yd of an off-ball defender
(2.5-8 yd deep at the snap) before 3 s: first DL touch, the last frame he is
still within 1.2 yd of that DL before reaching the backer (leave), and the
backer touch. Reports p25/50/75 of each time and of leave - touch (time on
the down man) and backer - leave (the climb), plus the share of linemen who
reach a backer by 2.0 s; where they meet (the backer's depth past the
ball at the meeting and at the snap, and how far he has moved laterally).
Direct climbs: linemen who reach a backer before 3 s
without first touching a line defender (time of the backer touch).
--gun / --uc keep shotgun / under-center snaps (QB over 2.5 yd deep or not).
usage: climbphase.py FILE [FILE ...] [--gun|--uc] [--concepts A,B]  (default: zone concepts)"""
import gzip, json, sys
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
ZONE = ('INSIDE ZONE', 'OUTSIDE ZONE', 'insideZone', 'outsideZone', 'wideZone')
GUN = '--gun' in sys.argv; UC = '--uc' in sys.argv
if '--concepts' in sys.argv: ZONE = tuple(sys.argv[sys.argv.index('--concepts') + 1].split(','))
for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
    touch, leave, reach, on, climb, direct = [], [], [], [], [], []
    meetDepth, backerDepth0, meetLat = [], [], []
    n = by2 = 0
    for line in gzip.open(path, 'rt'):
        r = json.loads(line)
        if r.get('kind') != 'run' or (r.get('cell') or {}).get('concept') not in ZONE: continue
        xy, P, dt = r['xy'], r['players'], r['dt']
        x0 = xy[0]
        ol = sorted([i for i, p in enumerate(P) if p['side'] == 'O' and p['group'] == 'OL' and x0[2 * i] is not None], key=lambda i: x0[2 * i + 1])
        if len(ol) != 5: continue
        los = x0[2 * ol[2]] + .3
        qb = [i for i, p in enumerate(P) if p['group'] == 'QB' and x0[2 * i] is not None]
        if (GUN or UC) and (not qb or (los - x0[2 * qb[0]] > 2.5) != GUN): continue
        dl = [i for i, p in enumerate(P) if p['side'] == 'D' and x0[2 * i] is not None and x0[2 * i] - los < 2]
        lb = [i for i, p in enumerate(P) if p['side'] == 'D' and x0[2 * i] is not None and 2.5 <= x0[2 * i] - los <= 8]
        near = lambda k, i, ds: next((d for d in ds if xy[k][2 * d] is not None and xy[k][2 * i] is not None
            and ((xy[k][2 * i] - xy[k][2 * d]) ** 2 + (xy[k][2 * i + 1] - xy[k][2 * d + 1]) ** 2) ** .5 < 1.2), None)
        K = min(len(xy), int(3.0 / dt))
        for i in ol:
            n += 1
            t0 = next((k for k in range(K) if near(k, i, dl) is not None), None)
            if t0 is None:
                tl = next((k for k in range(K) if near(k, i, lb) is not None), None)
                if tl is not None: direct.append(tl * dt)
                continue
            t2 = next((k for k in range(t0, K) if near(k, i, lb) is not None), None)
            if t2 is None: continue
            t1 = max(k for k in range(t0, t2 + 1) if near(k, i, dl) is not None)
            touch.append(t0 * dt); leave.append(t1 * dt); reach.append(t2 * dt)
            b = near(t2, i, lb)  # where they meet: the backer's depth past the ball then and at the snap
            meetDepth.append(xy[t2][2 * b] - los); backerDepth0.append(xy[0][2 * b] - los)
            meetLat.append(abs(xy[t2][2 * b + 1] - xy[0][2 * b + 1]))
            on.append((t1 - t0) * dt); climb.append((t2 - t1) * dt)
            by2 += t2 * dt <= 2.0
    print(f"== {path.split('/')[-1]}{' gun' if GUN else ' uc' if UC else ''} linemen {n} | touch DL then reach a backer: {len(reach)} ({100 * len(reach) / max(n, 1):.0f}%), by 2.0 s {100 * by2 / max(n, 1):.0f}% | direct to a backer {100 * len(direct) / max(n, 1):.0f}% at p25/50/75 {q(direct, .25)}/{q(direct)}/{q(direct, .75)} s")
    for name, v in (('backer depth at snap', backerDepth0), ('backer depth at meeting', meetDepth), ('backer lateral moved by meeting', meetLat), ('DL touch', touch), ('leave DL', leave), ('reach backer', reach), ('on the down man', on), ('climb', climb)):
        print(f"  {name:16s} p25/50/75 {q(v, .25)}/{q(v)}/{q(v, .75)} {'yd' if name.startswith('backer ') and name != 'backer' and 'depth' in name or 'lateral' in name else 's'}")
