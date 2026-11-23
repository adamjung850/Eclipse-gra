from PIL import Image
import numpy as np

# Load the 3 Terraria tiles
t1 = Image.open('scratch/stone-xxxx.png').convert('L')
t2 = Image.open('scratch/stone-xxxx (2).png').convert('L')
t3 = Image.open('scratch/stone-xxxx (3).png').convert('L')

# Slate Palette:
# 64 -> #484e5a
# 99 -> #687082
# 128 -> #828c9f
# 165 -> #a0abbd
# 203 -> #c0cbdb

PAL = {
    64:  [72, 78, 90],
    99:  [104, 112, 130],
    128: [130, 140, 159],
    165: [160, 171, 189],
    203: [192, 203, 219]
}

def colorize(im):
    arr = np.array(im)
    out = np.zeros((16, 16, 3), dtype=np.uint8)
    for y in range(16):
        for x in range(16):
            v = arr[y, x]
            out[y, x] = PAL.get(v, [130, 140, 159])
    return out

c1 = colorize(t1)
c2 = colorize(t2)
c3 = colorize(t3)

# Subsample 2x2 to get native 8x8, then scale 3x to 24x24!
def to_24(c16):
    c8 = c16[::2, ::2]
    return np.repeat(np.repeat(c8, 3, axis=0), 3, axis=1)

v1 = to_24(c1)
v2 = to_24(c2)
v3 = to_24(c3)

# 6x6 grid with randomized choice between v1, v2, v3
np.random.seed(42)
variants = [v1, v2, v3]

tiled = np.zeros((24 * 6, 24 * 6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        chosen = variants[np.random.randint(0, 3)]
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = chosen

Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save('scratch/terraria_multivariant_6x6.png')
print("Saved scratch/terraria_multivariant_6x6.png")
