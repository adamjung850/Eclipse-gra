from PIL import Image
import numpy as np

# Load the 3 official Terraria stone tiles:
t1 = Image.open('scratch/stone-xxxx.png')
t2 = Image.open('scratch/stone-xxxx (2).png')
t3 = Image.open('scratch/stone-xxxx (3).png')

# In Terraria, a stone layer randomly places these 3 tiles:
tiles = [t1, t2, t3]

# Create a 6x6 grid of tiles (96x96 pixels)
grid_w, grid_h = 6, 6
composite = Image.new('RGBA', (grid_w * 16, grid_h * 16))

np.random.seed(42)
for gy in range(grid_h):
    for gx in range(grid_w):
        # Pick tile
        idx = np.random.randint(0, 3)
        composite.paste(tiles[idx], (gx * 16, gy * 16))

# Upscale 3x (since our game is 24x24 per tile, 16 * 1.5 = 24!)
# So a 16x16 tile in Terraria is equivalent to 24x24 in our game!
composite_2x = composite.resize((composite.width * 2, composite.height * 2), Image.NEAREST)
composite_2x.save('scratch/terraria_real_stone_showcase.png')
print("Saved scratch/terraria_real_stone_showcase.png")
