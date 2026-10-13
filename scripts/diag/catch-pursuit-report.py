"""Saved-only report; never executes a controller or introduces observations."""
import collections
import gzip
import hashlib
import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('out/catch-pursuit')


def read(path):
    opener = gzip.open if str(path).endswith('.gz') else open
    with opener(path, 'rt') as f:
        return json.load(f)


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def distance(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def label(c, idx):
    p = c['players'][idx]
    return {'index': idx, 'id': p['id'], 'slot': p['slot']}


def summarize_clip(c):
    result = c['result']
    catch = next((e for e in result['events'] if e['type'] == 'catch'), None)
    if catch is None:
        return {'id': c['id'], 'completed': False, 'outcome': result['outcome'],
                'observerVerified': c['observerVerified'], 'input': c.get('input')}
    ri, t = catch['a'], catch['t']
    at = next(r for r in c['rows'] if r['t'] >= t - 1e-8)
    st = at['world']['after']
    defenders = [p['idx'] for p in c['players'] if p['team'] == 'D']
    nearest = min(defenders, key=lambda d: distance(st[d]['pos'], st[ri]['pos']))
    attempts = [e for e in result['events'] if e['t'] >= t - 1e-8
                and e.get('b') == ri and e.get('a') in defenders
                and e['type'] in ('tackle_wrap', 'missed_tackle', 'hit', 'tackle')]
    approach = attempts[0]['a'] if attempts else nearest
    physical = []
    first_load = None
    # The catch happens after World. Exclude that row's earlier solve.
    for r in c['rows']:
        if r['pre']['catchAt'] < 0 or r['pre']['carrier'] != ri or not r['world']:
            continue
        w = r['world']
        for q in w['contacts']:
            if ri in (q['i'], q['j']) and q['impulse'] > 0 and (q['j'] if q['i'] == ri else q['i']) in defenders:
                physical.append({'tickEnd': round(r['t'] + .05, 2), 'kind': 'body',
                                 'defender': label(c, q['j'] if q['i'] == ri else q['i']), 'impulse': q['impulse']})
        for q in w['strikes']:
            if ri in (q['i'], q['j']) and q.get('impulse', 0) > 0 and (q['j'] if q['i'] == ri else q['i']) in defenders:
                physical.append({'tickEnd': round(r['t'] + .05, 2), 'kind': 'strike',
                                 'defender': label(c, q['j'] if q['i'] == ri else q['i']), 'impulse': q['impulse']})
        for g in w['grasps']:
            if ri not in (g['a'], g['b']) or g.get('force', 0) <= 1e-8:
                continue
            d = g['b'] if g['a'] == ri else g['a']
            info = {'tickEnd': round(r['t'] + .05, 2), 'kind': 'loaded-grasp', 'defender': label(c, d),
                    'forceAtBoundary': g['force'], 'armImpulseOverStep': w['armImpulse'][d],
                    'origin': g.get('origin'), 'slipping': g.get('slipping'),
                    'support': w['after'][d]['support']['state']}
            physical.append(info)
            if first_load is None:
                first_load = info
    first_contact = min(physical, key=lambda x: x['tickEnd']) if physical else None
    following = next((r for r in c['rows'] if r['t'] > t + 1e-8), None)
    early = []
    remote = []
    if following:
        for cmd in following['commands']:
            d = cmd['actor']
            cues = [q for q in following['cues'] if q['stage'] == 'controller' and q['actor'] == d and q['target'] == ri]
            if cmd['kind'] != 'pursuit' or not cues:
                continue
            all_false = all(q['seen'].get('carrying') is False for q in cues)
            b = following['world']['before'][d]
            r = following['world']['before'][ri]
            cos = math.cos(b['facing'] - math.atan2(r['pos']['y'] - b['pos']['y'], r['pos']['x'] - b['pos']['x']))
            item = {'defender': label(c, d), 't': following['t'], 'allPossessionPicturesFalse': all_false,
                    'sampleAges': [q['seen']['age'] for q in cues], 'distance': distance(b['pos'], r['pos']),
                    'bodyFacingCosineToCatcher': cos, 'raw': cmd['raw'], 'applied': following['world']['applied'][d],
                    'selectedInterceptReconstruction': cmd.get('aim'),
                    'achievedVelocity': following['world']['after'][d]['vel'],
                    'achievedFacing': following['world']['after'][d]['facing']}
            early.append(item)
            if all_false and item['distance'] > 10 and cos < 0 and 'onBall' not in cmd['tags']:
                remote.append(item)
    chosen = next((x for x in at['commands'] if x['actor'] == approach), None)
    before = [r for r in c['rows'] if r['t'] < t and r['t'] >= t - .6]
    declarations = []
    for r in c['rows']:
        if r['t'] > t:
            break
        cmd = next((x for x in r['commands'] if x['actor'] == approach), None)
        if cmd and cmd.get('rule'):
            declarations += [dict(rd, recordedAt=r['t']) for rd in cmd['rule']['reads']
                             if rd['target'] == ri and rd['release'] != 'none']
    return {'id': c['id'], 'completed': True, 'setupSha256': c['setupSha256'],
            'observerVerified': c['observerVerified'], 'signature': c['signature'],
            'catchAtNativeLabel': t, 'catcher': label(c, ri), 'intendedReceiverId': result['stats'].get('target'),
            'actualReceiverId': result['stats'].get('receiver'), 'nearestAtCatch': label(c, nearest),
            'nearestSeparation': distance(st[nearest]['pos'], st[ri]['pos']),
            'approachingDefender': label(c, approach), 'approachSelectedBy': 'first recorded tackle attempt on actual catcher; nearest at catch only if none',
            'installedRole': c['installed'].get(c['players'][approach]['slot']),
            'firstRecordedDeclaration': declarations[0] if declarations else None,
            'lastFlightCommand': chosen, 'firstAttempt': attempts[0] if attempts else None,
            'firstPhysicalContact': first_contact, 'firstLoadedGrasp': first_load,
            'nearestCatchVelocity': st[nearest]['vel'], 'catchVelocity': st[ri]['vel'],
            'earlyPursuitCommands': len(early), 'earlyAllPossessionFalse': sum(x['allPossessionPicturesFalse'] for x in early),
            'firstApproacherPursuit': next((x for x in early if x['defender']['index'] == approach), None),
            'remoteTurnedAwayNoOnBall': remote,
            'yac': result['stats'].get('yac'), 'offenseYards': result['offenseYards'],
            'outcome': result['outcome'], 'censored': result['outcome'] == 'timeout',
            'flagged': bool(result.get('penalty')), 'brokenTackles': result['stats']['brokenTackles'],
            'eventsAfterCatch': [e for e in result['events'] if e['t'] >= t and e['type'] in
                                 ('missed_tackle', 'tackle_wrap', 'broken_tackle', 'hit', 'tackle', 'touchdown', 'out_of_bounds')],
            'assessment': 'Information-boundary shortcut demonstrated when earlyPursuitCommands > 0; earlier coverage/arrival correctness not inferred from gain. Loaded escape requires contact trace; no controller fix demonstrated.'}


def panel_rows(packet):
    groups = collections.defaultdict(list)
    for c in packet['clips']:
        groups[(c['input']['concept'], c['input']['arm'])].append(c)
    out = []
    for (concept, arm), clips in groups.items():
        def measures(cs):
            results = [c['result'] for c in cs]
            completed = [r for r in results if r['stats']['completed'] and r['outcome'] != 'timeout']
            return {'snaps': len(cs), 'throws': sum(r['stats']['attempted'] for r in results),
                    'completions': len(completed), 'interceptions': sum(bool(r['stats'].get('interceptedBy')) for r in results),
                    'scrambles': sum(r['stats']['scramble'] for r in results), 'sacks': sum(r['stats']['sacked'] for r in results),
                    'censored': sum(r['outcome'] == 'timeout' for r in results),
                    'offensiveTDs': sum((r.get('score') or {}).get('team') == 'O' and (r.get('score') or {}).get('kind') == 'TD' for r in results),
                    'meanOffenseYardsPerSnap': statistics.mean(r['offenseYards'] for r in results) if results else None,
                    'medianYacPerCompletion': statistics.median(r['stats']['yac'] for r in completed) if completed else None}
        out.append({'concept': concept, 'arm': arm, 'requestedCoverage': clips[0]['input']['coverage'],
                    'effectiveCoverages': dict(collections.Counter(c['input']['effectiveCoverage'] for c in clips)),
                    'allFlagsRetained': measures(clips), 'cleanOnly': measures([c for c in clips if not c['result'].get('penalty')]),
                    'flagged': sum(bool(c['result'].get('penalty')) for c in clips),
                    'inputs': [{'id': c['id'], 'signature': c['signature']} for c in clips]})
    return out


def main():
    natives = [read(ROOT / f'native{n}.json') for n in (3101, 4202)]
    rows = []
    for n in (3101, 4202):
        p = read(ROOT / f'trace{n}.json.gz')
        rows += [summarize_clip(c) for c in p['clips']]
    labs = {name: panel_rows(read(ROOT / f'{name}.json')) for name in ('panel', 'custom')}
    acquisition = read(ROOT / 'acquisition.json')
    causal = []
    for c in acquisition['cases']:
        causal.append({k: v for k, v in c.items() if k not in ('original', 'redirected')})
        causal[-1]['identity'] = c['original']['identity']
        causal[-1]['originalRaw'] = c['original']['raw']
        causal[-1]['redirectedRaw'] = c['redirected']['raw']
        causal[-1]['originalApplied'] = c['original']['applied']
        causal[-1]['redirectedApplied'] = c['redirected']['applied']
        causal[-1]['consumedOriginalCues'] = c['original']['cues']
        causal[-1]['censoredBothArms'] = c['original']['censored'] and c['redirected']['censored']
    receipts = {p.name: read(p) for p in ROOT.glob('*receipt.json')}
    report = {'schema': 'catch-pursuit-diagnosis-v1', 'baseline': '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
              'reportCreatedAt': datetime.now(timezone.utc).isoformat(), 'summaryToolSha256': file_hash(__file__),
              'runtimeSha256': natives[0]['provenance']['sourceSha256'], 'runtimeChanged': False,
              'apiChoices': {'coverageContracts': {'substeps': 12, 'record': False, 'source': 'existing coverage-contracts.ts'},
                             'nativeAndRoutePanels': {'substeps': 'default adaptive', 'handContact': 'center', 'handIntegration': 'centered',
                                                     'supportModel': 'legacy', 'boundedAttachment': True},
                             'traces': {'record': True, 'recordEvery': 1, 'recordLevel': 'full', 'additionalVisualReads': 0},
                             'identityWitness': {'intervention': 'one actor carrier property via Proxy for one controller call',
                                                 'realBallPossessionUnchanged': True, 'stop': 'after one World tick; no full-play verdict'}},
              'definitions': {'catchIdentity': 'Native catch event and stats.receiver; intended target kept distinct.',
                              'contact': 'First positive solver body/strike impulse or grasp force after possession; end-of-step boundary, not exact onset.',
                              'graspForce': 'End-of-step resultant, not force averaged over 0.05 s; armImpulse is separately measured.',
                              'censor': 'Native timeout is unfinished. Identity intervention stops after one tick and supplies no full-play outcomes.',
                              'lab': 'Specific native 22-body calls, 2 rosters per panel; no league frequency or NFL dominance claim.',
                              'handbook': 'Attached guidance/historical evidence, not new measured results.'},
              'nativeCohorts': [{k: p[k] for k in ('cohort', 'seed', 'sampling', 'sampleSeed', 'provenance')} |
                               {'dropbacks': len(p['population']), 'completedPasses': sum(c['completed'] for c in p['population']),
                                'inputFileSha256': file_hash(ROOT / f"native{p['cohort']}.json")} for p in natives],
              'nativeSummary': {'reviewed': len(rows), 'flagged': sum(r['flagged'] for r in rows),
                                'outcomes': dict(collections.Counter(r['outcome'] for r in rows)),
                                'actualIntendedMismatch': sum(r['actualReceiverId'] != r['intendedReceiverId'] for r in rows),
                                'firstTickPursuitCommands': sum(r['earlyPursuitCommands'] for r in rows),
                                'firstTickAllPossessionPicturesFalse': sum(r['earlyAllPossessionFalse'] for r in rows),
                                'remoteTurnedAwayNoOnBallCommands': sum(len(r['remoteTurnedAwayNoOnBall']) for r in rows),
                                'loadedGraspPlays': sum(r['firstLoadedGrasp'] is not None for r in rows),
                                'observerVerified': all(r['observerVerified'] for r in rows)},
              'nativeCases': rows, 'routePanels': labs, 'causalIdentityProbe': causal,
              'customObservedCases': [summarize_clip(c) for c in read(ROOT / 'custom-trace.json.gz')['clips']],
              'receipts': receipts,
              'artifacts': {p.name: {'bytes': p.stat().st_size, 'sha256': file_hash(p)}
                            for p in ROOT.iterdir() if p.suffix in ('.json', '.gz', '.svg') and 'summary' not in p.name and 'receipt' not in p.name}}
    out = Path('data/reviews/current/catch-pursuit-diagnosis.json')
    out.write_text(json.dumps(report, separators=(',', ':')) + '\n')
    md = ['| Native clip | Catcher | First approaching defender | YAC | End | First solved contact |',
          '| --- | --- | --- | ---: | --- | --- |']
    for r in rows:
        contact = r['firstPhysicalContact']
        desc = f"{contact['defender']['slot']} {contact['kind']} at {contact['tickEnd']:.2f}s" if contact else 'None recorded'
        md.append(f"| {r['id']} | {r['catcher']['slot']} `{r['catcher']['id']}` | {r['approachingDefender']['slot']} `{r['approachingDefender']['id']}` | {r['yac']:.2f} | {r['outcome']}{' (flagged)' if r['flagged'] else ''} | {desc} |")
    (ROOT / 'case-matrix.md').write_text('\n'.join(md) + '\n')
    print(json.dumps(report['nativeSummary']))
    print('Compact receipt', out, out.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
