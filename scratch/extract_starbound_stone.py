from PIL import Image
import numpy as np

im = Image.open('scratch/starbound_cobblestone.png').convert('RGB')
arr = np.array(im)

# Find the stone block in the center
# The background is very dark (around [22, 22, 22] or [0, 0, 0])
# Let's find rows/cols where luminance is > 60
gray = np.array(im.convert('L'))
mask = (gray > 60)
# Look in the middle region (y: 60..150, x: 80..160)
sub_mask = np.zeros_like(mask)
sub_mask[60:150, 80:160] = mask[60:150, 80:160]

rows = np.where(sub_mask.any(axis=1))[0]
cols = np.where(sub_mask.any(axis=0))[0]

min_r, max_r = rows[0], rows[-1]
min_c, max_c = cols[0], cols[-1]

print('Block bounding box:', min_r, max_r, min_c, max_c, 'Size:', max_r - min_r + 1, max_c - min_c + 1)
crop = arr[min_r:max_r+1, min_c:max_c+1]
Image.fromarray(crop).save('scratch/starbound_block_crop.png')

# The block is 64x64 or 32x32?
# Size is probably 64x64, which is 8x8 native pixels at 8x scale!
h, w, _ = crop.shape
native_grid = Image.fromarray(crop).resize((8, 8), Image.NEAREST)
print('Native 8x8 pixels (Grayscale):')
native_gray = np.array(native_grid.convert('L'))
for r in native_gray:
    print([int(x) for x in r])
