"""Wide-open share of receiver-moments by depth band and by receiver rank (#1 / #2 / #3 / back / other), for one coverage family, NFL vs ours, same census operator.
  python3 -I scripts/diag/census/quarters_cells.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--fam Quarters] [--out report.md]

The operator is open_census_report.py's: moments = the release and the fixed times 1.5 / 2.0 / 2.5 / 3.0 s while the ball is held; receivers = route runners (not the QB); d1 = the distance to the nearest of the 11 defenders;
depth = the receiver's yards past the line at the moment; wide open = d1 over the NFL's p90 for (moment kind, depth band) (computed here on all NFL families together, as there).
Rank: by side of the center at the snap (the sign of y - center; a man within 0.5 yd of the center is on the strong side), route runners sorted by distance from the center, widest = #1, then #2, #3; a back who starts behind the line within 4 yd of the
center is 'back'; anyone else 'other' (a fourth receiver on a side)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--fam')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
FAM = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else 'Quarters'
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}; FIXED = (15, 20, 25, 30)
BANDS = [(-99, 0, 'behind LOS'), (0, 5, '0-5'), (5, 10, '5-10'), (10, 15, '10-15'), (15, 20, '15-20'), (20, 99, '20+')]
band = lambda d: next(l for a, b, l in BANDS if a <= d < b)
def pff_label(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'quarters': 'Quarters', 'cover6': 'Cover-6', 'two_man': '2-Man', '2man': '2-Man', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}
def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p.get('rel')
        fam = pff_label(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]; dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        rank = {}
        for sgn in (1, -1):
            side = [i for i in rec if (sgn * (Y[i, 0] - c) > 0.5 or (sgn == 1 and abs(Y[i, 0] - c) <= 0.5))]
            side = [i for i in side if not (pl[i]['pos'] in BACK and X[i, 0] < -1.0 and abs(Y[i, 0] - c) < 4.0)]
            for n, i in enumerate(sorted(side, key=lambda i: -abs(Y[i, 0] - c))): rank[i] = f'#{n + 1}' if n < 3 else 'other'
        for i in rec:
            if i not in rank: rank[i] = 'back'
        moms = []
        if rel is not None and rel < nf: moms.append(('rel', rel))
        for f in FIXED:
            if f < nf and (rel is None or f < rel): moms.append(('fix', f))
        for kind, f in moms:
            for i in rec:
                d1 = min(math.hypot(X[j, f] - X[i, f], Y[j, f] - Y[i, f]) for j in dfs)
                out.append(dict(fam=fam, kind=kind, band=band(float(X[i, f])), d1=d1, rank=rank[i], target=bool(pl[i].get('target'))))
    return out
nfl = rows_of(args[0], 'nfl')
thr = {(k, b): (np.percentile([r['d1'] for r in nfl if r['kind'] == k and r['band'] == b], 90) if sum(1 for r in nfl if r['kind'] == k and r['band'] == b) >= 50 else float('nan')) for k in ('rel', 'fix') for _, _, b in BANDS}
samples = [('NFL', nfl)] + [(a.split('/')[-1], rows_of(a, 'sim')) for a in args[1:]]
lines = []; P = lambda s='': lines.append(s)
P(f'## {FAM}: wide-open share of receiver-moments by depth band and receiver rank (NFL p90 threshold by moment kind and band)\n')
P('Thresholds (NFL p90 of d1, all families): ' + '; '.join(f'{k}: ' + ' '.join(f'{b} {thr[(k, b)]:.1f}' for _, _, b in BANDS) for k in ('rel', 'fix')) + '\n')
for kind, lab in (('fix', 'fixed times'), ('rel', 'at the release')):
    P(f'### {lab}: share wide open (n)\n'); P('| rank | band | ' + ' | '.join(n[:16] for n, _ in samples) + ' |'); P('|---|---|' + '---|' * len(samples))
    for rk in ('all', '#1', '#2', '#3', 'back', 'other'):
        for _, _, b in BANDS:
            cells = []
            for _, R in samples:
                S = [r for r in R if r['fam'] == FAM and r['kind'] == kind and r['band'] == b and (rk == 'all' or r['rank'] == rk)]
                cells.append(f'{sum(r["d1"] > thr[(kind, b)] for r in S) / len(S):.3f} ({len(S)})' if len(S) >= 15 else f'- ({len(S)})')
            if any(not c.startswith('-') for c in cells): P(f'| {rk} | {b} | ' + ' | '.join(cells) + ' |')
    P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
