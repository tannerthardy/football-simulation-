/** Exact predeclared selectors/transforms. No random redraw or altered player
 * capacities. Keep old acquired input manifests and reference files intact. */
import {readFileSync} from 'node:fs';
import {sharedWorkInput} from './grip-shared-work-scene.js';
import type {SharedGripInput} from './grip-force-shared.js';
export function phaseInputs(){
  const manifest=JSON.parse(readFileSync('config/grip-phase-inputs.json','utf8')),
    fixtures=[...JSON.parse(readFileSync('config/grip-shared-reference.json','utf8')).cases,
      ...JSON.parse(readFileSync('config/grip-shared-fresh-reference.json','utf8')).cases];
  return manifest.cases.map((c:any)=>{
    const input:SharedGripInput=structuredClone(fixtures.find(f=>f.id===c.fixture).input);
    if(c.secondLegs!==undefined)input.grips[1].legs=c.secondLegs;
    if(c.secondMaterialYDelta!==undefined)input.grips[1].material.y+=c.secondMaterialYDelta;
    if(c.heldSpin!==undefined)input.bodies[1].spin=c.heldSpin;
    if(c.mirror){
      for(const b of input.bodies){b.pos.y*=-1;b.vel.y*=-1;b.spin*=-1;b.facing*=-1;}
      for(const g of input.grips)g.material.y*=-1;input.footOffset.y*=-1;
    }
    return {id:c.id,selector:c,input:sharedWorkInput(input,c.duration)};
  }) as Array<{id:string;selector:any;input:SharedGripInput}>;
}
