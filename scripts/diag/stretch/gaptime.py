"""Timing and first contact of a run concept, one operator for NFL tracking
and sim common plays: handoff, carrier crossing of the line, first contact
(provider/sim first_contact label) with its depth and the nearest defender's
group, and gain. Medians [p25, p75]. usage: gaptime.py FILE --concept C|toss [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402

def tossed(raw):
    """NFL toss: the carrier is more than 2.5 yd from the QB at the exchange
    (the provider labels pitches as handoffs; any concept)."""
    ev = raw.get('events') or {}
    if ev.get('handoff') is None: return False
    p = Play(raw); qb = p.who('O', 'QB')
    return bool(qb) and p.dist(qb[0], raw['carrier'], p.k(ev['handoff'])) > 2.5
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
path, concept = sys.argv[1], opt('--concept')
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
LABEL = {'pull_lead': 'PULL LEAD', 'oz': 'OUTSIDE ZONE', 'iz': 'INSIDE ZONE', 'duo': 'MAN'}
q = lambda v: f"{sorted(v)[len(v)//2]:5.2f} [{sorted(v)[len(v)//4]:5.2f},{sorted(v)[3*len(v)//4]:5.2f}]" if v else '-'
h, cr, fc, fcd, grp, n = [], [], [], [], {}, 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw)
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    nfl = (raw.get('cell') or {}).get('concept')
    if concept == 'toss' and raw.get('source') != 'sim':
        if not tossed(raw): continue
    elif concept and not (str(raw['id']).startswith(concept + '/') or nfl == LABEL.get(concept, concept.upper())): continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}; n += 1
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if ev.get('handoff') is not None: h.append(ev['handoff'])
    kc = next((k for k in range(end + 1) if (p.pos(c, k)[0] if p.pos(c, k)[0] is not None else -99) >= 0), None)
    if kc is not None: cr.append(kc * p.dt)
    t = ev.get('first_contact')
    if t is not None and p.live(t):
        k = p.k(t); fc.append(t); fcd.append(p.pos(c, k)[0])
        d = min(p.who('D'), key=lambda i: p.dist(i, c, k)); g = raw['players'][d]['group']; grp[g] = grp.get(g, 0) + 1
tot = sum(grp.values()) or 1
print(f"{path.split('/')[-1][:22]:22s} {concept}: runs {n} | handoff {q(h)} | crosses line {q(cr)} (n {len(cr)}, {100*len(cr)/max(1,n):.0f}%) | "
      f"first contact {q(fc)} at depth {q(fcd)} | nearest at contact " + ' '.join(f"{g} {100*v/tot:.0f}%" for g, v in sorted(grp.items())))
