import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Color,Fog,PointsMaterial} from 'three';
import {useGame} from '../game/store';
import {RAYQUAZA_INTRO,type RayquazaStrike} from '../data/rayquaza';
export function RayquazaAtmosphere({strike}:{strike:RayquazaStrike}){
 const {scene,gl}=useThree(),stars=useRef<PointsMaterial>(null);
 const quality=useGame(s=>s.quality);
 const background=useMemo(()=>scene.background instanceof Color?scene.background.clone():new Color('#dfe2e4'),[scene]);
 const dark=useMemo(()=>new Color('#030813'),[]),storm=useMemo(()=>new Color('#202a38'),[]);
 const positions=useMemo(()=>{
  const count=quality==='low'?400:900,array=new Float32Array(count*3);
  for(let i=0;i<count;i++){const a=i*2.399963,r=75+(i*17%90);array.set([Math.cos(a)*r,-30+(i*31%190),Math.sin(a)*r],i*3);}return array;
 },[quality]);
 useEffect(()=>{
  const originalFog=scene.fog,exposure=gl.toneMappingExposure;
  scene.fog=new Fog('#030813',70,240);
  return()=>{scene.background=background.clone();scene.fog=originalFog;gl.toneMappingExposure=exposure;};
 },[background,scene,gl]);
 useFrame(()=>{
  const age=(performance.now()-strike.born)/1000,space=Math.max(0,Math.min(1,1-(age-2)/2));
  const ending=Math.max(0,Math.min(1,(age-(strike.skill==='draco'?16:14.5))/2));
  if(scene.background instanceof Color)scene.background.copy(storm).lerp(dark,space).lerp(background,ending);
  if(scene.fog)scene.fog.color.copy(storm).lerp(dark,space);
  if(stars.current)stars.current.opacity=Math.max(0,1-(age-RAYQUAZA_INTRO.orbit+1)/1.5)*.9;
 });
 return <group position={strike.point} name="rayquaza-space-arrival">
  <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial ref={stars} color="#e0ecff" size={.23} transparent opacity={.9} depthWrite={false} fog={false}/></points>
  <directionalLight position={[14,30,20]} intensity={1.4} color="#bceee2"/>
 </group>;
}
