"""Wide intermediate catches (same code NFL and sim): non-back targets caught 5-12 yd past the line within 10 yd of a
sideline. At the catch: nearest defender's group and distance, where he is (outside = between catcher and the near
sideline, inside, over the top = downfield of him, under = behind him), the catcher's heading (toward the sideline /
upfield / back inside); then the first defender inside 1.5 yd and when, how the play ends (out of bounds = carrier
within 0.5 yd of the sideline at the end; tackled/contact; other), the time from catch to the end, and YAC.
usage: python3 -I scripts/diag/pass-operators/wide_catch.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
W = 53.33
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = []
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kl = p.k(p.end)
            pl = p.players[c]
            if pl.get('group') == 'RB' or pl.get('pos') in ('RB', 'FB'): continue
            if p.pos(c, k0)[0] is None: continue
            cx, cy = p.pos(c, k0)
            if not (5 <= cx < 12) or min(cy, W - cy) >= 10: continue
            side = -1 if cy < W / 2 else 1          # direction (in y) of the near sideline
            D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            if not D: continue
            ds = sorted((p.dist(d, c, k0), d) for d in D); d0, n = ds[0]
            nx, ny = p.pos(n, k0)
            where = 'over' if nx - cx > 1 and abs(ny - cy) < (nx - cx) else 'under' if cx - nx > 1 and abs(ny - cy) < (cx - nx) else 'outside' if (ny - cy) * side > 0 else 'inside'
            k1 = min(kl, k0 + round(0.5 / p.dt))
            hx, hy = (p.pos(c, k1)[0] - cx, p.pos(c, k1)[1] - cy) if p.pos(c, k1)[0] is not None else (0, 0)
            head = 'still' if math.hypot(hx, hy) < 0.5 else 'sideline' if hy * side > abs(hx) else 'inside' if -hy * side > abs(hx) else 'upfield' if hx > 0 else 'back'
            ka = next((k for k in range(k0, min(kl, k0 + round(3 / p.dt)) + 1) if any(p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None and p.dist(d, c, k) <= 1.5 for d in D)), None)
            ke = kl
            while ke > k0 and p.pos(c, ke)[0] is None: ke -= 1
            ex, ey = p.pos(c, ke)
            near_end = min((p.dist(d, c, ke) for d in D if p.pos(d, ke)[0] is not None), default=99)
            end = 'out of bounds' if min(ey, W - ey) < 0.5 else 'contact' if near_end <= 1.5 else 'other'
            R.append(dict(g=p.players[n].get('group'), d0=d0, where=where, head=head, ta=None if ka is None else (ka - k0) * p.dt, end=end, dur=(ke - k0) * p.dt, yac=ex - cx))
    print(f'== {name}: wide catches 5-12 yd, non-backs: n {len(R)}, YAC {q([r["yac"] for r in R])}, play lasts {q([r["dur"] for r in R])} s after the catch')
    for key, lab in (('g', 'nearest defender group'), ('where', 'nearest defender is'), ('head', 'catcher heads (first 0.5 s)'), ('end', 'play ends')):
        cnt = C.Counter(r[key] for r in R)
        print(f'  {lab}: ' + ', '.join(f'{k} {100*v/len(R):.0f}% (YAC {q([r["yac"] for r in R if r[key] == k])})' for k, v in cnt.most_common()))
    print(f'  nearest at catch {q([r["d0"] for r in R])} yd; first inside 1.5 yd by +3 s {100*sum(r["ta"] is not None for r in R)/max(1,len(R)):.0f}% at {q([r["ta"] for r in R], "{:.2f}")} s')
