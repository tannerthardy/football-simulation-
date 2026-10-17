#!/usr/bin/env python3
"""Inspect existing all-22 blocking tapes. This script runs zero engine ticks."""
import argparse
import csv
import gzip
import hashlib
import html
import json
import math
import os
import time
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/run-block-picture-mpl')
os.environ.setdefault('XDG_CACHE_HOME', '/tmp/run-block-picture-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle


def load(path):
    data = path.read_bytes()
    return json.loads(gzip.decompress(data) if path.suffix == '.gz' else data)


def pair_force(rep):
    h = rep.get('hands') or {}
    return math.hypot(h.get('normal', h.get('normalForce', 0)),
                      h.get('tangent', h.get('tangentForce', 0)))


def native(row):
    initial = row['initial']
    frames = []
    for f in row['frames']:
        frames.append({'t': f['t'], 'pos': [[b['pos']['x'], b['pos']['y']] for b in f['before']],
                       'vel': [[b['vel']['x'], b['vel']['y']] for b in f['before']],
                       'face': [b['facing'] for b in f['before']],
                       'pose': [(b.get('support') or {}).get('state', 'up') for b in f['before']],
                       'request': [[c['vel']['x'], c['vel']['y']] for c in f['final']],
                       'raw': [[c['vel']['x'], c['vel']['y']] for c in f['raw']],
                       'plans': f['plans'], 'carrier': f['ball']['carrier'],
                       'loads': [{'b': e['b'], 'd': e['d'], 'helpers': e['helpers'],
                                  'force': pair_force(e)} for e in f['beforeReps']],
                       'impacts': f['report']['contacts']})
    return {'id': row['id'], 'label': row['id'], 'source': row['source'],
            'qualification': 'Exact frozen #140 prototype-source replay; Counter is an accepted call. Tick-start bodies; commands execute over next .05s.',
            'inputSha256': row['inputSha256'], 'los': 40, 'ballY': 26.67,
            'slots': [a['slot'] for a in initial],
            'identity': [{'index': a['idx'], 'slot': a['slot'], 'profile': a['body']['profile']} for a in initial],
            'radius': [a['body']['profile']['radius'] for a in initial],
            'initialPlans': [a['plan'] for a in initial], 'frames': frames,
            'events': row['events'], 'outcome': row['outcome'], 'gain': row['gain'],
            'censor': row['censor'], 'endTime': row['endTime']}


def historical(path):
    play = load(path)
    rep = play['replay']
    telemetry = {round(t['t'], 5): t for t in rep['telemetry']['frames']}
    frames = []
    for f in rep['frames']:
        if f['t'] < 0:
            continue
        t = telemetry.get(round(f['t'], 5))
        if not t:
            continue
        actors = t['agents']
        plans = []
        for a in actors:
            p = a.get('runBlock')
            plans.append({**p, 'pullRole': p.get('pullRole'), 'pullPath': None} if p else None)
        frames.append({'t': f['t'], 'pos': [f['agents'][i:i+2] for i in range(0, len(f['agents']), 3)],
                       'face': f['agents'][2::3], 'vel': [a['body']['velocity'] for a in actors],
                       'pose': [a['body']['state'] for a in actors],
                       'request': [a.get('intent', {}).get('velocity', [0, 0]) for a in actors],
                       'raw': None, 'plans': plans, 'carrier': f.get('carrier'),
                       'loads': [{'b': b['a'], 'd': b['b'], 'helpers': b.get('helpers', []),
                                  'force': pair_force(b)} for b in t.get('blocks', [])],
                       'impacts': [{'i': c['a'], 'j': c['b'], **c} for c in t.get('contacts', [])]})
    assert frames and all(len(f['pos']) == 22 for f in frames)
    slots = [p['slot'] for p in rep['players']]
    return {'id': path.stem, 'label': path.stem + ' ' + play['call'],
            'source': '9513511efacc10721f8ed2cc8553ef96d7b95a5b51217b8f4c6339533b504941',
            'qualification': 'Historical 70b4db6 saved film: .10s/.10yd bodies, mostly .01 telemetry; final requests, not all producing stages. Canonical offense +x, do not reapply camera flip.',
            'fileSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'los': rep['los'], 'ballY': frames[0]['pos'][3][1], 'slots': slots,
            'identity': rep['players'], 'radius': [.36 if s in ['LT', 'RT', 'C', 'LG', 'RG'] else .28 for s in slots],
            'initialPlans': frames[0]['plans'], 'frames': frames, 'events': rep['events'],
            'outcome': play['outcome'], 'gain': play['yards'], 'censor': 'native ending',
            'endTime': play['duration'], 'call': play['plan'], 'decisions': rep['telemetry']['decisions'],
            'perception': [{'t': t['t'], 'pictures': t.get('perception', [])} for t in rep['telemetry']['frames']]}


def closest(case, t):
    return min(case['frames'], key=lambda f: abs(f['t']-t))


def distance(f, i, j):
    return math.dist(f['pos'][i], f['pos'][j])


def opening_movement(tapes):
    records=[]
    for path in tapes:
        for case in load(path)['rows']:
            for actor in case['initial']:
                if not actor['plan'] or actor['plan']['kind']!='pull':
                    continue
                i=actor['idx'];fs=[f for f in case['frames'] if f['t']<=1.5]
                turns=sum(abs(math.atan2(math.sin(y['before'][i]['facing']-x['before'][i]['facing']),
                                         math.cos(y['before'][i]['facing']-x['before'][i]['facing'])))
                          for x,y in zip(fs,fs[1:]) if y['t']<=1)
                records.append({'case':case['id'],'index':i,'slot':actor['slot'],
                    'role':actor['plan']['pullRole'],'target':actor['plan']['target'],'source':case['source'],
                    'backfieldFacingSampleTimes':[f['t'] for f in fs if math.cos(f['before'][i]['facing'])<-.7],
                    'firstLateralSpeedAbovePointOne':next((f['t'] for f in fs if abs(f['before'][i]['vel']['y'])>.1),None),
                    'headingTravelDegreesThroughOneSecond':math.degrees(turns),
                    'samples':[{'t':f['t'],'facingDegrees':math.degrees(math.atan2(math.sin(f['before'][i]['facing']),math.cos(f['before'][i]['facing']))),
                                'position':f['before'][i]['pos'],'velocity':f['before'][i]['vel'],
                                'raw':f['raw'][i],'final':f['final'][i]} for f in fs]})
    return {'qualification':'Body facing is not gaze or literal foot placement. cos(facing)<-.7 is a descriptive orientation screen, never a tuning target. Heading travel sums wrapped per-step differences. No alternative motion executed.',
            'rows':records}


def ledger(case):
    frames = case['frames']
    start = frames[0]
    end = next((e['t'] for e in case['events'] if e['type'] == 'carrier_contact'), case['endTime'])
    before = [f for f in frames if f['t'] <= end]
    rows = []
    for i, p in enumerate(case['initialPlans'][:11]):
        if not p:
            continue
        target = p.get('target')
        transitions = []
        prev = object()
        for f in before:
            q = f['plans'][i]
            new = q.get('target') if q else None
            if new != prev:
                transitions.append({'t': f['t'], 'target': new,
                                    'slot': case['slots'][new] if new is not None else None})
                prev = new
        loads = []
        for f in before:
            for e in f['loads']:
                if (i == e['b'] or i in e['helpers']) and e['force'] > 1:
                    loads.append({'t': f['t'], 'target': e['d'], 'slot': case['slots'][e['d']],
                                  'pairForce': e['force'], 'helper': i != e['b']})
        impacts = [{'t': f['t'], 'other': c['j'] if c['i'] == i else c['i'],
                    'impulse': c['impulse']} for f in before for c in f['impacts']
                   if i in [c['i'], c['j']] and c['i'] < 11 and c['j'] < 11 and c['impulse'] > 0
                   and (case['id'].startswith('G') or f['t'] + .05 <= end + 1e-8)]
        samples = []
        for t in [.2, .5, 1, 1.5, 2, min(2.5, end), end]:
            f = closest(case, t)
            samples.append({'t': f['t'], 'position': f['pos'][i], 'velocity': f['vel'][i],
                            'request': f['request'][i], 'raw': f['raw'][i] if f['raw'] else None,
                            'pose': f['pose'][i], 'initialTargetDistance': distance(f, i, target) if target is not None else None,
                            'currentTarget': (f['plans'][i] or {}).get('target'),
                            'rbDistance': distance(f, i, 6)})
        rows.append({'index': i, 'slot': case['slots'][i], 'installed': p,
                     'targetSlot': case['slots'][target] if target is not None else None,
                     'firstLoadedPair': loads[0] if loads else None,
                     'loadedSamplesBeforeRunnerContact': len(loads), 'targetTransitions': transitions,
                     'teammateImpactsBeforeRunnerContact': impacts, 'samples': samples})
    threats = []
    for t in [.5, 1.5, min(2.5, end), end]:
        f = closest(case, t)
        threats.append({'t': f['t'], 'defenders': [
            {'index': j, 'slot': case['slots'][j], 'rbDistance': distance(f, j, 6),
             'currentNamedOwners': [case['slots'][i] for i,p in enumerate(f['plans'][:11]) if p and p.get('target') == j],
             'loadedBy': [case['slots'][e['b']] for e in f['loads'] if e['d'] == j and e['force'] > 1],
             'position': f['pos'][j], 'velocity': f['vel'][j]}
            for j in range(11,22)]})
    return {'id': case['id'], 'firstRunnerContactTime': end,
            'blockers': rows, 'allDefenderSnapshots': threats,
            'qualification': 'Named owners omit conditional future duties absent from a tape. Pair force does not establish individual helper load, hand placement, control or useful protection. Teammate impulses are interval reports.'}


def plate(case, out, core=False):
    contact = next((e['t'] for e in case['events'] if e['type'] == 'carrier_contact'), None)
    end = contact if contact is not None else min(case['endTime'], 3.5)
    times = [0, .35, .75, 1.5, min(2.5, end-.1), end]
    fig, axes = plt.subplots(2, 3, figsize=(18, 12), constrained_layout=True)
    for ax, time in zip(axes.flat, times):
        f = closest(case, time)
        lo, hi = ((case['ballY']-12,case['ballY']+12) if core else (0,53.33))
        low, high = (-8,13) if core else (-9,17)
        ax.set(xlim=(lo,hi), ylim=(low,high), aspect='equal',
               xlabel='Lateral field position (yd)', ylabel='Depth relative to LOS (yd)')
        ax.set_facecolor('#eef5ed')
        for x in range(-5, 20, 5): ax.axhline(x, color='#b8c9b5', linewidth=.6)
        ax.axhline(0,color='#52624e',linewidth=1.2)
        for i,p in enumerate(f['plans'][:11]):
            if p and p.get('target') is not None:
                j=p['target'];a,b=f['pos'][i],f['pos'][j]
                ax.plot([a[1],b[1]],[a[0]-case['los'],b[0]-case['los']],color='#8f99a0',alpha=.38,linestyle='--',linewidth=.7,zorder=1)
        for e in f['loads']:
            if e['force']<=1: continue
            a,b=f['pos'][e['b']],f['pos'][e['d']]
            ax.plot([a[1],b[1]],[a[0]-case['los'],b[0]-case['los']],color='#d5960d',linewidth=3,alpha=.9,zorder=3)
            for actor in [e['b'],e['d']]:
                x,y=f['pos'][actor]
                ax.add_patch(Circle((y,x-case['los']),case['radius'][actor]+.12,
                                   fill=False,edgecolor='#d5960d',linewidth=1.5,zorder=7))
        for i,(x,y) in enumerate(f['pos']):
            depth=x-case['los']
            if not(lo<=y<=hi and low<=depth<=high):continue
            color='#2066a5' if i<11 else '#c43b3b'
            trail=[q['pos'][i] for q in case['frames'] if f['t']-.5 <= q['t']<=f['t']]
            ax.plot([p[1] for p in trail],[p[0]-case['los'] for p in trail],color=color,alpha=.5,linewidth=1)
            ax.add_patch(Circle((y,depth),case['radius'][i],facecolor=color,edgecolor='white',linewidth=.5,zorder=5))
            face=f['face'][i]
            ax.plot([y,y+.6*math.sin(face)],[depth,depth+.6*math.cos(face)],color='black',linewidth=.8,zorder=6)
            vx,vy=f['vel'][i]
            ax.arrow(y,depth,vy*.18,vx*.18,width=.025,head_width=.18,color=color,zorder=4,length_includes_head=True)
            # Alternate labels within OL/box to keep close neighbors legible.
            offset=.65 if i%2 else -.95
            label=case['slots'][i]+('↓' if f['pose'][i]!='up' else '')
            ax.text(y,depth+offset,label,ha='center',va='center',fontsize=8,color=color,fontweight='bold',zorder=8,
                    bbox=dict(facecolor='white',edgecolor='none',alpha=.72,pad=.15))
        if f['carrier'] is not None:
            x,y=f['pos'][f['carrier']];ax.add_patch(Circle((y,x-case['los']),.56,fill=False,edgecolor='#d49b00',linewidth=2,zorder=9))
        last = (f"near contact event {contact:.2f}s" if case['id'].startswith('G')
                else 'first runner contact') if contact is not None else 'achieved bodies'
        ax.set_title(f"{f['t']:.2f}s • "+(last if time==end and contact is not None else 'achieved bodies'),fontsize=11)
    fig.suptitle(case['label']+'\nBlue O / red D; arrow = achieved velocity; short tick = body facing; dashed = job; gold = loaded pair\n'
                 +case['source'][:12]+' • '+('historical rounded film' if case['id'].startswith('G') else 'exact source restoration')
                 +' • body tracks, not modeled anatomical footsteps',fontsize=12)
    suffix='-box' if core else '-all22'
    fig.savefig(out/(case['id']+suffix+'.png'),dpi=130)
    plt.close(fig)


def review_cards(cases, ledgers, notes, out):
    cards=['# Blocker-by-blocker review', '',
           'First loaded pair is evidence of contact, not proof of useful protection. Helper membership does not measure that helper’s individual load. Historical times/positions are sampled/rounded.', '']
    page=['<!doctype html><meta charset="utf-8"><title>Run blocking: does the movement make sense?</title>',
          '<style>body{font:17px system-ui;max-width:1500px;margin:24px auto;padding:12px;background:#f5f6f3}img{max-width:100%}section{margin:36px 0}p{max-width:1000px}</style>',
          '<h1>Run blocking movement review</h1><p>18 selected witnesses, not a population sample. '
          'Box and full-field six-frame plates preserve actual recorded bodies. Facing is not gaze. '
          'Gold rings/links identify loaded pairs; assignment links do not prove an unobstructed path. '
          'Historical contact panels use the nearest sampled frame and label the actual event time. '
          'The ledger retains every blocker and all eleven defenders. No behavior change is tested.</p>']
    for case,ledger in zip(cases,ledgers):
        note=notes[case['id']]
        cards += ['## '+case['label'], '', note['judgment'], '',
                  '| Blocker | Installed job | First loaded pair | First .5s displacement (x,y yd) | Observation |',
                  '| --- | --- | --- | --- | --- |']
        for b in ledger['blockers']:
            i=b['index'];first=b['firstLoadedPair'];f=closest(case,.5);start=case['frames'][0]
            move=[f['pos'][i][j]-start['pos'][i][j] for j in [0,1]]
            job=b['installed']['kind']+' '+(b['installed'].get('pullRole') or '')+' → '+(b['targetSlot'] or 'none')
            load=f"{first['t']:.2f}s → {first['slot']}"+(' (helper membership)' if first['helper'] else '') if first else 'none in window'
            observation=note.get('blockers',{}).get(b['slot'],'See case judgment and full recorded ledger; no isolated correction inferred.')
            cards.append(f"| {b['slot']} | {job} | {load} | {move[0]:+.2f}, {move[1]:+.2f} | {observation} |")
        cards += ['', 'All eleven defenders, current named owners, pair loads and runner distances are in `all-threats.csv` at .5s, 1.5s, 2.5s/near contact and contact. Conditional future work absent from the tape is not declared unowned.', '']
        title=html.escape(case['label']);judgment=html.escape(note['judgment']);ident=case['id']
        page += [f'<section id="{ident}"><h2>{title}</h2><p>{judgment}</p><p><code>{case["source"]}</code></p>',
                 f'<a href="{ident}-box.png"><img loading="lazy" src="{ident}-box.png" alt="{title}: six box snapshots"></a>',
                 f'<details><summary>Full field: every player</summary><a href="{ident}-all22.png"><img loading="lazy" src="{ident}-all22.png" alt="All 22 players"></a></details></section>']
    (out/'blocker-review.md').write_text('\n'.join(cards)+'\n')
    (out/'index.html').write_text('\n'.join(page)+'\n')
    with (out/'all-threats.csv').open('w') as f:
        w=csv.writer(f);w.writerow(['case','time','index','slot','runnerDistanceYd','currentNamedOwners','loadedPairPrimaryBlockers','x','y','vx','vy'])
        for d in ledgers:
            for phase in d['allDefenderSnapshots']:
                for a in phase['defenders']:
                    w.writerow([d['id'],phase['t'],a['index'],a['slot'],a['rbDistance'],','.join(a['currentNamedOwners']),','.join(a['loadedBy']),*a['position'],*a['velocity']])


def main():
    started = time.monotonic()
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--tape',type=Path,action='append',default=[])
    p.add_argument('--historical',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--plates', default='', help='Comma-separated case IDs; default all. Does not filter the data ledger.')
    p.add_argument('--inputs', type=Path, help='Original frozen #140 fixture, for player IDs and installed calls.')
    p.add_argument('--no-plates', action='store_true', help='Reduce/check saved data without rendering again.')
    p.add_argument('--notes',type=Path,help='Auditor judgments; these are interpretation, not automated grades.')
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    cases=[native(row) for path in args.tape for row in load(path)['rows']]
    if cases:
        assert args.inputs, 'Supply the original frozen fixture to retain actual player identity.'
        inputs = {r['id']: r for r in load(args.inputs)['rows']}
        for case in cases:
            row = inputs[case['id']]
            assert case['inputSha256'] == row['inputSha256']
            front = row['setup']['defCall']['front']
            case['label'] += ' ' + row['call'] + ' / ' + (front.get('name', front.get('id', 'front')) if isinstance(front,dict) else front)
            case['call'] = row['setup']['offCall']
            for i, actor in enumerate(case['identity']):
                player = row['setup']['offense' if i < 11 else 'defense'][actor['slot']]
                actor.update({'id': player['id'], 'name': player['firstName']+' '+player['lastName'], 'jersey': player['jersey']})
    cases += [historical(path) for path in sorted(args.historical.glob('*.json'))]
    assert len({c['id'] for c in cases})==len(cases)
    ledgers=[ledger(c) for c in cases]
    (args.out/'puller-opening-movement.json').write_text(json.dumps(opening_movement(args.tape),indent=2)+'\n')
    (args.out/'pictures.json.gz').write_bytes(gzip.compress(json.dumps(cases,separators=(',',':')).encode(),mtime=0))
    (args.out/'ledgers.json').write_text(json.dumps(ledgers,indent=2)+'\n')
    if args.notes:
        notes=load(args.notes)
        assert set(notes)=={c['id'] for c in cases}
        review_cards(cases,ledgers,notes,args.out)
    selected = set() if args.no_plates else (set(args.plates.split(',')) if args.plates else {c['id'] for c in cases})
    assert selected <= {c['id'] for c in cases}, 'Unknown plate case'
    for case in cases:
        if case['id'] not in selected:
            continue
        plate(case,args.out)
        plate(case,args.out,True)
    print(json.dumps({'cases':len(cases),'blockerLedgers':sum(len(d['blockers']) for d in ledgers),
                      'allDefenderPhaseRows':sum(len(f['defenders']) for d in ledgers for f in d['allDefenderSnapshots']),
                      'engineTicks':0,'platesRenderedThisCommand':2*len(selected),
                      'elapsedSeconds':time.monotonic()-started}))


if __name__=='__main__': main()
