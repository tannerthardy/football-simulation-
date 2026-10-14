"""Static current-source pressure/release report; no simulations or new cues.

python3 scripts/diag/pass-rush-report.py COMPATIBLE_ROUTE_CACHE_ROOT
"""
import collections
import gzip
import hashlib
import json
import math
import pathlib
import statistics
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = pathlib.Path(sys.argv[1]).resolve()
sys.path.insert(0, str(ROOT / 'scripts/mechanics'))
import metrics

START = time.perf_counter()
RUNTIME = '8433e88d7deb31e5c1c031e2f0cb83d1cf0e805609820c0559f6b8f25747340c'


def read(path):
    return json.loads(pathlib.Path(path).read_text())


def sha(path):
    return hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()


def describe(xs):
    xs = sorted(x for x in xs if x is not None and math.isfinite(x))
    return {} if not xs else dict(metrics.describe(xs), median=statistics.median(xs), maximum=max(xs))


def summarize(rs):
    throws = [r for r in rs if r['measurement']['release'] is not None]
    pressure = [r for r in rs if r['measurement']['first2Strict']]
    return {'dropbacks': len(rs), 'ending': dict(collections.Counter(r['measurement']['kind'] for r in rs)),
            'release': describe([r['measurement']['release'] for r in throws]),
            'firstTwoYardsStrict': {'n': len(pressure), 'rate': len(pressure) / len(rs),
                                   'time': describe([r['measurement']['first2Strict']['t'] for r in pressure])},
            'nativeFlag': {'n': sum(r['measurement']['nativePressure'] for r in rs),
                           'rate': sum(r['measurement']['nativePressure'] for r in rs) / len(rs)},
            'pressureFirstDuringWindup': sum(r['measurement']['first2Strict']['qbPhase'] == 'windup' for r in pressure),
            'firstInitialRusher': sum(r['measurement']['first2Strict']['i'] in r['measurement']['initialRushers'] for r in pressure),
            'firstActiveEngagement': sum(bool(r['measurement']['first2Strict']['engagement']) for r in pressure),
            'sackTime': describe([r['measurement']['pocketEnd'] for r in rs if r['measurement']['kind'] == 'sack']),
            'longReleases37': [r['id'] for r in throws if r['measurement']['release'] >= 3.7],
            'timeouts': sum(r['result']['outcome'] == 'timeout' for r in rs)}


profile = read(ROOT / 'config/baseline.json')
source_digest = hashlib.sha256()
for source_path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()), key=lambda p: p.relative_to(ROOT).as_posix()):
    source_digest.update(str(source_path.relative_to(ROOT)).encode() + b'\0' + source_path.read_bytes() + b'\0')
assert source_digest.hexdigest() == RUNTIME
packets = [read(ROOT / f'out/pass-rush-timing/native{c}/summary.json') for c in (3101, 4202)]
for p in packets:
    assert p['provenance']['sourceSha256'] == RUNTIME
    assert p['provenance']['flags'] == profile['flags']
    assert p['savedEvidence']['exactPopulation'] and p['savedEvidence']['fullSignaturesMatched'] == 16
rows = [r for p in packets for r in p['rows']]
byid = {r['id']: r for r in rows}
clean = [r for r in rows if not r['result'].get('penalty') and not r['gameDisposition']['nullified']]
assert len(rows) == 181 and len(clean) == 165
replay = read(ROOT / 'out/pass-rush-timing/replay/summary.json')
assert len(replay['rows']) == 4
assert all(r['observerNeutral'] and r['restorationExact'] for r in replay['rows'])
forecast = read(ROOT / 'out/pass-rush-timing/forecast.json')
assert forecast['sourceSha256'] == RUNTIME

common = {}
common_first = {}
for name in ('legacy', 'release-normalized'):
    with gzip.open(ROOT / f'out/pass-rush-timing/common/{name}.jsonl.gz', 'rt') as f:
        plays = [json.loads(line) for line in f]
    groups = {}
    for label, ps in [('non-nullified', plays), ('clean', [p for p in plays if not byid[p['id']]['result'].get('penalty')])]:
        values = collections.defaultdict(list)
        for raw in ps:
            p = metrics.Play(raw)
            metrics.pass_metrics(p, values)
            if name == 'release-normalized' and label == 'clean':
                end = p.events.get('pass_forward', min(p.end, 4))
                qb = p.who('O', 'QB')[0]
                first = next((k * p.dt for k in range(p.k(.5), p.k(end) + 1)
                              if min(p.dist(d, qb, k) for d in p.who('D')) <= 2), None)
                common_first[raw['id']] = first
        groups[label] = {'n': len(ps), 'metrics': {k: describe(v) for k, v in values.items() if k in (
            'pass.time_to_throw', 'pass.time_to_pressure', 'pass.pressure_2yd_before_throw',
            'pass.qb_depth_at_throw', 'pass.nearest_defender_to_qb_at_throw')}}
    common[name] = groups

new_common = []
for r in clean:
    first = common_first[r['id']]
    if first is not None and not r['measurement']['first2Strict']:
        new_common.append({'id': r['id'], 'firstShared': first, 'pocketEnd': r['measurement']['pocketEnd'],
                           'kind': r['measurement']['kind'], 'atOrBeyondPocketEnd': first + 1e-9 >= r['measurement']['pocketEnd']})

lab = []
lab_sources = []
for name in ('panel', 'custom'):
    path = CACHE / f'out/catch-pursuit/{name}.json'
    p = read(path)
    assert p['provenance']['sourceSha256'] == RUNTIME and p['provenance']['flags'] == profile['flags']
    lab += p['clips']
    lab_sources.append({'path': str(path), 'sha256': sha(path), 'provenance': p['provenance']})
assert len(lab) == 288
lab_release = describe([c['result']['stats'].get('timeToThrow') for c in lab if c['result']['stats']['attempted']])

nf_path = ROOT / 'data/reviews/mechanics/nfl-bdb2022.json'
nfl = read(nf_path)
label_path = ROOT / 'data/bdb2025-summary.json'
labels = read(label_path)
nf_metrics = {k: v for k, v in nfl['metrics'].items() if k in (
    'pass.time_to_throw', 'pass.time_to_pressure', 'pass.pressure_2yd_before_throw',
    'pass.qb_depth_at_throw', 'pass.nearest_defender_to_qb_at_throw')}

pressure = [r for r in clean if r['measurement']['first2Strict']]
prior_contact = []
for r in pressure:
    p = r['measurement']['first2Strict']
    prior = [e for e in r['result']['events'] if e['type'] == 'block_contact' and e.get('b') == p['i'] and e['t'] <= p['t']]
    prior_contact.append({'id': r['id'], 'i': p['i'], 'active': bool(p['engagement']), 'priorContact': bool(prior)})

witnesses = []
for ref in replay['rows']:
    r = byid[ref['id']]
    with gzip.open(ROOT / r['film']['path'], 'rt') as f:
        film = json.load(f)
    contacts = [e for e in r['result']['events'] if e['type'] == 'carrier_contact' and e.get('a') == 0]
    witnesses.append({'id': r['id'], 'selection': ref['selection'], 'players': film['players'],
                      'measurement': r['measurement'], 'result': r['result'], 'film': r['film'],
                      'firstQbContact': contacts[0] if contacts else None, 'signature': ref['signature'],
                      'minimumConsumedForecast': min((p['time'] for s in film['steps'] for p in s['pressure'] if p['time'] is not None), default=None)})

receipt_paths = sorted((ROOT / 'out/pass-rush-timing').glob('*receipt.json'))
receipts = [{'path': str(p.relative_to(ROOT)), 'sha256': sha(p), 'receipt': read(p)} for p in receipt_paths]
cost = sum(c['elapsedSeconds'] for p in receipts for c in p['receipt']['commands'])
survivors = []
for t in (1.5, 2, 2.5, 3, 3.5, 4):
    rs = [r for r in clean if r['measurement']['pocketEnd'] > t]
    survivors.append({'t': t, 'nStillInPocket': len(rs), 'caution': 'Survivors select slower throws/sacks; not independent rush attempts or pressure incidence.'})

result = {'schema': 'current-pass-rush-timing-audit-v1',
          'analysis': {'collector': 'scripts/diag/pass-rush-report.py', 'collectorSha256': sha(__file__),
                       'commonAdapterReceipt': read(ROOT / 'out/pass-rush-timing/common/receipt.json')},
          'question': 'Does excessive QB time or slow pass rush explain the current pass-game/YAC problems?',
          'baseline': {'commit': '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1', 'runtimeSha256': RUNTIME,
                       'flags': profile['flags'], 'worldDefaults': profile['worldDefaults'], 'runtimeChanged': False},
          'operators': {'native': 'Actual decision-boundary bodies at 50 ms, all defenders <=2 yd from .5 s strictly before first throw/throwaway/sack/scramble/fumble. Geometric presence, not measured pressure causation.',
                        'shared': 'Existing unchanged sim-export commonPlay and metrics.pass_metrics: quantized .1-yd post-World frames at 10 Hz with engine tick labels, inclusive rounded release frame; nonthrows scanned to min(end,4), including after scramble. Retain legacy throwaway omission and label-normalized comparison separately.',
                        'median': 'Native median averages central two values. Existing shared describe nearest-ranked p50 also retained.',
                        'events': 'Contact label t is the decision tick; its completed World boundary is t+.05. Source is adaptive12-16, no resolution override.'},
          'nativeCohorts': [{'cohort': p['cohort'], 'seed': p['seed'], 'provenance': p['provenance'],
                            'savedEvidence': p['savedEvidence'], 'gameLogPlays': p['gameLogPlays'],
                            'all': summarize(p['rows']), 'clean': summarize([r for r in p['rows'] if not r['result'].get('penalty') and not r['gameDisposition']['nullified']])} for p in packets],
          'nativeAll': summarize(rows), 'nativeClean': summarize(clean), 'cleanIds': [r['id'] for r in clean],
          'byFamilyClean': {key: summarize([r for r in clean if r['family'] == key]) for key in sorted({r['family'] for r in clean})},
          'byQbClean': {key: summarize([r for r in clean if r['setup']['offense']['QB']['id'] == key]) for key in sorted({r['setup']['offense']['QB']['id'] for r in clean})},
          'byInitialRushCountClean': {str(key): summarize([r for r in clean if len(r['measurement']['initialRushers']) == key]) for key in (4, 5, 6)},
          'survivors': survivors, 'common': common, 'additionalSharedCases': new_common,
          'firstPressureContactHistory': prior_contact,
          'reusedLab': {'n': len(lab), 'release': lab_release, 'sources': lab_sources, 'note': 'Controlled concept/coverage cells, not adaptive game distribution or full pressure measurement.'},
          'nfl': {'geometry': {'path': str(nf_path.relative_to(ROOT)), 'sha256': sha(nf_path), 'source': nfl['source'],
                               'provenance': nfl['provenance'], 'metrics': nf_metrics},
                  'labels': {'path': str(label_path.relative_to(ROOT)), 'sha256': sha(label_path), 'source': labels['source'],
                             'passing': labels['labels']['passing'], 'passRush': labels['labels']['passRush'],
                             'note': 'Charted pressure definition differs from shared geometry and native sim flag. Do not compare these rates as one operator.'}},
          'nativeRows': [{k: r[k] for k in ('id', 'effectiveConcept', 'effectiveCoverage', 'effectiveDrop', 'family', 'pressureCall', 'measurement', 'gameDisposition', 'signature', 'film')} for r in rows],
          'controlWitnesses': witnesses, 'samePictureDiagnostic': forecast,
          'checks': {'nativePopulationLabelsExact': 181, 'retainedFullSignaturesExact': 32,
                     'observedPlainFullPairsExact': 4, 'replayProvenance': replay['provenance'],
                     'sameNativeInputsRestoreExactly': True, 'sourceFixed': True, 'engineTestsNotRerun': True,
                     'staticSourceHashGuardRepair': read(ROOT / 'out/pass-rush-timing/static-analysis-failed.json')
                     if (ROOT / 'out/pass-rush-timing/static-analysis-failed.json').exists() else None,
                     'adapterFailureRetained': 'First static adapter lacked the required snap ball-y; it failed before comparison, then was fixed with known snap y and unknown x/z. No simulation rerun.'},
          'counting': {'newNativeReconstructionGames': 2, 'nativeGameLogRows': sum(p['gameLogPlays'] for p in packets),
                       'newMeasuredNativeDropbacks': 181, 'newFrozenStandaloneFullPlays': 8,
                       'newRosterGameContexts': 0, 'reusedCompletedLabInputs': 288,
                       'newFullSuites': 0, 'measuredDropbackTimeouts': 0, 'newCensoredExperiments': 0,
                       'staticForecastEncounters': len(forecast['rows'])},
          'launcherReceipts': receipts, 'cost': {'recordedLauncherCommandSeconds': cost,
                                               'nativeGameBudgetSecondsEach': 60, 'nativeRecordedWallMs': [p['wallMs'] for p in packets]},
          'recommendation': 'Do not globally accelerate rushers or weaken protection. Next controller experiment: consistent attainable-contact danger from consumed motion, preserving held protection and legitimate windup throws. Keep physical contact/strength changes and shared protection information migration separate.',
          'limitations': ['Two previously inspected roster pairs/four QBs, not an independent league sample.',
                          'Reference NFL tracking aggregates were previously examined; no reserved 2026 data read.',
                          'No context-matched NFL raw risk sets available here; conditional pressure medians and early releases censor later rush.',
                          'Same-picture radius is a diagnostic geometric envelope, not a candidate, guaranteed tackle or changed capability.',
                          'Current QB pressure uses live engagement/base/blind-side data; pass protection uses live rusher/QB bodies and behavior roles. Those information contracts remain unresolved.',
                          'Neither YAC nor coverage candidate integrated; all new timings describe unchanged integration runtime.']}
result['analysisWallSeconds'] = time.perf_counter() - START
destination = ROOT / 'data/reviews/current/pass-rush-timing.json'
destination.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps({'output': str(destination.relative_to(ROOT)), 'cleanDropbacks': len(clean),
                  'releaseMedian': result['nativeClean']['release']['median'],
                  'commonPressureRate': result['common']['release-normalized']['clean']['metrics']['pass.pressure_2yd_before_throw']['mean'],
                  'additionalSharedPressureCases': len(new_common), 'commandSeconds': cost,
                  'analysisWallSeconds': result['analysisWallSeconds']}))
