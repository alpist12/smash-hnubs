import { CHARACTERS, type WanderStyle } from '../data/characters';
import type { RigidBody, World } from '@dimforge/rapier3d-compat';
import { PLATFORM_EDGE_X, BOOTH_WALL_Z, STUDIO_START, WORLD } from '../data/studios';
import { clearWalkSegment, findWalkPath, type WalkPoint } from './characterNavigation';

const STOPS = [{ x: -3.6, z: 1.8 }, { x: .8, z: -7.1 }, { x: -3.7, z: -13.2 }];
const roomIndex=(z:number)=>z<BOOTH_WALL_Z?2:z<STUDIO_START?1:0;
export function nextPatrolStop(z:number,random:()=>number,style?:WanderStyle){
  const current=roomIndex(z),stops=style?.stops??STOPS;
  const weights=stops.map((_,i)=>i===current?0:style?.roomWeights[current][i]??1);
  let roll=random()*weights.reduce((sum,weight)=>sum+weight,0),index=0;
  while(index<weights.length-1&&(weights[index]===0||roll>=weights[index])){roll-=weights[index];index++;}
  const goal=stops[index];
  return {x:goal.x+(random()-.5)*.7,z:goal.z+(random()-.5)*.7};
}
export function nextWanderGoal(position:WalkPoint,elapsed:number,style:WanderStyle,random:()=>number):WalkPoint {
  if(elapsed>=style.firstRoomMs && random()>style.stayChance)return nextPatrolStop(position.z,random,style);
  const current=roomIndex(position.z),anchor=style.stops[current];
  const minZ=current===2?WORLD.minZ:current===1?BOOTH_WALL_Z:STUDIO_START;
  const maxZ=current===2?BOOTH_WALL_Z:current===1?STUDIO_START:WORLD.maxZ;
  const angle=random()*Math.PI*2,distance=.6+random()*1.8;
  return {x:Math.max(-WORLD.width/2+.65,Math.min(WORLD.width/2-.65,anchor.x+Math.sin(angle)*distance)),z:Math.max(minZ+.75,Math.min(maxZ-.75,anchor.z+Math.cos(angle)*distance))};
}
export class CharacterWander {
  heading = .22;
  speed = 0;
  private route: WalkPoint[] = [];
  private goal: WalkPoint | undefined;
  private restUntil = 0;
  private checkAt = 0;
  private blockedAt: number | undefined;
  private movedAt = 0;
  private lastX = 0;
  private lastZ = 0;
  private startedAt: number | undefined;
  constructor(private random = Math.random, private style:WanderStyle = CHARACTERS[0].wander) {}

  step(world: World, body: RigidBody, delta: number, now: number, active: boolean) {
    this.speed = 0;
    if(this.startedAt===undefined){this.startedAt=now;this.restUntil=now+this.style.startDelay[0]+this.random()*(this.style.startDelay[1]-this.style.startDelay[0]);}
    if (!active) return;
    const p = body.translation(), v = body.linvel();
    if (Math.hypot(p.x - this.lastX, p.z - this.lastZ) > .08) {
      this.lastX = p.x; this.lastZ = p.z; this.movedAt = now;
    }
    if (now < this.restUntil) { body.setLinvel({ x: 0, y: v.y, z: 0 }, false); return; }
    const following = this.route.length > 0;
    while (this.route.length && Math.hypot(this.route[0].x - p.x, this.route[0].z - p.z) < .16) this.route.shift();
    if (!this.route.length) {
      const goal = this.goal ??= nextWanderGoal(p, now-this.startedAt, this.style, this.random);
      if (following || Math.hypot(goal.x - p.x, goal.z - p.z) < .7) {
        this.goal = undefined; this.restUntil = now + this.style.pause[0] + this.random() * (this.style.pause[1]-this.style.pause[0]);
        body.setLinvel({ x: 0, y: v.y, z: 0 }, false); return;
      }
      this.route = findWalkPath(world, body, p, goal); this.movedAt = now; this.checkAt = now + 500;
      if (!this.route.length) {
        this.blockedAt ??= now;
        // Two people can meet in a narrow doorway; turn around and make room before retrying.
        if (now - this.blockedAt > 2000) {
          const back = { x: Math.max(-WORLD.width/2+.4, Math.min(WORLD.width/2-.4, p.x-Math.sin(this.heading)*1.1)), z: Math.max(WORLD.minZ+.4, Math.min(WORLD.maxZ-.4, p.z-Math.cos(this.heading)*1.1)) };
          if (clearWalkSegment(world,body,p,back)) { this.route=[back]; this.goal=back; this.blockedAt=undefined; }
        }
        this.restUntil = now + 500 + this.random()*700; return;
      }
      this.blockedAt=undefined;
    }
    const target = this.route[0], distance = Math.hypot(target.x - p.x, target.z - p.z);
    const desired = Math.atan2(target.x - p.x, target.z - p.z);
    const turn = Math.atan2(Math.sin(desired - this.heading), Math.cos(desired - this.heading));
    this.heading += Math.max(-2 * delta, Math.min(2 * delta, turn));
    if (now >= this.checkAt) {
      this.checkAt = now + 400;
      const ahead = { x: p.x + Math.sin(this.heading) * Math.min(.4, distance), z: p.z + Math.cos(this.heading) * Math.min(.4, distance) };
      if (now - this.movedAt > 1800 || !clearWalkSegment(world, body, p, ahead)) {
        this.route = []; body.setLinvel({ x: 0, y: v.y, z: 0 }, false); return;
      }
    }
    const pace = Math.abs(turn) < .45 ? this.style.speed * Math.cos(turn) * Math.min(1, distance / .35) : 0;
    const blend = Math.min(1, delta * 40);
    const x = v.x + (Math.sin(this.heading) * pace - v.x) * blend;
    const z = v.z + (Math.cos(this.heading) * pace - v.z) * blend;
    // The real studio floor has a 12 cm step. A small lift clears its rounded capsule foot.
    const stepUp = p.z < STUDIO_START - .2 && p.z > BOOTH_WALL_Z + .2 && p.x > PLATFORM_EDGE_X - .38 && p.x < PLATFORM_EDGE_X + .1 && p.y < .105 && x > .08;
    body.setLinvel({ x, y: stepUp ? Math.max(v.y, 1.7) : v.y, z }, true);
    this.speed = Math.min(.9, Math.hypot(v.x, v.z));
  }
}
