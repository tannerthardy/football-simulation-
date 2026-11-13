/** Self-contained pair-only film. Existing renderers and trace panels are untouched. */
import type { Frame } from '../../src/sim/types.js';
import type { ExecutionDifference } from '../diag/saved-play.js';
import type { outcome } from './model.js';
export interface PairView {
  id: string; note: string; noChange: boolean; firstDifference: ExecutionDifference | null;
  before: { summary: ReturnType<typeof outcome>; frames: Frame[]; players: { team: string; slot: string }[]; los: number };
  after: PairView['before'];
}
export function renderPairs(pairs: PairView[], base: string, head: string): string {
  const json = JSON.stringify({ pairs, base, head }).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matched snap film pairs</title><style>
body{font:16px system-ui;background:#102029;color:#f4f6f8;margin:20px}button,select,input{font:inherit}button{cursor:pointer}select{max-width:80vw}#panels{display:flex;gap:12px;flex-wrap:wrap}.panel{flex:1;min-width:320px}canvas{width:100%;background:#143d2b;border:1px solid #668}table{border-collapse:collapse}td,th{padding:6px 12px;border:1px solid #667}#seek{width:min(80vw,1000px)}#note{white-space:pre-wrap}small{color:#bccad4}code{overflow-wrap:anywhere}
</style><h1>Same snap, two engines</h1><label>Play <select id="plays"></select></label> <button id="download">Download this viewer</button>
<p id="note"></p><p id="status"></p><p><button id="toggle">Play</button> <button id="previous">− tick</button> <button id="next">+ tick</button> <button id="divergence">First difference</button>
<label>Speed <select id="speed"><option value="0.5">0.5×</option><option selected value="1">1×</option><option value="2">2×</option></select></label></p>
<input id="seek" type="range" step="0.01" value="0" aria-label="Synchronized time"><output id="clock"></output>
<div id="panels"><div class="panel"><h2 id="before-label"></h2><canvas id="before" width="960" height="460"></canvas><p id="before-time"></p></div><div class="panel"><h2 id="after-label"></h2><canvas id="after" width="960" height="460"></canvas><p id="after-time"></p></div></div>
<table><thead><tr><th>Recorded result</th><th>Before</th><th>After</th></tr></thead><tbody id="metrics"></tbody></table>
<p><small>First contact means the earliest recorded carrier_contact, tackle_wrap, hit or sack event; missing means unknown. Dots show recorded samples without interpolation. An ended arm holds its last sample and is labelled ended. Facing is body orientation, not gaze. Gold ring marks the recorded carrier; it does not establish protection. First difference is the earliest saved initialization/frame/event/telemetry or result-end discrepancy, not an unrecorded physics substep or proof of cause.</small></p>
<script>const DATA=${json};
const el=id=>document.getElementById(id),selector=el('plays'),seek=el('seek');let playing=false,last=null;
DATA.pairs.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.id+(p.noChange?' — no change':'');selector.append(o)});
el('before-label').textContent='before ('+DATA.base+')';el('after-label').textContent='after ('+DATA.head+')';
function current(){return DATA.pairs[Number(selector.value)]}
function times(p){return [...new Set([...p.before.frames,...p.after.frames].map(f=>f.t))].sort((a,b)=>a-b)}
function frameAt(frames,t){let f=frames[0];for(const row of frames){if(row.t>t+1e-9)break;f=row}return f}
function draw(id,arm,t){const canvas=el(id),ctx=canvas.getContext('2d'),frames=arm.frames;ctx.clearRect(0,0,960,460);if(!frames.length){ctx.fillStyle='white';ctx.fillText('No recorded frames',20,40);el(id+'-time').textContent='Unavailable';return}
 const f=frameAt(frames,t),scale=7.5,ox=30,oy=30;ctx.fillStyle='#17492d';ctx.fillRect(ox,oy,900,400);ctx.strokeStyle='#9ab6a4';ctx.lineWidth=1;
 for(let x=0;x<=120;x+=5){ctx.beginPath();ctx.moveTo(ox+x*scale,oy);ctx.lineTo(ox+x*scale,oy+400);ctx.stroke()}ctx.strokeRect(ox,oy,900,400);
 ctx.strokeStyle='#6dd6ff';ctx.beginPath();ctx.moveTo(ox+arm.los*scale,oy);ctx.lineTo(ox+arm.los*scale,oy+400);ctx.stroke();
 for(let i=0;i<arm.players.length;i++){const x=f.agents[i*3],y=f.agents[i*3+1],facing=f.agents[i*3+2];if(!Number.isFinite(x)||!Number.isFinite(y))continue;
 const px=ox+x*scale,py=oy+y*scale;ctx.fillStyle=arm.players[i].team==='O'?'#f36e64':'#75b9ff';ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+10*Math.cos(facing),py+10*Math.sin(facing));ctx.stroke();
 if(i===f.carrier){ctx.strokeStyle='#ffd36b';ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.stroke()}ctx.fillStyle='#fff';ctx.font='11px system-ui';ctx.fillText(arm.players[i].slot,px+8,py-5)}
 ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(ox+f.ball[0]*scale,oy+f.ball[1]*scale,3,0,Math.PI*2);ctx.fill();
 const end=frames[frames.length-1].t;el(id+'-time').textContent='Sample '+f.t.toFixed(2)+' s'+(t>end?' · ended at '+end.toFixed(2)+' s':'')+(t<frames[0].t?' · begins at '+frames[0].t.toFixed(2)+' s':'');}
function update(){const p=current(),t=Number(seek.value);el('clock').textContent=t.toFixed(2)+' s';draw('before',p.before,t);draw('after',p.after,t)}
function select(){playing=false;el('toggle').textContent='Play';const p=current(),ts=times(p);seek.min=ts[0]??0;seek.max=ts.at(-1)??0;seek.value=seek.min;el('note').textContent=p.note;
 el('status').textContent=p.noChange?'no change — byte-identical complete recorded values':p.firstDifference?'First recorded difference: '+p.firstDifference.time.toFixed(2)+' s ('+p.firstDifference.timeBasis+'), '+p.firstDifference.path:'Different execution bytes; no value-level witness';
 const body=el('metrics');body.replaceChildren();for(const [key,label] of [['yards','Yards'],['outcome','Ending'],['firstContact','First recorded contact (s)'],['tackles','Tackles'],['missedTackles','Missed tackles']]){const row=document.createElement('tr');for(const value of [label,p.before.summary[key]??'unknown',p.after.summary[key]??'unknown']){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell)}body.append(row)}update()}
selector.onchange=select;seek.oninput=update;el('toggle').onclick=()=>{playing=!playing;el('toggle').textContent=playing?'Pause':'Play';if(playing&&Number(seek.value)>=Number(seek.max))seek.value=seek.min};
for(const [id,dir] of [['previous',-1],['next',1]])el(id).onclick=()=>{const ts=times(current()),t=Number(seek.value);seek.value=dir>0?(ts.find(v=>v>t+1e-6)??seek.max):([...ts].reverse().find(v=>v<t-1e-6)??seek.min);update()};
el('divergence').onclick=()=>{const d=current().firstDifference;if(d){seek.value=Math.max(Number(seek.min),Math.min(Number(seek.max),d.time));update()}};
el('download').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html'}));a.href=url;a.download='film-pairs.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
function animate(now){if(playing&&last!==null){seek.value=Math.min(Number(seek.max),Number(seek.value)+(now-last)/1000*Number(el('speed').value));if(Number(seek.value)>=Number(seek.max)){playing=false;el('toggle').textContent='Play'}update()}last=now;requestAnimationFrame(animate)}select();requestAnimationFrame(animate);
</script></html>`;
  if (Buffer.byteLength(html) >= 15_000_000) throw Error('Batch HTML exceeds15MB; select fewer plays');
  return html;
}
