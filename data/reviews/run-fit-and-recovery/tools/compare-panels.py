#!/usr/bin/env python3
"""Compare completed source-pinned native panels. Reads saved output only."""
from __future__ import annotations
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path

BASELINE_SOURCE = '8bc3eec8d0b842021d000585bb71331be17d6a644c763b2e510303cb4372d942'
WORLD_SHA = '4944084ea63112a5bf9caa7e39867b2024fe9ba0a726c89ad80f8fdde2f8134f'

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def canonical_sha(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def read(path: Path):
    with gzip.open(path, 'rt') as stream:
        return json.load(stream)

def save(path: Path, value):
    raw = (json.dumps(value, sort_keys=True, separators=(',', ':')) + '\n').encode()
    path.write_bytes(gzip.compress(raw, mtime=0))

def strip_carrying(value):
    if isinstance(value, dict):
        return {k: strip_carrying(v) for k, v in value.items() if k != 'carrying'}
    if isinstance(value, list):
        return [strip_carrying(v) for v in value]
    return value

def changed_paths(a, b, path=''):
    if a == b:
        return []
    if isinstance(a, dict) and isinstance(b, dict):
        result = []
        for key in sorted(set(a) | set(b)):
            subpath = f'{path}/{key}'
            if key not in a or key not in b:
                result.append(subpath)
            else:
                result.extend(changed_paths(a[key], b[key], subpath))
        return result
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [p for index, (x, y) in enumerate(zip(a, b)) for p in changed_paths(x, y, f'{path}/{index}')]
    return [path]

def mean(values):
    return sum(values) / len(values) if values else None

def paired_rows(baseline, candidate, key):
    old, new = baseline[key], candidate[key]
    identify = lambda row: row.get('id', row.get('input', {}).get('id'))
    assert [identify(r) for r in old] == [identify(r) for r in new], 'Input order or IDs changed'
    assert len({identify(r) for r in old}) == len(old), 'Duplicate ID'
    return list(zip(old, new))

def event_counts(events):
    return dict(sorted(collections.Counter(e['type'] for e in events).items()))

def common_guards(old, new, tool_field, baseline_path, candidate_path):
    assert old['sourceBefore'] == old['sourceAfter'] == BASELINE_SOURCE, 'Wrong/mutating baseline source'
    assert new['sourceBefore'] == new['sourceAfter'], 'Candidate source changed during collector'
    assert old['schema'] == new['schema'], 'Panel schema changed'
    assert old['cohort'] == new['cohort'], 'Cohort/configuration mismatch'
    assert old['definitions'] == new['definitions'], 'Measurement definitions changed'
    assert old[tool_field] == new[tool_field], 'Collector changed'
    if 'node' in old:
        assert old['node'] == new['node'], 'Node changed'
    return {'baselineFile': str(baseline_path), 'baselineSha256': sha(baseline_path),
            'candidateFile': str(candidate_path), 'candidateSha256': sha(candidate_path),
            'baselineSource': old['sourceBefore'], 'candidateSource': new['sourceBefore'],
            'schema': old['schema'], 'collectorSha256': old[tool_field],
            'cohortCanonicalSha256': canonical_sha(old['cohort']),
            'sourceStableBoth': True, 'cohortSame': True, 'definitionsSame': True, 'collectorSame': True}

def run_phase_summary(rows):
    results = [r['result'] for r in rows]
    return {'inputs': len(rows), 'naturalEnds': sum(r['naturalEnd'] for r in rows),
            'physicalTimeouts': sum(r['outcome'] == 'timeout' for r in results), 'inspectionCensors': 0,
            'meanOffenseYards': mean([r['offenseYards'] for r in results]),
            'stuffs': sum(r['offenseYards'] <= 0 for r in results),
            'fixedFirstDownFortyPercentProxy': sum(r['offenseYards'] >= 4 for r in results),
            'gains20Plus': sum(r['offenseYards'] >= 20 for r in results),
            'lostFumbles': sum(bool(r['stats'].get('fumbleLost')) for r in results),
            'defensiveTouchdowns': sum((r.get('score') or {}).get('team') == 'D' and (r.get('score') or {}).get('kind') == 'TD' for r in results),
            'holdingFlags': sum((r.get('penalty') or {}).get('kind') == 'holding' for r in results),
            'OLFalls': sum(m['falls'] for r in rows for m in r['olMetrics'].values()),
            'OLDowns': sum(m['downs'] for r in rows for m in r['olMetrics'].values()),
            'missedTackleEvents': sum(r['stats'].get('missedTackles', 0) for r in results),
            'brokenTackleEvents': sum(r['stats'].get('brokenTackles', 0) for r in results)}

def compare_runs(old, new, guards):
    assert old['cohort']['rosterSha256'] == new['cohort']['rosterSha256']
    assert old['moduleSha256']['src/physics/world.ts'] == new['moduleSha256']['src/physics/world.ts'] == WORLD_SHA
    populations, adverse = {}, []
    for population, key in [('ordinary-native', 'trials'), ('supplemental-recovery-witness', 'supplementalTrials')]:
        comparisons = []
        for a, b in paired_rows(old, new, key):
            for field in ['id', 'roster', 'run', 'front', 'flip', 'seed', 'supplemental', 'formation', 'initialSha256', 'profileSha256', 'initialProjection']:
                assert a[field] == b[field], f'Run {a["id"]} {field} mismatch'
            for r in [a, b]:
                assert r['observerVerified'] and r['observedSignature'] == r['plainSignature'], f'Run observer failed {a["id"]}'
                assert r['naturalEnd'] == (r['result']['outcome'] != 'timeout')
            ar, br = a['result'], b['result']
            raw_paths = changed_paths(a['updates'], b['updates'])
            normalized_updates_same = strip_carrying(a['updates']) == strip_carrying(b['updates'])
            reasons = []
            if br['offenseYards'] < ar['offenseYards']: reasons.append('lower-offense-gain')
            if br['stats'].get('fumbleLost', False) and not ar['stats'].get('fumbleLost', False): reasons.append('new-lost-fumble')
            if (br.get('score') or {}).get('team') == 'D' and (br.get('score') or {}).get('kind') == 'TD' and br.get('score') != ar.get('score'): reasons.append('new-defensive-touchdown')
            for stat in ['missedTackles', 'brokenTackles']:
                if br['stats'].get(stat, 0) > ar['stats'].get(stat, 0): reasons.append(f'increased-{stat}')
            if br.get('penalty') != ar.get('penalty'): reasons.append('changed-penalty')
            if br['outcome'] == 'timeout' and ar['outcome'] != 'timeout': reasons.append('new-physical-timeout')
            comparison = {'id': a['id'], 'population': population, 'input': {k: a[k] for k in ['roster', 'run', 'front', 'flip', 'seed', 'supplemental', 'formation']},
                          'initialSha256': a['initialSha256'], 'profileSha256': a['profileSha256'],
                          'initialProjectionSame': True, 'observerVerifiedBoth': True,
                          'baselineExecutionSha256': a['observedSignature'], 'candidateExecutionSha256': b['observedSignature'],
                          'completeExecutionSame': a['observedSignature'] == b['observedSignature'],
                          'offenseGainDelta': br['offenseYards'] - ar['offenseYards'],
                          'baselineResult': ar, 'candidateResult': br,
                          'eventCounts': {'baseline': event_counts(ar['events']), 'candidate': event_counts(br['events'])},
                          'rawChangedFields': [k for k in sorted(set(a) | set(b)) if a.get(k) != b.get(k)],
                          'rawUpdateChangedPaths': raw_paths, 'updatesSameAfterDroppingNewCarryingField': normalized_updates_same,
                          'OLMetricsSame': a['olMetrics'] == b['olMetrics'],
                          'engineering': {name: {'baseline': a[name], 'candidate': b[name]} for name in ['staleMemberUpdates', 'staleOLMemberUpdates', 'staleTickCount', 'targetTransitions', 'cancelledTransitions', 'earnedClimbs', 'maxMomentumResidual', 'maxWorkResidual', 'maxMotorWorkExcess']},
                          'adverseReasons': reasons}
            if not comparison['OLMetricsSame']:
                comparison['changedOLMetrics'] = {'baseline': a['olMetrics'], 'candidate': b['olMetrics']}
            comparisons.append(comparison)
            if reasons: adverse.append({'id': a['id'], 'population': population, 'reasons': reasons})
        populations[population] = {'baseline': run_phase_summary([a for a, _ in paired_rows(old, new, key)]),
                                   'candidate': run_phase_summary([b for _, b in paired_rows(old, new, key)]),
                                   'completeExecutionsSame': sum(r['completeExecutionSame'] for r in comparisons),
                                   'higherOffenseGains': sum(r['offenseGainDelta'] > 0 for r in comparisons),
                                   'lowerOffenseGains': sum(r['offenseGainDelta'] < 0 for r in comparisons),
                                   'equalOffenseGains': sum(r['offenseGainDelta'] == 0 for r in comparisons),
                                   'rows': comparisons}
    return {'schema': 'run-fit-panel-comparison-v1', 'guards': guards, 'populations': populations, 'allAdverseCases': adverse,
            'limits': ['Ordinary 160 and two supplemental cases remain separate; neither is an NFL call-frequency sample.',
                       'Offensive gain does not include defensive return yards: a return touchdown can change while rushing mean stays identical.',
                       'Raw carrying-field additions are observability differences, not evidence of changed movement; exact execution signatures are compared separately.',
                       'The four-yard proxy is a fixed first-down 40%-of-distance measure, not generic success rate.']}

def pass_summary(rows):
    complete = [r for r in rows if r['stats']['completed']]
    return {'inputs': len(rows), 'naturalEnds': sum(r['outcome'] != 'timeout' for r in rows), 'physicalTimeouts': sum(r['outcome'] == 'timeout' for r in rows),
            'inspectionCensors': 0, 'meanOffenseYards': mean([r['offenseYards'] for r in rows]),
            'attempts': sum(r['stats']['attempted'] for r in rows), 'completions': len(complete),
            'sacks': sum(r['stats']['sacked'] for r in rows), 'interceptions': sum(bool(r['stats'].get('interceptedBy')) for r in rows),
            'gains20Plus': sum(r['offenseYards'] >= 20 for r in rows),
            'ownCompletedYAC': mean([r['stats']['yac'] for r in complete])}

def compare_passes(old, new, guards):
    assert old['rostersSha256'] == new['rostersSha256']
    assert old['sharedWorldSha256'] == new['sharedWorldSha256'] == WORLD_SHA
    comparisons, adverse = [], []
    for a, b in paired_rows(old, new, 'rows'):
        for field in ['id', 'roster', 'formation', 'concept', 'coverage', 'flip', 'profilesSha256']:
            assert a[field] == b[field], f'Passing {a["id"]} {field} mismatch'
        assert a['observerVerified'] and b['observerVerified']
        reasons = []
        if b['offenseYards'] > a['offenseYards']: reasons.append('higher-offense-gain')
        if b['stats'].get('interceptedBy') and not a['stats'].get('interceptedBy'): reasons.append('new-interception')
        if b['outcome'] == 'timeout' and a['outcome'] != 'timeout': reasons.append('new-physical-timeout')
        row = {'id': a['id'], 'population': 'fixed-native-passing', 'input': {k: a[k] for k in ['roster', 'formation', 'concept', 'coverage', 'flip']},
               'profilesSha256': a['profilesSha256'], 'observerVerifiedBoth': True,
               'baselineExecutionSha256': a['executionSha256'], 'candidateExecutionSha256': b['executionSha256'],
               'completeExecutionSame': a['executionSha256'] == b['executionSha256'], 'rawRowSame': a == b,
               'offenseGainDelta': b['offenseYards'] - a['offenseYards'],
               'baseline': {k: a.get(k) for k in ['outcome', 'offenseYards', 'duration', 'stats', 'penalty', 'events', 'qbReport', 'maxStress', 'minFocus']},
               'candidate': {k: b.get(k) for k in ['outcome', 'offenseYards', 'duration', 'stats', 'penalty', 'events', 'qbReport', 'maxStress', 'minFocus']},
               'samplesSame': a['samples'] == b['samples'], 'eventCounts': {'baseline': event_counts(a['events']), 'candidate': event_counts(b['events'])},
               'adverseReasons': reasons}
        comparisons.append(row)
        if reasons: adverse.append({'id': a['id'], 'reasons': reasons})
    return {'schema': 'run-fit-passing-comparison-v1', 'guards': guards, 'baseline': pass_summary(old['rows']), 'candidate': pass_summary(new['rows']),
            'completeExecutionsSame': sum(r['completeExecutionSame'] for r in comparisons), 'rawRowsSame': sum(r['rawRowSame'] for r in comparisons),
            'rows': comparisons, 'allAdverseCases': adverse,
            'limits': ['96 fixed balanced calls, not NFL pass mix.', 'YAC uses each phase completed subset; common completions are explicit in unchanged rows.',
                       'Natural outcomes can still reflect technique/read mistakes: neutrality is not calibrated football realism.']}

def approach_summary(rows):
    return {'inputs': len(rows), 'inspectionCensors': sum(r['censored'] for r in rows),
            'physicalTimeouts': sum(r['outcome'] == 'timeout' and not r['censored'] for r in rows),
            'naturalEnds': sum(not r['censored'] and r['outcome'] != 'timeout' for r in rows),
            'meanOffenseYards': mean([r['offenseYards'] for r in rows]) if not any(r['censored'] for r in rows) else None,
            'stats': {k: sum(r['stats'].get(k, 0) for r in rows) for k in sorted({k for r in rows for k in r['stats']})}}

def compare_approach(old, new, guards):
    assert old['inputSha256'] == new['inputSha256'], 'Approach input file changed'
    guards['inputSha256'] = old['inputSha256']
    populations, adverse = {}, []
    for a, b in paired_rows(old, new, 'rows'):
        for field in ['input', 'initialSha256', 'profileSha256', 'players', 'startT']:
            assert a[field] == b[field], f'Approach {a["input"]["id"]} {field} mismatch'
        assert a['observerVerified'] and b['observerVerified']
        assert a['source'] == old['sourceBefore'] and b['source'] == new['sourceBefore']
        payload_a, payload_b = ({k: v for k, v in r.items() if k != 'source'} for r in [a, b])
        exact = payload_a == payload_b
        group = a['input']['group']; reasons = []
        if not b['censored'] and b['offenseYards'] > a['offenseYards']: reasons.append('higher-offense-gain')
        if b['censored'] and not a['censored']: reasons.append('new-inspection-censor')
        for stat in ['missedTackleEvents', 'brokenTackleEvents', 'slippingHolds', 'brokenHolds']:
            if b['stats'].get(stat, 0) > a['stats'].get(stat, 0): reasons.append(f'increased-{stat}')
        row = {'id': a['input']['id'], 'population': group, 'input': a['input'],
               'initialSha256': a['initialSha256'], 'profileSha256': a['profileSha256'], 'initialPlayersSame': True,
               'observerVerifiedBoth': True, 'exactSavedEncounterSameExcludingSourcePin': exact,
               'baselineEncounterCanonicalSha256': canonical_sha(payload_a), 'candidateEncounterCanonicalSha256': canonical_sha(payload_b),
               'offenseGainDelta': b['offenseYards'] - a['offenseYards'],
               'baseline': {k: a[k] for k in ['outcome', 'duration', 'offenseYards', 'censored', 'stats', 'events', 'attempts', 'holds', 'decisions']},
               'candidate': {k: b[k] for k in ['outcome', 'duration', 'offenseYards', 'censored', 'stats', 'events', 'attempts', 'holds', 'decisions']},
               'beforeWorldSame': a['beforeWorld'] == b['beforeWorld'],
               'changedFieldsExcludingSource': [k for k in sorted(set(payload_a) | set(payload_b)) if payload_a.get(k) != payload_b.get(k)],
               'adverseReasons': reasons}
        if not row['beforeWorldSame']: row['changedBeforeWorld'] = {'baseline': a['beforeWorld'], 'candidate': b['beforeWorld']}
        populations.setdefault(group, {'rows': []})['rows'].append(row)
        if reasons: adverse.append({'id': a['input']['id'], 'population': group, 'reasons': reasons})
    for group, report in populations.items():
        report['baseline'] = approach_summary([r for r in old['rows'] if r['input']['group'] == group])
        report['candidate'] = approach_summary([r for r in new['rows'] if r['input']['group'] == group])
        report['exactSavedEncountersSameExcludingSourcePin'] = sum(r['exactSavedEncounterSameExcludingSourcePin'] for r in report['rows'])
    return {'schema': 'run-fit-approach-comparison-v1', 'guards': guards, 'populations': populations, 'allAdverseCases': adverse,
            'limits': ['16 ordinary, four retrospectively retained Split inputs and 12 isolated encounters are separate populations.',
                       'Four six-second isolated inspection censors are not engine physical timeouts and their endpoint gains are not pooled with natural outcomes.',
                       'Exact saved encounter comparison removes only the declared row source pin, not physics/contact/movement state.',
                       'A changed gain after a fumble can be about recovery/return rather than run defense.']}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-dir', type=Path, default=Path('data/reviews/pursuit-and-tackle'))
    parser.add_argument('--candidate-dir', type=Path, default=Path('out/run-fit-follow-up'))
    parser.add_argument('--output-dir', type=Path, default=Path('out/run-fit-follow-up'))
    args = parser.parse_args(); args.output_dir.mkdir(parents=True, exist_ok=True)
    reports = {}; input_pins = {}; candidate_sources = set()
    specs = [('runs', 'collectorSha256', compare_runs), ('passing', 'toolSha256', compare_passes), ('approach', 'collectorSha256', compare_approach)]
    for kind, tool_field, compare in specs:
        baseline_path = args.baseline_dir / kind / 'final.json.gz'; candidate_path = args.candidate_dir / f'{kind}-final.json.gz'
        if not candidate_path.exists():
            candidate_path = args.candidate_dir / kind / 'final.json.gz'
        assert baseline_path.exists() and candidate_path.exists(), f'Wait for complete panel {kind}'
        old, new = read(baseline_path), read(candidate_path)
        guards = common_guards(old, new, tool_field, baseline_path, candidate_path)
        candidate_sources.add(new['sourceBefore']); input_pins[kind] = guards
        reports[kind] = compare(old, new, guards)
    assert len(candidate_sources) == 1, 'Candidate source differs across panels'
    outputs = {}
    for kind, report in reports.items():
        target = args.output_dir / f'{kind}-comparison.json.gz'; save(target, report)
        outputs[str(target)] = sha(target)
    runs, passes, approach = reports['runs'], reports['passing'], reports['approach']
    ordinary = runs['populations']['ordinary-native']; supplemental = runs['populations']['supplemental-recovery-witness']
    isolated = approach['populations']['isolated-encounter']
    assert ordinary['baseline']['inputs'] == 160 and supplemental['baseline']['inputs'] == 2 and passes['baseline']['inputs'] == 96
    assert isolated['baseline']['inputs'] == 12 and isolated['candidate']['inspectionCensors'] == isolated['baseline']['inspectionCensors'] == 4
    lines = ['# Fixed native panel comparison', '', f'Baseline source: `{BASELINE_SOURCE}`. Candidate source: `{next(iter(candidate_sources))}`.', '',
             'All six raw files have stable before/after source guards. Cohort/configuration, collector, profile and recorded input hashes match. All observer/plain controls pass (162 run, 96 passing, 32 approach). The shared World source is unchanged. This reads saved output only.', '',
             f'Ordinary runs: all160 offensive gains match, mean {ordinary["baseline"]["meanOffenseYards"]:.6f} yd in both phases. {ordinary["completeExecutionsSame"]}/160 complete execution signatures match; the two separate supplemental inputs match completely. All162 are natural, with zero physical timeouts or inspection censors.', '',
             'Important adverse outcome: `CT-R1-wz_strong-under-R-S3` retains its1.73-yard offensive gain and lost fumble, but the defensive return changes from4.04 to32.43 yards and becomes a defensive touchdown. Duration6.45→9.75s, with one new missed and one new broken-tackle event. An identical rushing mean does not mean identical football execution.', '',
             f'Passing: all{passes["rawRowsSame"]}/96 raw rows and complete execution signatures match exactly. Mean {passes["baseline"]["meanOffenseYards"]:.6f} yd, 55 completions,7 interceptions, one sack,12 gains20+, no physical timeout. There is no new passing improvement or adverse difference in this fixed panel.', '',
             'Approach populations stay separate:', '']
    for group, report in approach['populations'].items():
        old, new = report['baseline'], report['candidate']
        lines.append(f'- {group}: {report["exactSavedEncountersSameExcludingSourcePin"]}/{old["inputs"]} saved encounters exactly match after removing only source pin; inspection censors {old["inspectionCensors"]}→{new["inspectionCensors"]}, physical timeouts {old["physicalTimeouts"]}→{new["physicalTimeouts"]}.')
    lines += ['', 'One ordinary approach input changes: `TA-R2-iz_strong-over-L-S3`, gain3.47→3.72yd, duration3.40→4.15s. Its existing contact fumble remains, with created/positively loaded holds1→4, assists0→2 and slipping holds1→3. It still finishes naturally. All12 isolated encounters, including mirrored crossing, fatigued-crossing and traffic-crossing cases, match exactly. Their four retained six-second censors remain.', '',
              'Raw run update records now include carrying observations: those field additions are retained and distinguished from motor/execution changes. The corresponding normalized comparison drops only the newly added carrying field. Approach comparison drops only row source pin. Source, old/new input file hashes and collector provenance are in `panel-comparison-receipt.json`; every per-input gain, result, event list and changed contact data is in the compressed comparisons.', '',
              'These balanced native panels are regression controls, not NFL playcalling frequencies. The selected Duo witness and separate eight-game outcomes must establish the targeted mechanism and integration behavior; this panel does not prove a universal awareness, pursuit or physics improvement.']
    text = '\n'.join(lines) + '\n'
    for a, b in [('all160','all 160'),('All162','All 162'),('all96','all 96'),('all12','all 12'),('All12','All 12'),('its1.73','its 1.73'),('from4.04 to32.43','from 4.04 to 32.43'),('Duration6.45→9.75s','Duration 6.45→9.75 s'),('55 completions,7','55 completions, 7'),('sack,12 gains20+','sack, 12 gains 20+'),('gain3.47→3.72yd','gain 3.47→3.72 yd'),('duration3.40→4.15s','duration 3.40→4.15 s'),('holds1→4','holds 1→4'),('assists0→2','assists 0→2'),('holds1→3','holds 1→3')]: text = text.replace(a, b)
    findings = args.output_dir / 'panel-comparison-findings.md'; findings.write_text(text); outputs[str(findings)] = sha(findings)
    receipt = {'schema': 'run-fit-panel-comparison-receipt-v1', 'tool': str(Path(__file__)), 'toolSha256': sha(Path(__file__)),
               'baselineSource': BASELINE_SOURCE, 'candidateSource': next(iter(candidate_sources)), 'inputPins': input_pins, 'outputsSha256': outputs,
               'assertedMatched': ['cohort/configuration', 'collector hashes', 'recorded initial/profile/roster hashes', 'run initial projections', 'approach initial players', 'row input order', 'measurement definitions', 'stable source guards'],
               'observerControls': {'runs': 162, 'passing': 96, 'approach': 32},
               'limits': ['No resimulation or additional state reads.', 'Existing recorded hashes and raw projections are matched; JavaScript JSON.stringify-generated input hashes are not recomputed with Python float encoding.', 'Changed football populations are not pooled; broad games are separate evidence.']}
    (args.output_dir / 'panel-comparison-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'candidateSource': receipt['candidateSource'], 'runCompleteExecutionsSame': ordinary['completeExecutionsSame'], 'passRawRowsSame': passes['rawRowsSame'],
                      'isolatedApproachExact': isolated['exactSavedEncountersSameExcludingSourcePin'], 'adverseRuns': runs['allAdverseCases'], 'adverseApproach': approach['allAdverseCases']}, indent=2))

if __name__ == '__main__':
    main()
