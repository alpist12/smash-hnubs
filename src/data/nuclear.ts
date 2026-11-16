import nuke from '../weapons/nuke';
import type {V3} from './types';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** Shared clock for the bomb, camera and HUD; damage still lands at charge seconds. */
export function nuclearFrame(age:number,point:V3,portrait=false){
 const fall=clamp((age-.5)/(nuke.charge-.5))**1.7,impact=age-nuke.charge;
 const bomb:V3=[point[0]+(1-fall)*4,point[1]+.7+(1-fall)*25,point[2]-(1-fall)*3];
 const reveal=smooth(impact/.85),pullback=smooth(impact/4);
 const wide:V3=[point[0]+16+pullback*3,point[1]+12+pullback*3,point[2]+(portrait?43:28)+pullback*5];
 const close:V3=[bomb[0]+5,bomb[1]+2,bomb[2]+(portrait?12:9)];
 const camera=close.map((value,i)=>value+(wide[i]-value)*reveal) as V3;
 const target:V3=[point[0],point[1]+1+pullback*5,point[2]];
 for(let i=0;i<3;i++)target[i]=bomb[i]+(target[i]-bomb[i])*reveal;
 return {bomb,camera,target,impact,fall,remaining:Math.max(0,nuke.charge-age),phase:impact<0?'drop':impact<1.2?'impact':'cloud'} as const;
}
