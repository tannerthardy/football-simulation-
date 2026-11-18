"""NFL counterpart of deep-close.mts: zone (PFF) throws of 15+ yd passLength, C/I/IN. Release = pass_forward; arrival =
pass_arrived (else first pass_outcome_*). Catch point = football at arrival. Deep men = defenders 10+ yd past the LOS
(football x at ball_snap) at the release; the one nearest the catch point. Speed toward the catch point from s/dir."""
import csv, sys, json, math
from collections import defaultdict
D = '/home/user/def-alignment/data/raw/bdb2025/big-data-bowl-data'
weeks = [int(w) for w in sys.argv[1:-1]]; OUT = sys.argv[-1]
ZONE = {'Cover-2', 'Cover-3', 'Cover-3 Seam', 'Quarters', 'Cover 6-Left', 'Cover-6 Right', 'Cover-3 Cloud Left', 'Cover-3 Cloud Right', 'Cover-3 Double Cloud', 'Cover-2 Sink'}
plays = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['passResult'] in ('C', 'I', 'IN') and r['pff_passCoverage'] in ZONE and r.get('passLength') not in (None, '', 'NA') and float(r['passLength']) >= 15 and r.get('playNullifiedByPenalty') != 'Y':
        plays[(r['gameId'], r['playId'])] = (r['pff_passCoverage'], r['passResult'], r['possessionTeam'])
out = []
for w in weeks:
    cur = None; F = defaultdict(dict); club = {}; evs = {}
    def flush():
        if cur not in plays: return
        cov, res, pos = plays[cur]
        kr = evs.get('pass_forward'); ka = evs.get('pass_arrived') or min([v for k, v in evs.items() if k.startswith('pass_outcome')] or [None], key=lambda v: v if v is not None else 1e9)
        ks = evs.get('ball_snap')
        if kr is None or ka is None or ks is None or 'football' not in F or ks not in F['football'] or ka not in F['football']: return
        left = next(iter(F['football'].values()))['dir'] == 'left'
        def P(n, f):
            q = F[n].get(f)
            if not q: return None
            x, y = float(q['x']), float(q['y'])
            return (120 - x, 53.3 - y) if left else (x, y)
        def V(n, f):
            q = F[n].get(f)
            if not q or q['s'] in ('NA', '') or q['dir'] in ('NA', ''): return None
            s, a = float(q['s']), math.radians(float(q['dir'])); vx, vy = s * math.sin(a), s * math.cos(a)
            return (-vx, -vy) if left else (vx, vy)
        def O(n, f):
            q = F[n].get(f)
            if not q or q['o'] in ('NA', ''): return None
            a = math.radians(float(q['o'])); fx, fy = math.sin(a), math.cos(a)
            return (-fx, -fy) if left else (fx, fy)
        los = P('football', ks)[0]; cpr = P('football', ka); cp = (cpr[0] - los, cpr[1])
        if cp[0] < 15: return
        defs = [n for n in F if n != 'football' and club.get(n) != pos and P(n, kr)]
        deep = [n for n in defs if P(n, kr)[0] - los >= 10]
        if not deep: return
        dm = min(deep, key=lambda n: math.hypot(P(n, kr)[0] - los - cp[0], P(n, kr)[1] - cp[1]))
        def tow(f):
            p, v = P(dm, f), V(dm, f)
            if not p or not v: return None
            ux, uy = cp[0] - (p[0] - los), cp[1] - p[1]; l = math.hypot(ux, uy) or 1
            return round((v[0] * ux + v[1] * uy) / l, 2)
        flight = (ka - kr) / 10
        p0, v0, o0 = P(dm, kr), V(dm, kr), O(dm, kr); pa = P(dm, ka)
        if not v0 or not pa: return
        out.append(dict(gid=cur[0], pid=cur[1], coverage=cov, res=res, flight=flight, air=round(cp[0], 1), d0=round(math.hypot(p0[0] - los - cp[0], p0[1] - cp[1]), 1),
            depth=round(p0[0] - los, 1), back=round(v0[0], 2), speed=round(math.hypot(*v0), 2), faceLOS=round(math.degrees(math.acos(max(-1, min(1, -o0[0])))) if o0 else None),
            v=[tow(kr + round(t * 10)) if t <= flight + 1e-6 else None for t in (0, 0.4, 0.8, 1.2)], dArr=round(math.hypot(pa[0] - los - cp[0], pa[1] - cp[1]), 1),
            caught=res == 'C', int=res == 'IN'))
    with open(f'{D}/tracking_week_{w}.csv') as fh:
        for r in csv.DictReader(fh):
            k = (r['gameId'], r['playId'])
            if k != cur: flush(); cur = k; F = defaultdict(dict); club = {}; evs = {}
            if k not in plays: continue
            n = r['nflId'] if r['nflId'] != 'NA' else 'football'
            f = int(r['frameId']); F[n][f] = dict(x=r['x'], y=r['y'], s=r['s'], dir=r['dir'], o=r['o'], d=r['playDirection']); club[n] = r['club']
            if n == 'football': F[n][f]['dir'] = r['playDirection']
            e = r['event']
            if e and e != 'NA' and e not in evs: evs[e] = f
        flush()
json.dump(out, open(OUT, 'w')); print('rows', len(out))
