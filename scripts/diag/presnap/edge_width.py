"""The edge defender against a receiver in front of him (Integration, 2026-11-23, the user: "sometimes our wide 9 is so
wide that it looks like he lines up with a receiver right in front of him"). Pre-snap rows (nfl-presnap.py,
sim-presnap.mts), positions only, at the snap frame and the 1.5 s after.
Per side of the ball: the tackle (the widest offensive lineman), the end man on the line (the widest offensive player
on the line, within 1.3 yd of it and within 4 yd outside the tackle: an attached TE if there is one), the edge (the
widest DL / LB within 1.5 yd of the line and within 9 yd of the ball). His width outside the tackle and outside the end
man (+ = outside), the nearest eligible receiver (not OL / QB) in front of him: within 3.5 yd of the line and within 1.5
yd laterally of the edge ("lined up in front of him"); then, for those pairs: the receiver's set (wing: off the line,
within 2 yd outside the end man; tight slot: 2-6 yd outside the tackle with no TE attached; on the line: a TE / nasty
split), the edge's width change over the last 3 s (+ = he widened), the receiver's release at +1.0 s (inside / outside
of the edge's snap spot, or through: within 1 yd of it laterally), and contact (centres within 1.0 yd in the first
1.0 s: a jam or chip). Ours also: the formation id of each such play.
usage: python3 -I scripts/diag/presnap/edge_width.py NFL.jsonl SIM.jsonl [SIM2 ...]"""
import json, sys, math, collections
import numpy as np
OL = {'T', 'G', 'C', 'OT', 'OG', 'OL', 'LT', 'RT', 'LG', 'RG'}
FRONT = {'DE', 'DT', 'NT', 'LB', 'ILB', 'MLB', 'OLB', 'EDGE'}


def q(v, f=.5): return float(np.percentile(v, f * 100)) if len(v) else float('nan')
def f3(v): return f'{q(v):4.1f} ({q(v, .25):4.1f}-{q(v, .75):4.1f})' if len(v) else '-'
def pct(a, b): return f'{100 * a / max(1, b):4.1f}%'


def analyse(R, lab):
    k0s = lambda r: min(range(len(r['t'])), key=lambda k: abs(r['t'][k]))
    E = []
    for r in R:
        k0 = k0s(r)
        if abs(r['t'][k0]) > 0.06: continue
        pl = r['players']; xy = r['xy'][k0]; P = lambda i, k=k0: (r['xy'][k][2 * i], r['xy'][k][2 * i + 1])
        for s in (1, -1):
            ol = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] in OL and P(i)[1] * s > 0]
            if not ol: continue
            tk = max(ol, key=lambda i: P(i)[1] * s); ty = P(tk)[1] * s
            line = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and p['pos'] != 'QB' and P(i)[0] > -1.3 and ty < P(i)[1] * s <= ty + 4]
            em = max(line, key=lambda i: P(i)[1] * s) if line else tk; ey = P(em)[1] * s; te = em != tk
            fr = [i for i, p in enumerate(pl) if p['side'] == 'D' and p['pos'] in FRONT and P(i)[0] < 1.5 and 0 < P(i)[1] * s < 9]
            if not fr: continue
            ed = max(fr, key=lambda i: P(i)[1] * s); dy = P(ed)[1] * s
            el = [i for i, p in enumerate(pl) if p['side'] == 'O' and p['pos'] not in OL and p['pos'] != 'QB' and P(i)[0] > -3.5 and abs(P(i)[1] * s - dy) <= 1.5]
            row = dict(id=r['id'], form=r.get('form'), te=te, w_t=dy - ty, w_e=dy - ey, front=r.get('cov'), inf=None)
            if el:
                rc = min(el, key=lambda i: abs(P(i)[1] * s - dy)); ry = P(rc)[1] * s; rx = P(rc)[0]
                kind = 'on the line' if rx > -1.3 else 'wing' if ry - ey <= 2 else 'tight slot' if (not te and 2 <= ry - ty <= 6) else 'other off the line'
                kb = min(range(len(r['t'])), key=lambda k: abs(r['t'][k] + 3.0)); w0 = P(ed, kb)[1] * s
                k1 = min(range(len(r['t'])), key=lambda k: abs(r['t'][k] - 1.0))
                rel = P(rc, k1)[1] * s - dy
                touch = any(math.dist(P(rc, k), P(ed, k)) < 1.0 for k in range(k0, len(r['t'])) if r['t'][k] <= 1.0)
                row['inf'] = dict(kind=kind, dlat=ry - dy, ddep=rx, rpos=pl[rc]['pos'], widened=dy - w0,
                                  rel='outside' if rel > 1 else 'inside' if rel < -1 else 'through', touch=touch, rush=pl[ed]['rush'])
            E.append(row)
    print(f'\n## {lab}: {len(E)} edges (two per play where found)')
    for te in (True, False):
        A = [e for e in E if e['te'] == te]
        print(f'  {"TE / end man attached" if te else "no attached end man (tackle is the end)"}: n {len(A)}; edge outside the tackle {f3([e["w_t"] for e in A])} yd, outside the end man {f3([e["w_e"] for e in A])}; 9-tech and wider (2+ yd outside the end man) {pct(sum(e["w_e"] >= 2 for e in A), len(A))}; a receiver lined up in front of him {pct(sum(e["inf"] is not None for e in A), len(A))}')
    F = [e for e in E if e['inf']]
    print(f'  receiver in front of the edge: {len(F)} ({pct(len(F), len(E))} of edges)')
    for kind in ('on the line', 'wing', 'tight slot', 'other off the line'):
        G = [e for e in F if e['inf']['kind'] == kind]
        if not G: continue
        rel = collections.Counter(e['inf']['rel'] for e in G)
        print(f'    {kind:18s} n {len(G):4d} ({pct(len(G), len(E))} of edges): receiver lateral from the edge {f3([e["inf"]["dlat"] for e in G])}, depth {f3([e["inf"]["ddep"] for e in G])}; edge outside the end man {f3([e["w_e"] for e in G])}; edge widened over the last 3 s {f3([e["inf"]["widened"] for e in G])}; release ' + ', '.join(f'{k} {pct(v, len(G))}' for k, v in rel.most_common()) + f'; contact in 1.0 s {pct(sum(e["inf"]["touch"] for e in G), len(G))}; edge rushed {pct(sum(e["inf"]["rush"] for e in G), len(G))}')
    if lab != 'NFL':
        C = collections.Counter(e['form'] for e in F); T = collections.Counter(e['form'] for e in E)
        print('    by formation (ours; in front / edges): ' + ', '.join(f'{k} {v}/{T[k]}' for k, v in C.most_common(12)))


if __name__ == '__main__':
    analyse([json.loads(l) for l in open(sys.argv[1])], 'NFL')
    analyse([json.loads(l) for p in sys.argv[2:] for l in open(p)], 'sim')
