import base64
from PIL import Image
import numpy as np

# Load assets
dirt_im = Image.open('assets/textures/dirt_24.png').convert('RGB')
dirt_arr = np.array(dirt_im).astype(np.float32)

lum = 0.299 * dirt_arr[:,:,0] + 0.587 * dirt_arr[:,:,1] + 0.114 * dirt_arr[:,:,2]
norm_lum = (lum - lum.min()) / (lum.max() - lum.min())

# Refined Slate Stone
# Let's give it the exact authentic cool slate stone tone:
# Dark: (54, 58, 66)
# Bright: (156, 164, 178)
dark_rgb = np.array([54, 58, 66], dtype=np.float32)
bright_rgb = np.array([156, 164, 178], dtype=np.float32)

stone_arr = np.zeros((24, 24, 3), dtype=np.uint8)
for y in range(24):
    for x in range(24):
        t = norm_lum[y, x]
        t_curved = t * t * (3 - 2 * t)
        rgb = dark_rgb + t_curved * (bright_rgb - dark_rgb)
        stone_arr[y, x] = np.clip(rgb, 0, 255).astype(np.uint8)

# Convert to RGBA
stone_rgba = np.zeros((24, 24, 4), dtype=np.uint8)
stone_rgba[:, :, :3] = stone_arr
stone_rgba[:, :, 3] = 255

stone_b64 = base64.b64encode(stone_rgba.tobytes()).decode('ascii')
print("STONE_24_RGBA length:", len(stone_b64))

# Let's save stone_b64 to a text file
with open('scratch/stone_24_rgba.txt', 'w') as f:
    f.write(stone_b64)

# Now let's design distinct crystal/mineral shapes for each ore!

def draw_ore_features(base_stone, spec):
    arr = base_stone.copy().astype(np.float32)
    for x, y in spec.get('socket', []):
        arr[y % 24, x % 24] = spec['socket_col']
    for x, y in spec.get('body', []):
        arr[y % 24, x % 24] = spec['body_col']
    for x, y in spec.get('bright', []):
        arr[y % 24, x % 24] = spec['bright_col']
    for x, y in spec.get('hi', []):
        arr[y % 24, x % 24] = spec['hi_col']
    for x, y in spec.get('glint', []):
        arr[y % 24, x % 24] = spec['glint_col']
    return np.clip(arr, 0, 255).astype(np.uint8)

# Varied layouts so ores don't all have identical geometries:
# Layout 1 (used by Copper and Diamond): 2 faceted crystal nuggets + 2 flecks
geom_crystals = {
    'socket': [
        (4,5), (5,5), (6,5), (7,5), (8,5), (9,5),
        (3,6), (10,6), (3,7), (11,7),
        (4,8), (11,8), (5,9), (10,9), (6,10), (7,10), (8,10), (9,10),
        # Secondary
        (13,13), (14,13), (15,13), (16,13), (17,13),
        (12,14), (18,14), (12,15), (18,15),
        (13,16), (18,16), (14,17), (15,17), (16,17), (17,17),
        # Fleck 1
        (17,4), (18,4), (19,4), (16,5), (20,5), (17,6), (18,6), (19,6),
        # Fleck 2
        (4,16), (5,16), (6,16), (3,17), (7,17), (4,18), (5,18), (6,18)
    ],
    'body': [
        (4,6), (5,6), (6,6), (7,6), (8,6), (9,6),
        (4,7), (5,7), (6,7), (7,7), (8,7), (9,7), (10,7),
        (5,8), (6,8), (7,8), (8,8), (9,8), (10,8),
        (6,9), (7,9), (8,9), (9,9),
        # Secondary
        (13,14), (14,14), (15,14), (16,14), (17,14),
        (13,15), (14,15), (15,15), (16,15), (17,15),
        (14,16), (15,16), (16,16), (17,16),
        # Flecks
        (17,5), (18,5), (19,5),
        (4,17), (5,17), (6,17)
    ],
    'bright': [
        (5,6), (6,6), (7,6),
        (5,7), (6,7), (7,7), (8,7),
        (6,8), (7,8),
        (14,14), (15,14), (16,14),
        (14,15), (15,15),
        (18,5), (5,17)
    ],
    'hi': [
        (6,6), (7,6),
        (6,7),
        (15,14), (15,15),
        (18,5)
    ],
    'glint': [
        (6,6), (15,14)
    ]
}

# Layout 2 (used by Gold and Crystal): Angular gem facets
geom_gems = {
    'socket': [
        (7,3), (8,3), (9,3), (10,3),
        (6,4), (11,4), (5,5), (12,5),
        (5,6), (12,6), (6,7), (11,7),
        (7,8), (8,8), (9,8), (10,8),
        # Lower left gem
        (2,12), (3,12), (4,12), (5,12), (6,12),
        (1,13), (7,13), (1,14), (7,14),
        (2,15), (3,15), (4,15), (5,15), (6,15),
        # Lower right gem
        (15,15), (16,15), (17,15), (18,15),
        (14,16), (19,16), (14,17), (19,17),
        (15,18), (16,18), (17,18), (18,18)
    ],
    'body': [
        (7,4), (8,4), (9,4), (10,4),
        (6,5), (7,5), (8,5), (9,5), (10,5), (11,5),
        (6,6), (7,6), (8,6), (9,6), (10,6), (11,6),
        (7,7), (8,7), (9,7), (10,7),
        # Lower left
        (2,13), (3,13), (4,13), (5,13), (6,13),
        (2,14), (3,14), (4,14), (5,14), (6,14),
        # Lower right
        (15,16), (16,16), (17,16), (18,16),
        (15,17), (16,17), (17,17), (18,17)
    ],
    'bright': [
        (7,4), (8,4), (9,4),
        (7,5), (8,5),
        (3,13), (4,13), (5,13),
        (16,16), (17,16)
    ],
    'hi': [
        (8,4), (8,5),
        (4,13), (16,16)
    ],
    'glint': [
        (8,4), (4,13), (17,16)
    ]
}

# Layout 3 (used by Iron and Coal): Rocky mineral pockets
geom_pockets = {
    'socket': [
        (9,5), (10,5), (11,5), (12,5), (13,5), (14,5),
        (8,6), (15,6), (7,7), (16,7),
        (7,8), (15,8), (8,9), (14,9),
        (9,10), (10,10), (11,10), (12,10), (13,10),
        # Bottom left pocket
        (4,13), (5,13), (6,13), (7,13), (8,13),
        (3,14), (9,14), (3,15), (9,15),
        (4,16), (5,16), (6,16), (7,16), (8,16),
        # Top right fleck
        (18,8), (19,8), (20,8), (17,9), (21,9), (18,10), (19,10), (20,10)
    ],
    'body': [
        (9,6), (10,6), (11,6), (12,6), (13,6), (14,6),
        (8,7), (9,7), (10,7), (11,7), (12,7), (13,7), (14,7), (15,7),
        (8,8), (9,8), (10,8), (11,8), (12,8), (13,8), (14,8),
        (9,9), (10,9), (11,9), (12,9), (13,9),
        # Bottom left
        (4,14), (5,14), (6,14), (7,14), (8,14),
        (4,15), (5,15), (6,15), (7,15), (8,15),
        # Fleck
        (18,9), (19,9), (20,9)
    ],
    'bright': [
        (10,6), (11,6), (12,6), (13,6),
        (9,7), (10,7), (11,7), (12,7),
        (5,14), (6,14), (7,14),
        (18,9), (19,9)
    ],
    'hi': [
        (11,6), (12,6),
        (10,7), (11,7),
        (6,14), (19,9)
    ],
    'glint': [
        (11,6), (6,14)
    ]
}

ore_configs = {
    'copper': {
        'socket_col': np.array([48, 22, 10]),
        'body_col':   np.array([195, 88, 36]),
        'bright_col': np.array([232, 126, 60]),
        'hi_col':     np.array([255, 172, 104]),
        'glint_col':  np.array([255, 230, 200]),
        **geom_crystals
    },
    'iron': {
        'socket_col': np.array([36, 32, 28]),
        'body_col':   np.array([138, 124, 112]),
        'bright_col': np.array([176, 162, 150]),
        'hi_col':     np.array([214, 206, 198]),
        'glint_col':  np.array([255, 255, 255]),
        **geom_pockets
    },
    'coal': {
        'socket_col': np.array([16, 17, 20]),
        'body_col':   np.array([34, 36, 42]),
        'bright_col': np.array([54, 58, 66]),
        'hi_col':     np.array([82, 88, 100]),
        'glint_col':  np.array([125, 134, 148]),
        **geom_pockets
    },
    'gold': {
        'socket_col': np.array([66, 46, 4]),
        'body_col':   np.array([216, 160, 16]),
        'bright_col': np.array([248, 202, 38]),
        'hi_col':     np.array([255, 236, 100]),
        'glint_col':  np.array([255, 255, 225]),
        **geom_gems
    },
    'diamond': {
        'socket_col': np.array([8, 46, 56]),
        'body_col':   np.array([26, 170, 196]),
        'bright_col': np.array([68, 224, 246]),
        'hi_col':     np.array([165, 248, 255]),
        'glint_col':  np.array([255, 255, 255]),
        **geom_crystals
    },
    'crystal': {
        'socket_col': np.array([40, 10, 52]),
        'body_col':   np.array([140, 40, 184]),
        'bright_col': np.array([186, 74, 236]),
        'hi_col':     np.array([230, 144, 255]),
        'glint_col':  np.array([255, 255, 255]),
        **geom_gems
    }
}

generated_ores = {}
for name, conf in ore_configs.items():
    tile = draw_ore_features(stone_arr, conf)
    generated_ores[name] = tile
    Image.fromarray(tile).save(f'scratch/tile_{name}.png')

# Create a full showcase image with 3x3 of each ore and 4x4 stone
showcase = Image.new('RGB', (24 * 3 * 3, 24 * 3 * 2))

# Row 1: Stone (3x3), Copper (3x3), Iron (3x3)
# Row 2: Coal (3x3), Gold (3x3), Diamond (3x3)

def paste_3x3(arr, off_x, off_y):
    t = Image.fromarray(arr)
    for ty in range(3):
        for tx in range(3):
            showcase.paste(t, (off_x + tx * 24, off_y + ty * 24))

paste_3x3(stone_arr, 0, 0)
paste_3x3(generated_ores['copper'], 24 * 3, 0)
paste_3x3(generated_ores['iron'], 24 * 6, 0)

paste_3x3(generated_ores['coal'], 0, 24 * 3)
paste_3x3(generated_ores['gold'], 24 * 3, 24 * 3)
paste_3x3(generated_ores['diamond'], 24 * 6, 24 * 3)

showcase_2x = showcase.resize((showcase.width * 2, showcase.height * 2), Image.NEAREST)
showcase_2x.save('scratch/all_ores_showcase.png')
print("Saved scratch/all_ores_showcase.png!")
