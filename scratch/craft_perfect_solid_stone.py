import math
from PIL import Image
import numpy as np

T = 24

# Let's craft the PERFECT Solid Stone Block:
# Key requirements:
# 1. NOT GRAVEL: No 1-pixel high-contrast salt-and-pepper noise!
#    Pixels form cohesive rock patches of 2x2 and 3x3 pixels.
# 2. NOT DIAGONAL HERRINGBONE: No 45-degree diagonal repeat lines!
# 3. SOLID ROCK: Solid, heavy, calm bedrock with subtle organic fracture lines.

# We work on a 12x12 native grid (2x2 chunky pixels -> 24x24 tile):
N = 12

def generate_solid_rock_matrix(seed=987):
    np.random.seed(seed)
    
    # 2D periodic isotropic value noise on 12x12
    # Harmonic frequencies (1, 2, 3) with zero diagonal bias
    val = np.zeros((N, N), dtype=np.float32)
    
    # Isotropic harmonic modes
    modes = [
        (1, 0, 1.0), (0, 1, 1.0),
        (2, 0, 0.6), (0, 2, 0.6),
        (1, 2, 0.4), (2, 1, 0.4), (-1, 2, 0.4), (2, -1, 0.4),
        (3, 0, 0.3), (0, 3, 0.3)
    ]
    phases = np.random.uniform(0, 2 * math.pi, len(modes))
    
    for y in range(N):
        for x in range(N):
            tot = 0.0
            w_sum = 0.0
            for i, (kx, ky, w) in enumerate(modes):
                ang = (x * kx + y * ky) / N * 2 * math.pi + phases[i]
                tot += math.cos(ang) * w
                w_sum += w
            val[y, x] = tot / w_sum

    # Normalize to 0..1
    norm = (val - val.min()) / (val.max() - val.min())
    
    # Quantize into 4 rock tone levels:
    # 0: Crevice / dark crack (subtle, NOT black!): 102
    # 1: Deep rock face: 116
    # 2: Dominant base rock: 128
    # 3: Lit rock facet: 140
    # 4: Top highlight: 152
    
    # Notice: the span from 102 to 152 is only 50 levels (low contrast, solid rock mass!)
    grid_12 = np.zeros((N, N), dtype=np.uint8)
    for y in range(N):
        for x in range(N):
            v = norm[y, x]
            if v < 0.20:
                grid_12[y, x] = 0
            elif v < 0.45:
                grid_12[y, x] = 1
            elif v < 0.75:
                grid_12[y, x] = 2 # dominant base stone
            elif v < 0.90:
                grid_12[y, x] = 3
            else:
                grid_12[y, x] = 4

    # Majority filter to ensure solid 2-3 pixel patches (eliminate single pixel specks!)
    for _ in range(2):
        cleaned = grid_12.copy()
        for y in range(N):
            for x in range(N):
                c = grid_12[y, x]
                neighs = [
                    grid_12[(y-1)%N, x], grid_12[(y+1)%N, x],
                    grid_12[y, (x-1)%N], grid_12[y, (x+1)%N]
                ]
                if neighs.count(c) == 0:
                    cleaned[y, x] = max(set(neighs), key=neighs.count)
        grid_12 = cleaned

    # Color palette (Cool Slate Stone):
    PAL = np.array([
        [98,  104, 118], # 0: crevice
        [112, 119, 134], # 1: deep rock
        [126, 134, 150], # 2: base dominant rock
        [140, 148, 165], # 3: lit rock face
        [154, 163, 180]  # 4: soft highlight
    ], dtype=np.uint8)

    # Upscale 2x to 24x24
    grid_24 = np.repeat(np.repeat(grid_12, 2, axis=0), 2, axis=1)
    
    # Map to RGB
    rgb_24 = PAL[grid_24]
    return rgb_24

# Let's test a few seeds
for s in [42, 108, 256, 314, 500]:
    rgb = generate_solid_rock_matrix(seed=s)
    tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
    for ty in range(4):
        for tx in range(4):
            tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = rgb
    im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
    im.save(f'scratch/perfect_rock_seed_{s}.png')

print("Generated seeds 42, 108, 256, 314, 500")
