"""Fixed-time wide-open share for one coverage family and depth band, split by how far the moment is from the release (the census operator's own moments, quarters_cells.py's thresholds).
  python3 -I scripts/diag/census/fixed_split.py NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--fam Cover-6] [--band 10-15]
Fixed moments are 1.5 / 2.0 / 2.5 / 3.0 s after the snap WHILE THE BALL IS STILL HELD (frame < release), so every one is before the release by construction; the split is by the gap to the release
(release minus the moment: up to 0.5 s, 0.6-1.0 s, over 1.0 s) and by plays with no release in the sampled window (no throw, sack, scramble)."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--fam', '--band')]
FAM = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else 'Cover-6'
LO, HI = [float(x) for x in (sys.argv[sys.argv.index('--band') + 1] if '--band' in sys.argv else '10-15').split('-')]
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}; FIXED = (15, 20, 25, 30)
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
        fam = pff(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        if fam != FAM: continue
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]; dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        for f in FIXED:
            if f >= nf or (rel is not None and f >= rel): continue
            for i in rec:
                x = float(X[i, f])
                if not (LO <= x < HI): continue
                d1 = min(math.hypot(X[j, f] - X[i, f], Y[j, f] - Y[i, f]) for j in dfs)
                out.append((d1, None if rel is None else (rel - f) / 10.0))
    return out
nfl_thr = None
# thresholds: NFL p90 of d1 over ALL NFL families for fixed moments in the band (quarters_cells.py's operator)
def thr(path):
    v = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p.get('rel')
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]; dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        for f in FIXED:
            if f >= nf or (rel is not None and f >= rel): continue
            for i in rec:
                if LO <= X[i, f] < HI: v.append(min(math.hypot(X[j, f] - X[i, f], Y[j, f] - Y[i, f]) for j in dfs))
    return float(np.percentile(v, 90))
T = thr(args[0])
print(f'## {FAM}, {LO:g}-{HI:g} yd, fixed-time wide-open share by the gap to the release (NFL p90 threshold {T:.2f} yd)\n')
print('| sample | all | release - moment <= 0.5 s | 0.6-1.0 s | over 1.0 s | no release in the window |'); print('|---|---|---|---|---|---|')
for a in args:
    R = rows(a, 'nfl' if a == args[0] else 'sim')
    cells = []
    for lab, sel in (('all', lambda g: True), ('a', lambda g: g is not None and g <= 0.5), ('b', lambda g: g is not None and 0.5 < g <= 1.0), ('c', lambda g: g is not None and g > 1.0), ('d', lambda g: g is None)):
        S = [r for r in R if sel(r[1])]; cells.append(f'{sum(r[0] > T for r in S) / len(S):.3f} ({len(S)})' if len(S) >= 8 else f'- ({len(S)})')
    print(f'| {a.split("/")[-1]} | ' + ' | '.join(cells) + ' |')
