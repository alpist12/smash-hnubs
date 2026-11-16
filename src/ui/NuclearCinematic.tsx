import {useEffect,useState} from 'react';
import {useGame} from '../game/store';
import {nuclearFrame} from '../data/nuclear';
import type {MeteorStrike} from '../data/meteor';
function Sequence({strike}:{strike:MeteorStrike}) {
 const [now,setNow]=useState(performance.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
 const frame=nuclearFrame((now-strike.born)/1000,strike.point);
 const title=frame.phase==='drop'?'핵폭탄 투하 경고':frame.phase==='impact'?'방송국 전역 폭발':'충격파 확산';
 return <div className={`nuclear-cinematic${strike.impacted?' is-impact':''}`} aria-label="핵폭탄 연출">
  <div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/>
  <div className="nuclear-caption" role="status"><small>HNUBS · TOTAL DESTRUCTION</small><strong>{title}</strong><b>{strike.impacted?'맵 복구로 다시 시작하세요':`${frame.remaining.toFixed(1)}초 후 충격`}</b>{!strike.impacted&&<span className="nuclear-countdown" aria-hidden="true">{Math.max(1,Math.ceil(frame.remaining))}</span>}</div>
  {strike.impacted&&<div className="nuclear-flash"/>}
 </div>;
}
export function NuclearCinematic(){const strike=useGame(s=>s.nuke);return strike?<Sequence key={strike.id} strike={strike}/>:null;}
