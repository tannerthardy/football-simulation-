"""Offline film from cached 5Hz all-player observations. No simulations."""
import gzip,json,math,sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/run-action-analysis')
summary=json.loads((root/'summary.json').read_text());rows=json.loads(gzip.decompress((root/'rows.json.gz').read_bytes()))
index={}
for host in ['accepted','perimeter']:
 idx=json.loads(Path('out/run-action-'+host+'/index.json').read_text())
 for r in idx['rows']:index[r['id']]=(r['path'],idx['provenance']['source'])
selections=[]
for phase in ['primary','perimeter']:
 for fam in sorted({r['case']['family']for r in rows if r['case']['phase']==phase}):
  eligible=sorted([r for r in rows if r['case']['phase']==phase and r['metrics']['terminal']and r['case']['family']==fam],key=lambda r:(r['metrics']['gain'],r['case']['id']))
  a,b=[eligible[math.floor((len(eligible)-1)*q)]for q in [.25,.75]]
  selections.append({'title':phase+' · '+fam+' · quartile contrasts','left':a['case']['id'],'right':b['case']['id'],'labels':['Lower quartile gain','Upper quartile gain']})
for pkg in ['postdig','flood','shot']:
 pairs=[p for p in summary['pairs']if p['package']==pkg and p['context']=='neutral' and p['lbForward1Delta']is not None]
 p=max(pairs,key=lambda p:(abs(p['lbForward1Delta']),p['paCase']))
 selections.append({'title':'PA / '+pkg+' · largest early LB movement effect','left':p['paCase'],'right':p['plainCase'],'labels':['Native generic play action','Matched no-fake pass']})
p=min([p for p in summary['pairs']if p['package']=='flood'and p['context']=='passalert'],key=lambda p:(p['gainDelta'],p['paCase']))
selections.append({'title':'Adverse PA · flood / third & 8 · largest gain loss','left':p['paCase'],'right':p['plainCase'],'labels':['Native generic play action','Matched no-fake pass']})
censored=[r['case']['id']for r in rows if not r['metrics']['terminal']]
if censored:selections.append({'title':'Unfinished exchange · I21 / Wide9 (20s censor)','left':censored[0],'right':censored[1],'labels':['Outside zone · still live','Wide zone · still live']})
a=next(r for r in rows if all(r['case'][k]==v for k,v in {'phase':'primary','family':'draw','look':'over3','roster':'pair11','seed':77,'direction':'strong'}.items()))
b=next(r for r in rows if all(r['case'][k]==v for k,v in {'phase':'transfer','family':'insideZone','formation':'gun_doubles_11','look':'over3','roster':'pair11','seed':77,'direction':'strong'}.items()))
selections.append({'title':'Draw / inside zone · same gun players and defensive look','left':a['case']['id'],'right':b['case']['id'],'labels':['Draw presentation','Inside-zone contrast (multiple techniques differ)']})
films={};packet=[]
for id in dict.fromkeys(x[k]for x in selections for k in ['left','right']):
 path,source=index[id];saved=json.loads(gzip.decompress(Path(path).read_bytes()));r=saved['row'];obs=r['observation']
 frames=[]
 for f in obs['frames']:
  states=[]
  for a in f['agents']:
   states.append([*[round(a['pos'][k],3)for k in ['x','y']],round(a['facing'],3),
    *[round(a['vel'][k],3)for k in ['x','y']],*[round(a['raw']['vel'][k],3)for k in ['x','y']],
    *[round(a['final']['vel'][k],3)for k in ['x','y']],a['read'],round(a['pPass'],3)if a['pPass']is not None else None])
  frames.append({'t':f['afterAt'],'before':f['beforeAt'],'states':states,'carrier':f['carrier'],'ball':f['ball'],
   'loads':[[x['blocker'],x['defender']]for x in f['loads']]})
 films[id]={'case':r['case'],'source':source,'metrics':r['metrics'],'slots':[a['slot']for a in obs['initial']],
  'radius':[a['radius']for a in obs['initial']],'frames':frames,'events':obs['events']}
 packet.append({'id':id,'cacheKey':saved['key'],'rowSha256':saved['rowSha256'],'path':path,'source':source,'metrics':r['metrics'],
  'installed':obs['installed'],'loads':obs['loads'],'contactLoads':obs['contactLoads'],'offenseImpacts':obs['offenseImpacts'],'events':obs['events'],'invariants':obs['invariants']})
(root/'witness-packet.json.gz').write_bytes(gzip.compress(json.dumps(packet,separators=(',',':')).encode()))
(root/'film-selections.json').write_text(json.dumps(selections,indent=2)+'\n')
html='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Run and play-action stress film</title>
<style>body{font:16px system-ui;background:#13212b;color:#ecf1f5;margin:20px}h1{font-size:26px}p{max-width:1200px}button,select,input{font:inherit;margin:5px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}canvas{background:#163e32;width:100%}pre{font:13px ui-monospace;white-space:pre-wrap;color:#cfe1ed}small{color:#bdcbd1}</style>
<h1>Run / play-action stress film</h1><p>Saved native observations from the 1,848-case diagnostic suite. These are retrospective examples selected by declared quartiles, early LB movement and adverse PA effect; they are not independent holdouts. Accepted and prototype sources are identified separately.</p>
<select id="case"></select><button id="play">Play</button><button id="reset">Restart</button><select id="speed"><option value="1">1×</option><option value="0.5">½×</option><option value="0.25">¼×</option></select><label><input id="full" type="checkbox">Full field</label><label>Inspect <select id="actor"></select></label><br><input id="time"type="range"min="0.05"max="20"step="0.05"value="0.05"style="width:80%"><span id="clock"></span>
<p><small>Blue offense, red defense, yellow possession ring. Gold links = delivered hand force, not proof of protection. For selected player: gray raw request, orange final request, cyan achieved velocity; arrows scale velocity by .25s, not a future path. Post-World frames at5Hz; the panel shows its actual sample time. Ball/possession is the pre-World snapshot; pitch/pass flight is labelled, not drawn out of sync. Native endings/censoring are reported separately; no interpolation or invented final pose.</small></p>
<section><div><h2 id="label0"></h2><canvas id="canvas0"width="800"height="650"></canvas><pre id="info0"></pre></div><div><h2 id="label1"></h2><canvas id="canvas1"width="800"height="650"></canvas><pre id="info1"></pre></div></section>
<p>Save this self-contained HTML and open locally. No server, network requests or ZIP required. Fixed accepted44 flags/components1, Node22.23.3. Actual inputs, force measurements and all adverse results are in the companion report.</p>
<script>const data=__DATA__;const $=id=>document.getElementById(id);let running=false,nowTime=.05,previous=0;
for(let i=0;i<data.selections.length;i++){const o=document.createElement('option');o.value=i;o.textContent=data.selections[i].title;$('case').append(o)}
for(const slot of Object.values(data.films)[0].slots){const o=document.createElement('option');o.value=slot;o.textContent=slot;$('actor').append(o)}$('actor').value='RB';
function draw(which,id,label){const film=data.films[id],f=film.frames.filter(f=>f.t<=nowTime).at(-1)||film.frames[0],canvas=$('canvas'+which),c=canvas.getContext('2d');$('label'+which).textContent=label;c.clearRect(0,0,800,650);
const carrier=film.slots.indexOf(f.carrier),center=carrier>=0?f.states[carrier][0]:40,full=$('full').checked,xmin=full?8:Math.max(8,center-12),xmax=full?112:Math.min(112,center+16),ymin=full?0:13,ymax=full?53.33:40.34,scale=Math.min(750/(ymax-ymin),570/(xmax-xmin));
const xy=(x,y)=>[400-((y-(ymin+ymax)/2)*scale),330-((x-(xmin+xmax)/2)*scale)];c.font='13px system-ui';
for(let x=10;x<=110;x+=5){if(x<xmin||x>xmax)continue;c.strokeStyle=x===40?'#80cfff':'#496e5d';c.lineWidth=x===40?2:1;c.beginPath();c.moveTo(...xy(x,ymin));c.lineTo(...xy(x,ymax));c.stroke();c.fillStyle='#b2cabf';c.fillText(String(x),xy(x,ymin)[0]-24,xy(x,ymin)[1]-4)}
for(const [a,b]of f.loads){const i=film.slots.indexOf(a),j=film.slots.indexOf(b);if(i<0||j<0)continue;c.strokeStyle='#ffd060';c.lineWidth=3;c.beginPath();c.moveTo(...xy(...f.states[i]));c.lineTo(...xy(...f.states[j]));c.stroke()}
for(let i=0;i<f.states.length;i++){const a=f.states[i],p=xy(...a);c.fillStyle=i<11?'#65b7ef':'#f18183';c.beginPath();c.arc(...p,Math.max(2,film.radius[i]*scale),0,Math.PI*2);c.fill();c.fillStyle='#fff';c.fillText(film.slots[i],p[0]+7,p[1]-6);c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.moveTo(...p);c.lineTo(p[0]-Math.sin(a[2])*.6*scale,p[1]-Math.cos(a[2])*.6*scale);c.stroke();if(film.slots[i]===f.carrier){c.strokeStyle='#ffe062';c.lineWidth=3;c.beginPath();c.arc(...p,(film.radius[i]+.22)*scale,0,Math.PI*2);c.stroke()}}
const idx=film.slots.indexOf($('actor').value),a=f.states[idx];if(a){const p=xy(...a);for(const [vx,vy,color]of [[a[5],a[6],'#e3e8eb'],[a[7],a[8],'#f3a74f'],[a[3],a[4],'#4fe7e1']]){c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(...p);c.lineTo(...xy(a[0]+vx*.25,a[1]+vy*.25));c.stroke()}}
c.fillStyle='#fff';c.font='17px system-ui';c.fillText('Sample '+f.t.toFixed(2)+'s · '+f.ball,18,28);
const m=film.metrics;const outcome=m.terminal?m.outcome+' · '+m.gain.toFixed(2)+' yd':'LIVE / CENSORED';
$('info'+which).textContent=film.case.family+' / '+film.case.formation+' / '+film.case.look+'\n'+film.case.roster+' seed'+film.case.seed+' '+film.case.direction+' · '+film.case.context+'\n'+outcome+' at '+m.duration.toFixed(2)+'s · source '+film.source.slice(0,12)+'\n'+(a?$('actor').value+' pos('+a[0].toFixed(2)+','+a[1].toFixed(2)+') achieved v('+a[3].toFixed(2)+','+a[4].toFixed(2)+')\nraw v('+a[5].toFixed(2)+','+a[6].toFixed(2)+') → final v('+a[7].toFixed(2)+','+a[8].toFixed(2)+')\nread '+a[9]+' · P(pass) '+a[10]:'')}
function render(){const s=data.selections[+$('case').value];draw(0,s.left,s.labels[0]);draw(1,s.right,s.labels[1]);$('clock').textContent=nowTime.toFixed(2)+'s'}
$('play').onclick=()=>{running=!running;$('play').textContent=running?'Pause':'Play'};$('reset').onclick=()=>{nowTime=.05;$('time').value=nowTime;render()};$('time').oninput=()=>{nowTime=+$('time').value;render()};$('case').oninput=()=>{nowTime=.05;$('time').value=nowTime;render()};$('full').oninput=render;$('actor').oninput=render;
function tick(t){if(running&&previous){const s=data.selections[+$('case').value],end=Math.max(data.films[s.left].metrics.duration,data.films[s.right].metrics.duration);nowTime=Math.min(end,nowTime+(t-previous)/1000*+$('speed').value);$('time').value=nowTime;if(nowTime>=end){running=false;$('play').textContent='Play'}render()}previous=t;requestAnimationFrame(tick)}render();requestAnimationFrame(tick);
</script>'''.replace('__DATA__',json.dumps({'selections':selections,'films':films},separators=(',',':')))
# JS string literals must retain escaped newlines in the Python triple string.
html=html.replace("+'\n'+", "+'\\n'+").replace("+')\nraw", "+')\\nraw").replace("+')\nread", "+')\\nread")
(root/'film.html').write_text(html)
print(json.dumps({'pairedViews':len(selections),'uniqueCachedCases':len(films),'htmlBytes':len(html.encode()),'newSimulations':0}))
