"""Offline adjudication of the one existing ordinary pass fixture. Zero sims."""
import gzip
import hashlib
import json
import math
import subprocess
from pathlib import Path

ROOT = Path('data/reviews/current/pass-ordinary-contact')


def load(name):
    return json.loads(gzip.decompress((ROOT / name).read_bytes()))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def phi(b, d, q):
    ax, ay = q['x']-d['x'], q['y']-d['y']
    bx, by = b['x']-d['x'], b['y']-d['y']
    return math.atan2(-(by*ax-bx*ay), bx*ax+by*ay)/(math.pi/2)


def first_decision(row):
    calls = row['rngCalls']
    j = next(i for i, c in enumerate(calls) if c['kind'] == 'weighted'
             and any('chooseMove' in s for s in c['site']))
    choice, execution, interval = calls[j:j+3]
    assert [c['kind'] for c in [choice, execution, interval]] == ['weighted', 'chance', 'range']
    assert choice['reps'][0]['b'] == 1 and choice['reps'][0]['d'] == 11
    return dict(t=choice['t'], move=choice['result'], moveWeights=choice['args'],
                successProbability=execution['args'][0], landed=execution['result'],
                intervalVariateResult=interval['result'])


def metrics(row):
    start = next(e for e in row['engagementStarts'] if e['b'] == 1 and e['d'] == 11)
    load = next(f for f in row['frames'] if any(
        e['b'] == 1 and abs(e['hands'].get('normalForce') or 0)
        + abs(e['hands'].get('tangentForce') or 0) > 1e-8 for e in f['repsAfter']))
    e = next(e for e in load['repsAfter'] if e['b'] == 1)
    b, d, q = [load['after'][i] for i in [1, 11, 0]]
    end = row['frames'][-1]
    end_rep = next((e for e in end['repsAfter'] if e['b'] == 1), None)
    return dict(arm=row['arm'], comparison=row.get('comparison', 'native'),
                engagementAcquisition=start['t'], firstLoadedTime=round(load['t']+.05, 8),
                acquisitionPhi=start['initial']['phi'], firstLoadAchievedPhi=phi(b['pos'], d['pos'], q['pos']),
                acquisitionBVelocity=start['bBody']['vel'], acquisitionDVelocity=start['dBody']['vel'],
                firstLoadBPosition=b['pos'], firstLoadDPosition=d['pos'],
                firstLoadBVelocity=b['vel'], firstLoadDVelocity=d['vel'],
                firstNormalForce=e['hands'].get('normalForce'), firstLateralForce=e['hands'].get('tangentForce'),
                initialControl=start['initial']['control'], firstDecision=first_decision(row),
                ltShed=next((e['t'] for e in row['events'] if e['type'] == 'shed' and e.get('b') == 1), None),
                leftPressure=next((e['t'] for e in row['events'] if e['type'] == 'pressure' and e.get('a') == 11), None),
                endTime=row['endTime'], phase=row['phase'],
                endDEWToQB=math.dist(list(end['after'][11]['pos'].values()), list(end['after'][0]['pos'].values())),
                ltEngagedAtCensor=end_rep is not None, endLTPhi=end_rep['phi'] if end_rep else None,
                endLTNormalForce=end_rep['hands'].get('normalForce') if end_rep else None,
                endLTLateralForce=end_rep['hands'].get('tangentForce') if end_rep else None,
                ltTeammateImpacts=[dict(t=round(f['t']+.05, 8), **c) for f in row['frames']
                                  for c in f['report']['contacts'] if c['impulse'] > 1e-8
                                  and (c['i'] == 1 and c['j'] < 11 or c['j'] == 1 and c['i'] < 11)],
                retained=row['retained'])


native, matched = load('native.json.gz'), load('matched.json.gz')
accepted, candidate = native['rows']
assert accepted['initial'] == candidate['initial']
assert accepted['initialRng'] == candidate['initialRng']
initial_calls, initial_drifts = [], []
for row in native['rows']:
    e = next(e for e in row['engagementStarts'] if e['b'] == 1)
    initial_calls.append([(c['kind'], c['args'], c['result']) for c in row['rngCalls'][e['rngStart']:e['rngEnd']]])
    initial_drifts.append([c['result'] for c in row['rngCalls'] if c['kind'] == 'normal'
                           and c['args'] == [0, .25] and c['site'][0].startswith('at stepPassRep')][:4])
assert initial_calls[0] == initial_calls[1]
assert initial_drifts[0] == initial_drifts[1]
assert first_decision(accepted)['moveWeights'] == first_decision(candidate)['moveWeights']

historical = json.loads(subprocess.check_output(['git', 'show',
    '48bbfe77df0b64798ff0dde1e6d1ea69f1d9a752:data/reviews/current/pass-cutoff-integration/telemetry-contract.json']))
for row in native['rows']:
    old = next(r for r in historical['rows'] if r['arm'] == row['arm'])
    assert [e for e in old['events'] if e['t'] < 2.25] == [e for e in row['events'] if e['t'] < 2.25]
for packet in [native, matched]:
    assert packet['receipt']['sourceSha256'] == '1822455c3fdf15aecfd362fd01d54c80a2e1f7e12c97b0a2d9b611141adba4a7'
    assert packet['receipt']['fixtureSha256'] == '7014f96fd349dc292e5d5c5c00bb69b42e0cd2ee4dc74727132e15627fae0602'
    assert packet['receipt']['flags'] == native['receipt']['flags']
    assert packet['receipt']['worldDefaults'] == native['receipt']['worldDefaults']
    assert all(r['phase'] == 'live' and r['endTime'] == 2.25 for r in packet['rows'])
    assert all(not metrics(r)['ltTeammateImpacts'] for r in packet['rows'])

rows = [metrics(r) for packet in [native, matched] for r in packet['rows']]
assert [r['ltShed'] for r in rows] == [None, 1.2, 1.3, None]
assert [r['leftPressure'] for r in rows] == [None, 2.15, 2.2, None]
for row in matched['rows']:
    assert len(row['retained']) == 3
    assert [c['kind'] for c in row['retained']] == ['weighted', 'chance', 'range']

first = next((f, g) for f, g in zip(accepted['frames'], candidate['frames']) if f['final'] != g['final'])
f, g = first
assert f['before'] == g['before']
changed = [i for i, (a, b) in enumerate(zip(f['raw'], g['raw'])) if a != b]
assert changed == [1, 2]
launchers = ['native-launcher.json', 'matched-harness-failure.json',
             'matched-metadata-failure.json', 'matched-launcher.json']
cost = [dict(file=name, commit=(v := json.loads((ROOT/name).read_text()))['commit'],
             exitCode=v['exitCode'], seconds=sum(c['elapsedSeconds'] for c in v['commands'])) for name in launchers]
result = dict(schema='ordinary-pass-contact-adjudication-v1',
              recommendation='Support bounded #67 adoption after Integration installs reviewed kind-specific test repair and verifies exact final candidate; no controller edit justified by this fixture.',
              runtimeSourceSha256=native['receipt']['sourceSha256'],
              comparisonBaseline='8c891f4cf887b54297efbbc4c7993ba5e2f318b5',
              currentAcceptedDocsOnly='7d1451b2c31786e075550183a6a93bbda23da29b',
              historicalBaseline='4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
              firstRequestDifference=dict(t=f['t'], actors=changed, sameIncomingBodies=True,
                                          acceptedLT=f['raw'][1], candidateLT=g['raw'][1]),
              initialPunchDrawsIdentical=True, initialFourDriftDrawsIdentical=True,
              initialPunchDraws=initial_calls[0], initialDriftDraws=initial_drifts[0],
              integrationNativeEventParityBefore225=True, rows=rows, costs=cost,
              totalCommandSeconds=sum(c['seconds'] for c in cost), successfulNativeSegments=4,
              discardedHarnessSegments=3, uniqueExistingFixtures=1, fullGames=0,
              limits=['Only three first-response variates exchanged. Later shared randomness remains coupled.',
                      'Earlier geometry/contact age still differ. Success probabilities and weights are evaluated normally, never forced.',
                      'All arms live at 2.25; no ending or later mutated-QB tick is interpreted.',
                      'Current center-hand law limitations and forecast optimism remain. No new physical-law certificate.'])
(ROOT/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
manifest = {str(p.relative_to(ROOT)): dict(bytes=p.stat().st_size, sha256=digest(p.read_bytes()))
            for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name != 'artifacts.json'}
(ROOT/'artifacts.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(dict(rows=[{k:r[k] for k in ['arm','comparison','ltShed','leftPressure','endDEWToQB']} for r in rows],
                      totalCommandSeconds=result['totalCommandSeconds'], offlineAssertions='pass'), indent=2))
