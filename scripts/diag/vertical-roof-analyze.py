#!/usr/bin/env python3
"""Reduce pinned native evidence; zero new snaps, observations or random draws."""
import gzip
import hashlib
import json
import math
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/vertical-roof'
HOSTS = OUT / 'hosts'


def load(case, arm):
    p = HOSTS / arm / 'out/catch-opportunity-physics' / (case + '.json.gz')
    if arm == 'base' and not p.exists():
        p = ROOT / f'out/flex-three-probes/hosts/base/out/catch-opportunity-physics/{case}-base.json.gz'
    return json.loads(gzip.decompress(p.read_bytes()))


def at(d, t):
    return next(q for q in d['ticks'] if abs(q['t'] - t) < 1e-8)


def geometry(d, i, j, t, achieved=False):
    q = at(d, t)
    a, r = q['achieved' if achieved else 'before'][i], q['achieved' if achieved else 'before'][j]
    dx, dy = a['pos']['x'] - r['pos']['x'], a['pos']['y'] - r['pos']['y']
    return {'t': t, 'boundary': 'post-physics' if achieved else 'tick-start', 'lead': dx, 'lateral': dy,
            'gap': math.hypot(dx, dy), 'velocity': a['vel'], 'receiverVelocity': r['vel'],
            'request': q['request'][i]['vel'], 'finalRequest': q['final'][i]['vel']}


def phase(d):
    return min([d['horizon']] + [e['t'] for e in d['events'] if e['type'] in ['throw', 'scramble']])


def source_hash():
    h = hashlib.sha256()
    for p in sorted((ROOT / 'src').rglob('*'), key=lambda p: str(p.relative_to(ROOT))):
        if p.is_file():
            h.update(str(p.relative_to(ROOT)).encode() + b'\0' + p.read_bytes() + b'\0')
    return h.hexdigest()


def main():
    cases = ['G1-P012', 'G1-P027', 'G1-P043', 'G1-P049', 'G1-P185', 'G1-P187', 'G1-P192',
             'G2-P067', 'G3-P089', 'G4-P156']
    fresh = ['F-QUARTERS-VERTICALS', 'F-COVER2-SMASH']
    pairs = {case: (load(case, 'base'), load(case, 'plant-aware')) for case in cases}
    pairs |= {case: (load(case, 'transfer-base'), load(case, 'transfer-plant-aware')) for case in fresh}
    rows = []
    ages = []
    for case, (b, c) in pairs.items():
        assert b['inputHash'] == c['inputHash'] and b['nativeHash'] == c['nativeHash']
        assert all(x['id'] == y['id'] and x['slot'] == y['slot'] and x['start'] == y['start'] for x, y in zip(b['agents'], c['agents']))
        if b['parity']:
            assert all(v is None or v is True for v in b['parity'].values()), case
        maximum = max((q['cue'].get('age', 0) for q in c['reads']), default=0)
        assert maximum <= .4, (case, maximum)
        ages.append({'id': case, 'maximumAcquiredImageAge': maximum})
        rows.append({'id': case, 'baselineSource': b['source'], 'measuredSource': c['source'],
                     'inputsAndStartingBodiesMatch': True, 'cachedBaseline': case in ['G1-P027', 'G1-P192'],
                     'commonCoverageUntil': min(phase(b), phase(c)), 'baselineResult': b['result'], 'candidateResult': c['result'],
                     'baselineCensored': b['censored'], 'candidateCensored': c['censored'],
                     'baselineEvents': b['events'], 'candidateEvents': c['events']})
    leverage = []
    selections = [('G1-P012', 17, 8, 2.35), ('G1-P012', 18, 9, 2.35),
                  ('G1-P027', 17, 9, 2.95), ('G1-P027', 18, 8, 2.95),
                  ('G1-P187', 18, 8, 2.95), ('G1-P187', 20, 10, 2.95), ('G1-P187', 21, 9, 2.95)]
    f = pairs[fresh[0]][0]
    for i in [17, 18, 20, 21]:
        selections.append((fresh[0], i, at(f, 2.95)['jobs'][i]['target'], 2.95))
    for case, i, j, t in selections:
        b, c = pairs[case]
        assert t < min(phase(b), phase(c)), (case, t)
        name = lambda n: b['agents'][n]['slot'] + '/' + b['agents'][n]['id']
        def first_open(d):
            return next((q['t'] for q in d['ticks'] if q.get('jobs') and (q['jobs'][i].get('man') or {}).get('hipsOpen')), None)
        def first_trail(d):
            return next((q['t'] for q in d['ticks'] if q['t'] < phase(d)
                         and q['before'][i]['pos']['x'] < q['before'][j]['pos']['x']), None)
        divergence = next((q['t'] for q, z in zip(b['ticks'], c['ticks'])
                           if q.get('request') and z.get('request') and q['request'][i] != z['request'][i]), None)
        leverage.append({'id': case, 'defender': name(i), 'receiver': name(j), 'i': i, 'j': j,
                         'baseline': geometry(b, i, j, t), 'candidate': geometry(c, i, j, t),
                         'firstChangedRequest': divergence, 'baselineFirstHipOpen': first_open(b), 'candidateFirstHipOpen': first_open(c),
                         'baselineFirstTrail': first_trail(b), 'candidateFirstTrail': first_trail(c)})
    old = load('G1-P185-extended', 'candidate')
    new = pairs['G1-P185'][1]
    assert all(q['before'][9] == z['before'][9] for q, z in zip(old['ticks'], new['ticks']) if q['t'] <= 2.85)
    def grip(d):
        e = next(e for e in d['events'] if e['type'] == 'carrier_contact')
        j, i = e['a'], e['b']
        return {'contact': e, 'geometry': geometry(d, i, j, e['t'], True),
                'breaks': [e for e in d['events'] if e['type'] == 'broken_tackle'],
                'tackles': [e for e in d['events'] if e['type'] == 'tackle']}
    hitch = {'rejectedCoastingForecast': old['result'], 'plantAware': new['result'],
             'sameCatcherBodyThroughCatch': True,
             'firstChangedDefenderRequest': next(q['t'] for q, z in zip(old['ticks'], new['ticks']) if q['request'][17] != z['request'][17]),
             'oldEntry': grip(old), 'newEntry': grip(new),
             'qualification': 'Same throw/catch path; later offensive choices and tackle execution are not held equal. No grip-force defect is inferred.'}
    cb, cc = pairs['G1-P192']
    comeback = {'baseline': geometry(cb, 21, 9, 2.95), 'candidate': geometry(cc, 21, 9, 2.95),
                'qualification': 'Compared before both releases; actual throw is to X, not this carried Z. Later prefix remains live.'}
    records = []
    for arm in sorted(p.name for p in HOSTS.iterdir() if p.is_dir()):
        for p in sorted((HOSTS / arm / 'out/catch-opportunity-physics').glob('*.json.gz')):
            d = json.loads(gzip.decompress(p.read_bytes()))
            records.append({'file': str(p.relative_to(ROOT)), 'id': d['id'], 'source': d['source'], 'arm': d['arm'],
                            'seconds': d['seconds'], 'horizon': d['horizon'], 'censored': d['censored'],
                            'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})
    receipts = {p.name: json.loads(p.read_text()) for p in sorted(OUT.glob('*receipt.json'))}
    final = source_hash()
    assert final == receipts['final-information-contracts-receipt.json']['sourceSha256'], 'Source ordering must match the Node launcher'
    age_patch = subprocess.check_output(['git', 'diff', 'a505716', 'HEAD', '--', 'src'], cwd=ROOT, text=True)
    changed = subprocess.check_output(['git', 'diff', '--name-only', 'a505716', 'HEAD', '--', 'src'], cwd=ROOT, text=True).splitlines()
    assert changed == ['src/sim/coverage-leverage.ts'], changed
    summary = {'accepted': '0000e560e0dbe31905151465152d412ba838803d',
               'queue': 'aa9ed35272cc334ce0a7c79eec709970e5c628fc',
               'measuredCode': 'a5057166f23f9f4df1334d8f3560f8b7838319fd',
               'finalCode': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
               'finalSource': final, 'measuredSource': pairs[cases[0]][1]['source'],
               'ageGuardEvidenceReuse': {'proof': 'Only expiry handling differs; its cue.age>.4 predicate is false for every recorded RouteObservation read, a superset of planner inputs.',
                                        'cases': ages, 'patch': age_patch},
               'cases': rows, 'leverage': leverage, 'comeback': comeback, 'hitch': hitch,
               'diagnosticExecutions': records, 'diagnosticCount': len(records) + 4,
               'diagnosticCaseSeconds': sum(q['seconds'] for q in records),
               'fourAdditionalContractPrefixes': {'receipt': 'contract-diagnosis-receipt.json', 'cases': 4},
               'commandSecondsIncludingRejectedAndFocusedChecks': sum(c['elapsedSeconds'] for r in receipts.values() for c in r['commands']),
               'receipts': receipts,
               'limitations': ['P105 original pre-stem constructor inputs missing; no approximate reproduction.',
                               'Four vertical witnesses remain explicitly censored, including nullified P012.',
                               'Fresh Smash endings differ before a comparable catch; completion/tackle comparison is inconclusive.',
                               'Tackle random execution is not matched across changed trajectories. Physics/capacities unchanged.']}
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({'pairedCases': len(rows), 'leveragePairs': len(leverage), 'diagnosticExecutionsIncludingContractProbes': summary['diagnosticCount'],
                      'timedCaseSeconds': summary['diagnosticCaseSeconds'], 'commandSeconds': summary['commandSecondsIncludingRejectedAndFocusedChecks'],
                      'finalSource': final, 'ageGuardEvidenceReuse': True}, indent=2))
    try:
        os.environ['MPLCONFIGDIR'] = '/tmp/vertical-roof-mpl'
        os.environ['XDG_CACHE_HOME'] = '/tmp/vertical-roof-cache'
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(2, 2, figsize=(11, 7), constrained_layout=True)
        for ax, case, players in [(axes[0, 0], 'G1-P012', [(17, 8), (18, 9)]),
                                  (axes[0, 1], 'G1-P027', [(17, 9), (18, 8)]),
                                  (axes[1, 0], fresh[0], [(17, 9), (18, 8)])]:
            b, c = pairs[case]
            end = min(phase(b), phase(c), 3)
            for color, (i, j) in zip(['#176ca4', '#c35b18'], players):
                for d, style, label in [(b, '--', 'accepted'), (c, '-', 'candidate')]:
                    qs = [q for q in d['ticks'] if q['t'] < end]
                    ax.plot([q['t'] for q in qs], [q['before'][i]['pos']['x'] - q['before'][j]['pos']['x'] for q in qs],
                            linestyle=style, color=color, label=b['agents'][i]['slot'] + ' ' + label)
            ax.axhline(0, color='black', linewidth=.7)
            ax.set_title(case + ': outside #1 leverage')
            ax.set_xlabel('Seconds after snap'); ax.set_ylabel('Defender ahead of receiver (yd)'); ax.legend(fontsize=7)
        ax = axes[1, 1]
        for d, color, label in [(old, '#b34747', 'rejected coasting forecast'), (new, '#248157', 'plant-aware forecast')]:
            qs = [q for q in d['ticks'] if 1.4 <= q['t'] <= 2.5]
            ax.plot([q['t'] for q in qs], [q['before'][17]['vel']['x'] for q in qs], color=color, label=label)
        ax.axvline(1.7, color='black', linewidth=.7, linestyle=':', label='first changed request')
        ax.set_title('P185: achieved corner braking, same throw/catch')
        ax.set_xlabel('Seconds after snap'); ax.set_ylabel('Achieved upfield velocity (yd/s)'); ax.legend(fontsize=7)
        fig.suptitle('Protect verticals with achievable motion; answer an acquired plant\nAccepted 0000e56 versus measured a505716; final age guard is inactive on these inputs', fontsize=11)
        fig.savefig(OUT / 'vertical-leverage.svg'); fig.savefig(OUT / 'vertical-leverage.png', dpi=145)
        plt.close(fig)
    except ImportError:
        print('Plot package absent; numeric evidence retained')


if __name__ == '__main__':
    main()
