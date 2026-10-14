import gzip,json,math
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
pairs=[('P58: COM-WR2 / IRN-S2', 'out/catch-transition/portable-panel/R3101-S1001-P58-baseline.json.gz','out/catch-team-arrival/R3101-S1001-P58-team-window.json.gz'),('Fresh C1: HI10831-WR3 / HC10831-CB5','out/catch-hip-anchor/fresh/H10831-C1-S51001-baseline.json.gz','out/catch-team-arrival/H10831-C1-S51001-team-window.json.gz')]
fig,axes=plt.subplots(2,2,figsize=(10,7),layout='constrained')
colors=['#b45237','#146a80']
for row,(name,*paths) in enumerate(pairs):
 for color,label,p in zip(colors,['Baseline','Moving approach'],paths):
  d=json.loads(gzip.decompress(Path(p).read_bytes()));h=next(h for h in d['holds'] if h['firstLoaded'] is not None);runner=h['carrier'];defender=h['defender'];t=h['firstLoaded'];catch=next(e for e in d['result']['events'] if e['type']=='catch')['t']
  fs=[f for f in d['frames'] if catch-.4<=f['t']<=t+.2]
  ax=axes[row,0]
  for idx,style in [(runner,'-'),(defender,'--')]:
   ax.plot([f['agents'][idx*3] for f in fs],[f['agents'][idx*3+1] for f in fs],style,color=color,lw=2,label=label+(' runner' if idx==runner else ' defender'))
  g=h['entryGeometry'];rf=g.get('runner');df=g.get('defender');fr=min(d['frames'],key=lambda f:abs(f['t']-(t-.05)))
  for idx,body,vel in [(runner,rf,g.get('runnerVelocity')),(defender,df,g.get('defenderVelocity'))]:
   pos=body['pos'] if body else {'x':fr['agents'][idx*3],'y':fr['agents'][idx*3+1]};v=body['vel'] if body else vel
   ax.scatter(pos['x'],pos['y'],color=color,s=35,marker='o' if idx==runner else 's',zorder=3)
   ax.arrow(pos['x'],pos['y'],v['x']*.12,v['y']*.12,width=.035,head_width=.22,color=color,length_includes_head=True)
  ax=axes[row,1];tel=[f for f in d['telemetry']['frames'] if t-.15<=f['t']<=t+.6]
  ax.plot([f['t']-t for f in tel],[math.hypot(*f['agents'][runner]['body']['velocity']) for f in tel],color=color,lw=2,label=label)
  if h['brokenAt'] is not None:ax.axvline(h['brokenAt']-t,color=color,ls=':',lw=1.5);ax.text(h['brokenAt']-t+.008,ax.get_ylim()[1]-.1,'hold breaks',color=color,fontsize=8,rotation=90,va='top')
  fall=next((e['t'] for e in d['result']['events'] if e['type']=='fall' and e['a']==runner),None)
  if fall is not None and fall-t<=.6:ax.scatter(fall-t,next(math.hypot(*f['agents'][runner]['body']['velocity']) for f in tel if f['t']>=fall),color=color,marker='v',s=45);ax.annotate('runner falls',(fall-t,next(math.hypot(*f['agents'][runner]['body']['velocity']) for f in tel if f['t']>=fall)),xytext=(8,8),textcoords='offset points',color=color,fontsize=8)
 axes[row,0].set_title(name,fontsize=11);axes[row,0].set_xlabel('Field x (yd)');axes[row,0].set_ylabel('Field y (yd)');axes[row,0].axis('equal');axes[row,0].legend(fontsize=8,loc='best');axes[row,0].grid(alpha=.18)
 axes[row,1].axvline(0,color='#444',ls='--',lw=1);axes[row,1].set_title('Achieved runner speed after first loaded grasp',fontsize=10);axes[row,1].set_xlabel('Seconds from first loaded boundary');axes[row,1].set_ylabel('Speed (yd/s)');axes[row,1].legend(fontsize=8);axes[row,1].grid(alpha=.18)
fig.suptitle('Contact entry and grip survival with unchanged physics',fontsize=14)
fig.savefig('docs/reviews/figures/moving-catch-approaches.png',dpi=160)
