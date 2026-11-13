"""How deep a deep safety plays over the routes (same code on NFL and sim common-format plays). Observation only.
Thrown non-PA drop-backs (as ypd_split.py), by shell (safety_deep.py's mapping). Deep safety: a defender 9+ yd past the
line at the snap who is still 9+ yd deep at the throw (not rotated down). At 1.0 s, 1.5 s and the throw (pass_forward;
when the throw comes first, that row is skipped): his depth, the deepest eligible receiver within 10 yd of him laterally
("the deepest route in his zone") and his depth over it; his backward speed (depth gained per second) over 0-0.5, 0.5-1.0
and 1.0-1.5 s. p50 values.
usage: python3 -I scripts/diag/pass-operators/safety_cushion.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrics import Play  # noqa
from safety_deep import shell, SH  # noqa  (module guard below keeps it import-safe)


def q(v):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else f'{v[len(v) // 2]:.1f}'


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    G = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r['kind'] != 'pass': continue
            concept = str((r.get('cell') or {}).get('concept') or 'NA')
            if (r.get('source') == 'sim' and concept.startswith('pa_')) or (r.get('source') != 'sim' and concept not in ('NA', 'UNDEFINED')): continue
            ev = r['events']
            if 'pass_forward' not in ev: continue
            p = Play(r); kt = p.k(ev['pass_forward']); sh = shell((r.get('cell') or {}).get('coverage'))
            elig = [i for i in p.who('O') if p.players[i]['group'] in ('WR', 'TE', 'RB')]
            for d in p.who('D'):
                x0 = p.pos(d, 0)[0]
                if x0 is None or x0 < 9 or p.pos(d, kt)[0] is None or p.pos(d, kt)[0] < 9: continue
                row = {}
                for lab, k in (('1.0', p.k(1.0)), ('1.5', p.k(1.5)), ('throw', kt)):
                    if lab != 'throw' and k > kt: continue
                    x, y = p.pos(d, k)
                    if x is None: continue
                    R = [p.pos(i, k)[0] for i in elig if p.pos(i, k)[0] is not None and abs(p.pos(i, k)[1] - y) <= 10]
                    row[lab] = (x, max(R) if R else None)
                sp = []
                for a, b in ((0, 5), (5, 10), (10, 15)):
                    if b > kt or p.pos(d, b)[0] is None or p.pos(d, a)[0] is None: sp.append(None); continue
                    sp.append((p.pos(d, b)[0] - p.pos(d, a)[0]) / ((b - a) * p.dt))
                G[sh].append(dict(row=row, sp=sp))
    print(f'== {name}: deep safeties (9+ yd at the snap and at the throw), p50')
    print(f'   {"shell":<10} {"n":>5} | {"1.0 s: depth / deepest route / over":<30} | {"1.5 s":<20} | {"throw":<20} | backward speed 0-0.5 / 0.5-1.0 / 1.0-1.5 s')
    for sh in SH + ('all',):
        v = [o for k, L in G.items() if sh == 'all' or k == sh for o in L]
        if len(v) < 10: continue
        cell = lambda lab: f'{q([o["row"][lab][0] for o in v if lab in o["row"]])} / {q([o["row"][lab][1] for o in v if lab in o["row"]])} / {q([o["row"][lab][0] - o["row"][lab][1] for o in v if lab in o["row"] and o["row"][lab][1] is not None])}'
        print(f'   {sh:<10} {len(v):5d} | {cell("1.0"):<30} | {cell("1.5"):<20} | {cell("throw"):<20} | ' + ' / '.join(q([o["sp"][i] for o in v]) for i in range(3)))
