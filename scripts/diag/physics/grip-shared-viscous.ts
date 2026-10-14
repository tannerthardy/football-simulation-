/** Algebraic coefficients for the observed uncapped, zero-normal branch.
 * All three pieces derive from the SAME eight ordered work-limited passes.
 * The caller must verify their attained forces against that original map. */
import type {SharedGripFrame} from './grip-shared-law.js';
export function sharedViscousCoefficients(g:SharedGripFrame[],mu:number,direction:number,opposingBound=false){
  const x=-g[0].xx*g[0].ny+g[0].xy*g[0].nx,y=-g[0].xy*g[0].ny+g[0].yy*g[0].nx,a=mu*(x*x+y*y);
  if(g.length===1)return {matrix:[[-1/a]],regime:'single',switches:[]};
  const x2=-g[1].xx*g[1].ny+g[1].xy*g[1].nx,y2=-g[1].xy*g[1].ny+g[1].yy*g[1].nx,
    b=mu*(x2*x2+y2*y2),cross=mu*(x*x2+y*y2),f=-g[0].vt/a,sigma=g[1].vt+cross*f,rho=g[1].vt+2*cross*f,
    ratio=2*cross*cross/(a*b);
  if(direction*g[0].vt>=0||cross>=0||ratio<=1)throw new RangeError('Shared viscous branch scope');
  if(!opposingBound&&direction*sigma<0)return {matrix:[[-1/a,0],[cross/(a*b),-1/b]],regime:'assisted',switches:[direction*sigma,direction*rho]};
  if(!opposingBound&&direction*rho<0)return {matrix:[[-1/a,0],[0,0]],regime:'inactive',switches:[direction*sigma,direction*rho]};
  // Each zero-work update carries its earlier force: F2[k] =
  // (2*cross²/(a*b)-1)*F2[k-1] - rho/b. First force reads the preceding pass.
  const q=ratio-1;let sum7=0,power=1;for(let k=0;k<7;k++){sum7+=power;power*=q;}const sum8=sum7+power;
  return {matrix:[[-(1+ratio*sum7)/a,cross*sum7/(a*b)],
    [2*cross*sum8/(a*b),-sum8/b]],regime:'opposing',switches:[direction*sigma,direction*rho]};
}
