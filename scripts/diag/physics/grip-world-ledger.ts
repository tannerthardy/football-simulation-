/** Independent ledger observer for one complete World interval. It reads
 * achieved body impulses, reconstructs the material load map and one common
 * foot's work, rather than summing isolated normal/tangent motor works.
 * This checks accounting, not the correctness of World's force targets.
 */
import {storedSpan} from './grip-span-accounting.js';
const sum=(a:number[])=>a.reduce((s,v)=>s+v,0);
function materialLoad(w:any,j:any,x:number,y:number){
  const at=w.attachments.get(j),s=j.recoveryCoupling??j.legs;
  if(!at?.bounded||!at.material)throw new RangeError('Ledger material scope');
  const z=at.material,L=w.sp[w.indexOf(j.b)].comHeight,c=Math.cos(j.b.facing),sn=Math.sin(j.b.facing),
    rho=Math.hypot(z.x,z.y)/L,t=Math.tanh(rho),fr=1-t*t,ft=rho===0?1:t/rho,
    zx=c*z.x-sn*z.y,zy=sn*z.x+c*z.y,l=Math.hypot(zx,zy),ux=l===0?1:zx/l,uy=l===0?0:zy/l,
    xx=s*(fr*ux*ux+ft*uy*uy),xy=s*(fr-ft)*ux*uy,yy=s*(fr*uy*uy+ft*ux*ux);
  return {x:xx*x+xy*y,y:xy*x+yy*y};
}
export function observeWorldLedger<T>(w:any,run:()=>T,duration=0){
  const report=w.report,before=structuredClone(report),K=w.kineticEnergy(),
    startSpan=w.joints.filter((j:any)=>j.kind==='grasp').map((j:any)=>storedSpan(w,j)),
    impulse=w.supportImpulse,rows=w.jointRows,integrate=w.integrateInterval,initialDose=w.joints.map((j:any)=>j.force??0);
  let bodyWork=0,passiveWork=0,motorWork=0,dose=0,maximumCapExcess=0,normalDose=0,tangentDose=0,reelDose=0,
    separateMotorWork=0,zeroLoadSteps=0,elapsed=0,moment=0,group:any,currentRows:any[]=[];
  w.jointRows=function(h:number){currentRows=rows.call(this,h);return currentRows;};
  w.supportImpulse=function(j:any,x:number,y:number,h:number,active=false,channel?:any,ta=0,tb=0){
    const a=j.a,b=j.b,va={...a.vel},vb={...b.vel},sa=a.spin??0,sb=b.spin??0,
      ga=this.indexOf(a),gb=this.indexOf(b),foot=b.support.foot;
    if(group.index===undefined){group.index=gb;group.desired={...foot.desired};group.mobility=foot.mobility;}
    if(group.index!==gb)throw new RangeError('Ledger requires one common foot');
    const map=materialLoad(this,j,x,y),linear=(vb.x-va.x)*x+(vb.y-va.y)*y+sa*ta+sb*tb,
      quadratic=.5*((x*x+y*y)*(1/this.mass[ga]+1/this.mass[gb])+ta*ta/this.inertia[ga]+tb*tb/this.inertia[gb]),
      f=impulse.call(this,j,x,y,h,active,channel,ta,tb),px=map.x*f,py=map.y*f,
      mw=-(px*group.desired.x+py*group.desired.y)-group.mobility/h*(2*(group.x*px+group.y*py)+px*px+py*py),
      bw=linear*f+quadratic*f*f,r=currentRows.find(r=>r.joint===j),name=active?'active':channel===r?.normalWork?'normal':'tangent';
    group.x+=px;group.y+=py;group[name].x+=px;group[name].y+=py;bodyWork+=bw;if(!active)passiveWork+=bw-mw;
    return f;
  };
  w.integrateInterval=function(...args:any[]){
    group={x:0,y:0,index:undefined,desired:{x:0,y:0},mobility:0,normal:{x:0,y:0},tangent:{x:0,y:0},active:{x:0,y:0}};
    integrate.apply(this,args);const h=args[3];
    motorWork+=-(group.x*group.desired.x+group.y*group.desired.y)-group.mobility/h*(group.x*group.x+group.y*group.y);
    for(const q of [group.normal,group.tangent,group.active])separateMotorWork+=-(q.x*group.desired.x+q.y*group.desired.y)-group.mobility/h*(q.x*q.x+q.y*q.y);
    if(group.x===0&&group.y===0)zeroLoadSteps++;
    for(const r of currentRows){if(r.joint.kind!=='grasp')throw new RangeError('Ledger grasp scope');
      const used=Math.hypot(r.ln-r.reel,r.lt);dose+=used;normalDose+=Math.abs(r.ln);tangentDose+=Math.abs(r.lt);reelDose+=Math.abs(r.reel);
      moment+=(duration-elapsed-h/2)*(r.ln-r.reel);
      maximumCapExcess=Math.max(maximumCapExcess,used-r.limit);}
    elapsed+=h;
  };
  try{
    const result=run(),ledger=report.work,old=before.work,reportedBody=ledger.grasps-old.grasps,
      reportedMotor=sum(report.supportMotorWork)-sum(before.supportMotorWork),reportedPassive=report.passiveGraspWork-before.passiveGraspWork,
      ground=sum(report.groundWork)-sum(before.groundWork)+sum(report.groundYawWork)-sum(before.groundYawWork),
      other=ledger.hands-old.hands+ledger.strikes-old.strikes+ledger.contacts-old.contacts,
      actualDose=w.joints.reduce((s:number,j:any,i:number)=>s+(j.force??0)-initialDose[i],0),
      endSpan=w.joints.filter((j:any)=>j.kind==='grasp').map((j:any)=>storedSpan(w,j));
    return {result,accounting:{bodyWork,motorWork,passiveWork,reportedBody,reportedMotor,reportedPassive,
      bodyLedgerResidual:reportedBody-bodyWork,motorLedgerResidual:reportedMotor-motorWork,passiveLedgerResidual:reportedPassive-passiveWork,
      kineticResidual:w.kineticEnergy()-K-ground-other-bodyWork,normalDose,tangentDose,reelDose,dose,actualDose,doseResidual:actualDose-dose,
      maximumCapExcess,separateMotorWork,commonMotorCrossWork:motorWork-separateMotorWork,zeroLoadSteps,moment,startSpan,endSpan,
      spanEnergyChange:sum(endSpan.map((s:any)=>s.energy))-sum(startSpan.map((s:any)=>s.energy)),
      energyBalance:w.kineticEnergy()-K+sum(endSpan.map((s:any)=>s.energy))-sum(startSpan.map((s:any)=>s.energy))-ground-other-motorWork}};
  }finally{w.supportImpulse=impulse;w.jointRows=rows;w.integrateInterval=integrate;}
}
