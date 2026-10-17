/** One actual acquired loaded-blocker spacing decision; zero World ticks. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Agent,type Engagement} from '../../../src/sim/agent.js';
import {spaceTeammates} from '../../../src/sim/spacing.js';
import type {Intent} from '../../../src/physics/world.js';
import type {Perceived} from '../../../src/sim/perception.js';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Explicit witness/output required');
const bytes=readFileSync(input),saved=JSON.parse((input.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
const witness=saved.rows?.[0]?.traffic?.[0]??saved;
const {actor,peers,raw,chosen,t}=witness;
const actors=[actor,...peers].sort((a,b)=>a.idx-b.idx).map(p=>new Agent(p.idx,p.team,p.slot,actor.player,p.profile,
 p===actor?structuredClone(actor.body):{pos:{...p.picture.pos},vel:{...p.picture.vel},energy:1,facing:0,profile:p.profile},
 {kind:'runBlock',update(){throw Error('No extra decision');}}));
const blocker=actors.find(a=>a.idx===actor.idx)!;
if(actor.engaged)blocker.engagement={}as Engagement;
const intents:Intent[]=[];intents[actor.idx]=structuredClone(raw);
const pictures=new Map<number,Perceived>(peers.map((p:any)=>[p.idx,p.picture]));
spaceTeammates(actors,intents,(_a,b)=>structuredClone(pictures.get(b.idx)!),{now:t});
if(JSON.stringify(intents[actor.idx])!==JSON.stringify(chosen))throw Error('Portable decision differs from native');
writeFileSync(output,JSON.stringify({physicsTicks:0,exactNativeDecision:true,t,slot:actor.slot,raw,chosen},null,2));
console.log(JSON.stringify({physicsTicks:0,exactNativeDecision:true,t,slot:actor.slot,raw:raw.vel,chosen:chosen.vel}));
