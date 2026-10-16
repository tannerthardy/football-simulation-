"""Reduce existing release/delivery tapes; never instantiate or run the engine.

Run from repo root: python scripts/diag/release-delivery-review.py OUTPUT.json
Missing tapes fail. The collector and exact reproduction pins are in the report.
"""
import gzip
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path('.')


def read(folder, case):
    path = ROOT / 'out' / folder / (case + '.json.gz')
    raw = path.read_bytes()
    packet = json.loads(gzip.decompress(raw))
    packet['_trace'] = {'path': str(path), 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
    return packet


def row(packet, t):
    hit = next((r for r in packet['rows'] if abs(r['t'] - t) < 1e-6), None)
    assert hit is not None, (packet['summary']['fixture']['id'], t)
    return hit


def moment(packet, t, defender=19):
    r = row(packet, t)
    q = r['requests'][defender] if len(r['requests']) > defender else None
    catcher = packet['summary']['actualCatcher']
    return {'t': t, 'defender': defender, 'request': q,
            'achieved': r['bodies'][defender],
            'catcher': None if catcher is None else r['bodies'][catcher],
            'consumed': [c for c in r['cues'] if c['observer'] == defender and c['phase'] == 'controller'],
            'applied': r['applied'][defender], 'grasps': r['grasps']}


def receipt(packet):
    return {**{k: packet[k] for k in ['sourceSha256', 'checkout', 'node', 'platform', 'arch',
            'operatorSha256', 'lockSha256', 'flags', 'worldDefaults', 'fixturesSha256']},
            'trace': packet['_trace'], 'summary': packet['summary'],
            'actors': [{k: a[k] for k in ['idx', 'slot', 'id']} for a in packet['initial']]}


main = sorted(p.stem.split('.')[0] for p in (ROOT / 'out/release-delivery-combined-main').glob('*.json.gz'))
assert len(main) == 16
pairs = {}
for case in main + ['F4', 'T1', 'T2', 'T3', 'T4']:
    old_folder = ('release-delivery-transfer-baseline' if case.startswith('T') else
                  'pass-panel-fresh-baseline' if case == 'F4' else 'pass-defense-panel-baseline')
    new_folder = ('release-delivery-combined-transfer' if case.startswith('T') else
                  'release-delivery-f4-complete' if case == 'F4' else 'release-delivery-combined-main')
    old, new = read(old_folder, case), read(new_folder, case)
    for key in ['inputSha256', 'initialSha256']:
        assert old['summary'][key] == new['summary'][key], (case, key)
    for key in ['node', 'platform', 'arch', 'lockSha256', 'flags', 'worldDefaults']:
        assert old[key] == new[key], (case, key)
    assert old['sourceSha256'] == '668acb1784799c93d4704aaaa41233a11627ee0a862b41dc279cd11a0a22eeac'
    assert new['sourceSha256'] == 'cb16a2fe23816fe4b0bf4650f4f32871aae6e6f2f0fbaae39c527c9d2973694a'
    pairs[case] = {'baseline': receipt(old), 'candidate': receipt(new),
                   'endpointEqual': old['summary']['endpointSha256'] == new['summary']['endpointSha256']}
    if case in ['R1-C02', 'R2-C02', 'T1', 'T2', 'T3', 'T4']:
        pairs[case]['early'] = {arm: moment(p, 1) for arm, p in [('baseline', old), ('candidate', new)]}
    if case in ['R1-C02', 'R2-C02']:
        for previous, current in zip(old['rows'], new['rows']):
            if len(previous['requests']) <= 19 or len(current['requests']) <= 19:
                continue
            oq, nq = previous['requests'][19], current['requests'][19]
            if not oq or not nq or oq['raw'] == nq['raw']:
                continue
            for key in ['pos', 'vel', 'facing']:
                assert oq['before'][key] == nq['before'][key], (case, 'first changed request', key)
            cue = lambda r: [c['cue'] for c in r['cues'] if c['observer'] == 19 and c['target'] == 10
                             and c['phase'] == 'controller' and c['scale'] == 1]
            assert cue(previous) == cue(current)
            pairs[case]['firstDecision'] = {'baseline': moment(old, previous['t']),
                                           'candidate': moment(new, current['t'])}
            break
        assert 'firstDecision' in pairs[case]
        pairs[case]['approach'] = {}
        for arm, p in [('baseline', old), ('candidate', new)]:
            s = p['summary']
            moments = [1.4, 2.6, s['catchAt']]
            wrap = s.get('firstWrap')
            if wrap:
                moments += [wrap['t'], round(wrap['t'] + .05, 2)]
            pairs[case]['approach'][arm] = [moment(p, t, wrap['a'] if wrap and t >= wrap['t'] else 19) for t in moments]

stages = {}
for stage, folder, cases in [
    ('readRestart', 'release-cushion-first-native', ['R1-C02', 'R2-C02', 'R2-C06']),
    ('continuousRead', 'release-cushion-continuity-native', ['R1-C02', 'R2-C02']),
    ('deliveryAlone', 'seam-delivery-alone-native', ['R1-C02', 'R2-C02', 'R2-C06']),
    ('pr97Interaction', 'release-delivery-pr97-native', ['R1-C01', 'R2-C03', 'R2-C06'])]:
    stages[stage] = {}
    for case in cases:
        p = read(folder, case)
        stages[stage][case] = receipt(p)
        if case in ['R1-C02', 'R2-C02']:
            stages[stage][case]['boundary'] = [moment(p, t) for t in [1, 1.4, 2.5, 2.6]]

names = [
    'release-cushion-first-check', 'release-cushion-first-native',
    'release-cushion-contracts-agent', 'release-cushion-continuity-native',
    'release-cushion-support-checks', 'release-cushion-typecheck',
    'release-cushion-final-contracts', 'release-cushion-typecheck-final',
    'seam-delivery-alone-native', 'seam-delivery-contracts-agent',
    'release-delivery-transfer-baseline', 'release-delivery-combined-main',
    'release-delivery-f4-diagnostic', 'release-delivery-f4-complete',
    'release-delivery-combined-transfer', 'release-delivery-combined-contracts',
    'release-delivery-typecheck', 'release-delivery-pr97-checks', 'release-delivery-pr97-native']
receipts = [json.loads((ROOT / 'out' / (name + '.json')).read_text()) for name in names]
elapsed = sum(c['elapsedSeconds'] for r in receipts for c in r['commands'])
neutral = json.loads((ROOT / 'out/release-delivery-f4-complete/summary.json').read_text())['neutral']
assert neutral['endpointEqual']

result = {'schema': 'release-delivery-review-v1',
          'accepted': 'bb6d4c73948d53ba841dd9338dd240146c739f8c',
          'candidateRuntimeCommit': '19d520f00dd3b521078d6f24be9d645e90a78ebc',
          'reducerSha256': hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
          'pairs': pairs, 'stages': stages, 'receipts': receipts, 'observerNeutrality': neutral,
          'cost': {'launcherSeconds': elapsed, 'nativeExecutions': 40,
                   'newBaselineExecutions': 4, 'reusedBaselineCases': 17,
                   'notes': 'Includes two F4 serialization failures, two plain observer controls, staged arms and three separate PR97 interactions. All 21 retained pairs finish. First failed F4 detailed tape/summary unavailable; never scored as a separate paired outcome.'},
          'compatibility': 'Old numeric/end-event measurement is reused unchanged. Operator additions append four T fixtures, copy existing helper queries, preserve a summary on serialization failure and normalize non-string off-ball job labels. Selected input/body hashes/settings match; new F4 observed/plain endpoints and query counts are exact. No added sightings or draws.',
          'limitations': [
              'Selected stress calls, not league mean/p90 or NFL calibration.',
              'Catch identity and selection change; conditional YAC averages are not a treatment effect.',
              'Geometric cap estimate is uncertain help, not assignment acknowledgment.',
              'Existing on-demand teammate picture availability remains; this is not a global awareness repair.',
              'Same RNG seed does not guarantee matched post-divergence execution.',
              'Before/request and post-step body timestamps retain the collector convention.',
              'No shared movement, grip, capacity, braking or physics change.']}
out = pathlib.Path(sys.argv[1])
assert not out.exists(), 'Choose a fresh result path'
out.write_text(json.dumps(result, separators=(',', ':')) + '\n')
print(json.dumps({'pairs': len(pairs), 'launcherSeconds': elapsed, 'bytes': out.stat().st_size}))
