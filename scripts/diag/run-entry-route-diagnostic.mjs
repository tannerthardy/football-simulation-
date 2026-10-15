// One adverse-result diagnostic, at the first repeated gather's entry read.
import{readFileSync,writeFileSync}from'node:fs';import{gunzipSync}from'node:zlib';import{chooseRunApproach}from'../../src/sim/run-approach.ts';
const start=performance.now(),r=JSON.parse(gunzipSync(readFileSync('out/run-entry-approach/native.json.gz'))).rows[1],t=1.95;
const f=r.frames.find(f=>f.t===t),read=r.reads.find(e=>e.phase==='aim'&&e.t===t),body=f.before[6];
const peers=[...new Map(r.cues.filter(c=>c.t===t&&c.kind==='owned'&&c.picture.source!=='unavailable').map(c=>[c.target,{id:c.target,picture:c.picture,radius:r.input.actors[c.target].profile.radius,brake:r.input.actors[c.target].profile.brake}])).values()];
const entries=read.candidates.map(c=>{const h=Math.atan2(c.entry.y-body.pos.y,c.entry.x-body.pos.x),command={...f.raw[6],vel:{x:Math.cos(h)*body.profile.vmax,y:Math.sin(h)*body.profile.vmax}};
 const a=chooseRunApproach(body,command,peers,t,'center');return{...c,selected:JSON.stringify(c.entry)===JSON.stringify(read.selected),choice:a.kind,gaps:a.choices.map(c=>({kind:c.kind,minimumGap:c.minimumGap,up:c.up})),end:a.path.at(-1)};});
const result={question:'Did persistent pacing arise because every acquired entry is obstructed or because destination ranking omits achievable approaches?',t,ownBody:body,peers,entries,physicalScrimmages:0,completedGames:0,previewWorldSteps:entries.length*3*12,elapsedSeconds:(performance.now()-start)/1000};
writeFileSync('out/run-entry-approach/route-diagnostic.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({t,entries,elapsedSeconds:result.elapsedSeconds}));
