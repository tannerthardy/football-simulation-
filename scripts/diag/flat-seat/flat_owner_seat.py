"""Flat catches: where the catch-side curl-flat / flat seat is (Integration, 2026-11-23, Tools' open-flat class (a): our
nearest zone landmark is a median 10.7 yd from the catch). One operator on the open-census play format through the end
of the play (nfl_catches.py for BDB 2025, census/sim_plays_zone.mts for ours, which adds each seat's zone name).
Flat catch as flat_yac_report.py: caught within 4 yd of the line, 8+ yd laterally from the ball, screens apart.
The seat: NFL, the defender whose PFF assignment (player_play.pff_defensiveCoverageAssignment) is CFL / CFR (curl-flat)
or FL / FR (flat) on the catch's side of the ball (his y at the snap); ours, the defender whose installed zone on the
first tick is curl_flat_* or flat_* on that side. Several: the one nearest the catch point at the throw.
At the throw and at the catch: his depth past the line, his width from the sideline, the catch point's width, how far
inside the catch point he is (+ = nearer the ball), his distance to the catch point; no such seat on that side.
Our landmark (depth, width from the sideline) for the seat, as the engine held it on the first tick.
usage: python3 -I scripts/diag/flat-seat/flat_owner_seat.py DATA_DIR NFL.jsonl.gz SIM.jsonl.gz [SIM2 ...]"""
import gzip, json, sys, math, collections, csv
import numpy as np

D = sys.argv[1]
SEAT = {'CFL': 'curl_flat', 'CFR': 'curl_flat', 'FL': 'flat', 'FR': 'flat'}
assign = {}
for r in csv.DictReader(open(D + '/player_play.csv')):
    c = SEAT.get(r['pff_defensiveCoverageAssignment'])
    if c: assign[(r['gameId'] + '-' + r['playId'], r['nflId'])] = c
OL = {'T', 'G', 'C', 'OT', 'OG'}
OURS = {'cover0': 'Cover-0', 'cover1': 'Cover-1', 'cover2': 'Cover-2', 'cover3': 'Cover-3', 'cover4': 'Quarters', 'cover6': 'Cover-6', 'cover2man': '2-Man', 'tampa2': 'Cover-2'}


def fam_nfl(c):
    c = (c or '').lower()
    for k, v in (('cover-3', 'Cover-3'), ('cover-1', 'Cover-1'), ('quarters', 'Quarters'), ('cover-2', 'Cover-2'), ('cover 6', 'Cover-6'), ('cover-6', 'Cover-6'), ('cover-0', 'Cover-0'), ('2-man', '2-Man')):
        if k in c: return v
    return 'other'


def rows(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; c = p['catch']; r = p['recv']; f = p['rel']
        if c is None or f is None or c >= X.shape[1] - 2 or f >= X.shape[1]: continue
        cs = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] == 'C']; ol = [i for i, q in enumerate(pl) if q['side'] == 'O' and q['pos'] in OL]
        yc = float(Y[cs[0], 0]) if cs else float(np.median(Y[ol, 0])) if ol else 26.67
        cx, cy = float(X[r, c]), float(Y[r, c])
        if not (cx <= 4.0 and abs(cy - yc) >= 8.0): continue
        if (cx < 1.0 and sum(1 for i in ol if X[i, c] >= 2.0) >= 2) or p.get('screen'): continue
        side = 1 if cy > yc else -1
        if src == 'nfl':
            fam = fam_nfl(p['cov']); cand = [(i, assign[(p['id'], q.get('id'))]) for i, q in enumerate(pl) if q['side'] == 'D' and (p['id'], q.get('id')) in assign]
            lm = {}
        else:
            fam = OURS.get(p.get('fam'), 'other'); snap = {e['slot']: e for e in (p.get('def') or {}).get('snap') or []}
            cand, lm = [], {}
            for i, q in enumerate(pl):
                e = snap.get(q.get('slot')) if q['side'] == 'D' else None
                z = (e or {}).get('zone') or ''
                if z.startswith('curl_flat') or z.startswith('flat'):
                    cand.append((i, 'curl_flat' if z.startswith('curl_flat') else 'flat')); lm[i] = e.get('lm')
        cand = [(i, k) for i, k in cand if (Y[i, 0] - yc) * side > 0]
        wid = lambda y: min(y, 53.33 - y)
        row = dict(src=src, fam=fam, cx=cx, cw=wid(cy), seat=None)
        if cand:
            i, k = min(cand, key=lambda t: math.hypot(X[t[0], f] - cx, Y[t[0], f] - cy))
            ins = lambda t: (abs(cy - yc) - abs(Y[i, t] - yc))
            row.update(seat=k, d_throw=float(X[i, f]), w_throw=wid(float(Y[i, f])), in_throw=float(ins(f)), dist_throw=math.hypot(X[i, f] - cx, Y[i, f] - cy),
                       dist_catch=math.hypot(X[i, c] - cx, Y[i, c] - cy), d_catch=float(X[i, c]), in_catch=float(ins(c)),
                       lmd=(lm.get(i) or [None, None])[0], lmw=(wid(lm[i][1]) if lm.get(i) else None))
        out.append(row)
    return out


def q(v, f=.5):
    v = [x for x in v if x is not None]
    return float(np.percentile(v, f * 100)) if v else float('nan')


def f3(v): return f'{q(v):5.1f} ({q(v, .25):5.1f}-{q(v, .75):5.1f})'


N = rows(sys.argv[2], 'nfl'); S = [r for p in sys.argv[3:] for r in rows(p, 'sim')]
print('Flat catches (screens apart); the catch-side curl-flat / flat seat at the throw and at the catch. p50 (p25-p75).')
print('| side | family | flat catches | no seat on that side | seat curl-flat / flat | his depth at the throw | his width from the sideline | catch width | inside the catch point by | distance to the catch point at the throw | at the catch | his depth at the catch | ours: landmark depth / width |')
print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for fam in ('all', 'Cover-3', 'Quarters', 'Cover-6', 'Cover-2', 'Cover-1'):
    for lab, A in (('NFL', N), ('ours', S)):
        G = [r for r in A if fam == 'all' or r['fam'] == fam]
        if len(G) < 5: continue
        H = [r for r in G if r['seat']]
        cf = sum(r['seat'] == 'curl_flat' for r in H)
        lmtxt = f"{q([r.get('lmd') for r in H]):.1f} / {q([r.get('lmw') for r in H]):.1f}" if lab == 'ours' else '-'
        print(f"| {lab} | {fam} | {len(G)} | {1 - len(H) / len(G):.2f} | {cf} / {len(H) - cf} | {f3([r['d_throw'] for r in H])} | {f3([r['w_throw'] for r in H])} | {f3([r['cw'] for r in G])} | {f3([r['in_throw'] for r in H])} | {f3([r['dist_throw'] for r in H])} | {f3([r['dist_catch'] for r in H])} | {f3([r['d_catch'] for r in H])} | {lmtxt} |")
