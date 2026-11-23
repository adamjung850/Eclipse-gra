import math
from PIL import Image
import numpy as np

# Let's create an isotropic, non-directional, seamless rock texture on 24x24
# Using multi-octave toroidal Perlin noise without directional bias:

T = 24

def generate_perlin_rock(seed=777):
    # Palette: Authentic Cool Slate Rock (low-contrast, cohesive solid rock)
    # 0: Fissure shadow: #4e5360 (78, 83, 96)
    # 1: Dark rock:      #646b7a (100, 107, 122)
    # 2: Base stone:     #7a8292 (122, 130, 146) - Dominant
    # 3: Light face:     #9099a9 (144, 153, 169)
    # 4: Highlight edge: #a6b0c2 (166, 176, 194)
    
    PALETTE = np.array([
        [78,  83,  96],  # 0
        [100, 107, 122], # 1
        [122, 130, 146], # 2
        [144, 153, 169], # 3
        [166, 176, 194]  # 4
    ], dtype=np.uint8)

    # Toroidal multi-octave noise
    val_map = np.zeros((T, T), dtype=np.float32)
    
    # We use isotropic harmonics: combinations of orthogonal circular modes
    # with randomized phases to avoid ANY diagonal or grid bias!
    np.random.seed(seed)
    
    # 12 random Fourier harmonics on 24x24 torus
    harmonics = [
        (1, 0, 1.0), (0, 1, 1.0),
        (1, 1, 0.7), (1, -1, 0.7),
        (2, 0, 0.5), (0, 2, 0.5),
        (2, 1, 0.4), (1, 2, 0.4), (2, -1, 0.4), (-1, 2, 0.4),
        (3, 0, 0.3), (0, 3, 0.3)
    ]
    
    phases = np.random.uniform(0, 2 * math.pi, len(harmonics))
    
    for y in range(T):
        for x in range(T):
            total = 0.0
            w_sum = 0.0
            for i, (kx, ky, w) in enumerate(harmonics):
                angle = (x * kx + y * ky) / T * 2 * math.pi + phases[i]
                total += math.cos(angle) * w
                w_sum += w
            val_map[y, x] = total / w_sum # -1 to 1

    # Normalize to 0..1
    v_min, v_max = val_map.min(), val_map.max()
    norm = (val_map - v_min) / (v_max - v_min)

    # Quantize into rock facets (sizes 3-6 pixels)
    # We want base stone (2) to dominate (about 45% of the block)
    grid = np.zeros((T, T), dtype=np.uint8)
    for y in range(T):
        for x in range(T):
            nv = norm[y, x]
            if nv < 0.18:
                grid[y, x] = 0 # fissure
            elif nv < 0.38:
                grid[y, x] = 1 # dark rock
            elif nv < 0.68:
                grid[y, x] = 2 # base dominant stone
            elif nv < 0.88:
                grid[y, x] = 3 # light facet
            else:
                grid[y, x] = 4 # highlight

    # Now, to prevent 1x1 gravel look:
    # We apply cellular / majority filter on single isolated pixels:
    # If a pixel has no neighbors of the same color, merge it with its dominant neighbor!
    cleaned = grid.copy()
    for y in range(T):
        for x in range(T):
            # Check 4-neighbors (toroidal wrap)
            neighs = [
                grid[(y - 1) % T, x],
                grid[(y + 1) % T, x],
                grid[y, (x - 1) % T],
                grid[y, (x + 1) % T]
            ]
            c = grid[y, x]
            if neighs.count(c) == 0:
                # Isolated pixel -> replace with most common neighbor
                cleaned[y, x] = max(set(neighs), key=neighs.count)

    rgb = PALETTE[cleaned]
    return Image.fromarray(rgb)

# Generate a few seeds to find the cleanest, most organic solid rock
for s in [101, 202, 303, 404, 505]:
    im = generate_perlin_rock(seed=s)
    # Tile 4x4
    tiled = Image.new('RGB', (T * 4, T * 4))
    for ty in range(4):
        for tx in range(4):
            tiled.paste(im, (tx * T, ty * T))
    tiled_2x = tiled.resize((tiled.width * 2, tiled.height * 2), Image.NEAREST)
    tiled_2x.save(f'scratch/perlin_rock_seed_{s}.png')

print("Generated seeds 101, 202, 303, 404, 505")
