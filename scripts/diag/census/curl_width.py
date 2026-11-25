"""Curl-flat defender width: what he is playing (ours) and where #2 is (NFL and ours). Defense-film stop-lane rows (nfl-stop-lane.py / sim-stop-lane.mts).
  python3 -I scripts/diag/census/curl_width.py NFL_STOP.jsonl SIM_STOP.jsonl [SIM2 ...]
Dropbacks without play action; curl-flat seat (NFL CFL / CFR; ours curl_flat*); zone families only. Width = |y - the ball's y|. His side = the side of the ball he lines up on; #2 = the second widest eligible (not QB / OL) receiver on that side at the snap, and again at 1.5 s from the same man.
Printed: (1) the curl-flat's width at 1.5 / 2.0 / 3.0 s and #2's width at the snap and at 1.5 s, p25/50/75; (2) the curl-flat's width at 3.0 s by #2's width at 1.5 s (bins <8, 8-12, 12+ yd) and by #2's width at the snap (<6, 6-9, 9+); (3) ours: width at 3.0 s by what he is playing at 1.5 s (tags: carry = open-carry*, man = cov-man, settled, zone = cov-zone and none of those, other) with n."""
import json, sys
import numpy as np
OL = {'C', 'G', 'T', 'OT', 'OG', 'OL', 'QB'}
Z = ('cover2', 'cover3', 'cover4', 'cover6', 'tampa2')
def rows(path):
    out = []
    for l in open(path):
        r = json.loads(l)
        if r['kind'] != 'pass' or r.get('pa') or not r.get('dropback', True) or r['cov']['fam'] not in Z: continue
        T = r['t']; thr = r.get('throw'); by = r['ballY']; pl = r['players']; src = r['src']
        def kf(t):
            k = min(range(len(T)), key=lambda i: abs(T[i] - t))
            return k if abs(T[k] - t) <= 0.06 else None
        k0, k15, k2, k3 = kf(0.0), kf(1.5), kf(2.0), kf(3.0)
        if None in (k0, k15, k2, k3) or (thr is not None and thr < 3.0): continue
        P = lambda i, k: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        rec = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL]
        for i, p in enumerate(pl):
            if p['side'] != 'D': continue
            seat = (p.get('assign') in ('CFL', 'CFR')) if src == 'nfl' else (p.get('role') or '').startswith('curl_flat')
            if not seat: continue
            s = 1 if P(i, k0)[1] >= by else -1
            side = sorted([j for j in rec if s * (P(j, k0)[1] - by) > 1.0], key=lambda j: -s * (P(j, k0)[1] - by))
            if len(side) < 2: continue
            j2 = side[1]
            tg = set(p.get('tags15') or [])
            cls = None
            if src != 'nfl':
                cls = 'carry' if any(t.startswith('open-carry') for t in tg) else 'man' if 'cov-man' in tg else 'settled' if 'settled' in tg else 'zone' if 'cov-zone' in tg else 'other'
            out.append(dict(w15=abs(P(i, k15)[1] - by), w2=abs(P(i, k2)[1] - by), w3=abs(P(i, k3)[1] - by), n0=abs(P(j2, k0)[1] - by), n15=abs(P(j2, k15)[1] - by), cls=cls))
    return out
q = lambda v, f: float(np.percentile(v, f)) if len(v) else float('nan')
def pr(v): return f'{q(v, 25):.1f} / {q(v, 50):.1f} / {q(v, 75):.1f}'
samples = [('NFL', rows(sys.argv[1]))] + [(a.split('/')[-1], rows(a)) for a in sys.argv[2:]]
print('| sample | n | curl-flat width 1.5 s | 2.0 s | 3.0 s | #2 width at the snap | #2 width at 1.5 s |'); print('|---|---|---|---|---|---|---|')
for nm, R in samples: print(f"| {nm} | {len(R)} | {pr([r['w15'] for r in R])} | {pr([r['w2'] for r in R])} | {pr([r['w3'] for r in R])} | {pr([r['n0'] for r in R])} | {pr([r['n15'] for r in R])} |")
for key, bins, lab in (('n15', [(0, 8), (8, 12), (12, 99)], '#2 width at 1.5 s'), ('n0', [(0, 6), (6, 9), (9, 99)], '#2 width at the snap')):
    print(f'\ncurl-flat width at 3.0 s p50 (n) by {lab}:'); print('| sample | ' + ' | '.join(f'{a}-{b if b < 99 else "+"}' for a, b in bins) + ' |'); print('|---|' + '---|' * len(bins))
    for nm, R in samples:
        cells = []
        for a, b in bins:
            S = [r['w3'] for r in R if a <= r[key] < b]; cells.append(f'{q(S, 50):.1f} ({len(S)})' if len(S) >= 5 else f'- ({len(S)})')
        print(f'| {nm} | ' + ' | '.join(cells) + ' |')
print('\nours: curl-flat width at 3.0 s by what he is playing at 1.5 s (tags), p25/50/75 (n); #2 width at 1.5 s p50 in that class:')
for nm, R in samples[1:]:
    for c in ('carry', 'man', 'settled', 'zone', 'other'):
        S = [r for r in R if r['cls'] == c]
        if S: print(f"| {nm} | {c} | {pr([r['w3'] for r in S])} ({len(S)}) | #2 at 1.5 s {q([r['n15'] for r in S], 50):.1f} | width at 1.5 s {q([r['w15'] for r in S], 50):.1f} |")
