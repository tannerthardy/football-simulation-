"""Reduce saved stages only; execute zero native plays."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path('data/reviews/current/contact-approach-motion')
def load(arm, case):
    return json.loads(gzip.decompress((ROOT / arm / f'{case}.json.gz').read_bytes()))

rows = []
for case in ['A028', 'A018', 'A006']:
    accepted = load('accepted', case)
    row = {'caseId': case, 'until': accepted['stoppedAt'], 'arms': {}}
    for arm in ['accepted', 'all-body-trial', 'free-footwork']:
        data = load(arm, case)
        impacts = [{'t': tick['t'], **hit} for tick in data['ticks']
                   for hit in tick['contacts'] if hit['i'] < 11 and hit['j'] < 11 and hit['impulse'] > 1e-8]
        differences = [tick['t'] for tick, reference in zip(data['ticks'], accepted['ticks'])
                       if tick != reference]
        row['arms'][arm] = {
            'source': data['source'], 'inputSha256': data['inputSha256'],
            'firstStageDifference': differences[0] if differences else None,
            'allCapturedStagesEqual': data['ticks'] == accepted['ticks'],
            'eventsEqual': data['events'] == accepted['events'],
            'sampledPeerImpacts': impacts,
            'sumSampledPeerImpulse': sum(hit['impulse'] for hit in impacts),
            'runnerEndPosition': data['ticks'][-1]['after'][6]['pos'],
        }
    rows.append(row)

receipts=[]
for path in sorted((ROOT/'receipts').glob('*.json')):
    receipt=json.loads(path.read_text())
    receipts.append({'file':str(path.relative_to(ROOT)), 'commit':receipt['commit'],
                     'source':receipt['sourceSha256'], 'exitCode':receipt['exitCode'],
                     'seconds':sum(c['elapsedSeconds'] for c in receipt['commands'])})
summary={'cases':rows,'receipts':receipts,'totalLauncherSeconds':sum(r['seconds'] for r in receipts),
         'nativeContinuations':9,'nativeSimulatedSeconds':3*(2.8+3.95+3.95),
         'finalCandidate':'4a7eebdc70acf50b867a79dbc241019e4e6f8e46',
         'nativeReuse':'07796ed runtime 2a3e6e8; final adds only own isDown guard. '
           'These ordinary setups leave downUntil=-1; body up was already required. '
           'Only lab files assign downUntil. Focused parked control covers the distinct branch.'}
(ROOT/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'launcherSeconds':summary['totalLauncherSeconds'],'nativeContinuations':9}))

# A compact actual-motion diagram, without implying a whole-play benefit.
import os
os.environ.setdefault('MPLCONFIGDIR', '/tmp/contact-approach-matplotlib')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
fig,axes=plt.subplots(1,2,figsize=(10,5),sharex=True,sharey=True)
for ax,arm,title in zip(axes,['accepted','free-footwork'],['Accepted: sequential requests','Candidate: joint free footwork']):
    data=load(arm,'A028')
    ticks=[t for t in data['ticks'] if 1.25<=t['t']<=1.8]
    for idx,label,color in [(2,'RT','#2676b8'),(5,'RG','#dc8826'),(7,'Y','#379668')]:
        positions=[ticks[0]['before'][idx]['pos']]+[t['after'][idx]['pos'] for t in ticks]
        ax.plot([p['x'] for p in positions],[p['y'] for p in positions],color=color,label=label,lw=2)
        end=positions[-1]
        ax.add_patch(Circle((end['x'],end['y']),ticks[-1]['after'][idx]['profile']['radius']*.9,
                            color=color,alpha=.18))
        ax.text(end['x']+.02,end['y']+.03,label,color=color,fontsize=10)
    for tick in ticks:
        for hit in tick['contacts']:
            if hit['i']<11 and hit['j']<11 and hit['impulse']>1e-8:
                a=tick['after'][hit['i']]['pos'];b=tick['after'][hit['j']]['pos']
                ax.plot((a['x']+b['x'])/2,(a['y']+b['y'])/2,'x',color='#b83838',ms=6)
    ax.set_title(title);ax.set_aspect('equal');ax.grid(alpha=.15);ax.set_xlabel('Upfield x (yards)')
axes[0].set_ylabel('Lateral y (yards)')
fig.suptitle('A028 Power · achieved paths, 1.25–1.85 s\nSame bodies and physics; both teams react. Red × = recorded teammate impact.',fontsize=11)
fig.tight_layout();fig.savefig(ROOT/'a028-motion.png',dpi=150);plt.close(fig)

manifest={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()
          for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name!='artifacts.json'}
(ROOT/'artifacts.json').write_text(json.dumps(manifest,indent=2)+'\n')
