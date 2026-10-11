import gzip, json, sys
from collections import defaultdict
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
def go(path, label, limit=None):
    res = defaultdict(lambda: {'lat': [], 'back': [], 'carrier_lat': []}); n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB' or not p.live(2.0): continue
        n += 1
        if limit and n > limit: break
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'), 'other')
        ol = p.who('O', 'OL'); k2 = p.k(2.0)
        res[fam]['carrier_lat'].append(abs(p.pos(c, k2)[1] - raw['ball_y']))
        for d in p.box_defenders():
            if not any(p.dist(d, o, k2) <= 1.5 for o in ol): continue
            res[fam]['lat'].append(abs(p.pos(d, k2)[1] - p.pos(d, 0)[1]))
            res[fam]['back'].append(p.pos(d, k2)[0] - p.pos(d, 0)[0])
    q = lambda v, f: sorted(v)[int(f * (len(v) - 1))] if v else float('nan')
    print(f'== {label}')
    for fam, r in sorted(res.items()):
        print(f"  {fam:13} engaged DL at 2 s: lateral p50 {q(r['lat'],.5):4.1f} p90 {q(r['lat'],.9):4.1f} | back p50 {q(r['back'],.5):5.1f} p90 {q(r['back'],.9):4.1f} | carrier lateral from ball p50 {q(r['carrier_lat'],.5):4.1f}  (n={len(r['lat'])})")
go('out/mechanics/nfl-plays.jsonl.gz', 'NFL 2022', 3000)
go('out/mechanics/sim-plays.jsonl.gz', 'sim 101')
go('out/mechanics/sim-202.jsonl.gz', 'sim 202')
