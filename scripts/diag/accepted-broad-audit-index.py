#!/usr/bin/env python3
"""Index the frozen audit's saved native evidence. Zero simulations/classifiers."""
import hashlib
import json
import math
import statistics
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'out/accepted-broad-audit'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    summary = json.loads((RAW / 'summary.json').read_text())
    manifest = json.loads((RAW / 'manifest.json').read_text())
    planned = {case['id']: case for case in manifest['cases']}
    receipt = json.loads((RAW / 'run-receipt.json').read_text())
    assert summary['status'] == 'complete' and summary['complete'] == 48
    assert not summary['partial'] and not summary['skipped']
    assert receipt['inputsUnchanged'] and receipt['exitCode'] == 0
    rows = []
    for entry in summary['rows']:
        path = RAW / 'cases' / f"{entry['id']}.json"
        assert digest(path) == entry['sha256']
        data = json.loads(path.read_text())
        result, actors = data['result'], data['actors']
        assert data['setup'] == planned[entry['id']]['setup']
        assert data['inputSha256'] == planned[entry['id']]['inputSha256'] == entry['inputSha256']
        assert data['manifestSha256'] == manifest['manifestSha256'] == summary['manifestSha256']
        assert data['censoring'] == {'wallBudget': False, 'max25Seconds': False}
        assert all(a['body']['energy'] == 1 for a in data['initial']['agents'])
        ids = {a['id'] for a in actors}
        assert all(result['stats'].get(k) is None or result['stats'][k] in ids for k in
                   ['passer', 'target', 'receiver', 'rusher', 'interceptedBy'])
        assert all(e['t'] <= result['duration'] and all(e.get(k) is None or 0 <= e[k] < 22
                   for k in ['a', 'b']) for e in result['events'])
        assert result['stats'] == entry['stats'] and result['offenseYards'] == entry['offenseYards']
        frames, states = result['frames'], result['telemetry']['frames']
        assert len(actors) == len({a['id'] for a in actors}) == 22
        assert len(frames) == len(states)
        assert all(f['t'] == s['t'] and len(f['agents']) == 66 and len(s['agents']) == 22
                   for f, s in zip(frames, states))
        assert all(abs(b['t']-a['t']-.05) < 1e-7 for a, b in zip(frames, frames[1:]))
        samples = []
        phase_times = {0, round(result['duration']-.05, 2)}
        phase_times.update(round(e['t'], 2) for e in result['events'] if e['type'] in
                           ['handoff', 'throw', 'catch', 'sack', 'scramble', 'tackle_wrap', 'tackle'])
        phase_times.update(round(t*.5, 2) for t in range(1, int(result['duration']*2)+1))
        for when in sorted(phase_times):
            i = min(range(len(frames)), key=lambda i: abs(frames[i]['t']-when))
            f, s = frames[i], states[i]
            carrier = f['carrier']
            # Keep identities at every sample; proximity is explicitly not contact.
            focus = [a['idx'] for a in actors if a['slot'] in ('QB', 'RB')]
            if carrier >= 0 and carrier not in focus:
                focus.append(carrier)
            sample = {'t': f['t'], 'ball': s.get('ball'), 'carrier': carrier, 'focus': []}
            for idx in focus:
                a = actors[idx]
                x, y = f['agents'][idx*3:idx*3+2]
                nearest = {}
                for team in ['O', 'D']:
                    distances = [(math.hypot(x-f['agents'][b['idx']*3], y-f['agents'][b['idx']*3+1]), b['idx'])
                                 for b in actors if b['team'] == team and b['idx'] != idx]
                    distance, j = min(distances)
                    nearest[team] = {'idx': j, 'id': actors[j]['id'], 'slot': actors[j]['slot'], 'distance': round(distance, 3)}
                sample['focus'].append({'idx': idx, 'id': a['id'], 'slot': a['slot'], 'xy': [x, y],
                                        'state': s['agents'][idx], 'nearest': nearest})
            samples.append(sample)
        contact_pairs = {}
        for s in states:
            for c in s.get('contacts', []):
                if c['impulse'] <= 0:
                    continue
                key = tuple(sorted((c['a'], c['b'])))
                p = contact_pairs.setdefault(key, {'a': key[0], 'b': key[1],
                    'sameTeam': actors[key[0]]['team'] == actors[key[1]]['team'],
                    'first': s['t'], 'last': s['t'], 'sampleTicks': 0, 'maxSampleImpulse': 0})
                p['last'] = s['t']; p['sampleTicks'] += 1
                p['maxSampleImpulse'] = max(p['maxSampleImpulse'], c['impulse'])
        rows.append({'id': entry['id'], 'matchup': data['matchup'], 'concept': data['concept'],
                     'kind': result['kind'], 'actors': actors, 'outcome': result['outcome'],
                     'yards': result['offenseYards'], 'duration': result['duration'],
                     'stats': result['stats'], 'events': result['events'], 'samples': samples,
                     'sampledContactPairs': list(contact_pairs.values()),
                     'decisions': result['telemetry']['decisions']})
    output = RAW / 'phase-index.json'
    output.write_text(json.dumps({'manifestSha256': summary['manifestSha256'],
        'measurement': 'Saved-data index; samples are native tick bins. Nearest identities retained; no automatic symptom/win classification. Sampled contacts are not complete impulse history.',
        'rows': rows}, separators=(',', ':'))+'\n')
    print(json.dumps({'validatedCases': len(rows), 'index': str(output), 'sha256': digest(output)}))
    # Reconcile the separate human-reviewed ledgers; observations are not bug labels.
    review_root = ROOT / 'data/reviews/current'
    run_path = review_root / 'accepted-broad-audit-run-review.json'
    pass_path = review_root / 'accepted-broad-audit-pass-review.json'
    if not run_path.exists() or not pass_path.exists():
        return
    runs, passes = (json.loads(p.read_text()) for p in [run_path, pass_path])
    by_id = {r['id']: r for r in rows}
    run_ids = {r['caseId'] for r in runs['plays']}
    pass_ids = {r['caseId'] for r in passes['plays']}
    assert len(run_ids) == len(pass_ids) == 24 and not run_ids & pass_ids
    assert run_ids | pass_ids == set(by_id)
    for r in runs['plays']:
        assert r['raw']['sha256'] == next(e['sha256'] for e in summary['rows'] if e['id'] == r['caseId'])
    for r in passes['plays']:
        assert r['rawSha256'] == next(e['sha256'] for e in summary['rows'] if e['id'] == r['caseId'])
    categories = {}
    for r in runs['plays']:
        for concern in r['concerns']:
            categories.setdefault(concern['category'], set()).add(r['caseId'])
    for r in passes['plays']:
        for concern in r['primaryConcerns']:
            for category in [concern['category'], *concern.get('secondaryCategories', [])]:
                categories.setdefault(category, set()).add(r['caseId'])
    expected = {'blocking_access': 9, 'coverage_recognition': 8,
                'pursuit_arrival_and_gathering': 2, 'runner_and_teammate_coordination': 1}
    assert {k: len(v) for k, v in categories.items()} == expected
    unique = set.union(*categories.values())
    assert len(unique) == 14
    contact_rows = []
    for r in rows:
        who = r['stats'].get('receiver' if r['kind'] == 'pass' else 'rusher')
        if who is None:
            continue
        idx = next(a['idx'] for a in r['actors'] if a['id'] == who)
        start = next(e['t'] for e in r['events'] if e['type'] == ('catch' if r['kind'] == 'pass' else 'handoff'))
        contact = [e['t'] for e in r['events'] if e['t'] >= start and
                   e['type'] in ['carrier_contact', 'tackle_wrap', 'hit'] and idx in [e.get('a'), e.get('b')]]
        end = max((e['t'] for e in r['events'] if e['type'] == 'tackle' and idx in [e.get('a'), e.get('b')]), default=None)
        contact_rows.append({'id': r['id'], 'kind': r['kind'], 'playerId': who, 'start': start,
            'firstRecordedContact': min(contact) if contact else None, 'terminalTackle': end,
            'recordedContactToTackle': round(end-min(contact), 3) if end is not None and contact else None})
    contact_summary = {}
    for kind in ['run', 'pass']:
        group = [r for r in contact_rows if r['kind'] == kind]
        intervals = [r['recordedContactToTackle'] for r in group if r['recordedContactToTackle'] is not None]
        contact_summary[kind] = {'actualPossessionPlays': len(group), 'withRecordedContact': sum(r['firstRecordedContact'] is not None for r in group),
            'withTerminalTackle': sum(r['terminalTackle'] is not None for r in group), 'medianRecordedContactToTackle': statistics.median(intervals)}
    adjudication = {'schema': 'accepted-broad-audit-adjudication-v1',
        'acceptedCommit': manifest['provenance']['acceptedCommit'], 'sourceSha256': manifest['provenance']['sourceSha256'],
        'manifestSha256': manifest['manifestSha256'], 'querySha256': digest(Path(__file__)),
        'ledgers': {str(p.relative_to(ROOT)): digest(p) for p in [run_path, pass_path]},
        'verified': {'cases': 48, 'uniqueAll22IDsPerCase': True, 'exactSetupsAndRawHashes': True,
            'nativeEventsAndStats': True, 'uniformNativeFrameCadence': True, 'initialEnergyOne': True,
            'partial': 0, 'skipped': 0, 'max25SecondCensoring': 0, 'newSimulations': 0},
        'categoryCaseIds': {k: sorted(v) for k, v in categories.items()}, 'categoryCounts': expected,
        'uniquePlaysWithReviewQuestion': sorted(unique),
        'interpretation': 'Counts are reviewed concerns/assignment nonrealizations, not proven defects, unrealistic-play rates or causal yardage effects. Categories overlap. Balanced fixed-call panel is not game-caller prevalence.',
        'outcomes': {kind: dict(Counter(r['outcome'] for r in rows if r['kind'] == kind)) for kind in ['run', 'pass']},
        'recordedContactDefinition': 'First original carrier_contact/tackle_wrap/hit involving actual rusher or receiver after handoff/catch. Event tick bins, not exact physical first contact; no speed or force inference.',
        'recordedContactSummary': contact_summary, 'recordedContactRows': contact_rows}
    destination = review_root / 'accepted-broad-audit/adjudication.json'
    destination.write_text(json.dumps(adjudication, indent=2)+'\n')
    print(json.dumps({'ledgerCasesReconciled': 48, 'categoryCounts': expected, 'uniqueReviewQuestions': len(unique),
                      'contactSummary': contact_summary, 'adjudication': str(destination)}))


if __name__ == '__main__':
    main()
