/** Reproduce the bounded diagnostic source without executing football. */
import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';
import{readFileSync,writeFileSync,mkdirSync,readdirSync}from'node:fs';import{resolve,join,dirname}from'node:path';import{createHash}from'node:crypto';
const out=resolve(process.argv[2]??'out/run-entry-approach/isolated-runtime'),original='f62511a513f2187884d74ae3b94435835e43309c',candidate='f5618ec2ce1c52ad7a99ab32686b30e01a1cda92';
const git=(...args)=>execFileSync('git',args,{maxBuffer:100*1024*1024});const sha=b=>createHash('sha256').update(b).digest('hex');
const put=(p,b)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,b);};
for(const p of git('ls-tree','-r','--name-only',original,'--','src','package.json').toString().trim().split('\n'))put(join(out,p),git('show',`${original}:${p}`));
const path='src/sim/behaviors/carrier.ts',before=git('show',`${original}:${path}`).toString(),after=git('show',`${candidate}:${path}`).toString();
const loop=s=>{const a=s.indexOf('    for(const d of sim.opponents(a)) {',s.indexOf('export function runReadAim')),b=s.indexOf('    const score=',a);assert(a>=0&&b>a);return s.slice(a,b);};
const oldLoop=loop(before),newLoop=loop(after);
assert.equal(sha(oldLoop),'524bbfa6f7cd55d5445f55601e75072531cd6be762d0c82e0081acc14b2089e3');
assert.equal(sha(newLoop),'846fe941b31545710a5bfa91c239e0e3ce341660235b2a00056b578c1f9f303f');
const gate='globalThis.__entryCueCases?.has(sim)&&sim.t<3';
const gated=after.replace(newLoop,`    if(${gate}){\n${newLoop}    }else{\n${oldLoop}    }\n`)
 .replace('if(entryApproach&&!sim.bond',`if(${gate}&&entryApproach&&!sim.bond`);
assert.notEqual(gated,after);put(join(out,path),gated);put(join(out,'src/sim/run-approach.ts'),git('show',`${candidate}:src/sim/run-approach.ts`));
const files=p=>readdirSync(join(out,p),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(p,e.name)):[join(p,e.name)]).sort();
const h=createHash('sha256');for(const p of files('src'))h.update(p).update('\0').update(readFileSync(join(out,p))).update('\0');
const receipt={original,candidate,sourceSha256:h.digest('hex'),productionRiskLoopSha256:sha(newLoop),productionApproachModuleSha256:sha(git('show',`${candidate}:src/sim/run-approach.ts`)),gate:'Exact production changes only on selected encounters through3s. Earlier plays unmodified; no fixture state supplied to a controller.'};
put(join(out,'../isolated-source.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
