"""Speed from the snap by alignment and release direction, and speed lost through a turn, NFL vs ours (open-census play format, positions only).
  python3 -I scripts/diag/census/start_speed.py NFL.jsonl.gz LABEL=SIM.jsonl.gz [LABEL=SIM2.jsonl.gz ...] [--out report.md]

Receivers = offensive players who ran a route (not QB, not OL). Both sides are cut at the release (the NFL record ends there; the sim's is cut to it), so a window needs the track to be that long.
Alignment (from positions at the snap, the same code on both sides): the offensive line's outer ends define the tackle box; a TE within 2.5 yd laterally of a tackle and not more than 1.6 yd off the line is in-line, a TE
otherwise is flexed; RB / FB / HB = back; of the other receivers (WR, flexed TE) the outermost on each side of the center is wide and the ones inside him are slot. A player who was in motion at the snap (NFL: PFF flag; ours:
any motion on the play) or who has moved more than 0.4 yd in the first 0.1 s is left out.
Speed at t = the centred 0.2 s difference of position (t - 0.1 .. t + 0.1 s), t = 0.5 / 1.0 / 1.5 / 2.0 s after the snap. Yards = distance along the track by 1.0 / 2.0 s.
Release direction = the angle of the displacement from the snap to 1.0 s against straight upfield (+x), absolute, binned 0-20 / 20-45 / 45-90 / over 90; it needs 0.7 yd of displacement (a receiver with less has no direction and is left out of the direction tables, not the alignment ones; a higher bar cut the slower start of ours more than the NFL's).
Turn: every frame k (from 0.5 s after the snap, with 0.4 s of track after it) at which the change of heading between the last 0.4 s (k - 4 .. k) and the next 0.4 s (k .. k + 4), both over 0.6 yd, is the largest within 0.5 s either side; kept when the change is 45-90 degrees
and the speed over the last 0.4 s is in the band given by --pre (default 3-6 yd/s) (a receiver can give more than one). Speed lost = that speed minus the lowest centred speed in k .. k + 0.6 s; the speed at +0.3 / +0.6 / +1.0 s is also given as a fraction of it."""
import gzip, json, sys, math, collections
import numpy as np
args = [a for i, a in enumerate(sys.argv) if i > 0 and not a.startswith('--') and sys.argv[i - 1] not in ('--out', '--pre', '--win')]
WIN = int(sys.argv[sys.argv.index('--win') + 1]) if '--win' in sys.argv else 4  # frames of heading window either side of a turn (0.1 s each)
PRE_LO, PRE_HI = (float(v) for v in sys.argv[sys.argv.index('--pre') + 1].split('-')) if '--pre' in sys.argv else (3.0, 6.0)  # speed band before the turn (yd/s)
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
OL = {'T', 'G', 'C', 'OT', 'OG'}; BACK = {'RB', 'FB', 'HB'}
wrap = lambda a: (a + math.pi) % (2 * math.pi) - math.pi

def speed(X, Y, i, f, nf):
    a, b = max(0, f - 1), min(nf - 1, f + 1)
    return math.hypot(X[i, b] - X[i, a], Y[i, b] - Y[i, a]) / ((b - a) / 10.0)

skipped = collections.Counter()
def kb_ok(ts, k):
    return all(ts.get(j, 0) <= ts[k] for j in range(k - WIN - 1, k + WIN + 2) if j != k) and not any(ts.get(j, 0) == ts[k] for j in range(k - WIN - 1, k))
def rows_of(path, src):
    st, tu = [], []
    for l in gzip.open(path, 'rt'):
        p = json.loads(l); X = np.array(p['x']); Y = np.array(p['y']); pl = p['players']; qb = p['qb']
        if p.get('rel') is not None: X, Y = X[:, :p['rel'] + 1], Y[:, :p['rel'] + 1]
        nf = X.shape[1]
        if nf < 12: continue
        ols = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] in OL]
        if len(ols) < 4: continue
        cs = [i for i, r in enumerate(pl) if r['side'] == 'O' and r['pos'] == 'C']
        c = float(Y[cs[0], 0]) if cs else float(np.median(Y[ols, 0]))
        ymin, ymax = float(Y[ols, 0].min()), float(Y[ols, 0].max())
        rec = [i for i, r in enumerate(pl) if r['side'] == 'O' and i != qb and r['route'] and r['pos'] not in OL]
        motion_play = bool(p.get('motion')) if src == 'sim' else False
        al = {}
        wr = []
        for i in rec:
            pos = pl[i]['pos']; y0 = float(Y[i, 0]); x0 = float(X[i, 0])
            if pos in BACK: al[i] = 'back'; continue
            if pos == 'TE' and x0 > -1.6 and (ymin - 2.5 <= y0 <= ymax + 2.5): al[i] = 'TE in-line'; continue
            if pos == 'TE': al[i] = 'TE flexed'
            wr.append(i)
        for sgn in (1, -1):
            side = sorted([i for i in wr if sgn * (Y[i, 0] - c) > 0], key=lambda i: -sgn * (Y[i, 0] - c))  # outermost first
            for n, i in enumerate(side):
                if pl[i]['pos'] == 'TE' and al.get(i) == 'TE flexed': continue
                al[i] = 'wide' if n == 0 else 'slot'
        def rname(i):
            if src == 'nfl': return (pl[i].get('routeRan') or '').lower() or None
            r = (p.get('routes') or {}).get(str(i)) or (p.get('routes') or {}).get(i)
            n = (r or {}).get('id', '') or ''
            return 'flat' if n in ('flat', 'back_flat') else 'hitch' if n in ('hitch', 'quick_hitch') else 'go' if n == 'go' else 'slant' if n == 'slant' else n or None
        for i in rec:
            if i not in al: continue
            if (src == 'nfl' and pl[i].get('motion')) or motion_play: continue
            if math.hypot(X[i, 1] - X[i, 0], Y[i, 1] - Y[i, 0]) > 0.4: continue
            if nf > 10:
                dx, dy = X[i, 10] - X[i, 0], Y[i, 10] - Y[i, 0]
                disp = math.hypot(dx, dy); ang = abs(math.degrees(math.atan2(dy, dx))) if disp >= 0.7 else None
            else: ang = None
            skipped[src] += ang is None and nf > 20
            if nf > 20:
                path = np.hypot(np.diff(X[i]), np.diff(Y[i])); disp_t = np.hypot(X[i] - X[i, 0], Y[i] - Y[i, 0])
                lat2 = abs(float(Y[i, 20] - Y[i, 0])); dep2 = float(X[i, 20] - 0.0)
                t_on = next((f / 10.0 for f in range(nf) if disp_t[f] >= 0.5), None); t_3 = next((f / 10.0 for f in range(nf) if disp_t[f] >= 3.0), None)
                st.append(dict(al=al[i], rt=rname(i), ang=ang, s={t: speed(X, Y, i, int(round(t * 10)), nf) for t in (0.5, 1.0, 1.5, 2.0)}, y1=float(path[:10].sum()), y2=float(path[:20].sum()), lat2=lat2, dep2=dep2, t_on=t_on, t_3=t_3))
            # turns: every local maximum of the heading change (over +-0.5 s) that is 45-90 degrees, with 3-6 yd/s before it
            ts = {}
            for k in range(max(5, WIN), nf - WIN):
                a = (X[i, k] - X[i, k - WIN], Y[i, k] - Y[i, k - WIN]); b = (X[i, k + WIN] - X[i, k], Y[i, k + WIN] - Y[i, k])
                if math.hypot(*a) < 0.15 * WIN or math.hypot(*b) < 0.15 * WIN: continue
                ts[k] = abs(math.degrees(wrap(math.atan2(b[1], b[0]) - math.atan2(a[1], a[0]))))
            for k, best in ts.items():
                if not (45 <= best < 90 and kb_ok(ts, k) and k + 10 < nf): continue
                pre = math.hypot(X[i, k] - X[i, k - WIN], Y[i, k] - Y[i, k - WIN]) / (WIN / 10.0)
                if PRE_LO <= pre < PRE_HI:
                    post = [speed(X, Y, i, f, nf) for f in range(k, min(nf, k + 11))]
                    tu.append(dict(al=al[i], rt=rname(i), turn=best, pre=pre, lost=pre - min(post[:7]), f3=post[3] / pre, f6=post[6] / pre, f10=post[10] / pre if len(post) > 10 else None, tk=k / 10.0))
    return st, tu

data = {'NFL': rows_of(args[0], 'nfl')}
for a in args[1:]:
    lab, path = a.split('=', 1); data[lab] = rows_of(path, 'sim')
m = lambda v: float(np.mean(v)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P('## Speed from the snap by alignment and release direction, and speed lost through a 45-90 degree turn\n')
P('Receivers kept (a route, no motion, stationary at the snap, track to the release of 2.0 s or more; the ones with less than 0.7 yd by 1.0 s have no release direction and are left out of the direction tables only: ' + ', '.join(f'{k} {v}' for k, v in skipped.items()) + '): ' + ', '.join(f'{k} {len(v[0])}' for k, v in data.items()) + '. Turn rows: ' + ', '.join(f'{k} {len(v[1])}' for k, v in data.items()) + '.\n')
ALS = ['wide', 'slot', 'TE in-line', 'TE flexed', 'back']; BINS = [('0-20', 0, 20), ('20-45', 20, 45), ('45-90', 45, 90), ('over 90', 90, 181)]
def srow(lab, R):
    if len(R) < 8: return f'| {lab} | {len(R)} | | | | | | |'
    return f'| {lab} | {len(R)} | ' + ' | '.join(f'{m([r["s"][t] for r in R]):.1f}' for t in (0.5, 1.0, 1.5, 2.0)) + f' | {m([r["y1"] for r in R]):.1f} | {m([r["y2"] for r in R]):.1f} |'
def stable(title, keyf, keys):
    P(f'### {title}\n'); P('| group | sample | n | speed 0.5 s | 1.0 s | 1.5 s | 2.0 s | yards by 1.0 s | by 2.0 s |'); P('|---|---|---|---|---|---|---|---|---|')
    for k in keys:
        for lab, (st, tu) in data.items():
            R = [r for r in st if keyf(r, k)]; P(srow(f'{k} | {lab}', R).replace(' | ', ' | ', 1))
    P('')
stable('By alignment (all release directions)', lambda r, k: r['al'] == k, ALS)
stable('By release direction (all alignments)', lambda r, k: r['ang'] is not None and dict((b[0], b) for b in BINS)[k][1] <= r['ang'] < dict((b[0], b) for b in BINS)[k][2], [b[0] for b in BINS])
for al in ALS:
    stable(f'{al}, by release direction', lambda r, k, al=al: r['al'] == al and r['ang'] is not None and dict((b[0], b) for b in BINS)[k][1] <= r['ang'] < dict((b[0], b) for b in BINS)[k][2], [b[0] for b in BINS])
for rt in ('flat', 'slant', 'hitch', 'go'):
    stable(f'{rt} routes (NFL: PFF route label; ours: route id, the back\'s flat counted as flat), by alignment', lambda r, k, rt=rt: r['rt'] == rt and r['al'] == k, ALS)
    stable(f'{rt} routes, by release direction', lambda r, k, rt=rt: r['rt'] == rt and r['ang'] is not None and dict((b[0], b) for b in BINS)[k][1] <= r['ang'] < dict((b[0], b) for b in BINS)[k][2], [b[0] for b in BINS])
stable('flat routes that reach the flat (6+ yd lateral and under 5 yd deep at 2.0 s, the route_shape class), by alignment', lambda r, k: r['rt'] == 'flat' and r['lat2'] >= 6 and r['dep2'] < 5 and r['al'] == k, ALS)
P('### Time to leave the line: seconds until he is 0.5 yd / 3.0 yd from his snap spot (median, mean of the 0.5 yd moves under 1 s), all receivers kept\n'); P('| group | sample | n | 0.5 yd p50 | 3.0 yd p50 | 3.0 yd p25 / p75 |'); P('|---|---|---|---|---|---|')
for al in ALS:
    for lab, (st, tu) in data.items():
        R = [r for r in st if r['al'] == al and r['t_on'] is not None]; R3 = [r['t_3'] for r in st if r['al'] == al and r['t_3'] is not None]
        if len(R) < 8 or len(R3) < 8: P(f'| {al} | {lab} | {len(R)} | | | |'); continue
        P(f'| {al} | {lab} | {len(R)} | {np.median([r["t_on"] for r in R]):.1f} | {np.median(R3):.1f} | {np.percentile(R3, 25):.1f} / {np.percentile(R3, 75):.1f} |')
P('')
P(f'### Speed lost through a 45-90 degree turn at {PRE_LO:g}-{PRE_HI:g} yd/s\n')
P('| group | sample | n | speed before | turn (deg) | lowest speed after, lost | speed at +0.3 s / before | +0.6 s | +1.0 s | turn time p50 (s) |'); P('|---|---|---|---|---|---|---|---|---|---|')
for g in ['all'] + ALS + ['route flat', 'route slant', 'route hitch']:
    for lab, (st, tu) in data.items():
        R = [r for r in tu if g == 'all' or r['al'] == g or g == 'route ' + str(r['rt'])]
        if len(R) < 8: P(f'| {g} | {lab} | {len(R)} | | | | | | | |'); continue
        P(f'| {g} | {lab} | {len(R)} | {m([r["pre"] for r in R]):.1f} | {m([r["turn"] for r in R]):.0f} | {m([r["lost"] for r in R]):.2f} | {m([r["f3"] for r in R]):.2f} | {m([r["f6"] for r in R]):.2f} | {m([r["f10"] for r in R if r["f10"] is not None]):.2f} | {np.median([r["tk"] for r in R]):.1f} |')
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
