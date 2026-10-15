/** Reuse immutable published input bytes. Zero football execution. */
import assert from 'node:assert/strict';import{execFileSync}from'node:child_process';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
const out=resolve(process.argv[2]??'out/run-entry-admission/inputs'),s=JSON.parse(readFileSync('docs/reviews/run-entry-admission/summary.json')).inputs;
mkdirSync(out,{recursive:true});const specs=[
 ['manifest.json','4ae667e29b3ce085f43c5cb911b294349cda2b8f','data/reviews/current/experimental-game-inputs.json','manifestSha256'],
 ['original.json.gz','e8a76a7f7cdc19dece85288f93a8d1e1273be0db','data/reviews/current/experimental-game-checkpoint/experimental/zone-reference/game.json.gz','originalGameSha256'],
 ['witnesses.json.gz','e8a76a7f7cdc19dece85288f93a8d1e1273be0db','docs/reviews/designed-run-games/witnesses.json.gz','witnessSha256'],
 ['information-only.json.gz','4ee0e2cdc8480f271fc3d8e9178f6abd949b3f9e','docs/reviews/run-entry-cues/native.json.gz','infoTraceSha256']];
for(const[file,ref,path,key]of specs){const bytes=execFileSync('git',['show',`${ref}:${path}`],{maxBuffer:100*1024*1024});assert.equal(createHash('sha256').update(bytes).digest('hex'),s[key],file);writeFileSync(join(out,file),bytes);}
console.log(JSON.stringify({out,files:specs.map(s=>s[0]),physicalScrimmages:0}));
