"""NFL (BDB 2026, 2023 season): where the ball lands against the targeted receiver's extrapolated release line and
against where he actually is at the arrival, by air distance and flight time. Input rows end at the release; the
output rows are the flight. usage: python3 -I nfl_deep_split.py <train dir> > rows.jsonl"""
import sys, csv, glob, os, math, json
d = sys.argv[1]
for inp in sorted(glob.glob(os.path.join(d, 'input_2023_w*.csv'))):
    out = inp.replace('input_', 'output_')
    last = {}; qb = {}; prev = {}
    for r in csv.DictReader(open(inp)):
        k = (r['game_id'], r['play_id'])
        if r['player_role'] == 'Targeted Receiver':
            if k in last: prev[k] = last[k]
            last[k] = r
        elif r['player_role'] == 'Passer': qb[k] = r
    arr = {}; trail = {}
    ids = {k: v['nfl_id'] for k, v in last.items()}
    for r in csv.DictReader(open(out)):
        k = (r['game_id'], r['play_id'])
        if ids.get(k) == r['nfl_id']:
            trail.setdefault(k, []).append((int(r['frame_id']), float(r['x']), float(r['y'])))
    for k, r in last.items():
        if k not in trail or k not in qb: continue
        t = sorted(trail[k]); n = int(r['num_frames_output']); T = n / 10
        x, y, s, dr = float(r['x']), float(r['y']), float(r['s']), math.radians(float(r['dir']))
        vx, vy = s * math.sin(dr), s * math.cos(dr)   # NGS dir: 0 = +y, clockwise
        bx, by = float(r['ball_land_x']), float(r['ball_land_y'])
        ex, ey = x + vx * T, y + vy * T
        ax, ay = t[-1][1], t[-1][2]
        sa = math.hypot(t[-1][1] - t[-3][1], t[-1][2] - t[-3][2]) / 0.2 if len(t) >= 3 else None
        q = qb[k]; air = math.hypot(bx - float(q['x']), by - float(q['y']))
        print(json.dumps(dict(T=T, air=air, s0=s, sa=sa, land_vs_line=math.hypot(bx - ex, by - ey), land_vs_arrival=math.hypot(bx - ax, by - ay),
                              rcv_off_line=math.hypot(ax - ex, ay - ey), qbs=float(q['s']))))
