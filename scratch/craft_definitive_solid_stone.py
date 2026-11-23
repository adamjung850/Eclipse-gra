from PIL import Image
import numpy as np

# Let's craft the DEFINITIVE SOLID ROCK (LITY KAMIEŃ):
# We need it to satisfy 3 strict criteria:
# 1. NOT GRAVEL: Chunky rock mass (features are 2x2 to 5x4 pixels, NOT 1px salt-and-pepper noise).
# 2. NO DIAGONAL OR GRID STRIPES: Balanced, non-directional rock facets.
# 3. SOLID, HEAVY, NATURAL: Looks unmistakably like subterranean bedrock / slate.

T = 24

# 6 harmonious slate tones:
# 0: hairline fissure:  [72,  77,  88]   #484d58
# 1: crevice shadow:    [92,  98,  110]  #5c626e
# 2: shaded rock body:  [110, 117, 131]  #6e7583
# 3: BASE SOLID STONE:  [124, 132, 147]  #7c8493  (Dominant rock mass)
# 4: lit rock facet:    [142, 150, 166]  #8e96a6
# 5: highlight edge:    [165, 173, 189]  #a5adb9

PAL = np.array([
    [72,  77,  88],
    [92,  98,  110],
    [110, 117, 131],
    [124, 132, 147],
    [142, 150, 166],
    [165, 173, 189]
], dtype=np.uint8)

def create_solid_rock_tile():
    # Start filled with solid base rock (3)
    grid = np.full((T, T), 3, dtype=np.uint8)
    
    # We define several organic, chunky rock facets (plates/slabs):
    # Each facet has a body (4), top-left highlight (5), bottom-right shadow (2/1),
    # and subtle hairline fractures (0) separating them.
    # We deliberately stagger facet centers so they do NOT align along 45 degrees:
    
    # Slabs: (center_x, center_y, rx, ry)
    # 1. Broad central rock slab
    for dy in range(-3, 4):
        for dx in range(-4, 5):
            if (dx/4.2)**2 + (dy/3.2)**2 <= 1.0:
                grid[(12 + dy) % T, (11 + dx) % T] = 4
                
    # 2. Upper-left rock slab
    for dy in range(-2, 3):
        for dx in range(-3, 4):
            if (dx/3.2)**2 + (dy/2.2)**2 <= 1.0:
                grid[(4 + dy) % T, (4 + dx) % T] = 4
                
    # 3. Upper-right rock slab
    for dy in range(-2, 3):
        for dx in range(-3, 3):
            if (dx/2.8)**2 + (dy/2.2)**2 <= 1.0:
                grid[(3 + dy) % T, (19 + dx) % T] = 4

    # 4. Lower-left rock slab
    for dy in range(-2, 3):
        for dx in range(-3, 3):
            if (dx/2.8)**2 + (dy/2.2)**2 <= 1.0:
                grid[(20 + dy) % T, (5 + dx) % T] = 4

    # 5. Lower-right rock slab
    for dy in range(-2, 3):
        for dx in range(-3, 4):
            if (dx/3.2)**2 + (dy/2.2)**2 <= 1.0:
                grid[(19 + dy) % T, (18 + dx) % T] = 4

    # Add facet highlights (5) on top-left rims of slabs:
    # Central slab top edge:
    grid[9, 9:14] = 5
    grid[10, 8] = 5
    # Upper-left top edge:
    grid[2, 3:6] = 5
    grid[3, 2] = 5
    # Upper-right top edge:
    grid[1, 18:21] = 5
    # Lower-left top edge:
    grid[18, 4:7] = 5
    # Lower-right top edge:
    grid[17, 17:21] = 5

    # Add shadow rims (2) on bottom-right of slabs:
    grid[15, 10:15] = 2
    grid[14, 15] = 2
    grid[6, 3:7] = 2
    grid[5, 21] = 2
    grid[22, 4:8] = 2
    grid[21, 18:22] = 2

    # Hairline rock fissures (0) - organic, non-diagonal cleavage joints:
    # Joint A: Horizontal jog between upper slabs
    fissure_a = [(7, 7), (8, 7), (9, 8), (10, 8), (11, 8), (12, 7), (13, 7)]
    # Joint B: Vertical jog on right
    fissure_b = [(16, 6), (16, 7), (16, 8), (17, 9), (17, 10)]
    # Joint C: Meandering seam on bottom
    fissure_c = [(6, 16), (7, 16), (8, 17), (9, 17), (10, 16), (11, 16)]
    # Joint D: Subtle seam near wrap edge (ensuring perfect wrap!)
    # Wrap at x=0/23:
    fissure_d = [(22, 12), (23, 12), (0, 12), (1, 12)]
    # Wrap at y=0/23:
    fissure_e = [(14, 22), (14, 23), (14, 0), (14, 1)]

    for f_pts in [fissure_a, fissure_b, fissure_c, fissure_d, fissure_e]:
        for x, y in f_pts:
            grid[y % T, x % T] = 0
            # Crevice shadow next to fissure:
            if grid[(y + 1) % T, x % T] == 3:
                grid[(y + 1) % T, x % T] = 1

    # Subtle internal rock texture (broad low-contrast rock chiselling, 2x2 clods):
    # Add subtle variations of 2 and 4 inside the base rock so it's not flat:
    chisels = [
        (8, 2, 2, 2, 2),
        (14, 3, 2, 2, 4),
        (2, 10, 2, 2, 2),
        (7, 12, 2, 2, 4),
        (18, 13, 2, 2, 2),
        (2, 15, 2, 2, 4),
        (13, 21, 2, 2, 4),
        (10, 2, 2, 2, 2)
    ]
    for cx, cy, cw, ch, col in chisels:
        for dy in range(ch):
            for dx in range(cw):
                if grid[(cy + dy) % T, (cx + dx) % T] == 3:
                    grid[(cy + dy) % T, (cx + dx) % T] = col

    return PAL[grid]

solid_rock = create_solid_rock_tile()

# Let's save single 24x24 (and 4x zoom)
Image.fromarray(solid_rock).save('scratch/definitive_stone_tile.png')
Image.fromarray(solid_rock).resize((96, 96), Image.NEAREST).save('scratch/definitive_stone_tile_4x.png')

# Tile 6x6 blocks (144x144, zoomed 2x to 288x288)
tiled = np.zeros((24 * 6, 24 * 6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = solid_rock

im = Image.fromarray(tiled).resize((144 * 2, 144 * 2), Image.NEAREST)
im.save('scratch/definitive_stone_6x6.png')

print("Created scratch/definitive_stone_tile.png and definitive_stone_6x6.png")
