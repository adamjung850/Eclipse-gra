from PIL import Image
import numpy as np

# 8x8 native rock matrix with running horizontal offset (strata)
# Palette (Starbound/Terraria cool slate rock):
# 0: Crevice:    [72,  78,  92]  #484e5c
# 1: Dark rock:  [98,  106, 124] #626a7c
# 2: Base rock:  [124, 134, 154] #7c869a (dominant)
# 3: Lit face:   [150, 160, 182] #96a0b6
# 4: Highlight:  [176, 186, 206] #b0bacce

PAL = np.array([
    [72,  78,  92],  # 0
    [98,  106, 124], # 1
    [124, 134, 154], # 2
    [150, 160, 182], # 3
    [176, 186, 206]  # 4
], dtype=np.uint8)

# 8x8 matrix:
# Shelf 1 (upper half, y=0..3): Boulder A (x=0..4), Boulder B (x=5..7)
# Shelf 2 (lower half, y=4..7): Boulder C (x=2..6), Boulder D (wrap x=7,0,1)
# Notice: Shelf 2 is offset by 2-3 pixels relative to Shelf 1!
# This creates natural horizontal rock strata with zero diagonal slashes!

m8 = [
    # y=0: top edge of Shelf 1
    [3, 4, 3, 2, 0, 3, 4, 3],
    # y=1: body of Shelf 1
    [3, 3, 2, 2, 0, 3, 3, 2],
    # y=2: lower body of Shelf 1
    [2, 2, 2, 1, 0, 2, 2, 1],
    # y=3: horizontal fissure separating Shelf 1 and Shelf 2
    [0, 0, 0, 0, 0, 0, 0, 0],
    # y=4: top edge of Shelf 2 (offset!)
    [2, 0, 3, 4, 4, 3, 2, 0],
    # y=5: body of Shelf 2
    [2, 0, 3, 3, 3, 2, 2, 0],
    # y=6: lower body of Shelf 2
    [1, 0, 2, 2, 2, 1, 1, 0],
    # y=7: bottom horizontal fissure (wrap to y=0)
    [0, 0, 0, 0, 0, 0, 0, 0]
]

m8 = np.array(m8, dtype=np.uint8)

# Now, we don't want a solid straight black line at y=3 and y=7!
# Rock fissures are organic and meander:
# Let's add slight meandering:
m8[3, 2] = 1; m8[3, 5] = 1
m8[7, 1] = 1; m8[7, 6] = 1

# Vertical crevice at x=4 in Shelf 1:
m8[0, 4] = 1; m8[1, 4] = 0; m8[2, 4] = 0
# Vertical crevice at x=1 and x=7 in Shelf 2:
m8[4, 1] = 0; m8[5, 1] = 0; m8[6, 1] = 1
m8[4, 7] = 0; m8[5, 7] = 0; m8[6, 7] = 1

# Upscale 3x to 24x24 (each native pixel is 3x3)
tile_24 = np.repeat(np.repeat(m8, 3, axis=0), 3, axis=1)

# Subtle chisel on 24x24: soften 3x3 corners by 1 pixel so it's not square blocks:
for y in range(8):
    for x in range(8):
        if m8[y, x] == 4: # highlight
            tile_24[y*3, x*3] = 3 # bevel corner
        if m8[y, x] == 0: # crevice
            tile_24[y*3, x*3] = 1 # soften edge

rgb_24 = PAL[tile_24]

# Tile 4x4
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = rgb_24

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/offset_bedrock_showcase.png')
print("Saved scratch/offset_bedrock_showcase.png")
