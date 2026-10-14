/** Diagnostic exponential RK4 for a frozen linear relaxation operator.
 * Every nonlinear residual uses moving geometry. An independent squared-slip
 * ODE carries viscous work; work is never substituted with kinetic energy.
 * The frozen operator is an integration device, not a new contact law. */
type State=number[];
export interface ExponentialTailSystem {
  u:State;w:State;mobility:number;squaredSource:number;
  links:Array<[number,number]>;
  square:number;work:[number,number];
  derivative:(y:State)=>State;
}
const factorial=[1,1,2,6,24,120,720];
/** phi_k(z) = sum z^j/(j+k)!, with no small-z subtraction. */
function phi(z:number) {
  const values=[Math.exp(z)];
  if(Math.abs(z)<.5) {
    for(let k=1;k<=5;k++) {
      let term=1/factorial[k],sum=term;
      for(let j=1;j<24;j++){term*=z/(j+k);sum+=term;if(Math.abs(term)<1e-18)break;}
      values.push(sum);
    }
  }else {
    values.push(Math.expm1(z)/z);
    for(let k=2;k<=5;k++)values.push((values[k-1]-1/factorial[k-1])/z);
  }
  return values;
}
export function exponentialTailStep(y:State,h:number,s:ExponentialTailSystem) {
  const {u,w,links,mobility,squaredSource,square,work,derivative}=s,
    dot=(v:State)=>v.reduce((sum,x,i)=>sum+x*w[i],0),gamma=dot(u),
    Bu=y.map(()=>0),coupling=2*mobility*squaredSource;
  for(const [to,from] of links)Bu[to]=u[from];
  if(!(gamma>0&&Number.isFinite(gamma)))throw new RangeError('Invalid exponential relaxation');
  function linear(v:State) {
    const alpha=dot(v),r=v.map((_,i)=>-u[i]*alpha);
    for(const [to,from] of links)r[to]+=v[from];
    r[square]=-2*gamma*v[square]+coupling*alpha;
    for(const index of work)r[index]-=v[square]/mobility;
    return r;
  }
  // B^2=0 and w.B=0 for body travel and first temporal moments. The exact
  // matrix function includes these drift chains, the rank-one relaxation,
  // and the separately decaying squared-slip/work block.
  function operator(dt:number,coefficients:Array<[number,number]>) {
    const p=phi(-gamma*dt),p2=phi(-2*gamma*dt),
      combine=(f:(k:number)=>number)=>coefficients.reduce((v,[k,c])=>v+c*f(k),0),
      zero=combine(k=>1/factorial[k]),drift=dt*combine(k=>1/factorial[k+1]),
      response=-dt*combine(k=>p[k+1]),travel=-dt*dt*combine(k=>p[k+2]),
      squareResponse=combine(k=>p2[k]),workResponse=-dt/mobility*combine(k=>p2[k+1]),
      drivenSquare=dt*coupling*combine(k=>2*p2[k+1]-p[k+1]),
      drivenWork=-dt*dt*coupling/mobility*combine(k=>2*p2[k+2]-p[k+2]);
    return (v:State)=>{
      const alpha=dot(v),r=v.map((x,i)=>zero*x+(response*u[i]+travel*Bu[i])*alpha);
      for(const [to,from] of links)r[to]+=drift*v[from];
      r[square]=squareResponse*v[square]+drivenSquare*alpha;
      for(const index of work)r[index]+=workResponse*v[square]+drivenWork*alpha;
      return r;
    };
  }
  const E2=operator(h/2,[[0,1]]),Q0=operator(h/2,[[1,1]]),Q=(v:State)=>Q0(v).map(x=>x*h/2),
    F1=operator(h,[[1,1],[2,-3],[3,4]]),F2=operator(h,[[2,1],[3,-2]]),F3=operator(h,[[2,-1],[3,4]]),
    residual=(delta:State)=>{
      const actual=derivative(y.map((v,i)=>v+delta[i])),l=linear(delta);
      return actual.map((v,i)=>v-l[i]);
    },n0=derivative(y),a=Q(n0),na=residual(a),b=Q(na),nb=residual(b),
    e=E2(a),q=Q(nb.map((v,i)=>2*v-n0[i])),c=e.map((v,i)=>v+q[i]),nc=residual(c),
    r1=F1(n0),r2=F2(na.map((v,i)=>v+nb[i])),r3=F3(nc);
  return y.map((v,i)=>v+h*(r1[i]+2*r2[i]+r3[i]));
}
