"""Where a tight ball arrives (same code, NFL and sim): relative to the receiver and to the nearest defender, and
completion as a function of that offset. Arrival frame: catchpoint.py's rule (pass_arrived, nearest of it and its +-0.1 s neighbours). The ball's placement is
its incoming flight line (0.3 s and 0.1 s before arrival) at closest approach to the receiver at arrival, so it does not
depend on whether he caught it. Throws: targeted, not thrown away; tight = nearest defender < 1.5 yd at the release
(hit-throws.py bins); also the trailing in-phase population of trail.py (nearest defender 1-2 yd at arrival, behind
the receiver along his run, >= 3 yd/s within 45 deg of his heading). Per throw: B's distance from the receiver's
centre ('offset'), its components along / across his run, and its side relative to the defender ('toward' the
defender: the component of B - R along R -> D > 0.3 yd; 'away' < -0.3; else 'middle'). Completion by offset bin and
side. Tracking has no hands: the offset is the ball against the body centre, the same on both sides.

usage: python3 -I scripts/diag/pass-operators/placement.py [--ball nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
def rows(path, ball):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass': continue
        ev = raw.get('events', {})
        if ev.get('pass_forward') is None or raw.get('target') is None: continue
        side = ball.get(raw['id']) if ball is not None else None
        if ball is not None and side is None: continue
        bxy = side['b'] if side is not None else raw.get('bxy')
        labels = side if side is not None else raw.get('labels', {})
        if not bxy: continue
        away = (not side['namedReceiver']) if side is not None else bool(labels.get('throwaway'))
        if away: continue
        p = Play(raw); t = raw['target']; kf = p.k(ev['pass_forward'])
        if kf >= len(bxy) or p.pos(t, kf)[0] is None: continue
        D = [d for d in p.who('D') if p.pos(d, kf)[0] is not None]
        if not D: continue
        ka = min(p.k(ev.get('pass_arrived', ev.get('end'))), len(bxy) - 1, p.frames - 1)
        if ka == len(bxy) - 1 and ka > kf + 1 and abs(bxy[ka][0]) < 0.05 and abs(bxy[ka][1] - raw['ball_y']) < 0.05: ka -= 1
        if 'pass_arrived' not in ev:
            ks = [k for k in range(min(kf + 3, ka), ka + 1) if p.pos(t, k)[0] is not None]
            if ks: ka = min(ks, key=lambda k: math.hypot(bxy[k][0] - p.pos(t, k)[0], bxy[k][1] - p.pos(t, k)[1]))
        else:
            ks = [k for k in (ka - 1, ka, ka + 1) if kf < k < len(bxy) and k < p.frames and p.pos(t, k)[0] is not None]
            if ks: ka = min(ks, key=lambda k: math.hypot(bxy[k][0] - p.pos(t, k)[0], bxy[k][1] - p.pos(t, k)[1]))
        if p.pos(t, ka)[0] is None or ka <= kf: continue
        Da = [d for d in D if p.pos(d, ka)[0] is not None]
        if not Da: continue
        ts = min(p.dist(t, d, kf) for d in D)
        o = {'open': 'tight' if ts < 1.5 else 'mid' if ts < 3 else 'open', 'tsep': ts}
        B = bxy[ka]; tx, ty = p.pos(t, ka)
        o['miss'] = math.hypot(B[0] - tx, B[1] - ty)
        d = min(Da, key=lambda d: p.dist(t, d, ka)); dx, dy = p.pos(d, ka)
        o['dR'] = p.dist(t, d, ka); o['dB'] = math.hypot(dx - B[0], dy - B[1])
        k2 = max(kf, ka - int(round(0.2 / p.dt))); P0 = bxy[k2]
        ux, uy = B[0] - P0[0], B[1] - P0[1]; L = math.hypot(ux, uy)
        if L < 0.3: rx, ry = bxy[kf]; ux, uy = B[0] - rx, B[1] - ry; L = math.hypot(ux, uy) or 1
        along = -((dx - tx) * ux + (dy - ty) * uy) / L
        o['comp'] = 'catch' in ev
        vx, vy = p.velocity(t, ka); s = math.hypot(vx, vy)
        ux2, uy2 = (vx / s, vy / s) if s > 0.5 else (1.0, 0.0)
        # Outcome-independent placement: the incoming flight line (the ball 0.3 s and 0.1 s before arrival) at its
        # closest approach to the receiver's position at arrival. A caught ball is in his hands at arrival, an
        # incompletion is not, so the arrival frame itself would sort the offset by the outcome.
        k1, k0 = max(kf, ka - 3), max(kf, ka - 1)
        if k0 <= k1: continue
        ax_, ay_ = bxy[k1]; ex, ey = bxy[k0]; lx, ly = ex - ax_, ey - ay_; LL = lx * lx + ly * ly
        if LL < 0.01: continue
        u = ((tx - ax_) * lx + (ty - ay_) * ly) / LL
        cx_, cy_ = ax_ + u * lx, ay_ + u * ly
        o['miss'] = math.hypot(cx_ - tx, cy_ - ty)
        bx, by = cx_ - tx, cy_ - ty
        o['along'] = bx * ux2 + by * uy2; o['across'] = abs(-bx * uy2 + by * ux2)
        rd = o['dR'] or 1
        tow = (bx * (dx - tx) + by * (dy - ty)) / rd
        o['side'] = 'toward' if tow > 0.3 else 'away' if tow < -0.3 else 'middle'
        dvx, dvy = p.velocity(d, ka); ds = math.hypot(dvx, dvy)
        dal = ((dx - tx) * ux2 + (dy - ty) * uy2)
        o['trail'] = 1 <= o['dR'] < 2 and s >= 2 and dal < -0.5 and ds >= 3 and (dvx * ux2 + dvy * uy2) / ds >= math.cos(math.radians(45))
        yield o

def main():
    args = sys.argv[1:]; ball = None
    if args and args[0] == '--ball':
        ball = {}
        for l in gzip.open(args[1], 'rt'):
            b = json.loads(l); ball[b['id']] = b
        args = args[2:]
    BINS = ((0, .5), (.5, 1), (1, 1.5), (1.5, 2.5), (2.5, 99))
    for path in args:
        R = list(rows(path, ball if 'nfl' in os.path.basename(path) else None))
        print(f'== {os.path.basename(path)}: {len(R)} throws')
        for lab, v in (('tight', [o for o in R if o['open'] == 'tight']), ('trailing 1-2 yd', [o for o in R if o['trail']]), ('all', R)):
            if not v: continue
            print(f"  [{lab}] n {len(v)} completion {100*sum(o['comp'] for o in v)/len(v):.0f}% | ball off his centre p25/p50/p75 {q([o['miss'] for o in v],.25):.2f}/{q([o['miss'] for o in v]):.2f}/{q([o['miss'] for o in v],.75):.2f} yd "
                  f"(along {q([o['along'] for o in v]):+.2f}, across {q([o['across'] for o in v]):.2f}) | side toward/middle/away {100*sum(o['side']=='toward' for o in v)/len(v):.0f}/{100*sum(o['side']=='middle' for o in v)/len(v):.0f}/{100*sum(o['side']=='away' for o in v)/len(v):.0f}%")
            print('     offset ' + ' | '.join(f"{a}-{b if b < 99 else '+'}: {100*len(w)/len(v):.0f}% of throws, comp {100*sum(o['comp'] for o in w)/len(w):.0f}% (n {len(w)})" for a, b in BINS for w in [[o for o in v if a <= o['miss'] < b]] if w))
            print('     side   ' + ' | '.join(f"{sd}: comp {100*sum(o['comp'] for o in w)/len(w):.0f}% (n {len(w)}, offset p50 {q([o['miss'] for o in w]):.2f})" for sd in ('toward', 'middle', 'away') for w in [[o for o in v if o['side'] == sd]] if w))

main()
