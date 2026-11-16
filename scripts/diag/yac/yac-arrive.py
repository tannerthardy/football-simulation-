"""Zone vs man after the catch, one operator for NFL common-format plays and the staged sim (zone-man-after.mts).
usage: python3 -I scripts/diag/yac/yac-arrive.py --nfl NFL.jsonl.gz --sim out/diag/yac/cover*.json
Per completion, positions only (0.1 s grid, attack direction +x): first defender within 1 yd of the carrier and when;
YAC before and after that moment (carrier x then, vs the play's YAC); never reached and its YAC; his closing speed
0.3 s before and where he arrives relative to the carrier's run (front / side / behind); the 2nd and 3rd arrivals;
defenders within 3 yd at +1.0 s."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402

q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
mean = lambda v: sum(v) / len(v) if v else float('nan')


def nfl(path):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass':
            continue
        ev = raw.get('events') or {}; tc = ev.get('catch'); r = raw.get('target')
        if tc is None or r is None or raw.get('yards') is None:
            continue
        fam = coverage_family((raw.get('cell') or {}).get('coverage'))
        if fam is None:
            continue
        p = Play(raw)
        if not p.live(tc):
            continue
        kc = p.k(tc); end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
        C, D = [], {i: [] for i in p.who('D')}
        for k in range(kc, end + 1):
            C.append(p.pos(r, k))
            for i in D: D[i].append(p.pos(i, k))
        if C[0][0] is None:
            continue
        yield dict(fam=fam, dt=p.dt, yac=raw['yards'] - C[0][0], C=C, D=D)


def sim(paths):
    for path in paths:
        for r in json.load(open(path)):
            fam = 'man' if r['coverage'] in ('cover0', 'cover1') else 'zone'
            tr = r['tr']; s = r['dir']
            C = [(f['c']['x'] * s, f['c']['y']) for f in tr]
            D = {}
            for f in tr:
                for d in f['d']:
                    D.setdefault(d['i'], []).append((d['x'] * s, d['y']))
            dt = (tr[-1]['t'] - tr[0]['t']) / max(1, len(tr) - 1)
            yield dict(fam=fam, dt=dt, yac=r['yac'], C=C, D=D)


def vel(P, k, dt):
    a, b = max(0, k - 1), min(len(P) - 1, k + 1)
    if b == a or P[a][0] is None or P[b][0] is None:
        return (0.0, 0.0)
    return ((P[b][0] - P[a][0]) / ((b - a) * dt), (P[b][1] - P[a][1]) / ((b - a) * dt))


def measure(pl):
    C, D, dt = pl['C'], pl['D'], pl['dt']
    dist = lambda i, k: math.inf if D[i][k][0] is None else math.hypot(D[i][k][0] - C[k][0], D[i][k][1] - C[k][1])
    arr = {}
    for i in D:
        k = next((k for k in range(len(C)) if dist(i, k) <= 1.0), None)
        if k is not None:
            arr[i] = k
    order = sorted(arr, key=arr.get)
    m = dict(fam=pl['fam'], yac=pl['yac'], reached=bool(order))
    k1 = int(round(1.0 / dt))
    m['near3_1s'] = sum(1 for i in D if k1 < len(C) and dist(i, k1) <= 3) if k1 < len(C) else None
    m['near5_0'] = sum(1 for i in D if dist(i, 0) <= 5)
    # defenders downfield of the carrier at the catch (> 2 yd ahead, within 15 yd): their closing speed on him at 0 / +0.3 / +0.6 s
    dn = []
    for i in D:
        if D[i][0][0] is None or not (D[i][0][0] - C[0][0] > 2 and dist(i, 0) <= 15):
            continue
        row = []
        for tt in (0, .3, .6):
            k = int(round(tt / dt))
            if k >= len(C) or D[i][k][0] is None:
                row.append(None); continue
            vx, vy = vel(D[i], k, dt); dx, dy = C[k][0] - D[i][k][0], C[k][1] - D[i][k][1]; L = math.hypot(dx, dy) or 1e-9
            row.append((vx * dx + vy * dy) / L)
        dn.append((dist(i, 0), row, min(dist(i, k) for k in range(len(C)))))
    m['dn'] = dn
    # approach episodes: a defender comes inside 2.0 yd; contact = he reaches 1.0 yd; whiff = he opens back past 3.0 yd first
    ep = []
    for i in D:
        k = 0
        while k < len(C):
            if dist(i, k) < 2.0:
                kk = k; res = 'open'
                while kk < len(C):
                    if dist(i, kk) <= 1.0: res = 'contact'; break
                    if dist(i, kk) > 3.0: res = 'whiff'; break
                    kk += 1
                cvx, cvy = vel(C, k, dt); cs = math.hypot(cvx, cvy)
                ux, uy = D[i][k][0] - C[k][0], D[i][k][1] - C[k][1]; Lu = math.hypot(ux, uy) or 1e-9
                lev = math.degrees(math.acos(max(-1, min(1, (ux * cvx + uy * cvy) / (Lu * cs))))) if cs > 1 else float('nan')
                ep.append((res, k * dt, lev, cs))
                if res != 'whiff':
                    break
                k = kk
            k += 1
    m['ep'] = ep
    sp = lambda P, k: math.hypot(*vel(P, k, dt))
    m['cs'] = [sp(C, int(round(t / dt))) if int(round(t / dt)) < len(C) else None for t in (0, .5, 1, 2)]
    m['cpk'] = max(sp(C, k) for k in range(len(C)))
    ds = []
    for t in (1, 2):
        k = int(round(t / dt))
        if k >= len(C):
            ds.append(None); continue
        near = sorted((dist(i, k), i) for i in D if D[i][k][0] is not None)[:3]
        ds.append((mean([sp(D[i], k) for _, i in near]), mean([d for d, _ in near]), sum(1 for d, _ in near if d < 5)))
    m['ds'] = ds
    # every contact (a defender reaching 1.0 yd): carrier speed there, and whether the carrier still gains 5+ yd after it
    m['cx'] = []
    for i in arr:
        k = arr[i]
        m['cx'].append((sp(C, k), pl['yac'] - (C[k][0] - C[0][0]), C[min(len(C) - 1, k + 5)][0] - C[k][0]))
    if order:
        f = order[0]; ka = arr[f]
        m['t1'] = ka * dt
        m['after'] = pl['yac'] - (C[ka][0] - C[0][0])
        m['before'] = C[ka][0] - C[0][0]
        kp = max(0, ka - int(round(.3 / dt)))
        vx, vy = vel(D[f], kp, dt); cvx, cvy = vel(C, ka, dt)
        dx, dy = C[kp][0] - D[f][kp][0], C[kp][1] - D[f][kp][1]; L = math.hypot(dx, dy) or 1e-9
        m['close'] = (vx * dx + vy * dy) / L
        m['d0'] = dist(f, 0)
        cs = math.hypot(cvx, cvy)
        if cs > 1:
            ux, uy = (D[f][ka][0] - C[ka][0]), (D[f][ka][1] - C[ka][1]); Lu = math.hypot(ux, uy) or 1e-9
            m['lev'] = math.degrees(math.acos(max(-1, min(1, (ux * cvx + uy * cvy) / (Lu * cs)))))
        m['g2'] = (arr[order[1]] - ka) * dt if len(order) > 1 else None
        m['g3'] = (arr[order[2]] - ka) * dt if len(order) > 2 else None
    else:
        m['dmin'] = min(min(dist(i, k) for k in range(len(C))) for i in D)
    return m


def report(name, M):
    for fam in ('man', 'zone'):
        R = [m for m in M if m['fam'] == fam]
        if not R:
            continue
        A = [m for m in R if m['reached']]; N = [m for m in R if not m['reached']]
        lev = [m['lev'] for m in A if 'lev' in m]
        print(f"{name:4s} {fam:4s} n {len(R):5d} | YAC {mean([m['yac'] for m in R]):5.2f} p50 {q([m['yac'] for m in R]):4.1f} | "
              f"reached {len(A) / len(R):4.0%} t1 p25/50/75 {q([m['t1'] for m in A], .25):.1f}/{q([m['t1'] for m in A]):.1f}/{q([m['t1'] for m in A], .75):.1f} | "
              f"before {mean([m['before'] for m in A]):4.2f} after {mean([m['after'] for m in A]):4.2f} | never: {len(N) / len(R):4.1%} YAC {mean([m['yac'] for m in N]):5.1f} "
              f"(share of mean {sum(m['yac'] for m in N) / len(R):.2f})")
        print(f"          1st arriver: dist at catch p50 {q([m['d0'] for m in A]):.1f}, closing 0.3 s before {mean([m['close'] for m in A]):.2f}, arrives front {mean([x < 60 for x in lev]):.0%} side "
              f"{mean([60 <= x < 120 for x in lev]):.0%} behind {mean([x >= 120 for x in lev]):.0%} | 2nd present {mean([m['g2'] is not None for m in A]):.0%} gap p50 "
              f"{q([m['g2'] for m in A if m['g2'] is not None]):.2f} | 3rd {mean([m['g3'] is not None for m in A]):.0%} | within 3 yd at +1.0 s "
              f"{mean([m['near3_1s'] for m in R if m['near3_1s'] is not None]):.2f} | within 5 at catch {mean([m['near5_0'] for m in R]):.2f}")
        dn = [x for m in R for x in m['dn']]
        for lo, hi in ((2, 6), (6, 10), (10, 15)):
            g = [x for x in dn if lo <= x[0] < hi]
            c = [[x[1][j] for x in g if x[1][j] is not None] for j in range(3)]
            print(f"          downfield defenders {lo}-{hi} yd at the catch: {len(g) / len(R):.2f}/play, closing at 0/+0.3/+0.6 s {mean(c[0]):.2f}/{mean(c[1]):.2f}/{mean(c[2]):.2f}, "
                  f"retreating at 0 {mean([v < 0 for v in c[0]]):.0%}, ever within 1.5 yd {mean([x[2] <= 1.5 for x in g]):.0%}")
        ep = [e for m in R for e in m['ep']]
        for nm, f in (('all', lambda e: True), ('front<60', lambda e: e[2] < 60), ('side', lambda e: 60 <= e[2] < 120), ('behind', lambda e: e[2] >= 120), ('carrier>6yd/s', lambda e: e[3] > 6)):
            g = [e for e in ep if f(e)]
            print(f"          inside-2-yd approaches {nm:14s} {len(g) / len(R):.2f}/play: contact {mean([e[0] == 'contact' for e in g]):.0%} whiff {mean([e[0] == 'whiff' for e in g]):.0%}")
        wp = [m for m in R if any(e[0] == 'whiff' for e in m['ep'])]
        print(f"          plays with a whiff {len(wp) / len(R):.0%}, their YAC {mean([m['yac'] for m in wp]):.1f}; share of YAC >= 20: {mean([m['yac'] >= 20 for m in R]):.1%}")
        for nm, g in (('all', R), ('YAC>=20', [m for m in R if m['yac'] >= 20]), ('YAC 5-20', [m for m in R if 5 <= m['yac'] < 20])):
            cs = [[m['cs'][j] for m in g if m['cs'][j] is not None] for j in range(4)]
            d1 = [m['ds'][0] for m in g if m['ds'][0]]; d2 = [m['ds'][1] for m in g if m['ds'][1]]
            print(f"          {nm:8s} n {len(g):4d} carrier speed 0/0.5/1/2 s {'/'.join(f'{mean(c):.1f}' for c in cs)} peak {mean([m['cpk'] for m in g]):.1f} | "
                  f"nearest 3 at +1 s: speed {mean([x[0] for x in d1]):.1f} dist {mean([x[1] for x in d1]):.1f} within 5 {mean([x[2] for x in d1]):.1f}; +2 s speed {mean([x[0] for x in d2]):.1f} dist {mean([x[1] for x in d2]):.1f} within 5 {mean([x[2] for x in d2]):.1f}")
        L = [m for m in R if m['yac'] >= 20]
        print(f"          YAC>=20: contacts/play {mean([sum(e[0] == 'contact' for e in m['ep']) for m in L]):.2f} (none {mean([not any(e[0] == 'contact' for e in m['ep']) for m in L]):.0%}), "
              f"whiffs/play {mean([sum(e[0] == 'whiff' for e in m['ep']) for m in L]):.2f}, inside-2 approaches/play {mean([len(m['ep']) for m in L]):.2f}")
        cx = [x for m in R for x in m['cx']]
        print('          contacts by carrier speed: ' + ', '.join(f"{lo}-{hi} yd/s {len([x for x in cx if lo <= x[0] < hi]) / len(R):.2f}/play gains 5+ after {mean([x[1] >= 5 for x in cx if lo <= x[0] < hi]):.0%}, 2+ in next 0.5 s {mean([x[2] >= 2 for x in cx if lo <= x[0] < hi]):.0%}"
                                                      for lo, hi in ((0, 3), (3, 6), (6, 8), (8, 20))))
        bands = [(0, .3), (.3, .6), (.6, 1.0), (1.0, 2.0), (2.0, 99)]
        print('          YAC by first arrival: ' + ', '.join(
            f"{lo}-{hi if hi < 99 else ''} s {len([m for m in A if lo <= m['t1'] < hi]) / len(R):.0%} {mean([m['yac'] for m in A if lo <= m['t1'] < hi]):.1f}" for lo, hi in bands))


args = sys.argv[1:]
nf = args[args.index('--nfl') + 1] if '--nfl' in args else None
sp = args[args.index('--sim') + 1:] if '--sim' in args else []
if nf:
    report('NFL', [measure(p) for p in nfl(nf)])
if sp:
    report('sim', [measure(p) for p in sim(sp)])
