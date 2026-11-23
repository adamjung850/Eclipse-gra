from PIL import Image
import numpy as np

files = [
    'stone-xxxx.png',
    'stone-xxxx (2).png',
    'stone-xxxx (3).png',
    'stone-0000.png',
    'stone-0xxx.png',
    'stone-x000.png',
    'stone-wall-xxxx.png'
]

# Create a montage of these images (scaled 8x so we can see every single pixel clearly)
montage = Image.new('RGBA', (len(files) * 16 * 8 + (len(files) + 1) * 8, 16 * 8 + 16), (30, 30, 35, 255))

for i, fn in enumerate(files):
    im = Image.open('scratch/' + fn).convert('RGBA')
    im_scaled = im.resize((16 * 8, 16 * 8), Image.NEAREST)
    x = 8 + i * (16 * 8 + 8)
    y = 8
    montage.paste(im_scaled, (x, y), im_scaled)

montage.save('scratch/all_terraria_stones_montage.png')
print("Saved scratch/all_terraria_stones_montage.png")
