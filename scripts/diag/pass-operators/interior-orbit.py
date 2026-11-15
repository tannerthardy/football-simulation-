"""How far an engaged interior pair rotates over a block (Integration / Flex, 2026-11-14, PRESS_SPRING's run gain: with one
hands joint our interior pairs orbit 60-80 deg over a block, with two shared springs about 15). Same code on NFL tracking
('o' = shoulder pads) and sim exports (EXPORT_FACING=1).

usage: python3 -I scripts/diag/pass-operators/interior-orbit.py <plays.jsonl.gz> [...] [--kind run|pass]

Pairs: each interior OL (the three middle linemen by alignment) and the nearest DL within 1.2 yd at his first such frame
(from the snap + 0.2 s); engaged while they stay within 1.2 yd, up to 1.5 s, ending at the handoff + 1.5 s or the throw.
NFL (BDB, out/mechanics/nfl-plays.jsonl.gz): runs orbit p25/50/75/90 25/51/87/126 deg (15,954 pairs); pass sets
18/39/70/107 (23,385). A standing witness for any contact change (Integration, 2026-11-14).
Per pair: the engagement's length, the net change of the bearing from the blocker to the defender (the pair's orbit), the
net change of each man's facing, and the largest |orbit| reached.
"""
import sys, os, json, gzip, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
wrap = lambda a: (a + 180) % 360 - 180
args = [a for a in sys.argv[1:] if not a.startswith('--')]
kind = 'run'
if '--kind' in sys.argv: kind = sys.argv[sys.argv.index('--kind') + 1]
for path in args:
    if path in ('run', 'pass'): continue
    L, orbit, fb, fd, maxo = [], [], [], [], []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != kind or not raw.get('xy') or not raw.get('o'): continue
        p = Play(raw); o = raw['o']
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        if len(OL) < 5: continue
        DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] == 'DL']
        kend = min(p.frames - 1, len(o) - 1)
        for b in OL[1:4]:
            k0 = None; d = None
            for k in range(p.k(0.2), min(kend, p.k(2.5)) + 1):
                if p.pos(b, k)[0] is None: continue
                c = [(p.dist(b, x, k), x) for x in DL if p.pos(x, k)[0] is not None]
                c = [x for x in c if x[0] <= 1.2]
                if c: k0 = k; d = min(c)[1]; break
            if k0 is None: continue
            def brg(k):
                (bx, by), (dx, dy) = p.pos(b, k), p.pos(d, k); return math.degrees(math.atan2(dy - by, dx - bx))
            ks = [k0]
            for k in range(k0 + 1, min(kend, k0 + 15) + 1):
                if p.pos(b, k)[0] is None or p.pos(d, k)[0] is None or o[k][b] is None or o[k][d] is None or p.dist(b, d, k) > 1.2: break
                ks.append(k)
            if len(ks) < 3 or o[k0][b] is None or o[k0][d] is None: continue
            k1 = ks[-1]; acc = 0; mo = 0; prev = brg(k0)
            for k in ks[1:]:
                cur = brg(k); acc += wrap(cur - prev); prev = cur; mo = max(mo, abs(acc))
            L.append((k1 - k0) * p.dt); orbit.append(abs(acc)); maxo.append(mo)
            fb.append(abs(wrap(o[k1][b] - o[k0][b]))); fd.append(abs(wrap(o[k1][d] - o[k0][d])))
    print(f"== {os.path.basename(path)} ({kind}): engaged interior pairs {len(L)} | engaged p50 {q(L):.1f} s")
    print(f"   the pair's orbit (net bearing change) p25/50/75/90 {q(orbit, .25):.0f}/{q(orbit):.0f}/{q(orbit, .75):.0f}/{q(orbit, .9):.0f} deg | largest reached p50 {q(maxo):.0f}")
    print(f"   net facing change: blocker p50/p90 {q(fb):.0f}/{q(fb, .9):.0f} deg, defender {q(fd):.0f}/{q(fd, .9):.0f} deg")
