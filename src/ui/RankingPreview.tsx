import {useEffect,useState} from 'react';
import {loadRanking,RANKING_UPDATED,type RankingEntry} from '../game/leaderboard';
import {Icon} from './Icon';
export function RankingPreview({onOpen}:{onOpen:()=>void}){
 const [rows,setRows]=useState<RankingEntry[]|null>(null),[offline,setOffline]=useState(false);
 useEffect(()=>{
  let disposed=false,version=0;
  async function refresh(){
   if(document.hidden)return;const request=++version;
   try{const data=await loadRanking();if(!disposed&&request===version){setRows(data.slice(0,3));setOffline(false);}}
   catch{if(!disposed&&request===version)setOffline(true);}
  }
  void refresh();const timer=window.setInterval(()=>void refresh(),30000);
  window.addEventListener(RANKING_UPDATED,refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{disposed=true;window.clearInterval(timer);window.removeEventListener(RANKING_UPDATED,refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 return <section className="ranking-preview" aria-label="온라인 랭킹 상위 3명">
  <div className="ranking-preview-title"><strong><Icon name="ranking" size={14}/> TOP 3</strong><button onClick={onOpen} aria-label="전체 온라인 랭킹 보기">전체 보기 <span aria-hidden="true">↗</span></button></div>
  {rows&&rows.length>0?<ol>{rows.map((entry,index)=><li key={index}><b className={`rank-${index+1}`}>{index+1}</b><span title={entry.nickname}>{entry.nickname}</span><strong>{entry.score.toLocaleString('ko-KR')}</strong></li>)}</ol>:<p>{offline?'랭킹에 연결할 수 없어요':rows?'아직 등록된 기록이 없어요':'랭킹 불러오는 중…'}</p>}
  {offline&&rows&&rows.length>0&&<small>연결 확인 중 · 마지막 조회 기록</small>}
 </section>;
}
