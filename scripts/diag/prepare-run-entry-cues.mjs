/** Materialize immutable, already-published inputs and the bounded diagnostic
 * engine. Zero football execution. Run from the candidate repo root.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const out=resolve(process.argv[2]??'out/run-entry-cues/reproduction');
const recorded='f62511a513f2187884d74ae3b94435835e43309c';
const candidate='7f9d9a4b2e40946129281ae382c8483f717e8c5d';
const pr57='e8a76a7f7cdc19dece85288f93a8d1e1273be0db';
const inputs='4ae667e29b3ce085f43c5cb911b294349cda2b8f';
const git=(...args)=>execFileSync('git',args,{maxBuffer:100*1024*1024});
const sha=b=>createHash('sha256').update(b).digest('hex');
function put(p,b){mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b);}
const engine=join(out,'isolated-runtime');
for(const p of git('ls-tree','-r','--name-only',recorded,'--','src','package.json').toString().trim().split('\n'))
 put(join(engine,p),git('show',`${recorded}:${p}`));
const p='src/sim/behaviors/carrier.ts',original=readFileSync(join(engine,p),'utf8'),next=git('show',`${candidate}:${p}`).toString();
const loop=s=>{const a=s.indexOf('    for(const d of sim.opponents(a)) {',s.indexOf('export function runReadAim')),
 b=s.indexOf('    const score=',a);assert(a>=0&&b>a);return s.slice(a,b);};
const oldLoop=loop(original),newLoop=loop(next);
assert.equal(sha(oldLoop),'524bbfa6f7cd55d5445f55601e75072531cd6be762d0c82e0081acc14b2089e3');
assert.equal(sha(newLoop),'846fe941b31545710a5bfa91c239e0e3ce341660235b2a00056b578c1f9f303f');
put(join(engine,p),original.replace(oldLoop,'    if(globalThis.__entryCueCases?.has(sim)&&sim.t<3){\n'+newLoop+'    }else{\n'+oldLoop+'    }\n'));
const files=(p)=>readdirSync(join(engine,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();
const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(engine,p))).update('\0');
const source=h.digest('hex');assert.equal(source,'a8434b906fb0a0dfa66f16b20feaacbce84be8b9e890d30c7900bb6aadfeb18d');
const saved=JSON.parse(readFileSync('docs/reviews/run-entry-cues/summary.json')).inputs;
for(const [file,ref,path,key] of [
 ['inputs.json',inputs,'data/reviews/current/experimental-game-inputs.json','manifestSha256'],
 ['original.json.gz',pr57,'data/reviews/current/experimental-game-checkpoint/experimental/zone-reference/game.json.gz','originalGameSha256'],
 ['witnesses.json.gz',pr57,'docs/reviews/designed-run-games/witnesses.json.gz','witnessSha256'],
]){const b=git('show',`${ref}:${path}`);assert.equal(sha(b),saved[key],file+' changed');put(join(out,file),b);}
console.log(JSON.stringify({out,source,physicalScrimmages:0,completedGames:0}));
