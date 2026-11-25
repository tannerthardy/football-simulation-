"""Completions over the corner: completions to #1 (widest route runner at the snap, at least 7 yd from the center) caught at least 10 yd past the line with his corner (the cornerback / DB / nickel nearest him at the snap) at least 1 yd shallower than the catcher at the catch frame.
  python3 -I scripts/diag/census/corner_over.py NFL_CATCHES.jsonl.gz GAMES_NFL SIM.jsonl.gz GAMES_SIM [SIM2 GAMES ...] [--out report.md]
Open-census play format (nfl_catches.py / sim_plays.mts --full). Reported per coverage family: completions to #1 per game, deep (10+ yd) ones per game, and over-the-corner ones per game and as a share of #1 completions; and the corner's distance from the catcher at the catch for the over-the-corner ones (p50)."""
import gzip, json, sys, math
import numpy as np
a = [x for i, x in enumerate(sys.argv) if i > 0 and not x.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'tampa2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'cover6': 'Cover-6', 'cover2man': '2-Man'}
def pff(cov):
    c = (cov if isinstance(cov, str) else (cov or {}).get('id', '')).lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
def rows(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); k = p.get('catch'); r = p.get('recv')
        if k is None or r is None or r < 0 or p.get('screen'): continue
        X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        fam = pff(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        ols = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
        rec = [i for i, q in enumerate(pl) if q['side'] == 'O' and i != qb and q['route']]
        dfs = [i for i, q in enumerate(pl) if q['side'] == 'D' and q['pos'] in ('CB', 'DB', 'NB')]
        if r not in rec or not dfs: continue
        sg = 1 if Y[r, 0] >= c else -1
        side = [i for i in rec if sg * (Y[i, 0] - c) >= 7]
        if not side or max(side, key=lambda i: abs(Y[i, 0] - c)) != r: continue
        cb = min(dfs, key=lambda j: math.hypot(X[j, 0] - X[r, 0], Y[j, 0] - Y[r, 0]))
        deep = X[r, k] >= 10; over = deep and X[r, k] - X[cb, k] >= 1.0
        out.append((fam, deep, over, math.hypot(X[cb, k] - X[r, k], Y[cb, k] - Y[r, k])))
    return out
L = []; P = L.append
P('| sample | family | #1 completions per game | deep (10+) per game | over the corner per game | over / #1 completions | corner distance at the catch p50 (over ones) |'); P('|---|---|---|---|---|---|---|')
for i in range(0, len(a), 2):
    path, games = a[i], float(a[i + 1]); R = rows(path, 'nfl' if i == 0 else 'sim'); nm = 'NFL' if i == 0 else path.split('/')[-1]
    for fam in ('all', 'Cover-2', 'Cover-3', 'Quarters', 'Cover-6', 'Cover-1'):
        S = [r for r in R if fam == 'all' or r[0] == fam]
        if not S: continue
        ov = [r for r in S if r[2]]
        P(f'| {nm} | {fam} | {len(S) / games:.2f} | {sum(1 for r in S if r[1]) / games:.2f} | {len(ov) / games:.2f} (n {len(ov)}) | {len(ov) / len(S):.3f} | {(np.percentile([r[3] for r in ov], 50) if len(ov) >= 5 else float("nan")):.1f} |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
