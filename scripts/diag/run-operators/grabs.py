"""Grab opportunities at hands range (Integration, 2026-11-10: full-stretch whiffs are invisible to the 1.0 yd contact
index). Same code on NFL records (out/mechanics/nfl-plays.jsonl.gz) and sim mechanics records (sim-export.ts). For each
carrier phase (from the handoff, else the snap, on runs; from the catch on passes) to the end: every defender's first
'grab opportunity' = the first frame his centre is within HANDS (1.6 yd) of the carrier's and closing on him (distance
falling over the last 0.1 s). Outcome over the next 0.5 s:
  contact  -- he reaches 1.0 yd (the shared first-contact rule);
  slowed   -- no 1.0 yd contact, but the carrier's speed falls by >= 30% (a hold at arm's length);
  runs on  -- neither: the carrier keeps >= 70% of his speed (the full-stretch whiff).
By the carrier's speed then (< 5 / 5-7 / >= 7 yd/s) and the defender's approach (front <= 45 deg, behind >= 135, else side).
Also: the first opportunity per carrier phase alone (what the defence's first man does).
usage: python3 -I grabs.py <records.jsonl.gz> [...]"""
import sys, os, json, gzip, math, collections as C
HANDS, CONTACT = 1.6, 1.0
for path in sys.argv[1:]:
    R = C.Counter(); F = C.Counter(); n = 0
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('kind') not in ('run', 'pass'):
            continue
        ev, X, c = p.get('events', {}), p['xy'], p.get('carrier')
        if p.get('kind') == 'pass':
            c = p.get('catcher', p.get('receiver', p.get('target'))) if 'catch' in ev else None
            start = ev.get('catch')
        else:
            start = ev.get('handoff', 0.0) or 0.0
        if c is None or start is None or 'end' not in ev:
            continue
        fs, fe = int(round(start / 0.1)), min(len(X) - 1, int(round(ev['end'] / 0.1)))
        if fe - fs < 3:
            continue
        n += 1
        D = [i for i, q in enumerate(p['players']) if q['side'] == 'D']
        P = lambda i, f: (X[f][2 * i], X[f][2 * i + 1])
        dist = lambda i, f: math.dist(P(i, f), P(c, f))
        spd = lambda f: math.dist(P(c, max(f - 1, 0)), P(c, min(f + 1, len(X) - 1))) / 0.2
        first = None
        for d in D:
            for f in range(fs + 1, fe - 4):
                if dist(d, f) <= HANDS and dist(d, f) < dist(d, f - 1):
                    v0 = spd(f)
                    if v0 < 1.0:
                        break
                    w = range(f, min(fe, f + 5) + 1)
                    if any(dist(d, g) <= CONTACT for g in w):
                        out = 'contact'
                    elif min(spd(g) for g in w) <= 0.7 * v0:
                        out = 'slowed'
                    else:
                        out = 'runs on'
                    cv = (X[f + 1][2 * c] - X[f - 1][2 * c], X[f + 1][2 * c + 1] - X[f - 1][2 * c + 1]); cn = math.hypot(*cv) or 1
                    b = (P(d, f)[0] - P(c, f)[0], P(d, f)[1] - P(c, f)[1]); bn = math.hypot(*b) or 1
                    cos = (cv[0] * b[0] + cv[1] * b[1]) / (cn * bn)
                    ap = 'front' if cos >= 0.707 else 'behind' if cos <= -0.707 else 'side'
                    sb = '<5' if v0 < 5 else '5-7' if v0 < 7 else '>=7'
                    R[(p['kind'], 'all', out)] += 1; R[(p['kind'], ap, out)] += 1; R[(p['kind'], sb, out)] += 1
                    if first is None or f < first[0]:
                        first = (f, out)
                    break
        if first:
            F[(p['kind'], first[1])] += 1
    print(f"== {os.path.basename(path)}: {n} carrier phases")
    for kind in ('run', 'pass'):
        for cut in ('all', 'front', 'side', 'behind', '<5', '5-7', '>=7'):
            t = sum(R[(kind, cut, o)] for o in ('contact', 'slowed', 'runs on'))
            if t:
                print(f"   {kind:4s} {cut:6s} n {t:6d} | contact {R[(kind, cut, 'contact')] / t:4.0%} slowed {R[(kind, cut, 'slowed')] / t:4.0%} runs on {R[(kind, cut, 'runs on')] / t:4.0%}")
        t = sum(F[(kind, o)] for o in ('contact', 'slowed', 'runs on'))
        if t:
            print(f"   {kind:4s} first man n {t} | contact {F[(kind, 'contact')] / t:4.0%} slowed {F[(kind, 'slowed')] / t:4.0%} runs on {F[(kind, 'runs on')] / t:4.0%}")
