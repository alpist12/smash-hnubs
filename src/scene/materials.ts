import { CanvasTexture, RepeatWrapping, SRGBColorSpace, NoColorSpace, MeshStandardMaterial, MeshPhysicalMaterial, type Texture } from 'three';
import type { Finish } from '../data/types';
import { ROOM } from '../data/room';
import { useGame } from '../game/store';
import { wallTexture } from './wallTextures';

function texture(kind: 'wood' | 'fabric' | 'leather' | 'carpet' | 'screen') {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  let seed = 1729;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (kind === 'screen') {
    ctx.scale(2, 2);
    ctx.fillStyle = '#192631'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#2b3d48'; ctx.fillRect(0, 0, 256, 22); ctx.fillRect(0, 22, 38, 234);
    for (let row = 0; row < 22; row++) {
      ctx.fillStyle = ['#8bbaae', '#e3b482', '#7997ad'][row % 3];
      ctx.fillRect(50 + (row % 4) * 8, 36 + row * 8, 35 + rand() * 120, 2);
    }
    ctx.fillStyle = '#d6e3dc'; ctx.font = 'bold 17px sans-serif'; ctx.fillText('HNUBS', 171, 239);
  } else {
    const image = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4;
      const v = kind === 'wood' ? 231 + Math.sin(y * .17 + Math.sin(x * .006) * 2.6) * 6 + rand() * 5 : kind === 'leather' ? 230 + rand() * 12 + Math.sin(x * .04 + Math.sin(y * .018)) * 3 : 210 + rand() * 30 + Math.sin(x * Math.PI / 3) * 5 + Math.cos(y * Math.PI / 3) * 5;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = v; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    if (kind === 'carpet') { ctx.strokeStyle = '#b4b4b4'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, 512, 512); }
  }
  const map = new CanvasTexture(c); map.colorSpace = SRGBColorSpace; map.wrapS = map.wrapT = RepeatWrapping;
  if (kind === 'carpet') map.repeat.set(ROOM.width * 2, ROOM.depth * 2);
  if (kind === 'fabric') map.repeat.set(5, 5);
  if (kind === 'leather') map.repeat.set(3, 3);
  map.anisotropy = 8;
  return map;
}
export const maps = { wood: texture('wood'), fabric: texture('fabric'), leather: texture('leather'), carpet: texture('carpet'), screen: texture('screen') };
const verticalWood = maps.wood.clone(); verticalWood.center.set(.5, .5); verticalWood.rotation = Math.PI / 2; verticalWood.needsUpdate = true;
function bump(source: Texture) { const map = source.clone(); map.colorSpace = NoColorSpace; map.needsUpdate = true; return map; }
export const bumps = { wood: bump(maps.wood), verticalWood: bump(verticalWood), fabric: bump(maps.fabric), leather: bump(maps.leather), carpet: bump(maps.carpet) };
const cache = new Map<string, MeshStandardMaterial>();
export function material(finish: Finish, color?: string, damage = false, vertical = false) {
  const high = useGame.getState().quality === 'high';
  const key = `${high}:${finish}:${color}:${damage}:${vertical}`;
  if (!cache.has(key)) {
    const defaults: Record<Finish, string> = { wood: '#d1b17a', metal: '#454b50', black: '#292d31', screen: '#ffffff', fabric: '#8896a0', leather: '#c6c5ae', paper: '#d8d7c9', white: '#e5e3d8', glass: '#9caeb4' };
    const options = { color: color ?? defaults[finish], roughness: finish === 'metal' ? .28 : finish === 'glass' ? .16 : finish === 'screen' ? .32 : finish === 'wood' ? .64 : finish === 'leather' ? .66 : finish === 'black' || finish === 'white' ? .48 : .9, metalness: finish === 'metal' ? .75 : 0, map: finish === 'wood' ? (vertical ? verticalWood : maps.wood) : finish === 'fabric' ? maps.fabric : finish === 'leather' ? maps.leather : finish === 'screen' ? maps.screen : null };
    const m = high && ['fabric', 'leather', 'glass'].includes(finish) ? new MeshPhysicalMaterial({ ...options, clearcoat: finish === 'glass' ? .6 : finish === 'leather' ? .14 : 0, clearcoatRoughness: finish === 'glass' ? .2 : .75, sheen: finish === 'fabric' ? .45 : finish === 'leather' ? .2 : 0, sheenColor: color ?? defaults[finish], sheenRoughness: .9 }) : new MeshStandardMaterial(options);
    if (high && (finish === 'wood' || finish === 'fabric' || finish === 'leather')) {
      m.bumpMap = finish === 'wood' ? (vertical ? bumps.verticalWood : bumps.wood) : bumps[finish];
      m.bumpScale = finish === 'wood' ? .003 : .006; m.roughnessMap = m.bumpMap;
    }
    if (finish === 'glass') { m.transparent = true; m.opacity = .23; m.depthWrite = false; }
    if (damage) { m.color.multiplyScalar(.56); m.roughness = 1; }
    if (finish === 'screen') { m.emissive.set('#52768c'); m.emissiveIntensity = .25; }
    if (finish === 'white' && color === '#fff5d9') { m.emissive.set('#fff4d6'); m.emissiveIntensity = 1.2; }
    cache.set(key, m);
  }
  return cache.get(key)!;
}

const textured = new Map<string, MeshStandardMaterial>();
/** 그림이 있는 부품(화이트보드·칠판·시계 면). */
export function texturedMaterial(key: string, damage = false) {
  const id = `${key}:${damage}`;
  if (!textured.has(id)) {
    const m = new MeshStandardMaterial({ map: wallTexture(key), roughness: key === 'chalk' ? .95 : .4 });
    if (damage) m.color.setScalar(.62);
    textured.set(id, m);
  }
  return textured.get(id)!;
}
