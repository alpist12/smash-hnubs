import type {V3} from './types';
import draco from '../weapons/draco';
import ascent from '../weapons/ascent';
export type RayquazaSkill='draco'|'ascent';
export interface RayquazaStrike {id:number;point:V3;born:number;skill:RayquazaSkill;hits:number}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function dracoPoint(point:V3,index:number):V3 {
 const radius=index===0?0:Math.sqrt(index/(draco.count-1))*draco.spread,angle=index*2.399963;
 return [point[0]+Math.cos(angle)*radius,point[1],point[2]+Math.sin(angle)*radius];
}
export function dracoMeteor(point:V3,index:number,age:number){
 const target=dracoPoint(point,index),t=clamp((age-(draco.firstImpact+index*draco.interval-1.2))/1.2),left=1-t*t;
 return {position:[target[0]-left*5,target[1]+left*17,target[2]-left*3] as V3,visible:t>0&&t<1};
}
export function rayquazaPosition(age:number,skill:RayquazaSkill,point:V3):V3 {
 if(skill==='draco')return [point[0]-2+Math.sin(age*.65)*1.2,point[1]+8+Math.sin(age*1.5)*.35,point[2]-1];
 if(age<1.2)return [point[0]-3,point[1]+5+age*2,point[2]+2];
 if(age<2.7){const t=(age-1.2)/1.5;return [point[0]-3+Math.sin(t*Math.PI)*3,point[1]+7.4+t*12.6,point[2]+2-t*5];}
 if(age<ascent.impact){const t=clamp((age-2.7)/(ascent.impact-2.7))**1.8;return [point[0]-3*(1-t),point[1]+.5+19.5*(1-t),point[2]-3*(1-t)];}
 const t=Math.max(0,age-ascent.impact);return [point[0]+t*3,point[1]+.5+t*t*5,point[2]+t*4];
}
export function rayquazaFrame(age:number,skill:RayquazaSkill,point:V3,portrait=false){
 const position=rayquazaPosition(age,skill,point),next=rayquazaPosition(age+.02,skill,point);
 const wide=skill==='draco'||age>=ascent.impact;
 return {position,next,camera:(wide?[point[0]+10,point[1]+13,point[2]+(portrait?32:22)]:[position[0]+7,position[1]+3,position[2]+(portrait?16:12)]) as V3,target:(wide?[point[0],point[1]+4,point[2]]:position) as V3};
}
