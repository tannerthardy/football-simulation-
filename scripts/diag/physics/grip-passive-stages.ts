/** One passive tangent grip, two Gauss stages. Analytically eliminate stage
 * velocities through the viscous law, then iterate only moving geometry.
 * Material, work and force budgets remain the original physical equations. */
type State=number[];
interface Geometry {
  nx:number;ny:number;rax:number;ray:number;rbx:number;rby:number;M:number;
  xx:number;xy:number;yy:number;share:number;c:number;s:number;
}
export interface PassiveStageStatistics {steps:number;geometryIterations:number}
export interface PassiveStageSystem {
  a:{mass:number;inertia:number};b:{mass:number;inertia:number};mobility:number;
  geometry:(y:State)=>Geometry;derivative:(t:number,y:State)=>State;
  statistics:PassiveStageStatistics;
}
const AX=0,AY=1,AVX=2,AVY=3,AS=4,AA=5,BX=6,BY=7,BVX=8,BVY=9,BS=10,BA=11,
  ZX=12,ZY=13,FX=14,FY=15;
export function passiveStageStep(t:number,y:State,h:number,system:PassiveStageSystem) {
    const {a,b,mobility:mu,geometry,derivative,statistics}=system,K=1/a.mass+1/b.mass;
    statistics.steps++;
    const a00=.25,a01=.25-Math.sqrt(3)/6,a10=.25+Math.sqrt(3)/6,a11=.25,
      c=[.5-Math.sqrt(3)/6,.5+Math.sqrt(3)/6],
      A=[[a00,a01],[a10,a11]],A2=[[1/24,a01/2],[a10/2,1/24]],
      stages=[y.slice(),y.slice()];
    for(let i=0;i<2;i++) {
      stages[i][AX]+=h*c[i]*y[AVX];stages[i][AY]+=h*c[i]*y[AVY];
      stages[i][BX]+=h*c[i]*y[BVX];stages[i][BY]+=h*c[i]*y[BVY];stages[i][BA]+=h*c[i]*y[BS];
    }
    for(let iteration=0;iteration<12;iteration++) {statistics.geometryIterations++;
      const g0=geometry(stages[0]),g1=geometry(stages[1]),
        ka0=g0.rax*g0.nx+g0.ray*g0.ny,ka1=g1.rax*g1.nx+g1.ray*g1.ny,
        kb0=g0.rbx*g0.nx+g0.rby*g0.ny,kb1=g1.rbx*g1.nx+g1.rby*g1.ny,
        cross=K*(g0.nx*g1.nx+g0.ny*g1.ny)+ka0*ka1/a.inertia+kb0*kb1/b.inertia,
        m00=1+h*a00/g0.M*(K+ka0*ka0/a.inertia+kb0*kb0/b.inertia),m01=h*a01/g0.M*cross,
        m10=h*a10/g1.M*cross,m11=1+h*a11/g1.M*(K+ka1*ka1/a.inertia+kb1*kb1/b.inertia),
        v0=-g0.ny*(y[BVX]-y[AVX])+g0.nx*(y[BVY]-y[AVY])-y[AS]*ka0+y[BS]*kb0,
        v1=-g1.ny*(y[BVX]-y[AVX])+g1.nx*(y[BVY]-y[AVY])-y[AS]*ka1+y[BS]*kb1,
        det=m00*m11-m01*m10,f0=(-m11*v0/g0.M+m01*v1/g1.M)/det,
        f1=(-m00*v1/g1.M+m10*v0/g0.M)/det;
      if(!(det>0)||!Number.isFinite(f0)||!Number.isFinite(f1))throw new RangeError('Invalid tangent stage system');
      const fx0=-g0.ny*f0,fy0=g0.nx*f0,fx1=-g1.ny*f1,fy1=g1.nx*f1,
        ta0=-ka0*f0,ta1=-ka1*f1,tb0=kb0*f0,tb1=kb1*f1,
        ux0=mu*(g0.xx*fx0+g0.xy*fy0),uy0=mu*(g0.xy*fx0+g0.yy*fy0),
        ux1=mu*(g1.xx*fx1+g1.xy*fy1),uy1=mu*(g1.xy*fx1+g1.yy*fy1),
        zx0=g0.share*(g0.c*ux0+g0.s*uy0),zy0=g0.share*(-g0.s*ux0+g0.c*uy0),
        zx1=g1.share*(g1.c*ux1+g1.s*uy1),zy1=g1.share*(-g1.s*ux1+g1.c*uy1);
      let residual=0;
      for(let i=0;i<2;i++) {
        const z=stages[i],update=(index:number,value:number)=>{residual=Math.max(residual,Math.abs(z[index]-value));z[index]=value;},
          bx=A2[i][0],by=A2[i][1],ax=A[i][0],ay=A[i][1];
        update(AX,y[AX]+h*c[i]*y[AVX]-h*h*(bx*fx0+by*fx1)/a.mass);
        update(AY,y[AY]+h*c[i]*y[AVY]-h*h*(bx*fy0+by*fy1)/a.mass);
        update(BX,y[BX]+h*c[i]*y[BVX]+h*h*(bx*fx0+by*fx1)/b.mass);
        update(BY,y[BY]+h*c[i]*y[BVY]+h*h*(bx*fy0+by*fy1)/b.mass);
        update(BA,y[BA]+h*c[i]*y[BS]+h*h*(bx*tb0+by*tb1)/b.inertia);
        update(ZX,y[ZX]+h*(ax*zx0+ay*zx1));update(ZY,y[ZY]+h*(ax*zy0+ay*zy1));
      }
      if(residual<1e-13) {
        for(let i=0;i<2;i++) {
          const z=stages[i],ax=A[i][0],ay=A[i][1];
          z[AVX]=y[AVX]-h*(ax*fx0+ay*fx1)/a.mass;z[AVY]=y[AVY]-h*(ax*fy0+ay*fy1)/a.mass;
          z[BVX]=y[BVX]+h*(ax*fx0+ay*fx1)/b.mass;z[BVY]=y[BVY]+h*(ax*fy0+ay*fy1)/b.mass;
          z[AS]=y[AS]+h*(ax*ta0+ay*ta1)/a.inertia;z[BS]=y[BS]+h*(ax*tb0+ay*tb1)/b.inertia;
          z[AA]=y[AA]+h*c[i]*y[AS]+h*h*(A2[i][0]*ta0+A2[i][1]*ta1)/a.inertia;
          z[FX]=y[FX]+h*(ax*ux0+ay*ux1);z[FY]=y[FY]+h*(ax*uy0+ay*uy1);
        }
        // Work and ledgers use physical force at converged moving stages.
        const d0=derivative(t+c[0]*h,stages[0]),d1=derivative(t+c[1]*h,stages[1]);
        return y.map((v,j)=>v+h*(d0[j]+d1[j])/2);
      }
    }
    throw new RangeError('Bounded tangent geometry iteration limit');
  }
