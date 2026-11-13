"""Long gains after the catch: do pursuers get close and fail, or never arrive?
For completions with YAC >= 15: each defender's closest approach to the
receiver after the catch, and how many got within 1.5 yd / 3 yd."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); within15, within3, closest, catchN = [], [], [], 0
    reached_untackled = 0; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch']); catchN += 1
        if raw['yards'] - p.pos(t, kc)[0] < 15: continue
        n += 1; ke = p.k(p.end)
        app = []
        for d in p.who('D'):
            ds = [p.dist(d, t, k) for k in range(kc, ke + 1)]
            app.append(min(ds) if ds else 99)
        app.sort(); closest.append(app[0])
        within15.append(sum(a <= 1.5 for a in app)); within3.append(sum(a <= 3 for a in app))
    print(f'{label:9} YAC>=15: {n} of {catchN} completions ({n/max(1,catchN):.3f}) | closest defender p50 {q(closest,.5):.2f} | defenders reaching 1.5 yd: p50 {q(within15,.5)} mean {sum(within15)/max(1,n):.2f} | reaching 3 yd: mean {sum(within3)/max(1,n):.2f}')
