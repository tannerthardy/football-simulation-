"""DB_SLOTS card rows from sim-export arms (unpaired games). Report only.

  python3 -I scripts/diag/call-mix/dbslots_card.py off=<export.jsonl.gz>:<outcomes.json>[,...] on=...

Per arm: who holds FS / SS / NB / DB by roster group per defensive package (scrimmage snaps, from the export's
slot field); yards a run against each package; pass rows from the native stats: yards a dropback, completion,
YAC median / trimmed (30+ dropped) / mean +/- SE, deep (20+ air yd) completion, 20+ yd plays, sacks, INT."""
import gzip, json, sys, math, collections
from statistics import mean, median, pstdev
def arm(spec):
    name, paths = spec.split('=', 1)
    plays, slots = [], collections.Counter()
    for pair in paths.split(','):
        exp, out = pair.split(':')
        per = {}
        for l in gzip.open(exp, 'rt'):
            r = json.loads(l)
            per[r['id']] = r
        o = json.load(open(out))
        for p in o['plays']:
            if p.get('nullified') or p['kind'] not in ('run', 'pass'): continue
            plays.append(p)
            e = per.get(p['id'])
            pers = (p.get('plan') or {}).get('defPersonnel')
            if e and pers:
                for pl in e['players']:
                    if pl['side'] == 'D' and pl.get('slot') in ('FS', 'SS', 'NB', 'DB'):
                        slots[(pers, pl['slot'], pl['group'])] += 1
    return name, plays, slots
arms = [arm(a) for a in sys.argv[1:]]
W = 30
def row(label, f): print(f"  {label:34}" + ''.join(f"{f(P):>{W}}" for _, P, _ in arms))
print('  ' + ' ' * 34 + ''.join(f"{n:>{W}}" for n, _, _ in arms))
print('-- slot holders by package (share of that slot\'s snaps)')
for pers in ('base43', 'base34', 'nickel', 'dime', 'stack335'):
    for slot in ('FS', 'SS', 'NB', 'DB'):
        cells = []
        for _, _, S in arms:
            tot = sum(v for (p, s, g), v in S.items() if p == pers and s == slot)
            cells.append('-' if not tot else ' '.join(f"{g} {100 * v / tot:.0f}%" for (p, s, g), v in sorted(S.items(), key=lambda x: -x[1]) if p == pers and s == slot) + f" n{tot}")
        if any(c != '-' for c in cells): print(f"  {pers + ' ' + slot:34}" + ''.join(f"{c:>{W}}" for c in cells))
runs = lambda P, pers=None: [p for p in P if p['kind'] == 'run' and (pers is None or (p.get('plan') or {}).get('defPersonnel') == pers)]
print('-- runs')
row('yards a run, all', lambda P: f"{mean(p['yards'] for p in runs(P)):.2f} n{len(runs(P))}")
for pers in ('base43', 'base34', 'nickel', 'dime'):
    row(f'yards a run vs {pers}', lambda P, pers=pers: (lambda R: f"{mean(p['yards'] for p in R):.2f} +/- {pstdev([p['yards'] for p in R]) / math.sqrt(len(R)):.2f} n{len(R)}" if len(R) > 1 else '-')(runs(P, pers)))
passes = lambda P: [p for p in P if p['kind'] == 'pass']
att = lambda P: [p for p in passes(P) if p['stats'].get('attempted')]
print('-- passes')
row('dropbacks', lambda P: str(len(passes(P))))
row('yards a dropback', lambda P: f"{mean(p['yards'] for p in passes(P)):.2f} +/- {pstdev([p['yards'] for p in passes(P)]) / math.sqrt(len(passes(P))):.2f}")
row('completion', lambda P: f"{100 * sum(p['stats'].get('completed', False) for p in att(P)) / len(att(P)):.1f}%")
row('sack rate', lambda P: f"{100 * sum(p['stats'].get('sacked', False) for p in passes(P)) / len(passes(P)):.1f}%")
row('INT / attempt', lambda P: f"{100 * sum(bool(p['stats'].get('interceptedBy')) for p in att(P)) / len(att(P)):.1f}%")
def yac(P):
    v = [p['stats']['yac'] for p in att(P) if p['stats'].get('completed') and p['stats'].get('yac') is not None]
    return f"{median(v):.1f} / {mean([x for x in v if x < 30]):.2f} / {mean(v):.2f}+/-{pstdev(v) / math.sqrt(len(v)):.2f}"
row('YAC med / trim30 / mean+/-SE', yac)
deep = lambda P: [p for p in att(P) if (p['stats'].get('airYards') or 0) >= 20]
row('deep (20+ air) completion', lambda P: f"{100 * sum(p['stats'].get('completed', False) for p in deep(P)) / max(1, len(deep(P))):.1f}% n{len(deep(P))}")
row('20+ yd plays / dropback', lambda P: f"{100 * sum(p['yards'] >= 20 for p in passes(P)) / len(passes(P)):.1f}%")
