"""Playbook coverage: NFL route combinations by BDB 2025's own route labels, and whether our concepts produce them.

No classifier: routes are routeRan (PFF), numbers come from the alignment at the snap (outside-in to each side of
the ball, among the receivers who ran a route; a back is aligned in the backfield within 4.5 yd of the ball). Per side of the formation the routes by
number make a combination (#1, #2, #3); a whole play is its two sides plus the back's route. Our concepts' routes
(src/playbook/concepts.ts) are mapped to the same labels (ROUTE_LABEL) and a combination is "ours" if some concept
puts exactly those routes on #1..#k of one side; a whole play is ours if one concept gives both sides (either way
round).

  python3 -I playbook_coverage.py <bdb dir> <snap.csv> <concepts.json> [dropback|all]
  (dropback, the default: drop-back passes only, population.py; all: every dropback as in the first report.)
  (snap.csv: the tracking rows with frameType SNAP; concepts.json: id -> {strong, weak, back}.)
"""
import sys, os, csv, json, math, collections as C
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from population import nfl_population

# Our route ids -> BDB routeRan labels. Seams and fades are GO in BDB; sit, hook, stick, curl and comeback are HITCH;
# digs and short ins are IN; shallow and deep crossers are CROSS; a swing is FLAT.
ROUTE_LABEL = {'slant': 'SLANT', 'flat': 'FLAT', 'hook': 'HITCH', 'go': 'GO', 'stick': 'HITCH', 'quick_out': 'OUT',
               'hitch': 'HITCH', 'seam': 'GO', 'corner': 'CORNER', 'curl': 'HITCH', 'shallow': 'CROSS', 'shallow_high': 'CROSS',
               'swing': 'FLAT', 'out': 'OUT', 'dig': 'IN', 'cross': 'CROSS', 'post': 'POST', 'short_in': 'IN', 'comeback': 'HITCH',
               'deep_out': 'OUT', 'back_flat': 'FLAT', 'block': 'block', 'check': 'block'}

def main():
    D, snap_path, concepts_path = sys.argv[1], sys.argv[2], sys.argv[3]
    pop, why = nfl_population(D)
    mode = sys.argv[4] if len(sys.argv) > 4 else 'dropback'
    keep = {k for k, v in pop.items() if v == 'keep' or (mode == 'all' and v != 'spike/kneel/sneak/nullified')}
    plays = {(r['gameId'], r['playId']): r for r in csv.DictReader(open(f'{D}/plays.csv')) if (r['gameId'], r['playId']) in keep}
    print('== NFL population: ' + ', '.join(f'{k} {v}' for k, v in why.most_common()) + f' (kept: {mode})')
    pos = {r['nflId']: r['position'] for r in csv.DictReader(open(f'{D}/players.csv'))}
    pp = C.defaultdict(dict)
    for r in csv.DictReader(open(f'{D}/player_play.csv')):
        k = (r['gameId'], r['playId'])
        if k in plays: pp[k][r['nflId']] = r
    snap = C.defaultdict(list)
    for r in csv.DictReader(open(snap_path)):
        k = (r['gameId'], r['playId'])
        if k in plays: snap[k].append(r)
    # Our side combinations, and whole concepts (two sides).
    concepts = json.load(open(concepts_path))
    ours_side = set(); ours_play = set()
    for cid, c in concepts.items():
        sides = []
        for s in ('strong', 'weak'):
            routes = [ROUTE_LABEL.get(c[s].get(str(n)), '?') for n in (1, 2, 3, 4) if str(n) in c[s]]
            for k in range(1, len(routes) + 1): ours_side.add(tuple(routes[:k]))
            sides.append(routes)
        for a in range(1, len(sides[0]) + 1):
            for b in range(1, len(sides[1]) + 1):
                ours_play.add(tuple(sorted([tuple(sides[0][:a]), tuple(sides[1][:b])])))
    sideN = C.Counter(); sideT = C.Counter(); sideY = C.defaultdict(list); sideTgt = C.Counter()
    playN = C.Counter(); playY = C.defaultdict(list); backN = C.Counter()
    n = 0; nolabel = 0; have_play = 0; have_both_sides = 0; sides_total = 0; sides_have = 0
    for k, rows in snap.items():
        pr = plays[k]
        ball = next((r for r in rows if r['nflId'] in ('', 'NA')), None)
        if not ball: continue
        off = [r for r in rows if r['club'] == pr['possessionTeam'] and r['nflId'] not in ('', 'NA')]
        left = rows[0]['playDirection'] == 'left'
        los = float(pr['absoluteYardlineNumber'])
        X = lambda r: (los - float(r['x'])) if not left else (float(r['x']) - los)  # yards behind the line (+)
        by = float(ball['y'])
        elig = [r for r in off if pos.get(r['nflId']) in ('WR', 'TE', 'RB', 'FB')]
        backs = [r for r in elig if X(r) > 2.5 and abs(float(r['y']) - by) < 4.5]
        wide = [r for r in elig if r not in backs]
        label = lambda r: (pp[k].get(r['nflId'], {}).get('routeRan') or 'NA') if pp[k].get(r['nflId'], {}).get('wasRunningRoute') in ('1', 'TRUE', 'True') else 'block'
        sgn = 1 if not left else -1  # field y toward the offence's left is +y when moving right
        sides = []
        for s in (+1, -1):
            # Route runners only, numbered outside-in among themselves: an attached end who stays in to block is
            # not part of the side's pattern (our concepts mark him with teBlock rather than a route).
            side = sorted([r for r in wide if (float(r['y']) - by) * s > 0 and label(r) not in ('block', 'NA')], key=lambda r: -abs(float(r['y']) - by))
            sides.append((tuple(label(r) for r in side), side))
        if not any(s[0] for s in sides): nolabel += 1; continue
        n += 1
        tgt = next((nid for nid, q in pp[k].items() if q.get('wasTargettedReceiver') in ('1', 'TRUE', 'True')), None)
        yds = float(pr['yardsGained']) if pr['yardsGained'] not in ('', 'NA') else 0.0
        back = '+'.join(sorted(label(r) for r in backs)) or 'none'
        backN[back] += 1
        for combo, side in sides:
            if not combo: continue
            sides_total += 1
            sideN[combo] += 1; sideY[combo].append(yds)
            if tgt and any(r['nflId'] == tgt for r in side): sideTgt[combo] += 1
            if combo in ours_side: sides_have += 1
        key = tuple(sorted(c for c, _ in sides if c))
        playN[key] += 1; playY[key].append(yds)
        if key in ours_play or (len(key) == 1 and key[0] in ours_side): have_play += 1
        if all(c in ours_side for c in key): have_both_sides += 1
    pc = lambda a, b: f'{100 * a / b:.1f}%' if b else '—'
    m = lambda v: sum(v) / len(v) if v else float('nan')
    print(f'== NFL plays (BDB 2025 weeks 1-9) with at least one labelled route: {n} ({nolabel} with none left out)')
    print('   Sides count route runners only, numbered outside-in among themselves; blockers are left out.')
    print(f'   sides (a side with at least one receiver): {sides_total}; side combination one of ours: {pc(sides_have, sides_total)}')
    print(f'   both sides each a combination one of our concepts runs: {pc(have_both_sides, n)}; the whole play exactly one of our concepts: {pc(have_play, n)}')
    def table(title, counter, length=None, top=25):
        print(f'\n== {title}')
        print('rank | combination (#1, #2, #3 outside-in) | n | share | ours | target share (side) | yards a play')
        rows = [(k, v) for k, v in counter.items() if length is None or len(k) == length]
        tot = sum(v for _, v in rows)
        for i, (k, v) in enumerate(sorted(rows, key=lambda t: -t[1])[:top], 1):
            print(f"{i} | {' + '.join(k)} | {v} | {pc(v, tot)} | {'yes' if k in ours_side else 'NO'} | {pc(sideTgt[k], v)} | {m(sideY[k]):.2f}")
    table('single-receiver sides', sideN, 1, 12)
    table('two-receiver sides', sideN, 2)
    table('three-receiver sides', sideN, 3)
    print('\n== whole plays (both sides), most common')
    print('rank | side A | side B | n | share | ours (one concept) | yards a play')
    for i, (k, v) in enumerate(playN.most_common(25), 1):
        print(f"{i} | {' + '.join(k[0])} | {' + '.join(k[1]) if len(k) > 1 else '—'} | {v} | {pc(v, n)} | {'yes' if (k in ours_play or (len(k) == 1 and k[0] in ours_side)) else 'NO'} | {m(playY[k]):.2f}")
    print('\n== the back: ' + ', '.join(f'{k} {pc(v, n)}' for k, v in backN.most_common(8)))
    # The common NFL side combinations we lack, by how much of the NFL they cover.
    miss = [(k, v) for k, v in sideN.items() if k not in ours_side]
    print('\n== most common side combinations we do not run (share of all sides)')
    for k, v in sorted(miss, key=lambda t: -t[1])[:20]:
        print(f"  {' + '.join(k):35} {v:5} {pc(v, sides_total)}  target share {pc(sideTgt[k], v)}  yards a play {m(sideY[k]):.2f}")

if __name__ == '__main__':
    main()
