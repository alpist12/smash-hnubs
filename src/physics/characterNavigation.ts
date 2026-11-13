import { Capsule, type RigidBody, type World } from '@dimforge/rapier3d-compat';
import { BOOTH_WALL_Z, PLATFORM_EDGE_X, STUDIO_START, WORLD } from '../data/studios';
export type WalkPoint = { x: number; z: number };
const CELL = .125, MIN_X = -WORLD.width / 2 + .375, MIN_Z = WORLD.minZ + .375;
const COLS = Math.floor((WORLD.width - .75) / CELL) + 1, ROWS = Math.floor((WORLD.maxZ - WORLD.minZ - .75) / CELL) + 1;
const shape = new Capsule(.57, .31), rotation = { x: 0, y: 0, z: 0, w: 1 }, GROUPS = 0x00010001;
export function walkFloor(x: number, z: number) {
  return x + .32 > PLATFORM_EDGE_X && z + .32 > BOOTH_WALL_Z && z - .32 < STUDIO_START ? .12 : 0;
}
export function clearWalkSegment(world: World, body: RigidBody, from: WalkPoint, to: WalkPoint) {
  const y = Math.max(walkFloor(from.x, from.z), walkFloor(to.x, to.z)) + .97;
  return !world.castShape({ x: from.x, y, z: from.z }, rotation, { x: to.x - from.x, y: 0, z: to.z - from.z }, shape, .01, 1, false, undefined, GROUPS, undefined, body);
}
/** Rebuild from live colliders, so moved or broken furniture is reflected in the route. */
export function findWalkPath(world: World, body: RigidBody, from: WalkPoint, to: WalkPoint): WalkPoint[] {
  const occupancy = new Int8Array(COLS * ROWS).fill(-1);
  const point = (id: number) => ({ x: MIN_X + id % COLS * CELL, z: MIN_Z + Math.floor(id / COLS) * CELL });
  function free(id: number) {
    if (occupancy[id] >= 0) return occupancy[id] === 1;
    const p = point(id); let blocked = false;
    world.intersectionsWithShape({ x: p.x, y: walkFloor(p.x, p.z) + .97, z: p.z }, rotation, shape, () => { blocked = true; return false; }, undefined, GROUPS, undefined, body);
    occupancy[id] = blocked ? 0 : 1; return !blocked;
  }
  function nearest(p: WalkPoint) {
    const candidates: number[] = [];
    const x = Math.round((p.x - MIN_X) / CELL), z = Math.round((p.z - MIN_Z) / CELL);
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      if (x + dx >= 0 && x + dx < COLS && z + dz >= 0 && z + dz < ROWS) candidates.push((z + dz) * COLS + x + dx);
    }
    candidates.sort((a, b) => Math.hypot(point(a).x - p.x, point(a).z - p.z) - Math.hypot(point(b).x - p.x, point(b).z - p.z));
    return candidates.find(free);
  }
  const start = nearest(from), end = nearest(to);
  if (start === undefined || end === undefined) return [];
  const costs = new Float64Array(COLS * ROWS).fill(Infinity), parents = new Int32Array(COLS * ROWS).fill(-1);
  const open = new Set([start]), closed = new Set<number>(); costs[start] = 0;
  const destination = point(end), estimate = (id: number) => Math.hypot(point(id).x - destination.x, point(id).z - destination.z) / CELL;
  while (open.size) {
    let current = -1, best = Infinity;
    for (const id of open) { const score = costs[id] + estimate(id); if (score < best) { current = id; best = score; } }
    if (current === end) {
      const route: WalkPoint[] = [];
      for (let id = end; id !== -1; id = parents[id]) route.push(point(id));
      route.reverse(); route[0] = { ...from };
      const smooth = [route[0]];
      for (let i = 0; i < route.length - 1;) {
        let next = i + 1;
        while (next + 1 < route.length && clearWalkSegment(world, body, route[i], route[next + 1])) next++;
        smooth.push(route[next]); i = next;
      }
      return smooth.slice(1);
    }
    open.delete(current); closed.add(current);
    const x = current % COLS, z = Math.floor(current / COLS);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dz) || x + dx < 0 || x + dx >= COLS || z + dz < 0 || z + dz >= ROWS) continue;
      const next = (z + dz) * COLS + x + dx;
      if (closed.has(next) || !free(next) || (dx && dz && (!free(z * COLS + x + dx) || !free((z + dz) * COLS + x)))) continue;
      const cost = costs[current] + Math.hypot(dx, dz);
      if (cost < costs[next]) { costs[next] = cost; parents[next] = current; open.add(next); }
    }
  }
  return [];
}
