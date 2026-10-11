"""A/B: python3 out/trench/compare_ab.py LABEL [LABEL...]  (baseline = out/mechanics sim files)"""
import gzip, json, re, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
NFL = json.load(open('data/reviews/mechanics/nfl-bdb2022.json'))['metrics']
KEYS = ['run.max_engaged_dl_driven_back_3s', 'run.engaged_dl_driven_back_1s', 'run.engaged_dl_driven_back_3s',
        'run.yards', 'run.yards_before_contact', 'run.yards_after_contact', 'contact.run.tackler_speed_at_contact',
        'run.yards@inside_zone', 'run.yards@outside_zone', 'run.yards@gap_pull', 'run.yards@man_duo',
        'run.max_engaged_dl_driven_back_3s@inside_zone', 'run.max_engaged_dl_driven_back_3s@outside_zone',
        'pass.pressure_2yd_before_throw', 'pass.time_to_throw', 'catch.yards_after_catch']
def files(label, seed):
    if label == 'base':
        return ('out/mechanics/sim-plays.jsonl.gz', 'out/mechanics/sim.json', 'out/mechanics/sim-v2.log') if seed == 101 else ('out/mechanics/sim-202.jsonl.gz', 'out/mechanics/sim-202.json', 'out/mechanics/sim-202.log')
    return (f'out/trench/{label}-{seed}.jsonl.gz', f'out/trench/{label}-{seed}.json', f'out/trench/{label}-{seed}.log')
def lateral(path):
    res = {}
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB' or not p.live(2.0): continue
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'), 'other')
        k2 = p.k(2.0); side = p.pos(c, k2)[1] - raw['ball_y']
        if abs(side) < 1.0: continue
        s = 1 if side > 0 else -1; ol = p.who('O', 'OL')
        r = res.setdefault(fam, {'dl': [], 'ol': [], 'rb': []})
        r['rb'].append(abs(side))
        for d in p.box_defenders():
            if any(p.dist(d, o, k2) <= 1.5 for o in ol): r['dl'].append((p.pos(d, k2)[1] - p.pos(d, 0)[1]) * s)
        for o in ol: r['ol'].append((p.pos(o, k2)[1] - p.pos(o, 0)[1]) * s)
    med = lambda v: sorted(v)[len(v) // 2] if v else float('nan')
    return {f: (med(r['ol']), med(r['dl']), med(r['rb'])) for f, r in res.items()}
def scores(log):
    if not log: return '-'
    try: s = [int(x) for m in re.findall(r': (\d+)-(\d+)', open(log).read()) for x in m]
    except FileNotFoundError: return '-'
    return f'{sum(s)/len(s):.1f}' if s else '-'
labels = ['base'] + sys.argv[1:]
f = lambda m: '-' if not m or not m.get('n') else f"{m['p50']:.2f}/{m['p90']:.2f}" if 'pressure' not in KEYS_CUR else f"{100*m['mean']:.0f}%"
print(f"{'metric (p50/p90)':45} {'NFL':>11} " + ' '.join(f'{l+"-"+str(s):>14}' for l in labels for s in (101, 202)))
data = {(l, s): json.load(open(files(l, s)[1]))['metrics'] for l in labels for s in (101, 202)}
for k in KEYS:
    KEYS_CUR = k
    print(f"{k:45} {f(NFL.get(k)):>11} " + ' '.join(f"{f(data[(l, s)].get(k)):>14}" for l in labels for s in (101, 202)))
print(f"{'points/team':45} {'~22':>11} " + ' '.join(f"{scores(files(l, s)[2]):>14}" for l in labels for s in (101, 202)))
print('\nlateral at 2 s toward run side (OL / engaged DL / carrier):')
for l in labels:
    for s in (101, 202):
        lat = lateral(files(l, s)[0])
        print(f'  {l}-{s}: ' + '  '.join(f"{fam}: {v[0]:.1f}/{v[1]:.1f}/{v[2]:.1f}" for fam, v in sorted(lat.items()) if fam in ('inside_zone', 'outside_zone', 'gap_pull')))
