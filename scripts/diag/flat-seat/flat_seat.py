"""Underneath seats on dropbacks, one operator for the NFL (nfl-flat-seat.py) and the sim (sim-flat-seat.mts)
(Integration, 2026-11-23). Non-play-action dropbacks; a frame counts only before the throw (or with no throw).
At 1.0 / 1.5 / 2.0 / 2.5 s from the snap, p50 [p25, p75]:
  man, by his receiver (back / TE / slot WR / wide WR): his depth, the receiver's depth, his depth over the receiver
    (+ = deeper), distance, and his speed toward the receiver (closing, yd/s over the last 0.2 s); for backs and TEs
    who release short (under 3 yd deep at 1.5 s), the same split by the receiver's sideways run (out-going: 3+ yd wider
    from the ball since the snap).
  zone seats (hook, curl_flat, flat, hole): his depth, distance to the nearest eligible receiver, that receiver's depth,
    his depth over him, and his depth against the deepest receiver within 6 yd of him laterally and in front of 12 yd
    ("the threat he sits under"): a fixed landmark shows as depth flat across threats; a threat-set depth follows them.
usage: python3 -I scripts/diag/flat-seat/flat_seat.py NFL.jsonl SIM.jsonl [SIM2.jsonl ...] [--pa]"""
import json, sys, math

TS = (0.0, 0.5, 1.0, 1.5, 2.0, 2.5)


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(f * (len(v) - 1))] if v else float('nan')


def fmt(v):
    return f'{q(v):5.1f} [{q(v, .25):5.1f},{q(v, .75):5.1f}]' if [x for x in v if x is not None] else '   -'


def idx(r, t):
    return int(round(t * 10))


def live(r, t):
    i = idx(r, t)
    return (r['throw'] is None or r['throw'] > t) and i < len(r['d']) and r['d'][i] is not None


def rgroup(r):
    if r['rpos'] in ('RB', 'FB'): return 'back'
    if r['rpos'] == 'TE': return 'TE'
    if r['rpos'] == 'WR': return 'slot WR' if r['rslot'] in ('slot', 'inline', 'back') else 'wide WR'
    return None


def man_rows(A, lab):
    print(f'\n### {lab}: man, by receiver (n plays-defenders)')
    print('  t    group      n    his depth             rcv depth             depth over rcv        distance              closing')
    for g in ('back', 'TE', 'slot WR', 'wide WR'):
        S = [r for r in A if r['cls'] == 'man' and rgroup(r) == g and r['r']]
        for t in TS:
            L = [r for r in S if live(r, t) and r['r'][idx(r, t)] is not None]
            if len(L) < 5: continue
            i = idx(r, t) if False else int(round(t * 10))
            dd = [r['d'][i][0] for r in L]; rd = [r['r'][i][0] for r in L]
            ov = [r['d'][i][0] - r['r'][i][0] for r in L]
            ds = [math.dist(r['d'][i], r['r'][i]) for r in L]
            cl = [] if i < 2 else [(math.dist(r['d'][i - 2], r['r'][i - 2]) - math.dist(r['d'][i], r['r'][i])) / 0.2 for r in L if r['d'][i - 2] and r['r'][i - 2]]
            print(f'  {t:.1f}  {g:8s} {len(L):5d}  {fmt(dd)}  {fmt(rd)}  {fmt(ov)}  {fmt(ds)}  {fmt(cl)}')
    print(f'  short release (rcv under 3 yd deep at 1.5 s), back / TE, by his sideways run (3+ yd wider than at the snap at 1.5 s):')
    for g in ('back', 'TE'):
        for wide in (True, False):
            S = [r for r in A if r['cls'] == 'man' and rgroup(r) == g and r['r'] and r['r'][15] and r['r'][15][0] < 3
                 and (abs(r['r'][15][1] - r['ballY']) - abs(r['r'][0][1] - r['ballY']) >= 3) == wide]
            for t in TS:
                L = [r for r in S if live(r, t) and r['r'][int(round(t * 10))] is not None]
                if len(L) < 5: continue
                i = int(round(t * 10))
                dd = [r['d'][i][0] for r in L]; rd = [r['r'][i][0] for r in L]; ov = [r['d'][i][0] - r['r'][i][0] for r in L]
                ds = [math.dist(r['d'][i], r['r'][i]) for r in L]
                lat = [abs(r['d'][i][1] - r['ballY']) - abs(r['r'][i][1] - r['ballY']) for r in L]
                print(f'  {t:.1f}  {g:4s} {"outgoing" if wide else "other   "} {len(L):4d}  depth {fmt(dd)}  rcv {fmt(rd)}  over {fmt(ov)}  dist {fmt(ds)}  wider than rcv (+ = outside) {fmt(lat)}')


def zone_rows(A, lab):
    print(f'\n### {lab}: zone seats')
    print('  t    seat        n    his depth             nearest rcv dist      its depth             depth over it         over deepest in front (6 yd lat, <12)  none within 5 yd')
    for c in ('hook', 'curl_flat', 'flat', 'hole'):
        S = [r for r in A if r['cls'] == c]
        for t in TS:
            L = [r for r in S if live(r, t)]
            if len(L) < 5: continue
            i = int(round(t * 10))
            dd, nd, nr, ov, od, none = [], [], [], [], [], 0
            for r in L:
                me = r['d'][i]; R = [x[i] for x in r['rec'] if x[i] is not None]
                dd.append(me[0])
                if not R: continue
                near = min(R, key=lambda p: math.dist(p, me))
                nd.append(math.dist(near, me)); nr.append(near[0]); ov.append(me[0] - near[0])
                if math.dist(near, me) > 5: none += 1
                F = [p for p in R if abs(p[1] - me[1]) <= 6 and p[0] < 12]
                if F: od.append(me[0] - max(p[0] for p in F))
            print(f'  {t:.1f}  {c:9s} {len(L):5d}  {fmt(dd)}  {fmt(nd)}  {fmt(nr)}  {fmt(ov)}  {fmt(od)}  {100 * none / max(1, len(nd)):5.1f}%')


if __name__ == '__main__':
    pa = '--pa' in sys.argv
    paths = [p for p in sys.argv[1:] if not p.startswith('--')]
    for lab, P in (('NFL', paths[:1]), ('sim', paths[1:])):
        A = [r for p in P for l in open(p) if l.strip() for r in [json.loads(l)] if r['pa'] == pa]
        print(f'\n## {lab} ({"play action" if pa else "no play action"} dropbacks)')
        man_rows(A, lab); zone_rows(A, lab)
