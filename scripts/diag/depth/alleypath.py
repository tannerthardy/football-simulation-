"""Deep run support along the run, one operator for NFL tracking and sim
common plays. Deep support = defenders 8+ yd off the ball and within 12 yd
of it laterally at the snap (as scripts/diag/long-run.py). For designed runs
whose carrier reaches 10 yd, at the frames he reaches 0, 5 and 10 yd: the
nearest deep supporter's depth relative to him (+ = still deeper than the
back), lateral offset, his speed toward the line, his speed across
toward the back, and his depth at the snap; split by whether the run reached 20.
usage: alleypath.py FILE [FILE...]"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
MARKS = (0, 5, 10)
for path in sys.argv[1:]:
    g = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('carrier') is None: continue
        p = Play(raw); c = raw['carrier']; by = raw.get('ball_y', 26.65)
        deep = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.pos(d, 0)[0] >= 8 and abs(p.pos(d, 0)[1] - by) <= 12]
        if not deep: continue
        ks = {}
        for k in range(p.frames):
            x = p.pos(c, k)[0]
            if x is None: continue
            for m in MARKS:
                if m not in ks and x >= m: ks[m] = k
        if 10 not in ks: continue
        reach20 = any(p.pos(c, k)[0] is not None and p.pos(c, k)[0] >= 20 for k in range(p.frames))
        o = g.setdefault('reach20' if reach20 else '10to19', {m: {'ahead': [], 'lat': [], 'down': [], 'across': [], 'snap': []} for m in MARKS})
        for m, k in ks.items():
            d = min(deep, key=lambda d: p.dist(d, c, k) if p.pos(d, k)[0] is not None else 99)
            if p.pos(d, k)[0] is None: continue
            (cx, cy), (dx, dy) = p.pos(c, k), p.pos(d, k); vx, vy = p.velocity(d, k)
            o[m]['ahead'].append(dx - cx); o[m]['lat'].append(abs(dy - cy)); o[m]['down'].append(-vx)
            o[m]['across'].append(vy * (1 if cy > dy else -1)); o[m]['snap'].append(p.pos(d, 0)[0])
    print(path.split('/')[-1][:26])
    for band in ('10to19', 'reach20'):
        o = g.get(band)
        if not o: continue
        print(f"  {band} (n {len(o[10]['ahead'])}): " + ' | '.join(f"back at {m}: (snap {q(o[m]['snap'])}) deeper {q(o[m]['ahead'])} lateral {q(o[m]['lat'])} downhill {q(o[m]['down'])} across {q(o[m]['across'])}" for m in MARKS))
