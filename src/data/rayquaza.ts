import type {V3} from './types';
import draco from '../weapons/draco';
import ascent from '../weapons/ascent';
export type RayquazaSkill='draco'|'ascent';
export interface RayquazaStrike {id:number;point:V3;born:number;skill:RayquazaSkill;hits:number}
export const RAYQUAZA_INTRO={descent:2.8,orbit:7.2,reveal:8.8,radius:18} as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a:V3,b:V3,t:number)=>a.map((v,i)=>v+(b[i]-v)*t) as V3;
const add=(a:V3,b:V3)=>a.map((v,i)=>v+b[i]) as V3;
function curve(a:V3,b:V3,c:V3,d:V3,t:number):V3 {const u=1-t;return a.map((v,i)=>u*u*u*v+3*u*u*t*b[i]+3*u*t*t*c[i]+t*t*t*d[i]) as V3;}
export function rayquazaPhase(age:number,skill:RayquazaSkill){
 if(age<RAYQUAZA_INTRO.descent)return 'space';if(age<RAYQUAZA_INTRO.orbit)return 'orbit';if(age<RAYQUAZA_INTRO.reveal)return 'reveal';
 if(skill==='draco')return age<draco.release?'charge':age<draco.firstImpact?'release':age<draco.firstImpact+(draco.count-1)*draco.interval+.6?'attack':'exit';
 return age<9.9?'charge':age<11.6?'rise':age<ascent.impact?'dive':'exit';
}
export function dracoPoint(point:V3,index:number):V3 {
 const radius=index===0?0:Math.sqrt(index/(draco.count-1))*draco.spread,angle=index*2.399963;
 return [point[0]+Math.cos(angle)*radius,point[1],point[2]+Math.sin(angle)*radius];
}
export function dracoMeteor(point:V3,index:number,age:number){
 const target=dracoPoint(point,index),landing=draco.firstImpact+index*draco.interval;
 const t=clamp((age-(landing-1.9))/1.9),left=1-t*t;
 return {position:[target[0]-left*9,target[1]+left*32,target[2]-left*6] as V3,visible:t>0&&t<1,progress:t};
}
export function rayquazaPosition(age:number,skill:RayquazaSkill,point:V3):V3 {
 const {descent,orbit,reveal,radius}=RAYQUAZA_INTRO;let p:V3;
 if(age<descent)p=curve([-12,62,-34],[-18,40,-28],[-14,18,-radius],[0,13,-radius],clamp(age/descent));
 else if(age<orbit){const t=(age-descent)/(orbit-descent),a=-Math.PI/2+t*Math.PI*2;p=[Math.cos(a)*radius,13-t*4+Math.sin(t*Math.PI*2)*.7,Math.sin(a)*radius];}
 else if(age<reveal)p=curve([0,9,-radius],[8,9,-radius],[7,9,-8],[0,8,-5],smooth((age-orbit)/(reveal-orbit)));
 else if(skill==='draco'){
  const t=age-reveal,leave=smooth((age-(draco.duration-2))/2);
  p=[Math.sin(t*.7)*.3,8+Math.sin(t*1.1)*.18+leave*22,-5-leave*28];
 }else if(age<9.9)p=[0,8,-5];
 else if(age<11.3){const t=smooth((age-9.9)/1.4);p=curve([0,8,-5],[6,12,-4],[4,30,-8],[0,30,-10],t);}
 else if(age<11.6)p=[0,30,-10];
 else if(age<ascent.impact){const t=clamp((age-11.6)/(ascent.impact-11.6))**2;p=[0,.5+(1-t)*29.5,-10*(1-t)];}
 else{const t=age-ascent.impact;p=[t*3,.5+t*t*4,t*5];}
 return add(point,p);
}
export function rayquazaFrame(age:number,skill:RayquazaSkill,point:V3,portrait=false){
 const position=rayquazaPosition(age,skill,point),next=rayquazaPosition(age+.02,skill,point),phase=rayquazaPhase(age,skill);
 let camera:V3,target:V3,bank=0;
 if(phase==='space'){camera=add(position,[12,4,portrait?28:22]);target=position;bank=-.18;}
 else if(phase==='orbit'){
  const t=(age-RAYQUAZA_INTRO.descent)/(RAYQUAZA_INTRO.orbit-RAYQUAZA_INTRO.descent);
  const a=-Math.PI/2+t*Math.PI*2;camera=add(point,[Math.cos(a-.5)*(portrait?43:33),23-t*7,Math.sin(a-.5)*(portrait?43:33)]);target=mix(position,add(point,[0,5,0]),.25);bank=-.5;
 }else if(phase==='reveal'){
  const t=smooth((age-RAYQUAZA_INTRO.orbit)/(RAYQUAZA_INTRO.reveal-RAYQUAZA_INTRO.orbit));
  camera=mix(add(point,[8,16,-(portrait?40:31)]),add(position,[4,2,portrait?23:17]),t);target=add(position,[0,1,2]);bank=-.5*(1-t);
 }else if(phase==='charge'){camera=add(position,[4,2,portrait?23:17]);target=add(position,[0,.8,3]);}
 else if(phase==='rise'||phase==='dive'){camera=add(position,[9,4,portrait?25:18]);target=position;bank=phase==='rise'?-.25:0;}
 else if(phase==='release'){const t=smooth((age-draco.release)/(draco.firstImpact-draco.release));camera=mix(add(position,[4,2,portrait?23:17]),add(point,[12,20,portrait?40:29]),t);target=mix(add(position,[0,2,3]),add(point,[0,13,0]),t);}
 else {camera=add(point,[12,16,portrait?40:29]);target=add(point,[0,4,0]);}
 const freeze=skill==='ascent'&&age>=ascent.impact&&age<ascent.impact+.12;
 const fov=phase==='reveal'||phase==='charge'?32:phase==='dive'?30:skill==='ascent'&&age>=ascent.impact?48:42;
 return {position,next,camera,target,phase,bank,freeze,fov};
}
/** Body and tail joints receive delayed waves rather than replaying a coiled idle pose. */
export function rayquazaJointPose(age:number,skill:RayquazaSkill){
 const phase=rayquazaPhase(age,skill),fast=phase==='space'||phase==='dive',charge=phase==='charge'||phase==='release';
 const chargeProgress=skill==='draco'?smooth((age-RAYQUAZA_INTRO.reveal)/(draco.release-RAYQUAZA_INTRO.reveal)):1;
 const orbit=phase==='orbit'?.07:0,amplitude=fast?.045:charge?.14:.19,frequency=fast?3.5:1.6;
 const meteorIndex=Math.max(0,Math.min(draco.count-1,Math.floor((age-draco.firstImpact)/draco.interval)));
 const pulse=phase==='attack'?Math.exp(-Math.max(0,age-draco.firstImpact-meteorIndex*draco.interval)*11):0;
 let neckX=charge?-.08+chargeProgress*.42:-.04,headX=charge?chargeProgress*.25:0,jaw=charge?.38:.055;
 if(phase==='attack'){neckX=-.14-pulse*.035;headX=-.2;jaw=.1+pulse*.15;}
 if(phase==='dive'){neckX=0;headX=0;jaw=.14;}
 if(phase==='rise'&&age>11.3){neckX=-.22;headX=-.16;}
 return {
  body:[Math.sin(age*1.2)*.035-pulse*.025,0,charge?-.04:Math.sin(age*.8)*.02] as V3,
  tail:Array.from({length:9},(_,i)=>[Math.sin(age*frequency-i*.7)*amplitude*.4,orbit+Math.sin(age*frequency-i*.7)*amplitude,0] as V3),
  neck:[neckX,phase==='attack'?Math.sin(meteorIndex*2.399963)*.17:Math.sin(age*1.2)*.035,0] as V3,
  head:[headX,0,0] as V3,jaw,arm:fast?-1.15:charge?.25:.35-pulse*.08,armDrop:fast?.28:.55,elbow:charge?1.05:fast?.6:.85,hand:-.2
 };
}

export function ascentBurstParticle(index:number,time:number){
 const t=Math.max(0,time),angle=index*2.399963,speed=3.5+(index*17%13)*.55,lift=6+(index*11%9)*.8;
 return {position:[Math.cos(angle)*speed*t,Math.max(.03,lift*t-4.9*t*t),Math.sin(angle)*speed*t] as V3,size:.06+(index%4)*.045,fade:Math.max(0,Math.min(1,(3-t)/1.3))};
}
