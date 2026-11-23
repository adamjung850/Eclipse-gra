from PIL import Image
import numpy as np

# Load stone_arr from earlier
stone_im = Image.open('scratch/tile_copper.png').convert('RGB')
stone_arr = np.array(Image.open('scratch/stone_candidate_1.png').convert('RGB'))[:24, :24]

# Let's test a more organic mineral vein distribution
# Let's see: in a 24x24 tile:
# Clump 1: (4, 4) - size 5x4, faceted
# Clump 2: (14, 8) - size 4x3, faceted
# Clump 3: (8, 15) - size 6x4, faceted
# Clump 4: (18, 18) - size 3x3, faceted
# Fleck 1: (18, 3) - size 2x2
# Fleck 2: (2, 13) - size 2x1
# Fleck 3: (13, 21) - size 2x2

# Notice how Clump 1 (top-left), Clump 2 (mid-right), Clump 3 (mid-bottom), Clump 4 (bottom-right)
# naturally balance the tile!
# When tiled in 3x3 or 4x4, the clumps from neighboring tiles weave together into an organic mineral field!

vein_geom_balanced = {
    'socket': [
        # Clump 1 (top-left)
        (3,3), (4,3), (5,3), (6,3), (7,3),
        (2,4), (8,4), (2,5), (8,5),
        (3,6), (4,6), (5,6), (6,6), (7,6),
        # Clump 2 (mid-right)
        (13,7), (14,7), (15,7), (16,7), (17,7),
        (12,8), (18,8), (12,9), (18,9),
        (13,10), (14,10), (15,10), (16,10), (17,10),
        # Clump 3 (mid-bottom)
        (7,14), (8,14), (9,14), (10,14), (11,14), (12,14),
        (6,15), (13,15), (6,16), (13,16),
        (7,17), (8,17), (9,17), (10,17), (11,17), (12,17),
        # Clump 4 (bottom-right)
        (17,17), (18,17), (19,17), (20,17),
        (16,18), (21,18), (16,19), (21,19),
        (17,20), (18,20), (19,20), (20,20),
        # Micro flecks
        (17,2), (18,2), (19,2), (16,3), (20,3), (17,4), (18,4), (19,4),
        (1,12), (2,12), (3,12), (0,13), (4,13), (1,14), (2,14), (3,14)
    ],
    'body': [
        # Clump 1
        (3,4), (4,4), (5,4), (6,4), (7,4),
        (3,5), (4,5), (5,5), (6,5), (7,5),
        # Clump 2
        (13,8), (14,8), (15,8), (16,8), (17,8),
        (13,9), (14,9), (15,9), (16,9), (17,9),
        # Clump 3
        (7,15), (8,15), (9,15), (10,15), (11,15), (12,15),
        (7,16), (8,16), (9,16), (10,16), (11,16), (12,16),
        # Clump 4
        (17,18), (18,18), (19,18), (20,18),
        (17,19), (18,19), (19,19), (20,19),
        # Flecks
        (17,3), (18,3), (19,3),
        (1,13), (2,13), (3,13)
    ],
    'bright': [
        (4,4), (5,4), (6,4),
        (4,5), (5,5),
        (14,8), (15,8), (16,8),
        (14,9), (15,9),
        (8,15), (9,15), (10,15), (11,15),
        (8,16), (9,16), (10,16),
        (18,18), (19,18),
        (18,3), (2,13)
    ],
    'hi': [
        (5,4), (6,4),
        (15,8), (16,8),
        (9,15), (10,15),
        (19,18)
    ],
    'glint': [
        (5,4), (15,8), (9,15), (19,18)
    ]
}

def draw_ore_features(base_stone, spec, geom):
    arr = base_stone.copy().astype(np.float32)
    for x, y in geom.get('socket', []):
        arr[y % 24, x % 24] = spec['socket_col']
    for x, y in geom.get('body', []):
        arr[y % 24, x % 24] = spec['body_col']
    for x, y in geom.get('bright', []):
        arr[y % 24, x % 24] = spec['bright_col']
    for x, y in geom.get('hi', []):
        arr[y % 24, x % 24] = spec['hi_col']
    for x, y in geom.get('glint', []):
        arr[y % 24, x % 24] = spec['glint_col']
    return np.clip(arr, 0, 255).astype(np.uint8)

gold_spec = {
    'socket_col': np.array([66, 46, 4]),
    'body_col':   np.array([216, 160, 16]),
    'bright_col': np.array([248, 202, 38]),
    'hi_col':     np.array([255, 236, 100]),
    'glint_col':  np.array([255, 255, 225]),
}

copper_spec = {
    'socket_col': np.array([48, 22, 10]),
    'body_col':   np.array([195, 88, 36]),
    'bright_col': np.array([232, 126, 60]),
    'hi_col':     np.array([255, 172, 104]),
    'glint_col':  np.array([255, 230, 200]),
}

diamond_spec = {
    'socket_col': np.array([8, 46, 56]),
    'body_col':   np.array([26, 170, 196]),
    'bright_col': np.array([68, 224, 246]),
    'hi_col':     np.array([165, 248, 255]),
    'glint_col':  np.array([255, 255, 255]),
}

gold_tile = draw_ore_features(stone_arr, gold_spec, vein_geom_balanced)
copper_tile = draw_ore_features(stone_arr, copper_spec, vein_geom_balanced)
diamond_tile = draw_ore_features(stone_arr, diamond_spec, vein_geom_balanced)

# Build a 3x3 of each and a mixed underground patch
preview = Image.new('RGB', (24 * 3 * 3, 24 * 3))

def paste_3x3(arr, off_x, off_y):
    t = Image.fromarray(arr)
    for ty in range(3):
        for tx in range(3):
            preview.paste(t, (off_x + tx * 24, off_y + ty * 24))

paste_3x3(copper_tile, 0, 0)
paste_3x3(gold_tile, 24 * 3, 0)
paste_3x3(diamond_tile, 24 * 6, 0)

preview_2x = preview.resize((preview.width * 2, preview.height * 2), Image.NEAREST)
preview_2x.save('scratch/balanced_veins_preview.png')
print("Saved scratch/balanced_veins_preview.png")
