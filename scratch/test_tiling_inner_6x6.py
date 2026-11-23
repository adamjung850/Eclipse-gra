from PIL import Image
import numpy as np

# Inner 6x6 values
vals = [
    [165, 165,  64, 165, 128, 203],
    [128, 128, 203,  64,  99, 128],
    [ 99, 128, 128, 203,  64,  64],
    [ 64,  64, 128,  64, 165, 203],
    [165, 128,  64, 165, 128, 128],
    [ 99, 128,  64,  99,  99, 128]
]

# Convert to cool slate RGB:
# 64:  (64,  68,  78)   - crevice
# 99:  (98,  104, 118)  - dark rock
# 128: (126, 134, 148)  - base rock
# 165: (160, 168, 184)  - light facet
# 203: (195, 202, 218)  - bright highlight

def val2rgb(v):
    # interpolate
    r = int(v * 0.94)
    g = int(v * 0.99)
    b = int(min(255, v * 1.08 + 8))
    return [r, g, b]

mat = np.zeros((6, 6, 3), dtype=np.uint8)
for y in range(6):
    for x in range(6):
        mat[y, x] = val2rgb(vals[y][x])

# Tile this 6x6 8 times across and down = 48x48
tiled = np.zeros((48, 48, 3), dtype=np.uint8)
for ty in range(8):
    for tx in range(8):
        tiled[ty*6:(ty+1)*6, tx*6:(tx+1)*6] = mat

im = Image.fromarray(tiled).resize((48 * 4, 48 * 4), Image.NEAREST)
im.save('scratch/terraria_tiled_test.png')
print("Saved scratch/terraria_tiled_test.png")
