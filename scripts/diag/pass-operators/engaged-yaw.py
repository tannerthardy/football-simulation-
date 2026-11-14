"""How an engaged tackle's facing moves against his rusher (Integration, 2026-11-14, the yaw diagnosis). Same code on NFL
tracking ('o') and sim exports with EXPORT_FACING=1.

usage: python3 -I scripts/diag/pass-operators/engaged-yaw.py <plays.jsonl.gz> [...]

Pairing as edge-rush.py (the outermost OL and the widest DL/LB rushing outside him). While engaged (within 1.2 yd, ball
in, from first contact for up to 1.5 s), per 0.1 s frame:
  - the tackle's facing rate |d(facing)/dt| (deg/s), from a 0.2 s centred difference;
  - the rate of the bearing from him to the rusher, |d(bearing)/dt| (deg/s);
  - the lag: the rusher off his chest (deg), signed + toward the rusher's motion around him;
  - how much of the bearing's swing his facing follows over 0.4 s windows (the slope of facing change on bearing change).
Limits: NFL 'o' is the shoulder-pad sensor (noisy, a few degrees); 0.1 s frames.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + 180) % 360 - 180


def pairs(p, raw):
    OL = [o for o in p.who('O', 'OL') if p.pos(o, 0)[0] is not None]
    if len(OL) < 5: return
    by = raw['ball_y']
    D = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] in ('DL', 'LB')]
    for side in (-1, 1):
        tk = max(OL, key=lambda o: side * (p.pos(o, 0)[1] - by)); ty0 = p.pos(tk, 0)[1]
        cand = []
        for d in D:
            x0, y0 = p.pos(d, 0)
            if x0 > 1.6: continue
            w = side * (y0 - ty0)
            if w < 0 or w > 4: continue
            k1 = min(p.k(1.0), p.frames - 1)
            if p.pos(d, k1)[0] is None or x0 - p.pos(d, k1)[0] < 1.0: continue
            cand.append((w, d))
        if cand: yield side, tk, max(cand)[1]


for path in sys.argv[1:]:
    rates, brates, lag, slopes = [], [], [], []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy') or not raw.get('o'): continue
        p = Play(raw); o = raw['o']; ev = raw['events']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw if fw is not None else p.end), len(o) - 1)
        for side, tk, d in pairs(p, raw):
            k0 = next((k for k in range(1, kend + 1) if p.pos(d, k)[0] is not None and p.pos(tk, k)[0] is not None and p.dist(tk, d, k) <= 1.2), None)
            if k0 is None: continue
            F, B = {}, {}
            for k in range(k0, min(kend, k0 + 15) + 1):
                if p.pos(d, k)[0] is None or p.pos(tk, k)[0] is None or o[k][tk] is None or p.dist(tk, d, k) > 1.2: break
                (rx, ry), (tx, ty) = p.pos(d, k), p.pos(tk, k)
                F[k] = o[k][tk]; B[k] = math.degrees(math.atan2(ry - ty, rx - tx))
            ks = sorted(F)
            for k in ks:
                if k - 1 in F and k + 1 in F:
                    rates.append(abs(wrap(F[k + 1] - F[k - 1])) / 0.2); brates.append(abs(wrap(B[k + 1] - B[k - 1])) / 0.2)
                    lag.append(abs(wrap(B[k] - F[k])))
            for k in ks:
                if k + 4 in F:
                    db = wrap(B[k + 4] - B[k])
                    if abs(db) >= 10: slopes.append(wrap(F[k + 4] - F[k]) / db)
    print(f"== {os.path.basename(path)}: engaged tackle frames {len(rates)}")
    print(f"   his facing rate p50/p90 {q(rates):.0f}/{q(rates, .9):.0f} deg/s | the bearing to the rusher's rate p50/p90 {q(brates):.0f}/{q(brates, .9):.0f} deg/s | rusher off his chest p50/p90 {q(lag):.0f}/{q(lag, .9):.0f} deg")
    print(f"   over 0.4 s windows where the bearing swings 10 deg or more (n {len(slopes)}): his facing follows p25/50/75 {q(slopes, .25):.2f}/{q(slopes):.2f}/{q(slopes, .75):.2f} of the swing")
