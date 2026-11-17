import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {BackSide,Color,Fog,Group,MeshBasicMaterial,PointsMaterial,Mesh} from 'three';
import {useGame} from '../game/store';
import {RAYQUAZA_INTRO,type RayquazaStrike} from '../data/rayquaza';
export function RayquazaAtmosphere({strike}:{strike:RayquazaStrike}){
 const {scene,gl}=useThree(),stars=useRef<PointsMaterial>(null),planet=useRef<Group>(null),shell=useRef<Mesh>(null);
 const quality=useGame(s=>s.quality);
 const background=useMemo(()=>scene.background instanceof Color?scene.background.clone():new Color('#dfe2e4'),[scene]);
 const dark=useMemo(()=>new Color('#030813'),[]),storm=useMemo(()=>new Color('#202a38'),[]);
 const positions=useMemo(()=>{
  const count=quality==='low'?160:320,array=new Float32Array(count*3);
  for(let i=0;i<count;i++){const a=i*2.399963,r=35+(i*17%70);array.set([Math.cos(a)*r,10+(i*31%105),Math.sin(a)*r],i*3);}return array;
 },[quality]);
 useEffect(()=>{
  const originalFog=scene.fog,exposure=gl.toneMappingExposure;
  scene.fog=new Fog('#030813',70,240);
  return()=>{scene.background=background.clone();scene.fog=originalFog;gl.toneMappingExposure=exposure;};
 },[background,scene,gl]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,space=Math.max(0,1-(age-2)/2);
  const ending=Math.max(0,Math.min(1,(age-(strike.skill==='draco'?16:14.5))/2));
  if(scene.background instanceof Color)scene.background.copy(space>0?dark:storm).lerp(background,ending);
  if(scene.fog)scene.fog.color.copy(space>0?dark:storm);
  if(stars.current)stars.current.opacity=Math.max(0,1-(age-RAYQUAZA_INTRO.orbit+1)/1.5)*.9;
  if(planet.current)planet.current.visible=space>0;
  if(shell.current)(shell.current.material as MeshBasicMaterial).opacity=space*.25;
 });
 return <group position={strike.point} name="rayquaza-space-arrival">
  <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial ref={stars} color="#e0ecff" size={.17} transparent opacity={.9} depthWrite={false} fog={false}/></points>
  <group ref={planet} position={[0,-35,-35]}>
   <mesh><sphereGeometry args={[40,48,24]}/><meshStandardMaterial color="#0b4774" roughness={1} emissive="#071c37" emissiveIntensity={.6} fog={false}/></mesh>
   <mesh ref={shell} scale={1.035}><sphereGeometry args={[40,48,24]}/><meshBasicMaterial color="#60cfff" transparent opacity={.25} side={BackSide} depthWrite={false} fog={false}/></mesh>
  </group>
  <directionalLight position={[14,30,20]} intensity={1.4} color="#bceee2"/>
 </group>;
}
