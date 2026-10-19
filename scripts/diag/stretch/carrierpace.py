"""Carrier pace through the second level, one operator for NFL tracking and
sim common plays. For runs reaching REACH yd: the carrier's speed when he
first reaches +2, +5, +8 and +12 yd, his own peak speed in the play, the
nearest defender's distance at each mark, and how many defenders are within
3 yd of him. usage: carrierpace.py FILE [REACH=10] [--ytg60]"""
import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
args = [a for a in sys.argv[1:] if not a.startswith('--')]
path, REACH = args[0], float(args[1]) if len(args) > 1 else 10.0
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
o = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    p = Play(raw); c = raw['carrier']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    if not any((p.pos(c, k)[0] or -99) >= REACH for k in range(end + 1)): continue
    o.setdefault('peak', []).append(max(p.speed(c, k) for k in range(end + 1)))
    for m in (2, 5, 8, 12):
        k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= m), None)
        if k is None: continue
        ds = [p.dist(c, d, k) for d in p.who('D')]
        o.setdefault(m, []).append(p.speed(c, k)); o.setdefault(f'n{m}', []).append(min(ds)); o.setdefault(f'c{m}', []).append(sum(1 for x in ds if x <= 3))
print(f"{path.split('/')[-1][:22]:22s} runs reaching {REACH:.0f}: {len(o.get('peak', []))}, own peak p50 {q(o.get('peak', []))}")
for m in (2, 5, 8, 12):
    print(f"  at +{m:2d}: speed p25/50/75 {q(o.get(m, []), .25)}/{q(o.get(m, []))}/{q(o.get(m, []), .75)} | nearest defender p50 {q(o.get(f'n{m}', []))} yd | within 3 yd p50 {q(o.get(f'c{m}', []))} (p75 {q(o.get(f'c{m}', []), .75)})")
