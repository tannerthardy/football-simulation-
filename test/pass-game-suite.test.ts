import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PASS_CONCEPTS } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { sourceVersion } from '../scripts/source-version.js';
import { buildManifest, frozenInput, instantiate, sha, validateManifest } from '../scripts/diag/pass-suite-cases.js';
import { measure, outcomeMetrics } from '../scripts/diag/pass-suite-measure.js';
import { aggregate, compact, html, makeReport } from '../scripts/diag/pass-suite-report.js';
import { cacheEnvelope, caseKey, main, provenance, readIndex, readJSON, runCampaign, selectCases, validateCache, validateComparison, writeJSON } from '../scripts/diag/pass-game-suite.js';
import type { PlayResult } from '../src/sim/types.js';

const m=buildManifest({commit:'3723204bd0743713bca3e87f10ca01bfebf00a15',source:sourceVersion()});
const dirs:string[]=[];
const temp=()=>{const path=mkdtempSync(join(tmpdir(),'pass-suite-'));dirs.push(path);return path;};
afterEach(()=>{for(const path of dirs.splice(0))rmSync(path,{recursive:true,force:true});});

describe('explicit broad pass-game checkpoint',()=>{
  it('covers the catalog, every coverage and formation, both directions and genuinely different players',()=>{
    validateManifest(m);
    expect(m.cases.length).toBeGreaterThan(3000);expect(m.cases.length).toBeLessThan(3500);
    for(const p of PASS_CONCEPTS)expect(m.cases.some(c=>c.concept===p.id&&c.groups.includes('catalog'))).toBe(true);
    for(const cov of Object.keys(COVERAGE_BY_ID))expect(m.cases.some(c=>m.looks[c.look].coverage.id===cov)).toBe(true);
    for(const f of Object.keys(FORMATION_BY_ID))expect(m.cases.some(c=>c.formation===f)).toBe(true);
    expect(new Set(m.cases.map(c=>c.mirror))).toEqual(new Set([false,true]));
    expect(new Set(m.cases.map(c=>c.roster)).size).toBe(4);
    expect(new Set(m.cases.map(c=>c.inputSha256)).size).toBe(m.cases.length);
    expect(m.cases.some(c=>c.groups.length>1)).toBe(true);
    const shipped=readJSON('config/pass-game-suite-v1.json.gz');
    expect(shipped.cases.map((c:any)=>c.inputSha256)).toEqual(m.cases.map(c=>c.inputSha256));
  });
  it('holds meaningful opposing controls without prescribing the football winner',()=>{
    for(const question of ['pressure/','front/','action/','style/','personnel/','drop/'])
      expect(m.pairs.some(p=>p.id.startsWith(question))).toBe(true);
    const pair=m.pairs.find(p=>p.id.startsWith('pressure/'))!,a=m.cases.find(c=>c.id===pair.a)!,b=m.cases.find(c=>c.id===pair.b)!;
    const ia=frozenInput(m,a),ib=frozenInput(m,b);
    expect(ia.setup.defCall.pressure).toBeNull();expect(ib.setup.defCall.pressure).toBeTruthy();
    expect(ia.setup.offense).toEqual(ib.setup.offense);expect(ia.setup.seed).toBe(ib.setup.seed);
    expect(ia.setup.offCall).toEqual(ib.setup.offCall);expect(ia.setup.defCall.coverage).toEqual(ib.setup.defCall.coverage);
    const pa=m.pairs.find(p=>p.id.startsWith('action/'))!,plain=frozenInput(m,m.cases.find(c=>c.id===pa.a)!).setup.offCall.pass!;
    const fake=frozenInput(m,m.cases.find(c=>c.id===pa.b)!).setup.offCall.pass!;
    expect(plain.fake).toBeUndefined();expect(fake.fake).toBeTruthy();
    expect([plain.strong,plain.weak,plain.back,plain.drop]).toEqual([fake.strong,fake.weak,fake.back,fake.drop]);
  });
  it('freezes actual players and inputs; instantiation does not mutate them or leak scouting between snaps',()=>{
    const c=m.cases.find(c=>c.context==='run_heavy')!,before=sha(frozenInput(m,c));
    const a=instantiate(m,c),b=instantiate(m,c);
    expect(a.scouting).not.toBe(b.scouting);expect(a.offense).not.toBe(b.offense);
    a.offCall.pass!.name='changed';Object.values(a.offense)[0]!.ratings.awareness=1;
    expect(sha(frozenInput(m,c))).toBe(before);expect(sha(frozenInput(m,c))).toBe(c.inputSha256);
    const corrupt=structuredClone(m);corrupt.cases[0].seed++;
    expect(()=>instantiate(corrupt,corrupt.cases[0])).toThrow('Frozen input drift');
  });
  it('rejects unknown/empty selections instead of silently running a different campaign',()=>{
    expect(()=>selectCases(m,'bogus')).toThrow('Unknown group');expect(()=>selectCases(m,undefined,'bogus')).toThrow('Unknown or duplicate');
    const c=m.cases[0];expect(selectCases(m,undefined,c.id)).toEqual([c]);
    expect(()=>selectCases(m,undefined,c.id+','+c.id)).toThrow('duplicate');
  });
  it('requires a reason before execution and a plan creates no World',async()=>{
    await expect(main(['run','missing','missing'])).rejects.toThrow('--checkpoint');
    const out=join(temp(),'plan.json.gz');await main(['plan',out]);
    expect(readFileSync(out).length).toBeGreaterThan(0);
    const cli=spawnSync(process.execPath,['--import','tsx','scripts/diag/pass-game-suite.ts','inspect','missing','missing','missing'],{encoding:'utf8'});
    expect(cli.status).toBe(1);expect(cli.stderr).toContain('--checkpoint');
  });
  it('invalidates caches on every material provenance dimension and detects corrupt payloads',()=>{
    const c=m.cases[0],p=provenance(m),key=caseKey(c,p);
    for(const k of Object.keys(p))expect(caseKey(c,{...p,[k]:'changed'} as unknown as typeof p)).not.toBe(key);
    expect(caseKey({...c,inputSha256:'different-player'},p)).not.toBe(key);
    const fake={case:c,status:'native',marker:1} as unknown as ReturnType<typeof measure>,v=cacheEnvelope(fake,key);
    expect(()=>validateCache(v,key,c)).not.toThrow();v.row.error='corrupt';expect(()=>validateCache(v,key,c)).toThrow('Corrupt');
    for(const status of ['failed','censored-wall'])expect(()=>validateCache(cacheEnvelope({...fake,status},key),key,c)).toThrow('explicit checkpoint');
  });
  it('keeps live prefixes, physical timeouts, fumbles, penalties and returns out of clean terminal YAC',()=>{
    const r={outcome:'tackle',offenseYards:17,turnover:false,score:null,stats:{completed:true,yac:10,tacklers:[]}} as unknown as PlayResult;
    expect(outcomeMetrics(r,true,5,2,3).yac).toBe(10);expect(outcomeMetrics(r,false,4,2,3).gain).toBeNull();
    for(const changed of [{...r,outcome:'timeout'},{...r,turnover:true},{...r,stats:{...r.stats,fumbledBy:'receiver'}},
      {...r,penalty:{kind:'holding'}},{...r,stats:{...r.stats,completed:false}}])expect(outcomeMetrics(changed as PlayResult,true,5,2,3).yac).toBeNull();
  });
  it('observes native movement and consumed cues without changing physical state, perceptions, minds or RNG',()=>{
    const c=m.cases[0],a=measure(m,c,{until:.5}),b=measure(m,c,{until:.5,observe:false}),film=measure(m,c,{until:.5,record:true});
    expect(a.error).toBeNull();expect(a.status).not.toBe('censored-wall');expect(a.physicalSignature).toBe(b.physicalSignature);
    expect(film.physicalSignature).toBe(a.physicalSignature);expect(a.observation.cues.length).toBeGreaterThan(0);
    const clock=a.observation.snapshots.find((s:any)=>s.reason==='clock') as any;
    expect(clock.interval[1]-clock.interval[0]).toBeCloseTo(.05);expect(clock.before).toHaveLength(22);
    expect(clock.raw).toHaveLength(22);expect(clock.final).toHaveLength(22);
    expect(a.metrics.yac).toBeNull();expect(a.status).toBe('censored-sim');
    expect(a.metrics.completedOutcome).toBe(false);
  });
  it('resumes compatible evidence with zero native steps and retains corruption without a retry',()=>{
    const small=structuredClone(m);small.cases=[small.cases[0]];small.pairs=[];
    const out=temp(),a=runCampaign(small,out,{checkpoint:'bounded native runner validation'});
    expect(a.status).toBe('complete');expect(a.runtime.newCases).toBe(1);
    const b=runCampaign(small,out,{checkpoint:'bounded exact-cache reuse validation'});
    expect(b.runtime.newCases).toBe(0);expect(b.runtime.newSteps).toBe(0);expect(b.runtime.cachedCases).toBe(1);
    expect(readIndex(join(out,'index.json')).runtime.cachedCases).toBe(1);
    const p=provenance(small);validateComparison(a,small,small.cases,p);
    for(const k of ['operator','manifest','node','platform','arch','lock','collector'])
      expect(()=>validateComparison(a,small,small.cases,{...p,[k]:'changed'})).toThrow('Incompatible');
    expect(()=>validateComparison({...a,status:'blocked'},small,small.cases,p)).toThrow('incomplete');
    expect(()=>validateComparison(a,small,small.cases,{...p,flags:{different:'1'}})).toThrow('Settings');
    expect(()=>validateComparison(a,small,small.cases,{...p,flags:{different:'1'}},'intentional bounded flag experiment')).not.toThrow();
    const report=makeReport(b,small,a);expect(report.comparisons[0].physicalChanged).toBe(false);
    expect(report.summary.cleanYacCatches).toBe(a.rows[0].metrics.yac===null?0:1);
    expect(html({...report,checkpoint:'</script><script>bad</script>'})).not.toContain('</script><script>bad');
    const cache=a.rows[0].cache;writeFileSync(cache,'corrupt');
    const corrupt=runCampaign(small,out,{checkpoint:'bounded corruption check'});expect(corrupt.status).toBe('blocked');
    expect(corrupt.runtime.newCases).toBe(0);expect(corrupt.skipped).toHaveLength(1);
  });
  it('writes censored prefixes distinctly and stops before simulating a budget-exhausted tail',()=>{
    const small=structuredClone(m);small.cases=small.cases.slice(0,2);small.pairs=[];small.budgets.caseMs=.000001;
    const out=temp(),a=runCampaign(small,out,{checkpoint:'bounded wall-budget validation'});
    expect(a.status).toBe('blocked');expect(a.rows).toHaveLength(1);expect(a.rows[0].status).toBe('censored-wall');
    expect(a.rows[0].metrics.yac).toBeNull();expect(a.skipped).toHaveLength(1);
    const b=runCampaign(small,out,{checkpoint:'verify wall prefix is not silently repeated'});expect(b.runtime.newCases).toBe(0);expect(b.status).toBe('blocked');
    small.budgets.caseMs=5000;small.budgets.campaignMs=.000001;
    const c=runCampaign(small,temp(),{checkpoint:'bounded campaign-budget validation'});
    expect(c.status).toBe('budget-exhausted');expect(c.runtime.newCases).toBe(0);expect(c.skipped).toHaveLength(2);
  });
  it('reports unweighted denominators and accepts increased YAC as evidence requiring interpretation',()=>{
    const metric=outcomeMetrics({outcome:'tackle',offenseYards:4,turnover:false,stats:{completed:true,yac:0,tacklers:[]}} as unknown as PlayResult,true,4,2,3);
    const row={case:m.cases[0],status:'native',metrics:metric,contact:{firstLoadedAt:null}} as any;
    const s=aggregate([row,{...row,status:'censored-sim',metrics:{...metric,completedOutcome:false,yac:null,gain:null}}]);
    expect(s.catches).toBe(2);expect(s.cleanYacCatches).toBe(1);expect(s.finished).toBe(1);expect(s.yac.mean).toBe(0);
  });
  it('checks index integrity before trusting a comparison or offline report',()=>{
    const path=join(temp(),'index.json');writeJSON(path,{schema:'pass-game-index-envelope-v1',sha256:'wrong',index:{}});
    expect(()=>readIndex(path)).toThrow('Corrupt index');
  });
});
