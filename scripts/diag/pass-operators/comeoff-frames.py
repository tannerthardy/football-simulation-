"""The come-off frame by frame, as tracking sees it (Integration, 2026-11-15, hand-fight note section 7). Same code on
NFL tracking and sim exports. Cases are interior-comeoff.py's: interior pairs that release (interior-fight.py's
definition) and whose blocker is past 1.2 yd at release + 0.5 s. From the release to the throw (at most 2.0 s), every
0.1 s frame:
  - reach: the rusher within 1.5 yd of the QB;
  - the helper (the nearest other OL): the first frame he is within 1.0 yd by +0.5 s; then his velocity toward the
    rusher, his facing (tracking 'o'; absent in sim exports without EXPORT_FACING) against the bearing to the rusher,
    and how much of the next 0.5 s he stays within 1.0 yd (held on him);
  - the rusher: speed and closing on the QB (yd/s) while no OL is within 1.0 yd of him (free frames);
  - the QB: speed, his velocity's part away from the rusher, and up (toward the line), in the last 0.6 s before a reach,
    and in every frame where he moves faster than 1.5 yd/s in the first 1.0 s.

usage: python3 -I scripts/diag/pass-operators/comeoff-frames.py <plays.jsonl.gz> [...] [--examples N] [--plays-csv plays.csv]
"""
import sys, os, json, gzip, math, re, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play  # noqa
q = lambda v, f=.5: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
pct = lambda a, n: f"{100 * a / max(1, n):.0f}%"
wrap = lambda a: (a + 180) % 360 - 180
args = list(sys.argv[1:]); nex = 0
if '--examples' in args:
    i = args.index('--examples'); nex = int(args[i + 1]); del args[i:i + 2]
# --plays-csv: the QB lane's population (early-sack.py): NFL dropbacks by PFF that are not designed movement, not play
# action and not a spike; ours without a boot / roll / sprint / waggle / naked / screen or play-action concept.
PFF = None; DES = re.compile(r'boot|roll|sprint|waggle|naked|move_pocket|screen|^pa_|\+pa', re.I)
if '--plays-csv' in args:
    i = args.index('--plays-csv'); PFF = {f"{r['gameId']}-{r['playId']}": r for r in csv.DictReader(open(args[i + 1]))}; del args[i:i + 2]
def keep(raw):
    if PFF is None: return True
    if raw.get('source') == 'sim': return not DES.search(str((raw.get('cell') or {}).get('concept') or ''))
    pf = PFF.get(str(raw.get('id')))
    return pf is not None and pf['isDropback'] == 'TRUE' and not pf['dropbackType'].startswith('DESIGNED') and pf['playAction'] != 'TRUE' and pf['qbSpike'] != 'TRUE'

for path in args:
    C = []
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line); raw = raw.get('common', raw)
        if raw.get('kind') != 'pass' or not raw.get('xy') or not keep(raw): continue
        p = Play(raw); ev = raw.get('events', {}); O = raw.get('o')
        OL = sorted([i for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None], key=lambda i: p.pos(i, 0)[1])
        qbs = p.who('O', 'QB')
        if len(OL) < 5 or not qbs: continue
        qb = qbs[0]
        DL = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and p.players[d]['group'] == 'DL']
        fw = ev.get('pass_forward'); kend = min(p.frames - 1, p.k(fw) if fw is not None else p.frames - 1)
        ok = lambda i, k: 0 <= k < p.frames and p.pos(i, k)[0] is not None
        vel = lambda i, k: ((p.pos(i, k + 1)[0] - p.pos(i, k - 1)[0]) / (2 * p.dt), (p.pos(i, k + 1)[1] - p.pos(i, k - 1)[1]) / (2 * p.dt)) if ok(i, k - 1) and ok(i, k + 1) else None
        for b in OL[1:4]:
            k0 = d = None
            for k in range(p.k(0.2), min(kend, p.k(2.0)) + 1):
                if not ok(b, k): continue
                c = [(p.dist(b, x, k), x) for x in DL if ok(x, k) and p.dist(b, x, k) <= 1.2]
                if c: k0 = k; d = min(c)[1]; break
            if k0 is None: continue
            kr = None
            for k in range(k0, min(kend, k0 + 25) + 1):
                if not (ok(b, k) and ok(d, k) and ok(qb, k)): break
                (bx, by), (dx, dy), (qx, qy) = p.pos(b, k), p.pos(d, k), p.pos(qb, k)
                ux, uy = qx - bx, qy - by; L = math.hypot(ux, uy) or 1; ux, uy = ux / L, uy / L
                rx, ry = dx - bx, dy - by
                if math.hypot(rx, ry) > 1.2 or abs(math.degrees(math.atan2(rx * -uy + ry * ux, -(rx * ux + ry * uy)))) > 70: kr = k; break
            if kr is None: continue
            k5 = kr + 5
            if k5 > kend or not (ok(b, k5) and ok(d, k5)) or p.dist(b, d, k5) <= 1.2: continue
            c = {'id': raw.get('id'), 'frames': []}
            others = [o for o in OL if o != b]
            for k in range(kr, min(kend, kr + 20) + 1):
                if not (ok(d, k) and ok(qb, k)): break
                vd, vq = vel(d, k), vel(qb, k)
                if vd is None or vq is None: continue
                dq = p.dist(d, qb, k); (dx, dy), (qx, qy) = p.pos(d, k), p.pos(qb, k)
                near = sorted([(p.dist(o, d, k), o) for o in others if ok(o, k)])
                hr, h = near[0] if near else (None, None)
                f = {'dt': round((k - kr) * p.dt, 1), 'dq': dq, 'rS': math.hypot(*vd),
                     'close': -((vd[0] - vq[0]) * (dx - qx) + (vd[1] - vq[1]) * (dy - qy)) / (dq or 1),
                     'qS': math.hypot(*vq), 'qAway': (vq[0] * (qx - dx) + vq[1] * (qy - dy)) / (dq or 1), 'qUp': vq[0],
                     'hr': hr, 'h': h, 'olNear': any(p.dist(o, d, k) <= 1.0 for o in OL if ok(o, k))}
                if h is not None:
                    vh = vel(h, k); hx, hy = p.pos(h, k)
                    f['hToward'] = (vh[0] * (dx - hx) + vh[1] * (dy - hy)) / (hr or 1) if vh else None
                    o = O[k][h] if O and k < len(O) and O[k] and h < len(O[k]) else None
                    f['hFace'] = abs(wrap(o - math.degrees(math.atan2(dy - hy, dx - hx)))) if o is not None else None
                c['frames'].append(f)
            if c['frames']: C.append(c)
    reach = lambda c: next((f['dt'] for f in c['frames'] if f['dq'] <= 1.5), None)
    first = lambda c: next((i for i, f in enumerate(c['frames']) if f['dt'] <= 0.5 and f['hr'] is not None and f['hr'] <= 1.0), None)
    H = [c for c in C if first(c) is not None]; N = [c for c in C if first(c) is None]
    print(f"== {os.path.basename(path)}: off-blocker cases {len(C)}, reached {pct(sum(1 for c in C if reach(c) is not None), len(C))} | helped {len(H)} reached {pct(sum(1 for c in H if reach(c) is not None), len(H))} | no help {len(N)} reached {pct(sum(1 for c in N if reach(c) is not None), len(N))}")
    F0 = [c['frames'][first(c)] for c in H]
    held = []
    for c in H:
        i = first(c); h = c['frames'][i]['h']; nxt = [f for f in c['frames'][i:i + 6]]
        held.append(sum(1 for f in nxt if f['h'] == h and f['hr'] is not None and f['hr'] <= 1.0) / max(1, len(nxt)))
    fa = [f['hFace'] for f in F0 if f.get('hFace') is not None]
    print(f"   (a) helper at his first frame within 1.0 yd: velocity toward the rusher p25/50/75 {q([f['hToward'] for f in F0 if f.get('hToward') is not None], .25):.2f}/{q([f['hToward'] for f in F0 if f.get('hToward') is not None]):.2f}/{q([f['hToward'] for f in F0 if f.get('hToward') is not None], .75):.2f} yd/s | facing off the bearing to him p50 {q(fa) if fa else float('nan'):.0f} deg (n {len(fa)}) | held within 1.0 yd over the next 0.5 s p50 {q(held):.0%}, all of it {pct(sum(1 for x in held if x >= 0.99), len(held))}")
    for name, G in [('helped, reached', [c for c in H if reach(c) is not None]), ('helped, not', [c for c in H if reach(c) is None])]:
        hh = [held[H.index(c)] for c in G]
        print(f"       {name} ({len(G)}): held p50 {q(hh):.0%}, all of it {pct(sum(1 for x in hh if x >= 0.99), len(hh))}")
    fr = [f for c in C for f in c['frames'] if f['dt'] > 0 and not f['olNear']]
    print(f"   (b) free frames (no OL within 1.0 yd) {len(fr)}: rusher speed p50 {q([f['rS'] for f in fr]):.2f} | closing p25/50/75 {q([f['close'] for f in fr], .25):.2f}/{q([f['close'] for f in fr]):.2f}/{q([f['close'] for f in fr], .75):.2f} yd/s")
    for lo, hi in [(3, 99), (1.5, 3)]:
        g = [f for f in fr if lo < f['dq'] <= hi]
        print(f"       at {lo}-{hi if hi < 99 else ''} yd from the QB ({len(g)}): rusher speed p50 {q([f['rS'] for f in g]):.2f}, closing p50 {q([f['close'] for f in g]):.2f}, QB speed {q([f['qS'] for f in g]):.2f}, away {q([f['qAway'] for f in g]):.2f}")
    fq = [f for c in C for f in c['frames'] if 0 < f['dt'] <= 1.0 and f['qS'] > 1.5]
    print(f"   (c) QB moving (>1.5 yd/s) in the first 1.0 s ({len(fq)} frames): away from the rusher p25/50/75 {q([f['qAway'] for f in fq], .25):.2f}/{q([f['qAway'] for f in fq]):.2f}/{q([f['qAway'] for f in fq], .75):.2f} | up p50 {q([f['qUp'] for f in fq]):.2f}")
    R = [c for c in C if reach(c) is not None]
    l6 = [f for c in R for f in c['frames'] if max(0, reach(c) - 0.6) < f['dt'] <= reach(c)]
    print(f"       last 0.6 s before a reach ({len(R)}): QB speed p50 {q([f['qS'] for f in l6]):.2f}, away {q([f['qAway'] for f in l6]):.2f}, up {q([f['qUp'] for f in l6]):.2f} | rusher speed {q([f['rS'] for f in l6]):.2f}, closing {q([f['close'] for f in l6]):.2f}")
    # The QB lane's dozen: off the blocker, no help, reached.
    ids = [c['id'] for c in N if reach(c) is not None]
    print(f"   no help, reached ({len(ids)}): {' '.join(str(x) for x in ids[:max(12, nex)])}")
    for c in C[:nex]:
        r = reach(c)
        s = ' '.join(f"{f['dt']:.1f}:{f['dq']:.1f}/{f['rS']:.1f}/{'h%.1f' % f['hr'] if f['hr'] is not None else '-'}/q{f['qS']:.1f}{'+' if f['qAway'] > 0 else '-'}" for f in c['frames'][::3])
        print(f"     {c['id']} reach {r}: dt:dist-to-QB/rusher speed/helper dist/QB speed(+ away) {s}")
