"""Secondary structure on runs, one operator for NFL tracking and sim common
plays: the two deepest defenders' depth past the line at the snap, at the
handoff + 0.5 s and when the carrier crosses the line; their downhill speed
(yd/s toward the line) at the crossing; and, when the carrier first reaches
REF yd, how many defenders are ahead of him and how far behind him the
nearest beaten ones are. usage: dbdepth.py FILE [REF=10] [--ytg60] [--sim-form F]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--') and not a.startswith('gun') and not a.startswith('ace') and not a.startswith('i_') and not a.startswith('pis')]
path, REF = args[0], float(args[1]) if len(args) > 1 else 10.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if raw.get('source') == 'sim' and opt('--sim-form') and not raw['id'].split('/')[2].startswith(opt('--sim-form')): continue
    p = Play(raw); c = raw['carrier']; ev = raw.get('events') or {}
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
    if len(D) < 11: continue
    deep = sorted(D, key=lambda d: -p.pos(d, 0)[0])[:2]
    kx = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    kh = p.k(ev['handoff'] + .5) if ev.get('handoff') is not None else None
    for tag, k in (('snap', 0), ('h+.5', kh), ('cross', kx)):
        if k is None or k > end: continue
        for r, d in enumerate(deep): o.setdefault(f'{tag}{r}', []).append(p.pos(d, k)[0])
    if kx is not None:
        for r, d in enumerate(deep):
            k0, k1 = max(0, kx - 2), min(end, kx + 2)
            o.setdefault(f'down{r}', []).append((p.pos(d, k0)[0] - p.pos(d, k1)[0]) / ((k1 - k0) * p.dt or 1))
    kr = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= REF), None)
    if kr is not None:
        cx = p.pos(c, kr)[0]
        rel = [p.pos(d, kr)[0] - cx for d in D if p.pos(d, kr)[0] is not None]
        o.setdefault('ahead', []).append(sum(1 for r in rel if r > 0))
        o.setdefault('behind1', []).append(sum(1 for r in rel if -3 < r <= 0))
        o.setdefault('deepAtSnapAhead', []).append(sum(1 for d in deep if p.pos(d, kr)[0] > cx))
        o.setdefault('deepRel', []).extend(p.pos(d, kr)[0] - cx for d in deep)
    o.setdefault('n', []).append(1)
print(f"{path.split('/')[-1][:22]:22s} runs {len(o.get('n', []))}")
for tag in ('snap', 'h+.5', 'cross'):
    print(f"  deepest two at {tag:5s}: depth p50 {q(o.get(tag+'0', []))} / {q(o.get(tag+'1', []))}  (p25 {q(o.get(tag+'0', []), .25)} / {q(o.get(tag+'1', []), .25)})")
print(f"  downhill speed at crossing: deepest {q(o.get('down0', []))} second {q(o.get('down1', []))} yd/s (p75 {q(o.get('down0', []), .75)} / {q(o.get('down1', []), .75)})")
print(f"  at +{REF:.0f}: n {len(o.get('ahead', []))} defenders ahead p50 {q(o.get('ahead', []))} (p25 {q(o.get('ahead', []), .25)}), within 3 yd behind p50 {q(o.get('behind1', []))} | snap-deepest two still ahead p50 {q(o.get('deepAtSnapAhead', []))}, their x rel carrier p25/50/75 {q(o.get('deepRel', []), .25)}/{q(o.get('deepRel', []))}/{q(o.get('deepRel', []), .75)}")
