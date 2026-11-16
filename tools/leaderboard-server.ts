import {createServer} from 'node:http';
import {mkdirSync,readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import worker from '../server/worker';
import {localDatabase} from '../server/local-db';
mkdirSync('work',{recursive:true});
const db=localDatabase('work/leaderboard.sqlite');
db.exec(readFileSync('server/schema.sql','utf8'));
const columns=await db.api.prepare('PRAGMA table_info(scores)').all<{name:string}>();
if(!columns.results.some(column=>column.name==='run'))db.exec("ALTER TABLE scores ADD COLUMN run TEXT NOT NULL DEFAULT ''");
createServer(async (req,res)=>{
 try{
  const request=new Request(`http://localhost:8787${req.url}`,{method:req.method,headers:req.headers as HeadersInit,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})} as RequestInit);
  const response=await worker.fetch(request,{DB:db.api});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Ranking server error');}
}).listen(8787,'127.0.0.1',()=>console.log('Local leaderboard: http://localhost:8787/leaderboard'));
