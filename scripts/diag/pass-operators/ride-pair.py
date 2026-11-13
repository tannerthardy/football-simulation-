"""The ridden rusher (Integration, 2026-11-13, torso contact diagnosis). Same code on NFL tracking and sim exports
(common play format; no body orientation in it).

usage: python3 -I scripts/diag/pass-operators/ride-pair.py <plays.jsonl.gz> [...]

Dropbacks; frames from 0.5 s until the throw (or the play's end), ball in the QB's hands. Each DL/LB is paired, each
frame, with the nearest offensive lineman within 1.2 yd. Linemen: tackles are the two outermost at the snap, the
other three are interior. In the QB frame (the line from the QB to the blocker), dx is the rusher's offset along it
(+ = farther from the QB than the blocker: in front of him).

  - ridden: within 1.2 yd and dx <= +0.2 (level with the blocker or past him toward the QB: past his shoulder);
  - in front (a control, the ordinary engaged rep): within 1.2 yd and dx >= +0.5.

Per frame: the rusher's speed and its component toward the QB; the blocker's speed; the centre distance; the rusher's
path curvature (heading rate, deg/s, signed + toward the QB: flattening his path; - away: bent wide), from his
velocity two frames either side, when he moves >= 1.5 yd/s. Per episode (contiguous ridden frames of one pair): its
duration and how it ends (they come apart beyond 1.2 yd; the rusher back in front; the throw / play end).
Separations: a rusher within 1.2 yd of a lineman, then of none; counted by the state he was last in (front, between
(+0.2 < dx < +0.5) or ridden) and whether he then gets within 2 yd of the QB before the throw.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
NEAR, PAST, FRONT = 1.2, 0.2, 0.5


def heading(vx, vy): return math.atan2(vy, vx)


for path in sys.argv[1:]:
    F = {(c, s): [] for c in ('interior', 'tackle') for s in ('ridden', 'front')}
    E = {c: [] for c in ('interior', 'tackle')}
    SEP = {}  # (class, prior state, reached the QB) -> count
    GEO = {c: [] for c in ('interior', 'tackle')}  # at a separation from the ride: QB distance, heading off his line, time, left
    drop = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy'): continue
        p = Play(raw); ev = raw['events']; qbs = p.who('O', 'QB')
        if not qbs: continue
        qb = qbs[0]
        OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
        if len(OL) < 5: continue
        drop += 1
        ys = sorted(OL, key=lambda o: p.pos(o, 0)[1]); cls = {o: 'interior' for o in OL}; cls[ys[0]] = cls[ys[-1]] = 'tackle'
        fw = ev.get('pass_forward'); kend = min(p.frames - 2, p.k(fw if fw is not None else p.end))
        DLB = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
        for d in DLB:
            ep = None  # (blocker, start k)
            last = None  # (blocker, state) while within NEAR of a lineman
            for k in range(max(1, p.k(0.5)), kend + 1):
                rx, ry = p.pos(d, k); qx, qy = p.pos(qb, k)
                if rx is None or qx is None: break
                near = [(math.hypot(p.pos(o, k)[0] - rx, p.pos(o, k)[1] - ry), o) for o in OL if p.pos(o, k)[0] is not None]
                dist, o = min(near) if near else (99, None)
                state = None
                if o is not None and dist <= NEAR:
                    tx, ty = p.pos(o, k); lx, ly = tx - qx, ty - qy; ll = math.hypot(lx, ly) or 1e-6
                    dx = ((rx - tx) * lx + (ry - ty) * ly) / ll
                    state = 'ridden' if dx <= PAST else 'front' if dx >= FRONT else None
                    if state:
                        rvx, rvy = p.velocity(d, k); tvx, tvy = p.velocity(o, k)
                        rs = math.hypot(rvx, rvy); gx, gy = qx - rx, qy - ry; gl = math.hypot(gx, gy) or 1e-6
                        curv = None
                        a, b = p.velocity(d, max(0, k - 2)), p.velocity(d, min(p.frames - 1, k + 2))
                        if None not in a + b and min(math.hypot(*a), math.hypot(*b)) >= 1.5:
                            dh = math.atan2(math.sin(heading(*b) - heading(*a)), math.cos(heading(*b) - heading(*a))) / (4 * p.dt)
                            side = math.copysign(1, rvx * gy - rvy * gx)  # + when the QB is to his left of his motion
                            curv = math.degrees(dh) * side
                        F[(cls[o], state)].append({'rs': rs, 'tq': (rvx * gx + rvy * gy) / gl, 'ts': math.hypot(tvx, tvy),
                                                  'gap': dist, 'curv': curv})
                # separations: within NEAR of a lineman, then of none (he comes off his man)
                if o is not None and dist <= NEAR: last = (o, state or 'between')
                elif last is not None:
                    reach = any(p.pos(qb, j)[0] is not None and p.pos(d, j)[0] is not None and p.dist(d, qb, j) <= 2.0
                                for j in range(k, kend + 1))
                    key = (cls[last[0]], last[1], reach); SEP[key] = SEP.get(key, 0) + 1
                    if last[1] == 'ridden':
                        rvx, rvy = p.velocity(d, k); gx, gy = qx - rx, qy - ry; vs = math.hypot(rvx, rvy)
                        off = math.degrees(math.acos(max(-1, min(1, (rvx * gx + rvy * gy) / (vs * math.hypot(gx, gy) or 1e-6))))) if vs >= 1 else None
                        GEO[cls[last[0]]].append((math.hypot(gx, gy), off, k * p.dt, (kend - k) * p.dt, reach, vs))
                    last = None
                # episodes
                if state == 'ridden' and (ep is None or ep[0] != o):
                    if ep: E[cls[ep[0]]].append(((k - ep[1]) * p.dt, 'switch'))
                    ep = (o, k)
                elif state != 'ridden' and ep:
                    end = 'apart' if o is None or dist > NEAR or o != ep[0] else 'in front' if state == 'front' else 'other'
                    E[cls[ep[0]]].append(((k - ep[1]) * p.dt, end)); ep = None
            if ep: E[cls[ep[0]]].append(((kend + 1 - ep[1]) * p.dt, 'throw/end'))
    print(f"== {os.path.basename(path)}: dropbacks {drop}")
    for c in ('interior', 'tackle'):
        for s in ('ridden', 'front'):
            a = F[(c, s)]
            if len(a) < 10: continue
            C = [r['curv'] for r in a if r['curv'] is not None]
            print(f"   {c:8s} {s:6s} frames/100 dropbacks {100 * len(a) / max(1, drop):6.1f} | rusher speed p50 {q([r['rs'] for r in a]):.2f}"
                  f" (p75 {q([r['rs'] for r in a], .75):.2f}) toward QB {q([r['tq'] for r in a]):.2f} | blocker {q([r['ts'] for r in a]):.2f}"
                  f" | gap p25/50 {q([r['gap'] for r in a], .25):.2f}/{q([r['gap'] for r in a]):.2f} (< 0.65 yd {100 * sum(r['gap'] < 0.65 for r in a) / len(a):.0f}%) | curvature p25/50/75 {q(C, .25):+.0f}/{q(C):+.0f}/{q(C, .75):+.0f} deg/s")
        st = ('front', 'between', 'ridden'); tot = {x: SEP.get((c, x, True), 0) for x in st}
        print(f"   {c:8s} came off his man then within 2 yd of the QB before the throw, /100 dropbacks: "
              + ', '.join(f"from {x} {100 * tot[x] / max(1, drop):.1f}" for x in st)
              + f" | came off at all: " + ', '.join(f"{x} {100 * (tot[x] + SEP.get((c, x, False), 0)) / max(1, drop):.1f}" for x in st))
        for r, lab in ((True, 'reached'), (False, 'did not')):
            g = [x for x in GEO[c] if x[4] == r]
            if len(g) >= 5:
                print(f"   {c:8s} off the ride, {lab:7s} the QB (n {len(g)}): QB distance p50 {q([x[0] for x in g]):.2f} | heading off the line to the QB p50 "
                      f"{q([x[1] for x in g if x[1] is not None]):.0f} deg | speed {q([x[5] for x in g]):.2f} | at {q([x[2] for x in g]):.2f} s, throw {q([x[3] for x in g]):.2f} s later")
        e = E[c]
        if e:
            n = len(e); ends = {}
            for _, x in e: ends[x] = ends.get(x, 0) + 1
            print(f"   {c:8s} ridden episodes/100 dropbacks {100 * n / max(1, drop):.1f} | duration p50 {q([x for x, _ in e]):.2f} s"
                  f" p75 {q([x for x, _ in e], .75):.2f} | ends " + ', '.join(f"{k} {100 * v / n:.0f}%" for k, v in sorted(ends.items())))
