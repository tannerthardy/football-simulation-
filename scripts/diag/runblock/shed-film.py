"""For stuffed runs whose first stopper shed a block: was the blocker between
him and the eventual contact point when the engagement began, and at the shed?
Did the carrier move toward the defender's side? Input: run-attrib film JSON."""
import json, math, sys
from collections import Counter
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def cosb(D, B, C):
    a = (B[0] - D[0], B[1] - D[1]); b = (C[0] - D[0], C[1] - D[1])
    la, lb = math.hypot(*a) or 1, math.hypot(*b) or 1
    return (a[0] * b[0] + a[1] * b[1]) / (la * lb)
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    rows = [r for r in json.load(open(path)) if 'film' in r and r.get('contact', {}).get('cls') == 'shed before contact']
    cats = Counter(); detail = []
    for r in rows:
        slots = r['slots']; s = slots.index(r['contact']['stopper']); film = r['film']; ps = r['ps']
        ct = r['contact']['t']
        fr = [f for f in film if f[0] <= ct + 1e-6]
        if not fr: continue
        C = None
        cidx = fr[-1][1]
        C = fr[-1][2][cidx]
        # stopper's engagement frames
        eng = [(f, e) for f in fr for e in f[3] if e[1] == s]
        if not eng: cats['no engagement in film'] += 1; continue
        f0, e0 = eng[0]; fl, el = eng[-1]
        b = el[0]
        D0, B0 = f0[2][s], f0[2][e0[0]]; Dl, Bl = fl[2][s], fl[2][b]
        start = cosb(D0, B0, C); end = cosb(Dl, Bl, C)
        # carrier lateral at engagement start vs at contact (playside +)
        c0 = f0[2][f0[1]] if f0[1] >= 0 else None
        cutback = c0 is not None and (C[1] - c0[1]) * ps < -1.0
        d_lat = (Dl[1] - D0[1]) * ps
        cat = ('between at start' if start > 0.5 else 'beside at start' if start > -0.5 else 'behind at start') + ' -> ' + ('between at shed' if end > 0.5 else 'beside at shed' if end > -0.5 else 'behind at shed')
        cats[cat] += 1
        detail.append((r['game'], r['concept'], slots[b], r['contact']['stopper'], round(start, 2), round(end, 2), round(fl[0] - f0[0], 2), round(d_lat, 1), cutback, round((C[1]) * ps, 1), round(D0[1] * ps, 1), round(B0[1] * ps, 1), r['plans'] and next((p['kind'] for p in r['plans'] if p['slot'] == slots[b]), '?')))
    print(f'== {label}: {len(rows)} shed-stopper stuffs')
    for k, v in cats.most_common(): print(f'  {v:3} {k}')
    print('  game concept blocker stopper cosStart cosShed engDur dLat(+playside) cutback contactY(+ps) D0y B0y blockerPlan')
    for d in detail[:40]: print('  ', d)
