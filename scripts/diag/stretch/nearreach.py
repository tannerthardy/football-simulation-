"""Do front defenders near the runner at the line get to him? One operator
for NFL tracking and sim common plays. At the carrier's line crossing, every
DL/LB within R0 yd of him: whether an offensive lineman/TE is within NEAR yd
(blocked proxy), and whether he gets within REACH yd of the carrier in the
next WIN s. Also the carrier's progress over that window.
usage: nearreach.py FILE [--ytg60] [--concept iz|oz|gap]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
R0, NEAR, REACH, WIN = 3.0, 1.2, 1.2, 1.0
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
s = {}; runs = 0; gain = []; det = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if want == 'gap':
        if raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') not in ('POWER', 'COUNTER', 'DUO', 'TRAP'): continue
    elif want and raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') != {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE'}[want]: continue
    elif want and raw.get('source') == 'sim' and not raw['id'].startswith(want + '/'): continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    k0 = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= 0), None)
    if k0 is None: continue
    runs += 1
    k1 = min(end, k0 + int(WIN / p.dt)); gain.append((p.pos(c, k1)[0] or 0) - p.pos(c, k0)[0])
    blockers = [i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] in ('OL', 'TE', 'WR', 'FB', 'RB') and i != c]
    for d in p.who('D'):
        g = p.players[d]['group']
        if g not in ('DL', 'LB', 'DB') or p.dist(c, d, k0) > R0: continue
        blk = any(p.dist(d, b, k0) <= NEAR for b in blockers)
        got = any(p.dist(c, d, k) <= REACH for k in range(k0, k1 + 1))
        r = s.setdefault((g, blk), [0, 0]); r[0] += 1; r[1] += got
        (dx, dy), (cx, cy) = p.pos(d, k0), p.pos(c, k0); gap = math.hypot(cx - dx, cy - dy) or 1
        vd, vc = p.velocity(d, k0), p.velocity(c, k0)
        e = det.setdefault((g, blk), {'d0': [], 'min': [], 'toward': [], 'spd': [], 'rel': []})
        e['d0'].append(gap); e['min'].append(min(p.dist(c, d, k) for k in range(k0, k1 + 1)))
        e['toward'].append((vd[0] * (cx - dx) + vd[1] * (cy - dy)) / gap); e['spd'].append(math.hypot(*vd))
        e['rel'].append(dx - cx)
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
print(f"{path.split('/')[-1]} {want or ''} runs crossing {runs}; carrier gain over next {WIN}s p50 {q(gain)} p75 {q(gain,.75)}")
for g in ('DL', 'LB', 'DB'):
    print(f"  {g}: " + ' | '.join(f"{'blocked' if b else 'free'} {s.get((g, b), [0])[0]/runs:.2f}/run reach {100*s[(g, b)][1]/max(1, s[(g, b)][0]):.0f}%" for b in (False, True) if (g, b) in s))
for g in ('DL', 'LB'):
    for b in (False, True):
        e = det.get((g, b))
        if e: print(f"    {g} {'blocked' if b else 'free'}: dist at crossing p50 {q(e['d0'])}, min next {WIN}s p25/p50 {q(e['min'],.25)}/{q(e['min'])}, speed p50 {q(e['spd'])}, toward carrier p50 {q(e['toward'])}, depth rel carrier p50 {q(e['rel'])}")
