"""Receiver speed by time since the snap on a GO, NFL against the sim, by position and press / off. Rows from nfl_route_speed.py and route-speed-sim.mts (one operator: speed every 0.1 s from the snap to the throw;
press = a defender within 2 yd ahead and 1.5 yd across at the snap). Only receivers still pre-throw at that time are counted, so every column is the same survivor set for NFL and sim.
  python3 -I scripts/diag/body/go_speed_report.py NFL.json SIM.json [ROUTE=GO]"""
import json, sys, statistics as S
nfl = json.load(open(sys.argv[1])); sim = json.load(open(sys.argv[2])); R = sys.argv[3] if len(sys.argv) > 3 else 'GO'
TS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
def sel(rows, route, pos, press):
    out = []
    for r in rows:
        if r['route'].upper() != route: continue
        if pos is not None and r['pos'] not in pos: continue
        if press is not None and r['press'] != press: continue
        out.append(r)
    return out
def q(v, p): v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))]
def row(name, rows):
    cells = []
    for t in TS:
        k = int(round(t * 10)); v = [r['s'][k] for r in rows if len(r['s']) > k and r['s'][k] == r['s'][k] and r['kt'] >= k]
        cells.append(f'{S.median(v):5.2f}' if len(v) >= 15 else '   . ')
    print(f'  {name:22s} n {len(rows):5d}  ' + ' '.join(cells))
print(f'speed (yd/s, median) by time since the snap on {R}: ' + ' '.join(f'{t:4.1f}s' for t in TS))
for lab, rows in (('NFL', nfl), ('sim', sim)):
    print(lab)
    for pn, pos in (('WR', {'WR'}), ('TE', {'TE'}), ('RB/FB', {'RB', 'FB'}), ('all', None)):
        for pr, prn in ((None, 'any'), (True, 'press'), (False, 'off')):
            sub = sel(rows, R, pos, pr)
            if len(sub) >= 15: row(f'{pn} {prn}', sub)
