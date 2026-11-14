"""Yards after the catch by catch depth, and yards a run, on common-format plays (NFL or sim; same code).
usage: python3 -I scripts/diag/receivers/yac.py A.jsonl.gz [B.jsonl.gz ...]
YAC = play yards - the catcher's x at the catch frame (x is yards past the line). Short = caught 0-10 yd."""
import gzip, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    yac = {'<0': [], '0-10': [], '10-20': [], '20+': []}; runs = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') == 'run':
            if raw.get('yards') is not None: runs.append(min(raw['yards'], 20))
            continue
        ev = raw.get('events') or {}
        if 'catch' not in ev or raw.get('yards') is None: continue
        p = Play(raw); r = raw.get('receiver', raw.get('target'))
        if r is None: continue
        x, _ = p.pos(r, min(p.k(ev['catch']), p.frames - 1))
        if x is None: continue
        b = '<0' if x < 0 else '0-10' if x < 10 else '10-20' if x < 20 else '20+'
        yac[b].append(raw['yards'] - x)
    print(f"== {os.path.basename(path)}: runs {len(runs)} mean (cap 20) {sum(runs)/max(1,len(runs)):.2f}")
    for b, v in yac.items():
        if v: print(f"   caught {b:5s} n {len(v):4d} YAC mean {sum(v)/len(v):5.2f} p50 {q(v):5.2f} p75 {q(v,.75):5.2f}")
