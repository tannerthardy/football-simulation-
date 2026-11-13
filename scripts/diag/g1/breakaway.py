"""Runs that reach 20: the carrier's speed and who is still in front of him.
One operator for NFL and sim common plays. At the frames the carrier first
crosses 10, 20 and 30 yd past the line: his speed; defenders level with or
ahead of him (along his x >= -0.5) within 10 yd; the nearest defender; the
nearest such defender's lateral gap. Then whether he reaches 40.

usage: python3 -I scripts/diag/g1/breakaway.py NFL.jsonl.gz SIM.jsonl.gz  (common play format; run from the repository root)"""
import gzip, json, math, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
for path in sys.argv[1:]:
    acc = {m: {} for m in (10, 20, 30)}
    n20 = n40 = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw) if 'common' in raw else raw
        if raw.get('kind') != 'run' or raw.get('yards', 0) < 20: continue
        c = raw.get('carrier'); ev = raw.get('events') or {}
        if c is None or ev.get('handoff') is None: continue
        p = Play(raw)
        n20 += 1; n40 += raw['yards'] >= 40
        k1 = min(p.frames - 1, p.k(p.end))
        for m in (10, 20, 30):
            k = next((k for k in range(p.k(ev['handoff']), k1) if (p.pos(c, k)[0] or -9) >= m), None)
            if k is None: continue
            a = acc[m]
            a.setdefault('cs', []).append(p.speed(c, k))
            cx, cy = p.pos(c, k)
            front = []; near = math.inf
            for d in p.who('D'):
                dx, dy = p.pos(d, k)
                if dx is None: continue
                near = min(near, math.hypot(dx - cx, dy - cy))
                if dx - cx >= -0.5 and math.hypot(dx - cx, dy - cy) <= 10: front.append((math.hypot(dx - cx, dy - cy), abs(dy - cy), p.speed(d, k)))
            a.setdefault('front', []).append(len(front))
            a.setdefault('near', []).append(near)
            a.setdefault('reach40', []).append(raw['yards'] >= 40)
            if front:
                f = min(front); a.setdefault('fgap', []).append(f[1]); a.setdefault('fdist', []).append(f[0]); a.setdefault('fspeed', []).append(f[2])
            a.setdefault('by_front', {}).setdefault(min(len(front), 2), []).append(raw['yards'] >= 40)
    print(f'{path.split("/")[-1][:24]}: runs reaching 20 {n20}, reach 40 {n40} ({100 * n40 / max(1, n20):.0f}%)')
    for m in (10, 20, 30):
        a = acc[m]
        if not a: continue
        bf = '  '.join(f'{k}{"+" if k == 2 else ""} in front: {len(v)} -> 40 {100 * sum(v) / len(v):.0f}%' for k, v in sorted(a['by_front'].items()))
        print(f'  at {m}: n {len(a["cs"])} carrier speed p25/50/75 {q(a["cs"], .25)}/{q(a["cs"])}/{q(a["cs"], .75)} | defenders level/ahead within 10 yd p50 {q(a["front"])} mean {sum(a["front"]) / len(a["front"]):.2f} | nearest any {q(a["near"])} | nearest in front: dist {q(a.get("fdist"))} lateral {q(a.get("fgap"))} speed {q(a.get("fspeed"))}')
        print(f'        {bf}')
