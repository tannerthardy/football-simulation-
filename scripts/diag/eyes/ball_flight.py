"""QB lane, 2026-11-23 (Tools' catching read through Integration: our throws arrive hotter than the NFL's). Ball speed
like for like, NFL against ours: the HORIZONTAL speed of the ball from its 10 Hz positions (the NFL tracker is 2D, so
ours is taken from the same 2D track, not the sim's 3D speed), over the flight from pass_forward to pass_arrived:
  release  the first 0.2 s of the flight (frames 0 -> 2)
  mid      the 0.2 s around the flight's middle
  arrival  the 0.2 s ending one frame before pass_arrived
plus the flight time and the ball's travel (release point to arrival point). By air distance (the arrival point's
distance past the line of scrimmage: 0-5, 5-10, 10-20, 20-35, 35+ yd) and by throw type from the targeted receiver's
route: flat/screen, quick in-breaking (slant), in (in, dig, post), out-breaking (out, corner), stop (hitch, curl),
cross, vertical (go, seam).
What cannot be compared: apex height and the vertical component (the NFL track has no z); the sim's 3D speed at the
catch (Tools' 22.3 p50) includes the descending vertical component and is not this quantity.
usage: python3 -I ball_flight.py nfl [weeks]          (BDB 2025 raw tracking, data/raw/bdb2025)
       python3 -I ball_flight.py sim a.jsonl.gz,...   (sim exports with bxy)"""
import sys, csv, json, gzip, math, collections
q = lambda v, p=.5: (sorted(v)[int(p * (len(v) - 1))] if v else float('nan'))
NFLT = {'FLAT': 'flat/screen', 'SCREEN': 'flat/screen', 'SLANT': 'quick in', 'IN': 'in', 'POST': 'in', 'OUT': 'out', 'CORNER': 'out',
        'HITCH': 'stop', 'CROSS': 'cross', 'GO': 'vertical', 'ANGLE': 'flat/screen', 'WHEEL': 'vertical'}
SIMT = {'flat': 'flat/screen', 'back_flat': 'flat/screen', 'now_screen': 'flat/screen', 'tunnel': 'flat/screen', 'bubble': 'flat/screen', 'angle': 'flat/screen',
        'slant': 'quick in', 'short_in': 'quick in', 'dig': 'in', 'post': 'in', 'quick_out': 'out', 'out': 'out', 'corner': 'out', 'back_out': 'out',
        'hitch': 'stop', 'quick_hitch': 'stop', 'curl': 'stop', 'hook': 'stop', 'comeback': 'stop', 'stick': 'stop',
        'cross': 'cross', 'shallow': 'cross', 'shallow_high': 'cross', 'mesh_under': 'cross', 'go': 'vertical', 'seam': 'vertical'}
BANDS = [(0, 5), (5, 10), (10, 20), (20, 35), (35, 99)]


def flight(P, dt):
    """Speeds from a list of (x, y) ball points at dt over the flight (release .. arrival)."""
    n = len(P) - 1
    if n < 3: return None
    sp = lambda a, b: math.hypot(P[b][0] - P[a][0], P[b][1] - P[a][1]) / ((b - a) * dt)
    m = n // 2
    # Arrival ends one frame before pass_arrived: on that frame the ball is placed with the catcher (a jump in the sim track).
    return {'rel': sp(0, 2), 'mid': sp(max(0, m - 1), min(n, m + 1)), 'arr': sp(max(0, n - 3), n - 1), 'T': n * dt, 'travel': math.hypot(P[n][0] - P[0][0], P[n][1] - P[0][1])}


def nfl(weeks):
    D = 'data/raw/bdb2025/big-data-bowl-data/'
    plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(D + 'plays.csv'))}
    tgt = {}
    for r in csv.DictReader(open(D + 'player_play.csv')):
        if r['wasTargettedReceiver'] == '1': tgt[(r['gameId'], r['playId'])] = r['routeRan']
    rows = []
    for w in weeks:
        cur, ball, ev = None, [], {}
        def done():
            if not cur or 'pass_forward' not in ev or 'pass_arrived' not in ev: return
            p = plays.get(cur)
            if not p or not p['absoluteYardlineNumber']: return
            f0, f1 = ev['pass_forward'], ev['pass_arrived']
            P = [(x, y) for f, x, y, _d in ball if f0 <= f <= f1]
            fl = flight(P, 0.1)
            if not fl: return
            los = float(p['absoluteYardlineNumber']); dirn = 1 if ball and ball[0][3] == 'right' else -1
            air = (P[-1][0] - los) * dirn if dirn == 1 else (los - P[-1][0])
            fl.update(air=air, typ=NFLT.get(tgt.get(cur, ''), 'other'), result=p['passResult'])
            rows.append(fl)
        for r in csv.DictReader(open(D + f'tracking_week_{w}.csv')):
            if r['displayName'] != 'football': continue
            key = (r['gameId'], r['playId'])
            if key != cur:
                done(); cur, ball, ev = key, [], {}
            f = int(r['frameId']); ball.append((f, float(r['x']), float(r['y']), r['playDirection']))
            if r['event'] and r['event'] not in ev: ev[r['event']] = f
        done()
    return rows


def sim(paths):
    rows = []
    for path in paths:
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw)
            ev = raw['events']; b = raw.get('bxy')
            if raw.get('kind') != 'pass' or not b or ev.get('pass_forward') is None or ev.get('pass_arrived') is None: continue
            if (raw.get('labels') or {}).get('throwaway') or raw.get('target') is None: continue
            dt = raw['dt']; k0, k1 = int(round(ev['pass_forward'] / dt)), int(round(ev['pass_arrived'] / dt))
            P = [tuple(p) for p in b[k0:k1 + 1] if p and p[0] is not None]
            fl = flight(P, dt)
            if not fl: continue
            rid = str(raw['players'][raw['target']].get('route') or '').split(':')[-1]
            fl.update(air=P[-1][0], typ=SIMT.get(rid, 'other'), result=None)
            rows.append(fl)
    return rows


rows = nfl([int(w) for w in (sys.argv[2] if len(sys.argv) > 2 else '1,2,3').split(',')]) if sys.argv[1] == 'nfl' else sim(sys.argv[2].split(','))
print(f"== {sys.argv[1]} (passes with a flight {len(rows)})")
def line(label, R):
    if not R: return
    print(f"  {label:18s} n {len(R):5d} | horizontal ball speed p50 (p90) yd/s: release {q([r['rel'] for r in R]):.1f} ({q([r['rel'] for r in R], .9):.1f}), mid {q([r['mid'] for r in R]):.1f}, arrival {q([r['arr'] for r in R]):.1f} ({q([r['arr'] for r in R], .9):.1f}; over 24: {sum(r['arr'] > 24 for r in R) / len(R):.1%})"
          f" | flight p50 {q([r['T'] for r in R]):.2f} s over {q([r['travel'] for r in R]):.1f} yd (mean {q([r['travel'] / r['T'] for r in R]):.1f} yd/s)")
for lo, hi in BANDS: line(f"air {lo}-{hi if hi < 99 else ''} yd", [r for r in rows if lo <= r['air'] < hi])
line('air < 0 (behind)', [r for r in rows if r['air'] < 0])
for t in ('flat/screen', 'quick in', 'in', 'out', 'stop', 'cross', 'vertical', 'other'): line(t, [r for r in rows if r['typ'] == t])
