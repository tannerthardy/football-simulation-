/** Directional derivative of the existing normal-demand coordinate. Diagnostic
 * only: differentiates geometry, never changes normal/tangent allocation. */
import {boundedAttachment} from '../../../src/physics/bounded-attachment.js';
import type {BoundedGripInput} from './grip-force-bounded.js';
export function pressureGeometry(input:BoundedGripInput,y:number[]) {
  const c=Math.cos(y[11]),s=Math.sin(y[11]),map=boundedAttachment({x:y[12],y:y[13]},input.attachmentReach),
    rbx=c*map.offset.x-s*map.offset.y,rby=s*map.offset.x+c*map.offset.y,
    rax=y[6]+rbx-y[0],ray=y[7]+rby-y[1],d=Math.hypot(rax,ray),nx=rax/d,ny=ray/d,
    share=input.recoveryCoupling??y[27],D=map.derivative,
    xx=share*(c*c*D.xx-2*c*s*D.xy+s*s*D.yy),xy=share*(c*s*(D.xx-D.yy)+(c*c-s*s)*D.xy),
    yy=share*(s*s*D.xx+2*c*s*D.xy+c*c*D.yy),
    jnx=xx*nx+xy*ny,jny=xy*nx+yy*ny,jtx=-xx*ny+xy*nx,jty=-xy*ny+yy*nx,
    nn=input.mobility*(jnx*jnx+jny*jny),nt=input.mobility*(jnx*jtx+jny*jty),tt=input.mobility*(jtx*jtx+jty*jty),
    gx=y[8]-y[2]-y[10]*rby+y[4]*ray,gy=y[9]-y[3]+y[10]*rbx-y[4]*rax,
    vn=gx*nx+gy*ny,vt=-gx*ny+gy*nx,
    denominator=nn+(1/input.a.mass+1/input.b.mass)/(2*.8*2*Math.PI*6);
  return {c,s,rbx,rby,rax,ray,d,nx,ny,share,xx,xy,yy,nn,nt,tt,gx,gy,vn,vt,D,jnx,jny,
    denominator,beta:vn/(input.capacity*denominator)};
}
export function pressureRate(input:BoundedGripInput,y:number[],v:number[],g=pressureGeometry(input,y)) {
  const {c,s,D,rbx,rby,rax,ray,d,nx,ny,share,xx,xy,yy,gx,gy,vn,jnx,jny,denominator}=g,
    zrx=D.xx*v[12]+D.xy*v[13],zry=D.xy*v[12]+D.yy*v[13],
    drbx=-v[11]*rby+c*zrx-s*zry,drby=v[11]*rbx+s*zrx+c*zry,
    drax=v[6]-v[0]+drbx,dray=v[7]-v[1]+drby,radial=nx*drax+ny*dray,
    dnx=(drax-nx*radial)/d,dny=(dray-ny*radial)/d,
    dgx=v[8]-v[2]-v[10]*rby-y[10]*drby+v[4]*ray+y[4]*dray,
    dgy=v[9]-v[3]+v[10]*rbx+y[10]*drbx-v[4]*rax-y[4]*drax,
    dvn=dgx*nx+dgy*ny+gx*dnx+gy*dny,
    length=Math.hypot(y[12],y[13]),L=input.attachmentReach,rho=length/L;
  let dxx:number,dxy:number,dyy:number;
  if(rho<1e-4) {
    // Differentiate the same fourth-order series used by boundedAttachment.
    const x=y[12],z=y[13],dx=v[12],dz=v[13],dot=x*dx+z*dz,l2=L*L,r2=x*x+z*z,
      tangential=-2*dot/(3*l2)+8*r2*dot/(15*l2*l2),
      q=-2/(3*l2)+8*r2/(15*l2*l2),dq=16*dot/(15*l2*l2);
    dxx=tangential+dq*x*x+2*q*x*dx;dxy=dq*x*z+q*(dx*z+x*dz);dyy=tangential+dq*z*z+2*q*z*dz;
  }else{
    const ex=y[12]/length,ey=y[13]/length,along=ex*v[12]+ey*v[13],drho=along/L,
      dex=(v[12]-ex*along)/length,dey=(v[13]-ey*along)/length,t=Math.tanh(rho),
      e=Math.exp(-2*rho),fr=4*e/((1+e)*(1+e)),ft=t/rho,
      dft=(fr-ft)*drho/rho,dfr=-2*t*fr*drho,q=fr-ft,dq=dfr-dft;
    dxx=dft+dq*ex*ex+2*q*ex*dex;dxy=dq*ex*ey+q*(dex*ey+ex*dey);dyy=dft+dq*ey*ey+2*q*ey*dey;
  }
  const ds=input.recoveryCoupling===undefined?v[27]/share:0,
    jxx=ds*xx-2*v[11]*xy+share*(c*c*dxx-2*c*s*dxy+s*s*dyy),
    jxy=ds*xy+v[11]*(xx-yy)+share*(c*s*(dxx-dyy)+(c*c-s*s)*dxy),
    jyy=ds*yy+2*v[11]*xy+share*(s*s*dxx+2*c*s*dxy+c*c*dyy),
    djnx=jxx*nx+jxy*ny+xx*dnx+xy*dny,djny=jxy*nx+jyy*ny+xy*dnx+yy*dny,
    dnn=2*input.mobility*(jnx*djnx+jny*djny);
  return (dvn-vn*dnn/denominator)/(input.capacity*denominator);
}
