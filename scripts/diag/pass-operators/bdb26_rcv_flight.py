"""The targeted receiver through the ball's flight (BDB 2026, read in place from the archive zip). Deep targets:
pass_length >= 20 air yards, or route_of_targeted_receiver GO / POST. For the targeted receiver: his speed at the
release (input's last frame s), mid-flight and at the arrival (differenced from the output x,y at 10 Hz, over 0.2 s);
how far his arrival spot lies off the line his release velocity pointed along (path deviation); the nearest coverage
defender at the release and at the arrival (separation change); his distance to the ball's landing point at the arrival;
by flight (num_frames_output / 10) bin. Also the nearest defender's own speed at the release and at the arrival.
usage: python3 -I scripts/diag/pass-operators/bdb26_rcv_flight.py ARCHIVE.zip [weeks=1-18]"""
import sys, csv, io, math, zipfile, collections as C
z = zipfile.ZipFile(sys.argv[1]); P = '114239_nfl_competition_files_published_analytics_final/'
wa = [a for a in sys.argv[2:] if a.startswith('weeks=')]
lo, hi = (int(x) for x in (wa[0].split('=')[1] if wa else '1-18').split('-'))
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(P + n), encoding='utf-8'))
sup = {}
for r in rd('supplementary_data.csv'):
    try: L = float(r['pass_length'])
    except ValueError: L = -1
    if (L >= 20 or r['route_of_targeted_receiver'] in ('GO', 'POST')) and r['play_nullified_by_penalty'] != 'Y':
        sup[(r['game_id'], r['play_id'])] = dict(res=r['pass_result'], route=r['route_of_targeted_receiver'], cov=r['team_coverage_man_zone'])
rows = []
for w in range(lo, hi + 1):
    inp = C.defaultdict(lambda: C.defaultdict(list)); meta = {}
    for r in rd(f'train/input_2023_w{w:02d}.csv'):
        k = (r['game_id'], r['play_id'])
        if k not in sup: continue
        inp[k][r['nfl_id']].append(r)
        meta[k] = (float(r['ball_land_x']), float(r['ball_land_y']), int(r['num_frames_output']))
    out = C.defaultdict(lambda: C.defaultdict(dict))
    for r in rd(f'train/output_2023_w{w:02d}.csv'):
        k = (r['game_id'], r['play_id'])
        if k in inp: out[k][r['nfl_id']][int(r['frame_id'])] = (float(r['x']), float(r['y']))
    for k, players in inp.items():
        last = {pid: max(fr, key=lambda f: int(f['frame_id'])) for pid, fr in players.items()}
        tgt = [pid for pid, f in last.items() if f['player_role'] == 'Targeted Receiver']
        if not tgt or tgt[0] not in out[k]: continue
        t = tgt[0]; tf = last[t]; O = out[k][t]; n = max(O) if O else 0
        if n < 4: continue
        lx, ly, nfo = meta[k]
        def spd(path, f): return math.hypot(path[f][0] - path[f - 2][0], path[f][1] - path[f - 2][1]) / 0.2 if f - 2 in path and f in path else None
        s0 = float(tf['s']); x0, y0 = float(tf['x']), float(tf['y'])
        th = math.radians(float(tf['dir'])); ux, uy = math.sin(th), math.cos(th)
        xa, ya = O[n]
        dx, dy = xa - x0, ya - y0
        dev = abs(dx * uy - dy * ux)  # perpendicular distance from the release-velocity line
        D = [pid for pid, f in last.items() if f['player_role'] == 'Defensive Coverage']
        def near(fr_xy):
            best = None
            for d in D:
                p = fr_xy(d)
                if p is None: continue
                dd = math.hypot(p[0] - fr_xy(t)[0], p[1] - fr_xy(t)[1])
                if best is None or dd < best[0]: best = (dd, d)
            return best
        at0 = lambda pid: (float(last[pid]['x']), float(last[pid]['y']))
        atA = lambda pid: out[k][pid].get(n) if pid in out[k] else None
        n0 = near(at0); nA = near(atA) if atA(t) else None
        dsA = spd(out[k][n0[1]], n) if n0 and n0[1] in out[k] else None
        rows.append(dict(fl=n / 10, s0=s0, sm=spd(O, max(2, n // 2)), sA=spd(O, n), dev=dev, sep0=n0[0] if n0 else None, sepA=nA[0] if nA else None,
                         land=math.hypot(xa - lx, ya - ly), ds0=float(last[n0[1]]['s']) if n0 else None, dsA=dsA, res=sup[k]['res'], cov=sup[k]['cov']))
    print(f'week {w}: {len(rows)}', file=sys.stderr)
q = lambda v: '/'.join(f'{sorted(v)[int(f * (len(v) - 1))]:.1f}' for f in (.25, .5, .75)) if len([x for x in v if x is not None]) >= 5 else '-'
qq = lambda v: q([x for x in v if x is not None])
print(f'== NFL BDB 2026 deep targets (20+ air yd or GO / POST): the targeted receiver through the flight, n {len(rows)}')
for a, b in ((0, 1.5), (1.5, 2.0), (2.0, 2.5), (2.5, 9)):
    V = [r for r in rows if a <= r['fl'] < b]
    if V: print(f'   flight {a}-{b if b < 9 else "+"} s n {len(V):4d} | rcv speed release {qq([r["s0"] for r in V])} -> mid {qq([r["sm"] for r in V])} -> arrival {qq([r["sA"] for r in V])} yd/s | off his release line {qq([r["dev"] for r in V])} yd | to the landing {qq([r["land"] for r in V])} | sep release {qq([r["sep0"] for r in V])} -> arrival {qq([r["sepA"] for r in V])} | nearest def speed {qq([r["ds0"] for r in V])} -> {qq([r["dsA"] for r in V])} | complete {100 * sum(r["res"] == "C" for r in V) / len(V):.0f}%')
