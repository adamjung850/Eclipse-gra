import math
from PIL import Image, ImageDraw, ImageFilter

W, H = 256, 256
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

# Build exact same 3D crystal cluster mesh as IntroScene.ts
vertices = []
triangles = []

def add_crystal_pillar(ox, oy, oz, tz, tx, radius, body_h, tip_h, hue_shift):
    sides = 6
    base_idx = len(vertices)
    cz, sz = math.cos(tz), math.sin(tz)
    cx, sx = math.cos(tx), math.sin(tx)

    def push_v(x, y, z):
        y1 = y * cx - z * sx
        z1 = y * sx + z * cx
        x2 = x * cz - y1 * sz
        y2 = x * sz + y1 * cz
        vertices.append((x2 + ox, y2 + oy, z1 + oz))

    push_v(0, -(body_h + tip_h), 0)
    push_v(0, body_h + tip_h, 0)
    for i in range(sides):
        a = (i / sides) * math.pi * 2
        push_v(math.cos(a) * radius, -body_h, math.sin(a) * radius)
    for i in range(sides):
        a = (i / sides) * math.pi * 2
        push_v(math.cos(a) * radius, body_h, math.sin(a) * radius)

    top_tip = base_idx
    bot_tip = base_idx + 1
    for i in range(sides):
        nxt = (i + 1) % sides
        t1, t2 = base_idx + 2 + i, base_idx + 2 + nxt
        b1, b2 = base_idx + 2 + sides + i, base_idx + 2 + sides + nxt
        h = hue_shift + i * 0.22
        triangles.append((top_tip, t1, t2, h))
        triangles.append((t1, b1, t2, h + 0.1))
        triangles.append((t2, b1, b2, h + 0.1))
        triangles.append((bot_tip, b2, b1, h + 0.2))

add_crystal_pillar(0, 0.2, 0, 0.02, 0, 2.2, 2.8, 3.8, 0.0)
add_crystal_pillar(-3.0, 1.4, 0.5, -0.58, 0.16, 1.4, 1.8, 2.5, 0.9)
add_crystal_pillar(3.1, 1.1, -0.5, 0.54, -0.14, 1.5, 2.0, 2.7, 1.7)
add_crystal_pillar(-0.8, 2.6, 1.6, -0.24, 0.35, 1.0, 1.1, 1.5, 2.4)

# Render on 64x64 pixel-art grid then upscale 4x NEAREST -> 256x256
# Large crystal filling ~90% of the icon, ZERO blurry glow!
GRID = 64
rot_y = 0.52
tilt_x = 0.28
cos_y, sin_y = math.cos(rot_y), math.sin(rot_y)
cos_x, sin_x = math.cos(tilt_x), math.sin(tilt_x)
fov = 22.5
cam_dist = 17.0

trans = []
proj = []
for vx, vy, vz in vertices:
    rx = vx * cos_y - vz * sin_y
    rz1 = vx * sin_y + vz * cos_y
    ry = vy * cos_x - rz1 * sin_x
    rz = vy * sin_x + rz1 * cos_x
    trans.append((rx, ry, rz))
    persp = fov / (cam_dist - rz)
    proj.append((GRID * 0.5 + rx * persp, GRID * 0.5 + ry * persp, rz))

zbuf = [[-1e9] * GRID for _ in range(GRID)]
colbuf = [[None] * GRID for _ in range(GRID)]

lx, ly, lz = -0.45, -0.60, 0.66
for a, b, c, hue_shift in triangles:
    ax, ay, az = proj[a]
    bx, by, bz = proj[b]
    cx, cy, cz = proj[c]
    va, vb, vc = trans[a], trans[b], trans[c]
    ux, uy, uz = vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]
    wx, wy, wz = vc[0] - va[0], vc[1] - va[1], vc[2] - va[2]
    nx = uy * wz - uz * wy
    ny = uz * wx - ux * wz
    nz = ux * wy - uy * wx
    nlen = math.hypot(nx, ny, nz) or 1.0
    nx, ny, nz = nx / nlen, ny / nlen, nz / nlen
    fnz = abs(nz)
    fnx = -nx if nz < 0 else nx
    fny = -ny if nz < 0 else ny
    diff = max(0.0, fnx * lx + fny * ly + fnz * lz)
    spec = (max(0.0, fnz * 0.85 + diff * 0.35) ** 4) * 0.45
    shade = max(0.35, min(1.05, 0.38 + diff * 0.56 + spec))

    denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(denom) < 1e-4:
        continue
    inv_d = 1.0 / denom
    min_x = max(0, int(math.floor(min(ax, bx, cx))))
    max_x = min(GRID - 1, int(math.ceil(max(ax, bx, cx))))
    min_y = max(0, int(math.floor(min(ay, by, cy))))
    max_y = min(GRID - 1, int(math.ceil(max(ay, by, cy))))

    for py in range(min_y, max_y + 1):
        for px in range(min_x, max_x + 1):
            sx, sy = px + 0.5, py + 0.5
            w1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) * inv_d
            w2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) * inv_d
            w3 = 1.0 - w1 - w2
            if w1 >= -0.02 and w2 >= -0.02 and w3 >= -0.02:
                z = w1 * az + w2 * bz + w3 * cz
                if z > zbuf[py][px]:
                    zbuf[py][px] = z
                    hm = max(0.0, min(1.0, 0.5 + 0.5 * math.sin((hue_shift + (w1 - w2) * 0.25) * 2.6)))
                    br = 16 + hm * 214
                    bg = 195 - hm * 125
                    bb = 255 - hm * 25
                    hi = max(0.0, shade - 0.75) * 0.55
                    r = min(255, int(br * shade + 165 * hi))
                    g = min(255, int(bg * shade + 225 * hi))
                    b_col = min(255, int(bb * shade + 255 * hi))
                    colbuf[py][px] = (r, g, b_col, 255)

small = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
spx = small.load()
# Dark crisp outline
for py in range(GRID):
    for px in range(GRID):
        if colbuf[py][px] is None:
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = py + dy, px + dx
                    if 0 <= nx < GRID and 0 <= ny < GRID and colbuf[ny][nx] is not None:
                        spx[px, py] = (4, 10, 24, 255)
                        break
        else:
            spx[px, py] = colbuf[py][px]

# Auto-crop transparent padding so the crystal fills ~94% of the 256x256 icon
bbox = small.getbbox()
if bbox:
    cropped = small.crop(bbox)
    cw, ch = cropped.size
    target_max = 244
    scale = min(target_max / cw, target_max / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = cropped.resize((nw, nh), Image.NEAREST)
    crystal_big = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    crystal_big.paste(resized, ((256 - nw) // 2, (256 - nh) // 2))
else:
    crystal_big = small.resize((256, 256), Image.NEAREST)

crystal_big.save("assets/textures/delveria_logo_crystal.png")
print("Generated full-size crisp 3D crystal icon!")
