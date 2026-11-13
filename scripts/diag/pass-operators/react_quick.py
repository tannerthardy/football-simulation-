"""How fast the nearest DB reacts to a throw, by target depth (same code on NFL and sim common-format plays).
Observation only. Targeted, thrown non-PA drop-backs; target depth at the ball's arrival (behind / 0-5 / 5-10 / 10+);
coverage family. The defender: the DB (group DB) nearest the target at the release (pass_forward), within 12 yd.
His speed toward the target (velocity . unit vector to the target's current position; central differences) at the
release; already breaking = >= 1.5 yd/s toward him at the release. Reaction: the first frame from the release where his
speed toward the target has risen by >= 1.0 yd/s over its value at the release, for two frames running (relative to
the release). At the catch (completions): his distance to the catcher; the first defender (any) within 1 yd after the
catch; YAC.
usage: python3 -I scripts/diag/pass-operators/react_quick.py name=a.jsonl.gz[,b] ..."""
import sys, os, gzip, json, math, collections as C
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'mechanics'))
from metrics import Play, coverage_family  # noqa


def q(v, f=.5):
    v = sorted(x for x in v if x is not None)
    return '-' if not v else f'{v[int(f * (len(v) - 1))]:.1f}'


def band(d): return 'behind' if d < 0 else '0-5' if d < 5 else '5-10' if d < 10 else '10+'


for arg in sys.argv[1:]:
    name, paths = arg.split('=')
    G = C.defaultdict(list)
    for path in paths.split(','):
        for line in gzip.open(path, 'rt'):
            r = json.loads(line); r = r.get('common', r)
            if r['kind'] != 'pass': continue
            concept = str((r.get('cell') or {}).get('concept') or 'NA')
            if (r.get('source') == 'sim' and concept.startswith('pa_')) or (r.get('source') != 'sim' and concept not in ('NA', 'UNDEFINED')): continue
            ev = r['events']; t = r.get('target')
            if 'pass_forward' not in ev or t is None or (r.get('labels') or {}).get('throwaway'): continue
            p = Play(r); kr = p.k(ev['pass_forward']); ka = min(p.k(ev.get('pass_arrived', ev['end'])), p.frames - 1)
            if p.pos(t, ka)[0] is None or p.pos(t, kr)[0] is None or kr < 1: continue
            fam = coverage_family((r.get('cell') or {}).get('coverage')) or 'other'
            DB = [d for d in p.who('D', 'DB') if p.pos(d, kr)[0] is not None and p.dist(d, t, kr) <= 12]
            if not DB: continue
            d = min(DB, key=lambda x: p.dist(x, t, kr))
            def toward(k):
                if k + 1 >= p.frames: return None
                (x0, y0), (x1, y1), (tx, ty) = p.pos(d, k - 1), p.pos(d, k + 1), p.pos(t, k)
                if None in (x0, x1, tx): return None
                vx, vy = (x1 - x0) / (2 * p.dt), (y1 - y0) / (2 * p.dt); x, y = p.pos(d, k)
                L = math.hypot(tx - x, ty - y) or 1; return (vx * (tx - x) + vy * (ty - y)) / L
            v0 = toward(kr)
            if v0 is None: continue
            react = None
            for k in range(kr, min(ka + 10, p.frames - 2)):
                a, b = toward(k), toward(k + 1)
                if a is not None and b is not None and a - v0 >= 1 and b - v0 >= 1: react = (k - kr) * p.dt; break
            row = dict(v0=v0, pre=v0 >= 1.5, react=react, d0=p.dist(d, t, kr), air=(ka - kr) * p.dt)
            if 'catch' in ev and not (r.get('carrier') is not None and p.players[r['carrier']]['side'] == 'D'):
                kc = min(p.k(ev['catch']), p.frames - 1); ke = min(p.k(ev['end']), p.frames - 1); cx = p.pos(t, kc)[0]
                kfc = next((k for k in range(kc, ke + 1) if p.pos(t, k)[0] is not None and any(p.dist(o, t, k) <= 1.0 for o in p.who('D'))), None)
                row.update(dc=p.dist(d, t, kc), na=min(p.dist(o, t, kc) for o in p.who('D')), tfc=(kfc - kc) * p.dt if kfc is not None else None,
                           yac=(r.get('yards') or 0) - cx if cx is not None else None)
            G[(band(p.pos(t, ka)[0]), fam)].append(row)
    print(f'== {name}: nearest DB to the target at the release (p25/p50/p75 where three values)')
    for b in ('behind', '0-5', '5-10', '10+'):
        for fam in ('man', 'zone', None):
            v = [o for (bb, f), L in G.items() if bb == b and (fam is None or f == fam) for o in L]
            if len(v) < 5: continue
            c = [o for o in v if 'dc' in o]
            print(f'   {b:<6} {fam or "all":<4} n {len(v):4d} | his distance at the release {q([o["d0"] for o in v])} | toward the target at the release {q([o["v0"] for o in v])} yd/s, already breaking {100 * sum(o["pre"] for o in v) / len(v):.0f}%'
                  f' | reaction {q([o["react"] for o in v], .25)}/{q([o["react"] for o in v])}/{q([o["react"] for o in v], .75)} s (none {100 * sum(o["react"] is None for o in v) / len(v):.0f}%) | air {q([o["air"] for o in v])} s'
                  + (f' | catches {len(c)}: his distance {q([o["dc"] for o in c])}, nearest any {q([o["na"] for o in c])} yd, first within 1 yd {q([o["tfc"] for o in c])} s, YAC mean {sum(o["yac"] for o in c if o["yac"] is not None) / max(1, len(c)):.1f}' if c else ''))
