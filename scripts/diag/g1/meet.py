"""Open-field meetings on run plays, one operator for NFL tracking and sim
common plays. Situation: after the handoff, the carrier 5+ yd past the line
and moving >= 1 yd/s; a defender with no offensive player within 1.0 yd
(a free defender, by the same proxy in both sources) gets within 4 yd while
level with or ahead of him (along the carrier's heading >= -0.5 yd). First
such frame per defender per play. Over the next 1.5 s:
  met    = within 1.0 yd while still level or ahead (along >= -0.3);
  passed = never met and 0.5+ yd behind him along his heading at the end;
  other  = neither (play ended, still shadowing).
For met: broke = the carrier gains 5+ more yards after the meeting.
Split by defender group (DL/LB/DB) and by the carrier's speed at admission.
Ported from claude/run-game-v3 scripts/diag/open-field/meet.py (Main Engine).
usage: python3 -I scripts/diag/g1/meet.py FILE [FILE...]  (run from the repository root)"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402

q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
pct = lambda a, b: f'{100 * a / b:.0f}%' if b else '-'


def geom(p, c, d, k):
    (cx, cy), (dx, dy) = p.pos(c, k), p.pos(d, k)
    if cx is None or dx is None: return None
    vx, vy = p.velocity(c, k); s = math.hypot(vx, vy)
    if s < 1: return None
    rx, ry = dx - cx, dy - cy
    return (rx * vx + ry * vy) / s, abs(-rx * vy + ry * vx) / s, s, math.hypot(rx, ry)


def rows(path, reached):
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run': continue
        c = raw.get('carrier'); ev = raw.get('events') or {}
        th = ev.get('handoff')
        if c is None or th is None: continue
        p = Play(raw)
        if p.players[c]['group'] != 'RB': continue
        off = [o for o in p.who('O') if o != c]
        seen = set()
        reached[0] += any((p.pos(c, k)[0] or 0) >= 5 for k in range(p.k(th), min(p.frames - 1, p.k(p.end))))
        k1 = min(p.frames - 1, p.k(p.end))
        for k in range(p.k(th), k1):
            cx = p.pos(c, k)[0]
            if cx is None or cx < 5: continue
            for d in p.who('D'):
                if d in seen: continue
                g = geom(p, c, d, k)
                if g is None or g[3] > 4 or g[0] < -0.5: continue
                if any(p.dist(o, d, k) <= 1.0 for o in off): continue
                seen.add(d)
                out, kmet, along = 'other', None, g[0]
                for j in range(k, min(k1, k + p.k(1.5)) + 1):
                    gj = geom(p, c, d, j)
                    if gj is None: continue
                    along = gj[0]
                    if gj[3] <= 1.0 and gj[0] >= -0.3: out, kmet = 'met', j; break
                if out == 'other' and along < -0.5: out = 'passed'
                dv = p.velocity(d, k); ds = math.hypot(*dv)
                cv = p.velocity(c, k)
                rx, ry = p.pos(c, k)[0] - p.pos(d, k)[0], p.pos(c, k)[1] - p.pos(d, k)[1]
                closing = ((dv[0] - cv[0]) * rx + (dv[1] - cv[1]) * ry) / (math.hypot(rx, ry) or 1)
                broke = None
                if kmet is not None:
                    mx = p.pos(c, kmet)[0]
                    broke = raw['yards'] - mx >= 5
                yield dict(out=out, broke=broke, group=p.players[d]['group'], cs=g[2], ds=ds, closing=closing,
                           side=g[1], along0=g[0], past=cx)


for path in sys.argv[1:]:
    reached = [0]
    R = list(rows(path, reached))
    n = len(R)
    print(f'{path.split("/")[-1][:30]}  runs reaching 5 yd {reached[0]}  meetings {n} ({n / max(1, reached[0]):.2f} per run; DL {sum(r["group"] == "DL" for r in R) / max(1, reached[0]):.2f})')
    def line(lab, S):
        m = [r for r in S if r['out'] == 'met']
        print(f'  {lab:10s} n {len(S):4d}  met {pct(len(m), len(S)):>4} passed {pct(sum(r["out"] == "passed" for r in S), len(S)):>4} '
              f'other {pct(sum(r["out"] == "other" for r in S), len(S)):>4} | met->broke {pct(sum(r["broke"] for r in m), len(m)):>4} '
              f'| carrier {q([r["cs"] for r in S])} defender {q([r["ds"] for r in S])} closing {q([r["closing"] for r in S])}')
    line('all', R)
    for gname in ('DL', 'LB', 'DB'): line(gname, [r for r in R if r['group'] == gname])
    for lo, hi in ((1, 3), (3, 5), (5, 7), (7, 99)): line(f'c {lo}-{hi if hi < 99 else ""}', [r for r in R if lo <= r['cs'] < hi])
    for lab in ('met', 'passed'):
        S = [r for r in R if r['out'] == lab]
        print(f'  {lab:6s} side gap at entry {q([r["side"] for r in S])} along {q([r["along0"] for r in S])} past line {q([r["past"] for r in S])}')
