from PIL import Image
import numpy as np

w = Image.open('scratch/stone-wall-xxxx.png').convert('L')
arr = np.array(w)
print("Unique values in stone wall:", np.unique(arr))

# Let's map stone wall to our foreground stone brightness:
# Min is 26, max is 82.
# Let's map to foreground stone range: 75 to 165
norm = (arr - arr.min()) / (arr.max() - arr.min())
mapped = 75 + norm * 90

PAL = {
    # cool slate
}
out = np.zeros((16, 16, 3), dtype=np.uint8)
for y in range(16):
    for x in range(16):
        v = mapped[y, x]
        out[y, x] = [int(v * 0.94), int(v * 0.98), int(v * 1.10)]

# Subsample 8x8 -> 24x24
v24 = np.repeat(np.repeat(out[::2, ::2], 3, axis=0), 3, axis=1)

tiled = np.zeros((24 * 6, 24 * 6, 3), dtype=np.uint8)
for ty in range(6):
    for tx in range(6):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = v24

Image.fromarray(tiled).resize((288, 288), Image.NEAREST).save('scratch/terraria_wall_tiled_6x6.png')
print("Saved scratch/terraria_wall_tiled_6x6.png")
