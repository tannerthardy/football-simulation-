"""Call shares for CALL_COMPOSE step 2 (Rules + Coaching, 2026-11-24; docs/reviews/2026-11-24-call-composition.md §5, §7).
NFL non-PA dropbacks (or ours, same operator). Every side's receivers (not backs) are ordered outside-in at the snap and
tagged as variants.py does:
  - HITCH/OUT/IN are split by break depth (route_chart's rule) into '<8' / '8+';
  - CROSS is SHALLOW if under 7 yd at 2.0 s, else CROSS-deep.
Each of our half concepts (parsed from src/playbook/calls/halves.ts) has the same tag sequence. A side matches a half
when its first k tags equal the half's k tags; the longest match wins. Halves with identical tag sequences
(go_hitch / go_hook, hitch_go / hitch_seam) share the side equally. Full-field concepts match by named predicates.

Outputs (JSON):
  - side share per half (exact match from #1 outward);
  - core share per half: the share of plays with the half's core (CORE) on a side's receivers from the number it starts
    at (#1, or #2 behind a clear-out); a final FLAT may be the back's on that side; a play can count for several halves;
  - for each half, what the other side matches (our halves, or 'unmatched');
  - for each half, the back's job on the play;
  - the share of plays per full concept.
Labelled defaults for the play-caller, not targets.
  python3 -I call_shares.py NFL=nfl-routes.jsonl.gz [OURS=sim.jsonl.gz] HALVES=src/playbook/calls/halves.ts [--json OUT]"""
import sys, re, gzip, json, collections
import numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from route_chart import SIM, analyse

OL = {'T', 'G', 'C', 'OT', 'OG'}
BACKS = {'RB', 'FB', 'HB'}
SIMX = dict(SIM, bubble='SCREEN', now_screen='SCREEN', tunnel='SCREEN', te_screen='SCREEN', slip_screen='SCREEN', checkdown='FLAT')
# Our route ids as the NFL's labelled-and-measured tags.
OUR_TAG = {
    'slant': 'SLANT', 'flat': 'FLAT', 'go': 'GO', 'seam': 'GO', 'stick': 'HITCH<8', 'hitch': 'HITCH<8', 'quick_hitch': 'HITCH<8',
    'hook': 'HITCH<8', 'curl': 'HITCH8+', 'comeback': 'HITCH8+', 'quick_out': 'OUT<8', 'out': 'OUT8+', 'deep_out': 'OUT8+',
    'dig': 'IN8+', 'short_in': 'IN<8', 'post': 'POST', 'corner': 'CORNER', 'shallow': 'SHALLOW', 'shallow_high': 'SHALLOW',
    'mesh_under': 'SHALLOW', 'cross': 'CROSS-deep',
}
# A half's core and the receiver number it starts at: the routes a coach names the concept by. A clear-out #1 starts
# the core at #2 (stick is #2's hitch and #3's flat); a trips half whose #3 is an add-on is named by its first two.
CORE = {'stick': (2, ('HITCH<8', 'FLAT')), 'seam_slant': (2, ('SLANT', 'HITCH<8')), 'trips_sail': (2, ('OUT8+', 'HITCH<8')),
        'trips_outs': (2, ('OUT8+', 'OUT<8')), 'verts_hitch': (2, ('GO', 'HITCH<8')),
        'corner_out': (1, ('CORNER', 'OUT<8')), 'corner_flat': (1, ('CORNER', 'FLAT')), 'double_slants': (1, ('SLANT', 'SLANT')),
        'hitch_post': (1, ('HITCH<8', 'POST')), 'double_outs': (1, ('OUT8+', 'OUT<8')), 'hitch_quick_out': (1, ('HITCH<8', 'OUT<8')),
        'dagger': (1, ('IN8+', 'GO')), 'seam_hitch': (1, ('HITCH<8', 'GO'))}
BACK_JOB = {'PROTECT': 'stay', 'FLAT': 'flat', 'ANGLE': 'angle', 'WHEEL': 'wheel', 'OUT<8': 'out', 'OUT8+': 'out'}


def halves(path):
    out = {}
    for m in re.finditer(r"half\('(\w+)', '[^']*', \{([^}]*)\}\)", open(path).read()):
        routes = dict(re.findall(r"(\d): '(\w+)'", m.group(2)))
        out[m.group(1)] = tuple(OUR_TAG[routes[k]] for k in sorted(routes))
    return out


def plays(path, nfl):
    for l in gzip.open(path, 'rt'):
        p = json.loads(l)
        if p.get('pa') or p.get('qb') is None: continue
        X = np.array(p['x'], float); Y = np.array(p['y'], float); pl = p['players']; qb = p['qb']
        rel = p.get('rel'); cut = min((rel + 15) if rel is not None else 45, X.shape[1] - 1)
        ball = Y[qb, 0]; R = []
        for i, r in enumerate(pl):
            if r['side'] != 'O' or i == qb or r.get('pos') in OL or r.get('pos') == 'QB': continue
            back = r.get('pos') in BACKS and X[i, 0] < -2.5
            if nfl: lab = r.get('routeRan') if r.get('route') else None
            else:
                rid = ((p.get('routes') or {}).get(str(i)) or {}).get('id'); lab = SIMX.get(rid) if rid else None
            if not lab or lab == 'NA': lab = 'PROTECT' if back or r.get('pos') == 'TE' else None
            if not lab: continue
            d = None
            if lab in ('HITCH', 'OUT', 'IN', 'SLANT', 'POST', 'CORNER'):
                res = analyse(dict(src='x', lab=lab, rid=lab, pos=r.get('pos'), x=X[i, :cut + 1], y=Y[i, :cut + 1], out=1.0, tgt=False,
                                   rel=None, catch=None, Xf=X[i], Yf=Y[i], dx0=[]))
                d = res.get('depth') if res.get('depth') is not None else float(X[i, :cut + 1].max())
            d20 = float(X[i, min(20, X.shape[1] - 1)])
            R.append(dict(lab=lab, y=Y[i, 0], back=back, d=d, d20=d20))
        yield ball, R


def tag(r):
    l = r['lab']
    if l in ('HITCH', 'OUT', 'IN') and r['d'] is not None: return f"{l}{'<8' if r['d'] < 7.5 else '8+'}"
    if l == 'CROSS': return 'SHALLOW' if r['d20'] < 7 else 'CROSS-deep'
    return l


def match(T, H):
    """The halves this side's tags match, longest first; equal tag sequences share."""
    best = [(h, len(t)) for h, t in H.items() if tuple(T[:len(t)]) == t]
    if not best: return []
    k = max(n for _, n in best)
    return [h for h, n in best if n == k]


def core_on(T, start, core, back_flat):
    """The core's tags on receivers #start.. of this side, in order; a final FLAT may be the back's on that side."""
    k = len(core); i = start - 1
    if tuple(T[i:i + k]) == core: return True
    return back_flat and core[-1] == 'FLAT' and len(T) == i + k - 1 and tuple(T[i:i + k - 1]) == core[:-1]


def full_match(S):
    """The full-field concepts on this play, by the census's rules (route_combos.py): the defining routes anywhere."""
    a, b = S[1], S[-1]; allt = a + b; out = []
    if 'SHALLOW' in a and 'SHALLOW' in b: out.append('mesh')
    if 'SHALLOW' in allt and 'IN8+' in allt: out.append('drive')
    if 'CROSS-deep' in allt and 'POST' in allt: out.append('y_cross')
    for s in (a, b):
        if s[:1] == ['HITCH<8'] and 'CROSS-deep' in s: out.append('hitch_cross')
        if s[:1] == ['POST'] and 'CROSS-deep' in s: out.append('post_cross')
    if sum(t == 'GO' for t in allt) >= 4: out.append('four_verts')
    return sorted(set(out))


def run(path, nfl, H):
    N = 0; side = collections.Counter(); partner = collections.defaultdict(collections.Counter)
    back = collections.defaultdict(collections.Counter); full = collections.Counter(); core = collections.Counter()
    for ball, R in plays(path, nfl):
        N += 1
        S = {s: [tag(r) for r in sorted([r for r in R if not r['back'] and (r['y'] - ball) * s > 0], key=lambda r: -(r['y'] - ball) * s)]
             for s in (1, -1)}
        backs = [r for r in R if r['back']]
        job = 'empty' if not backs else BACK_JOB.get(tag(backs[0]), 'other')
        M = {s: match(T, H) for s, T in S.items()}
        for s in (1, -1):
            for h in M[s]:
                w = 1 / len(M[s]); side[h] += w; back[h][job] += w
                for o in (M[-s] or ['unmatched']): partner[h][o] += w / max(1, len(M[-s]))
        for f in full_match(S): full[f] += 1
        for h, t in H.items():
            st, c = CORE.get(h, (1, t))
            if len(c) >= 2 and any(core_on(S[s], st, c, any(tag(b) == 'FLAT' and (b['y'] - ball) * s > 0 for b in backs)) for s in (1, -1)):
                core[h] += 1
    norm = lambda c: {k: round(v / sum(c.values()), 4) for k, v in c.most_common()}
    return dict(plays=N, sides=2 * N, side_share={h: round(side[h] / (2 * N), 4) for h in H},
                partner={h: norm(partner[h]) for h in H if partner[h]}, back={h: norm(back[h]) for h in H if back[h]},
                core_share={h: round(core[h] / N, 4) for h in H if len(CORE.get(h, (1, H[h]))[1]) >= 2},
                full_share={f: round(full[f] / N, 4) for f in ('mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross', 'four_verts')})


def main():
    args = dict(a.split('=', 1) for a in sys.argv[1:] if '=' in a)
    H = halves(args['HALVES'])
    out = {'operator': 'scripts/diag/routes/call_shares.py', 'population': 'non-PA dropbacks', 'halves': {h: list(t) for h, t in H.items()}}
    for k in ('NFL', 'OURS'):
        if k in args: out[k] = run(args[k], k == 'NFL', H)
    text = json.dumps(out, indent=1)
    if '--json' in sys.argv: open(sys.argv[sys.argv.index('--json') + 1], 'w').write(text + '\n')
    print(text)


if __name__ == '__main__':
    main()
