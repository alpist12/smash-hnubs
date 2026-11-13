"""생성된 캐릭터 GLB를 직접 손본다. 메시·뼈대 구조는 그대로 두고 노멀과 텍스처 이미지만 바꾼다.

blender -b --factory-startup --python scripts/fix-glb-texture.py -- in.glb out.glb [spots.json] [colors.json]
유진 선배: in = Meshy 원본 GLB, spots = scripts/yujin-spots.json, colors = scripts/yujin-colors.json
3) 색: colors.json에 실사진에서 뽑은 부위별 색(후드티·야상·바지·피부)을 넣으면, 후드티 밝기로 노출을 맞춘 뒤
   뼈대(머리/몸통/팔/손/다리)와 색으로 나눈 부위마다 그 색에 가깝게 맞춘다.

1) 노멀: UV 조각마다 갈라진 노멀을 같은 위치끼리 합쳐 얼굴·몸이 각져 보이는 것을 없앤다.
2) 얼룩: spots.json의 [{"u":..,"v":..,"r":픽셀}] 지점 안에서 주변보다 어두운 텍셀만 주변 색으로 메운다.
   지점은 미리보기에서 직접 찍어서 고른다(눈·눈썹처럼 원래 어두운 곳은 찍지 않으면 절대 바뀌지 않음).
"""
import json, struct, sys, os, tempfile
import numpy as np
import bpy

args = sys.argv[sys.argv.index('--') + 1:]
src, dst = args[:2]
spots = json.load(open(args[2])) if len(args) > 2 else []
recolor = json.load(open(args[3])) if len(args) > 3 else None

raw = open(src, 'rb').read()
jlen = struct.unpack_from('<I', raw, 12)[0]
gl = json.loads(raw[20:20 + jlen])
blen = struct.unpack_from('<I', raw, 20 + jlen)[0]
binc = bytearray(raw[28 + jlen:28 + jlen + blen])

def view(i):
    a = gl['accessors'][i]; bv = gl['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[a['componentType']]
    return a, bv.get('byteOffset', 0) + a.get('byteOffset', 0), bv.get('byteStride', n * np.dtype(dt).itemsize), n, dt
def accessor(i):
    a, off, stride, n, dt = view(i); size = np.dtype(dt).itemsize
    buf = np.frombuffer(bytes(binc), np.uint8, stride * (a['count'] - 1) + n * size, off)
    return np.lib.stride_tricks.as_strided(buf, (a['count'], n * size), (stride, 1)).copy().view(dt).reshape(-1, n)

prim = gl['meshes'][0]['primitives'][0]
pos = accessor(prim['attributes']['POSITION']).astype(float)
tri = accessor(prim['indices']).reshape(-1, 3).astype(np.int64)

# 1) 노멀
_, group = np.unique(np.round(pos / (np.abs(pos).max() * 1e-5)), axis=0, return_inverse=True)
group = group.ravel()
face_n = np.cross(pos[tri[:, 1]] - pos[tri[:, 0]], pos[tri[:, 2]] - pos[tri[:, 0]])
summed = np.zeros((group.max() + 1, 3))
for k in range(3): np.add.at(summed, group[tri[:, k]], face_n)
nrm = summed[group]; nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
_, off, stride, _, _ = view(prim['attributes']['NORMAL'])
for k, row in enumerate(nrm.astype(np.float32)): binc[off + k * stride:off + k * stride + 12] = row.tobytes()

# 2) 찍은 지점 주변의 튀어나온 파편 면 지우기
# 생성 모델에는 피부 밖으로 삐져나온 얇은 조각이 있고, 그 뒷면이 검은 얼룩처럼 보인다.
# 지점 근처에서 주변 표면(넓이 가중 평균)과 방향이 크게 다른 작은 면을 퇴화 삼각형으로 만들어 없앤다.
uv = accessor(prim['attributes']['TEXCOORD_0']).astype(float)
H_model = pos[:, 1].max() - pos[:, 1].min()
centroid = pos[tri].mean(axis=1); area = np.linalg.norm(face_n, axis=1); unit_n = face_n / (area[:, None] + 1e-30)
def uv_to_point(u, v):
    P = uv[tri]; a, b, c = P[:, 0], P[:, 1], P[:, 2]
    d = (b[:, 1] - c[:, 1]) * (a[:, 0] - c[:, 0]) + (c[:, 0] - b[:, 0]) * (a[:, 1] - c[:, 1]); d[d == 0] = 1e-30
    l0 = ((b[:, 1] - c[:, 1]) * (u - c[:, 0]) + (c[:, 0] - b[:, 0]) * (v - c[:, 1])) / d
    l1 = ((c[:, 1] - a[:, 1]) * (u - c[:, 0]) + (a[:, 0] - c[:, 0]) * (v - c[:, 1])) / d
    hit = np.where((l0 >= -1e-4) & (l1 >= -1e-4) & (1 - l0 - l1 >= -1e-4))[0]
    return centroid[hit[0]] if len(hit) else None
removed = set()
small = np.median(area) * 4  # 얼굴의 일반 면보다 확실히 작은 것만
for s in spots:
    p = uv_to_point(s['u'], s['v'])
    if p is None or s.get('noshard'): continue  # 손가락 사이처럼 원래 꺾인 곳은 파편 판정을 끈다
    near = np.where(np.linalg.norm(centroid - p, axis=1) < H_model * .025)[0]
    for t in near:
        if area[t] > small: continue
        around = near[np.linalg.norm(centroid[near] - centroid[t], axis=1) < H_model * .012]
        # 감는 방향이 섞여 있고 안쪽에 겹친 면도 있어 부호 없이 비교한다: 표면과 거의 수직으로 선 작은 면만 파편으로 본다.
        ref = np.abs(unit_n[around] @ unit_n[t])
        if np.median(ref) < .3: removed.add(int(t))
if removed:
    ia, ioff, istride, _, idt = view(prim['indices']); size = np.dtype(idt).itemsize
    for t in removed:
        first = tri[t, 0]
        for k in range(3):
            o = ioff + (t * 3 + k) * size; binc[o:o + size] = np.array([first], idt).tobytes()
print(f'removed shard faces={len(removed)}')

# 3) 얼룩
src_tex = gl['images'][gl['textures'][gl['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
img_view = src_tex['bufferView']; v = gl['bufferViews'][img_view]
fd, tmp = tempfile.mkstemp(suffix='.jpg'); os.write(fd, bytes(binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])); os.close(fd)
img = bpy.data.images.load(tmp); W, H = img.size
px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px)
tex = px.reshape(H, W, 4)[::-1].copy()  # 위쪽이 0행(glTF UV와 같은 방향)

smooth = lambda t: np.clip(t, 0, 1) ** 2 * (3 - 2 * np.clip(t, 0, 1))
def minmax(im, r, f):
    for ax in (0, 1):
        pad = np.pad(im, [(r, r) if a == ax else (0, 0) for a in (0, 1)], mode='edge')
        im = f.reduce([np.take(pad, range(k, k + im.shape[ax]), axis=ax) for k in range(2 * r + 1)])
    return im
def blur(im, k):
    c = np.cumsum(np.cumsum(np.pad(im, ((k + 1, k), (k + 1, k), (0, 0)), mode='edge'), 0), 1)
    return (c[2*k+1:, 2*k+1:] - c[:-2*k-1, 2*k+1:] - c[2*k+1:, :-2*k-1] + c[:-2*k-1, :-2*k-1]) / (2 * k + 1) ** 2

fixed = 0
for s in spots:
    cx, cy, r = s['u'] * W, s['v'] * H, int(s.get('r', 14))
    pad = r * 2 + 4
    x0, y0 = max(int(cx) - pad, 0), max(int(cy) - pad, 0); x1, y1 = min(int(cx) + pad, W), min(int(cy) + pad, H)
    crop = tex[y0:y1, x0:x1, :3]
    lum = crop @ np.array([.3, .59, .11], np.float32)
    k = max(3, r // 2)
    closed = minmax(minmax(lum, k, np.maximum), k, np.minimum)  # 지점 크기보다 작은 어두운 점만 메운 밝기
    yy, xx = np.mgrid[y0:y1, x0:x1] + .5
    disk = smooth((r - np.hypot(xx - cx, yy - cy)) / (r * .35))
    if 'color' in s:  # 색을 직접 지정했으면 지점 전체를 칠한다
        w = disk
    elif s.get('any'):  # 반지 자국처럼 밝은 선도 있으면 지점 안 중앙값에서 벗어난 텍셀을 모두 메운다
        w = smooth((np.abs(lum - np.median(lum[disk > .5])) - .05) / .08) * disk
    else:
        w = smooth((closed - lum - .04) / .08) * disk
    keep = (w < .05).astype(np.float32)[..., None]
    fill = blur(crop * keep, k) / np.maximum(blur(keep, k), 1e-4)
    if 'color' in s:  # UV 이웃이 다른 부위(피부 등)라 색이 틀어질 때는 직접 지정한 색으로 메운다
        fill = np.broadcast_to(np.array(s['color'], np.float32), crop.shape)
    tex[y0:y1, x0:x1, :3] = crop * (1 - w[..., None]) + fill * w[..., None]
    fixed += int((w > .5).sum())

if recolor:
    # 텍셀마다 어느 뼈 부위인지: 정점의 가장 큰 가중치 뼈 → 삼각형 → UV에 칠한 지도
    names = [gl['nodes'][n]['name'] for n in gl['skins'][0]['joints']]
    def part_of(n):
        if n in ('Head', 'neck', 'head_end', 'headfront'): return 1
        if n.endswith('Hand'): return 2
        if n.endswith(('UpLeg', 'Leg')): return 3
        if n.endswith(('Foot', 'ToeBase')): return 4
        return 5 if n.endswith(('Arm', 'Shoulder')) else 6  # 팔 / 몸통
    joints, weights = accessor(prim['attributes']['JOINTS_0']), accessor(prim['attributes']['WEIGHTS_0']).astype(float)
    vpart = np.array([part_of(names[j]) for j in joints[np.arange(len(joints)), weights.argmax(1)]])
    part = np.zeros((H, W), np.uint8)
    for t in range(len(tri)):
        P = uv[tri[t]] * [W, H]
        x0, y0 = np.floor(P.min(0)).astype(int) - 1; x1, y1 = np.ceil(P.max(0)).astype(int) + 2
        gx, gy = np.meshgrid(np.arange(max(x0, 0), min(x1, W)) + .5, np.arange(max(y0, 0), min(y1, H)) + .5)
        d = (P[1, 1] - P[2, 1]) * (P[0, 0] - P[2, 0]) + (P[2, 0] - P[1, 0]) * (P[0, 1] - P[2, 1])
        if gx.size == 0 or abs(d) < 1e-12: continue
        l0 = ((P[1, 1] - P[2, 1]) * (gx - P[2, 0]) + (P[2, 0] - P[1, 0]) * (gy - P[2, 1])) / d
        l1 = ((P[2, 1] - P[0, 1]) * (gx - P[2, 0]) + (P[0, 0] - P[2, 0]) * (gy - P[2, 1])) / d
        e = -1.5 / max(1.0, np.abs(P - P.mean(0)).max())
        m = (l0 >= e) & (l1 >= e) & (1 - l0 - l1 >= e)
        part[gy[m].astype(int), gx[m].astype(int)] = np.bincount(vpart[tri[t]]).argmax()
    rgb = tex[..., :3]; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = rgb @ np.array([.3, .59, .11], np.float32); sat = rgb.max(-1) - rgb.min(-1)
    head, hand, leg, arm, torso = (part == 1), (part == 2), (part == 3), (part == 5), (part == 6)
    member = {
        'parka': smooth((g - b - .015) / .03) * smooth((g - r + .03) / .03) * smooth((.75 - lum) / .1) * ~(head | hand),
        'hoodie': ~(head | hand | leg | (part == 4)) * smooth((lum - .68) / .08) * smooth((.12 - sat) / .05),  # 몸통·팔 쪽 밝은 무채색
        'pants': leg * smooth((.5 - lum) / .1) * smooth((r - g + .01) / .03),  # 갈색은 r > g, 초록 야상 자락은 제외됨
        'skin': (head | hand) * smooth((r - b - .08) / .06) * smooth((lum - .38) / .1),
    }
    model = {k: np.median(rgb[m > .7], axis=0) for k, m in member.items() if (m > .7).sum() > 50}
    # 사진은 실내 조명이라 부위별 밝기가 제각각이다. 색감(rgb를 밝기로 나눈 비율)은 사진에서 가져오고,
    # 밝기는 부위마다 lum 값으로 정한다: 숫자면 모델 밝기에 곱하고, true면 사진 rgb의 밝기를 그대로 쓴다.
    strength = recolor.get('strength', .85)
    L = lambda c: float(np.dot(c, [.3, .59, .11]))
    for k, m in member.items():
        if k not in model or k not in recolor: continue
        want = np.array(recolor[k]['rgb'], float); lum_rule = recolor[k].get('lum', 1)
        target = want / L(want) * (L(want) if lum_rule is True else L(model[k]) * lum_rule)
        target = np.clip(target, 0, 1)
        gain = np.clip(target / np.maximum(model[k], 1e-3), .35, 1.8)
        rgb *= 1 + (m * strength)[..., None] * (gain - 1)
        print(f'recolor {k}: model={np.round(model[k], 3)} target={np.round(target, 3)} texels={(m > .5).sum()}')
    tex[..., :3] = np.clip(rgb, 0, 1)

img.pixels.foreach_set(tex[::-1].ravel())
fd, jpg = tempfile.mkstemp(suffix='.jpg'); os.close(fd)
img.file_format = 'JPEG'; img.save(filepath=jpg, quality=92)  # 색 변환 없이 원본 sRGB 값 그대로
new_img = open(jpg, 'rb').read()

order = sorted(range(len(gl['bufferViews'])), key=lambda k: gl['bufferViews'][k].get('byteOffset', 0))
out = bytearray()
for k in order:
    bv = gl['bufferViews'][k]; o = bv.get('byteOffset', 0)
    data = new_img if k == img_view else binc[o:o + bv['byteLength']]
    out += b'\0' * ((4 - len(out) % 4) % 4); bv['byteOffset'] = len(out); bv['byteLength'] = len(data); out += data
out += b'\0' * ((4 - len(out) % 4) % 4); gl['buffers'][0]['byteLength'] = len(out)
js = json.dumps(gl, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
with open(dst, 'wb') as f:
    f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(out)))
    f.write(struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out))
print(f'FIXED spots={len(spots)} texels={fixed} tex={W}x{H} -> {dst}')
