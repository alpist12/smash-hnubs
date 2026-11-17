import {useEffect,useState} from 'react';
import {useGame} from '../game/store';
import {WEAPONS} from '../weapons/config';
import type {RayquazaStrike} from '../data/rayquaza';
function Sequence({strike}:{strike:RayquazaStrike}){
 const [now,setNow]=useState(performance.now());useEffect(()=>{const timer=setInterval(()=>setNow(performance.now()),100);return()=>clearInterval(timer);},[]);
 const age=(now-strike.born)/1000,draco=strike.skill==='draco';
 const stage=draco?(strike.hits?`유성우 ${strike.hits} / ${WEAPONS.draco.count}`:'상공의 에너지가 모입니다'):age<1.2?'돌진 준비':age<2.7?'성층권으로 상승':strike.hits?'화룡점정 명중':'목표로 급강하';
 return <div className={`rayquaza-cinematic ${strike.skill}`} aria-label="레쿠쟈 기술 연출"><div className="meteor-letterbox top"/><div className="meteor-letterbox bottom"/><div className="rayquaza-caption"><small>RAYQUAZA · {draco?'DRACO METEOR':'DRAGON ASCENT'}</small><strong>{draco?'용성군':'화룡점정'}</strong><span role="status">{stage}</span></div></div>;
}
export function RayquazaCinematic(){const strike=useGame(s=>s.rayquaza);return strike?<Sequence key={strike.id} strike={strike}/>:null;}
