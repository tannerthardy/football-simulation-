"""Cover 2 / Cover 6 half side, #1 vertical: the corner's and the half safety's depth and width, NFL vs ours, one operator (open-census play format).
  python3 -I scripts/diag/census/half_window.py NFL.jsonl.gz SIM.jsonl.gz [--out report.md]

Per play and side: #1 = the widest route runner at least 7 yd from the center at the snap; #2 = the next widest route runner on that side. #1 releases vertical when at 2.5 s his depth is 8-18 yd and he has moved
laterally by no more than half of that depth. His corner = the defender nearest him at the snap (followed by identity); the half safety = the deepest safety (FS / SS / S) on that side of the center at the snap (identity).
A #2 threatens the flat when at 2.0 s he is within 6 yd of the line and has moved at least 3 yd toward the sideline from his snap spot.
Moments 1.5 / 2.0 / 2.5 / 3.0 s, only while the ball is still held. Per moment: corner depth (yd past the line), corner width from the sideline, corner over (+) or under (-) #1 in depth, corner inside (+) or outside (-) #1 laterally (toward the middle),
safety depth, safety width from the sideline, safety over (+) / under (-) #1 in depth. Cover 2 = PFF Cover-2 / our cover2 and tampa2; Cover 6 = PFF Cover 6-Left / Cover-6 Right / our cover6. Cover 6 uses the side on which the corner is shallower at 2.0 s (the half side).
Medians with quartiles."""
import gzip, json, sys, math
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] != '--out']
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}; SAF = {'FS', 'SS', 'S'}
def fam_of(p, src):
    if src == 'nfl':
        c = (p['cov'] or '').lower()
        return 'Cover-2' if c == 'cover-2' else 'Cover-6' if 'cover 6' in c or 'cover-6' in c else None
    f = p.get('fam'); return 'Cover-2' if f in ('cover2', 'tampa2') else 'Cover-6' if f == 'cover6' else None
TIMES = (15, 20, 25, 30)

def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); fam = fam_of(p, src)
        if not fam: continue
        X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']; nf = X.shape[1]; rel = p['rel']
        last = (rel if rel is not None else nf) - 1
        if last < 30: continue
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']; ol = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route']]
        dfs = [i for i, r in enumerate(pl) if r['side'] == 'D']
        sides = []
        for sgn in (1, -1):
            cand = sorted([i for i in rec if sgn * (Y[i, 0] - c) >= 4.0], key=lambda i: -sgn * (Y[i, 0] - c))
            if not cand or sgn * (Y[cand[0], 0] - c) < 7.0: continue
            n1 = cand[0]; n2 = cand[1] if len(cand) > 1 else None
            if not (8 <= X[n1, 25] <= 18 and abs(Y[n1, 25] - Y[n1, 0]) <= 0.5 * X[n1, 25]): continue
            dd = [math.hypot(X[j, 0] - X[n1, 0], Y[j, 0] - Y[n1, 0]) for j in dfs]; cb = dfs[int(np.argmin(dd))]
            sf = [j for j in dfs if (pl[j]['pos'] in SAF or pl[j].get('slot') in ('FS', 'SS')) and sgn * (Y[j, 0] - c) > 0]
            if not sf: continue
            hs = max(sf, key=lambda j: X[j, 0])
            flat = bool(n2 is not None and X[n2, 20] <= 6.0 and sgn * (Y[n2, 20] - Y[n2, 0]) >= 3.0)
            sides.append((sgn, n1, cb, hs, flat))
        if fam == 'Cover-6' and len(sides) == 2:
            sides = [min(sides, key=lambda s: X[s[2], 20])]
        for sgn, n1, cb, hs, flat in sides:
            r = dict(fam=fam, flat=flat, t={})
            for f in TIMES:
                if f > last: continue
                sw = lambda j: float(min(Y[j, f], 53.33 - Y[j, f]))
                r['t'][f] = dict(cd=float(X[cb, f]), cw=sw(cb), co=float(X[cb, f] - X[n1, f]), ci=float(sgn * (Y[n1, f] - Y[cb, f])), sd=float(X[hs, f]), sw=sw(hs), so=float(X[hs, f] - X[n1, f]), n1d=float(X[n1, f]), n1w=sw(n1))
            out.append(r)
    return out

def mq(v): return f'{np.median(v):.1f} ({np.percentile(v, 25):.1f}-{np.percentile(v, 75):.1f})' if len(v) else '-'
def table(rows, title, lines):
    lines.append(f'### {title}\n')
    lines.append('| coverage | #2 in the flat | moment | n | corner depth | corner width | corner over #1 | corner inside #1 | safety depth | safety width | safety over #1 | #1 depth | #1 width |'); lines.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for fam in ('Cover-2', 'Cover-6'):
        for flat, fl in ((True, 'yes'), (False, 'no')):
            a = [r for r in rows if r['fam'] == fam and r['flat'] == flat]
            for f in TIMES:
                v = [r['t'][f] for r in a if f in r['t']]
                if len(v) < 8: continue
                g = lambda k: mq([x[k] for x in v])
                lines.append(f'| {fam} | {fl} | {f / 10:.1f} s | {len(v)} | {g("cd")} | {g("cw")} | {g("co")} | {g("ci")} | {g("sd")} | {g("sw")} | {g("so")} | {g("n1d")} | {g("n1w")} |')
    lines.append('')

lines = ['## Cover 2 and Cover 6 half side: corner and half safety while #1 releases vertical (median, quartiles; yards)\n']
table(rows_of(args[0], 'nfl'), 'NFL (BDB 2025)', lines)
for sp in args[1:]: table(rows_of(sp, 'sim'), 'Ours: ' + sp.split('/')[-1], lines)
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
