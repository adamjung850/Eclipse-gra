from PIL import Image
import numpy as np

# 8x8 native stone matrix:
matrix = [
    [149, 149, 119, 119, 118, 149, 149, 149],
    [149, 119,  80,  80, 118, 149, 178, 178],
    [119,  80,  80,  80,  80, 118, 150, 149],
    [178, 178, 149, 149, 118,  80, 118, 118],
    [149, 149, 178, 178, 178, 118,  80,  80],
    [150, 149, 149, 149, 149, 118,  80, 118],
    [149, 149, 149, 149, 118,  80, 119, 119],
    [118, 118, 118, 118,  80, 119, 149, 149]
]

# Convert to cool slate colors (Terraria/Eclipse style):
# 80:  #4c5260 (76, 82, 96)   - crevice
# 119: #697184 (105, 113, 132) - dark midtone
# 149: #828c9f (130, 140, 159) - base stone
# 178: #9ea8bc (158, 168, 188) - light highlight

PAL = {
    80:  [76, 82, 96],
    118: [105, 113, 132],
    119: [105, 113, 132],
    149: [130, 140, 159],
    150: [130, 140, 159],
    178: [158, 168, 188]
}

# 8x8 native -> 24x24 (repeat 3x3)
mat_8 = np.array(matrix)
rgb_8 = np.zeros((8, 8, 3), dtype=np.uint8)
for y in range(8):
    for x in range(8):
        rgb_8[y, x] = PAL[mat_8[y, x]]

tile_24 = np.repeat(np.repeat(rgb_8, 3, axis=0), 3, axis=1)

# Tile 4x4
tiled = np.zeros((24 * 4, 24 * 4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = tile_24

im = Image.fromarray(tiled).resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
im.save('scratch/starbound_tiled_preview.png')
print("Saved scratch/starbound_tiled_preview.png")
