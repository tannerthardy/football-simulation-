/** Separate experimental integration candidate. Same physical operator and
 * convergence tolerances as resolved; no extrapolation of accepted states.
 */
import { snapshot, restore, advance, difference, resolveGripInterval, type GripTimingReport } from './grip-timing.js';
type Private = any;
const MAX = 16384;
const hints = new WeakMap<object, number>();
export interface FastGripReport extends GripTimingReport { commits: number; fallbacks: number; eventSplits: number; }

/** Import an accepted physical trial while retaining the caller's bodies,
 * profiles, joints, plans, report and pair map. Memoization preserves shared
 * material/support attachments. Observed/custom worlds replay instead.
 */
export function commitGripTrial(w: Private, args: any[], trial: Private, trialArgs: any[]) {
  const map = new Map<any,any>([[trial.bodies,w.bodies],[trial.joints,w.joints],
    [trial.report,args[5]],[trialArgs[1],args[1]],[trialArgs[2],args[2]],[trialArgs[6],args[6]]]);
  const roots: Array<[any,any]> = [[args[5],trial.report]];
  const link = (old: any, next: any) => { map.set(next,old); roots.push([old,next]); };
  for(let i=0;i<w.bodies.length;i++) {
    const old=w.bodies[i], next=trial.bodies[i]; link(old,next); map.set(next.profile,old.profile);
    if(old.support && next.support) {
      link(old.support,next.support);
      if(old.support.foot && next.support.foot) link(old.support.foot,next.support.foot);
    }
  }
  for(let k=0;k<w.joints.length;k++) link(w.joints[k],trial.joints[k]);
  for(let k=0;k<args[2].length;k++) if(args[2][k] && trialArgs[2][k]) link(args[2][k],trialArgs[2][k]);
  const importValue = (v: any): any => {
    if(v===null || typeof v!=='object') return v;
    if(map.has(v)) return map.get(v);
    if(ArrayBuffer.isView(v)) { const q=(v as any).slice(); map.set(v,q); return q; }
    if(v instanceof Map) { const q=new Map(); map.set(v,q); for(const [k,x] of v) q.set(importValue(k),importValue(x)); return q; }
    if(v instanceof Set) { const q=new Set(); map.set(v,q); for(const x of v) q.add(importValue(x)); return q; }
    const q: any=Array.isArray(v)?[]:{}; map.set(v,q);
    for(const k of Object.keys(v)) q[k]=importValue(v[k]); return q;
  };
  for(const [old,next] of roots) {
    for(const k of Object.keys(old)) if(!Object.hasOwn(next,k)) delete old[k];
    for(const k of Object.keys(next)) old[k]=importValue(next[k]);
  }
  args[6].clear(); for(const [k,v] of trialArgs[6]) args[6].set(k,importValue(v));
  for(const k of Object.keys(trial)) if(!['bodies','joints','report','attachments'].includes(k) && typeof trial[k]!=='function') w[k]=importValue(trial[k]);
  for(let k=0;k<w.joints.length;k++) {
    const a=trial.attachments.get(trial.joints[k]);
    if(a) w.attachments.set(w.joints[k],importValue(a)); else w.attachments.delete(w.joints[k]);
  }
}

/** A phase boundary proposal, never a force override. The frozen-row dry or
 * viscous cap exit follows v'=-K*C until |v|=M*C. Moving/coupled geometry is
 * still evaluated by the real solve and whole-interval refinement check.
 */
function capEvent(w: Private, row: Private, h: number): number | null {
  const j=row?.joint;
  if(!j || j.kind!=='grasp' || j.pull>0 || j.brace!==undefined || row.c>0 || Math.abs(row.ln)>1e-12
    || j.legs>0 && !w.attachments.get(j)?.bounded) return null;
  const a=j.a,b=j.b, rv=w.graspVelocity(j), K=1/w.mass[row.i]+1/w.mass[row.j]
    +(row.ri??0)**2/w.inertia[row.i]+(row.rj??0)**2/w.inertia[row.j];
  const M=w.attachments.get(j)?.bounded ? w.attachmentMobility(j,-row.ny,row.nx) : 0;
  const speed=Math.abs(-rv.x*row.ny+rv.y*row.nx-(row.ri??0)*(a.spin??0)-(row.rj??0)*(b.spin??0));
  const C=row.limit/h, t=C>0?(speed-M*C)/(K*C):0;
  return t>h*1e-4 && t<h*(1-1e-4) ? t : null;
}

export function resolveFastGripInterval(w: Private, args: any[], execute: (w: Private,args: any[])=>void,
  commit?: (trial: Private,trialArgs: any[])=>void): FastGripReport {
  const report: FastGripReport={trials:0,intervals:0,limited:0,maxAcceptedError:0,commits:0,fallbacks:0,eventSplits:0};
  let bound=0;
  for(const j of w.joints) {
    if(j.kind!=='grasp'||j.broken) continue;
    const impulse=w.gripCapacity(j)*args[3], arm=Math.hypot(j.b.pos.x-j.a.pos.x,j.b.pos.y-j.a.pos.y)+j.b.profile.radius;
    for(const b of [j.a,j.b]) { const i=w.indexOf(b); bound+=Math.max(impulse/w.mass[i]/2.5e-5,
      impulse*arm/w.inertia[i]/2.5e-4,impulse*arm*args[3]/w.inertia[i]/2.5e-6); }
  }
  if(bound<1/32) { execute(w,args); report.intervals=1; return report; }
  const initial=snapshot(w,args), prototype=Object.getPrototypeOf(w), duration=args[3], ids=args[0];
  const originalDose=w.joints.reduce((v: number,j: Private)=>v+(j.kind==='grasp'?j.force??0:0),0);
  const dose=(q: Private)=>q.joints.reduce((v: number,j: Private)=>v+(j.kind==='grasp'?j.force??0:0),0)-originalDose;
  let event: number|null=null;
  const solve=(factor: number, grid: number[])=>{
    const q=restore(initial,prototype); let offset=0;
    const collect=q.w.jointRows;
    let rows: any[]=[], proposed: number|null=null;
    // Initial one-piece probe supplies the actual post-ground row frame. It is
    // scratch work and is never imported with its observer method attached.
    if(factor===1 && grid.length===1 && collect) q.w.jointRows=function(h: number) {
      rows=collect.call(this,h); if(rows.length===1) proposed=capEvent(this,rows[0],h); return rows;
    };
    for(const width of grid) {
      const h=width/factor;
      for(let k=0;k<factor;k++) { advance(q.w,q.args,h,args[4]-offset,execute); offset+=h; }
    }
    if(rows.length===1 && Math.abs(rows[0].ln)<1e-12 && !args[6].size && !q.args[6].size && !w.pending?.length) event=proposed;
    delete q.w.jointRows;
    report.trials+=factor*grid.length; return q;
  };
  const finish=(q: ReturnType<typeof restore>, factor: number, grid: number[])=>{
    if(commit && q.w.joints.length===w.joints.length) { commit(q.w,q.args); report.commits++; }
    else { let offset=0; for(const width of grid) for(let k=0;k<factor;k++) {
      const h=width/factor; advance(w,args,h,args[4]-offset,execute); offset+=h;
    } }
    report.intervals=factor*grid.length; return report;
  };
  const one=solve(1,[duration]), two=solve(2,[duration]);
  if(Math.max(dose(one.w),dose(two.w))<1e-10) return finish(one,1,[duration]);
  let grid=event===null?[duration]:[event,duration-event];
  report.eventSplits=grid.length-1;
  const results=new Map<number,ReturnType<typeof restore>>();
  if(grid.length===1) { results.set(1,one); results.set(2,two); }
  const get=(n: number)=>{ if(!results.has(n)) results.set(n,solve(n,grid)); return results.get(n)!; };
  let n=Math.max(2,Math.min(MAX/grid.length,hints.get(w)??2));
  // Cached resolution is only a starting guess. Every accepted interval is
  // still compared with its coarser replay; low effort searches downward.
  while(n*grid.length<=MAX) {
    const coarse=get(n/2),fine=get(n), error=difference(coarse.w,fine.w,ids);
    if(error<=1) {
      if(n>2 && difference(get(n/4).w,coarse.w,ids)<=1) { n/=2; continue; }
      report.maxAcceptedError=error; hints.set(w,n); return finish(fine,n,grid);
    }
    n*=2;
  }
  // No trial has changed the real world. Bound search work and fall back to
  // the corrected slow reference with its original accounting and limits.
  const fallback=resolveGripInterval(w,args,execute); hints.delete(w);
  Object.assign(report,{intervals:fallback.intervals,limited:fallback.limited,maxAcceptedError:fallback.maxAcceptedError});
  report.trials+=fallback.trials; report.fallbacks++; return report;
}
