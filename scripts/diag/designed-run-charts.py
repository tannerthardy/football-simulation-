"""Render saved measurements only; no simulation or inferred contact forces."""
import argparse
import csv
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ap = argparse.ArgumentParser(description=__doc__); ap.add_argument('report', type=Path); args = ap.parse_args()
data = json.loads((args.report/'summary.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
colors = ['#738093','#087f8c','#c39023']; names = ['Accepted','Combined experiment','NFL RB/FB']
fig, axes = plt.subplots(1,3,figsize=(12,4),layout='constrained')
fig.suptitle('The missing ordinary carries are hidden by breakaways',weight='bold',fontsize=15)
for ax,title,vals,unit in [
 (axes[0],'Median designed gain',[data['arms'][a]['metrics']['median'] for a in ['accepted','experimental']]+[data['nflReference']['yards']['p50']],'Yards'),
 (axes[1],'Gains of 4 to under 10 yards',[100*data['arms'][a]['metrics']['4toUnder10']/data['arms'][a]['metrics']['n'] for a in ['accepted','experimental']]+[100*(data['nflReference']['counts']['gainBin_4toUnder7']+data['nflReference']['counts']['gainBin_7toUnder10'])/data['nflReference']['yards']['n']],'Percent of carries'),
 (axes[2],'Share of net yards from 10+ gains',[100*data['arms'][a]['metrics']['10plusShareOfNetYards'] for a in ['accepted','experimental']]+[data['nflReference']['tailYardContribution']['thresholds']['10plus']['percentOfNetGain']],'Percent of net rushing yards')]:
 ax.bar(range(3),vals,color=colors,width=.65)
 ax.set(title=title,ylabel=unit,xticks=range(3),xticklabels=['Accepted','Combined','NFL RB/FB'])
 ax.set_ylim(0,max(vals)*1.23)
 for i,v in enumerate(vals): ax.text(i,v+max(vals)*.025,f'{v:.2f}' if unit=='Yards' else f'{v:.1f}%',ha='center')
 ax.grid(axis='y',color='#e8e8e8');ax.set_axisbelow(True)
fig.supxlabel('Four games per sim arm (179 / 175 clean designed calls); NFL 2022–25, 46,621 RB/FB carries. Descriptive populations.',fontsize=9)
fig.savefig(args.report/'ordinary-runs.png',dpi=160,facecolor='white')

rows=list(csv.DictReader((args.report/'exchange.csv').open()))
fig,axes=plt.subplots(1,2,figsize=(11,4.2),layout='constrained')
fig.suptitle('Confirmed exchange mismatch: the back leaves before the window opens',weight='bold',fontsize=14)
for ax,play,title in zip(axes,[44,54],['P44 · Gun Trey, Wide Zone Weak','P54 · Gun Bunch, Outside Zone Weak']):
 rs=[r for r in rows if int(r['play'])==play and float(r['t'])<=1.6]
 ax.plot([float(r['t']) for r in rs],[float(r['actualSeparation']) for r in rs],color=colors[1],lw=2.5,label='Actual QB–RB separation')
 reach=float(rs[0]['handoffReach']);gate=float(rs[0]['physicalGate'])
 ax.axhline(reach,color=colors[0],ls='--',label='Physical handoff reach')
 ax.axvspan(0,gate,color='#e6e9ed',alpha=.6,label='Handoff window closed')
 ax.axvline(.5,color='#b1502a',ls=':',label='RB passes mesh landmark')
 ax.set(title=title,xlabel='Time from snap (s)',ylabel='COM separation (yd)',xlim=(0,1.6),ylim=(0,4.2))
 ax.text(.97,.94,'QB requests zero movement\nthrough 1.5 s; no early body contact',transform=ax.transAxes,ha='right',va='top',fontsize=9)
 ax.grid(axis='y',color='#e8e8e8');ax.set_axisbelow(True)
axes[0].legend(loc='lower left',frameon=False,fontsize=8)
fig.supxlabel('Exact all-player full-game replays; original recorded outcomes, film and telemetry reproduced. No controller changes.',fontsize=9)
fig.savefig(args.report/'exchange-mismatch.png',dpi=160,facecolor='white')
