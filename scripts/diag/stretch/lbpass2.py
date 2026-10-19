"""How the runner gets past the second level, one operator for NFL tracking
and sim common plays. Second-level defenders: 2-8 yd deep, within 7 yd of the
ball laterally at the snap. From the crossing until 2 s later (or the end),
each one's closest approach to the carrier: contact (<= 1.0 yd), near (1-2),
otherwise engaged at closest approach (an OL within 1.5 yd of him) or free
and far. Split by whether the run went 10+. usage: lbpass2.py FILE [--ytg60] [--fam F]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if fam and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    p = Play(raw); c = raw['carrier']; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if kx is None: continue
    tag = '10+' if raw['yards'] >= 10 else '<10'
    OL = p.who('O', 'OL') + p.who('O', 'TE')
    sec = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and 2 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - by) <= 7]
    o.setdefault((tag, 'runs'), []).append(1)
    for d in sec:
        ks = [k for k in range(kx, min(end, kx + int(2 / p.dt)) + 1) if p.pos(d, k)[0] is not None and p.pos(c, k)[0] is not None]
        if not ks: continue
        k = min(ks, key=lambda k: p.dist(c, d, k)); dm = p.dist(c, d, k)
        cls = 'contact' if dm <= 1.0 else 'near' if dm <= 2.0 else 'engaged' if any(p.dist(d, i, k) <= 1.5 for i in OL) else 'free-far'
        o.setdefault((tag, cls), []).append(1)
print(f"{path.split('/')[-1][:22]:22s} {fam or 'all'}")
for tag in ('<10', '10+'):
    n = len(o.get((tag, 'runs'), [])); tot = sum(len(o.get((tag, c), [])) for c in ('contact', 'near', 'engaged', 'free-far'))
    if not n: continue
    print(f"  {tag:3s} runs {n:4d} ({len(o.get((tag,'runs'),[]))}) second-level/run {tot/n:.2f}: " + '  '.join(f"{c} {len(o.get((tag, c), []))/n:.2f}" for c in ('contact', 'near', 'engaged', 'free-far')))
