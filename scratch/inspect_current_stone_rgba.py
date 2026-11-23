import base64
from PIL import Image
import numpy as np

with open('src/textures/TextureGenerator.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.search(r'const STONE_24_RGBA\s*=\s*[\'\"]([^\'\"]+)[\'\"]', text)
b64 = m.group(1)
raw = base64.b64decode(b64)
arr = np.frombuffer(raw, dtype=np.uint8).reshape((24, 24, 4))

print("Current STONE_24_RGBA:")
print("Shape:", arr.shape)
print("Min RGB:", arr[:,:,:3].min(axis=(0,1)))
print("Max RGB:", arr[:,:,:3].max(axis=(0,1)))
print("Mean RGB:", arr[:,:,:3].mean(axis=(0,1)))
print("Std RGB:", arr[:,:,:3].std(axis=(0,1)))
print("Unique colors:", len(np.unique(arr[:,:,:3].reshape(-1, 3), axis=0)))

im = Image.fromarray(arr[:,:,:3])
im.resize((96, 96), Image.NEAREST).save('scratch/current_v47_stone_4x.png')

# Save 4x4 tiled
tiled = np.zeros((24*4, 24*4, 3), dtype=np.uint8)
for ty in range(4):
    for tx in range(4):
        tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = arr[:,:,:3]
Image.fromarray(tiled).resize((192, 192), Image.NEAREST).save('scratch/current_v47_tiled_2x.png')
print("Saved scratch/current_v47_stone_4x.png and current_v47_tiled_2x.png")
