# Where does TRUNK_TWIST's completion gain sit? Saved scorecard records (npm run scorecard --out ...) with arms off / on / on_oldterm
# (on_oldterm = TRUNK_TWIST on with the catch-at-speed term reading the line of run, as before the trunk). Completion, attempts and yards per attempt
# by intended air-yards band and by concept, per arm, and the on-minus-off and on-minus-on_oldterm differences.
#   python3 -I scripts/diag/route-speed/trunk_attr.py out/trunk-attr/s23.json [out/trunk-attr/s31.json ...]
import json, sys, collections as C
arms = C.OrderedDict(); 
for f in sys.argv[1:]:
    d = json.load(open(f))
    for a in d['arms']:
        arms.setdefault(a['name'], []).extend(p for g in a['games'] for p in g['plays'])
band = lambda y: 'air <0' if y < 0 else 'air 0-4' if y < 5 else 'air 5-9' if y < 10 else 'air 10-19' if y < 20 else 'air 20+'
def tab(key):
    out = {}
    for n, P in arms.items():
        T = C.defaultdict(lambda: [0, 0, 0.0])
        for p in P:
            if not p.get('att'): continue
            k = key(p)
            if k is None: continue
            T[k][0] += 1; T[k][1] += 1 if p['comp'] else 0; T[k][2] += p['yards'] if p.get('yards') is not None else 0
        out[n] = T
    return out
def show(title, key, minn=60):
    t = tab(key); names = list(arms)
    print(f'\n== {title}   (attempts, completion %, yds/att)')
    keys = sorted({k for n in names for k in t[n]})
    print(f'{"":14s}' + ''.join(f'| {n:>20s} ' for n in names) + '| on-off  on-oldterm')
    for k in keys:
        if min(t[n][k][0] for n in names if k in t[n]) < minn: continue
        row = f'{k:14s}'
        for n in names:
            a = t[n][k]; row += f'| {a[0]:5d} {100*a[1]/max(1,a[0]):5.1f}% {a[2]/max(1,a[0]):5.2f} '
        if 'off' in t and 'on' in t: row += f'| {100*t["on"][k][1]/max(1,t["on"][k][0])-100*t["off"][k][1]/max(1,t["off"][k][0]):+5.1f}'
        if 'on_oldterm' in t and 'on' in t: row += f'  {100*t["on"][k][1]/max(1,t["on"][k][0])-100*t["on_oldterm"][k][1]/max(1,t["on_oldterm"][k][0]):+5.1f}'
        print(row)
def air(p):
    for k in ('air', 'airYards', 'airY'):
        if p.get(k) is not None: return p[k]
show('all attempts', lambda p: 'all')
show('air-yards band', lambda p: None if air(p) is None else band(air(p)))
show('concept', lambda p: p.get('concept'), 40)
show('coverage family', lambda p: p.get('family'))
