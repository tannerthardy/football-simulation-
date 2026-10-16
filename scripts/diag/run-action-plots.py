"""Offline figures from complete saved summary; no simulations."""
import json,os,sys
os.environ.setdefault('MPLCONFIGDIR','/tmp/run-action-mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/run-action-analysis');s=json.loads((root/'summary.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'figure.facecolor':'#f7f8fa','axes.facecolor':'#ffffff','axes.titleweight':'bold'})
names={'insideZone':'Inside zone','outsideZone':'Outside zone','wideZone':'Wide zone','splitZone':'Split zone','power':'Power','counter':'Counter','duo':'Duo','trap':'Trap','draw':'Draw','toss':'Toss','qbDraw':'QB draw','buckSweep':'Buck sweep','pinPull':'Pin & pull','crackToss':'Crack toss'}
items=list(s['primary']);fig,ax=plt.subplots(figsize=(10.2,6.8));ys=np.arange(len(items));
for i,k in enumerate(items):
 a=s['primary'][k];ax.plot([a['q25'],a['q75']],[i,i],lw=8,solid_capstyle='round',color='#a2c8ec');ax.plot(a['median'],i,'o',ms=8,color='#17669f');ax.plot(a['mean'],i,'D',ms=5,color='#d68027')
 ax.text(max(a['q75'],a['mean'])+.25,i,f"{a['median']:.1f} med · {a['stuff']:.1%} ≤0",va='center',fontsize=10)
ax.set_yticks(ys,[names[k] for k in items]);ax.invert_yaxis();ax.axvline(0,color='#747b87',lw=1);ax.grid(axis='x',alpha=.2);ax.set_xlim(min(0,min(s['primary'][k]['q25'] for k in items))-.5,max(s['primary'][k]['q75'] for k in items)+7)
ax.set_xlabel('Terminal offensive yards before penalty enforcement');ax.set_title('Run stress suite: median, middle 50%, and mean',loc='left',pad=18)
fig.text(.14,.025,'80 cases per family · 10 looks · 2 directions · 2 rosters · 2 seeds\nBlue dot/bar: median and IQR · amber diamond: mean. QB draw is a separate QB-run cohort.\nEqual-weight diagnostic calls on accepted develop bb6d4c7; not NFL play-call frequencies.',fontsize=9,color='#4c5563')
fig.tight_layout(rect=(0,.1,1,1));fig.savefig(root/'run-distributions.png',dpi=160);plt.close(fig)
looks=['over3','under3','wide9','tite4','odd3','bear1','over2','over4','off1','mike1'];labels=['Over / C3','Under / C3\nspill','Wide9 / C3\nspill','Tite / Q4','Odd / C3\nspill','Bear / C1','Over / C2','Over / Q4','Over / C1 off','Over / C1\nMike A']
values=np.array([[next(x['median'] for x in s['heat'] if x['family']==k and x['look']==l) for l in looks]for k in items]);fig,ax=plt.subplots(figsize=(13.4,7));im=ax.imshow(values,cmap='RdYlBu',vmin=min(-2,float(values.min())),vmax=max(6,float(values.max())),aspect='auto')
for i in range(len(items)):
 for j in range(len(looks)):ax.text(j,i,f'{values[i,j]:.1f}',ha='center',va='center',fontsize=10,color='#172c42')
ax.set_xticks(range(10),labels);ax.set_yticks(range(len(items)),[names[k] for k in items]);ax.set_title('Where the run survives: median yards by installed defensive look',loc='left',pad=18);fig.colorbar(im,ax=ax,label='Median yards')
fig.text(.14,.025,'8 cases per cell. Front, personnel, coverage and listed edge policy are an installed look, not isolated causal factors.\nAll 880 primary cases shown; offensive/defensive victories remain valid outcomes.',fontsize=9,color='#4c5563');fig.tight_layout(rect=(0,.08,1,1));fig.savefig(root/'front-heatmap.png',dpi=160);plt.close(fig)
contexts=['neutral','runheavy','passalert'];clabel=['1st & 10\nNeutral','1st & 10\nRun-heavy','3rd & 8\nPass-alert'];fig,axes=plt.subplots(1,3,figsize=(13.5,5));
for j,(metric,title) in enumerate([('read','LB first commitment: run'),('gain','Terminal gain'),('sack','Sack rate')]):
 for arm,offset,color,label in [('pa',-.18,'#2074ad','Native PA'),('plain',.18,'#e2963c','Matched no-fake pass')]:
  vals=[]
  for ctx in contexts:
   rows=[x for x in s['playAction'] if x['context']==ctx]
   vals.append(sum((x[arm+'LbFirstRun'] if metric=='read' else x[arm]['mean'] if metric=='gain' else x[arm]['sacks'])for x in rows)/len(rows)*(100 if metric in ['read','sack']else 1))
  axes[j].bar(np.arange(3)+offset,vals,width=.34,color=color,label=label)
 axes[j].set_xticks(range(3),clabel,fontsize=9);axes[j].set_title(title,fontsize=12);axes[j].grid(axis='y',alpha=.2);axes[j].set_axisbelow(True);axes[j].set_ylabel('%' if metric in ['read','sack']else'Yards')
 if metric=='read':axes[j].set_ylim(0,100)
 if metric=='sack':axes[j].set_ylim(0,15)
axes[0].legend(fontsize=9,loc='upper right');fig.suptitle('Does the existing play-action fake change defensive response?',x=.06,ha='left',fontweight='bold',fontsize=16)
fig.text(.06,.012,'72 matched pairs per context across post/dig, flood and shot. Run-heavy history: 18 prior runs / 6 passes.\nSame routes/protection jobs/drop depth; generic OL show and QB/RB fake differ.\nA false run read is not itself a football error. Run-specific line, pull, slice and boot sells are not installed; later execution draws may differ.',fontsize=9,color='#4c5563');fig.tight_layout(rect=(0,.09,1,.92));fig.savefig(root/'playaction-controls.png',dpi=160);plt.close(fig)
print('Wrote three standalone PNG figures')
