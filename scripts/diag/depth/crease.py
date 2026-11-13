"""The crease on a designed run, one operator for NFL tracking and sim common
plays (the run-offense session's definition). At the first frame the ball
carrier is at the line: the nearest defensive lineman on each side of him,
the lateral width between them, and each one's lateral move since the snap
(+ = away from the carrier, i.e. washed out of the hole). By run family.
usage: crease.py FILE [FILE...]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'))
        if fam not in ('inside_zone', 'outside_zone', 'gap_pull', 'man_duo'): continue
        p = Play(raw); c = raw['carrier']
        k = next((k for k in range(p.frames) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 0), None)
        if k is None or k == 0: continue
        cy = p.pos(c, k)[1]
        dl = [d for d in p.who('D', 'DL') if p.pos(d, k)[0] is not None and p.pos(d, 0)[0] is not None]
        left = [d for d in dl if p.pos(d, k)[1] < cy]; right = [d for d in dl if p.pos(d, k)[1] >= cy]
        if not left or not right: continue
        L = max(left, key=lambda d: p.pos(d, k)[1]); R = min(right, key=lambda d: p.pos(d, k)[1])
        width = p.pos(R, k)[1] - p.pos(L, k)[1]
        moves = [p.pos(L, 0)[1] - p.pos(L, k)[1], p.pos(R, k)[1] - p.pos(R, 0)[1]]
        o = g.setdefault(fam, {'w': [], 'm': []}); o['w'].append(width); o['m'].extend(moves)
    print(path.split('/')[-1][:26])
    for fam, o in sorted(g.items()):
        print(f"  {fam:12s} n {len(o['w']):5d} | crease p25/p50/p75 {q(o['w'], .25)}/{q(o['w'])}/{q(o['w'], .75)} yd | DL lateral move since snap (+ away) p50 {q(o['m'])} p75 {q(o['m'], .75)}")
