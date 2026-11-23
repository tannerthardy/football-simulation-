"""Onset and push after onset, by alignment, NFL vs ours (Tools' open-census play format: nfl_plays.py / sim_plays.mts).
Alignment as Tools' start_speed.py. Per receiver: time to 0.2 / 0.5 yd from his snap spot, and his speed 0.3 / 0.6 s after
the 0.2 yd onset. usage: python3 -I start_onset.py LABEL=plays.jsonl.gz [LABEL=...]"""
import gzip, json, sys, math, collections, importlib.util
import numpy as np
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
def groups(path):
    out = collections.defaultdict(list)
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        if p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        nf = X.shape[1]
        if nf < 21: continue
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        if len(ols) < 4: continue
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0]))
        ymin, ymax = float(Y[ols, 0].min()), float(Y[ols, 0].max())
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route'] and r['pos'] not in OL]
        motion_play = bool(p.get('motion')) if p.get('src') == 'sim' else False
        al = {}; wr = []
        for i in rec:
            pos = pl[i]['pos']; y0 = float(Y[i, 0]); x0 = float(X[i, 0])
            if pos in BACK: al[i] = 'back'; continue
            if pos == 'TE' and x0 > -1.6 and (ymin - 2.5 <= y0 <= ymax + 2.5): al[i] = 'TE in-line'; continue
            if pos == 'TE': al[i] = 'TE flexed'
            wr.append(i)
        for sgn in (1, -1):
            side = sorted([i for i in wr if sgn * (Y[i, 0] - c) > 0], key=lambda i: -sgn * (Y[i, 0] - c))
            for n, i in enumerate(side):
                if pl[i]['pos'] == 'TE' and al.get(i) == 'TE flexed': continue
                al[i] = 'wide' if n == 0 else 'slot'
        for i in rec:
            if i not in al: continue
            if (p.get('src') != 'sim' and pl[i].get('motion')) or motion_play: continue
            if math.hypot(X[i, 1] - X[i, 0], Y[i, 1] - Y[i, 0]) > 0.4: continue
            out[al[i]].append((X[i], Y[i]))
    return out
def onset(x, y, d):
    r = np.hypot(x - x[0], y - y[0]); k = np.argmax(r >= d)
    return k / 10 if r[k] >= d else None
def report(label, path):
    G = groups(path)
    print(f"| group | {label} n | t to 0.2 yd p25/p50/p75 | t to 0.5 yd p50 | speed 0.3 s after the 0.2 yd onset p50 | 0.6 s after p50 |")
    print('|---|---|---|---|---|---|')
    for g in ('wide', 'slot', 'TE in-line', 'TE flexed', 'back'):
        T, T5, V3, V6 = [], [], [], []
        for x, y in G.get(g, []):
            t = onset(x, y, 0.2)
            if t is None: continue
            T.append(t); t5 = onset(x, y, 0.5)
            if t5 is not None: T5.append(t5)
            k = int(round(t * 10))
            for dt, V in ((3, V3), (6, V6)):
                j = k + dt
                if j + 1 < len(x): V.append(math.hypot(x[j+1]-x[j-1], y[j+1]-y[j-1]) / 0.2)
        q = lambda v, p: np.quantile(v, p) if v else float('nan')
        print(f"| {g} | {len(T)} | {q(T,.25):.1f} / {q(T,.5):.1f} / {q(T,.75):.1f} | {q(T5,.5):.1f} | {q(V3,.5):.2f} | {q(V6,.5):.2f} |")
    print()
for a in sys.argv[1:]:
    lab, p = a.split('=', 1); report(lab, p)
