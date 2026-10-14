/** Portable acquired native group, preserving requests, material graph and
 * tick accounting. Each 5.5KB two-body input was checked against its original
 * 22-body interval, exactly on body/support/point/work. No solver answers. */
import {readFileSync} from 'node:fs';
import {deserialize} from 'node:v8';
import {World} from '../../../src/physics/world.js';
import {sha} from './grip-bounded-fixtures.js';
import type {ActiveGripSolver} from '../../../src/physics/active-grip.js';
export function nativeForceFixture(id='patch-45-8-0-3001-1',phase=16,mode:'legacy'|'owned'|'combined'='combined',solver?:ActiveGripSolver){
  const manifest=JSON.parse(readFileSync('config/grip-native-world-packets.json','utf8')),c=manifest.cases.find((c:any)=>c.id===id&&c.phase===phase);
  if(!c)throw Error('Missing retained native phase');
  const bytes=Buffer.from(c.input,'base64');if(sha(bytes)!==c.reducedPacketSha256)throw Error('Native input changed');
  const p=deserialize(bytes),w:any=Object.assign(Object.create(World.prototype),p.fields);w.attachments=new WeakMap(p.attachments);
  if(mode!=='legacy')w.materialTransport='owned';if(mode==='combined'&&solver)w.activeGrip=solver;
  const args=p.args,H=args[3];
  return {id,checksum:c.nativePacketSha256,p,w,joint:w.joints[0],H,phase,args,
    advance:(n=1)=>{for(let k=0;k<n;k++){const a=[...args];a[4]-=k*H;w.integrateSubstep(...a);}return w.report;}};
}
