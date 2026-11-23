from PIL import Image
import numpy as np

im = Image.open('scratch/terraria_sample.png').convert('RGB')
arr = np.array(im)

# Each native block is 20x20 pixels
# Let's find the centers of the 8x8 grid
# Centers start around x=12+10=22, 42, 62, 82, 102, 122, 142, 162
# Y centers start around y=9+10=19, 39, 59, 79, 99, 119, 139, 159

xs = [22 + i * 20 for i in range(8)]
ys = [19 + i * 20 for i in range(8)]

matrix_8x8 = np.zeros((8, 8, 3), dtype=np.uint8)
for r, y in enumerate(ys):
    for c, x in enumerate(xs):
        matrix_8x8[r, c] = arr[min(arr.shape[0]-1, y), min(arr.shape[1]-1, x)]

print("Extracted 8x8 matrix (R channel):")
print(matrix_8x8[:, :, 0])

# Notice row 0 and row 7, col 0 and col 7 are the black borders (23).
# The inner stone is rows 1..6, cols 1..6!
inner_6x6 = matrix_8x8[1:7, 1:7]
print("Inner 6x6 stone matrix:")
print(inner_6x6[:, :, 0])

# Save 8x8 and inner 6x6
Image.fromarray(matrix_8x8).save('scratch/terraria_8x8.png')
Image.fromarray(inner_6x6).save('scratch/terraria_inner_6x6.png')
