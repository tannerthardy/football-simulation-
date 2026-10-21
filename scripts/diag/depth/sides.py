"""Two deepest defenders at the snap, split by the run's side: playside is the
one on the side where the carrier crosses the line (relative to the ball's
snap spot), backside the other. Depth past the line at handoff+0.5 and at the
crossing, downhill speed at the crossing, and the runner's x when each first
gets within 1.5 yd (share and median). NFL by charted shell, sim by lab look.
usage: sides.py FILE [--ytg60] [--shell 1|3|2]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
path = sys.argv[1]
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if raw.get('source') == 'sim':
        look = raw['id'].split('/')[3]
        fam = '1' if look in ('bear1', 'off1', 'mike1') else '3' if look in ('over3', 'under3', 'wide9', 'odd3') else '2'
    else:
        cov = (raw.get('cell') or {}).get('coverage') or ''
        fam = '1' if cov.startswith(('Cover-1', 'Cover-0')) else '3' if cov.startswith('Cover-3') else '2' if cov.startswith(('Cover-2', 'Quarters', 'Cover 6', '2-Man')) else None
    if opt('--shell') and fam != opt('--shell'): continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
    if len(D) < 11: continue
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if kx is None: continue
    deep = sorted(D, key=lambda d: -p.pos(d, 0)[0])[:2]
    by = raw['ball_y']; side = 1 if p.pos(c, kx)[1] >= by else -1
    ps = max(deep, key=lambda d: (p.pos(d, 0)[1] - by) * side)
    kh = p.k(ev['handoff'] + .5) if ev.get('handoff') is not None else None
    for tag, d in (('play', ps), ('back', [x for x in deep if x != ps][0])):
        k0, k1 = max(0, kx - 2), min(end, kx + 2)
        o.setdefault(tag + 'snap', []).append(p.pos(d, 0)[0])
        if kh is not None and kh <= end: o.setdefault(tag + 'h', []).append(p.pos(d, kh)[0])
        o.setdefault(tag + 'x', []).append(p.pos(d, kx)[0])
        o.setdefault(tag + 'down', []).append((p.pos(d, k0)[0] - p.pos(d, k1)[0]) / ((k1 - k0) * p.dt or 1))
        meet = next((k for k in range(kx, end + 1) if p.dist(d, c, k) <= 1.5), None)
        o.setdefault(tag + 'met', []).append(meet is not None)
        if meet is not None: o.setdefault(tag + 'meetx', []).append(p.pos(c, meet)[0])
print(f"{path.split('/')[-1][:22]:22s} shell {opt('--shell') or 'all'} runs {len(o.get('playx', []))}")
for tag in ('play', 'back'):
    met = o.get(tag + 'met', [])
    print(f"  {tag}side deep: snap {q(o.get(tag+'snap', []))} h+.5 {q(o.get(tag+'h', []))} cross {q(o.get(tag+'x', []))} (p25 {q(o.get(tag+'x', []), .25)})"
          f" | downhill at cross {q(o.get(tag+'down', []))} | within 1.5 yd {100*sum(met)/max(1,len(met)):.0f}% at runner x p50 {q(o.get(tag+'meetx', []))}")
