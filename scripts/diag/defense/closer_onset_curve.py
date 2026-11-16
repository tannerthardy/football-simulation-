"""The zone first arriver's closing and speed by time since his onset, one operator for NFL tracking and sim common-format exports (Tools, 2026-11-16; Integration's execution check on cue_onset.py's closers).
Population, first arriver and onset exactly as cue_onset.py (zone calls; completions caught 0-12 yd; pass_forward > 0.5 s; the first arriver is the defender nearest the target at the catch; underneath = 2-9 yd off the line at the
snap; onset = the start of his last run of closing above +0.5 yd/s that lasts to the throw, his velocity along the line to the target). Closers only (an onset found). For each frame since the onset (0 to 0.8 s, 10 Hz):
his closing and his speed (metrics.Play.speed, the +/-0.2 s central difference), p25 / p50 / p75 and n of closers whose run lasts that long; and the same values for the closers whose run lasts 0.5 s or more (the n does
not change along the row).
usage: python3 -I closer_onset_curve.py FILE [FILE ...] [--layer underneath|deep]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, coverage_family  # noqa: E402
layer_arg = sys.argv[sys.argv.index('--layer') + 1] if '--layer' in sys.argv else 'underneath'
files = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] != '--layer']
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else float('nan')
for path in files:
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'pass' or raw.get('target') is None: continue
        ev = raw.get('events') or {}; tc, tt = ev.get('catch'), ev.get('pass_forward')
        if tc is None or tt is None or tt <= 0.5: continue
        if coverage_family((raw.get('cell') or {}).get('coverage')) != 'zone': continue
        p = Play(raw); r = raw['target']; kc, kt = p.k(tc), p.k(tt)
        x = p.pos(r, kc)[0]
        if x is None or not (0 <= x <= 12): continue
        D = [d for d in p.who('D') if p.pos(d, kc)[0] is not None and p.pos(d, 0)[0] is not None]
        if len(D) < 2: continue
        f = min(D, key=lambda d: p.dist(d, r, kc)); d0 = p.pos(f, 0)[0]
        if d0 < 2: continue
        if ('underneath' if d0 < 9 else 'deep') != layer_arg: continue
        def close(k):
            (dx, dy), (rx, ry) = p.pos(f, k), p.pos(r, k)
            if dx is None or rx is None: return None
            vx, vy = p.velocity(f, k); L = math.hypot(rx - dx, ry - dy) or 1
            return (vx * (rx - dx) + vy * (ry - dy)) / L
        if (close(kt) or 0) <= 0.5: continue
        k = kt
        while k > 0 and (close(k - 1) or 0) > 0.5: k -= 1
        rows.append({'clo': [close(k + j) if 0 <= k + j <= kt else None for j in range(-4, 9)], 'spd': [p.speed(f, k + j) if 0 <= k + j <= kt else None for j in range(-4, 9)], 'len': (kt - k) * p.dt})
    print(f"== {path.split('/')[-1]} ({layer_arg}): {len(rows)} closers, run length to the throw p25/50/75 {q([r['len'] for r in rows], .25)}/{q([r['len'] for r in rows])}/{q([r['len'] for r in rows], .75)} s")
    for lab, R in (('all closers', rows), ('run >= 0.5 s', [r for r in rows if r['len'] >= 0.5 - 1e-9])):
        print(f"  {lab} (n {len(R)}); p50 by time since onset -0.4 .. +0.8 s (0.0 = onset)")
        for key, nm in (('clo', 'closing'), ('spd', 'speed')):
            col = lambda j: [r[key][j + 4] for r in R if r[key][j + 4] is not None]
            print(f"    {nm:8s} " + ' '.join(f"{q(col(j)):5.2f}" for j in range(-4, 9)) + "   n " + ' '.join(f"{len(col(j)):4d}" for j in range(-4, 9)))
