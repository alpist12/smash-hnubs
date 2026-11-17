import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {AdditiveBlending,Color,Group,Mesh,MeshBasicMaterial,PointLight,Vector3} from 'three';
import {useGame} from '../game/store';
import {stopNuclear} from '../game/audio';
import {nuclearFrame} from '../data/nuclear';
import type {MeteorStrike} from '../data/meteor';
const DOWN=new Vector3(0,-1,0),FLIGHT=new Vector3(-4,-25,3).normalize();
function Cloud({strike}:{strike:MeteorStrike}) {
 const root=useRef<Group>(null),ring=useRef<Mesh>(null),air=useRef<Mesh>(null),fire=useRef<Mesh>(null),bomb=useRef<Group>(null),marker=useRef<Group>(null),light=useRef<PointLight>(null);
 const core=useRef<Mesh>(null),stem=useRef<Mesh>(null),halo=useRef<Mesh>(null),beacon=useRef<Mesh>(null),hot=useMemo(()=>new Color('#fff6dc'),[]),ember=useMemo(()=>new Color('#ff6a1c'),[]);
 const {scene,gl}=useThree();
 const atmosphere=useMemo(()=>({background:scene.background instanceof Color?scene.background.clone():null,fog:scene.fog?.color.clone(),exposure:gl.toneMappingExposure}),[scene,gl]);
 const dark=useMemo(()=>new Color('#1b1719'),[]),warm=useMemo(()=>new Color('#554639'),[]);
 const sound=useGame(s=>s.sound),count=useGame(s=>s.quality==='low'?12:24);
 useEffect(()=>{if(!sound)stopNuclear();},[sound]);
 useEffect(()=>()=>{
  if(atmosphere.background&&scene.background instanceof Color)scene.background.copy(atmosphere.background);
  if(atmosphere.fog&&scene.fog)scene.fog.color.copy(atmosphere.fog);
  gl.toneMappingExposure=atmosphere.exposure;stopNuclear();
 },[atmosphere,scene,gl]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,frame=nuclearFrame(age,strike.point),t=frame.impact;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fade=Math.max(0,1-Math.max(0,t-5)/3),expand=1-Math.exp(-Math.max(0,t)*.7);
  if(atmosphere.background&&scene.background instanceof Color)scene.background.copy(atmosphere.background).lerp(t<0?dark:warm,t<0?.65:fade*.5);
  if(atmosphere.fog&&scene.fog)scene.fog.color.copy(atmosphere.fog).lerp(warm,fade*.5);
  gl.toneMappingExposure=atmosphere.exposure*(t<0?.7:1+(reduced?0:2.4*Math.exp(-t*4)));
  if(bomb.current){bomb.current.visible=t<0;bomb.current.position.set(...frame.bomb);bomb.current.quaternion.setFromUnitVectors(DOWN,FLIGHT);}
  if(marker.current){marker.current.visible=t<0;marker.current.rotation.y=age*.8;marker.current.scale.setScalar(1+Math.sin(age*8)*.04);}
  if(light.current){light.current.intensity=!reduced&&t>=0?260*Math.exp(-t*1.6)+30*fade:0;light.current.position.y=3+expand*6;}
  if(beacon.current)beacon.current.visible=t<0&&Math.floor(age*6)%2===0;
  const top=1.5+expand*7.5;
  if(core.current){core.current.visible=t>=0&&t<5.5;core.current.position.y=top;core.current.scale.setScalar(.5+expand*4.6);const m=core.current.material as MeshBasicMaterial;m.color.copy(hot).lerp(ember,Math.min(1,t/1.5));m.opacity=Math.max(0,1-t/5.5)*.95;}
  if(stem.current){stem.current.visible=t>=.1&&t<5;stem.current.position.y=top/2;stem.current.scale.set(.8+expand*1.1,top,.8+expand*1.1);(stem.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/5)*.55;}
  if(halo.current){const e=t-.35;halo.current.visible=e>0&&e<2.6;halo.current.position.y=top*.62;halo.current.scale.setScalar(1+e*7);(halo.current.material as MeshBasicMaterial).opacity=Math.sin(Math.min(1,e/2.6)*Math.PI)*.7;}
  if(root.current){
   root.current.visible=t>=0;
   root.current.children.forEach((child,i)=>{
    const mesh=child as Mesh;
    if(i<count){const angle=i*2.39996,layer=i%3;mesh.position.set(Math.cos(angle)*(2+layer*1.3)*expand,3+expand*(6+layer*.8),Math.sin(angle)*(2+layer*1.3)*expand);mesh.scale.setScalar(.1+expand*(2+(i%4)*.35));mesh.rotation.y=t*.1+i;}
    else {const j=i-count;mesh.position.set(Math.sin(j*3)*.3,expand*(j*1.6+.5),0);mesh.scale.set(1+expand*.9,.7+expand*1.2,1+expand*.9);}
    (mesh.material as MeshBasicMaterial).opacity=fade*(i<count?.82:.9);
   });
  }
  if(ring.current){ring.current.visible=t>=0&&t<2.5;ring.current.scale.setScalar(.1+Math.max(0,t)*22);(ring.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/2.5);}
  if(air.current){air.current.visible=t>=.15&&t<2.5;air.current.position.y=1+t*2;air.current.scale.setScalar(Math.max(.01,(t-.15)*16));(air.current.material as MeshBasicMaterial).opacity=Math.max(0,(1-t/2.5)*.45);}
  if(fire.current){fire.current.visible=t>=0&&t<1.6;fire.current.scale.setScalar(.1+Math.sqrt(Math.max(0,t))*9);(fire.current.material as MeshBasicMaterial).opacity=Math.max(0,1-t/1.6);}
 });
 return <>
  <group ref={bomb} visible={false} name="nuclear-bomb-flight">
   <mesh><capsuleGeometry args={[.34,.9,4,12]}/><meshStandardMaterial color="#48524b" metalness={.65} roughness={.35}/></mesh>
   {[-.3,.3].map(y=><mesh key={y} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.343,.04,6,16]}/><meshStandardMaterial color="#e4bc58" metalness={.3} roughness={.4}/></mesh>)}
   {[0,1,2,3].map(i=><mesh key={i} position={[Math.sin(i*Math.PI/2)*.37,.65,Math.cos(i*Math.PI/2)*.37]} rotation={[0,i*Math.PI/2,0]}><boxGeometry args={[.065,.55,.58]}/><meshStandardMaterial color="#252b29" metalness={.6} roughness={.4}/></mesh>)}
   <mesh position={[0,1.25,0]}><coneGeometry args={[.22,.95,10]}/><meshBasicMaterial color="#ffc572" transparent opacity={.65} toneMapped={false} depthWrite={false}/></mesh>
   <mesh ref={beacon} position={[0,-.62,0]}><sphereGeometry args={[.12,10,8]}/><meshBasicMaterial color="#ff2a14" toneMapped={false}/></mesh>
  </group>
  <group position={strike.point}>
   <group ref={marker} position={[0,.08,0]}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.8,1.87,48]}/><meshBasicMaterial color="#f4b868" depthTest={false} side={2}/></mesh>{[0,1,2,3].map(i=><mesh key={i} position={[Math.sin(i*Math.PI/2)*2.2,0,Math.cos(i*Math.PI/2)*2.2]} rotation={[0,i*Math.PI/2,0]}><boxGeometry args={[.045,.02,.5]}/><meshBasicMaterial color="#f4b868" depthTest={false}/></mesh>)}</group>
   <group ref={root} visible={false}>{Array.from({length:count+6},(_,i)=><mesh key={i}><icosahedronGeometry args={[1,2]}/><meshBasicMaterial color={i<count?(i%3===0?'#ad7550':'#66615b'):'#aa825c'} transparent opacity={0} depthWrite={false}/></mesh>)}</group>
   <mesh ref={ring} visible={false} position={[0,.12,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.92,1,64]}/><meshBasicMaterial color="#ffe2a1" transparent depthWrite={false} side={2}/></mesh>
   <mesh ref={air} visible={false} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1,.025,6,64]}/><meshBasicMaterial color="#fff2d0" transparent depthWrite={false}/></mesh>
   <mesh ref={fire} visible={false} position={[0,1.5,0]}><sphereGeometry args={[1,24,16]}/><meshBasicMaterial color="#fff0c1" transparent depthWrite={false} toneMapped={false}/></mesh>
   <mesh ref={core} visible={false}><sphereGeometry args={[1,28,18]}/><meshBasicMaterial color="#fff6dc" transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending}/></mesh>
   <mesh ref={stem} visible={false}><cylinderGeometry args={[.7,1.3,1,24,1,true]}/><meshBasicMaterial color="#ff8a3a" transparent depthWrite={false} toneMapped={false} blending={AdditiveBlending} side={2}/></mesh>
   <mesh ref={halo} visible={false} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1,.12,8,64]}/><meshBasicMaterial color="#f4f1ea" transparent depthWrite={false}/></mesh>
   <pointLight ref={light} position={[0,3,0]} color="#ffc16d" intensity={0} distance={90} decay={1.2}/>
  </group>
 </>;
}
export function NuclearBlast(){const strike=useGame(s=>s.nuke);return strike?<Cloud key={strike.id} strike={strike}/>:null;}
