"""usage: python3 -I scripts/diag/pass-operators/press_stall.py <plays.jsonl.gz> [...]

Jam signature on pressed WR/corner pairs (same code for NFL and sim common format): in 0.1-0.9 s, the receiver
still behind the corner, centres within 1.5 yd (arm's length plus torsos) and over the next 0.2 s his speed does not
rise while under 4 yd/s - a stall at the corner's hands rather than a pass-by. Reports the rate, the release at 0.5 s (lateral and downfield from his stance, speed), first time, stall
duration, and depth at 1.5 s for stalled vs clean releases."""
import sys, os, json, gzip
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
for path in sys.argv[1:]:
    rows = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        p = Play(raw)
        if p.frames < 20: continue
        pl = raw['players']
        WR = [i for i, a in enumerate(pl) if a['side'] == 'O' and a['group'] == 'WR' and p.pos(i, 0)[0] is not None]
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        for r in WR:
            c = min(D, key=lambda d: p.dist(r, d, 0))
            if p.dist(r, c, 0) > 2.5: continue
            k2 = p.k(0.2); st = []
            for k in range(p.k(0.1), p.k(0.9) + 1):
                if k + k2 >= p.frames: break
                if p.pos(r, k)[0] < p.pos(c, k)[0] and p.dist(r, c, k) <= 1.5 and p.speed(r, k) < 4 and p.speed(r, k + k2) <= p.speed(r, k) + 0.1:
                    st.append(k)
            k15 = min(p.frames - 1, p.k(1.5)); k5 = p.k(0.5)
            rows.append(dict(dl=pl[c]['group'] in ('DL', 'DE', 'DT', 'NT', 'EDGE'), grp=pl[c]['group'], lat5=abs(p.pos(r, k5)[1] - p.pos(r, 0)[1]), x5=p.pos(r, k5)[0] - p.pos(r, 0)[0], s5=p.speed(r, k5), stall=bool(st), t=st[0] * p.dt if st else None, dur=len(st) * p.dt, x15=p.pos(r, k15)[0] - p.pos(r, 0)[0]))
    s = [o for o in rows if o['stall']]; n = [o for o in rows if not o['stall']]
    print(f'{os.path.basename(path)}: pressed pairs {len(rows)} | stalled at the corner {100*len(s)/max(1,len(rows)):.0f}% | first p50 {q([o["t"] for o in s]):.2f} s, '
          f'stall frames p50 {q([o["dur"] for o in s]):.2f} s | depth at 1.5 s stalled {q([o["x15"] for o in s]):.2f} vs clean {q([o["x15"] for o in n]):.2f}'
          f' | nearest a lineman {100*sum(o["dl"] for o in rows)/max(1,len(rows)):.0f}% of pairs, stalled {100*sum(o["dl"] and o["stall"] for o in rows)/max(1,sum(o["dl"] for o in rows)):.0f}%; others stalled {100*sum((not o["dl"]) and o["stall"] for o in rows)/max(1,sum(not o["dl"] for o in rows)):.0f}%'
          f' | at 0.5 s: lateral {q([o["lat5"] for o in rows]):.2f} yd, depth {q([o["x5"] for o in rows]):.2f} yd, speed {q([o["s5"] for o in rows]):.1f}')
