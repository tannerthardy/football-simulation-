"""Cushion on #1 at the snap and at #1's break, NFL vs ours, one operator (open-census play format).
  python3 -I scripts/diag/census/corner_cushion.py NFL.jsonl.gz SIM.jsonl.gz [--out report.md]

#1 = on each side of the center the route runner split widest from him at the snap (at least 7 yd). His corner = the defender nearest to him at the snap, followed by identity.
Break = the frame k (1.0 s to the end of the sampled track, a break needs 0.4 s of track after it) with the largest turn between the heading over the last 0.4 s and over the next 0.4 s, at 35 degrees or more, both at 1.5 yd/s or more.
Cushion = the corner's depth past #1 (+ when he is downfield of him: on top; he is the corner's goal-line side), distance = Euclid; level = within 1 yd of #1 downfield, trailing = more than 1 yd behind him.
Coverage family: PFF label on NFL; our family mapped to the PFF label on ours."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}
def pff_label(cov):
    c = (cov or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'cover6': 'Cover-6', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi

def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        if src == 'sim' and p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]  # full-play records: the same window as the NFL's, snap to release
        nf = X.shape[1]
        fam = pff_label(p['cov']) if src == 'nfl' else OURS.get(p.get('fam'), 'other')
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']; ol = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]
        dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        for sgn in (1, -1):
            cand = [i for i in rec if sgn * (Y[i, 0] - c) >= 7.0]
            if not cand: continue
            n1 = max(cand, key=lambda i: sgn * (Y[i, 0] - c))
            dd = [math.hypot(X[j, 0] - X[n1, 0], Y[j, 0] - Y[n1, 0]) for j in dfs]; cb = dfs[int(np.argmin(dd))]
            def rel(f, j=None):
                j = cb if j is None else j
                dx = X[j, f] - X[n1, f]; d = math.hypot(dx, Y[j, f] - Y[n1, f])
                return dx, d, 'on top' if dx > 1 else 'trailing' if dx < -1 else 'level'
            dx0, d0, l0 = rel(0)
            tb = None; best = 0.0
            for k in range(10, nf - 4):
                a = (X[n1, k] - X[n1, k - 4], Y[n1, k] - Y[n1, k - 4]); b = (X[n1, k + 4] - X[n1, k], Y[n1, k + 4] - Y[n1, k])
                if math.hypot(*a) < 0.6 or math.hypot(*b) < 0.6: continue
                t = abs(wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0])))
                if t > best: best, tb = t, k
            r = dict(fam=fam, man=('Man' if p.get('manzone') == 'Man' or p.get('man') is True else 'Zone'), snap_dx=dx0, snap_d=d0, snap_lev=l0, broke=best >= math.radians(35))
            if r['broke']:
                dxb, db, lb = rel(tb); nd = min(math.hypot(X[j, tb] - X[n1, tb], Y[j, tb] - Y[n1, tb]) for j in dfs)
                r.update(brk_dx=dxb, brk_d=db, brk_lev=lb, brk_near=nd, tb=tb / 10)
            out.append(r)
    return out

def q(v, p): return float(np.percentile(v, p)) if len(v) else float('nan')
def table(rows, title, lines):
    lines.append(f'### {title}\n')
    lines.append('| group | #1 sides | snap cushion (depth past #1) p25 / 50 / 75 | snap dist p50 | snap on top / level / trailing | with a break | break dist p25 / 50 / 75 | break nearest defender p50 | break on top / level / trailing | break time p50 |'); lines.append('|---|---|---|---|---|---|---|---|---|---|')
    groups = [('all', lambda r: True), ('man', lambda r: r['man'] == 'Man'), ('zone', lambda r: r['man'] == 'Zone')] + [(f, (lambda f: lambda r: r['fam'] == f)(f)) for f in ('Cover-3', 'Cover-1', 'Cover-2', 'Quarters', 'Cover-6', 'Cover-0', '2-Man')]
    for lab, sel in groups:
        a = [r for r in rows if sel(r)]
        if len(a) < 30: continue
        b = [r for r in a if r['broke']]; sh = lambda v, k: sum(r[k] == v for r in v_) / max(len(v_), 1)
        v_ = a; s3 = ' / '.join(f'{sum(r["snap_lev"] == x for r in a) / len(a):.2f}' for x in ('on top', 'level', 'trailing'))
        v_ = b; b3 = ' / '.join(f'{sum(r["brk_lev"] == x for r in b) / max(len(b), 1):.2f}' for x in ('on top', 'level', 'trailing'))
        lines.append(f'| {lab} | {len(a)} | {q([r["snap_dx"] for r in a], 25):.1f} / {q([r["snap_dx"] for r in a], 50):.1f} / {q([r["snap_dx"] for r in a], 75):.1f} | {q([r["snap_d"] for r in a], 50):.1f} | {s3} | {len(b)} | {q([r["brk_d"] for r in b], 25):.1f} / {q([r["brk_d"] for r in b], 50):.1f} / {q([r["brk_d"] for r in b], 75):.1f} | {q([r["brk_near"] for r in b], 50):.1f} | {b3} | {q([r["tb"] for r in b], 50):.2f} |')
    lines.append('')

lines = ['## Corner cushion on #1, at the snap and at #1\'s break\n']
table(rows_of(args[0], 'nfl'), 'NFL (BDB 2025)', lines)
for sp in args[1:]: table(rows_of(sp, 'sim'), 'Ours: ' + sp.split('/')[-1], lines)
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
