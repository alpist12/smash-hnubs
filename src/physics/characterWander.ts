import type { RigidBody, World } from '@dimforge/rapier3d-compat';
import { PLATFORM_EDGE_X, BOOTH_WALL_Z, STUDIO_START, WORLD } from '../data/studios';
import { clearWalkSegment, findWalkPath, type WalkPoint } from './characterNavigation';

const STOPS = [{ x: -3.6, z: 1.8 }, { x: .8, z: -7.1 }, { x: -3.7, z: -13.2 }];
export function nextPatrolStop(z: number, random: () => number) {
  const current = z < BOOTH_WALL_Z ? 2 : z < STUDIO_START ? 1 : 0;
  const choices = STOPS.filter((_, index) => index !== current);
  const goal = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  return { x: goal.x + (random() - .5) * .7, z: goal.z + (random() - .5) * .7 };
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
  constructor(private random = Math.random) {}

  step(world: World, body: RigidBody, delta: number, now: number, active: boolean) {
    this.speed = 0;
    this.startedAt ??= now;
    if (!active || now - this.startedAt < 100) return;
    const p = body.translation(), v = body.linvel();
    if (Math.hypot(p.x - this.lastX, p.z - this.lastZ) > .08) {
      this.lastX = p.x; this.lastZ = p.z; this.movedAt = now;
    }
    if (now < this.restUntil) { body.setLinvel({ x: 0, y: v.y, z: 0 }, false); return; }
    const following = this.route.length > 0;
    while (this.route.length && Math.hypot(this.route[0].x - p.x, this.route[0].z - p.z) < .16) this.route.shift();
    if (!this.route.length) {
      const goal = this.goal ??= nextPatrolStop(p.z, this.random);
      if (following || Math.hypot(goal.x - p.x, goal.z - p.z) < .7) {
        this.goal = undefined; this.restUntil = now + 700 + this.random() * 1200;
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
    const pace = Math.abs(turn) < .45 ? .8 * Math.cos(turn) * Math.min(1, distance / .35) : 0;
    const blend = Math.min(1, delta * 40);
    const x = v.x + (Math.sin(this.heading) * pace - v.x) * blend;
    const z = v.z + (Math.cos(this.heading) * pace - v.z) * blend;
    // The real studio floor has a 12 cm step. A small lift clears its rounded capsule foot.
    const stepUp = p.z < STUDIO_START - .2 && p.z > BOOTH_WALL_Z + .2 && p.x > PLATFORM_EDGE_X - .38 && p.x < PLATFORM_EDGE_X + .1 && p.y < .105 && x > .08;
    body.setLinvel({ x, y: stepUp ? Math.max(v.y, 1.7) : v.y, z }, true);
    this.speed = Math.min(.9, Math.hypot(v.x, v.z));
  }
}
