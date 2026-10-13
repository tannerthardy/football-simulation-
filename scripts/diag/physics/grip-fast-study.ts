/** Uninstrumented held-control cost/profile entry point. Physics defaults and
 * controller-rate tape are explicit; CPU profiler is supplied by node CLI.
 */
import { deserialize } from 'node:v8';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { World } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';
const root = 'out/grip-fast'; mkdirSync(root, { recursive: true });
const tape = deserialize(readFileSync('out/grip-timing-followup/patch-45-8-0-3001-1-tape.bin'));
const p = structuredClone(tape), w: any = Object.assign(Object.create(World.prototype), p.fields);
w.attachments = new WeakMap(p.attachments); w.substeps = 12; w.gripTiming = 'resolved';
const source = sourceVersion(), start = performance.now();
for (const e of p.entries) w.step(e.intents,e.dt);
const result = { source, seconds: (performance.now()-start)/1000, end: p.ids.map((i: number)=>
  ({i,pos:w.bodies[i].pos,energy:w.bodies[i].energy,state:w.bodies[i].support.state})) };
writeFileSync(`${root}/slow-profile.json`,JSON.stringify(result,null,2)); console.log(JSON.stringify(result));
