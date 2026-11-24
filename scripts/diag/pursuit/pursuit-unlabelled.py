"""Which behaviour issues the unlabelled coverage-stage requests of first defenders in the overrun class (2026-11-23):
behaviour class, zone, ball state, time since the catch, and his request along the carrier's line.
Usage: python3 -I pursuit-unlabelled.py ROWS.json"""
import json, math, sys, collections, importlib.util, os
spec = importlib.util.spec_from_file_location('pa', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pursuit-an.py'))
pa = importlib.util.module_from_spec(spec); spec.loader.exec_module(pa)
R = json.load(open(sys.argv[1])); c = collections.Counter(); ts = collections.defaultdict(list)
for r in R:
    F = r['frames']
    if len(F) < 3: continue
    row = {'src': 'sim', 'key': r['key'], 'man': False, 'end': 'other', 'car': [[f['t'], *f['car']] for f in F],
           'defs': {k: [[f['t'], *f['d'][k]['pos'], 0] for f in F if k in f['d']] for k in F[0]['d']}, 'offs': {}}
    a = pa.analyse(row)
    if not isinstance(a, dict) or not a['cls'] or not (a['cls'].startswith('old') or a['cls'].startswith('overrun')): continue
    k = a['d1']
    for f in F:
        if f['t'] > a['beat_t'] + 1e-9: break
        d = f['d'][k]
        if d['stage'] or d.get('tech'): continue
        key = (d.get('bpb') or 'not via playObservedFlight/flightApproach', d.get('cls'), d.get('ball'), d.get('kind'))
        c[key] += 1; ts[key].append(f['t'])
for key, n in c.most_common(12):
    t = sorted(ts[key]); print(f"{n:4d} ticks  branch {key[0]}  class {key[1]}  ball {key[2]}  kind {key[3]}  t after catch p50 {t[len(t)//2]:.1f} (min {t[0]:.1f}, max {t[-1]:.1f})")
