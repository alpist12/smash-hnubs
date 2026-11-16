import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{POINTS} from '../server/worker';
import {localDatabase} from '../server/local-db';
import {RankingRun} from '../src/game/leaderboard';
test('shared ranking updates one existing row and nuclear use removes only that run record',async()=>{
 const db=localDatabase(':memory:');db.exec(readFileSync('server/schema.sql','utf8'));
 const original=Date.now;let now=1800000000000;Date.now=()=>now;
 const call=(path:string,body?:unknown,origin='http://localhost:5173')=>worker.fetch(new Request(`http://localhost${path}`,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DB:db.api});
 const player=crypto.randomUUID(),second=crypto.randomUUID(),ids=Object.keys(POINTS).filter(id=>POINTS[id]>0).slice(0,2),score=ids.reduce((sum,id)=>sum+POINTS[id],0);
 const start=async(p=player,mode='normal')=>{const response=await call('/runs',{player:p,mode});assert.equal(response.status,201);const result=await response.json() as {id:string};now+=2000;return result.id;};
 const save=(run:string,nickname='방송국 멤버',destroyed=ids,points=score)=>call('/scores',{run,nickname,destroyed,score:points});
 const entries=async()=>((await (await call('/leaderboard')).json()) as {entries:{nickname:string;score:number}[]}).entries;
 try{
  const run=await start();
  assert.equal((await save(run,'<script>')).status,400);
  assert.equal((await save(run,'멤버',[ids[0],ids[0]])).status,400);
  assert.equal((await save(run,'멤버',['fake'])).status,400);
  assert.equal((await save(run,'멤버',ids,score+1)).status,400);
  assert.equal((await save(run)).status,201);assert.equal((await save(run)).status,201);assert.equal((await entries()).length,1);
  const other=await start(second);assert.equal((await save(other,'다른 접속자')).status,201);
  const lower=await start();assert.equal((await save(lower,'갱신한 이름',[ids[0]],POINTS[ids[0]])).status,201);
  let rows=await entries();assert.equal(rows.length,2);assert.equal(rows.find(e=>e.nickname==='갱신한 이름')?.score,POINTS[ids[0]]);
  assert.equal((await save(lower,'재등록')).status,201);assert.equal((await entries()).length,2);
  const unused=await start(player,'nuke');assert.equal((await save(unused)).status,403);assert.equal((await entries()).length,2);
  assert.equal((await call(`/runs/${lower}/nuke`,{})).status,200);assert.equal((await save(lower)).status,403);
  rows=await entries();assert.equal(rows.length,1);assert.equal(rows[0].nickname,'다른 접속자');
  assert.equal((await call('/leaderboard?mode=nuke')).status,400);
  const expired=await start();now+=86400001;assert.equal((await save(expired)).status,410);
  assert.equal((await call('/leaderboard',undefined,'https://evil.example')).status,403);
  assert.equal((await call('/runs',{player,mode:'normal'},'')).status,403);
  assert.equal((await call('/scores',{run,nickname:'x'.repeat(17000)})).status,413);
  for(let i=0;i<12;i++)assert.equal((await call('/runs',{player,mode:'normal'})).status,201);
  assert.equal((await call('/runs',{player,mode:'normal'})).status,429);
 }finally{Date.now=original;db.close();}
});
test('client permits repeated updates, automatically excludes a nuclear run and recovers after reset',async()=>{
 const calls:string[]=[];let release:((value:{id:string})=>void)|undefined;
 const session=new RankingRun(async(path)=>{calls.push(path);if(path==='/runs')return new Promise<{id:string}>(resolve=>{release=resolve;});return {};},crypto.randomUUID());
 session.begin(1,false);release!({id:'one'});await session.submit(1,'멤버',10,['cup']);await session.submit(1,'멤버',20,['cup']);
 assert.deepEqual(calls,['/runs','/scores','/scores']);
 session.begin(1,true);await assert.rejects(session.submit(1,'멤버',30,['cup']),/핵폭탄/);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls.at(-1),'/runs/one/nuke');
 session.begin(2,false);release!({id:'two'});await session.submit(2,'멤버',10,['cup']);assert.equal(calls.at(-1),'/scores');
});
test('reset during run creation cancels submission of the old round',async()=>{
 let release:((value:{id:string})=>void)|undefined;let posted=false;
 const session=new RankingRun(async(path)=>{if(path==='/runs')return new Promise<{id:string}>(resolve=>{release=resolve;});posted=true;return {};},crypto.randomUUID());
 session.begin(1,false);const resolveOld=release!;const pending=session.submit(1,'멤버',10,['cup']);session.begin(2,false);resolveOld({id:'old'});
 await assert.rejects(pending,/상태가 바뀌어/);assert.equal(posted,false);release!({id:'new'});
});
