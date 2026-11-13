"""usage: python3 -I scripts/diag/pass-operators/edge_release.py <plays.jsonl.gz> [...]

WRs whose nearest defender at the snap is a defensive lineman within 2.5 yd (same code for NFL and sim). Per pair:
the lineman's lateral motion relative to the WR over 0-0.6 s (+ = toward him), the WR's lateral move by 0.5 s and
which side of the lineman he ends on at 1.0 s (the side the lineman was moving to, or away), closest centres in
1.0 s, bodies touching (centres < 0.8 yd), and press_stall.py's stall."""
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
        if p.frames < 22: continue
        pl = raw['players']
        D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None]
        for r, a in enumerate(pl):
            if a['side'] != 'O' or a['group'] != 'WR' or p.pos(r, 0)[0] is None or not D: continue
            c = min(D, key=lambda d: p.dist(r, d, 0))
            if p.dist(r, c, 0) > 2.5 or pl[c]['group'] != 'DL': continue
            k6, k5, k10, k2 = p.k(0.6), p.k(0.5), p.k(1.0), p.k(0.2)
            lat0 = p.pos(c, 0)[1] - p.pos(r, 0)[1]; s0 = 1 if lat0 >= 0 else -1  # side of the lineman, from the WR
            dl_move = p.pos(c, k6)[1] - p.pos(c, 0)[1]; wr_move = p.pos(r, k6)[1] - p.pos(r, 0)[1]
            toward = -s0 * (dl_move - wr_move) / 0.6
            lat10 = p.pos(r, k10)[1] - p.pos(c, k10)[1]
            # the WR ends on the side the lineman moved toward (crossed his path) or away from it
            crossed = (lat10 * dl_move > 0) if abs(dl_move) > 0.2 else None
            closest = min(p.dist(r, c, k) for k in range(0, k10 + 1))
            stall = any(p.pos(r, k)[0] < p.pos(c, k)[0] and p.dist(r, c, k) <= 1.5 and p.speed(r, k) < 4 and p.speed(r, k + k2) <= p.speed(r, k) + 0.1
                        for k in range(p.k(0.1), p.k(0.9) + 1) if k + k2 < p.frames)
            rows.append(dict(toward=toward, dl_lat=abs(dl_move) / 0.6, wr_lat5=abs(p.pos(r, k5)[1] - p.pos(r, 0)[1]), crossed=crossed,
                             closest=closest, touch=closest < 0.8, stall=stall, lat0=abs(lat0), ahead0=p.pos(c, 0)[0] - p.pos(r, 0)[0]))
    n = max(1, len(rows)); cr = [o for o in rows if o['crossed'] is not None]
    print(f'== {os.path.basename(path)}: WR next to a lineman n {len(rows)} | at the snap lineman ahead {q([o["ahead0"] for o in rows]):.2f}, lateral {q([o["lat0"] for o in rows]):.2f}')
    print(f'   lineman lateral speed 0-0.6 s {q([o["dl_lat"] for o in rows]):.2f} yd/s, closing on the WR {100*sum(o["toward"] > 0.3 for o in rows)/n:.0f}% (p50 {q([o["toward"] for o in rows]):+.2f}) | WR lateral by 0.5 s {q([o["wr_lat5"] for o in rows]):.2f}')
    print(f'   WR ends on the side the lineman moved to {100*sum(o["crossed"] for o in cr)/max(1,len(cr)):.0f}% (of {len(cr)} with lineman motion) | closest p50 {q([o["closest"] for o in rows]):.2f} | touching {100*sum(o["touch"] for o in rows)/n:.0f}% | stalled {100*sum(o["stall"] for o in rows)/n:.0f}%')
    for lab, v in (('lineman closing', [o for o in rows if o['toward'] > 0.3]), ('not closing', [o for o in rows if o['toward'] <= 0.3])):
        print(f'     {lab:16} n {len(v):4} | touching {100*sum(o["touch"] for o in v)/max(1,len(v)):3.0f}% | stalled {100*sum(o["stall"] for o in v)/max(1,len(v)):3.0f}% | WR lateral by 0.5 s {q([o["wr_lat5"] for o in v]):.2f}')
