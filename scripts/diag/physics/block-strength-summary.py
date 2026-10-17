"""Summarize saved force/protection evidence; executes no simulation."""
import gzip
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path('out/block-strength')
RAW = ROOT / 'protection.json.gz'
data = json.loads(gzip.decompress(RAW.read_bytes()))


def sha(content):
    return hashlib.sha256(content).hexdigest()


def pinned_file(revision, path):
    return subprocess.check_output(['git', 'show', f'{revision}:{path}'])


revision = data['testedRevision']
# Validate the actual tested tool/input, not a later report-only revision.
assert sha(pinned_file(revision, data['tool'])) == data['toolSha256']
assert sha(pinned_file(revision, data['input'])) == data['inputSha256']
receipts = {name: json.loads((ROOT / f'{name}.receipt.json').read_text())
            for name in ['force-checks', 'force-checks-final', 'typecheck', 'protection']}
assert receipts['protection']['sourceSha256'] == data['source']
assert receipts['protection']['commit'] == revision
for name in ['force-checks-final', 'typecheck', 'protection']:
    assert receipts[name]['sourceSha256'] == data['source']
    assert all(c['exitCode'] == 0 for c in receipts[name]['commands'])
assert receipts['force-checks']['commands'][0]['exitCode'] == 1


def arrival(a, initial):
    o = a['observation']
    b, d = initial[o['blocker']], initial[o['defender']]
    return dict(bracket=a['bracket'], blocker=b['slot'], defender=d['slot'],
                blockerLb=b['profile']['massKg'] / .45359237,
                defenderLb=d['profile']['massKg'] / .45359237,
                engagementPresent=o['engagementPresent'], helper=o['helper'],
                geometry=o['geometry'], handLoads=o['precedingIntervalHandLoads'],
                torsoImpulses=o['precedingIntervalTorsoImpulses'])


rows = []
for row in data['rows']:
    assert not row['error']
    initial = {a['idx']: a for a in row['initial']}
    # No current or diagnostic force mapping is silently installed in football.
    assert all('loadedDriveForce' not in a['profile'] and 'armForce' not in a['profile']
               for a in row['initial'])
    assert all(f['t'] <= row['finalTime'] for f in row['frames'])
    rows.append(dict(id=row['id'], input=row['input'], setupHash=row['setupHash'],
                     initialProfilesAndBodiesSha256=row['initialProfilesAndBodiesSha256'],
                     terminal=row['terminal'], censor=row['censor'], finalTime=row['finalTime'],
                     ending=row['ending'], gain=row['gain'], firstContact=row['firstContact'],
                     firstNonzeroRunnerTorso=row['firstNonzeroRunnerTorso'],
                     firstLoadedRunnerGrasp=row['firstLoadedRunnerGrasp'],
                     lineArrival=row['lineArrival'],
                     arrivals=[arrival(a, initial) for a in row['pairArrivals']],
                     unobservedPairArrivals=[p for p in row['pairRegistry'] if not p['localArrivalObserved']],
                     maxPlanarWorkResidual=max(abs(s['workResidual']) for s in row['physicalIntervals']),
                     elapsedSeconds=row['elapsedSeconds']))

result = dict(protocol='block-strength-evidence-v1', testedRevision=revision,
              sourceSha256=data['source'], node=data['node'],
              acceptedBase='d682b1f474cb6ba260a7b8b1119a62919c5a2159',
              collector=dict(path=data['tool'], sha256=data['toolSha256']),
              input=dict(path=data['input'], sha256=data['inputSha256']),
              raw=dict(path=str(RAW), sha256=sha(RAW.read_bytes()),
                       note='Ignored trace; reproducible using the pinned collector/input.'),
              definitions=data['definitions'], receipts=receipts,
              checks=dict(unique=34, executed=42, initiallyFailed=1, finalForceChecks=8,
                          compatibleExistingActuation=9, compatibleExistingHeldRecovery=17,
                          note='Initial new multi-arm fixture had no compression and thus no applied force; corrected it to exercise load. The numerical rejection guard was strengthened; unchanged omitted-input controls are reused.'),
              cost=dict(newNativeExecutions=3, focusedTestExecutions=42,
                        commandSeconds=sum(c['elapsedSeconds'] for r in receipts.values() for c in r['commands']),
                        note='Focused checks/typecheck/three native controls only; not a runtime comparison, no suite or game campaign.'),
              rows=rows)
target = Path('data/reviews/current/block-strength-calibration.json')
target.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(output=str(target), testedRevision=revision, source=data['source'],
                     commandSeconds=result['cost']['commandSeconds'],
                     rows=[{k: r[k] for k in ['id', 'ending', 'gain', 'censor', 'maxPlanarWorkResidual']} for r in rows]), indent=2))
