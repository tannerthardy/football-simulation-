import {describe,it,expect} from 'vitest';
import {supportReplay,replayDifference,facingWitness,smallFacingControl,checkReplay} from '../scripts/diag/physics/support-command-audit.js';
// These are causal/mechanical contracts on the saved checkpoint, not a pin on
// tackle endings or a claim that opposite permitted turns must agree.
describe('saved support histories: separate turn-choice branch from recovery sensitivity',()=>{
  it('observes the same physical interval without changing its state or accounting',()=>{
    const a=supportReplay('previous'),b=supportReplay('previous','none',0,false);
    expect(a.bodies).toEqual(b.bodies);expect(a.report).toEqual(b.report);expect(a.attachment).toEqual(b.attachment);
  });
  it('keeps equivalent angle representations equivalent; nearby non-antipodal headings choose the same turn',()=>{
    const a=facingWitness('previous'),b=facingWitness('transition');
    expect(a.antipodeMargin).toBeGreaterThan(0);expect(b.antipodeMargin).toBeLessThan(0);
    expect(a.requestedTurn).toBeGreaterThan(0);expect(b.requestedTurn).toBeLessThan(0);
    for(const h of ['previous','transition'] as const)expect(smallFacingControl(h,1e-6)).toBeCloseTo(smallFacingControl(h,-1e-6),14);
  });
  it.each(['previous','transition'] as const)('isolates yaw-target causality rather than forcing support histories to agree: %s',h=>{
    const original=supportReplay(h),other=supportReplay(h==='previous'?'transition':'previous'),xi=supportReplay(h,'xi'),yaw=supportReplay(h,'held-yaw');
    const gap=replayDifference(original,other).xi;
    expect(replayDifference(original,xi).xi).toBeLessThan(gap*.1);
    expect(replayDifference(other,yaw).xi).toBeLessThan(gap*.1);
    for(const r of [original,xi,yaw]){
      const a=checkReplay(r);expect(a.energy).toBeLessThan(1e-8);expect(a.support).toBeLessThan(1e-12);expect(a.reserve).toBeLessThan(1e-8);
      expect(a.strengthExcess).toBeLessThan(1e-7);expect(a.tractionExcess).toBeLessThan(1e-7);expect(a.commandExcess).toBeLessThan(1e-12);
    }
  });
});
