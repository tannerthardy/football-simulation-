"""Verify saved measurements and assets; --engine also reconstructs source pins."""
import gzip
import hashlib
import json
import math
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def finite(value):
    if isinstance(value, float):
        assert math.isfinite(value)
    elif isinstance(value, dict):
        for child in value.values():
            finite(child)
    elif isinstance(value, list):
        for child in value:
            finite(child)


def load(path):
    raw = path.read_bytes()
    value = json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)
    finite(value)
    return value


def football(context):
    return {k: v for k, v in context.items() if k != 'perception'}


manifest = load(HERE / 'verification-manifest.json')
for name, digest in manifest['files'].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
comparison = load(HERE / 'comparison.json')
panels = []
for phase in ('before', 'pose-only', 'primary-stem'):
    path = HERE / f'panel-{phase}.json.gz'
    panel = load(path)
    comparison_phase = {'pose-only': 'poseOnly', 'primary-stem': 'primaryStem'}.get(phase, phase)
    pin = comparison['phases'][comparison_phase]
    assert panel['sourceSha256'] == pin['sourceSha256']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == pin['rawSha256']
    assert panel['toolSha256'] == pin['toolSha256']
    assert len(panel['rows']) == len(panel['observerNeutrality']) == 24
    assert sum(row['recording'] is not None for row in panel['rows']) == 4
    assert all(control['initial'] and control['final']
               and control['observedInitialSignature'] == control['plainInitialSignature']
               and control['observedSignature'] == control['plainSignature']
               for control in panel['observerNeutrality'])
    panels.append(panel)
for before, pose_only, final in zip(*(p['rows'] for p in panels)):
    assert before['id'] == pose_only['id'] == final['id']
    assert before['input'] == pose_only['input'] == final['input']
    assert before['players'] == pose_only['players'] == final['players']
    assert football(before['initialContext']) == football(pose_only['initialContext']) == football(final['initialContext'])
    assert football(before['endpointContext']) == football(pose_only['endpointContext'])
changed = sum(football(b['endpointContext']) != football(a['endpointContext'])
              for b, a in zip(panels[0]['rows'], panels[2]['rows']))
assert changed == comparison['primaryStemEndpointChangedCases'] == 4
assert len(comparison['pairs']) == 24
assert comparison['witness']['before']['chosen']['r']['slot'] == 'H'
assert comparison['witness']['primaryStem']['chosen']['r']['slot'] == 'Z'
oracle = load(HERE / 'grasp-oracle.json.gz')
assert oracle['summary'] == dict(trials=48, newtonianPositionPassed=24,
                               activePositionFailures=24, passivePositionFailures=0)
assert all(row['checks']['oracleDomainAndForceWorkPassed'] for row in oracle['rows'])
assert oracle['sourceBefore'] == oracle['sourceAfter'] == panels[2]['sourceSha256']
assert oracle['worldSha256'] == manifest['unchangedWorldSha256']
transfer = load(HERE / 'transfer-validation.json')
assert transfer['runs']['matchedInitialInputsProfilesToolAndSeeds']
assert transfer['runs']['physicalPayloadIdenticalCount'] == len(transfer['runs']['pairs']) == 144
assert transfer['tackles']['matchedInitialInputsProfilesToolAndSeeds']
assert transfer['tackles']['physicalRecordIdenticalCount'] == len(transfer['tackles']['pairs']) == 64
assert transfer['tackles']['nonPoseDiagnosticIdenticalCount'] == 64
assert transfer['tackles']['poseObservationDifferenceCount'] == 9088
assert transfer['games']['matchedInitialRosterAndSeedsOnly']
assert len(transfer['games']['after']) == 2
assert transfer['games']['afterPhysics']['maxMotorWorkExcessKgYd2S2'] == 0
assert transfer['games']['afterPhysics']['lowerHoldReleases'] == 0
integrity = load(HERE / 'film-integrity.json')
assert integrity['zipHtmlByteExact'] and integrity['exactFullTelemetry']
assert integrity['exactRawEventsActorsNotesTimes'] and integrity['all24ObserverControlsPerPhaseNeutral']
browser = load(HERE / 'browser-check.json')
assert browser['pageErrors'] == [] and len(browser['clips']) == 8
with zipfile.ZipFile(ROOT / 'viewer/visible-help.zip') as archive:
    assert archive.testzip() is None and archive.namelist() == ['visible-help.html']
    assert archive.read('visible-help.html') == (ROOT / 'viewer/visible-help.html').read_bytes()
assert '648 passed (648)' in (HERE / 'tests.log').read_text()
assert 'Ran 22 tests' in (HERE / 'python.log').read_text()
assert manifest['checks']['typecheckExitCode'] == manifest['checks']['buildExitCode'] == 0

if '--engine' in sys.argv:
    for name, digest in manifest['currentCodeFiles'].items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name
    changed_files = manifest['changedEngineFiles']
    with tempfile.TemporaryDirectory(prefix='visible-help-source-', dir='/tmp') as directory:
        scratch = Path(directory)
        for name in changed_files:
            destination = scratch / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes((ROOT / name).read_bytes())
        subprocess.run(['git', 'apply', '--reverse', str(HERE / 'engine.patch')], cwd=scratch, check=True)
        hashes = {phase: hashlib.sha256() for phase in ('before', 'poseOnly', 'primaryStem')}
        for path in sorted((p for p in (ROOT / 'src').rglob('*') if p.is_file()),
                           key=lambda p: p.relative_to(ROOT).as_posix()):
            name = path.relative_to(ROOT).as_posix()
            current = path.read_bytes()
            originals = {'before': (scratch / name).read_bytes() if name in changed_files else current,
                         'poseOnly': (HERE / 'pose-only-judgment.ts').read_bytes()
                         if name == 'src/sim/coverage/judgment.ts' else current,
                         'primaryStem': current}
            for phase, raw in originals.items():
                hashes[phase].update(name.encode() + b'\0' + raw + b'\0')
        for phase, digest in hashes.items():
            assert digest.hexdigest() == comparison['phases'][phase]['sourceSha256'], phase
    assert hashlib.sha256((ROOT / 'src/physics/world.ts').read_bytes()).hexdigest() == manifest['unchangedWorldSha256']
print(json.dumps({'passed': True, 'panelInputs': 24, 'phases': 3, 'filmClips': 8,
                  'knownActivePositionFailuresRetained': 24, 'assetHashes': len(manifest['files']),
                  'engineChecked': '--engine' in sys.argv}))
