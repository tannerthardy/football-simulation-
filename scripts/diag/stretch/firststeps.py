"""Defenders' first second on runs: lateral displacement toward the play side
and depth change (+ = away from the line) at 0.5, 1.0 and 1.5 s after the
snap, by group, medians [p25, p75]. Same operator for NFL tracking (--ytg60;
play side from the carrier's lateral displacement at the handoff + 1 s) and
sim common plays (play side from the case id and the formation's strong side
via the carrier, likewise). Concept filter: NFL labels or sim id prefixes.
usage: firststeps.py FILE [--ytg60] [--concepts "outside zone"] [--offense]"""
import gzip, json, math, sys
path = sys.argv[1]
ytg = json.load(open('out/mechanics/nfl-ytg.json')) if '--ytg60' in sys.argv else None
want = [c for c in (sys.argv[sys.argv.index('--concepts') + 1].split(',') if '--concepts' in sys.argv else []) if c]
SIDE = 'O' if '--offense' in sys.argv else 'D'
q = lambda v, f: sorted(v)[min(len(v) - 1, int(f * len(v)))] if v else float('nan')
acc = {}
for line in gzip.open(path, 'rt'):
    r = json.loads(line); r = r.get('common', r)
    if r.get('kind') != 'run' or r.get('carrier') is None: continue
    if ytg is not None and r.get('source') != 'sim' and ytg.get(r['id'], 0) < 60: continue
    con = str((r.get('cell') or {}).get('concept') or '').lower()
    if want and not any(str(r['id']).lower().startswith(c + '/') or con == c for c in want): continue
    xy, dt, ev, c = r['xy'], r['dt'], r.get('events') or {}, r['carrier']
    h = ev.get('handoff')
    if h is None: continue
    k0, kh = 0, min(len(xy) - 1, int(round((h + 1) / dt)))
    if xy[kh][2 * c] is None or xy[k0][2 * c] is None: continue
    side = math.copysign(1, xy[kh][2 * c + 1] - xy[k0][2 * c + 1])
    # Attack direction from the offense's mean x versus the defense's.
    ox = [xy[0][2 * i] for i, p in enumerate(r['players']) if p['side'] == 'O' and xy[0][2 * i] is not None]
    dx = [xy[0][2 * i] for i, p in enumerate(r['players']) if p['side'] == 'D' and xy[0][2 * i] is not None]
    up = 1 if sum(dx) / len(dx) > sum(ox) / len(ox) else -1
    for i, p in enumerate(r['players']):
        if p['side'] != SIDE or xy[0][2 * i] is None: continue
        g = p['group']
        for t in (.5, 1., 1.5):
            k = int(round(t / dt))
            if k >= len(xy) or xy[k][2 * i] is None: continue
            a = acc.setdefault((g, t), {'lat': [], 'depth': []})
            a['lat'].append((xy[k][2 * i + 1] - xy[0][2 * i + 1]) * side)
            a['depth'].append((xy[k][2 * i] - xy[0][2 * i]) * up)
print(path.split('/')[-1][:28], ','.join(want))
for (g, t), a in sorted(acc.items()):
    print(f"  {g:3s} {t:.1f}s  lat {q(a['lat'], .5):+.2f} [{q(a['lat'], .25):+.2f},{q(a['lat'], .75):+.2f}]  depth {q(a['depth'], .5):+.2f} [{q(a['depth'], .25):+.2f},{q(a['depth'], .75):+.2f}]  n {len(a['lat'])}")
