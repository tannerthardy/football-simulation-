"""Speed gained in the 0.8 s after the catch, by nearest-defender distance at the catch."""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
from collections import defaultdict
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); g = defaultdict(list); hd = defaultdict(list)
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); ev = raw['events']; t = raw.get('target')
        if raw['kind'] != 'pass' or t is None or 'catch' not in ev: continue
        p = Play(raw); kc = p.k(ev['catch'])
        if not p.live(ev['catch'] + 0.8): continue
        fc = ev.get('first_contact')
        if fc is not None and ev['catch'] <= fc < ev['catch'] + 0.8: continue  # contact inside the window
        d0 = p.nearest(t, kc); b = '<2' if d0 < 2 else '2-4' if d0 < 4 else '4-7' if d0 < 7 else '7+'
        g[b].append(p.speed(t, p.k(ev['catch'] + 0.8)) - p.speed(t, kc))
        hd[b].append(p.speed(t, kc))
    print(f'{label:9} ' + '  '.join(f"near {b}: n={len(g[b])} speed at catch {q(hd[b],.5):.2f} gain {q(g[b],.5):+.2f}" for b in ('<2', '2-4', '4-7', '7+')))
