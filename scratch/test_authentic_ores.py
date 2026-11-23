from PIL import Image
import numpy as np

# Load our perfect stone
stone_arr = np.array(Image.open('scratch/stone_candidate_1.png').convert('RGB'))[:24, :24]

# Let's craft organic, jagged crystal flecks for each ore:
# In 24x24:
# Mineral deposit 1: at (5, 6), jagged 7-pixel gem
# Mineral deposit 2: at (14, 12), jagged 8-pixel gem
# Mineral deposit 3: at (8, 16), jagged 5-pixel gem
# Mineral deposit 4: at (18, 5), jagged 3-pixel fleck
# Mineral deposit 5: at (3, 14), 2-pixel fleck

# Notice these shapes are jagged (stair-stepped like real raw gems in rock):
# Deposit 1:
#   . X X .
#   X X X X
#   . X X .
# Deposit 2:
#   X X . .
#   X X X X
#   . X X X
# Deposit 3:
#   . X X
#   X X X
#   X . .
# Deposit 4:
#   X X
#   . X
# Deposit 5:
#   X
#   X

raw_mineral_deposits = [
    # Deposit 1 (upper left, (5, 6))
    {
        'base': [(6,6), (7,6), (5,7), (6,7), (7,7), (8,7), (6,8), (7,8)],
        'socket': [
            (5,5), (6,5), (7,5), (8,5),
            (4,6), (8,6),
            (4,7), (9,7),
            (5,8), (8,8),
            (6,9), (7,9)
        ],
        'bright': [(6,6), (7,6), (5,7), (6,7)],
        'hi': [(6,6)],
        'glint': [(6,6)]
    },
    # Deposit 2 (center-right, (13, 12))
    {
        'base': [(14,12), (15,12), (13,13), (14,13), (15,13), (16,13), (14,14), (15,14), (16,14)],
        'socket': [
            (13,11), (14,11), (15,11), (16,11),
            (12,12), (16,12), (17,12),
            (12,13), (17,13),
            (13,14), (17,14),
            (14,15), (15,15), (16,15)
        ],
        'bright': [(14,12), (15,12), (13,13), (14,13)],
        'hi': [(14,12), (15,12)],
        'glint': [(14,12)]
    },
    # Deposit 3 (lower-left, (8, 16))
    {
        'base': [(9,16), (10,16), (8,17), (9,17), (10,17), (8,18)],
        'socket': [
            (8,15), (9,15), (10,15), (11,15),
            (7,16), (11,16),
            (7,17), (11,17),
            (7,18), (9,18), (10,18),
            (8,19)
        ],
        'bright': [(9,16), (10,16), (8,17)],
        'hi': [(9,16)],
        'glint': [(9,16)]
    },
    # Deposit 4 (upper right fleck, (18, 5))
    {
        'base': [(18,5), (19,5), (19,6)],
        'socket': [(17,4), (18,4), (19,4), (20,4), (17,5), (20,5), (18,6), (20,6), (19,7)],
        'bright': [(18,5), (19,5)],
        'hi': [(18,5)],
        'glint': [(18,5)]
    },
    # Deposit 5 (lower edge fleck, (4, 13))
    {
        'base': [(4,13), (4,14)],
        'socket': [(3,12), (4,12), (5,12), (3,13), (5,13), (3,14), (5,14), (4,15)],
        'bright': [(4,13)],
        'hi': [(4,13)],
        'glint': [(4,13)]
    }
]

def render_ore_tile(base_stone, palette):
    arr = base_stone.copy().astype(np.float32)
    # 1. Dark socket rim (embeds into rock crevice)
    for dep in raw_mineral_deposits:
        for x, y in dep['socket']:
            arr[y % 24, x % 24] = palette['socket']
    # 2. Base mineral color
    for dep in raw_mineral_deposits:
        for x, y in dep['base']:
            arr[y % 24, x % 24] = palette['base']
    # 3. Bright facet
    for dep in raw_mineral_deposits:
        for x, y in dep['bright']:
            arr[y % 24, x % 24] = palette['bright']
    # 4. Highlight
    for dep in raw_mineral_deposits:
        for x, y in dep['hi']:
            arr[y % 24, x % 24] = palette['hi']
    # 5. Pure glint sparkle
    for dep in raw_mineral_deposits:
        for x, y in dep['glint']:
            arr[y % 24, x % 24] = palette['glint']
    return np.clip(arr, 0, 255).astype(np.uint8)

# Color palettes:
palettes = {
    'copper': {
        'socket': np.array([48, 20, 8]),
        'base':   np.array([198, 86, 34]),
        'bright': np.array([234, 128, 62]),
        'hi':     np.array([255, 175, 108]),
        'glint':  np.array([255, 230, 200])
    },
    'iron': {
        'socket': np.array([36, 32, 28]),
        'base':   np.array([138, 124, 112]),
        'bright': np.array([176, 162, 150]),
        'hi':     np.array([214, 206, 198]),
        'glint':  np.array([255, 255, 255])
    },
    'coal': {
        'socket': np.array([16, 17, 20]),
        'base':   np.array([34, 36, 42]),
        'bright': np.array([54, 58, 66]),
        'hi':     np.array([84, 90, 102]),
        'glint':  np.array([125, 134, 148])
    },
    'gold': {
        'socket': np.array([66, 46, 4]),
        'base':   np.array([216, 160, 16]),
        'bright': np.array([248, 202, 38]),
        'hi':     np.array([255, 236, 100]),
        'glint':  np.array([255, 255, 225])
    },
    'diamond': {
        'socket': np.array([8, 46, 56]),
        'base':   np.array([26, 170, 196]),
        'bright': np.array([68, 224, 246]),
        'hi':     np.array([165, 248, 255]),
        'glint':  np.array([255, 255, 255])
    },
    'crystal': {
        'socket': np.array([40, 10, 52]),
        'base':   np.array([140, 40, 184]),
        'bright': np.array([186, 74, 236]),
        'hi':     np.array([230, 144, 255]),
        'glint':  np.array([255, 255, 255])
    }
}

rendered_tiles = {k: render_ore_tile(stone_arr, p) for k, p in palettes.items()}

# Create a 4x4 preview for stone, and 3x3 previews for each ore
showcase = Image.new('RGB', (24 * 3 * 3, 24 * 3 * 2))

def paste_3x3(arr, off_x, off_y):
    t = Image.fromarray(arr)
    for ty in range(3):
        for tx in range(3):
            showcase.paste(t, (off_x + tx * 24, off_y + ty * 24))

paste_3x3(stone_arr, 0, 0)
paste_3x3(rendered_tiles['copper'], 24 * 3, 0)
paste_3x3(rendered_tiles['iron'], 24 * 6, 0)

paste_3x3(rendered_tiles['coal'], 0, 24 * 3)
paste_3x3(rendered_tiles['gold'], 24 * 3, 24 * 3)
paste_3x3(rendered_tiles['diamond'], 24 * 6, 24 * 3)

showcase_2x = showcase.resize((showcase.width * 2, showcase.height * 2), Image.NEAREST)
showcase_2x.save('scratch/authentic_ores_showcase.png')
print("Saved scratch/authentic_ores_showcase.png!")
