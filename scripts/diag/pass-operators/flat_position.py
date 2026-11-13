"""Where the defense is when the back catches the flat (same code on NFL trail_nfl.py records and sim trail-export.ts
COV=all records). Observation only; positions are true. Completions to a running back (players[target].group RB)
caught 4 yd or less past the line and 6 yd or more outside the ball (the flat), by shell: quarters (NFL Quarters /
Cover-6; sim cover4* / cover6* / split_quarters*), cover3 (Cover-3*; sim cover3* / cover9*), cover2 (Cover-2 / 2-Man
excluded; sim cover2 / tampa2). For the defender nearest the catch point at the catch, and separately for the
defender nearest the back 1.0 s before the catch: his position relative to the catcher at -1.0 / -0.5 / 0 s (lateral:
+ = outside the catcher, toward the sideline; depth: + = deeper than the catcher; distance), his group; how far the
back ran in the last 1.0 s; the second-nearest at the catch.
usage: python3 -I scripts/diag/pass-operators/flat_position.py name=a.jsonl.gz[,b] ..."""
import sys, gzip, json, math, collections as C


def shell(cov):
    t = (cov or '').lower().replace(' ', '').replace('-', '').replace('_', '')
    if t.startswith('cover6') or 'quarters' in t or t.startswith('cover4') or t.startswith('splitquarters'): return 'quarters'
    if t.startswith('cover3') or t.startswith('cover9'): return 'cover3'
    if t.startswith('cover2') or t.startswith('tampa2'): return 'cover2' if 'man' not in t else None
    return None


def q(v):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f'{v[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75))


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    R = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            p = json.loads(line)
            kc, t, xy = p.get('catch'), p['target'], p['xy']
            if kc is None or p['players'][t]['group'] != 'RB': continue
            sh = shell(p.get('coverage'))
            if not sh or kc - 10 < 0 or kc >= len(xy): continue
            pos = lambda i, k: (xy[k][2 * i], xy[k][2 * i + 1]) if 0 <= k < len(xy) and xy[k][2 * i] is not None else (None, None)
            cx, cy = pos(t, kc)
            if cx is None or cx > 4 or abs(cy - p['ball_y']) < 6: continue
            side = 1 if cy > p['ball_y'] else -1
            D = [i for i, pl in enumerate(p['players']) if pl['side'] == 'D']
            dist = lambda i, k, ref=t: math.hypot(pos(i, k)[0] - pos(ref, k)[0], pos(i, k)[1] - pos(ref, k)[1]) if pos(i, k)[0] is not None and pos(ref, k)[0] is not None else 99
            near_c = sorted(D, key=lambda i: dist(i, kc))
            near_e = min(D, key=lambda i: dist(i, kc - 10))
            rel = lambda i, k: ((pos(i, k)[1] - pos(t, k)[1]) * side, pos(i, k)[0] - pos(t, k)[0], dist(i, k)) if pos(i, k)[0] is not None and pos(t, k)[0] is not None else (None, None, None)
            bx, by = pos(t, kc - 10)
            R[sh].append(dict(nc=[rel(near_c[0], kc - k) for k in (10, 5, 0)], ne=[rel(near_e, kc - k) for k in (10, 5, 0)], g=p['players'][near_c[0]]['group'],
                              same=near_c[0] == near_e, second=dist(near_c[1], kc), ran=math.hypot(cx - bx, cy - by) if bx is not None else None, depth=cx, wide=abs(cy - p['ball_y']), tc=kc * p['dt'], tr=p['release'] * p['dt']))
    print(f'== {name}: the back\'s flat catches (<= 4 yd past the line, 6+ yd outside the ball); positions relative to the catcher (lateral + outside, depth + deeper; p25/p50/p75 yd)')
    for sh in ('quarters', 'cover3', 'cover2'):
        V = R[sh]
        if not V: continue
        gc = C.Counter(v['g'] for v in V)
        print(f'      release at {q([v["tr"] for v in V])} s after the snap, catch at {q([v["tc"] for v in V])} s; caught by 3.0 s {100 * sum(v["tc"] <= 3.0 for v in V) / len(V):.0f}%')
        print(f'   {sh:<9} n {len(V):3d} | catch depth {q([v["depth"] for v in V])}, width {q([v["wide"] for v in V])} | back ran {q([v["ran"] for v in V])} yd in the last 1.0 s | nearest at the catch: {", ".join(f"{k} {n}" for k, n in gc.most_common())}; also the nearest 1.0 s before: {100 * sum(v["same"] for v in V) / len(V):.0f}% | second nearest at the catch {q([v["second"] for v in V])}')
        for lab, key in (('nearest at the catch', 'nc'), ('nearest 1.0 s before', 'ne')):
            row = []
            for j, tt in enumerate(('-1.0', '-0.5', ' 0.0')):
                row.append(f'{tt} s lat {q([v[key][j][0] for v in V])} depth {q([v[key][j][1] for v in V])} dist {q([v[key][j][2] for v in V])}')
            print(f'      {lab:<21} ' + ' | '.join(row))
