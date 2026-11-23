from PIL import Image
import numpy as np

T = 24

# Let's construct a 24x24 solid rock tile based on chunky 2x2/3x2 rock patches:
# Palette (tight low-contrast slate):
# C0: #626875 (dark shadow crevice - NOT black!)
# C1: #707786 (dark midtone)
# C2: #7e8697 (base rock dominant)
# C3: #8e97a9 (light rock facet)
# C4: #9ea8bc (soft highlight - NOT blinding white!)

# Notice: contrast is low and gentle, so it forms a unified solid rock cliff!

PALETTE = np.array([
    [98,  104, 117], # C0
    [112, 119, 134], # C1
    [126, 134, 151], # C2 (dominant base)
    [142, 151, 169], # C3
    [158, 168, 188]  # C4
], dtype=np.uint8)

# Let's use a 12x12 chunky grid (each chunk is 2x2 pixels on 24x24)
# Why? Because 2x2 pixels on 24x24 matches the pixel scale of dirt and player sprites!
# 1-pixel noise looks like gravel; 2x2 chunky pixels look like real pixel-art rock facets!

# Let's design a 12x12 matrix of rock indices (0..4):
# Hand-crafted seamless 12x12 slate rock matrix:
m12 = [
    [2, 3, 2, 2, 1, 2, 3, 4, 3, 2, 2, 1],
    [3, 4, 3, 1, 0, 1, 2, 3, 3, 2, 1, 0],
    [2, 3, 2, 1, 2, 2, 3, 2, 1, 2, 2, 1],
    [1, 2, 2, 3, 3, 2, 1, 1, 0, 1, 2, 2],
    [0, 1, 3, 4, 3, 2, 2, 2, 1, 2, 3, 2],
    [1, 2, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3],
    [2, 3, 2, 1, 1, 2, 1, 2, 2, 2, 3, 2],
    [3, 4, 3, 2, 2, 3, 2, 1, 0, 1, 2, 1],
    [2, 3, 2, 1, 0, 2, 3, 2, 1, 2, 3, 2],
    [1, 2, 2, 2, 1, 2, 3, 4, 3, 2, 2, 1],
    [2, 1, 0, 1, 2, 2, 2, 3, 2, 1, 1, 2],
    [2, 2, 1, 2, 3, 3, 2, 1, 1, 2, 2, 2]
]

m12 = np.array(m12, dtype=np.uint8)

# Upscale 12x12 to 24x24 by 2x nearest neighbor
grid_24 = np.repeat(np.repeat(m12, 2, axis=0), 2, axis=1)

# Map to RGB
rgb_24 = PALETTE[grid_24]

# Create 4x4 preview
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = rgb_24

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/chunky_slate_test.png')
print("Saved scratch/chunky_slate_test.png")
