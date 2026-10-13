"""Plot achieved World states from the four P4 factorial cells."""
import gzip
import json
import math
import os
from pathlib import Path
os.environ.setdefault('MPLCONFIGDIR','/tmp/catch-transition-mpl')
os.environ.setdefault('XDG_CACHE_HOME','/tmp/catch-transition-cache')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root=Path('out/catch-transition/portable-matrix')
summary=json.loads((root/'summary.json').read_text())
colors={('baseline','baseline'):'#2166ac',('baseline','arrival'):'#92c5de',
        ('arrival','baseline'):'#b2182b',('arrival','arrival'):'#ef8a62'}
fig,axes=plt.subplots(2,2,figsize=(12,8),layout='constrained')
for c in summary['cases']:
    if c['drawSource']=='natural':
        continue
    with gzip.open(c['artifact']['path']) as f:
        d=json.load(f)
    geom,draw=c['geometry'],c['drawSource']
    color=colors[geom,draw]
    label=f"{geom} geometry / execution {d['acquisition']['appliedExecution']:.3f}"
    h=d['holds'][0]
    rows=[r for r in d['rows'] if r['world'] and h['firstLoaded']-1e-8<=r['t']+.05<=h['firstLoaded']+.450001]
    t=[r['t']+.05-h['firstLoaded'] for r in rows]
    bodies=[r['world']['after'][10] for r in rows]
    speed=[math.hypot(*b['vel'].values()) for b in bodies]
    xi=[math.hypot(*b['support']['xi'].values()) for b in bodies]
    force=[next((j.get('force',0) for j in r['world']['grasps'] if j['a']==20 and j['b']==10),0) for r in rows]
    for ax,v in [(axes[0,1],speed),(axes[1,0],xi),(axes[1,1],force)]:
        ax.plot(t,v,color=color,label=label,lw=2)
    if draw=='baseline':
        approach=[r['world']['before'][20] for r in d['rows'] if r['world'] and 2.8<=r['t']<=h['firstLoaded']-.05+1e-8]
        axes[0,0].plot([b['pos']['x'] for b in approach],[b['pos']['y'] for b in approach],color=color,lw=2,label=f'{geom} defender')
        b=approach[-1]
        axes[0,0].quiver(b['pos']['x'],b['pos']['y'],b['vel']['x'],b['vel']['y'],color=color,angles='xy',scale_units='xy',scale=3,width=.008)
        axes[0,0].scatter(b['pos']['x'],b['pos']['y'],color=color,s=35)
        g=h['entryGeometry']
        axes[0,0].text(.02,.05 if geom=='baseline' else .12,
            f"{geom}: {math.degrees(g['headingDifference']):.1f}°, closing {g['closing']:+.2f}",
            transform=axes[0,0].transAxes,fontsize=9,color=color)
    if geom=='baseline' and draw=='baseline':
        runners=[r['world']['before'][10] for r in d['rows'] if r['world'] and 2.8<=r['t']<=3.55]
        axes[0,0].plot([b['pos']['x'] for b in runners],[b['pos']['y'] for b in runners],color='#333333',ls='--',label='actual catcher')
        b=runners[-1]
        axes[0,0].quiver(b['pos']['x'],b['pos']['y'],b['vel']['x'],b['vel']['y'],color='#333333',angles='xy',scale_units='xy',scale=3,width=.008)
axes[0,0].set(title='Achieved P4 approach (arrows: velocity at first load entry)',xlabel='Field x (yd)',ylabel='Field y (yd)')
axes[0,0].set_aspect('equal',adjustable='datalim')
axes[0,0].legend(fontsize=8,loc='upper left')
axes[0,1].set(title='Runner speed after first load',ylabel='yd/s')
axes[1,0].set(title='Runner support displacement after first load',ylabel='|ξ| (yd)')
axes[1,1].set(title='Reported selected-grasp force after first load',ylabel='kg·yd/s²')
for ax in (axes[0,1],axes[1,0],axes[1,1]):
    ax.set_xlabel('Elapsed since first loaded World boundary (s)')
    ax.grid(alpha=.25)
axes[0,1].legend(fontsize=8)
fig.suptitle('P4: both geometries tackle with 0.993 execution; both escape with 0.466\nNative placement, strike and World laws retained; four inspected causal interventions',fontsize=12)
out=Path('out/catch-transition/p4-geometry-execution')
fig.savefig(out.with_suffix('.png'),dpi=170)
fig.savefig(out.with_suffix('.svg'))
print(out.with_suffix('.png'))
