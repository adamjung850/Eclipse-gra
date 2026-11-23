from PIL import Image
import numpy as np

im = Image.open('scratch/stone-xxxx.png').convert('RGB')
arr = np.array(im)
print("Terraria stone-xxxx.png size:", arr.shape)
print("Unique colors in Terraria stone-xxxx.png:", len(np.unique(arr.reshape(-1, 3), axis=0)))

# Print unique colors
unique_colors = np.unique(arr.reshape(-1, 3), axis=0)
for c in unique_colors:
    hex_c = '#{:02x}{:02x}{:02x}'.format(c[0], c[1], c[2])
    print(c, hex_c)

print("\nMatrix representation:")
for r in arr:
    row_str = " ".join(f"{c[0]:3d}" for c in r)
    print(row_str)
