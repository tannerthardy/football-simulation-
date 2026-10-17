#!/usr/bin/env python3
"""Reduce the bounded saved traces; no simulator import or new collection."""
import gzip
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'out/flex-three-probes'


def read(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix == '.gz' else path.read_text())


def load(case, arm):
    return read(OUT / f'hosts/{arm}/out/catch-opportunity-physics/{case}-{arm}.json.gz')


def gap(a, b):
    return math.hypot(a['x'] - b['x'], a['y'] - b['y'])


def at(d, t):
    return next(q for q in d['ticks'] if q['t'] == t)


def simultaneous(b0, b1, p0, p1, reach, top):
    # Independent analytic reduction of the recorded common interval; validate
    # against #131's saved operator results, not an alternative production law.
    lo, hi = 0., 1.
    dz = p1['z'] - p0['z']
    if dz:
        a, b = (.1 - p0['z']) / dz, (top - p0['z']) / dz
        lo, hi = max(lo, min(a, b)), min(hi, max(a, b))
    elif not .1 <= p0['z'] <= top:
        return None
    if lo > hi:
        return None
    rx, ry = p0['x'] - b0['x'], p0['y'] - b0['y']
    dx = p1['x'] - p0['x'] - b1['x'] + b0['x']
    dy = p1['y'] - p0['y'] - b1['y'] + b0['y']
    d2 = dx * dx + dy * dy
    s = max(lo, min(hi, -(rx * dx + ry * dy) / d2)) if d2 else lo
    dh = math.hypot(rx + dx * s, ry + dy * s)
    return {'s': s, 'dh': dh, 'z': p0['z'] + dz * s, 'admitted': dh <= reach}


def main():
    summary = {'scope': 'three probes; no production changes; all movement bodies are native, not rounded reconstructions',
               'pool': [], 'roof': [], 'catch': {}, 'nativeRuns': []}
    for arm, cases in [('base', ['018', '056', '117', '027', '192']),
                       ('pool', ['018', '056', '117']), ('roof', ['027', '192']),
                       ('trace', ['020', '009', '080'])]:
        for case in cases:
            d = load('G1-P' + case, arm)
            if d['parity']:
                assert all(v is None or v is True for v in d['parity'].values()), (arm, case, d['parity'])
            summary['nativeRuns'].append({k: d[k] for k in ['id', 'source', 'seconds', 'horizon', 'censored', 'parity', 'inputHash', 'nativeHash']}
                                         | {'arm': arm, 'preparation': d['preparation']})
    for case in ['018', '056', '117']:
        b, c = load('G1-P' + case, 'base'), load('G1-P' + case, 'pool')
        names = {a['i']: a['slot'] + '/' + a['id'] for a in b['agents']}
        ol = [a['i'] for a in b['agents'] if a['slot'] in ['LT', 'LG', 'C', 'RG', 'RT']]
        assert all(b['agents'][i]['plan'] == c['agents'][i]['plan'] for i in ol)
        row = {'id': b['id'], 'nonreceiverPlansPreserved': all(x['plan'] == y['plan'] for x, y in zip(b['agents'], c['agents'])
                                                               if x['team'] == 'O' and x['slot'] not in ['X', 'Y', 'Z', 'H']),
               'identicalTicks': b['ticks'] == c['ticks'], 'identicalEvents': b['events'] == c['events'], 'arms': {}}
        for arm, d in [('base', b), ('pool', c)]:
            contact = next((e['t'] for e in d['events'] if e['type'] == 'carrier_contact'), None)
            blocks = []
            for a in d['agents']:
                if a['slot'] not in ['X', 'Y', 'Z', 'H']:
                    continue
                i, j = a['i'], a['plan']['target']
                closest = min((gap(q['before'][i]['pos'], q['before'][j]['pos']), q['t']) for q in d['ticks'] if contact is None or q['t'] < contact)
                blocks.append({'blocker': names[i], 'target': names[j], 'initialDistance': gap(a['start']['pos'], d['agents'][j]['start']['pos']),
                               'closestBeforeCarrierContact': closest,
                               'engagementAdmissionDistance': a['start']['profile']['radius'] + d['agents'][j]['start']['profile']['radius'] + .3,
                               'loadedContacts': [e for e in d['events'] if e['type'] == 'block_contact' and e['a'] == i]})
            row['arms'][arm] = {'blocks': blocks, 'carrierContact': contact, 'completedResult': d['result'], 'censored': d['censored'],
                                'offenseBodyContacts': [q['t'] for q in d['ticks'] if any(p['i'] < 11 and p['j'] < 11 for p in q['report']['contacts'])]}
        row['firstDifferentRequest'] = next((q['t'] for q, z in zip(b['ticks'], c['ticks']) if q['request'] != z['request']), None)
        row['firstDifferentRBRequest'] = next((q['t'] for q, z in zip(b['ticks'], c['ticks']) if q['request'][6] != z['request'][6]), None)
        if case != '018':
            assert row['identicalTicks'] and row['identicalEvents']
        summary['pool'].append(row)
    for case, i, j in [('027', 17, 9), ('192', 21, 9)]:
        b, c = load('G1-P' + case, 'base'), load('G1-P' + case, 'roof')
        row = {'id': b['id'], 'defender': b['agents'][i]['id'], 'slot': b['agents'][i]['slot'], 'receiver': b['agents'][j]['id'], 'arms': {}}
        for arm, d in [('base', b), ('roof', c)]:
            man = [q for q in d['man'] if q['a'] == i]
            row['arms'][arm] = {'firstReleaseObserved': next((q['t'] for q in man if q['releaseObserved']), None),
                               'firstHipsOpen': next((q['t'] for q in man if q['hipsOpen']), None),
                               'firstTorsoUpfield': next((q['t'] for q in d['ticks'] if math.cos(q['before'][i]['facing']) > .5), None),
                               'firstTrailing': next((q['t'] for q in d['ticks'] if q['before'][i]['pos']['x'] < q['before'][j]['pos']['x']), None),
                               'samples': []}
            for t in ([.15, .45, .5, 1, 1.5, 2, 2.95] if case == '027' else [.2, .5, 2.7, 2.95, 3.15, 3.35]):
                q = at(d, t)
                a, r = q['before'][i], q['before'][j]
                row['arms'][arm]['samples'].append({'t': t, 'lead': a['pos']['x'] - r['pos']['x'], 'gap': gap(a['pos'], r['pos']),
                                                    'achievedVelocity': a['vel'], 'request': q['request'][i],
                                                    'man': next((m for m in man if m['t'] == t), None)})
        row['firstDifferentRequest'] = next(q['t'] for q, z in zip(b['ticks'], c['ticks']) if q['request'] != z['request'])
        summary['roof'].append(row)
    d, high = load('G1-P020', 'trace'), load('G1-P009', 'trace')
    physics = read(OUT / 'physics/out/catch-opportunity-physics/G1-P020-capture.json.gz')
    rebound = read(OUT / 'physics/out/catch-opportunity-physics/G2-P107-capture.json.gz')
    pbu = load('G1-P080', 'trace')
    assert physics['nativeHash'] == d['nativeHash']
    for q in physics['opportunities']:
        for a in q['actors']:
            calculated = simultaneous(a['body0'], a['body1'], q['ball0'], q['ball1'], a['reach'], a['top'])
            assert (calculated is not None and calculated['admitted']) == bool(a['candidate'])
            if a['candidate']:
                assert abs(calculated['dh'] - a['candidate']['dh']) < 1e-12
    shared = []
    for t in [3.7, 4.3, 4.55]:
        old = next(q for q in physics['opportunities'] if q['t'] == t)
        new = next(q for q in d['opportunities'] if q['t'] == t)
        assert old['draws'] == new['draws'] and old['chances'] == new['chances']
        assert old['ball0'] == new['ballBefore']['flight']['pos']
        shared.append({'tick': t, 'interval': [t, t + .05], 'geometry': old,
                       'windows': [q for q in d['windows'] if q['a'] == 7 and q['t'] == t],
                       'decision': [q for q in d['decisions'] if q['t'] == t],
                       'flightChange': [q for q in d['flights'] if q['t'] == t], 'execution': new})
    hd = high['decisions'][0]
    hq = next(q for q in high['opportunities'] if q['t'] == hd['t'])
    hb = at(high, hd['t'])
    pe = next(e for e in pbu['events'] if e['type'] == 'pbu')
    pq = next(q for q in pbu['opportunities'] if q['t'] == pe['t'])
    pt = at(pbu, pe['t'])
    pp = pbu['agents'][pe['a']]['start']['profile']
    pbu_geometry = simultaneous(pt['before'][pe['a']]['pos'], pt['achieved'][pe['a']]['pos'],
                                pq['ballBefore']['flight']['pos'], pq['ballAfter']['flight']['pos'], pp['reach'], pp['reactReach'])
    assert pbu_geometry and pbu_geometry['admitted']
    # No invented held-ball endpoint is admitted into the geometry report.
    summary['catch'] = {'sharedP020': shared, 'highControl': {'id': 'G1-P009', 'decision': hd, 'execution': hq,
                                                           'actualBodyEndpoints': [hb['before'][hd['a']], hb['achieved'][hd['a']]],
                                                           'note': 'Secured high catch; same-time alternative not recomputed from held-ball height.'},
                        'pbuControl': {'id': 'G1-P080', 'event': pe, 'execution': pq,
                                       'conservativeEnvelope': {'reach': pp['reach'], 'low': .1, 'top': pp['reactReach']},
                                       'simultaneous': pbu_geometry},
                        'reboundControlCorrection': {'id': 'G2-P107', 'status': rebound['status'],
                                                     'note': 'Cached receiver drop/rebound INT, not a genuine defensive PBU. No new simulation.',
                                                     'events': [e for q in rebound['opportunities'] for e in q['events']]},
                        'untouchedControl': {'id': 'G1-P064', 'mode': 'historical saved-data only',
                                             'reason': 'Pre-constructor stem inputs missing; exact native reconstruction held, not approximated.'}}
    summary['nativeSeconds'] = sum(x['seconds'] for x in summary['nativeRuns'])
    summary['runtimeSourceUnchanged'] = not __import__('subprocess').check_output(['git', 'diff', '--name-only', 'HEAD', '--', 'src', 'test', 'config'], cwd=ROOT)
    assert summary['runtimeSourceUnchanged']
    output = OUT / 'summary.json'
    output.write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({'nativeRuns': len(summary['nativeRuns']), 'seconds': summary['nativeSeconds'],
                      'summarySha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'checks': 'parity, controls, preserved ledgers, shared inputs/draws and same-time reductions pass'}))


if __name__ == '__main__':
    main()
