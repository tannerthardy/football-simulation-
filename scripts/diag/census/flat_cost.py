"""What a flat completion costs: time from the catch to the first defender contact, and YAC, NFL vs ours, one operator (open-census play format through the end of the play: nfl_catches.py, sim_plays.mts --full).
  python3 -I scripts/diag/census/flat_cost.py NFL_CATCHES.jsonl.gz SIM.jsonl.gz [SIM2 ...] [--out report.md]
Flat catch = flat_yac_report.py's: caught within 4 yd of the line and 8+ yd laterally from the ball's snap position, screens apart (behind the line with two or more linemen 2 yd downfield). First defender contact = the first frame (0.1 s grid)
from the catch at which any of the 11 defenders is within 1.0 yd of the catcher (the sum of two body radii and a hand); a catch with no such frame before the end of the play is censored (reported as never). YAC = the catcher's downfield yards from the catch to the end of the play.
Printed: n, time to contact p25 / p50 / p75 (s, of the catches that were contacted), the share contacted within 0.5 / 1.0 s, never contacted, YAC mean / p50 / p90, YAC by whether contact came within 1.0 s."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}
def rows(path):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); k = p.get('catch'); r = p.get('recv')
        if k is None or r is None or r < 0 or p.get('screen'): continue
        X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; nf = X.shape[1]
        ols = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]; cs = [i for i in ols if pl[i]['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0])) if ols else 26.67
        if not (X[r, k] < 4 and abs(Y[r, k] - c) >= 8): continue
        if X[r, k] < 1 and sum(1 for o in ols if X[o, k] >= 2) >= 2: continue
        dfs = [i for i, q in enumerate(pl) if q['side'] == 'D']
        tc = None
        for f in range(k, nf):
            if min(math.hypot(X[j, f] - X[r, f], Y[j, f] - Y[r, f]) for j in dfs) <= 1.0: tc = (f - k) / 10.0; break
        out.append(dict(tc=tc, yac=float(X[r, -1] - X[r, k]), typ=pl[r]['pos']))
    return out
q = lambda v, p: float(np.percentile(v, p)) if len(v) else float('nan')
L = []; P = L.append
P('| sample | flat catches | contact time p25 / p50 / p75 (s) | contacted within 0.5 s | within 1.0 s | never contacted | YAC mean / p50 / p90 | YAC mean when contact came within 1.0 s | YAC mean when later or never |'); P('|---|---|---|---|---|---|---|---|---|')
for a in args:
    R = rows(a); n = len(R)
    if not n: P(f'| {a.split("/")[-1]} | 0 | | | | | | | |'); continue
    tc = [r['tc'] for r in R if r['tc'] is not None]; y = [r['yac'] for r in R]
    soon = [r for r in R if r['tc'] is not None and r['tc'] <= 1.0]; late = [r for r in R if not (r['tc'] is not None and r['tc'] <= 1.0)]
    P(f'| {a.split("/")[-1]} | {n} | {q(tc, 25):.1f} / {q(tc, 50):.1f} / {q(tc, 75):.1f} | {sum(1 for r in R if r["tc"] is not None and r["tc"] <= 0.5) / n:.2f} | {len(soon) / n:.2f} | {sum(1 for r in R if r["tc"] is None) / n:.2f} | {np.mean(y):.1f} / {q(y, 50):.1f} / {q(y, 90):.1f} | {np.mean([r["yac"] for r in soon]) if soon else float("nan"):.1f} | {np.mean([r["yac"] for r in late]) if late else float("nan"):.1f} |')
txt = '\n'.join(L)
if OUT: open(OUT, 'w').write(txt)
print(txt)
