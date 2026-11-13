"""Are sim receivers caught 'in stride' more than NFL ones? Speed at the catch,
speed 0.5 s before, and heading change over that half second (common format)."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); at, before, turn, keep = [], [], [], []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev or ev['catch'] < 0.6: continue
        p = Play(raw); kc = p.k(ev['catch']); kb = p.k(ev['catch'] - 0.5)
        v1, v0 = p.velocity(t, kc), p.velocity(t, kb)
        s1, s0 = math.hypot(*v1), math.hypot(*v0)
        at.append(s1); before.append(s0)
        if s1 > 1 and s0 > 1:
            turn.append(abs(math.degrees(math.atan2(v0[0]*v1[1]-v0[1]*v1[0], v0[0]*v1[0]+v0[1]*v1[1]))))
        if s0 > 1: keep.append(s1 / s0)
    print(f'{label:10} n={len(at)}  speed at catch p50 {q(at,.5):.2f} p75 {q(at,.75):.2f} | 0.5 s before p50 {q(before,.5):.2f} | speed kept p50 {q(keep,.5):.2f} | heading change p50 {q(turn,.5):.0f} deg, share < 15 deg {sum(x<15 for x in turn)/max(1,len(turn)):.2f}')
