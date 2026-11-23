from PIL import Image
import numpy as np

T = 24

# Palette: authentic slate stone
# Low contrast, rich cool rock tones
PAL = np.array([
    [69,  74,  86],   # 0: deep cleft / fissure
    [94,  101, 117],  # 1: shaded rock boundary
    [122, 131, 150],  # 2: base solid stone body (dominant)
    [144, 153, 172],  # 3: lit rock face
    [170, 178, 196]   # 4: top edge highlight
], dtype=np.uint8)

# Let's design 3 candidate native matrices.
# Candidate 1: 12x12 native grid (scaled 2x to 24x24)
# Why 12x12? At 12x12, each pixel is 2x2 screen pixels in 24x24.
# This gives the perfect chunkiness of pixel-art rock without being too coarse (like 4x4)
# or noisy (like 24x24 1px noise).

# In 12x12:
# We need seamless edges:
# x=0 seamlessly matches x=11; y=0 seamlessly matches y=11.
# And NO continuous diagonal cracks!

# Let's craft Candidate 1 (Interlocking Rock Plates):
# Plate 1: Upper-left horizontal block (y: 1..5, x: 1..6)
# Plate 2: Upper-right vertical block (y: 0..4, x: 8..11)
# Plate 3: Lower-left rounded block (y: 6..10, x: 0..4)
# Plate 4: Center-right horizontal block (y: 5..8, x: 5..10)
# Plate 5: Bottom shelf (y: 9..11, x: 4..11)
# Let's write a builder for this:

def build_candidate_plates():
    # Start with base solid rock 2
    grid = np.full((12, 12), 2, dtype=np.uint8)
    
    # Let's define the fissure network in 12x12 (index 0 and 1):
    # Fissures must NOT form a diagonal line across the tile!
    # They should form interlocking T-junctions or staggered steps:
    # 1. Horizontal seam from x=0 to x=6 at y=5
    # 2. Vertical jog from y=5 down to y=8 at x=5
    # 3. Horizontal seam from x=5 to x=11 at y=8
    # 4. Vertical branch going up from (y=5, x=6) to (y=0, x=7)
    # 5. Vertical branch going down from (y=8, x=4) to (y=11, x=4)
    # Notice: x=0 connects to x=11?
    # At x=0, horizontal seam is at y=5.
    # If at x=11, seam is at y=8, they don't connect in a straight stripe!
    # Let's ensure seamless wrapping:
    # If seam leaves at (y=5, x=0), it must enter at (y=5, x=11)!
    # So let's connect x=11 to y=5 via a step at x=10!
    
    seam = [
        # Horizontal shelf 1 (mid-left)
        (0, 5), (1, 5), (2, 5), (3, 5), (4, 5),
        # Vertical jog down
        (4, 6), (4, 7), (4, 8),
        # Horizontal shelf 2 (mid-right)
        (5, 8), (6, 8), (7, 8), (8, 8), (9, 8),
        # Step up to meet (11, 5) for seamless horizontal wrap:
        (9, 7), (10, 6), (11, 5),
        
        # Vertical branch separating upper plates
        (6, 4), (6, 3), (6, 2), (7, 1), (7, 0),
        # Meeting bottom at y=11 (wrap to y=0 at x=7):
        (7, 11), (7, 10), (7, 9)
    ]
    
    # Draw deep fissure (0) and crevice shadow (1):
    for x, y in seam:
        grid[y, x] = 0
        # Shadow underneath
        if y < 11 and grid[(y+1)%12, x] == 2:
            grid[(y+1)%12, x] = 1
        # Highlight on top of horizontal shelves
        if y > 0 and grid[(y-1)%12, x] == 2:
            grid[(y-1)%12, x] = 4
            
    # Now illuminate the rock plates (lit faces = 3, top highlights = 4):
    # Plate Upper-Left:
    grid[1:4, 1:5] = 3
    grid[1, 1:4] = 4
    
    # Plate Upper-Right:
    grid[1:4, 8:11] = 3
    grid[0, 8:11] = 4
    grid[1, 8] = 4
    
    # Plate Lower-Left:
    grid[7:10, 0:3] = 3
    grid[6, 0:3] = 4
    
    # Plate Center-Right:
    grid[6:8, 6:9] = 3
    grid[9:11, 6:7] = 3
    grid[10:12, 8:11] = 3
    grid[9, 8:11] = 4

    # Scale 12x12 -> 24x24 (each pixel is 2x2)
    rgb_12 = PAL[grid]
    rgb_24 = np.repeat(np.repeat(rgb_12, 2, axis=0), 2, axis=1)
    return rgb_24

# Candidate 2: Organic 8x8 Native Matrix (scaled 3x to 24x24)
# Inspired by Terraria's inner monolithic rock, but carefully modified
# so seams form horizontal/vertical interlocking blocks, with ZERO diagonal lines!
def build_candidate_8x8():
    # 8x8 matrix indices (0..4)
    # Seamless in x and y
    mat = np.array([
        [2, 3, 4, 4, 3, 2, 1, 0],
        [3, 4, 4, 3, 2, 2, 2, 1],
        [2, 3, 2, 1, 0, 1, 2, 2],
        [1, 1, 0, 1, 3, 4, 3, 2],
        [0, 2, 3, 4, 4, 3, 2, 1],
        [1, 3, 4, 3, 2, 1, 0, 0],
        [2, 2, 2, 1, 0, 1, 3, 4],
        [1, 0, 1, 2, 2, 3, 4, 3]
    ], dtype=np.uint8)
    
    # Let's check tiling of this matrix:
    rgb_8 = PAL[mat]
    rgb_24 = np.repeat(np.repeat(rgb_8, 3, axis=0), 3, axis=1)
    return rgb_24

# Candidate 3: Monolithic Slate Bedrock with Natural Micro-Relief
# Instead of large cracks, it is a dense, massive slab of rock with broad smooth
# cleavage planes and subtle chiselled rock facets (like Starbound's solid rock / smooth stone).
def build_candidate_monolith():
    # 24x24 directly crafted with 3-4 subtle rock cleavage faces
    grid = np.full((24, 24), 2, dtype=np.uint8)
    
    # Facet 1: Upper rock shelf (y: 2..10, x: 2..14)
    grid[2:10, 2:14] = 3
    grid[2:4, 3:13] = 4
    # subtle shadow under shelf 1
    grid[10, 3:14] = 1
    grid[11, 4:13] = 0
    
    # Facet 2: Upper right slab (y: 1..7, x: 16..23)
    grid[1:7, 16:23] = 3
    grid[1:3, 17:22] = 4
    grid[7, 17:23] = 1
    
    # Facet 3: Lower left slab (y: 13..21, x: 1..10)
    grid[13:21, 1:10] = 3
    grid[13:15, 2:9] = 4
    grid[21, 2:10] = 1
    grid[22, 3:9] = 0
    
    # Facet 4: Lower right slab (y: 10..19, x: 13..22)
    grid[10:19, 13:22] = 3
    grid[10:12, 14:21] = 4
    grid[19, 14:22] = 1
    
    # Seamless edge joints (wrap boundaries smoothly)
    # top-bottom wrap:
    grid[0, :] = grid[23, :] = 2
    # left-right wrap:
    grid[:, 0] = grid[:, 23] = 2
    
    return PAL[grid]

c1 = build_candidate_plates()
c2 = build_candidate_8x8()
c3 = build_candidate_monolith()

def make_showcase(tile_rgb, name):
    # Tile 6x6 blocks (144x144 pixels)
    tiled = np.zeros((24 * 6, 24 * 6, 3), dtype=np.uint8)
    for ty in range(6):
        for tx in range(6):
            tiled[ty*24:(ty+1)*24, tx*24:(tx+1)*24] = tile_rgb
    
    # 2x display zoom
    im = Image.fromarray(tiled).resize((144 * 2, 144 * 2), Image.NEAREST)
    im.save(f'scratch/{name}.png')

make_showcase(c1, 'cand_1_plates_6x6')
make_showcase(c2, 'cand_2_8x8_6x6')
make_showcase(c3, 'cand_3_monolith_6x6')

print("Generated candidate showcases 1, 2, 3")
