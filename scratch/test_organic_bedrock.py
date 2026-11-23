from PIL import Image
import numpy as np

# 12x12 native resolution, upscaled 2x to 24x24
# We will place organic rock facets with natural shapes:

# Palette:
# 0: Crevice / dark crack: #545966 (84, 89, 102)
# 1: Dark rock midtone:    #697080 (105, 112, 128)
# 2: Base solid stone:     #7c8496 (124, 132, 150)
# 3: Light rock facet:     #9099ac (144, 153, 172)
# 4: Crisp rock highlight: #a6b0c4 (166, 176, 196)

PALETTE = np.array([
    [84,  89,  102], # 0
    [105, 112, 128], # 1
    [124, 132, 150], # 2 (dominant rock)
    [144, 153, 172], # 3
    [166, 176, 196]  # 4
], dtype=np.uint8)

# Let's craft an asymmetrical, organic rock facet layout on 12x12
# that wraps seamlessly across both axes (x=0 <-> x=12, y=0 <-> y=12):
m = np.full((12, 12), 2, dtype=np.uint8)

# Facet A (upper left): irregular 4x3
m[1:4, 2:5] = 3
m[1:3, 3:5] = 4
m[4, 2:5] = 1 # shadow below

# Facet B (upper right, wrap across x=0):
m[1:4, 8:12] = 3
m[1:3, 9:11] = 4
m[4, 8:11] = 1

# Facet C (center-left):
m[5:8, 4:8] = 3
m[5:7, 5:7] = 4
m[8, 4:8] = 1

# Facet D (lower left / wrap y=0):
m[9:11, 1:4] = 3
m[9, 2:4] = 4
m[11, 1:4] = 1

# Facet E (lower right):
m[8:11, 7:11] = 3
m[8:10, 8:10] = 4
m[11, 7:11] = 1

# Crevices / fractures connecting them organically:
# Crevice 1:
m[4, 1] = 0; m[4, 2] = 0; m[5, 2] = 0; m[5, 3] = 0
# Crevice 2:
m[4, 6] = 0; m[4, 7] = 0; m[5, 8] = 0; m[6, 8] = 0
# Crevice 3:
m[7, 3] = 0; m[8, 3] = 0; m[8, 2] = 0
# Crevice 4:
m[7, 10] = 0; m[8, 11] = 0; m[8, 0] = 0 # wrap
# Crevice 5:
m[11, 5] = 0; m[0, 5] = 0 # wrap y
m[11, 6] = 0; m[0, 6] = 0 # wrap y

# A few subtle dark stone midtones (1):
m[2, 7] = 1; m[3, 7] = 1
m[6, 1] = 1; m[7, 1] = 1
m[9, 5] = 1; m[10, 5] = 1
m[2, 1] = 1

# Convert 12x12 to 24x24 (each native cell is 2x2)
grid_24 = np.repeat(np.repeat(m, 2, axis=0), 2, axis=1)

# Subtle micro-chisel: add small 1-pixel bevels on some corners to break blockiness:
for y in range(12):
    for x in range(12):
        if m[y, x] == 4:
            # soften corner
            grid_24[y*2, x*2] = 3

rgb_24 = PALETTE[grid_24]

# 4x4 tiled preview
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = rgb_24

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/organic_bedrock_4x4.png')
print("Saved scratch/organic_bedrock_4x4.png")
