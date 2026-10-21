"""Holds still live at +0.5 s on broken-contact plays: angle, how made, and
the carrier/holder speeds, leg share and grip. usage (repo root): heldfast.py LABEL ..."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
from collections import Counter
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for L in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt') if l.strip()]
    rows = [r for r in rows if 'error' not in r and r.get('common')]
    kinds = Counter(); H = []
    for r in rows:
        p = Play(r['common']); contact = p.events.get('first_contact'); c = p.raw.get('carrier')
        if contact is None or not p.live(contact + .5): continue
        kept = p.speed(c, p.k(contact + .5)); after = p.raw['yards'] - p.pos(c, p.k(contact))[0]
        if not (kept >= 4 and after >= 5): continue
        live = [h for h in r.get('holds') or [] if h['t'] <= contact + .5 and (h.get('broke') is None or h['t'] + h['broke'] > contact + .5)]
        for h in live:
            a = 'head' if h['cosA'] > .3 else 'behind' if h['cosA'] < -.3 else 'side'
            kinds[(a, h['origin'].split('+')[0], 'broke' if h.get('broke') is not None else 'held')] += 1; H.append(h)
    print(L, sum(kinds.values()), kinds.most_common(10))
    print('  cs', q([h['cs'] for h in H]), 'ds', q([h['ds'] for h in H]), 'legs0', q([h['legs0'] for h in H]), 'cap0', q([h['cap0'] for h in H]), 'life', q([h.get('broke') for h in H if h.get('broke') is not None]), 'csMin/cs', q([h['csMin']/max(.1,h['cs']) for h in H]), 'gain', q([r['gain'] for r in rows]))
