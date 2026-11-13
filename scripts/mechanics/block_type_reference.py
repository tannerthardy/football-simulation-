#!/usr/bin/env python3
"""Tracking-only lineman motion tags, not coaching assignments or contact labels.

python3 -I scripts/mechanics/block_type_reference.py --nfl runs.jsonl.gz \
  --combo scripts/mechanics/combo_displacement.py --out out/block-types/report.json

Uses run_film_reference.nfl()/sim(), CONCEPTS and puller() unchanged. The
--combo module is the exact separately owned #367 operator, not a second
implementation of its double/separation definition. --sim accepts only aligned
run-film-trace.ts traces. Output tags can overlap (a reach may be part of a
double and followed by a climb). Unknown/base/drive patterns are not forced
into the requested taxonomy. Only standard-library Python is required.
"""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import random
import re
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parent))
import run_film_reference as ref

DT, HORIZON = .1, 2.5
LABELS = ('down', 'reach', 'double', 'climb', 'pull', 'cutoff', 'pass-set')
DEFINITIONS = {
    'population': 'Every offensive OL on each loaded run; retain short, unclassified and non-five-OL rows.',
    'window': 'Motion in first 2.5 s, truncated at floor(end/0.1). Double acquisition/separation uses the pinned combo operator, through the live end.',
    'double': 'Exact #367 first unambiguous sustained adjacent pair per DL. Proximity, never proven contact/load.',
    'climb': 'Pinned combo climb-proxy OR OL advances >=0.75 yd with no first-level DL nearby and approaches a snap LB by >=0.5 yd. OL depth 2 and carrier below depth 2 at the candidate are reported separately; neither measures actual LB arrival or a won block.',
    'pull': 'Shared puller() 3-yard rule PLUS crossing behind a moving adjacent OL (>=0.3 yd deeper); parallel stretch alone is insufficient. Not an installed-puller label.',
    'down': 'Sustained near first-level DL initially >=0.5 yd inside this OL; OL moves >=0.4 yd toward the line median.',
    'reach': 'Sustained near initially run-side DL; OL moves >=0.5 yd run-side. Shoulder-level achievement is reported separately, not required.',
    'cutoff': 'Backside OL moves >=0.5 yd toward measured run side while near an initially run-side DL. Interposition (segment projection and perpendicular <=0.9 yd) is reported separately. Can overlap reach.',
    'pass-set': 'Retreat >=0.6 yd by 0.7 s, lateral change <=0.8 yd, retained for 0.3 s. May be load-induced; never proves a pass intention.',
    'run_side': 'Post-hoc carrier first LOS crossing within 2.5 s, lateral offset from OL median >0.5 yd. Otherwise unknown; never infer a called direction.',
    'confidence': 'Baseline versus strict near-radius sensitivity, not probability/validated accuracy. Robust means tag survives near=1.20 with all other thresholds unchanged.',
    'release': 'Only pinned combo separation/climb status. Administrative native engagement endings and hand/contact forces are not read.',
    'limitations': 'Tracking cannot establish assignments, blocks won, legal contact or causation. Seven tags omit ordinary drive/base blocks. PFF blocked-player IDs are not technique ground truth.',
}


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def combo_module(path):
    spec = importlib.util.spec_from_file_location('pinned_combo_displacement', path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = m
    spec.loader.exec_module(m)
    return m


def load_nfl(path):
    # Enrich identity only. All position/event/concept values come from ref.nfl.
    def originals():
        with gzip.open(path, 'rt') as f:
            for line in f:
                p = json.loads(line)
                if p['kind'] == 'run' and p['carrier'] is not None:
                    if abs(p.get('dt', DT) - DT) > 1e-8: raise ValueError('NFL converted input is not 10 Hz')
                    yield p
    for ordinal, (p, raw) in enumerate(zip(ref.nfl(path), originals(), strict=True)):
        p.update(id=raw.get('id', f'{path.name}#run-{ordinal}'), week=raw.get('week'),
                 observed=raw.get('observed'), annotated_pairs=raw.get('blocks', []), yards=raw.get('yards'))
        yield p


def load_sim(path):
    with open(path) as f:
        originals = json.load(f)
    originals = [p for p in originals if not p['nullified'] and any(
        f['c'] >= 0 and p['setup']['agents'][f['c']]['slot'] != 'QB' for f in p['frames'])]
    for raw in originals:
        if any(abs(f['t'] - DT * k) > .011 for k, f in enumerate(raw['frames'])):
            raise ValueError(f'{path}: all frames must be aligned at time zero and 10 Hz')
    for ordinal, (p, raw) in enumerate(zip(ref.sim([path]), originals, strict=True)):
        p.update(id=raw.get('id', f'{path.name}#run-{ordinal}'), week=None, yards=raw.get('yards'),
                 observed=[[True] * len(p['players']) for _ in p['xy']], annotated_pairs=[])
        # Identity/plan metadata never enters the classifier.
        for i, q in enumerate(p['players']):
            q['id'] = raw['setup']['agents'][i]['slot']
        yield p


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def first_span(flags, samples):
    count = 0
    for k, yes in enumerate(flags):
        count = count + 1 if yes else 0
        if count >= samples:
            return k - samples + 1, k
    return None


def classify(play, combo, near=None):
    """Positions only: no sim plans, targets, outcomes or annotation pairs read."""
    rules = combo.Rules() if near is None else combo.Rules(near=near)
    players, xy = play['players'], play['xy']
    ol = [i for i, q in enumerate(players) if q['side'] == 'O' and q['group'] == 'OL']
    rows = {i: {'actor': i, 'labels': {}, 'unknown': [], 'features': {}} for i in ol}
    end = play.get('end')
    if not xy or end is None or not math.isfinite(end) or end < 0:
        for r in rows.values(): r['unknown'].append('invalid_end_or_empty')
        return list(rows.values()), []
    last = min(len(xy) - 1, math.floor((min(end, HORIZON) + 1e-8) / DT))
    xy = xy[:last + 1]
    quality = 'not_five_ol' if len(ol) != 5 else None
    if any(len(f) != len(players) or any(not all(math.isfinite(v) for v in q) for q in f) for f in xy):
        quality = 'invalid_positions'
    observed = play.get('observed')
    live_rows = min(len(play['xy']), math.floor((end + 1e-8) / DT) + 1)
    if observed is not None and (len(observed) < live_rows or any(not all(f) for f in observed[:live_rows])):
        quality = 'missing_tracking_samples'
    if last < rules.sustain - 1: quality = 'short_live_window'
    if quality:
        for r in rows.values(): r['unknown'].append(quality)
        return list(rows.values()), []
    cy = sorted(xy[0][i][1] for i in ol)[2]
    dl = [i for i, q in enumerate(players) if q['side'] == 'D' and q['group'] == 'DL' and -.5 <= xy[0][i][0] <= 2]
    lb = [i for i, q in enumerate(players) if q['side'] == 'D' and q['group'] == 'LB' and 2 <= xy[0][i][0] <= 8]
    c = play['carrier']
    cross = next((k for k in range(last + 1) if xy[k][c][0] > 0), None)
    offset = xy[cross][c][1] - cy if cross is not None else 0
    side = (1 if offset > 0 else -1) if abs(offset) > .5 else None
    near_at = lambda i, j, k: distance(xy[k][i], xy[k][j]) <= rules.near
    episodes, exclusions = combo.measure(play, rules)
    def add(i, label, time, **evidence):
        rows[i]['labels'].setdefault(label, {'time_s': round(time, 2), **evidence})
    for e in episodes:
        for i in e['blockers']:
            if i in rows: add(i, 'double', e['start_s'], target=e['dl'], status=e['status'], duration_s=e['duration_s'])
        if e['status'] == 'climb-proxy' and e['climber'] in rows:
            add(e['climber'], 'climb', e['separation_s'], target=e['dl'], kind='confirmed_pair_separation_proxy', keeper=e['keeper'])
    lateral_order = sorted(ol, key=lambda i: xy[0][i][1])
    for i in ol:
        row, (x0, y0) = rows[i], xy[0][i]
        nearest = [min(dl, key=lambda j: distance(f[i], f[j])) if dl else None for f in xy]
        row['features'].update(live_window_s=round(last * DT, 2), censored_before_2p5=end < HORIZON,
                               run_side=side, shared_puller=ref.puller(xy, i, last),
                               missing_sample_provenance=observed is None)
        # Cross behind an actual moving neighbour, not its abandoned snap spot.
        rank = lateral_order.index(i)
        neighbours = lateral_order[max(0, rank - 1):rank] + lateral_order[rank + 1:rank + 2]
        if row['features']['shared_puller']:
            transit = next(((k, j) for k in range(last + 1) for j in neighbours
                if (xy[k][i][1] - xy[k][j][1]) * (y0 - xy[0][j][1]) <= 0
                and xy[k][i][0] <= xy[k][j][0] - .3 and xy[k][i][0] <= -.25), None)
            if transit:
                k,j=transit
                add(i, 'pull', k * DT, crossed_behind=j, behind_yards=round(xy[k][j][0]-xy[k][i][0],3),
                    lateral3_s=next(round(f*DT,2) for f in range(last+1) if abs(xy[f][i][1]-y0)>=3))
        # Local single-opponent path, with elapsed sustained proximity.
        contacts = []
        for j in dl:
            flags = [nearest[k] == j and near_at(i, j, k) for k in range(min(last, 15) + 1)]
            span = first_span(flags, rules.sustain)
            if span: contacts.append((span[0], span[1], j))
        if contacts:
            start, stop, j = min(contacts)
            row['features']['first_near_dl'] = {'actor': j, 'start_s': round(start * DT, 2)}
            own = 1 if y0 > cy + .5 else -1 if y0 < cy - .5 else None
            def witness(condition):
                return first_span([nearest[k] == j and near_at(i, j, k) and condition(k)
                    for k in range(min(last, 15) + 1)], rules.sustain)
            inward = own is not None and (xy[0][j][1] - y0) * own <= -.5
            down = witness(lambda k: inward and (xy[k][i][1] - y0) * own <= -.4)
            if down: add(i, 'down', down[0] * DT, target=j, verified_s=round(down[1]*DT,2),
                target_inside_yards=round(-(xy[0][j][1]-y0)*own,3), ol_inward_yards=round(-(xy[down[1]][i][1]-y0)*own,3))
            if side is not None:
                outward_target = (xy[0][j][1] - y0) * side >= .25
                reach = witness(lambda k: outward_target and (xy[k][i][1] - y0) * side >= .5)
                if reach: add(i, 'reach', reach[0] * DT, target=j, verified_s=round(reach[1]*DT,2),
                    ol_run_side_yards=round((xy[reach[1]][i][1]-y0)*side,3), shoulder_gap_yards=round((xy[reach[1]][i][1]-xy[reach[1]][j][1])*side,3),
                    shoulder_level_observed=any(near_at(i,j,k) and (xy[k][i][1]-xy[k][j][1])*side>=-.25 for k in range(start,last+1)))
                def interposed(k):
                    b, d, carrier = xy[k][i], xy[k][j], xy[k][c]
                    v = (carrier[0] - d[0], carrier[1] - d[1]); length = math.hypot(*v)
                    if length < .1: return False
                    along = ((b[0] - d[0]) * v[0] + (b[1] - d[1]) * v[1]) / length**2
                    perp = abs((b[0] - d[0]) * v[1] - (b[1] - d[1]) * v[0]) / length
                    return 0 < along < 1 and perp <= .9
                cutoff = witness(lambda k: (y0 - cy) * side < -.5 and outward_target
                    and (xy[k][i][1] - y0) * side >= .5)
                if cutoff: add(i, 'cutoff', cutoff[0] * DT, target=j, verified_s=round(cutoff[1]*DT,2),
                    ol_run_side_yards=round((xy[cutoff[1]][i][1]-y0)*side,3),
                    interposition_observed=any(near_at(i,j,k) and interposed(k) for k in range(start,last+1)))
        # Retreat itself does not identify whether a request or load caused it.
        early = min(last, 7)
        back = next((k for k in range(early + 1) if xy[k][i][0] - x0 <= -.6), None)
        if back is not None and max(abs(xy[k][i][1] - y0) for k in range(early + 1)) <= .8:
            if back + 3 <= last and all(xy[k][i][0] - x0 <= -.5 for k in range(back, back + 4)):
                loaded = any(near_at(i, j, k) for j in dl for k in range(min(last, 3) + 1))
                add(i, 'pass-set', back * DT, retreat_yards=round(x0-xy[back][i][0],3), early_dl_proximity=loaded, force_origin='unmeasured_from_tracking')
        # Keep an uncovered/late second-level approach, without calling it a won block.
        for k in range(last + 1):
            if xy[k][i][0] - x0 < .75 or any(near_at(i, j, k) for j in dl): continue
            targets = [j for j in lb if distance(xy[k][i], xy[0][j]) <= distance(xy[0][i], xy[0][j]) - .5]
            if targets:
                add(i, 'climb', k * DT, kind='second_level_advance_proxy', carrier_below_depth2_at_candidate=xy[k][c][0] < 2,
                    target=min(targets,key=lambda j:distance(xy[k][i],xy[0][j])), depth_yards=round(xy[k][i][0],3),
                    depth2_observed=any(f[i][0]>=2 for f in xy))
                break
        if not row['labels']: row['unknown'].append('base_drive_or_unresolved_geometry')
        if side is None: row['features']['reach_cutoff_side_unresolved'] = True
    return list(rows.values()), episodes


def annotate(play, combo):
    baseline, episodes = classify(play, combo)
    strict, _ = classify(play, combo, near=1.20)
    by_actor = {r['actor']: r for r in strict}
    for row in baseline:
        for label, value in row['labels'].items():
            value['confidence'] = 'radius_robust' if label in by_actor[row['actor']]['labels'] else 'radius_sensitive'
        row['motion_candidates'] = sorted(set(row['labels']) & {'down','reach','cutoff','pull','pass-set'})
        row['overlapping_motion_geometry'] = len(row['motion_candidates']) > 1
        row['coaching_assignment'] = 'not_observed'
        actor = play['players'][row['actor']]
        row.update(play_id=play['id'], src=play['src'], week=play.get('week'), concept=play['concept'],
                   player_id=actor.get('id', str(row['actor'])), name=actor.get('name'), yards=play.get('yards'))
    return baseline, episodes


def summary(rows, by_concept=False):
    groups = defaultdict(list)
    for r in rows: groups[(r['src'], str(r.get('week') or 'all'), r['concept'] if by_concept else 'ALL')].append(r)
    table = []
    for (src, week, concept), rr in sorted(groups.items()):
        for label in (*LABELS, 'unknown'):
            hits = [r for r in rr if (bool(r['unknown']) if label == 'unknown' else label in r['labels'])]
            robust = sum(label != 'unknown' and r['labels'][label]['confidence'] == 'radius_robust' for r in hits)
            table.append({'src': src, 'week': week, 'concept': concept, 'label': label, 'n': len(hits), 'denominator': len(rr),
                          'share': len(hits) / len(rr) if rr else None, 'radius_robust_n': robust})
    return table


def rate_uncertainty(rows, draws=2000, seed=20261028, by_concept=False):
    """Percentile intervals for observed tag rates, never assignment accuracy.

    Resample whole NFL games with replacement, keeping all OL and plays in
    each game together. Use the pooled OL denominator, not a mean of game
    rates. Refuse intervals when game identities are missing/ambiguous.
    Radius-robust counts remain a separate sensitivity measure.
    """
    if not isinstance(draws, int) or draws < 2:
        raise ValueError('draws must be an integer >= 2')
    labels = (*LABELS, 'unknown')
    groups = defaultdict(list)
    for row in rows:
        groups[row['src'], row['concept'] if by_concept else 'ALL'].append(row)
    result = []
    for (src, concept), rr in sorted(groups.items()):
        games, identities, issues = {}, set(), set()
        for row in rr:
            match = re.fullmatch(r'(\d{10})-\d+', str(row.get('play_id', ''))) if src == 'nfl' else None
            identity = (row.get('play_id'), row['actor'])
            if not match:
                issues.add('game_identity_unavailable')
            if identity in identities:
                issues.add('duplicate_play_actor_identity')
            identities.add(identity)
            if match:
                vector = games.setdefault(match[1], [0] * (len(labels) + 1))
                vector[0] += 1
                for j, label in enumerate(labels, 1):
                    vector[j] += bool(row['unknown']) if label == 'unknown' else label in row['labels']
        reason = sorted(issues)[0] if issues else None
        if reason is None and len(games) < 2:
            reason = 'fewer_than_two_games'
        estimates = [[] for _ in labels]
        if reason is None:
            vectors = [games[key] for key in sorted(games)]
            rng = random.Random(seed)
            for _ in range(draws):
                sampled = rng.choices(vectors, k=len(vectors))
                denominator = sum(v[0] for v in sampled)
                for j, values in enumerate(estimates, 1):
                    values.append(sum(v[j] for v in sampled) / denominator)
        for j, label in enumerate(labels):
            hits = sum(bool(row['unknown']) if label == 'unknown' else label in row['labels'] for row in rr)
            values = sorted(estimates[j])
            def quantile(p):
                at = p * (len(values) - 1)
                lo, hi = math.floor(at), math.ceil(at)
                return values[lo] + (values[hi] - values[lo]) * (at - lo)
            result.append({'src': src, 'concept': concept, 'label': label, 'n': hits,
                'denominator': len(rr), 'share': hits / len(rr), 'games': len(games),
                'ci95': [quantile(.025), quantile(.975)] if values else None,
                'interval_unavailable': reason, 'draws': draws, 'seed': seed,
                'method': 'whole-game cluster bootstrap, percentile95, pooled OL denominator',
                'scope': 'observed candidate-tag frequency; not coaching-label accuracy, radius error or full-season prevalence'})
    return result


def examples(rows):
    chosen=[]
    for label in LABELS:
        candidate=next((r for r in rows if label in r['labels'] and r['labels'][label]['confidence']=='radius_robust'),None)
        if candidate: chosen.append({'selection':'first radius-robust '+label,'row':candidate})
    for reason,test in [('first negative-gain labelled row',lambda r:r['yards'] is not None and r['yards']<0 and bool(r['labels'])),
                        ('first unknown row',lambda r:bool(r['unknown'])),
                        ('first radius-sensitive label',lambda r:any(v['confidence']=='radius_sensitive' for v in r['labels'].values()))]:
        candidate=next((r for r in rows if test(r)),None)
        if candidate: chosen.append({'selection':reason,'row':candidate})
    return chosen


def self_test(combo):
    # Seven toy paths plus opposing, mirror, censor and loader contracts.
    def play():
        players = [{'side': 'O', 'group': 'OL'} for _ in range(5)] + [
            {'side': 'D', 'group': 'DL'}, {'side': 'D', 'group': 'LB'}, {'side': 'O', 'group': 'RB'}]
        xy = [[(-.5, y) for y in (16, 18, 20, 22, 24)] + [(0, 18.8), (5, 21), (-2 + k * .18, 22)] for k in range(31)]
        return {'src': 'nfl', 'id': 'toy', 'concept': 'POWER', 'players': players, 'xy': xy, 'carrier': 7, 'end': 3.0}
    def tags(p, i): return classify(p, combo)[0][i]['labels']
    p = play()
    for k in range(31):
        p['xy'][k][0] = (-1.5, 16 + .4 * k)
    assert 'pull' in tags(p, 0)
    q = json.loads(json.dumps(p)); q['end'] = .5
    assert 'pull' not in tags(q, 0), 'post-whistle pull admitted'
    q = json.loads(json.dumps(p)); q['xy'] = [[(x, 160/3-y) for x,y in f] for f in q['xy']]
    assert set(tags(q, 0)) == set(tags(p, 0)), 'mirror changed tags'
    p = play()
    for k in range(31):
        p['xy'][k][5] = (.4, 21)
        p['xy'][k][3] = (-.2, 22 - min(k * .12, 1))
    assert 'down' in tags(p, 3)
    p = play()
    for k in range(31):
        p['xy'][k][5] = (.4, 24.8)
        p['xy'][k][4] = (-.2, 24 + min(k * .12, 1))
    assert 'reach' in tags(p, 4)
    q = json.loads(json.dumps(p))
    for k,f in enumerate(q['xy']): f[5][1] = 24.8 + min(k*.12,1)
    assert 'reach' in tags(q,4) and not tags(q,4)['reach']['shoulder_level_observed'], 'failed reach attempt was selected out'
    q = json.loads(json.dumps(p))
    for f in q['xy']: f[7][1] = 18
    assert 'reach' not in tags(q, 4), 'opposite run side accepted as reach'
    p = play()
    for k in range(31):
        p['xy'][k][5] = (.4, 18.8)
        p['xy'][k][1] = (-.2, 18 + min(k * .1, 1.2))
    assert 'cutoff' in tags(p, 1)
    q=json.loads(json.dumps(p))
    for k,f in enumerate(q['xy']): f[5][1]=18.8+min(k*.1,1.2)
    assert 'cutoff' in tags(q,1) and not tags(q,1)['cutoff']['interposition_observed'], 'failed cutoff approach was selected out'
    p = play()
    for k in range(31): p['xy'][k][4] = (-.5 - min(k * .2, 1), 24)
    assert 'pass-set' in tags(p, 4)
    p = play()
    for k in range(31): p['xy'][k][2] = (min(-.5 + k * .2, 3), 20.5)
    assert 'climb' in tags(p, 2)
    q=json.loads(json.dumps(p))
    for k,f in enumerate(q['xy']): f[2]=(-.5+min(k*.1,1),20.5)
    assert 'climb' in tags(q,2) and not tags(q,2)['climb']['depth2_observed'], 'short second-level attempt was selected out'
    p = play()
    for k in range(31):
        p['xy'][k][1] = (-.2, 18.0)
        p['xy'][k][2] = (-.2, 20.0)
    assert 'double' in tags(p, 1) and 'double' in tags(p, 2)
    p['xy'] = p['xy'][:3]; p['end'] = .2
    assert all(r['unknown'] for r in classify(p, combo)[0]), 'short overlap treated as full evidence'
    p = play(); p['observed'] = [[True] * 8 for _ in p['xy']]; p['observed'][28][5] = False
    assert all('missing_tracking_samples' in r['unknown'] for r in classify(p,combo)[0]), 'late copied-forward sample admitted into combo evidence'
    p = play(); p['players'].append({'side':'O','group':'OL'})
    for f in p['xy']: f.append((-.5,26))
    rr=classify(p,combo)[0]
    assert len(rr)==6 and all('not_five_ol' in r['unknown'] for r in rr), 'jumbo OL disappeared'
    # Same geometry through shared NFL and sim loaders, deliberately changed plan metadata.
    p = play(); raw = {'id': 'toy', 'kind': 'run', 'carrier': 7, 'players': p['players'],
        'xy': [[v for pair in f for v in pair] for f in p['xy']], 'cell': {'concept':'POWER'}, 'events':{'end':3}}
    native = {'id':'toy','nullified':False,'setup':{'concept':'power','los':40,'agents':[
        {'team':q['side'],'pos':'OT' if q['group']=='OL' else q['group'],'slot':str(i) if i!=7 else 'RB','plan':'untrusted-plan'} for i,q in enumerate(p['players'])]},
        'events':[], 'frames':[{'t':round(k*.1,2),'c':7,'a':[[x+40,y] for x,y in f]} for k,f in enumerate(p['xy'])]}
    with tempfile.TemporaryDirectory() as d:
        a,b=Path(d)/'nfl.gz',Path(d)/'sim.json'
        with gzip.open(a,'wt') as f:f.write(json.dumps(raw)+'\n')
        b.write_text(json.dumps([native]));n=list(load_nfl(a))[0];s=list(load_sim(b))[0]
        assert [r['labels'] for r in classify(n,combo)[0]] == [r['labels'] for r in classify(s,combo)[0]]
        native['frames'][0]['t']=.05;b.write_text(json.dumps([native]))
        try:list(load_sim(b));raise AssertionError('offset clock accepted')
        except (SystemExit, ValueError):pass
    # Two known games, unequal OL counts: use pooled counts, not mean rates.
    rr = [{'src':'nfl','concept':'POWER','play_id':game,'actor':i,
        'labels':{'down':{}} if hit else {},'unknown':[] if hit else ['unresolved']}
        for game, count, hit in [('2022090800-1',2,True),('2022091100-2',6,False)]
        for i in range(count)]
    uncertainty = rate_uncertainty(rr)
    down = next(r for r in uncertainty if r['label']=='down')
    unknown = next(r for r in uncertainty if r['label']=='unknown')
    assert down['share']==.25 and down['ci95']==[0,1] and down['games']==2
    assert unknown['share']==.75 and unknown['ci95']==[0,1]
    assert rate_uncertainty(list(reversed(rr)))==uncertainty, 'row order changed interval'
    assert all(r['ci95'] is None and r['interval_unavailable']=='fewer_than_two_games'
        for r in rate_uncertainty(rr[:2])), 'individual OL treated as independent games'
    q=json.loads(json.dumps(rr));q[0]['play_id']='unidentified'
    assert all(r['ci95'] is None for r in rate_uncertainty(q)), 'invented game identities'
    assert all(r['ci95'] is None and r['interval_unavailable']=='duplicate_play_actor_identity'
        for r in rate_uncertainty(rr+[rr[0]])), 'duplicate population certified'
    return {'status':'passed','checks':['pull','post-whistle opposing','mirror','down','reach','opposite-side opposing','failed reach retained','cutoff','failed cutoff retained','retreat','climb','short climb retained','double','short-window','missing-sample rejection','six-OL retention','shared-loader equality','offset-clock rejection','pooled game-cluster rates','interval row-order invariance','single-game interval unavailable','missing-game interval unavailable','duplicate-identity interval unavailable']}


def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--nfl',nargs='*',type=Path,default=[])
    parser.add_argument('--sim',nargs='*',type=Path,default=[])
    parser.add_argument('--combo',type=Path,default=Path(__file__).with_name('combo_displacement.py'))
    parser.add_argument('--out',type=Path)
    parser.add_argument('--self-test',action='store_true')
    args=parser.parse_args()
    if not args.combo.is_file():parser.error('--combo must name the pinned #367 operator; no alternate double definition is substituted')
    combo=combo_module(args.combo)
    if args.self_test:print(json.dumps(self_test(combo)));return
    if not args.out or not (args.nfl or args.sim):parser.error('provide --out and at least one input')
    protected=[*args.nfl,*args.sim,args.combo,Path(ref.__file__),Path(__file__)]
    if any(args.out.resolve() == p.resolve() or
           (args.out.exists() and p.exists() and args.out.samefile(p)) for p in protected):
        parser.error('--out must not overwrite an input or operator')
    hashes=[(str(p),digest(p)) for p in args.nfl+args.sim]
    if len({h for _,h in hashes}) != len(hashes):parser.error('duplicate input digest; refusing to count a cohort twice')
    rows, episodes, counts=[],[],Counter()
    for path,loader in [(p,load_nfl) for p in args.nfl]+[(p,load_sim) for p in args.sim]:
        for play in loader(path):
            counts['run_plays']+=1
            rr,ee=annotate(play,combo);rows.extend(rr)
            episodes.extend([{'play_id':play['id'],'src':play['src'],**e} for e in ee])
    report={'version':'block-geometry-v1','source_kind':'tracking-only geometric multi-labels','definitions':DEFINITIONS,
        'combo_rules':vars(combo.Rules()),'inputs':[{'path':str(p),'sha256':digest(p)} for p in args.nfl+args.sim],
        'source_hashes':{'script':digest(Path(__file__)),'loader':digest(Path(ref.__file__)),'combo':digest(args.combo)},
        'counts':{**dict(counts),'ol_rows':len(rows),'overlapping_motion_rows':sum(r['overlapping_motion_geometry'] for r in rows)},'concepts':dict(Counter(r['concept'] for r in rows)),'unknown_reasons':dict(Counter(x for r in rows for x in r['unknown'])),
        'validation_examples':examples(rows),'summary':summary(rows),'summary_by_concept':summary(rows,True),
        'rate_uncertainty':rate_uncertainty(rows),
        'rate_uncertainty_by_concept':rate_uncertainty(rows,by_concept=True),
        'rows':rows,'combo_episodes':episodes}
    args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(report,indent=2)+'\n')
    print('| Source/week | Geometric tag | OL rows | Share | Radius-robust rows |')
    print('|---|---|---:|---:|---:|')
    for r in report['summary']:print(f"| {r['src']}/{r['week']} | {r['label']} | {r['n']}/{r['denominator']} | {100*r['share']:.1f}% | {r['radius_robust_n']} |")
    print('\nTags overlap; unknown includes drive/base or unresolved patterns. Robustness is not validated technique accuracy.')
    print('\n| Source | Tag | OL rows | Game-cluster 95% interval |')
    print('|---|---|---:|---|')
    for r in report['rate_uncertainty']:
        ci=r['ci95'];value=f'{100*ci[0]:.1f}%–{100*ci[1]:.1f}%' if ci else r['interval_unavailable']
        print(f"| {r['src']} | {r['label']} | {r['n']}/{r['denominator']} | {value} |")


if __name__ == '__main__':main()
