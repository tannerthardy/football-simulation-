"""First contact on a carrier at speed, by contact geometry, NFL vs sim (one positions operator; sim adds engine events).
usage: python3 -I contact-geom.py YA_PATH --nfl NFL.jsonl.gz --sim DIR
First contact = first frame (0.1 s grid) with a defender's centre within 1.0 yd of the carrier, carrier moving > 6 yd/s.
Geometry at that frame (the defender's motion over the 0.2 s before it): approach (from in front / side / behind, his
velocity against the carrier's), lateral offset of his centre from the carrier's path (centre < 0.35 yd, hip 0.35-0.7,
reach > 0.7), his speed minus the carrier's. Outcome: play over within 1.0 s; yards after this contact (5+)."""
import sys, json, math, glob, importlib.util
from collections import Counter, defaultdict
ya_path = sys.argv[1]; args = sys.argv[2:]; sys.argv = [sys.argv[0]]
spec = importlib.util.spec_from_file_location('ya', ya_path); ya = importlib.util.module_from_spec(spec); spec.loader.exec_module(ya)
mean = lambda v: sum(v) / len(v) if v else float('nan')
def sim_plays(d):
    for p in sorted(glob.glob(d + '/cover*.json')):
        for r in json.load(open(p)):
            s = r['dir']; tr = r['tr']
            C = [(f['c']['x'] * s, f['c']['y']) for f in tr]; D = {}; X = {}
            for f in tr:
                for x in f['d']:
                    D.setdefault(x['i'], []).append((x['x'] * s, x['y'])); X.setdefault(x['i'], []).append(x)
            dt = (tr[-1]['t'] - tr[0]['t']) / max(1, len(tr) - 1)
            yield dict(fam='man' if r['coverage'] == 'cover1' else 'zone', dt=dt, yac=r['yac'], C=C, D=D, X=X, T=[f['t'] for f in tr], ev=r['ev'])
def measure(pl):
    C, D, dt = pl['C'], pl['D'], pl['dt']
    for k in range(2, len(C)):
        hit = [i for i in D if D[i][k][0] is not None and math.hypot(D[i][k][0] - C[k][0], D[i][k][1] - C[k][1]) <= 1.0]
        if not hit: continue
        cvx, cvy = ya.vel(C, k, dt); cs = math.hypot(cvx, cvy)
        if cs <= 6: return None
        i = min(hit, key=lambda i: math.hypot(D[i][k][0] - C[k][0], D[i][k][1] - C[k][1]))
        kp = k - 2
        if D[i][kp][0] is None: return None
        vx, vy = (D[i][k][0] - D[i][kp][0]) / (2 * dt), (D[i][k][1] - D[i][kp][1]) / (2 * dt); ds = math.hypot(vx, vy)
        appr = math.degrees(math.acos(max(-1, min(1, (vx * cvx + vy * cvy) / (ds * cs))))) if ds > 0.5 else float('nan')
        ox, oy = D[i][k][0] - C[k][0], D[i][k][1] - C[k][1]
        lat = abs(ox * cvy - oy * cvx) / cs
        rest = len(C) - 1 - k
        after = pl['yac'] - (C[k][0] - C[0][0])
        k5 = min(len(C) - 2, k + int(round(.5 / dt)))
        dv = math.hypot(*ya.vel(C, k5, dt)) - cs if k5 > k else float('nan')
        m = dict(dv=dv, fam=pl['fam'], appr='front' if appr >= 120 else 'side' if appr >= 60 else 'behind' if appr == appr else '?', off='centre' if lat < 0.35 else 'hip' if lat < 0.7 else 'reach',
                 deficit=ds - cs, down1=rest * dt <= 1.0, after=after, g5=after >= 5, cs=cs)
        if 'X' in pl:
            t = pl['T'][k] - 0.05
            ev = [e['type'] for e in pl['ev'] if (e.get('a') == i or e.get('b') == i) and t <= e['t'] <= t + 1.0]
            x = pl['X'][i][kp]; rq = math.hypot(x['rvx'], x['rvy']); v = math.hypot(x['vx'], x['vy'])
            m['aligned'] = rq > 0.5 and v > 0.5 and (x['vx'] * x['rvx'] + x['vy'] * x['rvy']) / (rq * v) > math.cos(math.radians(15))
            seq = [pl['X'][i][j].get('tk', '-') for j in range(k, min(len(C), k + 11))]
            first_att = next((j for j, g in enumerate(seq) if g == 'attempt'), None)
            m['gates'] = seq[:first_att] if first_att is not None else seq
            m['attempted'] = first_att is not None
            m['prior'] = sorted({(e['type'], e.get('note') or '') for e in pl['ev'] if (e.get('a') == i or e.get('b') == i) and t - 1.0 <= e['t'] < t})
            m['outcome'] = 'broken' if 'broken_tackle' in ev else 'missed' if 'missed_tackle' in ev else 'wrap' if 'tackle_wrap' in ev else 'no attempt'
        return m
    return None
def table(name, M):
    for fam in ('zone', 'man'):
        R = [m for m in M if m and m['fam'] == fam]
        if not R: continue
        print(f"{name} {fam}: n {len(R)}; mix appr {dict(Counter(m['appr'] for m in R))} offset {dict(Counter(m['off'] for m in R))}; deficit {mean([m['deficit'] for m in R]):+.2f}; down<1s {mean([m['down1'] for m in R]):.0%} 5+ after {mean([m['g5'] for m in R]):.0%} yds after {mean([m['after'] for m in R]):.1f}")
    R = [m for m in M if m]
    cells = defaultdict(list)
    for m in R: cells[(m['appr'], m['off'])].append(m)
    print(f"  {name} by cell (zone+man): n / down<1s / 5+ after / yds after" + ('' if 'outcome' not in R[0] else ' / engine: broken, missed, no attempt / vel aligned with request'))
    for key in sorted(cells):
        g = cells[key]
        if len(g) < 8: continue
        extra = '' if 'outcome' not in g[0] else f" | {mean([m['outcome'] == 'broken' for m in g]):.0%} {mean([m['outcome'] == 'missed' for m in g]):.0%} {mean([m['outcome'] == 'no attempt' for m in g]):.0%} | {mean([m['aligned'] for m in g]):.0%}"
        print(f"    carrier speed change 0.5 s after: {mean([m['dv'] for m in g if m['dv'] == m['dv']]):+.2f} yd/s |", end='')
        print(f"    {key[0]:6s} {key[1]:6s} {len(g):4d} {mean([m['down1'] for m in g]):4.0%} {mean([m['g5'] for m in g]):4.0%} {mean([m['after'] for m in g]):5.1f}{extra}")
def gates(M):
    R = [m for m in M if m and 'gates' in m]
    if not R: return
    print(f"  sim gates on the first-contact tackler, contact to +1 s: attempted at all {mean([m['attempted'] for m in R]):.0%}; ticks before the attempt (or all if none) by gate: " +
          ', '.join(f"{k} {v / max(1, sum(len(m['gates']) for m in R)):.0%}" for k, v in Counter(g for m in R for g in m['gates']).most_common(8)))
    cd = [m for m in R if m['gates'] and m['gates'][0] == 'cooldown']
    print(f"    cooldown at contact n {len(cd)}: his events in the 1 s before: {Counter(x for m in cd for x in m['prior']).most_common(8)}; none {mean([not m['prior'] for m in cd]):.0%}")
    for key in ('centre', 'hip', 'reach'):
        g = [m for m in R if m['off'] == key]
        if g: print(f"    {key:6s} n {len(g)} attempted {mean([m['attempted'] for m in g]):.0%}; first gate {Counter(m['gates'][0] if m['gates'] else 'attempt' for m in g).most_common(4)}")
if '--nfl' in args: table('NFL', [measure(p) for p in ya.nfl(args[args.index('--nfl') + 1])])
if '--sim' in args:
    MM = [measure(p) for p in sim_plays(args[args.index('--sim') + 1])]
    table('sim', MM); gates(MM)
