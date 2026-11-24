"""Speed through a cut and how fast it comes back, NFL vs ours, positions only (open-census play format, receivers with a route, tracks cut to the release on both sides).
  python3 -I scripts/diag/census/cut_speed.py NFL.jsonl.gz LABEL=SIM.jsonl.gz [LABEL=SIM2.jsonl.gz ...] [--win 6] [--out report.md]

A cut = a frame k (from 0.8 s after the snap, with 1.0 s of track after it) that is the largest heading change within 0.5 s either side, the heading taken over the last and the next WIN frames (default 6 = 0.6 s) and each over 0.15 x WIN yd.
Cut angle = that heading change (bins 30-60 speed cuts, 60-110 breaks, over 110 reversals). Entry speed = the fastest speed (centred 0.2 s difference) from 1.0 to 0.3 s before k, the stem pace, bins 3-5 / 5-7 / over 7 yd/s; a cut needs 3 yd/s of it.
Minimum speed = the lowest speed in k - 3 .. k + 8 frames; minimum / entry. Time back to 90% of the entry speed = the first time after the minimum frame that the speed is at least 0.9 x entry (capped at 1.5 s; none within it counts as 1.5).
Speed at +0.6 s and +1.0 s after k as a share of the entry speed. Receiver groups: back, TE, WR (slot and wide). Route label on the NFL (PFF) and ours (route id) for the break rows."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--win')]
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
WIN = int(sys.argv[sys.argv.index('--win') + 1]) if '--win' in sys.argv else 6
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi
def spd(X, Y, i, f, nf):
    a, b = max(0, f - 1), min(nf - 1, f + 1)
    return math.hypot(X[i, b] - X[i, a], Y[i, b] - Y[i, a]) / ((b - a) / 10.0)
def rows_of(path, src):
    out = []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        if p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        nf = X.shape[1]
        if nf < 8 + WIN + 10: continue
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == qb or not r['route'] or r['pos'] in OL: continue
            ts = {}
            for k in range(max(8, WIN), nf - 10):
                a = (X[i, k] - X[i, k - WIN], Y[i, k] - Y[i, k - WIN]); b = (X[i, k + WIN] - X[i, k], Y[i, k + WIN] - Y[i, k]) if k + WIN < nf else None
                if b is None or math.hypot(*a) < 0.15 * WIN or math.hypot(*b) < 0.15 * WIN: continue
                ts[k] = abs(math.degrees(wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0]))))
            for k, t in ts.items():
                if t < 30 or any(ts.get(j, 0) > t or (j < k and ts.get(j, 0) == t) for j in range(k - 5, k + 6) if j != k): continue
                fr = list(range(max(1, k - 10), k - 2)); sv = [spd(X, Y, i, f, nf) for f in fr]; ent = float(max(sv)); fent = fr[int(np.argmax(sv))]  # the stem pace: the fastest speed from 1.0 to 0.3 s before the cut
                if ent < 3.0: continue
                sp = [spd(X, Y, i, f, nf) for f in range(k - 3, min(nf, k + 16))]
                m = int(np.argmin(sp[:12])); mn = sp[m]; dec = (ent - mn) / max(0.1, (k - 3 + m - fent) / 10.0)
                t90 = next((j / 10.0 for j in range(m, len(sp)) if sp[j] >= 0.9 * ent), None)
                t90 = (t90 - m / 10.0) if t90 is not None else 1.5
                pos = r['pos']; grp = 'back' if pos in BACK else 'TE' if pos == 'TE' else 'WR'
                rt = (r.get('routeRan') if src == 'nfl' else ((p.get('routes') or {}).get(str(i)) or {}).get('id'))
                vmid = float(np.mean([spd(X, Y, i, f, nf) for f in range(k - WIN // 2, k + WIN // 2 + 1)])); out.append(dict(dec=dec, alat=vmid * math.radians(t) / (WIN / 10.0), ang=t, ent=ent, mn=mn / ent, t90=min(t90, 1.5), f6=(spd(X, Y, i, k + 6, nf) / ent), f10=(spd(X, Y, i, k + 10, nf) / ent) if k + 10 < nf else None, grp=grp, route=rt, ent_abs=ent, mn_abs=mn))
    return out
data = {'NFL': rows_of(args[0], 'nfl')}
for a in args[1:]:
    lab, path = a.split('=', 1); data[lab] = rows_of(path, 'sim')
angb = lambda a: '30-60' if a < 60 else '60-110' if a < 110 else '110+'
entb = lambda e: '3-5' if e < 5 else '5-7' if e < 7 else '7+'
m = lambda v: float(np.mean(v)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P(f'## Speed through a cut and the way back, NFL vs ours (heading window {WIN} frames; cuts {", ".join(f"{k} {len(v)}" for k, v in data.items())})\n')
def table(title, sel, keys, keyf):
    P(f'### {title}\n'); P('| group | sample | n | entry speed | min speed (yd/s) | min / entry | time back to 90% of entry (s) | speed at +0.6 s / entry | +1.0 s / entry | lateral accel (yd/s2) | braking into it (yd/s2) |'); P('|---|---|---|---|---|---|---|---|---|---|---|')
    for k in keys:
        for lab, R in data.items():
            S = [r for r in R if sel(r) and keyf(r) == k]
            if len(S) < 12: P(f'| {k} | {lab} | {len(S)} | | | | | | | |'); continue
            P(f'| {k} | {lab} | {len(S)} | {m([r["ent"] for r in S]):.1f} | {m([r["mn_abs"] for r in S]):.1f} | {m([r["mn"] for r in S]):.2f} | {m([r["t90"] for r in S]):.2f} | {m([r["f6"] for r in S]):.2f} | {m([r["f10"] for r in S if r["f10"] is not None]):.2f} | {m([r["alat"] for r in S]):.1f} | {m([r["dec"] for r in S]):.1f} |')
    P('')
table('By cut angle (all entry speeds 3 yd/s and over)', lambda r: True, ['30-60', '60-110', '110+'], lambda r: angb(r['ang']))
table('Breaks of 60-110 degrees by entry speed', lambda r: 60 <= r['ang'] < 110, ['3-5', '5-7', '7+'], lambda r: entb(r['ent']))
table('Speed cuts of 30-60 degrees by entry speed', lambda r: r['ang'] < 60, ['3-5', '5-7', '7+'], lambda r: entb(r['ent']))
table('Breaks of 60-110 degrees at 5-7 yd/s entry, by receiver group', lambda r: 60 <= r['ang'] < 110 and 5 <= r['ent'] < 7, ['WR', 'TE', 'back'], lambda r: r['grp'])
for lab, sel in (('Out / in / dig / comeback-type breaks of 60-110 degrees at 5-7 yd/s entry, by route', lambda r: 60 <= r['ang'] < 110 and 5 <= r['ent'] < 7),):
    P(f'### {lab}\n'); P('| sample | route | n | min / entry | time back (s) | +0.6 s / entry |'); P('|---|---|---|---|---|---|')
    for name, R in data.items():
        c = collections.Counter(str(r['route']).lower() for r in R if sel(r))
        for rt, n in c.most_common(6):
            S = [r for r in R if sel(r) and str(r['route']).lower() == rt]
            if n >= 10: P(f'| {name} | {rt} | {n} | {m([r["mn"] for r in S]):.2f} | {m([r["t90"] for r in S]):.2f} | {m([r["f6"] for r in S]):.2f} |')
    P('')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
