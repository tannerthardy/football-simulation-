"""Pass rushers' start on a throw, NFL vs ours, one operator on positions (open-census play format; completions with the release frame `rel` and the catch frame `catch`).
  python3 -I scripts/diag/pursuit/rusher_start.py NFLCATCH.jsonl.gz DATA_DIR [LABEL=sim1.jsonl.gz,...] [--out report.md]
Rushers: NFL = `wasInitialPassRusher` in player_play.csv (PFF's initial pass rusher; this release has no pff_role); sim = the defenders whose behaviour is `rush` at the release (the export's def.rel).
P = the catcher's position at the catch frame. c(f) = v(f) . unit(P - rusher(f)), v = the 0.2 s centred displacement. Turn = the first frame f from the release with c(f) >= 1.5 yd/s held on 2 consecutive frames (f, f+1); turn time = f - release
(0 if already there); never = none by the earlier of release + 2.5 s and catch + 0.5 s (a throw in the air less than 0.5 s is left out). Distance = rusher to P at the release (0-5 / 5-10 / 10-15 / 15+ yd).
Lineman alongside at the release = a non-route offensive player (OL, TE, back or receiver; not the catcher, not the QB) within 1.5 yd (centres) on at least 4 of the 5 frames release-3 .. release+1 (the inferred rule of catch_closing.py, at the release frame).
Also c at the release and at +0.5 / +1.0 s (median) and the air time (catch - release)."""
import gzip, json, sys, math, csv
import numpy as np
argv = sys.argv[1:]
def opt(n):
    if n in argv:
        i = argv.index(n); v = argv[i + 1]; del argv[i:i + 2]; return v
OUT = opt('--out')
pos = [a for a in argv if '=' not in a]; nfl, DATA = pos[0], pos[1]
sims = {a.split('=', 1)[0]: a.split('=', 1)[1].split(',') for a in argv if '=' in a}
rusher = {}
for r in csv.DictReader(open(DATA + '/player_play.csv')):
    if r['wasInitialPassRusher'] == '1': rusher[(r['gameId'], r['playId'], r['nflId'])] = True
DB = [(0, 5, '0-5'), (5, 10, '5-10'), (10, 15, '10-15'), (15, 99, '15+')]
def rows_of(paths, src):
    rows = []; air = []; plays = 0; nr = 0
    for path in paths:
        for l in gzip.open(path, 'rt'):
            p = json.loads(l); c, rel, r = p.get('catch'), p.get('rel'), p.get('recv')
            if c is None or rel is None or r is None or r < 0 or c - rel < 5: continue
            X = np.array(p['x']); Y = np.array(p['y']); nf = X.shape[1]
            end = min(rel + 25, c + 5)
            if end + 2 >= nf or rel < 4: continue
            plays += 1; air.append((c - rel) / 10.0)
            if src == 'NFL':
                gid, pid = p['id'].split('-'); R = [i for i, q in enumerate(p['players']) if q['side'] == 'D' and rusher.get((gid, pid, q['id']))]
            else:
                dl = [i for i, q in enumerate(p['players']) if q['side'] == 'D']; seats = (p.get('def') or {}).get('rel') or []
                R = [dl[k] for k, s in enumerate(seats) if k < len(dl) and s.get('kind') == 'rush']
            for i in R:
                nr += 1
                Px, Py = X[r, c], Y[r, c]
                def cl(f):
                    a, b = max(0, f - 1), min(nf - 1, f + 1)
                    vx, vy = (X[i, b] - X[i, a]) / ((b - a) / 10.0), (Y[i, b] - Y[i, a]) / ((b - a) / 10.0)
                    dx, dy = Px - X[i, f], Py - Y[i, f]; n = math.hypot(dx, dy) or 1e-9
                    return (vx * dx + vy * dy) / n
                cs = [cl(f) for f in range(rel, end + 2)]
                turn = next((k / 10.0 for k in range(0, end - rel + 1) if cs[k] >= 1.5 and cs[k + 1] >= 1.5), None)
                d0 = math.hypot(X[i, rel] - Px, Y[i, rel] - Py)
                blk = [j for j, o in enumerate(p['players']) if o['side'] == 'O' and j != r and o['pos'] != 'QB' and not o.get('route')]
                along = any(sum(1 for f in range(rel - 3, rel + 2) if math.hypot(X[i, f] - X[j, f], Y[i, f] - Y[j, f]) <= 1.5) >= 4 for j in blk)
                rows.append(dict(src=src, id=p.get('id'), d0=d0, turn=turn, c0=cs[0], c5=cl(rel + 5) if rel + 5 < nf else float('nan'), c10=cl(rel + 10) if rel + 10 < nf else float('nan'), along=along))
    return rows, air, plays, nr
data = {'NFL': rows_of([nfl], 'NFL')}
for lab, ps in sims.items():
    rs, ai, pl, nr = [], [], 0, 0
    for pth in ps:
        a, b, c_, d_ = rows_of([pth], lab); rs += a; ai += b; pl += c_; nr += d_
    data[lab] = (rs, ai, pl, nr)
q = lambda v, k: float(np.nanpercentile(v, k)) if len(v) else float('nan')
lines = []; P = lambda s='': lines.append(s)
P('## Pass rushers\' start on a throw (completions; turn = velocity toward the catch point at 1.5 yd/s or more on 2 frames from the release)\n')
P('Completions used: ' + '; '.join(f'{k} {v[2]}' for k, v in data.items()) + '. Rushers: ' + '; '.join(f'{k} {v[3]}' for k, v in data.items()) + '. Air time p25 / p50 / p75 (s): ' + '; '.join(f'{k} {q(v[1], 25):.1f} / {q(v[1], 50):.1f} / {q(v[1], 75):.1f}' for k, v in data.items()) + '.\n')
def table(title, sel):
    P(f'### {title}\n'); P('| sample | group | distance to P at the release (yd) | n | turn time p25 / p50 / p75 (s) | never | c at the release p50 | c at +0.5 s p50 | c at +1.0 s p50 |'); P('|---|---|---|---|---|---|---|---|---|')
    for lab, (R, *_ ) in data.items():
        for g, gf in sel:
            for lo, hi, bn in DB + [(0, 99, 'all')]:
                S = [r for r in R if gf(r) and lo <= r['d0'] < hi]
                if len(S) < 10: continue
                tt = [r['turn'] for r in S if r['turn'] is not None]
                P(f'| {lab} | {g} | {bn} | {len(S)} | {q(tt, 25):.1f} / {q(tt, 50):.1f} / {q(tt, 75):.1f} | {1 - len(tt) / len(S):.2f} | {q([r["c0"] for r in S], 50):.1f} | {q([r["c5"] for r in S], 50):.1f} | {q([r["c10"] for r in S], 50):.1f} |')
    P('')
table('All rushers', [('all', lambda r: True)])
table('Lineman alongside at the release against free', [('alongside', lambda r: r['along']), ('free', lambda r: not r['along'])])
txt = '\n'.join(lines)
if OUT: open(OUT, 'w').write(txt)
print(txt)
