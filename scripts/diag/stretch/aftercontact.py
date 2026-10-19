"""Final gain by where the runner was first contacted, one operator for NFL
and sim common plays (events.first_contact; NFL60 filter with --ytg60 for
NFL). Bands of yards before contact; within each, the share of runs and the
final gain p25/p50/p75 and share gaining 4+.
usage: aftercontact.py FILE.jsonl.gz [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
B = [(-99, -2), (-2, -1), (-1, 0), (0, 1), (1, 2), (2, 4), (4, 99)]
rows = {b: [] for b in B}; n = 0
for line in gzip.open(sys.argv[1], 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and ytg.get(raw['id'], 0) < 60: continue
    fc = (raw.get('events') or {}).get('first_contact')
    if fc is None: continue
    p = Play(raw); x = p.pos(raw['carrier'], p.k(fc))[0]
    if x is None: continue
    n += 1
    for b in B:
        if b[0] <= x < b[1]: rows[b].append(raw['yards'])
print(sys.argv[1].split('/')[-1], 'runs with first contact', n)
for b, g in rows.items():
    if g: print(f"  contact at [{b[0]:3d},{b[1]:3d}) {100*len(g)/n:4.1f}% of runs | final p25/50/75 {q(g,.25)}/{q(g,.5)}/{q(g,.75)} | 4+ {100*sum(y>=4 for y in g)/len(g):3.0f}%  <1 {100*sum(y<1 for y in g)/len(g):3.0f}%")
