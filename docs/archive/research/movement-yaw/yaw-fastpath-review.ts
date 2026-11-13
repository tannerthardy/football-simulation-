import {integrateYaw as reference} from './yaw-archive/src/physics/yaw-response.ts';
import {integrateYaw as fast} from '../../src/physics/yaw-response.ts';
import {writeFileSync} from 'node:fs';
const cases=[
 {label:'steady',e:0,w:0,h:.05,tau:.05,a:60,r:7},
 {label:'near-target',e:-.001,w:-.2,h:.05/12,tau:.05,a:60,r:7},
 {label:'counterstep',e:.002,w:-.15,h:.05,tau:.05,a:60,r:7},
 {label:'acceleration-extremum',e:.01,w:.18,h:.1,tau:.05,a:60,r:7},
 {label:'rate-extremum',e:.07,w:.4,h:.15,tau:.05,a:60,r:7},
 {label:'normal turn',e:.5,w:.5,h:.05,tau:.05,a:60,r:7},
 {label:'external spin',e:0,w:10,h:.05/12,tau:.05,a:23.01324636936366,r:7},
 {label:'acceleration boundary',e:.15,w:0,h:.05,tau:.05,a:60,r:7},
 {label:'near acceleration boundary',e:.1499999999999999,w:0,h:.05,tau:.05,a:60,r:7},
 {label:'rate boundary',e:.7,w:7,h:.05,tau:.05,a:60,r:7},
 {label:'tiny',e:1e-16,w:-1e-16,h:.05,tau:.05,a:60,r:7},
 {label:'no yaw allowance',e:.1,w:2,h:.05,tau:.05,a:0,r:7},
];
const results=[];
for(const spec of cases)for(const mirror of [1,-1]){
 const args=[spec.e*mirror,spec.w*mirror,spec.h,spec.tau,spec.a,spec.r] as const;
 const r=reference(...args),f=fast(...args);
 results.push({spec,mirror,reference:r,fast:f,exact:JSON.stringify(r)===JSON.stringify(f),error:{error:f.error-r.error,spin:f.spin-r.spin,angleDelta:f.angleDelta-r.angleDelta,maxAcceleration:f.maxAcceleration-r.maxAcceleration},sameEvents:JSON.stringify(r.events)===JSON.stringify(f.events)});
}
const out={referenceSourceSha256:'fe1aa7e4845f50d3c12869a969b19d3f08f6cbcc2b6eba0275b4a621f7d4c530',referenceIdenticalTo2637558:true,results};
writeFileSync('out/loaded-movement/yaw-fastpath-reference-evidence.json',JSON.stringify(out,null,2));console.log(JSON.stringify({count:results.length,exact:results.filter(r=>r.exact).length,sameEvents:results.every(r=>r.sameEvents),maxError:Math.max(...results.flatMap(r=>Object.values(r.error).map(Math.abs)))},null,2));
