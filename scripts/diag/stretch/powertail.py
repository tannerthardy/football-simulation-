"""Attribute a tail change between two arms run on the same cases (paired by
id): plays reaching GAIN+ only in arm B ("flips") are described in both arms
next to all plays of the concept. Per play: handoff and crossing time, the
puller's position relative to the carrier at the crossing (+ = ahead of him),
second-level defenders (2-8 yd deep, within 7 yd at the snap) within 3 yd of
the carrier at the crossing and their nearest distance, first contact depth,
and the first defensive event past the line from the trace (missed, wrap or
broken tackle: slot and depth). Common-format geometry plus trace events.
usage: powertail.py ARM_A ARM_B [--concept power] [--gain 40]"""
import gzip, json, math, sys
from collections import Counter
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play  # noqa: E402
opt = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
A, B = sys.argv[1], sys.argv[2]; concept = opt('--concept', 'power'); G = float(opt('--gain', 40))
q = lambda v, f=.5: round(sorted(v)[int(f * (len(v) - 1))], 2) if v else None
def load(l):
    return {r['id']: r for r in map(json.loads, gzip.open(f'out/open-field/all/{l}.jsonl.gz', 'rt')) if 'error' not in r and r['concept'] == concept}
def feats(r):
    c = r['common']; p = Play(c); car = c['carrier']; ev = c.get('events') or {}; by = c['ball_y']
    end = min(p.frames - 1, int(p.end / p.dt + 1e-9))
    kx = next((k for k in range(end + 1) if (p.pos(car, k)[0] or -99) >= 0), None)
    f = {'gain': r['gain'], 'tH': ev.get('handoff'), 'tX': kx * p.dt if kx is not None else None,
         'fc': None, 'puller': None, 'near3': None, 'nearest': None, 'first': None, 'flow': None,
         'broken': any(e['type'] == 'broken_tackle' for e in r.get('events') or []),
         'dbhold': any(h.get('d', '')[:2] in ('CB', 'FS', 'SS', 'NB') for h in r.get('holds') or [])}
    if ev.get('first_contact') is not None:
        kc = p.k(ev['first_contact']); f['fc'] = p.pos(car, kc)[0]
    k15 = p.k(1.5)
    ol = [(i, abs(p.pos(i, k15)[1] - p.pos(i, 0)[1])) for i in p.who('O', 'OL') if p.pos(i, 0)[0] is not None and p.pos(i, k15)[0] is not None]
    pull = max(ol, key=lambda t: t[1]) if ol else None
    if kx is not None:
        if pull and pull[1] >= 2: f['puller'] = p.pos(pull[0], kx)[0] - p.pos(car, kx)[0]
        sec = [d for d in p.who('D') if p.pos(d, 0)[0] is not None and 2 <= p.pos(d, 0)[0] <= 8 and abs(p.pos(d, 0)[1] - by) <= 7]
        ds = [p.dist(car, d, kx) for d in sec]
        if ds: f['near3'] = sum(1 for x in ds if x <= 3); f['nearest'] = min(ds)
        # Second level's lateral speed toward the carrier's crossing side at the crossing.
        side = math.copysign(1, p.pos(car, kx)[1] - by); k0, k1 = max(0, kx - 2), min(end, kx + 2)
        v = [(p.pos(d, k1)[1] - p.pos(d, k0)[1]) / ((k1 - k0) * p.dt) * side for d in sec if p.pos(d, k0)[1] is not None and p.pos(d, k1)[1] is not None and k1 > k0]
        if v: f['flow'] = sorted(v)[len(v) // 2]
    los, up = r.get('los'), r.get('dir', 1)
    for e in r.get('events') or []:
        if e['type'] in ('missed_tackle', 'tackle_wrap', 'broken_tackle') and e['t'] >= (f['tX'] or 99):
            k = p.k(e['t']); f['first'] = (e['type'], (e['a'] if e['type'] != 'broken_tackle' else e['b'])[:2], p.pos(car, k)[0]); break
    return f
a, b = load(A), load(B)
ids = sorted(set(a) & set(b))
flips = [i for i in ids if b[i]['gain'] >= G and a[i]['gain'] < G]
back = [i for i in ids if a[i]['gain'] >= G and b[i]['gain'] < G]
print(f"{concept}: paired {len(ids)}; {G:g}+ in {A} {sum(a[i]['gain'] >= G for i in ids)}, in {B} {sum(b[i]['gain'] >= G for i in ids)}; flips to {G:g}+ in {B}: {len(flips)}, reverse {len(back)}")
def summary(tag, rows):
    rows = [x for x in rows if x]
    g = lambda k: [x[k] for x in rows if x[k] is not None]
    firsts = Counter(f"{x['first'][0]}:{x['first'][1]}" for x in rows if x['first'])
    print(f"  {tag:28s} n {len(rows):3d} | broken tackle {100*sum(x['broken'] for x in rows)/max(1,len(rows)):.0f}%, DB hold {100*sum(x['dbhold'] for x in rows)/max(1,len(rows)):.0f}% | 2nd-level flow to carrier side at crossing {q(g('flow'))} yd/s | handoff {q(g('tH'))} cross {q(g('tX'))} s | puller rel carrier at crossing p50 {q(g('puller'))} yd (ahead {100*sum(1 for v in g('puller') if v > 0)/max(1,len(g('puller'))):.0f}%) | 2nd level within 3 yd {q(g('near3'))}, nearest {q(g('nearest'))} | first contact depth {q(g('fc'))} | first event past line: {', '.join(f'{k} {v}' for k, v in firsts.most_common(4))}")
FA = {i: feats(a[i]) for i in ids}; FB = {i: feats(b[i]) for i in ids}
summary(f'{A} all', FA.values()); summary(f'{B} all', FB.values())
summary(f'flips, as run in {A}', [FA[i] for i in flips]); summary(f'flips, as run in {B}', [FB[i] for i in flips])
summary(f'{B} {G:g}+ (all)', [FB[i] for i in ids if b[i]['gain'] >= G]); summary(f'{A} {G:g}+ (all)', [FA[i] for i in ids if a[i]['gain'] >= G])
