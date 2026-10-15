#!/usr/bin/env python3
"""Summarize the fixed native trial and its one passive execution audit.

Reads saved JSON only. Does not import the engine, run a play or query NFL data.
Usage: python scripts/diag/p045-assigned-man-report.py OUT_DIRECTORY OUTPUT.json.gz
"""
import gzip
import hashlib
import json
import math
from pathlib import Path
import sys


def read(path):
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def geometry(row, defender, receiver):
    d, r = (row['world']['before'][i] for i in (defender, receiver))
    dx, dy = (r['pos'][k] - d['pos'][k] for k in ('x', 'y'))
    gap = math.hypot(dx, dy)
    hd, hr = (math.atan2(a['vel']['y'], a['vel']['x']) for a in (d, r))
    return {'t': row['t'], 'gapYd': gap, 'speedYdS': math.hypot(*d['vel'].values()),
            'closingYdS': sum((d['vel'][k] - r['vel'][k]) * v for k, v in zip(('x', 'y'), (dx, dy))) / max(1e-12, gap),
            'headingErrorDeg': abs(math.atan2(math.sin(hd - hr), math.cos(hd - hr))) * 180 / math.pi,
            'defenderBody': d, 'runnerBody': r}


def summary(clip, fixed_defender=None):
    players = {a['idx']: a for a in clip['players']}
    ids = {a['id']: a['idx'] for a in clip['players']}
    result = clip['result']
    catch = next((e for e in result['events'] if e['type'] == 'catch'), None)
    receiver = catch['a'] if catch else None
    contacts = [e for e in result['events'] if e['type'] == 'carrier_contact' and e['a'] == receiver] if catch else []
    tackler = contacts[0]['b'] if contacts else None
    defender = fixed_defender if fixed_defender is not None else tackler
    if defender is None and result['stats'].get('tacklers'):
        defender = ids[result['stats']['tacklers'][0]]
    approach, holds = [], []
    for row in clip.get('rows', []):
        if receiver is None:
            continue
        if defender is not None:
            value = geometry(row, defender, receiver)
            raw = next((q for q in row['raw'] if q['actor'] == defender), None)
            value['request'] = raw['request'] if raw else None
            value['consumed'] = row['cues'][raw['cueStart']:raw['cueEnd']] if raw else []
            value['applied'] = row['world']['applied'][defender]
            approach.append(value)
        grasp = [j for j in row['world']['grasps'] if receiver in (j['a'], j['b'])]
        if grasp:
            holds.append({'t': row['t'], 'grasps': grasp,
                          'runnerBefore': row['world']['before'][receiver],
                          'runnerAfter': row['world']['after'][receiver]})
    loaded = [h for h in holds if any(j.get('force', 0) > 0 and not j.get('broken', False) for j in h['grasps'])]
    return {'signature': clip['signature'], 'observerNeutral': clip['observerNeutral'],
            'targetId': result['stats'].get('target'), 'catcher': players.get(receiver),
            'measuredDefender': players.get(defender), 'firstContactDefender': players.get(tackler),
            'outcome': result['outcome'], 'completedCatch': bool(catch),
            'yacYd': result['stats'].get('yac'), 'result': result,
            'catchAt': catch['t'] if catch else None,
            'catchGeometry': next((a for a in approach if a['t'] == catch['t']), None) if catch else None,
            'receiverContactEvents': contacts, 'approach': approach, 'graspTimeline': holds,
            'firstSavedLoadedStep': loaded[0]['t'] if loaded else None,
            'lastSavedGraspStep': holds[-1]['t'] if holds else None,
            'graspPresentAtFinalWorldStep': bool(holds and holds[-1]['t'] == clip['rows'][-1]['t']),
            'noReceiverContact': not contacts}


def main():
    directory, output = map(Path, sys.argv[1:])
    assert not output.exists(), 'Preserve evidence'
    files = {name: directory / (name + '.json.gz') for name in (
        'accepted-native', 'candidate-native', 'fresh-accepted-native', 'fresh-candidate-native',
        'fresh-accepted-grip-audit', 'fresh-candidate-grip-audit')}
    data = {name: read(path) for name, path in files.items()}
    cases = []
    for label, left, right in [('selected', 'accepted-native', 'candidate-native'),
                               ('fresh', 'fresh-accepted-native', 'fresh-candidate-native')]:
        for a, b in zip(data[left]['clips'], data[right]['clips']):
            assert a['id'] == b['id'] and a['observerNeutral'] and b['observerNeutral']
            defender = 18 if a['id'] == 'spread-air/P45' else None
            first = next(((r, s) for r, s in zip(a['rows'], b['rows'])
                          if r['world']['applied'] != s['world']['applied']), None)
            cases.append({'id': a['id'], 'group': label, 'exactSignaturePreserved': a['signature'] == b['signature'],
                          'firstChangedApplied': None if not first else {
                              't': first[0]['t'], 'actors': [a['players'][i] for i, (x, y) in enumerate(zip(first[0]['world']['applied'], first[1]['world']['applied'])) if x != y]},
                          'baseline': summary(a, defender), 'candidate': summary(b, defender)})
    p45 = cases[2]
    assert p45['id'] == 'spread-air/P45'
    assert cases[0]['exactSignaturePreserved'] and cases[1]['exactSignaturePreserved']
    a, b = (data[name]['clips'][2] for name in ('accepted-native', 'candidate-native'))
    at = lambda c, t: next(r for r in c['rows'] if r['t'] == t)
    corner_entry = {'t': 2.65, 'ownBodyExact': at(a, 2.65)['world']['before'][18] == at(b, 2.65)['world']['before'][18],
                    'receiverPathThroughCatchExact': all(r['world']['before'][8] == s['world']['before'][8]
                                                        for r, s in zip(a['rows'], b['rows']) if r['t'] <= 3.75)}
    assert corner_entry['ownBodyExact'] and corner_entry['receiverPathThroughCatchExact']
    fresh_a, fresh_b = (data[name]['clips'][0] for name in ('fresh-accepted-native', 'fresh-candidate-native'))
    grip_a, grip_b = (data[name]['clips'][0] for name in ('fresh-accepted-grip-audit', 'fresh-candidate-grip-audit'))
    assert fresh_a['signature'] == grip_a['signature'] and fresh_b['signature'] == grip_b['signature']
    execution = {'case': fresh_a['id'], 'loadedStep': 5.6,
                 'bodiesBeforeFirstSavedLoadedStepExact': all(at(fresh_a, 5.6)['world']['before'][i] == at(fresh_b, 5.6)['world']['before'][i] for i in (8, 20)),
                 'baseline': {k: [x for x in grip_a['catchAudit'][k] if x['t'] == 5.55] for k in ('tackleNormals', 'chances')},
                 'candidate': {k: [x for x in grip_b['catchAudit'][k] if x['t'] == 5.55] for k in ('tackleNormals', 'chances')},
                 'limitation': 'Passive audit retains each actual draw, not a paired-draw intervention. Different execution/depth at identical entry disqualifies this ending as evidence of better approach. Legacy audit model header contains the selected clip ID; runtime model was null, as recorded by the command and source.'}
    assert execution['bodiesBeforeFirstSavedLoadedStepExact']
    receipts = []
    for f in Path('out/baseline').glob('run-*.json'):
        record = read(f)
        if record.get('branch') == 'codex/yac-assigned-man-native':
            receipts.append({'path': str(f), 'sha256': sha(f), **record})
    assert len(receipts) == 8, 'Unexpected batch; preserve intended cost accounting'
    packet = {'schema': 'p045-assigned-man-native-trial-v1',
              'decision': 'Park; no integration candidate. Plain acquired-man tracking retains momentum but worsens the P045 catch approach. The only fresh ending gain has identical actual tackler entry and different stochastic grasp execution, so is not credited to approach.',
              'acceptedDevelop': '8c891f4cf887b54297efbbc4c7993ba5e2f318b5',
              'acceptedSourceSha256': data['accepted-native']['provenance']['sourceSha256'],
              'candidateSourceSha256': data['candidate-native']['provenance']['sourceSha256'],
              'arms': {k: {'provenance': v['provenance'], 'artifactSha256': sha(files[k]), 'inputSha256': v['inputSha256']}
                       for k, v in data.items()},
              'cornerEntry': corner_entry, 'cases': cases, 'freshExecutionAudit': execution,
              'freshInput': {'path': 'data/reviews/current/p045-assigned-man-fresh-inputs.json', 'sha256': sha(Path('data/reviews/current/p045-assigned-man-fresh-inputs.json'))},
              'archivedPrototype': {str(p): sha(p) for p in map(Path, ('docs/archive/research/catch-contact/p045-assigned-man.patch',
                                                                    'docs/archive/research/catch-contact/p045-assigned-man-tests.patch'))},
              'receipts': receipts, 'cost': {'newNativePlayExecutions': 32, 'newPrefixes': 0, 'newFullGames': 0,
                                           'fullSuiteRuns': 0, 'focusedCandidateChecksPassed': 42,
                                           'expectedBaselineRed': 'Two new behavior assertions fail; 11 pass. No preserved baseline assertion regressed.',
                                           'launcherCommandSeconds': sum(c['elapsedSeconds'] for r in receipts for c in r['commands'])},
              'collectorSha256': sha(Path(__file__)),
              'limits': ['Four fresh inputs were fixed before outcomes. Only fresh-y-cross changes; other fresh catches/sack are preservation controls, not active-mechanism transfer.',
                         'No-contact in P045 cannot establish grasp failure. Fresh boundary play is a sack, not zero-YAC catch or out-of-bounds test.',
                         'All cases complete. Ordinary World/settings/capacities/grips fixed. Candidate consumes no new sighting/RNG; changed future paths can change shared stochastic ordering.',
                         'Raw native archives are reproducible from shipped frozen inputs without a game prefix. Production source/tests restored; archive is not an integration diff.']}
    assert packet['acceptedSourceSha256'] == '2402d98170109b92a3a862609e6fc2fadd5114d56524a332c024e77b898df9ad'
    assert packet['candidateSourceSha256'] == '78b6de605643c981158d617d0b5a7aa1606aa9a3f700d94385bf7bb1c60083b2'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(gzip.compress((json.dumps(packet, indent=2) + '\n').encode(), mtime=0))
    print(json.dumps({'out': str(output), 'sha256': sha(output), 'bytes': output.stat().st_size, 'cost': packet['cost']}))


if __name__ == '__main__':
    main()
