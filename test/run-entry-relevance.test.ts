import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {chooseRunApproach} from '../src/sim/run-approach.js';
import {unknownRouteRelevance} from '../scripts/diag/run-entry-relevance.js';
const saved=JSON.parse(readFileSync(new URL('./fixtures/run-entry-approach.json',import.meta.url),'utf8'));
describe('diagnostic ordinary-motion route relevance',()=>{
  it('separates the distant stale receiver from a nearby stale QB without restoring either velocity',()=>{
    const s=structuredClone(saved.failing),actors=saved.entryScenes.find((s:any)=>s.id==='failing').actors;
    for(const idx of [0,8])Object.defineProperty(s.peers.find((p:any)=>p.id===idx).picture,'vel',{
      get(){throw Error('Sentinel zero cannot reconstruct historical motion');}});
    const r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
    expect(r.status).toBe('unknown');expect(r.unknownPeers).toEqual([0,8]);
    for(const c of r.choices)for(const idx of [0,8]){
      const p=s.peers.find((p:any)=>p.id===idx),bound=unknownRouteRelevance(s.body.pos,s.body.profile.radius,c.path,p.picture,p.radius,actors[idx].profile.vmax);
      expect(bound.motion).toBe('unknown');
      expect(bound.relevance).toBe(idx===8?'disjoint':'possibly-relevant');
    }
    // This is an explanatory bound; it changes no production certificate.
    expect(r.minimumGap).toBeNull();
  });
  it('does not create route evidence for unavailable information',()=>{
    const s=structuredClone(saved.clear),r=chooseRunApproach(s.body,s.command,[],s.t,'center');
    expect(unknownRouteRelevance(s.body.pos,s.body.profile.radius,r.path,{source:'unavailable'},.3,9))
      .toEqual({motion:'unknown',relevance:'unsupported',minimumOrdinaryGap:null});
  });
});
