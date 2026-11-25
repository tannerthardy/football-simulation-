"""Defenders' closing on the catcher from the catch, NFL vs ours, one operator on positions (open-census play format through the end of the play; completions).
  python3 -I scripts/diag/pursuit/catch_closing.py NFLCATCH.jsonl.gz [LABEL=SIM1.jsonl.gz,SIM2... ...] [--out report.md] [--tsv rows.tsv]
Plays: completions (catch = the frame the ball is caught, recv = the catcher), with 2.5 s of track after the catch. Defenders: side D, within 10 yd of the catcher at the catch frame. "Not engaged" cannot
be judged from the tracking, so every defender in range is taken (blocked ones included). Per defender: separation band at the catch (0-2 / 2-4 / 4-7 / 7-10 yd); closing speed c = v . unit(catcher - defender)
at frame f, v = the 0.2 s centred displacement of the defender (positions at 10 Hz; not the provider's s and dir), the catcher's position at f; start = the first frame from the catch with c >= 1.5 yd/s
(0 if he is already closing at the catch; never = none within 2.0 s); c at the catch and at +0.5 s. Role group: position (CB / S / LB = ILB, MLB, OLB, LB / DL = DE, DT, NT, EDGE) and the play's man / zone label (NFL: PFF
manZone; sim: the call's man flag). Catch to first contact = the first frame from the catch with any defender within 1 yd of the catcher (centres); YAC = the catcher's x at the last frame minus at the catch (yd past
the line in the offense's direction)."""
import gzip, json, sys, math, collections
import numpy as np
argv = sys.argv[1:]
def opt(n):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
OUT = opt('--out'); TSV = opt('--tsv')
nfl = [a for a in argv if '=' not in a][0]
sims = {a.split('=', 1)[0]: a.split('=', 1)[1].split(',') for a in argv if '=' in a}
GROUP = {'CB': 'CB', 'S': 'S', 'SS': 'S', 'FS': 'S', 'DB': 'CB', 'LB': 'LB', 'ILB': 'LB', 'MLB': 'LB', 'OLB': 'LB', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL', 'DL': 'DL'}
BANDS = [(0, 2, '0-2'), (2, 4, '2-4'), (4, 7, '4-7'), (7, 10, '7-10')]
BLK = {'T', 'G', 'C', 'OT', 'OG', 'TE', 'RB', 'FB', 'HB'}
def rows_of(path, src):
    rows = []; plays = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); c, r = p.get('catch'), p.get('recv')
        if c is None or r is None or r < 0: continue
        X = np.array(p['x']); Y = np.array(p['y']); nf = X.shape[1]
        if c + 25 >= nf or c < 2: continue
        man = (p.get('manzone') == 'Man') if src == 'NFL' else bool(p.get('man'))
        D = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
        # first contact: any defender within 1 yd of the catcher
        fc = None
        for f in range(c, nf):
            if any(math.hypot(X[i, f] - X[r, f], Y[i, f] - Y[r, f]) <= 1.0 for i in D): fc = f; break
        plays.append(dict(fc=(fc - c) / 10.0 if fc is not None else None, yac=float(X[r, nf - 1] - X[r, c]), man=man))
        for i in D:
            d0 = math.hypot(X[i, c] - X[r, c], Y[i, c] - Y[r, c])
            if d0 >= 10: continue
            def closing(f):
                a, b = max(0, f - 1), min(nf - 1, f + 1)
                vx, vy = (X[i, b] - X[i, a]) / ((b - a) / 10.0), (Y[i, b] - Y[i, a]) / ((b - a) / 10.0)
                dx, dy = X[r, f] - X[i, f], Y[r, f] - Y[i, f]; n = math.hypot(dx, dy) or 1e-9
                return (vx * dx + vy * dy) / n
            cs = [closing(f) for f in range(c, c + 21)]
            st = next((k / 10.0 for k, v in enumerate(cs) if v >= 1.5), None)
            # engaged at the catch, inferred from positions (the same rule both sides): an offensive player who did not run a route (OL, TE, a back or a receiver blocking; not the catcher, not the QB) within 1.5 yd of him (centres) on at least 4 of the 5 frames c-3 .. c+1
            blk = [j for j, o in enumerate(p['players']) if o['side'] == 'O' and j != r and o['pos'] != 'QB' and not o.get('route')]
            inf = any(sum(1 for f in range(c - 3, c + 2) if math.hypot(X[i, f] - X[j, f], Y[i, f] - Y[j, f]) <= 1.5) >= 4 for j in blk)
            tru = bool(p['eng'][i][c]) if p.get('eng') else None
            rows.append(dict(src=src, id=p.get('id'), pos=p['players'][i]['pos'], inf=inf, tru=tru, grp=GROUP.get(p['players'][i]['pos'], '?'), man=man, d0=d0, band=next(n for lo, hi, n in BANDS if lo <= d0 < hi),
                             c0=cs[0], c5=cs[5], start=st))
    return rows, plays
data = {'NFL': rows_of(nfl, 'NFL')}
for lab, ps in sims.items():
    rs, pl = [], []
    for pth in ps:
        a, b = rows_of(pth, lab); rs += a; pl += b
    data[lab] = (rs, pl)
q = lambda v, k: float(np.percentile(v, k)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P('## Defenders closing on the catcher from the catch (completions; every defender within 10 yd at the catch, blocked or not; closing from positions)\n')
P('Plays: ' + '; '.join(f'{k} {len(v[1])}' for k, v in data.items()) + ' (completions with 2.5 s of track after the catch); defenders within 10 yd: ' + '; '.join(f'{k} {len(v[0])}' for k, v in data.items()) + '.\n')
def table(title, sel):
    P(f'### {title}\n'); P('| sample | group | band (yd) | n | start p25 / p50 / p75 (s) | never started in 2 s | already closing at the catch (1.5 yd/s or more) | of those not yet closing: n, start p25 / p50 / p75 (s), never started | closing at the catch p50 (yd/s) | closing at +0.5 s p50 (yd/s) |'); P('|---|---|---|---|---|---|---|---|---|---|')
    for lab, (R, _) in data.items():
        for g, gf in sel:
            for lo, hi, bn in BANDS + [(0, 10, 'all')]:
                S = [r for r in R if gf(r) and lo <= r['d0'] < hi]
                if len(S) < 15: continue
                st = [r['start'] for r in S if r['start'] is not None]
                NC = [r for r in S if r['c0'] < 1.5]; stn = [r['start'] for r in NC if r['start'] is not None]
                cond = f'{len(NC)}, {q(stn, 25):.1f} / {q(stn, 50):.1f} / {q(stn, 75):.1f}, {1 - len(stn) / len(NC):.2f}' if len(NC) >= 10 else f'{len(NC)}'
                P(f'| {lab} | {g} | {bn} | {len(S)} | {q(st, 25):.1f} / {q(st, 50):.1f} / {q(st, 75):.1f} | {1 - len(st) / len(S):.2f} | {1 - len(NC) / len(S):.2f} | {cond} | {q([r["c0"] for r in S], 50):.1f} | {q([r["c5"] for r in S], 50):.1f} |')
    P('')
table('All defenders in range', [('all', lambda r: True)])
table('By position group', [(g, (lambda g: lambda r: r['grp'] == g)(g)) for g in ('CB', 'S', 'LB', 'DL')])
table('By the play\'s man / zone label', [('man', lambda r: r['man']), ('zone', lambda r: not r['man'])])
P('### Engaged and not engaged at the catch (engaged = a non-route offensive player (not the catcher or the QB) within 1.5 yd on at least 4 of the 5 frames c-3 .. c+1: inferred from positions, the same rule both sides; "engine" = the sim\'s own `engagement` at the catch frame)\n')
P('| sample | rule | band (yd) | engaged n | engaged closing at the catch p50 | engaged at +0.5 s p50 | not engaged n | not engaged closing at the catch p50 | not engaged at +0.5 s p50 |'); P('|---|---|---|---|---|---|---|---|---|')
for lab, (R, _) in data.items():
    for rule, key in (('inferred', 'inf'), ('engine', 'tru')):
        if rule == 'engine' and lab == 'NFL': continue
        for lo, hi, bn in BANDS + [(0, 10, 'all')]:
            S = [r for r in R if lo <= r['d0'] < hi and r[key] is not None]
            E, N = [r for r in S if r[key]], [r for r in S if not r[key]]
            if len(S) < 15: continue
            f = lambda L, k: f'{q([r[k] for r in L], 50):.1f}' if len(L) >= 8 else '-'
            P(f'| {lab} | {rule} | {bn} | {len(E)} | {f(E, "c0")} | {f(E, "c5")} | {len(N)} | {f(N, "c0")} | {f(N, "c5")} |')
P('')
P('### How reliable the inferred rule is (sim, against the engine\'s own engagement at the catch)\n')
P('| sample | band (yd) | defenders | engine says engaged | inferred engaged | both | engine only (missed) | inferred only (false) | precision | recall |'); P('|---|---|---|---|---|---|---|---|---|---|')
for lab, (R, _) in data.items():
    if lab == 'NFL': continue
    for lo, hi, bn in BANDS + [(0, 10, 'all')]:
        S = [r for r in R if lo <= r['d0'] < hi and r['tru'] is not None]
        if len(S) < 15: continue
        a = sum(1 for r in S if r['tru']); b = sum(1 for r in S if r['inf']); both = sum(1 for r in S if r['tru'] and r['inf'])
        P(f'| {lab} | {bn} | {len(S)} | {a} | {b} | {both} | {a - both} | {b - both} | {both / b if b else float("nan"):.2f} | {both / a if a else float("nan"):.2f} |')
P('')
P('### Catch to first contact (any defender within 1 yd of the catcher) and yards after the catch\n')
P('| sample | plays | first contact p25 / p50 / p75 (s) | no contact before the end of the play | YAC mean (yd) | YAC p50 |'); P('|---|---|---|---|---|---|')
for lab, (_, pl) in data.items():
    fc = [x['fc'] for x in pl if x['fc'] is not None]
    P(f'| {lab} | {len(pl)} | {q(fc, 25):.1f} / {q(fc, 50):.1f} / {q(fc, 75):.1f} | {1 - len(fc) / len(pl):.2f} | {np.mean([x["yac"] for x in pl]):.1f} | {q([x["yac"] for x in pl], 50):.1f} |')
P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
if TSV:
    with open(TSV, 'w') as f:
        f.write('src\tid\tpos\tgrp\tman\td0\tc0\tc5\tstart\n')
        for lab, (R, _) in data.items():
            for r in R: f.write(f'{lab}\t{r["id"]}\t{r["pos"]}\t{r["grp"]}\t{int(r["man"])}\t{r["d0"]:.2f}\t{r["c0"]:.2f}\t{r["c5"]:.2f}\t{"" if r["start"] is None else r["start"]}\n')
print(txt)
