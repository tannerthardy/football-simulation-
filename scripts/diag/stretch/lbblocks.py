"""Second-level block episodes, one operator for NFL tracking and sim common
plays. Second-level defenders: 2-8 yd deep, within 7 yd of the ball at the
snap. An episode starts when an OL/TE first comes within START yd of him and
lasts while that same player stays within KEEP yd. Reported: share of
second-level defenders blocked at all before the carrier's crossing + 1 s,
the first episode's start time, its duration, and whether it was still on
at the crossing and at crossing + 1 s. usage: lbblocks.py FILE [--ytg60] [--fam F]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import CONCEPT_FAMILY, Play  # noqa: E402
path = sys.argv[1]; START, KEEP = 1.0, 1.5
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
fam = sys.argv[sys.argv.index('--fam') + 1] if '--fam' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}; n = 0
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if fam and CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept')) != fam: continue
    p = Play(raw); c = raw['carrier']; by = raw['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if kx is None or p.k(kx * p.dt + 1) > end: continue
    n += 1
    OL = p.who('O', 'OL') + p.who('O', 'TE')
    for d in [d for d in p.who('D') if p.pos(d, 0)[0] is not None and 2 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - by) <= 7]:
        o.setdefault('lbs', []).append(1)
        k1 = p.k(kx * p.dt + 1)
        first = next(((k, i) for k in range(k1 + 1) for i in OL if p.dist(d, i, k) <= START), None)
        if first is None: continue
        k0, i = first; ke = k0
        while ke + 1 <= end and p.dist(d, i, ke + 1) <= KEEP: ke += 1
        o.setdefault('start', []).append(k0 * p.dt); o.setdefault('dur', []).append((ke - k0) * p.dt)
        o.setdefault('onX', []).append(1 if k0 <= kx <= ke else 0); o.setdefault('on1', []).append(1 if k0 <= k1 <= ke else 0)
b = len(o.get('start', [])); L = len(o.get('lbs', []))
print(f"{path.split('/')[-1][:22]:22s} {fam or 'all'} runs {n}, second-level defenders {L}: blocked by crossing+1s {100*b/max(1,L):.0f}% | first block starts p50 {q(o.get('start', []))} s, lasts p25/50/75 {q(o.get('dur', []), .25)}/{q(o.get('dur', []))}/{q(o.get('dur', []), .75)} s | on at crossing {100*sum(o.get('onX', []))/max(1,b):.0f}% at crossing+1s {100*sum(o.get('on1', []))/max(1,b):.0f}%")
