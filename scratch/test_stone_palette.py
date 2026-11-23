from PIL import Image
import numpy as np

# Load dirt as reference structure
dirt_im = Image.open('assets/textures/dirt_24.png').convert('RGB')
dirt_arr = np.array(dirt_im).astype(np.float32)

# Calculate normalized luminance of dirt (0 to 1)
lum = 0.299 * dirt_arr[:,:,0] + 0.587 * dirt_arr[:,:,1] + 0.114 * dirt_arr[:,:,2]
# Normalize lum
norm_lum = (lum - lum.min()) / (lum.max() - lum.min())

# Candidate 1: Direct translation to high-end Terraria slate stone
# Stone palette has cool slate tint: R ~ 0.95 * G, B ~ 1.05 * G
# Darkest: #3f434c (63, 67, 76)
# Brightest: #a2aab8 (162, 170, 184)
c1_stone = np.zeros((24, 24, 3), dtype=np.uint8)
dark_rgb = np.array([58, 62, 70], dtype=np.float32)
bright_rgb = np.array([160, 168, 182], dtype=np.float32)

for y in range(24):
    for x in range(24):
        t = norm_lum[y, x]
        # Slight S-curve for punchy pixel art contrast
        t_curved = t * t * (3 - 2 * t)
        rgb = dark_rgb + t_curved * (bright_rgb - dark_rgb)
        c1_stone[y, x] = np.clip(rgb, 0, 255).astype(np.uint8)

# Candidate 2: Slate with small natural cracks / rock crevices added
c2_stone = c1_stone.copy().astype(np.float32)
# Add some fine organic cracks (1-pixel width, seamless)
cracks = [
    # A few subtle winding crevices
    (4, 5), (5, 5), (6, 6), (7, 6),
    (14, 12), (15, 12), (15, 13), (16, 14), (17, 14),
    (20, 3), (21, 3), (22, 4), (23, 4), (0, 4),
    (9, 18), (10, 18), (11, 19), (12, 19)
]
for x, y in cracks:
    c2_stone[y, x] = np.array([42, 45, 52]) # dark crack
    # highlight on top
    ny = (y - 1) % 24
    c2_stone[ny, x] = np.clip(c2_stone[ny, x] + 25, 0, 255)

c2_stone = np.clip(c2_stone, 0, 255).astype(np.uint8)

# Save 4x4 previews
def save_preview(arr, name):
    tile = Image.fromarray(arr)
    tiled = Image.new('RGB', (24 * 4, 24 * 4))
    for ty in range(4):
        for tx in range(4):
            tiled.paste(tile, (tx * 24, ty * 24))
    # 2x upscale
    tiled_2x = tiled.resize((24 * 4 * 2, 24 * 4 * 2), Image.NEAREST)
    tiled_2x.save(f'scratch/{name}.png')

save_preview(c1_stone, 'stone_candidate_1')
save_preview(c2_stone, 'stone_candidate_2')

# Now let's test embedding realistic ore nodules into candidate 1
# Let's see how ores look when embedded naturally!
def embed_ore(base_arr, palette, clusters):
    ore_arr = base_arr.copy().astype(np.float32)
    for cl in clusters:
        # border/socket
        for x, y in cl.get('border', []):
            ore_arr[y % 24, x % 24] = palette['socket']
        # base
        for x, y in cl.get('base', []):
            ore_arr[y % 24, x % 24] = palette['base']
        # bright
        for x, y in cl.get('bright', []):
            ore_arr[y % 24, x % 24] = palette['bright']
        # highlight
        for x, y in cl.get('hi', []):
            ore_arr[y % 24, x % 24] = palette['hi']
        # glint
        for x, y in cl.get('glint', []):
            ore_arr[y % 24, x % 24] = palette['glint']
    return np.clip(ore_arr, 0, 255).astype(np.uint8)

# Ore clusters (2-3 natural irregularly shaped mineral deposits):
# Deposit 1: at (6, 7), size ~4x3
# Deposit 2: at (15, 15), size ~3x3
# Deposit 3: at (18, 5), size ~2x2
ore_clusters = [
    {
        'border': [(5,6), (6,6), (7,6), (8,6), (5,7), (9,7), (5,8), (9,8), (6,9), (7,9), (8,9)],
        'base':   [(6,7), (7,7), (8,7), (6,8), (7,8), (8,8)],
        'bright': [(6,7), (7,7), (6,8)],
        'hi':     [(6,7)],
        'glint':  [(6,7)]
    },
    {
        'border': [(14,14), (15,14), (16,14), (17,14), (14,15), (18,15), (14,16), (17,16), (15,17), (16,17)],
        'base':   [(15,15), (16,15), (17,15), (15,16), (16,16)],
        'bright': [(15,15), (16,15)],
        'hi':     [(15,15)],
        'glint':  [(15,15)]
    },
    {
        'border': [(17,4), (18,4), (19,4), (17,5), (20,5), (18,6), (19,6)],
        'base':   [(18,5), (19,5)],
        'bright': [(18,5)],
        'hi':     [(18,5)],
        'glint':  [(18,5)]
    }
]

copper_pal = {
    'socket': np.array([55, 25, 12]),
    'base':   np.array([195, 90, 42]),
    'bright': np.array([228, 125, 62]),
    'hi':     np.array([252, 168, 102]),
    'glint':  np.array([255, 220, 185])
}

gold_pal = {
    'socket': np.array([72, 52, 5]),
    'base':   np.array([215, 160, 20]),
    'bright': np.array([245, 198, 42]),
    'hi':     np.array([255, 230, 95]),
    'glint':  np.array([255, 255, 210])
}

copper_arr = embed_ore(c1_stone, copper_pal, ore_clusters)
gold_arr = embed_ore(c1_stone, gold_pal, ore_clusters)

save_preview(copper_arr, 'copper_candidate_1')
save_preview(gold_arr, 'gold_candidate_1')

print("All candidates generated!")
