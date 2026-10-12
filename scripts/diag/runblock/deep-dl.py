"""Engaged-proxy DL deeper than 1 yd into the backfield at 3.0 s (within 1.5 yd
of an OL, same proxy as the shared metric): how far are they laterally from the
carrier then? Far = washed out of the play; near = in it."""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play
q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for arg in sys.argv[1:]:
    label, path = arg.split('=', 1); lat = []; n = deep = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); c = raw.get('carrier')
        if raw['kind'] != 'run' or c is None: continue
        p = Play(raw); k = 30
        if not p.live(3.0): continue
        cp = p.pos(c, k)
        if cp[0] is None: continue
        for d in p.box_defenders():
            dp = p.pos(d, k)
            if dp[0] is None or min(p.dist(d, o, k) for o in p.who('O', 'OL')) > 1.5: continue
            n += 1
            if dp[0] < -1: deep += 1; lat.append(math.hypot(dp[0] - cp[0], dp[1] - cp[1]))
    print(f"{label:10} engaged-proxy DL at 3s: {n}, deeper than 1 yd: {deep/max(1,n):.2f} | their distance to carrier p25/p50/p75 {q(lat,.25):.1f}/{q(lat,.5):.1f}/{q(lat,.75):.1f} | within 2 yd of carrier {sum(x<2 for x in lat)/max(1,n):.2f} of all")
