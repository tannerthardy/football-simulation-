# Pools nfl_go_speed.py / sim_go_speed.ts rows (same JSON shape) and prints speed by time since the snap (0.25 s bins) and the distance at 1 / 2 / 3 s.
#   python3 -I scripts/diag/route-speed/go_speed_report.py name=A.json [name=B.json ...]
import sys, json, statistics as st
def q(v, p): v = sorted(v); return v[min(len(v) - 1, int(p * (len(v) - 1) + 0.5))] if v else float('nan')
for a in sys.argv[1:]:
    name, path = a.split('=', 1); R = json.load(open(path))
    for g in ('WR', 'TE/RB'):
        for free in (True, None):
            S = [r for r in R if r['g'] == g and (free is None or r['free'] == free)]
            if len(S) < 8: continue
            print(f'== {name} {g} {"free releases" if free else "all releases"}: n {len(S)}')
            cells = []
            for b in range(16):
                lo = b * 0.25; v = [s for r in S for t, s in r['series'] if lo - 1e-9 <= t < lo + 0.25 - 1e-9]
                cells.append(f'{lo + 0.125:4.2f}s {q(v, .5):4.1f}/{q(v, .9):4.1f}' if len(v) >= 12 else f'{lo + 0.125:4.2f}s   -  ')
            print('  median/top-decile speed (yd/s) by time since the snap: ' + ' | '.join(cells[:8])); print('                                                       ' + ' | '.join(cells[8:]))
            print('  distance from the snap at 1 / 2 / 3 s (median): ' + ' / '.join(f'{q([r["dist"][k] for r in S if k in r["dist"]], .5):.2f} (n {sum(1 for r in S if k in r["dist"])})' for k in ('1', '2', '3')))
