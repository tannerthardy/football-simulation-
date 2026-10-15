"""Reduce the saved PR #54 games and two passive full-game replays.

No native simulation. NFL context selection reuses the existing pinned pure
operators/backoff; this is a separately declared mapping of PR #54 logs, not
an assertion that they are the older eight-game-index producer.
"""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import statistics
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('rushing_adapter', ROOT/'scripts/data/engine_rushing_benchmark.py')
adapter = importlib.util.module_from_spec(spec); spec.loader.exec_module(adapter)


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == '.gz' else path.read_bytes())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def dist(a, b):
    return math.hypot(a['x']-b['x'], a['y']-b['y'])


def success(p, rounded=False):
    gain = math.floor(p['yards']+.5) if rounded else p['yards']
    distance = math.floor(p['distance']+.5) if rounded else p['distance']
    return gain >= distance*(.4 if p['down'] == 1 else .6 if p['down'] == 2 else 1)


def metrics(plays, rounded=False):
    xs = [math.floor(p['yards']+.5) if rounded else p['yards'] for p in plays]
    if not xs:
        return {'n': 0}
    first_contacts = [next((e for e in p.get('events', []) if e['type'] == 'carrier_contact'), None) for p in plays]
    qb_contacts = sum(bool(e and e.get('a') == 0) for e in first_contacts)
    return {'n': len(xs), 'mean': statistics.mean(xs), 'median': statistics.median(xs),
        'cappedMean10': statistics.mean(min(x, 10) for x in xs),
        'stuffCount': sum(x <= 0 for x in xs), 'successCount': sum(success(p, rounded) for p in plays),
        'below4': sum(x < 4 for x in xs), '4toUnder10': sum(4 <= x < 10 for x in xs),
        '10plus': sum(x >= 10 for x in xs), '20plus': sum(x >= 20 for x in xs), '40plus': sum(x >= 40 for x in xs),
        '10plusShareOfNetYards': sum(x for x in xs if x >= 10)/sum(xs) if sum(xs) else None,
        'firstCarrierContactIsQB': qb_contacts,
        'recordedContactDepthKnown': sum('yardsBeforeContact' in p['stats'] for p in plays),
        'recordedContactDepthMedian': statistics.median(p['stats']['yardsBeforeContact'] for p in plays if 'yardsBeforeContact' in p['stats']),
        'recordedContactDepthBelow1': sum(p['stats'].get('yardsBeforeContact', math.inf) < 1 for p in plays)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', type=Path, default=ROOT/'data/reviews/current/experimental-game-checkpoint')
    ap.add_argument('--traces', type=Path, default=ROOT/'out/designed-run-games')
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args(); started = time.perf_counter()
    original = read(ROOT/'data/reviews/current/experimental-game-inputs.json')
    nfl_path = ROOT/'data/reviews/rushing-benchmark/reference/nfl-benchmark.json.gz'
    nfl = read(nfl_path); adapter.validate_nfl_report(nfl)
    lookup = adapter.reference_lookup(nfl)
    rb_reference = lookup[(('kind', 'carrier'), ('designedRun', 'RB_FB'))]
    result = {'protocol': 'designed-run-game-report-v1', 'arms': {}, 'witnesses': [],
        'nflReference': {k: rb_reference[k] for k in ['context', 'counts', 'yards', 'rates', 'tailYardContribution']},
        'nflReferenceSha256': sha(nfl_path), 'sourceCommit': '404d3366d92449c30aedcba1957812fe5ea8b9aa',
        'newGames': 3, 'independentCheckpointGamesPerArm': 4,
        'mapping': 'PR54 native run logs, clean all-foul exclusion, exact rusher ID to frozen team roster. Log down/distance/yardline are snap context; previous recorded score supplies pre-snap score. Source/flag/team pins verified. Shared NFL gain/rate/context/backoff operators reused; not the older ordinary-eight-game native-index adapter.'}
    matching_receipts = {}
    for arm in ['accepted', 'experimental']:
        plays, games, matched = [], [], defaultdict(list)
        for fixture in original['fixtures']:
            p = args.root/arm/fixture['id']/'summary.json'; game = read(p)
            assert game['complete'] and game['finalState']['over']
            assert game['provenance']['sourceSha256'] == original['sources'][arm]
            assert game['provenance']['flags'] == original['flags']
            assert game['provenance']['teamsSha256'] == fixture['teamsSha256']
            positions = {a['id']: a['position'] for side in fixture['teams'].values() for a in side['roster']}
            previous_score = {'home': 0, 'away': 0}
            for play in game['log']:
                if play['kind'] == 'run' and not play.get('foul') and not play.get('nullified'):
                    item = {**play, 'fixture': fixture['id']}; plays.append(item)
                    position = positions.get(play['stats'].get('rusher'))
                    carrier = 'RB_FB' if position in ['RB', 'FB'] else 'unknown'
                    item['verifiedCarrier'] = carrier
                    row = {'yards_gained': play['yards'], 'down': play['down'], 'ydstogo': play['distance'],
                        'yardline_100': 100-play['yardline'], 'qtr': play['quarter'],
                        'game_seconds_remaining': (4-play['quarter'])*900+play['clock'] if play['quarter'] <= 4 else None,
                        'score_differential': previous_score['home']-previous_score['away'] if play['offense'] == fixture['teams']['home']['abbr'] else previous_score['away']-previous_score['home']}
                    context = adapter.benchmark.context(row, carrier); context['kind'] = 'designedRun'
                    for metric in ['meanYards', 'cappedMean10', 'success4060100', 'stuff', 'explosive20plus', 'explosive40plus']:
                        reference = adapter.choose_reference(lookup, context, metric) if carrier == 'RB_FB' else {'status':'unavailable','reason':'No verified actual carrier; do not back off to a normal RB population.'}
                        observed = play['yards'] if metric == 'meanYards' else min(play['yards'], 10) if metric == 'cappedMean10' else 100*int(success(play)) if metric == 'success4060100' else 100*int(play['yards'] <= 0) if metric == 'stuff' else 100*int(play['yards'] >= (20 if metric == 'explosive20plus' else 40))
                        matched[metric].append({'fixture': fixture['id'], 'play': play['index'], 'engineContext': {k: context[k] for k in adapter.benchmark.CELL_FIELDS}, 'observed': observed, **reference})
                previous_score = play['score']
            games.append({'id': fixture['id'], 'seed': fixture['seed'], 'score': game['score'],
                'officialRushYards': [t['box']['rushYds'] for t in game['teams']], 'sourceSha256': game['provenance']['sourceSha256'],
                'summarySha256': sha(p)})
        grouped = {}
        for dimension in ['concept', 'qb', 'formation']:
            groups = defaultdict(list)
            for p in plays: groups[p['plan'][dimension]].append(p)
            grouped[dimension] = {k: metrics(v) for k, v in sorted(groups.items())}
        ordinary = []
        for p in plays:
            if p['down'] <= 2 and 8 <= p['distance'] <= 10 and p['yardline'] < 80:
                ordinary.append(p)
        standardized = {}; matching_receipts[arm] = dict(matched)
        for metric, receipts in matched.items():
            supported = [r for r in receipts if r['status'] == 'supported']
            standardized[metric] = {'n': len(receipts), 'retained': len(supported),
                'observed': statistics.mean(r['observed'] for r in supported) if supported else None,
                'nflExpected': statistics.mean(r['referenceValue'] for r in supported) if supported else None,
                'backoffCounts': dict(Counter('/'.join(r['discardedDimensions']) or 'none' for r in supported)),
                'receiptsFile': 'nfl-matching-receipts.json.gz'}
        unresolved = [{'fixture':p['fixture'],'play':p['index'],'concept':p['plan']['concept'],
            'formation':p['plan']['formation'],'yards':p['yards'],'outcome':p['outcome'],
            'handoffRecorded':any(e['type']=='handoff' for e in p.get('events',[]))} for p in plays if p['verifiedCarrier'] == 'unknown']
        result['arms'][arm] = {'metrics': metrics(plays), 'rounded': metrics(plays, True), 'groups': grouped,
            'verifiedRB_FB':metrics([p for p in plays if p['verifiedCarrier']=='RB_FB']), 'unverifiedCarrier':unresolved,
            'earlyDown8to10OutsideRedZone': metrics(ordinary), 'standardized': standardized, 'games': games,
            'ordinaryContextLimit': 'This subset omits score/clock filters and is not the NFL ordinaryRB_FB cohort. Primary expected means/rates use fixed kind/carrier/down/distance/field backoff; never average cell medians.'}
    timeline = []
    for name in ['zone-reference', 'power-zone']:
        trace_path = args.traces/(name+'.json.gz'); trace = read(trace_path)
        assert trace['complete'] and trace['logSha256'] == trace['referenceLogSha256']
        assert trace['sourceSha256'] == original['sources']['experimental']
        saved = read(args.root/'experimental'/name/'summary.json')
        for row in trace['rows']:
            if not row['selected']: continue
            play = next(p for p in saved['log'] if p['index'] == row['index'])
            handoff = next((e for e in play['events'] if e['type'] == 'handoff'), None)
            contact = next((e for e in play['events'] if e['type'] == 'carrier_contact'), None)
            loaded = defaultdict(list)
            for frame in row['frames']:
                for joint in frame['jointOutputs']:
                    if joint['kind'] == 'hands' and max(abs(joint.get('normalForce') or 0), abs(joint.get('tangentForce') or 0)) > 1e-8:
                        loaded[f"{joint['a']}:{joint['b']}"].append(frame['t'])
            slow_ticks = []
            for f in row['frames']:
                before, after, raw, final = f['before'][6], f['after'][6], f['raw'][6]['vel'], f['final'][6]['vel']
                raw_speed, final_speed = math.hypot(*raw.values()), math.hypot(*final.values())
                relevant = handoff and handoff['t'] <= f['t'] < (contact['t'] if contact else math.inf)
                if relevant and raw_speed > 1 and final_speed < .6*raw_speed: slow_ticks.append(f['t'])
                timeline.append({'fixture': name, 'play': row['index'], 't': f['t'],
                    'raw_vx': raw['x'], 'raw_vy': raw['y'], 'final_vx': final['x'], 'final_vy': final['y'],
                    'entry_vx': before['vel']['x'], 'entry_vy': before['vel']['y'],
                    'achieved_vx': after['vel']['x'], 'achieved_vy': after['vel']['y'],
                    'rb_depth': after['pos']['x']-row['los'], 'rb_y': after['pos']['y'],
                    'raw_speed': raw_speed, 'final_speed': final_speed,
                    **{f'{slot}_depth': f['after'][i]['pos']['x']-row['los'] for i, slot in [(1,'LT'),(2,'RT'),(3,'C'),(4,'LG'),(5,'RG')]}})
            result['witnesses'].append({'fixture': name, 'play': row['index'], 'call': play['call'], 'concept': play['plan']['concept'],
                'formation': play['plan']['formation'], 'down': play['down'], 'distance': play['distance'], 'gain': play['yards'],
                'handoff': handoff, 'firstCarrierContact': contact, 'duration': play['duration'],
                'climbs': [e for e in play['events'] if e['type'] == 'block_climb'],
                'preContactSlowTicks': slow_ticks, 'actualHandLoadIntervals': {k: [min(v), max(v)] for k,v in loaded.items()},
                'rbTeammateImpacts': [c for c in row['physicalContacts'] if 6 in [c['i'],c['j']] and c['i'] < 11 and c['j'] < 11],
                'traceSha256': sha(trace_path), 'fullRecordedLogParity': True})
    exchange = read(args.traces/'zone-exchange-followup.json.gz')
    assert exchange['logSha256'] == exchange['referenceLogSha256'] and exchange['complete']
    result['exchangeWitnesses'], exchange_rows = [], []
    for row in exchange['rows']:
        if not row['selected']: continue
        qb, rb = [row['input']['agents'][i]['initialBehavior'] for i in [0,6]]
        reach = row['input']['agents'][0]['profile']['reach']+row['input']['agents'][6]['profile']['radius']
        gate = qb['meshTime']-.15
        frames = row['frames']; first_passed = next(f for f in frames if f['behavior'][6].get('passed'))
        early = [f for f in frames if f['t'] <= 1.5]
        cues = [c for c in row['cues'] if c['observer'] == 0 and c['target'] == 6 and c['kind'] == 'owned-teammate' and c['t'] >= qb['meshTime']-.3-1e-9]
        outcome = next(p for p in exchange['log'] if p['index'] == row['index'])
        result['exchangeWitnesses'].append({'play':row['index'],'call':outcome['call'],'gain':outcome['yards'],
            'outcome':outcome['outcome'],'duration':outcome['duration'],'qbMesh':qb['mesh'],'rbMesh':rb['mesh'],
            'meshTime':qb['meshTime'],'physicalGateOpens':gate,'handoffReach':reach,
            'firstPassed':first_passed['t'],
            'minimumActualSeparationAfterGate':min(dist(f['before'][0]['pos'],f['before'][6]['pos']) for f in frames if f['t'] >= gate-1e-9),
            'earlyQbRawRequestsAllZero':all(math.hypot(*f['raw'][0]['vel'].values()) == 0 for f in early),
            'earlyQbFinalRequestsAllZero':all(math.hypot(*f['final'][0]['vel'].values()) == 0 for f in early),
            'preWindowPhysicalContactsAtQBOrRB':[c for c in row['physicalContacts'] if c['t'] < gate and {c['i'],c['j']} & {0,6}],
            'firstRecoveryCue':next((c for c in cues if c['t'] >= qb['meshTime']-.3-1e-9),None),
            'fullRecordedLogParity':True,'traceSha256':sha(args.traces/'zone-exchange-followup.json.gz')})
        for f in frames:
            exchange_rows.append({'play':row['index'],'t':f['t'],'actualSeparation':dist(f['before'][0]['pos'],f['before'][6]['pos']),
                'handoffReach':reach,'physicalGate':gate,'passed':f['behavior'][6].get('passed',False),
                'qbRawSpeed':math.hypot(*f['raw'][0]['vel'].values()),'rbRawSpeed':math.hypot(*f['raw'][6]['vel'].values()),
                'qb_x':f['before'][0]['pos']['x'],'qb_y':f['before'][0]['pos']['y'],
                'rb_x':f['before'][6]['pos']['x'],'rb_y':f['before'][6]['pos']['y']})
    result['nativeReplayCostSeconds'] = sum(read(args.traces/(n+'.json.gz'))['elapsedSeconds'] for n in ['zone-reference','power-zone','zone-exchange-followup'])
    args.out.mkdir(parents=True, exist_ok=True)
    result['measurementSeconds'] = time.perf_counter()-started; result['newSimulationSteps'] = 0
    result['scriptSha256'] = sha(Path(__file__))
    (args.out/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
    (args.out/'nfl-matching-receipts.json.gz').write_bytes(gzip.compress(json.dumps(matching_receipts,separators=(',',':')).encode(),mtime=0))
    with (args.out/'timeline.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(timeline[0]), lineterminator='\n'); writer.writeheader(); writer.writerows(timeline)
    with (args.out/'exchange.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(exchange_rows[0]), lineterminator='\n'); writer.writeheader(); writer.writerows(exchange_rows)
    print(json.dumps({arm: {k: {'observed': v['observed'], 'nflExpected': v['nflExpected'], 'retained': v['retained'], 'backoffs': v['backoffCounts']} for k,v in result['arms'][arm]['standardized'].items()} for arm in result['arms']}))


if __name__ == '__main__': main()
