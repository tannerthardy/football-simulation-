import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { caseKey, readJSON, provenance, sha, type Manifest } from '../scripts/diag/run-action-suite.js';
import { CATALOG, checkExecution, pairId, preflightEvidence, reserveManifest, selectCases, sharedRegistry } from '../scripts/diag/run-suite-workflow.js';

const m = readJSON(CATALOG) as Manifest;
const focus = readJSON('config/run-suite-focus.json');
describe('practical run-suite workflow (zero simulated ticks)', () => {
  it('partitions the preserved catalog without billing shared PA to both owners', () => {
    const runs = selectCases(m,{ partition:'accepted-runs' }).cases;
    const pa = selectCases(m,{ partition:'shared-pa' }).cases;
    expect(runs).toHaveLength(1176); expect(pa).toHaveLength(432);
    expect(new Set([...runs,...pa].map(c => c.id)).size).toBe(1608);
    expect(selectCases(m,{ partition:'all-accepted' }).cases).toHaveLength(1608);
    expect(() => selectCases(m,{ partition:'prototypes' })).toThrow('host mismatch');
    expect(() => selectCases({ ...m,host:'perimeter' },{ partition:'accepted-runs' })).toThrow('host mismatch');
  });

  it('selects mechanism witnesses and controls without changing the original manifest/cache keys', () => {
    expect(focus.catalogSha256).toBe(sha(m));
    const before = sha(m), p = provenance(m);
    for (const set of Object.values(focus.sets) as Array<{ids:string[]}>) {
      const result = selectCases(m,{ ids:set.ids });
      expect(result.cases.length).toBeGreaterThanOrEqual(2); expect(result.cases.length).toBeLessThanOrEqual(4);
      for (const c of result.cases) expect(caseKey(m,c,p)).toBe(caseKey(m,m.cases.find(old => old.id === c.id)!,p));
    }
    expect(sha(m)).toBe(before);
  });

  it('closes a PA pair and deduplicates an overlapping request using canonical IDs', () => {
    const pa = m.cases.find(c => c.arm === 'pa')!, result = selectCases(m,{ ids:[pa.id] });
    expect(result.cases).toHaveLength(2); expect(result.addedControls).toHaveLength(1);
    expect(new Set(result.cases.map(pairId)).size).toBe(1);
    expect(new Set(result.cases.map(c => c.arm))).toEqual(new Set(['pa','plain']));
    const both = selectCases(m,{ ids:result.cases.map(c => c.id) });
    expect(both.cases).toHaveLength(2); expect(both.addedControls).toHaveLength(0);
    const broken = structuredClone(m); broken.cases = broken.cases.filter(c => c.id !== result.addedControls[0]);
    expect(() => selectCases(broken,{ ids:[pa.id] })).toThrow('Incomplete PA pair');
  });

  it('exports the same 216 pairs and existing run counterparts, not new pass-suite copies', () => {
    const registry = sharedRegistry(m);
    expect(registry.pairs).toHaveLength(216); expect(registry.catalogSha256).toBe(sha(m));
    expect(new Set(registry.pairs.flatMap(p => p.cases.map(c => c.id))).size).toBe(432);
    for (const p of registry.pairs) {
      expect(p.runCounterpart.id).toBe(m.cases.find(c => c.id === p.runCounterpart.id)!.id);
      expect(p.runCounterpart.inputSha256).toHaveLength(64);
    }
  });

  it('rejects empty, unknown, duplicate or ambiguous selection instead of falling back to a census', () => {
    expect(() => selectCases(m,{})).toThrow('Choose one');
    expect(() => selectCases(m,{ids:[]})).toThrow('Empty');
    expect(() => selectCases(m,{ids:['not-a-case']})).toThrow('Unknown case');
    expect(() => selectCases(m,{ids:[m.cases[0].id,m.cases[0].id]})).toThrow('duplicate');
    expect(() => selectCases(m,{ids:[m.cases[0].id],partition:'all-accepted'})).toThrow('Choose one');
  });

  it('freezes eight unrun execution inputs while retaining the actual players and avoiding old hashes', () => {
    const spec = readJSON('config/run-suite-reserve.json'), reserved = reserveManifest(m,spec);
    expect(reserved.cases).toHaveLength(8);
    expect(new Set(reserved.cases.map(c => c.inputSha256)).size).toBe(8);
    expect(reserved.rosters).toEqual(m.rosters);
    expect(reserved.cases.every(c => !m.cases.some(old => old.inputSha256 === c.inputSha256))).toBe(true);
    expect(new Set(reserved.cases.map(c => c.seed))).toEqual(new Set([902117]));
    expect(() => reserveManifest(m,{...spec,catalogSha256:'changed'})).toThrow('Invalid reserve');
    expect(() => reserveManifest(m,{...spec,seed:77})).toThrow('Reserve drift');
  });

  it('requires an exact code pin, settings and bounded daily selection before execution', () => {
    const p = provenance(m), profile = readJSON('config/baseline.json');
    const configured = {...p,node:'v'+profile.nodeVersion,flags:profile.flags};
    const settings = {mode:'focus',reason:'One concrete question',pin:'a'.repeat(40),source:p.source};
    expect(() => checkExecution(m,m.cases.slice(0,2),configured,settings,settings.pin)).not.toThrow();
    expect(() => checkExecution(m,m.cases,configured,settings,settings.pin)).toThrow('exceeds 32');
    expect(() => checkExecution(m,m.cases,configured,{...settings,mode:'checkpoint'},settings.pin)).not.toThrow();
    expect(() => checkExecution(m,m.cases.slice(0,2),configured,{...settings,reason:''},settings.pin)).toThrow('reason');
    expect(() => checkExecution(m,m.cases.slice(0,2),configured,settings,'b'.repeat(40))).toThrow('Exact HEAD');
    expect(() => checkExecution(m,m.cases.slice(0,2),{...configured,source:'changed'},settings,settings.pin)).toThrow('source pin');
    expect(() => checkExecution(m,m.cases.slice(0,2),{...configured,node:'v20'},settings,settings.pin)).toThrow('pinned Node');
    expect(() => checkExecution(m,m.cases.slice(0,2),{...configured,flags:{...configured.flags,RUN_CONTACT_COMPONENTS:'0'}},settings,settings.pin)).toThrow('settings');
    const prototype = readJSON('data/reviews/current/run-action-suite/perimeter-manifest.json.gz') as Manifest;
    expect(() => checkExecution(prototype,prototype.cases.slice(0,2),configured,settings,settings.pin)).toThrow('Prototype calls absent');
  });

  it('preflights every baseline row, rejecting missing/corrupt/stale evidence without launching a baseline', () => {
    const dir = mkdtempSync(join(tmpdir(),'run-suite-')), cases = m.cases.slice(0,2), p = provenance(m);
    try {
      const entries = cases.map((c,i) => {
        const key = caseKey(m,c,p), path = join(dir,i+'.json');
        const row = {case:c,status:'native',physicalSignature:'signature'};
        writeFileSync(path,JSON.stringify({key,row,rowSha256:sha(row)})); return {id:c.id,key,path};
      });
      const index = {status:'complete',provenance:p,rows:entries};
      expect(preflightEvidence(m,cases,{...p,source:'intentional candidate source'},index).size).toBe(2);
      expect(() => preflightEvidence(m,cases,p,{...index,rows:entries.slice(0,1)})).toThrow('Missing comparison');
      expect(() => preflightEvidence(m,cases,{...p,collector:'changed'},index)).toThrow('Incompatible');
      expect(() => preflightEvidence(m,cases,p,{...index,rows:entries.map(e => ({...e,key:'stale'}))})).toThrow('Stale');
      writeFileSync(entries[1].path,JSON.stringify({key:entries[1].key,row:{case:cases[1]},rowSha256:'corrupt'}));
      expect(() => preflightEvidence(m,cases,p,index)).toThrow('Corrupt cache');
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
});
