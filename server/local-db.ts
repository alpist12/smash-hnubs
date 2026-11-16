import {DatabaseSync, type SQLInputValue} from 'node:sqlite';
import type {Database,Statement} from './worker';
export function localDatabase(path:string){
 const db=new DatabaseSync(path);
 function prepare(sql:string):Statement {
  let values:SQLInputValue[]=[];
  return {bind(...args){values=args as SQLInputValue[];return this;},
   async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},
   async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},
   async run(){return db.prepare(sql).run(...values);}};
 }
 const api:Database={prepare,async batch(statements){db.exec('BEGIN');try{const result=[];for(const statement of statements)result.push(await statement.run());db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}};
 return {api,exec:(sql:string)=>db.exec(sql),close:()=>db.close()};
}
