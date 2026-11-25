"""The corner's depth at 3.0 s against a vertical #1, NFL vs ours, one operator (open-census play format; tracks to the release, so a play counts if the ball is still held at 3.0 s).
  python3 -I scripts/diag/census/corner_depth.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--fam all|Cover-2|...] [--out report.md]
#1 = on each side of the center the route runner split widest from him at the snap (at least 7 yd); his corner = the cornerback (CB / DB / nickel) nearest to him at the snap (identity). Vertical = #1 is at least 14 yd past the line at 3.0 s and has gone downfield without
turning back (his depth at 3.0 s is at least 3 yd more than at 2.0 s). Reported: the corner's depth past the line at 3.0 s (yd) p10 / 25 / 50 / 75 / 90, and how far under #1 he is (#1's depth minus his), and his distance from #1. Family by the PFF label (NFL) or the engine's mapped one (ours)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--fam')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
FAMS = sys.argv[sys.argv.index('--fam') + 1].split(',') if '--fam' in sys.argv else ['all', 'Cover-2', 'Cover-3', 'Quarters', 'Cover-6', 'Cover-1']
OL = {'T', 'G', 'C', 'OT', 'OG'}
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'quarters': 'Quarters', 'cover6': 'Cover-6', 'two_man': '2-Man', '2man': '2-Man', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}
def pff(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
def rows(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p.get('rel')
        if nf <= 30 or (rel is not None and rel <= 30): continue
        fam = pff(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]; dfs = [i for i, r in enumerate(pl) if r['side'] == 'D' and r['pos'] in ('CB', 'DB', 'NB')]
        if not dfs: continue
        for sgn in (1, -1):
            side = [i for i in rec if sgn * (Y[i, 0] - c) >= 7]
            if not side: continue
            r1 = max(side, key=lambda i: abs(Y[i, 0] - c))
            if X[r1, 30] < 14 or X[r1, 30] - X[r1, 20] < 3: continue
            cb = min(dfs, key=lambda j: math.hypot(X[j, 0] - X[r1, 0], Y[j, 0] - Y[r1, 0]))
            out.append((fam, float(X[cb, 30]), float(X[r1, 30] - X[cb, 30]), float(math.hypot(X[cb, 30] - X[r1, 30], Y[cb, 30] - Y[r1, 30]))))
    return out
q = lambda v, p: float(np.percentile(v, p))
L = []; P = L.append
samples = [('NFL', rows(args[0], 'nfl'))] + [(a.split('/')[-1], rows(a, 'sim')) for a in args[1:]]
P('## The corner against a vertical #1 at 3.0 s (depth past the line; under #1 = #1\'s depth minus his)\n'); P('| family | sample | n | corner depth p10 / 25 / 50 / 75 / 90 | under #1 p10 / 25 / 50 / 75 / 90 | distance from #1 p50 |'); P('|---|---|---|---|---|---|')
for fam in FAMS:
    for nm, R in samples:
        S = [r for r in R if fam == 'all' or r[0] == fam]
        if len(S) < 10: P(f'| {fam} | {nm} | {len(S)} | | | |'); continue
        d = [r[1] for r in S]; u = [r[2] for r in S]; ds = [r[3] for r in S]
        P(f'| {fam} | {nm} | {len(S)} | ' + ' / '.join(f'{q(d, x):.1f}' for x in (10, 25, 50, 75, 90)) + ' | ' + ' / '.join(f'{q(u, x):.1f}' for x in (10, 25, 50, 75, 90)) + f' | {q(ds, 50):.1f} |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
