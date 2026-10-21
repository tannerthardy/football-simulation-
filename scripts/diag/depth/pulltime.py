"""Puller departure timing on gap runs, one operator for NFL tracking and sim
common plays: the lineman who moves furthest toward the play side while behind
the line by 2.0 s; when he is first 1 / 2 / 3 yd lateral from his stance, and
his lateral speed then. usage: pulltime.py FILE [--ytg60] [--family gap_pull]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
from timeline import play_side  # noqa: E402
path = sys.argv[1]
fam = sys.argv[sys.argv.index('--family') + 1] if '--family' in sys.argv else 'gap_pull'
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); s = play_side(p)
    if s is None or not p.live(2.0): continue
    k2 = p.k(2.0)
    best, far = None, 0
    for i in p.who('O', 'OL'):
        (x0, y0), (x, y) = p.pos(i, 0), p.pos(i, k2)
        if None in (x0, x) or x > 0: continue
        if (y - y0) * s > far: best, far = i, (y - y0) * s
    if best is None or far < 3: o.setdefault('none', []).append(1); continue
    o.setdefault('n', []).append(1)
    y0 = p.pos(best, 0)[1]
    for d in (1, 2, 3):
        k = next((k for k in range(k2 + 1) if p.pos(best, k)[1] is not None and (p.pos(best, k)[1] - y0) * s >= d), None)
        if k is not None:
            o.setdefault(f't{d}', []).append(k * p.dt)
            a, b = max(0, k - 2), min(p.frames - 1, k + 2)
            o.setdefault(f'v{d}', []).append((p.pos(best, b)[1] - p.pos(best, a)[1]) * s / ((b - a) * p.dt))
print(f"{path.split('/')[-1][:24]:24s} {fam}: runs with a puller {len(o.get('n', []))}, without {len(o.get('none', []))}")
print('  ' + ' | '.join(f"{d} yd at t p25/50/75 {q(o.get(f't{d}', []), .25)}/{q(o.get(f't{d}', []))}/{q(o.get(f't{d}', []), .75)} s, lateral {q(o.get(f'v{d}', []))} yd/s" for d in (1, 2, 3)))
