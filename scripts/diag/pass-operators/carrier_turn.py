"""Carrier heading turn rate in the open field (0-3 s; speed > 2 yd/s; over 0.2 s), same code NFL and sim.
usage: python3 -I scripts/diag/pass-operators/carrier_turn.py name=a.jsonl.gz ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def q(v): v = sorted(v); return '/'.join(f'{v[int(p*(len(v)-1))]:.0f}' for p in (.25,.5,.75)) if len(v) > 5 else '-'
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
            if kind not in ('run', 'pass'): continue
            p = Play(raw); kl = p.k(p.end)
            if kind == 'pass':
                if 'catch' not in ev or raw.get('target') is None: continue
                c = raw['target']; k0 = p.k(ev['catch'])
            else:
                c = raw.get('carrier')
                if c is None: continue
                k0 = next((k for k in range(p.k(ev.get('handoff', 0)), kl + 1) if p.pos(c, k)[0] is not None and p.pos(c, k)[0] > 0), None)
                if k0 is None: continue
            st = max(1, round(0.2 / p.dt))
            for k in range(k0, min(kl - st, k0 + round(3 / p.dt))):
                v1, v2 = p.velocity(c, k), p.velocity(c, k + st)
                if math.hypot(*v1) < 2 or math.hypot(*v2) < 2: continue
                d = abs((math.degrees(math.atan2(v2[1], v2[0]) - math.atan2(v1[1], v1[0])) + 540) % 360 - 180) / (st * p.dt)
                R[kind].append(d)
    print(name, {k: q(v) for k, v in R.items()}, 'carrier heading turn deg/s over 0.2 s, speed > 2')
