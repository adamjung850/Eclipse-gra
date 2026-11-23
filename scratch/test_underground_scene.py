from PIL import Image
import numpy as np

# Load assets
dirt_im = Image.open('assets/textures/dirt_24.png').convert('RGB')
grass_im = Image.open('assets/textures/grass_block_24.png').convert('RGB')

dirt_arr = np.array(dirt_im).astype(np.float32)

# Generate perfect stone
lum = 0.299 * dirt_arr[:,:,0] + 0.587 * dirt_arr[:,:,1] + 0.114 * dirt_arr[:,:,2]
norm_lum = (lum - lum.min()) / (lum.max() - lum.min())

# Slate stone mapping
# Let's test a refined stone palette:
# Dark: (52, 56, 64)
# Bright: (158, 166, 180)
dark_rgb = np.array([52, 56, 64], dtype=np.float32)
bright_rgb = np.array([158, 166, 180], dtype=np.float32)

stone_arr = np.zeros((24, 24, 3), dtype=np.uint8)
for y in range(24):
    for x in range(24):
        t = norm_lum[y, x]
        t_curved = t * t * (3 - 2 * t)
        rgb = dark_rgb + t_curved * (bright_rgb - dark_rgb)
        stone_arr[y, x] = np.clip(rgb, 0, 255).astype(np.uint8)

# Now let's design organic, jagged ore clusters for each mineral type!
# Instead of boring rectangles, each ore has natural crystalline facets and branching veins!

def create_ore_tile(base_stone, ore_specs):
    arr = base_stone.copy().astype(np.float32)
    
    # 1. Dark rock sockets (bedding shadow)
    for x, y in ore_specs.get('socket', []):
        arr[y % 24, x % 24] = ore_specs['socket_col']
        
    # 2. Main mineral body
    for x, y in ore_specs.get('body', []):
        arr[y % 24, x % 24] = ore_specs['body_col']
        
    # 3. Bright mineral facets
    for x, y in ore_specs.get('bright', []):
        arr[y % 24, x % 24] = ore_specs['bright_col']
        
    # 4. Sharp specular highlight
    for x, y in ore_specs.get('highlight', []):
        arr[y % 24, x % 24] = ore_specs['highlight_col']
        
    # 5. Brilliant glints/sparkles
    for x, y in ore_specs.get('glint', []):
        arr[y % 24, x % 24] = ore_specs['glint_col']
        
    return np.clip(arr, 0, 255).astype(np.uint8)

# Organic vein geometry (jagged natural crystal/mineral shapes)
# Main vein: clustered around (6..12, 5..10)
# Secondary vein: around (13..18, 14..19)
# Minor fleck: around (17..20, 6..8)

# Let's define the geometry for a rich organic vein:
vein_socket = [
    (5,5), (6,5), (7,5), (8,5), (9,5),
    (4,6), (10,6), (11,6),
    (4,7), (12,7),
    (5,8), (12,8),
    (6,9), (7,9), (11,9),
    (7,10), (8,10), (9,10), (10,10),
    # secondary
    (13,14), (14,14), (15,14), (16,14), (17,14),
    (12,15), (18,15),
    (12,16), (18,16),
    (13,17), (14,17), (17,17),
    (14,18), (15,18), (16,18),
    # satellite fleck
    (17,5), (18,5), (19,5),
    (16,6), (20,6),
    (17,7), (18,7), (19,7)
]

vein_body = [
    # Main vein
    (5,6), (6,6), (7,6), (8,6), (9,6),
    (5,7), (6,7), (7,7), (8,7), (9,7), (10,7), (11,7),
    (6,8), (7,8), (8,8), (9,8), (10,8), (11,8),
    (7,9), (8,9), (9,9), (10,9),
    # Secondary
    (13,15), (14,15), (15,15), (16,15), (17,15),
    (13,16), (14,16), (15,16), (16,16), (17,16),
    (15,17), (16,17),
    # Fleck
    (17,6), (18,6), (19,6)
]

vein_bright = [
    (6,6), (7,6), (8,6),
    (5,7), (6,7), (7,7), (8,7), (10,7),
    (6,8), (7,8),
    (13,15), (14,15), (15,15),
    (13,16), (14,16),
    (17,6), (18,6)
]

vein_hi = [
    (6,6), (7,6),
    (6,7),
    (14,15), (15,15),
    (18,6)
]

vein_glint = [
    (7,6),
    (14,15)
]

# Build specs for all 6 ores:
ores = {
    'copper': {
        'socket_col': np.array([45, 20, 10]),
        'body_col':   np.array([198, 88, 38]),
        'bright_col': np.array([232, 126, 62]),
        'highlight_col': np.array([255, 172, 106]),
        'glint_col':  np.array([255, 230, 205]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    },
    'iron': {
        'socket_col': np.array([38, 34, 30]),
        'body_col':   np.array([142, 126, 114]),
        'bright_col': np.array([178, 164, 152]),
        'highlight_col': np.array([216, 208, 200]),
        'glint_col':  np.array([255, 255, 255]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    },
    'coal': {
        'socket_col': np.array([18, 19, 22]),
        'body_col':   np.array([36, 38, 44]),
        'bright_col': np.array([56, 60, 68]),
        'highlight_col': np.array([84, 90, 102]),
        'glint_col':  np.array([120, 128, 142]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    },
    'gold': {
        'socket_col': np.array([68, 48, 5]),
        'body_col':   np.array([218, 162, 18]),
        'bright_col': np.array([248, 202, 40]),
        'highlight_col': np.array([255, 236, 102]),
        'glint_col':  np.array([255, 255, 225]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    },
    'diamond': {
        'socket_col': np.array([10, 48, 58]),
        'body_col':   np.array([28, 172, 198]),
        'bright_col': np.array([72, 226, 246]),
        'highlight_col': np.array([168, 248, 255]),
        'glint_col':  np.array([255, 255, 255]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    },
    'crystal': {
        'socket_col': np.array([42, 12, 54]),
        'body_col':   np.array([142, 42, 186]),
        'bright_col': np.array([188, 76, 238]),
        'highlight_col': np.array([232, 146, 255]),
        'glint_col':  np.array([255, 255, 255]),
        'socket': vein_socket, 'body': vein_body, 'bright': vein_bright, 'highlight': vein_hi, 'glint': vein_glint
    }
}

ore_tiles = {name: create_ore_tile(stone_arr, spec) for name, spec in ores.items()}

# Now build a 10x8 cross-section underground scene preview!
# Row 0: Grass
# Row 1: Dirt
# Row 2: Dirt + Stone transition
# Row 3..7: Stone with scattered Ore veins!

W_TILES = 12
H_TILES = 8
scene = Image.new('RGB', (W_TILES * 24, H_TILES * 24))

def put(img_tile, tx, ty):
    if isinstance(img_tile, np.ndarray):
        img_tile = Image.fromarray(img_tile)
    scene.paste(img_tile, (tx * 24, ty * 24))

for x in range(W_TILES):
    put(grass_im, x, 0)
    put(dirt_im, x, 1)

# Row 2: dirt and stone
for x in range(W_TILES):
    if x in [3, 4, 8, 9]:
        put(stone_arr, x, 2)
    else:
        put(dirt_im, x, 2)

# Row 3..7: Stone + Ores
for y in range(3, H_TILES):
    for x in range(W_TILES):
        put(stone_arr, x, y)

# Place realistic ore deposits
# Copper cluster at (2, 3), (2, 4), (3, 4)
put(ore_tiles['copper'], 2, 3)
put(ore_tiles['copper'], 2, 4)
put(ore_tiles['copper'], 3, 4)

# Coal cluster at (6, 3), (7, 3), (7, 4)
put(ore_tiles['coal'], 6, 3)
put(ore_tiles['coal'], 7, 3)
put(ore_tiles['coal'], 7, 4)

# Iron cluster at (10, 4), (10, 5), (9, 5)
put(ore_tiles['iron'], 10, 4)
put(ore_tiles['iron'], 10, 5)
put(ore_tiles['iron'], 9, 5)

# Gold cluster at (4, 6), (5, 6), (5, 7)
put(ore_tiles['gold'], 4, 6)
put(ore_tiles['gold'], 5, 6)
put(ore_tiles['gold'], 5, 7)

# Diamond cluster at (8, 6), (8, 7)
put(ore_tiles['diamond'], 8, 6)
put(ore_tiles['diamond'], 8, 7)

# Crystal at (1, 6), (1, 7)
put(ore_tiles['crystal'], 1, 6)
put(ore_tiles['crystal'], 1, 7)

# Upscale 2x for sharp view
scene_2x = scene.resize((W_TILES * 24 * 2, H_TILES * 24 * 2), Image.NEAREST)
scene_2x.save('scratch/underground_scene_preview.png')
print("Saved scratch/underground_scene_preview.png!")
