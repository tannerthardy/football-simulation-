"""Linebacker "bite" (Eager & Seth, JQAS 2023, doi:10.1515/jqas-2022-0091): how
far second-level defenders (2-7 yd deep, within 6.5 yd of the ball at the
snap) move toward the line by 0.5/1.0/1.5/2.0 s. NFL plays are split into runs,
play-action passes and other dropbacks (plays.csv playAction); sim lab files
contain runs only. Median and quartiles of (depth at snap - depth at t), yd.
usage: bite.py FILE [--ytg60] [--plays data/raw/bdb2025/big-data-bowl-data/plays.csv]"""
import csv, gzip, json, sys
sys.path.insert(0, 'scripts/mechanics'); sys.path.insert(0, 'scripts/diag/trench')
from metrics import Play  # noqa: E402
from timeline import second_level  # noqa: E402
path = sys.argv[1]
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
pa = {}
try:
    for r in csv.DictReader(open(opt('--plays', 'data/raw/bdb2025/big-data-bowl-data/plays.csv'), newline='')):
        pa[f"{r['gameId']}-{r['playId']}"] = r['playAction'] == 'TRUE'
except FileNotFoundError:
    pass
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    kind = 'run' if raw.get('kind') == 'run' else 'pa' if pa.get(raw['id']) else 'dropback' if raw.get('kind') == 'pass' else None
    if kind is None: continue
    p = Play(raw)
    for i in second_level(p):
        x0 = p.pos(i, 0)[0]
        for t in (.5, 1.0, 1.5, 2.0):
            if not p.live(t): continue
            x = p.pos(i, p.k(t))[0]
            if x is not None: o.setdefault((kind, t), []).append(x0 - x)
print(path.split('/')[-1])
for kind in ('run', 'pa', 'dropback'):
    if (kind, .5) not in o: continue
    print(f"  {kind:8s} " + ' | '.join(f"{t}s bite p25/50/75 {q(o[(kind, t)], .25)}/{q(o[(kind, t)])}/{q(o[(kind, t)], .75)} (n {len(o[(kind, t)])})"
                                    for t in (.5, 1.0, 1.5, 2.0) if (kind, t) in o))
