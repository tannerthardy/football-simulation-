"""C14: what the defender is doing at the catch point, and why open throws fail (same code, NFL and sim).

usage: python3 -I scripts/diag/pass-operators/catchpoint.py [--ball out/mechanics/nfl-ball.jsonl.gz] <plays.jsonl.gz> [...]

Throws: forward passes with a target, not thrown away (the source's own call, as hit-throws.py). Openness at the
release = the target's separation from the nearest defender: tight < 1.5, mid 1.5-3, open >= 3 (hit-throws.py bins).
Arrival frame ka and landing point B: hit-throws.py's rule (pass_arrived, nearest of it and its +-0.1 s neighbours,
else the ball's nearest approach to the target). On target = the incoming flight line (the ball 0.3 s and 0.1 s before
arrival) passes within 1.5 yd of the target at arrival (not B, which a catcher already holds).
At arrival, the defender nearest the target: his distance to the target (dR) and to B (dB), and where he is along
the ball's incoming direction (ball 0.2 s before arrival -> B), relative to the target: 'front' (> 0.5 yd toward the
ball: between it and the receiver), 'behind' (< -0.5 yd: trailing / over the top on the far side), else 'level'.
Contact proxy: tracking has no arms, so 'close' = his centre within 1.0 yd of the target's at any frame of the last
0.5 s before arrival (two torsos about touching; hand fighting itself is not visible).
Result: complete / int / incomplete; incompletions typed as in hit-throws.py (defended / off target / catchable not
caught). NFL passDefensed is the cross-check label."""
import gzip, json, math, os, sys, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
WIDTH = 160 / 3


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
        # On target from the incoming flight line (the ball 0.3 s and 0.1 s before arrival) at closest approach to the
        # target, not the ball at the arrival frame: a caught ball is in the catcher's hands there and a missed one is
        # not, which sorts the measure by the outcome.
        k1, k0 = max(kf, ka - 3), max(kf, ka - 1)
        (ax_, ay_), (ex_, ey_) = bxy[k1], bxy[k0]; lx, ly = ex_ - ax_, ey_ - ay_; LL = lx * lx + ly * ly
        if k0 > k1 and LL >= 0.01:
            u = ((tx - ax_) * lx + (ty - ay_) * ly) / LL
            o['miss'] = math.hypot(ax_ + u * lx - tx, ay_ + u * ly - ty)
        else:
            o['miss'] = math.hypot(B[0] - tx, B[1] - ty)
        d = min(Da, key=lambda d: p.dist(t, d, ka)); dx, dy = p.pos(d, ka)
        o['dR'] = p.dist(t, d, ka); o['dB'] = math.hypot(dx - B[0], dy - B[1])
        k2 = max(kf, ka - int(round(0.2 / p.dt))); P0 = bxy[k2]
        ux, uy = B[0] - P0[0], B[1] - P0[1]; L = math.hypot(ux, uy)
        if L < 0.3: rx, ry = bxy[kf]; ux, uy = B[0] - rx, B[1] - ry; L = math.hypot(ux, uy) or 1
        along = -((dx - tx) * ux + (dy - ty) * uy) / L
        o['pos'] = 'front' if along > 0.5 else 'behind' if along < -0.5 else 'level'
        k5 = max(kf, ka - int(round(0.5 / p.dt)))
        o['close'] = any(p.pos(d, k)[0] is not None and p.pos(t, k)[0] is not None and p.dist(t, d, k) <= 1.0 for k in range(k5, ka + 1))
        o['depth'] = tx
        if 'catch' in ev: res = 'complete'
        elif (side['int'] if side is not None else labels.get('interception')): res = 'int'
        else: res = 'incomplete'
        o['res'] = res
        if res == 'incomplete':
            dball = min(math.hypot(p.pos(x, ka)[0] - B[0], p.pos(x, ka)[1] - B[1]) for x in Da)
            o['inc'] = 'defended' if dball <= 1.0 and dball < o['miss'] else 'off target' if o['miss'] > 1.5 else 'catchable not caught'
        o['pd'] = bool(side['pbu']) if side is not None else any(e in ('pbu', 'deflection') for e in labels.get('ballEvents', []))
        yield o


def main():
    args = sys.argv[1:]; ball = None
    if args and args[0] == '--ball':
        ball = {}
        for line in gzip.open(args[1], 'rt'):
            r = json.loads(line); ball[r['id']] = r
        args = args[2:]
    for path in args:
        R = list(rows(path, ball))
        comp = lambda v: f"{100 * sum(r['res'] == 'complete' for r in v) / len(v):3.0f}% (n {len(v)})" if v else '   -'
        print(f"== {os.path.basename(path)}: {len(R)} targeted throws (throwaways out)")
        for op in ('tight', 'mid', 'open'):
            v = [r for r in R if r['open'] == op]; on = [r for r in v if r['miss'] <= 1.5]
            print(f"  [{op}] all {comp(v)} | on target {comp(on)} | INT {100 * sum(r['res'] == 'int' for r in v) / max(1, len(v)):.1f}% | passes defended (label) {100 * sum(r['pd'] for r in v) / max(1, len(v)):.0f}%")
            inc = collections.Counter(r['inc'] for r in v if r['res'] == 'incomplete')
            print(f"      incompletions per 100 throws: " + '  '.join(f"{k} {100 * n / len(v):.0f}" for k, n in inc.most_common()) + f"  | INT {100 * sum(r['res'] == 'int' for r in v) / len(v):.1f}")
            print(f"      on-target throws by the nearest defender at arrival:")
            for lo, hi in ((0, 0.75), (0.75, 1.5), (1.5, 3), (3, 99)):
                w = [r for r in on if lo <= r['dR'] < hi]
                pos = collections.Counter(r['pos'] for r in w)
                print(f"        dR {lo}-{hi} yd: share {100 * len(w) / max(1, len(on)):3.0f}%  comp {comp(w)}  | front {comp([r for r in w if r['pos'] == 'front'])} level {comp([r for r in w if r['pos'] == 'level'])} behind {comp([r for r in w if r['pos'] == 'behind'])}")
            print(f"      on target, torsos within 1.0 yd in the last 0.5 s: share {100 * sum(r['close'] for r in on) / max(1, len(on)):.0f}%, comp {comp([r for r in on if r['close']])}; not close comp {comp([r for r in on if not r['close']])}")
        print("  completion by depth x openness (all throws):")
        for lo, hi in ((-99, 10), (10, 20), (20, 99)):
            print(f"    depth {lo}-{hi}: " + '  '.join(f"{op} {comp([r for r in R if r['open'] == op and lo <= r['depth'] < hi])}" for op in ('tight', 'mid', 'open')))


main()
