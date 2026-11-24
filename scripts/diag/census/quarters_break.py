"""Quarters: the corner and the safety on top / level / trailing at #1's break and at #2's break, NFL vs ours, one operator (open-census play format).
  python3 -I scripts/diag/census/quarters_break.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--fam Quarters] [--out report.md]

Per play and side of the center: #1 = the widest route runner at least 7 yd from the center at the snap; #2 = the next widest route runner on that side, at least 3 yd from the center. His corner = the defender nearest #1 at the snap (identity);
the safety = the deepest safety (FS / SS / S) at the snap whose lateral position is on that side of the center (identity). Break = the frame k (1.0 s on; 0.4 s of track after it) of the largest turn between the heading over the last 0.4 s
and the next 0.4 s, at 35 degrees or more, both at 1.5 yd/s or more (corner_cushion.py's). At the break each defender is on top (more than 1 yd downfield of the receiver), level (within 1 yd) or trailing (more than 1 yd behind).
Ours is cut to the release as the NFL's track is. Coverage family: PFF label on NFL, the engine's mapped to it on ours."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--fam')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
FAM = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else 'Quarters'
OL = {'T', 'G', 'C', 'OT', 'OG'}; SAF = {'FS', 'SS', 'S'}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
def pff_label(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'cover6': 'Cover-6', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}
def brk(X, Y, i, nf):
    best, tb = 0.0, None
    for k in range(10, nf - 4):
        a = (X[i, k] - X[i, k - 4], Y[i, k] - Y[i, k - 4]); b = (X[i, k + 4] - X[i, k], Y[i, k + 4] - Y[i, k])
        if math.hypot(*a) < 0.6 or math.hypot(*b) < 0.6: continue
        t = abs(wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0])))
        if t > best: best, tb = t, k
    return tb if best >= math.radians(35) else None
def lev(dx): return 'on top' if dx > 1 else 'trailing' if dx < -1 else 'level'
def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        fam = pff_label(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        if fam != FAM: continue
        if src == 'sim' and p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        nf = X.shape[1]
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']; ol = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]
        dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        for sgn in (1, -1):
            side = sorted([i for i in rec if sgn * (Y[i, 0] - c) >= 3.0], key=lambda i: -sgn * (Y[i, 0] - c))
            if not side or sgn * (Y[side[0], 0] - c) < 7.0: continue
            n1 = side[0]; n2 = side[1] if len(side) > 1 else None
            cb = min(dfs, key=lambda j: math.hypot(X[j, 0] - X[n1, 0], Y[j, 0] - Y[n1, 0]))
            sf = [j for j in dfs if pl[j]['pos'] in SAF and sgn * (Y[j, 0] - c) > 0]
            sf = max(sf, key=lambda j: X[j, 0]) if sf else None
            for tag, n in (('#1', n1), ('#2', n2)):
                if n is None: continue
                tb = brk(X, Y, n, nf)
                if tb is None: continue
                r = dict(rcv=tag)
                for who, j in (('corner', cb), ('safety', sf)):
                    if j is None or j == n: continue
                    dx = X[j, tb] - X[n, tb]; r[who] = (lev(dx), math.hypot(dx, Y[j, tb] - Y[n, tb]))
                out.append(r)
    return out
lines = []; P = lambda s='': lines.append(s)
P(f'## {FAM}: corner and safety on top / level / trailing at #1\'s and #2\'s break\n')
P('| sample | receiver | breaks | corner on top / level / trailing | corner dist p50 | safety n | safety on top / level / trailing | safety dist p50 |'); P('|---|---|---|---|---|---|---|---|')
def trip(v): return ' / '.join(f'{sum(x[0] == k for x in v) / max(1, len(v)):.2f}' for k in ('on top', 'level', 'trailing'))
for name, path, src in [('NFL', args[0], 'nfl')] + [(a.split('/')[-1], a, 'sim') for a in args[1:]]:
    R = rows_of(path, src)
    for tag in ('#1', '#2'):
        S = [r for r in R if r['rcv'] == tag]; C = [r['corner'] for r in S if 'corner' in r]; F = [r['safety'] for r in S if 'safety' in r]
        P(f'| {name} | {tag} | {len(S)} | {trip(C)} (n {len(C)}) | {np.median([c[1] for c in C]) if C else float("nan"):.1f} | {len(F)} | {trip(F)} | {np.median([f[1] for f in F]) if F else float("nan"):.1f} |')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
