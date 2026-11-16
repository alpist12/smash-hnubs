import {DEFAULT_ITEMS,specs} from '../src/data/room';
import {applyLayout} from '../src/data/layout';
import layout from '../src/data/layout.json';
const official=applyLayout(DEFAULT_ITEMS,layout);
export const POINTS:Record<string,number>=Object.fromEntries(official.map(item=>[item.id,specs[item.kind].score]));
export const SEASON='hnubs-20261116';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export interface Statement {
 bind(...values:unknown[]):Statement;
 first<T=Record<string,unknown>>():Promise<T|null>;
 all<T=Record<string,unknown>>():Promise<{results:T[]}>;
 run():Promise<unknown>;
}
export interface Database {prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown[]>}
type Run={id:string;player:string;mode:'normal'|'nuke';started:number;expires:number;claim:string|null};
class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
const fail=(status:number,message:string):never=>{throw new HttpError(status,message);};
function mode(value:unknown){if(value!=='normal'&&value!=='nuke')fail(400,'랭킹 종류가 올바르지 않습니다.');return value as 'normal'|'nuke';}
async function jsonBody(request:Request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'JSON 요청이 필요합니다.');
 const reader=request.body?.getReader();if(!reader)fail(400,'요청 내용이 없습니다.');
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const part=await reader!.read();if(part.done)break;length+=part.value.length;if(length>16000){await reader!.cancel();fail(413,'요청이 너무 큽니다.');}chunks.push(part.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{const value:unknown=JSON.parse(new TextDecoder().decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'올바른 JSON 객체가 필요합니다.');return value as Record<string,unknown>;}catch{fail(400,'요청 내용을 읽을 수 없습니다.');}
}
export function scorePayload(value:Record<string,unknown>){
 if(typeof value.nickname!=='string')fail(400,'닉네임을 입력하세요.');
 const nickname=(value.nickname as string).normalize('NFC').trim();
 if([...nickname].length<1||[...nickname].length>12||!/^[\p{L}\p{N} _.-]+$/u.test(nickname))fail(400,'닉네임은 한글·영문·숫자 등 1~12자로 입력하세요.');
 const ids=value.destroyed;
 if(!Array.isArray(ids)||ids.length<1||ids.length>official.length||ids.some(id=>typeof id!=='string'||!Object.hasOwn(POINTS,id))||new Set(ids).size!==ids.length)fail(400,'공식 맵에서 플레이한 기록만 등록할 수 있습니다.');
 const points=(ids as string[]).reduce((sum,id)=>sum+POINTS[id],0);
 if(!Number.isSafeInteger(value.score)||value.score!==points)fail(400,'점수와 파괴 기록이 일치하지 않습니다.');
 return {nickname,score:points,destroyed:(ids as string[]).length};
}
export default {async fetch(request:Request,env:{DB:Database}):Promise<Response>{
 const origin=request.headers.get('origin')??'';
 const allowed=['https://alpist12.github.io','http://localhost:5173','http://127.0.0.1:5173','http://localhost:4173','http://127.0.0.1:4173'];
 const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(allowed.includes(origin))headers['Access-Control-Allow-Origin']=origin;
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 try{
  if(origin&&!allowed.includes(origin))fail(403,'허용되지 않은 요청입니다.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  const url=new URL(request.url),now=Date.now();
  if(request.method==='GET'&&url.pathname==='/leaderboard'){
   const category='normal';
   if(url.searchParams.has('mode')&&url.searchParams.get('mode')!=='normal')fail(400,'랭킹은 핵폭탄을 사용하지 않은 기록만 제공합니다.');
   const rows=await env.DB.prepare('SELECT nickname,score,destroyed,elapsed,created FROM scores WHERE season=? AND mode=? ORDER BY score DESC,elapsed ASC,created ASC LIMIT 20').bind(SEASON,category).all();
   return respond({season:SEASON,mode:category,totalObjects:official.length,entries:rows.results});
  }
  if(request.method!=='POST')fail(404,'찾을 수 없는 요청입니다.');
  if(!origin)fail(403,'게임에서 기록을 등록해 주세요.');
  const body=await jsonBody(request);
  if(url.pathname==='/runs'){
   if(typeof body!.player!=='string'||!uuid.test(body!.player as string))fail(400,'플레이어 ID가 올바르지 않습니다.');
   const category=mode(body!.mode);
   const ip=request.headers.get('cf-connecting-ip')??'local';
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+new Date(now).toISOString().slice(0,10)));
   const bucket=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   await env.DB.prepare('DELETE FROM runs WHERE expires<?').bind(now).run();
   const rate=await env.DB.prepare('SELECT COUNT(*) AS count FROM runs WHERE bucket=? AND started>?').bind(bucket,now-60000).first<{count:number}>();
   if((rate?.count??0)>=12)fail(429,'잠시 후 다시 시작해 주세요.');
   const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO runs(id,player,mode,started,expires,bucket) VALUES(?,?,?,?,?,?)').bind(id,body!.player,category,now,now+86400000,bucket).run();
   return respond({id,season:SEASON},201);
  }
  const nukeRun=url.pathname.match(/^\/runs\/([a-f0-9-]+)\/nuke$/i);
  const id=nukeRun?.[1]??body!.run;
  if(typeof id!=='string'||!uuid.test(id))fail(400,'플레이 기록이 올바르지 않습니다.');
  const run=await env.DB.prepare('SELECT * FROM runs WHERE id=?').bind(id).first<Run>();
  if(!run||run.expires<now)fail(410,'플레이 기록이 만료됐습니다. 맵 복구 후 다시 플레이해 주세요.');
  if(nukeRun){await env.DB.batch([env.DB.prepare('UPDATE runs SET mode=? WHERE id=?').bind('nuke',id),env.DB.prepare('DELETE FROM scores WHERE run=?').bind(id)]);return respond({excluded:true});}
  if(url.pathname!=='/scores')fail(404,'찾을 수 없는 요청입니다.');
  if(run!.mode==='nuke')fail(403,'핵폭탄을 사용한 판은 랭킹에 등록되지 않습니다.');
  const score=scorePayload(body!);if(now-run!.started<1000)fail(400,'플레이 시작 후 잠시 뒤 등록해 주세요.');
  const claim=crypto.randomUUID(),elapsed=now-run!.started;
  await env.DB.batch([
   env.DB.prepare("UPDATE runs SET claim=? WHERE id=? AND mode='normal'").bind(claim,id),
   env.DB.prepare(`INSERT INTO scores(season,player,mode,run,nickname,score,destroyed,elapsed,created) SELECT ?,player,mode,id,?,?,?,?,? FROM runs WHERE id=? AND claim=? AND mode='normal' ON CONFLICT(season,player,mode) DO UPDATE SET run=excluded.run,nickname=excluded.nickname,score=excluded.score,destroyed=excluded.destroyed,elapsed=excluded.elapsed,created=excluded.created WHERE excluded.created>=scores.created`).bind(SEASON,score.nickname,score.score,score.destroyed,elapsed,now,id,claim)
  ]);
  const claimed=await env.DB.prepare('SELECT claim,mode FROM runs WHERE id=?').bind(id).first<{claim:string;mode:string}>();if(claimed?.claim!==claim)fail(409,'이미 등록한 기록입니다.');
  if(claimed?.mode==='nuke')fail(403,'핵폭탄을 사용한 판은 랭킹에 등록되지 않습니다.');
  return respond({mode:'normal',score:score.score},201);
 }catch(error){if(error instanceof HttpError)return respond({error:error.message},error.status);console.error('Leaderboard API failed',error);return respond({error:'랭킹 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'},503);}
}};
