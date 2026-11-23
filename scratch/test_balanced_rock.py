import math
from PIL import Image
import numpy as np

T = 24
N = 12 # 12x12 native grid (each native pixel is 2x2 screen pixels)

# 5 Harmonious Low-Contrast Slate Rock Tones:
# Span is tight: 106 to 146 (only 40 levels span!)
# This ensures it looks like solid, monolithic, heavy rock — NOT noisy gravel!
PAL = np.array([
    [92,  98,  112],  # 0: subtle hairline crevice (not black, just a cool dark crack)
    [108, 115, 130], # 1: shaded rock facet
    [122, 130, 146], # 2: DOMINANT BASE STONE BODY (~55% of the block)
    [136, 144, 160], # 3: lit rock facet
    [150, 158, 174]  # 4: soft highlight edge
], dtype=np.uint8)

# Let's craft several balanced, non-directional rock matrices
# In 12x12, we want 4-5 interlocking rock clods (each 2-4 native pixels in size).
# Seamless wrap on all 4 boundaries (row 0 connects to row 11, col 0 connects to col 11).

def build_balanced_bedrock_1():
    # Hand-engineered for zero directional bias and balanced quadrant brightness
    mat = np.array([
        [2, 2, 3, 3, 2, 1, 2, 2, 3, 4, 3, 2],
        [2, 3, 4, 3, 2, 0, 1, 3, 4, 3, 2, 2],
        [3, 4, 3, 2, 1, 1, 2, 3, 3, 2, 1, 2],
        [3, 3, 2, 1, 0, 1, 2, 2, 2, 1, 0, 1],
        [2, 2, 1, 0, 1, 2, 3, 3, 2, 1, 1, 2],
        [1, 1, 2, 2, 2, 3, 4, 3, 2, 2, 2, 3],
        [2, 2, 3, 3, 2, 3, 3, 2, 1, 1, 2, 3],
        [2, 3, 4, 3, 2, 1, 1, 0, 1, 2, 3, 4],
        [3, 4, 3, 2, 1, 0, 1, 2, 2, 3, 4, 3],
        [2, 3, 2, 1, 1, 2, 2, 2, 3, 3, 2, 2],
        [2, 1, 0, 1, 2, 3, 3, 2, 1, 0, 1, 2],
        [2, 2, 1, 2, 3, 4, 3, 2, 2, 1, 2, 2]
    ], dtype=np.uint8)
    
    # Scale 2x to 24x24
    grid_24 = np.repeat(np.repeat(mat, 2, axis=0), 2, axis=1)
    return PAL[grid_24]

def build_balanced_bedrock_2():
    # Design with broader monolithic rock slabs (more calm, massive bedrock)
    mat = np.array([
        [2, 2, 2, 3, 3, 2, 2, 2, 2, 3, 3, 2],
        [2, 3, 3, 4, 3, 2, 1, 2, 3, 4, 3, 2],
        [3, 4, 3, 3, 2, 1, 0, 1, 3, 3, 2, 2],
        [2, 3, 2, 2, 1, 0, 1, 2, 2, 2, 1, 2],
        [2, 2, 1, 1, 2, 2, 2, 3, 3, 2, 1, 1],
        [1, 1, 0, 1, 2, 3, 3, 4, 3, 2, 2, 2],
        [2, 2, 1, 2, 3, 4, 3, 3, 2, 1, 2, 2],
        [2, 3, 2, 2, 3, 3, 2, 2, 1, 0, 1, 2],
        [3, 4, 3, 2, 1, 1, 2, 2, 2, 1, 2, 3],
        [3, 3, 2, 1, 0, 1, 2, 3, 3, 2, 3, 4],
        [2, 2, 1, 1, 2, 2, 3, 4, 3, 2, 3, 3],
        [2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2]
    ], dtype=np.uint8)
    
    grid_24 = np.repeat(np.repeat(mat, 2, axis=0), 2, axis=1)
    return PAL[grid_24]

def build_balanced_bedrock_3():
    # Soft quarry rock with micro-jointing (Core Keeper / Starbound style)
    mat = np.array([
        [2, 3, 3, 2, 2, 1, 2, 3, 3, 3, 2, 2],
        [3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2],
        [2, 3, 2, 1, 0, 1, 2, 2, 2, 3, 2, 1],
        [2, 2, 1, 1, 2, 2, 3, 3, 2, 1, 1, 0],
        [1, 1, 2, 2, 3, 4, 4, 3, 2, 2, 1, 1],
        [0, 1, 2, 3, 4, 4, 3, 2, 1, 2, 2, 2],
        [1, 2, 3, 3, 3, 2, 1, 0, 1, 2, 3, 3],
        [2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3],
        [2, 3, 3, 2, 1, 1, 2, 2, 2, 2, 3, 2],
        [1, 2, 2, 1, 0, 1, 2, 3, 3, 2, 1, 1],
        [2, 1, 0, 1, 2, 2, 3, 4, 3, 2, 0, 1],
        [2, 2, 1, 2, 2, 2, 2, 3, 2, 1, 1, 2]
    ], dtype=np.uint8)
    
    grid_24 = np.repeat(np.repeat(mat, 2, axis=0), 2, axis=1)
    return PAL[grid_24]

b1 = build_balanced_bedrock_1()
b2 = build_balanced_bedrock_2()
b3 = build_balanced_bedrock_3()

def save_previews(rock_arr, prefix):
    # Single tile at 4x (96x96)
    Image.fromarray(rock_arr).resize((96, 96), Image.NEAREST).save(f'scratch/{prefix}_single.png')
    # 6x6 tiled (144x144, 2x to 288x288)
    tiled = np.zeros((24*6, 24*6, 3), dtype=np.uint8)
    for ty in range(6):
        for tx in range(6):
            tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = rock_arr
    Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save(f'scratch/{prefix}_6x6.png')

save_previews(b1, 'bedrock_1')
save_previews(b2, 'bedrock_2')
save_previews(b3, 'bedrock_3')

print("Saved bedrock_1, bedrock_2, bedrock_3")
