from PIL import Image
import numpy as np

# Load stone-xxxx.png
t1 = Image.open('scratch/stone-xxxx.png').convert('RGB')
t2 = Image.open('scratch/stone-xxxx (2).png').convert('RGB')
t3 = Image.open('scratch/stone-xxxx (3).png').convert('RGB')

# Let's inspect t1 at 24x24
# 16x16 -> 24x24 is 1.5x
t1_24 = t1.resize((24, 24), Image.NEAREST)
t2_24 = t2.resize((24, 24), Image.NEAREST)
t3_24 = t3.resize((24, 24), Image.NEAREST)

# Let's see what happens if we tile t1_24 4x4
tiled_t1 = Image.new('RGB', (24 * 4, 24 * 4))
for y in range(4):
    for x in range(4):
        tiled_t1.paste(t1_24, (x * 24, y * 24))

tiled_t1.resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST).save('scratch/t1_24_tiled.png')
print("Saved scratch/t1_24_tiled.png")
