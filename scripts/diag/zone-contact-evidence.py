"""Static charts from the saved exact-input zone-contact traces; zero simulation."""
import gzip,json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
P=Path('data/reviews/current/zone-contact-execution')
def read(case,arm):return json.loads(gzip.decompress((P/f'{case}-{arm}.json.gz').read_bytes()))
def frame(d,t):return next(f for f in d['frames'] if abs(f['end']-t)<1e-8)
def pos(d,f,slot):return f['after'][d['slots'].index(slot)]['pos']
def pair_plot(ax,case,roles,side,title):
 for arm,ls in [('baseline','--'),('candidate','-')]:
  d=read(case,arm)
  for slot,color in roles:
   pts=[pos(d,f,slot) for f in d['frames'] if f['end']<=3+1e-8]
   ax.plot([side*(q['y']-26.67) for q in pts],[q['x']-40 for q in pts],ls,color=color,lw=2,label=f'{slot} {arm}')
   ax.scatter(side*(pts[-1]['y']-26.67),pts[-1]['x']-40,color=color,s=28,marker='o' if arm=='candidate' else 'x')
 ax.axhline(0,color='#999',lw=.8);ax.set_title(title,fontsize=11);ax.set_xlabel('Playside position from ball (yd)');ax.set_ylabel('Depth from LOS (yd)');ax.grid(alpha=.18);ax.legend(fontsize=8,ncol=2)
fig,axs=plt.subplots(2,2,figsize=(12,8),constrained_layout=True)
blue,green,orange='#176ba0','#31824c','#cb722c'
pair_plot(axs[0,0],'strong',[('RG',blue),('DT_S',green)],-1,'Strong OZ: more lateral and upfield transport')
pair_plot(axs[0,1],'weak',[('C',blue),('DT_W',green)],1,'Weak WZ: C acquires seal at 2.10 s')
ax=axs[1,0]
for arm,col in [('baseline','#777'),('candidate',blue)]:
 d=read('strong',arm);i=d['slots'].index('RG');fs=[f for f in d['frames'] if .5<=f['t']<=2.5]
 ax.plot([f['t'] for f in fs],[-f['final'][i]['vel']['y'] for f in fs],':',color=col,lw=1.4,label=arm+' final request')
 ax.plot([f['end'] for f in fs],[-f['after'][i]['vel']['y'] for f in fs],'-',color=col,lw=2,label=arm+' achieved velocity')
ax.set_title('RG request and execution, with ordinary physical limits',fontsize=11);ax.set_xlabel('Seconds after snap');ax.set_ylabel('Playside velocity (yd/s)');ax.grid(alpha=.18);ax.legend(fontsize=8)
ax=axs[1,1]
for arm,alpha in [('baseline',.35),('candidate',1)]:
 d=read('strong',arm);f=frame(d,2.5)
 for slot,col in [('RG',blue),('DT_S',green),('RB',orange)]:
  q=pos(d,f,slot);idx=d['slots'].index(slot);x,y=-(q['y']-26.67),q['x']-40
  ax.add_patch(Circle((x,y),d['profiles'][idx]['radius'],facecolor=col if arm=='candidate' else 'none',edgecolor=col,alpha=alpha,lw=1.5))

  if arm=='candidate':
   offset={'RG':(-65,-30),'DT_S':(-30,45),'RB':(35,-20)}[slot]
   ax.annotate(slot,(x,y),xytext=offset,textcoords='offset points',fontsize=9,color=col,arrowprops={'arrowstyle':'-','color':col},bbox={'facecolor':'white','edgecolor':'none','alpha':.85})
ax.set_xlim(3.4,6);ax.set_ylim(-1.3,1.3);ax.set_aspect('equal',adjustable='box');ax.axhline(0,color='#999',lw=.8)
ax.set_title('Strong adverse: earlier DT access to RB at 2.50 s',fontsize=11);ax.set_xlabel('Playside position from ball (yd)');ax.set_ylabel('Depth from LOS (yd)');ax.grid(alpha=.18)
fig.suptitle('Loaded zone contact: baseline 2c98bed9 and runoff candidate 859d0255',fontsize=14)
fig.savefig(P/'before-after.png',dpi=160);fig.savefig(P/'before-after.svg')
svg=P/'before-after.svg'
svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
print(P/'before-after.png')
