"""Where the linebackers are when the runner gets there, one operator for NFL
tracking and sim common plays. At the carrier's line crossing and when he
first reaches +5: each LB's depth relative to the carrier (+ = still ahead
of him), lateral offset |dy|, whether an offensive lineman/TE is within
NEAR yd (a proximity proxy for being blocked), and his lateral speed toward
the carrier's side. Bins: within 3 yd of the carrier, ahead within 6 yd
laterally, beaten (behind him), or wide (more than 6 yd laterally).
usage: lbspot.py FILE [--ytg60] [--concept iz|oz|gap]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
NEAR = 1.2
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = sys.argv[sys.argv.index('--concept') + 1] if '--concept' in sys.argv else None
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 1) if v else None
out = {}
n = {}
for line in gzip.open(path, 'rt'):
    raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
    if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
    if ytg is not None and raw.get('source') != 'sim' and ytg.get(raw['id'], 0) < 60: continue
    if want == 'gap':
        if raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') not in ('POWER', 'COUNTER', 'DUO', 'TRAP'): continue
    elif want and raw.get('source') != 'sim' and (raw.get('cell') or {}).get('concept') != {'iz': 'INSIDE ZONE', 'oz': 'OUTSIDE ZONE'}[want]: continue
    elif want and raw.get('source') == 'sim' and not raw['id'].startswith(want + '/'): continue
    p = Play(raw); c = raw['carrier']; end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    blockers = [i for i, pl in enumerate(p.players) if pl['side'] == 'O' and pl['group'] in ('OL', 'TE') and i != c]
    for ref in (0, 5):
        k = next((k for k in range(end + 1) if (p.pos(c, k)[0] or -99) >= ref), None)
        if k is None: continue
        n[ref] = n.get(ref, 0) + 1
        cx, cy = p.pos(c, k); cvy = p.velocity(c, k)[1]
        for d in p.who('D'):
            if p.players[d]['group'] != 'LB': continue
            x, y = p.pos(d, k)
            if x is None: continue
            dx, dy = x - cx, abs(y - cy)
            blocked = any(p.dist(d, b, k) <= NEAR for b in blockers)
            vy = p.velocity(d, k)[1] * (1 if cy >= y else -1)
            b = 'within3' if math.hypot(dx, y - cy) <= 3 else 'wide6+' if dy > 6 else 'ahead' if dx > 0 else 'beaten'
            r = out.setdefault((ref, b), {'n': 0, 'blk': 0, 'vy': [], 'dx': [], 'dy': []})
            r['n'] += 1; r['blk'] += blocked; r['vy'].append(vy); r['dx'].append(dx); r['dy'].append(dy)
print(path.split('/')[-1], want or '')
for ref in (0, 5):
    if not n.get(ref): continue
    print(f"  carrier at +{ref} (runs {n[ref]}): LBs per run " + ' | '.join(
        f"{b} {out[(ref, b)]['n']/n[ref]:.2f} (blocked {100*out[(ref, b)]['blk']/out[(ref, b)]['n']:.0f}%, dx {q(out[(ref, b)]['dx'])}, |dy| {q(out[(ref, b)]['dy'])}, vy->carrier {q(out[(ref, b)]['vy'])})"
        for b in ('within3', 'ahead', 'beaten', 'wide6+') if (ref, b) in out))
