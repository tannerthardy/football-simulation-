"""Offline #69 information-repair receipt and saved-control comparison. No sims."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path('data/reviews/current/helper-collection-information')
old_path = Path('data/reviews/current/helper-collection/final-context.json.gz')
new_path = root/'law-controls.json.gz'
old, new = [json.loads(gzip.decompress(p.read_bytes())) for p in (old_path, new_path)]
digest = lambda b: hashlib.sha256(b).hexdigest()
git = lambda *args, **kwargs: subprocess.check_output(['git', *args], **kwargs)
physical = lambda s: (s['before']['bodies'], s['requested'], s['after']['bodies'], s['report'])
parity = []
for run in new['runs']:
    previous = next(r for r in old['runs'] if (r['mode'], r['scenario']) == (run['mode'], run['scenario']))
    assert len(previous['steps']) == len(run['steps'])
    assert all(physical(a) == physical(b) for a, b in zip(previous['steps'], run['steps']))
    assert previous['events'] == run['events']
    if 'fingerprint' in run:
        assert previous['fingerprint'] == run['fingerprint'] and run['observerNeutral']
    result = dict(mode=run['mode'], scenario=run['scenario'], identicalBodiesRequestsReportsEvents=True,
                  nativeFingerprintExact=run.get('fingerprint'), censor=run['final']['t'])
    if run['mode'] == 'patch' and run['scenario'].startswith('loss'):
        i, j = [run['initial']['slots'].index(s) for s in ('LG', 'C')]
        contacts = [c for s in run['steps'] for c in s['report']['contacts'] if {c['i'], c['j']} == {i, j}]
        assert not contacts
        loaded = next(s for s in run['steps'] if s['after']['helperEngagement'] and
                      abs(s['after']['state']['hands']['normal'])+abs(s['after']['state']['hands']['tangent']) > 1e-6)
        result.update(firstCompletedLoadedStep=loaded['before']['t']+.05, formerOwnerImpacts=0,
                      finalHands=run['final']['state']['hands'])
    parity.append(result)

base = '8c891f4cf887b54297efbbc4c7993ba5e2f318b5'
tested = 'cdd55b955421744ae6ba688de5f73ab87d13b8ab'
current = '8ca8deebe4afa91c3021bdd119bed8976cf00e47'
paths = ['src/sim/collection-approach.ts', 'src/sim/behaviors/blocking.ts',
         'test/collection-approach.test.ts', 'test/zone-helper-check.test.ts']
runtime_patch = git('diff', '--binary', base, tested, '--', *paths[:2])
complete_patch = git('diff', '--binary', base, tested, '--', *paths)
followup = git('diff', '--binary', 'a159f82d4821f03082e5a110c190a5ef1396df60', tested, '--', *paths)
(root/'runtime.patch').write_bytes(runtime_patch)
(root/'controller-and-tests.patch').write_bytes(complete_patch)
(root/'information-only-followup.patch').write_bytes(followup)
with tempfile.TemporaryDirectory() as temp:
    env = dict(os.environ, GIT_INDEX_FILE=temp+'/index')
    subprocess.run(['git', 'read-tree', current], env=env, check=True)
    subprocess.run(['git', 'apply', '--cached', '-'], input=complete_patch, env=env, check=True)
    tree = git('write-tree', env=env).decode().strip()
    changed = git('diff', '--name-only', current, tree).decode().splitlines()
    assert sorted(changed) == sorted(paths)
    current_block = git('show', f'{current}:src/sim/behaviors/blocking.ts').decode()
    merged_block = git('show', f'{tree}:src/sim/behaviors/blocking.ts').decode()
    pass_protector = lambda source: source.split('export class PassProtector')[1].split('function cutOffPoint')[0]
    assert pass_protector(current_block) == pass_protector(merged_block)
    assert git('show', f'{current}:src/sim/behaviors/carrier.ts') == git('show', f'{tree}:src/sim/behaviors/carrier.ts')
    source = hashlib.sha256()
    for name in sorted(git('ls-tree', '-r', '--name-only', tree, '--', 'src').decode().splitlines()):
        source.update(name.encode()+b'\0'+git('show', f'{tree}:{name}')+b'\0')
    compatibility = dict(acceptedDevelop=current, resultingTree=tree, resultingSourceSha256=source.hexdigest(),
                         patchApplies=True, onlyChangedFiles=changed, acceptedPassProtectorPreserved=True,
                         acceptedCarrierRiskPreserved=True, runtimeVerified=False,
                         qualification='Static application only; Integration owns exact combined verification.')

receipts = []
for name in ['red', 'focused', 'typecheck', 'law-controls']:
    r = json.loads((root/f'{name}.json').read_text())
    assert r['inputsUnchanged']
    assert r['exitCode'] == (1 if name == 'red' else 0)
    receipts.append(dict(name=name, commit=r['commit'], source=r['sourceSha256'], exitCode=r['exitCode'],
                         wallSeconds=sum(c['elapsedSeconds'] for c in r['commands'])))
summary = dict(schema='collection-information-review-v1', testedController=tested,
               controllerSource='cf8d726d81b1d562fd4c2a959f3bff3ed9c3b0f60fcf2587481386db9394e08a',
               lawHost='72cfe3d1f31159753e2b53286fc366a60bb17403', lawSource=new['source'],
               regression='Public RunBlocker.update exercises original attack hook; remote flag alone changed held brake into (6.987817,-2.997026)yd/s before fix.',
               correction='Remove only the remote-engagement route gate. Installation, acquired torso-loss/clearance, own contact and cadence remain; physical engagement eligibility unchanged.',
               productionHookChecks=['Original attack called, held choice retained across hidden flag change',
                                     'Fresh selection with nonempty hidden flag equals empty-flag request',
                                     'Same acquired pictures/body/RNG, no physical hands or climb',
                                     'Newly delivered facing cue changes next ordinary read'],
               focusedChecks=64, typecheck='pass', controlParity=parity,
               priorTraceSha256=digest(old_path.read_bytes()), currentTraceSha256=digest(new_path.read_bytes()),
               fixtureSha256=new['fixtureSha256'], collectorSha256=new['toolSha256'],
               productionTestSha256=digest(Path('test/collection-approach.test.ts').read_bytes()),
               compatibility=compatibility, receipts=receipts,
               newLauncherSeconds=sum(r['wallSeconds'] for r in receipts), fullGames=0,
               controlledLawSegments=6, nativeControlSegments=8,
               limits=['Controlled collection runner remains parked; no native runner-arrival or yardage claim.',
                       'The counterfactual uses a detached real rep as hidden-state poison; it is a no-step information test, not a claimed physical continuation.',
                       'Existing broader target-selection/join/release live-state contracts are not rewritten or certified by this narrow hook fix.',
                       'Physics, three adjudicated law-host failures, history and accuracy limits remain separate.'])
(root/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
(root/'artifacts.json').write_text(json.dumps({str(p.relative_to(root)): dict(bytes=p.stat().st_size, sha256=digest(p.read_bytes()))
    for p in sorted(root.rglob('*')) if p.is_file() and p.name != 'artifacts.json'}, indent=2)+'\n')
print(json.dumps(dict(controlRows=len(parity), exact=True, focused=64,
                     seconds=summary['newLauncherSeconds'], compatibility=compatibility), indent=2))
