import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, ShapeUtils, TubeGeometry, Vector2, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { V3 } from '../data/types';

type Ring = [y: number, width: number, depth: number, z?: number];
const HEAD: Ring[] = [[0,.055,.055],[.025,.100,.085],[.065,.145,.106],[.115,.174,.119],[.18,.177,.126],[.245,.160,.125],[.31,.152,.117],[.36,.133,.098],[.405,.075,.058],[.423,.002,.002]];
export const CHIN_Y = 1.455;
function profile(rings: Ring[], y: number) {
  const found = rings.findIndex(r => r[0] >= y);
  const i = found < 0 ? rings.length - 1 : Math.max(1, found);
  const a = rings[i - 1], b = rings[i];
  let t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0]))); t = t * t * (3 - 2 * t);
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * t];
}
const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
function faceRelief(x: number, y: number) {
  return .021 * gaussian(x,y,0,.223,.027,.063) + .035 * gaussian(x,y,0,.180,.043,.027)
    + .013 * gaussian(x,y,-.095,.155,.045,.05) + .013 * gaussian(x,y,.095,.155,.045,.05)
    + .010 * gaussian(x,y,0,.105,.065,.035)
    - .009 * gaussian(x,y,-.074,.254,.037,.021) - .009 * gaussian(x,y,.074,.254,.037,.021);
}
export function faceZ(x: number, y: number) {
  const [w,d] = profile(HEAD, Math.max(0, Math.min(.423, y)));
  const c = Math.sqrt(Math.max(0, 1 - (x / w) ** 2));
  return d * c + faceRelief(x,y) * c ** 4;
}
function ringsGeometry(rings: Ring[], segments = 40, rows = 48, arc = Math.PI * 2, start = -Math.PI, sculpt = false) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const min = rings[0][0], max = rings[rings.length - 1][0];
  for (let row = 0; row <= rows; row++) {
    const y = min + (max - min) * row / rows, [w,d,zc] = profile(rings,y);
    for (let col = 0; col <= segments; col++) {
      const a = start + col / segments * arc, c = Math.cos(a), x = Math.sin(a) * w;
      let z = c * d + zc;
      if (sculpt && c > 0) z += faceRelief(x,y) * c ** 4;
      positions.push(x,y,z);
      if (sculpt) {
        const skin = new Color('#c79c87');
        const cheek = gaussian(Math.abs(x),y,.095,.145,.05,.045) * Math.max(0,c);
        skin.lerp(new Color('#c68d7e'),cheek * .28);
        skin.multiplyScalar(1 + .025 * Math.sin(y * 18)); colors.push(skin.r,skin.g,skin.b);
      }
      if (row < rows && col < segments) {
        const n = row * (segments + 1) + col;
        indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  if (colors.length) geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
export function headGeometry() { return ringsGeometry(HEAD,64,64,Math.PI*2,-Math.PI,true); }
export function facePatch(points: [number,number][], lift = .003) {
  const triangles=ShapeUtils.triangulateShape(points.map(p=>new Vector2(...p)),[]);
  const positions:number[]=[],indices:number[]=[];
  // 작은 삼각형을 얼굴 곡면에 밀착해 입술·치아가 피부에 묻히지 않게 한다.
  for(const triangle of triangles) {
    const [a,b,c]=triangle.map(i=>new Vector2(...points[i]));
    const offset=positions.length/3,n=8;
    for(let i=0;i<=n;i++) for(let j=0;j<=n-i;j++) {
      const x=a.x+(b.x-a.x)*i/n+(c.x-a.x)*j/n;
      const y=a.y+(b.y-a.y)*i/n+(c.y-a.y)*j/n;
      positions.push(x,y,faceZ(x,y)+lift);
    }
    const row=(i:number)=>offset+i*(n+1)-i*(i-1)/2;
    for(let i=0;i<n;i++) for(let j=0;j<n-i;j++) {
      indices.push(row(i)+j,row(i+1)+j,row(i)+j+1);
      if(j<n-i-1) indices.push(row(i)+j+1,row(i+1)+j,row(i+1)+j+1);
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  if(geometry.getAttribute('normal').getZ(0)<0) { for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];geometry.setIndex(indices);geometry.computeVertexNormals(); }
  return geometry;
}
export function stroke(points: V3[], radius: number, segments = 24) { return new TubeGeometry(new CatmullRomCurve3(points.map(p => new Vector3(...p))),segments,radius,6,false); }
export function faceStroke(points: [number,number][], radius: number, lift = .003) { return stroke(points.map(([x,y]) => [x,y,faceZ(x,y)+lift]),radius); }
function merge(parts: BufferGeometry[]) { parts.forEach(part=>part.deleteAttribute('uv')); const geometry=mergeGeometries(parts)!; parts.forEach(part=>part.dispose()); return geometry; }
export function hairGeometry(highlights = false) {
  const parts: BufferGeometry[] = highlights ? [] : [ringsGeometry([[1.32,.13,.065,-.05],[1.38,.185,.11,-.04],[1.51,.193,.15,-.02],[1.72,.174,.14,-.015],[1.84,.14,.10,-.01],[1.88,.085,.05]],36,38,Math.PI,Math.PI/2)];
  for (const side of [-1,1]) for (let i=0;i<(highlights?5:12);i++) {
    const t=i/(highlights?5:12), x=side*(.145+t*.055), z=.05-t*.11;
    parts.push(stroke([
      [side*(.025+t*.09),1.855,.10-t*.06], [side*(.11+t*.045),1.80,.127-t*.075],
      [x-side*.008,1.68,z+.02], [x+side*.016,1.54,z+.015], [x-side*.008,1.40,z+.04], [x+side*.047,1.335+t*.035,z+.075],
    ],highlights?.0014:.014-t*.005,32));
  }
  // 얼굴 옆으로 흘러내리는 가르마 앞머리.
  if (!highlights) for(const side of [-1,1]) parts.push(stroke([[side*.022,1.847,.12],[side*.085,1.80,.133],[side*.137,1.73,.115],[side*.135,1.65,.11],[side*.147,1.61,.096]],.009,32));
  return merge(parts);
}
export function torsoGeometry() { return ringsGeometry([[.77,.225,.122],[.81,.239,.133],[.99,.251,.145],[1.19,.255,.143],[1.30,.262,.123],[1.34,.240,.112],[1.375,.184,.093],[1.409,.085,.068]],48,40); }
export function sleeveGeometry(side: number) {
  const g=ringsGeometry([[0,.060,.06],[.05,.066,.064],[.18,.076,.075],[.34,.083,.081],[.49,.095,.084],[.55,.088,.073]],28,32);
  const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++) { const y=p.getY(i), t=y/.55; p.setXYZ(i,side*(.316-t*.052)+p.getX(i),.825+y,p.getZ(i)+.055*(1-t)); }
  g.computeVertexNormals(); return g;
}
export function trousersGeometry(side:number, segment: 'whole' | 'upper' | 'lower' = 'whole') {
  const rings: Ring[] = [[.11,.071,.068],[.16,.075,.074],[.35,.081,.08],[.47,.085,.09],[.66,.095,.108],[.80,.103,.112],[.83,.095,.105]];
  const g=ringsGeometry(rings.filter(r => segment === 'whole' || (segment === 'upper' ? r[0] >= .47 : r[0] <= .47)),28,segment === 'whole' ? 32 : 18);
  const p=g.getAttribute('position');
  for(let i=0;i<p.count;i++) p.setX(i,p.getX(i)+side*(.115+(1-p.getY(i)/.83)*.012));
  g.computeVertexNormals(); return g;
}
export function collarGeometry(side: number) {
  const p: V3[] = [[side*.025,1.409,.074],[side*.091,1.42,.061],[side*.160,1.358,.115],[side*.093,1.285,.151],[side*.031,1.35,.149]];
  const g=new BufferGeometry(); g.setAttribute('position',new Float32BufferAttribute(p.flat(),3));
  g.setIndex(side>0?[0,2,1,0,3,2,0,4,3]:[0,1,2,0,2,3,0,3,4]); g.computeVertexNormals(); return g;
}
// 곡선으로 휘고 끝이 가늘어지는 털 하나를 인스턴스로 재사용한다.
export function furGeometry() {
  const p:number[]=[], idx:number[]=[];
  for(let j=0;j<=5;j++) for(let i=0;i<4;i++) {
    const t=j/5, a=i/4*Math.PI*2, r=(1-t)*.075;
    p.push(Math.sin(t*Math.PI)*.13+Math.cos(a)*r,t,Math.sin(t*Math.PI*2)*.04+Math.sin(a)*r);
    if(j<5) { const n=j*4+i,next=j*4+(i+1)%4; idx.push(n,next,n+4,next,next+4,n+4); }
  }
  const g=new BufferGeometry(); g.setAttribute('position',new Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function yujinHairGeometry(highlights = false) {
  const parts: BufferGeometry[] = highlights ? [] : [ringsGeometry([[1.08,.23,.10,-.03],[1.25,.245,.135,-.02],[1.5,.205,.165,-.015],[1.72,.19,.16],[1.84,.15,.115],[1.91,.055,.035],[1.92,.002,.002]],36,40,Math.PI,Math.PI/2)];
  for (const side of [-1,1]) for(let i=0;i<(highlights?7:17);i++) {
    const t=i/(highlights?7:17), x=side*(.17+t*.065), z=.095-t*.20;
    parts.push(stroke([[side*(.04+t*.08),1.89,.09-t*.11],[side*(.15+t*.03),1.80,.13-t*.18],
      [x,1.62,z],[x-side*.018,1.43,z+.02],[x+side*.022,1.26,z+.035],[x-side*.006,1.12,z+.045],[x+side*.035,1.08+t*.025,z+.075]],highlights?.0018:.014,28));
  }
  if(!highlights) {
    for(const side of [-1,1]) {
      const lock=ringsGeometry([[1.06,.02,.018],[1.12,.065,.038],[1.25,.07,.045],[1.43,.06,.048],[1.61,.05,.05],[1.79,.032,.035]],28,48);
      const p=lock.getAttribute('position');
      for(let i=0;i<p.count;i++) {
        const y=p.getY(i),t=(1.8-y)/.74;
        p.setX(i,p.getX(i)+side*(.155+.095*t+.018*Math.sin(t*Math.PI*3)));
        p.setZ(i,p.getZ(i)+.075+.018*Math.sin(t*Math.PI*4));
      }
      lock.computeVertexNormals();parts.push(lock);
    }
    const vertices:number[]=[],indices:number[]=[];
    for(let row=0;row<=10;row++)for(let col=0;col<=32;col++) {
      const x=(col/32-.5)*.32, t=row/10;
      const lower=1.79+.027*Math.exp(-((x/.045)**2))+.006*Math.sin(x*75);
      vertices.push(x,(1.91-.12*(x/.16)**2)*(1-t)+lower*t,.095+.065*t-.035*(x/.16)**2+.002*Math.sin(x*250));
      if(row<10&&col<32){const n=row*33+col;indices.push(n,n+33,n+1,n+1,n+33,n+34);}
    }
    const bangs=new BufferGeometry();bangs.setAttribute('position',new Float32BufferAttribute(vertices,3));bangs.setIndex(indices);bangs.computeVertexNormals();parts.push(bangs);
  }
  if(highlights) for(const side of [-1,1]) for(let i=0;i<6;i++) {
    const x=side*(.015+i*.021);
    parts.push(stroke([[x*.5,1.9,.09],[x*.8,1.85,.14],[x,1.79,.157],[x+side*.018,1.78+Math.abs(x)*.1,.15]],highlights?.0012:.008,20));
  }
  const geometry=merge(parts),position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++) {
    position.setX(i,position.getX(i)*.96);
    if(position.getY(i)>CHIN_Y)position.setY(i,CHIN_Y+(position.getY(i)-CHIN_Y)*.78);
  }
  geometry.computeVertexNormals();return geometry;
}
export function parkaGeometry() {
  const geometry=ringsGeometry([[.32,.31,.19,-.015],[.55,.3,.18],[.8,.28,.17],[1.15,.276,.155],[1.30,.27,.135],[1.37,.195,.10]],52,48,Math.PI*2-1.3,.65);
  const p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),angle=Math.atan2(x,z);
    const fold=.004*Math.sin(y*35+angle*4)+.002*Math.sin(y*59-angle*7);
    p.setXYZ(i,x+Math.sin(angle)*fold,y+Math.max(0,1-(y-.32)/.13)*(.02+.02*Math.sin(angle*2)),z+Math.cos(angle)*fold);
  }
  const uv:number[]=[];
  for(let i=0;i<p.count;i++)uv.push((Math.atan2(p.getX(i),p.getZ(i))+Math.PI)/(Math.PI*2),(p.getY(i)-.32)/1.05);
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry;
}
export function parkaLapelGeometry(side:number) {
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute([[side*.065,1.38,.10],[side*.21,1.30,.145],[side*.18,1.12,.164],[side*.105,1.20,.17]].flat(),3));
  geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();return geometry;
}

export function yujinSleeveGeometry(side:number) {
  const geometry=ringsGeometry([[.825,.06,.057],[.85,.066,.063],[.94,.081,.074],[1.07,.092,.079],[1.20,.093,.08],[1.30,.085,.078],[1.36,.062,.06],[1.40,.025,.03]],32,44);
  const p=geometry.getAttribute('position'),uv:number[]=[];
  for(let i=0;i<p.count;i++) {
    const y=p.getY(i),t=(y-.825)/.575,angle=Math.atan2(p.getX(i),p.getZ(i));
    const fold=.0035*Math.sin(y*58+angle*3)*Math.sin(t*Math.PI);
    p.setXYZ(i,side*(.316-.051*t+.018*Math.sin(t*Math.PI))+p.getX(i)+Math.sin(angle)*fold,y,p.getZ(i)+.035*(1-t)+Math.cos(angle)*fold);
    uv.push(i%33/32,t);
  }
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry;
}
