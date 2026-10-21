"""Geometry of stuffs (<= 1 yd) at first contact, lab-attrib output: where the
stopper and runner were relative to the play side, and whether the stopper's
blocker was between him and the ball or on the side the runner went.
Frame: x past the line, y lateral with + toward the play side.
usage: stuff-geometry.py out/run-attrib/x.json [scheme]"""
import json, sys, math
from collections import Counter
rows = json.load(open(sys.argv[1]))
scheme = sys.argv[2] if len(sys.argv) > 2 else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
st = [r for r in rows if r['yards'] <= 1 and 'contact' in r and r['contact'].get('geo') and (not scheme or r['scheme'] == scheme)]
print(f"{sys.argv[1]} {scheme or 'all'} stuffs {len(st)} of {sum(1 for r in rows if not scheme or r['scheme']==scheme)}")
C = Counter(); dsd, cy, cx, rel = [], [], [], []
for r in st:
    g, ps = r['contact']['geo'], r['contact']['ps']
    c, d = g['c'], g['d']
    side = 'playside' if d['y'] * ps > .5 else 'backside' if d['y'] * ps < -.5 else 'middle'
    cy.append(c['y'] * ps); cx.append(c['x'])
    if not g['b']: C[(side, 'no blocker')] += 1; continue
    b = min(g['b'], key=lambda b: math.hypot(b['x'] - d['x'], b['y'] - d['y']))
    bl = (b['y'] - d['y']) * ps   # + blocker on the play side of his man
    cl = (c['y'] - d['y']) * ps   # + runner on the play side of the stopper
    vb = (b['x'] - d['x'], b['y'] - d['y']); vc = (c['x'] - d['x'], c['y'] - d['y'])
    cos = (vb[0]*vc[0] + vb[1]*vc[1]) / ((math.hypot(*vb) or 1) * (math.hypot(*vc) or 1))
    lev = 'blocker between' if cos > .5 else 'blocker beside' if cos > -.3 else 'blocker behind'
    run = 'runner playside of him' if cl > .3 else 'runner backside of him' if cl < -.3 else 'runner square'
    C[(side, lev, run)] += 1
    rel.append(math.hypot(*vc))
print('  runner at contact: depth p50', q(cx), 'lateral (+playside) p25/50/75', q(cy, .25), q(cy), q(cy, .75), '| stopper-runner dist p50', q(rel))
for k, v in C.most_common(14): print(f"  {v:4d}  {' | '.join(k)}")
