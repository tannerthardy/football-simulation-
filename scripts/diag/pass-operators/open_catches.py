"""Open catches (same code NFL and sim): by target group, where caught (within 10 yd of a sideline = wide) and depth, the nearest defender at the catch, the share no defender comes within 2 yd of by +3 s among catches still live at +1 s, YAC; the open ones split by start distance, coverage and route.
usage: python3 -I scripts/diag/pass-operators/open_catches.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 5 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list); W = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {})
            if raw.get('kind') != 'pass' or 'catch' not in ev or raw.get('target') is None: continue
            p = Play(raw); c = raw['target']; k0 = p.k(ev['catch']); kl = p.k(p.end)
            if p.pos(c, k0)[0] is None: continue
            pl = p.players[c]; grp = 'RB' if pl.get('group') == 'RB' or pl.get('pos') in ('RB', 'FB') else 'TE' if pl.get('group') == 'TE' or pl.get('pos') == 'TE' else 'WR'
            live = (kl - k0) * p.dt >= 1.0
            kw = min(kl, k0 + round(3 / p.dt)); D = [d for d in p.who('D') if p.pos(d, k0)[0] is not None]
            cx, cy = p.pos(c, k0); wide = min(cy, 53.33 - cy) < 10
            near0 = min(p.dist(d, c, k0) for d in D)
            mn = min(min((p.dist(d, c, k) for k in range(k0, kw + 1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None), default=99) for d in D)
            ke = kl
            while ke > k0 and p.pos(c, ke)[0] is None: ke -= 1
            key = (grp, 'wide' if wide else 'middle', '0-5' if cx < 5 else '5+')
            R[key].append((near0, mn > 2 and live, p.pos(c, ke)[0] - cx))
            if mn > 2 and live: W['wide' if wide else 'middle'].append((near0, (raw.get('cell') or {}).get('coverage', '?'), pl.get('route', '?'), p.pos(c, ke)[0] - cx))
    for w in ('wide', 'middle'):
        X = W[w]
        if not X: continue
        far = [x for x in X if x[0] > 8]; mid = [x for x in X if 4 < x[0] <= 8]; close = [x for x in X if x[0] <= 4]
        print(f"  open catches {w}: n {len(X)} ({100*len(X)/sum(len(v) for v in R.values()):.1f}% of all catches); nearest at catch >8 yd {len(far)} (YAC {q([x[3] for x in far])}), 4-8 {len(mid)} (YAC {q([x[3] for x in mid])}), <=4 {len(close)} (YAC {q([x[3] for x in close])})")
        print('     coverages', C.Counter(x[1] for x in X).most_common(6), '\n     routes', C.Counter(x[2] for x in X).most_common(6))
    print(f'== {name}: catches by target group, where caught (within 10 yd of a sideline = wide), depth')
    tot = sum(len(v) for v in R.values())
    for key in sorted(R):
        X = R[key]
        if len(X) < 15: continue
        print(f"  {'/'.join(key):16} n {len(X):4} ({100*len(X)/tot:4.1f}% of catches): nearest at catch {q([x[0] for x in X])} yd, nobody within 2 yd by +3 s {100*sum(x[1] for x in X)/len(X):4.1f}%, YAC {q([x[2] for x in X])}")
