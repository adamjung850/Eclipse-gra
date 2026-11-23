from PIL import Image
import numpy as np

# Load t2
t2 = Image.open('scratch/stone-xxxx (2).png').convert('L')
arr = np.array(t2)

# Values in t2:
# 64, 99, 128, 165, 203
# Let's map these to our beautiful cool slate palette:
# 64:  [58, 62, 72]   - crevice
# 99:  [86, 93, 108]  - shaded rock
# 128: [116, 124, 142] - base rock (solid)
# 165: [148, 156, 176] - lit face
# 203: [178, 186, 206] - crisp highlight

def map_val(v):
    if v < 80:
        return [58, 62, 72]
    elif v < 110:
        return [86, 93, 108]
    elif v < 145:
        return [116, 124, 142]
    elif v < 185:
        return [148, 156, 176]
    else:
        return [178, 186, 206]

rgb_16 = np.zeros((16, 16, 3), dtype=np.uint8)
for y in range(16):
    for x in range(16):
        rgb_16[y, x] = map_val(arr[y, x])

# 16x16 to 24x24
im_24 = Image.fromarray(rgb_16).resize((24, 24), Image.NEAREST)

# Tile 4x4
tiled = Image.new('RGB', (24 * 4, 24 * 4))
for ty in range(4):
    for tx in range(4):
        tiled.paste(im_24, (tx * 24, ty * 24))

tiled.resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST).save('scratch/t2_slate_showcase.png')
print("Saved scratch/t2_slate_showcase.png")
