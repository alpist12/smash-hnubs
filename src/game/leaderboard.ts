export const RANKING_UPDATED='hnubs:ranking-updated';
export type RankingEntry={nickname:string;score:number;destroyed:number;elapsed:number;created:number};
const configured=import.meta.env?.VITE_LEADERBOARD_API?.trim();
export const RANKING_API=configured?.replace(/\/$/,'')??(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:8787':'');
async function request(path:string,body?:unknown){
 let response:Response;try{response=await fetch(RANKING_API+path,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});}catch{throw new Error('랭킹 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');}
 const result=await response.json();if(!response.ok)throw new Error(result.error??'랭킹 요청에 실패했습니다.');
 if(typeof window!=='undefined'&&(path==='/scores'||path.endsWith('/nuke')))window.dispatchEvent(new Event(RANKING_UPDATED));
 return result;
}
export class RankingRun {
 private round=-1;private run:Promise<string>|null=null;private nuclear=false;
 constructor(private send:typeof request,private player:string){}
 begin(round:number,nuclear:boolean){
  if(this.round!==round){this.round=round;this.run=null;this.nuclear=false;}
  if(!this.run){this.nuclear=nuclear;this.run=this.send('/runs',{player:this.player,mode:nuclear?'nuke':'normal'}).then(value=>value.id as string);}
  else if(nuclear&&!this.nuclear){this.nuclear=true;this.run=this.run.then(async id=>{await this.send(`/runs/${id}/nuke`,{});return id;});}
  void this.run.catch(()=>{});
 }
 async submit(round:number,nickname:string,score:number,destroyed:string[]){
  if(this.round===round&&this.nuclear)throw new Error('핵폭탄을 사용한 판은 랭킹에 등록되지 않습니다. 맵 복구 후 다시 도전하세요.');
  if(this.round!==round||!this.run)throw new Error('맵 복구 후 첫 공격부터 기록을 시작해 주세요.');
  const run=await this.run;if(this.round!==round||this.nuclear)throw new Error('플레이 상태가 바뀌어 등록을 중단했습니다.');const result=await this.send('/scores',{run,nickname,score,destroyed});return result;
 }
}
function player(){try{const key='hnubs:ranking-player';const saved=localStorage.getItem(key);if(saved)return saved;const id=crypto.randomUUID();localStorage.setItem(key,id);return id;}catch{return crypto.randomUUID();}}
const session=typeof window!=='undefined'&&RANKING_API?new RankingRun(request,player()):null;
export function beginOnlineRun(round:number,nuclear:boolean){session?.begin(round,nuclear);}
export async function loadRanking():Promise<RankingEntry[]>{
 if(!RANKING_API)throw new Error('온라인 랭킹 서버는 배포 준비 중입니다.');
 const result=await request('/leaderboard');if(!Array.isArray(result.entries))throw new Error('랭킹 응답을 읽을 수 없습니다.');return result.entries;
}
export async function submitRanking(round:number,nickname:string,score:number,destroyed:string[]){
 if(!session)throw new Error('온라인 랭킹 서버는 배포 준비 중입니다.');return session.submit(round,nickname,score,destroyed);
}
