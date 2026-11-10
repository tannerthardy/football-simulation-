"""Standing starts by position (Integration, 2026-11-10: WR/TE start fast, DL slow -- one law or two?). Same code on NFL
(out/mechanics/nfl-plays.jsonl.gz, pass plays) and the sim's pass-frames.mts records; 0.1 s frames from the snap. Per
player, samples before the throw: displacement from his snap spot at 0.3 / 0.5 / 1.0 / 1.5 s; his start (first frame
displaced 0.25 yd); displacement 0.3 / 0.5 / 0.8 s after his own start (acceleration with reaction removed); speed at
1.0 s; and the share of players with an opponent within 1.0 yd before 0.5 s (contact, which caps a DL's travel).
'clean' rows keep only players with no opponent within 1.0 yd before start + 0.8 s.
usage: python3 -I start.py <nfl.jsonl.gz | sim pass-frames jsonl> [...]"""
import sys, os, json, gzip, math, statistics as st, collections as C
SIM = {'X': 'WR', 'Z': 'WR', 'W': 'WR', 'SL': 'WR', 'Y': 'TE', 'H': 'TE', 'RB': 'RB', 'FB': 'RB'}
def grp(q):
    g = q['group']
    if g in ('WR', 'TE', 'RB', 'DL', 'LB', 'DB', 'OL', 'QB'):
        return g
    if g in SIM:
        return SIM[g]
    if g.startswith('LB'):
        return 'LB'
    if g[:2] in ('CB', 'NB', 'FS', 'SS', 'S_'):
        return 'DB'
    return None
med = lambda a: round(st.median(a), 2) if a else float('nan')
for path in sys.argv[1:]:
    op = gzip.open if path.endswith('.gz') else open
    R = C.defaultdict(lambda: C.defaultdict(list))
    for l in op(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') != 'pass':
            continue
        X, pl = p['xy'], p['players']
        thr = p['events'].get('pass_forward'); end = len(X) if thr is None else min(len(X), int(round(thr / 0.1)))
        if end < 16:
            continue
        side = [q['side'] for q in pl]
        for i, q in enumerate(pl):
            g = grp(q)
            if g not in ('WR', 'TE', 'RB', 'DL', 'LB', 'DB', 'OL'):
                continue
            x0, y0 = X[0][2 * i], X[0][2 * i + 1]
            disp = lambda f: math.hypot(X[f][2 * i] - x0, X[f][2 * i + 1] - y0)
            opp = [j for j in range(len(pl)) if side[j] != side[i]]
            near = lambda f: min(math.hypot(X[f][2 * i] - X[f][2 * j], X[f][2 * i + 1] - X[f][2 * j + 1]) for j in opp)
            s = next((f for f in range(1, end) if disp(f) >= 0.25), None)
            r = R[g]
            for t in (3, 5, 10, 15):
                if t < end:
                    r[f'd{t}'].append(disp(t))
            r['contact05'].append(1 if any(near(f) <= 1.0 for f in range(0, min(6, end))) else 0)
            if s is None:
                continue
            r['start'].append(s * 0.1)
            if 11 < end:
                r['v10'].append(math.hypot(X[11][2 * i] - X[9][2 * i], X[11][2 * i + 1] - X[9][2 * i + 1]) / 0.2)
            clean = s + 8 < end and all(near(f) > 1.0 for f in range(0, s + 9))
            for k in (3, 5, 8):
                if s + k < end:
                    d = math.hypot(X[s + k][2 * i] - X[s][2 * i], X[s + k][2 * i + 1] - X[s][2 * i + 1])
                    r[f'a{k}'].append(d)
                    if clean:
                        r[f'c{k}'].append(d)
    print(f"== {os.path.basename(path)}")
    for g in ('WR', 'TE', 'RB', 'OL', 'DL', 'LB', 'DB'):
        r = R[g]
        if not r['d5']:
            continue
        print(f"   {g:2s} n {len(r['d5']):6d} | disp 0.3/0.5/1.0/1.5 s {med(r['d3'])} {med(r['d5'])} {med(r['d10'])} {med(r['d15'])} | start p50 {med(r['start'])} s | "
              f"after own start +0.3/+0.5/+0.8 {med(r['a3'])} {med(r['a5'])} {med(r['a8'])} (clean n {len(r['c8'])}: {med(r['c3'])} {med(r['c5'])} {med(r['c8'])}) | v1.0 {med(r['v10'])} | contact by 0.5 s {sum(r['contact05']) / len(r['contact05']):.0%}")
