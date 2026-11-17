import {useEffect,useRef,useState} from 'react';
import {useGame} from '../game/store';
import {loadRanking,submitRanking,type RankingEntry} from '../game/leaderboard';
import {Icon} from './Icon';
export function Leaderboard({onClose}:{onClose:()=>void}){
 const round=useGame(s=>s.round),score=useGame(s=>s.score),usedNuke=useGame(s=>s.usedNuke);
 const busy=useGame(s=>!!s.nuke||!!s.meteor||!!s.rayquaza);
 const [rows,setRows]=useState<RankingEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [nickname,setNickname]=useState(()=>{try{return localStorage.getItem('hnubs:ranking-name')??'';}catch{return '';}});
 const [sending,setSending]=useState(false),[saved,setSaved]=useState(false),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{let active=true;setLoading(true);setError('');loadRanking().then(value=>{if(active)setRows(value);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[refresh]);
 useEffect(()=>{setSaved(false);setNotice('');},[round]);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  function key(e:KeyboardEvent){
   e.stopPropagation();if(e.key==='Escape')onClose();
   if(e.key==='Tab'){const controls=panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  }
  window.addEventListener('keydown',key,true);return()=>{window.removeEventListener('keydown',key,true);previous?.focus();};
 },[onClose]);
 async function save(){
  if(useGame.getState().usedNuke)return;
  setSending(true);setNotice('');const snapshot=useGame.getState();
  try{await submitRanking(snapshot.round,nickname,snapshot.score,Object.keys(snapshot.destroyed));if(useGame.getState().round!==snapshot.round)return;setSaved(true);setRefresh(n=>n+1);setNotice('현재 점수로 기존 기록을 갱신했습니다.');try{localStorage.setItem('hnubs:ranking-name',nickname.trim());}catch{/* 저장 차단 시에도 등록은 유지 */}}
  catch(e){setNotice(e instanceof Error?e.message:'랭킹에 연결할 수 없습니다.');}finally{setSending(false);}
 }
 return <div className="modal-backdrop" onClick={onClose}><section ref={panel} className="help-modal ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onClick={e=>e.stopPropagation()}>
  <button autoFocus className="close" aria-label="랭킹 닫기" onClick={onClose}><Icon name="close"/></button>
  <h2 id="ranking-title">방송국 파괴 랭킹</h2><p>모든 플레이어의 온라인 TOP 20</p>
  <div className="ranking-refresh"><p>핵폭탄 사용 기록은 자동 제외됩니다.</p><button aria-label="랭킹 새로고침" onClick={()=>setRefresh(n=>n+1)}><Icon name="reset" size={18}/></button></div>
  <div className="ranking-list" aria-live="polite">{loading?<p>기록을 불러오는 중…</p>:error?<p role="alert">{error}</p>:rows.length===0?<p>첫 기록의 주인공이 되어보세요.</p>:<table><thead><tr><th>순위</th><th>닉네임</th><th>점수</th></tr></thead><tbody>{rows.map((entry,i)=><tr key={i}><td>{i+1}</td><td>{entry.nickname}</td><td>{entry.score.toLocaleString('ko-KR')}</td></tr>)}</tbody></table>}</div>
  <form onSubmit={e=>{e.preventDefault();void save();}}><label htmlFor="ranking-name">공개 닉네임</label><div className="ranking-submit"><input id="ranking-name" value={nickname} maxLength={12} required placeholder="1~12자" onChange={e=>setNickname(e.target.value)}/><button className="primary" disabled={sending||busy||usedNuke||score===0}>{usedNuke?'랭킹 제외':sending?'등록 중…':saved?'기록 갱신':'기록 등록'}</button></div></form>
  <p>현재 {score.toLocaleString('ko-KR')}점 · {usedNuke?'핵폭탄 사용 · 이 판은 랭킹 제외':'랭킹 도전 중'}</p><p className="note">공식 배치의 기록만 등록됩니다. 다시 등록하면 이 브라우저의 기존 기록을 현재 점수로 갱신합니다. 핵폭탄 사용 시 이 판의 등록 기록도 제외됩니다. 닉네임과 최고 기록은 모든 접속자에게 공개됩니다.</p>
  {notice&&<p role="status">{notice}</p>}
 </section></div>;
}
