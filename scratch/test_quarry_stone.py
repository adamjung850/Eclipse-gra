from PIL import Image
import numpy as np

T = 24

# Let's create SOLID BEDROCK / CLIFF STONE:
# Core principle:
# - Base rock is a massive, solid, calm slab of slate (#727988)
# - Subtle horizontal sedimentary stratification (warstwy geologiczne)
# - Natural, jagged rock fractures (pęknięcia skalne) with dark shadow inside and lit shelf on top
# - ZERO high-frequency sandpaper/gravel noise!

# Palette:
# C_FISSURE_DEEP: #32353d (50, 53, 61)
# C_FISSURE_MID:  #484c56 (72, 76, 86)
# C_SHADE_LOW:    #5c626f (92, 98, 111)
# C_BASE_ROCK:    #717887 (113, 120, 135)
# C_ROCK_MID:     #828999 (130, 137, 153)
# C_ROCK_LIT:     #969eaf (150, 158, 175)
# C_SHELF_HI:     #b0b8c9 (176, 184, 201)

def create_quarry_stone():
    # Base solid rock: calm slate with subtle broad geological strata
    grid = np.zeros((T, T, 3), dtype=np.uint8)
    
    # 1. Fill base solid stone with subtle broad strata (bands of solid rock)
    for y in range(T):
        for x in range(T):
            # Smooth low-contrast strata wave
            strata = np.sin(y * 0.35 + np.sin(x * 0.25) * 0.8) * 0.5 + 0.5
            # Very tight, solid tone:
            base_v = 114 + strata * 18 # values from 114 to 132
            r = int(base_v * 0.94)
            g = int(base_v * 0.99)
            b = int(base_v * 1.10)
            grid[y, x] = [r, g, b]
            
    # 2. Carve natural, jagged rock fractures (cracks separating solid rock plates):
    # These are sharp, crisp cracks (1-2 pixels wide) that make it look 100% like solid cracked rock!
    
    # Crack Line 1: Upper rock fracture (curving naturally, seamless wrap)
    crack_1 = [
        (1, 6), (2, 6), (3, 7), (4, 7), (5, 7), (6, 6), (7, 6), (8, 6), (9, 7), (10, 7),
        (11, 8), (12, 8), (13, 8), (14, 7), (15, 7), (16, 6), (17, 6), (18, 6),
        # Branch
        (9, 8), (10, 9), (10, 10), (11, 11)
    ]
    
    # Crack Line 2: Lower rock fracture (offset, seamless wrap)
    crack_2 = [
        (12, 17), (13, 17), (14, 18), (15, 18), (16, 18), (17, 17), (18, 17), (19, 17),
        (20, 16), (21, 16), (22, 16), (23, 17), (0, 17), (1, 18), (2, 18),
        # Sub-branch
        (19, 18), (20, 19), (21, 20), (22, 20)
    ]
    
    # Crack Line 3: Edge fracture
    crack_3 = [
        (21, 3), (22, 3), (23, 4), (0, 4), (1, 4), (2, 3)
    ]
    
    all_cracks = crack_1 + crack_2 + crack_3
    
    for x, y in all_cracks:
        wx = x % T
        wy = y % T
        # Dark crevice
        grid[wy, wx] = [52, 55, 63]
        # Lit rock shelf above crack (catching light from above)
        top_y = (wy - 1) % T
        grid[top_y, wx] = [168, 176, 194]
        # Soft shadow below crack
        bot_y = (wy + 1) % T
        grid[bot_y, wx] = [84, 90, 103]

    # Add a few small natural rock flecks (2-3 pixel angular facets, NOT 1px random static):
    facets = [
        # Facet A at (6, 13)
        [(5, 13), (6, 13), (7, 13), (6, 14)],
        # Facet B at (16, 11)
        [(15, 11), (16, 11), (17, 11), (16, 12)],
        # Facet C at (14, 3)
        [(14, 2), (15, 2), (14, 3)]
    ]
    for facet in facets:
        for fx, fy in facet:
            grid[fy % T, fx % T] = [142, 150, 166]
        # Top edge highlight
        grid[facet[0][1] - 1, facet[0][0]] = [175, 183, 200]
        # Bottom edge shadow
        grid[facet[-1][1] + 1, facet[-1][0]] = [78, 84, 96]
        
    return Image.fromarray(grid)

stone_im = create_quarry_stone()

# 4x4 preview
preview = Image.new('RGB', (T * 4, T * 4))
for ty in range(4):
    for tx in range(4):
        preview.paste(stone_im, (tx * T, ty * T))
        
preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/quarry_stone_4x4.png')
print("Saved scratch/quarry_stone_4x4.png")
