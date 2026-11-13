"""Achieved heading changes per second by position (Integration for the owner, 2026-11-12: commitment). The request
is not in tracking; its consequence is. Same code on NFL tracking and sim exports (common play format).

usage: python3 -I scripts/diag/pass-operators/heading-change.py <plays.jsonl.gz> [...]

Every player, every frame from the snap to the end of the play at which he moves faster than 1.5 yd/s now and 0.1 s
before (headings from metrics.Play.velocity, a centred 0.2 s difference, positions quantised to 0.1 yd both sides):
  - direction changes: heading change over 20 deg in 0.1 s, per second of moving time;
  - reversals: over 120 deg in 0.3 s;
  - wobble: a change over 20 deg followed within 0.3 s by one back the other way (the consequence of dither);
  - turn flips: the heading rate (deg/s over 0.1 s) changes sign with |rate| > 30 deg/s on both sides, per second
    (a finer view of the same thing; the 20-deg counts are rare on both sides at 0.1 s).
By position group. Limits: 0.1 s frames, 0.1 yd quantisation (noise near 1.5 yd/s), centred differences smooth fast turns.
"""
import sys, os, json, gzip, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa

def d(a, b): return abs((math.degrees(b - a) + 180) % 360 - 180)
def sd(a, b): return (math.degrees(b - a) + 180) % 360 - 180

for path in sys.argv[1:]:
    T = C.Counter(); ch = C.Counter(); rev = C.Counter(); wob = C.Counter(); flip = C.Counter()
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if not raw.get('xy'): continue
        p = Play(raw); kend = min(p.frames - 1, p.k(p.end))
        for i, pl in enumerate(p.players):
            g = pl['group']; hd = []
            for k in range(1, kend + 1):
                vx, vy = p.velocity(i, k)
                hd.append(math.atan2(vy, vx) if math.hypot(vx, vy) > 1.5 else None)
            for j in range(1, len(hd)):
                if hd[j] is None or hd[j - 1] is None: continue
                T[g] += p.dt
                s1 = sd(hd[j - 1], hd[j])
                if abs(s1) > 20:
                    ch[g] += 1
                    for m in range(j + 1, min(len(hd), j + 4)):
                        if hd[m] is None or hd[m - 1] is None: break
                        s2 = sd(hd[m - 1], hd[m])
                        if abs(s2) > 20 and s2 * s1 < 0: wob[g] += 1; break
                if j >= 3 and hd[j - 3] is not None and d(hd[j - 3], hd[j]) > 120: rev[g] += 1
                if j >= 2 and hd[j - 2] is not None:
                    r0 = sd(hd[j - 2], hd[j - 1]) / p.dt; r1 = s1 / p.dt
                    if abs(r0) > 30 and abs(r1) > 30 and r0 * r1 < 0: flip[g] += 1
    print(f"== {os.path.basename(path)}")
    for g in sorted(T, key=lambda g: -T[g]):
        if T[g] < 5: continue
        print(f"   {g:5s} moving {T[g]:9.0f} s | direction changes >20 deg/0.1 s: {ch[g] / T[g]:.2f}/s | wobble (back within 0.3 s): {wob[g] / T[g]:.2f}/s ({100 * wob[g] / max(1, ch[g]):.0f}% of changes) | reversals >120 deg in 0.3 s: {rev[g] / T[g]:.2f}/s | turn flips: {flip[g] / T[g]:.2f}/s")
