"""Read saved evidence only. No World, RNG, controller, game or network calls."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import time
from datetime import datetime

start = time.perf_counter()
root = Path('out/spread-air-lanes')
out = Path('docs/reviews/spread-air-lanes')
out.mkdir(parents=True, exist_ok=True)
def read(p):
    p = Path(p)
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix == '.gz' else p.read_bytes())
def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()
native = read(root / 'evidence/notes/data/reviews/current/experimental-game-checkpoint/experimental/spread-air/game.json.gz')
old = read(root / 'p033-prefix.json.gz')
new = read(root / 'p033-paired-candidate.json.gz')
assert old['nativeMatches'] and new['earlierPrefixMatches']
assert old['selected']['input'] == new['selected']['input']
for f, g in zip(old['selected']['frames'], new['selected']['frames']):
    if f['raw'] != g['raw'] or f['final'] != g['final']:
        first = {'t': f['t'], 'sameBodiesBefore': f['before'] == g['before'],
                 'sameJointsBefore': f['joints'] == g['joints'],
                 'actors': [i for i in range(22) if f['raw'][i] != g['raw'][i] or f['final'][i] != g['final'][i]],
                 'rawBefore': f['raw'][6], 'rawAfter': g['raw'][6],
                 'finalBefore': f['final'][6], 'finalAfter': g['final'][6]}
        break
assert first['t'] == 2.2 and first['sameBodiesBefore'] and first['actors'] == [6]
spec = importlib.util.spec_from_file_location('tempo', 'scripts/diag/run-tempo-report.py')
tempo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tempo)
before = read('out/run-lanes/scoped-interior.json.gz')
after = read(root / 'gap-coupled.json.gz')
controls = []
for c in after['panel']:
    b = next(x for x in before['panel'] if x['input']['id'] == c['input']['id'])
    assert b['hashes'] == c['hashes'] and b['informationHashes'] == c['informationHashes']
    bm, cm = tempo.summarize(b), tempo.summarize(c)
    assert bm == cm
    controls.append({'input': c['input'], 'fullStateAndInformationHashesIdentical': True,
                     'nativeSteps': len(c['frames']), 'beforeAndAfter': cm})
history = []
for t in [1.8, 2., 2.2]:
    cues = old['selected']['cues']
    history.append({'t': t, 'pictures': [c for c in cues if c['observer'] == 6 and c['t'] == t and
                                        c['target'] in [3, 4, 5, 14] and c['kind'] in ['see', 'owned']]})
cases = []
for n in [9, 11, 33, 37, 39]:
    e = native['log'][n-1]
    cases.append({'play': n, 'nativeIndex': e['index'], 'call': e['call'], 'yards': e['yards'],
                  'stats': e['stats'], 'plan': e['plan'], 'initialJobs': e['replay']['telemetry']['frames'][0],
                  'events': e['replay']['events']})
receipts = []
for p in sorted(root.glob('*-launcher.json')):
    d = read(p)
    seconds = (datetime.fromisoformat(d['finishedAt'].replace('Z', '+00:00')) -
               datetime.fromisoformat(d['startedAt'].replace('Z', '+00:00'))).total_seconds()
    assert d['inputsUnchanged']
    receipts.append({'path': str(p), 'sha256': sha(p), 'source': d['sourceSha256'], 'commit': d['commit'],
                     'exitCode': d['exitCode'], 'inputsUnchanged': True, 'wrapperSeconds': seconds})
def gitbytes(pin, p):
    return subprocess.check_output(['git', 'show', pin + ':' + p])
parent = '6122fb03c7104c0f9d762591d737cf2cf6a49067'
recorded = 'f62511a513f2187884d74ae3b94435835e43309c'
comparison = {'linePictureFileIdenticalBeforeCorrection': gitbytes(parent, 'src/sim/live-gaps.ts') == gitbytes(recorded, 'src/sim/live-gaps.ts')}
fn = lambda s: s.split(b'export function runReadAim', 1)[1].split(b'const SAMPLES', 1)[0]
comparison['entryFunctionIdenticalBeforeCorrection'] = fn(gitbytes(parent, 'src/sim/behaviors/carrier.ts')) == fn(gitbytes(recorded, 'src/sim/behaviors/carrier.ts'))
comparison['currentRuntimeDeltaFromParent'] = subprocess.check_output(['git', 'diff', parent, '--stat', '--', 'src'], text=True).strip()
result = {'schema': 'spread-air-lanes-review-v1', 'recommendation': 'Adopt only the departed-center bookkeeping correction; broader lane/spacing information and pull/collection remain unresolved.',
          'evidenceHead': '4ae667e29b3ce085f43c5cb911b294349cda2b8f', 'pr57Head': 'e8a76a7f7cdc19dece85288f93a8d1e1273be0db',
          'recordedCommit': recorded, 'recordedSource': old['sourceSha256'], 'parentCommit': parent,
          'candidateCodeCommit': '73b94412d1bb9cf6b0e4beb6e59c7aec466e5eee', 'candidateSource': after['sourceSha256'],
          'isolatedAlwaysOnSource': read(root/'isolated-source.json')['sourceSha256'], 'pairedInterventionSource': new['sourceSha256'],
          'nativeGameSha256': old['nativeGameSha256'], 'inputSha256': old['inputSha256'], 'flags': old['flags'], 'worldDefaults': old['worldDefaults'],
          'node': old['node'], 'sourceComparison': comparison, 'cases': cases, 'informationHistory': history,
          'firstPairedDivergence': first, 'sameCue': read(root/'gap-decision.json'), 'coupledControls': controls,
          'pairedP033': {'previous32EntriesExactlyMatch': True, 'initialStateExactlyMatches': True,
                          'beforeYards': native['log'][32]['yards'], 'afterYards': new['selectedResult']['yards'],
                          'firstContactBefore': next(e['t'] for e in old['selected']['replay']['events'] if e['type'] == 'carrier_contact'),
                          'firstContactAfter': next(e['t'] for e in new['selected']['replay']['events'] if e['type'] == 'carrier_contact'),
                          'outcomeBefore': native['log'][32]['outcome'], 'outcomeAfter': new['selectedResult']['outcome'],
                          'adjudication': 'Correct gap identity and no spurious reversal; same legitimate DT win. Tiny yardage difference is not the improvement measure.'},
          'receipts': receipts,
          'runtime': {'nativePrefixSeconds': sum(read(root/p)['elapsedSeconds'] for p in ['p033-prefix.json.gz', 'p033-isolated-candidate.json.gz', 'p033-paired-candidate.json.gz']),
                      'twoShortControlsSeconds': after['elapsedSeconds'], 'physicalScrimmageExecutions': 77, 'completedGames': 0,
                      'explanation': 'Three prefixes of 25 repeated physical scrimmages, including one rejected unpaired arm; two short controls. No independent roster/game campaign.',
                      'sameCueScratchWorldSteps': read(root/'gap-decision.json')['scratchOwnBodyWorldSteps'], 'sameCueSeconds': read(root/'gap-decision.json')['elapsedSeconds'],
                      'setupFailures': 'Standalone reconstruction rejected at initialization and one expected-source hash error; both zero World steps.'},
          'measurementSha256': sha(__file__), 'newSimulationInThisReducer': 0}
result['runtime']['nativeCollectorSeconds'] = result['runtime']['nativePrefixSeconds'] + result['runtime']['twoShortControlsSeconds']
result['pairedP033']['teammateImpacts'] = {}
for label, packet in [('before', old), ('after', new)]:
    contacts = [dict(t=f['t']+.05, **c) for f in packet['selected']['frames'] for c in f['report']['contacts']
                if c['i'] < 11 and c['j'] < 11 and c.get('impulse', 0) > 1e-8]
    result['pairedP033']['teammateImpacts'][label] = {'count': len(contacts), 'impulseKgYdPerS': sum(c['impulse'] for c in contacts), 'contacts': contacts}
result['runtime']['offlineReducerSeconds'] = time.perf_counter() - start
(out/'summary.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'summary': str(out/'summary.json'), 'firstDivergence': first['t'], 'nativeCollectorSeconds': result['runtime']['nativeCollectorSeconds'], 'controlsExactlyUnchanged': len(controls), 'newWorldSteps': 0}))
