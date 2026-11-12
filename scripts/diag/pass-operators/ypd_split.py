"""Yards per drop-back, decomposed (same code on NFL and sim common-format plays). Observation only.
Drop-backs: kind 'pass', not play-action (NFL: no PFF run concept on the pass play, i.e. concept NA/UNDEFINED; sim:
concept not 'pa_*'). Each drop-back falls in one row:
  sack: not thrown, yards <= 0 | scramble: not thrown, yards > 0 | throwaway: thrown without a target (or labelled)
  targeted: by the target's depth past the line at the ball's arrival (behind / 0-5 / 5-10 / 10-20 / 20+) x coverage
  family (man / zone / other: situational or unlabelled calls).
Per row: share of drop-backs, yards per drop-back in the row, and for targeted rows completion, INT, air yards per catch
(the catcher's depth at the catch), YAC per catch (yards - air yards), yards per target. An interception counts 0
yards (NFL: INT from --ball nfl-ball.jsonl.gz where it covers the play; its rate is over those plays only). With --vs NAME, each row's contribution to the gap in yards per drop-back (sim share x sim yards in the row -
NFL share x NFL yards), split into a share part and a per-attempt part (each at the mean of the other), and the
per-attempt part of targeted rows into completion and yards per catch; rows ranked by |contribution|.
usage: python3 -I scripts/diag/pass-operators/ypd_split.py nfl=out/mechanics/nfl-plays.jsonl.gz sim=a.jsonl.gz,b.jsonl.gz [--ball out/mechanics/nfl-ball.jsonl.gz] [--vs nfl]"""
import sys, os, gzip, json, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa

BANDS = ('behind', '0-5', '5-10', '10-20', '20+')


def band(d): return 'behind' if d < 0 else '0-5' if d < 5 else '5-10' if d < 10 else '10-20' if d < 20 else '20+'


BALL = {}
if '--ball' in sys.argv:
    for line in gzip.open(sys.argv[sys.argv.index('--ball') + 1], 'rt'):
        b = json.loads(line); BALL[b['id']] = bool(b.get('int'))


def load(paths):
    rows = C.defaultdict(list); n = 0
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r['kind'] != 'pass': continue
            concept = str((r.get('cell') or {}).get('concept') or 'NA')
            if (r.get('source') == 'sim' and concept.startswith('pa_')) or (r.get('source') != 'sim' and concept not in ('NA', 'UNDEFINED')): continue
            n += 1; ev = r['events']; lab = r.get('labels') or {}; y = r.get('yards') or 0; p = Play(r)
            car = r.get('carrier'); intc = lab.get('interception') or (car is not None and p.players[car]['side'] == 'D') or BALL.get(r['id'], False)
            known = r.get('source') == 'sim' or r['id'] in BALL
            if 'pass_forward' not in ev:
                rows['sack' if y <= 0 else 'scramble'].append(dict(y=y)); continue
            t = r.get('target')
            if t is None or lab.get('throwaway'):
                rows['throwaway'].append(dict(y=0 if intc else y)); continue
            ka = min(p.k(ev.get('pass_arrived', ev['end'])), p.frames - 1)
            x = next((p.pos(t, k)[0] for k in range(ka, -1, -1) if p.pos(t, k)[0] is not None), None)
            if x is None: rows['throwaway'].append(dict(y=0 if intc else y)); continue
            fam = coverage_family((r.get('cell') or {}).get('coverage')) or 'other'
            comp = 'catch' in ev and not intc
            air = None
            if comp:
                kc = min(p.k(ev['catch']), p.frames - 1)
                air = next((p.pos(t, k)[0] for k in range(kc, -1, -1) if p.pos(t, k)[0] is not None), x)
            rows[(band(x), fam)].append(dict(y=0 if intc else y, comp=comp, intc=bool(intc), known=known, air=air, yac=(y - air) if comp else None))
    return rows, n


def stats(v, n):
    s = dict(n=len(v), share=len(v) / n, ypr=sum(o['y'] for o in v) / len(v) if v else 0.0)
    c = [o for o in v if o.get('comp')]
    if v and 'comp' in v[0]:
        s.update(comp=len(c) / len(v), intc=sum(o['intc'] for o in v if o['known']) / max(1, sum(o['known'] for o in v)),
                 air=sum(o['air'] for o in c) / len(c) if c else 0.0, yac=sum(o['yac'] for o in c) / len(c) if c else 0.0,
                 ypc=sum(o['y'] for o in c) / len(c) if c else 0.0)
    return s


args = [a for a in sys.argv[1:] if not a.startswith('--') and not a.endswith('.jsonl.gz') or '=' in a]
vs = sys.argv[sys.argv.index('--vs') + 1] if '--vs' in sys.argv else None
if vs: args = [a for a in args if a != vs]
data = {}
for arg in args:
    name, paths = arg.split('=')
    rows, n = load(paths)
    keys = ['sack', 'scramble', 'throwaway'] + [(b, f) for b in BANDS for f in ('man', 'zone', 'other')]
    S = {k: stats(rows.get(k, []), n) for k in keys}
    total = sum(o['y'] for v in rows.values() for o in v) / n
    data[name] = (S, n, total)
    print(f'== {name}: non-PA drop-backs n {n} | yards per drop-back {total:.2f}')
    print(f'   {"row":<15} {"share":>6} {"yd/row":>7} {"comp":>5} {"INT":>4} {"air/c":>6} {"YAC/c":>6} {"yd/c":>6} {"n":>5}')
    for k in keys:
        s = S[k]
        if not s['n']: continue
        lab = k if isinstance(k, str) else f'{k[0]} {k[1]}'
        extra = f'{100 * s["comp"]:4.0f}% {100 * s["intc"]:3.1f}% {s["air"]:6.1f} {s["yac"]:6.1f} {s["ypc"]:6.1f}' if 'comp' in s else ' ' * 31
        print(f'   {lab:<15} {100 * s["share"]:5.1f}% {s["ypr"]:7.2f} {extra} {s["n"]:5d}')
if vs:
    B, nb, tb = data[vs]
    for name, (S, n, t) in data.items():
        if name == vs: continue
        print(f'== gap {name} - {vs}: {t - tb:+.2f} yards per drop-back ({t:.2f} vs {tb:.2f}); rows ranked by contribution')
        out = []
        for k in S:
            a, b = S[k], B[k]
            contrib = a['share'] * a['ypr'] - b['share'] * b['ypr']
            share_part = (a['share'] - b['share']) * (a['ypr'] + b['ypr']) / 2
            per_part = (a['ypr'] - b['ypr']) * (a['share'] + b['share']) / 2
            comp_part = ypc_part = None
            if 'comp' in a and a['n'] and b['n']:
                comp_part = (a['comp'] - b['comp']) * (a['ypc'] + b['ypc']) / 2 * (a['share'] + b['share']) / 2
                ypc_part = (a['ypc'] - b['ypc']) * (a['comp'] + b['comp']) / 2 * (a['share'] + b['share']) / 2
            out.append((k, contrib, share_part, per_part, comp_part, ypc_part, a, b))
        out.sort(key=lambda o: -abs(o[1]))
        print(f'   {"row":<15} {"contrib":>8} {"share pt":>9} {"per-att pt":>10} {"of which comp":>13} {"yd/catch":>9} | share {name}/{vs} | comp | air/c | YAC/c')
        for k, c, sp, pp, cp, yp, a, b in out:
            if abs(c) < 0.005: continue
            lab = k if isinstance(k, str) else f'{k[0]} {k[1]}'
            tail = f' | {100 * a["comp"]:.0f}/{100 * b["comp"]:.0f}% | {a["air"]:.1f}/{b["air"]:.1f} | {a["yac"]:.1f}/{b["yac"]:.1f}' if 'comp' in a and a['n'] and b['n'] else ''
            f = lambda v: f'{v:+.2f}' if v is not None else '   -'
            print(f'   {lab:<15} {c:+8.2f} {sp:+9.2f} {pp:+10.2f} {f(cp):>13} {f(yp):>9} | {100 * a["share"]:.1f}/{100 * b["share"]:.1f}%{tail}')
