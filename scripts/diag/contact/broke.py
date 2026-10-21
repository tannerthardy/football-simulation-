"""Plays the shared operator counts as broken contact (>= 4 yd/s at +0.5 s,
>= 5 more yards), split by what the first holds were doing at +0.5 s.
usage (from the repo root): broke.py LABEL [LABEL ...]"""
import gzip, json, sys
from pathlib import Path
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
from collections import Counter
for L in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(f'out/open-field/all/{L}.jsonl.gz', 'rt') if l.strip()]
    rows = [r for r in rows if 'error' not in r and r.get('common')]
    kinds = Counter(); n = 0; nb = 0
    for r in rows:
        p = Play(r['common'])
        ev = p.events; contact = ev.get('first_contact')
        if contact is None or not p.live(contact + .5): continue
        car = p.carrier if hasattr(p, 'carrier') else None
        n += 1
        c = p.raw.get('carrier')
        kept = p.speed(c, p.k(contact + .5)); after = p.raw['yards'] - p.pos(c, p.k(contact))[0]
        if not (kept >= 4 and after >= 5): continue
        nb += 1
        T = r['t'] - (r['common']['events'].get('end', r['t']) - contact) if False else None
        holds = sorted(r.get('holds') or [], key=lambda h: h['t'])
        # holds are in sim time; first_contact in common time (same origin: snap at 0?)
        h0 = next((h for h in holds if abs(h['t'] - contact) < .15), None)
        early = [h for h in holds if h['t'] <= contact + .5]
        if not early: k = 'no hold by +0.5s (collision/miss)'
        elif all(h.get('broke') is not None and h['t'] + h['broke'] <= contact + .5 for h in early): k = 'hold(s) broke by +0.5s'
        else: k = 'still held at +0.5s'
        kinds[k] += 1
        kinds['gain40+' if r['gain'] >= 40 else 'gain<40'] += 1
    print(L, f'contacts {n} broke {nb} ({100*nb/n:.1f}%)', dict(kinds))
