"""Matched flips in 'never crosses the LOS' between two arms' traces, by concept. usage: flips.py dir BASE ARM concept"""
import json, sys, collections
d, base, arm, con = sys.argv[1:5]
flip = collections.Counter(); ex = []
for s in (7, 9, 11, 13):
    A = json.load(open(f"{d}/trace-seed{s}-run-{base}.json")); B = json.load(open(f"{d}/trace-seed{s}-run-{arm}.json"))
    assert len(A) == len(B)
    for i, (a, b) in enumerate(zip(A, B)):
        if a['nullified'] or b['nullified'] or a['setup'].get('concept') != con: continue
        def nc(p):
            ag = p['setup']['agents']; los = p['setup']['los']
            car = next((f['c'] for f in p['frames'] if f['c'] >= 0 and ag[f['c']]['slot'] != 'QB'), None)
            if car is None: return None
            dirn = 1  # frames are already in attack-normalised x? check sign by QB start
            xs = [(f['a'][car][0] - los) for f in p['frames'][:40] if f['c'] == car]
            return xs
        xa, xb = nc(a), nc(b)
        if xa is None or xb is None: continue
        ca, cb = max(xa) > 0, max(xb) > 0
        flip[(ca, cb)] += 1
        if ca != cb: ex.append((a['id'], ca, cb, round(max(xa), 1), round(max(xb), 1)))
print(con, dict(flip)); [print('  %s crossed %s -> %s  maxx %.1f -> %.1f' % e) for e in ex]
