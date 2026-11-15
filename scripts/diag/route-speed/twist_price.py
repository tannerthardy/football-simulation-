# What does a twisted trunk cost a receiver on the move? BDB 2025 drop-backs, WR/TE route runners, 10 Hz.
# Twist = the angle between his shoulder orientation `o` (compass, pads) and his direction of travel `dir` (the nearest observable to his hips' heading): 0 is running square.
# For each moving frame (s >= 3 yd/s) from 0.5 s after the snap, in three phases:  held (ball not yet thrown), flight-target (ball in the air, he is the target), flight-other.
# Matched cells: route x time since the snap (0.5 s bins) x phase; within a cell the medians by twist bin (0-15 / 15-30 / 30-60 / 60+ deg) are compared to the square bin, and the
# cell-weighted average difference is reported, so route phase and speed regime are held fixed.
#   speed    his speed (yd/s, provider s)
#   wobble   his heading change per second, |d dir / dt| over +/-0.2 s (deg/s): how much the PATH bends
#   lat      lateral acceleration s * |d dir / dt| (yd/s^2)
#   python3 -I scripts/diag/route-speed/twist_price.py WEEK [WEEK ...]      (from the repo root)
import csv, sys, os, math, collections as C, statistics as st
STRAIGHT = float(os.environ.get('STRAIGHT', 0))   # >0: only frames whose path bends less than this (deg/s): a twist on a straight run, not a cut in progress
D = 'data/raw/bdb2025/big-data-bowl-data'
pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
play = {}
for r in csv.DictReader(open(f'{D}/plays.csv')):
    if r['isDropback'] in ('TRUE', 'True'): play[(r['gameId'], r['playId'])] = r['possessionTeam']
route = {}; target = {}
for r in csv.DictReader(open(f'{D}/player_play.csv')):
    k = (r['gameId'], r['playId'])
    if k not in play: continue
    if r['routeRan'] not in ('', 'NA') and r['wasRunningRoute'] in ('1', '1.0', 'TRUE', 'True'): route[(k, r['nflId'])] = r['routeRan']
    if r['wasTargettedReceiver'] in ('1', 'TRUE', 'True'): target[k] = r['nflId']
wrap = lambda a: (a + 180) % 360 - 180
BINS = ((0, 15), (15, 30), (30, 60), (60, 181))
cells = C.defaultdict(lambda: C.defaultdict(lambda: ([], [], [])))   # (route, tbin, phase) -> twistbin -> (speed, wobble, lat)
nfr = C.Counter(); TWV = C.defaultdict(list)
for w in sys.argv[1:]:
    tr = C.defaultdict(dict); ev = {}
    for r in csv.DictReader(open(f'{D}/tracking_week_{w}.csv')):
        k = (r['gameId'], r['playId'])
        if k not in play or r['displayName'] == 'football': continue
        f = int(r['frameId'])
        if r['event'] not in ('', 'NA'): ev.setdefault(k, {}).setdefault(r['event'], f)
        key = (k, r['nflId'])
        if key in route and r['o'] not in ('', 'NA') and r['dir'] not in ('', 'NA') and r['s'] not in ('', 'NA'):
            tr[key][f] = (float(r['s']), float(r['dir']), float(r['o']))
    for key, F in tr.items():
        k, i = key
        if pos.get(i) not in ('WR', 'TE') or k not in ev or 'ball_snap' not in ev[k]: continue
        s0 = ev[k]['ball_snap']; thrown = ev[k].get('pass_forward', 10 ** 9); arr = ev[k].get('pass_arrived', ev[k].get('pass_outcome_caught', 10 ** 9))
        for f in range(s0 + 5, min(s0 + 40, arr)):
            if f not in F or f - 2 not in F or f + 2 not in F: continue
            s, d, o = F[f]
            if s < 3.0: continue
            tw = abs(wrap(o - d)); wob = abs(wrap(F[f + 2][1] - F[f - 2][1])) / 0.4
            if STRAIGHT and wob > STRAIGHT: continue
            phase = 'held' if f < thrown else ('flight-target' if target.get(k) == i else 'flight-other')
            t = (f - s0) / 10; tb = round(int(t / 0.5) * 0.5, 1)
            TWV[phase].append(tw)
            tbin = next(j for j, (a, b) in enumerate(BINS) if a <= tw < b)
            c = cells[(route[key], tb, phase)][tbin]; c[0].append(s); c[1].append(wob); c[2].append(s * math.radians(wob)); nfr[(phase, tbin)] += 1
print('moving frames (s >= 3) by phase and twist bin:');
for ph in ('held', 'flight-target', 'flight-other'): print(f'  {ph:14s} ' + ' | '.join(f'{BINS[j][0]}-{BINS[j][1]}: {nfr[(ph, j)]}' for j in range(4)))
for ph in ('held', 'flight-target', 'flight-other'):
    v = sorted(TWV[ph]); q = lambda p: v[int(p * (len(v) - 1))] if v else float('nan')
    print(f'twist (|o - dir|) {ph:14s} p25 {q(.25):5.1f} p50 {q(.5):5.1f} p75 {q(.75):5.1f} p90 {q(.9):5.1f} deg, share >= 55: {sum(1 for x in v if x >= 55) / max(1, len(v)):.2f}, share >= 100: {sum(1 for x in v if x >= 100) / max(1, len(v)):.2f}')
MIN = 15
for ph in ('held', 'flight-target', 'flight-other'):
    print(f'\n== {ph}: matched on route x time (cells with >= {MIN} frames in both bins), difference from the square bin (0-15 deg)')
    for j in (1, 2, 3):
        acc = [[], [], [], []]   # weights, d speed, d wobble, d lat
        for (rt, tb, p), bins in cells.items():
            if p != ph or 0 not in bins or j not in bins or len(bins[0][0]) < MIN or len(bins[j][0]) < MIN: continue
            n = min(len(bins[0][0]), len(bins[j][0])); acc[0].append(n)
            acc[1].append(st.median(bins[j][0]) - st.median(bins[0][0])); acc[2].append(st.median(bins[j][1]) - st.median(bins[0][1])); acc[3].append(st.median(bins[j][2]) - st.median(bins[0][2]))
        if not acc[0]: print(f'  {BINS[j][0]}-{BINS[j][1]} deg: no matched cells'); continue
        wa = lambda v: sum(a * b for a, b in zip(v, acc[0])) / sum(acc[0])
        allsq = [x for (rt, tb, p), bins in cells.items() if p == ph for x in bins.get(0, ([], [], []))[0]]
        print(f'  {BINS[j][0]:>2}-{BINS[j][1]:<3} deg: {len(acc[0]):3d} cells, {sum(acc[0]):6d} frames | speed {wa(acc[1]):+5.2f} yd/s (square median {st.median(allsq):.2f}) | wobble {wa(acc[2]):+6.1f} deg/s | lateral accel {wa(acc[3]):+5.2f} yd/s^2')
