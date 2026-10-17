#!/usr/bin/env python3
"""This 24-play saved-data review only. Reads cached archives; never runs a sim."""
import argparse, hashlib, json, math, subprocess, tarfile, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'data/reviews/current/random-saved-play-selection.json'

def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')

def extract(dest):
    manifest = json.loads(MANIFEST.read_text())
    wanted = {r['id']: r for r in manifest['selected']}
    receipt = {'manifestSha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(), 'cases': {}, 'newSimulations': 0}
    started = time.monotonic()
    for gi, name in enumerate(['zone-reference', 'spread-air', 'power-zone', 'west-spread'], 1):
        archive = f'accepted-games-G{gi}-{name}.tar.gz'
        proc = subprocess.Popen(['git', 'show', f'{manifest["originalEvidence"]}:{archive}'], cwd=ROOT, stdout=subprocess.PIPE)
        rows, obs = {}, []
        with tarfile.open(fileobj=proc.stdout, mode='r|gz') as tar:
            for member in tar:
                if member.name.endswith('/plays.jsonl'):
                    for line in tar.extractfile(member):
                        play = json.loads(line)
                        key = f'G{gi}-P{play["index"] + 1:03d}'
                        if key in wanted:
                            digest = hashlib.sha256(line).hexdigest()
                            assert digest == wanted[key]['nativeSha256'], key
                            rows[key] = play
                elif member.name.endswith('/observations.jsonl'):
                    obs = [json.loads(line) for line in tar.extractfile(member)]
        assert proc.wait() == 0
        for key, play in rows.items():
            observation = obs[wanted[key]['observationIndex']]
            actors = observation['initialPlayers']
            assert [a['idx'] for a in actors] == list(range(22)), key
            assert len({a['id'] for a in actors}) == 22, key
            assert [a['slot'] for a in actors] == [a['slot'] for a in play['replay']['players']], key
            assert [a['team'] for a in actors] == [a['team'] for a in play['replay']['players']], key
            frames = play['replay']['frames']
            telemetry = play['replay']['telemetry']['frames']
            assert len(frames) == len(telemetry), key
            assert all(abs(a['t']-b['t']) < 1e-8 for a,b in zip(frames,telemetry)), key
            value = {'id': key, 'observation': observation, 'play': play}
            path = dest / (key + '.json')
            dump(path, value)
            receipt['cases'][key] = {'nativeSha256': wanted[key]['nativeSha256'], 'extractedSha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'frames': len(frames), 'observationIndex': wanted[key]['observationIndex'], 'actorJoin': '22 unique IDs / index / slot / team match', 'frameJoin': 'one-to-one exact time'}
    assert set(receipt['cases']) == set(wanted)
    receipt['elapsedSeconds'] = time.monotonic() - started
    dump(dest / 'extraction-receipt.json', receipt)
    print(json.dumps({'cases':len(wanted), 'frames':sum(c['frames'] for c in receipt['cases'].values()), 'elapsedSeconds':receipt['elapsedSeconds']}))

def measure(dest):
    manifest = json.loads(MANIFEST.read_text())
    receipt = json.loads((dest / 'extraction-receipt.json').read_text())
    assert receipt['manifestSha256'] == hashlib.sha256(MANIFEST.read_bytes()).hexdigest()
    cases = []
    for selection in sorted(manifest['selected'], key=lambda r: r['id']):
        case_path = dest / (selection['id'] + '.json')
        assert hashlib.sha256(case_path.read_bytes()).hexdigest() == receipt['cases'][selection['id']]['extractedSha256']
        q = json.loads(case_path.read_text())
        p, observation = q['play'], q['observation']
        r, actors = p['replay'], observation['initialPlayers']
        frames, telemetry = r['frames'], r['telemetry']['frames']
        by_id = {a['id']: a['idx'] for a in actors}
        receiver = by_id.get(p['stats'].get('receiver') or p['stats'].get('target') or p['stats'].get('rusher'), 0)
        def distance(f, a, b):
            return math.dist(f['agents'][3*a:3*a+2], f['agents'][3*b:3*b+2])
        def actor_at(k, i):
            a, f, t = actors[i], frames[k], telemetry[k]['agents'][i]
            return {'idx': i, 'id': a['id'], 'slot': a['slot'], 'team': a['team'],
                    'position': f['agents'][3*i:3*i+2], 'kind': t['kind'], 'job': t.get('job'),
                    'target': t.get('target'), 'runFit': t.get('runFit'),
                    'intent': t.get('intent'), 'body': t.get('body'),
                    'consumedCues': [c for c in telemetry[k].get('perception', []) if c['a'] == i and c['b'] in {receiver,0}]}
        events = [dict(e, nativeEventIndex=j) for j,e in enumerate(r['events']) if e['type'] != 'read']
        critical = [e for e in events if e['type'] in {'handoff','throw','catch','carrier_contact','broken_tackle','tackle','slide','touchdown','pbu','deflection','out_of_bounds'}]
        snapshots = []
        for e in critical:
            ks = sorted(set([max((k for k,f in enumerate(frames) if f['t'] <= e['t'] + 1e-8), default=0),
                             min((k for k,f in enumerate(frames) if f['t'] >= e['t'] - 1e-8), default=len(frames)-1)]))
            for k in ks:
                f = frames[k]
                defenders = sorted(range(11,22),key=lambda i:distance(f,i,receiver))[:3]
                snapshots.append({'eventIndex':e['nativeEventIndex'], 'event':e['type'], 'eventTime':e['t'],
                                  'frameTime':f['t'], 'frameMinusEvent':round(f['t']-e['t'],3), 'carrier':f['carrier'],
                                  'ball':f['ball'], 'targetOrRunner':actor_at(k,receiver),
                                  'nearestThreeAtThisFrame':[dict(actor_at(k,i), separation=round(distance(f,i,receiver),6)) for i in defenders]})
        blocks = []
        for i,a in enumerate(actors[:11]):
            pairs = {}
            for t in telemetry:
                for link in t['links']:
                    if link['kind'] == 'block' and link['a'] == i:
                        pairs.setdefault(link['b'], []).append(t['t'])
            for j,times in pairs.items():
                blocks.append({'blocker':a['id'],'slot':a['slot'],'defender':actors[j]['id'],'defenderSlot':actors[j]['slot'],
                               'firstSample':min(times),'lastSample':max(times),'sampleCount':len(times),
                               'meaning':'sampled engagement membership including helper; first-to-last is not continuous contact duration'})
        catch = next((e for e in events if e['type']=='catch'), None)
        post_catch = []
        catch_switch = None
        if catch:
            k = next(k for k,f in enumerate(frames) if f['t'] > catch['t'] + 1e-8)
            catch_switch = {'catchTime':catch['t'], 'firstLaterSample':frames[k]['t'], 'defenders':[actor_at(k,i) for i in range(11,22)]}
            ks = [k for k,f in enumerate(frames) if f['t'] >= catch['t']-1e-8]
            for i in range(11,22):
                k = min(ks,key=lambda k:distance(frames[k],i,receiver))
                post_catch.append({'idx':i,'id':actors[i]['id'],'slot':actors[i]['slot'],'firstEligibleSample':frames[ks[0]]['t'],
                                   'minSampledSeparation':round(distance(frames[k],i,receiver),6),'at':frames[k]['t']})
        intervals = [round(b['t']-a['t'],4) for a,b in zip(frames,frames[1:])]
        assert all(0 < dt <= .10001 for dt in intervals), selection['id']
        for f,t in zip(frames,telemetry):
            assert len(f['agents']) == 66 and len(t['agents']) == 22
            assert all(math.isfinite(x) for x in f['agents']+f['ball'])
            assert all(all(math.isfinite(x) for x in a['body']['velocity']) for a in t['agents'])
        cases.append({'id':q['id'],'nativeSha256':selection['nativeSha256'],'context':observation['gameState'],
                      'actors':actors,'call':p['call'],'defense':p['defense'],'resolvedPlan':p['plan'],
                      'calledKind':observation['call']['kind'],'ending':p['outcome'],'duration':p['duration'],'nativeYards':p['yards'],
                      'stats':p['stats'],'segments':p['segments'],'events':events,'frameCount':len(frames),
                      'frameTimeRange':[frames[0]['t'],frames[-1]['t']],'intervals':sorted(set(intervals)),
                      'teammateContacts':observation['teammateContacts'],'teammateImpulse':observation['teammateImpulse'],
                      'sampledBlocks':blocks,'snapshots':snapshots,'postCatchSameDefenderMinima':post_catch, 'firstPostCatchUpdate':catch_switch})
    summary = {'schema':'random-saved-play-measurements-v1','selection':str(MANIFEST.relative_to(ROOT)),
               'selectionSha256':hashlib.sha256(MANIFEST.read_bytes()).hexdigest(), 'newSimulations':0,
               'definitions':{'velocity':'stored full-telemetry body.velocity; never differentiated rounded positions',
                              'events':'native event time and original index, not assumed chronological array order',
                              'snapshots':'bracketing saved frames, with explicit time offset; no invented event-frame state',
                              'separation':'planar rounded positions; identity retained within postcatch minima, nearest-frame list may change identity',
                              'contact':'native body-impact/successful-grasp event versus sampled block/tackle membership; proximity alone is not contact',
                              'request':'recorded final intent only; rejected/missing earlier requests cannot be reconstructed',
                              'cue':'actual controller-consumed see() picture and age; neither gaze nor full attention/acquisition proof'},
               'cases':cases}
    dump(ROOT/'out/random-play-audit/measurements.json',summary)
    print(json.dumps({'measured':len(cases),'frames':sum(c['frameCount'] for c in cases),'newSimulations':0}))

def plot(dest):
    import os
    os.environ.setdefault('MPLCONFIGDIR', str(ROOT/'out/random-play-audit/mpl-cache'))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    D, out = dest, ROOT/'out/random-play-audit'
    out.mkdir(parents=True, exist_ok=True)
    s = json.loads(MANIFEST.read_text())
    for gi in range(1,5):
     fig,axes=plt.subplots(6,3,figsize=(19,22),layout='constrained')
     for row,key in enumerate(sorted(x['id'] for x in s['selected'] if x['id'].startswith(f'G{gi}-'))):
      q=json.load(open(D/(key+'.json')));p=q['play'];r=p['replay'];fs=r['frames'];ts=r['telemetry']['frames'];ev=r['events'];actors=q['observation']['initialPlayers'];pos=np.array([f['agents'] for f in fs]).reshape(-1,22,3);times=np.array([f['t'] for f in fs]);last=times[-1]
      release=next((e['t'] for e in ev if e['type'] in ['throw','handoff']),min(2,last));mid=next((e['t'] for e in ev if e['type'] in ['catch','carrier_contact'] and e['t']>=release),min(last,release+1))
      breaks=[0,release,mid,last];receiver=next((a['idx'] for a in actors if a['id']==(p['stats'].get('receiver') or p['stats'].get('rusher') or p['stats'].get('target'))),0)
      for col in range(3):
       ax=axes[row,col];a,b=breaks[col:col+2];ks=np.where((times>=a-.051)&(times<=b+.051))[0];k=ks[-1]
       for i in range(22):
        color='#1976bd' if i<11 else '#c43b3b';alpha=.35 if i<7 else .6
        ax.plot(pos[ks,i,0],pos[ks,i,1],color=color,lw=.7,alpha=alpha)
        ax.scatter(pos[k,i,0],pos[k,i,1],s=18,color=color)
        ax.text(pos[k,i,0]+.15,pos[k,i,1]+.35,actors[i]['slot'],fontsize=6,color=color)
       ax.plot(pos[ks,receiver,0],pos[ks,receiver,1],color='black',lw=2)
       ball=np.array([fs[j]['ball'][:2] for j in ks]);ax.plot(ball[:,0],ball[:,1],color='#c89300',lw=1.5,ls='--')
       for link in ts[k].get('links',[]):
        if link['kind'] in ['block','tackle']:
         i,j=link['a'],link['b'];ax.plot(pos[k,[i,j],0],pos[k,[i,j],1],color='#7146a0',lw=2)
       ax.axvline(r['los'],color='gray',ls=':');ax.axvline(110,color='gold',ls=':');ax.axhline(0,color='gray');ax.axhline(53.3333,color='gray')
       lo=max(0,np.min(pos[ks,:,0])-2);hi=min(120,np.max(pos[ks,:,0])+2);ax.set(xlim=(lo,hi),ylim=(-2,55),title=f'{key} frames {times[ks[0]]:.2f}–{times[k]:.2f}s | {p["plan"]["concept"]} {p["yards"]:+.2f}');ax.grid(alpha=.15);ax.tick_params(labelsize=7)
     fig.suptitle(f'Random sample G{gi}: blue offense/red defense; black target/runner; gold ball; purple contact link\nHistorical runtime70b4db6. Snapshots and saved paths, not a causal counterfactual.',fontsize=12)
     fig.savefig(out/f'G{gi}-review.png',dpi=125);plt.close(fig)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-root', type=Path, required=True)
    parser.add_argument('--plots', action='store_true', help='Optional saved-phase path sheets; needs matplotlib/numpy, never a simulation.')
    parser.add_argument('--measure', action='store_true', help='Measure only the 24 extracted saved plays.')
    parser.add_argument('--extract', action='store_true', help='Read the four existing cached Git archives once; no download or game launch command.')
    args = parser.parse_args()
    if args.extract:
        extract(args.data_root)
    if args.measure:
        measure(args.data_root)
    if args.plots:
        plot(args.data_root)
