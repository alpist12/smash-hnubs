import {useEffect,useState} from 'react';
import {useGame} from '../game/store';
import {WEAPONS} from '../weapons/config';
import {rayquazaPhase,RAYQUAZA_INTRO,type RayquazaStrike} from '../data/rayquaza';
import {CutIn,ImpactFlash,SpeedLines} from './UltimateFx';
function Sequence({strike}:{strike:RayquazaStrike}){
 const [now,setNow]=useState(performance.now());useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
 const age=(now-strike.born)/1000,draco=strike.skill==='draco';
 const phase=rayquazaPhase(age,strike.skill),color=draco?'#c9a2ff':'#8fffb0';
 const labels={space:'우주에서 접근 중',orbit:'방송국 상공을 선회합니다',reveal:'하늘의 지배자',charge:draco?'용성군 에너지 응축':'화룡점정 준비',release:'상공으로 에너지 방출',attack:`유성우 ${strike.hits} / ${WEAPONS.draco.count}`,rise:'상공으로 재상승',dive:'초고속 급강하',exit:draco?'용성군 작렬':'화룡점정 명중'};
 return <div className={`rayquaza-cinematic ${strike.skill} phase-${phase}`} aria-label="레쿠쟈 기술 연출">
  {(phase==='space'||phase==='dive')&&<SpeedLines color={color}/>}
  {age>=RAYQUAZA_INTRO.reveal&&age<RAYQUAZA_INTRO.reveal+1.9&&<CutIn kicker={draco?'DRACO METEOR':'DRAGON ASCENT'} title={draco?'용성군':'화룡점정'} color={color}/>}
  {draco&&strike.hits>0&&<ImpactFlash key={strike.hits} color={color} soft={strike.hits<WEAPONS.draco.count}/>}
  {!draco&&strike.hits>0&&<ImpactFlash color={color}/>}
  <div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/>
  <span className="sr-only" role="status">{labels[phase]}</span>
 </div>;
}
export function RayquazaCinematic(){const strike=useGame(s=>s.rayquaza);return strike?<Sequence key={strike.id} strike={strike}/>:null;}
