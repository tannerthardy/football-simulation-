"""Pulling linemen on POWER/COUNTER/TRAP: the OL who moves farthest toward the
play side behind the line in the first 1.5 s. Lateral distance by 0.5/1.0/1.5 s,
peak speed and depth. Same operator for NFL and sim (common play format).
python3 -I scripts/diag/runblock/pullers.py LABEL=plays.jsonl.gz ..."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1)
    lat = {5: [], 10: [], 15: []}; peak = []; depth = []; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or (raw.get('cell') or {}).get('concept') not in ('POWER', 'COUNTER', 'power', 'counter'): continue
        p = Play(raw); c = raw.get('carrier')
        if c is None or p.frames < 16: continue
        # play side: where the carrier is at first contact or end, relative to the ball
        ke = p.k(raw['events'].get('first_contact', p.end))
        ce = p.pos(c, ke)
        if ce[0] is None: continue
        side = 1 if ce[1] - raw['ball_y'] > 0 else -1
        best = None
        for i in p.who('O', 'OL'):
            a, b = p.pos(i, 0), p.pos(i, 10)
            if a[0] is None or b[0] is None: continue
            m = (b[1] - a[1]) * side
            if best is None or m > best[0]: best = (m, i)
        if best is None or best[0] < 1.0: continue  # nobody pulled
        i = best[1]; n += 1
        a = p.pos(i, 0)
        for k in lat:
            pk = p.pos(i, min(k, p.frames - 1))
            if pk[0] is not None: lat[k].append((pk[1] - a[1]) * side)
        peak.append(max(p.speed(i, k) for k in range(1, min(16, p.frames - 2))))
        depth.append(min(p.pos(i, k)[0] for k in range(0, min(16, p.frames)) if p.pos(i, k)[0] is not None))
    print(f"{label:8} pullers n={n} | lateral by 0.5s {q(lat[5],.5):.1f} 1.0s {q(lat[10],.5):.1f} 1.5s {q(lat[15],.5):.1f} yd | peak speed p50 {q(peak,.5):.1f} p90 {q(peak,.9):.1f} yd/s | deepest depth p50 {q(depth,.5):+.1f}")
