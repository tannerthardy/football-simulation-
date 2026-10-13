"""Standalone viewer for the preselected, observer-neutral native run census."""
import json,sys
from pathlib import Path
root=Path(sys.argv[1] if len(sys.argv)>1 else 'out/run-hand-coherence')
census=json.loads((root/'ordinary-census-detailed.json').read_text())
clips=[r for r in census['runs'] if r['selected']]
# The raw census retains every consumed cue and full contact/support data.
# The viewer shows only rendered fields and the latest cue per opponent in
# each interval, keeping the standalone document practical to open.
for clip in clips:
 clip['initial']=[{'slot':a['slot'],'profile':{'radius':a['profile']['radius']}} for a in clip['initial']]
 for frame in clip['frames']:
  frame['blocks']=list({(b['blocker'],b['defender']):{'blocker':b['blocker'],'defender':b['defender']} for b in frame['blocks']}.values())
  frame['cues']=list({(c['consumer'],c['opponent']):c for c in frame['cues']}.values())
  visible=[]
  for cue in frame['cues']:
   actor=next(a for a in frame['agents'] if a['slot']==cue['consumer'])
   plan=actor.get('plan') or {}
   if actor['team']=='O':
    relevant=actor['slot']=='RB' or cue['opponent'] in [plan.get('target'),plan.get('climbTo')] or cue['opponent'].startswith('LB')
   else:
    relevant=cue['opponent'] in ['RB','QB'] or any(b['defender']==actor['slot'] and b['blocker']==cue['opponent'] for b in frame['blocks'])
   if relevant:visible.append(cue)
  frame['cues']=visible
page=r'''<!doctype html><meta charset="utf-8"><title>Ordinary native run film</title>
<style>body{font:15px system-ui;margin:24px;background:#f5f7fa;color:#17252f}select,input,button{font:inherit}canvas{display:block;background:#fff;border:1px solid #ccc;margin:12px 0;max-width:100%}pre{white-space:pre-wrap;font-size:12px}#info{display:grid;grid-template-columns:1fr 1fr;gap:24px}input{width:75%}</style>
<h2>Ordinary native run film</h2><p>17 clips selected before their outcomes. Blue offense, red defense, gold RB; short black marks show body facing. Facing is not gaze. Lines show recorded run engagements, not certified protection. Camera follows RB.</p>
<select id="clips"></select> <button id="play">Play/pause</button> <span id="time"></span><br>
<input id="scrub" type="range" min="0" value="0" step="1"><canvas id="film" width="1000" height="520"></canvas>
<div id="info"><pre id="context"></pre><div>Inspect player (latest target/backer/carrier cues in this interval; full reads stay in the raw census): <select id="player"></select><pre id="cue"></pre></div></div>
<p id="source"></p><script>
const data=__DATA__, source=__SOURCE__;
const choose=document.getElementById('clips'),scrub=document.getElementById('scrub'),player=document.getElementById('player'),canvas=document.getElementById('film'),ctx=canvas.getContext('2d');
data.forEach((p,i)=>{const o=new Option(`G${p.gameSeed} index ${p.nativePlayIndex}: ${p.concept}, ${p.gain.toFixed(2)} yd`,i);choose.add(o)});
let playing=false;document.getElementById('play').onclick=()=>playing=!playing;
function draw(){const p=data[+choose.value],f=p.frames[+scrub.value];if(!f)return;const rb=f.agents.find(a=>a.slot==='RB'),los=10+p.context.yardline;
 const cx=rb.pos.x,cy=rb.pos.y,sx=1000/24,sy=520/14,X=x=>(x-cx+12)*sx,Y=y=>(7-y+cy)*sy;
 ctx.clearRect(0,0,1000,520);ctx.strokeStyle='#dde6dd';for(let x=Math.floor(cx-12);x<cx+12;x++){ctx.beginPath();ctx.moveTo(X(x),0);ctx.lineTo(X(x),520);ctx.stroke()}
 ctx.strokeStyle='#40556f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X(los),0);ctx.lineTo(X(los),520);ctx.stroke();ctx.fillStyle='#40556f';ctx.fillText('LOS',X(los)+4,18);
 ctx.lineWidth=1;ctx.strokeStyle='#9aa5b1';for(const b of f.blocks){const a=f.agents.find(a=>a.slot===b.blocker),d=f.agents.find(a=>a.slot===b.defender);if(!a||!d)continue;ctx.beginPath();ctx.moveTo(X(a.pos.x),Y(a.pos.y));ctx.lineTo(X(d.pos.x),Y(d.pos.y));ctx.stroke()}
 for(const a of f.agents){const r=p.initial.find(q=>q.slot===a.slot&&q.profile)?.profile.radius??.35;ctx.beginPath();ctx.ellipse(X(a.pos.x),Y(a.pos.y),r*sx,r*sy,0,0,7);ctx.fillStyle=a.slot==='RB'?'#e7b51b':a.team==='O'?'#3e81c5':'#ca5959';ctx.fill();ctx.strokeStyle=a.support==='up'?'#18242d':'#999';ctx.stroke();ctx.beginPath();ctx.moveTo(X(a.pos.x),Y(a.pos.y));ctx.lineTo(X(a.pos.x+.65*Math.cos(a.facing)),Y(a.pos.y+.65*Math.sin(a.facing)));ctx.stroke();ctx.fillStyle='#111';ctx.fillText(a.slot,X(a.pos.x)+12,Y(a.pos.y)-9)}
 const a=f.agents.find(a=>a.slot===player.value),cues=f.cues.filter(c=>c.consumer===player.value);
 document.getElementById('time').textContent=`${f.after.toFixed(2)} s`;
 document.getElementById('context').textContent=JSON.stringify({gameSeed:p.gameSeed,nativePlayIndex:p.nativePlayIndex,playSeed:p.playSeed,concept:p.concept,front:p.front,formation:p.formation,context:p.context,firstContact:p.firstContact,crossingBoundary:p.crossingBoundary,outcome:p.outcome,gain:p.gain,endTime:p.endTime,censored:p.censored},null,2);
 document.getElementById('cue').textContent=JSON.stringify({pose:a?.pos,velocity:a?.vel,support:a?.support,plan:a?.plan,requested:a?.requested,applied:a?.applied,consumedCues:cues},null,2);
}
function select(){const p=data[+choose.value];scrub.max=p.frames.length-1;scrub.value=0;player.innerHTML='';p.frames[0].agents.forEach(a=>player.add(new Option(a.slot,a.slot)));player.value='RG';draw()}
choose.onchange=select;scrub.oninput=draw;player.onchange=draw;setInterval(()=>{if(playing){scrub.value=(+scrub.value+1)%(+scrub.max+1);draw()}},100);select();
document.getElementById('source').textContent=`Source ${source}; native histories and game results match plain observation. Contact positions are samples at the end of their tick. These generated games are not NFL frequency estimates.`;
</script>'''
page=page.replace('__DATA__',json.dumps(clips,separators=(',',':')).replace('</','<\\/')).replace('__SOURCE__',json.dumps(census['sourceSha256']))
(root/'ordinary-film.html').write_text(page)
print(root/'ordinary-film.html')
