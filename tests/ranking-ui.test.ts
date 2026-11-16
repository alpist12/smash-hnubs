import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Leaderboard} from '../src/ui/Leaderboard';
import {NuclearCinematic} from '../src/ui/NuclearCinematic';
import {useGame} from '../src/game/store';
test('ranking dialog exposes public submission and automatic nuclear exclusion; nuclear warning announces impact',()=>{
 const initial=useGame.getInitialState(),backup={...initial};
 try {
 useGame.getState().reset();
 const html=renderToStaticMarkup(createElement(Leaderboard,{onClose:()=>{}}));
 assert.match(html,/role="dialog"/);assert.match(html,/공개 닉네임/);assert.doesNotMatch(html,/랭킹 종류/);assert.match(html,/자동 제외/);assert.match(html,/핵폭탄 사용/);assert.match(html,/disabled/);
 initial.nuke={id:1,born:performance.now(),point:[0,0,0],impacted:false};
 assert.match(renderToStaticMarkup(createElement(NuclearCinematic)),/핵폭탄 투하 경고/);
 initial.nuke={id:1,born:performance.now()-3000,point:[0,0,0],impacted:true};
 assert.match(renderToStaticMarkup(createElement(NuclearCinematic)),/방송국 전역 폭발/);
 initial.usedNuke=true;const excluded=renderToStaticMarkup(createElement(Leaderboard,{onClose:()=>{}}));assert.match(excluded,/랭킹 제외/);assert.match(excluded,/disabled/);
 }finally{Object.assign(initial,backup);useGame.getState().reset();}
});
