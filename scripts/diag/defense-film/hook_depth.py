"""Hook and curl-flat dropper depth late in the down (Coverage, 2026-11-24: the late open flats in the flat package had
hooks 9-15 yd deep while the back caught at the line near the sideline). Positions only, the same code on defense-film
rows (NFL nfl-stop-lane.py with PFF assignments; ours sim-stop-lane.mts with the installed roles). Dropbacks (no play
action), each moment only while the ball is not yet thrown. Seats: hook (NFL HCL / HCR / HOL; ours hook_* / hole* /
middle*), curl-flat (NFL CFL / CFR; ours curl_flat*). At 1.5 / 2.0 / 2.5 / 3.0 / 3.5 s: depth p25 / p50 / p75 (yd past
the line), width from the ball p50, and the depth of the deepest receiver within 6 yd of him laterally (p50); by coverage
family (Cover 2 / 3 / 4 / 6 / all zone).
usage: python3 -I scripts/diag/defense-film/hook_depth.py LABEL 'glob' [LABEL 'glob' ...]"""
import json, sys, glob
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}
TS = (1.5, 2.0, 2.5, 3.0, 3.5)


def seat(src, p):
    if src == 'nfl':
        a = p.get('assign') or ''
        return 'hook' if a in ('HCL', 'HCR', 'HOL') else 'curl-flat' if a in ('CFL', 'CFR') else None
    r = p.get('role') or ''
    return 'hook' if r.startswith(('hook', 'hole', 'middle')) else 'curl-flat' if r.startswith('curl_flat') else None


def rows(paths):
    out = []
    for f in paths:
        for l in open(f):
            r = json.loads(l)
            if r['kind'] != 'pass' or not r.get('dropback', True) or r.get('pa'): continue
            T = r['t']; k0 = min(range(len(T)), key=lambda k: abs(T[k]))
            if abs(T[k0]) > 0.06: continue
            src = r['src']; by = r['ballY']; P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1]); pl = r['players']; thr = r.get('throw')
            fam = r['cov']['fam']
            rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL]
            for i, p in enumerate(pl):
                if p['side'] != 'D': continue
                st = seat(src, p)
                if not st: continue
                for t in TS:
                    if thr is not None and t > thr: break
                    k = min(range(len(T)), key=lambda kk: abs(T[kk] - t))
                    if abs(T[k] - t) > 0.06: break
                    x, y = P(i, k)
                    near = [P(j, k)[0] for j in rec if abs(P(j, k)[1] - y) <= 6]
                    out.append(dict(t=t, seat=st, fam=fam, d=x, w=abs(y - by), rd=max(near) if near else None))
    return out


def q(v, f): return float(np.percentile(v, f * 100)) if len(v) else float('nan')


args = sys.argv[1:]
for lab, pat in zip(args[::2], args[1::2]):
    A = rows(sorted(glob.glob(pat)))
    print(f'\n## {lab}')
    print('| family | seat | ' + ' | '.join(f'{t} s depth p25/50/75 (n)' for t in TS) + ' | width p50 at 3.0 s | deepest receiver within 6 yd p50 at 3.0 s |')
    print('|---|---|' + '---|' * len(TS) + '---|---|')
    for fam in ('cover2', 'cover3', 'cover4', 'cover6', 'all zone'):
        for st in ('hook', 'curl-flat'):
            S = [r for r in A if r['seat'] == st and (r['fam'] == fam or (fam == 'all zone' and r['fam'] in ('cover2', 'cover3', 'cover4', 'cover6', 'tampa2')))]
            if len(S) < 20: continue
            cells = []
            for t in TS:
                v = [r['d'] for r in S if r['t'] == t]
                cells.append(f'{q(v, .25):.1f} / {q(v, .5):.1f} / {q(v, .75):.1f} ({len(v)})' if len(v) >= 5 else '-')
            s3 = [r for r in S if r['t'] == 3.0]
            print(f"| {fam} | {st} | " + ' | '.join(cells) + f" | {q([r['w'] for r in s3], .5):.1f} | {q([r['rd'] for r in s3 if r['rd'] is not None], .5):.1f} |")
