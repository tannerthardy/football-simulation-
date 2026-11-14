"""Does the targeted receiver run on an expectation? (BDB 2026, read in place.) Deep targets (pass_length >= 20 or
route GO / POST). For the targeted receiver through the flight (output x,y at 10 Hz): the first time his position
leaves the line his release velocity pointed along by more than 0.5 / 1.0 yd, and the first time his speed (over 0.2 s)
drops 0.5 yd/s below its running maximum since the release, each as a fraction of the flight time; "never" counted.
By flight bin. Same operator as scripts/diag/risk/rcv-prior.ts.
usage: python3 -I rcv_prior_nfl.py ARCHIVE.zip [weeks=1-18]"""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); P = '114239_nfl_competition_files_published_analytics_final/'
wa = [a for a in sys.argv[2:] if a.startswith('weeks=')]
lo, hi = (int(x) for x in (wa[0].split('=')[1] if wa else '1-18').split('-'))
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(P + n), encoding='utf-8'))
sup = set()
for r in rd('supplementary_data.csv'):
    try: L = float(r['pass_length'])
    except ValueError: L = -1
    if (L >= 20 or r['route_of_targeted_receiver'] in ('GO', 'POST')) and r['play_nullified_by_penalty'] != 'Y':
        sup.add((r['game_id'], r['play_id']))
rows = []
for w in range(lo, hi + 1):
    last = {}
    for r in rd(f'train/input_2023_w{w:02d}.csv'):
        k = (r['game_id'], r['play_id'])
        if k not in sup or r['player_role'] != 'Targeted Receiver': continue
        if k not in last or int(r['frame_id']) > int(last[k]['frame_id']): last[k] = r
    out = C.defaultdict(dict)
    for r in rd(f'train/output_2023_w{w:02d}.csv'):
        k = (r['game_id'], r['play_id'])
        if k in last and r['nfl_id'] == last[k]['nfl_id']: out[k][int(r['frame_id'])] = (float(r['x']), float(r['y']))
    for k, tf in last.items():
        O = out.get(k, {}); n = max(O) if O else 0
        if n < 6: continue
        x0, y0 = float(tf['x']), float(tf['y']); th = math.radians(float(tf['dir'])); ux, uy = math.sin(th), math.cos(th)
        s0 = float(tf['s'])
        dev = {}
        for d in (0.5, 1.0):
            dev[d] = next((f / n for f in range(1, n + 1) if f in O and abs((O[f][0] - x0) * uy - (O[f][1] - y0) * ux) > d), None)
        top, slow = s0, None
        for f in range(2, n + 1):
            if f not in O or f - 2 not in O and f != 2: continue
            a = O[f - 2] if f - 2 in O else (x0, y0)
            sp = math.hypot(O[f][0] - a[0], O[f][1] - a[1]) / 0.2
            top = max(top, sp)
            if sp < top - 0.5: slow = f / n; break
        rows.append(dict(fl=n / 10, d05=dev[0.5], d10=dev[1.0], slow=slow))
    print(f'week {w}: {len(rows)}', file=sys.stderr)
def q(v):
    v = sorted(x for x in v if x is not None)
    return '-' if len(v) < 5 else '/'.join(f'{v[int(f * (len(v) - 1))]:.2f}' for f in (.25, .5, .75))
print(f'== NFL BDB 2026 deep targets: when the targeted receiver leaves his release line / first slows, as a fraction of the flight, n {len(rows)}')
for a, b in ((0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 9)):
    V = [r for r in rows if a <= r['fl'] < b]
    if not V: continue
    nv = lambda key: sum(r[key] is None for r in V)
    print(f'   flight {a}-{b if b < 9 else "+"} s n {len(V):4d} | off the line by 0.5 yd at {q([r["d05"] for r in V])} (never {nv("d05")}) | by 1.0 yd at {q([r["d10"] for r in V])} (never {nv("d10")}) | first slows 0.5 yd/s at {q([r["slow"] for r in V])} (never {nv("slow")})')
