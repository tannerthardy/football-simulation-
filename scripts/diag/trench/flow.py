import gzip, json, sys
sys.path.insert(0, 'scripts/mechanics')
from metrics import Play, CONCEPT_FAMILY
def go(path, label, limit=None):
    out = {}; n = 0
    for line in gzip.open(path, 'rt'):
        raw = json.loads(line)
        if raw['kind'] != 'run' or raw.get('carrier') is None: continue
        p = Play(raw); c = raw['carrier']
        if p.players[c]['group'] != 'RB' or not p.live(2.0): continue
        n += 1
        if limit and n > limit: break
        fam = CONCEPT_FAMILY.get((raw.get('cell') or {}).get('concept'), 'other')
        k2 = p.k(2.0); side = p.pos(c, k2)[1] - raw['ball_y']
        if abs(side) < 1.0: continue
        sgn = 1 if side > 0 else -1
        ol = p.who('O', 'OL')
        r = out.setdefault(fam, {'dl': [], 'ol': []})
        for d in p.box_defenders():
            if any(p.dist(d, o, k2) <= 1.5 for o in ol):
                r['dl'].append((p.pos(d, k2)[1] - p.pos(d, 0)[1]) * sgn)
        for o in ol: r['ol'].append((p.pos(o, k2)[1] - p.pos(o, 0)[1]) * sgn)
    q = lambda v, f: sorted(v)[int(f * (len(v) - 1))]
    print(f'== {label} (lateral yd at 2 s toward the side the carrier went; + = playside)')
    for fam in ('inside_zone', 'outside_zone', 'gap_pull', 'man_duo'):
        if fam in out and out[fam]['dl']:
            r = out[fam]
            print(f"  {fam:13} engaged DL p25 {q(r['dl'],.25):5.1f} p50 {q(r['dl'],.5):5.1f} p75 {q(r['dl'],.75):5.1f} playside share {sum(x>0.5 for x in r['dl'])/len(r['dl']):.2f} | OL p50 {q(r['ol'],.5):5.1f}")
go('out/mechanics/nfl-plays.jsonl.gz', 'NFL 2022', 3000)
go('out/mechanics/sim-plays.jsonl.gz', 'sim 101')
go('out/mechanics/sim-202.jsonl.gz', 'sim 202')
