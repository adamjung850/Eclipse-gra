from PIL import Image
import numpy as np

# Load the candidates
import generate_stone_candidates as gsc

cand_list = [
    ('Candidate 1: Interlocking Slabs (12x12 native)', gsc.c1, 'cave_cand1'),
    ('Candidate 2: Chunky Rock (8x8 native)', gsc.c2, 'cave_cand2'),
    ('Candidate 3: Massive Slate Bedrock (24x24)', gsc.c3, 'cave_cand3')
]

# Let's define the ore generator matching TextureGenerator.drawOrganicOreTexture
# Palette definitions
ORE_PALETTES = {
    'copper': {'socket': [50, 24, 14], 'base': [184, 98, 48], 'bright': [218, 126, 68], 'hi': [245, 170, 110], 'glint': [255, 230, 200]},
    'iron':   {'socket': [44, 40, 36], 'base': [152, 128, 112], 'bright': [194, 172, 154], 'hi': [228, 214, 200], 'glint': [255, 250, 245]},
    'coal':   {'socket': [16, 16, 20], 'base': [38, 40, 48], 'bright': [58, 62, 74], 'hi': [88, 94, 110], 'glint': [135, 145, 168]},
    'gold':   {'socket': [60, 44, 12], 'base': [212, 160, 24], 'bright': [248, 204, 48], 'hi': [255, 236, 112], 'glint': [255, 255, 220]},
    'diamond':{'socket': [18, 48, 64], 'base': [46, 164, 210], 'bright': [96, 216, 250], 'hi': [180, 244, 255], 'glint': [240, 255, 255]}
}

def apply_ores(base_stone, ore_type):
    tile = base_stone.copy()
    pal = ORE_PALETTES[ore_type]
    
    # 2 discrete mineral clusters
    # Cluster 1: upper-left
    deposits = [
        # (socket rects, base rects, bright rects, hi pixels, glint pixel)
        (
            [(5,5,4,1), (4,6,1,2), (8,6,1,1), (4,7,1,1), (8,7,1,1), (5,8,4,1)],
            [(5,6,3,2), (6,7,2,1)],
            [(5,6,2,1), (5,7,1,1)],
            [(5,6,1,1)],
            (6,6)
        ),
        # Cluster 2: lower-right
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

# Build a small underground cave: 10 wide, 8 high
# Layout:
# Row 0: Solid stone with iron ore
# Row 1: Solid stone, cave opening in middle (background stone wall)
# Row 2: Cave opening, coal ore on left
# Row 3: Cave opening with copper ore on ceiling
# Row 4: Cave floor with mossy stone
# Row 5: Solid stone with gold ore
# Row 6: Solid stone with diamond ore
# Row 7: Solid stone

def render_cave(base_stone, fname):
    copper_tile = apply_ores(base_stone, 'copper')
    iron_tile = apply_ores(base_stone, 'iron')
    coal_tile = apply_ores(base_stone, 'coal')
    gold_tile = apply_ores(base_stone, 'gold')
    diamond_tile = apply_ores(base_stone, 'diamond')
    
    # Mossy stone
    mossy_tile = base_stone.copy()
    moss_rects = [(1, 1, 9, 3), (13, 2, 8, 3), (5, 6, 9, 2), (2, 14, 7, 3)]
    for mx, my, mw, mh in moss_rects:
        mossy_tile[my:my+mh, mx:mx+mw] = [28, 70, 32]
        mossy_tile[my:my+1, mx+1:mx+mw-1] = [58, 120, 52]
        
    # Stone wall (excavated background)
    wall_tile = (base_stone * 0.42).astype(np.uint8)
    
    # 10 x 8 grid of block IDs:
    # 1: stone, 2: iron, 3: coal, 4: copper, 5: gold, 6: diamond, 7: mossy, 0: air (wall)
    cave_map = [
        [1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
        [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
        [3, 3, 0, 0, 0, 0, 0, 0, 1, 1],
        [1, 1, 0, 0, 4, 4, 0, 0, 0, 1],
        [7, 7, 7, 7, 7, 7, 7, 7, 1, 1],
        [1, 5, 5, 1, 1, 1, 1, 1, 5, 1],
        [1, 1, 1, 6, 6, 1, 1, 6, 6, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ]
    
    tile_dict = {
        0: wall_tile,
        1: base_stone,
        2: iron_tile,
        3: coal_tile,
        4: copper_tile,
        5: gold_tile,
        6: diamond_tile,
        7: mossy_tile
    }
    
    out = np.zeros((8 * 24, 10 * 24, 3), dtype=np.uint8)
    for gy in range(8):
        for gx in range(10):
            tid = cave_map[gy][gx]
            out[gy*24:(gy+1)*24, gx*24:(gx+1)*24] = tile_dict[tid]
            
    # Resize 2x for crisp viewing
    im = Image.fromarray(out).resize((10 * 24 * 2, 8 * 24 * 2), Image.NEAREST)
    im.save(f'scratch/{fname}.png')

for label, st, fn in cand_list:
    render_cave(st, fn)

print("Rendered cave_cand1.png, cave_cand2.png, cave_cand3.png")
