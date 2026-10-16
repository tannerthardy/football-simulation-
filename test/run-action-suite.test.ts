import { describe, expect, it } from 'vitest';
import { auditSchematicSnap } from '../src/lab/schematic-stress.js';
import { buildManifest, caseKey, frozenInput, makeSim, measure, PRIMARY, provenance, sha, TRANSFER,
  validateCache, validateManifest, type Case } from '../scripts/diag/run-action-suite.js';

const manifest=buildManifest();
const find=(partial:Partial<Case>)=>manifest.cases.find(c=>Object.entries(partial).every(([k,v])=>c[k as keyof Case]===v))!;
describe('declared extensive run/PA checkpoint',()=>{
  it('covers every installed run family, actual directions, looks and predeclared transfers without duplicate IDs',()=>{
    expect(PRIMARY).toHaveLength(11);expect(TRANSFER).toHaveLength(19);
    expect(manifest.cases).toHaveLength(1608);
    expect(manifest.cases.filter(c=>c.phase==='primary')).toHaveLength(880);
    expect(manifest.cases.filter(c=>c.phase==='transfer')).toHaveLength(152);
    expect(manifest.cases.filter(c=>c.phase==='reaction')).toHaveLength(144);
    expect(manifest.cases.filter(c=>c.phase==='pa')).toHaveLength(432);
    expect(new Set(manifest.cases.map(c=>c.id)).size).toBe(1608);
    expect(()=>validateManifest(manifest)).not.toThrow();
    const ids=new Set(manifest.cases.filter(c=>c.arm==='run').map(c=>frozenInput(manifest,c).setup.offCall.run!.id));
    for(const id of ['iz_strong','iz_weak','oz_strong','oz_weak','wz_strong','wz_weak','split_zone','power','counter','duo','trap','draw','toss','lab_qb_draw'])expect(ids.has(id)).toBe(true);
  });

  it('keeps legal 22-player native installs in all families/fronts/transfers and both actual directions',()=>{
    const selected=new Map<string,Case>();
    for(const c of manifest.cases.filter(c=>c.arm==='run'))selected.set([c.family,c.formation,c.look,c.direction].join('/'),c);
    for(const c of selected.values()){
      const sim=makeSim(manifest,c),snap=auditSchematicSnap(sim);
      expect(snap.legality.onLineCount).toBe(7);expect(snap.legality.offLineCount).toBe(4);
      expect(sim.agents).toHaveLength(22);expect(sim.t).toBe(0);
      expect((sim.offCall.run!.direction==='strong'?1:-1)).toBe(c.direction==='strong'?1:-1);
    }
  });

  it('PA and plain controls retain routes, selected athletes, defensive call, situation, drop depth and seed',()=>{
    for(const c of manifest.cases.filter(c=>c.arm==='pa')){
      // Locate by declared matching keys rather than treating the whole
      // different case ID as a matched-control key.
      const pair=manifest.cases.find(p=>p.arm==='plain'&&['package','look','roster','seed','context','formation'].every(k=>p[k as keyof Case]===c[k as keyof Case]))!;
      expect(pair).toBeDefined();
      const a=frozenInput(manifest,c),b=frozenInput(manifest,pair);
      const pa=a.setup.offCall.pass!,no=b.setup.offCall.pass!;
      expect(pa.fake).toBeTruthy();expect(pa.family).toBe('playaction');expect(no.fake).toBeUndefined();expect(no.family).toBe('dropback');
      const {id:ai,name:an,fake:af,family:ak,...ap}=pa;
      const {id:bi,name:bn,fake:bf,family:bk,...bp}=no;
      expect(ap).toEqual(bp);
      const {offCall:ac,...ar}=a.setup,{offCall:bc,...br}=b.setup;
      expect(ar).toEqual(br);expect(a.history).toEqual(b.history);
    }
  });

  it('reconstructs independent legitimate scouting histories without learning another arm’s result',()=>{
    const c=find({arm:'pa',context:'runheavy',package:'flood'}),n=find({arm:'pa',context:'neutral',package:'flood',look:c.look,roster:c.roster,seed:c.seed});
    const heavy=makeSim(manifest,c),neutral=makeSim(manifest,n),again=makeSim(manifest,c);
    expect(manifest.contexts.runheavy.history.filter(x=>!x)).toHaveLength(18);
    expect(heavy.defense[0].recog!.pPass()).toBeLessThan(neutral.defense[0].recog!.pPass());
    expect(heavy.defense.map(d=>d.recog!.pPass())).toEqual(again.defense.map(d=>d.recog!.pPass()));
    expect(heavy.agents.map(a=>a.pos)).toEqual(neutral.agents.map(a=>a.pos));
  });

  it('refuses a changed input and corrupt result before silently reusing evidence',()=>{
    const c=manifest.cases[0],copy=structuredClone(manifest);copy.contexts.neutral.distance=7;
    expect(()=>makeSim(copy,c)).toThrow('Input drift');
    const p=provenance(manifest),key=caseKey(manifest,c,p),row={case:c,status:'native'};
    expect(()=>validateCache({key,row,rowSha256:sha(row)},key,c)).not.toThrow();
    expect(()=>validateCache({key,row,rowSha256:'bad'},key,c)).toThrow('Corrupt cache');
    expect(caseKey(manifest,c,{...p,source:'changed'})).not.toBe(key);
    expect(caseKey(manifest,c,{...p,flags:{...p.flags,RUN_CONTACT_COMPONENTS:'0'}})).not.toBe(key);
  });

  it('marks a live prefix as censored and never publishes placeholder terminal yardage',()=>{
    const c=find({family:'wideZone',phase:'primary',look:'over3',direction:'strong'});
    const row=measure(manifest,c,{until:.2});
    expect(row.status).toBe('censored-sim');expect(row.metrics.terminal).toBe(false);
    expect(row.metrics.gain).toBeNull();expect(row.metrics.success).toBeNull();expect(row.metrics.outcome).toBeNull();
  });

  it('observation and recording preserve the native loaded opening and RNG',()=>{
    const c=find({family:'wideZone',phase:'primary',look:'over3',direction:'strong'});
    const observed=measure(manifest,c,{until:1.1,record:true}),plain=measure(manifest,c,{until:1.1,observe:false});
    expect(observed.physicalSignature).toBe(plain.physicalSignature);
    expect(observed.observation.loads.length).toBeGreaterThan(0);
    expect(observed.observation.frames[0].afterAt).toBeGreaterThan(observed.observation.frames[0].beforeAt);
    expect(observed.observation.invariants.workResidual).toBeLessThan(1e-6);
  });

  it('demonstrates that relabeling the native fake does not install another run action',()=>{
    const c=find({arm:'pa',package:'flood',context:'neutral',look:'over3'}),other=structuredClone(manifest);
    other.passes.flood.fake='counter';
    const cc:Case={...c,inputSha256:undefined};cc.inputSha256=sha(frozenInput(other,cc));
    const a=measure(manifest,c,{until:1.1}),b=measure(other,cc,{until:1.1});
    expect(a.physicalSignature).toBe(b.physicalSignature);
    expect(a.observation.frames.map(f=>f.agents)).toEqual(b.observation.frames.map(f=>f.agents));
    expect(makeSim(manifest,c).offense.filter(a=>['LT','LG','C','RG','RT'].includes(a.slot)).map(a=>a.behavior.kind))
      .toEqual(Array(5).fill('pass-pro'));
  });
});
