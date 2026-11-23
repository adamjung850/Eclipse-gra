from PIL import Image
import numpy as np

# Load textures
grass = Image.open('assets/textures/grass_block_24.png').convert('RGB')
dirt = Image.open('assets/textures/dirt_24.png').convert('RGB')

# Load the authentic ores and stone
stone_arr = np.array(Image.open('scratch/stone_candidate_1.png').convert('RGB'))[:24, :24]
stone_im = Image.fromarray(stone_arr)

from test_authentic_ores import rendered_tiles

copper_im = Image.fromarray(rendered_tiles['copper'])
iron_im = Image.fromarray(rendered_tiles['iron'])
coal_im = Image.fromarray(rendered_tiles['coal'])
gold_im = Image.fromarray(rendered_tiles['gold'])
diamond_im = Image.fromarray(rendered_tiles['diamond'])

W, H = 16, 12
cave = Image.new('RGB', (W * 24, H * 24), '#181a20') # dark cave background

def put(img, x, y):
    cave.paste(img, (x * 24, y * 24))

# Surface
for x in range(W):
    put(grass, x, 0)
    put(dirt, x, 1)

# Dirt/Stone transition
for x in range(W):
    if x in [4, 5, 6, 11, 12]:
        put(stone_im, x, 2)
    else:
        put(dirt, x, 2)

# Underground stone layer
for y in range(3, H):
    for x in range(W):
        put(stone_im, x, y)

# Carve out a cave / tunnel (air with dark background wall)
cave_air_coords = [
    (3, 5), (4, 5), (5, 5), (6, 5), (7, 5),
    (4, 6), (5, 6), (6, 6), (7, 6), (8, 6),
    (5, 7), (6, 7), (7, 7), (8, 7), (9, 7), (10, 7)
]

# For cave background, draw shaded stone
shaded_stone = (stone_arr.astype(np.float32) * 0.35).astype(np.uint8)
shaded_stone_im = Image.fromarray(shaded_stone)

for cx, cy in cave_air_coords:
    put(shaded_stone_im, cx, cy)

# Embed veins naturally around the cave!
put(copper_im, 2, 4)
put(copper_im, 2, 5)
put(copper_im, 3, 4)

put(coal_im, 7, 3)
put(coal_im, 8, 3)
put(coal_im, 8, 4)

put(iron_im, 9, 5)
put(iron_im, 10, 5)
put(iron_im, 9, 6)

put(gold_im, 4, 8)
put(gold_im, 4, 9)
put(gold_im, 5, 9)

put(diamond_im, 8, 9)
put(diamond_im, 9, 9)
put(diamond_im, 8, 10)

cave_2x = cave.resize((W * 24 * 2, H * 24 * 2), Image.NEAREST)
cave_2x.save('scratch/full_cave_showcase.png')
print("Saved scratch/full_cave_showcase.png!")
