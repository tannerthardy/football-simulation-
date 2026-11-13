"""From first contact to the end (same code NFL and sim): on runs and completions with a first_contact event, the time
from first contact to the play's end and the carrier's yards gained after it, by the closing speed at first contact
of the nearest defender (rate the gap shrank over the 0.2 s before: < 2 / 2-4 / 4+ yd/s).
usage: python3 -I scripts/diag/pass-operators/contact_finish.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
def q(v, f='{:.1f}'):
    v = sorted(x for x in v if x is not None); return '-' if len(v) < 8 else '/'.join(f.format(v[int(p*(len(v)-1))]) for p in (.25,.5,.75))
for arg in sys.argv[1:]:
    name, paths = arg.split('='); R = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            raw = json.loads(line); raw = raw.get('common', raw); ev = raw.get('events', {}); kind = raw.get('kind')
            if kind not in ('run', 'pass') or 'first_contact' not in ev: continue
            c = raw.get('carrier') if kind == 'run' else raw.get('target')
            if c is None or (kind == 'pass' and 'catch' not in ev): continue
            p = Play(raw); kc = p.k(ev['first_contact']); kl = p.k(p.end)
            if kind == 'pass' and kc < p.k(ev['catch']): continue
            if p.pos(c, kc)[0] is None or kc >= kl: continue
            D = [d for d in p.who('D') if p.pos(d, kc)[0] is not None]
            if not D: continue
            n = min(D, key=lambda d: p.dist(d, c, kc)); s2 = max(1, round(0.2 / p.dt))
            if kc - s2 < 0 or p.pos(n, kc - s2)[0] is None or p.pos(c, kc - s2)[0] is None: continue
            closing = (p.dist(n, c, kc - s2) - p.dist(n, c, kc)) / (s2 * p.dt)
            ke = kl
            while ke > kc and p.pos(c, ke)[0] is None: ke -= 1
            band = '<2' if closing < 2 else '2-4' if closing < 4 else '4+'
            R[(kind, band)].append(((ke - kc) * p.dt, p.pos(c, ke)[0] - p.pos(c, kc)[0], p.players[n].get('group')))
    print(f'== {name}: first contact -> end: seconds and carrier yards after contact, p25/p50/p75 (n)')
    for kind in ('run', 'pass'):
        for band in ('<2', '2-4', '4+'):
            X = R[(kind, band)]
            print(f'  {kind:4} closing {band:>3}: n {len(X):5} | time {q([x[0] for x in X], "{:.2f}")} s | yards after {q([x[1] for x in X])} | over 1 s {100*sum(x[0] > 1 for x in X)/max(1,len(X)):.0f}%')
