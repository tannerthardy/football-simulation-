import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [root,out,only]=process.argv.slice(2);
const {motionContact}=await import(pathToFileURL(resolve(root,'src/lab/motion-contact.ts')));
const inputs=[
 {seed:7,side:1,geometry:'penetratingEdge',initialSpeed:4,substeps:12},
 {seed:7,side:1,geometry:'wideSurface',initialSpeed:0,substeps:12},
 {seed:7,side:-1,geometry:'wideSurface',initialSpeed:0,substeps:12},
 {seed:7,side:1,geometry:'wideSurface',initialSpeed:4,substeps:12},
 {seed:7,side:-1,geometry:'wideSurface',initialSpeed:4,substeps:12},
];
const cases=inputs.filter((_,index)=>only===undefined||index===Number(only)).map(input=>{
 const r=motionContact(input,{recording:true});
 return {input,initial:r.initial,endpoint:r.endpoint,closest:r.closest,
 firstAcquisition:r.firstAcquisition,firstContact:r.firstContact,
 firstHandBodyContact:r.firstHandBodyContact,contactMetrics:r.contactMetrics,
 invariants:r.invariants,falls:r.falls,rngNext:r.rngNext,
 frames:r.frames,events:r.recording.events};
});
writeFileSync(out,JSON.stringify({cases})+'\n');
console.log(JSON.stringify(cases.map(r=>({input:r.input,closest:r.closest,
 acquired:r.firstAcquisition?.t,contact:r.firstContact?.interval,
 events:r.events,endpoint:r.endpoint,metrics:r.contactMetrics})),null,2));
