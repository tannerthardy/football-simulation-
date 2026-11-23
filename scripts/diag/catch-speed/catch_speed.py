"""The catch in motion: one operator for NFL completions (nfl-catch-film.py, BDB 2025) and the sim's (sim-catch-film.mts)
(Integration, 2026-11-23, from Defense's pursuit report: ours catch at 1.9 yd/s, NFL at 5.3). Positions only; speed is
the central difference over +-0.1 s on both sides. Time 0 is the ball reaching his hands (NFL pass_outcome_caught; sim
'secure'). Route families by route name, both sides: stop (hitch / curl / comeback), out, in (slant / in / dig / angle),
cross (cross / shallow / drag / mesh), flat (flat / swing), vertical (go / post / corner / fade / seam / wheel), screen.
  1 speed from -1.0 to +1.0 s around the catch, p50, by family and by air-yards band;
  2 at the catch, his direction against the ball's incoming direction: toward the ball (cosine > 0.5 against its
    travel), away (< -0.5: running with it), across, or standing (under 1 yd/s);
  3 lead: where the ball arrives against his position projected along his velocity at the throw (along his path:
    + = ahead of where he was heading), and against where he actually is at the catch;
  4 stop routes: time since his speed fell under 2 yd/s when the ball arrives (0 if he is still moving).
usage: python3 -I scripts/diag/catch-speed/catch_speed.py NFL.jsonl SIM.jsonl [SIM2.jsonl ...]"""
import json, sys, math, collections

FAM = [('screen', ('screen', 'bubble', 'tunnel', 'jailbreak')), ('stop', ('hitch', 'curl', 'comeback', 'stick', 'sit', 'hook', 'spot')),
       ('out', ('out', 'speed_out', 'quick_out')), ('flat', ('flat', 'swing', 'arrow')),
       ('cross', ('cross', 'shallow', 'drag', 'mesh', 'over')), ('in', ('slant', 'in', 'dig', 'angle', 'square_in', 'whip')),
       ('vertical', ('go', 'post', 'corner', 'fade', 'seam', 'wheel', 'fly', 'streak', 'vert', 'skinny'))]


def family(route):
    if not route: return 'other'
    r = route.lower().split(':')[-1]
    for fam, keys in FAM:
        if any(r == k or r.startswith(k + '_') or r.endswith('_' + k) or k in r.split('_') for k in keys): return fam
    for fam, keys in FAM:
        if any(k in r for k in keys): return fam
    return 'other'


def band(air):
    if air is None: return 'na'
    return '<0' if air < 0 else '0-5' if air < 5 else '5-10' if air < 10 else '10-20' if air < 20 else '20+'


def idx(c, t):
    return min(range(len(c['t'])), key=lambda i: abs(c['t'][i] - t))


def vel(c, i, key='r'):
    a, b = max(0, i - 1), min(len(c['t']) - 1, i + 1)
    dt = c['t'][b] - c['t'][a]
    if dt <= 0: return (0.0, 0.0)
    return ((c[key][b][0] - c[key][a][0]) / dt, (c[key][b][1] - c[key][a][1]) / dt)


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return v[int(f * (len(v) - 1))] if v else float('nan')


def analyse(c):
    i0 = idx(c, 0.0)
    if abs(c['t'][i0]) > 0.06: return None
    prof = {}
    for k in range(-10, 11):
        t = k / 10; i = idx(c, t)
        if abs(c['t'][i] - t) < 0.06 and 0 < i < len(c['t']) - 1: prof[round(t, 1)] = math.hypot(*vel(c, i))
    v0 = vel(c, i0); s0 = math.hypot(*v0)
    ib = idx(c, -0.2); bd = (c['b'][i0][0] - c['b'][ib][0], c['b'][i0][1] - c['b'][ib][1]); bl = math.hypot(*bd)
    rel = None
    if s0 < 1: rel = 'standing'
    elif bl > 0.3:
        cos = (v0[0] * -bd[0] + v0[1] * -bd[1]) / (s0 * bl)
        rel = 'toward' if cos > 0.5 else 'away' if cos < -0.5 else 'across'
    it = idx(c, c['throw']); vt = vel(c, it); st = math.hypot(*vt); F = -c['throw']
    lead = lead_now = perp = None
    if st > 1 and abs(c['t'][it] - c['throw']) < 0.06:
        ux, uy = vt[0] / st, vt[1] / st
        px, py = c['r'][it][0] + vt[0] * F, c['r'][it][1] + vt[1] * F
        bx, by = c['b'][i0][0], c['b'][i0][1]
        lead = (bx - px) * ux + (by - py) * uy; perp = -(bx - px) * uy + (by - py) * ux
        lead_now = (bx - c['r'][i0][0]) * ux + (by - c['r'][i0][1]) * uy
    stopped = None
    if s0 < 2:
        j = i0
        while j > 1 and math.hypot(*vel(c, j - 1)) < 2: j -= 1
        stopped = c['t'][i0] - c['t'][j]
    else: stopped = 0.0
    return dict(fam=family(c['route']), band=band(c['air']), prof=prof, s0=s0, rel=rel, lead=lead, lead_now=lead_now, perp=perp,
                stopped=stopped, flight=F, st=st)


def show(lab, A):
    print(f'\n## {lab}: n {len(A)}')
    ts = [-1.0, -0.5, -0.3, -0.1, 0.0, 0.1, 0.3, 0.5, 1.0]
    print('  speed p50 at ' + ' '.join(f'{t:+.1f}' for t in ts))
    def line(name, S):
        print(f'    {name:10s} n{len(S):4d}: ' + ' '.join(f'{q([a["prof"].get(t) for a in S]):4.1f}' for t in ts))
    line('all', A)
    for fam in ('stop', 'out', 'in', 'cross', 'flat', 'vertical', 'screen', 'other'):
        S = [a for a in A if a['fam'] == fam]
        if S: line(fam, S)
    for b in ('<0', '0-5', '5-10', '10-20', '20+'):
        S = [a for a in A if a['band'] == b]
        if S: line('air ' + b, S)
    C = collections.Counter(a['rel'] for a in A if a['rel']); n = sum(C.values())
    print('  at the catch, against the ball: ' + ', '.join(f'{k} {100 * v / n:.0f}%' for k, v in C.most_common()))
    for fam in ('all', 'stop', 'out', 'in', 'cross', 'flat', 'vertical'):
        S = [a for a in A if (fam == 'all' or a['fam'] == fam) and a['lead'] is not None]
        if S: print(f'  lead {fam:8s} n{len(S):4d}: vs projected path p50 {q([a["lead"] for a in S]):+.2f} [{q([a["lead"] for a in S], .25):+.2f}, {q([a["lead"] for a in S], .75):+.2f}] | vs where he is at the catch {q([a["lead_now"] for a in S]):+.2f} | across p50 {q([abs(a["perp"]) for a in S]):.2f} | flight {q([a["flight"] for a in S]):.2f} | speed at throw {q([a["st"] for a in S]):.1f}')
    S = [a for a in A if a['fam'] == 'stop']
    if S: print(f'  stop routes: stopped (< 2 yd/s) when the ball arrives {100 * sum(a["stopped"] > 0 for a in S) / len(S):.0f}%, time stopped p50 {q([a["stopped"] for a in S if a["stopped"] > 0]):.2f} s [{q([a["stopped"] for a in S if a["stopped"] > 0], .25):.2f}, {q([a["stopped"] for a in S if a["stopped"] > 0], .75):.2f}]')


if __name__ == '__main__':
    for lab, paths in (('NFL', [sys.argv[1]]), ('sim', sys.argv[2:])):
        A = [a for p in paths for l in open(p) if l.strip() for a in [analyse(json.loads(l))] if a]
        show(lab, A)
