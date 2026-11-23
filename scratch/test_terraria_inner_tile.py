from PIL import Image
import numpy as np

# Load the matrix from terraria_sample.png
# Let's inspect the actual pixel grid in the center of terraria_sample.png
im = Image.open('scratch/terraria_sample.png').convert('RGB')
arr = np.array(im)

# Let's crop just the stone inside the black border:
# The black border is 23 in grayscale
gray = np.array(im.convert('L'))
is_stone = (gray > 30)

# Find rows and cols of stone
r_idx = np.where(is_stone.any(axis=1))[0]
c_idx = np.where(is_stone.any(axis=0))[0]

stone_crop = arr[r_idx[0]:r_idx[-1]+1, c_idx[0]:c_idx[-1]+1]
print('Stone crop shape:', stone_crop.shape)

# Save stone crop
Image.fromarray(stone_crop).save('scratch/stone_crop.png')

# Downscale to native pixel grid using nearest
# Let's find unique color patches along rows to find native size
sample_row = stone_crop[stone_crop.shape[0]//2, :, 0]
# Find run lengths of constant values
runs = []
cur_val = sample_row[0]
cur_len = 0
for v in sample_row:
    if abs(int(v) - int(cur_val)) < 5:
        cur_len += 1
    else:
        runs.append((cur_val, cur_len))
        cur_val = v
        cur_len = 1
runs.append((cur_val, cur_len))
print('Runs in middle row:', runs)

# Pixel size is around 20 pixels per native pixel!
# 120 / 20 = 6 pixels native!
native_w = len(runs)
print('Native width:', native_w)
