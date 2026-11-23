from PIL import Image
import numpy as np
import math

T = 24

# Let's craft true SOLID BEDROCK STONE:
# Principles:
# 1. NO high-frequency 1-pixel noise (that creates gravel/sandpaper look!)
# 2. Smooth, cohesive rock mass: dominant tone #7a8291 (RGB: 122, 130, 145)
# 3. Soft geological layering: gentle broad gradients (range 116 to 134, very tight!)
# 4. A few crisp, authentic rock clefts (fissures):
#    - Dark crease: #424650
#    - Highlight shelf: #a4adbd

def generate_solid_bedrock():
    grid = np.zeros((T, T, 3), dtype=np.uint8)
    
    # 1. Fill smooth, cohesive solid rock face (calm slate):
    for y in range(T):
        for x in range(T):
            # Broad, low-frequency geological strata (seamless toroidal)
            s1 = math.sin(y / T * 2 * math.pi * 1.0 + 0.4) * 0.5 + 0.5
            s2 = math.cos(x / T * 2 * math.pi * 1.0 + 1.2) * 0.5 + 0.5
            s3 = math.sin((x + y * 0.5) / T * 2 * math.pi + 2.0) * 0.5 + 0.5
            
            # Very tight, gentle variation (span of only ~16 levels, perfectly cohesive solid rock!)
            val = 118 + (s1 * 0.5 + s2 * 0.3 + s3 * 0.2) * 16 # 118 to 134
            
            r = int(val * 0.94)
            g = int(val * 0.99)
            b = int(val * 1.10)
            grid[y, x] = [r, g, b]

    # 2. Add natural, sparse, jagged rock clefts (cracks):
    # Cleft A: meanders across upper part, seamless wrap
    cleft_a = [
        (2, 5), (3, 5), (4, 6), (5, 6), (6, 6), (7, 5), (8, 5), (9, 5),
        (10, 6), (11, 6), (12, 7), (13, 7), (14, 7), (15, 6), (16, 6), (17, 6)
    ]
    # Cleft B: meanders across lower part, seamless wrap
    cleft_b = [
        (14, 16), (15, 16), (16, 17), (17, 17), (18, 17), (19, 16), (20, 16), (21, 16),
        (22, 17), (23, 17), (0, 17), (1, 16), (2, 16)
    ]
    # A small branching hairline fracture:
    cleft_c = [
        (8, 6), (8, 7), (9, 8), (9, 9)
    ]

    for cleft in [cleft_a, cleft_b, cleft_c]:
        for cx, cy in cleft:
            wx = cx % T
            wy = cy % T
            # Dark fissure crack
            grid[wy, wx] = [62, 66, 76]
            # Sharp lit rock shelf on top (raised stone ledge)
            top_y = (wy - 1) % T
            grid[top_y, wx] = [162, 170, 188]
            # Soft shadow below
            bot_y = (wy + 1) % T
            grid[bot_y, wx] = [90, 96, 108]

    # 3. Add 2 small solid rock facets (small raised stone flats):
    # Facet 1 at (5, 12):
    f1 = [(4, 12), (5, 12), (6, 12), (5, 13)]
    for fx, fy in f1:
        grid[fy % T, fx % T] = [138, 146, 162]
    grid[11, 5] = [168, 176, 194] # top highlight
    grid[14, 5] = [88, 94, 106]   # bottom shadow

    # Facet 2 at (19, 10):
    f2 = [(18, 10), (19, 10), (20, 10), (19, 11)]
    for fx, fy in f2:
        grid[fy % T, fx % T] = [136, 144, 160]
    grid[9, 19] = [168, 176, 194] # top highlight
    grid[12, 19] = [88, 94, 106]  # bottom shadow

    return Image.fromarray(grid)

stone_im = generate_solid_bedrock()

# 4x4 preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(stone_im, (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/true_bedrock_4x4.png')
print("Saved scratch/true_bedrock_4x4.png")
