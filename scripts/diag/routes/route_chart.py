"""Route timing chart, NFL against ours, one operator (Rules, 2026-11-24).

Input: the open-census play format on both sides. NFL: nfl_routes.py (BDB 2025 weeks 1-9, PFF routeRan, tracks past the
release to the ball's arrival or 6 s). Ours: Tools' sim_plays.mts --full --all (tools/open-census 0a0c86fa5; the route id
on each route runner). Positions only, 10 Hz, x = yards past the line (offense +x), y across.

Route runners: offense, not the QB, on a route, not in motion at the snap (NFL PFF flag; ours: no motion on the play), a
label in FAMILY. Track cut: the target at the ball's arrival (NFL `arr`; ours the catch frame, else the release + 0.7 s,
the median flight); everyone else at the release + 1.5 s (or 4.5 s with no throw). The cut is reported: a break after it
is "not found".

The break, the same rule both sides (from 0.5 s after the snap, at least 1 yd past the line, 0.3 s of track either side):
  stop (HITCH): his plant, the first frame after his peak speed that he is under half of it;
  other planted families (OUT, IN, SLANT, POST, CORNER, ANGLE): the frame of his largest heading change between the
    leg 0.6-0.2 s before and the leg 0.2-0.6 s after (a rounded break turns over about a second), moving faster than
    1.5 yd/s at both ends, if it is 35 degrees or more.
At the break: depth (yd past the line), time from the snap; speed into it (mean 0.5-0.3 s before), lowest within
+-0.3 s, at +0.3 / +0.6 s; duration (contiguous time under 0.8 of the speed in); heading change (0.4 s windows either
side, 0.2 s off the break); exit angle against the line of scrimmage (+90 = straight upfield, 0 = along the line,
negative = back toward it); drift: depth change from +0.5 to +1.5 s (works back < 0, flattens ~ 0, climbs > 0).
Unplanted families (CROSS, GO, FLAT, WHEEL): depth and width (lateral, + = away from the ball) at 0.5 s steps, and the
bend: the frame of his largest heading change (as above, 20 degrees or more), its depth and time.
Defender at the snap: the nearest defender ahead of him (deeper than his x - 0.5) within 3 yd across: cushion = his x
lead; press under 2 yd, off otherwise, none if no one; leverage inside / outside of him toward the ball (head-up within
0.5 yd). Release - break and speed at the catch (the 0.2 s into the catch frame): the target only.
  python3 -I route_chart.py NFL=nfl-routes.jsonl.gz OURS=sim.jsonl.gz [--md OUT.md]"""
import gzip, json, math, sys, collections
import numpy as np

SIM = {'hitch': 'HITCH', 'quick_hitch': 'HITCH', 'curl': 'HITCH', 'comeback': 'HITCH', 'stick': 'HITCH', 'hook': 'HITCH', 'sit': 'HITCH',
       'spot': 'HITCH', 'quick_out': 'OUT', 'out': 'OUT', 'deep_out': 'OUT', 'back_out': 'OUT', 'speed_out': 'OUT',
       'dig': 'IN', 'short_in': 'IN', 'in': 'IN', 'slant': 'SLANT', 'post': 'POST', 'corner': 'CORNER', 'angle': 'ANGLE',
       'back_angle': 'ANGLE', 'cross': 'CROSS', 'shallow': 'CROSS', 'shallow_high': 'CROSS', 'mesh_under': 'CROSS', 'drag': 'CROSS',
       'go': 'GO', 'seam': 'GO', 'fade': 'GO', 'seam_read': 'GO', 'flat': 'FLAT', 'back_flat': 'FLAT', 'arrow': 'FLAT',
       'swing': 'FLAT', 'wheel': 'WHEEL'}
PLANTED = ['HITCH', 'OUT', 'IN', 'SLANT', 'POST', 'CORNER', 'ANGLE']
OPEN = ['CROSS', 'GO', 'FLAT', 'WHEEL']
BANDS = [(-9, 3), (3, 7.5), (7.5, 12), (12, 18), (18, 60)]
OL = {'T', 'G', 'C', 'OT', 'OG'}
ang = lambda a, b: abs((a - b + math.pi) % (2 * math.pi) - math.pi)


def track_rows(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('screen'): continue
        X = np.array(p['x'], dtype=float); Y = np.array(p['y'], dtype=float); pl = p['players']; nf = X.shape[1]
        qb = p.get('qb'); rel = p.get('rel')
        if qb is None or nf < 12: continue
        ball_y = Y[qb, 0]
        defs = [j for j, r in enumerate(pl) if r['side'] == 'D']
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == qb or not r.get('route') or r.get('pos') in OL: continue
            if nfl:
                lab = r.get('routeRan'); rid = lab
                if r.get('motion'): continue
            else:
                rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = SIM.get(rid)
                if p.get('motion'): continue
            if lab not in PLANTED and lab not in OPEN: continue
            tgt = bool(r.get('target'))
            if tgt:
                if nfl: cut = p.get('arr') if p.get('arr') is not None else nf - 1
                else: cut = p['catch'] if p.get('catch') is not None and p.get('recv') == i else (rel + 7 if rel is not None else nf - 1)
            else:
                cut = rel + 15 if rel is not None else 45
            cut = min(cut, nf - 1)
            yield dict(src='NFL' if nfl else 'ours', lab=lab, rid=rid, pos=r.get('pos'), x=X[i, :cut + 1], y=Y[i, :cut + 1],
                       out=1.0 if Y[i, 0] >= ball_y else -1.0, tgt=tgt, rel=rel if tgt else None,
                       catch=(p.get('catch') if tgt and p.get('recv') == i else None), Xf=X[i], Yf=Y[i],
                       dx0=[(X[j, 0] - X[i, 0], Y[j, 0] - Y[i, 0]) for j in defs])


def speeds(x, y):
    n = len(x); v = np.zeros(n); h = np.zeros(n)
    for k in range(n):
        a, b = max(0, k - 1), min(n - 1, k + 1)
        if b == a: continue
        dx, dy = (x[b] - x[a]) / ((b - a) / 10), (y[b] - y[a]) / ((b - a) / 10)
        v[k] = math.hypot(dx, dy); h[k] = math.atan2(dy, dx)
    return v, h


def heading(x, y, a, b):
    return math.atan2(y[b] - y[a], x[b] - x[a]) if math.hypot(y[b] - y[a], x[b] - x[a]) > 0.15 else None


def turn_peak(x, y, v, k0):
    """The frame of his largest heading change between the leg 0.6-0.2 s before it and the leg 0.2-0.6 s after it (a
    rounded break turns over about a second: NFL outs change 15-26 deg within 0.3 s and 60-80 over the whole roll), moving
    faster than 1.5 yd/s at both ends, at least 1 yd past the line. Returns (radians, frame)."""
    n = len(x); best, kb = 0.0, None
    for k in range(max(k0, 6), n - 6):
        if x[k] < 1 or v[k - 6] < 1.5 or v[k + 6] < 1.5: continue
        h1, h2 = heading(x, y, k - 6, k - 2), heading(x, y, k + 2, k + 6)
        if h1 is None or h2 is None: continue
        d = ang(h1, h2)
        if d > best: best, kb = d, k
    return best, kb


def defender(row):
    best = None
    for dx, dy in row['dx0']:
        if dx > -0.5 and abs(dy) <= 3 and (best is None or math.hypot(dx, dy) < math.hypot(*best)): best = (dx, dy)
    if best is None: return 'none', None
    cush = 'press' if best[0] < 2 else 'off'
    # inside = between him and the ball: toward the ball is -out across
    lat = best[1] * row['out']
    lev = 'head-up' if abs(lat) < 0.5 else ('inside' if lat < 0 else 'outside')
    return cush, lev


def analyse(row):
    x, y = row['x'], row['y']; n = len(x); v, _ = speeds(x, y)
    res = dict(lab=row['lab'], rid=row['rid'], src=row['src'], tgt=row['tgt'], cut=(n - 1) / 10)
    res['cush'], res['lev'] = defender(row)
    k0 = 5
    if row['lab'] in PLANTED:
        kb = None
        if row['lab'] == 'HITCH':
            if n > k0 + 4:
                kp = max(range(k0, n), key=lambda k: v[k])
                kb = next((k for k in range(kp + 1, n - 1) if v[k] < 0.5 * v[kp] and x[k] >= 1), None)
        else:
            best, kb = turn_peak(x, y, v, k0)
            if best < math.radians(35): kb = None
        res['found'] = kb is not None
        if kb is None: return res
        vin = float(np.mean(v[max(0, kb - 5):max(1, kb - 2)]))
        lo = float(np.min(v[max(0, kb - 3):min(n, kb + 4)]))
        a = kb
        while a > 0 and v[a - 1] < 0.8 * vin: a -= 1
        b = kb
        while b < n - 1 and v[b + 1] < 0.8 * vin: b += 1
        km = int(np.argmin(v[max(0, kb - 3):min(n, kb + 4)])) + max(0, kb - 3)
        dur = (b - a + 1) / 10 if v[km] < 0.8 * vin else 0.0
        h1 = heading(x, y, max(0, kb - 6), max(0, kb - 2)); h2 = heading(x, y, min(n - 1, kb + 2), min(n - 1, kb + 6))
        turn = math.degrees(ang(h1, h2)) if h1 is not None and h2 is not None else None
        ex = None
        if kb + 6 < n:
            dx, dy = x[kb + 6] - x[kb + 2], y[kb + 6] - y[kb + 2]
            if math.hypot(dx, dy) > 0.2: ex = math.degrees(math.atan2(dx, abs(dy)))
        drift = x[kb + 15] - x[kb + 5] if kb + 15 < n else None
        res.update(depth=float(x[kb]), t=kb / 10, vin=vin, vmin=lo, v3=v[kb + 3] if kb + 3 < n else None, v6=v[kb + 6] if kb + 6 < n else None,
                   dur=dur, turn=turn, exit=ex, drift=drift)
    else:
        res['found'] = True
        res['dw'] = [(float(x[k] ), float((y[k] - y[0]) * row['out'])) if k < n else None for k in (5, 10, 15, 20, 25, 30)]
        best, kb = turn_peak(x, y, v, k0)
        if kb is not None and best >= math.radians(20):
            res.update(bend=True, bdepth=float(x[kb]), bt=kb / 10, bturn=math.degrees(best))
        else: res['bend'] = False
    if row['tgt'] and row['rel'] is not None and res.get('t') is not None: res['relmb'] = row['rel'] / 10 - res['t']
    if row['tgt'] and row['catch'] is not None:
        c = row['catch']; X, Y = row['Xf'], row['Yf']
        # Backward 0.2 s difference: the NFL track ends at the ball's arrival, so both sides read the 0.2 s into the catch.
        if 2 <= c < len(X): res['vcatch'] = math.hypot(X[c] - X[c - 2], Y[c] - Y[c - 2]) / 0.2
    return res


def band(d):
    return next(f"{a}-{b}" if a > -9 else f"<{b}" for a, b in BANDS if a <= d < b) if d < 60 else '60+'


q = lambda v, p: (float(np.quantile(v, p)) if v else float('nan'))
f1 = lambda v: '-' if v is None or (isinstance(v, float) and math.isnan(v)) else f"{v:.1f}"
med = lambda R, k: [r[k] for r in R if r.get(k) is not None]


def planted_table(lab, A, out):
    out.append(f"\n### {lab}\n")
    for src in ('NFL', 'ours'):
        R = [r for r in A if r['src'] == src and r['lab'] == lab]
        fnd = [r for r in R if r.get('found')]
        out.append(f"- {src}: {len(R)} routes, break found {len(fnd)} ({len(fnd) / max(1, len(R)):.0%}); not found, the track ends (cut p50 {q([r['cut'] for r in R if not r.get('found')], .5):.1f} s) or no turn of 35 deg+." if lab != 'HITCH' else
                   f"- {src}: {len(R)} routes, plant found {len(fnd)} ({len(fnd) / max(1, len(R)):.0%}).")
        if src == 'ours':
            c = collections.Counter(r['rid'] for r in R); out.append(f"  ours by route id: " + ', '.join(f"{k} {v}" for k, v in c.most_common()))
    out.append('')
    out.append('| band (break depth) | side | n | depth p25/p50/p75 | time p25/p50/p75 | speed in | lowest | +0.3 / +0.6 s | duration | turn deg | exit vs LOS deg | drift +0.5..1.5 s | release - break (targets, n) | speed at catch |')
    out.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for a, b in BANDS:
        bn = band(a if a > -9 else 0)
        for src in ('NFL', 'ours'):
            R = [r for r in A if r['src'] == src and r['lab'] == lab and r.get('found') and a <= r['depth'] < b]
            if len(R) < 5: continue
            T = [r['relmb'] for r in R if r.get('relmb') is not None]
            out.append(f"| {bn} | {src} | {len(R)} | {' / '.join(f1(q(med(R, 'depth'), p)) for p in (.25, .5, .75))} | {' / '.join(f1(q(med(R, 't'), p)) for p in (.25, .5, .75))} | "
                       f"{f1(q(med(R, 'vin'), .5))} | {f1(q(med(R, 'vmin'), .5))} | {f1(q(med(R, 'v3'), .5))} / {f1(q(med(R, 'v6'), .5))} | {f1(q(med(R, 'dur'), .5))} | "
                       f"{f1(q(med(R, 'turn'), .5))} | {f1(q(med(R, 'exit'), .5))} | {f1(q(med(R, 'drift'), .5))} | {f1(q(T, .5))} ({len(T)}) | {f1(q(med(R, 'vcatch'), .5))} |")
    out.append('')
    out.append('| split (all bands) | side | n | depth p50 | time p50 | lowest p50 | turn p50 |')
    out.append('|---|---|---|---|---|---|---|')
    for key, vals in (('cush', ('press', 'off', 'none')), ('lev', ('inside', 'head-up', 'outside'))):
        for v_ in vals:
            for src in ('NFL', 'ours'):
                R = [r for r in A if r['src'] == src and r['lab'] == lab and r.get('found') and r.get(key) == v_]
                if len(R) < 5: continue
                out.append(f"| {key} {v_} | {src} | {len(R)} | {f1(q(med(R, 'depth'), .5))} | {f1(q(med(R, 't'), .5))} | {f1(q(med(R, 'vmin'), .5))} | {f1(q(med(R, 'turn'), .5))} |")


def open_table(lab, A, out):
    out.append(f"\n### {lab} (no plant)\n")
    for src in ('NFL', 'ours'):
        R = [r for r in A if r['src'] == src and r['lab'] == lab]
        bd = [r for r in R if r.get('bend')]
        out.append(f"- {src}: {len(R)} routes; a bend of 20 deg+ found on {len(bd)} ({len(bd) / max(1, len(R)):.0%})")
        if src == 'ours':
            c = collections.Counter(r['rid'] for r in R); out.append(f"  ours by route id: " + ', '.join(f"{k} {v}" for k, v in c.most_common()))
    out.append('')
    out.append('| side | n | depth / width at 0.5 s | 1.0 s | 1.5 s | 2.0 s | 2.5 s | 3.0 s | bend depth p50 | bend time p50 | bend turn p50 | release (targets) p50 | speed at catch |')
    out.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for src in ('NFL', 'ours'):
        R = [r for r in A if r['src'] == src and r['lab'] == lab]
        if len(R) < 5: continue
        cells = []
        for j in range(6):
            P = [r['dw'][j] for r in R if r['dw'][j] is not None]
            cells.append(f"{f1(q([p[0] for p in P], .5))} / {f1(q([p[1] for p in P], .5))} ({len(P)})" if len(P) >= 5 else '-')
        B = [r for r in R if r.get('bend')]
        out.append(f"| {src} | {len(R)} | " + ' | '.join(cells) + f" | {f1(q(med(B, 'bdepth'), .5))} | {f1(q(med(B, 'bt'), .5))} | {f1(q(med(B, 'bturn'), .5))} | - | {f1(q(med(R, 'vcatch'), .5))} |")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    md = sys.argv[sys.argv.index('--md') + 1] if '--md' in sys.argv else None
    args = [a for a in args if a != md]
    A = []
    for a in args:
        lab, path = a.split('=', 1)
        for row in track_rows(path, lab == 'NFL'):
            r = analyse(row); r['src'] = 'NFL' if lab == 'NFL' else 'ours'; A.append(r)
    out = ['## Summary (family x break-depth band): break depth p50, break time p50, release - break p50 (targets), n NFL | ours\n',
           '| family | band | NFL depth | ours depth | NFL time | ours time | NFL release - break | ours release - break | n NFL | n ours |', '|---|---|---|---|---|---|---|---|---|---|']
    for lab in PLANTED:
        for a, b in BANDS:
            N = [r for r in A if r['src'] == 'NFL' and r['lab'] == lab and r.get('found') and a <= r['depth'] < b]
            O = [r for r in A if r['src'] == 'ours' and r['lab'] == lab and r.get('found') and a <= r['depth'] < b]
            if len(N) < 10 and len(O) < 10: continue
            tn, to = [r['relmb'] for r in N if r.get('relmb') is not None], [r['relmb'] for r in O if r.get('relmb') is not None]
            out.append(f"| {lab} | {band(a if a > -9 else 0)} | {f1(q(med(N, 'depth'), .5))} | {f1(q(med(O, 'depth'), .5))} | {f1(q(med(N, 't'), .5))} | {f1(q(med(O, 't'), .5))} | "
                       f"{f1(q(tn, .5))} ({len(tn)}) | {f1(q(to, .5))} ({len(to)}) | {len(N)} | {len(O)} |")
    for lab in PLANTED: planted_table(lab, A, out)
    for lab in OPEN: open_table(lab, A, out)
    text = '\n'.join(out) + '\n'
    if md: open(md, 'w').write(text)
    print(text)


if __name__ == '__main__':
    main()
