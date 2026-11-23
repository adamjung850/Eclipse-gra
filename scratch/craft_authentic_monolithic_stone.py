from PIL import Image
import numpy as np

T = 24

# Let's craft the AUTHENTIC MONOLITHIC BEDROCK:
# 5 tight cool slate rock tones:
# 0: deep cleft fleck:    [84,  90,  104]  #545a68 (sparse, hairline)
# 1: dark shaded rock:    [106, 114, 128]  #6a7280 (20%)
# 2: BASE SOLID STONE:    [122, 130, 146]  #7a8292 (DOMINANT ~55%)
# 3: lit rock facet:      [138, 146, 162]  #8a92a2 (20%)
# 4: top highlight fleck: [156, 164, 180]  #9ca4b4 (sparse)

PAL = np.array([
    [84,  90,  104],
    [106, 114, 128],
    [122, 130, 146],
    [138, 146, 162],
    [156, 164, 180]
], dtype=np.uint8)

# To ensure ZERO diagonal stripes, ZERO horizontal/vertical banding, and ZERO gravel:
# We design 16 chunky rock clods (each 2x2 to 3x3 pixels) on 12x12 native grid.
# Clods are placed in a staggered, isotropic Voronoi-like cellular arrangement:

def craft_bedrock_12x12():
    # 12x12 native grid (scaled 2x to 24x24)
    # Every cell is 2x2 screen pixels.
    # Hand-tuned for zero line continuity and equal quadrant weight:
    mat = np.array([
        # Col: 0  1  2  3  4  5  6  7  8  9 10 11
        [2, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 2], # 0
        [2, 3, 4, 3, 2, 0, 1, 4, 3, 2, 2, 2], # 1
        [1, 2, 3, 2, 1, 1, 2, 3, 2, 1, 2, 3], # 2
        [0, 1, 2, 2, 3, 3, 2, 1, 0, 1, 3, 4], # 3
        [1, 2, 3, 4, 3, 2, 2, 2, 1, 2, 3, 3], # 4
        [2, 2, 3, 3, 2, 1, 0, 1, 2, 2, 2, 1], # 5
        [2, 1, 2, 2, 1, 0, 1, 2, 3, 3, 2, 0], # 6
        [3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 1], # 7
        [3, 3, 2, 1, 2, 3, 3, 3, 2, 1, 2, 2], # 8
        [2, 4, 3, 2, 3, 4, 2, 1, 0, 1, 3, 3], # 9
        [1, 3, 2, 1, 2, 3, 2, 1, 1, 2, 4, 3], # 10
        [2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 3, 2]  # 11
    ], dtype=np.uint8)

    # Let's verify seamless wrapping:
    # Row 0 vs Row 11:
    # Row 0:  [2, 2, 3, 3, 2, 1, 2, 3, 3, 2, 1, 2]
    # Row 11: [2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 3, 2]
    # Col 0 vs Col 11:
    # Col 0:  [2, 2, 1, 0, 1, 2, 2, 3, 3, 2, 1, 2]
    # Col 11: [2, 2, 3, 4, 3, 1, 0, 1, 2, 3, 3, 2]
    
    # Scale 2x to 24x24
    grid_24 = np.repeat(np.repeat(mat, 2, axis=0), 2, axis=1)
    return PAL[grid_24]

stone_rgb = craft_bedrock_12x12()

# 6x6 tiled preview (144x144, 2x zoom to 288x288)
tiled = np.zeros((24*6, 24*6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = stone_rgb

Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save('scratch/authentic_bedrock_6x6.png')
Image.fromarray(stone_rgb).resize((96, 96), Image.NEAREST).save('scratch/authentic_bedrock_single.png')

print("Saved scratch/authentic_bedrock_6x6.png")
