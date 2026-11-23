from PIL import Image
import numpy as np
import craft_authentic_monolithic_stone as cams

base_stone = cams.stone_rgb # 24x24 uint8 RGB

# Ore palettes
ORE_PALETTES = {
    'copper': {'socket': [50, 24, 14], 'base': [184, 98, 48], 'bright': [218, 126, 68], 'hi': [245, 170, 110], 'glint': [255, 230, 200]},
    'iron':   {'socket': [44, 40, 36], 'base': [152, 128, 112], 'bright': [194, 172, 154], 'hi': [228, 214, 200], 'glint': [255, 250, 245]},
    'coal':   {'socket': [16, 16, 20], 'base': [38, 40, 48], 'bright': [58, 62, 74], 'hi': [88, 94, 110], 'glint': [135, 145, 168]},
    'gold':   {'socket': [60, 44, 12], 'base': [212, 160, 24], 'bright': [248, 204, 48], 'hi': [255, 236, 112], 'glint': [255, 255, 220]},
    'diamond':{'socket': [18, 48, 64], 'base': [46, 164, 210], 'bright': [96, 216, 250], 'hi': [180, 244, 255], 'glint': [240, 255, 255]},
    'crystal':{'socket': [42, 14, 48], 'base': [178, 64, 212], 'bright': [224, 112, 250], 'hi': [250, 178, 255], 'glint': [255, 240, 255]}
}

def apply_ores(base_stone, ore_type):
    tile = base_stone.copy()
    pal = ORE_PALETTES[ore_type]
    
    # Matching TextureGenerator.ts: 2 discrete mineral clusters
    # Cluster 1: upper-left
    deposits = [
        (
            [(5,5,4,1), (4,6,1,2), (8,6,1,1), (4,7,1,1), (8,7,1,1), (5,8,4,1)],
            [(5,6,3,2), (6,7,2,1)],
            [(5,6,2,1), (5,7,1,1)],
            [(5,6,1,1)],
            (6,6)
        ),
        (
            [(14,13,5,1), (13,14,1,2), (18,14,1,2), (14,15,4,1)],
            [(14,14,4,1)],
            [(14,14,2,1)],
            [(15,14,1,1)],
            (14,14)
        )
    ]
    
    for sock, base, brt, hi, glint in deposits:
        for x, y, w, h in sock:
            tile[y:y+h, x:x+w] = pal['socket']
        for x, y, w, h in base:
            tile[y:y+h, x:x+w] = pal['base']
        for x, y, w, h in brt:
            tile[y:y+h, x:x+w] = pal['bright']
        for x, y, w, h in hi:
            tile[y:y+h, x:x+w] = pal['hi']
        gx, gy = glint
        tile[gy, gx] = pal['glint']
        
    return tile

copper = apply_ores(base_stone, 'copper')
iron = apply_ores(base_stone, 'iron')
coal = apply_ores(base_stone, 'coal')
gold = apply_ores(base_stone, 'gold')
diamond = apply_ores(base_stone, 'diamond')
crystal = apply_ores(base_stone, 'crystal')

# Mossy stone
mossy = base_stone.copy()
moss_rects = [(1, 1, 9, 3), (13, 2, 8, 3), (5, 6, 9, 2), (2, 14, 7, 3)]
for mx, my, mw, mh in moss_rects:
    mossy[my:my+mh, mx:mx+mw] = [28, 70, 32]
    mossy[my:my+1, mx+1:mx+mw-1] = [58, 120, 52]

# Stone wall background (matching game's 0x525463 tint)
wall = (base_stone.astype(np.float32) * np.array([0x52/255, 0x54/255, 0x63/255])).astype(np.uint8)

# 12 wide x 9 high rich underground cave
cave_map = [
    [1, 1, 2, 2, 1, 1, 1, 1, 3, 3, 1, 1],
    [1, 1, 2, 1, 0, 0, 0, 0, 1, 3, 1, 1],
    [4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
    [4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5],
    [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5],
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 1, 1],
    [1, 1, 6, 6, 1, 1, 1, 8, 8, 1, 1, 1],
    [1, 1, 1, 6, 1, 1, 1, 1, 8, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

tile_dict = {
    0: wall,
    1: base_stone,
    2: copper,
    3: iron,
    4: coal,
    5: gold,
    6: diamond,
    7: mossy,
    8: crystal
}

out = np.zeros((9 * 24, 12 * 24, 3), dtype=np.uint8)
for gy in range(9):
    for gx in range(12):
        tid = cave_map[gy][gx]
        out[gy*24:(gy+1)*24, gx*24:(gx+1)*24] = tile_dict[tid]

im = Image.fromarray(out).resize((12 * 24 * 2, 9 * 24 * 2), Image.NEAREST)
im.save('scratch/definitive_cave_showcase.png')
print("Saved scratch/definitive_cave_showcase.png")
