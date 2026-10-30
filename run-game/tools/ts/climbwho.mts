import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const line=readFileSync('/home/user/fs-g2b/test/planned-climb-fit.test.ts','utf8').split('\n')[12];
for(const m of line.matchAll(/process\.env\.([A-Z_]+) = '(\d)'/g))if(process.env[m[1]]===undefined)process.env[m[1]]=m[2];
const {PlaySim}=await import('/home/user/fs-g2b/src/sim/playsim.js');
const fx=JSON.parse(gunzipSync(readFileSync('/home/user/fs-g2b/test/fixtures/planned-climb-fit.json.gz')).toString());
const sim=new PlaySim(fx.setup);
const name=(i:number)=>sim.agents[i]?.slot;
let last=0;
while(sim.phase==='live'&&sim.t<2.95){sim.tick();if(sim.t-last>=.25-1e-9){last=sim.t;const c=sim.carrier;const near=sim.defense.map(d=>({d,r:Math.hypot(d.pos.x-c!.pos.x,d.pos.y-c!.pos.y)})).sort((a,b)=>a.r-b.r).slice(0,3);
 console.log(sim.t.toFixed(2),c?.slot,c!.pos.x.toFixed(1),c!.pos.y.toFixed(1),'|',near.map(({d,r})=>`${d.slot} ${r.toFixed(1)}${d.engagement?' ENG('+d.engagement.blocker?.slot+')':''}`).join(', '));}}
for(const e of sim.events.filter(e=>['carrier_contact','tackle_wrap','block_contact','shed','block_release'].includes(e.type)||/shed|release/.test(e.type)))console.log(e.t.toFixed(2),e.type,name(e.a),name(e.b as number),e.note??'');
