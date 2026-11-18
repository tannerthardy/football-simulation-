#!/usr/bin/env python3
"""Is the NFL's lateral slide toward the throw a mix effect? (Coverage, 2026-11-18). Underneath zone LB/DB as
lane_position.py; lateral velocity toward the catch side at the release, split by the target's own lateral speed at the
release (sitting < 2, drifting 2-4, crossing / breaking out >= 4 yd/s), the QB's lateral displacement from the snap
to the release (pocket < 2 yd, moved >= 2 yd) and play action (NFL: plays.csv playAction, joined by gameId-playId;
sim: '+pa' or 'pa_' in the concept).

    python3 -I scripts/mechanics/slide_confound.py plays.jsonl.gz [--plays path/to/plays.csv] [...]
"""
import csv, gzip, json, math, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import coverage_family  # noqa: E402
from lane_position import seg, q, HALF  # noqa: E402


def main():
    pa = {}
    if '--plays' in sys.argv:
        with open(sys.argv[sys.argv.index('--plays') + 1], newline='') as fh:
            for r in csv.DictReader(fh):
                pa[f"{r['gameId']}-{r['playId']}"] = r.get('playAction', '').upper() == 'TRUE'
    for path in [a for a in sys.argv[1:] if a.endswith('.gz')]:
        cells = {}
        with gzip.open(path, 'rt') as fh:
            for line in fh:
                p = json.loads(line); ev = p.get('events', {})
                if p.get('kind') != 'pass' or p.get('target') is None or 'pass_forward' not in ev or 'pass_arrived' not in ev:
                    continue
                if coverage_family((p.get('cell') or {}).get('coverage')) != 'zone':
                    continue
                dt, xy, pl = p['dt'], p['xy'], p['players']; n = len(xy)
                fr, fa = round(ev['pass_forward'] / dt), round(ev['pass_arrived'] / dt)
                if fr - HALF < 0 or fr + HALF >= n or fa >= n:
                    continue
                pos = lambda f, i: (xy[f][2 * i], xy[f][2 * i + 1])
                vy = lambda f, i: (pos(f + HALF, i)[1] - pos(f - HALF, i)[1]) / (2 * HALF * dt)
                qbs = [i for i, x in enumerate(pl) if x['side'] == 'O' and x['group'] == 'QB']
                if not qbs:
                    continue
                qb, t = qbs[0], p['target']; Q, A = pos(fr, qb), pos(fa, t)
                tl = abs(vy(fr, t)); tcls = 'target sitting' if tl < 2 else 'target drifting' if tl < 4 else 'target crossing/breaking'
                moved = 'QB moved' if abs(pos(fr, qb)[1] - pos(0, qb)[1]) >= 2 else 'QB in pocket'
                if p.get('source') == 'sim':
                    isPa = '+pa' in str((p.get('cell') or {}).get('concept')) or str((p.get('cell') or {}).get('concept')).startswith('pa_')
                else:
                    isPa = pa.get(p['id'], None)
                pcls = 'PA' if isPa else 'no PA' if isPa is not None else 'PA ?'
                for i, x in enumerate(pl):
                    if x['side'] != 'D' or x['group'] not in ('LB', 'DB'):
                        continue
                    D = pos(fr, i)
                    if not (0 <= D[0] <= 12) or seg(D, Q, A)[0] > 8:
                        continue
                    lat = vy(fr, i) * (1 if A[1] >= D[1] else -1)
                    for key in ('all', tcls, moved, pcls, f'{tcls} | QB in pocket | no PA' if moved == 'QB in pocket' and pcls == 'no PA' else None):
                        if key:
                            cells.setdefault(key, []).append(lat)
        print(Path(path).name)
        for k in ('all', 'target sitting', 'target drifting', 'target crossing/breaking', 'QB in pocket', 'QB moved', 'no PA', 'PA',
                  'target sitting | QB in pocket | no PA', 'target drifting | QB in pocket | no PA', 'target crossing/breaking | QB in pocket | no PA'):
            v = cells.get(k, [])
            if v:
                print(f'  {k:46s} n {len(v):5d} | lateral toward the throw at the release {q(v)} yd/s')


if __name__ == '__main__':
    main()
