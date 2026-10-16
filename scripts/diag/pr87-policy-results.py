"""Saved-only attribution of the bounded accepted-#89 interaction pair."""
import gzip
import hashlib
import json
import math
import shutil
import subprocess
from pathlib import Path

ROOT = Path('out/pr87-policy-review')
DEST = Path('data/reviews/current/pr87-run-policy-review')
DEST.mkdir(parents=True, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda name: json.loads(gzip.decompress((ROOT / name).read_bytes()))
old, new = read('reference-A042.json.gz'), read('candidate-A042.json.gz')
assert old['initial'] == new['initial']
assert old['inputSha256'] == new['inputSha256'] == '419d117ffe8299f781f3e1d194e9504538475e364cf6543049c857025c1797be'
assert len(old['ticks']) == len(new['ticks'])
primary = {}
for i in [6, 20, 21]:
    primary[str(i)] = all(a['before'][i] == b['before'][i] and a['after'][i] == b['after'][i]
                         and a['commands'][i] == b['commands'][i] for a, b in zip(old['ticks'], new['ticks']))
assert all(primary.values())
rng_exact = all(a['rngBefore'] == b['rngBefore'] and a['rngAfter'] == b['rngAfter'] for a, b in zip(old['ticks'], new['ticks']))
assert rng_exact
first = next(({'t': a['t'], 'actors': [i for i in range(22) if a['commands'][i] != b['commands'][i] or a['after'][i] != b['after'][i]],
               'enteringBodiesExact': a['before'] == b['before']}
              for a, b in zip(old['ticks'], new['ticks']) if a['commands'] != b['commands'] or a['after'] != b['after']), None)
def teammates(arm):
    return [{'t': t['t'], **c} for t in arm['ticks'] for c in t['contacts']
            if c['i'] < 11 and c['j'] < 11 or c['i'] >= 11 and c['j'] >= 11]
assert teammates(old) == teammates(new) == []
def block_times(arm):
    return [(e['t'], e['a'], e['b']) for e in arm['events'] if e['type'] == 'block_contact']
assert block_times(old) == block_times(new)
def carrier_events(arm):
    return [e for e in arm['events'] if e['type'] in ['carrier_contact', 'tackle_wrap', 'broken_tackle', 'tackle']]
assert carrier_events(old) == carrier_events(new)
shifts = {str(i): max(math.dist(tuple(a['after'][i]['pos'].values()), tuple(b['after'][i]['pos'].values()))
                      for a, b in zip(old['ticks'], new['ticks'])) for i in range(22)}
alley_goals = [{'t': t['t'], **r['goal']} for t in new['ticks'] for i, r in t['raw']
               if i == 21 and r.get('goal') and r['runFit']['kind'] == 'alley' and r['goal']['point']['x'] == 42.8]
assert any(g['velocity']['y'] != 0 for g in alley_goals)
assert all(g['velocity']['x'] == 0 for g in alley_goals)
native = {'case': 'A042', 'firstPhysicalRequestDifference': first, 'primaryFullBodiesCommandsExact': primary,
          'rootRngExactEveryTick': rng_exact, 'noTeammateContactsBothArms': True,
          'blockContactTimesExact': block_times(new), 'carrierEventsExact': carrier_events(new),
          'maxPositionShiftsByActor': shifts, 'actualMovingAlleyGoals': alley_goals,
          'censor': {'reference': old['censored'], 'candidate': new['censored'], 'at': 3.8},
          'maxWorkResidual': max(abs(t['work']['residual']) for arm in [old, new] for t in arm['ticks']),
          'rawSha256': {name: sha((ROOT / name).read_bytes()) for name in ['reference-A042.json.gz', 'candidate-A042.json.gz']}}
static = json.loads((ROOT / 'static.json').read_bytes())
receipts = [json.loads((ROOT / n).read_bytes()) for n in ['unit-launcher.json', 'reference-launcher.json', 'candidate-launcher.json']]
for r in receipts:
    assert r['exitCode'] == 0 and r['inputsUnchanged']
    assert r['sourceSha256'] == static['sources']['base']
result = {'schema': 'pr87-run-policy-decision-v1', 'decision': 'ACCEPT exact seven-file post-dependency policy on accepted9adb7b3; Integration owns final combined verification.',
          'reviewedHead': static['reviewedHead'], 'acceptedBase': static['base'], 'composedTree': static['composedTree'],
          'sourceSha256': static['sources']['composed'], 'sourceOnlyArchiveQualification': 'Review launcher source is accepted host; exact source archives are imported and statically hashed. No candidate branch edit.',
          'protectedFiles': {p: sha(subprocess.check_output(['git', 'show', static['composedTree'] + ':' + p])) for p in static['changedFiles']},
          'nativeInteraction': native, 'newNativeExecutions': 2, 'newLauncherSeconds': sum(c['elapsedSeconds'] for r in receipts for c in r['commands']),
          'newNativeLauncherSeconds': sum(c['elapsedSeconds'] for r in receipts[1:] for c in r['commands']),
          'newNativeCollectorSeconds': old['elapsedSeconds'] + new['elapsedSeconds'], 'reuse': '39 focused/typecheck receipts and A044/A008 saved native evidence; no replay of that panel or shared suite.',
          'limits': ['A042 new pair is explicitly live/censored3.80, no finish/gain claim.',
            'Synthetic alley encounter remains obstructed; selected relief is not a certified clear route.',
            'Off-ball positions/forces change; primary identity is not all22 identity.',
            'Original A044 drop/catch changes through root draw scheduling, not a higher receiver probability.',
            'Original A008 evidence stops3.40; preserved wrap does not claim a new terminal tackle.',
            'No whole-engine runtime, global coverage, universal avoidance, physical-law or YAC certification.']}
(DEST / 'receipt.json').write_text(json.dumps(result, indent=2)+'\n')
for name in ['static.json', 'unit.json', 'A042-setup.json', 'unit-launcher.json', 'reference-launcher.json', 'candidate-launcher.json', 'traffic-controller.patch']:
    shutil.copyfile(ROOT / name, DEST / name)
(DEST / 'A042-paired.json.gz').write_bytes(gzip.compress(json.dumps({'reference': old, 'candidate': new}, separators=(',', ':')).encode(), mtime=0))
manifest = {p.name: {'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in sorted(DEST.iterdir()) if p.name != 'artifacts.json'}
(DEST / 'artifacts.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'decision': result['decision'], 'native': native['firstPhysicalRequestDifference'], 'newLauncherSeconds': result['newLauncherSeconds'],
                  'nativeLauncherSeconds': result['newNativeLauncherSeconds'], 'packetBytes': sum(p['bytes'] for p in manifest.values())}, indent=2))
