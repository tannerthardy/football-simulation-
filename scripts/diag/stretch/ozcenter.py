"""Outside zone, one operator for NFL tracking and sim common plays: the center and the DL
nearest him at 0.5 s. Covered = a DL within 1 yd laterally at the snap. Lateral moves toward the play
(side of the carrier at 3 s) at 0.5/1.0 s, double teams on that DL at 0.8 s. usage: ozcenter.py FILE..."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    R = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        if CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != 'outside_zone': continue
        p = Play(raw); c = raw['carrier']
        k3 = p.k(min(3.0, p.end)); cy3 = p.pos(c, k3)[1]
        if cy3 is None: continue
        side = 1 if cy3 - raw['ball_y'] > 0 else -1
        ols = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        if len(ols) != 5: continue
        ce = ols[2]; k5, k10 = p.k(0.5), p.k(1.0)
        if p.pos(ce, k10)[0] is None: continue
        dls = [d for d in p.who('D', 'DL') if p.pos(d, 0)[0] is not None]
        if not dls: continue
        dl = min(dls, key=lambda d: p.dist(d, ce, k5))
        dist0 = abs(p.pos(dl, 0)[1] - p.pos(ce, 0)[1])
        double = sum(p.dist(o, dl, p.k(0.8)) <= 1.3 for o in ols) >= 2
        lat = lambda i, k: (p.pos(i, k)[1] - p.pos(i, 0)[1]) * side
        R.append(dict(cLat5=lat(ce, k5), cLat10=lat(ce, k10), dLat5=lat(dl, k5), dLat10=lat(dl, k10), shade=dist0, near=p.dist(dl, ce, k5), double=double,
                      covered=dist0 < 1.0))
    print(path.split('/')[-1], 'plays', len(R))
    for lab, S in (('center covered (DL within 1 yd lateral at snap)', [r for r in R if r['covered']]), ('center uncovered', [r for r in R if not r['covered']])):
        if not S: continue
        print(f'  {lab}: n {len(S)} | center lat 0.5/1.0 s {q([r["cLat5"] for r in S])}/{q([r["cLat10"] for r in S])} | nearest DL lat {q([r["dLat5"] for r in S])}/{q([r["dLat10"] for r in S])} | double at 0.8 s {100*sum(r["double"] for r in S)/len(S):.0f}% | dist at 0.5 {q([r["near"] for r in S])}')
