"""Close-in window (Run Game, 2026-11-24): for every carry in a shared-format plays file (tackle-geometry-dump.mts on the
sim side; Rules' dump-nfl on the NFL side), from the first frame (at or after the handoff/catch frame k0) any defender
is within NEAR yd of the carrier to the first frame any defender is within CONTACT yd (the attempt operator's contact
distance): the time between, and the carrier's advance downfield (+x) over it. Same operator both sides.
Usage: python3 -I close-window.py PLAYS.jsonl [PLAYS2.jsonl ...]"""
import json, math, sys
NEAR, CONTACT = 2.0, 1.0
def q(v, p):
    v = sorted(v); return round(v[min(len(v) - 1, int(p * len(v)))], 2) if v else None
for path in sys.argv[1:]:
    out = {'run': [], 'catch': []}; never = {'run': 0, 'catch': 0}; total = {'run': 0, 'catch': 0}
    for line in open(path):
        p = json.loads(line); pt = p.get('ptype')
        if pt not in out: continue
        car = {r[0]: r for r in p['tracks'].get(str(p['carrier']), [])}
        defs = [{r[0]: r for r in tr} for k, tr in p['tracks'].items() if p['side'].get(k) == 'def']
        total[pt] += 1
        t2 = tc = None
        for f in sorted(car):
            if f < p['k0'] or f > p['ke']: continue
            c = car[f]; dmin = min((math.hypot(d[f][1] - c[1], d[f][2] - c[2]) for d in defs if f in d), default=99)
            if t2 is None and dmin <= NEAR: t2 = f
            if dmin <= CONTACT: tc = f; break
        if t2 is None or tc is None: never[pt] += 1; continue
        out[pt].append(((tc - t2) / 10, car[tc][1] - car[t2][1]))
    print(f'== {path}')
    for pt in out:
        X = out[pt]
        if not X: continue
        print(f"  {pt}: carries {total[pt]}, no defender within {CONTACT} yd {never[pt] / max(1, total[pt]):.3f}; within {NEAR} -> {CONTACT} yd: time p25/50/75 {q([x[0] for x in X], .25)}/{q([x[0] for x in X], .5)}/{q([x[0] for x in X], .75)} s, carrier advance p25/50/75 {q([x[1] for x in X], .25)}/{q([x[1] for x in X], .5)}/{q([x[1] for x in X], .75)} yd")
