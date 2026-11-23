from PIL import Image
import numpy as np

# Load grass and dirt
grass = Image.open('assets/textures/grass_block_24.png').convert('RGB')
dirt = Image.open('assets/textures/dirt_24.png').convert('RGB')

# Load t2 stone (from scratch/t2_slate_showcase.png tile 0..24, 0..24)
t2_full = Image.open('scratch/t2_slate_showcase.png').convert('RGB')
stone_t2 = t2_full.crop((0, 0, 24, 24))

# Now let's embed our authentic ores (copper, gold, coal, iron, diamond) into this stone!
# The ore deposits we created earlier can be placed directly on this stone base!
from test_authentic_ores import raw_mineral_deposits, palettes

def make_ore_from_stone(stone_tile, pal):
    arr = np.array(stone_tile).copy().astype(np.float32)
    for dep in raw_mineral_deposits:
        for x, y in dep['socket']:
            arr[y % 24, x % 24] = pal['socket']
        for x, y in dep['base']:
            arr[y % 24, x % 24] = pal['base']
        for x, y in dep['bright']:
            arr[y % 24, x % 24] = pal['bright']
        for x, y in dep['hi']:
            arr[y % 24, x % 24] = pal['hi']
        for x, y in dep['glint']:
            arr[y % 24, x % 24] = pal['glint']
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

copper_t2 = make_ore_from_stone(stone_t2, palettes['copper'])
gold_t2 = make_ore_from_stone(stone_t2, palettes['gold'])
iron_t2 = make_ore_from_stone(stone_t2, palettes['iron'])
coal_t2 = make_ore_from_stone(stone_t2, palettes['coal'])
diamond_t2 = make_ore_from_stone(stone_t2, palettes['diamond'])

W, H = 16, 12
scene = Image.new('RGB', (W * 24, H * 24), '#181a20')

def put(img, x, y):
    scene.paste(img, (x * 24, y * 24))

# Surface
for x in range(W):
    put(grass, x, 0)
    put(dirt, x, 1)

# Dirt/Stone transition
for x in range(W):
    if x in [3, 4, 5, 10, 11, 12]:
        put(stone_t2, x, 2)
    else:
        put(dirt, x, 2)

# Underground stone layer
for y in range(3, H):
    for x in range(W):
        put(stone_t2, x, y)

# Cave / excavation in center
shaded_stone = Image.fromarray((np.array(stone_t2).astype(np.float32) * 0.35).astype(np.uint8))
cave_coords = [
    (3, 5), (4, 5), (5, 5), (6, 5), (7, 5),
    (4, 6), (5, 6), (6, 6), (7, 6), (8, 6),
    (5, 7), (6, 7), (7, 7), (8, 7), (9, 7)
]
for cx, cy in cave_coords:
    put(shaded_stone, cx, cy)

# Ores
put(copper_t2, 2, 4)
put(copper_t2, 2, 5)
put(copper_t2, 3, 4)

put(coal_t2, 7, 3)
put(coal_t2, 8, 3)
put(coal_t2, 8, 4)

put(iron_t2, 9, 5)
put(iron_t2, 10, 5)

put(gold_t2, 4, 8)
put(gold_t2, 4, 9)
put(gold_t2, 5, 9)

put(diamond_t2, 8, 9)
put(diamond_t2, 9, 9)

scene_2x = scene.resize((W * 24 * 2, H * 24 * 2), Image.NEAREST)
scene_2x.save('scratch/t2_underground_scene.png')
print("Saved scratch/t2_underground_scene.png")
