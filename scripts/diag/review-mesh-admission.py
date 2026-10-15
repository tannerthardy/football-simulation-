#!/usr/bin/env python3
"""Independent #81 source/saved-tape review. No simulation or test execution."""
import gzip
import hashlib
import io
import json
import math
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import time

BASE = '7eb2554f5dbb497cff169f386704a5b0f4cf43fe'
CODE = 'f27456b5f4cd7e5d628417662a77e4ede5b85bfc'
HEAD = '6e19ad2d4aac73e71ae57c1893a9b389074eeaa5'
REFERENCE = 'bfb0d5ec4ca090b1bb8e38ac01116eb29954a8ce'
ROOT = 'data/reviews/current/mesh-motion-admission/'
FILES = ['src/sim/spacing.ts', 'test/fixtures/spacing-residual-motion.json.gz',
         'test/spacing-residual-motion.test.ts']
start = time.perf_counter()


def git(*args, env=None):
    return subprocess.check_output(['git', *args], env=env)


def blob(rev, path):
    return git('show', f'{rev}:{path}')


def read(path):
    data = blob(HEAD, ROOT + path)
    return json.loads(gzip.decompress(data) if path.endswith('.gz') else data)


def source_hash(rev):
    h = hashlib.sha256()
    with tarfile.open(fileobj=io.BytesIO(git('archive', rev, 'src'))) as archive:
        for member in sorted(archive.getmembers(), key=lambda m: m.name):
            if member.isfile():
                h.update(member.name.encode() + b'\0')
                h.update(archive.extractfile(member).read() + b'\0')
    return h.hexdigest()


def first_tick_difference(a, b):
    assert len(a) == len(b)
    for old, new in zip(a, b):
        assert old['t'] == new['t']
        if old != new:
            return {'t': old['t'], 'fields': [k for k in old if old[k] != new[k]]}
    return None


review = read('current-review.json')
hashes = {}
for path, expected in review['fileHashes'].items():
    actual = hashlib.sha256(blob(HEAD, ROOT + path)).hexdigest()
    assert actual == expected, path
    hashes[path] = actual

patch = blob(HEAD, ROOT + 'portable.patch')
assert patch == git('show', '--format=', '--binary', CODE)
with tempfile.TemporaryDirectory(prefix='run-pr81-review-') as tmp:
    index = str(Path(tmp) / 'index')
    patch_path = Path(tmp) / 'portable.patch'
    patch_path.write_bytes(patch)
    env = {**os.environ, 'GIT_INDEX_FILE': index}
    git('read-tree', BASE, env=env)
    git('apply', '--cached', '--check', str(patch_path), env=env)
    git('apply', '--cached', str(patch_path), env=env)
    tree = git('write-tree', env=env).decode().strip()
    changed = git('diff', '--name-only', BASE, tree).decode().splitlines()
    assert changed == FILES, changed
    for path in FILES:
        assert blob(tree, path) == blob(CODE, path) == blob(HEAD, path), path
    minimal_source = source_hash(tree)

assert git('diff', '--name-only', REFERENCE, HEAD, '--', 'src', 'test', 'config').decode().splitlines() == FILES
assert source_hash(REFERENCE) == review['referenceSource']
assert source_hash(HEAD) == review['candidateSource']
baseline = json.loads(blob(BASE, 'config/baseline.json'))
receipts = {}
for path in ['current-focused.json', 'current-typecheck.json',
             'current-reference-receipt.json', 'current-native-receipt.json']:
    receipt = read(path)
    assert receipt['exitCode'] == 0 and receipt['inputsUnchanged']
    assert not receipt['skippedCommands']
    assert receipt['flags'] == baseline['flags']
    assert receipt['worldDefaults'] == baseline['worldDefaults']
    assert receipt['node'] == 'v22.23.3'
    want = review['referenceSource'] if 'reference' in path else review['candidateSource']
    assert receipt['sourceSha256'] == want
    receipts[path] = {'source': want, 'seconds': sum(c['elapsedSeconds'] for c in receipt['commands']),
                      'commands': [c['command'] for c in receipt['commands']]}

cases = []
for case in ['A044', 'A008']:
    a, b = (read(f'{arm}/{case}.json.gz') for arm in ['current-reference', 'current-candidate'])
    assert a['setupSha256'] == b['setupSha256']
    assert a['provenance']['flags'] == b['provenance']['flags'] == baseline['flags']
    assert a['provenance']['worldDefaults'] == b['provenance']['worldDefaults'] == baseline['worldDefaults']
    assert a['events'] == b['events'] and a['rng'] == b['rng']
    assert a['stoppedAt'] == b['stoppedAt']
    diff = first_tick_difference(a['ticks'], b['ticks'])
    stage_diff = next(({'t': x['t'], 'actor': x['actor'], 'stage': x['stage'],
                       'old': x.get('command'), 'new': y.get('command')}
                      for x, y in zip(a['stages'], b['stages']) if x != y), None)
    assert len(a['stages']) == len(b['stages'])
    impact = lambda d: [{'t': t['t'], **c} for t in d['ticks'] for c in t['contacts']
                       if {c['i'], c['j']} == {15, 21}]
    assert impact(a) == impact(b)
    if case == 'A008':
        assert diff is None and stage_diff is None
        assert any(e['type'] == 'tackle_wrap' and e['a'] == 19 and e['t'] == 2.5 for e in b['events'])
    else:
        assert diff == {'t': 3.25, 'fields': ['agents', 'commands']}
        assert stage_diff['t'] == 3.25 and stage_diff['actor'] == 21 and stage_diff['stage'] == 'spacing'
        assert impact(b)[0]['t'] == 2.75
        assert any(e['type'] == 'drop' and e['t'] == 2.9 for e in b['events'])
    cases.append({'case': case, 'setupSha256': a['setupSha256'], 'ticks': len(a['ticks']),
                  'firstTickDifference': diff, 'firstStageDifference': stage_diff,
                  'eventsAndFinalMainRngExact': True, 'ssRobberImpactExact': impact(b),
                  'stoppedAt': b['stoppedAt']})

historical = []
windows_path = 'data/reviews/current/mesh-command-attribution/flex-windows.json.gz'
windows_bytes = blob(HEAD, windows_path)
windows = json.loads(gzip.decompress(windows_bytes))
for case in ['A044', 'A008']:
    original_path = f'data/reviews/current/mesh-command-attribution/bend-v1/{case}-accepted.json.gz'
    a = json.loads(gzip.decompress(blob(HEAD, original_path)))
    b = read(f'native-v2/{case}.json.gz')
    old_ticks = {t['t']: t for t in a['ticks']}
    paired = [(old_ticks[t['t']], t) for t in b['ticks'] if t['t'] in old_ticks]
    assert len(paired) == len(a['ticks'])
    first = next(({'t': x['t'], 'actors': [i for i in range(22)
                       if x['agents'][i] != y['agents'][i] or x['commands'][i] != y['commands'][i]]}
                  for x, y in paired if x['agents'] != y['agents'] or x['commands'] != y['commands']), None)
    if case == 'A008':
        assert first is None and a['events'] == b['events'] and a['rng'] == b['rng']
    else:
        assert first == {'t': 3.6, 'actors': [0]}
    loads = []
    measured = next(c for c in windows['cases'] if c['caseId'] == case)
    candidate_ticks = {t['t']: t for t in b['ticks']}
    for row in measured['rows']:
        for old in row['blocks']:
            if old['a'] != 9 or old['b'] != 17:
                continue
            new = next(v for v in candidate_ticks[row['t']]['zCornerBlock']
                       if v['a'] == old['a'] and v['b'] == old['b'])
            assert old['hands']['normalForce'] == new['normalForce']
            assert old['hands']['tangentForce'] == new['tangentForce']
            loads.append({'t': row['t'], 'normal': new['normalForce'], 'lateral': new['tangentForce']})
    if case == 'A044':
        assert len(loads) == 8
    historical.append({'case': case, 'originalRawSha256': hashlib.sha256(blob(HEAD, original_path)).hexdigest(),
                       'comparedFrames': len(paired), 'firstDifference': first, 'exactZCornerLoads': loads})

fixture = json.loads(gzip.decompress(blob(HEAD, FILES[1])))
v, u = fixture['body']['vel'], fixture['command']['vel']
turn = abs(u['x'] * v['y'] - u['y'] * v['x']) / math.hypot(v['x'], v['y'])
assert abs(turn - .8749657976039807) < 1e-12
assert 'not accepted live trajectory' in fixture['source']

out = {'decision': 'ACCEPT narrow admission extraction only', 'base': BASE, 'portableCode': CODE,
       'reviewedHead': HEAD, 'referenceHost': REFERENCE, 'minimalExtractionTree': tree,
       'minimalExtractionSourceSha256': minimal_source, 'portableFiles': FILES,
       'portablePatchSha256': hashlib.sha256(patch).hexdigest(),
       'verifiedManifestEntries': len(hashes), 'fileHashes': hashes,
       'referenceSourceSha256': review['referenceSource'], 'candidateSourceSha256': review['candidateSource'],
       'flags': baseline['flags'], 'worldDefaults': baseline['worldDefaults'], 'node': 'v22.23.3',
       'fixture': {'source': fixture['source'], 't': fixture['t'], 'requestedTurn': turn,
                   'peerCount': len(fixture['peers'])},
       'reusedReceipts': receipts, 'currentCases': cases, 'historicalCases': historical,
       'historicalLoadMeasurementSha256': hashlib.sha256(windows_bytes).hexdigest(),
       'auditConstructionNote': 'Initial offline audit incorrectly looked for original hand loads in command-only ticks; corrected to the separately pinned Measurement rows. No simulation or product change.',
       'newNativeExecutions': 0, 'newTestExecutions': 0, 'newGames': 0,
       'offlineAuditSeconds': time.perf_counter() - start}
target = Path('data/reviews/current/pr81-run-independent-review/receipt.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps({k: out[k] for k in ['decision', 'verifiedManifestEntries',
    'minimalExtractionSourceSha256', 'newNativeExecutions', 'newTestExecutions', 'offlineAuditSeconds']}))
