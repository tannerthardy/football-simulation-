"""usage: blockedfirst.py FILE [FILE ...] (common plays: NFL tracking or sim export).
Runs: at first contact, the defender nearest the carrier is the first tackler;
he counts as blocked when an offensive player other than the carrier is within
1.2 yd of him at that frame. Share of first contacts by blocked defenders, by
concept family (gap / zone / other), and for blocked vs free first tacklers
the carrier's depth past the line at that contact and the play's final yards. One operator for NFL tracking and sim exports."""
import gzip, json, sys, re
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
def fam(c):
    c = (c or '').lower()
    if re.search(r'power|counter|trap|pull|gap', c): return 'gap'
    if re.search(r'zone|duo|man', c): return 'zone/duo'
    return 'other'
q = lambda v: round(sorted(v)[len(v)//2], 1) if v else None
for path in sys.argv[1:]:
    out = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        t = raw['events'].get('first_contact')
        if t is None: continue
        p = Play(raw); k = int(round(t / p.dt)); c = raw['carrier']
        if k >= len(raw['xy']) or p.pos(c, k)[0] is None: continue
        ds = [d for d in p.who('D') if p.pos(d, k)[0] is not None]
        if not ds: continue
        d = min(ds, key=lambda d: p.dist(d, c, k))
        blocked = any(o != c and p.pos(o, k)[0] is not None and p.dist(o, d, k) < 1.2 for o in p.who('O'))
        g = out.setdefault(fam((raw.get('cell') or {}).get('concept')), {'b': [], 'f': [], 'bd': [], 'fd': []})
        g['b' if blocked else 'f'].append(raw['yards']); g['bd' if blocked else 'fd'].append(p.pos(c, k)[0])
    print(path.split('/')[-1], ' | '.join(f"{k}: blocked first {100*len(v['b'])/max(1,len(v['b'])+len(v['f'])):.0f}% of {len(v['b'])+len(v['f'])} (contact depth p50 blocked {q(v['bd'])} / free {q(v['fd'])}; final yards p50 blocked {q(v['b'])} / free {q(v['f'])})" for k, v in sorted(out.items())))
