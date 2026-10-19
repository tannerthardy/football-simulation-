"""Mesh geometry, one operator for NFL tracking and sim common plays: the
back's alignment relative to the QB at the snap, his position relative to the
QB at the handoff, the handoff time, the closest RB-QB distance before the
handoff, and, for backs that cross the QB's face (lateral side changes), how
far in front of the QB's centre he passes. x is upfield of the QB, y is
toward the side the back ends on. usage:
meshgeo.py FAMILY FILE [FILE2 ...] [--nfl-forms SHOTGUN] [--sim-form gun]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
fam = sys.argv[1]
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
F = json.load(open('out/mechanics/nfl-formation.json'))
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
WANT = tuple(opt('--nfl-forms', 'SINGLEBACK,I_FORM').split(','))
for path in [a for a in sys.argv[2:] if a.endswith('.gz')]:
    o = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None or CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
        if raw.get('source') != 'sim' and F.get(raw['id']) not in WANT: continue
        if raw.get('source') == 'sim' and opt('--sim-form') and not raw['id'].split('/')[2].startswith(opt('--sim-form')): continue
        p = Play(raw); c = raw['carrier']; h = (raw.get('events') or {}).get('handoff')
        if h is None or raw['players'][c]['group'] != 'RB': continue
        qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]; kh = p.k(h)
        if any(p.pos(i, k)[0] is None for i in (c, qb) for k in range(0, kh + 1)): continue
        side = math.copysign(1, p.pos(c, kh)[1] - p.pos(qb, kh)[1])
        rel = lambda k: ((p.pos(c, k)[0] - p.pos(qb, k)[0]), (p.pos(c, k)[1] - p.pos(qb, k)[1]) * side)
        sx, sy = rel(0); hx, hy = rel(kh)
        o.setdefault('t', []).append(h); o.setdefault('sx', []).append(sx); o.setdefault('sy', []).append(sy)
        o.setdefault('hx', []).append(hx); o.setdefault('hy', []).append(hy)
        o.setdefault('dmin', []).append(min(math.hypot(*rel(k)) for k in range(0, kh + 1)))
        if sy < -0.3:  # started on the far side: crosses the QB's face
            k = next((k for k in range(0, kh + 1) if rel(k)[1] >= 0), None)
            if k is not None: o.setdefault('cross', []).append(rel(k)[0])
    n = len(o.get('t', []))
    if not n: print(f"{path.split('/')[-1][:20]:20s} {fam}: n 0"); continue
    print(f"{path.split('/')[-1][:20]:20s} {fam}: n {n} | handoff t {q(o['t'])} s | snap rel QB x {q(o['sx'])} y {q(o['sy'])} | handoff rel QB x {q(o['hx'],.25)}/{q(o['hx'])}/{q(o['hx'],.75)} y {q(o['hy'])} | closest {q(o['dmin'])} | crosses face {100*len(o.get('cross', []))/n:.0f}%, passing x p25/50/75 {q(o.get('cross', []),.25)}/{q(o.get('cross', []))}/{q(o.get('cross', []),.75)}")
