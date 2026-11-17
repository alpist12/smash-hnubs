import type {V3} from './types';
import draco from '../weapons/draco';
import ascent from '../weapons/ascent';
export type RayquazaSkill='draco'|'ascent';
export interface RayquazaStrike {id:number;point:V3;born:number;skill:RayquazaSkill;hits:number}
export const RAYQUAZA_INTRO={descent:2.8,orbit:7.2,reveal:8.8,radius:18} as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
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
 return {position:[target[0]-left*16,target[1]+left*48,target[2]-left*10] as V3,visible:t>0&&t<1,progress:t};
}
export function rayquazaPosition(age:number,skill:RayquazaSkill,point:V3):V3 {
 const {descent,orbit,reveal,radius}=RAYQUAZA_INTRO;let p:V3;
 if(age<descent)p=curve([-12,62,-34],[-18,40,-28],[-24,13,-radius],[0,13,-radius],clamp(age/descent));
 else if(age<orbit){const t=(age-descent)/(orbit-descent),a=-Math.PI/2+t*Math.PI*2;p=[Math.cos(a)*radius,13-t*4+Math.sin(t*Math.PI*2)*.7,Math.sin(a)*radius];}
 else if(age<reveal)p=curve([0,9,-radius],[13.7,8.94,-radius],[0,8,-5],[0,8,-5],clamp((age-orbit)/(reveal-orbit)));
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
type CameraKey=[number,V3,V3,number];
function cameraTrack(age:number,keys:CameraKey[]){
 const i=Math.max(0,keys.findIndex((_,index)=>index<keys.length-1&&age<keys[index+1][0]));
 const a=keys[i],b=keys[i+1],before=keys[Math.max(0,i-1)],after=keys[Math.min(keys.length-1,i+2)];
 const span=b[0]-a[0],t=clamp((age-a[0])/span),t2=t*t,t3=t2*t;
 const sample=(value:(key:CameraKey)=>number)=>{
  const av=value(a),bv=value(b),m0=(bv-value(before))/(b[0]-before[0]),m1=(value(after)-av)/(after[0]-a[0]);
  return (2*t3-3*t2+1)*av+(t3-2*t2+t)*span*m0+(-2*t3+3*t2)*bv+(t3-t2)*span*m1;
 };
 return {camera:[0,1,2].map(axis=>sample(key=>key[1][axis])) as V3,target:[0,1,2].map(axis=>sample(key=>key[2][axis])) as V3,fov:sample(key=>key[3])};
}
export function rayquazaFrame(age:number,skill:RayquazaSkill,point:V3,portrait=false){
 const position=rayquazaPosition(age,skill,point),next=rayquazaPosition(age+.02,skill,point),phase=rayquazaPhase(age,skill);
 // Keep the camera on the same side of the action, with continuous position and velocity at each key.
 const keys:CameraKey[]=[
  [0,[12,67,-6],[-12,62,-34],43],
  [2.8,[31,26,25],[0,12,0],46],
  [5,[33,24,27],[0,10,0],46],
  [7.2,[27,19,23],[0,9,-8],42],
  [8.8,[9,12,18],[0,8,-3],36],
 ];
 if(skill==='draco')keys.push(
  [10.4,[9,12,18],[0,9,-3],36],
  [11.4,[15,23,31],[0,16,0],43],
  [12.3,[18,23,33],[0,8,0],46],
  [15.8,[20,22,34],[0,6,0],46],
  [18,[22,24,36],[0,7,0],46],
 );
 else keys.push(
  [9.9,[10,14,21],[0,10,-5],37],
  [11.3,[25,27,29],[0,22,-8],42],
  [11.6,[26,26,30],[0,21,-8],42],
  [12.25,[25,20,32],[0,5,0],40],
  [12.45,[25,18,32],[0,2,0],40],
  [12.9,[26,19,34],[0,3,0],46],
  [16.5,[28,22,36],[0,5,0],46],
 );
 const shot=cameraTrack(Math.min(age,keys[keys.length-1][0]-.00001),keys);
 if(portrait){shot.camera[0]*=1.22;shot.camera[2]*=1.22;shot.fov+=5;}
 const bank=phase==='space'?-.18:phase==='orbit'?-.35:phase==='reveal'?-.35*(1-smooth((age-7.2)/1.6)):phase==='rise'?-.18:0;
 return {position,next,camera:add(point,shot.camera),target:add(point,shot.target),phase,bank,fov:shot.fov};
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
